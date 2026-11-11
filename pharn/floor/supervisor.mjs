#!/usr/bin/env node
// pharn/floor/supervisor.mjs — the supervisor stage's skeleton and the loop's decision read on an escalation (7.9.0,
// loop-supervisor). The CLI half of `pharn/floor/supervisor-core.mjs`, whose header holds the rules and their bounds;
// contract: `pharn/pharn-contracts/supervisor.md` (cited, not restated — P4). Run from the project root.
//
//   node pharn/floor/supervisor.mjs skeleton <name>
//        0 → the decision skeleton on stdout (round, triage_sha256, one risk per escalated id, empty strings)
//        1 → `RED — <codes>` first, then one fixed hint per code: an input breaks its contract, or there is no
//            escalation to decide (`not-escalated`)
//        2 → usage, or an input that cannot be read (reason on stderr, nothing on stdout)
//
//   node pharn/floor/supervisor.mjs check <name>
//        0 → proceed-at-risk   3 → stop — each with one verdict JSON line {schema, decision, round, known_risk}
//        1 → `RED — <codes>` first, then the hints (an input or SUPERVISOR.json breaks its contract, or no escalation)
//        2 → usage, or a file that cannot be read, SUPERVISOR.json absent included (stderr)
//
// Exit 1 is ALWAYS printed WITH its `RED — ` line first, so a caller can tell this checker's RED from node's own exit 1.
//
// WHAT IT DERIVES, EVERY CALL: it re-validates grill-findings.json (grill-findings-core.mjs), re-checks grill-triage.json
// against those exact bytes (grill-triage-core.mjs `checkTriage`) for the verdict and the escalated ids, counts the
// complete round archives (grill-round-core.mjs `archivedRounds`), requires an escalation (supervisor-core.mjs
// `escalation`), and only then reads SUPERVISOR.json. Nothing is taken from a previous call.
//
// READING (L54): every input and archive name is lstat'ed first and a link or non-regular file is refused
// (`not-regular`); each file is then read through regular-file.mjs (one O_NOFOLLOW descriptor). Output names codes,
// indexes and ids — never a reason or any finding text (P2, L62).
//
// `readSupervision(dir)` is the same derivation for loop-closeout.mjs and render-run-report.mjs, which need the checked
// decision and, for the report, the findings it carries (L35: one reader, not three).
//
// FLOOR: the decision's shape, binding and coverage, and the escalation precondition (the core's header). ADVISORY:
// the decision itself, and that the caller acts on the exit code (/pharn-loop Step 4).

import "./runtime-floor.mjs";
import { createHash } from "node:crypto";
import { lstatSync } from "node:fs";
import { join } from "node:path";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { validate } from "./grill-findings-core.mjs";
import { ARCHIVE_NAMES, archivedRounds } from "./grill-round-core.mjs";
import { checkTriage } from "./grill-triage-core.mjs";
import { readRegularFile } from "./regular-file.mjs";
import { ARTIFACT, DECISION_EXIT, checkSupervisor, defectHints, escalation, formatDefects, skeleton } from "./supervisor-core.mjs";

const INPUT_MAX = 4 * 1024 * 1024;
const FINDINGS = "grill-findings.json";
const TRIAGE = "grill-triage.json";
const USAGE = "usage: node pharn/floor/supervisor.mjs skeleton <name>\n" + "       node pharn/floor/supervisor.mjs check <name>\n";

/** lstat one name: "absent", "file", or "other" (a link, a directory, anything not a regular file). Never throws. */
function kindOf(path) {
  try {
    return lstatSync(path).isFile() ? "file" : "other";
  } catch (e) {
    return e?.code === "ENOENT" ? "absent" : "other";
  }
}

/**
 * Derive what a decision is checked against, from the feature directory `dir`. Returns
 * `{ok: true, round, triageSha256, escalated, findingsDoc}`, `{ok: false, red: [codes]}` (a contract defect), or
 * `{ok: false, unreadable: reason}` (a file that cannot be read; the reason names a path and a cause, never content).
 */
export function deriveEscalation(dir) {
  for (const n of [FINDINGS, TRIAGE, ARTIFACT, ...ARCHIVE_NAMES]) {
    if (kindOf(join(dir, n)) === "other") return { ok: false, red: ["not-regular"] };
  }
  const present = new Set(ARCHIVE_NAMES.filter((n) => kindOf(join(dir, n)) === "file"));
  const a = archivedRounds(present);
  if (!a.ok) return { ok: false, red: ["archives-invalid"] };
  const f = readRegularFile(join(dir, FINDINGS), "findings file", INPUT_MAX);
  if (!f.ok) return { ok: false, unreadable: f.reason };
  const v = validate(f.bytes.toString("utf8"));
  if (!v.ok) return { ok: false, red: ["findings-invalid"] };
  const t = readRegularFile(join(dir, TRIAGE), "triage file", INPUT_MAX);
  if (!t.ok) return { ok: false, unreadable: t.reason };
  const findingsSha = createHash("sha256").update(f.bytes).digest("hex");
  const tr = checkTriage(t.bytes.toString("utf8"), v.doc, findingsSha);
  if (!tr.ok) return { ok: false, red: ["triage-invalid"] };
  if (!escalation(tr.verdict.verdict, a.archived)) return { ok: false, red: ["not-escalated"] };
  return {
    ok: true,
    round: v.doc.round,
    triageSha256: createHash("sha256").update(t.bytes).digest("hex"),
    escalated: tr.verdict.escalated,
    findingsDoc: v.doc,
  };
}

/**
 * The checked decision for `dir`: `{state: "absent"}` (no SUPERVISOR.json), `{state: "ok", verdict, decision, findingsDoc}`
 * (`decision` is the parsed file), `{state: "red", codes}` or `{state: "unreadable", reason}`. Never throws.
 */
export function readSupervision(dir) {
  try {
    if (kindOf(join(dir, ARTIFACT)) === "absent") return { state: "absent" };
    const d = deriveEscalation(dir);
    if (!d.ok) return d.red ? { state: "red", codes: d.red } : { state: "unreadable", reason: d.unreadable };
    const s = readRegularFile(join(dir, ARTIFACT), "decision file", INPUT_MAX);
    if (!s.ok) return { state: "unreadable", reason: s.reason };
    const text = s.bytes.toString("utf8");
    const r = checkSupervisor(text, d);
    if (!r.ok) return { state: "red", codes: [...new Set(r.defects.map((x) => x.code))] };
    return { state: "ok", verdict: r.verdict, decision: JSON.parse(text), findingsDoc: d.findingsDoc };
  } catch {
    return { state: "unreadable", reason: "the decision could not be read" };
  }
}

function red(io, defects) {
  io.stdout.write(`${[`RED — ${formatDefects(defects)}`, ...defectHints(defects)].join("\n")}\n`);
  return 1;
}

/** Resolve `<name>` to its feature directory: `{dir}` or `{code}` with the usage or not-found exit already written. */
function featureDir(rest, io) {
  if (rest.length !== 1 || !FEATURE_SLUG_RE.test(rest[0])) {
    io.stderr.write(USAGE);
    return { code: 2 };
  }
  const dir = join("pharn", "features", rest[0]);
  let st;
  try {
    st = lstatSync(dir);
  } catch {
    io.stderr.write(`supervisor: feature directory not found: ${dir}\n`);
    return { code: 2 };
  }
  if (!st.isDirectory()) {
    io.stderr.write(`supervisor: not a directory: ${dir}\n`);
    return { code: 2 };
  }
  return { dir };
}

function derived(rest, io) {
  const fd = featureDir(rest, io);
  if (!fd.dir) return { code: fd.code };
  const d = deriveEscalation(fd.dir);
  if (d.ok) return { dir: fd.dir, d };
  if (d.red)
    return {
      code: red(
        io,
        d.red.map((code) => ({ code }))
      ),
    };
  io.stderr.write(`supervisor: ${d.unreadable}\n`);
  return { code: 2 };
}

function doSkeleton(rest, io) {
  const x = derived(rest, io);
  if (!x.d) return x.code;
  io.stdout.write(`${JSON.stringify(skeleton(x.d), null, 2)}\n`);
  return 0;
}

function doCheck(rest, io) {
  const x = derived(rest, io);
  if (!x.d) return x.code;
  const s = readRegularFile(join(x.dir, ARTIFACT), "decision file", INPUT_MAX);
  if (!s.ok) {
    io.stderr.write(`supervisor: ${s.reason}\n`);
    return 2;
  }
  const r = checkSupervisor(s.bytes.toString("utf8"), x.d);
  if (!r.ok) return red(io, r.defects);
  io.stdout.write(`${JSON.stringify(r.verdict)}\n`);
  return DECISION_EXIT[r.verdict.decision];
}

/** Entry point; returns the exit code (never calls process.exit — the flush rule). */
export function main(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const [cmd, ...rest] = argv.slice(2);
  if (cmd === "skeleton") return doSkeleton(rest, io);
  if (cmd === "check") return doCheck(rest, io);
  io.stderr.write(USAGE);
  return 2;
}

if (import.meta.main) process.exitCode = main(process.argv);
