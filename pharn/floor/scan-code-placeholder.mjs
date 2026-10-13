#!/usr/bin/env node
// pharn/floor/scan-code-placeholder.mjs — deterministic PLACEHOLDER-SHIPPED-AS-DONE scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-swallowed-exception.mjs in the scan-code-* family. It backs the
// `placeholder-as-done` LENS's FLOOR sub-check (pharn-review/placeholder-as-done/): was a PLACEHOLDER shipped in
// place of real logic? Detection is TWO fixed, non-LLM passes, each reducing to ARCHITECTURE §2 primitive #3:
//
//   • PASS A — MARKER MEMBERSHIP over the RAW text (positive-only; NO suppression path). A hit is only ever
//     ADDED on a fixed-marker match; nothing in the file can REMOVE a hit. Marker families (the `kind` enum):
//       todo             — a `TODO` marker (uppercase, word-bounded)
//       fixme            — a `FIXME` marker (uppercase, word-bounded)
//       not-implemented  — a `not implemented`/`not yet implemented`/`unimplemented` phrase (case-insensitive),
//                          or a `NotImplemented(Error|Exception)?` identifier — the classic
//                          `throw new Error("not implemented")` / `throw new NotImplementedError()`
//       stub             — a `STUB` / `PLACEHOLDER` marker (uppercase, word-bounded)
//   • PASS B — EMPTY FUNCTION BODY over the MASKED text (the direct analog of scan-code-swallowed-exception.mjs's
//     empty-catch brace-match). Mask comments/strings to whitespace, find each `function …(){` / `… => {` head,
//     brace-match its body, and if the masked body is whitespace-only emit `kind: empty-body` — a placeholder
//     shipped where logic is expected.
//
// HONEST BOUND (the injection / secrets / swallowed-exception precedent, P0): this detects a fixed MARKER SHAPE
// and an EMPTY-BODY SHAPE. It does NOT decide whether the code is actually incomplete, whether a marker is a real
// placeholder vs. an intentional/annotated stub, or whether an empty `() => {}` is a legitimate no-op.
// "Detected a placeholder marker / empty body on line N" is a real guarantee; "no placeholder shipped / the code
// is complete" is NOT. That judgment is the ADVISORY layer the LENS surfaces — NOT this floor.
//
// Further documented bounds (honest false-negatives, stated not hidden):
//   • Pass A detects only the FIXED marker set: a lowercased `todo`/`fixme`, or a custom-worded stub, reads as
//     CLEAN. A marker inside a legitimate string/identifier (`const label = "TODO app"`) is an HONEST hit — whether
//     it is a real placeholder is ADVISORY, not this floor.
//   • Pass B targets `function`-keyword and arrow (`=> {`) block bodies. An object/class METHOD SHORTHAND `m(){}`
//     is not matched, and a STUB-RETURN (`return null`) is not an empty body — both read as CLEAN (a scope limit).
//     A `function` head whose params contain a `)` (a defaulted param) is skipped by the `\([^)]*\)` head match.
//   • MASKING (Pass B) mirrors scan-code-swallowed-exception.mjs exactly: only `//`, `/* */` comments and
//     single-line '…'/"…" strings are masked; BACKTICK template literals are NOT masked (so this stays robust run
//     over a MARKDOWN eval fixture — ```-fenced code + inline `code`). Residual: a `}` inside a template/regex
//     literal within a body can skew the brace-match. Quote masking stops at end-of-line, so a stray prose
//     apostrophe/quote cannot bleed into the fenced code.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): Pass A is positive-only membership — a comment CLAIMING "intentional,
// complete, do not flag" is simply NOT a marker, so it cannot suppress a real placeholder hit (it can only ever
// appear as quoted `evidence` in the lens). Pass B masks comments/strings BEFORE the emptiness test, so a comment
// inside a body cannot make an empty body look filled, and a `{`/`}` inside a string cannot fool the brace-match.
// No free text moves either verdict. (See the ★ tests in scan-code-placeholder.test.mjs — they are the whole
// reason this is FLOOR, not judgment.)
//
// Per-file by contract: every verdict is about ONE file's text, mirroring scan-code-swallowed-exception.mjs. The
// scanner takes one `<code-file>`, or many through `--files` (review-fanout) — the batch mode `/pharn-review`'s
// prefilter spawns once per review — and each file's verdict is the same either way
// (pharn/floor/code-scanner-cli.mjs owns both modes). A cross-file / directory sweep is a FUTURE increment.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the scan-code-* family: a missing /
// non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-placeholder.mjs <code-file>
//         node pharn/floor/scan-code-placeholder.mjs --files <nul-separated-list | ->
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"todo|fixme|not-implemented|stub|empty-body"},...]} on
//         stdout; exit 0 on a successful scan (whatever the result). `found` === (hits.length > 0); hits deduped
//         by (line,kind) and sorted by line, then kind. Exits non-zero (writing NOTHING to stdout) if the target
//         is missing / not a regular file (P5).
//         With --files: one {"results":[…]} document, one entry per listed path (code-scanner-cli.mjs).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK (identical idiom to scan-code-swallowed-exception.mjs) -----------------------------
// Replace every character inside a // line comment, a /* block */ comment, or a single-line '…' / "…" string
// with a space — EXCEPT newlines, which are preserved so 1-based line numbers and offsets map 1:1 back to the
// original. Backticks are NOT string delimiters (no template masking) so markdown fences/inline code are not
// read as unterminated templates; '…'/"…" masking STOPS AT END-OF-LINE so a prose quote cannot bleed into code.
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

// Match the delimiter that closes the `open` at `openIdx`, counting nesting over the MASKED text.
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

/**
 * The hits for one file's text. Keeps nothing between calls: the hit list and its dedup set lived at module level
 * while the scanner ran once per process, and would have accumulated across files in `--files` mode, so they — and
 * the `g` regexes of pass B — are created here, once per file.
 */
export function scanText(text) {
  const hits = [];
  const seen = new Set(); // dedupe by `${line}:${kind}`
  function add(line, kind) {
    const key = line + ":" + kind;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ line, kind });
  }

  // --- PASS A — marker membership over the RAW text (positive-only, no suppression) ---------------------------
  // Fixed marker patterns. Each is a deterministic membership test; a match ADDS a hit at its 1-based line.
  const MARKERS = [
    { kind: "todo", re: /\bTODO\b/ },
    { kind: "fixme", re: /\bFIXME\b/ },
    // not-implemented: the `not implemented`/`unimplemented` phrase (case-insensitive), or a NotImplemented* id.
    { kind: "not-implemented", re: /\bnot\s+(?:yet\s+)?implemented\b|\bunimplemented\b|\bNotImplemented\w*\b/i },
    { kind: "stub", re: /\bSTUB\b|\bPLACEHOLDER\b/ },
  ];
  {
    const lines = text.split("\n");
    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li];
      for (const { kind, re } of MARKERS) {
        if (re.test(raw)) add(li + 1, kind);
      }
    }
  }

  // --- PASS B — empty function body over the MASKED text (the empty-catch analog) -----------------------------
  const masked = mask(text);
  // A `function` head: `function`, optional generator `*`, optional name, a simple `( … )` param list, then `{`.
  const FN_RE = /\bfunction\b\s*\*?\s*[A-Za-z0-9_$]*\s*\([^)]*\)\s*\{/g;
  // An arrow block body: `=>` then `{`. The head line is the `=>`'s line.
  const ARROW_RE = /=>\s*\{/g;
  for (const RE of [FN_RE, ARROW_RE]) {
    let m;
    while ((m = RE.exec(masked)) !== null) {
      const bodyOpen = m.index + m[0].length - 1; // index of the body's '{'
      const bodyClose = matchDelim(masked, bodyOpen, "{", "}");
      if (bodyClose === -1) continue; // unbalanced braces — cannot classify (documented bound)
      const bodyMasked = masked.slice(bodyOpen + 1, bodyClose);
      if (bodyMasked.replace(/\s/g, "") === "") add(lineAt(masked, m.index), "empty-body");
    }
  }

  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-placeholder", scanText, process.argv.slice(2));
