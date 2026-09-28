// pharn/floor/head-reuse-offer.test.mjs — the HEAD offer's storage (verify-head-gate-reuse, 6.34.0; grill B2).
//
// ★ HOOK runs BOTH real write guards on the offer's path — in a main checkout and in a linked worktree — and shows that
// `.pharn/` (where the stamp itself lives) is writable: the reason the binding lives in the git dir (L65).

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
  realpathSync,
  lstatSync,
  chmodSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { offerPath, readOffer, discardOffer, publishOffer, OFFER_BASENAME, validateOffer, acceptReuseSource } from "./head-reuse-offer.mjs";
import { readMarkers, readInProject, HEAD_STAMP } from "./regress-base-reuse.mjs";
import { STAMP_MAX_BYTES } from "./regress-base-reuse-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FEATURE = "demo";
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

function repo() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "hro-")));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  writeFileSync(join(dir, "a.txt"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "init");
  return dir;
}

function openRun(dir, command = "pharn-loop", body = '{"schema":"pharn-loop-active/1"}\n') {
  mkdirSync(join(dir, ".pharn", command, FEATURE), { recursive: true });
  writeFileSync(join(dir, ".pharn", command, FEATURE, "active.json"), body);
}

function writeHeadStamp(dir, text = '{"stage":"regress"}\n') {
  mkdirSync(join(dir, dirname(HEAD_STAMP)), { recursive: true });
  writeFileSync(join(dir, HEAD_STAMP), text);
}

/** Run `fn` with the process cwd inside `dir` — the module reads markers, the stamp and git from its cwd, as the stage
 *  scripts do. Tests in this file run sequentially. */
function inRepo(fn) {
  const dir = repo();
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return fn(dir);
  } finally {
    process.chdir(prev);
    rmSync(dir, { recursive: true, force: true });
  }
}

test("offerPath: the offer lives in the git dir, under its own basename (not the BASE record's)", () => {
  inRepo((dir) => {
    assert.equal(realpathSync(dirname(offerPath())), realpathSync(join(dir, ".git")));
    assert.equal(offerPath().split("/").pop(), OFFER_BASENAME);
    assert.notEqual(OFFER_BASENAME, "pharn-regress-base-reuse.json");
  });
});

test("publishOffer: with no open delivery run nothing is published (a standalone regress offers nothing)", () => {
  inRepo(() => {
    writeHeadStamp(process.cwd());
    assert.deepEqual(publishOffer(FEATURE), { published: false, why: "no-delivery-run" });
    assert.deepEqual(readOffer(), { state: "absent" });
  });
});

test("publishOffer: under one open run, the offer binds the stamp's exact bytes and the marker's digest", () => {
  inRepo((dir) => {
    openRun(dir);
    writeHeadStamp(dir, '{"x":1}\n');
    assert.deepEqual(publishOffer(FEATURE), { published: true });
    const o = JSON.parse(readFileSync(offerPath(), "utf8"));
    assert.equal(validateOffer(o), true);
    assert.equal(o.feature, FEATURE);
    assert.deepEqual(o.run, {
      command: "pharn-loop",
      marker_sha256: sha256(readFileSync(join(dir, ".pharn/pharn-loop", FEATURE, "active.json"))),
    });
    assert.equal(o.stamp_sha256, sha256(Buffer.from('{"x":1}\n')));
    // The pure rule accepts it — and refuses the moment the stamp's bytes move (a write-tool edit after publication).
    const accept = () =>
      acceptReuseSource({
        feature: FEATURE,
        markers: readMarkers(FEATURE),
        now: Date.now(),
        offer: readOffer(),
        stamp: readInProject(HEAD_STAMP, STAMP_MAX_BYTES),
      });
    assert.equal(accept().ok, true);
    writeHeadStamp(dir, '{"x":2}\n');
    assert.deepEqual(accept(), { ok: false, miss: "source-unbound" });
    // A NEW run (its marker rewritten) does not inherit the old run's offer.
    writeHeadStamp(dir, '{"x":1}\n');
    openRun(dir, "pharn-loop", '{"schema":"pharn-loop-active/1","n":2}\n');
    assert.deepEqual(accept(), { ok: false, miss: "other-run" });
  });
});

test("publishOffer: no head stamp, or a linked one, publishes nothing", () => {
  inRepo((dir) => {
    openRun(dir);
    assert.deepEqual(publishOffer(FEATURE), { published: false, why: "source-unusable" });
    writeFileSync(join(dir, ".pharn/real.json"), "{}\n");
    mkdirSync(join(dir, dirname(HEAD_STAMP)), { recursive: true });
    symlinkSync(join(dir, ".pharn/real.json"), join(dir, HEAD_STAMP));
    assert.deepEqual(publishOffer(FEATURE), { published: false, why: "source-unusable" });
    assert.equal(existsSync(offerPath()), false);
  });
});

test("discardOffer: idempotent; a planted directory is removed; a planted link is removed, never followed", () => {
  inRepo((dir) => {
    openRun(dir);
    writeHeadStamp(dir);
    assert.equal(publishOffer(FEATURE).published, true);
    discardOffer();
    assert.equal(existsSync(offerPath()), false);
    discardOffer(); // idempotent
    mkdirSync(join(offerPath(), "sub"), { recursive: true });
    assert.equal(readOffer().state, "unusable", "a directory at the name is unusable, never read");
    discardOffer();
    assert.equal(existsSync(offerPath()), false);
    const target = join(dir, "a.txt");
    symlinkSync(target, offerPath());
    assert.equal(readOffer().state, "unusable", "a link at the name is never followed");
    discardOffer();
    assert.throws(() => lstatSync(offerPath()), /ENOENT/);
    assert.equal(readFileSync(target, "utf8"), "a\n", "the link's target is untouched");
  });
});

test("discardOffer NEVER throws — a removal the filesystem refuses is returned (reuse is never a new failure mode)", () => {
  inRepo((dir) => {
    openRun(dir);
    writeHeadStamp(dir);
    assert.equal(publishOffer(FEATURE).published, true);
    const gitDir = dirname(offerPath());
    chmodSync(gitDir, 0o555);
    try {
      let r;
      assert.doesNotThrow(() => {
        r = discardOffer();
      });
      assert.deepEqual(r, { ok: false, why: "remove-failed" });
      assert.equal(existsSync(offerPath()), true, "the offer is still there — and the result says so");
    } finally {
      chmodSync(gitDir, 0o755);
    }
    assert.deepEqual(discardOffer(), { ok: true }, "control: with the directory writable again the removal succeeds");
    assert.equal(existsSync(offerPath()), false);
  });
});

// ── ★ HOOK — the offer is out of the WRITE TOOLS' reach; `.pharn/` (the stamp) is not ─────────────────
const PROTECT = join(HERE, "..", "..", ".claude", "hooks", "protect-trusted-paths.cjs");
const ENFORCE = join(HERE, "..", "..", ".claude", "hooks", "enforce-writes-scope.cjs");

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

function offerFile(projectDir) {
  const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: projectDir, encoding: "utf8" }).trim();
  return join(gitDir, OFFER_BASENAME);
}

test("★ HOOK — both real write guards deny the offer path (main checkout, linked worktree, installed posture); the head stamp is writable", () => {
  const dir = repo();
  const wt = `${dir}-wt`;
  try {
    installHooks(dir);
    const mainOffer = offerFile(dir);
    assert.equal(hookExit(PROTECT, dir, mainOffer), 2, "protect-trusted-paths denies git metadata");
    assert.equal(hookExit(ENFORCE, dir, mainOffer), 2, "enforce-writes-scope's default denies it too");
    const stamp = join(dir, HEAD_STAMP);
    assert.equal(hookExit(PROTECT, dir, stamp), 0);
    assert.equal(hookExit(ENFORCE, dir, stamp), 0, "`.pharn/**` is always writable — the reason the stamp alone is never offered");

    execFileSync("git", ["worktree", "add", "-q", "--detach", wt], { cwd: dir });
    installHooks(wt);
    const wtOffer = offerFile(wt);
    assert.ok(wtOffer.includes(join(".git", "worktrees")), wtOffer);
    assert.equal(hookExit(ENFORCE, wt, wtOffer), 2, "a path inside another git tree is denied");
    writeFileSync(join(wt, "pharn.config.json"), JSON.stringify({ skillsVersion: "6.34.0" }) + "\n");
    assert.equal(hookExit(ENFORCE, wt, wtOffer), 2, "installed, no run open: still denied");
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
