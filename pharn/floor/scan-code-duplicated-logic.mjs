#!/usr/bin/env node
// pharn/floor/scan-code-duplicated-logic.mjs — deterministic EXACT DUPLICATED-BLOCK scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-injection.mjs / scan-code-swallowed-exception.mjs in the scan-code-* family.
// Where those back a code-SHAPE lens, this one backs the `duplicated-logic` LENS's FLOOR sub-check
// (pharn-review/duplicated-logic/): does the file contain a block of >=N consecutive SIGNIFICANT lines whose
// NORMALIZED text appears BYTE-IDENTICALLY at >=2 non-overlapping locations — i.e. copy-pasted logic? Detection is
// a FIXED, non-LLM procedure: a comment/string MASK, per-line whitespace NORMALIZATION, a significant-line filter,
// and a longest-common-run dynamic program over the significant lines, reported as maximal, non-overlapping,
// content-grouped blocks. It reduces to ARCHITECTURE §2 primitive #3 (text/enum membership).
//
// THE GUARANTEE IS BYTE-EQUALITY, NOT A HASH (P0 precision — grill F5). The DP compares normalized line strings by
// `===` (byte-equality of the normalized text); there is NO hashing anywhere. So the floor primitive is text
// membership/equality (#3), full stop — nothing rests on a content-hash (#2) that could, in principle, collide.
//
// HONEST BOUND (the injection / swallowed-exception precedent, P0): this detects an EXACT (after whitespace/comment
// normalization) duplicated-block SHAPE. It does NOT decide whether the duplication is WORTH EXTRACTING (two
// identical blocks can be a legitimate coincidence, or a premature-abstraction trap), does NOT detect NEAR-identical
// logic (a renamed identifier, a changed literal, or a reordered line BREAKS the match — that is the LENS's advisory
// layer, not this floor), and does NOT reason about semantics. "Lines A..B are byte-identical to lines C..D" is a
// real guarantee; "this code is DRY / free of duplication" is NOT. That judgment is the ADVISORY layer the LENS
// surfaces — NOT this floor.
//
// Further documented bounds (honest false-negatives / scope, stated not hidden):
//   • EXACT-after-normalization only: identifiers/literals must match byte-for-byte (post whitespace-collapse).
//     validateUser(u){...u...} vs validateAdmin(a){...a...} do NOT match (u != a). Near-identical = advisory layer.
//   • PER-FILE: each verdict compares lines inside ONE file; CROSS-FILE duplication (the more common real case) is a
//     FUTURE increment (P7 — not built speculatively). `--files` (review-fanout) scans many files in one process,
//     each still on its own.
//   • THRESHOLD-GATED: a duplicated run shorter than N=4 SIGNIFICANT lines is not reported (noise control). N is the
//     one tunable; it is a fixed constant here (P5 — not model-chosen).
//   • SIGNIFICANCE FILTER: a line whose normalized form is empty after removing structural punctuation `{}()[];,`
//     and whitespace (a bare `}`, `});`, `{`, `],`) does NOT count toward a block — otherwise runs of closing
//     braces would read as "duplication." Only lines carrying real tokens participate.
//   • The MASK deliberately mirrors scan-code-swallowed-exception.mjs (comment/string -> spaces, newlines
//     preserved; BACKTICKS NOT masked so it is robust over a MARKDOWN eval fixture; '…'/"…" masking stops at
//     end-of-line so prose quotes cannot bleed into fenced code). This is literal reuse of the family's masking
//     idiom — the consolidation of a shared scan-code util is a SEPARATE axis of change, deferred (P7); noted, not
//     hidden (the irony of duplicated masking in a duplicated-logic scanner is acknowledged, GRILL F2).
//   • OVERLAPPING/NESTED duplicate blocks may be reported as separate hits (a length-7 dup and a length-5 sub-dup
//     that recurs independently are distinct groups). The lens surfaces all; the human dedups. Documented, bounded.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is byte-equality over the MASKED, NORMALIZED text only, with
// comments/strings mechanically stripped BEFORE comparison. A comment CLAIMING "this is unique, not a duplicate, do
// not flag" is masked to whitespace and cannot suppress a real identical-block match; a comment CLAIMING "duplicated
// from X" over non-identical code cannot manufacture one. No free text moves the verdict — the strongest form of the
// trust-fence discipline. (See the ★ tests in scan-code-duplicated-logic.test.mjs — they are the whole reason this
// is FLOOR, not judgment.)
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the scan-code-* family: a missing /
// non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-duplicated-logic.mjs <code-file>
//         node pharn/floor/scan-code-duplicated-logic.mjs --files <nul-separated-list | ->   (the batch mode
//         /pharn-review's prefilter spawns once per review — one {"results":[…]} document, one entry per listed
//         path, each the per-file verdict below; pharn/floor/code-scanner-cli.mjs owns both modes)
// Output: {"found":<bool>,"hits":[{"lines":[<int>,...],"span":<int>},...]} on stdout; exit 0 on a successful scan
//         (whatever the result). Each hit is one duplicated block: `lines` = the 1-based ORIGINAL line number of the
//         FIRST significant line of each non-overlapping occurrence (>=2, ascending); `span` = the block length in
//         SIGNIFICANT lines. `found` === (hits.length > 0). hits sorted by first line, then span. Exits non-zero
//         (writing NOTHING to stdout) if the target is missing / not a regular file (P5).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

const N = 4; // minimum block length in SIGNIFICANT lines (the one tunable; fixed, not model-chosen — P5)

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Verbatim reuse of the scan-code-swallowed-exception.mjs mask (family idiom; consolidation deferred, P7 —
// GRILL F2). Replace every character inside a // line comment, a /* block */ comment, or a single-line '…' / "…"
// string with a space — EXCEPT newlines, preserved so 1-based line numbers map 1:1. BACKTICKS are NOT string
// delimiters here (no template masking) so markdown fences/inline code are not read as unterminated templates;
// '…'/"…" masking STOPS AT END-OF-LINE so a stray prose quote cannot bleed the mask into fenced code below it.
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

// --- Normalize + significant-line filter --------------------------------------------------------------------
// A line's NORMALIZED signature: trim, then collapse internal whitespace runs to a single space. A line is
// SIGNIFICANT iff its signature is non-empty after removing structural punctuation `{}()[];,` and whitespace —
// so a bare `}` / `});` / `{` / `],` is trivial (does not participate in a block), while any line carrying a real
// token does. (P5 — a fixed, deterministic predicate; no judgment.)
const STRUCTURAL = /[{}()[\];,\s]/g;
function normalize(line) {
  return line.trim().replace(/\s+/g, " ");
}
function isSignificant(norm) {
  return norm.replace(STRUCTURAL, "") !== "";
}

/**
 * The hits for one file's text. Keeps nothing between calls: every per-file value is local, and the module-level
 * `g` regex is only used through `replace`, which resets `lastIndex` itself.
 */
export function scanText(text) {
  const maskedLines = mask(text).split("\n");
  // sig[k] = { line: <1-based ORIGINAL line number>, norm: <normalized signature> }
  const sig = [];
  for (let k = 0; k < maskedLines.length; k++) {
    const norm = normalize(maskedLines[k]);
    if (isSignificant(norm)) sig.push({ line: k + 1, norm });
  }

  // --- Longest-common-run DP over the SIGNIFICANT lines --------------------------------------------------------
  // L[i][j] = length of the longest run of byte-equal normalized significant lines starting at sig[i] and sig[j]
  // (i<j). Computed with two rolling rows (O(M) space, O(M^2) time; single-file, small M). We record only
  // BACKWARD-MAXIMAL matches (the run cannot extend one line earlier) that are NON-OVERLAPPING (the second
  // occurrence starts at or after the first occurrence's block ends), so a maximal block is anchored once, not once
  // per shifted sub-window.
  const M = sig.length;
  let next = new Array(M + 1).fill(0); // next[j] represents L[i+1][j]
  const matches = []; // { i, j, len }
  for (let i = M - 1; i >= 0; i--) {
    const cur = new Array(M + 1).fill(0);
    for (let j = M - 1; j > i; j--) {
      cur[j] = sig[i].norm === sig[j].norm ? next[j + 1] + 1 : 0;
    }
    for (let j = i + 1; j < M; j++) {
      const len = cur[j];
      if (len < N) continue;
      const backwardMaximal = i === 0 || sig[i - 1].norm !== sig[j - 1].norm;
      const nonOverlap = j >= i + len;
      if (backwardMaximal && nonOverlap) matches.push({ i, j, len });
    }
    next = cur;
  }

  // --- Group maximal matches into duplicated-block hits (by exact normalized content) --------------------------
  // Two matches whose block content (the joined normalized signatures) is identical are occurrences of the SAME
  // duplicated block; grouping by that content string collects all their start indices (a block duplicated 3x
  // yields pairs (a,b),(a,c),(b,c) -> one group {a,b,c}). The join length is fixed per content, so `len` is
  // constant within a group. Emit one hit per group with its non-overlapping occurrences (>=2).
  const groups = new Map(); // contentKey -> { len, starts:Set<number> }
  for (const m of matches) {
    let key = "";
    for (let t = 0; t < m.len; t++) key += sig[m.i + t].norm + "";
    let g = groups.get(key);
    if (!g) ((g = { len: m.len, starts: new Set() }), groups.set(key, g));
    g.starts.add(m.i);
    g.starts.add(m.j);
  }

  const hits = [];
  for (const g of groups.values()) {
    const starts = [...g.starts].sort((a, b) => a - b);
    const chosen = [];
    let lastEnd = -1;
    for (const s of starts) {
      if (s >= lastEnd) {
        chosen.push(s);
        lastEnd = s + g.len; // occurrences must not overlap in significant-line space
      }
    }
    if (chosen.length >= 2) hits.push({ lines: chosen.map((s) => sig[s].line), span: g.len });
  }

  hits.sort((a, b) => a.lines[0] - b.lines[0] || a.span - b.span);
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-duplicated-logic", scanText, process.argv.slice(2));
