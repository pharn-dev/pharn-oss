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
// THE SECOND FAMILY (6.65.2, audit ENF-3). validate.mjs and the readers that mirror it (count-lenses, count-grillers,
// count-verifiers, check-model-config, griller-extract; in .dev, capability-catalog-core and check-config) never used
// `FM_RE`: they test a LOOSER fence, `startsWith("---")` closed by the next `\n---`, on purpose. A BOM defeated it the
// same way, and there the failure was OPEN — a BOM'd capability was "not a capability" and validate printed GREEN
// over it. Each now calls `stripBom` before its own fence test and keeps the rest of its loose model unchanged. The
// test's anchor closure ranges over both families.
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
// both resolve it — the reading the SPEC readers (check-spec, check-plan-spec-agree) rely on. Two families refuse
// instead, each in its own consumer: check-plan-lessons.mjs REDs a repeated `applied_lessons` (6.65.2,
// frontmatter-parser-parity, audit ENF-4), because it gates that one field and choosing either copy would certify a
// declaration some other reader discards; and the five LOOP.md / BRIEFING.md envelope readers refuse ANY repeated
// key (6.71.3, envelope-duplicate-keys), through `frontmatterEntries` below.

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

/** One `- key: value` line of a dev PLAN's leading bullet header — the same key grammar behind a list marker. */
export const BULLET_FIELD_LINE_RE = /^-[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/;

// ── The ONE `key: value` line reader (6.65.2, frontmatter-parser-parity — audit ENF-4) ─────────────────────────
//
// WHY IT LIVES HERE (the trigger, P7). Eight floor modules (seven product, one dev) carried twelve private copies of
// the line regex above, and they disagreed on which copy of a repeated key counts: check-plan-lessons.mjs and the
// ship-briefing pair kept the FIRST, the LOOP.md envelope readers and `readField` the LAST. A PLAN carrying
// `applied_lessons: none` and then `applied_lessons: [L9999]` was GREEN on the copy YAML discards (reproduced at
// d5453a17). L35: retire the copies rather than bind them with a sync check. frontmatter-core.test.mjs (and, for
// .dev/floor, frontmatter-readers.test.mjs) holds the closure: no other non-test floor module may carry a regex literal
// opening `^(` or `^-[ \t]+(` followed by the `[A-Za-z_]` key class, with one allowlisted exception and its reason.
// BOUND (P0): the closure is LEXICAL. It catches every spelling the retired copies used; a copy written with another
// key class (say `[a-zA-Z_]`) would pass it, and only review catches that.
//
// It takes LINES, not a raw block, on purpose: the bullet-header readers must cut their region themselves (it ends at
// the first `##` heading, and fenced lines inside it are skipped), so a block-taking helper could not serve them. A
// frontmatter consumer passes `m[1].split(/\r?\n/)`. The VALUE is returned exactly as captured, untrimmed: each
// consumer keeps its own value rule, and those rules differ on purpose (check-loop-record.mjs refuses to strip a
// ` # comment` from a machine-written envelope; `readValue` strips it from a hand-written SPEC).

/**
 * Every line of `lines` matching `re` (default `FIELD_LINE_RE`), in order, as `{ key, raw }` — `raw` is the value
 * exactly as captured. Pure; a non-array yields `[]`. Which copy of a repeated key counts is the CALLER's choice.
 */
export function fieldEntries(lines, re = FIELD_LINE_RE) {
  const out = [];
  if (!Array.isArray(lines)) return out;
  for (const line of lines) {
    const kv = typeof line === "string" ? line.match(re) : null;
    if (kv) out.push({ key: kv[1], raw: kv[2] });
  }
  return out;
}

// ── The ENVELOPE reader (6.71.3, envelope-duplicate-keys — the ENF-4 follow-up 6.65.2 deferred) ────────────────────
//
// WHY IT LIVES HERE (the trigger, P7). Five floor modules read the `---` envelope of a LOOP.md or BRIEFING.md —
// check-loop-record, check-ship-briefing, check-loop-decision, loop-closeout, render-cost-ledger — and each carried
// its own `text.match(FM_RE)` + `fieldEntries(...)` loop that let the LAST copy of a repeated key win. They agreed
// with each other, but a person reading the file top-down saw the FIRST copy (a briefing with `verify_verdict: "PASS"`
// above `verify_verdict: "FAIL"` checked GREEN against a FAIL report), and a YAML 1.2 parser refuses the file, mapping
// keys being unique there. Nothing ranged over the five (L31). Each now reads its envelope through this one function
// and refuses when `repeated` is non-empty: the two checkers RED, the three consumers read the envelope as absent.
// frontmatter-core.test.mjs holds the closure: the set of modules calling `frontmatterEntries(` EQUALS its
// ENVELOPE_READERS list, and every other `fieldEntries(` caller is a listed header reader with its reason.
//
// It returns the entries AND the repeats, not a Map, on purpose: each reader keeps its own VALUE rule (the briefing
// decodes `yamlScalar` output, the ledger strips an unmatched quote, the loop readers strip a matched pair only), and
// whether a repeat REDs or reads as "no envelope" is the reader's verdict, not this core's.

/**
 * A leading frontmatter block's `key: value` entries (`fieldEntries` over `FIELD_LINE_RE`, in file order, values
 * untrimmed) plus every key that occurs more than once, each once, in first-occurrence order, as `{ key, count }`.
 * `null` when `text` is not a string or has no leading frontmatter (a leading BOM is stripped first). Pure.
 */
export function frontmatterEntries(text) {
  if (typeof text !== "string") return null;
  const m = matchFrontmatter(text);
  if (!m) return null;
  const entries = fieldEntries(m[1].split(/\r?\n/));
  const counts = new Map(); // a Map, never a plain object keyed by file content (L15)
  for (const { key } of entries) counts.set(key, (counts.get(key) ?? 0) + 1);
  const repeated = [];
  for (const [key, count] of counts) if (count > 1) repeated.push({ key, count });
  return { entries, repeated };
}

/** `a ×2, b ×3` — a repeat list for a refusal message: keys (line-grammar identifiers) and counts, never a value. */
export function describeRepeats(repeated) {
  return repeated.map(({ key, count }) => `\`${key}\` ×${count}`).join(", ");
}

/**
 * One frontmatter field by exact key, from the raw block `FM_RE` captured (`match[1]`), read with `readValue`.
 * LAST-wins across duplicate keys — the reading parseSpec's object assignment gives. `undefined` when absent.
 */
export function readField(block, key) {
  let found;
  for (const { key: k, raw } of fieldEntries(String(block).split(/\r?\n/))) {
    if (k === key) found = readValue(raw);
  }
  return found;
}
