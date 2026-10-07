#!/usr/bin/env node
// .dev/floor/check-contributing-gates.mjs — the CONTRIBUTING gate-chain DRIFT CHECKER (build apparatus).
//
// The GUARANTEE (P0, ARCHITECTURE §2 primitive #3 — enum/regex): every gate named in package.json's
// `scripts.check` chain is also named, as a back-ticked token, somewhere in CONTRIBUTING.md. Both sides
// are read live from their STRUCTURED locations — the gate set is parsed out of the `scripts.check`
// STRING in package.json (not guessed, not hardcoded here), and membership is tested by exact
// back-ticked-substring presence. ZERO LLM.
//
//   - MISSING_PACKAGE  : package.json is absent, unreadable, or not JSON
//   - NO_CHECK_SCRIPT  : package.json declares no `scripts.check`
//   - EMPTY_CHAIN      : `scripts.check` parses to zero gates — a set with no members is not a chain
//   - MISSING_DOC      : CONTRIBUTING.md is absent or unreadable
//   - UNDOCUMENTED     : a gate in the chain is named nowhere in CONTRIBUTING.md — the defect this file
//                        exists for
// Any of these → RED (exit 1). Clean → GREEN (exit 0). Fail-closed throughout: no input state returns
// GREEN by default (P5).
//
// WHY THIS EXISTS AT ALL (the trigger, P7 — not a hypothetical). CONTRIBUTING.md described `npm run
// check` as "format:check + lint + lint:md + test" while package.json ran SEVEN gates. Three had been
// added — `docs:check`, `check:markers`, `check:badge` — and the sentence was never updated, so every
// contributor who edited a capability hit a `docs:check` RED the docs had not warned them about. That
// is at least the third occurrence of the same shape, and per lessons-learned L20 a defect whose only
// remedy is "remember to update it" has already demonstrated that discipline is the wrong kind of
// remedy. The repair itself (feature `contributing-gate-chain`) could only verify the enumeration ONCE,
// by hand, at build time — its `GRILL.md` F1 named that residual explicitly, and this check closes it.
// The sibling precedent is `check-version-badge.mjs`, whose trigger was the same lesson.
//
// WHAT THIS DOES NOT GUARANTEE (P0 — say it, don't bury it):
//   - NOT that CONTRIBUTING.md DESCRIBES the gates correctly. This tests NAME PRESENCE. A doc that
//     lists all seven and explains every one of them wrongly is GREEN. Prose accuracy is human-reviewed
//     and gated by nothing.
//   - NOT the REVERSE direction. A gate REMOVED from `scripts.check` while CONTRIBUTING still names it
//     stays GREEN here. That direction is deliberately not checked because it is not decidable from
//     these two files: CONTRIBUTING legitimately names package.json scripts that are NOT chain members
//     (`docs:generate`, `format`), so "a script name in the doc" and "a stale gate" are the same shape.
//     Closing it needs a third input (an explicit documented-gate list), which is a different design and
//     has no triggering failure yet (P7).
//   - NOT that the gate list in the doc is the doc's authoritative claim. CONTRIBUTING deliberately
//     defers to `scripts.check` as the source of truth; this enforces the weaker, decidable property
//     that the deferral is not accompanied by an incomplete summary.
//   - NOT that this checker RUNS. It guards nothing unless something invokes it; the package.json and
//     ci.yml wiring is pinned separately by check-contributing-gates.test.mjs.
//
// PARSING the chain, and why it is a token scan rather than a shell parse. `scripts.check` is a shell
// string (`npm run a && npm run b && npm test`). A real shell parse is out of proportion and would add a
// dependency; instead every `npm run <name>` and every bare `npm test` is extracted by regex, which is
// exact for the `&&`-chained form this repo uses and for any reordering of it. A chain that grew genuine
// shell control flow would EMPTY_CHAIN or under-report rather than silently pass, because an unmatched
// segment contributes no gate while every gate that IS matched is still checked.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const PACKAGE_PATH = "package.json";
const DOC_PATH = "CONTRIBUTING.md";

// `npm run <name>` (the common form) or a bare `npm test` (npm's built-in alias for `scripts.test`).
// The name charset matches this repo's script keys: lowercase, digits, `:` and `-`.
const GATE_RE = /\bnpm\s+(?:run\s+(?<named>[a-z0-9:-]+)|(?<builtin>test|start)\b)/g;

/**
 * Extract the ordered, de-duplicated gate set from a `scripts.check` chain string.
 * Exported for the tests; pure, no I/O.
 */
export function parseGateChain(chain) {
  if (typeof chain !== "string") return [];
  const out = [];
  for (const m of chain.matchAll(GATE_RE)) {
    const name = m.groups.named ?? m.groups.builtin;
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * Is `gate` named as a back-ticked token in `doc`?
 * The back-ticks are load-bearing, not cosmetic: a bare substring test would let the `test` gate match
 * any prose sentence containing the word, making that gate unfalsifiable.
 */
export function isDocumented(doc, gate) {
  return doc.includes("`" + gate + "`");
}

export function checkContributingGates(targetDir) {
  const findings = [];
  const red = (type, file, problem) => findings.push({ type, file, problem });

  const pkgPath = join(targetDir, PACKAGE_PATH);
  const docPath = join(targetDir, DOC_PATH);

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch (err) {
    red("MISSING_PACKAGE", PACKAGE_PATH, `cannot read or parse ${PACKAGE_PATH}: ${err.message}`);
    return { ok: false, findings, gates: [] };
  }

  const chain = pkg?.scripts?.check;
  if (typeof chain !== "string" || chain.trim() === "") {
    red("NO_CHECK_SCRIPT", PACKAGE_PATH, `scripts.check is absent or not a non-empty string — there is no chain to document`);
    return { ok: false, findings, gates: [] };
  }

  const gates = parseGateChain(chain);
  if (gates.length === 0) {
    red("EMPTY_CHAIN", PACKAGE_PATH, `scripts.check parsed to zero gates: ${JSON.stringify(chain)}`);
    return { ok: false, findings, gates };
  }

  let doc;
  try {
    doc = readFileSync(docPath, "utf8");
  } catch (err) {
    red("MISSING_DOC", DOC_PATH, `cannot read ${DOC_PATH}: ${err.message}`);
    return { ok: false, findings, gates };
  }

  for (const gate of gates) {
    if (!isDocumented(doc, gate)) {
      red("UNDOCUMENTED", DOC_PATH, `gate \`${gate}\` is in ${PACKAGE_PATH} scripts.check but is named nowhere in ${DOC_PATH}`);
    }
  }

  return { ok: findings.length === 0, findings, gates };
}

function main() {
  const target = process.argv[2] || ".";
  // Fail-closed (P5): a missing / non-directory target is an error, never a silent GREEN.
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    process.stderr.write(`check-contributing-gates: target dir not found (or not a directory): ${target}\n`);
    process.exit(1);
  }
  const { ok, findings, gates } = checkContributingGates(target);
  if (ok) {
    process.stdout.write(
      `CONTRIBUTING-GATES: GREEN — all ${gates.length} gate(s) in ${PACKAGE_PATH} scripts.check are named in ${DOC_PATH} (${gates.join(", ")})\n`
    );
    process.exit(0);
  }
  process.stdout.write(`CONTRIBUTING-GATES: RED — ${findings.length} finding(s)\n`);
  for (const f of findings) {
    process.stdout.write(`- [${f.type}] ${f.file}\n    ${f.problem}\n`);
  }
  process.stdout.write(
    `\nFIX: ${PACKAGE_PATH} scripts.check is the single source — name the missing gate(s) in ${DOC_PATH}, not the other way round.\n` +
      `NOTE (P0): this checks NAME PRESENCE only. It never verifies that the doc describes a gate correctly.\n`
  );
  process.exit(1);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/hash-doc.mjs` for the three failure modes it has.
if (import.meta.main) {
  main();
}
