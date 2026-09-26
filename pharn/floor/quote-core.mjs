// pharn/floor/quote-core.mjs — the ONE implementation of "quote untrusted text as inert DATA", for a
// Markdown report. `dataText` and `quoteData` were born in render-run-report.mjs (6.6.0) and are MOVED
// here byte-for-byte (GRILL G6), because a second renderer needed them and importing them from
// render-run-report.mjs would have pulled that file's whole load graph — render-cost-ledger.mjs,
// mark-phase.mjs, ship-outcome-core.mjs — into a stage that has nothing to do with the cost ledger. A
// load failure anywhere in that graph would then crash the OTHER renderer too (P3: one axis of change).
//
// ── WHY A SHARED CORE, and not a second copy (L35) ───────────────────────────────────────────────────
// Both consumers (render-run-report.mjs, render-regression.mjs) ship in `pharn/floor/`, so a user's
// install carries both or neither — the dev/product split that forces the deliberate
// `check-provenance.mjs` copy-pair does not apply here. Re-implementing the fence rule a second time
// would create exactly the kind of pair L31 warns about: a second copy with nothing ranging over it.
//
// ── LOAD GRAPH (P3/GRILL G6) ─────────────────────────────────────────────────────────────────────────
// The ONLY import is `fenceFor` from `loop-record-core.mjs`, which itself has ZERO imports. So importing
// this module adds exactly one small, dependency-free module to a caller's load graph — in particular
// `pharn/floor/stage-regress.mjs`'s, which must not drag in the cost-ledger graph just to quote a path.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// `quoteData` makes a block of untrusted text INERT TO A COMMONMARK PARSER — a heading inside it cannot
// become a heading of the enclosing document. It is NOT forgery-proofing: a reader who copies text out of
// the block is outside anything this function can reach, and nothing here parses the rendered report
// (loop-record-core.mjs's `fenceFor`, cited not restated — P4).
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
