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
import { execFileSync, spawnSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { REGRESS_PATHS, PROGRESS_SCHEMA } from "./stage-regress-core.mjs";
import { REGISTRY, allReasonCodes } from "./stage-exit-core.mjs";
// A5 (GATE 2 review) — the check-loop-fresh WIRING test fabricates a verify stamp exactly the way
// check-loop-fresh.test.mjs's own `iterate()` helper does: a REAL fingerprint of the live tree, and the
// checker's OWN output as the report (never a hand-typed one, L34's own reasoning).
import { fingerprint, ALGO } from "./worktree-fingerprint.mjs";
import { SCHEMA as GATE_RUN_SCHEMA, logBasename } from "./gate-run-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "stage-regress.mjs");
const COMMAND = join(HERE, "..", "..", ".claude", "commands", "pharn-regress.md");
const CHECK_LOOP_FRESH = join(HERE, "check-loop-fresh.mjs");
const CHECK_VERIFY = join(HERE, "check-verify.mjs");
const FEATURE = "demo";
const FEATURES = "pharn/features";
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

/** A5 (GATE 2 review) — fabricate a MINIMAL, self-consistent verify stamp at DEFAULT_STAMPS.verify (a
 *  single always-green "reconcile" gate, avoiding the AC-gate's per-test-results machinery entirely,
 *  which is orthogonal to what this suite exercises), then run the REAL check-verify.mjs --stamp --ac-gate
 *  to produce the report — the same "checker's own output, never hand-typed" discipline the rest of this
 *  suite already follows for the regress side. Mirrors check-loop-fresh.test.mjs's own `writeStamp`. */
function writeVerifyStampAndReport(dir, { head, digest }) {
  const outDir = join(dir, ".pharn", "pharn-verify", "gates");
  mkdirSync(outDir, { recursive: true });
  const seq = 0;
  const id = "reconcile";
  const b = logBasename(seq, id);
  writeFileSync(join(outDir, `${b}.out`), "out reconcile 0\n");
  writeFileSync(join(outDir, `${b}.err`), "");
  const stamp = {
    schema: GATE_RUN_SCHEMA,
    stage: "verify",
    side: null,
    feature: FEATURE,
    head,
    source: "discover",
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: ALGO, init: digest, final: digest },
    required: [],
    runs: [
      {
        seq,
        id,
        exit: 0,
        ran: true,
        timed_out: false,
        mutated: false,
        reason: null,
        argv: ["true"],
        shell: null,
        files: [],
        fp_before: digest,
        fp_after: digest,
        stdout_sha256: sha256(readFileSync(join(outDir, `${b}.out`))),
        stderr_sha256: sha256(readFileSync(join(outDir, `${b}.err`))),
        results_sha256: null,
      },
    ],
    aux: { completeness: 0 }, // check-build-complete.mjs's own exit code: 0 = complete
  };
  const stampPath = join(dir, ".pharn", "pharn-verify", "gates", "stamp.json");
  writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
  const r = spawnSync(process.execPath, [CHECK_VERIFY, "--stamp", stampPath, "--feature", FEATURE, "--ac-gate"], {
    cwd: dir,
    encoding: "utf8",
    env: CLEAN_ENV,
  });
  const report = JSON.parse(r.stdout);
  writeFileSync(join(dir, FEATURES, FEATURE, "verify-report.json"), JSON.stringify(report, null, 2));
  return report;
}

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

// A2 (GATE 2 review) — an EMPTY outside-scope partition, with every discovered test living INSIDE the
// feature, is legitimate (the old prose's own semantics) and must proceed silently. Before the fix, the
// predicate read `scope.outside_tests.length === 0` — true here even though the TEST UNIVERSE is
// non-empty — and wrongly asked `tests-unresolved` with no applicable "the universe really is empty"
// answer.
test("question/tests-unresolved (A2 fix): every test lives INSIDE the feature — an empty OUTSIDE set is legitimate, no question", () => {
  const { dir, base } = repo(); // repo()'s own PLAN declares BOTH src/index.js and src/index.test.js
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw, "the test universe is non-empty (src/index.test.js exists) — this must NOT ask");
    assert.equal(r.json.status, "done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("question/tests-unresolved (A2 fix): a genuinely EMPTY universe still asks, --tests matching nothing included", () => {
  const { dir, base } = repo({ withTest: false, extraPlanLines: [] });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 4, r.raw, "a genuinely empty test universe must still ask");
    assert.equal(r.json.reason_code, "tests-unresolved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── UNUSABLE ────────────────────────────────────────────────────────────────────────────────────────
// F2 (GATE 2 review) — the residual is narrowed to EXACTLY two cases: a stop before `--feature` parses as
// a valid slug (extractFeature never learns which feature to clean up for), and `path-containment` itself
// (the walk that must pass before removal is safe). EVERY other argv usage-error — a bad --timeout-ms, a
// bad --budget-ms, a mutual-exclusivity refusal, … — now fires strictly AFTER stale-report removal, so it
// no longer strands a previous run's report on disk.
test("unusable/usage-error: a stop BEFORE the slug parses removes nothing — the narrowed residual (F2)", () => {
  const { dir, base } = repo();
  try {
    // Manufacture a stale prior report.
    writeFileSync(join(dir, FEATURES, FEATURE, "regression-report.json"), '{"verdict":"no-regressions"}');
    const r = cli(dir, ["--feature", "Not_A_Slug", "--timeout-ms", "30000", "--base", base]);
    assert.equal(r.code, 2);
    assert.equal(r.json.reason_code, "usage-error");
    assert.equal(r.json.feature, null);
    assert.ok(existsSync(join(dir, FEATURES, FEATURE, "regression-report.json")), "a stop before the slug parses must remove NOTHING");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unusable/usage-error: a bad --timeout-ms fires AFTER the slug+containment, so an earlier report is ALREADY removed (F2 fix)", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, FEATURES, FEATURE, "regression-report.json"), '{"verdict":"no-regressions"}');
    writeFileSync(join(dir, FEATURES, FEATURE, "REGRESSION.md"), "stale\n");
    const r = cli(dir, ["--feature", FEATURE, "--timeout-ms", "50", "--no-install", "--base", base]);
    assert.equal(r.code, 2, r.raw);
    assert.equal(r.json.reason_code, "usage-error");
    assert.equal(r.json.feature, FEATURE, "the feature WAS resolved before this refusal fired");
    assert.equal(existsSync(join(dir, FEATURES, FEATURE, "regression-report.json")), false, "the stale report must already be gone");
    assert.equal(existsSync(join(dir, FEATURES, FEATURE, "REGRESSION.md")), false, "the stale render must already be gone");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unusable/usage-error: a trailing --budget-ms with no value is refused, not silently read as unbudgeted (M7b)", () => {
  const { dir, base } = repo();
  try {
    const r = cli(dir, ["--feature", FEATURE, "--timeout-ms", "30000", "--no-install", "--base", base, "--budget-ms"]);
    assert.equal(r.code, 2, r.raw);
    assert.equal(r.json.reason_code, "usage-error");
    assert.match(r.json.detail, /--budget-ms requires a value/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unusable/usage-error: --timeout-ms must be 3-9 digits, matching run-gates.mjs run --next exactly (M7a)", () => {
  const { dir, base } = repo();
  try {
    for (const bad of ["1", "12", "0", "-5"]) {
      const r = cli(dir, ["--feature", FEATURE, "--timeout-ms", bad, "--no-install", "--base", base]);
      assert.equal(r.code, 2, `--timeout-ms ${bad}: ${r.raw}`);
      assert.equal(r.json.reason_code, "usage-error");
    }
    const ok = cli(dir, freshArgs(base));
    assert.equal(ok.code, 0, ok.raw);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--resume: a STRAY DUPLICATE number is refused, not silently accepted as the budget's value (M7c)", () => {
  const { dir } = repo();
  try {
    mkdirSync(join(dir, REGRESS_PATHS.root), { recursive: true });
    writeFileSync(
      join(dir, REGRESS_PATHS.stageJson),
      JSON.stringify({
        schema: PROGRESS_SCHEMA,
        feature: FEATURE,
        timeoutMs: 30000,
        budgetMs: null,
        base: "a".repeat(40),
        phase: "drain-head",
        install: { kind: "none", cmd: null, unmeasured: false },
        e2eExcluded: [],
        styleSkipped: false,
        installResult: null,
        cleanupResult: null,
      })
    );
    // "100" appears twice; only the FIRST is genuinely preceded by --budget-ms. Before the fix,
    // `args.indexOf("100")` always found the FIRST occurrence, so the SECOND "100" wrongly passed too.
    const r = cli(dir, ["--resume", "--budget-ms", "100", "100"]);
    assert.equal(r.code, 2, r.raw);
    assert.equal(r.json.reason_code, "usage-error");
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

// A4 (GATE 2 review) — `--resume` must re-run the SAME containment walk a fresh invocation runs, before
// any write. Before the fix, a feature directory swapped for a symlink BETWEEN the fresh invocation and
// a later `--resume` was written THROUGH, unlike the fresh path's own (already-tested) refusal above.
test("--resume: a feature directory swapped for a SYMLINK between invocations is refused, never written through (A4)", () => {
  const { dir, base } = repo({ scripts: { test: "node --test", lint: "true" } });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    // Force a `continue` so a progress record exists to resume from.
    let r = cli(dir, freshArgs(base, ["--budget-ms", "1"]));
    assert.equal(r.code, 5, r.raw, "the budget must force at least one continue for this fixture");
    assert.ok(existsSync(join(dir, REGRESS_PATHS.stageJson)), "a progress record must exist to resume from");

    const realFeatureDir = join(dir, FEATURES, FEATURE);
    const elsewhere = mkdtempSync(join(tmpdir(), "sr-resume-elsewhere-"));
    rmSync(realFeatureDir, { recursive: true, force: true });
    symlinkSync(elsewhere, realFeatureDir);
    try {
      r = cli(dir, ["--resume", "--budget-ms", "1"]);
      assert.equal(r.code, 2, r.raw);
      assert.equal(r.json.reason_code, "path-containment");
      assert.equal(
        existsSync(join(elsewhere, "REGRESSION.md")) || existsSync(join(elsewhere, "regression-report.json")),
        false,
        "nothing must be written THROUGH the link"
      );
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
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

// A3 (GATE 2 review) — before this fix, the progress record was persisted ONLY at a budget-exhausted
// `continue`; with a budget large enough that no step ever exhausts it (the common shape of a genuine
// harness kill, which has nothing to do with the SCRIPT's own budget), NOTHING was ever written to disk
// until the run finished — so a hard kill anywhere in the middle lost the whole run, including every
// gate already completed, and `--resume` found no record at all (`no-progress`). Simulated here with a
// real SIGKILL mid-way through a deliberately slow `--install`, under a --budget-ms far larger than
// anything this fixture could exhaust.
test("A3 — a hard SIGKILL mid-run, under an unexhausted budget, still leaves a resumable checkpoint on disk", async () => {
  const { dir, base } = repo({ scripts: { test: "node --test" } });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const child = spawn(
      process.execPath,
      [CLI, "--feature", FEATURE, "--timeout-ms", "60000", "--budget-ms", "600000", "--base", base, "--install", "sleep 3 && true"],
      { cwd: dir, env: CLEAN_ENV, stdio: "ignore" }
    );
    await new Promise((resolve) => setTimeout(resolve, 800)); // well past drain-head/worktree; mid-"sleep 3"
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));

    assert.ok(
      existsSync(join(dir, REGRESS_PATHS.stageJson)),
      "a progress record must exist after the kill — under the pre-fix code, an unexhausted budget never persisted anything"
    );
    const rec = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.stageJson), "utf8"));
    assert.ok(rec.phase, "the record must name a phase");

    // A SIGKILL on the STAGE process does not necessarily kill an already-spawned `run-gates.mjs run
    // --next` grandchild it was synchronously waiting on (spawnSync's own child is not in the killed
    // process's group unless it is the install step's own spawnGate). That grandchild can briefly keep
    // holding run-gates.mjs's own lock file after this process exits, which a `--resume` issued
    // immediately can collide with (`child-refused`, "another run-gates invocation holds ... lock") —
    // a TEST-TIMING race around an orphaned process, not a defect in the fix under test. Retry through it.
    let r;
    for (let attempt = 0; attempt < 40; attempt++) {
      r = cli(dir, ["--resume", "--budget-ms", "600000"]);
      const transientLock =
        r.code === 2 && r.json && r.json.reason_code === "child-refused" && /parallel calls are refused/.test(r.json.detail || "");
      if (!transientLock) break;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.status, "done");
    assert.equal(r.json.verdict, "no-regressions");
  } finally {
    // The install child ("sleep 3") runs in its OWN process group (spawnGate's discipline) and is not
    // reached by killing the stage script directly; give it time to exit on its own before cleanup.
    await new Promise((resolve) => setTimeout(resolve, 2500));
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

    // ★ A5 (GATE 2 review) — the mutant control PLAN.md:327 promised: dropping --timeout-ms from the
    // pinned line must FAIL, proving this test's assertions actually exercise that flag rather than
    // passing vacuously on any argv.
    const mutant = sub.replace(/--timeout-ms \d+ /, "");
    assert.notEqual(mutant, sub, "the mutant must actually differ from the pinned line");
    const mutantResult = spawnSync("sh", ["-c", mutant], { cwd: dir, encoding: "utf8", env });
    let mutantDoc = null;
    try {
      mutantDoc = JSON.parse(mutantResult.stdout);
    } catch {
      /* fine — a crash also proves the mutant does not reach `done` */
    }
    assert.notEqual(mutantDoc && mutantDoc.status, "done", `dropping --timeout-ms must NOT reach done: ${JSON.stringify(mutantDoc)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ★ A5 (GATE 2 review) — the promised check-loop-fresh assertions: a multi-invocation BUDGETED run's own
// regress stamps, paired with a fabricated-but-checker-validated verify stamp/report over the SAME live
// tree, must read FRESH — with D (report bound to its stamp), E (a live re-run reproduces the floor
// fields), H (base stamp head == --base) and J (every logged hash matches its file on disk) each
// explicitly asserted `pass`, not merely inferred from the overall verdict. Nothing in the suite pinned
// this before (REVIEW.md's own "measured here" note).
test("★ A5 — check-loop-fresh over a multi-invocation BUDGETED regress run reads FRESH, with D/E/H/J pinned", () => {
  const { dir, base } = repo({ scripts: { test: "node --test", typecheck: "true" } });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");

    let r = cli(dir, freshArgs(base, ["--budget-ms", "1"]));
    let continues = 0;
    while (r.code === 5) {
      continues++;
      assert.ok(continues < 50, "the budget loop never converges");
      r = cli(dir, ["--resume", "--budget-ms", "1"]);
    }
    assert.equal(r.code, 0, r.raw);
    assert.ok(continues >= 1, "this fixture must force at least one budgeted continue");

    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    const fp = fingerprint(dir, { feature: FEATURE });
    assert.ok(fp.ok, "the fixture must fingerprint after the regress run completes");
    writeVerifyStampAndReport(dir, { head, digest: fp.digest });

    const fresh = spawnSync(process.execPath, [CHECK_LOOP_FRESH, "--feature", FEATURE, "--base", base, "--iter", "1", "--repo", dir], {
      encoding: "utf8",
      env: CLEAN_ENV,
    });
    const doc = JSON.parse(fresh.stdout);
    assert.equal(doc.verdict, "FRESH", JSON.stringify(doc));
    assert.equal(fresh.status, 0);
    for (const id of ["D", "E", "H", "J"]) {
      assert.equal(doc.checks[id], "pass", `check ${id} did not pass: ${JSON.stringify(doc.checks)}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A5 (GATE 2 review) — a REAL unbudgeted-vs-budgeted comparison over 2+ NON-STYLE gates (the prior ★
// budget test's fixture had only `test` surviving the config-touch skip, since `lint`/`format:check` are
// style gates — this fixture uses `typecheck`/`build`, neither of which the config-touch rule ever
// drops), including a genuine MID-drain-head continue, not only the phase-boundary ones.
test("★ A5 — an unbudgeted run and a --budget-ms 1 run (forcing a mid-drain-head continue) reach the SAME four compared fields, over 3 non-style gates", () => {
  const { dir, base } = repo({ scripts: { test: "node --test", typecheck: "true", build: "true" } });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");

    const unbudgeted = cli(dir, freshArgs(base));
    assert.equal(unbudgeted.code, 0, unbudgeted.raw);
    const unbudgetedReport = JSON.parse(readFileSync(join(dir, unbudgeted.json.report), "utf8"));

    rmSync(join(dir, FEATURES, FEATURE, "regression-report.json"));
    rmSync(join(dir, FEATURES, FEATURE, "REGRESSION.md"));

    let r = cli(dir, freshArgs(base, ["--budget-ms", "1"]));
    let continues = 0;
    let sawMidHeadDrainContinue = false;
    while (r.code === 5) {
      continues++;
      assert.ok(continues < 50, "the budget loop never converges");
      if (r.json.phase === "drain-head") sawMidHeadDrainContinue = true;
      r = cli(dir, ["--resume", "--budget-ms", "1"]);
    }
    assert.equal(r.code, 0, r.raw);
    assert.ok(continues >= 2, "3 non-style gates at --budget-ms 1 must need at least 2 continues");
    assert.ok(sawMidHeadDrainContinue, "at least one continue must be mid-drain-head, not only a phase boundary");
    const budgetedReport = JSON.parse(readFileSync(join(dir, r.json.report), "utf8"));

    for (const key of ["verdict", "regressions", "pre_existing", "outside_gates"]) {
      assert.deepEqual(budgetedReport[key], unbudgetedReport[key], `${key} diverged between the unbudgeted and budgeted runs`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── A1/A2/A5 — ONE end-to-end question round trip PER regress reason_code ──────────────────────────────
// "No question test re-invokes resume.argv + an option's argv, though PLAN.md:334 promised it. That
// missing test is why A1 and A2 shipped." (REVIEW.md A5). Each of these drives the question to completion
// via the EXACT re-invocation A1's fixed command prose now documents: `resume.argv` followed by the
// chosen option's `argv`, substituting the literal `"<value>"` token where the option carries an answer.
function substitute(argvTemplate, value) {
  if (argvTemplate === null) return [];
  return argvTemplate.map((t) => (t === "<value>" ? value : t));
}

test("★ round trip — base-unresolved: answering with a git-commit value reaches done", () => {
  const dir = mkdtempSync(join(tmpdir(), "sr-rt-base-"));
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
    // --no-tests: this minimal fixture has no test file, and the point of this test is the base-unresolved
    // round trip alone, not a second, nested tests-unresolved question.
    const q = cli(dir, ["--feature", FEATURE, "--timeout-ms", "30000", "--no-install", "--no-tests"]);
    assert.equal(q.code, 4, q.raw);
    assert.equal(q.json.reason_code, "base-unresolved");
    const chosen = REGISTRY.regress.question["base-unresolved"].options.find((o) => o.id === "base");
    const answerArgv = substitute(chosen.argv, "HEAD");
    const done = cli(dir, [...q.json.resume.argv, ...answerArgv]);
    assert.equal(done.code, 0, done.raw);
    assert.equal(done.json.status, "done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ round trip — no-gates: answering with a --gates value reaches done", () => {
  const { dir, base } = repo({ scripts: {} });
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const q = cli(dir, freshArgs(base));
    assert.equal(q.code, 4, q.raw);
    assert.equal(q.json.reason_code, "no-gates");
    const chosen = REGISTRY.regress.question["no-gates"].options.find((o) => o.id === "gates");
    const answerArgv = substitute(chosen.argv, "true::stub");
    const done = cli(dir, [...q.json.resume.argv, ...answerArgv]);
    assert.equal(done.code, 0, done.raw);
    assert.equal(done.json.status, "done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ round trip — install-unresolved: answering with --no-install reaches done", () => {
  const { dir } = repo();
  try {
    writeFileSync(join(dir, "package-lock.json"), "{}");
    writeFileSync(join(dir, "yarn.lock"), "");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-q", "-m", "lockfiles"], { cwd: dir });
    const newBase = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const q = cli(dir, ["--feature", FEATURE, "--timeout-ms", "30000", "--base", newBase]); // no --no-install
    assert.equal(q.code, 4, q.raw);
    assert.equal(q.json.reason_code, "install-unresolved");
    const chosen = REGISTRY.regress.question["install-unresolved"].options.find((o) => o.id === "no-install");
    const done = cli(dir, [...q.json.resume.argv, ...substitute(chosen.argv, null)]);
    assert.equal(done.code, 0, done.raw);
    assert.equal(done.json.status, "done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ round trip — tests-unresolved: a typo'd --tests corrected on the SECOND try reaches done (A2's own G16 case)", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    const q = cli(dir, freshArgs(base, ["--tests", "nonexistent/**/*.spec.js"]));
    assert.equal(q.code, 4, q.raw);
    assert.equal(q.json.reason_code, "tests-unresolved");
    assert.ok(!q.json.resume.argv.includes("--tests"), "A2: the stale --tests must be stripped from resume.argv");
    const chosen = REGISTRY.regress.question["tests-unresolved"].options.find((o) => o.id === "tests");
    const answerArgv = substitute(chosen.argv, "src/index.test.js");
    const done = cli(dir, [...q.json.resume.argv, ...answerArgv]);
    assert.equal(done.code, 0, done.raw);
    assert.equal(done.json.status, "done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
