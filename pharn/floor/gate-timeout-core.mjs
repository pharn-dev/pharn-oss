// pharn/floor/gate-timeout-core.mjs — a project's declaration of a LONGER per-gate timeout (7.16.0,
// gate-timeout-above-bash-cap — Linear CORE-87). P3: this file changes when the timeout VALUE rule changes (its bounds,
// how it combines with the pinned value); reading the `gates` block it sits in is gate-exclusion-core.mjs's job, and
// that file changes when the block's shape does.
//
// THE RECORDED FAILURE (P7): `.dev/measurements/loop-baseline-2026-11-11.md` §7/§12 — 12 of 36 measured /pharn-loop
// runs stopped `gates-unmeasured-at-entry`, 11 of them on `test` killed at the pinned 540 s per-gate timeout, and 6 of
// the 9 `STOP_TERMINAL` stops were the same gate timed out at regress or verify. A killed gate is unmeasured, never a
// pass, so each such run stopped with nothing learned. 540000 is chosen so one gate fits inside one 600 s Bash call; the
// entry runner (entry-gates.mjs, detached since 6.42.0) and the regress/verify stage runner (stage-direct.mjs, detached
// since 7.15.0) no longer run gates inside a Bash call, so 7.16.0 honoured a longer value only there. Since 7.22.1
// (CORE-298) /pharn-build's gate (build-gate.mjs) and the standalone stage scripts (stage-regress.mjs, stage-verify.mjs)
// honour it too: a build iteration over a suite that needs more than 540 s ran the full gate for 9 minutes, was killed and
// recorded a failed gate, every iteration. Those calls run inside a Bash call, so with a declared value above its 600 s
// they outlast it and the harness moves them to the background (stage-exit.md, "A Bash-tool timeout is not a kill").
//
// THE DECLARATION, beside `gates.exclude` in the project root's `pharn.config.json`:
//
//   { "gates": { "timeoutMs": 900000 } }
//
//   • absent → the pinned `--timeout-ms` the caller was given, UNCHANGED (every record and argv byte-identical);
//   • a safe integer from TIMEOUT_MIN_MS to TIMEOUT_MAX_MS, else the block refuses (gate-exclusion-core.mjs);
//   • below the pinned value → refused: a declaration may only LENGTHEN the pinned timeout. The lower bound is relative
//     to the pinned value on purpose (L35): 540000 keeps ONE home, the pinned command lines, and this module holds no
//     default of its own.
//
// THE UPPER BOUND, AND WHAT IT COSTS: TIMEOUT_MAX_MS = 1800000 (30 min, GATE 1 decision D1 — over 3× the measured
// 538–542 s suite). A longer timeout lengthens a HUNG gate too: a gate that hangs runs the full declared time before it
// is killed — at entry, on each side of regress (whose base-side install the same value bounds) and at verify.
//
// WHAT IT DOES NOT DO (P0): it does not choose the value — the project does, in agent-editable project input (L43: the
// value's provenance is never proven). It does not reach /pharn-test's red run, which calls run-gates.mjs directly (the
// runner takes only the flag) over the AC tests alone: that keeps its pinned 540000.
//
// TRUST (P2): the value is untrusted DATA, used only as an integer after a range test; a refusal quotes it through
// quote-core.mjs's total `shown()` (L62). NON-LLM. This module reads no file, opens no network and starts no process;
// the config file's name is imported (L35), as gate-exclusion-core.mjs imports it.
import { CONFIG_FILE } from "./per-test-results-core.mjs";
import { shown } from "./quote-core.mjs";

/** The key inside the `gates` block. */
export const TIMEOUT_KEY = "timeoutMs";

/** The smallest declarable value: run-gates.mjs `run --next`'s 3-digit floor. */
export const TIMEOUT_MIN_MS = 100;

/** The largest declarable value: 30 minutes. A hung gate runs this long before it is killed. */
export const TIMEOUT_MAX_MS = 1_800_000;

/**
 * Why `v` is not a declarable per-gate timeout, or null. TOTAL: never throws (L62).
 * @param {unknown} v
 * @returns {string|null}
 */
export function timeoutDeclarationError(v) {
  if (Number.isSafeInteger(v) && v >= TIMEOUT_MIN_MS && v <= TIMEOUT_MAX_MS) return null;
  return (
    `must be an integer of milliseconds from ${TIMEOUT_MIN_MS} to ${TIMEOUT_MAX_MS} (30 min; a hung gate runs that long ` +
    `before it is killed), not ${shown(v)}`
  );
}

/**
 * The per-gate timeout a runner uses: the declaration when there is one, else the pinned `--timeout-ms`.
 * `declared` is `null` (no declaration) or a value gate-exclusion-core.mjs already range-checked; it is re-checked here,
 * so a direct caller cannot pass an out-of-range value through.
 * @param {{declared: number|null, pinnedMs: number}} args
 * @returns {{ok: true, value: number} | {ok: false, reason: string}}
 */
export function effectiveTimeoutMs({ declared, pinnedMs }) {
  if (!Number.isSafeInteger(pinnedMs) || pinnedMs <= 0) throw new TypeError("effectiveTimeoutMs: `pinnedMs` must be a positive integer");
  if (declared === null) return { ok: true, value: pinnedMs };
  const bad = timeoutDeclarationError(declared);
  if (bad !== null) return { ok: false, reason: `${CONFIG_FILE} \`gates.${TIMEOUT_KEY}\` ${bad}` };
  if (declared < pinnedMs) {
    return {
      ok: false,
      reason:
        `${CONFIG_FILE} \`gates.${TIMEOUT_KEY}\` ${shown(declared)} is below the pinned per-gate timeout ${pinnedMs} ms; ` +
        "a declaration may only lengthen it — raise it, or remove the key",
    };
  }
  return { ok: true, value: declared };
}

/**
 * The ONE resolution rule every caller applies (entry-gates.mjs, stage-direct.mjs; since 7.22.1 build-gate.mjs,
 * stage-regress.mjs and stage-verify.mjs — L35; review R5): given
 * gate-exclusion-core.mjs's result for the project root, the per-gate timeout to run with. A block that REFUSES is not a
 * timeout refusal (GRILL G1/G2): the pinned value is returned, and the existing reader of the block — run-gates.mjs
 * `init`, or the stage script — refuses it as before. No declaration → the pinned value, without calling
 * `effectiveTimeoutMs`, so even an out-of-range pinned value passes through untouched (AC1).
 * @param {{ok: boolean, timeoutMs?: number|null}} block
 * @param {number} pinnedMs
 * @returns {{ok: true, value: number} | {ok: false, reason: string}}
 */
export function resolveRunTimeout(block, pinnedMs) {
  if (!block || block.ok !== true || block.timeoutMs === null || block.timeoutMs === undefined) return { ok: true, value: pinnedMs };
  return effectiveTimeoutMs({ declared: block.timeoutMs, pinnedMs });
}
