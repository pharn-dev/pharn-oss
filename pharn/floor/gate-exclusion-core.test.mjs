// pharn/floor/gate-exclusion-core.test.mjs — the project's `gates` declaration (6.36.0; `timeoutMs` 7.16.0): its closed
// grammar, both directions (L36), every refusal with a non-vacuity control (L34), the loader's absent/unreadable split,
// and the one-copy pins between the declaration's spelling here and the stamp's `declared_in` in gate-run-core.mjs (L35).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXCLUDE_KEY, GATES_KEY, GATES_KEYS, UNKNOWN_KEY_REMEDY, loadGateExclusion, readGateExclusion } from "./gate-exclusion-core.mjs";
import { ALLOWLIST, EXCLUSION_DECLARED_IN, exclusionError } from "./gate-run-core.mjs";
import { CONFIG_FILE } from "./per-test-results-core.mjs";
import { TIMEOUT_KEY, TIMEOUT_MAX_MS } from "./gate-timeout-core.mjs";

const doc = (gates) => JSON.stringify({ testResults: { test: "vitest-json" }, gates });
const none = (exclude = []) => ({ ok: true, exclude, timeoutMs: null });

test("✧ L35 — the stamp's declared_in spells THIS module's file and key path, so the two cannot drift apart", () => {
  assert.equal(EXCLUSION_DECLARED_IN, `${CONFIG_FILE}#${GATES_KEY}.${EXCLUDE_KEY}`);
  assert.deepEqual(GATES_KEYS, [EXCLUDE_KEY, TIMEOUT_KEY]);
  assert.equal(TIMEOUT_KEY, "timeoutMs");
});

test("absent file, absent key, `{}` and `[]` exclude NOTHING and declare no timeout — the byte-for-byte no-change cases (L41)", () => {
  assert.deepEqual(readGateExclusion(null), none());
  assert.deepEqual(readGateExclusion(JSON.stringify({ testResults: { test: "vitest-json" } })), none());
  assert.deepEqual(readGateExclusion(doc({})), none());
  assert.deepEqual(readGateExclusion(doc({ exclude: [] })), none());
});

test("a valid list is returned in ALLOWLIST order, whatever order the file lists (EVERY allowlist member accepted — L52)", () => {
  assert.deepEqual(readGateExclusion(doc({ exclude: ["e2e", "typecheck", "build"] })), none(["typecheck", "build", "e2e"]));
  const reversed = [...ALLOWLIST].reverse();
  assert.deepEqual(readGateExclusion(doc({ exclude: reversed })), none([...ALLOWLIST]));
  for (const id of ALLOWLIST) assert.deepEqual(readGateExclusion(doc({ exclude: [id] })), none([id]));
});

test("7.16.0 — `timeoutMs` is carried as declared, alone or beside `exclude`, at both ends of its range", () => {
  assert.deepEqual(readGateExclusion(doc({ timeoutMs: 900000 })), { ok: true, exclude: [], timeoutMs: 900000 });
  assert.deepEqual(readGateExclusion(doc({ exclude: ["e2e"], timeoutMs: 900000 })), { ok: true, exclude: ["e2e"], timeoutMs: 900000 });
  assert.deepEqual(readGateExclusion(doc({ timeoutMs: 100 })), { ok: true, exclude: [], timeoutMs: 100 });
  assert.deepEqual(readGateExclusion(doc({ timeoutMs: TIMEOUT_MAX_MS })), { ok: true, exclude: [], timeoutMs: TIMEOUT_MAX_MS });
});

test("EVERY malformed shape refuses, loudly, naming the file — one case per rule (L52), each with the valid control above", () => {
  const cases = [
    ["not JSON", "{", /pharn\.config\.json is not valid JSON/],
    ["a JSON array root", "[]", /pharn\.config\.json is not a JSON object/],
    ["a JSON null root", "null", /is not a JSON object/],
    ["gates is an array", doc(["e2e"]), /`gates` must be an object/],
    ["gates is a string", doc("e2e"), /`gates` must be an object/],
    ["gates is null", doc(null), /`gates` must be an object/],
    [
      "an unknown gates key",
      doc({ exclude: [], include: ["e2e"] }),
      /`gates` has the key "include"; its keys are `exclude` and `timeoutMs`/,
    ],
    ["a variant spelling of the key", doc({ excludes: ["e2e"] }), /has the key "excludes"/],
    ["a variant spelling of timeoutMs", doc({ timeout: 900000 }), /has the key "timeout"/],
    ["exclude is a string", doc({ exclude: "e2e" }), /`gates\.exclude` is not an array of gate ids/],
    ["exclude is an object", doc({ exclude: { e2e: true } }), /is not an array of gate ids/],
    ["an id outside the allowlist", doc({ exclude: ["playwright"] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a reserved id", doc({ exclude: ["reconcile"] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a structural id", doc({ exclude: ["structural:x"] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a case variant", doc({ exclude: ["E2E"] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a non-string id", doc({ exclude: [1] }), /entry 0 is not one of the allowlisted gate ids/],
    ["a duplicate", doc({ exclude: ["e2e", "e2e"] }), /entry 1 repeats an id already listed/],
    ["timeoutMs above the bound", doc({ timeoutMs: TIMEOUT_MAX_MS + 1 }), /`gates\.timeoutMs` must be an integer of milliseconds/],
    ["timeoutMs below the floor", doc({ timeoutMs: 99 }), /`gates\.timeoutMs` must be an integer/],
    ["timeoutMs zero", doc({ timeoutMs: 0 }), /`gates\.timeoutMs` must be an integer/],
    ["timeoutMs negative", doc({ timeoutMs: -1 }), /`gates\.timeoutMs` must be an integer/],
    ["timeoutMs a fraction", doc({ timeoutMs: 900000.5 }), /`gates\.timeoutMs` must be an integer/],
    ["timeoutMs a string", doc({ timeoutMs: "900000" }), /`gates\.timeoutMs` must be an integer.*not "900000"/],
    ["timeoutMs null", doc({ timeoutMs: null }), /`gates\.timeoutMs` must be an integer/],
    ["timeoutMs a boolean", doc({ timeoutMs: true }), /`gates\.timeoutMs` must be an integer/],
    ["timeoutMs an array", doc({ timeoutMs: [900000] }), /`gates\.timeoutMs` must be an integer/],
    ["timeoutMs an object", doc({ timeoutMs: {} }), /`gates\.timeoutMs` must be an integer/],
    ["a bad timeoutMs beside a good exclude", doc({ exclude: ["e2e"], timeoutMs: 1 }), /`gates\.timeoutMs`/],
  ];
  for (const [why, text, re] of cases) {
    const r = readGateExclusion(text);
    assert.equal(r.ok, false, why);
    assert.match(r.reason, re, why);
    assert.match(r.reason, /^pharn\.config\.json /, `${why}: the refusal names the file`);
  }
});

test("AC5 — an unknown key names the remedy: the update that knows it, or its removal (with the floor ≤ 7.15.0 text absent)", () => {
  const r = readGateExclusion(doc({ exclude: [], retries: 2 }));
  assert.equal(r.ok, false);
  assert.ok(r.reason.endsWith(UNKNOWN_KEY_REMEDY), r.reason);
  assert.match(r.reason, /npx @pharn-dev\/pharn@latest update/);
  assert.match(r.reason, /otherwise remove it/);
  assert.doesNotMatch(r.reason, /its only key is/, "the pre-7.16.0 wording is gone");
});

test("L15 — a prototype-named key is an UNKNOWN key, never an inherited member; `toString` is not a gate id or a timeout", () => {
  const proto = readGateExclusion('{"gates": {"__proto__": ["e2e"]}}');
  assert.equal(proto.ok, false);
  assert.match(proto.reason, /has the key "__proto__"/);
  const protoTimeout = readGateExclusion('{"gates": {"__proto__": {"timeoutMs": 900000}}}');
  assert.equal(protoTimeout.ok, false, "a timeoutMs reached through __proto__ is never read as a value");
  assert.match(protoTimeout.reason, /has the key "__proto__"/);
  assert.equal(readGateExclusion(doc({ toString: [] })).ok, false);
  assert.equal(readGateExclusion(doc({ exclude: ["toString"] })).ok, false);
  assert.equal(readGateExclusion(doc({ exclude: ["constructor"] })).ok, false);
  // `gates` reached only as an OWN property: a config with no gates key but a hostile prototype excludes nothing
  assert.deepEqual(readGateExclusion('{"__proto__": {"gates": {"exclude": ["test"], "timeoutMs": 900000}}}'), none());
});

test('L62 — {"toString":1} as an id, a key value, the block or the timeout is refused and never throws (with the String() control)', () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: this value really does make String() throw");
  for (const text of [
    doc({ exclude: [hostile] }),
    doc(hostile),
    doc({ exclude: hostile }),
    doc({ timeoutMs: hostile }),
    doc({ timeoutMs: [hostile] }),
  ]) {
    const r = readGateExclusion(text);
    assert.equal(r.ok, false);
    assert.equal(typeof r.reason, "string");
  }
  assert.notEqual(exclusionError([hostile]), null);
});

test("the loader: an absent file excludes nothing; a present one is read; an unreadable one REFUSES (never 'absent')", () => {
  const dir = mkdtempSync(join(tmpdir(), "gx-"));
  try {
    assert.deepEqual(loadGateExclusion(dir), none());
    writeFileSync(join(dir, CONFIG_FILE), doc({ exclude: ["e2e"] }));
    assert.deepEqual(loadGateExclusion(dir), none(["e2e"]));
    writeFileSync(join(dir, CONFIG_FILE), doc({ timeoutMs: 600000 }));
    assert.deepEqual(loadGateExclusion(dir), { ok: true, exclude: [], timeoutMs: 600000 });
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
