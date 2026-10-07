#!/usr/bin/env node
// .dev/floor/check-capability-catalog.mjs — the capability-catalog DRIFT CHECKER (build apparatus).
//
// The GUARANTEE (P0, ARCHITECTURE §2 content-hash primitive applied to generated output): every
// generated artifact is BYTE-IDENTICAL to what capability-catalog-core.mjs recomputes from live repo
// state. It recomputes via the SAME core the generator uses, then compares.
//
// Artifact 1 — docs/capabilities/** (and its page SET matches the capability set exactly):
//   - DRIFT           : a committed page's bytes != the recomputed bytes
//   - MISSING         : a capability has no committed page (a new capability added without regenerating)
//   - ORPHAN          : a committed page has no backing capability
// Artifact 2 — the root README.md `## Current state` block, between its CURRENT-STATE markers:
//   - README_MISSING  : README.md is absent or unreadable
//   - README_MARKERS  : the marker pair is missing, duplicated, or inverted
//   - README_DRIFT    : the committed block's bytes != the recomputed block
// Any of these → RED (exit 1), printing the fix command. Clean → GREEN (exit 0). ZERO LLM: the verdict
// is byte-equality + path-set membership + marker-occurrence counting only (P2: it never rests on a
// free-text/tainted field).
//
// WHAT THIS DOES NOT GUARANTEE (P0 — say it, don't bury it):
//   - NOT that the generated content is TRUE. A wrong enumerator would be regenerated, committed
//     wrongly, and this gate would stay GREEN. The guarantee is consistency, not correctness.
//   - NOT anything about README prose OUTSIDE the markers. That text is hand-written, ADVISORY, and
//     entirely UNGUARDED — a stale hand-written claim is exactly what this checker cannot see.
//   - NOT that the capability count agrees with pharn/floor/validate.mjs. The core MIRRORS that
//     script's `role:` test in a second implementation (validate.mjs exports nothing); nothing on the
//     floor forces them to stay in sync, so that agreement is ADVISORY.
//
// Usage:  node .dev/floor/check-capability-catalog.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only, fail-closed.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildCatalog,
  listCommittedPages,
  OUT_DIR,
  README_PATH,
  extractCurrentState,
  renderReadmeCurrentState,
} from "./capability-catalog-core.mjs";

const FIX = "npm run docs:generate";

/**
 * Check the committed catalog against a fresh recompute. Returns { ok, findings } where each finding is
 * { type: "DRIFT"|"MISSING"|"ORPHAN", file, problem }. Pure — no process exit, so tests can call it.
 */
export function checkCatalog(targetDir) {
  const findings = [];
  let files;
  try {
    ({ files } = buildCatalog(targetDir));
  } catch (e) {
    // A duplicate-slug (or other enumeration) error is a hard, deterministic RED — surface it.
    findings.push({ type: "ENUM_ERROR", file: OUT_DIR, problem: e.message });
    return { ok: false, findings };
  }

  // MISSING / DRIFT: every expected page must exist and match byte-for-byte.
  for (const [rel, expected] of files) {
    const abs = join(targetDir, rel);
    if (!existsSync(abs)) {
      findings.push({ type: "MISSING", file: rel, problem: `expected catalog file is not committed` });
      continue;
    }
    let actual;
    try {
      actual = readFileSync(abs, "utf8");
    } catch {
      findings.push({ type: "MISSING", file: rel, problem: `expected catalog file is unreadable` });
      continue;
    }
    if (actual !== expected) {
      findings.push({ type: "DRIFT", file: rel, problem: `committed bytes differ from the recomputed page` });
    }
  }

  // ORPHAN: a committed page under OUT_DIR with no backing capability.
  for (const rel of listCommittedPages(targetDir)) {
    if (!files.has(rel)) {
      findings.push({ type: "ORPHAN", file: rel, problem: `committed page has no backing capability` });
    }
  }

  findings.push(...checkReadmeCurrentState(targetDir));
  return { ok: findings.length === 0, findings };
}

/**
 * Check the committed README `## Current state` region against a fresh recompute. Returns findings[].
 * Split out so the two artifacts' verdicts are independently readable; both feed the same exit code.
 */
export function checkReadmeCurrentState(targetDir) {
  let committed;
  try {
    committed = readFileSync(join(targetDir, README_PATH), "utf8");
  } catch {
    return [{ type: "README_MISSING", file: README_PATH, problem: `README.md is missing or unreadable` }];
  }

  let region;
  try {
    ({ region } = extractCurrentState(committed));
  } catch (e) {
    // Missing / duplicated / inverted markers: the message names the exact defect.
    return [{ type: "README_MARKERS", file: README_PATH, problem: e.message }];
  }

  let expected;
  try {
    expected = renderReadmeCurrentState(targetDir);
  } catch (e) {
    // A missing enumerated directory or an unsafe basename — a hard, deterministic RED, never a silent pass.
    return [{ type: "ENUM_ERROR", file: README_PATH, problem: e.message }];
  }

  if (region !== expected) {
    return [{ type: "README_DRIFT", file: README_PATH, problem: `committed CURRENT-STATE block differs from the recomputed block` }];
  }
  return [];
}

function main() {
  const target = process.argv[2] || ".";
  // Fail-closed (P5): a missing / non-directory target is an error, never a silent GREEN.
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    process.stderr.write(`check-capability-catalog: target dir not found (or not a directory): ${target}\n`);
    process.exit(1);
  }
  const { ok, findings } = checkCatalog(target);
  if (ok) {
    process.stdout.write(`CATALOG: GREEN — ${OUT_DIR}/ and the ${README_PATH} current-state block match their sources\n`);
    process.exit(0);
  }
  process.stdout.write(`CATALOG: RED — ${findings.length} finding(s); a generated artifact is out of date\n`);
  for (const f of findings) {
    process.stdout.write(`- [${f.type}] ${f.file}\n    ${f.problem}\n`);
  }
  process.stdout.write(`\nFIX: regenerate and commit — ${FIX}\n`);
  process.exit(1);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/hash-doc.mjs` for the three failure modes it has.
if (import.meta.main) {
  main();
}
