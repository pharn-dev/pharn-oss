// pharn/floor/run-window-core.test.mjs — the `run-window/2` membership rule, edge by edge: the time window (the
// `run-window/1` rule, unchanged) and, since 6.29.0, the context half (binding, the context set, fail-closed).
// Every expectation is an INDEPENDENT literal (L43): these tests never ask the module what it thinks.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runWindow,
  isMember,
  isAfterWindow,
  tsMs,
  currentRunMarkers,
  bindingMarkers,
  bindRun,
  runContexts,
  agentContext,
  UNKNOWN_REASONS,
  CONTEXT_REASONS,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_METHOD,
  MEMBERSHIP_METHOD_V1,
  MEMBERSHIP_METHODS,
  MAIN_CONTEXT,
  AGENT_CONTEXT_PREFIX,
} from "./run-window-core.mjs";

const S = "00000000-0000-4000-8000-00000000aaaa";
const T = "00000000-0000-4000-8000-00000000bbbb";
const mk = (seq, kind, ts, session_id = S, stage = null) => ({ seq, kind, stage, iteration: null, ts, session_id });

test("method + status vocabulary are the documented literals", () => {
  assert.equal(MEMBERSHIP_METHOD, "run-window/2");
  assert.equal(MEMBERSHIP_METHOD_V1, "run-window/1");
  assert.deepEqual([...MEMBERSHIP_METHODS], ["run-window/1", "run-window/2"]);
  assert.ok(Object.isFrozen(MEMBERSHIP_METHODS));
  assert.deepEqual([...MEMBERSHIP_STATUSES], ["bounded", "open", "unknown"]);
});

test("the context vocabulary (6.29.0): `main`, `agent:<id>`, and exactly three context reasons, all members of UNKNOWN_REASONS", () => {
  assert.equal(MAIN_CONTEXT, "main");
  assert.equal(AGENT_CONTEXT_PREFIX, "agent:");
  assert.equal(agentContext("a0f1e2d3c4b5a6978"), "agent:a0f1e2d3c4b5a6978");
  assert.notEqual(agentContext("main"), MAIN_CONTEXT, "an agent whose id is `main` cannot collide with the session's thread");
  assert.deepEqual([...CONTEXT_REASONS], [UNKNOWN_REASONS.NO_CONTEXT, UNKNOWN_REASONS.AMBIGUOUS_CONTEXT, UNKNOWN_REASONS.UNLINKED_CONTEXT]);
  assert.ok(Object.isFrozen(CONTEXT_REASONS));
  assert.equal(new Set(Object.values(UNKNOWN_REASONS)).size, Object.keys(UNKNOWN_REASONS).length, "every reason is distinct");
  for (const r of CONTEXT_REASONS) assert.equal(typeof r, "string");
  assert.equal(Object.keys(UNKNOWN_REASONS).length, 10, "seven window reasons and three context reasons");
});

test("tsMs compares numerically across precision — '…:00Z' and '…:00.000Z' are the same instant", () => {
  assert.equal(tsMs("2026-09-21T10:00:00Z"), tsMs("2026-09-21T10:00:00.000Z"));
  // The lexical trap the grill named: as STRINGS these order the wrong way round.
  assert.ok("2026-09-21T10:00:00Z" > "2026-09-21T10:00:00.500Z");
  assert.ok(tsMs("2026-09-21T10:00:00Z") < tsMs("2026-09-21T10:00:00.500Z"));
  for (const bad of [null, undefined, 42, "", "yesterday", "2026-09-21", "2026-09-21 10:00:00Z", "2026-09-21T10:00:00"]) {
    assert.equal(tsMs(bad), null, `not a timestamp: ${JSON.stringify(bad)}`);
  }
});

test("bounded window: start and end are INCLUSIVE, one millisecond outside is out", () => {
  const w = runWindow([mk(1, "run-start", "2026-09-21T10:00:00.000Z"), mk(2, "run-stop", "2026-09-21T11:00:00.000Z")], S);
  assert.equal(w.status, "bounded");
  assert.equal(w.start, "2026-09-21T10:00:00.000Z");
  assert.equal(w.end, "2026-09-21T11:00:00.000Z");
  assert.equal(isMember(w, "2026-09-21T09:59:59.999Z", S), false);
  assert.equal(isMember(w, "2026-09-21T10:00:00.000Z", S), true);
  assert.equal(isMember(w, "2026-09-21T10:30:00.000Z", S), true);
  assert.equal(isMember(w, "2026-09-21T11:00:00.000Z", S), true);
  assert.equal(isMember(w, "2026-09-21T11:00:00.001Z", S), false);
  assert.equal(isMember(w, null, S), false, "a row with no timestamp cannot be placed in a window");
});

test("open window (no run-stop): everything from the start on is in", () => {
  const w = runWindow([mk(1, "run-start", "2026-09-21T10:00:00.000Z")], S);
  assert.equal(w.status, "open");
  assert.equal(w.end, null);
  assert.equal(isMember(w, "2026-09-21T23:00:00.000Z", S), true);
  assert.equal(isMember(w, "2026-09-21T09:00:00.000Z", S), false);
});

test("the LATEST run-start decides — a new invocation supersedes the old window", () => {
  const markers = [
    mk(1, "run-start", "2026-09-21T08:00:00.000Z"),
    mk(2, "run-stop", "2026-09-21T08:30:00.000Z"),
    mk(3, "run-start", "2026-09-21T10:00:00.000Z"),
    mk(4, "run-stop", "2026-09-21T10:30:00.000Z"),
  ];
  const w = runWindow(markers, S);
  assert.equal(w.status, "bounded");
  assert.equal(w.start, "2026-09-21T10:00:00.000Z");
  assert.equal(isMember(w, "2026-09-21T08:10:00.000Z", S), false, "the earlier invocation's request is out");
  assert.equal(isMember(w, "2026-09-21T10:10:00.000Z", S), true);
});

test("the LATEST run-stop closes the run — a re-emission extends, never truncates", () => {
  const w = runWindow(
    [
      mk(1, "run-start", "2026-09-21T10:00:00.000Z"),
      mk(2, "run-stop", "2026-09-21T10:30:00.000Z"),
      mk(3, "run-stop", "2026-09-21T10:40:00.000Z"),
    ],
    S
  );
  assert.equal(w.end, "2026-09-21T10:40:00.000Z");
  assert.equal(isMember(w, "2026-09-21T10:35:00.000Z", S), true);
});

test("a stage marker AFTER a run-stop without a new run-start is AMBIGUOUS → unknown, never a widened window", () => {
  // An old invocation's run-start, a skipped run-start, then the new invocation's stages and stop.
  const w = runWindow(
    [
      mk(1, "run-start", "2026-09-21T08:00:00.000Z"),
      mk(2, "run-stop", "2026-09-21T08:30:00.000Z"),
      mk(3, "stage-start", "2026-09-21T10:00:00.000Z", S, "pharn-plan"),
      mk(4, "run-stop", "2026-09-21T10:30:00.000Z"),
    ],
    S
  );
  assert.equal(w.status, "unknown");
  assert.equal(w.reason, UNKNOWN_REASONS.MARKER_AFTER_STOP);
  assert.equal(isMember(w, "2026-09-21T10:10:00.000Z", S), false, "unknown admits nothing");
});

test("missing / malformed start evidence → unknown, each with its own closed reason", () => {
  assert.equal(runWindow([], S).reason, UNKNOWN_REASONS.NO_MARKERS);
  assert.equal(runWindow(undefined, S).reason, UNKNOWN_REASONS.NO_MARKERS);
  assert.equal(runWindow([mk(1, "stage-start", "2026-09-21T10:00:00.000Z")], S).reason, UNKNOWN_REASONS.NO_RUN_START);
  assert.equal(runWindow([mk(1, "run-start", "not-a-time")], S).reason, UNKNOWN_REASONS.BAD_RUN_START_TS);
  // The LATEST run-start is invalid: an earlier valid one must NOT be used instead.
  const fallback = runWindow([mk(1, "run-start", "2026-09-21T08:00:00.000Z"), mk(2, "run-start", null)], S);
  assert.equal(fallback.reason, UNKNOWN_REASONS.BAD_RUN_START_TS);
  assert.equal(
    runWindow([mk(1, "run-start", "2026-09-21T10:00:00.000Z"), mk(2, "run-stop", "garbage")], S).reason,
    UNKNOWN_REASONS.BAD_RUN_STOP_TS
  );
  assert.equal(
    runWindow([mk(1, "run-start", "2026-09-21T10:00:00.000Z"), mk(2, "run-stop", "2026-09-21T09:00:00.000Z")], S).reason,
    UNKNOWN_REASONS.STOP_BEFORE_START
  );
});

test("resume in a NEW session: that session opens at ITS first marker, not at the run-start", () => {
  const markers = [
    mk(1, "run-start", "2026-09-21T10:00:00.000Z", S),
    mk(2, "stage-start", "2026-09-21T12:00:00.000Z", T, "pharn-plan"),
    mk(3, "run-stop", "2026-09-21T13:00:00.000Z", T),
  ];
  const w = runWindow(markers, T);
  assert.equal(w.status, "bounded");
  assert.equal(isMember(w, "2026-09-21T11:00:00.000Z", T), false, "session T's unrelated pre-resume work is out");
  assert.equal(isMember(w, "2026-09-21T12:00:00.000Z", T), true);
  assert.equal(isMember(w, "2026-09-21T11:00:00.000Z", S), true, "session S's own window opened at run-start");
});

test("a selected session with no current-run marker → unknown (not an observed zero)", () => {
  const w = runWindow([mk(1, "run-start", "2026-09-21T10:00:00.000Z", S)], T);
  assert.equal(w.status, "unknown");
  assert.equal(w.reason, UNKNOWN_REASONS.NO_SESSION_MARKER);
});

test("a null-session marker binds every session (the attribute() wildcard)", () => {
  const w = runWindow([mk(1, "run-start", "2026-09-21T10:00:00.000Z", null)], T);
  assert.equal(w.status, "open");
  assert.equal(isMember(w, "2026-09-21T10:01:00.000Z", T), true);
  assert.equal(isMember(w, "2026-09-21T09:59:00.000Z", T), false);
});

test("marker ORDER is by seq, not by array position", () => {
  const w = runWindow([mk(2, "run-stop", "2026-09-21T11:00:00.000Z"), mk(1, "run-start", "2026-09-21T10:00:00.000Z")], S);
  assert.equal(w.status, "bounded");
});

test("currentRunMarkers: from the LATEST run-start by seq; null with no run-start; order-independent", () => {
  const ms = [
    mk(4, "run-stop", "2026-09-21T10:30:00.000Z"),
    mk(1, "run-start", "2026-09-21T08:00:00.000Z"),
    mk(3, "run-start", "2026-09-21T10:00:00.000Z"),
    mk(2, "run-stop", "2026-09-21T08:30:00.000Z"),
  ];
  assert.deepEqual(
    currentRunMarkers(ms).map((m) => m.seq),
    [3, 4]
  );
  assert.equal(currentRunMarkers([mk(1, "stage-start", "2026-09-21T10:00:00.000Z")]), null);
  assert.equal(currentRunMarkers([]), null);
  assert.equal(currentRunMarkers(undefined), null);
  // An INVALID latest run-start still delimits the current run — validity is runWindow's call.
  assert.deepEqual(
    currentRunMarkers([mk(1, "run-start", "2026-09-21T08:00:00.000Z"), mk(2, "run-start", null)]).map((m) => m.seq),
    [2]
  );
});

test("isAfterWindow: strictly after a KNOWN end only — the end itself is a member, and open/unknown windows have no 'after' (6.14.1)", () => {
  const bounded = runWindow([mk(1, "run-start", "2026-09-21T10:00:00.000Z"), mk(2, "run-stop", "2026-09-21T11:00:00.000Z")], S);
  const open = runWindow([mk(1, "run-start", "2026-09-21T10:00:00.000Z")], S);
  const unknown = runWindow([], S);
  assert.equal(bounded.status, "bounded");
  assert.equal(open.status, "open");
  assert.equal(unknown.status, "unknown");
  // ONE table, one assertion loop (L29); each row an independent literal (L43).
  const CASES = [
    [bounded, "2026-09-21T11:00:00.000Z", false, "the end instant is a MEMBER, not after it"],
    [bounded, "2026-09-21T11:00:00.001Z", true, "one millisecond past the end"],
    [bounded, "2026-09-21T23:59:59Z", true, "later, at a different precision (compared as numbers)"],
    [bounded, "2026-09-21T10:30:00.000Z", false, "inside the window"],
    [bounded, "2026-09-21T09:00:00.000Z", false, "before the window is not after it"],
    [bounded, null, false, "no timestamp is never after anything"],
    [bounded, "yesterday", false, "an unparseable timestamp is never after anything"],
    [open, "2030-01-01T00:00:00.000Z", false, "an OPEN window has no end"],
    [unknown, "2030-01-01T00:00:00.000Z", false, "an UNKNOWN window has no end"],
    [null, "2030-01-01T00:00:00.000Z", false, "no window at all"],
  ];
  assert.ok(CASES.filter((c) => c[2]).length >= 2 && CASES.filter((c) => !c[2]).length >= 2, "non-vacuity: both verdicts are exercised");
  for (const [w, ts, want, why] of CASES) assert.equal(isAfterWindow(w, ts), want, why);
  // The two predicates never both hold: a request is a member, after the window, or neither.
  for (const [w, ts] of CASES) assert.ok(!(isMember(w, ts, S) && isAfterWindow(w, ts)), `member and after at once: ${ts}`);
});

// ── THE CONTEXT HALF (6.29.0, rules 5–8) ─────────────────────────────────────────────────────────────

test("bindingMarkers (rule 6): the CURRENT run's markers bound to the session, null binding every session, a bad ts never evidence", () => {
  const ms = [
    mk(1, "run-start", "2026-09-21T08:00:00.000Z"), // an earlier invocation: never evidence
    mk(2, "run-stop", "2026-09-21T08:30:00.000Z"),
    mk(5, "stage-start", "2026-09-21T10:05:00.000Z", T, "pharn-plan"), // bound to ANOTHER session
    mk(3, "run-start", "2026-09-21T10:00:00.000Z"),
    mk(4, "stage-start", "2026-09-21T10:01:00.000Z", null, "pharn-build"), // the null wildcard
    mk(6, "orchestrator", "not-a-time"), // unparseable: never evidence
    mk(7, "run-stop", "2026-09-21T10:30:00.000Z"),
  ];
  assert.deepEqual(
    bindingMarkers(ms, S).map((m) => m.seq),
    [3, 4, 7]
  );
  assert.deepEqual(
    bindingMarkers(ms, T).map((m) => m.seq),
    [4, 5],
    "each session binds on its own markers and the wildcard"
  );
  assert.deepEqual(bindingMarkers([], S), []);
  assert.deepEqual(bindingMarkers(undefined, S), [], "no markers binds nothing");
  assert.deepEqual(bindingMarkers([mk(1, "stage-start", "2026-09-21T10:00:00.000Z")], S), [], "no run-start: no current run");
});

test("bindRun (rule 6): exactly one context key binds; none, or only an undecidable one, is NO_CONTEXT; two or more is AMBIGUOUS_CONTEXT", () => {
  // ONE table (L29); each row an independent literal (L43).
  const CASES = [
    [[], { context: null, reason: UNKNOWN_REASONS.NO_CONTEXT }, "no holder"],
    [[null], { context: null, reason: UNKNOWN_REASONS.NO_CONTEXT }, "only an undecidable holder"],
    [["main"], { context: "main", reason: null }, "the session's own thread"],
    [["main", "main", "main"], { context: "main", reason: null }, "several lines, one context"],
    [["agent:a1"], { context: "agent:a1", reason: null }, "an agent"],
    [["main", "agent:a1"], { context: null, reason: UNKNOWN_REASONS.AMBIGUOUS_CONTEXT }, "a copy in a second context refuses"],
    [["main", null], { context: null, reason: UNKNOWN_REASONS.AMBIGUOUS_CONTEXT }, "a copy in an undecidable context refuses too"],
    [["agent:a1", "agent:a2"], { context: null, reason: UNKNOWN_REASONS.AMBIGUOUS_CONTEXT }, "two agents"],
    [[7], { context: null, reason: UNKNOWN_REASONS.NO_CONTEXT }, "a non-string holder is not a context"],
  ];
  for (const [holders, want, why] of CASES) assert.deepEqual(bindRun(holders), want, why);
  assert.deepEqual(bindRun(new Set(["main"])), { context: "main", reason: null }, "any iterable");
  assert.deepEqual(bindRun(undefined), { context: null, reason: UNKNOWN_REASONS.NO_CONTEXT }, "no holders at all");
});

const OPEN = Date.parse("2026-09-21T10:00:00.000Z");
const END = Date.parse("2026-09-21T11:00:00.000Z");
const at = (hhmm) => `2026-09-21T${hhmm}:00.000Z`;
/** The contexts the transcript names, each first named INSIDE the window unless a test says otherwise. */
const namedAt = (ctxs, ts = at("10:05")) => new Map(ctxs.map((c) => [c, ts]));

test("runContexts (rule 7): the bound context, the agents it spawned in the window, and theirs — never main unless main is the run", () => {
  const links = new Map([
    ["agent:in", { parent: "main", ts: at("10:10") }], // spawned by the run inside the window
    ["agent:grand", { parent: "agent:in", ts: at("10:20") }], // spawned by a member, inside: a member
    ["agent:before", { parent: "main", ts: at("09:59") }], // spawned by the run BEFORE the window: not the run's
    ["agent:after", { parent: "main", ts: at("11:01") }], // after the end
    ["agent:edge-open", { parent: "main", ts: at("10:00") }], // both bounds inclusive
    ["agent:edge-end", { parent: "main", ts: at("11:00") }],
    ["agent:child-of-before", { parent: "agent:before", ts: at("10:30") }], // inside, but its parent is not the run's
  ]);
  const named = namedAt(["main", ...links.keys(), "agent:nolink"]);
  const { member, contexts } = runContexts({ run: "main", links, openMs: OPEN, endMs: END, named });
  const CASES = [
    ["main", true],
    ["agent:in", true],
    ["agent:grand", true],
    ["agent:before", false],
    ["agent:after", false],
    ["agent:edge-open", true],
    ["agent:edge-end", true],
    ["agent:child-of-before", false],
    ["agent:nolink", null],
    [null, null],
    [undefined, null],
  ];
  for (const [ctx, want] of CASES) assert.equal(member(ctx), want, String(ctx));
  assert.deepEqual(
    contexts,
    ["agent:edge-end", "agent:edge-open", "agent:grand", "agent:in", "main"],
    "S, sorted, over what the transcript names"
  );
});

test("runContexts (rule 7): an AGENT as the run — main is out, its siblings are out, its own children are in", () => {
  const links = new Map([
    ["agent:run", { parent: "main", ts: at("09:00") }], // the run itself was spawned before its own window opened
    ["agent:sibling", { parent: "main", ts: at("10:10") }], // main is not the run, so main's children are not either
    ["agent:child", { parent: "agent:run", ts: at("10:10") }],
    ["agent:late-child", { parent: "agent:run", ts: at("11:30") }],
  ]);
  const { member, contexts } = runContexts({
    run: "agent:run",
    links,
    openMs: OPEN,
    endMs: END,
    named: namedAt(["main", ...links.keys()]),
  });
  assert.equal(member("agent:run"), true, "the bound context is in, whatever its own spawn time");
  assert.equal(member("main"), false);
  assert.equal(member("agent:sibling"), false);
  assert.equal(member("agent:child"), true);
  assert.equal(member("agent:late-child"), false);
  assert.deepEqual(contexts, ["agent:child", "agent:run"]);
});

test("runContexts (rule 8): unlinked, an unreadable spawn time, an undecidable parent and a cycle are UNDECIDABLE — never true", () => {
  const links = new Map([
    ["agent:bad-ts", { parent: "main", ts: "yesterday" }],
    ["agent:null-ts", { parent: "main", ts: null }],
    ["agent:null-parent", { parent: null, ts: at("10:10") }],
    ["agent:orphan-child", { parent: "agent:missing", ts: at("10:10") }],
    ["agent:c1", { parent: "agent:c2", ts: at("10:10") }],
    ["agent:c2", { parent: "agent:c1", ts: at("10:10") }],
    ["agent:out-null-parent", { parent: null, ts: at("09:00") }],
  ]);
  const { member, contexts } = runContexts({ run: "main", links, openMs: OPEN, endMs: END, named: namedAt([...links.keys()]) });
  for (const c of ["agent:bad-ts", "agent:null-ts", "agent:null-parent", "agent:orphan-child", "agent:c1", "agent:c2", "agent:missing"]) {
    assert.equal(member(c), null, c);
  }
  // The spawn test comes BEFORE the parent: spawned outside the window is decidably out, whatever the parent.
  assert.equal(member("agent:out-null-parent"), false);
  assert.deepEqual(contexts, ["main"], "only the run's own context, which it always holds");
  // A cycle is answered the same way however it is entered, and asking twice changes nothing.
  assert.equal(member("agent:c2"), null);
  assert.equal(member("agent:c1"), null);
});

test("runContexts: an OPEN run has no end, and a non-number opening makes every linked agent undecidable", () => {
  const links = new Map([["agent:late", { parent: "main", ts: at("23:00") }]]);
  assert.equal(runContexts({ run: "main", links, openMs: OPEN, endMs: null, named: new Map() }).member("agent:late"), true, "open: no end");
  const noOpening = runContexts({ run: "main", links, openMs: null, endMs: END, named: namedAt(["agent:late"]) });
  assert.equal(noOpening.member("agent:late"), null);
  assert.equal(noOpening.member("main"), true);
  assert.deepEqual(noOpening.contexts, ["main"]);
  // Not a Map: nothing is linked.
  assert.equal(runContexts({ run: "main", links: {}, openMs: OPEN, endMs: END, named: new Map() }).member("agent:late"), null);
});

test("runContexts (L58): `contexts` is reported over the contexts named AT OR BEFORE the window's end — a context first written after it never enters a closed run's set", () => {
  const links = new Map([
    ["agent:early", { parent: "main", ts: at("10:10") }],
    ["agent:late-first-line", { parent: "main", ts: at("10:50") }], // spawned inside; its first line lands after the end
    ["agent:at-end", { parent: "main", ts: at("10:50") }],
    ["agent:no-ts", { parent: "main", ts: at("10:50") }],
  ]);
  const named = new Map([
    ["main", at("09:00")],
    ["agent:early", at("10:11")],
    ["agent:late-first-line", at("11:01")],
    ["agent:at-end", at("11:00")], // inclusive
    ["agent:no-ts", null], // no line naming it carries a parseable time
  ]);
  const closed = runContexts({ run: "main", links, openMs: OPEN, endMs: END, named });
  assert.equal(closed.member("agent:late-first-line"), true, "it IS the run's: membership is unchanged");
  assert.deepEqual(
    closed.contexts,
    ["agent:at-end", "agent:early", "main"],
    "but it is not reported: nothing of it lies inside the window"
  );
  const open = runContexts({ run: "main", links, openMs: OPEN, endMs: null, named });
  assert.deepEqual(
    open.contexts,
    ["agent:at-end", "agent:early", "agent:late-first-line", "agent:no-ts", "main"],
    "an OPEN run reports every named member"
  );
  assert.deepEqual(
    runContexts({ run: "main", links, openMs: OPEN, endMs: END, named: ["agent:early"] }).contexts,
    ["main"],
    "not a Map: nothing is named but the run"
  );
});
