#!/usr/bin/env node
// pharn/floor/scan-code-missing-await.mjs — deterministic FLOATING-UNAWAITED-ASYNC-CALL scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-off-by-one.mjs / scan-code-null-deref.mjs / scan-code-resource-leak.mjs in the
// scan-code-* family. It backs the `missing-await` LENS's FLOOR sub-check (pharn-review/missing-await/): does the file
// contain a FLOATING, STATEMENT-POSITION, UNAWAITED call to a function the SAME FILE declares `async`
// (e.g. `async function loadUser(){…}` … then a bare `loadUser(req.id);` statement — the Promise is discarded, not
// awaited)? Detection is a FIXED, non-LLM, TWO-PASS procedure over MASKED text:
//   PASS 1 (roster): collect the set of names this file declares async — `async function NAME(` and `NAME = async`.
//   PASS 2 (hits):   flag a physical line whose FIRST non-whitespace token is a call `NAME(` to a ROSTER name, that is
//                    NOT `await`/`return`/`=`-prefixed (guaranteed by the statement-head anchor) and NOT handled by a
//                    `.then`/`.catch`/`.finally` on that same line.
// It reduces to ARCHITECTURE §2 primitive #3 (regex / pattern match).
//
// THE GUARANTEE IS A LITERAL PATTERN MATCH, NOT A HASH and NOT SEMANTICS (P0 precision). There is NO hashing, NO intent
// analysis, and NO symbol table beyond the file's own `async` declarations. The floor primitive is a regex/substring
// match over masked text (#3), full stop. The ROSTER gate is what makes this "missing await" (a call to a KNOWN-async
// callee) rather than "any floating statement call" — precision, not judgment.
//
// HONEST BOUND (the off-by-one / null-deref precedent, P0): this detects the floating-unawaited-async-call SHAPE. It does
// NOT decide whether that missing await IS a bug — a discarded Promise is sometimes deliberate fire-and-forget. "This line
// is a statement-position call to a same-file async-declared function, not awaited" is a real guarantee; "this is a
// missing-await bug" / "the code is async-correct" is NOT. That judgment is the LENS's ADVISORY layer (Layer 2) — NOT this floor.
//
// Documented FALSE-NEGATIVES / scope (honest, stated not hidden — v0.1.0, the whole point is to not oversell):
//   • SAME-FILE async roster ONLY. An IMPORTED async function, or any callee whose `async` declaration is in another
//     file, is NOT in the roster → not flagged. Cross-file is OUT OF SCOPE — a FUTURE increment (P7).
//   • DECLARATION FORMS: only `async function NAME(` and `NAME = async` (arrow/function-expr assigned). An async METHOD
//     shorthand (`async m(){}` in a class/object) and an `async` IIFE are NOT rostered — documented false-negatives.
//   • STATEMENT-HEAD ONLY: the call must be the FIRST non-whitespace token on its physical line (`^\s*NAME(`). A roster
//     call NOT at line-start — `if (x) loadUser();`, `} loadUser();`, `a; loadUser();` — EVADES detection (false-negative).
//     This same anchor is what makes `await loadUser()`, `return loadUser()`, and `const p = loadUser()` NOT hits (the line
//     starts with `await`/`return`/`const`, not the callee) — the intended precision, not a bug.
//   • HANDLED PROMISES: a line carrying a `.then(`/`.catch(`/`.finally(` handler is treated as handled and NOT flagged. The
//     exclusion is SAME-LINE only, so a handler chained on the NEXT physical line (a multi-line `.then`) is still flagged —
//     a documented false-POSITIVE, the honest price of a line-oriented scan (cf. off-by-one's backtick false-positive).
//   • ASSIGNED-THEN-UNAWAITED: `const p = loadUser(); use(p)` (the result is captured then used without await) is NOT the
//     statement-head bare shape → not flagged. OUT OF SCOPE.
//   • BACKTICKS ARE NOT MASKED (family idiom; robust over a MARKDOWN eval fixture), so an `async function NAME(` / a
//     `NAME(` statement inside a template-literal's TEXT is read as code — a documented false-POSITIVE, and (because the
//     scanner runs over the .md fixture directly) any roster-triggering pattern in fixture PROSE can enter the roster.
//   • SINGLE-FILE; JS/TS-ish shapes. No scope/shadowing analysis (a same-file `async function fetch` shadowed by a local
//     sync `fetch` is flagged coarsely). The lens applies this per file.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the roster AND the hits are computed over the MASKED code only, with comments/
// strings mechanically stripped to spaces BEFORE matching. A comment CLAIMING "loadUser() here is fire-and-forget — do not
// flag" is masked away and cannot SUPPRESS a real floating hit; a comment CLAIMING "should call loadUser()" over code that
// awaits is masked away and cannot MANUFACTURE one. No free text moves the verdict — the trust-fence discipline.
// (See the ★ tests in scan-code-missing-await.test.mjs — they are the whole reason this is FLOOR.)
//
// MULTI-LINE MASKING PRESERVES LINE COUNT (P5): the mask replaces comment/string characters with spaces but PRESERVES
// newlines, so a /* block comment */ spanning lines leaves those physical lines in place (blanked) — 1-based line
// numbers map 1:1.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the scan-code-* family: a missing / non-file
// target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean". A readable file with no floating-async
// shape (empty, prose, or clean code) is a SUCCESSFUL scan → {"found":false,"hits":[]} on stdout, exit 0.
//
// Usage:  node pharn/floor/scan-code-missing-await.mjs <code-file>
//         node pharn/floor/scan-code-missing-await.mjs --files <nul-separated-list | ->   (review-fanout: the batch
//         mode /pharn-review's prefilter spawns once per review — one {"results":[…]} document, one entry per listed
//         path, each the per-file verdict below; pharn/floor/code-scanner-cli.mjs owns both modes)
// Output: {"found":<bool>,"hits":[{"line":<int>,"name":"<callee>"}]} on stdout; exit 0 on a successful scan (whatever the
//         result). `line` = the 1-based ORIGINAL line of the floating call; `name` = the roster callee (CODE text —
//         untrusted; the LENS renders it only in free-text evidence, never an enum-gated field). `found` === hits.length > 0.
//         hits sorted by line, then name. Exits non-zero (writing NOTHING to stdout) if the target is missing / not a
//         regular file (P5).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Verbatim reuse of the scan-code-off-by-one.mjs / scan-code-null-deref.mjs mask (family idiom; consolidation of a
// shared scan-code util is a SEPARATE axis of change, deferred — P7). Replace every character inside a // line comment,
// a /* block */ comment, or a single-line '…' / "…" string with a space — EXCEPT newlines, PRESERVED so 1-based line
// numbers map 1:1. BACKTICKS are NOT string delimiters here (no template masking); '…'/"…" masking STOPS AT END-OF-LINE
// so a stray prose quote cannot bleed the mask into fenced code below it.
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

/**
 * The hits for one file's text. Keeps nothing between calls: the two passes, their `g` regexes and the roster are
 * all created inside this function, once per file.
 */
export function scanText(text) {
  const masked = mask(text);

  // --- PASS 1: the same-file ASYNC ROSTER (FIXED regexes — P5) -------------------------------------------------
  // Collect the set of identifier names this file declares async, over the MASKED text:
  //   • `async function NAME(`               — an async function DECLARATION (`\basync\s+function\s+NAME`)
  //   • `NAME = async`                       — an arrow / function-expression assigned async (`NAME\s*=\s*async\b`),
  //                                            covering `const/let/var NAME = async (…) => …`. `\basync\b` word-bounded, so
  //                                            `= asyncHelper` (identifier merely starting with "async") does NOT register.
  // Pure membership set; no judgment. An async METHOD shorthand (`async m(){}`) and an async IIFE are intentionally NOT
  // rostered (documented scope). The roster is the PRECISION gate that distinguishes "missing await" from "any floating call".
  const ROSTER_DECL_RE = /\basync\s+function\s+([A-Za-z_$][\w$]*)/g;
  const ROSTER_ASSIGN_RE = /\b([A-Za-z_$][\w$]*)\s*=\s*async\b/g;

  const roster = new Set();
  for (const re of [ROSTER_DECL_RE, ROSTER_ASSIGN_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(masked)) !== null) roster.add(m[1]);
  }

  // --- PASS 2: floating STATEMENT-HEAD call to a roster name (FIXED regexes — P5) ------------------------------
  // A hit = a physical line whose FIRST non-whitespace token is a call `NAME(` where NAME ∈ roster, AND the line does not
  // carry a `.then(`/`.catch(`/`.finally(` handler (same-line handled-promise exclusion). The statement-head anchor
  // `^\s*NAME(` is what excludes `await NAME(`, `return NAME(`, and `const x = NAME(` (those lines start with the
  // keyword/declarator, not the callee) — the intended precision. `name` is the CODE-derived callee (untrusted; surfaced
  // only into the lens's free-text evidence, never an enum-gated field).
  const HEAD_CALL_RE = /^\s*([A-Za-z_$][\w$]*)\s*\(/;
  const HANDLED_RE = /\.\s*(?:then|catch|finally)\s*\(/;

  const maskedLines = masked.split("\n");
  const hits = [];
  for (let k = 0; k < maskedLines.length; k++) {
    const line = maskedLines[k];
    const m = HEAD_CALL_RE.exec(line);
    if (!m) continue;
    const name = m[1];
    if (!roster.has(name)) continue; // roster gate — the precision that makes this "missing await"
    if (HANDLED_RE.test(line)) continue; // a .then/.catch/.finally handler on the line → treated as handled (same-line only)
    hits.push({ line: k + 1, name });
  }

  hits.sort((a, b) => a.line - b.line || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-missing-await", scanText, process.argv.slice(2));
