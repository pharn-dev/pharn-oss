// pharn/floor/cost-value-core.test.mjs — the cost tooling's value domain (6.28.1): `isIdentityToken` and
// `isTokenCount` over their boundaries, and over parsed JSON that makes `String()` throw, plus `ABS_PATH_RE`'s own
// controls beside its new home. Hermetic: no filesystem, no child process. The consumers' behaviour over crafted
// transcripts and ledgers is pinned in cost-hostile-input.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { IDENTITY_MAX, ABS_PATH_RE, isIdentityToken, isTokenCount } from "./cost-value-core.mjs";

/** Parsed JSON whose `toString` is not callable: `String()` and every other coercion throw on both (L62). */
const THROWING = [JSON.parse('{"toString":1}'), JSON.parse('[{"toString":1}]')];

test("CONTROL (L62): each THROWING value really makes String() throw, so a predicate that coerced it would throw too", () => {
  for (const v of THROWING) assert.throws(() => String(v), TypeError);
});

test("isIdentityToken: 1 to IDENTITY_MAX characters, no control character, no absolute path", () => {
  assert.equal(IDENTITY_MAX, 128);
  for (const ok of ["claude-opus-5-5", "req_011CUabc", "msg_01", "pharn-build", "2.1.0", "pharn-cost-ledger/1"]) {
    assert.equal(isIdentityToken(ok), true, ok);
  }
  assert.equal(isIdentityToken("x".repeat(IDENTITY_MAX)), true, "exactly the bound is admitted");
  assert.equal(isIdentityToken("x".repeat(IDENTITY_MAX + 1)), false, "one past the bound is refused");
  assert.equal(isIdentityToken(""), false, "the empty string is refused");
  for (const c of ["\n", "\r", "\t", "\u0000", "\u0007", "\u001f", "\u007f"]) {
    assert.equal(isIdentityToken(`a${c}b`), false, `control ${JSON.stringify(c)} is refused`);
  }
  for (const path of ["/Users/someone/x", "see /Users/someone/x", "~/x", "C:\\x", "d:/x"]) {
    assert.equal(isIdentityToken(path), false, `path ${JSON.stringify(path)} is refused`);
  }
  // U+2028 is not a C0 control, so it is admitted: the `\n`-delimited line bound quote-core.mjs states.
  assert.equal(isIdentityToken("a\u2028b"), true);
});

test("isIdentityToken is TOTAL: every non-string is refused and nothing throws", () => {
  for (const v of [...THROWING, 7, 0, -1, 1.5, Infinity, true, false, null, undefined, {}, [], ["x"], { a: "x" }]) {
    assert.doesNotThrow(() => isIdentityToken(v));
    assert.equal(isIdentityToken(v), false, typeof v);
  }
});

test("isTokenCount: a non-negative safe integer, and nothing else", () => {
  for (const v of [0, 1, 163, Number.MAX_SAFE_INTEGER]) assert.equal(isTokenCount(v), true, String(v));
  for (const v of [-1, -3, 1.5, 0.1, 2 ** 53, Number.MAX_SAFE_INTEGER + 2, Infinity, -Infinity, NaN]) {
    assert.equal(isTokenCount(v), false, String(v));
  }
  assert.equal(isTokenCount(JSON.parse("1e999")), false, "a raw 1e999 parses to Infinity");
});

test("isTokenCount is TOTAL: every non-number is refused and nothing throws", () => {
  for (const v of [...THROWING, "12", "0", "", true, false, null, undefined, {}, [], [1]]) {
    assert.doesNotThrow(() => isTokenCount(v));
    assert.equal(isTokenCount(v), false, typeof v);
  }
});

test("ABS_PATH_RE: a home path matches and the schema token does not — its own controls, beside its new home", () => {
  assert.ok(ABS_PATH_RE.test('{"cwd":"/Users/someone/Projects/x"}'), "a real home path must match");
  assert.ok(ABS_PATH_RE.test("/Users/someone/x"));
  assert.ok(!ABS_PATH_RE.test('{"schema":"pharn-cost-ledger/1"}'), "the schema token must NOT match");
  assert.ok(!ABS_PATH_RE.test("pharn-cost-ledger/2"));
});
