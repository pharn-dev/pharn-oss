// pharn/floor/build-gate.test.mjs — /pharn-build's project gate (6.38.0), end to end in fixture git repos: the full
// set (discovered minus e2e, no reconcile), the targeted set (the `test` gate over the declared test files only),
// every exit, the continue-or-start rule, containment, the gate exclusion reaching both modes (GATE 1 Q1, grill G6),
// and ★ WIRING — /pharn-build Step 4's committed lines, each run as its own shell (L44, L45).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT } from "./build-gate-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "build-gate.mjs");
const OUT_FULL = ".pharn/pharn-build/demo/full";
const OUT_TARGETED = ".pharn/pharn-build/demo/targeted";

/** The fixture's one runner: `node runner.cjs <gate-id> [files…]`. It records each call, sleeps, writes a vitest-shaped
 *  report for the `test` gate (one test per file it was handed, or one default test), and exits as `.pharn/mode.json`
 *  says. Everything it writes or reads sits under `.pharn/` (git-ignored, outside the tree fingerprint). */
const RUNNER = [
  'const fs = require("fs");',
  "const [id, ...files] = process.argv.slice(2);",
  'let mode = {}; try { mode = JSON.parse(fs.readFileSync(".pharn/mode.json", "utf8")); } catch {}',
  'fs.mkdirSync(".pharn", { recursive: true });',
  'fs.appendFileSync(".pharn/calls.jsonl", JSON.stringify({ id, files }) + "\\n");',
  "const until = Date.now() + (mode.sleep || 0); while (Date.now() < until) {}",
  "const fail = new Set(mode.fail || []);",
  'const names = files.length ? files : ["tests/all.test.js"];',
  "let failed = 0;",
  "const testResults = names.map((f) => {",
  "  const bad = fail.has(f); if (bad) failed++;",
  "  return { name: process.cwd() + '/' + f, status: bad ? 'failed' : 'passed', assertionResults: [{ ancestorTitles: ['suite'], title: 'case ' + f, status: bad ? 'failed' : 'passed',",
  "    failureMessages: bad ? ['\\u001b[31mAssertionError: expected 1 to be 2\\u001b[39m\\n    at ' + process.cwd() + '/' + f + ':3:9\\n    at x (' + process.cwd() + '/node_modules/vitest/a.js:1:1)'] : [] }] };",
  "});",
  'if (id === "test" && process.env.PHARN_TEST_RESULTS) fs.writeFileSync(process.env.PHARN_TEST_RESULTS, JSON.stringify({ testResults }));',
  'console.log(id + " ran over " + names.length + " file(s)");',
  'if (mode.big === id) { const row = "y".repeat(99) + "\\n"; fs.writeSync(1, row.repeat(60000)); console.log("LAST LINE of a big log"); }',
  "if (mode.exit && Object.prototype.hasOwnProperty.call(mode.exit, id)) { console.error(id + ': error XYZ'); process.exit(mode.exit[id]); }",
  "process.exit(id === 'test' && failed ? 1 : 0);",
  "",
].join("\n");

const PLAN = (files) => ["# PLAN — demo", "", "## Files", "", ...files.map((f) => `- \`${f}\` — t`), ""].join("\n");
const AC = [
  "---",
  "spec_id: demo",
  "---",
  "",
  "## Files",
  "",
  "- `tests/ac/u.test.js` — t",
  "- `e2e/x.spec.js` — t",
  "",
  "## Mapping",
  "",
  "- AC-1 | unit | `tests/ac/u.test.js` | t",
  "- AC-2 | e2e | `e2e/x.spec.js` | t",
  "",
].join("\n");

function project({
  scripts = {
    test: "node runner.cjs test",
    lint: "node runner.cjs lint",
    typecheck: "node runner.cjs typecheck",
    e2e: "node runner.cjs e2e",
  },
  config = { testResults: { test: "vitest-json" } },
  planFiles = ["src/a.js", "tests/a.test.js", "tests/missing.test.js", "e2e/x.spec.js"],
  withAc = true,
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), "bg-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  for (const f of ["src/a.js", "tests/a.test.js", "tests/ac/u.test.js", "e2e/x.spec.js"]) {
    mkdirSync(join(dir, dirname(f)), { recursive: true });
    writeFileSync(join(dir, f), `// ${f}\n`);
  }
  writeFileSync(join(dir, "runner.cjs"), RUNNER);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "p", private: true, scripts }));
  if (config !== null) writeFileSync(join(dir, "pharn.config.json"), JSON.stringify(config));
  mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
  writeFileSync(join(dir, "pharn", "features", "demo", "PLAN.md"), PLAN(planFiles));
  if (withAc) writeFileSync(join(dir, "pharn", "features", "demo", "AC-TESTS.md"), AC);
  git("add", "-A");
  git("commit", "-qm", "init");
  return dir;
}
const setMode = (dir, mode) => {
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(join(dir, ".pharn", "mode.json"), JSON.stringify(mode));
};
const calls = (dir) =>
  existsSync(join(dir, ".pharn", "calls.jsonl"))
    ? readFileSync(join(dir, ".pharn", "calls.jsonl"), "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
const gate = (dir, args) => spawnSync(process.execPath, [CLI, "--feature", "demo", ...args], { cwd: dir, encoding: "utf8" });
const full = (dir, extra = []) => gate(dir, ["--mode", "full", "--timeout-ms", "60000", ...extra]);
const targeted = (dir, extra = []) => gate(dir, ["--mode", "targeted", "--timeout-ms", "60000", ...extra]);
const stampOf = (dir, out) => JSON.parse(readFileSync(join(dir, out, "stamp.json"), "utf8"));
const withProject = (opts, fn) => {
  const dir = project(opts);
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("full GREEN — the discovered set minus the e2e gates, in ALLOWLIST order, no reconcile; one time per runner call", () => {
  withProject({}, (dir) => {
    const r = full(dir);
    assert.equal(r.status, EXIT.green, r.stdout + r.stderr);
    assert.match(r.stdout, /result: GREEN \(exit 0\)/);
    const s = stampOf(dir, OUT_FULL);
    assert.equal(s.stage, "build");
    assert.deepEqual(s.required, ["test", "lint", "typecheck"]);
    assert.deepEqual(
      s.runs.map((x) => x.id),
      ["test", "lint", "typecheck"],
      "no e2e, no reconcile"
    );
    assert.deepEqual(
      calls(dir).map((c) => c.id),
      ["test", "lint", "typecheck"]
    );
    assert.deepEqual(calls(dir)[0].files, [], "the full test gate runs the whole suite");
    const times = JSON.parse(readFileSync(join(dir, ".pharn/pharn-build/demo/full.times.json"), "utf8"));
    assert.deepEqual(Object.keys(times).sort(), ["0", "1", "2"]);
    for (const v of Object.values(times)) assert.ok(Number.isInteger(v) && v >= 0);
  });
});

test("full RED — failing tests are named with a bounded, fenced excerpt; a red gate with no record gets its log tail", () => {
  withProject({}, (dir) => {
    setMode(dir, { fail: ["tests/all.test.js"], exit: { typecheck: 2 } });
    const r = full(dir);
    assert.equal(r.status, EXIT.red, r.stdout + r.stderr);
    assert.match(r.stdout, /result: RED \(exit 3\)/);
    assert.match(r.stdout, /## test — exit 1/);
    assert.match(r.stdout, /✗ tests\/all\.test\.js::suite › case tests\/all\.test\.js\n {4}AssertionError: expected 1 to be 2/);
    assert.doesNotMatch(r.stdout, /node_modules/, "noise frames are cut");
    assert.ok(!r.stdout.includes(String.fromCharCode(27)), "colour codes are cut");
    assert.match(r.stdout, /## typecheck — exit 2/);
    assert.match(r.stdout, /stderr, last lines \(DATA[^\n]*\n\n```text\ntypecheck: error XYZ\n```/);
    assert.match(r.stdout, /full logs: \.pharn\/pharn-build\/demo\/full\/2-typecheck\.out/);
    assert.doesNotMatch(r.stdout, /## lint/, "a green gate gets no section");
  });
});

test("a 6 MB log is read for its tail only, and the summary stays bounded", () => {
  withProject({}, (dir) => {
    setMode(dir, { big: "typecheck", exit: { typecheck: 2 } });
    const r = full(dir);
    assert.equal(r.status, EXIT.red, r.stderr);
    assert.match(r.stdout, /LAST LINE of a big log\n```/);
    assert.match(r.stdout, /earlier lines — see the full log/);
    assert.ok(Buffer.byteLength(r.stdout) < 20000, `bounded: ${Buffer.byteLength(r.stdout)}`);
  });
});

test("targeted — only the `test` gate, handed exactly the declared test files that exist, never the e2e-mapped one", () => {
  withProject({}, (dir) => {
    const r = targeted(dir);
    assert.equal(r.status, EXIT.green, r.stdout + r.stderr);
    assert.deepEqual(calls(dir), [{ id: "test", files: ["tests/a.test.js", "tests/ac/u.test.js"] }]);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, ".pharn/pharn-build/demo/targets.json"), "utf8")), [
      "tests/a.test.js",
      "tests/ac/u.test.js",
    ]);
    assert.match(r.stdout, /targets: 2 test file\(s\)/);
    const s = stampOf(dir, OUT_TARGETED);
    assert.deepEqual(s.required, ["test"]);
    // RED: the failing declared file is named.
    setMode(dir, { fail: ["tests/ac/u.test.js"] });
    const red = targeted(dir);
    assert.equal(red.status, EXIT.red, red.stdout);
    assert.match(red.stdout, /✗ tests\/ac\/u\.test\.js::suite › case tests\/ac\/u\.test\.js/);
  });
});

test("L34 — NO-GATES (exit 4) when there is nothing to run, and the runner is never handed an empty list", () => {
  // targeted, no declared test file on disk: no init at all.
  withProject({ planFiles: ["src/a.js"], withAc: false }, (dir) => {
    const r = targeted(dir);
    assert.equal(r.status, EXIT["no-gates"], r.stdout);
    assert.match(r.stdout, /Run the full line instead/);
    assert.equal(existsSync(join(dir, OUT_TARGETED)), false, "nothing was initialized");
    assert.deepEqual(calls(dir), []);
  });
  // targeted, no `test` script.
  withProject({ scripts: { lint: "node runner.cjs lint" } }, (dir) => {
    const r = targeted(dir);
    assert.equal(r.status, EXIT["no-gates"], r.stdout);
    assert.match(r.stdout, /needs a `test` gate/);
  });
  // full, an e2e-only manifest.
  withProject({ scripts: { e2e: "node runner.cjs e2e" } }, (dir) => {
    const r = full(dir);
    assert.equal(r.status, EXIT["no-gates"], r.stdout);
    assert.match(r.stdout, /ask the human which gates to run/);
    assert.deepEqual(calls(dir), []);
  });
});

test("review R1 — no package.json is NO-GATES (4), never UNUSABLE; a human's --gates runs as given in both modes", () => {
  withProject({}, (dir) => {
    rmSync(join(dir, "package.json"));
    for (const run of [full, targeted]) {
      const r = run(dir);
      assert.equal(r.status, EXIT["no-gates"], r.stdout + r.stderr);
      assert.match(r.stdout, /no --gates was given and there is no package\.json/);
    }
    assert.match(full(dir).stdout, /--gates followed by it, single-quoted, exactly as given; under \/pharn-loop this is S4/);
    // The human's spec (no comma inside a token — the runner's documented bound), passed as one argv string.
    const spec = "node runner.cjs test::test,node runner.cjs check::check";
    const f = full(dir, ["--gates", spec]);
    assert.equal(f.status, EXIT.green, f.stdout + f.stderr);
    assert.match(f.stdout, /set: the human's --gates spec, run as given/);
    assert.deepEqual(
      calls(dir).map((c) => c.id),
      ["test", "check"]
    );
    assert.equal(stampOf(dir, OUT_FULL).source, "explicit");
    // targeted over an explicit spec: its `test` id alone, handed the targets.
    writeFileSync(join(dir, ".pharn", "calls.jsonl"), "");
    const t = targeted(dir, ["--gates", spec]);
    assert.equal(t.status, EXIT.green, t.stdout + t.stderr);
    assert.deepEqual(calls(dir), [{ id: "test", files: ["tests/a.test.js", "tests/ac/u.test.js"] }]);
    // An empty spec is a usage error, never "no spec".
    assert.equal(full(dir, ["--gates", " "]).status, EXIT.unusable);
  });
});

test("review R4/R7 — a refused record prints the tail it announces; a failed duplicated-id test is named, not only counted", () => {
  withProject({}, (dir) => {
    // exit 0 with a failed test in the report → results-exit-contradiction → a GREEN gate with a refused record.
    setMode(dir, { fail: ["tests/all.test.js"], forceExit: 0 });
    writeFileSync(join(dir, "runner.cjs"), RUNNER.replace("process.exit(id === 'test' && failed ? 1 : 0);", "process.exit(mode.forceExit !== undefined ? mode.forceExit : id === 'test' && failed ? 1 : 0);"));
    const r = full(dir);
    assert.equal(r.status, EXIT.green, r.stdout);
    assert.match(r.stdout, /per-test results not read: results-exit-contradiction — the log tail follows/);
    assert.match(r.stdout, /```text\n> test\n> node runner\.cjs test\n\ntest ran over 1 file\(s\)\n```/);
  });
  withProject({}, (dir) => {
    // Two tests sharing one id, one failed → the record's anomaly; the gate is red and the id is named.
    writeFileSync(
      join(dir, "runner.cjs"),
      RUNNER.replace(
        'if (id === "test" && process.env.PHARN_TEST_RESULTS)',
        "if (id === 'test') { testResults[0].assertionResults.push({ ...testResults[0].assertionResults[0], status: 'failed', failureMessages: ['Error: dup boom'] }); failed++; }\nif (id === \"test\" && process.env.PHARN_TEST_RESULTS)"
      )
    );
    const r = full(dir);
    assert.equal(r.status, EXIT.red, r.stdout + r.stderr);
    assert.match(r.stdout, /0 failed · 0 passed · 0 skipped · 1 anomaly/);
    assert.match(r.stdout, /✗ tests\/all\.test\.js::suite › case tests\/all\.test\.js \(duplicate-test-id\)\n {4}Error: dup boom/);
  });
});

test("GATE 1 Q1 / grill G6 — the project's gate exclusion reaches BOTH modes, disclosed in the summary", () => {
  withProject({ config: { testResults: { test: "vitest-json" }, gates: { exclude: ["typecheck"] } } }, (dir) => {
    const r = full(dir);
    assert.equal(r.status, EXIT.green, r.stdout + r.stderr);
    assert.deepEqual(
      calls(dir).map((c) => c.id),
      ["test", "lint"],
      "typecheck is excluded"
    );
    assert.deepEqual(stampOf(dir, OUT_FULL).excluded, { declared_in: "pharn.config.json#gates.exclude", ids: ["typecheck"] });
    assert.match(r.stdout, /excluded by the project \(pharn\.config\.json#gates\.exclude\): typecheck/);
    // targeted skips typecheck anyway, so the declaration is not credited with it (the G9 rule)
    const t = targeted(dir);
    assert.equal(t.status, EXIT.green, t.stdout);
    assert.equal(Object.hasOwn(stampOf(dir, OUT_TARGETED), "excluded"), false);
  });
  withProject({ config: { testResults: { test: "vitest-json" }, gates: { exclude: ["test"] } } }, (dir) => {
    const t = targeted(dir);
    assert.equal(t.status, EXIT["no-gates"], t.stdout);
    assert.match(t.stdout, /removed test/);
  });
});

test("L44/L66 — CONTINUE (exit 5) under the budget; the same line continues an unchanged tree and restarts a changed one", () => {
  withProject({ scripts: { test: "node runner.cjs test", lint: "node runner.cjs lint" } }, (dir) => {
    // The second gate may start only within 100 ms of the call's start (5000 + 100 budget), so each call runs one.
    const line = ["--timeout-ms", "5000", "--budget-ms", "5100"];
    const a = gate(dir, ["--mode", "full", ...line]);
    assert.equal(a.status, EXIT.continue, a.stdout + a.stderr);
    assert.match(a.stdout, /CONTINUE — 1 of 2 gate\(s\) done/);
    // Review R6: the finished gate and its exit are visible before the rest runs.
    assert.match(a.stdout, /finished so far \(exit · wall time of the runner call\):\n {2}test\s+exit\s+0\s+\d+\.\d s\n/);
    const b = gate(dir, ["--mode", "full", ...line]);
    assert.equal(b.status, EXIT.green, b.stdout + b.stderr);
    assert.deepEqual(
      calls(dir).map((c) => c.id),
      ["test", "lint"],
      "continued: test was not run again"
    );
    const times = JSON.parse(readFileSync(join(dir, ".pharn/pharn-build/demo/full.times.json"), "utf8"));
    assert.deepEqual(Object.keys(times).sort(), ["0", "1"], "both calls' times are kept");
    // A paused run whose tree then changes is started over, never read as this tree's.
    writeFileSync(join(dir, ".pharn", "calls.jsonl"), "");
    assert.equal(gate(dir, ["--mode", "full", ...line]).status, EXIT.continue);
    writeFileSync(join(dir, "src", "a.js"), "// edited\n");
    assert.equal(gate(dir, ["--mode", "full", ...line]).status, EXIT.continue);
    assert.deepEqual(
      calls(dir).map((c) => c.id),
      ["test", "test"],
      "restarted from the first gate"
    );
  });
});

test("UNUSABLE (exit 2) — usage, and a symlinked or dangling .pharn/pharn-build (L54); never a crash code", () => {
  withProject({}, (dir) => {
    for (const args of [
      ["--mode", "full"], // no --timeout-ms (no default, L41)
      ["--mode", "fast", "--timeout-ms", "60000"],
      ["--mode", "full", "--timeout-ms", "60000", "--extra", "x"],
      ["--mode", "full", "--timeout-ms", "60000", "--budget-ms", "100"],
    ]) {
      const r = gate(dir, args);
      assert.equal(r.status, EXIT.unusable, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout, /^UNUSABLE — usage-error/);
    }
    const bad = spawnSync(process.execPath, [CLI, "--feature", "../x", "--mode", "full", "--timeout-ms", "60000"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(bad.status, EXIT.unusable);
    mkdirSync(join(dir, ".pharn"), { recursive: true });
    const elsewhere = mkdtempSync(join(tmpdir(), "bg-else-"));
    try {
      symlinkSync(elsewhere, join(dir, ".pharn", "pharn-build"));
      const r = full(dir);
      assert.equal(r.status, EXIT.unusable, r.stdout);
      assert.match(r.stdout, /path-containment: .*symlink/);
      rmSync(join(dir, ".pharn", "pharn-build"));
      symlinkSync(join(dir, "nowhere"), join(dir, ".pharn", "pharn-build"));
      const d = full(dir);
      assert.equal(d.status, EXIT.unusable, d.stdout);
      assert.deepEqual(calls(dir), [], "nothing ran");
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });
});

// ── ★ WIRING (L45): /pharn-build Step 4's COMMITTED lines, each as its own shell (L44) ─────────────────────────

const PHARN_BUILD_CMD = join(HERE, "..", "..", ".claude", "commands", "pharn-build.md");
const fencedLines = () =>
  [...readFileSync(PHARN_BUILD_CMD, "utf8").matchAll(/```bash\n([\s\S]*?)```/g)].flatMap((m) =>
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
const sh = (dir, line) => spawnSync("sh", ["-c", line.replaceAll("<name>", "demo")], { cwd: dir, encoding: "utf8" });

test("★ WIRING — /pharn-build's pinned targeted and full lines run, GREEN and RED, recording under .pharn/pharn-build/<name>/", () => {
  const lines = {
    targeted: pinnedLine(/build-gate\.mjs --feature <name> --mode targeted /),
    full: pinnedLine(/build-gate\.mjs --feature <name> --mode full /),
  };
  for (const l of Object.values(lines)) {
    const m = l.match(/--timeout-ms (\d+) --budget-ms (\d+)$/);
    assert.ok(m, `${l} pins both values`);
    assert.ok(Number(m[1]) < Number(m[2]) && Number(m[2]) < 600000, "N < B < the Bash tool's 600000");
  }
  withProject({}, (dir) => {
    mkdirSync(join(dir, "pharn"), { recursive: true });
    execFileSync("cp", ["-R", HERE, join(dir, "pharn", "floor")]);
    const t = sh(dir, lines.targeted);
    assert.equal(t.status, EXIT.green, `${lines.targeted}\n${t.stdout}${t.stderr}`);
    assert.ok(existsSync(join(dir, OUT_TARGETED, "stamp.json")));
    const f = sh(dir, lines.full);
    assert.equal(f.status, EXIT.green, `${lines.full}\n${f.stdout}${f.stderr}`);
    assert.ok(existsSync(join(dir, OUT_FULL, "stamp.json")));
    setMode(dir, { exit: { lint: 1 } });
    assert.equal(sh(dir, lines.full).status, EXIT.red);
    // CONTROL (L60): the line with a pinned flag removed is refused, so the pin is what the test exercises.
    const cut = lines.full.replace(/ --timeout-ms \d+/, "");
    assert.equal(sh(dir, cut).status, EXIT.unusable);
  });
});
