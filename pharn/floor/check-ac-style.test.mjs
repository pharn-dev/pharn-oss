// pharn/floor/check-ac-style.test.mjs — check-ac-style.mjs end to end over scratch projects, and ★ WIRING (L45):
// /pharn-test's two COMMITTED lines, executed in order from the command file.
//
// Each scratch project carries a copy of the floor at `pharn/floor/`, an AC-TESTS.md mapping one test file, and
// `package.json` style scripts that are tiny node programs: `format:check` exits 1 when the mapped test file holds the
// marker UGLY (so the "tests broke the gate" flip is real, not mocked), `lint` always passes. Nothing here runs npm's
// network side; `npm run <id>` runs the local script.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEST_FILE = "tests/demo.test.mjs";
const AC_TESTS = [
  "---",
  "spec_id: demo",
  "---",
  "",
  "# AC tests",
  "",
  "## Files",
  "",
  `- \`${TEST_FILE}\``,
  "",
  "## Mapping",
  "",
  `- AC-1 | unit | \`${TEST_FILE}\` | \`src/demo.mjs\` export demo`,
  "",
].join("\n");
const CHECK_JS = [
  'import { existsSync, readFileSync } from "node:fs";',
  `const f = ${JSON.stringify(TEST_FILE)};`,
  'if (existsSync(f) && readFileSync(f, "utf8").includes("UGLY")) { console.log("[warn] " + f); process.exit(1); }',
  "",
].join("\n");

/** A scratch project. `scripts` overrides package.json's scripts; `config` writes pharn.config.json. */
function project({ scripts, config = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "acs-"));
  mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(join(dir, "pharn", "features", "demo", "AC-TESTS.md"), AC_TESTS);
  writeFileSync(join(dir, "check.mjs"), CHECK_JS);
  writeFileSync(join(dir, "red.mjs"), "process.exit(1);\n");
  const s = scripts ?? { test: "node --test", lint: "node -e 0", "format:check": "node check.mjs" };
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "demo", private: true, scripts: s }));
  if (config !== null) writeFileSync(join(dir, "pharn.config.json"), JSON.stringify(config));
  execFileSync("cp", ["-R", HERE, join(dir, "pharn", "floor")]);
  return { dir, done: () => rmSync(dir, { recursive: true, force: true }) };
}
// The committed checker, run from the scratch project: it reads only its invoking directory, and running the copy
// would credit a temp path in the coverage report instead of this file. The WIRING test below runs the copy.
const run = (dir, ...args) => spawnSync(process.execPath, [join(HERE, "check-ac-style.mjs"), ...args], { cwd: dir, encoding: "utf8" });
const before = (dir) => run(dir, "--before", "demo", "--timeout-ms", "60000");
const after = (dir) => run(dir, "--after", "demo", "--timeout-ms", "60000");
const writeTest = (dir, text) => writeFileSync(join(dir, TEST_FILE), text);
const STYLE = (dir, f) => join(dir, "pharn", ".run", "pharn-test", "style", f);

test("flip — format:check passes before and fails after an unformatted test is written → exit 1, RED naming gate and log", () => {
  const p = project();
  try {
    const b = before(p.dir);
    assert.equal(b.status, 0, b.stdout + b.stderr);
    assert.match(
      b.stdout,
      /^RECORDED — before the AC tests are written: lint exit 0, format:check exit 0; mapped test files existed: no$/m
    );
    writeTest(p.dir, "UGLY\n");
    const a = after(p.dir);
    assert.equal(a.status, 1, a.stdout + a.stderr);
    assert.match(
      a.stdout,
      /^RED — ac-tests-unformatted: format:check — exit 0 before the tests were written, exit 1 after; log: pharn\/\.run\/pharn-test\/style\/after-format-check\.out/m
    );
    assert.match(
      readFileSync(STYLE(p.dir, "after-format-check.out"), "utf8"),
      /\[warn\] tests\/demo\.test\.mjs/,
      "the named log holds the gate's own output"
    );
    // The one revision: the model rewrites ITS file, the same --after line goes GREEN against the same --before.
    writeTest(p.dir, "fine\n");
    const again = after(p.dir);
    assert.equal(again.status, 0, again.stdout);
    assert.match(again.stdout, /^GREEN — no style gate went from passing to failing/m);
  } finally {
    p.done();
  }
});

test("red before, red after, no test file before → exit 0 with a NOTE (not attributed)", () => {
  const p = project({ scripts: { test: "node --test", "lint:md": "node red.mjs" } });
  try {
    assert.equal(before(p.dir).status, 0);
    writeTest(p.dir, "x\n");
    const a = after(p.dir);
    assert.equal(a.status, 0, a.stdout);
    assert.match(
      a.stdout,
      /^NOTE — lint:md was already red before the tests were written \(exit 1, exit 1 after\) and no mapped test file existed then/m
    );
  } finally {
    p.done();
  }
});

test("red before AND the test file already existed (a re-run after a refusal) → exit 1 tests-existed", () => {
  const p = project();
  try {
    writeTest(p.dir, "UGLY\n");
    const b = before(p.dir);
    assert.match(b.stdout, /format:check exit 1; mapped test files existed: yes/);
    const a = after(p.dir);
    assert.equal(a.status, 1, a.stdout);
    assert.match(a.stdout, /RED — ac-tests-unformatted: format:check — exit 1 before and 1 after, and a mapped test file already existed/);
  } finally {
    p.done();
  }
});

test("a gate the project excludes is neither run nor judged", () => {
  const p = project({ config: { gates: { exclude: ["format:check"] } } });
  try {
    const b = before(p.dir);
    assert.match(b.stdout, /: lint exit 0; mapped/);
    writeTest(p.dir, "UGLY\n");
    assert.equal(after(p.dir).status, 0);
    assert.equal(existsSync(STYLE(p.dir, "after-format-check.out")), false);
  } finally {
    p.done();
  }
});

test("no style gate at all → GREEN on its explicit empty line (L34)", () => {
  const p = project({ scripts: { test: "node --test" } });
  try {
    assert.match(before(p.dir).stdout, /no style gate is discovered here/);
    const a = after(p.dir);
    assert.equal(a.status, 0);
    assert.match(a.stdout, /^GREEN — no style gate \(lint, format:check, lint:md\) is discovered here; nothing to compare$/m);
  } finally {
    p.done();
  }
});

test("a gate slower than --timeout-ms is NOT MEASURED → a NOTE, never RED", () => {
  const p = project({ scripts: { test: "node --test", lint: 'node -e "setTimeout(()=>{}, 30000)"' } });
  try {
    // A short timeout on both runs keeps the suite fast; the BEFORE side's own state does not change this row.
    assert.equal(run(p.dir, "--before", "demo", "--timeout-ms", "300").status, 0);
    const a = run(p.dir, "--after", "demo", "--timeout-ms", "300");
    assert.equal(a.status, 0, a.stdout + a.stderr);
    assert.match(a.stdout, /^NOTE — lint was not measured after the tests were written \(timed-out\)/m);
  } finally {
    p.done();
  }
});

test("UNUSABLE (exit 2): --after with no --before, a changed gate set, a foreign record, bad argv, a symlinked scratch dir", () => {
  const p = project();
  try {
    let r = after(p.dir);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /^UNUSABLE — no pharn\/\.run\/pharn-test\/style\/before\.json/m);

    assert.equal(before(p.dir).status, 0);
    writeFileSync(join(p.dir, "package.json"), JSON.stringify({ scripts: { test: "x", lint: "node -e 0" } }));
    r = after(p.dir);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /the style gates differ from the --before run \(before: lint,format:check; now: lint\)/);

    const rec = JSON.parse(readFileSync(STYLE(p.dir, "before.json"), "utf8"));
    writeFileSync(STYLE(p.dir, "before.json"), JSON.stringify({ ...rec, feature: "other" }));
    r = after(p.dir);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /belongs to the feature "other"/);

    for (const argv of [
      ["--before", "demo"],
      ["--before", "demo", "--timeout-ms", "abc"],
      ["--before", "Bad/Name", "--timeout-ms", "1000"],
      ["--before", "demo", "--after", "demo", "--timeout-ms", "1000"],
      ["--timeout-ms", "1000"],
      ["--before", "demo", "--timeout-ms", "1000", "extra"],
      ["--before", "demo", "--timeout-ms", "1000", "--gates", "x"],
    ]) {
      r = run(p.dir, ...argv);
      assert.equal(r.status, 2, `${argv.join(" ")}: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout, /^UNUSABLE — /);
    }

    r = run(p.dir, "--before", "nope", "--timeout-ms", "1000");
    assert.equal(r.status, 2);
    assert.match(r.stdout, /cannot read pharn\/features\/nope\/AC-TESTS\.md/);

    writeFileSync(STYLE(p.dir, "before.json"), "{not json");
    r = after(p.dir);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /^UNUSABLE — pharn\/\.run\/pharn-test\/style\/before\.json is not valid JSON/m);

    writeFileSync(join(p.dir, "package.json"), "{not json");
    r = before(p.dir);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /^UNUSABLE — package\.json is not valid JSON/m);
  } finally {
    p.done();
  }
  const q = project();
  try {
    mkdirSync(join(q.dir, "pharn", ".run"), { recursive: true });
    const elsewhere = mkdtempSync(join(tmpdir(), "acs-link-"));
    symlinkSync(elsewhere, join(q.dir, "pharn", ".run", "pharn-test"));
    const r = before(q.dir);
    assert.equal(r.status, 2, r.stdout);
    assert.match(r.stdout, /symlink/);
    rmSync(elsewhere, { recursive: true, force: true });
  } finally {
    q.done();
  }
});

test("--before recreates the scratch directory: a stale after.json from an earlier run does not survive", () => {
  const p = project();
  try {
    assert.equal(before(p.dir).status, 0);
    assert.equal(after(p.dir).status, 0);
    assert.equal(existsSync(STYLE(p.dir, "after.json")), true);
    assert.equal(before(p.dir).status, 0);
    assert.equal(existsSync(STYLE(p.dir, "after.json")), false);
  } finally {
    p.done();
  }
});

// ── ★ WIRING (L45): /pharn-test's COMMITTED lines, executed in order ───────────────────────────────────────

const PHARN_TEST_CMD = join(HERE, "..", "..", ".claude", "commands", "pharn-test.md");
const fencedLines = () =>
  [...readFileSync(PHARN_TEST_CMD, "utf8").matchAll(/```bash\n([\s\S]*?)```/g)].flatMap((m) =>
    m[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
  );
function pinnedLine(re) {
  const hits = fencedLines().filter((l) => re.test(l));
  assert.equal(hits.length, 1, `expected exactly one pinned line matching ${re}, found ${JSON.stringify(hits)}`);
  return hits[0];
}

test("★ WIRING — /pharn-test's --before line sits after the preflight and before the lock; --after between the two; both run as committed", () => {
  const preflight = pinnedLine(/check-red-run\.mjs --preflight/);
  const beforeLine = pinnedLine(/check-ac-style\.mjs --before/);
  const afterLine = pinnedLine(/check-ac-style\.mjs --after/);
  const write = pinnedLine(/ac-tests-lock\.mjs --write <name>$/);
  const at = [preflight, beforeLine, afterLine, write].map((l) => fencedLines().indexOf(l));
  assert.deepEqual(
    at,
    [...at].sort((a, b) => a - b),
    `out of order: ${at}`
  );
  for (const l of [beforeLine, afterLine]) {
    const ms = Number(l.match(/--timeout-ms (\d+)$/)?.[1]);
    assert.ok(ms > 0 && ms * 3 < 600000, `${l}: three gates at --timeout-ms must fit Claude Code's 600000 ms Bash maximum`);
  }
  const p = project();
  const sh = (line) => spawnSync("sh", ["-c", line.replaceAll("<name>", "demo")], { cwd: p.dir, encoding: "utf8" });
  try {
    let r = sh(beforeLine);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    writeTest(p.dir, "UGLY\n");
    r = sh(afterLine);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    writeTest(p.dir, "fine\n");
    r = sh(afterLine);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  } finally {
    p.done();
  }
});
