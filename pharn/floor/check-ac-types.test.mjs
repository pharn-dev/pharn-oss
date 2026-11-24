// pharn/floor/check-ac-types.test.mjs — check-ac-types.mjs end to end over scratch projects, and ★ WIRING (L45):
// /pharn-test's COMMITTED Step 3c line, executed from the command file.
//
// Each scratch project carries a copy of the floor at `pharn/floor/`, an AC-TESTS.md mapping `src/__tests__/a.test.ts`
// (the path of the measured tsc probe), and a `typecheck` script that is a tiny node program printing a chosen tsc
// output and exiting with a chosen code — the measured fixture (pharn/floor/test-fixtures/typecheck/) by default. Nothing
// here runs npm's network side; `npm run <id>` runs the local script.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = (n) => readFileSync(join(HERE, "test-fixtures", "typecheck", n), "utf8");
const TEST_FILE = "src/__tests__/a.test.ts";
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
  `- AC-1 | unit | \`${TEST_FILE}\` | \`src/reset.ts\` export resetPassword`,
  "",
].join("\n");

/** A scratch project. `output`/`exit` make the fake typecheck; `stream` picks stdout or stderr; `scripts` overrides. */
function project({ output = FIX("tsc-plain.out"), exit = 2, stream = "stdout", scripts, config = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "act-"));
  mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
  writeFileSync(join(dir, "pharn", "features", "demo", "AC-TESTS.md"), AC_TESTS);
  writeFileSync(join(dir, "tsc-output.txt"), output);
  writeFileSync(
    join(dir, "tc.mjs"),
    `import { readFileSync } from "node:fs";\nprocess.${stream}.write(readFileSync("tsc-output.txt", "utf8"));\nprocess.exitCode = ${exit};\n`
  );
  const s = scripts ?? { test: "node --test", typecheck: "node tc.mjs" };
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "demo", private: true, scripts: s }));
  if (config !== null) writeFileSync(join(dir, "pharn.config.json"), JSON.stringify(config));
  execFileSync("cp", ["-R", HERE, join(dir, "pharn", "floor")]);
  return { dir, done: () => rmSync(dir, { recursive: true, force: true }) };
}
// The committed checker, run from the scratch project (it reads only its invoking directory). WIRING runs the copy.
const run = (dir, ...args) => spawnSync(process.execPath, [join(HERE, "check-ac-types.mjs"), ...args], { cwd: dir, encoding: "utf8" });
const check = (dir) => run(dir, "demo", "--timeout-ms", "60000");
const LOG = (dir, f) => join(dir, "pharn", ".run", "pharn-test", "types", f);

test("the measured CORE-311 shape (plain tsc output) → exit 1, RED on exactly TS2741 in the mapped file; exempt codes and the outside file are NOTEs", () => {
  const p = project();
  try {
    const r = check(p.dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const reds = r.stdout.split("\n").filter((l) => l.startsWith("RED — ac-tests-typecheck:"));
    assert.deepEqual(reds, [
      'RED — ac-tests-typecheck: typecheck — "src/__tests__/a.test.ts"(5,9) TS2741 in a mapped AC test file; log: pharn/.run/pharn-test/types/typecheck.out (and .err)',
    ]);
    assert.match(
      r.stdout,
      /^NOTE — typecheck: .*\(2,42\) TS2307, .*\(4,18\) TS2554, .*\(6,7\) TS2339, .*\(7,11\) TS2339 — missing-target codes/m
    );
    assert.match(r.stdout, /^NOTE — typecheck exit 2: 1 diagnostic\(s\) outside the AC test files; not attributed to them/m);
    assert.match(r.stdout, /^RED — 1 type error\(s\) located in the AC test files: do not pin them$/m);
    assert.match(readFileSync(LOG(p.dir, "typecheck.out"), "utf8"), /TS2741/, "the named log holds the gate's own output");
  } finally {
    p.done();
  }
});

test("pretty tsc output on stderr → the same single RED (ANSI stripped, related-information lines ignored)", () => {
  const p = project({ output: FIX("tsc-pretty.out"), stream: "stderr" });
  try {
    const r = check(p.dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.equal(r.stdout.split("\n").filter((l) => l.startsWith("RED — ac-tests-typecheck:")).length, 1);
    assert.match(r.stdout, /\(5,9\) TS2741 in a mapped AC test file/);
  } finally {
    p.done();
  }
});

test("red-first only (missing-target codes in the AC test, an error elsewhere) → exit 0 GREEN with NOTEs, never refused", () => {
  const out = [
    "src/__tests__/a.test.ts(2,42): error TS2307: Cannot find module '../reset.js' or its corresponding type declarations.",
    "src/lib.ts(3,14): error TS2322: Type 'string' is not assignable to type 'number'.",
    "",
  ].join("\n");
  const p = project({ output: out });
  try {
    const r = check(p.dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /^RED/m);
    assert.match(r.stdout, /TS2307 — missing-target codes, expected before the build/);
    assert.match(r.stdout, /^GREEN — no type error outside the missing-target codes is located in the AC test files$/m);
  } finally {
    p.done();
  }
});

test("a red gate with no tsc-format line → exit 0 with a not-attributed NOTE (never GREEN by silence)", () => {
  const p = project({ output: "Error -------- src/__tests__/a.test.ts:5:9\nCannot assign object literal (another checker's format)\n" });
  try {
    const r = check(p.dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^NOTE — typecheck exit 2 with no line in tsc's format; not attributed to the AC tests/m);
  } finally {
    p.done();
  }
});

test("a passing typecheck → exit 0 GREEN, and its output is not read", () => {
  const p = project({ exit: 0 });
  try {
    const r = check(p.dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(r.stdout.trim(), "GREEN — no type error outside the missing-target codes is located in the AC test files");
  } finally {
    p.done();
  }
});

test("no typecheck gate, or the gate excluded → exit 0 with the explicit empty-set line (L34)", () => {
  for (const opts of [{ scripts: { test: "node --test" } }, { config: { gates: { exclude: ["typecheck"] } } }]) {
    const p = project(opts);
    try {
      const r = check(p.dir);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.equal(r.stdout.trim(), "GREEN — no typecheck gate (typecheck, type-check) is discovered here; nothing to check");
    } finally {
      p.done();
    }
  }
});

test("both typecheck and type-check run, in TYPE_SET order, each judged", () => {
  const p = project({ scripts: { "type-check": "node tc.mjs", typecheck: "node -e 0" } });
  try {
    const r = check(p.dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /RED — ac-tests-typecheck: type-check — /);
    assert.equal(existsSync(LOG(p.dir, "typecheck.out")), true);
    assert.equal(existsSync(LOG(p.dir, "type-check.out")), true);
  } finally {
    p.done();
  }
});

test("a gate killed at --timeout-ms → exit 0 with a not-measured NOTE that says the error may still reach the post-build gates", () => {
  const p = project({ scripts: { typecheck: 'node -e "setTimeout(() => {}, 30000)"' } });
  try {
    const r = run(p.dir, "demo", "--timeout-ms", "500");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^NOTE — typecheck was not measured \(timed-out\); .*may still reach the post-build gates$/m);
  } finally {
    p.done();
  }
});

test("UNUSABLE (exit 2) — bad argv, a missing mapping, or a symlinked scratch directory", () => {
  const p = project();
  try {
    for (const args of [
      [],
      ["demo"],
      ["demo", "--timeout-ms", "5"],
      ["--timeout-ms", "60000", "demo"],
      ["Bad Name", "--timeout-ms", "60000"],
      ["demo", "--timeout-ms", "60000", "--x"],
    ]) {
      const r = run(p.dir, ...args);
      assert.equal(r.status, 2, `${JSON.stringify(args)}: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout, /^UNUSABLE — /);
      assert.match(r.stdout, /`typecheck-check-unusable`/);
    }
    assert.equal(run(p.dir, "other", "--timeout-ms", "60000").status, 2, "no AC-TESTS.md for that feature");
    mkdirSync(join(p.dir, "pharn", ".run"), { recursive: true });
    const elsewhere = mkdtempSync(join(tmpdir(), "act-link-"));
    symlinkSync(elsewhere, join(p.dir, "pharn", ".run", "pharn-test"));
    const r = check(p.dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /symlink/);
    rmSync(elsewhere, { recursive: true, force: true });
  } finally {
    p.done();
  }
});

test("UNUSABLE (exit 2) — a package.json that is not JSON, or a gate log that cannot be read after a red exit (never GREEN)", () => {
  const bad = project();
  try {
    writeFileSync(join(bad.dir, "package.json"), "{ not json");
    const r = check(bad.dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /^UNUSABLE — package\.json is not valid JSON/m);
  } finally {
    bad.done();
  }
  // The gate removes its own stderr log, then exits 1: the checker cannot read it and must not judge.
  const gone = project({ scripts: { typecheck: "node rm-log.mjs" } });
  try {
    writeFileSync(
      join(gone.dir, "rm-log.mjs"),
      'import { rmSync } from "node:fs";\nrmSync("pharn/.run/pharn-test/types/typecheck.err", { force: true });\nprocess.exitCode = 1;\n'
    );
    const r = check(gone.dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /^UNUSABLE — cannot read the typecheck log .*typecheck\.err.* after a red exit/m);
  } finally {
    gone.done();
  }
});

// ── ★ WIRING (L45): /pharn-test's COMMITTED Step 3c line ───────────────────────────────────────────────────

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

test("★ WIRING — /pharn-test's Step 3c line sits after the style --after line and before the lock write, and runs as committed", () => {
  const styleAfter = pinnedLine(/check-ac-style\.mjs --after/);
  const types = pinnedLine(/check-ac-types\.mjs /);
  const write = pinnedLine(/ac-tests-lock\.mjs --write <name>$/);
  const at = [styleAfter, types, write].map((l) => fencedLines().indexOf(l));
  assert.deepEqual(
    at,
    [...at].sort((a, b) => a - b),
    `out of order: ${at}`
  );
  const ms = Number(types.match(/--timeout-ms (\d+)$/)?.[1]);
  assert.ok(ms > 0 && ms * 2 < 600000, `${types}: two gates at --timeout-ms must fit Claude Code's 600000 ms Bash maximum`);
  const p = project();
  const sh = (line) => spawnSync("sh", ["-c", line.replaceAll("<name>", "demo")], { cwd: p.dir, encoding: "utf8" });
  try {
    let r = sh(types);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    writeFileSync(join(p.dir, "tsc-output.txt"), "src/__tests__/a.test.ts(2,42): error TS2307: Cannot find module.\n");
    r = sh(types);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  } finally {
    p.done();
  }
});
