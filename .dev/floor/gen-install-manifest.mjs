#!/usr/bin/env node
// .dev/floor/gen-install-manifest.mjs — writes `pharn-install.json`, the install manifest (7.21.0, install-manifest).
//
// The bytes come ENTIRELY from install-manifest-core.mjs `computeInstallManifest`, the one renderer the drift checker
// (check-install-manifest.mjs) also calls, so "recompute" equals "generate" by construction (P3). Deterministic: no
// timestamp, every list sorted; it writes only on a byte change, so a second run is a filesystem no-op. A refusal from
// the core (a symlinked installable path, an empty surface, a bad SKILLS_VERSION, ...) writes nothing and exits 1.
//
// Not a floor guarantee (P0): running a generator is orchestration. The guarantee is the checker's byte equality.
//
// Usage:  node .dev/floor/gen-install-manifest.mjs [targetDir]     (default: cwd; run by `npm run docs:generate`)
// Non-LLM, stdlib-only.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeInstallManifest, InstallManifestError, MANIFEST_PATH } from "./install-manifest-core.mjs";

/** Generate under `target`. Returns { updated }: whether the file's bytes changed. */
export function generate(target) {
  const next = computeInstallManifest(target);
  const abs = join(target, MANIFEST_PATH);
  let current = null;
  try {
    current = readFileSync(abs, "utf8");
  } catch {
    // absent: written below
  }
  if (current === next) return { updated: false };
  writeFileSync(abs, next);
  return { updated: true };
}

export function main(argv = process.argv.slice(2), io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(s));
  const err = io.err ?? ((s) => process.stderr.write(s));
  const target = argv[0] || ".";
  try {
    const { updated } = generate(target);
    out(`install-manifest: ${MANIFEST_PATH} ${updated ? "written" : "already current"}\n`);
    return 0;
  } catch (e) {
    if (!(e instanceof InstallManifestError)) throw e;
    err(`install-manifest: NOT written — ${e.message}\n`);
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = main();
}
