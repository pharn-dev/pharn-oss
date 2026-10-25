// pharn/floor/canon-root.mjs — the ONE parser for the `--canon-root <dir>` option of the lessons floor CLIs.
//
// Which directory holds a project's lessons canon (`lessons-learned.md`, `pattern-library.md`). Four product CLIs
// read it — lessons-index-core.mjs's two callers (gen-lessons-index.mjs, check-lessons-index.mjs) and
// check-provenance.mjs — and the build apparatus's thin wrappers in `.dev/floor/` pass `.dev/memory-bank`. One parser
// for all of them, so the four cannot come to accept different spellings (P3: one reason to change — the option's
// grammar).
//
// THE DEFAULT is `pharn/memory-bank`, a user's own memory-bank, and every product command line runs without the flag. So
// the default IS the production path: each CLI's suite keeps a no-flag case for it (lessons-learned L41 — a default
// every hermetic test overrides is exercised by nothing).
//
// WHAT THE FLAG DOES, AND THE BOUND (P0). It changes which file these four CLIs READ (and, for check-provenance,
// which two files are members of the target enum). It does NOT relocate a project's memory-bank: every other canon
// path in the product — check-plan-lessons.mjs's argument in /pharn-plan and /pharn-grill, /pharn-memory-promote's
// target, /pharn-plan's "read canon" step — stays pinned to `pharn/memory-bank/`. Its consumers are this repo's own dev
// surface and a contributor's shell, nothing else.
//
// THE GRAMMAR (primitive #3 — regex and set membership, no filesystem access): a repo-relative POSIX path whose
// segments match SEGMENT_RE and do not start with `-`; no `.` or `..` segment; not absolute; no backslash; no control character; at most
// MAX_LEN characters. A leading `./` and trailing `/`s are normalized away, so `./pharn/memory-bank/` and `pharn/memory-bank`
// are one root. Refusal is fail-closed: the caller exits without reading anything.
//
// NOT CHECKED, and stated: the check is LEXICAL. A root that is a symlink to a directory outside the repo is
// accepted and followed when the CLI reads under it. That is a read, never a write (no CLI writes under the root),
// and the root comes from a pinned command line or the person running the CLI, never from canon or a model's
// reading of free text. Resolving links here would add a follow/no-follow decision no failure has asked for (P7).
//
// Non-LLM, stdlib-only, no I/O.

export const DEFAULT_CANON_ROOT = "pharn/memory-bank";
export const CANON_ROOT_FLAG = "--canon-root";

const MAX_LEN = 256;
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

/** A JSON spelling of any value that cannot throw (a refusal reason must not crash — L62). */
function show(v) {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(typeof v) : s;
  } catch {
    return `<${typeof v}>`;
  }
}

/**
 * Validate and normalize a canon root. Returns { ok: true, root } or { ok: false, reason }. Never throws.
 */
export function parseCanonRoot(raw) {
  if (typeof raw !== "string") return { ok: false, reason: `${CANON_ROOT_FLAG} needs a directory, got ${show(raw)}` };
  if (raw.length === 0 || raw.length > MAX_LEN) {
    return { ok: false, reason: `${CANON_ROOT_FLAG} must be 1–${MAX_LEN} characters, got ${raw.length}` };
  }
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return { ok: false, reason: `${CANON_ROOT_FLAG} contains a control character` };
  }
  if (raw.includes("\\")) return { ok: false, reason: `${CANON_ROOT_FLAG} must use "/" separators, got ${show(raw)}` };
  if (raw.startsWith("/")) return { ok: false, reason: `${CANON_ROOT_FLAG} must be repo-relative, got ${show(raw)}` };

  let s = raw;
  while (s.startsWith("./")) s = s.slice(2);
  while (s.endsWith("/")) s = s.slice(0, -1);
  if (s === "") return { ok: false, reason: `${CANON_ROOT_FLAG} names no directory, got ${show(raw)}` };

  for (const seg of s.split("/")) {
    if (seg === "" || seg === "." || seg === "..") {
      return { ok: false, reason: `${CANON_ROOT_FLAG} must not hold an empty, "." or ".." segment, got ${show(raw)}` };
    }
    // A leading "-" is refused so a following flag (`--canon-root --verdict`) is never swallowed as the root.
    if (!SEGMENT_RE.test(seg) || seg.startsWith("-")) {
      return {
        ok: false,
        reason: `${CANON_ROOT_FLAG} segments may hold only letters, digits, ".", "_" and "-" (not first), got ${show(raw)}`,
      };
    }
  }
  return { ok: true, root: s };
}

/**
 * Take `--canon-root <dir>` out of an argv list. Returns { ok: true, root, rest } — `root` is DEFAULT_CANON_ROOT
 * when the flag is absent, `rest` is argv without the flag and its value — or { ok: false, reason }. A flag with no
 * value, a repeated flag, or the `--canon-root=<dir>` spelling is a refusal: one spelling, one occurrence.
 */
export function takeCanonRoot(argv) {
  const rest = [];
  let root;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (typeof a === "string" && a.startsWith(`${CANON_ROOT_FLAG}=`)) {
      return { ok: false, reason: `write ${CANON_ROOT_FLAG} <dir> as two arguments, got ${show(a)}` };
    }
    if (a !== CANON_ROOT_FLAG) {
      rest.push(a);
      continue;
    }
    if (root !== undefined) return { ok: false, reason: `${CANON_ROOT_FLAG} given more than once` };
    if (i + 1 >= argv.length) return { ok: false, reason: `${CANON_ROOT_FLAG} needs a directory after it` };
    const parsed = parseCanonRoot(argv[i + 1]);
    if (!parsed.ok) return parsed;
    root = parsed.root;
    i++;
  }
  return { ok: true, root: root ?? DEFAULT_CANON_ROOT, rest };
}
