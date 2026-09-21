// pharn/floor/check-loop-decision.test.mjs — black-box tests for the loop-record CROSS-FILE
// RE-DERIVATION check (does a LOOP.md's recorded `decision` actually reduce from the reports it cites?).
//
// Run as a subprocess (mirrors check-loop-record.test.mjs / check-loop.test.mjs), asserting only the
// checker's public surface (exit code + RED/GREEN stdout). Fixtures are written to a fresh temp dir per
// test — nothing touches the real pharn/features/ tree.
//
// The ★ tests are the load-bearing ones — the whole reason this checker closes the dogfooded gap (P0):
//   • a genuine STOP_GREEN record, whose cited reports actually reduce to it → GREEN;
//   • a record whose cited reports are simply MISSING (the exact shape of the incident this checker
//     exists to catch — a run that skipped regress/verify and hand-wrote a plausible record) → RED;
//   • a record whose recorded decision DISAGREES with a live re-derivation → RED (DECISION_MISMATCH);
//   • a blocked stuck-point stop → GREEN, SKIPPED — never attempts re-derivation (the contract's stated
//     exception: such a record never consulted check-loop.mjs in the first place);
//   • `cap` genuinely matters, not just `iterations` — the SAME reports re-derive to a DIFFERENT decision
//     under a different recorded `cap`, so a record cannot lie about `cap` and still pass.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(here, "check-loop-decision.mjs");

const PASS = { feature: "x", gates: {}, verdict: "PASS", failing_gates: [] };
const VFAIL = { feature: "x", gates: { test: 1 }, verdict: "FAIL", failing_gates: ["test"] };
const CLEAN = { verdict: "no-regressions", regressions: [] };
const REGR = { verdict: "regressions", regressions: ["floor/x.test.mjs"] };

// Build a minimal LOOP.md — this checker reads only the envelope (frontmatter), never the body/Handoff.
function loopRecord(fm) {
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\n# LOOP — a feature\n\nbody prose, unread by this checker.\n`;
}

// Write a fixture feature directory: LOOP.md + optionally verify-report.json / regression-report.json
// (a `null` report object means "do not write that file", to test a missing report).
function withFixture(fm, verifyObj, regressObj, fn) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-loop-decision-"));
  try {
    const loopPath = join(dir, "LOOP.md");
    writeFileSync(loopPath, loopRecord(fm));
    if (verifyObj !== undefined && verifyObj !== null) writeFileSync(join(dir, "verify-report.json"), JSON.stringify(verifyObj));
    if (regressObj !== undefined && regressObj !== null) writeFileSync(join(dir, "regression-report.json"), JSON.stringify(regressObj));
    const r = spawnSync(process.execPath, [CHECKER, loopPath], { encoding: "utf8" });
    return fn({ status: r.status, out: (r.stdout || "") + (r.stderr || "") });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("★ a genuine STOP_GREEN record whose cited reports agree → GREEN, exit 0", () => {
  withFixture({ decision: "STOP_GREEN", iterations: "1", cap: "3", commit: "abc1234", date: "2026-09-21" }, PASS, CLEAN, (r) => {
    assert.equal(r.status, 0);
    assert.match(r.out, /^GREEN —/);
    assert.match(r.out, /re-derivable/);
  });
});

test("★ a record citing reports that are simply MISSING → RED (the exact incident shape)", () => {
  withFixture({ decision: "STOP_GREEN", iterations: "1", cap: "3", commit: "abc1234", date: "2026-09-21" }, null, null, (r) => {
    assert.notEqual(r.status, 0);
    assert.match(r.out, /^RED —/);
    assert.match(r.out, /DECISION_MISMATCH|INCONCLUSIVE/);
  });
});

test("★ a recorded decision that disagrees with a live re-derivation → RED, DECISION_MISMATCH", () => {
  // The reports genuinely reduce to STOP_GREEN, but the record claims STOP_CAP.
  withFixture({ decision: "STOP_CAP", iterations: "3", cap: "3", commit: "abc1234", date: "2026-09-21" }, PASS, CLEAN, (r) => {
    assert.notEqual(r.status, 0);
    assert.match(r.out, /DECISION_MISMATCH/);
    assert.match(r.out, /STOP_GREEN/); // names what it actually re-derived
  });
});

test("★ a blocked stuck-point stop → GREEN, SKIPPED — never attempts re-derivation", () => {
  // No reports are written at all; a genuine blocked stop never consulted check-loop.mjs.
  withFixture(
    { decision: "INCONCLUSIVE", blocked: "no-slug", iterations: "1", commit: "unknown", date: "2026-09-21" },
    undefined,
    undefined,
    (r) => {
      assert.equal(r.status, 0);
      assert.match(r.out, /^GREEN —/);
      assert.match(r.out, /blocked stop/);
      assert.match(r.out, /SKIPPED/);
    }
  );
});

test("★ `cap` genuinely matters: the SAME reports re-derive DIFFERENTLY under a wrong recorded cap", () => {
  // iter=3 with the TRUE cap=3 is STOP_CAP (measurable red at/over cap). The record claims STOP_CAP but
  // a WRONG cap=5 (iter < cap) would re-derive to CONTINUE instead — a mismatch, proving cap is honored,
  // not merely iterations.
  withFixture({ decision: "STOP_CAP", iterations: "3", cap: "5", commit: "abc1234", date: "2026-09-21" }, VFAIL, REGR, (r) => {
    assert.notEqual(r.status, 0);
    assert.match(r.out, /DECISION_MISMATCH/);
    assert.match(r.out, /CONTINUE/);
  });
});

test("a genuine STOP_CAP record (cap correctly recorded) → GREEN", () => {
  withFixture({ decision: "STOP_CAP", iterations: "3", cap: "3", commit: "abc1234", date: "2026-09-21" }, VFAIL, REGR, (r) => {
    assert.equal(r.status, 0);
    assert.match(r.out, /^GREEN —/);
  });
});

test("both sides genuinely INCONCLUSIVE (reports missing at record time, still missing) → GREEN — tokens agree", () => {
  withFixture({ decision: "INCONCLUSIVE", iterations: "1", cap: "3", commit: "unknown", date: "2026-09-21" }, null, null, (r) => {
    assert.equal(r.status, 0);
    assert.match(r.out, /^GREEN —/);
  });
});

test("a non-blocked record with no `cap` field → RED, malformed", () => {
  withFixture({ decision: "STOP_GREEN", iterations: "1", commit: "abc1234", date: "2026-09-21" }, PASS, CLEAN, (r) => {
    assert.notEqual(r.status, 0);
    assert.match(r.out, /no valid `cap`/);
  });
});

test("a non-blocked record with no `iterations` field → RED, malformed", () => {
  withFixture({ decision: "STOP_GREEN", cap: "3", commit: "abc1234", date: "2026-09-21" }, PASS, CLEAN, (r) => {
    assert.notEqual(r.status, 0);
    assert.match(r.out, /`iterations`/);
  });
});

test("a record with an unrecognized `decision` value → RED before any re-derivation is attempted", () => {
  withFixture({ decision: "MOSTLY_GREEN", iterations: "1", cap: "3", commit: "abc1234", date: "2026-09-21" }, PASS, CLEAN, (r) => {
    assert.notEqual(r.status, 0);
    assert.match(r.out, /expected one of/);
  });
});

test("a record with no frontmatter at all → RED", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-loop-decision-"));
  try {
    const p = join(dir, "LOOP.md");
    writeFileSync(p, "# LOOP — a feature\n\nno frontmatter here.\n");
    const r = spawnSync(process.execPath, [CHECKER, p], { encoding: "utf8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /no `---`-fenced YAML frontmatter/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing LOOP.md path → RED, unreadable", () => {
  const r = spawnSync(process.execPath, [CHECKER, "/nonexistent/pharn-loop-decision-fixture/LOOP.md"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /unreadable/);
});

test("usage: no argument → RED", () => {
  const r = spawnSync(process.execPath, [CHECKER], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /usage:/);
});

test("usage: extra positional argument → RED", () => {
  const r = spawnSync(process.execPath, [CHECKER, "a", "b"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /usage:/);
});
