// pharn/floor/frontmatter-core.mjs — the ONE definition of the leading-YAML-frontmatter anchor, and the
// input normalisation that must happen before it is applied. Shared by every floor checker that reads
// frontmatter. Node stdlib only, zero behaviour beyond parsing.
//
// WHY THIS FILE EXISTS (the trigger, P7 — not a hypothetical). `FM_RE` was copy-pasted, byte-identical,
// into SIX checkers — check-spec, check-loop-record, check-plan-lessons, check-plan-spec-agree,
// check-ship-briefing, render-ship-briefing — with NOTHING ranging over that set. A UTF-8 BOM
// (`EF BB BF`) sits before the `---`, defeats the `^---` anchor, and every one of the six REDs a
// byte-valid file with "no YAML frontmatter block". Fixing it in whichever file surfaced the report
// would have left five copies broken and no test able to tell. That is lessons-learned L31 exactly: a
// deliberate copy creates an obligation set nothing enumerates, and the second copy is where the
// obligation is dropped. The remedy L29 prescribes for a set-quantified fix is to MATERIALISE the set —
// so the definition lives here once, and `frontmatter-core.test.mjs` ranges over the consumer list.
//
// The BOM matters for the same reason the CRLF fold does, and the two now live together (L25 — when the
// thing a rationale describes is repaired, re-derive rather than carry the old claim across). A Windows
// editor that writes CRLF is the same editor class that writes a BOM; `bodyHash` already folds CRLF so
// a Windows checkout cannot false-RED at the hashing step, while the BOM false-REDs one step EARLIER,
// at the anchor. Normalising both at the read is what makes the two defences complete rather than
// individually plausible.
//
// WHAT THIS DOES NOT DO (P0):
//   - NOT a YAML parser. `FM_RE` captures the raw block; a consumer reads a scalar from it with `readField`
//     (below, since 6.20.5 — the one value reader), or parses other shapes itself.
//   - NOT a general Unicode normaliser. Exactly ONE leading `U+FEFF` is stripped, only at offset 0. A
//     BOM in the middle of a file is content, not an encoding marker, and is left alone. A doubled BOM
//     is malformed input and still REDs — stripping greedily would be inventing a file the author did
//     not write.
//   - NOT a masking layer. A genuinely frontmatter-less file still fails the anchor. The fix removes a
//     FALSE red; it creates no path to a false GREEN.

/** The leading YAML frontmatter block. CRLF-tolerant. The single definition — do not re-declare it. */
export const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Written as the `\uFEFF` escape, never the literal character: a literal BOM here would itself be
// invisible in every editor and diff, and eslint's no-irregular-whitespace rejects it outright.
/** U+FEFF as a leading byte-order mark. Anchored, single occurrence, offset 0 only. */
const BOM_RE = /^\uFEFF/;

/**
 * Strip a single leading UTF-8 BOM, if present. Idempotent on already-clean text.
 * Call this on file text BEFORE applying `FM_RE` — that ordering is the whole point.
 */
export function stripBom(text) {
  return typeof text === "string" ? text.replace(BOM_RE, "") : text;
}

/**
 * Match the leading frontmatter block after normalising the input.
 * Returns the `FM_RE` match array, or `null` when there is genuinely no frontmatter.
 * Consumers should use this rather than applying `FM_RE` themselves, so the BOM strip cannot be
 * forgotten at a new call site.
 */
export function matchFrontmatter(text) {
  return stripBom(text).match(FM_RE);
}

// ── The ONE frontmatter VALUE reader (6.20.5) ───────────────────────────────────────────────────────────
//
// WHY IT LIVES HERE (the trigger, P7). check-spec.mjs and check-plan-spec-agree.mjs each carried a private,
// byte-identical copy of `readValue` (with `stripQuotes` / `stripComment`), each justifying the copy with "no
// sibling import (P3)". ac-tests-lock.mjs then grew a THIRD reader, `scalar()`, that disagreed with both: it
// returned the FIRST copy of a duplicated key and stripped a ` #` comment before resolving a quote. On a SPEC
// re-approved by APPENDING a new `spec_content_hash:` line under the old one, check-spec read the new pin while
// the bootstrap lock and the AC gate read the old one — GREEN over a changed SPEC (review finding, 6.20.5). A
// floor core is not a sibling, so the reason for the copies no longer held, and L35 says retire a second copy
// rather than bind it with a sync check. The two private copies were MOVED here byte-for-byte (behaviour
// unchanged; their suites pass unchanged) and `scalar()` was deleted. frontmatter-core.test.mjs holds the
// consumer set: it EXECUTES check-spec.mjs and check-plan-spec-agree.mjs over duplicated, quoted and commented
// keys, compares their reading with `readField`, and fails if a non-test floor module declares its own
// `readValue` or `scalar`.
//
// WHAT IT DOES NOT DO (P0): it does not REFUSE a duplicated key. LAST-wins, as a JS object assignment and YAML
// both resolve it; every consumer now agrees on which copy counts, and nothing in the floor REDs the duplicate.

function stripQuotes(v) {
  return v.replace(/^["']|["']$/g, "");
}

// Strip a YAML inline comment from an UNQUOTED scalar: a `#` at the value's start, or preceded by
// whitespace, opens a comment running to end of line. A `#` with NO preceding whitespace (`feat#3`) is NOT
// a comment and survives byte-exact — what YAML says, and what keeps an id containing a hash character
// intact. Deterministic; no LLM. WHY this exists: the command templates document their machine fields with a
// trailing `# …` note, so a field written exactly as documented was being read WITH the note glued on, and a
// 64-hex pin then failed its own enum-gate — a false RED on a correct file.
function stripComment(v) {
  return v.replace(/(^|\s)#.*$/, "").trim();
}

// Read one frontmatter field VALUE. THE QUOTE COMES FIRST, and that order is the part to get right: a
// QUOTED scalar's interior is taken verbatim up to its closing quote, and whatever follows that quote (a
// real trailing comment) is discarded. Doing it the other way — strip ` #…`, then the quotes — eats the
// closing quote of a value that legitimately contains ` #` (`"a # b"` → `a`, corrupted). Resolving the
// quote first gets BOTH shapes right: `"a # b"` keeps its hash, and `"FEAT-1" # note` drops the note.
// parseSpec stores EVERY field, not just the three this checker gates, so an unrelated quoted field must
// survive intact.
//
// Honestly bounded (P0): a pragmatic frontmatter reader, NOT a YAML library. The closing quote is found by
// a plain scan, so a value containing an ESCAPED quote (`"a\"b"`) ends at the escape rather than at the
// real terminator, and an UNTERMINATED quote falls through to the unquoted path rather than guess at an
// interior. No template here emits either shape, and both fail toward a visibly wrong value that the
// id/hash gates reject — never toward a silent pass.
export function readValue(raw) {
  const v = raw.trim();
  const q = v[0];
  if (q === '"' || q === "'") {
    const end = v.indexOf(q, 1);
    if (end > 0) return v.slice(1, end);
  }
  return stripQuotes(stripComment(v));
}

/** One `key: value` frontmatter line — the key grammar check-spec.mjs's parseSpec uses. */
export const FIELD_LINE_RE = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/;

/**
 * One frontmatter field by exact key, from the raw block `FM_RE` captured (`match[1]`), read with `readValue`.
 * LAST-wins across duplicate keys — the reading parseSpec's object assignment gives. `undefined` when absent.
 */
export function readField(block, key) {
  let found;
  for (const line of String(block).split(/\r?\n/)) {
    const kv = line.match(FIELD_LINE_RE);
    if (kv && kv[1] === key) found = readValue(kv[2]);
  }
  return found;
}
