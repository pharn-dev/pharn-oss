// .dev/floor/check-ship.test.mjs — hermetic tests for the `/pharn-dev-ship --loop` stop-decision core.
//
// NO `claude -p`, NO git, NO network. The decision reads two small report objects ({verdict, …}) we
// compose in an os.tmpdir() scratch dir + two integer flags. We assert the public surface (exit code +
// stdout JSON) by subprocess, mirroring check-verify.test.mjs / check-regress.test.mjs.
//
// The ★ tests are load-bearing — they are the whole reason `--loop` is legal (P0):
//   • both FLOOR verdicts green → STOP_GREEN (0); not-green + under cap → CONTINUE (3); not-green + AT
//     cap → STOP_CAP (1) — bounded, never unbounded; malformed input → INCONCLUSIVE (2), fail-closed,
//     NEVER a silent CONTINUE;
//   • STOP_GREEN needs BOTH verdicts green (verify PASS ∧ regress no-regressions);
//   • the decision object carries NO review/finding/severity channel — `/review` CANNOT gate the loop,
//     structurally (the input does not exist), not by agent discipline.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CS = join(here, "check-ship.mjs");

function run(args) {
  return spawnSync(process.execPath, [CS, ...args], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
// write verify-report.json + regression-report.json in a scratch dir; pass their paths to fn. A null obj
// means "do not write that file" (to test a missing report).
function withReports(verifyObj, regressObj, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-ship-"));
  try {
    const vp = join(root, "verify-report.json");
    const rp = join(root, "regression-report.json");
    if (verifyObj !== null) writeFileSync(vp, JSON.stringify(verifyObj));
    if (regressObj !== null) writeFileSync(rp, JSON.stringify(regressObj));
    return fn(vp, rp, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// the shapes the real stages emit (only `.verdict` is read; extra fields are realistic noise).
const PASS = { feature: "x", gates: {}, verdict: "PASS", failing_gates: [] };
const VFAIL = { feature: "x", gates: { test: 1 }, verdict: "FAIL", failing_gates: ["test"] };
const CLEAN = { verdict: "no-regressions", regressions: [] };
const REGR = { verdict: "regressions", regressions: ["floor/x.test.mjs"] };

test("★ both floor verdicts green → STOP_GREEN, exit 0", () => {
  withReports(PASS, CLEAN, (vp, rp) => {
    const r = run([vp, rp, "--iter", "1", "--cap", "3"]);
    assert.equal(r.status, 0);
    const o = json(r);
    assert.equal(o.decision, "STOP_GREEN");
    assert.equal(o.floor_green, true);
  });
});

test("★ not green + under cap → CONTINUE, exit 3", () => {
  withReports(VFAIL, CLEAN, (vp, rp) => {
    const r = run([vp, rp, "--iter", "1", "--cap", "3"]);
    assert.equal(r.status, 3);
    const o = json(r);
    assert.equal(o.decision, "CONTINUE");
    assert.equal(o.floor_green, false);
  });
});

test("★ not green + AT cap → STOP_CAP, exit 1 (bounded — never unbounded)", () => {
  withReports(VFAIL, CLEAN, (vp, rp) => {
    const r = run([vp, rp, "--iter", "3", "--cap", "3"]);
    assert.equal(r.status, 1);
    assert.equal(json(r).decision, "STOP_CAP");
  });
});

test("★ STOP_GREEN needs BOTH: verify PASS but regress regressions → NOT green → CONTINUE under cap", () => {
  withReports(PASS, REGR, (vp, rp) => {
    const r = run([vp, rp, "--iter", "1", "--cap", "3"]);
    assert.equal(r.status, 3);
    assert.equal(json(r).floor_green, false);
  });
});

test("verify FAIL but regress clean → NOT green (the other half of the AND)", () => {
  withReports(VFAIL, CLEAN, (vp, rp) => {
    assert.equal(json(run([vp, rp, "--iter", "1", "--cap", "3"])).floor_green, false);
  });
});

test("★ off-by-one boundary: iter==cap-1 → CONTINUE (3); iter==cap → STOP_CAP (1)", () => {
  withReports(VFAIL, CLEAN, (vp, rp) => {
    assert.equal(run([vp, rp, "--iter", "2", "--cap", "3"]).status, 3); // under cap → iterate
    assert.equal(run([vp, rp, "--iter", "3", "--cap", "3"]).status, 1); // at cap → bail
  });
});

test("★ /review-independence: the decision object carries NO review/finding/severity channel", () => {
  withReports(PASS, CLEAN, (vp, rp) => {
    const o = json(run([vp, rp, "--iter", "1", "--cap", "3"]));
    assert.deepEqual(Object.keys(o).sort(), ["cap", "decision", "floor_green", "iter", "reason", "regress_verdict", "verify_verdict"]);
    // there is no channel for REVIEW.md / an LLM-assigned severity to enter the loop decision (fix #3)
    for (const k of ["review", "findings", "severity", "problem", "evidence", "blocking"]) {
      assert.equal(k in o, false, `the loop decision must not carry '${k}' — /review cannot gate it`);
    }
  });
});

test("fail-closed: verify .verdict outside the enum → INCONCLUSIVE, exit 2 (not a silent CONTINUE)", () => {
  withReports({ verdict: "GREEN" }, CLEAN, (vp, rp) => {
    const r = run([vp, rp, "--iter", "1", "--cap", "3"]);
    assert.equal(r.status, 2);
    assert.equal(json(r).decision, "INCONCLUSIVE");
  });
});

test("fail-closed: a missing verify-report → INCONCLUSIVE, exit 2", () => {
  withReports(null, CLEAN, (vp, rp) => {
    const r = run([vp, rp, "--iter", "1", "--cap", "3"]);
    assert.equal(r.status, 2);
    assert.equal(json(r).decision, "INCONCLUSIVE");
  });
});

test("fail-closed: regress report missing .verdict → INCONCLUSIVE, exit 2", () => {
  withReports(PASS, { regressions: [] }, (vp, rp) => {
    assert.equal(run([vp, rp, "--iter", "1", "--cap", "3"]).status, 2);
  });
});

test("fail-closed: iter not a positive integer → INCONCLUSIVE, exit 2", () => {
  withReports(PASS, CLEAN, (vp, rp) => {
    assert.equal(run([vp, rp, "--iter", "0", "--cap", "3"]).status, 2); // zero
    assert.equal(run([vp, rp, "--iter", "x", "--cap", "3"]).status, 2); // non-numeric
    assert.equal(run([vp, rp, "--iter", "1.5", "--cap", "3"]).status, 2); // non-integer
  });
});

test("fail-closed: cap omitted → INCONCLUSIVE, exit 2", () => {
  withReports(PASS, CLEAN, (vp, rp) => {
    assert.equal(run([vp, rp, "--iter", "1"]).status, 2);
  });
});

// --- fail-closed argv shape (P5): a malformed invocation must NEVER yield a silent STOP_*/CONTINUE ---

test("fail-closed: an extra positional report path → INCONCLUSIVE, exit 2 (not a silent STOP_GREEN)", () => {
  withReports(PASS, CLEAN, (vp, rp) => {
    const r = run([vp, rp, rp, "--iter", "1", "--cap", "3"]);
    assert.equal(r.status, 2);
    assert.equal(json(r).decision, "INCONCLUSIVE");
  });
});

test("fail-closed: an unrecognized flag → INCONCLUSIVE, exit 2", () => {
  withReports(PASS, CLEAN, (vp, rp) => {
    const r = run([vp, rp, "--iter", "1", "--cap", "3", "--bogus", "x"]);
    assert.equal(r.status, 2);
    assert.equal(json(r).decision, "INCONCLUSIVE");
  });
});

test("fail-closed: a repeated known flag (--iter twice) → INCONCLUSIVE, exit 2 (no first-wins)", () => {
  withReports(VFAIL, CLEAN, (vp, rp) => {
    // Without the guard, indexOf would pick the first --iter (1, CONTINUE) and ignore the second (5).
    const r = run([vp, rp, "--iter", "1", "--iter", "5", "--cap", "3"]);
    assert.equal(r.status, 2);
    assert.equal(json(r).decision, "INCONCLUSIVE");
  });
});

test("fail-closed: a known flag missing its value → INCONCLUSIVE, exit 2", () => {
  withReports(PASS, CLEAN, (vp, rp) => {
    assert.equal(run([vp, rp, "--iter", "1", "--cap"]).status, 2);
  });
});

// ── ✧ CONTRACT BINDING (audit 2026-10-12 ARCH-9) — verify-report.md's verdict table row against the LIVE set ─────────
// pharn/pharn-contracts/verify-report.md lists, per consumer, the `verdict` set it accepts; check-ship.mjs restates its
// own in VERIFY_VERDICTS. The CLI runs main() on import, so the set is read where the checker states it: its refusal of
// an off-contract verdict prints `is not one of {…}` from the very Set it tests membership in. Set EQUALITY (L36), so an
// extra value on either side fails. It survived the move of this checker and its test from pharn/floor/ to
// .dev/floor/ (6.67.2): the contract is found by walking up to the directory that holds it, and the row is matched by
// the basename `check-ship.mjs`, not by its path. Removing the row fails loudly, which is what a binding is for. BOUND (L43): it
// certifies agreement between the contract and the code, never that the set is right.
function findContract(rel) {
  for (let d = here; ; d = dirname(d)) {
    if (existsSync(join(d, rel))) return join(d, rel);
    if (dirname(d) === d) throw new Error(`${rel} not found above ${here}`);
  }
}
const VERIFY_REPORT = findContract(join("pharn", "pharn-contracts", "verify-report.md"));

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

/** The set check-ship.mjs actually tests, read from its own refusal of a verdict no contract names. */
function liveVerifySet() {
  return withReports({ ...PASS, verdict: "NOT_A_CONTRACT_VERDICT" }, CLEAN, (vp, rp) => {
    const r = run([vp, rp, "--iter", "1", "--cap", "3"]);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    const m = /\.verdict "NOT_A_CONTRACT_VERDICT" is not one of \{([^}]*)\}/.exec(json(r).reason);
    assert.ok(m, `check-ship.mjs's refusal no longer prints the set it tests: ${json(r).reason}`);
    return m[1].split(", ").sort();
  });
}

test("✧ ARCH-9 — verify-report.md's check-ship.mjs row equals the verdict set check-ship.mjs tests", () => {
  const row = contractVerdictTable(readFileSync(VERIFY_REPORT, "utf8")).get("check-ship.mjs");
  assert.ok(row, "verify-report.md's verdict table has no check-ship.mjs row");
  assert.deepEqual(liveVerifySet(), row, "check-ship.mjs VERIFY_VERDICTS and its verify-report.md row differ — edit both");
});

test("✧ ARCH-9 negative controls — a value added to or removed from the row, or a missing header, fails", () => {
  const text = readFileSync(VERIFY_REPORT, "utf8");
  const live = liveVerifySet();
  const line = text.split("\n").find((l) => /^\|\s*`[^`]*check-ship\.mjs`/.test(l));
  assert.ok(line, "the check-ship.mjs row must exist for the mutants to mean anything");
  const added = text.replace(line, line.replace("`INCONCLUSIVE`", "`INCONCLUSIVE` · `INCOMPLETE`"));
  assert.notDeepEqual(contractVerdictTable(added).get("check-ship.mjs"), live);
  const removed = text.replace(line, line.replace("`PASS` · ", ""));
  assert.notDeepEqual(contractVerdictTable(removed).get("check-ship.mjs"), live);
  assert.throws(() => contractVerdictTable(text.replace("accepted `verdict` set", "accepted set")), /header was not found/);
  assert.throws(() => contractVerdictTable(text.replace(line, line.replace("`PASS` · ", "PASS or "))), /malformed/);
});
