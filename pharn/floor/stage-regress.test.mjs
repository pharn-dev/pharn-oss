// pharn/floor/stage-regress.test.mjs — the /pharn-regress stage script's end-to-end suite. Every test drives
// the REAL CLI as a subprocess over a REAL throwaway git repository (mkdtempSync), mirroring run-gates.test.mjs's
// own idiom: the script is exercised through its argv and the filesystem, never imported and never mocked.
//
// The ★ WIRING test extracts `.claude/commands/pharn-regress.md`'s ONE pinned line and executes it (L45):
// a fix that lives only in this file's own invocations, never exercised through the command that actually
// invokes it, is exactly the L45 gap this suite exists to close.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, copyFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { REGRESS_PATHS, PROGRESS_SCHEMA } from "./stage-regress-core.mjs";
import { REGISTRY, allReasonCodes } from "./stage-exit-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "stage-regress.mjs");
const COMMAND = join(HERE, "..", "..", ".claude", "commands", "pharn-regress.md");
const FEATURE = "demo";
const FEATURES = "pharn/features";

function specBody() {
  return "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n";
}

/** A throwaway repo with an approved SPEC, a PLAN declaring src/index.js (+ src/index.test.js unless
 *  `withTest: false`), one commit, and a package.json carrying `scripts`. Returns {dir, git, base}. */
function repo({ scripts = { test: "node --test" }, gitignorePharn = true, withTest = true, extraPlanLines = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "sr-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  if (gitignorePharn) writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", version: "1.0.0", scripts }, null, 2) + "\n");
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\n");
  if (withTest) {
    writeFileSync(
      join(dir, "src", "index.test.js"),
      "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from './index.js';\ntest('add', () => { assert.equal(add(1,2), 3); });\n"
    );
  }
  mkdirSync(join(dir, FEATURES, FEATURE), { recursive: true });
  const body = specBody();
  const hash = createHash("sha256").update(body).digest("hex");
  writeFileSync(
    join(dir, FEATURES, FEATURE, "SPEC.md"),
    `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`
  );
  const files = ["- `src/index.js` — the feature", ...(withTest ? ["- `src/index.test.js` — its test"] : []), ...extraPlanLines].join("\n");
  writeFileSync(
    join(dir, FEATURES, FEATURE, "PLAN.md"),
    `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n${files}\n`
  );
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  return { dir, git, base };
}

function withRepo(fn, opts) {
  const { dir } = repo(opts);
  try {
    return fn(dir, opts);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Run the CLI and return {code, json, raw}. */
// MEASURED, not assumed: `node --test` sets `NODE_TEST_CONTEXT` on itself, and a fixture whose OWN "test"
// script is `node --test` inherits it (through spawnSync -> spawnGate -> the gate's child process), which
// makes that NESTED node:test run report back over an internal coordination protocol instead of exiting
// normally — a genuinely failing assertion inside the fixture then reads back as gate exit 0. This is an
// artifact of testing a script THROUGH node:test while the script itself launches node:test, never
// present for a real `/pharn-regress` run (invoked from a Bash tool, never from inside a node:test
// process) — so the fix belongs in THIS HARNESS, not in stage-regress.mjs. Confirmed by removing it: the
// same fixture and assertion pass identically whether driven by plain `node` or by `node --test`.
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

function cli(dir, args, opts = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8", env: CLEAN_ENV, ...opts });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* a crash path */
  }
  return { code: r.status, json, raw: (r.stdout || "") + (r.stderr || "") };
}

function freshArgs(base, extra = []) {
  return ["--feature", FEATURE, "--timeout-ms", "30000", "--no-install", "--base", base, ...extra];
}

// ── HAPPY PATH ──────────────────────────────────────────────────────────────────────────────────────
test("done/no-regressions: a build that changes only its declared scope, with the outside test still green", () => {
  const { dir, base } = repo();
  writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x) { return x; }\n");
  try {
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.status, "done");
    assert.equal(r.json.verdict, "no-regressions");
    assert.ok(existsSync(join(dir, r.json.report)));
    assert.ok(existsSync(join(dir, r.json.render)));
    const report = JSON.parse(readFileSync(join(dir, r.json.report), "utf8"));
    assert.equal(report.verdict, "no-regressions");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── A GENUINE REGRESSION OUTSIDE THE FEATURE ────────────────────────────────────────────────────────
test("done/regressions: a change to a DECLARED file that breaks an UNDECLARED outside test", () => {
  const dir = mkdtempSync(join(tmpdir(), "sr-regr-"));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", scripts: { test: "node --test" } }, null, 2) + "\n");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\n");
    writeFileSync(join(dir, "src", "other.js"), "import { add } from './index.js';\nexport function addOne(x) { return add(x, 1); }\n");
    writeFileSync(
      join(dir, "src", "other.test.js"),
      "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { addOne } from './other.js';\ntest('addOne', () => { assert.equal(addOne(5), 6); });\n"
    );
    mkdirSync(join(dir, FEATURES, FEATURE), { recursive: true });
    const body = specBody();
    const hash = createHash("sha256").update(body).digest("hex");
    writeFileSync(
      join(dir, FEATURES, FEATURE, "SPEC.md"),
      `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`
    );
    writeFileSync(
      join(dir, FEATURES, FEATURE, "PLAN.md"),
      `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — the feature\n`
    );
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD").trim();
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a - b; }\n"); // breaks other.test.js
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.verdict, "regressions");
    const report = JSON.parse(readFileSync(join(dir, r.json.report), "utf8"));
    assert.deepEqual(report.regressions, ["test"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── REFUSALS ────────────────────────────────────────────────────────────────────────────────────────
test("refused/missing-artifact: no SPEC.md and no PLAN.md → REGRESSION.md is written naming the refusal", () => {
  const dir = mkdtempSync(join(tmpdir(), "sr-missing-"));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    mkdirSync(join(dir, FEATURES, FEATURE), { recursive: true });
    writeFileSync(join(dir, "x.txt"), "x\n");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD").trim();
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3);
    assert.equal(r.json.status, "refused");
    assert.equal(r.json.reason_code, "missing-artifact");
    assert.ok(existsSync(join(dir, r.json.render)));
    assert.match(readFileSync(join(dir, r.json.render), "utf8"), /regression NOT measured/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refused/chain-red: the SPEC drifts after the PLAN pinned it", () => {
  withRepo((dir) => {
    const specPath = join(dir, FEATURES, FEATURE, "SPEC.md");
    writeFileSync(specPath, readFileSync(specPath, "utf8") + "\nextra drifted content\n");
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3);
    assert.equal(r.json.reason_code, "chain-red");
    assert.equal(existsSync(join(dir, `${FEATURES}/${FEATURE}/regression-report.json`)), false, "a refused chain writes NO report");
  });
});

test("refused/scope-escaped: an UNDECLARED file changes; the finding names it", () => {
  const { dir, base } = repo();
  try {
    // `src/undeclared.js` is NOT in the PLAN's `## Files` (only src/index.js and src/index.test.js are) —
    // a genuinely undeclared path, unlike editing a declared one.
    writeFileSync(join(dir, "src", "undeclared.js"), "export const x = 1;\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    assert.equal(r.json.reason_code, "scope-escaped");
    assert.match(readFileSync(join(dir, r.json.render), "utf8"), /src\/undeclared\.js/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refused/scope-escaped (GRILL G3): a rename of an undeclared file onto a declared path names the SOURCE too", () => {
  const dir = mkdtempSync(join(tmpdir(), "sr-rename-"));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", scripts: { test: "node --test" } }, null, 2) + "\n");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\n");
    writeFileSync(join(dir, "src", "undeclared.js"), "export const x = 1;\n");
    mkdirSync(join(dir, FEATURES, FEATURE), { recursive: true });
    const body = specBody();
    const hash = createHash("sha256").update(body).digest("hex");
    writeFileSync(
      join(dir, FEATURES, FEATURE, "SPEC.md"),
      `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`
    );
    writeFileSync(
      join(dir, FEATURES, FEATURE, "PLAN.md"),
      `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — the feature\n- \`src/declared.js\` — the rename target\n`
    );
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD").trim();
    // Rename the UNDECLARED file onto the DECLARED path. With rename detection ON, `git diff --name-only`
    // (no --no-renames) would list only `src/declared.js`; the escape (deleting `src/undeclared.js`) would
    // go unseen. `--no-renames` lists BOTH halves.
    git("mv", "src/undeclared.js", "src/declared.js");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3);
    assert.equal(r.json.reason_code, "scope-escaped");
    assert.match(readFileSync(join(dir, r.json.render), "utf8"), /src\/undeclared\.js/, "the rename SOURCE must be named as the escape");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refused/plan-files-unparseable: a PLAN with no ## Files heading", () => {
  const dir = mkdtempSync(join(tmpdir(), "sr-noplan-"));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", scripts: { test: "node --test" } }, null, 2) + "\n");
    mkdirSync(join(dir, FEATURES, FEATURE), { recursive: true });
    const body = specBody();
    const hash = createHash("sha256").update(body).digest("hex");
    writeFileSync(
      join(dir, FEATURES, FEATURE, "SPEC.md"),
      `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`
    );
    writeFileSync(
      join(dir, FEATURES, FEATURE, "PLAN.md"),
      `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\nno files section here.\n`
    );
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD").trim();
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3);
    assert.equal(r.json.reason_code, "plan-files-unparseable");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── QUESTIONS ───────────────────────────────────────────────────────────────────────────────────────
test("question/no-gates: no allowlisted script — the resume.argv is the ORIGINAL fresh invocation", () => {
  const { dir, base } = repo({ scripts: {} });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const args = freshArgs(base);
    const r = cli(dir, args);
    assert.equal(r.code, 4);
    assert.equal(r.json.reason_code, "no-gates");
    assert.deepEqual(r.json.resume.argv, args, "a question's resume.argv is the fresh invocation, unchanged");
    assert.ok(!existsSync(join(dir, REGRESS_PATHS.stageJson)), "nothing slow has run — no progress record");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("question/no-gates (GRILL G12): a style-only project, skipped by the config-touch rule, still asks", () => {
  const { dir, base } = repo({ scripts: { lint: "true" }, withTest: false });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 4);
    assert.equal(r.json.reason_code, "no-gates");
    assert.match(r.json.question, /style-only/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("question/base-unresolved: a detached, shallow-like state with no clean base and no origin/main", () => {
  const dir = mkdtempSync(join(tmpdir(), "sr-nobase-"));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", scripts: { test: "node --test" } }, null, 2) + "\n");
    mkdirSync(join(dir, FEATURES, FEATURE), { recursive: true });
    const body = specBody();
    const hash = createHash("sha256").update(body).digest("hex");
    writeFileSync(
      join(dir, FEATURES, FEATURE, "SPEC.md"),
      `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`
    );
    writeFileSync(
      join(dir, FEATURES, FEATURE, "PLAN.md"),
      `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`x.txt\` — x\n`
    );
    writeFileSync(join(dir, "x.txt"), "x\n");
    git("add", "-A");
    git("commit", "-q", "-m", "base"); // clean tree, no origin/main -> base-unresolved
    const r = cli(dir, ["--feature", FEATURE, "--timeout-ms", "30000", "--no-install"]);
    assert.equal(r.code, 4);
    assert.equal(r.json.reason_code, "base-unresolved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("question/install-unresolved: two lockfile families at the base commit", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "package-lock.json"), "{}");
    writeFileSync(join(dir, "yarn.lock"), "");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-q", "-m", "lockfiles"], { cwd: dir });
    const newBase = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const r = cli(dir, ["--feature", FEATURE, "--timeout-ms", "30000", "--base", newBase]); // no --no-install this time
    assert.equal(r.code, 4);
    assert.equal(r.json.reason_code, "install-unresolved");
    void base;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("question/tests-unresolved: a --tests pathspec matching nothing still asks (GRILL G16)", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const r = cli(dir, freshArgs(base, ["--tests", "nonexistent/**/*.spec.js"]));
    assert.equal(r.code, 4);
    assert.equal(r.json.reason_code, "tests-unresolved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("question/tests-unresolved: --no-tests is the escape — it proceeds instead of asking", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const r = cli(dir, freshArgs(base, ["--no-tests"]));
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.status, "done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── UNUSABLE ────────────────────────────────────────────────────────────────────────────────────────
test("unusable/usage-error: argv refusal happens BEFORE containment/removal — an earlier report survives", () => {
  const { dir, base } = repo();
  try {
    // Manufacture a stale prior report.
    writeFileSync(join(dir, FEATURES, FEATURE, "regression-report.json"), '{"verdict":"no-regressions"}');
    const r = cli(dir, ["--feature", "Not_A_Slug", "--timeout-ms", "30000", "--base", base]);
    assert.equal(r.code, 2);
    assert.equal(r.json.reason_code, "usage-error");
    assert.equal(r.json.feature, null);
    assert.ok(existsSync(join(dir, FEATURES, FEATURE, "regression-report.json")), "an argv refusal must remove NOTHING");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unusable/no-feature: no such feature directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "sr-nofeat-"));
  try {
    execFileSync("git", ["init", "-q", "."], { cwd: dir });
    execFileSync("git", ["config", "user.email", "t@t"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "t"], { cwd: dir });
    writeFileSync(join(dir, "x.txt"), "x\n");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-q", "-m", "base"], { cwd: dir });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 2);
    assert.equal(r.json.reason_code, "no-feature");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── CONTAINMENT (L54) ──────────────────────────────────────────────────────────────────────────────
test("unusable/path-containment: a SYMLINK at .pharn is refused, and a DANGLING one is refused the same way", () => {
  const { dir, base } = repo();
  try {
    const outsideTarget = mkdtempSync(join(tmpdir(), "sr-outside-"));
    symlinkSync(outsideTarget, join(dir, ".pharn"));
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 2);
    assert.equal(r.json.reason_code, "path-containment");
    rmSync(outsideTarget, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unusable/path-containment: a symlinked feature directory is refused", () => {
  const { dir, base } = repo();
  try {
    const realFeatureDir = join(dir, FEATURES, FEATURE);
    const elsewhere = mkdtempSync(join(tmpdir(), "sr-elsewhere-"));
    rmSync(realFeatureDir, { recursive: true, force: true });
    symlinkSync(elsewhere, realFeatureDir);
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 2);
    assert.equal(r.json.reason_code, "path-containment");
    rmSync(elsewhere, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── GRILL G2 — the stage's own scratch is never an escape, even when .pharn/ is NOT git-ignored ────
test("GRILL G2: a fixture that does NOT git-ignore .pharn/ never reports its own scratch as an escape", () => {
  const { dir, base } = repo({ gitignorePharn: false });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.ok(
      scope.inside.every((p) => !p.startsWith(".pharn/")),
      "the stage's own scratch must never appear in `inside`"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── BUDGET / RESUME ─────────────────────────────────────────────────────────────────────────────────
test("★ budget: --budget-ms 1 forces exactly-one-slow-step-per-invocation; --resume reaches the SAME verdict as an unbudgeted run", () => {
  const { dir, base } = repo({ scripts: { test: "node --test", lint: "true", "format:check": "true" } });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    let r = cli(dir, freshArgs(base, ["--budget-ms", "1"]));
    let steps = 0;
    while (r.code === 5) {
      steps++;
      assert.ok(steps < 50, "the budget loop never converges");
      r = cli(dir, ["--resume", "--budget-ms", "1"]);
    }
    assert.equal(r.code, 0, r.raw);
    assert.ok(steps >= 1, "a --budget-ms 1 run must need at least one continue");
    assert.ok(!existsSync(join(dir, REGRESS_PATHS.stageJson)), "the progress record is removed on done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--resume with no progress record → unusable no-progress", () => {
  const { dir } = repo();
  try {
    const r = cli(dir, ["--resume"]);
    assert.equal(r.code, 2);
    assert.equal(r.json.reason_code, "no-progress");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--resume --gates x → unusable usage-error (only --budget-ms is accepted)", () => {
  const { dir } = repo();
  try {
    const r = cli(dir, ["--resume", "--gates", "x"]);
    assert.equal(r.code, 2);
    assert.equal(r.json.reason_code, "usage-error");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--resume over a MALFORMED progress record → unusable progress-malformed, fail-closed", () => {
  const { dir } = repo();
  try {
    mkdirSync(join(dir, REGRESS_PATHS.root), { recursive: true });
    writeFileSync(join(dir, REGRESS_PATHS.stageJson), JSON.stringify({ schema: PROGRESS_SCHEMA, feature: "demo" }));
    const r = cli(dir, ["--resume"]);
    assert.equal(r.code, 2);
    assert.equal(r.json.reason_code, "progress-malformed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── GRILL G4 — cleanup runs AFTER the verdict; its failure never voids a computed one ──────────────
test("GRILL G4: a LOCKED base worktree cannot be removed (needs a second --force) — the run still reaches `done`", () => {
  const { dir, base } = repo({ scripts: { test: "node --test", lint: "true" } });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    // Stop the run right after "worktree" (not budgeted, so it always completes once reached) but before
    // "install" (budgeted, so a --budget-ms 1 run pauses there on its first invocation, since "drain-head"
    // already consumed the first-always slow step for at least one gate — with two gates it may take a
    // couple of continues to actually reach the worktree phase; loop until the worktree exists).
    let r = cli(dir, freshArgs(base, ["--budget-ms", "1"]));
    for (let i = 0; i < 20 && r.code === 5 && !existsSync(join(dir, REGRESS_PATHS.base)); i++) {
      r = cli(dir, ["--resume", "--budget-ms", "1"]);
    }
    assert.ok(existsSync(join(dir, REGRESS_PATHS.base)), "the base worktree was never created within the loop bound");
    execFileSync("git", ["worktree", "lock", REGRESS_PATHS.base], { cwd: dir });
    while (r.code === 5) {
      r = cli(dir, ["--resume", "--budget-ms", "600000"]);
    }
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.status, "done");
    assert.match(readFileSync(join(dir, r.json.render), "utf8"), /removing the base worktree FAILED/);
    // The verdict itself is UNAFFECTED by the cleanup failure.
    assert.equal(r.json.verdict, "no-regressions");
  } finally {
    try {
      execFileSync("git", ["worktree", "unlock", REGRESS_PATHS.base], { cwd: dir, stdio: "ignore" });
    } catch {
      /* the worktree may already be gone by the time cleanup ran once more on a later resume */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── CLOSURE ─────────────────────────────────────────────────────────────────────────────────────────
// Every deliberate emission calls one of these three helpers with `reasonCode` as its bare quoted second
// argument — the pattern `assertReasonCode`/`isReasonCode` themselves gate at the stage-exit-core layer.
const REASON_CODE_CALL_RE = /\b(?:emitUnusable|emitQuestion|writeRefusedAndEmit)\(\s*[^,]+,\s*"([a-z][a-z-]*)"/g;

test("★ CLOSURE — every reason_code literal stage-regress.mjs emits is a REGISTERED regress reason_code", () => {
  const src = readFileSync(CLI, "utf8");
  const literals = [...src.matchAll(REASON_CODE_CALL_RE)].map((m) => m[1]);
  assert.ok(literals.length > 0, "the scan must find something, or this test is vacuous");
  const registered = new Set(allReasonCodes("regress"));
  for (const lit of literals)
    assert.ok(registered.has(lit), `stage-regress.mjs emits '${lit}', which is not in stage-exit-core's regress registry`);
  // Every question/refused/unusable code the registry names is ACTUALLY emitted somewhere (no dead entry).
  assert.deepEqual([...new Set(literals)].sort(), [...registered].sort());
});

test("★ CLOSURE discriminates — an injected variant spelling FAILS the scan", () => {
  const injected = 'emitQuestion(cfg.feature, "no-gats", cfg.originalArgv);';
  const literals = [...injected.matchAll(REASON_CODE_CALL_RE)].map((m) => m[1]);
  assert.deepEqual(literals, ["no-gats"]);
  assert.equal(new Set(allReasonCodes("regress")).has("no-gats"), false);
});

test("every REGISTERED regress reason_code is reachable — the registry and the script agree on the vocabulary size", () => {
  assert.equal(REGISTRY.regress.refused.length, 4);
  assert.equal(Object.keys(REGISTRY.regress.question).length, 4);
  assert.equal(REGISTRY.regress.unusable.length, 9);
});

// ── ★ WIRING (L45) — the COMMITTED pharn-regress.md line, executed ─────────────────────────────────
test("★ WIRING — pharn-regress.md's pinned fresh line, executed verbatim, reaches `done` on a real npm ci install", () => {
  const text = readFileSync(COMMAND, "utf8");
  const blocks = [];
  {
    let cur = null;
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*```/.test(line)) {
        if (cur) {
          blocks.push(cur.join("\n"));
          cur = null;
        } else cur = [];
        continue;
      }
      if (cur) cur.push(line);
    }
  }
  const fresh = blocks.filter((b) =>
    /^node pharn\/floor\/stage-regress\.mjs --feature <name> --timeout-ms \d+ --budget-ms \d+\s*$/m.test(b)
  );
  assert.equal(fresh.length, 1, `expected exactly one pinned fresh line in pharn-regress.md, found ${fresh.length}`);
  const m = fresh[0].match(/--timeout-ms (\d+) --budget-ms (\d+)/);
  assert.ok(m, "the pinned line must carry both --timeout-ms and --budget-ms");
  assert.ok(Number(m[1]) < 600000, "the pinned --timeout-ms must sit under Claude Code's 600000 ms Bash maximum");
  assert.ok(Number(m[1]) < Number(m[2]) && Number(m[2]) < 600000, "N < B < 600000 (GATE 1 Q2)");

  const dir = mkdtempSync(join(tmpdir(), "sr-wiring-"));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "fx", version: "1.0.0", scripts: { test: "node --test" } }, null, 2) + "\n"
    );
    writeFileSync(
      join(dir, "package-lock.json"),
      JSON.stringify(
        { name: "fx", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "fx", version: "1.0.0" } } },
        null,
        2
      ) + "\n"
    );
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\n");
    writeFileSync(
      join(dir, "src", "index.test.js"),
      "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from './index.js';\ntest('add', () => { assert.equal(add(1,2), 3); });\n"
    );
    mkdirSync(join(dir, FEATURES, FEATURE), { recursive: true });
    const body = specBody();
    const hash = createHash("sha256").update(body).digest("hex");
    writeFileSync(
      join(dir, FEATURES, FEATURE, "SPEC.md"),
      `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`
    );
    writeFileSync(
      join(dir, FEATURES, FEATURE, "PLAN.md"),
      `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — the feature\n- \`src/index.test.js\` — its test\n`
    );
    // The script invokes `node pharn/floor/stage-regress.mjs …` — a REPO-RELATIVE path, resolved from the
    // fixture's own `pharn/floor/`. It runs a base worktree checkout too, so the floor must be COMMITTED,
    // not merely present in the working tree. The closure is DERIVED from imports, never a hand list
    // (L29/L45's own precedent, the retired run-gates.test.mjs WIRING test's FLOOR_MODULES).
    mkdirSync(join(dir, "pharn", "floor"), { recursive: true });
    const seen = new Set();
    const queue = ["stage-regress.mjs"];
    while (queue.length) {
      const m = queue.shift();
      if (seen.has(m)) continue;
      seen.add(m);
      for (const [, dep] of readFileSync(join(HERE, m), "utf8").matchAll(/["'](?:\.\/)?([a-z0-9-]+\.mjs)["']/g)) {
        if (!dep.endsWith(".test.mjs") && existsSync(join(HERE, dep))) queue.push(dep);
      }
    }
    for (const m of seen) copyFileSync(join(HERE, m), join(dir, "pharn", "floor", m));
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD").trim();
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x) { return x; }\n");

    const sub = fresh[0].replaceAll("<name>", FEATURE).trim().concat(` --base ${base}`);
    assert.doesNotMatch(sub, /<[a-z][^>]*>/, `an unsubstituted placeholder remains in: ${sub}`);
    // GRILL G7: never touch the network. The pinned command line is UNCHANGED; only the spawned
    // environment differs. NODE_TEST_CONTEXT is stripped for the reason CLEAN_ENV's header documents — a
    // NESTED `node --test` (the fixture's own "test" script) must not inherit the OUTER suite's coordination
    // channel, or a genuinely failing assertion silently reads back as gate exit 0.
    const env = {
      ...CLEAN_ENV,
      npm_config_offline: "true",
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_update_notifier: "false",
    };
    const start = Date.now();
    const r = spawnSync("sh", ["-c", sub], { cwd: dir, encoding: "utf8", env });
    const durationMs = Date.now() - start;
    let doc = null;
    try {
      doc = JSON.parse(r.stdout);
    } catch {
      /* fall through to the assertion below */
    }
    assert.ok(doc, `the pinned line produced no JSON document: status=${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.equal(doc.status, "done", JSON.stringify(doc));
    assert.equal(doc.verdict, "no-regressions");
    // L24: measured, not assumed.
    void durationMs;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
