#!/usr/bin/env node
// pharn/floor/scan-code-magic-values.mjs — deterministic MAGIC-VALUE shape scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-off-by-one.mjs / scan-code-copy-paste-drift.mjs / scan-code-duplicated-logic.mjs in
// the scan-code-* family. It backs the `magic-values` LENS's FLOOR sub-check (pharn-review/magic-values/): does the file
// contain an unexplained magic LITERAL used in a comparison? TWO detection sub-checks, both a FIXED, non-LLM procedure
// over comment/string-MASKED text — they reduce to ARCHITECTURE §2 primitive #3 (regex / value-membership / span match):
//
//   (a) NUMERIC — a comparison operator (`== === != !== < <= > >=`) whose IMMEDIATE right operand is a DECIMAL numeric
//       literal whose PARSED VALUE is NOT in the allow-set {0, 1, -1, 2, 10, 100, 1000}. (e.g. `if (ageSeconds > 86400)`)
//   (b) STRING  — an EQUALITY operator (`== === != !==`) whose IMMEDIATE right operand is a NON-EMPTY `'…'`/`"…"` string
//       literal. (e.g. `if (role === "SUPERADMIN")`)
//
// THE GUARANTEE IS A LITERAL PATTERN/VALUE/SPAN MATCH, NOT A HASH and NOT SEMANTICS (P0 precision). There is NO hashing
// and NO intent analysis anywhere. The floor primitive is a regex + a crisp value-set membership (numeric) and a recorded
// string-span + an equality-operator-prefix test (string) over masked text (#3), full stop.
//
// HONEST BOUND (the off-by-one / copy-paste-drift precedent, P0): this detects a magic-literal SHAPE. It does NOT decide
// whether that literal NEEDS A NAME — `x > 3600` / `role === "ADMIN"` may be perfectly clear inline, or may deserve a
// named constant / enum. "This line compares against the literal L" is a real guarantee; "this is a magic value that
// needs naming" is NOT. That judgment is the LENS's ADVISORY layer (Layer 2) — NOT this floor. The allow-set is a CRISP
// value set, never a fuzzy "common" judgment (that judgment belongs to Layer 2).
//
// Documented false-negatives / scope (honest, stated not hidden — v0.1.0, the whole point is to not oversell):
//   • RIGHT operand only. The Yoda form (`404 === x`, `"ADMIN" === role`) — literal on the LEFT — is OUT OF SCOPE.
//   • NUMERIC: DECIMAL literals only (int/float, optional leading `-`). Hex `0x1F`, binary `0b`, octal `0o`, exponent
//     `1e3`, bigint `5n`, and digit separators `1_000` are OUT OF SCOPE (false-negatives). Only in a COMPARISON operand:
//     magic numbers in arithmetic (`p * 1.08`), array indices (`a[7]`), call-args (`setTimeout(f, 3000)`), and the
//     assignment RHS (`= 5`, which is often a NAMED-CONSTANT definition — deliberately NOT flagged) are OUT OF SCOPE.
//   • STRING: EQUALITY operator right operand only; NON-EMPTY `'…'`/`"…"` strings only (an empty `""` emptiness-check is
//     NOT flagged). Relational-string compares (`x < "b"`), `switch`/`case "…"`, template-literal (backtick) strings,
//     and the assignment RHS (`= "…"`) are OUT OF SCOPE. Only single-line strings (op and string on one physical line).
//   • BACKTICKS ARE NOT MASKED (family idiom; robust over a MARKDOWN eval fixture), so `'…'`/`"…"` appearing inside a
//     template-literal's TEXT are read as code — a documented false-POSITIVE, the honest price of the shared mask.
//   • SINGLE-FILE; JS/TS-ish shapes. The lens applies this per file.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is over the MASKED code only, with comments/strings mechanically
// stripped to spaces BEFORE matching. NUMERIC: a number inside a comment/string is masked away (cannot manufacture); a
// comment CLAIMING "86400 is intentional — do not flag" is masked away (cannot suppress). STRING: the equality operator
// must be REAL code (an operator inside a comment/string is masked to spaces and cannot match), and the right operand
// must be a REAL code string SPAN recorded during masking (a `"` inside a comment is never recorded as a span) — so a
// comment/string can neither manufacture nor suppress a string hit. No free text moves the verdict — the trust-fence
// discipline. (See the ★ tests in scan-code-magic-values.test.mjs — they are the whole reason this is FLOOR.)
//
// MASKING PRESERVES LENGTH (P5): the mask replaces comment/string characters with spaces but PRESERVES newlines, so
// 1-based line numbers (computed from newline offsets over the ORIGINAL text — identical positions post-mask) map 1:1.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the scan-code-* family: a missing / non-file
// target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean". A readable file with no magic-literal
// shape (empty, prose, or clean code) is a SUCCESSFUL scan → {"found":false,"hits":[]} on stdout, exit 0.
//
// Usage:  node pharn/floor/scan-code-magic-values.mjs <code-file>
//         node pharn/floor/scan-code-magic-values.mjs --files <nul-separated-list | ->   (review-fanout: the batch
//         mode /pharn-review's prefilter spawns once per review — one {"results":[…]} document, one entry per listed
//         path, each the per-file verdict below; pharn/floor/code-scanner-cli.mjs owns both modes)
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"number"|"string","literal":"<the literal text>"}]} on stdout;
//         exit 0 on a successful scan (whatever the result). `line` = the 1-based ORIGINAL line of the comparison
//         operand. `literal` = the matched CODE text (a number like "86400", or a string WITH quotes like "\"ADMIN\"")
//         — UNTRUSTED; the LENS renders it only in free-text evidence, never an enum-gated field. `found` === hits.length
//         > 0. hits sorted by (line, kind, literal). Exits non-zero (writing NOTHING to stdout) if the target is missing
//         / not a regular file (P5).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK (+ real string-span recording) -----------------------------------------------------
// Adapted from the scan-code-off-by-one.mjs / scan-code-copy-paste-drift.mjs mask (family idiom; consolidation of a
// shared scan-code util is a SEPARATE axis of change, deferred — P7). Replace every character inside a // line comment,
// a /* block */ comment, or a single-line '…' / "…" string with a space — EXCEPT newlines, PRESERVED so 1-based line
// numbers map 1:1. BACKTICKS are NOT string delimiters here (no template masking); '…'/"…" masking STOPS AT END-OF-LINE
// so a stray prose quote cannot bleed the mask into fenced code below it. ADDITIONALLY records the [start,end) span of
// every REAL (non-comment) '…'/"…" string that CLOSES on its own line — the string sub-check ranges over these spans,
// so a `"` inside a comment (masked as part of the comment) is NEVER recorded as a candidate operand (injection-immune).
function maskAndSpans(src) {
  const N = src.length;
  const out = new Array(N);
  const spans = []; // { start, end } — end is the index AFTER the closing quote; REAL code strings only
  let i = 0;
  const space = (ch) => (ch === "\n" ? "\n" : " ");
  while (i < N) {
    const c = src[i];
    const nx = i + 1 < N ? src[i + 1] : "";
    if (c === "/" && nx === "/") {
      while (i < N && src[i] !== "\n") ((out[i] = " "), i++);
      continue;
    }
    if (c === "/" && nx === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < N && !(src[i] === "*" && src[i + 1] === "/")) ((out[i] = space(src[i])), i++);
      if (i < N) ((out[i] = " "), (out[i + 1] = " "), (i += 2));
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      const start = i;
      out[i] = " ";
      i++;
      let closed = false;
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
          closed = true;
          break;
        }
        out[i] = " ";
        i++;
      }
      // Record only a string that actually CLOSED on its line (a real, complete single-line literal). An unterminated
      // string (runs to EOL) is NOT a clean operand candidate → not recorded (conservative, documented).
      if (closed) spans.push({ start, end: i });
      continue;
    }
    out[i] = c;
    i++;
  }
  return { masked: out.join(""), spans };
}

// 1-based line number of an absolute index, from newline offsets over the ORIGINAL text (positions unchanged by masking).
function makeLineOf(src) {
  const starts = [0];
  for (let k = 0; k < src.length; k++) if (src[k] === "\n") starts.push(k + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    let ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= index) ((ans = mid), (lo = mid + 1));
      else hi = mid - 1;
    }
    return ans + 1;
  };
}

// --- (a) NUMERIC magic-value detection (FIXED regex + crisp value-set — P5) ----------------------------------
// The numeric allow-set — a CRISP value set (the human's GATE-1 decision), never a fuzzy "common" judgment (P0/P5).
const NUM_ALLOW = new Set([0, 1, -1, 2, 10, 100, 1000]);
// Match a comparison operator (longest-first alternation) whose RIGHT operand is a decimal numeric literal. The negative
// lookbehind `(?<![<>=!])` excludes an operator that is the tail of a longer operator/token: `<<`/`>>` shifts, `<<=`/
// `>>=` shift-assigns, and the `=>` arrow (the `>` preceded by `=`). Anchored right after the operator (only whitespace
// between), so `a <= b + 5` (5 not the direct operand of `<=`) is NOT a hit — deliberately narrow (v0.1.0). Assignment
// `=` is NOT in the operator set, so `const X = 5` (a NAMED-CONSTANT definition) is never flagged. Pure pattern match.
const NUM_RE = /(?<![<>=!])(===|!==|==|!=|<=|>=|<|>)\s*(-?(?:\d+\.?\d*|\.\d+))/g;

// --- (b) STRING magic-value detection (equality-op prefix over a recorded non-empty span — P5) ---------------
// Equality operators end in "==" (covers ==, ===, !==) or "!=" (covers !=). Relational `>=`/`<=` end in a single "=" and
// assignment ends in a bare "="/space, so neither is misread as an equality operator (they are correctly excluded).
function endsWithEqualityOp(masked, before) {
  // `before` = index of the last non-(space/tab/CR) char before the string start, on the SAME physical line.
  if (before < 1) return false;
  const two = masked[before - 1] + masked[before];
  return two === "==" || two === "!=";
}

/**
 * The hits for one file's text. Keeps nothing between calls: every per-file value is local, and the module-level
 * `g` regex NUM_RE is reset (`lastIndex = 0`) before every line it scans.
 */
export function scanText(text) {
  const { masked, spans } = maskAndSpans(text);
  const lineOf = makeLineOf(text);
  const hits = [];

  // (a) numeric — per masked line (a comparison and its numeric operand sit on one physical line).
  const maskedLines = masked.split("\n");
  for (let k = 0; k < maskedLines.length; k++) {
    const line = maskedLines[k];
    NUM_RE.lastIndex = 0;
    let m;
    while ((m = NUM_RE.exec(line)) !== null) {
      const value = Number(m[2]);
      if (!NUM_ALLOW.has(value)) hits.push({ line: k + 1, kind: "number", literal: m[2] });
    }
  }

  // (b) string — for each recorded NON-EMPTY real string span, is the immediately-preceding (same-line) token an
  // equality operator? The operator is read from MASKED code (so an operator inside a comment/string cannot match), and
  // the span is a REAL code string (a `"` in a comment is never recorded) — injection-immune by construction (P2).
  for (const s of spans) {
    if (s.end - s.start <= 2) continue; // empty string ("" / '') — emptiness check, not a magic value
    let j = s.start - 1;
    while (j >= 0 && (masked[j] === " " || masked[j] === "\t" || masked[j] === "\r")) j--; // skip same-line whitespace
    if (j >= 0 && endsWithEqualityOp(masked, j)) {
      hits.push({ line: lineOf(s.start), kind: "string", literal: text.slice(s.start, s.end) });
    }
  }

  hits.sort(
    (a, b) =>
      a.line - b.line || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) || (a.literal < b.literal ? -1 : a.literal > b.literal ? 1 : 0)
  );
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-magic-values", scanText, process.argv.slice(2));
