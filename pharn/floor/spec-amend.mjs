#!/usr/bin/env node
// pharn/floor/spec-amend.mjs — the supervisor's `amend-spec` decision, carried out (7.10.0, loop-amend-spec). The CLI
// half of `pharn/floor/spec-amend-core.mjs`, whose header holds the rules and their bounds; contract:
// `pharn/pharn-contracts/supervisor.md`, "Amend-spec (7.10.0)" (cited, not restated — P4). Run from the project root.
//
//   node pharn/floor/spec-amend.mjs status <name>
//        0 → one JSON line {schema, status}: `none` (no amend), `pending` (begun; SPEC.md's acceptance criteria still
//            equal SPEC.a1.md's) or `applied` (they differ)
//        1 → `RED — <codes>` first, then one fixed hint per code (a link, or a partial archive set)
//        2 → usage, or a file that cannot be read (stderr)
//
//   node pharn/floor/spec-amend.mjs begin <name>
//        0 → one JSON line {schema, archived, moved}: SPEC.md copied to SPEC.a1.md; every present round file and
//            SUPERVISOR.json renamed to its `.a1` name
//        1 → RED: a link, an amend name already present (`amend-used` / `partial-archive`), a decision that is not a
//            checked `amend-spec` (`not-amend-spec` / `supervisor-invalid`), or a failed rename (`rename-failed`: every
//            move undone and SPEC.a1.md removed; `rename-partial`: an undo failed too)
//        2 → usage, or SPEC.md cannot be read
//
//   node pharn/floor/spec-amend.mjs check <name>
//        0 → one JSON line {schema, added: [AC ids], kept}: the amend is append-only and SPEC.md is Approved and pinned
//        1 → RED (the codes in spec-amend-core.mjs DEFECT_CODES)
//        2 → usage, or a file that cannot be read
//
// Exit 1 is ALWAYS printed WITH its `RED — ` line first, so a caller can tell this checker's RED from node's own exit 1.
//
// READING (L54): SPEC.md and every amend name are lstat'ed first and a link or non-regular file is refused
// (`not-regular`); each file is read through regular-file.mjs (one O_NOFOLLOW descriptor). `begin` decides only after
// checking every source and destination, writes the copy with an exclusive create, and undoes on a failed rename.
// Output names codes, AC ids and the fixed amend names — never SPEC or finding text (P2, L62).
//
// APPROVAL is check-spec-approved.mjs's, run as a CLI beside this file (its output is not echoed: it can quote the
// SPEC's state value) — the same reuse check-spec-approved.mjs makes of check-spec.mjs (P3, L35).
//
// `readAmend(dir)` is the same derivation for loop-closeout.mjs and render-run-report.mjs (L35: one reader).
//
// FLOOR: the archive set, the state token, the append-only rule, the one-amend rule (the core's header). ADVISORY: that
// the caller acts on the exit code (/pharn-loop Step 4, /pharn-spec Step 1), and whether the new criteria are right.

import "./runtime-floor.mjs";
import { spawnSync } from "node:child_process";
import { lstatSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { readRegularFile } from "./regular-file.mjs";
import {
  AMEND_NAMES,
  BEGIN_SCHEMA,
  CHECK_SCHEMA,
  EXIT,
  MOVED_NAMES,
  SPEC,
  SPEC_ARCHIVE,
  STATUS_SCHEMA,
  SUPERVISOR_ARCHIVE,
  addedCriteriaLines,
  amendName,
  amendState,
  checkAmend,
  defectHints,
  formatDefects,
} from "./spec-amend-core.mjs";
import { readSupervision } from "./supervisor.mjs";

const INPUT_MAX = 4 * 1024 * 1024;
const HERE = dirname(fileURLToPath(import.meta.url));
const APPROVED = join(HERE, "check-spec-approved.mjs");
const USAGE =
  "usage: node pharn/floor/spec-amend.mjs status <name>\n" +
  "       node pharn/floor/spec-amend.mjs begin <name>\n" +
  "       node pharn/floor/spec-amend.mjs check <name>\n";

/** lstat one name: "absent", "file", or "other" (a link, a directory, anything not a regular file). Never throws. */
function kindOf(path) {
  try {
    return lstatSync(path).isFile() ? "file" : "other";
  } catch (e) {
    return e?.code === "ENOENT" ? "absent" : "other";
  }
}

/** The AMEND_NAMES present as regular files, or `null` when SPEC.md or any amend name is not regular. */
function presentNames(dir) {
  if (kindOf(join(dir, SPEC)) === "other") return null;
  const present = new Set();
  for (const n of AMEND_NAMES) {
    const k = kindOf(join(dir, n));
    if (k === "other") return null;
    if (k === "file") present.add(n);
  }
  return present;
}

/** Is SPEC.md Approved and pinned? check-spec-approved.mjs's exit, its output discarded. */
function approved(specPath) {
  const r = spawnSync(process.execPath, [APPROVED, specPath], { encoding: "utf8" });
  return !r.error && r.status === 0;
}

/**
 * The checked amend for `dir`, for the closeout and the run report: `{state: "absent"}` (no SPEC.a1.md),
 * `{state: "ok", added, kept, items, reason}` — `items` the added criteria's lines and `reason` the archived decision's
 * reason (or null), both untrusted text to fence — `{state: "red", codes}` or `{state: "unreadable", reason}`.
 * `approval: false` skips the Approved-and-pinned read (the run report: a stop that is not green reverts the SPEC to
 * Draft before the report renders, and the amend's shape is still worth showing). The closeout keeps the default.
 * Never throws.
 */
export function readAmend(dir, { approval = true } = {}) {
  try {
    const present = presentNames(dir);
    if (present === null) return { state: "red", codes: ["not-regular"] };
    if (!present.has(SPEC_ARCHIVE)) return present.size === 0 ? { state: "absent" } : { state: "red", codes: ["partial-archive"] };
    const st = amendState(present);
    if (!st.ok) return { state: "red", codes: st.defects.map((d) => d.code) };
    const a = readRegularFile(join(dir, SPEC_ARCHIVE), "archived SPEC", INPUT_MAX);
    const s = readRegularFile(join(dir, SPEC), "SPEC", INPUT_MAX);
    if (!a.ok || !s.ok) return { state: "unreadable", reason: "the SPEC or its archive could not be read" };
    const specText = s.bytes.toString("utf8");
    const r = checkAmend(a.bytes.toString("utf8"), specText);
    if (!r.ok) return { state: "red", codes: [...new Set(r.defects.map((d) => d.code))] };
    if (approval && !approved(join(dir, SPEC))) return { state: "red", codes: ["not-approved"] };
    return { state: "ok", added: r.added, kept: r.kept, items: addedCriteriaLines(specText, r.added), reason: archivedReason(dir) };
  } catch {
    return { state: "unreadable", reason: "the amend could not be read" };
  }
}

/** The archived decision's `reason` when SUPERVISOR.a1.json parses as an `amend-spec` decision, else null. Shape only:
 *  the archived round files are not re-derived, so the caller fences it as untrusted DATA and asserts nothing more. */
function archivedReason(dir) {
  const r = readRegularFile(join(dir, SUPERVISOR_ARCHIVE), "archived decision", INPUT_MAX);
  if (!r.ok) return null;
  try {
    const d = JSON.parse(r.bytes.toString("utf8"));
    return d !== null && typeof d === "object" && d.decision === "amend-spec" && typeof d.reason === "string" ? d.reason : null;
  } catch {
    return null;
  }
}

function red(io, defects) {
  io.stdout.write(`${[`RED — ${formatDefects(defects)}`, ...defectHints(defects)].join("\n")}\n`);
  return EXIT.red;
}

const codes = (...cs) => cs.map((code) => ({ code }));

/** Resolve `<name>` to its feature directory: `{dir}` or `{code}` with the usage or not-found exit already written. */
function featureDir(rest, io) {
  if (rest.length !== 1 || !FEATURE_SLUG_RE.test(rest[0])) {
    io.stderr.write(USAGE);
    return { code: EXIT.usage };
  }
  const dir = join("pharn", "features", rest[0]);
  let st;
  try {
    st = lstatSync(dir);
  } catch {
    io.stderr.write(`spec-amend: feature directory not found: ${dir}\n`);
    return { code: EXIT.usage };
  }
  if (!st.isDirectory()) {
    io.stderr.write(`spec-amend: not a directory: ${dir}\n`);
    return { code: EXIT.usage };
  }
  return { dir };
}

function doStatus(dir, io) {
  const present = presentNames(dir);
  if (present === null) return red(io, codes("not-regular"));
  let texts = null;
  if (present.has(SPEC_ARCHIVE)) {
    const a = readRegularFile(join(dir, SPEC_ARCHIVE), "archived SPEC", INPUT_MAX);
    const s = readRegularFile(join(dir, SPEC), "SPEC", INPUT_MAX);
    if (!a.ok || !s.ok) {
      io.stderr.write(`spec-amend: ${(a.ok ? s : a).reason}\n`);
      return EXIT.usage;
    }
    texts = { archive: a.bytes.toString("utf8"), spec: s.bytes.toString("utf8") };
  }
  const st = amendState(present, texts);
  if (!st.ok) return red(io, st.defects);
  io.stdout.write(`${JSON.stringify({ schema: STATUS_SCHEMA, status: st.state })}\n`);
  return EXIT.ok;
}

/** Undo the renames done so far (newest first), then remove the copy. True iff every undo succeeded. */
function undo(dir, done) {
  let clean = true;
  for (const n of [...done].reverse()) {
    try {
      renameSync(join(dir, amendName(n)), join(dir, n));
    } catch {
      clean = false;
    }
  }
  try {
    unlinkSync(join(dir, SPEC_ARCHIVE));
  } catch {
    clean = false;
  }
  return clean;
}

function doBegin(dir, io) {
  const present = presentNames(dir);
  if (present === null) return red(io, codes("not-regular"));
  if (present.has(SPEC_ARCHIVE)) return red(io, codes("amend-used"));
  if (present.size > 0) return red(io, codes("partial-archive"));
  const sup = readSupervision(dir);
  if (sup.state !== "ok") return red(io, codes("supervisor-invalid"));
  if (sup.verdict.decision !== "amend-spec") return red(io, codes("not-amend-spec"));
  const spec = readRegularFile(join(dir, SPEC), "SPEC", INPUT_MAX);
  if (!spec.ok) {
    io.stderr.write(`spec-amend: ${spec.reason}\n`);
    return EXIT.usage;
  }
  const moving = MOVED_NAMES.filter((n) => kindOf(join(dir, n)) === "file");
  try {
    writeFileSync(join(dir, SPEC_ARCHIVE), spec.bytes, { flag: "wx" });
  } catch {
    return red(io, codes("rename-failed"));
  }
  const done = [];
  for (const n of moving) {
    try {
      renameSync(join(dir, n), join(dir, amendName(n)));
      done.push(n);
    } catch {
      return red(io, codes(undo(dir, done) ? "rename-failed" : "rename-partial"));
    }
  }
  io.stdout.write(`${JSON.stringify({ schema: BEGIN_SCHEMA, archived: SPEC_ARCHIVE, moved: done })}\n`);
  return EXIT.ok;
}

function doCheck(dir, io) {
  const present = presentNames(dir);
  if (present === null) return red(io, codes("not-regular"));
  if (!present.has(SPEC_ARCHIVE)) return red(io, codes(present.size === 0 ? "not-pending" : "partial-archive"));
  const st = amendState(present);
  if (!st.ok) return red(io, st.defects);
  const a = readRegularFile(join(dir, SPEC_ARCHIVE), "archived SPEC", INPUT_MAX);
  const s = readRegularFile(join(dir, SPEC), "SPEC", INPUT_MAX);
  if (!a.ok || !s.ok) {
    io.stderr.write(`spec-amend: ${(a.ok ? s : a).reason}\n`);
    return EXIT.usage;
  }
  const r = checkAmend(a.bytes.toString("utf8"), s.bytes.toString("utf8"));
  const defects = r.ok ? [] : [...r.defects];
  if (!approved(join(dir, SPEC))) defects.push({ code: "not-approved" });
  if (defects.length > 0) return red(io, defects);
  io.stdout.write(`${JSON.stringify({ schema: CHECK_SCHEMA, added: r.added, kept: r.kept })}\n`);
  return EXIT.ok;
}

const RUNS = Object.freeze({ status: doStatus, begin: doBegin, check: doCheck });

/** Entry point; returns the exit code (never calls process.exit — the flush rule). */
export function main(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const [cmd, ...rest] = argv.slice(2);
  if (!Object.hasOwn(RUNS, cmd)) {
    io.stderr.write(USAGE);
    return EXIT.usage;
  }
  const fd = featureDir(rest, io);
  if (!fd.dir) return fd.code;
  return RUNS[cmd](fd.dir, io);
}

if (import.meta.main) process.exitCode = main(process.argv);
