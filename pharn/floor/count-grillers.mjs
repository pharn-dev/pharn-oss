#!/usr/bin/env node
// pharn/floor/count-grillers.mjs — deterministic griller-MEMBERSHIP counter (CONSTITUTION P0/P5).
//
// Answers ONE structural question for the grill stage's griller slot: which capabilities DECLARE
// `role: griller`? Membership is read ONLY from the `---`-fenced YAML frontmatter — never a substring
// grep over file contents. A `role: griller` string in PROSE or a fenced code block is DATA *about*
// grillers, not a declaration *of* one (the enum-gated / free-text split of ARCHITECTURE §8 / fix #1,
// applied to membership detection). This is the griller parallel of `pharn/floor/count-verifiers.mjs`
// at the grill stage, exactly as verifiers are to /verify.
//
// It MIRRORS pharn/floor/count-verifiers.mjs (the established membership-counter precedent,
// verifier-membership-frontmatter) — the same `walk` + EXCLUDE_SEGMENTS capability surface AND the same
// `frontmatterRole` fence/line algorithm (itself mirroring validate.mjs `parseFrontmatter`) — so it
// counts EXACTLY the files validate.mjs treats as role-bearing capabilities, differing ONLY in the enum
// it tests (`griller`, not `verifier`). Cite, don't restate (P4); a separate file with its own single
// axis (P3): count-verifiers.mjs owns verifier membership, this owns griller membership.
//
// LOAD-BEARING EXCLUDE CASE: the grill STAGE command `.claude/commands/pharn-dev-grill.md` itself
// declares `role: griller` in its frontmatter — but `.claude/commands/` is an EXCLUDED segment, so it is
// NOT a counted griller (the same reason validate.mjs does not count it as a capability). The test suite
// proves this: the live griller count is the product griller only.
//
// Non-LLM, stdlib-only, fail-closed.
//
// Usage:  node pharn/floor/count-grillers.mjs [targetDir]      (default: cwd)
// Output: {"registered":<int>,"grillers":[<repo-rel path>,...]} on stdout; exit 0 on success.
//         Exits non-zero (writing NOTHING to stdout) if targetDir is missing / not a directory — never a
//         silent 0 from looking in the wrong place (P5, fail-closed).

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { stripBom } from "./frontmatter-core.mjs";

const TARGET = process.argv[2] || ".";
// Same exclusions as pharn/floor/count-verifiers.mjs / validate.mjs: tooling (.claude/, .dev/) and
// noise are NOT the capability surface, so a `role: griller` frontmatter there is not a built-PHARN griller.
// `.claude` is excluded WHOLESALE (lessons-learned L36): naming only `.claude/commands/` left every other
// `.claude/` subtree on the scanned surface, so a nested checkout under `.claude/worktrees/<name>/` doubled
// this count (13 grillers -> 26, measured). Closure, not a second member — an arbitrarily named
// `.claude/<x>/` fires it identically. The stage-command case (a real `role: griller` in pharn-dev-grill.md)
// stays covered by the wider segment.
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
  process.stderr.write("count-grillers: " + msg + "\n");
  return 1;
}

// Recursive *.md collector — mirrors pharn/floor/count-verifiers.mjs `walk`.
function walk(dir, acc = []) {
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
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

// Mirrors pharn/floor/count-verifiers.mjs `isExcluded` — the same EXCLUDE_SEGMENTS surface.
function isExcluded(file) {
  const norm = sep + relative(TARGET, file);
  return EXCLUDE_SEGMENTS.some((seg) => norm.includes(seg));
}

// The `role:` value declared INSIDE a file's `---`-fenced YAML frontmatter, or null if there is none.
// MIRRORS pharn/floor/count-verifiers.mjs `frontmatterRole` EXACTLY (which mirrors validate.mjs
// `parseFrontmatter`): the same leading-BOM strip (frontmatter-core.mjs `stripBom`, 6.65.2), then the same
// opening fence (`startsWith("---")`), the same close (`indexOf("\n---", 3)`),
// the same `slice(3, end).trim()` block, the same `^([A-Za-z0-9_]+):\s*(.*)$` line parse, and the same
// `^["']|["']$` quote-strip. That byte-for-byte sameness is what makes membership agree with validate.mjs
// on EVERY input. A `role:` line in the body (prose / code block) stays outside the parsed block, so it is
// structurally unreachable. The ONLY behavioural difference in this whole file from count-verifiers.mjs is
// the enum tested below (`griller`). Not an import of validate.mjs / count-verifiers.mjs — they export nothing (P4:
// cite); the BOM strip is the shared core's.
function frontmatterRole(rawText) {
  const text = stripBom(rawText);
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const raw = text.slice(3, end).trim();
  let role = null;
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m && m[1] === "role") role = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return role;
}

function main() {
  // Fail-closed (P5): a missing / non-directory target is an ERROR, never a silent empty count.
  if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) {
    return fail(`target dir not found (or not a directory): ${TARGET}`);
  }

  const grillers = [];
  for (const file of walk(TARGET)) {
    if (isExcluded(file)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // The ONLY membership test: enum equality against a frontmatter-gated field (P5). No content grep.
    if (frontmatterRole(text) === "griller") {
      grillers.push(relative(TARGET, file).replace(/\\/g, "/"));
    }
  }
  grillers.sort();

  process.stdout.write(JSON.stringify({ registered: grillers.length, grillers }) + "\n");
  return 0;
}

// THE FLUSH RULE (6.20.4; this CLI since 6.71.1): the exit code is SET and the process ends naturally, after Node has
// drained stdout — griller-extract.mjs JSON.parses this document through spawnSync, and an immediate exit dropped
// queued writes past a pipe's 64 KiB buffer on darwin. pharn/floor/cli-stdout-flush.test.mjs pins it.
process.exitCode = main();
