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
// ==================================== THE SHARED MECHANICS (6.24.0) ====================================
// The argv rules (`parseTimeoutMs`, `parseBudgetMs`, `parseResumeArgv`, `scanFlags`), the `lstat` containment
// walk, the atomic write, the git helpers, the budget tracker and the drain loop moved into
// `pharn/floor/stage-runtime.mjs` (stage-verify-script, GATE 1 Q1), their ONE owner, so `stage-verify.mjs` does
// not copy the rules 6.23.0's review repaired one by one. They were extracted to RETURN results; this script keeps
// its own emit wrappers, reason codes and detail wording, and its CLI behaviour — every detail text, the phase
// order, the drain's exit-3 idempotent repeat — is unchanged (the unchanged `stage-regress.test.mjs` is that
// evidence).
//
// ==================================== PHASES, IN ORDER (GRILL G1) ====================================
// fresh -> chain -> base -> partition -> head-init -> drain-head -> worktree -> install -> base-init ->
// drain-base -> verdict -> cleanup -> render (`stage-regress-core.mjs` PHASES — the ONE owner of this
// order). "fresh" REMOVES this feature's earlier `regression-report.json`/`REGRESSION.md` BEFORE any step
// that can fail, so a stage that stops before its verdict leaves no earlier verdict on disk; an argv
// refusal (before containment passes) removes nothing.
//
// ============================== NO ABSOLUTE PATH TO A CHILD OR A RENDER (GRILL G10) ==============================
// Every path this script hands to a shelled checker, to git, or to `render-regression.mjs` is
// REPO-RELATIVE. `/pharn-loop` commits `REGRESSION.md`, and a child's refusal text can quote whatever path
// it was handed — so nothing here ever resolves a path to an absolute one before using it.
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

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
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
  atomicWrite,
  gitSync,
  nulList,
  makeBudget,
  drainGates,
} from "./stage-runtime.mjs";
import {
  REGRESS_PATHS,
  isTestFile,
  shouldSkipStyle,
  resolveInstall,
  resolveBaseSource,
  PROGRESS_SCHEMA,
  validateProgress,
} from "./stage-regress-core.mjs";
import { renderDone, renderRefused } from "./render-regression.mjs";
import { shelledVerdict } from "./shelled-verdict-core.mjs";
import { spawnGate } from "./run-gates.mjs";
import { pathsFromPlanFiles, clean } from "./plan-files-core.mjs";
import { FEATURE_SLUG_RE, actualForExpected } from "./gate-run-core.mjs";
import { isExcluded } from "./worktree-fingerprint.mjs";

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
 *  followed). */
function clearBaseWorktree() {
  gitSync(["worktree", "remove", "--force", "--force", REGRESS_PATHS.base]);
  rmSync(REGRESS_PATHS.base, { recursive: true, force: true });
  gitSync(["worktree", "prune"]);
}

/** ------------------------------------------------------------------------------------------------
 *  The comma/newline list grammar `check-regress.mjs` parses (GRILL "unrepresentable-path"): a path
 *  containing a comma or a newline cannot be represented in that grammar and must be REFUSED, never
 *  mangled or silently split.
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

  // Stale-output removal, as early as it is now safe to do so (GRILL G1, narrowed by F2).
  for (const rel of [`${FEATURES_DIR}/${feature}/regression-report.json`, `${FEATURES_DIR}/${feature}/REGRESSION.md`]) {
    try {
      unlinkSync(rel);
    } catch {
      /* absent — the normal case */
    }
  }
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 1b — fresh (LATE): leftover-worktree / scratch cleanup, then feature-dir/PLAN/SPEC existence
 *  checks. Runs AFTER the rest of argv has been validated (parseRestOfArgv) — everything here CAN fail
 *  without having falsified "no earlier verdict survives", which phaseFreshEarly already discharged.
 *  ---------------------------------------------------------------------------------------------- */
function phaseFreshLate(cfg) {
  // A leftover base worktree — locked or not — is cleared (clearBaseWorktree); then the scratch directory
  // is cleared. One run per worktree at a time (GRILL G14) — a second fresh start destroys the first run's
  // in-progress record, matching run-gates.mjs init's own recreate of <out>.
  clearBaseWorktree();
  rmSync(REGRESS_PATHS.root, { recursive: true, force: true });
  mkdirSync(REGRESS_PATHS.root, { recursive: true });

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

function writeRefusedAndEmit(feature, reasonCode, detail) {
  const md = renderRefused({ feature, reasonCode, detail });
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

function phaseBase(cfg) {
  if (cfg.explicitBase !== null) {
    const r = gitSync(["rev-parse", "--verify", "--quiet", `${cfg.explicitBase}^{commit}`]);
    if (!r.ok || !SHA_RE.test(r.stdout.trim())) {
      emitUnusable(cfg.feature, "usage-error", `--base ${JSON.stringify(cfg.explicitBase)} does not resolve to a commit`);
    }
    return r.stdout.trim();
  }
  const porcelain = gitSync(["status", "--porcelain"]);
  if (!porcelain.ok) emitUnusable(cfg.feature, "git-failed", `git status failed: ${porcelain.stderr}`);
  const workingTreeDirty = porcelain.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => !isExcluded(porcelainPath(line), null)); // the state root is never a "dirty tree" signal (GRILL G2)

  const mb = gitSync(["merge-base", "HEAD", "origin/main"]);
  const hasMergeBase = mb.ok && SHA_RE.test(mb.stdout.trim());

  const source = resolveBaseSource({ workingTreeDirty, hasMergeBase });
  if (source.kind === "head") {
    const head = gitSync(["rev-parse", "HEAD"]);
    if (!head.ok || !SHA_RE.test(head.stdout.trim())) emitUnusable(cfg.feature, "git-failed", "git rev-parse HEAD failed");
    return head.stdout.trim();
  }
  if (source.kind === "merge-base") return mb.stdout.trim();
  emitQuestion(cfg.feature, "base-unresolved", cfg.originalArgv);
  return undefined; // unreachable — emitQuestion throws
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 4 — partition: build the four inputs, call `check-regress.mjs scope`.
 *  ---------------------------------------------------------------------------------------------- */
function readPlanDeclared(cfg, planPath, specPath) {
  void specPath;
  const planText = readFileSync(planPath, "utf8");
  const parsedPlan = pathsFromPlanFiles(planText);
  if (!parsedPlan.ok) {
    writeRefusedAndEmit(cfg.feature, "plan-files-unparseable", `${planPath}: ${parsedPlan.reason}`);
  }
  let declared = parsedPlan.value.map(clean);
  const acPath = `${FEATURES_DIR}/${cfg.feature}/AC-TESTS.md`;
  if (existsSync(acPath)) {
    const acParsed = pathsFromPlanFiles(readFileSync(acPath, "utf8"));
    if (acParsed.ok) declared = declared.concat(acParsed.value.map(clean));
  }
  return [...new Set(declared)];
}

function computeInside(cfg, base) {
  const diff = gitSync(["diff", "--name-only", "--no-renames", "-z", base]);
  if (!diff.ok) emitUnusable(cfg.feature, "git-failed", `git diff --name-only --no-renames -z ${base} failed: ${diff.stderr}`);
  const untracked = gitSync(["ls-files", "-z", "--others", "--exclude-standard"]);
  if (!untracked.ok) emitUnusable(cfg.feature, "git-failed", `git ls-files --others failed: ${untracked.stderr}`);
  const all = [...new Set([...nulList(diff.stdout), ...nulList(untracked.stdout)])];
  return all.filter((p) => !isExcluded(p, null)); // GRILL G2 — the state root is never counted as an escape
}

function computeTests(cfg) {
  if (cfg.noTests) return [];
  if (cfg.explicitTests !== null) {
    const pathspecs = cfg.explicitTests
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const r = gitSync(["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...pathspecs]);
    if (!r.ok) emitUnusable(cfg.feature, "git-failed", `git ls-files for --tests failed: ${r.stderr}`);
    return nulList(r.stdout);
  }
  const r = gitSync(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  if (!r.ok) emitUnusable(cfg.feature, "git-failed", `git ls-files failed: ${r.stderr}`);
  return nulList(r.stdout).filter(isTestFile);
}

function computeEvalPairs(cfg) {
  const r = gitSync(["ls-files", "-z"]);
  if (!r.ok) emitUnusable(cfg.feature, "git-failed", `git ls-files failed: ${r.stderr}`);
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

function phasePartition(cfg, planPath, specPath, base) {
  const declared = readPlanDeclared(cfg, planPath, specPath);
  const inside = computeInside(cfg, base);
  const tests = computeTests(cfg);
  const evalPairs = computeEvalPairs(cfg);

  assertRepresentable(inside, cfg.feature);
  assertRepresentable(declared, cfg.feature);
  assertRepresentable(tests, cfg.feature);
  for (const p of evalPairs) assertRepresentable([p.expected, p.actual], cfg.feature);

  const args = [
    "scope",
    "--changed",
    inside.join(","),
    "--declared",
    declared.join(","),
    "--tests",
    tests.join(","),
    "--eval-pairs",
    evalPairs.map((p) => `${p.expected}::${p.actual}`).join(","),
    "--feature",
    cfg.feature,
  ];
  const r = spawnSync(process.execPath, [CHECK_REGRESS, ...args], { encoding: "utf8" });
  if (r.stdout === undefined || r.stdout === null) {
    emitUnusable(cfg.feature, "child-crashed", `check-regress.mjs scope produced no stdout (status ${r.status ?? "null"})`);
  }
  writeFileSync(REGRESS_PATHS.scopeJson, r.stdout);
  let scope;
  try {
    scope = JSON.parse(r.stdout);
  } catch (e) {
    emitUnusable(cfg.feature, "child-crashed", `check-regress.mjs scope did not print JSON: ${e.message}`);
  }
  if (r.status === 1) {
    writeRefusedAndEmit(
      cfg.feature,
      "scope-escaped",
      `${(scope.escaped ?? []).length} path(s) escaped the declared writes-scope: ${JSON.stringify(scope.escaped)}\n` +
        JSON.stringify(scope.findings ?? [], null, 2)
    );
  }
  if (r.status !== 0) {
    emitUnusable(cfg.feature, "child-refused", `check-regress.mjs scope refused: ${scope.reason ?? JSON.stringify(scope)}`);
  }
  return { scope, tests };
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 5 — head-init: resolve --skip-style, run `run-gates.mjs init --side head`, then the TESTS and
 *  INSTALL checks.
 *  ---------------------------------------------------------------------------------------------- */
function runGatesInit(args) {
  return spawnSync(process.execPath, [RUN_GATES, "init", ...args], { encoding: "utf8" });
}

function lockfilesAtBase(base) {
  const check = (path) => {
    const r = gitSync(["cat-file", "-e", `${base}:${path}`]);
    return r.ok;
  };
  return {
    hasPackageJson: check("package.json"),
    lockfiles: {
      npm: check("package-lock.json") || check("npm-shrinkwrap.json"),
      pnpm: check("pnpm-lock.yaml"),
      yarn: check("yarn.lock"),
      bun: check("bun.lock") || check("bun.lockb"),
    },
  };
}

function phaseHeadInit(cfg, base, scope, tests) {
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

  return { install, e2eExcluded: parsed.e2e_excluded ?? [], styleSkipped: skipStyle };
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
    state.phase = "worktree";
  }

  if (state.phase === "worktree") {
    persistProgress(state);
    clearBaseWorktree(); // a no-op on a fresh run; on a resumed one, clears a half-added, locked leftover (A3)
    const r = gitSync(["worktree", "add", "--detach", REGRESS_PATHS.base, state.base]);
    if (!r.ok)
      emitUnusable(state.feature, "git-failed", `git worktree add --detach ${REGRESS_PATHS.base} ${state.base} failed: ${r.stderr}`);
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
      const resultPromise = spawnGate(
        { shell: state.install.cmd, argv: null, files: [] },
        REGRESS_PATHS.base,
        outFile,
        errFile,
        null,
        state.timeoutMs
      );
      return resultPromise.then((res) => {
        budget.spent();
        state.installResult = { ran: true, exit: res.exit, timedOut: res.timed_out };
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
      REGRESS_PATHS.base,
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
    state.reportRaw = r.stdout;
    state.report = report;
    state.scope = scope;
    state.phase = "cleanup";
  }

  if (state.phase === "cleanup") {
    // A SINGLE `--force`, on purpose: a worktree someone LOCKED is left in place and reported (GRILL G4) —
    // the end of a run never force-unlocks it. The NEXT fresh start clears it (clearBaseWorktree's double
    // force); before GATE-2 round 2 that next start failed on it instead (N7).
    // N2 (round 2): a failed removal with NO directory left behind is not a failure. That is a re-run of
    // this phase after a kill or crash in "render" (the record stays parked at "verdict"), where the earlier
    // invocation already removed the worktree; `prune` clears any stale registration.
    const r = gitSync(["worktree", "remove", "--force", REGRESS_PATHS.base]);
    const left = lstatSafe(REGRESS_PATHS.base);
    const gone = left.ok && left.stat === null;
    if (!r.ok && gone) gitSync(["worktree", "prune"]);
    state.cleanupResult = r.ok || gone ? { ok: true } : { ok: false, error: r.stderr || "git worktree remove failed" };
    state.phase = "render";
  }

  // "render" — always reached in the same invocation as verdict/cleanup (neither is budgeted).
  const reportPath = `${FEATURES_DIR}/${state.feature}/regression-report.json`;
  atomicWriteIntoFeature(reportPath, state.reportRaw);
  const md = renderDone({
    feature: state.feature,
    base: state.base,
    report: state.report,
    scope: state.scope,
    progress: {
      install: state.install,
      installResult: state.installResult,
      cleanupResult: state.cleanupResult,
      e2eExcluded: state.e2eExcluded,
      styleSkipped: state.styleSkipped,
    },
  });
  const renderPath = `${FEATURES_DIR}/${state.feature}/REGRESSION.md`;
  atomicWriteIntoFeature(renderPath, md);
  try {
    unlinkSync(REGRESS_PATHS.stageJson);
  } catch {
    /* never persisted in a single-invocation run — the normal case */
  }
  emit(doneExit({ stage: "regress", feature: state.feature, verdict: state.report.verdict, report: reportPath, render: renderPath }));
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
  const base = phaseBase(cfg);
  const { scope, tests } = phasePartition(cfg, planPath, specPath, base);
  const { install, e2eExcluded, styleSkipped } = phaseHeadInit(cfg, base, scope, tests);

  const state = {
    feature: cfg.feature,
    timeoutMs: cfg.timeoutMs,
    budgetMs: cfg.budgetMs,
    base,
    install,
    e2eExcluded,
    styleSkipped,
    installResult: null,
    cleanupResult: null,
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
