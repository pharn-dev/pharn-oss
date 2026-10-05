// pharn/floor/closeout-core.mjs — the half of a run's close that /pharn-loop and /pharn-ship SHARE (6.44.0,
// loop-closeout-script). No CLI. Its two callers are `loop-closeout.mjs` (the loop's Steps 6b–6c, after the model
// writes LOOP.md) and `ship-closeout.mjs` (ship's Step 3a); each keeps its own steps, outcome and exit codes.
//
// ================================ WHY THIS EXISTS (P7 — the recorded trigger) ================================
// Every pinned block of a close part was its own Bash call, so its own model request re-sending the orchestrator's
// whole context: in the 2026-10-05 92-minute pharn-starter run that context was 498k–503k tokens per request, and the
// close's non-Write requests took 2.1–5.8 s each (.dev/features/loop-closeout-script/PLAN.md, "Why"). The steps both
// closes run — the run-stop marker, the cost ledger, its check, the run report — live here ONCE (L35), so a change to
// that sequence reaches both commands or neither.
//
// ================================ WHAT IS SHARED, WHAT IS NOT ================================
// • `runNode` — every floor child as an ARGUMENT VECTOR (node by process.execPath, never a shell), stdin IGNORED (a
//   child, a commit hook among them, cannot block on input), stdout/stderr captured. It never throws: a spawn error,
//   a signal or a missing file is a non-zero status object the caller maps to ITS OWN outcome.
// • `echo` — every child's output printed as untrusted DATA: a fixed `── <step> (exit N)` header at column 0, then
//   each stdout and stderr line indented, so no child line can be read as the caller's closing JSON line. The ONE
//   exception is `mark-phase.mjs`'s own stdout marker line, printed whole (`printRaw`): the cost ledger's run
//   membership reads that exact line back from the transcript (`run-window-core.mjs`, rule 6), as it did when the
//   line was its own Bash call.
// • `ledgerSteps` / `runLedgerTail` — run-stop, then render-cost-ledger → check-cost-ledger → render-run-report.
//   The check runs only when the emitter exited 0: a non-zero emitter means no ledger was emitted THIS run, and a
//   cost.json still on disk belongs to an earlier run (the close parts already said to disregard its check). The
//   report is skipped when the caller says the run is quick.
// • NOT here: anything that writes to git, either caller's outcome vocabulary or exit codes, the loop's record
//   checks and commit, ship's run-marker close. `ship-closeout.mjs`'s claim "every git call is a read" rests on this
//   module holding no git call at all (a source scan in ship-closeout.test.mjs pins it).
//
// ================================ BOUNDS (P0) ================================
// • Agreement with the lines it replaced is pinned by tests (each step's FULL argv, in order); that a run invokes the
//   closeout at all, rather than typing the lines by hand, is command prose — advisory.
// • The children's own guarantees and bounds are theirs (each module's header); this file adds none.
// • A child that hangs regardless of stdin (a hook waiting on a network) runs until the Bash tool's timeout kills
//   the whole process — the caller's crash path. No per-child timeout is set: the lines it replaced had none.
//
// LOAD GRAPH: node builtins only. NON-LLM. TRUST (P2): every operand is a validated slug, a validated SHA or a path
// this floor chose; child output is echoed as DATA and no branch reads it — callers branch on exit statuses only.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** A child's captured output ceiling. A ceiling, not an allocation; past it the child is killed and reads non-zero. */
export const CHILD_MAX_BUFFER = 1 << 26; // 64 MiB

/** The absolute path of a sibling floor module — resolved from THIS file, never the invoking directory. */
export function floorScript(name) {
  return join(HERE, name);
}

/** One child step: a printable id, the script (absolute for a floor module; relative to the invoking directory for a
 *  hook, exactly as the pinned lines named them), and its argument vector. */
export function step(id, script, args) {
  return Object.freeze({ id, script, args: Object.freeze([...args]) });
}

/** Run a node script as an argument vector. Never throws; `status` is a number, or null for a signal / spawn error. */
export function runNode(script, args, { cwd = process.cwd(), env = process.env } = {}) {
  let r;
  try {
    r = spawnSync(process.execPath, [script, ...args], {
      cwd,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: CHILD_MAX_BUFFER,
    });
  } catch (e) {
    return { status: null, stdout: "", stderr: "", error: e && typeof e.message === "string" ? e.message : "spawn failed" };
  }
  return {
    status: typeof r.status === "number" ? r.status : null,
    stdout: typeof r.stdout === "string" ? r.stdout : "",
    stderr: typeof r.stderr === "string" ? r.stderr : "",
    error: r.error && typeof r.error.message === "string" ? r.error.message : null,
  };
}

/** The default step runner: a real child. Callers take `run` as a parameter so tests can record the steps. */
export function runStep(s) {
  return runNode(s.script, s.args);
}

/** The exit printed in a header: the number, or `none` (a signal or a spawn error). */
export function shownExit(r) {
  return Number.isInteger(r.status) ? String(r.status) : "none";
}

/** Indent every line of `text` by two spaces, so no child line starts at column 0. Total over any value. */
export function indent(text) {
  const s = typeof text === "string" ? text : "";
  if (s === "") return "";
  const body = s.endsWith("\n") ? s.slice(0, -1) : s;
  return `${body
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n")}\n`;
}

/** The most of each stream echoed per step (independent review R8): a hook or a checker that prints a lot must not push
 *  the closing JSON line out of the tool result. The TAIL is kept — a verdict line comes last — and the cut is said. */
export const ECHO_CAP = 8192;

/** `text` cut to its last `ECHO_CAP` characters, with a line saying how much was left out. Total over any value. */
export function capped(text) {
  const s = typeof text === "string" ? text : "";
  if (s.length <= ECHO_CAP) return s;
  return `[… ${s.length - ECHO_CAP} earlier characters not shown]\n${s.slice(-ECHO_CAP)}`;
}

/** Print one step's result as DATA: the header, then stdout and stderr, both indented and capped (`printRaw` prints
 *  stdout whole — used for mark-phase.mjs's own one-line marker output only). */
export function echo(log, s, r, { printRaw = false } = {}) {
  log(`── ${s.id} (exit ${shownExit(r)})\n`);
  if (printRaw) log(r.stdout.endsWith("\n") || r.stdout === "" ? r.stdout : `${r.stdout}\n`);
  else log(indent(capped(r.stdout)));
  if (r.stderr !== "") log(`  [stderr]\n${indent(capped(r.stderr))}`);
  if (r.error) log(`  [spawn error] ${r.error}\n`);
}

/** The four shared steps for `<feature>`, with the caller's `--command` and base SHA. */
export function ledgerSteps({ feature, command, baseSha }) {
  return Object.freeze({
    runStop: step("mark-phase.mjs --kind run-stop", floorScript("mark-phase.mjs"), ["--name", feature, "--kind", "run-stop"]),
    ledger: step("render-cost-ledger.mjs", floorScript("render-cost-ledger.mjs"), [feature, "--command", command, "--base-sha", baseSha]),
    ledgerCheck: step("check-cost-ledger.mjs", floorScript("check-cost-ledger.mjs"), [`pharn/features/${feature}/cost.json`]),
    report: step("render-run-report.mjs", floorScript("render-run-report.mjs"), [feature, "--base", "pharn/features"]),
  });
}

/** Write the run-stop marker. Returns "ok" or "failed"; never gates (neither close gated on it). */
export function runStop({ steps, run = runStep, log }) {
  const r = run(steps.runStop);
  echo(log, steps.runStop, r, { printRaw: true });
  return r.status === 0 ? "ok" : "failed";
}

/** The ledger, its check, the report. Returns the three closed readings the callers' documents carry. */
export function runLedgerTail({ steps, quick, run = runStep, log }) {
  const out = { ledger: "not-emitted", ledger_check: "not-run", report: "skipped-quick" };
  const l = run(steps.ledger);
  echo(log, steps.ledger, l);
  if (l.status === 0) {
    out.ledger = "emitted";
    const c = run(steps.ledgerCheck);
    echo(log, steps.ledgerCheck, c);
    out.ledger_check = c.status === 0 ? "GREEN" : c.status === 2 ? "UNUSABLE" : "RED";
  } else {
    log("── check-cost-ledger.mjs not run: the emitter exited non-zero, so no ledger was emitted this run\n");
  }
  if (quick) {
    log("── render-run-report.mjs skipped: a quick run renders no RUN-REPORT.md\n");
  } else {
    const r = run(steps.report);
    echo(log, steps.report, r);
    out.report = r.status === 0 ? "rendered" : "failed";
  }
  return out;
}

/** The closing JSON line. `doc` holds only code-produced values (enum tokens, a validated slug, git's hex). */
export function closingLine(doc) {
  return `${JSON.stringify(doc)}\n`;
}
