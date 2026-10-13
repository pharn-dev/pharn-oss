// pharn/floor/plan-files-core.mjs — the ONE implementation of a PLAN's `## Files` grammar.
//
// Floor infrastructure, NOT a Capability (no `role:`; it lives in the floor-ignored dir). It carries no
// verdict and no exit code: it is a pure reader its consumers share.
//
//   • pharn/floor/check-build-complete.mjs — asks a STRUCTURAL question (does every CONCRETE declared
//     path exist after the build?) and owns the RED.
//   • pharn/floor/render-run-report.mjs — asks for each item's RAW LINE, to quote the declared purpose
//     verbatim as untrusted DATA.
//   • pharn/floor/check-ac-tests.mjs (6.17.0) — asks "would the build's scope cover this AC test file?", so it
//     compares what `clean` + `isConcrete` leave, exactly as the setter scopes.
//   • pharn/floor/ac-tests-lock.mjs (6.17.0) — the AC test files a lock pins.
//   • pharn/floor/apply-plan-deletions.mjs (6.56.0) — the paths a PLAN marks for deletion, which it removes.
//
// ── THE DELETION MARKER (6.56.0, plan-declared-deletions) ────────────────────────────────────────────
// A `## Files` item whose closing back-tick is followed by exactly ONE space, then exactly `(delete)`, then
// whitespace or the end of the line — ``- `src/old.ts` (delete) — why`` — declares that path for DELETION:
// `check-build-complete.mjs` requires it ABSENT after the build and `apply-plan-deletions.mjs` removes it. The
// marker sits OUTSIDE the back-ticks, so `value` (and the setter, which reads the same back-ticked text) still
// returns the bare path: the writes-scope keeps it, which `/pharn-loop`'s commit needs to stage the deletion.
// `entries[]` carries the reading — `delete` for the exact marker, `deleteNearMiss` for a variant spelling of it
// (another letter case, inner spaces, `deleted`/`deletes`, or no space, two spaces or a tab after the back-tick),
// which every reader REFUSES rather than read as an ordinary item (L36: an ordinary item would leave the file in place
// and pass). BOUND: two shapes are ordinary items that nothing reports, so the file stays and completeness reads
// complete — a synonym (`(remove)`, `(rm)`), and a correctly spelled `(delete)` placed anywhere but directly after the
// path (``- `src/x.ts` — orphan (delete)``, or after another annotation).
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
// ── FENCED CODE (6.61.0, loop-scope-hardening — review finding ENF-1) ────────────────────────────────
// Before 6.61.0 neither this reader nor the setter tracked code fences: a fenced "illustrative" list under
// `## Files` entered the scope, and a fenced `## Files` earlier in the file became the list while the real one
// was ignored (both reproduced by fixture). Now a fence line and every line inside an open fence are skipped
// entirely — never the heading, never an item, never a heading break, never an exclusion cue — except that a
// blank fenced line still closes an open item body, so the wrapped-continuation exemption never widens.
// A FENCE LINE is optional leading spaces/tabs, a run of three or more backticks or tildes, then the rest; a
// backtick run whose rest holds a backtick is inline code, never a fence (CommonMark). A closer is a fence
// line of the opener's character, at least as long, with a blank rest.
// THE DUAL READING. Whether a fence line indented four or more columns is a fence depends on list nesting,
// which this reader does not track. So it reads the plan twice — `nested: false` counts a fence line only at
// 0–3 spaces (CommonMark's top-level rule); `nested: true` counts it at any indentation, and a bare closer
// indented LESS than its opener ends that block and opens another (what happens when a list item ends under a
// fence) — and REFUSES when the two lists differ. Measured over the 281 committed PLAN.md / AC-TESTS.md files
// at 6.61.0: every one reads identically both ways, and identically to the pre-6.61.0 reader.
// BOUND (P0): this is NOT a CommonMark parser. An indented code block (a 4+-space item line after a paragraph
// and a blank line), an HTML block or comment holding a fence line, a setext heading and a `*`/`+` bullet are
// read as their lines look, not as a renderer shows them. The rule is held across the copy-pair by ★ PARITY
// fixtures, not by a differential test against a renderer. `fenceStates` is exported so a second reader of a
// PLAN section (render-ship-briefing.mjs) uses the same rule rather than its own toggle.
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
  // `\s+`, not `\s*` — the setter's rule. With `\s*`, `src/a(b)` became `src/a` here while the setter kept
  // `src/a(b)`, so the two disagreed about what a PLAN scopes; found by the pharn-test-stage review (6.17.0) and
  // pinned by a parity case in check-build-complete.test.mjs.
  return String(entry)
    .replace(/\s+\([^)]*\)\s*$/, "")
    .trim();
}

/**
 * A literal repo-relative path — no placeholders, globs, or empties (not existence-checkable).
 * A byte-faithful copy of set-writes-scope.cjs's `isConcrete`.
 */
export function isConcrete(entry) {
  return entry.length > 0 && !entry.includes("<") && !entry.includes(">") && !entry.includes("*") && !entry.includes("?");
}

/** The exact deletion marker, tested against an item's raw line (see the header). */
export const DELETE_MARKER_RE = /^\s*-\s+`[^`]+` \(delete\)(?=[ \t]|$)/;

/** A variant spelling of the marker. A line matching this but not DELETE_MARKER_RE is a near-miss, refused. */
export const DELETE_NEAR_MISS_RE = /^\s*-\s+`[^`]+`[ \t]*\(\s*delete[sd]?\s*\)/i;

/**
 * The leading back-tick path of each list item under `## Files`.
 *
 * @param {string} text  the PLAN's full source
 * @returns {{ok: false, reason: string} | {ok: true, value: string[], entries: {path: string, line: string, delete: boolean, deleteNearMiss: boolean}[]}}
 *   `value`   — the paths, in document order. Byte-for-byte the pre-extraction behaviour.
 *   `entries` — the same items, each with its RAW LINE. ADDITIVE: `render-run-report.mjs` needs the
 *               declared purpose beside the path, and quotes it verbatim as untrusted DATA. Since 6.56.0 each
 *               also carries `delete` (the exact marker) and `deleteNearMiss` (a variant spelling) — additive
 *               members, so no existing reader's answer moves (L72).
 *
 * The list is terminated by EITHER of two boundaries:
 *   1. STRUCTURAL — any markdown heading of any level, so an exclusion subsection (`### Explicitly not
 *      touched`) is its own heading and its paths are never scanned.
 *   2. CUE — a head-less prose exclusion intro, anchored to a NON-path, NON-blockquote line. A
 *      blockquote is explanatory commentary and is exempt; an authorized item's own description is a
 *      path-item and is exempt; and an INDENTED line while a path-item's body is still open (no blank line
 *      since the item) is that item's own WRAPPED text and is exempt too. All three are load-bearing:
 *      without them a narrative sentence between two path items silently TRUNCATED the authorized scope
 *      (fixed in the setter-cue-fix and plan-cue-continuation increments). The third was MISSING from this
 *      copy until 6.17.0 although this header claimed parity — so a wrapped description containing "out of
 *      scope" ended this list while the setter kept going. Found by the pharn-test-stage grill; a ★ PARITY
 *      case in check-build-complete.test.mjs now executes the setter against it.
 *
 * Boundary 2 is deliberately fail-CLOSED: on an ambiguous line the list ENDS, which blocks a build
 * rather than silently under-protecting it. Narrowing the cue would trade today's false positive for a
 * fail-OPEN false negative on a real, unusually-worded exclusion — the failure mode L18 records.
 */
export function pathsFromPlanFiles(text) {
  const lines = text.split(/\r?\n/);
  const top = readPlanFiles(lines, false);
  const nested = readPlanFiles(lines, true);
  // The comparison is the setter's own: the heading's index and the path list, in order.
  if (JSON.stringify([top.start, top.out]) !== JSON.stringify([nested.start, nested.out])) {
    return { ok: false, reason: AMBIGUOUS_FENCE_REASON };
  }
  if (top.start === -1) return { ok: false, reason: "no `## Files` heading" };
  return { ok: true, value: top.out, entries: top.entries };
}

/** The refusal when the two readings differ (see FENCED CODE in the header). */
export const AMBIGUOUS_FENCE_REASON =
  "the `## Files` list reads differently depending on whether a code fence sits inside a list item (a fence line indented four or more columns, or a closing fence indented less than its opening one) — indent each fence's opening and closing lines alike, at most three spaces, in and before `## Files`";

/** A fence line: indentation, a run of 3+ backticks or tildes, the rest (see FENCED CODE in the header). */
const FENCE_LINE_RE = /^([ \t]*)(`{3,}|~{3,})(.*)$/;

/**
 * Per line, whether it is fenced code — a fence line itself, or a line inside an open fence — under one of the
 * two readings (see FENCED CODE in the header). The same transitions as set-writes-scope.cjs's `readPlanFiles`.
 * @param {string[]} lines
 * @param {boolean} [nested]  false: a fence line counts only at 0–3 spaces; true: at any indentation, and a bare
 *   closer indented less than its opener ends that block and opens another
 * @returns {boolean[]}
 */
export function fenceStates(lines, nested = false) {
  const fenced = [];
  let fence = null; // { char, len, indent } while a fenced block is open
  for (const line of lines) {
    const f = line.match(FENCE_LINE_RE);
    if (f && !(f[2][0] === "`" && f[3].includes("`")) && (nested || /^ {0,3}$/.test(f[1]))) {
      const char = f[2][0];
      const closes = fence !== null && char === fence.char && f[2].length >= fence.len && f[3].trim() === "";
      if (fence === null) fence = { char, len: f[2].length, indent: f[1].length };
      else if (closes && (!nested || f[1].length >= fence.indent)) fence = null;
      else if (closes) fence = { char, len: f[2].length, indent: f[1].length }; // a list item ended; a new block opens
      fenced.push(true);
      continue;
    }
    fenced.push(fence !== null);
  }
  return fenced;
}

/** ONE reading of the `## Files` list: the heading's index (-1 when absent), the paths, and their entries. */
function readPlanFiles(lines, nested) {
  const fenced = fenceStates(lines, nested);
  let start = -1;
  const out = [];
  const entries = [];
  let inPathItemBody = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fenced[i]) {
      // Fenced code is never a heading, an item or a cue — but a blank line still closes an item's body.
      if (start !== -1 && !line.trim()) inPathItemBody = false;
      continue;
    }
    if (start === -1) {
      if (/^##\s+Files\b/.test(line)) start = i;
      continue;
    }
    // Boundary 1 — STRUCTURAL.
    if (/^\s{0,3}#{1,6}\s/.test(line)) break;
    // Boundary 2 — CUE fallback, with the path-item, blockquote and wrapped-continuation exemptions (the
    // setter's rule, set-writes-scope.cjs, byte for byte in behaviour).
    const isPathItem = /^\s*-\s+`[^`]+`/.test(line);
    const isBlockquote = /^\s*>/.test(line);
    const isWrappedContinuation = inPathItemBody && !isPathItem && /^\s+\S/.test(line);
    if (isPathItem) inPathItemBody = true;
    else if (!line.trim()) inPathItemBody = false;
    if (
      !isPathItem &&
      !isBlockquote &&
      !isWrappedContinuation &&
      /\bnot\W*(touch|writ|modif|edit|chang)|\bexplicitly\W*excluded|\bout\W*of\W*scope|\boff\W*limits/i.test(line)
    ) {
      break;
    }
    const m = line.match(/^\s*-\s+`([^`]+)`/);
    if (m) {
      out.push(m[1].trim());
      const del = DELETE_MARKER_RE.test(line);
      entries.push({ path: m[1].trim(), line, delete: del, deleteNearMiss: !del && DELETE_NEAR_MISS_RE.test(line) });
    }
  }
  return { start, out, entries };
}
