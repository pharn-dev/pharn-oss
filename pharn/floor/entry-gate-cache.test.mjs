// pharn/floor/entry-gate-cache.test.mjs — the storage half of the entry check's cached-red evidence (gate-evidence-cache,
// Linear CORE-86): where the two git-dir files live (the common dir for the record, so a fresh worktree reads it), that
// reads never follow a link, that nothing here throws, and the ★ HOOK probe that both files are out of the write tools'
// reach (L65).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cachePath,
  inputsPath,
  readCache,
  writeCache,
  clearCache,
  readInputs,
  writeInputs,
  discardInputs,
  captureInputs,
  nodeIdentity,
  installState,
  treeExcluding,
} from "./entry-gate-cache.mjs";
import { CACHE_BASENAME, INPUTS_BASENAME, INSTALL_FILES, buildRecord } from "./entry-gate-cache-core.mjs";
import { fingerprint } from "./worktree-fingerprint.mjs";
import { ENTRY_PATHS } from "./entry-gates-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const NONCE = "0123456789abcdef0123456789abcdef";
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

function repo() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "entry-gate-cache-")));
  writeFileSync(join(dir, ".gitignore"), "pharn/.run/\nnode_modules/\n");
  writeFileSync(join(dir, "a.txt"), "a\n");
  writeFileSync(join(dir, "package-lock.json"), '{"lockfileVersion":3}\n');
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
  git("init", "-q", ".");
  git("add", "-A");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init");
  return dir;
}

function inDir(dir, fn) {
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(cwd);
  }
}

function inputsFor(dir, over = {}) {
  const i = inDir(dir, () => captureInputs({ feature: "one", nonce: NONCE, timeoutMs: 540000, measuredAt: "2026-11-12T10:00:00.000Z" }));
  assert.ok(i, "inputs are computable in a plain repository");
  return { ...i, ...over };
}

function record(dir) {
  const r = buildRecord({
    inputs: inputsFor(dir),
    stamp: {
      head: "a".repeat(40),
      fingerprint: { algo: "x", init: "b".repeat(64), final: "b".repeat(64) },
      runs: [{ id: "test", shell: null, argv: ["npm", "run", "test"], files: [], mutated: false }],
    },
    red: ["test"],
  });
  assert.ok(r);
  return r;
}

test("the record lives in the git COMMON dir — the same file from a linked worktree — and the inputs in each tree's own git dir", () => {
  const dir = repo();
  const wt = `${dir}-wt`;
  try {
    const main = inDir(dir, () => cachePath());
    assert.equal(main, join(dir, ".git", CACHE_BASENAME));
    assert.equal(
      inDir(dir, () => inputsPath()),
      join(dir, ".git", INPUTS_BASENAME)
    );
    execFileSync("git", ["worktree", "add", "-q", "--detach", wt], { cwd: dir });
    assert.equal(realpathSync(dirname(inDir(wt, () => cachePath()))), realpathSync(join(dir, ".git")), "one record per repository");
    assert.ok(inDir(wt, () => inputsPath()).includes(join(".git", "worktrees")), "inputs stay per worktree");
    // A record written from the main checkout is read from the worktree.
    assert.deepEqual(
      inDir(dir, () => writeCache(record(dir))),
      { ok: true }
    );
    assert.equal(inDir(wt, () => readCache()).state, "ok");
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: dir, stdio: "ignore" });
    } catch {
      /* gone */
    }
    rmSync(wt, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("round trip: write, read, clear (idempotent); a defective or non-JSON record reads unusable", () => {
  const dir = repo();
  try {
    inDir(dir, () => {
      assert.deepEqual(readCache(), { state: "absent" });
      assert.deepEqual(clearCache(), { ok: true, removed: false });
      const r = record(dir);
      assert.deepEqual(writeCache(r), { ok: true });
      assert.deepEqual(readCache(), { state: "ok", value: r });
      writeFileSync(cachePath(), "{nope");
      assert.deepEqual(readCache(), { state: "unusable" });
      writeFileSync(cachePath(), JSON.stringify({ ...r, extra: 1 }));
      assert.deepEqual(readCache(), { state: "unusable" });
      assert.deepEqual(clearCache(), { ok: true, removed: true });
      assert.deepEqual(readCache(), { state: "absent" });
      const i = inputsFor(dir);
      assert.deepEqual(writeInputs(i), { ok: true });
      assert.deepEqual(readInputs(), { state: "ok", value: i });
      assert.deepEqual(discardInputs(), { ok: true, removed: true });
      assert.deepEqual(readInputs(), { state: "absent" });
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a link at the record path is never followed (unusable); a planted directory is cleared", () => {
  const dir = repo();
  try {
    inDir(dir, () => {
      writeFileSync(join(dir, "real.json"), JSON.stringify(record(dir)));
      symlinkSync(join(dir, "real.json"), cachePath());
      assert.deepEqual(readCache(), { state: "unusable" });
      assert.deepEqual(clearCache(), { ok: true, removed: true });
      assert.ok(existsSync(join(dir, "real.json")), "clearing a link removes the link, not its target");
      mkdirSync(cachePath());
      assert.deepEqual(readCache(), { state: "unusable" });
      assert.deepEqual(clearCache(), { ok: true, removed: true });
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("outside a git repository nothing throws: no path, inputs unavailable, writes and clears return a why (GATE 1 check b)", () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "entry-gate-cache-nogit-")));
  try {
    inDir(dir, () => {
      const env = process.env.GIT_CEILING_DIRECTORIES;
      process.env.GIT_CEILING_DIRECTORIES = dirname(dir);
      try {
        assert.equal(cachePath(), null);
        assert.equal(inputsPath(), null);
        assert.deepEqual(readCache(), { state: "absent" });
        assert.deepEqual(writeCache({}), { ok: false, why: "git-dir-unresolved" });
        assert.deepEqual(clearCache(), { ok: false, why: "git-dir-unresolved" });
        assert.equal(captureInputs({ feature: "one", nonce: NONCE, timeoutMs: 540000, measuredAt: "2026-11-12T10:00:00.000Z" }), null);
      } finally {
        if (env === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
        else process.env.GIT_CEILING_DIRECTORIES = env;
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unwritable git dir is a returned write-failed, never a throw (GATE 1 check b)", () => {
  const dir = repo();
  try {
    inDir(dir, () => {
      mkdirSync(`${cachePath()}.tmp-${process.pid}`); // the temp name is taken by a directory: the `wx` write fails
      assert.deepEqual(writeCache(record(dir)), { ok: false, why: "write-failed" });
      assert.deepEqual(readCache(), { state: "absent" });
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test(
  "a record in a read-only git dir is a returned remove-failed, never a throw (GATE 1 check b)",
  { skip: process.getuid?.() === 0 },
  () => {
    const dir = repo();
    try {
      inDir(dir, () => {
        assert.deepEqual(writeCache(record(dir)), { ok: true });
        chmodSync(join(dir, ".git"), 0o555);
        try {
          assert.deepEqual(clearCache(), { ok: false, why: "remove-failed" });
          assert.equal(readCache().state, "ok", "control: the record is still there");
        } finally {
          chmodSync(join(dir, ".git"), 0o755);
        }
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
);

test("captureInputs reads the running node, the repo-relative prefix, the declared exclusion and the install files (AC6)", () => {
  const dir = repo();
  try {
    mkdirSync(join(dir, "node_modules"));
    writeFileSync(join(dir, "node_modules", ".package-lock.json"), "{}\n");
    writeFileSync(join(dir, "pharn.config.json"), JSON.stringify({ gates: { exclude: ["e2e", "build"] } }));
    const i = inputsFor(dir);
    assert.equal(i.node, `${process.version} ${process.platform}-${process.arch}`);
    assert.equal(i.node, nodeIdentity());
    assert.equal(i.prefix, "");
    assert.deepEqual(i.exclude, ["build", "e2e"]);
    assert.deepEqual(
      i.install.map(([p]) => p),
      [...INSTALL_FILES]
    );
    const lock = Object.fromEntries(i.install);
    assert.match(lock["package-lock.json"], /^[0-9a-f]{64}$/);
    assert.match(lock["node_modules/.package-lock.json"], /^[0-9a-f]{64}$/, "an ignored install record is still bound");
    assert.equal(lock["yarn.lock"], null);
    writeFileSync(join(dir, "package-lock.json"), '{"lockfileVersion":3,"x":1}\n');
    assert.notEqual(Object.fromEntries(inDir(dir, () => installState()))["package-lock.json"], lock["package-lock.json"]);
    // From a subdirectory the prefix is that subdirectory.
    mkdirSync(join(dir, "sub"));
    assert.equal(
      inDir(join(dir, "sub"), () =>
        captureInputs({ feature: "one", nonce: NONCE, timeoutMs: 1000, measuredAt: "2026-11-12T10:00:00.000Z" })
      ).prefix,
      "sub/"
    );
    // A malformed exclusion is no inputs at all (the lookup then misses inputs-unavailable).
    writeFileSync(join(dir, "pharn.config.json"), "{nope");
    assert.equal(
      inDir(dir, () => captureInputs({ feature: "one", nonce: NONCE, timeoutMs: 1000, measuredAt: "2026-11-12T10:00:00.000Z" })),
      null
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("treeExcluding: the source run's feature directory is left out as well; with the same feature it is the entry digest itself", () => {
  const dir = repo();
  try {
    inDir(dir, () => {
      const base = fingerprint(".", { feature: "two", stage: "entry" });
      mkdirSync(join(dir, "pharn", "features", "one"), { recursive: true });
      writeFileSync(join(dir, "pharn", "features", "one", "SPEC.md"), "left behind\n");
      const moved = fingerprint(".", { feature: "two", stage: "entry" });
      assert.notEqual(moved.digest, base.digest, "control: the leftover directory moves the plain entry digest");
      assert.deepEqual(treeExcluding("two", "one"), { algo: base.algo, digest: base.digest });
      assert.deepEqual(treeExcluding("two", "two"), { algo: moved.algo, digest: moved.digest });
      assert.equal(treeExcluding("two", "../x"), null, "a non-slug source is no tree");
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── ★ HOOK — the record and the inputs are out of the WRITE TOOLS' reach; `pharn/.run/` is not — L65 ────────────────────
const PROTECT = join(ROOT, ".claude", "hooks", "protect-trusted-paths.cjs");
const ENFORCE = join(ROOT, ".claude", "hooks", "enforce-writes-scope.cjs");

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

test("★ HOOK — both real write guards deny the record and the inputs in a main checkout and a linked worktree; pharn/.run/pharn-entry/ is writable (AC5)", () => {
  const dir = repo();
  const wt = `${dir}-wt`;
  try {
    installHooks(dir);
    for (const p of [inDir(dir, () => cachePath()), inDir(dir, () => inputsPath())]) {
      assert.equal(realpathSync(dirname(p)), realpathSync(join(dir, ".git")));
      assert.equal(hookExit(PROTECT, dir, p), 2, `protect-trusted-paths denies git metadata: ${p}`);
      assert.equal(hookExit(ENFORCE, dir, p), 2, p);
    }
    const scratch = join(dir, ENTRY_PATHS.result);
    assert.equal(hookExit(PROTECT, dir, scratch), 0, "control");
    assert.equal(hookExit(ENFORCE, dir, scratch), 0, "control: `pharn/.run/**` is writable — why neither file lives there");
    execFileSync("git", ["worktree", "add", "-q", "--detach", wt], { cwd: dir });
    installHooks(wt);
    const wtRecord = inDir(wt, () => cachePath());
    const wtInputs = inDir(wt, () => inputsPath());
    assert.ok(wtInputs.includes(join(".git", "worktrees")), wtInputs);
    for (const p of [wtRecord, wtInputs]) {
      assert.equal(hookExit(ENFORCE, wt, p), 2, `enforce-writes-scope denies a path inside another git tree: ${p}`);
    }
    assert.equal(hookExit(ENFORCE, wt, join(wt, ENTRY_PATHS.result)), 0, "control in the worktree");
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: dir, stdio: "ignore" });
    } catch {
      /* gone */
    }
    rmSync(wt, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── AC2 — a cached result publishes no entry-base offer, so /pharn-regress misses and measures BASE itself ─────────────
// The pinned lines are EXECUTED (L45): the loop's own `--start`, `--wait` and snapshot lines and the regress stage's.
const FEATURE = "demo";
function pinned(commandFile, re) {
  const line = readFileSync(join(ROOT, ".claude", "commands", commandFile), "utf8")
    .split(/\r?\n/)
    .find((l) => re.test(l));
  assert.ok(line, `${commandFile} still pins ${re}`);
  return line
    .trim()
    .replace(/'<name>'|<name>/g, FEATURE)
    .split(/\s+/)
    .slice(1)
    .map((tok, i) => (i === 0 ? join(ROOT, tok) : tok));
}
const START = pinned("pharn-loop.md", /^\s*node pharn\/floor\/entry-gates\.mjs --start --feature /);
const WAIT = pinned("pharn-loop.md", /^\s*node pharn\/floor\/entry-gates\.mjs --wait /);
const SNAPSHOT = pinned("pharn-loop.md", /^\s*node pharn\/floor\/pre-run-snapshot\.mjs --capture /);
const REGRESS = pinned("pharn-regress.md", /^node pharn\/floor\/stage-regress\.mjs --feature <name> --timeout-ms \d+ --budget-ms \d+\s*$/);
const REGRESS_RESUME = pinned("pharn-regress.md", /^\s*node pharn\/floor\/stage-regress\.mjs --resume --budget-ms \d+\s*$/);
const LOOP_RECORD = join(ROOT, ".claude", "hooks", "require-loop-record.cjs");
const COUNT_JS =
  "import { appendFileSync } from 'node:fs';\n" +
  "const side = /[\\\\/]pharn-regress-base-[0-9a-f]{12}-[A-Za-z0-9]{6}([\\\\/]|$)/.test(process.cwd()) ? 'base'\n" +
  "  : /[\\\\/]pharn[\\\\/]\\.run[\\\\/]pharn-entry[\\\\/]/.test(process.env.PHARN_TEST_RESULTS || '') ? 'entry' : 'head';\n" +
  "if (process.env.GEC_COUNTER) appendFileSync(process.env.GEC_COUNTER, `${process.argv[2]} ${side}\\n`);\n";

function deliveryFixture() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "gec-")));
  const counter = `${dir}.counter.log`;
  writeFileSync(counter, "");
  const w = (p, c) => {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), c);
  };
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  w(".gitignore", "pharn/.run/\nnode_modules/\n");
  w("count.mjs", COUNT_JS);
  w(
    "package.json",
    JSON.stringify({
      name: "fx",
      version: "1.0.0",
      scripts: {
        test: "node count.mjs test && node --test",
        typecheck: "node count.mjs typecheck && exit 1", // red on the tree the run starts from: a NON-style red
        build: "node count.mjs build",
      },
    })
  );
  w(
    "package-lock.json",
    JSON.stringify({ name: "fx", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "fx", version: "1.0.0" } } })
  );
  w("src/index.js", "export function add(a, b) { return a + b; }\n");
  w(
    "src/index.test.js",
    "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from './index.js';\ntest('add', () => { assert.equal(add(1, 2), 3); });\n"
  );
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { dir, counter, w };
}

function run(fx, argv) {
  const r = spawnSync(process.execPath, argv, { cwd: fx.dir, encoding: "utf8", env: { ...CLEAN_ENV, GEC_COUNTER: fx.counter } });
  return { code: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function baseCount(fx) {
  return readFileSync(fx.counter, "utf8")
    .split("\n")
    .filter((l) => l.endsWith(" base")).length;
}

test("AC2 — after a cached-red hit no offer exists, and /pharn-regress misses `no-offer` and runs every BASE gate itself", () => {
  const fx = deliveryFixture();
  try {
    assert.equal(run(fx, [LOOP_RECORD, "--open", FEATURE, "--cap", "3"]).code, 0);
    assert.equal(run(fx, SNAPSHOT).code, 0);
    assert.equal(run(fx, START).code, 0);
    let wait;
    for (let i = 0; i < 20; i++) {
      wait = run(fx, WAIT);
      if (wait.code !== 5) break;
    }
    assert.equal(wait.code, 4, wait.stdout + wait.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(fx.dir, ".git", CACHE_BASENAME), "utf8")).red, ["typecheck"], "the red was recorded");
    const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: fx.dir, encoding: "utf8" }).trim();
    const offer = join(gitDir, "pharn-entry-base-offer.json");
    assert.ok(existsSync(offer), "control: a measured red in an open run IS offered to regress");

    // The same tree again: the start stops on the cached red, runs nothing, and the offer is gone.
    const hit = run(fx, START);
    assert.equal(hit.code, 4, hit.stdout + hit.stderr);
    assert.match(
      hit.stdout,
      /red on cached evidence for 'demo' — typecheck red on this tree in run 'demo' \(its gates started \S+Z, < 1 min ago\)/
    );
    assert.ok(!existsSync(offer), "a cached result publishes no entry-base offer");
    assert.ok(!existsSync(join(fx.dir, ENTRY_PATHS.stamp)), "no gate ran: no entry stamp");

    // The front stages' artifacts and a build, then regress: no entry evidence, so the BASE side runs in full.
    const body = "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n";
    const hash = createHash("sha256").update(body).digest("hex");
    fx.w(`pharn/features/${FEATURE}/SPEC.md`, `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`);
    fx.w(
      `pharn/features/${FEATURE}/PLAN.md`,
      `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — x\n`
    );
    fx.w("src/index.js", "export function add(a, b) { return a + b; }\nexport const id = (x) => x;\n");
    const before = baseCount(fx);
    let r = run(fx, REGRESS);
    for (let i = 0; i < 20 && r.code === 5; i++) r = run(fx, REGRESS_RESUME);
    assert.ok(existsSync(join(fx.dir, "pharn", "features", FEATURE, "regression-report.json")), r.stdout + r.stderr);
    const report = JSON.parse(readFileSync(join(fx.dir, "pharn", "features", FEATURE, "regression-report.json"), "utf8"));
    assert.equal(report.base_evidence.source, "fresh", JSON.stringify(report.base_evidence));
    assert.equal(report.base_evidence.entry.miss, "no-offer");
    assert.equal(baseCount(fx) - before, 3, "test, typecheck and build each ran at BASE");
  } finally {
    run(fx, [join(HERE, "entry-gates.mjs"), "--abort", "--feature", FEATURE]);
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(fx.counter, { force: true });
  }
});
