// pharn/floor/check-verify.test.mjs — hermetic tests for the deterministic verify-verdict core.
//
// NO `claude -p`, NO network, and no git EXCEPT one test: the 6.59.0 live GATE-1 pin initialises a scratch git
// repository in os.tmpdir() and drives the real run-gates.mjs there. The verdict reads ONE small
// { gate-id: exit-code } results map we compose in an os.tmpdir() scratch dir. We assert the public surface (exit code + stdout JSON) by
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
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
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
    fingerprint: { algo: "worktree-fingerprint/2+sha256", init: A64, final: B64 },
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
  // changed where the map comes from and NOTHING about the decision table. Since 6.59.0 ONE row exists only on the
  // stamp path — a run the runner did not measure (timed out, or exit 126/127) — so these maps hold no such run; that
  // divergence is pinned by the 6.59.0 tests at the end of this file.
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

// ===================================================================================================
// 6.59.0 — a gate the runner did NOT measure (unmeasured-gates-inconclusive; the 2026-10-12 review's LOOP-1).
// A run killed at --timeout-ms (`timed_out: true`, whatever exit) or unable to start (exit 126/127) makes the stamp-path
// verdict INCONCLUSIVE `gate-not-measured`, FIRST in the precedence. Every property has a control that keeps today's
// verdict (L34); the cause set is iterated, never one member (L29).
// ===================================================================================================

/** mkStamp, with the named runs recorded as killed by the runner. */
function mkTimedOutStamp(gates, timedOut, over = {}) {
  const s = mkStamp(gates, over);
  for (const r of s.runs) if (timedOut.includes(r.id)) r.timed_out = true;
  return s;
}

/** Each unmeasured shape: [label, gates, timed-out ids, the expected unmeasured_gates]. */
const UNMEASURED_WORLDS = [
  ["timed out, exit 124 (the group signal ended it)", { test: 124, lint: 0 }, ["test"], [{ id: "test", cause: "timed-out" }]],
  ["timed out, exit 1 (node's runner on the group signal)", { test: 1, lint: 0 }, ["test"], [{ id: "test", cause: "timed-out" }]],
  [
    "timed out, exit 0 (a gate that traps SIGTERM — a PASS before 6.59.0)",
    { test: 0, lint: 0 },
    ["test"],
    [{ id: "test", cause: "timed-out" }],
  ],
  ["not started, exit 127 (ENOENT / command not found)", { test: 127, lint: 0 }, [], [{ id: "test", cause: "not-started" }]],
  ["not started, exit 126 (EACCES / not executable)", { test: 0, lint: 126 }, [], [{ id: "lint", cause: "not-started" }]],
];

test("★ 6.59.0 — EVERY unmeasured shape is INCONCLUSIVE `gate-not-measured`, exit 2, the gate named, `gates` kept", () => {
  const causes = new Set();
  for (const [label, gates, timedOut, want] of UNMEASURED_WORLDS) {
    withStamp(mkTimedOutStamp(gates, timedOut), (p) => {
      const r = run(["--stamp", p, "--feature", "demo"]);
      assert.equal(r.status, 2, `${label}: ${r.stdout}`);
      const j = json(r);
      assert.equal(j.verdict, "INCONCLUSIVE", label);
      assert.equal(j.reason_code, "gate-not-measured", label);
      assert.deepEqual(j.unmeasured_gates, want, label);
      assert.deepEqual(j.failing_gates, [], `${label}: an unmeasured gate is never a failing gate`);
      assert.deepEqual(j.gates, gates, `${label}: the recorded exits stay visible`);
      assert.ok(j.gate_run, `${label}: the provenance block stays`);
      assert.match(j.reason, /not measured/, label);
      for (const u of want) causes.add(u.cause);
    });
  }
  assert.deepEqual([...causes].sort(), ["not-started", "timed-out"], "every cause was produced (non-vacuous — L34)");
});

test("★ GATE-1 pin — a timed-out gate that EXITED 0 is INCONCLUSIVE, not PASS; the same stamp without the kill is PASS", () => {
  // The false green the plan's probe found: a gate that traps the runner's SIGTERM and exits 0 is recorded
  // `exit 0, timed_out: true`, and every exit in the stamp is 0. Before 6.59.0 that read PASS.
  const gates = { test: 0, lint: 0, reconcile: 0 };
  withStamp(mkTimedOutStamp(gates, ["test"]), (p) => {
    const r = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "INCONCLUSIVE");
    assert.deepEqual(json(r).unmeasured_gates, [{ id: "test", cause: "timed-out" }]);
  });
  withStamp(mkTimedOutStamp(gates, []), (p) => {
    const r = run(["--stamp", p, "--feature", "demo"]);
    assert.equal(r.status, 0, "CONTROL: the same exits, run to completion, are a PASS");
    assert.equal(json(r).verdict, "PASS");
    assert.equal(Object.hasOwn(json(r), "unmeasured_gates"), false, "no key when every gate was measured (byte-identical)");
  });
});

test("★ 6.59.0 PRECEDENCE — an unmeasured gate wins over a measured red, a reconcile red and INCOMPLETE (first)", () => {
  const cases = [
    ["beside a measured red", { test: 124, lint: 1 }, ["test"], {}],
    ["beside a reconcile red", { test: 0, lint: 127, reconcile: 1 }, [], {}],
    ["over an incomplete build", { test: 124, lint: 0 }, ["test"], { aux: { completeness: 1 } }],
    ["over an inconclusive completeness", { test: 127 }, [], { aux: { completeness: 2 } }],
  ];
  for (const [label, gates, timedOut, over] of cases) {
    withStamp(mkTimedOutStamp(gates, timedOut, over), (p) => {
      const r = run(["--stamp", p, "--feature", "demo"]);
      assert.equal(r.status, 2, label);
      const j = json(r);
      assert.equal(j.verdict, "INCONCLUSIVE", label);
      assert.equal(j.reason_code, "gate-not-measured", label);
      assert.deepEqual(j.failing_gates, [], `${label}: the measured reds stay in gates, not failing_gates`);
      assert.deepEqual(j.gates, gates, label);
    });
  }
  // CONTROLS: the same reds with every gate measured keep today's verdicts.
  withStamp(mkTimedOutStamp({ test: 1, lint: 1 }, []), (p) => assert.equal(json(run(["--stamp", p, "--feature", "demo"])).verdict, "FAIL"));
  withStamp(mkTimedOutStamp({ test: 0 }, [], { aux: { completeness: 1 } }), (p) =>
    assert.equal(json(run(["--stamp", p, "--feature", "demo"])).verdict, "INCOMPLETE")
  );
});

test("★ 6.59.0 — a signal exit the runner did NOT cause, and exits 2/125, stay a MEASURED failure (Q1)", () => {
  for (const exit of [2, 125, 128, 134, 137, 139, 143]) {
    withStamp(mkTimedOutStamp({ test: exit, lint: 0 }, []), (p) => {
      const r = run(["--stamp", p, "--feature", "demo"]);
      assert.equal(r.status, 1, `exit ${exit}`);
      assert.equal(json(r).verdict, "FAIL", `exit ${exit}`);
      assert.deepEqual(json(r).failing_gates, ["test"], `exit ${exit}`);
      assert.equal(Object.hasOwn(json(r), "unmeasured_gates"), false, `exit ${exit}`);
    });
  }
});

test("★ 6.59.0 — the POSITIONAL map keeps its table: 124/126/127 are plain failures there (the dev twin is unchanged)", () => {
  // The positional map carries exits alone — nothing says how a run ended — so the new row never fires there, and
  // /pharn-dev-verify (which types the map) and .dev/floor/check-ship.mjs see byte-identical output.
  withResults({ test: 124, lint: 127, build: 126 }, (p) => {
    const r = run([p, "--feature", "demo"]);
    assert.equal(r.status, 1);
    assert.deepEqual(json(r), {
      feature: "demo",
      gates: { build: 126, lint: 127, test: 124 },
      verdict: "FAIL",
      failing_gates: ["build", "lint", "test"],
    });
  });
});

test("★ GATE-1 pin, live — the REAL runner records a gate that handles SIGTERM as exit 0 + timed_out, and the verdict is INCONCLUSIVE; check-loop then stops STOP_TERMINAL (never CONTINUE)", () => {
  // The plan's probe, as a test. It needs git and /bin/sh (POSIX, like run-gates.mjs itself). The runner injects
  // `instruction-growth` and `reconcile`, which read red in a scratch repo, so this half cannot show "was PASS" — the
  // hand-built pin above does; this one shows the runner really writes the stamp shape that pin reads.
  // PLATFORM-INDEPENDENT BY CONSTRUCTION (CI, PR #345): the first cut used `sh -c 'trap "exit 0" TERM; sleep 30 & wait'`,
  // which exited 0 on darwin but 124 on ubuntu-latest, where the runner's own `/bin/sh -c '<token> "$@"'` wrapper is dash.
  // The mechanism, measured on darwin by forcing a wrapper that cannot exec its command (`true; <token>`): bash and
  // macOS sh then record that old token as 124 — the wrapper shell, which no trap governs, is in the group when the group
  // SIGTERM lands and ends by it — and the new token as 0 (Ubuntu itself was not run locally). The handler is now a node
  // process the token `exec`s into — `exec` replaces the wrapper shell on every POSIX shell, so node is the only process
  // in the group and decides the exit itself, having installed its handler long before a 3000 ms kill. A plain
  // `sleep 30` gate beside it is the timed-out row that needs no premise about any shell (the group signal ends it: 124).
  const root = realpathSync(mkdtempSync(join(tmpdir(), "cv-live-")));
  try {
    const sh = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
    sh("git", ["init", "-q"]);
    mkdirSync(join(root, "pharn/features/demo"), { recursive: true });
    writeFileSync(join(root, "a.txt"), "x\n");
    writeFileSync(join(root, ".gitignore"), ".pharn/\n");
    writeFileSync(join(root, "pharn/features/demo/PLAN.md"), "---\nspec_id: demo\n---\n# PLAN\n\n## Files\n\n- a.txt — x\n");
    // A file, not `node -e`: `--gates` splits on commas, and the handler needs one.
    writeFileSync(join(root, "on-term-exit-0.mjs"), 'process.on("SIGTERM", () => process.exit(0));\nsetInterval(() => {}, 1000);\n');
    sh("git", ["add", "-A"]);
    sh("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "init"]);
    const RG = join(here, "run-gates.mjs");
    assert.ok(
      !process.execPath.includes(",") && !process.execPath.includes('"'),
      "fixture: the node path must survive the --gates grammar"
    );
    const gates = [
      `exec "${process.execPath}" on-term-exit-0.mjs::trapzero`,
      "sleep 30::hang",
      "nosuchbinary_pharn_xyz::missing",
      "true::ok",
    ].join(",");
    const init = sh(process.execPath, [RG, "init", "--stage", "verify", "--feature", "demo", "--out", ".pharn/v", "--gates", gates]);
    assert.equal(init.status, 0, init.stdout + init.stderr);
    for (let i = 0; i < 10; i++) {
      // 3000 ms (GATE-2 review F1): wide enough that a loaded machine's /bin/sh has installed its trap before the
      // group SIGTERM lands, so the premise below is never a load artifact.
      const r = sh(process.execPath, [RG, "run", "--next", "--out", ".pharn/v", "--timeout-ms", "3000"]);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      if (JSON.parse(r.stdout).finalized) break;
    }
    const stamp = JSON.parse(readFileSync(join(root, ".pharn/v/stamp.json"), "utf8"));
    const byId = Object.fromEntries(stamp.runs.map((r) => [r.id, r]));
    assert.equal(byId.trapzero.exit, 0, "the premise: the gate that handles SIGTERM exited 0");
    assert.equal(byId.trapzero.timed_out, true, "the premise: the runner recorded its kill");
    assert.equal(byId.hang.exit, 124, "the premise: a hang the group signal ended is 124");
    assert.equal(byId.hang.timed_out, true);
    assert.equal(byId.missing.exit, 127, "the premise: an unstartable command is 127");
    assert.equal(byId.ok.timed_out, false);
    const cv = sh(process.execPath, [CV, "--stamp", ".pharn/v/stamp.json", "--feature", "demo"]);
    assert.equal(cv.status, 2, cv.stdout);
    const report = JSON.parse(cv.stdout);
    assert.equal(report.verdict, "INCONCLUSIVE");
    assert.equal(report.reason_code, "gate-not-measured");
    assert.deepEqual(report.unmeasured_gates, [
      { id: "trapzero", cause: "timed-out" },
      { id: "hang", cause: "timed-out" },
      { id: "missing", cause: "not-started" },
    ]);
    // The review's reproduction, end to end: the report the runner's stamp yields stops the loop terminally.
    mkdirSync(join(root, "f"));
    writeFileSync(join(root, "f/verify-report.json"), cv.stdout);
    writeFileSync(join(root, "f/regression-report.json"), JSON.stringify({ verdict: "no-regressions" }));
    const cl = sh(process.execPath, [
      join(here, "check-loop.mjs"),
      "f/verify-report.json",
      "f/regression-report.json",
      "--iter",
      "1",
      "--cap",
      "3",
    ]);
    assert.equal(cl.status, 4, cl.stdout);
    assert.equal(JSON.parse(cl.stdout).decision, "STOP_TERMINAL");
    assert.equal(JSON.parse(cl.stdout).terminal_cause, "unmeasured");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── ✧ CONTRACT BINDING (audit 2026-10-12 ARCH-9) — the verdicts this EMITTER writes against verify-report.md's enum ────
// check-verify.mjs keeps no verdict set: it emits each verdict as a `verdict: "<X>"` literal (the CLI runs main() on
// import, so a set could not be imported anyway). verify-report.md states the artifact's enum as "the union —
// `{…}`" of its per-consumer table. Two bindings, both by set EQUALITY (L36): the literals this source emits equal that
// union, and the union equals the union of the table's rows (the contract agrees with itself). Every parser throws on
// a missing anchor (L60). BOUND (L43): agreement between texts, never that the enum is right; and the literal scan sees
// the source, so a verdict built from a variable (none today) would escape it.
const VERIFY_REPORT = join(here, "..", "pharn-contracts", "verify-report.md");

function contractVerdictUnion(text) {
  const m = /The artifact's enum is the union — `\{([A-Z_]+(?:, [A-Z_]+)*)\}`/.exec(text);
  if (!m) throw new Error('verify-report.md: the sentence "The artifact\'s enum is the union — `{…}`" was not found');
  return m[1].split(", ").sort();
}

/** The per-consumer `verdict` table → Map(basename → sorted values). Throws on a missing header or a malformed row. */
function contractVerdictTable(text) {
  const lines = text.split("\n");
  const h = lines.findIndex((l) => /^\|\s*consumer\s*\|\s*accepted `verdict` set\s*\|\s*on a value outside it\s*\|\s*$/.test(l));
  if (h < 0) throw new Error("verify-report.md: the per-consumer `verdict` table header was not found");
  const rows = new Map();
  for (let i = h + 2; i < lines.length && lines[i].startsWith("|"); i++) {
    const cells = lines[i]
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    const file = /^`(?:[^`]*\/)?([^`/]+\.mjs)`$/.exec(cells[0] ?? "");
    if (!file || !/^`[A-Z_]+`(?: · `[A-Z_]+`)*$/.test(cells[1] ?? ""))
      throw new Error(`verify-report.md: malformed verdict-table row: ${lines[i]}`);
    rows.set(
      file[1],
      cells[1]
        .split(" · ")
        .map((t) => t.slice(1, -1))
        .sort()
    );
  }
  if (rows.size === 0) throw new Error("verify-report.md: the verdict table has no rows");
  return rows;
}

const rowsUnion = (rows) => [...new Set([...rows.values()].flat())].sort();
const emittedVerdicts = (src) => [...new Set([...src.matchAll(/\bverdict: "([A-Z_]+)"/g)].map((m) => m[1]))].sort();

test("✧ ARCH-9 — the verdict literals check-verify.mjs emits equal verify-report.md's stated union", () => {
  const emitted = emittedVerdicts(readFileSync(CV, "utf8"));
  assert.ok(emitted.length > 0, 'the scan found no `verdict: "…"` literal — the emitter\'s shape changed; re-anchor');
  const union = contractVerdictUnion(readFileSync(VERIFY_REPORT, "utf8"));
  assert.deepEqual(emitted, union, "check-verify.mjs's emitted verdicts and verify-report.md's union differ — edit both");
});

test("✧ ARCH-9 — verify-report.md's stated union equals the union of its per-consumer table rows", () => {
  const text = readFileSync(VERIFY_REPORT, "utf8");
  assert.deepEqual(rowsUnion(contractVerdictTable(text)), contractVerdictUnion(text));
});

test("✧ ARCH-9 negative controls — a mutated union, an extra emitted literal, a row value, and a missing anchor fail", () => {
  const text = readFileSync(VERIFY_REPORT, "utf8");
  const src = readFileSync(CV, "utf8");
  const union = contractVerdictUnion(text);
  assert.notDeepEqual(
    contractVerdictUnion(text.replace("{PASS, FAIL, INCOMPLETE, INCONCLUSIVE}", "{PASS, FAIL, INCONCLUSIVE}")),
    emittedVerdicts(src)
  );
  assert.notDeepEqual(emittedVerdicts(src + '\nemit({ verdict: "SKIPPED" }, 0);\n'), union);
  const line = text.split("\n").find((l) => /^\|\s*`[^`]*check-loop\.mjs`/.test(l));
  assert.ok(line, "the check-loop.mjs row must exist for the row mutant to mean anything");
  const widened = text.replace(line, line.replace("`INCONCLUSIVE`", "`INCONCLUSIVE` · `SKIPPED`"));
  assert.notDeepEqual(rowsUnion(contractVerdictTable(widened)), contractVerdictUnion(widened));
  assert.throws(() => contractVerdictUnion(text.replace("The artifact's enum is the union", "The enum is")), /was not found/);
  assert.throws(() => contractVerdictTable(text.replace("accepted `verdict` set", "accepted set")), /header was not found/);
});
