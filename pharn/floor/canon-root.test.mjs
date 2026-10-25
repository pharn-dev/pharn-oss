// pharn/floor/canon-root.test.mjs — the `--canon-root` grammar and argv extraction.
//
// Hermetic: pure functions, no filesystem. The CLIs that consume this parser carry their own no-flag (default)
// and custom-root cases (lessons-learned L41); this file pins the grammar once.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCanonRoot, takeCanonRoot, DEFAULT_CANON_ROOT, CANON_ROOT_FLAG } from "./canon-root.mjs";

test("the default root is the user's pharn/memory-bank (7.0.0)", () => {
  assert.equal(DEFAULT_CANON_ROOT, "pharn/memory-bank");
  assert.equal(CANON_ROOT_FLAG, "--canon-root");
});

const ACCEPTED = [
  ["memory-bank", "memory-bank"],
  ["pharn/memory-bank", "pharn/memory-bank"],
  ["./pharn/memory-bank/", "pharn/memory-bank"],
  [".dev/memory-bank", ".dev/memory-bank"],
  ["./.dev/memory-bank/", ".dev/memory-bank"],
  ["docs/lessons_v2", "docs/lessons_v2"],
  ["a/b.c/d-e", "a/b.c/d-e"],
];

for (const [raw, root] of ACCEPTED) {
  test(`accepts ${JSON.stringify(raw)} as ${JSON.stringify(root)}`, () => {
    assert.deepEqual(parseCanonRoot(raw), { ok: true, root });
  });
}

const REFUSED = [
  ["", /1–256 characters/],
  ["x".repeat(257), /1–256 characters/],
  ["/abs/memory-bank", /repo-relative/],
  ["..", /"\." or "\.\."/],
  ["a/../b", /"\." or "\.\."/],
  ["a/./b", /"\." or "\.\."/],
  ["a//b", /empty/],
  ["./", /names no directory/],
  ["mem\\bank", /"\/" separators/],
  ["mem\nbank", /control character/],
  ["mem bank", /segments may hold only/],
  ["--verdict", /segments may hold only/],
  ["a/-b", /segments may hold only/],
];

for (const [raw, reason] of REFUSED) {
  test(`refuses ${JSON.stringify(raw)}`, () => {
    const r = parseCanonRoot(raw);
    assert.equal(r.ok, false);
    assert.match(r.reason, reason);
  });
}

test("a non-string root is refused without throwing", () => {
  for (const v of [undefined, null, 42, {}, Object.create(null), 10n]) {
    const r = parseCanonRoot(v);
    assert.equal(r.ok, false);
    assert.match(r.reason, /needs a directory/);
  }
});

test("takeCanonRoot: absent flag -> the default root, argv untouched", () => {
  assert.deepEqual(takeCanonRoot([".", "--verdict"]), { ok: true, root: "pharn/memory-bank", rest: [".", "--verdict"] });
});

test("takeCanonRoot: the flag and its value are removed from argv, wherever they sit", () => {
  assert.deepEqual(takeCanonRoot(["--canon-root", ".dev/memory-bank", ".", "--verdict"]), {
    ok: true,
    root: ".dev/memory-bank",
    rest: [".", "--verdict"],
  });
  assert.deepEqual(takeCanonRoot([".", "--verdict", "--canon-root", "x"]), { ok: true, root: "x", rest: [".", "--verdict"] });
});

test("takeCanonRoot refuses a missing value, a repeat, the `=` spelling, and an invalid value", () => {
  assert.match(takeCanonRoot([".", "--canon-root"]).reason, /needs a directory after it/);
  assert.match(takeCanonRoot(["--canon-root", "a", "--canon-root", "b"]).reason, /more than once/);
  assert.match(takeCanonRoot(["--canon-root=a"]).reason, /two arguments/);
  assert.match(takeCanonRoot(["--canon-root", "../x"]).reason, /"\.\."/);
  // A following flag is never swallowed as the root.
  assert.equal(takeCanonRoot(["--canon-root", "--verdict", "."]).ok, false);
});
