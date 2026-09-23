// .dev/floor/changelog-core.mjs — the SHARED, deterministic CHANGELOG grammar (build apparatus).
//
// Imported by BOTH CHANGELOG checkers: `check-skills-version-recorded.mjs` (the repo-state check, in
// `npm run check`) and `check-changelog-entry.mjs` (the per-PR base→head diff, CI-only). They ask
// different questions of the same file, so they must agree on what a heading, an entry, a date and a
// section ARE. Two parsers would be a second copy of that grammar (lessons-learned L35), and the first
// divergence between them would make one check certify a file the other misreads. P3: the file changes
// when the CHANGELOG GRAMMAR changes. It also holds the few value helpers both checkers need and that have
// no other home — calendar-date validity, a UTC day, numeric version order, and a bounded quote for
// untrusted text — stated here rather than hidden, and kept small; a second checker-agnostic concern that
// grew would be the signal to split them out.
//
// It is build APPARATUS: no `role:` frontmatter, no evals, under `.dev/floor/` (excluded from
// validate.mjs's product scan), never shipped to a user install, so no SKILLS_VERSION bump.
//
// THE GRAMMAR (pure; no I/O; ZERO LLM — every branch is a regex or string test, P5). It follows
// CommonMark's block rules where they decide what GitHub renders as a heading — list-item boundaries, fence
// opener and closer indentation, and the HTML blocks that run to their own closer — so that, apart from the
// exceptions under NOT RECOGNIZED below, a line GitHub renders as a top-level heading is one here too. Two
// rounds of this increment's own review demonstrated the opposite with earlier versions (a column-0 heading
// hidden behind an in-entry fence; a 4-space "closer" or an unclosed <pre> turning the rest of the file
// into one block), so this is the requirement, and each rule below exists because a probe broke it:
//
//   - Line endings: `\r\n` is folded to `\n` FIRST (the `.dev/floor/hash-doc.mjs` precedent), so a CRLF
//     editor never turns every multi-line entry into a "changed" one.
//   - Opaque regions — inside one, no line is a heading and no line starts an entry:
//       * a FENCE opener is 3+ backticks or 3+ tildes; a backtick opener whose info string contains a
//         backtick is NOT a fence (it is inline code — CommonMark). It closes on a later line of the same
//         character, at least as long, with only whitespace after it, AND indented no deeper than an
//         opener may be (3 columns at top level, 5 inside an entry — a deeper "closer" is content, exactly
//         as on GitHub). An unclosed fence runs to EOF;
//       * a RAW HTML BLOCK of CommonMark types 1–5 — `<pre` / `<script` / `<style` / `<textarea`, an
//         HTML comment `<!--`, `<?`, `<!` + a letter, `<![CDATA[` (the closed HTML_BLOCKS set) — opens
//         on a line whose content starts with it and closes on the first line (possibly the same one)
//         containing its own closer. An unclosed one runs to EOF, as it does on GitHub, which hides every
//         later heading from BOTH the renderer and this grammar — so a diff check sees the base's headings
//         vanish and fails closed. The `[Unreleased]` guidance comment is one of these; without it, a
//         column-0 `- ` inside it would parse as an entry.
//     Indentation is measured with a tab as 4 columns. WHERE a region belongs depends on its opener's
//     indentation, because that is what CommonMark does:
//       * no entry open: a top-level region; an opener may be indented at most 3 columns (4 or more is
//         indented code, plain text here);
//       * an entry open, opener indented 2–5 columns: the region is INSIDE the entry, and it ends at its
//         own closer OR at the first non-blank line indented less than 2 columns — that line ends the
//         list item, so it ends the entry too and is then read normally (a column-0 `## ` there IS a
//         heading, exactly as GitHub renders it);
//       * an entry open, opener indented 0–1 columns: the opener ends the entry, and the region is
//         top-level.
//   - Headings: ATX only — `^ {0,3}#{1,6}` followed by whitespace or end of line. Level-2 headings are
//     classified into the closed HEADING_KINDS set against their text with TRAILING whitespace removed
//     (leading spaces are kept, so they are part of the spelling): exactly `## [Unreleased]`,
//     exactly `## [X.Y.Z] - YYYY-MM-DD`, or UNKNOWN (which includes a leading-space or tab-separated
//     spelling of either — a variant spelling is loud, never silently accepted: lessons-learned L36).
//     SETEXT headings (a line underlined with `---`/`===`) are NOT recognized. The live file has none;
//     this is a stated narrowing, not a claim.
//   - Top-level entries: a line beginning with a hyphen and a space at COLUMN 0, outside an opaque region.
//     Its text runs until the next top-level entry or the next heading of ANY level, with trailing
//     whitespace trimmed — so a column-0 lazy continuation line is absorbed. Its SECTION is the nearest
//     preceding level-2 heading, or PREAMBLE.
//   - An entry's BODY is its text with a leading `YYYY-MM-DD: ` date prefix removed; its DATE is that
//     prefix, or null. Identity across files is by BODY, so moving an entry out of `[Unreleased]` may
//     keep or drop its prefix. Whether a DATE change is allowed is each checker's rule, not the grammar's.
//   - A section's TEXT is every line from its level-2 heading to the line before the next one (the
//     preamble: from the top), trailing whitespace trimmed. The per-PR check holds a released section's
//     text byte-identical, so a released section is frozen WHOLE — entries, their order and grouping, and
//     every line that belongs to no entry (an asterisk bullet, prose, a merge-conflict marker).
//
// NOT RECOGNIZED (stated, P0 — each is a place where GitHub's rendering and this grammar can differ):
//   - `*` or `+` list markers as ENTRIES. In a released section such a line changes the section's text and
//     is refused; in `[Unreleased]` it is simply not an entry (a PR whose only addition is one fails CLOSED
//     on NO_NEW_ENTRY).
//   - SETEXT headings (a line underlined with `---` or `===`). None exist in the live file.
//   - HTML blocks of CommonMark types 6 and 7 (a block-level or arbitrary tag), which end at the next BLANK
//     line. They cannot hide the rest of the file, but the lines up to that blank line CAN include a
//     heading: a `<div>` directly above the newest released heading makes GitHub show the one below it as
//     the newest, and neither check sees it (review iteration 3). A reviewer reading the diff sees the tag.
//   - Headings inside a BLOCKQUOTE (`> ## …`). They render inside a quote box, never as a section.
//   - Nested list structure. The grammar knows one item level (the top-level entry, content column 2); a
//     heading written inside a nested item's fence can be hidden from it. Such a heading renders INSIDE an
//     entry, never as a section.
//   - Link-reference definitions. None exist; the increment that cuts tags and adds compare links must teach
//     this grammar to end an entry at one.
//
// `isCalendarDate` is a THIRD copy of the calendar-date rule, after the two `isGregorianDate`s in the
// `check-provenance.mjs` product/dev pair. Importing either would be a checker→checker (leaf→leaf) import,
// which pharn/ARCHITECTURE.md §4 forbids; extracting a shared core would edit a PRODUCT checker and force
// a SKILLS_VERSION bump with no failure asking for it (P7). This one round-trips through `Date.UTC`
// rather than the local-time constructor, so it cannot depend on the machine's timezone.

/** The closed set of level-2 heading kinds. Exported so the tests ITERATE it (lessons-learned L29). */
export const HEADING_KINDS = ["UNRELEASED", "VERSION", "UNKNOWN"];

/** The one accepted `[Unreleased]` heading, exactly. */
export const UNRELEASED_HEADING = "## [Unreleased]";

/** The one accepted version heading form — the Keep-a-Changelog form every live section uses. */
export const VERSION_HEADING_RE = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/;

/** The `[Unreleased]` entry date prefix: `- ` then an ISO date, a colon and ONE space. Shape only. */
export const DATE_PREFIX_RE = /^- (\d{4}-\d{2}-\d{2}): /;

/** The section key for entries that sit before the first level-2 heading. Not a possible heading text. */
export const PREAMBLE_KEY = "\u0000PREAMBLE";

const ATX_HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+|$)/;
const FENCE_OPEN_RE = /^([ \t]*)(`{3,}|~{3,})(.*)$/;
const LEAD_RE = /^[ \t]*/;

/**
 * The raw HTML blocks that run to their OWN closer (CommonMark types 1–5), as a closed set the tests
 * iterate (lessons-learned L29). Types 6 and 7 end at a blank line and are a stated bound instead.
 */
export const HTML_BLOCKS = [
  { kind: "raw", open: /^<(?:pre|script|style|textarea)(?:[ \t>]|$)/i, close: /<\/(?:pre|script|style|textarea)>/i },
  { kind: "comment", open: /^<!--/, close: /-->/ },
  { kind: "processing", open: /^<\?/, close: /\?>/ },
  { kind: "declaration", open: /^<![A-Za-z]/, close: />/ },
  { kind: "cdata", open: /^<!\[CDATA\[/, close: /\]\]>/ },
];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A list item's content column for a `- ` marker: lines indented at least this much stay in the item. */
const ITEM_INDENT = 2;
/** The deepest indentation at which a fence can still open inside such an item (content + 3). */
const ITEM_FENCE_MAX_INDENT = ITEM_INDENT + 3;
/** The deepest indentation at which a top-level fence can open (4 or more is indented code). */
const TOP_FENCE_MAX_INDENT = 3;

/** Leading-whitespace width, a tab counting as 4 columns. */
export function indentOf(line) {
  let n = 0;
  for (const c of line) {
    if (c === " ") n++;
    else if (c === "\t") n += 4;
    else break;
  }
  return n;
}

/** A fence opener on this line, or null: { ch, len, indent }. A backtick info string may not hold a backtick. */
export function fenceOpener(line) {
  const m = FENCE_OPEN_RE.exec(line);
  if (!m) return null;
  if (m[2][0] === "`" && m[3].includes("`")) return null;
  return { ch: m[2][0], len: m[2].length, indent: indentOf(m[1]) };
}

/** True iff `line` closes a fence of this char and length, indented no deeper than `maxIndent`. */
export function fenceCloses(line, ch, len, maxIndent) {
  if (indentOf(line) > maxIndent) return false;
  const run = ch === "`" ? /^[ \t]*(`+)[ \t]*$/ : /^[ \t]*(~+)[ \t]*$/;
  const m = run.exec(line);
  return m !== null && m[1].length >= len;
}

/**
 * An HTML-block opener on this line, or null: { kind, close, indent, closedOnSameLine }. The closer is
 * searched for on the WHOLE line, as CommonMark does — so `<!-- x -->` and `<pre>x</pre>` open and close
 * on one line, and so do `<!-->`, `<!--->` and `<?>`. (Searching only after the opener token made those
 * three open a region GitHub never opens, hiding a heading GitHub renders: review iteration 3.) No opener
 * token contains its own closer, so this never closes a block that is still open.
 */
export function htmlOpener(line) {
  const lead = LEAD_RE.exec(line)[0];
  const rest = line.slice(lead.length);
  for (const b of HTML_BLOCKS) {
    const m = b.open.exec(rest);
    if (m) return { kind: b.kind, close: b.close, indent: indentOf(lead), closedOnSameLine: b.close.test(rest) };
  }
  return null;
}

/** Fold CRLF to LF. Anything that is not a string becomes the empty string (the caller refuses it). */
export function normalizeNewlines(text) {
  return typeof text === "string" ? text.replace(/\r\n/g, "\n") : "";
}

/**
 * True iff `s` is `YYYY-MM-DD` naming a real calendar day. `2026-02-31` is false; so is any year below
 * 100, which `Date.UTC` would silently map into the 1900s (fail-closed on a value no CHANGELOG writes).
 */
export function isCalendarDate(s) {
  if (typeof s !== "string" || !ISO_DATE_RE.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** `YYYY-MM-DD` for `date` in UTC, shifted by `days`. */
export function utcDay(date, days = 0) {
  return new Date(date.getTime() + days * 86400000).toISOString().slice(0, 10);
}

/** Numeric compare of two `X.Y.Z` strings: negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/** Classify a trimmed level-2 heading text into HEADING_KINDS, with the version and date when VERSION. */
export function classifyHeading(text) {
  if (text === UNRELEASED_HEADING) return { kind: "UNRELEASED", version: null, date: null };
  const m = VERSION_HEADING_RE.exec(text);
  if (m) return { kind: "VERSION", version: m[1], date: m[2] };
  return { kind: "UNKNOWN", version: null, date: null };
}

/** Split an entry's text into its date prefix (or null) and its body (the identity key). */
export function splitEntry(text) {
  const m = DATE_PREFIX_RE.exec(text);
  if (!m) return { date: null, body: text };
  return { date: m[1], body: `- ${text.slice(m[0].length)}` };
}

/**
 * Parse a CHANGELOG. Returns:
 *   headings: every level-2 heading, in file order — { text, kind, version, date, line }
 *   entries:  every top-level entry, in file order — { text, body, date, section, sectionKind, line }
 *   sections: the preamble, then one per level-2 heading, in file order — { key, kind, line, text }
 * `line` is 1-based. `section` / `key` is the owning level-2 heading's text, or PREAMBLE_KEY. A section's
 * `text` is its whole text, heading to the line before the next level-2 heading, trailing whitespace trimmed.
 */
export function parseChangelog(input) {
  const lines = normalizeNewlines(input).split("\n");
  const headings = [];
  const entries = [];
  const sections = [{ key: PREAMBLE_KEY, kind: "PREAMBLE", line: 0, start: 0 }];
  let region = null; // { type: "fence" | "html", ch, len, close, inItem } while inside an opaque region
  let current = null; // the entry being accumulated

  const sectionNow = () => sections[sections.length - 1];
  const keep = (line) => current && current.lines.push(line);
  const closeEntry = () => {
    if (!current) return;
    const text = current.lines.join("\n").replace(/\s+$/, "");
    const { date, body } = splitEntry(text);
    entries.push({ text, body, date, section: current.section, sectionKind: current.sectionKind, line: current.line });
    current = null;
  };
  /** Open a region at this opener line. An opener indented 0–1 while an entry is open ends the entry. */
  const openRegion = (spec, indent) => {
    const inItem = current !== null && indent >= ITEM_INDENT;
    if (current !== null && !inItem) closeEntry();
    region = { ...spec, inItem };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (region) {
      // Inside an entry, a non-blank line indented less than the item's content column ends the list
      // item — and with it the region. That line is then read as ordinary top-level text below.
      const escapesItem = region.inItem && line.trim() !== "" && indentOf(line) < ITEM_INDENT;
      if (!escapesItem) {
        const closes =
          region.type === "fence"
            ? fenceCloses(line, region.ch, region.len, region.inItem ? ITEM_FENCE_MAX_INDENT : TOP_FENCE_MAX_INDENT)
            : region.close.test(line);
        keep(line);
        if (closes) region = null;
        continue;
      }
      region = null;
      closeEntry();
    }

    const fence = fenceOpener(line);
    if (fence && fence.indent <= (current ? ITEM_FENCE_MAX_INDENT : TOP_FENCE_MAX_INDENT)) {
      openRegion({ type: "fence", ch: fence.ch, len: fence.len }, fence.indent);
      keep(line);
      continue;
    }
    const html = htmlOpener(line);
    if (html && html.indent <= (current ? ITEM_FENCE_MAX_INDENT : TOP_FENCE_MAX_INDENT)) {
      openRegion({ type: "html", close: html.close }, html.indent);
      keep(line);
      if (html.closedOnSameLine) region = null;
      continue;
    }

    const atx = ATX_HEADING_RE.exec(line);
    if (atx) {
      closeEntry();
      if (atx[1].length === 2) {
        // TRAILING whitespace only: a leading space is part of the spelling, so ` ## [1.0.0] - …` stays
        // UNKNOWN (loud) instead of silently classifying as a version heading.
        const text = line.replace(/\s+$/, "");
        const { kind, version, date } = classifyHeading(text);
        headings.push({ text, kind, version, date, line: i + 1 });
        sections.push({ key: text, kind, line: i + 1, start: i });
      }
      continue;
    }

    if (line.startsWith("- ")) {
      closeEntry();
      const s = sectionNow();
      current = { lines: [line], section: s.key, sectionKind: s.kind, line: i + 1 };
      continue;
    }

    keep(line);
  }
  closeEntry();
  return {
    headings,
    entries,
    sections: sections.map(({ start, ...s }, n) => ({
      ...s,
      text: lines
        .slice(start, n + 1 < sections.length ? sections[n + 1].start : lines.length)
        .join("\n")
        .replace(/\s+$/, ""),
    })),
  };
}

/** A bounded, JSON-escaped quote of untrusted CHANGELOG text for a terminal (P2). */
export function quote(text, max = 100) {
  const s = String(text);
  return JSON.stringify(s.length > max ? `${s.slice(0, max)}…` : s);
}
