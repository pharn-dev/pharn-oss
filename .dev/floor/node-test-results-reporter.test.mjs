// .dev/floor/node-test-results-reporter.test.mjs — the node:test reporter /pharn-dev-regress runs the outside suite
// through, measured over REAL `node --test` runs (never a hand-built event stream), so a change in node's event shapes
// turns a test here red. Then its document through per-test-results-core.mjs's builder and through check-regress.mjs
// `verdict --per-test`, end to end, and the pinned command lines that wire it (L22, L45).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import pharnTestResults, { recordFile } from "./node-test-results-reporter.mjs";
import { parseResults } from "../../pharn/floor/per-test-results-formats.mjs";
import { buildRecord } from "../../pharn/floor/per-test-results-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REPORTER = join(HERE, "node-test-results-reporter.mjs");
const CHECK_REGRESS = join(ROOT, "pharn", "floor", "check-regress.mjs");
const COMMAND = join(ROOT, ".claude", "commands", "pharn-dev-regress.md");

// A NESTED `node --test` must not inherit this suite's coordination channel (stage-regress.test.mjs's CLEAN_ENV).
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

/** Writes `files` under a fresh dir and runs `node --test` over them there through the reporter. */
function runSuite(files, { dir = realpathSync(mkdtempSync(join(tmpdir(), "ntr-"))) } = {}) {
  for (const [p, src] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), src);
  }
  const out = join(dir, ".out", "tests.json");
  mkdirSync(dirname(out), { recursive: true });
  const r = spawnSync(
    process.execPath,
    ["--test", `--test-reporter=${REPORTER}`, `--test-reporter-destination=${out}`, ...Object.keys(files)],
    { cwd: dir, env: CLEAN_ENV, encoding: "utf8" }
  );
  return { dir, exit: r.status, bytes: readFileSync(out), doc: JSON.parse(readFileSync(out, "utf8")) };
}
const rows = (doc) => doc.tests.map((t) => `${t.status} ${t.file} ${t.path.join(" > ")}`);

const SHAPES = {
  "t/a.test.mjs": `import test, { describe, it, before } from "node:test";
describe("grp", () => {
  it("x", () => {});
  it("x2", () => { throw new Error("boom"); });
  describe("inner", () => { it("y", () => {}); });
});
test("top", () => {});
test("skipped", { skip: true }, () => {});
test("todo", { todo: true }, () => { throw new Error("a failing todo does not fail the run"); });
test("parent", async (t) => { await t.test("child", () => {}); });
test("dup", () => {});
test("dup", () => {});
describe("hooked", () => { before(() => { throw new Error("hook"); }); it("inner", () => {}); });
`,
  "t/b.test.mjs": "this is not javascript (\n",
  "t/c.test.mjs": `import test from "node:test";\ntest("before exit", () => {});\nsetTimeout(() => process.exit(3), 10);\n`,
};

test("★ every shape node reports becomes ONE plain entry: ancestry paths, skip/todo, hook-failed suites, a file that cannot load or exits non-zero, duplicates numbered", () => {
  const r = runSuite(SHAPES);
  try {
    assert.equal(r.exit, 1, "the suite is red");
    assert.equal(r.doc.schema, "pharn-test-results/1");
    assert.equal(r.doc.suite_errors, 0);
    assert.deepEqual(rows(r.doc), [
      "passed t/a.test.mjs grp > x",
      "failed t/a.test.mjs grp > x2",
      "passed t/a.test.mjs grp > inner > y",
      "passed t/a.test.mjs top",
      "skipped t/a.test.mjs skipped",
      "skipped t/a.test.mjs todo",
      "passed t/a.test.mjs parent > child",
      "passed t/a.test.mjs parent",
      "passed t/a.test.mjs dup",
      "passed t/a.test.mjs dup #2",
      "failed t/a.test.mjs hooked > inner",
      "failed t/a.test.mjs hooked",
      "failed t/b.test.mjs t/b.test.mjs",
      "passed t/c.test.mjs before exit",
      "failed t/c.test.mjs t/c.test.mjs",
    ]);
    // The list above is exact, so it also pins what is NOT an entry: `grp` (failed only through `subtestsFailed`) and
    // the passing suite `grp > inner` — while `hooked` (failed for its own hook) is one.
  } finally {
    rmSync(r.dir, { recursive: true, force: true });
  }
});

test("★ the document is a plain pharn-json record for the run's own exit — no anomaly, no exit contradiction", () => {
  for (const files of [SHAPES, { "t/ok.test.mjs": `import test from "node:test";\ntest("ok", () => {});\ntest("ok", () => {});\n` }]) {
    const r = runSuite(files);
    try {
      const parsed = parseResults("pharn-json", r.doc, []);
      assert.equal(parsed.ok, true, parsed.reason);
      const rec = buildRecord({ gate: "tests", format: "pharn-json", exit: r.exit, sha: "0".repeat(64), parsed });
      assert.equal(rec.ok, true, rec.reason);
      assert.deepEqual(rec.anomalies, [], "duplicates are numbered, so no duplicate-test-id anomaly");
      assert.equal(rec.counts.failed > 0, r.exit !== 0, "a red exit is always accounted for by a failed test");
    } finally {
      rmSync(r.dir, { recursive: true, force: true });
    }
  }
});

test("recordFile — relative to the cwd when under it (POSIX separators), the path as given otherwise", () => {
  assert.equal(recordFile("/r/p/t/a.test.mjs", "/r/p"), "t/a.test.mjs");
  assert.equal(recordFile("/r/q/a.test.mjs", "/r/p"), "/r/q/a.test.mjs");
  assert.equal(recordFile("/r/p", "/r/p"), "/r/p");
  assert.equal(recordFile("/r/p/..x/a.test.mjs", "/r/p"), "..x/a.test.mjs", "a name that starts with two dots is still under the cwd");
  assert.equal(recordFile("t/a.test.mjs", "/r/p"), "t/a.test.mjs");
  assert.equal(recordFile(undefined, "/r/p"), null);
  assert.equal(recordFile("", "/r/p"), null);
});

const SIDE = {
  "t/slow.test.mjs": `import test from "node:test";\ntest("slow", () => { throw new Error("red at both sides, as a load flake is"); });\n`,
};
const B_OK = `import test from "node:test";\ntest("b1", () => {});\n`;
const B_RED = `import test from "node:test";\ntest("b1", () => { throw new Error("a real regression"); });\n`;

test("★ END TO END — two real runs through the reporter: check-regress --per-test names the new failure a red base used to mask", () => {
  const base = runSuite({ ...SIDE, "t/b.test.mjs": B_OK });
  const head = runSuite({ ...SIDE, "t/b.test.mjs": B_RED });
  const tmp = mkdtempSync(join(tmpdir(), "ntr-e2e-"));
  try {
    assert.equal(base.exit, 1, "the base is red (the stand-in for load)");
    assert.equal(head.exit, 1);
    const p = (n) => join(tmp, n);
    writeFileSync(p("base.json"), JSON.stringify({ tests: base.exit }));
    writeFileSync(p("head.json"), JSON.stringify({ tests: head.exit }));
    writeFileSync(p("base-tests.json"), base.bytes);
    writeFileSync(p("head-tests.json"), head.bytes);
    const masked = spawnSync(process.execPath, [CHECK_REGRESS, "verdict", p("base.json"), p("head.json")], { encoding: "utf8" });
    assert.equal(JSON.parse(masked.stdout).verdict, "no-regressions", "CONTROL: one exit code per side masks it");
    const v = spawnSync(
      process.execPath,
      [
        CHECK_REGRESS,
        "verdict",
        p("base.json"),
        p("head.json"),
        "--per-test",
        "tests",
        "--base-tests",
        p("base-tests.json"),
        "--head-tests",
        p("head-tests.json"),
      ],
      { encoding: "utf8" }
    );
    assert.equal(v.status, 1, v.stdout);
    const o = JSON.parse(v.stdout);
    assert.equal(o.verdict, "regressions");
    assert.deepEqual(o.per_test.new_failures, [{ id: "t/b.test.mjs::b1", base: "passed" }]);
    assert.equal(o.per_test.still_failing, 1, "the shared red is still the base's");
  } finally {
    for (const d of [base.dir, head.dir, tmp]) rmSync(d, { recursive: true, force: true });
  }
});

// ── the WIRING in /pharn-dev-regress (L22: the lines are pinned, so a test can hold them) ────────────────────────────
test("★ WIRING — pharn-dev-regress.md pins the reporter capture line and the --per-test verdict line", () => {
  const text = readFileSync(COMMAND, "utf8");
  const capture = text.split("\n").filter((l) => l.includes("xargs node --test"));
  assert.ok(capture.length >= 1, "the pinned capture line is present");
  for (const l of capture.filter((x) => !/^\s*-/.test(x) && !x.includes("`"))) {
    assert.match(l, /--test-reporter=<working tree>\/\.dev\/floor\/node-test-results-reporter\.mjs /, l);
    assert.match(l, /--test-reporter-destination=<working tree>\/pharn\/\.run\/pharn-dev-regress\/<side>-tests\.json/, l);
  }
  assert.match(
    text,
    /--per-test tests --base-tests pharn\/\.run\/pharn-dev-regress\/base-tests\.json --head-tests pharn\/\.run\/pharn-dev-regress\/head-tests\.json/
  );
  assert.ok(text.includes("node-test-results-reporter.mjs"), "the command names the reporter");
});

/** The reporter's default export over a scripted event stream — the same function node calls, fed the event shapes
 *  measured above, so its own lines run in this process (a nested `node --test` is outside this run's coverage). */
async function report(events, cwd = "/r/p") {
  const before = process.cwd;
  process.cwd = () => cwd;
  try {
    let out = "";
    for await (const chunk of pharnTestResults(
      (async function* () {
        yield* events;
      })()
    ))
      out += chunk;
    return JSON.parse(out);
  } finally {
    process.cwd = before;
  }
}
const ev = (type, data) => ({ type, data });

test("the reporter function over a scripted stream: ancestry, statuses, suites, numbering, and a fileless failure", async () => {
  const f = "/r/p/t/a.test.mjs";
  const doc = await report([
    ev("test:start", { file: f, nesting: 0, name: "grp" }),
    ev("test:start", { file: f, nesting: 1, name: "x" }),
    ev("test:pass", { file: f, nesting: 1, name: "x", details: { type: "test" } }),
    ev("test:start", { file: f, nesting: 1, name: "x" }),
    ev("test:fail", { file: f, nesting: 1, name: "x", details: { type: "test", error: { failureType: "testCodeFailure" } } }),
    ev("test:pass", { file: f, nesting: 1, name: "s", skip: true, details: { type: "test" } }),
    ev("test:fail", { file: f, nesting: 1, name: "t", todo: true, details: { type: "test" } }),
    ev("test:fail", { file: f, nesting: 0, name: "grp", details: { type: "suite", error: { failureType: "subtestsFailed" } } }),
    ev("test:fail", { file: f, nesting: 0, name: "hooked", details: { type: "suite", error: { failureType: "hookFailed" } } }),
    ev("test:pass", { file: f, nesting: 0, name: "", details: { type: "test" } }),
    ev("test:fail", { nesting: 0, name: "no file", details: { type: "test" } }),
    ev("test:fail", { nesting: 0, name: "no file, todo", todo: true, details: { type: "test" } }),
    ev("test:diagnostic", { message: "ignored" }),
  ]);
  assert.equal(doc.schema, "pharn-test-results/1");
  assert.equal(doc.suite_errors, 1, "a failing event with no file counts once; a todo one does not");
  assert.deepEqual(
    doc.tests.map((t) => `${t.status} ${t.file} ${t.path.join(" > ")}`),
    [
      "passed t/a.test.mjs grp > x",
      "failed t/a.test.mjs grp > x #2",
      "skipped t/a.test.mjs grp > s",
      "skipped t/a.test.mjs grp > t",
      "failed t/a.test.mjs hooked",
      "passed t/a.test.mjs (unnamed)",
    ]
  );
});
