// pharn/floor/install-drift.test.mjs — the HEAD install check's disk half over REAL throwaway trees (mkdtempSync): the
// path kinds every read meets (L59: a regular file, a link to a file, a link to a directory, a dangling link, a FIFO, a
// directory), npm's shrinkwrap-over-lock precedence, family presence by lstat, no default root (L41), and the stored
// report block's round trip. The FIFO cases run the reader in a CHILD with a timeout, so a read that blocked would fail
// the test instead of hanging the suite.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readInstallCheck, recordInstallCheck, readRecordedInstallCheck, refuses } from "./install-drift.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const lock = (packages) =>
  JSON.stringify({ name: "fx", lockfileVersion: 3, requires: true, packages: { "": { name: "fx" }, ...packages } });
const hidden = (packages) => JSON.stringify({ name: "fx", lockfileVersion: 3, requires: true, packages });
const A1 = { "node_modules/a": { version: "1.0.0", resolved: "file:a-1.0.0.tgz", integrity: "sha512-one" } };
const A2 = { "node_modules/a": { version: "2.0.0", resolved: "file:a-2.0.0.tgz", integrity: "sha512-two" } };

/** A project root: package.json, a lockfile holding `lockPkgs`, and (unless `installed` is null) a node_modules whose
 *  hidden lockfile holds `installed`. */
function tree({ lockPkgs = A1, installed = A1, lockName = "package-lock.json" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "idrift-"));
  writeFileSync(join(dir, "package.json"), '{"name":"fx","version":"1.0.0"}\n');
  writeFileSync(join(dir, lockName), lock(lockPkgs));
  if (installed !== null) {
    mkdirSync(join(dir, "node_modules"));
    writeFileSync(join(dir, "node_modules", ".package-lock.json"), hidden(installed));
  }
  return dir;
}

function within(dir, fn) {
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Run readInstallCheck(dir) in a child with a timeout — a blocked read becomes a failed assertion, never a hang. */
function checkInChild(dir) {
  const code = `import { readInstallCheck } from ${JSON.stringify(join(HERE, "install-drift.mjs"))}; const r = readInstallCheck(${JSON.stringify(dir)}); console.log(JSON.stringify({ state: r.state, why: r.why }));`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8", timeout: 10000 });
  assert.equal(r.signal, null, "the reader must not block");
  return JSON.parse(r.stdout);
}

test("no default root (L41): readInstallCheck throws without one", () => {
  assert.throws(() => readInstallCheck(), /requires a root directory/);
  assert.throws(() => readInstallCheck(""), /requires a root directory/);
});

test("a real tree: matching → clean; a bumped lockfile over an old install → drifted; no node_modules → not-installed", () => {
  within(tree(), (dir) => assert.equal(readInstallCheck(dir).state, "clean"));
  within(tree({ lockPkgs: A2, installed: A1 }), (dir) => {
    const r = readInstallCheck(dir);
    assert.equal(r.state, "drifted");
    assert.equal(refuses(r), true);
    assert.equal(r.remedy, "npm ci");
  });
  within(tree({ installed: null }), (dir) => assert.equal(readInstallCheck(dir).state, "not-installed"));
});

test("npm's precedence: npm-shrinkwrap.json is the lockfile when both exist", () => {
  within(tree({ lockPkgs: A1, installed: A1 }), (dir) => {
    writeFileSync(join(dir, "npm-shrinkwrap.json"), lock(A2));
    const r = readInstallCheck(dir);
    assert.equal(r.lockfile, "npm-shrinkwrap.json");
    assert.equal(r.state, "drifted", "the shrinkwrap (2.0.0) is compared, not package-lock.json (1.0.0)");
  });
});

test("family presence is by lstat: another family's lockfile — even a dangling link — makes it not-checked", () => {
  within(tree(), (dir) => {
    writeFileSync(join(dir, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
    assert.equal(readInstallCheck(dir).why, "several-lockfile-families");
  });
  within(tree(), (dir) => {
    symlinkSync(join(dir, "nowhere"), join(dir, "yarn.lock"));
    assert.equal(readInstallCheck(dir).why, "several-lockfile-families");
  });
  within(mkdtempSync(join(tmpdir(), "idrift-")), (dir) => {
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "bun.lock"), "{}");
    assert.deepEqual([readInstallCheck(dir).why, readInstallCheck(dir).family], ["unmeasured-family", "bun"]);
  });
  within(mkdtempSync(join(tmpdir(), "idrift-")), (dir) => assert.equal(readInstallCheck(dir).why, "no-manifest"));
});

// ── L59: the path kinds, at each of the three reads ───────────────────────────────────────────────────
test("L59 — the npm lockfile: a link to a file is read; a link to a dir, a dangling link, a directory and a FIFO are unreadable", () => {
  within(tree(), (dir) => {
    writeFileSync(join(dir, "real-lock.json"), lock(A1));
    rmSync(join(dir, "package-lock.json"));
    symlinkSync(join(dir, "real-lock.json"), join(dir, "package-lock.json"));
    assert.equal(readInstallCheck(dir).state, "clean", "a link to a regular file is followed and read");
  });
  for (const make of [
    (dir, p) => symlinkSync(join(dir, "node_modules"), p), // link to a directory
    (dir, p) => symlinkSync(join(dir, "nowhere"), p), // dangling
    (dir, p) => mkdirSync(p), // a directory
    (dir, p) => execFileSync("mkfifo", [p]), // a FIFO — must never be opened
  ]) {
    within(tree(), (dir) => {
      const p = join(dir, "package-lock.json");
      rmSync(p);
      make(dir, p);
      assert.deepEqual(checkInChild(dir), { state: "not-checked", why: "lockfile-unreadable" });
    });
  }
  within(tree(), (dir) => {
    writeFileSync(join(dir, "package-lock.json"), "{ not json");
    assert.equal(readInstallCheck(dir).why, "lockfile-unreadable");
  });
  within(tree(), (dir) => {
    writeFileSync(join(dir, "package-lock.json"), JSON.stringify({ lockfileVersion: 1, dependencies: {} }));
    assert.equal(readInstallCheck(dir).why, "lockfile-unsupported");
  });
});

test("L59 — node_modules: a link to a directory is a real layout; a dangling link is absent; a file is unreadable", () => {
  within(tree(), (dir) => {
    const elsewhere = mkdtempSync(join(tmpdir(), "idrift-nm-"));
    try {
      writeFileSync(join(elsewhere, ".package-lock.json"), hidden(A1));
      rmSync(join(dir, "node_modules"), { recursive: true });
      symlinkSync(elsewhere, join(dir, "node_modules"));
      assert.equal(readInstallCheck(dir).state, "clean");
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });
  within(tree(), (dir) => {
    rmSync(join(dir, "node_modules"), { recursive: true });
    symlinkSync(join(dir, "nowhere"), join(dir, "node_modules"));
    assert.equal(readInstallCheck(dir).state, "not-installed", "a dangling node_modules link installs nothing");
  });
  within(tree(), (dir) => {
    rmSync(join(dir, "node_modules"), { recursive: true });
    writeFileSync(join(dir, "node_modules"), "");
    assert.equal(readInstallCheck(dir).why, "node-modules-unreadable");
  });
});

test("L59 — npm's record: absent → no-hidden-lockfile; a directory, a FIFO or bad JSON → hidden-lockfile-unreadable", () => {
  within(tree(), (dir) => {
    rmSync(join(dir, "node_modules", ".package-lock.json"));
    assert.equal(readInstallCheck(dir).why, "no-hidden-lockfile");
  });
  within(tree(), (dir) => {
    const p = join(dir, "node_modules", ".package-lock.json");
    rmSync(p);
    symlinkSync(join(dir, "nowhere"), p);
    assert.equal(readInstallCheck(dir).why, "no-hidden-lockfile", "a dangling link is absent");
  });
  for (const make of [(p) => mkdirSync(p), (p) => execFileSync("mkfifo", [p]), (p) => writeFileSync(p, "nope")]) {
    within(tree(), (dir) => {
      const p = join(dir, "node_modules", ".package-lock.json");
      rmSync(p);
      make(p);
      assert.deepEqual(checkInChild(dir), { state: "not-checked", why: "hidden-lockfile-unreadable" });
    });
  }
});

// ── the stored block ──────────────────────────────────────────────────────────────────────────────────
test("the stored block round-trips; absent, malformed, a FIFO or a directory read back as null (G2)", () => {
  within(tree({ lockPkgs: A2, installed: A1 }), (dir) => {
    const p = join(dir, "head-install.json");
    const r = readInstallCheck(dir);
    recordInstallCheck(p, r);
    const stored = JSON.parse(readFileSync(p, "utf8"));
    assert.deepEqual(
      Object.keys(stored),
      ["state", "why", "family", "lockfile", "counts"],
      "enums and integers only — no path, no version"
    );
    assert.deepEqual(readRecordedInstallCheck(p), stored);
    writeFileSync(p, JSON.stringify({ ...stored, state: "fine" }));
    assert.equal(readRecordedInstallCheck(p), null);
    writeFileSync(p, "{");
    assert.equal(readRecordedInstallCheck(p), null);
    rmSync(p);
    assert.equal(readRecordedInstallCheck(p), null);
    mkdirSync(p);
    assert.equal(readRecordedInstallCheck(p), null);
  });
});
