#!/usr/bin/env node
// .dev/floor/check-lessons-index.mjs — the lessons-index DRIFT CHECKER (build apparatus).
//
// The GUARANTEE (P0, ARCHITECTURE §2 content-hash primitive applied to generated output): the committed
// docs/lessons-index.md is BYTE-IDENTICAL to what lessons-index-core.mjs recomputes from live canon. It
// recomputes via the SAME core the generator uses, then compares.
//
//   - MISSING    : docs/lessons-index.md is absent or unreadable (a new lesson landed without regenerating)
//   - DRIFT      : the committed bytes differ from the recomputed bytes
//   - ENUM_ERROR : the core refused to render (duplicate id, unsafe title, missing canon, CHECK-5 hazard)
// Any of these → RED (exit 1), printing the fix command. Clean → GREEN (exit 0). ZERO LLM: the verdict is
// byte-equality only (P2: it never rests on a free-text/tainted field — the canon TITLES it compares are
// untrusted DATA, but the comparison is over bytes, not meaning).
//
// WHAT THIS DOES NOT GUARANTEE (P0 — say it, don't bury it):
//   - NOT that the index is TRUE. A wrong parser would be regenerated, committed wrongly, and this gate
//     would stay GREEN. The guarantee is consistency, not correctness.
//   - NOT that a lesson's `type` / `concepts` DESCRIBE it. Those are model-drafted values ratified by a
//     human at the /pharn-dev-memory-promote gate (#114); "typed `floor`" never means "about the floor",
//     so selection keyed on this index is ADVISORY context selection, never a guarantee.
//   - NOT that anyone READ a lesson. "The index is current" says nothing about consumption.
//   - NOT that the index is even WIRED. This checker only runs if something invokes it; the package.json
//     `docs:check` wiring is pinned separately by the drift test in lessons-index-core.test.mjs.
//
// Usage:  node .dev/floor/check-lessons-index.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only, fail-closed.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildIndex, CANON_PATH, OUT_PATH, MALFORMED } from "./lessons-index-core.mjs";

const FIX = "npm run docs:generate";

/**
 * Check the committed index against a fresh recompute. Returns { ok, findings } where each finding is
 * { type: "DRIFT"|"MISSING"|"ENUM_ERROR", file, problem }. Pure — no process exit, so tests can call it.
 */
export function checkLessonsIndex(targetDir) {
  let expected;
  let malformedCount;
  try {
    const { content, entries } = buildIndex(targetDir);
    expected = content;
    malformedCount = entries.filter((e) => e.type === MALFORMED).length;
  } catch (e) {
    // A duplicate id / unsafe title / missing canon is a hard, deterministic RED — surface it.
    // `file` is CANON_PATH, not OUT_PATH: this is the ONE branch where the derived index is not the
    // thing to fix. The generator refuses exactly the invalid canon the checker just refused, so naming
    // the generated output prescribes a regenerate that CANNOT succeed. `file` is the enum-gated field a
    // consumer trusts to name the file to open, and on this branch that file is canon.
    // The product twin (pharn/floor/check-lessons-index.mjs) was corrected first and pins it by test;
    // this is the backport — the copy-pair obligation lessons-learned L31 names, discharged on the
    // second copy. MISSING / DRIFT below correctly stay on OUT_PATH: those really are about the output.
    return { ok: false, findings: [{ type: "ENUM_ERROR", file: CANON_PATH, problem: e.message }], malformedCount: 0 };
  }

  const abs = join(targetDir, OUT_PATH);
  let actual;
  try {
    actual = readFileSync(abs, "utf8");
  } catch {
    return {
      ok: false,
      findings: [{ type: "MISSING", file: OUT_PATH, problem: "expected index file is not committed or is unreadable" }],
      malformedCount: 0,
    };
  }

  if (actual !== expected) {
    return {
      ok: false,
      findings: [{ type: "DRIFT", file: OUT_PATH, problem: "committed bytes differ from the index recomputed from canon" }],
      malformedCount: 0,
    };
  }
  return { ok: true, findings: [], malformedCount };
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
