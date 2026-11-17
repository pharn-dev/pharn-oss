import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMinor, MoneyError, parseMinor, sumMinor } from "../src/money.js";

test("parseMinor reads a two-decimal string as integer cents", () => {
  assert.equal(parseMinor("0.00"), 0);
  assert.equal(parseMinor("12.50"), 1250);
  assert.equal(parseMinor("100.07"), 10007);
});

test("parseMinor refuses anything but a two-decimal non-negative string", () => {
  for (const bad of ["12.5", "12", "-1.00", "01.00", "1,00", " 1.00", 12.5, null, undefined, "1e3.00"]) {
    assert.throws(() => parseMinor(bad), MoneyError, String(bad));
  }
});

test("formatMinor writes cents back as a two-decimal string", () => {
  assert.equal(formatMinor(0), "0.00");
  assert.equal(formatMinor(5), "0.05");
  assert.equal(formatMinor(10007), "100.07");
  assert.throws(() => formatMinor(1.5), MoneyError);
  assert.throws(() => formatMinor(-1), MoneyError);
});

test("integer cents add exactly where floats would not", () => {
  assert.equal(sumMinor([10, 20]), 30);
  assert.equal(formatMinor(sumMinor([parseMinor("0.10"), parseMinor("0.20")])), "0.30");
});
