// pharn/floor/check-test-stage.test.mjs — the test-stage gate's suite. Every world is REAL: the shipped SPEC template
// filled and pinned by `check-spec.mjs --hash`, a mapping `check-ac-tests.mjs` accepts, and a lock written by
// `ac-tests-lock.mjs --write` / `--write-bootstrap`. Each RED reason is one mutation of a READY world (L34/L52); the
// last tests close TEST_STAGE_REASONS both ways (L36).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { READY_TOKENS, TEST_STAGE_REASONS, evaluateTestStage } from "./check-test-stage.mjs";
import { filesDigest } from "./ac-tests-lock.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "check-test-stage.mjs");
const CHECK_SPEC = join(HERE, "check-spec.mjs");
const LOCK = join(HERE, "ac-tests-lock.mjs");
const TEMPLATE = readFileSync(join(HERE, "..", "pharn-contracts", "templates", "spec-template.md"), "utf8");
const REF = spawnSync(process.execPath, [CHECK_SPEC, "--template-ref", "pharn-default"], { encoding: "utf8" }).stdout.trim();
const NAME = "demo";
const UNIT = "tests/ac/demo.unit.test.js";
const REACHED = new Set();

/** A templated (or legacy) SPEC from the shipped template, Approved and pinned by check-spec --hash. */
function specText({ kind = null, legacy = false } = {}) {
  let t = TEMPLATE.replace(/<!--\s*pharn:guidance[\s\S]*?-->\n?/g, "")
    .replace("spec_id: <name>", `spec_id: ${NAME}`)
    .replace("<the line check-spec.mjs --resolve-template-ref prints>", REF)
    .replace("<unit | integration | e2e>", "unit")
    .replace(/<[^>\n]+>/g, "filled");
  if (legacy) t = t.replace(/^spec_template:.*\n/m, "");
  if (kind !== null) t = t.replace(/^(spec_id: .*\n)/m, `$1spec_kind: ${kind}\n`);
  const tmp = mkdtempSync(join(tmpdir(), "cts-spec-"));
  try {
    writeFileSync(join(tmp, "SPEC.md"), t);
    const hash = spawnSync(process.execPath, [CHECK_SPEC, "--hash", join(tmp, "SPEC.md")], { encoding: "utf8" }).stdout.trim();
    return t.replace("state: Draft", "state: Approved").replace('spec_content_hash: ""', `spec_content_hash: ${hash}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
const pinOf = (spec) => spec.match(/^spec_content_hash: ([0-9a-f]{64})$/m)[1];

const acTests = (hash) =>
  [
    "---",
    `spec_id: ${NAME}`,
    `spec_content_hash: ${hash}`,
    "---",
    "",
    "## Files",
    "",
    `- \`${UNIT}\` — the test for AC-1`,
    "",
    "## Mapping",
    "",
    `- AC-1 | unit | \`${UNIT}\` | src/demo.js#reset(): void`,
    "",
  ].join("\n");
const planText = (hash, files = ["src/demo.js"]) =>
  [
    "---",
    `spec_id: ${NAME}`,
    `spec_content_hash: ${hash}`,
    "applied_lessons: none",
    "---",
    "",
    "## Files",
    "",
    ...files.map((f) => `- \`${f}\` — x`),
    "",
  ].join("\n");

const fd = (root) => join(root, "pharn", "features", NAME);
const lockPath = (root) => join(fd(root), "AC-TESTS.lock.json");
const lockCli = (root, args) => spawnSync(process.execPath, [LOCK, ...args], { cwd: root, encoding: "utf8" });

/** A READY test-first world: SPEC, PLAN, mapping, the test file, and a lock carrying a red_run bound to its files. */
function testFirst() {
  const root = mkdtempSync(join(tmpdir(), "cts-"));
  mkdirSync(fd(root), { recursive: true });
  const spec = specText();
  writeFileSync(join(fd(root), "SPEC.md"), spec);
  writeFileSync(join(fd(root), "PLAN.md"), planText(pinOf(spec)));
  writeFileSync(join(fd(root), "AC-TESTS.md"), acTests(pinOf(spec)));
  mkdirSync(join(root, "tests", "ac"), { recursive: true });
  writeFileSync(join(root, UNIT), 'test("AC-1: resets", async () => { await import("../../src/demo.js"); });\n');
  assert.equal(lockCli(root, ["--write", NAME]).status, 0, "fixture: --write");
  const lock = JSON.parse(readFileSync(lockPath(root), "utf8"));
  lock.red_run = {
    stamp_sha256: "a".repeat(64),
    files_sha256: filesDigest(lock.files),
    gates: [{ gate: "test", results_sha256: "b".repeat(64) }],
    acs: [{ id: "AC-1", tests: [`${UNIT}::AC-1: resets`] }],
  };
  writeFileSync(lockPath(root), JSON.stringify(lock, null, 2));
  return root;
}
function withWorld(make, fn) {
  const root = make();
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const gate = (root, base) => evaluateTestStage({ name: NAME, cwd: root, ...(base ? { base } : {}) });
function expectRed(r, reason) {
  assert.equal(r.code, 1, JSON.stringify(r));
  assert.equal(r.reason, reason, JSON.stringify(r));
  assert.equal(r.token, `RED ${reason}`);
  REACHED.add(reason);
}

// ── test-first ───────────────────────────────────────────────────────────────────────────────────────────

test("READY test-first — the mapping holds against the current SPEC and PLAN, and the lock records a red run", () => {
  withWorld(testFirst, (root) => {
    const r = gate(root);
    assert.equal(r.code, 0, JSON.stringify(r));
    assert.equal(r.token, "READY test-first");
  });
});

test("mapping-red — a PLAN edited after /pharn-test that scopes the build to the test file (item 03's bound, closed)", () => {
  withWorld(testFirst, (root) => {
    const spec = readFileSync(join(fd(root), "SPEC.md"), "utf8");
    writeFileSync(join(fd(root), "PLAN.md"), planText(pinOf(spec), ["src/demo.js", UNIT]));
    const r = gate(root);
    expectRed(r, "mapping-red");
    assert.ok(
      r.child.some((l) => /in-plan-files/.test(l)),
      "the child's own RED line is carried as diagnosis"
    );
  });
});

test("mapping-red — the SPEC re-approved over other intent (the mapping's pin is stale)", () => {
  withWorld(testFirst, (root) => {
    const spec = readFileSync(join(fd(root), "SPEC.md"), "utf8").replace("## Intent\n", "## Intent\n\nChanged after mapping.\n");
    writeFileSync(join(fd(root), "SPEC.md"), spec);
    expectRed(gate(root), "mapping-red");
  });
});

test("no-mapping — a templated SPEC with no AC-TESTS.md (never read as 'nothing to test' — L34)", () => {
  withWorld(testFirst, (root) => {
    rmSync(join(fd(root), "AC-TESTS.md"));
    expectRed(gate(root), "no-mapping");
  });
});

test("no-lock — /pharn-test did not run", () => {
  withWorld(testFirst, (root) => {
    rmSync(lockPath(root));
    expectRed(gate(root), "no-lock");
  });
});

test("lock-red — a lock with no red run, and a test edited after the lock (L58: the part that may not change)", () => {
  withWorld(testFirst, (root) => {
    assert.equal(lockCli(root, ["--write", NAME]).status, 0);
    const r = gate(root);
    expectRed(r, "lock-red");
    assert.ok(
      r.child.some((l) => /no red_run is recorded/.test(l)),
      JSON.stringify(r.child)
    );
  });
  withWorld(testFirst, (root) => {
    writeFileSync(join(root, UNIT), 'test("AC-1: resets", () => {}); // weakened after the red run\n');
    expectRed(gate(root), "lock-red");
  });
});

test("lock-red is NOT tripped by the build's own writes: implementation files outside the lock change freely", () => {
  withWorld(testFirst, (root) => {
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "demo.js"), "export function reset() {}\n");
    assert.equal(gate(root).token, "READY test-first", "a later loop iteration's rebuild must still pass the gate");
  });
});

test("lock-unusable — a lock that is not JSON, or not the closed shape", () => {
  withWorld(testFirst, (root) => {
    writeFileSync(lockPath(root), "{not json");
    expectRed(gate(root), "lock-unusable");
  });
});

// ── bootstrap ────────────────────────────────────────────────────────────────────────────────────────────

function bootstrap() {
  const root = mkdtempSync(join(tmpdir(), "cts-b-"));
  mkdirSync(fd(root), { recursive: true });
  writeFileSync(join(fd(root), "SPEC.md"), specText({ kind: "test-infra" }));
  assert.equal(lockCli(root, ["--write-bootstrap", NAME]).status, 0, "fixture: --write-bootstrap");
  return root;
}

test("READY bootstrap — a test-infra SPEC with a bootstrap lock (accepted here, and labelled weaker)", () => {
  withWorld(bootstrap, (root) => {
    const r = gate(root);
    assert.equal(r.code, 0, JSON.stringify(r));
    assert.equal(r.token, "READY bootstrap");
    assert.match(r.detail, /weaker/);
  });
});

test("bootstrap: no-lock, and lock-red when a mapping appeared", () => {
  withWorld(bootstrap, (root) => {
    rmSync(lockPath(root));
    expectRed(gate(root), "no-lock");
  });
  withWorld(bootstrap, (root) => {
    writeFileSync(join(fd(root), "AC-TESTS.md"), acTests("a".repeat(64)));
    expectRed(gate(root), "lock-red");
  });
});

test("lock-mode-mismatch (grill G1) — a test-infra SPEC beside an old test-first lock, and a feature SPEC with a bootstrap lock", () => {
  withWorld(testFirst, (root) => {
    // re-specified as test-infra and re-approved; the old test-first lock (and its red run) is still there
    const spec = specText({ kind: "test-infra" });
    writeFileSync(join(fd(root), "SPEC.md"), spec);
    const r = gate(root);
    expectRed(r, "lock-mode-mismatch");
    assert.match(r.detail, /test-first lock/);
  });
  withWorld(bootstrap, (root) => {
    const spec = specText();
    writeFileSync(join(fd(root), "SPEC.md"), spec);
    writeFileSync(join(fd(root), "PLAN.md"), planText(pinOf(spec)));
    writeFileSync(join(fd(root), "AC-TESTS.md"), acTests(pinOf(spec)));
    mkdirSync(join(root, "tests", "ac"), { recursive: true });
    writeFileSync(join(root, UNIT), "x\n");
    expectRed(gate(root), "lock-mode-mismatch");
  });
});

test("a 6.17.0 (ac-tests-lock/1) lock counts as test-first, and fails the red-run requirement (lock-red)", () => {
  withWorld(testFirst, (root) => {
    const { mode, bootstrap: b, red_run, ...rest } = JSON.parse(readFileSync(lockPath(root), "utf8"));
    assert.equal(mode, "test-first");
    assert.equal(b, null);
    assert.ok(red_run);
    writeFileSync(lockPath(root), JSON.stringify({ ...rest, schema: "ac-tests-lock/1", red_run: null }));
    const r = gate(root);
    expectRed(r, "lock-red");
    assert.ok(
      r.child.some((l) => /ac-tests-lock\/1, which has no red run/.test(l)),
      JSON.stringify(r.child)
    );
  });
});

// ── legacy, and an unusable SPEC ─────────────────────────────────────────────────────────────────────────

function legacy() {
  const root = mkdtempSync(join(tmpdir(), "cts-l-"));
  mkdirSync(fd(root), { recursive: true });
  writeFileSync(join(fd(root), "SPEC.md"), specText({ legacy: true }));
  return root;
}

test("NOT-APPLICABLE legacy-spec — no spec_template, no AC ids, nothing to test first", () => {
  withWorld(legacy, (root) => {
    const r = gate(root);
    assert.equal(r.code, 0, JSON.stringify(r));
    assert.equal(r.token, "NOT-APPLICABLE legacy-spec");
  });
});

test("legacy-with-mapping — a legacy SPEC beside an AC-TESTS.md or a lock (the key was removed after mapping)", () => {
  for (const file of ["AC-TESTS.md", "AC-TESTS.lock.json"]) {
    withWorld(legacy, (root) => {
      writeFileSync(join(fd(root), file), "x");
      const r = gate(root);
      expectRed(r, "legacy-with-mapping");
      assert.match(r.detail, new RegExp(file.replaceAll(".", "\\.")));
    });
  }
});

test("spec-unusable — no SPEC.md, or an invalid spec_kind", () => {
  withWorld(testFirst, (root) => {
    rmSync(join(fd(root), "SPEC.md"));
    expectRed(gate(root), "spec-unusable");
  });
  withWorld(testFirst, (root) => {
    const spec = readFileSync(join(fd(root), "SPEC.md"), "utf8").replace(/^(spec_id: .*\n)/m, "$1spec_kind: library\n");
    writeFileSync(join(fd(root), "SPEC.md"), spec);
    expectRed(gate(root), "spec-unusable");
  });
});

// ── --require-test-first (the loop's policy, REVIEW finding 2) and an absolute --base (finding 1) ─────────────

test("--require-test-first: READY test-first still passes; READY bootstrap and NOT-APPLICABLE become RED mode-not-allowed", () => {
  withWorld(testFirst, (root) => {
    assert.equal(evaluateTestStage({ name: NAME, cwd: root, requireTestFirst: true }).token, "READY test-first");
  });
  for (const make of [bootstrap, legacy]) {
    withWorld(make, (root) => {
      assert.equal(evaluateTestStage({ name: NAME, cwd: root }).code, 0, "control: a pass without the flag");
      const r = evaluateTestStage({ name: NAME, cwd: root, requireTestFirst: true });
      expectRed(r, "mode-not-allowed");
      assert.match(r.detail, /the gate read (READY bootstrap|NOT-APPLICABLE legacy-spec)/);
    });
  }
  withWorld(legacy, (root) => {
    const cli = spawnSync(process.execPath, [CLI, NAME, "--require-test-first"], { cwd: root, encoding: "utf8" });
    assert.equal(cli.status, 1, cli.stdout);
    assert.match(cli.stdout, /^RED mode-not-allowed — /);
  });
});

test("an ABSOLUTE --base resolves as itself, never re-rooted under cwd (a stray lock beside a legacy SPEC is still RED)", () => {
  withWorld(legacy, (root) => {
    writeFileSync(lockPath(root), "x");
    const abs = join(root, "pharn", "features");
    expectRed(evaluateTestStage({ name: NAME, base: abs, cwd: root }), "legacy-with-mapping");
    const cli = spawnSync(process.execPath, [CLI, NAME, "--base", abs], { cwd: root, encoding: "utf8" });
    assert.equal(cli.status, 1, cli.stdout);
  });
});

// ── the CLI, --base, cwd ─────────────────────────────────────────────────────────────────────────────────

test("CLI: the first line is the closed token, the child's lines follow indented; exit codes 0 / 1 / 2", () => {
  withWorld(testFirst, (root) => {
    const ok = spawnSync(process.execPath, [CLI, NAME], { cwd: root, encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stdout);
    assert.match(ok.stdout.split("\n")[0], /^READY test-first — /);
    rmSync(lockPath(root));
    const red = spawnSync(process.execPath, [CLI, NAME], { cwd: root, encoding: "utf8" });
    assert.equal(red.status, 1);
    assert.match(red.stdout.split("\n")[0], /^RED no-lock — /);
    for (const args of [
      [],
      ["Bad Name"],
      [NAME, "extra"],
      [NAME, "--base"],
      ["--base", "x"],
      [NAME, "--base", "--x"],
      [NAME, "--require-test-first", "x"],
    ]) {
      assert.equal(spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" }).status, 2, JSON.stringify(args));
    }
  });
});

test("--base is passed through to the lock script, and children run in `cwd` (test paths resolve there)", () => {
  withWorld(testFirst, (root) => {
    // move the feature under another base; the lock records its mapping path, so rewrite it through --write
    const other = join(root, "specs");
    mkdirSync(other, { recursive: true });
    spawnSync("mv", [fd(root), join(other, NAME)]);
    const lock = JSON.parse(readFileSync(join(other, NAME, "AC-TESTS.lock.json"), "utf8"));
    assert.equal(lockCli(root, ["--write", NAME, "--base", "specs"]).status, 0);
    const fresh = JSON.parse(readFileSync(join(other, NAME, "AC-TESTS.lock.json"), "utf8"));
    fresh.red_run = { ...lock.red_run, files_sha256: filesDigest(fresh.files) };
    writeFileSync(join(other, NAME, "AC-TESTS.lock.json"), JSON.stringify(fresh));
    assert.equal(evaluateTestStage({ name: NAME, base: "specs", cwd: root }).token, "READY test-first");
    const cli = spawnSync(process.execPath, [CLI, NAME, "--base", "specs"], { cwd: root, encoding: "utf8" });
    assert.equal(cli.status, 0, cli.stdout);
    // from ANOTHER cwd the same feature is not found — the root is the caller's to name
    assert.notEqual(evaluateTestStage({ name: NAME, base: "specs", cwd: tmpdir() }).code, 0);
  });
});

test("an invalid name is unusable (exit 2), never a verdict", () => {
  assert.equal(evaluateTestStage({ name: "../x", cwd: tmpdir() }).code, 2);
  assert.equal(evaluateTestStage({ name: undefined, cwd: tmpdir() }).code, 2);
});

// ── ★ WIRING (L45): the three commands' pinned lines, EXECUTED ─────────────────────────────────────────

const COMMANDS = join(HERE, "..", "..", ".claude", "commands");
const fenced = (file) =>
  [...readFileSync(join(COMMANDS, file), "utf8").matchAll(/```bash\n([\s\S]*?)```/g)].flatMap((m) =>
    m[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
  );
const GATE_LINE = /^node pharn\/floor\/check-test-stage\.mjs <name>$/;
const sh = (dir, line) => spawnSync("sh", ["-c", line.replaceAll("<name>", NAME)], { cwd: dir, encoding: "utf8" });

test("★ WIRING — /pharn-build, /pharn-ship and /pharn-loop (with --require-test-first) each pin the gate once; it runs as documented", () => {
  for (const [file, re] of [
    ["pharn-build.md", GATE_LINE],
    ["pharn-ship.md", GATE_LINE],
    ["pharn-loop.md", /^node pharn\/floor\/check-test-stage\.mjs <name> --require-test-first$/],
  ]) {
    const hits = fenced(file).filter((l) => re.test(l));
    assert.equal(hits.length, 1, `${file} must pin its check-test-stage line exactly once, found ${hits.length}`);
    withWorld(testFirst, (root) => {
      execFileSync("cp", ["-R", HERE, join(root, "pharn", "floor")]);
      assert.equal(sh(root, hits[0]).status, 0, `${file}: the pinned line on a READY world`);
      rmSync(lockPath(root));
      const red = sh(root, hits[0]);
      assert.equal(red.status, 1, `${file}: the pinned line on a world without a lock`);
      assert.match(red.stdout, /^RED no-lock — /);
    });
  }
});

test("★ WIRING — /pharn-build runs the gate BEFORE its scope setter and anchor (grill G10)", () => {
  const lines = fenced("pharn-build.md");
  const gateAt = lines.findIndex((l) => GATE_LINE.test(l));
  const setterAt = lines.findIndex((l) => /set-writes-scope\.cjs --from-plan/.test(l));
  const anchorAt = lines.findIndex((l) => /reconcile-baseline\.mjs --anchor/.test(l));
  assert.ok(gateAt >= 0 && setterAt >= 0 && anchorAt >= 0, "non-vacuity: all three lines are pinned");
  assert.ok(
    gateAt < setterAt && gateAt < anchorAt,
    `the gate (${gateAt}) must precede the setter (${setterAt}) and the anchor (${anchorAt})`
  );
});

test("★ WIRING — /pharn-loop's pinned S12 preflight line is the checker's, and it exits 1 with the closed line LAST", () => {
  const hits = fenced("pharn-loop.md").filter((l) => /check-red-run\.mjs --preflight/.test(l));
  assert.equal(hits.length, 1, `pharn-loop.md must pin the preflight exactly once, found ${hits.length}`);
  assert.equal(
    hits[0],
    "node pharn/floor/check-red-run.mjs --preflight --ac-tests pharn/features/<name>/AC-TESTS.md --discover package.json --root ."
  );
  withWorld(testFirst, (root) => {
    execFileSync("cp", ["-R", HERE, join(root, "pharn", "floor")]);
    const r = sh(root, hits[0]); // no package.json: the no-runner case
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout.trim().split("\n").at(-1), /^blocked: no-test-runner — AC-1 \(unit\); suggested: /);
  });
});

test("★ WIRING — /pharn-loop's Step 6c staging builder, EXECUTED: stages the lock and its pinned tests, exits 4 on a missing or ignored one", () => {
  const body = readFileSync(join(COMMANDS, "pharn-loop.md"), "utf8");
  const m = body.match(/node -e '\n([\s\S]*?)\n' '<name>'/);
  assert.ok(m, "the builder block is pinned in pharn-loop.md");
  const builder = m[1];
  const repo = mkdtempSync(join(tmpdir(), "cts-6c-"));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: repo, stdio: "pipe" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    mkdirSync(join(repo, ".pharn"), { recursive: true });
    mkdirSync(join(repo, "pharn", "features", NAME), { recursive: true });
    mkdirSync(join(repo, "tests", "ac"), { recursive: true });
    mkdirSync(join(repo, "src"), { recursive: true });
    writeFileSync(join(repo, ".gitignore"), ".pharn/\nsrc/ignored.js\ntests/ac/ignored.test.js\n");
    writeFileSync(join(repo, "src", "a.js"), "a\n");
    writeFileSync(join(repo, "src", "ignored.js"), "i\n");
    writeFileSync(join(repo, UNIT), "t\n");
    writeFileSync(join(repo, "pharn", "features", NAME, "SPEC.md"), "s\n");
    git("add", "-A");
    git("commit", "-qm", "init");
    writeFileSync(
      join(repo, ".pharn", "writes-scope.json"),
      JSON.stringify({ set_by: `pharn/features/${NAME}/PLAN.md`, scope: ["src/a.js", "src/ignored.js"] })
    );
    const lock = (path) =>
      writeFileSync(join(repo, "pharn", "features", NAME, "AC-TESTS.lock.json"), JSON.stringify({ files: [{ path, sha256: "x" }] }));
    const run = () => spawnSync(process.execPath, ["-e", builder, NAME], { cwd: repo, encoding: "utf8" });
    lock(UNIT);
    const ok = run();
    assert.equal(ok.status, 0, ok.stderr);
    const staged = ok.stdout.split("\0").filter(Boolean);
    for (const p of ["src/a.js", `pharn/features/${NAME}/AC-TESTS.lock.json`, UNIT])
      assert.ok(staged.includes(p), `${p} staged: ${staged}`);
    assert.ok(!staged.includes("src/ignored.js"), "an ignored PLAN path is dropped — the filter works without GIT_LITERAL_PATHSPECS");
    lock("tests/ac/missing.test.js");
    assert.equal(run().status, 4, "a pinned test that is not on disk refuses the commit");
    writeFileSync(join(repo, "tests", "ac", "ignored.test.js"), "i\n");
    lock("tests/ac/ignored.test.js");
    assert.equal(run().status, 4, "a pinned test that git ignores refuses the commit (the lock would not verify on a clone)");
    lock(UNIT);
    writeFileSync(join(repo, ".gitignore"), ".pharn/\nsrc/ignored.js\ntests/ac/ignored.test.js\npharn/features/*/AC-TESTS.lock.json\n");
    assert.equal(run().status, 4, "an ignored LOCK refuses the commit too (REVIEW finding 7)");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ── closure (L36) ───────────────────────────────────────────────────────────────────────────────────────

test("✧ L36 CLOSURE — every red(...) literal in the module is a TEST_STAGE_REASONS member; the sets are sorted", () => {
  const src = readFileSync(CLI, "utf8");
  const used = [...src.matchAll(/\bred\(\s*"([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(used.length >= TEST_STAGE_REASONS.length, "the scan found the call sites");
  for (const r of used) assert.ok(TEST_STAGE_REASONS.includes(r), r);
  assert.deepEqual([...TEST_STAGE_REASONS], [...TEST_STAGE_REASONS].sort());
  assert.deepEqual([...READY_TOKENS], [...READY_TOKENS].sort());
});

test("✧ L36 REVERSE CLOSURE — every TEST_STAGE_REASONS member was reached by a test above", () => {
  for (const r of TEST_STAGE_REASONS) assert.ok(REACHED.has(r), `${r} was never reached`);
});
