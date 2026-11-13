#!/usr/bin/env node
// pharn/floor/stage-direct.mjs — run `/pharn-regress` or `/pharn-verify` from an orchestrator through a DETACHED STAGE
// RUNNER and a bounded in-node wait (added 6.43.0, orchestrator-direct-stage-calls — audit candidate C3; the runner and
// the wait 7.15.0, stage-wait-once — CORE-76). The rules (which stages, which flags, which exits close a stage, the
// records' schemas, the wait and takeover tables) are `pharn/floor/stage-direct-core.mjs`; this file is execution (P3).
// Its header is the spec: no new contract (P7). The stage scripts' protocol — one `pharn-stage-exit/1` object per
// invocation, its exit code — is `pharn/pharn-contracts/stage-exit.md`, which this call passes through UNCHANGED.
//
// ── Usage ─────────────────────────────────────────────────────────────────────────────────────────────
//   node pharn/floor/stage-direct.mjs --stage <pharn-regress|pharn-verify> --name '<name>' --iteration <N>
//                                     --timeout-ms <T> --budget-ms <B> [the stage's flags]        (fresh)
//   node pharn/floor/stage-direct.mjs --stage <pharn-regress|pharn-verify> --name '<name>' --resume --budget-ms <B>
// The stage's flags are passed to its script verbatim (regress: --base --gates --install --no-install --tests
// --no-tests; verify: --gates). Run it with the Bash tool's timeout at 600000, exactly as the thin callers run their
// script. `--runner <nonce>` is this file's own internal mode, started by a fresh call; no command names it.
//
// ── WHY (P7 — measured) ───────────────────────────────────────────────────────────────────────────────
// 6.43.0: /pharn-loop and /pharn-ship invoked the thin callers `/pharn-regress` and `/pharn-verify` as commands; in
// pharn-starter's 92-minute /pharn-loop run (2026-10-05) the orchestrator called them through the Skill tool, which
// injected each command body into its context (19,301 B and 17,339 B, carried by 29 and 16 later requests)
// (.dev/features/orchestrator-direct-stage-calls/PLAN.md, "Why"). This call does what the thin caller's pinned lines
// did, and the orchestrators pin it instead. The thin callers stay, unchanged, for a person.
// 7.15.0: with the pinned `--timeout-ms 540000 --budget-ms 570000`, `mayStartSlowStep` (stage-exit-core.mjs) lets a
// later slow step start only in an invocation's first 30 s, so every gate or install longer than that ended one call
// with exit 5 and the orchestrator spent a request — with its whole context — on the resume line, deciding nothing:
// a median of 18 orchestrator requests per regress in the 6 agent-started runs of
// `.dev/measurements/loop-baseline-2026-11-11.md` (CORE-20). Now the runner makes those same script calls inside node,
// and the orchestrator's call waits for it inside node, so a stage of wall time W costs about ⌈W / B⌉ calls.
//
// ── THE RECORDS, ONE WRITER EACH (all under `pharn/.run/stage-direct/`) ───────────────────────────────
//   in-flight.json  the lock — the call that took it (`holder: call`), or the runner it was handed to (`runner`); its
//                   pid, start time, stage, name and the run's nonce. Written by its holder only.
//   runner.json     what the fresh call was asked to run: nonce, stage, name, iteration, the fresh argv. Written ONCE by
//                   the start call, never rewritten.
//   state.json      the current lock holder's progress (the runner, or a takeover): its pid, the runner's pid, the
//                   invocations so far and how many ended `continue`, the stage-start marker's printed line and `seq`,
//                   the sha256 of the scope file it set, the phase (`running` · `script-exited`) and, at exit, the
//                   script's code, stdout and a bounded stderr tail.
//   result.json     what a wait prints — exit, stdout, stderr tail, both marker lines. Written LAST (tmp + rename) by
//                   the holder that ends the script run.
//   runner.log      the runner's own stdio: everything it and the scripts print to stderr, appended (a fresh call
//                   truncates it). Everything is read O_NOFOLLOW, bounded, by a TOTAL parser (core), and a reader takes
//                   state and result only when their nonce equals runner.json's (L66).
//
// ── WHAT EACH LINE DOES ───────────────────────────────────────────────────────────────────────────────
//   FRESH = START + WAIT.
//     a. IN FLIGHT? The earlier run's state writer is alive, or that run's runner process group still has a member, or
//        the lock's holder is alive → `refused (in-flight)`, exit 2, nothing touched. "ALIVE" IS ONE DEFINITION, used
//        everywhere: `kill(pid, 0)` and, for a runner, `ps -ww -p <pid> -o args=` showing `--runner <nonce>` — the
//        pid-reuse defence of entry-gates.mjs, COPIED here (its `psShowsNonce` is not exported, and that file is outside
//        this increment; the token differs). A reused pid without `ps` reads alive (fail-closed).
//     b. Take the lock (`holder: call`, a fresh nonce), created whole: the record is written to a tmp file that is then
//        LINKED into place (link refuses an existing path, as O_EXCL|O_NOFOLLOW does), so no call leaves an empty lock
//        even for a moment. A dead holder's lock is stale: it is renamed aside, re-read, and removed only if it still
//        holds the record judged stale — otherwise it is linked back (two calls clearing one stale lock: one takes it,
//        the other finds it held; three at once is a named bound below). Remove the earlier runner.json / state.json /
//        result.json (L66).
//     c. Write runner.json. d. Spawn `stage-direct.mjs --runner <nonce>` `detached` (its own process group, so it
//        outlives the Bash call), stdio to runner.log; a spawn failure releases the lock, removes runner.json and
//        refuses `spawn-failed`, exit 2. e. HAND OFF the lock: rewrite it (tmp + rename) to the runner's pid,
//        `holder: runner` — only the start call does this; a failed handoff kills the runner's group, removes
//        runner.json, releases the lock and refuses `lock-unusable`, so no later resume line runs a refused start. f. WAIT (below) for what is left of `--budget-ms`, printing
//        the stage-start marker's line as soon as state.json holds it (rule 6 of `run-window-core.mjs` reads it from
//        the orchestrator's own tool result).
//   RUNNER (`--runner <nonce>`). Refuses unless runner.json names its nonce, and waits (≤ HANDOFF_MAX_MS) until the lock
//     names it; either refusal is a log line and exit 2, nothing run — the wait then sees a dead holder and takes over.
//     It re-validates runner.json's argv (core `parseRunner`), takes the script from `DIRECT_STAGES` only, then: sets the
//     scope (the thin caller's own pinned setter line, so while a script runs no Write-tool write lands outside
//     `pharn/.run/**` — fix #7, a hook); a setter that does not exit 0 → result.json with exit 2, no object and today's
//     refusal line as its stderr tail. Writes the stage-start marker (`mark-phase.mjs`'s `tryMarkPhase`, the one
//     printed encoding). Runs TODAY'S CALLS: the fresh argv exactly as before (`--feature … --timeout-ms … --budget-ms
//     <B> [stage flags]`), and on each exit 5 `--resume --budget-ms <B>`, recording each invocation, until an exit
//     other than 5. Then `phase: script-exited`; releases the scope ONLY IF the scope file still holds the bytes it set
//     (a stop procedure or a new run may have set another); writes the return marker; writes result.json; releases the
//     lock (only while it names this runner).
//   RESUME = WAIT, with TAKEOVER. No runner.json → `refused (no-run)`; one naming another stage or name → `refused
//     (mismatch)` (a person decides, P5); unreadable → `refused (record-unusable)`. Otherwise WAIT.
//   WAIT (core `waitStep`), polling every POLL_MS with an `Atomics.wait` sleep, never a model poll:
//     • a bound result.json → replay its stderr tail to stderr, print its stdout byte for byte and its return-marker
//       line, exit with its code; the call then waits (≤ RELEASE_WAIT_MS) for the runner's lock release, so the next
//       line is never refused `in-flight` by a runner that is only exiting;
//     • the holder alive → keep waiting; budget spent → one `stage-direct: waiting (<who> pid <p> alive)` line on
//       stderr, `marker: deferred (continue)` on stdout and no object, exit 5 (the existing `5` → resume-line mapping;
//       the runner goes on meanwhile). Each gate is bounded by `--timeout-ms`; the script run itself is NOT — the
//       runner spawns it with no timeout of its own, as the call did before — so a script hung outside a gate keeps the
//       runner alive and every resume line exits 5 until a person stops the runner's group (a named bound);
//     • the holder dead, its process group still populated (an orphaned script or gate) → `refused (orphaned)`, exit 2,
//       naming the group and the remedy — never an endless exit-5 loop, never a second script beside the orphan;
//     • the holder dead, the group empty → TAKEOVER, only at the start of a call: a call that already waited past one
//       poll exits 5 at once (`takeover deferred`). The takeover takes the lock (`holder: call`), re-reads result.json
//       (finished meanwhile → print it), becomes state.json's writer, and decides (core `takeoverStep`): `finish` — the
//       script exited: run nothing, write the return marker only if markers.jsonl holds no `orchestrator` marker after
//       the recorded start `seq` (L58), write result.json; `start` — no start marker recorded: write and print it, then
//       run the FRESH argv; `fresh` — no `continue` seen: re-run the FRESH argv (a kill before the first checkpoint
//       leaves nothing to resume); `resume` — the script's own `--resume --budget-ms <B>`. One invocation per call: a 5
//       is recorded, the scope and lock released, exit 5 (the next call takes over again); any other exit closes the
//       stage as the runner does and is printed.
//   WHAT THE ORCHESTRATOR SEES IS TODAY'S BYTES: the start-marker line in the call that started the runner, then — in
//     whichever call reads the result — the final invocation's stdout byte for byte (a final newline added when it
//     lacks one) and the return-marker line, with the script's exit code. The intermediate `continue` objects stay in
//     the runner (they are not verdicts). EXIT: the script's own code; a signal, a spawn failure or an over-long stdout
//     is 1 — a crash, never a verdict, exactly as the stage-exit table reads it.
//   THE RETURN MARKER IS WRITTEN ONCE: only the lock holder that ends the script run writes it — the runner, or a
//     takeover over a run whose script exited (checked against markers.jsonl after the recorded `seq`) or that it
//     finished itself. A wait that reads a result never writes one.
//
// ── FAILURE MODES (each stated) ───────────────────────────────────────────────────────────────────────
//   * The setter fails — no thin-caller command file, an unusable `pharn/.run/`, the setter missing → exit 2, nothing
//     run, no marker; the refusal line is replayed. The orchestrators map it as the stage's own `unusable` (S9 / STOP).
//   * A marker cannot be written → its line is `MARKER_NOT_WRITTEN`; the run goes on and the exit is the script's.
//   * The script cannot be spawned, or dies on a signal → exit 1 (the return marker is still written).
//   * `--clear` fails, or the scope file holds another scope → a `stage-direct:` note in the replayed tail, the exit
//     unchanged.
//   * The runner cannot be spawned → `refused (spawn-failed)`; it refuses its nonce or never gets the lock → it runs
//     nothing and the wait takes over; it dies (a harness that kills a Bash call's descendants, a crash) → the takeover.
//   * result.json cannot be written → the wait sees a dead holder; the takeover finds `script-exited`, finds the return
//     marker already written, and writes the result.
//   * A record that is not a readable regular file (a link, a directory, a torn or foreign record), or whose state or
//     result holds this run's nonce but no valid shape → `refused (record-unusable)`, naming the file to remove once no
//     call is running. A torn, foreign or pre-upgrade lock is never guessed stale: `refused (in-flight)`, exit 2, by a
//     fresh call and by a takeover alike — a takeover waits only for a LIVE holder.
//   * The Bash tool's 600 s limit does NOT kill a call: the tool moves it to the background (GATE-2 review R1). With the
//     wait bounded by `--budget-ms` (570 s), a call ends before the cap unless node's start-up, the spawn, the final
//     print and the ≤ RELEASE_WAIT_MS wait for the runner's release do not fit the last 30 s — or a TAKEOVER's one
//     script invocation runs past it (its first slow step is always permitted, up to `--timeout-ms`, `stage-exit.md`).
//     The orchestrators wait for a backgrounded call; a second call meanwhile refuses or waits.
//
// ── BOUNDS (P0) ───────────────────────────────────────────────────────────────────────────────────────
//   * DETECTED, NEVER PREVENTED, as before: the call's own writes — the lock, the records, the log, the scope file and
//     two markers — are Bash writes outside fix #7 (L19), all under `pharn/.run/`, outside the reconciled set.
//   * Agreement, never provenance: nonce equality across files a Bash writer can rewrite.
//   * The scope covers each script run, not the gap between two calls around a takeover's `continue`.
//   * The scope release compares, then clears — two steps: a setter run between them is cleared.
//   * stderr reaches the orchestrator only at the end, as a bounded tail (STDERR_TAIL_MAX); the whole text is in
//     runner.log.
//   * An orchestrator that stops while a runner lives leaves it to finish the stage (each gate bounded by
//     `--timeout-ms`); the next fresh call refuses `in-flight` until it ends. There is no `--abort` (P7).
//   * THE SCRIPT RUN HAS NO TIMEOUT of its own, in the runner as in a takeover (the gates inside it do): a script that
//     hangs outside a gate keeps its runner alive, and every resume line exits 5 (`waiting`) until a person stops the
//     runner's process group — the same as a hung script under the per-call path before, whose backgrounded call never
//     ended either. No kill bound is added: it would be a chosen constant with no observed failure behind it (P7).
//   * THREE OR MORE calls clearing one stale lock at once can lose a live record: the first moves a second's fresh lock
//     aside to re-read it while a third creates one, so the put-back link fails and two calls may each believe they
//     hold the lock. Two calls are handled (one takes it, the other finds it held).
//   * THE LOCK NEEDS HARD LINKS: it is created by writing a tmp file and `link`ing it into place (so it is never seen
//     empty). On a filesystem without hard links (FAT/exFAT, some network mounts) `link` fails, and every call refuses
//     `lock-unusable` — a stop with a named reason, never a lock taken half-way.
//   * A process a gate double-forks out of the runner's group escapes both the liveness and the orphan check — the
//     same class as entry-gates.mjs's named bound. A takeover's script runs in the calling process's group, unchecked.
//   * A runner killed between its stage-start marker's append and its state.json write gets a second start marker
//     from the takeover; a takeover with no recorded start `seq` (the marker was not written) writes the return marker
//     without the check.
//   * With no `ps` on PATH the nonce check is unavailable and a live pid reads alive (fail-closed: refuse or wait).
//   * THE LOCK excludes stage-direct calls from each other, in one tree — nothing else. A person running a thin caller,
//     or the stage script directly, beside a call is not seen (the follow-up `stage-script-in-flight-guard`).
//   * THE CALL COUNT (⌈W / B⌉ on the normal path, one deferred call more per runner death) is ADVISORY orchestration:
//     it holds when the orchestrator runs the pinned lines and the Bash tool honours its timeout.

import "./runtime-floor.mjs";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_BASE, markerLine, markersPath, tryMarkPhase } from "./mark-phase.mjs";
import {
  SETTER,
  CLEAR_ARGV,
  DIRECT_STAGES,
  MARKER_DEFERRED_CONTINUE,
  LOCK_DIR,
  LOCK_FILE,
  LOCK_READ_MAX,
  RUNNER_FILE,
  STATE_FILE,
  RESULT_FILE,
  RUNNER_LOG,
  RUN_RECORDS,
  RESULT_READ_MAX,
  SCRIPT_STDOUT_MAX,
  RUNNER_FLAG,
  appendTail,
  lockRecord,
  parseLock,
  parseDirectArgs,
  parseRunner,
  parseRunnerArgs,
  parseState,
  parseResult,
  resultRecord,
  returnMarkerDue,
  runnerRecord,
  scriptArgv,
  setterArgv,
  stateRecord,
  stdoutPiece,
  takeoverStep,
  waitStep,
} from "./stage-direct-core.mjs";

export { SCRIPT_STDOUT_MAX };

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);

/** The bound on one setter spawn. The setter is a short node process (~0.1 s); past this it is a failure. */
export const SETTER_TIMEOUT_MS = 60_000;

/** How often a wait reads the records (entry-gates.mjs's interval): a result is seen within this of its write. */
export const POLL_MS = 250;

/** How long a runner waits for the start call to hand it the lock before it refuses (the handoff is one rename). */
export const HANDOFF_MAX_MS = 10_000;

/** How long a wait that printed a result waits for the runner's lock release (its last step, one unlink). */
export const RELEASE_WAIT_MS = 5_000;

/** The most bytes runner.json is read to: an argv of ≤ 64 tokens, each ≤ 4096 characters, JSON-escaped. */
const RUNNER_READ_MAX = 1 << 21;

/** The writes-scope file the setter writes, relative to the project root. */
const SCOPE_FILE = "pharn/.run/writes-scope.json";

const RESUME = "--resume";

function errCode(e) {
  return e && typeof e.code === "string" && /^[A-Z0-9_]{1,40}$/.test(e.code) ? e.code : "error";
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Run the setter with `args` from `root`. Returns its exit status (null for a spawn error, a signal or a timeout). */
function runSetter(root, args) {
  const r = spawnSync(process.execPath, [join(root, SETTER), ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: SETTER_TIMEOUT_MS,
    killSignal: "SIGKILL",
  });
  return r.error || r.status === null ? null : r.status;
}

// ── liveness: ONE definition (header, "IN FLIGHT?") ───────────────────────────────────────────────────

/** Is `pid` a live process? `EPERM` means it exists under another user — alive. */
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e?.code === "EPERM";
  }
}

/** Is `pid` the runner of `nonce`? true / false / null (ps unavailable). A COPY of entry-gates.mjs's `psShowsNonce`
 *  (not exported there; that file is outside this increment's scope), with this runner's token `--runner <nonce>`. */
function psShowsRunner(pid, nonce) {
  // `-ww`: never truncate the command line (procps and BSD ps both truncate a piped `args` column without it).
  const r = spawnSync("ps", ["-ww", "-p", String(pid), "-o", "args="], { encoding: "utf8" });
  if (r.error) return null;
  if (r.status !== 0) return false;
  return r.stdout.includes(`${RUNNER_FLAG} ${nonce}`);
}

/** A runner is alive when its pid is, and `ps` does not deny it is this run's runner (a zombie shows no argv). */
function runnerAlive(pid, nonce) {
  return pidAlive(pid) && psShowsRunner(pid, nonce) !== false;
}

/** The one liveness test for a holder: a runner by pid + nonce, a call by pid. A call that asks holds no lock, so a
 *  call record naming this very process is a leftover of an earlier in-process call, never a live holder. */
function alive(holder, pid, nonce) {
  if (holder === "runner") return runnerAlive(pid, nonce);
  return pid !== process.pid && pidAlive(pid);
}

/** Does process group `pgid` still have a live (non-zombie) member? From `ps -A -o pid=,pgid=,stat=`; with no ps,
 *  `kill(-pgid, 0)` (a zombie member reads alive there — fail-closed: the wait refuses `orphaned`). */
function groupAlive(pgid) {
  const r = spawnSync("ps", ["-A", "-o", "pid=,pgid=,stat="], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (!r.error && r.status === 0) {
    for (const row of r.stdout.split("\n")) {
      const [, pg, stat] = row.trim().split(/\s+/);
      if (Number(pg) === pgid && typeof stat === "string" && !stat.startsWith("Z")) return true;
    }
    return false;
  }
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (e) {
    return e?.code === "EPERM";
  }
}

// ── records: bounded, never following a link ──────────────────────────────────────────────────────────

/** The bytes of the regular file at `file`, never following a link, never blocking: `{state: absent}`, `{state:
 *  unusable}` (a link, not a regular file, larger than `max`, unreadable) or `{state: ok, bytes}`. */
function readFileBounded(file, max) {
  let fd;
  try {
    fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (e) {
    return { state: e?.code === "ENOENT" ? "absent" : "unusable" };
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > max) return { state: "unusable" };
    const buf = Buffer.alloc(st.size);
    let off = 0;
    while (off < st.size) {
      const n = readSync(fd, buf, off, st.size - off, off);
      if (n === 0) break;
      off += n;
    }
    return { state: "ok", bytes: buf.subarray(0, off) };
  } catch {
    return { state: "unusable" };
  } finally {
    closeSync(fd);
  }
}

/** The lock's text, or null when it is absent, not a regular file, or unreadable. */
function readLockText(file) {
  const r = readFileBounded(file, LOCK_READ_MAX);
  return r.state === "ok" ? r.bytes.toString("utf8") : null;
}

/** Write `text` to `file` by tmp + rename; the tmp is created O_EXCL|O_NOFOLLOW (a link planted there is replaced, never
 *  written through). Throws on failure. */
function writeAtomic(file, text) {
  const tmp = `${file}.tmp-${process.pid}`;
  const buf = Buffer.from(text, "utf8");
  for (let attempt = 0; ; attempt++) {
    let fd;
    try {
      fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
    } catch (e) {
      if (e?.code === "EEXIST" && attempt === 0) {
        unlinkSync(tmp);
        continue;
      }
      throw e;
    }
    try {
      let off = 0;
      while (off < buf.length) off += writeSync(fd, buf, off, buf.length - off);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, file);
    return;
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

/** The state directory and every run record are usable: `null`, or `{reason, detail}` (a call refusal). */
function recordsUsable(root) {
  for (const rel of ["pharn", "pharn/.run", LOCK_DIR]) {
    const bad = realDir(root, rel);
    if (bad) return { reason: "lock-unusable", detail: bad };
  }
  for (const rel of [...RUN_RECORDS, RUNNER_LOG]) {
    let st;
    try {
      st = lstatSync(join(root, rel));
    } catch (e) {
      if (e?.code === "ENOENT") continue;
      return { reason: "record-unusable", detail: `${rel}: ${errCode(e)}` };
    }
    if (!st.isFile())
      return {
        reason: "record-unusable",
        detail: `${rel} is not a regular file (a link or a directory); if no stage-direct call is running in this tree, remove it`,
      };
  }
  return null;
}

/** A record of this run: `{value}` (null when absent or another run's — never read, L66) or `{unusable: true}`. */
function readBound(root, rel, parser, nonce) {
  const r = readFileBounded(join(root, rel), RESULT_READ_MAX);
  if (r.state === "absent") return { value: null };
  if (r.state !== "ok") return { unusable: true };
  const v = parser(r.bytes.toString("utf8"));
  if (v === null) return { unusable: true };
  return { value: v.nonce === nonce ? v : null };
}

/** Append `text` to runner.log (O_APPEND|O_NOFOLLOW); a failure is ignored — the log is for a person, never a verdict. */
function appendLog(root, text) {
  if (!text) return;
  try {
    const fd = openSync(join(root, RUNNER_LOG), constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW, 0o644);
    try {
      writeSync(fd, text);
    } finally {
      closeSync(fd);
    }
  } catch {
    // the record's stderr tail still holds the end of it
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** The sha256 of the scope file now, or null when it is absent or unreadable. */
function scopeSha(root) {
  const r = readFileBounded(join(root, SCOPE_FILE), 1 << 20);
  return r.state === "ok" ? sha256(r.bytes) : null;
}

// ── the lock ──────────────────────────────────────────────────────────────────────────────────────────

/** Move a lock judged stale aside and remove it only if it still holds `staleText`; otherwise put it back (another call
 *  replaced it meanwhile). Returns "cleared", "changed", or an error code. */
function clearStale(file, staleText) {
  const aside = `${file}.stale-${process.pid}-${randomBytes(4).toString("hex")}`;
  try {
    renameSync(file, aside);
  } catch (e) {
    return e?.code === "ENOENT" ? "changed" : errCode(e);
  }
  if (readLockText(aside) === staleText) {
    try {
      unlinkSync(aside);
    } catch {
      // aside is not the lock; a leftover there blocks nothing
    }
    return "cleared";
  }
  try {
    linkSync(aside, file); // put another call's lock back — never over a third one (link refuses an existing path)
  } catch {
    // a third call took the slot meanwhile: the record put aside is lost, and two calls may each believe they hold the
    // lock — the header's named bound (three calls clearing one stale lock at once)
  }
  try {
    unlinkSync(aside);
  } catch {
    // as above
  }
  return "changed";
}

/** The refusal detail for a live holder. */
function heldDetail(held) {
  return held.holder === "runner"
    ? `a runner (pid ${held.pid}, ${held.stage} for ${held.name}, started ${JSON.stringify(held.startedAt)}) is still running a stage in this tree; run that stage's resume line to wait for it — never start a second fresh call`
    : `another call (pid ${held.pid}, ${held.stage} for ${held.name}, started ${JSON.stringify(held.startedAt)}) is still running in this tree; wait for its completion notice and branch on what it reports — never start a second call`;
}

/** Create the lock holding `record`, whole or not at all: the record is written to a fresh tmp file, which is then
 *  LINKED into place (link refuses an existing path, a link included, as O_EXCL|O_NOFOLLOW does). So no call of ours
 *  ever leaves an empty lock behind, even for a moment: an unreadable lock is a foreign, torn or pre-upgrade one.
 *  Returns true (created), false (a lock is there), or throws. */
function createLock(file, record) {
  const tmp = `${file}.new-${process.pid}-${randomBytes(4).toString("hex")}`;
  const fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
  try {
    try {
      writeSync(fd, record);
    } finally {
      closeSync(fd);
    }
    linkSync(tmp, file);
    return true;
  } catch (e) {
    if (e?.code === "EEXIST") return false;
    throw e;
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      // a leftover tmp blocks nothing
    }
  }
}

/**
 * Take the in-flight lock. Returns `{ok: true, file, record, cleared}` (`cleared` the stale record it removed, or null)
 * or `{ok: false, reason, detail, live}` with `reason` a LOCK_REFUSALS member and `live` true only when a LIVE holder
 * (or another call racing for it) has the lock — the one case a wait may wait out; an unreadable record is `live: false`
 * and is never guessed stale. A dead holder's lock is cleared, then taken.
 */
export function acquireLock(root, { stage, name, nonce, holder = "call", now = Date.now(), pid = process.pid }) {
  for (const rel of ["pharn", "pharn/.run", LOCK_DIR]) {
    const bad = realDir(root, rel);
    if (bad) return { ok: false, reason: "lock-unusable", detail: bad, live: false };
  }
  const file = join(root, LOCK_FILE);
  const record = lockRecord({ pid, startedAt: new Date(now).toISOString(), stage, name, nonce, holder });
  let cleared = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let created;
    try {
      created = createLock(file, record);
    } catch (e) {
      return { ok: false, reason: "lock-unusable", detail: `${LOCK_FILE}: ${errCode(e)}`, live: false };
    }
    if (created) return { ok: true, file, record, cleared };
    // ONE read decides absent vs present: a second lstat could see a lock a racing call linked in after the read, and
    // would call that live lock unreadable (re-review R1).
    const r = readFileBounded(file, LOCK_READ_MAX);
    if (r.state === "absent") continue; // released between the create and the read: try again
    const text = r.state === "ok" ? r.bytes.toString("utf8") : null;
    const held = parseLock(text);
    if (held === null)
      return {
        ok: false,
        reason: "in-flight",
        detail: `${LOCK_FILE} holds no readable lock record; if no stage-direct call is running in this tree, remove it`,
        live: false,
      };
    if (alive(held.holder, held.pid, held.nonce)) return { ok: false, reason: "in-flight", detail: heldDetail(held), live: true };
    const c = clearStale(file, text); // a dead holder: stale
    if (c === "cleared") cleared = held;
    else if (c !== "changed") return { ok: false, reason: "lock-unusable", detail: `${LOCK_FILE}: ${c}`, live: false };
  }
  return { ok: false, reason: "in-flight", detail: "another call took the lock while this one cleared a stale one", live: true };
}

/** Release the lock — only while it still holds `record` (this call's own). Returns an error line, or null. */
export function releaseLock(lock) {
  if (readLockText(lock.file) !== lock.record) return `the in-flight lock no longer holds this call's record; left in place`;
  try {
    unlinkSync(lock.file);
    return null;
  } catch (e) {
    return e?.code === "ENOENT" ? null : `the in-flight lock was not released (${errCode(e)})`;
  }
}

/** The runner's release: only while the lock names this runner (pid and nonce) — it never wrote the record itself. */
function releaseRunnerLock(root, nonce) {
  const file = join(root, LOCK_FILE);
  const text = readLockText(file);
  const held = parseLock(text);
  if (held === null || held.holder !== "runner" || held.pid !== process.pid || held.nonce !== nonce) return;
  if (clearStale(file, text) !== "cleared") return; // replaced meanwhile: not ours to remove
}

// ── one script run, and closing the stage ─────────────────────────────────────────────────────────────

/** Run the stage script beside this file once. Returns `{exit, stdout, stderr}`; `stderr` ends with any
 *  `stage-direct:` note about the run (a crash, never a verdict). */
function runScript(root, stage, args) {
  const table = DIRECT_STAGES[stage];
  const r = spawnSync(process.execPath, [join(HERE, table.script), ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: SCRIPT_STDOUT_MAX,
  });
  const exit = r.error || !Number.isInteger(r.status) ? 1 : r.status;
  let stderr = typeof r.stderr === "string" ? r.stderr : "";
  if (r.error) stderr += `stage-direct: the ${table.script} run failed (${errCode(r.error)}) — a crash, never a verdict\n`;
  else if (r.status === null)
    stderr += `stage-direct: ${table.script} ended on a signal (${r.signal ?? "unknown"}) — a crash, never a verdict\n`;
  return { exit, stdout: typeof r.stdout === "string" ? r.stdout : "", stderr };
}

/** The first `orchestrator` marker after `seq` in this name's markers.jsonl, or null (L58: never a count). */
function orchestratorAfter(base, name, seq) {
  let text;
  try {
    text = readFileSync(markersPath(name, base), "utf8");
  } catch {
    return null;
  }
  for (const line of text.split("\n")) {
    let m;
    try {
      m = JSON.parse(line);
    } catch {
      continue;
    }
    if (m && typeof m === "object" && m.kind === "orchestrator" && typeof m.seq === "number" && m.seq > seq) return m;
  }
  return null;
}

/** A context's state writer: writes state.json, notes a failure in the tail (the run goes on). */
function saveState(ctx, state) {
  try {
    writeAtomic(join(ctx.root, STATE_FILE), stateRecord(state));
  } catch (e) {
    state.stderrTail = appendTail(state.stderrTail, `stage-direct: state.json was not written (${errCode(e)})\n`);
  }
}

/** Note a `stage-direct:` line in the record's tail and the log. */
function note(ctx, state, line) {
  const text = `stage-direct: ${line}\n`;
  state.stderrTail = appendTail(state.stderrTail, text);
  ctx.log(text);
}

/** Release the scope only if the scope file still holds the bytes this run set (header, RUNNER). */
function releaseScope(ctx, state) {
  if (state.scopeSha === null) return;
  const now = scopeSha(ctx.root);
  if (now === null) return; // already released
  if (now !== state.scopeSha) {
    note(ctx, state, "the writes-scope file holds another scope now (a later step set it); left in place");
    return;
  }
  const clear = runSetter(ctx.root, CLEAR_ARGV);
  if (clear !== 0)
    note(
      ctx,
      state,
      `the writes-scope was not released (setter exit ${clear === null ? "none" : clear}); the next scoped step overwrites it`
    );
}

/** Close the stage after the script exited: release the scope, write the return marker once, write result.json LAST.
 *  Returns the result object (also when its write failed). */
function finishRun(ctx, rec, state) {
  releaseScope(ctx, state);
  let returnLine;
  const seq = state.startMarker?.seq ?? null;
  const already = seq === null ? null : orchestratorAfter(ctx.base, rec.name, seq);
  if (already) returnLine = markerLine(already);
  else {
    const m = tryMarkPhase({ name: rec.name, kind: "orchestrator", base: ctx.base, sessionId: ctx.sessionId });
    returnLine = m.line;
    if (!m.ok) note(ctx, state, `the return marker was not written (${m.code})`);
  }
  const result = {
    nonce: rec.nonce,
    stage: rec.stage,
    name: rec.name,
    exit: state.exit,
    stdout: state.stdout,
    stderrTail: state.stderrTail,
    startLine: state.startMarker?.line ?? null,
    returnLine,
  };
  try {
    writeAtomic(join(ctx.root, RESULT_FILE), resultRecord(result));
  } catch (e) {
    ctx.log(`stage-direct: result.json was not written (${errCode(e)})\n`);
  }
  return result;
}

/** The setter refused: today's refusal, as a result — exit 2, no object, no marker, the line as the stderr tail. */
function setterRefused(ctx, rec, state, set) {
  note(
    ctx,
    state,
    `refused — the writes-scope for ${rec.stage} could not be set (setter exit ${set === null ? "none" : set}); nothing was run`
  );
  const result = {
    nonce: rec.nonce,
    stage: rec.stage,
    name: rec.name,
    exit: 2,
    stdout: "",
    stderrTail: state.stderrTail,
    startLine: state.startMarker?.line ?? null,
    returnLine: null,
  };
  try {
    writeAtomic(join(ctx.root, RESULT_FILE), resultRecord(result));
  } catch (e) {
    ctx.log(`stage-direct: result.json was not written (${errCode(e)})\n`);
  }
  return result;
}

/** Set the scope and record its bytes. Returns the setter's status. */
function setScope(ctx, rec, state) {
  const set = runSetter(ctx.root, setterArgv(rec.stage));
  if (set === 0) {
    state.scopeSha = scopeSha(ctx.root);
    saveState(ctx, state);
  }
  return set;
}

/** Write the stage-start marker and record it. Returns its printed line. */
function startMarker(ctx, rec, state) {
  const m = tryMarkPhase({
    name: rec.name,
    kind: "stage-start",
    stage: rec.stage,
    iteration: rec.iteration,
    base: ctx.base,
    sessionId: ctx.sessionId,
  });
  state.startMarker = { line: m.line, seq: m.ok ? m.marker.seq : null };
  if (!m.ok) note(ctx, state, `the stage-start marker was not written (${m.code}); the stage runs`);
  saveState(ctx, state);
  return m.line;
}

// ── the runner ────────────────────────────────────────────────────────────────────────────────────────

/** `--runner <nonce>` (header, RUNNER). Returns its exit code; what it decided is in result.json. */
export function runRunner(nonce, { root = process.cwd(), sessionId = null, base = join(root, DEFAULT_BASE) } = {}) {
  const ctx = { root, sessionId, base, log: (s) => process.stderr.write(s) };
  const say = (s) => ctx.log(`stage-direct runner: ${s}\n`);
  const raw = readFileBounded(join(root, RUNNER_FILE), RUNNER_READ_MAX);
  const rec = raw.state === "ok" ? parseRunner(raw.bytes.toString("utf8")) : null;
  if (rec === null || rec.nonce !== nonce) {
    say("refused — runner.json does not name this runner's nonce; nothing was run");
    return 2;
  }
  for (const deadline = Date.now() + HANDOFF_MAX_MS; ;) {
    const held = parseLock(readLockText(join(root, LOCK_FILE)));
    if (held && held.holder === "runner" && held.pid === process.pid && held.nonce === nonce) break;
    if (Date.now() > deadline) {
      say("refused — the in-flight lock was never handed to this runner; nothing was run");
      return 2;
    }
    sleepMs(10);
  }
  const state = {
    nonce,
    holder: "runner",
    pid: process.pid,
    runnerPid: process.pid,
    invocations: 0,
    continues: 0,
    startMarker: null,
    scopeSha: null,
    phase: "running",
    exit: null,
    stdout: null,
    stderrTail: "",
  };
  saveState(ctx, state);
  try {
    const set = setScope(ctx, rec, state);
    if (set !== 0) {
      setterRefused(ctx, rec, state, set);
      return 2;
    }
    startMarker(ctx, rec, state);
    let args = scriptArgv(rec.opts);
    for (;;) {
      const r = runScript(root, rec.stage, args);
      ctx.log(r.stderr);
      state.stderrTail = appendTail(state.stderrTail, r.stderr);
      state.invocations++;
      if (returnMarkerDue(r.exit)) {
        Object.assign(state, { phase: "script-exited", exit: r.exit, stdout: r.stdout });
        saveState(ctx, state);
        break;
      }
      state.continues++;
      saveState(ctx, state);
      args = [RESUME, "--budget-ms", String(rec.opts.budgetMs)];
    }
    finishRun(ctx, rec, state);
    return 0;
  } finally {
    releaseRunnerLock(root, nonce);
  }
}

// ── the orchestrator's call ───────────────────────────────────────────────────────────────────────────

function refuse(ctx, reason, detail) {
  ctx.err.push(`refused (${reason}) — ${detail}; nothing was run`);
  return { exit: 2, out: ctx.out, err: ctx.err };
}

/** Print a bound result (header, WAIT): the tail replayed, the start line (a start call that has not printed it yet),
 *  the stdout, the return line. Returns the call's result. */
function printResult(ctx, res) {
  ctx.writeErr(res.stderrTail);
  if (ctx.start && !ctx.printedStart && res.startLine !== null) ctx.emit(`${res.startLine}\n`);
  ctx.emit(stdoutPiece(res.stdout));
  if (res.returnLine !== null) ctx.emit(`${res.returnLine}\n`);
  return { exit: res.exit, out: ctx.out, err: ctx.err };
}

/** After a result: wait (bounded) until the runner of `nonce` no longer holds the lock — it releases it right after. */
function awaitRelease(root, nonce) {
  for (const deadline = Date.now() + RELEASE_WAIT_MS; Date.now() < deadline;) {
    const held = parseLock(readLockText(join(root, LOCK_FILE)));
    if (held === null || held.nonce !== nonce || held.holder !== "runner" || !runnerAlive(held.pid, nonce)) return;
    sleepMs(20);
  }
}

/** One exit-5 ending of a call: the reason on stderr, the deferred line on stdout. */
function deferred(ctx, line) {
  ctx.err.push(line);
  ctx.emit(`${MARKER_DEFERRED_CONTINUE}\n`);
  return { exit: 5, out: ctx.out, err: ctx.err };
}

/**
 * TAKEOVER (header, WAIT): under the lock, one step of `takeoverStep`. Returns a call result, or `{again: true}` when the
 * call should read the records again (a result appeared, or a LIVE call took the lock first). Any other lock refusal —
 * an unreadable (torn, foreign, pre-upgrade) record included — refuses, exit 2: never an endless exit-5 loop.
 */
function takeover(ctx, rec) {
  const lock = acquireLock(ctx.root, { stage: rec.stage, name: rec.name, nonce: rec.nonce, holder: "call" });
  if (!lock.ok) return lock.live ? { again: true } : refuse(ctx, lock.reason, lock.detail);
  try {
    const res = readBound(ctx.root, RESULT_FILE, parseResult, rec.nonce);
    if (res.unusable) return refuse(ctx, "record-unusable", `${RESULT_FILE} holds no readable result record`);
    if (res.value) return { again: true }; // finished between the two reads
    const st = readBound(ctx.root, STATE_FILE, parseState, rec.nonce);
    if (st.unusable) return refuse(ctx, "record-unusable", `${STATE_FILE} holds no readable state record`);
    const step = takeoverStep(st.value);
    const runnerPid = st.value?.runnerPid ?? (lock.cleared?.holder === "runner" ? lock.cleared.pid : null);
    const state = st.value
      ? { ...st.value, holder: "takeover", pid: process.pid, runnerPid }
      : {
          nonce: rec.nonce,
          holder: "takeover",
          pid: process.pid,
          runnerPid,
          invocations: 0,
          continues: 0,
          startMarker: null,
          scopeSha: null,
          phase: "running",
          exit: null,
          stdout: null,
          stderrTail: "",
        };
    note(ctx, state, `took over ${rec.stage} for ${rec.name} (${step}): the runner is gone`);
    saveState(ctx, state);
    if (step === "finish") return printResult(ctx, finishRun(ctx, rec, state));
    const set = setScope(ctx, rec, state);
    if (set !== 0) return printResult(ctx, setterRefused(ctx, rec, state, set));
    if (step === "start") {
      ctx.emit(`${startMarker(ctx, rec, state)}\n`);
      ctx.printedStart = true;
    }
    const args = step === "resume" ? [RESUME, "--budget-ms", String(ctx.o.budgetMs)] : scriptArgv(rec.opts);
    const r = runScript(ctx.root, rec.stage, args);
    ctx.log(r.stderr);
    state.stderrTail = appendTail(state.stderrTail, r.stderr);
    state.invocations++;
    if (!returnMarkerDue(r.exit)) {
      state.continues++;
      saveState(ctx, state);
      releaseScope(ctx, state);
      return deferred(ctx, "the takeover's script run continues (exit 5); run the resume line again — it takes over again");
    }
    Object.assign(state, { phase: "script-exited", exit: r.exit, stdout: r.stdout });
    saveState(ctx, state);
    return printResult(ctx, finishRun(ctx, rec, state));
  } finally {
    const n = releaseLock(lock);
    if (n) ctx.err.push(n);
  }
}

/** WAIT (header). `rec` is runner.json's record. */
function waitFor(ctx, rec) {
  for (;;) {
    const elapsed = Date.now() - ctx.t0;
    const nowRaw = readFileBounded(join(ctx.root, RUNNER_FILE), RUNNER_READ_MAX);
    const now = nowRaw.state === "ok" ? parseRunner(nowRaw.bytes.toString("utf8")) : null;
    if (now === null || now.nonce !== rec.nonce)
      return refuse(ctx, "mismatch", `${RUNNER_FILE} no longer names the run this call waited for (another run started in this tree)`);
    const res = readBound(ctx.root, RESULT_FILE, parseResult, rec.nonce);
    if (res.unusable)
      return refuse(
        ctx,
        "record-unusable",
        `${RESULT_FILE} holds no readable result record; if no stage-direct call is running in this tree, remove it`
      );
    const st = readBound(ctx.root, STATE_FILE, parseState, rec.nonce);
    if (st.unusable)
      return refuse(
        ctx,
        "record-unusable",
        `${STATE_FILE} holds no readable state record; if no stage-direct call is running in this tree, remove it`
      );
    if (res.value) {
      const r = printResult(ctx, res.value);
      awaitRelease(ctx.root, rec.nonce);
      return r;
    }
    if (ctx.start && !ctx.printedStart && st.value?.startMarker) {
      ctx.emit(`${st.value.startMarker.line}\n`);
      ctx.printedStart = true;
    }
    const lock = parseLock(readLockText(join(ctx.root, LOCK_FILE)));
    let who = null;
    if (lock && alive(lock.holder, lock.pid, lock.nonce)) who = { name: lock.holder === "runner" ? "runner" : "call", pid: lock.pid };
    else if (st.value && alive(st.value.holder === "runner" ? "runner" : "call", st.value.pid, rec.nonce))
      who = { name: st.value.holder, pid: st.value.pid };
    const pgid = st.value?.runnerPid ?? (lock?.holder === "runner" && lock.nonce === rec.nonce ? lock.pid : null);
    const grp = who === null && pgid !== null && groupAlive(pgid);
    if (who === null && !grp) {
      // finished between the reads? Read the result again before anything takes over.
      const again = readBound(ctx.root, RESULT_FILE, parseResult, rec.nonce);
      if (again.value) continue;
    }
    const step = waitStep({
      holderAlive: who !== null,
      groupAlive: grp,
      elapsedMs: elapsed,
      budgetMs: ctx.o.budgetMs,
      pollMs: POLL_MS,
    });
    if (step === "sleep") {
      sleepMs(POLL_MS);
      continue;
    }
    if (step === "budget") return deferred(ctx, `waiting (${who.name} pid ${who.pid} alive)`);
    if (step === "orphaned")
      return refuse(
        ctx,
        "orphaned",
        `the runner (pid ${pgid}) is gone with no result, but its process group ${pgid} still runs (an orphaned script or gate); stop that group (kill -TERM -- -${pgid}), then re-run this resume line`
      );
    if (step === "takeover-deferred")
      return deferred(ctx, "takeover deferred — the runner is gone with no result; the next resume line takes over with its whole budget");
    const t = takeover(ctx, rec);
    if (t.again) continue;
    return t;
  }
}

/** FRESH = START + WAIT (header). */
function startCall(ctx) {
  const { root, o } = ctx;
  const bad = recordsUsable(root);
  if (bad) return refuse(ctx, bad.reason, bad.detail);
  // The earlier run — whatever its nonce — must be over: its state writer dead, its runner's group empty. A run whose
  // result is written is over whatever its pids read now (a pid the OS reused must not block every later run).
  const prev = readFileBounded(join(root, STATE_FILE), RESULT_READ_MAX);
  let ps = prev.state === "ok" ? parseState(prev.bytes.toString("utf8")) : null;
  if (prev.state !== "absent" && ps === null)
    return refuse(
      ctx,
      "record-unusable",
      `${STATE_FILE} holds no readable state record; if no stage-direct call is running in this tree, remove it`
    );
  if (ps && readBound(root, RESULT_FILE, (t) => parseResult(t) ?? { nonce: null }, ps.nonce).value) ps = null;
  if (ps && alive(ps.holder === "runner" ? "runner" : "call", ps.pid, ps.nonce))
    return refuse(
      ctx,
      "in-flight",
      `a ${ps.holder} (pid ${ps.pid}) is still running a stage in this tree; run that stage's resume line to wait for it — never start a second fresh call`
    );
  if (ps && ps.runnerPid !== null && groupAlive(ps.runnerPid))
    return refuse(
      ctx,
      "in-flight",
      `an earlier runner's process group ${ps.runnerPid} still runs (an orphaned script or gate); stop it (kill -TERM -- -${ps.runnerPid}), then start again`
    );

  const nonce = randomBytes(16).toString("hex");
  const lock = acquireLock(root, { stage: o.stage, name: o.name, nonce, holder: "call" });
  if (!lock.ok) return refuse(ctx, lock.reason, lock.detail);
  let handedOff = false;
  let wroteRunner = false;
  try {
    for (const rel of RUN_RECORDS) {
      try {
        unlinkSync(join(root, rel));
      } catch (e) {
        if (e?.code !== "ENOENT") return refuse(ctx, "record-unusable", `${rel}: ${errCode(e)}`);
      }
    }
    try {
      writeAtomic(join(root, RUNNER_FILE), runnerRecord({ nonce, stage: o.stage, name: o.name, iteration: o.iteration, argv: ctx.argv }));
      wroteRunner = true;
    } catch (e) {
      return refuse(ctx, "record-unusable", `${RUNNER_FILE}: ${errCode(e)}`);
    }
    let child;
    let fd;
    try {
      fd = openSync(join(root, RUNNER_LOG), constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o644);
      child = spawn(process.execPath, [SELF, RUNNER_FLAG, nonce], { cwd: root, detached: true, stdio: ["ignore", fd, fd] });
    } catch (e) {
      child = { pid: undefined, error: e };
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
    if (!Number.isInteger(child.pid))
      return refuse(ctx, "spawn-failed", `the runner could not be started (${child.error ? errCode(child.error) : "no pid"})`);
    child.unref();
    try {
      writeAtomic(
        lock.file,
        lockRecord({ pid: child.pid, startedAt: new Date().toISOString(), stage: o.stage, name: o.name, nonce, holder: "runner" })
      );
      handedOff = true;
    } catch (e) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // it was waiting for the handoff; it refuses on its own within HANDOFF_MAX_MS
      }
      return refuse(ctx, "lock-unusable", `the lock could not be handed to the runner (${errCode(e)})`);
    }
  } finally {
    if (!handedOff) {
      // A start that never handed off ran nothing: remove its runner.json, so no later resume line takes it over and
      // runs the fresh argv of a refused start (spawn-failed and a failed handoff alike).
      if (wroteRunner) {
        try {
          unlinkSync(join(root, RUNNER_FILE));
        } catch {
          // the refusal names the run as not started either way
        }
      }
      const n = releaseLock(lock);
      if (n) ctx.err.push(n);
    }
  }
  const raw = readFileBounded(join(root, RUNNER_FILE), RUNNER_READ_MAX);
  const rec = raw.state === "ok" ? parseRunner(raw.bytes.toString("utf8")) : null;
  if (rec === null || rec.nonce !== nonce) return refuse(ctx, "mismatch", `${RUNNER_FILE} no longer names the run this call started`);
  return waitFor(ctx, rec);
}

/** RESUME = WAIT, with TAKEOVER (header). */
function resumeCall(ctx) {
  const { root, o } = ctx;
  const bad = recordsUsable(root);
  if (bad) return refuse(ctx, bad.reason, bad.detail);
  const raw = readFileBounded(join(root, RUNNER_FILE), RUNNER_READ_MAX);
  if (raw.state === "absent")
    return refuse(ctx, "no-run", `no run was started in this tree (no ${RUNNER_FILE}); run the stage's fresh line`);
  const rec = raw.state === "ok" ? parseRunner(raw.bytes.toString("utf8")) : null;
  if (rec === null)
    return refuse(
      ctx,
      "record-unusable",
      `${RUNNER_FILE} holds no readable runner record; if no stage-direct call is running in this tree, remove it`
    );
  if (rec.stage !== o.stage || rec.name !== o.name)
    return refuse(
      ctx,
      "mismatch",
      `the run in this tree is ${rec.stage} for ${rec.name}, not ${o.stage} for ${o.name}; a person decides which to finish`
    );
  return waitFor(ctx, rec);
}

/**
 * One direct call (header). Returns `{exit, out: string, err: string[]}` — `out` is everything for stdout, in order, also
 * handed to `write` piece by piece AS IT HAPPENS (the CLI writes each piece synchronously, so the start marker's line
 * reaches the tool result before a long wait); the replayed stderr tail goes to `writeErr`; `err` holds the call's own
 * lines. Never throws for a failure it names. There is no injection: the scripts are the ones beside this file and the
 * setter is the project's own, in the runner as in a takeover (L41).
 */
export function runDirect(
  argv,
  { root = process.cwd(), sessionId = null, base = join(root, DEFAULT_BASE), write = () => {}, writeErr = () => {} } = {}
) {
  const parsed = parseDirectArgs(argv);
  if (!parsed.ok) return { exit: 2, out: "", err: [parsed.reason] };
  const ctx = {
    root,
    sessionId,
    base,
    argv: [...argv],
    o: parsed.opts,
    t0: Date.now(),
    start: parsed.opts.mode === "fresh",
    printedStart: false,
    out: "",
    err: [],
    emit(s) {
      if (!s) return;
      this.out += s;
      write(s);
    },
    writeErr(s) {
      if (s) writeErr(s);
    },
    log: (s) => appendLog(root, s),
  };
  return ctx.start ? startCall(ctx) : resumeCall(ctx);
}

/** Write one stdout piece synchronously, so the pieces keep their order around a blocking wait; a pipe that refuses a
 *  synchronous write (EAGAIN) falls back to the stream, which still keeps the order of everything queued after it. */
function writeOut(s) {
  try {
    writeSync(1, s);
  } catch {
    process.stdout.write(s);
  }
}

function main(argv) {
  const sessionId = process.env.CLAUDE_CODE_SESSION_ID ?? null;
  if (argv[0] === RUNNER_FLAG) {
    const nonce = parseRunnerArgs(argv);
    if (nonce === null) {
      process.stderr.write(`stage-direct: refused — ${RUNNER_FLAG} takes exactly one run nonce (an internal mode); nothing was run\n`);
      return 2;
    }
    return runRunner(nonce, { root: process.cwd(), sessionId });
  }
  const r = runDirect(argv, {
    root: process.cwd(),
    sessionId,
    write: writeOut,
    writeErr: (s) => process.stderr.write(s),
  });
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
