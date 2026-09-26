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
// shared with a future verify stage script). Otherwise the script PERSISTS its progress
// (`.pharn/pharn-regress/stage.json`, `stage-regress-core.mjs`'s `PROGRESS_SCHEMA`) and exits 5
// `continue`. With no `--budget-ms` (a code caller), nothing is budgeted.
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

import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, unlinkSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { doneExit, refusedExit, unusableExit, continueExit, questionExit, mayStartSlowStep, EXIT_CODE } from "./stage-exit-core.mjs";
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

/** ------------------------------------------------------------------------------------------------
 *  Small argv helpers (the run-gates.mjs pattern).
 *  ---------------------------------------------------------------------------------------------- */
function flag(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}
function has(args, name) {
  return args.includes(name);
}

/** ------------------------------------------------------------------------------------------------
 *  CONTAINMENT (GRILL G54/L54) — an `lstat` ENOENT is the only proof of absence; a symlink at ANY
 *  component, or an unusable lstat result, refuses. Mirrors run-gates.mjs's `assertContained` in method,
 *  not by import: that function calls run-gates.mjs's OWN process.exit protocol, so this stage owns its
 *  own copy rather than conflating two different exit shapes.
 *  ---------------------------------------------------------------------------------------------- */
function lstatSafe(p) {
  try {
    return { ok: true, stat: lstatSync(p) };
  } catch (e) {
    if (e && e.code === "ENOENT") return { ok: true, stat: null };
    return { ok: false, reason: e.message };
  }
}

function containmentWalk(rootAbs, targetAbs) {
  if (targetAbs === rootAbs) return { ok: false, reason: `must not BE ${rootAbs}` };
  if (!(targetAbs + sep).startsWith(rootAbs + sep)) return { ok: false, reason: `must resolve strictly inside ${rootAbs}` };
  const rest = targetAbs.slice(rootAbs.length).split(sep).filter(Boolean);
  let cur = rootAbs;
  for (const part of [rootAbs, ...rest]) {
    cur = part === rootAbs ? rootAbs : join(cur, part);
    const r = lstatSafe(cur);
    if (!r.ok) return { ok: false, reason: `cannot lstat ${cur}: ${r.reason}` };
    if (r.stat === null) break; // truly absent — lstat's own ENOENT, never existsSync (L54)
    if (r.stat.isSymbolicLink()) return { ok: false, reason: `refuses a path that traverses a symlink at ${cur}` };
  }
  return { ok: true };
}

/** ------------------------------------------------------------------------------------------------
 *  Atomic writes into a feature directory: a tmp sibling under the state root, then rename — so no stray
 *  tmp file ever lands in the feature directory itself.
 *  ---------------------------------------------------------------------------------------------- */
function atomicWriteIntoFeature(relPath, bytes) {
  mkdirSync(REGRESS_PATHS.root, { recursive: true });
  mkdirSync(dirname(relPath), { recursive: true });
  const tmp = join(REGRESS_PATHS.root, `${relPath.replace(/[\\/]/g, "_")}.tmp-${process.pid}`);
  writeFileSync(tmp, bytes);
  renameSync(tmp, relPath);
}

/** ------------------------------------------------------------------------------------------------
 *  git helpers. Every call is an ARGUMENT VECTOR (never a shell string); paths never resolved absolute.
 *  ---------------------------------------------------------------------------------------------- */
function gitSync(args) {
  try {
    return { ok: true, stdout: execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { ok: false, error: e, stderr: e && e.stderr ? String(e.stderr) : "" };
  }
}

function nulList(stdout) {
  return stdout.split("\0").filter(Boolean);
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
 *  ARGV VALIDATION (fresh invocation only). Runs BEFORE containment/removal — an argv refusal removes
 *  nothing (the exit table's own rule).
 *  ---------------------------------------------------------------------------------------------- */
function parseFreshArgv(args) {
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
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) emitUnusable(null, "usage-error", `unexpected positional argument ${JSON.stringify(a)}`);
    if (!known.has(a)) emitUnusable(null, "usage-error", `unrecognized flag ${JSON.stringify(a)}`);
    if (valueFlags.has(a)) i++; // skip its value
  }

  const feature = flag(args, "--feature");
  if (!feature || !FEATURE_SLUG_RE.test(feature)) {
    emitUnusable(null, "usage-error", `--feature must be a plain slug matching ${FEATURE_SLUG_RE}, got ${JSON.stringify(feature)}`);
  }
  const timeoutRaw = flag(args, "--timeout-ms");
  if (timeoutRaw === undefined || !/^\d+$/.test(timeoutRaw) || Number(timeoutRaw) <= 0) {
    emitUnusable(feature, "usage-error", "--timeout-ms is required and must be a positive integer");
  }
  const timeoutMs = Number(timeoutRaw);

  let budgetMs = null;
  const budgetRaw = flag(args, "--budget-ms");
  if (budgetRaw !== undefined) {
    if (!/^\d+$/.test(budgetRaw)) emitUnusable(feature, "usage-error", "--budget-ms must be a non-negative integer");
    budgetMs = Number(budgetRaw);
  }

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
 *  PHASE 1 — fresh: containment, then stale-output removal (GRILL G1), THEN leftover-worktree /
 *  scratch cleanup (which CAN fail without having falsified "no earlier verdict survives").
 *  ---------------------------------------------------------------------------------------------- */
function phaseFresh(cfg) {
  const cwd = process.cwd();
  for (const rel of [STATE_ROOT, REGRESS_PATHS.root, `${FEATURES_DIR}/${cfg.feature}`]) {
    const c = containmentWalk(cwd, join(cwd, rel));
    if (!c.ok) emitUnusable(cfg.feature, "path-containment", `${rel}: ${c.reason}`);
  }

  // Stale-output removal FIRST, before anything that can fail (GRILL G1).
  for (const rel of [`${FEATURES_DIR}/${cfg.feature}/regression-report.json`, `${FEATURES_DIR}/${cfg.feature}/REGRESSION.md`]) {
    try {
      unlinkSync(rel);
    } catch {
      /* absent — the normal case */
    }
  }

  // A leftover registered base worktree, pruned; then the scratch directory is cleared. One run per
  // worktree at a time (GRILL G14) — a second fresh start destroys the first run's in-progress record,
  // matching run-gates.mjs init's own recreate of <out>.
  gitSync(["worktree", "remove", "--force", REGRESS_PATHS.base]);
  gitSync(["worktree", "prune"]);
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

function phaseHeadInit(cfg, base, scope) {
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

  if (parsed.ids.includes("test") && scope.outside_tests.length === 0 && !cfg.noTests) {
    emitQuestion(cfg.feature, "tests-unresolved", cfg.originalArgv);
  }

  const { hasPackageJson, lockfiles } = lockfilesAtBase(base);
  const install = resolveInstall({ explicitInstall: cfg.explicitInstall, noInstall: cfg.noInstall, hasPackageJson, lockfiles });
  if (install.kind === "ask") emitQuestion(cfg.feature, "install-unresolved", cfg.originalArgv);

  return { install, e2eExcluded: parsed.e2e_excluded ?? [], styleSkipped: skipStyle };
}

/** ------------------------------------------------------------------------------------------------
 *  THE DRAIN — repeat `run-gates.mjs run --next` until nothing remains, respecting the budget.
 *  ---------------------------------------------------------------------------------------------- */
function drainOnce(outDir, timeoutMs) {
  return spawnSync(process.execPath, [RUN_GATES, "run", "--next", "--out", outDir, "--timeout-ms", String(timeoutMs)], {
    encoding: "utf8",
  });
}

/** Returns `"done"` or `"budget"` (caller must persist and exit 5 `continue`). Any runner error is a
 *  direct `unusable child-refused` exit (never returned). */
function drain(state, budget, outDir) {
  for (;;) {
    if (!budget.may()) return "budget";
    const r = drainOnce(outDir, state.timeoutMs);
    let parsed;
    try {
      parsed = JSON.parse(r.stdout || "");
    } catch {
      parsed = null;
    }
    if (r.status === 3) return "done"; // already finalized — an idempotent repeat
    if (r.status !== 0 || parsed === null) {
      emitUnusable(
        state.feature,
        "child-refused",
        `run-gates.mjs run --next (${outDir}) refused: ${parsed ? parsed.reason : r.stderr || r.stdout}`
      );
    }
    budget.spent();
    if (parsed.finalized || parsed.remaining === 0) return "done";
  }
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
 *  step must recurse back into `runPhases` after its promise settles, and a fresh `invocationStart`/
 *  `slowSteps` pair created on that re-entry would silently reset the "first slow step of THIS
 *  invocation" clock mid-invocation — exactly the bug `mayStartSlowStep`'s contract forbids. `runFresh`/
 *  `runResume` create ONE tracker and thread it through every call and every recursive continuation. */
function makeBudget(state) {
  const invocationStart = Date.now();
  let slowSteps = 0;
  return {
    may: () =>
      mayStartSlowStep({
        elapsedMs: Date.now() - invocationStart,
        timeoutMs: state.timeoutMs,
        budgetMs: state.budgetMs,
        slowStepsThisInvocation: slowSteps,
      }),
    spent: () => {
      slowSteps++;
    },
  };
}

function runPhases(state, budget) {
  if (state.phase === "drain-head") {
    if (drain(state, budget, REGRESS_PATHS.head) === "budget") {
      persistProgress(state);
      emitContinue(state.feature, state.phase, ["--resume"]);
    }
    state.phase = "worktree";
  }

  if (state.phase === "worktree") {
    const r = gitSync(["worktree", "add", "--detach", REGRESS_PATHS.base, state.base]);
    if (!r.ok)
      emitUnusable(state.feature, "git-failed", `git worktree add --detach ${REGRESS_PATHS.base} ${state.base} failed: ${r.stderr}`);
    state.phase = "install";
  }

  if (state.phase === "install") {
    if (state.install.kind === "cmd") {
      if (!budget.may()) {
        persistProgress(state);
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
    if (drain(state, budget, REGRESS_PATHS.baseGates) === "budget") {
      persistProgress(state);
      emitContinue(state.feature, state.phase, ["--resume"]);
    }
    state.phase = "verdict";
  }

  if (state.phase === "verdict") {
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
    const r = gitSync(["worktree", "remove", "--force", REGRESS_PATHS.base]);
    state.cleanupResult = r.ok ? { ok: true } : { ok: false, error: r.stderr || "git worktree remove failed" };
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
  const cfg = parseFreshArgv(args);
  const { planPath, specPath } = phaseFresh(cfg);
  phaseChain(cfg, planPath, specPath);
  const base = phaseBase(cfg);
  const { scope } = phasePartition(cfg, planPath, specPath, base);
  const { install, e2eExcluded, styleSkipped } = phaseHeadInit(cfg, base, scope);

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
  return runPhases(state, makeBudget(state));
}

/** ------------------------------------------------------------------------------------------------
 *  RESUME entry point. Accepts ONLY --budget-ms; reads everything else from the progress record.
 *  ---------------------------------------------------------------------------------------------- */
function runResume(args) {
  for (const a of args) {
    if (a === "--resume") continue;
    if (a === "--budget-ms") continue;
    if (/^\d+$/.test(a) && args[args.indexOf(a) - 1] === "--budget-ms") continue;
    emitUnusable(null, "usage-error", `--resume accepts only --budget-ms; got ${JSON.stringify(a)}`);
  }
  let budgetOverride;
  const budgetRaw = flag(args, "--budget-ms");
  if (budgetRaw !== undefined) {
    if (!/^\d+$/.test(budgetRaw)) emitUnusable(null, "usage-error", "--budget-ms must be a non-negative integer");
    budgetOverride = Number(budgetRaw);
  }

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

  const state = { ...parsed };
  delete state.schema;
  if (budgetOverride !== undefined) state.budgetMs = budgetOverride;
  return runPhases(state, makeBudget(state));
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

export { containmentWalk, assertRepresentable, phaseFresh };
