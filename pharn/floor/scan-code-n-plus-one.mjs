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
// COST (6.65.1, TST-3 of the 2026-10-12 review): through 6.64.2 three steps were quadratic in the file — the query
// regex restarting along a long receiver chain (`a.`×10000, 20 KB: 1.1 s), the `.forEach`/`.map` header test re-run at
// every `(`, and the interval lookup per query hit. Each is now linear; the reasons sit beside the code ("COST" notes
// in scanText). "Linear" is the derived bound, measured on the ★ shapes in scan-code-n-plus-one.test.mjs and in
// .dev/features/scanner-redos-bounds/MEASUREMENTS.md — never a floor claim. The hits are meant to be exactly the old
// ones; the differential in the test file compares them with a frozen copy of the 6.64.2 scanText over a fixed corpus.
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

const WS = /\s/;

/**
 * Exactly `/\.\s*(?:forEach|map)\s*$/.test(s.slice(start, end))`, read backwards from `end` without building the slice:
 * skip the trailing whitespace, require `forEach` or `map` to end there (neither is a suffix of the other), skip the
 * whitespace before it, and require a `.`. Each step stays inside `[start, end)`.
 */
function endsWithLoopCall(s, start, end) {
  let j = end;
  while (j > start && WS.test(s[j - 1])) j--;
  let k;
  if (j - 7 >= start && s.startsWith("forEach", j - 7)) k = j - 7;
  else if (j - 3 >= start && s.startsWith("map", j - 3)) k = j - 3;
  else return false;
  while (k > start && WS.test(s[k - 1])) k--;
  return k > start && s[k - 1] === ".";
}

const isIdentStart = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36; // [A-Za-z_$]
const isIdentPart = (c) => isIdentStart(c) || (c >= 48 && c <= 57); // [\w$]

/**
 * Where a sticky, greedy match of the receiver-chain source `[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*` from `i`
 * ends — `s[i]` already being `[A-Za-z_$]` — computed by a loop. Each `.word` link is taken whole or not at all, as
 * the greedy group takes it, and `\s` is tested with the same `WS` regex.
 */
function chainEnd(s, i) {
  let j = i + 1;
  while (j < s.length && isIdentPart(s.charCodeAt(j))) j++;
  for (;;) {
    let k = j;
    while (k < s.length && WS.test(s[k])) k++;
    if (s[k] !== ".") return j;
    k++;
    while (k < s.length && WS.test(s[k])) k++;
    if (k >= s.length || !isIdentStart(s.charCodeAt(k))) return j;
    k++;
    while (k < s.length && isIdentPart(s.charCodeAt(k))) k++;
    j = k;
  }
}

/**
 * The hits for one file's text. Keeps nothing between calls: everything below — the loop intervals and their coverage
 * array, the `g`/`y` regexes, the line index — is created inside this function, once per file (the module-level `WS`
 * has no flag, so it holds no state). The regexes' bytes are unchanged; the `.forEach`/`.map` header regex is now
 * decided by `endsWithLoopCall()` instead of being run (its source is quoted at that function).
 */
export function scanText(text) {
  const masked = mask(text);

  // --- Loop-body interval detection (deterministic lexical scan — P5; NO parser/AST) --------------------------
  // Walk the masked text once, tracking a brace stack and a paren stack plus the `header` = the code since the last
  // statement boundary (a `{`, a `}`, or a `;` at paren-depth 0). Two loop-body interval kinds are recorded:
  //   (a) BRACE bodies whose header opens a `for`/`while` — `LOOP_BRACE_HEADER_RE`. (The `;`s inside a C-style
  //       `for (;;)` header sit at paren-depth > 0 and do NOT reset the header, so the `for (` opener is still visible.)
  //   (b) PAREN ranges of a `.forEach`/`.map` member call — the header ends with `.forEach`/`.map`, i.e. it matches
  //       `/\.\s*(?:forEach|map)\s*$/` (decided by `endsWithLoopCall()`, below the function). This one range covers
  //       BOTH the braced callback (`=> { … }`) and the braceless-arrow callback (`=> …`), so `.forEach`/`.map` are
  //       handled by paren-depth, NOT the brace-header set (the crisp for/while→brace, forEach/map→paren model).
  // An interval is [openPos, closePos] (the `{`…`}` or `(`…`)` character offsets). A query match at position p is
  // "in a loop" iff some interval has openPos < p < closePos.
  const LOOP_BRACE_HEADER_RE = /\b(?:for|while)\s*\(/; // a for/while whose block body is the `{` we are opening

  //
  // COST (6.65.1, TST-3). The `header` is the masked text from `headerStart` up to the current character — the same
  // string the pre-6.65.1 code built with `header += c` — so it is never copied per character. `LOOP_BRACE_HEADER_RE`
  // still tests that exact slice at each `{`; a `{` resets the header, so those slices never overlap and their total
  // length is at most the file's. The `.forEach`/`.map` regex used to be re-run over the whole header at EVERY `(`,
  // and a `(` does not reset it, so `(`×N cost O(N²); `endsWithLoopCall()` decides the same question by reading
  // backwards from the `(` over the whitespace run, the one word and the whitespace run before it — each whitespace
  // run is read for at most one `(` or one word, so the total is linear.
  const intervals = [];
  {
    const braceStack = [];
    const parenStack = [];
    let headerStart = 0;
    const N = masked.length;
    for (let i = 0; i < N; i++) {
      const c = masked[i];
      if (c === "{") {
        braceStack.push({ isLoop: LOOP_BRACE_HEADER_RE.test(masked.slice(headerStart, i)), openPos: i });
        headerStart = i + 1;
        continue;
      }
      if (c === "}") {
        const top = braceStack.pop();
        if (top && top.isLoop) intervals.push([top.openPos, i]);
        headerStart = i + 1;
        continue;
      }
      if (c === "(") {
        parenStack.push({ isLoop: endsWithLoopCall(masked, headerStart, i), openPos: i });
        continue;
      }
      if (c === ")") {
        const top = parenStack.pop();
        if (top && top.isLoop) intervals.push([top.openPos, i]);
        continue;
      }
      if (c === ";" && parenStack.length === 0) {
        headerStart = i + 1;
        continue;
      }
    }
  }

  // "Is `pos` strictly inside some loop interval" — answered from one prefix-sum coverage array instead of a scan
  // over every interval per query hit (which was O(hits × intervals)). An interval [open, close] covers the
  // positions open+1 … close-1: +1 at open+1, -1 at close.
  const cover = new Int32Array(masked.length + 2);
  for (const [open, close] of intervals) {
    cover[open + 1] += 1;
    cover[close] -= 1;
  }
  for (let i = 1; i < cover.length; i++) cover[i] += cover[i - 1];
  const inLoop = (pos) => cover[pos] > 0;

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

  // COST (6.65.1, TST-3). `QUERY_RE.exec` over the masked text gave the right matches but retried at EVERY start: on a
  // receiver chain with no verb call (`a.a.a…`, or one long identifier) each start re-scanned the rest of the chain,
  // so `a.`×10000 (20 KB) took 1.1 s and ×80000 did not finish in 30 s. The same regex now runs sticky, only where a
  // match can start (`[A-Za-z_$]`, the first character it accepts). When it fails at start `s`, every start up to the
  // end `e` of the greedy receiver chain from `s` (`chainEnd()`) fails too, so the search resumes at `e`. Why: a
  // match's verb is followed by `\s*\(`, so the verb word can never be linked to a further `.word`; from any start
  // inside the chain the only candidate verb is therefore the chain's LAST word, the same one `s` already tried. A
  // start mid-word reads the same chain as the word's own start. So every start is tried at most once and each try
  // and each `chainEnd()` read covers text no later try re-reads: linear in the file. A success resumes at the match's
  // end, exactly as `exec` with the `g` flag does, so the hits are the ones the old loop produced. `chainEnd()` is a
  // plain loop, not a regex, because V8's regex backtrack stack overflows on a chain of about 1.5 million links and a
  // regex there would throw on inputs the 6.64.2 scanner merely crawled through (found by the review's probe). The
  // query regex itself still overflows a little later on such a chain, exactly as it did in 6.64.2.
  const START_RE = /[A-Za-z_$]/g;
  const QUERY_AT = new RegExp(QUERY_RE.source, "y");
  const hits = [];
  let from = 0;
  for (;;) {
    START_RE.lastIndex = from;
    const st = START_RE.exec(masked);
    if (st === null) break;
    QUERY_AT.lastIndex = st.index;
    const m = QUERY_AT.exec(masked);
    if (m === null) {
      from = chainEnd(masked, st.index); // > st.index: the chain holds at least the start character
      continue;
    }
    from = QUERY_AT.lastIndex;
    if (!inLoop(m.index)) continue; // the query call must be lexically INSIDE a loop body
    const expr = (m[1] + "." + m[2]).replace(/\s+/g, ""); // normalize `db . findMany` → `db.findMany`
    hits.push({ line: lineAt(m.index), expr });
  }

  hits.sort((a, b) => a.line - b.line || (a.expr < b.expr ? -1 : a.expr > b.expr ? 1 : 0));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-n-plus-one", scanText, process.argv.slice(2));
