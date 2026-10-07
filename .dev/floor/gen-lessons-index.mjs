#!/usr/bin/env node
// .dev/floor/gen-lessons-index.mjs — the lessons-index GENERATOR (build apparatus).
//
// Emits docs/lessons-index.md from .dev/memory-bank/lessons-learned.md. Rendering is delegated ENTIRELY to
// lessons-index-core.mjs, the single source of truth shared with the drift checker, so the two can never
// diverge (P3). Output is deterministic + idempotent: no timestamps, ordering by numeric id; running twice
// yields byte-identical bytes, and the file is written ONLY on a real change so a second run is a true
// filesystem no-op.
//
// This is NOT a floor guarantee (P0): running a generator is orchestration. The guarantee is the checker's
// byte-equality (`check-lessons-index.mjs`); this just produces the bytes it checks.
//
// WHY IT WRITES TO docs/ AND NOT INTO .dev/memory-bank/. The write-guards (fix #2 + fix #7) gate the
// Write|Edit|MultiEdit tool surface only (.claude/settings.json), so a Bash-run generator writing into the
// fail-closed sensitive zone `.dev/memory-bank/**` would NORMALIZE a bypass of fix #7 — teaching future
// increments that a generator may reach a guarded zone the Write tool cannot. `docs/` is outside the
// sensitive set and matches the capability-catalog precedent.
//
// Usage:  node .dev/floor/gen-lessons-index.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { buildIndex, OUT_PATH, CANON_PATH } from "./lessons-index-core.mjs";

/** Generate the index under targetDir. Returns { entries, updated }. Throws (fail-closed) on bad canon. */
export function generate(targetDir) {
  const { entries, content } = buildIndex(targetDir);
  const abs = join(targetDir, OUT_PATH);
  mkdirSync(dirname(abs), { recursive: true });

  let current = null;
  try {
    current = readFileSync(abs, "utf8");
  } catch {
    // not yet committed — first generation
  }
  const updated = current !== content;
  if (updated) writeFileSync(abs, content);
  return { entries, updated };
}

function main() {
  const target = process.argv[2] || ".";
  const { entries, updated } = generate(target);
  process.stdout.write(
    `lessons-index: ${entries.length} lesson(s) from ${CANON_PATH}; ${OUT_PATH} ${updated ? "updated" : "already current"}\n`
  );
  process.exit(0);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/hash-doc.mjs` for the three failure modes it has.
if (import.meta.main) {
  main();
}
