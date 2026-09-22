// pharn/floor/ship-outcome-core.test.mjs — the executable specification for the ship-outcome derivation.
//
// This module ships no contract file of its own: `pharn/pharn-contracts/cost-ledger.md` owns the
// `outcome` object and cites this file for the derivation's bounds (P4 — cited, not restated). The module
// header is the spec; this suite enforces it.
//
// THREE DISCIPLINES, applied deliberately rather than by habit:
//  • NON-VACUITY (L34) — every per-member rule below runs over a domain the test asserts is non-empty,
//    and the decision table is asserted to cover every FORM in `SHIP_DECISION_FORMS`, not merely the
//    forms the author happened to write a case for.
//  • CLOSURE, not presence (L36) — `decision` carries a PARAMETER, so the vocabulary is pinned by a
//    closure over the emitted stem with a NEGATIVE CONTROL, not by one presence assertion per member.
//    L36's recorded instance shipped its enumeration in the same diff as the vocabulary and still
//    acquired a second spelling of one member.
//  • NEGATIVE CONTROLS (L4) — an assertion that cannot fail certifies nothing, so each structural rule
//    is paired with an input that must break it.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  GATE2,
  STOP_PREFIX,
  UNKNOWN_STAGE,
  OUTCOME_SOURCE,
  SHIP_DECISION_RE,
  SHIP_DECISION_FORMS,
  deriveShipOutcome,
  readShipOutcome,
  readVerdict,
  lastStartedStage,
  recordedIterations,
} from "./ship-outcome-core.mjs";

const scratch = () => mkdtempSync(join(tmpdir(), "pharn-ship-outcome-"));

/** A marker, shaped as `readMarkers()` hands them over. `ts`/`session_id` are irrelevant to this module
 *  — it reads `kind`, `stage` and `iteration` only — so they are present but unused, which keeps the
 *  fixture honest about the real record rather than a trimmed invention. */
const marker = (seq, kind, stage = null, iteration = null) => ({
  seq,
  kind,
  stage,
  iteration,
  ts: `2026-09-22T00:00:${String(seq).padStart(2, "0")}.000Z`,
  session_id: "s1",
});

/** The marker trail a full ship run leaves: run-start, then each stage bracketed by an orchestrator. */
const fullRun = () => [
  marker(1, "run-start"),
  marker(2, "stage-start", "pharn-spec"),
  marker(3, "orchestrator"),
  marker(4, "stage-start", "pharn-plan"),
  marker(5, "orchestrator"),
  marker(6, "stage-start", "pharn-build", 1),
  marker(7, "orchestrator"),
  marker(8, "stage-start", "pharn-regress", 1),
  marker(9, "orchestrator"),
  marker(10, "stage-start", "pharn-verify", 1),
  marker(11, "orchestrator"),
];

const derive = (markers, verifyVerdict, regressVerdict) => deriveShipOutcome({ markers, verifyVerdict, regressVerdict });

// ── the decision table ───────────────────────────────────────────────────────────────────────────────

test("gate2 requires BOTH proceed verdicts — and each one alone is not enough", () => {
  const m = fullRun();
  assert.equal(derive(m, "PASS", "no-regressions").decision, GATE2);

  // The negative half is the load-bearing half: an assertion that only ever sees the passing input
  // cannot tell a conjunction from a disjunction (L27's "present in its own case AND absent from the
  // other"). Each row below flips exactly one operand.
  const notGate2 = [
    ["PASS", "regressions"],
    ["PASS", "inconclusive"],
    ["FAIL", "no-regressions"],
    ["INCOMPLETE", "no-regressions"],
    ["INCONCLUSIVE", "no-regressions"],
    [null, "no-regressions"],
    ["PASS", null],
    [null, null],
  ];
  assert.ok(notGate2.length >= 8, "non-vacuity: the negative domain must be non-empty");
  for (const [v, r] of notGate2) {
    assert.notEqual(derive(m, v, r).decision, GATE2, `verify=${v} regress=${r} must NOT be gate2`);
  }
});

test("a non-gate2 run names the LAST stage that started", () => {
  assert.equal(derive(fullRun(), "FAIL", "no-regressions").decision, `${STOP_PREFIX}pharn-verify`);

  // An EARLY stop: the run never reached regress/verify, so neither report exists. This is the ordinary
  // shape of a STOP at grill, and it must not degrade to `unknown` merely because the reports are absent.
  const early = [
    marker(1, "run-start"),
    marker(2, "stage-start", "pharn-spec"),
    marker(3, "orchestrator"),
    marker(4, "stage-start", "pharn-grill"),
  ];
  assert.equal(derive(early, null, null).decision, `${STOP_PREFIX}pharn-grill`);
});

test("stop:unknown is REACHABLE — markers with no stage-start, and a stage token that fails the grammar", () => {
  const noStart = [marker(1, "run-start"), marker(2, "orchestrator"), marker(3, "run-stop")];
  assert.equal(derive(noStart, "FAIL", "no-regressions").decision, `${STOP_PREFIX}${UNKNOWN_STAGE}`);

  // FAIL-CLOSED ON A HOSTILE RECORD. `mark-phase.mjs` validates `--stage` at WRITE time, but the markers
  // file is ordinary state under `.pharn/` that Bash reaches (LIMITS.md §6), so a reader that trusted the
  // writer would be trusting a file anyone can edit. Each row is a token the write-side grammar would
  // have refused; every one must land on the terminal fallback rather than be copied through.
  const hostile = ["../../etc/passwd", "Pharn-Verify", "pharn verify", "pharn/verify", "-leading-hyphen", "", "x".repeat(65)];
  assert.ok(hostile.length >= 7, "non-vacuity: the hostile domain must be non-empty");
  for (const s of hostile) {
    const got = derive([marker(1, "run-start"), marker(2, "stage-start", s)], "FAIL", "no-regressions").decision;
    assert.equal(got, `${STOP_PREFIX}${UNKNOWN_STAGE}`, `a stage token ${JSON.stringify(s)} must not be copied through`);
    assert.match(got, SHIP_DECISION_RE, "and the fallback must itself be in the closed vocabulary");
  }

  // MUTATION CONTROL: a LEGAL token must survive untouched, or the rule above is satisfied by a
  // function that rejects everything.
  assert.equal(
    derive([marker(1, "run-start"), marker(2, "stage-start", "pharn-build")], "FAIL", "x").decision,
    `${STOP_PREFIX}pharn-build`
  );
});

test("no markers at all → null, not a stop nobody observed", () => {
  assert.equal(derive([], "PASS", "no-regressions"), null);
  assert.equal(derive([], null, null), null);
  assert.equal(deriveShipOutcome({ markers: null, verifyVerdict: null, regressVerdict: null }), null);
  // `null` is an EXISTING member of `outcome` in cost-ledger.md, so this needs no new shape anywhere.
});

test("iterations is the greatest stage-start iteration, or an honest null", () => {
  assert.equal(derive(fullRun(), "PASS", "no-regressions").iterations, 1);

  // The Step-2b build-completion retry is iteration 2, and it is the only way a ship run exceeds 1.
  const retried = [...fullRun(), marker(12, "stage-start", "pharn-build", 2), marker(13, "stage-start", "pharn-verify", 2)];
  assert.equal(derive(retried, "PASS", "no-regressions").iterations, 2);

  // A stop before `/pharn-build`: spec/plan/grill are marked WITHOUT an iteration, so there is no
  // integer to report. A manufactured `1` would assert something the markers never recorded.
  const early = [marker(1, "run-start"), marker(2, "stage-start", "pharn-plan")];
  assert.equal(derive(early, null, null).iterations, null);
  assert.equal(recordedIterations([]), null);
});

test("every derived outcome carries the derived source — never the loop's", () => {
  for (const [v, r] of [
    ["PASS", "no-regressions"],
    ["FAIL", "regressions"],
  ]) {
    assert.equal(derive(fullRun(), v, r).source, OUTCOME_SOURCE);
    assert.notEqual(derive(fullRun(), v, r).source, "LOOP.md");
  }
});

// ── the closed vocabulary (L36) ──────────────────────────────────────────────────────────────────────

test("L36 CLOSURE: SHIP_DECISION_FORMS is the whole vocabulary, and every form is reachable", () => {
  assert.equal(SHIP_DECISION_FORMS.length, 4, "non-vacuity + closure: losing or gaining a form must fail here");
  assert.deepEqual(
    SHIP_DECISION_FORMS.map((f) => f.form),
    ["gate2", "stop:<stage>", "stop:unknown", "undetermined"],
    "equality, not per-member presence — a variant spelling of ANY member fails"
  );

  // REACHABILITY, not just enumeration: each form must be PRODUCIBLE by the derivation. An enumeration
  // nothing can emit is a vocabulary for a function that does not exist.
  const produced = new Set([
    derive(fullRun(), "PASS", "no-regressions").decision,
    derive(fullRun(), "FAIL", "no-regressions").decision,
    derive([marker(1, "run-start")], "FAIL", "x").decision,
    // A run whose boundary cannot be established: markers, but no run-start.
    derive([marker(1, "stage-start", "pharn-build", 1)], "PASS", "no-regressions").decision,
  ]);
  assert.equal(produced.size, 4, "the four forms must be distinct and all reachable");
  for (const d of produced) assert.match(d, SHIP_DECISION_RE);

  // Exactly one form is parameterized, and it is the one at risk of a variant spelling.
  assert.equal(SHIP_DECISION_FORMS.filter((f) => f.parameterized).length, 1);
  // Exactly one form is FLOOR. The split is data the suite ranges over, not a sentence in a comment.
  assert.deepEqual(
    SHIP_DECISION_FORMS.filter((f) => f.floor).map((f) => f.form),
    ["gate2"],
    "only gate2 reduces to two sub-stage verdict enums; both stop: forms rest on marker discipline"
  );
});

test("★ NEGATIVE CONTROL: the closure regex REJECTS the near-misses a closure exists to catch", () => {
  const rejected = [
    "STOP_GREEN", // the LOOP vocabulary — a different command's decision must not validate here
    "STOP_CAP",
    "stopped:pharn-verify", // a variant of the stem
    "stop:", // the prefix with no stage
    "stop:Pharn-Verify", // case
    "stop:pharn verify", // a space
    "stop:../etc", // traversal
    "gate2 ", // trailing space
    "Gate2",
    "",
  ];
  assert.ok(rejected.length >= 10, "non-vacuity: the rejection domain must be non-empty");
  for (const d of rejected) assert.doesNotMatch(d, SHIP_DECISION_RE, `${JSON.stringify(d)} must NOT be in the vocabulary`);
  // And the control must be capable of passing, or it proves only that the regex rejects things.
  for (const d of [GATE2, `${STOP_PREFIX}pharn-verify`, `${STOP_PREFIX}${UNKNOWN_STAGE}`]) assert.match(d, SHIP_DECISION_RE);
});

// ── reading from disk ────────────────────────────────────────────────────────────────────────────────

test("readVerdict: every unusable input is null, and a usable one is the verdict string", () => {
  const root = scratch();
  try {
    mkdirSync(join(root, "f"), { recursive: true });
    const w = (n, body) => {
      writeFileSync(join(root, "f", n), body);
      return join(root, "f", n);
    };
    assert.equal(readVerdict(join(root, "f", "absent.json")), null, "absent is a REAL state on an early stop");
    assert.equal(readVerdict(w("torn.json", "{not json")), null);
    assert.equal(readVerdict(w("nokey.json", '{"other":1}')), null);
    assert.equal(readVerdict(w("wrongtype.json", '{"verdict":7}')), null);
    assert.equal(readVerdict(w("arr.json", "[1,2]")), null, "an array has no .verdict");
    assert.equal(readVerdict(w("ok.json", '{"verdict":"PASS"}')), "PASS");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readShipOutcome reads BOTH reports out of a real feature directory", () => {
  const root = scratch();
  try {
    const dir = join(root, "feat");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "verify-report.json"), JSON.stringify({ verdict: "PASS" }));
    writeFileSync(join(dir, "regression-report.json"), JSON.stringify({ verdict: "no-regressions" }));
    assert.equal(readShipOutcome(dir, fullRun()).decision, GATE2);

    // Flip ONE file on disk; the decision must follow the file, not the first read.
    writeFileSync(join(dir, "verify-report.json"), JSON.stringify({ verdict: "FAIL" }));
    assert.equal(readShipOutcome(dir, fullRun()).decision, `${STOP_PREFIX}pharn-verify`);

    // A directory with NO reports at all is the early-stop shape.
    const bare = join(root, "bare");
    mkdirSync(bare, { recursive: true });
    assert.equal(readShipOutcome(bare, fullRun()).decision, `${STOP_PREFIX}pharn-verify`);
    assert.equal(readShipOutcome(bare, []), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("lastStartedStage ignores every non-`stage-start` kind", () => {
  // The bound that makes the derivation correct: an `orchestrator` or `run-stop` marker carries no
  // stage, and must not reset or supply one.
  const m = [marker(1, "stage-start", "pharn-build", 1), marker(2, "orchestrator"), marker(3, "run-stop")];
  assert.equal(lastStartedStage(m), "pharn-build", "a trailing orchestrator/run-stop must not erase the stage");
  assert.equal(lastStartedStage([]), UNKNOWN_STAGE);
  assert.equal(lastStartedStage([marker(1, "run-start")]), UNKNOWN_STAGE);
});

// ===================================================================================================
// APPLICABILITY (6.9.1) — the verdict reports must belong to THIS run's latest attempt. Every expected
// decision is a literal. The reports are written to a real directory and read through the PRODUCTION
// reader (`readShipOutcome`), not only the pure function.
// ===================================================================================================

import { verdictApplicability, APPLICABILITY, UNDETERMINED } from "./ship-outcome-core.mjs";

/** Run 1: a complete ship run that reached GATE 2, then stopped. */
const run1 = () => [
  marker(1, "run-start"),
  marker(2, "stage-start", "pharn-plan"),
  marker(3, "stage-start", "pharn-build", 1),
  marker(4, "stage-start", "pharn-regress", 1),
  marker(5, "stage-start", "pharn-verify", 1),
  marker(6, "orchestrator"),
  marker(7, "run-stop"),
];

function greenDir() {
  const dir = scratch();
  writeFileSync(join(dir, "verify-report.json"), '{"verdict":"PASS"}');
  writeFileSync(join(dir, "regression-report.json"), '{"verdict":"no-regressions"}');
  return dir;
}

test("★ STALE RUN: a NEW invocation that stops at grill does NOT inherit the previous run's green reports", () => {
  const dir = greenDir();
  try {
    // Run 2 resumes the same `<name>` (/pharn-spec Step 1.1) and STOPs at grill.
    const markers = [
      ...run1(),
      marker(8, "run-start"),
      marker(9, "stage-start", "pharn-plan"),
      marker(10, "stage-start", "pharn-grill"),
      marker(11, "run-stop"),
    ];
    const o = readShipOutcome(dir, markers);
    assert.equal(o.decision, "stop:pharn-grill", "pre-fix (9d866ed) this was gate2");
    assert.equal(o.iterations, null, "the CURRENT run never reached an iterated stage");
    assert.equal(verdictApplicability(markers).status, APPLICABILITY.NOT_IN_RUN);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("APPLICABLE: current-run green reports keep gate2 (positive control)", () => {
  const dir = greenDir();
  try {
    assert.equal(readShipOutcome(dir, run1()).decision, GATE2);
    assert.equal(verdictApplicability(run1()).status, APPLICABILITY.CURRENT);
    // …and still after a SECOND full run on the same feature: its own stages are current.
    const second = [
      ...run1(),
      marker(8, "run-start"),
      marker(9, "stage-start", "pharn-build", 1),
      marker(10, "stage-start", "pharn-regress", 1),
      marker(11, "stage-start", "pharn-verify", 1),
    ];
    assert.equal(readShipOutcome(dir, second).decision, GATE2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MIXED: one stage in the current run and the other only in an earlier run cannot establish gate2", () => {
  const dir = greenDir();
  try {
    // Run 2 got as far as regress (fresh), then STOPped before verify: verify-report is run 1's.
    const markers = [
      ...run1(),
      marker(8, "run-start"),
      marker(9, "stage-start", "pharn-build", 1),
      marker(10, "stage-start", "pharn-regress", 1),
    ];
    assert.equal(readShipOutcome(dir, markers).decision, "stop:pharn-regress");
    assert.match(verdictApplicability(markers).reason, /no stage-start for pharn-verify/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RETRY: once iteration 2 has started, iteration 1's green pair is superseded — and a completed retry is current", () => {
  const dir = greenDir();
  try {
    const started = [...run1().slice(0, 6), marker(7, "stage-start", "pharn-build", 2)];
    assert.equal(readShipOutcome(dir, started).decision, "stop:pharn-build");
    assert.equal(verdictApplicability(started).latestIteration, 2);
    // Iteration 2 regress started but verify did not: still not both.
    const half = [...started, marker(8, "stage-start", "pharn-regress", 2)];
    assert.equal(readShipOutcome(dir, half).decision, "stop:pharn-regress");
    // POSITIVE CONTROL: both iteration-2 stages started → the (fresh) pair is applicable.
    const done = [...half, marker(9, "stage-start", "pharn-verify", 2)];
    assert.equal(readShipOutcome(dir, done).decision, GATE2);
    assert.equal(readShipOutcome(dir, done).iterations, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RESUME vs NEW INVOCATION: resuming (no new run-start) keeps the run's evidence; a new run-start does not", () => {
  const dir = greenDir();
  try {
    // GATE-1 resume: the stages simply continue after the halt in the SAME run.
    const resumed = [
      marker(1, "run-start"),
      marker(2, "stage-start", "pharn-plan"),
      marker(3, "orchestrator"),
      marker(4, "stage-start", "pharn-build", 1),
      marker(5, "stage-start", "pharn-regress", 1),
      marker(6, "stage-start", "pharn-verify", 1),
    ];
    assert.equal(readShipOutcome(dir, resumed).decision, GATE2);
    const reinvoked = [...resumed, marker(7, "run-stop"), marker(8, "run-start")];
    assert.equal(
      readShipOutcome(dir, reinvoked).decision,
      `${STOP_PREFIX}${UNKNOWN_STAGE}`,
      "a new run with no stage yet: no stage invented"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MISSING / MALFORMED reports are not silently current, and never become gate2", () => {
  const dir = scratch();
  try {
    assert.equal(readShipOutcome(dir, run1()).decision, "stop:pharn-verify", "both files absent");
    writeFileSync(join(dir, "verify-report.json"), "{not json");
    writeFileSync(join(dir, "regression-report.json"), '{"verdict":"no-regressions"}');
    assert.equal(readShipOutcome(dir, run1()).decision, "stop:pharn-verify", "malformed verify");
    writeFileSync(join(dir, "verify-report.json"), '{"verdict":"PASS"}');
    writeFileSync(join(dir, "regression-report.json"), "[]");
    assert.equal(readShipOutcome(dir, run1()).decision, "stop:pharn-verify", "an array is not a report");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("UNKNOWN boundary → undetermined: never gate2, never an invented stop stage, even with green reports", () => {
  const dir = greenDir();
  try {
    const cases = [
      ["no run-start", [marker(1, "stage-start", "pharn-regress", 1), marker(2, "stage-start", "pharn-verify", 1)]],
      [
        "malformed run-start ts",
        [
          { ...marker(1, "run-start"), ts: "yesterday" },
          marker(2, "stage-start", "pharn-regress", 1),
          marker(3, "stage-start", "pharn-verify", 1),
        ],
      ],
      [
        "a stage after run-stop (a skipped run-start)",
        [...run1(), marker(8, "stage-start", "pharn-regress", 1), marker(9, "stage-start", "pharn-verify", 1)],
      ],
    ];
    assert.equal(cases.length, 3, "NON-VACUITY (L34)");
    for (const [label, markers] of cases) {
      const o = readShipOutcome(dir, markers);
      assert.equal(o.decision, UNDETERMINED, label);
      assert.equal(o.iterations, null, label);
      assert.equal(verdictApplicability(markers).status, APPLICABILITY.UNKNOWN, label);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ RESIDUAL, PINNED (GRILL finding 1): a stage that STARTED and then REFUSED leaves the old report, and it is accepted", () => {
  // Markers prove a stage started in this attempt, never that it rewrote its report. This test pins
  // today's behaviour so a change to it is deliberate and visible — it is NOT a statement that this is
  // correct. Closing it needs a report-side run identity or a lifecycle invalidation in /pharn-ship.
  const dir = greenDir(); // run 1's PASS / no-regressions, never overwritten
  try {
    const run2 = [
      ...run1(),
      marker(8, "run-start"),
      marker(9, "stage-start", "pharn-regress", 1),
      marker(10, "stage-start", "pharn-verify", 1),
      marker(11, "run-stop"),
    ];
    assert.equal(readShipOutcome(dir, run2).decision, GATE2, "the named residual: refusal-after-start is invisible to markers");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
