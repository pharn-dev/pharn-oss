// pharn/floor/test-results-core.test.mjs — the per-test record's suite, over BOTH modules
// (test-results-core.mjs and test-results-formats.mjs).
//
// The format fixtures are CAPTURED from the real reporters (vitest 5.0.1, @playwright/test 1.63.0, Jest 30.5.2 and
// 29.7.0), with only their absolute paths rewritten to the placeholder root `/work/proj` (and the capture's own
// scratch directory to `/work/scratch`) — lessons-learned L4/L55: an authored fixture certifies its author's model; a
// capture certifies the reporter. The `pharn-json` documents are AUTHORED, and that is not the same defect: PHARN
// owns that format, so its contract is the reference, and one test parses the contract's own example. Every refusal test is ONE mutation
// of a passing case, with the passing case as its non-vacuity control (L34), and every rule over a set is
// tested per member (L52). The last test asserts that every RECORD_REASONS member was actually reached by a
// test in this file (L36, the reverse closure).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA, resultsFileName } from "./gate-run-core.mjs";
import {
  CONFIG_FILE,
  CONFIG_KEY,
  FILE_SEP,
  MAX_ID_CHARS,
  MAX_RESULTS_BYTES,
  MAX_TESTS,
  RECORD_REASONS,
  RESULTS_GATES,
  TITLE_SEP,
  buildRecord,
  formatFor,
  loadResultsConfig,
  readResultsConfig,
  testRecord,
} from "./test-results-core.mjs";
import {
  FORMAT_REFUSALS,
  MAX_DEPTH,
  PHARN_RESULTS_SCHEMA,
  PHARN_TEST_KEYS,
  PHARN_TOP_KEYS,
  RECORD_STATUSES,
  RESULTS_FORMATS,
  SHOWN_CHARS,
  isCleanResultsPath,
  parseResults,
  relativeFile,
  shown,
} from "./test-results-formats.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, "test-fixtures", "test-results");
const fixture = (name) => readFileSync(join(FIX, `${name}.json`), "utf8");
const ROOTS = ["/work/proj"];
const A = "a".repeat(64);
const B = "b".repeat(64);
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Every reason_code any test in this file observed — the evidence for the reverse closure at the end. */
const REACHED = new Set();
function expectReason(r, code) {
  assert.equal(r.ok, false, `expected refusal ${code}, got an ok record`);
  assert.equal(r.reason_code, code, `expected ${code}, got ${r.reason_code}: ${r.reason}`);
  REACHED.add(code);
}

/** A minimal VALID verify stamp whose `test` run carries the given fields (mirrors gate-run-core.test.mjs). */
function stampWith(testRun = {}) {
  return {
    schema: SCHEMA,
    stage: "verify",
    side: null,
    feature: "demo",
    head: "0".repeat(40),
    source: "discover",
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: "worktree-fingerprint/2+sha256", init: A, final: B },
    required: ["test"],
    runs: [
      {
        seq: 0,
        id: "test",
        exit: 1,
        ran: true,
        timed_out: false,
        mutated: false,
        reason: null,
        fp_before: A,
        fp_after: A,
        stdout_sha256: A,
        stderr_sha256: A,
        results_sha256: null,
        ...testRun,
      },
      {
        seq: 1,
        id: "reconcile",
        exit: 0,
        ran: true,
        timed_out: false,
        mutated: false,
        reason: null,
        fp_before: A,
        fp_after: B,
        stdout_sha256: A,
        stderr_sha256: A,
      },
    ],
    aux: { completeness: 0 },
  };
}

/** A scratch root holding `pharn.config.json` and `<out>` with the test gate's results file. `config` is the
 *  parsed object (or raw text) to write, or `null` for NO file — `null`, never `undefined`, because an explicit
 *  `undefined` silently takes the default (L41 in miniature, caught by this suite's own first run); `bytes` is
 *  the results file's content (or omitted for none). The stamp's results_sha256 is the sha256 of `bytes` unless `run` overrides it. */
function scenario({ config = { [CONFIG_KEY]: { test: "vitest-json" } }, bytes, run = {}, gateId = "test", after } = {}) {
  const root = mkdtempSync(join(tmpdir(), "trc-"));
  try {
    if (config !== null) writeFileSync(join(root, CONFIG_FILE), typeof config === "string" ? config : JSON.stringify(config));
    const outDir = join(root, ".pharn", "gates");
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, resultsFileName(0, "test"));
    if (bytes !== undefined) writeFileSync(file, bytes);
    const stamp = stampWith({ results_sha256: bytes !== undefined ? sha256(Buffer.from(bytes)) : null, ...run });
    if (after) after({ root, outDir, file });
    return testRecord({ stamp, outDir, gateId, root });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** A vitest document with the given assertion results in ONE file. */
function vitestDoc(assertions, fileStatus = "passed", name = "/work/proj/tests/a.test.js") {
  return { testResults: [{ name, status: fileStatus, assertionResults: assertions }] };
}
const va = (title, status, ancestorTitles = []) => ({ ancestorTitles, title, status, fullName: title });

/** A playwright document: one file suite holding one spec with one test per `[projectName, status, expectedStatus]`.
 *  `rootDir: null` omits config.rootDir entirely. */
function pwDoc(tests, { errors = [], rootDir = "/work/proj/e2e" } = {}) {
  return {
    config: rootDir === null ? {} : { rootDir },
    suites: [
      {
        title: "x.spec.js",
        file: "x.spec.js",
        specs: [
          {
            title: "AC-1: t",
            file: "x.spec.js",
            tests: tests.map(([projectName, status, expectedStatus]) => ({ projectName, status, expectedStatus })),
          },
        ],
      },
    ],
    errors,
  };
}

/** A Jest assertion: vitest's shape plus the two fields Jest carries (`invocations` always, `failing` on Jest 30). */
const ja = (title, status, extra = {}) => ({ ...va(title, status), invocations: 1, failing: false, ...extra });

/** A `pharn-json` document over `tests` (each `[file, path[], status]`). */
function pharnDoc(tests, suiteErrors = 0) {
  return {
    schema: PHARN_RESULTS_SCHEMA,
    suite_errors: suiteErrors,
    tests: tests.map(([file, path, status]) => ({ file, path, status })),
  };
}
const PHARN_OK = () => pharnDoc([["tests/a.test.js", ["checkout", "AC-1: sums"], "passed"]]);

// ---------------------------------------------------------------------------------------------------
// The closed sets.
// ---------------------------------------------------------------------------------------------------

test("✧ L34 — every enumeration under test is NON-EMPTY", () => {
  for (const [label, set] of [
    ["RECORD_REASONS", RECORD_REASONS],
    ["RESULTS_GATES", RESULTS_GATES],
    ["RESULTS_FORMATS", RESULTS_FORMATS],
    ["RECORD_STATUSES", RECORD_STATUSES],
    ["FORMAT_REFUSALS", FORMAT_REFUSALS],
  ]) {
    assert.ok(set.length > 0, `${label} is empty`);
  }
});

test("RECORD_REASONS is sorted and unique; FORMAT_REFUSALS ⊂ RECORD_REASONS", () => {
  assert.deepEqual([...RECORD_REASONS].sort(), [...RECORD_REASONS]);
  assert.equal(new Set(RECORD_REASONS).size, RECORD_REASONS.length);
  for (const c of FORMAT_REFUSALS) assert.ok(RECORD_REASONS.includes(c), `${c} is an adapter refusal but not a RECORD_REASONS member`);
});

test("✧ L36 CLOSURE — every reason literal the two modules emit is a RECORD_REASONS member", () => {
  const found = new Set();
  for (const rel of ["test-results-core.mjs", "test-results-formats.mjs"]) {
    const src = readFileSync(join(HERE, rel), "utf8");
    for (const m of src.matchAll(/(?:\brefuse\(\s*|reason_code:\s*)"([a-z][a-z0-9-]*)"/g)) found.add(m[1]);
  }
  assert.ok(found.size > 0, "the scan found no literals — the scan broke");
  const strays = [...found].filter((c) => !RECORD_REASONS.includes(c));
  assert.deepEqual(strays, []);
});

test("the gate/format sets are the ones this increment ships", () => {
  assert.deepEqual([...RESULTS_GATES], ["test", "test:e2e", "e2e"]);
  assert.deepEqual([...RESULTS_FORMATS], ["jest-json", "pharn-json", "playwright-json", "vitest-json"]);
  assert.deepEqual([...RESULTS_FORMATS].sort(), [...RESULTS_FORMATS], "RESULTS_FORMATS stays sorted");
  assert.deepEqual([...RECORD_STATUSES], ["passed", "failed", "skipped"]);
  assert.equal(PHARN_RESULTS_SCHEMA, "pharn-test-results/1");
  assert.deepEqual([...PHARN_TOP_KEYS], ["schema", "suite_errors", "tests"]);
  assert.deepEqual([...PHARN_TEST_KEYS], ["file", "path", "status"]);
});

// ---------------------------------------------------------------------------------------------------
// The captured reports → the EXACT record.
// ---------------------------------------------------------------------------------------------------

test("vitest capture → the exact record: nested describe, leaf title, file, and skip/todo → skipped", () => {
  const r = scenario({ bytes: fixture("vitest") }); // the real run exited 1 (AC-3 fails)
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.format, "vitest-json");
  assert.equal(r.gate, "test");
  assert.equal(r.suite_errors, 0);
  assert.deepEqual(r.counts, { passed: 2, failed: 1, skipped: 2 });
  const f = "/work/proj/tests/math.test.js"; // the placeholder root is not this scenario's root: kept absolute
  assert.deepEqual(r.tests, [
    { id: `${f}::AC-1: adds numbers`, file: f, title: "AC-1: adds numbers", status: "passed" },
    { id: `${f}::checkout › AC-3: rejects empty cart`, file: f, title: "AC-3: rejects empty cart", status: "failed" },
    { id: `${f}::checkout › AC-4: applies coupon`, file: f, title: "AC-4: applies coupon", status: "skipped" },
    { id: `${f}::checkout › AC-5: handles tax`, file: f, title: "AC-5: handles tax", status: "skipped" },
    { id: `${f}::checkout › totals › AC-2: sums line items`, file: f, title: "AC-2: sums line items", status: "passed" },
  ]);
});

test("vitest capture parsed against ITS root → files relative to the project", () => {
  const p = parseResults("vitest-json", JSON.parse(fixture("vitest")), ROOTS);
  assert.ok(p.ok);
  assert.ok(p.entries.every((e) => e.file === "tests/math.test.js"));
  assert.deepEqual(p.entries.find((e) => e.title === "AC-2: sums line items").path, ["checkout", "totals", "AC-2: sums line items"]);
});

test("playwright capture (two projects) → ids carry the project, files resolve through config.rootDir", () => {
  const p = parseResults("playwright-json", JSON.parse(fixture("playwright")), ROOTS);
  assert.ok(p.ok);
  const rec = buildRecord({ gate: "test", format: "playwright-json", exit: 1, sha: A, parsed: p });
  assert.equal(rec.ok, true, rec.reason);
  const f = "e2e/flow.spec.js";
  assert.deepEqual(
    rec.tests.map((t) => [t.id, t.title, t.status]),
    [
      [`${f}::alpha › AC-1: home loads`, "AC-1: home loads", "passed"],
      [`${f}::alpha › checkout › AC-3: fails`, "AC-3: fails", "failed"],
      [`${f}::alpha › checkout › AC-4: skipped`, "AC-4: skipped", "skipped"],
      [`${f}::alpha › checkout › totals › AC-2: sums`, "AC-2: sums", "passed"],
      [`${f}::beta › AC-1: home loads`, "AC-1: home loads", "passed"],
      [`${f}::beta › checkout › AC-3: fails`, "AC-3: fails", "failed"],
      [`${f}::beta › checkout › AC-4: skipped`, "AC-4: skipped", "skipped"],
      [`${f}::beta › checkout › totals › AC-2: sums`, "AC-2: sums", "passed"],
    ]
  );
  assert.ok(rec.tests.every((t) => t.file === f));
  assert.deepEqual(rec.counts, { passed: 4, failed: 2, skipped: 2 });
});

test("playwright-edge capture (real retries run: an expected failure + a flaky test, exit 0) → unknown-status, EACH case", () => {
  const cfg = { [CONFIG_KEY]: { test: "playwright-json" } };
  // The capture refuses at its FIRST unknown status, which is the expected failure (spec 1, `test.fail()`).
  const first = scenario({ config: cfg, bytes: fixture("playwright-edge"), run: { exit: 0 } });
  expectReason(first, "unknown-status");
  assert.match(first.reason, /specs\[1\].*"expected" \(expectedStatus "failed"\)/, "the expected failure must be the refusal's cause");
  // Remove it, and the SAME real capture's flaky test is what refuses — so both rows rest on reporter evidence.
  const doc = JSON.parse(fixture("playwright-edge"));
  const specs = doc.suites[0].specs;
  assert.equal(specs[1].title, "AC-6: expected failure", "the capture's layout changed — this test pins the wrong spec");
  specs.splice(1, 1);
  const second = scenario({ config: cfg, bytes: JSON.stringify(doc), run: { exit: 0 } });
  expectReason(second, "unknown-status");
  assert.match(second.reason, /"flaky"/);
  // Remove the flaky one too, and the plain pass left in the capture is an ok record (the control).
  specs.splice(1, 1);
  const third = scenario({ config: cfg, bytes: JSON.stringify(doc), run: { exit: 0 } });
  assert.equal(third.ok, true, third.reason);
  assert.deepEqual(third.counts, { passed: 1, failed: 0, skipped: 0 });
});

test("every status an adapter emits over the captures is a RECORD_STATUSES member", () => {
  for (const [name, fmt] of [
    ["vitest", "vitest-json"],
    ["vitest-fails", "vitest-json"],
    ["playwright", "playwright-json"],
    ["jest", "jest-json"],
    ["jest-red", "jest-json"],
    ["jest-after", "jest-json"],
  ]) {
    const p = parseResults(fmt, JSON.parse(fixture(name)), ROOTS);
    assert.ok(p.ok);
    assert.ok(p.entries.length > 0);
    for (const e of p.entries) assert.ok(RECORD_STATUSES.includes(e.status), `${name}: ${e.status}`);
  }
});

// ---------------------------------------------------------------------------------------------------
// Status maps — every member (L52).
// ---------------------------------------------------------------------------------------------------

test("vitest status map: each mapped member, and each unmapped member refuses", () => {
  for (const [raw, want] of [
    ["passed", "passed"],
    ["failed", "failed"],
    ["skipped", "skipped"],
    ["pending", "skipped"],
    ["todo", "skipped"],
  ]) {
    const p = parseResults("vitest-json", vitestDoc([va("t", raw)]), ROOTS);
    assert.ok(p.ok, raw);
    assert.equal(p.entries[0].status, want, raw);
  }
  for (const raw of ["disabled", "focused", "constructor", "PASSED", ""]) {
    const p = parseResults("vitest-json", vitestDoc([va("t", raw)]), ROOTS);
    assert.equal(p.reason_code, "unknown-status", raw);
  }
});

test("playwright status map: expected/passed, unexpected, skipped map; flaky and an expected failure refuse", () => {
  for (const [status, expectedStatus, want] of [
    ["expected", "passed", "passed"],
    ["unexpected", "passed", "failed"],
    ["skipped", "skipped", "skipped"],
  ]) {
    const p = parseResults("playwright-json", pwDoc([["p", status, expectedStatus]]), ROOTS);
    assert.ok(p.ok, status);
    assert.equal(p.entries[0].status, want);
  }
  for (const [status, expectedStatus] of [
    ["flaky", "passed"],
    ["expected", "failed"],
    ["expected", "skipped"],
    ["interrupted", "passed"],
  ]) {
    const p = parseResults("playwright-json", pwDoc([["p", status, expectedStatus]]), ROOTS);
    assert.equal(p.reason_code, "unknown-status", `${status}/${expectedStatus}`);
  }
});

test("parseResults refuses a format outside RESULTS_FORMATS loudly (a programming error, never a guess)", () => {
  for (const f of ["junit-xml", "ctrf-json", "JEST-JSON", "toString", ""]) {
    assert.throws(() => parseResults(f, vitestDoc([]), ROOTS), /not a member of RESULTS_FORMATS/, f);
  }
  // Control (L60): every member dispatches — none reaches the not-a-member throw.
  for (const f of RESULTS_FORMATS) assert.doesNotThrow(() => parseResults(f, {}, ROOTS), f);
});

// ---------------------------------------------------------------------------------------------------
// jest-json (6.22.0) — over the Jest 30.5.2 and 29.7.0 captures.
// ---------------------------------------------------------------------------------------------------

const JEST_CFG = { [CONFIG_KEY]: { test: "jest-json" } };

test("jest capture (30.5.2) → the exact record: nested describe, leaf title, pending/todo → skipped, a load failure", () => {
  const r = scenario({ config: JEST_CFG, bytes: fixture("jest") }); // the real run exited 1 (AC-3 fails)
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.format, "jest-json");
  assert.equal(r.suite_errors, 1, "tests/broken.test.js threw at load: a file failure no test owns");
  assert.deepEqual(r.counts, { passed: 2, failed: 1, skipped: 2 });
  const f = "/work/proj/tests/math.test.js"; // the placeholder root is not this scenario's root: kept absolute
  assert.deepEqual(r.tests, [
    { id: `${f}::AC-1: adds numbers`, file: f, title: "AC-1: adds numbers", status: "passed" },
    { id: `${f}::checkout › AC-3: rejects empty cart`, file: f, title: "AC-3: rejects empty cart", status: "failed" },
    { id: `${f}::checkout › AC-4: applies coupon`, file: f, title: "AC-4: applies coupon", status: "skipped" },
    { id: `${f}::checkout › AC-5: handles tax`, file: f, title: "AC-5: handles tax", status: "skipped" },
    { id: `${f}::checkout › totals › AC-2: sums line items`, file: f, title: "AC-2: sums line items", status: "passed" },
  ]);
  // Parsed against ITS root, every file is relative to the project.
  const p = parseResults("jest-json", JSON.parse(fixture("jest")), ROOTS);
  assert.ok(p.ok);
  assert.ok(p.entries.every((e) => e.file === "tests/math.test.js"));
  // The raw statuses the mapping rests on are the capture's own, not the model's (L55).
  const raw = JSON.parse(fixture("jest")).testResults.flatMap((t) => t.assertionResults.map((a) => a.status));
  assert.deepEqual([...new Set(raw)].sort(), ["failed", "passed", "pending", "todo"]);
});

test("jest-edge capture (30.5.2, exit 0) → test.failing and a pass on retry each refuse; each has a control (L60)", () => {
  const doc = JSON.parse(fixture("jest-edge"));
  const as = doc.testResults[0].assertionResults;
  assert.deepEqual(
    as.map((a) => [a.title, a.status, a.invocations, a.failing]),
    [
      ["AC-6: known bug still fails", "passed", 1, true],
      ["AC-8: passes on the second attempt", "passed", 2, false],
      ["AC-9: plain pass", "passed", 1, false],
    ],
    "the capture's layout changed — the cases below pin the wrong entries"
  );
  const first = scenario({ config: JEST_CFG, bytes: fixture("jest-edge"), run: { exit: 0 } });
  expectReason(first, "unknown-status");
  assert.match(first.reason, /assertionResults\[0\].*test\.failing/);
  // Control for the `failing` property: the SAME entry with failing:false is not refused on that ground.
  const noFailing = structuredClone(doc);
  noFailing.testResults[0].assertionResults[0].failing = false;
  noFailing.testResults[0].assertionResults.splice(1, 1); // drop the retry, so nothing else refuses
  assert.equal(parseResults("jest-json", noFailing, ROOTS).ok, true);
  // Remove the expected failure: the retry pass is what refuses now.
  as.splice(0, 1);
  const second = scenario({ config: JEST_CFG, bytes: JSON.stringify(doc), run: { exit: 0 } });
  expectReason(second, "unknown-status");
  assert.match(second.reason, /retry \(2 invocations\)/);
  // Control for the retry property: the same entry with invocations:1 is an ordinary pass.
  const once = structuredClone(doc);
  once.testResults[0].assertionResults[0].invocations = 1;
  assert.equal(parseResults("jest-json", once, ROOTS).ok, true);
  // Remove it too: the plain pass left in the capture is an ok record.
  as.splice(0, 1);
  const third = scenario({ config: JEST_CFG, bytes: JSON.stringify(doc), run: { exit: 0 } });
  assert.equal(third.ok, true, third.reason);
  assert.deepEqual(third.counts, { passed: 1, failed: 0, skipped: 0 });
});

test("jest29-edge capture (29.7.0) — STATED BOUND: no `failing` field, so a test.failing reads `passed`; its retry still refuses", () => {
  const doc = JSON.parse(fixture("jest29-edge"));
  const as = doc.testResults[0].assertionResults;
  assert.ok(
    as.every((a) => !Object.hasOwn(a, "failing")),
    "Jest 29.7.0 emits no `failing` key — the bound's evidence"
  );
  assert.equal(as[1].title, "AC-8: passes on the second attempt");
  const first = scenario({ config: JEST_CFG, bytes: fixture("jest29-edge"), run: { exit: 0 } });
  expectReason(first, "unknown-status");
  assert.match(first.reason, /assertionResults\[1\].*retry/, "the retry is refused on Jest 29 too; the expected failure is NOT");
  as.splice(1, 1);
  const r = scenario({ config: JEST_CFG, bytes: JSON.stringify(doc), run: { exit: 0 } });
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.tests.find((t) => t.title === "AC-6: known bug still fails").status, "passed", "the unmarked expected failure");
});

test("jest-after capture — the plain-Jest trap: an in-body `await import` stays FAILED after the target exists", () => {
  const before = parseResults("jest-json", JSON.parse(fixture("jest-red")), ROOTS);
  const after = parseResults("jest-json", JSON.parse(fixture("jest-after")), ROOTS);
  assert.ok(before.ok && after.ok);
  const unit = "tests/ac/demo.unit.test.js";
  const status = (p, title) => p.entries.find((e) => e.file === unit && e.title === title).status;
  assert.equal(status(before, "AC-1: resets the password"), "failed");
  assert.equal(status(after, "AC-1: resets the password"), "passed", "require() in the body: red before, green after");
  assert.equal(status(before, "AC-4: resets via dynamic import"), "failed");
  assert.equal(status(after, "AC-4: resets via dynamic import"), "failed", "await import() under plain Jest: red forever");
  // Before the build, the top-level require is a file no test owns (not collected); after it, it is collected.
  assert.equal(before.suiteErrors, 1);
  assert.equal(after.suiteErrors, 0);
});

test("jest status map: each mapped member, and each unmapped member refuses (L52)", () => {
  for (const [raw, want] of [
    ["passed", "passed"],
    ["failed", "failed"],
    ["skipped", "skipped"],
    ["pending", "skipped"],
    ["todo", "skipped"],
  ]) {
    const p = parseResults("jest-json", vitestDoc([ja("t", raw)]), ROOTS);
    assert.ok(p.ok, raw);
    assert.equal(p.entries[0].status, want, raw);
  }
  for (const raw of ["disabled", "focused", "constructor", "PASSED", ""]) {
    assert.equal(parseResults("jest-json", vitestDoc([ja("t", raw)]), ROOTS).reason_code, "unknown-status", raw);
  }
});

test("jest per-assertion fields: each malformed `invocations` / `failing`, and where each ordinary value lands (L52/L60)", () => {
  const withA = (extra) => vitestDoc([ja("t", "passed", extra)]);
  const noInvocations = withA({});
  delete noInvocations.testResults[0].assertionResults[0].invocations;
  assert.equal(parseResults("jest-json", noInvocations, ROOTS).reason_code, "results-malformed", "invocations absent");
  for (const invocations of [0, -1, 1.5, "1", null]) {
    assert.equal(parseResults("jest-json", withA({ invocations }), ROOTS).reason_code, "results-malformed", `invocations ${invocations}`);
  }
  for (const failing of ["true", 1, null]) {
    assert.equal(parseResults("jest-json", withA({ failing }), ROOTS).reason_code, "results-malformed", `failing ${failing}`);
  }
  // Controls: an absent `failing` (Jest 29) and `false` are ordinary; `invocations: 1` is ordinary.
  const noFailing = withA({});
  delete noFailing.testResults[0].assertionResults[0].failing;
  assert.equal(parseResults("jest-json", noFailing, ROOTS).ok, true);
  assert.equal(parseResults("jest-json", withA({ failing: false, invocations: 1 }), ROOTS).ok, true);
  // Only a PASS is refused for either reason: a test.failing whose body passed is reported failed (measured on
  // Jest 30.5.2 in this increment's discovery), and is a failed test, as Playwright's `unexpected` is.
  const rows = [
    ["failed", { failing: true }, "failed"],
    ["pending", { failing: true }, "skipped"],
    ["failed", { invocations: 3 }, "failed"],
    ["pending", { invocations: 2 }, "skipped"],
  ];
  for (const [raw, extra, want] of rows) {
    const p = parseResults("jest-json", vitestDoc([ja("t", raw, extra)]), ROOTS);
    assert.ok(p.ok, `${raw} ${JSON.stringify(extra)}: ${p.reason}`);
    assert.equal(p.entries[0].status, want);
  }
  for (const extra of [{ failing: true }, { invocations: 2 }, { invocations: 3, failing: false }]) {
    assert.equal(parseResults("jest-json", withA(extra), ROOTS).reason_code, "unknown-status", JSON.stringify(extra));
  }
});

test("vitest-fails capture (5.0.1) — STATED BOUND: test.fails and a pass on retry are both plain `passed`, unrefusable", () => {
  const p = parseResults("vitest-json", JSON.parse(fixture("vitest-fails")), ROOTS);
  assert.ok(p.ok, p.reason);
  assert.deepEqual(
    p.entries.map((e) => [e.title, e.status]),
    [
      ["AC-12: known bug still fails", "passed"],
      ["AC-13: passes on the second attempt", "passed"],
    ]
  );
});

// ---------------------------------------------------------------------------------------------------
// pharn-json (6.22.0) — PHARN's own schema, closed in both directions (L36).
// ---------------------------------------------------------------------------------------------------

const PHARN_CFG = { [CONFIG_KEY]: { test: "pharn-json" } };

test("pharn-json → the exact record; an absolute path under the root is relativized; the leaf title is path's last", () => {
  const doc = pharnDoc([
    ["tests/a.test.js", ["checkout", "totals", "AC-2: sums"], "passed"],
    ["tests/a.test.js", ["AC-1: loads"], "failed"],
    ["tests/b.test.js", ["AC-3: later"], "skipped"],
  ]);
  const r = scenario({ config: PHARN_CFG, bytes: JSON.stringify(doc), run: { exit: 1 } });
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.format, "pharn-json");
  assert.deepEqual(r.counts, { passed: 1, failed: 1, skipped: 1 });
  assert.deepEqual(r.tests, [
    { id: "tests/a.test.js::AC-1: loads", file: "tests/a.test.js", title: "AC-1: loads", status: "failed" },
    { id: "tests/a.test.js::checkout › totals › AC-2: sums", file: "tests/a.test.js", title: "AC-2: sums", status: "passed" },
    { id: "tests/b.test.js::AC-3: later", file: "tests/b.test.js", title: "AC-3: later", status: "skipped" },
  ]);
  const abs = parseResults("pharn-json", pharnDoc([["/work/proj/tests/a.test.js", ["t"], "passed"]]), ROOTS);
  assert.equal(abs.entries[0].file, "tests/a.test.js");
});

test("pharn-json L34 — `tests: []` is an ok record with zero tests", () => {
  const r = scenario({ config: PHARN_CFG, bytes: JSON.stringify(pharnDoc([])), run: { exit: 0 } });
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(r.tests, []);
});

test("pharn-json suite_errors — recorded under exit ≠ 0, a contradiction under exit 0", () => {
  const doc = JSON.stringify(pharnDoc([["tests/a.test.js", ["t"], "passed"]], 2));
  const r = scenario({ config: PHARN_CFG, bytes: doc, run: { exit: 1 } });
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.suite_errors, 2);
  expectReason(scenario({ config: PHARN_CFG, bytes: doc, run: { exit: 0 } }), "results-exit-contradiction");
});

test("pharn-json — a status outside RECORD_STATUSES is unknown-status, never mapped", () => {
  for (const status of ["flaky", "PASSED", "pending", "todo", "constructor", ""]) {
    const p = parseResults("pharn-json", pharnDoc([["tests/a.test.js", ["t"], status]]), ROOTS);
    assert.equal(p.reason_code, "unknown-status", status);
  }
  expectReason(
    scenario({ config: PHARN_CFG, bytes: JSON.stringify(pharnDoc([["tests/a.test.js", ["t"], "flaky"]])), run: { exit: 0 } }),
    "unknown-status"
  );
});

test("pharn-json results-malformed — each violation of the schema, ONE mutation of the valid document each (L52)", () => {
  assert.equal(parseResults("pharn-json", PHARN_OK(), ROOTS).ok, true, "control");
  const mutate = (fn) => {
    const d = PHARN_OK();
    fn(d, d.tests[0]);
    return d;
  };
  const cases = [
    ["not an object", () => []],
    ["schema absent", () => mutate((d) => delete d.schema)],
    ["schema /2", () => mutate((d) => (d.schema = "pharn-test-results/2"))],
    ["schema case", () => mutate((d) => (d.schema = "PHARN-TEST-RESULTS/1"))],
    ["schema number", () => mutate((d) => (d.schema = 1))],
    ["suite_errors absent", () => mutate((d) => delete d.suite_errors)],
    ["suite_errors negative", () => mutate((d) => (d.suite_errors = -1))],
    ["suite_errors fraction", () => mutate((d) => (d.suite_errors = 1.5))],
    ["suite_errors string", () => mutate((d) => (d.suite_errors = "0"))],
    ["suite_errors null", () => mutate((d) => (d.suite_errors = null))],
    ["extra top-level key", () => mutate((d) => (d.suiteErrors = 0))],
    ["extra top-level __proto__ (L15)", () => JSON.parse(`{"schema":"${PHARN_RESULTS_SCHEMA}","suite_errors":0,"tests":[],"__proto__":1}`)],
    ["tests absent", () => mutate((d) => delete d.tests)],
    ["tests not an array", () => mutate((d) => (d.tests = {}))],
    ["a test not an object", () => mutate((d) => (d.tests = [null]))],
    ["a test an array", () => mutate((d) => (d.tests = [[]]))],
    ["extra per-test key", () => mutate((_d, t) => (t.title = "AC-1: sums"))],
    [
      "extra per-test __proto__ (L15)",
      () =>
        JSON.parse(
          `{"schema":"${PHARN_RESULTS_SCHEMA}","suite_errors":0,"tests":[{"file":"a.js","path":["t"],"status":"passed","__proto__":1}]}`
        ),
    ],
    ["file absent", () => mutate((_d, t) => delete t.file)],
    ["path absent", () => mutate((_d, t) => delete t.path)],
    ["status absent", () => mutate((_d, t) => delete t.status)],
    ["file number", () => mutate((_d, t) => (t.file = 1))],
    ["path empty", () => mutate((_d, t) => (t.path = []))],
    ["path a string", () => mutate((_d, t) => (t.path = "AC-1: sums"))],
    ["path empty element", () => mutate((_d, t) => (t.path = ["checkout", ""]))],
    ["path non-string element", () => mutate((_d, t) => (t.path = ["checkout", 1]))],
    ["status number", () => mutate((_d, t) => (t.status = 1))],
    ["status null", () => mutate((_d, t) => (t.status = null))],
  ];
  for (const [label, make] of cases) {
    assert.equal(parseResults("pharn-json", make(), ROOTS).reason_code, "results-malformed", label);
  }
  // The schema check comes first, so a later version is named as such, not as a key mismatch. The document ALSO
  // carries an extra key, so only schema-first ordering can produce the /2 message (L60 — review mutation M39).
  const laterVersion = mutate((d) => {
    d.schema = "pharn-test-results/2";
    d.extra = 1;
  });
  assert.match(parseResults("pharn-json", laterVersion, ROOTS).reason, /pharn-test-results\/2/);
  // A MISSING key is named as missing by the key check itself, at both levels — not left to a later type check
  // that happens to share the reason code (L60 — review mutation M13).
  assert.match(
    parseResults(
      "pharn-json",
      mutate((d) => delete d.suite_errors),
      ROOTS
    ).reason,
    /missing key\(s\) "suite_errors"/
  );
  assert.match(
    parseResults(
      "pharn-json",
      mutate((_d, t) => delete t.status),
      ROOTS
    ).reason,
    /missing key\(s\) "status"/
  );
  expectReason(
    scenario({ config: PHARN_CFG, bytes: JSON.stringify(mutate((d) => delete d.schema)), run: { exit: 0 } }),
    "results-malformed"
  );
});

test("shown() is TOTAL — a parsed value whose String() throws is quoted, never thrown (6.22.0 review, each crash site)", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: the value really does make String() throw");
  for (const v of [hostile, [hostile], JSON.parse('{"valueOf":1,"toString":1}')]) {
    assert.doesNotThrow(() => shown(v));
    assert.equal(typeof shown(v), "string");
  }
  assert.equal(shown(hostile), JSON.stringify("[object Object]"));
  // Crash site 1: a pharn-json `schema` (plain, and inside an array) is a refusal, not a throw.
  for (const schema of ['{"toString":1}', '[{"toString":1}]']) {
    const doc = JSON.parse(`{"schema":${schema},"suite_errors":0,"tests":[]}`);
    assert.equal(parseResults("pharn-json", doc, ROOTS).reason_code, "results-malformed", schema);
  }
  expectReason(
    scenario({ config: PHARN_CFG, bytes: '{"schema":{"toString":1},"suite_errors":0,"tests":[]}', run: { exit: 0 } }),
    "results-malformed"
  );
  // Crash site 2: readResultsConfig quotes a `testResults` format value the same way.
  expectReason(readResultsConfig('{"testResults":{"test":{"toString":1}}}'), "config-invalid");
  expectReason(scenario({ config: '{"testResults":{"test":[{"toString":1}]}}', bytes: PASSING }), "config-invalid");
});

test("pharn-json file — absolute or a CLEAN relative POSIX path; each unclean shape refuses BY NAME (L52/L60)", () => {
  for (const good of ["tests/a.test.js", "a.js", "a.b/c.test.js", "/abs/tests/a.test.js", "tests/.config/a.js"]) {
    assert.equal(isCleanResultsPath(good), true, good);
    assert.equal(parseResults("pharn-json", pharnDoc([[good, ["t"], "passed"]]), ROOTS).ok, true, good);
  }
  for (const bad of [
    "",
    "./tests/a.test.js",
    "tests/../a.test.js",
    "tests//a.test.js",
    "tests/./a.test.js",
    "tests\\a.test.js",
    "/",
    "tests/a.test.js/",
    "a\0b",
    "..",
    ".",
  ]) {
    assert.equal(isCleanResultsPath(bad), false, JSON.stringify(bad));
    const p = parseResults("pharn-json", pharnDoc([[bad, ["t"], "passed"]]), ROOTS);
    assert.equal(p.reason_code, "results-malformed", JSON.stringify(bad));
    assert.match(p.reason, /clean relative POSIX path/, JSON.stringify(bad));
  }
  assert.equal(isCleanResultsPath(7), false);
});

/** The contract's own `pharn-json` example: the fenced ```json block under its heading (anchors asserted — L60). */
function contractExample() {
  const md = readFileSync(join(HERE, "..", "pharn-contracts", "test-results-record.md"), "utf8");
  const heading = md.indexOf("\n## The neutral format (`pharn-json`)\n");
  assert.notEqual(heading, -1, "the contract's pharn-json heading is gone — this test lost its anchor");
  const open = md.indexOf("\n```json\n", heading);
  const next = md.indexOf("\n## ", heading + 1);
  assert.ok(open !== -1 && (next === -1 || open < next), "no ```json example under the pharn-json heading");
  const close = md.indexOf("\n```\n", open + 1);
  assert.notEqual(close, -1, "the example's fence never closes");
  return JSON.parse(md.slice(open + "\n```json\n".length, close));
}

test("✧ the contract's pharn-json example parses as an ok record — the documented schema and the adapter agree", () => {
  const doc = contractExample();
  const p = parseResults("pharn-json", doc, ROOTS);
  assert.equal(p.ok, true, p.reason);
  assert.ok(p.entries.length > 0, "the example must carry at least one test (L34)");
  assert.equal(doc.schema, PHARN_RESULTS_SCHEMA);
});

/** Per format: the evidence that parses under it. Captures for the three reporters; the contract example for the
 *  format PHARN owns. Refusal-shaped captures (the edge ones) are not listed: they are evidence for refusals. */
const FORMAT_EVIDENCE = {
  "jest-json": () => ["jest", "jest-red", "jest-after"].map((n) => [n, JSON.parse(fixture(n))]),
  "pharn-json": () => [["contract example", contractExample()]],
  "playwright-json": () => [["playwright", JSON.parse(fixture("playwright"))]],
  "vitest-json": () => ["vitest", "vitest-red", "vitest-fails"].map((n) => [n, JSON.parse(fixture(n))]),
};

test("✧ L29/L36 — every RESULTS_FORMATS member has evidence, and the evidence discriminates the formats (L60)", () => {
  assert.deepEqual(Object.keys(FORMAT_EVIDENCE).sort(), [...RESULTS_FORMATS], "FORMAT_EVIDENCE must range over exactly RESULTS_FORMATS");
  for (const [own, evidence] of Object.entries(FORMAT_EVIDENCE)) {
    for (const [name, doc] of evidence()) {
      const mine = parseResults(own, doc, ROOTS);
      assert.equal(mine.ok, true, `${name} under ${own}: ${mine.reason}`);
      assert.ok(mine.entries.length > 0, `${name} carries no test`);
      for (const other of RESULTS_FORMATS.filter((f) => f !== own)) {
        const theirs = parseResults(other, doc, ROOTS);
        // The ONE designed overlap: Jest's report IS the shape vitest's reporter copies, so a Jest capture parses
        // under vitest-json (which reads fewer fields). The reverse is refused — that is the discriminating control.
        if (own === "jest-json" && other === "vitest-json") {
          assert.equal(theirs.ok, true, `${name} under vitest-json`);
          continue;
        }
        assert.equal(theirs.ok, false, `${name} (${own}) must not parse as ${other}`);
      }
    }
  }
  // The control the overlap above leaves: a vitest capture under jest-json refuses on the missing Jest field.
  const v = parseResults("jest-json", JSON.parse(fixture("vitest")), ROOTS);
  assert.equal(v.reason_code, "results-malformed");
  assert.match(v.reason, /invocations/);
});

// ---------------------------------------------------------------------------------------------------
// Identity, files and suite errors.
// ---------------------------------------------------------------------------------------------------

test("relativeFile: under a root → relative; outside every root, or already relative → unchanged", () => {
  assert.equal(relativeFile("/work/proj/a/b.js", ["/work/proj"]), "a/b.js");
  assert.equal(relativeFile("/work/project/b.js", ["/work/proj"]), "/work/project/b.js", "a sibling prefix is not a parent");
  assert.equal(relativeFile("/elsewhere/b.js", ["/x", "/work/proj"]), "/elsewhere/b.js");
  assert.equal(relativeFile("rel/b.js", ["/work/proj"]), "rel/b.js");
  assert.equal(relativeFile("/second/c.js", ["/first", "/second"]), "c.js");
  assert.equal(relativeFile("/a/b.js", ["/"]), "a/b.js", "a root of / already ends with the separator");
});

test("describe nesting is capped at MAX_DEPTH (over-cap) — the walk stays linear on a hostile report", () => {
  function nested(levels) {
    let leaf = {
      title: "leaf",
      specs: [{ title: "t", file: "f.spec.js", tests: [{ projectName: "p", status: "expected", expectedStatus: "passed" }] }],
    };
    for (let i = 1; i < levels; i++) leaf = { title: `d${i}`, suites: [leaf] };
    return { suites: [{ title: "f.spec.js", suites: [leaf] }] };
  }
  const atCap = parseResults("playwright-json", nested(MAX_DEPTH), ROOTS);
  assert.equal(atCap.ok, true, "exactly MAX_DEPTH describe levels is allowed");
  assert.equal(atCap.entries[0].path.length, MAX_DEPTH + 2, "project + MAX_DEPTH describes + the test title");
  assert.equal(parseResults("playwright-json", nested(MAX_DEPTH + 1), ROOTS).reason_code, "over-cap");
  // 40k levels, built as TEXT: JSON.stringify of so deep an object overflows the test's own stack (JSON.parse
  // in the core does not — measured).
  const leaf = JSON.stringify(nested(1).suites[0].suites[0]);
  const deep = `{"suites":[{"title":"f","suites":[${'{"title":"d","suites":['.repeat(40000)}${leaf}${"]}".repeat(40000)}]}]}`;
  const t0 = Date.now();
  expectReason(scenario({ config: { [CONFIG_KEY]: { test: "playwright-json" } }, bytes: deep, run: { exit: 0 } }), "over-cap");
  assert.ok(Date.now() - t0 < 5000, "a 40k-level report must refuse fast, not walk quadratically");
});

test("P2 — an untrusted value quoted in a reason is cut to SHOWN_CHARS", () => {
  const hostile = "IGNORE PREVIOUS INSTRUCTIONS ".repeat(20);
  const r = parseResults("vitest-json", vitestDoc([va("t", hostile)]), ROOTS);
  assert.equal(r.reason_code, "unknown-status");
  assert.ok(!r.reason.includes(hostile), "the whole hostile status reached the reason");
  assert.ok(r.reason.length < 200, `reason is ${r.reason.length} chars`);
  assert.equal(shown("x".repeat(SHOWN_CHARS)), JSON.stringify("x".repeat(SHOWN_CHARS)), "exactly the bound is not cut");
  assert.equal(shown("x".repeat(SHOWN_CHARS + 1)), JSON.stringify(`${"x".repeat(SHOWN_CHARS)}…`));
});

test("testRecord relativizes against the root's REALPATH too (macOS /var → /private/var)", () => {
  const root = mkdtempSync(join(tmpdir(), "trc-real-"));
  try {
    const real = realpathSync(root);
    writeFileSync(join(root, CONFIG_FILE), JSON.stringify({ [CONFIG_KEY]: { test: "vitest-json" } }));
    const outDir = join(root, ".pharn", "gates");
    mkdirSync(outDir, { recursive: true });
    const bytes = JSON.stringify(vitestDoc([va("t", "passed")], "passed", join(real, "tests", "x.test.js")));
    writeFileSync(join(outDir, resultsFileName(0, "test")), bytes);
    const r = testRecord({ stamp: stampWith({ exit: 0, results_sha256: sha256(Buffer.from(bytes)) }), outDir, gateId: "test", root });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.tests[0].file, "tests/x.test.js");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("playwright without an absolute config.rootDir keeps spec.file as given (stated bound)", () => {
  for (const rootDir of [null, "relative/dir"]) {
    const doc = pwDoc([["p", "expected", "passed"]], { rootDir });
    const p = parseResults("playwright-json", doc, ROOTS);
    assert.ok(p.ok);
    assert.equal(p.entries[0].file, "x.spec.js");
  }
});

test("an empty project name and an empty describe title are dropped from the path", () => {
  const doc = pwDoc([["", "expected", "passed"]]);
  doc.suites[0].suites = [
    {
      title: "",
      specs: [{ title: "inner", file: "x.spec.js", tests: [{ projectName: "", status: "expected", expectedStatus: "passed" }] }],
    },
  ];
  const p = parseResults("playwright-json", doc, ROOTS);
  assert.ok(p.ok);
  assert.deepEqual(
    p.entries.map((e) => e.path),
    [["AC-1: t"], ["inner"]]
  );
});

test("suite_errors: a vitest file that failed with no failed assertion, and playwright's top-level errors[]", () => {
  const v = parseResults("vitest-json", { testResults: [{ name: "/work/proj/a.test.js", status: "failed", assertionResults: [] }] }, ROOTS);
  assert.equal(v.suiteErrors, 1);
  // Control: a file that failed BECAUSE a test failed is not a suite error.
  const c = parseResults("vitest-json", vitestDoc([va("t", "failed")], "failed"), ROOTS);
  assert.equal(c.suiteErrors, 0);
  const p = parseResults("playwright-json", pwDoc([["p", "expected", "passed"]], { errors: [{ message: "x" }, { message: "y" }] }), ROOTS);
  assert.equal(p.suiteErrors, 2);
});

test("exit ≠ 0 with EVERY test passed is a record, NOT a contradiction (a coverage/lint step may fail the script)", () => {
  const r = scenario({ bytes: JSON.stringify(vitestDoc([va("a", "passed"), va("b", "passed")])), run: { exit: 1 } });
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.exit, 1);
  assert.deepEqual(r.counts, { passed: 2, failed: 0, skipped: 0 });
});

test("a suite error under exit ≠ 0 is recorded in the record, not refused", () => {
  const doc = { testResults: [{ name: "/work/proj/a.test.js", status: "failed", assertionResults: [] }] };
  const r = scenario({ bytes: JSON.stringify(doc), run: { exit: 1 } });
  assert.equal(r.ok, true);
  assert.equal(r.suite_errors, 1);
});

test("L34 — a run with ZERO tests is an ok record with tests: [] (a consumer asserts non-emptiness itself)", () => {
  const r = scenario({ bytes: JSON.stringify({ testResults: [] }), run: { exit: 0 } });
  assert.equal(r.ok, true);
  assert.deepEqual(r.tests, []);
});

// ---------------------------------------------------------------------------------------------------
// Each closed reason — one mutation of a passing case (the control above), hitting ONLY that reason.
// ---------------------------------------------------------------------------------------------------

const PASSING = JSON.stringify(vitestDoc([va("a", "passed")]));

test("control: the passing case every mutation below starts from is an ok record", () => {
  const r = scenario({ bytes: PASSING, run: { exit: 0 } });
  assert.equal(r.ok, true, r.reason);
});

test("stamp-invalid — a stamp validateStamp refuses (incl. a malformed results_sha256)", () => {
  const root = mkdtempSync(join(tmpdir(), "trc-"));
  try {
    const bad = stampWith();
    bad.schema = "nope";
    expectReason(testRecord({ stamp: bad, outDir: root, gateId: "test", root }), "stamp-invalid");
    expectReason(testRecord({ stamp: stampWith({ results_sha256: "zz" }), outDir: root, gateId: "test", root }), "stamp-invalid");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("gate-absent — the stamp has no such gate", () => {
  expectReason(scenario({ bytes: PASSING, run: { exit: 0 }, gateId: "lint" }), "gate-absent");
});

test("not-configured — no config file, no testResults key, or the gate not named", () => {
  expectReason(scenario({ config: null, bytes: PASSING }), "not-configured");
  expectReason(scenario({ config: { models: {} }, bytes: PASSING }), "not-configured");
  expectReason(scenario({ config: { [CONFIG_KEY]: {} }, bytes: PASSING }), "not-configured");
});

test("config-invalid — each malformed shape (L52), incl. a gate key outside RESULTS_GATES and a format outside RESULTS_FORMATS", () => {
  for (const config of [
    "{not json",
    "[]",
    { [CONFIG_KEY]: "vitest-json" },
    { [CONFIG_KEY]: [] },
    { [CONFIG_KEY]: { lint: "vitest-json" } },
    { [CONFIG_KEY]: { test: "vitest-json", build: "vitest-json" } },
    { [CONFIG_KEY]: { test: "junit-xml" } },
    { [CONFIG_KEY]: { test: "ctrf-json" } },
    { [CONFIG_KEY]: { test: "VITEST-JSON" } },
    { [CONFIG_KEY]: { test: "JEST-JSON" } },
    '{"testResults": {"__proto__": "vitest-json"}}',
  ]) {
    expectReason(scenario({ config, bytes: PASSING }), "config-invalid");
  }
});

test("config-invalid — a config path that exists but cannot be read is never read as 'absent'", () => {
  const root = mkdtempSync(join(tmpdir(), "trc-"));
  try {
    mkdirSync(join(root, CONFIG_FILE)); // a directory: EISDIR on read
    expectReason(loadResultsConfig(root), "config-invalid");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("e2e gates (6.16.0) are configurable beside `test`, each with its own format", () => {
  const cfg = readResultsConfig(
    JSON.stringify({ [CONFIG_KEY]: { test: "vitest-json", "test:e2e": "playwright-json", e2e: "playwright-json" } })
  );
  assert.ok(cfg.ok, cfg.reason);
  assert.deepEqual(formatFor(cfg, "test:e2e"), { ok: true, format: "playwright-json" });
  assert.deepEqual(formatFor(cfg, "e2e"), { ok: true, format: "playwright-json" });
  assert.deepEqual(formatFor(cfg, "test"), { ok: true, format: "vitest-json" });
});

test("L15 — prototype names are never a configured gate", () => {
  const cfg = readResultsConfig(JSON.stringify({ [CONFIG_KEY]: { test: "vitest-json" } }));
  assert.ok(cfg.ok);
  for (const g of ["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"]) {
    expectReason(formatFor(cfg, g), "not-configured");
  }
  assert.deepEqual(formatFor(cfg, "test"), { ok: true, format: "vitest-json" });
});

test("results-unavailable — timed out, pre-6.15 stamp, no file written, no-files, and a missing file", () => {
  expectReason(scenario({ bytes: PASSING, run: { timed_out: true, exit: 124 } }), "results-unavailable");
  const root = mkdtempSync(join(tmpdir(), "trc-"));
  try {
    writeFileSync(join(root, CONFIG_FILE), JSON.stringify({ [CONFIG_KEY]: { test: "vitest-json" } }));
    const pre = stampWith();
    delete pre.runs[0].results_sha256;
    const r1 = testRecord({ stamp: pre, outDir: root, gateId: "test", root });
    expectReason(r1, "results-unavailable");
    assert.match(r1.reason, /predates/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const r2 = scenario({ run: { results_sha256: null } });
  expectReason(r2, "results-unavailable");
  assert.match(r2.reason, /wrote no results file/);
  const r3 = scenario({ run: { results_sha256: null, ran: false, reason: "no-files", exit: 0 } });
  expectReason(r3, "results-unavailable");
  assert.match(r3.reason, /did not run/);
  expectReason(scenario({ run: { results_sha256: A } }), "results-unavailable");
});

test("results-unavailable — a symlink, a directory, or a FIFO at the results path is never followed or read", () => {
  const target = join(mkdtempSync(join(tmpdir(), "trc-t-")), "t.json");
  writeFileSync(target, PASSING);
  try {
    for (const kind of ["symlink", "directory", "fifo"]) {
      const r = scenario({
        run: { results_sha256: sha256(Buffer.from(PASSING)), exit: 0 },
        after: ({ file }) => {
          if (kind === "symlink") symlinkSync(target, file);
          else if (kind === "directory") mkdirSync(file);
          else execFileSync("mkfifo", [file]);
        },
      });
      expectReason(r, "results-unavailable");
    }
  } finally {
    rmSync(dirname(target), { recursive: true, force: true });
  }
});

test("results-hash-mismatch — the file changed after the runner hashed it (L58: a late write is refused)", () => {
  const r = scenario({
    bytes: PASSING,
    run: { exit: 0 },
    after: ({ file }) => writeFileSync(file, PASSING + " "),
  });
  expectReason(r, "results-hash-mismatch");
});

test("results-malformed — not JSON, and each wrong shape per format (L52)", () => {
  expectReason(scenario({ bytes: "{nope", run: { exit: 0 } }), "results-malformed");
  const vitestBad = [
    {},
    [],
    { testResults: "x" },
    { testResults: [null] },
    { testResults: [{ name: 1, assertionResults: [] }] },
    { testResults: [{ name: "f", assertionResults: {} }] },
    { testResults: [{ name: "f", assertionResults: [null] }] },
    { testResults: [{ name: "f", assertionResults: [{ title: "t", status: "passed" }] }] },
    { testResults: [{ name: "f", assertionResults: [{ title: "t", status: "passed", ancestorTitles: [1] }] }] },
    { testResults: [{ name: "f", assertionResults: [{ title: 1, status: "passed", ancestorTitles: [] }] }] },
  ];
  for (const doc of vitestBad) assert.equal(parseResults("vitest-json", doc, ROOTS).reason_code, "results-malformed", JSON.stringify(doc));
  const ok = pwDoc([["p", "expected", "passed"]]);
  const pwBad = [
    {},
    { suites: "x" },
    { ...ok, errors: "x" },
    { ...ok, suites: [null] },
    { ...ok, suites: [{ title: 1 }] },
    { ...ok, suites: [{ title: "f", specs: "x" }] },
    { ...ok, suites: [{ title: "f", suites: "x" }] },
    { ...ok, suites: [{ title: "f", specs: [null] }] },
    { ...ok, suites: [{ title: "f", specs: [{ title: "t", file: "f", tests: "x" }] }] },
    { ...ok, suites: [{ title: "f", specs: [{ title: "t", file: "f", tests: [{ projectName: "p", status: "expected" }] }] }] },
    { ...ok, suites: [{ title: "f", suites: [7] }] },
  ];
  for (const doc of pwBad) assert.equal(parseResults("playwright-json", doc, ROOTS).reason_code, "results-malformed", JSON.stringify(doc));
  // Through testRecord, so the reason is observed end to end:
  expectReason(scenario({ bytes: JSON.stringify({ testResults: "x" }), run: { exit: 0 } }), "results-malformed");
});

test("over-cap — bytes (checked from fstat, before reading), test count, and id length", () => {
  expectReason(
    scenario({
      bytes: PASSING,
      run: { exit: 0 },
      after: ({ file }) => truncateSync(file, MAX_RESULTS_BYTES + 1), // sparse: no 32 MiB write
    }),
    "over-cap"
  );
  const many = {
    ok: true,
    suiteErrors: 0,
    entries: Array.from({ length: MAX_TESTS + 1 }, (_, i) => ({ file: "f", path: [`t${i}`], title: `t${i}`, status: "passed" })),
  };
  expectReason(buildRecord({ gate: "test", format: "vitest-json", exit: 0, sha: A, parsed: many }), "over-cap");
  const atCap = { ...many, entries: many.entries.slice(0, MAX_TESTS) };
  assert.equal(buildRecord({ gate: "test", format: "vitest-json", exit: 0, sha: A, parsed: atCap }).ok, true, "exactly the cap is allowed");
  const long = "x".repeat(MAX_ID_CHARS);
  expectReason(scenario({ bytes: JSON.stringify(vitestDoc([va(long, "passed")])), run: { exit: 0 } }), "over-cap");
  // Boundaries: an id of EXACTLY MAX_ID_CHARS, and a file of EXACTLY MAX_RESULTS_BYTES, are not over the cap.
  const idAt = "/work/proj/tests/a.test.js::".length;
  const fits = scenario({ bytes: JSON.stringify(vitestDoc([va("y".repeat(MAX_ID_CHARS - idAt), "passed")])), run: { exit: 0 } });
  assert.equal(fits.ok, true, fits.reason);
  assert.equal(fits.tests[0].id.length, MAX_ID_CHARS);
  const exact = scenario({ bytes: PASSING, run: { exit: 0 }, after: ({ file }) => truncateSync(file, MAX_RESULTS_BYTES) });
  assert.notEqual(exact.reason_code, "over-cap", "exactly the byte cap must be read, not refused as over-cap");
});

test("results-exit-contradiction — Playwright suite errors under exit 0, end to end", () => {
  const doc = pwDoc([["p", "expected", "passed"]], { errors: [{ message: "x" }] });
  expectReason(
    scenario({ config: { [CONFIG_KEY]: { test: "playwright-json" } }, bytes: JSON.stringify(doc), run: { exit: 0 } }),
    "results-exit-contradiction"
  );
  const ok = scenario({ config: { [CONFIG_KEY]: { test: "playwright-json" } }, bytes: JSON.stringify(doc), run: { exit: 1 } });
  assert.equal(ok.ok, true, "control: the same report under exit 1 is a record");
  assert.equal(ok.suite_errors, 1);
});

test("duplicate-test-id — two tests with one id; never last-wins", () => {
  expectReason(
    scenario({ bytes: JSON.stringify(vitestDoc([va("same", "passed"), va("same", "failed")])), run: { exit: 1 } }),
    "duplicate-test-id"
  );
  // The separator bound, stated in the contract: a title containing TITLE_SEP can collide with a nested one.
  const collide = vitestDoc([va(`a${TITLE_SEP}b`, "passed"), va("b", "passed", ["a"])]);
  expectReason(scenario({ bytes: JSON.stringify(collide), run: { exit: 0 } }), "duplicate-test-id");
  assert.equal(FILE_SEP, "::");
});

test("results-exit-contradiction — exit 0 with a failed test, and exit 0 with a suite error", () => {
  expectReason(scenario({ bytes: fixture("vitest"), run: { exit: 0 } }), "results-exit-contradiction");
  const doc = { testResults: [{ name: "/work/proj/a.test.js", status: "failed", assertionResults: [] }] };
  expectReason(scenario({ bytes: JSON.stringify(doc), run: { exit: 0 } }), "results-exit-contradiction");
});

test("unknown-status — through testRecord, for each format", () => {
  expectReason(scenario({ bytes: JSON.stringify(vitestDoc([va("t", "disabled")])), run: { exit: 0 } }), "unknown-status");
  expectReason(
    scenario({
      config: { [CONFIG_KEY]: { test: "playwright-json" } },
      bytes: JSON.stringify(pwDoc([["p", "flaky", "passed"]])),
      run: { exit: 0 },
    }),
    "unknown-status"
  );
  expectReason(scenario({ config: JEST_CFG, bytes: JSON.stringify(vitestDoc([ja("t", "focused")])), run: { exit: 0 } }), "unknown-status");
  expectReason(
    scenario({ config: PHARN_CFG, bytes: JSON.stringify(pharnDoc([["tests/a.test.js", ["t"], "skip"]])), run: { exit: 0 } }),
    "unknown-status"
  );
});

test("L41 — testRecord takes NO defaults: each missing argument is a TypeError, never a guessed value", () => {
  const base = { stamp: stampWith(), outDir: "/x", gateId: "test", root: "/x" };
  for (const k of ["outDir", "gateId", "root"]) {
    assert.throws(() => testRecord({ ...base, [k]: undefined }), TypeError, k);
    assert.throws(() => testRecord({ ...base, [k]: "" }), TypeError, k);
  }
});

test("✧ L36 REVERSE CLOSURE — every RECORD_REASONS member was reached by a test in this file", () => {
  const unreached = RECORD_REASONS.filter((c) => !REACHED.has(c));
  assert.deepEqual(unreached, [], `no test reached: ${unreached.join(", ")}`);
});
