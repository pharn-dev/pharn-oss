#!/usr/bin/env node
// pharn/floor/entry-gates.mjs — a delivery run's ENTRY check (loop-entry-preflight, 6.42.0): the gate set /pharn-verify
// will discover, run ONCE on the tree the run starts from, in a detached background runner, while /pharn-spec,
// /pharn-plan and /pharn-grill work; its verdict is read just before /pharn-test. The rule — what counts as red, and why
// — is entry-gates-core.mjs's header; this file reads and writes the disk and runs the processes (P3).
//
// ================================ THE CLI — three pinned lines ================================
//   node pharn/floor/entry-gates.mjs --start --feature <name> --timeout-ms <N>
//   node pharn/floor/entry-gates.mjs --wait --feature <name> --budget-ms <B>
//   node pharn/floor/entry-gates.mjs --abort --feature <name>
// /pharn-loop: `--start` is Step 1a's last line, `--wait` runs between the grill and the test stage, `--abort` runs first
// at every stop. /pharn-ship: `--start` after its pre-run snapshot, the same `--wait` point, `--abort` at every STOP.
//
// --start  supersedes an earlier runner of this tree (one per tree, L38: `--abort` first), wipes `.pharn/pharn-entry/`
//          (containment-walked; a symlink at any component refuses — L54), records `runner.json` with a fresh nonce
//          BEFORE anything else (pid null), runs `run-gates.mjs init --stage entry` synchronously, then spawns the
//          runner (`detached`, so `setsid`: it outlives the Bash call — measured — and has its own process group) and
//          rewrites the record with its pid. Exit 0 started · 3 no gates (a `no-gates` result is recorded, no runner) ·
//          2 refused (`entry-gates: refused <reason> — …` on stderr; a runner refusal records an `unusable` result).
// --runner INTERNAL. Refuses unless `runner.json` names its nonce and feature. One `run-gates.mjs run --next` per gate,
//          the feature-directory digest before and after each, then `result.json` LAST (tmp + rename), carrying the
//          nonce, the stamp's sha256 and the per-gate digests. Any error writes an `unusable` result instead.
// --wait   blocks inside node (never a model poll) up to --budget-ms. It reads ONLY a `result.json` carrying the nonce
//          and feature of the `runner.json` in place (L66 — a directory `--start` created empty, a file the runner
//          writes last), re-reads the stamp, requires its sha256 to be the result's, `validateStamp(…, {stage:
//          "entry", feature})` and ENTRY_ALGO, and decides with `entryVerdict`. No result + runner alive → keep waiting,
//          or exit 5 when the budget is spent. No result + runner GONE (a harness that kills a Bash call's descendants,
//          a crash) → TAKEOVER: it runs what is left in the foreground through the SAME drain (`drainEntry`; the digests
//          so far come from progress.json), within its budget (stage-exit-core.mjs mayStartSlowStep), and exits 5 to be
//          re-run when out of it; with no gate run in progress at all → `runner-died`. Prints ONE JSON document
//          (entry-gates-core.mjs DOC_SCHEMA). Exit 0 green · 4 red · 3 no-gates · 5 continue · 2 unusable.
// --abort  a no-op (exit 0) when no runner record exists, it names another feature, or its pid is not this runner's.
//          Otherwise: SIGSTOP the runner's process group (so it starts nothing new), snapshot `ps -A -o
//          pid=,ppid=,pgid=`, SIGTERM every descendant's process group (each gate is its own group — run-gates.mjs
//          spawnGate), SIGKILL the runner's group, SIGKILL any survivor after a grace, record an `aborted` result.
//          No signal is sent until `ps -ww -p <pid> -o args=` shows this runner's nonce, so a reused pid is never
//          signalled. Its exit never changes the stop it runs at.
//
// ================================ BOUNDS, NAMED ================================
//   • A process a gate starts with its own `setsid` leaves that gate's group and survives `--abort` (run-gates.mjs's own
//     bound). With no `ps` on PATH, `--abort` kills only the runner's group and says so; `--wait` then reads a live pid
//     as alive.
//   • An orchestrator that dies without a stop leaves the runner to finish its gates (each bounded by --timeout-ms);
//     the next `--start` in the tree supersedes it.
//   • A front-stage write OUTSIDE `pharn/features/<name>/` while the gates run: landing BETWEEN two gates it is a tree
//     change between gates — run-gates refuses (`tree-changed-between-gates`) and the result is `unusable
//     child-refused` with that `runner_reason`; landing DURING a gate it marks that gate `mutated`, which the document
//     lists (run-gates records a gate's own tree change the same way). Writes inside the feature directory are
//     neither: the entry fingerprint excludes it (worktree-fingerprint.mjs ENTRY_ALGO).
//   • Everything under `.pharn/pharn-entry/` is ordinary `.pharn/` state a Bash writer reaches (L19, L43): agreement
//     between the stamp, its digest and the result is checked, never provenance. The runner's writes are `fs` writes
//     outside fix #7, before the build's reconcile anchor.
//   • The record readers (`readInProject`) are imported from regress-base-reuse.mjs (reused, not copied — L35), so a
//     change to that reader reaches this check too.
//
// TRUST (P2): gate output is never read (run-gates.mjs reduces it to a sha256). Every value quoted into a detail goes
// through entry-gates-core.mjs `shown` (L62). `ps` output is parsed as integer columns only.

import { randomBytes, createHash } from "node:crypto";
import { mkdirSync, openSync, closeSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { containmentWalk, flag, has, lstatSafe, parseBudgetMs, parseTimeoutMs, scanFlags } from "./stage-runtime.mjs";
import { readInProject } from "./regress-base-reuse.mjs";
import { hashFile } from "./reconcile-baseline.mjs";
import { FEATURE_SLUG_RE, validateStamp, REASON_CODES as RUNNER_REASON_CODES } from "./gate-run-core.mjs";
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
  shown,
} from "./entry-gates-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_GATES = join(HERE, "run-gates.mjs");
const SELF = fileURLToPath(import.meta.url);
const RECORD_MAX_BYTES = 1 << 20;
const STAMP_MAX_BYTES = 1 << 24;
const POLL_MS = 250;
const KILL_GRACE_MS = 2000;
const FEATURE_DIR_MAX_ENTRIES = 10000;

const USAGE =
  "usage: entry-gates.mjs --start --feature <name> --timeout-ms <N> | --wait --feature <name> --budget-ms <B> | --abort --feature <name>";

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

/** Stop a verified runner and every gate it started. Returns `{killed, how}`, `how` a short, fixed-vocabulary text. */
function killRunner(rec) {
  if (rec.pid === null) return { killed: false, how: "no runner process was recorded" };
  const mine = psShowsNonce(rec.pid, rec.nonce);
  if (mine !== true) {
    return {
      killed: false,
      how: mine === null ? "ps is unavailable, so the recorded pid could not be verified; nothing was signalled" : "no runner is running",
    };
  }
  signalGroup(rec.pid, "SIGSTOP");
  const ps = spawnSync("ps", ["-A", "-o", "pid=,ppid=,pgid="], { encoding: "utf8", maxBuffer: 1 << 26 });
  const groups = ps.error || ps.status !== 0 ? [] : descendantGroups(parsePsTable(ps.stdout), rec.pid);
  for (const g of groups) signalGroup(g, "SIGTERM");
  signalGroup(rec.pid, "SIGKILL");
  const until = Date.now() + KILL_GRACE_MS;
  while (Date.now() < until && (groups.some(groupAlive) || groupAlive(rec.pid))) sleepMs(50);
  for (const g of groups) if (groupAlive(g)) signalGroup(g, "SIGKILL");
  const how =
    ps.error || ps.status !== 0
      ? "the runner's group was killed; ps -A failed, so its gates may survive"
      : `the runner and ${groups.length} gate group(s) were stopped`;
  return { killed: true, how };
}

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
const MODES = ["--start", "--wait", "--abort", "--runner"];
const VALUE_FLAGS = new Set(["--feature", "--timeout-ms", "--budget-ms", "--nonce"]);
const ALLOWED = {
  "--start": ["--feature", "--timeout-ms"],
  "--wait": ["--feature", "--budget-ms"],
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
  for (const f of known) if (has(rest, f) && flag(rest, f) === undefined) return { ok: false, detail: `${f} requires a value` };
  const feature = flag(rest, "--feature");
  if (feature === undefined || !FEATURE_SLUG_RE.test(feature)) return { ok: false, detail: "--feature must be a plain slug" };
  const out = { ok: true, mode, feature };
  if (mode === "--start" || mode === "--runner") {
    const t = parseTimeoutMs(rest);
    if (!t.ok) return { ok: false, detail: t.detail };
    out.timeoutMs = t.value;
  }
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

function start({ feature, timeoutMs }) {
  const contained = rootContained();
  if (!contained.ok) return refuse("path-containment", contained.detail);
  const prior = readRecord(ENTRY_PATHS.runner);
  let superseded = null;
  if (prior.state === "ok" && runnerRecordDefect(prior.value) === null) {
    const k = killRunner(prior.value);
    if (k.killed) superseded = k.how;
  }
  rmSync(ENTRY_PATHS.root, { recursive: true, force: true });
  mkdirSync(ENTRY_PATHS.root, { recursive: true });

  const nonce = randomBytes(16).toString("hex");
  const rec = { schema: RUNNER_SCHEMA, feature, nonce, pid: null, timeout_ms: timeoutMs, d0: featureDirDigest(feature) };
  writeAtomic(ENTRY_PATHS.runner, rec);

  const initArgs = ["init", "--stage", "entry", "--feature", feature, "--out", ENTRY_PATHS.gates];
  if (lstatSafe("package.json").stat) initArgs.push("--discover", "package.json");
  const init = spawnSync(process.execPath, [RUN_GATES, ...initArgs], { encoding: "utf8" });
  const parsed = parseJson(init.stdout);
  if (init.status === 3) {
    writeAtomic(ENTRY_PATHS.result, result("no-gates", feature, nonce, { detail: shown(parsed ? parsed.reason : "no gates") }));
    process.stdout.write(`entry-gates: no gates to run for '${feature}' — ${shown(parsed ? parsed.reason : "")}\n`);
    return EXIT["no-gates"];
  }
  if (init.status !== 0 || parsed === null) {
    const detail = `run-gates.mjs init --stage entry refused: ${parsed ? parsed.reason : init.stderr || init.stdout}`;
    writeAtomic(ENTRY_PATHS.result, unusableResult(feature, nonce, "child-refused", detail, runnerReasonOf(parsed)));
    return refuse("child-refused", detail);
  }

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
    return refuse("spawn-failed", e && e.code ? e.code : "spawn failed");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  if (!Number.isInteger(child.pid)) {
    writeAtomic(ENTRY_PATHS.result, unusableResult(feature, nonce, "spawn-failed", "the runner has no pid"));
    return refuse("spawn-failed", "the runner has no pid");
  }
  child.unref();
  writeAtomic(ENTRY_PATHS.runner, { ...rec, pid: child.pid });
  const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
  process.stdout.write(
    `entry-gates: started ${ids.length} gate(s) for '${feature}' in the background (${ids.join(", ")})` +
      `${superseded ? `; an earlier runner was superseded: ${superseded}` : ""}\n`
  );
  return 0;
}

/** ---------------------------------------------------------------------------------------------------------------
 *  --runner (internal)
 *  ------------------------------------------------------------------------------------------------------------- */
/** The feature-directory digests recorded so far for THIS run (nonce + feature bound), or [] — a progress record that
 *  is absent, unreadable or another run's yields none, so a style red it would have attributed reads `unattributed`
 *  (the direction that never stops a run). */
function readProgress(feature, nonce) {
  const p = readRecord(ENTRY_PATHS.progress);
  if (p.state !== "ok" || progressRecordDefect(p.value) !== null) return [];
  return p.value.nonce === nonce && p.value.feature === feature ? p.value.feature_dir : [];
}

/** The ONE drain the runner and a `--wait` takeover share: one `run-gates.mjs run --next` per gate, the feature
 *  directory's digest before and after each, persisted to progress.json after every gate (a takeover keeps them; a
 *  stale-lock re-run of the same gate replaces its entry). `budget.may()` gates every gate. Returns
 *  `{kind: done, featureDir}` · `{kind: budget}` · `{kind: refused, detail, runnerReason}`. */
function drainEntry({ feature, nonce, timeoutMs, budget }) {
  const featureDir = readProgress(feature, nonce);
  for (;;) {
    if (!budget.may()) return { kind: "budget" };
    const before = featureDirDigest(feature);
    const r = spawnSync(process.execPath, [RUN_GATES, "run", "--next", "--out", ENTRY_PATHS.gates, "--timeout-ms", String(timeoutMs)], {
      encoding: "utf8",
    });
    const after = featureDirDigest(feature);
    const parsed = parseJson(r.stdout);
    if (r.status === 3) return { kind: "done", featureDir };
    if (r.status !== 0 || parsed === null) {
      return {
        kind: "refused",
        detail: `run-gates.mjs run --next refused: ${parsed ? parsed.reason : r.stderr || r.stdout}`,
        runnerReason: runnerReasonOf(parsed),
      };
    }
    budget.spent();
    if (typeof parsed.ran === "string") {
      const entry = { id: parsed.ran, before, after };
      const i = featureDir.findIndex((x) => x.id === entry.id);
      if (i === -1) featureDir.push(entry);
      else featureDir[i] = entry;
      writeAtomic(ENTRY_PATHS.progress, { schema: PROGRESS_SCHEMA, feature, nonce, feature_dir: featureDir });
    }
    if (parsed.finalized || parsed.remaining === 0) return { kind: "done", featureDir };
  }
}

/** Write the run's result LAST: `done` bound to the stamp's bytes, or `unusable` when no readable stamp exists. */
function finalizeResult(feature, nonce, featureDir) {
  const stamp = readInProject(ENTRY_PATHS.stamp, STAMP_MAX_BYTES);
  if (stamp.state !== "ok") {
    writeAtomic(
      ENTRY_PATHS.result,
      unusableResult(feature, nonce, "stamp-invalid", "the gates finished but no readable stamp.json exists")
    );
    return;
  }
  const sha = createHash("sha256").update(stamp.bytes).digest("hex");
  writeAtomic(ENTRY_PATHS.result, result("done", feature, nonce, { stamp_sha256: sha, feature_dir: featureDir }));
}

function runner({ feature, timeoutMs, nonce }) {
  const rec = readRecord(ENTRY_PATHS.runner);
  if (rec.state !== "ok" || runnerRecordDefect(rec.value) !== null || rec.value.nonce !== nonce || rec.value.feature !== feature) {
    process.stderr.write("entry-gates --runner: no runner record names this nonce; nothing was run\n");
    return EXIT.unusable;
  }
  try {
    const d = drainEntry({ feature, nonce, timeoutMs, budget: { may: () => true, spent: () => {} } });
    if (d.kind === "refused") {
      writeAtomic(ENTRY_PATHS.result, unusableResult(feature, nonce, "child-refused", d.detail, d.runnerReason));
      return EXIT.unusable;
    }
    finalizeResult(feature, nonce, d.featureDir);
    return 0;
  } catch (e) {
    writeAtomic(
      ENTRY_PATHS.result,
      unusableResult(feature, nonce, "crashed", e && e.message ? e.message.split("\n")[0] : "a thrown value")
    );
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

/** Decide over a bound `done` result. */
function decideDone(feature, runnerRec, res) {
  const stamp = readRecord(ENTRY_PATHS.stamp, STAMP_MAX_BYTES);
  if (stamp.state !== "ok") return unusableDoc(feature, "stamp-invalid", "the result names a stamp that is not readable");
  const sha = createHash("sha256").update(stamp.bytes).digest("hex");
  if (sha !== res.stamp_sha256) return unusableDoc(feature, "result-unbound", "the stamp's sha256 is not the one the result names");
  const v = validateStamp(stamp.value, { stage: "entry", feature });
  if (!v.ok) return unusableDoc(feature, "stamp-invalid", `${v.reason_code}: ${v.reason}`);
  if (stamp.value.fingerprint.algo !== ENTRY_ALGO)
    return unusableDoc(feature, "stamp-invalid", "the stamp's fingerprint algo is not the entry algo");
  const verdict = entryVerdict({ stamp: stamp.value, featureDir: res.feature_dir, d0: runnerRec.d0 });
  return emitDoc({ status: verdict.status, feature, verdict });
}

function wait({ feature, budgetMs }) {
  const t0 = Date.now();
  const contained = rootContained();
  if (!contained.ok) return unusableDoc(feature, "path-containment", contained.detail);
  for (;;) {
    const rr = readRecord(ENTRY_PATHS.runner);
    if (rr.state !== "ok") return unusableDoc(feature, "no-runner", `no readable ${ENTRY_PATHS.runner}: run --start first`);
    const defect = runnerRecordDefect(rr.value);
    if (defect !== null) return unusableDoc(feature, "no-runner", `${ENTRY_PATHS.runner} ${defect}`);
    if (rr.value.feature !== feature) return unusableDoc(feature, "no-runner", `${ENTRY_PATHS.runner} names another feature`);

    const res = readRecord(ENTRY_PATHS.result);
    if (res.state === "unusable") return unusableDoc(feature, "result-unbound", `${ENTRY_PATHS.result} is not a readable JSON file`);
    if (res.state === "ok") {
      const d = resultRecordDefect(res.value);
      if (d !== null) return unusableDoc(feature, "result-unbound", `${ENTRY_PATHS.result} ${d}`);
      if (res.value.nonce !== rr.value.nonce || res.value.feature !== feature) {
        return unusableDoc(feature, "result-unbound", "the result belongs to another runner");
      }
      if (res.value.status === "no-gates") return emitDoc({ status: "no-gates", feature, detail: res.value.detail });
      if (res.value.status === "aborted") return unusableDoc(feature, "aborted", "the entry run was aborted");
      if (res.value.status === "unusable") {
        return unusableDoc(feature, res.value.reason_code, res.value.detail, res.value.runner_reason);
      }
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
      const inProgress = lstatSafe(`${ENTRY_PATHS.gates}/state.json`).stat !== null || lstatSafe(ENTRY_PATHS.stamp).stat !== null;
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
      const d = drainEntry({ feature, nonce: rr.value.nonce, timeoutMs: rr.value.timeout_ms, budget });
      if (d.kind === "budget") {
        return emitDoc({ status: "continue", feature, detail: "the background runner is gone; this line is running the gates itself" });
      }
      if (d.kind === "refused") {
        writeAtomic(ENTRY_PATHS.result, unusableResult(feature, rr.value.nonce, "child-refused", d.detail, d.runnerReason));
      } else {
        finalizeResult(feature, rr.value.nonce, d.featureDir);
      }
      continue; // the result now exists: read it like any other
    }
    if (Date.now() - t0 + POLL_MS > budgetMs) return emitDoc({ status: "continue", feature, detail: "the gates are still running" });
    sleepMs(POLL_MS);
  }
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
  if (k.killed && readRecord(ENTRY_PATHS.result).state === "absent") {
    writeAtomic(ENTRY_PATHS.result, result("aborted", feature, rr.value.nonce));
  }
  process.stdout.write(`entry-gates: abort for '${feature}' — ${k.how}\n`);
  return 0;
}

/** The CLI. Returns the exit code. */
export function main(argv) {
  const a = parseArgv(argv.slice(2));
  if (!a.ok) {
    if (argv.includes("--wait")) {
      const f = flag(argv, "--feature");
      return unusableDoc(FEATURE_SLUG_RE.test(f ?? "") ? f : null, "usage-error", a.detail);
    }
    return refuse("usage-error", a.detail);
  }
  try {
    if (a.mode === "--start") return start(a);
    if (a.mode === "--runner") return runner(a);
    if (a.mode === "--wait") return wait(a);
    return abort(a);
  } catch (e) {
    const detail = e && e.message ? e.message.split("\n")[0] : "a thrown value";
    if (a.mode === "--wait") return unusableDoc(a.feature, "crashed", detail);
    return refuse("crashed", detail);
  }
}

if (import.meta.main) process.exitCode = main(process.argv);
