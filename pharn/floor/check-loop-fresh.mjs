#!/usr/bin/env node
// pharn/floor/check-loop-fresh.mjs — the FRESHNESS check /pharn-loop reads before its stop decision and
// again at its commit gate: does the evidence the stop rests on belong to THIS tree, and if it does not,
// which stage must be re-run?
//
// ============================== WHY THIS EXISTS (P7 — a recorded failure) ==============================
//
// CHANGELOG.md §6.3.0 records a dogfooded, unattended /pharn-loop run that "skipped /pharn-grill,
// /pharn-regress and /pharn-verify entirely" and still wrote a floor-grade-looking decision. Two later
// increments each closed half of that, and each said plainly what it did not close:
//   • check-loop-decision.mjs (#222) re-derives a decision FROM the reports it cites — and cannot see a
//     report that was never honestly produced ("a self-consistent fabricated pair still passes");
//   • gate-run-core.mjs / run-gates.mjs (#230) made the gate map tested code — and wrote the stamp's
//     `fingerprint.final` for "a later increment" to compare, naming FRESHNESS and "that the stage ran at
//     all" as not proven.
// So an iteration that skips /pharn-regress or /pharn-verify still found the PREVIOUS iteration's report and
// stamp on disk, and nothing noticed. This file is that later increment.
//
// WHY A SEPARATE CHECKER, NOT A CHANGE TO check-loop.mjs: that file's input signature being "ONLY the two
// verdict reports + iter/cap" is a load-bearing, structural claim in /pharn-loop's own description (no
// advisory stage can gate the stop). A filesystem fingerprint input would break it. So the command reads
// THIS checker first, and check-loop.mjs stays byte-identical.
//
// ====================================== THE CHECKS (first failure decides) ======================================
//
//   A  both reports exist and parse, with a verdict in their stage's enum     → RERUN · report-missing / report-malformed
//   B  a report's `reason_code`, when present, is a member and a LAPSE        → lapse RERUN · empty-source-set STOP (S4)
//                                                                               · other member STOP with that code
//                                                                               · non-member RERUN report-malformed
//   C  each stamp exists and validateStamp passes for its stage/side/feature  → missing / lapse RERUN · otherwise STOP
//   D  each report's gate_run.stamp_sha256 = sha256(the stamp's raw bytes)    → RERUN · report-stamp-unbound
//   J  every recorded stdout/stderr sha256 = sha256(its log on disk)          → STOP  · output-hash-mismatch
//   E  a LIVE re-run of check-verify.mjs / check-regress.mjs reproduces the
//      report's FLOOR fields                                                  → STOP  · report-verdict-mismatch
//   H  the regress BASE stamp's `head` = --base                               → STOP  · base-head-mismatch
//   F  the verify stamp's fingerprint {algo, final} = the live tree now        → RERUN verify · tree-moved-since-verify
//   G  the regress HEAD stamp's final = the verify stamp's init (same algo)    → RERUN regress · regress-verify-tree-mismatch
//   I  (--front) check-spec-approved, check-plan-spec-agree, check-plan-lessons
//      exit 0, GRILL.md exists, and check-test-stage --require-test-first
//      exits 0 (6.19.0)                                                       → STOP  · front-stage-red
//
// The ORDER is load-bearing: the fabrication checks (J, E, H) run BEFORE the staleness checks (F, G), so a
// forged report STOPS the run instead of being "refreshed" by a re-run that would overwrite the evidence.
//
// A RERUN becomes a STOP `rerun-budget-exhausted` once `--max-reruns` rows exist in the budget ledger for
// that (iter, stage); under `--commit-gate` every RERUN becomes a STOP carrying its own code, because at
// commit time there is no stage left to re-run.
//
// ====================================== HONEST SCOPE (P0) ======================================
//
// FLOOR, at the moment it runs, given the flags the command passes:
//   • each report on disk is the output its checker produces from a stamp that validates (C + D + E);
//   • the verify stamp describes the tree as it is now (F — content-hash);
//   • the regress head stamp describes the same tree the verify stamp started from (G — content-hash);
//   • the regress base stamp is the loop's own base SHA (H);
//   • the recorded gate logs are the logs on disk (J — content-hash);
//   • an orchestration-lapse code re-runs the stage and a fabricated verdict stops the run (B / E).
//
// NOT COVERED, each stated rather than discovered:
//   • FORGERY. Stamps, reports, logs and the budget ledger all live in the writable tree, which `Bash`
//     reaches unhooked (LIMITS.md §6). This certifies AGREEMENT between those artifacts and the live tree,
//     never PROVENANCE (lessons-learned L43) — a self-consistent fabricated set passes, and a test builds
//     one to prove it.
//   • RECENCY. Freshness is TREE IDENTITY, not run recency: if a build changed nothing, the previous
//     iteration's stamp still matches and passes. The stamp records no timestamp, so nothing here can say
//     WHEN it was written. A test proves this bound. Closing it needs referent binding (the session
//     transcript, the `check-cost-ledger.mjs --verify-transcript` precedent) — a named follow-up, PENDING.
//   • ITS OWN INTEGRITY. It runs from the worktree and spawns the worktree's checkers, so a modified copy of
//     it or of a sibling can print FRESH over anything. `pharn/floor/` is always-reconciled, which means a
//     modification is caught by `reconcile` — run from the same worktree. That is circular, not a guarantee
//     (the check-bash-reconcile.mjs bound, inherited).
//   • Whether the front stages did real WORK: GRILL.md presence is membership only.
//   • That /pharn-test ran in THIS run. check-test-stage.mjs (6.19.0) certifies that its evidence holds for the files
//     on disk — the mapping agrees with the SPEC and PLAN, the lock pins the tests and records a red run (or a bootstrap,
//     or the SPEC is legacy). Stale test evidence is a STOP, never a RERUN: this check runs after the build, when the
//     implementation exists, so a re-run of /pharn-test would read `ac-test-passes-before-build` by construction.
//   • Phase markers are not consulted.
//
// Check J's one legitimate-looking trip, named so it is not a mystery stop: a gate that leaves a DETACHED
// descendant holding its log fd (the runner kills the group only on timeout) can append after the runner
// hashed the file. Anything else is an edit to, or a prune of, `.pharn/`.
//
// DELIBERATE CO-LOCATION (P3, stated): the re-run BUDGET ledger is a second, smaller concern — the re-run
// policy can change without the freshness rules changing. It stays in this file because it is ~40 lines,
// has exactly one caller (the RERUN branch below), and splitting it would add a module whose only importer
// is this one.
//
// TRUST (P2): operands are two reports and three stamps (deterministic-tool JSON), their gate logs
// (UNTRUSTED free text — HASHED, never read), and SPEC/PLAN/lessons PATHS handed to the front checkers.
// No free-text field is read. JSON is parsed and used as string/int/hex operands only — never eval'd,
// imported, or compiled into a RegExp. Child processes are the five existing checkers with fixed argv
// built from shape-gated values. `reason` is this checker's own diagnostic; it never quotes a log.
//
// Usage:
//   node pharn/floor/check-loop-fresh.mjs --feature <name> --base <40-hex> (--iter <N> | --commit-gate) [--front]
//        [--repo <dir>] [--verify-stamp <p>] [--regress-head-stamp <p>] [--regress-base-stamp <p>] [--max-reruns <R>]
//   Every relative path resolves against --repo (default `.`, the project root the loop runs from).
//
// Exit: 0 FRESH · 1 RERUN the named stage · 2 INCONCLUSIVE (unusable input — FAIL-CLOSED) · 4 STOP (not
//       re-runnable: a non-lapse cause, the budget is spent, or --commit-gate). stdout is ONE JSON document:
//       {verdict, stage_to_rerun, reason_code, reason, checks, reruns_used}.

import { readFileSync, existsSync, lstatSync, mkdirSync, appendFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_SLUG_RE, SHA_RE, LAPSE_CODES, isReasonCode, validateStamp, logBasename } from "./gate-run-core.mjs";
import { fingerprint } from "./worktree-fingerprint.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The five checkers this one re-runs as CLIs (spawnSync — never a sibling import of their internals,
 *  the check-loop-decision.mjs idiom), resolved beside THIS file so the cwd cannot re-point them. */
const CHECKERS = Object.freeze({
  verify: join(HERE, "check-verify.mjs"),
  regress: join(HERE, "check-regress.mjs"),
  specApproved: join(HERE, "check-spec-approved.mjs"),
  planSpecAgree: join(HERE, "check-plan-spec-agree.mjs"),
  planLessons: join(HERE, "check-plan-lessons.mjs"),
  testStage: join(HERE, "check-test-stage.mjs"),
});

/** The product feature root. ONE literal in this module, pinned by a closure test (L52). */
export const FEATURE_BASE = "pharn/features";

/** The stamp locations the two stage commands pin (pharn-verify.md Step 3c, pharn-regress.md Step 4b). */
export const DEFAULT_STAMPS = Object.freeze({
  verify: ".pharn/pharn-verify/gates/stamp.json",
  regressHead: ".pharn/pharn-regress/head/stamp.json",
  regressBase: ".pharn/pharn-regress/base-gates/stamp.json",
});

/** The budget ledger's directory; the file is `<LEDGER_DIR>/<name>/freshness.jsonl`. /pharn-loop Step 1a
 *  already creates `.pharn/pharn-loop/<name>/`. */
export const LEDGER_DIR = ".pharn/pharn-loop";
export const LEDGER_FILE = "freshness.jsonl";
export const DEFAULT_MAX_RERUNS = 1;
export const LESSONS_CANON = "memory-bank/lessons-learned.md";

/** The check ids, in evaluation order. Materialized once; the tests iterate it (L29/L52). */
export const CHECKS = Object.freeze(["A", "B", "C", "D", "J", "E", "H", "F", "G", "I"]);

export const EXIT = Object.freeze({ FRESH: 0, RERUN: 1, INCONCLUSIVE: 2, STOP: 4 });

const VERIFY_VERDICTS = new Set(["PASS", "FAIL", "INCOMPLETE", "INCONCLUSIVE"]);
const REGRESS_VERDICTS = new Set(["no-regressions", "regressions", "inconclusive"]);
const LAPSE_SET = new Set(LAPSE_CODES);

/** The report fields each live re-derivation must reproduce: what check-loop.mjs reads (`failing_gates`
 *  decides a reconcile red) plus the verbatim spine the stage copies from its checker. */
export const COMPARED_FIELDS = Object.freeze({
  verify: Object.freeze(["verdict", "failing_gates", "gates"]),
  regress: Object.freeze(["verdict", "regressions", "pre_existing", "outside_gates"]),
});

/** ------------------------------------------------------------------------------------------------
 *  Helpers.
 *  ---------------------------------------------------------------------------------------------- */

function sha256(bufOrText) {
  return createHash("sha256").update(bufOrText).digest("hex");
}

function sha256File(file) {
  try {
    return sha256(readFileSync(file));
  } catch {
    return null;
  }
}

/** Key-sorted JSON, so an equality test does not depend on the order a writer happened to emit keys in. */
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v !== null && typeof v === "object") {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}

function readJsonFile(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return { state: "missing" };
  }
  try {
    return { state: "ok", raw, value: JSON.parse(raw) };
  } catch (e) {
    return { state: "malformed", raw, reason: e.message };
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** A check failure: `{check, action, stage, reason_code, reason}`. `action` is "rerun" or "stop"; `stage`
 *  names what a rerun would re-run. Every call site spells `reason_code: "<member>"` literally where it is
 *  a constant, so the ✧ closure scans in gate-run-core.test.mjs see every emitted member (L36). */
function failure(f) {
  return { ok: false, ...f };
}

/** ------------------------------------------------------------------------------------------------
 *  Argument parsing — strict and fail-closed. Every malformed invocation is INCONCLUSIVE (exit 2).
 *  ---------------------------------------------------------------------------------------------- */
const VALUE_FLAGS = new Set([
  "--feature",
  "--base",
  "--iter",
  "--repo",
  "--verify-stamp",
  "--regress-head-stamp",
  "--regress-base-stamp",
  "--max-reruns",
]);
const BOOL_FLAGS = new Set(["--front", "--commit-gate"]);

export function parseArgs(argv) {
  const flags = new Map();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!VALUE_FLAGS.has(a) && !BOOL_FLAGS.has(a)) return { ok: false, reason: `unrecognized argument: ${JSON.stringify(a)}` };
    if (flags.has(a)) return { ok: false, reason: `repeated flag: ${a}` };
    if (BOOL_FLAGS.has(a)) {
      flags.set(a, true);
      continue;
    }
    if (i + 1 >= argv.length) return { ok: false, reason: `${a} requires a value` };
    flags.set(a, argv[++i]);
  }
  const feature = flags.get("--feature");
  if (typeof feature !== "string" || !FEATURE_SLUG_RE.test(feature)) {
    return { ok: false, reason: `--feature must be a plain slug matching ${FEATURE_SLUG_RE}` };
  }
  const base = flags.get("--base");
  if (typeof base !== "string" || !SHA_RE.test(base)) {
    return { ok: false, reason: "--base must be the loop's resolved 40-hex base SHA" };
  }
  const commitGate = flags.get("--commit-gate") === true;
  const iterRaw = flags.get("--iter");
  if (commitGate && iterRaw !== undefined) return { ok: false, reason: "--iter and --commit-gate are mutually exclusive" };
  if (!commitGate && (iterRaw === undefined || !/^[1-9]\d{0,5}$/.test(iterRaw))) {
    return { ok: false, reason: "--iter <N> (a positive integer) is required unless --commit-gate" };
  }
  const maxRaw = flags.get("--max-reruns");
  if (maxRaw !== undefined && !/^\d{1,3}$/.test(maxRaw)) return { ok: false, reason: "--max-reruns must be a non-negative integer" };
  return {
    ok: true,
    feature,
    base,
    commitGate,
    iter: commitGate ? null : Number(iterRaw),
    front: flags.get("--front") === true,
    repo: flags.get("--repo") ?? ".",
    stamps: {
      verify: flags.get("--verify-stamp") ?? DEFAULT_STAMPS.verify,
      regressHead: flags.get("--regress-head-stamp") ?? DEFAULT_STAMPS.regressHead,
      regressBase: flags.get("--regress-base-stamp") ?? DEFAULT_STAMPS.regressBase,
    },
    maxReruns: maxRaw === undefined ? DEFAULT_MAX_RERUNS : Number(maxRaw),
  };
}

/** ------------------------------------------------------------------------------------------------
 *  The checks. Each returns {ok: true, ...facts} or a failure(); the caller stops at the first failure.
 *  ---------------------------------------------------------------------------------------------- */

const REPORTS = Object.freeze([
  { stage: "verify", file: "verify-report.json", verdicts: VERIFY_VERDICTS },
  { stage: "regress", file: "regression-report.json", verdicts: REGRESS_VERDICTS },
]);

function checkA(ctx) {
  for (const r of REPORTS) {
    const path = join(ctx.featureDir, r.file);
    const j = readJsonFile(path);
    if (j.state === "missing")
      return failure({
        check: "A",
        action: "rerun",
        stage: r.stage,
        reason_code: "report-missing",
        reason: `${r.file} is absent — /pharn-${r.stage} did not write it this run`,
      });
    if (j.state === "malformed" || !isPlainObject(j.value)) {
      return failure({
        check: "A",
        action: "rerun",
        stage: r.stage,
        reason_code: "report-malformed",
        reason: `${r.file} is not a JSON object`,
      });
    }
    if (typeof j.value.verdict !== "string" || !r.verdicts.has(j.value.verdict)) {
      return failure({
        check: "A",
        action: "rerun",
        stage: r.stage,
        reason_code: "report-malformed",
        reason: `${r.file} .verdict ${JSON.stringify(j.value.verdict)} is outside its enum`,
      });
    }
    ctx.reports[r.stage] = j.value;
  }
  return { ok: true };
}

function checkB(ctx) {
  for (const r of REPORTS) {
    const code = ctx.reports[r.stage].reason_code;
    if (code === undefined || code === null) continue;
    if (typeof code !== "string" || !isReasonCode(code)) {
      return failure({
        check: "B",
        action: "rerun",
        stage: r.stage,
        reason_code: "report-malformed",
        reason: `${r.file} carries a reason_code outside the closed vocabulary`,
      });
    }
    if (LAPSE_SET.has(code)) {
      return failure({
        check: "B",
        action: "rerun",
        stage: r.stage,
        reason_code: code,
        reason: `${r.file} records the orchestration lapse ${code} — re-run /pharn-${r.stage}`,
      });
    }
    if (code === "empty-source-set") {
      return failure({
        check: "B",
        action: "stop",
        stage: r.stage,
        reason_code: code,
        reason: `${r.file} records an EMPTY gate set — this is stuck point S4 (blocked: no-gates), not stale evidence`,
      });
    }
    return failure({
      check: "B",
      action: "stop",
      stage: r.stage,
      reason_code: code,
      reason: `${r.file} records the fail-closed refusal ${code}, which a re-run would not change`,
    });
  }
  return { ok: true };
}

const STAMPS = Object.freeze([
  { key: "verify", stage: "verify", expect: { stage: "verify", side: null } },
  { key: "regressHead", stage: "regress", expect: { stage: "regress", side: "head" } },
  { key: "regressBase", stage: "regress", expect: { stage: "regress", side: "base" } },
]);

function checkC(ctx) {
  for (const s of STAMPS) {
    const path = ctx.stampPaths[s.key];
    const j = readJsonFile(path);
    if (j.state === "missing")
      return failure({
        check: "C",
        action: "rerun",
        stage: s.stage,
        reason_code: "stamp-missing",
        reason: `the ${s.key} stamp is absent at ${ctx.rel(path)}`,
      });
    if (j.state === "malformed")
      return failure({
        check: "C",
        action: "stop",
        stage: s.stage,
        reason_code: "stamp-malformed",
        reason: `the ${s.key} stamp at ${ctx.rel(path)} is not valid JSON`,
      });
    const v = validateStamp(j.value, { ...s.expect, feature: ctx.feature });
    if (!v.ok) {
      const action = LAPSE_SET.has(v.reason_code) ? "rerun" : "stop";
      return failure({
        check: "C",
        action,
        stage: s.stage,
        reason_code: v.reason_code,
        reason: `the ${s.key} stamp at ${ctx.rel(path)}: ${v.reason}`,
      });
    }
    ctx.stamps[s.key] = { path, raw: j.raw, value: j.value, sha256: sha256(j.raw) };
  }
  return { ok: true };
}

function checkD(ctx) {
  const gr = ctx.reports.verify.gate_run;
  if (!isPlainObject(gr) || gr.stamp_sha256 !== ctx.stamps.verify.sha256) {
    return failure({
      check: "D",
      action: "rerun",
      stage: "verify",
      reason_code: "report-stamp-unbound",
      reason: "verify-report.json's gate_run.stamp_sha256 does not name the verify stamp on disk",
    });
  }
  const rg = ctx.reports.regress.gate_run;
  for (const [side, key] of [
    ["base", "regressBase"],
    ["head", "regressHead"],
  ]) {
    if (!isPlainObject(rg) || !isPlainObject(rg[side]) || rg[side].stamp_sha256 !== ctx.stamps[key].sha256) {
      return failure({
        check: "D",
        action: "rerun",
        stage: "regress",
        reason_code: "report-stamp-unbound",
        reason: `regression-report.json's gate_run.${side}.stamp_sha256 does not name the ${side} stamp on disk`,
      });
    }
  }
  return { ok: true };
}

function checkJ(ctx) {
  for (const s of STAMPS) {
    const st = ctx.stamps[s.key];
    const dir = dirname(st.path);
    for (const run of st.value.runs) {
      const base = logBasename(run.seq, run.id);
      for (const [ext, field] of [
        ["out", "stdout_sha256"],
        ["err", "stderr_sha256"],
      ]) {
        const onDisk = sha256File(join(dir, `${base}.${ext}`));
        if (onDisk !== (run[field] ?? null)) {
          return failure({
            check: "J",
            action: "stop",
            stage: s.stage,
            reason_code: "output-hash-mismatch",
            reason:
              `the ${s.key} stamp's ${field} for gate ${JSON.stringify(run.id)} does not match ${base}.${ext} on disk — the log was edited, pruned, or ` +
              `appended to after the runner hashed it (a detached descendant holding the log fd can do the last)`,
          });
        }
      }
    }
  }
  return { ok: true };
}

/** Run one checker CLI and parse its stdout JSON. A checker's own non-zero exit is DATA (a FAIL verdict
 *  exits 1); only an unparseable output is an error, surfaced as unusable. */
function rerunChecker(ctx, script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: ctx.repo, encoding: "utf8" });
  if (r.error) return { ok: false, reason: `could not run ${script}: ${r.error.message}` };
  try {
    return { ok: true, value: JSON.parse(r.stdout) };
  } catch {
    return { ok: false, reason: `${script} produced no parseable JSON (exit ${r.status})` };
  }
}

function checkE(ctx) {
  const v = rerunChecker(ctx, CHECKERS.verify, ["--stamp", ctx.stamps.verify.path, "--feature", ctx.feature]);
  if (!v.ok) return { ok: false, unusable: true, reason: v.reason };
  for (const f of COMPARED_FIELDS.verify) {
    if (canonical(v.value[f]) !== canonical(ctx.reports.verify[f])) {
      return failure({
        check: "E",
        action: "stop",
        stage: "verify",
        reason_code: "report-verdict-mismatch",
        reason: `verify-report.json's ${f} is not what check-verify.mjs computes from the verify stamp now — the report was not produced from that stamp`,
      });
    }
  }
  const baseHead = ctx.stamps.regressBase.value.head;
  const g = rerunChecker(ctx, CHECKERS.regress, [
    "verdict",
    "--base-stamp",
    ctx.stamps.regressBase.path,
    "--head-stamp",
    ctx.stamps.regressHead.path,
    "--base",
    String(baseHead),
  ]);
  if (!g.ok) return { ok: false, unusable: true, reason: g.reason };
  for (const f of COMPARED_FIELDS.regress) {
    if (canonical(g.value[f]) !== canonical(ctx.reports.regress[f])) {
      return failure({
        check: "E",
        action: "stop",
        stage: "regress",
        reason_code: "report-verdict-mismatch",
        reason: `regression-report.json's ${f} is not what check-regress.mjs computes from the two regress stamps now — the report was not produced from them`,
      });
    }
  }
  return { ok: true };
}

function checkH(ctx) {
  const head = ctx.stamps.regressBase.value.head;
  if (head !== ctx.base) {
    return failure({
      check: "H",
      action: "stop",
      stage: "regress",
      reason_code: "base-head-mismatch",
      reason: `the regress base stamp records head ${JSON.stringify(head)}, not the loop's base ${ctx.base}`,
    });
  }
  return { ok: true };
}

function checkF(ctx) {
  const fp = fingerprint(ctx.repo, { feature: ctx.feature });
  if (!fp.ok) return { ok: false, unusable: true, reason: `cannot fingerprint ${ctx.repo}: ${fp.reason}` };
  const sf = ctx.stamps.verify.value.fingerprint;
  if (sf.algo !== fp.algo || sf.final !== fp.digest) {
    return failure({
      check: "F",
      action: "rerun",
      stage: "verify",
      reason_code: "tree-moved-since-verify",
      reason:
        sf.algo !== fp.algo
          ? `the verify stamp was fingerprinted with ${sf.algo}, the live tree with ${fp.algo}`
          : "the worktree changed after /pharn-verify finalized its stamp — its verdict describes a tree that no longer exists",
    });
  }
  return { ok: true };
}

function checkG(ctx) {
  const h = ctx.stamps.regressHead.value.fingerprint;
  const v = ctx.stamps.verify.value.fingerprint;
  if (h.algo !== v.algo || h.final !== v.init) {
    return failure({
      check: "G",
      action: "rerun",
      stage: "regress",
      reason_code: "regress-verify-tree-mismatch",
      reason: "the regress head stamp did not end on the tree /pharn-verify started from — regress judged a different tree",
    });
  }
  return { ok: true };
}

function checkI(ctx) {
  const spec = join(ctx.featureDir, "SPEC.md");
  const plan = join(ctx.featureDir, "PLAN.md");
  const runs = [
    ["check-spec-approved", CHECKERS.specApproved, [spec]],
    ["check-plan-spec-agree", CHECKERS.planSpecAgree, [plan, spec]],
    ["check-plan-lessons", CHECKERS.planLessons, [plan, join(ctx.repo, LESSONS_CANON)]],
  ];
  for (const [name, script, args] of runs) {
    const r = spawnSync(process.execPath, [script, ...args], { cwd: ctx.repo, encoding: "utf8" });
    if (r.error) return { ok: false, unusable: true, reason: `could not run ${name}: ${r.error.message}` };
    if (r.status !== 0)
      return failure({
        check: "I",
        action: "stop",
        stage: "front",
        reason_code: "front-stage-red",
        reason: `${name} exits ${r.status} — the front of the pipeline no longer holds`,
      });
  }
  if (!existsSync(join(ctx.featureDir, "GRILL.md")))
    return failure({
      check: "I",
      action: "stop",
      stage: "front",
      reason_code: "front-stage-red",
      reason: "GRILL.md is absent — /pharn-grill did not run",
    });
  // The test stage (6.19.0), run from the project root because the lock resolves test paths against the cwd.
  // `--require-test-first`: the loop's policy, in the checker (REVIEW finding 2) — it never writes a legacy SPEC and
  // never approves a test-infra one, so a bootstrap or legacy reading here means the SPEC changed around the gate.
  const t = spawnSync(process.execPath, [CHECKERS.testStage, ctx.feature, "--require-test-first"], { cwd: ctx.repo, encoding: "utf8" });
  if (t.error) return { ok: false, unusable: true, reason: `could not run check-test-stage: ${t.error.message}` };
  if (t.status !== 0) {
    // The first line's closed token (`RED <reason>`), plus the first RED line a child printed — for a lock RED that is
    // the lock script's own line, naming a path from the lock: a TRUNCATED, UNTRUSTED string (the lock is an
    // agent-editable file), never a test's content, and JSON-escaped in the output. A mutating gate (an inline snapshot, a
    // `--fix` linter) can rewrite a pinned test after the red run, and /pharn-test cannot be re-run after the build,
    // so the remedy named is a re-plan or a person (grill G9).
    const lines = String(t.stdout ?? "").split("\n");
    const token = lines[0].split(" — ")[0];
    const childRed = (lines.find((l) => /^\s+RED — /.test(l)) ?? "").trim().slice(0, 200);
    return failure({
      check: "I",
      action: "stop",
      stage: "front",
      reason_code: "front-stage-red",
      reason:
        `check-test-stage exits ${t.status} (${token})${childRed ? ` [${childRed}]` : ""} — /pharn-test's evidence does not hold ` +
        "for this tree, and it cannot be re-run after the build: a re-plan, or a person",
    });
  }
  return { ok: true };
}

const RUNNERS = Object.freeze({
  A: checkA,
  B: checkB,
  C: checkC,
  D: checkD,
  J: checkJ,
  E: checkE,
  H: checkH,
  F: checkF,
  G: checkG,
  I: checkI,
});

/** ------------------------------------------------------------------------------------------------
 *  The re-run BUDGET — a counter the checker keeps, not a sentence in command prose.
 *  ---------------------------------------------------------------------------------------------- */

/** `lstat` or null. NEVER `existsSync` here: it FOLLOWS a symlink, so a DANGLING link reads as absent and the
 *  append below would then write through it, outside the state root. Found by the dangling-link test. */
function lstatOrNull(p) {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
}

/** The ledger path, containment-checked: under `<repo>/.pharn/`, built from a shape-gated slug, and no
 *  component that exists — including a DANGLING link, which `lstat` sees and `stat` does not — may be a
 *  symlink. */
function ledgerPath(ctx) {
  const parts = [...LEDGER_DIR.split("/"), ctx.feature, LEDGER_FILE];
  let cur = ctx.repo;
  for (const p of parts) {
    cur = join(cur, p);
    const st = lstatOrNull(cur);
    if (st && st.isSymbolicLink()) return { ok: false, reason: `refusing a budget ledger path through the symlink ${ctx.rel(cur)}` };
  }
  return { ok: true, dir: dirname(cur), file: cur };
}

function readLedger(file) {
  if (!existsSync(file)) return { ok: true, rows: [] };
  const rows = [];
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      return { ok: false };
    }
    if (!isPlainObject(row) || !Number.isInteger(row.iter) || typeof row.stage !== "string") return { ok: false };
    rows.push(row);
  }
  return { ok: true, rows };
}

/** ------------------------------------------------------------------------------------------------
 *  evaluate — the whole verdict, IN-PROCESS: returns {code, doc} and never exits, so the suite can measure
 *  it (a subprocess is invisible to `--experimental-test-coverage`). The CLI below only prints and exits.
 *  ---------------------------------------------------------------------------------------------- */

function result(verdict, code, fields, checks) {
  return {
    code,
    doc: { verdict, stage_to_rerun: null, reason_code: null, reason: null, checks, reruns_used: null, ...fields },
  };
}

/** Unusable input — fail-closed. Called as `inconclusive({ reason_code: "<member>", reason }, checks)` so the
 *  closure scans see the literal (L36). */
function inconclusive({ reason_code, reason }, checks) {
  return result("INCONCLUSIVE", EXIT.INCONCLUSIVE, { reason_code, reason }, checks);
}

export function evaluate(argv) {
  const checks = Object.fromEntries(CHECKS.map((c) => [c, "not-run"]));
  const a = parseArgs(argv);
  if (!a.ok) return inconclusive({ reason_code: "usage-error", reason: a.reason }, checks);

  const repo = resolve(a.repo);
  let isDir = false;
  try {
    isDir = statSync(repo).isDirectory();
  } catch {
    /* absent */
  }
  if (!isDir) return inconclusive({ reason_code: "usage-error", reason: `--repo ${JSON.stringify(a.repo)} is not a directory` }, checks);

  const at = (p) => (isAbsolute(p) ? p : join(repo, p));
  const ctx = {
    repo,
    feature: a.feature,
    base: a.base,
    featureDir: join(repo, FEATURE_BASE, a.feature),
    stampPaths: { verify: at(a.stamps.verify), regressHead: at(a.stamps.regressHead), regressBase: at(a.stamps.regressBase) },
    reports: {},
    stamps: {},
    rel: (p) => (p.startsWith(`${repo}/`) ? p.slice(repo.length + 1) : p),
  };

  let fail = null;
  for (const id of CHECKS) {
    if (id === "I" && !a.front) {
      checks.I = "skipped";
      continue;
    }
    const r = RUNNERS[id](ctx);
    if (r.ok) {
      checks[id] = "pass";
      continue;
    }
    checks[id] = "fail";
    if (r.unusable) return inconclusive({ reason_code: "usage-error", reason: r.reason }, checks);
    fail = r;
    break;
  }

  if (fail === null) {
    return result("FRESH", EXIT.FRESH, { reason: "every check passed — the evidence belongs to this tree" }, checks);
  }
  if (fail.action === "stop") {
    return result("STOP", EXIT.STOP, { reason_code: fail.reason_code, reason: fail.reason }, checks);
  }
  // A RERUN. At the commit gate there is no stage left to re-run, so it is a stop carrying its own code.
  if (a.commitGate) {
    return result(
      "STOP",
      EXIT.STOP,
      {
        reason_code: fail.reason_code,
        reason: `${fail.reason} (at the commit gate a re-run is not offered: the evidence is stale, so the commit does not happen)`,
      },
      checks
    );
  }

  const lp = ledgerPath(ctx);
  if (!lp.ok) return inconclusive({ reason_code: "path-containment", reason: lp.reason }, checks);
  const led = readLedger(lp.file);
  if (!led.ok) {
    return inconclusive(
      { reason_code: "ledger-malformed", reason: `the budget ledger ${ctx.rel(lp.file)} has a line that is not a {iter, stage} JSON row` },
      checks
    );
  }
  const used = led.rows.filter((row) => row.iter === a.iter && row.stage === fail.stage).length;
  if (used >= a.maxReruns) {
    return result(
      "STOP",
      EXIT.STOP,
      {
        reason_code: "rerun-budget-exhausted",
        reason: `/pharn-${fail.stage} was already re-run ${used} time(s) in iteration ${a.iter} (--max-reruns ${a.maxReruns}) and its evidence is still stale: ${fail.reason_code} — ${fail.reason}`,
        reruns_used: used,
      },
      checks
    );
  }
  mkdirSync(lp.dir, { recursive: true });
  appendFileSync(
    lp.file,
    `${JSON.stringify({ ts: new Date().toISOString(), iter: a.iter, stage: fail.stage, reason_code: fail.reason_code })}\n`
  );
  return result(
    "RERUN",
    EXIT.RERUN,
    { stage_to_rerun: fail.stage, reason_code: fail.reason_code, reason: fail.reason, reruns_used: used + 1 },
    checks
  );
}

function main() {
  const { code, doc } = evaluate(process.argv.slice(2));
  console.log(JSON.stringify(doc, null, 2));
  if (code !== EXIT.INCONCLUSIVE) {
    // The bound, on stderr as well as in the header, so a reader of a run's output sees it (L43).
    console.error(
      "NOTE (P0): freshness certifies AGREEMENT between the artifacts and the live tree, never provenance, and tree identity, never run recency."
    );
  }
  process.exit(code);
}

if (import.meta.main) main();
