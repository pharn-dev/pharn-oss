#!/usr/bin/env node
// .dev/floor/check-lessons-index.mjs — the lessons-index DRIFT CHECKER for the COMMITTED dev index (build apparatus).
//
// A THIN WRAPPER since 6.69.0 (audit ARCH-6): the recompute and the byte comparison are
// pharn/floor/check-lessons-index.mjs's checkLessonsIndex(), run under this surface's profile
// (./lessons-index-core.mjs, DEV_PROFILE). What this file owns is the committed-artifact VERDICT VOCABULARY, which
// is genuinely different from the product's cache vocabulary:
//
//   product verdict  ->  this surface
//   GREEN            ->  ok
//   COLD (no file)   ->  MISSING     docs/lessons-index.md is absent or unreadable (a lesson landed without regenerating)
//   STALE            ->  DRIFT       the committed bytes differ from the recompute
//   ENUM_ERROR       ->  ENUM_ERROR  canon is missing, unreadable, empty, or invalid (dup id, unsafe title, CHECK-5)
// Any of the three -> RED (exit 1), printing the fix. On the product surface COLD and NO_CANON are GREEN by design
// (a gitignored cache, a fresh install); here the index is COMMITTED and canon always exists, so both are REDs.
//
// The GUARANTEE (P0, ARCHITECTURE §2 content-hash primitive applied to generated output): the committed
// docs/lessons-index.md is BYTE-IDENTICAL to what the shared core recomputes from live canon. ZERO LLM: the verdict
// is byte-equality only (P2: the canon TITLES it compares are untrusted DATA, but the comparison is over bytes).
//
// WHAT THIS DOES NOT GUARANTEE (P0 — say it, don't bury it):
//   - NOT that the index is TRUE. A wrong parser would be regenerated, committed wrongly, and this gate
//     would stay GREEN. The guarantee is consistency, not correctness.
//   - NOT that a lesson's `type` / `concepts` DESCRIBE it. Those are model-drafted values ratified by a
//     human at the /pharn-dev-memory-promote gate; "typed `floor`" never means "about the floor",
//     so selection keyed on this index is ADVISORY context selection, never a guarantee.
//   - NOT that anyone READ a lesson. "The index is current" says nothing about consumption.
//   - NOT that the index is even WIRED. This checker only runs if something invokes it; the package.json
//     `docs:check` wiring is pinned separately by the drift test in lessons-index-core.test.mjs.
//
// Usage:  node .dev/floor/check-lessons-index.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only, fail-closed.

import "../../pharn/floor/runtime-floor.mjs";
import { existsSync, statSync } from "node:fs";
import { checkLessonsIndex as productCheck } from "../../pharn/floor/check-lessons-index.mjs";
import { buildIndex, DEV_PROFILE, CANON_PATH, OUT_PATH } from "./lessons-index-core.mjs";

const FIX = DEV_PROFILE.regen;

/**
 * Check the committed index against a fresh recompute. Returns { ok, findings, malformedCount } where each
 * finding is { type: "DRIFT"|"MISSING"|"ENUM_ERROR", file, problem }. Pure — no process exit, so tests can call it.
 */
export function checkLessonsIndex(targetDir) {
  // Canon first, through this surface's buildIndex: it refuses the shared core's benign no-canon status, so an
  // absent or empty canon is an ENUM_ERROR here. `file` is CANON_PATH on this branch — the derived index is not the
  // thing to fix, and the generator refuses exactly this canon, so naming the output would prescribe a regenerate
  // that cannot succeed (lessons-learned L4/L31).
  try {
    buildIndex(targetDir);
  } catch (e) {
    return { ok: false, findings: [{ type: "ENUM_ERROR", file: CANON_PATH, problem: e.message }], malformedCount: 0 };
  }

  const { verdict, findings, malformedCount } = productCheck(targetDir, DEV_PROFILE);
  if (verdict === "GREEN") return { ok: true, findings: [], malformedCount };
  if (verdict === "COLD") {
    return {
      ok: false,
      findings: [{ type: "MISSING", file: OUT_PATH, problem: "expected index file is not committed or is unreadable" }],
      malformedCount: 0,
    };
  }
  if (verdict === "STALE") {
    return {
      ok: false,
      findings: [{ type: "DRIFT", file: OUT_PATH, problem: "committed bytes differ from the index recomputed from canon" }],
      malformedCount: 0,
    };
  }
  // ENUM_ERROR (canon changed between the two reads), NO_CANON (likewise), or a token this wrapper does not know:
  // the terminal fallback is a RED that blames canon, never a GREEN (P5, fail-closed).
  const problem = findings[0]?.problem ?? `the shared checker returned ${JSON.stringify(verdict)}`;
  return { ok: false, findings: [{ type: "ENUM_ERROR", file: CANON_PATH, problem }], malformedCount: 0 };
}

function main() {
  const target = process.argv[2] || ".";
  // Fail-closed (P5): a missing / non-directory target is an error, never a silent GREEN.
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    process.stderr.write(`check-lessons-index: target dir not found (or not a directory): ${target}\n`);
    process.exit(1);
  }
  const { ok, findings, malformedCount } = checkLessonsIndex(target);
  if (ok) {
    process.stdout.write(`LESSONS-INDEX: GREEN — ${OUT_PATH} matches the index recomputed from canon\n`);
    if (malformedCount > 0) {
      process.stdout.write(
        `LESSONS-INDEX: WARN — ${malformedCount} entry(ies) carry a malformed tag line (rendered "?") — read them in canon\n`
      );
    }
    process.exit(0);
  }
  const hasEnumError = findings.some((f) => f.type === "ENUM_ERROR");
  if (hasEnumError) {
    process.stdout.write(`LESSONS-INDEX: RED — ${findings.length} finding(s); canonical input is invalid — the index cannot be rendered\n`);
  } else {
    process.stdout.write(`LESSONS-INDEX: RED — ${findings.length} finding(s); the generated index is out of date\n`);
  }
  for (const f of findings) {
    process.stdout.write(`- [${f.type}] ${f.file}\n    ${f.problem}\n`);
  }
  if (hasEnumError) {
    process.stdout.write(`\nFIX: correct the canonical input in ${CANON_PATH} — ${FIX} cannot succeed until the input error is resolved\n`);
  } else {
    process.stdout.write(`\nFIX: regenerate and commit — ${FIX}\n`);
  }
  process.exit(1);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/hash-doc.mjs` for the three failure modes it has.
if (import.meta.main) {
  main();
}
