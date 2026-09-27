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
// (a `null` report object means "do not write that file", to test a missing report). `spec` (6.28.0), when given, is
// written as SPEC.md beside the record — the file the re-run's check-loop.mjs reads its mode from.
function withFixture(fm, verifyObj, regressObj, fn, spec = null) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-loop-decision-"));
  try {
    const loopPath = join(dir, "LOOP.md");
    writeFileSync(loopPath, loopRecord(fm));
    if (verifyObj !== undefined && verifyObj !== null) writeFileSync(join(dir, "verify-report.json"), JSON.stringify(verifyObj));
    if (regressObj !== undefined && regressObj !== null) writeFileSync(join(dir, "regression-report.json"), JSON.stringify(regressObj));
    if (spec !== null) writeFileSync(join(dir, "SPEC.md"), spec);
    const r = spawnSync(process.execPath, [CHECKER, loopPath], { encoding: "utf8" });
    return fn({ status: r.status, out: (r.stdout || "") + (r.stderr || ""), loopPath });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// The minimal SPEC the one kind reading reads as `quick` / `feature` (loop-mode-core.test.mjs pins the reading over the
// real template). `state` is a parameter: Step 6a reverts a non-green stop's SPEC to Draft BEFORE this check runs.
const specText = (kind, state = "Approved") =>
  `---\nspec_id: x\nstate: ${state}\nspec_content_hash: ${state === "Approved" ? "a".repeat(64) : '""'}\nspec_template: pharn-default@x\n` +
  `${kind ? `spec_kind: ${kind}\n` : ""}${state === "Approved" ? "approved_by: model\n" : ""}---\n\n## Intent\n\nx\n`;
const QUICK_SPEC = specText("quick");
const FEATURE_SPEC = specText(null);
const RECORD_CHECKER = join(here, "check-loop-record.mjs");
/** The full record check-loop-record.mjs needs (the Handoff this checker never reads). */
const withHandoff = (text) => `${text}\n## Handoff\n\n### investigated\n\na\n\n### learned\n\nb\n\n### next_steps\n\nc\n`;

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

// ── THE MODE (6.28.0, /pharn-loop --quick): the re-run reads the SPEC's kind; the record's `mode` must agree ─────────

const REC = { iterations: "1", cap: "3", commit: "abc1234", date: "2026-09-26" };

test("★ a quick STOP_GREEN_QUICK record over a quick fixture (no regression report at all) → GREEN", () => {
  withFixture(
    { decision: "STOP_GREEN_QUICK", mode: "quick", ...REC },
    PASS,
    null,
    (r) => {
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /^GREEN —/);
    },
    QUICK_SPEC
  );
});

test("★ L42/L58 — a quick STOP_CAP record over a SPEC REVERTED the Step-6a way (Draft, empty hash, no approved_by) → GREEN", () => {
  withFixture(
    { decision: "STOP_CAP", mode: "quick", iterations: "3", cap: "3", commit: "abc1234", date: "2026-09-26" },
    VFAIL,
    null,
    (r) => {
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /re-derivable in mode quick/);
    },
    specText("quick", "Draft")
  );
});

test("a quick STOP_CAP record with NO mode (absent reads full) → RED MODE_MISMATCH", () => {
  withFixture(
    { decision: "STOP_CAP", iterations: "3", cap: "3", commit: "abc1234", date: "2026-09-26" },
    VFAIL,
    null,
    (r) => {
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /MODE_MISMATCH/);
      assert.doesNotMatch(r.out, /DECISION_MISMATCH/, "the decision itself re-derives");
    },
    specText("quick", "Draft")
  );
});

test("a record with mode: quick over a FEATURE SPEC → RED MODE_MISMATCH", () => {
  withFixture(
    { decision: "STOP_GREEN", mode: "quick", ...REC },
    PASS,
    CLEAN,
    (r) => {
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /MODE_MISMATCH/);
    },
    FEATURE_SPEC
  );
});

test("a STOP_GREEN record over a QUICK SPEC → RED DECISION_MISMATCH (the quick table's green is STOP_GREEN_QUICK)", () => {
  withFixture(
    { decision: "STOP_GREEN", mode: "quick", ...REC },
    PASS,
    CLEAN,
    (r) => {
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /DECISION_MISMATCH/);
      assert.match(r.out, /STOP_GREEN_QUICK/);
    },
    QUICK_SPEC
  );
});

test("a BLOCKED quick record (blocked: not-quick) → GREEN, SKIPPED — its mode is shape-checked by check-loop-record.mjs only", () => {
  withFixture(
    { decision: "INCONCLUSIVE", blocked: "not-quick", mode: "quick", iterations: "1", commit: "unknown", date: "2026-09-26" },
    undefined,
    undefined,
    (r) => {
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /SKIPPED/);
    },
    FEATURE_SPEC
  );
});

test("★ D8's OWN RECORD (grill G1) — STOP_GREEN_QUICK, no mode, over a quick SPEC, as a run WITHOUT --quick writes it: RED here AND in check-loop-record.mjs", () => {
  withFixture(
    { decision: "STOP_GREEN_QUICK", ...REC },
    PASS,
    CLEAN,
    (r) => {
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /MODE_MISMATCH/, "the invocation (full) and the SPEC's kind (quick) disagree");
      assert.doesNotMatch(r.out, /DECISION_MISMATCH/, "the decision itself is what the quick table computes");
      // The same record through the shape checker: the cross-field rule REDs it first.
      writeFileSync(r.loopPath, withHandoff(loopRecord({ decision: "STOP_GREEN_QUICK", ...REC })));
      const shape = spawnSync(process.execPath, [RECORD_CHECKER, r.loopPath], { encoding: "utf8" });
      assert.equal(shape.status, 1, shape.stdout);
      assert.match(shape.stdout, /requires `mode: quick`/);
      // CONTROL: "repairing" it by writing mode: quick turns BOTH green — which is exactly why Step 6b never edits `mode`.
      writeFileSync(r.loopPath, withHandoff(loopRecord({ decision: "STOP_GREEN_QUICK", mode: "quick", ...REC })));
      assert.equal(spawnSync(process.execPath, [RECORD_CHECKER, r.loopPath], { encoding: "utf8" }).status, 0);
      assert.equal(spawnSync(process.execPath, [CHECKER, r.loopPath], { encoding: "utf8" }).status, 0);
    },
    QUICK_SPEC
  );
});

test("★ grill G3 — a quick GREEN line names mode quick and never cites regression-report.json; a full GREEN line names both reports", () => {
  withFixture(
    { decision: "STOP_GREEN_QUICK", mode: "quick", ...REC },
    PASS,
    CLEAN,
    (r) => {
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /mode quick/);
      assert.match(r.out, /verify-report\.json/);
      assert.doesNotMatch(r.out, /regression-report\.json/, "the quick table never opened it, so the line never names it");
    },
    QUICK_SPEC
  );
  withFixture({ decision: "STOP_GREEN", ...REC }, PASS, CLEAN, (r) => {
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /mode full/);
    assert.match(r.out, /verify-report\.json \+ .*regression-report\.json/);
  });
  // and a quick DECISION_MISMATCH line cites verify-report.json alone too
  withFixture(
    { decision: "STOP_CAP", mode: "quick", ...REC },
    PASS,
    CLEAN,
    (r) => {
      assert.match(r.out, /DECISION_MISMATCH/);
      assert.doesNotMatch(r.out, /regression-report\.json/);
    },
    QUICK_SPEC
  );
});

test("a malformed record mode → RED before any re-run (shape: cleanScalar + membership)", () => {
  for (const bad of ["QUICK", "fast", "full,quick"]) {
    withFixture({ decision: "STOP_GREEN", mode: bad, ...REC }, PASS, CLEAN, (r) => {
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /expected one of \{full, quick\}/);
    });
  }
});

test("✧ ENUM PARITY — every decision token is accepted by BOTH record checkers and refused by both outside the set (behavioural)", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-loop-decision-enum-"));
  try {
    const p = join(dir, "LOOP.md");
    // A blocked record takes the shape path in check-loop-decision.mjs without a re-run, so each token's MEMBERSHIP is
    // what decides there; STOP_GREEN_QUICK carries mode: quick, which check-loop-record.mjs requires.
    const verdictOf = (checker, decision) => {
      const fm = { decision, blocked: "no-slug", ...REC, ...(decision === "STOP_GREEN_QUICK" ? { mode: "quick" } : {}) };
      writeFileSync(p, withHandoff(loopRecord(fm)));
      const r = spawnSync(process.execPath, [checker, p], { encoding: "utf8" });
      return { status: r.status, out: r.stdout };
    };
    for (const decision of ["STOP_GREEN", "STOP_GREEN_QUICK", "STOP_CAP", "STOP_TERMINAL", "INCONCLUSIVE"]) {
      assert.equal(verdictOf(RECORD_CHECKER, decision).status, 0, `check-loop-record.mjs refused ${decision}`);
      assert.doesNotMatch(verdictOf(CHECKER, decision).out, /expected one of/, `check-loop-decision.mjs refused ${decision}`);
    }
    for (const decision of ["CONTINUE", "STOP_GREEN_Q", "stop_green_quick"]) {
      assert.equal(verdictOf(RECORD_CHECKER, decision).status, 1, `check-loop-record.mjs accepted ${decision}`);
      assert.match(verdictOf(CHECKER, decision).out, /expected one of/, `check-loop-decision.mjs accepted ${decision}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
