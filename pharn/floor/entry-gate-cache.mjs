// pharn/floor/entry-gate-cache.mjs — the STORAGE half of the entry check's cached-red evidence (gate-evidence-cache,
// Linear CORE-86). The rule, the closed enums and every bound are entry-gate-cache-core.mjs's header; this file reads and
// writes the two git-dir files and captures this run's inputs. No CLI: entry-gates.mjs calls it (P3).
//
// ================================ WHERE EACH PIECE LIVES, AND WHO CAN WRITE IT ================================
// • The RECORD — `<git rev-parse --git-common-dir>/pharn-entry-gate-cache.json`, ONE per repository, so a run in another
//   worktree of it reads the same record. git prints the common dir relative to the working directory in a main checkout,
//   so it is resolved against `process.cwd()`.
// • The start-time INPUTS — `<git rev-parse --absolute-git-dir>/pharn-entry-cache-inputs.json`, per worktree, resolved
//   through regress-base-reuse.mjs `gitDirFile` (the entry-base offer's resolver — L35). `--start` writes it after
//   `run-gates.mjs init`; `--wait` reads it, bound to the runner record's nonce and feature.
// Both are denied to the write tools in the layouts the ★ HOOK test probes (a main checkout: protect-trusted-paths.cjs,
// a `.git` segment; a linked worktree: enforce-writes-scope.cjs, a path inside another git tree — L65). A Bash writer
// reaches both (L19); a forged record can only STOP a run (entry-gate-cache-core.mjs, "WHAT IT DOES NOT CLAIM").
//
// NEVER A NEW FAILURE MODE: every function here RETURNS a failure (null, a `why`), never throws. A lookup that cannot
// read or compute something is a miss, and a write that fails is one stderr note in the caller.
//
// READS are lstat-first and never followed: regress-base-reuse.mjs `readRegularFile` (O_NOFOLLOW, fstat regular, capped).

import { renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gitSync, lstatSafe } from "./stage-runtime.mjs";
import { gitDirFile, readRegularFile } from "./regress-base-reuse.mjs";
import { hashFile } from "./reconcile-baseline.mjs";
import { loadGateExclusion } from "./gate-exclusion-core.mjs";
import { fingerprint } from "./worktree-fingerprint.mjs";
import {
  CACHE_BASENAME,
  INPUTS_BASENAME,
  INPUTS_SCHEMA,
  INSTALL_FILES,
  RECORD_MAX_BYTES,
  inputsDefect,
  recordDefect,
} from "./entry-gate-cache-core.mjs";

/** `<git common dir>/<name>`, or null when git cannot name it. */
export function commonDirFile(name) {
  const r = gitSync(["rev-parse", "--git-common-dir"]);
  if (!r.ok) return null;
  const dir = r.stdout.trim();
  return dir === "" ? null : join(resolve(process.cwd(), dir), name);
}

/** The record's path, or null. */
export function cachePath() {
  return commonDirFile(CACHE_BASENAME);
}

/** The start-time inputs' path, or null. */
export function inputsPath() {
  return gitDirFile(INPUTS_BASENAME);
}

function readJsonAt(path, defect) {
  if (path === null) return { state: "absent" };
  const r = readRegularFile(path, RECORD_MAX_BYTES);
  if (r.state !== "ok") return { state: r.state };
  let value;
  try {
    value = JSON.parse(r.bytes.toString("utf8"));
  } catch {
    return { state: "unusable" };
  }
  return defect(value) === null ? { state: "ok", value } : { state: "unusable" };
}

function writeJsonAt(path, obj) {
  if (path === null) return { ok: false, why: "git-dir-unresolved" };
  const tmp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, { flag: "wx" });
    renameSync(tmp, path);
    return { ok: true };
  } catch {
    try {
      rmSync(tmp, { force: true });
    } catch {
      /* nothing to clean */
    }
    return { ok: false, why: "write-failed" };
  }
}

/** Remove the file at `path` (a planted directory recursively). `{ok: true, removed}` or `{ok: false, why}`. */
function removeAt(path) {
  if (path === null) return { ok: false, why: "git-dir-unresolved" };
  try {
    const st = lstatSafe(path);
    if (!st.ok) return { ok: false, why: "lstat-failed" };
    if (st.stat === null) return { ok: true, removed: false };
    if (st.stat.isFile() || st.stat.isSymbolicLink()) unlinkSync(path);
    else rmSync(path, { recursive: true, force: true });
    return { ok: true, removed: true };
  } catch {
    return { ok: false, why: "remove-failed" };
  }
}

/** The record as read: `{state: absent | unusable | ok, value?}` — a defective record is `unusable`. */
export function readCache() {
  return readJsonAt(cachePath(), recordDefect);
}

/** Write the record atomically. `{ok: true}` or `{ok: false, why}`. */
export function writeCache(record) {
  return writeJsonAt(cachePath(), record);
}

/** Clear the slot. `{ok: true, removed}` or `{ok: false, why}`. */
export function clearCache() {
  return removeAt(cachePath());
}

/** The start-time inputs as read: `{state, value?}`. */
export function readInputs() {
  return readJsonAt(inputsPath(), inputsDefect);
}

/** Write the start-time inputs. `{ok: true}` or `{ok: false, why}`. */
export function writeInputs(inputs) {
  return writeJsonAt(inputsPath(), inputs);
}

/** Remove an earlier run's inputs (`--start`, beside the offer's discard — L66). */
export function discardInputs() {
  return removeAt(inputsPath());
}

/** The node that runs PHARN's floor, which is the `node` on the PATH the gates' `npm run` inherits. */
export function nodeIdentity() {
  return `${process.version} ${process.platform}-${process.arch}`;
}

/** Every INSTALL_FILES member with its content digest (null when absent), in INSTALL_FILES order. */
export function installState(cwd = process.cwd()) {
  return INSTALL_FILES.map((p) => [p, hashFile(join(cwd, p))]);
}

/**
 * This run's inputs at `--start`, or null when any of them cannot be computed (no prefix, an exclusion that refuses).
 * Never throws: a throw is null, which the lookup reads as `inputs-unavailable` and the record step as not cacheable.
 */
export function captureInputs({ feature, nonce, timeoutMs, measuredAt }) {
  try {
    const p = gitSync(["rev-parse", "--show-prefix"]);
    if (!p.ok) return null;
    const x = loadGateExclusion(process.cwd());
    if (!x.ok) return null;
    const inputs = {
      schema: INPUTS_SCHEMA,
      feature,
      nonce,
      measured_at: measuredAt,
      node: nodeIdentity(),
      prefix: p.stdout.trim(),
      timeout_ms: timeoutMs,
      exclude: [...new Set(x.exclude)].sort(),
      install: installState(),
    };
    return inputsDefect(inputs) === null ? inputs : null;
  } catch {
    return null;
  }
}

/** This tree's entry fingerprint with the source run's feature directory excluded too: `{algo, digest}` or null. */
export function treeExcluding(feature, sourceFeature) {
  try {
    const fp = fingerprint(".", { feature, stage: "entry", alsoExclude: sourceFeature });
    return fp.ok ? { algo: fp.algo, digest: fp.digest } : null;
  } catch {
    return null;
  }
}
