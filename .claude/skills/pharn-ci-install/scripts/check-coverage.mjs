#!/usr/bin/env node
// Check a repository's coverage output the way pharn-ci (0.1.x to 0.12.x) will read it, before pharn-ci runs in CI:
// which report auto-discovery would pick, the format of each file, whether its paths match tracked files,
// and the coverage root they look relative to. Node core only; reads files and runs read-only git commands,
// writes nothing.
//
//   node check-coverage.mjs [--coverage <path|glob>]... [--coverage-root <dir>] [--format lcov|cobertura|auto]
//
// Run it from inside the repository. Coverage entries are relative to the repository root, as coverage.file
// in .pharn/ci.yml and the Action's coverage-file input are. Without --coverage, the file auto-discovery
// would choose is checked. Prints one JSON object on stdout; exit 0. Usage errors: message on stderr, exit 2.
// When git cannot run (missing, or blocked by a sandbox), the directory holding .git is taken as the
// repository root and files on disk stand in for tracked files; the output says so ("git": false).
// This mirrors pharn-ci's rules; it is not pharn-ci, and the CI run decides.

import { execFileSync } from "node:child_process";
import { closeSync, constants as fsConstants, existsSync, fstatSync, openSync, readdirSync, readSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const USAGE =
  "usage: check-coverage.mjs [--coverage <path|glob>]... [--coverage-root <dir>] [--format lcov|cobertura|auto]";

export class UsageError extends Error {}

// <shared:coverage>
// This block is byte-identical in pharn-ci-cover/scripts/check-lines.mjs and
// pharn-ci-install/scripts/check-coverage.mjs (tests/shared-block.test.mjs checks it). It needs `closeSync`,
// `fsConstants` (node:fs `constants`), `existsSync`, `fstatSync`, `openSync` and `readSync` from node:fs, `path`
// from node:path and a `UsageError` class from the file around it. It ends with the shared:read-file routine and the
// 256 MiB cap the two helpers read a coverage file with (pharn-ci itself streams a coverage file and has no cap).
//
// Ported from pharn-ci 0.1.0 (a88e62a8febf5cd9a77b8e0252cd060c3b94782c, Apache-2.0): packages/core/src/paths.ts,
// coverage/xml.ts, coverage/detect.ts, coverage/lcov.ts, coverage/cobertura.ts and coverage/merge.ts, so a
// coverage file is detected, read and mapped to repository paths the way pharn-ci does it. These files are
// unchanged in pharn-ci 0.12.0 (a370515e32f8040771ccf4b6f737d3d25f62749f), apart from opt-in scanXml options
// in coverage/xml.ts that the coverage readers do not use, and the opt-in literalBackslashes option of
// coverage/lcov.ts and coverage/cobertura.ts (0.12.0, CORE-101), which this block does not port: it reads every
// backslash in a coverage path as a separator, as pharn-ci before 0.12.0 did, so a tracked file whose name holds
// a backslash is not matched here.

// --- paths (paths.ts) ---

function toPosixPath(p) {
  const slashed = p.replace(/\\/g, "/");
  const drive = /^[A-Za-z]:\//.exec(slashed)?.[0] ?? "";
  const absolute = drive !== "" || slashed.startsWith("/");
  const rest = drive !== "" ? slashed.slice(drive.length) : slashed;
  const out = [];
  for (const segment of rest.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === ".." && out.length > 0 && out[out.length - 1] !== "..") out.pop();
    else if (segment === ".." && absolute) continue; // `..` above the filesystem root stays at the root.
    else out.push(segment);
  }
  const prefix = drive !== "" ? drive.toUpperCase() : absolute ? "/" : "";
  return prefix + out.join("/");
}

function isDriveRoot(root) {
  const first = root.charAt(0);
  return first >= "A" && first <= "Z" && root.charAt(1) === ":" && root.charAt(2) === "/";
}

/** `repoRoot` in the form normalizePath compares against, or "" when there is none. */
export function normalizeRoot(repoRoot) {
  if (!repoRoot) return "";
  const root = toPosixPath(repoRoot.trim());
  let end = root.length;
  while (end > 0 && root[end - 1] === "/") end--;
  return root.slice(0, end);
}

function foldForRoot(p, root) {
  return isDriveRoot(root) ? p.toLowerCase() : p;
}

/** True when `p` lies under `root` (a normalizeRoot result) on whole segments. */
export function startsWithPath(p, root) {
  if (p.length <= root.length || p[root.length] !== "/") return false;
  const head = p.slice(0, root.length);
  return isDriveRoot(root) ? head.toLowerCase() === root.toLowerCase() : head === root;
}

/** A coverage path as a repo-relative POSIX path; one outside `repoRoot` stays absolute and matches nothing. */
export function normalizePath(p, repoRoot) {
  let out = toPosixPath(p.trim());
  const root = normalizeRoot(repoRoot);
  if (root !== "" && startsWithPath(out, root)) out = out.slice(root.length + 1);
  return out;
}

/** `/a`, `\a`, `C:/a` and `C:\a` are absolute; `C:a` and relative paths are not. */
export function isAbsolutePath(p) {
  const first = p.charAt(0);
  if (first === "/" || first === "\\") return true;
  const separator = p.charAt(2);
  const letter = (first >= "A" && first <= "Z") || (first >= "a" && first <= "z");
  return p.charAt(1) === ":" && (separator === "/" || separator === "\\") && letter;
}

/** Join a coverage root in front of a path that is relative as written; no root or "." leaves it as is. */
export function joinCoverageRoot(p, coverageRoot) {
  if (coverageRoot === undefined || coverageRoot === ".") return p;
  return normalizePath(`${coverageRoot}/${p}`);
}

/** pharn-ci's coverage-root rule (config.ts parseCoverageRoot): repo-relative, "/" separators, no "..". */
export function parseCoverageRoot(value) {
  const reject = (reason) => {
    throw new UsageError(`--coverage-root "${value}" ${reason}`);
  };
  const trimmed = value.trim();
  if (trimmed === "") reject("must not be empty");
  if (trimmed.includes("\\")) reject('must not contain "\\" (use "/" as the separator)');
  if (isAbsolutePath(trimmed)) reject("must be relative to the repository root, not absolute");
  const segments = trimmed.split("/").filter((s) => s !== "" && s !== ".");
  const root = segments.join("/");
  if (root.startsWith("-")) reject('must not start with "-"');
  if (segments.includes("..")) reject('must not contain a ".." segment');
  return root === "" ? "." : root;
}

/** A repo-relative path git can take as a pathspec: not empty, not absolute, no '..' segment, no NUL. */
export function isSafeRepoPath(p) {
  if (typeof p !== "string" || p === "" || p.includes("\0")) return false;
  if (p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith("\\")) return false;
  return !p.split(/[\\/]/).includes("..");
}

const MAX_PRINTED_NAME = 200;

/**
 * A path or directory name from the input, when it is safe to print as data: no control character or line separator
 * (U+0000-U+001F, U+007F, U+0085, U+2028, U+2029), no leading or trailing space and at most 200 characters. Anything
 * else is null, so the name cannot carry a second line into a note or a config file.
 */
export function printableName(s) {
  if (typeof s !== "string" || s === "" || s.trim() !== s) return null;
  let count = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code <= 0x1f || code === 0x7f || code === 0x85 || code === 0x2028 || code === 0x2029) return null;
    if (++count > MAX_PRINTED_NAME) return null;
  }
  return s;
}

// --- XML scanner (xml.ts): one forward pass, no regular expressions, no element stack ---

const NO_ATTRS = new Map();
const ENTITY_WINDOW = 10;
const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function isSpace(c) {
  return c === " " || c === "\t" || c === "\n" || c === "\r";
}

function isQuote(c) {
  return c === '"' || c === "'";
}

function decodeReference(text, amp) {
  const limit = Math.min(text.length, amp + 1 + ENTITY_WINDOW);
  let semi = -1;
  for (let i = amp + 1; i < limit; i++) {
    if (text.charAt(i) === ";") {
      semi = i;
      break;
    }
  }
  if (semi === -1) return undefined;
  const body = text.slice(amp + 1, semi);
  const named = Object.hasOwn(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : undefined;
  if (named !== undefined) return { value: named, end: semi + 1 };
  if (body.charAt(0) !== "#") return undefined;
  const hex = body.charAt(1) === "x";
  const digits = body.slice(hex ? 2 : 1);
  if (digits === "") return undefined;
  let code = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = Number.parseInt(digits.charAt(i), hex ? 16 : 10);
    if (Number.isNaN(digit)) return undefined;
    code = code * (hex ? 16 : 10) + digit;
  }
  if (code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return undefined;
  return { value: String.fromCodePoint(code), end: semi + 1 };
}

/** The five predefined entities and numeric references; anything else stays literal. */
export function decodeEntities(text) {
  let amp = text.indexOf("&");
  if (amp === -1) return text;
  let out = "";
  let from = 0;
  while (amp !== -1) {
    const decoded = decodeReference(text, amp);
    if (decoded === undefined) {
      amp = text.indexOf("&", amp + 1);
      continue;
    }
    out += text.slice(from, amp) + decoded.value;
    from = decoded.end;
    amp = text.indexOf("&", from);
  }
  return out + text.slice(from);
}

function readName(body, from) {
  let i = from;
  while (i < body.length && !isSpace(body.charAt(i)) && body.charAt(i) !== "/") i++;
  return body.slice(from, i);
}

function parseAttributes(body, from, end) {
  let attrs;
  let i = from;
  while (i < end) {
    while (i < end && isSpace(body.charAt(i))) i++;
    const nameStart = i;
    while (i < end && !isSpace(body.charAt(i)) && body.charAt(i) !== "=") i++;
    const name = body.slice(nameStart, i);
    while (i < end && isSpace(body.charAt(i))) i++;
    if (body.charAt(i) !== "=" || i >= end) continue;
    i++;
    while (i < end && isSpace(body.charAt(i))) i++;
    const quote = body.charAt(i);
    if (!isQuote(quote) || i >= end) {
      while (i < end && !isSpace(body.charAt(i))) i++;
      continue;
    }
    const close = body.indexOf(quote, i + 1);
    if (close === -1 || close >= end) break;
    if (name !== "") {
      attrs ??= new Map();
      if (!attrs.has(name)) attrs.set(name, decodeEntities(body.slice(i + 1, close)));
    }
    i = close + 1;
  }
  return attrs ?? NO_ATTRS;
}

function parseTag(body) {
  if (body.charAt(0) === "/") {
    const name = readName(body, 1);
    return name === "" ? undefined : { type: "end", name };
  }
  let end = body.length;
  while (end > 0 && isSpace(body.charAt(end - 1))) end--;
  const selfClosing = end > 0 && body.charAt(end - 1) === "/";
  if (selfClosing) end--;
  const name = readName(body, 0);
  if (name === "") return undefined;
  return { type: "start", name, attrs: parseAttributes(body, name.length, end), selfClosing };
}

function findDeclarationEnd(text, from) {
  let quote = "";
  for (let i = from; i < text.length; i++) {
    const c = text.charAt(i);
    if (quote !== "") {
      if (c === quote) quote = "";
    } else if (isQuote(c)) quote = c;
    else if (c === ">") return i;
  }
  return -1;
}

function findTagEnd(text, start) {
  let quote = "";
  for (let i = start + 1; i < text.length; i++) {
    const c = text.charAt(i);
    if (c === "<") return -i - 2;
    if (quote !== "") {
      if (c === quote) quote = "";
    } else if (isQuote(c)) quote = c;
    else if (c === ">") return i;
  }
  return -1;
}

/** Report start tags, end tags and text runs in document order; comments, CDATA, PIs and DOCTYPE are skipped. */
export function scanXml(text, onEvent) {
  const length = text.length;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  while (pos < length) {
    const lt = text.indexOf("<", pos);
    const textEnd = lt === -1 ? length : lt;
    if (textEnd > pos) onEvent({ type: "text", text: decodeEntities(text.slice(pos, textEnd)) });
    if (lt === -1) return;
    const next = text.charAt(lt + 1);
    if (next === "<") {
      pos = lt + 1;
    } else if (next === "!" && text.startsWith("<!--", lt)) {
      const close = text.indexOf("-->", lt + 4);
      if (close === -1) return;
      pos = close + 3;
    } else if (next === "!" && text.startsWith("<![CDATA[", lt)) {
      const close = text.indexOf("]]>", lt + 9);
      if (close === -1) return;
      pos = close + 3;
    } else if (next === "?") {
      const close = text.indexOf("?>", lt + 2);
      if (close === -1) return;
      pos = close + 2;
    } else if (next === "!") {
      const close = findDeclarationEnd(text, lt + 2);
      if (close === -1) return;
      pos = close + 1;
    } else {
      const close = findTagEnd(text, lt);
      if (close === -1) return;
      if (close < -1) {
        pos = -close - 2;
        continue;
      }
      const event = parseTag(text.slice(lt + 1, close));
      if (event !== undefined) onEvent(event);
      pos = close + 1;
    }
  }
}

// --- format detection (detect.ts): only the first 1 KiB after a BOM is read ---

const DETECTION_WINDOW = 1024;

function detectXml(window) {
  let decided;
  let seenRoot = false;
  scanXml(window, (event) => {
    if (decided !== undefined) return;
    if (!seenRoot) {
      if (event.type === "text") {
        if (event.text.trim() !== "") decided = "unknown";
      } else if (event.type === "end") decided = "unknown";
      else if (event.name !== "coverage" || event.attrs.has("clover")) decided = "unknown";
      else if (event.selfClosing) decided = "cobertura";
      else seenRoot = true;
      return;
    }
    if (event.type === "text") return;
    decided = event.type === "start" && event.name === "project" ? "unknown" : "cobertura";
  });
  if (decided !== undefined) return decided;
  return seenRoot ? "cobertura" : "unknown";
}

/**
 * "lcov" (starts with TN: or SF:), "cobertura" (root element exactly `coverage`, no `clover` attribute, first
 * child not `project`), "empty" (only whitespace, all within the window) or "unknown".
 */
export function detectCoverageFormat(text) {
  const start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const end = start + DETECTION_WINDOW;
  const window = text.slice(start, end);
  let first = 0;
  while (first < window.length && isSpace(window.charAt(first))) first++;
  if (first === window.length) return end >= text.length ? "empty" : "unknown";
  if (window.startsWith("TN:", first) || window.startsWith("SF:", first)) return "lcov";
  if (window.charAt(first) !== "<") return "unknown";
  return detectXml(window.slice(first));
}

// --- lcov (lcov.ts): SF, DA and end_of_record; hits for a line are summed across records ---

/** { map: Map<path, Map<line, hits>>, skipped } with paths mapped as pharn-ci maps them. */
export function parseLcov(text, { repoRoot, coverageRoot } = {}) {
  const map = new Map();
  let current;
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      const sf = line.slice(3);
      const p =
        coverageRoot !== undefined && !isAbsolutePath(sf.trim())
          ? normalizePath(joinCoverageRoot(sf, coverageRoot), repoRoot)
          : normalizePath(sf, repoRoot);
      current = map.get(p);
      if (!current) {
        current = new Map();
        map.set(p, current);
      }
    } else if (line.startsWith("DA:")) {
      if (!current) {
        skipped++;
        continue;
      }
      const [lineNo, hits] = line.slice(3).split(",");
      const n = Number(lineNo);
      const h = Number(hits);
      if (!Number.isInteger(n) || n < 1 || !Number.isFinite(h) || h < 0) {
        skipped++;
        continue;
      }
      current.set(n, (current.get(n) ?? 0) + h);
    } else if (line === "end_of_record") {
      current = undefined;
    }
  }
  for (const [p, hits] of map) if (hits.size === 0) map.delete(p);
  return { map, skipped };
}

// --- Cobertura (cobertura.ts): class-level <line> records; <source> only inside <sources> ---

const MAX_CLIMBING_JOIN_SOURCES = 16;

function climbs(p) {
  return p === ".." || p.startsWith("../");
}

function addCoberturaLine(perFile, filename, number, hits) {
  if (number === undefined) return false;
  const lineNo = Number(number);
  if (!Number.isInteger(lineNo) || lineNo < 1) return false;
  let count = 0;
  if (hits !== undefined) {
    if (hits.trim() === "") return false;
    count = Number(hits);
    if (!Number.isFinite(count) || count < 0) return false;
  }
  let lines = perFile.get(filename);
  if (!lines) {
    lines = new Map();
    perFile.set(filename, lines);
  }
  lines.set(lineNo, Math.max(lines.get(lineNo) ?? 0, count));
  return true;
}

function directSources(sources, repoRoot) {
  const root = normalizeRoot(repoRoot);
  const foldedRoot = foldForRoot(root, root);
  const kept = [];
  const seen = new Set();
  const keep = (source, k) => {
    if (seen.has(k)) return;
    seen.add(k);
    kept.push(source);
  };
  for (const source of sources) {
    const p = normalizePath(source);
    if (!isAbsolutePath(source)) {
      if (climbs(p)) continue;
      if (p !== "") {
        kept.push(source);
        break;
      }
      keep(source, "relative:");
      continue;
    }
    if (root === "") continue;
    if (startsWithPath(p, root)) {
      const rest = p.slice(root.length + 1);
      if (rest !== "" && !isAbsolutePath(`${rest}/`)) {
        kept.push(source);
        break;
      }
      if (rest.length < 3) keep(source, `under:${rest}`);
    } else if (p.length === root.length) {
      if (startsWithPath(`${p}/`, root)) keep(source, "root:");
    } else if (p.length < root.length) {
      const folded = foldForRoot(p, root);
      if (foldedRoot.startsWith(p.endsWith("/") ? folded : `${folded}/`)) keep(source, `ancestor:${p.length}:${folded}`);
    }
  }
  return kept;
}

function resolveCoberturaPath(filename, sources, repoRoot, coverageRoot) {
  for (const source of sources) {
    const joined = `${source}/${filename}`;
    if (isAbsolutePath(source)) {
      if (repoRoot === undefined) continue;
      const k = normalizePath(joined, repoRoot);
      if (!isAbsolutePath(k) && !climbs(k)) return k;
    } else {
      const k = normalizePath(joined);
      if (k !== "" && !climbs(k)) return joinCoverageRoot(k, coverageRoot);
    }
  }
  const k = normalizePath(filename, repoRoot);
  return isAbsolutePath(k) ? k : joinCoverageRoot(k, coverageRoot);
}

/** { map, skipped } like parseLcov; a file seen in several classes keeps the maximum hits per line. */
export function parseCobertura(text, { repoRoot, coverageRoot } = {}) {
  const sources = [];
  let skipped = 0;
  const perFile = new Map();
  let inSources = false;
  let sourceText;
  let currentFile;
  let methodDepth = 0;
  scanXml(text, (event) => {
    if (event.type === "text") {
      if (sourceText !== undefined) sourceText += event.text;
      return;
    }
    if (event.type === "end") {
      if (event.name === "sources") {
        inSources = false;
        sourceText = undefined;
      } else if (event.name === "source") {
        const source = sourceText?.trim();
        if (source) sources.push(source);
        sourceText = undefined;
      } else if (event.name === "class") {
        currentFile = undefined;
        methodDepth = 0;
      } else if ((event.name === "methods" || event.name === "method") && methodDepth > 0) {
        methodDepth--;
      }
      return;
    }
    if (event.name === "sources") inSources = !event.selfClosing;
    else if (event.name === "source") {
      if (inSources && !event.selfClosing) sourceText = "";
    } else if (event.name === "class") {
      const filename = event.selfClosing ? "" : (event.attrs.get("filename") ?? "").trim();
      currentFile = filename === "" ? undefined : filename;
      methodDepth = 0;
    } else if (event.name === "methods" || event.name === "method") {
      if (currentFile !== undefined && !event.selfClosing) methodDepth++;
    } else if (event.name === "line" && currentFile !== undefined && methodDepth === 0) {
      if (!addCoberturaLine(perFile, currentFile, event.attrs.get("number"), event.attrs.get("hits"))) skipped++;
    }
  });
  const distinct = [...new Set(sources)];
  const direct = directSources(distinct, repoRoot);
  const climbing = distinct.slice(0, MAX_CLIMBING_JOIN_SOURCES);
  const resolve = (filename) => {
    if (isAbsolutePath(filename)) return normalizePath(filename, repoRoot);
    return resolveCoberturaPath(filename, climbs(normalizePath(filename)) ? climbing : direct, repoRoot, coverageRoot);
  };
  const map = new Map();
  for (const [filename, lines] of perFile) {
    const k = resolve(filename);
    let target = map.get(k);
    if (!target) {
      target = new Map();
      map.set(k, target);
    }
    for (const [lineNo, hits] of lines) target.set(lineNo, Math.max(target.get(lineNo) ?? 0, hits));
  }
  return { map, skipped };
}

/** Parse `text` as `format` ("lcov" or "cobertura"). */
export function parseCoverage(text, format, options) {
  return format === "lcov" ? parseLcov(text, options) : parseCobertura(text, options);
}

/** The union of several maps, summing the hits of a line several maps list (merge.ts). */
export function mergeCoverageMaps(maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [p, lines] of map) {
      let target = merged.get(p);
      if (target === undefined) {
        target = new Map();
        merged.set(p, target);
      }
      for (const [line, hits] of lines) target.set(line, (target.get(line) ?? 0) + hits);
    }
  }
  return merged;
}

// --- git and the repository root ---

/** True when git itself could not run: missing, not executable, or blocked by a sandbox (macOS xcrun cache). */
export function gitCannotRun(err) {
  if (["ENOENT", "EACCES", "EPERM"].includes(err?.code)) return true;
  const stderr = String(err?.stderr ?? "");
  return /couldn't create cache file|xcrun: error|xcode-select/.test(stderr) && !/not a git repository/i.test(stderr);
}

/** git's first non-empty stderr line, or the error's own message. */
export function gitMessage(err) {
  const line = String(err?.stderr ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l !== "");
  return line ?? (err?.code ? `${err.code}` : String(err?.message ?? err));
}

/** The nearest directory at or above `cwd` that holds a .git entry (directory or file), or null. */
export function findGitRoot(cwd) {
  let dir = path.resolve(cwd);
  for (;;) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** The most a helper reads of one coverage file. */
const MAX_COVERAGE_BYTES = 256 * 1024 * 1024;

// <shared:read-file>
// Byte-identical in all four pharn-ci helper scripts (tests/shared-block.test.mjs checks it). It needs
// `closeSync`, `fsConstants` (node:fs `constants`), `fstatSync`, `openSync` and `readSync` from node:fs and a
// `UsageError` class from the file around it.

/**
 * Reads `file` as UTF-8 when it is a regular file of at most `cap` bytes, checking and reading through one
 * descriptor so the file checked is the file read. O_NONBLOCK so a FIFO is refused instead of blocking the
 * open; isFile so a directory or a device (which reports size 0) is refused; the read stops once more than
 * `cap` bytes arrive. Throws a UsageError naming `name` and the reason, carrying the system error's code.
 */
function readRegularFile(file, cap, name) {
  let fd;
  try {
    fd = openSync(file, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK);
    const stat = fstatSync(fd);
    if (!stat.isFile()) throw new UsageError(`${name} is not a regular file`);
    const over = () => new UsageError(`${name} is larger than ${cap / (1024 * 1024)} MiB`);
    if (stat.size > cap) throw over();
    const chunks = [];
    let total = 0;
    for (let n = -1; n !== 0; ) {
      const chunk = Buffer.allocUnsafe(64 * 1024);
      n = readSync(fd, chunk, 0, chunk.length, null);
      total += n;
      if (total > cap) throw over();
      chunks.push(chunk.subarray(0, n));
    }
    return Buffer.concat(chunks, total).toString("utf8");
  } catch (err) {
    if (err instanceof UsageError) throw err;
    throw Object.assign(new UsageError(`cannot read ${name}: ${err?.code ?? "unknown error"}`), { code: err?.code });
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
// </shared:read-file>
// </shared:coverage>

// --- globs (glob.ts, globWalk.ts, coverageEntries.ts) ---------------------------------------------

/** The most coverage files one run may match through globs, and the most directory entries it may visit. */
export const MAX_COVERAGE_GLOB_FILES = 1000;
export const MAX_COVERAGE_WALK_ENTRIES = 100_000;

/** An entry with `*`, `?`, `[`, `]`, `{` or `}` is a glob; the brackets and braces are then rejected. */
export function hasGlobSyntax(entry) {
  return /[*?[\]{}]/.test(entry);
}

/** The most characters a glob may have after trimming (pharn-ci 0.11.0 and later, config.ts MAX_EXCLUDE_PATTERN_CHARS). */
export const MAX_GLOB_CHARS = 1024;

/** pharn-ci's glob rules (config.ts parseExcludePattern); returns the pattern without leading "./". */
export function parseGlob(pattern) {
  let start = 0;
  const trimmed = pattern.trim();
  while (trimmed.startsWith("./", start)) start += 2;
  const p = trimmed.slice(start);
  if (p.length > MAX_GLOB_CHARS) {
    throw new UsageError(`--coverage "${p.slice(0, 40)}..." is ${p.length} characters long; the limit is ${MAX_GLOB_CHARS} characters`);
  }
  const reject = (reason) => {
    throw new UsageError(`--coverage "${pattern}" ${reason}`);
  };
  if (p === "") reject("is empty");
  if (p.startsWith("/")) reject('must not start with "/" (patterns are relative to the repository root)');
  if (p.startsWith("!")) reject('must not start with "!" (negation is not supported)');
  if (p.endsWith("/")) reject('must not end with "/" (use "dir/**" for everything under a directory)');
  if (p.includes("//")) reject('must not contain "//"');
  if (p.split("/").includes("..")) reject('must not contain a ".." segment');
  if (p.includes("\\")) reject('must not contain "\\" (use "/" as the separator)');
  for (const ch of ["{", "}", "[", "]"]) if (p.includes(ch)) reject(`must not contain "${ch}" (only *, ** and ? are supported)`);
  return p;
}

function compileSegment(segment) {
  if (segment === "**") return { globstar: true, matches: () => false };
  const tokens = [];
  for (const cp of segment) {
    if (cp === "*") {
      if (tokens[tokens.length - 1]?.kind !== "star") tokens.push({ kind: "star" });
    } else if (cp === "?") tokens.push({ kind: "any" });
    else tokens.push({ kind: "lit", cp });
  }
  if (tokens.every((t) => t.kind === "lit")) return { globstar: false, matches: (_cps, text) => text === segment };
  const n = tokens.length;
  const closure = (set) => {
    for (let j = 0; j < n; j++) if (set[j] === 1 && tokens[j].kind === "star") set[j + 1] = 1;
  };
  return {
    globstar: false,
    matches: (cps) => {
      let active = new Uint8Array(n + 1);
      let next = new Uint8Array(n + 1);
      active[0] = 1;
      closure(active);
      for (const cp of cps) {
        next.fill(0);
        for (let j = 0; j < n; j++) {
          if (active[j] !== 1) continue;
          const token = tokens[j];
          if (token.kind === "star") next[j] = 1;
          else if (token.kind === "any" || token.cp === cp) next[j + 1] = 1;
        }
        closure(next);
        [active, next] = [next, active];
      }
      return active[n] === 1;
    },
  };
}

/** A predicate for repo-relative paths: `**` spans whole segments, `*` and `?` stay within one. */
export function compileGlob(pattern) {
  const segments = pattern.split("/").map(compileSegment);
  const end = segments.length;
  const closure = (set) => {
    for (let i = 0; i < end; i++) if (set[i] === 1 && segments[i].globstar) set[i + 1] = 1;
  };
  return (p) => {
    let active = new Uint8Array(end + 1);
    let next = new Uint8Array(end + 1);
    active[0] = 1;
    closure(active);
    for (const text of p.split("/")) {
      const cps = Array.from(text);
      next.fill(0);
      for (let i = 0; i < end; i++) {
        if (active[i] !== 1) continue;
        if (segments[i].globstar) next[i] = 1;
        else if (segments[i].matches(cps, text)) next[i + 1] = 1;
      }
      closure(next);
      [active, next] = [next, active];
    }
    return active[end] === 1;
  };
}

export class WalkLimitError extends Error {
  constructor(limit) {
    super(`the glob walk exceeded its ${limit} limit`);
    this.limit = limit;
  }
}

/**
 * The files `pattern` matches, through `listDir(dir)` (base-relative, "" for the base; null when missing).
 * Links are never followed; .git and node_modules are entered only where the pattern names them before
 * any `**`. `budget` is shared across one run's walks.
 */
export function walkGlob(pattern, listDir, budget) {
  const segments = pattern.split("/");
  const globstar = segments.indexOf("**");
  const matchers = segments.map((s) => (s === "**" ? null : compileGlob(s)));
  const full = compileGlob(pattern);
  const last = segments.length - 1;
  const found = [];
  const pending = [{ dir: "", depth: 0 }];
  for (let item = pending.pop(); item !== undefined; item = pending.pop()) {
    const { dir, depth } = item;
    const entries = listDir(dir);
    if (entries === null) continue;
    budget.entries += entries.length;
    if (budget.entries > MAX_COVERAGE_WALK_ENTRIES) throw new WalkLimitError("entries");
    const beforeGlobstar = globstar === -1 || depth < globstar;
    for (const entry of entries) {
      if (entry.kind === "symlink" || entry.kind === "other") continue;
      const p = dir === "" ? entry.name : `${dir}/${entry.name}`;
      if (entry.kind === "file") {
        if (!full(p)) continue;
        budget.files++;
        if (budget.files > MAX_COVERAGE_GLOB_FILES) throw new WalkLimitError("files");
        found.push(p);
        continue;
      }
      if (entry.name === ".git" || entry.name === "node_modules") {
        if (beforeGlobstar && depth < last && segments[depth] === entry.name) pending.push({ dir: p, depth: depth + 1 });
        continue;
      }
      if (!beforeGlobstar) pending.push({ dir: p, depth: depth + 1 });
      else if (depth < last && matchers[depth](entry.name)) pending.push({ dir: p, depth: depth + 1 });
    }
  }
  return found.sort();
}

/** A directory lister over the real file system under `root`, reporting links as links. */
export function fsListDir(root) {
  return (dir) => {
    let entries;
    try {
      entries = readdirSync(path.join(root, dir), { withFileTypes: true });
    } catch {
      return null;
    }
    return entries.map((e) => ({
      name: e.name,
      kind: e.isSymbolicLink() ? "symlink" : e.isFile() ? "file" : e.isDirectory() ? "directory" : "other",
    }));
  };
}

// --- auto-discovery (coverageDiscovery.ts) -----------------------------------------------------------

export const COVERAGE_DISCOVERY_CANDIDATES = Object.freeze([
  "coverage/lcov.info",
  "lcov.info",
  "coverage.xml",
  "coverage/cobertura-coverage.xml",
  "**/coverage.cobertura.xml",
]);

const GLOB_CANDIDATE = "**/coverage.cobertura.xml";

/** One candidate kind with matches is found, several are ambiguous (pharn-ci fails the step), none is not-found. */
export function chooseDiscoveredCoverage(paths) {
  const present = new Set(paths);
  const matchesGlob = compileGlob(GLOB_CANDIDATE);
  const skipped = (p) => p.split("/").some((s) => s === ".git" || s === "node_modules");
  const kinds = [];
  for (const candidate of COVERAGE_DISCOVERY_CANDIDATES) {
    if (candidate === GLOB_CANDIDATE) {
      const matches = [...present].filter((p) => !skipped(p) && matchesGlob(p)).sort();
      if (matches.length > 0) kinds.push(matches);
    } else if (present.has(candidate)) {
      kinds.push([candidate]);
    }
  }
  if (kinds.length === 0) return { kind: "not-found", files: [] };
  if (kinds.length === 1) return { kind: "found", files: kinds[0] };
  return { kind: "ambiguous", files: kinds.flat() };
}

export function discoverCoverage(listDir) {
  const budget = { files: 0, entries: 0 };
  const existing = [];
  try {
    for (const candidate of COVERAGE_DISCOVERY_CANDIDATES) existing.push(...walkGlob(candidate, listDir, budget));
  } catch (err) {
    if (err instanceof WalkLimitError) {
      return { kind: "over-limit", files: [], limit: err.limit };
    }
    throw err;
  }
  return chooseDiscoveredCoverage(existing);
}

// --- path matching (coverage/match.ts) ------------------------------------------------------------------

/**
 * Compare the (already root-mapped) coverage paths with the repository's files by exact match. A root is
 * suggested only when every path is unmatched, from relative paths whose whole-segment suffix match points
 * at a directory; the smallest candidate in code-unit order wins.
 */
export function matchCoveragePaths(coveragePaths, repoFiles, coverageRoot) {
  const known = new Set(repoFiles);
  const all = [...new Set(coveragePaths)];
  const unmatched = all.filter((p) => !known.has(p)).sort();
  return {
    total: all.length,
    unmatched,
    suggestedRoot: unmatched.length === all.length ? suggestRoot(unmatched, repoFiles, coverageRoot) : null,
  };
}

function suggestRoot(unmatched, repoFiles, coverageRoot) {
  const relative = new Set(unmatched.filter((p) => !isAbsolutePath(p)));
  if (relative.size === 0) return null;
  const rootPrefix = coverageRoot === undefined || coverageRoot === "." ? null : `${coverageRoot}/`;
  let best = null;
  for (const file of repoFiles) {
    for (let i = file.indexOf("/"); i > 0; i = file.indexOf("/", i + 1)) {
      const suffix = file.slice(i + 1);
      if (!relative.has(suffix)) continue;
      const prefix = file.slice(0, i);
      const candidate = rootPrefix !== null && suffix.startsWith(rootPrefix) ? `${prefix}/${coverageRoot}` : prefix;
      if (best === null || candidate < best) best = candidate;
    }
  }
  return best;
}

// --- the check, on plain inputs ------------------------------------------------------------------------

/**
 * What pharn-ci would make of these coverage entries. `repo` is { repoRoot, files, tracked } where `files`
 * lists the repository's files (tracked ones, or files on disk when git cannot run) and `tracked` says which.
 * `isIgnored(rels)` answers, in one call for all coverage files, whether git ignores each path: one true, false
 * or null (unknown) per path, in order. Discovery runs only without entries; with entries it is "not-run", as
 * pharn-ci does not use it then. Codes are pharn-ci's own message codes, in the order pharn-ci decides them;
 * `blocking` is the one that stops diff coverage being measured.
 */
export function checkCoverage({ entries, coverageRoot, format = "auto" }, repo, { listDir, readText, isIgnored }) {
  const { repoRoot, files: repoFiles, tracked } = repo;
  const notes = [];
  const discovery = entries.length > 0 ? { kind: "not-run", files: [] } : discoverCoverage(listDir);
  if (discovery.kind === "over-limit") {
    notes.push(`auto-discovery went over pharn-ci's ${discovery.limit} limit, so pharn-ci would fail the step; set coverage.file`);
  }

  let from;
  let names;
  let blocking = null;
  if (entries.length > 0) {
    from = "--coverage";
    names = [];
    const budget = { files: 0, entries: 0 };
    for (const entry of entries) {
      if (!hasGlobSyntax(entry)) {
        names.push({ name: entry, missing: false });
        continue;
      }
      let matches;
      try {
        matches = walkGlob(parseGlob(entry), listDir, budget);
      } catch (err) {
        if (!(err instanceof WalkLimitError)) throw err;
        throw new UsageError(`--coverage "${entry}" went over pharn-ci's glob ${err.limit} limit; pharn-ci would fail the step`);
      }
      if (matches.length === 0) names.push({ name: entry, missing: true });
      for (const m of matches) names.push({ name: m, missing: false });
    }
  } else {
    from = "discovery";
    names = discovery.files.map((name) => ({ name, missing: false }));
    if (discovery.kind === "ambiguous") blocking = "DISCOVERY_AMBIGUOUS";
    else if (discovery.kind !== "found") blocking = "COVERAGE_FILE_MISSING";
  }

  // pharn-ci checks every file exists before it reads any, then stops at the first unreadable one.
  const coverage = [];
  const maps = [];
  let skipped = 0;
  let trackedFile = null;
  let missingFile = false;
  let unreadable = null;
  const seen = new Set();
  const trackedSet = tracked ? new Set(repoFiles) : null;
  for (const { name, missing } of blocking === null ? names : []) {
    const rel = normalizePath(name, repoRoot);
    if (seen.has(rel)) continue;
    seen.add(rel);
    const text = missing ? null : readText(name);
    const entry = { path: name, exists: text !== null, format: null, files: 0, lines: 0, skipped: 0 };
    entry.tracked = tracked ? trackedSet.has(rel) : null;
    entry.ignored = null; // answered below, for every file in one call
    if (entry.tracked) trackedFile ??= rel;
    coverage.push(entry);
    if (text === null) {
      missingFile = true;
      continue;
    }
    entry.format = format === "auto" ? detectCoverageFormat(text) : format;
    if (entry.format === "empty" || entry.format === "unknown") {
      unreadable ??= entry.format === "empty" ? "COVERAGE_FILE_EMPTY" : "COVERAGE_FORMAT_UNSUPPORTED";
      continue;
    }
    const parsed = parseCoverage(text, entry.format, { repoRoot, coverageRoot });
    entry.files = parsed.map.size;
    entry.lines = [...parsed.map.values()].reduce((n, lines) => n + lines.size, 0);
    entry.skipped = parsed.skipped;
    if (parsed.map.size === 0) unreadable ??= "COVERAGE_FILE_EMPTY";
    skipped += parsed.skipped;
    maps.push(parsed.map);
  }
  if (coverage.length > 0) {
    const answers = isIgnored([...seen]);
    coverage.forEach((entry, i) => {
      entry.ignored = answers[i] ?? null;
    });
  }
  if (missingFile) blocking ??= "COVERAGE_FILE_MISSING";
  if (unreadable !== null) blocking ??= unreadable;

  let paths = null;
  let rootWithheld = false;
  if (blocking === null && maps.length > 0) {
    const merged = mergeCoverageMaps(maps);
    const match = matchCoveragePaths([...merged.keys()], repoFiles, coverageRoot);
    const onDisk = tracked ? match.unmatched.filter((p) => !isAbsolutePath(p) && !p.startsWith("../") && existsSync(path.join(repoRoot, p))) : [];
    paths = {
      total: match.total,
      matched: match.total - match.unmatched.length,
      unmatched: match.unmatched.length,
      unmatchedExample: printableName(match.unmatched[0]),
      untrackedOnDisk: tracked ? onDisk.length : null,
      suggestedRoot: printableName(match.suggestedRoot),
    };
    rootWithheld = match.suggestedRoot !== null && paths.suggestedRoot === null;
    if (match.total > 0 && match.unmatched.length === match.total) blocking = "COVERAGE_PATHS_UNMATCHED";
    if (onDisk.length > 0) notes.push("some coverage paths are files on disk that git does not track yet (untrackedOnDisk); they match once committed");
  }

  const codes = [];
  if (blocking !== null) codes.push(blocking);
  else {
    if (paths !== null && paths.unmatched > 0) codes.push("COVERAGE_PATHS_PARTIALLY_UNMATCHED");
    if (skipped > 0) codes.push("COVERAGE_LINES_SKIPPED");
  }
  if (trackedFile !== null) codes.push("COVERAGE_FILE_TRACKED");
  // Notes are fixed strings: they name the field that holds a path, never the path itself.
  const notIgnored = coverage.filter((c) => c.tracked === false && c.ignored === false).length;
  if (notIgnored === 1) {
    notes.push("1 coverage file is not git-ignored (coverage[].ignored is false); ignore it so it is never committed (a committed one raises COVERAGE_FILE_TRACKED)");
  } else if (notIgnored > 1) {
    notes.push(`${notIgnored} coverage files are not git-ignored (coverage[].ignored is false); ignore them so they are never committed (a committed one raises COVERAGE_FILE_TRACKED)`);
  }
  if (paths?.suggestedRoot) {
    notes.push("the coverage paths look relative to the directory in paths.suggestedRoot: set coverage.root to it, written as a quoted YAML string, in .pharn/ci.yml, or have the runner write repo-relative paths");
  } else if (rootWithheld) {
    notes.push(
      "the coverage paths look relative to a directory whose name has a control character, a line break, leading or trailing space or over 200 characters, so paths.suggestedRoot is null; have the runner write repo-relative paths",
    );
  }
  return {
    discovery: { kind: discovery.kind, files: discovery.files },
    from,
    coverage,
    paths,
    codes,
    blocking,
    notes,
  };
}

// --- git and the repository ----------------------------------------------------------------------------

// check-ignore parses pathspec magic but is called without --literal-pathspecs, so gitIgnoresAll passes every path as
// "./<rel>", which git never reads as magic. `input`, when given, is written to git's stdin.
function realGit(cwd, args, input) {
  return execFileSync("git", args[0] === "check-ignore" ? args : ["--literal-pathspecs", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
    timeout: 120_000,
  });
}

/** Every regular file under `root`, repo-relative, skipping .git and node_modules, within the walk limit. */
export function filesOnDisk(root) {
  const list = fsListDir(root);
  const files = [];
  let entries = 0;
  const pending = [""];
  for (let dir = pending.pop(); dir !== undefined; dir = pending.pop()) {
    const listed = list(dir) ?? [];
    entries += listed.length;
    if (entries > MAX_COVERAGE_WALK_ENTRIES) return { files: files.sort(), truncated: true };
    for (const e of listed) {
      const p = dir === "" ? e.name : `${dir}/${e.name}`;
      if (e.kind === "file") files.push(p);
      else if (e.kind === "directory" && e.name !== ".git" && e.name !== "node_modules") pending.push(p);
    }
  }
  return { files: files.sort(), truncated: false };
}

const NO_GIT_NOTE =
  "git could not run here, so coverage paths were matched against files on disk under the directory holding .git instead of tracked files, and tracked and ignored were not checked";

/**
 * The repository root and its files. When git cannot run, the directory holding .git stands in for the root
 * and files on disk for tracked files. Any other git failure is an error.
 */
export function locateRepo(cwd, git) {
  try {
    const repoRoot = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
    const files = git(repoRoot, ["ls-files", "-z"]).split("\0").filter(Boolean);
    return { repoRoot, files, tracked: true, git: true, reason: null, truncated: false };
  } catch (err) {
    if (!gitCannotRun(err)) {
      if (/not a git repository/i.test(String(err?.stderr ?? ""))) throw new UsageError("not inside a git repository");
      throw new UsageError(`git failed: ${gitMessage(err)}`);
    }
    const repoRoot = findGitRoot(cwd);
    if (repoRoot === null) throw new UsageError("not inside a git repository");
    const { files, truncated } = filesOnDisk(repoRoot);
    return { repoRoot, files, tracked: false, git: false, reason: gitMessage(err), truncated };
  }
}

/** Whether git ignores `rel`: true, false, or null when git cannot tell (a path behind a symlinked directory). */
function gitIgnores(git, repoRoot, rel) {
  try {
    git(repoRoot, ["check-ignore", "-q", "--no-index", "--", `./${rel}`]);
    return true;
  } catch (err) {
    return err?.status === 1 ? false : null;
  }
}

/**
 * Whether git ignores each of `rels`, asking git once: true, false, or null when that cannot be asked (not a safe
 * path) or git cannot tell. The batch stops at the first path git cannot check and prints nothing for the rest, so a
 * batch that fails is discarded and each path is asked on its own.
 */
function gitIgnoresAll(git, repoRoot, rels) {
  const asked = rels.filter(isSafeRepoPath);
  const answers = new Map();
  if (asked.length > 0) {
    let out = null;
    try {
      out = git(repoRoot, ["check-ignore", "--no-index", "-z", "--stdin"], asked.map((rel) => `./${rel}\0`).join(""));
    } catch (err) {
      if (err?.status === 1) out = "";
    }
    if (out === null) {
      for (const rel of asked) answers.set(rel, gitIgnores(git, repoRoot, rel));
    } else {
      const ignored = new Set(out.split("\0").map((p) => (p.startsWith("./") ? p.slice(2) : p)));
      for (const rel of asked) answers.set(rel, ignored.has(rel));
    }
  }
  return rels.map((rel) => answers.get(rel) ?? null);
}

export function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        coverage: { type: "string", multiple: true },
        "coverage-root": { type: "string" },
        format: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (err) {
    throw new UsageError(`${err.message}\n${USAGE}`);
  }
  const v = parsed.values;
  if (v.help) return { help: true };
  const format = v.format ?? "auto";
  if (!["lcov", "cobertura", "auto"].includes(format)) {
    throw new UsageError(`--format must be lcov, cobertura or auto, got "${format}"`);
  }
  const entries = (v.coverage ?? []).map((e) => e.trim());
  if (entries.some((e) => e === "" || e.includes("\0"))) throw new UsageError("--coverage must not be empty");
  for (const e of entries) if (hasGlobSyntax(e)) parseGlob(e);
  const root = v["coverage-root"] === undefined ? undefined : parseCoverageRoot(v["coverage-root"]);
  return { entries, coverageRoot: root, format };
}

export function run(argv, { cwd = process.cwd(), git = realGit } = {}) {
  const opts = parseCli(argv);
  if (opts.help) return { help: USAGE };
  const repo = locateRepo(cwd, git);
  // Only a file that does not exist is missing, as in pharn-ci; any other failure to read one ends the run.
  const readText = (name) => {
    try {
      return readRegularFile(path.resolve(repo.repoRoot, name), MAX_COVERAGE_BYTES, `coverage file ${name}`);
    } catch (err) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  };
  const isIgnored = (rels) => (repo.git ? gitIgnoresAll(git, repo.repoRoot, rels) : rels.map(() => null));
  const result = checkCoverage(opts, repo, { listDir: fsListDir(repo.repoRoot), readText, isIgnored });
  const notes = [];
  if (!repo.git) notes.push(`${NO_GIT_NOTE} (${repo.reason})`);
  if (repo.truncated) notes.push("the repository has more files than the walk limit, so not every file on disk was listed");
  return {
    schemaVersion: 1,
    git: repo.git,
    repoFiles: repo.tracked ? "tracked" : "on-disk",
    coverageRoot: opts.coverageRoot ?? null,
    ...result,
    notes: [...notes, ...result.notes],
  };
}

function isMain() {
  try {
    return realpathSync(process.argv[1] ?? "") === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  try {
    const out = run(process.argv.slice(2));
    if (out.help) console.log(out.help);
    else console.log(JSON.stringify(out, null, 1));
  } catch (err) {
    console.error(`check-coverage: ${err instanceof UsageError ? err.message : (err?.stack ?? String(err))}`);
    process.exit(2);
  }
}
