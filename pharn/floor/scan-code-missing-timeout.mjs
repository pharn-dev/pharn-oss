#!/usr/bin/env node
// pharn/floor/scan-code-missing-timeout.mjs — deterministic NO-TIMEOUT network/db-call scanner over a CODE file (CONSTITUTION P0/P5).
//
// A sibling of pharn/floor/scan-code-resource-leak.mjs / scan-code-off-by-one.mjs in the scan-code-* family. Where
// resource-leak backs the resource-leak LENS's FLOOR sub-check, this one backs the `missing-timeout` LENS's FLOOR
// sub-check (pharn-review/missing-timeout/): a call to a KNOWN network/db API whose OWN argument span carries no
// timeout indicator. Detection is a FIXED, non-LLM procedure: a comment/string MASK, a call-head regex over a FIXED
// call set, a paren-match of the call's argument span, and a FIXED timeout-indicator-token membership test over
// those args. It reduces to ARCHITECTURE §2 primitive #3 (regex / paren-match / text membership).
//
// THE SHAPE (obvious cases only), CALL-ANCHORED (not binding-anchored):
//   HTTP-client:  fetch( … )  |  axios( … )  |  axios.<get|post|put|patch|delete|head|options|request>( … )
//                 |  http.<get|request>( … )  |  https.<get|request>( … )
//   db:           <recv>.query( … )   where recv ∈ { db, pool, client, conn, connection, database, knex, sql }
// A HIT iff, in the MASKED args of such a call, NONE of the indicator tokens
//   { timeout, signal, statement_timeout, query_timeout, maxTimeMS }
// appears. The indicator test matches SPECIFIC tokens inside the call's OWN paren-matched args — NOT a bare word that
// prose or an injected comment could supply. That is what makes it prose-robust and injection-immune.
//
// WHY THESE ANCHORS (P0 — the FP-avoidance is deliberate): the call set is anchored on LIBRARY / RECEIVER tokens
// (`fetch`, `axios`, `http`, `https`, and a fixed db-receiver allowlist), NEVER bare verbs (`get`/`post`/`query` on
// any receiver). So an Express ROUTE `app.get('/x', h)` / `router.post(...)` — a bare `.get`/`.post` on a non-net
// receiver — is NOT matched; only `http.get(`/`https.get(`/`axios.get(` are. Array/DOM have no `.query(`, and the
// db-receiver allowlist bounds `.query(` over-match. `axios.create({timeout})` is NOT matched (`create` ∉ the method
// set and there is no bare `axios(` there), so a pre-configured instance is not mis-flagged at its creation site.
//
// SCOPE, STATED PRECISELY (P0 — the resource-leak honesty): the indicator test is CALL-LOCAL — "no timeout token in
// THIS call's own args." It is NOT ownership/config/control-flow analysis. "This call to a fixed-set API passes no
// in-args timeout indicator" is a real guarantee; "the call has no timeout" / "the code has reliable timeouts" is NOT.
//
// HONEST BOUND (false neg/pos, stated not hidden — v0.1.0, the whole point is to not oversell):
//   • FIXED CALL SET: `got()`, `request()`, `superagent`, `ky()`, `$.ajax()`, an SDK client, and axios calls on a
//     NAMED INSTANCE (`const api = axios.create(...); api.get(url)` — receiver `api`, not `axios`) are false-negatives
//     — deferred to the advisory layer / a future increment (P7). The named-instance case is the COMMON axios pattern:
//     real-world axios coverage here is only the literal `axios.`/`axios(` receiver.
//   • DB is CALL-LOCAL: db timeouts are frequently set at the POOL/CONNECTION (`new Pool({ query_timeout })`) or via
//     SQL (`SET statement_timeout`), NOT in the `.query()` args — so many legitimate `pool.query(sql)` calls read as a
//     HIT (a FALSE-POSITIVE the advisory layer owns: "is a pool/connection timeout in force?"). The db-receiver
//     allowlist `client`/`connection` can also match a non-SQL `.query(` (e.g. an Apollo GraphQL `client.query({query})`
//     — a network call with a different timeout mechanism). Non-`.query(` ORM forms (`prisma.user.findMany`,
//     `Model.find(...).maxTimeMS()`) are out of scope.
//   • LENIENT INDICATOR: ANY of { timeout, signal, statement_timeout, query_timeout, maxTimeMS } anywhere in the args
//     ⇒ CLEAN (under-flagging, conservative). A `signal` used ONLY for manual cancellation (not a timeout) reads as
//     clean; a timeout set globally (`axios.defaults.timeout`), via an agent (`new http.Agent({ timeout })`), via a
//     wrapping `Promise.race`/`setTimeout`, or via a positionally-passed AbortController is NOT seen by the call-local
//     scan (a HIT the advisory layer owns). This is exactly the brief's stated advisory: "whether timeout set elsewhere."
//   • Only `//`, `/* */` comments and single-line '…' / "…" strings are masked FOR DETECTION. A BACKTICK template
//     literal is left INTACT there (family idiom — so DETECTION is ROBUST over a MARKDOWN eval fixture: ```-fenced
//     code + inline `code`). But the SUPPRESSION read — the timeout-INDICATOR test over the call's args — runs over a
//     SECOND copy in which template-literal STRING content is ALSO masked (maskTemplateInteriors), so a template-arg
//     containing the TEXT of an indicator token (e.g. db.query(`WHERE note = timeout`)) can no longer read as CLEAN
//     and SUPPRESS a real no-timeout hit. (A backtick URL/arg is still read as code for DETECTION — an over-flag, the
//     safe direction; the ONLY residual is the ≥3-backtick fence marker, documented below.)
//   • NOT SCOPE-AWARE: a `}` / `)` inside a template/regex literal within a call's arg span can skew the paren-match;
//     an unbalanced call is skipped (documented bound). SINGLE-FILE; JS/TS-ish shapes.
//
// COST (re-derived for 6.71.2 from this code, not carried over — the 6.71.0 form was quadratic): through 6.71.0 each
// call re-scanned to EOF for its `)` (so `fetch(`×N unbalanced was O(N²)), re-sliced and re-tested its whole argument
// span (so `fetch(fetch(…))` nested N deep was O(N²)), and counted newlines from offset 0 for its line (O(hits ×
// length)). Now the masks, the paren pairing, the indicator-start list and the newline list are each ONE forward pass,
// and each call costs O(log n): one array read for its `)`, one binary search for an indicator start inside its span,
// one for its line. CALL_RE and INDICATOR_RE each start on a literal keyword at `\b`, and their only variable parts
// (`\s*` runs) give back at most their own run, so the regex scans stay linear in the file. Per file: O(n log n) in the
// worst case, measured linear (.dev/features/scanner-redos-sweep-2/MEASUREMENTS.md). The ★ ReDoS rows in
// scan-code-missing-timeout.test.mjs pin the measured shapes as a membership verdict (completed vs killed under a
// timeout), and scan-code-missing-differential.test.mjs pins every finding equal to a frozen 6.71.0 copy over a corpus
// that is deterministic for a given tree (it includes every .mjs under pharn/floor/) — evidence, not a proof; this paragraph's equivalence arguments are in the comments at each step.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): DETECTION (the call-head regex + paren-match) runs over `masked` with
// template literals INTACT, so it survives ```-fenced markdown fixtures. The SUPPRESSION read — the fixed-token
// INDICATOR membership test over the call's args — runs over a SECOND copy in which template-literal STRING content
// is ALSO masked (see maskTemplateInteriors). So no free text — a // or /* */ comment, a single/double-quoted string,
// OR a template-literal's text — can SUPPRESS a real no-timeout `fetch(url)` / `db.query(sql)` hit (a backtick
// indicator token is blanked in the suppression copy), and a comment CLAIMING a missing timeout cannot MANUFACTURE a
// hit over a call that passes `{ timeout }`. The suppression masking is MONOTONE: it only ADDS masking to the
// suppression copy (a SUPERSET of what `masked` blanks) and never touches detection's `masked`, so the fix strictly
// NARROWS the laundering surface and can only over-flag, never launder. No template-literal STRING content at ANY
// nesting depth — single OR nested `${…}`, the attack surface — can suppress a real hit (interpolation CODE stays
// readable, so a real `${timeout}` variable reads as an indicator exactly as a bare `timeout` arg would). DOCUMENTED
// RESIDUAL (the price of fence-robustness): a run
// of ≥3 backticks is a MARKDOWN CODE-FENCE marker, so a ≥3-backtick-wrapped indicator token is read as CODE (an arg
// indicator) — correct over a .md fixture (fenced content IS the code under review), a narrow residual in raw .js.
// (See the ★ tests in scan-code-missing-timeout.test.mjs — the backtick-laundering immunity case AND the ≥3-backtick
// residual bound — the whole reason this is FLOOR, not judgment.)
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of the sibling scanners: a missing / non-file
// target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-missing-timeout.mjs <code-file>
//         node pharn/floor/scan-code-missing-timeout.mjs --files <nul-separated-list | ->   (review-fanout: the batch
//         mode /pharn-review's prefilter spawns once per review — one {"results":[…]} document, one entry per listed
//         path, each the per-file verdict below; pharn/floor/code-scanner-cli.mjs owns both modes)
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"missing-timeout"},...]} on stdout; exit 0 on a successful
//         scan (whatever the result). `found` === (hits.length > 0); hits sorted by line. `line` is the CALL line —
//         the fix site where a timeout / signal / abort belongs — never a comment line. Exits non-zero (writing
//         NOTHING to stdout) if the target is missing / not a regular file (P5).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// --- Comment/string MASK ------------------------------------------------------------------------------------
// Same single-pass mini-lexer as scan-code-resource-leak.mjs (accepted, deferred duplication of the shared idiom —
// consolidation is a separate axis, P7). Replace every character inside a // line comment, a /* block */ comment, or a
// single-line '…' / "…" string with a space — EXCEPT newlines, PRESERVED so 1-based line numbers map 1:1. BACKTICKS
// are NOT string delimiters here (no template masking) — so markdown fences / inline `code` in an eval fixture are read
// as ordinary text; '…' / "…" masking STOPS AT END-OF-LINE so a stray prose quote cannot bleed the mask into fenced code.
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
 * The hits for one file's text. Keeps nothing between calls: everything below — the masks, the `g` call regex, the
 * hits — is created inside this function, once per file.
 */
export function scanText(text) {
  const masked = mask(text);

  // --- Suppression-only template-interior MASK ----------------------------------------------------------------
  // DETECTION (CALL_RE + the paren-match, below) runs over `masked` with template literals INTACT, so it survives
  // ```-fenced code in a MARKDOWN eval fixture. But the SUPPRESSION read (the timeout-INDICATOR test over the call's
  // args) must NOT read a template literal's STRING content as code — otherwise untrusted backtick text supplies a fake
  // indicator token and silences a real no-timeout call (taint laundering INTO the enum-gated verdict, P2). So the
  // indicator test runs over THIS second copy, in which template-literal interiors are ALSO blanked. Two rules keep
  // detection fence-robust:
  //   • a RUN OF ≥3 BACKTICKS is a MARKDOWN CODE-FENCE marker → emitted unchanged, NOT a template delimiter (this
  //     preserves the real code that lives BETWEEN ```-fences; the ≥3-run skip is load-bearing);
  //   • a SINGLE (or double) backtick opens a TEMPLATE STRING (mask mode); inside it every char is blanked to a space
  //     (newline preserved), and a backtick closes it (a run of exactly TWO backticks `` is an EMPTY template —
  //     nothing masked). A DEPTH-AWARE STACK (not a boolean toggle) tracks `${…}` interpolation: interpolation CODE is
  //     left READABLE, and a backtick inside it opens ANOTHER nested template (masked) — so a nested `${`timeout`}`
  //     masks its inner string at ANY depth (the old boolean mis-closed on that inner backtick and re-laundered it).
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

  // --- Helpers (each computed ONCE per file — see "COST" below) ------------------------------------------------
  // closeOf[i] = the index of the `)` that closes the `(` at i in `masked`, or -1 if that `(` is unbalanced. One
  // forward pass with a stack: a `(` pushes, a `)` pops and pairs. A `)` that finds the stack EMPTY is skipped — every
  // `(` to its left is already paired, so it can close none of them. This is exactly what the per-open depth scan of
  // 6.71.0 returned (the first index after the `(` where the count of `(` minus `)` falls back to 0), and an open left
  // on the stack at EOF is exactly one whose depth never returns to 0 — that scan's -1.
  const closeOf = new Int32Array(masked.length).fill(-1);
  {
    const stack = [];
    for (let i = 0; i < masked.length; i++) {
      const ch = masked[i];
      if (ch === "(") stack.push(i);
      else if (ch === ")" && stack.length) closeOf[stack.pop()] = i;
    }
  }

  // newlineAt = every `\n` offset in `masked`, ascending (mask() keeps every newline at its own index, so these are the
  // original file's line breaks). firstAtOrAbove(a, x) = the number of entries of the ascending array a below x.
  const newlineAt = [];
  for (let i = masked.indexOf("\n"); i !== -1; i = masked.indexOf("\n", i + 1)) newlineAt.push(i);
  function firstAtOrAbove(a, x) {
    let lo = 0;
    let hi = a.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (a[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  const lineAt = (idx) => 1 + firstAtOrAbove(newlineAt, idx);

  // --- Fixed call set + indicator set (P5) --------------------------------------------------------------------
  // Call-head regex, anchored on LIBRARY / RECEIVER tokens (never a bare verb). The optional axios method group makes
  // both `axios(` and `axios.get(` match while `axios.create(` does NOT (create ∉ the set, and no bare `axios(` there).
  const CALL_RE = new RegExp(
    "\\b(?:" +
      "fetch" +
      "|axios(?:\\s*\\.\\s*(?:get|post|put|patch|delete|head|options|request))?" +
      "|https?\\s*\\.\\s*(?:get|request)" +
      "|(?:db|pool|client|conn|connection|database|knex|sql)\\s*\\.\\s*query" +
      ")\\s*\\(",
    "g"
  );
  // FIXED, LENIENT timeout-indicator token set — presence of ANY (as a whole word in the call's args) ⇒ the call is CLEAN.
  // Run `g` over the whole SUPPRESSION copy ONCE; `indicatorAt` holds every match's start, ascending. No `u` / `i` flag,
  // deliberately: `\b` is the ASCII word boundary of 6.71.0's per-call `INDICATOR_RE.test(args)`, which this replaces.
  const INDICATOR_RE = /\b(?:timeout|signal|statement_timeout|query_timeout|maxTimeMS)\b/g;
  const indicatorAt = [];
  for (let im; (im = INDICATOR_RE.exec(maskedForSuppression)) !== null;) indicatorAt.push(im.index);

  // --- Scan ---------------------------------------------------------------------------------------------------
  const hits = [];
  let m;
  while ((m = CALL_RE.exec(masked)) !== null) {
    const callOpen = m.index + m[0].length - 1; // the '(' of the matched call
    const callClose = closeOf[callOpen];
    if (callClose === -1) continue; // unbalanced — cannot bound the args (documented bound)
    // SUPPRESSION read: the indicator test runs over `maskedForSuppression` (template interiors blanked) — NOT `masked`
    // — so a backtick arg's TEXT can never supply a fake indicator token that silences a real no-timeout call (P2; see
    // maskTemplateInteriors). Offsets are 1:1, so the SAME callOpen/callClose bound the args in both copies.
    // "Some indicator match starts in [callOpen + 1, callClose)" is the same test as 6.71.0's
    // `INDICATOR_RE.test(maskedForSuppression.slice(callOpen + 1, callClose))`: every alternative is word characters
    // between two `\b`, so a match is a whole maximal word run; and the characters at callOpen and callClose are `(` /
    // `)` or a template blank in the suppression copy — non-word either way — so a word run inside the slice is a
    // whole word in the file and the slice edges add or remove no `\b`.
    const k = firstAtOrAbove(indicatorAt, callOpen + 1);
    if (!(k < indicatorAt.length && indicatorAt[k] < callClose)) {
      hits.push({ line: lineAt(m.index), kind: "missing-timeout" });
    }
  }

  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-missing-timeout", scanText, process.argv.slice(2));
