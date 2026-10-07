#!/usr/bin/env node
// .dev/floor/gen-capability-catalog.mjs — the capability-catalog GENERATOR (build apparatus).
//
// Emits TWO generated artifacts from the same core (see that file's SCOPE NOTE for why one module):
//   1. docs/capabilities/ — one page per role-bearing capability + a README index — from the SAME
//      source `.md` files pharn/floor/validate.mjs treats as capabilities.
//   2. The root README.md `## Current state` block, spliced strictly BETWEEN its existing
//      `CURRENT-STATE:BEGIN` / `:END` marker pair.
// Rendering is delegated ENTIRELY to capability-catalog-core.mjs, the single source of truth shared with
// the drift checker, so the two can never diverge (P3). Output is deterministic + idempotent: no
// timestamps, stable ordering; running twice yields byte-identical files, and the generator DELETES any
// stale page no longer backed by a capability so `docs/capabilities/` is always exactly the current
// catalog.
//
// The README splice NEVER invents a marker and NEVER guesses replacement boundaries: a missing,
// duplicated, or inverted marker pair is a hard error (fail-closed, P5), because a generator that
// relocates its own markers could silently overwrite hand-written prose.
//
// This is NOT a floor guarantee (P0): running a generator is orchestration. The guarantee is the
// checker's byte-equality (`check-capability-catalog.mjs`); this just produces the bytes it checks.
//
// Usage:  node .dev/floor/gen-capability-catalog.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  buildCatalog,
  listCommittedPages,
  OUT_DIR,
  README_PATH,
  renderReadmeCurrentState,
  spliceCurrentState,
} from "./capability-catalog-core.mjs";

/** Generate both artifacts under targetDir. Returns { written, removed, readmeUpdated }. */
export function generate(targetDir) {
  const { files } = buildCatalog(targetDir);
  mkdirSync(join(targetDir, OUT_DIR), { recursive: true });

  // Remove stale pages (a capability that was renamed/removed) so there are never orphans on disk.
  let removed = 0;
  for (const rel of listCommittedPages(targetDir)) {
    if (!files.has(rel)) {
      rmSync(join(targetDir, rel));
      removed++;
    }
  }

  let written = 0;
  for (const [rel, content] of files) {
    writeFileSync(join(targetDir, rel), content);
    written++;
  }

  // Artifact 2 — the README `## Current state` block. Read-modify-write, and write ONLY on a real
  // change so a second run is a true filesystem no-op (idempotence, not just byte-equality).
  const readmeAbs = join(targetDir, README_PATH);
  const current = readFileSync(readmeAbs, "utf8"); // absent/unreadable README → throw (fail-closed)
  const next = spliceCurrentState(current, renderReadmeCurrentState(targetDir));
  const readmeUpdated = next !== current;
  if (readmeUpdated) writeFileSync(readmeAbs, next);

  return { written, removed, readmeUpdated };
}

function main() {
  const target = process.argv[2] || ".";
  const { written, removed, readmeUpdated } = generate(target);
  process.stdout.write(
    `capability-catalog: wrote ${written} file(s)` +
      (removed ? `, removed ${removed} stale page(s)` : "") +
      ` under ${OUT_DIR}/; ${README_PATH} current-state block ${readmeUpdated ? "updated" : "already current"}\n`
  );
  process.exit(0);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/hash-doc.mjs` for the three failure modes it has.
if (import.meta.main) {
  main();
}
