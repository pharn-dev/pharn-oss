#!/usr/bin/env node
// pharn/floor/scan-code-missing-error-handling.mjs — deterministic UNGUARDED-RISKY-OP scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-swallowed-exception.mjs / scan-code-missing-await.mjs in the scan-code-* family.
// Where swallowed-exception brace-matches a CATCH body (does it swallow?), this scanner brace-matches the TRY body to
// ask the opposite question for the `missing-error-handling` LENS (pharn-review/missing-error-handling/): is a RISKY
// operation — an `await` expression, or a `JSON.parse(` call — sitting with NO error handling around it, i.e. NOT
// lexically inside any `try {…}` block in this file, AND (for an await) NOT `.catch(`-guarded on its own line?
// Detection is a FIXED, non-LLM, TWO-PASS procedure over MASKED text:
//   PASS 1 (try ranges): find each `try {`, brace-match its body `{`→`}`, record the [openIdx, closeIdx] CHAR range.
//   PASS 2 (risky ops):  match `\bawait\b` and `\bJSON\s*\.\s*parse\s*\(`; a match at char index p is a HIT unless
//                        p is inside some try range (o < p < c), or — for `await` only — its physical line carries a
//                        `.catch(` handler (a synchronous JSON.parse is guarded ONLY by a try, never by `.catch`).
// It reduces to ARCHITECTURE §2 primitive #3 (regex / text membership + brace-match).
//
// HONEST BOUND (the swallowed-exception / missing-await precedent, P0): this detects an UNGUARDED-RISKY-OP SHAPE. It
// does NOT decide whether error handling is actually NEEDED here (an await whose rejection the CALLER's try handles is
// fine; a best-effort op may intentionally have none), does NOT trace control/data flow, and does NOT know intent.
// "Line N holds an `await`/`JSON.parse` not lexically inside a `try` block in this file" is a real guarantee;
// "this op needs handling" / "the code is reliable" is NOT. That judgment is the LENS's ADVISORY layer — NOT this floor.
//
// Documented FALSE-NEGATIVES / scope (honest, stated not hidden — v0.1.0, the whole point is to not oversell):
//   • ROSTER = an AWAITED CALL (`await ident(`) + `JSON.parse(` ONLY. A throwing call NOT in the roster
//     (fs.readFileSync, a custom client, a bare parse), and `await` of a non-call (`await bareVar`), are NOT flagged.
//     The awaited-call form is intentionally BROAD (any awaited promise can reject) — the "is handling needed" call is
//     the lens's ADVISORY layer, not this scanner.
//   • CALLER-HANDLED: the scan is LEXICAL and SINGLE-FILE, so an await whose rejection a CALLER's try/catch handles
//     (the await's own function has none) is flagged — a documented false-POSITIVE.
//   • SAME-LINE `.catch` ONLY (await): `await f().catch(h)` on ONE line is treated as handled; a `.catch` chained on
//     the NEXT physical line is still flagged (false-positive), and a stray `.catch` belonging to another call on the
//     same line as an await suppresses it (false-negative) — the honest price of a line-oriented handled-exclusion.
//   • JS/TS-shaped. A Python `try/except`, a Go `recover`, yields found:false — a SCOPE limit, not a "clean" verdict.
//   • BACKTICKS ARE NOT MASKED FOR DETECTION (family idiom; robust over a MARKDOWN eval fixture), so an `await`/
//     `JSON.parse` inside a template-literal's TEXT is read as code — a documented false-POSITIVE. But the two
//     SUPPRESSION reads (the try-guard ranges AND the same-line `.catch` exclusion) run over a SECOND copy in which
//     template-literal string content is ALSO masked (maskTemplateInteriors), so backtick text can never SUPPRESS a
//     real hit. A `}` inside a template/regex literal within a try body can skew that try's brace-match; an
//     UNBALANCED `try {` (matchDelim → -1) contributes NO range (so it can never SUPPRESS a real hit — fail-open
//     toward flagging, never toward hiding).
//   • A risky op inside a `catch`/`finally` block is (correctly) NOT inside the `try` BODY range → flagged. Intended:
//     an await/JSON.parse in a catch/finally genuinely has no try around IT. NOT a bug.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): DETECTION (the `await`/`JSON.parse` risky-op regexes) runs over the
// comment/string-MASKED text with template literals left INTACT, so it survives ```-fenced markdown fixtures. The two
// SUPPRESSION reads — the try-guard RANGES (PASS 1) and the same-line `.catch` exclusion — run over a SECOND copy in
// which template-literal STRING content is ALSO masked (see maskTemplateInteriors). So no free text — a // or /* */
// comment, a single/double-quoted string, OR a template-literal's text — can SUPPRESS a real unguarded hit (neither a
// fake `try {…}` guard span NOR a fake same-line `.catch`), and a comment CLAIMING error handling is needed cannot
// MANUFACTURE a hit over guarded code. The suppression masking is MONOTONE: it only ADDS masking to the suppression
// copy (a SUPERSET of what `masked` blanks) and never touches detection's `masked`, so the fix strictly NARROWS the
// laundering surface, never widens it, and can only over-flag. No template-literal STRING content at ANY nesting
// depth — single OR nested `${…}`, the attack surface — can suppress a real hit: neither a fake `try {…}` guard span
// NOR a fake same-line `.catch` in a nested template can silence a real unguarded await (interpolation CODE stays
// readable, but that is real code, not backtick text). DOCUMENTED RESIDUAL (the price of fence-robustness): a run of ≥3
// backticks is a MARKDOWN CODE-FENCE marker, so a ≥3-backtick-wrapped token is read as CODE — correct over a .md
// fixture (fenced content IS the code under review), a narrow residual in raw .js. The un-masked-backtick DETECTION
// false-POSITIVE above is a separate, accepted bound, not a hole in this. (See the ★ tests in
// scan-code-missing-error-handling.test.mjs — the backtick-laundering immunity cases AND the ≥3-backtick residual
// bound — the whole reason this is FLOOR, not judgment.)
//
// MULTI-LINE MASKING PRESERVES LINE COUNT (P5): the mask replaces comment/string characters with spaces but PRESERVES
// newlines, so 1-based line numbers map 1:1 to the original.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the scan-code-* family: a missing / non-file
// target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean". A readable file with no unguarded-risky
// shape (empty, prose, or fully-guarded code) is a SUCCESSFUL scan → {"found":false,"hits":[]} on stdout, exit 0.
//
// Usage:  node pharn/floor/scan-code-missing-error-handling.mjs <code-file>
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"unguarded-await|unguarded-json-parse"}]} on stdout; exit 0 on a
//         successful scan (whatever the result). `line` = the 1-based ORIGINAL line of the risky op. Hits are DEDUPED by
//         (line, kind) and sorted by line then kind. `found` === hits.length > 0. Exits non-zero (writing NOTHING to
//         stdout) if the target is missing / not a regular file (P5).

import { readFileSync, statSync, existsSync } from "node:fs";

const TARGET = process.argv[2];

function fail(msg) {
  process.stderr.write("scan-code-missing-error-handling: " + msg + "\n");
  process.exit(1);
}

if (!TARGET) fail("usage: scan-code-missing-error-handling.mjs <code-file>");
// Fail-closed (P5): a missing / non-file target is an ERROR, never a silent empty (= "clean") result.
if (!existsSync(TARGET) || !statSync(TARGET).isFile()) {
  fail(`target file not found (or not a regular file): ${TARGET}`);
}

let text;
try {
  text = readFileSync(TARGET, "utf8");
} catch (e) {
  fail(`could not read target: ${e.message}`);
}

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Verbatim reuse of the scan-code-swallowed-exception.mjs / scan-code-missing-await.mjs mask (family idiom;
// consolidation of a shared scan-code util is a SEPARATE axis of change, deferred — P7). Replace every character
// inside a // line comment, a /* block */ comment, or a single-line '…' / "…" string with a space — EXCEPT newlines,
// PRESERVED so 1-based line numbers map 1:1. BACKTICKS are NOT masked (no template masking); '…'/"…" masking STOPS AT
// END-OF-LINE so a stray prose quote cannot bleed the mask into fenced code below it.
function mask(src) {
  const out = new Array(src.length);
  let i = 0;
  const N = src.length;
  const space = (ch) => (ch === "\n" ? "\n" : " ");
  while (i < N) {
    const c = src[i];
    const n = i + 1 < N ? src[i + 1] : "";
    if (c === "/" && n === "/") {
      while (i < N && src[i] !== "\n") ((out[i] = " "), i++);
      continue;
    }
    if (c === "/" && n === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < N && !(src[i] === "*" && src[i + 1] === "/")) ((out[i] = space(src[i])), i++);
      if (i < N) ((out[i] = " "), (out[i + 1] = " "), (i += 2));
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      out[i] = " ";
      i++;
      while (i < N && src[i] !== "\n") {
        if (src[i] === "\\") {
          out[i] = " ";
          if (i + 1 < N && src[i + 1] !== "\n") ((out[i + 1] = " "), (i += 2));
          else i++;
          continue;
        }
        if (src[i] === q) {
          out[i] = " ";
          i++;
          break;
        }
        out[i] = " ";
        i++;
      }
      continue;
    }
    out[i] = c;
    i++;
  }
  return out.join("");
}

const masked = mask(text);

// --- Suppression-only template-interior MASK ----------------------------------------------------------------
// DETECTION (AWAIT_RE / JSONPARSE_RE, below) runs over `masked` with template literals INTACT, so it survives
// ```-fenced code in a MARKDOWN eval fixture. But the two SUPPRESSION reads (the try-guard RANGES in PASS 1 and
// the same-line `.catch` exclusion) must NOT read a template literal's STRING content as code — otherwise
// untrusted backtick text supplies a fake `try {…}` guard span or a fake same-line `.catch`, silencing a real
// unguarded hit (taint laundering INTO the enum-gated verdict, P2). So those reads run over THIS second copy, in
// which template-literal interiors are ALSO blanked. Two rules keep detection fence-robust:
//   • a RUN OF ≥3 BACKTICKS is a MARKDOWN CODE-FENCE marker → emitted unchanged, NOT a template delimiter (this
//     preserves the real code that lives BETWEEN ```-fences; the ≥3-run skip is load-bearing);
//   • a SINGLE (or double) backtick opens a TEMPLATE STRING (mask mode); inside it every char is blanked to a space
//     (newline preserved), and a backtick closes it (a run of exactly TWO backticks `` is an EMPTY template —
//     nothing masked). A DEPTH-AWARE STACK (not a boolean toggle) tracks `${…}` interpolation: interpolation CODE is
//     left READABLE, and a backtick inside it opens ANOTHER nested template (masked) — so a nested `${`try {`}` masks
//     its inner string at ANY depth (the old boolean mis-closed on that inner backtick and re-laundered it).
// MONOTONICITY (P0/P2): this pass only ever ADDS masking to the SUPPRESSION copy; DETECTION reads the untouched
// `masked`, so no crafted backtick input can REMOVE masking to re-enable suppression — the fix can only over-flag,
// never launder. Length + newlines are preserved 1:1, so offsets map back to `masked`. (Verbatim the #67 helper
// added to scan-code-null-deref.mjs / scan-code-resource-leak.mjs — a deferred shared-util consolidation, P7.)
function maskTemplateInteriors(src) {
  const out = src.split("");
  const N = src.length;
  const space = (ch) => (ch === "\n" ? "\n" : " ");
  // Depth-aware template/interpolation parse (NOT a boolean toggle — the old `inTmpl` boolean mis-closed a
  // template on the FIRST backtick inside a `${…}` interpolation, exposing a NESTED template's interior as
  // code and re-laundering a suppressor). `stack` holds the open contexts, innermost last:
  //   • { kind: "tmpl" }          — inside a template-literal STRING: every char is blanked (mask mode).
  //   • { kind: "interp", depth } — inside a `${…}` interpolation: chars are readable CODE; `depth` tracks
  //                                 `{`/`}` nesting so the matching `}` (depth 0) closes the interpolation.
  // A backtick inside an interpolation opens ANOTHER nested template (push) — proper stack balance at ANY
  // depth, so `${`user`}` masks the inner `user` instead of exposing it. Only template-STRING interiors are
  // masked; interpolation code and non-template code stay readable. Length + newlines preserved 1:1.
  const stack = [];
  const top = () => (stack.length ? stack[stack.length - 1] : null);
  let i = 0;
  while (i < N) {
    const c = src[i];
    const t = top();
    if (t && t.kind === "tmpl" && c === "\\") {
      // Inside a template STRING a backslash escapes the next char: `\`` is a LITERAL backtick (not a close)
      // and `\${` is LITERAL text (not an interpolation opener). Consume BOTH chars as blanked template text so
      // the escaped delimiter can't close the template early and leak literal string text into the suppression
      // copy. Escapes only matter in template strings — interpolation/plain code stays readable.
      out[i] = space(c);
      if (i + 1 < N) out[i + 1] = space(src[i + 1]);
      i += 2;
      continue;
    }
    if (c === "`") {
      if (!t || t.kind === "interp") {
        // Outside a template STRING (top level OR interpolation code): a RUN OF ≥3 BACKTICKS is a markdown
        // ```-fence marker → emit unchanged, do NOT open a template (preserves real code between fences).
        let j = i;
        while (j < N && src[j] === "`") j++;
        if (j - i >= 3) {
          i = j;
          continue;
        }
        stack.push({ kind: "tmpl" }); // a single (or double) backtick opens a template (nested if in interp)
        i++;
        continue;
      }
      stack.pop(); // t.kind === "tmpl": a backtick closes the current template
      i++;
      continue;
    }
    if (t && t.kind === "tmpl" && c === "$" && i + 1 < N && src[i + 1] === "{") {
      stack.push({ kind: "interp", depth: 0 }); // `${` opens interpolation; `$` and `{` are readable code
      i += 2;
      continue;
    }
    if (t && t.kind === "interp") {
      if (c === "{") {
        t.depth++;
        i++;
        continue;
      }
      if (c === "}") {
        if (t.depth === 0) {
          stack.pop(); // matching `}` closes the interpolation, back to the enclosing template
          i++;
          continue;
        }
        t.depth--;
        i++;
        continue;
      }
      i++; // interpolation code — readable
      continue;
    }
    if (t && t.kind === "tmpl") {
      out[i] = space(c); // blank a template-string char
      i++;
      continue;
    }
    i++; // plain code — preserved
  }
  return out.join("");
}

const maskedForSuppression = maskTemplateInteriors(masked);

// --- Helpers (reused from scan-code-swallowed-exception.mjs) -------------------------------------------------
// Brace-match the delimiter that closes `open` at `openIdx` over the MASKED text. Returns the closing index, or -1
// if unbalanced (an unbalanced `try {` contributes no range — it can never SUPPRESS a hit).
function matchDelim(s, openIdx, open, close) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function lineAt(s, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < s.length; i++) if (s[i] === "\n") line++;
  return line;
}

// --- PASS 1: TRY-body char ranges (FIXED regex + brace-match — P5) -------------------------------------------
// SUPPRESSION read: a try range GUARDS (suppresses) a hit, so it runs over `maskedForSuppression` (template
// interiors blanked) — NOT `masked` — so a backtick `try {…}` span can never MANUFACTURE a guard that silences a
// real unguarded await (P2; see maskTemplateInteriors). A real `try {` in a ```-fence survives (the ≥3-backtick
// fence-skip preserves fenced code); a `try` token inside a comment/string/single-backtick is blanked and cannot
// match; a `.catch(` method does not match (`try` is required). Nested try blocks each contribute their own range.
const TRY_RE = /\btry\b\s*\{/g;
const tryRanges = [];
{
  let m;
  while ((m = TRY_RE.exec(maskedForSuppression)) !== null) {
    const braceOpen = m.index + m[0].length - 1; // index of the body's '{'
    const braceClose = matchDelim(maskedForSuppression, braceOpen, "{", "}");
    if (braceClose === -1) continue; // unbalanced — no range (never suppresses a hit; documented bound)
    tryRanges.push([braceOpen, braceClose]);
  }
}
function guarded(p) {
  // GUARDED iff p sits strictly inside some try BODY (after the '{', before the matching '}').
  for (const [o, c] of tryRanges) if (p > o && p < c) return true;
  return false;
}

// --- PASS 2: risky ops NOT guarded (FIXED regexes — P5) ------------------------------------------------------
// The roster is exactly an AWAITED CALL + a `JSON.parse(` call (P5 membership, no callee classification). For the
// await, a same-line `.catch(` handler is treated as inline-handled; a synchronous JSON.parse is guarded ONLY by a
// try (never `.catch`).
//   • `await` here means `await` of a CALL EXPRESSION — `await <dotted-ident>(` (e.g. `await fetch(`, `await res.text(`,
//     `await store.put(`). This is the precision gate that both targets the risky IO/network/async call AND keeps the
//     bare word "await" in PROSE / an "unguarded-await" heading from matching (a bare word is not `await ident(`).
//     A documented false-NEGATIVE: `await bareVariable` (no call), `await (expr)`, `await arr[0].m()` are not matched.
//     A documented false-POSITIVE (family idiom, backticks unmasked): a literal `await ident(` / `JSON.parse(` written
//     inside PROSE or a template literal is read as code — the fixtures deliberately avoid writing those literally.
const AWAIT_RE = /\bawait\s+[\w$.]+\s*\(/g;
const JSONPARSE_RE = /\bJSON\s*\.\s*parse\s*\(/g;
const HANDLED_RE = /\.\s*catch\s*\(/;

// SUPPRESSION read: the same-line `.catch` exclusion runs over `maskedForSuppression` lines (template interiors
// blanked) — NOT `masked` — so a backtick `.catch(` in string text can never MANUFACTURE same-line handling that
// silences a real unguarded await (P2; see maskTemplateInteriors). Line numbers are identical (newlines preserved).
const maskedForSuppressionLines = maskedForSuppression.split("\n");

// Dedup-key separator: the NUL byte. Built via `fromCharCode` so the SOURCE stays printable ASCII — the
// convention pharn/floor/merge-findings.mjs states at its own NUL constant. A RAW NUL byte here makes the
// file read as BINARY to line-oriented tooling — MEASURED, not assumed: with the byte present,
// `grep "const key" <this file>` printed nothing and exited 1 although the string was in the bytes.
// That silent miss is how two raw NULs survived here. (`git diff` is NOT reliably a second detector:
// it sniffs only the first ~8000 bytes, and these sat at 18809, so it rendered the hunk as text.)
// NOT load-bearing for collision-safety, and saying so matters (P0): `line` is an integer and `kind` is one
// of two internal literals, so the key is unambiguous with or without a separator. The separator is
// defensive. What the convention covers is exactly this ONE BYTE staying out of the source — it is NOT a
// claim that the source is printable ASCII, and no check here establishes that broader property.
const NUL = String.fromCharCode(0);
const seen = new Set(); // dedup key `${line}${NUL}${kind}`
const hits = [];
function consider(p, kind, applyCatch) {
  if (guarded(p)) return;
  const line = lineAt(masked, p);
  if (applyCatch && HANDLED_RE.test(maskedForSuppressionLines[line - 1] ?? "")) return; // same-line .catch → handled (await only)
  const key = `${line}${NUL}${kind}`;
  if (seen.has(key)) return;
  seen.add(key);
  hits.push({ line, kind });
}

let m;
while ((m = AWAIT_RE.exec(masked)) !== null) consider(m.index, "unguarded-await", true);
while ((m = JSONPARSE_RE.exec(masked)) !== null) consider(m.index, "unguarded-json-parse", false);

hits.sort((a, b) => a.line - b.line || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));

process.stdout.write(JSON.stringify({ found: hits.length > 0, hits }) + "\n");
process.exit(0);
