// pharn/floor/install-drift.mjs — THE HEAD INSTALL CHECK, the disk half (6.40.0, regress-head-install-drift). It reads
// what `install-drift-core.mjs` decides over — the project root's package.json and lockfile entries, the npm lockfile,
// `node_modules` and npm's record in it — and stores and re-reads the stage's report block. No CLI (nothing runs it
// alone; P7): `stage-regress.mjs` (head-init) and `stage-verify.mjs` (init) import it, and `readInstallCheck` +
// `refuses` are exported for a later caller — the named follow-up `entry-preflight-install-drift` (a `/pharn-loop` /
// `/pharn-ship` entry pre-flight). The rule, its states and its bounds are the core's header (P4, cited not restated).
//
// READS, AND HOW (L59). Presence of a name (package.json, each LOCKFILE_FAMILIES member) is `lstat` — an entry of any
// kind at that name, the way INSTALL_RULE's `git cat-file -e` counts one at the base commit. Every READ follows links on
// purpose — a symlinked `node_modules` is a real layout, and npm reads through it too — and is preceded by a `stat` of
// the target: only a regular file is read (a FIFO is never opened, so a read can never block) and only a directory is
// entered. A dangling link reads as absent; any other stat error (ELOOP, EACCES) reads as unreadable. Nothing here is
// written but the stage's own record, through `recordInstallCheck`, under the stage's `.pharn/` scratch.
//
// NO DEFAULT ROOT (L41): `readInstallCheck(root)` throws without one; the stage scripts pass ".", the project root they
// run from.
//
// Read-only, no network, no child process. Cost: two JSON parses (the lockfile and npm's record).

import { lstatSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOCKFILE_FAMILIES } from "./stage-regress-core.mjs";
import {
  installCheck,
  headInstallBlock,
  validateHeadInstallBlock,
  refuses,
  NPM_LOCKFILES,
  NPM_HIDDEN_LOCKFILE,
} from "./install-drift-core.mjs";

export { refuses };

/** An entry of any kind at `path` (a dangling link included) — never followed. */
function present(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/** The kind of what `path` resolves to: "file" | "dir" | "other" | "absent" | "error". Follows links. */
function kindOf(path) {
  try {
    const s = statSync(path);
    if (s.isFile()) return "file";
    if (s.isDirectory()) return "dir";
    return "other";
  } catch (e) {
    return e && (e.code === "ENOENT" || e.code === "ENOTDIR") ? "absent" : "error";
  }
}

/** A regular file of JSON → {kind: "ok", value}; absent → {kind: "absent"}; anything else → {kind: "unreadable"}. */
function readJson(path) {
  const k = kindOf(path);
  if (k === "absent") return { kind: "absent" };
  if (k !== "file") return { kind: "unreadable" };
  try {
    return { kind: "ok", value: JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    return { kind: "unreadable" };
  }
}

/** Read the tree at `root` and decide (`install-drift-core.mjs` installCheck). Never throws on the tree's content. */
export function readInstallCheck(root) {
  if (typeof root !== "string" || root.length === 0) throw new Error("internal: readInstallCheck requires a root directory");
  const families = {};
  for (const [family, names] of Object.entries(LOCKFILE_FAMILIES)) families[family] = names.some((n) => present(join(root, n)));
  const inputs = { manifest: present(join(root, "package.json")), families, lockfile: null, lock: null, nodeModules: null, hidden: null };
  const onlyNpm = families.npm && Object.entries(families).every(([f, on]) => f === "npm" || !on);
  if (inputs.manifest && onlyNpm) {
    inputs.lockfile = NPM_LOCKFILES.find((n) => present(join(root, n)));
    const lock = readJson(join(root, inputs.lockfile));
    inputs.lock = lock.kind === "ok" ? lock : { kind: "unreadable" };
    const nm = kindOf(join(root, "node_modules"));
    inputs.nodeModules = nm === "dir" ? "dir" : nm === "absent" ? "absent" : "unreadable";
    if (inputs.nodeModules === "dir") inputs.hidden = readJson(join(root, NPM_HIDDEN_LOCKFILE));
  }
  return installCheck(inputs);
}

/** Store a result's report block (enums and integers only) at `path`, under the calling stage's scratch root. */
export function recordInstallCheck(path, result) {
  writeFileSync(path, `${JSON.stringify(headInstallBlock(result), null, 2)}\n`);
}

/** The stored block, validated, or null — absent, unreadable or malformed alike (the block is advisory: a missing one
 *  renders "not recorded", never a refusal and never a made-up state). */
export function readRecordedInstallCheck(path) {
  const r = readJson(path);
  if (r.kind !== "ok") return null;
  return validateHeadInstallBlock(r.value).ok ? r.value : null;
}
