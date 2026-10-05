#!/usr/bin/env node
// pharn/floor/build-gate.mjs — /pharn-build Step 4's project gate (6.38.0, build-gate-bounded): the EXECUTION half.
// The rules (paths, the TARGET rule, the bounds, the summary, the exit table) are build-gate-core.mjs; why both exist
// is that module's header (P4 — cited, not restated).
//
//   node pharn/floor/build-gate.mjs --feature <name> --mode targeted|full --timeout-ms <N> [--budget-ms <B>]
//
// WHAT IT DOES, in order:
//   1. argv (stage-runtime.mjs's rules): `<name>` a FEATURE_SLUG_RE member, `--mode` in MODES, `--timeout-ms`
//      REQUIRED (no default — L41), `--budget-ms` optional (absent = unbudgeted, for a code caller).
//   2. containment: every path under `.pharn/pharn-build/<name>/` is walked with containmentWalk first (lstat; a
//      symlink or a dangling link at any component refuses — L54).
//   3. CONTINUE OR START (L44, L66). The same line both starts and continues a run, so nothing rides between Bash
//      calls. It continues only an UNFINALIZED `<out>/state.json` of this feature and stage whose last fingerprint
//      (the last run's fp_after, else fingerprint.init) equals the live tree's; anything else starts over, and the
//      runner's `init` recreates `<out>` empty, so no earlier run's log or results file is read as this one's.
//   4. START: `targeted` writes `targets.json` (build-gate-core `targetFiles`) and exits 4 when it is empty — an empty
//      list handed to a runner means "the whole suite" (L16/L34); then `run-gates.mjs init --stage build`
//      (`--targets` for targeted). The runner reads the project's gate exclusion itself (6.36.0), so it applies here.
//   5. DRAIN: stage-runtime.mjs `drainGates` under `makeBudget`, unchanged. The budget object handed to it is wrapped:
//      `may()` true marks a runner call's start and `spent()` its end, each interval stored in `<mode>.times.json`
//      under the run's seq — observed wall time, never the gate's own.
//   6. SUMMARY from the finalized stamp (validateStamp, expecting stage `build` and this feature): per gate, and for
//      a red gate the failing tests (test-results-core.mjs `gateResults` + `buildRecord`, one parse) or a log tail.
//
// EXIT (build-gate-core EXIT): 0 GREEN · 3 RED · 4 NO-GATES · 5 CONTINUE (run the same line again) · 2 UNUSABLE.
// Anything else — node's own 1 included — is a crash and never a verdict.
//
// WRITES: only under `.pharn/pharn-build/<name>/` (targets.json, <mode>.times.json) and, through the runner, its
// `<out>`. A Bash-reached write, outside the PreToolUse guards (L19); the state root is git-ignored.
//
// TRUST (P2): the PLAN's and AC-TESTS' `## Files` paths are untrusted: they reach the runner only through
// targetFiles (badPath, isTestFile, a regular-file lstat) and the runner's own badPath re-check, as positional
// arguments after `--`. Gate output is quoted as DATA by the core; the exit decides.

import { closeSync, fstatSync, lstatSync, openSync, readFileSync, readSync, constants as fsConstants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FEATURE_SLUG_RE, validateStamp } from "./gate-run-core.mjs";
import {
  atomicWrite,
  containmentWalk,
  drainGates,
  flag,
  has,
  lstatSafe,
  makeBudget,
  parseBudgetMs,
  parseTimeoutMs,
  scanFlags,
} from "./stage-runtime.mjs";
import { fingerprint } from "./worktree-fingerprint.mjs";
import { declaredWrites } from "./scope-inputs.mjs";
import { RESULTS_GATES, buildRecord, gateResults, testIdOf } from "./test-results-core.mjs";
import { FEATURE_BASE } from "./check-test-stage.mjs";
import { EXIT, MODES, STAGE, buildGatePaths, decide, logPaths, renderSummary, targetFiles } from "./build-gate-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_GATES = join(HERE, "run-gates.mjs");
const STATE_ROOT = ".pharn";
const KNOWN = new Set(["--feature", "--mode", "--timeout-ms", "--budget-ms"]);
const LOG_READ_CAP = 4 * 1024 * 1024; // a log is read for its TAIL; past this, only the last bytes are read

/** End the run: print, set the exit code, unwind (the 6.20.4 flush rule — never process.exit, which drops stdout). */
const DONE = Symbol("build-gate-done");
function finish(code, text) {
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
  process.exitCode = code;
  throw DONE;
}
function unusable(detail) {
  finish(EXIT.unusable, `UNUSABLE — ${detail}\nThe build gate did not run; treat the gate as \`fail\` (pharn-build.md Step 4).`);
}

function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** The last LOG_READ_CAP bytes of a log, or "" when it cannot be read. A log is untrusted text; only its tail matters. */
function readLogTail(path) {
  let fd;
  try {
    if (!lstatSync(path).isFile()) return "";
    fd = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK);
    const size = fstatSync(fd).size;
    const len = Math.min(size, LOG_READ_CAP);
    const buf = Buffer.alloc(len);
    let off = 0;
    while (off < len) {
      const n = readSync(fd, buf, off, len - off, size - len + off);
      if (n === 0) break;
      off += n;
    }
    return buf.subarray(0, off).toString("utf8");
  } catch {
    return "";
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function isRegularFile(p) {
  const r = lstatSafe(p);
  return r.ok && r.stat !== null && r.stat.isFile();
}

/** Continue only an unfinalized record of this feature and stage whose last fingerprint is the live tree's. */
function canContinue(statePath, feature) {
  const rec = readJsonFile(statePath);
  if (rec === null || typeof rec !== "object" || Array.isArray(rec)) return null;
  if (rec.stage !== STAGE || rec.feature !== feature || rec.finalized !== false) return null;
  if (!Array.isArray(rec.entries) || !Array.isArray(rec.runs) || rec.runs.length >= rec.entries.length) return null;
  const last = rec.runs.length ? rec.runs[rec.runs.length - 1].fp_after : rec.fingerprint?.init;
  const live = fingerprint(".", { feature });
  if (!live.ok || typeof last !== "string" || live.digest !== last || rec.fingerprint?.algo !== live.algo) return null;
  return rec;
}

function startRun({ feature, mode, paths, out }) {
  const featureDir = `${FEATURE_BASE}/${feature}`;
  const initArgs = ["init", "--stage", STAGE, "--feature", feature, "--out", out, "--discover", "package.json"];
  if (mode === "targeted") {
    let planText;
    try {
      planText = readFileSync(`${featureDir}/PLAN.md`, "utf8");
    } catch (e) {
      unusable(`targeted mode reads ${featureDir}/PLAN.md, which is not readable (${e && e.code ? e.code : "error"})`);
    }
    const acPath = `${featureDir}/AC-TESTS.md`;
    const declared = declaredWrites(planText, acPath);
    if (!declared.ok) unusable(`${featureDir}/PLAN.md has no usable \`## Files\`: ${declared.reason}`);
    let acText;
    try {
      acText = readFileSync(acPath, "utf8");
    } catch {
      acText = null; // a legacy SPEC has no AC-TESTS.md: nothing is e2e-mapped
    }
    const targets = targetFiles({ declared: declared.value, acTestsText: acText, isRegularFile });
    if (targets.length === 0) {
      finish(
        EXIT["no-gates"],
        `NO-GATES — nothing to target: PLAN.md and AC-TESTS.md \`## Files\` name no existing test file the \`test\` gate runs.\nRun the full line instead (pharn-build.md Step 4).`
      );
    }
    atomicWrite(paths.root, paths.targets, `${JSON.stringify(targets, null, 2)}\n`);
    initArgs.push("--targets", paths.targets);
  }
  const r = spawnSync(process.execPath, [RUN_GATES, ...initArgs], { encoding: "utf8" });
  let parsed;
  try {
    parsed = JSON.parse(r.stdout || "");
  } catch {
    parsed = null;
  }
  if (r.status === 3) {
    const why = parsed && typeof parsed.reason === "string" ? parsed.reason : "the runner found no gate to run";
    finish(
      EXIT["no-gates"],
      mode === "targeted"
        ? `NO-GATES — ${why}.\nRun the full line instead (pharn-build.md Step 4).`
        : `NO-GATES — ${why}.\nThere is no project gate to run: ask the human (pharn-build.md Step 4).`
    );
  }
  if (r.status !== 0 || parsed === null || parsed.ok !== true) {
    const code = parsed && typeof parsed.reason_code === "string" ? parsed.reason_code : `exit ${r.status}`;
    const why = parsed && typeof parsed.reason === "string" ? `: ${parsed.reason}` : "";
    unusable(`the gate runner refused init (${code})${why}`);
  }
  return 0;
}

function run(argv) {
  const invocationStart = Date.now();
  const args = argv.slice(2);
  const scan = scanFlags(args, KNOWN, KNOWN);
  if (!scan.ok) unusable(`usage-error: ${scan.detail}`);
  const feature = flag(args, "--feature");
  if (!feature || !FEATURE_SLUG_RE.test(feature)) unusable(`usage-error: --feature must be a slug matching ${FEATURE_SLUG_RE}`);
  const mode = flag(args, "--mode");
  if (!MODES.includes(mode)) unusable(`usage-error: --mode must be one of ${MODES.join(" | ")}`);
  const timeout = parseTimeoutMs(args);
  if (!timeout.ok) unusable(`usage-error: ${timeout.detail}`);
  const budgetMs = parseBudgetMs(args);
  if (!budgetMs.ok) unusable(`usage-error: ${budgetMs.detail}`);
  if (has(args, "--budget-ms") && budgetMs.value !== null && budgetMs.value <= timeout.value) {
    unusable("usage-error: --budget-ms must exceed --timeout-ms");
  }

  const paths = buildGatePaths(feature);
  const out = paths.out(mode);
  const rootAbs = resolve(STATE_ROOT);
  for (const p of [paths.root, out, paths.targets, paths.times(mode)]) {
    const c = containmentWalk(rootAbs, resolve(p));
    if (!c.ok) unusable(`path-containment: ${p} ${c.reason}`);
  }

  let times = {};
  const statePath = join(out, "state.json");
  const continued = canContinue(statePath, feature);
  if (continued !== null) {
    const t = readJsonFile(paths.times(mode));
    times = t !== null && typeof t === "object" && !Array.isArray(t) ? t : {};
  } else {
    startRun({ feature, mode, paths, out });
  }
  const rec = readJsonFile(statePath);
  let seq = rec && Array.isArray(rec.runs) ? rec.runs.length : 0;
  const total = rec && Array.isArray(rec.entries) ? rec.entries.length : 0;

  // The budget handed to the shared drain, wrapped only to observe each runner call's two edges (grill G1).
  const budget = makeBudget({ timeoutMs: timeout.value, budgetMs: budgetMs.value }, invocationStart);
  let started = null;
  const observed = {
    may: () => {
      const ok = budget.may();
      if (ok) started = Date.now();
      return ok;
    },
    spent: () => {
      budget.spent();
      times[seq] = started === null ? null : Date.now() - started;
      seq++;
      atomicWrite(paths.root, paths.times(mode), `${JSON.stringify(times)}\n`);
    },
  };
  const res = drainGates({ outDir: out, timeoutMs: timeout.value, budget: observed });
  if (res.kind === "budget") {
    finish(
      EXIT.continue,
      `CONTINUE — ${seq} of ${total} gate(s) done; the budget leaves no room for the next one.\nRun the same line again: it continues this run while the tree is unchanged.`
    );
  }
  if (res.kind !== "done") {
    const code = res.parsed && typeof res.parsed.reason_code === "string" ? res.parsed.reason_code : `exit ${res.status}`;
    const why = res.parsed && typeof res.parsed.reason === "string" ? `: ${res.parsed.reason}` : "";
    unusable(`the gate runner refused a gate (${code})${why}`);
  }

  const stamp = readJsonFile(join(out, "stamp.json"));
  const v = validateStamp(stamp, { stage: STAGE, feature });
  if (!v.ok) unusable(`the run's stamp does not validate (${v.reason_code}): ${v.reason}`);

  const perGate = {};
  for (const r of stamp.runs) {
    const lp = logPaths(out, r);
    let results = null;
    if (RESULTS_GATES.includes(r.id)) {
      const g = gateResults({ stamp, outDir: out, gateId: r.id, root: "." });
      if (!g.ok) {
        results = g.reason_code === "not-configured" ? null : { ok: false, reason_code: g.reason_code };
      } else {
        const record = buildRecord({ gate: g.gate, format: g.format, exit: g.exit, sha: g.sha, parsed: g.parsed });
        if (!record.ok) results = { ok: false, reason_code: record.reason_code };
        else {
          const byId = new Map();
          for (const e of g.parsed.entries) {
            const id = testIdOf(e);
            if (!byId.has(id)) byId.set(id, e.messages ?? []);
          }
          const failing = record.tests.filter((t) => t.status === "failed").map((t) => ({ id: t.id, messages: byId.get(t.id) ?? [] }));
          results = { ok: true, record, failing };
        }
      }
    }
    const red = r.exit !== 0;
    perGate[r.id] = { results, outText: red ? readLogTail(lp.out) : "", errText: red ? readLogTail(lp.err) : "" };
  }
  const text = renderSummary({ mode, feature, stamp, outDir: out, times, perGate });
  finish(decide(stamp) === "green" ? EXIT.green : EXIT.red, text);
}

if (import.meta.main) {
  try {
    run(process.argv);
  } catch (e) {
    if (e !== DONE) {
      console.error(`build-gate: ${e && e.stack ? e.stack : e}`);
      process.exitCode = 1; // a genuine crash — never a verdict
    }
  }
}
