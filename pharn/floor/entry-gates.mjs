#!/usr/bin/env node
// pharn/floor/entry-gates.mjs — a delivery run's ENTRY check (loop-entry-preflight, 6.42.0): the gate set /pharn-verify
// will discover, run ONCE on the tree the run starts from, in a detached background runner, while /pharn-spec,
// /pharn-plan and /pharn-grill work; its verdict is read just before /pharn-test, and (7.5.0) peeked at earlier. The rule — what counts as red, and why
// — is entry-gates-core.mjs's header; this file reads and writes the disk and runs the processes (P3).
//
// ================================ THE CLI — four pinned lines ================================
//   node pharn/floor/entry-gates.mjs --start [--refresh] --feature <name> --timeout-ms <N>
//   node pharn/floor/entry-gates.mjs --wait --feature <name> --budget-ms <B>
//   node pharn/floor/entry-gates.mjs --peek --feature <name>
//   node pharn/floor/entry-gates.mjs --abort --feature <name>
// /pharn-loop: `--start` is Step 1a's last line, `--peek` runs after the spec stage and after the plan stage, `--wait`
// between the grill and the test stage, `--abort` first at every stop. /pharn-ship: `--start` after its pre-run snapshot,
// `--peek` after the plan stage, the same `--wait` point, `--abort` at every STOP.
//
// --start  supersedes an earlier runner of this tree (one per tree, L38: `--abort` first; review R6 — an earlier pid
//          that is alive but cannot be verified, with no `ps`, refuses `runner-unverifiable` and wipes nothing), wipes
//          `pharn/.run/pharn-entry/` (containment-walked; a symlink at any component refuses — L54) and an earlier run's
//          entry-gate changes record, records `runner.json` with a fresh nonce BEFORE anything else (pid null), runs
//          `run-gates.mjs init --stage entry` synchronously, then spawns the runner (`detached`, so `setsid`: it outlives
//          the Bash call — measured — and has its own process group) and rewrites the record with its pid. Exit 0 started
//          · 3 no gates (a `no-gates` result is recorded, no runner) · 2 refused (`entry-gates: refused <reason> — …` on
//          stderr; a runner refusal records an `unusable` result) · 4 red on CACHED evidence (gate-evidence-cache, below:
//          no runner, an `unusable` / `cached-red` result). `--refresh` skips the lookup.
// --runner INTERNAL. Refuses unless `runner.json` names its nonce and feature. One `run-gates.mjs run --next` per gate,
//          the feature-directory digest AND the changed-path listing (scope-inputs.mjs `changedPaths(HEAD)` minus the
//          feature directory, each path through pre-run-snapshot.mjs `pathDigest`) before and after each, then
//          `result.json` LAST (tmp + rename), carrying the nonce, the stamp's sha256, the per-gate digests and the
//          per-gate changes. Any error writes an `unusable` result instead.
// --wait   blocks inside node (never a model poll) up to --budget-ms. It reads ONLY a `result.json` carrying the nonce
//          and feature of the `runner.json` in place (L66 — a directory `--start` created empty, a file the runner
//          writes last), re-reads the stamp, requires its sha256 to be the result's, `validateStamp(…, {stage:
//          "entry", feature})` and ENTRY_ALGO, and decides with `entryVerdict`. No result + runner alive → keep waiting,
//          or exit 5 when the budget is spent. No result + runner GONE (a harness that kills a Bash call's descendants,
//          a crash) → TAKEOVER: it runs what is left in the foreground through the SAME drain (`drainEntry`; the digests
//          so far come from progress.json), within its budget (stage-exit-core.mjs mayStartSlowStep), and exits 5 to be
//          re-run when out of it; with no gate run in progress at all → `runner-died`. On a verdict it RECORDS the paths a
//          `mutated` gate changed beside the pre-run snapshot (pre-run-snapshot.mjs `recordEntryChanges`, review R1), so
//          /pharn-regress and the quick scope check report them rather than count them as the build's escape. Prints ONE
//          JSON document (entry-gates-core.mjs DOC_SCHEMA). Exit 0 green · 4 red · 6 unmeasured (6.75.0: no attributable
//          red, but a gate the runner killed at --timeout-ms or could not start) · 3 no-gates · 5 continue · 2 unusable.
// --peek   (7.5.0, entry-verdict-early-read) ONE read: never a wait, never a TAKEOVER (a dead runner's gates are left
//          for the final `--wait`), and no write at all — no changes record, no offer, no observation, no result. A
//          bound finished result is decided exactly as `--wait` decides it (`decideResult`, shared — L35); with none,
//          the gates finished so far are decided over run-gates' in-progress record (entry-gates-core.mjs
//          `inProgressStampView`, then the same `validateStamp` and `entryVerdict`), and ONLY a red is a verdict there
//          (entry-gates-core.mjs header, "THE EARLY READ"). Everything else — no red yet, only an unmeasured gate, a
//          record that is absent, refused or another run's — is `continue`. Its documents carry `changes_record:
//          "deferred"`. Exit 0 green · 4 red · 6 unmeasured (finished result only) · 3 no-gates · 5 continue · 2 unusable.
//          Its reliance on the in-progress record is on run-gates.mjs's "SINGLE STORE" rule (cited, not restated).
// --abort  a no-op (exit 0) when no runner record exists, it names another feature, or its pid is not this runner's.
//          Otherwise (review R4): SIGSTOP the runner's process group (so it starts nothing new), then list
//          `ps -A -o pid=,ppid=,pgid=` and SIGSTOP every descendant's process group, re-listing until the set is stable;
//          SIGTERM + SIGCONT those groups, wait a grace, SIGKILL a survivor group only when one of its processes still
//          matches a listed `(pid, ppid, pgid)` (entry-gates-core.mjs `killableGroups`), then SIGKILL the runner's group
//          and record an `aborted` result. No signal is sent until `ps -ww -p <pid> -o args=` shows this runner's nonce,
//          so a reused pid is never signalled. Its exit never changes the stop it runs at.
//
// ================================ BOUNDS, NAMED ================================
//   • Descendants are found by parent pid, so a process a gate starts in its own group or session (`detached`, `setsid`)
//     IS found and killed while its parent is alive at the listing (review R5, reproduced). Only a process that was
//     reparented before the listing — a double-forked daemon whose parent already exited — escapes `--abort`. With no
//     `ps` on PATH, `--abort` signals nothing and says so; `--wait` then reads a live pid as alive.
//   • The recorded gate changes are what the listings saw DURING a `mutated` gate: a front-stage write outside the
//     feature directory that lands during such a gate is recorded with it (and so not counted at regress while it keeps
//     its bytes). A gate re-run after a takeover is listed from the takeover's own start, so a write its killed first
//     attempt left, rewritten byte-identically, is not recorded and reads as an escape — the safe direction.
//   • An orchestrator that dies without a stop leaves the runner to finish its gates (each bounded by --timeout-ms);
//     the next `--start` in the tree supersedes it.
//   • A front-stage write OUTSIDE `pharn/features/<name>/` while the gates run: landing BETWEEN two gates it is a tree
//     change between gates — run-gates refuses (`tree-changed-between-gates`) and the result is `unusable
//     child-refused` with that `runner_reason`; landing DURING a gate it marks that gate `mutated`, which the document
//     lists (run-gates records a gate's own tree change the same way). Writes inside the feature directory are
//     neither: the entry fingerprint excludes it (worktree-fingerprint.mjs ENTRY_ALGO).
//   • Everything under `pharn/.run/pharn-entry/` is ordinary `pharn/.run/` state a Bash writer reaches (L19, L43): agreement
//     between the stamp, its digest and the result is checked, never provenance. The runner's writes are `fs` writes
//     outside fix #7, before the build's reconcile anchor.
//   • The record readers (`readInProject`) are imported from regress-base-reuse.mjs (reused, not copied — L35), so a
//     change to that reader reaches this check too.
//   • THE BASE EVIDENCE (6.49.0, entry-run-as-base-evidence): `--start` also hands run-gates the list regress's own
//     default rule would give its `test` gate (scope-inputs.mjs `defaultTestUniverse` minus `changedPaths(HEAD)`), so
//     the set holds the evidence-only `base:test` slot (gate-run-core.mjs ENTRY_BASE_TEST_ID; never an S14 or S14b stop). Any
//     problem with that list — a listing that fails, a path ac-tests-core.mjs `badPath` refuses, a shape resolveSet would
//     refuse, more than BASE_TESTS_MAX_ARGV_BYTES of argv, a regress BASE checkout still standing at
//     `pharn/.run/pharn-regress/base` (a runner's path filters could match its copies) — means NO slot, never a refusal. A
//     `--wait` that decided green, red or unmeasured, after every check above, then PUBLISHES the offer /pharn-regress reads
//     (entry-base-evidence.mjs `publishEntryOffer`, in the git dir); `--start` discards an earlier one. Publication is
//     best-effort: a failure is one `note —` line on stderr and changes no document, exit or record.
//   • CACHED RED EVIDENCE (gate-evidence-cache, Linear CORE-86): after `init`, `--start` keeps this run's inputs in the
//     git dir and looks up the repository's one cached-red record (entry-gate-cache.mjs); when every bound input is equal
//     it stops with exit 4, spawning nothing. Every miss is a closed member, printed as one line, and the run goes on
//     exactly as before. A `--wait` that decided a verdict then records a cacheable red, or clears the record — after the
//     offer, best-effort like it. A cached red is never offered to /pharn-regress and never stands in for a green. The
//     rule, the key and every bound: entry-gate-cache-core.mjs's header.
//   • OBSERVATIONS (6.48.0, entry-gates-ledger-row): `--start`, the runner, a `--wait` call (and its takeover) and
//     `--abort` each append one line per boundary they already have to `pharn/.run/cost/<name>/entry.jsonl` for the cost
//     ledger — schema, binding and view in entry-observations.mjs's header. Each is written AFTER the control record it
//     describes, best-effort (a failure is one `note —` line on stderr), and read by nothing here: no exit, document,
//     verdict, takeover or abort depends on one. `--peek` appends none, so the ledger cannot tell an early-read stop
//     from a final-read stop; the run's record names the stop either way. Since gate-durations the drain also appends
//     one `gate` line per gate it ran, carrying the duration `run --next` printed, so a killed runner still leaves the
//     time of every gate that finished.
//
// TRUST (P2): gate output is never read (run-gates.mjs reduces it to a sha256). Every value quoted into a detail goes
// through entry-gates-core.mjs `shown` (L62). `ps` output is parsed as integer columns only.

import "./runtime-floor.mjs";
import { randomBytes, createHash } from "node:crypto";
import { mkdirSync, openSync, closeSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { containmentWalk, flag, gitSync, has, lstatSafe, parseBudgetMs, parseTimeoutMs, scanFlags } from "./stage-runtime.mjs";
import { readInProject } from "./regress-base-reuse.mjs";
import { hashFile } from "./reconcile-baseline.mjs";
import { FEATURE_SLUG_RE, validateStamp, baseTestsError, REASON_CODES as RUNNER_REASON_CODES } from "./gate-run-core.mjs";
import { ENTRY_ALGO, productFeatureDir } from "./worktree-fingerprint.mjs";
import { mayStartSlowStep } from "./stage-exit-core.mjs";
import {
  ENTRY_PATHS,
  RUNNER_SCHEMA,
  RESULT_SCHEMA,
  PROGRESS_SCHEMA,
  progressRecordDefect,
  EXIT,
  DIGEST_ABSENT,
  DIGEST_UNHASHABLE,
  runnerRecordDefect,
  resultRecordDefect,
  entryVerdict,
  entryDocument,
  parsePsTable,
  descendantGroups,
  killableGroups,
  listingDiff,
  CHANGES_RECORD,
  inProgressStampView,
  partialGateCount,
  shown,
} from "./entry-gates-core.mjs";
import { changedPaths, defaultTestUniverse } from "./scope-inputs.mjs";
import { badPath } from "./ac-tests-core.mjs";
import { REGRESS_PATHS } from "./stage-regress-core.mjs";
import { publishEntryOffer, discardEntryOffer } from "./entry-base-evidence.mjs";
import { pathDigest, recordEntryChanges, clearEntryChanges } from "./pre-run-snapshot.mjs";
import { cacheableRed, buildRecord, decideCache, gateSet, formatAge } from "./entry-gate-cache-core.mjs";
import {
  captureInputs,
  writeInputs,
  readInputs,
  discardInputs,
  readCache,
  writeCache,
  clearCache,
  treeExcluding,
} from "./entry-gate-cache.mjs";
import { OBS_SCHEMA, recordEntryEvent, currentRunStart, sessionFromEnv } from "./entry-observations.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_GATES = join(HERE, "run-gates.mjs");
const SELF = fileURLToPath(import.meta.url);
const RECORD_MAX_BYTES = 1 << 20;
const STAMP_MAX_BYTES = 1 << 24;
const POLL_MS = 250;
const KILL_GRACE_MS = 2000;
const FEATURE_DIR_MAX_ENTRIES = 10000;
/** The base:test slot's argv budget (grill G5): a longer list is no slot, never an E2BIG that would make the whole entry
 *  check unusable. Regress hands the same list to its BASE and HEAD `test`, so such a project already pays that limit. */
const BASE_TESTS_MAX_ARGV_BYTES = 64 * 1024;

const USAGE =
  "usage: entry-gates.mjs --start [--refresh] --feature <name> --timeout-ms <N> | --wait --feature <name> --budget-ms <B> | --peek --feature <name> | --abort --feature <name>";

/** ---------------------------------------------------------------------------------------------------------------
 *  Small I/O helpers.
 *  ------------------------------------------------------------------------------------------------------------- */
function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writeAtomic(relPath, obj) {
  const tmp = `${relPath}.tmp-${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`);
  renameSync(tmp, relPath);
}

/** A record under the entry root, read lstat-first and never followed: {state: ok|absent|unusable, value?}. */
function readRecord(relPath, maxBytes = RECORD_MAX_BYTES) {
  const r = readInProject(relPath, maxBytes);
  if (r.state !== "ok") return { state: r.state };
  try {
    return { state: "ok", value: JSON.parse(r.bytes.toString("utf8")), bytes: r.bytes };
  } catch {
    return { state: "unusable" };
  }
}

/** The entry root must not traverse a symlink at any component, and nothing but a directory may stand there. */
function rootContained() {
  const cwd = process.cwd();
  const walk = containmentWalk(cwd, join(cwd, ENTRY_PATHS.root));
  if (!walk.ok) return { ok: false, detail: `${ENTRY_PATHS.root}: ${walk.reason}` };
  const st = lstatSafe(ENTRY_PATHS.root);
  if (!st.ok) return { ok: false, detail: `${ENTRY_PATHS.root}: ${st.reason}` };
  if (st.stat !== null && !st.stat.isDirectory()) return { ok: false, detail: `${ENTRY_PATHS.root} is not a directory` };
  return { ok: true };
}

/** sha256 over the run's own product feature directory — `absent`, `unhashable`, or `sha256:<hex>`. A symlink at any
 *  component of `pharn/features/<name>`, a non-regular entry, or more than FEATURE_DIR_MAX_ENTRIES is `unhashable`. */
export function featureDirDigest(feature) {
  const dir = productFeatureDir(feature).replace(/\/$/, "");
  for (const p of ["pharn", "pharn/features", dir]) {
    const s = lstatSafe(p);
    if (!s.ok) return DIGEST_UNHASHABLE;
    if (s.stat === null) return DIGEST_ABSENT;
    if (s.stat.isSymbolicLink() || !s.stat.isDirectory()) return DIGEST_UNHASHABLE;
  }
  const h = createHash("sha256");
  let count = 0;
  const walk = (rel) => {
    let names;
    try {
      names = readdirSync(rel).sort();
    } catch {
      return false;
    }
    for (const name of names) {
      if (++count > FEATURE_DIR_MAX_ENTRIES) return false;
      const p = `${rel}/${name}`;
      const s = lstatSafe(p);
      if (!s.ok || s.stat === null) return false;
      const tag = s.stat.isDirectory() ? "D" : s.stat.isFile() || s.stat.isSymbolicLink() ? "F" : null;
      if (tag === null) return false;
      h.update(`${tag}${p.length}\0${p}\0`);
      if (tag === "D") {
        if (!walk(p)) return false;
      } else {
        const d = hashFile(p);
        if (d === null) return false;
        h.update(`${d}\0`);
      }
    }
    return true;
  };
  return walk(dir) ? `sha256:${h.digest("hex")}` : DIGEST_UNHASHABLE;
}

/** Is `pid` this runner? true / false / null (ps unavailable). Read from `ps -p <pid> -o args=`, never a guess. */
function psShowsNonce(pid, nonce) {
  // `-ww`: never truncate the command line (procps and BSD ps both truncate a piped `args` column without it).
  const r = spawnSync("ps", ["-ww", "-p", String(pid), "-o", "args="], { encoding: "utf8" });
  if (r.error) return null;
  if (r.status !== 0) return false;
  return r.stdout.includes(`--nonce ${nonce}`);
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code === "EPERM";
  }
}

function groupAlive(pgid) {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (e) {
    return e && e.code === "EPERM";
  }
}

function signalGroup(pgid, signal) {
  try {
    process.kill(-pgid, signal);
  } catch {
    /* already gone */
  }
}

/** `ps -A -o pid=,ppid=,pgid=` as rows, or null when ps cannot run. */
function psRows() {
  const ps = spawnSync("ps", ["-A", "-o", "pid=,ppid=,pgid="], { encoding: "utf8", maxBuffer: 1 << 26 });
  return ps.error || ps.status !== 0 ? null : parsePsTable(ps.stdout);
}

const FREEZE_PASSES = 5;

/** Stop a verified runner and every gate it started (review R4). Returns `{killed, unverifiable, how}`, `how` a short,
 *  fixed-vocabulary text; `unverifiable` when the pid is alive but `ps` cannot say whose it is (review R6). */
function killRunner(rec) {
  if (rec.pid === null) return { killed: false, unverifiable: false, how: "no runner process was recorded" };
  const mine = psShowsNonce(rec.pid, rec.nonce);
  if (mine !== true) {
    const unverifiable = mine === null && pidAlive(rec.pid);
    return {
      killed: false,
      unverifiable,
      how: mine === null ? "ps is unavailable, so the recorded pid could not be verified; nothing was signalled" : "no runner is running",
    };
  }
  // Freeze the runner (it starts nothing new), then every descendant group, re-listing until the set is stable.
  signalGroup(rec.pid, "SIGSTOP");
  let rows = psRows();
  let groups = [];
  for (let i = 0; rows !== null && i < FREEZE_PASSES; i++) {
    const next = descendantGroups(rows, rec.pid);
    for (const g of next) if (!groups.includes(g)) signalGroup(g, "SIGSTOP");
    const stable = next.length === groups.length && next.every((g) => groups.includes(g));
    groups = next;
    if (stable) break;
    rows = psRows();
  }
  // TERM + CONT so each gate can handle TERM; then KILL only a survivor that still matches the frozen listing.
  for (const g of groups) {
    signalGroup(g, "SIGTERM");
    signalGroup(g, "SIGCONT");
  }
  const until = Date.now() + KILL_GRACE_MS;
  while (Date.now() < until && groups.some(groupAlive)) sleepMs(50);
  const now = groups.some(groupAlive) ? psRows() : [];
  if (rows !== null && now !== null) for (const g of killableGroups(rows, now, groups)) signalGroup(g, "SIGKILL");
  signalGroup(rec.pid, "SIGKILL");
  const how =
    rows === null
      ? "the runner's group was killed; ps -A failed, so its gates may survive"
      : `the runner and ${groups.length} gate group(s) were stopped`;
  return { killed: true, unverifiable: false, how };
}

/** ---------------------------------------------------------------------------------------------------------------
 *  Observations for the cost ledger (entry-observations.mjs, its header). Best-effort and total: an observation is
 *  written AFTER the control record it describes, never read by anything here, never printed to stdout, and a failed
 *  write is one `note —` line on stderr — no exit, verdict, takeover or abort depends on it.
 *  ------------------------------------------------------------------------------------------------------------- */
function observe(feature, build) {
  try {
    // `build` is a thunk, so every argument (ids, clocks) is computed INSIDE this guard (GATE-2 review).
    recordEntryEvent(feature, { schema: OBS_SCHEMA, ...build(), session_id: sessionFromEnv() });
  } catch {
    /* recordEntryEvent is total; this guards the thunk and the spread */
  }
}

/** The three helpers an observation uses outside `observe` too (a segment id held across a drain, a call's start
 *  time). Each is total: a throw yields null, which `validateEntryEvent` refuses — the event is not written, nothing
 *  else changes. */
const nowIso = () => {
  try {
    return new Date().toISOString();
  } catch {
    return null;
  }
};
const monoNow = () => {
  try {
    return performance.now();
  } catch {
    return null;
  }
};
const monoMs = (t0) => {
  const t = monoNow();
  return t === null || t0 === null ? null : Math.max(0, Math.round(t - t0));
};
const freshId = () => {
  try {
    return randomBytes(8).toString("hex");
  } catch {
    return null;
  }
};

/** A `--wait` exit code back to its document status (EXIT is one-to-one). */
const STATUS_OF_EXIT = Object.freeze(Object.fromEntries(Object.entries(EXIT).map(([s, c]) => [c, s])));

function result(status, feature, nonce, extra = {}) {
  return { schema: RESULT_SCHEMA, status, feature, nonce, ...extra };
}

function unusableResult(feature, nonce, reasonCode, detail, runnerReason = null) {
  return result("unusable", feature, nonce, { reason_code: reasonCode, runner_reason: runnerReason, detail: shown(detail) });
}

function runnerReasonOf(parsed) {
  const c = parsed && typeof parsed === "object" ? parsed.reason_code : null;
  return RUNNER_REASON_CODES.includes(c) ? c : null;
}

function parseJson(s) {
  try {
    return JSON.parse(s || "");
  } catch {
    return null;
  }
}

/** ---------------------------------------------------------------------------------------------------------------
 *  argv
 *  ------------------------------------------------------------------------------------------------------------- */
const MODES = ["--start", "--wait", "--peek", "--abort", "--runner"];
const VALUE_FLAGS = new Set(["--feature", "--timeout-ms", "--budget-ms", "--nonce"]);
const ALLOWED = {
  "--start": ["--feature", "--timeout-ms", "--refresh"],
  "--wait": ["--feature", "--budget-ms"],
  "--peek": ["--feature"],
  "--abort": ["--feature"],
  "--runner": ["--feature", "--timeout-ms", "--nonce"],
};

function parseArgv(args) {
  const modes = args.filter((a) => MODES.includes(a));
  if (modes.length !== 1) return { ok: false, detail: USAGE };
  const mode = modes[0];
  const rest = args.filter((a) => a !== mode);
  const known = new Set(ALLOWED[mode]);
  const scan = scanFlags(rest, known, VALUE_FLAGS);
  if (!scan.ok) return { ok: false, detail: `${scan.detail}; ${USAGE}` };
  for (const f of known) {
    if (VALUE_FLAGS.has(f) && has(rest, f) && flag(rest, f) === undefined) return { ok: false, detail: `${f} requires a value` };
  }
  const feature = flag(rest, "--feature");
  if (feature === undefined || !FEATURE_SLUG_RE.test(feature)) return { ok: false, detail: "--feature must be a plain slug" };
  const out = { ok: true, mode, feature };
  if (mode === "--start" || mode === "--runner") {
    const t = parseTimeoutMs(rest);
    if (!t.ok) return { ok: false, detail: t.detail };
    out.timeoutMs = t.value;
  }
  if (mode === "--start") out.refresh = has(rest, "--refresh");
  if (mode === "--wait") {
    const b = parseBudgetMs(rest);
    if (!b.ok || b.value === null) return { ok: false, detail: b.ok ? "--budget-ms is required" : b.detail };
    out.budgetMs = b.value;
  }
  if (mode === "--runner") {
    const n = flag(rest, "--nonce");
    if (!/^[0-9a-f]{32}$/.test(n ?? "")) return { ok: false, detail: "--nonce must be 32 hex characters" };
    out.nonce = n;
  }
  return out;
}

/** ---------------------------------------------------------------------------------------------------------------
 *  --start
 *  ------------------------------------------------------------------------------------------------------------- */
function refuse(code, detail) {
  process.stderr.write(`entry-gates: refused ${code} — ${shown(detail)}\n`);
  return EXIT.unusable;
}

/** `--start`, observed: one `start` event once the invocation exists (a nonce was created) and its outcome is known.
 *  A refusal before the nonce (path-containment, runner-unverifiable) creates no invocation and records nothing. The run
 *  it belongs to is the current run-start read HERE, at entry (entry-observations.mjs `currentRunStart`). */
function start(args) {
  const t0 = monoNow();
  const ts = nowIso();
  const run = currentRunStart(args.feature);
  const obs = { nonce: null, outcome: null };
  const code = startRun(args, obs);
  if (obs.nonce !== null && obs.outcome !== null) {
    observe(args.feature, () => ({
      event: "start",
      nonce: obs.nonce,
      run,
      ts,
      end_ts: nowIso(),
      elapsed_ms: monoMs(t0),
      outcome: obs.outcome,
    }));
  }
  return code;
}

function startRun({ feature, timeoutMs, refresh = false }, obs) {
  const contained = rootContained();
  if (!contained.ok) return refuse("path-containment", contained.detail);
  const prior = readRecord(ENTRY_PATHS.runner);
  let superseded = null;
  if (prior.state === "ok" && runnerRecordDefect(prior.value) === null) {
    const k = killRunner(prior.value);
    if (k.unverifiable) {
      return refuse(
        "runner-unverifiable",
        `an earlier runner's pid ${prior.value.pid} is alive but ps cannot verify it; nothing was wiped — stop it, or remove ${ENTRY_PATHS.root}, then start again`
      );
    }
    if (k.killed) superseded = k.how;
  }
  rmSync(ENTRY_PATHS.root, { recursive: true, force: true });
  mkdirSync(ENTRY_PATHS.root, { recursive: true });
  if (!clearEntryChanges())
    return refuse("path-containment", "an earlier run's entry-gate changes record in the git dir could not be removed");
  // 6.49.0: an earlier run's offer names that run's marker and stamp, so a leftover can only MISS; removed anyway (L66).
  discardEntryOffer();
  // gate-evidence-cache: an earlier run's start-time inputs name that run's nonce, so a leftover can only fail to bind.
  discardInputs();

  const measuredAt = nowIso();
  const nonce = randomBytes(16).toString("hex");
  const rec = { schema: RUNNER_SCHEMA, feature, nonce, pid: null, timeout_ms: timeoutMs, d0: featureDirDigest(feature) };
  writeAtomic(ENTRY_PATHS.runner, rec);
  obs.nonce = nonce;

  const initArgs = ["init", "--stage", "entry", "--feature", feature, "--out", ENTRY_PATHS.gates];
  if (lstatSafe("package.json").stat) {
    initArgs.push("--discover", "package.json");
    if (writeBaseTests()) initArgs.push("--base-tests", ENTRY_PATHS.baseTests);
  }
  const init = spawnSync(process.execPath, [RUN_GATES, ...initArgs], { encoding: "utf8" });
  const parsed = parseJson(init.stdout);
  if (init.status === 3) {
    writeAtomic(ENTRY_PATHS.result, result("no-gates", feature, nonce, { detail: shown(parsed ? parsed.reason : "no gates") }));
    process.stdout.write(`entry-gates: no gates to run for '${feature}' — ${shown(parsed ? parsed.reason : "")}\n`);
    obs.outcome = "no-gates";
    return EXIT["no-gates"];
  }
  if (init.status !== 0 || parsed === null) {
    const detail = `run-gates.mjs init --stage entry refused: ${parsed ? parsed.reason : init.stderr || init.stdout}`;
    writeAtomic(ENTRY_PATHS.result, unusableResult(feature, nonce, "child-refused", detail, runnerReasonOf(parsed)));
    obs.outcome = "init-refused";
    return refuse("child-refused", detail);
  }

  // gate-evidence-cache: this run's inputs go to the git dir whatever happens next (a `--refresh` run still records its
  // result), then the lookup. A hit stops here — no runner, no gate, no offer (discarded above).
  const cached = cacheLookup({ feature, nonce, timeoutMs, refresh, measuredAt });
  if (cached.hit) {
    const detail =
      `${cached.red.join(", ")} red on this tree in run '${cached.source.feature}' ` +
      `(its gates started ${cached.source.measured_at}, ${formatAge(cached.ageMs)} ago)`;
    writeAtomic(ENTRY_PATHS.result, unusableResult(feature, nonce, "cached-red", detail));
    obs.outcome = "cached-red";
    process.stdout.write(
      `entry-gates: red on cached evidence for '${feature}' — ${shown(detail)}; no gate was run. ` +
        "Fix the gate (a changed tree measures again), or re-run with --refresh to measure again\n"
    );
    return EXIT.red;
  }
  process.stdout.write(`entry-gates: cached evidence — miss ${cached.miss}\n`);

  let child;
  let fd;
  try {
    fd = openSync(ENTRY_PATHS.log, "a");
    child = spawn(process.execPath, [SELF, "--runner", "--nonce", nonce, "--feature", feature, "--timeout-ms", String(timeoutMs)], {
      cwd: process.cwd(),
      detached: true,
      stdio: ["ignore", fd, fd],
    });
  } catch (e) {
    writeAtomic(ENTRY_PATHS.result, unusableResult(feature, nonce, "spawn-failed", e && e.code ? e.code : "spawn failed"));
    obs.outcome = "spawn-failed";
    return refuse("spawn-failed", e && e.code ? e.code : "spawn failed");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  if (!Number.isInteger(child.pid)) {
    writeAtomic(ENTRY_PATHS.result, unusableResult(feature, nonce, "spawn-failed", "the runner has no pid"));
    obs.outcome = "spawn-failed";
    return refuse("spawn-failed", "the runner has no pid");
  }
  child.unref();
  writeAtomic(ENTRY_PATHS.runner, { ...rec, pid: child.pid });
  obs.outcome = "started";
  const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
  process.stdout.write(
    `entry-gates: started ${ids.length} gate(s) for '${feature}' in the background (${ids.join(", ")})` +
      `${superseded ? `; an earlier runner was superseded: ${superseded}` : ""}\n`
  );
  return 0;
}

/** The base:test slot's list (6.49.0): regress's default test universe minus the paths changed since HEAD — what
 *  /pharn-regress would hand its BASE `test` if the build changed no pre-existing test file. Written to
 *  ENTRY_PATHS.baseTests; returns false (no slot) on ANY problem, so this list can never make the entry check unusable. */
function writeBaseTests() {
  try {
    const leftover = lstatSafe(REGRESS_PATHS.legacyBase); // a pre-6.50 nested checkout; regress no longer creates one
    if (!leftover.ok || leftover.stat !== null) return false;
    const head = headSha();
    if (head === null) return false;
    const universe = defaultTestUniverse();
    const changed = changedPaths(head);
    if (!universe.ok || !changed.ok) return false;
    const inside = new Set(changed.value);
    const list = universe.value.filter((t) => !inside.has(t));
    if (baseTestsError(list) !== null || list.some((t) => badPath(t) !== null)) return false;
    if (list.reduce((n, t) => n + Buffer.byteLength(t) + 1, 0) > BASE_TESTS_MAX_ARGV_BYTES) return false;
    writeAtomic(ENTRY_PATHS.baseTests, list);
    return true;
  } catch {
    return false;
  }
}

/** ---------------------------------------------------------------------------------------------------------------
 *  Cached red evidence (gate-evidence-cache) — the rule is entry-gate-cache-core.mjs's header.
 *  ------------------------------------------------------------------------------------------------------------- */
/** `--start`'s lookup, after `init` wrote its state: capture and store this run's inputs, then decide. Returns
 *  `{hit: true, source, ageMs, red}` or `{hit: false, miss}`. Never throws: anything that cannot be read or computed is
 *  a miss, so the gates run exactly as before. */
function cacheLookup({ feature, nonce, timeoutMs, refresh, measuredAt }) {
  try {
    const inputs = captureInputs({ feature, nonce, timeoutMs, measuredAt });
    if (inputs !== null) {
      const w = writeInputs(inputs);
      if (!w.ok) process.stderr.write(`entry-gates: note — this run's inputs could not be kept for the cached evidence (${w.why})\n`);
    }
    if (refresh) return { hit: false, miss: "refresh" };
    const read = readCache();
    const state = readRecord(ENTRY_PATHS.state, STAMP_MAX_BYTES);
    const gates = state.state === "ok" ? gateSet(state.value.entries) : null;
    const head = state.state === "ok" ? state.value.head : null;
    const initTree =
      state.state === "ok" && state.value.fingerprint && typeof state.value.fingerprint === "object"
        ? { algo: state.value.fingerprint.algo, digest: state.value.fingerprint.init }
        : null;
    const live =
      inputs === null || gates === null || initTree === null
        ? null
        : {
            node: inputs.node,
            prefix: inputs.prefix,
            timeout_ms: timeoutMs,
            exclude: inputs.exclude,
            install: inputs.install,
            gates,
            head,
          };
    return decideCache({
      refresh: false,
      read,
      live,
      treeFor: (src) => (src === feature ? initTree : treeExcluding(feature, src)),
      nowMs: Date.now(),
    });
  } catch {
    return { hit: false, miss: "inputs-unavailable" };
  }
}

/** `--wait`'s step after a decided verdict: record a cacheable red, or clear the slot. Best-effort and silent on success,
 *  exactly as the offer is (a test pins that a successful `--wait` prints nothing on stderr): a failure is one `note —`
 *  line, never a change to the document, the exit or any record. The next `--start` names the hit or its miss. A clear
 *  only ever removes a hit. Returns what it did — `{done: "recorded" | "cleared" | "failed", why}` — for its tests. */
function cacheAfterVerdict(feature, runnerRec, verdict, stamp) {
  try {
    const read = readInputs();
    const inputs = read.state === "ok" ? read.value : null;
    const c = cacheableRed({ verdict, stamp, inputs, nonce: runnerRec.nonce, feature });
    const record = c.cacheable ? buildRecord({ inputs, stamp, red: c.red }) : null;
    if (record !== null) {
      const w = writeCache(record);
      if (w.ok) return { done: "recorded", why: null };
      process.stderr.write(`entry-gates: note — the red could not be cached for later runs (${w.why})\n`);
      return { done: "failed", why: w.why };
    }
    const r = clearCache();
    if (r.ok) return { done: "cleared", why: c.cacheable ? "gates-unbound" : c.why };
    process.stderr.write(`entry-gates: note — the cached evidence could not be cleared (${r.why})\n`);
    return { done: "failed", why: r.why };
  } catch {
    process.stderr.write("entry-gates: note — the cached evidence could not be updated (crashed)\n");
    return { done: "failed", why: "crashed" };
  }
}

/** ---------------------------------------------------------------------------------------------------------------
 *  --runner (internal)
 *  ------------------------------------------------------------------------------------------------------------- */
/** The feature-directory digests recorded so far for THIS run (nonce + feature bound), or [] — a progress record that
 *  is absent, unreadable or another run's yields none, so a style red it would have attributed reads `unattributed`
 *  (the direction that never stops a run). */
function readProgress(feature, nonce) {
  const p = readRecord(ENTRY_PATHS.progress);
  if (p.state !== "ok" || progressRecordDefect(p.value) !== null) return { featureDir: [], gateChanges: [] };
  return p.value.nonce === nonce && p.value.feature === feature
    ? { featureDir: p.value.feature_dir, gateChanges: p.value.gate_changes }
    : { featureDir: [], gateChanges: [] };
}

/** The changed-since-HEAD paths outside the run's feature directory, each with its `pathDigest` (review R1), or null
 *  when git cannot list them (the gate's changes are then not recorded — they read as escapes, the safe direction). */
function changedListing(feature, head) {
  if (head === null) return null;
  const c = changedPaths(head);
  if (!c.ok) return null;
  const dir = productFeatureDir(feature);
  return new Map(c.value.filter((p) => !p.startsWith(dir)).map((p) => [p, pathDigest(p)]));
}

function headSha() {
  const r = gitSync(["rev-parse", "--verify", "--quiet", "HEAD"]);
  const s = r.ok ? r.stdout.trim() : "";
  return /^[0-9a-f]{40}$/.test(s) ? s : null;
}

/** Replace or append the entry for `id` in a list of `{id, …}` (a stale-lock re-run of the same gate replaces it). */
function upsert(list, entry) {
  const i = list.findIndex((x) => x.id === entry.id);
  if (i === -1) list.push(entry);
  else list[i] = entry;
}

/** The ONE drain the runner and a `--wait` takeover share: one `run-gates.mjs run --next` per gate; around each, the
 *  feature directory's digest and the changed-path listing; both persisted to progress.json after every gate (a takeover
 *  keeps them). `budget.may()` gates every gate. Returns `{kind: done, featureDir, gateChanges}` · `{kind: budget}` ·
 *  `{kind: refused, detail, runnerReason}`. After each gate that ran, one `gate` observation for the cost ledger names
 *  `segment` (the calling process's) and the duration `run --next` printed — best-effort, after progress.json, read by
 *  nothing here; a printed value that is not an integer writes no event. */
function drainEntry({ feature, nonce, segment, timeoutMs, budget, counter = { ran: 0 } }) {
  const { featureDir, gateChanges } = readProgress(feature, nonce);
  const head = headSha();
  for (;;) {
    if (!budget.may()) return { kind: "budget" };
    const before = featureDirDigest(feature);
    const listBefore = changedListing(feature, head);
    const r = spawnSync(process.execPath, [RUN_GATES, "run", "--next", "--out", ENTRY_PATHS.gates, "--timeout-ms", String(timeoutMs)], {
      encoding: "utf8",
    });
    const after = featureDirDigest(feature);
    const listAfter = changedListing(feature, head);
    const parsed = parseJson(r.stdout);
    if (r.status === 3) return { kind: "done", featureDir, gateChanges };
    if (r.status !== 0 || parsed === null) {
      return {
        kind: "refused",
        detail: `run-gates.mjs run --next refused: ${parsed ? parsed.reason : r.stderr || r.stdout}`,
        runnerReason: runnerReasonOf(parsed),
      };
    }
    budget.spent();
    if (typeof parsed.ran === "string") {
      counter.ran++;
      upsert(featureDir, { id: parsed.ran, before, after });
      const paths = listBefore !== null && listAfter !== null ? listingDiff(listBefore, listAfter, (p) => pathDigest(p)) : [];
      upsert(gateChanges, { id: parsed.ran, paths });
      writeAtomic(ENTRY_PATHS.progress, { schema: PROGRESS_SCHEMA, feature, nonce, feature_dir: featureDir, gate_changes: gateChanges });
      if (Number.isSafeInteger(parsed.duration_ms)) {
        observe(feature, () => ({ event: "gate", nonce, segment, id: parsed.ran, ts: nowIso(), duration_ms: parsed.duration_ms }));
      }
    }
    if (parsed.finalized || parsed.remaining === 0) return { kind: "done", featureDir, gateChanges };
  }
}

/** Write the run's result LAST: `done` bound to the stamp's bytes, or `unusable` when no readable stamp exists. */
function finalizeResult(feature, nonce, featureDir, gateChanges) {
  const stamp = readInProject(ENTRY_PATHS.stamp, STAMP_MAX_BYTES);
  if (stamp.state !== "ok") {
    writeAtomic(
      ENTRY_PATHS.result,
      unusableResult(feature, nonce, "stamp-invalid", "the gates finished but no readable stamp.json exists")
    );
    return;
  }
  const sha = createHash("sha256").update(stamp.bytes).digest("hex");
  writeAtomic(
    ENTRY_PATHS.result,
    result("done", feature, nonce, { stamp_sha256: sha, feature_dir: featureDir, gate_changes: gateChanges })
  );
}

function runner({ feature, timeoutMs, nonce }) {
  const rec = readRecord(ENTRY_PATHS.runner);
  if (rec.state !== "ok" || runnerRecordDefect(rec.value) !== null || rec.value.nonce !== nonce || rec.value.feature !== feature) {
    process.stderr.write("entry-gates --runner: no runner record names this nonce; nothing was run\n");
    return EXIT.unusable;
  }
  // One execution segment: its begin first, its end only AFTER result.json (the control record never waits on it). A
  // runner killed between the two leaves the segment incomplete — reported as such, never given an end.
  const segment = freshId();
  const t0 = monoNow();
  const counter = { ran: 0 };
  observe(feature, () => ({ event: "segment-begin", nonce, segment, kind: "runner", ts: nowIso() }));
  const ended = (end) =>
    observe(feature, () => ({
      event: "segment-end",
      nonce,
      segment,
      kind: "runner",
      ts: nowIso(),
      elapsed_ms: monoMs(t0),
      end,
      gates: counter.ran,
    }));
  try {
    const d = drainEntry({ feature, nonce, segment, timeoutMs, budget: { may: () => true, spent: () => {} }, counter });
    if (d.kind === "refused") {
      writeAtomic(ENTRY_PATHS.result, unusableResult(feature, nonce, "child-refused", d.detail, d.runnerReason));
      ended("refused");
      return EXIT.unusable;
    }
    finalizeResult(feature, nonce, d.featureDir, d.gateChanges);
    ended("done");
    return 0;
  } catch (e) {
    writeAtomic(
      ENTRY_PATHS.result,
      unusableResult(feature, nonce, "crashed", e && e.message ? e.message.split("\n")[0] : "a thrown value")
    );
    ended("crashed");
    return EXIT.unusable;
  }
}

/** ---------------------------------------------------------------------------------------------------------------
 *  --wait
 *  ------------------------------------------------------------------------------------------------------------- */
function emitDoc(fields) {
  const doc = entryDocument(fields);
  process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
  return EXIT[doc.status];
}

function unusableDoc(feature, reasonCode, detail, runnerReason = null) {
  return emitDoc({ status: "unusable", feature, reasonCode, runnerReason, detail });
}

/** The checks and the verdict over a bound `done` result, with no side effect (7.5.0: `--peek` and `--wait` share it —
 *  one decision path, L35). Returns `{ok: false, reasonCode, detail}` or `{ok: true, verdict, stamp}` (`stamp` the
 *  record read: `{value, bytes}`). */
function decideResult(feature, runnerRec, res) {
  const stamp = readRecord(ENTRY_PATHS.stamp, STAMP_MAX_BYTES);
  if (stamp.state !== "ok") return { ok: false, reasonCode: "stamp-invalid", detail: "the result names a stamp that is not readable" };
  const sha = createHash("sha256").update(stamp.bytes).digest("hex");
  if (sha !== res.stamp_sha256)
    return { ok: false, reasonCode: "result-unbound", detail: "the stamp's sha256 is not the one the result names" };
  const v = validateStamp(stamp.value, { stage: "entry", feature });
  if (!v.ok) return { ok: false, reasonCode: "stamp-invalid", detail: `${v.reason_code}: ${v.reason}` };
  if (stamp.value.fingerprint.algo !== ENTRY_ALGO)
    return { ok: false, reasonCode: "stamp-invalid", detail: "the stamp's fingerprint algo is not the entry algo" };
  const verdict = entryVerdict({ stamp: stamp.value, featureDir: res.feature_dir, d0: runnerRec.d0, gateChanges: res.gate_changes });
  return { ok: true, verdict, stamp };
}

/** Decide over a bound `done` result, then perform `--wait`'s two effects (the changes record, the offer). */
function decideDone(feature, runnerRec, res) {
  const decided = decideResult(feature, runnerRec, res);
  if (!decided.ok) return unusableDoc(feature, decided.reasonCode, decided.detail);
  const { verdict, stamp } = decided;
  // Review R1: the paths a `mutated` gate changed go beside the pre-run snapshot, bound to the open run, so the
  // partition reports them rather than counting them as the build's escape. Rewritten on every decision of the run.
  let changesRecord = "none";
  if (verdict.changed.length) {
    const w = recordEntryChanges(feature, verdict.changed);
    changesRecord = w.ok ? "recorded" : CHANGES_RECORD.includes(w.code) ? w.code : "write-failed";
  }
  // 6.49.0: every check above passed and the verdict is green, red or unmeasured — offer this completed run to /pharn-regress as
  // BASE evidence, bound to the stamp bytes just validated and the open run marker. Best-effort: no exit, document or
  // record depends on it; without an open delivery run there is nothing to bind and nothing is said.
  const offered = publishEntryOffer({
    feature,
    nonce: runnerRec.nonce,
    stampBytes: stamp.bytes,
    base: stamp.value.head,
    timeoutMs: runnerRec.timeout_ms,
    d0: runnerRec.d0,
    featureDir: res.feature_dir,
  });
  if (!offered.published && offered.why !== "no-delivery-run") {
    process.stderr.write(`entry-gates: note — the entry evidence could not be offered to /pharn-regress (${offered.why})\n`);
  }
  // gate-evidence-cache: a cacheable red is kept for later runs on this tree; any other decided verdict clears the slot.
  cacheAfterVerdict(feature, runnerRec, verdict, stamp.value);
  return emitDoc({ status: verdict.status, feature, verdict, changesRecord });
}

/** A bound result whose status is not `done` → its document (and exit); a `done` result → null. */
function settledResult(feature, value) {
  if (value.status === "no-gates") return emitDoc({ status: "no-gates", feature, detail: value.detail });
  if (value.status === "aborted") return unusableDoc(feature, "aborted", "the entry run was aborted");
  if (value.status === "unusable") return unusableDoc(feature, value.reason_code, value.detail, value.runner_reason);
  return null;
}

/** The runner record `--wait` and `--peek` both require: `{ok: true, value}` or `{ok: false, code}` after printing the
 *  `unusable` document. */
function boundRunner(feature) {
  const rr = readRecord(ENTRY_PATHS.runner);
  if (rr.state !== "ok")
    return { ok: false, code: unusableDoc(feature, "no-runner", `no readable ${ENTRY_PATHS.runner}: run --start first`) };
  const defect = runnerRecordDefect(rr.value);
  if (defect !== null) return { ok: false, code: unusableDoc(feature, "no-runner", `${ENTRY_PATHS.runner} ${defect}`) };
  if (rr.value.feature !== feature)
    return { ok: false, code: unusableDoc(feature, "no-runner", `${ENTRY_PATHS.runner} names another feature`) };
  return { ok: true, value: rr.value };
}

/** `ctx` (optional) collects what the call's `wait` observation needs: the nonce of the runner record it last read for
 *  this feature, and the id of a takeover segment it ran. Nothing in this function reads `ctx` back. */
function wait({ feature, budgetMs }, ctx = null) {
  const t0 = Date.now();
  const contained = rootContained();
  if (!contained.ok) return unusableDoc(feature, "path-containment", contained.detail);
  for (;;) {
    const rr = boundRunner(feature);
    if (!rr.ok) return rr.code;
    if (ctx) ctx.nonce = rr.value.nonce;

    const res = readRecord(ENTRY_PATHS.result);
    if (res.state === "unusable") return unusableDoc(feature, "result-unbound", `${ENTRY_PATHS.result} is not a readable JSON file`);
    if (res.state === "ok") {
      const d = resultRecordDefect(res.value);
      if (d !== null) return unusableDoc(feature, "result-unbound", `${ENTRY_PATHS.result} ${d}`);
      if (res.value.nonce !== rr.value.nonce || res.value.feature !== feature) {
        return unusableDoc(feature, "result-unbound", "the result belongs to another runner");
      }
      const settled = settledResult(feature, res.value);
      if (settled !== null) return settled;
      return decideDone(feature, rr.value, res.value);
    }
    // No result yet: the runner must still be there.
    const pid = rr.value.pid;
    const mine = pid === null ? false : psShowsNonce(pid, rr.value.nonce);
    const alive = pid !== null && pidAlive(pid) && mine !== false;
    if (!alive) {
      if (readRecord(ENTRY_PATHS.result).state === "ok") continue; // finished between the two reads
      // TAKEOVER: the runner is gone with no result (a harness that kills a Bash call's descendants, a crash). Run what
      // is left in the foreground, through the SAME drain, within this call's budget — never the model's job.
      const inProgress = lstatSafe(ENTRY_PATHS.state).stat !== null || lstatSafe(ENTRY_PATHS.stamp).stat !== null;
      if (!inProgress)
        return unusableDoc(feature, "runner-died", "no result was written, no runner is running, and no gate run is in progress");
      let steps = Date.now() - t0 > POLL_MS ? 1 : 0; // a call that already waited gets no free first step
      const budget = {
        may: () =>
          mayStartSlowStep({ elapsedMs: Date.now() - t0, timeoutMs: rr.value.timeout_ms, budgetMs, slowStepsThisInvocation: steps }),
        spent: () => {
          steps++;
        },
      };
      // A takeover is its own execution segment, INSIDE this wait call (never added to the call's duration). A throw
      // from the drain writes no result and no end: the segment reads incomplete.
      const segment = freshId();
      const s0 = monoNow();
      const counter = { ran: 0 };
      if (ctx) ctx.takeover = segment;
      observe(feature, () => ({ event: "segment-begin", nonce: rr.value.nonce, segment, kind: "takeover", ts: nowIso() }));
      const ended = (end) =>
        observe(feature, () => ({
          event: "segment-end",
          nonce: rr.value.nonce,
          segment,
          kind: "takeover",
          ts: nowIso(),
          elapsed_ms: monoMs(s0),
          end,
          gates: counter.ran,
        }));
      const d = drainEntry({ feature, nonce: rr.value.nonce, segment, timeoutMs: rr.value.timeout_ms, budget, counter });
      if (d.kind === "budget") {
        ended("budget");
        return emitDoc({ status: "continue", feature, detail: "the background runner is gone; this line is running the gates itself" });
      }
      if (d.kind === "refused") {
        writeAtomic(ENTRY_PATHS.result, unusableResult(feature, rr.value.nonce, "child-refused", d.detail, d.runnerReason));
        ended("refused");
      } else {
        finalizeResult(feature, rr.value.nonce, d.featureDir, d.gateChanges);
        ended("done");
      }
      continue; // the result now exists: read it like any other
    }
    if (Date.now() - t0 + POLL_MS > budgetMs) return emitDoc({ status: "continue", feature, detail: "the gates are still running" });
    sleepMs(POLL_MS);
  }
}

/** ---------------------------------------------------------------------------------------------------------------
 *  --peek (7.5.0, entry-verdict-early-read)
 *  ------------------------------------------------------------------------------------------------------------- */
/** One read, never a wait, never a takeover, never a write. A bound finished result is decided exactly as `--wait`
 *  decides it (`decideResult`); with none, the gates finished so far are decided, and only a RED is a verdict
 *  (entry-gates-core.mjs header, "THE EARLY READ"). Everything else is `continue`: the final `--wait` decides. */
function peek({ feature }) {
  const contained = rootContained();
  if (!contained.ok) return unusableDoc(feature, "path-containment", contained.detail);
  const rr = boundRunner(feature);
  if (!rr.ok) return rr.code;
  const res = readRecord(ENTRY_PATHS.result);
  if (res.state === "unusable") return unusableDoc(feature, "result-unbound", `${ENTRY_PATHS.result} is not a readable JSON file`);
  if (res.state === "ok") {
    const d = resultRecordDefect(res.value);
    if (d !== null) return unusableDoc(feature, "result-unbound", `${ENTRY_PATHS.result} ${d}`);
    if (res.value.nonce !== rr.value.nonce || res.value.feature !== feature) {
      return unusableDoc(feature, "result-unbound", "the result belongs to another runner");
    }
    const settled = settledResult(feature, res.value);
    if (settled !== null) return settled;
    const decided = decideResult(feature, rr.value, res.value);
    if (!decided.ok) return unusableDoc(feature, decided.reasonCode, decided.detail);
    return emitDoc({
      status: decided.verdict.status,
      feature,
      verdict: decided.verdict,
      changesRecord: "deferred",
      detail: "decided over the finished result; the final --wait records the gates' changes",
    });
  }
  const partial = partialVerdict(feature, rr.value);
  if (partial !== null && partial.verdict.status === "red") {
    return emitDoc({
      status: "red",
      feature,
      verdict: partial.verdict,
      changesRecord: "deferred",
      detail: `decided over ${partial.ran} of ${partial.total} gates; the rest are still running`,
    });
  }
  return emitDoc({ status: "continue", feature, detail: "no red gate yet; the gates are still running" });
}

/** The verdict over the gates finished so far, or null: the in-progress record through `inProgressStampView` and the
 *  SAME `validateStamp` + ENTRY_ALGO, the progress digests bound to the runner record's nonce (`readProgress`). Any
 *  record that is absent, unreadable, refused or not this run's is null (→ `continue`). */
function partialVerdict(feature, runnerRec) {
  const state = readRecord(ENTRY_PATHS.state, STAMP_MAX_BYTES);
  if (state.state !== "ok") return null;
  const view = inProgressStampView(state.value);
  if (view === null) return null;
  const v = validateStamp(view, { stage: "entry", feature });
  if (!v.ok || view.fingerprint.algo !== ENTRY_ALGO) return null;
  const { featureDir, gateChanges } = readProgress(feature, runnerRec.nonce);
  const verdict = entryVerdict({ stamp: view, featureDir, d0: runnerRec.d0, gateChanges });
  return { verdict, ...partialGateCount(state.value) };
}

/** ---------------------------------------------------------------------------------------------------------------
 *  --abort
 *  ------------------------------------------------------------------------------------------------------------- */
function abort({ feature }) {
  const contained = rootContained();
  if (!contained.ok) {
    process.stdout.write(`entry-gates: nothing aborted — ${shown(contained.detail)}\n`);
    return 0;
  }
  const rr = readRecord(ENTRY_PATHS.runner);
  if (rr.state !== "ok" || runnerRecordDefect(rr.value) !== null) {
    process.stdout.write("entry-gates: nothing to abort (no runner record)\n");
    return 0;
  }
  if (rr.value.feature !== feature) {
    process.stdout.write(`entry-gates: nothing aborted — the runner record names another feature\n`);
    return 0;
  }
  const k = killRunner(rr.value);
  let wroteResult = false;
  if (k.killed && readRecord(ENTRY_PATHS.result).state === "absent") {
    writeAtomic(ENTRY_PATHS.result, result("aborted", feature, rr.value.nonce));
    wroteResult = true;
  }
  process.stdout.write(`entry-gates: abort for '${feature}' — ${k.how}\n`);
  // `ts` is taken after the kill and the result write, so an abort that ended the invocation ends it at this moment.
  observe(feature, () => ({
    event: "abort",
    nonce: rr.value.nonce,
    call: freshId(),
    ts: nowIso(),
    stopped: k.killed,
    wrote_result: wroteResult,
  }));
  return 0;
}

/** The CLI. Returns the exit code. */
export function main(argv) {
  const a = parseArgv(argv.slice(2));
  if (!a.ok) {
    if (argv.includes("--wait") || argv.includes("--peek")) {
      const f = flag(argv, "--feature");
      return unusableDoc(FEATURE_SLUG_RE.test(f ?? "") ? f : null, "usage-error", a.detail);
    }
    return refuse("usage-error", a.detail);
  }
  if (a.mode === "--wait") return observedWait(a);
  if (a.mode === "--peek") {
    try {
      return peek(a);
    } catch (e) {
      return unusableDoc(a.feature, "crashed", e && e.message ? e.message.split("\n")[0] : "a thrown value");
    }
  }
  try {
    if (a.mode === "--start") return start(a);
    if (a.mode === "--runner") return runner(a);
    return abort(a);
  } catch (e) {
    return refuse("crashed", e && e.message ? e.message.split("\n")[0] : "a thrown value");
  }
}

/** One `--wait` call, observed: its document and exit first, then ONE `wait` event (status read back from the exit
 *  code). A call that never read a runner record for this feature has no invocation to bind to and records nothing. */
function observedWait(a) {
  const t0 = monoNow();
  const ts = nowIso();
  const ctx = { nonce: null, takeover: null };
  let code;
  try {
    code = wait(a, ctx);
  } catch (e) {
    code = unusableDoc(a.feature, "crashed", e && e.message ? e.message.split("\n")[0] : "a thrown value");
  }
  if (ctx.nonce !== null && Object.hasOwn(STATUS_OF_EXIT, code)) {
    observe(a.feature, () => ({
      event: "wait",
      nonce: ctx.nonce,
      call: freshId(),
      ts,
      end_ts: nowIso(),
      elapsed_ms: monoMs(t0),
      status: STATUS_OF_EXIT[code],
      takeover: ctx.takeover,
    }));
  }
  return code;
}

if (import.meta.main) process.exitCode = main(process.argv);
