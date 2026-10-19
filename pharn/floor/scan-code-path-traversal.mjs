#!/usr/bin/env node
// pharn/floor/scan-code-path-traversal.mjs — deterministic REQUEST-SOURCE-INTO-FILESYSTEM-PATH-SINK scanner
// over a CODE file (CONSTITUTION P0/P5).
//
// The path-traversal sibling of pharn/floor/scan-code-injection.mjs and pharn/floor/scan-code-deserialization.mjs.
// It backs the `path-traversal` LENS's FLOOR sub-check (pharn-review/path-traversal/): does a line pass a
// recognized HTTP-request source token DIRECTLY into a recognized filesystem-path sink —
//   • fs-path:   fs.<m>( | fs.promises.<m>( | fsPromises.<m>(   (any Node filesystem call: readFile, writeFile,
//                createReadStream, unlink, readdir, …) with a request source among its arguments
//   • path-join: path.join( | path.resolve(                     (a path built from a request source)
//   • send-file: .sendFile( | .download(                        (Express response file sink) with a request source
// Detection is a FIXED PATTERN SET over the file's lines — non-LLM, no judgment. It reduces to ARCHITECTURE
// §2 primitive #3 (regex / enum check).
//
// WHY THE DISCRIMINATOR IS THE UNTRUSTED SOURCE, NOT A CONCAT/INTERP OPERATOR (the key divergence from
// scan-code-injection.mjs — read this, it is the whole honesty of this file, P0):
//   injection uses the `+`/`${...}` operator as its discriminator because a PARAMETERIZED query is safe, so the
//   operator SHAPE itself is the danger. But for a FILESYSTEM PATH, a bare concat/join is the NORMAL, SAFE way
//   to build a path (`path.join(__dirname, "config.json")`, `dir + "/config.json"`). A concat-into-fs
//   discriminator would fire on CORRECTLY-built paths — a false-positive flood, i.e. a "manufactured floor"
//   (the exact thing the `input-validation` lens refused, fix #3). The honest line-local discriminator for
//   TRAVERSAL is instead a recognized untrusted HTTP-request SOURCE token
//   (`req|request . params|query|body|headers|cookies`) appearing directly inside the sink's argument list:
//   the untrusted SOURCE is what distinguishes dangerous (untrusted part → traversal) from safe (trusted
//   parts → fine). Membership over TEXT → injection-immune → FLOOR.
//
// HONEST BOUND (the injection / secrets-in-code precedent, P0): this detects the PRESENCE of a request source
// in a path sink's argument on ONE line. It does NOT decide the value is unsanitized (a `path.basename(...)`, a
// `..` rejection, an allow-list, or a `realpath` containment check may neutralize it — that is the LENS's
// ADVISORY layer), does NOT trace taint, and — the most important miss to foreground — does NOT catch an
// untrusted value arriving via a LOCAL VARIABLE (`const f = req.params.file; fs.readFile(f)` — the source token
// is not on the sink line), nor NON-HTTP sources (process.argv/env/queues), nor OTHER-runtime sinks (Python
// `open()`), nor an ALIASED sink (`const rf = fs.readFile`), nor multi-line argument assembly, nor argument
// nesting DEEPER than one level (see ARGUMENT SPAN below).
// "Detected a request source reaching a filesystem-path sink on line N" is a real guarantee; "the code is
// path-traversal-safe / free of traversal" is NOT. Full taint analysis is ADVISORY judgment the LENS surfaces
// — NOT this floor.
//
// ARGUMENT SPAN — ONE LEVEL OF NESTING, and the exact reason (P7, the sharpest bound in this file):
//   The span between the sink callee and the request-source token is `SPAN` = `(?:[^)]*\([^()]*\))*?[^)]*?`:
//   a sequence of segments, each ending at a `)` that some earlier `(` in the same segment opened, followed by
//   a final run that crosses no `)` at all. Equivalently, and this is the property that matters: it consumes
//   any character that is not `)`, plus any `)` that closes a complete inner group. The
//   operative rule, in one sentence: THE SPAN STOPS AT THE FIRST `)` THAT IS NOT THE CLOSING PAREN OF A
//   COMPLETE INNER GROUP — i.e. at the sink call's OWN outer `)`. It therefore reaches a source BOTH inside a
//   nested call and after one — and BOTH shapes are canonical here:
//     fs.readFile(path.join(base, req.params.x))    caught  (source INSIDE a nested call)
//     path.join(rootDir(), req.query.f)             caught  (source AFTER a nested call)
//     fs.readFile(resolveRoot(base), req.query.f)   caught  (same)
//   The previous span was `[^)]*?`, which stopped dead at the FIRST inner `)`: it got the inside-a-nested-call
//   shape but MISSED the after-a-nested-call one. That mattered here more than anywhere — computing the base
//   directory with a helper call is the ORDINARY way this code is written, so the miss sat on the most
//   realistic shape of the vulnerability (a real, reproduced false-NEGATIVE, and the reason this changed).
//   The bound is NESTING DEPTH, not a count of calls: at depth > 1 some `)` is not a complete group's closer,
//   the span stalls there, and `path.join(f(g(h(x))), req.query.f)` is STILL A MISS. That is a DOCUMENTED
//   TRUE-NEGATIVE, asserted by a ★ test so it cannot drift silently.
//   REJECTED ALTERNATIVE — `[^;]*?`: it over-spans past the sink call's OWN outer `)` and false-matches an
//   unrelated request source later on the same line (`return path.join(A, B) || note(req.query.x)`). Pinned
//   by ★ GUARD tests, so "simplifying" the span to `[^;]*?` breaks the suite rather than shipping.
//   ALSO REJECTED — `(?:[^)(]|\([^)]*\))*?` (a disjoint-branch variant): it skips a nested group as an opaque
//   unit and so LOSES a source sitting INSIDE one. Measured, not reasoned: it drops the canonical
//   `fs.readFile(path.join(base, req.params.x))` above — the single most important shape this file detects.
//   Rejected as a net coverage loss.
//   ReDoS (threat surface #4) — the span is UNAMBIGUOUS, and that is what bounds it. Each iteration of the
//   outer group consumes exactly ONE `)` (the segment `[^)]*\([^()]*\)`), so the iteration count is fixed by
//   how many `)` the span crosses — never a choice. Inside a segment, `[^()]*` forbids parens, forcing the
//   opening `\(` to be the LAST `(` before that `)`: one decomposition per input, not many. With no ambiguous
//   decomposition there is nothing to backtrack over, so FROM A FIXED START POSITION the span scan is LINEAR
//   in the remaining line length. Measured across 11 adversarial paren families — `((a)`, `(a)`, `((a))`, `()`,
//   `(x,(y)`, unclosed `(`×N, bare `)`×N, deep `(`×N a `)`×N, up to ~480 KB lines: all linear (2× input → ~2×
//   time), worst family 2.93 ms at 480 KB.
//   THE PER-LINE COST (re-derived in 6.65.1 for the driver that runs the pattern now — L24). Through 6.64.2 the
//   scanner called `re.test(line)`, and the engine retried the whole pattern at every position where a sink
//   callee can start, so a line cost O(sink-callee occurrences × line length): `path.join(`×8000 (80 KB) took
//   1.5 s, ~4× per doubling (TST-2, the 2026-10-12 review). The regex is unchanged; `lineMatches()` in
//   sink-span-core.mjs runs it sticky at one sink, and when it fails there it skips every sink up to that call's
//   own outer `)`, because each of those sinks must fail too (the proof and its precondition on the sink regexes
//   are in that file's header). Each character then sits in at most one tested span, so a line costs O(its
//   length): the derived bound, measured on the ★ shapes in scan-code-path-traversal.test.mjs and in
//   .dev/features/scanner-redos-bounds/MEASUREMENTS.md, never a floor claim.
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
// CO-LOCATED SINKS EMIT MULTIPLE DETERMINISTIC HITS (decided at build, not by accident): the canonical vuln
// `fs.readFile(path.join(base, req.params.x))` matches BOTH `fs-path` and `path-join` on one line, so it yields
// two hits (sorted by line, then kind). Both point at the same dangerous line; this mirrors scan-code-injection
// (a line matching >1 pattern yields >1 hit) and is pinned by the ★ two-hits test. Deduping by line was
// rejected: it would drop which sink families matched.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is regex membership over the TEXT only. A code comment that
// CLAIMS "already validated / safe / do not flag" cannot suppress a real source-into-sink hit; a realistic
// "already safe" comment (which names no full sink CALL) cannot manufacture one. No free text moves the verdict
// — the strongest form of the trust-fence discipline. (See the ★ tests in scan-code-path-traversal.test.mjs —
// they are the whole reason this is FLOOR, not judgment.) Honest edge, and it WIDENED with the ARGUMENT SPAN
// above: the scanner reads TEXT and does not distinguish code from a comment, so a comment that spells out a
// full `fs.x(req.query…)` sink CALL registers — and now does so in the NESTED case too, where it previously
// did not (e.g. `// safe: we normalize before fs.readFile(baseDir(cfg), req.query.f)`). That is strictly MORE
// over-flagging (the LENS's advisory layer / the human resolves it) and NEVER suppression — the immunity
// property is unchanged; its false-positive surface is not, and saying otherwise would overstate the bound.
//
// Per-file by contract: every verdict is about ONE file's text, mirroring scan-code-injection.mjs. The scanner
// takes one `<code-file>`, or many through `--files` (review-fanout) — the batch mode `/pharn-review`'s
// prefilter spawns once per review — and each file's verdict is the same either way
// (pharn/floor/code-scanner-cli.mjs owns both modes). A cross-file / directory sweep is a FUTURE increment.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of scan-code-injection.mjs: a missing /
// non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-path-traversal.mjs <code-file>
//         node pharn/floor/scan-code-path-traversal.mjs --files <nul-separated-list | ->
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"<pattern-kind>"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line, then kind.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).
//         With --files: one {"results":[…]} document, one entry per listed path (code-scanner-cli.mjs).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";
import { compileSinkPattern, lineMatches, parenSpanLimit } from "./sink-span-core.mjs";

// The fixed detection set — the traversal SHAPE per sink family. Each pattern requires BOTH a recognized
// filesystem-path SINK (a fixed callee name set — membership, P5) AND a recognized untrusted-request SOURCE
// token in the sink's argument span (`SPAN`, one level of nesting — see ARGUMENT SPAN in the header for the
// bound and the ReDoS argument; mirroring scan-code-injection.mjs). The
// SOURCE is the discriminator that keeps a trusted-parts path build (path.join(__dirname, "x")) CLEAN.
// `\b` word-boundaries keep `xreq.params` / `myfs.readFile` from false-matching. Adding or removing a
// sink family / a source token is the ONLY axis of change here (P3).
//
// BOUNDARY (P3, one axis per file): this scanner owns HTTP-source → FILESYSTEM-PATH sinks. scan-code-injection
// owns concat/interp → query/command/HTML sinks; scan-code-deserialization owns deserialization / dynamic-eval
// sinks. No sink is double-owned. `fs.readFile` etc. are deliberately NOT injection/deser sinks.
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
  // Node filesystem path sinks: fs.<m>( / fs.promises.<m>( / fsPromises.<m>( with a request source in the args.
  { kind: "fs-path", ...compileSinkPattern(String.raw`\b(?:fs(?:\.promises)?|fsPromises)\.\w+\s*\(`, SPAN + SOURCE, parenSpanLimit) },
  // Path builders: path.join( / path.resolve( with a request source in the args (the traversal entry point).
  { kind: "path-join", ...compileSinkPattern(String.raw`\bpath\.(?:join|resolve)\s*\(`, SPAN + SOURCE, parenSpanLimit) },
  // Express response file sinks: res.sendFile( / res.download( with a request source in the args.
  { kind: "send-file", ...compileSinkPattern(String.raw`\.(?:sendFile|download)\s*\(`, SPAN + SOURCE, parenSpanLimit) },
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

if (import.meta.main) process.exitCode = runScannerCli("scan-code-path-traversal", scanText, process.argv.slice(2));
