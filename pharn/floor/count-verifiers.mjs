#!/usr/bin/env node
// pharn/floor/count-verifiers.mjs — deterministic verifier-MEMBERSHIP counter (CONSTITUTION P0/P5).
//
// Answers ONE structural question for the verify stage — shelled by pharn/floor/stage-verify.mjs (6.26.0), which
// parses its stdout, and by /pharn-dev-verify's command prose: which capabilities DECLARE `role: verifier`?
// Membership is read ONLY from the `---`-fenced YAML frontmatter — never a substring grep over file
// contents. A `role: verifier` string in PROSE or a fenced code block is DATA *about* verifiers, not a
// declaration *of* one (the enum-gated / free-text split of ARCHITECTURE §8 / fix #1, applied to
// membership detection). This closes pipeline-integration-probe finding #3 (REVIEW.md:80 / VERIFY.md):
// the old `grep -rl 'role: verifier'` matched 8 files, ALL prose, and grew as the repo's own prose did
// — "monotonically unstable," not merely imprecise.
//
// Non-LLM, stdlib-only, fail-closed. It MIRRORS pharn/floor/validate.mjs (does not import — validate.mjs exports
// nothing, it runs on load): the same `walk` + EXCLUDE_SEGMENTS capability surface AND the same
// `parseFrontmatter` fence/line algorithm for reading `role` — so it counts EXACTLY the files validate.mjs
// treats as role-bearing capabilities, byte-for-byte on all inputs (this is what closes
// verifier-membership-frontmatter REVIEW.md F1; see frontmatterRole below). Cite, don't restate (P4); a
// separate file with its own single axis (P3): validate.mjs owns the structural floor verdict, this owns
// the verifier-membership count.
//
// Usage:  node pharn/floor/count-verifiers.mjs [targetDir]      (default: cwd)
// Output: {"registered":<int>,"verifiers":[<repo-rel path>,...]} on stdout; exit 0 on success.
//         Exits non-zero (writing NOTHING to stdout) if targetDir is missing / not a directory — never a
//         silent 0 from looking in the wrong place (P5, fail-closed).

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { stripBom } from "./frontmatter-core.mjs";

const TARGET = process.argv[2] || ".";
// Same exclusions as pharn/floor/validate.mjs: tooling (.claude/, .dev/) and noise are NOT the
// capability surface, so a `role: verifier` frontmatter there is not a built-PHARN verifier.
// `.claude` is excluded WHOLESALE (lessons-learned L36): naming only `.claude/commands/` left every other
// `.claude/` subtree on the scanned surface, so a nested checkout under `.claude/worktrees/<name>/` would
// double this count. It reads 0 today, which is exactly why the widening matters here — a doubled 0 is
// still 0, so this walker would have gone on reporting a correct-looking number while sharing the defect,
// and only the enumeration test ranges over it. Closure, not a second member.
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
  process.stderr.write("count-verifiers: " + msg + "\n");
  return 1;
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
// MIRRORS pharn/floor/validate.mjs `parseFrontmatter` EXACTLY (restricted to the `role` key): the same leading-BOM
// strip (frontmatter-core.mjs `stripBom`, 6.65.2), then the same opening fence (`startsWith("---")`), the same close (`indexOf("\n---", 3)`), the same `slice(3, end).trim()`
// block, the same `^([A-Za-z0-9_]+):\s*(.*)$` line parse, and the same `^["']|["']$` quote-strip. That
// byte-for-byte sameness is what makes membership agree with the AUTHORITY on EVERY input — closing
// REVIEW.md F1, where the prior strict `^---\r?\n` regex diverged from validate's loose opening fence on
// >=4-dash openings. A `role:` line in the body (prose / code block) stays outside the parsed block, so it
// is structurally unreachable (the enum-gated / free-text split is preserved). `role` is a scalar enum, so
// validate's array branch (list-valued keys only) never applies to it; the last `role:` line wins, exactly
// as validate's `fm[key] = val` overwrite does. Not an import of validate.mjs — it exports nothing (P4: cite); the
// BOM strip is the shared core's.
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

  const verifiers = [];
  for (const file of walk(TARGET)) {
    if (isExcluded(file)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // The ONLY membership test: enum equality against a frontmatter-gated field (P5). No content grep.
    if (frontmatterRole(text) === "verifier") {
      verifiers.push(relative(TARGET, file).replace(/\\/g, "/"));
    }
  }
  verifiers.sort();

  process.stdout.write(JSON.stringify({ registered: verifiers.length, verifiers }) + "\n");
  return 0;
}

// THE FLUSH RULE (6.20.4; this CLI since 6.67.1, TST-5): the exit code is SET and the process ends naturally, after
// Node has drained stdout — stage-verify.mjs JSON.parses this document through spawnSync, and an immediate exit
// dropped queued writes past a pipe's 64 KiB buffer on darwin. pharn/floor/cli-stdout-flush.test.mjs pins it.
process.exitCode = main();
