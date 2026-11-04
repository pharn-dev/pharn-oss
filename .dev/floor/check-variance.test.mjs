// floor/check-variance.test.mjs — hermetic tests for the deterministic variance runner.
//
// NO `claude -p`: we compose PRE-RECORDED finding/semantic fixtures into N-run layouts in an
// os.tmpdir() scratch dir and assert the runner's public surface (exit code + stdout) — mirroring
// check-structural.test.mjs's subprocess style. These prove the verdict RULE deterministically,
// without the model: flaky-structural = FAIL, consistent-fail = FAIL, consistent-pass = PASS,
// semantic-flaky = reported-not-failed, an infra-errored run is excluded (not a structural fail),
// and 0 valid runs = INCONCLUSIVE.
//
// The two ★ tests are the load-bearing ones: flaky-structural MUST fail the eval (a hole that
// sometimes opens), and semantic disagreement MUST NOT (advisory, fix #3).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(here, "check-variance.mjs");
const REPO = join(here, "..", ".."); // file_resolves (inside check-structural) resolves against the real repo ROOT — this test lives at .dev/floor/, two levels down
const FIX = join(here, "test-fixtures", "variance");
const EXPECTED = join(FIX, "expected.json");
const CLEAN = join(FIX, "finding-clean.json");
const LAUNDERED = join(FIX, "finding-laundered.json");
const SEM_PASS = join(FIX, "semantic-pass.json");
const SEM_FAIL = join(FIX, "semantic-fail.json");

// Compose a runs/ dir from a spec: [{ findings?: <path>, raw?: <string>, semantic?: <path> }, …].
// findings → copied to <run>/findings.json; raw → written verbatim (simulates a transport blip);
// neither → no findings.json (an errored run). semantic → copied to <run>/semantic.json.
function makeRuns(spec) {
  const root = mkdtempSync(join(tmpdir(), "pharn-variance-"));
  const runsDir = join(root, "runs");
  mkdirSync(runsDir);
  spec.forEach((s, i) => {
    const d = join(runsDir, String(i + 1));
    mkdirSync(d);
    if (s.findings) copyFileSync(s.findings, join(d, "findings.json"));
    else if (typeof s.raw === "string") writeFileSync(join(d, "findings.json"), s.raw);
    if (s.semantic) copyFileSync(s.semantic, join(d, "semantic.json"));
  });
  return { root, runsDir };
}

function run(spec) {
  const { root, runsDir } = makeRuns(spec);
  try {
    return spawnSync(process.execPath, [RUNNER, EXPECTED, runsDir, REPO], { encoding: "utf8" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("consistent-pass: 5 clean runs → PASS (exit 0)", () => {
  const r = run(Array(5).fill({ findings: CLEAN }));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /VERDICT: PASS — structural is consistent-pass/);
});

test("★ flaky-structural = FAIL: 4 clean + 1 laundered → exit 1", () => {
  const r = run([{ findings: CLEAN }, { findings: CLEAN }, { findings: CLEAN }, { findings: CLEAN }, { findings: LAUNDERED }]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /flaky-structural/);
  assert.match(r.stdout, /VERDICT: FAIL/);
});

test("consistent-fail-structural = FAIL: 5 laundered runs → exit 1", () => {
  const r = run(Array(5).fill({ findings: LAUNDERED }));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /consistent-fail-structural/);
});

test("★ semantic-flaky is NOT a fail: structural all-pass + mixed semantic verdicts → exit 0, reported flaky", () => {
  const r = run([
    { findings: CLEAN, semantic: SEM_PASS },
    { findings: CLEAN, semantic: SEM_PASS },
    { findings: CLEAN, semantic: SEM_PASS },
    { findings: CLEAN, semantic: SEM_FAIL },
    { findings: CLEAN, semantic: SEM_FAIL },
  ]);
  assert.equal(r.status, 0); // semantic disagreement never gates the exit code
  assert.match(r.stdout, /SEMANTIC/);
  assert.match(r.stdout, /\[flaky\]/);
});

test("infra-errored run is EXCLUDED, not a structural fail: 4 clean + 1 'Not logged in' → PASS (exit 0)", () => {
  const r = run([
    { findings: CLEAN },
    { findings: CLEAN },
    { findings: CLEAN },
    { findings: CLEAN },
    { raw: "Not logged in · Please run /login\n" },
  ]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /1 errored\/excluded/);
  assert.match(r.stdout, /VERDICT: PASS/);
});

test("inconclusive: all runs errored (no valid findings) → exit 2", () => {
  const r = run([{ raw: "Not logged in\n" }, {}]);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /INCONCLUSIVE/);
});

test("usage: a missing <runs-dir> is INCONCLUSIVE (exit 2) and the usage line names this file's real path", () => {
  for (const args of [[], [EXPECTED]]) {
    const r = spawnSync(process.execPath, [RUNNER, ...args], { encoding: "utf8" });
    assert.equal(r.status, 2, JSON.stringify(args));
    assert.equal(r.stdout, "INCONCLUSIVE — usage: node .dev/floor/check-variance.mjs <expected.json> <runs-dir> [repoDir]\n");
  }
});
