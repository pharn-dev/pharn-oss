#!/usr/bin/env node
// pharn/floor/stage-direct.mjs — run `/pharn-regress` or `/pharn-verify` from an orchestrator as ONE tested call
// (added 6.43.0, orchestrator-direct-stage-calls — audit candidate C3). The rules (which stages, which flags, which
// exits close a stage) are `pharn/floor/stage-direct-core.mjs`; this file is execution (P3). Its header is the spec:
// no new contract (P7). The stage scripts' protocol — one `pharn-stage-exit/1` object, its exit code — is
// `pharn/pharn-contracts/stage-exit.md`, which this call passes through UNCHANGED.
//
// ── Usage ─────────────────────────────────────────────────────────────────────────────────────────────
//   node pharn/floor/stage-direct.mjs --stage <pharn-regress|pharn-verify> --name '<name>' --iteration <N>
//                                     --timeout-ms <T> --budget-ms <B> [the stage's flags]        (fresh)
//   node pharn/floor/stage-direct.mjs --stage <pharn-regress|pharn-verify> --name '<name>' --resume --budget-ms <B>
// The stage's flags are passed to its script verbatim (regress: --base --gates --install --no-install --tests
// --no-tests; verify: --gates). Run it with the Bash tool's timeout at 600000, exactly as the thin callers run their
// script.
//
// ── WHY (P7 — measured) ───────────────────────────────────────────────────────────────────────────────
// /pharn-loop and /pharn-ship invoked the thin callers `/pharn-regress` and `/pharn-verify` as commands. In
// pharn-starter's 92-minute /pharn-loop run (2026-10-05) the orchestrator called them through the Skill tool, which
// injected each command body into its context (19,301 B and 17,339 B, carried by 29 and 16 later requests), and then
// spent separate requests on the thin caller's scope set, run and release around the script it already had the name
// for (.dev/features/orchestrator-direct-stage-calls/PLAN.md, "Why"). This call does what the thin caller's pinned
// lines did, in one process, and the orchestrators pin it instead. The thin callers stay, unchanged, for a person.
//
// ── WHAT ONE CALL DOES, IN ORDER ──────────────────────────────────────────────────────────────────────
//   0. TAKE THE IN-FLIGHT LOCK (GATE-2 review R1): create `.pharn/stage-direct/in-flight.json` with O_EXCL|O_NOFOLLOW,
//      holding this process's pid, the start time, the stage and the name. A lock already there whose pid is ALIVE —
//      or whose record cannot be read — refuses: exit 2, `stage-direct: refused (in-flight)`, nothing set, run or
//      marked. A lock whose pid is dead is stale: removed, then taken. `.pharn` or `.pharn/stage-direct` that is not a
//      real directory (a link, a file), or any other filesystem failure, refuses `lock-unusable`. The lock is
//      released in a `finally` — and only while it still holds this call's own record.
//   1. SET THE SCOPE: spawn `.claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-<stage>.md
//      --target .pharn/pharn-<stage>/stage.json` — the thin caller's own pinned setter line, so its claim holds here
//      too: while the script runs, no Write-tool write lands outside `.pharn/**` (fix #7, a hook). A setter that does
//      not exit 0 → exit 2 with a `stage-direct:` line and NO object: nothing else runs or is written.
//   2. A FRESH call writes the stage-start marker (stage, iteration) through `mark-phase.mjs`'s `tryMarkPhase` — the
//      one printed encoding, so the line binds the run (`run-window-core.mjs`, rule 6). A resume writes none.
//   3. RUN the stage script beside this file, stdout captured, stderr inherited, with no timeout of its own: the
//      script budgets itself (`--budget-ms`).
//   4. RELEASE the scope (`--clear`), whatever the script did.
//   5. The `orchestrator` return marker, unless the script exited `5` (continue): a stage script that asked a
//      question has ENDED, so an answered re-run of the same fresh line is a second execution (regress and verify
//      are verdict stages, which `ship-outcome-core.mjs` lets repeat).
//   6. PRINT, each piece synchronously as it happens: the start marker line (before the script runs, so a call the
//      Bash tool kills still shows it), the script's stdout byte for byte, then the return marker line (or
//      `MARKER_DEFERRED_CONTINUE`). EXIT with the script's own code; a signal, a spawn failure or an over-long
//      stdout is 1 — a crash, never a verdict, exactly as the stage-exit table reads it.
//
// ── FAILURE MODES (each stated; GRILL G2) ─────────────────────────────────────────────────────────────
//   * The setter fails — no thin-caller command file in the install, an unusable `.pharn/`, the setter missing →
//     exit 2, nothing run, no marker. The orchestrators map it as the stage's own `unusable` (S9 / STOP).
//   * A marker cannot be written → its line is `MARKER_NOT_WRITTEN`; the call goes on and the exit is the script's.
//   * The script cannot be spawned, or dies on a signal → exit 1 (the return marker is still written).
//   * `--clear` fails → a `stage-direct:` note on stderr, the exit unchanged; the `.pharn/**`-only scope left behind is
//     overwritten by the next scoped step (the same degradation the thin callers' own release has, L19).
//   * The Bash tool's 600 s limit does NOT kill the call: the tool MOVES IT TO THE BACKGROUND, where the stage script
//     and steps 4–6 run on to the end (GATE-2 review R1, reproduced at a 3 s tool timeout; 600 s is assumed to behave
//     the same). The orchestrators wait for its completion notice and branch on the exit and object it reports. Were a
//     second call started meanwhile — the resume line, say — two stage scripts would share `.pharn/pharn-<stage>/`, the
//     first call's late `--clear` would release a scope the second had set, and its return marker would land in the
//     middle of a later stage. Step 0's lock refuses that second call instead.
//   * Another call holds the lock → `refused (in-flight)`, exit 2, nothing touched; the orchestrators map it as the
//     call's own refusal (S9 / STOP). A process killed hard (SIGKILL) leaves its lock behind with a dead pid: the next
//     call clears it. A torn record (a kill between the lock's create and its write) is never guessed stale: it
//     refuses, and the line names the file to remove once no call is running.
//
// ── BOUNDS (P0) ───────────────────────────────────────────────────────────────────────────────────────
//   * DETECTED, NEVER PREVENTED, as before: the call's own writes — the scope file and two markers — are Bash writes
//     outside fix #7 (L19), all under `.pharn/`, outside the reconciled set; the script's own writes are the
//     script's, unchanged.
//   * The scope covers the script's run, not the gap between two calls: around a `continue` no stage scope is set and
//     the guard's default applies (the thin callers kept theirs across resumes).
//   * THE BUDGET CLOCK (GRILL G6): node's start-up, the two setter spawns and the two marker writes are outside the
//     script's clock, beside what the thin callers already name (node's start-up, the fast work after the last slow
//     step). The pinned numbers (540000 < 570000 < 600000) hold the 600 s cap only while that uncounted work fits in
//     the remaining 30 s; the call's own share is two short node spawns.
//   * Markers are advisory, as every marker is: a call that is not run marks nothing.
//   * THE LOCK excludes stage-direct calls from each other, in one tree — nothing else. A person running a thin
//     caller, or the stage script directly, beside a call is not seen. "Alive" is `kill(pid, 0)`: a dead holder whose
//     pid the OS has reused for another process reads as alive, so that call refuses (fail-closed) until the file is
//     removed. The lock is a Bash write outside fix #7 (L19), unauthenticated `.pharn/` state like the markers.

import "./runtime-floor.mjs";
import { spawnSync } from "node:child_process";
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readSync, unlinkSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_BASE, tryMarkPhase } from "./mark-phase.mjs";
import {
  SETTER,
  CLEAR_ARGV,
  DIRECT_STAGES,
  MARKER_DEFERRED_CONTINUE,
  LOCK_DIR,
  LOCK_FILE,
  LOCK_READ_MAX,
  lockRecord,
  parseLock,
  parseDirectArgs,
  scriptArgv,
  setterArgv,
  returnMarkerDue,
} from "./stage-direct-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The bound on one setter spawn. The setter is a short node process (~0.1 s); past this it is a failure. */
export const SETTER_TIMEOUT_MS = 60_000;

/** The most stdout a stage script may print (its one object is ~1 KB). Past it the child is killed: a crash. */
export const SCRIPT_STDOUT_MAX = 16 * 1024 * 1024;

function errCode(e) {
  return e && typeof e.code === "string" && /^[A-Z0-9_]{1,40}$/.test(e.code) ? e.code : "error";
}

/** Run the setter with `args` from `root`. Returns its exit status (null for a spawn error, a signal or a timeout). */
function runSetter(root, args, setterPath) {
  const r = spawnSync(process.execPath, [setterPath, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: SETTER_TIMEOUT_MS,
    killSignal: "SIGKILL",
  });
  return r.error || r.status === null ? null : r.status;
}

/** Is `pid` a live process? `EPERM` means it exists under another user — alive. */
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e?.code === "EPERM";
  }
}

/** The text of the regular file at `file`, never following a link, never blocking, at most LOCK_READ_MAX bytes; null
 *  when it is absent, not a regular file, or unreadable. */
function readRegular(file) {
  let fd;
  try {
    fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch {
    return null;
  }
  try {
    if (!fstatSync(fd).isFile()) return null;
    const buf = Buffer.alloc(LOCK_READ_MAX);
    const n = readSync(fd, buf, 0, LOCK_READ_MAX, 0);
    return buf.subarray(0, n).toString("utf8");
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

/** Make `rel` (under `root`) exist as a REAL directory — never a link, never a file. */
function realDir(root, rel) {
  const p = join(root, rel);
  try {
    mkdirSync(p);
  } catch (e) {
    if (e?.code !== "EEXIST") return `${rel}: ${errCode(e)}`;
  }
  try {
    const st = lstatSync(p);
    return st.isDirectory() ? null : `${rel} is not a directory (a link or a file)`;
  } catch (e) {
    return `${rel}: ${errCode(e)}`;
  }
}

/**
 * Take the in-flight lock (header, step 0). Returns `{ok: true, file, record}` or `{ok: false, reason, detail}` with
 * `reason` a LOCK_REFUSALS member. A dead holder's lock is removed once, then taken.
 */
export function acquireLock(root, { stage, name, now = Date.now(), pid = process.pid }) {
  for (const rel of [".pharn", LOCK_DIR]) {
    const bad = realDir(root, rel);
    if (bad) return { ok: false, reason: "lock-unusable", detail: bad };
  }
  const file = join(root, LOCK_FILE);
  const record = lockRecord({ pid, startedAt: new Date(now).toISOString(), stage, name });
  for (let attempt = 0; attempt < 2; attempt++) {
    let fd;
    try {
      fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
    } catch (e) {
      if (e?.code !== "EEXIST") return { ok: false, reason: "lock-unusable", detail: `${LOCK_FILE}: ${errCode(e)}` };
      const held = parseLock(readRegular(file));
      if (held === null)
        return {
          ok: false,
          reason: "in-flight",
          detail: `${LOCK_FILE} holds no readable lock record; if no stage-direct call is running in this tree, remove it`,
        };
      if (pidAlive(held.pid))
        return {
          ok: false,
          reason: "in-flight",
          detail: `another call (pid ${held.pid}, ${held.stage} for ${held.name}, started ${JSON.stringify(held.startedAt)}) is still running in this tree; wait for its completion notice and branch on what it reports — never start a second call`,
        };
      try {
        unlinkSync(file); // a dead holder: stale
      } catch (e2) {
        if (e2?.code !== "ENOENT") return { ok: false, reason: "lock-unusable", detail: `${LOCK_FILE}: ${errCode(e2)}` };
      }
      continue;
    }
    try {
      writeSync(fd, record);
    } catch (e) {
      closeSync(fd);
      try {
        unlinkSync(file);
      } catch {
        // the refusal below names the file either way
      }
      return { ok: false, reason: "lock-unusable", detail: `${LOCK_FILE}: ${errCode(e)}` };
    }
    closeSync(fd);
    return { ok: true, file, record };
  }
  return { ok: false, reason: "in-flight", detail: "another call took the lock while this one cleared a stale one" };
}

/** Release the lock — only while it still holds `record` (this call's own). Returns an error line, or null. */
export function releaseLock(lock) {
  if (readRegular(lock.file) !== lock.record) return `the in-flight lock no longer holds this call's record; left in place`;
  try {
    unlinkSync(lock.file);
    return null;
  } catch (e) {
    return e?.code === "ENOENT" ? null : `the in-flight lock was not released (${errCode(e)})`;
  }
}

/**
 * One direct call. Returns `{exit, out: string, err: string[]}` — `out` is everything for stdout, in order, also
 * handed to `write` piece by piece AS IT HAPPENS (the CLI writes each piece synchronously, so the start marker's line
 * reaches the tool result before a long script run, even if the call is later killed). Never throws for a failure it
 * names. `scriptPathFor(stage)` and `setterPath` exist for the tests (an injected script); the CLI passes neither, so
 * the production path is the script beside this file and the project's own setter.
 */
export function runDirect(
  argv,
  { root = process.cwd(), sessionId = null, base = join(root, DEFAULT_BASE), scriptPathFor, setterPath, write = () => {} } = {}
) {
  const parsed = parseDirectArgs(argv);
  if (!parsed.ok) return { exit: 2, out: "", err: [parsed.reason] };
  const o = parsed.opts;
  const lock = acquireLock(root, { stage: o.stage, name: o.name });
  if (!lock.ok) return { exit: 2, out: "", err: [`refused (${lock.reason}) — ${lock.detail}; nothing was run`] };
  let r = { exit: 1, out: "", err: [] };
  try {
    r = runLocked(o, { root, sessionId, base, scriptPathFor, setterPath, write });
  } finally {
    const note = releaseLock(lock);
    if (note) r.err.push(note);
  }
  return r;
}

/** Steps 1–6 of the header, under the lock. */
function runLocked(o, { root, sessionId, base, scriptPathFor, setterPath, write }) {
  const table = DIRECT_STAGES[o.stage];
  const setter = setterPath ?? join(root, SETTER);
  const err = [];

  const set = runSetter(root, setterArgv(o.stage), setter);
  if (set !== 0) {
    return {
      exit: 2,
      out: "",
      err: [`refused — the writes-scope for ${o.stage} could not be set (setter exit ${set === null ? "none" : set}); nothing was run`],
    };
  }

  let out = "";
  const emit = (s) => {
    out += s;
    write(s);
  };
  if (o.mode === "fresh") {
    const m = tryMarkPhase({ name: o.name, kind: "stage-start", stage: o.stage, iteration: o.iteration, base, sessionId });
    emit(`${m.line}\n`);
    if (!m.ok) err.push(`the stage-start marker was not written (${m.code}); the stage runs`);
  }

  const script = scriptPathFor ? scriptPathFor(o.stage) : join(HERE, table.script);
  const r = spawnSync(process.execPath, [script, ...scriptArgv(o)], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: SCRIPT_STDOUT_MAX,
  });
  const exit = r.error || !Number.isInteger(r.status) ? 1 : r.status;
  if (r.error) err.push(`the ${table.script} run failed (${errCode(r.error)}) — a crash, never a verdict`);
  else if (r.status === null) err.push(`${table.script} ended on a signal (${r.signal ?? "unknown"}) — a crash, never a verdict`);
  const child = typeof r.stdout === "string" ? r.stdout : "";
  if (child.length) emit(child.endsWith("\n") ? child : `${child}\n`);

  const clear = runSetter(root, CLEAR_ARGV, setter);
  if (clear !== 0)
    err.push(`the writes-scope was not released (setter exit ${clear === null ? "none" : clear}); the next scoped step overwrites it`);

  if (returnMarkerDue(exit)) {
    const m = tryMarkPhase({ name: o.name, kind: "orchestrator", base, sessionId });
    emit(`${m.line}\n`);
    if (!m.ok) err.push(`the return marker was not written (${m.code})`);
  } else emit(`${MARKER_DEFERRED_CONTINUE}\n`);

  return { exit, out, err };
}

/** Write one stdout piece synchronously, so the pieces keep their order around a blocking child; a pipe that refuses a
 *  synchronous write (EAGAIN) falls back to the stream, which still keeps the order of everything queued after it. */
function writeOut(s) {
  try {
    writeSync(1, s);
  } catch {
    process.stdout.write(s);
  }
}

function main(argv) {
  const r = runDirect(argv, { root: process.cwd(), sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? null, write: writeOut });
  for (const line of r.err) process.stderr.write(`stage-direct: ${line}\n`);
  return r.exit;
}

if (import.meta.main) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    // A throw here is a defect. Exit 1 is the stage-exit table's crash code, never a verdict.
    process.stderr.write(`stage-direct: unexpected failure (${errCode(e)})\n`);
    process.exitCode = 1;
  }
}
