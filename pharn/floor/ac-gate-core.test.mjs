// pharn/floor/ac-gate-core.test.mjs — /pharn-verify's AC gate. Every fixture is a REAL project world: a SPEC filled from
// the shipped template and pinned by check-spec.mjs, an AC-TESTS.md bound to that pin, test files, a package.json and
// pharn.config.json, and a lock `ac-tests-lock.mjs --write` wrote (so the pin is the script's, L22). The head run is a
// verify stamp whose `test` gate carries a vitest-json report. Each reason is ONE mutation of the GREEN world and
// asserts it is the ONLY reason (L52); the reason sets are closed and partitioned (L36); a reason no fixture reaches
// fails the suite. check-verify.mjs `--ac-gate` is exercised end to end at the bottom.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AC_GATE_MODES,
  AC_GATE_REASONS,
  AC_GATE_VERDICTS,
  AC_STATUSES,
  DELIVERY_REASONS,
  EVIDENCE_REASONS,
  FAILING_IDS,
  evaluateAcGate,
} from "./ac-gate-core.mjs";
import { filesDigest } from "./ac-tests-lock.mjs";
import { RESERVED_IDS, resultsFileName } from "./gate-run-core.mjs";
import { RECORD_REASONS } from "./test-results-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_SPEC = join(HERE, "check-spec.mjs");
const LOCK_CLI = join(HERE, "ac-tests-lock.mjs");
const CHECK_VERIFY = join(HERE, "check-verify.mjs");
const TEMPLATE = readFileSync(join(HERE, "..", "pharn-contracts", "templates", "spec-template.md"), "utf8");
const TEMPLATE_REF = spawnSync(process.execPath, [CHECK_SPEC, "--template-ref", "pharn-default"], { encoding: "utf8" }).stdout.trim();
const NAME = "demo";
const A = "a".repeat(64);
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const REACHED = new Set();

const FILE = (n) => `tests/ac/ac${n}.test.js`;
const OTHER = "tests/other/feature.test.js";
const tid = (file, title) => `${file}::${title}`;

/** A templated SPEC with `n` criteria at `levels`, Approved and pinned by check-spec.mjs. `kind` adds spec_kind; `legacy`
 *  drops spec_template. Written to `path`; returns its spec_content_hash (null for a legacy SPEC). */
function writeSpec(path, { levels = ["unit", "unit"], kind = null, legacy = false } = {}) {
  const items = levels.map((l, i) => `- **AC-${i + 1}** Given a state When an action Then outcome ${i + 1}\n  - verify: ${l}`).join("\n");
  let draft = TEMPLATE.replace(/<!--\s*pharn:guidance[\s\S]*?-->\n?/g, "")
    .replace("spec_id: <name>", `spec_id: ${NAME}`)
    .replace("<the line check-spec.mjs --resolve-template-ref prints>", TEMPLATE_REF)
    .replace(/- \*\*AC-1\*\* Given <a starting state>[^\n]*\n {2}- verify: <unit \| integration \| e2e>/, items)
    .replace(/<[^>\n]+>/g, "filled");
  if (kind) draft = draft.replace(/^(spec_template: .*)$/m, `$1\nspec_kind: ${kind}`);
  if (legacy) draft = draft.replace(/^spec_template:.*\n/m, "");
  writeFileSync(path, draft);
  const h = spawnSync(process.execPath, [CHECK_SPEC, "--hash", path], { encoding: "utf8" }).stdout.trim();
  writeFileSync(path, draft.replace("state: Draft", "state: Approved").replace('spec_content_hash: ""', `spec_content_hash: ${h}`));
  return h;
}

/** vitest-json over `tests` ([{file, title, status}]), under the path the reporter's process saw (the realpath). */
function vitestDoc(root, tests) {
  const byFile = new Map();
  for (const t of tests) {
    if (!byFile.has(t.file)) byFile.set(t.file, []);
    byFile.get(t.file).push({ ancestorTitles: [], title: t.title, fullName: t.title, status: t.status });
  }
  return JSON.stringify({
    testResults: [...byFile].map(([file, assertionResults]) => ({
      name: join(realpathSync(root), file),
      status: assertionResults.some((a) => a.status === "failed") ? "failed" : "passed",
      assertionResults,
    })),
  });
}

/**
 * A GREEN test-first world: the SPEC's ACs, a mapping of `mapped` of them (default all), one test file each, the pinned
 * infrastructure, a lock with a bound red run, and a head `test` run in which every AC test passed — beside ANOTHER
 * feature's passing `AC-1:`/`AC-2:` in the same suite.
 */
function world({ levels = ["unit", "unit"], mapped = null, kind = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "acg-"));
  const fd = join(root, "pharn", "features", NAME);
  mkdirSync(fd, { recursive: true });
  const h = writeSpec(join(fd, "SPEC.md"), { levels, kind });
  const ids = (mapped ?? levels.map((_, i) => i + 1)).map((n) => `AC-${n}`);
  writeFileSync(
    join(fd, "AC-TESTS.md"),
    [
      "---",
      `spec_id: ${NAME}`,
      `spec_content_hash: ${h}`,
      "---",
      "",
      "## Files",
      "",
      ...ids.map((id) => `- \`${FILE(id.slice(3))}\` — ${id}`),
      "",
      "## Mapping",
      "",
      ...ids.map((id) => `- ${id} | ${levels[Number(id.slice(3)) - 1]} | \`${FILE(id.slice(3))}\` | src/x.js#f(): void`),
      "",
    ].join("\n")
  );
  mkdirSync(join(root, "tests", "ac"), { recursive: true });
  for (const id of ids)
    writeFileSync(join(root, FILE(id.slice(3))), `test("${id}: t", async () => { await import("../../src/x.js"); });\n`);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "w", scripts: { test: "vitest run", lint: "eslint ." } }));
  writeFileSync(join(root, "pharn.config.json"), JSON.stringify({ testResults: { test: "vitest-json" } }));
  writeFileSync(join(root, "vitest.config.ts"), "export default {}\n");
  const w = spawnSync(process.execPath, [LOCK_CLI, "--write", NAME], { cwd: root, encoding: "utf8" });
  assert.equal(w.status, 0, `fixture: --write: ${w.stdout}`);
  const lockPath = join(fd, "AC-TESTS.lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.red_run = {
    stamp_sha256: A,
    files_sha256: filesDigest(lock.files),
    gates: [{ gate: "test", results_sha256: A }],
    acs: ids.map((id) => ({ id, tests: [tid(FILE(id.slice(3)), `${id}: t`)] })),
  };
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));
  const outDir = join(root, ".pharn", "pharn-verify", "gates");
  mkdirSync(outDir, { recursive: true });
  const results = [
    ...ids.map((id) => ({ file: FILE(id.slice(3)), title: `${id}: t`, status: "passed" })),
    { file: OTHER, title: "AC-1: t", status: "passed" },
    { file: OTHER, title: "AC-2: t", status: "passed" },
  ];
  return { root, fd, lockPath, outDir, ids, results, done: () => rmSync(root, { recursive: true, force: true }) };
}

/** A finalized verify stamp over `runs` ([{id, exit, results?, argv?, shell?}]); results files land in `outDir`. */
function stampOf(w, runs, { source = "discover", complete = 0 } = {}) {
  const rec = runs.map((g, seq) => {
    let results_sha256 = null;
    if (g.results != null) {
      writeFileSync(join(w.outDir, resultsFileName(seq, g.id)), g.results);
      results_sha256 = sha256(Buffer.from(g.results));
    }
    return {
      seq,
      id: g.id,
      shell: g.shell ?? null,
      argv: g.argv ?? (g.id === "reconcile" ? ["node", "check-bash-reconcile.mjs"] : ["npm", "run", g.id]),
      files: [],
      exit: g.exit ?? 0,
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
    stage: "verify",
    side: null,
    feature: NAME,
    head: null,
    source,
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: "x", init: A, final: A },
    required: runs.map((g) => g.id).filter((id) => id !== "reconcile"),
    runs: rec,
    aux: { completeness: complete },
  };
}

/** The gate over world `w`, whose head `test` run reports `results` (default: the world's own). */
function gateOf(w, { results = w.results, exit = null, runs = null, source } = {}) {
  const failed = results.some((t) => t.status === "failed");
  const stamp = stampOf(
    w,
    runs ?? [{ id: "test", exit: exit ?? (failed ? 1 : 0), results: vitestDoc(w.root, results) }, { id: "reconcile" }],
    {
      source,
    }
  );
  return evaluateAcGate({ feature: NAME, stamp, outDir: w.outDir, root: w.root });
}

const reasonsOf = (g) => [...g.evidence.map((e) => e.reason), ...g.acs.map((a) => a.reason).filter((r) => r !== null)];

/** Assert `g` carries exactly `reason` (and nothing else), with `verdict`; mark it reached. */
function only(g, reason, verdict) {
  assert.deepEqual(reasonsOf(g), [reason], JSON.stringify(g, null, 1));
  assert.equal(g.verdict, verdict);
  REACHED.add(reason);
}

function withWorld(opts, fn) {
  const w = world(opts);
  try {
    return fn(w);
  } finally {
    w.done();
  }
}

const setStatus = (results, file, title, status) => results.map((t) => (t.file === file && t.title === title ? { ...t, status } : t));

// ── the GREEN world, and each delivery reason ───────────────────────────────────────────────────────────────

test("GREEN — every AC's locked, once-red test passed on the head run: PASS, test-first, the tests named", () => {
  withWorld({}, (w) => {
    const g = gateOf(w);
    assert.equal(g.verdict, "PASS", JSON.stringify(g, null, 1));
    assert.equal(g.mode, "test-first");
    assert.deepEqual(g.evidence, []);
    assert.deepEqual(
      g.acs.map((a) => [a.id, a.level, a.status, a.reason, a.tests]),
      [
        ["AC-1", "unit", "passed", null, [tid(FILE(1), "AC-1: t")]],
        ["AC-2", "unit", "passed", null, [tid(FILE(2), "AC-2: t")]],
      ]
    );
    assert.match(g.note, /PHARN does not judge whether that test fully captures the AC's intent/);
  });
});

// ── quick (6.25.0): a spec_kind: quick SPEC takes the SAME test-first gate a feature SPEC does ──────────

test("GREEN — a spec_kind: quick world reads test-first (mode) and PASS, exactly like a feature world", () => {
  withWorld({ kind: "quick" }, (w) => {
    const g = gateOf(w);
    assert.equal(g.verdict, "PASS", JSON.stringify(g, null, 1));
    assert.equal(g.mode, "test-first");
    assert.deepEqual(g.evidence, []);
  });
});

test("ac-not-passed — a quick world's AC-2 fails after the build, exactly as a feature world's would", () => {
  withWorld({ kind: "quick" }, (w) =>
    only(gateOf(w, { results: setStatus(w.results, FILE(2), "AC-2: t", "failed") }), "ac-not-passed", "FAIL")
  );
});

test("ac-untested — AC-2's test was not reported (never collected, or deleted from the run)", () => {
  withWorld({}, (w) => only(gateOf(w, { results: w.results.filter((t) => t.file !== FILE(2)) }), "ac-untested", "FAIL"));
});

test("ac-not-passed — AC-2's test FAILS after the build", () => {
  withWorld({}, (w) => only(gateOf(w, { results: setStatus(w.results, FILE(2), "AC-2: t", "failed") }), "ac-not-passed", "FAIL"));
});

test("ac-skipped — AC-2's test is skipped", () => {
  withWorld({}, (w) => only(gateOf(w, { results: setStatus(w.results, FILE(2), "AC-2: t", "skipped") }), "ac-skipped", "FAIL"));
});

test("★ another feature's PASSING `AC-2:` in the same suite never satisfies this feature's failing AC-2 (file-scoped match)", () => {
  withWorld({}, (w) => {
    const results = setStatus(w.results, FILE(2), "AC-2: t", "failed");
    assert.ok(
      results.some((t) => t.file === OTHER && t.title === "AC-2: t" && t.status === "passed"),
      "precondition"
    );
    const g = gateOf(w, { results });
    only(g, "ac-not-passed", "FAIL");
    assert.deepEqual(g.acs[1].tests, [tid(FILE(2), "AC-2: t")], "the other feature's test is not among AC-2's");
    // and with AC-2's own test absent, the other feature's still does not count
    only(gateOf(w, { results: w.results.filter((t) => t.file !== FILE(2)) }), "ac-untested", "FAIL");
  });
});

test("ac-untested — a test the red run recorded red for AC-1 is MISSING from the head run (REVIEW finding 1)", () => {
  withWorld({}, (w) => {
    const l = JSON.parse(readFileSync(w.lockPath, "utf8"));
    l.red_run.acs[0].tests = [tid(FILE(1), "AC-1: error path"), tid(FILE(1), "AC-1: t")];
    writeFileSync(w.lockPath, JSON.stringify(l));
    const g = gateOf(w); // the head run reports only "AC-1: t", passed
    only(g, "ac-untested", "FAIL");
    assert.equal(g.acs[0].status, "passed", "what ran passed — the evidence is still incomplete");
    assert.match(g.acs[0].detail, /1 test\(s\) the red run recorded red for AC-1 were not reported/);
    // control: the head run reports both → delivered
    assert.equal(gateOf(w, { results: [...w.results, { file: FILE(1), title: "AC-1: error path", status: "passed" }] }).verdict, "PASS");
  });
});

// ── the evidence reasons ─────────────────────────────────────────────────────────────────────────────────────

test("ac-tests-modified — a pinned test edited after the lock (a Bash write the scope did not deny, L19)", () => {
  withWorld({}, (w) => {
    writeFileSync(join(w.root, FILE(1)), 'test("AC-1: t", () => {});\n');
    const g = gateOf(w);
    only(g, "ac-tests-modified", "FAIL");
    assert.match(g.evidence[0].detail, /tests\/ac\/ac1\.test\.js changed since the lock was written/);
  });
});

test("ac-tests-modified — the lock is missing, unusable, or a bootstrap lock beside a feature SPEC; the SPEC pin is not the lock's", () => {
  for (const [why, mutate, re] of [
    ["lock missing", (w) => unlinkSync(w.lockPath), /AC-TESTS\.lock\.json is missing/],
    ["lock not JSON", (w) => writeFileSync(w.lockPath, "{"), /not JSON/],
    [
      "a bootstrap lock",
      (w) => {
        const l = JSON.parse(readFileSync(w.lockPath, "utf8"));
        writeFileSync(
          w.lockPath,
          JSON.stringify({
            ...l,
            mode: "bootstrap",
            mapping: null,
            files: [],
            red_run: null,
            test_infra: null,
            bootstrap: { spec_kind: "test-infra", levels: ["unit"] },
          })
        );
      },
      /bootstrap lock, but the SPEC is a test-first spec_kind \(feature or quick\)/,
    ],
    [
      "the SPEC's pin moved",
      (w) => {
        const p = join(w.fd, "SPEC.md");
        writeFileSync(p, readFileSync(p, "utf8").replace(/spec_content_hash: [0-9a-f]{64}/, `spec_content_hash: ${"b".repeat(64)}`));
      },
      /SPEC\.md's spec_content_hash is not the one the tests were locked against/,
    ],
  ]) {
    withWorld({}, (w) => {
      mutate(w);
      const g = gateOf(w);
      assert.ok(
        reasonsOf(g).every((r) => r === "ac-tests-modified") && reasonsOf(g).length >= 1,
        `${why}: ${JSON.stringify(reasonsOf(g))}`
      );
      assert.equal(g.evidence.length, 1, `${why}: exactly one evidence line`);
      assert.match(g.evidence[0].detail, re, why);
      assert.equal(g.verdict, "FAIL");
    });
  }
});

test("ac-never-red — the lock records no red run: the tests were never shown to fail before the build", () => {
  withWorld({}, (w) => {
    const l = JSON.parse(readFileSync(w.lockPath, "utf8"));
    writeFileSync(w.lockPath, JSON.stringify({ ...l, red_run: null }));
    only(gateOf(w), "ac-never-red", "FAIL");
  });
});

test("ac-never-red — a matched test the red run never recorded red (a test the build made appear), per AC", () => {
  withWorld({}, (w) => {
    const g = gateOf(w, { results: [...w.results, { file: FILE(1), title: "AC-1: a second case", status: "passed" }] });
    only(g, "ac-never-red", "FAIL");
    assert.equal(g.acs[0].reason, "ac-never-red");
    assert.equal(g.evidence.length, 0, "per AC, not feature-wide");
  });
});

test("ac-never-red — a SPEC criterion the mapping does not cover has no locked test at all (grill G5)", () => {
  withWorld({ levels: ["unit", "unit", "integration"], mapped: [1, 2] }, (w) => {
    const g = gateOf(w);
    only(g, "ac-never-red", "FAIL");
    assert.equal(g.acs[2].id, "AC-3");
    assert.match(g.acs[2].detail, /no AC-TESTS\.md mapping row/);
  });
});

test("test-infra-changed — the pinned `test` script changed after /pharn-test (the pin)", () => {
  withWorld({}, (w) => {
    writeFileSync(join(w.root, "package.json"), JSON.stringify({ scripts: { test: "vitest run --passWithNoTests", lint: "eslint ." } }));
    const g = gateOf(w);
    only(g, "test-infra-changed", "FAIL");
    assert.match(g.evidence[0].detail, /gate test: its package\.json script changed/);
    assert.ok(!g.evidence[0].detail.includes("passWithNoTests"), "the script text is never echoed (P2)");
  });
});

test("test-infra-changed — the head `test` gate did not run as the pinned `npm run test` (explicit --gates, grill G4)", () => {
  withWorld({}, (w) => {
    const doc = vitestDoc(w.root, w.results);
    only(
      gateOf(w, { runs: [{ id: "test", results: doc, argv: ["npx", "vitest", "run"] }, { id: "reconcile" }] }),
      "test-infra-changed",
      "FAIL"
    );
    only(gateOf(w, { runs: [{ id: "test", results: doc }, { id: "reconcile" }], source: "explicit" }), "test-infra-changed", "FAIL");
    only(
      gateOf(w, { runs: [{ id: "test", results: doc, argv: null, shell: "vitest run" }, { id: "reconcile" }] }),
      "test-infra-changed",
      "FAIL"
    );
  });
});

test("test-infra-unpinned — a lock written before 6.20.0 (/2) carries no pin; the remedy sets the build aside first", () => {
  withWorld({}, (w) => {
    const l = JSON.parse(readFileSync(w.lockPath, "utf8"));
    writeFileSync(w.lockPath, JSON.stringify({ ...l, schema: "ac-tests-lock/2", test_infra: null }));
    const g = gateOf(w);
    only(g, "test-infra-unpinned", "FAIL");
    assert.match(g.evidence[0].detail, /ac-tests-lock\/2/);
  });
});

// ── unmeasurable: item 01's reasons are fatal ─────────────────────────────────────────────────────────────────

test("item 01's reason, fatal — the head `test` gate wrote no per-test results: INCONCLUSIVE, never a PASS", () => {
  withWorld({}, (w) => {
    const g = gateOf(w, { runs: [{ id: "test" }, { id: "reconcile" }] });
    assert.equal(g.verdict, "INCONCLUSIVE");
    assert.deepEqual(reasonsOf(g), ["results-unavailable", "results-unavailable"]);
    assert.equal(g.acs[0].status, "unavailable");
    assert.match(g.reason, /^AC-1: results-unavailable — gate test: /, "the block carries its own reason (REVIEW finding 9)");
    REACHED.add("results-unavailable");
  });
});

test("item 01's reason, fatal — no `test` gate in the head run is `gate-absent`; one flaky duplicate anywhere voids the record", () => {
  withWorld({}, (w) => {
    let g = gateOf(w, { runs: [{ id: "lint" }, { id: "reconcile" }] });
    assert.equal(g.verdict, "INCONCLUSIVE");
    assert.deepEqual([...new Set(reasonsOf(g))], ["gate-absent"]);
    REACHED.add("gate-absent");
    // a duplicate test id in ANOTHER feature's file voids the whole record (grill G9 — the stated cost)
    g = gateOf(w, { results: [...w.results, { file: OTHER, title: "AC-1: t", status: "passed" }] });
    assert.equal(g.verdict, "INCONCLUSIVE");
    assert.deepEqual([...new Set(reasonsOf(g))], ["duplicate-test-id"]);
  });
});

// ── legacy, bootstrap, unusable ───────────────────────────────────────────────────────────────────────────────

test("legacy — NOT-APPLICABLE, stated in the block, never a silent PASS; beside AC evidence it is ac-tests-modified (grill G5)", () => {
  const root = mkdtempSync(join(tmpdir(), "acg-l-"));
  try {
    const fd = join(root, "pharn", "features", NAME);
    mkdirSync(fd, { recursive: true });
    writeSpec(join(fd, "SPEC.md"), { legacy: true });
    const outDir = join(root, "out");
    mkdirSync(outDir);
    const stamp = { runs: [] };
    let g = evaluateAcGate({ feature: NAME, stamp, outDir, root });
    assert.deepEqual(
      { mode: g.mode, verdict: g.verdict, reason: g.reason, evidence: g.evidence, acs: g.acs },
      { mode: "not-applicable", verdict: "NOT-APPLICABLE", reason: "not-applicable (legacy spec)", evidence: [], acs: [] }
    );
    writeFileSync(join(fd, "AC-TESTS.md"), "# left behind\n");
    g = evaluateAcGate({ feature: NAME, stamp, outDir, root });
    only(g, "ac-tests-modified", "FAIL");
    assert.match(g.evidence[0].detail, /reads legacy, but AC-TESTS\.md exist/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** A bootstrap world: a spec_kind: test-infra SPEC with a bootstrap lock --write-bootstrap wrote. */
function bootWorld(levels = ["unit", "integration"]) {
  const root = mkdtempSync(join(tmpdir(), "acg-b-"));
  const fd = join(root, "pharn", "features", NAME);
  mkdirSync(fd, { recursive: true });
  writeSpec(join(fd, "SPEC.md"), { levels, kind: "test-infra" });
  const r = spawnSync(process.execPath, [LOCK_CLI, "--write-bootstrap", NAME], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, `fixture: --write-bootstrap: ${r.stdout}`);
  writeFileSync(join(root, "pharn.config.json"), JSON.stringify({ testResults: { test: "vitest-json" } }));
  const outDir = join(root, ".pharn", "pharn-verify", "gates");
  mkdirSync(outDir, { recursive: true });
  return { root, fd, outDir, lockPath: join(fd, "AC-TESTS.lock.json"), done: () => rmSync(root, { recursive: true, force: true }) };
}

test("bootstrap — the level's discovered gate ran and reported ≥1 passed test: PASS, labelled BOOTSTRAP and WEAKER", () => {
  const w = bootWorld();
  try {
    const doc = vitestDoc(w.root, [{ file: "src/any.test.js", title: "works", status: "passed" }]);
    const g = evaluateAcGate({
      feature: NAME,
      stamp: stampOf(w, [{ id: "test", results: doc }, { id: "reconcile" }]),
      outDir: w.outDir,
      root: w.root,
    });
    assert.equal(g.verdict, "PASS", JSON.stringify(g, null, 1));
    assert.equal(g.mode, "bootstrap");
    assert.match(g.note, /BOOTSTRAP .* WEAKER than test-first/);
    assert.deepEqual(
      g.acs.map((a) => [a.id, a.status, a.reason]),
      [
        ["AC-1", "passed", null],
        ["AC-2", "passed", null],
      ]
    );
  } finally {
    w.done();
  }
});

test("bootstrap — not delivered yet (no gate, not configured, nothing passed) is ac-untested, a retryable red; a test-first lock is ac-tests-modified", () => {
  const w = bootWorld(["unit"]);
  try {
    const at = (runs) => evaluateAcGate({ feature: NAME, stamp: stampOf(w, runs), outDir: w.outDir, root: w.root });
    only(at([{ id: "lint" }, { id: "reconcile" }]), "ac-untested", "FAIL");
    const passed = vitestDoc(w.root, [{ file: "a.test.js", title: "t", status: "passed" }]);
    only(at([{ id: "test", results: passed, argv: ["npx", "vitest"] }, { id: "reconcile" }]), "ac-untested", "FAIL"); // not as discovered
    only(
      at([{ id: "test", exit: 1, results: vitestDoc(w.root, [{ file: "a.test.js", title: "t", status: "failed" }]) }, { id: "reconcile" }]),
      "ac-untested",
      "FAIL"
    );
    writeFileSync(join(w.root, "pharn.config.json"), JSON.stringify({}));
    only(at([{ id: "test", results: passed }, { id: "reconcile" }]), "ac-untested", "FAIL");
    writeFileSync(join(w.root, "pharn.config.json"), JSON.stringify({ testResults: { test: "vitest-json" } }));
    only(at([{ id: "test", results: "{" }, { id: "reconcile" }]), "results-malformed", "INCONCLUSIVE");
    const l = JSON.parse(readFileSync(w.lockPath, "utf8"));
    writeFileSync(
      w.lockPath,
      JSON.stringify({ ...l, mode: "test-first", bootstrap: null, mapping: { path: "x", sha256: A }, files: [{ path: "x", sha256: A }] })
    );
    const g = at([{ id: "test", results: passed }, { id: "reconcile" }]);
    assert.deepEqual(reasonsOf(g), ["ac-tests-modified"]);
  } finally {
    w.done();
  }
});

test("an unusable SPEC is INCONCLUSIVE with no mode; an unreadable one too; every input is required (L41)", () => {
  const root = mkdtempSync(join(tmpdir(), "acg-u-"));
  try {
    const fd = join(root, "pharn", "features", NAME);
    mkdirSync(fd, { recursive: true });
    let g = evaluateAcGate({ feature: NAME, stamp: { runs: [] }, outDir: root, root });
    assert.equal(g.verdict, "INCONCLUSIVE");
    assert.equal(g.mode, null);
    assert.match(g.reason, /SPEC\.md is not readable/);
    writeSpec(join(fd, "SPEC.md"), { kind: "bogus" });
    g = evaluateAcGate({ feature: NAME, stamp: { runs: [] }, outDir: root, root });
    assert.equal(g.verdict, "INCONCLUSIVE");
    assert.match(g.reason, /spec_kind/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  for (const bad of [{}, { feature: NAME, stamp: { runs: [] }, outDir: "o" }, { feature: NAME, outDir: "o", root: "r" }]) {
    assert.throws(() => evaluateAcGate(bad), TypeError);
  }
});

// ── check-verify.mjs --ac-gate, end to end ────────────────────────────────────────────────────────────────────

function verifyCli(w, runs, extra = [], { complete = 0, source } = {}) {
  const stamp = stampOf(w, runs, { complete, source });
  const path = join(w.outDir, "stamp.json");
  writeFileSync(path, JSON.stringify(stamp));
  const r = spawnSync(process.execPath, [CHECK_VERIFY, "--stamp", path, "--feature", NAME, ...extra], { cwd: w.root, encoding: "utf8" });
  // stdout is a PIPE here, exactly as in check-loop-fresh.mjs check E, so a document cut at 64 KiB fails JSON.parse.
  return { code: r.status, doc: JSON.parse(r.stdout), bytes: Buffer.byteLength(r.stdout) };
}

test("★ check-verify --ac-gate: the AC verdict joins the FLOOR verdict — delivery and evidence ids, and PASS only when every AC is delivered", () => {
  withWorld({}, (w) => {
    const green = vitestDoc(w.root, w.results);
    let r = verifyCli(w, [{ id: "test", results: green }, { id: "reconcile" }], ["--ac-gate"]);
    assert.equal(r.code, 0, JSON.stringify(r.doc));
    assert.equal(r.doc.verdict, "PASS");
    assert.equal(r.doc.ac_gate.verdict, "PASS");
    assert.deepEqual(Object.keys(r.doc.gates), ["reconcile", "test"], "the AC ids never enter `gates`");
    // flag-less over the SAME stamp: no ac_gate block, byte-identical to before
    const plain = verifyCli(w, [{ id: "test", results: green }, { id: "reconcile" }]);
    assert.equal(plain.doc.ac_gate, undefined);
    // AC-2 failed while the test gate exited 0 is impossible (item 01 refuses it), so the gate is red too
    const failing = vitestDoc(w.root, setStatus(w.results, FILE(2), "AC-2: t", "failed"));
    r = verifyCli(w, [{ id: "test", exit: 1, results: failing }, { id: "reconcile" }], ["--ac-gate"]);
    assert.equal(r.code, 1);
    assert.deepEqual(r.doc.failing_gates, ["ac-delivery", "test"]);
    // evidence: an edited pinned test → ac-evidence
    writeFileSync(join(w.root, FILE(1)), "edited\n");
    r = verifyCli(
      w,
      [
        { id: "test", results: green },
        { id: "reconcile", exit: 1 },
      ],
      ["--ac-gate"]
    );
    assert.equal(r.code, 1);
    assert.deepEqual(r.doc.failing_gates, ["ac-evidence", "reconcile"]);
  });
});

test("★ check-verify --ac-gate precedence: an unmeasurable AC gate over green gates is INCONCLUSIVE (no reason_code); a red gate beats it", () => {
  withWorld({}, (w) => {
    let r = verifyCli(w, [{ id: "test" }, { id: "reconcile" }], ["--ac-gate"]);
    assert.equal(r.code, 2, JSON.stringify(r.doc));
    assert.equal(r.doc.verdict, "INCONCLUSIVE");
    assert.equal(r.doc.reason_code, undefined, "never routed as an orchestration lapse");
    assert.match(r.doc.reason, /AC gate unmeasurable — AC-1: results-unavailable/);
    r = verifyCli(w, [{ id: "test", exit: 1 }, { id: "reconcile" }], ["--ac-gate"]);
    assert.equal(r.code, 1);
    assert.deepEqual(r.doc.failing_gates, ["test"]);
    assert.equal(r.doc.ac_gate.verdict, "INCONCLUSIVE", "the block still says it could not measure");
  });
});

test("★ the HEADLINE case (REVIEW finding 6): every real gate green, one AC skipped — FAIL with ONLY ac-delivery", () => {
  withWorld({}, (w) => {
    const skipped = vitestDoc(w.root, setStatus(w.results, FILE(1), "AC-1: t", "skipped"));
    const r = verifyCli(w, [{ id: "test", exit: 0, results: skipped }, { id: "reconcile" }], ["--ac-gate"]);
    assert.equal(r.code, 1, JSON.stringify(r.doc));
    assert.equal(r.doc.verdict, "FAIL");
    assert.deepEqual(r.doc.failing_gates, ["ac-delivery"]);
    assert.deepEqual(r.doc.gates, { reconcile: 0, test: 0 }, "no real gate is red");
  });
});

test("★ STOP_GREEN's precondition is unreachable for EVERY AC reason: check-verify --ac-gate never says PASS (table over the set)", () => {
  const green = (w) => vitestDoc(w.root, w.results);
  const cases = {
    "ac-untested": (w) => [
      {
        id: "test",
        results: vitestDoc(
          w.root,
          w.results.filter((t) => t.file !== FILE(2))
        ),
      },
    ],
    "ac-not-passed": (w) => [{ id: "test", exit: 1, results: vitestDoc(w.root, setStatus(w.results, FILE(2), "AC-2: t", "failed")) }],
    "ac-skipped": (w) => [{ id: "test", results: vitestDoc(w.root, setStatus(w.results, FILE(2), "AC-2: t", "skipped")) }],
    "ac-tests-modified": (w) => (writeFileSync(join(w.root, FILE(1)), "edited\n"), [{ id: "test", results: green(w) }]),
    "ac-never-red": (w) => {
      const l = JSON.parse(readFileSync(w.lockPath, "utf8"));
      writeFileSync(w.lockPath, JSON.stringify({ ...l, red_run: null }));
      return [{ id: "test", results: green(w) }];
    },
    "test-infra-changed": (w) => {
      writeFileSync(join(w.root, "package.json"), JSON.stringify({ scripts: { test: "vitest run --bail 0" } }));
      return [{ id: "test", results: green(w) }];
    },
    "test-infra-unpinned": (w) => {
      const l = JSON.parse(readFileSync(w.lockPath, "utf8"));
      writeFileSync(w.lockPath, JSON.stringify({ ...l, schema: "ac-tests-lock/2", test_infra: null }));
      return [{ id: "test", results: green(w) }];
    },
    "results-unavailable": () => [{ id: "test" }],
  };
  assert.deepEqual(
    Object.keys(cases)
      .filter((r) => r !== "results-unavailable")
      .sort(),
    [...DELIVERY_REASONS, ...EVIDENCE_REASONS].sort(),
    "every delivery and evidence reason has a row"
  );
  for (const [reason, runsOf] of Object.entries(cases)) {
    withWorld({}, (w) => {
      const r = verifyCli(w, [...runsOf(w), { id: "reconcile" }], ["--ac-gate"]);
      assert.notEqual(r.doc.verdict, "PASS", `${reason}: ${JSON.stringify(r.doc)}`);
      const expectId = DELIVERY_REASONS.includes(reason) ? "ac-delivery" : EVIDENCE_REASONS.includes(reason) ? "ac-evidence" : null;
      if (expectId) assert.ok(r.doc.failing_gates.includes(expectId), `${reason}: ${JSON.stringify(r.doc.failing_gates)}`);
      else assert.equal(r.doc.verdict, "INCONCLUSIVE", reason);
    });
  }
});

// ── check-verify --ac-gate × build-completeness (6.20.4 — INCOMPLETE was unreachable under --ac-gate) ──────────────

/**
 * THE PRECEDENCE, as data (L29 — the enumeration is the deliverable). Every cell of AC class × aux.completeness × the
 * state of one real gate (`lint`), with the verdict and failing_gates check-verify --ac-gate must emit. Before 6.20.4
 * the delivery and unmeasured rows over completeness 1 read FAIL / INCONCLUSIVE, so /pharn-ship Step 2b's rebuild
 * (reachable only from INCOMPLETE) could not fire. L41: every --ac-gate fixture before this one used completeness 0.
 */
const PRECEDENCE = {
  "none/0/green": ["PASS", []],
  "none/1/green": ["INCOMPLETE", []],
  "none/2/green": ["INCONCLUSIVE", []],
  "none/0/red": ["FAIL", ["lint"]],
  "none/1/red": ["FAIL", ["lint"]], // GATE-1 condition 3: a red real gate beats INCOMPLETE under --ac-gate
  "none/2/red": ["FAIL", ["lint"]],
  "delivery/0/green": ["FAIL", ["ac-delivery"]],
  "delivery/1/green": ["INCOMPLETE", []], // the fix: not delivered yet, over a partial tree
  "delivery/2/green": ["FAIL", ["ac-delivery"]],
  "delivery/0/red": ["FAIL", ["ac-delivery", "lint"]],
  "delivery/1/red": ["FAIL", ["ac-delivery", "lint"]], // GATE-1 condition 3
  "delivery/2/red": ["FAIL", ["ac-delivery", "lint"]],
  "evidence/0/green": ["FAIL", ["ac-evidence"]],
  "evidence/1/green": ["FAIL", ["ac-evidence"]], // a rebuild cannot restore evidence: it beats INCOMPLETE
  "evidence/2/green": ["FAIL", ["ac-evidence"]],
  "evidence/0/red": ["FAIL", ["ac-evidence", "lint"]],
  "evidence/1/red": ["FAIL", ["ac-evidence", "lint"]], // GATE-1 condition 3
  "evidence/2/red": ["FAIL", ["ac-evidence", "lint"]],
  "unmeasured/0/green": ["INCONCLUSIVE", []],
  "unmeasured/1/green": ["INCOMPLETE", []], // the fix, option A (GATE 1): could-not-measure over a partial tree
  "unmeasured/2/green": ["INCONCLUSIVE", []],
  "unmeasured/0/red": ["FAIL", ["lint"]],
  "unmeasured/1/red": ["FAIL", ["lint"]], // GATE-1 condition 3
  "unmeasured/2/red": ["FAIL", ["lint"]],
};
const EXIT_OF = { PASS: 0, FAIL: 1, INCONCLUSIVE: 2, INCOMPLETE: 3 };

test("★ check-verify --ac-gate PRECEDENCE over every AC class × completeness × real-gate cell (INCOMPLETE reachable again)", () => {
  // One world per AC class; the `test` run that puts the gate in that class, over a green or red `lint`.
  const classes = {
    none: (w) => ({ id: "test", results: vitestDoc(w.root, w.results) }),
    delivery: (w) => ({ id: "test", results: vitestDoc(w.root, setStatus(w.results, FILE(1), "AC-1: t", "skipped")) }),
    evidence: (w) => (writeFileSync(join(w.root, FILE(1)), "edited\n"), { id: "test", results: vitestDoc(w.root, w.results) }),
    unmeasured: () => ({ id: "test" }), // no per-test results → results-unavailable
  };
  const seen = new Set();
  for (const [cls, testRun] of Object.entries(classes)) {
    withWorld({}, (w) => {
      const run = testRun(w);
      for (const complete of [0, 1, 2]) {
        for (const gate of ["green", "red"]) {
          const key = `${cls}/${complete}/${gate}`;
          const [verdict, failing] = PRECEDENCE[key];
          const runs = [run, { id: "lint", exit: gate === "red" ? 1 : 0 }, { id: "reconcile" }];
          const r = verifyCli(w, runs, ["--ac-gate"], { complete });
          assert.equal(r.doc.verdict, verdict, `${key}: ${JSON.stringify(r.doc)}`);
          assert.equal(r.code, EXIT_OF[verdict], key);
          assert.deepEqual(r.doc.failing_gates, failing, key);
          assert.ok(r.doc.ac_gate && typeof r.doc.ac_gate.verdict === "string", `${key}: the ac_gate block is kept`);
          seen.add(key);
        }
      }
    });
  }
  assert.deepEqual([...seen].sort(), Object.keys(PRECEDENCE).sort(), "every cell of the table was run");
});

test("★ the review's repro: a partly built spec_kind: test-infra feature reads INCOMPLETE, so Step 2b's rebuild can fire", () => {
  const w = bootWorld(["unit"]);
  try {
    // `lint` is green; the `test` script is not written yet (no level gate ran); check-build-complete said 1.
    let r = verifyCli(w, [{ id: "lint" }, { id: "reconcile" }], ["--ac-gate"], { complete: 1 });
    assert.equal(r.code, 3, JSON.stringify(r.doc));
    assert.equal(r.doc.verdict, "INCOMPLETE");
    assert.deepEqual(r.doc.failing_gates, []);
    assert.equal(r.doc.ac_gate.mode, "bootstrap");
    assert.deepEqual(
      r.doc.ac_gate.acs.map((a) => [a.id, a.reason]),
      [["AC-1", "ac-untested"]],
      "the AC reading stays in the report"
    );
    // the SAME tree, complete: the not-delivered AC is an ordinary delivery FAIL, unchanged
    r = verifyCli(w, [{ id: "lint" }, { id: "reconcile" }], ["--ac-gate"], { complete: 0 });
    assert.equal(r.code, 1);
    assert.deepEqual(r.doc.failing_gates, ["ac-delivery"]);
  } finally {
    w.done();
  }
});

test("★ a >64 KiB --ac-gate report reaches a PIPE whole (the check-loop-fresh check E shape: spawnSync + JSON.parse)", () => {
  // The review's repro-big-acgate shape: 12 ACs × 40 parametrized tests with realistic long titles.
  const NAC = 12;
  const PER = 40;
  withWorld({ levels: Array.from({ length: NAC }, () => "unit") }, (w) => {
    const title = (id, k) => `${id}: Given a cart holding item #${k} and a logged-in customer When the customer pays Then an order exists`;
    const lock = JSON.parse(readFileSync(w.lockPath, "utf8"));
    lock.red_run.acs = w.ids.map((id) => ({
      id,
      tests: Array.from({ length: PER }, (_, k) => tid(FILE(id.slice(3)), title(id, k))).sort(),
    }));
    writeFileSync(w.lockPath, JSON.stringify(lock, null, 2));
    const results = w.ids.flatMap((id) =>
      Array.from({ length: PER }, (_, k) => ({ file: FILE(id.slice(3)), title: title(id, k), status: "passed" }))
    );
    const r = verifyCli(w, [{ id: "test", results: vitestDoc(w.root, results) }, { id: "reconcile" }], ["--ac-gate"]);
    assert.equal(r.code, 0, `verdict ${r.doc.verdict}`);
    assert.equal(r.doc.verdict, "PASS");
    assert.ok(r.bytes > 65536, `the report must exceed the 64 KiB pipe buffer to test anything (${r.bytes} bytes)`);
    assert.equal(r.doc.ac_gate.acs.length, NAC);
    for (const ac of r.doc.ac_gate.acs) assert.equal(ac.tests.length, PER, ac.id);
  });
});

test("★ an explicit --gates run NAMES itself in the detail (test-first and bootstrap); a shell or other argv does not", () => {
  withWorld({}, (w) => {
    const doc = vitestDoc(w.root, w.results);
    const explicit = gateOf(w, { runs: [{ id: "test", results: doc }, { id: "reconcile" }], source: "explicit" });
    only(explicit, "test-infra-changed", "FAIL");
    assert.match(explicit.evidence[0].detail, /gate source is "explicit" .*re-run \/pharn-verify without --gates/);
    const argv = gateOf(w, { runs: [{ id: "test", results: doc, argv: ["npx", "vitest", "run"] }, { id: "reconcile" }] });
    only(argv, "test-infra-changed", "FAIL");
    assert.doesNotMatch(argv.evidence[0].detail, /--gates/, "a discovered run never blames --gates");
    assert.match(argv.evidence[0].detail, /shell or a command other than the discovered one/);
  });
  const b = bootWorld(["unit"]);
  try {
    const passed = vitestDoc(b.root, [{ file: "a.test.js", title: "t", status: "passed" }]);
    const at = (runs, source) => evaluateAcGate({ feature: NAME, stamp: stampOf(b, runs, { source }), outDir: b.outDir, root: b.root });
    const explicit = at([{ id: "test", results: passed }, { id: "reconcile" }], "explicit");
    only(explicit, "ac-untested", "FAIL");
    assert.match(explicit.acs[0].detail, /the test gate ran, but not as the discovered .*re-run \/pharn-verify without --gates/);
    const argv = at([{ id: "test", results: passed, argv: ["npx", "vitest"] }, { id: "reconcile" }], "discover");
    assert.doesNotMatch(argv.acs[0].detail, /--gates/);
    assert.match(argv.acs[0].detail, /ran, but not as the discovered/);
    const none = at([{ id: "lint" }, { id: "reconcile" }], "discover");
    assert.match(none.acs[0].detail, /the runner is not delivered yet/, "no level gate ran at all: unchanged");
  } finally {
    b.done();
  }
});

test("check-verify --ac-gate without --stamp is a usage error, never a verdict", () => {
  const r = spawnSync(process.execPath, [CHECK_VERIFY, "results.json", "--feature", NAME, "--ac-gate"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.equal(JSON.parse(r.stdout).reason_code, "usage-error");
});

// ── closure (L36) ─────────────────────────────────────────────────────────────────────────────────────────────

test("✧ the reason sets are a PARTITION: delivery, evidence and item 01's record reasons, disjoint, union = AC_GATE_REASONS", () => {
  const all = [...DELIVERY_REASONS, ...EVIDENCE_REASONS, ...RECORD_REASONS];
  assert.equal(new Set(all).size, all.length, "the three sets overlap");
  assert.deepEqual([...AC_GATE_REASONS], [...all].sort());
  assert.deepEqual([...AC_GATE_MODES].sort(), ["bootstrap", "not-applicable", "test-first"]);
  assert.deepEqual([...AC_GATE_VERDICTS].sort(), ["FAIL", "INCONCLUSIVE", "NOT-APPLICABLE", "PASS"]);
  assert.deepEqual([...AC_STATUSES].sort(), ["failed", "none", "passed", "skipped", "unavailable"]);
  assert.deepEqual(Object.values(FAILING_IDS).sort(), ["ac-delivery", "ac-evidence"]);
  for (const id of Object.values(FAILING_IDS)) assert.ok(RESERVED_IDS.includes(id), `${id} is not a reserved gate id`);
});

test("✧ CLOSURE — every reason literal the module emits is a member, and every delivery/evidence reason was REACHED above", () => {
  const src = readFileSync(join(HERE, "ac-gate-core.mjs"), "utf8");
  const literals = new Set([
    ...[...src.matchAll(/reason: "([a-z-]+)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/add\("([a-z-]+)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/ac\.reason = "([a-z-]+)"/g)].map((m) => m[1]),
  ]);
  const strays = [...literals].filter((r) => !AC_GATE_REASONS.includes(r));
  assert.deepEqual(strays, [], `emitted outside AC_GATE_REASONS: ${strays.join(", ")}`);
  for (const r of [...DELIVERY_REASONS, ...EVIDENCE_REASONS]) assert.ok(REACHED.has(r), `no fixture reached ${r} (L52)`);
});

// ── 6.20.5: the SPEC's pin is read the way check-spec reads it, and an unreadable one is evidence, not a skip ──────

const specPath = (w) => join(w.fd, "SPEC.md");
const editSpec = (w, fn) => writeFileSync(specPath(w), fn(readFileSync(specPath(w), "utf8")));

test("6.20.5: a test-first SPEC whose pin cannot be read is ac-tests-modified (was: the comparison was SKIPPED and the gate PASSED)", () => {
  withWorld({}, (w) => {
    editSpec(w, (t) => t.replace(/^spec_content_hash: [0-9a-f]{64}$/m, 'spec_content_hash: ""'));
    const g = gateOf(w);
    assert.deepEqual(reasonsOf(g), ["ac-tests-modified"], JSON.stringify(g, null, 1));
    assert.equal(g.verdict, "FAIL");
    assert.match(g.evidence[0].detail, /pin cannot be read/);
  });
});

test("6.20.5: a duplicated pin is read LAST-wins, as check-spec reads it — a stale line above is ignored, a changed one below is not", () => {
  withWorld({}, (w) => {
    const real = readFileSync(specPath(w), "utf8").match(/^spec_content_hash: ([0-9a-f]{64})$/m)[1];
    editSpec(w, (t) => t.replace(`spec_content_hash: ${real}`, `spec_content_hash: ${"b".repeat(64)}\nspec_content_hash: ${real}`));
    assert.equal(gateOf(w).verdict, "PASS", "the stale copy ABOVE the real pin is not the one check-spec reads");
    editSpec(w, (t) => t.replace(`spec_content_hash: ${real}`, `spec_content_hash: ${real}\nspec_content_hash: ${"c".repeat(64)}`));
    assert.deepEqual(reasonsOf(gateOf(w)), ["ac-tests-modified"], "a different pin BELOW the real one is the effective pin");
  });
});

test("6.20.5 BOUND, pinned: the gate reads the pin, never `state` — a Draft that still carries the locked pin passes HERE", () => {
  // Stated in ac-gate-core.mjs's header: /pharn-verify's chain check and /pharn-loop's freshness check I refuse it.
  withWorld({}, (w) => {
    editSpec(w, (t) => t.replace("state: Approved", "state: Draft"));
    assert.equal(gateOf(w).verdict, "PASS");
  });
});

test("6.20.5 bootstrap: a SPEC re-approved by APPENDING a new pin under the old one is ac-tests-modified (was a bootstrap PASS)", () => {
  const w = bootWorld();
  try {
    const old = readFileSync(join(w.fd, "SPEC.md"), "utf8").match(/^spec_content_hash: ([0-9a-f]{64})$/m)[1];
    // The re-approval check-spec sees: a new pin line appended under the old one (last-wins reads the new one).
    editSpec(w, (t) => t.replace(`spec_content_hash: ${old}`, `spec_content_hash: ${old}\nspec_content_hash: ${"d".repeat(64)}`));
    const doc = vitestDoc(w.root, [{ file: "src/any.test.js", title: "works", status: "passed" }]);
    const g = evaluateAcGate({
      feature: NAME,
      stamp: stampOf(w, [{ id: "test", results: doc }, { id: "reconcile" }]),
      outDir: w.outDir,
      root: w.root,
    });
    assert.notEqual(g.verdict, "PASS", JSON.stringify(g, null, 1));
    assert.ok(reasonsOf(g).includes("ac-tests-modified"), JSON.stringify(g, null, 1));
  } finally {
    w.done();
  }
});
