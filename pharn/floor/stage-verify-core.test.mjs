// pharn/floor/stage-verify-core.test.mjs — the /pharn-verify stage's closed rules, each over members AND
// non-members: VERIFY_PATHS, PHASES/RESUMABLE_PHASES, the progress validator closed in both directions,
// EVAL_PAIR_RULE, classifyVerdict over every verdict/exit pair, checkCompleteness over each of the real checker's
// output shapes, composeReport's key order and collision refusal, the ★ load-graph pin, and the
// no-redeclared-slug-regex pin over the four new modules (GRILL G12).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VERIFY_PATHS,
  PHASES,
  RESUMABLE_PHASES,
  PROGRESS_SCHEMA,
  validateProgress,
  isVerifierCount,
  EXPECTED_RE,
  featureEvalPairs,
  VERDICT_EXIT,
  classifyVerdict,
  checkCompleteness,
  MERGED_KEYS,
  VERIFIER_DEFERRED_NOTE,
  composeReport,
} from "./stage-verify-core.mjs";
import { DEFAULT_STAMPS } from "./loop-fresh-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── ★ LOAD GRAPH (6.23.0 GRILL G8) ──────────────────────────────────────────────────────────────────
const IMPORT_RE = /^import\s+.*?from\s+["']([^"']+)["'];?\s*$/gm;

test("★ LOAD GRAPH — stage-verify-core.mjs imports exactly gate-run-core.mjs", () => {
  const src = readFileSync(join(HERE, "stage-verify-core.mjs"), "utf8");
  assert.deepEqual(
    [...src.matchAll(IMPORT_RE)].map((m) => m[1]),
    ["./gate-run-core.mjs"]
  );
});

test("★ LOAD GRAPH discriminates — an injected second import fails the same scan", () => {
  const src = readFileSync(join(HERE, "stage-verify-core.mjs"), "utf8");
  const mutant = src.replace(
    'import { FEATURE_SLUG_RE, actualForExpected } from "./gate-run-core.mjs";',
    (m) => `${m}\nimport { dataText } from "./quote-core.mjs";`
  );
  assert.notEqual(mutant, src, "the mutation must land — the import line is the anchor");
  assert.notDeepEqual(
    [...mutant.matchAll(IMPORT_RE)].map((m) => m[1]),
    ["./gate-run-core.mjs"]
  );
});

// ── G12 — ONE owner of the slug grammar ─────────────────────────────────────────────────────────────
const NEW_MODULES = ["stage-verify.mjs", "stage-verify-core.mjs", "render-verify.mjs", "stage-runtime.mjs"];
const SLUG_DECL_RE = /\bFEATURE_SLUG_RE\s*=/;

test("G12 — none of the four new modules declares FEATURE_SLUG_RE (it is imported from gate-run-core.mjs)", () => {
  assert.equal(NEW_MODULES.length, 4, "non-vacuity: the module set is counted");
  for (const m of NEW_MODULES) {
    assert.doesNotMatch(readFileSync(join(HERE, m), "utf8"), SLUG_DECL_RE, `${m} re-declares FEATURE_SLUG_RE`);
  }
});

test("G12 discriminates — a local declaration in a module's source is caught by the same pattern", () => {
  const src = readFileSync(join(HERE, "stage-verify.mjs"), "utf8");
  assert.match(`${src}\nconst FEATURE_SLUG_RE = /^[a-z]+$/;\n`, SLUG_DECL_RE);
});

// ── VERIFY_PATHS / PHASES ───────────────────────────────────────────────────────────────────────────
test("VERIFY_PATHS: three entries under the stage root; loop-fresh-core.mjs's DEFAULT_STAMPS.verify derives from it", () => {
  assert.deepEqual(VERIFY_PATHS, {
    root: ".pharn/pharn-verify",
    gates: ".pharn/pharn-verify/gates",
    stageJson: ".pharn/pharn-verify/stage.json",
  });
  assert.equal(DEFAULT_STAMPS.verify, `${VERIFY_PATHS.gates}/stamp.json`);
  const lf = readFileSync(join(HERE, "loop-fresh-core.mjs"), "utf8");
  assert.doesNotMatch(
    lf,
    /verify:\s*"\.pharn\/pharn-verify\/gates\/stamp\.json"/,
    "DEFAULT_STAMPS.verify must be derived, not a second literal"
  );
});

test("PHASES: the eight phases in order; RESUMABLE_PHASES is exactly drain and verdict", () => {
  assert.deepEqual(PHASES, ["fresh", "chain", "pairs", "verifiers", "init", "drain", "verdict", "render"]);
  assert.deepEqual(RESUMABLE_PHASES, ["drain", "verdict"]);
  for (const p of RESUMABLE_PHASES) assert.ok(PHASES.includes(p));
});

// ── THE PROGRESS RECORD ─────────────────────────────────────────────────────────────────────────────
function goodRecord(over = {}) {
  return {
    schema: PROGRESS_SCHEMA,
    feature: "demo",
    timeoutMs: 30000,
    budgetMs: null,
    phase: "drain",
    verifiers: { registered: 0, verifiers: [] },
    ...over,
  };
}

test("validateProgress: a well-formed record passes, at both resumable phases and with a budget", () => {
  assert.deepEqual(validateProgress(goodRecord()), { ok: true });
  assert.deepEqual(validateProgress(goodRecord({ phase: "verdict", budgetMs: 570000 })), { ok: true });
  assert.deepEqual(validateProgress(goodRecord({ verifiers: { registered: 1, verifiers: ["a/v.md"] } })), { ok: true });
});

test("validateProgress: CLOSED both ways — a missing key and an extra key are each refused", () => {
  for (const k of Object.keys(goodRecord())) {
    const rec = goodRecord();
    delete rec[k];
    assert.equal(validateProgress(rec).ok, false, `dropping ${k} must be refused`);
  }
  assert.equal(validateProgress({ ...goodRecord(), extra: 1 }).ok, false, "an extra key must be refused");
  assert.equal(validateProgress(goodRecord({ verifiers: { registered: 0, verifiers: [], x: 1 } })).ok, false);
});

test("validateProgress (G11): EVERY PHASES member outside RESUMABLE_PHASES is refused", () => {
  const outside = PHASES.filter((p) => !RESUMABLE_PHASES.includes(p));
  assert.equal(outside.length, 6, "non-vacuity: the six non-resumable phases are counted");
  for (const p of outside) assert.equal(validateProgress(goodRecord({ phase: p })).ok, false, `phase ${p} must be refused`);
  assert.equal(validateProgress(goodRecord({ phase: "drian" })).ok, false);
});

test("validateProgress: field shapes — schema, slug, timeout, budget, verifier count", () => {
  assert.equal(validateProgress(goodRecord({ schema: "pharn-stage-verify-progress/2" })).ok, false);
  assert.equal(validateProgress(goodRecord({ feature: "Not_A_Slug" })).ok, false);
  assert.equal(validateProgress(goodRecord({ timeoutMs: 0 })).ok, false);
  assert.equal(validateProgress(goodRecord({ budgetMs: -1 })).ok, false);
  assert.equal(validateProgress(goodRecord({ verifiers: { registered: 2, verifiers: ["a"] } })).ok, false, "count must equal the list");
  assert.equal(validateProgress(null).ok, false);
  assert.equal(validateProgress([]).ok, false);
});

test("isVerifierCount: count-verifiers.mjs's real output passes; malformed shapes do not", () => {
  const r = spawnSync(process.execPath, [join(HERE, "count-verifiers.mjs"), join(HERE, "..", "..")], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.ok(isVerifierCount(JSON.parse(r.stdout)), `count-verifiers.mjs's own output must be a member: ${r.stdout}`);
  for (const bad of [
    null,
    [],
    {},
    { registered: -1, verifiers: [] },
    { registered: 0 },
    { registered: 0, verifiers: [1] },
    { registered: "0", verifiers: [] },
  ]) {
    assert.equal(isVerifierCount(bad), false, JSON.stringify(bad));
  }
});

// ── EVAL_PAIR_RULE ──────────────────────────────────────────────────────────────────────────────────
const CAP = "pharn/pharn-review/demo-lens";

test("featureEvalPairs: a declared capability directory's (expected, findings.json) pair is selected", () => {
  const listing = [`${CAP}/evals/expected/x.json`, `${CAP}/findings.json`, `${CAP}/demo-lens.md`];
  assert.deepEqual(featureEvalPairs({ declared: [CAP], listing }), [`${CAP}/evals/expected/x.json`]);
  assert.deepEqual(
    featureEvalPairs({ declared: [`${CAP}/demo-lens.md`], listing }),
    [`${CAP}/evals/expected/x.json`],
    "a file inside counts"
  );
  assert.deepEqual(featureEvalPairs({ declared: [`${CAP}/`], listing }), [`${CAP}/evals/expected/x.json`], "a trailing slash counts");
});

test("featureEvalPairs: non-members — undeclared, no findings.json, a glob above, a root-level evals/", () => {
  const listing = [`${CAP}/evals/expected/x.json`, `${CAP}/findings.json`];
  assert.deepEqual(featureEvalPairs({ declared: ["pharn/pharn-review/other"], listing }), [], "an undeclared capability");
  assert.deepEqual(featureEvalPairs({ declared: [CAP], listing: [`${CAP}/evals/expected/x.json`] }), [], "no findings.json");
  assert.deepEqual(featureEvalPairs({ declared: ["pharn/**"], listing }), [], "a glob ABOVE the directory does not select it");
  assert.deepEqual(featureEvalPairs({ declared: [`${CAP}-2`], listing }), [], "a sibling directory sharing a prefix is not the directory");
  assert.deepEqual(
    featureEvalPairs({ declared: ["evals"], listing: ["evals/expected/x.json", "findings.json"] }),
    [],
    "a root-level evals/ pairs with nothing"
  );
});

test("featureEvalPairs: the LAST /evals/expected/ marker wins; the output is sorted and unique", () => {
  const nested = "pharn/evals/cap/evals/expected/y.json";
  const listing = [
    nested,
    "pharn/evals/cap/findings.json",
    `${CAP}/evals/expected/b.json`,
    `${CAP}/evals/expected/a.json`,
    `${CAP}/findings.json`,
  ];
  assert.deepEqual(featureEvalPairs({ declared: ["pharn/evals/cap", CAP], listing }), [
    nested,
    `${CAP}/evals/expected/a.json`,
    `${CAP}/evals/expected/b.json`,
  ]);
  assert.deepEqual(featureEvalPairs({ declared: [CAP], listing: [...listing, `${CAP}/evals/expected/a.json`] }).length, 2, "unique");
  assert.ok(EXPECTED_RE.test(nested));
  assert.ok(!EXPECTED_RE.test(`${CAP}/evals/expected/sub/z.json`), "a nested file under expected/ is not a pair");
});

// ── classifyVerdict ─────────────────────────────────────────────────────────────────────────────────
test("classifyVerdict: every verdict with its OWN exit code is a verdict (VERDICT_EXIT)", () => {
  assert.deepEqual(VERDICT_EXIT, { PASS: 0, FAIL: 1, INCONCLUSIVE: 2, INCOMPLETE: 3 });
  for (const [verdict, code] of Object.entries(VERDICT_EXIT)) {
    const r = classifyVerdict({ status: code, stdout: JSON.stringify({ verdict, gates: {} }) });
    assert.equal(r.ok, true, verdict);
    assert.equal(r.report.verdict, verdict);
  }
});

test("classifyVerdict: a mismatched pair, a crash, non-JSON, an array and a verdict outside the set are all refused", () => {
  for (const [verdict, code] of Object.entries(VERDICT_EXIT)) {
    for (const other of [0, 1, 2, 3, null]) {
      if (other === code) continue;
      assert.equal(classifyVerdict({ status: other, stdout: JSON.stringify({ verdict }) }).ok, false, `${verdict} beside exit ${other}`);
    }
  }
  assert.equal(classifyVerdict({ status: 1, stdout: "" }).ok, false, "a crash (exit 1, no JSON) is never FAIL");
  assert.equal(classifyVerdict({ status: 0, stdout: "not json" }).ok, false);
  assert.equal(classifyVerdict({ status: 0, stdout: "[]" }).ok, false);
  assert.equal(classifyVerdict({ status: 0, stdout: JSON.stringify({ verdict: "GREEN" }) }).ok, false);
  assert.equal(classifyVerdict({ status: 0, stdout: JSON.stringify({ verdict: "PASS" }), error: new Error("ENOBUFS") }).ok, false);
});

test("L62 — classifyVerdict never throws on a verdict whose toString is not callable (with the String() control)", () => {
  const needle = JSON.parse('{"toString":1}');
  assert.throws(() => String(needle), /Cannot convert object to primitive value/);
  const stdout = JSON.stringify({ verdict: needle });
  assert.doesNotThrow(() => classifyVerdict({ status: 0, stdout }));
  assert.equal(classifyVerdict({ status: 0, stdout }).ok, false);
});

// ── checkCompleteness ───────────────────────────────────────────────────────────────────────────────
test("checkCompleteness: each of check-build-complete.mjs's REAL output shapes is a member", () => {
  const dir = mkdtempSync(join(tmpdir(), "svc-complete-"));
  try {
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "a.js"), "x\n");
    const run = (planText) => {
      writeFileSync(join(dir, "PLAN.md"), planText);
      return spawnSync(process.execPath, [join(HERE, "check-build-complete.mjs"), "PLAN.md", "."], { cwd: dir, encoding: "utf8" });
    };
    const shapes = [
      [run("## Files\n\n- `src/a.js` — a\n"), 0, true],
      [run("## Files\n\n- `src/b.js` — b\n"), 1, false],
      [run("## Files\n\n- `src/**` — glob only\n"), 2, false],
      [run("no files heading\n"), 2, false],
    ];
    for (const [r, code, complete] of shapes) {
      assert.equal(r.status, code, r.stdout);
      const c = checkCompleteness(r.stdout);
      assert.equal(c.ok, true, r.stdout);
      assert.equal(c.value.complete, complete);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkCompleteness: non-members — the empty capture a crash leaves, an array, a string complete, a non-string missing", () => {
  for (const bad of [
    null,
    "",
    "   \n",
    "not json",
    "[]",
    "null",
    '{"complete":"true","missing":[],"skipped":[]}',
    '{"complete":true,"missing":[1],"skipped":[]}',
    '{"complete":true,"missing":[]}',
  ]) {
    assert.equal(checkCompleteness(bad).ok, false, JSON.stringify(bad));
  }
});

test('L62 — checkCompleteness refuses {"toString":1} values without throwing (with the String() control)', () => {
  const needle = '{"toString":1}';
  assert.throws(() => String(JSON.parse(needle)));
  for (const text of [needle, `{"complete":true,"missing":[${needle}],"skipped":[]}`, `{"complete":${needle},"missing":[],"skipped":[]}`]) {
    assert.doesNotThrow(() => checkCompleteness(text));
    assert.equal(checkCompleteness(text).ok, false, text);
  }
});

// ── composeReport ───────────────────────────────────────────────────────────────────────────────────
const CHECKER = {
  feature: "demo",
  gates: { test: 0 },
  verdict: "PASS",
  failing_gates: [],
  gate_run: { source: "discover" },
  ac_gate: { mode: "not-applicable" },
};
const COMPLETE = { plan: "pharn/features/demo/PLAN.md", declared: ["a"], skipped: [], missing: [], complete: true, verdict: "complete" };

test("composeReport: the checker's keys in order, values deep-equal, then completeness and verifiers", () => {
  const r = composeReport({ checker: CHECKER, completeness: COMPLETE, verifiers: { registered: 0, verifiers: [] } });
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.report), [...Object.keys(CHECKER), ...MERGED_KEYS]);
  for (const k of Object.keys(CHECKER)) assert.deepEqual(r.report[k], CHECKER[k]);
  assert.deepEqual(r.report.completeness, COMPLETE, "the capture is carried verbatim");
  assert.deepEqual(r.report.verifiers, { registered: 0, findings: [] }, "no note with zero verifiers");
});

test("composeReport: the deferral note appears only when registered > 0", () => {
  const r = composeReport({ checker: CHECKER, completeness: COMPLETE, verifiers: { registered: 2, verifiers: ["a.md", "b.md"] } });
  assert.deepEqual(r.report.verifiers, { registered: 2, findings: [], note: VERIFIER_DEFERRED_NOTE });
});

test("composeReport (Q2): a checker key named completeness or verifiers is REFUSED, never overwritten", () => {
  assert.deepEqual(MERGED_KEYS, ["completeness", "verifiers"]);
  for (const k of MERGED_KEYS) {
    const r = composeReport({
      checker: { ...CHECKER, [k]: "theirs" },
      completeness: COMPLETE,
      verifiers: { registered: 0, verifiers: [] },
    });
    assert.equal(r.ok, false, `a checker key '${k}' must be refused`);
  }
  assert.equal(composeReport({ checker: [], completeness: COMPLETE, verifiers: { registered: 0, verifiers: [] } }).ok, false);
  assert.equal(composeReport({ checker: CHECKER, completeness: null, verifiers: { registered: 0, verifiers: [] } }).ok, false);
  assert.equal(composeReport({ checker: CHECKER, completeness: COMPLETE, verifiers: { registered: 1, verifiers: [] } }).ok, false);
});
