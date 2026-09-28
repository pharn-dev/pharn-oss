// pharn/floor/stage-executions-core.mjs — the STAGE EXECUTIONS view of the cost ledger (`cost.json`'s `executions`,
// `pharn/pharn-contracts/cost-ledger.md`, "Stage executions and deterministic work"). Pure: no I/O, no clock, no
// randomness. Imported by `render-cost-ledger.mjs` (to emit the view) AND `check-cost-ledger.mjs` (to hold the stored
// view to a recompute from the file's own `markers[]` and `work[]`), never copied ([[L35]]).
//
// ── WHAT IT ANSWERS ──────────────────────────────────────────────────────────────────────────────────────────────
// "How long did each stage execution of this run take, by PHARN's own clock, and which deterministic-work record
// belongs to it?" — from facts the ledger already records. No new marker, no new marker field, no change to the line
// `mark-phase.mjs` prints (that line binds the run to its context; this view never reads a transcript).
//
// ── THE METHOD (`stage-start-to-return/1`) ───────────────────────────────────────────────────────────────────────
// The orchestrators bracket every stage they mark: `stage-start --stage <s> [--iteration <N>]` right before it and
// `--kind orchestrator` right after it returns (a freshness re-run writes its own pair). So, over the CURRENT RUN's
// markers (`run-window-core.mjs currentRunMarkers`, the one definition), in `seq` order:
//   * every `stage-start` S is ONE execution row — two executions of one stage are never merged; `run` numbers the
//     rows sharing `(stage, iteration)` 1, 2, … in `seq` order;
//   * its end is the NEXT marker N, and only when N is an `orchestrator` marker. Anything else is UNMEASURED, with a
//     closed reason — the next stage-start or a run-stop is never used as an end, because that would pair by
//     proximity (a guess):
//       no-end-marker      no later marker in the current run (interrupted, or still running at emission)
//       no-return-marker   the next marker is not an orchestrator return (a skipped marker, or a stop)
//       session-changed    S and N are bound to different non-null sessions (the stage spanned a resume); a null
//                          session binds any, as it does for attribution
//       bad-timestamp      S or N carries no parseable ISO timestamp
//       clock-went-back    N's timestamp precedes S's
//       foreign-work-inside a work record of ANOTHER stage lies strictly inside (S, N): the return of this stage and
//                          the start of that one were both skipped, so N is not this stage's return (GATE-2 review)
//   * measured: `elapsed_ms = tsMs(N.ts) − tsMs(S.ts)`, an integer. An unmeasured row carries `elapsed_ms: null` and
//     NEVER 0 — zero means measured equal, unknown means not measured.
// BOUND, stated rather than claimed away: when this stage's return AND the next stage's start are both skipped, N is
// that later stage's return, and nothing in the markers says so. The one evidence that can — a work record of the
// other stage inside the interval — makes the row unmeasured (`foreign-work-inside`); a skipped pair around a stage that
// writes no work record (build, plan, …) is indistinguishable from one long execution and is measured as one.
// When the markers do not describe one run (`runWindow(markers, null)` is `unknown`: no run-start, a bad run-start or
// run-stop timestamp, a marker after the run-stop, a stop before the start) the view is `status: "unknown"` with that
// reason and NO rows. The CONTEXT half of membership (the transcript binding) does not touch this view: timing needs
// only markers, so a run whose transcript is missing still has its elapsed rows.
//
// ── WORK ATTACHMENT ──────────────────────────────────────────────────────────────────────────────────────────────
// A `work[]` record (`stage-work.mjs`, written by `/pharn-regress` or `/pharn-verify` at `done`) belongs to the
// execution whose `stage-start` is the LATEST current-run marker at-or-before the record's `ts` in the same session
// (a null session binds all) — the rule `render-cost-ledger.mjs attribute()` already applies to requests, restated
// here over current-run markers only, and pinned to it by a ✧ parity test — and only when that marker's `stage`
// equals the record's `stage`. Otherwise the record attaches to no row and is reported as unattached.
//
// ── HONEST SCOPE (P0) ────────────────────────────────────────────────────────────────────────────────────────────
// FLOOR: given the same markers and work records, the rows are a deterministic function (ordering + membership +
//   integer subtraction), and `check-cost-ledger.mjs` holds the stored view to this recompute.
// ADVISORY: that the markers describe what ran (they are Bash-written by command prose, L19), and what an interval
//   MEANS. It is OBSERVED WALL-CLOCK time between two `toISOString()` reads by two short-lived processes: not CPU
//   time, not model time, not tool time, not monotonic (a clock step moves it), and it includes orchestration,
//   subprocesses, waiting and any human answer given inside the stage. Nothing here decomposes it.

import { currentRunMarkers, runWindow, tsMs } from "./run-window-core.mjs";

/** The method name recorded in `executions.method`. Versioned: a change to the pairing rule is a new method. */
export const EXECUTIONS_METHOD = "stage-start-to-return/1";

/** The closed set of reasons an execution row is unmeasured (see the header). */
export const UNMEASURED_REASONS = Object.freeze([
  "no-end-marker",
  "no-return-marker",
  "session-changed",
  "bad-timestamp",
  "clock-went-back",
  "foreign-work-inside",
]);

/** The `executions` object's closed key set, and a row's. */
export const EXECUTIONS_KEYS = Object.freeze(["method", "status", "reason", "rows"]);
export const EXECUTION_ROW_KEYS = Object.freeze(["stage", "iteration", "run", "start_seq", "end_seq", "elapsed_ms", "unmeasured", "work"]);

/** Two markers are in one session unless both name one and they differ — a null (the variable was unset) binds any,
 *  exactly as it does in attribution and run membership. */
const sameSession = (a, b) => a === null || a === undefined || b === null || b === undefined || a === b;

/**
 * The latest current-run marker at-or-before `ts` bound to `sid` (a null on either side binds), ties broken by the
 * higher `seq` — the request attribution rule of `render-cost-ledger.mjs attribute()`, returning the marker itself.
 * `current` must already be the current run's markers. Returns null when none qualifies.
 */
export function latestMarkerAtOrBefore(current, ts, sid, msOf = (m) => tsMs(m.ts)) {
  const at = tsMs(ts);
  if (at === null) return null;
  let best = null;
  let bestMs = null;
  for (const m of current) {
    const t = msOf(m);
    if (t === null || t > at) continue;
    if (m.session_id !== null && m.session_id !== undefined && sid !== null && sid !== undefined && m.session_id !== sid) continue;
    if (best === null || t > bestMs || (t === bestMs && m.seq > best.seq)) {
      best = m;
      bestMs = t;
    }
  }
  return best;
}

/**
 * Build the `executions` view from a normalized marker list and the ledger's validated `work[]` records.
 * `work` entries need `stage`, `ts` and `session_id`; their INDEX in `work` is what a row's `work` lists.
 */
export function buildExecutions(markers, work = []) {
  const win = runWindow(markers, null);
  if (win.status === "unknown") return { method: EXECUTIONS_METHOD, status: "unknown", reason: win.reason, rows: [] };
  const current = currentRunMarkers(markers) ?? [];
  const rows = [];
  // Keyed by the MARKER OBJECT, never by `seq`: a duplicate `seq` (which the checker REDs) must not re-home a record.
  const rowByMarker = new Map();
  const spanOf = new Map(); // row -> [startMs, endMs] for a measured row
  const runs = new Map();
  for (let i = 0; i < current.length; i++) {
    const s = current[i];
    if (s.kind !== "stage-start") continue;
    const key = `${s.stage ?? ""}\u0000${s.iteration ?? ""}`;
    const run = (runs.get(key) ?? 0) + 1;
    runs.set(key, run);
    const n = i + 1 < current.length ? current[i + 1] : null;
    let endSeq = null;
    let elapsed = null;
    let unmeasured = null;
    if (n === null) unmeasured = "no-end-marker";
    else if (n.kind !== "orchestrator") unmeasured = "no-return-marker";
    else {
      endSeq = n.seq;
      const a = tsMs(s.ts);
      const b = tsMs(n.ts);
      if (!sameSession(s.session_id, n.session_id)) unmeasured = "session-changed";
      else if (a === null || b === null) unmeasured = "bad-timestamp";
      else if (b < a) unmeasured = "clock-went-back";
      else elapsed = b - a;
    }
    const measuredSpan = elapsed === null ? null : [tsMs(s.ts), tsMs(n.ts), s.session_id ?? null];
    const row = {
      stage: typeof s.stage === "string" ? s.stage : null,
      iteration: Number.isInteger(s.iteration) ? s.iteration : null,
      run,
      start_seq: s.seq,
      end_seq: endSeq,
      elapsed_ms: elapsed,
      unmeasured,
      work: [],
    };
    rows.push(row);
    rowByMarker.set(s, row);
    if (measuredSpan !== null) spanOf.set(row, measuredSpan);
  }
  // Each marker's timestamp is parsed ONCE (measured: re-parsing per record cost ~0.2 ms per record over 1,000 markers).
  const parsed = new Map(current.map((c) => [c, tsMs(c.ts)]));
  const msOf = (c) => parsed.get(c);
  const list = Array.isArray(work) ? work : [];
  list.forEach((w, idx) => {
    if (!w || typeof w !== "object") return;
    const m = latestMarkerAtOrBefore(current, w.ts, w.session_id ?? null, msOf);
    if (m === null || m.kind !== "stage-start" || m.stage !== w.stage) return;
    const row = rowByMarker.get(m);
    if (row) row.work.push(idx);
  });
  // A measured interval that contains ANOTHER stage's work record was not this stage's alone (see the header's BOUND).
  const workMs = list.map((w) => (w && typeof w === "object" ? tsMs(w.ts) : null)); // parsed once, like the markers
  for (const [row, [a, b, sid]] of spanOf) {
    const foreign = list.some((w, i) => {
      if (!w || typeof w !== "object" || w.stage === row.stage || !sameSession(sid, w.session_id ?? null)) return false;
      const t = workMs[i];
      return t !== null && t > a && t < b;
    });
    if (foreign) {
      row.elapsed_ms = null;
      row.unmeasured = "foreign-work-inside";
    }
  }
  return { method: EXECUTIONS_METHOD, status: "derived", reason: null, rows };
}

/** The indices of `work[]` no execution row lists — reported, never dropped. */
export function unattachedWork(executions, work) {
  const used = new Set();
  for (const r of executions?.rows ?? []) for (const i of r.work ?? []) used.add(i);
  const out = [];
  for (let i = 0; i < (Array.isArray(work) ? work.length : 0); i++) if (!used.has(i)) out.push(i);
  return out;
}
