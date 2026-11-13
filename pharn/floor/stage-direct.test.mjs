// pharn/floor/stage-direct.test.mjs — the orchestrators' direct stage call (6.43.0, orchestrator-direct-stage-calls),
// run through a detached stage runner and a bounded in-node wait since 7.15.0 (stage-wait-once — CORE-76).
//
// Three halves, named so none stands in for another (GRILL G4):
//   (a) the PURE core: the argv rules, the records' total parsers, the wait and takeover tables.
//   (b) the CLI, spawned by path from a SCRATCH COPY of the whole `pharn/floor/` (L81) whose two stage scripts are
//       FAKES driven by a fixture file, in a project root holding a copy of the whole `.claude/hooks/`: the production
//       defaults — the scripts beside stage-direct.mjs, the project's own setter — are what runs, with no injection
//       (L41). The plan's criteria C1–C6 and its negative controls are here, each named.
//   (c) the REAL stage scripts: a question's answer line end to end through the real stage-regress.mjs, and the CLI
//       over the real stage-verify.mjs. `.dev/floor/command-hygiene.test.mjs` (DIRECT_STAGE_WIRING) runs each
//       COMMITTED line.
// Each assertion names the mutant that turns it red (L60). Timing: budgets are sized with margins (steps well inside a
// budget, a takeover's kill awaited on `ps`), never edges, so a loaded `npm test` cannot flip a verdict.

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DIRECT_STAGES,
  SETTER,
  CLEAR_ARGV,
  MARKER_DEFERRED_CONTINUE,
  LOCK_DIR,
  LOCK_FILE,
  LOCK_REFUSALS,
  CALL_REFUSALS,
  RUNNER_FILE,
  STATE_FILE,
  RESULT_FILE,
  RUNNER_LOG,
  STDERR_TAIL_MAX,
  appendTail,
  lockRecord,
  parseLock,
  parseDirectArgs,
  parseRunner,
  parseRunnerArgs,
  parseState,
  parseResult,
  resultRecord,
  runnerRecord,
  scriptArgv,
  setterArgv,
  shown,
  stateRecord,
  stdoutPiece,
  returnMarkerDue,
  takeoverStep,
  waitStep,
} from "./stage-direct-core.mjs";
import { HANDOFF_MAX_MS, RELEASE_WAIT_MS, acquireLock, releaseLock, runDirect, runRunner } from "./stage-direct.mjs";
import { REGRESS_PATHS } from "./stage-regress-core.mjs";
import { VERIFY_PATHS } from "./stage-verify-core.mjs";
import { REGISTRY, EXIT_CODE } from "./stage-exit-core.mjs";
import { MARKER_NOT_WRITTEN, markerLine } from "./mark-phase.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const REAL_SETTER = join(REPO, SETTER);
const REAL_CLI = join(HERE, "stage-direct.mjs");

const fresh = (stage, { t = 540000, b = 570000, extra = [], iteration = 1 } = {}) => [
  "--stage",
  stage,
  "--name",
  "demo",
  "--iteration",
  String(iteration),
  "--timeout-ms",
  String(t),
  "--budget-ms",
  String(b),
  ...extra,
];
const resume = (stage, b = 570000) => ["--stage", stage, "--name", "demo", "--resume", "--budget-ms", String(b)];
const NONCE_A = "a".repeat(32);
const NONCE_B = "b".repeat(32);

// ── (a) the core ──────────────────────────────────────────────────────────────────────────────────────

test("DIRECT_STAGES — the scope target is IMPORTED from each stage's own path table; the command file and script exist", () => {
  assert.deepEqual(Object.keys(DIRECT_STAGES).sort(), ["pharn-regress", "pharn-verify"], "L34: the two floor-only stages");
  assert.equal(DIRECT_STAGES["pharn-regress"].target, REGRESS_PATHS.stageJson);
  assert.equal(DIRECT_STAGES["pharn-verify"].target, VERIFY_PATHS.stageJson);
  for (const [stage, t] of Object.entries(DIRECT_STAGES)) {
    assert.ok(existsSync(join(REPO, t.command)), `${stage}: ${t.command} exists`);
    assert.ok(existsSync(join(HERE, t.script)), `${stage}: ${t.script} exists beside the module`);
    assert.ok(Object.hasOwn(REGISTRY, t.exitStage), `${stage}: ${t.exitStage} is a stage-exit registry stage`);
    assert.deepEqual(setterArgv(stage), ["--from-frontmatter", t.command, "--target", t.target]);
  }
  assert.deepEqual(CLEAR_ARGV, ["--clear"]);
});

test("DIRECT_STAGES — every flag a registry QUESTION option appends is a flag of its stage, value or bare as the option needs (GRILL G3.6)", () => {
  const check = (table) => {
    const out = [];
    for (const [stage, t] of Object.entries(table)) {
      for (const q of Object.values(REGISTRY[t.exitStage].question ?? {})) {
        for (const opt of q.options) {
          if (opt.argv === null) continue;
          const [flag, ...rest] = opt.argv;
          const want = rest.includes("<value>") ? t.valueFlags : t.bareFlags;
          if (!want.includes(flag)) out.push(`${stage}: ${flag}`);
        }
      }
    }
    return out;
  };
  assert.deepEqual(check(DIRECT_STAGES), []);
  // CONTROL (L60): a table without --install fails the same check.
  const mutant = { ...DIRECT_STAGES, "pharn-regress": { ...DIRECT_STAGES["pharn-regress"], valueFlags: ["--base", "--gates", "--tests"] } };
  assert.deepEqual(check(mutant), ["pharn-regress: --install"]);
});

test("parseDirectArgs — a fresh call, with the stage's flags passed through in order; scriptArgv builds the script's argv", () => {
  const r = parseDirectArgs(fresh("pharn-regress", { extra: ["--base", "abc123", "--no-install"] }));
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(r.opts, {
    stage: "pharn-regress",
    name: "demo",
    mode: "fresh",
    iteration: 1,
    timeoutMs: 540000,
    budgetMs: 570000,
    passthrough: ["--base", "abc123", "--no-install"],
  });
  assert.deepEqual(scriptArgv(r.opts), [
    "--feature",
    "demo",
    "--timeout-ms",
    "540000",
    "--budget-ms",
    "570000",
    "--base",
    "abc123",
    "--no-install",
  ]);
  const v = parseDirectArgs(resume("pharn-verify"));
  assert.equal(v.ok, true, v.reason);
  assert.deepEqual(scriptArgv(v.opts), ["--resume", "--budget-ms", "570000"], "a resume carries no state of its own (L44)");
});

test("parseDirectArgs — CLOSED both ways: each refusal names a flag or a vocabulary", () => {
  const f = (stage, extra = []) => fresh(stage, { extra });
  const refused = [
    [[], /--stage is required/],
    [["--stage", "pharn-build", "--name", "demo"], /--stage must be one of/],
    [f("pharn-regress").map((a) => (a === "demo" ? "Bad Name" : a)), /--name must be a feature slug/],
    [f("pharn-regress").filter((a, i, all) => a !== "--iteration" && all[i - 1] !== "--iteration"), /--iteration is required/],
    [f("pharn-regress").filter((a, i, all) => a !== "--timeout-ms" && all[i - 1] !== "--timeout-ms"), /--timeout-ms is required/],
    [["--stage", "pharn-verify", "--name", "demo"], /--budget-ms is required/],
    [f("pharn-verify", ["--base", "x"]), /"--base" is not a pharn-verify flag \(allowed: --gates\)/],
    [f("pharn-regress", ["--bogus", "x"]), /is not a pharn-regress flag/],
    [f("pharn-regress", ["--base", "a", "--base", "b"]), /--base was given more than once/],
    [[...resume("pharn-regress"), "--resume"], /--resume was given more than once/],
    [[...resume("pharn-regress"), "--iteration", "1"], /--resume takes only/],
    [[...resume("pharn-regress"), "--base", "x"], /--resume takes only/],
    [f("pharn-regress", ["--base"]), /was given with no value/],
    [f("pharn-regress", ["--base", "--no-install"]), /was given with no value/],
    [["positional", ...f("pharn-regress")], /unexpected argument "positional"/],
    [f("pharn-regress").map((a) => (a === "540000" ? "0" : a)), /--timeout-ms must be a positive integer/],
    [f("pharn-regress").map((a) => (a === "570000" ? "570000\n" : a)), /--budget-ms must be a positive integer/],
    [f("pharn-regress").map((a) => (a === "1" ? "-1" : a)), /no value|--iteration must be a positive integer/],
    [f("pharn-regress", ["--base", "a\tb"]), /--base must be a value without control characters/],
    [["--runner", NONCE_A], /unexpected argument|was given with no value|--stage is required/],
  ];
  for (const [argv, re] of refused) {
    const r = parseDirectArgs(argv);
    assert.equal(r.ok, false, `${JSON.stringify(argv)} must be refused`);
    assert.match(r.reason, re, JSON.stringify(argv));
  }
  assert.equal(parseDirectArgs(undefined).ok, false);
});

// 7.15.0: the runner's loop condition and the takeover's ("the CLI — exit 5 is the RUNNER's" and the takeover-5 test
// below exercise it through production).
test("returnMarkerDue — every exit closes the stage's execution but continue (5)", () => {
  for (const code of [0, 1, 2, 3, 4, 6, 7, 127]) assert.equal(returnMarkerDue(code), true, String(code));
  assert.equal(returnMarkerDue(EXIT_CODE.continue), false);
  assert.equal(EXIT_CODE.continue, 5, "L34: the stage-exit table's own number");
});

test("shown (L62) — total: a non-string is named by its type, never thrown on", () => {
  assert.equal(shown("x"), '"x"');
  assert.equal(shown({ toString: 1 }), '"<object>"', "String({toString: 1}) throws; shown does not");
  assert.equal(shown(null), '"<null>"');
  assert.equal(shown("a".repeat(200)).length, 81, "bounded");
});

test("parseLock — a well-formed /2 record (nonce, holder), else null (torn, foreign, /1, a bad field, {toString:1})", () => {
  const rec = { pid: 42, startedAt: "2026-10-05T00:00:00.000Z", stage: "pharn-verify", name: "demo", nonce: NONCE_A, holder: "runner" };
  const good = lockRecord(rec);
  assert.deepEqual(parseLock(good), rec);
  const o = JSON.parse(good);
  for (const [why, bad] of [
    ["empty (a torn record)", ""],
    ["not JSON", "{"],
    ["an array", "[]"],
    ["{toString:1} (L62)", '{"toString":1}'],
    ["a /1 record from before the upgrade", JSON.stringify({ ...o, schema: "pharn-stage-direct-lock/1" })],
    ["pid 0", JSON.stringify({ ...o, pid: 0 })],
    ["pid as a string", JSON.stringify({ ...o, pid: "42" })],
    ["a stage outside DIRECT_STAGES", JSON.stringify({ ...o, stage: "pharn-build" })],
    ["a stage named toString", JSON.stringify({ ...o, stage: "toString" })],
    ["a non-slug name", JSON.stringify({ ...o, name: "../x" })],
    ["a short nonce", JSON.stringify({ ...o, nonce: "abc" })],
    ["a holder outside LOCK_HOLDERS", JSON.stringify({ ...o, holder: "takeover" })],
  ])
    assert.equal(parseLock(bad), null, why);
  assert.deepEqual(LOCK_REFUSALS, ["in-flight", "lock-unusable"], "the lock's closed refusal set");
  assert.deepEqual(
    CALL_REFUSALS,
    ["in-flight", "lock-unusable", "spawn-failed", "mismatch", "orphaned", "no-run", "record-unusable"],
    "the call's closed refusal set (7.15.0)"
  );
});

const stateOf = (over = {}) => ({
  nonce: NONCE_A,
  holder: "runner",
  pid: 4242,
  runnerPid: 4242,
  invocations: 0,
  continues: 0,
  startMarker: { line: "marker 1: stage-start pharn-regress iter=1 2026-11-13T00:00:00.000Z", seq: 1 },
  scopeSha: null,
  phase: "running",
  exit: null,
  stdout: null,
  stderrTail: "",
  ...over,
});

test("the records — each builder round-trips through its TOTAL parser; anything else is null, never a throw (L62)", () => {
  const argv = fresh("pharn-regress", { extra: ["--base", "abc"] });
  const runner = parseRunner(runnerRecord({ nonce: NONCE_A, stage: "pharn-regress", name: "demo", iteration: 1, argv }));
  assert.deepEqual([runner.nonce, runner.stage, runner.name, runner.iteration, runner.argv], [NONCE_A, "pharn-regress", "demo", 1, argv]);
  assert.deepEqual(scriptArgv(runner.opts), ["--feature", "demo", "--timeout-ms", "540000", "--budget-ms", "570000", "--base", "abc"]);
  const st = stateOf({ phase: "script-exited", exit: 3, stdout: "{}\n", invocations: 2, continues: 1 });
  assert.deepEqual(parseState(stateRecord(st)), st);
  const res = {
    nonce: NONCE_A,
    stage: "pharn-verify",
    name: "demo",
    exit: 0,
    stdout: "{}\n",
    stderrTail: "x",
    startLine: null,
    returnLine: "marker 2: orchestrator t",
  };
  assert.deepEqual(parseResult(resultRecord(res)), res);
  const r0 = JSON.parse(runnerRecord({ nonce: NONCE_A, stage: "pharn-regress", name: "demo", iteration: 1, argv }));
  const s0 = JSON.parse(stateRecord(stateOf()));
  const x0 = JSON.parse(resultRecord(res));
  const bad = {
    runner: [
      [
        "the argv re-validated: a flag the stage does not take (P2)",
        { ...r0, argv: fresh("pharn-regress", { extra: ["--gates", "x", "--bogus", "y"] }) },
      ],
      ["the argv of a RESUME", { ...r0, argv: resume("pharn-regress") }],
      ["the argv naming another stage than the record", { ...r0, stage: "pharn-verify" }],
      ["the argv naming another iteration", { ...r0, iteration: 2 }],
      ["a stage named toString", { ...r0, stage: "toString" }],
      ["a bad nonce", { ...r0, nonce: "x" }],
    ],
    state: [
      ["continues above invocations", { ...s0, continues: 1, invocations: 0 }],
      ["a phase outside PHASES", { ...s0, phase: "done" }],
      ["running with an exit", { ...s0, exit: 0 }],
      ["script-exited with no exit", { ...s0, phase: "script-exited" }],
      ["a holder outside STATE_HOLDERS", { ...s0, holder: "call" }],
      ["a marker line with a newline", { ...s0, start_marker: { line: "a\nb", seq: 1 } }],
      ["a tail past STDERR_TAIL_MAX", { ...s0, stderr_tail: "x".repeat(STDERR_TAIL_MAX + 1) }],
      ["a scope sha that is not hex", { ...s0, scope_sha: "zz" }],
    ],
    result: [
      ["an exit outside 0..255", { ...x0, exit: 256 }],
      ["stdout not a string", { ...x0, stdout: null }],
      ["a stage outside DIRECT_STAGES", { ...x0, stage: "pharn-build" }],
    ],
  };
  const parsers = { runner: parseRunner, state: parseState, result: parseResult };
  for (const [kind, cases] of Object.entries(bad)) {
    for (const [why, o] of cases) assert.equal(parsers[kind](JSON.stringify(o)), null, `${kind}: ${why}`);
    for (const t of ['{"toString":1}', "[]", "{", "", "null", '"x"']) assert.equal(parsers[kind](t), null, `${kind}: ${t}`);
    assert.equal(parsers[kind](undefined), null);
  }
});

test("parseRunnerArgs — exactly `--runner <nonce>`, else null", () => {
  assert.equal(parseRunnerArgs(["--runner", NONCE_A]), NONCE_A);
  for (const bad of [["--runner"], ["--runner", "xyz"], ["--runner", NONCE_A, "x"], ["--nonce", NONCE_A], [], undefined])
    assert.equal(parseRunnerArgs(bad), null, JSON.stringify(bad));
});

test("appendTail / stdoutPiece — the tail keeps the END, bounded; stdout gets a final newline only when it lacks one", () => {
  assert.equal(appendTail("ab", "cd"), "abcd");
  const t = appendTail("x".repeat(STDERR_TAIL_MAX), "END");
  assert.equal(t.length, STDERR_TAIL_MAX);
  assert.ok(t.endsWith("END"));
  assert.deepEqual([stdoutPiece(""), stdoutPiece("{}"), stdoutPiece("{}\n")], ["", "{}\n", "{}\n"]);
});

test("waitStep — THE WAIT TABLE (no bound result): live holder (sleep/budget) > orphaned group > takeover only within the first poll", () => {
  const w = (o) => waitStep({ holderAlive: false, groupAlive: false, elapsedMs: 0, budgetMs: 1000, pollMs: 250, ...o });
  assert.equal(w({ holderAlive: true, elapsedMs: 700 }), "sleep");
  assert.equal(w({ holderAlive: true, elapsedMs: 800 }), "budget", "elapsed + poll past the budget: exit 5");
  assert.equal(w({ holderAlive: true, groupAlive: true }), "sleep", "a live holder is waited for whatever its group does");
  assert.equal(w({ groupAlive: true }), "orphaned");
  assert.equal(w({ groupAlive: true, elapsedMs: 900 }), "orphaned", "never an exit-5 loop over an orphan");
  assert.equal(w({ elapsedMs: 250 }), "takeover");
  assert.equal(w({ elapsedMs: 251 }), "takeover-deferred", "a call that already waited past one poll takes over nothing");
});

test("takeoverStep — THE TAKEOVER TABLE: an exited script is never run again; no start marker → start; no continue → fresh; else resume", () => {
  assert.equal(takeoverStep(null), "start");
  assert.equal(takeoverStep(stateOf({ startMarker: null })), "start");
  assert.equal(takeoverStep(stateOf()), "fresh", "a kill before the first checkpoint leaves nothing to resume");
  assert.equal(takeoverStep(stateOf({ invocations: 2, continues: 1 })), "resume");
  assert.equal(takeoverStep(stateOf({ phase: "script-exited", exit: 0, stdout: "" })), "finish");
  assert.equal(takeoverStep(stateOf({ phase: "script-exited", exit: 0, stdout: "", startMarker: null })), "finish", "finish wins");
});

// ── (b) the CLI, from a scratch copy of the floor with FAKE stage scripts ─────────────────────────────

/** The fake stage script, written over BOTH stage scripts in the floor copy. Driven by `fake.json` in its cwd: `steps`
 *  (slow-step durations, ms) run under the stage scripts' budget rule — the first slow step of an invocation always,
 *  a later one only while elapsed + --timeout-ms ≤ --budget-ms, else a `continue` (exit 5) after a checkpoint; `exit`
 *  (0, 4 = a real `question` object whose resume.argv is the fresh argv, any other number, or "SIGKILL"); `hold`
 *  ("fresh" | "resume": wait for `.release` once, before the checkpoint); `guard` (probe the scope and the live guard);
 *  `noNewline`, `stderr`, `swapScope`, `swapLock`. Each invocation appends its argv to `fake-calls.jsonl`; the last
 *  writes `fake-report.json` (clock field `at`) and `fake-stamp.json` (clock field `started_at`). */
const FAKE = `
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { questionExit } from "./stage-exit-core.mjs";
const stage = basename(fileURLToPath(import.meta.url)) === "stage-regress.mjs" ? "regress" : "verify";
const fx = JSON.parse(readFileSync("fake.json", "utf8"));
const args = process.argv.slice(2);
const t0 = Date.now();
const sab = new Int32Array(new SharedArrayBuffer(4));
const sleep = (ms) => Atomics.wait(sab, 0, 0, ms);
const flag = (f) => { const i = args.indexOf(f); return i < 0 ? null : args[i + 1]; };
const out = (o) => writeSync(1, JSON.stringify(o, null, 2) + (fx.noNewline ? "" : "\\n"));
function run() {
  const isResume = args[0] === "--resume";
  const call = { argv: args, mode: isResume ? "resume" : "fresh" };
  if (fx.guard) {
    call.scope = existsSync("pharn/.run/writes-scope.json") ? JSON.parse(readFileSync("pharn/.run/writes-scope.json", "utf8")).scope : null;
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const g = (p) => spawnSync(process.execPath, [fx.guard], { input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: p } }), encoding: "utf8", env }).status;
    call.inside = g("pharn/.run/pharn-regress/other.json");
    call.outside = g("pharn/features/demo/REGRESSION.md");
  }
  appendFileSync("fake-calls.jsonl", JSON.stringify(call) + "\\n");
  const hold = (at) => {
    if (fx.hold !== at || existsSync(".held-once")) return;
    writeFileSync(".held-once", String(process.pid));
    writeFileSync(".holding", String(process.pid));
    while (!existsSync(".release")) sleep(20);
  };
  let prog;
  if (isResume) {
    hold("resume");
    if (!existsSync("fake-progress.json")) {
      out({ schema: "pharn-stage-exit/1", status: "unusable", stage, feature: "demo", reason_code: "no-progress", detail: "no progress record" });
      return 2;
    }
    prog = JSON.parse(readFileSync("fake-progress.json", "utf8"));
  } else {
    hold("fresh");
    rmSync("fake-progress.json", { force: true });
    prog = { argv: args, feature: flag("--feature"), timeoutMs: Number(flag("--timeout-ms")), done: 0 };
  }
  const budget = Number(flag("--budget-ms"));
  if (fx.stderr) process.stderr.write(fx.stderr);
  if (fx.swapScope) writeFileSync("pharn/.run/writes-scope.json", JSON.stringify({ scope: ["other/**"] }) + "\\n");
  if (fx.swapLock) writeFileSync("pharn/.run/stage-direct/in-flight.json", fx.swapLock);
  const steps = fx.steps ?? [];
  let slow = 0;
  while (prog.done < steps.length) {
    if (slow > 0 && Date.now() - t0 + prog.timeoutMs > budget) {
      out({ schema: "pharn-stage-exit/1", status: "continue", stage, feature: prog.feature, phase: "drain", resume: { argv: ["--resume"] } });
      return 5;
    }
    sleep(steps[prog.done]);
    prog.done++;
    slow++;
    writeFileSync("fake-progress.json", JSON.stringify(prog));
  }
  writeFileSync("fake-report.json", JSON.stringify({ stage, argv: prog.argv, steps: prog.done, at: new Date().toISOString() }, null, 2) + "\\n");
  writeFileSync("fake-stamp.json", JSON.stringify({ argv: prog.argv, started_at: new Date(t0).toISOString() }) + "\\n");
  const exit = fx.exit ?? 0;
  if (exit === "SIGKILL") process.kill(process.pid, "SIGKILL");
  if (exit === 4) out(questionExit({ stage, feature: prog.feature, reasonCode: "no-gates", resumeArgv: prog.argv }));
  else out({ schema: "pharn-stage-exit/1", status: exit === 0 ? "done" : "other", stage, feature: prog.feature, exit, argv: prog.argv });
  return exit;
}
process.exitCode = run();
`;

// The scratch copy of the WHOLE floor (L81), its two stage scripts replaced by the fake — once for this file.
const FLOOR_ROOT = mkdtempSync(join(tmpdir(), "stage-direct-floor-"));
const FLOOR = join(FLOOR_ROOT, "pharn", "floor");
cpSync(HERE, FLOOR, { recursive: true });
for (const t of Object.values(DIRECT_STAGES)) writeFileSync(join(FLOOR, t.script), FAKE);
const CLI = join(FLOOR, "stage-direct.mjs");
after(() => rmSync(FLOOR_ROOT, { recursive: true, force: true }));

const ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !["CLAUDE_PROJECT_DIR", "CLAUDE_CODE_SESSION_ID", "NODE_TEST_CONTEXT"].includes(k))
);

/** A project root: a copy of the whole `.claude/hooks/` (the project's own setter and guard), the two thin-caller
 *  command files the setter reads, and the fake's fixture. */
function project({ commands = true, fx = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "stage-direct-"));
  mkdirSync(join(root, ".claude"));
  cpSync(join(REPO, ".claude", "hooks"), join(root, ".claude", "hooks"), { recursive: true });
  if (commands) {
    mkdirSync(join(root, ".claude", "commands"));
    for (const t of Object.values(DIRECT_STAGES)) copyFileSync(join(REPO, t.command), join(root, t.command));
  }
  fixture(root, fx);
  return root;
}
const fixture = (root, fx) => writeFileSync(join(root, "fake.json"), JSON.stringify(fx));

/** One CLI call, synchronous. */
function cli(root, argv) {
  const r = spawnSync(process.execPath, [CLI, ...argv], { cwd: root, env: ENV, encoding: "utf8", timeout: 180_000 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}
/** One CLI call in the background: `{child, done}` (`done` resolves to `{status, stdout, stderr}`). */
function cliAsync(root, argv) {
  const child = spawn(process.execPath, [CLI, ...argv], { cwd: root, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));
  const done = new Promise((res) => child.on("close", (status) => res({ status, stdout, stderr })));
  return { child, done };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(cond, why, ms = 30_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(20)) if (cond()) return;
  assert.fail(`timed out waiting for: ${why}`);
}
const readJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const markersIn = (root) => {
  const f = join(root, "pharn", ".run", "cost", "demo", "markers.jsonl");
  return existsSync(f)
    ? readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
};
const kinds = (root) => markersIn(root).map((m) => m.kind);
const callsIn = (root) =>
  existsSync(join(root, "fake-calls.jsonl"))
    ? readFileSync(join(root, "fake-calls.jsonl"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
/** The stdout without marker lines — what the script printed. */
const scriptOut = (stdout) =>
  stdout
    .split("\n")
    .filter((l) => !/^marker \d+: /.test(l) && l !== MARKER_DEFERRED_CONTINUE && l !== MARKER_NOT_WRITTEN)
    .join("\n");
/** The pid of a process that has already exited. */
function deadPid() {
  const r = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" });
  return Number(r.stdout);
}
/** Does process group `pgid` have a live, non-zombie member? */
function groupLive(pgid) {
  const r = spawnSync("ps", ["-A", "-o", "pgid=,stat="], { encoding: "utf8", maxBuffer: 1 << 26 });
  return r.stdout.split("\n").some((row) => {
    const [pg, stat] = row.trim().split(/\s+/);
    return Number(pg) === pgid && stat && !stat.startsWith("Z");
  });
}
function killGroup(pgid) {
  try {
    process.kill(-pgid, "SIGKILL");
  } catch {
    // already gone
  }
}
const hashes = (root) =>
  Object.fromEntries(
    [LOCK_FILE, RUNNER_FILE, STATE_FILE, RESULT_FILE, RUNNER_LOG].map((rel) => [
      rel,
      existsSync(join(root, rel))
        ? createHash("sha256")
            .update(readFileSync(join(root, rel)))
            .digest("hex")
        : null,
    ])
  );
/** A sleeping process: a live pid that is no stage-direct call. */
function sleeper() {
  return spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore" });
}
/** Plant this run's records by hand (no fault hook in production — the plan's C4(c)/C5 states are constructed). */
function plantRun(
  root,
  { stage = "pharn-regress", nonce = NONCE_A, argv = fresh(stage), state = null, result = null, markers = [], lock = null }
) {
  mkdirSync(join(root, LOCK_DIR), { recursive: true });
  writeFileSync(join(root, RUNNER_FILE), runnerRecord({ nonce, stage, name: "demo", iteration: 1, argv }));
  if (state) writeFileSync(join(root, STATE_FILE), stateRecord(state));
  if (result) writeFileSync(join(root, RESULT_FILE), resultRecord(result));
  if (lock) writeFileSync(join(root, LOCK_FILE), lockRecord(lock));
  if (markers.length) {
    mkdirSync(join(root, "pharn", ".run", "cost", "demo"), { recursive: true });
    writeFileSync(join(root, "pharn", ".run", "cost", "demo", "markers.jsonl"), markers.map((m) => `${JSON.stringify(m)}\n`).join(""));
  }
}
const startMarkerRec = {
  seq: 1,
  kind: "stage-start",
  stage: "pharn-regress",
  iteration: 1,
  ts: "2026-11-13T00:00:00.000Z",
  session_id: null,
};

test("the CLI — the scope is the thin caller's WHILE the script runs (the live guard denies outside pharn/.run/**), and released after", () => {
  for (const stage of Object.keys(DIRECT_STAGES)) {
    const root = project();
    try {
      fixture(root, { guard: join(root, ".claude", "hooks", "enforce-writes-scope.cjs") });
      const r = cli(root, fresh(stage));
      assert.equal(r.status, 0, r.stderr);
      const [seen] = callsIn(root);
      // What the thin caller's own pinned setter line writes, run in another scratch root (the parity, L31).
      const ref = project();
      try {
        const s = spawnSync(process.execPath, [REAL_SETTER, ...setterArgv(stage)], { cwd: ref, encoding: "utf8", env: ENV });
        assert.equal(s.status, 0, s.stderr);
        assert.deepEqual(seen.scope, readJson(ref, "pharn/.run/writes-scope.json").scope);
      } finally {
        rmSync(ref, { recursive: true, force: true });
      }
      assert.equal(seen.outside, 2, `${stage}: a Write outside pharn/.run/** is DENIED while the script runs`);
      assert.equal(seen.inside, 0, `${stage}: pharn/.run/** stays writable`);
      assert.equal(existsSync(join(root, "pharn", ".run", "writes-scope.json")), false, `${stage}: released after`);
      // CONTROL: with the scope released, the same probe is allowed by the default — so the deny above was the scope's.
      const after = spawnSync(process.execPath, [join(root, ".claude", "hooks", "enforce-writes-scope.cjs")], {
        cwd: root,
        input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "pharn/features/demo/REGRESSION.md" } }),
        env: ENV,
        encoding: "utf8",
      });
      assert.equal(after.status, 0, after.stderr);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("the CLI — EVERY final exit passes through with today's bytes: start line, the script's stdout, the return line; the lock is released", () => {
  for (const code of [0, 2, 3, 4, 1, 7]) {
    const root = project({ fx: { exit: code, steps: [10] } });
    try {
      const r = cli(root, fresh("pharn-verify"));
      assert.equal(r.status, code, `exit ${code} passes through\n${r.stderr}`);
      const m = markersIn(root);
      assert.deepEqual(
        m.map((x) => x.kind),
        ["stage-start", "orchestrator"],
        `exit ${code}`
      );
      assert.deepEqual([m[0].stage, m[0].iteration, "route" in m[0]], ["pharn-verify", 1, false], "byte-identical to the old marker line");
      const start = `${markerLine(m[0])}\n`;
      const ret = `${markerLine(m[1])}\n`;
      assert.ok(r.stdout.startsWith(start), "the start line FIRST");
      assert.ok(r.stdout.endsWith(`}\n${ret}`), "the return line LAST, after the script's whole object");
      const obj = JSON.parse(r.stdout.slice(start.length, -ret.length));
      assert.deepEqual(obj.argv ?? obj.resume.argv, scriptArgv(parseDirectArgs(fresh("pharn-verify")).opts), "the script got today's argv");
      assert.equal(existsSync(join(root, "pharn", ".run", "writes-scope.json")), false, "released on every exit");
      assert.equal(existsSync(join(root, LOCK_FILE)), false, "the lock released");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("the CLI — exit 5 is the RUNNER's: it resumes the script itself; the continue objects never reach stdout; one marker pair", () => {
  // T = B: after any step elapsed + T > B, so every invocation runs one step, then `continue` — three for three steps.
  const root = project({ fx: { steps: [50, 50, 50] } });
  try {
    const r = cli(root, fresh("pharn-regress", { t: 9500, b: 9500 }));
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(
      callsIn(root).map((c) => c.argv),
      [
        scriptArgv(parseDirectArgs(fresh("pharn-regress", { t: 9500, b: 9500 })).opts),
        ["--resume", "--budget-ms", "9500"],
        ["--resume", "--budget-ms", "9500"],
      ],
      "today's calls: the fresh argv, then `--resume --budget-ms <B>` on each exit 5"
    );
    assert.doesNotMatch(r.stdout, /"status": "continue"/, "the intermediate continue objects stay in the runner");
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI — a signal is exit 1 (a crash, never a verdict), named in the replayed stderr, and the stage still closes", () => {
  const root = project({ fx: { exit: "SIGKILL" } });
  try {
    const r = cli(root, fresh("pharn-regress"));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /stage-direct: stage-regress\.mjs ended on a signal \(SIGKILL\)/);
    assert.equal(markersIn(root).at(-1).kind, "orchestrator");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI — the script's stderr is replayed as a bounded tail at the end, and kept whole in runner.log", () => {
  const root = project({ fx: { stderr: `${"x".repeat(STDERR_TAIL_MAX)}TAIL-END\n` } });
  try {
    const r = cli(root, fresh("pharn-verify"));
    assert.equal(r.status, 0);
    assert.ok(r.stderr.includes("TAIL-END"), "the end of the script's stderr reaches the orchestrator");
    assert.ok(r.stderr.length < STDERR_TAIL_MAX + 512, "bounded");
    assert.ok(readFileSync(join(root, RUNNER_LOG), "utf8").includes(`${"x".repeat(STDERR_TAIL_MAX)}TAIL-END`), "whole in the log");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("NEGATIVE — a setter failure in the runner (no thin-caller command file) is exit 2 with today's refusal line replayed; nothing runs", () => {
  const root = project({ commands: false });
  try {
    const r = cli(root, fresh("pharn-regress"));
    assert.deepEqual([r.status, r.stdout], [2, ""]);
    assert.match(
      r.stderr,
      /^stage-direct: refused — the writes-scope for pharn-regress could not be set \(setter exit \d+\); nothing was run$/m
    );
    assert.deepEqual(callsIn(root), [], "the script never ran");
    assert.deepEqual(markersIn(root), []);
    assert.equal(existsSync(join(root, LOCK_FILE)), false);
    // CONTROL: the same root WITH the command files runs.
    mkdirSync(join(root, ".claude", "commands"), { recursive: true });
    copyFileSync(join(REPO, ".claude/commands/pharn-regress.md"), join(root, ".claude/commands/pharn-regress.md"));
    assert.equal(cli(root, fresh("pharn-regress")).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI — an unwritable marker prints MARKER_NOT_WRITTEN and the stage still runs with its own exit; a refused argv runs nothing", () => {
  const root = project({ fx: { exit: 3 } });
  try {
    mkdirSync(join(root, "pharn", ".run"), { recursive: true });
    writeFileSync(join(root, "pharn", ".run", "cost"), "a file where the marker directory belongs\n");
    const r = cli(root, fresh("pharn-verify"));
    assert.equal(r.status, 3);
    const lines = r.stdout.trimEnd().split("\n");
    assert.deepEqual([lines[0], lines.at(-1)], [MARKER_NOT_WRITTEN, MARKER_NOT_WRITTEN]);
    assert.equal(callsIn(root).length, 1, "the script ran");
    assert.match(r.stderr, /stage-start marker was not written/);
    const bad = cli(root, fresh("pharn-verify", { extra: ["--base", "x"] }));
    assert.deepEqual([bad.status, bad.stdout], [2, ""]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI — a --clear that fails is a note in the replayed stderr, never a changed exit (GRILL G2)", () => {
  const root = project();
  try {
    // The project's own setter, replaced by one that sets the scope as the real one does, then fails to release it.
    writeFileSync(
      join(root, SETTER),
      `const r = require("node:child_process").spawnSync(process.execPath, [${JSON.stringify(REAL_SETTER)}, ...process.argv.slice(2)], { stdio: "inherit" });\n` +
        `process.exitCode = process.argv[2] === "--clear" ? 9 : r.status;\n`
    );
    const r = cli(root, fresh("pharn-regress"));
    assert.equal(r.status, 0);
    assert.match(r.stderr, /writes-scope was not released \(setter exit 9\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("NEGATIVE — a runner that finds ANOTHER scope in the file at release leaves it (L38); with its own, it releases", () => {
  const root = project({ fx: { swapScope: true } });
  try {
    const r = cli(root, fresh("pharn-regress"));
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(readJson(root, "pharn/.run/writes-scope.json").scope, ["other/**"], "a later step's scope is left in place");
    assert.match(r.stderr, /the writes-scope file holds another scope now/);
    // CONTROL (the mutant "release unconditionally"): without the swap the scope is released.
    rmSync(join(root, "pharn", ".run", "writes-scope.json"));
    fixture(root, {});
    assert.equal(cli(root, fresh("pharn-regress")).status, 0);
    assert.equal(existsSync(join(root, "pharn", ".run", "writes-scope.json")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI — a script stdout without a final newline gets one, so the return marker stays a WHOLE line (the run binding)", () => {
  const root = project({ fx: { noNewline: true } });
  try {
    const r = cli(root, fresh("pharn-verify"));
    const m = markersIn(root);
    assert.ok(r.stdout.endsWith(`}\n${markerLine(m[1])}\n`), JSON.stringify(r.stdout.slice(-200)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── C1 — the call count ───────────────────────────────────────────────────────────────────────────────

/** Today's path, driven directly: the budgeted script, then `--resume --budget-ms <B>` per exit 5. Returns the calls and
 *  the last invocation's stdout. */
function todayPath(root, stage, argv) {
  const o = parseDirectArgs(argv).opts;
  const script = join(FLOOR, DIRECT_STAGES[stage].script);
  let r = spawnSync(process.execPath, [script, ...scriptArgv(o)], { cwd: root, env: ENV, encoding: "utf8" });
  let calls = 1;
  while (r.status === 5) {
    r = spawnSync(process.execPath, [script, "--resume", "--budget-ms", String(o.budgetMs)], { cwd: root, env: ENV, encoding: "utf8" });
    calls++;
    assert.ok(calls < 50, "today's path loops");
  }
  return { calls, status: r.status, stdout: r.stdout };
}
/** The runner path: the fresh line, then the resume line per exit 5. Returns the calls, the wall time and the outputs. */
function runnerPath(root, stage, argv) {
  const b = parseDirectArgs(argv).opts.budgetMs;
  const t0 = Date.now();
  const outs = [cli(root, argv)];
  while (outs.at(-1).status === 5) {
    outs.push(cli(root, resume(stage, b)));
    assert.ok(outs.length < 50, "the runner path loops");
  }
  return { calls: outs.length, wallMs: Date.now() - t0, outs, last: outs.at(-1) };
}

test("C1 — a stage of wall time W costs ≤ 1 + ⌈W / B⌉ calls; today's path (one call per exit 5) takes more for the same W", () => {
  // B = 2.5 s and T = B, so after any step elapsed + T > B: today's path ends EVERY invocation after one step.
  const b = 2500;
  for (const steps of [[200], Array(6).fill(500)]) {
    const argv = fresh("pharn-regress", { t: b, b });
    const a = project({ fx: { steps } });
    const c = project({ fx: { steps } });
    try {
      const run = runnerPath(a, "pharn-regress", argv);
      assert.equal(run.last.status, 0, run.last.stderr);
      assert.ok(run.calls <= 1 + Math.ceil(run.wallMs / b), `${run.calls} calls over ${run.wallMs} ms`);
      for (const o of run.outs.slice(0, -1))
        assert.match(o.stderr, /stage-direct: waiting \(runner pid \d+ alive\)/, "a 5 is a wait that ran out");
      const today = todayPath(c, "pharn-regress", argv);
      assert.equal(today.status, 0);
      assert.equal(today.calls, steps.length, "CONTROL: today's path spends one call per step here");
      if (steps.length > 1) assert.ok(run.calls < today.calls, `runner ${run.calls} calls < today ${today.calls}`);
      else assert.equal(run.calls, 1, "W < B: one call");
      assert.deepEqual(kinds(a), ["stage-start", "orchestrator"], "C5: one marker pair over a multi-wait run");
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(c, { recursive: true, force: true });
    }
  }
});

// ── C2 — byte identity against today's path ───────────────────────────────────────────────────────────

/** /pharn-ship's answer rule, as its text states it: the pinned line's own flags (through `--budget-ms <B>`), then the
 *  object's `resume.argv` tokens after ITS `--budget-ms <B>` pair, then the chosen option's argv. */
function answerLine(pinned, resumeArgv, optionArgv) {
  const own = pinned.slice(0, pinned.indexOf("--budget-ms") + 2);
  return [...own, ...resumeArgv.slice(resumeArgv.indexOf("--budget-ms") + 2), ...optionArgv];
}

test("C2 — final stdout (a question's resume.argv included), report and stamp are byte-equal to today's path, clock fields masked; the answer line parses", () => {
  // MASKED, by name: the report's `at` (its write time) and the stamp's `started_at` (the invocation's start time).
  const mask = (root, rel, field) => ({ ...readJson(root, rel), [field]: "<clock>" });
  for (const [stage, exit] of [
    ["pharn-verify", 4],
    ["pharn-regress", 0],
  ]) {
    const argv = fresh(stage, { t: 2500, b: 2500 }); // T = B: one step per invocation on BOTH paths, whatever the load
    const a = project({ fx: { steps: [100, 100, 100], exit } });
    const c = project({ fx: { steps: [100, 100, 100], exit } });
    try {
      const run = runnerPath(a, stage, argv);
      const today = todayPath(c, stage, argv);
      assert.equal(run.last.status, exit, run.last.stderr);
      assert.equal(today.status, exit);
      assert.equal(scriptOut(run.last.stdout), today.stdout, `${stage}: the final stdout, byte for byte`);
      assert.deepEqual(
        callsIn(a).map((x) => x.argv),
        callsIn(c).map((x) => x.argv),
        `${stage}: the same script calls, argv for argv`
      );
      assert.deepEqual(mask(a, "fake-report.json", "at"), mask(c, "fake-report.json", "at"));
      assert.deepEqual(mask(a, "fake-stamp.json", "started_at"), mask(c, "fake-stamp.json", "started_at"));
      if (exit === 4) {
        const q = JSON.parse(scriptOut(run.last.stdout));
        assert.ok(q.resume.argv.includes("--budget-ms"), "the GRILL's blocking case: resume.argv keeps its --budget-ms pair");
        const option = REGISTRY.verify.question["no-gates"].options
          .find((o) => o.id === "gates")
          .argv.map((t) => (t === "<value>" ? "test" : t));
        const line = answerLine(argv, q.resume.argv, option);
        const p = parseDirectArgs(line);
        assert.equal(p.ok, true, `${JSON.stringify(line)}: ${p.reason}`);
        assert.deepEqual(p.opts.passthrough, ["--gates", "test"]);
      }
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(c, { recursive: true, force: true });
    }
  }
});

// ── C3 — in flight ────────────────────────────────────────────────────────────────────────────────────

test("C3 — while a runner lives, a second fresh call (either stage) refuses `in-flight`, the other stage's resume `mismatch`, the same stage's resume waits (exit 5); no record moves", async () => {
  const root = project({ fx: { hold: "fresh", steps: [10] } });
  const first = cliAsync(root, fresh("pharn-regress", { b: 120_000 }));
  try {
    await until(() => existsSync(join(root, ".holding")), "the first run's script is running");
    const before = hashes(root);
    for (const stage of Object.keys(DIRECT_STAGES)) {
      const r = cli(root, fresh(stage));
      assert.deepEqual([r.status, r.stdout], [2, ""], stage);
      assert.match(r.stderr, /^stage-direct: refused \(in-flight\) — /, stage);
    }
    const mm = cli(root, resume("pharn-verify"));
    assert.equal(mm.status, 2);
    assert.match(
      mm.stderr,
      /^stage-direct: refused \(mismatch\) — the run in this tree is pharn-regress for demo, not pharn-verify for demo/
    );
    const w = cli(root, resume("pharn-regress", 800));
    assert.deepEqual([w.status, w.stdout], [5, `${MARKER_DEFERRED_CONTINUE}\n`]);
    assert.match(w.stderr, /^stage-direct: waiting \(runner pid \d+ alive\)$/m);
    assert.deepEqual(hashes(root), before, "every record unchanged by the refused and waiting calls");
    assert.deepEqual(kinds(root), ["stage-start"], "no second marker");
    writeFileSync(join(root, ".release"), "1");
    const done = await first.done;
    assert.equal(done.status, 0, done.stderr);
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"], "the first run closes its own stage");
    assert.equal(existsSync(join(root, LOCK_FILE)), false, "and releases the lock");
    assert.equal(existsSync(join(root, "pharn", ".run", "writes-scope.json")), false, "and the scope");
    // CONTROL: the call refused above now runs.
    assert.equal(cli(root, fresh("pharn-verify")).status, 0);
  } finally {
    writeFileSync(join(root, ".release"), "1");
    await Promise.race([first.done, sleep(15_000)]);
    rmSync(root, { recursive: true, force: true });
  }
});

test("C3 — between the spawn and the lock's handoff (the lock names a live START CALL), a fresh call refuses `in-flight`; nothing moves", () => {
  const root = project();
  const s = sleeper();
  try {
    plantRun(root, {
      lock: { pid: s.pid, startedAt: "2026-11-13T00:00:00.000Z", stage: "pharn-regress", name: "demo", nonce: NONCE_A, holder: "call" },
    });
    const before = hashes(root);
    const r = cli(root, fresh("pharn-regress"));
    assert.deepEqual([r.status, r.stdout], [2, ""]);
    assert.match(r.stderr, new RegExp(`^stage-direct: refused \\(in-flight\\) — another call \\(pid ${s.pid}, pharn-regress for demo, `));
    assert.deepEqual(hashes(root), before);
    assert.deepEqual(callsIn(root), []);
  } finally {
    s.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

// ── C4 / C5 — takeover, and the return marker exactly once ────────────────────────────────────────────

/** An uninterrupted run of `fx` — the reference stdout a takeover must reach. */
function reference(stage, argv, fx) {
  const root = project({ fx });
  try {
    const r = runnerPath(root, stage, argv).last;
    assert.equal(r.status, fx.exit ?? 0, r.stderr);
    return scriptOut(r.stdout);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
/** SIGKILL the runner's whole process group once its held script is running; resolves when the group is empty. */
async function killRunnerGroup(root) {
  await until(() => existsSync(join(root, ".holding")) && existsSync(join(root, STATE_FILE)), "the held script and the runner's state");
  const pgid = readJson(root, STATE_FILE).runner_pid;
  killGroup(pgid);
  await until(() => !groupLive(pgid), `group ${pgid} gone`);
  return pgid;
}

test("C4(a) — the runner's group killed BEFORE the first checkpoint: the waiting call defers (exit 5), the resume line takes over and RE-RUNS the fresh argv; C5: one marker pair", async () => {
  const argv = fresh("pharn-regress", { t: 1000, b: 120_000 });
  const fx = { hold: "fresh", steps: [20] };
  const ref = reference("pharn-regress", argv, { steps: [20] });
  const root = project({ fx });
  const first = cliAsync(root, argv);
  try {
    await killRunnerGroup(root);
    const f = await first.done;
    assert.deepEqual([f.status, f.stdout.split("\n").at(-2)], [5, MARKER_DEFERRED_CONTINUE], f.stderr);
    assert.match(f.stderr, /takeover deferred/, "NEGATIVE: a call that already waited past one poll takes over nothing");
    const r = cli(root, resume("pharn-regress", 120_000));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /took over pharn-regress for demo \(fresh\)/);
    assert.equal(scriptOut(r.stdout), ref, "the same verdict object as an uninterrupted run");
    assert.deepEqual(
      callsIn(root).map((c) => c.mode),
      ["fresh", "fresh"],
      "the killed invocation, then the fresh argv again"
    );
    assert.deepEqual(callsIn(root)[1].argv, scriptArgv(parseDirectArgs(argv).opts));
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"]);
    assert.equal(existsSync(join(root, LOCK_FILE)), false);
  } finally {
    writeFileSync(join(root, ".release"), "1");
    await Promise.race([first.done, sleep(15_000)]);
    rmSync(root, { recursive: true, force: true });
  }
});

test("C4(b) — the runner's group killed AFTER a continue: the takeover runs the script's own --resume; C5: one marker pair", async () => {
  // T = B: the first invocation runs one step and continues; the runner's --resume holds.
  const argv = fresh("pharn-regress", { t: 10_000, b: 10_000 });
  const ref = reference("pharn-regress", argv, { steps: [20, 20] });
  const root = project({ fx: { hold: "resume", steps: [20, 20] } });
  const first = cliAsync(root, argv);
  try {
    await killRunnerGroup(root);
    const f = await first.done;
    assert.equal(f.status, 5, f.stderr);
    const r = cli(root, resume("pharn-regress", 10_000));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /took over pharn-regress for demo \(resume\)/);
    assert.equal(scriptOut(r.stdout), ref);
    assert.deepEqual(callsIn(root).at(-1).argv, ["--resume", "--budget-ms", "10000"], "the script's own resume, with the line's budget");
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"]);
  } finally {
    writeFileSync(join(root, ".release"), "1");
    await Promise.race([first.done, sleep(15_000)]);
    rmSync(root, { recursive: true, force: true });
  }
});

test("C4(c) / C5 — the script EXITED, the runner died before the marker: the takeover runs nothing and writes the marker once; after a marker already written it writes none", () => {
  for (const marked of [false, true]) {
    const root = project();
    try {
      const dead = deadPid();
      const ret = { seq: 2, kind: "orchestrator", stage: null, iteration: null, ts: "2026-11-13T00:00:01.000Z", session_id: null };
      plantRun(root, {
        state: stateOf({
          pid: dead,
          runnerPid: dead,
          startMarker: { line: markerLine(startMarkerRec), seq: 1 },
          phase: "script-exited",
          exit: 3,
          stdout: '{"from":"state"}',
          invocations: 1,
        }),
        markers: marked ? [startMarkerRec, ret] : [startMarkerRec],
      });
      const r = cli(root, resume("pharn-regress"));
      assert.equal(r.status, 3, r.stderr);
      assert.match(r.stderr, /took over pharn-regress for demo \(finish\)/);
      assert.deepEqual(callsIn(root), [], "the exited script is never run again");
      const m = markersIn(root);
      assert.deepEqual(
        m.map((x) => x.kind),
        ["stage-start", "orchestrator"],
        `marked=${marked}: exactly one return marker`
      );
      assert.equal(r.stdout, `{"from":"state"}\n${markerLine(m[1])}\n`, "the recorded stdout and the (one) return line");
      if (marked) assert.deepEqual(m[1], ret, "the marker written before the kill is the one");
      assert.equal(parseResult(readFileSync(join(root, RESULT_FILE), "utf8")).exit, 3, "the result is written");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("C4 — no start marker recorded (the runner died before it): the takeover writes and PRINTS it, then runs the fresh argv", () => {
  const root = project({ fx: { steps: [10] } });
  try {
    const dead = deadPid();
    plantRun(root, { state: stateOf({ pid: dead, runnerPid: dead, startMarker: null }) });
    const r = cli(root, resume("pharn-regress"));
    assert.equal(r.status, 0, r.stderr);
    const m = markersIn(root);
    assert.deepEqual(
      m.map((x) => x.kind),
      ["stage-start", "orchestrator"]
    );
    assert.ok(r.stdout.startsWith(`${markerLine(m[0])}\n`), "rule 6: the start line reaches an orchestrator tool result");
    assert.deepEqual(callsIn(root)[0].mode, "fresh");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── C6 — nonce binding ────────────────────────────────────────────────────────────────────────────────

test("C6 — a result.json / state.json with ANOTHER nonce is never read: no byte of it reaches the output", () => {
  const leaked = {
    nonce: NONCE_B,
    stage: "pharn-regress",
    name: "demo",
    exit: 0,
    stdout: "LEAKED-RESULT",
    stderrTail: "LEAKED-TAIL",
    startLine: null,
    returnLine: "LEAKED-RETURN",
  };
  // (1) holder dead: the bound state is absent, so the takeover starts the run anew.
  const root = project({ fx: { steps: [10] } });
  try {
    const dead = deadPid();
    plantRun(root, {
      state: stateOf({ nonce: NONCE_B, pid: dead, runnerPid: dead, phase: "script-exited", exit: 0, stdout: "LEAKED-STATE" }),
      result: leaked,
    });
    const r = cli(root, resume("pharn-regress"));
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(`${r.stdout}${r.stderr}`, /LEAKED/);
    assert.match(r.stderr, /took over pharn-regress for demo \(start\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  // (2) holder alive: the other run's result is not this run's — wait, then exit 5.
  const root2 = project();
  const s = sleeper();
  try {
    plantRun(root2, {
      result: leaked,
      lock: { pid: s.pid, startedAt: "2026-11-13T00:00:00.000Z", stage: "pharn-regress", name: "demo", nonce: NONCE_A, holder: "call" },
    });
    const r = cli(root2, resume("pharn-regress", 600));
    assert.equal(r.status, 5, r.stderr);
    assert.doesNotMatch(`${r.stdout}${r.stderr}`, /LEAKED/);
  } finally {
    s.kill("SIGKILL");
    rmSync(root2, { recursive: true, force: true });
  }
});

// ── the negative controls ─────────────────────────────────────────────────────────────────────────────

test("NEGATIVE — the runner dead, its process group ALIVE (an orphaned script): `orphaned`, exit 2, naming the group — never a second script", async () => {
  const root = project({ fx: { hold: "fresh", steps: [10] } });
  const first = cliAsync(root, fresh("pharn-regress", { b: 120_000 }));
  let pgid = null;
  try {
    await until(() => existsSync(join(root, ".holding")) && existsSync(join(root, STATE_FILE)), "the held script and the runner's state");
    pgid = readJson(root, STATE_FILE).runner_pid;
    process.kill(pgid, "SIGKILL"); // the runner alone; its script lives on in the group
    const f = await first.done;
    assert.equal(f.status, 2, f.stderr);
    assert.match(f.stderr, new RegExp(`refused \\(orphaned\\) — .*process group ${pgid} still runs.*kill -TERM -- -${pgid}`));
    const r = cli(root, resume("pharn-regress"));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /refused \(orphaned\)/);
    const again = cli(root, fresh("pharn-regress"));
    assert.equal(again.status, 2, "a fresh call does not start a second runner beside the orphan");
    assert.match(again.stderr, /refused \(in-flight\) — an earlier runner's process group/);
    assert.equal(callsIn(root).length, 1, "one script, never a second");
  } finally {
    writeFileSync(join(root, ".release"), "1");
    if (pgid) killGroup(pgid);
    await Promise.race([first.done, sleep(15_000)]);
    rmSync(root, { recursive: true, force: true });
  }
});

test("NEGATIVE — runner.json for the other stage → `mismatch`; no runner.json → `no-run`; each exit 2, nothing written", () => {
  const root = project();
  try {
    const none = cli(root, resume("pharn-verify"));
    assert.deepEqual([none.status, none.stdout], [2, ""]);
    assert.match(none.stderr, /^stage-direct: refused \(no-run\) — no run was started in this tree/);
    assert.equal(existsSync(join(root, RUNNER_FILE)), false);
    plantRun(root, { stage: "pharn-regress" });
    const before = hashes(root);
    const mm = cli(root, resume("pharn-verify"));
    assert.deepEqual([mm.status, mm.stdout], [2, ""]);
    assert.match(mm.stderr, /^stage-direct: refused \(mismatch\) — /);
    assert.deepEqual(hashes(root), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("NEGATIVE — two resume lines racing to take over: ONE takes over, the other waits and prints the same result; one script run, one marker pair", async () => {
  const root = project({ fx: { steps: [800] } });
  try {
    const dead = deadPid();
    plantRun(root, {
      state: stateOf({ pid: dead, runnerPid: dead, startMarker: { line: markerLine(startMarkerRec), seq: 1 } }),
      markers: [startMarkerRec],
    });
    const x = cliAsync(root, resume("pharn-regress", 120_000));
    const y = cliAsync(root, resume("pharn-regress", 120_000));
    const [rx, ry] = await Promise.all([x.done, y.done]);
    assert.deepEqual([rx.status, ry.status], [0, 0], `${rx.stderr}\n${ry.stderr}`);
    assert.equal(scriptOut(rx.stdout), scriptOut(ry.stdout), "the same result");
    assert.equal(callsIn(root).length, 1, "one script run");
    // Both replay the one result's tail, which names the takeover; one script run is the evidence only one ran it.
    assert.ok(
      [rx, ry].every((r) => /took over pharn-regress for demo \(fresh\)/.test(r.stderr)),
      "the result names one takeover"
    );
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("NEGATIVE (review, important) — an UNREADABLE lock (torn, pre-upgrade /1) beside a dead runner: the resume line refuses `in-flight` (exit 2) every time — never an endless exit-5 loop", () => {
  const preUpgrade = `${JSON.stringify({ schema: "pharn-stage-direct-lock/1", pid: 1, started_at: "2026-11-01T00:00:00.000Z", stage: "pharn-regress", name: "demo" })}\n`;
  for (const text of ["", preUpgrade]) {
    const root = project({ fx: { steps: [10] } });
    try {
      const dead = deadPid();
      plantRun(root, { state: stateOf({ pid: dead, runnerPid: dead }), markers: [startMarkerRec] });
      writeFileSync(join(root, LOCK_FILE), text);
      for (let i = 0; i < 3; i++) {
        const r = cli(root, resume("pharn-regress"));
        assert.deepEqual([r.status, r.stdout], [2, ""], `${JSON.stringify(text)} #${i}: ${r.stderr}`);
        assert.match(
          r.stderr,
          /^stage-direct: refused \(in-flight\) — pharn\/\.run\/stage-direct\/in-flight\.json holds no readable lock record; if no stage-direct call is running in this tree, remove it/m
        );
      }
      assert.deepEqual(callsIn(root), [], "no script ran");
      assert.equal(readFileSync(join(root, LOCK_FILE), "utf8"), text, "the lock is left for a person");
      // CONTROL (the remedy the refusal names): the lock removed, the same resume line takes over and finishes.
      rmSync(join(root, LOCK_FILE));
      const ok = cli(root, resume("pharn-regress"));
      assert.equal(ok.status, 0, ok.stderr);
      assert.match(ok.stderr, /took over pharn-regress for demo \(fresh\)/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("C4 — the takeover's OWN invocation continues (exit 5): the continue is recorded, scope and lock released, exit 5 with no object; the next resume line runs --resume and closes the stage once", () => {
  const argv = fresh("pharn-regress", { t: 10_000, b: 10_000 });
  const root = project({ fx: { steps: [20, 20] } });
  try {
    const dead = deadPid();
    plantRun(root, { argv, state: stateOf({ pid: dead, runnerPid: dead, invocations: 1, continues: 1 }), markers: [startMarkerRec] });
    // The script's own checkpoint after the runner's first `continue`: nothing done yet, T = 10 s.
    writeFileSync(
      join(root, "fake-progress.json"),
      JSON.stringify({ argv: scriptArgv(parseDirectArgs(argv).opts), feature: "demo", timeoutMs: 10_000, done: 0 })
    );
    // B = 5 s < T: the takeover's one invocation runs its first step (always permitted), then continues.
    const r1 = cli(root, resume("pharn-regress", 5000));
    assert.deepEqual([r1.status, r1.stdout], [5, `${MARKER_DEFERRED_CONTINUE}\n`], r1.stderr);
    assert.match(r1.stderr, /the takeover's script run continues \(exit 5\)/);
    const st = parseState(readFileSync(join(root, STATE_FILE), "utf8"));
    assert.deepEqual([st.holder, st.invocations, st.continues, st.phase], ["takeover", 2, 2, "running"], "the continue is recorded");
    assert.equal(existsSync(join(root, LOCK_FILE)), false, "the lock is released");
    assert.equal(existsSync(join(root, "pharn", ".run", "writes-scope.json")), false, "the scope is released");
    assert.deepEqual(kinds(root), ["stage-start"], "no return marker on a continue");
    const r2 = cli(root, resume("pharn-regress", 5000));
    assert.equal(r2.status, 0, r2.stderr);
    assert.match(r2.stderr, /took over pharn-regress for demo \(resume\)/);
    assert.deepEqual(
      callsIn(root).map((c) => c.argv),
      [
        ["--resume", "--budget-ms", "5000"],
        ["--resume", "--budget-ms", "5000"],
      ],
      "both takeovers ran the script's own --resume with the line's budget"
    );
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"], "C5: one return marker");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("NEGATIVE — a runner never handed the lock refuses after HANDOFF_MAX_MS and runs nothing (the wait then takes over)", () => {
  // runner.json names this nonce, but no lock names the runner (a start call that died before its handoff). A positive
  // control is every other CLI test: there the start call hands off and the runner runs.
  const root = project({ fx: { steps: [10] } });
  try {
    plantRun(root, {});
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [CLI, "--runner", NONCE_A], { cwd: root, env: ENV, encoding: "utf8", timeout: 60_000 });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /the in-flight lock was never handed to this runner; nothing was run/);
    assert.ok(Date.now() - t0 >= HANDOFF_MAX_MS - 500, "it waited for the handoff first");
    assert.deepEqual(callsIn(root), []);
    assert.deepEqual(markersIn(root), []);
    assert.equal(existsSync(join(root, STATE_FILE)), false);
    assert.equal(existsSync(join(root, RESULT_FILE)), false);
    assert.equal(existsSync(join(root, "pharn", ".run", "writes-scope.json")), false, "no scope was set");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("NEGATIVE (review) — a FAILED lock handoff kills the runner, removes runner.json and releases the lock: no later resume line runs the refused start", () => {
  const root = project();
  try {
    // In-process, so the start call's pid is this process's: a directory at the handoff's tmp path makes that one
    // write fail (runner.json's tmp has another name), with no fault hook in production.
    mkdirSync(join(root, `${LOCK_FILE}.tmp-${process.pid}`), { recursive: true });
    const r = runDirect(fresh("pharn-regress"), { root });
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(r.err.join("\n"), /^refused \(lock-unusable\) — the lock could not be handed to the runner \(/);
    assert.equal(existsSync(join(root, RUNNER_FILE)), false, "runner.json removed, as the spawn-failed path does");
    assert.equal(existsSync(join(root, LOCK_FILE)), false, "the lock released");
    // CONTROL (the mutant "leave runner.json"): the resume line finds no run to take over.
    const after = cli(root, resume("pharn-regress"));
    assert.equal(after.status, 2);
    assert.match(after.stderr, /^stage-direct: refused \(no-run\) — /);
    assert.deepEqual(callsIn(root), [], "nothing ran");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("NEGATIVE — `--runner` with a wrong nonce, or malformed, refuses (exit 2) and runs nothing", () => {
  const root = project({ fx: { steps: [10] } });
  try {
    plantRun(root, {});
    const wrong = spawnSync(process.execPath, [CLI, "--runner", NONCE_B], { cwd: root, env: ENV, encoding: "utf8" });
    assert.equal(wrong.status, 2);
    assert.match(wrong.stderr, /runner\.json does not name this runner's nonce; nothing was run/);
    for (const argv of [["--runner"], ["--runner", "xyz"], ["--runner", NONCE_A, "extra"]]) {
      const o = spawnSync(process.execPath, [CLI, ...argv], { cwd: root, env: ENV, encoding: "utf8" });
      assert.deepEqual([o.status, o.stdout], [2, ""], JSON.stringify(argv));
      assert.match(o.stderr, /--runner takes exactly one run nonce/);
    }
    assert.deepEqual(callsIn(root), []);
    assert.equal(existsSync(join(root, STATE_FILE)), false);
    assert.equal(existsSync(join(root, RESULT_FILE)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('NEGATIVE — malformed and {"toString":1} records refuse `record-unusable` (exit 2), never a guess', () => {
  for (const [rel, text] of [
    [RUNNER_FILE, '{"toString":1}'],
    [RUNNER_FILE, "{"],
    [STATE_FILE, '{"toString":1}'],
    [RESULT_FILE, '{"toString":1}'],
  ]) {
    const root = project();
    try {
      plantRun(root, {});
      writeFileSync(join(root, rel), text);
      const r = cli(root, resume("pharn-regress"));
      assert.deepEqual([r.status, r.stdout], [2, ""], `${rel}: ${text}`);
      assert.match(r.stderr, /refused \(record-unusable\)/, `${rel}: ${text}`);
      assert.deepEqual(callsIn(root), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("NEGATIVE (L54) — a dangling symlink at each record: both lines refuse, and nothing is written through it", () => {
  for (const rel of [RUNNER_FILE, STATE_FILE, RESULT_FILE, RUNNER_LOG]) {
    const root = project();
    const elsewhere = mkdtempSync(join(tmpdir(), "stage-direct-elsewhere-"));
    try {
      if (rel !== RUNNER_FILE) plantRun(root, {});
      else mkdirSync(join(root, LOCK_DIR), { recursive: true });
      symlinkSync(join(elsewhere, "target"), join(root, rel));
      for (const argv of [fresh("pharn-regress"), resume("pharn-regress")]) {
        const r = cli(root, argv);
        assert.deepEqual([r.status, r.stdout], [2, ""], `${rel} ${argv.includes("--resume") ? "resume" : "fresh"}`);
        assert.match(r.stderr, /refused \(record-unusable\) — .* is not a regular file/, rel);
      }
      assert.deepEqual(readdirSync(elsewhere), [], `${rel}: nothing through the link`);
      assert.deepEqual(callsIn(root), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(elsewhere, { recursive: true, force: true });
    }
  }
});

// ── the in-flight lock (GATE-2 review R1) ─────────────────────────────────────────────────────────────

const lockPath = (root) => join(root, LOCK_FILE);
function plantLock(root, text) {
  mkdirSync(join(root, LOCK_DIR), { recursive: true });
  writeFileSync(lockPath(root), text);
}
const lockOf = (pid, holder = "call") =>
  lockRecord({ pid, startedAt: "2026-10-05T00:00:00.000Z", stage: "pharn-regress", name: "demo", nonce: NONCE_A, holder });

test("the lock — held by a LIVE call refuses a fresh call `in-flight` (exit 2): no scope set, nothing run or marked, the lock untouched", () => {
  const root = project();
  try {
    const held = lockOf(process.pid);
    plantLock(root, held);
    const r = cli(root, fresh("pharn-verify"));
    assert.deepEqual([r.status, r.stdout], [2, ""]);
    assert.match(r.stderr, /^stage-direct: refused \(in-flight\) — another call \(pid \d+, pharn-regress for demo, /);
    assert.deepEqual(callsIn(root), [], "the script never ran");
    assert.equal(existsSync(join(root, "pharn", ".run", "writes-scope.json")), false, "no scope was set");
    assert.deepEqual(markersIn(root), [], "no marker");
    assert.equal(readFileSync(lockPath(root), "utf8"), held, "the holder's lock is left alone");
    // CONTROL (the mutant "the lock is ignored"): the same root with no lock runs, and the lock is released.
    rmSync(lockPath(root));
    const ok = cli(root, fresh("pharn-verify"));
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(existsSync(lockPath(root)), false, "released");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the lock — a DEAD holder's lock is stale: cleared, taken and released; a dead RUNNER's too; a torn record is never guessed stale", () => {
  const root = project();
  try {
    for (const holder of ["call", "runner"]) {
      plantLock(root, lockOf(deadPid(), holder));
      const r = cli(root, fresh("pharn-verify"));
      assert.equal(r.status, 0, `${holder}: ${r.stderr}`);
      assert.equal(existsSync(lockPath(root)), false);
    }
    // A runner holder whose pid is LIVE but is no runner of that nonce (a reused pid) reads dead by `ps` — stale.
    plantLock(root, lockOf(process.pid, "runner"));
    assert.equal(cli(root, fresh("pharn-verify")).status, 0, "the ps nonce check: the test process is not that runner");
    plantLock(root, "");
    const torn = cli(root, fresh("pharn-verify"));
    assert.equal(torn.status, 2);
    assert.match(
      torn.stderr,
      /^stage-direct: refused \(in-flight\) — pharn\/\.run\/stage-direct\/in-flight\.json holds no readable lock record; if no stage-direct call is running in this tree, remove it/
    );
    assert.equal(readFileSync(lockPath(root), "utf8"), "", "a torn record is left for a person");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the lock — a lock directory, or `pharn` above it, that is a link or a file refuses `lock-unusable`; nothing is written through it", () => {
  for (const [at, plant] of [
    [LOCK_DIR, "link"],
    [LOCK_DIR, "file"],
    ["pharn", "link"],
  ]) {
    const root = project();
    const elsewhere = mkdtempSync(join(tmpdir(), "stage-direct-elsewhere-"));
    try {
      if (at === LOCK_DIR) mkdirSync(join(root, "pharn", ".run"), { recursive: true });
      if (plant === "link") symlinkSync(elsewhere, join(root, at));
      else writeFileSync(join(root, at), "x");
      const r = cli(root, fresh("pharn-verify"));
      assert.deepEqual([r.status, r.stdout], [2, ""], `${at} ${plant}`);
      assert.match(
        r.stderr,
        new RegExp(`^stage-direct: refused \\(lock-unusable\\) — ${at.replaceAll("/", "\\/").replaceAll(".", "\\.")} is not a directory`),
        `${at} ${plant}`
      );
      assert.deepEqual(readdirSync(elsewhere), [], `${at} ${plant}: nothing through the link`);
      assert.deepEqual(callsIn(root), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(elsewhere, { recursive: true, force: true });
    }
  }
});

test("the lock — released after every exit and a signal, but never while it holds ANOTHER call's record", () => {
  for (const exit of [0, 4, "SIGKILL"]) {
    const root = project({ fx: { exit } });
    try {
      cli(root, fresh("pharn-regress"));
      assert.equal(existsSync(lockPath(root)), false, `exit ${exit}: released`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  const other = lockOf(process.pid);
  const root = project({ fx: { swapLock: other } });
  try {
    const r = cli(root, fresh("pharn-regress"));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(lockPath(root), "utf8"), other, "another call's record is not deleted");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── (c) the REAL stage scripts ────────────────────────────────────────────────────────────────────────

/** A git repo with an approved SPEC, a PLAN declaring src/index.js and NO test file anywhere (so regress asks
 *  `tests-unresolved`), the thin caller and the whole `.claude/hooks/` committed for the setter (L81), and src/index.js
 *  changed after the base. */
function regressRepo() {
  const dir = mkdtempSync(join(tmpdir(), "stage-direct-rt-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), "pharn/.run/\n");
  writeFileSync(join(dir, "package.json"), `${JSON.stringify({ name: "fx", version: "1.0.0", scripts: { test: "node --test" } })}\n`);
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "index.js"), "export const add = (a, b) => a + b;\n");
  mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
  copyFileSync(join(REPO, ".claude/commands/pharn-regress.md"), join(dir, ".claude/commands/pharn-regress.md"));
  // The whole hooks directory (L81) minus its test files: those would resolve regress's test universe, and this fixture
  // must have none (that is what makes regress ask `tests-unresolved`).
  cpSync(join(REPO, ".claude", "hooks"), join(dir, ".claude", "hooks"), {
    recursive: true,
    filter: (src) => !/\.test\.[cm]?js$/.test(src),
  });
  const feat = join(dir, "pharn", "features", "demo");
  mkdirSync(feat, { recursive: true });
  const body = "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n";
  const hash = createHash("sha256").update(body).digest("hex");
  writeFileSync(join(feat, "SPEC.md"), `---\nspec_id: demo\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`);
  writeFileSync(
    join(feat, "PLAN.md"),
    `---\nspec_id: demo\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — the feature\n`
  );
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  writeFileSync(join(dir, "src", "index.js"), "export const add = (a, b) => a + b;\nexport const id = (x) => x;\n");
  return { dir, base };
}

/** One direct call in-process (its runner is the REAL stage-direct.mjs beside this file, with the REAL regress script),
 *  outside node:test's own coordination env (see stage-regress.test) — the runner inherits the env at its spawn. */
function realRegress(dir, argv) {
  const saved = process.env.NODE_TEST_CONTEXT;
  delete process.env.NODE_TEST_CONTEXT;
  try {
    const r = runDirect(argv, { root: dir });
    const lines = r.out.trimEnd().split("\n");
    let obj = null;
    try {
      obj = JSON.parse(lines.slice(argv.includes("--resume") ? 0 : 1, -1).join("\n"));
    } catch {
      // a refusal of the call itself prints no object
    }
    return { exit: r.exit, obj, err: r.err.join("\n") };
  } finally {
    if (saved !== undefined) process.env.NODE_TEST_CONTEXT = saved;
  }
}

test("★ a question's answer line — the pinned line's own flags + resume.argv after its --budget-ms pair + the option: a tests-unresolved RE-ASK reaches done; the old 'same line + option' is refused (GATE-2 review R2)", () => {
  const { dir, base } = regressRepo();
  try {
    const opt = (id) => REGISTRY.regress.question["tests-unresolved"].options.find((o) => o.id === id).argv;
    const pinned = fresh("pharn-regress", { extra: ["--base", base] }); // ship's pinned regress line
    const q1 = realRegress(dir, pinned);
    assert.equal(q1.exit, EXIT_CODE.question, q1.err);
    assert.equal(q1.obj.reason_code, "tests-unresolved");
    // The human first answers with a pathspec that matches nothing: the stage asks AGAIN.
    const line1 = answerLine(
      pinned,
      q1.obj.resume.argv,
      opt("tests").map((t) => (t === "<value>" ? "nonexistent/**/*.spec.js" : t))
    );
    const q2 = realRegress(dir, line1);
    assert.equal(q2.exit, EXIT_CODE.question, q2.err);
    assert.equal(q2.obj.reason_code, "tests-unresolved");
    assert.ok(!q2.obj.resume.argv.includes("--tests"), "the script's resume.argv drops the --tests that did not resolve");
    // CONTROLS — the old rule, "re-run the same line with the option appended", on the re-ask:
    const dup = realRegress(dir, [...line1, ...opt("tests").map((t) => (t === "<value>" ? "src/**" : t))]);
    assert.equal(dup.exit, 2, "a second --tests: the call refuses its own argv");
    assert.match(dup.err, /--tests was given more than once/);
    const clash = realRegress(dir, [...line1, ...opt("no-tests")]);
    assert.equal(clash.exit, 2, "--tests beside --no-tests: the script refuses");
    assert.equal(clash.obj?.status, "unusable");
    // The rule: the answer goes on — to the next question (no lockfile), answered by the same rule, then done.
    const q3 = realRegress(dir, answerLine(pinned, q2.obj.resume.argv, opt("no-tests")));
    assert.equal(q3.exit, EXIT_CODE.question, q3.err);
    assert.equal(q3.obj.reason_code, "install-unresolved");
    assert.ok(q3.obj.resume.argv.includes("--no-tests"), "the earlier answer rides in resume.argv");
    const noInstall = REGISTRY.regress.question["install-unresolved"].options.find((o) => o.id === "no-install").argv;
    const done = realRegress(dir, answerLine(pinned, q3.obj.resume.argv, noInstall));
    assert.equal(done.exit, 0, `${done.err}\n${JSON.stringify(done.obj)}`);
    assert.equal(done.obj.status, "done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the CLI — the real stage-verify.mjs refuses in a scratch tree, and the call passes its object and code through; odd argv is exit 2", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-direct-cli-"));
  try {
    // 7.0.0: the state root is pharn/.run, and a symlinked pharn is refused (it would carry scratch into the repo),
    // so pharn/ is a real directory here whose shipped members are linked one by one.
    mkdirSync(join(root, "pharn"));
    for (const e of readdirSync(join(REPO, "pharn"))) {
      if (![".run", ".backup", "features", "memory-bank"].includes(e)) symlinkSync(join(REPO, "pharn", e), join(root, "pharn", e));
    }
    mkdirSync(join(root, ".claude"));
    symlinkSync(join(REPO, ".claude", "hooks"), join(root, ".claude", "hooks"));
    symlinkSync(join(REPO, ".claude", "commands"), join(root, ".claude", "commands"));
    const r = spawnSync(process.execPath, [REAL_CLI, ...fresh("pharn-verify")], { cwd: root, env: ENV, encoding: "utf8" });
    assert.equal(r.status, 2, r.stderr);
    const lines = r.stdout.trimEnd().split("\n");
    const obj = JSON.parse(lines.slice(1, -1).join("\n"));
    assert.deepEqual([obj.schema, obj.status, obj.stage], ["pharn-stage-exit/1", "unusable", "verify"]);
    assert.match(lines[0], /^marker 1: stage-start pharn-verify iter=1 /);
    assert.match(lines.at(-1), /^marker 2: orchestrator /);
    assert.equal(existsSync(join(root, "pharn", ".run", "writes-scope.json")), false);
    // Odd argv at the CLI: exit 2, nothing on stdout, no stack trace.
    for (const argv of [[], ["--stage"], ["--stage", "toString", "--name", "demo", "--budget-ms", "1"], ["--runner"]]) {
      const o = spawnSync(process.execPath, [REAL_CLI, ...argv], { cwd: root, env: ENV, encoding: "utf8" });
      assert.deepEqual([o.status, o.stdout], [2, ""], `${JSON.stringify(argv)}: ${o.stderr}`);
      assert.doesNotMatch(o.stderr, /at .*\.mjs:\d+/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── (d) IN-PROCESS: runDirect / runRunner / acquireLock / releaseLock driven in THIS process ───────────
// Node's coverage merge keeps what this process runs and drops what a CLI child runs, so the call's own paths — the
// wait, the takeover, the runner, the lock — are driven here too. In-process there is nothing to inject (L41): the
// scripts are the REAL stage scripts beside stage-direct.mjs and the setter is the scratch root's own, so every verdict
// below is a real script's (regress over `regressRepo`, verify refusing in a scratch root) and every fault is built in
// the tree — a directory at a tmp path, a mode bit, a probe gate, or a fake `ps` on PATH that plants a change at one
// exact step. The tests named `runDirect — …`, `parseLock — …` and `★ two PROCESSES — …` keep their 6.43.0 names: each
// still checks what its name says, in the 7.15.0 form (a fresh call starts a runner and waits for it; exit 5 is the
// runner's; the lock is schema /2).

const SESSION_KEYS = ["NODE_TEST_CONTEXT", "CLAUDE_PROJECT_DIR", "CLAUDE_CODE_SESSION_ID"];
/** Run `fn` with process.env as an orchestrator's call sees it, plus `set`: node:test's coordination env and the
 *  session's ids removed — the runner, the setter and every script inherit process.env at their spawn. */
function bare(fn, set = {}) {
  const keys = [...SESSION_KEYS, ...Object.keys(set)];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of SESSION_KEYS) delete process.env[k];
  Object.assign(process.env, set);
  try {
    return fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}
/** One direct call in THIS process: its result, the stdout pieces as emitted, the replayed tail and its own lines. */
function direct(root, argv, set = {}) {
  const pieces = [];
  const tail = [];
  const r = bare(() => runDirect(argv, { root, write: (s) => pieces.push(s), writeErr: (s) => tail.push(s) }), set);
  return { ...r, pieces, tail: tail.join(""), errText: r.err.join("\n") };
}
/** `runRunner` in THIS process; what it writes to stderr (its log) is captured. */
function runnerIn(root, nonce) {
  let log = "";
  const write = process.stderr.write;
  process.stderr.write = (s) => {
    log += String(s);
    return true;
  };
  try {
    return { exit: bare(() => runRunner(nonce, { root })), log };
  } finally {
    process.stderr.write = write;
  }
}
const DONE_FLAGS = ["--no-tests", "--no-install"]; // regress over regressRepo: no question, a `done` exit 0
const SCOPE = (root) => join(root, "pharn", ".run", "writes-scope.json");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const syncSleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/** The lock as a start call hands it to the runner — here, to THIS process (runRunner checks its own pid). */
const handed = (stage = "pharn-regress") => ({
  pid: process.pid,
  startedAt: "2026-11-13T00:00:00.000Z",
  stage,
  name: "demo",
  nonce: NONCE_A,
  holder: "runner",
});
const readState = (root) => parseState(readFileSync(join(root, STATE_FILE), "utf8"));
const readResult = (root) => parseResult(readFileSync(join(root, RESULT_FILE), "utf8"));
/** Wait (bounded, never failing) until no lock is left — a detached runner finishing after a failed assertion. */
async function settle(root) {
  for (const end = Date.now() + 20_000; Date.now() < end && existsSync(join(root, LOCK_FILE));) await sleep(50);
}
const psShows = (pid, nonce) =>
  spawnSync("ps", ["-ww", "-p", String(pid), "-o", "args="], { encoding: "utf8" }).stdout.includes(`--runner ${nonce}`);
/** A live process whose argv carries `--runner <nonce>` — what `ps` shows for that run's runner — for `lifeMs`. */
function fakeRunner(nonce, lifeMs = 60_000) {
  const c = spawn(process.execPath, ["-e", `setTimeout(() => {}, ${lifeMs})`, "--", "--runner", nonce], { stdio: "ignore" });
  for (const end = Date.now() + 10_000; Date.now() < end; syncSleep(10)) if (psShows(c.pid, nonce)) return c;
  c.kill("SIGKILL");
  assert.fail("the fake runner's argv never showed in ps");
}

/** A gate for the REAL stage-regress.mjs (`--gates "<node> <probe> <ctl>::probe"`, run at the base and at HEAD). It logs
 *  what it sees to `<ctl>/probe.log` — its cwd, the root's scope, and with `guard` the live guard's verdicts inside and
 *  outside pharn/.run/** — then, as `<ctl>/probe.json` says: `swapLock` (write that text over the lock), `hold` (once:
 *  write `<ctl>/.holding`, wait for `<ctl>/.release`), `kill` (once: SIGKILL its stage script, found up its ppid chain). */
const PROBE_SRC = `
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
const ctl = process.argv[2];
const fx = JSON.parse(readFileSync(join(ctl, "probe.json"), "utf8"));
const once = (tag) => { const f = join(ctl, "." + tag + "-once"); if (existsSync(f)) return false; writeFileSync(f, "1"); return true; };
const scopeFile = join(fx.root, "pharn", ".run", "writes-scope.json");
const seen = { cwd: process.cwd(), scope: existsSync(scopeFile) ? JSON.parse(readFileSync(scopeFile, "utf8")).scope : null };
if (fx.guard) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  const g = (p) => spawnSync(process.execPath, [fx.guard], { cwd: fx.root, input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: p } }), encoding: "utf8", env }).status;
  seen.inside = g("pharn/.run/pharn-regress/other.json");
  seen.outside = g("pharn/features/demo/REGRESSION.md");
}
appendFileSync(join(ctl, "probe.log"), JSON.stringify(seen) + "\\n");
if (fx.swapLock !== undefined) writeFileSync(join(fx.root, "pharn", ".run", "stage-direct", "in-flight.json"), fx.swapLock);
if (fx.hold && once("hold")) {
  writeFileSync(join(ctl, ".holding"), "1");
  const sab = new Int32Array(new SharedArrayBuffer(4));
  while (!existsSync(join(ctl, ".release"))) Atomics.wait(sab, 0, 0, 20);
}
if (fx.kill && once("kill")) {
  for (let pid = process.ppid; pid > 1; ) {
    const r = spawnSync("ps", ["-ww", "-o", "ppid=,args=", "-p", String(pid)], { encoding: "utf8" });
    const m = /^\\s*(\\d+)\\s+(.*)$/s.exec(r.stdout ?? "");
    if (!m) break;
    if (/stage-(regress|verify)\\.mjs/.test(m[2])) {
      process.kill(pid, "SIGKILL");
      break;
    }
    pid = Number(m[1]);
  }
}
`;
const PROBE = join(FLOOR_ROOT, "probe-gate.mjs");
writeFileSync(PROBE, PROBE_SRC);
function probeGate(root, fx = {}) {
  const ctl = mkdtempSync(join(FLOOR_ROOT, "probe-"));
  writeFileSync(join(ctl, "probe.json"), JSON.stringify({ root, ...fx }));
  const log = () =>
    existsSync(join(ctl, "probe.log"))
      ? readFileSync(join(ctl, "probe.log"), "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l))
      : [];
  return { ctl, gates: ["--gates", `${process.execPath} ${PROBE} ${ctl}::probe`], log };
}

/** A fake `ps` — a shell script, so a call costs milliseconds, not a node start. Each call bumps a counter per kind (`A`:
 *  the group listing, `ww`: the nonce check), then sources `<steps>/<kind>-<n>.sh` and `<steps>/<kind>-all.sh` when
 *  present: a step the test writes (plant a record, print a runner's argv). Nothing else is printed; exit 0. */
const FAKE_PS_BIN = join(FLOOR_ROOT, "fake-ps-bin");
mkdirSync(FAKE_PS_BIN);
writeFileSync(
  join(FAKE_PS_BIN, "ps"),
  [
    "#!/bin/sh",
    'd="$FAKE_PS_STEPS"',
    'case " $* " in *" -A "*) k=A ;; *) k=ww ;; esac',
    'n=$(( $(cat "$d/n-$k" 2>/dev/null || echo 0) + 1 ))',
    'echo "$n" > "$d/n-$k"',
    'if [ -f "$d/$k-$n.sh" ]; then . "$d/$k-$n.sh"; fi',
    'if [ -f "$d/$k-all.sh" ]; then . "$d/$k-all.sh"; fi',
    "exit 0",
    "",
  ].join("\n")
);
chmodSync(join(FAKE_PS_BIN, "ps"), 0o755);
/** A PATH with no `ps` at all (the header's "no ps on PATH" bound). */
const NO_PS = { PATH: join(FLOOR_ROOT, "no-ps-bin") };
mkdirSync(NO_PS.PATH);
/** The env for a call that sees the fake ps, with `steps` (`<kind>-<n>` or `<kind>-all` → shell lines). */
function fakePs(steps) {
  const d = mkdtempSync(join(FLOOR_ROOT, "ps-"));
  for (const [k, lines] of Object.entries(steps)) writeFileSync(join(d, `${k}.sh`), `${lines}\n`);
  return { PATH: `${FAKE_PS_BIN}${delimiter}${process.env.PATH}`, FAKE_PS_STEPS: d };
}
const shq = (s) => `'${s.replaceAll("'", `'\\''`)}'`;
/** A fake-ps step that writes `text` to `file`, or removes it (null). */
const plantStep = (file, text) => (text === null ? `rm -f ${shq(file)}` : `printf '%s' ${shq(text)} > ${shq(file)}`);

// ── the 13 names of 6.43.0, in-process ────────────────────────────────────────────────────────────────

test("runDirect — the scope is the thin caller's WHILE the script runs (the live guard denies outside pharn/.run/**), and released after", () => {
  // The REAL stage-regress.mjs runs under the call's runner; its two gates (base, HEAD) are a probe that reads the scope
  // and asks the live guard — what the script's own children see while it runs. Verify reaches no gate without a full
  // SPEC/PLAN chain; its scope parity is pinned by "the CLI — the scope is the thin caller's WHILE …" above.
  const { dir, base } = regressRepo();
  const p = probeGate(dir, { guard: join(dir, ".claude", "hooks", "enforce-writes-scope.cjs") });
  try {
    const r = direct(dir, fresh("pharn-regress", { extra: ["--base", base, ...DONE_FLAGS, ...p.gates] }));
    assert.equal(r.exit, 0, `${r.tail}${r.errText}`);
    const seen = p.log();
    assert.equal(seen.length, 2, "one probe at the base, one at HEAD");
    // What the thin caller's own pinned setter line writes, run in another scratch root (the parity, L31).
    const ref = project();
    try {
      const s = spawnSync(process.execPath, [REAL_SETTER, ...setterArgv("pharn-regress")], { cwd: ref, encoding: "utf8", env: ENV });
      assert.equal(s.status, 0, s.stderr);
      for (const x of seen) assert.deepEqual(x.scope, readJson(ref, "pharn/.run/writes-scope.json").scope, x.cwd);
    } finally {
      rmSync(ref, { recursive: true, force: true });
    }
    for (const x of seen) {
      assert.equal(x.outside, 2, `${x.cwd}: a Write outside pharn/.run/** is DENIED while the script runs`);
      assert.equal(x.inside, 0, `${x.cwd}: pharn/.run/** stays writable`);
    }
    assert.equal(existsSync(SCOPE(dir)), false, "released after");
    // CONTROL: with the scope released, the same probe is allowed by the default — so the deny above was the scope's.
    const after = spawnSync(process.execPath, [join(dir, ".claude", "hooks", "enforce-writes-scope.cjs")], {
      cwd: dir,
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "pharn/features/demo/REGRESSION.md" } }),
      env: ENV,
      encoding: "utf8",
    });
    assert.equal(after.status, 0, after.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runDirect — EVERY exit code passes through; the start marker precedes the script, the return marker follows every exit but 5", async () => {
  // The REAL scripts' own codes (in-process nothing is injected): regress 0 (done) and 4 (question); verify 2 (no
  // feature), 3 (`missing-artifact`) and 1 (a crash: a directory where it removes its earlier report).
  const STATUS = { 0: "done", 2: "unusable", 3: "refused", 4: "question" };
  for (const c of [
    { code: 0, stage: "pharn-regress", extra: DONE_FLAGS },
    { code: 4, stage: "pharn-regress", extra: [] },
    { code: 2, stage: "pharn-verify" },
    { code: 3, stage: "pharn-verify", plant: "pharn/features/demo" },
    { code: 1, stage: "pharn-verify", plant: "pharn/features/demo/verify-report.json/x" },
  ]) {
    const repo = c.stage === "pharn-regress" ? regressRepo() : null;
    const root = repo ? repo.dir : project();
    try {
      if (c.plant) mkdirSync(join(root, c.plant), { recursive: true });
      const r = direct(root, fresh(c.stage, { extra: repo ? ["--base", repo.base, ...c.extra] : [] }));
      assert.equal(r.exit, c.code, `exit ${c.code} passes through\n${r.tail}${r.errText}`);
      const m = markersIn(root);
      assert.deepEqual(
        m.map((x) => x.kind),
        ["stage-start", "orchestrator"],
        `exit ${c.code}`
      );
      assert.deepEqual([m[0].stage, m[0].iteration, "route" in m[0]], [c.stage, 1, false], "byte-identical to the old marker line");
      assert.equal(r.pieces[0], `${markerLine(m[0])}\n`, "the start line is emitted FIRST, before the script's output");
      if (c.code === 1) assert.equal(r.pieces.length, 2, "a crash prints no object: the start line, then the return line");
      else assert.deepEqual([JSON.parse(r.pieces[1]).schema, JSON.parse(r.pieces[1]).status], ["pharn-stage-exit/1", STATUS[c.code]]);
      assert.equal(r.pieces.at(-1), `${markerLine(m[1])}\n`, `exit ${c.code}: the return marker`);
      assert.equal(r.out, r.pieces.join(""), "out is exactly the emitted pieces");
      assert.equal(existsSync(SCOPE(root)), false, "released on every exit");
      assert.equal(existsSync(join(root, LOCK_FILE)), false, "the lock released");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  // 7.15.0 — the SCRIPT's 5 is the runner's: with T = B the real regress continues after its first slow step, the runner
  // resumes it, and the call prints only the final object, between one marker pair.
  const a = regressRepo();
  try {
    const r = direct(a.dir, fresh("pharn-regress", { t: 20_000, b: 20_000, extra: ["--base", a.base, ...DONE_FLAGS] }));
    assert.equal(r.exit, 0, `${r.tail}${r.errText}`);
    assert.doesNotMatch(r.out, /"status": "continue"/, "the script's continue never reaches the call");
    assert.ok(readState(a.dir).continues >= 1, "the script did continue — inside the runner");
    assert.deepEqual(kinds(a.dir), ["stage-start", "orchestrator"]);
    assert.equal(r.pieces.at(-1), `${markerLine(markersIn(a.dir)[1])}\n`);
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
  // The CALL's 5 is a wait that ran out: the deferred line last and no return marker; the resume line prints the end.
  const b = regressRepo();
  const p = probeGate(b.dir, { hold: true });
  try {
    const r = direct(b.dir, fresh("pharn-regress", { t: 120_000, b: 1500, extra: ["--base", b.base, ...DONE_FLAGS, ...p.gates] }));
    assert.equal(r.exit, 5, `${r.tail}${r.errText}`);
    assert.equal(r.pieces.at(-1), `${MARKER_DEFERRED_CONTINUE}\n`);
    assert.match(r.errText, /^waiting \(runner pid \d+ alive\)$/);
    assert.ok(!kinds(b.dir).includes("orchestrator"), "continue: the stage is not over");
    await until(() => existsSync(join(p.ctl, ".holding")), "the held gate");
    writeFileSync(join(p.ctl, ".release"), "1");
    const end = direct(b.dir, resume("pharn-regress"));
    assert.equal(end.exit, 0, `${end.tail}${end.errText}`);
    const m = markersIn(b.dir);
    assert.deepEqual(
      m.map((x) => x.kind),
      ["stage-start", "orchestrator"]
    );
    assert.equal(JSON.parse(end.pieces[0]).status, "done", "a resume prints no start line");
    assert.equal(end.pieces.at(-1), `${markerLine(m[1])}\n`);
  } finally {
    writeFileSync(join(p.ctl, ".release"), "1");
    await settle(b.dir);
    rmSync(b.dir, { recursive: true, force: true });
  }
});

test("runDirect — a signal is exit 1 (a crash, never a verdict), named on stderr, and the stage still closes", () => {
  // The probe gate SIGKILLs the real stage-regress.mjs that runs it; the name is in the replayed stderr tail (7.15.0).
  const { dir, base } = regressRepo();
  const p = probeGate(dir, { kill: true });
  try {
    const r = direct(dir, fresh("pharn-regress", { extra: ["--base", base, ...DONE_FLAGS, ...p.gates] }));
    assert.equal(r.exit, 1, `${r.tail}${r.errText}`);
    assert.match(r.tail, /stage-direct: stage-regress\.mjs ended on a signal \(SIGKILL\) — a crash, never a verdict/);
    assert.equal(markersIn(dir).at(-1).kind, "orchestrator");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runDirect — a resume writes no start marker, passes only --resume --budget-ms, and closes the stage", () => {
  // 7.15.0: a resume line runs a script only as a TAKEOVER. The run's first invocation is the real script's (T = B: one
  // gate, then its own continue); its runner is dead. The resume takes over and runs the script's own --resume.
  const { dir, base } = regressRepo();
  const p = probeGate(dir, {});
  try {
    const argv = fresh("pharn-regress", { t: 20_000, b: 20_000, extra: ["--base", base, ...DONE_FLAGS, ...p.gates] });
    const first = bare(() =>
      spawnSync(process.execPath, [join(HERE, "stage-regress.mjs"), ...scriptArgv(parseDirectArgs(argv).opts)], {
        cwd: dir,
        encoding: "utf8",
      })
    );
    assert.equal(first.status, 5, `${first.stdout}${first.stderr}`);
    assert.equal(p.log().length, 1, "the first invocation ran one gate");
    const dead = deadPid();
    plantRun(dir, {
      argv,
      state: stateOf({
        pid: dead,
        runnerPid: dead,
        invocations: 1,
        continues: 1,
        startMarker: { line: markerLine(startMarkerRec), seq: 1 },
      }),
      markers: [startMarkerRec],
    });
    const r = direct(dir, resume("pharn-regress"));
    assert.equal(r.exit, 0, `${r.tail}${r.errText}`);
    assert.match(r.tail, /took over pharn-regress for demo \(resume\)/);
    assert.equal(r.pieces.length, 2, "the object and the return line — no start line");
    assert.equal(JSON.parse(r.pieces[0]).status, "done");
    assert.deepEqual(kinds(dir), ["stage-start", "orchestrator"], "no second start marker");
    assert.equal(r.pieces[1], `${markerLine(markersIn(dir)[1])}\n`);
    assert.equal(p.log().length, 2, "the script resumed with only the gate left — a fresh argv would have re-run the first");
    const st = readState(dir);
    assert.deepEqual([st.invocations, st.continues, st.phase], [2, 1, "script-exited"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runDirect — a setter that fails (no thin-caller command file) refuses with exit 2: nothing runs, nothing is marked (GRILL G2)", () => {
  const { dir, base } = regressRepo();
  try {
    rmSync(join(dir, ".claude", "commands"), { recursive: true });
    const argv = fresh("pharn-regress", { extra: ["--base", base, ...DONE_FLAGS] });
    const r = direct(dir, argv);
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(
      r.tail,
      /^stage-direct: refused — the writes-scope for pharn-regress could not be set \(setter exit \d+\); nothing was run$/m
    );
    assert.equal(existsSync(join(dir, "pharn", ".run", "pharn-regress")), false, "the script never ran");
    assert.deepEqual(markersIn(dir), []);
    // CONTROL: the same root WITH the command file runs.
    mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
    copyFileSync(join(REPO, ".claude/commands/pharn-regress.md"), join(dir, ".claude/commands/pharn-regress.md"));
    const ok = direct(dir, argv);
    assert.equal(ok.exit, 0, `${ok.tail}${ok.errText}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runDirect — an unwritable marker prints MARKER_NOT_WRITTEN and the stage still runs with its own exit; a refused argv runs nothing", () => {
  const root = project();
  try {
    mkdirSync(join(root, "pharn", "features", "demo"), { recursive: true }); // verify refuses `missing-artifact`: exit 3
    mkdirSync(join(root, "pharn", ".run"), { recursive: true });
    writeFileSync(join(root, "pharn", ".run", "cost"), "a file where the marker directory belongs\n");
    const r = direct(root, fresh("pharn-verify"));
    assert.equal(r.exit, 3, `${r.tail}${r.errText}`);
    assert.equal(r.pieces[0], `${MARKER_NOT_WRITTEN}\n`);
    assert.equal(r.pieces.at(-1), `${MARKER_NOT_WRITTEN}\n`);
    assert.equal(JSON.parse(r.pieces[1]).status, "refused", "the script ran: its object between the two lines");
    assert.match(r.tail, /stage-start marker was not written/);
    const bad = direct(root, fresh("pharn-verify", { extra: ["--base", "x"] }));
    assert.deepEqual([bad.exit, bad.out], [2, ""]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("parseLock — a well-formed record of this schema, else null (torn, foreign, a bad pid/stage/name)", () => {
  // "This schema" is /2 since 7.15.0: the nonce and the holder ride in the record.
  const rec = { pid: 42, startedAt: "2026-10-05T00:00:00.000Z", stage: "pharn-verify", name: "demo", nonce: NONCE_A, holder: "call" };
  const good = lockRecord(rec);
  assert.deepEqual(parseLock(good), rec);
  const o = JSON.parse(good);
  for (const [why, bad] of [
    ["empty (a torn record)", ""],
    ["not JSON", "{"],
    ["an array", "[]"],
    ["another schema", JSON.stringify({ ...o, schema: "x/1" })],
    ["pid 0", JSON.stringify({ ...o, pid: 0 })],
    ["pid as a string", JSON.stringify({ ...o, pid: "42" })],
    ["a stage outside DIRECT_STAGES", JSON.stringify({ ...o, stage: "pharn-build" })],
    ["a non-slug name", JSON.stringify({ ...o, name: "../x" })],
  ])
    assert.equal(parseLock(bad), null, why);
  assert.deepEqual(LOCK_REFUSALS, ["in-flight", "lock-unusable"], "the closed refusal set");
});

test("runDirect — a lock held by a LIVE pid refuses `in-flight` (exit 2): no scope set, nothing run or marked, the lock untouched", () => {
  const root = project();
  const s = sleeper();
  try {
    const held = lockOf(s.pid);
    plantLock(root, held);
    const r = direct(root, fresh("pharn-verify"));
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(r.errText, new RegExp(`^refused \\(in-flight\\) — another call \\(pid ${s.pid}, pharn-regress for demo, `));
    assert.equal(existsSync(join(root, RUNNER_FILE)), false, "no run was started");
    assert.equal(existsSync(SCOPE(root)), false, "no scope was set");
    assert.deepEqual(markersIn(root), [], "no marker");
    assert.equal(readFileSync(lockPath(root), "utf8"), held, "the holder's lock is left alone");
    // 7.15.0: the resume line of that holder's run WAITS for a live holder (exit 5) where it refused before — still
    // nothing set, run, marked or moved.
    plantRun(root, {});
    const before = hashes(root);
    const w = direct(root, resume("pharn-regress", 800));
    assert.deepEqual([w.exit, w.out], [5, `${MARKER_DEFERRED_CONTINUE}\n`]);
    assert.match(w.errText, new RegExp(`^waiting \\(call pid ${s.pid} alive\\)$`));
    assert.deepEqual(hashes(root), before);
    assert.equal(existsSync(SCOPE(root)), false);
    assert.deepEqual(markersIn(root), []);
    // CONTROL (the mutant "the lock is ignored"): the same root with no lock runs, and the lock is released.
    rmSync(lockPath(root));
    const ok = direct(root, fresh("pharn-verify"));
    assert.equal(ok.exit, 2, `the real script's own exit (no feature here)\n${ok.tail}${ok.errText}`);
    assert.equal(JSON.parse(ok.pieces[1]).reason_code, "no-feature");
    assert.equal(existsSync(lockPath(root)), false, "released");
  } finally {
    s.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test("runDirect — a DEAD holder's lock is stale: cleared, taken and released; a torn record is never guessed stale", () => {
  const root = project();
  try {
    plantLock(root, lockOf(deadPid()));
    const r = direct(root, fresh("pharn-verify"));
    assert.equal(r.exit, 2, `the real script's own exit\n${r.tail}${r.errText}`);
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"], "the stage ran");
    assert.equal(existsSync(lockPath(root)), false);
    plantLock(root, "");
    const torn = direct(root, fresh("pharn-verify"));
    assert.equal(torn.exit, 2);
    assert.match(
      torn.errText,
      /^refused \(in-flight\) — pharn\/\.run\/stage-direct\/in-flight\.json holds no readable lock record; if no stage-direct call is running in this tree, remove it/
    );
    assert.equal(readFileSync(lockPath(root), "utf8"), "", "a torn record is left for a person");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runDirect — a lock directory that is a link or a file refuses `lock-unusable`, and nothing is written through it", () => {
  for (const plant of ["link", "file"]) {
    const root = project();
    const elsewhere = mkdtempSync(join(tmpdir(), "stage-direct-elsewhere-"));
    try {
      mkdirSync(join(root, "pharn", ".run"), { recursive: true });
      if (plant === "link") symlinkSync(elsewhere, join(root, LOCK_DIR));
      else writeFileSync(join(root, LOCK_DIR), "x");
      const r = direct(root, fresh("pharn-verify"));
      assert.deepEqual([r.exit, r.out], [2, ""], plant);
      assert.match(r.errText, /^refused \(lock-unusable\) — pharn\/\.run\/stage-direct is not a directory/, plant);
      assert.deepEqual(readdirSync(elsewhere), [], `${plant}: nothing through the link`);
      assert.deepEqual(markersIn(root), [], "nothing ran");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(elsewhere, { recursive: true, force: true });
    }
  }
});

test("runDirect — the lock is released on every exit and a signal, but never while it holds ANOTHER call's record", () => {
  const runs = [
    ["verify, exit 2", () => ({ root: project(), argv: fresh("pharn-verify") })],
    ["regress, exit 4", (repo = regressRepo()) => ({ root: repo.dir, argv: fresh("pharn-regress", { extra: ["--base", repo.base] }) })],
    [
      "regress, a signal",
      (repo = regressRepo()) => ({
        root: repo.dir,
        argv: fresh("pharn-regress", { extra: ["--base", repo.base, ...DONE_FLAGS, ...probeGate(repo.dir, { kill: true }).gates] }),
      }),
    ],
  ];
  for (const [why, make] of runs) {
    const { root, argv } = make();
    try {
      direct(root, argv);
      assert.equal(existsSync(lockPath(root)), false, `${why}: released`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  // A gate writes another call's record over the lock mid-run: the runner's release leaves it (it no longer names it).
  const other = lockOf(process.pid);
  const { dir, base } = regressRepo();
  try {
    const r = direct(dir, fresh("pharn-regress", { extra: ["--base", base, ...DONE_FLAGS, ...probeGate(dir, { swapLock: other }).gates] }));
    assert.equal(r.exit, 0, `${r.tail}${r.errText}`);
    assert.equal(readFileSync(lockPath(dir), "utf8"), other, "another call's record is not deleted");
    // releaseLock, the call's own release: only while the lock holds ITS record.
    const mine = { file: lockPath(dir), record: lockOf(deadPid()) };
    assert.equal(releaseLock(mine), "the in-flight lock no longer holds this call's record; left in place");
    assert.equal(readFileSync(lockPath(dir), "utf8"), other);
    assert.equal(releaseLock({ file: lockPath(dir), record: other }), null, "its own record: released");
    assert.equal(existsSync(lockPath(dir)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ two PROCESSES — a call still running (as a call the Bash tool moved to the background is) refuses a second call, even the resume line; it ends with its own release", async () => {
  // The first call is another PROCESS (the real CLI); its runner's script holds in a probe gate. 7.15.0: a second fresh
  // call refuses `in-flight`; the resume line of the same run waits (exit 5) instead of refusing — neither starts a
  // second script, and neither touches the first run's scope, records or markers.
  const { dir, base } = regressRepo();
  const p = probeGate(dir, { hold: true });
  const child = spawn(
    process.execPath,
    [REAL_CLI, ...fresh("pharn-regress", { b: 120_000, extra: ["--base", base, ...DONE_FLAGS, ...p.gates] })],
    {
      cwd: dir,
      env: ENV,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  let out = "";
  let err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  const ended = new Promise((res) => child.on("close", (code) => res(code)));
  try {
    await until(() => existsSync(join(p.ctl, ".holding")), "the first call's script is running");
    const scopeWhileHeld = readFileSync(SCOPE(dir), "utf8");
    const before = hashes(dir);
    const second = direct(dir, fresh("pharn-verify"));
    assert.deepEqual([second.exit, second.out], [2, ""]);
    assert.match(
      second.errText,
      /^refused \(in-flight\) — a runner \(pid \d+\) is still running a stage in this tree; run that stage's resume line/
    );
    const w = direct(dir, resume("pharn-regress", 800));
    assert.deepEqual([w.exit, w.out], [5, `${MARKER_DEFERRED_CONTINUE}\n`]);
    assert.match(w.errText, /^waiting \(runner pid \d+ alive\)$/);
    assert.equal(readFileSync(SCOPE(dir), "utf8"), scopeWhileHeld, "the first call's scope is untouched");
    assert.deepEqual(hashes(dir), before, "and its records");
    assert.deepEqual(kinds(dir), ["stage-start"], "no second marker");
    assert.equal(p.log().length, 1, "one script, never a second");
    writeFileSync(join(p.ctl, ".release"), "1");
    assert.equal(await ended, 0, `${out}\n${err}`);
    assert.deepEqual(kinds(dir), ["stage-start", "orchestrator"], "the first call closes its own stage");
    assert.equal(existsSync(lockPath(dir)), false, "and releases the lock");
    assert.equal(existsSync(SCOPE(dir)), false, "and the scope");
    // CONTROL: the call refused above now runs.
    const ok = direct(dir, fresh("pharn-regress", { extra: ["--base", base, ...DONE_FLAGS] }));
    assert.equal(ok.exit, 0, `${ok.tail}${ok.errText}`);
  } finally {
    writeFileSync(join(p.ctl, ".release"), "1");
    await Promise.race([ended, sleep(15_000)]);
    await settle(dir);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runDirect (7.0.0) — a link at `pharn`, above the lock's state root, refuses `lock-unusable`; nothing runs", () => {
  const root = project();
  try {
    const real = join(root, "pharn-real");
    mkdirSync(real);
    symlinkSync(real, join(root, "pharn"));
    const r = direct(root, fresh("pharn-verify"));
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(r.errText, /^refused \(lock-unusable\) — pharn is not a directory/);
    assert.deepEqual(readdirSync(real), [], "nothing through the link");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the runner, in-process ────────────────────────────────────────────────────────────────────────────

test("runRunner (in-process) — the fresh argv, then `--resume --budget-ms <B>` on each exit 5 until another exit: one marker pair, the result written, the scope and the handed lock released", () => {
  const { dir, base } = regressRepo();
  try {
    plantRun(dir, { argv: fresh("pharn-regress", { t: 20_000, b: 20_000, extra: ["--base", base, ...DONE_FLAGS] }), lock: handed() });
    const r = runnerIn(dir, NONCE_A);
    assert.equal(r.exit, 0, r.log);
    const res = readResult(dir);
    assert.deepEqual([res.nonce, res.exit, JSON.parse(res.stdout).status], [NONCE_A, 0, "done"]);
    const st = readState(dir);
    assert.ok(st.continues >= 1, "T = B: the script continued at least once, and the runner resumed it");
    assert.equal(st.invocations, st.continues + 1, "one invocation per continue, plus the last");
    assert.deepEqual([st.holder, st.pid, st.runnerPid, st.phase, st.exit], ["runner", process.pid, process.pid, "script-exited", 0]);
    const m = markersIn(dir);
    assert.deepEqual(
      m.map((x) => x.kind),
      ["stage-start", "orchestrator"]
    );
    assert.deepEqual([res.startLine, res.returnLine], [markerLine(m[0]), markerLine(m[1])]);
    assert.equal(existsSync(lockPath(dir)), false, "the lock it was handed is released");
    assert.equal(existsSync(SCOPE(dir)), false, "the scope it set is released");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runRunner (in-process) — runner.json naming another nonce refuses at once; a lock never handed to it refuses after HANDOFF_MAX_MS; neither runs or writes anything", () => {
  const root = project();
  try {
    plantRun(root, {}); // runner.json for NONCE_A, and no lock
    const wrong = runnerIn(root, NONCE_B);
    assert.equal(wrong.exit, 2);
    assert.match(wrong.log, /^stage-direct runner: refused — runner\.json does not name this runner's nonce; nothing was run$/m);
    // The handoff deadline crossed without waiting it out: the clock the runner reads advances 2 s per read.
    const realNow = Date.now;
    let skew = 0;
    Date.now = () => realNow() + (skew += 2000);
    let never;
    try {
      never = runnerIn(root, NONCE_A);
    } finally {
      Date.now = realNow;
    }
    assert.equal(never.exit, 2);
    assert.match(never.log, /^stage-direct runner: refused — the in-flight lock was never handed to this runner; nothing was run$/m);
    assert.ok(skew > HANDOFF_MAX_MS, "it waited past the deadline, on its own clock");
    for (const rel of [STATE_FILE, RESULT_FILE, LOCK_FILE]) assert.equal(existsSync(join(root, rel)), false, rel);
    assert.deepEqual(markersIn(root), []);
    assert.equal(existsSync(SCOPE(root)), false, "no scope was set");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runRunner (in-process) — it waits for a late handoff; then a setter that fails is today's refusal as the result (exit 2, no object, no marker), and a result it cannot write is a log line", () => {
  const root = project({ commands: false });
  try {
    plantRun(root, {});
    const text = lockRecord(handed());
    // Another process hands the lock over 300 ms after the runner starts waiting for it.
    spawn(
      process.execPath,
      ["-e", `setTimeout(() => require("node:fs").writeFileSync(${JSON.stringify(lockPath(root))}, ${JSON.stringify(text)}), 300)`],
      {
        stdio: "ignore",
      }
    );
    const t0 = Date.now();
    const r = runnerIn(root, NONCE_A);
    assert.ok(Date.now() - t0 >= 250, "it waited for the handoff");
    assert.equal(r.exit, 2, r.log);
    const res = readResult(root);
    assert.deepEqual([res.exit, res.stdout, res.returnLine], [2, "", null]);
    assert.match(
      res.stderrTail,
      /^stage-direct: refused — the writes-scope for pharn-regress could not be set \(setter exit \d+\); nothing was run$/m
    );
    assert.deepEqual(markersIn(root), [], "no marker");
    assert.equal(existsSync(lockPath(root)), false, "the handed lock released");
    // A directory at result.json's tmp path: the write fails, and the runner says so on its log.
    rmSync(join(root, RESULT_FILE));
    mkdirSync(join(root, `${RESULT_FILE}.tmp-${process.pid}`));
    plantLock(root, text);
    const r2 = runnerIn(root, NONCE_A);
    assert.equal(r2.exit, 2);
    assert.match(r2.log, /^stage-direct: result\.json was not written \(\w+\)$/m);
    assert.equal(existsSync(join(root, RESULT_FILE)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runRunner (in-process) — a script killed by a signal is exit 1 in its result, named in its tail (a crash, never a verdict), and the stage still closes", () => {
  const { dir, base } = regressRepo();
  try {
    const p = probeGate(dir, { kill: true });
    plantRun(dir, { argv: fresh("pharn-regress", { extra: ["--base", base, ...DONE_FLAGS, ...p.gates] }), lock: handed() });
    const r = runnerIn(dir, NONCE_A);
    assert.equal(r.exit, 0, r.log);
    const res = readResult(dir);
    assert.equal(res.exit, 1);
    assert.match(res.stderrTail, /stage-direct: stage-regress\.mjs ended on a signal \(SIGKILL\) — a crash, never a verdict/);
    assert.deepEqual(kinds(dir), ["stage-start", "orchestrator"]);
    assert.equal(res.returnLine, markerLine(markersIn(dir)[1]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── the takeover, in-process ──────────────────────────────────────────────────────────────────────────

const exited = (dead, over = {}) =>
  stateOf({
    pid: dead,
    runnerPid: dead,
    startMarker: { line: markerLine(startMarkerRec), seq: 1 },
    phase: "script-exited",
    exit: 3,
    stdout: '{"from":"state"}',
    invocations: 1,
    ...over,
  });

test("TAKEOVER (in-process) — finish: the exited script is never re-run; the return marker is written once (none after one already written, one when markers.jsonl is gone); the recorded stdout and exit print", () => {
  const ret = { seq: 2, kind: "orchestrator", stage: null, iteration: null, ts: "2026-11-13T00:00:01.000Z", session_id: null };
  for (const marks of ["start", "both", "none"]) {
    const root = project();
    try {
      plantRun(root, { state: exited(deadPid()), markers: { start: [startMarkerRec], both: [startMarkerRec, ret], none: [] }[marks] });
      const r = direct(root, resume("pharn-regress"));
      assert.equal(r.exit, 3, `${marks}: ${r.tail}${r.errText}`);
      assert.match(r.tail, /took over pharn-regress for demo \(finish\): the runner is gone/);
      const m = markersIn(root);
      assert.deepEqual(
        m.map((x) => x.kind),
        marks === "none" ? ["orchestrator"] : ["stage-start", "orchestrator"],
        `${marks}: exactly one return marker`
      );
      if (marks === "both") assert.deepEqual(m[1], ret, "the marker written before the kill is the one");
      assert.equal(r.out, `{"from":"state"}\n${markerLine(m.at(-1))}\n`);
      assert.equal(readResult(root).exit, 3, "the result is written");
      assert.equal(existsSync(lockPath(root)), false, "the takeover's lock released");
      assert.equal(existsSync(join(root, "pharn", ".run", "pharn-regress")), false, "no script ran");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("TAKEOVER (in-process) — the scope it recorded is released only while the file still holds those bytes: another scope is left (a note), a --clear that fails is a note; the exit never changes", () => {
  const bytes = `${JSON.stringify({ scope: ["other/**"] })}\n`;
  for (const c of ["another", "clear-fails", "own"]) {
    const root = project();
    try {
      mkdirSync(join(root, "pharn", ".run"), { recursive: true });
      writeFileSync(SCOPE(root), bytes);
      if (c === "clear-fails")
        writeFileSync(
          join(root, SETTER),
          `const r = require("node:child_process").spawnSync(process.execPath, [${JSON.stringify(REAL_SETTER)}, ...process.argv.slice(2)], { stdio: "inherit" });\n` +
            `process.exitCode = process.argv[2] === "--clear" ? 9 : r.status;\n`
        );
      plantRun(root, { state: exited(deadPid(), { scopeSha: sha(c === "another" ? "x" : bytes) }), markers: [startMarkerRec] });
      const r = direct(root, resume("pharn-regress"));
      assert.equal(r.exit, 3, `${c}: ${r.tail}${r.errText}`);
      if (c === "another") {
        assert.match(r.tail, /stage-direct: the writes-scope file holds another scope now \(a later step set it\); left in place/);
        assert.equal(readFileSync(SCOPE(root), "utf8"), bytes, "a later step's scope is left in place");
      } else if (c === "clear-fails") {
        assert.match(r.tail, /stage-direct: the writes-scope was not released \(setter exit 9\); the next scoped step overwrites it/);
      } else {
        assert.doesNotMatch(r.tail, /writes-scope/);
        assert.equal(existsSync(SCOPE(root)), false, "its own scope: released");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("TAKEOVER (in-process) — start: no state recorded beside a dead runner's lock — the lock is cleared, the start line written and PRINTED first, the fresh argv run (the real script's exit)", () => {
  const root = project();
  try {
    const dead = deadPid();
    plantRun(root, { stage: "pharn-verify", lock: { ...handed("pharn-verify"), pid: dead } });
    const r = direct(root, resume("pharn-verify"));
    assert.equal(r.exit, 2, `${r.tail}${r.errText}`);
    assert.match(r.tail, /took over pharn-verify for demo \(start\)/);
    const m = markersIn(root);
    assert.deepEqual(
      m.map((x) => x.kind),
      ["stage-start", "orchestrator"]
    );
    assert.equal(m[0].stage, "pharn-verify");
    assert.equal(r.pieces[0], `${markerLine(m[0])}\n`, "rule 6: the start line reaches an orchestrator tool result");
    assert.equal(JSON.parse(r.pieces[1]).reason_code, "no-feature", "the real verify ran the fresh argv");
    assert.equal(r.pieces.at(-1), `${markerLine(m[1])}\n`);
    const st = readState(root);
    assert.deepEqual([st.holder, st.runnerPid, st.phase, st.exit], ["takeover", dead, "script-exited", 2], "the cleared runner's pid");
    assert.equal(existsSync(lockPath(root)), false);
    assert.equal(existsSync(SCOPE(root)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("TAKEOVER (in-process) — fresh after a kill before the first checkpoint; its own continue (exit 5) is recorded with the scope and lock released; resume lines then close the stage once", () => {
  const { dir, base } = regressRepo();
  try {
    const dead = deadPid();
    plantRun(dir, {
      argv: fresh("pharn-regress", { t: 20_000, b: 20_000, extra: ["--base", base, ...DONE_FLAGS] }),
      state: stateOf({ pid: dead, runnerPid: dead, startMarker: { line: markerLine(startMarkerRec), seq: 1 } }),
      markers: [startMarkerRec],
    });
    const r1 = direct(dir, resume("pharn-regress", 20_000));
    assert.deepEqual([r1.exit, r1.out], [5, `${MARKER_DEFERRED_CONTINUE}\n`], `${r1.tail}${r1.errText}`);
    assert.match(r1.errText, /^the takeover's script run continues \(exit 5\); run the resume line again — it takes over again$/m);
    assert.match(readFileSync(join(dir, RUNNER_LOG), "utf8"), /took over pharn-regress for demo \(fresh\)/);
    const st = readState(dir);
    assert.deepEqual([st.holder, st.invocations, st.continues, st.phase], ["takeover", 1, 1, "running"], "the continue is recorded");
    assert.equal(existsSync(lockPath(dir)), false, "the lock is released");
    assert.equal(existsSync(SCOPE(dir)), false, "the scope is released");
    assert.deepEqual(kinds(dir), ["stage-start"], "no return marker on a continue");
    let r;
    for (let i = 0; i < 10; i++) {
      r = direct(dir, resume("pharn-regress", 20_000));
      if (r.exit !== 5) break;
      assert.match(r.errText, /the takeover's script run continues \(exit 5\)/);
    }
    assert.equal(r.exit, 0, `${r.tail}${r.errText}`);
    assert.match(r.tail, /took over pharn-regress for demo \(resume\)/);
    assert.equal(JSON.parse(r.pieces[0]).status, "done");
    assert.deepEqual(kinds(dir), ["stage-start", "orchestrator"], "one return marker");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("TAKEOVER (in-process) — a setter that fails prints today's refusal (exit 2, no object, no marker); a state.json or result.json it cannot write, or a runner.log it cannot append, is a note — never a changed exit", () => {
  const a = project({ commands: false });
  try {
    plantRun(a, { state: stateOf({ pid: deadPid(), runnerPid: null }) });
    mkdirSync(join(a, `${RESULT_FILE}.tmp-${process.pid}`));
    const r = direct(a, resume("pharn-regress"));
    assert.deepEqual([r.exit, r.out], [2, ""], `${r.tail}${r.errText}`);
    assert.match(
      r.tail,
      /^stage-direct: refused — the writes-scope for pharn-regress could not be set \(setter exit \d+\); nothing was run$/m
    );
    assert.deepEqual(markersIn(a), []);
    assert.match(readFileSync(join(a, RUNNER_LOG), "utf8"), /stage-direct: result\.json was not written \(\w+\)/);
    assert.equal(existsSync(join(a, RESULT_FILE)), false);
  } finally {
    rmSync(a, { recursive: true, force: true });
  }
  const b = project();
  try {
    plantRun(b, { state: exited(deadPid()), markers: [startMarkerRec] });
    mkdirSync(join(b, `${STATE_FILE}.tmp-${process.pid}`));
    const r = direct(b, resume("pharn-regress"));
    assert.equal(r.exit, 3, `${r.tail}${r.errText}`);
    assert.match(r.tail, /stage-direct: state\.json was not written \(\w+\)/);
    assert.equal(readResult(b).exit, 3, "the result is still written");
  } finally {
    rmSync(b, { recursive: true, force: true });
  }
  const d = project();
  try {
    plantRun(d, { state: exited(deadPid()), markers: [startMarkerRec] });
    mkdirSync(join(d, `${RESULT_FILE}.tmp-${process.pid}`));
    const r = direct(d, resume("pharn-regress"));
    assert.equal(r.exit, 3, `the result this call holds is printed\n${r.tail}${r.errText}`);
    assert.equal(r.out, `{"from":"state"}\n${markerLine(markersIn(d)[1])}\n`);
    assert.match(readFileSync(join(d, RUNNER_LOG), "utf8"), /stage-direct: result\.json was not written \(\w+\)/);
    assert.equal(existsSync(join(d, RESULT_FILE)), false);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
  const c = project();
  try {
    plantRun(c, { state: exited(deadPid()), markers: [startMarkerRec] });
    writeFileSync(join(c, RUNNER_LOG), "");
    chmodSync(join(c, RUNNER_LOG), 0o444);
    const r = direct(c, resume("pharn-regress"));
    assert.equal(r.exit, 3, `${r.tail}${r.errText}`);
    assert.match(r.tail, /took over pharn-regress for demo \(finish\)/, "the record's tail still holds the note");
    assert.equal(readFileSync(join(c, RUNNER_LOG), "utf8"), "", "nothing reached the log");
  } finally {
    rmSync(c, { recursive: true, force: true });
  }
});

// ── the wait and the start, in-process ────────────────────────────────────────────────────────────────

test("WAIT (in-process) — a live holder is waited for until the budget: one `waiting (<who> pid <p> alive)` line, the deferred line, exit 5 — a runner by the lock (its argv names the nonce), a takeover by state.json — nothing moves", () => {
  const fr = fakeRunner(NONCE_A);
  const s = sleeper();
  const a = project();
  const b = project();
  try {
    plantRun(a, { lock: { ...handed(), pid: fr.pid } });
    const before = hashes(a);
    const r = direct(a, resume("pharn-regress", 700));
    assert.deepEqual([r.exit, r.out], [5, `${MARKER_DEFERRED_CONTINUE}\n`]);
    assert.match(r.errText, new RegExp(`^waiting \\(runner pid ${fr.pid} alive\\)$`));
    assert.deepEqual(hashes(a), before);
    plantRun(b, { state: stateOf({ holder: "takeover", pid: s.pid, runnerPid: null }) });
    const t = direct(b, resume("pharn-regress", 700));
    assert.deepEqual([t.exit, t.out], [5, `${MARKER_DEFERRED_CONTINUE}\n`]);
    assert.match(t.errText, new RegExp(`^waiting \\(takeover pid ${s.pid} alive\\)$`));
    assert.deepEqual(markersIn(b), []);
  } finally {
    fr.kill("SIGKILL");
    s.kill("SIGKILL");
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("WAIT / FRESH (in-process) — the holder dead, its process group still populated: the resume line refuses `orphaned` naming the group, a fresh call `in-flight`; nothing runs", () => {
  const g = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true, stdio: "ignore" }); // a group leader
  const root = project();
  try {
    plantRun(root, { state: stateOf({ pid: deadPid(), runnerPid: g.pid }) });
    const before = hashes(root);
    const r = direct(root, resume("pharn-regress"));
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(
      r.errText,
      new RegExp(
        `^refused \\(orphaned\\) — the runner \\(pid ${g.pid}\\) is gone with no result, but its process group ${g.pid} still runs.*kill -TERM -- -${g.pid}`
      )
    );
    const f = direct(root, fresh("pharn-regress"));
    assert.deepEqual([f.exit, f.out], [2, ""]);
    assert.match(f.errText, new RegExp(`^refused \\(in-flight\\) — an earlier runner's process group ${g.pid} still runs`));
    assert.deepEqual(hashes(root), before, "nothing moved");
    assert.deepEqual(markersIn(root), []);
  } finally {
    killGroup(g.pid);
    rmSync(root, { recursive: true, force: true });
  }
});

test("WAIT (in-process) — a holder that dies after the call's first poll: the takeover is deferred (exit 5); the next resume line takes over", () => {
  const root = project();
  const fr = fakeRunner(NONCE_A, 800);
  try {
    plantRun(root, { stage: "pharn-verify", lock: { ...handed("pharn-verify"), pid: fr.pid } });
    const r = direct(root, resume("pharn-verify", 60_000));
    assert.deepEqual([r.exit, r.out], [5, `${MARKER_DEFERRED_CONTINUE}\n`], r.errText);
    assert.match(
      r.errText,
      /^takeover deferred — the runner is gone with no result; the next resume line takes over with its whole budget$/
    );
    assert.deepEqual(markersIn(root), [], "nothing was taken over");
    const t = direct(root, resume("pharn-verify"));
    assert.equal(t.exit, 2, `${t.tail}${t.errText}`);
    assert.match(t.tail, /took over pharn-verify for demo \(start\)/);
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"]);
  } finally {
    fr.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test("WAIT (in-process) — a bound result prints at once (its tail replayed, its stdout with a final newline, its return line); the call then waits for the runner's release", () => {
  const root = project();
  const fr = fakeRunner(NONCE_A, 1200);
  try {
    const res = {
      nonce: NONCE_A,
      stage: "pharn-regress",
      name: "demo",
      exit: 3,
      stdout: '{"x":1}',
      stderrTail: "TAIL\n",
      startLine: null,
      returnLine: "marker 2: orchestrator t",
    };
    plantRun(root, { result: res, lock: { ...handed(), pid: fr.pid } });
    const t0 = Date.now();
    const r = direct(root, resume("pharn-regress"));
    assert.deepEqual([r.exit, r.out, r.tail], [3, '{"x":1}\nmarker 2: orchestrator t\n', "TAIL\n"]);
    assert.equal(psShows(fr.pid, NONCE_A), false, "it returned once the runner was gone");
    assert.ok(Date.now() - t0 < RELEASE_WAIT_MS, "not by waiting out its bound");
  } finally {
    fr.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test("RESUME (in-process) — no runner.json is `no-run`; another stage's run `mismatch`; an unreadable runner/state/result record `record-unusable`; a torn lock beside a dead runner `in-flight` — each exit 2, nothing written", () => {
  const root = project();
  try {
    const none = direct(root, resume("pharn-regress"));
    assert.deepEqual([none.exit, none.out], [2, ""]);
    assert.match(none.errText, /^refused \(no-run\) — no run was started in this tree \(no pharn\/\.run\/stage-direct\/runner\.json\)/);
    plantRun(root, {});
    const before = hashes(root);
    const mm = direct(root, resume("pharn-verify"));
    assert.deepEqual([mm.exit, mm.out], [2, ""]);
    assert.match(mm.errText, /^refused \(mismatch\) — the run in this tree is pharn-regress for demo, not pharn-verify for demo/);
    assert.deepEqual(hashes(root), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  for (const [rel, text, what] of [
    [RUNNER_FILE, "{", "runner"],
    [STATE_FILE, '{"toString":1}', "state"],
    [RESULT_FILE, '{"toString":1}', "result"],
  ]) {
    const r0 = project();
    try {
      plantRun(r0, {});
      writeFileSync(join(r0, rel), text);
      const r = direct(r0, resume("pharn-regress"));
      assert.deepEqual([r.exit, r.out], [2, ""], rel);
      assert.match(
        r.errText,
        new RegExp(`^refused \\(record-unusable\\) — ${rel.replaceAll(".", "\\.")} holds no readable ${what} record`),
        rel
      );
    } finally {
      rmSync(r0, { recursive: true, force: true });
    }
  }
  const t = project();
  try {
    plantRun(t, { state: stateOf({ pid: deadPid(), runnerPid: null }) });
    plantLock(t, "");
    const r = direct(t, resume("pharn-regress"));
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(r.errText, /^refused \(in-flight\) — pharn\/\.run\/stage-direct\/in-flight\.json holds no readable lock record/);
    assert.equal(readFileSync(lockPath(t), "utf8"), "", "left for a person");
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("the call (in-process) — a record that is a link, or one it cannot even lstat, refuses `record-unusable` before anything is taken or written", () => {
  const root = project();
  const elsewhere = mkdtempSync(join(tmpdir(), "stage-direct-elsewhere-"));
  try {
    plantRun(root, {});
    symlinkSync(join(elsewhere, "target"), join(root, STATE_FILE));
    for (const argv of [fresh("pharn-regress"), resume("pharn-regress")]) {
      const r = direct(root, argv);
      assert.deepEqual([r.exit, r.out], [2, ""]);
      assert.match(r.errText, /^refused \(record-unusable\) — pharn\/\.run\/stage-direct\/state\.json is not a regular file/);
    }
    assert.deepEqual(readdirSync(elsewhere), []);
    rmSync(join(root, STATE_FILE));
    chmodSync(join(root, LOCK_DIR), 0o600); // no search permission: every record's lstat is EACCES
    try {
      const r = direct(root, fresh("pharn-regress"));
      assert.deepEqual([r.exit, r.out], [2, ""]);
      assert.match(r.errText, /^refused \(record-unusable\) — pharn\/\.run\/stage-direct\/[\w.-]+: EACCES; nothing was run$/);
    } finally {
      chmodSync(join(root, LOCK_DIR), 0o755);
    }
    assert.equal(existsSync(lockPath(root)), false, "no lock was taken");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("FRESH (in-process) — an earlier state.json that is unreadable refuses `record-unusable`, one whose writer lives `in-flight`; one whose result is written is over, whatever its pids read", () => {
  const s = sleeper();
  const root = project();
  try {
    mkdirSync(join(root, LOCK_DIR), { recursive: true });
    writeFileSync(join(root, STATE_FILE), '{"toString":1}');
    const u = direct(root, fresh("pharn-verify"));
    assert.deepEqual([u.exit, u.out], [2, ""]);
    assert.match(u.errText, /^refused \(record-unusable\) — pharn\/\.run\/stage-direct\/state\.json holds no readable state record/);
    const live = stateOf({ holder: "takeover", pid: s.pid, runnerPid: null });
    plantRun(root, { state: live });
    const f = direct(root, fresh("pharn-verify"));
    assert.deepEqual([f.exit, f.out], [2, ""]);
    assert.match(f.errText, new RegExp(`^refused \\(in-flight\\) — a takeover \\(pid ${s.pid}\\) is still running a stage in this tree`));
    // The same state beside its run's written result: that run is over — the fresh call starts and runs.
    plantRun(root, {
      state: live,
      result: {
        nonce: NONCE_A,
        stage: "pharn-regress",
        name: "demo",
        exit: 0,
        stdout: "{}",
        stderrTail: "",
        startLine: null,
        returnLine: null,
      },
    });
    const ok = direct(root, fresh("pharn-verify"));
    assert.equal(ok.exit, 2, `the real verify's own exit\n${ok.tail}${ok.errText}`);
    assert.deepEqual(kinds(root), ["stage-start", "orchestrator"]);
  } finally {
    s.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test("FRESH (in-process) — a runner.json it cannot write refuses `record-unusable`, a runner.log it cannot open `spawn-failed`; each removes what it wrote and releases the lock — nothing runs", () => {
  const root = project();
  try {
    mkdirSync(join(root, `${RUNNER_FILE}.tmp-${process.pid}`), { recursive: true });
    const r = direct(root, fresh("pharn-verify"));
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(r.errText, /^refused \(record-unusable\) — pharn\/\.run\/stage-direct\/runner\.json: \w+; nothing was run$/);
    assert.equal(existsSync(join(root, RUNNER_FILE)), false);
    assert.equal(existsSync(lockPath(root)), false, "the lock released");
    rmSync(join(root, `${RUNNER_FILE}.tmp-${process.pid}`), { recursive: true });
    writeFileSync(join(root, RUNNER_LOG), "");
    chmodSync(join(root, RUNNER_LOG), 0o444);
    const s = direct(root, fresh("pharn-verify"));
    assert.deepEqual([s.exit, s.out], [2, ""]);
    assert.match(s.errText, /^refused \(spawn-failed\) — the runner could not be started \(EACCES\); nothing was run$/);
    assert.equal(existsSync(join(root, RUNNER_FILE)), false, "runner.json removed: no resume line takes the refused start over");
    assert.equal(existsSync(lockPath(root)), false, "the lock released");
    assert.match(direct(root, resume("pharn-verify")).errText, /^refused \(no-run\) — /);
    assert.deepEqual(markersIn(root), [], "nothing ran");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the lock and `ps`, in-process ─────────────────────────────────────────────────────────────────────

test("acquireLock / releaseLock (in-process) — a live call or runner holds it (`in-flight`, live, naming which); a dead one is cleared and returned; an unwritable lock directory is `lock-unusable`; release leaves another's record", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-direct-lock-"));
  const s = sleeper();
  const fr = fakeRunner(NONCE_A);
  const opts = { stage: "pharn-verify", name: "demo", nonce: NONCE_B };
  try {
    plantLock(root, lockOf(s.pid));
    const call = acquireLock(root, opts);
    assert.deepEqual([call.ok, call.reason, call.live], [false, "in-flight", true]);
    assert.match(
      call.detail,
      new RegExp(`^another call \\(pid ${s.pid}, pharn-regress for demo, started "2026-10-05T00:00:00\\.000Z"\\) is still running`)
    );
    plantLock(root, lockOf(fr.pid, "runner"));
    const run = acquireLock(root, opts);
    assert.deepEqual([run.ok, run.reason, run.live], [false, "in-flight", true]);
    assert.match(
      run.detail,
      new RegExp(`^a runner \\(pid ${fr.pid}, pharn-regress for demo, .*run that stage's resume line to wait for it`)
    );
    const dead = lockOf(deadPid(), "runner");
    plantLock(root, dead);
    const took = acquireLock(root, opts);
    assert.equal(took.ok, true, took.detail);
    assert.deepEqual(took.cleared, parseLock(dead), "the stale record it cleared");
    assert.equal(readFileSync(lockPath(root), "utf8"), took.record);
    assert.deepEqual([parseLock(took.record).holder, parseLock(took.record).nonce], ["call", NONCE_B]);
    writeFileSync(lockPath(root), lockOf(s.pid));
    assert.equal(releaseLock(took), "the in-flight lock no longer holds this call's record; left in place");
    assert.equal(readFileSync(lockPath(root), "utf8"), lockOf(s.pid));
    rmSync(lockPath(root));
    chmodSync(join(root, LOCK_DIR), 0o500);
    try {
      const u = acquireLock(root, opts);
      assert.deepEqual(
        [u.ok, u.reason, u.live, u.detail],
        [false, "lock-unusable", false, "pharn/.run/stage-direct/in-flight.json: EACCES"]
      );
    } finally {
      chmodSync(join(root, LOCK_DIR), 0o755);
    }
  } finally {
    s.kill("SIGKILL");
    fr.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquireLock (in-process) — a lock that vanishes before its clearing is taken without clearing; one replaced at every attempt is given up `in-flight` after three, the replacement put back (a fake `ps` makes each change at that exact step)", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-direct-lock-"));
  const s = sleeper(); // a live pid that the fake ps says is no runner
  const opts = { stage: "pharn-verify", name: "demo", nonce: NONCE_B };
  const at = (i) =>
    lockRecord({
      pid: s.pid,
      startedAt: `2026-10-05T00:00:0${i}.000Z`,
      stage: "pharn-regress",
      name: "demo",
      nonce: NONCE_A,
      holder: "runner",
    });
  try {
    plantLock(root, at(0));
    const gone = bare(() => acquireLock(root, opts), fakePs({ "ww-1": plantStep(lockPath(root), null) }));
    assert.equal(gone.ok, true, gone.detail);
    assert.equal(gone.cleared, null, "it vanished: nothing was cleared by this call");
    rmSync(lockPath(root));
    plantLock(root, at(0));
    const steps = {
      "ww-1": plantStep(lockPath(root), at(1)),
      "ww-2": plantStep(lockPath(root), at(2)),
      "ww-3": plantStep(lockPath(root), at(1)),
    };
    const lost = bare(() => acquireLock(root, opts), fakePs(steps));
    assert.deepEqual(lost, {
      ok: false,
      reason: "in-flight",
      detail: "another call took the lock while this one cleared a stale one",
      live: true,
    });
    assert.equal(readFileSync(lockPath(root), "utf8"), at(1), "the last replacement is put back, never deleted");
    assert.deepEqual(
      readdirSync(join(root, LOCK_DIR)).filter((f) => f !== "in-flight.json"),
      [],
      "no aside or tmp file left"
    );
  } finally {
    s.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquireLock (in-process) — a stale lock replaced by a DIRECTORY just before its clearing: the put-back link and the removal fail quietly (never a throw), the call takes the freed slot, and the directory is left aside", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-direct-lock-"));
  const s = sleeper(); // a live pid that the fake ps says is no runner
  const opts = { stage: "pharn-verify", name: "demo", nonce: NONCE_B };
  const stale = lockRecord({
    pid: s.pid,
    startedAt: "2026-10-05T00:00:00.000Z",
    stage: "pharn-regress",
    name: "demo",
    nonce: NONCE_A,
    holder: "runner",
  });
  try {
    plantLock(root, stale);
    // The nonce check (ps) is the last step before clearStale: there the lock becomes a directory, which a hard link
    // cannot point at and unlink cannot remove — both best-effort steps fail.
    const swap = `rm -f ${shq(lockPath(root))} && mkdir ${shq(lockPath(root))}`;
    const r = bare(() => acquireLock(root, opts), fakePs({ "ww-1": swap }));
    assert.equal(r.ok, true, r.detail);
    assert.equal(r.cleared, null, "what was moved aside was not the stale record, so nothing was cleared");
    assert.equal(parseLock(readFileSync(lockPath(root), "utf8"))?.nonce, NONCE_B, "the lock is this call's");
    const left = readdirSync(join(root, LOCK_DIR)).filter((f) => f !== "in-flight.json");
    assert.equal(left.length, 1, `one entry left aside: ${left}`);
    assert.match(left[0], /^in-flight\.json\.stale-/);
    assert.equal(statSync(join(root, LOCK_DIR, left[0])).isDirectory(), true, "the directory, neither linked back nor removed");
  } finally {
    s.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test("with no `ps` on PATH (in-process) — a live pid reads alive (fail-closed): a runner lock ps would call stale refuses `in-flight`; a populated group reads alive by kill(-pgid, 0), an empty one does not", () => {
  const s = sleeper();
  const g = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true, stdio: "ignore" });
  const root = mkdtempSync(join(tmpdir(), "stage-direct-lock-"));
  const a = project();
  const b = project();
  try {
    const opts = { stage: "pharn-verify", name: "demo", nonce: NONCE_B };
    plantLock(root, lockOf(s.pid, "runner"));
    const blind = bare(() => acquireLock(root, opts), NO_PS);
    assert.deepEqual([blind.ok, blind.reason, blind.live], [false, "in-flight", true]);
    assert.equal(readFileSync(lockPath(root), "utf8"), lockOf(s.pid, "runner"), "the lock untouched");
    // CONTROL: with ps, the same pid is no runner of that nonce — stale, cleared.
    assert.equal(acquireLock(root, opts).ok, true);
    plantRun(a, { state: stateOf({ pid: deadPid(), runnerPid: g.pid }) });
    const o = direct(a, resume("pharn-regress"), NO_PS);
    assert.equal(o.exit, 2);
    assert.match(o.errText, new RegExp(`^refused \\(orphaned\\) — the runner \\(pid ${g.pid}\\)`));
    plantRun(b, { state: exited(deadPid()), markers: [startMarkerRec] });
    const f = direct(b, resume("pharn-regress"), NO_PS);
    assert.equal(f.exit, 3, `an empty group: taken over and finished\n${f.tail}${f.errText}`);
    assert.match(f.tail, /took over pharn-regress for demo \(finish\)/);
  } finally {
    s.kill("SIGKILL");
    killGroup(g.pid);
    for (const d of [root, a, b]) rmSync(d, { recursive: true, force: true });
  }
});

test("TAKEOVER (in-process) — a run that changes between the wait's read and the takeover's (a fake `ps` plants it at that exact step): another run's runner.json refuses `mismatch`, an unreadable result or state `record-unusable`", () => {
  const other = runnerRecord({ nonce: NONCE_B, stage: "pharn-regress", name: "demo", iteration: 1, argv: fresh("pharn-regress") });
  for (const [rel, text, want] of [
    [
      RUNNER_FILE,
      other,
      /^refused \(mismatch\) — pharn\/\.run\/stage-direct\/runner\.json no longer names the run this call selected; nothing was run$/,
    ],
    [
      RESULT_FILE,
      "{",
      /^refused \(record-unusable\) — pharn\/\.run\/stage-direct\/result\.json holds no readable result record; nothing was run$/,
    ],
    [
      STATE_FILE,
      "{",
      /^refused \(record-unusable\) — pharn\/\.run\/stage-direct\/state\.json holds no readable state record; nothing was run$/,
    ],
  ]) {
    const root = project();
    try {
      plantRun(root, { state: stateOf({ pid: deadPid(), runnerPid: deadPid() }) });
      // The wait's group check (`ps -A`) is the step between its reads and the takeover's.
      const r = direct(root, resume("pharn-regress"), fakePs({ "A-1": plantStep(join(root, rel), text) }));
      assert.deepEqual([r.exit, r.out], [2, ""], `${rel}: ${r.tail}${r.errText}`);
      assert.match(r.errText, want);
      assert.equal(existsSync(lockPath(root)), false, `${rel}: the takeover's lock released`);
      assert.deepEqual(markersIn(root), [], `${rel}: nothing ran`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("WAIT (in-process) — a result written while the call decides is printed, never taken over; a holder that turns live at the takeover's lock is waited for (a fake `ps` makes each change at that exact step)", () => {
  const s = sleeper();
  const late = resultRecord({
    nonce: NONCE_A,
    stage: "pharn-regress",
    name: "demo",
    exit: 3,
    stdout: '{"late":1}',
    stderrTail: "",
    startLine: null,
    returnLine: "marker 9: orchestrator t",
  });
  const lock = { ...handed(), pid: s.pid };
  try {
    // (1) written between the wait's first read and its re-read before a takeover (at its group check).
    const a = project();
    try {
      plantRun(a, { state: stateOf({ pid: deadPid(), runnerPid: deadPid() }) });
      const r = direct(a, resume("pharn-regress"), fakePs({ "A-1": plantStep(join(a, RESULT_FILE), late) }));
      assert.deepEqual([r.exit, r.out], [3, '{"late":1}\nmarker 9: orchestrator t\n'], `${r.tail}${r.errText}`);
      assert.equal(existsSync(lockPath(a)), false, "no takeover took the lock");
    } finally {
      rmSync(a, { recursive: true, force: true });
    }
    // (2) written after that re-read, while the takeover clears a dead holder's lock: the takeover reads it, and the
    // wait prints it.
    const b = project();
    try {
      plantRun(b, { lock });
      const r = direct(b, resume("pharn-regress"), fakePs({ "ww-2": plantStep(join(b, RESULT_FILE), late) }));
      assert.deepEqual([r.exit, r.out], [3, '{"late":1}\nmarker 9: orchestrator t\n'], `${r.tail}${r.errText}`);
      assert.doesNotMatch(r.tail, /took over/);
      assert.equal(existsSync(lockPath(b)), false, "the takeover's own lock released");
    } finally {
      rmSync(b, { recursive: true, force: true });
    }
    // (3) the holder reads dead to the wait, then live to the takeover's lock: the call reads again and waits it out.
    const c = project();
    try {
      plantRun(c, { lock });
      const before = hashes(c);
      const steps = { "ww-all": `if [ "$n" -ge 2 ]; then echo "node stage-direct.mjs --runner ${NONCE_A}"; fi` };
      const r = direct(c, resume("pharn-regress", 700), fakePs(steps));
      assert.deepEqual([r.exit, r.out], [5, `${MARKER_DEFERRED_CONTINUE}\n`], `${r.tail}${r.errText}`);
      assert.match(r.errText, new RegExp(`^waiting \\(runner pid ${s.pid} alive\\)$`));
      assert.deepEqual(hashes(c), before, "the live holder's lock untouched");
    } finally {
      rmSync(c, { recursive: true, force: true });
    }
  } finally {
    s.kill("SIGKILL");
  }
});
