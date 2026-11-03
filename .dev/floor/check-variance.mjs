#!/usr/bin/env node
// .dev/floor/check-variance.mjs — the deterministic VARIANCE RUNNER for PHARN evals (increment 3c).
//
// Floor/eval infrastructure — NOT a Capability (no `role:`; the floor capability count stays 1). It
// COUNTS, across N runs of a capability, how many emitted a findings.json that passes the eval's
// structural[] assertions, and classifies the eval as consistent-pass / flaky / consistent-fail. The
// COUNTING is deterministic (ARCHITECTURE §2, floor primitive #3): it reuses pharn/floor/check-structural.mjs
// BY INVOCATION (child_process — stdlib) and reads its EXIT CODE per run. ZERO LLM here.
//
// THE VERDICT RULE (CONSTITUTION P0; the structural/semantic split of pharn/pharn-contracts/eval-format.md):
//   STRUCTURAL — consistent-pass on ALL valid runs is REQUIRED. ANY valid run that fails a structural
//     assertion → flaky-structural → the eval FAILS (exit 1). All valid runs fail → consistent-fail
//     (exit 1). "Sometimes launders the payload into a trusted field" is a hole that sometimes opens,
//     not "almost passing"; structural is floor-grade precisely because it is deterministically checkable.
//   SEMANTIC — reported as consistent-pass / flaky / consistent-fail for the human (expected model
//     variance on judgment). ADVISORY (fix #3): it NEVER gates the exit code. structural-flaky is a bug;
//     semantic-flaky is expected.
//
// HONEST SCOPE (P0): this structural verdict is a deterministic function of the N PROVIDED findings.json.
// Those findings are produced by `claude -p` (the orchestrator, /pharn-eval) — NON-deterministic BY
// DESIGN; that is what variance measures. So /pharn-eval END-TO-END is ADVISORY; only this tabulation is
// floor-grade. The report is a MEASUREMENT, not a deterministic verdict on the capability.
//
// INFRA vs CAPABILITY (Q2 — retry-then-exclude, human-approved): a run whose findings.json is MISSING or
// not a JSON array is an INFRA/transport error (e.g. a `Not logged in` auth blip captured to the file) —
// NOT a laundering event. It is EXCLUDED from the structural verdict and reported as `errored`. The
// verdict ranges only over VALID runs (findings.json parses as an array). 0 valid → INCONCLUSIVE. A
// capability that emits a parseable-but-wrong array is a VALID run that FAILS structural (correct).
//
// TRUST (P2): findings free-text (problem/evidence) and semantic verdicts originate in trust: untrusted
// input. They are JSON.parsed and used ONLY as string operands / displayed as DATA — never eval'd,
// executed, spawned, or sent anywhere. The only child process spawned is `node check-structural.mjs` over
// FIXED, repo-internal arguments (never content). No guaranteed decision rests on a free-text field.
//
// Usage:  node .dev/floor/check-variance.mjs <expected.json> <runs-dir> [repoDir]
//   expected.json : { skill_kind, assertions: { structural[], semantic?[] } }  (eval-format.md)
//   runs-dir      : a directory of run subdirs, each with findings.json (+ optional semantic.json)
//   repoDir       : root for check-structural's file_resolves (default ".")
//
// Exit: 0 consistent-pass | 1 structural FAIL (flaky or consistent-fail) | 2 inconclusive / bad input.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// check-structural.mjs is a PRODUCT checker; it moved to pharn/floor/ while this dev-only checker
// stays under .dev/floor/. Resolve it from THIS file's dir (repo-root-relative), not cwd.
const CHECK_STRUCTURAL = join(here, "..", "..", "pharn", "floor", "check-structural.mjs");

function die(msg, code) {
  console.log(msg);
  process.exit(code);
}

function readJson(path) {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function main() {
  const expectedPath = process.argv[2];
  const runsDir = process.argv[3];
  const repoDir = process.argv[4] || ".";

  if (!expectedPath || !runsDir) {
    die("INCONCLUSIVE — usage: node .dev/floor/check-variance.mjs <expected.json> <runs-dir> [repoDir]", 2);
  }
  if (!existsSync(expectedPath)) die(`INCONCLUSIVE — expected.json not found: ${expectedPath}`, 2);
  if (!existsSync(runsDir)) die(`INCONCLUSIVE — runs-dir not found: ${runsDir}`, 2);

  // Validate expected.json up front, so a malformed expected is reported as INCONCLUSIVE — never
  // mislabeled "consistent-fail" (which is what would happen if every run's check-structural RED'd on it).
  const exp = readJson(expectedPath);
  if (!exp.ok) die(`INCONCLUSIVE — expected.json is not valid JSON: ${exp.error}`, 2);
  const assertions = exp.value && typeof exp.value === "object" ? exp.value.assertions : undefined;
  const structural = assertions && Array.isArray(assertions.structural) ? assertions.structural : undefined;
  if (!structural) die("INCONCLUSIVE — expected.json must have assertions.structural[] (an array)", 2);
  const semantic = assertions && Array.isArray(assertions.semantic) ? assertions.semantic : [];

  // Enumerate run subdirs (numeric-aware sort: 1, 2, …, 10).
  const runIds = readdirSync(runsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const valid = []; // { id, structuralPass, semanticVerdicts: [pass|fail|missing], detail }
  const errored = []; // { id, reason }

  for (const id of runIds) {
    const runDir = join(runsDir, id);
    const findingsPath = join(runDir, "findings.json");
    if (!existsSync(findingsPath)) {
      errored.push({ id, reason: "no findings.json (infra/transport error — excluded)" });
      continue;
    }
    const parsed = readJson(findingsPath);
    if (!parsed.ok || !Array.isArray(parsed.value)) {
      errored.push({
        id,
        reason: parsed.ok
          ? "findings.json is not a JSON array (infra error — excluded)"
          : `findings.json unparseable (${parsed.error}) — excluded`,
      });
      continue;
    }
    // VALID run — reuse check-structural BY INVOCATION; its EXIT CODE is this run's structural pass/fail.
    const r = spawnSync(process.execPath, [CHECK_STRUCTURAL, expectedPath, findingsPath, repoDir], { encoding: "utf8" });
    if (r.error || typeof r.status !== "number") {
      // Spawning the floor checker itself failed — a runner infra error; fail loud, never guess a verdict.
      die(`INCONCLUSIVE — could not run check-structural for run ${id}: ${r.error ? r.error.message : "no exit status"}`, 2);
    }
    const structuralPass = r.status === 0;

    // Semantic verdicts (report-only). Aligned to expected.semantic[] by index.
    let semanticVerdicts = semantic.map(() => "missing");
    const semPath = join(runDir, "semantic.json");
    if (semantic.length && existsSync(semPath)) {
      const sp = readJson(semPath);
      if (sp.ok && Array.isArray(sp.value)) {
        semanticVerdicts = semantic.map((_, i) => {
          const v = sp.value[i] && sp.value[i].verdict;
          return v === "pass" || v === "fail" ? v : "missing";
        });
      }
    }
    valid.push({ id, structuralPass, semanticVerdicts, detail: (r.stdout || "").trim() });
  }

  // --- Report header ---
  console.log(`PHARN variance — ${runIds.length} run(s): ${valid.length} valid, ${errored.length} errored/excluded`);
  for (const e of errored) console.log(`  - run ${e.id}: ERRORED — ${e.reason}`);

  // STRUCTURAL classification — the ONLY thing that gates the exit code.
  const passCount = valid.filter((v) => v.structuralPass).length;
  const failCount = valid.length - passCount;

  console.log(`\nSTRUCTURAL (gates the verdict): ${passCount}/${valid.length} valid run(s) passed all structural[]`);
  for (const v of valid) {
    if (!v.structuralPass) {
      console.log(`  - run ${v.id}: STRUCTURAL FAIL`);
      for (const line of v.detail.split("\n")) if (/^RED —/.test(line)) console.log(`      ${line}`);
    }
  }

  // SEMANTIC tabulation — report-only; NEVER gates.
  if (semantic.length) {
    console.log("\nSEMANTIC (advisory — reported, never gates; semantic-flaky is EXPECTED model variance):");
    semantic.forEach((s, i) => {
      const verdicts = valid.map((v) => v.semanticVerdicts[i]);
      const p = verdicts.filter((x) => x === "pass").length;
      const f = verdicts.filter((x) => x === "fail").length;
      const m = verdicts.filter((x) => x === "missing").length;
      let cls;
      if (p + f === 0) cls = "no-data";
      else if (f === 0) cls = "consistent-pass";
      else if (p === 0) cls = "consistent-fail";
      else cls = "flaky";
      const judge = typeof s.judge === "string" ? s.judge : `semantic[${i}]`;
      console.log(`  - [${cls}] ${p} pass / ${f} fail / ${m} missing — "${judge}"`);
    });
    console.log("  (the threshold for semantic-flaky is the human's to read — it is not a build gate, per fix #3.)");
  }

  // --- Verdict + the honest P0 boundary ---
  console.log("");
  if (valid.length === 0) {
    die(`VERDICT: INCONCLUSIVE — 0 valid runs (all ${errored.length} errored/excluded). No structural verdict is possible.`, 2);
  }
  let verdict;
  let code;
  if (failCount === 0) {
    verdict = "consistent-pass";
    code = 0;
  } else if (failCount === valid.length) {
    verdict = "consistent-fail-structural";
    code = 1;
  } else {
    verdict = "flaky-structural";
    code = 1;
  }
  console.log(`VERDICT: ${code === 0 ? "PASS" : "FAIL"} — structural is ${verdict} across ${valid.length} valid run(s).`);
  if (verdict === "flaky-structural") {
    console.log(
      "  flaky-structural = FAIL: at least one run failed a structural assertion (the specific one is in the per-run RED detail above) — a hole that sometimes opens, not 'almost passing'. When that assertion is needle_absent_from_enum_gated or field_equals, the payload was laundered into a trusted field."
    );
  }
  console.log(
    "NOTE (P0): this structural verdict is DETERMINISTIC over the provided findings.json; those findings were produced NON-deterministically by `claude -p` (advisory). This is a measurement, NOT a deterministic verdict on the capability."
  );
  process.exit(code);
}

main();
