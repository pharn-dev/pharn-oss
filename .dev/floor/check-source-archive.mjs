#!/usr/bin/env node
// .dev/floor/check-source-archive.mjs — does pharn-cli unpack this commit's source archive? (build apparatus, CORE-383)
//
// WHY IT EXISTS (the trigger, P7). v7.25.3, v7.25.4 and v7.25.5 were tagged by release.yml and every `pharn init` /
// `pharn update` against them failed: pharn-cli refuses the WHOLE codeload tarball on its first non-file entry, and
// pharn-oss had committed 7 git symlinks (mode 120000) under `.claude/skills/`. Those PRs touched apparatus paths only,
// so check:surface-bump and the install-manifest generator had no reason to look, and nothing in pharn-oss unpacked the
// archive the way the CLI does. This checker does, in CI's `check` job, which release.yml waits for before it tags.
//
// WHAT IT DOES. It builds the archive with `git archive --format=tar --prefix=pharn-oss-<full sha>/ <sha>` and walks the
// tar with the rules of pharn-cli's extractor. Two models live here, and each changes for its own reason:
//   1. HOW CODELOAD BUILDS THE ARCHIVE (archiveTar): GitHub's `codeload.github.com/<repo>/tar.gz/<sha>` is modelled as
//      git archive's tar with a `<repo>-<sha>/` root — the longest root the CLI meets, and the one a release tag resolves
//      to. git archive honours `export-ignore` from the archived tree's `.gitattributes`, as codeload does, opens with a
//      pax global header (`g`, the commit id), and writes a pax extended header (`x`) when a path does not fit ustar's
//      100-byte name + 155-byte prefix. A model: GitHub does not publish codeload's implementation.
//   2. HOW PHARN-CLI JUDGES IT (checkArchive): a hand port of `src/lib/tar-extract.ts` (`extractTar`, every
//      `throw new TarExtractError`, its constants and type checks) and of the limits in `src/lib/repo.ts`, both at
//      pharn-cli main 51a96d29. Each rule below names the CLI check it mirrors. Where the CLI throws on the FIRST refusal,
//      this records one finding per offending entry (the rule the CLI would throw on for it) and goes on, so a failure
//      names every entry; a framing failure (checksum, magic, a non-octal field, truncation) stops the walk, because
//      nothing after it can be located.
//
// THE GUARANTEE (P0, ARCHITECTURE §2 primitive #3 — enum/regex): for the bytes `git archive` writes at the ref, every
// header is judged by type-flag set membership, path regexes and integer compares. ZERO LLM. Exit 0 GREEN, 1 RED (one
// line per finding: rule, entry, detail), 2 unusable input (not a git repo, an unresolvable ref, a failed git archive).
//
// WHAT IT DOES NOT GUARANTEE (P0 — the bounds, stated so this is not read as more):
//   - NOT the CLI. It mirrors the CLI's rules and drifts if the CLI changes them; CORE-384 (later) runs the real CLI in
//     CI. Bounds known so far, never a complete list (L67): the unsafe-character class `\p{Cf}` follows the Unicode
//     version of the Node running it, so CI's Node and a user's CLI runtime can disagree on a newly assigned format
//     character; the CLI's `safeJoin` backstop is not modelled (its segment rules, which are, refuse first).
//   - The WHOLE archive is judged, on purpose. pharn-cli CORE-386 narrows the CLI to unpack only manifest-listed paths,
//     but MIN_CLI (0.14.0) still admits CLIs that judge every entry, so every entry binds while those CLIs are admitted.
//   - The compressed size is Node's `gzipSync` (zlib's default level) over the tar, not codeload's compressor, so that
//     one number estimates codeload's; the extracted size (the tar's length) and the entry count are exact for the bytes
//     git archive writes.
//   - It judges the COMMITTED tree at the ref (`HEAD` by default), never the working tree: an uncommitted symlink is not
//     seen until committed. On a pull request CI's HEAD is GitHub's test merge commit.
//   - It protects the release channel only. A merge reaches pharn-cli's `main` channel before its checks finish, and an
//     owner bypass merge skips them (pharn/LIMITS.md §11).
//   - That CI runs it: check-source-archive.test.mjs pins the package.json and ci.yml wiring; that GitHub runs the job and
//     that it stays a check release.yml waits for are harness-layer facts.
//   - The rest of the CLI's install contract (SKILLS_VERSION matching the tag, the install manifest's hashes) is other
//     checkers' (check-install-manifest.mjs) or the CLI's own; this is the archive's shape only.
//
// Usage: node .dev/floor/check-source-archive.mjs [--ref <rev>] [repo-dir]      (defaults: HEAD, .)

import "../../pharn/floor/runtime-floor.mjs";
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

/**
 * pharn-cli's limits (src/lib/repo.ts at 51a96d29): MAX_ENTRIES, MAX_EXTRACTED_BYTES (gunzip's maxOutputLength — the
 * decompressed tar), MAX_ARCHIVE_BYTES (fetchCapped's maxBytes — the compressed download). The CLI refuses only ABOVE
 * each: `entries > maxEntries`, gunzip output over maxOutputLength, a body of more than maxBytes. The ONE copy (L41).
 */
export const CLI_LIMITS = Object.freeze({
  maxEntries: 20_000,
  maxTotalBytes: 128 * 1024 * 1024,
  maxArchiveBytes: 32 * 1024 * 1024,
});

/** The archive root codeload gives a `tar.gz/<sha>` download of pharn-oss. */
export const ROOT_PREFIX = "pharn-oss-";

/**
 * The closed rule set, each with the pharn-cli check it mirrors. EMPTY_ARCHIVE is this checker's own (L34): the CLI's
 * walk accepts a tar with no entries, and only its later manifest check refuses it; a vacuous GREEN is never given here.
 */
export const RULES = Object.freeze({
  TOO_LARGE_COMPRESSED: "fetchCapped: archive exceeds MAX_ARCHIVE_BYTES (repo.ts)",
  TOO_LARGE_EXTRACTED: "gunzipSync maxOutputLength: could not decompress the fetched archive",
  TOO_MANY_ENTRIES: "tar archive has more than maxEntries entries",
  BAD_CHECKSUM: "tar header failed its checksum",
  BAD_MAGIC: 'tar header is not a ustar header (missing "ustar" magic)',
  NON_OCTAL: "tar header has a non-octal numeric field",
  TRUNCATED: "tar entry runs past the end of the archive",
  NO_END_MARKER: "tar archive has no end-of-archive marker",
  DATA_AFTER_END: "tar archive has data after its end-of-archive marker",
  INVALID_UTF8: "tar entry path is not valid UTF-8",
  UNSAFE_CHAR: "tar entry path contains a control or format character",
  PAX_EXTENDED_HEADER: "tar entry has an unsupported type 'x' (a pax extended header)",
  UNSUPPORTED_TYPE: "tar entry has an unsupported type",
  EMPTY_PATH: "tar entry has an empty path",
  ABSOLUTE_PATH: "tar entry has an absolute path",
  BACKSLASH_OR_COLON: "tar entry path contains a backslash or colon",
  DOTDOT: "tar entry escapes the archive root",
  NO_ROOT: "tar entry has no leading component",
  SECOND_ROOT: "tar archive has more than one root component",
  EMPTY_SEGMENT: 'tar entry has an empty or "." path segment',
  NOTHING_BELOW_ROOT: "tar entry has no path below the archive root",
  EMPTY_ARCHIVE: "(this checker) the archive holds no entry",
});

// ── Ported from pharn-cli src/lib/tar-extract.ts and src/lib/terminal-safe.ts (51a96d29) ──────────────────────────────

const BLOCK = 512;
const OFF_NAME = 0;
const LEN_NAME = 100;
const OFF_SIZE = 124;
const LEN_SIZE = 12;
const OFF_CHKSUM = 148;
const LEN_CHKSUM = 8;
const OFF_TYPEFLAG = 156;
const OFF_MAGIC = 257;
const OFF_PREFIX = 345;
const LEN_PREFIX = 155;

// THE unsafe-character set: C0, DEL and C1 controls, U+2028/U+2029, and every Unicode format character (\p{Cf}).
const UNSAFE_RANGES = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x2028, 0x2029],
];
const codePoint = (cp) => `\\u{${cp.toString(16)}}`;
const UNSAFE_CLASS = `[${UNSAFE_RANGES.map(([lo, hi]) => `${codePoint(lo)}-${codePoint(hi)}`).join("")}\\p{Cf}]`;
const UNSAFE_RE = new RegExp(UNSAFE_CLASS, "gu");
const UNSAFE_TEST_RE = new RegExp(UNSAFE_CLASS, "u");

/** True when `value` holds any character of the unsafe set (terminal-safe.ts hasUnsafeChars). */
export function hasUnsafeChars(value) {
  return UNSAFE_TEST_RE.test(value);
}

/** Each UTF-16 unit of each unsafe character as `\uXXXX` (terminal-safe.ts escapeUnsafe). Total over strings. */
export function escapeUnsafe(text) {
  return String(text).replace(UNSAFE_RE, (ch) =>
    [...Array(ch.length).keys()].map((i) => `\\u${ch.charCodeAt(i).toString(16).padStart(4, "0")}`).join("")
  );
}

/** Header bytes for a message only: printable ASCII kept (not `\`), every other byte `\xNN`, capped. Total (L62). */
export function describeBytes(bytes, max = 200) {
  let out = "";
  for (const byte of bytes.subarray(0, max)) {
    out += byte >= 0x20 && byte <= 0x7e && byte !== 0x5c ? String.fromCharCode(byte) : `\\x${byte.toString(16).padStart(2, "0")}`;
  }
  return bytes.length > max ? `${out}…` : out;
}

/** A path for a finding: escaped (never raw to a terminal) and capped at 200 characters, as the CLI's messages are. */
function shownPath(path) {
  return escapeUnsafe(path.length > 200 ? `${path.slice(0, 200)}…` : path);
}

/** The bytes of a NUL-terminated (or field-filling) header field. */
function fieldBytes(block, offset, length) {
  const raw = block.subarray(offset, offset + length);
  const end = raw.indexOf(0);
  return raw.subarray(0, end === -1 ? raw.length : end);
}

// fatal: invalid UTF-8 is a refusal; ignoreBOM: a leading U+FEFF stays, so the format-character rule sees it.
const PATH_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/** A path field as strict UTF-8, or null when it is not valid UTF-8 (readPathField). */
function decodePath(bytes) {
  try {
    return PATH_DECODER.decode(bytes);
  } catch {
    return null;
  }
}

/** A ustar numeric field: octal digits, ASCII-space trimmed; '' reads 0; null when not octal (readOctal's throw). */
function readOctal(block, offset, length) {
  const text = fieldBytes(block, offset, length)
    .toString("latin1")
    .replace(/^ +| +$/g, "");
  if (text === "") return 0;
  if (!/^[0-7]+$/.test(text)) return null;
  return parseInt(text, 8);
}

/** The checksum over the header with its own field read as spaces; signed and unsigned sums both accepted. */
function checksumOk(block, stored) {
  let unsigned = 0;
  let signed = 0;
  for (let i = 0; i < BLOCK; i += 1) {
    const byte = i >= OFF_CHKSUM && i < OFF_CHKSUM + LEN_CHKSUM ? 0x20 : block[i];
    unsigned += byte;
    signed += byte > 127 ? byte - 256 : byte;
  }
  return stored === unsigned || stored === signed;
}

const isZeroBlock = (block) => block.every((b) => b === 0);

/** Plain names for the type flags the CLI refuses, for a message only. */
const TYPE_NAMES = Object.freeze({
  1: "hard link",
  2: "symbolic link",
  3: "character device",
  4: "block device",
  6: "fifo",
  7: "contiguous file",
  L: "GNU long name",
  K: "GNU long link name",
});

/** A typeflag for a message: the character if printable, else its code (describeTypeflag). */
function describeTypeflag(typeflag) {
  return hasUnsafeChars(typeflag) ? `0x${typeflag.charCodeAt(0).toString(16).padStart(2, "0")}` : `'${typeflag}'`;
}

/**
 * The path rules for an accepted entry (resolveEntryPath): `{ rule, detail }` on a refusal, else `{ rel, root }` with
 * `rel` null for the archive's own root directory.
 */
function resolveEntryPath(fullPath, isDirectory, expectedRoot) {
  if (fullPath === "") return { rule: "EMPTY_PATH" };
  if (fullPath.startsWith("/")) return { rule: "ABSOLUTE_PATH" };
  if (/[\\:]/.test(fullPath)) return { rule: "BACKSLASH_OR_COLON" };
  const segments = fullPath.replace(/\/+$/, "").split("/");
  if (segments.includes("..")) return { rule: "DOTDOT" };
  const root = segments[0];
  if (root === "" || root === ".") return { rule: "NO_ROOT" };
  if (expectedRoot !== null && root !== expectedRoot) {
    return { rule: "SECOND_ROOT", detail: `${shownPath(expectedRoot)} and ${shownPath(root)}` };
  }
  const rest = segments.slice(1);
  if (rest.some((s) => s === "" || s === ".")) return { rule: "EMPTY_SEGMENT" };
  if (rest.length === 0) return isDirectory ? { rel: null, root } : { rule: "NOTHING_BELOW_ROOT" };
  return { rel: rest.join("/"), root };
}

/** The `path` record of a pax extended header's payload, or null. Display only — never a rule input. */
function paxPath(payload) {
  let at = 0;
  while (at < payload.length) {
    const space = payload.indexOf(0x20, at);
    if (space === -1) return null;
    const len = Number(payload.toString("latin1", at, space));
    if (!Number.isInteger(len) || len <= space - at || at + len > payload.length) return null;
    const record = payload.subarray(space + 1, at + len - 1); // drop the trailing "\n"
    const eq = record.indexOf(0x3d);
    if (eq !== -1 && record.toString("latin1", 0, eq) === "path") return decodePath(record.subarray(eq + 1));
    at += len;
  }
  return null;
}

/**
 * Judge an uncompressed tar the way pharn-cli's extractor does. Pure: no I/O, no exit.
 * @param {Buffer} tar
 * @param {{maxEntries:number,maxTotalBytes:number,maxArchiveBytes:number}} [limits] — pharn-cli's by default
 * @returns {{ok:boolean, entries:number, tarBytes:number, gzipBytes:number, findings:{rule:string,entry:string,detail:string}[]}}
 */
export function checkArchive(tar, limits = CLI_LIMITS) {
  const findings = [];
  const add = (rule, entry, detail = "") => findings.push({ rule, entry, detail });
  const gzipBytes = gzipSync(tar).length;
  if (gzipBytes > limits.maxArchiveBytes) {
    add("TOO_LARGE_COMPRESSED", "(archive)", `${gzipBytes} B gzipped (Node's gzip) > ${limits.maxArchiveBytes} B`);
  }
  if (tar.length > limits.maxTotalBytes) {
    add("TOO_LARGE_EXTRACTED", "(archive)", `${tar.length} B uncompressed > ${limits.maxTotalBytes} B`);
  }

  let offset = 0;
  let entries = 0;
  let expectedRoot = null;
  let ended = false;
  let stopped = false;
  let paxNext = null; // the `path` a preceding `x` header carried for the next entry, if any

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    const at = `(header at byte ${offset})`;
    if (isZeroBlock(header)) {
      if (tar.subarray(offset + BLOCK).some((b) => b !== 0)) add("DATA_AFTER_END", "(archive)", `after byte ${offset + BLOCK}`);
      ended = true;
      break;
    }
    const stored = readOctal(header, OFF_CHKSUM, LEN_CHKSUM);
    if (stored === null) {
      add("NON_OCTAL", at, `checksum field "${describeBytes(fieldBytes(header, OFF_CHKSUM, LEN_CHKSUM), 32)}"`);
      stopped = true;
      break;
    }
    if (!checksumOk(header, stored)) {
      add("BAD_CHECKSUM", at);
      stopped = true;
      break;
    }
    if (header.toString("latin1", OFF_MAGIC, OFF_MAGIC + 5) !== "ustar") {
      add("BAD_MAGIC", at);
      stopped = true;
      break;
    }
    const size = readOctal(header, OFF_SIZE, LEN_SIZE);
    if (size === null) {
      add("NON_OCTAL", at, `size field "${describeBytes(fieldBytes(header, OFF_SIZE, LEN_SIZE), 32)}"`);
      stopped = true;
      break;
    }
    const dataStart = offset + BLOCK;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) {
      add("TRUNCATED", at);
      stopped = true;
      break;
    }
    const next = dataStart + Math.ceil(size / BLOCK) * BLOCK;
    const typeflag = String.fromCharCode(header[OFF_TYPEFLAG]);
    offset = next;

    // SKIP — a pax GLOBAL header, payload unread; it counts toward the cap.
    if (typeflag === "g") {
      entries += 1;
      continue;
    }

    const nameBytes = fieldBytes(header, OFF_NAME, LEN_NAME);
    const prefixBytes = fieldBytes(header, OFF_PREFIX, LEN_PREFIX);
    const name = decodePath(nameBytes);
    const prefix = decodePath(prefixBytes);
    const carried = paxNext;
    paxNext = null;
    if (name === null || prefix === null) {
      entries += 1;
      const raw = prefixBytes.length ? Buffer.concat([prefixBytes, Buffer.from("/"), nameBytes]) : nameBytes;
      add("INVALID_UTF8", describeBytes(raw));
      continue;
    }
    const fullPath = prefix === "" ? name : `${prefix}/${name}`;
    const shown = carried !== null ? shownPath(carried) : shownPath(fullPath);

    if (typeflag === "x") {
      // The CLI refuses `x` on its type flag. The entry it describes is named by its `path` record, for display only;
      // that following entry is then judged for its type but not by the path rules, which the CLI never reaches.
      const real = paxPath(tar.subarray(dataStart, dataEnd));
      paxNext = real;
      add(
        "PAX_EXTENDED_HEADER",
        real !== null ? shownPath(real) : shown,
        real !== null ? "the path does not fit ustar's 100-byte name + 155-byte prefix" : "a pax extended header with no path record"
      );
      continue;
    }

    if (hasUnsafeChars(fullPath)) {
      entries += 1;
      add("UNSAFE_CHAR", shown);
      continue;
    }
    const isFile = typeflag === "0" || typeflag === "\0";
    const isDirectory = typeflag === "5";
    if (!isFile && !isDirectory) {
      entries += 1;
      add("UNSUPPORTED_TYPE", shown, `type ${describeTypeflag(typeflag)}${TYPE_NAMES[typeflag] ? ` (${TYPE_NAMES[typeflag]})` : ""}`);
      continue;
    }
    if (carried !== null) {
      entries += 1;
      continue;
    }
    const res = resolveEntryPath(fullPath, isDirectory, expectedRoot);
    if (res.rule) {
      entries += 1;
      add(res.rule, shown, res.detail ?? "");
      continue;
    }
    expectedRoot = res.root;
    if (res.rel !== null) entries += 1;
  }

  if (!ended && !stopped) add("NO_END_MARKER", "(archive)");
  if (entries > limits.maxEntries) add("TOO_MANY_ENTRIES", "(archive)", `${entries} entries > ${limits.maxEntries}`);
  if (ended && entries === 0) add("EMPTY_ARCHIVE", "(archive)");
  return { ok: findings.length === 0, entries, tarBytes: tar.length, gzipBytes, findings };
}

// ── The codeload model ───────────────────────────────────────────────────────────────────────────────────────────────

/** git archive's output can be the CLI's 128 MiB cap and more; it must reach the judge, not die in the buffer. */
const GIT_MAX_BUFFER = 1024 * 1024 * 1024;

/**
 * The tar codeload would serve for `ref`: the commit id, then `git archive` at that id under a `pharn-oss-<sha>/` root.
 * Throws on any git failure (the CLI maps it to exit 2).
 */
export function archiveTar(repo, ref = "HEAD") {
  if (typeof ref !== "string" || ref === "" || ref.startsWith("-")) throw new Error(`not a usable ref: ${JSON.stringify(ref)}`);
  const sha = execFileSync("git", ["-C", repo, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sha)) throw new Error(`rev-parse gave no commit id for ${JSON.stringify(ref)}`);
  const tar = execFileSync("git", ["-C", repo, "archive", "--format=tar", `--prefix=${ROOT_PREFIX}${sha}/`, sha], {
    maxBuffer: GIT_MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { sha, tar };
}

function main(argv) {
  let ref = "HEAD";
  let repo = ".";
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--ref" && i + 1 < args.length) ref = args[++i];
    else if (!args[i].startsWith("-") && repo === ".") repo = args[i];
    else {
      process.stderr.write("usage: check-source-archive.mjs [--ref <rev>] [repo-dir]\n");
      return 2;
    }
  }
  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    process.stderr.write(`check-source-archive: not a directory: ${escapeUnsafe(repo)}\n`);
    return 2;
  }
  let built;
  try {
    built = archiveTar(repo, ref);
  } catch (err) {
    const why = err && typeof err.stderr !== "undefined" ? String(err.stderr).trim() : String(err?.message ?? err);
    process.stderr.write(
      `check-source-archive: could not build git archive of ${escapeUnsafe(ref)} in ${escapeUnsafe(repo)}: ${escapeUnsafe(why)}\n`
    );
    return 2;
  }
  const res = checkArchive(built.tar);
  const what = `git archive ${escapeUnsafe(ref)} (${built.sha}) as codeload serves it`;
  if (res.ok) {
    process.stdout.write(
      `SOURCE-ARCHIVE: GREEN — ${what}: ${res.entries} entries (cap ${CLI_LIMITS.maxEntries}), tar ${res.tarBytes} B (cap ${CLI_LIMITS.maxTotalBytes}), gzip ${res.gzipBytes} B by Node's gzip (cap ${CLI_LIMITS.maxArchiveBytes}); pharn-cli 51a96d29's extractor rules accept every entry\n`
    );
    return 0;
  }
  process.stdout.write(`SOURCE-ARCHIVE: RED — ${what}: ${res.findings.length} finding(s); pharn-cli would refuse to install it\n`);
  for (const f of res.findings) process.stdout.write(`- [${f.rule}] ${f.entry}${f.detail ? ` — ${f.detail}` : ""}\n`);
  process.stdout.write(`\nEach line names an entry and the extractor rule it breaks (RULES in .dev/floor/check-source-archive.mjs).\n`);
  return 1;
}

// Run as CLI only when invoked directly. `import.meta.main`, never a `file://` + argv[1] compare (hash-doc.mjs).
if (import.meta.main) {
  process.exitCode = main(process.argv);
}
