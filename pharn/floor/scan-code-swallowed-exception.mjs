#!/usr/bin/env node
// pharn/floor/scan-code-swallowed-exception.mjs — deterministic EMPTY / LOG-ONLY catch scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-injection.mjs in the scan-code-* family. Where that scanner backs the
// `injection` LENS's FLOOR sub-check (a concat/interp-into-sink SHAPE), this one backs the `swallowed-exception`
// LENS's FLOOR sub-check (pharn-review/swallowed-exception/): does a `catch` clause SWALLOW the error — is its
// body EMPTY, or does it contain ONLY logging calls with no `throw` / `return` / `reject` / `next(...)` to
// propagate or handle? Detection is a FIXED, non-LLM procedure: a comment/string MASK, a catch-clause regex, a
// brace-match of the body, and a first-match classification. It reduces to ARCHITECTURE §2 primitive #3
// (regex / enum / text membership).
//
// HONEST BOUND (the injection / secrets-in-code precedent, P0): this detects an EMPTY or LOG-ONLY catch SHAPE.
// It does NOT decide whether swallowing is actually WRONG here (a best-effort / optional path is sometimes
// swallowed intentionally), does NOT know whether the error should propagate, and does NOT trace control flow.
// "Detected an empty/log-only catch on line N" is a real guarantee; "no exception is swallowed / error handling
// is correct" is NOT. That judgment is the ADVISORY layer the LENS surfaces — NOT this floor.
//
// Further documented bounds (honest false-negatives, stated not hidden):
//   • LANGUAGE SCOPE: the catch-clause shape is JavaScript / TypeScript (`catch (e) { … }` / `catch { … }`).
//     Run over a non-JS/TS file (a Python try/except, a Go recover) the scanner returns found:false — a scope
//     limit, not a "clean" verdict.
//   • The `log-only` classifier recognizes a FIXED logger-name set (`console.*`, `logger.*`, bare/`.log(`); a
//     catch that only calls a custom-named logger (`telemetry.record(e)`) is classified CLEAN (a false-negative).
//   • Only `//`, `/* */` comments and single-line '…' / "…" strings are masked FOR DETECTION. A BACKTICK template
//     literal is left INTACT there — deliberately, so DETECTION (find-catch + body brace-match) is robust when run
//     over a MARKDOWN eval fixture (```-fenced code + inline `code` prose), exactly as scan-code-injection.mjs is.
//     But the SUPPRESSION read — classify(), which decides whether a catch body swallows — runs over a SECOND copy
//     in which template-literal STRING content is ALSO masked (maskTemplateInteriors), so a bare-backtick body can
//     neither read non-empty (dodging empty-catch) NOR supply a fake `throw`/`return`/`reject` HANDLE token to force
//     CLEAN. SEPARATE residual bound (a DIFFERENT mechanism, NOT the bare-backtick laundering above): a `}` inside a
//     template/regex literal within a catch body can still skew the DETECTION brace-match. Quote-string masking stops
//     at end-of-line (JS '…'/"…" strings never span a raw newline), so a stray prose quote cannot bleed into code.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): DETECTION (find-catch + body brace-match) runs over `masked` with template
// literals INTACT, so it survives ```-fenced markdown fixtures. The SUPPRESSION read — classify(), which decides
// whether the body swallows — runs over a SECOND copy in which template-literal STRING content is ALSO masked (see
// maskTemplateInteriors). So no free text — a // or /* */ comment, a single/double-quoted string, OR a
// template-literal's text — can SUPPRESS a real empty/log-only body: a bare-backtick body can neither read non-empty
// (dodging empty-catch) NOR supply a fake `throw`/`return`/`reject` HANDLE token; and a comment CLAIMING "swallowed
// here" inside a catch that actually `throw`s cannot MANUFACTURE a hit. The suppression masking is MONOTONE: it only
// ADDS masking to the suppression copy (a SUPERSET of what `masked` blanks) and never touches detection's `masked`,
// so the fix strictly NARROWS the laundering surface and can only over-flag, never launder. No template-literal
// STRING content at ANY nesting depth — single OR nested `${…}`, the attack surface — can suppress a real hit (a
// nested `${`throw`}` body has its inner token masked AND its bare `${}` delimiters stripped by classify(), so it
// reads empty, never a fake HANDLE token nor a non-empty dodge). DOCUMENTED RESIDUAL (the price of
// fence-robustness): a run of ≥3 backticks is a MARKDOWN CODE-FENCE marker, so a ≥3-backtick-wrapped HANDLE token is
// read as CODE — correct over a .md fixture (fenced content IS the code under review), a narrow residual in raw .js.
// (The `}`-in-template DETECTION brace-skew is a SEPARATE documented bound, not this laundering surface.) (See the ★
// tests in scan-code-swallowed-exception.test.mjs — the backtick-laundering immunity case AND the ≥3-backtick
// residual bound — the whole reason this is FLOOR, not judgment.)
//
// The `throw`/`return`/`reject`/`next(` HANDLE-token DISCRIMINATOR is the point: a rethrow, a recovery `return`,
// a Promise `reject(e)`, or an Express `next(e)` carries a HANDLE token and is a true-negative (CLEAN) —
// deterministically, not by judgment. So is a catch that does real recovery work (an assignment / a non-log
// call), and a catch whose body contains an object literal that it then returns (the braces are brace-matched,
// not misread as empty).
//
// Per-file by contract: every verdict is about ONE file's text, mirroring scan-code-injection.mjs. The scanner
// takes one `<code-file>`, or many through `--files` (review-fanout) — the batch mode `/pharn-review`'s
// prefilter spawns once per review — and each file's verdict is the same either way
// (pharn/floor/code-scanner-cli.mjs owns both modes). A cross-file / directory sweep is a FUTURE increment.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of pharn/floor/scan-code-injection.mjs:
// a missing / non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-swallowed-exception.mjs <code-file>
//         node pharn/floor/scan-code-swallowed-exception.mjs --files <nul-separated-list | ->
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"empty-catch|log-only-catch"},...]} on stdout; exit 0 on
//         a successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line, then kind.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).
//         With --files: one {"results":[…]} document, one entry per listed path (code-scanner-cli.mjs).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Produce a copy of `src` in which every character inside a // line comment, a /* block */ comment, or a
// single-line '…' / "…" string is replaced by a space — EXCEPT newlines, which are preserved so 1-based line
// numbers and character offsets map 1:1 back to the original. Code tokens (keywords, identifiers, punctuation,
// braces, parens) are copied verbatim, so `catch`, `throw`, `return`, `console.`, `{`, `(` survive while a
// `catch`/brace/needle hidden in a comment or single-line string does not. A standard single-pass mini-lexer.
//
// Two deliberate choices make this ROBUST OVER A MARKDOWN eval fixture (```-fenced code + inline `code` prose),
// matching how the line-local scan-code-injection.mjs is evaluated over its own .md fixture:
//   • BACKTICKS are NOT string delimiters here (no template masking) — otherwise markdown fences/inline code
//     would be read as unterminated template literals and mask the real code. Residual bound: an unbalanced `}`
//     inside a real template literal within a catch body can skew the brace-match (documented above).
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
      // line comment → mask to end of line
      while (i < N && src[i] !== "\n") ((out[i] = " "), i++);
      continue;
    }
    if (c === "/" && n === "*") {
      // block comment → mask (preserving newlines) until */
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < N && !(src[i] === "*" && src[i + 1] === "/")) ((out[i] = space(src[i])), i++);
      if (i < N) ((out[i] = " "), (out[i + 1] = " "), (i += 2));
      continue;
    }
    if (c === "'" || c === '"') {
      // single/double-quoted string → mask until the matching unescaped delimiter OR end of line (whichever
      // comes first; JS '…'/"…" strings do not span a raw newline). Bounding to the line prevents a prose
      // apostrophe/quote from masking into real code below.
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
 * The hits for one file's text. Keeps nothing between calls: everything below — the masks, the `g` catch regex,
 * the helpers that read them — is created inside this function, once per file.
 */
export function scanText(text) {
  const masked = mask(text);

  // --- Suppression-only template-interior MASK ----------------------------------------------------------------
  // DETECTION (CATCH_RE + the body brace-match, below) runs over `masked` with template literals INTACT, so it
  // survives ```-fenced code in a MARKDOWN eval fixture. But the SUPPRESSION read — classify(), which decides whether
  // a catch body swallows — must NOT read a template literal's STRING content as code: otherwise a bare-backtick body
  // reads non-empty (dodging empty-catch) and its text can supply a fake `throw`/`return`/`reject` HANDLE token that
  // forces CLEAN, silencing a real swallowed exception (taint laundering INTO the enum-gated verdict, P2). So classify
  // runs over a slice of THIS second copy, in which template-literal interiors are ALSO blanked. Two rules keep
  // detection fence-robust:
  //   • a RUN OF ≥3 BACKTICKS is a MARKDOWN CODE-FENCE marker → emitted unchanged, NOT a template delimiter (this
  //     preserves the real code that lives BETWEEN ```-fences; the ≥3-run skip is load-bearing);
  //   • a SINGLE (or double) backtick opens a TEMPLATE STRING (mask mode); inside it every char is blanked to a space
  //     (newline preserved), and a backtick closes it (a run of exactly TWO backticks `` is an EMPTY template —
  //     nothing masked). A DEPTH-AWARE STACK (not a boolean toggle) tracks `${…}` interpolation: interpolation CODE is
  //     left READABLE, and a backtick inside it opens ANOTHER nested template (masked) — so a nested `${`throw`}` masks
  //     its inner string at ANY depth (the old boolean mis-closed on that inner backtick and re-laundered it); the
  //     bare `${}` interpolation delimiters that survive are stripped by classify() as no-op, so the body reads empty.
  // MONOTONICITY (P0/P2): this pass only ever ADDS masking to the SUPPRESSION copy; DETECTION reads the untouched
  // `masked`, so no crafted backtick input can REMOVE masking to re-enable suppression — the fix can only over-flag,
  // never launder. Length + newlines are preserved 1:1, so offsets map back to `masked`. (Verbatim the #67 helper added
  // to scan-code-null-deref.mjs / scan-code-resource-leak.mjs — a deferred shared-util consolidation, P7.)
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
  // Match the delimiter that closes the `open` at `openIdx` in `s`, counting nesting over the MASKED text (so
  // delimiters inside comments/strings — already masked — cannot skew the count). Returns the closing index, or
  // -1 if unbalanced.
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

  // A recognized logging call HEAD: console.<m>( , logger.<m>( , or a bare/method log( . Fixed set (P5).
  const LOG_HEAD = /(?:\b(?:console|logger)\s*\.\s*\w+|\blog)\s*\(/;
  // A HANDLE token: rethrow / recovery-return / promise reject / express next( . Its presence ⇒ the catch does
  // NOT merely swallow ⇒ CLEAN.
  const HANDLE = /\b(?:throw|return|reject)\b|\bnext\s*\(/;

  // Classify a catch body (given as the SUPPRESSION-masked text — maskedForSuppression) by first match (P5):
  // empty-catch | (CLEAN via handle) | log-only-catch | (CLEAN otherwise). Returns the kind string, or null for CLEAN.
  // The "empty" residual tests strip the BARE TEMPLATE DELIMITERS too: classify sees `maskedForSuppression`, where a
  // template literal's STRING interior is already blanked and only its structural delimiters survive — the backtick
  // `` ` `` AND the interpolation delimiters `${` … `}` (interpolation CODE is left readable by the depth-aware masker,
  // so a NESTED template `${`throw e`}` blanks its inner `throw e` but leaves the surrounding `${`/`}` readable). A body
  // that reduces to bare template/interpolation delimiters + whitespace evaluated a no-op template literal and did
  // NOTHING to handle the error, so it swallows. (Stripping these delimiters only ever makes "empty" MORE likely ⇒
  // over-flag, the monotone-safe direction — P0/P2; a real handler carries identifiers/calls whose letters + parens
  // survive the strip, so it never reads empty.)
  function classify(bodyMasked) {
    // 1. EMPTY — nothing but whitespace / stray semicolons / bare template + `${}` interpolation delimiters (interiors masked).
    if (bodyMasked.replace(/[\s;`${}]/g, "") === "") return "empty-catch";
    // 2. HANDLE token present → the catch propagates / recovers → CLEAN.
    if (HANDLE.test(bodyMasked)) return null;
    // 3. LOG-ONLY — remove every balanced logging-call expression (+ a trailing ;); if nothing substantive
    //    remains, the body did nothing but log.
    let rest = bodyMasked;
    for (;;) {
      const m = LOG_HEAD.exec(rest);
      if (!m) break;
      const parenOpen = m.index + m[0].length - 1; // the '(' of the log call
      const parenClose = matchDelim(rest, parenOpen, "(", ")");
      if (parenClose === -1) break; // unbalanced — bail (documented bound), leaves `rest` non-empty ⇒ CLEAN
      let after = parenClose + 1;
      while (after < rest.length && /\s/.test(rest[after])) after++;
      if (rest[after] === ";") after++;
      rest = rest.slice(0, m.index) + " ".repeat(after - m.index) + rest.slice(after);
    }
    if (rest.replace(/[\s;`${}]/g, "") === "") return "log-only-catch";
    // 4. Otherwise the body does real recovery work (an assignment / a non-log call) → CLEAN.
    return null;
  }

  // --- Scan ---------------------------------------------------------------------------------------------------
  // Find each `catch` clause on the MASKED text: `catch`, an optional `( … )` binding, then the body `{`. A
  // `catch` token inside a comment/string is already masked away and cannot match; a method `.catch(cb => {…})`
  // does not match (the `=>` breaks the `)`-then-`{` adjacency).
  const CATCH_RE = /\bcatch\b\s*(?:\([^)]*\))?\s*\{/g;
  const hits = [];
  let m;
  while ((m = CATCH_RE.exec(masked)) !== null) {
    const bodyOpen = m.index + m[0].length - 1; // index of the body's '{'
    const bodyClose = matchDelim(masked, bodyOpen, "{", "}");
    if (bodyClose === -1) continue; // unbalanced braces — cannot classify (documented bound)
    // SUPPRESSION read: classify() decides whether this body swallows, so it runs over `maskedForSuppression`
    // (template interiors blanked) — NOT `masked` — so a bare-backtick body can neither read non-empty nor supply a
    // fake HANDLE token that silences a real swallowed exception (P2; see maskTemplateInteriors). Offsets are 1:1, so
    // the SAME bodyOpen/bodyClose (from the detection brace-match over `masked`) bound the body in both copies.
    const bodyMasked = maskedForSuppression.slice(bodyOpen + 1, bodyClose);
    const kind = classify(bodyMasked);
    if (kind) hits.push({ line: lineAt(masked, m.index), kind });
    // Continue scanning AFTER this catch's head (nested try/catch inside the body is found on its own next pass).
  }

  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-swallowed-exception", scanText, process.argv.slice(2));
