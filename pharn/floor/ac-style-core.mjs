// pharn/floor/ac-style-core.mjs — the PURE rules of /pharn-test's style check (ac-tests-style-gate, issue #409).
// No I/O, no spawning: check-ac-style.mjs reads and writes the disk and runs the gates (P3 — this file changes when the
// RULE changes, that one when the storage or the process handling does).
//
// ============================== WHY THIS EXISTS (P7 — the recorded failure) ==============================
// In a test-first /pharn-loop run (issue #409), /pharn-test wrote nine AC test files and pinned them; five failed the
// project's `prettier --check .`. Once the red run is recorded the build may not touch a pinned test (outside PLAN.md
// `## Files`; changing one is `ac-tests-modified` at the AC gate), so `build-gate.mjs --mode full` and /pharn-verify were
// red on `format:check` forever. Before /pharn-test's Step 4 (the pin) nothing ran the style gates; this module decides
// whether the tests it just wrote broke one, so the stage can fix its own files or refuse before pinning.
//
// ============================== THE GATE SET (`styleGates`) ==============================
// gate-run-core.mjs STYLE_SET (lint, format:check, lint:md) ∩ the package.json scripts (`discoverGates`, own-property
// keys only), minus the project's `gates.exclude` (gate-exclusion-core.mjs), in STYLE_SET order. Membership only (P5):
// no script's command text is read. Each gate runs as `npm run <id>`.
//
// ============================== THE VERDICT RULE (`styleVerdict`) ==============================
// The style gates are WHOLE-TREE (`prettier --check .`), so an absolute "is it red after" cannot tell this stage's files
// from a red that was already there (lessons-learned L11). The rule is a per-gate FLIP between two runs: `--before`,
// taken before Step 3 writes anything, and `--after`. Per gate, in STYLE_SET order:
//   • after MEASURED exit 0 → nothing;
//   • after NOT MEASURED → a NOTE, never a refusal. "Not measured" is gate-run-core.mjs's one definition (L35): the
//     runner killed it at --timeout-ms (`timed_out`), or it could not start (NOT_STARTED_EXITS, 126/127 — the codes
//     run-gates.mjs `spawnGate` gives EACCES/ENOENT). A signal exit (>= 128) of a gate the runner did NOT time out is
//     a completed, measured non-zero, exactly as gate-run-core.mjs `unmeasuredRuns` reads it. /pharn-verify measures the gate again with
//     its own timeout; this stage does not claim anything about it;
//   • after measured non-zero, before measured exit 0 → RED `flipped`. Attributable: between the two runs the stage's
//     Write-tool writes are confined to the mapped test files by the fix #7 hook (Step 0's `--from-plan AC-TESTS.md`);
//   • after measured non-zero, before red or not measured, and NO mapped test file existed at `--before` → a NOTE,
//     `red-before`: the red was there before this stage wrote anything, so it is not attributed to the tests;
//   • after measured non-zero, before red or not measured, and a mapped test file ALREADY existed at `--before` (a
//     re-run after an earlier refusal, or a mapped file that is an existing test file) → RED `tests-existed`. Fail-
//     closed: the earlier files make the gate unattributable, and pinning them is exactly the dead end of #409.
// status `red` iff at least one RED, else `green`. An empty gate set is `green` with `empty: true`, printed as its own
// line — never a silent pass over zero gates (L34). A before/after gate-set mismatch, or a record of another feature, is
// `unusable`: package.json and pharn.config.json are outside the stage's write scope, so a different set means the two
// runs did not measure the same thing.
//
// ============================== WHAT IT DOES NOT CLAIM (P0) ==============================
//   • That /pharn-test ran it. The two calls are /pharn-test's Step 2c and Step 3b — advisory orchestration. Nothing
//     downstream requires the records: check-test-stage.mjs READY does not depend on them, so a run that skips the step
//     is not caught later.
//   • That a NOTE gate is clean. A gate red before (with no earlier test files) can still be failed by the new tests as
//     well, and they are pinned anyway; an unmeasured gate is unknown. Both are printed, and /pharn-verify judges them.
//   • That only the test files changed between the runs. The hook confines the Write/Edit surface only; a Bash write in
//     between is not seen (pharn/LIMITS.md §6). A style script that WRITES (an `eslint --fix` wired as `lint`) runs twice
//     here, before the build's reconcile anchor, so its writes are neither hook-gated nor reconciled — the same exposure
//     as the entry check and /pharn-verify, which run the same scripts.
//   • That a script exits non-zero only for the reasons its name suggests. "Red" is an exit code, never a reading of the
//     tool's output; the gate logs are never parsed.
//   • Provenance (L43). The records live under `pharn/.run/`, which Bash reaches; a self-consistent forged pair passes.
//
// TRUST (P2): gate ids are STYLE_SET members; exits are integers; mapped test paths reach only an lstat, through
// ac-tests-core.mjs acRowsOf/badPath. A value quoted into a reason goes through quote-core.mjs `shown()`, which cannot
// throw (L62).

import { STYLE_SET, NOT_STARTED_EXITS, discoverGates } from "./gate-run-core.mjs";
import { shown } from "./quote-core.mjs";

/** The record schema. A record of any other schema is `unusable`, never read. */
export const SCHEMA = "ac-style/1";
/** The two phases, and the closed key set of a record. */
export const PHASES = Object.freeze(["before", "after"]);
export const RECORD_KEYS = Object.freeze(["schema", "phase", "feature", "tests_existed", "gates"]);
export const GATE_KEYS = Object.freeze(["id", "exit", "timed_out"]);
/** The exit table both modes share. */
export const EXIT = Object.freeze({ green: 0, red: 1, unusable: 2 });
/** The one scratch directory, relative to the invoking directory. `--before` recreates it. */
export const STYLE_DIR = "pharn/.run/pharn-test/style";

/** STYLE_SET ∩ package.json scripts − exclusion, in STYLE_SET order, as runner entries (`npm run <id>`). */
export function styleGates(scripts, exclude = []) {
  const ex = Array.isArray(exclude) ? exclude : [];
  return discoverGates(scripts).filter((e) => STYLE_SET.includes(e.id) && !ex.includes(e.id));
}

/** A log's file name stem for a gate in a phase: `after-format-check` (`:` is not kept in a file name). */
export function logStem(phase, id) {
  return `${phase}-${String(id).replace(/[^A-Za-z0-9-]/g, "-")}`;
}

/** The record `--before` / `--after` writes. `runs` is `[{id, exit, timed_out}]` in run order. */
export function makeRecord({ phase, feature, testsExisted, runs }) {
  return {
    schema: SCHEMA,
    phase,
    feature,
    tests_existed: testsExisted === true,
    gates: runs.map((r) => ({ id: r.id, exit: r.exit, timed_out: r.timed_out === true })),
  };
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Why `rec` is not a usable record of `phase` for `feature`, or null. Closed keys; gate ids distinct STYLE_SET members
 *  in STYLE_SET order; exits integers; `timed_out` booleans. */
export function recordError(rec, { phase, feature }) {
  if (!isObj(rec)) return "is not a JSON object";
  for (const k of Object.keys(rec)) if (!RECORD_KEYS.includes(k)) return `has the unknown key ${shown(k)}`;
  for (const k of RECORD_KEYS) if (!Object.hasOwn(rec, k)) return `has no \`${k}\``;
  if (rec.schema !== SCHEMA) return `has schema ${shown(rec.schema)}, not ${JSON.stringify(SCHEMA)}`;
  if (rec.phase !== phase) return `is a ${shown(rec.phase)} record, not ${JSON.stringify(phase)}`;
  if (rec.feature !== feature) return `belongs to the feature ${shown(rec.feature)}, not ${JSON.stringify(feature)}`;
  if (typeof rec.tests_existed !== "boolean") return "has a non-boolean `tests_existed`";
  if (!Array.isArray(rec.gates)) return "has a non-array `gates`";
  let last = -1;
  for (const g of rec.gates) {
    if (!isObj(g)) return "has a gate entry that is not an object";
    for (const k of Object.keys(g)) if (!GATE_KEYS.includes(k)) return `has a gate entry with the unknown key ${shown(k)}`;
    const at = STYLE_SET.indexOf(g.id);
    if (at === -1) return `names the gate ${shown(g.id)}, which is not a style gate`;
    if (at <= last) return "lists its gates out of STYLE_SET order, or twice";
    last = at;
    if (!Number.isInteger(g.exit)) return `has a non-integer exit for ${g.id}`;
    if (typeof g.timed_out !== "boolean") return `has a non-boolean timed_out for ${g.id}`;
  }
  return null;
}

/** Measured = completed by itself: not killed at the timeout, not one of the could-not-start exits. */
export function measured(g) {
  return g.timed_out !== true && !NOT_STARTED_EXITS.includes(g.exit);
}

/** The verdict over a validated before/after pair (see the header). */
export function styleVerdict(before, after) {
  const ids = (r) => r.gates.map((g) => g.id).join(",");
  if (ids(before) !== ids(after)) {
    return {
      status: "unusable",
      reason: `the style gates differ between the runs (before: ${ids(before) || "none"}; after: ${ids(after) || "none"})`,
    };
  }
  const red = [];
  const notes = [];
  for (let i = 0; i < after.gates.length; i++) {
    const a = after.gates[i];
    const b = before.gates[i];
    if (!measured(a)) {
      notes.push({ id: a.id, kind: "not-measured", cause: a.timed_out ? "timed-out" : "not-started", after: a.exit });
      continue;
    }
    if (a.exit === 0) continue;
    if (measured(b) && b.exit === 0) red.push({ id: a.id, cause: "flipped", before: b.exit, after: a.exit });
    else if (before.tests_existed) red.push({ id: a.id, cause: "tests-existed", before: b.exit, after: a.exit });
    else notes.push({ id: a.id, kind: "red-before", before: b.exit, after: a.exit, beforeMeasured: measured(b) });
  }
  return { status: red.length ? "red" : "green", empty: after.gates.length === 0, red, notes };
}

/** The printed lines of a verdict. `logOf(id)` names the gate's after-run log paths (untrusted DATA for the reader). */
export function verdictLines(v, logOf) {
  const out = [];
  for (const r of v.red) {
    const why =
      r.cause === "flipped"
        ? `exit 0 before the tests were written, exit ${r.after} after`
        : `exit ${r.before} before and ${r.after} after, and a mapped test file already existed before this stage wrote — remove the earlier test files and re-run /pharn-test, or fix the gate`;
    out.push(`RED — ac-tests-unformatted: ${r.id} — ${why}; log: ${logOf(r.id)}`);
  }
  for (const n of v.notes) {
    if (n.kind === "not-measured") {
      out.push(
        `NOTE — ${n.id} was not measured after the tests were written (${n.cause}); not judged here — /pharn-verify measures it again`
      );
    } else {
      out.push(
        `NOTE — ${n.id} was already red before the tests were written (${n.beforeMeasured ? `exit ${n.before}` : "not measured"}, exit ${n.after} after) and no mapped test file existed then; not attributed to them; log: ${logOf(n.id)}`
      );
    }
  }
  if (v.status === "red") out.push(`RED — ${v.red.length} style gate(s) newly failing after the AC tests were written: do not pin them`);
  else if (v.empty) out.push(`GREEN — no style gate (${STYLE_SET.join(", ")}) is discovered here; nothing to compare`);
  else out.push("GREEN — no style gate went from passing to failing while the AC tests were written");
  return out;
}
