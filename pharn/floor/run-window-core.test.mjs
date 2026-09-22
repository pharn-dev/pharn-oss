// pharn/floor/run-window-core.test.mjs — the `run-window/1` membership rule, edge by edge.
// Every expectation is an INDEPENDENT literal (L43): these tests never ask the module what it thinks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWindow, isMember, tsMs, UNKNOWN_REASONS, MEMBERSHIP_STATUSES, MEMBERSHIP_METHOD } from "./run-window-core.mjs";

const S = "00000000-0000-4000-8000-00000000aaaa";
const T = "00000000-0000-4000-8000-00000000bbbb";
const mk = (seq, kind, ts, session_id = S, stage = null) => ({ seq, kind, stage, iteration: null, ts, session_id });

test("method + status vocabulary are the documented literals", () => {
  assert.equal(MEMBERSHIP_METHOD, "run-window/1");
  assert.deepEqual([...MEMBERSHIP_STATUSES], ["bounded", "open", "unknown"]);
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
