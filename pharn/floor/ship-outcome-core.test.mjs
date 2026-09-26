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
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  GATE2,
  GATE2_QUICK,
  STOP_PREFIX,
  UNKNOWN_STAGE,
  OUTCOME_SOURCE,
  SHIP_DECISION_RE,
  SHIP_DECISION_FORMS,
  QUICK_VERDICT_STAGES,
  VERDICT_STAGES,
  deriveShipOutcome,
  readShipOutcome,
  readVerdict,
  lastStartedStage,
  recordedIterations,
  runMode,
  verdictStages,
} from "./ship-outcome-core.mjs";
// `verdictApplicability` and `APPLICABILITY` are imported further below (this file's existing
// APPLICABILITY section), and ES module imports hoist — importing the same binding twice is a
// SyntaxError, so the quick-mode tests above reuse that later import rather than re-declaring it here.

const scratch = () => mkdtempSync(join(tmpdir(), "pharn-ship-outcome-"));

/** A marker, shaped as `readMarkers()` hands them over. `ts`/`session_id` are irrelevant to this module
 *  — it reads `kind`, `stage` and `iteration` only — so they are present but unused, which keeps the
 *  fixture honest about the real record rather than a trimmed invention. `mode` (6.23.0) is omitted
 *  entirely unless given, exactly as a pre-6.23.0 marker (and a non-run-start marker) never carries it. */
const marker = (seq, kind, stage = null, iteration = null, mode) => ({
  seq,
  kind,
  stage,
  iteration,
  ts: `2026-09-22T00:00:${String(seq).padStart(2, "0")}.000Z`,
  session_id: "s1",
  ...(mode !== undefined ? { mode } : {}),
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

/** The marker trail a `--quick` ship run leaves (6.23.0): the run-start carries `mode: "quick"`, and there
 *  is no `pharn-regress` stage-start at all — a quick run never starts one. */
const quickRun = () => [
  marker(1, "run-start", null, null, "quick"),
  marker(2, "stage-start", "pharn-spec"),
  marker(3, "orchestrator"),
  marker(4, "stage-start", "pharn-plan"),
  marker(5, "orchestrator"),
  marker(6, "stage-start", "pharn-build", 1),
  marker(7, "orchestrator"),
  marker(8, "stage-start", "pharn-verify", 1),
  marker(9, "orchestrator"),
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
  assert.equal(SHIP_DECISION_FORMS.length, 5, "non-vacuity + closure: losing or gaining a form must fail here");
  assert.deepEqual(
    SHIP_DECISION_FORMS.map((f) => f.form),
    ["gate2", "gate2-quick", "stop:<stage>", "stop:unknown", "undetermined"],
    "equality, not per-member presence — a variant spelling of ANY member fails"
  );

  // REACHABILITY, not just enumeration: each form must be PRODUCIBLE by the derivation. An enumeration
  // nothing can emit is a vocabulary for a function that does not exist.
  const produced = new Set([
    derive(fullRun(), "PASS", "no-regressions").decision,
    derive(quickRun(), "PASS", "no-regressions").decision,
    derive(fullRun(), "FAIL", "no-regressions").decision,
    derive([marker(1, "run-start")], "FAIL", "x").decision,
    // A run whose boundary cannot be established: markers, but no run-start.
    derive([marker(1, "stage-start", "pharn-build", 1)], "PASS", "no-regressions").decision,
  ]);
  assert.equal(produced.size, 5, "the five forms must be distinct and all reachable");
  for (const d of produced) assert.match(d, SHIP_DECISION_RE);

  // Exactly one form is parameterized, and it is the one at risk of a variant spelling.
  assert.equal(SHIP_DECISION_FORMS.filter((f) => f.parameterized).length, 1);
  // Exactly two forms are FLOOR. The split is data the suite ranges over, not a sentence in a comment.
  assert.deepEqual(
    SHIP_DECISION_FORMS.filter((f) => f.floor).map((f) => f.form),
    ["gate2", "gate2-quick"],
    "gate2 and gate2-quick each reduce to tested non-LLM verdict enums; both stop: forms rest on marker discipline"
  );
});

// ── quick mode (6.23.0) ──────────────────────────────────────────────────────────────────────────────

test("runMode: quick iff the CURRENT run's run-start carries mode === quick; an earlier run's mode never leaks forward", () => {
  assert.equal(runMode(quickRun()), "quick");
  assert.equal(runMode(fullRun()), "full");
  assert.equal(runMode([]), "full");
  // Garbage/near-miss values read as full — the safe direction: a full reading needs a regress stage-start,
  // which a quick run never writes (the header's "A SKIPPED OR WRONG MODE MARKER NEVER YIELDS gate2").
  for (const bad of ["QUICK", "Quick", "fast", 1, true, ""]) {
    assert.equal(runMode([marker(1, "run-start", null, null, bad)]), "full", `mode=${JSON.stringify(bad)} must read as full`);
  }
  // A LATER full run-start after an earlier quick one: the earlier quick mode must not leak forward.
  const laterFull = [...quickRun(), marker(20, "run-start"), marker(21, "stage-start", "pharn-verify", 1)];
  assert.equal(runMode(laterFull), "full");
  // And the reverse: a later quick run-start after an earlier full one.
  const laterQuick = [...fullRun(), marker(20, "run-start", null, null, "quick"), marker(21, "stage-start", "pharn-verify", 1)];
  assert.equal(runMode(laterQuick), "quick");
});

test("verdictStages: full needs pharn-regress + pharn-verify; quick needs pharn-verify alone", () => {
  assert.deepEqual(verdictStages("full"), VERDICT_STAGES);
  assert.deepEqual(verdictStages("quick"), QUICK_VERDICT_STAGES);
  assert.deepEqual(QUICK_VERDICT_STAGES, ["pharn-verify"]);
});

test("verdictApplicability carries {mode, stages} alongside status, for both the CURRENT and UNKNOWN branches", () => {
  const cur = verdictApplicability(quickRun());
  assert.equal(cur.mode, "quick");
  assert.deepEqual(cur.stages, ["pharn-verify"]);
  const unk = verdictApplicability([]);
  assert.equal(unk.status, "unknown");
  assert.equal(unk.mode, "full");
  assert.deepEqual(unk.stages, VERDICT_STAGES);
});

test("gate2-quick: quick + current + verify PASS, regardless of any regress verdict on disk — it is NEVER consulted", () => {
  const q = quickRun();
  for (const regress of ["no-regressions", "regressions", "inconclusive", null, undefined]) {
    assert.equal(derive(q, "PASS", regress).decision, GATE2_QUICK, `regress=${JSON.stringify(regress)} must not matter`);
  }
});

test("a quick run whose verify did not PASS falls to stop:<stage>, never gate2-quick", () => {
  for (const [v, r] of [
    ["FAIL", "no-regressions"],
    ["INCOMPLETE", null],
    ["INCONCLUSIVE", null],
    [null, null],
  ]) {
    const d = derive(quickRun(), v, r).decision;
    assert.notEqual(d, GATE2_QUICK, `verify=${v}: must not be gate2-quick`);
    assert.notEqual(d, GATE2, `verify=${v}: must not be gate2 either`);
  }
});

test("a FULL run with no regress stage-start must NEVER derive gate2 (L37 probe)", () => {
  const noRegress = fullRun().filter((m) => m.stage !== "pharn-regress");
  const d = derive(noRegress, "PASS", "no-regressions").decision;
  assert.notEqual(d, GATE2, "a full run's own regress stage-start is still required for gate2");
  assert.notEqual(d, GATE2_QUICK, "and it must not silently read as a quick pass either");
  assert.equal(d, `${STOP_PREFIX}pharn-verify`);
});

test("a quick run's outcome with a `regressions` report on disk must still derive gate2-quick (L37 probe)", () => {
  assert.equal(derive(quickRun(), "PASS", "regressions").decision, GATE2_QUICK);
});

test("A SKIPPED OR WRONG MODE MARKER NEVER YIELDS gate2 — the value altered (the header's first and third bullets)", () => {
  // A quick run-start written WITHOUT --mode quick: reads as full, so with no regress stage-start its outcome
  // is stop:pharn-verify, never gate2.
  const noMode = quickRun().map((m) => (m.kind === "run-start" ? { ...m, mode: undefined } : m));
  assert.equal(derive(noMode, "PASS", "no-regressions").decision, `${STOP_PREFIX}pharn-verify`);
  // A full run whose run-start wrongly carries mode: "quick": yields gate2-quick at most, never the stronger
  // gate2 a genuine full run with a green regress would have earned.
  const wronglyQuick = fullRun().map((m) => (m.kind === "run-start" ? { ...m, mode: "quick" } : m));
  assert.equal(derive(wronglyQuick, "PASS", "no-regressions").decision, GATE2_QUICK);
});

// ── the marker ABSENT, not merely altered (6.23.0 GATE-2 review finding F1) ─────────────────────────────
//
// The test above only ever changed the run-start's VALUE. F1 removed the marker: a quick run whose run-start
// line was skipped JOINS the previous run's window, and when that run never wrote its run-stop, its
// `pharn-regress@1` completed the pair for the quick run's own `pharn-verify@1` — the derivation returned the
// FLOOR decision gate2 over a regress check that never ran on this build. Two conditions close it (the
// module header, APPLICABILITY): (a) a verdict stage-start counts only after the same iteration's latest
// pharn-build stage-start; (b) a non-verdict stage started twice at one iteration is a boundary that cannot
// be established → undetermined.

import { BUILD_STAGE, REPEATED_STAGE_REASON } from "./ship-outcome-core.mjs";
import { normalizeMarkers, readMarkers } from "./render-cost-ledger.mjs";

/** The markers a `--quick` ship run's prose prescribes AFTER its run-start, starting at `seq` — the run-start
 *  itself is omitted on purpose: these are the trails of a run whose run-start line was skipped. */
const quickTail = (seq) => [
  marker(seq, "stage-start", "pharn-plan"),
  marker(seq + 1, "orchestrator"),
  marker(seq + 2, "stage-start", "pharn-grill"),
  marker(seq + 3, "orchestrator"),
  marker(seq + 4, "stage-start", "pharn-test"),
  marker(seq + 5, "orchestrator"),
  marker(seq + 6, "stage-start", "pharn-build", 1),
  marker(seq + 7, "orchestrator"),
  marker(seq + 8, "stage-start", "pharn-verify", 1),
  marker(seq + 9, "orchestrator"),
  marker(seq + 10, "run-stop"),
];

test("★ REVIEW F1 REPRO: a quick run whose run-start was SKIPPED after an UNCLOSED full run never derives gate2", () => {
  const dir = greenDir(); // verify PASS (this run's) + a STALE no-regressions left by the earlier run
  try {
    // The reviewer's exact trail, through the same normalization the emitter applies.
    const markers = normalizeMarkers([
      marker(1, "run-start"),
      marker(2, "stage-start", "pharn-plan"),
      marker(3, "stage-start", "pharn-build", 1),
      marker(4, "stage-start", "pharn-regress", 1), // the earlier run, interrupted: no run-stop
      marker(5, "stage-start", "pharn-plan"), // the quick run, its run-start skipped
      marker(6, "stage-start", "pharn-build", 1),
      marker(7, "stage-start", "pharn-verify", 1),
      marker(8, "run-stop"),
    ]);
    const o = readShipOutcome(dir, markers);
    assert.equal(o.decision, UNDETERMINED, "before the GATE-2 fix this was the FLOOR decision gate2");
    assert.equal(o.iterations, null);
    assert.equal(verdictApplicability(markers).reason, REPEATED_STAGE_REASON);

    // The reviewer's two controls, unchanged in outcome: an earlier run that DID close → undetermined (a stage
    // marker after a run-stop), and a quick run-start written without --mode → stop:pharn-verify.
    const closed = normalizeMarkers([
      marker(1, "run-start"),
      marker(2, "stage-start", "pharn-plan"),
      marker(3, "stage-start", "pharn-build", 1),
      marker(4, "stage-start", "pharn-regress", 1),
      marker(5, "run-stop"),
      marker(6, "stage-start", "pharn-plan"),
      marker(7, "stage-start", "pharn-build", 1),
      marker(8, "stage-start", "pharn-verify", 1),
      marker(9, "run-stop"),
    ]);
    assert.equal(readShipOutcome(dir, closed).decision, UNDETERMINED);
    const withRunStartNoMode = normalizeMarkers([
      marker(1, "run-start"),
      marker(2, "stage-start", "pharn-plan"),
      marker(3, "stage-start", "pharn-build", 1),
      marker(4, "stage-start", "pharn-verify", 1),
      marker(5, "run-stop"),
    ]);
    assert.equal(readShipOutcome(dir, withRunStartNoMode).decision, `${STOP_PREFIX}pharn-verify`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ condition (a) ORDER: a verdict stage-start counts only AFTER the same iteration's latest pharn-build stage-start", () => {
  assert.equal(BUILD_STAGE, "pharn-build");
  // Condition (a) ALONE, with no repeat for (b) to see: an earlier regress stage-start that precedes this run's
  // build no longer completes the pair — the shape of F1 once the repeated markers are gone.
  const regressFirst = [
    marker(1, "run-start"),
    marker(2, "stage-start", "pharn-regress", 1),
    marker(3, "stage-start", "pharn-build", 1),
    marker(4, "stage-start", "pharn-verify", 1),
  ];
  assert.equal(derive(regressFirst, "PASS", "no-regressions").decision, `${STOP_PREFIX}pharn-verify`);
  assert.match(
    verdictApplicability(regressFirst).reason,
    /no stage-start for pharn-regress after its latest pharn-build stage-start at its latest iteration \(1\)/
  );

  // No build at the latest iteration at all → nothing for a verdict to be about.
  const noBuild = [marker(1, "run-start"), marker(2, "stage-start", "pharn-regress", 1), marker(3, "stage-start", "pharn-verify", 1)];
  assert.equal(derive(noBuild, "PASS", "no-regressions").decision, `${STOP_PREFIX}pharn-verify`);
  assert.match(verdictApplicability(noBuild).reason, /no pharn-build stage-start at its latest iteration \(1\)/);

  // The same rule in quick mode: a verify stage-start BEFORE the build is not this build's verify.
  const quickEarly = [
    marker(1, "run-start", null, null, "quick"),
    marker(2, "stage-start", "pharn-verify", 1),
    marker(3, "stage-start", "pharn-build", 1),
  ];
  assert.equal(derive(quickEarly, "PASS", null).decision, `${STOP_PREFIX}pharn-build`);

  // POSITIVE CONTROLS: the same markers in the order a run writes them.
  const ordered = [
    marker(1, "run-start"),
    marker(2, "stage-start", "pharn-build", 1),
    marker(3, "stage-start", "pharn-regress", 1),
    marker(4, "stage-start", "pharn-verify", 1),
  ];
  assert.equal(derive(ordered, "PASS", "no-regressions").decision, GATE2);
  const quickOrdered = [
    marker(1, "run-start", null, null, "quick"),
    marker(2, "stage-start", "pharn-build", 1),
    marker(3, "stage-start", "pharn-verify", 1),
  ];
  assert.equal(derive(quickOrdered, "PASS", null).decision, GATE2_QUICK);
});

test("★ condition (b) NO REPEAT: a non-verdict stage started twice at one iteration → undetermined; a repeated VERDICT stage is not a repeat", () => {
  // Every non-verdict stage a ship or loop run starts, repeated once at its own iteration.
  const repeats = [
    ["pharn-spec", null],
    ["pharn-plan", null],
    ["pharn-grill", null],
    ["pharn-test", null],
    ["pharn-build", 1],
  ];
  assert.equal(repeats.length, 5, "NON-VACUITY (L34)");
  for (const [stage, iteration] of repeats) {
    // Appended TWICE, so the pair repeats whether or not fullRun() already started that stage.
    const m = [...fullRun(), marker(12, "stage-start", stage, iteration), marker(13, "stage-start", stage, iteration)];
    const o = derive(m, "PASS", "no-regressions");
    assert.equal(o.decision, UNDETERMINED, `${stage}@${iteration} started twice`);
    assert.equal(o.iterations, null);
    assert.equal(verdictApplicability(m).status, APPLICABILITY.UNKNOWN);
    assert.equal(verdictApplicability(m).reason, REPEATED_STAGE_REASON);
  }
  // CONTROLS. /pharn-loop's freshness re-run starts a VERDICT stage again inside one iteration, after the build —
  // not a repeat; and Step 2b's build at iteration 2 is a different (stage, iteration) pair.
  for (const verdictStage of VERDICT_STAGES) {
    assert.equal(
      derive([...fullRun(), marker(12, "stage-start", verdictStage, 1)], "PASS", "no-regressions").decision,
      GATE2,
      verdictStage
    );
  }
  const retry = [
    ...fullRun(),
    marker(12, "stage-start", "pharn-build", 2),
    marker(13, "stage-start", "pharn-regress", 2),
    marker(14, "stage-start", "pharn-verify", 2),
  ];
  assert.equal(derive(retry, "PASS", "no-regressions").decision, GATE2);
});

test("★ a quick run that SKIPPED its run-start never inherits an earlier run: undetermined or stop:*, never gate2 or gate2-quick", () => {
  // Every earlier-run shape a compliant run can leave with at least one stage-start: each prefix of a full and
  // a quick run, closed (run-stop written) or not. Materialized once and iterated (L29).
  const FULL = [
    ["pharn-plan", null],
    ["pharn-grill", null],
    ["pharn-test", null],
    ["pharn-build", 1],
    ["pharn-regress", 1],
    ["pharn-verify", 1],
  ];
  const QUICK = FULL.filter(([s]) => s !== "pharn-regress");
  const shapes = [];
  for (const [mode, stages] of [
    [undefined, FULL],
    ["quick", QUICK],
  ]) {
    for (let k = 1; k <= stages.length; k++) {
      for (const closed of [false, true]) {
        const ms = [marker(1, "run-start", null, null, mode)];
        stages.slice(0, k).forEach(([stage, iteration], i) => ms.push(marker(2 + i, "stage-start", stage, iteration)));
        if (closed) ms.push(marker(ms.length + 1, "run-stop"));
        shapes.push({ label: `${mode ?? "full"} earlier run, ${k} stage(s), ${closed ? "closed" : "unclosed"}`, ms });
      }
    }
  }
  assert.equal(shapes.length, 22, "NON-VACUITY (L34): 6 full + 5 quick prefixes, each closed and unclosed");
  for (const { label, ms } of shapes) {
    const joined = [...ms, ...quickTail(ms.length + 1)];
    for (const [v, r] of [
      ["PASS", "no-regressions"],
      ["PASS", "regressions"],
      ["FAIL", "no-regressions"],
    ]) {
      const d = derive(joined, v, r).decision;
      assert.ok(d === UNDETERMINED || d.startsWith(STOP_PREFIX), `${label}, verify=${v} regress=${r}: got ${d}`);
    }
    // CONTROL: the same quick run WITH its run-start is a run of its own and reaches gate2-quick.
    const own = [...ms, marker(ms.length + 1, "run-start", null, null, "quick"), ...quickTail(ms.length + 2)];
    assert.equal(derive(own, "PASS", "regressions").decision, GATE2_QUICK, `${label}: control`);
  }
});

test("RESIDUAL, PINNED: an earlier run that left ONLY its run-start is byte-identical to resuming it — its mode is read, never gate2", () => {
  // A GATE-1 halt writes a run-start and no stage-start. A later quick run that skips its own run-start leaves a
  // trail no marker rule can tell from that SAME run resumed (the "RESUME" test below). Everything after the
  // run-start is this run's own; only the run-start's mode is inherited. Pinned so a change is deliberate.
  const tail = quickTail(2);
  assert.equal(derive([marker(1, "run-start", null, null, "quick"), ...tail], "PASS", "no-regressions").decision, GATE2_QUICK);
  assert.equal(derive([marker(1, "run-start"), ...tail], "PASS", "no-regressions").decision, `${STOP_PREFIX}pharn-verify`);
});

test("quick Step 2b: iteration 2's build supersedes iteration 1's verify; the retry's own verify, after it, is current", () => {
  // The retry has started building at iteration 2, so iteration 1's PASS is not this attempt's.
  const started = [...quickRun(), marker(10, "stage-start", "pharn-build", 2)];
  assert.equal(derive(started, "PASS", null).decision, `${STOP_PREFIX}pharn-build`);
  assert.equal(verdictApplicability(started).latestIteration, 2);
  // POSITIVE: the re-verify at iteration 2, after the re-build.
  const done = [...started, marker(11, "orchestrator"), marker(12, "stage-start", "pharn-verify", 2)];
  const o = derive(done, "PASS", "regressions");
  assert.equal(o.decision, GATE2_QUICK, "no regress verdict is read at iteration 2 either");
  assert.equal(o.iterations, 2);
  // A re-verify that PRECEDES the re-build is not the retry's verify (condition (a)).
  const early = [...quickRun(), marker(10, "stage-start", "pharn-verify", 2), marker(11, "stage-start", "pharn-build", 2)];
  assert.equal(derive(early, "PASS", null).decision, `${STOP_PREFIX}pharn-build`);
});

// ── ★ WIRING (L45): the COMMITTED /pharn-ship lines, executed, read back through the emitter's own reader ──

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHIP_CMD = join(REPO, ".claude", "commands", "pharn-ship.md");

/** The ONE line of pharn-ship.md matching `re` — asserted unique, so a second copy or a rewording fails. */
function shipLine(re, label) {
  const hits = readFileSync(SHIP_CMD, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => re.test(l));
  assert.equal(hits.length, 1, `expected ONE pinned ${label} line in pharn-ship.md, found ${hits.length}`);
  return hits[0];
}

/** Run the given committed lines, `<name>` substituted, in a scratch cwd whose `pharn/` links to this repo's;
 *  return the markers the emitter would read. No session id, so no pending start is adopted. */
function runCommitted(lines) {
  const cwd = mkdtempSync(join(tmpdir(), "pharn-ship-wiring-"));
  try {
    symlinkSync(join(REPO, "pharn"), join(cwd, "pharn"));
    const env = { ...process.env };
    delete env.CLAUDE_CODE_SESSION_ID;
    for (const line of lines) {
      const r = spawnSync("sh", ["-c", line.replaceAll("'<name>'", "'wiring-feat'")], { cwd, env, encoding: "utf8" });
      assert.equal(r.status, 0, `${line}\n${r.stdout}${r.stderr}`);
    }
    return readMarkers(join(cwd, ".pharn", "cost", "wiring-feat", "markers.jsonl"));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("★ WIRING — the committed QUICK run-start, build and verify lines derive gate2-quick; the committed FULL run-start line does not", () => {
  const quickStart = shipLine(
    /^node pharn\/floor\/mark-phase\.mjs --name '<name>' --kind run-start --adopt-pending --mode quick$/,
    "quick run-start"
  );
  const fullStart = shipLine(/^node pharn\/floor\/mark-phase\.mjs --name '<name>' --kind run-start --adopt-pending$/, "full run-start");
  const build1 = shipLine(
    /^node pharn\/floor\/mark-phase\.mjs --name '<name>' --kind stage-start --stage pharn-build --iteration 1$/,
    "build@1"
  );
  const verify1 = shipLine(
    /^node pharn\/floor\/mark-phase\.mjs --name '<name>' --kind stage-start --stage pharn-verify --iteration 1$/,
    "verify@1"
  );
  const dir = greenDir(); // verify PASS + a no-regressions report on disk
  try {
    const quick = runCommitted([quickStart, build1, verify1]);
    assert.equal(quick[0].mode, "quick", "the committed quick line must write mode: quick, and the reader must keep it");
    assert.equal(readShipOutcome(dir, quick).decision, GATE2_QUICK);
    // CONTROL: the committed FULL run-start over the same stage lines — no regress stage-start, so never gate2.
    const full = runCommitted([fullStart, build1, verify1]);
    assert.equal(full[0].mode, undefined, "the full line writes no mode key");
    assert.equal(readShipOutcome(dir, full).decision, `${STOP_PREFIX}pharn-verify`);
    // NEGATIVE CONTROL: the quick line with a value outside MARKER_MODES is refused (exit 2) and writes nothing.
    const cwd = mkdtempSync(join(tmpdir(), "pharn-ship-wiring-bad-"));
    try {
      symlinkSync(join(REPO, "pharn"), join(cwd, "pharn"));
      const r = spawnSync("sh", ["-c", quickStart.replace("--mode quick", "--mode fast").replaceAll("'<name>'", "'wiring-feat'")], {
        cwd,
        encoding: "utf8",
      });
      assert.equal(r.status, 2, r.stderr);
      assert.deepEqual(readMarkers(join(cwd, ".pharn", "cost", "wiring-feat", "markers.jsonl")), []);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SHIP_DECISION_RE closure rejects near-misses of gate2-quick", () => {
  for (const bad of ["gate2-Quick", "quick-gate2", "gate2_quick", "gate2-quick "]) {
    assert.doesNotMatch(bad, SHIP_DECISION_RE, `${JSON.stringify(bad)} must NOT be in the vocabulary`);
  }
  assert.match(GATE2_QUICK, SHIP_DECISION_RE);
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
    // Run 2 is COMPLIANT in its markers — it builds, then starts regress and verify — and both of those refuse
    // before rewriting a report. (Before 6.23.0 this fixture carried no pharn-build stage-start; since the
    // GATE-2 fix a verdict stage-start counts only after the same iteration's build, so the residual is pinned
    // on the trail a real run leaves.)
    const run2 = [
      ...run1(),
      marker(8, "run-start"),
      marker(9, "stage-start", "pharn-build", 1),
      marker(10, "stage-start", "pharn-regress", 1),
      marker(11, "stage-start", "pharn-verify", 1),
      marker(12, "run-stop"),
    ];
    assert.equal(readShipOutcome(dir, run2).decision, GATE2, "the named residual: refusal-after-start is invisible to markers");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
