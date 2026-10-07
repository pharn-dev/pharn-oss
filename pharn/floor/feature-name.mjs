#!/usr/bin/env node
// pharn/floor/feature-name.mjs — the gate a feature name passes BEFORE any shell line carries it (6.30.0,
// shell-sink-validation). This header is the module's spec (no separate contract, P7 — the run-marker.mjs precedent).
//
// ================================ THE RECORDED FAILURE (P7 — reproduced, not a hypothetical) ================================
// Every product command threads a feature `<name>` into many pinned shell lines (166 of them at 6.28.2). Where the model
// DERIVES that name from the user's description — `/pharn-spec` Step 0 (and so `/pharn-ship`), `/pharn-loop` S1 — the only
// check ran INSIDE a node process, after the shell had already parsed the line carrying the candidate:
//   • `/pharn-loop` S1's own validator, `node -e '…regex…' '<slug>'`, given `x'$(touch PWNED)'`, created PWNED and exited 0;
//   • `/pharn-spec` Step 0's first sink, its unquoted `--target pharn/features/<name>/SPEC.md`, ran `;touch${IFS}PWNED;` —
//     before GATE 1;
//   • a single-quoted `--name '<name>'` line ran `'$(touch PWNED)'` the same way.
// A value typed into a shell line cannot be validated by the program that line starts. So the candidate never touches a
// shell: the model writes it with the WRITE TOOL (a tool call, never parsed by a shell) to one fixed path, this CLI reads
// it, and prints it only when it is a member of `FEATURE_SLUG_RE` — the one slug grammar, imported from gate-run-core.mjs,
// whose alphabet (`a`–`z`, `0`–`9`, `-`, never a leading `-`) carries no shell-active character. Only that printed value
// is typed into later lines. The pinned lines that run this CLI carry NO placeholder at all.
//
// ================================ THE PROTOCOL ================================
//   1. the model writes the slug alone to `.pharn/feature-name/candidate.txt` (CANDIDATE_REL), relative to the INVOKING
//      directory — the project root, which the relative pinned line already requires;
//   2. it runs `node pharn/floor/feature-name.mjs` (or `--fresh`, /pharn-loop S1 and S2);
//   3. exit 0 prints exactly `<name>\n`; the caller uses that value, and only when it is the slug it wrote (with `--fresh`:
//      that slug, or that slug plus `-<n>`). Anything else is no name.
//
//   --fresh (the loop's S2, moved out of a shell loop): after the candidate is taken, print the first of `<slug>`,
//   `<slug>-2`, `<slug>-3`, … for which `lstat` of `pharn/features/<x>` reports ENOENT — a dangling link, a file and a
//   directory each count as TAKEN. ANY OTHER lstat error refuses at once (`unreadable`): treating it as "taken" would walk
//   towards the 64-character limit one suffix at a time (grill G-D). A suffixed name must still be a `FEATURE_SLUG_RE`
//   member, else `no-fresh-name`. A parent symlink (`pharn` or `pharn/features`) is followed, and a directory created
//   after the choice is not seen: the check holds at choice time only.
//
// ================================ READING THE CANDIDATE (L54, L59 — the link is asked, never followed) ================================
//   • `.pharn` and `.pharn/feature-name` pass stage-runtime.mjs's `containmentWalk` (no symlink component — an lstat ENOENT
//     is the only proof of absence) and the latter must be a directory; else `unsafe-path`, and nothing is read or removed.
//   • the leaf is classified by `lstat` first. A DIRECTORY is left in place (`not-a-file` — a person removes it). A symlink,
//     FIFO, socket or device is removed with `unlink` (which never follows) and refused `not-a-file`. A regular file over
//     MAX_CANDIDATE_BYTES (65 — the grammar's own 64 characters plus one `\n`, grill G-C) is removed unread and refused
//     `not-a-name`. Any other regular file is opened `O_RDONLY | O_NOFOLLOW | O_NONBLOCK`, `fstat`ed again (it must be the
//     SAME regular file the lstat saw — device and inode), read, closed, and removed.
//   • CONSUMED WHENEVER THE PARENT CHECKS PASS (grill G-A): after such a run the leaf entry is gone whatever it held, but
//     a directory (a usage refusal and an `unsafe-path` refusal remove nothing). So a stale candidate (a crash between the
//     Write and this CLI) or a planted one never survives to be read by a later run, and a Write-tool refusal of the path
//     is met by running this CLI once and ignoring its output — never by the model reading the file, or writing to
//     another path. Only ENOENT counts as absence; any other removal failure refuses `not-removed`, and a name is NEVER
//     printed from a file that could not be removed.
//   • VALIDATED ON THE BYTES, NOTHING NORMALIZED: decoded as latin1 (one character per byte, so no two byte strings decode
//     alike), at most one trailing `\n` dropped, then `FEATURE_SLUG_RE`. A CR, a space, a BOM, a NUL, a second line, an
//     upper-case letter: each is `not-a-name`.
//
// ================================ OUTPUT, EXIT CODES, REFUSALS ================================
// Exit 0: stdout is exactly `<name>\n`, stderr empty. Exit 2: stdout is EMPTY, and stderr is ONE line,
// `feature-name: refused <code> — <remedy>`, for a code in the closed REFUSALS table below. The remedy is a FIXED string
// per code, reachable for that code (L27), and the candidate's bytes are NEVER quoted (L62 — a refusal renders nothing it
// read, so a hostile value cannot make it throw or print). An unexpected throw is exit 2 `crashed`, never a name. Node's own
// exit 1 (this entry file not found — a run from outside the project root) prints no refusal line: every caller treats any
// exit but 0 as no name.
//
// ================================ BOUNDS (P0), each stated where a reader meets it ================================
//   • ONE CANDIDATE FILE PER TREE — the scope record's shape (L38). Two sessions naming features at once in one tree can
//     read each other's candidate; each value read is still a valid slug, and the caller's compare-with-what-it-wrote step
//     (advisory) stops a mismatch. A VALID slug planted at the path can therefore misdirect a run whose own Write did not
//     land — never inject into a shell line.
//   • WALK, THEN UNLINK (grill G-F): the containment walk and the removal are two steps, so a parent swapped for a symlink
//     between them is not caught — the same walk-then-write gap the stage scripts name for themselves. An accounting guard
//     against mistakes and stale state, not a race-proof one.
//   • THE WRITE HAPPENS BEFORE THIS CLI RUNS. Measured on 2026-09-27, not guaranteed by anything here: the Write tool
//     REFUSES a symlink at the path, dangling or not, and an existing file it has not read — and its link refusal names
//     the link's target as the path to write instead. Following that would write wherever a planted link points, so every
//     command that writes a candidate says: never Read it, never write to another path, run this CLI once (it removes the
//     entry), then write again. That the model obeys is advisory; that the removal happens is this module's.
//   • WHAT IS NOT CHECKED HERE: that the caller wrote the candidate with the Write tool rather than through a shell (`echo …
//     >` would re-open the hole this closes), and that it re-types only the printed value into later lines. Both are
//     command discipline — advisory. What the pins in `.dev/floor/command-hygiene.test.mjs` (SHELL-SINK) hold is that the
//     committed lines running this CLI carry no placeholder, and precede the first shell line carrying `<name>`.
//
// TRUST (P2): the candidate is untrusted model output derived from untrusted text. Nothing read is evaluated, echoed or
// interpolated: it is classified, and printed only as a member of a closed regular language.
//
// LOAD GRAPH: node builtins, gate-run-core.mjs (FEATURE_SLUG_RE — the one owner, L35: no fourth copy of the grammar) and
// stage-runtime.mjs (`containmentWalk`, `lstatSafe`). It spawns nothing.
//
// Exports: CANDIDATE_REL, MAX_CANDIDATE_BYTES, REFUSALS, refusalLine(code), takeName({ root, fresh }) → { ok: true, name }
// | { ok: false, code }, cliResult(args, root) → { exitCode, stdout, stderr }. `root` has NO default (L41).
// CLI: node pharn/floor/feature-name.mjs [--fresh]

import "./runtime-floor.mjs";
import { closeSync, constants, fstatSync, openSync, readSync, unlinkSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { containmentWalk, lstatSafe } from "./stage-runtime.mjs";

/** The one path a caller writes the candidate to, relative to the invoking directory. */
export const CANDIDATE_REL = ".pharn/feature-name/candidate.txt";

/** A candidate longer than this cannot be a name: FEATURE_SLUG_RE allows 64 characters, plus one trailing `\n`. */
export const MAX_CANDIDATE_BYTES = 65;

/** The closed refusal set. Each remedy is a fixed string, true for every way its code can arise (L27). */
export const REFUSALS = Object.freeze({
  "usage-error": "usage: node pharn/floor/feature-name.mjs [--fresh] — it takes no other argument; nothing was read or removed",
  "no-candidate": "write the slug alone to .pharn/feature-name/candidate.txt with the Write tool, then run this line again",
  "unsafe-path": ".pharn or .pharn/feature-name is a symlink or not a directory; nothing was read or removed — a person clears that path",
  "not-a-file":
    "the candidate path held something other than a regular file; it was removed (a directory is left for a person to remove) — write the slug again with the Write tool",
  unreadable: "a path this check must read could not be read; a person checks .pharn/feature-name (or, with --fresh, pharn/features)",
  "not-removed":
    "the candidate could not be removed, so no name is printed; a person removes .pharn/feature-name/candidate.txt, then the slug is written again",
  "not-a-name":
    "the candidate is not a feature slug (a-z, 0-9 and -, not starting with -, at most 64 characters, at most one trailing newline); it was removed — write one that is",
  "no-fresh-name": "every suffix of this slug up to 64 characters is taken under pharn/features/; choose a shorter or a different slug",
  crashed: "an unexpected failure inside the check; no name was printed — treat it as no name",
});

/** The one stderr line a refusal prints. Never carries a byte the CLI read. */
export function refusalLine(code) {
  return `feature-name: refused ${code} — ${REFUSALS[code]}\n`;
}

const refuse = (code) => ({ ok: false, code });

/** Remove the leaf entry. `unlink` never follows a link. Only ENOENT counts as absence. */
function removeLeaf(abs) {
  try {
    unlinkSync(abs);
    return true;
  } catch (e) {
    return Boolean(e && e.code === "ENOENT");
  }
}

/** Read a regular file the lstat already classified, refusing a swap (L59). Returns { ok, bytes } or { ok: false, code }. */
function readRegular(abs, seen) {
  let fd;
  try {
    fd = openSync(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  } catch {
    return refuse("unreadable");
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.dev !== seen.dev || st.ino !== seen.ino) return refuse("not-a-file");
    const buf = Buffer.alloc(MAX_CANDIDATE_BYTES + 1);
    let got = 0;
    for (;;) {
      const n = readSync(fd, buf, got, buf.length - got, null);
      if (n === 0) break;
      got += n;
      if (got === buf.length) break;
    }
    return { ok: true, bytes: buf.subarray(0, got) };
  } catch {
    return refuse("unreadable");
  } finally {
    try {
      closeSync(fd);
    } catch {
      // closing a descriptor we opened cannot change the verdict
    }
  }
}

/** The candidate's bytes as a name, or null. latin1 maps each byte to one character, so nothing is normalized. */
function asName(bytes) {
  if (bytes.length > MAX_CANDIDATE_BYTES) return null;
  const text = bytes.toString("latin1");
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  return FEATURE_SLUG_RE.test(body) ? body : null;
}

/** Read, consume and validate the candidate under `root`; with `fresh`, pick the first absent feature directory. */
export function takeName({ root, fresh = false } = {}) {
  if (typeof root !== "string" || !isAbsolute(root) || typeof fresh !== "boolean") return refuse("usage-error");
  const dirAbs = join(root, ".pharn", "feature-name");
  if (!containmentWalk(root, dirAbs).ok) return refuse("unsafe-path");
  const dir = lstatSafe(dirAbs);
  if (!dir.ok) return refuse("unreadable");
  if (dir.stat === null) return refuse("no-candidate");
  if (!dir.stat.isDirectory()) return refuse("unsafe-path");

  const leafAbs = join(dirAbs, "candidate.txt");
  const leaf = lstatSafe(leafAbs);
  if (!leaf.ok) return refuse("unreadable");
  if (leaf.stat === null) return refuse("no-candidate");
  if (leaf.stat.isDirectory()) return refuse("not-a-file");
  if (!leaf.stat.isFile()) return removeLeaf(leafAbs) ? refuse("not-a-file") : refuse("not-removed");

  let read = { ok: true, bytes: null };
  if (leaf.stat.size <= MAX_CANDIDATE_BYTES) read = readRegular(leafAbs, leaf.stat);
  if (!removeLeaf(leafAbs)) return refuse("not-removed");
  if (!read.ok) return read;
  const name = read.bytes === null ? null : asName(read.bytes);
  if (name === null) return refuse("not-a-name");
  if (!fresh) return { ok: true, name };

  const featuresAbs = join(root, "pharn", "features");
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? name : `${name}-${n}`;
    if (!FEATURE_SLUG_RE.test(candidate)) return refuse("no-fresh-name");
    const st = lstatSafe(join(featuresAbs, candidate));
    if (!st.ok) return refuse("unreadable");
    if (st.stat === null) return { ok: true, name: candidate };
  }
}

/** The CLI's whole behaviour for one argv and root: { exitCode, stdout, stderr }. `take` is replaceable only by a test. */
export function cliResult(args, root, take = takeName) {
  if (!Array.isArray(args) || args.length > 1 || (args.length === 1 && args[0] !== "--fresh")) {
    return { exitCode: 2, stdout: "", stderr: refusalLine("usage-error") };
  }
  let result;
  try {
    result = take({ root, fresh: args.length === 1 });
  } catch {
    result = refuse("crashed");
  }
  const ok =
    result !== null &&
    typeof result === "object" &&
    result.ok === true &&
    typeof result.name === "string" &&
    FEATURE_SLUG_RE.test(result.name);
  if (ok) return { exitCode: 0, stdout: `${result.name}\n`, stderr: "" };
  const code = result !== null && typeof result === "object" && Object.hasOwn(REFUSALS, result.code) ? result.code : "crashed";
  return { exitCode: 2, stdout: "", stderr: refusalLine(code) };
}

if (import.meta.main) {
  let out;
  try {
    out = cliResult(process.argv.slice(2), process.cwd());
  } catch {
    out = { exitCode: 2, stdout: "", stderr: refusalLine("crashed") };
  }
  if (out.stdout) process.stdout.write(out.stdout);
  if (out.stderr) process.stderr.write(out.stderr);
  process.exitCode = out.exitCode;
}
