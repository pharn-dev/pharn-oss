// pharn/floor/gate-timeout-core.test.mjs — the declared per-gate timeout's value rule (7.16.0, gate-timeout-above-bash-cap):
// absent → the pinned value exactly (AC1, L41); the closed range; the RELATIVE lower bound (L35); total refusals (L62).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TIMEOUT_KEY,
  TIMEOUT_MAX_MS,
  TIMEOUT_MIN_MS,
  effectiveTimeoutMs,
  resolveRunTimeout,
  timeoutDeclarationError,
} from "./gate-timeout-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

test("the constants: the key, run-gates' 3-digit floor and the 30-minute bound (GATE 1 decision D1)", () => {
  assert.equal(TIMEOUT_KEY, "timeoutMs");
  assert.equal(TIMEOUT_MIN_MS, 100);
  assert.equal(TIMEOUT_MAX_MS, 1800000);
});

test("AC1 — no declaration returns the pinned value EXACTLY, whatever it is", () => {
  for (const pinned of [540000, 300, 100, 999999999]) {
    assert.deepEqual(effectiveTimeoutMs({ declared: null, pinnedMs: pinned }), { ok: true, value: pinned });
  }
});

test("a declaration at or above the pinned value is the effective value", () => {
  assert.deepEqual(effectiveTimeoutMs({ declared: 600000, pinnedMs: 540000 }), { ok: true, value: 600000 });
  assert.deepEqual(effectiveTimeoutMs({ declared: 540000, pinnedMs: 540000 }), { ok: true, value: 540000 });
  assert.deepEqual(effectiveTimeoutMs({ declared: TIMEOUT_MAX_MS, pinnedMs: 540000 }), { ok: true, value: TIMEOUT_MAX_MS });
  assert.deepEqual(effectiveTimeoutMs({ declared: 3000, pinnedMs: 300 }), { ok: true, value: 3000 });
});

test("D4 — the lower bound is RELATIVE: a declaration below the pinned value is refused, naming both and the remedy", () => {
  const r = effectiveTimeoutMs({ declared: 539999, pinnedMs: 540000 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /^pharn\.config\.json `gates\.timeoutMs` "539999" is below the pinned per-gate timeout 540000 ms/);
  assert.match(r.reason, /may only lengthen it/);
  assert.match(r.reason, /raise it, or remove the key/);
  // control: the same value with a smaller pinned value is accepted
  assert.equal(effectiveTimeoutMs({ declared: 539999, pinnedMs: 300 }).ok, true);
});

test("the closed range: every value outside it is refused by both functions; the boundaries are accepted", () => {
  assert.equal(timeoutDeclarationError(TIMEOUT_MIN_MS), null);
  assert.equal(timeoutDeclarationError(TIMEOUT_MAX_MS), null);
  assert.equal(timeoutDeclarationError(900000), null);
  const bad = [TIMEOUT_MAX_MS + 1, 0, 99, -1, 1.5, 900000.5, "900000", null, true, false, [], [900000], {}, NaN, Infinity, 2 ** 53];
  for (const v of bad) {
    const e = timeoutDeclarationError(v);
    assert.equal(typeof e, "string", `${String(v)} is refused`);
    assert.match(e, /must be an integer of milliseconds from 100 to 1800000 \(30 min; a hung gate runs that long before it is killed\)/);
    if (v === null) continue; // null is "no declaration" to effectiveTimeoutMs, by contract
    const r = effectiveTimeoutMs({ declared: v, pinnedMs: 300 });
    assert.equal(r.ok, false, `effectiveTimeoutMs re-checks ${String(v)}`);
    assert.match(r.reason, /^pharn\.config\.json `gates\.timeoutMs` must be an integer/);
  }
});

test('L62 — {"toString":1}, and an array holding one, are refused as text and never throw (with the String() control)', () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: this value really does make String() throw");
  for (const v of [hostile, [hostile]]) {
    const e = timeoutDeclarationError(v);
    assert.equal(typeof e, "string");
    assert.equal(effectiveTimeoutMs({ declared: v, pinnedMs: 540000 }).ok, false);
  }
});

test("a pinned value that is not a positive integer is a caller defect (TypeError), never a silent default (L41)", () => {
  for (const p of [undefined, null, 0, -1, 1.5, "540000"]) {
    assert.throws(() => effectiveTimeoutMs({ declared: null, pinnedMs: p }), TypeError);
  }
});

test("resolveRunTimeout — the ONE rule both runners apply: a refusing block or no declaration → pinned; else effectiveTimeoutMs", () => {
  assert.deepEqual(
    resolveRunTimeout({ ok: false, reason: "x" }, 540000),
    { ok: true, value: 540000 },
    "GRILL G1/G2: left to the block's reader"
  );
  assert.deepEqual(resolveRunTimeout({ ok: true, exclude: [], timeoutMs: null }, 540000), { ok: true, value: 540000 });
  assert.deepEqual(resolveRunTimeout({ ok: true, exclude: [] }, 540000), { ok: true, value: 540000 }, "a result without the key");
  assert.deepEqual(resolveRunTimeout(null, 540000), { ok: true, value: 540000 });
  assert.deepEqual(
    resolveRunTimeout({ ok: true, exclude: [], timeoutMs: null }, 0),
    { ok: true, value: 0 },
    "AC1: a pinned value passes untouched"
  );
  assert.deepEqual(resolveRunTimeout({ ok: true, exclude: [], timeoutMs: 900000 }, 540000), { ok: true, value: 900000 });
  const low = resolveRunTimeout({ ok: true, exclude: [], timeoutMs: 1000 }, 540000);
  assert.equal(low.ok, false);
  assert.match(low.reason, /may only lengthen it/);
});

test("L35 — this module holds no copy of the pinned 540000: the default lives on the pinned command lines only", () => {
  const src = readFileSync(join(HERE, "gate-timeout-core.mjs"), "utf8");
  const code = src
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//") && !l.trimStart().startsWith("*") && !l.trimStart().startsWith("/**"))
    .join("\n");
  assert.ok(code.includes("TIMEOUT_MAX_MS"), "NON-VACUITY: the scan reads the module's code");
  assert.doesNotMatch(code, /540_?000/);
});
