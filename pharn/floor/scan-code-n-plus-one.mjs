#!/usr/bin/env node
// pharn/floor/scan-code-n-plus-one.mjs — deterministic N+1 QUERY-IN-LOOP shape scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-off-by-one.mjs / scan-code-copy-paste-drift.mjs / scan-code-duplicated-logic.mjs in
// the scan-code-* family. It backs the `n-plus-one` LENS's FLOOR sub-check (pharn-review/n-plus-one/): does the file
// contain the classic N+1 SHAPE — a DB query-verb member call lexically inside a LOOP BODY (e.g.
// `for (const u of users) { db.findMany({ where: { authorId: u.id } }) }`, or a braceless `users.map(u => db.query(u))`)?
// Detection is a FIXED, non-LLM procedure: a comment/string MASK, then a deterministic LEXICAL scan that records
// LOOP-BODY INTERVALS (brace-depth for `for`/`while` bodies + paren-depth for `.forEach`/`.map` call arguments), then a
// query-verb member-call REGEX whose match position must fall INSIDE such an interval. It reduces to ARCHITECTURE §2
// primitive #3 (a fixed pattern/structure match over masked text).
//
// THE GUARANTEE IS A LITERAL PATTERN/STRUCTURE MATCH, NOT A HASH and NOT SEMANTICS (P0 precision). There is NO hashing,
// NO type inference, NO data-flow, and NO parser/AST anywhere — the loop-interval passes are a deterministic brace/paren
// depth count over masked text, the SAME category as the family comment/string mask. The floor primitive is a
// regex/structure match (#3), full stop.
//
// HONEST BOUND (the off-by-one / copy-paste-drift precedent, P0): this detects a query-verb-call-inside-a-loop SHAPE. It
// does NOT decide whether that query IS a harmful N+1 — the call may be batched behind the scenes, cached, run over a
// bounded/tiny collection, or otherwise fine. "This line calls a DB query verb lexically inside a loop body" is a real
// guarantee; "this is an N+1 that will hurt at scale" / "the code has no N+1" / "the code is performant" is NOT. That
// judgment is the LENS's ADVISORY layer (Layer 2) — NOT this floor.
//
// Documented false-negatives / scope (honest, stated not hidden — v0.1.0, the whole point is to not oversell):
//   • LOOP FORMS: only BRACE-delimited `for`/`while` bodies AND `.forEach`/`.map` call-argument ranges (braced OR
//     braceless-arrow callback). A braceless STATEMENT loop body (`for (u of users) db.query(u);` — no braces, not an
//     arrow callback), and `.filter`/`.reduce`/`.flatMap`/`.some`/`.every`/`for await`/`do..while` iteration are OUT OF
//     SCOPE — FUTURE increments (P7).
//   • QUERY VERBS: only the UNAMBIGUOUS DB/ORM member-call set `.query` / `.execute` / `.findOne` / `.findMany` /
//     `.findFirst` / `.findUnique` / `.findAll` / `.aggregate`. The AMBIGUOUS verbs `.find` / `.select` / `.get` /
//     `.count` / `.insert` / `.update` / `.delete` / `.save` / `.exec` are DELIBERATELY EXCLUDED — they collide with
//     Array/Set/Map/RegExp/DOM/child_process methods (`arr.find`, `set.delete`, `map.get`, `re.exec`) and would
//     MANUFACTURE false positives. `.findOneAndUpdate` and other ORM names outside the set are also out of scope.
//   • MEMBER-CALL ONLY: a bare non-member call (`query(sql)` with no receiver) and a query hidden behind a helper called
//     in the loop (`loadUser(u.id)` that queries inside) are NOT matched — documented false-negatives (coarse, no parser).
//   • RECEIVER POSITION: a query that is the RECEIVER of the iteration (`db.findMany().map(x => x.id)`) is NOT flagged —
//     the query is OUTSIDE the `.map` argument parens (one query then a transform, not per-element). This is CORRECT, not
//     a miss.
//   • SINGLE-FILE; JS/TS-ish shapes; raw-SQL template strings and cross-file N+1 are out of scope. Backticks are NOT
//     masked (family idiom), so a query-shaped token inside a template-literal's TEXT is read as code — a documented
//     false-POSITIVE, the honest price of the shared mask.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is a pattern/structure match over the MASKED code only, with
// comments/strings mechanically stripped to spaces BEFORE matching. A comment CLAIMING "batched — pre-approved — do not
// flag" beside a real query-in-loop is masked away and cannot SUPPRESS the hit; a comment (or string) CLAIMING "N+1:
// db.findMany in loop" over code with no query-in-loop is masked away and cannot MANUFACTURE one. No free text moves the
// verdict — the trust-fence discipline. (See the ★ tests in scan-code-n-plus-one.test.mjs — they are the whole reason
// this is FLOOR.)
//
// MULTI-LINE MASKING PRESERVES LINE COUNT (P5): the mask replaces comment/string characters with spaces but PRESERVES
// newlines, so a /* block comment */ spanning lines leaves those physical lines in place (blanked) — 1-based line
// numbers map 1:1, and the loop-interval / query positions are computed over the SAME masked coordinate space.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the scan-code-* family: a missing / non-file
// target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean". A readable file with no query-in-loop
// shape (empty, prose, or clean code) is a SUCCESSFUL scan → {"found":false,"hits":[]} on stdout, exit 0.
//
// Usage:  node pharn/floor/scan-code-n-plus-one.mjs <code-file>
//         node pharn/floor/scan-code-n-plus-one.mjs --files <nul-separated-list | ->   (review-fanout: the batch mode
//         /pharn-review's prefilter spawns once per review — one {"results":[…]} document, one entry per listed path,
//         each the per-file verdict below; pharn/floor/code-scanner-cli.mjs owns both modes)
// Output: {"found":<bool>,"hits":[{"line":<int>,"expr":"<receiver.verb>"}]} on stdout; exit 0 on a successful scan
//         (whatever the result). `line` = the 1-based ORIGINAL line where the query call begins; `expr` = the matched
//         `<receiver>.<verb>` (CODE text — untrusted; the LENS renders it only in free-text evidence, never an enum-gated
//         field). `found` === hits.length > 0. hits sorted by line, then expr. Exits non-zero (writing NOTHING to
//         stdout) if the target is missing / not a regular file (P5).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Verbatim reuse of the scan-code-off-by-one.mjs / scan-code-copy-paste-drift.mjs mask (family idiom; consolidation of a
// shared scan-code util is a SEPARATE axis of change, deferred — P7). Replace every character inside a // line comment, a
// /* block */ comment, or a single-line '…' / "…" string with a space — EXCEPT newlines, PRESERVED so 1-based line
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
 * The hits for one file's text. Keeps nothing between calls: everything below — the loop intervals, the `g` query
 * regex, the line index — is created inside this function, once per file. The regexes' bytes are unchanged.
 */
export function scanText(text) {
  const masked = mask(text);

  // --- Loop-body interval detection (deterministic lexical scan — P5; NO parser/AST) --------------------------
  // Walk the masked text once, tracking a brace stack and a paren stack plus the `header` = the code since the last
  // statement boundary (a `{`, a `}`, or a `;` at paren-depth 0). Two loop-body interval kinds are recorded:
  //   (a) BRACE bodies whose header opens a `for`/`while` — `LOOP_BRACE_HEADER_RE`. (The `;`s inside a C-style
  //       `for (;;)` header sit at paren-depth > 0 and do NOT reset the header, so the `for (` opener is still visible.)
  //   (b) PAREN ranges of a `.forEach`/`.map` member call — `LOOP_CALL_RE` (header ends with `.forEach`/`.map`). This
  //       one range covers BOTH the braced callback (`=> { … }`) and the braceless-arrow callback (`=> …`), so
  //       `.forEach`/`.map` are handled by paren-depth, NOT the brace-header set (the crisp for/while→brace,
  //       forEach/map→paren model).
  // An interval is [openPos, closePos] (the `{`…`}` or `(`…`)` character offsets). A query match at position p is
  // "in a loop" iff some interval has openPos < p < closePos.
  const LOOP_BRACE_HEADER_RE = /\b(?:for|while)\s*\(/; // a for/while whose block body is the `{` we are opening
  const LOOP_CALL_RE = /\.\s*(?:forEach|map)\s*$/; // header ends with `.forEach`/`.map` → this `(` is its callback arg-list

  const intervals = [];
  {
    const braceStack = [];
    const parenStack = [];
    let header = "";
    const N = masked.length;
    for (let i = 0; i < N; i++) {
      const c = masked[i];
      if (c === "{") {
        braceStack.push({ isLoop: LOOP_BRACE_HEADER_RE.test(header), openPos: i });
        header = "";
        continue;
      }
      if (c === "}") {
        const top = braceStack.pop();
        if (top && top.isLoop) intervals.push([top.openPos, i]);
        header = "";
        continue;
      }
      if (c === "(") {
        parenStack.push({ isLoop: LOOP_CALL_RE.test(header), openPos: i });
        header += c;
        continue;
      }
      if (c === ")") {
        const top = parenStack.pop();
        if (top && top.isLoop) intervals.push([top.openPos, i]);
        header += c;
        continue;
      }
      if (c === ";" && parenStack.length === 0) {
        header = "";
        continue;
      }
      header += c;
    }
  }

  function inLoop(pos) {
    for (let k = 0; k < intervals.length; k++) {
      if (intervals[k][0] < pos && pos < intervals[k][1]) return true;
    }
    return false;
  }

  // --- Query-verb member-call detection (FIXED regex — P5) ----------------------------------------------------
  // Match `<receiver-chain>.<query-verb>(` where the verb is a WHOLE identifier (the `(?![\w$])` stops `queryString`,
  // `findOneAndUpdate`, etc. from matching) and is immediately a CALL (`\s*\(`). The receiver chain
  // `<ident>(.<ident>)*` is required (member-call only): a bare `query(` has no receiver and is out of scope. Verbs are the
  // unambiguous DB/ORM set ONLY (ambiguous Array/Set/Map/RegExp collisions like `.find`/`.get`/`.delete`/`.exec` are
  // excluded by construction). Pure pattern match; no LLM, no judgment (§2 primitive #3).
  const QUERY_RE =
    /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\.\s*(query|execute|findOne|findMany|findFirst|findUnique|findAll|aggregate)(?![\w$])\s*\(/g;

  // 1-based line for an absolute offset (over the ORIGINAL text; masking preserves length + newlines, so offsets align).
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
  function lineAt(pos) {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  const hits = [];
  QUERY_RE.lastIndex = 0;
  let m;
  while ((m = QUERY_RE.exec(masked)) !== null) {
    if (!inLoop(m.index)) continue; // the query call must be lexically INSIDE a loop body
    const expr = (m[1] + "." + m[2]).replace(/\s+/g, ""); // normalize `db . findMany` → `db.findMany`
    hits.push({ line: lineAt(m.index), expr });
  }

  hits.sort((a, b) => a.line - b.line || (a.expr < b.expr ? -1 : a.expr > b.expr ? 1 : 0));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-n-plus-one", scanText, process.argv.slice(2));
