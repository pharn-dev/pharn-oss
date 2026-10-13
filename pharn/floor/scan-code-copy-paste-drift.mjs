#!/usr/bin/env node
// pharn/floor/scan-code-copy-paste-drift.mjs — deterministic COPY-PASTE-DRIFT (odd-one-out) scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-duplicated-logic.mjs / scan-code-swallowed-exception.mjs / scan-code-injection.mjs
// in the scan-code-* family. It backs the `copy-paste-drift` LENS's FLOOR sub-check
// (pharn-review/copy-paste-drift/): does the file contain a run of >=3 CONSECUTIVE, structurally-aligned
// near-identical lines in which exactly ONE line diverges at a single token slot the others share — the classic
// copy-paste bug (pasted, forgot to update one spot)? Detection is a FIXED, non-LLM procedure: a comment/string
// MASK, a coarse per-line TOKENIZER, a structural-ALIGNMENT test (same skeleton), and an ODD-ONE-OUT test over the
// variable slots of each aligned run. It reduces to ARCHITECTURE §2 primitive #3 (token equality / membership).
//
// THE GUARANTEE IS TOKEN-EQUALITY, NOT A HASH (P0 precision). Alignment and the odd-one-out compare token strings by
// `===`; there is NO hashing anywhere. The floor primitive is text membership/equality (#3), full stop.
//
// HONEST BOUND (the injection / duplicated-logic precedent, P0): this detects an odd-one-out SHAPE among aligned
// repetitions. It does NOT decide whether the outlier IS a bug (the divergence may be intentional — a legitimate
// per-case difference), does NOT decide the majority is correct, and does NOT reason about intent/semantics.
// "Line L diverges from its >=2 aligned siblings at exactly one token slot they share" is a real guarantee;
// "this is a copy-paste bug" / "the code is drift-free" is NOT. That judgment is the LENS's ADVISORY layer (Layer 2)
// — NOT this floor.
//
// Documented false-negatives / scope (honest, stated not hidden — the whole point is to not oversell):
//   • MEMBER = ONE LINE (v0.1.0). A group is >=3 consecutive SIGNIFICANT lines sharing a skeleton. MULTI-LINE block
//     repetitions (a 4-line block pasted 3x with one drift) are NOT grouped here — a FUTURE increment (P7).
//   • >=3 MEMBERS REQUIRED. A 2-line near-identical pair that differs in one slot has NO majority (1-vs-1), so there
//     is no deterministic "odd-one-out" — it is the LENS's advisory-only zone, unflagged by this floor.
//   • SINGLE OUTLIER ONLY. A slot is flagged iff its k values are exactly (k-1) identical + 1 different. A slot where
//     all k differ (intended per-item variation) or all k are identical (a constant) is NOT flagged; a slot with two
//     distinct outliers (e.g. 2+2) is NOT a clean odd-one-out and is NOT flagged.
//   • CONSTANT-BACKGROUND ONLY. A CORRELATED-SLOT drift — where the drifted token co-varies with another varying slot
//     (e.g. MAX_X / MAX_Y / MAX_X while the axis suffix itself varies X/Y/Z) — is OUT OF SCOPE: the "majority" there
//     is the buggy value and odd-one-out would mis-rank it. NOT this floor; the LENS/human catches it.
//   • STRING/COMMENT CONTENT IS MASKED (for injection-immunity, below), so a drift that lives INSIDE a string literal
//     or a comment (e.g. "email" vs "phone") is INVISIBLE to this scanner — a documented false-negative, the honest
//     price of masking. Token drift in identifiers/numbers/operators is what this detects.
//   • COARSE TOKENIZER: identifiers/keywords, coarse numbers, and single-char punctuation. Exotic syntax may
//     mis-tokenize; alignment then simply fails (a false-negative), never a crash.
//   • SINGLE-FILE; JS/TS-ish token shapes. The lens applies this per file.
//
// TOKEN-KIND CLASSIFICATION IS PINNED (P5 — GRILL G3): a token is a VARIABLE SLOT iff it is an identifier (a word NOT
// in the fixed KEYWORDS set) OR a numeric literal; everything else (keywords, operators, punctuation) is STRUCTURAL.
// Two lines ALIGN iff same token count AND, at every position, both tokens are the same KIND and every STRUCTURAL
// token is byte-equal (slots may differ). This is pure membership — no judgment, no LLM.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is token-equality over the MASKED code only, with comments/
// strings mechanically stripped to spaces BEFORE tokenizing. A comment CLAIMING "these are intentionally identical,
// do not flag" is masked away and cannot suppress a real odd-one-out; a comment CLAIMING "drifted here" over aligned
// CONSISTENT lines cannot manufacture one. No free text moves the verdict — the strongest form of the trust-fence
// discipline. (See the ★ tests in scan-code-copy-paste-drift.test.mjs — they are the whole reason this is FLOOR.)
//
// MULTI-LINE MASKING PRESERVES LINE COUNT (P5 — GRILL G2): the mask replaces comment/string characters with spaces
// but PRESERVES newlines, so a /* block comment */ spanning lines leaves those physical lines in place (blanked) —
// 1-based line numbers map 1:1 and the "consecutive significant lines" grouping is never corrupted by a multi-line
// comment. BACKTICKS are NOT masked (family idiom; robust over a MARKDOWN eval fixture), so a multi-line template
// literal's content is tokenized as code — a documented bound, mirroring the sibling scanners.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the scan-code-* family: a missing /
// non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean". A readable file with no
// drift (empty, prose, or clean code) is a SUCCESSFUL scan → {"found":false,"hits":[]} on stdout, exit 0 (GRILL G4).
//
// Usage:  node pharn/floor/scan-code-copy-paste-drift.mjs <code-file>
//         node pharn/floor/scan-code-copy-paste-drift.mjs --files <nul-separated-list | ->   (review-fanout: the
//         batch mode /pharn-review's prefilter spawns once per review — one {"results":[…]} document, one entry
//         per listed path, each the per-file verdict below; pharn/floor/code-scanner-cli.mjs owns both modes)
// Output: {"found":<bool>,"hits":[{"lines":[<int>,...],"odd_line":<int>,"slot":<int>,"majority":"<tok>","outlier":"<tok>"}]}
//         on stdout; exit 0 on a successful scan (whatever the result). Each hit is one odd-one-out: `lines` = the
//         1-based ORIGINAL line numbers of the aligned group (ascending); `odd_line` = the divergent member's line;
//         `slot` = the 0-based token index of the diverging slot; `majority` / `outlier` = the shared / divergent
//         tokens (CODE text — untrusted; the LENS renders them only in free-text evidence). `found` === hits.length>0.
//         hits sorted by odd_line, then slot. Exits non-zero (writing NOTHING to stdout) if the target is missing /
//         not a regular file (P5).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

const MIN_MEMBERS = 3; // a group needs >=3 members for a majority-vs-outlier to exist (fixed, not model-chosen — P5)

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Verbatim reuse of the scan-code-duplicated-logic.mjs / scan-code-swallowed-exception.mjs mask (family idiom;
// consolidation of a shared scan-code util is a SEPARATE axis of change, deferred — P7; the irony of a copy-pasted
// mask inside a COPY-PASTE-drift scanner is acknowledged, not hidden). Replace every character inside a // line
// comment, a /* block */ comment, or a single-line '…' / "…" string with a space — EXCEPT newlines, PRESERVED so
// 1-based line numbers map 1:1 (GRILL G2). BACKTICKS are NOT string delimiters here (no template masking) so
// markdown fences / inline code are not read as unterminated templates; '…'/"…" masking STOPS AT END-OF-LINE so a
// stray prose quote cannot bleed the mask into fenced code below it.
function mask(src) {
  const out = new Array(src.length);
  let i = 0;
  const Nlen = src.length;
  const space = (ch) => (ch === "\n" ? "\n" : " ");
  while (i < Nlen) {
    const c = src[i];
    const n = i + 1 < Nlen ? src[i + 1] : "";
    if (c === "/" && n === "/") {
      while (i < Nlen && src[i] !== "\n") ((out[i] = " "), i++);
      continue;
    }
    if (c === "/" && n === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < Nlen && !(src[i] === "*" && src[i + 1] === "/")) ((out[i] = space(src[i])), i++);
      if (i < Nlen) ((out[i] = " "), (out[i + 1] = " "), (i += 2));
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      out[i] = " ";
      i++;
      while (i < Nlen && src[i] !== "\n") {
        if (src[i] === "\\") {
          out[i] = " ";
          if (i + 1 < Nlen && src[i + 1] !== "\n") ((out[i + 1] = " "), (i += 2));
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

// --- Significance filter (mirrors the family) ---------------------------------------------------------------
// A line participates only if, after trim + whitespace-collapse and removing structural punctuation `{}()[];,`, it
// still carries a real token — so a bare `}` / `});` / `{` never anchors or breaks a group. (P5 — fixed predicate.)
const STRUCTURAL_PUNCT = /[{}()[\];,\s]/g;
function normalize(line) {
  return line.trim().replace(/\s+/g, " ");
}
function isSignificant(norm) {
  return norm.replace(STRUCTURAL_PUNCT, "") !== "";
}

// --- Tokenizer + token-kind classification (PINNED — GRILL G3) ----------------------------------------------
// A coarse, deterministic tokenizer: an identifier/keyword word, a coarse numeric literal, or ONE punctuation char.
const TOKEN_RE = /[A-Za-z_$][A-Za-z0-9_$]*|\d[\d._]*|\S/g;
// Fixed JS/TS keyword set — a keyword is STRUCTURAL (part of the skeleton), never a variable slot (membership, P5).
const KEYWORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "return",
  "const",
  "let",
  "var",
  "function",
  "class",
  "new",
  "typeof",
  "instanceof",
  "in",
  "of",
  "await",
  "async",
  "yield",
  "throw",
  "try",
  "catch",
  "finally",
  "void",
  "delete",
  "this",
  "super",
  "null",
  "true",
  "false",
  "undefined",
  "import",
  "export",
  "from",
  "as",
  "extends",
  "implements",
  "interface",
  "type",
  "enum",
  "public",
  "private",
  "protected",
  "static",
  "readonly",
  "get",
  "set",
]);
function tokenize(maskedLine) {
  return maskedLine.match(TOKEN_RE) || [];
}
// A VARIABLE SLOT = an identifier (word not a keyword) OR a numeric literal; else STRUCTURAL.
function isSlot(tok) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(tok)) return !KEYWORDS.has(tok);
  if (/^\d[\d._]*$/.test(tok)) return true;
  return false;
}
// Two lines ALIGN iff same token count, same KIND at every position, and every STRUCTURAL token byte-equal.
function aligned(a, b) {
  if (a.length !== b.length || a.length === 0) return false;
  for (let p = 0; p < a.length; p++) {
    const sa = isSlot(a[p]);
    const sb = isSlot(b[p]);
    if (sa !== sb) return false;
    if (!sa && a[p] !== b[p]) return false;
  }
  return true;
}

/**
 * The hits for one file's text. Keeps nothing between calls: every per-file value is local, and the two module-level
 * `g` regexes are only used through `replace` / `match`, which reset `lastIndex` themselves.
 */
export function scanText(text) {
  // --- Build significant-line token arrays --------------------------------------------------------------------
  const maskedLines = mask(text).split("\n");
  const sig = []; // { line: <1-based original>, tokens: [...] }
  for (let k = 0; k < maskedLines.length; k++) {
    const norm = normalize(maskedLines[k]);
    if (!isSignificant(norm)) continue;
    sig.push({ line: k + 1, tokens: tokenize(maskedLines[k]) });
  }

  // --- Group consecutive aligned lines; odd-one-out per variable slot ------------------------------------------
  const hits = [];
  let start = 0;
  while (start < sig.length) {
    let end = start + 1;
    while (end < sig.length && aligned(sig[start].tokens, sig[end].tokens)) end++;
    const k = end - start;
    if (k >= MIN_MEMBERS) {
      const skeleton = sig[start].tokens;
      const groupLines = [];
      for (let m = start; m < end; m++) groupLines.push(sig[m].line);
      for (let p = 0; p < skeleton.length; p++) {
        if (!isSlot(skeleton[p])) continue;
        const counts = new Map();
        for (let m = start; m < end; m++) {
          const v = sig[m].tokens[p];
          counts.set(v, (counts.get(v) || 0) + 1);
        }
        // A clean odd-one-out: exactly two distinct values, one appearing exactly once (the outlier).
        if (counts.size !== 2) continue;
        let outlier = null;
        let majority = null;
        for (const [v, c] of counts) {
          if (c === 1) outlier = v;
          else majority = v;
        }
        if (outlier === null || majority === null) continue; // e.g. a 2+2 split has no count-1 value
        let oddLine = null;
        for (let m = start; m < end; m++) {
          if (sig[m].tokens[p] === outlier) {
            oddLine = sig[m].line;
            break;
          }
        }
        hits.push({ lines: groupLines.slice(), odd_line: oddLine, slot: p, majority, outlier });
      }
    }
    start = end; // end > start always (end started at start+1); non-overlapping runs
  }

  hits.sort((a, b) => a.odd_line - b.odd_line || a.slot - b.slot);
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-copy-paste-drift", scanText, process.argv.slice(2));
