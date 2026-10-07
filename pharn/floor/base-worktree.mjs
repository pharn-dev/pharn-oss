// pharn/floor/base-worktree.mjs — WHERE /pharn-regress's BASE checkout lives (regress-base-integrity, P2-D of the
// 2026-10-07 production-readiness audit). One axis (P3): this module changes when the placement, naming or clearing of
// the BASE worktree changes, never when a regress rule does. No CLI; stage-regress.mjs is its only caller.
//
// ===================================== THE RECORDED FAILURE (P7) =====================================
// Until 6.49.x the BASE worktree was `.pharn/pharn-regress/base`, NESTED inside the project. Node's module resolution
// walks every ancestor's `node_modules`, and npm's run-script prepends every ancestor's `node_modules/.bin` to PATH, so
// a base gate reached the HEAD tree's dependencies whenever the base did not shadow them — reproduced (audit fixture f6):
// with `--no-install`, the base `test` imported `<project>/node_modules/mydep` and the base `typecheck` ran
// `<project>/node_modules/.bin/mytool`. A dependency-induced regression was then red on BOTH sides and read
// `pre_existing`. The same walk reaches a package the HEAD tree added after a successful base install.
//
// =========================================== THE PLACEMENT ===========================================
// The checkout is a fresh `mkdtempSync` directory in the REAL temp root (`realpathSync(os.tmpdir())`), named
// `pharn-regress-base-<tag>-<6 random>` where `<tag>` is the first 12 hex of sha256(realpath of the invoking project).
// The tag binds a name to ONE project checkout, so the prefix clear below never touches another worktree's run (several
// linked worktrees of one repository share `git worktree list`). A temp root that sits inside the project (a TMPDIR
// pointing into it) would re-create the nesting, so it is refused (`placementError`), never used.
//
// THE CLEAR (`clearBaseWorktrees`), run at every fresh start and before every `worktree add`: (1) every REGISTERED
// worktree whose path is `<temp root>/<this project's prefix>*` is force-removed (`--force` twice: a kill mid-`add`
// leaves it git-locked, 6.23.0's A3/N7); (2) every entry of the temp root under this project's prefix is lstat'd — a
// symlink is unlinked, NEVER followed; a real directory owned by this uid is removed; anything else (another user's
// entry in a shared /tmp) is left alone; (3) the LEGACY nested path is cleared the same way an upgrade leftover was
// before; (4) `git worktree prune`. Every step is best-effort and never throws: an absent worktree is the normal case.
//
// RESUME (`isOurBaseDir`): the path is persisted in `.pharn/pharn-regress/stage.json`, which the write tools and Bash
// reach. A recorded path is used only if it is exactly `<temp root>/<this project's prefix><6 chars>`; anything else is
// `progress-malformed` to the caller, so a forged record cannot aim a removal at another directory.
//
// =============================================== BOUNDS ===============================================
// • ADVISORY, a tested structural property — not a floor primitive (P0): the HEAD tree is no longer an ancestor, so
//   Node/npm's ancestor walks cannot reach it. Still reachable, by design of those tools: an inherited NODE_PATH,
//   `$HOME/.node_modules` and global folders, and a `node_modules` in an ancestor of the temp root.
// • The path is ABSOLUTE and machine-local. It is handed to git and to run-gates.mjs `--cwd` as an argv element, never to
//   a shell or a renderer; a git error that quotes it is redacted (`redact`) before REGRESSION.md renders it (G10).
// • A hard kill leaves the directory and its registration behind until the next fresh start of the same project; an OS
//   temp sweep that deletes it first leaves a registration `git worktree prune` clears.
// • A RESUME checks the recorded path's shape, not that the directory still exists: a pause across a temp sweep or a
//   reboot ends in `child-refused` at the next base step, and a TMPDIR changed between invocations in
//   `progress-malformed`. Both stop; the remedy is a fresh run.

import { createHash } from "node:crypto";
import { lstatSync, mkdtempSync, readdirSync, realpathSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";
import { gitSync } from "./stage-runtime.mjs";

export const NAME_STEM = "pharn-regress-base-";
const SUFFIX_RE = /^[A-Za-z0-9]{6}$/;
export const REDACTED = "<base worktree>";

/** The real temp root, or null when it cannot be resolved. */
export function tempRoot() {
  try {
    return realpathSync(tmpdir());
  } catch {
    return null;
  }
}

/** The name prefix that binds a base checkout to ONE project checkout (its realpath). */
export function namePrefix(projectReal) {
  return `${NAME_STEM}${createHash("sha256").update(projectReal).digest("hex").slice(0, 12)}-`;
}

/** Why `root` cannot hold the base checkout of `projectReal`, or null. Equal, or inside the project, re-creates the
 *  nesting this module exists to remove. Pure. */
export function placementError(projectReal, root) {
  if (typeof root !== "string" || !isAbsolute(root)) return "the temp directory could not be resolved to an absolute path";
  const rel = relative(projectReal, root);
  // Outside means `..` itself or a path that starts with `../` — a sibling named `..foo` inside the project is INSIDE.
  const outside = rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  if (rel === "" || !outside) {
    return `the temp directory ${JSON.stringify(root)} is inside the project, so the base checkout would be nested in it again (set TMPDIR outside the project)`;
  }
  return null;
}

/** Create a fresh, empty base directory for this project. `{ok: true, path}` or `{ok: false, reason}`; never throws. */
export function createBaseDir(projectReal, root = tempRoot()) {
  const why = placementError(projectReal, root);
  if (why !== null) return { ok: false, reason: why };
  try {
    return { ok: true, path: mkdtempSync(join(root, namePrefix(projectReal))) };
  } catch (e) {
    return { ok: false, reason: `could not create a directory in ${JSON.stringify(root)}: ${e && e.code ? e.code : "error"}` };
  }
}

/** Is `p` exactly a base directory this module would create for this project? Pure over its inputs. */
export function isOurBaseDir(p, projectReal, root = tempRoot()) {
  if (typeof p !== "string" || root === null || !isAbsolute(p)) return false;
  if (dirname(p) !== root) return false;
  const name = basename(p);
  const prefix = namePrefix(projectReal);
  return name.startsWith(prefix) && SUFFIX_RE.test(name.slice(prefix.length));
}

/** The registered worktree paths (`git worktree list --porcelain`), or [] when git cannot list them. */
function registeredWorktrees() {
  const r = gitSync(["worktree", "list", "--porcelain"]);
  if (!r.ok) return [];
  return r.stdout
    .split(/\r?\n/)
    .filter((l) => l.startsWith("worktree "))
    .map((l) => l.slice("worktree ".length));
}

/** Remove ONE temp-root entry under this project's prefix: unlink a link, remove an own real directory, skip the rest. */
function removeEntry(path) {
  try {
    const st = lstatSync(path);
    if (st.isSymbolicLink()) return unlinkSync(path);
    if (!st.isDirectory()) return undefined;
    if (typeof process.getuid === "function" && st.uid !== process.getuid()) return undefined;
    rmSync(path, { recursive: true, force: true });
  } catch {
    /* best-effort: a foreign or vanished entry is not this stage's to fail on */
  }
  return undefined;
}

/** Clear every base checkout of THIS project (registered or not) plus the legacy nested path. Never throws. */
export function clearBaseWorktrees(projectReal, legacyRel, root = tempRoot()) {
  if (root !== null) {
    const prefix = namePrefix(projectReal);
    for (const wt of registeredWorktrees()) {
      if (dirname(wt) === root && basename(wt).startsWith(prefix)) gitSync(["worktree", "remove", "--force", "--force", wt]);
    }
    let names;
    try {
      names = readdirSync(root);
    } catch {
      names = [];
    }
    for (const n of names) if (n.startsWith(prefix)) removeEntry(join(root, n));
  }
  if (typeof legacyRel === "string" && legacyRel.length > 0) {
    gitSync(["worktree", "remove", "--force", "--force", legacyRel]);
    try {
      rmSync(legacyRel, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
  gitSync(["worktree", "prune"]);
}

/** Replace every spelling of the base path in `text` (its realpath, and the unresolved temp root form) with REDACTED. */
export function redact(text, p) {
  if (typeof text !== "string" || typeof p !== "string" || p.length === 0) return text;
  let out = text.split(p).join(REDACTED);
  const raw = tmpdir();
  const root = tempRoot();
  if (root !== null && raw !== root && p.startsWith(root + sep)) out = out.split(join(raw, p.slice(root.length + 1))).join(REDACTED);
  return out;
}
