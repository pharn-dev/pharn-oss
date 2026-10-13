#!/usr/bin/env node
// pharn/floor/scan-code-injection.mjs — deterministic CONCAT/INTERP-INTO-SINK scanner over a CODE file (CONSTITUTION P0/P5).
//
// The injection twin of pharn/floor/scan-code-secrets.mjs. Where that scanner backs the `secrets-in-code`
// LENS's FLOOR sub-check (a secret-SHAPED literal in code), this one backs the `injection` LENS's FLOOR
// sub-check (pharn-review/injection/): does a line contain the classic injection SHAPE — a recognized
// SQL-query / shell-command / HTML sink receiving an argument built by `${...}` interpolation OR by
// `"..." + ident` / `ident + "..."` string-concatenation? Detection is a FIXED REGEX SET over the file's
// lines — non-LLM, no judgment. It reduces to ARCHITECTURE §2 primitive #3 (regex / enum check).
//
// HONEST BOUND (the secrets-in-code / trust-fence precedent, P0): this detects an obvious concat/interp
// SHAPE into a recognized sink, on ONE line. It does NOT decide the operand is actually UNTRUSTED, does NOT
// know whether SANITIZATION/PARAMETERIZATION happens elsewhere, does NOT trace taint across functions, and
// does NOT catch multi-line query assembly or a BARE untrusted variable passed with no visible
// `+`/`${...}`/`.concat(`. PYTHON f-STRINGS ARE OUT OF SCOPE, named here rather than left silently
// unhandled: `cursor.execute(f"… {uid}")` reaches a matched sink and is NOT detected. The `f"…{x}"`
// shape collides with ordinary JS/TS text (a quoted string preceded by an identifier ending in `f`),
// so adding it to this set costs false positives on the language this scanner is actually aimed at;
// a Python-aware scanner is the right home and has no triggering failure yet (P7).
// "Detected an obvious concat/interp into a sink on line N" is a real guarantee; "the code is injection-safe
// / free of injection" is NOT. Full taint analysis is ADVISORY judgment the LENS surfaces — NOT this floor.
//
// ARGUMENT SPAN — ONE LEVEL OF NESTING, and the exact reason (P7, the sharpest bound in this file):
//   The span between the sink callee and the taint operator is `SPAN` = `(?:[^)]*\([^()]*\))*?[^)]*?`: a
//   sequence of segments, each ending at a `)` that some earlier `(` in the same segment opened, followed by a
//   final run that crosses no `)` at all. Equivalently, and this is the property that matters: it consumes any
//   character that is not `)`, plus any `)` that closes a complete inner group. The operative
//   rule, in one sentence: THE SPAN STOPS AT THE FIRST `)` THAT IS NOT THE CLOSING PAREN OF A COMPLETE INNER
//   GROUP — i.e. at the sink call's OWN outer `)`. It therefore reaches taint BOTH inside a nested call and
//   after one:
//     db.query(tableFor(req.query.t) + " WHERE 1=1")   caught  (taint AFTER a nested call)
//     db.query(fmt(x) + `... ${y} ...`)                caught  (same, interpolation)
//   The previous span was `[^)]*?`, which stopped dead at the FIRST inner `)` and MISSED the after-a-nested-
//   call shape entirely — a real, reproduced false-NEGATIVE, and the reason this changed.
//   The bound is NESTING DEPTH, not a count of calls: at depth > 1 some `)` is not a complete group's closer,
//   the span stalls there, and `db.query(f(g(h(x))) + " tail")` is STILL A MISS. That is a DOCUMENTED
//   TRUE-NEGATIVE, asserted by a ★ test so it cannot drift silently. Bare-variable, multi-line, and
//   cross-function taint remain out of scope, exactly as before.
//   REJECTED ALTERNATIVE — `[^;]*?`: it over-spans past the sink call's OWN outer `)` and false-matches an
//   unrelated `+`-concat later on the same line (`return db.query(safeConst) || fallback("x" + y)`). Pinned
//   by ★ GUARD tests, so "simplifying" the span to `[^;]*?` breaks the suite rather than shipping.
//   ALSO REJECTED — `(?:[^)(]|\([^)]*\))*?` (a disjoint-branch variant): it skips a nested group as an
//   opaque unit and so LOSES taint sitting INSIDE one. Measured, not reasoned: it drops the canonical
//   `fs.readFile(path.join(base, req.params.x))` shape in the sibling scanner. Rejected as a net coverage loss.
//   ReDoS (threat surface #4) — the span is UNAMBIGUOUS, and that is what bounds it. Each iteration of the
//   outer group consumes exactly ONE `)` (the segment `[^)]*\([^()]*\)`), so the iteration count is fixed by
//   how many `)` the span crosses — never a choice. Inside a segment, `[^()]*` forbids parens, forcing the
//   opening `\(` to be the LAST `(` before that `)`: one decomposition per input, not many. With no ambiguous
//   decomposition there is nothing to backtrack over, so FROM A FIXED START POSITION the span scan is LINEAR
//   in the remaining line length. Measured across 11 adversarial paren families — `((a)`, `(a)`, `((a))`, `()`,
//   `(x,(y)`, unclosed `(`×N, bare `)`×N, deep `(`×N a `)`×N, up to ~480 KB lines: all linear (2× input → ~2×
//   time), worst family 2.93 ms at 480 KB.
//   THE PER-LINE BOUND IS QUADRATIC, NOT LINEAR, AND SAYING OTHERWISE WOULD BE THE SAME OVERCLAIM AGAIN: the
//   engine retries the whole pattern at every position where the sink callee can start, so a line's cost is
//   O(sink-callee occurrences × line length). Worst case is a line that is nothing but sink callees — measured
//   on the SSRF sibling as `fetch(`×8000 (a 56 KB line) → 999 ms, growing ~4× per doubling. What this fix
//   removes is the EXPONENTIAL term, not the polynomial one. The polynomial term is pre-existing and was
//   strictly WORSE before: on that same shape the old span was CUBIC (~7.7× per doubling).
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
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is regex membership over the TEXT only. A code comment
// that CLAIMS "already sanitized / safe / do not flag" cannot suppress a real concat hit; a comment that
// CLAIMS "injection here" cannot manufacture one. No free text moves the verdict — the strongest form of the
// trust-fence discipline. (See the ★ tests in scan-code-injection.test.mjs — they are the whole reason this
// is FLOOR, not judgment.) HONEST EDGE, and it WIDENED with the span above: the scanner reads TEXT and does
// not distinguish code from a comment, so a comment that spells out a full sink call now registers in the
// NESTED case too, where it previously did not. That is strictly MORE over-flagging (the advisory layer / the
// human resolves it) and NEVER suppression — the immunity property is unchanged; its false-positive surface
// is not, and saying otherwise would be the overstatement this file exists to avoid.
//
// The `+`/`${...}` DISCRIMINATOR is the point: a PARAMETERIZED query (query("... = $1", [v])), an
// execFile("git", [arg]) with an args array, and an escaped/sanitize()/bare-variable HTML assignment carry
// NO concat/interp and are true-negatives (clean) — deterministically, not by judgment.
//
// Per-file by contract: every verdict is about ONE file's text, mirroring scan-code-secrets.mjs. The scanner
// takes one `<code-file>`, or many through `--files` (review-fanout) — the batch mode `/pharn-review`'s
// prefilter spawns once per review — and each file's verdict is the same either way
// (pharn/floor/code-scanner-cli.mjs owns both modes). A cross-file / directory sweep is a FUTURE increment.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of pharn/floor/scan-code-secrets.mjs:
// a missing / non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-injection.mjs <code-file>
//         node pharn/floor/scan-code-injection.mjs --files <nul-separated-list | ->
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"<pattern-kind>"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line, then kind.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).
//         With --files: one {"results":[…]} document, one entry per listed path (code-scanner-cli.mjs).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// The fixed detection set — the injection SHAPE per sink family. Each pattern requires BOTH a recognized
// SINK (a fixed callee / assignment-target name set — membership, P5) AND a TAINT OPERATOR on the same line:
//   • `${` interpolation (a template literal building the sink's argument dynamically), OR
//   • `"..." +` / `+ "..."` string-concatenation (a quoted string glued to something with `+`), OR
//   • `.concat(` — the METHOD spelling of the same visible concatenation. Added because
//     `db.query("SELECT … ".concat(userInput))` is as plainly a concat into a matched sink as its `+`
//     twin, and returned NO hit: the set enumerated the OPERATOR spellings and silently omitted the
//     method one, so an author who preferred `.concat` was unguarded for no stated reason.
// The taint operator is the discriminator that keeps a parameterized / escaped / args-array call CLEAN.
// Adding or removing a sink family / operator is the ONLY axis of change here (P3).
//
// NOTE (accepted duplication, deferred P7): the taint-operator sub-pattern is shared in spirit with the
// secret scanner's literal detection but the two detect different things; consolidating the shared regex
// fragment would touch a separate axis (the secret scanner + its lens) — deferred, not done speculatively.
const TAINT = String.raw`(?:\$\{|["'][^"']*["']\s*\+|\.concat\s*\(|\+\s*["'` + "`" + `])`;
// NOTE: `\.concat` sits inside the String.raw segment on purpose. The trailing `` `])` `` piece is an
// ORDINARY template literal (it follows the "`" splice), so a backslash placed there is consumed by
// the template parser — `\.concat\s*\(` silently became `.concats*(`, which made the whole RegExp
// an "Unterminated group" SyntaxError at import. Raw-ness is per-segment, not per-expression.
// The ARGUMENT SPAN between a call sink and the taint operator: any non-`)` char, plus any `)` that closes a
// complete inner group. It stops at the first `)` that is not a complete inner group's closer — the sink call's own
// outer `)` — so it reaches taint both INSIDE and AFTER a nested call, but never crosses into a later
// expression. See "ARGUMENT SPAN" in the header for the one-level bound, the two rejected alternatives, and
// the ReDoS position. NOT used by html-injection — see its own note below.
const SPAN = String.raw`(?:[^)]*\([^()]*\))*?[^)]*?`;
const PATTERNS = [
  // SQL query sinks: query( / execute( / prepare( / raw(  with concat|interp in the argument.
  { kind: "sql-injection", re: new RegExp(String.raw`\b(?:query|execute|prepare|raw)\s*\(` + SPAN + TAINT) },
  // Shell command sinks: exec / execSync / execFile(Sync) / spawn(Sync)  with concat|interp in the argument.
  { kind: "command-injection", re: new RegExp(String.raw`\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(` + SPAN + TAINT) },
  // HTML sinks: innerHTML/outerHTML assignment, document.write(, insertAdjacentHTML(, React __html:  with concat|interp.
  //
  // WHY THIS ONE KEEPS `[^;]*?` AND DOES NOT USE `SPAN` (deliberate asymmetry — do NOT "unify" these):
  // SPAN is bounded by the sink CALL's own closing `)`. Most sinks here are ASSIGNMENT targets
  // (`el.innerHTML = ...`, `__html: ...`), which have no closing paren to bound against — SPAN would stall
  // immediately on the first `)` of any right-hand-side call and MISS the ordinary case. The statement
  // terminator `;` is the correct bound for an assignment RHS, and the over-span risk that rules `[^;]*?`
  // out for CALL sinks (it would run past the call's `)` into an unrelated later concat) does not arise
  // when the span is the whole statement by construction. Two sink SHAPES → two bounds. Pinned by tests.
  {
    kind: "html-injection",
    re: new RegExp(String.raw`(?:\.(?:inner|outer)HTML\s*=|document\.write\s*\(|\.insertAdjacentHTML\s*\(|__html\s*:)\s*[^;]*?` + TAINT),
  },
];

/** The hits for one file's text. Keeps nothing between calls: no PATTERNS regex carries a `g`/`y` flag. */
export function scanText(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const { kind, re } of PATTERNS) {
      if (re.test(lines[i])) hits.push({ line: i + 1, kind });
    }
  }
  // Deterministic order: by line, then by kind (a line matching >1 pattern yields >1 hit, stably ordered).
  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-injection", scanText, process.argv.slice(2));
