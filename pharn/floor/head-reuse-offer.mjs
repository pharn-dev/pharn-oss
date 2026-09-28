// pharn/floor/head-reuse-offer.mjs — the OFFER through which /pharn-regress makes its finalized HEAD stamp available to
// /pharn-verify's per-entry gate reuse (verify-head-gate-reuse, 6.34.0; grill B2): its record, its storage and its
// acceptance rule. No CLI: `stage-regress.mjs` discards and publishes it, `stage-verify.mjs` reads it and applies
// `acceptReuseSource`. One axis (P3): this file changes when "WHICH source is offered, and how it is kept" changes; what
// makes two executions equivalent is `gate-reuse-core.mjs`, which the runner loads without this file (GATE-2 review:
// the runner's load graph carries no regress-stage module).
//
// ================================ WHERE IT LIVES, AND WHO CAN WRITE IT ================================
// `<git rev-parse --absolute-git-dir>/pharn-regress-head-offer.json` (OFFER_BASENAME), resolved through
// regress-base-reuse.mjs `gitDirFile` — the BASE-reuse record's own resolver and reasoning (L65). The HEAD stamp itself
// sits in `.pharn/pharn-regress/head/`, which the write tools can ALWAYS write, so a stamp alone — planted by a build
// under `--quick`, where no regress runs — must never be offered. The git dir is out of the write tools' reach in the
// layouts the ★ HOOK test probes: a main checkout (`protect-trusted-paths.cjs` denies a `.git` segment) and a linked
// worktree (`enforce-writes-scope.cjs` denies a path inside another git tree, in every posture). NOT in every layout
// (GATE-2 review, measured): a SEPARATE git dir (`git init --separate-git-dir`) under an allowed temp root, in an
// INSTALLED project with NO run open, is writable by the Write tool — the install posture's permissive default admits
// an ordinary temp path. With a run open (the only time an offer is read) that default is fail-closed and denies it.
// The same bound covers the 6.33.0 BASE record through the shared `gitDirFile`. The offer binds the stamp's bytes by
// sha256 and the delivery run by its marker's digest (`deliveryRunIdentity`, never parsed), so a planted offer must
// also name a marker digest that exists only once that run opens.
//
// LIFECYCLE: `/pharn-regress`'s fresh start DISCARDS the offer (before the HEAD side runs); once the HEAD stamp is
// finalized it PUBLISHES one for the run whose marker it sees — none without exactly one open /pharn-loop or /pharn-ship
// marker. /pharn-verify only reads. A resumed regress re-publishes the same bytes (its drain is an idempotent repeat).
//
// WHAT REMAINS WRITABLE, stated (P0): a Bash writer reaches the git dir and `.pharn/` alike (L19) and can forge the offer
// and the stamp together; nothing detects it. The markers are in `.pharn/`, so restoring an earlier run's marker bytes
// re-binds that run's offer. A write-tool edit of the stamp or its logs after publication reads as a miss.
//
// NEVER A NEW FAILURE MODE: publishing and discarding RETURN a failure, never throw. A discard that could not remove a
// stale offer leaves one that names an older stamp's bytes: the next publish's rename fails over a non-file (reported),
// and a stale offer can only ever match a stamp byte-identical to the one it bound — equivalent evidence.
//
// TRUST (P2): markers, the offer and the stamp are read as raw bytes, hashed and compared; the offer's JSON is
// shape-checked closed before any field is compared. TOTAL (L62).

import { writeFileSync, renameSync, rmSync, unlinkSync } from "node:fs";
import { lstatSafe } from "./stage-runtime.mjs";
import { gitDirFile, readMarkers, readInProject, readRegularFile, HEAD_STAMP } from "./regress-base-reuse.mjs";
import { deliveryRunIdentity, STAMP_MAX_BYTES } from "./regress-base-reuse-core.mjs";
import { DELIVERY_COMMANDS } from "./stage-regress-core.mjs";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { REUSE_MISSES, sha256Hex } from "./gate-reuse-core.mjs";

export const OFFER_SCHEMA = "pharn-regress-head-offer/1";
export const OFFER_BASENAME = "pharn-regress-head-offer.json";
export const OFFER_MAX_BYTES = 64 * 1024;
const OFFER_KEYS = Object.freeze(["schema", "feature", "run", "stamp_sha256"]);
const HEX64_RE = /^[0-9a-f]{64}$/;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function refuse(code) {
  if (!REUSE_MISSES.includes(code)) throw new Error(`internal: '${code}' is not a REUSE_MISSES member`);
  return { ok: false, miss: code };
}

/** The offer record. `run` is `deliveryRunIdentity`'s `{command, markerSha256}`. */
export function buildOffer({ feature, run, stampSha256 }) {
  return { schema: OFFER_SCHEMA, feature, run: { command: run.command, marker_sha256: run.markerSha256 }, stamp_sha256: stampSha256 };
}

/** The offer's CLOSED shape, in both directions. */
export function validateOffer(o) {
  if (!isPlainObject(o)) return false;
  const k = Object.keys(o);
  if (k.length !== OFFER_KEYS.length || !OFFER_KEYS.every((x) => Object.hasOwn(o, x))) return false;
  if (o.schema !== OFFER_SCHEMA || typeof o.feature !== "string" || !FEATURE_SLUG_RE.test(o.feature)) return false;
  const r = o.run;
  if (!isPlainObject(r) || Object.keys(r).length !== 2 || !Object.hasOwn(r, "command") || !Object.hasOwn(r, "marker_sha256")) return false;
  if (!DELIVERY_COMMANDS.includes(r.command) || typeof r.marker_sha256 !== "string" || !HEX64_RE.test(r.marker_sha256)) return false;
  return typeof o.stamp_sha256 === "string" && HEX64_RE.test(o.stamp_sha256);
}

/**
 * THE RULE (pure): does THIS delivery run offer its regress/head stamp to /pharn-verify? Every input is read this
 * invocation: `markers` (regress-base-reuse.mjs `readMarkers`), `now`, `offer` and `stamp` — each `{state: "absent" |
 * "unusable" | "ok", bytes}`. The run identity is the BASE-reuse rule itself (`deliveryRunIdentity`, L35). Returns
 * `{ok: true, stampSha256}` — the digest of the exact bytes the offer bound — or `{ok: false, miss}` (REUSE_MISSES).
 */
export function acceptReuseSource({ feature, markers, now, offer, stamp }) {
  const id = deliveryRunIdentity({ markers, now });
  if (!id.ok) return refuse("no-delivery-run");
  if (!isPlainObject(offer) || offer.state === "absent") return refuse("no-offer");
  if (offer.state !== "ok" || !Buffer.isBuffer(offer.bytes)) return refuse("offer-malformed");
  let o;
  try {
    o = JSON.parse(offer.bytes.toString("utf8"));
  } catch {
    return refuse("offer-malformed");
  }
  if (!validateOffer(o)) return refuse("offer-malformed");
  if (o.feature !== feature || o.run.command !== id.command || o.run.marker_sha256 !== id.markerSha256) return refuse("other-run");
  if (!isPlainObject(stamp) || stamp.state === "absent") return refuse("source-absent");
  if (stamp.state !== "ok" || !Buffer.isBuffer(stamp.bytes)) return refuse("source-unusable");
  const sha = sha256Hex(stamp.bytes);
  if (sha !== o.stamp_sha256) return refuse("source-unbound");
  return { ok: true, stampSha256: sha };
}

/** The offer's path, or null when git cannot name the git dir. */
export function offerPath() {
  return gitDirFile(OFFER_BASENAME);
}

/** Read the offer without following a link: `{state: "absent" | "unusable" | "ok", bytes}`. No git dir reads as absent. */
export function readOffer() {
  const p = offerPath();
  return p === null ? { state: "absent" } : readRegularFile(p, OFFER_MAX_BYTES);
}

/** Remove the offer. Idempotent. A planted directory is removed recursively. Returns `{ok: true}` or `{ok: false, why}`
 *  — never throws (see NEVER A NEW FAILURE MODE above). */
export function discardOffer() {
  const p = offerPath();
  if (p === null) return { ok: true };
  try {
    const st = lstatSafe(p);
    if (!st.ok) return { ok: false, why: "lstat-failed" };
    if (st.stat === null) return { ok: true };
    if (st.stat.isFile() || st.stat.isSymbolicLink()) unlinkSync(p);
    else rmSync(p, { recursive: true, force: true });
    return { ok: true };
  } catch {
    return { ok: false, why: "remove-failed" };
  }
}

/**
 * Publish the offer for the finalized HEAD stamp now on disk, bound to the delivery run whose marker is open for
 * `feature`. Returns `{published: true}` or `{published: false, why}` — `no-delivery-run`, `git-dir-unresolved`,
 * `source-unusable` or `write-failed`. Never throws for a filesystem failure.
 */
export function publishOffer(feature) {
  const id = deliveryRunIdentity({ markers: readMarkers(feature), now: Date.now() });
  if (!id.ok) return { published: false, why: "no-delivery-run" };
  const p = offerPath();
  if (p === null) return { published: false, why: "git-dir-unresolved" };
  const stamp = readInProject(HEAD_STAMP, STAMP_MAX_BYTES);
  if (stamp.state !== "ok") return { published: false, why: "source-unusable" };
  const offer = buildOffer({ feature, run: { command: id.command, markerSha256: id.markerSha256 }, stampSha256: sha256Hex(stamp.bytes) });
  if (!validateOffer(offer)) throw new Error("internal: refusing to publish a malformed head-reuse offer");
  const tmp = `${p}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, `${JSON.stringify(offer, null, 2)}\n`);
    renameSync(tmp, p);
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
