// pharn/floor/default-test-glob.test.mjs — no file an install copies from pharn/floor/ or .claude/hooks/ is a test file
// to a bare `node --test`.
//
// WHY (the recorded failure, P7): an install copies the product floor into the user's project. Node's default test
// patterns include `**/test-*.?(c|m)js`, so until 7.0.1 a project whose `test` script is a bare `node --test` also ran
// test-infra-core.mjs, test-results-core.mjs and test-results-formats.mjs as its own tests (measured 2026-10-25 in a
// scratch project installed with pharn-cli 0.14.1 from 7.0.0: the entry gate counted 4 tests, 3 of them these
// modules). They passed, so nothing went red, but they inflated the project's test count and appeared in its per-test
// results records. 7.0.1 renamed them (ac-test-infra-core.mjs, per-test-results-core.mjs, per-test-results-formats.mjs).
//
// HOW: Node itself is the oracle, never a copy of its patterns (L55, L74). The test lays out a temporary project with
// one stub per shipped file at its installed path, each stub a single node:test case named after that path, and runs a
// bare `node --test` there. Only the control stub may run. The control, `pharn/floor/test-glob-control.mjs`, has a
// colliding name on purpose: it proves the probe sees a match at all (L60). Without it, a Node that searched nothing,
// or a stub that never registered its case, would pass.
//
// THE SHIPPED SET is pharn-cli's floor and hook copy rule, restated here because it lives in another repository (L67:
// a model of an external tool states its bounds): every file under pharn/floor/ except `*.test.mjs` / `*.test.cjs`
// and the floor-root `test-fixtures/` and `fixtures/` trees (pharn-cli FLOOR_TEST_FIXTURES_DIRS, src/lib/constants.ts),
// and every `.claude/hooks/*.cjs` / `*.mjs` except `*.test.*`. Every extension gets a stub, so a non-JS name that
// Node's patterns came to match would be caught too.
//
// BOUNDS: the patterns are those of the Node running this suite (Node 24; the floor requires 24.2 or later), not the
// user's. A bare `node --test` does not search dot-directories, so `.claude/hooks/` is never reached (measured on Node
// 24.13.1); the hook stubs are laid out anyway, so a Node that did search there would be caught. A user's `test`
// script that names its own globs is outside this test, and so is a file the CLI's copy rule would add that this
// restatement misses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CONTROL = "pharn/floor/test-glob-control.mjs";

// A NESTED `node --test` must not inherit this suite's coordination channel (stage-regress.test.mjs's CLEAN_ENV).
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

const isTestFile = (name) => /\.test\.(mjs|cjs)$/.test(name);
const FIXTURE_DIRS = ["test-fixtures", "fixtures"];

/** The installed paths of the floor and hook files an install copies, sorted. */
function shippedFiles() {
  const floor = readdirSync(join(ROOT, "pharn", "floor"), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(join(ROOT, "pharn", "floor").length + 1))
    .map((rel) => rel.split("\\").join("/"))
    .filter((rel) => !FIXTURE_DIRS.includes(rel.split("/")[0]) && !isTestFile(rel))
    .map((rel) => `pharn/floor/${rel}`);
  const hooks = readdirSync(join(ROOT, ".claude", "hooks"), { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(cjs|mjs)$/.test(e.name) && !/\.test\./.test(e.name))
    .map((e) => `.claude/hooks/${e.name}`);
  return [...floor, ...hooks].sort();
}

/** One node:test case named `rel`, in the module syntax its extension selects. */
function stub(rel) {
  const name = JSON.stringify(rel);
  return rel.endsWith(".cjs")
    ? `require("node:test").test(${name}, () => {});\n`
    : `import { test } from "node:test";\ntest(${name}, () => {});\n`;
}

/** Lays out `paths` as stubs in a fresh project and returns the case names a bare `node --test` ran there. */
function bareNodeTest(paths) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "default-test-glob-")));
  try {
    writeFileSync(join(dir, "package.json"), '{ "type": "module" }\n');
    for (const rel of paths) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), stub(rel));
    }
    const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap"], {
      cwd: dir,
      env: CLEAN_ENV,
      encoding: "utf8",
      timeout: 120_000,
    });
    assert.equal(r.error, undefined, `the nested node --test did not run: ${r.error}`);
    const ran = [...r.stdout.matchAll(/^(?:not )?ok \d+ - (.*)$/gm)].map((m) => m[1]).sort();
    return { ran, exit: r.status, stdout: r.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the shipped set is not empty and holds the floor's known members", () => {
  const files = shippedFiles();
  for (const rel of ["pharn/floor/validate.mjs", "pharn/floor/ac-test-infra-core.mjs", ".claude/hooks/set-writes-scope.cjs"]) {
    assert.ok(files.includes(rel), `${rel} is in the shipped set`);
  }
  assert.ok(!files.some((rel) => isTestFile(rel)), "no *.test.* file is in the shipped set");
  assert.ok(!files.some((rel) => rel.startsWith("pharn/floor/test-fixtures/")), "no test-fixtures file is in the shipped set");
  assert.ok(!files.includes(CONTROL), "the control is not a shipped file");
});

test("a bare node --test in an install runs none of the shipped floor or hook files, only the control", () => {
  const { ran, exit, stdout } = bareNodeTest([...shippedFiles(), CONTROL]);
  assert.deepEqual(ran, [CONTROL], `a bare node --test ran these files as tests:\n${stdout}`);
  assert.equal(exit, 0, stdout);
});

test("the probe catches the names 7.0.1 retired (the old floor names would run)", () => {
  const old = ["pharn/floor/test-infra-core.mjs", "pharn/floor/test-results-core.mjs", "pharn/floor/test-results-formats.mjs"];
  const { ran } = bareNodeTest(old);
  assert.deepEqual(ran, [...old].sort());
});
