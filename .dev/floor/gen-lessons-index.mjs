#!/usr/bin/env node
// .dev/floor/gen-lessons-index.mjs — the lessons-index GENERATOR for the committed dev index (build apparatus).
//
// A THIN WRAPPER since 6.69.0 (audit ARCH-6): emits docs/lessons-index.md from .dev/memory-bank/lessons-learned.md
// through pharn/floor/gen-lessons-index.mjs's generate(), under this surface's profile (./lessons-index-core.mjs).
// Output is deterministic + idempotent (written only on a real change). The one thing it adds: canon MUST exist
// here, so the shared generator's benign `no-canon` status is a throw — fail-closed, never an empty index.
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
import { generate as productGenerate } from "../../pharn/floor/gen-lessons-index.mjs";
import { STATUS_NO_CANON } from "../../pharn/floor/lessons-index-core.mjs";
import { buildIndex, DEV_PROFILE, OUT_PATH, CANON_PATH } from "./lessons-index-core.mjs";

/** Generate the index under targetDir. Returns { entries, updated }. Throws (fail-closed) on absent or bad canon. */
export function generate(targetDir) {
  buildIndex(targetDir); // this surface's refusal of an absent / empty canon — before anything is written
  const { status, entries, updated } = productGenerate(targetDir, DEV_PROFILE);
  if (status === STATUS_NO_CANON) buildIndex(targetDir); // canon vanished between the reads: throw its message
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
