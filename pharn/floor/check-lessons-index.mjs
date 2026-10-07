#!/usr/bin/env node
// pharn/floor/check-lessons-index.mjs — the lessons-index DRIFT CHECKER, on the PRODUCT surface.
//
// It recomputes the index from live canon via the SAME core the generator uses, then compares.
//
// ════ THE FIVE VERDICTS (a closed set — callers branch by MEMBERSHIP, P5) ════
//
//   NO_CANON   exit 0  memory-bank/lessons-learned.md is absent, or holds zero `## L<n> ` headings.
//   COLD       exit 0  canon has lessons; no cache exists yet.
//   GREEN      exit 0  the cached bytes equal the recompute.
//   STALE      exit 1  a cache exists and DIFFERS from the recompute.
//   ENUM_ERROR exit 1  canon is present and INVALID (duplicate id, unsafe title, CHECK-5 hazard).
//
// `NO_CANON` and `COLD` are GREEN **deliberately**, and this is the load-bearing divergence from the dev
// copy. The cache is gitignored and disposable, so its absence is the normal COLD state of a fresh clone,
// and a project that has promoted nothing is the honest normal state of a fresh install. Neither is an
// error, and REDding on them would make every first run of /pharn-plan a false alarm. `STALE` is the only
// drift RED because it is the only state in which the cache could actively MISLEAD a selection.
//
// ════ WHAT THIS GUARANTEES, NARROWED AND STATED (P0 — say it, don't bury it) ════
//
// FLOOR: a byte comparison (ARCHITECTURE §2 primitive #2, applied to generated output). ZERO LLM — the
// verdict never rests on a free-text/tainted field; the canon TITLES it compares through are untrusted
// DATA, but the comparison is over bytes, not meaning.
//
// It is NOT the dev surface's "the COMMITTED index equals the recompute" byte-equality:
//   - the subject is a GITIGNORED CACHE, so this is a STALENESS check; nothing durably pins these bytes;
//   - its COVERAGE is therefore MACHINE-LOCAL and EPHEMERAL — a fresh clone always yields COLD, so STALE
//     can only fire between a change to canon that bypassed the generator and the next regeneration, on
//     the machine holding that cache. Do not read `GREEN` as "the index is durably guarded".
//   - NOT that the index is TRUE. A wrong parser would be regenerated, cached wrongly, and this stays
//     GREEN. Consistency, not correctness.
//   - NOT that a lesson's `type` / `concepts` DESCRIBE it. Those are model-drafted values ratified by a
//     human at the /pharn-memory-promote gate; "typed `floor`" never means "about the floor", so
//     selection keyed on this index is ADVISORY context selection, never a guarantee.
//   - NOT that anyone READ a lesson. "The index is current" says nothing about consumption.
//   - NOT that this checker is even INVOKED. It runs only if something runs it; /pharn-plan's Step 1 does,
//     which is ADVISORY command orchestration, not a floor mechanism.
//
// Usage:  node pharn/floor/check-lessons-index.mjs [targetDir] [--verdict]
//   --verdict  print ONLY the bare verdict token (one of the five above) and nothing else, so a caller
//              can branch on set MEMBERSHIP rather than parse prose. The token is an ENUM value
//              (primitive #3), the same machine-readable channel check-regress.mjs's `verdict` mode
//              provides. The exit code is unchanged in both modes.
//
// Non-LLM, stdlib-only, fail-closed.

import "./runtime-floor.mjs";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildIndex, CANON_PATH, OUT_PATH, MALFORMED, STATUS_NO_CANON } from "./lessons-index-core.mjs";

const FIX = "node pharn/floor/gen-lessons-index.mjs .";

// The closed verdict set. Exported so a test (and any caller) can assert membership rather than
// string-match a message.
export const VERDICTS = ["NO_CANON", "COLD", "GREEN", "STALE", "ENUM_ERROR"];
const RED_VERDICTS = ["STALE", "ENUM_ERROR"];

/**
 * Check the cached index against a fresh recompute. Returns { verdict, findings, malformedCount } where
 * each finding is { type, file, problem } — the enum-gated (`type`, `file`) / free-text (`problem`) split
 * of `pharn/pharn-contracts/finding-shape.md`, cited not restated (P4). Pure — no process exit, so tests
 * can call it.
 */
export function checkLessonsIndex(targetDir) {
  let expected;
  let malformedCount;
  try {
    const { status, content, entries } = buildIndex(targetDir);
    if (status === STATUS_NO_CANON) {
      return { verdict: "NO_CANON", findings: [], malformedCount: 0 };
    }
    expected = content;
    malformedCount = entries.filter((e) => e.type === MALFORMED).length;
  } catch (e) {
    // Canon is PRESENT and INVALID — a duplicate id / unsafe title / CHECK-5 hazard. A hard,
    // deterministic RED; regenerating cannot help, because the generator refuses on the same input.
    return { verdict: "ENUM_ERROR", findings: [{ type: "ENUM_ERROR", file: CANON_PATH, problem: e.message }], malformedCount: 0 };
  }

  const abs = join(targetDir, OUT_PATH);
  let actual;
  try {
    actual = readFileSync(abs, "utf8");
  } catch {
    // No cache yet. NOT an error: the cache is gitignored scratch, so this is the normal cold state.
    return { verdict: "COLD", findings: [], malformedCount };
  }

  if (actual !== expected) {
    return {
      verdict: "STALE",
      findings: [{ type: "STALE", file: OUT_PATH, problem: "the cached bytes differ from the index recomputed from canon" }],
      malformedCount: 0,
    };
  }
  return { verdict: "GREEN", findings: [], malformedCount };
}

function main() {
  const args = process.argv.slice(2);
  const verdictOnly = args.includes("--verdict");
  const target = args.find((a) => !a.startsWith("--")) || ".";

  // Fail-closed (P5): a missing / non-directory target is an error, never a silent GREEN.
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    process.stderr.write(`check-lessons-index: target dir not found (or not a directory): ${target}\n`);
    process.exit(1);
  }

  const { verdict, findings, malformedCount } = checkLessonsIndex(target);
  const red = RED_VERDICTS.includes(verdict);

  if (verdictOnly) {
    process.stdout.write(`${verdict}\n`);
    process.exit(red ? 1 : 0);
  }

  if (verdict === "NO_CANON") {
    process.stdout.write(`LESSONS-INDEX: NO_CANON — no lessons at ${CANON_PATH} (absent, or none promoted yet); nothing to index\n`);
    process.exit(0);
  }
  if (verdict === "COLD") {
    process.stdout.write(`LESSONS-INDEX: COLD — canon has lessons but ${OUT_PATH} does not exist yet; regenerate with: ${FIX}\n`);
    process.exit(0);
  }
  if (verdict === "GREEN") {
    process.stdout.write(`LESSONS-INDEX: GREEN — ${OUT_PATH} matches the index recomputed from canon\n`);
    if (malformedCount > 0) {
      process.stdout.write(
        `LESSONS-INDEX: WARN — ${malformedCount} entry(ies) carry a malformed tag line (rendered "?") — read them in canon\n`
      );
    }
    process.exit(0);
  }

  // The two REDs.
  if (verdict === "ENUM_ERROR") {
    process.stdout.write(`LESSONS-INDEX: RED (ENUM_ERROR) — canon is present but invalid; the index cannot be rendered\n`);
  } else {
    process.stdout.write(`LESSONS-INDEX: RED (STALE) — the cached index is out of date\n`);
  }
  for (const f of findings) {
    process.stdout.write(`- [${f.type}] ${f.file}\n    ${f.problem}\n`);
  }
  if (verdict === "ENUM_ERROR") {
    process.stdout.write(
      `\nFIX: correct the canonical input in ${CANON_PATH} — regenerating cannot succeed until the input error is resolved\n`
    );
  } else {
    process.stdout.write(`\nFIX: regenerate — ${FIX}\n`);
  }
  process.exit(1);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare, which silently no-ops on spaced/non-ASCII/symlinked paths. That defect
// was sharpest HERE: `--verdict` printed nothing at exit 0, and /pharn-plan branches on token membership.
if (import.meta.main) {
  main();
}
