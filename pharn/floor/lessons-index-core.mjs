#!/usr/bin/env node
// pharn/floor/lessons-index-core.mjs — the SHARED, deterministic core for the lessons index, on the
// PRODUCT surface (a USER's own repo).
//
// Single source of truth imported by BOTH the generator (gen-lessons-index.mjs) and the drift checker
// (check-lessons-index.mjs), so "recompute" (checker) is byte-identical to "generate" (generator) BY
// CONSTRUCTION — the comparison guard would be meaningless if the two sides rendered via different code
// (P3: route the shared thing through one module; do not duplicate).
//
// THE ONE IMPLEMENTATION of the lessons grammar (6.69.0). Until then `.dev/floor/lessons-index-core.mjs` was a
// hand-kept second copy, pinned to agree by ✧ text tests (audit ARCH-6). It is now a thin wrapper that imports
// this module and passes a PROFILE (below) — the dependency points `.dev/` -> `pharn/`, the only direction an
// install allows, since it ships `pharn/floor/` without `.dev/`. What differs between the surfaces is DATA in a
// profile (paths, the regenerate hint, two header paragraphs) plus the caller's own reading of `no-canon`; the
// parse and the render are this file's code alone.
//
// SCOPE NOTE (P3, stated rather than hidden). This module has TWO reasons to change: the canon ENTRY
// contract (the `## L<n>` heading and the tag line) and the index ROW format (the rendered line). That is
// two axes in one file. It is a KNOWN, ACCEPTED cost, taken because the parse and the render MUST live
// behind one module or the "recompute == generate" property is lost. The two concerns are kept in clearly
// separated sections below.
//
// ════ WHAT THIS DOES AND DOES NOT BUY (P0 — say it, don't bury it) ════
//
// The property delivered downstream, under the PRODUCT profile, is that the CACHED index equals what this
// module recomputes from canon. Read the narrowing carefully, because it is NOT the dev surface's guarantee
// (there the output is a COMMITTED page, held to byte-equality by its own checker):
//
//   - OUT_PATH is `pharn/.run/`, which is GITIGNORED runtime scratch. So this is a STALENESS check over a
//     disposable CACHE — NOT the dev surface's "the COMMITTED index equals the recompute" byte-equality.
//     Nothing durably pins these bytes.
//   - Its COVERAGE is therefore machine-local and ephemeral: a fresh clone has no cache at all (a normal
//     COLD state, never an error), so the stale-cache RED can fire only between a change to canon that
//     bypassed the generator and the next regeneration, ON THE MACHINE holding that cache.
//   - It is NOT a guarantee that the index is TRUE. A wrong parser here would be regenerated, cached
//     wrongly, and the check would stay GREEN. Consistency, never correctness.
//   - `type` / `concepts` are model-drafted values ratified only by a human at the /pharn-memory-promote
//     gate: "the entry is typed `floor`" NEVER means "the entry is about the floor", so any selection
//     keyed on this index is ADVISORY-grade context selection, never a guarantee.
//   - "The index was consulted" NEVER means "the relevant lessons were read".
//
// Deterministic (P5): enumeration = `^## L(\d+) ` heading membership; ordering = numeric id ascending (a
// total order, independent of file order); rendering = a pure function of the parsed entries; NO timestamps
// anywhere → running twice yields byte-identical output. A duplicate id is a thrown Error (fail-closed),
// never a silent overwrite.
//
// Non-LLM, stdlib-only.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CANON_ROOT, CANON_ROOT_FLAG, parseCanonRoot } from "./canon-root.mjs";

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PROFILE — what a surface supplies; everything else in this file is shared code
// ════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   canonPath   the canon file read (repo-relative, POSIX)
//   outPath     the index file written / compared
//   gen         the generator named in the rendered header
//   regen       the regenerate command named in the header and in the checker's FIX line
//   storageNote a header paragraph placed before the counts line ("" for none)
//   columnsNote the header paragraph explaining the columns and markers
//
// A profile is CODE-SUPPLIED — this file's productProfile(), or a `.dev/floor/` wrapper's constant — never derived
// from canon or from a model's reading of free text, so its notes are trusted text and are not put through the
// title refusals. The CHECK-5 refusal in buildIndex() still runs over the whole rendered page, notes included.
//
// The PRODUCT profile, and why each value is what it is:
// - canonPath — the USER's memory-bank (`pharn/memory-bank/`, or the `--canon-root` a caller passes; canon-root.mjs
//   states that flag's bound). It must agree with what /pharn-plan reads and with check-provenance.mjs's targets.
// - outPath — `pharn/.run/` runtime scratch, never a committed `docs/` page: `docs/` in a user's repo is THE USER'S
//   directory, and writing there would be a scope claim on ground PHARN does not own. The cost is the narrowed
//   property stated above.
// - regen — a bare `node` invocation, never an npm script (lessons-learned.md L2: a doc may cite only a LIVE op);
//   a user's project need not be a Node project. A non-default root carries its flag, so the hint stays runnable.
// - absent / empty canon is a BENIGN NO-OP (`STATUS_NO_CANON`), not a throw: a user's repo commonly has no
//   memory-bank at all, and that is the honest normal state. A caller for whom canon must exist (the dev
//   surface) refuses on that status itself.

const PRODUCT_GEN = "pharn/floor/gen-lessons-index.mjs";

const PRODUCT_COLUMNS_NOTE = (absent, malformed) =>
  `Columns: \`id | type | concepts | title | promoted | ~tokens\`. \`${absent}\` is rendered in THREE columns\n` +
  `and does NOT mean the same thing in each. In \`type\`/\`concepts\`: \`${absent}\` = no tag line (an entry\n` +
  `written before the tag line existed, or by hand — expected and benign). In \`promoted\`: \`${absent}\` = the\n` +
  `entry has no \`- promoted: <date>\` line, which the \`untagged\` count above does not measure, so it is not\n` +
  `a contradiction beside a \`0 untagged\` header. \`${malformed}\` = a tag line is\n` +
  `present but failed its gate — that is unexpected; read the entry in canon. \`~tokens\` is\n` +
  `\`ceil(chars / ${CHARS_PER_TOKEN})\` over the FULL section (heading through the line before the next \`##\`), an\n` +
  `ESTIMATE with a confidence band, never a measurement (\`pharn/LIMITS.md §1c\`). Titles are canon free text,\n` +
  `reproduced verbatim as DATA.\n`;

/**
 * The product profile for a canon root (default: the user's `pharn/memory-bank`). The root goes through canon-root.mjs's
 * grammar here as well as at the CLI, so an importer cannot build a profile the flag would refuse; a refused root
 * THROWS (a caller bug, never a canon state).
 */
export function productProfile(root = DEFAULT_CANON_ROOT) {
  const parsed = parseCanonRoot(root);
  if (!parsed.ok) throw new Error(`lessons-index: ${parsed.reason}`);
  root = parsed.root;
  const regen = root === DEFAULT_CANON_ROOT ? `node ${PRODUCT_GEN} .` : `node ${PRODUCT_GEN} ${CANON_ROOT_FLAG} ${root} .`;
  return Object.freeze({
    canonPath: `${root}/lessons-learned.md`,
    outPath: "pharn/.run/lessons-index.md",
    gen: PRODUCT_GEN,
    regen,
    storageNote:
      `**This file is a disposable CACHE.** It lives in gitignored \`pharn/.run/\` runtime scratch, so it is not\n` +
      `committed and nothing durably pins it. Delete it freely; regenerate with \`${regen}\`. If your own\n` +
      `linters or formatters scan \`pharn/.run/\`, exclude this path — a tool that rewrites it makes the cache\n` +
      `disagree with canon for a reason that has nothing to do with canon.\n`,
    columnsNote: PRODUCT_COLUMNS_NOTE(ABSENT, MALFORMED),
  });
}

// `buildIndex` status values — a closed set the callers branch on by membership (P5), never by parsing a
// message. `no-canon` is the honest normal state of a project that has promoted nothing yet.
export const STATUS_OK = "ok";
export const STATUS_NO_CANON = "no-canon";

// The ~4-chars-per-token heuristic, named rather than sprinkled. It is an ESTIMATE, never a measurement
// (`pharn/LIMITS.md §1c`: a static token figure is an estimate with a confidence band) — which is why every
// rendered value carries a leading `~`.
export const CHARS_PER_TOKEN = 4;

// The absent / malformed markers. They are DELIBERATELY DISTINCT: rendering both as `-` would make a
// poisoned or typo'd tag line indistinguishable from a legacy untagged entry, silently swallowing the
// malformation. `-` = no tag line at all (expected and benign for an entry written before the tag line
// existed, or by hand). `?` = a tag line IS present but failed its gate (unexpected — look at canon).
export const ABSENT = "-";
export const MALFORMED = "?";

// The default (product) profile, and its two paths under their historical names. Declared here, below the
// constants the profile's notes read, so nothing is read before it is initialized.
export const PRODUCT_PROFILE = productProfile();
export const CANON_PATH = PRODUCT_PROFILE.canonPath;
export const OUT_PATH = PRODUCT_PROFILE.outPath;

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

// The lesson-entry tag line (`.claude/commands/pharn-memory-promote.md`, "The lesson-entry tag line" —
// cited, never restated, P4). Position: the FIRST NON-EMPTY line after the heading. Grammar:
//   type: <member> · concepts: [<c1>, <c2>, …]
// with the separator being space + U+00B7 MIDDLE DOT + space.
//
// L6 (structured location): the tag is read ONLY from that defined position, never grepped from the entry
// body. A `type:` string inside a lesson's prose is DATA ABOUT typing, not a declaration of it.
const TAG_CLAIM_RE = /^type:/; // "an attempt at a tag line was made here" — decides ABSENT vs MALFORMED
const TAG_RE = /^type: ([^·]*[^ ·]) · concepts: \[([^\]]*)\]$/;

// The Provenance date: `- promoted: YYYY-MM-DD via gated …`.
const PROMOTED_RE = /^- promoted: (\d{4}-\d{2}-\d{2})\b/;

// The entry TAXONOMY, MIRRORED from `pharn/floor/check-provenance.mjs` (which is a CLI and exports
// nothing). The mirror is pinned by the ✧ source-regex equality test in
// .dev/floor/lessons-index-core.test.mjs, so this copy cannot go stale.
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
// neither readable in a diff nor safe against a copy-paste that silently drops them.
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
// verbatim and never interpreted. Canon is a user's memory-bank, and memory poisoning is the worst
// persistence vector (`pharn/THREAT-MODEL.md §2`), so two vectors are closed by REFUSAL rather than
// sanitization (fail closed, P5):
//   1. a fence-closing sequence would break the title out of the ```text block into live markdown;
//   2. a control char would corrupt the rendered bytes the drift check compares.
function assertSafeTitle(id, title) {
  if (title.includes("```")) {
    throw new Error(
      `lessons-index: ${id}'s title contains a fence-closing sequence — refusing to render it into the index ` +
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

    // SPAN: the FULL SECTION — from this `## L<n>` heading through the line before the next `## ` heading,
    // or EOF. That is what a reader actually pays to read, which is the only thing the ~tokens column is
    // for. Named here so the comparison guard cannot freeze an unstated choice.
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

    // Tag line: the FIRST NON-EMPTY line after the heading (the defined position).
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
 * The rows live inside a ```text fence deliberately: a lesson TITLE is canon free text and real titles
 * carry back-ticks and `||`. Inside a fence those are inert — no GFM table to mangle, no formatter
 * column-alignment pass to fight, no escaping that would alter canon's words.
 *
 * `profile` supplies the paths and the two surface-specific paragraphs (see "THE PROFILE" above); it defaults
 * to the product profile, whose output is byte-identical to the pre-profile renderer's.
 */
export function renderIndex(entries, profile = PRODUCT_PROFILE) {
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
    `<!-- GENERATED by ${profile.gen} from ${profile.canonPath} — DO NOT EDIT. Regenerate: ${profile.regen} -->\n` +
    `\n` +
    `# Lessons index\n` +
    `\n` +
    `A derived, one-line-per-lesson address book for \`${profile.canonPath}\`. It exists so a stage can SELECT which\n` +
    `lessons to fetch; canon stays the source of truth and the floor's verification target\n` +
    `(\`pharn/floor/check-plan-lessons.mjs\` reads canon, never this file).\n` +
    `\n` +
    `**This index is not a substitute for reading a lesson.** Selecting a candidate here and declaring it\n` +
    `applied, without fetching its full \`## L<n>\` entry from canon, is the P0 disease. "The index was\n` +
    `consulted" never means "the relevant lessons were read".\n` +
    `\n` +
    (profile.storageNote ? `${profile.storageNote}\n` : "") +
    `${entries.length} lessons · ${tagged} tagged · ${malformed} malformed · ${untagged} untagged · ~${totalTokens} tokens total\n` +
    `\n` +
    profile.columnsNote +
    `\n` +
    "```text\n" +
    `${rows.join("\n")}\n` +
    "```\n"
  );
}

/**
 * Build the index for targetDir. Returns { status, entries, content }.
 *
 * `status === STATUS_NO_CANON` (with `entries: []`, `content: null`) when canon is ABSENT (ENOENT/ENOTDIR),
 * OR present with zero `## L<n> ` headings. On the product surface both are the HONEST NORMAL STATE of a
 * project that has promoted nothing yet, and callers treat the status as a benign no-op. A caller for whom
 * canon must exist (the dev wrapper — on the build-apparatus surface canon always exists) refuses on this
 * status itself. Either way the branch is a membership test over the status (P5).
 *
 * Still THROWS (fail-closed, P5) when canon IS present and INVALID — a duplicate id, an unsafe title, or
 * the CHECK-5 hazard below — and on any read failure other than absence. A present-but-broken canon is a
 * real, loud error on every surface.
 */
export function buildIndex(targetDir, profile = PRODUCT_PROFILE) {
  const abs = join(targetDir, profile.canonPath);
  let canonText;
  try {
    canonText = readFileSync(abs, "utf8");
  } catch (e) {
    // Membership over `e.code`, with the terminal fallback being RETHROW (P5, fail-closed). ONLY genuine
    // ABSENCE is benign: on the product surface a missing memory-bank is the honest normal state of a
    // fresh install. A bare catch
    // also swallowed EACCES / EISDIR on a canon that EXISTS and HOLDS lessons, returning NO_CANON — and
    // `/pharn-plan` then declares `applied_lessons: none` as though the user had no lessons at all. A
    // real I/O failure must fail closed, never present as an empty memory-bank.
    if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
      return { status: STATUS_NO_CANON, entries: [], content: null };
    }
    throw e;
  }
  const entries = parseLessons(canonText);
  if (entries.length === 0) {
    return { status: STATUS_NO_CANON, entries: [], content: null };
  }
  const content = renderIndex(entries, profile);

  // `docs/` (the dev outPath) is not in pharn/floor/validate.mjs's EXCLUDE_SEGMENTS, so that generated file lands on
  // the validate-SCANNED surface (lessons-learned.md L10) — being gitignored does not exempt a file from validate's
  // walk. The product outPath `pharn/.run/` IS excluded since 7.0.0; the refusal is kept for both profiles, which
  // is stricter than the product one needs (fail-closed).
  // validate CHECK 5 fires on any file containing BOTH `rule_id:` and `problem:` and lacking the
  // enum-gated/free-text split documentation — so a pair of canon titles could otherwise RED a user's
  // floor for a reason unrelated to their code. Refuse rather than emit it (fail-closed, P5).
  if (/rule_id:/.test(content) && /problem:/.test(content)) {
    throw new Error(
      `lessons-index: the rendered index contains both \`rule_id:\` and \`problem:\` (from canon free text) — ` +
        `refusing to emit it, because an index on validate.mjs's scanned surface (docs/ is; pharn/.run/ is not) would trip CHECK 5`
    );
  }
  return { status: STATUS_OK, entries, content };
}
