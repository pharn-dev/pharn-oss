// pharn/floor/regress-install-config-core.test.mjs — the project's declared BASE install (6.66.0, regress-install-config,
// audit LOOP-11): its closed grammar in both directions (L36), own-property reads (L15), total quoting in every refusal
// (L62), the loader's absent/unreadable split, and the one-owner pin of the value set (L35).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { INSTALL_KEY, REGRESS_KEY, REGRESS_KEYS, loadRegressInstall, readRegressInstall } from "./regress-install-config-core.mjs";
import { DECLARED_INSTALL_VALUES, HEAD_MODULES_LINK, INSTALL_DECLARED_IN, LOCKFILE_FAMILIES } from "./stage-regress-core.mjs";
import { CONFIG_FILE } from "./per-test-results-core.mjs";

const doc = (regress) => JSON.stringify({ gates: { exclude: [] }, regress });

test("✧ L35/L36 — the value set is EXACTLY none, head-node-modules and the lockfile families, owned by stage-regress-core", () => {
  assert.deepEqual([...DECLARED_INSTALL_VALUES], ["none", HEAD_MODULES_LINK, ...Object.keys(LOCKFILE_FAMILIES)]);
  assert.deepEqual([...DECLARED_INSTALL_VALUES], ["none", "head-node-modules", "npm", "pnpm", "yarn", "bun"]);
  assert.deepEqual(REGRESS_KEYS, [INSTALL_KEY]);
  assert.equal(INSTALL_DECLARED_IN, `${CONFIG_FILE}#${REGRESS_KEY}.${INSTALL_KEY}`);
});

test("absent file, absent key, `{}` declare NOTHING — the no-change cases", () => {
  assert.deepEqual(readRegressInstall(null), { ok: true, install: null });
  assert.deepEqual(readRegressInstall(JSON.stringify({ gates: { exclude: ["e2e"] } })), { ok: true, install: null });
  assert.deepEqual(readRegressInstall(doc({})), { ok: true, install: null });
});

test("EVERY member is accepted, spelled exactly (L52 — the whole set, not one member)", () => {
  for (const v of DECLARED_INSTALL_VALUES) assert.deepEqual(readRegressInstall(doc({ install: v })), { ok: true, install: v }, v);
});

test("EVERY malformed shape refuses, loudly, naming the file — one case per rule, each with the valid control above", () => {
  const cases = [
    ["not JSON", "{", /pharn\.config\.json is not valid JSON/],
    ["a JSON array root", "[]", /is not a JSON object/],
    ["a JSON null root", "null", /is not a JSON object/],
    ["regress is an array", doc(["none"]), /`regress` must be an object/],
    ["regress is a string", doc("none"), /`regress` must be an object/],
    ["regress is null", doc(null), /`regress` must be an object/],
    ["an unknown regress key", doc({ install: "none", base: "x" }), /`regress` has the key "base"; its only key is `install`/],
    ["a variant spelling of the key", doc({ installs: "none" }), /has the key "installs"/],
    ["a command string (never a shell command — SEC-4)", doc({ install: "npm ci" }), /`regress\.install` is "npm ci"; it must be one of/],
    ["a non-frozen install", doc({ install: "npm install" }), /is "npm install"/],
    ["a case variant", doc({ install: "NPM" }), /is "NPM"/],
    ["a padded variant", doc({ install: " npm" }), /is " npm"/],
    ["an empty string", doc({ install: "" }), /is ""/],
    ["a number", doc({ install: 1 }), /is "1"/],
    ["null", doc({ install: null }), /is "null"/],
    ["an array", doc({ install: ["npm"] }), /is "npm"/],
    ["a boolean", doc({ install: true }), /is "true"/],
  ];
  for (const [why, text, re] of cases) {
    const r = readRegressInstall(text);
    assert.equal(r.ok, false, why);
    assert.match(r.reason, re, why);
    assert.match(r.reason, /^pharn\.config\.json /, `${why}: the refusal names the file`);
  }
});

test("L62 — a value whose String() throws is REFUSED with a reason, never a crash (with the control that it does throw)", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "CONTROL: String() really throws on this value");
  const r = readRegressInstall(doc({ install: hostile }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /`regress\.install` is "\[object Object\]"/);
  const key = readRegressInstall(JSON.stringify({ regress: { toString: 1 } }));
  assert.equal(key.ok, false, "an own `toString` key is an unknown key");
  assert.match(key.reason, /has the key "toString"/);
});

test("L15 — inherited members never answer: only OWN `regress` / `install` keys are read", () => {
  // JSON.parse makes `__proto__` an OWN key, so it is an unknown key here, never the prototype.
  const proto = readRegressInstall('{"regress": {"__proto__": {"install": "npm"}}}');
  assert.equal(proto.ok, false);
  assert.match(proto.reason, /has the key "__proto__"/);
  // A document with no own `regress` declares nothing, whatever Object.prototype carries.
  Object.prototype.regress = { install: "npm" };
  try {
    assert.deepEqual(readRegressInstall(JSON.stringify({ gates: {} })), { ok: true, install: null });
    assert.deepEqual(readRegressInstall(doc({})), { ok: true, install: null });
  } finally {
    delete Object.prototype.regress;
  }
});

test("loadRegressInstall: an absent file declares nothing; an unreadable one refuses, never reads as absent", () => {
  const dir = mkdtempSync(join(tmpdir(), "ric-"));
  try {
    assert.deepEqual(loadRegressInstall(dir), { ok: true, install: null }, "absent");
    writeFileSync(join(dir, CONFIG_FILE), doc({ install: "head-node-modules" }));
    assert.deepEqual(loadRegressInstall(dir), { ok: true, install: "head-node-modules" }, "CONTROL: a readable file is read");
    rmSync(join(dir, CONFIG_FILE));
    mkdirSync(join(dir, CONFIG_FILE));
    const r = loadRegressInstall(dir);
    assert.equal(r.ok, false);
    assert.match(r.reason, /is unreadable \(EISDIR\)/);
    assert.throws(() => loadRegressInstall(""), TypeError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
