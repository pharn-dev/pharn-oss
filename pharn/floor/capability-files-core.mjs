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
//   * A symlinked DIRECTORY is not descended, in either rule (7.3.0, L59). Git lists the link, not what it points at;
//     the walk classifies each entry with lstatSync and skips a link to a directory. Before 7.3.0 this line claimed
//     the bound while the walk — the fallback AND the `pharn/` union every git-mode run adds — followed such a link
//     with statSync, so a link under pharn/ imported an outside directory's capabilities (measured: 38 for 37).
//     The links skipped strictly below the target's own `pharn/` are returned as `linkedDirs`, so a consumer can
//     refuse rather than silently lose what they point at; a link anywhere else is skipped silently. ONE exception,
//     decided at family-grammar-crlf's GATE 1: a `pharn` directory that is itself a link is the operator's explicit
//     choice and is followed, in both rules, as before. A symlinked `.md` file is still listed and read through the
//     link; a dangling or looping link is skipped (its stat fails).
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
import { lstatSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

/** The listing's output ceiling: 256 MiB, the value stage-runtime.mjs's gitSync and reconcile-baseline.mjs use. */
export const MAX_BUFFER = 1 << 28;
/** A git that has not answered in this long is treated as failed, and the walk runs instead. */
export const GIT_TIMEOUT_MS = 60_000;

/** The recursive `*.md` walk the four readers each carried: an unreadable directory or entry is skipped, order is
 *  readdirSync's. Since 7.3.0 each entry is classified with `lstatSync` (L59): a link to a directory is NOT descended
 *  and its path is pushed onto `links`; a link to a file is classified by its target (an `.md` one is listed); a
 *  dangling or looping link fails its stat and is skipped. `dir` itself is read as given — a linked root is followed. */
export function walkMarkdown(dir, acc = [], links = []) {
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
      st = lstatSync(p);
      if (st.isSymbolicLink()) {
        st = statSync(p);
        if (st.isDirectory()) {
          links.push(p);
          continue;
        }
      }
    } catch {
      continue;
    }
    if (st.isDirectory()) walkMarkdown(p, acc, links);
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

/** True when `p` is a symbolic link whose target is a directory. */
function isLinkToDir(p) {
  try {
    return lstatSync(p).isSymbolicLink() && statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * The markdown files the capability readers scan under `target`, as `join(target, rel)` paths (the shape the old
 * walk returned, so `relative(target, file)` still gives the repo-relative path). `{files, source, linkedDirs}`:
 * `source` is `"git"` or `"walk"`, for tests and for a reader that wants to say which rule ran; `linkedDirs` (7.3.0)
 * lists, sorted, the links to directories the walks skipped strictly below `join(target, "pharn")`. Never throws.
 */
export function listMarkdownFiles(target) {
  const pharnDir = join(target, "pharn");
  const links = [];
  const listed = gitListing(target);
  let files;
  let source;
  if (listed === null || listed.length === 0) {
    files = walkMarkdown(target, [], links);
    // The GATE-1 exception, kept equal across both rules: a linked `pharn` root is followed, as the git-mode union
    // below follows it, so the walk fallback walks it too instead of recording it.
    if (isLinkToDir(pharnDir)) walkMarkdown(pharnDir, files, links);
    source = "walk";
  } else {
    const set = new Set();
    for (const rel of listed) {
      if (!rel.endsWith(".md")) continue;
      const p = join(target, rel);
      if (isRegularFile(p)) set.add(p);
    }
    for (const p of walkMarkdown(pharnDir, [], links)) set.add(p);
    files = [...set].sort();
    source = "git";
  }
  const linkedDirs = [...new Set(links.filter((p) => p.startsWith(pharnDir + sep)))].sort();
  return { files, source, linkedDirs };
}
