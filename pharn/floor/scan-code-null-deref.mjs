#!/usr/bin/env node
// pharn/floor/scan-code-null-deref.mjs — deterministic UNCHECKED-DEREF scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-swallowed-exception.mjs / scan-code-injection.mjs in the scan-code-* family.
// Where those back the swallowed-exception / injection LENSes' FLOOR sub-checks, this one backs the `null-deref`
// LENS's FLOOR sub-check (pharn-review/null-deref/): a value bound from a NULL-RETURNING SOURCE and then
// DEREFERENCED with no null-check between. Detection is a FIXED, non-LLM procedure: a comment/string MASK, an
// assignment regex over a FIXED source-method set, a paren-match of the source call, and a FIRST-OCCURRENCE
// classification of the binding's next use. It reduces to ARCHITECTURE §2 primitive #3 (regex / enum / text
// membership).
//
// THE SHAPE (obvious cases only): `const NAME = <recv>.<SOURCE>( … )` where SOURCE is a commonly null/undefined-
// returning method, followed — as the FIRST subsequent use of NAME — by a RAW deref `NAME.` or `NAME[` (NOT the
// null-safe `NAME?.` / `NAME?.[`). The FIRST-OCCURRENCE rule is exactly what encodes "no null-check BETWEEN": a
// real guard (`if (!NAME) return;`, `NAME && …`, `NAME?.…`, `NAME == null`) is itself the first re-use of NAME
// and classifies CLEAN; only a bare `NAME.` / `NAME[` reached FIRST is a HIT.
//
// HONEST BOUND (the injection / swallowed-exception precedent, P0): this detects an unchecked-deref SHAPE. It does
// NOT decide whether the value is TRULY null here (a `find` over a set known non-empty is never null), does NOT
// know whether a guard is genuinely needed, and does NOT trace control/data flow. "Detected an unchecked deref of
// a null-sourced value on line N" is a real guarantee; "the code is null-safe / no null-deref exists" is NOT. That
// judgment is the ADVISORY layer the LENS surfaces — NOT this floor.
//
// Further documented bounds (honest false-negatives / false-positives, stated not hidden):
//   • LANGUAGE / SHAPE SCOPE: JS/TS `const|let|var NAME = recv.SOURCE(` assignment shapes only. A Python/Go
//     equivalent, or a destructuring bind (`const { x } = …`), yields found:false — a scope limit, not "clean".
//   • FIXED SOURCE SET: only { find, findLast, findOne, get, query, querySelector, getElementById, match } are
//     recognized as null-returning. A custom null-returning function (`lookupUser(id)`) is a false-negative
//     (deferred to the advisory layer / a future increment, P7). A `.get(` that never returns null over-matches.
//   • FIRST-OCCURRENCE, NOT DATA-FLOW: only the FIRST linear use of NAME after its assignment is classified; the
//     scanner is NOT scope-aware. A guard in a different branch than the deref, a reassignment before deref, or a
//     same-named binding shadowed in a later scope can skew it. THIS IS NOT NULL-SAFETY ANALYSIS.
//   • Only `//`, `/* */` comments and single-line '…' / "…" strings are masked FOR DETECTION; a BACKTICK
//     template literal is left intact there — deliberately, so DETECTION is ROBUST over a MARKDOWN eval fixture
//     (```-fenced code + inline `code` prose), exactly as the sibling scanners are. The SUPPRESSION clause
//     additionally masks template-literal STRING content over a second copy (maskTemplateInteriors), so backtick
//     text cannot silence a real deref. Residual bound: a `}` or `)` inside a template/regex literal in the
//     scanned span can skew the paren-match. Quote-masking stops at end-of-line, so a stray apostrophe/quote in
//     surrounding prose cannot bleed into the fenced code.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): DETECTION is regex + paren-match + fixed-set membership over the
// comment/string-MASKED text, with template literals left INTACT so it survives ```-fenced markdown fixtures.
// The SUPPRESSION clause (firstUseDerefLine) runs over a SECOND copy in which template-literal STRING content is
// ALSO masked (see maskTemplateInteriors). So no free text — a // or /* */ comment, a single/double-quoted
// string, OR a template-literal's text — can suppress a real raw deref, and a comment CLAIMING a deref is unsafe
// cannot manufacture a hit over guarded code. The suppression masking is MONOTONE: it only ADDS masking to the
// suppression copy (a SUPERSET of what `masked` blanks) and never touches detection's `masked`, so the fix
// strictly NARROWS the laundering surface, never widens it, and can only over-flag. No template-literal STRING
// content at ANY nesting depth — single OR nested `${…}`, the V1/V2 attack surface — can suppress a real deref (the
// depth-aware masker blanks a nested `${`user`}` interior at any depth; interpolation CODE like `${u?.name}` stays
// readable, so a real guard there correctly reads CLEAN — the old Option-A over-flag is GONE, a precision gain).
// DOCUMENTED RESIDUAL (the price of fence-robustness): a run of
// ≥3 backticks is a MARKDOWN CODE-FENCE marker, so a ≥3-backtick-wrapped token is read as CODE — correct over a
// .md fixture (fenced content IS the code under review), a narrow residual in raw .js (the invalid
// 3-adjacent-template form), far narrower than the pre-fix any-backtick hole. Within that boundary the
// suppression search is injection-immune by construction. (See the ★ tests in scan-code-null-deref.test.mjs —
// the backtick-laundering immunity case AND the ≥3-backtick residual bound — the whole reason this is FLOOR, not
// judgment.)
//
// Per-file by contract: every verdict is about ONE file's text, mirroring the sibling scanners. The scanner takes
// one `<code-file>`, or many through `--files` (review-fanout) — the batch mode `/pharn-review`'s prefilter
// spawns once per review — and each file's verdict is the same either way (pharn/floor/code-scanner-cli.mjs owns
// both modes). A cross-file / directory sweep is a FUTURE increment (P7 — not built speculatively).
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the sibling scanners: a missing /
// non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-null-deref.mjs <code-file>
//         node pharn/floor/scan-code-null-deref.mjs --files <nul-separated-list | ->
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"unchecked-deref"},...]} on stdout; exit 0 on a successful
//         scan (whatever the result). `found` === (hits.length > 0); hits sorted by line. `line` is the DEREF
//         line (the crash / fix site — where a guard or `?.` belongs), never the assignment or a comment line.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).
//         With --files: one {"results":[…]} document, one entry per listed path (code-scanner-cli.mjs).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Produce a copy of `src` in which every character inside a // line comment, a /* block */ comment, or a
// single-line '…' / "…" string is replaced by a space — EXCEPT newlines, which are preserved so 1-based line
// numbers and character offsets map 1:1 back to the original. Code tokens survive; a keyword/binding/needle
// hidden in a comment or single-line string does not. Same single-pass mini-lexer as scan-code-swallowed-
// exception.mjs (accepted, deferred duplication of the shared idiom — consolidation is a separate axis, P7).
//
// Two deliberate choices make this ROBUST OVER A MARKDOWN eval fixture (```-fenced code + inline `code` prose):
//   • BACKTICKS are NOT string delimiters here (no template masking) — otherwise markdown fences/inline code
//     would be read as unterminated template literals and mask the real code.
//   • '…' / "…" masking STOPS AT END-OF-LINE (a JS single/double-quoted string never spans a raw newline), so a
//     stray apostrophe/quote in surrounding prose cannot bleed the mask into the fenced code below it.
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

/**
 * The hits for one file's text. Keeps nothing between calls: everything below — the masks, the `g` assignment
 * regex, the helpers that read them — is created inside this function, once per file.
 */
export function scanText(text) {
  const masked = mask(text);

  // --- Suppression-only template-interior MASK ----------------------------------------------------------------
  // DETECTION (ASSIGN_RE + matchDelim, below) runs over `masked` with template literals INTACT, so it survives
  // ```-fenced code in a MARKDOWN eval fixture. But the SUPPRESSION clause (firstUseDerefLine) must NOT read a
  // template literal's STRING content as code — otherwise untrusted backtick text supplies a fake "first use" and
  // silences a real deref (taint laundering INTO the enum-gated verdict, P2). So the suppression clause runs over
  // THIS second copy, in which template-literal interiors are ALSO blanked. Two rules keep detection fence-robust:
  //   • a RUN OF ≥3 BACKTICKS is a MARKDOWN CODE-FENCE marker → emitted unchanged, NOT a template delimiter (this
  //     preserves the real code that lives BETWEEN ```-fences; a naive "blank everything between backticks" masker
  //     would blank the whole fenced block and break detection — the ≥3-run skip is load-bearing);
  //   • a SINGLE (or double) backtick opens a TEMPLATE STRING (mask mode); inside it every char is blanked to a space
  //     (newline preserved), and a backtick closes it (a run of exactly TWO backticks `` is an EMPTY template —
  //     nothing masked). A DEPTH-AWARE STACK (not a boolean toggle) tracks `${…}` interpolation: interpolation CODE is
  //     left READABLE, and a backtick inside it opens ANOTHER nested template (masked) — so a nested `${`user`}` masks
  //     its inner string at ANY depth (the old boolean mis-closed on that inner backtick and re-laundered it).
  // The old Option-A `${…}` over-flag (a guard written inside `${…}` blanked, forcing a false-positive) is GONE:
  // interpolation code now reads as code, so a real `${u?.name}` guard correctly suppresses — a precision gain.
  // MONOTONICITY (P0/P2): this pass only ever ADDS masking to the SUPPRESSION copy; DETECTION reads the untouched
  // `masked`, so no crafted backtick input can REMOVE masking to re-enable suppression — the fix can only
  // over-flag, never launder. Length + newlines are preserved 1:1, so offsets map back to `masked`.
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

  // --- Helpers ------------------------------------------------------------------------------------------------
  // Match the delimiter that closes the `open` at `openIdx` in `s`, counting nesting over the MASKED text. Returns
  // the closing index, or -1 if unbalanced.
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

  function escapeRe(x) {
    return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // FIXED set of commonly null/undefined-returning source methods (P5). The assignment must be `NAME = recv.SOURCE(`.
  const SOURCE = "find|findLast|findOne|get|query|querySelector|getElementById|match";
  // const|let|var NAME = [await] <ident>(.<ident>)* . SOURCE (
  const ASSIGN_RE = new RegExp(
    "\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:await\\s+)?" +
      "[A-Za-z_$][\\w$]*(?:\\s*\\.\\s*[A-Za-z_$][\\w$]*)*\\s*\\.\\s*(?:" +
      SOURCE +
      ")\\s*\\(",
    "g"
  );

  // Classify the FIRST use of `name` after `searchStart` (P5, first-match): a RAW deref `name.` / `name[`
  // (not `name?.` / `name?.[`) → HIT; anything else (optional-chain, `&&`/`||`/`??`, comparison, `if(name)`
  // test, reassignment, being passed as an arg) → CLEAN. Returns the DEREF line on a hit, else null. A
  // `something.NAME` (NAME preceded by `.`) is a property on ANOTHER object, not our binding — skipped.
  // SUPPRESSION runs over `maskedForSuppression` (template interiors blanked) — NOT `masked` — so a backtick
  // literal's text can never supply a fake "first use" that silences a real deref (P2; see maskTemplateInteriors).
  function firstUseDerefLine(name, searchStart) {
    const re = new RegExp("\\b" + escapeRe(name) + "\\b", "g");
    re.lastIndex = searchStart;
    let m;
    while ((m = re.exec(maskedForSuppression)) !== null) {
      const idx = m.index;
      if (idx > 0 && maskedForSuppression[idx - 1] === ".") continue; // `obj.NAME` — a property on another object
      let j = idx + m[0].length;
      while (j < maskedForSuppression.length && /\s/.test(maskedForSuppression[j])) j++;
      const next = maskedForSuppression[j] || "";
      if (next === "." || next === "[") return lineAt(maskedForSuppression, idx); // RAW deref → HIT
      return null; // `?` (optional-chain / ternary), operator, paren, `=`, etc. → guarded / not-a-raw-deref → CLEAN
    }
    return null; // NAME never re-used → CLEAN
  }

  // --- Scan ---------------------------------------------------------------------------------------------------
  const hits = [];
  let m;
  while ((m = ASSIGN_RE.exec(masked)) !== null) {
    const name = m[1];
    const callOpen = m.index + m[0].length - 1; // the '(' of the source call
    const callClose = matchDelim(masked, callOpen, "(", ")");
    if (callClose === -1) continue; // unbalanced — cannot bound the initializer (documented bound)
    const line = firstUseDerefLine(name, callClose + 1);
    if (line !== null) hits.push({ line, kind: "unchecked-deref" });
  }

  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-null-deref", scanText, process.argv.slice(2));
