// pharn/floor/ship-outcome-core.mjs — derive a `/pharn-ship` run's `outcome` for the cost ledger
// (`pharn/pharn-contracts/cost-ledger.md`). Node stdlib only, no network, no model call.
//
// WHY THIS IS ITS OWN MODULE, and not a second function inside the emitter. `render-cost-ledger.mjs`
// changes when the LEDGER SCHEMA changes. This derivation changes when `/pharn-ship`'s CONTROL FLOW
// changes — a new stop kind, a renamed stage, a second retry. Two reasons to change are two files
// (P3), and the repo has already paid this bill once: `render-run-report.mjs` originally imported the
// `## Files` grammar FROM `check-build-complete.mjs`, which gave that checker a second reason to change
// and became REVIEW finding F3, fixed by extracting `plan-files-core.mjs` rather than deferred.
// `loop-record-core.mjs` is the same pattern. `/pharn-dev-grill` raised it here (G3) BEFORE the build,
// which is the cheap moment.
//
// ── WHAT THE LOOP DOES INSTEAD, so the asymmetry is not read as an oversight ──────────────────────────
// `/pharn-loop` DECLARES its decision in `LOOP.md`'s frontmatter envelope, and `readOutcome()` in the
// emitter merely COPIES that field. A declaration can be re-derived and checked — `check-loop-decision.mjs`
// re-runs `check-loop.mjs` against the record's own cited reports and refuses a mismatch. `/pharn-ship`
// has NO such declaration and no `check-loop` decision to re-derive: its stop is a human gate or an
// orchestrator STOP, neither of which any checker computes. So this module DERIVES where the loop COPIES,
// and that difference is exactly why the two halves below carry different guarantees.
//
// ── HONEST SCOPE (P0) — the two halves are NOT the same strength ──────────────────────────────────────
// FLOOR (primitive #3, enum membership): `gate2` reduces to two sub-stage `.verdict` enums —
//   `verify-report.json` `PASS` AND `regression-report.json` `no-regressions`. Both are produced by
//   tested non-LLM checkers (`check-verify.mjs`, `check-regress.mjs`), and this module only tests
//   membership over them. It NEVER re-computes a verdict and never overrides one. `gate2-quick` (6.23.0,
//   `/pharn-ship --quick`) is the SAME KIND of floor reduction over a SMALLER stage set: `verify-report.json`
//   `PASS` on the run's OWN `pharn-verify` stage-start, at its latest iteration — the regression verdict is
//   NEVER consulted, because a quick run starts no `/pharn-regress` at all (`verdictStages`, below).
// ADVISORY: `stop:<stage>` names the last stage that STARTED, read from the last `stage-start` marker.
//   Markers are written by Bash calls in command prose, outside the `PreToolUse` gate (L19), so
//   `mark-phase.mjs`'s own bound applies unchanged and is NOT re-claimed stronger here: a written marker
//   does not mean the stage ran, and a stage that ran does not mean a marker was written. The STAGE NAME
//   is therefore advisory. What is NOT advisory is the `stop:` half itself — reaching that branch means
//   `gate2`'s floor test did not pass, which is a membership fact.
// NEVER CLAIMED: that the decision is CORRECT, that the run "should" have stopped there, or that a
//   `gate2` means the increment is good. `gate2` means two enums held and a human was handed the
//   decision — the gate is theirs (`pharn/ARCHITECTURE.md §6`).
//
// THE LABEL TRAVELS WITH THE VALUE, it is not left to this header (P0, GRILL G2). Callers render the
// split beside the value: `render-run-report.mjs`'s `## Outcome` preamble states it for a human, and
// `cost-ledger.md`'s field table states it for an implementer. A reader of either meets the bound
// without opening the other.
//
// ── THE CLOSED VOCABULARY (L36) ───────────────────────────────────────────────────────────────────────
// `decision` carries a PARAMETER, and a parameterized value is precisely where a variant spelling lands.
// The set is written down IN FULL here, before any assertion was authored against it, because L36's
// recorded instance is a five-member vocabulary that shipped with the enumeration in the same diff and
// still acquired a second spelling of one member. `SHIP_DECISION_FORMS` is that enumeration; the suite
// iterates it and additionally holds `SHIP_DECISION_RE` as a CLOSURE over the emitted stem, so a fourth
// form fails rather than merely going untested.
//
// ── APPLICABILITY — the verdicts must belong to THIS run (added 6.9.1) ───────────────────────────────
// Until 6.9.1 `gate2` needed only "markers exist" + two green `.verdict`s read from the feature
// directory, and nothing bound either report to the run being reported. REACHED THROUGH SUPPORTED USE,
// not a probe of the pure function: `/pharn-spec` resumes an existing `<name>` (its Step 1.1, an
// instruction), so a second `/pharn-ship` on the same feature appends a new `run-start`, STOPs at grill,
// and the PREVIOUS run's green reports — still on disk, since no code invalidates them — derived
// `gate2`. Now the verdicts count only when `verdictApplicability()` says `current`: the CURRENT run
// (`run-window-core.mjs`'s `currentRunMarkers`, the one definition) carries a `stage-start` for BOTH
// `pharn-regress` and `pharn-verify` at the run's LATEST recorded iteration, so a new invocation's run
// cannot inherit an old pair, and a Step 2b retry that started iteration 2 cannot inherit iteration 1's.
// When the run window itself is `unknown` the outcome is `undetermined` — neither a failed check nor an
// invented stop stage.
// STRENGTH, stated: exact RELATIVE TO THE RECORDED MARKERS (enum + ordering), and the markers are
//   ADVISORY (Bash-written command prose, L19). It never uses a file's mtime or its mere existence ([[L42]]).
// THE RESIDUAL, at its true width: a marker proves a stage STARTED in this attempt, never that it
//   REWROTE its report. A `/pharn-verify` (or `/pharn-regress`) that writes its stage-start and then
//   REFUSES before emitting leaves the previous attempt's — or the previous run's — file in place, and
//   this derivation accepts it. That applies to EVERY attempt, not only the retry (GRILL finding 1), and
//   it is pinned by a test so it stays visible. Closing it needs a report-side run identity (a
//   verify/regression-report contract change) or a lifecycle invalidation in `/pharn-ship` (an
//   orchestration change) — both outside this increment by design.
//
// DETERMINISM (P5): no clock, no randomness. Every branch is a membership or grammar test, and the
// terminal fallback is the explicit `unknown` stage token — never a guess, never a silently dropped
// outcome.
//
// ── THE MODE (6.23.0, `/pharn-ship --quick`) ─────────────────────────────────────────────────────────
// The mode is recorded on the run-start marker (`mark-phase.mjs --mode`), never re-derived from the
// SPEC's `spec_kind`: D7 lets a quick SPEC run the full pipeline (a human choice at GATE 1), so the kind
// alone cannot tell a quick RUN from a full one. `runMode()` reads only the CURRENT run's run-start
// (`currentRunMarkers(...)[0]`), by exact equality at read time — an EARLIER run's quick run-start never
// makes the current run quick, and vice versa. `verdictStages()` is the one place the stage SET forks:
// full mode needs both `pharn-regress` and `pharn-verify`; quick mode needs `pharn-verify` alone.
// EITHER MISREADING UNDER-CLAIMS, NEVER OVER-CLAIMS (stated because it is the safe-failure argument for
// trusting a Bash-written marker at all): a quick run whose `--mode quick` marker was skipped reads as
// full, so it has no regress stage-start and its outcome is `stop:pharn-verify`, never `gate2`. A full run
// whose run-start wrongly carries `mode: "quick"` yields `gate2-quick` at most, which claims no regression
// verdict at all — never the stronger `gate2` a full run's own regress stage would have earned.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { currentRunMarkers, runWindow } from "./run-window-core.mjs";
import { QUICK_MODE } from "./mark-phase.mjs";

/** The literal, un-parameterized decision for a run that reached the human gate. */
export const GATE2 = "gate2";

/** The literal decision for a `--quick` run whose OWN verify stage reached PASS — see the header. Never
 *  confused with `GATE2`: every consumer compares `decision` by equality, and the contract says in words
 *  that `gate2-quick` is not `gate2`. */
export const GATE2_QUICK = "gate2-quick";

/** The prefix every non-gate2 decision carries. One definition, referenced — never re-spelled (L41). */
export const STOP_PREFIX = "stop:";

/** The terminal-fallback stage token: markers exist, but none of them is a `stage-start`. */
export const UNKNOWN_STAGE = "unknown";

/** The outcome when the run's own boundary cannot be established from its markers, so no verdict can be
 *  bound to it. Deliberately NOT `stop:…` (that would invent a stop) and NOT `gate2`. */
export const UNDETERMINED = "undetermined";

/** The two stages whose reports the `gate2` test reads — `/pharn-ship`'s own `--stage` tokens. */
export const VERDICT_STAGES = Object.freeze(["pharn-regress", "pharn-verify"]);

/** The ONE stage a `gate2-quick` test reads (6.23.0): a `--quick` run starts no `/pharn-regress` at all, so
 *  requiring it would make `gate2-quick` unreachable by every quick run — never a stage set copied from
 *  VERDICT_STAGES and then pruned by hand. */
export const QUICK_VERDICT_STAGES = Object.freeze(["pharn-verify"]);

/** `"quick"` iff the CURRENT run's run-start marker carries `mode === QUICK_MODE` (exact equality, read at
 *  THIS call — see the header); else `"full"`, the terminal fallback (P5, never a guess). Reads only
 *  `currentRunMarkers(...)[0]` — the SAME "current run" definition `verdictApplicability` and
 *  `run-window-core.mjs` share (L35) — so an earlier invocation's markers can never decide this run's mode. */
export function runMode(markers) {
  const current = currentRunMarkers(markers);
  const start = current ? current[0] : null;
  return start !== null && start.mode === QUICK_MODE ? "quick" : "full";
}

/** The stage set a `gate2`-family test reads, by mode. Not re-derived at each call site — every reader
 *  (`verdictApplicability`, this module's own header comment) cites this function rather than re-spelling
 *  the fork (L35). */
export function verdictStages(mode) {
  return mode === "quick" ? QUICK_VERDICT_STAGES : VERDICT_STAGES;
}

/** `verdictApplicability().status` — a CLOSED set (L29): every consumer branches on membership. */
export const APPLICABILITY = Object.freeze({ CURRENT: "current", NOT_IN_RUN: "not-in-run", UNKNOWN: "unknown" });

/** `outcome.source` for a derived (as opposed to declared) outcome. The loop's `LOOP.md` is the other
 *  member; both are enumerated in `pharn/pharn-contracts/cost-ledger.md`. */
export const OUTCOME_SOURCE = "verdicts+markers";

/** A stage token: the same grammar `mark-phase.mjs` enforces at WRITE time, re-tested at READ time.
 *  Re-testing is deliberate and is not redundancy — the markers file is ordinary state under `.pharn/`
 *  that Bash reaches (`LIMITS.md §6`), so a reader that trusted the writer's validation would be
 *  trusting a file anyone can edit. Fail-closed: a token that does not match becomes `unknown`. */
const STAGE_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** CLOSURE over every `decision` this module can emit. A sixth form (the vocabulary is five members as of
 *  6.23.0) fails this, which is the whole point of a closure over a presence set (L36). */
export const SHIP_DECISION_RE = /^(gate2|gate2-quick|undetermined|stop:[a-z0-9][a-z0-9-]{0,63})$/;

/**
 * The CLOSED vocabulary, materialized once so the rules iterate it rather than being authored for
 * whichever member was in front of the author (L29). `example` is what the form renders as; `floor`
 * records which half of the honest-scope split above the form belongs to.
 */
export const SHIP_DECISION_FORMS = Object.freeze([
  Object.freeze({
    form: "gate2",
    example: GATE2,
    parameterized: false,
    floor: true,
    means: "verify PASS AND regress no-regressions — the run reached GATE 2 and the decision is the human's",
  }),
  Object.freeze({
    form: "gate2-quick",
    example: GATE2_QUICK,
    parameterized: false,
    floor: true,
    means:
      "a --quick run whose OWN pharn-verify stage-start reached PASS at its latest iteration — no regression " +
      "verdict is read, because quick mode starts no /pharn-regress. NOT gate2: it names where the run ended " +
      "first (gate2) and the mode second, and every consumer compares `decision` by equality, never by prefix",
  }),
  Object.freeze({
    form: "stop:<stage>",
    example: `${STOP_PREFIX}pharn-verify`,
    parameterized: true,
    floor: false,
    means: "the gate2 test did not hold; <stage> is the last stage-start marker's own stage token (ADVISORY — marker discipline)",
  }),
  Object.freeze({
    form: `${STOP_PREFIX}${UNKNOWN_STAGE}`,
    example: `${STOP_PREFIX}${UNKNOWN_STAGE}`,
    parameterized: false,
    floor: false,
    means: "markers exist but none is a stage-start, or its stage token failed the grammar — the terminal fallback, never a guess",
  }),
  Object.freeze({
    form: UNDETERMINED,
    example: UNDETERMINED,
    parameterized: false,
    floor: false,
    means:
      "markers exist but the run's boundary cannot be established (run-window unknown), so no verdict can be bound to this run — not a failed check, not a stop stage",
  }),
]);

/** The two proceed values, cited from the stages that own them — never re-derived here. */
const VERIFY_PROCEED = "PASS";
const REGRESS_PROCEED = "no-regressions";

/** A report's `.verdict`, or `null` when the file is absent or unparseable. Absence is a REAL state on
 *  an early STOP (a run that never reached `/pharn-regress` has no report), not an error. */
export function readVerdict(file) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  return parsed && typeof parsed.verdict === "string" ? parsed.verdict : null;
}

/**
 * The last `stage-start` marker's stage token, or `UNKNOWN_STAGE`.
 *
 * `markers` is already `seq`-sorted by `readMarkers()`, so "last" is the final matching element. The
 * grammar re-test is what makes the terminal fallback reachable rather than theoretical.
 */
export function lastStartedStage(markers) {
  let stage = UNKNOWN_STAGE;
  for (const m of markers) {
    if (m?.kind !== "stage-start") continue;
    stage = typeof m.stage === "string" && STAGE_RE.test(m.stage) ? m.stage : UNKNOWN_STAGE;
  }
  return stage;
}

/**
 * How many iterations the run recorded: the greatest `iteration` any `stage-start` marker carries.
 *
 * `null` when no `stage-start` carries one — which is the ordinary shape of a ship run that stopped
 * before `/pharn-build`, since the spec/plan/grill stages run once and are marked without an iteration.
 * An honest `null` beats a manufactured `1` (the ledger's `outcome.iterations` is already `int | null`).
 */
export function recordedIterations(markers) {
  let max = null;
  for (const m of markers) {
    if (m?.kind !== "stage-start" || !Number.isInteger(m.iteration)) continue;
    if (max === null || m.iteration > max) max = m.iteration;
  }
  return max;
}

/**
 * Derive the outcome from already-read values. PURE — no I/O, no clock.
 *
 * Returns `null` when there are no markers at all: there is then no evidence a run happened, and
 * inventing a `stop:unknown` for an empty markers file would report a stop that was never observed.
 * `null` is an existing, contract-valid member of `outcome` (`cost-ledger.md`), so this needs no new
 * shape anywhere.
 */
export function deriveShipOutcome({ markers, verifyVerdict, regressVerdict }) {
  if (!Array.isArray(markers) || markers.length === 0) return null;
  const app = verdictApplicability(markers);
  if (app.status === APPLICABILITY.UNKNOWN) {
    return { decision: UNDETERMINED, iterations: null, source: OUTCOME_SOURCE };
  }
  // Every fact below comes from the CURRENT run only — an earlier invocation's stages are not this run's.
  const current = currentRunMarkers(markers);
  // Quick mode (6.23.0): verify PASS alone reaches the gate — the regression verdict is NEVER consulted,
  // so a `regression-report.json` left on disk by an earlier (or the base) run cannot manufacture `gate2`.
  const reachedGate2 =
    app.status === APPLICABILITY.CURRENT &&
    verifyVerdict === VERIFY_PROCEED &&
    (app.mode === "quick" || regressVerdict === REGRESS_PROCEED);
  const decision = reachedGate2 ? (app.mode === "quick" ? GATE2_QUICK : GATE2) : `${STOP_PREFIX}${lastStartedStage(current)}`;
  return {
    decision,
    iterations: recordedIterations(current),
    source: OUTCOME_SOURCE,
  };
}

/**
 * Do the verdict report(s) on disk belong to THIS run's latest attempt? Read from the recorded markers
 * only — never from the reports' mtimes or contents ([[L42]], [[L6]]).
 *
 *  - `unknown`    — the run window cannot be established (`runWindow(markers, null)` is `unknown`).
 *  - `current`    — the current run carries a `stage-start` for EVERY member of its stage set
 *                   (`verdictStages(mode)` — `VERDICT_STAGES` full, `QUICK_VERDICT_STAGES` quick) at the
 *                   run's LATEST recorded iteration (a run with no iterations: null == null).
 *  - `not-in-run` — otherwise: the reports were produced by an earlier invocation, or by an earlier
 *                   attempt that a later iteration has superseded.
 *
 * Returns `{status, reason, latestIteration, mode, stages}`. `mode` and `stages` (6.23.0) are computed from
 * the markers regardless of window status, so a caller can label a report even under `unknown`. PURE. See
 * the header for the residual this cannot see.
 */
export function verdictApplicability(markers) {
  const mode = runMode(markers);
  const stages = verdictStages(mode);
  const win = runWindow(markers, null);
  if (win.status === "unknown") return { status: APPLICABILITY.UNKNOWN, reason: win.reason, latestIteration: null, mode, stages };
  const current = currentRunMarkers(markers) ?? [];
  const latestIteration = recordedIterations(current);
  const missing = stages.filter(
    (stage) =>
      !current.some(
        (m) => m?.kind === "stage-start" && m.stage === stage && (Number.isInteger(m.iteration) ? m.iteration : null) === latestIteration
      )
  );
  if (missing.length === 0) return { status: APPLICABILITY.CURRENT, reason: null, latestIteration, mode, stages };
  return {
    status: APPLICABILITY.NOT_IN_RUN,
    reason: `the current run has no stage-start for ${missing.join(" and ")}${latestIteration === null ? "" : ` at its latest iteration (${latestIteration})`}`,
    latestIteration,
    mode,
    stages,
  };
}

/**
 * Read the two verdict reports out of a feature directory and derive. The one I/O entry point, kept
 * separate from the pure function above so the suite can exercise the decision table without a
 * filesystem.
 */
export function readShipOutcome(featureDir, markers) {
  return deriveShipOutcome({
    markers,
    verifyVerdict: readVerdict(join(featureDir, "verify-report.json")),
    regressVerdict: readVerdict(join(featureDir, "regression-report.json")),
  });
}
