// pharn/floor/cost-value-core.mjs — the ONE home of the value domain that a transcript-sourced identity string or
// token count must satisfy before a cost artifact carries or counts it. Node stdlib only, no network, no model call,
// no clock. No CLI: it is imported.
//
// ── Why it exists (6.28.1) ───────────────────────────────────────────────────────────────────────────
// A Claude Code transcript is untrusted input (P2), and parsed JSON can put any value where a string or a count is
// expected. `String()` is not total over it: `{"toString":1}` and `[{"toString":1}]` make it throw, and so do `+`, a
// template literal, a relational compare and `Object.fromEntries` ([[L62]]). Until 6.28.1 the cost tooling coerced
// first and bounded second, so one crafted line crashed both renderers and the checker's re-derivation. The order
// is now the other way round: every transcript value the cost tooling reads passes a TYPE and DOMAIN test here
// before anything coerces it.
//
// ── Its consumers, named so that a new one is a deliberate addition ──────────────────────────────────
//   * transcript-core.mjs — which lines are requests: a request's id must be an identity token, and the per-request
//     selection ranks only by a token count (`sessionRequests()`);
//   * render-cost-record.mjs — its `by_model` and `by_stage` keys, and the counts `fold()` adds;
//   * render-cost-ledger.mjs — every identity field it copies and every count it normalizes;
//   * check-cost-ledger.mjs — rule 3 and the token rule, through the SAME predicates, so the emitter and the checker
//     cannot disagree about what a bounded value is ([[L31]]).
// Each imports from here, and nothing re-exports these names ([[L35]]). `IDENTITY_MAX` and `ABS_PATH_RE` moved here
// from render-cost-ledger.mjs byte-for-byte: the transcript reader and the record renderer need them, and must not
// load the ledger emitter's module graph to get them.
//
// ── What stays in the ledger emitter, and why ────────────────────────────────────────────────────────
// The rules for the ledger's VERBATIM `usage` copy — `TOKEN_RE`, `isTokenLeaf`, `isUsageKey` and `USAGE_MAX_DEPTH`
// — stay in render-cost-ledger.mjs. Only the ledger copies a usage object, and check-cost-ledger.mjs already
// imports the leaf rule from there. They describe that one artifact, not a transcript value in general.
//
// ── Load graph ───────────────────────────────────────────────────────────────────────────────────────
// The one import is `cleanScalar` from mark-phase.mjs, which imports only node:fs, node:path and the pure
// run-window-core.mjs. So transcript-core.mjs, and through it render-cost-record.mjs, now load those two modules as
// well. Neither does anything at import time beyond defining functions and constants.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR (primitive #3): each predicate is a deterministic membership test, total over every JSON value. It never
//   throws and never coerces. Pinned by cost-value-core.test.mjs.
// NOT CLAIMED: that an admitted value is TRUE. An identity token is bounded in SHAPE only (length, C0 control
//   characters and DEL, an absolute path), never in meaning, so a crafted `req_…` id or a made-up model name passes,
//   and so does a C1 control (U+0080 to U+009F). A token count is a non-negative safe integer, never proof that the
//   platform consumed that many tokens.

import { cleanScalar } from "./mark-phase.mjs";

/** The bound on the IDENTITY fields (`model`, `attribution_skill`, `agent_id`). Wider than a `usage`
 *  leaf because a model id is legitimately longer than a `service_tier` token, and still bounded.
 *  Since 6.28.1 it also bounds a request's id, its session and the platform version, in both renderers and in
 *  check-cost-ledger.mjs. */
export const IDENTITY_MAX = 128;

/**
 * An absolute path: POSIX (`/Users/...`), home-relative (`~/...`), or a Windows drive (`C:\...`),
 * anchored at a string start or a delimiter.
 *
 * The anchor is load-bearing and is why this is not simply `/\//`: the schema token
 * `pharn-cost-ledger/1` contains a slash and must NOT match, while `/Users/someone/...` must. Probed
 * against both in the test rather than reasoned about (L37).
 */
export const ABS_PATH_RE = /(^|[\s"'`([{=,;])(~[/\\]|[A-Za-z]:[\\/]|\/[A-Za-z0-9._-]+\/)/;

/**
 * A bounded IDENTITY token: a string of 1 to `IDENTITY_MAX` characters, with no C0 control character or DEL, and no
 * absolute path. `cleanScalar` runs first and is string-only, so a non-string is refused before the regex sees it:
 * the control-character guard first, the shape test second ([[L14]]).
 */
export function isIdentityToken(v) {
  return cleanScalar(v, IDENTITY_MAX) && !ABS_PATH_RE.test(v);
}

/**
 * A token COUNT: a non-negative safe integer. A fraction, a negative, a non-finite value, a value above
 * `Number.MAX_SAFE_INTEGER` and every non-number are refused. So a sum of admitted counts never reaches `Infinity`,
 * and it is exact below 2^53.
 */
export function isTokenCount(v) {
  return Number.isSafeInteger(v) && v >= 0;
}
