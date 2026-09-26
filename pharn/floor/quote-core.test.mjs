// pharn/floor/quote-core.test.mjs — the suite for the untrusted-text quoting helpers MOVED here from
// render-run-report.mjs (GRILL G6, stage-regress-script). Three things this suite must show:
//   (1) the two helpers behave exactly as render-run-report.mjs's own suite already pins (the L62 cases —
//       a `{"toString":1}` value that a template literal or `String()` throws on);
//   (2) `render-run-report.mjs` RE-EXPORTS these exact functions — one owner, by identity, not two
//       independently-behaving copies that happen to agree today;
//   (3) this module's import list is exactly `fenceFor` from `loop-record-core.mjs` — a module with zero
//       imports of its own — so a caller (`render-regression.mjs`, `stage-regress.mjs`) gets a
//       dependency-free quoting helper, never the cost-ledger graph (G6's whole reason to exist).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dataText, quoteData } from "./quote-core.mjs";
import { fenceFor } from "./loop-record-core.mjs";
import * as renderRunReport from "./render-run-report.mjs";

test("dataText: byte-identical to String() for every JSON primitive (±Infinity from 1e999 included); JSON text for an object or array; a marker for a value too deep to stringify", () => {
  // Infinity is reached via JSON.parse, never a `1e999` LITERAL: eslint's no-loss-of-precision rule flags
  // the literal form (render-run-report.test.mjs's own precedent for this exact case).
  const primitives = [null, undefined, true, false, 0, -0, 1, -1, 3.5, "", "x", NaN, JSON.parse("1e999"), JSON.parse("-1e999")];
  for (const v of primitives) assert.equal(dataText(v), String(v), `dataText(${String(v)})`);

  for (const v of [{ a: 1 }, [1, "b"], {}, []]) {
    assert.equal(dataText(v), JSON.stringify(v));
  }
  // The control this exists for: a control-char-free JSON object whose own toString is not callable
  // throws under `String()`/template literals, but JSON.stringify never calls toString on a plain object.
  const needlesToString = JSON.parse('{"a":{"toString":1}}');
  assert.doesNotThrow(() => dataText(needlesToString));
  assert.equal(dataText(needlesToString), '{"a":{"toString":1}}', "nested: JSON text, not [object Object]");
  // The control asserting String() really throws on it (so the guard above is exercising something real).
  assert.throws(() => String(needlesToString.a), /Cannot convert object to primitive value/);
  assert.throws(() => `${needlesToString.a}`, /Cannot convert object to primitive value/);

  let deep = 0;
  for (let i = 0; i < 10000; i++) deep = { deep };
  assert.doesNotThrow(() => dataText(deep));
  assert.equal(dataText(deep), "(value nested too deeply to render)");
});

test("quoteData: label, blank line, a fence computed by fenceFor, the body verbatim, the closing fence", () => {
  const q = quoteData("label:", "a ``` b");
  const lines = q.split("\n");
  assert.equal(lines[0], "label:");
  assert.equal(lines[1], "");
  const fence = fenceFor("a ``` b");
  assert.equal(fence, "````"); // one longer than the longest run of backticks inside (3)
  assert.equal(lines[2], `${fence}text`);
  assert.equal(lines[3], "a ``` b");
  assert.equal(lines[4], fence);
});

test("quoteData: coerces a non-string body through String(), and the L62 shape is why a caller must go through dataText FIRST", () => {
  const q = quoteData("x:", 42);
  assert.ok(q.includes("42"));
  // The DIVISION OF LABOR, not a defect: quoteData's own `String(text)` throws on the L62 shape exactly
  // as a bare `String()` does (the control below), which is why every caller quoting an untrusted JSON
  // value composes dataText(v) -> quoteData(label, text) rather than handing quoteData the raw value.
  const needlesToString = { toString: 1 };
  assert.throws(() => quoteData("x:", needlesToString), /Cannot convert object to primitive value/);
  assert.doesNotThrow(() => quoteData("x:", dataText(needlesToString)));
});

test("quoteData: an empty body still renders a well-formed fence pair", () => {
  const q = quoteData("empty:", "");
  const lines = q.split("\n");
  assert.equal(lines[2], "```text");
  assert.equal(lines[3], "");
  assert.equal(lines[4], "```");
});

test("ONE OWNER — render-run-report.mjs re-exports these exact functions by identity, never a second implementation", () => {
  assert.equal(renderRunReport.quoteData, quoteData, "render-run-report.mjs must re-export quote-core.mjs's quoteData, not redefine it");
  assert.equal(renderRunReport.dataText, dataText, "render-run-report.mjs must re-export quote-core.mjs's dataText, not redefine it");
});

test("★ LOAD GRAPH — this module's only import is fenceFor from loop-record-core.mjs, and that module imports nothing", () => {
  const src = readFileSync(fileURLToPath(new URL("./quote-core.mjs", import.meta.url)), "utf8");
  const imports = [...src.matchAll(/^import\s+.*?from\s+["']([^"']+)["'];?\s*$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["./loop-record-core.mjs"], "quote-core.mjs must import nothing but loop-record-core.mjs");

  const coreSrc = readFileSync(fileURLToPath(new URL("./loop-record-core.mjs", import.meta.url)), "utf8");
  const coreImports = [...coreSrc.matchAll(/^import\s+.*?from\s+["']([^"']+)["'];?\s*$/gm)];
  assert.equal(coreImports.length, 0, "loop-record-core.mjs must have zero imports, or quote-core.mjs's load graph is no longer minimal");
});
