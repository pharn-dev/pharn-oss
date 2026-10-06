// pharn/floor/entry-observations.mjs — the OBSERVATIONS a delivery run's background entry check leaves for the cost
// ledger (`cost.json`'s `entry_events[]` facts and `entry` view, `pharn/pharn-contracts/cost-ledger.md`, "Entry gate
// observations"). The ONE owner of the record's schema, its validation, its append, its read, the run-start it binds to
// and the view derived from it ([[L35]]): `entry-gates.mjs` writes, `render-cost-ledger.mjs` emits, `check-cost-ledger.mjs`
// recomputes and `render-run-report.mjs` renders through this file, never a copy.
//
// ── WHY IT EXISTS (follow-up `entry-gates-ledger-row`, named at 6.42.0) ──────────────────────────────────────────────
// The entry runner (`entry-gates.mjs`, 6.42.0) runs `/pharn-verify`'s gates in a detached process while /pharn-spec,
// /pharn-plan and /pharn-grill work, deliberately with no stage marker: a marker would put concurrent work into the
// SEQUENTIAL phase stream that attributes model requests. So its execution appeared nowhere in `cost.json`, the
// foreground `--wait` call fell into the gap between two marked stages, and `.pharn/pharn-entry/` — which holds no
// timestamp anyway — is wiped by the next `--start`. Each process therefore appends ONE line per lifecycle boundary it
// already has, at the moment of the act ([[L42]]), to `<.pharn/cost>/<feature>/entry.jsonl`, beside `markers.jsonl`.
//
// ── THE EVENTS (schema `pharn-entry-observation/1`, one JSON object per line, CLOSED keys per event) ──────────────────
//   start          --start, once, at its end: `run` = the current run-start `{seq, ts}` read from `markers.jsonl` at
//                  that moment (null when there is none), `ts` / `end_ts` its wall-clock begin and end, `elapsed_ms` its
//                  MONOTONIC duration (performance.now() in that one process), `outcome` ∈ START_OUTCOMES.
//   segment-begin  a runner or a `--wait` takeover process, first: `segment` a fresh id, `kind` ∈ SEGMENT_KINDS.
//   segment-end    the same process, last (after `result.json` when it wrote one): `elapsed_ms` monotonic in that
//                  process, `end` ∈ SEGMENT_ENDS, `gates` = how many gate entries that process ran.
//   wait           one `--wait` call, after its document is printed: `call` a fresh id, `ts`/`end_ts` wall clock,
//                  `elapsed_ms` monotonic, `status` its document's status, `takeover` the segment it ran (or null).
//   abort          one `--abort` call that read this invocation's runner record: `stopped`, `wrote_result`.
// Every event carries the invocation's `nonce` (`entry-gates.mjs` creates it at `--start`) and the session id from the
// environment (an identity token or null). Nothing else: no gate output, argv, environment value, prompt or path.
//
// ── THE QUANTITIES, KEPT APART (none is derived from another, and no two are added) ──────────────────────────────────
//   invocation lifetime  start.ts → the producer-recorded TERMINAL event: a segment-end whose `end` is in
//                        TERMINAL_SEGMENT_ENDS (that process wrote `result.json`), an abort with `wrote_result`, or a start
//                        whose outcome is not `started` (no runner existed; its own `end_ts`). Wall clock across two
//                        processes: placement, not CPU or gate time; it includes scheduling, pauses and takeover gaps.
//   execution segment    one process's monotonic `elapsed_ms`; its wall `[begin ts, end ts]` places it.
//   wait call            one `--wait` call's monotonic `elapsed_ms`. A takeover segment lies INSIDE its wait call and is
//                        never added to it. A wait's `end_ts` is when it NOTICED a result — an observation, never the
//                        runner's completion, and never a terminal.
// Aggregates are wall-clock interval UNIONS, never sums ([[L58]]'s arithmetic aside, overlapping intervals are never
// summed). `segments_overlap_marked_stages_ms` = |union of an invocation's complete segments ∩ union of the measured
// `executions` rows| — where the runner's observed execution fell relative to PHARN's marked stages on the wall clock. It
// is NOT proof that both were active at once, not model time, and not a saving. An aggregate over nothing observed is
// null, never 0: no wait call recorded, no placeable segment, or no measured stage row to compare against.
//
// ── IDENTITY, BINDING, DUPLICATES ────────────────────────────────────────────────────────────────────────────────────
// The invocation is the nonce; a segment is its 16-hex id; a wait or abort call is its 16-hex `call`. An event's
// identity key is `(nonce, event, segment | call)`, a start's `(nonce, start)`. Only the `start` event carries the run;
// every other event binds through its nonce. An invocation belongs to a ledger only when a start for its nonce recorded
// EXACTLY the ledger's current run-start `(seq, ts)` (run-window-core.mjs `currentRunMarkers`, the one definition). An
// event of any other nonce is UNBOUND: counted, never attached ([[L66]] — never bound by presence, feature name, pid,
// session or proximity). Any disagreement between the reader here and the ledger's own `markers[]` (a reset
// `.pharn/cost`, a run-start the emitter's normalization drops) therefore reads UNBOUND, never another run's. A nonce
// whose start records CONFLICT is bound to no run at all — a contested binding is left unattached (GATE-2 review).
// Two lines with one identity key and different content are CONFLICTING: kept as facts, counted, and the invocation's
// lifetime reads `unmeasured conflicting-records` — never resolved by picking one; a segment's begin and end that
// disagree on `kind` are a conflict the same way. Exact duplicates are dropped at
// emission and RED in the checker.
//
// ── HONEST SCOPE (P0) ────────────────────────────────────────────────────────────────────────────────────────────────
// FLOOR: the record's shape (closed keys, enums, integer ranges, ISO timestamps — `validateEntryEvent`) and, given the
//   same markers, events and executions, the view (`buildEntryView`: ordering, membership, integer arithmetic), which
//   `check-cost-ledger.mjs` recomputes from the ledger's own facts.
// ADVISORY: that a line was written for every boundary (a write is best-effort; a process killed between two boundaries
//   leaves a segment `incomplete`, and a refusal before the nonce exists writes nothing); that the events describe what
//   ran or were not edited (`.pharn/` is Bash-reachable, LIMITS.md §6 — agreement, never provenance, [[L43]]); what a
//   wall-clock interval between two processes contains (clocks can step; see `clock-went-back`).
// OBSERVATIONAL ONLY: nothing reads an event to decide a verdict, an exit, a takeover, an abort, a route, a reuse or a
//   commit. `recordEntryEvent` never throws and never writes to stdout.

import { lstatSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { DEFAULT_BASE, cleanScalar, markersPath } from "./mark-phase.mjs";
import { isIdentityToken, isTokenCount } from "./cost-value-core.mjs";
import { currentRunMarkers, isMember, runWindow, tsMs } from "./run-window-core.mjs";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { STATUSES as WAIT_STATUSES } from "./entry-gates-core.mjs";
import { appendJsonLine, readJsonLines, MAX_GATES } from "./stage-work.mjs";

export const OBS_SCHEMA = "pharn-entry-observation/1";
/** The file, under `<DEFAULT_BASE>/<feature>/`, beside `markers.jsonl` and `work.jsonl`. Never wiped by `--start`. */
export const ENTRY_FILE = "entry.jsonl";
/** The view's method name. Versioned: a change to a rule below is a new method. */
export const ENTRY_VIEW_METHOD = "entry-observations/1";

export const EVENT_KINDS = Object.freeze(["start", "segment-begin", "segment-end", "wait", "abort"]);
export const START_OUTCOMES = Object.freeze(["started", "no-gates", "init-refused", "spawn-failed"]);
export const SEGMENT_KINDS = Object.freeze(["runner", "takeover"]);
export const SEGMENT_ENDS = Object.freeze(["done", "refused", "crashed", "budget"]);
/** A segment end after which that process had written `result.json` — the invocation is over. `budget` is not. */
export const TERMINAL_SEGMENT_ENDS = Object.freeze(["done", "refused", "crashed"]);
export { WAIT_STATUSES };

const KEYS = Object.freeze({
  start: ["schema", "event", "nonce", "run", "ts", "end_ts", "elapsed_ms", "outcome", "session_id"],
  "segment-begin": ["schema", "event", "nonce", "segment", "kind", "ts", "session_id"],
  "segment-end": ["schema", "event", "nonce", "segment", "kind", "ts", "elapsed_ms", "end", "gates", "session_id"],
  wait: ["schema", "event", "nonce", "call", "ts", "end_ts", "elapsed_ms", "status", "takeover", "session_id"],
  abort: ["schema", "event", "nonce", "call", "ts", "stopped", "wrote_result", "session_id"],
});
export const EVENT_KEYS = Object.freeze(Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [k, Object.freeze([...v])])));

/** The view's closed key sets. */
export const ENTRY_VIEW_KEYS = Object.freeze([
  "method",
  "status",
  "reason",
  "run",
  "cutoff_ts",
  "invocations",
  "unbound_events",
  "conflicting_events",
]);
export const INVOCATION_KEYS = Object.freeze([
  "nonce",
  "start",
  "lifetime",
  "segments",
  "waits",
  "aborts",
  "segment_coverage",
  "segments_union_ms",
  "waits_union_ms",
  "segments_overlap_marked_stages_ms",
]);
export const LIFETIME_STATUSES = Object.freeze(["measured", "incomplete", "unmeasured"]);
export const LIFETIME_REASONS = Object.freeze(["clock-went-back", "multiple-terminal-events", "conflicting-records"]);
export const LIFETIME_END_BY = Object.freeze(["start", "runner", "takeover", "abort"]);
export const SEGMENT_STATUSES = Object.freeze(["complete", "incomplete", "end-only", "conflicting"]);
/** `all`: every recorded segment is complete and placeable (zero segments when no runner was ever started — a known
 *  zero); `partial`: at least one is not, so the union covers only the placeable ones (and is null when none is);
 *  `none-observed`: the invocation started a runner but no segment of it was recorded — the union is null, never 0. */
export const SEGMENT_COVERAGE = Object.freeze(["all", "partial", "none-observed"]);

/** An elapsed value larger than this (≈ 115 days) is not one process's run. */
export const MAX_ELAPSED_MS = 10_000_000_000;
const NONCE_RE = /^[0-9a-f]{32}$/;
const ID16_RE = /^[0-9a-f]{16}$/;

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const exactKeys = (o, keys) => {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => Object.hasOwn(o, x));
};
const isTs = (v) => cleanScalar(v, 64) && tsMs(v) !== null;
const isElapsed = (v) => isTokenCount(v) && v <= MAX_ELAPSED_MS;

/**
 * Validate one event. TOTAL over any parsed JSON value ([[L62]]): every value is type-tested before it is read, and no
 * refusal quotes a value. Returns `{ok: true}` or `{ok: false, reason}` (a fixed-text reason).
 */
export function validateEntryEvent(e) {
  const bad = (reason) => ({ ok: false, reason });
  if (!isPlain(e)) return bad("not an object");
  if (e.schema !== OBS_SCHEMA) return bad("schema");
  if (typeof e.event !== "string" || !EVENT_KINDS.includes(e.event)) return bad("event");
  if (!exactKeys(e, KEYS[e.event])) return bad("key set");
  if (typeof e.nonce !== "string" || !NONCE_RE.test(e.nonce)) return bad("nonce");
  if (!isTs(e.ts)) return bad("ts");
  if (e.session_id !== null && !isIdentityToken(e.session_id)) return bad("session_id");
  switch (e.event) {
    case "start":
      if (e.run !== null) {
        if (!isPlain(e.run) || !exactKeys(e.run, ["seq", "ts"])) return bad("run");
        if (!Number.isSafeInteger(e.run.seq) || e.run.seq < 1 || !isTs(e.run.ts)) return bad("run");
      }
      if (!isTs(e.end_ts)) return bad("end_ts");
      if (!isElapsed(e.elapsed_ms)) return bad("elapsed_ms");
      if (!START_OUTCOMES.includes(e.outcome)) return bad("outcome");
      return { ok: true };
    case "segment-begin":
      if (typeof e.segment !== "string" || !ID16_RE.test(e.segment)) return bad("segment");
      if (!SEGMENT_KINDS.includes(e.kind)) return bad("kind");
      return { ok: true };
    case "segment-end":
      if (typeof e.segment !== "string" || !ID16_RE.test(e.segment)) return bad("segment");
      if (!SEGMENT_KINDS.includes(e.kind)) return bad("kind");
      if (!isElapsed(e.elapsed_ms)) return bad("elapsed_ms");
      if (!SEGMENT_ENDS.includes(e.end)) return bad("end");
      if (!isTokenCount(e.gates) || e.gates > MAX_GATES) return bad("gates");
      return { ok: true };
    case "wait":
      if (typeof e.call !== "string" || !ID16_RE.test(e.call)) return bad("call");
      if (!isTs(e.end_ts)) return bad("end_ts");
      if (!isElapsed(e.elapsed_ms)) return bad("elapsed_ms");
      if (!WAIT_STATUSES.includes(e.status)) return bad("status");
      if (e.takeover !== null && (typeof e.takeover !== "string" || !ID16_RE.test(e.takeover))) return bad("takeover");
      return { ok: true };
    default: // abort
      if (typeof e.call !== "string" || !ID16_RE.test(e.call)) return bad("call");
      if (typeof e.stopped !== "boolean" || typeof e.wrote_result !== "boolean") return bad("stopped/wrote_result");
      return { ok: true };
  }
}

/** The identity key of a VALID event (see the header). */
export function identityKey(e) {
  if (e.event === "start") return `${e.nonce}|start`;
  if (e.event === "segment-begin" || e.event === "segment-end") return `${e.nonce}|${e.event}|${e.segment}`;
  return `${e.nonce}|${e.event}|${e.call}`;
}

/** A canonical JSON text of a parsed value (keys sorted at every level) — exact-duplicate detection, never display. */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v !== null && typeof v === "object") {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/** `events` minus exact duplicates (the first occurrence kept, file order). */
export function dedupeExact(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const c = canonical(e);
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(e);
  }
  return out;
}

/** The session id an event carries: the environment's value when it is an identity token, else null. */
export function sessionFromEnv(env = process.env) {
  const v = env.CLAUDE_CODE_SESSION_ID;
  return isIdentityToken(v) ? v : null;
}

/**
 * Append one event to `<root>/<base>/<feature>/entry.jsonl` (stage-work.mjs `appendJsonLine`, the one safe append).
 * BEST-EFFORT and TOTAL: never throws, never writes to stdout; an invalid event is refused (nothing written). On any
 * failure it calls `note` once with a fixed-text line — the caller's diagnostic channel (stderr) — and returns
 * `{ok: false, why}`.
 */
export function recordEntryEvent(feature, event, { root = ".", base = DEFAULT_BASE, note = defaultNote } = {}) {
  let r;
  try {
    r = validateEntryEvent(event).ok
      ? appendJsonLine({ feature, fileName: ENTRY_FILE, value: event, root, base })
      : { ok: false, why: "event is not a valid entry observation" };
  } catch {
    r = { ok: false, why: "append failed (error)" };
  }
  if (!r.ok) {
    try {
      note(`note — an entry-gate observation for the cost ledger was not written (${r.why})`);
    } catch {
      /* the note channel itself failed; the caller's result never depends on it */
    }
  }
  return r;
}

function defaultNote(m) {
  process.stderr.write(`${m}\n`);
}

/** Read an entry file (`readJsonLines` with `validateEntryEvent`, label `entry.jsonl`). The final component is opened
 *  `O_NOFOLLOW`; the directories above it are the caller's to check — `readEntryEventsFor` does. */
export function readEntryEvents(file) {
  return readJsonLines(file, validateEntryEvent, ENTRY_FILE);
}

/**
 * Is `<base>/<feature>/` a real directory chain, the READ side of `appendJsonLine`'s walk (GATE-2 review: the reads
 * followed a symlinked `.pharn/cost` or feature directory)? Returns `"ok"`, `"absent"` (a component does not exist —
 * nothing to read), or `"unsafe"` (a component is a symlink, not a directory, or cannot be lstat'ed). A relative `base`
 * is walked segment by segment from `root`; an absolute one (a test's temporary directory) is checked at `base` itself
 * and at the feature directory — the system's own ancestors (`/var` → `/private/var` on macOS) are not this file's to
 * judge. lstat, never followed ([[L54]]/[[L59]]). TOTAL.
 */
export function stateDirState(feature, base = DEFAULT_BASE, root = ".") {
  try {
    if (typeof feature !== "string" || !FEATURE_SLUG_RE.test(feature)) return "unsafe";
    const b = String(base);
    const dirs = [];
    if (isAbsolute(b)) dirs.push(b, join(b, feature));
    else {
      const segs = [...b.split("/").filter((s) => s && s !== "."), feature];
      if (segs.some((s) => s === "..")) return "unsafe";
      let d = root;
      for (const s of segs) dirs.push((d = join(d, s)));
    }
    for (const d of dirs) {
      let st;
      try {
        st = lstatSync(d);
      } catch (e) {
        return e && e.code === "ENOENT" ? "absent" : "unsafe";
      }
      if (st.isSymbolicLink() || !st.isDirectory()) return "unsafe";
    }
    return "ok";
  } catch {
    return "unsafe";
  }
}

/** The emitter's read: `<base>/<feature>/entry.jsonl` through `stateDirState` first. An unsafe directory chain reads
 *  nothing and lists `entry.jsonl` in `dropped` (its presence is reported, nothing is read through it). */
export function readEntryEventsFor(feature, base = DEFAULT_BASE) {
  const s = stateDirState(feature, base);
  if (s === "absent") return { records: [], dropped: [] };
  if (s !== "ok") return { records: [], dropped: [ENTRY_FILE] };
  return readEntryEvents(join(base, feature, ENTRY_FILE));
}

/** A markers file larger than this is not read for the run-start (the start then records `run: null` — unbound). */
const MARKERS_MAX_BYTES = 16 * 1024 * 1024;

/**
 * The current run-start of `<base>/<feature>/markers.jsonl` as `{seq, ts}`, or null — the LATEST `run-start` by `seq`
 * (`currentRunMarkers`, the ledger's own definition of the current run), read through the same bounded line reader
 * after `stateDirState` (no directory in the chain, and not the file itself, is followed through a link). A marker
 * counts only with an integer `seq`, a `MARKER_KINDS`-shaped `kind` string and an ISO `ts`. TOTAL.
 */
export function currentRunStart(feature, { base = DEFAULT_BASE } = {}) {
  try {
    if (typeof feature !== "string" || !FEATURE_SLUG_RE.test(feature)) return null;
    if (stateDirState(feature, base) !== "ok") return null;
    const isMarker = (m) => ({
      ok: isPlain(m) && Number.isSafeInteger(m.seq) && m.seq >= 1 && typeof m.kind === "string" && isTs(m.ts),
    });
    const { records } = readJsonLines(markersPath(feature, base), isMarker, "markers.jsonl", MARKERS_MAX_BYTES);
    const current = currentRunMarkers(records);
    if (current === null) return null;
    return { seq: current[0].seq, ts: current[0].ts };
  } catch {
    return null;
  }
}

/**
 * THE ADMISSION RULE (one copy, used by the emitter and the checker — L35): an event is a fact of the run window `win`
 * only when EVERY timestamp it carries is a window member (`isMember`) — `ts`, and `end_ts` for a start or a wait. A
 * start's or a wait's `ts` is when the CALL began and the line is written at its end, so testing `ts` alone admitted a
 * line written after the run-stop (GATE-2 review); now a call that ended after the cutoff is not a fact, and an
 * invocation whose start ended after it stays unbound. TOTAL.
 */
export function isAdmitted(win, e) {
  try {
    if (!isMember(win, e.ts, e.session_id)) return false;
    return !Object.hasOwn(e, "end_ts") || isMember(win, e.end_ts, e.session_id);
  } catch {
    return false;
  }
}

/** The file the emitter reads: `<markersBase>/<feature>/entry.jsonl`. */
export function entryFilePath(feature, base = DEFAULT_BASE) {
  return join(base, feature, ENTRY_FILE);
}

/**
 * Why a STORED `entry` view cannot be rendered safely, or null. A shape test only — every value a screen function
 * interpolates is type-tested — so a hand-edited `cost.json` never crashes a renderer. Whether the view AGREES with the
 * facts is `check-cost-ledger.mjs` RULE 10. TOTAL; the reason is fixed text.
 */
export function entryViewDefect(v) {
  const intOrNull = (x) => x === null || (Number.isSafeInteger(x) && x >= 0);
  const strOrNull = (x) => x === null || typeof x === "string";
  const hex = (x, n) => typeof x === "string" && x.length === n && /^[0-9a-f]+$/.test(x);
  if (!isPlain(v) || !exactKeys(v, ENTRY_VIEW_KEYS)) return "the view does not have its closed key set";
  if (v.method !== ENTRY_VIEW_METHOD || (v.status !== "derived" && v.status !== "unknown") || !strOrNull(v.reason))
    return "method/status/reason";
  if (!Array.isArray(v.invocations) || !Number.isSafeInteger(v.unbound_events) || !Number.isSafeInteger(v.conflicting_events))
    return "counts";
  for (const x of v.invocations) {
    if (!isPlain(x) || !exactKeys(x, INVOCATION_KEYS) || !hex(x.nonce, 32)) return "an invocation";
    const s = x.start;
    if (s !== null && (!isPlain(s) || !START_OUTCOMES.includes(s.outcome) || !intOrNull(s.elapsed_ms) || s.elapsed_ms === null))
      return "a start";
    const l = x.lifetime;
    if (!isPlain(l) || !LIFETIME_STATUSES.includes(l.status) || !intOrNull(l.elapsed_ms)) return "a lifetime";
    if (l.status === "measured" && (l.elapsed_ms === null || !LIFETIME_END_BY.includes(l.end_by))) return "a measured lifetime";
    if (l.status === "unmeasured" && !LIFETIME_REASONS.includes(l.reason)) return "an unmeasured lifetime";
    if (!Array.isArray(x.segments) || !Array.isArray(x.waits) || !Array.isArray(x.aborts)) return "an invocation's lists";
    for (const g of x.segments) {
      if (!isPlain(g) || !hex(g.segment, 16) || !SEGMENT_STATUSES.includes(g.status)) return "a segment";
      if (g.kind !== null && !SEGMENT_KINDS.includes(g.kind)) return "a segment kind";
      if (!intOrNull(g.elapsed_ms) || !intOrNull(g.gates) || (g.end !== null && !SEGMENT_ENDS.includes(g.end))) return "a segment's values";
      if ((g.status === "complete" || g.status === "end-only") && (g.elapsed_ms === null || g.gates === null || g.end === null))
        return "an ended segment";
    }
    for (const w of x.waits) {
      if (
        !isPlain(w) ||
        !Number.isSafeInteger(w.elapsed_ms) ||
        !WAIT_STATUSES.includes(w.status) ||
        !(w.takeover === null || hex(w.takeover, 16))
      )
        return "a wait";
    }
    for (const a of x.aborts) if (!isPlain(a) || typeof a.stopped !== "boolean" || typeof a.wrote_result !== "boolean") return "an abort";
    if (!SEGMENT_COVERAGE.includes(x.segment_coverage)) return "segment_coverage";
    if (!intOrNull(x.segments_union_ms) || !intOrNull(x.waits_union_ms) || !intOrNull(x.segments_overlap_marked_stages_ms))
      return "an invocation's unions";
  }
  return null;
}

// ── THE VIEW ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Total length of the union of `[a, b]` intervals (a <= b, integers). */
export function unionMs(intervals) {
  const merged = mergeIntervals(intervals);
  return merged.reduce((s, [a, b]) => s + (b - a), 0);
}

function mergeIntervals(intervals) {
  const list = intervals.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a <= b).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out = [];
  for (const [a, b] of list) {
    if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b);
    else out.push([a, b]);
  }
  return out;
}

/** Length of (union of `xs`) ∩ (union of `ys`). */
export function intersectionMs(xs, ys) {
  const a = mergeIntervals(xs);
  const b = mergeIntervals(ys);
  let i = 0;
  let j = 0;
  let total = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]);
    const hi = Math.min(a[i][1], b[j][1]);
    if (lo < hi) total += hi - lo;
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return total;
}

const byTsThenId = (tsKey, idKey) => (x, y) => {
  const a = tsMs(x[tsKey]) ?? Number.MAX_SAFE_INTEGER;
  const b = tsMs(y[tsKey]) ?? Number.MAX_SAFE_INTEGER;
  return a - b || (x[idKey] < y[idKey] ? -1 : x[idKey] > y[idKey] ? 1 : 0);
};

/**
 * The `entry` view from a normalized marker list, the ledger's validated `entry_events[]` and its `executions` view.
 * Pure: no I/O, no clock. Events that are not valid are ignored here (the checker REDs them separately).
 */
export function buildEntryView(markers, events = [], executions = null) {
  const win = runWindow(markers, null);
  const empty = (status, reason) => ({
    method: ENTRY_VIEW_METHOD,
    status,
    reason,
    run: null,
    cutoff_ts: null,
    invocations: [],
    unbound_events: 0,
    conflicting_events: 0,
  });
  if (win.status === "unknown") return empty("unknown", win.reason);
  const current = currentRunMarkers(markers) ?? [];
  const runStart = current[0];
  const run = { seq: runStart.seq, ts: runStart.ts };
  const list = (Array.isArray(events) ? events : []).filter((e) => validateEntryEvent(e).ok);

  // Identity groups: exact duplicates collapse; distinct contents under one key are a conflict.
  const groups = new Map();
  for (const e of list) {
    const k = identityKey(e);
    if (!groups.has(k)) groups.set(k, new Map());
    groups.get(k).set(canonical(e), e);
  }
  const conflictKeys = new Set([...groups].filter(([, v]) => v.size > 1).map(([k]) => k));
  // A segment's begin and end that disagree on `kind` contradict each other: both are conflicting records (GATE-2
  // review), counted and never read as missing data.
  for (const e of list) {
    if (e.event !== "segment-end") continue;
    const bKey = `${e.nonce}|segment-begin|${e.segment}`;
    const eKey = identityKey(e);
    if (!groups.has(bKey) || conflictKeys.has(bKey) || conflictKeys.has(eKey)) continue;
    if ([...groups.get(bKey).values()][0].kind !== e.kind) {
      conflictKeys.add(bKey);
      conflictKeys.add(eKey);
    }
  }
  const conflictingEvents = [...conflictKeys].reduce((s, k) => s + groups.get(k).size, 0);
  const single = (k) => (groups.has(k) && !conflictKeys.has(k) ? [...groups.get(k).values()][0] : null);

  // Bound nonces: a start for that nonce recorded exactly this run-start. A nonce whose start records CONFLICT is
  // bound to no run (GATE-2 review): a contested binding is left unattached, never resolved as "every run it names".
  const bound = new Set();
  for (const e of list) {
    if (e.event !== "start" || conflictKeys.has(identityKey(e))) continue;
    if (e.run !== null && e.run.seq === run.seq && e.run.ts === run.ts) bound.add(e.nonce);
  }
  const unbound = list.filter((e) => !bound.has(e.nonce));
  const unboundEvents = dedupeExact(unbound).length;

  // The measured stage intervals (for the overlap figure), from the executions rows' own markers.
  const tsBySeq = new Map(current.map((m) => [m.seq, tsMs(m.ts)]));
  const stageIntervals = [];
  for (const r of executions && Array.isArray(executions.rows) ? executions.rows : []) {
    if (!Number.isInteger(r.elapsed_ms)) continue;
    const a = tsBySeq.get(r.start_seq);
    const b = tsBySeq.get(r.end_seq);
    if (Number.isFinite(a) && Number.isFinite(b) && a <= b) stageIntervals.push([a, b]);
  }

  const invocations = [];
  for (const nonce of [...bound].sort()) {
    const mine = list.filter((e) => e.nonce === nonce);
    const anyConflict = mine.some((e) => conflictKeys.has(identityKey(e)));
    const startEv = single(`${nonce}|start`);
    const start = startEv ? { ts: startEv.ts, end_ts: startEv.end_ts, elapsed_ms: startEv.elapsed_ms, outcome: startEv.outcome } : null;

    // Segments.
    const segIds = [...new Set(mine.filter((e) => e.event === "segment-begin" || e.event === "segment-end").map((e) => e.segment))];
    const segments = segIds.map((id) => {
      const bKey = `${nonce}|segment-begin|${id}`;
      const eKey = `${nonce}|segment-end|${id}`;
      const b = single(bKey);
      const en = single(eKey);
      const conflicted = conflictKeys.has(bKey) || conflictKeys.has(eKey);
      if (conflicted) {
        return { segment: id, kind: null, begin_ts: null, end_ts: null, elapsed_ms: null, status: "conflicting", end: null, gates: null };
      }
      if (b && en) {
        return {
          segment: id,
          kind: b.kind,
          begin_ts: b.ts,
          end_ts: en.ts,
          elapsed_ms: en.elapsed_ms,
          status: "complete",
          end: en.end,
          gates: en.gates,
        };
      }
      if (b)
        return { segment: id, kind: b.kind, begin_ts: b.ts, end_ts: null, elapsed_ms: null, status: "incomplete", end: null, gates: null };
      return {
        segment: id,
        kind: en.kind,
        begin_ts: null,
        end_ts: en.ts,
        elapsed_ms: en.elapsed_ms,
        status: "end-only",
        end: en.end,
        gates: en.gates,
      };
    });
    segments.sort((x, y) => {
      const a = tsMs(x.begin_ts ?? x.end_ts) ?? Number.MAX_SAFE_INTEGER;
      const b = tsMs(y.begin_ts ?? y.end_ts) ?? Number.MAX_SAFE_INTEGER;
      return a - b || (x.segment < y.segment ? -1 : x.segment > y.segment ? 1 : 0);
    });

    // Waits and aborts (a conflicting call is left out of the list and counted in conflicting_events).
    const waits = mine
      .filter((e) => e.event === "wait" && !conflictKeys.has(identityKey(e)))
      .map((e) => ({ call: e.call, ts: e.ts, end_ts: e.end_ts, elapsed_ms: e.elapsed_ms, status: e.status, takeover: e.takeover }));
    const waitsDedup = [...new Map(waits.map((w) => [w.call, w])).values()].sort(byTsThenId("ts", "call"));
    const aborts = mine
      .filter((e) => e.event === "abort" && !conflictKeys.has(identityKey(e)))
      .map((e) => ({ call: e.call, ts: e.ts, stopped: e.stopped, wrote_result: e.wrote_result }));
    const abortsDedup = [...new Map(aborts.map((a) => [a.call, a])).values()].sort(byTsThenId("ts", "call"));

    // Lifetime.
    let lifetime;
    if (anyConflict) lifetime = { status: "unmeasured", end_by: null, end_ts: null, elapsed_ms: null, reason: "conflicting-records" };
    else {
      const terminals = [];
      if (start && start.outcome !== "started") terminals.push({ by: "start", ts: start.end_ts });
      for (const s of segments) if (s.end !== null && TERMINAL_SEGMENT_ENDS.includes(s.end)) terminals.push({ by: s.kind, ts: s.end_ts });
      for (const a of abortsDedup) if (a.wrote_result) terminals.push({ by: "abort", ts: a.ts });
      if (terminals.length === 0 || start === null) {
        lifetime = { status: "incomplete", end_by: null, end_ts: null, elapsed_ms: null, reason: null };
      } else if (terminals.length > 1) {
        lifetime = { status: "unmeasured", end_by: null, end_ts: null, elapsed_ms: null, reason: "multiple-terminal-events" };
      } else {
        const t = terminals[0];
        const d = tsMs(t.ts) - tsMs(start.ts);
        lifetime =
          d < 0
            ? { status: "unmeasured", end_by: t.by, end_ts: t.ts, elapsed_ms: null, reason: "clock-went-back" }
            : { status: "measured", end_by: t.by, end_ts: t.ts, elapsed_ms: d, reason: null };
      }
    }

    // Coverage and unions.
    const placeable = segments
      .filter((s) => s.status === "complete" && tsMs(s.begin_ts) <= tsMs(s.end_ts))
      .map((s) => [tsMs(s.begin_ts), tsMs(s.end_ts)]);
    let coverage;
    if (segments.length === 0) coverage = start !== null && start.outcome !== "started" ? "all" : "none-observed";
    else coverage = placeable.length === segments.length ? "all" : "partial";
    // Null — unknown, never 0 — when a runner was started and no segment of it can be placed (none recorded, or every
    // recorded one incomplete / end-only / conflicting). A union over SOME placeable segments is reported with
    // `segment_coverage: partial`.
    const segUnion = coverage === "none-observed" || (segments.length > 0 && placeable.length === 0) ? null : unionMs(placeable);
    const waitIntervals = waitsDedup.map((w) => [tsMs(w.ts), tsMs(w.end_ts)]).filter(([a, b]) => a <= b);
    invocations.push({
      nonce,
      start,
      lifetime,
      segments,
      waits: waitsDedup,
      aborts: abortsDedup,
      segment_coverage: coverage,
      segments_union_ms: segUnion,
      // Null, never 0, when nothing was observed (GATE-2 review): no wait call recorded, or no measured stage row to
      // place the segments against.
      waits_union_ms: waitsDedup.length === 0 ? null : unionMs(waitIntervals),
      segments_overlap_marked_stages_ms:
        segUnion === null || stageIntervals.length === 0 ? null : intersectionMs(placeable, stageIntervals),
    });
  }
  invocations.sort((x, y) => {
    const a = tsMs(x.start?.ts) ?? Number.MAX_SAFE_INTEGER;
    const b = tsMs(y.start?.ts) ?? Number.MAX_SAFE_INTEGER;
    return a - b || (x.nonce < y.nonce ? -1 : 1);
  });
  return {
    method: ENTRY_VIEW_METHOD,
    status: "derived",
    reason: null,
    run,
    cutoff_ts: win.end,
    invocations,
    unbound_events: unboundEvents,
    conflicting_events: conflictingEvents,
  };
}
