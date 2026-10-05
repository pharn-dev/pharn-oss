// pharn/floor/gate-exclusion-core.test.mjs — the project's gate-exclusion declaration (6.36.0): its closed grammar,
// both directions (L36), every refusal with a non-vacuity control (L34), the loader's absent/unreadable split, and the
// one-copy pins between the declaration's spelling here and the stamp's `declared_in` in gate-run-core.mjs (L35).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXCLUDE_KEY, GATES_KEY, GATES_KEYS, loadGateExclusion, readGateExclusion } from "./gate-exclusion-core.mjs";
import { ALLOWLIST, EXCLUSION_DECLARED_IN, exclusionError } from "./gate-run-core.mjs";
import { CONFIG_FILE } from "./test-results-core.mjs";

const doc = (gates) => JSON.stringify({ testResults: { test: "vitest-json" }, gates });

test("✧ L35 — the stamp's declared_in spells THIS module's file and key path, so the two cannot drift apart", () => {
  assert.equal(EXCLUSION_DECLARED_IN, `${CONFIG_FILE}#${GATES_KEY}.${EXCLUDE_KEY}`);
  assert.deepEqual(GATES_KEYS, [EXCLUDE_KEY]);
});

test("absent file, absent key, `{}` and `[]` exclude NOTHING — the byte-for-byte no-change cases", () => {
  assert.deepEqual(readGateExclusion(null), { ok: true, exclude: [] });
  assert.deepEqual(readGateExclusion(JSON.stringify({ testResults: { test: "vitest-json" } })), { ok: true, exclude: [] });
  assert.deepEqual(readGateExclusion(doc({})), { ok: true, exclude: [] });
  assert.deepEqual(readGateExclusion(doc({ exclude: [] })), { ok: true, exclude: [] });
});

test("a valid list is returned in ALLOWLIST order, whatever order the file lists (EVERY allowlist member accepted — L52)", () => {
  assert.deepEqual(readGateExclusion(doc({ exclude: ["e2e", "typecheck", "build"] })), {
    ok: true,
    exclude: ["typecheck", "build", "e2e"],
  });
  const reversed = [...ALLOWLIST].reverse();
  assert.deepEqual(readGateExclusion(doc({ exclude: reversed })), { ok: true, exclude: [...ALLOWLIST] });
  for (const id of ALLOWLIST) assert.deepEqual(readGateExclusion(doc({ exclude: [id] })), { ok: true, exclude: [id] });
});

test("EVERY malformed shape refuses, loudly, naming the file — one case per rule (L52), each with the valid control above", () => {
  const cases = [
    ["not JSON", "{", /pharn\.config\.json is not valid JSON/],
    ["a JSON array root", "[]", /pharn\.config\.json is not a JSON object/],
    ["a JSON null root", "null", /is not a JSON object/],
    ["gates is an array", doc(["e2e"]), /`gates` must be an object/],
    ["gates is a string", doc("e2e"), /`gates` must be an object/],
    ["gates is null", doc(null), /`gates` must be an object/],
    ["an unknown gates key", doc({ exclude: [], include: ["e2e"] }), /`gates` has the key "include"; its only key is `exclude`/],
    ["a variant spelling of the key", doc({ excludes: ["e2e"] }), /has the key "excludes"/],
    ["exclude is a string", doc({ exclude: "e2e" }), /`gates\.exclude` is not an array of gate ids/],
    ["exclude is an object", doc({ exclude: { e2e: true } }), /is not an array of gate ids/],
    ["an id outside the allowlist", doc({ exclude: ["playwright"] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a reserved id", doc({ exclude: ["reconcile"] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a structural id", doc({ exclude: ["structural:x"] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a case variant", doc({ exclude: ["E2E"] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a non-string id", doc({ exclude: [1] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a duplicate", doc({ exclude: ["e2e", "e2e"] }), /entry 1 repeats an id already listed/],
  ];
  for (const [why, text, re] of cases) {
    const r = readGateExclusion(text);
    assert.equal(r.ok, false, why);
    assert.match(r.reason, re, why);
    assert.match(r.reason, /^pharn\.config\.json /, `${why}: the refusal names the file`);
  }
});

test("L15 — a prototype-named key is an UNKNOWN key, never an inherited member; `toString` is not a gate id", () => {
  const proto = readGateExclusion('{"gates": {"__proto__": ["e2e"]}}');
  assert.equal(proto.ok, false);
  assert.match(proto.reason, /has the key "__proto__"/);
  assert.equal(readGateExclusion(doc({ toString: [] })).ok, false);
  assert.equal(readGateExclusion(doc({ exclude: ["toString"] })).ok, false);
  assert.equal(readGateExclusion(doc({ exclude: ["constructor"] })).ok, false);
  // `gates` reached only as an OWN property: a config with no gates key but a hostile prototype excludes nothing
  assert.deepEqual(readGateExclusion('{"__proto__": {"gates": {"exclude": ["test"]}}}'), { ok: true, exclude: [] });
});

test('L62 — {"toString":1} as an id, a key value or the block is refused and never throws (with the String() control)', () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: this value really does make String() throw");
  for (const text of [doc({ exclude: [hostile] }), doc(hostile), doc({ exclude: hostile })]) {
    const r = readGateExclusion(text);
    assert.equal(r.ok, false);
    assert.equal(typeof r.reason, "string");
  }
  assert.notEqual(exclusionError([hostile]), null);
});

test("the loader: an absent file excludes nothing; a present one is read; an unreadable one REFUSES (never 'absent')", () => {
  const dir = mkdtempSync(join(tmpdir(), "gx-"));
  try {
    assert.deepEqual(loadGateExclusion(dir), { ok: true, exclude: [] });
    writeFileSync(join(dir, CONFIG_FILE), doc({ exclude: ["e2e"] }));
    assert.deepEqual(loadGateExclusion(dir), { ok: true, exclude: ["e2e"] });
    rmSync(join(dir, CONFIG_FILE));
    mkdirSync(join(dir, CONFIG_FILE));
    const r = loadGateExclusion(dir);
    assert.equal(r.ok, false);
    assert.match(r.reason, /pharn\.config\.json is unreadable \(EISDIR\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.throws(() => loadGateExclusion(""), TypeError, "the directory is required (L41)");
  assert.throws(() => loadGateExclusion(), TypeError);
});
