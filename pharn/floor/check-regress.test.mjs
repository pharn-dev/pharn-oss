// pharn/floor/check-regress.test.mjs — hermetic tests for the deterministic regression core.
//
// NO `claude -p`, NO git, NO network. `scope` is pure set math over CLI args; `verdict` reads two small
// results maps we compose in an os.tmpdir() scratch dir. We assert the public surface (exit code +
// stdout JSON) by subprocess, mirroring check-variance.test.mjs / check-structural.test.mjs.
//
// The ★ tests are load-bearing — they are the whole reason /regress is floor, not judgment:
//   • a changed path outside the declared writes IS a blocking fix#7 escape (scope);
//   • a GREEN→RED flip outside the feature IS a regression (verdict);
//   • a gate already RED at baseline is EXCLUDED, never blamed on the feature (verdict);
//   • a gate that ran on only one side is INCONCLUSIVE, never a silent pass (verdict, fail-closed P5).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CR = join(here, "check-regress.mjs");

function run(args) {
  return spawnSync(process.execPath, [CR, ...args], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}

// ----------------------------------------------------------------------------- scope (partition) ---

test("scope: clean partition — inside ⊆ declared, outside derived, exit 0", () => {
  const r = run([
    "scope",
    "--changed",
    "floor/check-regress.mjs, floor/check-regress.test.mjs",
    "--declared",
    "floor/check-regress.mjs, floor/check-regress.test.mjs, .claude/commands/regress.md",
    "--tests",
    "floor/check-regress.test.mjs, floor/validate.test.mjs",
    "--eval-pairs",
    "a/expected.json::b/findings.json",
  ]);
  assert.equal(r.status, 0);
  const o = json(r);
  assert.deepEqual(o.escaped, []);
  // the inside test file is excluded from the outside suite; the other remains
  assert.deepEqual(o.outside_tests, ["floor/validate.test.mjs"]);
  // both files of the pair are outside the feature → it is an outside gate
  assert.deepEqual(o.outside_eval_pairs, [{ expected: "a/expected.json", actual: "b/findings.json" }]);
});

test("scope: an eval pair touching an INSIDE file is NOT an outside gate", () => {
  const r = run([
    "scope",
    "--changed",
    "a/expected.json",
    "--declared",
    "a/expected.json",
    "--eval-pairs",
    "a/expected.json::b/findings.json",
  ]);
  assert.equal(r.status, 0);
  assert.deepEqual(json(r).outside_eval_pairs, []); // expected is inside → pair excluded
});

test("★ scope: a changed path outside declared writes → exit 1 + blocking P0 fix#7 finding", () => {
  const r = run(["scope", "--changed", "floor/evil.mjs, floor/check-regress.mjs", "--declared", "floor/check-regress.mjs"]);
  assert.equal(r.status, 1);
  const o = json(r);
  assert.deepEqual(o.escaped, ["floor/evil.mjs"]); // the declared file is NOT flagged
  assert.equal(o.findings.length, 1);
  assert.equal(o.findings[0].type, "FINDING");
  assert.equal(o.findings[0].rule_id, "P0");
  assert.equal(o.findings[0].severity, "blocking");
  assert.equal(o.findings[0].file, "floor/evil.mjs");
});

test("scope: a glob in declared (pharn/features/regress/**) covers nested changed files", () => {
  const r = run(["scope", "--changed", "pharn/features/regress/REGRESSION.md", "--declared", "pharn/features/regress/**"]);
  assert.equal(r.status, 0);
  assert.deepEqual(json(r).escaped, []);
});

// --- escape-exempt: the L17 floor check (the pipeline's own artifacts + the trusted docs) ------------
//
// The first case IS the live defect, as a regression test: with `base = HEAD` on a working-tree dogfood,
// the feature's own PLAN.md / GRILL.md land in `git diff` and were reported as a BLOCKING P0 fix#7
// "the build escaped its scope" — provably false, since each is written by its OWN stage under that
// stage's own Step-0 scope. Measured 11 times before this fix, hand-excluded every time.

test("★ escape-exempt: the feature's OWN pipeline artifacts are not escapes (the L17 defect, fixed)", () => {
  const r = run([
    "scope",
    "--changed",
    ".dev/features/my-feat/PLAN.md, .dev/features/my-feat/GRILL.md, pharn/floor/check-spec.mjs",
    "--declared",
    "pharn/floor/check-spec.mjs",
    "--feature",
    "my-feat",
  ]);
  assert.equal(r.status, 0);
  const j = json(r);
  assert.deepEqual(j.escaped, []);
  // Reported, never silently dropped — the operator can still see what was suppressed.
  assert.deepEqual(j.escape_exempt.sort(), [".dev/features/my-feat/GRILL.md", ".dev/features/my-feat/PLAN.md"]);
});

test("escape-exempt: the PRODUCT pharn/features/<name>/ root is exempt too, not only .dev/", () => {
  const r = run(["scope", "--changed", "pharn/features/my-feat/VERIFY.md", "--declared", "src/a.ts", "--feature", "my-feat"]);
  assert.equal(r.status, 0);
  assert.deepEqual(json(r).escape_exempt, ["pharn/features/my-feat/VERIFY.md"]);
});

test("escape-exempt is NARROW: a stray file in the feature dir is STILL an escape (exact names, not a glob)", () => {
  const r = run(["scope", "--changed", ".dev/features/my-feat/notes.md", "--declared", "src/a.ts", "--feature", "my-feat"]);
  assert.equal(r.status, 1);
  assert.deepEqual(json(r).escaped, [".dev/features/my-feat/notes.md"]);
  assert.deepEqual(json(r).escape_exempt, []);
});

test("escape-exempt is PER-FEATURE: another feature's PLAN.md is STILL an escape", () => {
  const r = run(["scope", "--changed", ".dev/features/other/PLAN.md", "--declared", "src/a.ts", "--feature", "my-feat"]);
  assert.equal(r.status, 1);
  assert.deepEqual(json(r).escaped, [".dev/features/other/PLAN.md"]);
});

test("escape-exempt is FAIL-CLOSED: with no --feature, an artifact is NOT exempt", () => {
  const r = run(["scope", "--changed", ".dev/features/my-feat/PLAN.md", "--declared", "src/a.ts"]);
  assert.equal(r.status, 1);
  assert.deepEqual(json(r).escaped, [".dev/features/my-feat/PLAN.md"]);
});

test("escape-exempt: an EMPTY-segment path is not exempt — the `!feature` guard is load-bearing, not decorative", () => {
  // Without the early `if (!feature) return false`, an absent --feature would build the prefix
  // `.dev/features//` and this crafted path (an untrusted --changed operand; git never emits it) would
  // be silently exempted. This is the one input where the guard changes the answer, so it is the one
  // that pins it.
  const r = run(["scope", "--changed", ".dev/features//PLAN.md", "--declared", "src/a.ts"]);
  assert.equal(r.status, 1);
  assert.deepEqual(json(r).escape_exempt, []);
  // An explicitly EMPTY --feature is refused outright by the shape gate — stronger than merely inert.
  const empty = run(["scope", "--changed", "pharn/features//PLAN.md", "--declared", "src/a.ts", "--feature", ""]);
  assert.equal(empty.status, 2);
  assert.match(empty.stdout, /inconclusive/);
});

test("escape-exempt: a crafted --feature is REJECTED fail-closed (exit 2), not merely ineffective", () => {
  // The first cut only asserted "does not exempt ANOTHER feature", which a crafted value satisfies while
  // still exempting something else: `--feature ..` builds the prefix `.dev/features/../` and DID exempt
  // `.dev/features/../PLAN.md` (i.e. `.dev/PLAN.md`), outside every feature dir. Refuse the value instead.
  for (const feature of ["*", "**", "..", "../..", "my-feat/../other", "a/b", "/abs", "with space"]) {
    const r = run(["scope", "--changed", ".dev/features/other/PLAN.md", "--declared", "src/a.ts", "--feature", feature]);
    assert.equal(r.status, 2, `--feature ${JSON.stringify(feature)} must be refused`);
    assert.match(r.stdout, /inconclusive/);
  }
  // The exact traversal that used to slip through:
  const r = run(["scope", "--changed", ".dev/features/../PLAN.md", "--declared", "src/a.ts", "--feature", ".."]);
  assert.equal(r.status, 2);
});

// --- D1 (BLOCKING): the enum was written from the DEV loop's artifacts and omitted the PRODUCT ones, so
// /pharn-regress RED'd on every product run. BUILD.md is the sharp case: /pharn-build writes it under a
// SEPARATE re-scope, and `--declared` is the plan's `## Files`, so it is STRUCTURALLY never declared.

test("★ escape-exempt covers the PRODUCT artifacts too — BUILD.md / SPEC.md / findings.json", () => {
  const r = run([
    "scope",
    "--changed",
    "pharn/features/my-feat/SPEC.md,pharn/features/my-feat/BUILD.md,pharn/features/my-feat/findings.json,src/impl.ts",
    "--declared",
    "src/impl.ts",
    "--feature",
    "my-feat",
  ]);
  assert.equal(r.status, 0, r.stdout);
  assert.deepEqual(json(r).escaped, []);
  assert.equal(json(r).escape_exempt.length, 3);
});

test("escape-exempt covers a lens's NESTED findings.json, and only that shape", () => {
  const ok = run(["scope", "--changed", "pharn/features/f/lenses/security/findings.json", "--declared", "src/a.ts", "--feature", "f"]);
  assert.equal(ok.status, 0);
  assert.deepEqual(ok.escape_exempt ?? json(ok).escape_exempt, ["pharn/features/f/lenses/security/findings.json"]);
  // deeper nesting, and any other filename under lenses/, are STILL escapes
  for (const p of ["pharn/features/f/lenses/a/b/findings.json", "pharn/features/f/lenses/security/notes.md"]) {
    const bad = run(["scope", "--changed", p, "--declared", "src/a.ts", "--feature", "f"]);
    assert.equal(bad.status, 1, `${p} must still be an escape`);
  }
});

test("★ recurrence guard: the enum covers EVERY pharn/features/<name>/ artifact the commands declare", () => {
  // The defect this pins is not "a name is missing" but "the list was written from memory". Derive the
  // truth from the commands themselves; a newly-added artifact now fails HERE instead of REDding a
  // user's pipeline. Files (not directories) only — `lenses` is a dir, covered by its own nested shape.
  const cmdDir = join(here, "..", "..", ".claude", "commands");
  const declared = new Set();
  for (const f of readdirSync(cmdDir).filter((n) => n.endsWith(".md"))) {
    const text = readFileSync(join(cmdDir, f), "utf8");
    for (const m of text.matchAll(/features\/<name>\/([A-Za-z0-9._-]+)/g)) {
      if (m[1].includes(".")) declared.add(m[1]); // has an extension => a file, not a directory
    }
  }
  assert.ok(declared.size >= 10, `expected to discover the artifact set, found ${declared.size}`);
  const missing = [...declared].filter((name) => {
    const r = run(["scope", "--changed", `pharn/features/probe/${name}`, "--declared", "src/a.ts", "--feature", "probe"]);
    return r.status !== 0;
  });
  assert.deepEqual(missing, [], `PIPELINE_ARTIFACTS is missing artifact(s) the commands declare: ${missing}`);
});

test("★ ENUMERATION (L23/L29): every machine-written JSON pipeline artifact is in .prettierignore — a new one fails until classified", () => {
  // THE RECORDED FAILURE (6.20.5): AC-TESTS.lock.json is JSON.stringify(…, null, 2) output that `prettier --check`
  // rejects, and it was the one machine-written pipeline artifact .prettierignore did not list — a test-first dogfood
  // run here failed its own `format:check`. The rule is quantified over a SET, so the set is materialized: every
  // `.json` member of PIPELINE_ARTIFACTS, parsed from source, must be CLASSIFIED below (closure), and every
  // machine-written one must be ignored. A new JSON artifact fails here until someone decides which it is.
  const src = readFileSync(join(here, "check-regress.mjs"), "utf8");
  const block = src.match(/const PIPELINE_ARTIFACTS = \[([\s\S]*?)\n\];/);
  assert.ok(block, "PIPELINE_ARTIFACTS must be parseable from check-regress.mjs");
  const json = [...block[1].matchAll(/"([^"]+\.json)"/g)].map((m) => m[1]).sort();
  // name → the floor module that writes it (the command's verbatim copy of that module's stdout, for the two reports)
  const MACHINE_WRITTEN = {
    "AC-TESTS.lock.json": "ac-tests-lock.mjs",
    "assignments.json": "render-review-assignments.mjs",
    "cost.json": "render-cost-ledger.mjs",
    "findings.json": "merge-findings.mjs",
    "regression-report.json": "check-regress.mjs",
    "verify-report.json": "check-verify.mjs",
  };
  // name → why it is not machine-written (so the ignore rule does not apply)
  const MODEL_WRITTEN = { "ship-record.json": "/pharn-ship writes it with the Write tool; only record_hash is computed" };
  assert.deepEqual(
    json,
    [...Object.keys(MACHINE_WRITTEN), ...Object.keys(MODEL_WRITTEN)].sort(),
    "every .json pipeline artifact is classified, and nothing else is"
  );
  assert.ok(json.length >= 7, `non-vacuity: found ${json.length} JSON artifacts`);
  const ignored = new Set(readFileSync(join(here, "..", "..", ".prettierignore"), "utf8").split(/\r?\n/));
  for (const [name, writer] of Object.entries(MACHINE_WRITTEN)) {
    assert.match(readFileSync(join(here, writer), "utf8"), /JSON\.stringify\(/, `${writer} must be the machine writer it is classified as`);
    assert.ok(ignored.has(`pharn/features/*/${name}`), `.prettierignore must list pharn/features/*/${name} (written by ${writer})`);
  }
});

// --- D3: a space is a legal filename character and `git diff --name-only` does not quote it. Splitting
// --changed on whitespace turned ONE real path into TWO tokens which the exempt sets then absorbed.

test("★ a space-containing path is ONE path, not two exempt tokens (escape laundering)", () => {
  // Before the fix this exited 0 with escape_exempt naming two trusted docs that were never touched.
  const r = run(["scope", "--changed", "THREAT-MODEL.md LIMITS.md", "--declared", "src/a.ts"]);
  assert.equal(r.status, 1, r.stdout);
  assert.deepEqual(json(r).escaped, ["THREAT-MODEL.md LIMITS.md"]);
  assert.deepEqual(json(r).escape_exempt, []);
});

test("a space-containing path cannot be laundered through the feature exemption either", () => {
  const r = run(["scope", "--changed", "src/a.ts pharn/features/f/PLAN.md", "--declared", "src/a.ts", "--feature", "f"]);
  assert.equal(r.status, 1);
  assert.deepEqual(json(r).escaped, ["src/a.ts pharn/features/f/PLAN.md"]);
});

test("comma lists still tolerate spaces AROUND the separator (normPath trims)", () => {
  const r = run(["scope", "--changed", "src/a.ts, src/b.ts", "--declared", "src/a.ts, src/b.ts"]);
  assert.equal(r.status, 0);
  assert.deepEqual(json(r).inside, ["src/a.ts", "src/b.ts"]);
});

test("escape-exempt: a hook-protected trusted doc is exempt, and needs no --feature", () => {
  const r = run(["scope", "--changed", "pharn/ARCHITECTURE.md, THREAT-MODEL.md", "--declared", "src/a.ts"]);
  assert.equal(r.status, 0);
  assert.deepEqual(json(r).escape_exempt.sort(), ["THREAT-MODEL.md", "pharn/ARCHITECTURE.md"]);
});

test("escape-exempt: a NON-protected doc at the root is still an escape (the enum is the four, exactly)", () => {
  const r = run(["scope", "--changed", "README.md, CHANGELOG.md", "--declared", "src/a.ts"]);
  assert.equal(r.status, 1);
  assert.deepEqual(json(r).escaped.sort(), ["CHANGELOG.md", "README.md"]);
});

test("escape-exempt does NOT suppress a genuine escape alongside exempt paths", () => {
  const r = run([
    "scope",
    "--changed",
    ".dev/features/my-feat/PLAN.md, pharn/floor/evil.mjs",
    "--declared",
    "src/a.ts",
    "--feature",
    "my-feat",
  ]);
  assert.equal(r.status, 1);
  assert.deepEqual(json(r).escaped, ["pharn/floor/evil.mjs"]);
  assert.deepEqual(json(r).escape_exempt, [".dev/features/my-feat/PLAN.md"]);
  assert.equal(json(r).findings.length, 1);
  assert.equal(json(r).findings[0].rule_id, "P0");
  assert.equal(json(r).findings[0].severity, "blocking");
});

test("escape_exempt is emitted on the CLEAN path too (always present, so absence is never ambiguous)", () => {
  const r = run(["scope", "--changed", "src/a.ts", "--declared", "src/a.ts"]);
  assert.equal(r.status, 0);
  assert.deepEqual(json(r).escape_exempt, []);
});

test("scope: a glob in --tests → inconclusive exit 2 (expand it first, fail-closed)", () => {
  const r = run(["scope", "--changed", "floor/check-regress.mjs", "--declared", "floor/check-regress.mjs", "--tests", "floor/*.test.mjs"]);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /inconclusive/);
});

test("scope: a malformed --eval-pairs token (no '::') → inconclusive exit 2 (fail-closed)", () => {
  const r = run([
    "scope",
    "--changed",
    "floor/check-regress.mjs",
    "--declared",
    "floor/check-regress.mjs",
    "--eval-pairs",
    "a/expected.json::b/findings.json, oops-no-separator",
  ]);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /inconclusive/);
});

test("scope: missing required args → inconclusive exit 2", () => {
  const r = run(["scope", "--changed", "a"]); // no --declared
  assert.equal(r.status, 2);
  assert.match(r.stdout, /inconclusive/);
});

// ------------------------------------------------------------------------------- verdict (compare) ---

function withResults(base, head, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-regress-"));
  try {
    const b = join(root, "base.json");
    const h = join(root, "head.json");
    writeFileSync(b, JSON.stringify(base));
    writeFileSync(h, JSON.stringify(head));
    return fn(b, h, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("verdict: no flips → no-regressions, exit 0", () => {
  withResults({ tests: 0, validate: 0 }, { tests: 0, validate: 0 }, (b, h) => {
    const r = run(["verdict", b, h]);
    assert.equal(r.status, 0);
    assert.equal(json(r).verdict, "no-regressions");
  });
});

test("★ verdict: a 0→1 flip outside the feature → regression, exit 1, gate-id named", () => {
  withResults({ tests: 0, validate: 0 }, { tests: 1, validate: 0 }, (b, h) => {
    const r = run(["verdict", b, h, "--base", "abc123", "--inside", "floor/check-regress.mjs"]);
    assert.equal(r.status, 1);
    const o = json(r);
    assert.equal(o.verdict, "regressions");
    assert.deepEqual(o.regressions, ["tests"]);
    assert.deepEqual(o.pre_existing, []);
    assert.equal(o.base, "abc123"); // provenance echoed into the report verbatim
    assert.deepEqual(o.inside, ["floor/check-regress.mjs"]);
    assert.deepEqual(o.outside_gates.tests, { base: 0, head: 1 });
  });
});

test("★ verdict: a gate already RED at baseline stays red → EXCLUDED (pre-existing), exit 0", () => {
  withResults({ tests: 1, validate: 0 }, { tests: 1, validate: 0 }, (b, h) => {
    const r = run(["verdict", b, h]);
    assert.equal(r.status, 0); // base != 0 → pre-existing, never blamed on the feature
    const o = json(r);
    assert.deepEqual(o.regressions, []);
    assert.deepEqual(o.pre_existing, ["tests"]);
    assert.equal(o.verdict, "no-regressions");
  });
});

test("verdict: a gate red at base but GREEN at head is a fix, not a regression → exit 0", () => {
  withResults({ tests: 1 }, { tests: 0 }, (b, h) => {
    const r = run(["verdict", b, h]);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r).pre_existing, ["tests"]);
    assert.deepEqual(json(r).regressions, []);
  });
});

test("verdict: missing a results file → inconclusive exit 2", () => {
  withResults({ tests: 0 }, { tests: 0 }, (b, _h, root) => {
    const r = run(["verdict", b, join(root, "nope.json")]);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /inconclusive/);
  });
});

test("verdict: a non-integer exit code → inconclusive exit 2 (fail-closed)", () => {
  withResults({ tests: "0" }, { tests: 0 }, (b, h) => {
    const r = run(["verdict", b, h]);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /inconclusive/);
  });
});

test("verdict: an empty results map → inconclusive exit 2", () => {
  withResults({}, {}, (b, h) => {
    const r = run(["verdict", b, h]);
    assert.equal(r.status, 2);
  });
});

test("★ verdict: gate-set mismatch (a gate ran on one side only) → inconclusive exit 2, never a silent pass", () => {
  withResults({ tests: 0, validate: 0 }, { tests: 0 }, (b, h) => {
    const r = run(["verdict", b, h]);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /gate set mismatch/);
  });
});
// ── ✧ L2: gate-set membership must be an OWN-property test (lessons-learned L15) ──────────────────

function withMaps(baseObj, headObj, fn) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-regress-proto-"));
  try {
    const b = join(dir, "base.json");
    const h = join(dir, "head.json");
    writeFileSync(b, JSON.stringify(baseObj));
    writeFileSync(h, JSON.stringify(headObj));
    return fn(b, h);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("✧ L2: a HEAD gate id colliding with an Object.prototype member is not silently treated as shared", () => {
  // `"toString" in {test:0}` is TRUE via the prototype chain, so with `in` the extra gate dropped out of
  // onlyHead, the mismatch check passed, and the verdict came back no-regressions at exit 0 — where a
  // gate-set mismatch is contractually INCONCLUSIVE (exit 2).
  const r = withMaps({ test: 0 }, { toString: 1, test: 0 }, (b, h) => run(["verdict", b, h, "--base", "HEAD", "--inside", "x"]));
  assert.notEqual(r.status, 0, "must not report no-regressions");
  assert.equal(r.status, 2, "a gate-set mismatch is inconclusive, exit 2");
});

test("✧ L2: the same holds for a prototype-named gate present only in BASE", () => {
  const r = withMaps({ valueOf: 0, test: 0 }, { test: 0 }, (b, h) => run(["verdict", b, h, "--base", "HEAD", "--inside", "x"]));
  assert.equal(r.status, 2, "a base-only prototype-named gate is still a gate-set mismatch");
});

test("✧ L2: identical gate sets still compare equal (the fix did not over-tighten)", () => {
  const r = withMaps({ test: 0, validate: 0 }, { test: 0, validate: 0 }, (b, h) =>
    run(["verdict", b, h, "--base", "HEAD", "--inside", "x"])
  );
  assert.equal(r.status, 0, "matching gate sets must still pass");
});

// ===================================================================================================
// The OPT-IN stamp surface on `verdict` (gate-run-stamp increment).
//
// PROVENANCE, not semantics: the same two maps, read out of stamps instead of hand-written results.json
// files, must produce the IDENTICAL verdict. The two checks that exist only on this path — the base
// stamp's recorded `head` vs `--base`, and side-spec agreement — are each paired with a control. The L43
// bound is proven by CONSTRUCTING a self-consistent fabricated pair and showing it passes.
// ===================================================================================================

const A64 = "a".repeat(64);
const B64 = "b".repeat(64);
const SHA = "0".repeat(40);

function mkRegressStamp(gates, side, over = {}) {
  const ids = Object.keys(gates);
  const runs = ids.map((id, i) => ({
    seq: i,
    id,
    exit: gates[id],
    ran: true,
    timed_out: false,
    mutated: false,
    reason: null,
    fp_before: A64,
    fp_after: i === ids.length - 1 ? B64 : A64,
    stdout_sha256: A64,
    stderr_sha256: A64,
  }));
  return {
    schema: "gate-run-record/1",
    stage: "regress",
    side,
    feature: "demo",
    head: side === "base" ? SHA : "1".repeat(40),
    source: "discover",
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: "worktree-fingerprint/1+sha256", init: A64, final: B64 },
    required: ids,
    runs,
    aux: {},
    ...over,
  };
}

function withPair(baseStamp, headStamp, fn) {
  const dir = mkdtempSync(join(tmpdir(), "cr-stamp-"));
  const bp = join(dir, "base.json");
  const hp = join(dir, "head.json");
  writeFileSync(bp, JSON.stringify(baseStamp, null, 2));
  writeFileSync(hp, JSON.stringify(headStamp, null, 2));
  try {
    return fn(bp, hp, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("★ EQUIVALENCE — stamps yield the IDENTICAL verdict to the flag-less run, over EVERY fixture pair", () => {
  const pairs = [
    [{ test: 0 }, { test: 0 }], // clean
    [{ test: 0 }, { test: 1 }], // a regression
    [{ test: 1 }, { test: 1 }], // pre-existing, excluded
    [
      { test: 0, lint: 0 },
      { test: 0, lint: 2 },
    ], // one flip among several
    [
      { test: 1, lint: 0 },
      { test: 1, lint: 1 },
    ], // pre-existing AND a regression
  ];
  assert.ok(pairs.length > 0, "the fixture set is empty — this rule would be vacuous");
  for (const [b, h] of pairs) {
    const dir = mkdtempSync(join(tmpdir(), "cr-eq-"));
    try {
      const bp = join(dir, "b.json");
      const hp = join(dir, "h.json");
      writeFileSync(bp, JSON.stringify(b));
      writeFileSync(hp, JSON.stringify(h));
      const flagless = run(["verdict", bp, hp, "--base", SHA]);
      const viaStamp = withPair(mkRegressStamp(b, "base"), mkRegressStamp(h, "head"), (x, y) =>
        run(["verdict", "--base-stamp", x, "--head-stamp", y, "--base", SHA])
      );
      assert.equal(viaStamp.status, flagless.status, `exit differed for ${JSON.stringify([b, h])}`);
      const a = JSON.parse(flagless.stdout);
      const c = JSON.parse(viaStamp.stdout);
      delete c.gate_run;
      assert.deepEqual(c, a, `verdict differed for ${JSON.stringify([b, h])}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("★ the stamp path adds a PER-SIDE `gate_run` block and nothing else", () => {
  withPair(mkRegressStamp({ test: 0 }, "base"), mkRegressStamp({ test: 0 }, "head"), (b, h) => {
    const r = run(["verdict", "--base-stamp", b, "--head-stamp", h, "--base", SHA]);
    assert.equal(r.status, 0);
    const j = JSON.parse(r.stdout);
    assert.deepEqual(Object.keys(j.gate_run).sort(), ["base", "head"]);
    assert.match(j.gate_run.base.stamp_sha256, /^[0-9a-f]{64}$/);
    assert.match(j.gate_run.head.stamp_sha256, /^[0-9a-f]{64}$/);
  });
});

test("★ the BASE stamp's recorded head must equal --base (the check only a stamp can support)", () => {
  withPair(mkRegressStamp({ test: 0 }, "base", { head: "9".repeat(40) }), mkRegressStamp({ test: 0 }, "head"), (b, h) => {
    const r = run(["verdict", "--base-stamp", b, "--head-stamp", h, "--base", SHA]);
    assert.equal(r.status, 2);
    assert.equal(JSON.parse(r.stdout).reason_code, "base-head-mismatch");
  });
  // Control: the matching head is accepted, so the refusal is about the mismatch and nothing else.
  withPair(mkRegressStamp({ test: 0 }, "base"), mkRegressStamp({ test: 0 }, "head"), (b, h) => {
    assert.equal(run(["verdict", "--base-stamp", b, "--head-stamp", h, "--base", SHA]).status, 0);
  });
});

test("★ --base must be a 40-hex SHA on the stamp path — a symbolic ref is refused", () => {
  withPair(mkRegressStamp({ test: 0 }, "base"), mkRegressStamp({ test: 0 }, "head"), (b, h) => {
    for (const ref of ["HEAD", "main", "abc", ""]) {
      const r = run(["verdict", "--base-stamp", b, "--head-stamp", h, "--base", ref]);
      assert.equal(r.status, 2, `accepted --base ${JSON.stringify(ref)}`);
      assert.equal(JSON.parse(r.stdout).reason_code, "base-not-sha");
    }
  });
});

test("★ the two sides' SPECS must agree — a divergent gate set is `spec-mismatch`", () => {
  withPair(mkRegressStamp({ test: 0 }, "base"), mkRegressStamp({ test: 0, lint: 0 }, "head"), (b, h) => {
    const r = run(["verdict", "--base-stamp", b, "--head-stamp", h, "--base", SHA]);
    assert.equal(r.status, 2);
    assert.equal(JSON.parse(r.stdout).reason_code, "spec-mismatch");
  });
});

test("★ a side whose stamp records the WRONG side is `side-mismatch`; a feature mismatch is its own code", () => {
  withPair(mkRegressStamp({ test: 0 }, "head"), mkRegressStamp({ test: 0 }, "head"), (b, h) => {
    assert.equal(JSON.parse(run(["verdict", "--base-stamp", b, "--head-stamp", h, "--base", SHA]).stdout).reason_code, "side-mismatch");
  });
  withPair(mkRegressStamp({ test: 0 }, "base"), mkRegressStamp({ test: 0 }, "head", { feature: "other" }), (b, h) => {
    assert.equal(JSON.parse(run(["verdict", "--base-stamp", b, "--head-stamp", h, "--base", SHA]).stdout).reason_code, "feature-mismatch");
  });
});

test("★ stamp refusals: missing, malformed, unfinalized, coverage — each with its own code", () => {
  const good = mkRegressStamp({ test: 0 }, "head");
  const cases = [
    [mkRegressStamp({ test: 0 }, "base", { finalized: false }), good, "stamp-unfinalized"],
    [mkRegressStamp({ test: 0 }, "base", { schema: "nope" }), good, "stamp-malformed"],
    [mkRegressStamp({ test: 0 }, "base", { required: ["test", "lint"] }), good, "coverage-violation"],
  ];
  for (const [b, h, code] of cases) {
    withPair(b, h, (x, y) => {
      const r = run(["verdict", "--base-stamp", x, "--head-stamp", y, "--base", SHA]);
      assert.equal(r.status, 2, `expected inconclusive for ${code}`);
      assert.equal(JSON.parse(r.stdout).reason_code, code);
    });
  }
  const r = run(["verdict", "--base-stamp", "/nope/b.json", "--head-stamp", "/nope/h.json", "--base", SHA]);
  assert.equal(JSON.parse(r.stdout).reason_code, "stamp-missing");
});

test("★ the stamp flags are MUTUALLY EXCLUSIVE with the positional maps, and must come as a PAIR", () => {
  withPair(mkRegressStamp({ test: 0 }, "base"), mkRegressStamp({ test: 0 }, "head"), (b, h, dir) => {
    const m = join(dir, "m.json");
    writeFileSync(m, JSON.stringify({ test: 0 }));
    const both = run(["verdict", m, m, "--base-stamp", b, "--head-stamp", h, "--base", SHA]);
    assert.equal(JSON.parse(both.stdout).reason_code, "usage-error");
    const lone = run(["verdict", "--base-stamp", b, "--base", SHA]);
    assert.equal(JSON.parse(lone.stdout).reason_code, "usage-error");
  });
});

test("★ L43 BOUND, PROVEN NOT ASSERTED — a self-consistent FABRICATED pair passes", () => {
  // Hand-built, never produced by run-gates.mjs. Internally consistent, therefore accepted — which is
  // precisely the claim's limit. "The checker accepted these stamps" never means "these gates ran".
  withPair(mkRegressStamp({ test: 0, lint: 0 }, "base"), mkRegressStamp({ test: 0, lint: 0 }, "head"), (b, h) => {
    const r = run(["verdict", "--base-stamp", b, "--head-stamp", h, "--base", SHA]);
    assert.equal(r.status, 0, "the fabricated pair was rejected — then this bound is overstated and the header must change");
    assert.equal(JSON.parse(r.stdout).verdict, "no-regressions");
  });
});
