// pharn/floor/sink-span-core.mjs — the per-line driver the sink→span→target scanners share (CONSTITUTION P0/P5).
//
// Used by pharn/floor/scan-code-injection.mjs, scan-code-ssrf.mjs and scan-code-path-traversal.mjs. Each of their
// patterns is ONE regex of the shape `SINK + SPAN + TARGET`: a sink callee (`query(`, `fetch(`, `.innerHTML =`), an
// argument span, then a taint operator or a request source. `lineMatches()` answers exactly what `re.test(line)`
// answered for that regex — the regex is still what decides — but it does so in time linear in the line.
//
// WHY THIS EXISTS (TST-2, the 2026-10-12 review). `re.test(line)` makes the engine retry the whole pattern at every
// position a sink can start, and each retry scans the span to its end again, so a line's cost was O(sinks × length):
// `query(`×8000 (48 KB) took 1.0 s and `fetch(`×16000 (96 KB) 3.6 s, about 4× per doubling. 6.62.0's prefilter timeout
// did not bound a lens subagent that runs a scanner itself. Measurements: .dev/features/scanner-redos-bounds/.
//
// THE SKIP, and why it cannot lose a hit. Let a sink match end at `p` (just after its `(`, `=` or `:`), and let `R(p)`
// be the LIMIT: the first index the span cannot cross from `p` (`limit(line, p)`; the line length when nothing stops
// it). The regex matches at that sink iff some target match starts at a `q` with `p <= q <= R(p)`. Suppose it does
// not. Any later sink whose end `p2` lies in `[p, R(p)]` also fails, because
//   (a) its first target start is no earlier: the first `q >= p2` is >= the first `q >= p`; and
//   (b) its span reaches no further: `R(p2) <= R(p)` (proved per limit function below).
// So the scan resumes the sink search AT `R(p)` and never runs the regex for the sinks in between. Every character is
// then inside at most one tested span, so the regex work per line is O(length), plus each target match's own overhang
// past `R`. The only target that reads past `R` is the taint operator's quoted string, `["'][^"']*["']`: its
// `[^"']*` stops at the NEXT quote of either kind, so an overhang scan ends at the first quote after its start and no
// two overhang scans cover the same character.
//
// PRECONDITION on each pattern's SINK regex — the lemma needs it, and nothing here can check it, so it is stated:
//   1. no sink match contains the limit's stop character (`)` for `parenSpanLimit`, `;` for `semicolonSpanLimit`),
//      so no sink can start before `R(p)` and end after it;
//   2. a sink start has ONE end (no alternation lets the same start end at two places), so `p` is well defined; and
//   3. no sink match can start strictly inside another sink match, so resuming past `m.index` skips no sink that
//      ends before `p` (such a sink would sit outside `[p, R(p)]`, where the lemma says nothing).
// Every sink regex in the three scanners meets all three (an independent probe re-checked them for this release). A
// new sink that breaks one can make the skip drop a hit.
// What would show it: the differential in sink-span-core.test.mjs, which runs every pattern of all three scanners
// against the plain regex over fuzzed lines — but only if its alphabet holds the new sink's text.
//
// HONEST BOUND (P0): "same verdict as `re.test(line)` on every line" is ARGUED (above) and TESTED over a fixed corpus,
// not guaranteed; "linear" is the derived bound, measured, not a floor property. The floor claims these scanners make
// (regex membership over the text, ARCHITECTURE §2 primitive #3) are unchanged.
//
// Non-LLM, stdlib-only, no state: every call builds its own sticky / global regexes from the sources it is given.

/**
 * The SPAN limit: the index of the first `)` at or after `p` that the argument span
 * `(?:[^)]*\([^()]*\))*?[^)]*?` cannot consume, or `line.length`.
 *
 * The span consumes any non-`)` character, and a `)` only as the end of a segment `[^)]*\([^()]*\)` — which needs at
 * least one `(` after the previous consumed `)` (or after `p`). So a `)` is crossable iff a `(` occurred since then.
 *
 * Monotone, as the skip needs: for `p <= p2 <= R(p)`, `R(p2) <= R(p)`. At `j = R(p) < length` there is no `(` between
 * the last `)` before `j` (or `p`) and `j`; a scan from `p2` sees the same window or a sub-window of it, so it stops at
 * `j` too, if not earlier.
 */
export function parenSpanLimit(line, p) {
  let open = false;
  for (let i = p; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if (c === 0x28) open = true;
    else if (c === 0x29) {
      if (!open) return i;
      open = false;
    }
  }
  return line.length;
}

/**
 * The html-injection limit: the first `;` at or after `p`, or `line.length` — the span there is `\s*[^;]*?`, and `\s`
 * holds no `;`. Monotone trivially: every `p2` in `[p, R(p)]` has the same next `;`.
 */
export function semicolonSpanLimit(line, p) {
  const i = line.indexOf(";", p);
  return i === -1 ? line.length : i;
}

// The span source each limit function models. A pattern whose `rest` does not begin with its limit's span would let
// the skip run past what that span can reach — e.g. the `;` limit on a SPAN pattern can lie beyond the call's `)` —
// so `compileSinkPattern` refuses the pairing at import time instead of dropping hits at run time.
const SPAN_OF = new Map([
  [parenSpanLimit, String.raw`(?:[^)]*\([^()]*\))*?[^)]*?`],
  [semicolonSpanLimit, String.raw`\s*[^;]*?`],
]);

/**
 * Compile one pattern: `sink` and `rest` are regex SOURCES whose concatenation is the scanner's whole pattern; `limit`
 * is `parenSpanLimit` or `semicolonSpanLimit`, and `rest` must begin with that limit's span source (checked — a
 * mismatch throws). `re` is that whole pattern as a plain regex (the language — what `lineMatches` must agree with);
 * `sink` (`g`) and `full` (`y`) are what the driver runs. Their `lastIndex` is set before every use, so nothing
 * carries from one line or one file to the next.
 */
export function compileSinkPattern(sink, rest, limit) {
  const span = SPAN_OF.get(limit);
  if (span === undefined || !rest.startsWith(span)) {
    throw new Error(`sink-span-core: the pattern's span does not begin with ${span === undefined ? "a known limit's span" : span}`);
  }
  return { re: new RegExp(sink + rest), sink: new RegExp(sink, "g"), full: new RegExp(sink + rest, "y"), limit };
}

/** Exactly `pattern.re.test(line)`, in time linear in `line.length` (see the header). */
export function lineMatches(line, pattern) {
  const { sink, full, limit } = pattern;
  sink.lastIndex = 0;
  let m;
  while ((m = sink.exec(line)) !== null) {
    full.lastIndex = m.index;
    if (full.test(line)) return true;
    const stop = limit(line, m.index + m[0].length);
    if (stop >= line.length) return false;
    // `stop` is past this sink's start, so the search always moves forward.
    sink.lastIndex = stop;
  }
  return false;
}
