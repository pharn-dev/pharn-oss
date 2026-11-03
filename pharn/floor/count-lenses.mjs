#!/usr/bin/env node
// pharn/floor/count-lenses.mjs — deterministic lens-MEMBERSHIP counter (CONSTITUTION P0/P5).
//
// Answers ONE structural question for a parallel /pharn-review: which capabilities DECLARE `role: lens`?
// That set is exactly the lenses the review assigns (run in family groups, one subagent per group) and whose
// findings.json the
// deterministic pharn/floor/merge-findings.mjs assembles. Membership is read ONLY from the `---`-fenced
// YAML frontmatter — never a substring grep over file contents. A `role: lens` string in PROSE or a
// fenced code block is DATA *about* lenses, not a declaration *of* one (the enum-gated / free-text split
// of ARCHITECTURE §8 / fix #1, applied to membership detection). This is the direct sibling of
// pharn/floor/count-verifiers.mjs (the /verify slot) and pharn/floor/count-grillers.mjs (the /grill slot).
//
// Non-LLM, stdlib-only, fail-closed. It MIRRORS pharn/floor/validate.mjs (does not import — validate.mjs
// exports nothing, it runs on load): the same file list + EXCLUDE_SEGMENTS capability surface AND, since 7.3.0,
// the same frontmatter reader (frontmatter-core.mjs `looseFrontmatter`) for reading `role` — so it counts the files
// validate.mjs treats as role-bearing capabilities. (The hand-mirrored copy before it claimed byte-for-byte
// agreement on all inputs and lost every CRLF key but the last, in both files alike.) Cite, don't restate
// (P4); a separate file with its own single axis (P3): validate.mjs owns the structural floor verdict,
// this owns the lens-membership count. NOTE the exclusion of `.claude/commands/`: the /pharn-dev-review
// COMMAND declares `role: lens` in its own frontmatter but lives under `.claude/commands/`, so it is NOT
// one of the product-surface lenses (it is the reviewer, not a reviewed lens) — the same reason
// count-verifiers.mjs does not count the /verify command.
//
// Usage:  node pharn/floor/count-lenses.mjs [targetDir]      (default: cwd)
// Output: {"registered":<int>,"lenses":[<repo-rel path>,...]} on stdout; exit 0 on success.
//         Exits non-zero (writing NOTHING to stdout) if targetDir is missing / not a directory — never a
//         silent 0 from looking in the wrong place (P5, fail-closed) — or (7.3.0) if a symlinked directory sits
//         below pharn/, which the shared list does not descend.

import { readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { looseFrontmatter, looseScalar } from "./frontmatter-core.mjs";
// The markdown list is the shared one (issue #407): git's tracked + untracked-not-ignored files, plus the target's
// own pharn/, with the old walk as the fallback — capability-files-core.mjs's header holds the rule and its bounds.
import { listMarkdownFiles } from "./capability-files-core.mjs";

const TARGET = process.argv[2] || ".";
// Same exclusions as pharn/floor/validate.mjs: tooling (.claude/, .dev/) and noise are NOT the
// capability surface, so a `role: lens` frontmatter there is not a built-PHARN lens.
// `.claude` is excluded WHOLESALE (lessons-learned L36): naming only `.claude/commands/` left every
// other `.claude/` subtree on the scanned surface, so a nested checkout under `.claude/worktrees/<name>/`
// doubled this count (22 lenses -> 44, measured). Closure, not a second member — an arbitrarily named
// `.claude/<x>/` fires it identically. The `.claude/commands/` case this list has always covered (a real
// `role: lens` in a stage command) stays covered by the wider segment.
// 7.0.0: `pharn/.run/` (runtime scratch) and `pharn/.backup/` (the CLI's backup, full capability copies) too.
const EXCLUDE_SEGMENTS = [
  `${sep}.claude${sep}`,
  `${sep}.dev${sep}`,
  `${sep}node_modules${sep}`,
  `${sep}.git${sep}`,
  `${sep}pharn${sep}.run${sep}`,
  `${sep}pharn${sep}.backup${sep}`,
];

/** Report an error on stderr and return the exit code; `main` returns it, so nothing reaches stdout. */
function fail(msg) {
  process.stderr.write("count-lenses: " + msg + "\n");
  return 1;
}

// Mirrors pharn/floor/validate.mjs `isExcluded` — the same EXCLUDE_SEGMENTS surface.
function isExcluded(file) {
  const norm = sep + relative(TARGET, file);
  return EXCLUDE_SEGMENTS.some((seg) => norm.includes(seg));
}

// The `role:` value declared INSIDE a file's `---`-fenced YAML frontmatter, or null if there is none. Read through
// frontmatter-core.mjs `looseFrontmatter` (7.3.0) — the ONE reader validate.mjs's `parseFrontmatter` also uses, so
// membership agrees with the AUTHORITY on every input by construction rather than by a mirrored copy (the copy split
// lines on "\n" alone and lost every CRLF key but the last). A displaced fence (a blank line or an invisible character
// before `---`) is read too, as validate reads and counts it (and REDs it). A `role:` line in the body (prose / code
// block) stays outside the parsed block, so it is structurally unreachable (the enum-gated / free-text split is
// preserved). The last `role:` line wins, exactly as validate's `fm[key] = val` overwrite does; a `[list]` value is not
// the scalar `lens`, there or here.
function frontmatterRole(rawText) {
  const lf = looseFrontmatter(rawText);
  if (!lf) return null;
  let role = null;
  for (const { key, raw } of lf.entries) if (key === "role") role = looseScalar(raw);
  return role;
}

function main() {
  // Fail-closed (P5): a missing / non-directory target is an ERROR, never a silent empty count.
  if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) {
    return fail(`target dir not found (or not a directory): ${TARGET}`);
  }

  // A symlinked directory below pharn/ is not descended (capability-files-core.mjs), so a lens behind it would drop out
  // of this registry with exit 0 while validate.mjs REDs it (P6/symlinked-dir). Refuse instead (7.3.0): every caller
  // already treats a non-zero exit as "membership not read" and stops.
  const listing = listMarkdownFiles(TARGET);
  const linked = listing.linkedDirs.filter((d) => !isExcluded(join(d, "x")));
  if (linked.length > 0) {
    return fail(
      `symlinked director${linked.length === 1 ? "y" : "ies"} below pharn/ not descended: ${linked.map((d) => JSON.stringify(relative(TARGET, d))).join(", ")} — replace each link with the directory itself, or remove it`
    );
  }

  const lenses = [];
  for (const file of listing.files) {
    if (isExcluded(file)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // The ONLY membership test: enum equality against a frontmatter-gated field (P5). No content grep.
    if (frontmatterRole(text) === "lens") {
      lenses.push(relative(TARGET, file).replace(/\\/g, "/"));
    }
  }
  lenses.sort();

  process.stdout.write(JSON.stringify({ registered: lenses.length, lenses }) + "\n");
  return 0;
}

// THE FLUSH RULE (6.20.4; this CLI since 6.71.1): the exit code is SET and the process ends naturally, after Node has
// drained stdout — render-review-assignments.mjs and check-review-assignments.mjs JSON.parse this document through
// spawnSync, and an immediate exit dropped queued writes past a pipe's 64 KiB buffer on darwin.
// pharn/floor/cli-stdout-flush.test.mjs pins it.
process.exitCode = main();
