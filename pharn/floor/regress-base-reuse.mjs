// pharn/floor/regress-base-reuse.mjs — the EXECUTION half of /pharn-regress's BASE-evidence reuse (regress-base-reuse,
// 6.33.0). It reads the run markers, the reuse record, the retained base stamp, its logs and the root files off disk,
// hands them to the pure predicate (`regress-base-reuse-core.mjs`), publishes a record after a verdict, and discards
// retained evidence on a miss. No CLI: `stage-regress.mjs` is its only caller. It changes when the STORAGE changes;
// the core when a RULE does (P3).
//
// ================================ WHERE EACH PIECE LIVES, AND WHO CAN WRITE IT ================================
// • The EVIDENCE stays where the runner writes it and check-loop-fresh.mjs reads it: `.pharn/pharn-regress/base-gates/`
//   (REGRESS_PATHS.baseGates — the stamp plus each gate's .out / .err / results file). Nothing is copied. The fresh
//   start keeps that one directory (`stage-regress.mjs`, phaseFreshLate); everything else under `.pharn/pharn-regress/`
//   is still cleared.
// • The RECORD — the binding a later invocation compares against — is `<git rev-parse --absolute-git-dir>/`
//   `<RECORD_BASENAME>`, one per worktree. `enforce-writes-scope.cjs` always lets the write tools write `.pharn/**`, so
//   a record there could be rewritten by the very build the next regress judges (L65). The write tools cannot write
//   the git dir: `protect-trusted-paths.cjs` denies any path with a `.git` segment under a guarded root, and for a
//   linked worktree, a submodule or a separate git dir `enforce-writes-scope.cjs` denies a path inside another git tree
//   or outside the project, in every posture (stage-regress.test.mjs's ★ HOOK test runs both hooks on both layouts).
//   The record binds the stamp by sha256 and the stamp binds each log by sha256, so a write-tool edit of any retained
//   evidence file reads as a miss.
// • The RUN MARKERS are read, never written and never parsed: `.pharn/<pharn-loop|pharn-ship>/<feature>/active.json`,
//   owned by require-loop-record.cjs and run-marker.mjs. Hashed, and aged by their mtime (the write guard's rule).
//
// WHAT REMAINS WRITABLE, stated (P0): a Bash writer reaches the git dir and `.pharn/` alike (L19) and can forge the
// record and the evidence together; nothing detects it. The markers are in `.pharn/`, so restoring an earlier run's
// marker bytes re-binds that run's record. And the base side's own in-progress scratch (`stage.json`,
// `base-gates/state.json`) is write-tool reachable while its chain is paused at a `continue`: forging it falsifies that
// invocation's base evidence, as it can on the fresh path, and the publication below would then bind it for later
// invocations of the run (the follow-up `regress-paused-chain-integrity`). A persisted HIT is never trusted:
// `stage-regress.mjs` re-decides it here, in full, at the verdict.
//
// ================================ READS — lstat-first, never followed (L54, L59) ================================
// A marker, stamp or scope path is containment-walked (no symlink component under the project; `lstat`'s own ENOENT
// is the only absence) and then opened O_NOFOLLOW|O_NONBLOCK and fstat-checked: a link, a FIFO, a directory, an
// oversize or an unreadable file is `unusable` — a miss, never followed. The record is opened the same way inside the
// git dir, which a linked worktree keeps outside the project, where the walk cannot reach. A log is hashed by
// run-gates.mjs's own `sha256RegularFile` (the function that recorded the results digests; stricter than check J,
// which follows a link for .out/.err), and a root file by reconcile-baseline.mjs's `hashFile` (the fingerprint's own:
// content, or a link's text).
//
// ================================ WRITES ================================
// Publication is a tmp file + `rename` inside the git dir, and only of a record the predicate accepts NOW (so a record
// always binds evidence that is finalized, intact, installed and for the current requirement), bound to the run the
// DECISION saw. A failure leaves no record and is returned to the caller (`recorded: false` in the report). Discarding
// removes the record FIRST (`removeIfPresent`: only ENOENT is absence, anything else propagates — a crash, never a
// verdict) and then the retained directory, so no record outlives the evidence it names. Both are `fs` writes reached
// through Bash, outside the PreToolUse gate (L19) — declared, as the stage's other scratch writes are.

import { openSync, fstatSync, readSync, closeSync, writeFileSync, renameSync, rmSync, unlinkSync, constants as fsConstants } from "node:fs";
import { join } from "node:path";
import { containmentWalk, gitSync, lstatSafe, removeIfPresent } from "./stage-runtime.mjs";
import { REGRESS_PATHS, DELIVERY_COMMANDS } from "./stage-regress-core.mjs";
import { sha256RegularFile } from "./run-gates.mjs";
import { hashFile } from "./reconcile-baseline.mjs";
import {
  RECORD_BASENAME,
  MARKER_MAX_BYTES,
  RECORD_MAX_BYTES,
  STAMP_MAX_BYTES,
  isRootLevel,
  decideBaseReuse,
  buildRecord,
  sha256Hex,
} from "./regress-base-reuse-core.mjs";

const OPEN_FLAGS = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;

/** The retained base stamp, the finalized head stamp and the partition, as `stage-regress.mjs` lays them out
 *  (REGRESS_PATHS, the one owner of that layout). */
export const BASE_STAMP = `${REGRESS_PATHS.baseGates}/stamp.json`;
export const HEAD_STAMP = `${REGRESS_PATHS.head}/stamp.json`;

/** Read a regular file WITHOUT following a link at its last component: `{state: "absent"}` (ENOENT), `{state:
 *  "unusable"}` (a link, a non-regular file, more than `maxBytes`, or any other error) or
 *  `{state: "ok", bytes, mtimeMs}`. */
export function readRegularFile(path, maxBytes) {
  let fd;
  try {
    fd = openSync(path, OPEN_FLAGS);
  } catch (e) {
    return e && e.code === "ENOENT" ? { state: "absent" } : { state: "unusable" };
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > maxBytes) return { state: "unusable" };
    const buf = Buffer.alloc(st.size);
    let off = 0;
    while (off < st.size) {
      const n = readSync(fd, buf, off, st.size - off, off);
      if (n === 0) break;
      off += n;
    }
    return off === st.size ? { state: "ok", bytes: buf, mtimeMs: st.mtimeMs } : { state: "unusable" };
  } catch {
    return { state: "unusable" };
  } finally {
    closeSync(fd);
  }
}

/** A project-relative path, containment-walked first: a symlink at any component under the project is `unusable`. */
export function readInProject(relPath, maxBytes) {
  const cwd = process.cwd();
  if (!containmentWalk(cwd, join(cwd, relPath)).ok) return { state: "unusable" };
  return readRegularFile(relPath, maxBytes);
}

/** What stands at each delivery command's run-marker path for `feature`. A `/pharn-review` marker is never looked at. */
export function readMarkers(feature) {
  const out = {};
  for (const command of DELIVERY_COMMANDS) out[command] = readInProject(`.pharn/${command}/${feature}/active.json`, MARKER_MAX_BYTES);
  return out;
}

/** `<absolute git dir>/<name>` — a linked worktree's own git dir, so one file per worktree — or null when git cannot name
 *  the directory. The ONE resolver of a record kept out of the write tools' reach; since 6.34.0 head-reuse-offer.mjs keeps
 *  the HEAD offer through it too (L35). */
export function gitDirFile(name) {
  const r = gitSync(["rev-parse", "--absolute-git-dir"]);
  if (!r.ok) return null;
  const dir = r.stdout.trim();
  return dir === "" ? null : join(dir, name);
}

/** `<absolute git dir>/<RECORD_BASENAME>`, or null when git cannot name the directory. */
export function recordPath() {
  return gitDirFile(RECORD_BASENAME);
}

function parsedOrNull(read) {
  if (read.state !== "ok") return null;
  try {
    return JSON.parse(read.bytes.toString("utf8"));
  } catch {
    return null;
  }
}

/** The `head_root` pairs: every ROOT-LEVEL path in this chain's partition (`scope.json`'s `inside`), sorted and unique,
 *  with its current `hashFile` digest (content, or a link's text; null for a directory or an absent path). Null when
 *  the partition cannot be read — a requirement nothing can match, and a record the predicate refuses. */
export function headRootNow() {
  const scope = parsedOrNull(readInProject(REGRESS_PATHS.scopeJson, STAMP_MAX_BYTES));
  if (scope === null || typeof scope !== "object" || !Array.isArray(scope.inside)) return null;
  const roots = [...new Set(scope.inside.filter(isRootLevel))].sort();
  return roots.map((p) => [p, hashFile(join(process.cwd(), p))]);
}

/** Read every input the predicate needs — in THIS invocation — and decide. `record` overrides the on-disk record (the
 *  publication path decides over the record it would write). */
export function decideFromDisk({ feature, base, install, timeoutMs, gateRunSchema, fingerprintAlgo, record = undefined }) {
  let rec = record;
  if (rec === undefined) {
    const rp = recordPath();
    rec = rp === null ? { state: "absent" } : readRegularFile(rp, RECORD_MAX_BYTES);
  }
  return decideBaseReuse({
    feature,
    base,
    install,
    timeoutMs,
    gateRunSchema,
    fingerprintAlgo,
    headRecord: parsedOrNull(readInProject(HEAD_STAMP, STAMP_MAX_BYTES)),
    headRoot: headRootNow(),
    markers: readMarkers(feature),
    now: Date.now(),
    record: rec,
    stamp: readInProject(BASE_STAMP, STAMP_MAX_BYTES),
    hashEvidence: (file) => sha256RegularFile(join(REGRESS_PATHS.baseGates, file)),
  });
}

/** On a miss, before the base side runs: remove the record FIRST, then the retained directory. Idempotent. Whatever
 *  stands at the record's name goes — a file through `removeIfPresent` (only ENOENT is absence), anything else (a
 *  directory planted there) recursively, so it cannot block every later publication; a removal that fails for a real
 *  reason (EACCES) propagates: a crash, never a verdict. */
export function discardRetained() {
  const rp = recordPath();
  if (rp !== null) {
    const st = lstatSafe(rp);
    if (!st.ok) throw new Error(`cannot lstat the reuse record: ${st.reason}`);
    if (st.stat !== null && !st.stat.isFile() && !st.stat.isSymbolicLink()) rmSync(rp, { recursive: true, force: true });
    else removeIfPresent(rp);
  }
  rmSync(REGRESS_PATHS.baseGates, { recursive: true, force: true });
}

/**
 * After a verdict over BASE evidence THIS invocation chain produced: publish a record binding it — but only one the
 * predicate accepts NOW, only for the delivery run the decision saw (`decisionRun`, `{command, markerSha256}` or
 * null), and only for the requirement the decision saw (`decisionRequirementSha256`) — the one the base side was then
 * produced for. `head_root` is hashed here, at publication, so without that last test a root-level HEAD file edited
 * while a budgeted chain was paused would bind evidence produced under its OLD content to its NEW content (GATE-2
 * review A2). Returns `{published: true}` or `{published: false, why}` — `why` a BASE_REUSE_MISSES member the
 * predicate returned, or `requirement-moved` / `git-dir-unresolved` / `evidence-unreadable` / `write-failed`. A
 * filesystem failure is returned, never thrown.
 */
export function publishRecord({
  feature,
  base,
  install,
  installResult,
  timeoutMs,
  gateRunSchema,
  fingerprintAlgo,
  decisionRun,
  decisionRequirementSha256,
}) {
  if (decisionRun === null) return { published: false, why: "no-delivery-run" };
  const rp = recordPath();
  if (rp === null) return { published: false, why: "git-dir-unresolved" };
  const stamp = readInProject(BASE_STAMP, STAMP_MAX_BYTES);
  if (stamp.state !== "ok") return { published: false, why: "evidence-unreadable" };
  const headRoot = headRootNow();
  const record = buildRecord({
    feature,
    run: decisionRun,
    stampSha256: sha256Hex(stamp.bytes),
    install,
    installResult,
    timeoutMs,
    headRoot,
  });
  const bytes = Buffer.from(`${JSON.stringify(record, null, 2)}\n`);
  const d = decideFromDisk({ feature, base, install, timeoutMs, gateRunSchema, fingerprintAlgo, record: { state: "ok", bytes } });
  if (!d.reused) return { published: false, why: d.miss };
  if (d.requirementSha256 !== decisionRequirementSha256) return { published: false, why: "requirement-moved" };
  const tmp = `${rp}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, bytes);
    renameSync(tmp, rp);
    return { published: true };
  } catch {
    try {
      unlinkSync(tmp);
    } catch {
      /* nothing was created */
    }
    return { published: false, why: "write-failed" };
  }
}
