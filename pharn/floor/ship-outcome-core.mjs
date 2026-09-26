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
//   membership over them. It NEVER re-computes a verdict and never overrides one. `gate2-quick` (6.25.0,
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
// iterates it and additionally holds `SHIP_DECISION_RE` as a CLOSURE over the emitted stem, so a form
// outside the vocabulary fails rather than merely going untested.
//
// ── APPLICABILITY — the verdicts must belong to THIS run (added 6.9.1; tightened 6.25.0) ─────────────
// Until 6.9.1 `gate2` needed only "markers exist" + two green `.verdict`s read from the feature
// directory, and nothing bound either report to the run being reported. REACHED THROUGH SUPPORTED USE,
// not a probe of the pure function: `/pharn-spec` resumes an existing `<name>` (its Step 1.1, an
// instruction), so a second `/pharn-ship` on the same feature appends a new `run-start`, STOPs at grill,
// and the PREVIOUS run's green reports — still on disk, since no code invalidates them — derived
// `gate2`. Now the verdicts count only when `verdictApplicability()` says `current`: the CURRENT run
// (`run-window-core.mjs`'s `currentRunMarkers`, the one definition) carries a `stage-start` for EVERY
// member of its stage set (`verdictStages(mode)` — `pharn-regress` and `pharn-verify` in a full run,
// `pharn-verify` alone in a quick one) at the run's LATEST recorded iteration, so a new invocation's run
// cannot inherit an old pair, and a Step 2b retry that started iteration 2 cannot inherit iteration 1's.
// TWO MORE CONDITIONS since 6.25.0 (GATE-2 review finding F1: a quick run whose run-start was SKIPPED,
// after an earlier run that never wrote its run-stop, derived `gate2` from that earlier run's regress
// stage-start and report — iteration numbers restart at 1 in every run, so the earlier `pharn-regress@1`
// completed the pair for this run's `pharn-verify@1`):
//   (a) ORDER — a verdict stage-start counts only when it FOLLOWS (by `seq`) the latest `pharn-build`
//       stage-start of the same iteration in the current run. With no such build there is no build for a
//       verdict to be about, and the reports are not current.
//   (b) NO REPEAT — a stage other than a verdict stage started twice at one iteration in the current run
//       means two invocations' markers ran together (a skipped run-start), so the run's boundary is not
//       established: `unknown`, hence `undetermined`, never a verdict. A VERDICT stage is exempt because
//       `/pharn-loop`'s freshness re-run legitimately starts `pharn-verify` / `pharn-regress` again inside
//       one iteration, and a loop ledger with no `LOOP.md` falls through to this derivation; `/pharn-ship`
//       itself starts every (stage, iteration) at most once.
// When the run window itself is `unknown` the outcome is `undetermined` — neither a failed check nor an
// invented stop stage.
// STRENGTH, stated: exact RELATIVE TO THE RECORDED MARKERS (enum + ordering), and the markers are
//   ADVISORY (Bash-written command prose, L19). It never uses a file's mtime or its mere existence ([[L42]]).
// THE RESIDUAL, at its true width: a marker proves a stage STARTED in this attempt, never that it
//   REWROTE its report. A `/pharn-verify` that writes its stage-start and then REFUSES before emitting
//   leaves the previous attempt's — or the previous run's — file in place, and this derivation accepts it.
//   That applies to EVERY attempt, not only the retry (GRILL finding 1), and it is pinned by a test so it
//   stays visible. Closing it needs a report-side run identity (a verify-report contract change) or a
//   lifecycle invalidation in `/pharn-ship` (an orchestration change) — both outside this increment by
//   design.
//   NARROWED for `/pharn-regress` since `stage-regress-script` (6.23.0): `stage-regress.mjs` removes THIS
//   feature's earlier `regression-report.json` in its very first phase ("fresh"), before any step that can
//   fail — so a regress attempt that starts and then REFUSES (a RED spec->plan chain, a scope escape, a
//   missing artifact) has ALREADY deleted the stale file, and this derivation cannot read it as current. The
//   residual survives for regress only in the one case fresh-start removal precedes: a malformed invocation
//   (`unusable`, e.g. a bad argv) refused BEFORE the stale-output removal step, where the exit table states
//   plainly that "an argv refusal removes nothing" (`pharn-contracts/stage-exit.md`). It is UNCHANGED, at its
//   full original width, for `/pharn-verify` (no such early removal exists there) and for a stage that never
//   starts at all (no marker, so `verdictApplicability()` correctly excludes it on that ground instead).
//
// DETERMINISM (P5): no clock, no randomness. Every branch is a membership or grammar test, and the
// terminal fallback is the explicit `unknown` stage token — never a guess, never a silently dropped
// outcome.
//
// ── THE MODE (6.25.0, `/pharn-ship --quick`) ─────────────────────────────────────────────────────────
// The mode is recorded on the run-start marker (`mark-phase.mjs --mode`), never re-derived from the
// SPEC's `spec_kind`: D7 lets a quick SPEC run the full pipeline (a human choice at GATE 1), so the kind
// alone cannot tell a quick RUN from a full one. `runMode()` reads only the CURRENT run's run-start
// (`currentRunMarkers(...)[0]`), by exact equality at read time — an EARLIER run's quick run-start never
// makes the current run quick, and vice versa. `verdictStages()` is the one place the stage SET forks:
// full mode needs both `pharn-regress` and `pharn-verify`; quick mode needs `pharn-verify` alone.
// A SKIPPED OR WRONG MODE MARKER NEVER YIELDS `gate2` — the safe-failure argument for trusting a
// Bash-written marker at all. Re-derived at GATE 2 (review F1), because its first form was probed only with
// the marker's VALUE altered, never with the marker ABSENT:
//   • a quick run-start written WITHOUT `--mode quick` reads as full; the run starts no `/pharn-regress`, so
//     the regress stage-start `gate2` needs is missing and the outcome is `stop:pharn-verify`;
//   • a quick run whose run-start was SKIPPED joins the previous run's window, and the outcome is
//     `undetermined` or `stop:<stage>` — which one depends on what that run left, never `gate2`. After a
//     closed run, its first stage marker follows a run-stop (run-window-core's rule: `unknown`, so
//     `undetermined`). After an unclosed one that started any of `pharn-plan` / `pharn-grill` / `pharn-test`
//     / `pharn-build`, this run's own stage-starts repeat it (condition (b): `undetermined`). After an
//     unclosed one that started NONE of them — a `/pharn-loop` interrupted during `/pharn-spec` leaves only
//     `[run-start, stage-start pharn-spec]`, and `/pharn-ship` never marks `pharn-spec` — nothing repeats,
//     the joined run takes that run-start's mode (full: a loop writes no `--mode`), and with no
//     `pharn-regress` stage-start after this build the outcome is `stop:pharn-verify` (GATE-2 re-review N1,
//     pinned by a test). A regress stage-start the earlier run wrote before this run's build never counts
//     (condition (a));
//   • a full run whose run-start wrongly carries `mode: "quick"` yields `gate2-quick` at most, which claims
//     no regression verdict — never the stronger `gate2` a full run's own regress stage would have earned.
// TWO BOUNDS, stated rather than closed: (1) all of the above is relative to the markers the command
// PRESCRIBES — a run that skips its stage-starts as well as its run-start is not covered (markers are
// advisory, L19); (2) an earlier run that left NOTHING but its run-start (a halt at GATE 1) is
// byte-identical to resuming that same run, so the joined trail is read as one run with THAT run-start's
// mode — `stop:pharn-verify` after a full one, `gate2-quick` after a quick one, never `gate2` — and every
// stage and verdict marker in it is this run's own.

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

/** The ONE stage a `gate2-quick` test reads (6.25.0): a `--quick` run starts no `/pharn-regress` at all, so
 *  requiring it would make `gate2-quick` unreachable by every quick run — never a stage set copied from
 *  VERDICT_STAGES and then pruned by hand. */
export const QUICK_VERDICT_STAGES = Object.freeze(["pharn-verify"]);

/** The stage whose latest same-iteration `stage-start` a verdict `stage-start` must FOLLOW to count (6.25.0,
 *  condition (a) in the header) — the `--stage` token both `/pharn-ship` and `/pharn-loop` write. */
export const BUILD_STAGE = "pharn-build";

/** The `reason` of an `unknown` applicability that condition (b) decides, not the run window (6.25.0). */
export const REPEATED_STAGE_REASON =
  "a stage other than a verdict stage was started twice at one iteration in the current run — the markers may span two invocations whose second run-start was skipped";

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

/** CLOSURE over every `decision` this module can emit. A form outside the vocabulary fails this, which is the
 *  whole point of a closure over a presence set (L36) — the count lives in the suite's closure test, not here. */
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
      "markers exist but the run's boundary cannot be established (the run window is unknown, or — 6.25.0 — the current run starts a non-verdict stage twice at one iteration, which a skipped run-start can leave behind), so no verdict can be bound to this run — not a failed check, not a stop stage",
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
  // Quick mode (6.25.0): verify PASS alone reaches the gate — the regression verdict is NEVER consulted,
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

/** A marker's iteration as the applicability test compares it: the integer, or `null` for none. */
const iterationOf = (m) => (Number.isInteger(m?.iteration) ? m.iteration : null);

/**
 * Condition (b) in the header: does the current run start a stage OTHER than a verdict stage twice at one
 * iteration? `/pharn-ship` starts every (stage, iteration) at most once, so a repeat is what a skipped
 * run-start leaves when two invocations' markers run together. The verdict stages are exempt because
 * `/pharn-loop`'s freshness re-run starts them again inside one iteration, and a loop ledger with no
 * `LOOP.md` reaches this derivation. A stage token is compared as written (a non-string counts as `null`),
 * so a malformed marker can only ADD a repeat — the fail-closed direction.
 */
function repeatsAStage(current) {
  const seen = new Set();
  for (const m of current) {
    if (m?.kind !== "stage-start" || VERDICT_STAGES.includes(m.stage)) continue;
    const key = JSON.stringify([typeof m.stage === "string" ? m.stage : null, iterationOf(m)]);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

/**
 * Do the verdict report(s) on disk belong to THIS run's latest attempt? Read from the recorded markers
 * only — never from the reports' mtimes or contents ([[L42]], [[L6]]).
 *
 *  - `unknown`    — the run window cannot be established (`runWindow(markers, null)` is `unknown`), or
 *                   (6.25.0, condition (b)) the current run starts a non-verdict stage twice at one
 *                   iteration (`REPEATED_STAGE_REASON`).
 *  - `current`    — the current run carries a `stage-start` for EVERY member of its stage set
 *                   (`verdictStages(mode)` — `VERDICT_STAGES` full, `QUICK_VERDICT_STAGES` quick) at the
 *                   run's LATEST recorded iteration (a run with no iterations: null == null), each one
 *                   AFTER (by `seq`) that iteration's latest `pharn-build` stage-start (6.25.0, condition (a)).
 *  - `not-in-run` — otherwise: the reports were produced by an earlier invocation, or by an earlier
 *                   attempt that a later iteration has superseded, or before this run's own build.
 *
 * Returns `{status, reason, latestIteration, mode, stages}`. `mode` and `stages` (6.25.0) are computed from
 * the markers regardless of window status, so a caller can label a report even under `unknown`. PURE. See
 * the header for the residuals this cannot see.
 */
export function verdictApplicability(markers) {
  const mode = runMode(markers);
  const stages = verdictStages(mode);
  const win = runWindow(markers, null);
  if (win.status === "unknown") return { status: APPLICABILITY.UNKNOWN, reason: win.reason, latestIteration: null, mode, stages };
  const current = currentRunMarkers(markers) ?? [];
  if (repeatsAStage(current)) return { status: APPLICABILITY.UNKNOWN, reason: REPEATED_STAGE_REASON, latestIteration: null, mode, stages };
  const latestIteration = recordedIterations(current);
  const at = latestIteration === null ? "" : ` at its latest iteration (${latestIteration})`;
  const startsAtLatest = (stage) =>
    current.filter((m) => m?.kind === "stage-start" && m.stage === stage && iterationOf(m) === latestIteration);
  const builds = startsAtLatest(BUILD_STAGE);
  if (builds.length === 0) {
    return {
      status: APPLICABILITY.NOT_IN_RUN,
      reason: `the current run has no ${BUILD_STAGE} stage-start${at}, so no verdict stage-start can follow this run's own build`,
      latestIteration,
      mode,
      stages,
    };
  }
  const buildSeq = Math.max(...builds.map((m) => m.seq));
  const missing = stages.filter((stage) => !startsAtLatest(stage).some((m) => m.seq > buildSeq));
  if (missing.length === 0) return { status: APPLICABILITY.CURRENT, reason: null, latestIteration, mode, stages };
  return {
    status: APPLICABILITY.NOT_IN_RUN,
    reason: `the current run has no stage-start for ${missing.join(" and ")} after its latest ${BUILD_STAGE} stage-start${at}`,
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
