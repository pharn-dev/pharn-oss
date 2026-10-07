// .dev/floor/test-globs.test.mjs — the contributor test suite's FILE SET, executed rather than read (6.49.3).
//
// WHY (audit test gap 11, P3-N). `npm test` names its files by glob. Sibling Claude Code sessions keep whole
// checkouts under `.claude/worktrees/<agent>/` — every one holding its own copy of every test file. Nothing in
// package.json says "exclude .claude/worktrees/": the exclusion holds only because Node's test-runner glob does
// not descend into a dot-directory through `**`, and because the one `.claude` pattern names `.claude/hooks/*`, not
// `.claude/**` (which WOULD collect `.claude/worktrees/<agent>/pharn/floor/*.test.mjs` — every segment after
// `.claude` is a plain name). `node --test` has no file-exclusion flag (Node 24: only test-NAME patterns), so the
// guard is this test: it runs package.json's own patterns through the REAL `node --test` over a fixture whose
// worktree copies throw at load, and a negative control proves the fixture can see a collected worktree (L4).
// floor.yml used to restate the globs, with `.claude/**`; it now runs `npm test`, and that is pinned here too.
//
// BOUND (P0): this pins the behaviour of the Node that runs it, over these patterns. It says nothing about a
// different runner, an editor's test explorer, or a pattern added to another script.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).scripts.test;

/** package.json's `test` script as argv after `node --test`: each double-quoted pattern, in order. */
function npmTestPatterns() {
  assert.match(SCRIPT, /^node --test (?:"[^"]+" ?)+$/, "the test script must stay `node --test` over double-quoted patterns");
  return [...SCRIPT.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const OK = (tag) => `import { test } from "node:test";\ntest("ran:${tag}", () => {});\n`;
const BAD = `throw new Error("COLLECTED-A-SIBLING-WORKTREE");\n`;

/** A tree with one passing test per real location and a throwing copy under every `.claude/worktrees/` shape. */
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "test-globs-")));
  const put = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  put(".claude/hooks/guard.test.cjs", OK("hooks").replace('import { test } from "node:test";', 'const { test } = require("node:test");'));
  put(".dev/floor/dev.test.mjs", OK("dev"));
  put("pharn/floor/floor.test.mjs", OK("floor"));
  for (const rel of [
    ".claude/worktrees/agent-x/pharn/floor/floor.test.mjs",
    ".claude/worktrees/agent-x/.dev/floor/dev.test.mjs",
    ".claude/worktrees/agent-x/.claude/hooks/guard.test.mjs",
    ".claude/worktrees/agent-x/top.test.mjs",
  ])
    put(rel, BAD);
  return root;
}

function nodeTest(root, patterns) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // a runner spawned from inside a test file must report as a top-level run
  return spawnSync(process.execPath, ["--test", "--test-reporter=spec", ...patterns], { cwd: root, env, encoding: "utf8" });
}

test("✧ npm test's own globs collect the real test locations and NOTHING under .claude/worktrees/ (real node --test)", () => {
  const root = fixture();
  try {
    const r = nodeTest(root, npmTestPatterns());
    const out = r.stdout + r.stderr;
    assert.doesNotMatch(out, /COLLECTED-A-SIBLING-WORKTREE/, out);
    assert.equal(r.status, 0, out);
    for (const tag of ["hooks", "dev", "floor"]) assert.match(out, new RegExp(`ran:${tag}`), `the ${tag} test must run: ${out}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("✧ the fixture DISCRIMINATES: floor.yml's pre-6.49.3 `.claude/**` pattern does collect a sibling worktree (L4)", () => {
  const root = fixture();
  try {
    const r = nodeTest(root, [".claude/**/*.test.mjs"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /COLLECTED-A-SIBLING-WORKTREE/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("✧ floor.yml runs `npm test` itself, on the Node major ci.yml pins (no restated globs, no `lts/*`)", () => {
  const floor = readFileSync(join(REPO, ".github", "workflows", "floor.yml"), "utf8");
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8");
  assert.match(floor, /^\s+run: npm test\s*$/m, "floor.yml must run `npm test`, so its file set is package.json's");
  assert.doesNotMatch(floor, /node --test/, "floor.yml must not restate the globs");
  const major = (y) => y.match(/^\s+node-version: (\S+)\s*$/m)?.[1];
  assert.equal(major(ci), "24");
  assert.equal(major(floor), major(ci), "floor.yml and ci.yml must test on the same Node major");
});
