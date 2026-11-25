#!/usr/bin/env node
// Re-check the added lines a pharn-ci report (Report v1 or v2) lists as uncovered against a fresh
// coverage report, and estimate the new diff coverage. Node core only; reads files and runs
// read-only git commands, writes nothing.
//
//   node check-lines.mjs --report <report.json> --coverage <file> [--coverage <file>]...
//                        [--base <ref>] [--coverage-root <dir>] [--format lcov|cobertura|auto]
//
// Prints one JSON object on stdout; exit 0. Usage and input errors: message on stderr, exit 2.
// With --base, the added lines come from `git diff <base>...HEAD` exactly as pharn-ci reads them, so
// the estimate is recomputed from the diff and lines that lost coverage are found; without it, the
// estimate assumes every line the report counted as covered still is.
// When git cannot run (missing, or blocked by a sandbox), the directory holding .git is taken as the
// repository root and files on disk stand in for tracked files; the output says so ("git": false).
// This is an estimate for the person's own check run, not a replacement for pharn-ci.

import { execFileSync } from "node:child_process";
import { closeSync, constants as fsConstants, existsSync, fstatSync, openSync, readSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const USAGE =
  "usage: check-lines.mjs --report <report.json> --coverage <file> [--coverage <file>]... [--base <ref>] [--coverage-root <dir>] [--format lcov|cobertura|auto]";

// Built from code points: these are invisible in source, and a literal one is easy to lose in an edit.
const LINE_TERMINATORS = ["\n", "\r", String.fromCharCode(0x2028), String.fromCharCode(0x2029)];

export class UsageError extends Error {}

/** The most the helper reads of a report, as list-fixes.mjs. */
const MAX_REPORT_BYTES = 32 * 1024 * 1024;

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

export function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        report: { type: "string" },
        coverage: { type: "string", multiple: true },
        base: { type: "string" },
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
  if (!v.report) throw new UsageError(`--report is required\n${USAGE}`);
  if (!v.coverage || v.coverage.length === 0) throw new UsageError(`--coverage is required\n${USAGE}`);
  const format = v.format ?? "auto";
  if (!["lcov", "cobertura", "auto"].includes(format)) {
    throw new UsageError(`--format must be lcov, cobertura or auto, got "${format}"`);
  }
  const root = v["coverage-root"] === undefined ? undefined : parseCoverageRoot(v["coverage-root"]);
  if (v.base !== undefined && (v.base === "" || v.base.startsWith("-") || v.base.includes("\0"))) {
    throw new UsageError("--base must be a ref or commit, not empty and not starting with '-'");
  }
  return { report: v.report, coverage: v.coverage, coverageRoot: root, format, base: v.base ?? null };
}

/**
 * The report versions this helper reads: Report v1 (pharn-ci 0.1.x, the string "1") and Report v2 (pharn-ci 0.2.x to
 * 0.12.x, the number 2). v2 takes `diffCoverage` from v1 unchanged, and that is all this helper reads.
 */
export function isKnownSchemaVersion(v) {
  return v === "1" || v === 2;
}

const TOOL_VERSION = /^\d+\.\d+\.\d+[\w.-]{0,20}$/;
const VERDICTS = new Set(["pass", "warn", "fail"]);

/**
 * Validate the parts of a Report v1 or v2 this helper reads. Throws UsageError on anything else. Report fields that are
 * printed keep only a known shape: the verdict, percent and tool version are otherwise null or "?", and paths that are
 * not repo-relative are left out and counted in `invalidPaths`.
 */
export function readReport(text) {
  let r;
  try {
    r = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (err) {
    throw new UsageError(`the report is not JSON: ${err.message}`);
  }
  if (r === null || typeof r !== "object" || !isKnownSchemaVersion(r.schemaVersion) || r.tool?.name !== "pharn-ci") {
    throw new UsageError('the report is not a pharn-ci Report v1 or v2 (schemaVersion "1" or 2, tool.name "pharn-ci")');
  }
  const dc = r.diffCoverage;
  if (dc === null || dc === undefined) {
    throw new UsageError("the report has no diff coverage (diffCoverage is null); its messages say why, so there are no lines to check");
  }
  const isCount = (n) => Number.isInteger(n) && n >= 0;
  if (!isCount(dc.coveredLines) || !isCount(dc.coverableLines) || !Array.isArray(dc.files)) {
    throw new UsageError("the report's diffCoverage is malformed");
  }
  const files = [];
  let invalidPaths = 0;
  for (const f of dc.files) {
    if (typeof f?.path !== "string" || f.path === "" || !Array.isArray(f.uncoveredLines)) {
      throw new UsageError("the report's diffCoverage.files is malformed");
    }
    if (!isSafeRepoPath(f.path)) {
      invalidPaths++;
      continue;
    }
    const lines = f.uncoveredLines.filter((n) => Number.isInteger(n) && n >= 1);
    files.push({
      path: f.path,
      lines: [...new Set(lines)].sort((a, b) => a - b),
      coverableLines: isCount(f.coverableLines) ? f.coverableLines : null,
    });
  }
  const excluded = Array.isArray(dc.excludedFiles) ? dc.excludedFiles.filter((p) => typeof p === "string") : [];
  return {
    tool: `${r.tool.name} ${typeof r.tool.version === "string" && TOOL_VERSION.test(r.tool.version) ? r.tool.version : "?"}`,
    verdict: VERDICTS.has(r.verdict) ? r.verdict : null,
    percent: typeof dc.percent === "number" && Number.isFinite(dc.percent) ? dc.percent : null,
    threshold: typeof dc.threshold === "number" && Number.isFinite(dc.threshold) ? dc.threshold : null,
    coveredLines: dc.coveredLines,
    coverableLines: dc.coverableLines,
    files,
    excludedFiles: new Set(excluded),
    invalidPaths,
  };
}

// --- unified diff reader --------------------------------------------------------------------------
// A port of pharn-ci 0.1.0's packages/core/src/diff/unified.ts (Apache-2.0), so the added lines here are
// the ones pharn-ci counts: renames, C-quoted paths, tab suffixes, /dev/null, binary files and hunk
// line counting included.

const HUNK_HEADER = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
const ESCAPES = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 };

/** Undo git's C-style path quoting (core.quotePath), decoding octal UTF-8 bytes. */
export function unquote(value) {
  if (!(value.length >= 2 && value.startsWith('"') && value.endsWith('"'))) return value;
  const body = value.slice(1, -1);
  let encoded = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== "\\") {
      encoded += encodeURIComponent(ch);
      continue;
    }
    const octal = /^[0-7]{3}/.exec(body.slice(i + 1))?.[0];
    const next = body[i + 1] ?? "";
    let byte = 92;
    if (octal) {
      byte = Number.parseInt(octal, 8);
      i += 3;
    } else if (next in ESCAPES) {
      byte = ESCAPES[next];
      i += 1;
    }
    encoded += `%${byte.toString(16).padStart(2, "0")}`;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return body;
  }
}

function stripTabSuffix(raw) {
  let lastBreak = -1;
  for (const terminator of LINE_TERMINATORS) lastBreak = Math.max(lastBreak, raw.lastIndexOf(terminator));
  const tab = raw.indexOf("\t", lastBreak + 1);
  return tab === -1 ? raw : raw.slice(0, tab);
}

function stripPrefix(p) {
  const slash = p.indexOf("/");
  return slash === -1 ? p : p.slice(slash + 1);
}

function parseMarkerPath(raw) {
  const value = unquote(stripTabSuffix(raw));
  if (value === "/dev/null") return null;
  return stripPrefix(value);
}

function closingQuote(s) {
  for (let i = 1; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s[i] === '"') return i;
  }
  return -1;
}

function parseGitHeader(rest) {
  if (rest.startsWith('"')) {
    const end = closingQuote(rest);
    if (end === -1) return null;
    return { oldPath: stripPrefix(unquote(rest.slice(0, end + 1))), newPath: stripPrefix(unquote(rest.slice(end + 2))) };
  }
  const half = (rest.length - 1) / 2;
  if (Number.isInteger(half) && rest[half] === " ") {
    const a = stripPrefix(rest.slice(0, half));
    const b = stripPrefix(rest.slice(half + 1));
    if (a === b) return { oldPath: a, newPath: b };
  }
  const split = rest.lastIndexOf(" b/");
  if (split === -1) return null;
  return { oldPath: stripPrefix(rest.slice(0, split)), newPath: stripPrefix(rest.slice(split + 1)) };
}

/** `git diff --unified=0` text to [{ path, oldPath, status, addedLines, binary? }], as pharn-ci reads it. */
export function parseUnifiedDiff(text) {
  const entries = [];
  let current;
  let oldRemaining = 0;
  let newRemaining = 0;
  let cursor = 0;
  const start = () => {
    current = { oldPath: null, newPath: null, status: "modified", addedLines: [], sawHunk: false, binary: false };
    entries.push(current);
    return current;
  };
  for (const line of text.split(/\r?\n/)) {
    if (current && (oldRemaining > 0 || newRemaining > 0)) {
      const marker = line[0];
      if (marker === "+") {
        current.addedLines.push(cursor++);
        newRemaining--;
        continue;
      }
      if (marker === "-") {
        oldRemaining--;
        continue;
      }
      if (marker === " ") {
        cursor++;
        oldRemaining--;
        newRemaining--;
        continue;
      }
      if (marker === "\\") continue;
      oldRemaining = 0;
      newRemaining = 0;
    }
    if (line.startsWith("\\")) continue;
    if (line.startsWith("diff --git ")) {
      const entry = start();
      const header = parseGitHeader(line.slice("diff --git ".length));
      if (header) {
        entry.oldPath = header.oldPath;
        entry.newPath = header.newPath;
      }
    } else if (line.startsWith("new file mode")) {
      if (current) current.status = "added";
    } else if (line.startsWith("deleted file mode")) {
      if (current) current.status = "deleted";
    } else if (line.startsWith("rename from ")) {
      if (current) {
        current.status = "renamed";
        current.oldPath = unquote(line.slice("rename from ".length));
      }
    } else if (line.startsWith("rename to ")) {
      if (current) {
        current.status = "renamed";
        current.newPath = unquote(line.slice("rename to ".length));
      }
    } else if (line.startsWith("--- ")) {
      const entry = !current || current.sawHunk ? start() : current;
      const p = parseMarkerPath(line.slice(4));
      if (p === null) entry.status = "added";
      else entry.oldPath = p;
    } else if (line.startsWith("+++ ")) {
      const entry = current ?? start();
      const p = parseMarkerPath(line.slice(4));
      if (p === null) entry.status = "deleted";
      else entry.newPath = p;
    } else if ((line.startsWith("Binary files ") && line.endsWith(" differ")) || line === "GIT binary patch") {
      if (current) current.binary = true;
    } else if (line.startsWith("@@ ")) {
      const match = HUNK_HEADER.exec(line);
      if (!match || !current) continue;
      current.sawHunk = true;
      oldRemaining = match[1] === undefined ? 1 : Number(match[1]);
      cursor = Number(match[2]);
      newRemaining = match[3] === undefined ? 1 : Number(match[3]);
    }
  }
  const files = [];
  for (const e of entries) {
    const p = e.status === "deleted" ? (e.oldPath ?? e.newPath) : (e.newPath ?? e.oldPath);
    if (p === null) continue;
    files.push({
      path: p,
      oldPath: e.oldPath ?? p,
      status: e.status,
      addedLines: e.status === "deleted" ? [] : [...new Set(e.addedLines)].sort((a, b) => a - b),
      ...(e.binary ? { binary: true } : {}),
    });
  }
  return files;
}

// --- percent and threshold, as pharn-ci 0.1.0 computes them (packages/core/src/diffCoverage.ts) ----

/** Percent rounded to 2 decimals; 100 and 0 are reserved for exactly all / none covered. */
export function percentOf(covered, total, round = Math.round) {
  if (total === 0) return null;
  const rounded = round((covered * 10000) / total) / 100;
  return Math.min(Math.max(rounded, covered > 0 ? 0.01 : 0), covered < total ? 99.99 : 100);
}

/** Exactly whether covered / total >= threshold / 100, reading the threshold as the decimal it was written as. */
export function atLeast(covered, total, threshold) {
  const m = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(threshold));
  if (m === null) return covered * 100 >= threshold * total;
  const fraction = m[2] ?? "";
  const scale = fraction.length - Number(m[3] ?? 0);
  const digits = BigInt(`${m[1]}${fraction}`);
  const left = BigInt(covered) * 100n * 10n ** BigInt(Math.max(scale, 0));
  const right = digits * BigInt(total) * 10n ** BigInt(Math.max(-scale, 0));
  return left >= right;
}

/** The estimate block: the percent rules of Report v1 (unchanged in v2), and whether the threshold is met. */
export function estimateOf(covered, coverable, threshold, basis) {
  const meets = threshold === null ? null : coverable === 0 || atLeast(covered, coverable, threshold);
  let percent = percentOf(covered, coverable);
  if (meets === false && percent !== null && percent >= threshold) percent = percentOf(covered, coverable, Math.floor);
  return { coveredLines: covered, coverableLines: coverable, percent, threshold, meetsThreshold: meets, basis };
}

// --- comparison -----------------------------------------------------------------------------------

function groupByPath(entries) {
  const byPath = new Map();
  for (const { path: p, line } of entries) {
    if (!byPath.has(p)) byPath.set(p, []);
    byPath.get(p).push(line);
  }
  return [...byPath].map(([p, lines]) => ({ path: p, lines }));
}

const key = (p, line) => `${p}\n${line}`;

/**
 * The comparison itself, on plain data. `diff` is the parsed `<base>...HEAD` diff, or null: with it the
 * estimate is recomputed from the added lines (pharn-ci's own rule), without it the report's covered
 * count is taken as still true. Only the lines asked about are kept from the coverage records.
 */
export function compare(report, coverageFiles, { tracked, diff = null }) {
  const measured = diff === null ? [] : diff.filter((f) => f.status !== "deleted" && !report.excludedFiles.has(f.path));
  const wanted = new Set();
  for (const f of report.files) for (const line of f.lines) wanted.add(key(f.path, line));
  for (const f of measured) for (const line of f.addedLines) wanted.add(key(f.path, line));

  // The files' maps are already keyed by repo path (the parsers map paths as pharn-ci does) and merge by sum.
  const merged = mergeCoverageMaps(coverageFiles.map((cf) => cf.parsed.map));
  const skipped = coverageFiles.reduce((n, cf) => n + cf.parsed.skipped, 0);
  const hits = new Map();
  const coveragePaths = new Set();
  const unmatched = [];
  for (const [p, lines] of merged) {
    if (!tracked.has(p)) {
      unmatched.push(p);
      continue;
    }
    coveragePaths.add(p);
    for (const [line, h] of lines) {
      const k = key(p, line);
      if (wanted.has(k)) hits.set(k, h);
    }
  }
  unmatched.sort();

  const nowCovered = [];
  const stillUncovered = [];
  const notInCoverage = [];
  for (const f of report.files) {
    for (const line of f.lines) {
      const h = hits.get(key(f.path, line));
      if (h === undefined) notInCoverage.push({ path: f.path, line });
      else if (h > 0) nowCovered.push({ path: f.path, line });
      else stillUncovered.push({ path: f.path, line });
    }
  }

  let estimate;
  let notAdded = null;
  let regressed = null;
  let coverableMismatch = null;
  if (diff === null) {
    const covered = Math.min(report.coverableLines, report.coveredLines + nowCovered.length);
    estimate = estimateOf(covered, report.coverableLines, report.threshold, "listed-lines");
  } else {
    const added = new Map(measured.map((f) => [f.path, new Set(f.addedLines)]));
    notAdded = groupByPath(report.files.flatMap((f) => f.lines.filter((line) => !added.get(f.path)?.has(line)).map((line) => ({ path: f.path, line }))));
    const local = new Map();
    let covered = 0;
    let coverable = 0;
    for (const f of measured) {
      let fileCovered = 0;
      const uncovered = [];
      for (const line of f.addedLines) {
        const h = hits.get(key(f.path, line));
        if (h === undefined) continue;
        if (h > 0) fileCovered++;
        else uncovered.push(line);
      }
      const fileCoverable = fileCovered + uncovered.length;
      if (fileCoverable === 0) continue;
      covered += fileCovered;
      coverable += fileCoverable;
      local.set(f.path, { coverable: fileCoverable, uncovered });
    }
    estimate = estimateOf(covered, coverable, report.threshold, "added-lines");
    const reported = new Map(report.files.map((f) => [f.path, f]));
    coverableMismatch = [];
    regressed = [];
    for (const p of [...new Set([...reported.keys(), ...local.keys()])].sort()) {
      const r = reported.get(p);
      const l = local.get(p);
      const reportCount = r?.coverableLines ?? null;
      const localCount = l?.coverable ?? 0;
      if (r === undefined || reportCount !== localCount) {
        coverableMismatch.push({ path: p, report: r === undefined ? 0 : reportCount, local: localCount });
        continue;
      }
      const listed = new Set(r.lines);
      for (const line of l?.uncovered ?? []) if (!listed.has(line)) regressed.push({ path: p, line });
    }
    regressed = groupByPath(regressed);
  }

  return {
    coverage: {
      paths: coveragePaths.size,
      unmatchedPaths: unmatched.length,
      ...(unmatched.length > 0 ? { unmatchedExample: printableName(unmatched[0]) } : {}),
      linesSkipped: skipped,
    },
    lines: {
      checked: nowCovered.length + stillUncovered.length + notInCoverage.length,
      nowCovered: groupByPath(nowCovered),
      stillUncovered: groupByPath(stillUncovered),
      notInCoverage: groupByPath(notInCoverage),
      notAdded,
      regressed,
    },
    coverableMismatch,
    estimate,
  };
}

// --- git ----------------------------------------------------------------------------------------

function realGit(cwd, args) {
  return execFileSync("git", ["--literal-pathspecs", ...args], {
    cwd,
    encoding: "utf8",
    // GIT_OPTIONAL_LOCKS=0 stops `git status` from refreshing .git/index, so the helper writes nothing.
    env: { ...process.env, LC_ALL: "C", GIT_OPTIONAL_LOCKS: "0" },
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
    timeout: 120_000,
  });
}

/**
 * The repository root and how to tell whether a repo-relative path is a real file. When git cannot run,
 * the directory holding .git stands in for the root and files on disk for tracked files. Any other git
 * failure is an error, so a broken repository is never mistaken for a missing git.
 */
function locateRepo(cwd, git) {
  try {
    const repoRoot = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
    const tracked = new Set(git(repoRoot, ["ls-files", "-z"]).split("\0").filter(Boolean));
    return { repoRoot, tracked, git: true, reason: null };
  } catch (err) {
    if (!gitCannotRun(err)) {
      if (/not a git repository/i.test(String(err?.stderr ?? ""))) throw new UsageError("not inside a git repository");
      throw new UsageError(`git failed: ${gitMessage(err)}`);
    }
    const repoRoot = findGitRoot(cwd);
    if (repoRoot === null) throw new UsageError("not inside a git repository");
    const onDisk = { has: (rel) => existsSync(path.join(repoRoot, rel)) };
    return { repoRoot, tracked: onDisk, git: false, reason: gitMessage(err) };
  }
}

function runGit(git, repoRoot, args, what) {
  try {
    return git(repoRoot, args);
  } catch (err) {
    throw new UsageError(`${what}: ${gitMessage(err)}`);
  }
}

/**
 * The commit for `ref`. An origin/ ref or a full SHA is used as given. Any other ref is tried as given and
 * as origin/<ref>: when both exist at different commits, the one ahead wins (as given if they diverged),
 * with a note naming both commits. A ref found neither way is an error.
 */
function resolveBase(git, repoRoot, ref) {
  const commitOf = (candidate) => {
    try {
      return git(repoRoot, ["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`]).trim();
    } catch (err) {
      if (gitCannotRun(err)) throw new UsageError(`git failed: ${gitMessage(err)}`);
      return null;
    }
  };
  const local = commitOf(ref);
  const remoteRef = `origin/${ref}`;
  const remote = ref.startsWith("origin/") || /^[0-9a-f]{40}$/i.test(ref) ? null : commitOf(remoteRef);
  if (local === null && remote === null) {
    throw new UsageError(`base ${ref} was not found in this checkout; fetch it, or pass the ref the CI run diffed against`);
  }
  if (remote === null) return { ref, sha: local, note: null };
  if (local === null) return { ref: remoteRef, sha: remote, note: null };
  if (local === remote) return { ref, sha: local, note: null };
  let mergeBase = null;
  try {
    mergeBase = git(repoRoot, ["merge-base", local, remote]).trim();
  } catch (err) {
    if (gitCannotRun(err)) throw new UsageError(`git failed: ${gitMessage(err)}`);
  }
  // The note is a fixed sentence plus the two SHAs git printed: the --base value can be a revision expression
  // carrying any text, so neither it nor a ref name built from it goes into the note.
  const l = local.slice(0, 12);
  const r = remote.slice(0, 12);
  const used = "base.ref and base.sha name the one used";
  const fetchHint = "if neither is the base CI used, fetch it and run again";
  if (mergeBase === local) {
    return { ref: remoteRef, sha: remote, note: `--base: the local base branch (${l}) is behind origin's (${r}), so origin's was used; ${used}; ${fetchHint}` };
  }
  if (mergeBase === remote) {
    return { ref, sha: local, note: `--base: origin's base branch (${r}) is behind the local one (${l}), so the local one was used; ${used}; ${fetchHint}` };
  }
  return { ref, sha: local, note: `--base: the local base branch (${l}) and origin's (${r}) have diverged, so the local one was used as given; ${used}; pass the ref the CI run diffed against` };
}

function diffAgainst(git, repoRoot, sha) {
  try {
    return parseUnifiedDiff(
      git(repoRoot, ["diff", "--unified=0", "--no-color", "--no-ext-diff", "--find-renames", "--src-prefix=a/", "--dst-prefix=b/", "--end-of-options", `${sha}...HEAD`]),
    );
  } catch (err) {
    const msg = gitMessage(err);
    if (/no merge base/i.test(msg)) throw new UsageError(`no merge base between ${sha} and HEAD; is this a shallow clone? fetch more history`);
    throw new UsageError(`git diff failed: ${msg}`);
  }
}

/** Paths among `paths` that the base changed since the merge base (HEAD...base). */
function baseChangedPaths(git, repoRoot, sha, paths) {
  if (paths.length === 0) return [];
  const out = runGit(git, repoRoot, ["diff", "--name-only", "-z", "--no-renames", "--end-of-options", `HEAD...${sha}`, "--", ...paths], "git diff failed");
  return out.split("\0").filter(Boolean);
}

/** Paths in `git status --porcelain=v1 -z` output; rename and copy records carry their original path too. */
export function parseStatusZ(out) {
  const parts = out.split("\0");
  const paths = new Set();
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    paths.add(entry.slice(3));
    if (/[RC]/.test(entry.slice(0, 2)) && parts[i + 1]) paths.add(parts[++i]);
  }
  return [...paths].sort();
}

const NO_GIT_NOTE =
  "git could not run here, so coverage paths were matched against files on disk under the directory holding .git instead of tracked files, and sourcesChanged was not checked";

export function run(argv, { cwd = process.cwd(), git = realGit } = {}) {
  const opts = parseCli(argv);
  if (opts.help) return { help: USAGE };
  const repo = locateRepo(cwd, git);
  const { repoRoot, tracked } = repo;
  const report = readReport(readRegularFile(path.resolve(cwd, opts.report), MAX_REPORT_BYTES, `report ${opts.report}`));
  // A report path that is not a tracked file is never printed or handed to git.
  const trackedFiles = report.files.filter((f) => tracked.has(f.path));
  report.invalidPaths += report.files.length - trackedFiles.length;
  report.files = trackedFiles;
  const coverageFiles = opts.coverage.map((p) => {
    const text = readRegularFile(path.resolve(cwd, p), MAX_COVERAGE_BYTES, `coverage file ${p}`);
    const format = opts.format === "auto" ? detectCoverageFormat(text) : opts.format;
    if (format === "empty") throw new UsageError(`${p} is empty (pharn-ci reports COVERAGE_FILE_EMPTY)`);
    if (format === "unknown") {
      throw new UsageError(`${p} is neither lcov nor Cobertura XML as pharn-ci detects them (COVERAGE_FORMAT_UNSUPPORTED); pass --format if it is`);
    }
    return { file: p, format, parsed: parseCoverage(text, format, { repoRoot, coverageRoot: opts.coverageRoot }) };
  });

  const notes = [];
  if (!repo.git) notes.push(`${NO_GIT_NOTE} (${repo.reason})`);
  if (report.invalidPaths > 0) notes.push("some report paths are not tracked files and were left out (invalidPaths counts them)");

  let base = null;
  let diff = null;
  if (opts.base !== null && repo.git) {
    const resolved = resolveBase(git, repoRoot, opts.base);
    if (resolved.note !== null) notes.push(resolved.note);
    diff = diffAgainst(git, repoRoot, resolved.sha);
    const renamedFrom = new Map(diff.filter((f) => f.status === "renamed").map((f) => [f.path, f.oldPath]));
    const reportPaths = report.files.map((f) => f.path);
    const asked = [...new Set([...reportPaths, ...reportPaths.map((p) => renamedFrom.get(p)).filter((p) => p !== undefined && isSafeRepoPath(p))])];
    const changed = new Set(baseChangedPaths(git, repoRoot, resolved.sha, asked));
    const changedFiles = reportPaths.filter((p) => changed.has(p) || changed.has(renamedFrom.get(p) ?? ""));
    base = { ref: resolved.ref, sha: resolved.sha, changedFiles };
    if (changedFiles.length > 0) {
      notes.push(
        "the base branch changed listed files since the merge base (base.changedFiles); on pull_request CI measured the merge commit, so its line numbers for those files can differ from this checkout",
      );
    }
  } else if (opts.base !== null) {
    base = { ref: opts.base, sha: null, changedFiles: null };
    notes.push("--base was not checked because git could not run; notAdded, regressed and base.changedFiles are null");
  } else {
    notes.push("without --base the estimate assumes every line the report counted as covered is still covered");
  }

  const result = compare(report, coverageFiles, { tracked, diff });
  const listed = report.files.map((f) => f.path);
  const sourcesChanged = !repo.git
    ? null
    : listed.length === 0
      ? []
      : parseStatusZ(runGit(git, repoRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=no", "--", ...listed], "git status failed"));
  return {
    schemaVersion: 1,
    report: {
      tool: report.tool,
      verdict: report.verdict,
      percent: report.percent,
      threshold: report.threshold,
      coveredLines: report.coveredLines,
      coverableLines: report.coverableLines,
    },
    coverage: { files: coverageFiles.map((c) => ({ path: c.file, format: c.format })), ...result.coverage },
    lines: result.lines,
    base,
    coverableMismatch: result.coverableMismatch,
    sourcesChanged,
    invalidPaths: report.invalidPaths,
    estimate: result.estimate,
    git: repo.git,
    notes,
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
    console.error(`check-lines: ${err instanceof UsageError ? err.message : (err?.stack ?? String(err))}`);
    process.exit(2);
  }
}
