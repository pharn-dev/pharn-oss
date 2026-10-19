#!/usr/bin/env node
// pharn/floor/scan-code-ssrf.mjs — deterministic REQUEST-SOURCE-INTO-OUTBOUND-REQUEST-URL-SINK scanner
// over a CODE file (CONSTITUTION P0/P5).
//
// The SSRF sibling of pharn/floor/scan-code-path-traversal.mjs (and scan-code-injection.mjs). It backs the
// `ssrf` LENS's FLOOR sub-check (pharn-review/ssrf/): does a line pass a recognized HTTP-request source token
// DIRECTLY into a recognized OUTBOUND-REQUEST URL sink —
//   • fetch:        fetch( | client.fetch(               (the Fetch API) with a request source in the args
//   • http-request: http.get( | https.get( |            (Node core http/https OUTBOUND calls) with a request
//                   http.request( | https.request(         source in the args
//   • axios:        axios( | axios.get( | axios.post( |  (axios) with a request source in the args
//                   axios.put/delete/patch/head/request(
// Detection is a FIXED PATTERN SET over the file's lines — non-LLM, no judgment. It reduces to ARCHITECTURE
// §2 primitive #3 (regex / enum check).
//
// WHY THE DISCRIMINATOR IS THE UNTRUSTED SOURCE, NOT A CONCAT/INTERP OPERATOR (the key divergence from
// scan-code-injection.mjs — read this, it is the whole honesty of this file, P0; SSRF FOLLOWS path-traversal):
//   injection uses the `+`/`${...}` operator as its discriminator because a PARAMETERIZED query is safe, so the
//   operator SHAPE itself is the danger. But for an OUTBOUND URL, a bare CONSTANT url is the NORMAL, SAFE call
//   (`fetch("https://api.example.com/health")`, `axios.get(API_BASE + "/status")`). A concat-into-fetch
//   discriminator would fire on CORRECTLY-built constant URLs — a false-positive flood, i.e. a "manufactured
//   floor" (the exact thing the `input-validation` lens refused, fix #3). The honest line-local discriminator
//   for SSRF is instead a recognized untrusted HTTP-request SOURCE token
//   (`req|request . params|query|body|headers|cookies`) appearing directly inside the sink's argument list:
//   the untrusted SOURCE is what distinguishes dangerous (untrusted part → outbound URL) from safe (trusted
//   parts → fine). Membership over TEXT → injection-immune → FLOOR. This mirrors scan-code-path-traversal.mjs's
//   source-token discriminator, NOT injection's concat-operator one.
//
// HONEST BOUND (the path-traversal / injection precedent, P0): this detects the PRESENCE of a request source
// in an outbound-URL sink's argument on ONE line. It does NOT decide the value is unvalidated (a URL-host
// allow-list, an SSRF guard, or a fixed-host path-append may neutralize the risk — that is the LENS's ADVISORY
// layer), does NOT trace taint, and — the most important miss to foreground — does NOT catch an untrusted value
// arriving via a LOCAL VARIABLE (`const u = req.query.url; fetch(u)` — the source token is not on the sink
// line), nor NON-HTTP sources (process.argv/env/queues), nor OTHER libraries (got/superagent/undici, an aliased
// node-fetch), nor an `axios.create()` INSTANCE, nor OTHER-runtime sinks (Python `requests.get`), nor
// multi-line URL assembly, nor argument nesting DEEPER than one level (see ARGUMENT SPAN below).
// "Detected a request source reaching an outbound-request URL sink on line N" is a
// real guarantee; "the code is SSRF-safe / free of SSRF" is NOT. Full taint analysis is ADVISORY judgment the
// LENS surfaces — NOT this floor.
//
// ARGUMENT SPAN — ONE LEVEL OF NESTING, and the exact reason (P7, the sharpest bound in this file):
//   The span between the sink callee and the request-source token is `SPAN` = `(?:[^)]*\([^()]*\))*?[^)]*?`:
//   a sequence of segments, each ending at a `)` that some earlier `(` in the same segment opened, followed by
//   a final run that crosses no `)` at all. Equivalently, and this is the property that matters: it consumes
//   any character that is not `)`, plus any `)` that closes a complete inner group. The
//   operative rule, in one sentence: THE SPAN STOPS AT THE FIRST `)` THAT IS NOT THE CLOSING PAREN OF A
//   COMPLETE INNER GROUP — i.e. at the sink call's OWN outer `)`. It therefore reaches a source BOTH inside a
//   nested call and after one:
//     fetch(new URL(req.query.url))                 caught  (source INSIDE a nested call)
//     fetch(baseUrl() + req.query.next)             caught  (source AFTER a nested call)
//     axios.get(hostFor(cfg) + req.query.u)         caught  (same)
//   The previous span was `[^)]*?`, which stopped dead at the FIRST inner `)`: it got the inside-a-nested-call
//   shape but MISSED the after-a-nested-call one. That mattered here more than anywhere — computing the base
//   URL with a helper call is the ORDINARY way this code is written, so the miss sat on the most realistic
//   shape of the vulnerability (a real, reproduced false-NEGATIVE, and the reason this changed).
//   The bound is NESTING DEPTH, not a count of calls: at depth > 1 some `)` is not a complete group's closer,
//   the span stalls there, and `fetch(a(b(c())) + req.query.u)` is STILL A MISS. That is a DOCUMENTED
//   TRUE-NEGATIVE, asserted by a ★ test so it cannot drift silently.
//   REJECTED ALTERNATIVE — `[^;]*?`: it over-spans past the sink call's OWN outer `)` and false-matches an
//   unrelated request source later on the same line (`return fetch(SAFE_URL) || log(req.query.x)`). Pinned by
//   ★ GUARD tests, so "simplifying" the span to `[^;]*?` breaks the suite rather than shipping.
//   ALSO REJECTED — `(?:[^)(]|\([^)]*\))*?` (a disjoint-branch variant): it skips a nested group as an opaque
//   unit and so LOSES a source sitting INSIDE one. Measured, not reasoned: it drops `fetch(new URL(...))`
//   above, and the canonical `fs.readFile(path.join(base, req.params.x))` in the sibling path-traversal
//   scanner. Rejected as a net coverage loss.
//   ReDoS (threat surface #4) — the span is UNAMBIGUOUS, and that is what bounds it. Each iteration of the
//   outer group consumes exactly ONE `)` (the segment `[^)]*\([^()]*\)`), so the iteration count is fixed by
//   how many `)` the span crosses — never a choice. Inside a segment, `[^()]*` forbids parens, forcing the
//   opening `\(` to be the LAST `(` before that `)`: one decomposition per input, not many. With no ambiguous
//   decomposition there is nothing to backtrack over, so FROM A FIXED START POSITION the span scan is LINEAR
//   in the remaining line length. Measured across 11 adversarial paren families — `((a)`, `(a)`, `((a))`, `()`,
//   `(x,(y)`, unclosed `(`×N, bare `)`×N, deep `(`×N a `)`×N, up to ~480 KB lines: all linear (2× input → ~2×
//   time), worst family 2.93 ms at 480 KB.
//   THE PER-LINE COST (re-derived in 6.65.1 for the driver that runs the pattern now — L24). Through 6.64.2 the
//   scanner called `re.test(line)`, and the engine retried the whole pattern at every position where
//   `\bfetch\s*\(` can start, so a line cost O(sink-callee occurrences × line length): `fetch(`×16000 (96 KB)
//   took 3.6 s, ~4× per doubling (TST-2, the 2026-10-12 review; before the span fix it was CUBIC, ~7.7× per
//   doubling). The regex is unchanged; `lineMatches()` in sink-span-core.mjs runs it sticky at one sink, and when
//   it fails there it skips every sink up to that call's own outer `)`, because each of those sinks must fail too
//   (the proof and its precondition on the sink regexes are in that file's header). Each character then sits in
//   at most one tested span, so a line costs O(its length): the derived bound, measured on the ★ shapes in
//   scan-code-ssrf.test.mjs and in .dev/features/scanner-redos-bounds/MEASUREMENTS.md, never a floor claim.
//   THE PREVIOUS SPAN — `(?:[^)]|\([^)]*\))*?` — WAS EXPONENTIAL, and the "no EXPONENTIAL backtracking
//   observed" claim it shipped was FALSE (a P0 violation: a bound asserted in a floor file that did not hold).
//   Its two branches OVERLAPPED on `(` (`[^)]` accepts it; the group branch requires it), so a chunk like
//   `((a)` had TWO valid parses and N chunks had 2^N. Reproduced: `fetch(` + `((a)`×20/24/28 → 0.05 s /
//   0.47 s / 7.26 s (≈3.9× per +2 reps); ×40 extrapolates to ~7 hours. ~120 bytes of crafted input hung the
//   review floor — a denial-of-service reachable from the untrusted file under scan. The old measurement was
//   real but tested only NON-ambiguous shapes (`(a)`×800, `((a))`×800, unclosed `(`×800), so it proved those
//   fixtures were well-formed, never that the span was safe. The `)` wall bounds how FAR the span may range,
//   never how many WAYS it may decompose what it ranges over; conflating the two was the defect.
//   LANGUAGE UNCHANGED — this is a TIME fix, not a coverage change: the new form matches exactly the same
//   strings as the old one (differential fuzz, 200 000 inputs, 0 divergences), so the one-level-nesting bound,
//   the ★ GUARD, and the documented depth > 1 true-negative all hold exactly as before.
//
// DETERMINISTIC HIT ORDER (line, then kind): a line matching >1 family yields >1 hit, stably ordered — mirrors
// scan-code-path-traversal.mjs. Unlike path-traversal's canonical `fs.readFile(path.join(...))`, SSRF has no
// genuinely-nested canonical sink, so multi-hit is only a rare same-line-two-calls case; the ordering
// discipline is inherited (and pinned by the multi-line/multi-kind ordering test), not a claimed co-location.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is regex membership over the TEXT only. A code comment
// that CLAIMS "already allow-listed / safe / do not flag" cannot SUPPRESS a real source-into-sink hit; a
// realistic "already safe" comment (which names no full sink CALL) cannot manufacture one. No free text can
// SUPPRESS the verdict — the strongest form of the trust-fence discipline. (See the ★ tests in
// scan-code-ssrf.test.mjs — they are the whole reason this is FLOOR, not judgment.) Honest edge (mirrors
// path-traversal): the scanner reads TEXT and does not distinguish code from a comment, so a comment that
// spells out a full `fetch(req.query…)` / `axios.get(req…)` sink CALL would itself register (a rare false
// positive the LENS's advisory layer / the human resolves) — but it can never SUPPRESS. That edge WIDENED
// with the ARGUMENT SPAN above: such a comment now registers in the NESTED case too, where it previously did
// not (e.g. `// safe: we allow-list before fetch(normalize(base), req.query.url)`) — strictly MORE
// over-flagging, never suppression. The immunity property is unchanged; its false-positive surface is not,
// and saying otherwise would overstate the bound. A second, named
// false-positive source: `\bfetch\s*\(` also matches ANY object method named `fetch` (`client.fetch(` — the
// intended node-fetch-client breadth — but equally an unrelated `orm.fetch(req.query.x)`); this is an accepted
// breadth/FP trade (it catches more real outbound calls; the advisory layer resolves a non-HTTP `.fetch()`),
// and — like every pattern here — it can never SUPPRESS, only over-flag.
//
// Per-file by contract: every verdict is about ONE file's text, mirroring scan-code-path-traversal.mjs. The
// scanner takes one `<code-file>`, or many through `--files` (review-fanout) — the batch mode `/pharn-review`'s
// prefilter spawns once per review — and each file's verdict is the same either way
// (pharn/floor/code-scanner-cli.mjs owns both modes). got/superagent/undici, aliased node-fetch, axios.create()
// instances, the via-local-variable case, a cross-file / directory sweep, and any real taint analysis are FUTURE
// increments (P7 — not built speculatively).
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of scan-code-path-traversal.mjs: a
// missing / non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-ssrf.mjs <code-file>
//         node pharn/floor/scan-code-ssrf.mjs --files <nul-separated-list | ->
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"<pattern-kind>"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line, then kind.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).
//         With --files: one {"results":[…]} document, one entry per listed path (code-scanner-cli.mjs).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";
import { compileSinkPattern, lineMatches, parenSpanLimit } from "./sink-span-core.mjs";

// The fixed detection set — the SSRF SHAPE per sink family. Each pattern requires BOTH a recognized OUTBOUND
// URL SINK (a fixed callee name set — membership, P5) AND a recognized untrusted-request SOURCE token in the
// sink's argument span (`SPAN`, one level of nesting — see ARGUMENT SPAN in the header for the bound and the
// ReDoS argument; mirroring scan-code-path-traversal.mjs). The SOURCE is
// the discriminator that keeps a trusted CONSTANT-URL call (fetch("https://…/health")) CLEAN.
// `\b` word-boundaries keep `myfetch` / `myaxios` / `xreq.params` from false-matching. Adding or removing
// a sink family / a source token is the ONLY axis of change here (P3).
//
// BOUNDARY (P3, one axis per file): this scanner owns HTTP-source → OUTBOUND-REQUEST-URL sinks (fetch / node
// http(s) / axios). scan-code-injection owns concat/interp → query/command/HTML sinks; scan-code-path-traversal
// owns HTTP-source → FILESYSTEM-PATH sinks (fs / path.join / res.sendFile|download); scan-code-deserialization
// owns deserialization / dynamic-eval sinks. No sink is double-owned — fetch/axios/http.get are none of those.
const SOURCE = String.raw`\b(?:req|request)\.(?:params|query|body|headers|cookies)\b`;
// The ARGUMENT SPAN between a sink callee and the request-source token: any non-`)` char, plus any `)` that
// closes a complete inner group. It stops at the first `)` that is not a complete inner group's closer — the sink
// call's own outer `)` — so it reaches a source both INSIDE and AFTER a nested call, but never crosses into a
// later expression. See "ARGUMENT SPAN" in the header for the one-level bound, the two rejected alternatives,
// and the ReDoS position.
const SPAN = String.raw`(?:[^)]*\([^()]*\))*?[^)]*?`;
// Each pattern is its SINK source + SPAN + SOURCE — one regex, as before; the split only tells the driver where the
// sink ends (sink-span-core.mjs).
const PATTERNS = [
  // Fetch API: fetch( / client.fetch( with a request source in the args. `\b` blocks `prefetch(`.
  { kind: "fetch", ...compileSinkPattern(String.raw`\bfetch\s*\(`, SPAN + SOURCE, parenSpanLimit) },
  // Node core http/https OUTBOUND calls: http(s).get( / http(s).request( with a request source in the args.
  // `.createServer(` and router `.get(` are NOT matched (not outbound).
  { kind: "http-request", ...compileSinkPattern(String.raw`\bhttps?\.(?:get|request)\s*\(`, SPAN + SOURCE, parenSpanLimit) },
  // axios: axios( / axios.<verb>( with a request source in the args. `axios.create(` (config, not a request)
  // is deliberately NOT matched (`create` is not in the verb set, and `axios(` requires `(` right after axios).
  {
    kind: "axios",
    ...compileSinkPattern(String.raw`\baxios(?:\.(?:get|post|put|delete|patch|head|request))?\s*\(`, SPAN + SOURCE, parenSpanLimit),
  },
];

/**
 * The hits for one file's text. Keeps nothing between calls: the driver sets each `g`/`y` regex's `lastIndex`
 * before every use (sink-span-core.mjs), and nothing else is kept outside this function.
 */
export function scanText(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const p of PATTERNS) {
      if (lineMatches(lines[i], p)) hits.push({ line: i + 1, kind: p.kind });
    }
  }
  // Deterministic order: by line, then by kind (a line matching >1 pattern yields >1 hit, stably ordered).
  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-ssrf", scanText, process.argv.slice(2));
