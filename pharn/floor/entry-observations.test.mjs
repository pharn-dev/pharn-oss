// entry-observations.test.mjs — the entry-gate observation record and its view (entry-observations.mjs). Arithmetic is
// tested over FIXED timestamps (controlled clocks); real processes are exercised in entry-gates.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, spawn } from "node:child_process";
import {
  OBS_SCHEMA,
  ENTRY_FILE,
  ENTRY_VIEW_METHOD,
  EVENT_KINDS,
  EVENT_KEYS,
  START_OUTCOMES,
  SEGMENT_ENDS,
  TERMINAL_SEGMENT_ENDS,
  LIFETIME_REASONS,
  SEGMENT_STATUSES,
  SEGMENT_COVERAGE,
  validateEntryEvent,
  identityKey,
  canonical,
  dedupeExact,
  recordEntryEvent,
  readEntryEvents,
  currentRunStart,
  buildEntryView,
  entryViewDefect,
  unionMs,
  intersectionMs,
} from "./entry-observations.mjs";
import { buildExecutions } from "./stage-executions-core.mjs";

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const T = (hms, ms = 0) => `2026-10-06T${hms}.${String(ms).padStart(3, "0")}Z`;
const N1 = "a".repeat(32);
const N2 = "b".repeat(32);
const S1 = "1".repeat(16);
const S2 = "2".repeat(16);
const S3 = "3".repeat(16);
const C1 = "c".repeat(16);
const C2 = "d".repeat(16);

/** A run: run-start, spec 10:00:01→10:05:00, plan 10:05:01→10:10:00, run-stop 11:00:00 (seq 1..6). */
function runMarkers({ stop = true, startSeq = 1 } = {}) {
  const m = (seq, kind, stage, ts) => ({ seq, kind, stage, iteration: null, ts, session_id: null });
  const list = [
    m(startSeq, "run-start", null, T("10:00:00")),
    m(startSeq + 1, "stage-start", "pharn-spec", T("10:00:01")),
    m(startSeq + 2, "orchestrator", null, T("10:05:00")),
    m(startSeq + 3, "stage-start", "pharn-plan", T("10:05:01")),
    m(startSeq + 4, "orchestrator", null, T("10:10:00")),
  ];
  if (stop) list.push(m(startSeq + 5, "run-stop", null, T("11:00:00")));
  return list;
}
const RUN = { seq: 1, ts: T("10:00:00") };

const ev = {
  start: (o = {}) => ({
    schema: OBS_SCHEMA,
    event: "start",
    nonce: N1,
    run: RUN,
    ts: T("10:00:00", 500),
    end_ts: T("10:00:00", 900),
    elapsed_ms: 400,
    outcome: "started",
    session_id: null,
    ...o,
  }),
  begin: (o = {}) => ({
    schema: OBS_SCHEMA,
    event: "segment-begin",
    nonce: N1,
    segment: S1,
    kind: "runner",
    ts: T("10:00:01"),
    session_id: null,
    ...o,
  }),
  end: (o = {}) => ({
    schema: OBS_SCHEMA,
    event: "segment-end",
    nonce: N1,
    segment: S1,
    kind: "runner",
    ts: T("10:03:00"),
    elapsed_ms: 178900,
    end: "done",
    gates: 3,
    session_id: null,
    ...o,
  }),
  wait: (o = {}) => ({
    schema: OBS_SCHEMA,
    event: "wait",
    nonce: N1,
    call: C1,
    ts: T("10:10:05"),
    end_ts: T("10:10:05", 200),
    elapsed_ms: 200,
    status: "green",
    takeover: null,
    session_id: null,
    ...o,
  }),
  abort: (o = {}) => ({
    schema: OBS_SCHEMA,
    event: "abort",
    nonce: N1,
    call: C2,
    ts: T("10:20:00"),
    stopped: true,
    wrote_result: true,
    session_id: null,
    ...o,
  }),
};

const view = (events, markers = runMarkers()) => buildEntryView(markers, events, buildExecutions(markers, []));
const only = (v) => {
  assert.equal(v.invocations.length, 1, "exactly one bound invocation");
  return v.invocations[0];
};

// ── the record ───────────────────────────────────────────────────────────────────────────────────────────────────────
test("validateEntryEvent: one valid sample per event kind; the kinds and their key sets are CLOSED (L36)", () => {
  const samples = { start: ev.start(), "segment-begin": ev.begin(), "segment-end": ev.end(), wait: ev.wait(), abort: ev.abort() };
  assert.deepEqual(Object.keys(samples).sort(), [...EVENT_KINDS].sort(), "a sample for every kind, and no other");
  assert.deepEqual(Object.keys(EVENT_KEYS).sort(), [...EVENT_KINDS].sort());
  for (const [kind, s] of Object.entries(samples)) {
    assert.deepEqual(validateEntryEvent(s), { ok: true }, kind);
    assert.deepEqual(Object.keys(s).sort(), [...EVENT_KEYS[kind]].sort(), `${kind}: the sample IS the key set`);
    for (const k of EVENT_KEYS[kind]) {
      const missing = { ...s };
      delete missing[k];
      assert.equal(validateEntryEvent(missing).ok, false, `${kind} without ${k}`);
    }
    assert.equal(validateEntryEvent({ ...s, extra: 1 }).ok, false, `${kind} with an extra key`);
  }
});

test("validateEntryEvent: enums, ids, timestamps and ranges refuse; L62 — a value whose String() throws is refused, never thrown", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: the value really makes String() throw");
  const cases = [
    ev.start({ outcome: "maybe" }),
    ev.start({ run: { seq: 0, ts: T("10:00:00") } }),
    ev.start({ run: { seq: 1 } }),
    ev.start({ ts: "yesterday" }),
    ev.start({ elapsed_ms: -1 }),
    ev.start({ elapsed_ms: 1.5 }),
    ev.start({ nonce: "A".repeat(32) }),
    ev.start({ session_id: "has space\n" }),
    ev.begin({ kind: "daemon" }),
    ev.begin({ segment: "123" }),
    ev.end({ end: "finished" }),
    ev.end({ gates: -2 }),
    ev.wait({ status: "maybe" }),
    ev.wait({ takeover: "zz" }),
    ev.abort({ stopped: "yes" }),
    ev.start({ outcome: hostile }),
    ev.wait({ status: hostile }),
    ev.end({ elapsed_ms: hostile }),
    { ...ev.start(), schema: hostile },
    hostile,
    [ev.start()],
    null,
  ];
  for (const c of cases) {
    let r;
    assert.doesNotThrow(() => (r = validateEntryEvent(c)));
    assert.equal(r.ok, false, JSON.stringify(c)?.slice(0, 80));
    assert.ok(!/toString/.test(r.reason), "a reason never quotes a value");
  }
  assert.deepEqual(
    [...TERMINAL_SEGMENT_ENDS],
    SEGMENT_ENDS.filter((e) => e !== "budget"),
    "budget is the one non-terminal end"
  );
  assert.deepEqual([...START_OUTCOMES], ["started", "no-gates", "init-refused", "spawn-failed"]);
});

test("identityKey / canonical / dedupeExact: one key per (nonce, event, id); key order never makes two lines different", () => {
  assert.equal(identityKey(ev.start()), `${N1}|start`);
  assert.equal(identityKey(ev.end()), `${N1}|segment-end|${S1}`);
  assert.equal(identityKey(ev.wait()), `${N1}|wait|${C1}`);
  const a = ev.wait();
  const reordered = Object.fromEntries(Object.entries(a).reverse());
  assert.equal(canonical(a), canonical(reordered));
  assert.deepEqual(dedupeExact([a, reordered, ev.wait({ call: C2 })]).length, 2);
});

// ── the view: lifecycle shapes over controlled clocks ───────────────────────────────────────────────────────────────
test("FINISHED BEFORE THE FIRST WAIT: lifetime = start → runner end; the segment is monotonic; unions and overlap are named intervals", () => {
  const v = view([ev.start(), ev.begin(), ev.end(), ev.wait()]);
  assert.equal(v.method, ENTRY_VIEW_METHOD);
  assert.equal(v.status, "derived");
  assert.deepEqual(v.run, RUN);
  assert.equal(v.cutoff_ts, T("11:00:00"), "a bounded window's cutoff is its run-stop");
  const x = only(v);
  assert.deepEqual(x.lifetime, { status: "measured", end_by: "runner", end_ts: T("10:03:00"), elapsed_ms: 179500, reason: null });
  assert.deepEqual(x.segments, [
    {
      segment: S1,
      kind: "runner",
      begin_ts: T("10:00:01"),
      end_ts: T("10:03:00"),
      elapsed_ms: 178900,
      status: "complete",
      end: "done",
      gates: 3,
    },
  ]);
  assert.equal(x.segment_coverage, "all");
  assert.equal(x.segments_union_ms, 179000, "wall-clock placement of the one segment");
  assert.equal(x.segments_overlap_marked_stages_ms, 179000, "the segment lies wholly inside the measured spec row");
  assert.equal(x.waits_union_ms, 200);
  assert.deepEqual(
    x.waits.map((w) => w.status),
    ["green"]
  );
  assert.equal(entryViewDefect(v), null);
});

test("STILL RUNNING AT THE WAIT + BUDGET CONTINUATIONS + TAKEOVER: each process its own segment; the takeover is never added to its wait", () => {
  const events = [
    ev.start(),
    ev.begin(), // the runner, killed: no end
    ev.begin({ segment: S2, kind: "takeover", ts: T("10:10:05") }),
    ev.end({ segment: S2, kind: "takeover", ts: T("10:19:00"), elapsed_ms: 534900, end: "budget", gates: 1 }),
    ev.wait({ call: C1, ts: T("10:10:04"), end_ts: T("10:19:01"), elapsed_ms: 537000, status: "continue", takeover: S2 }),
    ev.begin({ segment: S3, kind: "takeover", ts: T("10:19:10") }),
    ev.end({ segment: S3, kind: "takeover", ts: T("10:20:00"), elapsed_ms: 50000, end: "done", gates: 1 }),
    ev.wait({ call: C2, ts: T("10:19:09"), end_ts: T("10:20:01"), elapsed_ms: 52000, status: "red", takeover: S3 }),
  ];
  const x = only(view(events));
  assert.deepEqual(
    x.segments.map((s) => [s.kind, s.status, s.end]),
    [
      ["runner", "incomplete", null],
      ["takeover", "complete", "budget"],
      ["takeover", "complete", "done"],
    ]
  );
  assert.deepEqual(x.lifetime.status, "measured");
  assert.equal(x.lifetime.end_by, "takeover", "the budget-ended takeover is not terminal; the one that wrote the result is");
  assert.equal(x.segment_coverage, "partial", "the killed runner's segment cannot be placed");
  assert.equal(x.segments_union_ms, 535000 + 50000, "two disjoint takeovers");
  assert.equal(x.waits.length, 2);
  assert.equal(x.waits_union_ms, 537000 + 52000, "the wait calls, as wall intervals");
  // Never added: no field equals a sum of a wait and the segment inside it.
  const sums = new Set([537000 + 534900, 52000 + 50000, 537000 + 52000 + 534900 + 50000]);
  for (const k of ["segments_union_ms", "waits_union_ms", "segments_overlap_marked_stages_ms"]) assert.ok(!sums.has(x[k]), k);
  assert.equal(x.segments_overlap_marked_stages_ms, 0, "both takeovers ran after the last marked stage ended");
});

test("NO-GATES and INIT-FAILURE: no runner ever existed — a KNOWN zero (union 0, coverage all), lifetime ended by the start", () => {
  for (const outcome of ["no-gates", "init-refused", "spawn-failed"]) {
    const x = only(view([ev.start({ outcome, end_ts: T("10:00:01", 100) })]));
    assert.deepEqual(
      x.lifetime,
      { status: "measured", end_by: "start", end_ts: T("10:00:01", 100), elapsed_ms: 600, reason: null },
      outcome
    );
    assert.deepEqual(x.segments, []);
    assert.equal(x.segment_coverage, "all");
    assert.equal(x.segments_union_ms, 0);
  }
  const started = only(view([ev.start()]));
  assert.equal(started.segment_coverage, "none-observed", "a started runner with no segment recorded is NOT a zero");
  assert.equal(started.segments_union_ms, null);
  assert.equal(started.segments_overlap_marked_stages_ms, null);
  assert.equal(started.lifetime.status, "incomplete");
});

test("ABORT: an abort that wrote the result ends the lifetime; the killed runner's segment stays incomplete", () => {
  const x = only(view([ev.start(), ev.begin(), ev.abort()]));
  assert.deepEqual(x.lifetime, { status: "measured", end_by: "abort", end_ts: T("10:20:00"), elapsed_ms: 1199500, reason: null });
  assert.equal(x.segments[0].status, "incomplete");
  assert.equal(x.segments_union_ms, null, "no placeable segment: unknown, not 0");
  const noop = only(view([ev.start(), ev.begin(), ev.end(), ev.abort({ stopped: false, wrote_result: false })]));
  assert.equal(noop.lifetime.end_by, "runner", "an abort that found nothing running is an observation, never a terminal");
});

test("INTERRUPTED (no end, no abort): the lifetime is INCOMPLETE with a null elapsed — never the time 'so far'", () => {
  const x = only(view([ev.start(), ev.begin()]));
  assert.deepEqual(x.lifetime, { status: "incomplete", end_by: null, end_ts: null, elapsed_ms: null, reason: null });
  const endOnly = only(view([ev.start(), ev.end()]));
  assert.equal(endOnly.segments[0].status, "end-only", "an end with no begin keeps its monotonic elapsed, unplaced");
  assert.equal(endOnly.segments[0].elapsed_ms, 178900);
  assert.equal(endOnly.segments_union_ms, null);
  assert.equal(endOnly.lifetime.status, "measured", "its end record still ends the invocation");
});

test("CONSECUTIVE INVOCATIONS / MISSING RUN: only the start that recorded THIS run-start binds; others are counted unbound", () => {
  const markers = [
    ...runMarkers({ startSeq: 1 }),
    ...runMarkers({ startSeq: 7 }).map((m) => ({ ...m, ts: m.ts.replace("T10", "T12").replace("T11", "T13") })),
  ];
  const run2 = { seq: 7, ts: "2026-10-06T12:00:00.000Z" };
  const earlier = [ev.start(), ev.begin(), ev.end()]; // bound to run 1
  const later = [
    ev.start({ nonce: N2, run: run2, ts: "2026-10-06T12:00:00.500Z", end_ts: "2026-10-06T12:00:00.900Z" }),
    ev.begin({ nonce: N2, ts: "2026-10-06T12:00:01.000Z" }),
    ev.end({ nonce: N2, ts: "2026-10-06T12:01:00.000Z", elapsed_ms: 59000 }),
  ];
  const v = buildEntryView(markers, [...earlier, ...later], buildExecutions(markers, []));
  assert.deepEqual(v.run, run2, "the current run is the LATEST run-start");
  assert.deepEqual(
    v.invocations.map((i) => i.nonce),
    [N2]
  );
  assert.equal(v.unbound_events, 3, "the earlier invocation's events are counted, never attached");
  const noRun = view([ev.start({ run: null }), ev.begin()]);
  assert.equal(noRun.invocations.length, 0, "a start with no recorded run-start binds to no run");
  assert.equal(noRun.unbound_events, 2);
  const otherTs = view([ev.start({ run: { seq: 1, ts: T("09:00:00") } })]);
  assert.equal(otherTs.invocations.length, 0, "a reset .pharn/cost (same seq, other ts) reads UNBOUND, never this run");
});

test("DUPLICATES and CONFLICTS: an exact duplicate never counts twice; one identity with two contents is unmeasured, counted, never picked", () => {
  const dup = only(view([ev.start(), ev.begin(), ev.end(), ev.end(), ev.wait(), ev.wait()]));
  assert.equal(dup.segments.length, 1);
  assert.equal(dup.segments_union_ms, 179000);
  assert.equal(dup.waits.length, 1);
  assert.equal(dup.waits_union_ms, 200);
  const v = view([ev.start(), ev.begin(), ev.end(), ev.end({ elapsed_ms: 1 })]);
  const x = only(v);
  assert.equal(x.segments[0].status, "conflicting");
  assert.deepEqual(x.lifetime, { status: "unmeasured", end_by: null, end_ts: null, elapsed_ms: null, reason: "conflicting-records" });
  assert.equal(v.conflicting_events, 2);
  const two = only(view([ev.start(), ev.begin(), ev.end(), ev.abort()]));
  assert.equal(two.lifetime.reason, "multiple-terminal-events", "two end records are not resolved by picking the earlier");
  const back = only(view([ev.start(), ev.begin({ ts: T("09:59:00") }), ev.end({ ts: T("09:59:30") })]));
  assert.equal(back.lifetime.reason, "clock-went-back");
  assert.equal(back.lifetime.elapsed_ms, null);
  for (const r of LIFETIME_REASONS) assert.ok(["clock-went-back", "multiple-terminal-events", "conflicting-records"].includes(r));
});

test("OVERLAP: overlapping segments are never double-counted; overlap is |union(segments) ∩ union(measured stage rows)|", () => {
  assert.equal(
    unionMs([
      [0, 10],
      [5, 15],
    ]),
    15
  );
  assert.equal(
    unionMs([
      [0, 10],
      [20, 30],
    ]),
    20
  );
  assert.equal(unionMs([[5, 3]]), 0, "an inverted interval is not an interval");
  assert.equal(
    intersectionMs(
      [[0, 10]],
      [
        [5, 20],
        [8, 9],
      ]
    ),
    5
  );
  assert.equal(
    intersectionMs(
      [
        [0, 10],
        [5, 12],
      ],
      [[0, 100]]
    ),
    12,
    "the union is taken first"
  );
  const x = only(
    view([
      ev.start(),
      ev.begin({ segment: S1, ts: T("10:04:00") }),
      ev.end({ segment: S1, ts: T("10:06:00"), elapsed_ms: 120000 }),
      ev.begin({ segment: S2, kind: "takeover", ts: T("10:05:00") }),
      ev.end({ segment: S2, kind: "takeover", ts: T("10:07:00"), elapsed_ms: 120000, end: "budget" }),
    ])
  );
  assert.equal(x.segments_union_ms, 180000, "10:04→10:07, not 240000");
  // stage rows: spec 10:00:01→10:05:00, plan 10:05:01→10:10:00 → the 1 s gap between them is not covered.
  assert.equal(x.segments_overlap_marked_stages_ms, 179000);
});

test("WINDOW UNKNOWN: status unknown, no invocations — never a zero; the view's statuses and coverage are closed sets", () => {
  const v = buildEntryView([], [ev.start()], null);
  assert.equal(v.status, "unknown");
  assert.deepEqual(v.invocations, []);
  assert.equal(entryViewDefect(v), null);
  assert.deepEqual([...SEGMENT_STATUSES], ["complete", "incomplete", "end-only", "conflicting"]);
  assert.deepEqual([...SEGMENT_COVERAGE], ["all", "partial", "none-observed"]);
});

test("entryViewDefect: every view this module builds passes; a hand-edited one is named, never thrown on (L62)", () => {
  const good = view([ev.start(), ev.begin(), ev.end(), ev.wait(), ev.abort({ stopped: false, wrote_result: false })]);
  assert.equal(entryViewDefect(good), null);
  const hostile = JSON.parse('{"toString":1}');
  const edits = [
    (v) => (v.invocations[0].nonce = hostile),
    (v) => (v.invocations[0].lifetime.status = "fine"),
    (v) => (v.invocations[0].segments[0].elapsed_ms = "1s"),
    (v) => (v.invocations[0].waits[0].status = hostile),
    (v) => (v.extra = 1),
    (v) => (v.invocations[0].segments_union_ms = -5),
  ];
  for (const e of edits) {
    const v = structuredClone(good);
    e(v);
    let r;
    assert.doesNotThrow(() => (r = entryViewDefect(v)));
    assert.equal(typeof r, "string");
  }
});

// ── I/O ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const tmp = () => mkdtempSync(join(tmpdir(), "entry-obs-"));

test("recordEntryEvent → readEntryEvents: one line per event; an invalid event is refused; a torn final line is dropped, by index", () => {
  const root = tmp();
  const notes = [];
  const opts = { root, base: ".pharn/cost", note: (m) => notes.push(m) };
  assert.deepEqual(recordEntryEvent("feat", ev.start(), opts), { ok: true });
  assert.deepEqual(recordEntryEvent("feat", ev.begin(), opts), { ok: true });
  const refused = recordEntryEvent("feat", { ...ev.start(), outcome: "?" }, opts);
  assert.equal(refused.ok, false);
  assert.equal(notes.length, 1, "one note per failed write");
  assert.match(notes[0], /^note — an entry-gate observation for the cost ledger was not written/);
  const file = join(root, ".pharn/cost/feat", ENTRY_FILE);
  appendFileSync(file, '{"schema":"pharn-entry-obs'); // a torn append
  const r = readEntryEvents(file);
  assert.equal(r.records.length, 2);
  assert.deepEqual(r.dropped, ["entry.jsonl[2]"]);
  assert.deepEqual(readEntryEvents(join(root, "missing.jsonl")), { records: [], dropped: [] });
});

test("UNSAFE PATHS (L54/L59): a symlinked state directory or a link/FIFO at entry.jsonl is refused, never followed, never blocks", () => {
  const root = tmp();
  mkdirSync(join(root, "elsewhere"));
  mkdirSync(join(root, ".pharn"), { recursive: true });
  symlinkSync(join(root, "elsewhere"), join(root, ".pharn/cost"));
  const notes = [];
  const r = recordEntryEvent("feat", ev.start(), { root, base: ".pharn/cost", note: (m) => notes.push(m) });
  assert.equal(r.ok, false);
  assert.match(r.why, /symlink or not a directory/);
  assert.equal(notes.length, 1);

  const root2 = tmp();
  mkdirSync(join(root2, ".pharn/cost/feat"), { recursive: true });
  writeFileSync(join(root2, "target"), "");
  symlinkSync(join(root2, "target"), join(root2, ".pharn/cost/feat", ENTRY_FILE));
  assert.equal(recordEntryEvent("feat", ev.start(), { root: root2, base: ".pharn/cost", note: () => {} }).ok, false);
  assert.equal(readFileSync(join(root2, "target"), "utf8"), "", "nothing written through the link");
  assert.deepEqual(readEntryEvents(join(root2, ".pharn/cost/feat", ENTRY_FILE)), { records: [], dropped: ["entry.jsonl"] });

  const root3 = tmp();
  mkdirSync(join(root3, ".pharn/cost/feat"), { recursive: true });
  const fifo = join(root3, ".pharn/cost/feat", ENTRY_FILE);
  const mk = spawnSync("mkfifo", [fifo]);
  if (mk.status === 0) {
    const t0 = Date.now();
    assert.equal(recordEntryEvent("feat", ev.start(), { root: root3, base: ".pharn/cost", note: () => {} }).ok, false);
    assert.deepEqual(readEntryEvents(fifo), { records: [], dropped: ["entry.jsonl"] });
    assert.ok(Date.now() - t0 < 5000, "a planted FIFO never blocks the writer or the reader");
  }
  assert.equal(recordEntryEvent("../x", ev.start(), { root: root3, note: () => {} }).ok, false, "a non-slug feature");
});

test("CONCURRENT WRITERS: four processes appending at once leave only whole, valid lines (one write(2) per line, no lock)", async () => {
  const root = tmp();
  const mod = new URL("./entry-observations.mjs", import.meta.url).href;
  const script = `
    import { recordEntryEvent, OBS_SCHEMA } from ${JSON.stringify(mod)};
    const id = process.argv[1];
    for (let i = 0; i < 50; i++) {
      const call = (id + i.toString(16)).padStart(16, "0").slice(-16);
      recordEntryEvent("feat", { schema: OBS_SCHEMA, event: "wait", nonce: ${JSON.stringify(N1)}, call, ts: "2026-10-06T10:10:05.000Z",
        end_ts: "2026-10-06T10:10:05.200Z", elapsed_ms: 200, status: "continue", takeover: null, session_id: null }, { root: ${JSON.stringify(root)} });
    }`;
  const runs = ["1", "2", "3", "4"].map(
    (id) =>
      new Promise((res) => {
        const c = spawn(process.execPath, ["--input-type=module", "-e", script, id], { stdio: "ignore" });
        c.on("exit", res);
      })
  );
  await Promise.all(runs);
  const r = readEntryEvents(join(root, ".pharn/cost/feat", ENTRY_FILE));
  assert.deepEqual(r.dropped, [], "no torn or interleaved line");
  assert.equal(r.records.length, 200);
});

test("currentRunStart: the LATEST run-start by seq (a torn last line ignored); no markers file or a non-slug → null (the link case is REVIEW F6)", () => {
  const root = tmp();
  const prev = process.cwd();
  process.chdir(root);
  try {
    assert.equal(currentRunStart("feat"), null, "no markers file");
    mkdirSync(".pharn/cost/feat", { recursive: true });
    const lines = [
      { seq: 1, kind: "run-start", stage: null, iteration: null, ts: T("09:00:00"), session_id: null },
      { seq: 2, kind: "run-stop", stage: null, iteration: null, ts: T("09:30:00"), session_id: null },
      { seq: 3, kind: "run-start", stage: null, iteration: null, ts: T("10:00:00"), session_id: null },
      { seq: 4, kind: "stage-start", stage: "pharn-spec", iteration: null, ts: T("10:00:01"), session_id: null },
    ];
    writeFileSync(".pharn/cost/feat/markers.jsonl", lines.map((l) => JSON.stringify(l)).join("\n") + '\n{"seq":5,"kind":"run-st');
    assert.deepEqual(currentRunStart("feat"), { seq: 3, ts: T("10:00:00") });
    assert.equal(currentRunStart("../feat"), null);
  } finally {
    process.chdir(prev);
  }
});

// ── GATE-2 review fixes (each finding pinned by a test) ──────────────────────────────────────────────────────────────
import { isAdmitted, readEntryEventsFor, stateDirState } from "./entry-observations.mjs";
import { runWindow } from "./run-window-core.mjs";

test("REVIEW F2 — admission tests EVERY timestamp: a start or wait call that ENDED after the run-stop is not a fact", () => {
  const win = runWindow(runMarkers(), null); // run-stop 11:00
  assert.equal(isAdmitted(win, ev.start()), true);
  assert.equal(isAdmitted(win, ev.start({ end_ts: T("11:00:01") })), false, "begun inside, ended after the cutoff");
  assert.equal(isAdmitted(win, ev.wait({ ts: T("10:59:00"), end_ts: T("11:30:00") })), false);
  assert.equal(isAdmitted(win, ev.end({ ts: T("11:00:01") })), false, "an end after the cutoff (control)");
  assert.equal(isAdmitted(win, ev.end({ ts: T("11:00:00") })), true, "the cutoff itself is inside");
  assert.equal(isAdmitted(win, JSON.parse('{"toString":1}')), false, "total (L62)");
});

test("REVIEW F3 — nothing observed is null, never 0: no wait call → waits_union_ms null; no measured stage row → overlap null", () => {
  const noWait = only(view([ev.start(), ev.begin(), ev.end()]));
  assert.equal(noWait.waits_union_ms, null);
  const noRows = only(buildEntryView(runMarkers(), [ev.start(), ev.begin(), ev.end()], null));
  assert.equal(noRows.segments_union_ms, 179000, "the segment itself is measured");
  assert.equal(noRows.segments_overlap_marked_stages_ms, null, "nothing to place it against");
  assert.equal(entryViewDefect(buildEntryView(runMarkers(), [ev.start(), ev.begin(), ev.end()], null)), null);
});

test("REVIEW F4 — a nonce whose start records CONFLICT binds to no run (left unattached and counted), even if one names this run", () => {
  const v = view([ev.start(), ev.start({ run: { seq: 9, ts: T("10:30:00") } }), ev.begin(), ev.end()]);
  assert.equal(v.invocations.length, 0);
  assert.equal(v.conflicting_events, 2);
  assert.equal(v.unbound_events, 4, "every line of the contested nonce is counted, none attached");
});

test("REVIEW F5 — a begin/end pair that disagrees on kind is a CONFLICT: counted, and the lifetime is unmeasured, not incomplete", () => {
  const v = view([ev.start(), ev.begin(), ev.end({ kind: "takeover" })]);
  const x = only(v);
  assert.equal(x.segments[0].status, "conflicting");
  assert.equal(v.conflicting_events, 2);
  assert.deepEqual([x.lifetime.status, x.lifetime.reason], ["unmeasured", "conflicting-records"]);
});

test("REVIEW F6 — the READ side refuses a linked directory chain: a symlinked .pharn/cost or feature directory is never read through", () => {
  const root = tmp();
  const prev = process.cwd();
  process.chdir(root);
  try {
    mkdirSync("elsewhere/feat", { recursive: true });
    writeFileSync("elsewhere/feat/entry.jsonl", JSON.stringify(ev.start()) + "\n");
    writeFileSync("elsewhere/feat/markers.jsonl", JSON.stringify({ seq: 1, kind: "run-start", ts: T("10:00:00") }) + "\n");
    mkdirSync(".pharn");
    symlinkSync(join(root, "elsewhere"), ".pharn/cost");
    assert.equal(stateDirState("feat", ".pharn/cost"), "unsafe");
    assert.deepEqual(readEntryEventsFor("feat", ".pharn/cost"), { records: [], dropped: ["entry.jsonl"] }, "nothing read through the link");
    assert.equal(currentRunStart("feat"), null, "the run-start is not read through a link either");
    assert.equal(readEntryEvents(".pharn/cost/feat/entry.jsonl").records.length, 1, "control: the low-level reader alone WOULD follow it");
    assert.equal(stateDirState("other", "absent-base"), "absent");
    assert.deepEqual(readEntryEventsFor("other", "absent-base"), { records: [], dropped: [] });
    mkdirSync("real/feat", { recursive: true });
    assert.equal(stateDirState("feat", "real"), "ok");
  } finally {
    process.chdir(prev);
  }
});
