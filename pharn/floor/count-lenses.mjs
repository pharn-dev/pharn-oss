#!/usr/bin/env node
// pharn/floor/count-lenses.mjs — deterministic lens-MEMBERSHIP counter (CONSTITUTION P0/P5).
//
// Answers ONE structural question for a parallel /pharn-review: which capabilities DECLARE `role: lens`?
// That set is exactly the lenses the review spawns (one subagent each) and whose findings.json the
// deterministic pharn/floor/merge-findings.mjs assembles. Membership is read ONLY from the `---`-fenced
// YAML frontmatter — never a substring grep over file contents. A `role: lens` string in PROSE or a
// fenced code block is DATA *about* lenses, not a declaration *of* one (the enum-gated / free-text split
// of ARCHITECTURE §8 / fix #1, applied to membership detection). This is the direct sibling of
// pharn/floor/count-verifiers.mjs (the /verify slot) and pharn/floor/count-grillers.mjs (the /grill slot).
//
// Non-LLM, stdlib-only, fail-closed. It MIRRORS pharn/floor/validate.mjs (does not import — validate.mjs
// exports nothing, it runs on load): the same `walk` + EXCLUDE_SEGMENTS capability surface AND the same
// `parseFrontmatter` fence/line algorithm for reading `role` — so it counts EXACTLY the files
// validate.mjs treats as role-bearing capabilities, byte-for-byte on all inputs. Cite, don't restate
// (P4); a separate file with its own single axis (P3): validate.mjs owns the structural floor verdict,
// this owns the lens-membership count. NOTE the exclusion of `.claude/commands/`: the /pharn-dev-review
// COMMAND declares `role: lens` in its own frontmatter but lives under `.claude/commands/`, so it is NOT
// one of the product-surface lenses (it is the reviewer, not a reviewed lens) — the same reason
// count-verifiers.mjs does not count the /verify command.
//
// Usage:  node pharn/floor/count-lenses.mjs [targetDir]      (default: cwd)
// Output: {"registered":<int>,"lenses":[<repo-rel path>,...]} on stdout; exit 0 on success.
//         Exits non-zero (writing NOTHING to stdout) if targetDir is missing / not a directory — never a
//         silent 0 from looking in the wrong place (P5, fail-closed).

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const TARGET = process.argv[2] || ".";
// Same exclusions as pharn/floor/validate.mjs: tooling (.claude/, .dev/) and noise are NOT the
// capability surface, so a `role: lens` frontmatter there is not a built-PHARN lens.
// `.claude` is excluded WHOLESALE (lessons-learned L36): naming only `.claude/commands/` left every
// other `.claude/` subtree on the scanned surface, so a nested checkout under `.claude/worktrees/<name>/`
// doubled this count (22 lenses -> 44, measured). Closure, not a second member — an arbitrarily named
// `.claude/<x>/` fires it identically. The `.claude/commands/` case this list has always covered (a real
// `role: lens` in a stage command) stays covered by the wider segment.
const EXCLUDE_SEGMENTS = [`${sep}.claude${sep}`, `${sep}.dev${sep}`, `${sep}node_modules${sep}`, `${sep}.git${sep}`];

function fail(msg) {
  process.stderr.write("count-lenses: " + msg + "\n");
  process.exit(1);
}

// Fail-closed (P5): a missing / non-directory target is an ERROR, never a silent empty count.
if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) {
  fail(`target dir not found (or not a directory): ${TARGET}`);
}

// Recursive *.md collector — mirrors pharn/floor/validate.mjs `walk`.
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

// Mirrors pharn/floor/validate.mjs `isExcluded` — the same EXCLUDE_SEGMENTS surface.
function isExcluded(file) {
  const norm = sep + relative(TARGET, file);
  return EXCLUDE_SEGMENTS.some((seg) => norm.includes(seg));
}

// The `role:` value declared INSIDE a file's `---`-fenced YAML frontmatter, or null if there is none.
// MIRRORS pharn/floor/validate.mjs `parseFrontmatter` EXACTLY (restricted to the `role` key): the same
// opening fence (`startsWith("---")`), the same close (`indexOf("\n---", 3)`), the same `slice(3, end).trim()`
// block, the same `^([A-Za-z0-9_]+):\s*(.*)$` line parse, and the same `^["']|["']$` quote-strip. That
// byte-for-byte sameness is what makes membership agree with the AUTHORITY on EVERY input. A `role:` line
// in the body (prose / code block) stays outside the parsed block, so it is structurally unreachable (the
// enum-gated / free-text split is preserved). `role` is a scalar enum, so validate's array branch never
// applies to it; the last `role:` line wins, exactly as validate's `fm[key] = val` overwrite does. Not an
// import — validate.mjs exports nothing (P4: cite).
function frontmatterRole(text) {
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

const lenses = [];
for (const file of walk(TARGET)) {
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
process.exit(0);
