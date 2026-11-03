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
// and a blank line) and a `*`/`+` bullet are read as their lines look, not as a renderer shows them; an HTML block
// other than a comment is refused inside `## Files` (below). The rule is held across the copy-pair by ★ PARITY
// fixtures, not by a differential test against a renderer. `scanLines` / `fenceStates` are exported so a second
// reader of a PLAN section (render-ship-briefing.mjs) uses the same rule rather than its own toggle.
//
// ── 7.3.0 (plan-scope-hardening — review 2026-11-03, then an adversarial review of the first patch) ──────────────
// LINE ENDINGS. Lines split on `\r\n`, `\r` or `\n` (CommonMark's three), so a lone CR cannot fold a `## Files` or a
// `### …` heading into the line before it.
// HTML COMMENTS. A comment that hides lines is a CommonMark HTML block: a line beginning (0–3 spaces) with `<!--`
// starts it and the first line containing `-->` (that one included) ends it; those lines are never the heading, an
// item, a cue or a list break. An inline `<!-- … -->` closed on the same line, outside a back-tick code span and not
// backslash-escaped, is cut from the line's `text`. An unclosed `<!--` that does not start a line is literal text —
// the first patch treated it as a comment running on, which hid a later visible `### Explicitly not touched` heading
// and scoped the path under it (fail-open; reproduced) — and inside `## Files` it REFUSES with its line number (third
// review: renderers hide the indented or lazy lines after it, so `- a <!--` / `      - b` / `      -->` scoped a hidden
// `b`). Outside `## Files` it stays literal. A fence line inside a comment block is not a fence.
// GLOB CHARACTERS. An entry may hold `[`, `{` or `(` (`app/[slug]/page.tsx` is a real path); this reader and the
// setter keep it. A consumer that hands entries to a glob-reading tool must not pass them as patterns —
// `/pharn-dev-build` Step 2b passes only existing regular files by literal path, with no glob character.
// ITEM MARKERS. A path item is `-` followed by spaces or tabs only — a no-break space or other Unicode space is not a
// marker's space, and is not an indent — then a back-tick path. An item indented four or more columns past the
// previous item's text column (or at the margin, before the first item) is code or lazy paragraph text to a renderer,
// so it REFUSES with its line number.
// RAW HTML BLOCKS. Inside `## Files`, a line beginning (0–3 spaces) with `<` and a tag name, `/`, `?`, `!` + letter or
// `![CDATA[` starts an HTML block other than a comment (CommonMark types 1, 3–7) that can hide what follows from a
// renderer (`<div>` + a comment, a fence inside a `<div>`), so the reader REFUSES with the line number instead of
// guessing. Bound: an autolink at a line's start (`<https://…>`) is refused too.
// ONE `## Files`. A second visible `## Files` heading anywhere in the file is refused, naming both line numbers. No
// committed PLAN or AC-TESTS file (342 at 7.2.1) has two.
// ONE CONTIGUOUS LIST. Inside `## Files` the path items form one list: prose is allowed before the first item and
// after the last, and between two items only blank lines and the current item's own wrapped continuation (an
// indented line with no blank line since the item). Any other non-blank line after the first item — prose, a label in
// any spelling or markup (`Excluded:`, `**NOT in scope:**`, `<b>…</b>`, a full-width colon), a blockquote, a non-path
// bullet, a setext underline, an indented paragraph after a blank line, a lazy unindented continuation — ends the
// list, and a later path item makes the reader REFUSE, naming both line numbers. A nested path item right under a
// wrapped continuation (`- a` / `  Excluded:` / `  - b`) refuses the same way. The exclusion cue (Boundary 2) still
// ends the list where nothing follows; a cue line before the first item with items after it refuses too. This
// replaces the first patch's colon rule, which a label without a trailing ASCII colon walked past. Measured at 7.2.1,
// every committed PLAN / AC-TESTS (342) through the pre-batch setter and the 7.3.0 one, `--from-plan`, dev posture:
// 293 identical, 44 newly refused — 27 by this rule (a label, exclusion intro or prose between items; the exclusions
// among them were read correctly before and now refuse loudly), 14 naming a CI workflow, 3 naming canon — 5 already
// refused (control surface) and now refused first by this rule, 0 silent changes, 0 newly accepted; 0 by the HTML,
// unclosed-comment, indented-item, second-heading or project-relative refusals. Plans are not re-read once built.
// Remaining bound: an intro BEFORE the first item is prose, so `Excluded:` there with the items under it is scoped
// unless it uses one of the cue's words — the plan commands say `## Files` lists only files the increment writes, and
// the `### …` heading stays the form that always excludes.
// The comment and HTML fixtures were checked against markdown-it 15.0.3 offline
// (`.dev/features/plan-scope-hardening/BUILD.md`), not by a test that imports it. Probed bounds, all on the side of
// FEWER paths: a comment block opened inside a list item hides until its `-->` even past the item's end, where a
// renderer stops at the item's end.
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
 * Since 7.3.0 the list must be ONE contiguous list: any other line between path items ends it, and `ok: false`
 * comes back when a path item follows; a second visible `## Files` and a raw HTML block inside the section are
 * `ok: false` too (see the header).
 *
 * Boundary 2 is deliberately fail-CLOSED: on an ambiguous line the list ENDS, which blocks a build
 * rather than silently under-protecting it. Narrowing the cue would trade today's false positive for a
 * fail-OPEN false negative on a real, unusually-worded exclusion — the failure mode L18 records.
 */
export function pathsFromPlanFiles(text) {
  const lines = text.split(LINE_SPLIT_RE);
  const top = readPlanFiles(lines, false);
  const nested = readPlanFiles(lines, true);
  // The comparison is the setter's own: the heading's index, the path list in order, and the refusal (7.3.0).
  if (JSON.stringify([top.start, top.out, top.refusal]) !== JSON.stringify([nested.start, nested.out, nested.refusal])) {
    return { ok: false, reason: AMBIGUOUS_FENCE_REASON };
  }
  if (top.refusal) return { ok: false, reason: refusalReason(top.refusal) };
  if (top.start === -1) return { ok: false, reason: "no `## Files` heading" };
  return { ok: true, value: top.out, entries: top.entries };
}

/** The refusal when the two readings differ (see FENCED CODE in the header). */
export const AMBIGUOUS_FENCE_REASON =
  "the `## Files` list reads differently depending on whether a code fence sits inside a list item (a fence line indented four or more columns, or a closing fence indented less than its opening one) — indent each fence's opening and closing lines alike, at most three spaces, in and before `## Files`";

/**
 * The refusal reason for a reading's `refusal` (7.3.0 — see the header). Line numbers only, never the line's text:
 * the PLAN is untrusted (P2).
 * @param {{kind: "second-heading" | "split-list" | "html-block" | "unclosed-comment" | "indented-item", lines: [number, number]}} refusal
 */
export function refusalReason({ kind, lines: [a, b] }) {
  if (kind === "second-heading") {
    return `the PLAN has more than one \`## Files\` heading (lines ${a} and ${b}) — keep one \`## Files\` section, and give any other path list a different heading`;
  }
  if (kind === "html-block") {
    return `line ${a} under \`## Files\` starts a raw HTML block, which can hide lines from a rendered PLAN — remove it; write the list as plain markdown`;
  }
  if (kind === "unclosed-comment") {
    return `line ${a} under \`## Files\` opens an HTML comment it does not close, which can hide the lines after it from a rendered PLAN — close it on the same line, or remove it`;
  }
  if (kind === "indented-item") {
    return `line ${a} under \`## Files\` is a path item indented four or more columns past the previous item's text (or at the margin, before the first item), which a renderer shows as code or paragraph text, not a list item — indent it at most to the previous item's text column`;
  }
  return `line ${a} under \`## Files\` interrupts the path list and a path item follows it (line ${b}), so the reader cannot tell what that line says about the items after it — write ONE contiguous list with no labels or prose between items, and put excluded paths under a \`### …\` heading after the list`;
}

/** The `## Files` heading, as every reader of the section tests it (7.3.0: the briefing imports it — L69). */
export const FILES_HEADING_RE = /^##\s+Files\b/;

/** CommonMark's three line endings (7.3.0): a lone CR ends a line too. */
export const LINE_SPLIT_RE = /\r\n|\r|\n/;

/** A fence line: indentation, a run of 3+ backticks or tildes, the rest (see FENCED CODE in the header). */
const FENCE_LINE_RE = /^([ \t]*)(`{3,}|~{3,})(.*)$/;

// Index of the first `<!--` in `s` outside a back-tick code span and not backslash-escaped, else -1. A run of n
// back-ticks opens a span only when a later run of exactly n back-ticks on the same line closes it (CommonMark);
// otherwise it is literal. A byte-equal copy lives in set-writes-scope.cjs, pinned by a ✧ test.
function commentStart(s) {
  for (let i = 0; i < s.length;) {
    if (s[i] === "\\") {
      i += 2;
      continue;
    }
    if (s[i] === "`") {
      let n = 0;
      while (s[i + n] === "`") n++;
      let close = -1;
      for (let j = i + n; j < s.length;) {
        if (s[j] !== "`") {
          j++;
          continue;
        }
        let m = 0;
        while (s[j + m] === "`") m++;
        if (m === n) {
          close = j;
          break;
        }
        j += m;
      }
      i = close === -1 ? i + n : close + n;
      continue;
    }
    if (s.startsWith("<!--", i)) return i;
    i++;
  }
  return -1;
}

/**
 * Per line, `{ fenced, comment, text }` under one of the two readings (see FENCED CODE and 7.3.0 in the header):
 * `fenced` — a fence line itself, or a line inside an open fence; `comment` — a line of an HTML comment block (from a
 * line beginning `<!--` through the first line containing `-->`); `text` — the line with every inline comment closed
 * on that line cut out (a fenced or comment line's `text` is the line). A byte-equal copy lives in
 * set-writes-scope.cjs, pinned by a ✧ test.
 * @param {string[]} lines
 * @param {boolean} [nested]  false: a fence line counts only at 0–3 spaces; true: at any indentation, and a bare
 *   closer indented less than its opener ends that block and opens another
 * @returns {{fenced: boolean, comment: boolean, text: string}[]}
 */
export function scanLines(lines, nested = false) {
  const out = [];
  let fence = null; // { char, len, indent } while a fenced block is open
  let block = false; // while an HTML comment block is open
  for (const line of lines) {
    if (block) {
      if (line.includes("-->")) block = false;
      out.push({ fenced: false, comment: true, text: line, unclosed: false });
      continue;
    }
    const f = line.match(FENCE_LINE_RE);
    if (f && !(f[2][0] === "`" && f[3].includes("`")) && (nested || /^ {0,3}$/.test(f[1]))) {
      const char = f[2][0];
      const closes = fence !== null && char === fence.char && f[2].length >= fence.len && f[3].trim() === "";
      if (fence === null) fence = { char, len: f[2].length, indent: f[1].length };
      else if (closes && (!nested || f[1].length >= fence.indent)) fence = null;
      else if (closes) fence = { char, len: f[2].length, indent: f[1].length }; // a list item ended; a new block opens
      out.push({ fenced: true, comment: false, text: line, unclosed: false });
      continue;
    }
    if (fence !== null) {
      out.push({ fenced: true, comment: false, text: line, unclosed: false });
      continue;
    }
    if (/^ {0,3}<!--/.test(line)) {
      // A comment block (CommonMark HTML block type 2) ends at the first line containing `-->`, this one included.
      if (!line.includes("-->")) block = true;
      out.push({ fenced: false, comment: true, text: line, unclosed: false });
      continue;
    }
    let text = "";
    let rest = line;
    for (;;) {
      const s = commentStart(rest);
      const e = s === -1 ? -1 : rest.indexOf("-->", s + 2); // from the opener's third character: `<!-->` closes at once
      if (e === -1) {
        text += rest; // no opener, or one left unclosed on this line: literal text
        break;
      }
      text += rest.slice(0, s);
      rest = rest.slice(e + 3);
    }
    // An opener left open on this line: literal text here, flagged for the `## Files` reader to refuse.
    out.push({ fenced: false, comment: false, text, unclosed: commentStart(rest) !== -1 });
  }
  return out;
}

/**
 * Per line, whether it is fenced code under one of the two readings — `scanLines`' `fenced` view, kept for the
 * readers that track fences only (render-ship-briefing.mjs, check-ship-briefing.mjs). Since 7.3.0 a fence line
 * inside an HTML comment is not a fence.
 * @param {string[]} lines
 * @param {boolean} [nested]
 * @returns {boolean[]}
 */
export function fenceStates(lines, nested = false) {
  return scanLines(lines, nested).map((s) => s.fenced);
}

/** The head-less exclusion cue (Boundary 2), the setter's own regex. */
const CUE_RE = /\bnot\W*(touch|writ|modif|edit|chang)|\bexplicitly\W*excluded|\bout\W*of\W*scope|\boff\W*limits/i;

/** A line that starts a raw HTML block other than a comment (CommonMark types 1, 3–7) — see the header. */
const HTML_BLOCK_RE = /^ {0,3}<(?:[A-Za-z]|\/|\?|![A-Za-z]|!\[CDATA\[)/;

// The columns of a path item's marker and of its text (a tab advances to the next multiple of 4), or null when `line`
// is not a path item: `-`, then spaces or tabs only (never another whitespace character, such as a no-break space),
// then a back-tick path. A byte-equal copy lives in set-writes-scope.cjs, pinned by a ✧ test.
function pathItemColumns(line) {
  const m = /^([ \t]*)-([ \t]+)`[^`]+`/.exec(line);
  if (!m) return null;
  let col = 0;
  for (const c of m[1]) col = c === "\t" ? col + 4 - (col % 4) : col + 1;
  const indent = col;
  const start = col + 1;
  col = start;
  for (const c of m[2]) col = c === "\t" ? col + 4 - (col % 4) : col + 1;
  return { indent, content: col - start > 4 ? start + 1 : col };
}

/**
 * ONE reading of the `## Files` list: the heading's index (-1 when absent), the paths, their entries, and the
 * refusal (null, a second visible `## Files`, a raw HTML block in the section, or a line that splits the list).
 */
function readPlanFiles(lines, nested) {
  const scanned = scanLines(lines, nested);
  let start = -1;
  let inSection = false; // from the `## Files` heading to the next heading
  let seenItem = false;
  let stop = -1; // the first line that ended the contiguous list (a path item after it refuses)
  let refusal = null;
  let lastItemIndent = -1;
  let lastItemContent = 0; // the previous path item's text column (0 before the first item)
  let lastKind = null; // the last non-blank list line: "item" or "continuation"
  let lastIdx = -1;
  const out = [];
  const entries = [];
  let inPathItemBody = false;
  for (let i = 0; i < lines.length; i++) {
    const { fenced, comment, text: line, unclosed } = scanned[i];
    if (fenced || comment) {
      // Fenced code and comment blocks are never a heading, an item or a list break — but a blank fenced line still
      // closes an item's body, so the wrapped-continuation exemption never widens.
      if (fenced && inSection && !line.trim()) inPathItemBody = false;
      continue;
    }
    // ONE `## Files`: a second visible heading anywhere in the file refuses — the reader never picks one.
    if (FILES_HEADING_RE.test(line)) {
      if (start === -1) {
        start = i;
        inSection = true;
        continue;
      }
      refusal = { kind: "second-heading", lines: [start + 1, i + 1] };
      break;
    }
    if (!inSection) continue;
    // Boundary 1 — STRUCTURAL: a heading of any level ends the section.
    if (/^\s{0,3}#{1,6}\s/.test(line)) {
      inSection = false;
      continue;
    }
    if (HTML_BLOCK_RE.test(line)) {
      refusal = { kind: "html-block", lines: [i + 1, i + 1] };
      break;
    }
    // An inline `<!--` left open on its line: literal to this reader, but a renderer may hide what follows (fail loud).
    if (unclosed) {
      refusal = { kind: "unclosed-comment", lines: [i + 1, i + 1] };
      break;
    }
    const cols = pathItemColumns(line);
    if (cols) {
      if (stop !== -1) {
        refusal = { kind: "split-list", lines: [stop + 1, i + 1] };
        break;
      }
      if (lastKind === "continuation" && cols.indent > lastItemIndent) {
        refusal = { kind: "split-list", lines: [lastIdx + 1, i + 1] }; // a nested item under a wrapped line
        break;
      }
      // Four or more columns past the previous item's text (or at the margin, before the first item) is code or lazy
      // paragraph text to a renderer, never a list item.
      if (cols.indent >= lastItemContent + 4) {
        refusal = { kind: "indented-item", lines: [i + 1, i + 1] };
        break;
      }
      seenItem = true;
      inPathItemBody = true;
      lastItemIndent = cols.indent;
      lastItemContent = cols.content;
      lastKind = "item";
      lastIdx = i;
      const m = line.match(/^[ \t]*-[ \t]+`([^`]+)`/);
      out.push(m[1].trim());
      const del = DELETE_MARKER_RE.test(line);
      entries.push({ path: m[1].trim(), line, delete: del, deleteNearMiss: !del && DELETE_NEAR_MISS_RE.test(line) });
      continue;
    }
    if (!line.trim()) {
      inPathItemBody = false;
      continue;
    }
    // An indented line while a path item's body is still open (no blank line since the item) is its own wrapped text.
    if (inPathItemBody && /^[ \t]+\S/.test(line)) {
      lastKind = "continuation";
      lastIdx = i;
      continue;
    }
    // Any other line ends the list after the first item; before it, only the exclusion cue does (a blockquote is
    // commentary there, never a cue).
    if (stop === -1 && (seenItem || (!/^\s*>/.test(line) && CUE_RE.test(line)))) stop = i;
  }
  return { start, out, entries, refusal };
}
