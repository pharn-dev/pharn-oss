#!/usr/bin/env node
// pharn/floor/pre-run-snapshot.mjs — the EXECUTION half and CLI of a delivery run's PRE-RUN SNAPSHOT
// (regress-pre-run-snapshot, 6.37.0). The rule — what is recorded, how the partition uses it, every status and every
// bound — is `pre-run-snapshot-core.mjs`'s header; this file reads and writes the disk (P3: it changes when the storage
// or the CLI changes).
//
// ================================ THE CLI — one line, run at a delivery run's entry ================================
//   node pharn/floor/pre-run-snapshot.mjs --capture <name>
// `/pharn-loop` runs it in Step 1a right after `require-loop-record.cjs --open`; `/pharn-ship` right after
// `run-marker.mjs --open` (Step 2 item 1). Both STOP on a non-zero exit, before any model work. It:
//   1. validates <name> (gate-run-core FEATURE_SLUG_RE);
//   2. reads the delivery-run identity — regress-base-reuse.mjs `readMarkers` + regress-base-reuse-core.mjs
//      `deliveryRunIdentity`, reused (L35): exactly one open /pharn-loop or /pharn-ship marker for <name>, hashed;
//   3. resolves HEAD (40-hex) and lists the changed paths with scope-inputs.mjs `changedPaths(HEAD)` — the listing the
//      partition itself makes, so the record and the partition speak one language;
//   4. digests each path with `pathDigest` (below), the ONE function the check also uses;
//   5. refuses `already-captured` when a valid record is already bound to the run open now (WRITE-ONCE PER RUN: a second
//      capture would record the build's own writes as pre-run state — a re-run of the pinned line, by a confused agent
//      or after a compaction, cannot do that; a re-run of the --open line before it starts another run, which is the
//      core header's re-run bound);
//   6. writes `<git rev-parse --absolute-git-dir>/pharn-pre-run-snapshot.json` (tmp + rename in that directory).
// Exit: 0 recorded (one line on stdout) · 2 refused (`pre-run-snapshot: refused <reason_code> — …` on stderr, the
// closed REASON_CODES; a throw caught here is `crashed`). A module that fails to load is node's own exit 1 — no claim
// otherwise; both callers stop on ANY non-zero exit.
//
// ================================ WHERE THE RECORD LIVES, AND WHO CAN WRITE IT ================================
// In the git dir, one per worktree (a linked worktree has its own), beside 6.33.0's base-reuse record and 6.34.0's head
// offer (regress-base-reuse.mjs `gitDirFile`, the one resolver). `.pharn/**` is writable by the write tools in every
// posture, so a record there could be rewritten by the very build the partition judges (L65); the git dir is denied to
// them, by a different guard per layout (the independent review's R3, probed in every posture, with and without a run
// open, with no scope, `src/**` and `**`): in a MAIN checkout the git dir is `.git/` under the project and
// `protect-trusted-paths.cjs` denies it (a `.git` segment under a guarded root), whatever the scope; for a LINKED
// worktree — beside the main checkout or nested under it — the git dir is `<main>/.git/worktrees/<id>/`, which
// protect-trusted-paths does not see as this project's, and `enforce-writes-scope.cjs` denies it (a path inside another
// git tree), whatever the scope. pre-run-snapshot.test.mjs's ★ HOOK test pins each cell. NOT COVERED, and pinned there
// too: a SEPARATE git dir kept inside the project under a name that is not `.git` (`git init --separate-git-dir`) — no
// `.git` segment and no other tree, so a `**` scope, or an installed project with no scope and no run open, lets the
// write tools reach it; and the 6.34.0 GATE-2 bound (a separate git dir under a temp root, installed, no run open). A Bash writer reaches the git dir (L19) and can forge a record bound to the right marker; nothing
// detects it. The capture itself is a Bash `fs` write outside fix #7, declared; it runs before the build's reconcile
// anchor, so no reconciliation window sees it.
//
// ================================ READS — lstat-first, never followed (L54, L59) ================================
// The markers and the record are read by regress-base-reuse.mjs's own readers (O_NOFOLLOW|O_NONBLOCK, fstat-checked,
// capped): a link, a FIFO, a directory or an oversize file is `unusable`, never followed. `pathDigest` classifies the
// path itself with `lstat` before any read, refuses a parent component that is a symlink (stage-runtime.mjs
// `containmentWalk`), and only then hashes a regular file or a link's own text with `hashFile`.
//
// LOAD GRAPH: stage-runtime.mjs, reconcile-baseline.mjs, regress-base-reuse.mjs (which brings run-gates.mjs),
// scope-inputs.mjs, gate-run-core.mjs and the core — every one already in stage-regress.mjs's graph. quick-scope-core.mjs
// gains them too; its entry loads it with import(), so a module that cannot load is its `crashed` (exit 2).
//
// TRUST (P2): git paths are untrusted, attacker-nameable strings — hashed, compared and JSON-encoded, never evaluated;
// git runs as an argument vector. Marker bytes are hashed, never parsed. Nothing a record holds is opened.

import { writeFileSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { containmentWalk, gitSync, lstatSafe } from "./stage-runtime.mjs";
import { hashFile } from "./reconcile-baseline.mjs";
import { readMarkers, readRegularFile, gitDirFile } from "./regress-base-reuse.mjs";
import { deliveryRunIdentity } from "./regress-base-reuse-core.mjs";
import { changedPaths } from "./scope-inputs.mjs";
import { FEATURE_SLUG_RE, SHA_RE } from "./gate-run-core.mjs";
import {
  SNAPSHOT_BASENAME,
  ENTRY_CHANGES_BASENAME,
  SNAPSHOT_MAX_BYTES,
  DIGEST_MAX_BYTES,
  DIGEST_ABSENT,
  DIGEST_UNHASHABLE,
  buildSnapshot,
  parseRecord,
  boundToRun,
  decidePreRun,
} from "./pre-run-snapshot-core.mjs";

const USAGE = "usage: pre-run-snapshot.mjs --capture <name>";

/** `<absolute git dir>/pharn-pre-run-snapshot.json`, or null when git cannot name the directory. */
export function snapshotPath() {
  return gitDirFile(SNAPSHOT_BASENAME);
}

/**
 * The digest of `rel` (a path as git printed it, relative to `root`), by the one rule the capture and the check share:
 * `absent` (lstat ENOENT), a sha256 (a regular file of at most DIGEST_MAX_BYTES, or a symlink's own text — hashFile), or
 * `unhashable` (a directory, a FIFO or other non-file, a trailing-slash entry, a parent component that is a symlink, an
 * oversize or unreadable file, any lstat error but ENOENT, and any path holding U+FFFD).
 *
 * U+FFFD (the independent review's R4, reproduced on a byte-name filesystem): git prints a name that is not valid UTF-8
 * and `nulList` decodes it with U+FFFD in place of the bad bytes, so `lstat` of the DECODED name is ENOENT — `absent`
 * at capture AND at check — and a later content change to the real file would be subtracted as unchanged. The decoded
 * name cannot reach the real file, so such a path is never digested: `unhashable`, never subtracted. A name that
 * genuinely holds U+FFFD is caught by the same rule — fail-closed, counted as before.
 */
export function pathDigest(rel, root = process.cwd()) {
  if (typeof rel !== "string" || rel === "" || rel.endsWith("/") || rel.includes("\0") || rel.includes("�")) {
    return DIGEST_UNHASHABLE;
  }
  const abs = join(root, rel);
  if (abs === root || !abs.startsWith(root + sep)) return DIGEST_UNHASHABLE;
  const parent = dirname(abs);
  if (parent !== root && !containmentWalk(root, parent).ok) return DIGEST_UNHASHABLE;
  const st = lstatSafe(abs);
  if (!st.ok) return DIGEST_UNHASHABLE;
  if (st.stat === null) return DIGEST_ABSENT;
  if (st.stat.isSymbolicLink()) return hashFile(abs) ?? DIGEST_UNHASHABLE;
  if (!st.stat.isFile() || st.stat.size > DIGEST_MAX_BYTES) return DIGEST_UNHASHABLE;
  return hashFile(abs) ?? DIGEST_UNHASHABLE;
}

/** The record as `{state: "absent" | "unusable" | "ok", bytes}`: absent when git cannot name its directory too. */
export function readSnapshot() {
  const rp = snapshotPath();
  return rp === null ? { state: "absent" } : readRegularFile(rp, SNAPSHOT_MAX_BYTES);
}

/**
 * The partition's input: which of `inside` (the changed paths since `base`) still hold the bytes this open run's
 * snapshot recorded. `{status, unchanged}` — `status` a PRE_RUN_STATUSES member, `unchanged` empty on every miss. Never
 * throws for a missing, malformed or foreign record; a filesystem error while hashing reads as `unhashable`.
 */
export function preRunUnchanged({ feature, base, inside }) {
  return decidePreRun({
    feature,
    base,
    markers: readMarkers(feature),
    now: Date.now(),
    record: readSnapshot(),
    inside,
    liveDigest: (p) => pathDigest(p),
  });
}

function refusal(code, detail) {
  return { ok: false, code, detail };
}

/**
 * Capture the snapshot for the delivery run open for `feature`, from the current directory (the project root).
 * Returns `{ok: true, path, counts}` or `{ok: false, code, detail}` — `code` a REASON_CODES member. Throws only on a
 * defect, which the CLI reports as `crashed`.
 */
export function captureSnapshot(feature) {
  if (typeof feature !== "string" || !FEATURE_SLUG_RE.test(feature)) {
    return refusal("usage-error", `<name> must be a plain slug matching ${FEATURE_SLUG_RE}`);
  }
  const id = deliveryRunIdentity({ markers: readMarkers(feature), now: Date.now() });
  if (!id.ok) {
    return refusal("no-delivery-run", "not exactly one open /pharn-loop or /pharn-ship run marker for this feature — open the run first");
  }
  const head = gitSync(["rev-parse", "--verify", "--quiet", "HEAD"]);
  const base = head.ok ? head.stdout.trim() : "";
  if (!SHA_RE.test(base)) return refusal("git-failed", `git rev-parse HEAD did not name a commit${head.ok ? "" : `: ${head.detail}`}`);
  const changed = changedPaths(base);
  if (!changed.ok) return refusal("git-failed", `listing the changed paths failed (${changed.which}): ${changed.detail}`);
  const rp = snapshotPath();
  if (rp === null) return refusal("git-dir-unresolved", "git rev-parse --absolute-git-dir named no directory");
  const existing = parseRecord(readRegularFile(rp, SNAPSHOT_MAX_BYTES));
  if (existing.ok && boundToRun(existing.value, feature, id)) {
    return refusal(
      "already-captured",
      "this run already has its snapshot; a second capture would record the run's own writes as pre-run state"
    );
  }
  const paths = changed.value.map((p) => [p, pathDigest(p)]);
  const record = buildSnapshot({ feature, run: id, base, paths });
  const tmp = `${rp}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, `${JSON.stringify(record, null, 2)}\n`);
    renameSync(tmp, rp);
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* nothing was created */
    }
    return refusal("write-failed", `the snapshot could not be written in the git dir (${e && e.code ? e.code : "error"})`);
  }
  const counts = { paths: paths.length, absent: 0, unhashable: 0 };
  for (const [, d] of paths) {
    if (d === DIGEST_ABSENT) counts.absent++;
    else if (d === DIGEST_UNHASHABLE) counts.unhashable++;
  }
  return { ok: true, command: id.command, counts };
}

/** ------------------------------------------------------------------------------------------------------------------
 *  THE ENTRY GATES' CHANGES (6.42.0, loop-entry-preflight, review R1). A delivery run's entry gates (entry-gates.mjs)
 *  run AFTER this snapshot, so a path one of them rewrites (a `next build` regenerating `next-env.d.ts`) changed since
 *  the snapshot without being the build's escape. `entry-gates.mjs --wait` records those paths — the ones a gate the
 *  stamp marks `mutated` changed, with their digest after it — in a SECOND record of this module's shape, beside the
 *  snapshot, bound to the same run marker; the partition asks `entryChangesUnchanged` exactly as it asks
 *  `preRunUnchanged` (the same `decidePreRun`, the same `pathDigest` — L35). Overwritten by each `--wait` decision of the
 *  run; `entry-gates.mjs --start` removes an earlier run's. Bounds: the snapshot's (agreement, never provenance; a Bash
 *  writer can forge it), plus one of its own — a non-gate write outside the feature directory DURING a mutated gate is
 *  recorded with that gate's (entry-gates.mjs, header).
 *  ---------------------------------------------------------------------------------------------------------------- */

/** `<absolute git dir>/pharn-entry-gate-changes.json`, or null when git cannot name the directory. */
export function entryChangesPath() {
  return gitDirFile(ENTRY_CHANGES_BASENAME);
}

/** The partition's second input: which of `inside` still hold the bytes the run's entry gates left. Same contract as
 *  `preRunUnchanged`; `no-snapshot` when no entry record exists. */
export function entryChangesUnchanged({ feature, base, inside }) {
  const rp = entryChangesPath();
  return decidePreRun({
    feature,
    base,
    markers: readMarkers(feature),
    now: Date.now(),
    record: rp === null ? { state: "absent" } : readRegularFile(rp, SNAPSHOT_MAX_BYTES),
    inside,
    liveDigest: (p) => pathDigest(p),
  });
}

/** Record `paths` (`[[path, digest], …]`) as this run's entry-gate changes. `{ok: true}` or `{ok: false, code}` with
 *  `code` ∈ {no-delivery-run, git-failed, git-dir-unresolved, write-failed}. Never throws for an expected failure. */
export function recordEntryChanges(feature, paths) {
  const id = deliveryRunIdentity({ markers: readMarkers(feature), now: Date.now() });
  if (!id.ok) return refusal("no-delivery-run", "no single open /pharn-loop or /pharn-ship run marker for this feature");
  const head = gitSync(["rev-parse", "--verify", "--quiet", "HEAD"]);
  const base = head.ok ? head.stdout.trim() : "";
  if (!SHA_RE.test(base)) return refusal("git-failed", "git rev-parse HEAD did not name a commit");
  const rp = entryChangesPath();
  if (rp === null) return refusal("git-dir-unresolved", "git rev-parse --absolute-git-dir named no directory");
  const tmp = `${rp}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, `${JSON.stringify(buildSnapshot({ feature, run: id, base, paths }), null, 2)}\n`);
    renameSync(tmp, rp);
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* nothing was created */
    }
    return refusal("write-failed", `the entry-gate changes could not be written in the git dir (${e && e.code ? e.code : "error"})`);
  }
  return { ok: true };
}

/** Remove an earlier run's entry-gate changes record (`--start`); ENOENT is success. Returns false on any other error. */
export function clearEntryChanges() {
  const rp = entryChangesPath();
  if (rp === null) return true;
  try {
    unlinkSync(rp);
    return true;
  } catch (e) {
    return Boolean(e && e.code === "ENOENT");
  }
}

/** A thrown value's first line, bounded — total (L62): a value with no string form must not throw on this path. */
function firstLineOf(e) {
  try {
    return String(e?.message ?? e)
      .split("\n")[0]
      .slice(0, 300);
  } catch {
    return "a thrown value with no string form";
  }
}

/** The CLI. Returns the exit code; prints one line. */
export function main(argv) {
  const args = argv.slice(2);
  if (args.length !== 2 || args[0] !== "--capture") {
    process.stderr.write(`pre-run-snapshot: refused usage-error — ${USAGE}\n`);
    return 2;
  }
  let r;
  try {
    r = captureSnapshot(args[1]);
  } catch (e) {
    process.stderr.write(`pre-run-snapshot: refused crashed — ${firstLineOf(e)} — no snapshot was recorded\n`);
    return 2;
  }
  if (!r.ok) {
    process.stderr.write(`pre-run-snapshot: refused ${r.code} — ${r.detail}\n`);
    return 2;
  }
  const c = r.counts;
  process.stdout.write(
    `pre-run-snapshot: recorded ${c.paths} changed path(s) (${c.absent} absent, ${c.unhashable} unhashable) for the open ${r.command} run of '${args[1]}'\n`
  );
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv);
