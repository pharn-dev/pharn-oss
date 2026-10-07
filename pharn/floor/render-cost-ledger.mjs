#!/usr/bin/env node
// pharn/floor/render-cost-ledger.mjs — the deterministic EMITTER for `pharn/features/<name>/cost.json`,
// the per-run cost ledger (`pharn/pharn-contracts/cost-ledger.md`). Node stdlib only, no network, no
// model call.
//
// PURPOSE. `/pharn-loop` runs unattended and records no cost at all. Claude Code prunes transcripts on
// its own schedule (`cleanupPeriodDays`), so cost NOT captured at the stop is lost irreversibly — the
// 2026-08-18 measurement lost three features to exactly that (§9). This emitter captures it at the stop,
// for every stop, green or not, so a company can compute what a feature cost against ITS OWN price list.
//
// ── The governing principle: RECORD FACTS, DERIVE VIEWS ──────────────────────────────────────────────
// Two things are irrecoverable later: per-request usage, and phase boundaries. Both are recorded as
// facts. Every aggregate in the file (`totals`, `by_model`, `by_stage_iteration_model`, `unattributed`)
// is a PURE FUNCTION of `requests[]`, which is why `check-cost-ledger.mjs` can recompute all of them and
// compare. Phase attribution is a VIEW with a NAMED, VERSIONED method (`attribution.method`), so whether
// the platform's `attributionSkill` tags nested stages stops mattering: it is recorded raw, in
// `requests[].attribution_skill`, and nothing depends on it.
//
// ── WHY AN EMITTER AND NOT MODEL PROSE (the design fork, recorded) ───────────────────────────────────
// A model never retypes hundreds of numbers. This file WRITES `cost.json` itself — the
// `render-review-assignments.mjs` (#220) precedent, not the `render-cost-record.mjs` print-and-let-the-
// caller-Write one — because a single loop run produces ~275 request rows and transcription is the exact
// failure that precedent exists to prevent. The honest consequence, stated rather than glossed: this is
// a **Bash** write, outside the fix #7 `PreToolUse` gate (L19). It is declared in the plan's `## Files`
// and exempted by name in `pharn/floor/reconcile-ignore.json`, never described as gate-covered.
//
// ── RUN MEMBERSHIP (`pharn-cost-ledger/2`, method `run-window/2` since 6.29.0) ───────────────────────
// Through `/1` the markers decided only the stage VIEW, never the request POPULATION, so every request of
// the selected session was emitted and summed — 100 unrelated input tokens before a run plus 10 inside it
// reported 110, GREEN. `/2` emits ONLY run members, decided by `run-window-core.mjs` (imported, never
// re-stated), and records the decision in the top-level `membership` block. Membership and attribution
// stay SEPARATE: `attribute()` still runs, on members only, so an in-run request with no stage marker is
// `unattributed` AND counts in `totals`. When the markers cannot bound the run, membership is `unknown`
// and the ledger is `unavailable` with no rows — never whole-session usage presented as run usage, and
// never a zero that reads as observed. `/1` files are left alone: `check-cost-ledger.mjs` still validates
// them under their own rules and labels their totals SESSION-scoped.
// THE CONTEXT HALF (`run-window/2`, 6.29.0 — a real failure, P7): the window alone admitted every concurrent
// context's request inside it, because a subagent's markers carry its PARENT's session id, so three `/pharn-loop`
// runs in three agents of one session counted each other's requests and the main thread's. Now a window member counts
// only when its context is in the run's context set: the ONE context whose tool results carry the lines mark-phase
// printed for this run (rebuilt by `markerLine`, the one encoding), plus the agents that context tree spawned during
// the run. Binding and set come from `run-window-core.mjs`, the evidence from `transcript-core.mjs`'s `sessionScan`
// in the same pass as the rows. A run that cannot be bound, or a window member whose context cannot be placed,
// makes the whole ledger `unknown` — never a count that silently includes or drops it. `membership` records the
// bound `context` and the sorted `contexts` (over the contexts a line names by the window's end, so a closed run's
// set stops moving — L58). `excluded_requests` counts every session request outside the run, and
// the note gives how many of those were inside the window from other contexts. A `run-window/1` ledger (6.9.0 to
// 6.28.x) is read by the checker under its own seven keys, and WARNed as not context-scoped.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR (primitive #3 + arithmetic):
//   * One row per request, never per transcript line. LOAD-BEARING, not a nicety: the platform writes one
//     API request as several lines (this repo's `loop-decision-integrity` transcript: 552 usage-bearing
//     lines, 275 requests). The rows come from `transcript-core.mjs`'s one reader — `sessionScan` since 6.29.0,
//     which reads through the same collector as `sessionRequests()` — imported and never re-stated ([[L35]]). What a row's values are is defined in `pharn/pharn-contracts/cost-ledger.md`,
//     "One row per request". The core's header gives the measured transcript shapes and the one assumption
//     the rule rests on. Until 6.24.1 this module read the transcript with its own copy of the loop, which
//     kept each request's first line and under-counted `output` and `output_thinking`.
//   * Every `usage` leaf is number | bool | null | a short token; anything else is DROPPED and its key
//     path listed in `dropped[]`. Arrays are WALKED, not dropped (decision D1), so `usage` stays
//     genuinely verbatim. Since 6.28.1 the copy is also bounded in depth and key shape: a node deeper than
//     `USAGE_MAX_DEPTH`, and a key `isUsageKey` refuses (`__proto__` among them, which assigned on a plain
//     object would set its prototype and vanish — [[L15]]), are dropped and listed too, a refused key under
//     the fixed marker `<refused-key>` so the raw key never reaches the file. Both bounds keep the walk
//     itself from exhausting the stack.
//   * Every value copied or counted from the transcript passes a TYPE and DOMAIN test before anything
//     coerces it (6.28.1, [[L62]]). A line whose request id fails `isIdentityToken`, or whose usage is not
//     a plain object, is not a request at all — the reader's rule (`sessionRequests()`) — so it leaves no
//     row and no `dropped[]` entry, and it is not counted in `excluded_requests`. On a ROW (a request
//     inside the run window), `model`, `session_id`, `agent_id`, `attribution_skill` and each
//     `claude_code_versions` entry must satisfy `isIdentityToken`, and each count `isTokenCount` (both
//     cost-value-core.mjs). A refused one becomes its field's fallback (`unknown` for `model`, null or
//     omission otherwise, 0 for a count) and its path is listed in `dropped[]`; an ABSENT value keeps its old
//     fallback and is not listed. A request outside the window is only counted, never emitted, so nothing
//     about it is listed. A timestamp that does not parse makes the request a non-member: under a known
//     window it is counted in `excluded_requests` and listed nowhere, and under an unknown one that field is
//     null.
//     RUN MEMBERSHIP IS NOT CHANGED BY THIS: it reads the session exactly as before (a string as itself,
//     anything else as absent), and only the emitted `session_id` field is bounded, so a refused session
//     string is still excluded by markers bound to another session.
//   * No string anywhere in the emitted file matches `ABS_PATH_RE`.
//   * Given the same transcript bytes AND the same markers bytes the output is byte-identical: no clock
//     read, no randomness. `window_*` come from the records' own timestamps, never `Date.now()`.
//     THE MARKERS HALF OF THAT CONJUNCTION IS LOAD-BEARING and was corrected after review: `markers[]`
//     is copied verbatim from a file whose `ts` values a DIFFERENT process wrote at wall-clock time, so
//     "same transcript bytes" alone would be a false quantifier (L37 — the quantifier is where the drift
//     lands).
// WHAT IS **NOT** GUARANTEED, and the distinction is the whole point:
//   * "no message content, no home paths" is a CONSEQUENCE of the three rules above, NOT a detector.
//     Message bodies are never read, so none can appear; `cwd` and `gitBranch` are never copied, so no
//     home path can. The claim "no usernames" is STRUCK and appears nowhere: no regex proves it.
//   * COVERAGE IS NEVER COMPLETE. `COVERAGE` has no `complete` member, for the same reason
//     `render-cost-record.mjs` has none — the stop's own turns, including this emission, are still being
//     written. The number is a floor on spend, never the total.
//   * It measures TOKENS, never DOLLARS. No price table is embedded, deliberately and permanently:
//     published prices change, a baked-in table would rot silently, and nothing here could floor-check
//     one. See `pricing_note` in the emitted file.
//   * "the markers describe what actually ran" is ADVISORY (see `mark-phase.mjs`).
//   * Coverage is MACHINE-LOCAL. The transcript lives outside the repo and is never committed, so a
//     fresh clone can reproduce nothing.
//
// ── SIZE, measured and disclosed rather than discovered later ────────────────────────────────────────
// The measurements, in lines AND bytes, before and after the one-row-per-line layout (6.14.1,
// `serializeLedger`), live in ONE place: `pharn/pharn-contracts/cost-ledger.md`, section "Size". This
// header used to restate them and went stale the day the layout changed ([[L35]], [[L24]]). The verbatim
// `usage` copy, including `usage.iterations[]` walked per D1, is the bulk of the remaining bytes. That was
// weighed at the plan gate and accepted for fidelity.
//
// ── RELATIONSHIP TO `render-cost-record.mjs` (L35, answered rather than assumed) ─────────────────────
// Both renderers read transcripts through `transcript-core.mjs` — location, the session's file selection and
// the per-request reader, one implementation and not a copy — and both test a transcript value through
// `cost-value-core.mjs` before they coerce it (6.28.1). Until 6.24.1 the ledger imported only the
// location and the walk, from the record renderer: its reading loop was a second copy, and both copies kept
// each request's first line. The ledger (`pharn-cost-ledger/2`) is nonetheless a distinct schema from the
// shipped `pharn-cost-record/1`, and the overlap is real: the record is an aggregate block embedded in
// `ship-record.json`, the ledger is a standalone per-request artifact. L35's question ("must the second
// copy exist?") was answered YES at a human gate in the `/pharn-ship` wiring increment. The contract's
// "Relationship to `pharn-cost-record/1`" records why, and this header does not restate it. A ✧ parity
// test asserts the two agree on totals over the same bytes, with the class-name mapping made explicit
// (D4), so the pair cannot drift silently while both exist. Agreement is ALL it proves ([[L43]]): it
// stayed GREEN while both under-counted. The ★ per-request tests over
// `fixtures/cost-ledger/usage-snapshots/` are what bind the rule to transcript shapes actually seen.
//
// Usage:
//   node pharn/floor/render-cost-ledger.mjs <name> [--base <dir>] [--repo <dir>] [--session <id>]
//                                           [--projects-dir <dir>] [--command <cmd>] [--base-sha <sha>]
//                                           [--markers-base <dir>] [--stdout]
// `--verify-transcript` in the checker passes the ledger's OWN recorded `markers[]` to `deriveLedger`, so a
// later invocation's appended markers cannot re-bound an already-written ledger. `deriveLedger` returns the
// same ledger `renderLedger` does, plus the count of excluded requests AFTER the window's end, which the
// checker needs because that part of `excluded_requests` keeps growing after emission (6.14.1).
// Exit codes: 0 = a ledger was written (including an honest `unavailable` one); 2 = bad usage.

import "./runtime-floor.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { findTranscriptDirs, sessionScan } from "./transcript-core.mjs";
import { DEFAULT_BASE as MARKERS_DEFAULT_BASE, MARKER_KINDS, MARKER_MODES, cleanScalar, markerLine } from "./mark-phase.mjs";
import { isRouteToken } from "./route-token-core.mjs";
import { FM_RE, stripBom } from "./frontmatter-core.mjs";
import { readShipOutcome, OUTCOME_SOURCE as SHIP_OUTCOME_SOURCE } from "./ship-outcome-core.mjs";
import {
  runWindow,
  isMember,
  isAfterWindow,
  tsMs,
  bindingMarkers,
  bindRun,
  runContexts,
  agentContext,
  MAIN_CONTEXT,
  MEMBERSHIP_METHOD,
  UNKNOWN_REASONS,
  CONTEXT_REASONS,
} from "./run-window-core.mjs";
import { ABS_PATH_RE, isIdentityToken, isTokenCount } from "./cost-value-core.mjs";
import { readWork, WORK_FILE } from "./stage-work.mjs";
import { buildExecutions, unattachedWork } from "./stage-executions-core.mjs";
import { readEntryEventsFor, dedupeExact, buildEntryView, entryViewDefect, isAdmitted } from "./entry-observations.mjs";

/** What this emitter writes. `/2` adds the `membership` block and scopes every row to the run window. */
export const SCHEMA = "pharn-cost-ledger/2";
/** The legacy schema. Its totals are SESSION-scoped; `check-cost-ledger.mjs` still accepts it, labelled. */
export const LEGACY_SCHEMA = "pharn-cost-ledger/1";

/** The ONE definition of where feature artifacts live. Referenced by `renderLedger`'s parameter default
 *  AND by the CLI's write path — a single const, never two literals. The two-literal form is exactly the
 *  `render-ship-briefing.mjs:438` defect [[L41]] records, and `/pharn-dev-review` found it reproduced here
 *  in an increment that cited L41: `:365` had been updated and the CLI copy had not been noticed, because
 *  every CLI test passes `--base` explicitly. `render-cost-ledger.test.mjs` now exercises the no-`--base`
 *  WRITE path so this const is reachable from the suite. */
export const FEATURE_BASE = "pharn/features";

/** The ONE definition of the emitting command's default, and of the honest base-SHA absence. Both are
 *  referenced by `renderLedger`'s parameter defaults and by NOTHING else — the CLI passes `undefined`
 *  when its flag is absent so the value falls through to here, exactly as `--base` already does.
 *  Before this, each existed as TWO literals (`renderLedger`'s destructuring default and `main()`'s
 *  `opts` object), and because `main()` ALWAYS passed its copy, the destructuring defaults were dead to
 *  every CLI test — [[L41]]'s blind spot in the very module [[L52]] records it in, one constant over.
 *  `/pharn-ship` is the first caller to pass `--command`, which is precisely when a stale copy bites.
 *  L52's remedy is quantified over a SET, so the set is named: ONE no-argument test per default retired
 *  in this change, plus a closure assertion per literal. */
export const DEFAULT_COMMAND = "/pharn-loop";
/** The one command whose outcome is ALWAYS derived and never read from a `LOOP.md` (see `renderLedger`). */
export const SHIP_COMMAND = "/pharn-ship";
export const UNKNOWN_BASE_SHA = "unknown";

/** `outcome.source` — where the outcome CAME from, recorded beside the value so a reader never has to
 *  guess whether it was DECLARED or DERIVED. Two members, and they carry different guarantees:
 *  `LOOP.md` is copied verbatim from a record `check-loop-decision.mjs` can re-derive; `verdicts+markers`
 *  is derived here and its floor/advisory split is stated in `ship-outcome-core.mjs`. The enumeration
 *  lives in ONE place and `check-cost-ledger.mjs` IMPORTS it rather than re-spelling the members — a
 *  second copy would be the sync cost [[L35]] names, and the members would drift apart exactly where
 *  [[L31]] says they do. */
export const LOOP_RECORD_SOURCE = "LOOP.md";
export const OUTCOME_SOURCES = Object.freeze([LOOP_RECORD_SOURCE, SHIP_OUTCOME_SOURCE]);

/** `outcome`'s CLOSED key set, asserted in BOTH directions by `check-cost-ledger.mjs`. A per-member
 *  presence set would admit a variant spelling of any member; closure is what makes a variant fail
 *  ([[L36]]). `blocked` is optional — only a blocked loop stop carries it. */
export const OUTCOME_KEYS = Object.freeze(["decision", "iterations", "source", "blocked"]);

/** No `complete` member, by design — see the header. */
export const COVERAGE = Object.freeze(["partial", "unavailable"]);

/** The attribution VIEW's name and version. Bumping this is how a later, different method announces
 *  itself rather than silently reinterpreting old files (L42: timing is load-bearing). */
export const ATTRIBUTION_METHOD = "latest-marker-at-or-before-ts-same-session/1";

/** The six normalized token classes, 1:1 with the dimensions a published price list charges for.
 *  `output_thinking` is a SUBSET of `output`, not an addition to it — summing all six double-counts
 *  thinking tokens. The name says so; the contract says so; the checker does not "fix" it. */
export const TOKEN_CLASSES = Object.freeze(["input", "cache_write_5m", "cache_write_1h", "cache_read", "output", "output_thinking"]);

/** The CLOSED top-level key set. Membership is asserted in BOTH directions by `check-cost-ledger.mjs`:
 *  no extra key, no missing key. A per-member presence set would be satisfied by a variant spelling of
 *  any member (L36) — closure is what makes that fail. */
export const TOP_LEVEL_KEYS = Object.freeze([
  "schema",
  "name",
  "command",
  "base_sha",
  "outcome",
  "skills_version",
  "skills_version_source",
  "claude_code_versions",
  "sessions",
  "window_start",
  "window_end",
  "coverage",
  "coverage_note",
  "dedup_key",
  "attribution",
  "pricing_note",
  "markers",
  "requests",
  "totals",
  "by_model",
  "by_stage_iteration_model",
  "unattributed",
  "dropped",
  "membership",
  "executions",
  "work",
  "entry_events",
  "entry",
]);

/** The two keys added in 6.35.0 (run-performance-breakdown): the `executions` VIEW over `markers[]` + `work[]`, and the
 *  `work[]` FACTS the regress/verify stage scripts record at `done`. See the contract's "Stage executions and
 *  deterministic work". Every ledger this emitter writes carries both. */
export const WORK_KEYS = Object.freeze(["executions", "work"]);

/** The two keys added in 6.48.0 (entry-gates-ledger-row): the `entry_events[]` FACTS the background entry check
 *  records (`entry-observations.mjs`), and the `entry` VIEW over them. See the contract's "Entry gate observations".
 *  Every ledger this emitter writes carries both. */
export const ENTRY_KEYS = Object.freeze(["entry_events", "entry"]);

/** A `/2` ledger written from 6.35.0 to 6.47.x — `TOP_LEVEL_KEYS` minus `ENTRY_KEYS`, DERIVED (L35). */
export const TOP_LEVEL_KEYS_PRE_ENTRY = Object.freeze(TOP_LEVEL_KEYS.filter((k) => !ENTRY_KEYS.includes(k)));

/** A `/2` ledger written BEFORE 6.35.0 — `TOP_LEVEL_KEYS` minus `WORK_KEYS` and `ENTRY_KEYS`, DERIVED rather than
 *  re-listed (L35). The checker accepts exactly this set, exactly `TOP_LEVEL_KEYS_PRE_ENTRY`, or exactly
 *  `TOP_LEVEL_KEYS` for `/2`: each pair whole or absent, and the later pair only with the earlier one (L36). */
export const TOP_LEVEL_KEYS_PRE_WORK = Object.freeze(TOP_LEVEL_KEYS_PRE_ENTRY.filter((k) => !WORK_KEYS.includes(k)));

/** The `/1` key set — `TOP_LEVEL_KEYS` minus `membership` and the 6.35.0 keys (a `/1` ledger predates both), DERIVED
 *  rather than re-listed (L35). */
export const TOP_LEVEL_KEYS_V1 = Object.freeze(TOP_LEVEL_KEYS_PRE_WORK.filter((k) => k !== "membership"));

/** `membership`'s CLOSED key set under `run-window/2` (L36). `session` is the SELECTED session the window was
 *  computed for, so the checker can recompute the same window from `markers[]` alone. `excluded_requests` counts
 *  deduped session requests OUTSIDE the run — outside a known window, or inside it from another context — and is
 *  `null` when membership is unknown, because then nothing was measured, not excluded (GRILL finding 4). `context`
 *  is the context bound to the run and `contexts` its sorted context set (6.29.0); both are `null` when membership
 *  is unknown or no transcript was measured. */
export const MEMBERSHIP_KEYS = Object.freeze([
  "method",
  "status",
  "reason",
  "session",
  "start",
  "end",
  "excluded_requests",
  "context",
  "contexts",
]);

/** The `run-window/1` key set — `MEMBERSHIP_KEYS` minus the two context keys, DERIVED rather than re-listed (L35). A
 *  ledger written before 6.29.0 carries exactly these, and the checker still reads it under them. */
export const MEMBERSHIP_KEYS_V1 = Object.freeze(MEMBERSHIP_KEYS.filter((k) => k !== "context" && k !== "contexts"));

export const SKILLS_VERSION_SOURCES = Object.freeze(["pharn.config.json", "SKILLS_VERSION", "unknown"]);

/** A `usage` string leaf: a short, printable token. Applied ONLY after `cleanScalar` (L14 — compose the
 *  shape regex after the control-char guard, never instead of it). */
export const TOKEN_RE = /^[A-Za-z0-9._:+-]{1,64}$/;

// `ABS_PATH_RE` and `IDENTITY_MAX` moved to cost-value-core.mjs in 6.28.1, byte-for-byte; import them from there.

export const PRICING_NOTE =
  "TOKENS ONLY — this file contains no prices and never will. Cost = Σ over classes of " +
  "tokens[class] × price(model, class, date, tier), computed by the reader against their OWN current " +
  "price list. `output_thinking` is a SUBSET of `output`, not an additional class — do not sum all six. " +
  "Any figure so derived is LIST-PRICE EQUIVALENT: a subscription is not billed per token, so it is what " +
  "this usage would have cost at list, not what was charged.";

/**
 * THE ONE ENCODING of the `usage` leaf domain: a short, printable, path-free token.
 *
 * Exported and imported by `check-cost-ledger.mjs` rather than re-stated there. The two used to be
 * written separately and had ALREADY diverged — the checker's copy omitted the `ABS_PATH_RE` term, so
 * its leaf rule was strictly weaker than the emitter's, and only a second rule (the whole-document path
 * sweep) masked the gap. [[L31]]: the second copy is where the obligation is dropped.
 */
export function isTokenLeaf(value) {
  return cleanScalar(value, 64) && TOKEN_RE.test(value) && !ABS_PATH_RE.test(value);
}

/**
 * The deepest node the ledger's verbatim `usage` copy keeps, counted from the `usage` object itself (depth 0). A
 * deeper node is DROPPED and its path listed. The platform's own usage objects are a few levels deep on every line
 * measured when this bound was set (CHANGELOG [6.28.1]), so it admits every observed shape with room to spare. It
 * also bounds the walk that makes the copy: a crafted line nested 20,000 deep used to drive that walk past the
 * stack. check-cost-ledger.mjs imports this constant and REDs a stored node deeper than it.
 */
export const USAGE_MAX_DEPTH = 32;

/**
 * A `usage` object KEY the verbatim copy may carry: a short token `isTokenLeaf` admits, and never `__proto__`.
 *
 * `__proto__` is refused because the copy WRITES transcript keys into a plain object, and assigning that key on a
 * plain object sets its prototype instead of adding an own key: the value used to vanish with nothing listed
 * ([[L15]], the same class on the write side). check-cost-ledger.mjs imports this predicate, so a stored refused
 * key is a RED there.
 */
export function isUsageKey(k) {
  return k !== "__proto__" && isTokenLeaf(k);
}

/**
 * An IDENTITY field copied from an untrusted transcript.
 *
 * `model`, `attribution_skill` and `agent_id` are attacker-influencable strings that land in a COMMITTED
 * artifact. They used to be copied with a bare `typeof === "string"` test — no length bound, no
 * control-char guard, no path check — while this increment's own contract claimed "the leaf-shape rule
 * bounds what can land in them". It did not: that rule reaches `usage` only. `/pharn-dev-review` probed
 * it and a 200,000-char value, embedded NUL/BEL bytes, and a newline carrying a forged `RED — …` line
 * were all accepted GREEN. This closes the gap so the sentence is TRUE rather than corrected downward.
 * Since 6.28.1 the test is `isIdentityToken` (cost-value-core.mjs), unchanged in behaviour, and it also bounds
 * the row's `session_id` and each `claude_code_versions` entry. The value is tested BEFORE anything coerces it:
 * callers no longer pass `String(value)`, which threw on a crafted object ([[L62]]).
 *
 * A refusal is recorded in `dropped[]` and the field becomes `fallback` — never a truncation, which would
 * silently invent a value that was never in the transcript.
 */
export function sanitizeIdentity(value, path, dropped, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (!isIdentityToken(value)) {
    dropped.push(path);
    return fallback;
  }
  return value;
}

const zeroTokens = () => Object.fromEntries(TOKEN_CLASSES.map((c) => [c, 0]));

/**
 * Walk a `usage` object, keeping only leaves the FLOOR rule admits.
 *
 * Arrays are WALKED like objects (D1), so `usage.iterations[]` survives and the contract's word
 * "verbatim" stays true. A leaf that is neither number, bool, null, nor a short token is DROPPED and its
 * key path pushed to `dropped` — an out-of-domain value is never coerced, never stringified, never
 * silently kept.
 *
 * Two more refusals since 6.28.1, listed the same way: a node deeper than `USAGE_MAX_DEPTH` (`depth` counts from
 * the `usage` object itself), and an object key `isUsageKey` refuses. A refused key is listed as
 * `<path>.<refused-key>`, a fixed marker, so the raw key never reaches the file. `depth` defaults to 0 in this ONE
 * place, and every call from outside this function omits it ([[L41]]).
 */
export function sanitizeUsage(value, path, dropped, depth = 0) {
  if (depth > USAGE_MAX_DEPTH) {
    dropped.push(path);
    return undefined;
  }
  if (value === null) return null;
  const t = typeof value;
  if (t === "number") return Number.isFinite(value) ? value : (dropped.push(path), undefined);
  if (t === "boolean") return value;
  if (t === "string") {
    if (isTokenLeaf(value)) return value;
    dropped.push(path);
    return undefined;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (let i = 0; i < value.length; i++) {
      const v = sanitizeUsage(value[i], `${path}[${i}]`, dropped, depth + 1);
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  if (t === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      if (!isUsageKey(k)) {
        dropped.push(path ? `${path}.<refused-key>` : "<refused-key>");
        continue;
      }
      const v = sanitizeUsage(value[k], path ? `${path}.${k}` : k, dropped, depth + 1);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  dropped.push(path); // function, symbol, bigint, undefined — not JSON, not admitted
  return undefined;
}

/**
 * The six price-dimension classes, read from one raw `usage` object, for the row at index `n`.
 *
 * Each count must satisfy `isTokenCount` (cost-value-core.mjs). An ABSENT count (undefined or null) is 0, as it
 * always was, and is not listed. A PRESENT count the rule refuses is 0 as well, and `requests[<n>].tokens.<class>`
 * is listed in `dropped`, so a crafted count can neither crash the sum nor enter it (6.28.1, [[L62]]).
 *
 * NO DEFAULTS ([[L41]]): `n` and `dropped` are checked on EVERY call, clean input included, so a caller that
 * omits them fails at once rather than on the first transcript that carries a refused count.
 */
export function normalizeTokens(u, n, dropped) {
  if (!Number.isSafeInteger(n) || n < 0 || !Array.isArray(dropped)) {
    throw new TypeError(
      "normalizeTokens(u, n, dropped): n must be the row's index (a non-negative safe integer) and dropped the ledger's dropped[] array"
    );
  }
  const count = (v, cls) => {
    if (v === undefined || v === null) return 0;
    if (isTokenCount(v)) return v;
    dropped.push(`requests[${n}].tokens.${cls}`);
    return 0;
  };
  return {
    input: count(u.input_tokens, "input"),
    cache_write_5m: count(u.cache_creation?.ephemeral_5m_input_tokens, "cache_write_5m"),
    cache_write_1h: count(u.cache_creation?.ephemeral_1h_input_tokens, "cache_write_1h"),
    cache_read: count(u.cache_read_input_tokens, "cache_read"),
    output: count(u.output_tokens, "output"),
    output_thinking: count(u.output_tokens_details?.thinking_tokens, "output_thinking"),
  };
}

function addTokens(acc, t) {
  for (const c of TOKEN_CLASSES) acc[c] += t[c] ?? 0;
  return acc;
}

/**
 * Read the markers file, tolerating a torn final line (the sibling renderer's posture — an interrupted
 * append is expected, not an error). Returns `[]` when there is no file, which is the recovery case and
 * a real state, not a failure.
 */
export function readMarkers(markersFile) {
  let text;
  try {
    text = readFileSync(markersFile, "utf8");
  } catch {
    return [];
  }
  const raw = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      raw.push(JSON.parse(line));
    } catch {
      continue; // torn line from an interrupted append
    }
  }
  return normalizeMarkers(raw);
}

/**
 * The ONE marker normalization, applied to the file's lines AND to a caller-supplied list (the checker's
 * `--verify-transcript` passes a ledger's recorded `markers[]`). Unknown kinds and non-numeric `seq` are
 * dropped; `origin` survives only as the literal `pending` that `mark-phase.mjs` writes on adoption; `mode`
 * (6.25.0) survives only as a `MARKER_MODES` member, the same pattern — a garbage value is dropped, which
 * `ship-outcome-core.mjs`'s `runMode()` then reads as `"full"`, the safe direction: a full reading needs a
 * regress stage-start a quick run never writes (that module's header, "A SKIPPED OR WRONG MODE MARKER").
 * `route` (6.27.0) survives only as a valid route token (`isRouteToken`, from `route-token-core.mjs` — the
 * grammar's one owner, which loads no routing policy), the same pattern again: a garbage value is dropped,
 * so `cost.json`'s `markers[]` carries a stage's REQUESTED route next to its requests' SERVED `model`. No
 * other re-derivation of `markers[]` reads it — run membership, attribution, the ship outcome and the run
 * report's staleness identity are unchanged by it, and a test pins that (L63).
 */
export function normalizeMarkers(list) {
  const out = [];
  for (const r of Array.isArray(list) ? list : []) {
    if (!r || typeof r.seq !== "number" || !MARKER_KINDS.has(r.kind)) continue;
    const m = {
      seq: r.seq,
      kind: r.kind,
      stage: typeof r.stage === "string" ? r.stage : null,
      iteration: typeof r.iteration === "number" ? r.iteration : null,
      ts: typeof r.ts === "string" ? r.ts : null,
      session_id: typeof r.session_id === "string" ? r.session_id : null,
    };
    if (r.origin === "pending") m.origin = "pending";
    if (typeof r.mode === "string" && MARKER_MODES.has(r.mode)) m.mode = r.mode;
    if (isRouteToken(r.route)) m.route = r.route;
    out.push(m);
  }
  return out.sort((a, b) => a.seq - b.seq);
}

/**
 * Attribute one request to a stage/iteration.
 *
 * THE VIEW, stated once: the latest marker whose `ts` is at-or-before the request's, in the SAME
 * session. Before the first such marker a request is `unattributed` — an honest bucket, never folded
 * into a neighbour. A `run-stop` or `orchestrator` marker carries no stage, so requests after it are
 * attributed to the orchestrator rather than to the stage that just finished; that is the whole reason
 * D5 chose the full marker set.
 *
 * BOUND, and it is inherent: the request that ISSUES a marker call necessarily precedes the marker it
 * writes, so at most one request per boundary lands on the earlier side. Stated, not corrected — the
 * correction would be a guess.
 */
export function attribute(markers, ts, sessionId) {
  // Compared as NUMBERS (`tsMs`), never as strings: `…:00Z` sorts after `…:00.000Z` lexically, so a
  // precision mismatch could otherwise bill a request to the wrong stage (REVIEW finding 4). The same
  // conversion `run-window-core.mjs` uses for membership, imported rather than re-stated.
  const at = tsMs(ts);
  if (at === null) return { stage: null, iteration: null };
  let best = null;
  let bestMs = null;
  for (const m of markers) {
    const t = tsMs(m.ts);
    if (t === null || t > at) continue;
    if (m.session_id !== null && sessionId !== null && m.session_id !== sessionId) continue;
    if (best === null || t > bestMs || (t === bestMs && m.seq > best.seq)) {
      best = m;
      bestMs = t;
    }
  }
  if (best === null) return { stage: null, iteration: null };
  return { stage: best.stage, iteration: best.iteration };
}

/** Read `outcome` from the LOOP.md ENVELOPE only — never grepped from the body (L6). A `decision:` line
 *  in prose is DATA about a record, not a declaration of one. Returns null when there is no record. */
export function readOutcome(loopPath) {
  let text;
  try {
    text = stripBom(readFileSync(loopPath, "utf8"));
  } catch {
    return null;
  }
  const m = text.match(FM_RE);
  if (!m) return null;
  const fields = new Map(); // a Map, never a plain object keyed by arbitrary input (L15)
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*)$/);
    if (kv) fields.set(kv[1], kv[2].trim().replace(/^["']|["']$/g, ""));
  }
  const decision = fields.get("decision");
  if (typeof decision !== "string" || decision.length === 0) return null;
  const iterations = fields.get("iterations");
  const out = {
    decision,
    iterations: iterations !== undefined && /^\d+$/.test(iterations) ? Number(iterations) : null,
    source: LOOP_RECORD_SOURCE,
  };
  const blocked = fields.get("blocked");
  if (typeof blocked === "string" && blocked.length > 0) out.blocked = blocked;
  return out;
}

/** `skillsVersion` from an install's `pharn.config.json`, else this repo's `SKILLS_VERSION`, else an
 *  honest `unknown`. The SOURCE is recorded beside the value so a reader never has to guess which. */
export function readSkillsVersion(repo) {
  try {
    const cfg = JSON.parse(readFileSync(join(repo, "pharn.config.json"), "utf8"));
    if (typeof cfg.skillsVersion === "string" && cfg.skillsVersion.trim()) {
      return { version: cfg.skillsVersion.trim(), source: "pharn.config.json" };
    }
  } catch {
    // no config, or no skillsVersion in it — fall through to the repo file
  }
  try {
    const v = readFileSync(join(repo, "SKILLS_VERSION"), "utf8").trim();
    if (v) return { version: v, source: "SKILLS_VERSION" };
  } catch {
    // neither source present: an install that predates the key, or a bare directory
  }
  return { version: null, source: "unknown" };
}

/**
 * The context a ledger ROW belongs to, read from the row alone (6.29.0): `main` for `sidechain: false`,
 * `agent:<agent_id>` for `sidechain: true` with a string `agent_id`, else null. The emitter emits a row only when
 * this reading EQUALS the context the transcript reader decided for the request (`contextOf`), so
 * `check-cost-ledger.mjs` can re-test every row against the recorded `contexts` from the file alone. Imported by the
 * checker, never re-spelled ([[L35]]).
 */
export function rowContext(row) {
  if (row === null || typeof row !== "object") return null;
  if (row.sidechain === false) return MAIN_CONTEXT;
  if (row.sidechain === true && typeof row.agent_id === "string" && row.agent_id) return agentContext(row.agent_id);
  return null;
}

/** The `membership` block (see `MEMBERSHIP_KEYS`). `status`/`reason` default to the window's; a CONTEXT-unknown
 *  ledger passes its own, keeping the window's `start`/`end`, which the checker re-derives from `markers[]`. */
function membershipOf(win, session, excluded, { status = win.status, reason = win.reason, context = null, contexts = null } = {}) {
  return {
    method: MEMBERSHIP_METHOD,
    status,
    reason,
    session: session ?? null,
    start: win.start,
    end: win.end,
    excluded_requests: status === "unknown" ? null : excluded,
    context,
    contexts,
  };
}

function unavailableLedger({ name, command, baseSha, outcome, skills, markers, note, membership }) {
  return {
    schema: SCHEMA,
    name,
    command,
    base_sha: baseSha,
    outcome,
    skills_version: skills.version,
    skills_version_source: skills.source,
    claude_code_versions: [],
    sessions: [],
    window_start: null,
    window_end: null,
    coverage: "unavailable",
    coverage_note: note,
    dedup_key: "requestId",
    attribution: { method: ATTRIBUTION_METHOD, markers: markers.length },
    pricing_note: PRICING_NOTE,
    markers,
    requests: [],
    totals: { requests: 0, tokens: zeroTokens() },
    by_model: [],
    by_stage_iteration_model: [],
    unattributed: { requests: 0, tokens: zeroTokens() },
    dropped: [],
    membership,
  };
}

/** Build the ledger object. Pure over its inputs — no clock, no randomness. */
export function renderLedger(opts) {
  return deriveLedger(opts).ledger;
}

/**
 * The ledger PLUS one number the ledger does not carry: how many of the excluded requests lie AFTER the
 * window's end (`isAfterWindow`). The ledger itself is exactly `renderLedger`'s — same object, same bytes;
 * nothing is added to the file.
 *
 * WHY THE SPLIT EXISTS (6.14.1, a real failure): `membership.excluded_requests` is a count AT EMISSION of
 * two parts that age differently. The transcript is append-only, so the part before the window is fixed
 * once the window is, and the part after its end grows for as long as the session continues — the
 * emission's own turn, then the stop's commit, then whatever the session does next. `check-cost-ledger.mjs
 * --verify-transcript` needs the split to compare the fixed part exactly and the growing part as a bound.
 * Recording the split in the file instead would change `membership`'s closed key set, a breaking contract
 * change with no observed need.
 */
export function deriveLedger(opts) {
  const stats = { excludedAfterWindow: 0 };
  const ledger = withEntry(withWork(buildLedger(opts, stats), opts), opts);
  return { ledger, excludedAfterWindow: stats.excludedAfterWindow };
}

/**
 * Append the 6.48.0 keys — on EVERY path, like the 6.35.0 keys. `entry_events[]` = the valid lines of
 * `<markersBase>/<name>/entry.jsonl` (`entry-observations.mjs readEntryEventsFor`, which refuses a linked directory
 * chain) that the run window over the ledger's OWN `markers[]` for the selected session ADMITS (`isAdmitted`: every
 * timestamp the line carries is a window member, the test `requests[]` and `work[]` rows pass — so a bounded window's
 * cutoff is its `run-stop`, and a call that ended later stays out), exact duplicates dropped (first kept).
 * An invalid line joins `dropped[]` as `entry.jsonl[<n>]`. `entry` is `buildEntryView(markers, entry_events,
 * executions)`, which `check-cost-ledger.mjs` recomputes from the file. Emission never waits for the background runner:
 * whatever it has not written yet is simply not a fact. Nothing above is changed: every existing key keeps its value.
 */
function withEntry(ledger, { name, sessionId, markersBase = MARKERS_DEFAULT_BASE, markers: suppliedMarkers, entryEvents: suppliedEvents }) {
  // A re-derivation under a RECORDED boundary (`--verify-transcript`) never reads the live file (L58), as for work[].
  const { records, dropped } =
    suppliedMarkers !== undefined
      ? { records: Array.isArray(suppliedEvents) ? suppliedEvents : [], dropped: [] }
      : readEntryEventsFor(name, markersBase);
  const win = runWindow(ledger.markers, sessionId ?? null);
  const events = dedupeExact(records.filter((e) => isAdmitted(win, e)));
  return {
    ...ledger,
    dropped: dropped.length ? [...ledger.dropped, ...dropped] : ledger.dropped,
    entry_events: events,
    entry: buildEntryView(ledger.markers, events, ledger.executions),
  };
}

/**
 * Append the 6.35.0 keys to a built ledger — on EVERY path, the unavailable and context-unknown shells included,
 * because timing needs only markers: a run whose transcript is gone still has its stage intervals.
 *
 * `work[]` = the valid records of `<markersBase>/<name>/work.jsonl` (`stage-work.mjs readWork`) that are MEMBERS of the
 * run window computed over the ledger's OWN `markers[]` for the selected session — `isMember`, the test every request
 * row passes; an unknown window admits none. A line that fails validation is not a row: its index joins `dropped[]` as
 * `work[<n>]`. `executions` is `buildExecutions(markers, work)`, which `check-cost-ledger.mjs` recomputes from the file.
 * Nothing here reads the transcript, and nothing above is changed: every existing key keeps its value.
 */
function withWork(ledger, { name, sessionId, markersBase = MARKERS_DEFAULT_BASE, markers: suppliedMarkers, work: suppliedWork }) {
  // A re-derivation under a RECORDED boundary (`check-cost-ledger.mjs --verify-transcript` passes the ledger's own
  // `markers[]`) never reads the live work file: that check compares neither 6.35.0 key, and the live file is still
  // growing (L58). It uses the records it is handed, or none.
  const { records, dropped } =
    suppliedMarkers !== undefined
      ? { records: Array.isArray(suppliedWork) ? suppliedWork : [], dropped: [] }
      : readWork(join(markersBase, name, WORK_FILE));
  const win = runWindow(ledger.markers, sessionId ?? null);
  const work = records.filter((w) => isMember(win, w.ts, w.session_id));
  return {
    ...ledger,
    dropped: dropped.length ? [...ledger.dropped, ...dropped] : ledger.dropped,
    executions: buildExecutions(ledger.markers, work),
    work,
  };
}

function buildLedger(
  {
    name,
    command = DEFAULT_COMMAND,
    baseSha = UNKNOWN_BASE_SHA,
    repo = ".",
    sessionId,
    projectsDir,
    markersBase = MARKERS_DEFAULT_BASE,
    featureBase = FEATURE_BASE,
    markers: suppliedMarkers,
  },
  stats
) {
  // A supplied list (the checker's `--verify-transcript`) re-derives under the RECORDED boundary; absent,
  // the live markers file is read. Both pass through the same normalization.
  const markers = suppliedMarkers === undefined ? readMarkers(join(markersBase, name, "markers.jsonl")) : normalizeMarkers(suppliedMarkers);
  const win = runWindow(markers, sessionId ?? null);
  // PRECEDENCE, and it is one-way: a DECLARED envelope always wins over a DERIVED outcome. `/pharn-loop`
  // writes `LOOP.md` before this runs, so its bytes do not move; `/pharn-ship` writes no such record, so
  // it falls through to the derivation. Deriving is NOT a repair of a missing envelope — `readOutcome`
  // returning null is the ordinary state of every non-loop caller, and `deriveShipOutcome` returns null
  // in turn when there are no markers, so "no evidence" still renders as `null` rather than as a stop
  // nobody observed. The derivation's own floor/advisory split lives in `ship-outcome-core.mjs` and is
  // restated by neither this module nor the report (P4 — cited, not copied).
  const featureDir = join(repo, featureBase, name);
  // SOURCE SELECTION IS BY THE EMITTING COMMAND, not by which artifacts happen to exist (6.9.1). A
  // `/pharn-ship` run over a feature directory a `/pharn-loop` run created — reachable through
  // `/pharn-spec`'s resume path — used to COPY that old loop's `LOOP.md` decision as the ship run's own
  // outcome. `/pharn-ship` writes no `LOOP.md`, so a `LOOP.md` beside it is never its record. Every other
  // command keeps the historic precedence, so `/pharn-loop`'s declared-outcome path is byte-identical.
  const outcome =
    command === SHIP_COMMAND
      ? readShipOutcome(featureDir, markers)
      : (readOutcome(join(featureDir, "LOOP.md")) ?? readShipOutcome(featureDir, markers));
  const skills = readSkillsVersion(repo);
  // Transcript-absence shells: nothing was read, so nothing was excluded — `excluded_requests` is 0 for a
  // known window and null for an unknown one (see `membershipOf`).
  const shell = (note, excluded = 0) =>
    unavailableLedger({ name, command, baseSha, outcome, skills, markers, note, membership: membershipOf(win, sessionId, excluded) });

  if (!sessionId) return shell("no session id available (CLAUDE_CODE_SESSION_ID unset)");
  const hits = findTranscriptDirs(projectsDir, sessionId);
  // No note below names a directory. `projectsDir` / `projectDir` are LOCAL paths, and interpolating one
  // wrote it into cost.json, where check-cost-ledger.mjs rule 3 then REDs the whole artifact — so an
  // ordinary transcript miss produced a ledger the shipped checker refuses. Say WHAT happened, never WHERE.
  if (hits.length === 0) return shell(`no transcript found for session ${sessionId} under the configured projects directory`);
  if (hits.length > 1) {
    // A UUID colliding across directories is unreachable on a sane tree, but the BRANCH is live: a
    // malformed `--session` holding a path separator also lands here, and refusing is correct for both.
    // Do not delete it because the happy path cannot reach it (L51 — a guard deleted as "now
    // unreachable" is unreachable only under the reasoning that deleted it).
    return shell(`session ${sessionId} resolves to ${hits.length} transcript directories — refusing to guess which run to report`);
  }

  const projectDir = hits[0];
  // THE BINDING EVIDENCE (`run-window/2`, rule 6): the lines mark-phase printed for this session's current-run
  // markers, rebuilt by its ONE encoding (`markerLine`). An unknown window binds nothing, so none is looked for.
  const lines = win.status === "unknown" ? [] : bindingMarkers(markers, sessionId).map(markerLine);
  // One entry per request, from the ONE owner of the counting rule (see the header), in the same pass as the
  // context evidence. Nothing below reads a transcript line: identity, `ts` and `context` come from the request's
  // first line, `usage` from its line with the most output tokens.
  const { files, requests: read, holders, links, named } = sessionScan(projectDir, sessionId, lines);
  // A hit means `<dir>/<sessionId>.jsonl` STATTED, not that a transcript is readable out of `<dir>`:
  // the two matchers disagree on some inputs, and the file can be unlinked between them. Without this,
  // such a run renders `partial` with zero rows — a measurement that never happened, reported as a
  // cheap one. This is L51's exact defect and it is kept deliberately.
  if (files.length === 0) return shell(`a transcript directory matched session ${sessionId}, but no transcript file under it was selected`);

  // Rule 6: the run's context, bound by the ONE context whose tool results carry a binding line; rule 7: its set.
  let bound = null;
  let run = null;
  if (win.status !== "unknown") {
    const held = [];
    for (const l of lines) for (const c of holders.get(l) ?? []) held.push(c);
    bound = bindRun(held);
    if (bound.context !== null) {
      run = runContexts({ run: bound.context, links, openMs: win.openings(sessionId), endMs: win.endMs, named });
    }
  }
  // CONTEXT-unknown (rules 6 and 8): no rows, `excluded_requests: null`, the window's own start/end kept.
  const contextShell = (reason) =>
    unavailableLedger({
      name,
      command,
      baseSha,
      outcome,
      skills,
      markers,
      note: `run membership unknown — ${reason}; ${read.length} usage-bearing request(s) of session ${sessionId} were seen and NONE is reported as run usage`,
      membership: membershipOf(win, sessionId, null, { status: "unknown", reason }),
    });

  const requests = [];
  let excluded = 0;
  let excludedByContext = 0;
  let unlinked = false;
  const dropped = [];
  const versions = new Set();
  const sessions = new Set();
  let start = null;
  let end = null;

  for (const { id, record: r, usage: u, context } of read) {
    const model = r.message.model ?? "unknown";
    const ts = typeof r.timestamp === "string" ? r.timestamp : null;
    // THE SESSION MEMBERSHIP AND ATTRIBUTION READ, exactly as before 6.28.1: a string as itself, anything else as
    // absent. Only the EMITTED `session_id` below is bounded, so a refused session string is still compared as
    // itself, and markers bound to another session still exclude it (GRILL R2-G7).
    const sid = typeof r.sessionId === "string" ? r.sessionId : null;
    // MEMBERSHIP first, attribution second — two decisions, two functions. A non-member is COUNTED and
    // never emitted: not its usage, not its identity fields, not its version. The owner groups lines per
    // request, so a request written on several lines is counted once here too.
    if (!isMember(win, ts, sid)) {
      excluded++;
      // The part of the exclusion that keeps GROWING after emission (see `deriveLedger`). Counted, never
      // emitted: the file's `excluded_requests` stays the one sum it always was.
      if (isAfterWindow(win, ts)) stats.excludedAfterWindow++;
      continue;
    }
    // The CONTEXT half (rules 7 and 8). An unbound run reports nothing inside its window (the shell below). A
    // context outside the run's set is COUNTED as excluded — inside the window, so never part of the growing tail.
    // An undecidable one makes the whole ledger unknown: no guessed row, and no silent drop.
    if (run === null) continue;
    const inRun = run.member(context);
    if (inRun === null) {
      unlinked = true;
      continue;
    }
    if (inRun === false) {
      excluded++;
      excludedByContext++;
      continue;
    }
    // Both observed agent-id spellings, in a fixed precedence (L36 — a parameterized value acquires
    // variant spellings, and a set pinned to the one its author saw certifies only that one).
    const rawAgent = typeof r.agentId === "string" ? r.agentId : typeof r.attributionAgent === "string" ? r.attributionAgent : null;
    const where = ts === null ? { stage: null, iteration: null } : attribute(markers, ts, sid);
    const n = requests.length;
    const row = {
      // `id` is already a bounded identity token: the reader admits no other (`sessionRequests()`). No `String()`.
      request_id: id,
      ts,
      session_id: sanitizeIdentity(r.sessionId, `requests[${n}].session_id`, dropped),
      // The three identity fields are BOUNDED, not merely copied — see `sanitizeIdentity`. `model`
      // falls back to the literal `unknown` (the `render-cost-record.mjs` spelling) because the field
      // is required non-empty; the other two fall back to null, which is already their absent value.
      // Each value reaches `sanitizeIdentity` uncoerced, which tests it before anything reads it as a string.
      model: sanitizeIdentity(model, `requests[${n}].model`, dropped, "unknown"),
      sidechain: r.isSidechain === true,
      agent_id: sanitizeIdentity(rawAgent, `requests[${n}].agent_id`, dropped),
      attribution_skill: sanitizeIdentity(r.attributionSkill, `requests[${n}].attribution_skill`, dropped),
      usage: sanitizeUsage(u, "usage", dropped),
      tokens: normalizeTokens(u, n, dropped),
      stage: where.stage,
      iteration: where.iteration,
    };
    // The checker reads a row's context from the row alone (`rowContext`). By construction it equals the reader's
    // (`contextOf` admits exactly the `isSidechain`/`agentId` values these fields copy), and this line keeps that a
    // fact rather than an argument: a row the checker would read differently makes the ledger unknown, never GREEN.
    if (rowContext(row) !== context) {
      unlinked = true;
      continue;
    }
    requests.push(row);
    // The version is listed under its source field's name, since the ledger has no per-row version field.
    const version = sanitizeIdentity(r.version, `requests[${n}].version`, dropped);
    if (version !== null) versions.add(version);
    if (row.session_id !== null) sessions.add(row.session_id);
    if (ts !== null) {
      if (start === null || ts < start) start = ts;
      if (end === null || ts > end) end = ts;
    }
  }

  requests.sort((a, b) =>
    a.ts === b.ts ? (a.request_id < b.request_id ? -1 : 1) : a.ts === null ? -1 : b.ts === null ? 1 : a.ts < b.ts ? -1 : 1
  );

  // UNKNOWN membership: the rows were read (so the count is real) but none is run usage. `unavailable`,
  // with no rows — never the session's usage presented as the run's, never an observed-looking zero.
  if (win.status === "unknown") {
    return shell(
      `run membership unknown — ${win.reason}; ${excluded} usage-bearing request(s) of session ${sessionId} were seen and NONE is reported as run usage`,
      null
    );
  }
  // CONTEXT-unknown (6.29.0): the window is known, but the run could not be bound to one context (rule 6), or a
  // request inside the window comes from a context the transcript does not link to the run's tree (rule 8).
  if (bound.context === null) return contextShell(bound.reason);
  if (unlinked) return contextShell(UNKNOWN_REASONS.UNLINKED_CONTEXT);
  const measured = { context: bound.context, contexts: run.contexts };

  if (requests.length === 0) {
    if (excluded === 0) {
      const empty = shell(`transcript for session ${sessionId} carried no usage-bearing assistant records`);
      empty.dropped = dropped;
      return empty;
    }
    // A KNOWN window that contained nothing: an OBSERVED zero. `partial`, not `unavailable` — the
    // measurement happened. The checker admits an empty `partial` only under a known window (L34).
    return {
      ...shell(
        `the run window contained no usage-bearing request of the run's own contexts in session ${sessionId}; ${excluded} session request(s) fell outside the run — an OBSERVED zero for the measured window, not an unknown`,
        excluded
      ),
      coverage: "partial",
      sessions: [sessionId],
      dropped,
      membership: membershipOf(win, sessionId, excluded, measured),
    };
  }

  return {
    schema: SCHEMA,
    name,
    command,
    base_sha: baseSha,
    outcome,
    skills_version: skills.version,
    skills_version_source: skills.source,
    claude_code_versions: [...versions].sort(),
    sessions: [...sessions].sort(),
    window_start: start,
    window_end: end,
    coverage: "partial",
    coverage_note: `measured from the selected session's transcript, restricted to the run window and to the run's own contexts (membership ${MEMBERSHIP_METHOD}, ${win.status}; the run's context is ${bound.context}, ${run.contexts.length} context(s) in its set); ${excluded} session request(s) outside the run were excluded, ${excludedByContext} of them inside the window from other contexts. NEVER complete — the request that opened the window, the emission's own turns and any other session's requests are not in it. A floor on this run's spend, not the total, and not a feature's lifetime cost.`,
    dedup_key: "requestId",
    attribution: { method: ATTRIBUTION_METHOD, markers: markers.length },
    pricing_note: PRICING_NOTE,
    markers,
    requests,
    ...buildViews(requests),
    dropped,
    membership: membershipOf(win, sessionId, excluded, measured),
  };
}

/** Every view, recomputed from `requests[]` alone. `check-cost-ledger.mjs` calls THIS function on the
 *  file's own rows and compares — so the checker and the emitter cannot disagree about what a view
 *  means, only about whether the stored one matches. Arrays, not keyed objects, so no arbitrary key
 *  ever indexes a plain object (L15). */
export function buildViews(requests) {
  const totals = { requests: 0, tokens: zeroTokens() };
  const unattributed = { requests: 0, tokens: zeroTokens() };
  const byModel = new Map();
  const byTriple = new Map();

  for (const r of requests) {
    totals.requests++;
    addTokens(totals.tokens, r.tokens);
    if (!byModel.has(r.model)) byModel.set(r.model, { model: r.model, requests: 0, tokens: zeroTokens() });
    const m = byModel.get(r.model);
    m.requests++;
    addTokens(m.tokens, r.tokens);

    if (r.stage === null) {
      unattributed.requests++;
      addTokens(unattributed.tokens, r.tokens);
    }
    const key = `${r.stage ?? ""}\u0000${r.iteration ?? ""}\u0000${r.model}`;
    if (!byTriple.has(key))
      byTriple.set(key, { stage: r.stage, iteration: r.iteration, model: r.model, requests: 0, tokens: zeroTokens() });
    const t = byTriple.get(key);
    t.requests++;
    addTokens(t.tokens, r.tokens);
  }

  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return {
    totals,
    by_model: [...byModel.values()].sort((a, b) => cmp(a.model, b.model)),
    by_stage_iteration_model: [...byTriple.values()].sort(
      (a, b) => cmp(a.stage ?? "", b.stage ?? "") || (a.iteration ?? 0) - (b.iteration ?? 0) || cmp(a.model, b.model)
    ),
    unattributed,
  };
}

/** The two FACT arrays (the contract's "record facts, derive views"), written one element per line. Every
 *  other value in the file is a derived view or scalar metadata and stays pretty-printed. */
export const ROW_ARRAYS = Object.freeze(["markers", "requests", "work", "entry_events"]);

/** A derived view whose `rows` are written one per line too (6.35.0), so a many-iteration run's elapsed view costs a
 *  line per execution in a diff, not a dozen. `entry.invocations` likewise (6.48.0). */
export const NESTED_ROW_ARRAYS = Object.freeze({ executions: "rows", entry: "invocations" });

/**
 * THE ONE serialization of a ledger, used by BOTH CLI output paths (the file write and `--stdout`).
 *
 * Pretty-printed at a 2-space indent, exactly like `JSON.stringify(ledger, null, 2)`, except the
 * `ROW_ARRAYS`: each of their elements is `JSON.stringify(element)` on its own line. An empty one stays
 * `[]`. `JSON.parse` of the result equals `JSON.parse` of the old form, key order included.
 *
 * WHY (6.14.1, a real failure): a downstream `/pharn-loop` ledger of 630 rows was 33,051 lines, about 52
 * per row, because every row's nested `usage` object was expanded. That was 33,051 of the 38,927 lines
 * its PR added. The size had been disclosed in bytes; the cost that hurt was lines in a diff. The measured
 * before and after live in `cost-ledger.md` ("Size"), not here ([[L35]]).
 *
 * "One element per line" means per `\n`-delimited line. `JSON.stringify` escapes `\n` and every C0
 * control, so no value can split a row. It leaves U+2028, U+2029 and U+0085 RAW, and some editors and diff
 * viewers draw those as line breaks. `cleanScalar` admits them, so a bounded identity field can carry one.
 * Stated, not escaped: escaping them would change no parse but would add a second rule to keep.
 *
 * Deterministic: no clock, no randomness, no locale. Top-level keys go in the ledger's own insertion
 * order, which `buildLedger` fixes. A key whose value `JSON.stringify` would omit is omitted here too, and a
 * row element that stringifies to `undefined` becomes `null`, as it would inside a JSON array.
 */
export function serializeLedger(ledger) {
  const entries = [];
  for (const key of Object.keys(ledger)) {
    const value = ledger[key];
    if (value === undefined || typeof value === "function" || typeof value === "symbol") continue;
    let body;
    const nested = Object.hasOwn(NESTED_ROW_ARRAYS, key) ? NESTED_ROW_ARRAYS[key] : null;
    if (ROW_ARRAYS.includes(key) && Array.isArray(value) && value.length > 0) {
      const rows = value.map((el, i) => `    ${JSON.stringify(el) ?? "null"}${i < value.length - 1 ? "," : ""}`);
      body = `[\n${rows.join("\n")}\n  ]`;
    } else if (nested !== null && value !== null && typeof value === "object" && !Array.isArray(value)) {
      const parts = [];
      for (const k of Object.keys(value)) {
        const v = value[k];
        if (v === undefined || typeof v === "function" || typeof v === "symbol") continue;
        let b;
        if (k === nested && Array.isArray(v) && v.length > 0) {
          const rows = v.map((el, i) => `      ${JSON.stringify(el) ?? "null"}${i < v.length - 1 ? "," : ""}`);
          b = `[\n${rows.join("\n")}\n    ]`;
        } else {
          b = JSON.stringify(v, null, 2).replace(/\n/g, "\n    ");
        }
        parts.push(`    ${JSON.stringify(k)}: ${b}`);
      }
      body = parts.length === 0 ? "{}" : `{\n${parts.join(",\n")}\n  }`;
    } else {
      body = JSON.stringify(value, null, 2).replace(/\n/g, "\n  ");
    }
    entries.push(`  ${JSON.stringify(key)}: ${body}`);
  }
  return entries.length === 0 ? "{}\n" : `{\n${entries.join(",\n")}\n}\n`;
}

/** The compact per-stage table `/pharn-loop` Step 7 prints. The FILE is the record; this screen copy is
 *  advisory and is regenerated from the same rows, never typed. Three blocks, kept apart on purpose (6.35.0): model
 *  usage (tokens, from `requests[]`), observed elapsed (from `executions`), deterministic work (from `work[]`) — no
 *  number in one is derived from another, and none is subtracted from another. */
export function table(ledger) {
  return [...usageLines(ledger), ...windowLines(ledger), ...elapsedLines(ledger), ...workLines(ledger), ...entryLines(ledger)].join("\n");
}

/** The ledger window, labelled for what it is: two marker timestamps, the stop written BEFORE this ledger, the report
 *  and the closeout steps — so it is not the whole command, and not delivery time. */
export function windowLines(ledger) {
  const m = ledger.membership;
  if (!m || typeof m !== "object") return [];
  const a = tsMs(m.start);
  if (a === null) return ["ledger window — UNKNOWN (the markers do not bound one run). Not a zero."];
  const b = tsMs(m.end);
  const span = b === null ? "open (no run-stop marker)" : b >= a ? formatMs(b - a) : "unmeasured — the run-stop precedes the run-start";
  return [
    `ledger window — run-start to run-stop marker: ${span} (run-stop is written before this ledger, the report and the closeout; not the whole command)`,
  ];
}

/**
 * The entry-gate block (6.48.0): the background check's observed timing, kept apart from the sequential stage elapsed
 * above and never added to it. Every number carries its kind; an unmeasured value prints its status, never a number.
 */
export function entryLines(ledger) {
  const v = ledger.entry;
  if (!Object.hasOwn(ledger, "entry")) return ["entry gates — not recorded (a ledger written before 6.48.0)"];
  const head = "entry gates — the background check, observed apart from the stage rows (never added to them)";
  if (entryViewDefect(v) !== null)
    return [head, "  (the stored view does not have the shape the emitter writes — run check-cost-ledger.mjs on it)"];
  if (v.status === "unknown")
    return [head, `  UNKNOWN — the run window is unknown (${v.reason}), so no observation was admitted. Not a zero.`];
  const lines = [head];
  if (v.invocations.length === 0) {
    lines.push("  no entry invocation recorded in this run (none started, or its start record was not written)");
  }
  for (const x of v.invocations) lines.push(...invocationLines(x));
  if (v.unbound_events > 0)
    lines.push(`  ${v.unbound_events} observation(s) bind to no invocation of this run — shown as a count, never attached`);
  if (v.conflicting_events > 0)
    lines.push(`  ${v.conflicting_events} observation(s) conflict with another of the same identity — not measured`);
  return lines;
}

function invocationLines(x) {
  const out = [];
  const st = x.start;
  const lt = x.lifetime;
  const life =
    lt.status === "measured"
      ? `${formatMs(lt.elapsed_ms)} (wall clock, start to the ${lt.end_by} end record; placement, not CPU or gate time)`
      : lt.status === "incomplete"
        ? "INCOMPLETE — no end record at or before the cutoff; the time it ran is unknown"
        : `unmeasured — ${lt.reason}`;
  out.push(
    `  invocation ${x.nonce.slice(0, 8)}: ${st ? `start ${st.outcome} (call ${formatMs(st.elapsed_ms)})` : "start conflicting"}; lifetime ${life}`
  );
  for (const s of x.segments) {
    const v =
      s.status === "complete" || s.status === "end-only"
        ? `${formatMs(s.elapsed_ms)} monotonic, ${s.gates} gate(s), ended ${s.end}${s.status === "end-only" ? " (no begin record: not placed)" : ""}`
        : s.status === "incomplete"
          ? "INCOMPLETE — begun, no end record at or before the cutoff"
          : "conflicting records — not measured";
    out.push(`    ${s.kind ?? "segment"} ${s.segment.slice(0, 6)}: ${v}`);
  }
  const union =
    x.segments_union_ms === null
      ? "UNKNOWN — no segment could be placed (none recorded, or none ended before the cutoff); not a zero"
      : `${formatMs(x.segments_union_ms)}${x.segment_coverage === "partial" ? " (partial: some segments are not placeable)" : ""}`;
  out.push(`    execution union: ${union}`);
  if (x.segments_overlap_marked_stages_ms !== null) {
    out.push(
      `    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): ${formatMs(x.segments_overlap_marked_stages_ms)}`
    );
  } else if (x.segments_union_ms !== null) {
    out.push("    overlap with stage rows: UNKNOWN — no measured stage row to place it against; not a zero");
  }

  if (x.waits.length === 0) out.push("    wait calls: none recorded");
  else
    out.push(
      `    wait calls: ${x.waits.length} (${x.waits.map((w) => `${formatMs(w.elapsed_ms)} ${w.status}${w.takeover ? ", ran a takeover" : ""}`).join("; ")}); union ${formatMs(x.waits_union_ms)} foreground`
    );
  for (const a of x.aborts)
    out.push(`    abort: ${a.stopped ? "stopped the runner" : "nothing running"}${a.wrote_result ? ", recorded the end" : ""}`);
  return out;
}

function usageLines(ledger) {
  const rows = ledger.by_stage_iteration_model;
  const m = ledger.membership;
  const scope = m ? `run window ${m.status}${m.status === "unknown" ? "" : `, ${m.excluded_requests} outside excluded`}` : "session-scoped";
  const lines = [
    `cost ledger — ${ledger.name} (${ledger.coverage}, ${scope}, ${ledger.totals.requests} requests, dedup on ${ledger.dedup_key})`,
  ];
  if (m && m.status === "unknown") return lines.concat(`  run usage UNKNOWN — ${m.reason}. Not a zero.`);
  if (rows.length === 0) return lines.concat("  (no attributed requests)");
  const w = (s, n) => String(s).padEnd(n);
  const r = (s, n) => String(s).padStart(n);
  lines.push(`  ${w("stage", 18)}${r("iter", 5)}  ${w("model", 20)}${r("reqs", 6)}${r("cache_read", 12)}${r("output", 9)}`);
  for (const t of rows) {
    lines.push(
      `  ${w(t.stage ?? "(unattributed)", 18)}${r(t.iteration ?? "-", 5)}  ${w(t.model, 20)}${r(t.requests, 6)}${r(t.tokens.cache_read, 12)}${r(t.tokens.output, 9)}`
    );
  }
  lines.push(`  TOKENS ONLY — no prices here. Multiply by your own price list; output_thinking ⊂ output.`);
  return lines;
}

/** The observed-elapsed block. An unmeasured row prints its reason, never a number. */
export function elapsedLines(ledger) {
  const ex = ledger.executions;
  if (!ex || typeof ex !== "object") return ["observed elapsed — not recorded (a ledger written before 6.35.0)"];
  const head = "observed elapsed — wall clock between PHARN's stage markers (not CPU, model or tool time; not monotonic)";
  if (ex.status === "unknown") return [head, `  UNKNOWN — ${ex.reason}. Not a zero.`];
  if (!Array.isArray(ex.rows) || ex.rows.length === 0) return [head, "  (no stage-start marker in this run)"];
  const w = (s, n) => String(s).padEnd(n);
  const r = (s, n) => String(s).padStart(n);
  const lines = [head, `  ${w("stage", 18)}${r("iter", 5)}${r("run", 5)}  elapsed`];
  for (const x of ex.rows) {
    const v = Number.isInteger(x.elapsed_ms) ? formatMs(x.elapsed_ms) : `unmeasured — ${x.unmeasured}`;
    lines.push(`  ${w(x.stage ?? "(no stage)", 18)}${r(x.iteration ?? "-", 5)}${r(x.run, 5)}  ${v}`);
  }
  return lines;
}

/** The deterministic-work block, one line per record, in the order the stages wrote them. */
export function workLines(ledger) {
  const work = ledger.work;
  if (!Array.isArray(work)) return ["deterministic work — not recorded (a ledger written before 6.35.0)"];
  const head = "deterministic work — gate processes run vs taken from reused evidence (counted from each stage's gate-run stamp)";
  // An UNKNOWN run window admits no record, so an empty list there is not "nothing ran" (GATE-2 review: it printed so).
  const m = ledger.membership;
  const windowUnknown = m && m.status === "unknown" && !(typeof m.reason === "string" && CONTEXT_REASONS.includes(m.reason));
  if (windowUnknown) return [head, "  UNKNOWN — the run window is unknown, so no work record was admitted. Not a zero."];
  if (work.length === 0) return [head, "  (no /pharn-regress or /pharn-verify execution recorded one in this run)"];
  const where = new Map();
  for (const x of ledger.executions?.rows ?? [])
    for (const i of x.work ?? []) where.set(i, `${x.stage} iter ${x.iteration ?? "-"} run ${x.run}`);
  const lines = [head];
  work.forEach((rec, i) => {
    const at = where.get(i) ?? `${rec.stage} (outside any marked execution)`;
    lines.push(`  ${at}: ${workSummary(rec)}`);
  });
  const loose = unattachedWork(ledger.executions, work).length;
  if (loose > 0) lines.push(`  ${loose} record(s) attach to no marked execution — shown, never merged into one`);
  return lines;
}

/** One record in one line. `evidence` decides what the BASE did; worktree and install are read from it, never stored. */
export function workSummary(rec) {
  const side = (s) => `${s.executed} run, ${s.reused} reused, ${s.no_files} nothing-to-run, of ${s.required}`;
  if (rec.stage === "pharn-verify") return `gates ${side(rec.gates)}`;
  const b = rec.base;
  const base =
    b.evidence === "reused"
      ? `BASE REUSED (no worktree, no install, 0 base gate processes; ${b.reused} results from earlier evidence)`
      : b.evidence === "entry"
        ? `BASE from the entry gates (no worktree, no install, 0 base gate processes; ${b.reused} results from this run's entry check${b.no_files ? `, ${b.no_files} nothing-to-run` : ""})`
        : `BASE fresh${b.miss ? ` (${b.miss})` : ""} — worktree created, install ${
            rec.install === null
              ? "none configured"
              : `ran (exit ${rec.install.exit}${rec.install.timed_out ? ", timed out" : ""}, ${rec.install.ms === null ? "time unmeasured" : formatMs(rec.install.ms)})`
          }, base gates ${side(b)}`;
  return `HEAD gates ${side(rec.head)}; ${base}`;
}

/** Milliseconds for a human: exact ms below 10 s, else seconds with one decimal. Never rounds a measured value to 0 s. */
export function formatMs(ms) {
  if (ms < 10000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function main(argv) {
  const opts = {
    name: null,
    base: null,
    repo: ".",
    sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? null,
    projectsDir: null,
    // `null` means "flag absent" and is SPREAD AWAY below, so the value falls through to renderLedger's
    // single definition. No second literal lives here any more (L41/L52).
    command: null,
    baseSha: null,
    markersBase: null,
    stdout: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--base") opts.base = argv[++i];
    else if (k === "--repo") opts.repo = argv[++i];
    else if (k === "--session") opts.sessionId = argv[++i];
    else if (k === "--projects-dir") opts.projectsDir = argv[++i];
    else if (k === "--command") opts.command = argv[++i];
    else if (k === "--base-sha") opts.baseSha = argv[++i];
    else if (k === "--markers-base") opts.markersBase = argv[++i];
    else if (k === "--stdout") opts.stdout = true;
    else if (k.startsWith("--")) {
      process.stderr.write(`render-cost-ledger: unknown argument ${k}\n`);
      return 2;
    } else if (opts.name === null) opts.name = k;
    else {
      process.stderr.write(`render-cost-ledger: unexpected argument ${k}\n`);
      return 2;
    }
  }
  if (!opts.name) {
    process.stderr.write("usage: node pharn/floor/render-cost-ledger.mjs <name> [--base <dir>] [--repo <dir>] [--session <id>]\n");
    return 2;
  }
  opts.projectsDir ??= process.env.CLAUDE_CONFIG_DIR
    ? join(process.env.CLAUDE_CONFIG_DIR, "projects")
    : join(homedir(), ".claude", "projects");

  // `--base` / `--markers-base` fall THROUGH to renderLedger's single defaults when absent. No second
  // copy of either default lives here — that is L41's defect verbatim, and one test exercises this
  // no-flag path precisely because every other test supplies the flags for hermeticity.
  const ledger = renderLedger({
    name: opts.name,
    ...(opts.command === null ? {} : { command: opts.command }),
    ...(opts.baseSha === null ? {} : { baseSha: opts.baseSha }),
    repo: opts.repo,
    sessionId: opts.sessionId,
    projectsDir: opts.projectsDir,
    ...(opts.markersBase === null ? {} : { markersBase: opts.markersBase }),
    ...(opts.base === null ? {} : { featureBase: opts.base }),
  });

  // ONE serialization for both output paths (L41): the file and `--stdout` cannot drift apart.
  const json = serializeLedger(ledger);
  if (opts.stdout) {
    process.stdout.write(json);
    return 0;
  }
  // The SINGLE definition, referenced — never a second literal (L41). This line is the one the
  // suite never reached, because every CLI test passed --base; it is now exercised directly.
  const dir = join(opts.repo, opts.base ?? FEATURE_BASE, opts.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cost.json"), json);
  process.stdout.write(table(ledger) + "\n");
  return 0;
}

// `import.meta.main` — NOT a `file://` + argv[1] compare (L25).
if (import.meta.main) process.exit(main(process.argv.slice(2)));
