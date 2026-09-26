#!/usr/bin/env node
// pharn/floor/stage-verify.mjs — the /pharn-verify STAGE SCRIPT (stage-verify-script, 6.26.0). Every deterministic
// step of the verify stage — argv validation, containment, the stale-output removal, the spec→plan chain check,
// the eval-pair discovery, the verifier count, the gate run, the verdict, the report composition and the atomic
// artifact writes — lives here, in TESTED CODE, instead of in `.claude/commands/pharn-verify.md`'s prose. The
// command becomes a THIN CALLER: it pins one line, branches on this script's EXIT CODE, and relays a `question`.
//
// ================================ WHY A SCRIPT REPLACES COMMAND PROSE (P7) ================================
// A `/pharn-verify` run prescribed 14 + d + G + P tool calls (G project gates, P eval-pair gates, d the eval-pair
// discovery), each a full model turn re-reading a 55 KB prompt — the same measured trigger 6.23.0 answered for
// regress (`.dev/features/stage-verify-script/PLAN.md`, "Why"). Moving the steps into one script changes WHO runs
// the orchestration between the reused checkers, not what they decide: the verdict is still
// `check-verify.mjs --stamp … --ac-gate`, the chain is still `check-plan-spec-agree.mjs`, the gates still run
// through `run-gates.mjs`, and verifier membership is still `count-verifiers.mjs`.
//
// =========================================== THE PROTOCOL ===========================================
// `pharn/pharn-contracts/stage-exit.md` + `stage-exit-core.mjs` (its `verify` registry entry): one
// `pharn-stage-exit/1` JSON object per exit, and the exit CODE names the status — 0 done · 2 unusable · 3 refused ·
// 4 question · 5 continue · anything else, 1 included, is a CRASH. A `done` exit carries the verdict only as a
// transient copy; the verdict lives in `verify-report.json`, so `done` with a FAIL verdict is still exit 0.
//
// ==================================== PHASES, IN ORDER ====================================
// fresh → chain → pairs → verifiers → init → drain → verdict → render (`stage-verify-core.mjs` PHASES, the one owner
// of the order). Every refusal and the one question are raised before "drain", the first slow step.
//   fresh    — the slug; the `lstat` containment walk; then THIS feature's earlier `verify-report.json` and
//              `VERIFY.md` are removed and `.pharn/pharn-verify/` is cleared, the progress record first. ONLY
//              `ENOENT` counts as absence (GRILL G2): any other removal error propagates — a crash, never a verdict
//              — so no refusal and no `unusable` can follow a removal that failed. The rest of argv is validated
//              AFTER the clear, so a `usage-error` there cannot leave an earlier run's progress record beside a
//              removed report (6.23.0's N1 state). A stop before this point (a bad slug, `path-containment`)
//              removes nothing. The one window left for the N1 state, named: a kill between the report removal
//              and the record's unlink.
//   chain    — `check-plan-spec-agree.mjs`, read through `shelledVerdict` (a crash is never read as a RED).
//   pairs    — EVAL_PAIR_RULE over the PLAN's `## Files` and a `-z` listing (L21).
//   verifiers— `count-verifiers.mjs .`, before the slow steps so a crash costs no gate run.
//   init     — `run-gates.mjs init --stage verify`; exit 3 is the `no-gates` question. The completeness capture the
//              runner took at init must pass `checkCompleteness`, BEFORE any gate runs: a crashed
//              `check-build-complete.mjs` is `child-crashed` here, never an INCOMPLETE verdict.
//   drain    — `run --next` per gate under the budget (a checkpoint at its top).
//   verdict  — `check-verify.mjs --stamp … --ac-gate`, its exit bound to its printed verdict (a checkpoint at its
//              top; the record stays parked there through "render").
//   render   — a containment walk before EVERY write into the feature directory (GRILL G9), then the report and
//              `VERIFY.md` through a tmp file and a rename, then the record is removed.
//
// ==================================== THE BUDGET (`--budget-ms`) ====================================
// The 600 s Bash-tool cap is the script's problem, exactly as in regress: a gate starts only if it is the first
// slow step of the invocation or `elapsed + timeoutMs <= budgetMs` (`stage-runtime.mjs`'s `makeBudget` over
// `mayStartSlowStep`), `elapsed` measured from the top of `runFresh`/`runResume`. Not counted, named: node's startup
// and module loading, and the fast work after the last permitted slow step (`run --next`'s two fingerprints, the
// verdict call, the composition, the render and the writes). With no `--budget-ms` nothing is budgeted.
//
// ==================================== RESUME ====================================
// `--resume` accepts only `--budget-ms` and reads everything else from `.pharn/pharn-verify/stage.json`
// (`pharn-stage-verify-progress/1`). It walks containment before anything is written. A resume re-derives the
// verdict from the same durable stamp; over an UNCHANGED tree it reproduces the interrupted run's report, but the
// verdict also reads live files the AC gate needs (the lock, the SPEC, the mapping), so after the tree moved it may
// not (GRILL G8) — `/pharn-loop`'s check-loop-fresh F catches a moved tree, `/pharn-ship` has no such check.
//
// ============================== THE WRITES (L19 — declared, and weaker) ==============================
// `verify-report.json` and `VERIFY.md` are `fs` writes reached through Bash, outside fix #7's hook, at fixed literal
// paths under a slug-gated feature directory. Unlike regress they are NOT detected either: they happen AFTER this
// stage's own `reconcile` gate ran, and no later stage reconciles. The mitigation is the small, literal write set
// and its tests — tested code, not a floor claim.
//
// PATHS: every path this script hands a child or the renderer is REPO-RELATIVE. The one place it resolves paths
// absolute is the containment walk (`join(process.cwd(), rel)`), and a `path-containment` refusal's `detail` can carry
// such a path (GATE 2 review F2). That detail travels only to the caller — the thin command presents `detail` as
// quoted DATA — and that exit writes no file.
// TRUST (P2): the PLAN's `## Files` becomes only declared path strings (prefix operands of a membership test);
// SPEC.md is hashed by the shelled checker and never read here; child stdout is parsed as JSON and only enums and
// ints branch; every child value quoted into a `detail` goes through `dataText` (L62).
//
// Usage:
//   node pharn/floor/stage-verify.mjs --feature <name> --timeout-ms <N> [--budget-ms <B>] [--gates "<cmd>[::<id>],…"]
//   node pharn/floor/stage-verify.mjs --resume [--budget-ms <B>]
//
// Exit: 0 done · 2 unusable · 3 refused · 4 question · 5 continue · anything else (1 included) = CRASHED.

import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { doneExit, refusedExit, unusableExit, continueExit, questionExit, EXIT_CODE } from "./stage-exit-core.mjs";
import {
  VERIFY_PATHS,
  PROGRESS_SCHEMA,
  validateProgress,
  isVerifierCount,
  featureEvalPairs,
  classifyVerdict,
  checkCompleteness,
  composeReport,
} from "./stage-verify-core.mjs";
import { renderDone, renderRefused } from "./render-verify.mjs";
import { shelledVerdict, crashedDetail } from "./shelled-verdict-core.mjs";
import { pathsFromPlanFiles, clean } from "./plan-files-core.mjs";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { dataText } from "./quote-core.mjs";
import {
  flag,
  has,
  scanFlags,
  parseTimeoutMs,
  parseBudgetMs,
  parseResumeArgv,
  containmentWalk,
  removeIfPresent,
  atomicWrite,
  gitSync,
  nulList,
  makeBudget,
  drainGates,
} from "./stage-runtime.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_PLAN_SPEC_AGREE = join(HERE, "check-plan-spec-agree.mjs");
const COUNT_VERIFIERS = join(HERE, "count-verifiers.mjs");
const RUN_GATES = join(HERE, "run-gates.mjs");
const CHECK_VERIFY = join(HERE, "check-verify.mjs");

const FEATURES_DIR = "pharn/features";
const STATE_ROOT = ".pharn";
const STAMP = `${VERIFY_PATHS.gates}/stamp.json`;
const COMPLETENESS = `${VERIFY_PATHS.gates}/completeness.json`;

/** ------------------------------------------------------------------------------------------------
 *  Emit + exit. ONE JSON document, then end, through the 6.20.4 flush rule: set process.exitCode and unwind with
 *  a module-private sentinel only the top-level catch swallows. Exit 1 is never chosen here — a genuine crash (an
 *  uncaught throw, a failed module load, a removal that failed) reaches node's own exit 1 with NO document.
 *  ---------------------------------------------------------------------------------------------- */
const EMITTED = Symbol("stage-verify: emitted");
function emit(obj) {
  console.log(JSON.stringify(obj, null, 2));
  process.exitCode = EXIT_CODE[obj.status];
  throw EMITTED;
}

function emitUnusable(feature, reasonCode, detail) {
  emit(unusableExit({ stage: "verify", feature, reasonCode, detail }));
}
function emitQuestion(feature, reasonCode, resumeArgv) {
  emit(questionExit({ stage: "verify", feature, reasonCode, resumeArgv }));
}
function emitContinue(feature, phase, resumeArgv) {
  emit(continueExit({ stage: "verify", feature, phase, resumeArgv }));
}

function featureDir(feature) {
  return `${FEATURES_DIR}/${feature}`;
}

/** ------------------------------------------------------------------------------------------------
 *  CONTAINMENT (L54) — the walk is `stage-runtime.mjs`'s; THIS stage's paths are `.pharn`, `.pharn/pharn-verify`
 *  and the feature directory. `feature` null walks the first two only (a `--resume` before its record is read).
 *  ---------------------------------------------------------------------------------------------- */
function containmentGuard(feature) {
  const cwd = process.cwd();
  const rels = [STATE_ROOT, VERIFY_PATHS.root, ...(feature === null ? [] : [featureDir(feature)])];
  for (const rel of rels) {
    const c = containmentWalk(cwd, join(cwd, rel));
    if (!c.ok) emitUnusable(feature, "path-containment", `${rel}: ${dataText(c.reason)}`);
  }
}

/** EVERY write into the feature directory walks containment first (GRILL G9), so a feature directory swapped for a
 *  symlink during the drain is refused, never written through. The residual is the gap between this walk and the
 *  rename inside `atomicWrite`. */
function writeIntoFeature(feature, relPath, bytes) {
  containmentGuard(feature);
  atomicWrite(VERIFY_PATHS.root, relPath, bytes);
}

function writeRefusedAndEmit(feature, reasonCode, detail) {
  const renderPath = `${featureDir(feature)}/VERIFY.md`;
  writeIntoFeature(feature, renderPath, renderRefused({ feature, reasonCode, detail }));
  emit(refusedExit({ stage: "verify", feature, reasonCode, render: renderPath }));
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 1 — fresh.
 *  ---------------------------------------------------------------------------------------------- */
function extractFeature(args) {
  const feature = flag(args, "--feature");
  if (!feature || !FEATURE_SLUG_RE.test(feature)) {
    emitUnusable(null, "usage-error", `--feature must be a plain slug matching ${FEATURE_SLUG_RE}, got ${JSON.stringify(feature)}`);
  }
  return feature;
}

function removeEarlierOutput(feature) {
  // THIS feature's earlier outputs, then the stage's scratch — its progress record before the directory. Both happen
  // before the rest of argv is validated, so no later refusal can leave an earlier run's record beside a removed
  // report (6.23.0's N1 state); the one window left is a kill between the report's removal and the record's unlink.
  // `rmSync`'s `force` ignores absence only.
  removeIfPresent(`${featureDir(feature)}/verify-report.json`);
  removeIfPresent(`${featureDir(feature)}/VERIFY.md`);
  removeIfPresent(VERIFY_PATHS.stageJson);
  rmSync(VERIFY_PATHS.root, { recursive: true, force: true });
}

function parseRestOfArgv(args, feature) {
  const known = new Set(["--feature", "--timeout-ms", "--budget-ms", "--gates"]);
  const scan = scanFlags(args, known, known);
  if (!scan.ok) emitUnusable(feature, "usage-error", scan.detail);
  const timeout = parseTimeoutMs(args);
  if (!timeout.ok) emitUnusable(feature, "usage-error", timeout.detail);
  const budget = parseBudgetMs(args);
  if (!budget.ok) emitUnusable(feature, "usage-error", budget.detail);
  const gatesSpec = flag(args, "--gates") ?? null;
  if (has(args, "--gates") && (!gatesSpec || gatesSpec.length === 0)) {
    emitUnusable(feature, "usage-error", "--gates requires a non-empty value");
  }
  return { feature, timeoutMs: timeout.value, budgetMs: budget.value, gatesSpec, originalArgv: [...args] };
}

function requireArtifacts(cfg) {
  if (!existsSync(featureDir(cfg.feature))) {
    emitUnusable(cfg.feature, "no-feature", `no such feature directory: ${featureDir(cfg.feature)}`);
  }
  const planPath = `${featureDir(cfg.feature)}/PLAN.md`;
  const specPath = `${featureDir(cfg.feature)}/SPEC.md`;
  const missing = [planPath, specPath].filter((p) => !existsSync(p));
  if (missing.length) writeRefusedAndEmit(cfg.feature, "missing-artifact", `missing required artifact(s): ${missing.join(", ")}`);
  return { planPath, specPath };
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 2 — chain: `check-plan-spec-agree.mjs`, read through `shelledVerdict`.
 *  ---------------------------------------------------------------------------------------------- */
function phaseChain(cfg, planPath, specPath) {
  const r = spawnSync(process.execPath, [CHECK_PLAN_SPEC_AGREE, planPath, specPath], { encoding: "utf8" });
  const v = shelledVerdict(r);
  if (v === "green") return;
  if (v === "red") {
    const said = dataText(r.stdout ?? "").trim();
    writeRefusedAndEmit(cfg.feature, "chain-red", said || "check-plan-spec-agree.mjs reported RED with no message");
  }
  emitUnusable(cfg.feature, "child-crashed", crashedDetail("check-plan-spec-agree.mjs", r, "the spec->plan chain was not checked"));
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 3 — pairs: EVAL_PAIR_RULE over the PLAN's `## Files` and git's own `-z` listing.
 *  ---------------------------------------------------------------------------------------------- */
function phasePairs(cfg, planPath) {
  const parsed = pathsFromPlanFiles(readFileSync(planPath, "utf8"));
  if (!parsed.ok) writeRefusedAndEmit(cfg.feature, "plan-files-unparseable", `${planPath}: ${parsed.reason}`);
  const declared = parsed.value.map(clean);
  const ls = gitSync(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  if (!ls.ok) {
    emitUnusable(cfg.feature, "git-failed", `git ls-files -z --cached --others --exclude-standard failed: ${dataText(ls.stderr)}`);
  }
  return featureEvalPairs({ declared, listing: nulList(ls.stdout) });
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 4 — verifiers: `count-verifiers.mjs .`, always with an explicit target (L41).
 *  ---------------------------------------------------------------------------------------------- */
function phaseVerifiers(cfg) {
  const r = spawnSync(process.execPath, [COUNT_VERIFIERS, "."], { encoding: "utf8" });
  let parsed = null;
  if (!r.error && r.status === 0) {
    try {
      parsed = JSON.parse(r.stdout);
    } catch {
      parsed = null;
    }
  }
  if (!isVerifierCount(parsed)) {
    emitUnusable(
      cfg.feature,
      "child-crashed",
      `count-verifiers.mjs did not report a verifier count (exit ${dataText(r.status)}) — verifier membership was not read, and no gate was run`
    );
  }
  return parsed;
}

/** ------------------------------------------------------------------------------------------------
 *  PHASE 5 — init: open the gate-run record; then the completeness capture must be well-shaped.
 *  ---------------------------------------------------------------------------------------------- */
function readCompletenessText() {
  try {
    return readFileSync(COMPLETENESS, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return null;
    throw e;
  }
}

function phaseInit(cfg, pairs) {
  const args = ["init", "--stage", "verify", "--feature", cfg.feature, "--out", VERIFY_PATHS.gates];
  if (cfg.gatesSpec !== null) args.push("--gates", cfg.gatesSpec);
  else if (existsSync("package.json")) args.push("--discover", "package.json");
  if (pairs.length) args.push("--extra", JSON.stringify(pairs));
  const r = spawnSync(process.execPath, [RUN_GATES, ...args], { encoding: "utf8" });
  let parsed;
  try {
    parsed = JSON.parse(r.stdout || "");
  } catch {
    parsed = null;
  }
  if (r.status === 3) emitQuestion(cfg.feature, "no-gates", cfg.originalArgv);
  if (r.status !== 0 || parsed === null || parsed.ok !== true) {
    const why = parsed ? `${dataText(parsed.reason_code)}: ${dataText(parsed.reason)}` : dataText(r.stderr || r.stdout || "no output");
    emitUnusable(cfg.feature, "child-refused", `run-gates.mjs init --stage verify refused (exit ${dataText(r.status)}): ${why}`);
  }
  const c = checkCompleteness(readCompletenessText());
  if (!c.ok) {
    emitUnusable(
      cfg.feature,
      "child-crashed",
      `check-build-complete.mjs left no usable completeness capture (${c.reason}) — it crashed, which is no verdict; no gate was run`
    );
  }
}

/** ------------------------------------------------------------------------------------------------
 *  THE PROGRESS RECORD — written at the top of "drain" and of "verdict" (RESUMABLE_PHASES; the phase literals passed
 *  here are pinned equal to that set by a test, GRILL G11).
 *  ---------------------------------------------------------------------------------------------- */
function checkpoint(state, phase) {
  state.phase = phase;
  const rec = {
    schema: PROGRESS_SCHEMA,
    feature: state.feature,
    timeoutMs: state.timeoutMs,
    budgetMs: state.budgetMs,
    phase: state.phase,
    verifiers: state.verifiers,
  };
  const v = validateProgress(rec);
  if (!v.ok) throw new Error(`internal: refusing to persist a malformed progress record: ${v.reason}`);
  mkdirSync(VERIFY_PATHS.root, { recursive: true });
  writeFileSync(VERIFY_PATHS.stageJson, JSON.stringify(rec, null, 2));
}

/** ------------------------------------------------------------------------------------------------
 *  THE REST OF THE PHASE MACHINE, shared by a fresh run and a resumed one. `state.phase` is the NEXT phase.
 *  ---------------------------------------------------------------------------------------------- */
function runPhases(state, budget) {
  if (state.phase === "drain") {
    checkpoint(state, "drain");
    const res = drainGates({ outDir: VERIFY_PATHS.gates, timeoutMs: state.timeoutMs, budget });
    if (res.kind === "budget") emitContinue(state.feature, "drain", ["--resume"]);
    if (res.kind === "refused") {
      const why = res.parsed
        ? `${dataText(res.parsed.reason_code)}: ${dataText(res.parsed.reason)}`
        : dataText(res.stderr || res.stdout || "no output");
      emitUnusable(state.feature, "child-refused", `run-gates.mjs run --next (${VERIFY_PATHS.gates}) refused: ${why}`);
    }
    state.phase = "verdict";
  }

  // "verdict" — the record stays parked here through "render": a kill in either re-derives both from the durable
  // stamp and capture (over an unchanged tree, the same report — GRILL G8).
  checkpoint(state, "verdict");
  const r = spawnSync(process.execPath, [CHECK_VERIFY, "--stamp", STAMP, "--feature", state.feature, "--ac-gate"], { encoding: "utf8" });
  const verdict = classifyVerdict({ status: r.status, stdout: r.stdout, error: r.error ?? null });
  if (!verdict.ok) emitUnusable(state.feature, "child-crashed", verdict.reason);
  const completeness = checkCompleteness(readCompletenessText());
  if (!completeness.ok) {
    emitUnusable(state.feature, "child-crashed", `the completeness capture is no longer usable (${completeness.reason})`);
  }
  const composed = composeReport({ checker: verdict.report, completeness: completeness.value, verifiers: state.verifiers });
  if (!composed.ok) emitUnusable(state.feature, "child-crashed", composed.reason);

  // "render" — a containment walk before each write (writeIntoFeature), the report first.
  const reportPath = `${featureDir(state.feature)}/verify-report.json`;
  const renderPath = `${featureDir(state.feature)}/VERIFY.md`;
  writeIntoFeature(state.feature, reportPath, JSON.stringify(composed.report, null, 2) + "\n");
  writeIntoFeature(state.feature, renderPath, renderDone(composed.report));
  removeIfPresent(VERIFY_PATHS.stageJson);
  emit(doneExit({ stage: "verify", feature: state.feature, verdict: composed.report.verdict, report: reportPath, render: renderPath }));
}

/** ------------------------------------------------------------------------------------------------
 *  FRESH entry point.
 *  ---------------------------------------------------------------------------------------------- */
function runFresh(args) {
  const invocationStart = Date.now(); // the budget clock — FIRST, so the opening fast work is charged
  const feature = extractFeature(args);
  containmentGuard(feature);
  removeEarlierOutput(feature);
  const cfg = parseRestOfArgv(args, feature);
  const { planPath, specPath } = requireArtifacts(cfg);
  phaseChain(cfg, planPath, specPath);
  const pairs = phasePairs(cfg, planPath);
  const verifiers = phaseVerifiers(cfg);
  phaseInit(cfg, pairs);
  const state = { feature, timeoutMs: cfg.timeoutMs, budgetMs: cfg.budgetMs, phase: "drain", verifiers };
  return runPhases(state, makeBudget(state, invocationStart));
}

/** ------------------------------------------------------------------------------------------------
 *  RESUME entry point. Accepts ONLY --budget-ms (with a value); reads everything else from the progress record.
 *  ---------------------------------------------------------------------------------------------- */
function runResume(args) {
  const invocationStart = Date.now(); // the budget clock — FIRST
  const resume = parseResumeArgv(args);
  if (!resume.ok) emitUnusable(null, "usage-error", resume.detail);
  const budget = parseBudgetMs(args); // a trailing `--budget-ms` with no value is refused here (M7b)
  if (!budget.ok) emitUnusable(null, "usage-error", budget.detail);

  containmentGuard(null); // `.pharn` and `.pharn/pharn-verify` before the record is read (A4)
  let raw;
  try {
    raw = readFileSync(VERIFY_PATHS.stageJson, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") emitUnusable(null, "no-progress", `no progress record at ${VERIFY_PATHS.stageJson} — nothing to resume`);
    throw e;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    emitUnusable(null, "progress-malformed", `${VERIFY_PATHS.stageJson} is not valid JSON`);
  }
  const v = validateProgress(parsed);
  if (!v.ok) {
    const named =
      parsed !== null && typeof parsed === "object" && typeof parsed.feature === "string" && FEATURE_SLUG_RE.test(parsed.feature);
    emitUnusable(named ? parsed.feature : null, "progress-malformed", v.reason);
  }
  containmentGuard(parsed.feature); // the feature directory too, before any write (A4)

  const state = {
    feature: parsed.feature,
    timeoutMs: parsed.timeoutMs,
    budgetMs: resume.budgetOverride !== undefined ? resume.budgetOverride : parsed.budgetMs,
    phase: parsed.phase,
    verifiers: parsed.verifiers,
  };
  return runPhases(state, makeBudget(state, invocationStart));
}

function main(argv) {
  const args = argv.slice(2);
  if (has(args, "--resume")) return runResume(args);
  return runFresh(args);
}

if (import.meta.main) {
  try {
    main(process.argv);
  } catch (e) {
    if (e !== EMITTED) {
      console.error(`stage-verify: ${e && e.stack ? e.stack : e}`);
      process.exitCode = 1; // a genuine crash — no JSON document (see the header)
    }
  }
}
