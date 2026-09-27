// pharn/floor/quote-core.mjs — the ONE implementation of "quote untrusted text as inert DATA", for a
// Markdown report. `dataText` and `quoteData` were born in render-run-report.mjs (6.6.0) and are MOVED
// here byte-for-byte (GRILL G6), because a second renderer needed them and importing them from
// render-run-report.mjs would have pulled that file's whole load graph — render-cost-ledger.mjs,
// mark-phase.mjs, ship-outcome-core.mjs — into a stage that has nothing to do with the cost ledger. A
// load failure anywhere in that graph would then crash the OTHER renderer too (P3: one axis of change).
//
// It holds the ONE-LINE form too: `shown` and `SHOWN_CHARS`, which quote an untrusted value inside a single line
// of a refusal reason or a verdict. They were born in test-results-formats.mjs (6.22.0) and MOVED here
// byte-for-byte in 6.28.1 (GRILL R2-G6), when check-cost-ledger.mjs needed the same quoting for its RED and WARN
// lines. A second quoter would be the pair [[L31]] warns about, and importing it from the results parser would
// tie the cost checker to a module that changes when a reporter format does.
//
// ── WHY A SHARED CORE, and not a second copy (L35) ───────────────────────────────────────────────────
// Every consumer — each module that imports this file — ships in `pharn/floor/`, so a user's
// install carries them all or none — the dev/product split that forces the deliberate
// `check-provenance.mjs` copy-pair does not apply here. Re-implementing the fence rule a second time
// would create exactly the kind of pair L31 warns about: a second copy with nothing ranging over it.
//
// ── LOAD GRAPH (P3/GRILL G6) ─────────────────────────────────────────────────────────────────────────
// The ONLY import is `fenceFor` from `loop-record-core.mjs`, which itself has ZERO imports. So importing
// this module adds exactly one small, dependency-free module to a caller's load graph — in particular
// `pharn/floor/stage-regress.mjs`'s, which must not drag in the cost-ledger graph just to quote a path.
// Since 6.28.1 `shown` lives here, so this module and `loop-record-core.mjs` join two more kinds of load graph:
// `check-cost-ledger.mjs`'s, which imports `shown` directly, and that of every module which loads
// `test-results-formats.mjs`, directly or through another module — the verify and AC-test paths among them, for
// example `check-verify.mjs`, `check-red-run.mjs`, `loop-fresh-core.mjs` and `check-ac-tests.mjs` (REVIEW R7 and
// re-review F4 of 6.28.1). The rule, not a list, is the statement, because the set grows with every new importer. The
// cost is those two small modules, and `quote-core.test.mjs`'s ★ LOAD GRAPH pins that it stays so.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// `quoteData` makes a block of untrusted text INERT TO A COMMONMARK PARSER — a heading inside it cannot
// become a heading of the enclosing document. It is NOT forgery-proofing: a reader who copies text out of
// the block is outside anything this function can reach, and nothing here parses the rendered report
// (loop-record-core.mjs's `fenceFor`, cited not restated — P4).
// `shown` keeps a value on ONE `\n`-delimited line: `JSON.stringify` escapes `\n`, `\r` and every other C0
// control. It leaves U+2028, U+2029 and U+0085 raw, which some viewers draw as a line break; that bound is the
// one `serializeLedger` states in render-cost-ledger.mjs, and it is stated, not escaped.
//
// NON-LLM. No network, no eval, no child processes.

import { fenceFor } from "./loop-record-core.mjs";

/** Quote untrusted text as an inert fenced block. `label` names the source so a reader can tell DATA from
 *  a renderer's own prose. Byte-for-byte the render-run-report.mjs original. */
export function quoteData(label, text) {
  const body = String(text);
  const f = fenceFor(body);
  return [`${label}`, "", `${f}text`, body, f].join("\n");
}

/** Any value from a parsed JSON input as text — never a throw. A primitive goes through `String()`, so it
 *  is byte-identical to `String()` BY CONSTRUCTION (`Infinity` from `1e999` included — `JSON.stringify`
 *  would print `null`). Only a non-null object or array is JSON text, where `String()` printed
 *  `[object Object]` or threw. `JSON.parse` accepts a nesting depth `JSON.stringify` cannot walk (measured:
 *  RangeError at 10,000 levels), so that one call is guarded and a too-deep value renders a fixed marker.
 *  Byte-for-byte the render-run-report.mjs original. */
export function dataText(v) {
  if (v === null || typeof v !== "object") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "(value nested too deeply to render)";
  }
}

/** How many characters of an untrusted raw value a refusal reason may quote. */
export const SHOWN_CHARS = 64;

/** An untrusted value, JSON-quoted and cut to SHOWN_CHARS, for a refusal reason. TOTAL: it never throws. `String(v)`
 *  throws on parsed JSON such as `{"toString":1}` (and on an array holding one), and a refusal that throws is no
 *  refusal — the caller's checker dies with node's exit 1, which reads as a RED verdict (6.22.0 review). Such a value
 *  is shown by its built-in tag (`[object Object]`), which cannot be overridden from JSON. */
export function shown(v) {
  let t;
  try {
    t = String(v);
  } catch {
    t = Object.prototype.toString.call(v);
  }
  return JSON.stringify(t.length > SHOWN_CHARS ? `${t.slice(0, SHOWN_CHARS)}…` : t);
}
