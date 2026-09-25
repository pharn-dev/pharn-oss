// pharn/floor/check-red-run.test.mjs — the red run's suite: red-run-core.mjs (preflight, binding, verdict) in
// process, and check-red-run.mjs + run-gates.mjs `--stage ac-test` + ac-tests-lock.mjs `--record-red-run` end to end.
//
// The verdict's evidence is a REAL vitest 5.0.1 report (test-fixtures/test-results/vitest-red.json, captured from a
// run over three files, paths sanitized to /work/proj — L4/L55: the model of "not collected" was measured, not
// authored): `demo.unit.test.js` holds `AC-1:` (awaits a missing module INSIDE the test → collected, failed), `AC-2:`
// (passes) and `AC-3:` (skipped); `demo.static.test.js` imports the missing module at the TOP → a file-level failure
// with no assertion results; `other.unit.test.js` is ANOTHER feature's file with its own passing `AC-1:`.
// Each reason has one mutation of a GREEN world that trips it and no other (L34/L52); the last tests close
// RED_RUN_REASONS both ways (L36).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resultsFileName } from "./gate-run-core.mjs";
import { CONFIG_FILE, CONFIG_KEY } from "./test-results-core.mjs";
import { OWN_REASONS, RED_RUN_REASONS, bindStamp, blockedLine, evaluateRedRun, observeAc, preflight, verdict } from "./red-run-core.mjs";
import { ALGO, fingerprint } from "./worktree-fingerprint.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "check-red-run.mjs");
const RUN_GATES = join(HERE, "run-gates.mjs");
const LOCK = join(HERE, "ac-tests-lock.mjs");
const FIXTURE = readFileSync(join(HERE, "test-fixtures", "test-results", "vitest-red.json"), "utf8");
const A = "a".repeat(64);
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const UNIT = "tests/ac/demo.unit.test.js";
const STATIC = "tests/ac/demo.static.test.js";
const OTHER = "tests/ac/other.unit.test.js";
const REACHED = new Set();

/** The captured report, its /work/proj prefix rewritten to `root` (what the reporter would have printed there). */
const reportFor = (root) => FIXTURE.replaceAll("/work/proj", root);

/** A finished ac-test stamp over `gates` ({id, files, results?: bytes|null}); results files land in `outDir`. */
function makeStamp(outDir, gates, { feature = "demo" } = {}) {
  const runs = gates.map((g, seq) => {
    let results_sha256 = null;
    if (g.results != null) {
      writeFileSync(join(outDir, resultsFileName(seq, g.id)), g.results);
      results_sha256 = sha256(Buffer.from(g.results));
    }
    return {
      seq,
      id: g.id,
      shell: null,
      argv: ["npm", "run", g.id],
      files: g.files,
      exit: 1,
      ran: true,
      timed_out: false,
      mutated: false,
      reason: null,
      fp_before: A,
      fp_after: A,
      stdout_sha256: A,
      stderr_sha256: A,
      results_sha256,
    };
  });
  return {
    schema: "gate-run-record/1",
    stage: "ac-test",
    side: null,
    feature,
    head: null,
    source: "discover",
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: "x", init: A, final: A },
    required: gates.map((g) => g.id),
    runs,
    aux: { completeness: null },
  };
}

/** A scratch root with pharn.config.json (`config` object, or null for none) and `<out>`. */
function scratch(config = { [CONFIG_KEY]: { test: "vitest-json" } }) {
  const root = mkdtempSync(join(tmpdir(), "rrc-"));
  if (config !== null) writeFileSync(join(root, CONFIG_FILE), JSON.stringify(config));
  const outDir = join(root, ".pharn", "pharn-test", "gates");
  mkdirSync(outDir, { recursive: true });
  return { root, outDir, done: () => rmSync(root, { recursive: true, force: true }) };
}

/** The verdict for `rows` over one `test` gate carrying the captured report (unless `gates` overrides). */
function verdictOf(rows, { config, gates } = {}) {
  const s = scratch(config);
  try {
    const g = gates ?? [{ id: "test", files: [...new Set(rows.map((r) => r.file))].sort(), results: reportFor(s.root) }];
    return verdict({ rows, stamp: makeStamp(s.outDir, typeof g === "function" ? g(s.root) : g), outDir: s.outDir, root: s.root });
  } finally {
    s.done();
  }
}
const row = (id, file, level = "unit") => ({ id, level, file });

/** Assert exactly one AC, RED with `reason` (and mark it reached). */
function onlyReason(v, reason) {
  assert.equal(v.green, false, JSON.stringify(v.acs));
  assert.deepEqual(
    v.acs.map((a) => a.reason),
    [reason],
    JSON.stringify(v.acs)
  );
  REACHED.add(reason);
}

// ── the verdict over the REAL capture ───────────────────────────────────────────────────────────────────────

test("GREEN — AC-1's dynamic-import test is collected and failed: the convention works on a real vitest run", () => {
  const v = verdictOf([row("AC-1", UNIT)]);
  assert.equal(v.green, true, JSON.stringify(v.acs));
  assert.equal(v.acs[0].reason, null);
  assert.deepEqual(v.acs[0].tests, [`${UNIT}::reset › AC-1: resets the password`]);
  assert.equal(v.gates.length, 1);
  assert.match(v.gates[0].results_sha256, /^[0-9a-f]{64}$/);
});

test("another feature's passing `AC-1:` in the same suite is IGNORED — the match is by mapped file, never suite-wide", () => {
  // control: the same id mapped to the OTHER file is a pass-before-build, so the GREEN above is not vacuous
  onlyReason(verdictOf([row("AC-1", OTHER)]), "ac-test-passes-before-build");
  assert.equal(verdictOf([row("AC-1", UNIT)]).green, true);
});

test("ac-test-not-collected — the SAME test with a TOP-LEVEL import fails to load: a suite error, no assertion", () => {
  onlyReason(verdictOf([row("AC-1", STATIC)]), "ac-test-not-collected");
});

test("ac-test-not-collected — a title that does not start `AC-<n>:`, and an id that is only a prefix (AC-1 vs AC-10)", () => {
  onlyReason(verdictOf([row("AC-4", UNIT)]), "ac-test-not-collected");
  const s = scratch();
  try {
    const doc = JSON.stringify({
      testResults: [
        {
          name: join(s.root, UNIT),
          status: "failed",
          assertionResults: [{ ancestorTitles: [], title: "AC-10: other", status: "failed", fullName: "AC-10: other" }],
        },
      ],
    });
    const v = verdict({
      rows: [row("AC-1", UNIT)],
      stamp: makeStamp(s.outDir, [{ id: "test", files: [UNIT], results: doc }]),
      outDir: s.outDir,
      root: s.root,
    });
    onlyReason(v, "ac-test-not-collected");
  } finally {
    s.done();
  }
});

test("ac-test-not-collected — a case variant of the mapped path does not match (exact, fail-closed — grill G13)", () => {
  onlyReason(verdictOf([row("AC-1", "tests/ac/Demo.unit.test.js")]), "ac-test-not-collected");
});

test("ac-test-passes-before-build — AC-2's test passes against the tree the build has not touched", () => {
  onlyReason(verdictOf([row("AC-2", UNIT)]), "ac-test-passes-before-build");
});

test("ac-test-skipped — AC-3's test is skipped", () => {
  onlyReason(verdictOf([row("AC-3", UNIT)]), "ac-test-skipped");
});

test("not-configured — no per-test results configured is a RED here, by item 01's own name", () => {
  onlyReason(verdictOf([row("AC-1", UNIT)], { config: null }), "not-configured");
});

test("results-unavailable — the gate wrote no results file", () => {
  onlyReason(verdictOf([row("AC-1", UNIT)], { gates: [{ id: "test", files: [UNIT], results: null }] }), "results-unavailable");
});

test("ac-level-unavailable — the run has no gate for the AC's level (an e2e AC, a stamp with only `test`)", () => {
  const v = verdictOf([row("AC-1", UNIT), row("AC-2", "tests/e2e/x.spec.js", "e2e")], {
    gates: (root) => [{ id: "test", files: [UNIT], results: reportFor(root) }],
  });
  assert.deepEqual(
    v.acs.map((a) => a.reason),
    [null, "ac-level-unavailable"]
  );
  REACHED.add("ac-level-unavailable");
});

test("e2e: matches UNION across both e2e gates, and EVERY gate's record must be available (grill concern 4)", () => {
  const E2E = "tests/e2e/reset.spec.js";
  const cfg = { [CONFIG_KEY]: { "test:e2e": "vitest-json", e2e: "vitest-json" } };
  const doc = (root, status) =>
    JSON.stringify({
      testResults: [
        {
          name: join(root, E2E),
          status,
          assertionResults: [{ ancestorTitles: [], title: "AC-1: resets", status, fullName: "AC-1: resets" }],
        },
      ],
    });
  const both = verdictOf([row("AC-1", E2E, "e2e")], {
    config: cfg,
    gates: (root) => [
      { id: "test:e2e", files: [E2E], results: doc(root, "failed") },
      { id: "e2e", files: [E2E], results: doc(root, "failed") },
    ],
  });
  assert.equal(both.green, true, JSON.stringify(both.acs));
  assert.deepEqual(
    both.gates.map((g) => g.gate),
    ["e2e", "test:e2e"]
  );
  // REVIEW finding 1: the SAME test id reported by both gates. Every observation counts, in EITHER gate order — a
  // later `failed` must never overwrite an earlier `passed` or `skipped`.
  for (const [first, second, reason] of [
    ["failed", "passed", "ac-test-passes-before-build"],
    ["passed", "failed", "ac-test-passes-before-build"],
    ["skipped", "failed", "ac-test-skipped"],
    ["failed", "skipped", "ac-test-skipped"],
  ]) {
    const v = verdictOf([row("AC-1", E2E, "e2e")], {
      config: cfg,
      gates: (root) => [
        { id: "test:e2e", files: [E2E], results: doc(root, first) },
        { id: "e2e", files: [E2E], results: doc(root, second) },
      ],
    });
    onlyReason(v, reason);
    assert.deepEqual(v.acs[0].tests, [`${E2E}::AC-1: resets`], "the matched id is listed once");
  }
  const oneMissing = verdictOf([row("AC-1", E2E, "e2e")], {
    config: cfg,
    gates: (root) => [
      { id: "test:e2e", files: [E2E], results: doc(root, "failed") },
      { id: "e2e", files: [E2E], results: null },
    ],
  });
  onlyReason(oneMissing, "results-unavailable");
});

// ── preflight ───────────────────────────────────────────────────────────────────────────────────────────────

test("preflight: GREEN when every level has a discovered gate with results configured; the gates it will run", () => {
  const s = scratch({ [CONFIG_KEY]: { test: "vitest-json", "test:e2e": "playwright-json" } });
  try {
    const p = preflight({
      rows: [row("AC-1", UNIT), row("AC-2", "tests/ac/i.test.js", "integration"), row("AC-3", "tests/e2e/x.spec.js", "e2e")],
      scripts: { test: "vitest run", "test:e2e": "playwright test", lint: "eslint ." },
      root: s.root,
    });
    assert.deepEqual(p.unavailable, []);
    assert.deepEqual(p.gates, ["test", "test:e2e"]);
  } finally {
    s.done();
  }
});

test("preflight: ac-level-unavailable for a missing script, a missing format, and one of two e2e gates unconfigured", () => {
  const s = scratch({ [CONFIG_KEY]: { "test:e2e": "playwright-json" } });
  try {
    const rows = [row("AC-1", UNIT), row("AC-2", "tests/e2e/x.spec.js", "e2e")];
    const noScript = preflight({ rows, scripts: { "test:e2e": "x" }, root: s.root });
    assert.deepEqual(
      noScript.unavailable.map((u) => [u.id, u.level]),
      [["AC-1", "unit"]]
    );
    assert.match(noScript.unavailable[0].why, /no `test` script/);
    const noFormat = preflight({ rows, scripts: { test: "x", "test:e2e": "x" }, root: s.root });
    assert.deepEqual(
      noFormat.unavailable.map((u) => u.id),
      ["AC-1"]
    );
    assert.match(noFormat.unavailable[0].why, /no per-test results for `test` \(not-configured\)/);
    const half = preflight({ rows, scripts: { test: "x", "test:e2e": "x", e2e: "x" }, root: s.root });
    assert.deepEqual(
      half.unavailable.map((u) => u.id),
      ["AC-1", "AC-2"],
      "e2e is discovered but unconfigured, so AC-2 is unavailable too"
    );
    assert.match(half.unavailable[1].why, /`e2e`/);
    const none = preflight({ rows, scripts: null, root: s.root });
    assert.equal(none.unavailable.length, 2, "no package.json scripts at all");
  } finally {
    s.done();
  }
});

test("blockedLine is the brief's closed line, built from ids and levels only", () => {
  assert.equal(
    blockedLine([
      { id: "AC-1", level: "unit" },
      { id: "AC-3", level: "e2e" },
      { id: "AC-4", level: "unit" },
    ]),
    'blocked: no-test-runner — AC-1 (unit), AC-3 (e2e), AC-4 (unit); suggested: /pharn-ship "set up a test runner for e2e and unit with per-test results (spec_kind: test-infra)"'
  );
});

// ── the binding (grill G1), over a hand-built stamp (the fingerprint half runs in the end-to-end test) ──────────

test("bindStamp refuses a gate not discovered, a swapped command, and a gate set the live package.json no longer resolves (REVIEW finding 6)", () => {
  const s = scratch();
  try {
    const rows = [row("AC-1", UNIT), row("AC-2", "tests/e2e/x.spec.js", "e2e")];
    writeFileSync(join(s.root, "package.json"), JSON.stringify({ scripts: { test: "x", "test:e2e": "x", e2e: "x" } }));
    const stamp = makeStamp(s.outDir, [
      { id: "test", files: [UNIT], results: null },
      { id: "test:e2e", files: ["tests/e2e/x.spec.js"], results: null },
      { id: "e2e", files: ["tests/e2e/x.spec.js"], results: null },
    ]);
    // control: everything matches except the fingerprint (a hand-built stamp over a non-git scratch dir)
    const control = bindStamp({ stamp, rows, feature: "demo", root: s.root });
    assert.match(control.reason, /cannot fingerprint|tree changed/, "control reaches the fingerprint step");
    for (const [why, st, re] of [
      ["explicit --gates", { ...stamp, source: "explicit" }, /not discovered/],
      [
        "a swapped command",
        { ...stamp, runs: stamp.runs.map((r, i) => (i === 0 ? { ...r, argv: ["sh", "-c", "fake"] } : r)) },
        /a command or the gate set differs/,
      ],
      [
        "a shell entry",
        { ...stamp, runs: stamp.runs.map((r, i) => (i === 0 ? { ...r, shell: "npm test" } : r)) },
        /a command or the gate set differs/,
      ],
      [
        "one e2e gate dropped (an init over another manifest)",
        { ...stamp, required: ["test", "test:e2e"], runs: stamp.runs.slice(0, 2) },
        /a command or the gate set differs/,
      ],
    ]) {
      const b = bindStamp({ stamp: st, rows, feature: "demo", root: s.root });
      assert.equal(b.ok, false, why);
      assert.match(b.reason, re, why);
    }
    rmSync(join(s.root, "package.json"));
    assert.match(bindStamp({ stamp, rows, feature: "demo", root: s.root }).reason, /cannot read .*package\.json/);
    writeFileSync(join(s.root, "package.json"), JSON.stringify({ scripts: { test: "x" } }));
    assert.match(bindStamp({ stamp, rows, feature: "demo", root: s.root }).reason, /no longer resolves/);
  } finally {
    s.done();
  }
});

test("bindStamp refuses a stamp of another stage or feature, a gate no level needs, and files other than the mapping's", () => {
  const s = scratch();
  try {
    const rows = [row("AC-1", UNIT)];
    const stamp = makeStamp(s.outDir, [{ id: "test", files: [UNIT], results: null }]);
    for (const [why, st, re] of [
      ["verify stage", { ...stamp, stage: "verify" }, /stage-mismatch/],
      ["another feature", { ...stamp, feature: "other" }, /feature-mismatch/],
      ["files differ", { ...stamp, runs: [{ ...stamp.runs[0], files: [UNIT, STATIC] }] }, /ran files other than the mapping's/],
      ["a gate no level needs", makeStamp(s.outDir, [{ id: "test:e2e", files: [UNIT], results: null }]), /which no mapped level needs/],
    ]) {
      const b = bindStamp({ stamp: st, rows, feature: "demo", root: s.root });
      assert.equal(b.ok, false, why);
      assert.match(b.reason, re, why);
    }
  } finally {
    s.done();
  }
});

// ── end to end: run-gates --stage ac-test → check-red-run --verdict → ac-tests-lock --record-red-run ─────────

const MAPPING = (rows) =>
  [
    "---",
    "spec_id: demo",
    `spec_content_hash: ${A}`,
    "---",
    "",
    "## Files",
    "",
    ...[...new Set(rows.map((r) => r[2]))].map((f) => `- \`${f}\` — t`),
    "",
    "## Mapping",
    "",
    ...rows.map(([id, level, file]) => `- ${id} | ${level} | \`${file}\` | t`),
    "",
  ].join("\n");

/** A git repo whose `test` script writes the captured report (rewritten to its root) to $PHARN_TEST_RESULTS and exits 1,
 *  as a real vitest run over not-yet-built code does. */
function project(rows) {
  const dir = mkdtempSync(join(tmpdir(), "rr-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  mkdirSync(join(dir, "tests", "ac"), { recursive: true });
  for (const f of [UNIT, STATIC, OTHER]) writeFileSync(join(dir, f), `// ${f}\n`);
  writeFileSync(join(dir, "fixture.json"), FIXTURE);
  writeFileSync(
    join(dir, "runner.cjs"),
    [
      'const fs = require("fs");',
      'const doc = fs.readFileSync(__dirname + "/fixture.json", "utf8").split("/work/proj").join(process.cwd());',
      "fs.writeFileSync(process.env.PHARN_TEST_RESULTS, doc);",
      'fs.writeFileSync(".pharn/argv.json", JSON.stringify(process.argv.slice(2)));',
      "process.exit(1);",
      "",
    ].join("\n")
  );
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "p", scripts: { test: "node runner.cjs", lint: "node -e 0" } }));
  writeFileSync(join(dir, CONFIG_FILE), JSON.stringify({ [CONFIG_KEY]: { test: "vitest-json" } }));
  mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
  writeFileSync(join(dir, "pharn", "features", "demo", "AC-TESTS.md"), MAPPING(rows));
  git("add", "-A");
  git("commit", "-qm", "init");
  return dir;
}
const node = (dir, script, args) => spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: "utf8" });
const OUT = ".pharn/pharn-test/gates";
const AC = "pharn/features/demo/AC-TESTS.md";

/** The pinned order: --write the lock, init, drain, then the verdict. Returns the verdict's result. */
function redRun(dir) {
  assert.equal(node(dir, LOCK, ["--write", "demo"]).status, 0, "--write");
  const init = node(dir, RUN_GATES, [
    "init",
    "--stage",
    "ac-test",
    "--feature",
    "demo",
    "--out",
    OUT,
    "--discover",
    "package.json",
    "--ac-tests",
    AC,
  ]);
  assert.equal(init.status, 0, init.stdout);
  for (let i = 0; i < 5; i++) {
    const r = node(dir, RUN_GATES, ["run", "--next", "--out", OUT, "--timeout-ms", "60000"]);
    if (r.status === 3) break;
    assert.equal(r.status, 0, r.stdout);
  }
  return node(dir, CLI, ["--verdict", "--ac-tests", AC, "--out", OUT, "--root", "."]);
}

test("END TO END: a GREEN red run is recorded in the lock, bound to its files; --check --require-red-run is GREEN", () => {
  const dir = project([["AC-1", "unit", UNIT]]);
  try {
    const pre = node(dir, CLI, ["--preflight", "--ac-tests", AC, "--discover", "package.json", "--root", "."]);
    assert.equal(pre.status, 0, pre.stdout);
    const v = redRun(dir);
    assert.equal(v.status, 0, v.stdout);
    assert.match(v.stdout, /RED-AS-REQUIRED — AC-1 \(unit\)/);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, ".pharn/argv.json"), "utf8")), [UNIT], "the test gate got exactly the mapped file");
    const stamp = JSON.parse(readFileSync(join(dir, OUT, "stamp.json"), "utf8"));
    assert.deepEqual(stamp.required, ["test"], "lint is discovered but no level needs it");
    const before = node(dir, LOCK, ["--check", "demo", "--require-red-run"]);
    assert.equal(before.status, 1, "no red run recorded yet");
    assert.match(before.stdout, /no red_run is recorded/);
    const rec = node(dir, LOCK, ["--record-red-run", "demo", "--out", OUT]);
    assert.equal(rec.status, 0, rec.stdout);
    const lock = JSON.parse(readFileSync(join(dir, "pharn/features/demo/AC-TESTS.lock.json"), "utf8"));
    assert.equal(lock.red_run.stamp_sha256, sha256(readFileSync(join(dir, OUT, "stamp.json"))));
    assert.deepEqual(lock.red_run.acs, [{ id: "AC-1", tests: [`${UNIT}::reset › AC-1: resets the password`] }]);
    assert.deepEqual(
      lock.red_run.gates.map((g) => g.gate),
      ["test"]
    );
    const after = node(dir, LOCK, ["--check", "demo", "--require-red-run"]);
    assert.equal(after.status, 0, after.stdout);
    assert.match(after.stdout, /red_run recorded for 1 AC/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("END TO END: the verdict REDs (and nothing is recorded) for a static-import AC and a passing one", () => {
  const dir = project([
    ["AC-1", "unit", STATIC],
    ["AC-2", "unit", UNIT],
  ]);
  try {
    const v = redRun(dir);
    assert.equal(v.status, 1, v.stdout);
    assert.match(v.stdout, /RED — ac-test-not-collected: AC-1/);
    assert.match(v.stdout, /RED — ac-test-passes-before-build: AC-2/);
    const rec = node(dir, LOCK, ["--record-red-run", "demo", "--out", OUT]);
    assert.equal(rec.status, 1, rec.stdout);
    assert.match(rec.stdout, /nothing recorded/);
    assert.equal(JSON.parse(readFileSync(join(dir, "pharn/features/demo/AC-TESTS.lock.json"), "utf8")).red_run, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("END TO END (grill G1): a test edited after the run → the binding refuses; a lock rewritten after the run → refused", () => {
  const dir = project([["AC-1", "unit", UNIT]]);
  try {
    assert.equal(redRun(dir).status, 0);
    writeFileSync(join(dir, UNIT), "// v2 — rewritten after the red run\n");
    const v = node(dir, CLI, ["--verdict", "--ac-tests", AC, "--out", OUT, "--root", "."]);
    assert.equal(v.status, 2, v.stdout);
    assert.match(v.stdout, /the tree changed since the red run/);
    // the rewrite path the grill named: tests v2, then --write, then --record-red-run over v1's stamp
    assert.equal(node(dir, LOCK, ["--write", "demo"]).status, 0);
    const rec = node(dir, LOCK, ["--record-red-run", "demo", "--out", OUT]);
    assert.equal(rec.status, 2, rec.stdout);
    assert.match(rec.stdout, /the tree changed since the red run/);
    const ev = evaluateRedRun({ acTestsPath: join(dir, AC), outDir: join(dir, OUT), root: dir });
    assert.equal(ev.ok, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("END TO END: preflight with no runner prints the blocked line LAST; the runner refuses the uncovered level too", () => {
  const dir = project([["AC-1", "e2e", UNIT]]);
  try {
    const pre = node(dir, CLI, ["--preflight", "--ac-tests", AC, "--discover", "package.json", "--root", "."]);
    assert.equal(pre.status, 1, pre.stdout);
    const lines = pre.stdout.trim().split("\n");
    assert.match(lines[0], /^RED — ac-level-unavailable: AC-1 \(e2e\) — package\.json has no `test:e2e` or `e2e` script$/);
    assert.equal(lines.at(-1), blockedLine([{ id: "AC-1", level: "e2e" }]));
    const init = node(dir, RUN_GATES, [
      "init",
      "--stage",
      "ac-test",
      "--feature",
      "demo",
      "--out",
      OUT,
      "--discover",
      "package.json",
      "--ac-tests",
      AC,
    ]);
    assert.equal(init.status, 2, init.stdout);
    assert.equal(JSON.parse(init.stdout).reason_code, "coverage-violation");
    // no package.json at all is the no-runner case, not an unusable input
    const none = node(dir, CLI, ["--preflight", "--ac-tests", AC, "--discover", "nope.json", "--root", "."]);
    assert.equal(none.status, 1, none.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the CLI's unusable inputs are exit 2: bad usage, a malformed mapping, a bad package.json, no finished stamp", () => {
  const dir = project([["AC-1", "unit", UNIT]]);
  try {
    assert.equal(node(dir, CLI, []).status, 2);
    assert.equal(node(dir, CLI, ["--preflight", "--ac-tests", AC]).status, 2, "missing --discover/--root");
    assert.equal(node(dir, CLI, ["--verdict", "--ac-tests", AC, "--root", "."]).status, 2, "missing --out");
    const noStamp = node(dir, CLI, ["--verdict", "--ac-tests", AC, "--out", OUT, "--root", "."]);
    assert.equal(noStamp.status, 2);
    assert.match(noStamp.stdout, /did not finish/);
    mkdirSync(join(dir, OUT), { recursive: true });
    writeFileSync(join(dir, OUT, "stamp.json"), "{not json");
    assert.match(node(dir, CLI, ["--verdict", "--ac-tests", AC, "--out", OUT, "--root", "."]).stdout, /not JSON/);
    writeFileSync(join(dir, "bad.json"), "{");
    assert.equal(node(dir, CLI, ["--preflight", "--ac-tests", AC, "--discover", "bad.json", "--root", "."]).status, 2);
    mkdirSync(join(dir, "dirpkg"));
    assert.equal(
      node(dir, CLI, ["--preflight", "--ac-tests", AC, "--discover", "dirpkg", "--root", "."]).status,
      2,
      "an unreadable manifest"
    );
    writeFileSync(join(dir, AC), "## Mapping\n\n- nonsense\n");
    assert.equal(node(dir, CLI, ["--preflight", "--ac-tests", AC, "--discover", "package.json", "--root", "."]).status, 2);
    assert.equal(node(dir, CLI, ["--preflight", "--ac-tests", "missing.md", "--discover", "package.json", "--root", "."]).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── ★ WIRING (L45): /pharn-test's COMMITTED lines, executed in order ───────────────────────────────────────

const PHARN_TEST_CMD = join(HERE, "..", "..", ".claude", "commands", "pharn-test.md");
/** Every line inside a ```bash fence of the command, as written (indentation stripped). */
const fencedLines = () =>
  [...readFileSync(PHARN_TEST_CMD, "utf8").matchAll(/```bash\n([\s\S]*?)```/g)].flatMap((m) =>
    m[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
  );
/** The one pinned line matching `re` — exactly one, so a second, divergent copy cannot hide. */
function pinnedLine(re) {
  const hits = fencedLines().filter((l) => re.test(l));
  assert.equal(hits.length, 1, `expected exactly one pinned line matching ${re}, found ${JSON.stringify(hits)}`);
  return hits[0];
}
const sh = (dir, line) => spawnSync("sh", ["-c", line.replaceAll("<name>", "demo")], { cwd: dir, encoding: "utf8" });

test("★ WIRING — /pharn-test's pinned mode, preflight, lock, red-run, verdict and record lines run GREEN, in order", () => {
  const lines = {
    preflight: pinnedLine(/check-red-run\.mjs --preflight/),
    write: pinnedLine(/ac-tests-lock\.mjs --write <name>$/),
    check: pinnedLine(/ac-tests-lock\.mjs --check <name>$/),
    init: pinnedLine(/run-gates\.mjs init --stage ac-test/),
    drain: pinnedLine(/run-gates\.mjs run --next --out \.pharn\/pharn-test\/gates/),
    verdict: pinnedLine(/check-red-run\.mjs --verdict/),
    record: pinnedLine(/ac-tests-lock\.mjs --record-red-run/),
    requireRed: pinnedLine(/ac-tests-lock\.mjs --check <name> --require-red-run$/),
  };
  // REVIEW finding 10: "in order" is checked, not asserted — the lines appear in the document in the order they run.
  const at = Object.values(lines).map((l) => fencedLines().indexOf(l));
  assert.deepEqual(
    at,
    [...at].sort((a, b) => a - b),
    `the pinned lines are out of order: ${JSON.stringify(Object.keys(lines))} at ${at}`
  );
  const dir = project([["AC-1", "unit", UNIT]]);
  try {
    // the floor copy the pinned lines name, at the path they name it
    mkdirSync(join(dir, "pharn"), { recursive: true });
    execFileSync("cp", ["-R", HERE, join(dir, "pharn", "floor")]);
    for (const k of ["preflight", "write", "check", "init"]) {
      const r = sh(dir, lines[k]);
      assert.equal(r.status, 0, `${k}: ${lines[k]}\n${r.stdout}${r.stderr}`);
    }
    for (let i = 0; i < 5; i++) {
      const r = sh(dir, lines.drain);
      if (r.status === 3) break;
      assert.equal(r.status, 0, `drain: ${r.stdout}`);
    }
    for (const k of ["verdict", "record", "requireRed"]) {
      const r = sh(dir, lines[k]);
      assert.equal(r.status, 0, `${k}: ${lines[k]}\n${r.stdout}${r.stderr}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ WIRING — /pharn-test's pinned bootstrap lines: --spec exits 4; approval, --write-bootstrap and --check --allow-bootstrap run GREEN", () => {
  const specLine = pinnedLine(/check-ac-tests\.mjs --spec/);
  const approved = fencedLines().filter((l) => /check-spec-approved\.mjs pharn\/features\/<name>\/SPEC\.md$/.test(l));
  assert.equal(approved.length, 2, "Step 2 and Step B each pin the approval gate");
  const boot = pinnedLine(/ac-tests-lock\.mjs --write-bootstrap/);
  const checkBoot = pinnedLine(/ac-tests-lock\.mjs --check <name> --require-red-run --allow-bootstrap$/);
  const order = [approved[1], boot, checkBoot].map((l) => fencedLines().lastIndexOf(l));
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
    "Step B's lines are out of order"
  );
  const dir = mkdtempSync(join(tmpdir(), "rrb-"));
  try {
    mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
    execFileSync("cp", ["-R", HERE, join(dir, "pharn", "floor")]);
    execFileSync("cp", ["-R", join(HERE, "..", "pharn-contracts"), join(dir, "pharn", "pharn-contracts")]);
    const CHECK_SPEC = join(HERE, "check-spec.mjs");
    const ref = spawnSync(process.execPath, [CHECK_SPEC, "--template-ref", "pharn-default"], { encoding: "utf8" }).stdout.trim();
    // A REAL Approved test-infra SPEC: the shipped template filled, the pin computed by check-spec --hash (it covers
    // the spec_kind line), because --write-bootstrap re-runs check-spec-approved itself.
    const template = readFileSync(join(HERE, "..", "pharn-contracts", "templates", "spec-template.md"), "utf8");
    const draft = template
      .replace(/<!--\s*pharn:guidance[\s\S]*?-->\n?/g, "")
      .replace("spec_id: <name>", "spec_id: demo\nspec_kind: test-infra")
      .replace("<the line check-spec.mjs --resolve-template-ref prints>", ref)
      .replace("<unit | integration | e2e>", "unit")
      .replace(/<[^>\n]+>/g, "filled");
    const specPath = join(dir, "pharn", "features", "demo", "SPEC.md");
    writeFileSync(specPath, draft);
    const hash = spawnSync(process.execPath, [CHECK_SPEC, "--hash", specPath], { encoding: "utf8" }).stdout.trim();
    writeFileSync(
      specPath,
      draft.replace("state: Draft", "state: Approved").replace('spec_content_hash: ""', `spec_content_hash: ${hash}`)
    );
    const m = sh(dir, specLine);
    assert.equal(m.status, 4, m.stdout);
    for (const [k, line] of [
      ["approval", approved[1]],
      ["write-bootstrap", boot],
      ["check --require-red-run --allow-bootstrap", checkBoot],
    ]) {
      const r = sh(dir, line);
      assert.equal(r.status, 0, `${k}: ${line}\n${r.stdout}${r.stderr}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── closure (L36) ───────────────────────────────────────────────────────────────────────────────────────────

test("✧ L36 CLOSURE — every reason literal red-run-core.mjs assigns is a RED_RUN_REASONS member; the set is sorted", () => {
  const src = readFileSync(join(HERE, "red-run-core.mjs"), "utf8");
  const assigned = [...src.matchAll(/ac\.reason = "([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(assigned.length >= 4, "the scan found the assignments");
  for (const r of assigned) assert.ok(RED_RUN_REASONS.includes(r), r);
  assert.deepEqual([...RED_RUN_REASONS], [...RED_RUN_REASONS].sort());
  assert.ok(OWN_REASONS.every((r) => RED_RUN_REASONS.includes(r)));
});

test("✧ L36 REVERSE CLOSURE — every OWN reason, and the two item-01 reasons the brief names, was reached here", () => {
  for (const r of [...OWN_REASONS, "not-configured", "results-unavailable"]) assert.ok(REACHED.has(r), `${r} was never reached`);
});

test("✧ L35 — observeAc is the ONE match rule (the red run and /pharn-verify's AC gate share it): file-scoped, leaf-title, every observation kept", () => {
  const rec = (tests) => ({ ok: true, tests });
  const t = (file, title, status, id = `${file}::${title}`) => ({ id, file, title, status });
  const records = {
    "test:e2e": rec([t(UNIT, "AC-1: a", "passed"), t(OTHER, "AC-1: a", "passed"), t(UNIT, "AC-10: x", "failed")]),
    e2e: rec([t(UNIT, "AC-1: a", "failed")]),
  };
  const obs = observeAc({ id: "AC-1", files: [UNIT], gateIds: ["test:e2e", "e2e"], recordOf: (g) => records[g] });
  assert.equal(obs.refused, null);
  assert.deepEqual(
    obs.observations.map((o) => [o.gate, o.status]),
    [
      ["test:e2e", "passed"],
      ["e2e", "failed"],
    ],
    "both gates' observations of the same id are kept; OTHER's and AC-10's are not AC-1's"
  );
  const refused = observeAc({
    id: "AC-1",
    files: [UNIT],
    gateIds: ["e2e"],
    recordOf: () => ({ ok: false, reason_code: "results-unavailable", reason: "r" }),
  });
  assert.deepEqual(refused, { refused: { gate: "e2e", reason_code: "results-unavailable", reason: "r" }, observations: [] });
});

// ── the fingerprint ALGO bump (6.20.8, .dev/features/reconcile-symlink-target/PLAN.md) ────────────────────────────
// ALGO is not part of the digest: an unchanged tree fingerprints to the SAME digest under /1 and /2. So a red run
// stamped before the bump is refused by the algo comparison, and the refusal must say so — "the tree changed" would be
// false. The control binds the identical stamp under the live ALGO, so the refusal is caused by the algo alone (L34).
test("bindStamp refuses a red run fingerprinted with a previous ALGO even when its digest equals the live tree's — naming both", () => {
  const s = scratch();
  try {
    execFileSync("git", ["init", "-q", "."], { cwd: s.root });
    writeFileSync(join(s.root, "package.json"), JSON.stringify({ scripts: { test: "x" } }));
    const rows = [row("AC-1", UNIT)];
    const fp = fingerprint(s.root, { feature: "demo" });
    assert.ok(fp.ok, fp.reason);
    const base = makeStamp(s.outDir, [{ id: "test", files: [UNIT], results: null }]);
    const at = (algo) => ({
      ...base,
      fingerprint: { algo, init: fp.digest, final: fp.digest },
      runs: base.runs.map((r) => ({ ...r, fp_before: fp.digest, fp_after: fp.digest })),
    });
    assert.deepEqual(bindStamp({ stamp: at(ALGO), rows, feature: "demo", root: s.root }), { ok: true }, "control: the live ALGO binds");
    const old = bindStamp({ stamp: at("worktree-fingerprint/1+sha256"), rows, feature: "demo", root: s.root });
    assert.equal(old.ok, false);
    assert.match(old.reason, /fingerprinted with worktree-fingerprint\/1\+sha256, the live tree with worktree-fingerprint\/2\+sha256/);
    assert.doesNotMatch(old.reason, /tree changed/, "the digests are equal — the tree did not change");
  } finally {
    s.done();
  }
});
