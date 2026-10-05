// pharn/floor/closeout-core.test.mjs — the shared half of the two closeouts (6.44.0, loop-closeout-script).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ECHO_CAP,
  capped,
  echo,
  floorScript,
  indent,
  ledgerSteps,
  runLedgerTail,
  runNode,
  runStop,
  shownExit,
  step,
} from "./closeout-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

test("indent: every line two spaces in, so no child line starts at column 0; total over any value", () => {
  assert.equal(indent("a\nb\n"), "  a\n  b\n");
  assert.equal(indent("a"), "  a\n");
  assert.equal(indent('{"schema":"x"}\n'), '  {"schema":"x"}\n', "a child's JSON line can never pass for the closing line");
  assert.equal(indent(""), "");
  for (const v of [null, undefined, 1, { toString: 1 }]) assert.equal(indent(v), "");
});

test("echo: a fixed header, stdout and stderr indented; printRaw prints stdout whole (mark-phase's marker line only)", () => {
  const out = [];
  const log = (s) => out.push(s);
  echo(log, { id: "x" }, { status: 1, stdout: "said\n", stderr: "oops\n", error: null });
  assert.equal(out.join(""), "── x (exit 1)\n  said\n  [stderr]\n  oops\n");
  out.length = 0;
  echo(log, { id: "m" }, { status: 0, stdout: "marker 3: run-stop 2026-10-05T00:00:00.000Z", stderr: "", error: null }, { printRaw: true });
  assert.equal(out.join(""), "── m (exit 0)\nmarker 3: run-stop 2026-10-05T00:00:00.000Z\n");
  assert.equal(shownExit({ status: null }), "none");
});

test("review R8 — a step's echoed stream is capped to its last ECHO_CAP characters, and the cut is said", () => {
  const out = [];
  const big = `${"x".repeat(ECHO_CAP + 100)}\nVERDICT LINE\n`;
  echo((s) => out.push(s), { id: "loud" }, { status: 0, stdout: big, stderr: big, error: null });
  const text = out.join("");
  assert.ok(text.length < 3 * ECHO_CAP, "both streams are bounded");
  assert.match(text, /earlier characters not shown/);
  assert.ok(text.includes("  VERDICT LINE\n"), "the tail (where a verdict sits) is kept");
  assert.equal(capped("short"), "short");
});

test("runNode never throws: a missing script, a crashing one and a signal are non-zero status objects; stdin is ignored", () => {
  const dir = mkdtempSync(join(tmpdir(), "closeout-core-"));
  try {
    assert.notEqual(runNode(join(dir, "nowhere.mjs"), []).status, 0);
    writeFileSync(join(dir, "throws.mjs"), "throw new Error('x');\n");
    assert.equal(runNode(join(dir, "throws.mjs"), []).status, 1);
    writeFileSync(
      join(dir, "reads.mjs"),
      "process.stdin.on('data', () => {}); process.stdin.on('end', () => process.stdout.write('eof'));\n"
    );
    const r = runNode(join(dir, "reads.mjs"), []);
    assert.equal(r.status, 0, "a child reading stdin sees end-of-input at once, never blocks");
    assert.equal(r.stdout, "eof");
    writeFileSync(join(dir, "kill.mjs"), "process.kill(process.pid, 'SIGTERM');\n");
    assert.equal(runNode(join(dir, "kill.mjs"), []).status, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ledgerSteps: the four shared lines, with the caller's --command and base SHA", () => {
  const s = ledgerSteps({ feature: "demo", command: "/pharn-ship", baseSha: "unknown" });
  assert.deepEqual(Object.keys(s), ["runStop", "ledger", "ledgerCheck", "report"]);
  assert.deepEqual([...s.runStop.args], ["--name", "demo", "--kind", "run-stop"]);
  assert.deepEqual([...s.ledger.args], ["demo", "--command", "/pharn-ship", "--base-sha", "unknown"]);
  assert.deepEqual([...s.ledgerCheck.args], ["pharn/features/demo/cost.json"]);
  assert.deepEqual([...s.report.args], ["demo", "--base", "pharn/features"]);
  for (const k of Object.keys(s)) assert.equal(dirname(s[k].script), HERE, `${k} resolves from this floor, never the invoking directory`);
  assert.equal(floorScript("x.mjs"), join(HERE, "x.mjs"));
  assert.ok(Object.isFrozen(step("a", "b", ["c"]).args));
});

function recorder(exits) {
  const ids = [];
  const run = (s) => {
    ids.push(s.id);
    return { status: exits[s.id] ?? 0, stdout: "", stderr: "", error: null };
  };
  return { run, ids };
}

test("runLedgerTail: emitted → checked → rendered; the check is skipped when nothing was emitted; quick skips the report", () => {
  const steps = ledgerSteps({ feature: "demo", command: "/pharn-loop", baseSha: "a".repeat(40) });
  const log = () => {};
  let r = recorder({});
  assert.deepEqual(runLedgerTail({ steps, quick: false, run: r.run, log }), {
    ledger: "emitted",
    ledger_check: "GREEN",
    report: "rendered",
  });
  assert.deepEqual(r.ids, [steps.ledger.id, steps.ledgerCheck.id, steps.report.id]);
  r = recorder({ [steps.ledger.id]: 1 });
  assert.deepEqual(runLedgerTail({ steps, quick: false, run: r.run, log }), {
    ledger: "not-emitted",
    ledger_check: "not-run",
    report: "rendered",
  });
  assert.deepEqual(r.ids, [steps.ledger.id, steps.report.id], "an earlier run's cost.json is never checked as this run's");
  r = recorder({ [steps.ledgerCheck.id]: 2, [steps.report.id]: 2 });
  assert.deepEqual(runLedgerTail({ steps, quick: false, run: r.run, log }), {
    ledger: "emitted",
    ledger_check: "UNUSABLE",
    report: "failed",
  });
  r = recorder({ [steps.ledgerCheck.id]: 1 });
  assert.equal(runLedgerTail({ steps, quick: true, run: r.run, log }).ledger_check, "RED");
  assert.ok(!r.ids.includes(steps.report.id), "quick: no report");
  r = recorder({ [steps.runStop.id]: 2 });
  assert.equal(runStop({ steps, run: r.run, log }), "failed");
});

test("the core holds no git call at all (ship-closeout.mjs's no-git-write claim rests on it)", () => {
  const src = readFileSync(join(HERE, "closeout-core.mjs"), "utf8");
  assert.doesNotMatch(src, /["'`]git["'`]/);
  assert.doesNotMatch(src, /gitSync|gitRun/);
});
