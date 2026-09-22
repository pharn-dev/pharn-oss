// pharn/floor/run-window-core.mjs — the ONE definition of RUN MEMBERSHIP for the cost ledger
// (`pharn/pharn-contracts/cost-ledger.md`, method `run-window/1`). Pure: no I/O, no clock, no randomness.
// Imported by `render-cost-ledger.mjs` (to decide which rows to emit) AND by `check-cost-ledger.mjs` (to
// re-test every emitted row against the ledger's own recorded markers). Never copied — a second encoding
// of the rule is where the two would drift apart ([[L35]], [[L31]]).
//
// ── WHY THIS EXISTS (P7 — a real failure, not a hypothetical) ────────────────────────────────────────
// Through `pharn-cost-ledger/1`, markers decided only the stage VIEW (`attribute()`), never the request
// POPULATION: every usage-bearing request of the selected session was emitted and summed. A session that
// spent 100 input tokens on unrelated work and then 10 inside a PHARN run reported 110, `unattributed`
// swallowed the 100, and the checker was GREEN — self-consistent and false ([[L43]]).
//
// ── MEMBERSHIP AND ATTRIBUTION ARE SEPARATE DECISIONS ────────────────────────────────────────────────
// This module answers ONLY "is this request part of the run?". Which stage it belongs to is still
// `attribute()`'s job, run afterwards and only on members. A member with no preceding stage marker is
// `unattributed` in the stage VIEW and still counts in the run's totals.
//
// ── THE RULE (`run-window/1`) ────────────────────────────────────────────────────────────────────────
//  1. The CURRENT RUN is the markers from the LAST `run-start` (by `seq`) onward. A new invocation always
//     writes a fresh `run-start`, so an earlier invocation's markers — and its requests — fall outside.
//     Resuming writes no `run-start`, so a resumed run keeps its window.
//  2. The run is CLOSED by the LAST `run-stop` in the current run (a re-emission of the same invocation
//     extends, never truncates), or OPEN when there is none.
//  3. Each SESSION's window opens at the EARLIEST current-run marker bound to it; a marker whose
//     `session_id` is null binds every session (the wildcard `attribute()` already applies). So a run
//     resumed in a NEW session does not absorb that session's unrelated pre-resume work.
//  4. A request is a MEMBER iff its timestamp parses, opening(session) <= ts, and (open, or ts <= end).
//     Both bounds are inclusive — the at-or-before convention `attribute()` uses.
//
// ── FAIL CLOSED ON AMBIGUITY (status `unknown`, never a guessed window) ──────────────────────────────
// The rule above is correct for a compliant run and fails OPEN when a boundary marker is skipped: an old
// invocation's `run-start` plus a new invocation's `run-stop` would bracket the unrelated gap between
// them. So any evidence that the markers do NOT describe one run makes membership UNKNOWN (surfaced at
// GRILL, finding 1). The reasons are a closed set, `UNKNOWN_REASONS`.
//
// ── TIMESTAMPS ARE COMPARED AS NUMBERS ───────────────────────────────────────────────────────────────
// ISO strings sort lexically only at equal precision: `…:00Z` sorts AFTER `…:00.000Z` because `Z` > `.`.
// Every comparison here goes through `tsMs()` (epoch milliseconds, `Date.parse` after a shape test), and
// an unparseable timestamp is never a member (surfaced at GRILL, finding 2).
//
// ── HONEST SCOPE (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR: given the same markers, the same session and the same timestamps, membership is a deterministic
//   ordering test (primitive #3 + integer compare). `check-cost-ledger.mjs` re-applies it to every row.
// ADVISORY: that the MARKERS describe the run. They are written by Bash calls in command prose, outside
//   the `PreToolUse` gate (L19); a skipped, stale or mistimed marker mis-bounds a window this module then
//   computes faithfully. Membership is exact RELATIVE TO THE RECORDED MARKERS, never to the truth.
// INHERENT GAP: the request that ISSUES a marker call precedes the marker it writes, so it falls before
//   the window it opens. Correcting that would be a guess.

export const MEMBERSHIP_METHOD = "run-window/1";

/** The membership status enum. `unknown` is never shown as a number — see `cost-ledger.md`. */
export const MEMBERSHIP_STATUSES = Object.freeze(["bounded", "open", "unknown"]);

/** The CLOSED set of reasons membership can be unknown. A reason outside it is a bug, not a new state. */
export const UNKNOWN_REASONS = Object.freeze({
  NO_MARKERS: "no phase markers were recorded for this run",
  NO_RUN_START: "no run-start marker was recorded",
  BAD_RUN_START_TS: "the latest run-start marker carries no valid timestamp",
  BAD_RUN_STOP_TS: "a run-stop marker of the current run carries no valid timestamp",
  STOP_BEFORE_START: "the run-stop marker precedes the run-start marker",
  MARKER_AFTER_STOP: "a stage or orchestrator marker follows a run-stop without a new run-start — the markers may span two invocations",
  NO_SESSION_MARKER: "no marker of the current run is bound to the selected session",
});

/** An ISO-8601 timestamp with an explicit offset. The shape test runs BEFORE `Date.parse`, which would
 *  otherwise accept locale-ish strings and date-only forms with an implementation-defined time zone. */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

/** Epoch milliseconds, or `null` when the value is not an ISO-8601 timestamp. */
export function tsMs(ts) {
  if (typeof ts !== "string" || !ISO_RE.test(ts)) return null;
  const n = Date.parse(ts);
  return Number.isFinite(n) ? n : null;
}

const unknown = (reason) => ({ status: "unknown", reason, start: null, end: null, startMs: null, endMs: null, openings: null });

/**
 * Compute the run window for `session` from a marker list.
 *
 * `markers` is the normalized marker array (`{seq, kind, stage, iteration, ts, session_id}`), in any
 * order. `session` is the SELECTED session id (or null when none is known). Returns
 * `{status, reason, start, end, startMs, endMs, openings}` — `start`/`end` are the recorded marker `ts`
 * strings, `openings` a function session -> opening ms (or null).
 */
/**
 * The CURRENT RUN's markers: every marker from the LATEST `run-start` (by `seq`) onward, `seq`-sorted —
 * or `null` when there is no `run-start` at all. THE ONE definition of "the current run" ([[L35]]):
 * membership (`runWindow`, below) and `/pharn-ship`'s verdict applicability (`ship-outcome-core.mjs`)
 * both read it, so the two can never disagree about which invocation is current. Validity of the
 * run-start's timestamp is NOT judged here; `runWindow` judges it.
 */
export function currentRunMarkers(markers) {
  const list = Array.isArray(markers) ? [...markers].filter((m) => m && Number.isInteger(m.seq)).sort((a, b) => a.seq - b.seq) : [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].kind === "run-start") return list.slice(i);
  }
  return null;
}

export function runWindow(markers, session = null) {
  const hasAny = Array.isArray(markers) && markers.some((m) => m && Number.isInteger(m.seq));
  if (!hasAny) return unknown(UNKNOWN_REASONS.NO_MARKERS);

  const current = currentRunMarkers(markers);
  if (current === null) return unknown(UNKNOWN_REASONS.NO_RUN_START);
  // The LATEST run-start decides, valid or not. Falling back to an EARLIER valid one would silently
  // widen the window across an invocation boundary — the fail-open direction.
  const startMarker = current[0];
  const startMs = tsMs(startMarker.ts);
  if (startMs === null) return unknown(UNKNOWN_REASONS.BAD_RUN_START_TS);

  let stopMarker = null;
  let stopMs = null;
  for (const m of current) {
    if (m.kind === "run-stop") {
      const t = tsMs(m.ts);
      if (t === null) return unknown(UNKNOWN_REASONS.BAD_RUN_STOP_TS);
      stopMarker = m;
      stopMs = t;
    } else if (stopMarker !== null) {
      return unknown(UNKNOWN_REASONS.MARKER_AFTER_STOP);
    }
  }
  if (stopMs !== null && stopMs < startMs) return unknown(UNKNOWN_REASONS.STOP_BEFORE_START);

  // Per-session opening: the earliest current-run marker bound to the session (null binds all). Never
  // earlier than the run's own start.
  const openingFor = (sid) => {
    let best = null;
    for (const m of current) {
      const t = tsMs(m.ts);
      if (t === null) continue;
      const bound = m.session_id === null || m.session_id === undefined || sid === null || sid === undefined || m.session_id === sid;
      if (!bound) continue;
      if (best === null || t < best) best = t;
    }
    return best === null ? null : Math.max(best, startMs);
  };

  if (session !== null && session !== undefined && openingFor(session) === null) {
    return unknown(UNKNOWN_REASONS.NO_SESSION_MARKER);
  }

  return {
    status: stopMarker === null ? "open" : "bounded",
    reason: null,
    start: startMarker.ts,
    end: stopMarker === null ? null : stopMarker.ts,
    startMs,
    endMs: stopMs,
    openings: openingFor,
  };
}

/** Is a request with timestamp `ts` in session `sid` a member of `win`? Unknown windows admit nothing. */
export function isMember(win, ts, sid) {
  if (!win || win.status === "unknown" || typeof win.openings !== "function") return false;
  const t = tsMs(ts);
  if (t === null) return false;
  const open = win.openings(sid ?? null);
  if (open === null || t < open) return false;
  return win.endMs === null || t <= win.endMs;
}
