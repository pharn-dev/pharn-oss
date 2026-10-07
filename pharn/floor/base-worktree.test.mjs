// pharn/floor/base-worktree.test.mjs — the BASE checkout's placement, naming, clear and resume validation
// (regress-base-integrity). The clear runs in a child process whose cwd is a throwaway repository, so its git calls
// (`worktree list/remove/prune`) never touch this checkout's own registrations. Every rule has a control (L34).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, realpathSync, lstatSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { NAME_STEM, REDACTED, namePrefix, placementError, createBaseDir, isOurBaseDir, redact, tempRoot } from "./base-worktree.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, "base-worktree.mjs");
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

function scratch(prefix) {
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}

test("namePrefix: stable for one project path, distinct across projects, and shaped stem + 12 hex + '-'", () => {
  const a = namePrefix("/work/a");
  assert.equal(a, namePrefix("/work/a"));
  assert.notEqual(a, namePrefix("/work/b"), "two checkouts of one repository get different names");
  assert.match(a, new RegExp(`^${NAME_STEM}[0-9a-f]{12}-$`));
});

test("placementError: a temp root inside (or equal to) the project is refused; a sibling or unrelated root is not", () => {
  assert.match(placementError("/work/p", "/work/p"), /inside the project/);
  assert.match(placementError("/work/p", "/work/p/tmp"), /inside the project/);
  assert.match(placementError("/work/p", null), /could not be resolved/);
  assert.equal(placementError("/work/p", "/var/tmp"), null, "CONTROL: outside");
  assert.equal(placementError("/work/p", "/work/p2"), null, "CONTROL: a sibling whose name only starts the same");
  assert.match(placementError("/work/p", "/work/p/..foo"), /inside the project/, "a directory named `..foo` inside it is inside");
  assert.equal(placementError("/work/p", "/work"), null, "CONTROL: the parent itself is outside");
});

test("createBaseDir: a fresh empty directory in the root, named for the project; refused when the root is inside it", () => {
  const root = scratch("bw-root-");
  try {
    const made = createBaseDir("/work/p", root);
    assert.equal(made.ok, true, made.reason);
    assert.equal(dirname(made.path), root);
    assert.ok(basename(made.path).startsWith(namePrefix("/work/p")));
    assert.ok(lstatSync(made.path).isDirectory());
    assert.ok(isOurBaseDir(made.path, "/work/p", root), "what createBaseDir makes, isOurBaseDir accepts");
    const nested = createBaseDir(root, join(root, "inner"));
    assert.equal(nested.ok, false);
    assert.match(nested.reason, /inside the project/);
    const missing = createBaseDir("/work/p", join(root, "absent", "deeper"));
    assert.equal(missing.ok, false, "an mkdtemp failure is a result, never a throw");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("isOurBaseDir: only <root>/<this project's prefix><6 chars> — every near miss is refused", () => {
  const root = "/tmp/root";
  const ok = `${root}/${namePrefix("/work/p")}AbC123`;
  assert.equal(isOurBaseDir(ok, "/work/p", root), true, "CONTROL");
  for (const bad of [
    `${root}/${namePrefix("/work/other")}AbC123`, // another project's checkout
    `${root}/${namePrefix("/work/p")}AbC12`, // short suffix
    `${root}/${namePrefix("/work/p")}AbC1234`, // long suffix
    `${root}/${namePrefix("/work/p")}AbC12!`, // bad character
    `${root}/sub/${namePrefix("/work/p")}AbC123`, // not directly in the root
    `/elsewhere/${namePrefix("/work/p")}AbC123`, // another root
    "relative/path",
    "/",
    null,
    42,
  ]) {
    assert.equal(isOurBaseDir(bad, "/work/p", root), false, String(bad));
  }
  assert.equal(isOurBaseDir(ok, "/work/p", null), false, "no root resolvable → nothing is ours");
});

test("redact: every occurrence of the checkout path becomes the placeholder; other text is untouched", () => {
  const p = join(tempRoot(), `${namePrefix("/work/p")}AbC123`);
  assert.equal(redact(`fatal: '${p}' is locked; see ${p}/x`, p), `fatal: '${REDACTED}' is locked; see ${REDACTED}/x`);
  assert.equal(redact("no path here", p), "no path here", "CONTROL");
  assert.equal(redact(undefined, p), undefined);
});

test("clearBaseWorktrees: removes this project's registered and stray checkouts and the legacy path; unlinks a planted link without following it; leaves other projects' entries", () => {
  const repo = scratch("bw-repo-");
  const root = scratch("bw-tmp-");
  const victim = scratch("bw-victim-");
  try {
    const git = (...a) => execFileSync("git", a, { cwd: repo, encoding: "utf8", stdio: "pipe" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(repo, "f.txt"), "x\n");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const prefix = namePrefix(repo);
    const registered = join(root, `${prefix}Reg001`);
    git("worktree", "add", "--detach", registered, "HEAD");
    git("worktree", "lock", registered); // a kill mid-add leaves it locked: needs the double force
    const stray = join(root, `${prefix}Str001`);
    mkdirSync(stray);
    writeFileSync(join(stray, "junk"), "x");
    writeFileSync(join(victim, "keep.txt"), "must survive\n");
    const link = join(root, `${prefix}Lnk001`);
    symlinkSync(victim, link, "dir");
    const foreign = join(root, `${namePrefix("/some/other/project")}For001`);
    mkdirSync(foreign);
    const legacy = join(repo, ".pharn", "pharn-regress", "base");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, "old"), "x");

    const r = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { clearBaseWorktrees } from ${JSON.stringify(MODULE)}; clearBaseWorktrees(process.argv[1], ".pharn/pharn-regress/base", process.argv[2]);`,
        repo,
        root,
      ],
      { cwd: repo, encoding: "utf8", env: CLEAN_ENV }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!existsSync(registered), "the locked registered checkout is removed");
    assert.doesNotMatch(git("worktree", "list", "--porcelain"), new RegExp(prefix), "and its registration is gone");
    assert.ok(!existsSync(stray), "an unregistered leftover is removed");
    assert.throws(() => lstatSync(link), /ENOENT/, "the planted link is unlinked");
    assert.equal(readFileSync(join(victim, "keep.txt"), "utf8"), "must survive\n", "…and never followed");
    assert.ok(existsSync(foreign), "another project's entry is left alone");
    assert.ok(!existsSync(legacy), "the legacy nested checkout is cleared");
  } finally {
    for (const d of [repo, root, victim]) rmSync(d, { recursive: true, force: true });
  }
});

test("clearBaseWorktrees never throws: no git repository, an absent root", () => {
  const notRepo = scratch("bw-norepo-");
  try {
    const r = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { clearBaseWorktrees } from ${JSON.stringify(MODULE)}; clearBaseWorktrees(process.argv[1], ".pharn/pharn-regress/base", process.argv[1] + "/absent");`,
        notRepo,
      ],
      { cwd: notRepo, encoding: "utf8", env: CLEAN_ENV }
    );
    assert.equal(r.status, 0, r.stderr);
  } finally {
    rmSync(notRepo, { recursive: true, force: true });
  }
});
