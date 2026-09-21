// pharn/floor/plan-files-core.mjs — the ONE implementation of a PLAN's `## Files` grammar.
//
// Floor infrastructure, NOT a Capability (no `role:`; it lives in the floor-ignored dir). It carries no
// verdict and no exit code: it is a pure reader that two consumers share.
//
//   • pharn/floor/check-build-complete.mjs — asks a STRUCTURAL question (does every CONCRETE declared
//     path exist after the build?) and owns the RED.
//   • pharn/floor/render-run-report.mjs — asks for each item's RAW LINE, to quote the declared purpose
//     verbatim as untrusted DATA.
//
// ── WHY A SHARED CORE, and not a second copy (L35) ───────────────────────────────────────────────────
// The question "must the second copy exist?" is asked BEFORE choosing a remedy, never after. Here the
// answer is no: both consumers ship in `pharn/floor/`, so a user's install carries both or neither, and
// the dev/product split that FORCES the deliberate `check-provenance.mjs` / `lessons-index-core.mjs`
// copy-pairs does not apply. The alternative — the renderer importing the parser FROM the checker — is
// what this file replaces, and it is the shape REVIEW finding F3 named: it gave check-build-complete.mjs
// a SECOND reason to change (its completeness axis, plus its role as a shared parser), and the entry
// guard that arrived with the export was the visible symptom of the second consumer, not of its own job.
//
// ── PARITY WITH THE WRITES-SCOPE SETTER — the canonical parser lives elsewhere ────────────────────────
// `.claude/hooks/set-writes-scope.cjs`'s `pathsFromPlanFiles` + `clean` + `isConcrete` is the CANONICAL
// `## Files` parser: it is what fix #7 actually enforces a build's writes against. What follows is a
// faithful RE-IMPLEMENTATION of it, and the two MUST be updated together.
//
// The parity is held by a test, not by this sentence: check-build-complete.test.mjs's ★ PARITY case runs
// the checker and the setter over a shared fixture and requires the same path set. That test is
// EXAMPLE-BASED — it is not a proof of equivalence, so a setter change (a new exclusion cue, say) can
// silently drift this copy until a fixture covering it is added. Stated rather than implied, because the
// honest bound on a parity test is the thing a reader otherwise assumes away.
//
// Residual, shared with the setter and documented there too: an inline-marked `` - `path` — not touched ``
// item is a path-item to BOTH parsers, so it is treated as DECLARED, not excluded. The section-level
// `### Explicitly not touched` heading is the form that actually excludes.
//
// ── NO CROSS-TREE IMPORT (P3) ────────────────────────────────────────────────────────────────────────
// Nothing here imports from `.dev/`. That tree is the build apparatus, excluded wholesale at packaging
// ("ship root minus .dev/"), so a product-floor module importing from it would be GREEN in this repo and
// BROKEN in every install — a failure `npm run check` cannot see. Same discipline the two consumers keep.
// It does not import the SETTER either: that is a `.cjs` hook under `.claude/`, which an install places
// separately, so the parity is held by a test rather than by a require.
//
// ── TRUST (P2) ───────────────────────────────────────────────────────────────────────────────────────
// A PLAN's `## Files` content is `trust: untrusted` DATA. Nothing here eval's, executes, spawns, imports,
// resolves or fetches any of it — this module only slices strings. A crafted `## Files` entry can at most
// change WHICH strings come back; every consequence belongs to a consumer, and each states its own bound.
// The returned `path` and `line` values ORIGINATE in that untrusted text, so a renderer MUST quote them
// as DATA (render-run-report.mjs fences them) and a checker MUST use them only as operands.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// What this module IS: a line-oriented reader for the `## Files` list — the leading back-tick path of
//   each list item, plus that item's raw line, terminated by the two documented boundaries.
// What it is NOT: a Markdown parser, and not a judgment about the list. It does not know whether a
//   declared path SHOULD have been declared, whether the build actually wrote it, or whether the
//   description beside it is true. "The parser returned it" means EXACTLY "the text said so".
//
// NON-LLM. Node stdlib only — in fact zero imports. No network, no eval, no child processes.

/**
 * Strip a trailing " (annotation)" (e.g. " (gated)") and surrounding whitespace.
 * A byte-faithful copy of set-writes-scope.cjs's `clean`.
 */
export function clean(entry) {
  return String(entry)
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

/**
 * A literal repo-relative path — no placeholders, globs, or empties (not existence-checkable).
 * A byte-faithful copy of set-writes-scope.cjs's `isConcrete`.
 */
export function isConcrete(entry) {
  return entry.length > 0 && !entry.includes("<") && !entry.includes(">") && !entry.includes("*") && !entry.includes("?");
}

/**
 * The leading back-tick path of each list item under `## Files`.
 *
 * @param {string} text  the PLAN's full source
 * @returns {{ok: false, reason: string} | {ok: true, value: string[], entries: {path: string, line: string}[]}}
 *   `value`   — the paths, in document order. Byte-for-byte the pre-extraction behaviour.
 *   `entries` — the same items, each with its RAW LINE. ADDITIVE: `render-run-report.mjs` needs the
 *               declared purpose beside the path, and quotes it verbatim as untrusted DATA.
 *
 * The list is terminated by EITHER of two boundaries:
 *   1. STRUCTURAL — any markdown heading of any level, so an exclusion subsection (`### Explicitly not
 *      touched`) is its own heading and its paths are never scanned.
 *   2. CUE — a head-less prose exclusion intro, anchored to a NON-path, NON-blockquote line. A
 *      blockquote is explanatory commentary and is exempt; an authorized item's own description is a
 *      path-item and is exempt. Both exemptions are load-bearing: without them a narrative sentence
 *      between two path items silently TRUNCATED the authorized scope (fixed in the setter-cue-fix and
 *      plan-cue-continuation increments; this copy inherits the repaired rule, it does not re-derive it).
 *
 * Boundary 2 is deliberately fail-CLOSED: on an ambiguous line the list ENDS, which blocks a build
 * rather than silently under-protecting it. Narrowing the cue would trade today's false positive for a
 * fail-OPEN false negative on a real, unusually-worded exclusion — the failure mode L18 records.
 */
export function pathsFromPlanFiles(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Files\b/.test(l));
  if (start === -1) return { ok: false, reason: "no `## Files` heading" };
  const out = [];
  const entries = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    // Boundary 1 — STRUCTURAL.
    if (/^\s{0,3}#{1,6}\s/.test(line)) break;
    // Boundary 2 — CUE fallback, with the path-item and blockquote exemptions.
    const isPathItem = /^\s*-\s+`[^`]+`/.test(line);
    const isBlockquote = /^\s*>/.test(line);
    if (
      !isPathItem &&
      !isBlockquote &&
      /\bnot\W*(touch|writ|modif|edit|chang)|\bexplicitly\W*excluded|\bout\W*of\W*scope|\boff\W*limits/i.test(line)
    ) {
      break;
    }
    const m = line.match(/^\s*-\s+`([^`]+)`/);
    if (m) {
      out.push(m[1].trim());
      entries.push({ path: m[1].trim(), line });
    }
  }
  return { ok: true, value: out, entries };
}
