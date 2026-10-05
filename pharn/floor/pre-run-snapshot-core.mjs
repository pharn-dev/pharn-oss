// pharn/floor/pre-run-snapshot-core.mjs — the PURE rules of a delivery run's PRE-RUN SNAPSHOT (regress-pre-run-snapshot,
// 6.37.0): the record's closed shape, and the decision that lets `/pharn-regress`'s partition and the quick scope check
// stop counting a path the run did not change. No filesystem, no child process, no clock of its own: the execution half,
// `pre-run-snapshot.mjs`, reads every input off disk and hands plain values in (P3 — this file changes when a RULE
// changes, that one when the storage or the CLI does; the regress-base-reuse precedent).
//
// ==================================== WHY (P7) ====================================
// The partition (`check-regress.mjs` `partitionScope`) counts every undeclared path CHANGED SINCE THE BASE as a build
// escape (L17). A path that was already changed when the run began is not one, yet two of three recorded `/pharn-loop`
// runs in a user's project stopped on exactly that: an abandoned earlier run's untracked `pharn/features/<other>/`
// folder (a 19-minute human wait), and the user's own uncommitted edit to a component (an S9 stop). Both paths were
// listed in the loop's own `pre-run-status.txt`, which the partition never read
// (`.dev/features/regress-pre-run-snapshot/PLAN.md`, "Why").
//
// ==================================== THE RULE ====================================
// At run entry the execution half records, for every path `scope-inputs.mjs` `changedPaths(HEAD)` lists, a DIGEST (see
// below), bound to the open run marker, the base commit and the feature. Later, `decidePreRun` names which of the
// partition's `inside` paths still hold exactly the recorded digest. The partition subtracts those that are undeclared
// and not already exempt, after its closed exemptions, and REPORTS them (never silent; the `escape_exempt` precedent).
//
// A DIGEST is one of: a sha256 hex string (a regular file's content, or a symlink's own text — `reconcile-baseline.mjs`
// `hashFile`, the fingerprint's function), `DIGEST_ABSENT` (lstat ENOENT: a deletion), or `DIGEST_UNHASHABLE` (anything
// else: a directory — git lists an untracked nested repository as `vendor/lib/` —, a FIFO, a parent component that is
// a symlink, an unreadable file, a file over `DIGEST_MAX_BYTES`, a name holding U+FFFD — what git's non-UTF-8 names decode
// to, which could never reach the real file). An UNHASHABLE entry is never subtracted: that path is counted as before.
//
// THE DECISION, first failure decides (`PRE_RUN_MISSES`, in order); only `applied` yields paths:
//   no-delivery-run     not exactly one open /pharn-loop or /pharn-ship marker for the feature — regress-base-reuse-core
//                       `deliveryRunIdentity`, reused: presence + the write guard's 24 h age, the bytes hashed, never
//                       parsed. A standalone /pharn-regress is here, and so behaves exactly as before 6.37.0 — UNLESS an
//                       interrupted /pharn-loop or /pharn-ship of the same feature left its marker (≤ 24 h old): a
//                       marker is read by presence and age only, so that standalone run applies the interrupted run's
//                       snapshot (the independent review's R2; 6.33.0's base reuse carries the same bound);
//   no-snapshot         no record in the git dir, or a git dir git cannot name;
//   snapshot-malformed  the record is not a regular file (a link, a FIFO, a directory, unreadable, over
//                       `SNAPSHOT_MAX_BYTES`) of the closed `pharn-pre-run-snapshot/1` shape;
//   other-run           the record names another feature, command or marker digest (every `--open` rewrites the
//                       marker, so a re-opened run is another run);
//   base-changed        the record's base is not the partition's base (HEAD moved after the capture, or a regress was
//                       given another `--base`).
// `applied` names an `inside` path when the record holds it with a hash or `absent` and the live digest is EQUAL.
//
// HONEST SCOPE (P0), and every bound below is also stated where a reader of the stage meets it:
// • AGREEMENT, never PROVENANCE (L43): the open marker, the record and the live bytes agree. The record lives in the
//   git dir, out of the write tools' reach, and a Bash writer can forge it bound to the right marker (L19).
// • It compares the bytes at capture with the bytes now: a build that writes a pre-run path back to its recorded bytes
//   is not seen (the partition never saw a net-zero write either).
// • It never attributes. A path changed before the run — by the user, another session, or AN EARLIER RUN'S BUILD — is
//   reported and not counted. So a re-run of a delivery command after a `scope-escaped` refusal records that escape as
//   pre-run state and does not refuse again: re-running does not clear an escape, it reports it. /pharn-ship's snapshot
//   is the tree at its GATE-1 approval, so anything that changed it before then is pre-run state too.
// • It touches the ESCAPE set only. `inside` is unchanged, so the gates still run on the dirty tree, a pre-run change
//   that breaks a gate still reads as a regression (the named follow-up `regress-base-pre-run-overlay`), and a
//   pre-run-changed test file stays inside — not compared by /pharn-regress (/pharn-verify still runs it at HEAD).
// • /pharn-loop's commit never holds a subtracted path (it stages plan scope ∪ this feature's artifacts ∪ pinned tests),
//   so a green loop's branch is not the whole tree its gates ran on; and a committed REGRESSION.md names those paths.
//
// TRUST (P2): every operand is deterministic-tool output (git paths, digests, marker bytes) or a record's JSON. A
// record's paths are only compared — never opened; the execution half hashes only paths git printed. Values are
// compared as strings; nothing is evaluated, executed or interpolated into a message. TOTAL (L62): every function
// returns for any parsed-JSON input.

import { FEATURE_SLUG_RE, SHA_RE } from "./gate-run-core.mjs";
import { DELIVERY_COMMANDS } from "./stage-regress-core.mjs";
import { deliveryRunIdentity } from "./regress-base-reuse-core.mjs";

export const SNAPSHOT_SCHEMA = "pharn-pre-run-snapshot/1";
/** The record's file name inside `git rev-parse --absolute-git-dir` (pre-run-snapshot.mjs resolves the directory). */
export const SNAPSHOT_BASENAME = "pharn-pre-run-snapshot.json";
/** 6.42.0 (loop-entry-preflight, review R1): the paths a delivery run's ENTRY GATES changed (entry-gates.mjs `--wait`),
 *  in a SECOND record of exactly this shape, schema, validator and decision — beside the snapshot, bound to the same run
 *  marker. Its paths changed after the snapshot, by the run's own entry gates, so they are not build escapes either while
 *  they hold the recorded bytes. Reported apart (regression-report.json `entry_gate_changes`). */
export const ENTRY_CHANGES_BASENAME = "pharn-entry-gate-changes.json";
/** Read cap in bytes, so a planted huge file is `snapshot-malformed`, never a memory spike. */
export const SNAPSHOT_MAX_BYTES = 64 * 1024 * 1024;
/** A file larger than this digests as UNHASHABLE: `hashFile` reads a whole file into memory (GRILL #15). */
export const DIGEST_MAX_BYTES = 64 * 1024 * 1024;
/** The longest path a record may hold (a longer one makes the record malformed). */
export const PATH_MAX_CHARS = 4096;

export const DIGEST_ABSENT = "absent";
export const DIGEST_UNHASHABLE = "unhashable";

/** Why no path was subtracted, in the decision's evaluation order (first failure decides). */
export const PRE_RUN_MISSES = Object.freeze(["no-delivery-run", "no-snapshot", "snapshot-malformed", "other-run", "base-changed"]);
/** Every status a partition reports: `applied` (the record was used) or a miss. */
export const PRE_RUN_STATUSES = Object.freeze(["applied", ...PRE_RUN_MISSES]);

/** The capture CLI's closed refusal vocabulary (exit 2). `crashed` is a throw the CLI caught; a module that cannot load
 *  is node's own exit 1, which every caller reads as a stop too. */
export const REASON_CODES = Object.freeze([
  "usage-error",
  "no-delivery-run",
  "already-captured",
  "git-failed",
  "git-dir-unresolved",
  "write-failed",
  "crashed",
]);

const HEX64_RE = /^[0-9a-f]{64}$/;
const RECORD_KEYS = Object.freeze(["schema", "feature", "run", "base", "paths"]);

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function hasExactKeys(o, keys) {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => Object.hasOwn(o, x));
}

/** Is `d` a digest this record grammar admits? */
export function isDigest(d) {
  return d === DIGEST_ABSENT || d === DIGEST_UNHASHABLE || (typeof d === "string" && HEX64_RE.test(d));
}

function isRecordPath(p) {
  return typeof p === "string" && p.length > 0 && p.length <= PATH_MAX_CHARS && !p.includes("\0");
}

function byPath(a, b) {
  return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
}

/** The record the execution half writes. `run` is `{command, markerSha256}`; `paths` is `[[path, digest], …]` in any
 *  order — it is sorted here and must be unique (a duplicate is a caller defect, thrown: changedPaths de-duplicates). */
export function buildSnapshot({ feature, run, base, paths }) {
  const sorted = paths.map(([p, d]) => [p, d]).sort(byPath);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1][0] === sorted[i][0]) throw new Error("internal: a pre-run snapshot path is listed twice");
  }
  return {
    schema: SNAPSHOT_SCHEMA,
    feature,
    run: { command: run.command, marker_sha256: run.markerSha256 },
    base,
    paths: sorted,
  };
}

/** The record's CLOSED shape, in both directions. Fail-closed: anything else reads as `snapshot-malformed`. */
export function validateSnapshot(r) {
  if (!isPlainObject(r) || !hasExactKeys(r, RECORD_KEYS)) return { ok: false, reason: "the record's keys are not exactly the schema's" };
  if (r.schema !== SNAPSHOT_SCHEMA) return { ok: false, reason: "record.schema is not this version" };
  if (typeof r.feature !== "string" || !FEATURE_SLUG_RE.test(r.feature)) return { ok: false, reason: "record.feature is not a plain slug" };
  if (!isPlainObject(r.run) || !hasExactKeys(r.run, ["command", "marker_sha256"]))
    return { ok: false, reason: "record.run is not {command, marker_sha256}" };
  if (!DELIVERY_COMMANDS.includes(r.run.command)) return { ok: false, reason: "record.run.command is not a delivery command" };
  if (typeof r.run.marker_sha256 !== "string" || !HEX64_RE.test(r.run.marker_sha256))
    return { ok: false, reason: "record.run.marker_sha256 is not a sha256" };
  if (typeof r.base !== "string" || !SHA_RE.test(r.base)) return { ok: false, reason: "record.base is not a 40-hex commit" };
  if (!Array.isArray(r.paths)) return { ok: false, reason: "record.paths is not an array" };
  let prev = null;
  for (const pair of r.paths) {
    if (!Array.isArray(pair) || pair.length !== 2 || !isRecordPath(pair[0]) || !isDigest(pair[1])) {
      return { ok: false, reason: "record.paths holds an entry that is not [path, digest]" };
    }
    if (prev !== null && !(prev < pair[0])) return { ok: false, reason: "record.paths is not sorted and unique" };
    prev = pair[0];
  }
  return { ok: true };
}

/** Is `rec` (a validated record) bound to the run `id` (a `deliveryRunIdentity` HIT) for `feature`? */
export function boundToRun(rec, feature, id) {
  return rec.feature === feature && rec.run.command === id.command && rec.run.marker_sha256 === id.markerSha256;
}

function parseJson(bytes) {
  try {
    return { ok: true, value: JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString("utf8") : String(bytes)) };
  } catch {
    return { ok: false };
  }
}

/** A read of the record (`{state: "absent" | "unusable" | "ok", bytes}`) → `{ok: true, value}` for a valid record, or
 *  `{ok: false, absent}` — `absent` true only when nothing stood at the path. */
export function parseRecord(read) {
  if (!isPlainObject(read) || read.state === "absent") return { ok: false, absent: true };
  if (read.state !== "ok") return { ok: false, absent: false };
  const p = parseJson(read.bytes);
  if (!p.ok || !validateSnapshot(p.value).ok) return { ok: false, absent: false };
  return { ok: true, value: p.value };
}

function miss(status) {
  if (!PRE_RUN_MISSES.includes(status)) throw new Error(`internal: '${status}' is not a PRE_RUN_MISSES member`);
  return { status, unchanged: [] };
}

/**
 * THE DECISION. Every input is read by the caller in THIS invocation:
 *   feature, base (40-hex) — the partition's own;
 *   markers, now — the delivery-run identity (regress-base-reuse-core `deliveryRunIdentity`);
 *   record — `{state: "absent" | "unusable" | "ok", bytes}` for the git-dir record;
 *   inside — the partition's changed paths, as git printed them;
 *   liveDigest(path) — the digest of `path` now, by the same function the capture used.
 * Returns `{status, unchanged}`: `unchanged` ⊆ `inside`, in `inside`'s order, empty on every miss. `liveDigest` is called
 * only for an `inside` path the record holds with a hash or `absent` — a record path not in `inside` is never looked at.
 * The caller (`partitionScope`) subtracts only the undeclared, non-exempt members of `unchanged` and reports those.
 */
export function decidePreRun(i) {
  const id = deliveryRunIdentity({ markers: i.markers, now: i.now });
  if (!id.ok) return miss("no-delivery-run");
  const rec = parseRecord(i.record);
  if (!rec.ok) return miss(rec.absent ? "no-snapshot" : "snapshot-malformed");
  if (!boundToRun(rec.value, i.feature, id)) return miss("other-run");
  if (rec.value.base !== i.base) return miss("base-changed");
  const recorded = new Map(rec.value.paths);
  const unchanged = [];
  for (const p of Array.isArray(i.inside) ? i.inside : []) {
    const d = recorded.get(p);
    if (d === undefined || d === DIGEST_UNHASHABLE) continue;
    if (i.liveDigest(p) === d) unchanged.push(p);
  }
  return { status: "applied", unchanged };
}

/** 6.42.0 (loop-entry-preflight, review R1) — the ONE split both partition callers (stage-regress.mjs,
 *  quick-scope-core.mjs) make of the paths `partitionScope` subtracted: the snapshot's block, exactly as before, and the
 *  entry gates' block — `null` (so no key is written) unless an entry record is there (any status but `no-delivery-run`
 *  / `no-snapshot`), so a run without one writes the bytes it wrote before. A path both records hold is reported once,
 *  in the snapshot's block. */
export function entryBlocks(preRunDecision, entryDecision, subtracted) {
  const pre = new Set(preRunDecision.unchanged);
  const ent = new Set(entryDecision.unchanged);
  const preRunBlock = { status: preRunDecision.status, unchanged: subtracted.filter((p) => pre.has(p)) };
  const present = entryDecision.status !== "no-delivery-run" && entryDecision.status !== "no-snapshot";
  const entryBlock = present ? { status: entryDecision.status, unchanged: subtracted.filter((p) => ent.has(p) && !pre.has(p)) } : null;
  return { preRunBlock, entryBlock };
}
