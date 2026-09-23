// .dev/floor/changelog-core.test.mjs — apparatus tests for the shared CHANGELOG grammar.
//
// Two disciplines from canon, applied deliberately:
//   - L29 — HEADING_KINDS is ITERATED from the module's own export, with a closure assertion against this
//     file's case table, so a kind added later is covered by every rule for free.
//   - L34 — every "for each X" is preceded by an assertion that X is non-empty.
// The grammar is pure, so every test here is in-process; the two checkers' own suites drive it end to end.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HEADING_KINDS,
  UNRELEASED_HEADING,
  PREAMBLE_KEY,
  parseChangelog,
  classifyHeading,
  splitEntry,
  isCalendarDate,
  compareVersions,
  utcDay,
  normalizeNewlines,
  quote,
  indentOf,
  fenceCloses,
  htmlOpener,
  HTML_BLOCKS,
} from "./changelog-core.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── HEADING_KINDS, iterated (L29/L34) ────────────────────────────────────────────────────────────────

const KIND_CASES = {
  UNRELEASED: ["## [Unreleased]"],
  VERSION: ["## [6.12.1] - 2026-09-23", "## [1.0.0] - 2026-06-23"],
  UNKNOWN: [
    "## Unreleased",
    "## [6.12.1]",
    "## [6.12.1] – 2026-09-23", // an en dash, not a hyphen
    "## [6.12.1] -  2026-09-23",
    "## [6.12] - 2026-09-23",
    "## [Unreleased] ##",
    "## Unsectioned history (2.x – 6.9.1)",
  ],
};

test("✧ NON-VACUITY + CLOSURE: HEADING_KINDS and the case table are the same non-empty set", () => {
  assert.ok(HEADING_KINDS.length >= 3, "the kind set must be populated (L34)");
  assert.deepEqual([...HEADING_KINDS].sort(), Object.keys(KIND_CASES).sort(), "a kind in one and not the other is the L36 defect");
});

for (const kind of HEADING_KINDS) {
  test(`✧ ${kind}: every case classifies as ${kind}, and no other kind claims it`, () => {
    assert.ok(KIND_CASES[kind].length >= 1, `the ${kind} case list must be non-empty (L34)`);
    for (const text of KIND_CASES[kind]) assert.equal(classifyHeading(text).kind, kind, text);
  });
}

test("classifyHeading carries the version and date of a VERSION heading only", () => {
  assert.deepEqual(classifyHeading("## [6.12.1] - 2026-09-23"), { kind: "VERSION", version: "6.12.1", date: "2026-09-23" });
  assert.deepEqual(classifyHeading(UNRELEASED_HEADING), { kind: "UNRELEASED", version: null, date: null });
});

// ── Headings in a document ───────────────────────────────────────────────────────────────────────────

test("✧ ATX variants are headings: up to three leading spaces and a tab separator — and they classify UNKNOWN (L36)", () => {
  const { headings } = parseChangelog(" ## [6.12.1] - 2026-09-23\n##\t[1.0.0] - 2026-06-23\n   ## x\n");
  assert.deepEqual(
    headings.map((h) => h.kind),
    ["UNKNOWN", "UNKNOWN", "UNKNOWN"],
    "a variant spelling of a real heading must be LOUD, never a silent non-heading"
  );
  assert.deepEqual(
    headings.map((h) => h.line),
    [1, 2, 3]
  );
});

test("four leading spaces, seven hashes, and a hash with no space are NOT headings", () => {
  const { headings } = parseChangelog("    ## indented code\n####### seven\n##nospace\n#hashtag\n");
  assert.equal(headings.length, 0);
});

test("only LEVEL-2 headings are recorded, but every level ends an entry", () => {
  const { headings, entries } = parseChangelog("## [Unreleased]\n\n### Added\n\n- a\n#### deep\ncontinuation?\n- b\n");
  assert.deepEqual(
    headings.map((h) => h.text),
    ["## [Unreleased]"]
  );
  assert.deepEqual(
    entries.map((e) => e.text),
    ["- a", "- b"],
    "the #### line ends the first entry, and the line after it belongs to no entry"
  );
});

// ── Opaque regions ───────────────────────────────────────────────────────────────────────────────────

test("✧ a heading and an entry inside a backtick FENCE are not recognized", () => {
  const doc = "## [Unreleased]\n\n```markdown\n## [9.9.9] - 2026-01-01\n- not an entry\n```\n\n- 2026-09-23: real\n";
  const { headings, entries } = parseChangelog(doc);
  assert.deepEqual(
    headings.map((h) => h.text),
    ["## [Unreleased]"]
  );
  assert.deepEqual(
    entries.map((e) => e.text),
    ["- 2026-09-23: real"]
  );
});

test("✧ a TILDE fence inside an entry, with its content INDENTED to the item: a shorter closer does not close it, a longer one does", () => {
  const doc = [
    "## [1.0.0] - 2026-06-23",
    "- entry with a fence",
    "  ~~~~",
    "  ## not a heading",
    "  ~~~", // shorter than the opener: still inside
    "  - not an entry",
    "  ~~~~~~", // longer: closes
    "## [0.9.0] - 2026-06-01",
  ].join("\n");
  const { headings, entries } = parseChangelog(doc);
  assert.deepEqual(
    headings.map((h) => h.text),
    ["## [1.0.0] - 2026-06-23", "## [0.9.0] - 2026-06-01"]
  );
  assert.equal(entries.length, 1);
  assert.match(entries[0].text, /## not a heading/, "fenced lines stay part of the entry's text");
});

// REVIEW iteration 1, finding 1 — the premise the earlier version of the test above asserted was WRONG.
// A column-0 line ends a list item, and with it any fence or comment opened inside the item: GitHub
// renders it as a heading. The grammar must see what GitHub renders (verified against markdown-it, the
// CommonMark reference, at review time).
test("✧ a column-0 line ENDS an in-entry fence and the entry: a heading there IS a heading (review finding 1)", () => {
  const doc = ["## [Unreleased]", "", "- 2026-09-23: an entry", "", "  ```", "## [9.9.9] - 2026-09-23", "", "- 2026-09-23: after"].join(
    "\n"
  );
  const { headings, entries } = parseChangelog(doc);
  assert.deepEqual(
    headings.map((h) => h.text),
    ["## [Unreleased]", "## [9.9.9] - 2026-09-23"]
  );
  assert.deepEqual(
    entries.map((e) => [e.text, e.section]),
    [
      ["- 2026-09-23: an entry\n\n  ```", "## [Unreleased]"],
      ["- 2026-09-23: after", "## [9.9.9] - 2026-09-23"],
    ]
  );
});

test("✧ a column-0 line ENDS an in-entry HTML comment too (review finding 1)", () => {
  const { headings } = parseChangelog("## [Unreleased]\n\n- 2026-09-23: x\n  <!-- inside the item\n## Notes\n");
  assert.deepEqual(
    headings.map((h) => h.text),
    ["## [Unreleased]", "## Notes"]
  );
});

test("✧ a COLUMN-0 fence after an entry ends the entry; its lines belong to the section, not the entry", () => {
  const doc = "## [1.0.0] - 2026-06-23\n\n- a\n```\n- not an entry\n```\ntrailing prose\n";
  const { entries, sections } = parseChangelog(doc);
  assert.deepEqual(
    entries.map((e) => e.text),
    ["- a"]
  );
  assert.equal(sections[1].text, doc.replace(/\s+$/, ""), "the section's text is all of it, heading to EOF");
});

// REVIEW iteration 2, finding 1 — a closer is a closer only where CommonMark accepts one.
test("✧ a fence 'closer' indented 4+ columns does NOT close a top-level fence: the rest of the file stays hidden, as on GitHub", () => {
  const doc = "## [Unreleased]\n\n```text\nexample\n    ```\n## [1.0.0] - 2026-06-23\n\n- a\n";
  const { headings, entries } = parseChangelog(doc);
  assert.deepEqual(
    headings.map((h) => h.text),
    ["## [Unreleased]"],
    "the base's version heading must VANISH, so a diff check fails closed on HEADING_CHANGED"
  );
  assert.equal(entries.length, 0);
});

test("✧ a closer indented up to 3 columns (top level) or 5 (inside an entry) DOES close", () => {
  assert.equal(parseChangelog("```\nx\n   ```\n## [1.0.0] - 2026-06-23\n").headings.length, 1);
  assert.equal(parseChangelog("## [1.0.0] - 2026-06-23\n- a\n  ```\n  x\n     ```\n## [0.9.0] - 2026-06-01\n").headings.length, 2);
  assert.equal(parseChangelog("```\nx\n\t```\n## [1.0.0] - 2026-06-23\n").headings.length, 0, "a tab is 4 columns: not a closer");
  assert.equal(fenceCloses("  ````", "`", 3, 3), true);
  assert.equal(fenceCloses("  ``", "`", 3, 3), false, "shorter than the opener");
  assert.equal(fenceCloses("~~~", "`", 3, 3), false, "the other character");
});

test("✧ a TAB-indented fence inside an entry IS a fence, so a heading-like line in it stays content (review 2, finding 5)", () => {
  const { headings } = parseChangelog("## [1.0.0] - 2026-06-23\n- a\n\t```\n\t## inside code\n\t```\n## [0.9.0] - 2026-06-01\n");
  assert.deepEqual(
    headings.map((h) => h.text),
    ["## [1.0.0] - 2026-06-23", "## [0.9.0] - 2026-06-01"]
  );
});

// REVIEW iteration 2, finding 2 — every raw HTML block that runs to its OWN closer, iterated (L29).
const HTML_CASES = {
  raw: { open: "<pre>", close: "</pre>", inline: "<textarea>x</textarea>" },
  comment: { open: "<!-- note", close: "-->", inline: "<!-- x -->" },
  processing: { open: "<?php", close: "?>", inline: "<? x ?>" },
  declaration: { open: "<!DOCTYPE", close: ">", inline: "<!DOCTYPE html>" },
  cdata: { open: "<![CDATA[", close: "]]>", inline: "<![CDATA[ x ]]>" },
};

test("✧ NON-VACUITY + CLOSURE: HTML_BLOCKS and the case table are the same non-empty set", () => {
  assert.ok(HTML_BLOCKS.length >= 5);
  assert.deepEqual(HTML_BLOCKS.map((b) => b.kind).sort(), Object.keys(HTML_CASES).sort());
});

for (const b of HTML_BLOCKS) {
  const c = HTML_CASES[b.kind];
  test(`✧ HTML block '${b.kind}': unclosed it runs to EOF and hides later headings; closed, it hides nothing after it`, () => {
    assert.equal(htmlOpener(c.open)?.kind, b.kind);
    const unclosed = parseChangelog(`## [Unreleased]\n\n${c.open}\n## [9.9.9] - 2026-09-23\n\n## [1.0.0] - 2026-06-23\n`);
    assert.deepEqual(
      unclosed.headings.map((h) => h.text),
      ["## [Unreleased]"]
    );
    const closed = parseChangelog(`## [Unreleased]\n\n${c.open}\n## hidden\n${c.close}\n\n## [1.0.0] - 2026-06-23\n`);
    assert.deepEqual(
      closed.headings.map((h) => h.text),
      ["## [Unreleased]", "## [1.0.0] - 2026-06-23"]
    );
    const inline = parseChangelog(`## [Unreleased]\n${c.inline}\n## [1.0.0] - 2026-06-23\n`);
    assert.equal(inline.headings.length, 2, "an opener that closes on its own line is not a region");
  });
}

// REVIEW iteration 3, finding 1 — CommonMark tests the closer against the WHOLE line, so these are complete
// one-line blocks on GitHub. Reading them as unclosed hid a heading GitHub renders.
const ONE_LINE_OPENERS = ["<!-->", "<!--->", "<?>"];

test("✧ NON-VACUITY: the one-line-opener table is non-empty (L34)", () => {
  assert.ok(ONE_LINE_OPENERS.length >= 3);
});

for (const opener of ONE_LINE_OPENERS) {
  test(`✧ ${JSON.stringify(opener)} opens AND closes on its own line, so the heading after it is seen`, () => {
    assert.equal(htmlOpener(opener).closedOnSameLine, true);
    const { headings } = parseChangelog(`## [Unreleased]\n\n${opener}\n## [9.9.9] - 2026-09-24\n\n## [1.0.0] - 2026-06-23\n`);
    assert.deepEqual(
      headings.map((h) => h.text),
      ["## [Unreleased]", "## [9.9.9] - 2026-09-24", "## [1.0.0] - 2026-06-23"]
    );
  });
}

test("htmlOpener recognizes only the five kinds, and only at the start of the line's content", () => {
  assert.equal(htmlOpener("text <pre>"), null);
  assert.equal(htmlOpener("<div>"), null, "type 6 ends at a blank line — a stated bound, not a region");
  assert.equal(htmlOpener("<preformatted>"), null, "a tag NAME must end after pre");
  assert.equal(htmlOpener("  <PRE>").kind, "raw", "case-insensitive, indentation measured");
  assert.equal(htmlOpener("  <PRE>").indent, 2);
});

test("✧ a backtick opener whose info string holds a backtick is NOT a fence (CommonMark), and 4+ spaces is indented code", () => {
  const { headings } = parseChangelog("## [Unreleased]\n```x`y```\n    ```\n## [1.0.0] - 2026-06-23\n");
  assert.deepEqual(
    headings.map((h) => h.kind),
    ["UNRELEASED", "VERSION"],
    "neither line may open a fence that hides the version heading"
  );
});

test("✧ an in-entry fence indented 6+ columns is indented code, not a fence", () => {
  const { headings } = parseChangelog("## [1.0.0] - 2026-06-23\n- a\n      ```\n## [0.9.0] - 2026-06-01\n");
  assert.equal(headings.length, 2);
});

test("✧ SECTIONS: the preamble first, then one per level-2 heading, each with its WHOLE text", () => {
  const doc =
    "# Changelog\n\nintro\n\n## [Unreleased]\n\n<!-- c -->\n\n### Added\n\n- 2026-09-23: new\n\n## [1.0.0] - 2026-06-23\n\n### Fixed\n\n- a\n  continued\n\n- b\n";
  const { sections } = parseChangelog(doc);
  assert.deepEqual(
    sections.map((s) => [s.key, s.kind]),
    [
      [PREAMBLE_KEY, "PREAMBLE"],
      ["## [Unreleased]", "UNRELEASED"],
      ["## [1.0.0] - 2026-06-23", "VERSION"],
    ]
  );
  assert.equal(sections[0].text, "# Changelog\n\nintro");
  assert.equal(sections[1].text, "## [Unreleased]\n\n<!-- c -->\n\n### Added\n\n- 2026-09-23: new");
  assert.equal(sections[2].text, "## [1.0.0] - 2026-06-23\n\n### Fixed\n\n- a\n  continued\n\n- b");
  const reordered = parseChangelog(doc.replace("- a\n  continued\n\n- b\n", "- b\n\n- a\n  continued\n")).sections[2].text;
  assert.notEqual(reordered, sections[2].text, "reordering entries changes the section's text");
  assert.equal(parseChangelog(doc + "\n\n").sections[2].text, sections[2].text, "trailing blank lines do not");
});

test("indentOf counts a tab as four columns", () => {
  assert.equal(indentOf("  x"), 2);
  assert.equal(indentOf("\tx"), 4);
  assert.equal(indentOf("x"), 0);
  assert.equal(indentOf("   "), 3);
});

test("an UNCLOSED fence runs to EOF", () => {
  const { headings, entries } = parseChangelog("## [1.0.0] - 2026-06-23\n```\n## [2.0.0] - 2026-07-01\n- x\n");
  assert.equal(headings.length, 1);
  assert.equal(entries.length, 0);
});

test("✧ an HTML COMMENT is opaque: column-0 hyphen and ## lines inside it are ignored (round-1 finding 18)", () => {
  const doc = [
    "## [Unreleased]",
    "",
    "<!-- guidance",
    "- not an entry",
    "## [9.9.9] - 2026-01-01",
    "     still guidance -->",
    "",
    "### Added",
    "",
    "- 2026-09-23: the only entry",
  ].join("\n");
  const { headings, entries } = parseChangelog(doc);
  assert.deepEqual(
    headings.map((h) => h.kind),
    ["UNRELEASED"]
  );
  assert.deepEqual(
    entries.map((e) => e.text),
    ["- 2026-09-23: the only entry"]
  );
});

test("a single-line HTML comment opens and closes on the same line", () => {
  const { entries } = parseChangelog("## [Unreleased]\n<!-- one line -->\n- 2026-09-23: after it\n");
  assert.equal(entries.length, 1);
});

// ── Entries ──────────────────────────────────────────────────────────────────────────────────────────

test("✧ an entry absorbs lazy continuations, nested bullets and blank lines; trailing whitespace is trimmed", () => {
  const doc = "## [1.0.0] - 2026-06-23\n\n- first line\nlazy continuation\n  - nested\n\n  paragraph   \n\n- second\n";
  const { entries } = parseChangelog(doc);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].text, "- first line\nlazy continuation\n  - nested\n\n  paragraph");
  assert.equal(entries[1].text, "- second");
});

test("only a column-0 hyphen-space starts an entry; asterisk and plus markers do not", () => {
  const { entries } = parseChangelog("## [1.0.0] - 2026-06-23\n* star\n+ plus\n-nospace\n - indented\n- real\n");
  assert.deepEqual(
    entries.map((e) => e.text),
    ["- real"]
  );
});

test("each entry records its owning section, or PREAMBLE before the first level-2 heading", () => {
  const { entries } = parseChangelog(
    "# Changelog\n\n- preamble entry\n\n## [Unreleased]\n\n- 2026-09-23: u\n\n## [1.0.0] - 2026-06-23\n\n- v\n"
  );
  assert.deepEqual(
    entries.map((e) => [e.section, e.sectionKind]),
    [
      [PREAMBLE_KEY, "PREAMBLE"],
      ["## [Unreleased]", "UNRELEASED"],
      ["## [1.0.0] - 2026-06-23", "VERSION"],
    ]
  );
  assert.deepEqual(
    entries.map((e) => e.line),
    [3, 7, 11]
  );
});

test("✧ splitEntry: the date prefix is split off the BODY; an entry without one is its own body", () => {
  assert.deepEqual(splitEntry("- 2026-09-23: **x** y"), { date: "2026-09-23", body: "- **x** y" });
  assert.deepEqual(splitEntry("- **x** y"), { date: null, body: "- **x** y" });
  assert.deepEqual(splitEntry("- 2026-9-23: x"), { date: null, body: "- 2026-9-23: x" }, "a malformed prefix is not a prefix");
  assert.deepEqual(splitEntry("- 2026-09-23:x"), { date: null, body: "- 2026-09-23:x" }, "the space after the colon is part of the prefix");
});

test("✧ CRLF is folded before parsing, so a CRLF head and an LF base yield identical entries (round-1 finding 20)", () => {
  const lf = "## [Unreleased]\n\n- 2026-09-23: a\n  wrapped\n\n## [1.0.0] - 2026-06-23\n\n- b\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  assert.deepEqual(parseChangelog(crlf), parseChangelog(lf));
  assert.equal(normalizeNewlines(crlf), lf);
  assert.equal(normalizeNewlines(undefined), "", "a non-string input parses as an empty document");
});

// ── Dates and versions ───────────────────────────────────────────────────────────────────────────────

test("✧ isCalendarDate refuses impossible and malformed dates", () => {
  const yes = ["2026-09-23", "2024-02-29", "2026-12-31", "1999-01-01"];
  const no = ["2026-02-31", "2025-02-29", "2026-13-01", "2026-00-10", "2026-9-23", "0099-01-01", "", null, "2026-09-23 "];
  assert.ok(yes.length >= 4 && no.length >= 8, "both tables must be populated (L34)");
  for (const d of yes) assert.equal(isCalendarDate(d), true, d);
  for (const d of no) assert.equal(isCalendarDate(d), false, String(d));
});

test("utcDay renders a UTC calendar day, shifted by whole days", () => {
  const now = new Date("2026-09-23T23:30:00-05:00"); // 2026-09-24 04:30 UTC
  assert.equal(utcDay(now), "2026-09-24");
  assert.equal(utcDay(now, 1), "2026-09-25");
  assert.equal(utcDay(new Date("2026-12-31T12:00:00Z"), 1), "2027-01-01");
});

test("compareVersions is numeric per component, never lexical", () => {
  assert.ok(compareVersions("6.12.0", "6.9.3") > 0, "12 > 9, though '1' < '9'");
  assert.ok(compareVersions("2.7.10", "2.7.9") > 0);
  assert.ok(compareVersions("1.0.0", "1.0.1") < 0);
  assert.equal(compareVersions("3.0.2", "3.0.2"), 0);
});

// ── Output safety (P2) ───────────────────────────────────────────────────────────────────────────────

test("✧ quote caps length and escapes control characters", () => {
  const ESC = String.fromCharCode(27);
  const q = quote(`${ESC}[31m${"x".repeat(500)}`, 100);
  assert.ok(!q.includes(ESC), "an ESC must never reach a terminal raw");
  assert.match(q, /\\u001b/);
  assert.ok(q.length < 130, `the quote must be bounded, got ${q.length}`);
  assert.equal(quote("short"), '"short"');
});

// ── The live file ────────────────────────────────────────────────────────────────────────────────────

test("✧ the live CHANGELOG parses with no UNKNOWN heading, a populated version set, and unique entry bodies", () => {
  const { headings, entries } = parseChangelog(readFileSync(join(REPO, "CHANGELOG.md"), "utf8"));
  assert.ok(headings.filter((h) => h.kind === "VERSION").length >= 1, "the live file must have version sections (L34)");
  assert.equal(headings.filter((h) => h.kind === "UNKNOWN").length, 0);
  assert.ok(entries.length >= 1);
  assert.equal(new Set(entries.map((e) => e.body)).size, entries.length, "entry bodies must be unique");
});
