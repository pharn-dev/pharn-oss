#!/usr/bin/env node
// pharn/floor/stage-regress.mjs — the /pharn-regress STAGE SCRIPT (stage-regress-script, 6.23.0). Every
// deterministic step of the regress stage — argv validation, containment, git, the shelled checkers, the
// budget-and-resume protocol, the atomic artifact writes — lives here, in TESTED CODE, instead of in
// `.claude/commands/pharn-regress.md`'s Bash prose. The command becomes a THIN CALLER: it pins one line,
// branches on this script's EXIT CODE, and relays a `question` verbatim.
//
// ================================ WHY A SCRIPT REPLACES COMMAND PROSE ================================
// A `/pharn-regress` run prescribed one Bash call per gate per side plus ~20 setup/bookkeeping calls, and
// EVERY call is a full model turn re-reading a 36 KB command prompt (`.dev/features/stage-regress-script/PLAN.md`,
// "Why (P7)"). Moving the deterministic steps into one script does not change what is GUARANTEED — the
// same reused checkers (`check-plan-spec-agree.mjs`, `check-regress.mjs`, `run-gates.mjs`) decide the same
// things — it changes WHO executes the orchestration between them: tested code instead of a model re-typing
// git/JSON plumbing every call.
//
// =========================================== THE PROTOCOL ===========================================
// See `pharn/pharn-contracts/stage-exit.md` for the full envelope, exit table and question/answer protocol.
// In short: one `pharn-stage-exit/1` JSON object per exit, on stdout, and the exit CODE tells a caller
// which of {done, refused, question, continue, unusable} to read — never prose, never a re-derivation.
//
// ==================================== THE BUDGET (`--budget-ms`) ====================================
// A slow step (the base-commit INSTALL, or one gate `run --next`) starts only if it is the FIRST slow step
// of THIS invocation, or `elapsed + timeoutMs <= budgetMs` (`stage-exit-core.mjs`'s `mayStartSlowStep`,
// shared with `stage-verify.mjs`), `elapsed` measured from the top of `runFresh`/`runResume`
// (see `stage-runtime.mjs`'s makeBudget: the opening fast work counts). Otherwise the script PERSISTS its
// progress (`.pharn/pharn-regress/stage.json`, `stage-regress-core.mjs`'s `PROGRESS_SCHEMA`) and exits 5
// `continue`. With no `--budget-ms` (a code caller), nothing is budgeted.
//
// ==================================== THE SHARED MECHANICS (6.26.0) ====================================
// The argv rules (`parseTimeoutMs`, `parseBudgetMs`, `parseResumeArgv`, `scanFlags`), the `lstat` containment
// walk, the atomic write, the git helpers, the budget tracker and the drain loop moved into
// `pharn/floor/stage-runtime.mjs` (stage-verify-script, GATE 1 Q1), their ONE owner, so `stage-verify.mjs` does
// not copy the rules 6.23.0's review repaired one by one. They were extracted to RETURN results; this script keeps
// its own emit wrappers, reason codes and detail wording, and that extraction left its CLI behaviour — every detail
// text, the phase order, the drain's exit-3 idempotent repeat — unchanged (6.26.0's unchanged `stage-regress.test.mjs`
// was that evidence). ONE deliberate change, from the GATE 2 fix: the stale-output removal goes through the shared
// `removeIfPresent`, so an unlink that fails for any reason other than absence is now a crash instead of a
// swallowed error (the follow-up `regress-stale-unlink-swallow`, closed; `stage-runtime.test.mjs` holds it). Since
// 6.28.3 (stage-git-maxbuffer) each `git-failed` detail ends with `gitSync`'s failure cause, and git output up to
// 256 MiB is read (stage-runtime.mjs's git helpers).
//
// ==================================== PHASES, IN ORDER (GRILL G1) ====================================
// fresh -> chain -> base -> partition -> head-init -> drain-head -> worktree -> install -> base-init ->
// drain-base -> verdict -> cleanup -> render (`stage-regress-core.mjs` PHASES — the ONE owner of this
// order). "fresh" REMOVES this feature's earlier `regression-report.json`/`REGRESSION.md` BEFORE any step
// that can fail, so a stage that stops before its verdict leaves no earlier verdict on disk; an argv
// refusal (before containment passes) removes nothing, and a removal that FAILS (anything but ENOENT) is a
// crash — never a later refusal over a report that is still there.
//
// ==================================== BASE-EVIDENCE REUSE (6.33.0) ====================================
// Once the HEAD side is finalized, `regress-base-reuse.mjs` decides whether an earlier invocation of the SAME
// `/pharn-loop` or `/pharn-ship` run already produced the BASE evidence this one needs (`regress-base-reuse-core.mjs`
// holds the rule and says what the requirement is). On a HIT the phases worktree -> install -> base-init -> drain-base
// are skipped, and so is cleanup: the retained `base-gates/` stamp goes straight to the unchanged `check-regress.mjs
// verdict`. On a MISS they run exactly as before. So the fresh start clears the scratch EXCEPT `base-gates/`; a persisted
// HIT is re-decided in full at "verdict" (never trusted from the progress record); after a verdict over base evidence
// this chain produced, the stage publishes a reuse record, but only one the predicate accepts. The report gains the
// additive `base_evidence` block (pharn/pharn-contracts/regression-report.md). The verdict itself is always the
// checker's over the stamps on disk.
//
// ==================================== ENTRY-DERIVED BASE EVIDENCE (6.49.0) ====================================
// When the retained decision above MISSES, `entry-base-evidence.mjs` decides whether THIS delivery run's validated entry
// execution (entry-gates.mjs, offered through the git dir) is exactly the BASE evidence this invocation needs
// (`entry-base-evidence-core.mjs` holds the rule and every bound). On a HIT the phases worktree -> install -> base-init
// -> drain-base are skipped, and so is cleanup. At "verdict" the HIT is RE-DECIDED in full from the offer and the entry
// source (never trusted from stage.json), and only then is the entry-derived `regress/base` stamp written into
// `base-gates/` — runs `ran: false` with a `reused` block naming the entry stamp, logs copied and verified — for the
// unchanged `check-regress.mjs verdict`. A changed source, or a copy that does not verify, is a MISS: the BASE side then
// runs exactly as before. No retained record is published over entry-derived evidence. The report's `base_evidence`
// gains `source` (fresh | reused | entry) and `entry`.
//
// ==================================== THE HEAD OFFER (6.34.0) ====================================
// /pharn-verify may record a gate result from a completed HEAD execution of THIS delivery run instead of spawning the
// gate again (gate-reuse-core.mjs). It does so only through the OFFER this stage keeps in the git dir
// (head-reuse-offer.mjs): the fresh start DISCARDS it (with the scratch, before the HEAD side runs), and the drain-head
// phase PUBLISHES one once the HEAD stamp is finalized, bound to the stamp's bytes and the open run marker. Nothing this
// stage decides reads the offer, so a failure to publish is only a lost reuse — reported on stderr, never a refusal.
//
// ============================== NO ABSOLUTE PATH TO A CHILD OR A RENDER (GRILL G10) ==============================
// Every path this script hands to a shelled checker, to git, or to `render-regression.mjs` is
// REPO-RELATIVE. `/pharn-loop` commits `REGRESSION.md`, and a child's refusal text can quote whatever path
// it was handed — so nothing here ever resolves a path to an absolute one before using it.
// ONE EXCEPTION, NARROWED (regress-base-integrity, 6.50.x): the BASE checkout lives in the temp root, outside the
// project (base-worktree.mjs says why), so its path is absolute. It reaches git (`worktree add/remove`) and run-gates.mjs
// (`--cwd`, which the finalized stamp drops) as an argv element, never `render-regression.mjs`: a git error that quotes it
// is redacted to `<base worktree>` before the cleanup line renders, and the `unusable` detail of a failed `add` is
// redacted the same way. A `child-refused` detail from base-init can still quote it — stdout only, never a render.
//
// THE BASE IS RECORDED (regress-base-integrity): `base_source` (stage-regress-core.mjs BASE_SOURCES) travels in the
// progress record, the report and every render after the base phase. Two refusals guard the evidence itself:
// `no-change-under-test` (partition: nothing but exempt paths changed since the base — a base that collapsed onto HEAD)
// and `base-install-unreliable` (after the verdict: a base produced here with a skipped or failed install, and a gate
// red on both sides). A third, `plan-files-total-glob`, refuses a `## Files` entry that declares everything.
//
// TRUST (P2): the `## Files` text of PLAN.md/AC-TESTS.md is untrusted and becomes ONLY declared glob
// patterns; SPEC.md is hashed by the shelled checker and never read here; git paths are attacker-nameable
// strings that travel as argv elements (never shell text) and are rendered only fenced. A `--gates`/
// `--install` value is the human's own shell text, exactly as it is today. Child stdout is parsed as JSON
// and only enums/ints branch; free text is quoted through `dataText`/`quoteData` (`quote-core.mjs`).
//
// Usage:
//   node pharn/floor/stage-regress.mjs --feature <name> --timeout-ms <N> [--budget-ms <B>] [--base <ref>]
//        [--gates "<cmd>[::<id>],…"] [--install "<cmd>" | --no-install] [--tests "<pathspec>,…" | --no-tests]
//   node pharn/floor/stage-regress.mjs --resume [--budget-ms <B>]
//
// Exit: 0 done · 2 unusable · 3 refused · 4 question · 5 continue · anything else (1 included) = CRASHED.

import "./runtime-floor.mjs";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { doneExit, refusedExit, unusableExit, continueExit, questionExit, EXIT_CODE } from "./stage-exit-core.mjs";
import {
  flag,
  has,
  scanFlags,
  parseTimeoutMs,
  parseBudgetMs,
  parseResumeArgv,
  lstatSafe,
  containmentWalk,
  removeIfPresent,
  atomicWrite,
  gitSync,
  nulList,
  makeBudget,
  drainGates,
} from "./stage-runtime.mjs";
import {
  REGRESS_PATHS,
  LOCKFILE_FAMILIES,
  shouldSkipStyle,
  resolveInstall,
  resolveBaseSource,
  unreliableInstallMasking,
  baseInstallNeeded,
  PROGRESS_SCHEMA,
  validateProgress,
} from "./stage-regress-core.mjs";
import { clearBaseWorktrees, createBaseDir, isOurBaseDir, redact } from "./base-worktree.mjs";
import { readInstallCheck, recordInstallCheck, readRecordedInstallCheck, refuses } from "./install-drift.mjs";
import { detailText } from "./install-drift-core.mjs";
import { renderDone, renderRefused } from "./render-regression.mjs";
import { shelledVerdict } from "./shelled-verdict-core.mjs";
import { spawnGate } from "./run-gates.mjs";
import { declaredWrites, changedPaths } from "./scope-inputs.mjs";
// 6.49.0 — the default test universe's one owner (the entry check's base:test slot lists with it too).
import { defaultTestUniverse } from "./scope-inputs.mjs";
import { partitionScope, scopeFindings, normPath, changedUnderTest } from "./check-regress.mjs";
import { preRunUnchanged, entryChangesUnchanged } from "./pre-run-snapshot.mjs";
import { entryBlocks } from "./pre-run-snapshot-core.mjs";
import { FEATURE_SLUG_RE, SCHEMA as GATE_RUN_SCHEMA, actualForExpected } from "./gate-run-core.mjs";
import { isExcluded, ALGO as FINGERPRINT_ALGO } from "./worktree-fingerprint.mjs";
import { decideFromDisk, discardRetained, publishRecord } from "./regress-base-reuse.mjs";
import { discardOffer, publishOffer } from "./head-reuse-offer.mjs";
import { decideEntryFromDisk, materializeEntryBase } from "./entry-base-evidence.mjs";
import { entryEvidenceBlock } from "./entry-base-evidence-core.mjs";
import { regressWork, recordWork } from "./stage-work.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_PLAN_SPEC_AGREE = join(HERE, "check-plan-spec-agree.mjs");
const CHECK_REGRESS = join(HERE, "check-regress.mjs");
const RUN_GATES = join(HERE, "run-gates.mjs");

const FEATURES_DIR = "pharn/features";
const STATE_ROOT = ".pharn";
const SHA_RE = /^[0-9a-f]{40}$/;

/** ------------------------------------------------------------------------------------------------
 *  Emit + exit. ONE JSON document, then end. Exit 1 is DELIBERATELY never chosen here (see the header) —
 *  a genuine crash (an uncaught throw, a failed module load) reaches node's own exit 1 with NO document.
 *  ---------------------------------------------------------------------------------------------- */
const EMITTED = Symbol("stage-regress: emitted");
function emit(obj) {
  console.log(JSON.stringify(obj, null, 2));
  process.exitCode = EXIT_CODE[obj.status];
  throw EMITTED;
}

function emitUnusable(feature, reasonCode, detail) {
  emit(unusableExit({ stage: "regress", feature, reasonCode, detail }));
}
function emitQuestion(feature, reasonCode, resumeArgv) {
  emit(questionExit({ stage: "regress", feature, reasonCode, resumeArgv }));
}
function emitContinue(feature, phase, resumeArgv) {
  emit(continueExit({ stage: "regress", feature, phase, resumeArgv }));
}

/** A2 (GATE 2 review) — drop EVERY `name <value>` pair from `args`, used ONLY when building a
 *  `tests-unresolved` question's `resume.argv`: the original invocation's own `--tests` is exactly what
 *  did not resolve, so it must not survive into the answer round trip — appending `--no-tests` to a
 *  `resume.argv` that still carried the old `--tests` hit the mutual-exclusivity refusal, and appending a
 *  corrected `--tests <value>` hit `flag()`'s first-occurrence-wins rule and never took effect. */
function stripFlagPair(args, name) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name) {
      i++; // also drop its value token
      continue;
    }
    out.push(args[i]);
  }
  return out;
}

/** ------------------------------------------------------------------------------------------------
 *  CONTAINMENT (GRILL G54/L54) — the `lstat` walk itself (`containmentWalk`, `lstatSafe`) lives in
 *  `stage-runtime.mjs`, its one owner; THIS stage's list of paths to walk, and its reason code, stay here.
 *  ---------------------------------------------------------------------------------------------- */

/** A4 (GATE 2 review) — the SAME `lstat` walk `phaseFreshEarly` runs on a fresh invocation, factored out
 *  so `runResume` can re-run it too, WITHOUT any removal. Before this fix, `--resume` read the progress
 *  record and went straight to writing through it: a feature directory swapped for a symlink between the
 *  fresh invocation and a later `--resume` was written THROUGH, unlike the fresh path's own refusal. */
function containmentGuard(feature) {
  const cwd = process.cwd();
  for (const rel of [STATE_ROOT, REGRESS_PATHS.root, `${FEATURES_DIR}/${feature}`]) {
    const c = containmentWalk(cwd, join(cwd, rel));
    if (!c.ok) emitUnusable(feature, "path-containment", `${rel}: ${c.reason}`);
  }
}

/** ------------------------------------------------------------------------------------------------
 *  Atomic writes into a feature directory: a tmp sibling under the state root, then rename — so no stray
 *  tmp file ever lands in the feature directory itself (`stage-runtime.mjs`'s `atomicWrite`).
 *  ---------------------------------------------------------------------------------------------- */
function atomicWriteIntoFeature(relPath, bytes) {
  atomicWrite(REGRESS_PATHS.root, relPath, bytes);
}

/** ------------------------------------------------------------------------------------------------
 *  The base worktree's ONE clearing rule (A3 and N7, GATE-2 round 2), run by the fresh start AND by the
 *  "worktree" phase before every `add`. `--force` is passed TWICE because a leftover can be LOCKED, and a
 *  single `--force` refuses a locked worktree ("use 'remove -f -f' to override", measured):
 *    • git itself locks a worktree "initializing" while `git worktree add` checks it out, so a hard kill
 *      mid-add leaves it locked and half-populated (measured, with a slow smudge filter);
 *    • GRILL G4's own scenario is a worktree someone locked on purpose.
 *  Before this rule the fresh start's single `--force` failed on such a leftover, then its `rm -rf` of the
 *  scratch root deleted the directory under a registration that stayed LOCKED — which `git worktree prune`
 *  does not clear — so the next plain `add` failed ("use 'add -f -f' to override"), measured. The
 *  directory is then removed outright (an unregistered leftover), and `prune` clears any unlocked
 *  registration whose directory is gone. Every step is best-effort: an absent worktree is the normal case.
 *  The path is this stage's own scratch, never a user worktree, and containment has already been walked
 *  over `.pharn` and `.pharn/pharn-regress` (a symlink at `base` itself is removed as a link, never
 *  followed).
 *
 *  SINCE regress-base-integrity (6.50.x) the checkout lives in the TEMP ROOT, outside the project (base-worktree.mjs, its
 *  one owner, says why: the nested one resolved the HEAD tree's `node_modules`/.bin). The same double-force rule now runs
 *  over every base checkout of THIS project there (registered or not; a link is unlinked, never followed; a foreign entry
 *  is left alone), and over the legacy nested path as an upgrade leftover. */
function clearBaseWorktree() {
  clearBaseWorktrees(projectReal(), REGRESS_PATHS.legacyBase);
}

/** The invoking project's realpath — the key base-worktree.mjs binds a checkout name to. Every pinned caller runs from the
 *  project root. */
function projectReal() {
  return realpathSync(process.cwd());
}

/** ------------------------------------------------------------------------------------------------
 *  The comma/newline list grammar `check-regress.mjs` parses (GRILL "unrepresentable-path"): a path
 *  containing a comma or a newline cannot be represented in that grammar and must be REFUSED, never
 *  mangled or silently split. Since 6.28.0 no DECISION reads that grammar — the partition runs in-process
 *  (phase 4) — and the one list left is the verdict call's `--inside` echo, the report's ADVISORY `inside`
 *  field (`regression-report.md`). So this now guards only the changed paths that echo carries: the named
 *  residual `regress-inside-echo-list`, which a comma or newline name still meets as this refusal.
 *  The same residual has a SIZE limit too (stage-git-maxbuffer, 6.28.3 — probed, not built): the echo is ONE argv
 *  element, and a single 1,100,000-byte argument fails E2BIG on darwin (measured; ARG_MAX 1,048,576 for argv and the
 *  environment together). Linux caps one argument at 131,072 bytes, its documented MAX_ARG_STRLEN — not measured
 *  here. With the git ceiling raised, a run whose changed paths total past that limit passed its partition and head
 *  gates in the probe, then stopped at "verdict" as `unusable child-crashed`, with no cause in its detail. The remedy
 *  the follow-up already names, an array-safe verdict input in place of this list, removes both limits.
 *  ---------------------------------------------------------------------------------------------- */
function assertRepresentable(paths, feature) {
  for (const p of paths) {
    if (p.includes(",") || p.includes("\n") || p.includes("\r")) {
      emitUnusable(
        feature,
        "unrepresentable-path",
        `path ${JSON.stringify(p)} contains a comma or newline, which check-regress.mjs's list grammar cannot represent`
      );
    }
  }
}

/** ------------------------------------------------------------------------------------------------
 *  ARGV VALIDATION, split in two (F2, GATE 2 review). `extractFeature` reads and shape-checks ONLY
 *  `--feature`, so the fresh phase's containment walk and stale-report removal (below) can run — and
 *  discharge "no earlier verdict survives" — before ANY other flag is validated. Every other usage-error
 *  (`--timeout-ms`, `--budget-ms`, the mutual-exclusivity pairs, …) is now raised strictly AFTER that
 *  point, so it can no longer strand a previous run's report on disk. The exact residual, narrowed rather
 *  than removed: a stop before `--feature` parses as a valid slug (or the containment walk itself, i.e.
 *  `path-containment`) removes nothing; so does a genuine crash.
 *  ---------------------------------------------------------------------------------------------- */
function extractFeature(args) {
  const feature = flag(args, "--feature");
  if (!feature || !FEATURE_SLUG_RE.test(feature)) {
    emitUnusable(null, "usage-error", `--feature must be a plain slug matching ${FEATURE_SLUG_RE}, got ${JSON.stringify(feature)}`);
  }
  return feature;
}

function parseRestOfArgv(args, feature) {
  const known = new Set([
    "--feature",
    "--timeout-ms",
    "--budget-ms",
    "--base",
    "--gates",
    "--install",
    "--no-install",
    "--tests",
    "--no-tests",
  ]);
  const valueFlags = new Set(["--feature", "--timeout-ms", "--budget-ms", "--base", "--gates", "--install", "--tests"]);
  const scan = scanFlags(args, known, valueFlags);
  if (!scan.ok) emitUnusable(feature, "usage-error", scan.detail);

  // M7(a) and M7(b) — the shared rules (`stage-runtime.mjs`): `--timeout-ms` is `run --next`'s own 3-9 digit
  // rule, and a TRAILING `--budget-ms` with no value is refused, never read as "unbudgeted".
  const timeout = parseTimeoutMs(args);
  if (!timeout.ok) emitUnusable(feature, "usage-error", timeout.detail);
  const timeoutMs = timeout.value;

  const budget = parseBudgetMs(args);
  if (!budget.ok) emitUnusable(feature, "usage-error", budget.detail);
  const budgetMs = budget.value;

  if (has(args, "--install") && has(args, "--no-install")) {
    emitUnusable(feature, "usage-error", "--install and --no-install are mutually exclusive");
  }
  if (has(args, "--tests") && has(args, "--no-tests")) {
    emitUnusable(feature, "usage-error", "--tests and --no-tests are mutually exclusive");
  }
  const explicitInstall = flag(args, "--install") ?? null;
  if (has(args, "--install") && (!explicitInstall || explicitInstall.startsWith("-"))) {
    emitUnusable(feature, "usage-error", "--install requires a non-empty value that does not begin with '-'");
  }
  const explicitTests = flag(args, "--tests") ?? null;
  if (has(args, "--tests") && (!explicitTests || explicitTests.startsWith("-"))) {
    emitUnusable(feature, "usage-error", "--tests requires a non-empty value that does not begin with '-'");
  }
  const explicitBase = flag(args, "--base") ?? null;
  if (has(args, "--base") && (!explicitBase || explicitBase.startsWith("-"))) {
    emitUnusable(feature, "usage-error", "--base requires a non-empty value that does not begin with '-'");
  }
  const gatesSpec = flag(args, "--gates") ?? null;
  if (has(args, "--gates") && (!gatesSpec || gatesSpec.length === 0)) {
    emitUnusable(feature, "usage-error", "--gates requires a non-empty value");
  }

  return {
    feature,
    timeoutMs,
    budgetMs,
    explicitBase,
    gatesSpec,
    noInstall: has(args, "--no-install"),
    explicitInstall,
    // 6.49.0 — an explicit install choice is a BASE environment entry evidence never sampled (entry-base-evidence-core).
    installOverride: has(args, "--install") || has(args, "--no-install"),
    noTests: has(args, "--no-tests"),
    explicitTests,
    originalArgv: [...args],
  };
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 1a — fresh (EARLY, F2/A4): containment, then stale-output removal (GRILL G1). Runs right after
 *  `extractFeature`, BEFORE any other argv flag is validated — the earliest point at which it is SAFE to
 *  do so (the slug is known and the paths below are proven symlink-free).
 *  ---------------------------------------------------------------------------------------------- */
function phaseFreshEarly(feature) {
  containmentGuard(feature);

  // Stale-output removal, as early as it is now safe to do so (GRILL G1, narrowed by F2). ONLY `ENOENT` is
  // absence (`stage-runtime.mjs`'s `removeIfPresent`, since the 6.26.0 GATE 2 fix): any other unlink error
  // propagates to the top-level catch — a crash, exit 1 with no document — so no refusal and no `unusable` can
  // follow a removal that did not happen. Before, a catch-all swallowed it and an unremovable earlier report
  // survived beside the later stop (the follow-up `regress-stale-unlink-swallow`, closed by this line).
  for (const rel of [`${FEATURES_DIR}/${feature}/regression-report.json`, `${FEATURES_DIR}/${feature}/REGRESSION.md`]) {
    removeIfPresent(rel);
  }
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 1b — fresh (LATE): leftover-worktree / scratch cleanup, then feature-dir/PLAN/SPEC existence
 *  checks. Runs AFTER the rest of argv has been validated (parseRestOfArgv) — everything here CAN fail
 *  without having falsified "no earlier verdict survives", which phaseFreshEarly already discharged.
 *  ---------------------------------------------------------------------------------------------- */
/** Clear the stage's scratch, KEEPING a retained `base-gates/` directory (6.33.0): whether it can be reused is decided
 *  after the HEAD side runs, and a miss discards it then (regress-base-reuse.mjs `discardRetained`). Anything else at
 *  that name — a file, a link — is removed like the rest; a link is removed, never followed. */
function clearScratchKeepingBaseEvidence() {
  const root = REGRESS_PATHS.root;
  const st = lstatSafe(root);
  if (st.ok && st.stat !== null && st.stat.isDirectory()) {
    const keep = basename(REGRESS_PATHS.baseGates);
    for (const name of readdirSync(root)) {
      if (name === keep) {
        const k = lstatSafe(join(root, name));
        if (k.ok && k.stat !== null && k.stat.isDirectory()) continue;
      }
      rmSync(join(root, name), { recursive: true, force: true });
    }
  } else {
    rmSync(root, { recursive: true, force: true });
  }
  mkdirSync(root, { recursive: true });
}

function phaseFreshLate(cfg) {
  // A leftover base worktree — locked or not — is cleared (clearBaseWorktree); then the scratch directory
  // is cleared, all but a retained `base-gates/` (clearScratchKeepingBaseEvidence). One run per worktree at a
  // time (GRILL G14) — a second fresh start destroys the first run's in-progress record, matching run-gates.mjs
  // init's own recreate of <out>.
  clearBaseWorktree();
  clearScratchKeepingBaseEvidence();
  // 6.34.0 — no offer may name a HEAD stamp this run is about to replace. A failure is reported, never a crash: reuse
  // is an optimisation, and a stale offer binds only a byte-identical stamp (head-reuse-offer.mjs).
  if (!discardOffer().ok) console.error("stage-regress: note — the previous HEAD offer could not be removed from the git dir");

  if (!existsSync(`${FEATURES_DIR}/${cfg.feature}`)) {
    emitUnusable(cfg.feature, "no-feature", `no such feature directory: ${FEATURES_DIR}/${cfg.feature}`);
  }
  const planPath = `${FEATURES_DIR}/${cfg.feature}/PLAN.md`;
  const specPath = `${FEATURES_DIR}/${cfg.feature}/SPEC.md`;
  const missing = [planPath, specPath].filter((p) => !existsSync(p));
  if (missing.length) {
    writeRefusedAndEmit(cfg.feature, "missing-artifact", `missing required artifact(s): ${missing.join(", ")}`);
  }
  return { planPath, specPath };
}

/** `baseInfo` (regress-base-integrity): `{base, baseSource}` once the base phase has resolved one, so every refusal after
 *  it names the commit it compared against and how that commit was chosen. */
function writeRefusedAndEmit(feature, reasonCode, detail, preRun = null, entryGates = null, baseInfo = null, cleanupResult = null) {
  const md = renderRefused({ feature, reasonCode, detail, preRun, entryGates, baseInfo, cleanupResult });
  const renderPath = `${FEATURES_DIR}/${feature}/REGRESSION.md`;
  atomicWriteIntoFeature(renderPath, md);
  emit(refusedExit({ stage: "regress", feature, reasonCode, render: renderPath }));
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 2 — chain: reuse check-plan-spec-agree.mjs, read through shelledVerdict.
 *  ---------------------------------------------------------------------------------------------- */
function phaseChain(cfg, planPath, specPath) {
  const r = spawnSync(process.execPath, [CHECK_PLAN_SPEC_AGREE, planPath, specPath], { encoding: "utf8" });
  const v = shelledVerdict(r);
  if (v === "green") return;
  if (v === "red") {
    writeRefusedAndEmit(cfg.feature, "chain-red", (r.stdout || "").trim() || "check-plan-spec-agree.mjs reported RED with no message");
  }
  emitUnusable(
    cfg.feature,
    "child-crashed",
    `check-plan-spec-agree.mjs crashed (status ${r.status ?? "null"}) — the spec->plan chain could not be checked`
  );
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 3 — base (BASE_RULE): explicit --base wins; else a dirty tree resolves to HEAD; else
 *  merge-base; else ask. The chosen SOURCE is turned into the resolved 40-hex SHA here (git, never the
 *  pure core).
 *  ---------------------------------------------------------------------------------------------- */
// A porcelain line's path, stripped of the two status columns and the separating space. NOT a full
// C-quote/rename-arrow parser (render-run-report.mjs's `parsePorcelain` is that, and importing it here
// would pull that file's whole load graph in for a one-line "is this dirty path our own scratch" test —
// G6's reasoning again). NAMED BOUND: an unusual path (one containing `->`, or one git C-quotes) can be
// mis-sliced, which can only make `dirty` MORE likely to be true than it should — never the reverse — so
// the worst case is choosing `HEAD` as the base where `merge-base` would have been chosen. In THIS repo
// `.pharn/` is git-ignored, so `git status --porcelain` never lists it at all; the filter below matters
// only for an install that does not ignore it (GRILL G2's own scenario).
function porcelainPath(line) {
  return line.slice(3).trim();
}

// Returns `{base, baseSource}` — the 40-hex SHA and the BASE_SOURCES member that chose it (regress-base-integrity).
function phaseBase(cfg) {
  if (cfg.explicitBase !== null) {
    const r = gitSync(["rev-parse", "--verify", "--quiet", `${cfg.explicitBase}^{commit}`]);
    if (!r.ok || !SHA_RE.test(r.stdout.trim())) {
      emitUnusable(cfg.feature, "usage-error", `--base ${JSON.stringify(cfg.explicitBase)} does not resolve to a commit`);
    }
    return { base: r.stdout.trim(), baseSource: "explicit" };
  }
  const porcelain = gitSync(["status", "--porcelain"]);
  if (!porcelain.ok) emitUnusable(cfg.feature, "git-failed", `git status failed: ${porcelain.detail}`);
  const workingTreeDirty = porcelain.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => !isExcluded(porcelainPath(line), null)); // the state root is never a "dirty tree" signal (GRILL G2)

  const mb = gitSync(["merge-base", "HEAD", "origin/main"]);
  const hasMergeBase = mb.ok && SHA_RE.test(mb.stdout.trim());

  const source = resolveBaseSource({ workingTreeDirty, hasMergeBase });
  if (source.kind === "dirty-head") {
    const head = gitSync(["rev-parse", "HEAD"]);
    if (!head.ok || !SHA_RE.test(head.stdout.trim())) {
      emitUnusable(cfg.feature, "git-failed", "git rev-parse HEAD failed" + (head.ok ? "" : `: ${head.detail}`));
    }
    return { base: head.stdout.trim(), baseSource: "dirty-head" };
  }
  if (source.kind === "merge-base") return { base: mb.stdout.trim(), baseSource: "merge-base" };
  emitQuestion(cfg.feature, "base-unresolved", cfg.originalArgv);
  return undefined; // unreachable — emitQuestion throws
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 4 — partition: build the four inputs, apply `check-regress.mjs`'s scope rule to them.
 *  ---------------------------------------------------------------------------------------------- */
// The declared and changed sets come from `scope-inputs.mjs` (6.28.0, loop-quick-mode GATE 2): the ONE owner this phase
// and `quick-scope-core.mjs` — the checker behind the quick modes' scope check — both call (L35). That move kept this
// phase's own refusals and every detail string byte for byte; since 6.28.3 (stage-git-maxbuffer) each `git-failed`
// detail ends with git's failure cause (`.detail`, stage-runtime.mjs's `gitFailureDetail`) instead of raw stderr.
function readPlanDeclared(cfg, planPath, specPath) {
  void specPath;
  const planText = readFileSync(planPath, "utf8");
  const declared = declaredWrites(planText, `${FEATURES_DIR}/${cfg.feature}/AC-TESTS.md`);
  if (!declared.ok) {
    writeRefusedAndEmit(cfg.feature, "plan-files-unparseable", `${planPath}: ${declared.reason}`, null, null, cfg.baseInfo);
  }
  return declared.value;
}

function computeInside(cfg, base) {
  const inside = changedPaths(base);
  if (!inside.ok && inside.which === "diff") {
    emitUnusable(cfg.feature, "git-failed", `git diff --name-only --no-renames -z ${base} failed: ${inside.detail}`);
  }
  if (!inside.ok) emitUnusable(cfg.feature, "git-failed", `git ls-files --others failed: ${inside.detail}`);
  return inside.value; // GRILL G2 — the state root is never counted as an escape (scope-inputs.mjs applies it)
}

function computeTests(cfg) {
  if (cfg.noTests) return [];
  if (cfg.explicitTests !== null) {
    const pathspecs = cfg.explicitTests
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const r = gitSync(["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...pathspecs]);
    if (!r.ok) emitUnusable(cfg.feature, "git-failed", `git ls-files for --tests failed: ${r.detail}`);
    return nulList(r.stdout);
  }
  // The default universe has ONE owner (scope-inputs.mjs, 6.49.0) — the entry check's base:test slot lists with it too.
  const r = defaultTestUniverse();
  if (!r.ok) emitUnusable(cfg.feature, "git-failed", `git ls-files failed: ${r.detail}`);
  return r.value;
}

function computeEvalPairs(cfg) {
  const r = gitSync(["ls-files", "-z"]);
  if (!r.ok) emitUnusable(cfg.feature, "git-failed", `git ls-files failed: ${r.detail}`);
  const tracked = nulList(r.stdout);
  const trackedSet = new Set(tracked);
  const pairs = [];
  for (const p of tracked) {
    if (!/\/evals\/expected\/[^/]+\.json$/.test(p)) continue;
    const actual = actualForExpected(p);
    if (actual !== null && trackedSet.has(actual)) pairs.push({ expected: p, actual });
  }
  return pairs;
}

// THE PARTITION RUNS IN-PROCESS (6.28.0, the follow-up `regress-scope-list-grammar`). Before, this phase joined the four
// sets into comma lists for `check-regress.mjs scope`, whose list grammar trims each name and scans argv for its flags:
// an undeclared ` src/x.js` read as the declared `src/x.js`, and a lone changed path named `--declared` was taken for the
// flag, so either passed the scope check falsely. Now `partitionScope` — the rule that CLI applies, and the call
// `quick-scope-core.mjs` makes — reads the sets as ARRAYS, each path exactly as git printed it; the declared patterns get
// `normPath`, as that CLI's `parseList` gives them. The document written to scope.json has the keys and the order that
// CLI printed, plus ONE key that CLI never prints — `pre_run_snapshot` (6.37.0, below) — so run-gates.mjs, the verdict
// phase and render-regression.mjs read it unchanged, and its bytes minus that key are that CLI's for every name but one
// kind. NAMED, the round-2 re-review's R3: git lists an untracked nested repository (a
// directory holding its own `.git`) as `vendor/lib/`, with a trailing slash, which the CLI's `normPath` stripped. So
// scope.json and REGRESSION.md now carry the slash, and a PLAN declaring the bare `vendor/lib` no longer covers it — it is
// `scope-escaped`, stricter than before and what check-quick-scope.mjs already did; `vendor/**` or `vendor/lib/**`
// covers it. Only the changed paths still meet `assertRepresentable`: the verdict call echoes them as a comma list.
//
// THE PRE-RUN SNAPSHOT (6.37.0, regress-pre-run-snapshot). Inside an open `/pharn-loop` or `/pharn-ship` run, the
// partition also asks `pre-run-snapshot.mjs` which changed paths still hold the bytes the run's entry snapshot recorded;
// an undeclared, non-exempt one is reported, not counted as an escape (`check-regress.mjs` `partitionScope`; the rule
// and its bounds are pre-run-snapshot-core.mjs's header). `pre_run_snapshot: {status, unchanged}` is ALWAYS written to
// scope.json — `unchanged` the subtracted paths only — and the render phase copies it into the report; a refusal renders
// it beside the escapes. This phase decides it once, before anything can pause; a resumed chain re-reads scope.json, a
// `.pharn/` file, so the block it renders is advisory. A standalone regress reads `no-delivery-run` and behaves exactly
// as before — unless an interrupted /pharn-loop or /pharn-ship of the same feature left its marker (≤ 24 h), whose
// snapshot it then applies (a marker is read by presence and age only; pre-run-snapshot-core.mjs, `no-delivery-run`).
function phasePartition(cfg, planPath, specPath, base) {
  const declared = readPlanDeclared(cfg, planPath, specPath);
  const inside = computeInside(cfg, base);
  const tests = computeTests(cfg);
  const evalPairs = computeEvalPairs(cfg);

  assertRepresentable(inside, cfg.feature);

  const declaredPatterns = [...new Set(declared.map(normPath).filter(Boolean))];
  const preRunDecision = preRunUnchanged({ feature: cfg.feature, base, inside });
  // 6.42.0 (loop-entry-preflight, review R1): the run's ENTRY GATES' own writes, recorded beside the snapshot by the same
  // rule — subtracted only while they hold the recorded bytes, and reported in their own block (entryBlocks).
  const entryDecision = entryChangesUnchanged({ feature: cfg.feature, base, inside });
  const { escaped, escapeExempt, preRun, outsideTests, outsideEvalPairs, totalGlobs, unenforcedGlobs } = partitionScope({
    inside,
    declared: declaredPatterns,
    tests,
    evalPairs,
    feature: cfg.feature,
    preRunUnchanged: [...new Set([...preRunDecision.unchanged, ...entryDecision.unchanged])],
  });
  const { preRunBlock, entryBlock } = entryBlocks(preRunDecision, entryDecision, preRun);
  // A TOTAL glob in `## Files` (regress-base-integrity, audit P2-E) is refused before anything else here: it would declare
  // every path while the write hook drops it (check-regress.mjs declaredClasses). The other globs the hook drops are
  // reported in scope.json and REGRESSION.md (`unenforced_globs`, only when present, so a concrete plan's bytes keep).
  if (totalGlobs.length) {
    writeRefusedAndEmit(
      cfg.feature,
      "plan-files-total-glob",
      `${planPath} (or AC-TESTS.md) declares a total glob — ${totalGlobs.map((g) => JSON.stringify(g)).join(", ")}: it would ` +
        "count every changed path as declared here while the write hook (set-writes-scope.cjs) drops it, so the two scope " +
        "readers disagree. Name the files (or a narrow glob such as `src/foo/**`) instead.",
      null,
      null,
      cfg.baseInfo
    );
  }
  const unenforced = unenforcedGlobs.length ? { unenforced_globs: unenforcedGlobs } : {};
  const scope = escaped.length
    ? {
        inside,
        declared: declaredPatterns,
        ...unenforced,
        escaped,
        escape_exempt: escapeExempt,
        pre_run_snapshot: preRunBlock,
        ...(entryBlock ? { entry_gate_changes: entryBlock } : {}),
        findings: scopeFindings(escaped),
        outside_tests: outsideTests,
        outside_eval_pairs: outsideEvalPairs,
      }
    : {
        inside,
        declared: declaredPatterns,
        ...unenforced,
        escaped: [],
        escape_exempt: escapeExempt,
        pre_run_snapshot: preRunBlock,
        ...(entryBlock ? { entry_gate_changes: entryBlock } : {}),
        outside_tests: outsideTests,
        outside_eval_pairs: outsideEvalPairs,
      };
  writeFileSync(REGRESS_PATHS.scopeJson, `${JSON.stringify(scope, null, 2)}\n`);
  if (escaped.length) {
    writeRefusedAndEmit(
      cfg.feature,
      "scope-escaped",
      `${escaped.length} path(s) escaped the declared writes-scope: ${JSON.stringify(escaped)}\n` + JSON.stringify(scope.findings, null, 2),
      preRunBlock,
      entryBlock,
      cfg.baseInfo
    );
  }
  // NOTHING UNDER TEST (regress-base-integrity, audit P1-B; lessons-learned L34). With no changed path outside the closed
  // exemptions, the HEAD side would judge exactly the base's non-exempt bytes: every outcome would be a comparison of a tree
  // with itself, and "no gate flipped" would be true for free. That is what a base that collapsed onto HEAD produces — a
  // committed build under the dirty-tree rule (only the untracked feature directory changed) or under `merge-base == HEAD`
  // (nothing changed) — reproduced as a `no-regressions` over a real regression. Refused before any gate runs; the
  // remedy is `--base <the commit the build started from>`, which /pharn-ship and /pharn-loop pass.
  if (changedUnderTest(inside, cfg.feature).length === 0) {
    writeRefusedAndEmit(
      cfg.feature,
      "no-change-under-test",
      `no path outside this feature's own pipeline artifacts and the trusted docs changed since the base ${base} ` +
        `(chosen by: ${cfg.baseInfo ? cfg.baseInfo.baseSource : "unknown"}), so base and HEAD would run the same code and ` +
        "the comparison could not show a regression. If the build is already committed, re-run with --base <the commit " +
        "the build started from>.",
      preRunBlock,
      entryBlock,
      cfg.baseInfo
    );
  }
  return { scope, tests };
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 5 — head-init: the HEAD install check (6.40.0), resolve --skip-style, run `run-gates.mjs init --side
 *  head`, then the TESTS and INSTALL checks.
 *  ---------------------------------------------------------------------------------------------- */
function runGatesInit(args) {
  return spawnSync(process.execPath, [RUN_GATES, "init", ...args], { encoding: "utf8" });
}

function lockfilesAtBase(base) {
  const check = (path) => {
    const r = gitSync(["cat-file", "-e", `${base}:${path}`]);
    return r.ok;
  };
  // The names per family are stage-regress-core.mjs's LOCKFILE_FAMILIES (6.40.0), which the HEAD install check reads too.
  const lockfiles = {};
  for (const [family, names] of Object.entries(LOCKFILE_FAMILIES)) lockfiles[family] = names.some(check);
  return { hasPackageJson: check("package.json"), lockfiles };
}

// THE HEAD INSTALL CHECK (6.40.0, regress-head-install-drift) runs first: the HEAD gates run in the user's working tree,
// over whatever `node_modules` it holds, while the BASE side gets a fresh install — so an install that does not match
// its lockfile is refused here, before any gate, never compared as if it were the change. `--no-install` and `--gates`
// do not change it (it is about the tree the HEAD gates run in). Every non-refusing state proceeds as before and is
// recorded for the report. The rule and its bounds: install-drift-core.mjs's header.
function phaseHeadInstall(cfg) {
  const check = readInstallCheck(".");
  if (refuses(check)) writeRefusedAndEmit(cfg.feature, "head-install-drift", detailText(check), null, null, cfg.baseInfo);
  recordInstallCheck(REGRESS_PATHS.headInstall, check);
}

function phaseHeadInit(cfg, base, scope, tests) {
  phaseHeadInstall(cfg);
  const skipStyle = shouldSkipStyle({ source: cfg.gatesSpec !== null ? "explicit" : "discover", insidePaths: scope.inside });
  const args = [
    "--stage",
    "regress",
    "--side",
    "head",
    "--feature",
    cfg.feature,
    "--out",
    REGRESS_PATHS.head,
    "--scope-json",
    REGRESS_PATHS.scopeJson,
  ];
  if (cfg.gatesSpec !== null) {
    args.push("--gates", cfg.gatesSpec);
  } else if (existsSync("package.json")) {
    args.push("--discover", "package.json");
  }
  if (skipStyle) args.push("--skip-style");

  const r = runGatesInit(args);
  let parsed;
  try {
    parsed = JSON.parse(r.stdout || "");
  } catch {
    parsed = null;
  }
  if (r.status === 3) emitQuestion(cfg.feature, "no-gates", cfg.originalArgv);
  if (r.status !== 0 || parsed === null) {
    emitUnusable(cfg.feature, "child-refused", `run-gates.mjs init --side head refused: ${parsed ? parsed.reason : r.stderr || r.stdout}`);
  }

  // A2 (GATE 2 review) — the question fires only when the TEST UNIVERSE itself is empty (neither the
  // default rule nor an explicit --tests matched any file) and --no-tests was not given. An EMPTY
  // outside-scope partition with a NON-empty universe (every discovered test happens to live INSIDE the
  // feature) is legitimate and must proceed silently, matching the old prose's semantics — it is a
  // DIFFERENT question from "is there anything to test at all". `resume.argv` for this question strips
  // any pre-existing `--tests` pair: the original one is exactly what did not resolve, so it must not
  // survive into the answer (otherwise `--no-tests` hits a mutual-exclusivity refusal, and a corrected
  // `--tests` never takes effect because it is not the first occurrence).
  if (parsed.ids.includes("test") && tests.length === 0 && !cfg.noTests) {
    emitQuestion(cfg.feature, "tests-unresolved", stripFlagPair(cfg.originalArgv, "--tests"));
  }

  const { hasPackageJson, lockfiles } = lockfilesAtBase(base);
  const install = resolveInstall({ explicitInstall: cfg.explicitInstall, noInstall: cfg.noInstall, hasPackageJson, lockfiles });
  if (install.kind === "ask") emitQuestion(cfg.feature, "install-unresolved", cfg.originalArgv);
  // regress-base-integrity: would an install at the base materialize anything? Read once, here, for the unreliable-install
  // rule (stage-regress-core.mjs baseInstallNeeded) — the base package.json is parsed as data, never executed.
  const installNeeded = hasPackageJson ? baseInstallNeeded({ lockfiles, manifest: manifestAtBase(base) }) : false;

  return { install, installNeeded, e2eExcluded: parsed.e2e_excluded ?? [], styleSkipped: skipStyle };
}

/** The base commit's package.json, parsed, or null when it cannot be read or parsed (baseInstallNeeded fails closed). */
function manifestAtBase(base) {
  const r = gitSync(["show", `${base}:package.json`]);
  if (!r.ok) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

/** ------------------------------------------------------------------------------------------------
 *  THE DRAIN — `stage-runtime.mjs`'s `drainGates` (the loop's one owner) repeats `run-gates.mjs run --next`
 *  until nothing remains, respecting the budget; THIS wrapper keeps regress's own reason code and detail text.
 *  Returns `"done"` or `"budget"` (caller must persist and exit 5 `continue`). Any runner error is a direct
 *  `unusable child-refused` exit (never returned).
 *  ---------------------------------------------------------------------------------------------- */
function drain(state, budget, outDir) {
  const res = drainGates({ outDir, timeoutMs: state.timeoutMs, budget });
  if (res.kind === "refused") {
    emitUnusable(
      state.feature,
      "child-refused",
      `run-gates.mjs run --next (${outDir}) refused: ${res.parsed ? res.parsed.reason : res.stderr || res.stdout}`
    );
  }
  return res.kind;
}

/** ------------------------------------------------------------------------------------------------
 *  THE REST OF THE PHASE MACHINE, shared by a fresh run (once past head-init with no question) and a
 *  resumed one. `state` carries EXACTLY the progress-record fields (`stage-regress-core.mjs`
 *  `PROGRESS_SCHEMA`); `phase` is the NEXT phase to run.
 *  ---------------------------------------------------------------------------------------------- */
/** The inputs of the BASE-reuse predicate this stage owns; `regress-base-reuse.mjs` reads the rest off disk. The
 *  formats are this floor's own: a stamp written now would carry this schema and this fingerprint algorithm. */
function reuseInputs(state) {
  return {
    feature: state.feature,
    base: state.base,
    install: state.install,
    timeoutMs: state.timeoutMs,
    gateRunSchema: GATE_RUN_SCHEMA,
    fingerprintAlgo: FINGERPRINT_ALGO,
  };
}

/** The inputs of the ENTRY-derived BASE predicate this stage owns (6.49.0); entry-base-evidence.mjs reads the rest. */
function entryInputs(state) {
  return { feature: state.feature, base: state.base, timeoutMs: state.timeoutMs, installOverride: state.installOverride };
}

/** An entry HIT that could not be confirmed or materialized, as a MISS with `miss` (a decision the progress record
 *  admits outside "verdict"). */
function entryMissFrom(decision, miss) {
  return { reused: false, miss, offerSha256: null, sourceStampSha256: null, run: decision.run };
}

function persistProgress(state) {
  mkdirSync(REGRESS_PATHS.root, { recursive: true });
  const rec = { schema: PROGRESS_SCHEMA, ...state };
  const v = validateProgress(rec);
  if (!v.ok) throw new Error(`internal: refusing to persist a malformed progress record: ${v.reason}`);
  writeFileSync(REGRESS_PATHS.stageJson, JSON.stringify(rec, null, 2));
}

/** ONE budget tracker per PROCESS INVOCATION (never per phase-machine re-entry): the async `install`
 *  step must recurse back into `runPhases` after its promise settles, and a fresh tracker created on that
 *  re-entry would silently reset the "first slow step of THIS invocation" clock mid-invocation — exactly
 *  the bug `mayStartSlowStep`'s contract forbids. `runFresh`/`runResume` create ONE tracker
 *  (`stage-runtime.mjs`'s `makeBudget`) and thread it through every call and every recursive continuation.
 *
 *  THE CLOCK (GATE-2 round 2): `invocationStart` is taken by the CALLER as its very first statement, so
 *  `elapsed` counts the invocation's own opening fast work — for a fresh run: argv, containment, the chain
 *  check, base resolution, the partition and head init — against the budget. Module loading before
 *  `runFresh`/`runResume` is still not counted (a named bound: node startup plus this file's imports).
 *  Before round 2 the clock started after head init, so that opening work was never charged: with the
 *  pinned 540000/570000 a second slow step could still start at wall time (opening work) + 30 s and end
 *  past the 600 s Bash cap. */
function runPhases(state, budget) {
  // A3 (GATE 2 review) — persist a checkpoint at the TOP of every phase from here through "verdict", not
  // only at a budget-exhausted `continue`. PLAN.md:140 promised "a harness kill … leaves the record at
  // that step. --resume re-runs it"; before this fix the record was written ONLY at the three
  // budget-exhausted call sites, so a hard kill anywhere else lost the whole run, every completed gate
  // included. The checkpoint alone did NOT make a kill mid-`git worktree add` resumable (round 1 claimed it
  // did; measured otherwise at the re-review): the record then names "worktree", and a plain `add` fails on
  // the half-created, git-LOCKED leftover. GATE-2 round 2 closes that — the "worktree" phase clears the path
  // first (clearBaseWorktree), which makes the phase safe to re-run; `stage-regress.test.mjs` kills a real
  // `add` mid-checkout and resumes it to `done`.
  // What a kill still costs, stated: the phase it interrupted re-runs from its start (a gate through
  // run-gates.mjs's own stale-lock recovery, the install from scratch in the existing worktree), and the
  // killed process group's orphans are run-gates.mjs's existing named bound.
  // "cleanup" and "render" are DELIBERATELY excluded (M9): the record stays parked at "verdict" until the
  // run ends, so a kill in either re-runs verdict, cleanup and render. That is safe to redo: the verdict is
  // re-derived from the same, already-durable stamps, and cleanup reports success when no worktree is left
  // behind (N2, round 2 — before it, a re-run reported a removal failure that had not happened).
  if (state.phase === "drain-head") {
    persistProgress(state);
    if (drain(state, budget, REGRESS_PATHS.head) === "budget") {
      emitContinue(state.feature, state.phase, ["--resume"]);
    }
    // THE HEAD OFFER (6.34.0): the HEAD stamp is final — offer it to this run's /pharn-verify (head-reuse-offer.mjs).
    const offered = publishOffer(state.feature);
    if (!offered.published && offered.why === "write-failed") {
      console.error("stage-regress: note — the HEAD evidence could not be offered for reuse (the git dir was not writable)");
    }
    // BASE-evidence reuse (6.33.0): decided once the HEAD side is finalized, because the head stamp is what base-init
    // would copy its spec from. A kill before the next checkpoint resumes at drain-head, whose drain is then an
    // idempotent repeat, and decides again. A HIT goes straight to the verdict.
    state.baseReuse = decideFromDisk(reuseInputs(state));
    // ENTRY-derived BASE evidence (6.49.0): asked only when the retained decision misses, after the HEAD stamp is final.
    state.entryReuse = state.baseReuse.reused ? null : decideEntryFromDisk(entryInputs(state)).decision;
    state.phase = state.baseReuse.reused || state.entryReuse.reused ? "verdict" : "worktree";
  }

  if (state.phase === "worktree") {
    persistProgress(state);
    // A miss (or a HIT the verdict could not confirm): the retained evidence goes before any new base evidence is made
    // — its record first, then `base-gates/`, so no record outlives the evidence it names. Idempotent on a resume.
    discardRetained();
    clearBaseWorktree(); // a no-op on a fresh run; on a resumed one, clears a half-added, locked leftover (A3)
    // regress-base-integrity: a fresh temp-root directory outside the project (base-worktree.mjs), recorded in the state so
    // install / base-init / drain-base / cleanup — and a resume — use exactly this checkout.
    const dir = createBaseDir(projectReal());
    if (!dir.ok) emitUnusable(state.feature, "base-worktree-unplaceable", dir.reason);
    state.baseWorktree = dir.path;
    const r = gitSync(["worktree", "add", "--detach", state.baseWorktree, state.base]);
    if (!r.ok)
      emitUnusable(
        state.feature,
        "git-failed",
        redact(`git worktree add --detach ${state.baseWorktree} ${state.base} failed: ${r.detail}`, state.baseWorktree)
      );
    state.phase = "install";
  }

  if (state.phase === "install") {
    persistProgress(state);
    if (state.install.kind === "cmd") {
      if (!budget.may()) {
        emitContinue(state.feature, state.phase, ["--resume"]);
      }
      mkdirSync(REGRESS_PATHS.root, { recursive: true });
      const outFile = join(REGRESS_PATHS.root, "install.out");
      const errFile = join(REGRESS_PATHS.root, "install.err");
      // spawnGate is exported by run-gates.mjs (6.23.0) precisely so a stage script reuses the SAME
      // process-group/timeout/kill discipline rather than re-implementing it (P3/P4).
      // The ONE timer this stage adds (6.35.0, run-performance-breakdown): the install's own interval, monotonic,
      // persisted as integer ms for the cost ledger's work record. Observational — nothing decides on it.
      const installStart = performance.now();
      const resultPromise = spawnGate(
        { shell: state.install.cmd, argv: null, files: [] },
        state.baseWorktree,
        outFile,
        errFile,
        null,
        state.timeoutMs
      );
      return resultPromise.then((res) => {
        budget.spent();
        const ms = Math.round(performance.now() - installStart);
        state.installResult = { ran: true, exit: res.exit, timedOut: res.timed_out, ms };
        state.phase = "base-init";
        return runPhases(state, budget); // the SAME tracker — see makeBudget's header
      });
    }
    state.installResult = null;
    state.phase = "base-init";
  }

  if (state.phase === "base-init") {
    persistProgress(state);
    const r = runGatesInit([
      "--stage",
      "regress",
      "--side",
      "base",
      "--feature",
      state.feature,
      "--out",
      REGRESS_PATHS.baseGates,
      "--spec-from",
      REGRESS_PATHS.head,
      "--cwd",
      state.baseWorktree,
    ]);
    let parsed;
    try {
      parsed = JSON.parse(r.stdout || "");
    } catch {
      parsed = null;
    }
    if (r.status !== 0 || parsed === null) {
      emitUnusable(
        state.feature,
        "child-refused",
        `run-gates.mjs init --side base refused: ${parsed ? parsed.reason : r.stderr || r.stdout}`
      );
    }
    state.phase = "drain-base";
  }

  if (state.phase === "drain-base") {
    persistProgress(state);
    if (drain(state, budget, REGRESS_PATHS.baseGates) === "budget") {
      emitContinue(state.feature, state.phase, ["--resume"]);
    }
    state.phase = "verdict";
  }

  if (state.phase === "verdict") {
    persistProgress(state);
    if (state.baseReuse.reused) {
      // A persisted HIT is never trusted: the progress record is ordinary `.pharn/` state a write tool can reach while a
      // chain is paused (regress-base-reuse.mjs, header). Re-decide in full over the disk, and go on only on a HIT over
      // the SAME stamp bytes; otherwise run the base side after all, from "worktree".
      const again = decideFromDisk(reuseInputs(state));
      if (!again.reused || again.stampSha256 !== state.baseReuse.stampSha256) {
        state.baseReuse = again.reused ? { ...again, reused: false, miss: "evidence-unbound", stampSha256: null } : again;
        // The retained decision is now a MISS, so the entry rule is asked, exactly as at drain-head (6.49.0); an entry
        // HIT is then re-decided and materialized by the verdict phase itself, like any other.
        state.entryReuse = decideEntryFromDisk(entryInputs(state)).decision;
        state.phase = state.entryReuse.reused ? "verdict" : "worktree";
        return runPhases(state, budget);
      }
    }
    if (state.entryReuse && state.entryReuse.reused) {
      // A persisted entry HIT is never trusted either (the progress record is `.pharn/` state): re-decide in full from
      // the git-dir offer and the entry source, go on only on a HIT over the SAME offer and source bytes, then write the
      // derived evidence from scratch. Anything else runs the BASE side after all, from "worktree".
      const again = decideEntryFromDisk(entryInputs(state));
      const same =
        again.decision.reused &&
        again.decision.offerSha256 === state.entryReuse.offerSha256 &&
        again.decision.sourceStampSha256 === state.entryReuse.sourceStampSha256;
      if (!same) {
        state.entryReuse = again.decision.reused ? entryMissFrom(again.decision, "source-unbound") : again.decision;
        state.phase = "worktree";
        return runPhases(state, budget);
      }
      discardRetained(); // the retained 6.33.0 record and directory go first, as on every non-retained path
      const m = materializeEntryBase({
        feature: state.feature,
        base: state.base,
        detail: again.detail,
        entryStampSha256: again.decision.sourceStampSha256,
      });
      if (!m.ok) {
        state.entryReuse = entryMissFrom(again.decision, m.miss);
        state.phase = "worktree";
        return runPhases(state, budget);
      }
      state.entryBlock = entryEvidenceBlock(again.decision, again.detail, state.base);
    }
    const scopeText = readFileSync(REGRESS_PATHS.scopeJson, "utf8");
    const scope = JSON.parse(scopeText);
    const args = [
      "verdict",
      "--base-stamp",
      join(REGRESS_PATHS.baseGates, "stamp.json"),
      "--head-stamp",
      join(REGRESS_PATHS.head, "stamp.json"),
      "--base",
      state.base,
      "--inside",
      scope.inside.join(","),
    ];
    const r = spawnSync(process.execPath, [CHECK_REGRESS, ...args], { encoding: "utf8" });
    if (r.stdout === undefined || r.stdout === null || r.status === null || r.status === undefined || ![0, 1, 2].includes(r.status)) {
      emitUnusable(state.feature, "child-crashed", `check-regress.mjs verdict crashed (status ${r.status ?? "null"}): ${r.stderr || ""}`);
    }
    let report;
    try {
      report = JSON.parse(r.stdout);
    } catch (e) {
      emitUnusable(state.feature, "child-crashed", `check-regress.mjs verdict did not print JSON: ${e.message}`);
    }
    state.report = report;
    state.scope = scope;
    // regress-base-integrity: a `no-regressions` over a base THIS invocation produced with an unreliable install, while a
    // gate is red on both sides, is not a measurement of that gate (stage-regress-core.mjs unreliableInstallMasking). The
    // render phase refuses `base-install-unreliable` instead of writing the report; cleanup still runs first.
    state.installMasked =
      report.verdict === "no-regressions"
        ? unreliableInstallMasking({
            install: state.install,
            installResult: state.installResult,
            installNeeded: state.installNeeded,
            freshBase: !state.baseReuse.reused && !entryUsed(state),
            outsideGates: report.outside_gates,
          })
        : [];
    // Publication (6.33.0): after a real verdict (exit 0 or 1 — both stamps validated, the specs agree, the base head
    // matches) over base evidence THIS chain produced, bind it for later invocations of the same delivery run — only
    // through the predicate, and only for the run and requirement the decision saw. A HIT keeps the record that bound it.
    state.recordOutcome = state.baseReuse.reused
      ? { published: true, why: null }
      : entryUsed(state)
        ? { published: false, why: "entry-derived" } // a retained record binds only evidence a BASE worktree produced
        : r.status === 0 || r.status === 1
          ? publishRecord({
              ...reuseInputs(state),
              installResult: state.installResult,
              decisionRun: state.baseReuse.run,
              decisionRequirementSha256: state.baseReuse.requirementSha256,
            })
          : { published: false, why: "verdict-inconclusive" };
    if (!state.recordOutcome.published && state.recordOutcome.why === "write-failed") {
      console.error("stage-regress: note — the BASE evidence could not be recorded for reuse (the git dir was not writable)");
    }
    state.phase = "cleanup";
  }

  if (state.phase === "cleanup") {
    if (state.baseReuse.reused || entryUsed(state)) {
      // A HIT (retained or entry-derived) made no base worktree, so there is nothing to remove.
      state.cleanupResult = { ok: true };
    } else {
      // A SINGLE `--force`, on purpose: a worktree someone LOCKED is left in place and reported (GRILL G4) —
      // the end of a run never force-unlocks it. The NEXT fresh start clears it (clearBaseWorktree's double
      // force); before GATE-2 round 2 that next start failed on it instead (N7).
      // N2 (round 2): a failed removal with NO directory left behind is not a failure. That is a re-run of
      // this phase after a kill or crash in "render" (the record stays parked at "verdict"), where the earlier
      // invocation already removed the worktree; `prune` clears any stale registration.
      // The checkout's path is absolute (base-worktree.mjs); a git error quoting it is redacted before REGRESSION.md
      // renders it (G10: the render never carries an absolute path this script supplied).
      const wt = state.baseWorktree;
      const r = wt === null ? { ok: true } : gitSync(["worktree", "remove", "--force", wt]);
      const left = wt === null ? { ok: true, stat: null } : lstatSafe(wt);
      const gone = left.ok && left.stat === null;
      if (!r.ok && gone) gitSync(["worktree", "prune"]);
      state.cleanupResult = r.ok || gone ? { ok: true } : { ok: false, error: redact(r.stderr || "git worktree remove failed", wt) };
    }
    state.phase = "render";
  }

  // regress-base-integrity: the unreliable-install refusal decided at "verdict" (no report; the progress record goes too).
  if (Array.isArray(state.installMasked) && state.installMasked.length) {
    try {
      unlinkSync(REGRESS_PATHS.stageJson);
    } catch {
      /* never persisted in a single-invocation run */
    }
    const why =
      state.install.kind === "none"
        ? "the base install was skipped (--no-install) although the base commit has a lockfile or declares dependencies"
        : `the base install ${state.installResult && state.installResult.timedOut ? "timed out" : `exited ${state.installResult ? state.installResult.exit : "without running"}`}`;
    writeRefusedAndEmit(
      state.feature,
      "base-install-unreliable",
      `${why}, and ${state.installMasked.map((id) => JSON.stringify(id)).join(", ")} ${state.installMasked.length === 1 ? "is" : "are"} ` +
        "red at both base and head — with no reliable install at the base, a red base gate cannot be told apart from a " +
        "missing dependency, so it cannot be classified pre_existing. Fix the install (or supply --install) and re-run.",
      null,
      null,
      { base: state.base, baseSource: state.baseSource },
      state.cleanupResult // a failed cleanup is reported on this refusal too
    );
  }

  // "render" — always reached in the same invocation as verdict/cleanup (neither is budgeted). The report is the
  // checker's object with THREE additive blocks appended last — `base_evidence` (6.33.0), then `pre_run_snapshot`
  // (6.37.0, copied from scope.json), then `head_install` (6.40.0); every key the checker printed keeps its bytes, because this is the same
  // `JSON.stringify(…, null, 2)` the checker prints with (a test pins report-minus-blocks == stdout).
  const reportPath = `${FEATURES_DIR}/${state.feature}/regression-report.json`;
  const baseEvidence = {
    reused: state.baseReuse.reused,
    miss: state.baseReuse.miss,
    requirement_sha256: state.baseReuse.requirementSha256,
    recorded: state.recordOutcome.published,
    // 6.49.0 — where the BASE evidence came from, and the entry decision (null when a retained HIT left it unasked).
    source: state.baseReuse.reused ? "reused" : entryUsed(state) ? "entry" : "fresh",
    entry: state.baseReuse.reused ? null : entryUsed(state) ? state.entryBlock : entryEvidenceBlock(state.entryReuse),
  };
  const preRunBlock = state.scope.pre_run_snapshot ?? null;
  // 6.40.0 — the HEAD install check's block, re-read from the stage's scratch (null when absent or malformed: advisory).
  const headInstall = readRecordedInstallCheck(REGRESS_PATHS.headInstall);
  // 6.42.0: `entry_gate_changes`, last, only when the partition wrote one (pre-run-snapshot-core.mjs entryBlocks).
  const entryGates = state.scope.entry_gate_changes ? { entry_gate_changes: state.scope.entry_gate_changes } : {};
  atomicWriteIntoFeature(
    reportPath,
    `${JSON.stringify(
      // `base_source` (regress-base-integrity): how `base` was chosen — a BASE_SOURCES member, after `head_install`.
      {
        ...state.report,
        base_evidence: baseEvidence,
        pre_run_snapshot: preRunBlock,
        head_install: headInstall,
        base_source: state.baseSource,
        ...entryGates,
      },
      null,
      2
    )}\n`
  );
  const md = renderDone({
    feature: state.feature,
    base: state.base,
    baseSource: state.baseSource,
    report: state.report,
    scope: state.scope,
    progress: {
      install: state.install,
      installResult: state.installResult,
      cleanupResult: state.cleanupResult,
      e2eExcluded: state.e2eExcluded,
      styleSkipped: state.styleSkipped,
      baseEvidence: { ...baseEvidence, notRecordedWhy: state.recordOutcome.published ? null : state.recordOutcome.why },
      headInstall,
    },
  });
  const renderPath = `${FEATURES_DIR}/${state.feature}/REGRESSION.md`;
  atomicWriteIntoFeature(renderPath, md);
  try {
    unlinkSync(REGRESS_PATHS.stageJson);
  } catch {
    /* never persisted in a single-invocation run — the normal case */
  }
  // The cost ledger's deterministic-work record (6.35.0, stage-work.mjs): what THIS execution ran and what it took from
  // reused evidence, counted from the two stamps the verdict just used. Best-effort and observational — a failure is a
  // stderr note, and the exit below is unchanged either way.
  recordWork(
    state.feature,
    regressWork({
      headStamp: readStampOrNull(join(REGRESS_PATHS.head, "stamp.json")),
      baseStamp: readStampOrNull(join(REGRESS_PATHS.baseGates, "stamp.json")),
      baseReuse: state.baseReuse,
      entryUsed: entryUsed(state),
      installResult: state.installResult,
      ts: new Date().toISOString(),
      sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? null,
    }),
    (m) => console.error(`stage-regress: ${m}`)
  );
  emit(doneExit({ stage: "regress", feature: state.feature, verdict: state.report.verdict, report: reportPath, render: renderPath }));
}

/** Did THIS invocation take its BASE evidence from the entry gates? Only after the verdict-time re-decision wrote it. */
function entryUsed(state) {
  return Boolean(state.entryReuse && state.entryReuse.reused && state.entryBlock);
}

/** A stamp as parsed JSON, or null — for the work record only, which treats null as "cannot count". */
function readStampOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** ------------------------------------------------------------------------------------------------
 *  FRESH entry point.
 *  ---------------------------------------------------------------------------------------------- */
function runFresh(args) {
  const invocationStart = Date.now(); // the budget clock — FIRST, so the opening fast work is charged (makeBudget)
  const feature = extractFeature(args);
  phaseFreshEarly(feature); // F2/GRILL G1 — containment + stale-report removal, before any other argv check
  const cfg = parseRestOfArgv(args, feature);
  const { planPath, specPath } = phaseFreshLate(cfg);
  phaseChain(cfg, planPath, specPath);
  const { base, baseSource } = phaseBase(cfg);
  cfg.baseInfo = { base, baseSource }; // every later refusal names the base and its source (regress-base-integrity)
  const { scope, tests } = phasePartition(cfg, planPath, specPath, base);
  const { install, installNeeded, e2eExcluded, styleSkipped } = phaseHeadInit(cfg, base, scope, tests);

  const state = {
    feature: cfg.feature,
    timeoutMs: cfg.timeoutMs,
    budgetMs: cfg.budgetMs,
    base,
    baseSource,
    baseWorktree: null, // the temp-root checkout, made at the worktree phase (base-worktree.mjs)
    installNeeded,
    install,
    e2eExcluded,
    styleSkipped,
    installResult: null,
    cleanupResult: null,
    baseReuse: null, // decided once the HEAD side is finalized (runPhases, drain-head)
    installOverride: cfg.installOverride,
    entryReuse: null, // decided right after baseReuse, only when it misses (6.49.0)
    phase: "drain-head",
  };
  return runPhases(state, makeBudget(state, invocationStart));
}

/** ------------------------------------------------------------------------------------------------
 *  RESUME entry point. Accepts ONLY --budget-ms; reads everything else from the progress record.
 *  ---------------------------------------------------------------------------------------------- */
function runResume(args) {
  const invocationStart = Date.now(); // the budget clock — FIRST (makeBudget)
  // M7(c) — the by-index scan (`stage-runtime.mjs`'s `parseResumeArgv`): a stray DUPLICATE number
  // (`--resume --budget-ms 100 100`) is refused, never read as the budget's own value. This stage applies
  // parseResumeArgv ALONE, exactly as in 6.23.0 (see stage-runtime.mjs's header on the named difference).
  const resume = parseResumeArgv(args);
  if (!resume.ok) emitUnusable(null, "usage-error", resume.detail);
  const budgetOverride = resume.budgetOverride;

  if (!existsSync(REGRESS_PATHS.stageJson)) {
    emitUnusable(null, "no-progress", `no progress record at ${REGRESS_PATHS.stageJson} — nothing to resume`);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(REGRESS_PATHS.stageJson, "utf8"));
  } catch (e) {
    emitUnusable(null, "progress-malformed", `${REGRESS_PATHS.stageJson} is not valid JSON: ${e.message}`);
  }
  const v = validateProgress(parsed);
  if (!v.ok) emitUnusable(typeof parsed?.feature === "string" ? parsed.feature : null, "progress-malformed", v.reason);

  // A4 (GATE 2 review) — re-run the SAME containment walk a fresh invocation runs, before any write: the
  // fresh path refuses a feature directory (or `.pharn`/`.pharn/pharn-regress`) that resolves through a
  // symlink; `--resume` must refuse the identical case, not write through a link introduced between the
  // fresh invocation and this one.
  containmentGuard(parsed.feature);
  // regress-base-integrity: the recorded checkout must be exactly one base-worktree.mjs would make for THIS project in the
  // temp root — a forged record never aims a removal or a gate run at another directory.
  if (parsed.baseWorktree !== null && !isOurBaseDir(parsed.baseWorktree, projectReal())) {
    emitUnusable(parsed.feature, "progress-malformed", "progress.baseWorktree is not this project's base checkout in the temp directory");
  }

  const state = { ...parsed };
  delete state.schema;
  if (budgetOverride !== undefined) state.budgetMs = budgetOverride;
  return runPhases(state, makeBudget(state, invocationStart));
}

async function main(argv) {
  const args = argv.slice(2);
  if (has(args, "--resume")) return runResume(args);
  return runFresh(args);
}

if (import.meta.main) {
  main(process.argv).catch((e) => {
    if (e === EMITTED) return; // a deliberate exit; process.exitCode is already set — never re-thrown
    console.error(`stage-regress: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 1; // a genuine crash — no JSON document, exit 1 (see the header)
  });
}

export { containmentWalk, containmentGuard, assertRepresentable, phaseFreshEarly, phaseFreshLate };
