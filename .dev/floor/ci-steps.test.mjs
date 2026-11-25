// .dev/floor/ci-steps.test.mjs — ✧ pins that two of ci.yml's gate steps exist and are not switched off (7.3.0).
//
// WHY (audit 2026-11-03). `npm run check` and CLAUDE.md say the floor validator and the specified-marker check run in
// CI, but no test held ci.yml to it: deleting the "Validate floor" step, or giving it `if: false`, left every suite
// green. `docs:check` already has this pin (lessons-index-core.test.mjs, L2); this file applies the same shape to the
// validator (in ci.yml and floor.yml) and to `check:markers`. The `if:` assertion is the load-bearing half: matching the
// `run:` line alone would pass a step that never runs.
//
// HONEST RESIDUAL (P0): this pins the workflow FILE. That GitHub ran the job, that the workflow is enabled and that
// branch protection requires the check are harness-layer facts no in-repo test can see.
//
// THE INSTALL CHECK (CORE-384). The "Install check (pharn-cli verify-archive)" step runs the real pharn-cli over HEAD's
// archive. Its pins sit at the end of this file: ✧ the step's text (place, `if:`, exact `run:` lines, an exact CLI pin
// at or above MIN_CLI), and ★ its `run:` block executed as GitHub runs it, with a stub `npx` first on PATH. The stub
// stands in for the CLI, so the ★ test proves the archive's shape and the arguments, never the CLI's verdict.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const read = (name) => readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");
const INSTALL_GATED_IF = "if: ${{ always() && steps.install.outcome == 'success' }}";

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The step (its `- name:` line through its `run:` line) whose `run:` is exactly `run`, or null. */
function stepRunning(yml, run) {
  const re = new RegExp(`^ {6}- name: [^\\n]*\\n(?: {8}[^\\n]*\\n)*? {8}run: ${escape(run)}[ \\t]*$`, "m");
  return yml.match(re)?.[0] ?? null;
}

/** The step's `if:` lines (zero or one in a valid step). */
const ifLines = (step) => step.split("\n").filter((l) => /^ {8}if:/.test(l));

for (const [file, run, expectIf] of [
  ["ci.yml", "node pharn/floor/validate.mjs .", INSTALL_GATED_IF],
  ["ci.yml", "npm run check:markers", INSTALL_GATED_IF],
  ["floor.yml", "node pharn/floor/validate.mjs .", null],
]) {
  test(`✧ ${file} runs \`${run}\`, and its step is not disabled by an \`if:\``, () => {
    const step = stepRunning(read(file), run);
    assert.ok(step, `${file} must contain a step whose \`run:\` is \`${run}\``);
    const ifs = ifLines(step).map((l) => l.trim());
    if (expectIf === null) assert.deepEqual(ifs, [], `${file}'s step must run unconditionally`);
    else assert.deepEqual(ifs, [expectIf], `${file}'s step must carry the install-gated \`if:\` of its sibling steps`);
  });
}

test("✧ the step pin DISCRIMINATES (L4): a disabled, conditioned or missing step fails it", () => {
  const ci = read("ci.yml");
  const run = "node pharn/floor/validate.mjs .";
  const step = stepRunning(ci, run);
  assert.ok(step);
  const disabled = ci.replace(step, step.replace(INSTALL_GATED_IF, "if: false"));
  assert.deepEqual(
    ifLines(stepRunning(disabled, run)).map((l) => l.trim()),
    ["if: false"]
  );
  assert.notDeepEqual(
    ifLines(stepRunning(disabled, run)).map((l) => l.trim()),
    [INSTALL_GATED_IF]
  );
  assert.equal(stepRunning(ci.replace(step, ""), run), null, "a deleted step is not found");
  assert.equal(stepRunning(ci.replace(`run: ${run}`, `run: echo ${run}`), run), null, "a changed command is not the step");
});

// ── The install check (CORE-384) ─────────────────────────────────────────────────────────────────────────────────────

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const VERIFY_STEP = "Install check (pharn-cli verify-archive)";
/** The step's `run:` block, line for line. 0.22.0 is the first pharn-cli release with `verify-archive`. */
const VERIFY_RUN = [
  'git archive --prefix=pharn-oss/ --format=tar.gz -o "$RUNNER_TEMP/pharn-oss.tar.gz" HEAD',
  'npx --yes @pharn-dev/pharn@0.22.0 verify-archive "$RUNNER_TEMP/pharn-oss.tar.gz" --expect-version "$(cat SKILLS_VERSION)"',
];
const FIRST_WITH_VERIFY_ARCHIVE = "0.22.0";

/** The step named `name` (its `- name:` line and every following line indented deeper than 6), or null. */
function namedStep(yml, name) {
  return yml.match(new RegExp(`^ {6}- name: ${escape(name)}\\n(?:(?: {8}[^\\n]*)?\\n)*`, "m"))?.[0] ?? null;
}

/** The lines of a step's `run: |` block, de-indented, or null when the step has no block scalar `run:`. */
function runBlock(step) {
  const lines = step.split("\n");
  const at = lines.indexOf("        run: |");
  if (at === -1) return null;
  const body = [];
  for (const l of lines.slice(at + 1)) {
    if (!l.startsWith("          ")) break;
    body.push(l.slice(10));
  }
  return body;
}

const semver = (v) => v.split(".").map(Number);
const atLeast = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return true;
};

test("✧ ci.yml's check job runs the install check after the source-archive check, not disabled by an `if:`", () => {
  const ci = read("ci.yml");
  const step = namedStep(ci, VERIFY_STEP);
  assert.ok(step, `ci.yml must contain a step named \`${VERIFY_STEP}\``);
  assert.deepEqual(
    ifLines(step).map((l) => l.trim()),
    [INSTALL_GATED_IF]
  );
  assert.deepEqual(runBlock(step), VERIFY_RUN, "the step's `run:` block is exactly the two pinned commands");
  const jobs = ci.slice(ci.indexOf("\njobs:"));
  const archive = stepRunning(ci, "npm run check:archive");
  assert.ok(archive, "the source-archive check step is present");
  assert.ok(jobs.indexOf("  check:\n") < jobs.indexOf(archive), "the source-archive check sits in the check job");
  assert.ok(jobs.indexOf(archive) < jobs.indexOf(step), "the install check follows the source-archive check");
  const checkAt = jobs.indexOf("  check:\n");
  const nextJob = jobs.slice(checkAt + 1).match(/\n {2}[A-Za-z][\w-]*:\n/);
  const checkEnd = nextJob ? checkAt + 1 + nextJob.index : jobs.length;
  assert.ok(jobs.indexOf(step) < checkEnd, "the install check sits in the check job release.yml waits for");
});

test("✧ the install check pins one exact pharn-cli version, at or above MIN_CLI and the first with verify-archive", () => {
  const pin = VERIFY_RUN[1].match(/@pharn-dev\/pharn@(\d+\.\d+\.\d+) /)?.[1];
  assert.ok(pin, "an exact X.Y.Z, never a range or a dist-tag such as latest");
  const minCli = readFileSync(join(REPO, "MIN_CLI"), "utf8").trim();
  assert.ok(atLeast(pin, minCli), `the pinned CLI ${pin} must be at or above MIN_CLI ${minCli}`);
  assert.ok(atLeast(pin, FIRST_WITH_VERIFY_ARCHIVE), `pharn-cli before ${FIRST_WITH_VERIFY_ARCHIVE} has no verify-archive`);
});

test("✧ the install-check pin DISCRIMINATES (L4): a disabled, edited or missing step fails it", () => {
  const ci = read("ci.yml");
  const step = namedStep(ci, VERIFY_STEP);
  assert.ok(step);
  const disabled = namedStep(ci.replace(step, step.replace(INSTALL_GATED_IF, "if: false")), VERIFY_STEP);
  assert.notDeepEqual(
    ifLines(disabled).map((l) => l.trim()),
    [INSTALL_GATED_IF]
  );
  const latest = namedStep(ci.replace(step, step.replace("pharn@0.22.0", "pharn@latest")), VERIFY_STEP);
  assert.notDeepEqual(runBlock(latest), VERIFY_RUN);
  assert.equal(namedStep(ci.replace(step, ""), VERIFY_STEP), null, "a deleted step is not found");
  assert.equal(atLeast("0.21.6", FIRST_WITH_VERIFY_ARCHIVE), false);
  assert.equal(atLeast("0.9.0", "0.14.0"), false, "numeric, not lexicographic");
});

/** Runs the committed block as GitHub runs a `run:` step, with a stub `npx` that logs its arguments and exits `code`. */
function runVerifyBlock(code) {
  const block = runBlock(namedStep(read("ci.yml"), VERIFY_STEP));
  assert.ok(block, "the step's `run:` block is readable");
  const tmp = mkdtempSync(join(tmpdir(), "ci-install-check-"));
  const bin = join(tmp, "bin");
  const log = join(tmp, "npx.log");
  mkdirSync(bin);
  writeFileSync(join(bin, "npx"), `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a"; done > "${log}"\nexit ${code}\n`);
  chmodSync(join(bin, "npx"), 0o755);
  const r = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", block.join("\n")], {
    cwd: REPO,
    env: { ...process.env, RUNNER_TEMP: tmp, PATH: `${bin}${delimiter}${process.env.PATH}` },
    encoding: "utf8",
  });
  return { tmp, log, r };
}

test("★ the install check's block archives HEAD under one pharn-oss/ root and hands it to the pinned CLI", () => {
  const { tmp, log, r } = runVerifyBlock(0);
  try {
    assert.equal(r.status, 0, r.stderr);
    const archive = join(tmp, "pharn-oss.tar.gz");
    assert.ok(existsSync(archive), "the archive is written to $RUNNER_TEMP");
    const list = spawnSync("tar", ["-tzf", archive], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    assert.equal(list.status, 0, list.stderr);
    const entries = list.stdout.split("\n").filter(Boolean);
    assert.ok(entries.includes("pharn-oss/SKILLS_VERSION"), "the archive holds the tree under pharn-oss/");
    assert.deepEqual(
      entries.filter((e) => !e.startsWith("pharn-oss/")),
      [],
      "one root directory, as verify-archive requires"
    );
    const version = readFileSync(join(REPO, "SKILLS_VERSION"), "utf8").trim();
    assert.deepEqual(readFileSync(log, "utf8").split("\n").filter(Boolean), [
      "--yes",
      "@pharn-dev/pharn@0.22.0",
      "verify-archive",
      archive,
      "--expect-version",
      version,
    ]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("★ the install check fails the step when the CLI exits 1 (negative control)", () => {
  const { tmp, r } = runVerifyBlock(1);
  try {
    assert.equal(r.status, 1, "a CLI refusal must fail the step");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
