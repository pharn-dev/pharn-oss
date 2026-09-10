#!/usr/bin/env node
// .dev/floor/lessons-index-core.mjs — the SHARED, deterministic core for the lessons index.
//
// Single source of truth imported by BOTH the generator (gen-lessons-index.mjs) and the drift checker
// (check-lessons-index.mjs), so "recompute" (checker) is byte-identical to "generate" (generator) BY
// CONSTRUCTION — the byte-equality guard would be meaningless if the two sides rendered via different
// code (P3: route the shared thing through one module; do not duplicate). Same shape as
// capability-catalog-core.mjs (#101), deliberately.
//
// It is build APPARATUS, not a PHARN capability: it declares no `role:` frontmatter, ships no evals, and
// lives under `.dev/floor/` (excluded from validate.mjs's product scan).
//
// SCOPE NOTE (P3, stated rather than hidden — raised as GRILL F4 and accepted here). This module has TWO
// reasons to change: the canon ENTRY contract (what a lesson entry looks like — the `## L<n>` heading and
// the #114 tag line) and the index ROW format (what the rendered line looks like). That is two axes in one
// file. It is a KNOWN, ACCEPTED cost, taken to match the house pattern the drift-guard discipline depends
// on: the parse and the render MUST live behind one module or the "recompute == generate" guarantee is
// lost. `capability-catalog-core.mjs` carries the identical note for the identical reason. The two
// concerns are kept in clearly separated sections below.
//
// WHAT THIS DOES AND DOES NOT BUY (P0 — say it, don't bury it). The guarantee delivered downstream is
// BYTE-EQUALITY: the committed index equals what this module recomputes from canon. It is NOT a guarantee
// that the index is TRUE — a wrong parser here would be regenerated, committed wrongly, and the gate would
// stay GREEN. And per #114, `type` / `concepts` are model-drafted values ratified only by a human at the
// promote gate: "the entry is typed `floor`" NEVER means "the entry is about the floor", so any selection
// keyed on this index is ADVISORY-grade context selection, never a guarantee. "The index was consulted"
// NEVER means "the relevant lessons were read".
//
// Deterministic (P5): enumeration = `^## L(\d+) ` heading membership; ordering = numeric id ascending (a
// total order, independent of file order); rendering = a pure function of the parsed entries; NO timestamps
// anywhere → running twice yields byte-identical output. A duplicate id is a thrown Error (fail-closed),
// never a silent overwrite.
//
// Non-LLM, stdlib-only.

import { readFileSync } from "node:fs";
import { join } from "node:path";

// ─── Inputs / outputs (repo-relative, POSIX) ────────────────────────────────────────────────────────
export const CANON_PATH = ".dev/memory-bank/lessons-learned.md";
export const OUT_PATH = "docs/lessons-index.md";

const GEN = ".dev/floor/gen-lessons-index.mjs";
const REGEN = "npm run docs:generate";

// The ~4-chars-per-token heuristic, named rather than sprinkled. It is an ESTIMATE, never a measurement
// (`LIMITS.md §1c`: a static token figure is an estimate with a confidence band) — which is why every
// rendered value carries a leading `~`.
export const CHARS_PER_TOKEN = 4;

// The absent / malformed markers. They are DELIBERATELY DISTINCT (raised as GRILL F2): rendering both as
// `-` would make a poisoned or typo'd tag line indistinguishable from a legacy untagged entry, silently
// swallowing the malformation. `-` = no tag line at all: on THIS surface every canon entry carries one,
// so a `-` means an entry reached canon WITHOUT the promote gate's `type`/`concepts` — unexpected, and
// pinned by a live-canon drift guard in lessons-index-core.test.mjs (0 untagged, 0 malformed), so it
// fails `npm test` rather than merely rendering oddly. (The PRODUCT twin keeps the benign reading on
// purpose, and has no such pin: a user's corpus may legitimately hold hand-written entries.)
// `?` = a tag line IS present but failed its gate (unexpected — look at canon; same drift guard).
export const ABSENT = "-";
export const MALFORMED = "?";

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION 1 — the canon ENTRY contract (parsing). Changes when the entry shape changes.
// ════════════════════════════════════════════════════════════════════════════════════════════════════

// A lesson heading: `## L<n> — <title>`. The trailing space is required so `## L1x` cannot match `L1` —
// the SAME discipline as pharn/floor/check-plan-lessons.mjs, re-implemented in-file (no sibling import,
// P3; that file carries the identical note).
const HEADING_RE = /^## L(\d+) (.*)$/;

// Any `## `-level heading — the section boundary. A lesson's SPAN runs from its own heading to the next
// one (or EOF).
const ANY_H2_RE = /^## /;

// The #114 tag line (`.claude/commands/pharn-dev-memory-promote.md`, "The lesson-entry tag line" — cited,
// never restated, P4). Position: the FIRST NON-EMPTY line after the heading. Grammar:
//   type: <member> · concepts: [<c1>, <c2>, …]
// with the separator being space + U+00B7 MIDDLE DOT + space.
//
// L6 (structured location): the tag is read ONLY from that defined position, never grepped from the entry
// body. A `type:` string inside a lesson's prose is DATA ABOUT typing, not a declaration of it.
const TAG_CLAIM_RE = /^type:/; // "an attempt at a tag line was made here" — decides ABSENT vs MALFORMED
const TAG_RE = /^type: ([^·]*[^ ·]) · concepts: \[([^\]]*)\]$/;

// The Provenance date: `- promoted: YYYY-MM-DD via gated …`.
const PROMOTED_RE = /^- promoted: (\d{4}-\d{2}-\d{2})\b/;

// The entry TAXONOMY, MIRRORED from `.dev/floor/check-provenance.mjs` (which is a CLI and exports
// nothing). The mirror is pinned by the ✧ source-regex equality test in lessons-index-core.test.mjs —
// the same P4 drift guard check-provenance.test.mjs already applies to the memory-promote doc's copy, so
// this copy cannot go stale.
export const TYPE_ENUM = ["process", "contract", "floor", "scoping", "tooling", "eval"];

// `concepts` shape, mirroring check-provenance.mjs's open-vocabulary rule.
const CONCEPTS_MIN = 1;
const CONCEPTS_MAX = 6;
const CONCEPT_MAX_LEN = 32;
const CONCEPT_RE = /^[a-z0-9-]+$/;

// A string with no control characters and a bounded length. This is the PRECONDITION that must run BEFORE
// any anchored shape regex, never as a replacement for one (lessons-learned.md L14 — cited, not restated,
// P4): JavaScript `$` without the `m` flag matches at end-of-string OR just before a single trailing
// newline, so `CONCEPT_RE.test("enum-gate\n")` is TRUE. A shape regex used ALONE would therefore re-admit
// exactly the trailing-newline control-char vector this guard exists to reject. Compose, don't replace.
// Implemented as a char-code scan rather than a control-char REGEX on purpose — the same choice
// check-provenance.mjs makes, for the same stated reason: a regex holding literal control characters is
// neither readable in a diff nor safe against a copy-paste that silently drops them. (This file's first
// draft hit exactly that hazard, which is the empirical case for the house form.)
function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false; // C0 controls (incl. \t \n \r) + DEL
  }
  return true;
}

/**
 * Parse the tag line candidate. Returns { type, concepts } where each is a real value, ABSENT, or
 * MALFORMED. Never throws: a malformed tag is DATA about a defective canon entry, not a reason to break
 * the whole index (L3 — do not convert latent drift into active friction).
 */
function parseTagLine(line) {
  if (line === undefined || !TAG_CLAIM_RE.test(line)) {
    return { type: ABSENT, concepts: ABSENT };
  }
  const bad = { type: MALFORMED, concepts: MALFORMED };
  if (!cleanScalar(line, 512)) return bad;
  const m = line.match(TAG_RE);
  if (!m) return bad;

  // `type` — EXACT membership in a literal array (P5). Exact equality already excludes control chars.
  const type = m[1];
  if (!TYPE_ENUM.includes(type)) return bad;

  // `concepts` — guard first, then shape, then bounds, then uniqueness.
  const raw = m[2].trim();
  if (raw === "") return bad;
  const concepts = raw.split(",").map((s) => s.trim());
  if (concepts.length < CONCEPTS_MIN || concepts.length > CONCEPTS_MAX) return bad;
  for (const c of concepts) {
    if (!cleanScalar(c, CONCEPT_MAX_LEN)) return bad;
    if (!CONCEPT_RE.test(c)) return bad;
  }
  if (new Set(concepts).size !== concepts.length) return bad;

  return { type, concepts: concepts.join(",") };
}

// A rendered TITLE is canon FREE TEXT and therefore `trust: untrusted` DATA (P2) — it is copied through
// verbatim and never interpreted. Two vectors are closed by REFUSAL rather than sanitization (the
// SAFE_BASENAME precedent in capability-catalog-core.mjs — fail closed, P5):
//   1. a fence-closing sequence would break the title out of the ```text block into live markdown;
//   2. a control char would corrupt the rendered bytes the drift guard compares.
function assertSafeTitle(id, title) {
  if (title.includes("```")) {
    throw new Error(
      `lessons-index: ${id}'s title contains a fence-closing sequence — refusing to render it into ${OUT_PATH} ` +
        `(it would escape the code fence into live markdown)`
    );
  }
  if (!cleanScalar(title, 512)) {
    throw new Error(`lessons-index: ${id}'s title is empty, over-long, or contains a control character — refusing to render it`);
  }
}

/**
 * Parse canon into entries, sorted by numeric id ascending.
 * Returns [{ id, num, type, concepts, title, date, chars, tokens }].
 * Throws (fail-closed) on a duplicate id or an unsafe title. Never invents a field: an absent one renders
 * ABSENT, a defective one renders MALFORMED — never a guess.
 */
export function parseLessons(canonText) {
  const lines = canonText.split(/\r?\n/);

  // Pass 1 — heading membership + section spans.
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADING_RE);
    if (m) starts.push({ i, num: Number(m[1]), rest: m[2] });
  }

  const entries = [];
  const seen = new Map(); // L15: a Map, never a plain object indexed by an arbitrary key.
  for (const { i, num, rest } of starts) {
    const id = `L${num}`;
    if (seen.has(id)) {
      throw new Error(`lessons-index: duplicate lesson id "${id}" (lines ${seen.get(id) + 1} and ${i + 1}) — ids must be unique`);
    }
    seen.set(id, i);

    // SPAN (raised as GRILL F3, settled here and named so byte-equality cannot freeze an unstated choice):
    // the FULL SECTION — from this `## L<n>` heading through the line before the next `## ` heading, or
    // EOF. That is what a reader actually pays to read, which is the only thing the ~tokens column is for.
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (ANY_H2_RE.test(lines[j])) {
        end = j;
        break;
      }
    }
    const section = lines.slice(i, end);
    const chars = section.join("\n").length;

    // Title: the heading text after `## L<n> `, with the house em-dash prefix stripped.
    let title = rest.trim();
    if (title.startsWith("—")) title = title.slice(1).trim();
    assertSafeTitle(id, title);

    // Tag line: the FIRST NON-EMPTY line after the heading (the #114 defined position).
    let tagLine;
    for (let j = i + 1; j < end; j++) {
      if (lines[j].trim() !== "") {
        tagLine = lines[j];
        break;
      }
    }
    const { type, concepts } = parseTagLine(tagLine);

    // Date: the first `- promoted: <YYYY-MM-DD>` in this section, else ABSENT.
    let date = ABSENT;
    for (let j = i + 1; j < end; j++) {
      const pm = lines[j].match(PROMOTED_RE);
      if (pm) {
        date = pm[1];
        break;
      }
    }

    entries.push({ id, num, type, concepts, title, date, chars, tokens: Math.ceil(chars / CHARS_PER_TOKEN) });
  }

  entries.sort((a, b) => a.num - b.num);
  return entries;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION 2 — the index ROW format (rendering). Changes when the rendered line changes.
// ════════════════════════════════════════════════════════════════════════════════════════════════════

const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));

/**
 * Render the whole index document. Pure function of the entries — no timestamps, so two runs render
 * identical bytes.
 *
 * The rows live inside a ```text fence deliberately: a lesson TITLE is canon free text and several live
 * titles carry back-ticks and `||` (e.g. L15). Inside a fence those are inert — no GFM table to mangle, no
 * prettier column-alignment pass to fight, no escaping that would alter canon's words.
 */
export function renderIndex(entries) {
  const tagged = entries.filter((e) => e.type !== ABSENT && e.type !== MALFORMED).length;
  const malformed = entries.filter((e) => e.type === MALFORMED).length;
  const untagged = entries.filter((e) => e.type === ABSENT).length;
  const totalTokens = entries.reduce((n, e) => n + e.tokens, 0);

  const wId = Math.max(...entries.map((e) => e.id.length), 2);
  const wType = Math.max(...entries.map((e) => e.type.length), 4);
  const wConcepts = Math.max(...entries.map((e) => e.concepts.length), 8);

  const rows = entries.map(
    (e) => `${pad(e.id, wId)} | ${pad(e.type, wType)} | ${pad(e.concepts, wConcepts)} | ${e.title} | ${e.date} | ~${e.tokens}`
  );

  return (
    `<!-- GENERATED by ${GEN} from ${CANON_PATH} — DO NOT EDIT. Regenerate: ${REGEN} -->\n` +
    `\n` +
    `# Lessons index\n` +
    `\n` +
    `A derived, one-line-per-lesson address book for \`${CANON_PATH}\`. It exists so a stage can SELECT which\n` +
    `lessons to fetch; canon stays the source of truth and the floor's verification target\n` +
    `(\`pharn/floor/check-plan-lessons.mjs\` reads canon, never this file).\n` +
    `\n` +
    `**This index is not a substitute for reading a lesson.** Selecting a candidate here and declaring it\n` +
    `applied, without fetching its full \`## L<n>\` entry from canon, is the P0 disease. "The index was\n` +
    `consulted" never means "the relevant lessons were read".\n` +
    `\n` +
    `${entries.length} lessons · ${tagged} tagged · ${malformed} malformed · ${untagged} untagged · ~${totalTokens} tokens total\n` +
    `\n` +
    `Columns: \`id | type | concepts | title | promoted | ~tokens\`. \`${ABSENT}\` is rendered in THREE columns\n` +
    `and does NOT mean the same thing in each — read it against the column it sits in. In \`type\`/\`concepts\`:\n` +
    `every canon entry carries a tag line, so BOTH markers there are unexpected — \`${ABSENT}\` = no tag line,\n` +
    `i.e. an entry that reached canon without the promote gate's \`type\`/\`concepts\`; \`${MALFORMED}\` = a tag line\n` +
    `is present but failed its gate. Read that entry in canon either way. In \`promoted\`: \`${ABSENT}\` = the\n` +
    `entry has no \`- promoted: <date>\` line in its provenance block — a DIFFERENT defect, and one the\n` +
    `\`untagged\` count above does not measure, so a \`0 untagged\` header and a \`${ABSENT}\` in this column are\n` +
    `not a contradiction. \`~tokens\` is \`ceil(chars / ${CHARS_PER_TOKEN})\` over the FULL section\n` +
    `(heading through the line before the next \`##\`), an ESTIMATE with a confidence band, never a measurement\n` +
    `(\`LIMITS.md §1c\`). Titles are canon free text, reproduced verbatim as DATA.\n` +
    `\n` +
    "```text\n" +
    `${rows.join("\n")}\n` +
    "```\n"
  );
}

/**
 * Build the index for targetDir. Returns { entries, content }. Both the generator and the checker call
 * this — the ONLY renderer of index bytes.
 *
 * Throws (fail-closed, P5) if canon is missing or unreadable: rendering a plausible-looking EMPTY index
 * would be a lie, and a lie that regenerates cleanly is worse than a hard error.
 */
export function buildIndex(targetDir) {
  const abs = join(targetDir, CANON_PATH);
  let canonText;
  try {
    canonText = readFileSync(abs, "utf8");
  } catch {
    throw new Error(`lessons-index: canon is missing or unreadable: ${CANON_PATH} — refusing to render an empty index as fact`);
  }
  const entries = parseLessons(canonText);
  if (entries.length === 0) {
    throw new Error(`lessons-index: no \`## L<n> \` headings found in ${CANON_PATH} — refusing to render an empty index as fact`);
  }
  const content = renderIndex(entries);

  // `docs/` is NOT excluded by pharn/floor/validate.mjs's EXCLUDE_SEGMENTS, so this generated file lands on
  // the validate-SCANNED surface (lessons-learned.md L10). validate CHECK 5 fires on any file containing
  // BOTH `rule_id:` and `problem:` and lacking the enum-gated/free-text split documentation — so a pair of
  // canon titles could otherwise RED the product floor for a reason unrelated to the user's code. Refuse
  // rather than emit it (fail-closed, P5).
  if (/rule_id:/.test(content) && /problem:/.test(content)) {
    throw new Error(
      `lessons-index: the rendered index contains both \`rule_id:\` and \`problem:\` (from canon free text) — ` +
        `refusing to emit it, because ${OUT_PATH} sits on validate.mjs's scanned surface and would trip CHECK 5`
    );
  }
  return { entries, content };
}
