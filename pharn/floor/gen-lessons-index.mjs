#!/usr/bin/env node
// pharn/floor/gen-lessons-index.mjs — the lessons-index GENERATOR, on the PRODUCT surface.
//
// Emits `.pharn/lessons-index.md` from the user's `memory-bank/lessons-learned.md`. Rendering is delegated
// ENTIRELY to lessons-index-core.mjs, the single source of truth shared with the drift checker, so the two
// can never diverge (P3). Output is deterministic + idempotent: no timestamps, ordering by numeric id;
// running twice yields byte-identical bytes, and the file is written ONLY on a real change so a second run
// is a true filesystem no-op.
//
// This is NOT a floor guarantee (P0): running a generator is orchestration. The property downstream is the
// checker's comparison (`check-lessons-index.mjs`); this just produces the bytes it compares against — and
// that comparison is itself NARROWED, because the output is a disposable cache (see the core's header).
//
// ════ WHY IT WRITES TO .pharn/ AND NOT INTO memory-bank/ ════
// The write-guards (fix #2 + fix #7) gate the Write|Edit|MultiEdit TOOL surface only, so a Bash-run
// generator writing into the fail-closed sensitive zone `memory-bank/**` would NORMALIZE a bypass of
// fix #7 — teaching future increments that a generator may reach a zone the Write tool cannot, and that
// zone is precisely the gated canon /pharn-memory-promote's check-provenance + human accept exist to
// protect. `.pharn/` is always-writable runtime scratch, so no guard is bypassed to reach it.
// (`docs/` was the third candidate and was rejected on a different ground: in a user's repo `docs/` is
// THE USER'S directory, and writing there is a scope claim on ground PHARN does not own.)
//
// ════ THIS WRITE ESCAPES THE fix #7 WRITES-SCOPE — DECLARED, NOT PRETENDED (lessons-learned.md L19) ════
// A stage that invokes this generator through Bash writes OUTSIDE its `writes:` scope, because the hook
// gates the Write tool and this runs as a subprocess. That is stated here rather than papered over. It is
// benign for this specific target — `.pharn/**` is always-writable scratch, so nothing is granted that the
// scope withheld — but the MECHANISM is the one L19 documents, and a reader must not learn the wrong
// lesson from it.
//
// Usage:  node pharn/floor/gen-lessons-index.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only.

import "./runtime-floor.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { buildIndex, OUT_PATH, CANON_PATH, STATUS_NO_CANON } from "./lessons-index-core.mjs";

/**
 * Generate the index under targetDir. Returns { status, entries, updated }.
 *
 * With NO canon (absent, or present with zero lessons) this writes NOTHING and reports
 * `status: "no-canon"` — a benign no-op, never an error. A project that has promoted no lessons is the
 * common, honest state of a fresh install; refusing there would make the tool hostile on day one.
 *
 * Throws (fail-closed) only when canon IS present and INVALID.
 */
export function generate(targetDir) {
  const { status, entries, content } = buildIndex(targetDir);
  if (status === STATUS_NO_CANON) {
    return { status, entries, updated: false };
  }

  const abs = join(targetDir, OUT_PATH);
  mkdirSync(dirname(abs), { recursive: true });

  let current = null;
  try {
    current = readFileSync(abs, "utf8");
  } catch {
    // no cache yet — first generation
  }
  const updated = current !== content;
  if (updated) writeFileSync(abs, content);
  return { status, entries, updated };
}

function main() {
  const target = process.argv[2] || ".";
  const { status, entries, updated } = generate(target);
  if (status === STATUS_NO_CANON) {
    process.stdout.write(
      `lessons-index: no canon at ${CANON_PATH} (absent, or no lessons yet) — nothing to index; ${OUT_PATH} not written\n`
    );
    process.exit(0);
  }
  process.stdout.write(
    `lessons-index: ${entries.length} lesson(s) from ${CANON_PATH}; ${OUT_PATH} ${updated ? "updated" : "already current"}\n`
  );
  process.exit(0);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare, which silently no-ops on spaced/non-ASCII/symlinked paths.
if (import.meta.main) {
  main();
}
