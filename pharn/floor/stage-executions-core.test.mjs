// pharn/floor/stage-executions-core.test.mjs — the `executions` view (method `stage-start-to-return/1`), case by case:
// a normal stage, iterations, a same-stage re-run, every unmeasured reason, an unknown current run, quick mode, an
// interrupted run, and work attachment. Every expectation is an INDEPENDENT literal (L43): these tests never ask the
// module what it thinks, and an unmeasured row is always checked for `elapsed_ms: null`, never 0.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExecutions,
  latestMarkerAtOrBefore,
  unattachedWork,
  EXECUTIONS_METHOD,
  UNMEASURED_REASONS,
  EXECUTION_ROW_KEYS,
  EXECUTIONS_KEYS,
} from "./stage-executions-core.mjs";
import { attribute } from "./render-cost-ledger.mjs";
import { currentRunMarkers, UNKNOWN_REASONS } from "./run-window-core.mjs";

const S = "00000000-0000-4000-8000-00000000aaaa";
const T = "00000000-0000-4000-8000-00000000bbbb";
const at = (sec) => `2026-09-28T10:${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}.000Z`;
let seq = 0;
const reset = () => (seq = 0);
const m = (kind, sec, { stage = null, iteration = null, session = S } = {}) => ({
  seq: ++seq,
  kind,
  stage,
  iteration,
  ts: at(sec),
  session_id: session,
});
const start = (sec, stage, iteration = null, o = {}) => m("stage-start", sec, { stage, iteration, ...o });
const ret = (sec, o = {}) => m("orchestrator", sec, o);
const row = (stage, iteration, run, start_seq, end_seq, elapsed_ms, unmeasured = null, work = []) => ({
  stage,
  iteration,
  run,
  start_seq,
  end_seq,
  elapsed_ms,
  unmeasured,
  work,
});

test("one normal completed stage: stage-start → orchestrator return is one measured row", () => {
  reset();
  const markers = [m("run-start", 0), start(10, "pharn-plan"), ret(70), m("run-stop", 80)];
  const ex = buildExecutions(markers);
  assert.deepEqual(ex, { method: EXECUTIONS_METHOD, status: "derived", reason: null, rows: [row("pharn-plan", null, 1, 2, 3, 60000)] });
  assert.deepEqual(Object.keys(ex), [...EXECUTIONS_KEYS]);
  assert.deepEqual(Object.keys(ex.rows[0]), [...EXECUTION_ROW_KEYS]);
});

test("multiple iterations: each iteration's stages are their own rows, run 1 each", () => {
  reset();
  const markers = [
    m("run-start", 0),
    start(1, "pharn-build", 1),
    ret(11),
    start(12, "pharn-regress", 1),
    ret(42),
    start(43, "pharn-verify", 1),
    ret(53),
    start(60, "pharn-build", 2),
    ret(65),
    start(66, "pharn-regress", 2),
    ret(76),
    start(77, "pharn-verify", 2),
    ret(80),
    m("run-stop", 90),
  ];
  const got = buildExecutions(markers).rows.map((r) => [r.stage, r.iteration, r.run, r.elapsed_ms]);
  assert.deepEqual(got, [
    ["pharn-build", 1, 1, 10000],
    ["pharn-regress", 1, 1, 30000],
    ["pharn-verify", 1, 1, 10000],
    ["pharn-build", 2, 1, 5000],
    ["pharn-regress", 2, 1, 10000],
    ["pharn-verify", 2, 1, 3000],
  ]);
});

test("a same-stage re-run inside one iteration is a SECOND row (run 2) — never merged into the first", () => {
  reset();
  const markers = [
    m("run-start", 0),
    start(1, "pharn-verify", 1),
    ret(5),
    start(6, "pharn-verify", 1), // the freshness re-run writes its own pair
    ret(16),
    m("run-stop", 20),
  ];
  assert.deepEqual(buildExecutions(markers).rows, [row("pharn-verify", 1, 1, 2, 3, 4000), row("pharn-verify", 1, 2, 4, 5, 10000)]);
});

test("a stage with no iteration re-run (a re-plan) is plan run 2 — null iteration is its own group key", () => {
  reset();
  const markers = [m("run-start", 0), start(1, "pharn-plan"), ret(2), start(3, "pharn-plan"), ret(9), start(10, "pharn-build", 1), ret(11)];
  assert.deepEqual(
    buildExecutions(markers).rows.map((r) => [r.stage, r.iteration, r.run]),
    [
      ["pharn-plan", null, 1],
      ["pharn-plan", null, 2],
      ["pharn-build", 1, 1],
    ]
  );
});

test("missing end boundary: the last stage-start with no later marker is UNMEASURED no-end-marker, elapsed null (not 0)", () => {
  reset();
  const markers = [m("run-start", 0), start(1, "pharn-build", 1), ret(3), start(4, "pharn-regress", 1)];
  const rows = buildExecutions(markers).rows;
  assert.deepEqual(rows[1], row("pharn-regress", 1, 1, 4, null, null, "no-end-marker"));
  assert.equal(rows[0].elapsed_ms, 2000, "the completed stage before it keeps its measurement");
});

test("the next marker is not a return: no-return-marker — the next stage-start or run-stop is never used as the end", () => {
  reset();
  const a = [m("run-start", 0), start(1, "pharn-build", 1), start(9, "pharn-regress", 1), ret(12)];
  assert.deepEqual(buildExecutions(a).rows[0], row("pharn-build", 1, 1, 2, null, null, "no-return-marker"));
  assert.deepEqual(buildExecutions(a).rows[1], row("pharn-regress", 1, 1, 3, 4, 3000));
  reset();
  const b = [m("run-start", 0), start(1, "pharn-verify", 1), m("run-stop", 30)]; // a STOP straight after the stage
  assert.deepEqual(buildExecutions(b).rows, [row("pharn-verify", 1, 1, 2, null, null, "no-return-marker")]);
});

test("ambiguous or malformed pairs are unmeasured with their own reason, never guessed", () => {
  reset();
  const sess = [m("run-start", 0), start(1, "pharn-build", 1), ret(9, { session: T })];
  assert.deepEqual(buildExecutions(sess).rows[0], row("pharn-build", 1, 1, 2, 3, null, "session-changed"));
  reset();
  const back = [m("run-start", 0), start(20, "pharn-build", 1), ret(10)];
  assert.deepEqual(buildExecutions(back).rows[0], row("pharn-build", 1, 1, 2, 3, null, "clock-went-back"));
  reset();
  const badTs = [m("run-start", 0), start(1, "pharn-build", 1), { ...ret(9), ts: "yesterday" }];
  assert.deepEqual(buildExecutions(badTs).rows[0], row("pharn-build", 1, 1, 2, 3, null, "bad-timestamp"));
  reset();
  const equal = [m("run-start", 0), start(5, "pharn-build", 1), ret(5)];
  assert.equal(buildExecutions(equal).rows[0].elapsed_ms, 0, "a measured equal pair is 0 — measured, not unknown");
  assert.equal(buildExecutions(equal).rows[0].unmeasured, null);
  // Every reason the table names is reachable, and only those (closure, L36).
  assert.deepEqual([...UNMEASURED_REASONS].sort(), [
    "bad-timestamp",
    "clock-went-back",
    "foreign-work-inside",
    "no-end-marker",
    "no-return-marker",
    "session-changed",
  ]);
});

test("unknown current run: no run-start, or a marker after the run-stop → status unknown, NO rows", () => {
  reset();
  const noStart = [start(1, "pharn-build", 1), ret(2)];
  assert.deepEqual(buildExecutions(noStart), {
    method: EXECUTIONS_METHOD,
    status: "unknown",
    reason: UNKNOWN_REASONS.NO_RUN_START,
    rows: [],
  });
  reset();
  const afterStop = [m("run-start", 0), start(1, "pharn-build", 1), ret(2), m("run-stop", 3), start(4, "pharn-build", 2)];
  const ex = buildExecutions(afterStop);
  assert.equal(ex.status, "unknown");
  assert.equal(ex.reason, UNKNOWN_REASONS.MARKER_AFTER_STOP);
  assert.deepEqual(ex.rows, []);
  assert.deepEqual(buildExecutions([]), { method: EXECUTIONS_METHOD, status: "unknown", reason: UNKNOWN_REASONS.NO_MARKERS, rows: [] });
});

test("only the CURRENT run's markers count — an earlier invocation's stages are not rows", () => {
  reset();
  const markers = [
    m("run-start", 0),
    start(1, "pharn-build", 1),
    ret(2),
    m("run-stop", 3),
    m("run-start", 100),
    start(101, "pharn-build", 1),
    ret(111),
  ];
  assert.deepEqual(buildExecutions(markers).rows, [row("pharn-build", 1, 1, 6, 7, 10000)]);
});

test("quick mode: a stage the run skipped has NO row — nothing is represented as executed", () => {
  reset();
  const markers = [
    { ...m("run-start", 0), mode: "quick" },
    start(1, "pharn-build", 1),
    ret(4),
    start(5, "pharn-verify", 1), // /pharn-loop --quick writes no pharn-regress stage-start
    ret(9),
    m("run-stop", 10),
  ];
  const stages = buildExecutions(markers).rows.map((r) => r.stage);
  assert.deepEqual(stages, ["pharn-build", "pharn-verify"]);
  assert.ok(!stages.includes("pharn-regress"));
});

test("interrupted run (no run-stop, open window): every completed stage keeps its row; the unfinished one is unmeasured", () => {
  reset();
  const markers = [m("run-start", 0), start(1, "pharn-spec"), ret(31), start(32, "pharn-plan"), ret(92), start(93, "pharn-grill")];
  const ex = buildExecutions(markers);
  assert.equal(ex.status, "derived");
  assert.deepEqual(
    ex.rows.map((r) => [r.stage, r.elapsed_ms, r.unmeasured]),
    [
      ["pharn-spec", 30000, null],
      ["pharn-plan", 60000, null],
      ["pharn-grill", null, "no-end-marker"],
    ]
  );
});

test("work attachment: a record attaches to the execution whose stage-start is the latest marker at-or-before it, same stage", () => {
  reset();
  const markers = [
    m("run-start", 0),
    start(10, "pharn-regress", 1),
    ret(40),
    start(41, "pharn-verify", 1),
    ret(50),
    start(51, "pharn-regress", 2),
    ret(60),
  ];
  const work = [
    { stage: "pharn-regress", ts: at(39), session_id: S }, // inside regress iter 1
    { stage: "pharn-verify", ts: at(49), session_id: S }, // inside verify iter 1
    { stage: "pharn-regress", ts: at(59), session_id: null }, // null session binds all
    { stage: "pharn-verify", ts: at(58), session_id: S }, // a verify record inside a REGRESS execution: unattached
    { stage: "pharn-regress", ts: at(45), session_id: T }, // another session: its latest bound marker is the run-start
  ];
  const ex = buildExecutions(markers, work);
  assert.deepEqual(
    ex.rows.map((r) => r.work),
    [[0], [1], [2]]
  );
  assert.deepEqual(unattachedWork(ex, work), [3, 4]);
});

test("✧ PARITY with render-cost-ledger's attribute(): the latest-marker rule picks the same marker for requests and work", () => {
  reset();
  const markers = [
    m("run-start", 0),
    start(10, "pharn-build", 1),
    ret(20),
    start(20, "pharn-regress", 1), // same ts as the return: the higher seq wins in both
    ret(30, { session: T }),
    start(31, "pharn-verify", 1, { session: null }),
  ];
  const current = currentRunMarkers(markers);
  let n = 0;
  for (const sec of [0, 5, 10, 15, 20, 25, 30, 31, 40]) {
    for (const sid of [S, T, null]) {
      const mk = latestMarkerAtOrBefore(current, at(sec), sid);
      const a = attribute(markers, at(sec), sid);
      assert.deepEqual({ stage: mk?.stage ?? null, iteration: mk?.iteration ?? null }, a, `ts ${at(sec)} sid ${sid}`);
      n++;
    }
  }
  assert.equal(n, 27, "non-vacuity");
});

test("a null session binds any, as in attribution: a stage-start written with the variable unset still pairs", () => {
  reset();
  const markers = [m("run-start", 0), start(1, "pharn-build", 1, { session: null }), ret(9)];
  assert.deepEqual(buildExecutions(markers).rows[0], row("pharn-build", 1, 1, 2, 3, 8000));
});

test("GATE-2 — a skipped return AND a skipped start: another stage's work record inside the interval makes it unmeasured", () => {
  reset();
  // regress's return and verify's stage-start were both skipped, so regress's "next marker" is VERIFY's return.
  const markers = [m("run-start", 0), start(10, "pharn-regress", 1), ret(100), m("run-stop", 101)];
  const work = [
    { stage: "pharn-regress", ts: at(50), session_id: S },
    { stage: "pharn-verify", ts: at(99), session_id: S }, // verify's record, inside the regress interval
  ];
  const ex = buildExecutions(markers, work);
  assert.deepEqual(ex.rows, [row("pharn-regress", 1, 1, 2, 3, null, "foreign-work-inside", [0])]);
  assert.deepEqual(unattachedWork(ex, work), [1]);
  // Control: without the foreign record the same interval is measured — the BOUND the header states.
  assert.equal(buildExecutions(markers, [work[0]]).rows[0].elapsed_ms, 90000);
});

test("GATE-2 — a duplicate seq never re-homes a work record: rows are keyed by marker, not by seq", () => {
  const dup = [
    { seq: 1, kind: "run-start", stage: null, iteration: null, ts: at(0), session_id: S },
    { seq: 2, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: at(10), session_id: S },
    { seq: 3, kind: "orchestrator", stage: null, iteration: null, ts: at(20), session_id: S },
    { seq: 3, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: at(30), session_id: S },
    { seq: 4, kind: "orchestrator", stage: null, iteration: null, ts: at(40), session_id: S },
  ];
  const ex = buildExecutions(dup, [{ stage: "pharn-verify", ts: at(15), session_id: S }]);
  assert.deepEqual(
    ex.rows.map((r) => [r.run, r.work]),
    [
      [1, [0]],
      [2, []],
    ]
  );
});
