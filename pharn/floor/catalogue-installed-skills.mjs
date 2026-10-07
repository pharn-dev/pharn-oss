#!/usr/bin/env node
// pharn/floor/catalogue-installed-skills.mjs — the body-free CATALOGUE of user-installed Claude Code skills
// (6.47.0). The companion of `scan-installed-skills.mjs`, over the same discovery (`installed-skills-core.mjs`,
// whose header owns the output shape, the supported metadata subset, the bounds, the `mode` rule and the
// access check — cited here, not restated, P4).
//
// A COMPANION, NOT A FLAG. The scanner's one positional argument is its target; a flag there would
// reinterpret it for every existing caller. This CLI takes the same `[targetDir]` (default: cwd) and the same
// target check, so `/pharn-build`, full `/pharn-grill` and each `/pharn-review` lens run one pinned line and
// branch only on the exit code and the `catalogue` / `mode` fields (P5).
//
// EXITS. 0 — the catalogue, one JSON line on stdout (an empty roster included: `mode: "none"`). 1 — the
// target is missing or not a directory; nothing on stdout (the scanner's own behaviour). 2 — an internal
// failure while building; nothing on stdout. A consumer treats any non-zero exit, output that is not JSON, or
// a `catalogue` value other than `installed-skills/1` as "catalogue unusable" and falls back to the legacy
// roster and full reads. It GATES NOTHING: no stage proceed/stop reads this output.
//
// Usage:  node pharn/floor/catalogue-installed-skills.mjs [targetDir]

import "./runtime-floor.mjs";
import { existsSync, statSync } from "node:fs";
import { buildCatalogue } from "./installed-skills-core.mjs";

/** The CLI, injectable for tests: returns the exit code, writing through `out` / `err`. */
export function run(argv, { build = buildCatalogue, out = (s) => process.stdout.write(s), err = (s) => process.stderr.write(s) } = {}) {
  const target = argv[0] || ".";
  let isDir;
  try {
    isDir = existsSync(target) && statSync(target).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    err(`catalogue-installed-skills: target dir not found (or not a directory): ${JSON.stringify(target)}\n`);
    return 1;
  }
  let line;
  try {
    line = JSON.stringify(build(target)) + "\n";
  } catch (e) {
    // L62: quote through something that cannot throw — a thrown non-Error may have a hostile toString.
    const msg = e instanceof Error && typeof e.message === "string" ? e.message : "a non-Error value was thrown";
    err(`catalogue-installed-skills: internal failure: ${JSON.stringify(msg)}\n`);
    return 2;
  }
  out(line);
  return 0;
}

if (import.meta.main) process.exitCode = run(process.argv.slice(2));
