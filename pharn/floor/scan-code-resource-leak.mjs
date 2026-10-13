#!/usr/bin/env node
// pharn/floor/scan-code-resource-leak.mjs — deterministic UNCLOSED-RESOURCE scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-null-deref.mjs / scan-code-swallowed-exception.mjs in the scan-code-* family.
// Where those back the null-deref / swallowed-exception LENSes' FLOOR sub-checks, this one backs the
// `resource-leak` LENS's FLOOR sub-check (pharn-review/resource-leak/): a resource BOUND from a known
// open/connect/stream acquisition API whose binding is never cleaned up — no close call on the binding, not a
// `using` (RAII) declaration. Detection is a FIXED, non-LLM procedure: a comment/string MASK, a binding-assignment
// regex over a FIXED acquisition-method set, a paren-match of the acquisition call, and a FIXED cleanup-method
// membership test on the BOUND NAME. It reduces to ARCHITECTURE §2 primitive #3 (regex / enum / text membership).
//
// THE SHAPE (obvious cases only): `const|let|var NAME = [await] (recv.)*OPEN( … )` where OPEN is a fixed
// acquisition-method set. A HIT iff, in the masked text AFTER the binding, NAME is NEVER the receiver of a cleanup
// call (`NAME.close(` / `.end(` / `.destroy(` / …) and NEVER an argument of a cleanup call (`fs.closeSync(NAME)`),
// AND the declaration is not a `using` / `await using` binding (which auto-disposes, RAII). This is BINDING-ANCHORED
// like null-deref — the cleanup test matches the SPECIFIC binding token (`NAME.close(`), NOT a bare word (`close`)
// that prose could supply. Binding-anchoring PLUS masking template-literal string content in the SUPPRESSION copy
// (maskTemplateInteriors) is what makes it prose-robust and injection-immune: no free text — a comment OR a
// backtick literal — can supply a fake `NAME.close(`.
//
// SCOPE, STATED PRECISELY (P0 — the null-deref honesty): the absence test is FILE-LEVEL and NAME-TRACKED — "no
// cleanup of NAME anywhere in THIS file, after the binding." It is NOT lexical block/function-scope analysis and
// NOT ownership/control-flow analysis. "This file binds a resource from the fixed API set and never cleans that
// binding up in-file" is a real guarantee; "the resource leaks" / "no resource leaks" is NOT.
//
// HONEST BOUND (the null-deref / swallowed-exception precedent, P0 — false neg/pos, stated not hidden):
//   • LANGUAGE / SHAPE SCOPE: JS/TS `const|let|var|using NAME = [await] (recv.)*OPEN(` shapes only. A bare
//     `fs.openSync(p)` with NO binding, a resource opened AFTER construction (`const c = new Client(); c.connect()`
//     — the OPEN is not in the initializer), a Python `open()`, or a destructured bind → found:false — a scope
//     limit, NOT a "clean" verdict.
//   • FIXED OPEN SET { open, openSync, createReadStream, createWriteStream, createConnection, connect,
//     createStream, createSocket }: a custom acquirer (`pool.acquire()`, `new Database()`) is a false-negative
//     (deferred to the advisory layer / a future increment, P7). The bare broad names `open`/`connect`/
//     `createStream` (optional receiver) can over-match a non-resource `const modal = open(...)` → a HIT the
//     advisory layer owns ("is this actually a resource / does close happen elsewhere?").
//   • FIXED CLEANUP SET { close, closeSync, end, destroy, disconnect, release }: a custom disposer
//     (`dispose(res)`, `res.free()`) is not recognized → the binding reads as unclosed (a HIT the advisory layer
//     owns). Conversely, `end` is treated as closing (stream/socket semantics). `unref()` is deliberately NOT in
//     the set — it de-refcounts a handle from the event loop, it does NOT close/dispose it, so an unref'd-but-
//     never-closed resource is correctly still flagged (a resource-leak review finding, addressed).
//   • A bare `finally` block is NOT itself cleanup — only a detected cleanup CALL on the binding counts. A
//     try/finally whose finally does not close THIS binding (an empty finally, or one that closes a different
//     object) still flags the open. (Correct, but noted: the `finally` keyword carries no weight; the close call
//     on NAME does.)
//   • ARGUMENT-FORM CLEANUP is lenient: `(close|end|destroy|…)( … NAME … )` counts NAME appearing ANYWHERE in a
//     cleanup call's args as cleanup, so `end(wrap(NAME))` (which merely READS NAME) reads as CLEAN — a
//     false-negative in the conservative (under-flagging) direction, acceptable for an advisory lens.
//   • NOT SCOPE-AWARE: a same-named shadow binding, a `NAME.close()` in an unrelated branch, `obj.NAME.close()`
//     (a property that shares the name), or a `}` / `)` inside a template/regex literal in the scanned span can
//     skew the result. THIS IS NOT OWNERSHIP / CONTROL-FLOW ANALYSIS.
//   • Only `//`, `/* */` comments and single-line '…' / "…" strings are masked FOR DETECTION; a BACKTICK
//     template literal is left intact there — deliberately, so DETECTION is ROBUST over a MARKDOWN eval fixture
//     (```-fenced code + inline `code` prose), exactly as the sibling scanners are. The SUPPRESSION clause
//     additionally masks template-literal STRING content over a second copy (maskTemplateInteriors), so backtick
//     text cannot silence a real unclosed binding. Quote-masking stops at end-of-line, so a stray
//     apostrophe/quote in surrounding prose cannot bleed into the fenced code.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): DETECTION is regex + paren-match + fixed-set membership over the
// comment/string-MASKED text, with template literals left INTACT so it survives ```-fenced markdown fixtures.
// The SUPPRESSION clause (isCleanedUp) runs over a SECOND copy in which template-literal STRING content is ALSO
// masked (see maskTemplateInteriors). So no free text — a // or /* */ comment, a single/double-quoted string, OR
// a template-literal's text — can manufacture a `NAME.close(` and suppress a real unclosed binding; a comment
// CLAIMING a leak over a binding that IS closed cannot manufacture a hit. The suppression masking is MONOTONE: it
// only ADDS masking to the suppression copy (a SUPERSET of what `masked` blanks) and never touches detection's
// `masked`, so the fix strictly NARROWS the laundering surface, never widens it, and can only over-flag. No
// template-literal STRING content at ANY nesting depth — single OR nested `${…}`, the V1/V2 attack surface — can
// manufacture a `NAME.close(` (interpolation CODE stays readable, so a real `${fd.close()}` correctly reads clean).
// DOCUMENTED RESIDUAL (the price of fence-robustness): a run of ≥3 backticks is a MARKDOWN CODE-FENCE marker, so a
// ≥3-backtick-wrapped token is read as CODE — correct over a .md fixture (fenced content IS the code under
// review), a narrow residual in raw .js (the invalid 3-adjacent-template form), far narrower than the pre-fix
// any-backtick hole. Within that boundary the suppression search is injection-immune by construction. (See the ★
// tests in scan-code-resource-leak.test.mjs — the backtick-laundering immunity case AND the ≥3-backtick residual
// bound — the whole reason this is FLOOR, not judgment.)
//
// Per-file by contract: every verdict is about ONE file's text, mirroring the sibling scanners. The scanner takes
// one `<code-file>`, or many through `--files` (review-fanout) — the batch mode `/pharn-review`'s prefilter
// spawns once per review — and each file's verdict is the same either way (pharn/floor/code-scanner-cli.mjs owns
// both modes). A cross-file / directory sweep, cross-file close tracking, and real ownership analysis are FUTURE
// increments (P7 — not built speculatively); the lens surfaces the rest as advisory.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the sibling scanners: a missing /
// non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-resource-leak.mjs <code-file>
//         node pharn/floor/scan-code-resource-leak.mjs --files <nul-separated-list | ->
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"unclosed-resource"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line. `line` is the
//         BINDING (acquisition) line — the fix site where a close / finally / using belongs — never a comment line.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).
//         With --files: one {"results":[…]} document, one entry per listed path (code-scanner-cli.mjs).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Produce a copy of `src` in which every character inside a // line comment, a /* block */ comment, or a
// single-line '…' / "…" string is replaced by a space — EXCEPT newlines, which are preserved so 1-based line
// numbers and character offsets map 1:1 back to the original. Code tokens survive; a keyword/binding/needle
// hidden in a comment or single-line string does not. Same single-pass mini-lexer as scan-code-null-deref.mjs
// (accepted, deferred duplication of the shared idiom — consolidation is a separate axis, P7).
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
  // ```-fenced code in a MARKDOWN eval fixture. But the SUPPRESSION clause (isCleanedUp) must NOT read a template
  // literal's STRING content as code — otherwise untrusted backtick text supplies a fake `NAME.close(` and
  // silences a real unclosed binding (taint laundering INTO the enum-gated verdict, P2). So the suppression clause
  // runs over THIS second copy, in which template-literal interiors are ALSO blanked. Two rules keep detection
  // fence-robust:
  //   • a RUN OF ≥3 BACKTICKS is a MARKDOWN CODE-FENCE marker → emitted unchanged, NOT a template delimiter (this
  //     preserves the real code that lives BETWEEN ```-fences; a naive "blank everything between backticks" masker
  //     would blank the whole fenced block and break detection — the ≥3-run skip is load-bearing);
  //   • a SINGLE (or double) backtick opens a TEMPLATE STRING (mask mode); inside it every char is blanked to a space
  //     (newline preserved), and a backtick closes it (a run of exactly TWO backticks `` is an EMPTY template —
  //     nothing masked). A DEPTH-AWARE STACK (not a boolean toggle) tracks `${…}` interpolation: interpolation CODE is
  //     left READABLE, and a backtick inside it opens ANOTHER nested template (masked) — so a nested `${`fd.close()`}`
  //     masks its inner string at ANY depth (the old boolean mis-closed on that inner backtick and re-laundered it).
  // A real cleanup call in interpolation code (e.g. `${fd.close()}`) reads as code and correctly closes the resource;
  // only template-STRING text is masked. MONOTONICITY (P0/P2):
  // this pass only ever ADDS masking to the SUPPRESSION copy; DETECTION reads the untouched `masked`, so no crafted
  // backtick input can REMOVE masking to re-enable suppression — the fix can only over-flag, never launder. Length
  // + newlines are preserved 1:1, so offsets map back to `masked`.
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

  // FIXED set of resource-acquisition methods (P5). The binding initializer must be `[await] (recv.)*OPEN(`.
  const OPEN = "open|openSync|createReadStream|createWriteStream|createConnection|connect|createStream|createSocket";
  // FIXED set of cleanup methods (P5) — presence (as a call on / with the BOUND NAME) ⇒ the resource is cleaned up.
  const CLEANUP = "close|closeSync|end|destroy|disconnect|release";
  const CLEANUP_ARG = "close|closeSync|end|destroy|disconnect|release"; // argument-form heads (e.g. fs.closeSync(fd))

  // \b(DECL) NAME = [await] (ident(.ident)*.)? OPEN (
  // DECL captures the declaration keyword so a `using` / `await using` (RAII auto-dispose) binding classifies CLEAN.
  const ASSIGN_RE = new RegExp(
    "\\b(const|let|var|using|await\\s+using)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:await\\s+)?" +
      "(?:[A-Za-z_$][\\w$]*(?:\\s*\\.\\s*[A-Za-z_$][\\w$]*)*\\s*\\.\\s*)?(?:" +
      OPEN +
      ")\\s*\\(",
    "g"
  );

  // Is `name` cleaned up anywhere after `searchStart`? Receiver form `NAME.close(` OR argument form
  // `close( … NAME … )`. Fixed-set membership (P5). Lenient by design (see HONEST BOUND). SUPPRESSION scans
  // `maskedForSuppression` (template interiors blanked) — NOT `masked` — so a backtick literal's text can never
  // supply a fake `NAME.close(` that silences a real unclosed binding (P2; see maskTemplateInteriors).
  function isCleanedUp(name, searchStart) {
    const esc = escapeRe(name);
    const rest = maskedForSuppression.slice(searchStart);
    const receiver = new RegExp("\\b" + esc + "\\s*\\.\\s*(?:" + CLEANUP + ")\\s*\\(");
    const argForm = new RegExp("\\b(?:" + CLEANUP_ARG + ")\\s*\\([^)]*\\b" + esc + "\\b");
    return receiver.test(rest) || argForm.test(rest);
  }

  // --- Scan ---------------------------------------------------------------------------------------------------
  const hits = [];
  let m;
  while ((m = ASSIGN_RE.exec(masked)) !== null) {
    const decl = m[1];
    const name = m[2];
    // `using` / `await using` (explicit resource management) auto-disposes at scope exit ⇒ CLEAN, deterministically.
    if (/using/.test(decl)) continue;
    const callOpen = m.index + m[0].length - 1; // the '(' of the acquisition call
    const callClose = matchDelim(masked, callOpen, "(", ")");
    if (callClose === -1) continue; // unbalanced — cannot bound the initializer (documented bound)
    if (!isCleanedUp(name, callClose + 1)) {
      hits.push({ line: lineAt(masked, m.index), kind: "unclosed-resource" });
    }
  }

  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-resource-leak", scanText, process.argv.slice(2));
