// pharn/floor/stage-direct-core.mjs — the PURE half of the orchestrators' direct stage call (added 6.43.0,
// orchestrator-direct-stage-calls — audit candidate C3). No filesystem, no child_process, no clock. The execution
// half — the scope setter, the markers, the stage script — is `pharn/floor/stage-direct.mjs`, whose header is the
// protocol's spec (P7: no new contract). This file changes when a RULE changes (which stages, which flags, which
// exits close a stage); that one changes when an execution detail does (P3).
//
// WHAT IT ENCODES:
//   * `DIRECT_STAGES` — the ONE closed table: per stage, the script it runs, the thin-caller command whose `writes:` the
//     scope is set from (`--from-frontmatter`), the scope target — IMPORTED from each stage's own path table
//     (`REGRESS_PATHS.stageJson`, `VERIFY_PATHS.stageJson`), never re-typed (L35) — the stage-exit stage name, and
//     the script flags the call passes through. The flag set holds every flag a registry `question` option appends
//     (`stage-exit-core.mjs` REGISTRY — a test holds the two together), so a question's answer can always be
//     appended to the same fresh line.
//   * `parseDirectArgs` — closed in both directions per mode: a FRESH call takes `--stage --name --iteration
//     --timeout-ms --budget-ms` and the stage's flags; a RESUME call takes `--stage --name --resume --budget-ms` and
//     nothing else. No default for any number (L41): the pinned line carries them.
//   * `scriptArgv`, `setterArgv`, `CLEAR_ARGV` — what each child is given.
//   * `returnMarkerDue(exit)` — every exit closes the stage's execution but `continue` (5): a stage SCRIPT that asks
//     a question has ENDED (nothing continues inside it, unlike a stage agent — `stage-agent.mjs finish`), so its
//     return marker is written and an answered re-run is a second execution. Since 7.15.0 it is the runner's loop
//     condition and the takeover's: a `5` means run `--resume`, any other exit closes the stage.
//   * The in-flight lock's path, schema and closed refusals, and `parseLock` — what a held record must look like
//     (GATE-2 review R1; the execution, and why the lock exists, are `stage-direct.mjs`'s header).
//   * (7.15.0, stage-wait-once — CORE-76) the detached runner's records — `runner.json` (the start call's, once),
//     `state.json` and `result.json` (the current lock holder's) — each with a builder and a TOTAL parser over a closed
//     schema (null, never a throw — L62); the `--runner <nonce>` argv rule; the WAIT decision table (`waitStep`) and
//     the TAKEOVER table (`takeoverStep`); the bounded stderr tail; the closed call refusals (`CALL_REFUSALS`).
// TRUST (P2): argv is the orchestrator's (a validated slug, `<N>`, git's hex, or a ship human's answer the script
// re-validates). This module checks presence, closed membership and control characters only — it never interprets
// a stage flag's VALUE; the script does, as it always has. A refusal names the flag and the vocabulary, and quotes an
// argv string through `JSON.stringify`, which cannot throw on a string (L62). The records live in unauthenticated
// `pharn/.run/` (L19): a parser checks their SHAPE and the caller checks their nonce — agreement, never provenance.

import { REGRESS_PATHS } from "./stage-regress-core.mjs";
import { VERIFY_PATHS } from "./stage-verify-core.mjs";
import { EXIT_CODE, FEATURE_SLUG_RE } from "./stage-exit-core.mjs";

/** The scope setter every pinned setter line runs, relative to the project root. */
export const SETTER = ".claude/hooks/set-writes-scope.cjs";

/** The setter's release argv. */
export const CLEAR_ARGV = Object.freeze(["--clear"]);

/** THE table (see the header). Frozen at every level; iterate it, never re-list it (L29). */
export const DIRECT_STAGES = Object.freeze({
  "pharn-regress": Object.freeze({
    script: "stage-regress.mjs",
    command: ".claude/commands/pharn-regress.md",
    target: REGRESS_PATHS.stageJson,
    exitStage: "regress",
    valueFlags: Object.freeze(["--base", "--gates", "--install", "--tests"]),
    bareFlags: Object.freeze(["--no-install", "--no-tests"]),
  }),
  "pharn-verify": Object.freeze({
    script: "stage-verify.mjs",
    command: ".claude/commands/pharn-verify.md",
    target: VERIFY_PATHS.stageJson,
    exitStage: "verify",
    valueFlags: Object.freeze(["--gates"]),
    bareFlags: Object.freeze([]),
  }),
});

/** The call's own flags. */
const OWN_VALUE_FLAGS = Object.freeze(["--stage", "--name", "--iteration", "--timeout-ms", "--budget-ms"]);
const RESUME = "--resume";

const ITER_RE = /^[1-9][0-9]{0,5}$/;
const MS_RE = /^[1-9][0-9]{0,8}$/;

/** No C0 control character (tab/newline/CR included), no DEL, 1..max characters (L14). */
function cleanScalar(v, max) {
  if (typeof v !== "string" || v.length < 1 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

/** An argv string, quoted and bounded for a refusal. `JSON.stringify` of a string never throws (L62). */
export function shown(s) {
  // 7.15.0: total for a non-string too — `String({toString: 1})` throws, so anything but a string is named by its type.
  const q = JSON.stringify(typeof s === "string" ? s : `<${s === null ? "null" : typeof s}>`).replace(/[\u0000-\u001f\u007f]/g, "?"); // eslint-disable-line no-control-regex
  return q.length > 80 ? `${q.slice(0, 80)}…` : q;
}

/**
 * Parse one direct call's argv. Returns `{ok: true, opts}` — `opts` = {stage, name, mode: "fresh" | "resume",
 * iteration, timeoutMs, budgetMs, passthrough: string[]} — or `{ok: false, reason}`. Every flag at most once.
 */
export function parseDirectArgs(argv) {
  if (!Array.isArray(argv)) return { ok: false, reason: "no arguments" };
  const seen = new Map();
  const order = [];
  let resume = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === RESUME) {
      if (resume) return { ok: false, reason: `${RESUME} was given more than once` };
      resume = true;
      continue;
    }
    if (typeof a !== "string" || !a.startsWith("--")) return { ok: false, reason: `unexpected argument ${shown(a)}` };
    if (seen.has(a)) return { ok: false, reason: `${a.length > 40 ? "a flag" : a} was given more than once` };
    const bare = Object.values(DIRECT_STAGES).some((s) => s.bareFlags.includes(a));
    if (bare) {
      seen.set(a, true);
      order.push(a);
      continue;
    }
    const v = argv[i + 1];
    if (v === undefined || (typeof v === "string" && v.startsWith("--")))
      return { ok: false, reason: `${shown(a)} was given with no value` };
    seen.set(a, v);
    order.push(a);
    i++;
  }
  const stage = seen.get("--stage");
  if (stage === undefined) return { ok: false, reason: "--stage is required" };
  if (!cleanScalar(stage, 64) || !Object.hasOwn(DIRECT_STAGES, stage))
    return { ok: false, reason: `--stage must be one of ${Object.keys(DIRECT_STAGES).join(", ")}` };
  const table = DIRECT_STAGES[stage];
  const name = seen.get("--name");
  if (name === undefined) return { ok: false, reason: "--name is required" };
  if (!cleanScalar(name, 64) || !FEATURE_SLUG_RE.test(name))
    return { ok: false, reason: `--name must be a feature slug matching ${FEATURE_SLUG_RE}` };
  const budget = seen.get("--budget-ms");
  if (budget === undefined) return { ok: false, reason: "--budget-ms is required" };
  if (!cleanScalar(budget, 9) || !MS_RE.test(budget))
    return { ok: false, reason: "--budget-ms must be a positive integer of milliseconds" };

  if (resume) {
    const extra = order.filter((f) => !["--stage", "--name", "--budget-ms"].includes(f));
    if (extra.length)
      return {
        ok: false,
        reason: `${RESUME} takes only --stage, --name and --budget-ms (the script reads the rest from its progress record)`,
      };
    return { ok: true, opts: { stage, name, mode: "resume", iteration: null, timeoutMs: null, budgetMs: Number(budget), passthrough: [] } };
  }

  const iteration = seen.get("--iteration");
  if (iteration === undefined) return { ok: false, reason: "--iteration is required for a fresh call" };
  if (!cleanScalar(iteration, 6) || !ITER_RE.test(iteration)) return { ok: false, reason: "--iteration must be a positive integer" };
  const timeout = seen.get("--timeout-ms");
  if (timeout === undefined) return { ok: false, reason: "--timeout-ms is required for a fresh call" };
  if (!cleanScalar(timeout, 9) || !MS_RE.test(timeout))
    return { ok: false, reason: "--timeout-ms must be a positive integer of milliseconds" };

  const passthrough = [];
  for (const f of order) {
    if (OWN_VALUE_FLAGS.includes(f)) continue;
    if (table.bareFlags.includes(f)) {
      passthrough.push(f);
      continue;
    }
    if (!table.valueFlags.includes(f)) {
      const allowed = [...table.valueFlags, ...table.bareFlags];
      return {
        ok: false,
        reason: `${f.length > 40 ? "a flag" : shown(f)} is not a ${stage} flag (allowed: ${allowed.length ? allowed.join(", ") : "none"})`,
      };
    }
    const v = seen.get(f);
    if (!cleanScalar(v, 4096)) return { ok: false, reason: `${f} must be a value without control characters` };
    passthrough.push(f, v);
  }
  return {
    ok: true,
    opts: { stage, name, mode: "fresh", iteration: Number(iteration), timeoutMs: Number(timeout), budgetMs: Number(budget), passthrough },
  };
}

/** The stage script's argv for parsed `opts`. A resume carries no state of its own (L44). */
export function scriptArgv(opts) {
  if (opts.mode === "resume") return [RESUME, "--budget-ms", String(opts.budgetMs)];
  return ["--feature", opts.name, "--timeout-ms", String(opts.timeoutMs), "--budget-ms", String(opts.budgetMs), ...opts.passthrough];
}

/** The setter's argv for a stage: exactly the thin caller's pinned setter line (a hygiene test compares the two). */
export function setterArgv(stage) {
  const t = DIRECT_STAGES[stage];
  return ["--from-frontmatter", t.command, "--target", t.target];
}

/** Does this exit close the stage's execution (write the return marker)? Every exit but `continue`. */
export function returnMarkerDue(exit) {
  return exit !== EXIT_CODE.continue;
}

/** The second (last) line printed when the return marker waits for a resume. */
export const MARKER_DEFERRED_CONTINUE = "marker: deferred (continue)";

// ── THE IN-FLIGHT LOCK (GATE-2 review R1) ─────────────────────────────────────────────────────────────
// ONE lock for both stages, beside (never inside) their state roots: each stage script's fresh start removes its own
// root (`pharn/.run/pharn-verify/` whole; regress clears `pharn/.run/pharn-regress/`), so a lock there would be deleted while
// held — and the two stages share the one writes-scope file, which is what a second concurrent call would clobber.

/** The lock's directory and file, relative to the project root. */
export const LOCK_DIR = "pharn/.run/stage-direct";
export const LOCK_FILE = `${LOCK_DIR}/in-flight.json`;

/** The lock record's schema token. `/2` (7.15.0) adds the run's `nonce` and the `holder` — the call that took it, or the
 *  runner it was handed to; a `/1` record from before the upgrade reads as no record (a person removes it). */
export const LOCK_SCHEMA = "pharn-stage-direct-lock/2";

/** Who holds the lock: a call (a start call before its handoff, or a takeover) or the detached runner. */
export const LOCK_HOLDERS = Object.freeze(["call", "runner"]);

/** The closed reasons a call refuses with because of the lock (exit 2, a `stage-direct: refused (<reason>)` line). */
export const LOCK_REFUSALS = Object.freeze(["in-flight", "lock-unusable"]);

/** Every reason a call refuses with (exit 2, a `stage-direct: refused (<reason>)` line, no object): the lock's two, then
 *  the runner protocol's (7.15.0) — the runner could not be started, the run on disk is another stage's or name's, a
 *  dead runner's process group still runs, the resume line found no run, a record is not a readable regular file. */
export const CALL_REFUSALS = Object.freeze([...LOCK_REFUSALS, "spawn-failed", "mismatch", "orphaned", "no-run", "record-unusable"]);

/** The most bytes a lock record is read to (one record is ~250 B). */
export const LOCK_READ_MAX = 4096;

/** The run's nonce: 16 random bytes as hex — what binds every record, and the runner's own argv, to one start. */
export const NONCE_RE = /^[0-9a-f]{32}$/;

/** The lock record a call writes: one JSON line. */
export function lockRecord({ pid, startedAt, stage, name, nonce, holder }) {
  return `${JSON.stringify({ schema: LOCK_SCHEMA, pid, started_at: startedAt, stage, name, nonce, holder })}\n`;
}

/** JSON text → a plain object, or null. Never throws. */
function plainObject(text) {
  if (typeof text !== "string") return null;
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  return o !== null && typeof o === "object" && !Array.isArray(o) ? o : null;
}

const isPid = (v) => Number.isSafeInteger(v) && v >= 1;
const isCount = (v) => Number.isSafeInteger(v) && v >= 0;
const isStage = (v) => typeof v === "string" && Object.hasOwn(DIRECT_STAGES, v);
const isName = (v) => typeof v === "string" && FEATURE_SLUG_RE.test(v);
const isNonce = (v) => typeof v === "string" && NONCE_RE.test(v);
const isExit = (v) => Number.isSafeInteger(v) && v >= 0 && v <= 255;
const isText = (v, max) => typeof v === "string" && v.length <= max;
const isLine = (v) => typeof v === "string" && v.length <= 512 && !/[\r\n]/.test(v);

/**
 * Read a lock record's text. Returns `{pid, startedAt, stage, name, nonce, holder}` when it is a well-formed record of
 * this schema — a positive integer pid, a stage of `DIRECT_STAGES`, a feature slug, a nonce, a holder of `LOCK_HOLDERS`
 * — else null (a torn or foreign file). Never throws.
 */
export function parseLock(text) {
  const o = plainObject(text);
  if (o === null || o.schema !== LOCK_SCHEMA) return null;
  if (!isPid(o.pid) || !isStage(o.stage) || !isName(o.name) || !isNonce(o.nonce)) return null;
  if (typeof o.holder !== "string" || !LOCK_HOLDERS.includes(o.holder)) return null;
  if (typeof o.started_at !== "string" || o.started_at.length > 40) return null;
  return { pid: o.pid, startedAt: o.started_at, stage: o.stage, name: o.name, nonce: o.nonce, holder: o.holder };
}

// ── THE RUNNER'S RECORDS (7.15.0, stage-wait-once — CORE-76) ─────────────────────────────────────────────
// All beside the lock, one writer each (stage-direct.mjs's header says who and when). Every parser is TOTAL over a
// closed schema: anything else is null, never a throw (L62), and a caller reads a record only when its `nonce` equals
// `runner.json`'s (L66). The stdout a record carries is the script's, byte for byte as today's call printed it.

export const RUNNER_FILE = `${LOCK_DIR}/runner.json`;
export const STATE_FILE = `${LOCK_DIR}/state.json`;
export const RESULT_FILE = `${LOCK_DIR}/result.json`;
export const RUNNER_LOG = `${LOCK_DIR}/runner.log`;

/** The three records a fresh call removes before it writes `runner.json` (L66: a new run never reads an old one). */
export const RUN_RECORDS = Object.freeze([RUNNER_FILE, STATE_FILE, RESULT_FILE]);

export const RUNNER_SCHEMA = "pharn-stage-direct-runner/1";
export const STATE_SCHEMA = "pharn-stage-direct-state/1";
export const RESULT_SCHEMA = "pharn-stage-direct-result/1";

/** The most stdout a stage script may print (its one object is ~1 KB). Past it the child is killed: a crash. */
export const SCRIPT_STDOUT_MAX = 16 * 1024 * 1024;

/** The most stderr bytes a record keeps — the END of what the script and the runner printed (the whole text is in
 *  `runner.log`). */
export const STDERR_TAIL_MAX = 8192;

/** The most bytes a state or result record is read to: its stdout and tail, each JSON-escaped (≤ 6 bytes a char),
 *  plus the fields. A record past it is unreadable (`record-unusable`), never truncated into a different one. */
export const RESULT_READ_MAX = 6 * (SCRIPT_STDOUT_MAX + STDERR_TAIL_MAX) + 65536;

/** `tail` + `more`, kept to its last STDERR_TAIL_MAX characters. */
export function appendTail(tail, more) {
  const s = `${typeof tail === "string" ? tail : ""}${typeof more === "string" ? more : ""}`;
  return s.length > STDERR_TAIL_MAX ? s.slice(s.length - STDERR_TAIL_MAX) : s;
}

/** `runner.json`: what the fresh call was asked to run. Written ONCE, by the start call, never rewritten. */
export function runnerRecord({ nonce, stage, name, iteration, argv }) {
  return `${JSON.stringify({ schema: RUNNER_SCHEMA, nonce, stage, name, iteration, argv })}\n`;
}

/**
 * `runner.json`'s text → `{nonce, stage, name, iteration, argv, opts}`, or null. The recorded argv is RE-VALIDATED by
 * `parseDirectArgs` (a FRESH call, of the recorded stage, name and iteration) — the runner never runs an argv this
 * module would refuse on the command line, and it takes the script from `DIRECT_STAGES`, never from a record (P2).
 */
export function parseRunner(text) {
  const o = plainObject(text);
  if (o === null || o.schema !== RUNNER_SCHEMA) return null;
  if (!isNonce(o.nonce) || !isStage(o.stage) || !isName(o.name)) return null;
  if (!Number.isSafeInteger(o.iteration) || o.iteration < 1) return null;
  if (!Array.isArray(o.argv) || o.argv.length > 64 || !o.argv.every((a) => typeof a === "string")) return null;
  const p = parseDirectArgs(o.argv);
  if (!p.ok || p.opts.mode !== "fresh" || p.opts.stage !== o.stage || p.opts.name !== o.name || p.opts.iteration !== o.iteration)
    return null;
  return { nonce: o.nonce, stage: o.stage, name: o.name, iteration: o.iteration, argv: [...o.argv], opts: p.opts };
}

/** Where the runner's script run is. */
export const PHASES = Object.freeze(["running", "script-exited"]);
/** Who writes `state.json` now: the runner, or a call that took over from a dead one. */
export const STATE_HOLDERS = Object.freeze(["runner", "takeover"]);

/** `state.json`: the current lock holder's progress. `startMarker` is `{line, seq}` (seq null when it was not
 *  written) or null before it; `scopeSha` the sha256 of the scope file the holder set, or null; `exit`, `stdout` and
 *  `stderrTail` are set at `script-exited` (the tail is kept as the run goes). */
export function stateRecord(s) {
  return `${JSON.stringify({
    schema: STATE_SCHEMA,
    nonce: s.nonce,
    holder: s.holder,
    pid: s.pid,
    runner_pid: s.runnerPid,
    invocations: s.invocations,
    continues: s.continues,
    start_marker: s.startMarker,
    scope_sha: s.scopeSha,
    phase: s.phase,
    exit: s.exit,
    stdout: s.stdout,
    stderr_tail: s.stderrTail,
  })}\n`;
}

/** `state.json`'s text → the object `stateRecord` takes, or null (closed schema; never throws). */
export function parseState(text) {
  const o = plainObject(text);
  if (o === null || o.schema !== STATE_SCHEMA || !isNonce(o.nonce)) return null;
  if (typeof o.holder !== "string" || !STATE_HOLDERS.includes(o.holder) || !isPid(o.pid)) return null;
  if (o.runner_pid !== null && !isPid(o.runner_pid)) return null;
  if (!isCount(o.invocations) || !isCount(o.continues) || o.continues > o.invocations) return null;
  let startMarker = null;
  if (o.start_marker !== null) {
    const m = o.start_marker;
    if (m === null || typeof m !== "object" || Array.isArray(m) || !isLine(m.line)) return null;
    if (m.seq !== null && !isPid(m.seq)) return null;
    startMarker = { line: m.line, seq: m.seq };
  }
  if (o.scope_sha !== null && !(typeof o.scope_sha === "string" && /^[0-9a-f]{64}$/.test(o.scope_sha))) return null;
  if (typeof o.phase !== "string" || !PHASES.includes(o.phase)) return null;
  if (!isText(o.stderr_tail, STDERR_TAIL_MAX)) return null;
  if (o.phase === "script-exited") {
    if (!isExit(o.exit) || !isText(o.stdout, SCRIPT_STDOUT_MAX)) return null;
  } else if (o.exit !== null || o.stdout !== null) return null;
  return {
    nonce: o.nonce,
    holder: o.holder,
    pid: o.pid,
    runnerPid: o.runner_pid,
    invocations: o.invocations,
    continues: o.continues,
    startMarker,
    scopeSha: o.scope_sha,
    phase: o.phase,
    exit: o.exit,
    stdout: o.stdout,
    stderrTail: o.stderr_tail,
  };
}

/** `result.json`: what a wait prints. Written LAST by the holder that ends the script run (tmp + rename). `startLine` is
 *  the stage-start marker's printed line (null when none was written: a refused setter), `returnLine` the return
 *  marker's (null likewise). */
export function resultRecord(r) {
  return `${JSON.stringify({
    schema: RESULT_SCHEMA,
    nonce: r.nonce,
    stage: r.stage,
    name: r.name,
    exit: r.exit,
    stdout: r.stdout,
    stderr_tail: r.stderrTail,
    start_line: r.startLine,
    return_line: r.returnLine,
  })}\n`;
}

/** `result.json`'s text → the object `resultRecord` takes, or null (closed schema; never throws). */
export function parseResult(text) {
  const o = plainObject(text);
  if (o === null || o.schema !== RESULT_SCHEMA || !isNonce(o.nonce) || !isStage(o.stage) || !isName(o.name)) return null;
  if (!isExit(o.exit) || !isText(o.stdout, SCRIPT_STDOUT_MAX) || !isText(o.stderr_tail, STDERR_TAIL_MAX)) return null;
  if (o.start_line !== null && !isLine(o.start_line)) return null;
  if (o.return_line !== null && !isLine(o.return_line)) return null;
  return {
    nonce: o.nonce,
    stage: o.stage,
    name: o.name,
    exit: o.exit,
    stdout: o.stdout,
    stderrTail: o.stderr_tail,
    startLine: o.start_line,
    returnLine: o.return_line,
  };
}

/** The runner's own argv, `--runner <nonce>` — internal: no command names it (a hygiene test pins that). Returns the
 *  nonce, or null for anything else. */
export const RUNNER_FLAG = "--runner";
export function parseRunnerArgs(argv) {
  if (!Array.isArray(argv) || argv.length !== 2 || argv[0] !== RUNNER_FLAG) return null;
  return isNonce(argv[1]) ? argv[1] : null;
}

/** The script stdout as a call prints it: unchanged, plus a final newline when it lacks one; nothing when empty. */
export function stdoutPiece(stdout) {
  if (typeof stdout !== "string" || stdout.length === 0) return "";
  return stdout.endsWith("\n") ? stdout : `${stdout}\n`;
}

/**
 * THE WAIT TABLE — one step of a wait that read NO bound result this poll (a bound result is printed before this table
 * is consulted). Inputs: `holderAlive` (the lock holder or the state's writer is alive, by the one liveness definition —
 * stage-direct.mjs `alive`), `groupAlive` (the runner's process group still has a live member), `elapsedMs` since the
 * call began, `budgetMs`, `pollMs`. Returns one of `sleep`, `budget` (exit 5, the holder still runs), `orphaned`
 * (refuse), `takeover`, `takeover-deferred` (exit 5: a call that already waited past one poll takes over nothing, so
 * the takeover gets the next call's whole budget and the scripts' first-slow-step rule cannot overrun the Bash cap).
 */
export function waitStep({ holderAlive, groupAlive, elapsedMs, budgetMs, pollMs }) {
  if (holderAlive) return elapsedMs + pollMs > budgetMs ? "budget" : "sleep";
  if (groupAlive) return "orphaned";
  return elapsedMs > pollMs ? "takeover-deferred" : "takeover";
}

/**
 * THE TAKEOVER TABLE — what a call that took the lock from a dead holder does, from the nonce-bound `state` (or null).
 * `finish` — the script exited: run nothing, close the stage; `start` — no start marker was recorded: write it, then run
 * the FRESH argv; `fresh` — no `continue` seen yet: re-run the FRESH argv (a kill before the script's first checkpoint
 * leaves nothing to resume, `stage-exit.md`); `resume` — the script's own `--resume`.
 */
export function takeoverStep(state) {
  if (state !== null && state.phase === "script-exited") return "finish"; // never a second run of an ended script
  if (state === null || state.startMarker === null) return "start";
  return state.continues === 0 ? "fresh" : "resume";
}
