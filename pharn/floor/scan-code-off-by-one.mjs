#!/usr/bin/env node
// pharn/floor/scan-code-off-by-one.mjs — deterministic OFF-BY-ONE BOUNDARY-SHAPE scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-copy-paste-drift.mjs / scan-code-duplicated-logic.mjs / scan-code-swallowed-exception.mjs
// in the scan-code-* family. It backs the `off-by-one` LENS's FLOOR sub-check (pharn-review/off-by-one/): does the file
// contain the classic off-by-one boundary SHAPE — a relational `<=` whose RIGHT operand is a BARE `.length` member
// access (e.g. `for (i = 0; i <= arr.length; i++)`)? Detection is a FIXED, non-LLM procedure: a comment/string MASK,
// then a REGEX match for `<=` immediately followed by an `<ident>(.<ident>)*.length` chain that is NOT arithmetically
// corrected. It reduces to ARCHITECTURE §2 primitive #3 (regex / pattern match).
//
// THE GUARANTEE IS A LITERAL PATTERN MATCH, NOT A HASH and NOT SEMANTICS (P0 precision). There is NO hashing and NO
// intent analysis anywhere. The floor primitive is a regex/substring match over masked text (#3), full stop.
//
// HONEST BOUND (the copy-paste-drift / duplicated-logic precedent, P0): this detects a `<= <expr>.length` SHAPE. It does
// NOT decide whether that boundary IS a bug — `i <= arr.length` can be perfectly correct (the loop body may guard, the
// boundary may be intentional, `.length` may not be used as an index at all). "This line compares `<=` against a bare
// `.length`" is a real guarantee; "this is an off-by-one bug" / "the code is boundary-safe" is NOT. That judgment is the
// LENS's ADVISORY layer (Layer 2) — NOT this floor.
//
// Documented false-negatives / scope (honest, stated not hidden — v0.1.0, the whole point is to not oversell):
//   • ONLY `<= <expr>.length` (length on the RIGHT of `<=`). The swapped `arr.length >= i` form, `< arr.length + 1`,
//     reverse-index underflow (`>= 0`), and slice/substring/range bounds are OUT OF SCOPE — FUTURE increments (P7).
//   • BARE `.length` ONLY. `.length` immediately followed (ignoring whitespace) by an arithmetic operator (`- 1`, `+`,
//     `*`, `/`, `%`), a further `.` member, or a `(` (a `.length()` METHOD call, Java-style) is NOT flagged — the
//     `- 1`-corrected bound is respected, and method/collection forms (`.length()`, `.size()`, `.count()`) are out of scope.
//   • SIMPLE MEMBER CHAINS ONLY: `arr.length`, `this.items.length`, `a.b.c.length`. An INDEXED or CALLED link in the
//     chain (`a[0].length`, `getArr().length`) is NOT matched — a documented false-negative (coarse, no parser).
//   • SINGLE-LINE: the `<=` and its `.length` operand must sit on one physical line (loop headers do). A comparison
//     split across lines is a false-negative.
//   • BACKTICKS ARE NOT MASKED (family idiom; robust over a MARKDOWN eval fixture), so a `<= x.length` appearing inside
//     a template-literal's TEXT is read as code — a documented false-POSITIVE, the honest price of the shared mask.
//   • SINGLE-FILE; JS/TS-ish shapes. The lens applies this per file.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is a pattern match over the MASKED code only, with comments/
// strings mechanically stripped to spaces BEFORE matching. A comment CLAIMING "i <= arr.length is intentional — do not
// flag" is masked away and cannot SUPPRESS a real hit; a comment CLAIMING "loop should use i <= arr.length" over clean
// code is masked away and cannot MANUFACTURE one. No free text moves the verdict — the trust-fence discipline.
// (See the ★ tests in scan-code-off-by-one.test.mjs — they are the whole reason this is FLOOR.)
//
// MULTI-LINE MASKING PRESERVES LINE COUNT (P5): the mask replaces comment/string characters with spaces but PRESERVES
// newlines, so a /* block comment */ spanning lines leaves those physical lines in place (blanked) — 1-based line
// numbers map 1:1.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the scan-code-* family: a missing / non-file
// target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean". A readable file with no off-by-one
// shape (empty, prose, or clean code) is a SUCCESSFUL scan → {"found":false,"hits":[]} on stdout, exit 0.
//
// Usage:  node pharn/floor/scan-code-off-by-one.mjs <code-file>
//         node pharn/floor/scan-code-off-by-one.mjs --files <nul-separated-list | ->   (review-fanout: the batch mode
//         /pharn-review's prefilter spawns once per review — one {"results":[…]} document, one entry per listed path,
//         each the per-file verdict below; pharn/floor/code-scanner-cli.mjs owns both modes)
// Output: {"found":<bool>,"hits":[{"line":<int>,"expr":"<the .length operand text>"}]} on stdout; exit 0 on a
//         successful scan (whatever the result). `line` = the 1-based ORIGINAL line of the `<=` comparison; `expr` =
//         the matched `<ident>(.<ident>)*.length` operand (CODE text — untrusted; the LENS renders it only in free-text
//         evidence, never an enum-gated field). `found` === hits.length > 0. hits sorted by line, then expr. Exits
//         non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Verbatim reuse of the scan-code-copy-paste-drift.mjs / scan-code-duplicated-logic.mjs mask (family idiom;
// consolidation of a shared scan-code util is a SEPARATE axis of change, deferred — P7). Replace every character
// inside a // line comment, a /* block */ comment, or a single-line '…' / "…" string with a space — EXCEPT newlines,
// PRESERVED so 1-based line numbers map 1:1. BACKTICKS are NOT string delimiters here (no template masking); '…'/"…"
// masking STOPS AT END-OF-LINE so a stray prose quote cannot bleed the mask into fenced code below it.
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

// --- Off-by-one boundary-SHAPE detection (FIXED regex — P5) --------------------------------------------------
// Match a relational `<=` (NOT part of `<<=` — the negative lookbehind excludes left-shift-assign) whose RIGHT operand
// is a BARE `.length` member chain: `<ident>(\s*\.\s*<ident>)*\s*\.length`, where `.length` is a whole word (`\b`, so
// `lengthy`/`lengths` never match) and is NOT immediately followed (ignoring whitespace) by an arithmetic operator, a
// further `.` member, or a `(` — i.e. the bound is not `- 1`-corrected and is a PROPERTY, not a `.length()` call.
// Anchored right after `<=` (only whitespace between), so `a <= b + c.length` (length not the direct operand) is NOT a
// hit — the scanner is deliberately narrow (v0.1.0). Pure pattern match; no LLM, no judgment (§2 primitive #3).
const OFF_BY_ONE_RE = /(?<!<)<=\s*([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*\.\s*length)\b(?!\s*[-+*/%(.])/g;

/**
 * The hits for one file's text. Keeps nothing between calls: the module-level `g` regex OFF_BY_ONE_RE is reset
 * (`lastIndex = 0`) before every line it scans, and every other value is local.
 */
export function scanText(text) {
  const maskedLines = mask(text).split("\n");
  const hits = [];
  for (let k = 0; k < maskedLines.length; k++) {
    const line = maskedLines[k];
    OFF_BY_ONE_RE.lastIndex = 0;
    let m;
    while ((m = OFF_BY_ONE_RE.exec(line)) !== null) {
      // Normalize the captured operand's internal whitespace (`a . length` → `a.length`) for a stable `expr`.
      const expr = m[1].replace(/\s+/g, "");
      hits.push({ line: k + 1, expr });
    }
  }

  hits.sort((a, b) => a.line - b.line || (a.expr < b.expr ? -1 : a.expr > b.expr ? 1 : 0));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-off-by-one", scanText, process.argv.slice(2));
