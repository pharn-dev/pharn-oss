// pharn/floor/stage-regress.test.mjs — the /pharn-regress stage script's end-to-end suite. Every test drives
// the REAL CLI as a subprocess over a REAL throwaway git repository (mkdtempSync), mirroring run-gates.test.mjs's
// own idiom: the script is exercised through its argv and the filesystem, never imported and never mocked.
//
// The ★ WIRING test extracts `.claude/commands/pharn-regress.md`'s ONE pinned line and executes it (L45):
// a fix that lives only in this file's own invocations, never exercised through the command that actually
// invokes it, is exactly the L45 gap this suite exists to close.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
  copyFileSync,
  chmodSync,
  utimesSync,
  appendFileSync,
  realpathSync,
} from "node:fs";
import { execFileSync, spawnSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { REGRESS_PATHS, PROGRESS_SCHEMA, validateProgress } from "./stage-regress-core.mjs";
import { RECORD_BASENAME } from "./regress-base-reuse-core.mjs";
import { readWork, WORK_FILE } from "./stage-work.mjs";
import { DEFAULT_BASE as COST_BASE } from "./mark-phase.mjs";
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
 *  `withTest: false`), one commit, and a package.json carrying `scripts`. `committed` ({path: content}) adds files to
 *  that base commit. Returns {dir, git, base}. */
function repo({ scripts = { test: "node --test" }, gitignorePharn = true, withTest = true, extraPlanLines = [], committed = {} } = {}) {
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
  for (const [p, content] of Object.entries(committed)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), content);
  }
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

// ── ★ 6.36.0 — a project's gate exclusion, end to end through the real script (grill G4) ─────────────────────
test("★ 6.36.0 — an excluded gate runs on NEITHER side; gate_run.head.excluded and the REGRESSION.md line disclose it; the control runs it", () => {
  const scripts = { test: "node --test", typecheck: 'node -e "process.exit(1)"' };
  const edit = (dir) =>
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x) { return x; }\n");
  // the control: no declaration → typecheck runs on both sides, red at base, so it is pre-existing
  withRepo(
    (dir) => {
      const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
      edit(dir);
      const r = cli(dir, freshArgs(base));
      assert.equal(r.code, 0, r.raw);
      const report = JSON.parse(readFileSync(join(dir, r.json.report), "utf8"));
      assert.deepEqual(report.pre_existing, ["typecheck"]);
      assert.equal(Object.hasOwn(report.gate_run.head, "excluded"), false);
      assert.doesNotMatch(readFileSync(join(dir, r.json.render), "utf8"), /EXCLUDED and NOT RUN/);
    },
    { scripts }
  );
  withRepo(
    (dir) => {
      const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
      edit(dir);
      const r = cli(dir, freshArgs(base));
      assert.equal(r.code, 0, r.raw);
      assert.equal(r.json.verdict, "no-regressions");
      const report = JSON.parse(readFileSync(join(dir, r.json.report), "utf8"));
      assert.deepEqual(Object.keys(report.outside_gates), ["test"], "typecheck ran on neither side");
      assert.deepEqual(report.pre_existing, []);
      assert.deepEqual(report.gate_run.head.excluded, { declared_in: "pharn.config.json#gates.exclude", ids: ["typecheck"] });
      assert.equal(Object.hasOwn(report.gate_run.base, "excluded"), false, "the base side runs the head's set and names nothing itself");
      const md = readFileSync(join(dir, r.json.render), "utf8").split("\n");
      const at = md.findIndex((l) => l.startsWith("**verdict: NO REGRESSIONS**"));
      assert.match(md[at + 2], /^\*\*1 discovered gate\(s\) EXCLUDED and NOT RUN on either side\*\* .*`typecheck`/);
    },
    { scripts, committed: { "pharn.config.json": JSON.stringify({ gates: { exclude: ["typecheck"] } }) + "\n" } }
  );
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

// ── ★ A LISTING PAST 1 MiB (stage-git-maxbuffer, 6.28.3) ─────────────────────────────────────────────────────────────
// Before 6.28.3 gitSync ran at node's 1 MiB default, so the partition phase's whole-repo listings (the test universe
// and the eval pairs) stopped this script with `git ls-files failed: ` on any repo listing more — the review's exact
// string (L41: no fixture here was that big). A BIG repo with a MODEST change: the tree is committed at the base, so
// only src/index.js changes. (A changed set past the argv limit still stops at "verdict" — the extended follow-up
// `regress-inside-echo-list`, not tested here.) Controls (L40, L60): computeTests' own call at node's default buffer is
// ENOBUFS over this tree, and a mutant with ONLY gitSync's ceiling removed, run from the fixture-regex closure copied
// outside the fixture, stops `git-failed` — now naming ENOBUFS.
const CEILING_OPT = ", maxBuffer: GIT_MAX_BUFFER";

/** Paths three 250-byte directory levels deep — 766 bytes each — until their `-z` listing passes 1.25 MiB. Nothing is
 *  written: `repo()`'s `committed` map writes them before its base commit. */
function bigPaths() {
  const dir = ["big", "a".repeat(250), "b".repeat(250), "c".repeat(250)].join("/");
  const paths = [];
  let bytes = 0;
  for (let i = 0; bytes <= (1 << 20) + (1 << 18); i++) {
    const p = `${dir}/${String(i).padStart(5, "0")}.txt`;
    paths.push(p);
    bytes += Buffer.byteLength(p) + 1;
  }
  return { paths, bytes };
}

/** The floor modules stage-regress.mjs needs: every sibling named in a string literal, transitively (★ WIRING's regex). */
function regressClosure() {
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
  return [...seen];
}

test("★ LISTING — a committed tree listing past 1 MiB reaches done; the mutant without gitSync's ceiling stops git-failed naming ENOBUFS", () => {
  const { paths, bytes } = bigPaths();
  assert.ok(bytes > 1 << 20, `anchor (L60): the tree alone lists ${bytes} bytes, past node's 1 MiB default`);
  const { dir, base } = repo({ committed: Object.fromEntries(paths.map((p) => [p, ""])) });
  const mut = mkdtempSync(join(tmpdir(), "sr-mut-"));
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x) { return x; }\n");
    // THE ATTRIBUTION CONTROL (L40): computeTests' call before 6.28.3 — the same options, no ceiling — over this repo.
    assert.throws(
      () =>
        execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
          cwd: dir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
      (e) => e.code === "ENOBUFS",
      "at node's default buffer this listing fails ENOBUFS"
    );
    // THE MUTANT: the closure with only gitSync's ceiling removed, outside the fixture.
    for (const m of regressClosure()) copyFileSync(join(HERE, m), join(mut, m));
    const runtime = readFileSync(join(HERE, "stage-runtime.mjs"), "utf8");
    assert.ok(runtime.includes(CEILING_OPT), "mutation anchor not found in stage-runtime.mjs (L60)");
    writeFileSync(join(mut, "stage-runtime.mjs"), runtime.replace(CEILING_OPT, ""));
    const m = spawnSync(process.execPath, [join(mut, "stage-regress.mjs"), ...freshArgs(base)], {
      cwd: dir,
      encoding: "utf8",
      env: CLEAN_ENV,
    });
    assert.equal(m.status, 2, (m.stdout || "") + (m.stderr || ""));
    const doc = JSON.parse(m.stdout);
    assert.equal(doc.reason_code, "git-failed");
    assert.match(doc.detail, /^git ls-files failed: node error ENOBUFS: /, "the review's string, now with its cause");

    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.status, "done");
    assert.equal(r.json.verdict, "no-regressions");
  } finally {
    rmSync(mut, { recursive: true, force: true });
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

// ── HOSTILE NAMES THROUGH THE REAL PARTITION (6.28.0, `regress-scope-list-grammar`) ─────────────────────────────────
// Before 6.28.0 the partition phase joined its sets into comma lists for `check-regress.mjs scope`, whose list grammar
// trims each name and finds its flags by scanning argv — so an undeclared ` src/index.js` read as the declared
// `src/index.js`, and a lone changed path named `--declared` was taken for the flag. Each test runs the REAL script on
// such a name and requires the escape; its CONTROL feeds the same sets to that CLI the way the pre-6.28.0 phase did,
// which still passes them (exit 0) — the false pass the in-process partition closes (L60).
const CHECK_REGRESS = join(HERE, "check-regress.mjs");
function oldListRoute(dir, changed, declared) {
  const args = ["scope", "--changed", changed.join(","), "--declared", declared.join(","), "--tests", "", "--eval-pairs", ""];
  return spawnSync(process.execPath, [CHECK_REGRESS, ...args, "--feature", FEATURE], { cwd: dir, encoding: "utf8" });
}

test("refused/scope-escaped: a LEADING-SPACE name is compared exactly — never trimmed onto a declared path (hostile name)", () => {
  const { dir, base } = repo();
  try {
    // A directory named " src" (leading space): the changed path is ` src/index.js`, one space away from the declared file.
    mkdirSync(join(dir, " src"));
    writeFileSync(join(dir, " src", "index.js"), "export const shadow = 1;\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    assert.equal(r.json.reason_code, "scope-escaped");
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.escaped, [" src/index.js"], "the name exactly as git printed it");
    assert.deepEqual(scope.inside, [" src/index.js"]);
    // CONTROL — the pre-6.28.0 route: the same sets through the comma-list CLI pass (the trim lands on the declared path).
    const old = oldListRoute(dir, scope.inside, scope.declared);
    assert.equal(old.status, 0, `the list grammar's false pass: ${old.stdout}`);
    assert.deepEqual(JSON.parse(old.stdout).escaped, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refused/scope-escaped: a lone changed path NAMED `--declared` is a path, never the flag (hostile name)", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "--declared"), "not a flag\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    assert.equal(r.json.reason_code, "scope-escaped");
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.escaped, ["--declared"]);
    assert.match(readFileSync(join(dir, r.json.render), "utf8"), /--declared/, "REGRESSION.md names it");
    // CONTROL — the pre-6.28.0 route: argv's flag scan takes the path for `--declared`, and the scope passes.
    const old = oldListRoute(dir, scope.inside, scope.declared);
    assert.equal(old.status, 0, `the list grammar's false pass: ${old.stdout}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ PARITY: for ordinary names the in-process scope.json minus `pre_run_snapshot` is byte-identical to `check-regress.mjs scope`'s own output", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport const two = 2;\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    const text = readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8");
    const scope = JSON.parse(text);
    assert.deepEqual(scope.inside, ["src/index.js"]);
    assert.deepEqual(scope.outside_tests, ["src/index.test.js"], "non-vacuous: an outside test is carried");
    // 6.37.0: the ONE key the CLI never prints, always present — a standalone run reads `no-delivery-run`.
    assert.deepEqual(scope.pre_run_snapshot, { status: "no-delivery-run", unchanged: [] });
    const withoutBlock = { ...scope };
    delete withoutBlock.pre_run_snapshot;
    const args = ["scope", "--changed", scope.inside.join(","), "--declared", scope.declared.join(",")];
    args.push("--tests", scope.outside_tests.join(","), "--eval-pairs", "", "--feature", FEATURE);
    const cliOut = spawnSync(process.execPath, [CHECK_REGRESS, ...args], { cwd: dir, encoding: "utf8" });
    assert.equal(cliOut.status, 0, cliOut.stdout);
    assert.equal(
      `${JSON.stringify(withoutBlock, null, 2)}\n`,
      cliOut.stdout,
      "the same keys, order and bytes run-gates.mjs and render-regression.mjs read"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** An untracked NESTED REPOSITORY at vendor/lib — a directory holding its own `.git`, which git lists as `vendor/lib/`. */
function nestedRepo(dir) {
  mkdirSync(join(dir, "vendor", "lib"), { recursive: true });
  execFileSync("git", ["init", "-q", "."], { cwd: join(dir, "vendor", "lib"), stdio: "pipe" });
  writeFileSync(join(dir, "vendor", "lib", "index.js"), "export const lib = 1;\n");
}

test("R3 (round-2 re-review): an untracked NESTED REPOSITORY keeps git's trailing slash — a bare-directory declaration no longer covers it", () => {
  const { dir, base } = repo({ extraPlanLines: ["- `vendor/lib` — a vendored library, declared as the bare directory"] });
  try {
    nestedRepo(dir);
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    assert.equal(r.json.reason_code, "scope-escaped");
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.escaped, ["vendor/lib/"], "git's own entry, its trailing slash kept");
    // CONTROL — the pre-6.28.0 comma-list route stripped the slash, so the bare declaration covered the entry (exit 0):
    // the one ordinary-looking name whose scope.json bytes, and verdict, moved. Stricter, and stated in the claim.
    const old = oldListRoute(dir, scope.inside, scope.declared);
    assert.equal(old.status, 0, old.stdout);
    assert.deepEqual(JSON.parse(old.stdout).inside, ["vendor/lib"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("R3: the same nested repository under a `vendor/**` declaration proceeds — a glob covers the slashed entry", () => {
  const { dir, base } = repo({ extraPlanLines: ["- `vendor/**` — a vendored library"] });
  try {
    nestedRepo(dir);
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.verdict, "no-regressions");
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.inside, ["vendor/lib/"]);
    assert.deepEqual(scope.escaped, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("done: the same `--declared` file, once the PLAN declares it, proceeds — the exact name matches its declaration (control)", () => {
  const { dir, base } = repo({ extraPlanLines: ["- `--declared` — a file named like a flag"] });
  try {
    writeFileSync(join(dir, "--declared"), "declared now\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.verdict, "no-regressions");
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.escaped, []);
    assert.ok(scope.declared.includes("--declared"), "declared exactly as the PLAN names it");
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
    // Wait for the INSTALL to have started (spawnGate opens install.out first), so the kill lands mid-"sleep
    // 3", past drain-head and worktree, by construction. A fixed 800 ms sleep here was a timing assumption:
    // under a loaded full `npm test` (GATE-2 round 2's verify re-run, 141 s wall) the run had not yet reached
    // drain-head's first checkpoint at 800 ms, and this test failed for that reason alone.
    const t0 = Date.now();
    while (!existsSync(join(dir, REGRESS_PATHS.root, "install.out")) && Date.now() - t0 < 60000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(existsSync(join(dir, REGRESS_PATHS.root, "install.out")), "the run never reached the install step within 60 s");
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

// A3 (GATE-2 round 2) — the kill window the re-review measured still open after round 1: a hard kill DURING
// `git worktree add`. git locks the new worktree "initializing" while it checks the files out, so the kill
// leaves it registered, LOCKED and half-populated; the record names "worktree", and a plain re-`add` failed
// `git-failed` ("already exists"). The checkout is made slow with a smudge filter on one committed file, and
// the whole process group is killed, as a harness kill would. The edit that turns this red: dropping
// `clearBaseWorktree()` from the "worktree" phase (measured: exit 2 `git-failed`).
test("A3 (round 2) — a hard kill DURING `git worktree add` leaves git's own lock; --resume clears it and reaches done", async () => {
  const { dir } = repo();
  try {
    writeFileSync(join(dir, ".gitattributes"), "*.slow filter=slow\n");
    writeFileSync(join(dir, "x.slow"), "x\n");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-q", "-m", "slow checkout"], { cwd: dir });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    execFileSync("git", ["config", "filter.slow.clean", "cat"], { cwd: dir });
    execFileSync("git", ["config", "filter.slow.smudge", "sleep 30; cat"], { cwd: dir });
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");

    const child = spawn(process.execPath, [CLI, ...freshArgs(base)], { cwd: dir, env: CLEAN_ENV, stdio: "ignore", detached: true });
    const t0 = Date.now();
    while (!existsSync(join(dir, REGRESS_PATHS.base)) && Date.now() - t0 < 30000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await new Promise((resolve) => setTimeout(resolve, 1000)); // inside the smudge filter's sleep: mid-checkout
    process.kill(-child.pid, "SIGKILL");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rec = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.stageJson), "utf8"));
    assert.equal(rec.phase, "worktree", "the kill must land in the worktree phase — the scenario under test");
    assert.match(
      execFileSync("git", ["worktree", "list", "--porcelain"], { cwd: dir, encoding: "utf8" }),
      /pharn-regress\/base[\s\S]*?\nlocked/,
      "precondition: git left the half-added worktree LOCKED"
    );

    execFileSync("git", ["config", "--unset", "filter.slow.smudge"], { cwd: dir }); // the re-add must not sleep again
    const r = cli(dir, ["--resume"]);
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.status, "done");
    assert.equal(r.json.verdict, "no-regressions");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// N2 (GATE-2 round 2) — "cleanup" and "render" re-run from a record parked at "verdict". A render that
// crashes AFTER cleanup already removed the worktree (the feature directory made read-only) leaves the
// record at "verdict"; the resumed run's cleanup finds nothing left to remove. Before round 2 it reported
// "removing the base worktree FAILED" for a removal that had succeeded (measured).
test("N2 (round 2) — a render crash after cleanup: the resumed run reports NO cleanup failure", (t) => {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    t.skip("root ignores directory write permissions, so the render cannot be made to fail this way");
    return;
  }
  const { dir, base } = repo();
  const featureDir = join(dir, FEATURES, FEATURE);
  try {
    writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
    chmodSync(featureDir, 0o555);
    let r = cli(dir, freshArgs(base));
    assert.equal(r.code, 1, `the render into a read-only feature directory must crash — the scenario under test: ${r.raw}`);
    assert.ok(!existsSync(join(dir, REGRESS_PATHS.base)), "precondition: cleanup removed the worktree before render crashed");
    assert.equal(JSON.parse(readFileSync(join(dir, REGRESS_PATHS.stageJson), "utf8")).phase, "verdict");

    chmodSync(featureDir, 0o755);
    r = cli(dir, ["--resume"]);
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.status, "done");
    assert.doesNotMatch(readFileSync(join(dir, r.json.render), "utf8"), /removing the base worktree FAILED/);
  } finally {
    chmodSync(featureDir, 0o755);
    rmSync(dir, { recursive: true, force: true });
  }
});

// THE BUDGET CLOCK (GATE-2 round 2) — `elapsed` is measured from the top of runFresh, so the opening fast
// work counts. A PATH shim makes exactly one call slow: phaseBase's `git status --porcelain` (no --base, a
// dirty tree). With a 2 s window (budget − timeout), 3 s of opening work alone forbids the SECOND head gate,
// so the fresh invocation continues at "drain-head". Under the pre-round-2 clock (started after head init),
// elapsed after a sub-second first gate fits the window and the second gate started (the edit that turns
// this red: moving `invocationStart` back into makeBudget). Control: the same shim under a 60 s window runs
// through to `done`, so the stop above is the budget's, not the shim's.
test("budget clock (round 2) — the opening fast work counts against --budget-ms", () => {
  const shimDir = mkdtempSync(join(tmpdir(), "sr-gitshim-"));
  const realGit = execFileSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).trim();
  writeFileSync(
    join(shimDir, "git"),
    `#!/bin/sh\nif [ "$#" -eq 2 ] && [ "$1" = status ] && [ "$2" = --porcelain ]; then sleep 3; fi\nexec "${realGit}" "$@"\n`
  );
  chmodSync(join(shimDir, "git"), 0o755);
  const env = { ...CLEAN_ENV, PATH: `${shimDir}:${CLEAN_ENV.PATH}` };
  const run = (dir, budgetMs) => {
    const r = spawnSync(
      process.execPath,
      [CLI, "--feature", FEATURE, "--timeout-ms", "30000", "--budget-ms", String(budgetMs), "--no-install"],
      { cwd: dir, encoding: "utf8", env }
    );
    let json = null;
    try {
      json = JSON.parse(r.stdout);
    } catch {
      /* a crash path */
    }
    return { code: r.status, json, raw: (r.stdout || "") + (r.stderr || "") };
  };
  const dirs = [];
  try {
    for (const budgetMs of [32000, 90000]) {
      const { dir } = repo({ scripts: { test: "node --test", typecheck: "true" } });
      dirs.push(dir);
      writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x){return x;}\n");
      const r = run(dir, budgetMs);
      if (budgetMs === 32000) {
        assert.equal(r.code, 5, r.raw);
        assert.equal(r.json.phase, "drain-head", "3 s of opening work alone must exhaust a 2 s window after the first gate");
      } else {
        assert.equal(r.code, 0, `control: a 60 s window must run through: ${r.raw}`);
        assert.equal(r.json.status, "done");
      }
    }
  } finally {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
    rmSync(shimDir, { recursive: true, force: true });
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

    // N7 (GATE-2 round 2) — the render promises "the next fresh start removes the leftover worktree". Before
    // clearBaseWorktree, that next start's single --force failed on the still-LOCKED leftover, its rm -rf then
    // deleted the directory under a locked registration prune does not clear, and the plain `add` failed
    // `git-failed` (measured). The worktree is still locked here: this run is that next fresh start. The edit
    // that turns this red is dropping clearBaseWorktree from BOTH call sites — the fresh start's and the
    // "worktree" phase's — because either one alone clears this leftover (measured with each mutant).
    assert.match(
      execFileSync("git", ["worktree", "list", "--porcelain"], { cwd: dir, encoding: "utf8" }),
      /pharn-regress\/base[\s\S]*?\nlocked/,
      "precondition: the leftover base worktree is still locked when the next fresh start begins"
    );
    const next = cli(dir, freshArgs(base));
    assert.equal(next.code, 0, next.raw);
    assert.equal(next.json.status, "done");
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

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// ── BASE-EVIDENCE REUSE (6.33.0, regress-base-reuse) — END TO END, through the real CLI (L45) ─────────
// Every fixture counts its own work: each gate script and the base install append one line to a counter file OUTSIDE
// the repo (so the tree never moves), and a post-checkout hook appends one line per `git worktree add` checkout. The
// HIT is proven by those counters — never by the predicate — and every first run is asserted to count (L34), so a zero
// on a second run cannot come from a fixture that counts nothing. The run markers are opened by their REAL writers.
// ════════════════════════════════════════════════════════════════════════════════════════════════════
const COUNT_JS =
  "import { appendFileSync } from 'node:fs';\n" +
  "const side = /[\\\\/]\\.pharn[\\\\/]pharn-regress[\\\\/]base([\\\\/]|$)/.test(process.cwd()) ? 'base' : 'head';\n" +
  "if (process.env.RBR_COUNTER) appendFileSync(process.env.RBR_COUNTER, `${process.argv[2]} ${side}\\n`);\n";
const RUN_MARKER = join(HERE, "run-marker.mjs");
const LOOP_RECORD = join(HERE, "..", "..", ".claude", "hooks", "require-loop-record.cjs");
const INSTALL_CMD = "node count.mjs install";
const COUNTING_SCRIPTS = {
  test: "node count.mjs test && node --test",
  typecheck: "node count.mjs typecheck",
  build: "node count.mjs build",
};

/** A counting fixture: `repo()` plus count.mjs committed at the base, a post-checkout counter hook, and a counter file
 *  beside (never inside) the repo. */
function reuseRepo({ scripts = COUNTING_SCRIPTS, extraPlanLines = [], committed = {} } = {}) {
  const r = repo({ scripts, extraPlanLines, committed: { "count.mjs": COUNT_JS, ...committed } });
  const counter = `${r.dir}.counter.log`;
  writeFileSync(counter, "");
  const hook = join(r.dir, ".git", "hooks", "post-checkout");
  mkdirSync(dirname(hook), { recursive: true });
  writeFileSync(hook, '#!/bin/sh\n[ -n "$RBR_COUNTER" ] && echo "worktree base" >> "$RBR_COUNTER"\nexit 0\n');
  chmodSync(hook, 0o755);
  return { ...r, counter };
}

function dropReuseRepo(fx) {
  rmSync(fx.dir, { recursive: true, force: true });
  rmSync(fx.counter, { force: true });
}

function counterLines(fx) {
  return readFileSync(fx.counter, "utf8").split("\n").filter(Boolean);
}

function countsSince(fx, from) {
  const c = { worktree: 0, install: 0, base: 0, head: 0 };
  for (const l of counterLines(fx).slice(from)) {
    const [what, side] = l.split(" ");
    if (what === "worktree") c.worktree++;
    else if (what === "install") c.install++;
    else c[side]++;
  }
  return c;
}

/** Run the stage once; return its exit, its document, the report's base_evidence block and what it counted. */
function runReuse(fx, args, env = {}) {
  const from = counterLines(fx).length;
  const r = cli(fx.dir, args, { env: { ...CLEAN_ENV, RBR_COUNTER: fx.counter, ...env } });
  let report = null;
  if (r.json && r.json.report && existsSync(join(fx.dir, r.json.report)))
    report = JSON.parse(readFileSync(join(fx.dir, r.json.report), "utf8"));
  return { ...r, report, be: report ? report.base_evidence : null, counts: countsSince(fx, from) };
}

function reuseArgs(base, extra = []) {
  return ["--feature", FEATURE, "--timeout-ms", "30000", "--install", INSTALL_CMD, "--base", base, ...extra];
}

/** Open a delivery run with its REAL marker writer (run-marker.mjs for /pharn-ship, require-loop-record.cjs for
 *  /pharn-loop), from the fixture, exactly as the orchestrators' pinned lines do. */
function openRun(dir, command = "pharn-loop", feature = FEATURE) {
  const argv = command === "pharn-loop" ? [LOOP_RECORD, "--open", feature, "--cap", "3"] : [RUN_MARKER, "--open", command, feature];
  const r = spawnSync(process.execPath, argv, { cwd: dir, encoding: "utf8", env: CLEAN_ENV });
  assert.equal(r.status, 0, `the ${command} marker writer refused: ${r.stdout}${r.stderr}`);
  return join(dir, ".pharn", command, feature, "active.json");
}

function recordFile(dir) {
  return join(execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: dir, encoding: "utf8" }).trim(), RECORD_BASENAME);
}

function editIndex(dir, n) {
  writeFileSync(join(dir, "src", "index.js"), `export function add(a, b) { return a + b; }\nexport const n${n} = ${n};\n`);
}

// ── ★ THE HIT (the success criterion) ─────────────────────────────────────────────────────────────────
test("★ HIT — a second regress of the same run, after a new build, runs HEAD normally and skips the base worktree, install and every base gate", () => {
  const fx = reuseRepo();
  try {
    openRun(fx.dir);
    editIndex(fx.dir, 1);
    const first = runReuse(fx, reuseArgs(fx.base));
    assert.equal(first.code, 0, first.raw);
    assert.deepEqual(first.be, { reused: false, miss: "no-record", requirement_sha256: first.be.requirement_sha256, recorded: true });
    // L34: the fixture COUNTS — the first run made a worktree, installed, and ran every gate on both sides.
    assert.deepEqual(first.counts, { worktree: 1, install: 1, base: 3, head: 3 });
    assert.ok(existsSync(recordFile(fx.dir)), "the first run published a record in the git dir");
    const headStampFirst = readFileSync(join(fx.dir, REGRESS_PATHS.head, "stamp.json"), "utf8");
    const firstMd = readFileSync(join(fx.dir, first.json.render), "utf8");

    editIndex(fx.dir, 2); // a later build: an in-scope implementation edit, the BASE requirement unchanged
    const second = runReuse(fx, reuseArgs(fx.base));
    assert.equal(second.code, 0, second.raw);
    assert.equal(second.json.status, "done");
    assert.equal(second.be.reused, true, JSON.stringify(second.be));
    assert.equal(second.be.miss, null);
    assert.equal(second.be.recorded, true);
    assert.equal(second.be.requirement_sha256, first.be.requirement_sha256, "the same requirement");
    assert.deepEqual(second.counts, { worktree: 0, install: 0, base: 0, head: 3 }, "HEAD ran in full; nothing ran at BASE");
    assert.equal(second.report.gate_run.base.stamp_sha256, first.report.gate_run.base.stamp_sha256, "the reused stamp is the first run's");
    assert.notEqual(
      JSON.parse(readFileSync(join(fx.dir, REGRESS_PATHS.head, "stamp.json"), "utf8")).fingerprint.final,
      JSON.parse(headStampFirst).fingerprint.final,
      "the HEAD side judged the NEW tree"
    );
    assert.equal(second.report.verdict, first.report.verdict);
    assert.ok(!existsSync(join(fx.dir, REGRESS_PATHS.base)), "no base worktree exists after a HIT");
    const md = readFileSync(join(fx.dir, second.json.render), "utf8");
    assert.match(md, /BASE evidence: REUSED/);
    assert.match(md, /install: none run by this invocation/);
    assert.match(firstMd, /BASE evidence: produced by this invocation \(not reused: `no-record`\); recorded for reuse/);
    // 6.35.0 — one deterministic-work record per execution, whose counts agree with what the fixture COUNTED spawning.
    const { records, dropped } = readWork(join(fx.dir, COST_BASE, FEATURE, WORK_FILE));
    assert.deepEqual(dropped, []);
    assert.equal(records.length, 2);
    const [w1, w2] = records;
    assert.equal(w1.base.evidence, "fresh");
    assert.equal(w1.base.miss, "no-record");
    assert.equal(w1.base.executed, first.counts.base);
    assert.equal(w1.head.executed, first.counts.head);
    assert.equal(w1.install.exit, 0);
    assert.ok(Number.isSafeInteger(w1.install.ms) && w1.install.ms >= 0, "the install's interval was measured");
    assert.equal(w2.base.evidence, "reused");
    assert.equal(w2.base.executed, second.counts.base, "0 base gate processes");
    assert.equal(w2.base.reused, w2.base.required - w2.base.no_files);
    assert.equal(w2.install, null, "no install");
    assert.equal(w2.head.executed, second.counts.head, "HEAD ran in full");
  } finally {
    dropReuseRepo(fx);
  }
});

// ── ★ EQUIVALENCE (mandatory): a FRESH base execution and a REUSED one, same requirement, same semantics ────
test("★ EQUIVALENCE — fresh BASE evidence and reused BASE evidence for one requirement give the same regression semantics", () => {
  // A real regression (src/other.test.js breaks), a pre-existing red gate (typecheck), a green gate (build), and an
  // outside structural eval pair — so the four compared fields are all non-trivial.
  const committed = {
    "src/other.js": "import { add } from './index.js';\nexport function addOne(x) { return add(x, 1); }\n",
    "src/other.test.js":
      "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { addOne } from './other.js';\ntest('addOne', () => { assert.equal(addOne(5), 6); });\n",
    "cap/evals/expected/x.json": "[]\n",
    "cap/findings.json": "[]\n",
    "pharn/floor/check-structural.mjs": "process.exit(0);\n",
  };
  const scripts = {
    test: "node count.mjs test && node --test",
    typecheck: "node count.mjs typecheck && exit 1",
    build: "node count.mjs build",
  };
  const fx = reuseRepo({ scripts, committed });
  try {
    writeFileSync(join(fx.dir, "src", "index.js"), "export function add(a, b) { return a - b; }\n"); // breaks addOne

    // Path A — a FRESH base execution: no delivery run, so nothing is reused and nothing is recorded.
    const a = runReuse(fx, reuseArgs(fx.base));
    assert.equal(a.code, 0, a.raw);
    assert.deepEqual([a.be.reused, a.be.miss, a.be.recorded], [false, "no-delivery-run", false]);
    assert.ok(a.counts.base > 0 && a.counts.worktree === 1, "path A ran the base side");
    const stampA = JSON.parse(readFileSync(join(fx.dir, REGRESS_PATHS.baseGates, "stamp.json"), "utf8"));

    // Path B — the same requirement under a delivery run: a publishing run, then a run that REUSES.
    openRun(fx.dir);
    const publish = runReuse(fx, reuseArgs(fx.base));
    assert.equal(publish.be.recorded, true, JSON.stringify(publish.be));
    const b = runReuse(fx, reuseArgs(fx.base));
    assert.equal(b.code, 0, b.raw);
    assert.equal(b.be.reused, true, JSON.stringify(b.be));
    assert.deepEqual(b.counts, { worktree: 0, install: 0, base: 0, head: 3 }, "the structural gate is not a counting script");
    const stampB = JSON.parse(readFileSync(join(fx.dir, REGRESS_PATHS.baseGates, "stamp.json"), "utf8"));

    // The regression semantics are the same.
    for (const key of ["verdict", "regressions", "pre_existing", "outside_gates"]) {
      assert.deepEqual(b.report[key], a.report[key], `${key} differs between fresh and reused BASE evidence`);
    }
    assert.equal(a.report.verdict, "regressions", "non-vacuity: a real regression");
    assert.deepEqual(a.report.regressions, ["test"]);
    assert.deepEqual(a.report.pre_existing, ["typecheck"]);
    assert.ok(
      Object.keys(a.report.outside_gates).some((id) => id.startsWith("structural:")),
      "the structural pair is compared"
    );
    assert.equal(a.be.requirement_sha256, b.be.requirement_sha256, "one requirement");

    // The reused BASE stamp and the fresh one are the same evidence, run for run.
    const view = (s) => ({
      head: s.head,
      source: s.source,
      source_raw: s.source_raw,
      style_skipped: s.style_skipped,
      required: s.required,
      runs: s.runs.map((r) => ({
        seq: r.seq,
        id: r.id,
        exit: r.exit,
        ran: r.ran,
        timed_out: r.timed_out,
        argv: r.argv,
        shell: r.shell,
        files: r.files,
      })),
    });
    assert.deepEqual(view(stampB), view(stampA));

    // …and the unchanged checker, re-run over the stamps B used, reproduces B's report (what check-loop-fresh E asks).
    const rederived = spawnSync(
      process.execPath,
      [
        join(HERE, "check-regress.mjs"),
        "verdict",
        "--base-stamp",
        join(REGRESS_PATHS.baseGates, "stamp.json"),
        "--head-stamp",
        join(REGRESS_PATHS.head, "stamp.json"),
        "--base",
        fx.base,
        "--inside",
        b.report.inside.join(","),
      ],
      { cwd: fx.dir, encoding: "utf8", env: CLEAN_ENV }
    );
    const withoutBlock = { ...b.report };
    delete withoutBlock.base_evidence;
    delete withoutBlock.pre_run_snapshot; // 6.37.0's additive block
    assert.equal(
      `${JSON.stringify(withoutBlock, null, 2)}\n`,
      rederived.stdout,
      "report minus base_evidence and pre_run_snapshot == the checker's stdout, byte for byte"
    );
  } finally {
    dropReuseRepo(fx);
  }
});

test("HIT — a `no-files` test entry (every test inside the feature) is reused like any other entry", () => {
  const fx = reuseRepo();
  try {
    openRun(fx.dir);
    writeFileSync(join(fx.dir, "src", "index.test.js"), readFileSync(join(fx.dir, "src", "index.test.js"), "utf8") + "// touched\n");
    editIndex(fx.dir, 1);
    const first = runReuse(fx, reuseArgs(fx.base));
    assert.equal(first.code, 0, first.raw);
    const s = JSON.parse(readFileSync(join(fx.dir, REGRESS_PATHS.baseGates, "stamp.json"), "utf8"));
    assert.equal(s.runs.find((r) => r.id === "test").reason, "no-files", "precondition: the test entry has no outside files");
    editIndex(fx.dir, 2);
    const second = runReuse(fx, reuseArgs(fx.base));
    assert.equal(second.be.reused, true, JSON.stringify(second.be));
    assert.equal(second.counts.base, 0);
  } finally {
    dropReuseRepo(fx);
  }
});

test("HIT — a /pharn-ship run (its run-marker.mjs marker) reuses like a /pharn-loop run", () => {
  const fx = reuseRepo();
  try {
    openRun(fx.dir, "pharn-ship");
    editIndex(fx.dir, 1);
    assert.equal(runReuse(fx, reuseArgs(fx.base)).be.recorded, true);
    editIndex(fx.dir, 2);
    const second = runReuse(fx, reuseArgs(fx.base));
    assert.equal(second.be.reused, true, JSON.stringify(second.be));
    assert.deepEqual(second.counts, { worktree: 0, install: 0, base: 0, head: 3 });
  } finally {
    dropReuseRepo(fx);
  }
});

test("HIT — a BUDGETED miss chain (continue + --resume, the pinned line's shape) publishes, and the next invocation reuses", () => {
  const fx = reuseRepo();
  try {
    openRun(fx.dir);
    editIndex(fx.dir, 1);
    let r = runReuse(fx, reuseArgs(fx.base, ["--budget-ms", "1"]));
    let continues = 0;
    while (r.code === 5) {
      continues++;
      assert.ok(continues < 50, "the budget loop never converges");
      r = runReuse(fx, ["--resume", "--budget-ms", "1"]);
    }
    assert.equal(r.code, 0, r.raw);
    assert.ok(continues >= 3, "the chain paused on the base side too");
    assert.equal(r.be.recorded, true, JSON.stringify(r.be));
    editIndex(fx.dir, 2);
    const next = runReuse(fx, reuseArgs(fx.base, ["--budget-ms", "1"]));
    let n = next;
    while (n.code === 5) n = runReuse(fx, ["--resume", "--budget-ms", "1"]);
    assert.equal(n.code, 0, n.raw);
    assert.equal(n.be.reused, true, JSON.stringify(n.be));
    // 6.35.0 — ONE work record per EXECUTION, not per invocation: every `continue` wrote none. The install interval
    // measured in the invocation that ran it survived the resumes through the progress record.
    const { records } = readWork(join(fx.dir, COST_BASE, FEATURE, WORK_FILE));
    assert.deepEqual(
      records.map((w) => w.base.evidence),
      ["fresh", "reused"]
    );
    assert.ok(Number.isSafeInteger(records[0].install.ms), JSON.stringify(records[0].install));
  } finally {
    dropReuseRepo(fx);
  }
});

test("A2 — a root-level HEAD file edited while a budgeted MISS chain is paused on the base side is never bound: recorded:false (requirement-moved), and the next run recomputes", () => {
  const fx = reuseRepo({ extraPlanLines: ["- `tsconfig.json` — root config"] });
  try {
    openRun(fx.dir);
    editIndex(fx.dir, 1);
    writeFileSync(join(fx.dir, "tsconfig.json"), '{ "v": 1 }\n');
    let r = runReuse(fx, reuseArgs(fx.base, ["--budget-ms", "1"]));
    let edited = false;
    let guard = 0;
    while (r.code === 5) {
      assert.ok(++guard < 50, "the budget loop never converges");
      if (!edited && ["worktree", "install", "base-init", "drain-base"].includes(r.json.phase)) {
        // Paused AFTER the reuse decision (drain-head), BEFORE the verdict: the base side was produced for v1.
        writeFileSync(join(fx.dir, "tsconfig.json"), '{ "v": 2 }\n');
        edited = true;
      }
      r = runReuse(fx, ["--resume", "--budget-ms", "1"]);
    }
    assert.equal(r.code, 0, r.raw);
    assert.ok(edited, "non-vacuity: the chain paused on the base side, where the edit landed");
    assert.equal(r.be.reused, false);
    assert.equal(r.be.recorded, false, JSON.stringify(r.be));
    assert.match(readFileSync(join(fx.dir, "pharn", "features", FEATURE, "REGRESSION.md"), "utf8"), /requirement-moved/);
    assert.equal(existsSync(recordFile(fx.dir)), false, "no record binds v1 evidence to the v2 root file");
    const next = runReuse(fx, reuseArgs(fx.base));
    assert.equal(next.code, 0, next.raw);
    assert.equal(next.be.reused, false);
    assert.equal(next.be.miss, "no-record");
    assert.equal(next.counts.worktree, 1, "the base side ran again");
    assert.ok(next.counts.base > 0);
  } finally {
    dropReuseRepo(fx);
  }
});

test("retention — a refused invocation in between does not destroy the retained evidence; the next run still reuses", () => {
  const fx = reuseRepo();
  try {
    openRun(fx.dir);
    editIndex(fx.dir, 1);
    assert.equal(runReuse(fx, reuseArgs(fx.base)).be.recorded, true);
    writeFileSync(join(fx.dir, "src", "undeclared.js"), "x\n");
    const refused = runReuse(fx, reuseArgs(fx.base));
    assert.equal(refused.code, 3, refused.raw);
    assert.equal(refused.json.reason_code, "scope-escaped");
    assert.ok(existsSync(join(fx.dir, REGRESS_PATHS.baseGates, "stamp.json")), "the fresh start kept base-gates/");
    rmSync(join(fx.dir, "src", "undeclared.js"));
    const again = runReuse(fx, reuseArgs(fx.base));
    assert.equal(again.be.reused, true, JSON.stringify(again.be));
  } finally {
    dropReuseRepo(fx);
  }
});

// ── END-TO-END MISS CONTROLS — one input at a time; each shows the base side REALLY ran again ──────────
const COMMIT_TWICE = (fx) => {
  editIndex(fx.dir, 0);
  execFileSync("git", ["add", "-A"], { cwd: fx.dir });
  execFileSync("git", ["commit", "-q", "-m", "second"], { cwd: fx.dir });
  fx.base2 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: fx.dir, encoding: "utf8" }).trim();
};

const E2E_MISSES = [
  {
    miss: "base-changed",
    why: "a different --base commit",
    setup: COMMIT_TWICE,
    args2: (fx) => reuseArgs(fx.base2),
  },
  {
    miss: "gates-changed",
    why: "a gate script added at HEAD",
    opts: { extraPlanLines: ["- `package.json` — scripts"] },
    between: (fx) => {
      const pkg = JSON.parse(readFileSync(join(fx.dir, "package.json"), "utf8"));
      pkg.scripts["type-check"] = "node count.mjs type-check";
      writeFileSync(join(fx.dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
    },
  },
  {
    miss: "gates-changed",
    why: "an explicit --gates command changed",
    args1: (fx) => reuseArgs(fx.base, ["--gates", "node count.mjs custom::custom"]),
    args2: (fx) => reuseArgs(fx.base, ["--gates", "node count.mjs custom2::custom"]),
  },
  {
    miss: "gates-changed",
    why: "an outside test became inside",
    opts: {
      extraPlanLines: ["- `src/other.test.js` — a second test"],
      committed: {
        "src/other.test.js": "import { test } from 'node:test';\ntest('other', () => {});\n",
      },
    },
    between: (fx) => appendFileSync(join(fx.dir, "src", "other.test.js"), "// now inside\n"),
  },
  {
    miss: "gates-changed",
    why: "an outside eval pair became inside",
    opts: {
      extraPlanLines: ["- `cap/findings.json` — the pair's actual"],
      committed: {
        "cap/evals/expected/x.json": "[]\n",
        "cap/findings.json": "[]\n",
        "pharn/floor/check-structural.mjs": "process.exit(0);\n",
      },
    },
    between: (fx) => writeFileSync(join(fx.dir, "cap", "findings.json"), "[ ]\n"),
  },
  {
    miss: "gates-changed",
    why: "a style config was touched, so the style gates are no longer skipped",
    opts: { scripts: { ...COUNTING_SCRIPTS, lint: "node count.mjs lint" }, extraPlanLines: ["- `.prettierrc` — style"] },
    between: (fx) => writeFileSync(join(fx.dir, ".prettierrc"), "{}\n"),
  },
  {
    miss: "execution-changed",
    why: "the --install command changed",
    args2: (fx) => ["--feature", FEATURE, "--timeout-ms", "30000", "--install", `${INSTALL_CMD} && true`, "--base", fx.base],
  },
  {
    miss: "execution-changed",
    why: "the --timeout-ms changed",
    args2: (fx) => ["--feature", FEATURE, "--timeout-ms", "40000", "--install", INSTALL_CMD, "--base", fx.base],
  },
  {
    miss: "execution-changed",
    why: "a root-level HEAD file was added (reachable from the nested base worktree by a parent-directory search)",
    opts: { extraPlanLines: ["- `tsconfig.json` — root config"] },
    between: (fx) => writeFileSync(join(fx.dir, "tsconfig.json"), "{}\n"),
  },
  { miss: "other-run", why: "the delivery run was re-opened (a new run)", between: (fx) => openRun(fx.dir) },
  {
    miss: "no-delivery-run",
    why: "a second delivery command's marker is open for the feature",
    between: (fx) => openRun(fx.dir, "pharn-ship"),
  },
  {
    miss: "no-delivery-run",
    why: "the run marker is older than 24 h",
    between: (fx) => {
      const t = (Date.now() - 25 * 60 * 60 * 1000) / 1000;
      utimesSync(join(fx.dir, ".pharn", "pharn-loop", FEATURE, "active.json"), t, t);
    },
  },
  { miss: "no-record", why: "the record was removed", between: (fx) => rmSync(recordFile(fx.dir)) },
  { miss: "record-malformed", why: "the record was overwritten", between: (fx) => writeFileSync(recordFile(fx.dir), "{}\n") },
  {
    miss: "evidence-unbound",
    why: "the retained stamp's bytes changed",
    between: (fx) => appendFileSync(join(fx.dir, REGRESS_PATHS.baseGates, "stamp.json"), " "),
  },
  {
    miss: "evidence-invalid",
    why: "a retained log was edited",
    between: (fx) => appendFileSync(join(fx.dir, REGRESS_PATHS.baseGates, `${logBasename(0, "test")}.out`), "edited\n"),
  },
  {
    miss: "evidence-invalid",
    why: "a retained log was replaced by a symlink to identical bytes (never followed)",
    between: (fx) => {
      const log = join(fx.dir, REGRESS_PATHS.baseGates, `${logBasename(1, "typecheck")}.out`);
      const copy = `${fx.dir}.log-copy`;
      copyFileSync(log, copy);
      rmSync(log);
      symlinkSync(copy, log);
    },
  },
  {
    miss: "evidence-missing",
    why: "the retained base-gates/ became a file",
    between: (fx) => {
      rmSync(join(fx.dir, REGRESS_PATHS.baseGates), { recursive: true });
      writeFileSync(join(fx.dir, REGRESS_PATHS.baseGates), "not a directory\n");
    },
  },
  {
    miss: "evidence-missing",
    why: "the retained base-gates/ became a symlink to a copy of itself (removed, never followed)",
    between: (fx) => {
      const copy = `${fx.dir}.gates-copy`;
      execFileSync("cp", ["-R", join(fx.dir, REGRESS_PATHS.baseGates), copy]);
      rmSync(join(fx.dir, REGRESS_PATHS.baseGates), { recursive: true });
      symlinkSync(copy, join(fx.dir, REGRESS_PATHS.baseGates));
    },
  },
];

for (const c of E2E_MISSES) {
  test(`MISS end-to-end ${c.miss} — ${c.why}; the base side runs again`, () => {
    const fx = reuseRepo(c.opts);
    try {
      if (c.setup) c.setup(fx);
      openRun(fx.dir);
      editIndex(fx.dir, 1);
      const first = runReuse(fx, (c.args1 ?? ((f) => reuseArgs(f.base)))(fx));
      assert.equal(first.code, 0, first.raw);
      assert.equal(first.be.recorded, true, `precondition — the first run published: ${JSON.stringify(first.be)}`);
      assert.ok(first.counts.base > 0, "L34: the first run counted base work");
      if (c.between) c.between(fx);
      editIndex(fx.dir, 2);
      const second = runReuse(fx, (c.args2 ?? c.args1 ?? ((f) => reuseArgs(f.base)))(fx));
      assert.equal(second.code, 0, second.raw);
      assert.equal(second.be.reused, false, JSON.stringify(second.be));
      assert.equal(second.be.miss, c.miss);
      assert.equal(second.counts.worktree, 1, "the base worktree was created again");
      assert.ok(second.counts.base > 0, "the base gates ran again");
    } finally {
      dropReuseRepo(fx);
      rmSync(`${fx.dir}.log-copy`, { force: true });
      rmSync(`${fx.dir}.gates-copy`, { recursive: true, force: true });
    }
  });
}

test("MISS end-to-end — a foreign feature's retained evidence and record are not reused (other-run)", () => {
  const fx = reuseRepo();
  try {
    mkdirSync(join(fx.dir, FEATURES, "other"), { recursive: true });
    for (const f of ["SPEC.md", "PLAN.md"]) {
      writeFileSync(
        join(fx.dir, FEATURES, "other", f),
        readFileSync(join(fx.dir, FEATURES, FEATURE, f), "utf8").replace(`spec_id: ${FEATURE}`, "spec_id: other")
      );
    }
    execFileSync("git", ["add", "-A"], { cwd: fx.dir });
    execFileSync("git", ["commit", "-q", "-m", "other feature"], { cwd: fx.dir });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: fx.dir, encoding: "utf8" }).trim();
    openRun(fx.dir);
    editIndex(fx.dir, 1);
    assert.equal(runReuse(fx, reuseArgs(base)).be.recorded, true);
    // demo's own run wrote its report and render; to feature "other" those are undeclared changes, so remove them.
    rmSync(join(fx.dir, FEATURES, FEATURE, "regression-report.json"));
    rmSync(join(fx.dir, FEATURES, FEATURE, "REGRESSION.md"));
    openRun(fx.dir, "pharn-loop", "other");
    const second = runReuse(fx, ["--feature", "other", "--timeout-ms", "30000", "--install", INSTALL_CMD, "--base", base]);
    assert.equal(second.code, 0, second.raw);
    assert.equal(second.be.reused, false);
    assert.equal(second.be.miss, "other-run");
    assert.ok(second.counts.base > 0);
  } finally {
    dropReuseRepo(fx);
  }
});

// Evidence a fresh run could not be ASSUMED to reproduce is never published, so the next run finds no record.
const NEVER_RECORDED = [
  { why: "--no-install (dependency resolution may walk up into the HEAD tree)", args: (fx) => freshArgs(fx.base) },
  {
    why: "a failed base install",
    args: (fx) => ["--feature", FEATURE, "--timeout-ms", "30000", "--install", `${INSTALL_CMD} && exit 3`, "--base", fx.base],
  },
  {
    why: "a timed-out base gate",
    scripts: {
      test: "node count.mjs test && node --test",
      typecheck: 'node count.mjs typecheck && node -e "if (/pharn-regress[\\\\/]base/.test(process.cwd())) setTimeout(() => {}, 5000)"',
    },
    args: (fx) => ["--feature", FEATURE, "--timeout-ms", "1500", "--install", INSTALL_CMD, "--base", fx.base],
  },
];

for (const c of NEVER_RECORDED) {
  test(`never recorded — ${c.why}: the run says recorded:false, and the next one misses no-record and recomputes`, () => {
    const fx = reuseRepo(c.scripts ? { scripts: c.scripts } : {});
    try {
      openRun(fx.dir);
      editIndex(fx.dir, 1);
      const first = runReuse(fx, c.args(fx));
      assert.equal(first.code, 0, first.raw);
      assert.equal(first.be.recorded, false, JSON.stringify(first.be));
      assert.ok(!existsSync(recordFile(fx.dir)), "no record was published");
      assert.match(readFileSync(join(fx.dir, first.json.render), "utf8"), /not recorded for reuse \(`evidence-unreliable`\)/);
      editIndex(fx.dir, 2);
      const second = runReuse(fx, c.args(fx));
      assert.equal(second.be.reused, false);
      assert.equal(second.be.miss, "no-record");
      assert.ok(second.counts.base > 0);
    } finally {
      dropReuseRepo(fx);
    }
  });
}

// ── A FORGED PROGRESS HIT (grill F1): a persisted HIT is re-decided in full at the verdict ─────────────
test("a forged stage.json HIT at verdict over a forged stamp is never honored — --resume re-decides and runs the base side", () => {
  const fx = reuseRepo();
  try {
    openRun(fx.dir);
    editIndex(fx.dir, 1);
    const first = runReuse(fx, reuseArgs(fx.base));
    assert.equal(first.be.recorded, true);
    // The forgery: a base stamp whose `test` exit is flipped (and re-hashed into a progress HIT), then --resume.
    const stampPath = join(fx.dir, REGRESS_PATHS.baseGates, "stamp.json");
    const forged = JSON.parse(readFileSync(stampPath, "utf8"));
    forged.runs[0].exit = 1;
    const forgedText = JSON.stringify(forged, null, 2);
    writeFileSync(stampPath, forgedText);
    const inst = { kind: "cmd", cmd: INSTALL_CMD, unmeasured: false };
    writeFileSync(
      join(fx.dir, REGRESS_PATHS.stageJson),
      JSON.stringify({
        schema: PROGRESS_SCHEMA,
        feature: FEATURE,
        timeoutMs: 30000,
        budgetMs: null,
        base: fx.base,
        phase: "verdict",
        install: inst,
        e2eExcluded: [],
        styleSkipped: true,
        installResult: { ran: true, exit: 0, timedOut: false },
        cleanupResult: null,
        baseReuse: {
          reused: true,
          miss: null,
          requirementSha256: first.be.requirement_sha256,
          stampSha256: sha256(forgedText),
          run: { command: "pharn-loop", markerSha256: sha256(readFileSync(join(fx.dir, ".pharn", "pharn-loop", FEATURE, "active.json"))) },
        },
      })
    );
    const r = runReuse(fx, ["--resume"]);
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.be.reused, false, "the forged HIT was not honored");
    assert.equal(r.be.miss, "evidence-unbound");
    assert.ok(r.counts.base > 0 && r.counts.worktree === 1, "the base side ran");
    assert.equal(r.report.outside_gates.test.base, 0, "the verdict reads the REAL base exit, not the forged one");
  } finally {
    dropReuseRepo(fx);
  }
});

// ── CRASH: a kill while a MISS rebuilds the base side can never leave a false HIT ─────────────────────
test("crash — a kill during drain-base of a MISS run, then a fresh run: no record survives, so no false HIT", async () => {
  const scripts = {
    test: "node count.mjs test && node --test",
    typecheck:
      'node count.mjs typecheck && node -e "if (/pharn-regress[\\\\/]base/.test(process.cwd()) && process.env.RBR_SLOW) setTimeout(() => {}, 20000)"',
  };
  const fx = reuseRepo({ scripts });
  try {
    openRun(fx.dir);
    editIndex(fx.dir, 1);
    assert.equal(runReuse(fx, reuseArgs(fx.base)).be.recorded, true);
    // A second run under ANOTHER timeout misses (execution-changed), discards the record, and is killed mid-base.
    const child = spawn(process.execPath, [CLI, ...reuseArgs(fx.base).map((a) => (a === "30000" ? "40000" : a))], {
      cwd: fx.dir,
      env: { ...CLEAN_ENV, RBR_COUNTER: fx.counter, RBR_SLOW: "1" },
      stdio: "ignore",
      detached: true,
    });
    const t0 = Date.now();
    while (counterLines(fx).filter((l) => l === "typecheck base").length < 2 && Date.now() - t0 < 60000) {
      await new Promise((res) => setTimeout(res, 100));
    }
    assert.ok(counterLines(fx).filter((l) => l === "typecheck base").length >= 2, "the kill must land during the second run's base gates");
    process.kill(-child.pid, "SIGKILL");
    await new Promise((res) => setTimeout(res, 500));
    assert.ok(!existsSync(recordFile(fx.dir)), "the miss removed the record before rebuilding the base side");
    // A FRESH run with the FIRST run's requirement: the partial base-gates/ must not be reused.
    const r = runReuse(fx, reuseArgs(fx.base));
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.be.reused, false);
    assert.equal(r.be.miss, "no-record");
    assert.ok(r.counts.base > 0);
  } finally {
    dropReuseRepo(fx);
  }
});

// ── ★ HOOK — the record is out of the WRITE TOOLS' reach; `.pharn/` is not (the reason the record is not there) ──
const PROTECT = join(HERE, "..", "..", ".claude", "hooks", "protect-trusted-paths.cjs");
const ENFORCE = join(HERE, "..", "..", ".claude", "hooks", "enforce-writes-scope.cjs");

/** Each guard anchors its guarded root on where its OWN file lives (an installed project's `.claude/hooks/`), so the
 *  test installs a copy of both hooks into the project it judges, as `pharn update` would — running this repo's copy
 *  against a temp repo would judge this repo instead. */
function installHooks(projectDir) {
  const dir = join(projectDir, ".claude", "hooks");
  mkdirSync(dir, { recursive: true });
  for (const h of [PROTECT, ENFORCE]) copyFileSync(h, join(dir, h.split("/").pop()));
}

function hookExit(hook, projectDir, filePath) {
  const r = spawnSync(process.execPath, [join(projectDir, ".claude", "hooks", hook.split("/").pop())], {
    cwd: projectDir,
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: filePath, content: "{}" }, cwd: projectDir }),
    encoding: "utf8",
    env: { ...CLEAN_ENV, CLAUDE_PROJECT_DIR: projectDir },
  });
  return r.status;
}

test("★ HOOK — both real write guards deny the record path, in a main checkout and in a linked worktree; `.pharn/` evidence is writable", () => {
  const fx = reuseRepo();
  const wt = `${fx.dir}-wt`;
  try {
    // A main checkout: the git dir is `.git/` under the guarded root.
    installHooks(fx.dir);
    const mainRecord = recordFile(fx.dir);
    assert.equal(realpathSync(dirname(mainRecord)), realpathSync(join(fx.dir, ".git")));
    assert.equal(hookExit(PROTECT, fx.dir, mainRecord), 2, "protect-trusted-paths denies git metadata");
    assert.equal(hookExit(ENFORCE, fx.dir, mainRecord), 2, "enforce-writes-scope's default denies it too");
    const evidence = join(fx.dir, REGRESS_PATHS.baseGates, "stamp.json");
    assert.equal(hookExit(PROTECT, fx.dir, evidence), 0);
    assert.equal(hookExit(ENFORCE, fx.dir, evidence), 0, "`.pharn/**` is always writable — why the record is not there");

    // A linked worktree: its own git dir lives in the main checkout's `.git/worktrees/<name>/`, another git tree.
    execFileSync("git", ["worktree", "add", "-q", "--detach", wt], { cwd: fx.dir });
    installHooks(wt);
    const wtRecord = recordFile(wt);
    assert.ok(wtRecord.includes(`${join(".git", "worktrees")}`), `the record lands in the worktree's own git dir: ${wtRecord}`);
    const denied = [hookExit(PROTECT, wt, wtRecord), hookExit(ENFORCE, wt, wtRecord)];
    assert.ok(denied.includes(2), `a write must pass both guards; neither denied: ${denied}`);
    assert.equal(hookExit(ENFORCE, wt, wtRecord), 2, "enforce-writes-scope denies a path inside another git tree");
    // …in the installed posture too, with no run open (its permissive default never admits another git tree).
    writeFileSync(join(wt, "pharn.config.json"), JSON.stringify({ skillsVersion: "6.33.0" }) + "\n");
    assert.equal(hookExit(ENFORCE, wt, wtRecord), 2, "installed, no run open: still denied");
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: fx.dir, stdio: "ignore" });
    } catch {
      /* already gone */
    }
    rmSync(wt, { recursive: true, force: true });
    dropReuseRepo(fx);
  }
});

// ── ★ LOOP FRESHNESS over a HIT: the retained files satisfy check-loop-fresh's C/D/E/H/J unchanged ─────
test("★ A5 (reuse) — check-loop-fresh reads FRESH over a HIT run, with D/E/H/J pinned", () => {
  const fx = reuseRepo();
  try {
    openRun(fx.dir);
    editIndex(fx.dir, 1);
    assert.equal(runReuse(fx, reuseArgs(fx.base)).be.recorded, true);
    editIndex(fx.dir, 2);
    const hit = runReuse(fx, reuseArgs(fx.base));
    assert.equal(hit.be.reused, true, JSON.stringify(hit.be));
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: fx.dir, encoding: "utf8" }).trim();
    const fp = fingerprint(fx.dir, { feature: FEATURE });
    assert.ok(fp.ok);
    writeVerifyStampAndReport(fx.dir, { head, digest: fp.digest });
    const fresh = spawnSync(
      process.execPath,
      [CHECK_LOOP_FRESH, "--feature", FEATURE, "--base", fx.base, "--iter", "2", "--repo", fx.dir],
      {
        encoding: "utf8",
        env: CLEAN_ENV,
      }
    );
    const doc = JSON.parse(fresh.stdout);
    assert.equal(doc.verdict, "FRESH", JSON.stringify(doc));
    for (const id of ["C", "D", "E", "H", "J"]) assert.equal(doc.checks[id], "pass", `check ${id}: ${JSON.stringify(doc.checks)}`);
  } finally {
    dropReuseRepo(fx);
  }
});

// ── ★ WIRING (reuse, L45) — the COMMITTED pharn-regress.md line, executed twice under one run marker ────
test("★ WIRING (reuse) — pharn-regress.md's pinned line, run twice in one delivery run with a real npm ci, reuses on the second", () => {
  const text = readFileSync(COMMAND, "utf8");
  const pinned = text
    .split(/\r?\n/)
    .find((l) => /^node pharn\/floor\/stage-regress\.mjs --feature <name> --timeout-ms \d+ --budget-ms \d+\s*$/.test(l));
  assert.ok(pinned, "the pinned fresh line is present");
  const fx = reuseRepo({ scripts: { test: "node count.mjs test && node --test", build: "node count.mjs build" } });
  try {
    writeFileSync(
      join(fx.dir, "package-lock.json"),
      JSON.stringify(
        { name: "fx", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "fx", version: "1.0.0" } } },
        null,
        2
      ) + "\n"
    );
    // The line names a REPO-RELATIVE script, and the base worktree checks out committed files only: commit the floor.
    mkdirSync(join(fx.dir, "pharn", "floor"), { recursive: true });
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
    assert.ok(
      seen.has("regress-base-reuse.mjs") && seen.has("regress-base-reuse-core.mjs"),
      "the fixture closure carries the reuse modules"
    );
    for (const m of seen) copyFileSync(join(HERE, m), join(fx.dir, "pharn", "floor", m));
    execFileSync("git", ["add", "-A"], { cwd: fx.dir });
    execFileSync("git", ["commit", "-q", "-m", "floor + lockfile"], { cwd: fx.dir });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: fx.dir, encoding: "utf8" }).trim();
    openRun(fx.dir);
    const env = {
      ...CLEAN_ENV,
      RBR_COUNTER: fx.counter,
      npm_config_offline: "true",
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_update_notifier: "false",
    };
    const line = `${pinned.replaceAll("<name>", FEATURE).trim()} --base ${base}`;
    const run = () => {
      const from = counterLines(fx).length;
      const r = spawnSync("sh", ["-c", line], { cwd: fx.dir, encoding: "utf8", env });
      const doc = JSON.parse(r.stdout);
      assert.equal(doc.status, "done", r.stdout + r.stderr);
      const report = JSON.parse(readFileSync(join(fx.dir, doc.report), "utf8"));
      return { be: report.base_evidence, counts: countsSince(fx, from) };
    };
    editIndex(fx.dir, 1);
    const first = run();
    assert.equal(first.be.recorded, true, JSON.stringify(first.be));
    assert.ok(first.counts.base > 0 && first.counts.worktree === 1, "L34: the first run did base work");
    editIndex(fx.dir, 2);
    const second = run();
    assert.equal(second.be.reused, true, JSON.stringify(second.be));
    assert.deepEqual(second.counts, { worktree: 0, install: 0, base: 0, head: 2 });
  } finally {
    dropReuseRepo(fx);
  }
});

// ── THE HEAD OFFER (6.34.0, verify-head-gate-reuse) — its lifecycle through the REAL script ──────────────────────────
function offerFile(dir) {
  return join(
    execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: dir, encoding: "utf8" }).trim(),
    "pharn-regress-head-offer.json"
  );
}

test("HEAD OFFER — published once the HEAD stamp is final, bound to its bytes and this run; discarded by the next fresh start", () => {
  const fx = reuseRepo();
  try {
    // No delivery run: a standalone regress offers nothing (and a stale offer planted earlier is discarded).
    writeFileSync(offerFile(fx.dir), '{"planted":true}\n');
    editIndex(fx.dir, 1);
    const alone = runReuse(fx, reuseArgs(fx.base));
    assert.equal(alone.code, 0, alone.raw);
    assert.equal(existsSync(offerFile(fx.dir)), false, "the fresh start discarded the planted offer; no run, no new one");

    // Inside a run: the offer names this feature, this run's marker digest and the head stamp's exact bytes.
    const marker = openRun(fx.dir);
    const inRun = runReuse(fx, reuseArgs(fx.base));
    assert.equal(inRun.code, 0, inRun.raw);
    const offer = JSON.parse(readFileSync(offerFile(fx.dir), "utf8"));
    const sha = (b) => createHash("sha256").update(b).digest("hex");
    assert.equal(offer.schema, "pharn-regress-head-offer/1");
    assert.equal(offer.feature, FEATURE);
    assert.deepEqual(offer.run, { command: "pharn-loop", marker_sha256: sha(readFileSync(marker)) });
    assert.equal(offer.stamp_sha256, sha(readFileSync(join(fx.dir, REGRESS_PATHS.head, "stamp.json"))));
    // Every HEAD run records its execution identity (what verify compares against).
    const head = JSON.parse(readFileSync(join(fx.dir, REGRESS_PATHS.head, "stamp.json"), "utf8"));
    assert.ok(
      head.runs.every((r) => /^[0-9a-f]{64}$/.test(r.identity_sha256)),
      JSON.stringify(head.runs.map((r) => r.id))
    );
    // The BASE-reuse record is a different file, untouched by the offer.
    assert.notEqual(offerFile(fx.dir), recordFile(fx.dir));
  } finally {
    dropReuseRepo(fx);
  }
});

// ── 6.35.0: the install interval in the progress record ──────────────────────────────────────────────────────────
test("6.35.0 — validateProgress: installResult.ms is optional; when present a non-negative safe integer or null", () => {
  const rec = (installResult) => ({
    schema: PROGRESS_SCHEMA,
    feature: "demo",
    timeoutMs: 540000,
    budgetMs: 570000,
    base: "a".repeat(40),
    phase: "drain-head",
    install: { kind: "cmd", cmd: "npm ci", unmeasured: false },
    e2eExcluded: [],
    styleSkipped: false,
    installResult,
    cleanupResult: null,
    baseReuse: null,
  });
  assert.deepEqual(validateProgress(rec({ ran: true, exit: 0, timedOut: false })), { ok: true }, "a pre-6.35.0 record still resumes");
  assert.deepEqual(validateProgress(rec({ ran: true, exit: 0, timedOut: false, ms: 0 })), { ok: true });
  assert.deepEqual(validateProgress(rec({ ran: true, exit: 0, timedOut: false, ms: null })), { ok: true });
  for (const ms of [-1, 1.5, "10", 2 ** 60, {}]) {
    assert.equal(validateProgress(rec({ ran: true, exit: 0, timedOut: false, ms })).ok, false, JSON.stringify(ms));
  }
});

// ── 6.37.0: the PRE-RUN SNAPSHOT (regress-pre-run-snapshot) — the partition, end to end ────────────────────────────
// The two recorded failures (an abandoned run's untracked feature folder; the user's own uncommitted edit) pass under an
// open run with a snapshot; everything that is not provably unchanged since the snapshot still escapes.
const PRE_RUN_CLI = join(HERE, "pre-run-snapshot.mjs");

function captureSnapshotCli(dir) {
  const r = spawnSync(process.execPath, [PRE_RUN_CLI, "--capture", FEATURE], { cwd: dir, encoding: "utf8", env: CLEAN_ENV });
  assert.equal(r.status, 0, `the capture refused: ${r.stderr}`);
}

/** A repo with an undeclared committed file `src/other.js`, made dirty before the run, plus an abandoned run's folder. */
function dirtyBeforeRun() {
  const r = repo({ committed: { "src/other.js": "export const o = 1;\n" } });
  writeFileSync(join(r.dir, "src", "other.js"), "export const o = 2; // the user's uncommitted edit\n");
  mkdirSync(join(r.dir, FEATURES, "abandoned"), { recursive: true });
  writeFileSync(join(r.dir, FEATURES, "abandoned", "SPEC.md"), "an abandoned run's record\n");
  writeFileSync(join(r.dir, FEATURES, "abandoned", "cost.json"), "{}\n");
  return r;
}

const buildDeclared = (dir) =>
  writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport const built = 1;\n");

test("PRE-RUN — the two recorded cases pass under an open run with a snapshot, and are REPORTED (report, scope.json, REGRESSION.md)", () => {
  const { dir, base } = dirtyBeforeRun();
  try {
    openRun(dir, "pharn-loop");
    captureSnapshotCli(dir);
    buildDeclared(dir);
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.json.verdict, "no-regressions");
    const expected = {
      status: "applied",
      unchanged: ["src/other.js", "pharn/features/abandoned/SPEC.md", "pharn/features/abandoned/cost.json"],
    };
    const report = JSON.parse(readFileSync(join(dir, r.json.report), "utf8"));
    assert.deepEqual(report.pre_run_snapshot, expected);
    assert.deepEqual(Object.keys(report).slice(-2), ["base_evidence", "pre_run_snapshot"], "the two additive blocks, last");
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.pre_run_snapshot, expected);
    assert.deepEqual(scope.escaped, []);
    assert.ok(scope.inside.includes("src/other.js"), "inside is unchanged: the subtraction touches the escape set only");
    const md = readFileSync(join(dir, r.json.render), "utf8");
    assert.match(md, /already changed when this run began \(3\)/);
    assert.match(md, /pharn\/features\/abandoned\/cost\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PRE-RUN — a MIXED case: the build edits a pre-run path and writes a new stray; both escape, the untouched one is reported beside them", () => {
  const { dir, base } = dirtyBeforeRun();
  try {
    openRun(dir, "pharn-ship");
    captureSnapshotCli(dir);
    buildDeclared(dir);
    writeFileSync(join(dir, "src", "other.js"), "export const o = 3; // the build edited the user's file\n");
    writeFileSync(join(dir, "src", "stray.js"), "export const s = 1;\n");
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    assert.equal(r.json.reason_code, "scope-escaped");
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.escaped, ["src/other.js", "src/stray.js"]);
    assert.deepEqual(scope.pre_run_snapshot, {
      status: "applied",
      unchanged: ["pharn/features/abandoned/SPEC.md", "pharn/features/abandoned/cost.json"],
    });
    const md = readFileSync(join(dir, r.json.render), "utf8");
    assert.match(md, /## Pre-run snapshot/);
    assert.match(md, /src\/stray\.js/);
    assert.match(md, /pharn\/features\/abandoned\/SPEC\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PRE-RUN — no open run, no snapshot, or another run: every undeclared change escapes exactly as before, and a standalone render is unchanged", () => {
  const { dir, base } = dirtyBeforeRun();
  try {
    buildDeclared(dir);
    let r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    let scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.pre_run_snapshot, { status: "no-delivery-run", unchanged: [] });
    assert.equal(scope.escaped.length, 3);
    assert.doesNotMatch(readFileSync(join(dir, r.json.render), "utf8"), /Pre-run snapshot/, "a standalone regress renders as before");

    openRun(dir, "pharn-loop");
    r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.equal(scope.pre_run_snapshot.status, "no-snapshot");
    assert.match(readFileSync(join(dir, r.json.render), "utf8"), /not applied \(no-snapshot\)/);

    captureSnapshotCli(dir); // records the build's own write too — then the run is re-opened, which is another run
    openRun(dir, "pharn-loop");
    r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    assert.equal(JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8")).pre_run_snapshot.status, "other-run");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PRE-RUN — base-changed end to end under BASE_RULE: no --base, HEAD moved after the capture → the snapshot does not apply", () => {
  const { dir, git } = dirtyBeforeRun();
  const noBase = ["--feature", FEATURE, "--timeout-ms", "30000", "--no-install"];
  try {
    openRun(dir, "pharn-ship");
    captureSnapshotCli(dir);
    buildDeclared(dir);
    let r = cli(dir, noBase); // control: a dirty tree resolves the base to HEAD, the snapshot's own base
    assert.equal(r.code, 0, r.raw);
    assert.equal(JSON.parse(readFileSync(join(dir, r.json.report), "utf8")).pre_run_snapshot.status, "applied");
    writeFileSync(join(dir, "README.txt"), "committed mid-run\n");
    git("add", "README.txt");
    git("commit", "-q", "-m", "mid-run");
    r = cli(dir, noBase);
    assert.equal(r.code, 3, r.raw);
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.equal(scope.pre_run_snapshot.status, "base-changed");
    assert.ok(scope.escaped.includes("src/other.js"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ENTRY GATES (6.42.0, review R1) — a path an entry gate rewrote after the snapshot is reported in `entry_gate_changes` (report, scope.json, REGRESSION.md), last; without a record no key is written", () => {
  const { dir, base } = repo({ committed: { "src/env.d.ts": "// generated 1\n" } });
  try {
    openRun(dir, "pharn-loop");
    captureSnapshotCli(dir);
    writeFileSync(join(dir, "src", "env.d.ts"), "// regenerated by the entry gates' build\n");
    const rec = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `const m = await import(${JSON.stringify(PRE_RUN_CLI)}); const w = m.recordEntryChanges(${JSON.stringify(FEATURE)}, [["src/env.d.ts", m.pathDigest("src/env.d.ts")]]); process.exit(w.ok ? 0 : 1);`,
      ],
      { cwd: dir, encoding: "utf8", env: CLEAN_ENV }
    );
    assert.equal(rec.status, 0, rec.stderr);
    buildDeclared(dir);
    const r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    const expected = { status: "applied", unchanged: ["src/env.d.ts"] };
    const report = JSON.parse(readFileSync(join(dir, r.json.report), "utf8"));
    assert.deepEqual(report.entry_gate_changes, expected);
    assert.deepEqual(report.pre_run_snapshot, { status: "applied", unchanged: [] });
    assert.deepEqual(Object.keys(report).slice(-3), ["base_evidence", "pre_run_snapshot", "entry_gate_changes"]);
    const scope = JSON.parse(readFileSync(join(dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(scope.entry_gate_changes, expected);
    assert.deepEqual(scope.escaped, []);
    assert.match(readFileSync(join(dir, r.json.render), "utf8"), /changed by this run's entry gates \(1\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PRE-RUN — the RE-RUN bound, pinned: an escape refused in one run is pre-run state for the next and is reported, not refused", () => {
  const { dir, base } = repo();
  try {
    openRun(dir, "pharn-ship");
    captureSnapshotCli(dir);
    buildDeclared(dir);
    writeFileSync(join(dir, "src", "stray.js"), "export const s = 1;\n"); // the first run's build escapes
    let r = cli(dir, freshArgs(base));
    assert.equal(r.code, 3, r.raw);
    assert.equal(r.json.reason_code, "scope-escaped");

    openRun(dir, "pharn-ship"); // a re-run: a new marker, a new snapshot
    captureSnapshotCli(dir);
    r = cli(dir, freshArgs(base));
    assert.equal(r.code, 0, r.raw);
    const report = JSON.parse(readFileSync(join(dir, r.json.report), "utf8"));
    assert.deepEqual(report.pre_run_snapshot, { status: "applied", unchanged: ["src/stray.js"] }, "reported — never silent");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
