#!/usr/bin/env node
// .dev/floor/check-install-manifest.mjs — the DRIFT CHECKER for `pharn-install.json` (7.21.0, install-manifest).
//
// THE GUARANTEE (P0, ARCHITECTURE §2 content-hash primitive applied to generated output): the committed
// `pharn-install.json` is BYTE-IDENTICAL to what install-manifest-core.mjs computes from the live tree — the same
// function the generator writes with. Run by `npm run docs:check`, so by `npm run check` and by CI's "Docs drift check"
// step on every pull request. Findings, each RED (exit 1):
//   - MISSING     the file is absent or unreadable;
//   - DRIFT       its bytes differ from the recomputed bytes (an installed file, SKILLS_VERSION, a capability's
//                 frontmatter or the models block changed without regenerating);
//   - ENUM_ERROR  the core refused the tree (a symlinked installable path, an empty surface, a bad SKILLS_VERSION, ...);
//                 regenerating cannot fix that, so the remedy names the refusal instead.
// GREEN (exit 0) otherwise. A target that is not a directory is RED. Zero LLM: byte equality and the core's membership
// tests only.
//
// WHAT THIS DOES NOT GUARANTEE (P0, L43). That the manifest is RIGHT: a wrong rule in the core regenerates cleanly and
// stays GREEN. That the CLI installs what it says: that is the CLI's verification (CORE-194). That the tarball carries
// these bytes: true while `.gitattributes` keeps the tree LF and declares no `export-ignore`, which nothing here checks.
//
// Usage:  node .dev/floor/check-install-manifest.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only, fail-closed.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { computeInstallManifest, InstallManifestError, MANIFEST_PATH, REGENERATE } from "./install-manifest-core.mjs";

/** One remedy per finding type (L27): a shared trailer would tell an ENUM_ERROR to regenerate, which cannot help. */
export const FIX = {
  MISSING: `generate and commit it — ${REGENERATE}`,
  DRIFT: `regenerate and commit — ${REGENERATE}`,
  ENUM_ERROR: "fix the tree the refusal names (regenerating refuses the same way), then regenerate",
};

/** Check `target`. Returns { ok, findings: [{type, file, problem}] }. Pure apart from reads. */
export function checkInstallManifest(target) {
  let expected;
  try {
    expected = computeInstallManifest(target);
  } catch (e) {
    if (!(e instanceof InstallManifestError)) throw e;
    return { ok: false, findings: [{ type: "ENUM_ERROR", file: MANIFEST_PATH, problem: e.message }] };
  }
  let actual;
  try {
    actual = readFileSync(join(target, MANIFEST_PATH), "utf8");
  } catch {
    return {
      ok: false,
      findings: [{ type: "MISSING", file: MANIFEST_PATH, problem: "the install manifest is not committed (or unreadable)" }],
    };
  }
  if (actual !== expected) {
    return {
      ok: false,
      findings: [{ type: "DRIFT", file: MANIFEST_PATH, problem: "committed bytes differ from the manifest recomputed from the tree" }],
    };
  }
  return { ok: true, findings: [] };
}

export function main(argv = process.argv.slice(2), io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(s));
  const target = argv[0] || ".";
  let isDir = false;
  try {
    isDir = statSync(target).isDirectory();
  } catch {
    // not found: RED below
  }
  if (!isDir) {
    out(`INSTALL-MANIFEST: RED — target dir not found (or not a directory): ${JSON.stringify(target)}\n`);
    return 1;
  }
  const { ok, findings } = checkInstallManifest(target);
  if (ok) {
    out(`INSTALL-MANIFEST: GREEN — ${MANIFEST_PATH} matches the manifest recomputed from the tree\n`);
    return 0;
  }
  out(`INSTALL-MANIFEST: RED — ${findings.length} finding(s)\n`);
  for (const f of findings) out(`- [${f.type}] ${f.file}\n    ${f.problem}\n    FIX: ${FIX[f.type]}\n`);
  return 1;
}

if (import.meta.main) {
  process.exitCode = main();
}
