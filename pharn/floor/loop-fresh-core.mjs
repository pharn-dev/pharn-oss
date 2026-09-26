// pharn/floor/loop-fresh-core.mjs — the FRESHNESS check /pharn-loop reads before its stop decision and
// again at its commit gate: does the evidence the stop rests on belong to THIS tree, and if it does not,
// which stage must be re-run?
//
// This module is the checker; its CLI is check-loop-fresh.mjs, the one command every caller runs (usage and
// exit codes are in that file's header). The CLI loads this module with a dynamic import() (6.21.1), so a
// failure to load it — or any module it imports — or an uncaught throw while it runs is INCONCLUSIVE, never
// node's exit 1, which is this checker's RERUN.
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
//   J  every recorded stdout/stderr sha256 = sha256(its log on disk), and
//      every recorded results_sha256 = sha256(its per-test results file)     → STOP  · output-hash-mismatch
//   E  a LIVE re-run of check-verify.mjs / check-regress.mjs reproduces the
//      report's FLOOR fields — with --ac-gate, the AC gate's block included
//      (6.20.0), over an unmoved tree; over a moved one (6.20.6) the flag-less
//      run, and what the STAMP alone decides (stampDerivedMismatch) — the AC
//      part alone defers to F                                              → STOP  · report-verdict-mismatch
//   H  the regress BASE stamp's `head` = --base                               → STOP  · base-head-mismatch
//   F  the verify stamp's fingerprint {algo, final} = the live tree now        → RERUN verify · tree-moved-since-verify
//   G  the regress HEAD stamp's final = the verify stamp's init (same algo)    → RERUN regress · regress-verify-tree-mismatch
//   I  (--front) check-spec-approved, check-plan-spec-agree, check-plan-lessons
//      exit 0 and GRILL.md exists                                             → STOP  · front-stage-red
//      check-test-stage --require-test-first exits 0 (6.19.0)                 → STOP  · ac-evidence-invalid (6.20.0) on
//                                                                             its RED (exit 1); front-stage-red on exit 2
//                                                                             — how check-test-stage reports a crashed
//                                                                             child since 6.20.6, and a crashed
//                                                                             grandchild since 6.21.1 — or its own
//                                                                             crash, none of which is evidence at all
//
// The ORDER is load-bearing: the fabrication checks (J, E, H) run BEFORE the staleness checks (F, G), so a
// forged report STOPS the run instead of being "refreshed" by a re-run that would overwrite the evidence. Over a
// moved tree that holds for everything the stamp alone decides; a forgery confined to the AC part (the one part that
// reads the live tree) cannot be told from staleness there, so it is re-run at F — never trusted, and a STOP at the
// commit gate.
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
//   • an orchestration-lapse code re-runs the stage and a fabricated verdict stops the run (B / E) — over a moved
//     tree, every part of it the stamp alone decides (the AC part re-runs instead, above);
//   • a failure to load this checker, a throw while it runs, or a result outside its contract is INCONCLUSIVE
//     `checker-crashed` (exit 2), never a RERUN (6.21.1, through the CLI's dynamic import — check-loop-fresh.mjs,
//     whose header names what that cannot catch). The AC ids still come from gate-run-core.mjs, not ac-gate-core.mjs,
//     so the graph that can fail to load stays small (grill R2).
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
//   • What the CLI cannot map to INCONCLUSIVE: a syntax error in check-loop-fresh.mjs itself, a throw a loaded module
//     schedules asynchronously, a module that ends the process, a top-level await that never settles, a signal
//     (check-loop-fresh.mjs, header). None exists in the floor today.
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
// Usage, exit codes and the stdout document: check-loop-fresh.mjs, header. `evaluate` below is the whole verdict.

import { readFileSync, existsSync, lstatSync, mkdirSync, appendFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEATURE_SLUG_RE,
  SHA_RE,
  LAPSE_CODES,
  AC_RESERVED_IDS,
  isReasonCode,
  validateStamp,
  logBasename,
  resultsFileName,
} from "./gate-run-core.mjs";
import { fingerprint } from "./worktree-fingerprint.mjs";
import { sha256RegularFile } from "./test-infra-core.mjs";
import { REGRESS_PATHS } from "./stage-regress-core.mjs";
import { VERIFY_PATHS } from "./stage-verify-core.mjs";

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

/** The stamp locations the two stage scripts write, each DERIVED from its stage core's path table — the one
 *  owner of that stage's scratch layout: stage-verify-core.mjs's VERIFY_PATHS (6.26.0's stage-verify-script)
 *  and stage-regress-core.mjs's REGRESS_PATHS (6.23.0's stage-regress-script) — so this file carries no second
 *  literal for either script's layout to drift from. Both cores import only gate-run-core.mjs, already in
 *  this module's graph, so each adds one small module to it. */
export const DEFAULT_STAMPS = Object.freeze({
  verify: `${VERIFY_PATHS.gates}/stamp.json`,
  regressHead: `${REGRESS_PATHS.head}/stamp.json`,
  regressBase: `${REGRESS_PATHS.baseGates}/stamp.json`,
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
 *  decides a reconcile or an AC-evidence red) plus the verbatim spine the stage copies from its checker — for verify
 *  that includes the AC gate's block (6.20.0), so the per-AC table a report shows is the one the checker computes. */
export const COMPARED_FIELDS = Object.freeze({
  verify: Object.freeze(["verdict", "failing_gates", "gates", "ac_gate"]),
  regress: Object.freeze(["verdict", "regressions", "pre_existing", "outside_gates"]),
});

/**
 * Over a MOVED tree (6.20.6 — the 2026-09-24 review's finding 1, .dev/features/loop-fresh-integrity/): E cannot re-derive what the AC gate saw — it read the lock, the tests
 * and the per-test record of a tree that no longer exists — so it compares only what the verify STAMP ALONE decides
 * and defers the AC part to F (L58: compare the fixed part exactly, defer the part that may still change).
 * `stampOnly` is `check-verify.mjs --stamp` WITHOUT `--ac-gate`: a pure function of the stamp (its gates and
 * `aux.completeness`). Returns the first field whose stamp-derived part the report contradicts, or null.
 *
 * The invariant relied on, stated once: the AC gate can only ADD an AC id to `failing_gates` (the verdict is then
 * FAIL) or leave the verdict unmeasured (INCONCLUSIVE) or unchanged — it never removes a gate offender and never
 * upgrades the stamp-only verdict. That holds for check-verify's 6.20.0 precedence AND for the precedence in which
 * INCOMPLETE outranks a delivery-only or unmeasurable AC gate (`failing_gates` [] and the stamp-only INCOMPLETE). A
 * differential test re-checks it against the REAL check-verify over an enumerated set of honest worlds.
 *
 * Stated bounds: a forgery confined to the AC part (dropping `ac-delivery`, say) passes here and is RE-RUN at F —
 * never trusted, and a STOP at the commit gate — because it cannot be told from staleness without the old tree. A
 * stamp whose gate is NAMED `ac-delivery` (only a hand-made one: the runner refuses reserved ids) reads as a mismatch —
 * a STOP, fail-closed.
 */
export function stampDerivedMismatch(report, stampOnly) {
  if (canonical(report.gates) !== canonical(stampOnly.gates)) return "gates";
  if (!Array.isArray(report.failing_gates)) return "failing_gates";
  const gateFailing = report.failing_gates.filter((id) => !AC_RESERVED_IDS.includes(id));
  if (canonical(gateFailing) !== canonical(stampOnly.failing_gates)) return "failing_gates";
  const allowed = report.failing_gates.length > 0 ? ["FAIL"] : [stampOnly.verdict, "INCONCLUSIVE"];
  return allowed.includes(report.verdict) ? null : "verdict";
}

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
      // The per-test results file (6.15.0) is evidence the AC gate reads (6.20.0): a recorded digest must still be the
      // file's, or E's re-derivation would read a verdict mismatch where the truth is an edited results file (grill G6).
      if (typeof run.results_sha256 === "string") {
        const file = resultsFileName(run.seq, run.id);
        // Read as the runner and test-results-core read it — O_NOFOLLOW|O_NONBLOCK, a regular file only (REVIEW
        // finding 7, L59): a symlink or a FIFO swapped in here is a mismatch, never followed or blocked on.
        if (sha256RegularFile(join(dir, file)) !== run.results_sha256) {
          return failure({
            check: "J",
            action: "stop",
            stage: s.stage,
            reason_code: "output-hash-mismatch",
            reason: `the ${s.key} stamp's results_sha256 for gate ${JSON.stringify(run.id)} does not match ${file} on disk — the per-test results were edited or removed after the runner hashed them`,
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
  // The AC gate reads the LIVE tree (the lock, the tests, the pinned infrastructure), so once the tree has moved a
  // re-derivation of the fields it decides can differ for a reason that is staleness, not fabrication (grill G6, L58).
  const fp = fingerprint(ctx.repo, { feature: ctx.feature });
  const sf = ctx.stamps.verify.value.fingerprint;
  const treeMoved = !fp.ok || sf.algo !== fp.algo || sf.final !== fp.digest;
  // Unmoved: `--ac-gate` (6.20.0) — /pharn-verify's stage script (stage-verify.mjs, 6.26.0) passes it on its verdict
  // call, so a report produced without it, or with its AC block edited, cannot be reproduced here, and every field is
  // compared. Moved (6.20.6): the flag-less run, a pure function of the stamp, and only what the stamp alone decides is
  // compared — gates, the non-AC failing ids and the verdict rule — so a forged verdict STOPS before F instead of being
  // "refreshed" by its re-run (the 2026-09-24 review's finding 1).
  // Two literal argv arrays, not a spread: the unmoved one must visibly carry the flag stage-verify.mjs's verdict call
  // passes (command-hygiene.test.mjs pins both, L45).
  const argv = treeMoved
    ? ["--stamp", ctx.stamps.verify.path, "--feature", ctx.feature]
    : ["--stamp", ctx.stamps.verify.path, "--feature", ctx.feature, "--ac-gate"];
  const v = rerunChecker(ctx, CHECKERS.verify, argv);
  if (!v.ok) return { ok: false, unusable: true, reason: v.reason };
  const bad = treeMoved
    ? stampDerivedMismatch(ctx.reports.verify, v.value)
    : COMPARED_FIELDS.verify.find((f) => canonical(v.value[f]) !== canonical(ctx.reports.verify[f]));
  if (bad) {
    return failure({
      check: "E",
      action: "stop",
      stage: "verify",
      reason_code: "report-verdict-mismatch",
      reason: treeMoved
        ? `verify-report.json's ${bad} contradicts what the verify stamp ALONE decides (check-verify.mjs --stamp without --ac-gate) — over a moved tree only the AC part may differ, and this is not it`
        : `verify-report.json's ${bad} is not what check-verify.mjs computes from the verify stamp now — the report was not produced from that stamp`,
    });
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
      // Name the algorithms when they are what differs (a stamp from before an ALGO bump — worktree-fingerprint.mjs,
      // UPGRADES): the digests of an unchanged tree can be EQUAL across algos, so "a different tree" would be false.
      reason:
        h.algo !== v.algo
          ? `the regress head stamp was fingerprinted with ${h.algo}, the verify stamp with ${v.algo}`
          : "the regress head stamp did not end on the tree /pharn-verify started from — regress judged a different tree",
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
  // Exit 2 (unusable) or a crash is not evidence that the AC tests changed, so it keeps front-stage-red (S11) — only a
  // RED verdict (exit 1) is ac-evidence-invalid (REVIEW finding 5: a child crash read as S13 would send a person to
  // set the build aside for nothing).
  if (t.status !== 0) {
    // The first line's closed token (`RED <reason>`), plus the first RED line a child printed — for a lock RED that is
    // the lock script's own line, naming a path from the lock: a TRUNCATED, UNTRUSTED string (the lock is an
    // agent-editable file), never a test's content, and JSON-escaped in the output. A mutating gate (an inline snapshot, a
    // `--fix` linter) can rewrite a pinned test after the red run, and /pharn-test cannot be re-run after the build,
    // so the remedy named is a re-plan or a person (grill G9).
    const lines = String(t.stdout ?? "").split("\n");
    const token = lines[0].split(" — ")[0];
    const childRed = (lines.find((l) => /^\s+RED — /.test(l)) ?? "").trim().slice(0, 200);
    const reason =
      `check-test-stage exits ${t.status} (${token})${childRed ? ` [${childRed}]` : ""} — /pharn-test's evidence does not hold ` +
      "for this tree, and /pharn-test cannot be re-run over a built tree: set the build aside and re-run it, re-plan, or a person";
    // Its OWN code (6.20.0, grill G1) for a RED verdict: this is where a Bash-edited pinned test or a changed test
    // infrastructure meets the loop, before check-loop.mjs ever reads verify's AC gate — /pharn-loop maps it to S13.
    if (t.status === 1 && /^RED /.test(token)) {
      return failure({ check: "I", action: "stop", stage: "front", reason_code: "ac-evidence-invalid", reason });
    }
    // Exit 2 or a crash is no evidence about the AC tests at all: it stays front-stage-red (S11).
    return failure({ check: "I", action: "stop", stage: "front", reason_code: "front-stage-red", reason });
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
 *  it (a subprocess is invisible to `--experimental-test-coverage`). The CLI (check-loop-fresh.mjs) only prints it and sets the exit code.
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

// Not a CLI. Run directly it would print nothing and exit 0, which a caller could read as FRESH, so it refuses.
if (import.meta.main) {
  console.error("loop-fresh-core.mjs is the freshness checker's module, not its CLI — run pharn/floor/check-loop-fresh.mjs");
  process.exitCode = EXIT.INCONCLUSIVE;
}
