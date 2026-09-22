// pharn/floor/check-verify.test.mjs — hermetic tests for the deterministic verify-verdict core.
//
// NO `claude -p`, NO git, NO network. The verdict reads ONE small { gate-id: exit-code } results map we
// compose in an os.tmpdir() scratch dir. We assert the public surface (exit code + stdout JSON) by
// subprocess, mirroring check-regress.test.mjs / check-variance.test.mjs / check-structural.test.mjs.
//
// The ★ tests are load-bearing — they are the whole reason /verify's verdict is FLOOR, not judgment:
//   • ALL gates green → PASS (exit 0); ANY gate non-zero → FAIL (exit 1), the offender named;
//   • a missing / empty / malformed results map → INCONCLUSIVE (exit 2), fail-closed, NEVER a silent
//     pass — and DISTINCT from FAIL, which a bare shell `&&` chain cannot express;
//   • the emitted spine is EXACTLY {feature, gates, verdict, failing_gates} with NO free-text key — the
//     verdict's INPUT cannot even carry a verifier finding, so it is provably independent of one (P2).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CV = join(here, "check-verify.mjs");

function run(args) {
  return spawnSync(process.execPath, [CV, ...args], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
// compose a results.json in a scratch dir, run the helper over it, clean up.
function withResults(results, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-verify-"));
  try {
    const p = join(root, "results.json");
    writeFileSync(p, JSON.stringify(results));
    return fn(p, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("★ verdict: ALL gates green → PASS, exit 0, no failing gates", () => {
  withResults({ test: 0, validate: 0, lint: 0, "structural:a/expected.json": 0 }, (p) => {
    const r = run([p, "--feature", "verify"]);
    assert.equal(r.status, 0);
    const o = json(r);
    assert.equal(o.verdict, "PASS");
    assert.deepEqual(o.failing_gates, []);
    assert.equal(o.feature, "verify"); // provenance echoed verbatim
    assert.deepEqual(o.gates, { test: 0, validate: 0, lint: 0, "structural:a/expected.json": 0 });
  });
});

test("★ verdict: ANY gate non-zero → FAIL, exit 1, the offender named", () => {
  withResults({ test: 0, validate: 0, lint: 1 }, (p) => {
    const r = run([p, "--feature", "verify"]);
    assert.equal(r.status, 1);
    const o = json(r);
    assert.equal(o.verdict, "FAIL");
    assert.deepEqual(o.failing_gates, ["lint"]); // exactly the red gate
    assert.equal(o.gates.lint, 1);
  });
});

test("verdict: multiple red gates → FAIL, ALL named (sorted), exit 1", () => {
  withResults({ test: 1, validate: 0, lint: 2 }, (p) => {
    const r = run([p]);
    assert.equal(r.status, 1);
    assert.deepEqual(json(r).failing_gates, ["lint", "test"]); // sorted, both offenders
  });
});

test("★ verdict: the emitted spine has NO free-text key (verdict is exit-codes-only, P2)", () => {
  withResults({ test: 0 }, (p) => {
    const r = run([p, "--feature", "x"]);
    const o = json(r);
    assert.deepEqual(Object.keys(o).sort(), ["failing_gates", "feature", "gates", "verdict"]);
    // no channel exists for a verifier finding's free-text to enter the verdict object
    for (const k of ["problem", "evidence", "findings", "verifiers", "reason"]) {
      assert.equal(k in o, false, `the PASS/FAIL spine must not carry '${k}'`);
    }
  });
});

test("★ verdict: empty results map → INCONCLUSIVE, exit 2 (fail-closed), distinct from FAIL", () => {
  withResults({}, (p) => {
    const r = run([p]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "INCONCLUSIVE");
  });
});

test("verdict: a missing results file → INCONCLUSIVE, exit 2", () => {
  withResults({ test: 0 }, (_p, root) => {
    const r = run([join(root, "nope.json")]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "INCONCLUSIVE");
  });
});

test("verdict: a non-integer exit code → INCONCLUSIVE, exit 2 (fail-closed)", () => {
  withResults({ test: "0" }, (p) => {
    const r = run([p]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "INCONCLUSIVE");
  });
});

test("verdict: a results map that is a JSON array (not an object) → INCONCLUSIVE, exit 2", () => {
  withResults([0, 0], (p) => {
    const r = run([p]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "INCONCLUSIVE");
  });
});

test("verdict: no results path at all → INCONCLUSIVE, exit 2", () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.equal(json(r).verdict, "INCONCLUSIVE");
});

test("verdict: feature defaults to null when --feature is omitted", () => {
  withResults({ test: 0 }, (p) => {
    const r = run([p]);
    assert.equal(r.status, 0);
    assert.equal(json(r).feature, null);
  });
});

// --- OPTIONAL build-completeness input (ship-completion-retry). `--complete <int>` carries
//     check-build-complete.mjs's exit (0 complete · 1 incomplete · 2 inconclusive). ---

test("★ completeness: --complete 0 + all gates green → PASS, exit 0", () => {
  withResults({ test: 0, lint: 0 }, (p) => {
    const r = run([p, "--complete", "0"]);
    assert.equal(r.status, 0);
    assert.equal(json(r).verdict, "PASS");
  });
});

test("★ completeness: --complete 1 + all gates green → INCOMPLETE, exit 3, no failing gates", () => {
  withResults({ test: 0, lint: 0 }, (p) => {
    const r = run([p, "--complete", "1"]);
    assert.equal(r.status, 3); // distinct exit, like check-ship's exit-3 CONTINUE
    const o = json(r);
    assert.equal(o.verdict, "INCOMPLETE");
    assert.deepEqual(o.failing_gates, []); // no gate failed — it is incompleteness, not a red gate
    // check-verify's stdout stays LEAN (4-key spine); the missing[] detail is the command's `.completeness`.
    assert.deepEqual(Object.keys(o).sort(), ["failing_gates", "feature", "gates", "verdict"]);
  });
});

test("★ completeness: a REAL gate failure BEATS incompleteness → FAIL, not INCOMPLETE (precedence)", () => {
  withResults({ test: 0, lint: 1 }, (p) => {
    const r = run([p, "--complete", "1"]); // build ALSO incomplete, but a gate is red
    assert.equal(r.status, 1); // FAIL wins — /ship must not blindly rebuild over a real bug
    const o = json(r);
    assert.equal(o.verdict, "FAIL");
    assert.deepEqual(o.failing_gates, ["lint"]);
  });
});

test("completeness: --complete 2 (checker inconclusive) → INCONCLUSIVE, exit 2, fail-closed", () => {
  withResults({ test: 0 }, (p) => {
    const r = run([p, "--complete", "2"]);
    assert.equal(r.status, 2);
    const o = json(r);
    assert.equal(o.verdict, "INCONCLUSIVE"); // NOT silently INCOMPLETE or PASS
    assert.match(o.reason, /completeness/i);
  });
});

test("completeness: a malformed --complete (non-0/1/2) → INCONCLUSIVE, exit 2, fail-closed", () => {
  withResults({ test: 0 }, (p) => {
    const r = run([p, "--complete", "x"]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "INCONCLUSIVE");
  });
});

test("★ backward-compat: ABSENT --complete can NEVER yield INCOMPLETE (legacy 3-valued, byte-identical)", () => {
  // gates green, no flag → PASS (exit 0), the exact legacy spine — NOT INCOMPLETE.
  withResults({ test: 0, lint: 0 }, (p) => {
    const r = run([p, "--feature", "x"]);
    assert.equal(r.status, 0);
    const o = json(r);
    assert.equal(o.verdict, "PASS");
    assert.deepEqual(Object.keys(o).sort(), ["failing_gates", "feature", "gates", "verdict"]);
  });
  // a red gate, no flag → FAIL (exit 1), unchanged.
  withResults({ test: 1 }, (p) => {
    const r = run([p]);
    assert.equal(r.status, 1);
    assert.equal(json(r).verdict, "FAIL");
  });
});

// ===================================================================================================
// The OPT-IN `--stamp` surface (gate-run-stamp increment).
//
// The property under test is PROVENANCE, not semantics: the same gate map, read out of a stamp instead
// of a hand-written results.json, must produce the IDENTICAL verdict. Every refusal carries a closed
// reason_code, and the L43 bound is proven by CONSTRUCTING a self-consistent fabricated stamp and
// showing it passes — the bound is demonstrated, not merely asserted in prose.
// ===================================================================================================

const A64 = "a".repeat(64);
const B64 = "b".repeat(64);

/** A valid verify stamp carrying `gates`. Every refusal case below mutates ONE field of this, so each
 *  assertion is attributable to the field it names. */
function mkStamp(gates, over = {}) {
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
    stage: "verify",
    side: null,
    feature: "demo",
    head: "0".repeat(40),
    source: "discover",
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: "worktree-fingerprint/1+sha256", init: A64, final: B64 },
    required: ids.filter((i) => i !== "reconcile"),
    runs,
    aux: { completeness: 0 },
    ...over,
  };
}

function withStamp(stamp, fn) {
  const dir = mkdtempSync(join(tmpdir(), "cv-stamp-"));
  const p = join(dir, "stamp.json");
  writeFileSync(p, JSON.stringify(stamp, null, 2));
  try {
    return fn(p, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("★ EQUIVALENCE — a stamp yields the IDENTICAL verdict to the flag-less run, over EVERY fixture map", () => {
  // Quantified over the whole set of interesting maps, not one (L52): the point is that the stamp path
  // changed where the map comes from and NOTHING about the decision table.
  const maps = [
    { test: 0 },
    { test: 0, lint: 0, reconcile: 0 },
    { test: 1 },
    { test: 0, lint: 2 },
    { test: 0, lint: 0, "structural:a/evals/expected/x.json": 1 },
    { test: 3, lint: 4, reconcile: 5 },
  ];
  assert.ok(maps.length > 0, "the fixture set is empty — this rule would be vacuous");
  for (const map of maps) {
    const dir = mkdtempSync(join(tmpdir(), "cv-eq-"));
    try {
      const rp = join(dir, "results.json");
      writeFileSync(rp, JSON.stringify(map));
      const flagless = run([rp, "--feature", "demo", "--complete", "0"]);
      const viaStamp = withStamp(mkStamp(map), (p) => run(["--stamp", p, "--feature", "demo"]));
      assert.equal(viaStamp.status, flagless.status, `exit differed for ${JSON.stringify(map)}`);
      const a = json(flagless);
      const b = json(viaStamp);
      delete b.gate_run; // the ONLY addition; everything else must match byte-for-byte
      assert.deepEqual(b, a, `verdict differed for ${JSON.stringify(map)}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("★ the stamp path adds an ADDITIVE `gate_run` block and nothing else", () => {
  withStamp(mkStamp({ test: 0 }), (p) => {
    const r = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(r.status, 0);
    const j = json(r);
    assert.deepEqual(Object.keys(j).sort(), ["failing_gates", "gate_run", "gates", "verdict", "feature"].sort());
    assert.deepEqual(Object.keys(j.gate_run).sort(), ["fingerprint", "source", "stamp_sha256"]);
    assert.match(j.gate_run.stamp_sha256, /^[0-9a-f]{64}$/);
  });
});

test("★ INCOMPLETE stays REACHABLE through the stamp path (GRILL R1 — completeness is not a gate)", () => {
  // If completeness were folded into the gates map, this would be FAIL (exit 1) and /pharn-ship Step 2b's
  // single bounded rebuild — reachable only from INCOMPLETE — would be silently dead.
  withStamp(mkStamp({ test: 0 }, { aux: { completeness: 1 } }), (p) => {
    const r = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(r.status, 3, "an incomplete build did not reach the INCOMPLETE verdict");
    assert.equal(json(r).verdict, "INCOMPLETE");
    assert.deepEqual(json(r).failing_gates, [], "completeness leaked into failing_gates");
  });
  // And a REAL red gate still BEATS incompleteness, exactly as on the flag-less path.
  withStamp(mkStamp({ test: 1 }, { aux: { completeness: 1 } }), (p) => {
    const r = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(r.status, 1);
    assert.equal(json(r).verdict, "FAIL");
  });
});

test("★ every stamp REFUSAL carries its own closed reason_code (L52: one case per rule)", () => {
  const cases = [
    [mkStamp({ test: 0 }, { finalized: false }), "stamp-unfinalized"],
    [mkStamp({ test: 0 }, { stage: "regress", side: "head" }), "stage-mismatch"],
    [mkStamp({ test: 0 }, { feature: "other" }), "feature-mismatch"],
    [mkStamp({ test: 0 }, { required: ["test", "lint"] }), "coverage-violation"],
    [mkStamp({ test: 0 }, { schema: "nope" }), "stamp-malformed"],
    [mkStamp({ test: 0 }, { aux: {} }), "stamp-malformed"],
  ];
  for (const [stamp, code] of cases) {
    withStamp(stamp, (p) => {
      const r = run(["--stamp", p, "--feature", "demo"]);
      assert.equal(r.status, 2, `expected INCONCLUSIVE for ${code}`);
      assert.equal(json(r).verdict, "INCONCLUSIVE");
      assert.equal(json(r).reason_code, code);
    });
  }
  // reconcile-not-last needs a two-entry stamp in the wrong order.
  const s = mkStamp({ reconcile: 0, test: 0 });
  withStamp(s, (p) => {
    const r = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(json(r).reason_code, "reconcile-not-last");
  });
});

test("★ a MISSING stamp file is `stamp-missing`; an unparseable one is `stamp-malformed`", () => {
  const r1 = run(["--stamp", "/nope/nowhere/stamp.json", "--feature", "demo"]);
  assert.equal(r1.status, 2);
  assert.equal(json(r1).reason_code, "stamp-missing");
  const dir = mkdtempSync(join(tmpdir(), "cv-bad-"));
  try {
    const p = join(dir, "stamp.json");
    writeFileSync(p, "{not json");
    const r2 = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(json(r2).reason_code, "stamp-malformed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ --stamp is MUTUALLY EXCLUSIVE with a positional map, and REQUIRES --feature", () => {
  withStamp(mkStamp({ test: 0 }), (p, dir) => {
    const rp = join(dir, "results.json");
    writeFileSync(rp, JSON.stringify({ test: 0 }));
    const both = run([rp, "--stamp", p, "--feature", "demo"]);
    assert.equal(both.status, 2);
    assert.equal(json(both).reason_code, "usage-error");
    const noFeature = run(["--stamp", p]);
    assert.equal(noFeature.status, 2);
    assert.equal(json(noFeature).reason_code, "usage-error");
  });
});

test("★ an explicit --complete must AGREE with aux.completeness — a disagreement is a usage error", () => {
  withStamp(mkStamp({ test: 0 }, { aux: { completeness: 0 } }), (p) => {
    assert.equal(run(["--stamp", p, "--feature", "demo", "--complete", "0"]).status, 0, "an agreeing --complete must be accepted");
    const bad = run(["--stamp", p, "--feature", "demo", "--complete", "1"]);
    assert.equal(bad.status, 2);
    assert.equal(json(bad).reason_code, "usage-error");
  });
});

test("★ L43 BOUND, PROVEN NOT ASSERTED — a self-consistent FABRICATED stamp passes", () => {
  // Hand-built, never produced by run-gates.mjs: no gate ever ran, no tree was ever hashed, the digests
  // are invented. It is INTERNALLY CONSISTENT, so it validates — which is exactly the claim's limit.
  // "The checker accepted this stamp" therefore never means "these gates ran".
  const forged = mkStamp({ test: 0, lint: 0, reconcile: 0 });
  withStamp(forged, (p) => {
    const r = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(r.status, 0, "the fabricated stamp was rejected — then this bound is overstated and the header must change");
    assert.equal(json(r).verdict, "PASS");
  });
});

test("★ a fail-closed completeness reason NAMES ITS REAL SOURCE, not a flag the caller never passed", () => {
  // Found by dogfooding the shipped runner end-to-end rather than by reading the code: on the stamp path
  // the message read `--complete undefined`, which sends a reader to an input that was never supplied.
  // Fail-closed behaviour was already correct; only the attribution was wrong.
  withStamp(mkStamp({ test: 0 }, { aux: { completeness: 2 } }), (p) => {
    const r = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(r.status, 2, "an inconclusive completeness must stay fail-closed");
    assert.equal(json(r).verdict, "INCONCLUSIVE");
    assert.match(json(r).reason, /stamp\.aux\.completeness 2/, "the reason must name the stamp field it came from");
    assert.doesNotMatch(json(r).reason, /--complete undefined/, "the reason must not blame a flag the caller never passed");
  });
  // The flag-less path still names the FLAG, because there the flag really is the source.
  const dir = mkdtempSync(join(tmpdir(), "cv-src-"));
  try {
    const rp = join(dir, "results.json");
    writeFileSync(rp, JSON.stringify({ test: 0 }));
    const r = run([rp, "--feature", "demo", "--complete", "2"]);
    assert.equal(r.status, 2);
    assert.match(json(r).reason, /--complete "2"/, "the flag-less path must still attribute to --complete");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
