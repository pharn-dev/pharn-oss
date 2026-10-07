#!/usr/bin/env node
// pharn/floor/check-cost-ledger.mjs — the deterministic CHECKER for a `pharn-cost-ledger/2` record, and a
// legacy `/1` one under its own rules (`pharn/pharn-contracts/cost-ledger.md`). Node stdlib only, no network,
// no model call.
//
// ── WHAT THIS CERTIFIES, AND THE BOUND IS THE WHOLE POINT (P0, L43) ──────────────────────────────────
// This checks the file's INTERNAL CONSISTENCY. It does NOT check that `requests[]` matches the
// transcript. Those are different claims, and the gap between them is exactly the failure class L43
// records: a consistency check over several stores of one fact certifies their AGREEMENT, never the
// FACT — they can all be wrong together. A ledger whose rows were fabricated, and whose views were then
// computed from those fabricated rows, is GREEN here. It is self-consistent and it is false.
//
// `--verify-transcript` is the referent-binding half: it re-derives `requests[]` from the live
// transcript and compares them row by row, exactly on the classes that cannot grow and as recorded <=
// re-derived on `output` / `output_thinking`, which can (6.24.1, `checkRowsAgainstTranscript`). That mode
// is a genuine floor primitive and it is USABLE ONLY WHILE THE
// TRANSCRIPT EXISTS — machine-local and perishable, since Claude Code prunes transcripts on its own
// schedule and they are never committed. So the strong check cannot be a gate, and the gate cannot be
// the strong check. Both facts are stated rather than one being quietly preferred.
//
// HONEST TRIGGER (P7), recorded rather than dressed up: `--verify-transcript` answered NO observed
// failure. It exists because L43 names binding-to-referent as the remedy shape, and it was retained at
// the maintainer's explicit direction at the post-grill gate — the `check-plan-lessons` sub-check (D)
// precedent, where a manufactured trigger would have been the disease P0 names.
//
// ── The FLOOR rules (primitive #3 + arithmetic) ──────────────────────────────────────────────────────
//  1. TOP-LEVEL KEY SET IS CLOSED — both directions: no extra key, no missing key. A per-member
//     presence set is satisfied by a variant spelling of any member (L36); closure is what fails it.
//  2. EVERY `usage` LEAF is number | bool | null | a short token (`isTokenLeaf`, composed AFTER a
//     control-char guard — L14). Arrays are walked (D1), not exempted. The predicate is IMPORTED from
//     the emitter, not re-stated here: the two encodings used to be written separately and had ALREADY
//     diverged (this copy omitted the path term), which is [[L31]] exactly. Since 6.28.1 the same rule
//     also REDs a `usage` node deeper than `USAGE_MAX_DEPTH` and an object key `isUsageKey` refuses
//     (`__proto__` among them), both imported from the emitter, which refuses the same two on write.
//  2b. EVERY IDENTITY FIELD — `model`, `attribution_skill`, `agent_id` — is a bounded token (<=128
//     chars, no C0 control char or DEL, no path). The contract calls this rule 3; the numbering here is kept
//     stable so this file's own older references still resolve. Added after `/pharn-dev-review` found
//     the contract asserting this bound while NOTHING checked it (see `badIdentity`). Since 6.28.1 it
//     also covers `request_id`, a row's `session_id` (nullable), and every element of `sessions[]` and
//     `claude_code_versions[]`: the contract gained those bounds in 6.28.1, and every bound 6.28.1 added
//     to the contract is one this file checks ([[L2]], GRILL R2-G2). That is scoped on purpose: the
//     review of 6.28.1 (R1) found two OLDER field-table labels, `skills_version`'s shape and the
//     `window_start`/`window_end` values, which no op here ever backed, and the contract now labels
//     them ADVISORY. The predicate is `isIdentityToken` (cost-value-core.mjs), the one the emitter
//     applies: 1 to 128 characters, no C0 control character or DEL, no path (a C1 control is admitted).
//  2c. (6.28.1) EVERY `tokens.<class>` is a non-negative safe integer (`isTokenCount`), where the rule
//     used to be `Number.isFinite`. A row's `stage` is a string or null and its `iteration` a number or
//     null: crash guards for the view recompute (RULE 6), which is why a fractional `iteration` from a
//     crafted marker stays GREEN as before (GRILL R2-G8).
//  3. NO STRING ANYWHERE in the file matches `ABS_PATH_RE` — every value, at every depth, including
//     keys' values inside `markers[]` and `outcome`.
//  4. `request_id`s are UNIQUE (set membership).
//  5. `markers[].seq` is STRICTLY INCREASING (integer compare).
//  6. EVERY VIEW equals a recompute from `requests[]` — `totals`, `by_model`,
//     `by_stage_iteration_model`, `unattributed`. The recompute calls the EMITTER's own `buildViews`,
//     so the two cannot disagree about what a view MEANS, only about whether the stored one matches.
//  7. `outcome` IS `null` OR matches its shape — `decision` a bounded token, `iterations` an integer or
//     null, `source` in the IMPORTED two-member enum, optional `blocked` a bounded token, and the key
//     set CLOSED in both directions. Added because the contract had advertised this row as
//     `FLOOR (shape)` while nothing checked it; see the rule body for the trigger and for why the new
//     `/pharn-ship` producer made deferring it worse than building it.
//
//  8. (`/2` only) `membership` is SHAPED and RE-DERIVABLE: a closed key set; `method` one of the imported
//     `MEMBERSHIP_METHODS`; `status` in the imported enum; and `status`/`reason`/`start`/`end` EQUAL a recompute
//     of `run-window-core.mjs`'s `runWindow()` over the file's OWN `markers[]` for the recorded `session`.
//     Then EVERY row in `requests[]` must be a member of that window, so a row outside the run cannot be
//     summed into `totals` — the `/1` defect (100 unrelated tokens + 10 in-run reported as 110, GREEN).
//     `unknown` must be `unavailable` with no rows and `excluded_requests: null`; an EMPTY `partial` is
//     admitted ONLY under a known window, where it is an observed zero (L34 — silence vs asserted
//     silence). The rule is IMPORTED, never re-spelled (L35): the checker and emitter cannot disagree
//     about what membership MEANS, only about whether a stored row satisfies it.
//     BOUND (P0, L43): this proves the rows agree with the RECORDED markers. It cannot prove the markers
//     describe the run, nor that `excluded_requests` is the true count — only `--verify-transcript` binds
//     either to the transcript, and only while it exists. Even then `excluded_requests` is bound as a
//     RANGE, not a value: exact for the requests before the window, an upper bound for those after its
//     end, because that tail keeps growing after emission (`checkExcludedAgainstTranscript`, 6.14.1).
//     THE CONTEXT HALF (6.29.0, method `run-window/2`). The METHOD selects the closed key set:
//     `run-window/1` keeps its seven keys, and every other value is held to the current nine. A `/2` ledger:
//       * a MEASURED one (a known window, `partial`) records the bound `context` and a sorted, duplicate-free,
//         non-empty `contexts` holding it, and EVERY row's context — read from the row alone by the emitter's
//         `rowContext` — must be in `contexts`. Every other ledger records `null` in both;
//       * may be `unknown` for a CONTEXT reason only over a KNOWN window, keeping that window's start and end,
//         which are still re-derived here. Its status and reason are not re-derivable from the file.
//     A `run-window/1` ledger is never REDed for lacking the context half; it gets one WARN naming how many
//     contexts its rows come from.
//     `--verify-transcript` re-derives through the emitter's own `deriveLedger`, so under the SAME rule, with the
//     recorded markers:
//       * a `/2` ledger's `context`/`contexts` must match;
//       * a transcript that no longer binds the run (a later copy of a marker line in another context) is a WARN,
//         never a RED ([[L42]], [[L58]]);
//       * a `/1` ledger holding other contexts' rows is RED, and the message counts them.
//     BOUND (L43), unchanged in kind: rows agree with the RECORDED set, never proof the set is the run's.
//  LEGACY: a `pharn-cost-ledger/1` file is validated under its OWN closed key set and rules, never
//     retroactively REDed for lacking `membership`, and gets one WARN: its totals are SESSION-scoped and
//     may include activity outside the run. Reinterpreting them as run-scoped would silently rewrite
//     history.
//
// WHAT RULE 7 STILL DOES NOT DO, stated where the rule is claimed rather than left to a reader. It
// checks the outcome's SHAPE, never its TRUTH: a well-formed `{"decision":"gate2"}` on a run that
// stopped at grill passes, because nothing here re-reads the verdict reports. For `/pharn-loop` that
// gap is closed OUTSIDE this file by `check-loop-decision.mjs`, which re-derives the decision from the
// record's own cited reports. For `/pharn-ship` there is NO equivalent and none is added: ship's stop
// is a human gate or an orchestrator STOP, and no checker computes either, so there is nothing to
// re-derive against. That asymmetry is real and is named rather than papered over.
//
// "No message content and no home paths are in the file" is a CONSEQUENCE of rules 2, 2b and 3, NOT a
// detector this file implements. The claim "no usernames" is STRUCK and appears nowhere here: no regex
// proves it, and writing it would be the exact P0 disease.
//
// ── WARN, never RED: marker completeness ─────────────────────────────────────────────────────────────
// A missing phase marker is an ORCHESTRATION lapse (the marker call is Bash-invoked command prose,
// outside the `PreToolUse` gate — L19), not a malformed artifact. It is reported as a WARN WITH A COUNT
// and never silently merged into a neighbouring stage. Making it RED would fail a well-formed file for
// something the file's writer did not do wrong. The missing iterations are COUNTED from the observed set
// and the first few listed; `1..outcome.iterations` is never enumerated, because a crafted `2^53` there
// allocated until the process died (GRILL R2-G3).
//
// ── TOTAL OVER ITS OWN INPUT (6.28.1), and what that does NOT cover ──────────────────────────────────
// `cost.json` is agent-written, committed, untrusted input (P2). Until 6.28.1 twenty measured crash sites made
// this file exit 1 — its RED code — with no verdict line, and raw file strings reached its verdict lines.
// FLOOR, over the closures in cost-hostile-input.test.mjs: for every document they walk (every node of a GREEN
// ledger × a hostile alphabet, and the right-typed extremes they add), in both modes, `checkLedger` returns and
// the CLI prints exactly one verdict line, after any RED/WARN lines, and exits 0 or 1. How:
//   * each value quoted from the file into a RED or WARN is printed by rule: a string or object through `shown()`
//     (quote-core.mjs: total, JSON-escaped, cut to `SHOWN_CHARS`), a number, boolean or null as itself
//     (`valText()`), and a key through `keyText()`. The one indirect case is the re-derivation's unavailable-transcript
//     WARN, which prints the emitter's note, and that note carries a file value only after the session precondition
//     below admitted it. Every list shows at most `LIST_MAX` members and a count;
//   * the recursive walks stop at `WALK_MAX_DEPTH` (`usage` at `USAGE_MAX_DEPTH`), and an iterative probe REDs a
//     document nested deeper, so no walk can exhaust the stack;
//   * the view recompute and the re-derivation each run only over input that passes their shape preconditions,
//     and say so in a RED when they do not run;
//   * `main()` turns an unforeseen throw while checking into exit 2 — unusable, never GREEN and never RED — so a crash is never
//     read as a verdict ([[L62]]); and the file ends through `process.exitCode`, never an immediate exit, so a
//     verdict past a pipe's buffer is not dropped (the 6.20.4 flush rule, pinned by this increment's own test:
//     `cli-stdout-flush.test.mjs`'s set is the CLIs whose stdout a floor caller parses, and none parses this one).
// A LINE is `\n`-delimited. `JSON.stringify` escapes `\n`, `\r` and every other C0 control, and leaves U+2028,
// U+2029 and U+0085 raw, which some viewers draw as a line break — the bound `serializeLedger` states, stated here
// too rather than escaped.
// NOT CLAIMED, each named: TIME and MEMORY. RULE 8 re-tests every row against every current-run marker, so it is
// O(rows × markers) (GRILL R2-G3 measured 22.9 s at 8,000 of each; real ledgers hold hundreds). A document large
// enough to exhaust the heap ends the process with no verdict, and an abort cannot be caught. A module that fails
// to load is outside `main()`'s catch. And a future message can still interpolate raw text: the quoting is a
// property of today's sites, pinned by the ✎ FORGERY closure, not of every line anyone writes later.
//
// Usage:
//   node pharn/floor/check-cost-ledger.mjs <cost.json> [--verify-transcript] [--projects-dir <dir>]
// Exit codes: 0 = GREEN (possibly with WARNs); 1 = RED; 2 = unusable input, or an internal error (no verdict).

import "./runtime-floor.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  SCHEMA,
  LEGACY_SCHEMA,
  TOP_LEVEL_KEYS_V1,
  MEMBERSHIP_KEYS,
  MEMBERSHIP_KEYS_V1,
  rowContext,
  normalizeMarkers,
  COVERAGE,
  TOKEN_CLASSES,
  TOP_LEVEL_KEYS,
  TOP_LEVEL_KEYS_PRE_WORK,
  TOP_LEVEL_KEYS_PRE_ENTRY,
  WORK_KEYS,
  ENTRY_KEYS,
  SKILLS_VERSION_SOURCES,
  ATTRIBUTION_METHOD,
  OUTCOME_SOURCES,
  OUTCOME_KEYS,
  USAGE_MAX_DEPTH,
  isTokenLeaf,
  isUsageKey,
  buildViews,
  deriveLedger,
} from "./render-cost-ledger.mjs";
import { MARKER_KINDS, cleanScalar } from "./mark-phase.mjs";
import {
  runWindow,
  isMember,
  MEMBERSHIP_METHOD,
  MEMBERSHIP_METHOD_V1,
  MEMBERSHIP_METHODS,
  MEMBERSHIP_STATUSES,
  UNKNOWN_REASONS,
  CONTEXT_REASONS,
  MAIN_CONTEXT,
  AGENT_CONTEXT_PREFIX,
} from "./run-window-core.mjs";
import { ABS_PATH_RE, IDENTITY_MAX, isIdentityToken, isTokenCount } from "./cost-value-core.mjs";
import { shown } from "./quote-core.mjs";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { validateWork } from "./stage-work.mjs";
import { buildExecutions } from "./stage-executions-core.mjs";
import { validateEntryEvent, canonical, buildEntryView, isAdmitted } from "./entry-observations.mjs";

const reds = [];
const warns = [];
const red = (m) => reds.push(m);
const warn = (m) => warns.push(m);

/** The deepest node any walk over the document visits, counted from the document root (depth 0). The emitter's
 *  deepest node is a `usage` leaf at most `USAGE_MAX_DEPTH` below `requests[i].usage`, so a GREEN ledger never comes
 *  near it. A deeper node is a RED, found by `tooDeep()` without recursion, and the recursive walks stop here. */
export const WALK_MAX_DEPTH = 64;

/** The most members a list in one RED or WARN line names before it gives a count of the rest. */
const LIST_MAX = 5;

/** A KEY quoted into a verdict line: as-is when it is a short token (`isTokenLeaf`: no space, no control
 *  character, no quote), else through `shown()`. So a plain key such as `membership` reads as before, and a crafted
 *  one cannot start a line of its own (GRILL R2-G4). Total: `isTokenLeaf` refuses every non-string first. */
const keyText = (k) => (isTokenLeaf(k) ? k : shown(k));

/** A VALUE quoted into a verdict line with its type kept visible (REVIEW R9): a number, boolean, `null` or `undefined`
 *  prints as itself, and a string, object or function goes through `shown()` — quoted, escaped, bounded. So `1.5` and
 *  `"1.5"` read differently. Total (L62): `String()` only ever meets a primitive that is not a string, where it cannot
 *  throw. It replaced `tokenText` in 6.28.1, which printed every non-number through `shown()`. */
const valText = (v) => (v === null || (typeof v !== "string" && typeof v !== "object" && typeof v !== "function") ? String(v) : shown(v));

/** `items`, at most `LIST_MAX` of them each through `fmt`, then a count of the rest (GRILL R2-G3). */
const listText = (items, fmt) =>
  `${items.slice(0, LIST_MAX).map(fmt).join(", ")}${items.length > LIST_MAX ? ` (+${items.length - LIST_MAX} more)` : ""}`;

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * RULE 2b — an IDENTITY field (`model`, `attribution_skill`, `agent_id`).
 *
 * These are copied verbatim from an untrusted transcript into a COMMITTED artifact, and until
 * `/pharn-dev-review` probed them they were checked by nothing at all: a 200,000-char value, embedded
 * NUL/BEL bytes and a newline carrying a forged `RED — …` line were each accepted GREEN, while the
 * contract asserted "the leaf-shape rule bounds what can land in them". It did not — that rule reaches
 * `usage` only. The rule is applied here so the sentence is TRUE rather than corrected downward.
 * Since 6.28.1 the test is `isIdentityToken`, the emitter's own predicate, with identical behaviour.
 */
function badIdentity(v, allowNull = true) {
  if (v === null || v === undefined) return !allowNull;
  return !isIdentityToken(v);
}

/**
 * The first path, built from `keyText` segments, of a node deeper than `WALK_MAX_DEPTH`, or null. ITERATIVE — an
 * explicit stack, never recursion — so a document nested past the call stack's limit (`JSON.parse` accepts one) is
 * measured rather than walked into. The recursive walks below then stop at the bound.
 */
function tooDeep(root) {
  const stack = [[root, "", 0]];
  while (stack.length) {
    const [value, path, depth] = stack.pop();
    if (depth > WALK_MAX_DEPTH) return path || "(the document)";
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) stack.push([value[i], `${path}[${i}]`, depth + 1]);
    } else if (isPlainObject(value)) {
      const keys = Object.keys(value);
      for (let i = keys.length - 1; i >= 0; i--) {
        stack.push([value[keys[i]], path ? `${path}.${keyText(keys[i])}` : keyText(keys[i]), depth + 1]);
      }
    }
  }
  return null;
}

/** RULE 3, applied to the WHOLE document at every depth. Exported so the test can range over committed
 *  FIXTURE bytes too — the guard the post-grill gate added, so a fixture is covered by the same rule as
 *  a ledger rather than by a description of how it was built. Since 6.28.1 each path segment is a
 *  `keyText`, the value is quoted through `shown()`, and the walk stops at `WALK_MAX_DEPTH` — `tooDeep()`
 *  reports anything deeper. `depth` defaults to 0 in this one place. */
export function findAbsolutePaths(value, path, hits, depth = 0) {
  if (depth > WALK_MAX_DEPTH) return hits;
  if (typeof value === "string") {
    if (ABS_PATH_RE.test(value)) hits.push(`${path} = ${shown(value)}`);
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findAbsolutePaths(v, `${path}[${i}]`, hits, depth + 1));
    return hits;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) findAbsolutePaths(value[k], path ? `${path}.${keyText(k)}` : keyText(k), hits, depth + 1);
  }
  return hits;
}

/** RULE 2, over one `usage` subtree. `depth` counts from the `usage` object itself and defaults to 0 in this one
 *  place: a node deeper than `USAGE_MAX_DEPTH`, and a key `isUsageKey` refuses, are out of domain (6.28.1). */
function checkUsageLeaves(value, path, bad, depth = 0) {
  if (depth > USAGE_MAX_DEPTH) {
    bad.push(path);
    return bad;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return bad;
  if (typeof value === "string") {
    // THE SHARED encoding, imported from the emitter — not a second statement of the same rule. The
    // two used to be written separately and had already diverged (this copy omitted the path term).
    if (!isTokenLeaf(value)) bad.push(path);
    return bad;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkUsageLeaves(v, `${path}[${i}]`, bad, depth + 1));
    return bad;
  }
  if (typeof value === "object") {
    for (const k of Object.keys(value)) {
      if (!isUsageKey(k)) bad.push(`${path}.${keyText(k)}`);
      else checkUsageLeaves(value[k], `${path}.${k}`, bad, depth + 1);
    }
    return bad;
  }
  bad.push(path);
  return bad;
}

const sameTokens = (a, b) => TOKEN_CLASSES.every((c) => (a?.[c] ?? null) === (b?.[c] ?? null));

export function checkLedger(led, opts = {}) {
  reds.length = 0;
  warns.length = 0;

  if (!led || typeof led !== "object" || Array.isArray(led)) {
    red("the ledger is not a JSON object");
    return { reds: [...reds], warns: [...warns] };
  }

  // The schema selects the rule set. Anything but the two known literals is RED and is checked under
  // the CURRENT rules — an unknown schema never downgrades to the lenient legacy path.
  const legacy = led.schema === LEGACY_SCHEMA;
  if (legacy) {
    warn(
      `legacy ${LEGACY_SCHEMA} — totals are SESSION-scoped and may include activity outside the run; they are NOT a run measurement (re-emit to get a run-scoped ${SCHEMA} ledger)`
    );
  }

  // ---- RULE 1: the closed top-level key set, BOTH directions -----------------------------------
  const present = new Set(Object.keys(led));
  // `/2` admits EXACTLY three key sets: the current one (6.48.0), the 6.35.0–6.47.x one with no `ENTRY_KEYS` member,
  // and the pre-6.35.0 one with neither pair. Any `ENTRY_KEYS` member holds the ledger to the current set, and any
  // `WORK_KEYS` member to at least the 6.35.0 set, so a half-present pair reads as missing keys (L36).
  const hasEntry = ENTRY_KEYS.some((k) => present.has(k));
  const hasWork = hasEntry || WORK_KEYS.some((k) => present.has(k));
  const expected = new Set(
    legacy ? TOP_LEVEL_KEYS_V1 : hasEntry ? TOP_LEVEL_KEYS : hasWork ? TOP_LEVEL_KEYS_PRE_ENTRY : TOP_LEVEL_KEYS_PRE_WORK
  );
  const extra = [...present].filter((k) => !expected.has(k)).sort();
  const missing = [...expected].filter((k) => !present.has(k)).sort();
  if (extra.length) red(`top-level key set is not closed — unexpected key(s): ${listText(extra, keyText)}`);
  if (missing.length) red(`top-level key set is not closed — missing key(s): ${listText(missing, keyText)}`);

  // ---- enums and scalar grammars ---------------------------------------------------------------
  // A value quoted below goes through `valText()` (a number, boolean or null as itself, anything else through
  // `shown()`) and a key through `shown()`: total, escaped, bounded (see the header).
  if (led.schema !== SCHEMA && !legacy) red(`schema must be "${SCHEMA}" or the legacy "${LEGACY_SCHEMA}" (got ${valText(led.schema)})`);
  if (!COVERAGE.includes(led.coverage)) red(`coverage must be one of ${COVERAGE.join(" | ")} (got ${valText(led.coverage)})`);
  if (led.dedup_key !== "requestId") red(`dedup_key must be "requestId" (got ${valText(led.dedup_key)})`);
  if (!SKILLS_VERSION_SOURCES.includes(led.skills_version_source)) {
    red(`skills_version_source must be one of ${SKILLS_VERSION_SOURCES.join(" | ")} (got ${valText(led.skills_version_source)})`);
  }
  if (led.skills_version_source === "unknown" && led.skills_version !== null) {
    red("skills_version_source is `unknown` but skills_version carries a value — an honest absence is null");
  }
  if (!led.attribution || led.attribution.method !== ATTRIBUTION_METHOD) {
    red(`attribution.method must be "${ATTRIBUTION_METHOD}" (got ${valText(led.attribution?.method)})`);
  }
  if (typeof led.pricing_note !== "string" || !/TOKENS ONLY/.test(led.pricing_note)) {
    red("pricing_note must be present and state that the file carries tokens, never prices");
  }
  if (!Array.isArray(led.requests)) red("requests must be an array");
  if (!Array.isArray(led.markers)) red("markers must be an array");
  if (!Array.isArray(led.dropped)) red("dropped must be an array");
  if (!Array.isArray(led.sessions)) red("sessions must be an array");
  if (!Array.isArray(led.claude_code_versions)) red("claude_code_versions must be an array");

  // RULE 2b over the two list fields (6.28.1): each element a bounded identity token, as the emitter writes them.
  for (const field of ["sessions", "claude_code_versions"]) {
    if (!Array.isArray(led[field])) continue;
    const bad = [];
    led[field].forEach((v, i) => {
      if (badIdentity(v, false)) bad.push(i);
    });
    if (bad.length) {
      red(
        `${field}[] holds ${bad.length} element(s) that are not bounded identity tokens (<=${IDENTITY_MAX} chars, no C0 control char or DEL, no path), at index ${listText(bad, String)}`
      );
    }
  }

  // A price table must never appear, at any depth, under any key naming money.
  for (const k of Object.keys(led)) {
    if (/price|cost_usd|usd|dollar/i.test(k)) red(`key ${shown(k)} looks like a price field — this record carries tokens only`);
  }

  // ---- DEPTH: no node deeper than WALK_MAX_DEPTH (6.28.1) ----------------------------------------
  // Found without recursion, so a document nested past the stack's limit is REPORTED, never walked into.
  const deep = tooDeep(led);
  if (deep !== null) red(`the document nests deeper than ${WALK_MAX_DEPTH} levels, at ${deep} — the walks below stop there`);

  // ---- RULE 3: no absolute path anywhere -------------------------------------------------------
  const pathHits = findAbsolutePaths(led, "", []);
  if (pathHits.length)
    red(
      `absolute-path-shaped string(s) present: ${pathHits.slice(0, LIST_MAX).join("; ")}${pathHits.length > LIST_MAX ? ` (+${pathHits.length - LIST_MAX} more)` : ""}`
    );

  // ---- RULE 5: markers, strictly increasing seq ------------------------------------------------
  if (Array.isArray(led.markers)) {
    let prev = null;
    for (const [i, m] of led.markers.entries()) {
      if (!m || typeof m !== "object") {
        red(`markers[${i}] is not an object`);
        continue;
      }
      if (!MARKER_KINDS.has(m.kind)) red(`markers[${i}].kind must be one of ${[...MARKER_KINDS].join(" | ")} (got ${valText(m.kind)})`);
      if (!Number.isInteger(m.seq)) red(`markers[${i}].seq must be an integer (got ${valText(m.seq)})`);
      else if (prev !== null && m.seq <= prev) red(`markers[${i}].seq must be strictly increasing (${m.seq} follows ${prev})`);
      else prev = m.seq;
    }
  }

  // ---- RULES 2 + 4: per-request -----------------------------------------------------------------
  // NON-VACUITY (L34): a per-item rule set says NOTHING over an empty domain, and a vacuous pass is
  // indistinguishable from a real one at the verdict. An EMPTY `requests[]` is legitimate — an
  // `unavailable` ledger has one — so the guard is not "requests must be non-empty"; it is that an
  // empty `requests[]` must AGREE with the coverage enum and with every view. Silence and
  // asserted-silence are different claims, and only the second is a record.
  let allViewable = false;
  if (Array.isArray(led.requests)) {
    if (led.requests.length === 0) {
      // Under `/2` an empty `partial` is an OBSERVED zero when the window is KNOWN; RULE 8 checks the
      // window. Under `/1`, or under an unknown window, it is an unmeasured run reading as a cheap one.
      const observedZero = !legacy && ["bounded", "open"].includes(led.membership?.status);
      if (led.coverage !== "unavailable" && !observedZero) {
        red("requests[] is empty but coverage is not `unavailable` — an empty measurement must say so, not read as a cheap run");
      }
      if (led.totals?.requests !== 0) red("requests[] is empty but totals.requests is not 0");
      if ((led.by_model?.length ?? 0) !== 0 || (led.by_stage_iteration_model?.length ?? 0) !== 0) {
        red("requests[] is empty but a view carries rows — every view is a function of requests[]");
      }
    }
    const ids = new Set();
    // RULE 6 recomputes the views from these rows, and `buildViews` reads each row's model, stage, iteration and
    // tokens. A row is VIEWABLE only when those four pass the type rules below, so the recompute never meets a value
    // it would coerce (6.28.1). Counted here, where the rules run: one definition, not a second predicate.
    let unviewable = 0;
    for (const [i, r] of led.requests.entries()) {
      if (!isPlainObject(r)) {
        red(`requests[${i}] is not an object`);
        unviewable++;
        continue;
      }
      if (typeof r.request_id !== "string" || !r.request_id) red(`requests[${i}].request_id must be a non-empty string`);
      else if (ids.has(r.request_id)) red(`requests[${i}].request_id is a duplicate: ${shown(r.request_id)}`);
      else ids.add(r.request_id);
      if (typeof r.sidechain !== "boolean") red(`requests[${i}].sidechain must be a boolean`);
      if (typeof r.model !== "string" || !r.model) red(`requests[${i}].model must be a non-empty string`);
      // RULE 2b — the identity fields, bounded. `model` and `request_id` may not be null; the others may.
      for (const [field, nullable] of [
        ["request_id", false],
        ["model", false],
        ["session_id", true],
        ["attribution_skill", true],
        ["agent_id", true],
      ]) {
        if (badIdentity(r[field], nullable))
          red(`requests[${i}].${field} is not a bounded identity token (<=${IDENTITY_MAX} chars, no C0 control char or DEL, no path)`);
      }
      const badLeaves = checkUsageLeaves(r.usage, `requests[${i}].usage`, []);
      if (badLeaves.length)
        red(
          `usage leaf out of domain (a leaf must be number | bool | null | short token, a key a short token other than __proto__, and no node deeper than ${USAGE_MAX_DEPTH}): ${listText(badLeaves, (p) => p)}`
        );
      let viewable = typeof r.model === "string";
      for (const c of TOKEN_CLASSES) {
        if (!isTokenCount(r.tokens?.[c])) {
          red(`requests[${i}].tokens.${c} must be a number: a non-negative safe integer (got ${valText(r.tokens?.[c])})`);
          viewable = false;
        }
      }
      if (!(r.stage === null || typeof r.stage === "string")) {
        red(`requests[${i}].stage must be a string or null (got ${valText(r.stage)})`);
        viewable = false;
      }
      if (!(r.iteration === null || typeof r.iteration === "number")) {
        red(`requests[${i}].iteration must be a number or null (got ${valText(r.iteration)})`);
        viewable = false;
      }
      if (!viewable) unviewable++;
    }
    if (unviewable > 0) {
      red(
        `the views were NOT recomputed: ${unviewable} row(s) of requests[] fail a type rule above, so totals, by_model, by_stage_iteration_model and unattributed are unchecked`
      );
    }
    allViewable = unviewable === 0;
  }

  // ---- RULE 6: every view recomputed from requests[] --------------------------------------------
  // Only when every row passed the type rules above (`allViewable`); every stored value quoted in a message goes
  // through `valText`/`keyText`, and a stored view row that is not an object is tolerated, not read.
  if (Array.isArray(led.requests) && allViewable) {
    const v = buildViews(led.requests);
    if (led.totals?.requests !== v.totals.requests || !sameTokens(led.totals?.tokens, v.totals.tokens)) {
      red(
        `totals disagrees with a recompute from requests[] (stored ${valText(led.totals?.requests)} requests, recomputed ${v.totals.requests})`
      );
    }
    if (led.unattributed?.requests !== v.unattributed.requests || !sameTokens(led.unattributed?.tokens, v.unattributed.tokens)) {
      red(
        `unattributed disagrees with a recompute from requests[] (stored ${valText(led.unattributed?.requests)}, recomputed ${v.unattributed.requests})`
      );
    }
    // A view row's KEY is compared field by field with `===`, and printed through `keyText`/`valText`, never
    // through a template over a stored value (a crafted one threw, or forged a line — GRILL R2-G4).
    const keyShown = (parts) => parts.map((p) => (p === null || p === undefined ? "" : valText(p))).join("/");
    const cmpView = (name, stored, want, keyOf) => {
      if (!Array.isArray(stored) || stored.length !== want.length) {
        red(
          `${name} disagrees with a recompute from requests[] (stored ${Array.isArray(stored) ? stored.length : "?"} rows, recomputed ${want.length})`
        );
        return;
      }
      for (let i = 0; i < want.length; i++) {
        const got = keyOf(stored[i]);
        const exp = keyOf(want[i]);
        if (
          got.some((p, j) => p !== exp[j]) ||
          stored[i]?.requests !== want[i].requests ||
          !sameTokens(stored[i]?.tokens, want[i].tokens)
        ) {
          red(`${name}[${i}] disagrees with a recompute from requests[] (${keyShown(got)} vs ${keyShown(exp)})`);
          return;
        }
      }
    };
    cmpView("by_model", led.by_model, v.by_model, (r) => [r?.model]);
    cmpView("by_stage_iteration_model", led.by_stage_iteration_model, v.by_stage_iteration_model, (r) => [
      r?.stage ?? null,
      r?.iteration ?? null,
      r?.model,
    ]);
  }

  // ---- RULE 7: `outcome` SHAPE ------------------------------------------------------------------
  // WHY THIS EXISTS, recorded rather than given a manufactured trigger (P7). `cost-ledger.md`'s field
  // table has advertised `outcome` as `FLOOR (shape)` since the contract shipped, while NOTHING here
  // validated anything inside it — only the closed TOP-LEVEL key set (which proves the key is present)
  // and RULE 3's absolute-path walk (which proves no value looks like a path). A FLOOR label with no
  // running check behind it is precisely the disease P0 names, and [[L2]] states the rule it breaks: a
  // contract's honesty must travel with the artifact and may cite only LIVE floor ops. The trigger is
  // that unbacked claim, surfaced by discovery — not a hypothetical, and not the new caller. The new
  // caller is why it could not be deferred: `/pharn-ship` adds a SECOND producer and a SECOND `source`
  // member, so leaving the field unchecked would have deepened the overclaim rather than merely
  // inherited it.
  //
  // NO COMMITTED LEDGER IS RETROACTIVELY REDDENED: `git ls-files '*cost.json'` returned 0 when this
  // rule was written, so the stricter check cannot fail an artifact that predates it.
  //
  // The key set is CLOSED in BOTH directions ([[L36]]) and the `source` enum is IMPORTED, never
  // re-spelled ([[L35]]) — a second copy of the member list is the thing that drifts.
  if (led.outcome !== null && led.outcome !== undefined) {
    const o = led.outcome;
    if (typeof o !== "object" || Array.isArray(o)) {
      red(`outcome must be an object or null (got ${Array.isArray(o) ? "an array" : typeof o})`);
    } else {
      if (!cleanScalar(o.decision, IDENTITY_MAX)) {
        red(`outcome.decision must be a bounded, control-char-free string (<=${IDENTITY_MAX} chars)`);
      }
      if (!(o.iterations === null || Number.isInteger(o.iterations))) {
        red(`outcome.iterations must be an integer or null (got ${valText(o.iterations)})`);
      }
      if (!OUTCOME_SOURCES.includes(o.source)) {
        red(`outcome.source must be one of ${OUTCOME_SOURCES.join(" | ")} (got ${valText(o.source)})`);
      }
      if (o.blocked !== undefined && !cleanScalar(o.blocked, IDENTITY_MAX)) {
        red(`outcome.blocked, when present, must be a bounded, control-char-free string (<=${IDENTITY_MAX} chars)`);
      }
      const unknownKeys = Object.keys(o).filter((k) => !OUTCOME_KEYS.includes(k));
      if (unknownKeys.length) {
        red(`outcome carries an unknown key ${listText(unknownKeys, keyText)} — the key set is closed to ${OUTCOME_KEYS.join(", ")}`);
      }
    }
  }

  // ---- RULE 8 (`/2`): membership shape, re-derivation, and every row inside the window ----------
  if (!legacy) checkMembership(led);

  // ---- RULE 9 (6.35.0): the work facts and the executions view ----------------------------------
  if (!legacy && hasWork) checkWorkAndExecutions(led);

  // ---- RULE 10 (6.48.0): the entry-gate observations and their view ------------------------------
  if (!legacy && hasEntry) checkEntry(led);

  // ---- WARN (never RED): marker completeness ----------------------------------------------------
  if (Array.isArray(led.markers) && led.outcome && Number.isInteger(led.outcome.iterations)) {
    const stageStarts = led.markers.filter((m) => m?.kind === "stage-start");
    const iters = new Set(stageStarts.map((m) => m.iteration).filter((n) => Number.isInteger(n)));
    // COUNTED, never enumerated (see the header): the recorded iterations inside [1, total] are subtracted from
    // total, and the scan that lists the first missing ones stops after LIST_MAX finds, so it takes at most
    // |iters| + LIST_MAX steps whatever `total` is (GRILL R2-G3: `2^53` here allocated until the process died).
    const total = led.outcome.iterations;
    const missingCount = Math.max(0, total - [...iters].filter((n) => n >= 1 && n <= total).length);
    if (missingCount > 0) {
      const first = [];
      for (let n = 1; first.length < LIST_MAX && n <= total; n++) if (!iters.has(n)) first.push(n);
      warn(
        `marker completeness: outcome.iterations is ${total} but no stage-start marker carries iteration(s) ${first.join(", ")}${missingCount > first.length ? ` (+${missingCount - first.length} more)` : ""} — ${missingCount} boundary/boundaries unrecorded; those requests stay in their own bucket and are NOT merged into a neighbour`
      );
    }
    if (!led.markers.some((m) => m?.kind === "run-start"))
      warn(
        legacy
          ? "marker completeness: no run-start marker — requests before the first marker are `unattributed`"
          : "marker completeness: no run-start marker — the run window cannot be bounded, so membership is `unknown` and no request is reported as run usage"
      );
    if (!led.markers.some((m) => m?.kind === "run-stop"))
      warn("marker completeness: no run-stop marker — the run's tail is attributed to the last stage that started");
  }

  // ---- OPTIONAL: bind the rows to their referent (L43) -------------------------------------------
  if (opts.verifyTranscript && legacy) {
    warn(
      `--verify-transcript: not supported for a legacy ${LEGACY_SCHEMA} ledger — its SESSION-scoped rows are not re-derivable under the run-window rule, so this run certifies internal consistency only`
    );
  } else if (opts.verifyTranscript && led.membership?.status === "unknown") {
    // An unknown window has NO rows, and a re-derivation under the same markers is unknown too, so the
    // comparison would be empty-equals-empty whether or not the transcript still exists — a "binding to
    // the referent" that bound nothing (REVIEW finding 2, probed). Say so instead of passing silently.
    warn(
      "--verify-transcript: membership is `unknown`, so there are no rows to re-derive — this run certifies internal consistency only, not the transcript"
    );
  } else if (opts.verifyTranscript) {
    // Re-derive under the RECORDED boundary: the file's own `markers[]` and `membership.session`, never
    // the live markers file, so a later invocation's appended run-start cannot re-bound this ledger.
    // PRECONDITIONS (6.28.1): the re-derivation reads `name` into a path, sorts the rows' ids, and quotes the
    // session into a note this file prints. So it runs only over rows that are objects with string ids (S9: a
    // `null` row crashed it), a `name` that is a feature slug, and a session — the one ACTUALLY passed, which is
    // `membership.session`, else `sessions[0]` (GRILL R2-G4) — that is null or a bounded identity token.
    const session = led.membership?.session ?? led.sessions?.[0] ?? null;
    const notRun = !(Array.isArray(led.requests) && led.requests.every((r) => isPlainObject(r) && typeof r.request_id === "string"))
      ? "requests[] is not an array of objects with a string request_id"
      : typeof led.name !== "string" || !FEATURE_SLUG_RE.test(led.name)
        ? "name is not a feature slug"
        : session !== null && !isIdentityToken(session)
          ? "the recorded session is not a bounded identity token"
          : null;
    if (notRun !== null) {
      red(`--verify-transcript: not run — ${notRun}, so the rows were not re-derived from the transcript`);
      return { reds: [...reds], warns: [...warns] };
    }
    const { ledger: live, excludedAfterWindow } = deriveLedger({
      name: led.name,
      command: led.command,
      baseSha: led.base_sha,
      repo: opts.repo ?? ".",
      sessionId: session,
      projectsDir: opts.projectsDir,
      markers: Array.isArray(led.markers) ? led.markers : [],
    });
    const liveM = live.membership;
    if (live.coverage === "unavailable" && liveM?.status !== "unknown") {
      warn(
        `--verify-transcript: the transcript is no longer available (${live.coverage_note}) — the rows could NOT be re-derived, so this run certifies internal consistency only`
      );
    } else if (liveM?.status === "unknown" && CONTEXT_REASONS.includes(liveM.reason)) {
      // The transcript now fails to bind the run (6.29.0): a copy of a marker line reached a SECOND context's tool
      // results after emission, say, or a spawn record went missing. A re-derivation answers what the transcript
      // says NOW (L42/L58), so this is not evidence the ledger was wrong when written — a WARN, never a RED.
      warn(
        `--verify-transcript: the transcript no longer binds this run to one context (${liveM.reason}) — the rows could NOT be re-derived, so this run certifies internal consistency only`
      );
    } else {
      const a = led.requests.map((r) => r.request_id).sort();
      const b = live.requests.map((r) => r.request_id).sort();
      if (a.length !== b.length || a.some((id, i) => id !== b[i])) {
        // A ledger written under run-window/1 whose rows are a SUPERSET of the re-derivation holds requests of
        // other contexts: say so, with the count, because that is exactly what the context half exists to remove.
        const liveIds = new Set(b);
        const recordedIds = new Set(a);
        const notRun = a.filter((id) => !liveIds.has(id)).length;
        const legacy =
          led.membership?.method === MEMBERSHIP_METHOD_V1 && notRun > 0 && b.every((id) => recordedIds.has(id))
            ? ` — ${notRun} recorded row(s) are not the run's own under ${MEMBERSHIP_METHOD}: this ledger was written under ${MEMBERSHIP_METHOD_V1}, which did not scope rows to the context that ran the run`
            : "";
        red(`--verify-transcript: requests[] does not match the transcript (${a.length} recorded, ${b.length} re-derived)${legacy}`);
      } else if (checkRowsAgainstTranscript(led.requests, live.requests)) {
        // The recorded context set must be the re-derived one (`/2` only; a `/1` ledger has none). Fixed once a
        // bounded window closes: an agent spawned after the end is outside it by rule 7.
        if (led.membership?.method === MEMBERSHIP_METHOD) {
          // Compared element by element, never through JSON.stringify: a file value nested past the stack would make
          // that throw, and this checker is total over its input (the 6.28.1 closures walk every node).
          const sameList = (x, y) =>
            Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every((v, i) => typeof v === "string" && v === y[i]);
          const sameContexts = (x, y) => (x === null && y === null) || sameList(x, y);
          if (led.membership.context !== (liveM?.context ?? null) || !sameContexts(led.membership.contexts, liveM?.contexts ?? null)) {
            red(
              `--verify-transcript: membership.context/contexts do not match the transcript (recorded ${valText(led.membership.context)} with ${valText(led.membership.contexts)}; re-derived ${valText(liveM?.context)} with ${valText(liveM?.contexts)})`
            );
          }
        }
        checkExcludedAgainstTranscript(led.membership?.excluded_requests ?? null, liveM?.excluded_requests ?? null, excludedAfterWindow);
      }
    }
  }

  return { reds: [...reds], warns: [...warns] };
}

/** The two token classes that can GROW across one request's transcript lines (see below). */
export const GROWING_CLASSES = Object.freeze(["output", "output_thinking"]);

/**
 * `--verify-transcript`'s comparison of the ROWS, request by request and class by class (6.24.1). The id
 * sets are already equal when this runs. Returns true when nothing RED was found.
 *
 * WHY TWO CLASSES ARE BOUNDED AND NOT EQUAL ([[L58]], [[L63]]). A row's usage is its request's line with
 * the most output tokens (`transcript-core.mjs`), and a request still being written when the ledger was
 * emitted was recorded at the largest line written THEN. A later line can carry more `output` and more
 * `output_thinking`, so a re-derivation NOW can find more of them for a CORRECT ledger. Until 6.24.1 this
 * compared totals exactly, which was right while rows were each request's first line (fixed once written)
 * and became a false RED the moment the rule moved them to the largest line. The other four classes did not
 * differ across a request's selected and first line on any measured request, so they are compared exactly.
 *
 * THE RULE: each of the four other classes must be EQUAL; each growing class must satisfy recorded <=
 * re-derived. Above is RED, because the transcript never held that much. Below is a WARN naming the two causes
 * it cannot tell apart: a request in flight at emission, and a ledger written before 6.24.1, whose first-line
 * rule under-counted.
 *
 * BOUND (P0), stated in the WARN as well as here: the growing classes are now exact only from ABOVE. Any
 * lower value passes with the WARN, a negative one included, because nothing here bounds the lower side.
 * Pinning a value exactly would need the emission's own moment in the file, which is a schema change. That
 * is also why `excluded_requests` is a range (6.14.1), but that range has a lower side and this compare has
 * none. The rows do have a fixed lower part, the request's first line. A bound at it is named and not built,
 * because no failure has been observed (P7).
 */
function checkRowsAgainstTranscript(recorded, live) {
  const now = new Map(live.map((r) => [r.request_id, r]));
  const fixed = [];
  const above = [];
  const below = [];
  for (const r of recorded) {
    const l = now.get(r.request_id);
    for (const c of TOKEN_CLASSES) {
      const rec = r.tokens?.[c];
      const cur = l?.tokens?.[c];
      const where = `${shown(r.request_id)} ${c}: ${valText(rec)} recorded, ${valText(cur)} re-derived`;
      if (!Number.isFinite(rec) || !Number.isFinite(cur)) fixed.push(where);
      else if (!GROWING_CLASSES.includes(c)) {
        if (rec !== cur) fixed.push(where);
      } else if (rec > cur) above.push(where);
      else if (rec < cur) below.push(where);
    }
  }
  const some = (list) => `${list.slice(0, 3).join("; ")}${list.length > 3 ? `; +${list.length - 3} more` : ""}`;
  if (fixed.length) {
    red(`--verify-transcript: ${fixed.length} row value(s) do not match the transcript in a class that must match exactly: ${some(fixed)}`);
  }
  if (above.length) {
    red(`--verify-transcript: ${above.length} row value(s) record MORE output than the transcript holds: ${some(above)}`);
  }
  if (below.length) {
    warn(
      `--verify-transcript: ${below.length} row value(s) are BELOW what the transcript now holds (${some(below)}). Either the request was still being written when the ledger was emitted, or the ledger predates 6.24.1, whose first-line rule under-counted — this check cannot tell the two apart. The growing classes are bounded only from above, so a deflated value also lands here`
    );
  }
  return fixed.length === 0 && above.length === 0;
}

/**
 * `--verify-transcript`'s comparison of `membership.excluded_requests`, as a RANGE (6.14.1).
 *
 * THE RECORDED FAILURE (P7): a downstream `/pharn-loop` ledger went RED here with "423 recorded, 508
 * re-derived" while its rows and totals re-derived exactly, and the re-derived number kept climbing on every
 * run. The recorded value is a count AT EMISSION of two parts. The transcript is append-only, so the part
 * BEFORE the window is fixed once the window is. The part AFTER its end grows for as long as the session
 * continues. The emission's own turn is already in it, and so is the stop's commit and everything the
 * session does next. An equality test on the sum therefore failed every genuine ledger whose session had
 * written anything since. [[L42]]: the re-derivation answers "what is it NOW", the file recorded "what was it
 * THEN", and the tail is the one input that legitimately changed between them.
 *
 * THE RULE. With `live` the re-derived total and `after` its after-window part, a genuine value is
 * `before + t` for some `0 <= t <= after`, where `before = live - after`. So it must lie in `[before, live]`.
 * Below `before` is RED: the fixed part alone exceeds it. Above `live` is RED: the transcript never held
 * that many. `null` on either side (an unknown window) keeps the old equality. The caller WARNs and returns
 * before reaching here in that case, so the branch is a guard, not a path.
 *
 * BOUND (P0), stated in the WARN as well as here: this is EXACT for the part before the window and only an
 * UPPER BOUND for the tail. An inflated value up to `live` passes, and a test pins that. Pinning the tail
 * exactly would need the emission's own moment in the file, which is a schema change. The before-window
 * part being fixed rests on the transcript being append-only and every record being stamped when written
 * (`isAfterWindow`'s bound); that is a platform behaviour, observed, not a floor fact.
 */
function checkExcludedAgainstTranscript(recorded, live, after) {
  // `recorded` is read from the file, so it is quoted through `valText` and compared only once it is an integer.
  if (recorded === null || live === null) {
    if (recorded !== live) {
      red(
        `--verify-transcript: membership.excluded_requests does not match the transcript (${valText(recorded)} recorded, ${live} re-derived)`
      );
    }
    return;
  }
  const before = live - after;
  if (!Number.isInteger(recorded) || recorded < before || recorded > live) {
    red(
      `--verify-transcript: membership.excluded_requests does not match the transcript (${valText(recorded)} recorded; re-derived ${before} before the window + ${after} after its end, so a genuine value lies in [${before}, ${live}])`
    );
    return;
  }
  if (recorded !== live) {
    warn(
      `--verify-transcript: the session continued after the run — excluded_requests (${recorded}) is below the re-derived ${live} because ${after} request(s) now lie after the window's end; it is exact only for the ${before} before the window, and an inflated value up to ${live} would also pass`
    );
  }
}

/** A context key the ledger may record (6.29.0): `main`, or `agent:` + a rule-3 identity token. Total. */
const isContextKey = (v) =>
  v === MAIN_CONTEXT ||
  (typeof v === "string" && v.startsWith(AGENT_CONTEXT_PREFIX) && isIdentityToken(v.slice(AGENT_CONTEXT_PREFIX.length)));

/** RULE 8 — see the header. Uses the SHARED `run-window-core.mjs` and the emitter's `rowContext`; restates neither. */
function checkMembership(led) {
  const m = led.membership;
  if (!m || typeof m !== "object" || Array.isArray(m)) {
    red("membership must be an object");
    return;
  }
  // The METHOD selects the closed key set (6.29.0): `run-window/1` keeps its own seven keys, and anything else is
  // held to the CURRENT nine — an unknown method never downgrades to the lenient legacy set.
  const v1 = m.method === MEMBERSHIP_METHOD_V1;
  const wanted = v1 ? MEMBERSHIP_KEYS_V1 : MEMBERSHIP_KEYS;
  const keys = Object.keys(m);
  const extra = keys.filter((k) => !wanted.includes(k));
  const missing = wanted.filter((k) => !keys.includes(k));
  if (extra.length) red(`membership key set is not closed — unexpected key(s): ${listText(extra.sort(), keyText)}`);
  if (missing.length) red(`membership key set is not closed — missing key(s): ${listText(missing, keyText)}`);
  if (!MEMBERSHIP_METHODS.includes(m.method)) {
    red(`membership.method must be one of ${MEMBERSHIP_METHODS.join(" | ")} (got ${valText(m.method)})`);
  }
  if (!MEMBERSHIP_STATUSES.includes(m.status)) {
    red(`membership.status must be one of ${MEMBERSHIP_STATUSES.join(" | ")} (got ${valText(m.status)})`);
    return;
  }
  if (m.session !== null && badIdentity(m.session)) red("membership.session is not a bounded identity token");

  // Re-derive the window from the file's OWN markers — never trusted from the stored block.
  const win = runWindow(normalizeMarkers(led.markers), m.session ?? null);
  // A CONTEXT-unknown `run-window/2` ledger: the window is known, the run could not be bound or placed (rules 6–8 in
  // run-window-core.mjs). Only the context half can make a known window unknown, and it exists only under `/2`.
  const contextUnknown = !v1 && m.status === "unknown" && win.status !== "unknown" && CONTEXT_REASONS.includes(m.reason);

  if (m.status === "unknown") {
    if (!Object.values(UNKNOWN_REASONS).includes(m.reason))
      red(`membership.reason is not a member of the closed reason set (got ${valText(m.reason)})`);
    else if (v1 && CONTEXT_REASONS.includes(m.reason))
      red(
        `membership.reason is a context reason, but ${MEMBERSHIP_METHOD_V1} has no context half — only ${MEMBERSHIP_METHOD} can be unknown for it`
      );
    if (m.excluded_requests !== null)
      red("membership.excluded_requests must be null when membership is unknown — nothing was measured, so nothing was excluded");
    if (led.coverage !== "unavailable")
      red("membership is unknown but coverage is not `unavailable` — an unknown run must never read as a measurement");
    if (Array.isArray(led.requests) && led.requests.length)
      red("membership is unknown but requests[] carries rows — whole-session usage presented as run usage");
  } else {
    if (m.reason !== null) red("membership.reason must be null when the window is known");
    if (!Number.isInteger(m.excluded_requests) || m.excluded_requests < 0) {
      red(`membership.excluded_requests must be a non-negative integer when the window is known (got ${valText(m.excluded_requests)})`);
    }
    if (m.status === "open")
      warn(
        "membership: the run window is OPEN (no run-stop marker) — the run's end is unbounded, so later session activity would be included"
      );
  }

  // The stored window must equal the recompute. A context-unknown ledger keeps the window's start and end, and its
  // status/reason come from the context half, which the file alone cannot re-derive (only --verify-transcript can).
  for (const k of contextUnknown ? ["start", "end"] : ["status", "reason", "start", "end"]) {
    if ((m[k] ?? null) !== (win[k] ?? null)) {
      red(`membership.${k} disagrees with a recompute from markers[] (stored ${valText(m[k])}, recomputed ${valText(win[k])})`);
    }
  }

  const set = v1 ? null : checkContexts(led, m);
  if (!Array.isArray(led.requests)) return;
  const outside = led.requests.filter((r) => r && typeof r === "object" && !isMember(win, r.ts, r.session_id));
  if (outside.length) {
    red(
      `${outside.length} request(s) lie OUTSIDE the recorded run window and are summed into the run's totals: ${outside
        .slice(0, 3)
        .map((r) => valText(r.request_id))
        .join(", ")}${outside.length > 3 ? ", …" : ""}`
    );
  }
  // RULE 8, the context half (`/2`): every row's context — read from the row alone, `rowContext` — must be a
  // member of the RECORDED context set. BOUND (L43): agreement with the recorded set, never that the set is the
  // run's; only --verify-transcript binds the set to the transcript.
  if (set !== null) {
    const foreign = led.requests.filter((r) => r && typeof r === "object" && !set.has(rowContext(r)));
    if (foreign.length) {
      red(
        `${foreign.length} request(s) come from a context outside membership.contexts and are summed into the run's totals: ${listText(
          foreign.map((r) => r.request_id),
          valText
        )}`
      );
    }
  }
  // A ledger written before 6.29.0: validated under its own rules above, never retroactively REDed for lacking the
  // context half — and told, with a count, what that half would have separated.
  if (v1 && Array.isArray(led.requests) && led.requests.length > 0) {
    const contexts = new Set(led.requests.map((r) => rowContext(r) ?? "(undecidable)"));
    warn(
      `membership ${MEMBERSHIP_METHOD_V1} is not context-scoped (written before 6.29.0): its rows are every request of the session inside the window, so a concurrent run, its agents or the main thread working in that window are counted too — these rows come from ${contexts.size} context(s). Re-derive with --verify-transcript while the transcript exists`
    );
  }
}

/**
 * RULE 9 (6.35.0, `cost-ledger.md` "Stage executions and deterministic work"). `work[]` rows are FACTS: each must pass
 * `stage-work.mjs validateWork` (closed keys, enums, the count invariant) and be a MEMBER of the run window recomputed
 * from the file's own `markers[]` for `membership.session` — the test every request row passes; an unknown window
 * admits none. `executions` is a VIEW: it must equal `buildExecutions` recomputed from the file's own `markers[]` and
 * `work[]`, so an edited elapsed value, run number, pairing or work index is RED. BOUND ([[L43]]): agreement between
 * the file's facts and its view, never that the markers or the records describe what really ran.
 */
function checkWorkAndExecutions(led) {
  if (!Array.isArray(led.work)) {
    red("work must be an array");
    return;
  }
  const markers = normalizeMarkers(Array.isArray(led.markers) ? led.markers : []);
  const session = isPlainObject(led.membership) ? (led.membership.session ?? null) : null;
  const win = runWindow(markers, typeof session === "string" ? session : null);
  const invalid = [];
  const outside = [];
  led.work.forEach((w, i) => {
    if (!validateWork(w).ok) invalid.push(i);
    else if (!isMember(win, w.ts, w.session_id)) outside.push(i);
  });
  if (invalid.length) red(`work[] holds ${invalid.length} row(s) that are not valid work records, at index ${listText(invalid, String)}`);
  if (outside.length) red(`work[] holds ${outside.length} row(s) OUTSIDE the recorded run window, at index ${listText(outside, String)}`);
  if (invalid.length) return; // the view cannot be recomputed over rows the rule refused
  const expected = buildExecutions(markers, led.work);
  if (!sameValue(led.executions, expected, 0)) {
    red(
      `executions disagrees with a recompute from markers[] and work[] (method ${valText(expected.method)}, ${expected.rows.length} row(s) recomputed) — the elapsed view is a function of the file's own facts`
    );
  }
}

/**
 * RULE 10 (6.48.0, `cost-ledger.md` "Entry gate observations"). `entry_events[]` rows are FACTS: each must pass
 * `entry-observations.mjs validateEntryEvent` (closed keys per event, enums, ranges), be ADMITTED by the run window
 * recomputed from the file's own `markers[]` for `membership.session` (`isAdmitted`, the emitter's own rule: every
 * timestamp the event carries, `end_ts` included, is a window member), and appear once (an exact duplicate is RED; two
 * DIFFERENT lines of one identity are a conflict the view reports, never a RED). `entry` is a VIEW: it must equal
 * `buildEntryView` recomputed from the file's own `markers[]`, `entry_events[]` and `executions` (recomputed from
 * `markers[]` and `work[]`), so an edited elapsed value, union, status or binding is RED. It never reads the live
 * `entry.jsonl`. BOUND ([[L43]]): agreement between the file's facts and its view, never that the events describe what
 * ran. A structurally valid ledger whose view says `incomplete` / `unknown` is GREEN: that is an honest measurement
 * state, not a defect.
 */
function checkEntry(led) {
  if (!Array.isArray(led.entry_events)) {
    red("entry_events must be an array");
    return;
  }
  const markers = normalizeMarkers(Array.isArray(led.markers) ? led.markers : []);
  const session = isPlainObject(led.membership) ? (led.membership.session ?? null) : null;
  const win = runWindow(markers, typeof session === "string" ? session : null);
  const invalid = [];
  const outside = [];
  const dup = [];
  const seen = new Set();
  led.entry_events.forEach((e, i) => {
    if (!validateEntryEvent(e).ok) {
      invalid.push(i);
      return;
    }
    if (!isAdmitted(win, e)) outside.push(i);
    const c = canonical(e);
    if (seen.has(c)) dup.push(i);
    seen.add(c);
  });
  if (invalid.length)
    red(`entry_events[] holds ${invalid.length} row(s) that are not valid entry observations, at index ${listText(invalid, String)}`);
  if (outside.length)
    red(`entry_events[] holds ${outside.length} row(s) OUTSIDE the recorded run window, at index ${listText(outside, String)}`);
  if (dup.length)
    red(`entry_events[] holds ${dup.length} exact duplicate row(s), at index ${listText(dup, String)} — the emitter drops them`);
  if (invalid.length) return; // the view cannot be recomputed over rows the rule refused
  const work = Array.isArray(led.work) && led.work.every((w) => validateWork(w).ok) ? led.work : [];
  const expected = buildEntryView(markers, led.entry_events, buildExecutions(markers, work));
  if (!sameValue(led.entry, expected, 0)) {
    red(
      `entry disagrees with a recompute from markers[], entry_events[] and executions (method ${valText(expected.method)}, ${expected.invocations.length} invocation(s) recomputed) — the entry view is a function of the file's own facts`
    );
  }
}

/** Structural equality over parsed JSON, total and bounded in depth (never JSON.stringify — see RULE 6's note). */
function sameValue(a, b, depth) {
  if (depth > 8) return false;
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => sameValue(v, b[i], depth + 1));
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && sameValue(a[k], b[k], depth + 1));
}

/**
 * RULE 8's context fields under `run-window/2`. A MEASURED ledger (a known window, `coverage: partial`) must carry
 * the bound `context` and a non-empty, sorted, duplicate-free `contexts` of context keys that includes it; every other
 * ledger (unknown by either half, or a known window whose transcript was not measured) must carry `null` in both,
 * because nothing was bound. Returns the recorded set, or null when there is none to test rows against.
 */
function checkContexts(led, m) {
  const measured = m.status !== "unknown" && led.coverage === "partial";
  if (!measured) {
    if (m.context !== null) red(`membership.context must be null when nothing was measured (got ${valText(m.context)})`);
    if (m.contexts !== null) red(`membership.contexts must be null when nothing was measured (got ${valText(m.contexts)})`);
    return null;
  }
  if (!isContextKey(m.context)) red(`membership.context must be a context key — \`main\` or \`agent:<id>\` (got ${valText(m.context)})`);
  if (!Array.isArray(m.contexts) || m.contexts.length === 0) {
    red("membership.contexts must be a non-empty array of context keys when the run was measured");
    return new Set();
  }
  const bad = m.contexts.filter((c) => !isContextKey(c));
  if (bad.length) red(`membership.contexts holds ${bad.length} value(s) that are not context keys: ${listText(bad, valText)}`);
  const keys = m.contexts.filter((c) => isContextKey(c));
  if (new Set(keys).size !== keys.length) red("membership.contexts carries a duplicate context key");
  if (keys.some((c, i) => i > 0 && keys[i - 1] > c)) red("membership.contexts must be sorted");
  if (isContextKey(m.context) && !keys.includes(m.context)) red("membership.contexts does not include membership.context");
  return new Set(keys);
}

function main(argv) {
  let file = null;
  const opts = { verifyTranscript: false, projectsDir: null, repo: "." };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--verify-transcript") opts.verifyTranscript = true;
    else if (k === "--projects-dir") opts.projectsDir = argv[++i];
    else if (k === "--repo") opts.repo = argv[++i];
    else if (k === "--markers-base") opts.markersBase = argv[++i];
    else if (k.startsWith("--")) {
      process.stderr.write(`check-cost-ledger: unknown argument ${k}\n`);
      return 2;
    } else if (file === null) file = k;
    else {
      process.stderr.write(`check-cost-ledger: unexpected argument ${k}\n`);
      return 2;
    }
  }
  if (!file) {
    process.stderr.write("usage: node pharn/floor/check-cost-ledger.mjs <cost.json> [--verify-transcript]\n");
    return 2;
  }
  opts.projectsDir ??= process.env.CLAUDE_CONFIG_DIR
    ? join(process.env.CLAUDE_CONFIG_DIR, "projects")
    : join(homedir(), ".claude", "projects");

  let led;
  try {
    led = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    // The message is quoted: V8's JSON.parse message embeds the file's own text, newlines included (GRILL R2-G4).
    process.stderr.write(`check-cost-ledger: cannot read or parse ${file} — ${shown(e?.message)}\n`);
    return 2; // unusable input is never GREEN by default (fail-closed, P5)
  }

  // THE BACKSTOP (6.28.1): an unforeseen throw while checking is exit 2 — unusable, no verdict — never node's exit
  // 1, which is this file's RED code. The closures found no throw left to catch; this covers the member they did not
  // reach (L62: a crash is never read as a verdict). The message is fixed text, so nothing from the file rides it.
  let r;
  let w;
  try {
    ({ reds: r, warns: w } = checkLedger(led, opts));
  } catch {
    process.stderr.write(`check-cost-ledger: internal error while checking ${file} — no verdict (exit 2: unusable, never GREEN or RED)\n`);
    return 2;
  }
  for (const m of w) console.log(`WARN — ${m}`);
  if (r.length) {
    for (const m of r) console.log(`RED — ${m}`);
    console.log(`RED — ${file}: ${r.length} floor violation(s)`);
    return 1;
  }
  console.log(
    `GREEN — ${file}: closed key set, ${led.requests.length} request(s) with unique ids, every usage leaf in domain, ` +
      `no absolute-path string, ${led.markers.length} marker(s) with increasing seq, all views recompute from requests[]` +
      `${w.length ? ` (${w.length} WARN)` : ""}.`
  );
  console.log(
    "NOTE (P0): this certifies the file's INTERNAL CONSISTENCY, never that requests[] matches the transcript — " +
      "a self-consistent fabricated ledger passes. `--verify-transcript` binds the rows to their referent, and only while the transcript exists."
  );
  return 0;
}

// `import.meta.main` — NOT a `file://` + argv[1] compare (L25). The exit code is SET, never forced: an immediate
// exit drops stdout still queued for a pipe, which cut a large verdict off before its last line (6.28.1, GRILL R2-G3).
if (import.meta.main) process.exitCode = main(process.argv.slice(2));
