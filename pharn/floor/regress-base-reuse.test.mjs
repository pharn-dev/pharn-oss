// pharn/floor/regress-base-reuse.test.mjs — the EXECUTION half of BASE-evidence reuse (regress-base-reuse.mjs): its
// reads per path kind (L59 — a regular file, a link to a file, a dangling link, a directory, a FIFO, an oversize file,
// a symlinked parent), where the record lands (a main checkout and a linked worktree), and publication and discarding
// over a real regress run. The rules are regress-base-reuse-core.test.mjs's; the end-to-end HIT is
// stage-regress.test.mjs's.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, readdirSync, realpathSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readRegularFile,
  readInProject,
  readMarkers,
  recordPath,
  headRootNow,
  discardRetained,
  publishRecord,
  BASE_STAMP,
} from "./regress-base-reuse.mjs";
import { RECORD_BASENAME, MARKER_MAX_BYTES } from "./regress-base-reuse-core.mjs";
import { REGRESS_PATHS } from "./stage-regress-core.mjs";
import { SCHEMA as GATE_RUN_SCHEMA } from "./gate-run-core.mjs";
import { ALGO } from "./worktree-fingerprint.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "stage-regress.mjs");
const LOOP_RECORD = join(HERE, "..", "..", ".claude", "hooks", "require-loop-record.cjs");
const FEATURE = "demo";
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

/** Run `fn` with the process cwd inside `dir` (the module resolves every project path against the cwd, as the stage
 *  script does), restoring it after. */
function inDir(dir, fn) {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(prev);
  }
}

function gitRepo() {
  const dir = mkdtempSync(join(tmpdir(), "rbr-io-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  return { dir, git };
}

// ── READS, PER PATH KIND (L59) ────────────────────────────────────────────────────────────────────────
test("readRegularFile: a regular file is ok with its mtime; absence is ENOENT; every other kind is unusable, never followed", () => {
  const { dir } = gitRepo();
  try {
    writeFileSync(join(dir, "f"), "hello");
    const ok = readRegularFile(join(dir, "f"), 100);
    assert.equal(ok.state, "ok");
    assert.equal(ok.bytes.toString(), "hello");
    assert.ok(Number.isFinite(ok.mtimeMs));
    assert.deepEqual(readRegularFile(join(dir, "absent"), 100), { state: "absent" });
    symlinkSync(join(dir, "f"), join(dir, "link"));
    assert.deepEqual(readRegularFile(join(dir, "link"), 100), { state: "unusable" }, "a link to a regular file is not followed");
    symlinkSync(join(dir, "nowhere"), join(dir, "dangling"));
    assert.deepEqual(readRegularFile(join(dir, "dangling"), 100), { state: "unusable" }, "a dangling link is not absence");
    mkdirSync(join(dir, "d"));
    assert.deepEqual(readRegularFile(join(dir, "d"), 100), { state: "unusable" });
    assert.deepEqual(readRegularFile(join(dir, "f"), 3), { state: "unusable" }, "an oversize file");
    if (spawnSync("mkfifo", [join(dir, "fifo")]).status === 0) {
      assert.deepEqual(readRegularFile(join(dir, "fifo"), 100), { state: "unusable" }, "a FIFO is never blocked on");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readInProject: a symlinked PARENT component is unusable (the containment walk), where O_NOFOLLOW alone would follow it", () => {
  const { dir } = gitRepo();
  const elsewhere = mkdtempSync(join(tmpdir(), "rbr-io-elsewhere-"));
  try {
    mkdirSync(join(elsewhere, FEATURE), { recursive: true });
    writeFileSync(join(elsewhere, FEATURE, "active.json"), "{}\n");
    mkdirSync(join(dir, ".pharn"), { recursive: true });
    symlinkSync(elsewhere, join(dir, ".pharn", "pharn-loop"));
    inDir(dir, () => {
      assert.deepEqual(readInProject(`.pharn/pharn-loop/${FEATURE}/active.json`, MARKER_MAX_BYTES), { state: "unusable" });
      assert.equal(readMarkers(FEATURE)["pharn-loop"].state, "unusable");
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("readMarkers: only the two delivery commands' paths are read — a /pharn-review marker is never looked at", () => {
  const { dir } = gitRepo();
  try {
    mkdirSync(join(dir, ".pharn", "pharn-review", FEATURE), { recursive: true });
    writeFileSync(join(dir, ".pharn", "pharn-review", FEATURE, "active.json"), "{}\n");
    const m = inDir(dir, () => readMarkers(FEATURE));
    assert.deepEqual(Object.keys(m), ["pharn-loop", "pharn-ship"]);
    assert.equal(m["pharn-loop"].state, "absent");
    assert.equal(m["pharn-ship"].state, "absent");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── WHERE THE RECORD LANDS ────────────────────────────────────────────────────────────────────────────
test("recordPath: the absolute git dir of THIS worktree — `.git/` in a main checkout, `.git/worktrees/<name>/` in a linked one", () => {
  const { dir, git } = gitRepo();
  const wt = `${dir}-wt`;
  try {
    writeFileSync(join(dir, "a"), "a");
    git("add", "-A");
    git("commit", "-q", "-m", "a");
    const main = inDir(dir, () => recordPath());
    assert.equal(realpathSync(dirname(main)), realpathSync(join(dir, ".git")));
    assert.equal(main.split("/").pop(), RECORD_BASENAME);
    git("worktree", "add", "-q", "--detach", wt);
    const linked = inDir(wt, () => recordPath());
    assert.match(linked, /\/\.git\/worktrees\/[^/]+\/pharn-regress-base-reuse\.json$/);
    assert.ok(dirname(linked).startsWith("/"), "absolute, never the relative `.git` --git-dir prints");
    const notGit = mkdtempSync(join(tmpdir(), "rbr-io-nogit-"));
    try {
      assert.equal(
        inDir(notGit, () => recordPath()),
        null,
        "no git dir, no record path"
      );
    } finally {
      rmSync(notGit, { recursive: true, force: true });
    }
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: dir, stdio: "ignore" });
    } catch {
      /* already gone */
    }
    rmSync(wt, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("headRootNow: the root-level `inside` paths of the partition, sorted, each hashed as the fingerprint hashes it; null without a partition", () => {
  const { dir } = gitRepo();
  try {
    inDir(dir, () => assert.equal(headRootNow(), null));
    mkdirSync(join(dir, REGRESS_PATHS.root), { recursive: true });
    writeFileSync(join(dir, "tsconfig.json"), "{}\n");
    writeFileSync(
      join(dir, REGRESS_PATHS.scopeJson),
      JSON.stringify({ inside: ["src/a.js", "tsconfig.json", "gone.md", "vendor/", "tsconfig.json"] })
    );
    const hr = inDir(dir, () => headRootNow());
    assert.deepEqual(hr, [
      ["gone.md", null],
      ["tsconfig.json", sha256("{}\n")],
      ["vendor/", null],
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── PUBLICATION AND DISCARDING, over a REAL regress run ───────────────────────────────────────────────
function specBody() {
  return "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n";
}

/** A fixture after ONE real regress run under a /pharn-loop marker: its base evidence retained and recorded. */
function publishedFixture() {
  const { dir, git } = gitRepo();
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "fx", version: "1.0.0", scripts: { test: "node --test" } }, null, 2) + "\n"
  );
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "index.js"), "export const a = 1;\n");
  writeFileSync(join(dir, "src", "index.test.js"), "import { test } from 'node:test';\ntest('t', () => {});\n");
  mkdirSync(join(dir, "pharn", "features", FEATURE), { recursive: true });
  const hash = sha256(specBody());
  writeFileSync(
    join(dir, "pharn", "features", FEATURE, "SPEC.md"),
    `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${specBody()}`
  );
  writeFileSync(
    join(dir, "pharn", "features", FEATURE, "PLAN.md"),
    `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — the feature\n`
  );
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  assert.equal(spawnSync(process.execPath, [LOOP_RECORD, "--open", FEATURE, "--cap", "3"], { cwd: dir, env: CLEAN_ENV }).status, 0);
  writeFileSync(join(dir, "src", "index.js"), "export const a = 2;\n");
  const r = spawnSync(process.execPath, [CLI, "--feature", FEATURE, "--timeout-ms", "30000", "--install", "true", "--base", base], {
    cwd: dir,
    encoding: "utf8",
    env: CLEAN_ENV,
  });
  const doc = JSON.parse(r.stdout);
  assert.equal(doc.status, "done", r.stdout + r.stderr);
  const report = JSON.parse(readFileSync(join(dir, doc.report), "utf8"));
  assert.equal(report.base_evidence.recorded, true, "precondition: the run published");
  const markerBytes = readFileSync(join(dir, ".pharn", "pharn-loop", FEATURE, "active.json"));
  const inputs = {
    feature: FEATURE,
    base,
    install: { kind: "cmd", cmd: "true", unmeasured: false },
    installResult: { ran: true, exit: 0, timedOut: false },
    timeoutMs: 30000,
    gateRunSchema: GATE_RUN_SCHEMA,
    fingerprintAlgo: ALGO,
    decisionRun: { command: "pharn-loop", markerSha256: sha256(markerBytes) },
    decisionRequirementSha256: report.base_evidence.requirement_sha256,
  };
  return { dir, base, inputs };
}

test("publishRecord: publishes exactly what the predicate accepts, and refuses a run the decision did not see (F7)", () => {
  const { dir, inputs } = publishedFixture();
  try {
    inDir(dir, () => {
      const rp = recordPath();
      const before = readFileSync(rp);
      rmSync(rp);
      assert.deepEqual(publishRecord(inputs), { published: true });
      assert.deepEqual(readFileSync(rp), before, "re-publication of the same evidence is byte-identical");
      assert.deepEqual(publishRecord({ ...inputs, decisionRun: null }), { published: false, why: "no-delivery-run" });
      const otherRun = publishRecord({ ...inputs, decisionRun: { command: "pharn-loop", markerSha256: "0".repeat(64) } });
      assert.deepEqual(otherRun, { published: false, why: "other-run" }, "the marker open now is not the run the decision saw");
      const moved = publishRecord({ ...inputs, decisionRequirementSha256: "0".repeat(64) });
      assert.deepEqual(
        moved,
        { published: false, why: "requirement-moved" },
        "evidence is published only for the requirement the decision saw, the one the base side was produced for (A2)"
      );
      const noInstall = publishRecord({ ...inputs, install: { kind: "none", cmd: null, unmeasured: false }, installResult: null });
      assert.equal(noInstall.published, false);
      assert.equal(
        noInstall.why,
        "evidence-unreliable",
        "a `none` install is never published: dependency resolution may walk up into the HEAD tree"
      );
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishRecord: a rename that fails leaves no record and no tmp file behind — `write-failed`, never a throw", () => {
  const { dir, inputs } = publishedFixture();
  try {
    inDir(dir, () => {
      const rp = recordPath();
      rmSync(rp);
      mkdirSync(rp); // a directory at the record's name: rename(file, dir) fails
      writeFileSync(join(rp, "keep"), "x");
      assert.deepEqual(publishRecord(inputs), { published: false, why: "write-failed" });
      assert.deepEqual(
        readdirSync(dirname(rp)).filter((n) => n.startsWith(`${RECORD_BASENAME}.tmp-`)),
        [],
        "no tmp file is left in the git dir"
      );
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("discardRetained: removes the record FIRST and then base-gates/; idempotent; a directory planted at the record's name goes too", () => {
  const { dir } = publishedFixture();
  try {
    inDir(dir, () => {
      const rp = recordPath();
      assert.ok(existsSync(rp) && existsSync(BASE_STAMP));
      discardRetained();
      assert.ok(!existsSync(rp) && !existsSync(REGRESS_PATHS.baseGates));
      discardRetained(); // idempotent
      mkdirSync(join(rp, "nested"), { recursive: true });
      discardRetained();
      assert.ok(!existsSync(rp), "a planted directory cannot block every later publication");
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
