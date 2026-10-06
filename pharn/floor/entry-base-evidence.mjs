// pharn/floor/entry-base-evidence.mjs — the EXECUTION half of /pharn-regress's ENTRY-derived BASE evidence
// (entry-run-as-base-evidence, 6.49.0). It publishes and discards the entry OFFER, reads every input the pure predicate
// (`entry-base-evidence-core.mjs`, which states the rule and its bounds) needs, and MATERIALIZES the entry-derived BASE
// stamp. No CLI: `entry-gates.mjs` publishes and discards, `stage-regress.mjs` decides and materializes. It changes when
// the STORAGE changes; the core when a RULE does (P3).
//
// ================================ WHERE EACH PIECE LIVES, AND WHO CAN WRITE IT ================================
// • The OFFER — the binding a later regress compares against — is `<git rev-parse --absolute-git-dir>/`
//   `pharn-entry-base-offer.json`, resolved through regress-base-reuse.mjs `gitDirFile` (the resolver of 6.33.0's record,
//   6.34.0's HEAD offer and 6.37.0's snapshot, L35). The write tools are denied the git dir in the layouts the ★ HOOK test
//   probes (a main checkout: protect-trusted-paths.cjs, a `.git` segment; a linked worktree: enforce-writes-scope.cjs, a
//   path in another git tree), with 6.34.0's named separate-git-dir bound. It is published ONLY by `entry-gates.mjs
//   --wait` after every one of its checks passed, for a green or red verdict, and discarded by every `--start` (L66:
//   regress never reads whatever happens to remain in `.pharn/pharn-entry/` — only a source an offer binds by sha256).
// • The SOURCE stays where the runner wrote it: `.pharn/pharn-entry/gates/` (the stamp and each gate's logs), which the
//   write tools reach. The offer binds the stamp's bytes and the stamp binds each log's, so an edit reads as a MISS.
// • The DERIVED stamp is written into `.pharn/pharn-regress/base-gates/` — where check-loop-fresh.mjs and the verdict read
//   a BASE stamp — from scratch, after the verdict-time re-decision: each copied log is verified against the entry
//   stamp's digest before it is written and re-hashed after (the run-gates.mjs `tryReuse` discipline), the stamp last.
//
// WHAT REMAINS WRITABLE, stated (P0): a Bash writer reaches the git dir and `.pharn/` alike (L19) and can forge the offer,
// the snapshot, the marker and the evidence together; nothing detects it. The derived stamp itself is `.pharn/` state:
// after the verdict, check-loop-fresh.mjs D/E/J re-bind it to the report and its logs, nothing more.
//
// ================================ READS — lstat-first, never followed (L54, L59) ================================
// Every read goes through regress-base-reuse.mjs `readInProject` (containment-walked, O_NOFOLLOW|O_NONBLOCK,
// fstat-checked, capped) or `readRegularFile` (the git dir, which a linked worktree keeps outside the project): a link,
// a FIFO, a directory, an oversize or an unreadable file is `unusable` — a miss, never followed.
//
// NEVER A NEW FAILURE MODE: publishing and discarding RETURN a failure, never throw; a deciding read that fails is a
// MISS. A materialization failure is returned as `log-unverified`, and the caller runs the BASE side.

import { writeFileSync, renameSync, rmSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { lstatSafe } from "./stage-runtime.mjs";
import { gitDirFile, readMarkers, readInProject, readRegularFile, HEAD_STAMP } from "./regress-base-reuse.mjs";
import { deliveryRunIdentity, STAMP_MAX_BYTES } from "./regress-base-reuse-core.mjs";
import { REGRESS_PATHS } from "./stage-regress-core.mjs";
import { ENTRY_PATHS } from "./entry-gates-core.mjs";
import { readSnapshot } from "./pre-run-snapshot.mjs";
import { sha256RegularFile } from "./run-gates.mjs";
import {
  OFFER_BASENAME,
  OFFER_MAX_BYTES,
  buildOffer,
  validateOffer,
  decideEntryBase,
  derivedBaseStamp,
  logPlan,
  sha256Hex,
} from "./entry-base-evidence-core.mjs";

/** The largest entry log copied into the derived evidence. A larger one is `log-unverified` (the BASE side then runs). */
export const LOG_MAX_BYTES = 64 * 1024 * 1024;

/** The offer's path, or null when git cannot name the git dir. */
export function offerPath() {
  return gitDirFile(OFFER_BASENAME);
}

/** Read the offer without following a link: `{state: "absent" | "unusable" | "ok", bytes}`. No git dir reads as absent. */
export function readOffer() {
  const p = offerPath();
  return p === null ? { state: "absent" } : readRegularFile(p, OFFER_MAX_BYTES);
}

/** Remove the offer (entry-gates.mjs `--start`). Idempotent; a planted directory is removed recursively. Returns
 *  `{ok: true}` or `{ok: false, why}` — never throws. */
export function discardEntryOffer() {
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
 * Publish the offer for a VALIDATED, completed entry run (entry-gates.mjs `--wait`, after `entryVerdict`, green or red
 * only). `stampBytes` are the exact bytes `--wait` hashed and validated. Bound to the delivery run whose marker is open
 * for `feature` now. Returns `{published: true}` or `{published: false, why}` — `no-delivery-run`, `git-dir-unresolved`,
 * `malformed` or `write-failed`. Never throws.
 */
export function publishEntryOffer({ feature, nonce, stampBytes, base, timeoutMs, d0, featureDir }) {
  try {
    const id = deliveryRunIdentity({ markers: readMarkers(feature), now: Date.now() });
    if (!id.ok) return { published: false, why: "no-delivery-run" };
    const p = offerPath();
    if (p === null) return { published: false, why: "git-dir-unresolved" };
    const offer = buildOffer({
      feature,
      run: { command: id.command, markerSha256: id.markerSha256 },
      nonce,
      base,
      stampSha256: sha256Hex(stampBytes),
      timeoutMs,
      d0,
      featureDir,
    });
    if (!validateOffer(offer)) return { published: false, why: "malformed" };
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
  } catch {
    return { published: false, why: "write-failed" };
  }
}

function parsedOrNull(read) {
  if (read.state !== "ok") return null;
  try {
    return JSON.parse(read.bytes.toString("utf8"));
  } catch {
    return null;
  }
}

/** Read every input the predicate needs — in THIS invocation — and decide (`decideEntryBase`'s `{decision, detail}`). */
export function decideEntryFromDisk({ feature, base, timeoutMs, installOverride }) {
  return decideEntryBase({
    feature,
    base,
    timeoutMs,
    installOverride,
    headRecord: parsedOrNull(readInProject(HEAD_STAMP, STAMP_MAX_BYTES)),
    markers: readMarkers(feature),
    now: Date.now(),
    offer: readOffer(),
    snapshot: readSnapshot(),
    entryStamp: readInProject(ENTRY_PATHS.stamp, STAMP_MAX_BYTES),
  });
}

/**
 * Write the entry-derived BASE evidence for a HIT's `detail` into `.pharn/pharn-regress/base-gates/`, from scratch: each
 * log verified against the entry stamp's digest before the write and re-hashed after it, a `no-files` slot's empty logs,
 * then the stamp (tmp + rename) LAST. Returns `{ok: true, stampSha256}` or `{ok: false, miss: "log-unverified"}`; on a
 * failure the partial directory is removed, so no derived stamp is ever left without its logs.
 */
export function materializeEntryBase({ feature, base, detail, entryStampSha256 }) {
  const dir = REGRESS_PATHS.baseGates;
  const fail = () => {
    rmSync(dir, { recursive: true, force: true });
    return { ok: false, miss: "log-unverified" };
  };
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const c of logPlan(detail)) {
    if (typeof c.sha256 !== "string") return fail();
    let bytes = Buffer.alloc(0);
    if (c.from !== null) {
      const r = readInProject(`${ENTRY_PATHS.gates}/${c.from}`, LOG_MAX_BYTES);
      if (r.state !== "ok" || sha256Hex(r.bytes) !== c.sha256) return fail();
      bytes = r.bytes;
    }
    const to = join(dir, c.to);
    writeFileSync(to, bytes);
    if (sha256RegularFile(to) !== c.sha256) return fail();
  }
  const stamp = derivedBaseStamp({ feature, base, detail, entryStampSha256 });
  const text = JSON.stringify(stamp, null, 2);
  const target = join(dir, "stamp.json");
  const tmp = `${target}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, target);
  return { ok: true, stampSha256: sha256Hex(Buffer.from(text)) };
}
