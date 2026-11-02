// pharn/floor/capability-files-core.mjs — the ONE list of markdown files the capability readers scan.
//
// WHY THIS FILE EXISTS (issue #407, P7 — a real failure). validate.mjs, count-lenses.mjs, count-grillers.mjs and
// count-verifiers.mjs each walked the target with their own copy of one `readdirSync` walk, and none asked git. In
// pharn-dev/skills a package build step keeps two copies of the `pharn/` tree under a git-ignored cache
// (`src/phargus/.cache/phargus-build-<node-version>/`), so every griller registered three times (30 instead of 10),
// a full `/pharn-grill` loaded about 212 KB of griller text where about 71 KB was needed and applied each griller three
// times, and validate reported 90 capabilities of which 60 were the ignored copies — all of it exiting 0. Adding
// `.cache` to an exclude list would fix that one directory and no other (`dist/`, `build/`, `vendor/`), which is
// lessons-learned L36. The four walks were copies (each said it mirrored another), so the fix lives here once
// (L31) and capability-files-core.test.mjs ranges over the four consumers (L29).
//
// THE RULE.
//   * Inside a git work tree, the `.md` files `git ls-files --cached --others --exclude-standard` lists when asked
//     FROM the target (tracked, plus untracked and not ignored — the set check-bash-reconcile.mjs and
//     render-review-assignments.mjs already treat as the project's), PLUS every `.md` under the target's own `pharn/`
//     directory, walked. The second part keeps an install a project chose not to commit (a `pharn/` line in its
//     `.gitignore`) in discovery: without it the readers would find zero capabilities and still exit 0. Only the
//     target's own `pharn/` — a copy under any other ignored directory stays out.
//   * Only paths that are regular files NOW (`statSync`, followed as the walk followed): a tracked file deleted from
//     the work tree is not listed. The list is sorted by code unit, so the order is git's and the filesystem's alike.
//   * The old walk, unchanged, when the target is not in a git work tree, when git cannot run or fails (missing,
//     timed out, past MAX_BUFFER), or when git lists NOTHING for the target — an empty directory, or one wholly
//     ignored by an enclosing repository (a scratch fixture under an ignored path), where the git answer would be
//     an empty surface that the walk is not.
//
// BOUNDS (P0), stated because the old walk did these differently:
//   * A symlinked DIRECTORY inside the work tree is not descended (git lists the link, not what it points at); the
//     walk followed it. A symlinked `.md` file is still listed and read through the link.
//   * A submodule or a nested repository is not descended (git lists a gitlink or `dir/`, never its files); the walk
//     descended. Asked from the target, a target that IS a nested repository answers for itself.
//   * The walk fallback keeps every residual it had, including the ignored copies this file exists to drop: a tree
//     with no git, or a git that fails, gets the old count.
//   * Git's own environment applies (GIT_DIR and friends set by a caller redirect the listing), as for every other
//     git spawn in this floor.
//
// Node stdlib only. Reads the filesystem and spawns git; decides nothing — each consumer keeps its own
// EXCLUDE_SEGMENTS and its own frontmatter reader.

import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** The listing's output ceiling: 256 MiB, the value stage-runtime.mjs's gitSync and reconcile-baseline.mjs use. */
export const MAX_BUFFER = 1 << 28;
/** A git that has not answered in this long is treated as failed, and the walk runs instead. */
export const GIT_TIMEOUT_MS = 60_000;

/** The recursive `*.md` walk the four readers each carried (validate.mjs's, byte for byte in behaviour): every
 *  directory is followed through `statSync`, an unreadable directory or entry is skipped, order is readdirSync's. */
export function walkMarkdown(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkMarkdown(p, acc);
    else if (name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

/** Every path git lists for `target`, relative to it, or null when git cannot answer (not a work tree, no git, a
 *  failure, a timeout, output past MAX_BUFFER). `--literal-pathspecs`: the `.` pathspec is never read as a glob. */
export function gitListing(target) {
  try {
    const out = execFileSync("git", ["--literal-pathspecs", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "."], {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: MAX_BUFFER,
      timeout: GIT_TIMEOUT_MS,
    });
    return out.split("\0").filter(Boolean);
  } catch {
    return null;
  }
}

function isRegularFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * The markdown files the capability readers scan under `target`, as `join(target, rel)` paths (the shape the old
 * walk returned, so `relative(target, file)` still gives the repo-relative path). `{files, source}`: `source` is
 * `"git"` or `"walk"`, for tests and for a reader that wants to say which rule ran. Never throws.
 */
export function listMarkdownFiles(target) {
  const listed = gitListing(target);
  if (listed === null || listed.length === 0) return { files: walkMarkdown(target), source: "walk" };
  const set = new Set();
  for (const rel of listed) {
    if (!rel.endsWith(".md")) continue;
    const p = join(target, rel);
    if (isRegularFile(p)) set.add(p);
  }
  for (const p of walkMarkdown(join(target, "pharn"))) set.add(p);
  return { files: [...set].sort(), source: "git" };
}
