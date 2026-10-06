#!/usr/bin/env node
// pharn/floor/scan-installed-skills.mjs — deterministic enumerator of USER-installed Claude Code skills.
//
// Answers ONE structural question: which skills has the user installed into THIS repo? A Claude Code
// project skill lives at `<repo>/.claude/skills/<name>/SKILL.md` (one directory level; the SKILL.md is its
// entrypoint). This helper lists exactly those — by DIRECTORY PRESENCE, never by reading the SKILL.md's
// content — and prints a sorted JSON roster.
//
// SINCE 6.47.0 the listing itself lives in `installed-skills-core.mjs` (`discoverInstalledSkills`), shared
// with `catalogue-installed-skills.mjs` so the two can never enumerate differently (L35). This file keeps
// its own target check and prints only the legacy roster; its output bytes, ordering, argument handling and
// exit codes are unchanged, pinned by the characterization cases in `scan-installed-skills.test.mjs`, which
// ran against this file before the extraction. The product stages now read the CATALOGUE first and fall back
// to this roster only when the catalogue is unusable.
//
// WHAT THIS IS (and is NOT), per P0. A deterministic ENUMERATION (a filesystem listing) — FLOOR-grade in the
// narrow sense that its output is reproducible and non-LLM. It GATES NOTHING: no proceed/stop/verdict in any
// stage reads it. Incorporating the listed skills is ADVISORY model work, done by the stage, not here. There
// is deliberately NO claim that built code "matches" or "conforms to" a skill.
//
// TRUST (P2). A `.claude/skills/*/SKILL.md` is user-dropped markdown — `trust: untrusted`, NOT one of the four
// write-protected trusted docs (LIMITS.md §1a "markdown is executable" applies). This helper reads ONLY
// directory/entry NAMES, never SKILL.md bodies. Enumeration hygiene (the core's header has the full rule):
// exactly one level; symlinked skill dirs and symlinked SKILL.md files are skipped (lstat); JSON.stringify
// escapes every name. BOUND: `.claude` itself is not lstat'ed, so a `.claude` link leaving the target is
// followed and its skills are listed here (characterized); the catalogue marks those entries `unsafe`.
//
// FAIL-SAFE, not fail-closed. An ABSENT `.claude/skills/` is the COMMON case (no skills installed) and
// yields an empty roster + exit 0. So do an unreadable or symlinked skills root — silently, here; the
// catalogue reports them. Only a missing / non-directory TARGET is an ERROR (exit 1), so a wrong-path run is
// never a silent empty (P5).
//
// Usage:  node pharn/floor/scan-installed-skills.mjs [targetDir]      (default: cwd)
// Output: {"count":<int>,"skills":[{"name":"<dir>","path":".claude/skills/<dir>/SKILL.md"},...]} on
//         stdout, sorted by name; exit 0. Exits 1 (writing NOTHING to stdout) only if targetDir itself is
//         missing / not a directory.

import { statSync, existsSync } from "node:fs";
import { discoverInstalledSkills } from "./installed-skills-core.mjs";

const TARGET = process.argv[2] || ".";

function fail(msg) {
  process.stderr.write("scan-installed-skills: " + msg + "\n");
  process.exit(1);
}

// Fail-CLOSED on a bad TARGET repo (wrong-path guard, P5): a missing / non-directory target is an ERROR,
// never a silent empty roster.
if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) {
  fail(`target dir not found (or not a directory): ${TARGET}`);
}

const { skills } = discoverInstalledSkills(TARGET);

process.stdout.write(JSON.stringify({ count: skills.length, skills }) + "\n");
process.exit(0);
