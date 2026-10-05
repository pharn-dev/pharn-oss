// pharn/floor/gate-reuse-core.test.mjs — the pure reuse rules (verify-head-gate-reuse, 6.34.0).
//
// Every identity COMPONENT and every eligibility RULE is an enumeration the tests iterate (L29), each with its own
// mutant that must flip a HIT to a MISS (L60: a negative control per asserted property, never per loop). The
// irrelevant-metadata controls prove the opposite direction: what the identity leaves out cannot cause a false miss.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IDENTITY_SCHEMA,
  MAX_REUSABLE_EXIT,
  NON_REUSABLE_IDS,
  REUSE_MISSES,
  executionIdentity,
  findReusable,
  reusedRunRecord,
  sha256Hex,
} from "./gate-reuse-core.mjs";
import { OFFER_SCHEMA, OFFER_BASENAME, buildOffer, validateOffer, acceptReuseSource } from "./head-reuse-offer.mjs";
import { ALLOWLIST, LEVEL_GATES, STYLE_SET, SCHEMA, validateStamp, NON_REUSABLE_IDS as CORE_NON_REUSABLE } from "./gate-run-core.mjs";
import { DELIVERY_COMMANDS } from "./stage-regress-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FEATURE = "demo";
const H = (c) => c.repeat(64);
const HEAD = "a".repeat(40);

const BASE_ID = Object.freeze({
  shell: null,
  argv: ["npm", "run", "typecheck"],
  files: [],
  cwdAbs: "/work/project",
  timeoutMs: 540000,
  head: HEAD,
  fingerprintAlgo: "worktree-fingerprint/2+sha256",
  fpBefore: H("1"),
});

function id(overrides = {}) {
  const r = executionIdentity({ ...BASE_ID, ...overrides });
  assert.equal(r.ok, true, JSON.stringify(overrides));
  return r.value;
}

// ── THE IDENTITY ────────────────────────────────────────────────────────────────────────────────────
test("identity: deterministic, a sha256, and schema-versioned", () => {
  assert.equal(IDENTITY_SCHEMA, "gate-execution-identity/1");
  assert.match(id(), /^[0-9a-f]{64}$/);
  assert.equal(id(), id(), "the same inputs give the same identity");
});

/** L29/L60 — every MATERIAL component, each with the one mutation that must move the identity. */
const MATERIAL = Object.freeze([
  ["argv (the command)", { argv: ["npm", "run", "type-check"] }],
  ["argv (an added argument)", { argv: ["npm", "run", "typecheck", "--", "--strict"] }],
  ["shell instead of argv", { shell: "npm run typecheck", argv: null }],
  ["files (one added)", { files: ["src/a.test.js"] }],
  ["files (a different file)", { files: ["src/b.test.js"] }],
  ["cwd", { cwdAbs: "/work/project/.pharn/pharn-regress/base" }],
  ["timeout", { timeoutMs: 30000 }],
  ["git HEAD", { head: "b".repeat(40) }],
  ["git HEAD absent", { head: null }],
  ["fingerprint algo", { fingerprintAlgo: "worktree-fingerprint/1+sha256" }],
  ["fingerprint digest (the tree)", { fpBefore: H("2") }],
]);

test("identity NEGATIVE CONTROLS — each material component alone moves the identity", () => {
  const base = id();
  for (const [name, o] of MATERIAL) assert.notEqual(id(o), base, `${name} must be part of the identity`);
});

test("identity NEGATIVE CONTROL — file ORDER is material (a runner may read positional files in order)", () => {
  assert.notEqual(id({ files: ["a.js", "b.js"] }), id({ files: ["b.js", "a.js"] }));
});

test("identity: two different shell texts differ (the explicit --gates case)", () => {
  assert.notEqual(id({ shell: "npm run typecheck", argv: null }), id({ shell: "npm run typecheck --strict", argv: null }));
});

test("identity IRRELEVANT METADATA — the gate id, seq, stage, <out> and the PHARN_TEST_RESULTS value are not inputs", () => {
  // The function has no parameter for any of them, so passing one changes nothing: a stage label or position cannot
  // cause a false MISS. (The runner-level test proves the same with a real regress seq/out differing from verify's.)
  const withNoise = executionIdentity({ ...BASE_ID, id: "other", seq: 7, stage: "regress", out: ".pharn/x", results: "/tmp/r.json" });
  assert.equal(withNoise.value, id());
});

test("identity: a malformed input has NO identity (fail-closed: it can never match)", () => {
  const bad = [
    { shell: null, argv: null },
    { shell: "x", argv: ["x"] },
    { argv: ["npm", 1] },
    { files: "a.js" },
    { files: [1] },
    { cwdAbs: "relative/path" },
    { cwdAbs: null },
    { timeoutMs: 0 },
    { timeoutMs: 1.5 },
    { head: "HEAD" },
    { head: "a".repeat(39) },
    { fingerprintAlgo: "" },
    { fpBefore: "not-a-digest" },
    { fpBefore: { toString: 1 } },
  ];
  for (const o of bad) assert.deepEqual(executionIdentity({ ...BASE_ID, ...o }), { ok: false }, JSON.stringify(o));
});

// ── THE NEVER-REUSED SET ───────────────────────────────────────────────────────────────────────────
test("NON_REUSABLE_IDS is DERIVED — every AC level gate, every style gate, reconcile, instruction-growth; re-exported, one owner", () => {
  const expected = [...new Set([...Object.values(LEVEL_GATES).flat(), ...STYLE_SET, "reconcile", "instruction-growth"])].sort();
  assert.deepEqual([...NON_REUSABLE_IDS], expected);
  assert.equal(NON_REUSABLE_IDS, CORE_NON_REUSABLE, "gate-reuse-core re-exports gate-run-core's set, never a copy");
  // Closed over the allowlist both ways (L36): exactly these allowlist members stay reusable.
  const reusable = ALLOWLIST.filter((g) => !NON_REUSABLE_IDS.includes(g));
  assert.deepEqual(reusable, ["typecheck", "type-check", "build"]);
});

// ── findReusable — the per-entry decision ──────────────────────────────────────────────────────────
function run(seq, gate, extra = {}) {
  const argv = ["npm", "run", gate];
  return {
    seq,
    id: gate,
    exit: 0,
    ran: true,
    timed_out: false,
    mutated: false,
    reason: null,
    argv,
    shell: null,
    files: [],
    fp_before: H("1"),
    fp_after: H("1"),
    stdout_sha256: H("e"),
    stderr_sha256: H("f"),
    results_sha256: null,
    identity_sha256: id({ argv }),
    ...extra,
  };
}

function headStamp(runs = [run(0, "test", { files: ["src/a.test.js"] }), run(1, "typecheck"), run(2, "build")]) {
  return {
    schema: SCHEMA,
    stage: "regress",
    side: "head",
    feature: FEATURE,
    head: HEAD,
    source: "discover",
    source_raw: null,
    style_skipped: true,
    finalized: true,
    fingerprint: { algo: BASE_ID.fingerprintAlgo, init: H("1"), final: H("1") },
    required: runs.map((r) => r.id),
    runs,
    aux: { completeness: null },
  };
}

const entry = (gate, extra = {}) => ({ seq: 4, id: gate, shell: null, argv: ["npm", "run", gate], files: [], ...extra });
const live = (gate) => id({ argv: ["npm", "run", gate] });

test("findReusable HIT — an equivalent completed execution, at a DIFFERENT seq than the verify entry", () => {
  const src = headStamp();
  assert.ok(validateStamp(src, { stage: "regress", side: "head", feature: FEATURE }).ok, "the fixture is a valid head stamp");
  const r = findReusable({ source: src, feature: FEATURE, entry: entry("typecheck"), liveIdentity: live("typecheck") });
  assert.equal(r.hit, true, JSON.stringify(r));
  assert.equal(r.run.seq, 1, "the source's own seq; the verify entry is at seq 4");
});

test("findReusable: a completed RED is a result (exit 1 and the max process exit HIT); spawn failures and signals MISS", () => {
  for (const exit of [1, 2, MAX_REUSABLE_EXIT]) {
    const src = headStamp([run(0, "typecheck", { exit })]);
    assert.equal(
      findReusable({ source: src, feature: FEATURE, entry: entry("typecheck"), liveIdentity: live("typecheck") }).hit,
      true,
      `exit ${exit}`
    );
  }
  for (const exit of [126, 127, 128, 137, 143, -1]) {
    const src = headStamp([run(0, "typecheck", { exit })]);
    assert.deepEqual(
      findReusable({ source: src, feature: FEATURE, entry: entry("typecheck"), liveIdentity: live("typecheck") }),
      { hit: false, miss: "not-completed" },
      `exit ${exit}`
    );
  }
});

/** L29/L60 — every ELIGIBILITY rule, each with the mutation that must turn the HIT into its own miss. */
const ELIGIBILITY = Object.freeze([
  ["timed out", { timed_out: true, exit: 124 }, "not-completed"],
  ["mutated flag", { mutated: true, fp_after: H("2") }, "mutated"],
  ["results file recorded", { results_sha256: H("9") }, "results-written"],
  ["no identity recorded (pre-6.34.0)", { identity_sha256: undefined }, "identity-missing"],
  ["another identity", { identity_sha256: H("7") }, "identity-mismatch"],
  ["another argv under the same identity digest (forged)", { argv: ["npm", "run", "build"] }, "identity-mismatch"],
  ["files differ (a test subset)", { files: ["src/a.test.js"] }, "identity-mismatch"],
  ["shell instead of argv", { shell: "npm run typecheck", argv: null }, "identity-mismatch"],
  ["a log digest missing", { stdout_sha256: null }, "log-unverified"],
]);

test("findReusable ELIGIBILITY CONTROLS — each rule alone turns the HIT into its own miss", () => {
  for (const [name, extra, expected] of ELIGIBILITY) {
    const r = run(0, "typecheck", extra);
    for (const [k, v] of Object.entries(extra)) if (v === undefined) delete r[k];
    const src = headStamp([r]);
    assert.deepEqual(
      findReusable({ source: src, feature: FEATURE, entry: entry("typecheck"), liveIdentity: live("typecheck") }),
      { hit: false, miss: expected },
      name
    );
  }
  // results_sha256 ABSENT (a stamp before the field) is not "no results file" — a miss.
  const r = run(0, "typecheck");
  delete r.results_sha256;
  assert.equal(
    findReusable({ source: headStamp([r]), feature: FEATURE, entry: entry("typecheck"), liveIdentity: live("typecheck") }).miss,
    "results-written"
  );
});

test("findReusable: a no-files regress entry and a reused entry are never a source (no chains)", () => {
  const noFiles = run(0, "typecheck", { ran: false, reason: "no-files" });
  assert.equal(
    findReusable({ source: headStamp([noFiles]), feature: FEATURE, entry: entry("typecheck"), liveIdentity: live("typecheck") }).miss,
    "not-completed"
  );
});

test("findReusable: every NON_REUSABLE_IDS member is refused BEFORE any lookup, even with an identical source run", () => {
  for (const gate of NON_REUSABLE_IDS) {
    const src = headStamp([run(0, gate)]);
    assert.deepEqual(
      findReusable({ source: src, feature: FEATURE, entry: entry(gate), liveIdentity: live(gate) }),
      { hit: false, miss: "not-reusable-id" },
      gate
    );
  }
});

test("findReusable: same gate ID is never enough — the id is only the lookup key", () => {
  // The scoped regress `test` run vs verify's full `test`: excluded twice over (an AC level gate, and different files).
  const src = headStamp();
  assert.equal(findReusable({ source: src, feature: FEATURE, entry: entry("test"), liveIdentity: live("test") }).hit, false);
  // A reusable id whose live identity differs (another tree): the id matches, the identity does not.
  assert.equal(
    findReusable({ source: src, feature: FEATURE, entry: entry("typecheck"), liveIdentity: id({ fpBefore: H("3") }) }).miss,
    "identity-mismatch"
  );
});

test("findReusable: no candidate, and a source that is not this feature's finalized regress/head stamp", () => {
  const src = headStamp();
  assert.equal(
    findReusable({ source: src, feature: FEATURE, entry: entry("type-check"), liveIdentity: live("type-check") }).miss,
    "no-candidate"
  );
  const variants = [
    { ...src, side: "base" },
    { ...src, stage: "verify", side: null },
    { ...src, feature: "other" },
    { ...src, finalized: false },
    { ...src, schema: "gate-run-record/2" },
    null,
    [],
    { toString: 1 },
  ];
  for (const v of variants) {
    assert.equal(
      findReusable({ source: v, feature: FEATURE, entry: entry("typecheck"), liveIdentity: live("typecheck") }).miss,
      "source-invalid"
    );
  }
});

// ── reusedRunRecord — the one shape validateStamp admits ──────────────────────────────────────────
test("reusedRunRecord: the record a HIT writes validates inside a verify stamp, and says VERIFY ran nothing", () => {
  const src = headStamp();
  const cand = src.runs[1];
  const rec = reusedRunRecord({
    entry: { ...entry("typecheck"), seq: 1 },
    candidate: cand,
    sourceSha256: H("5"),
    liveFp: H("1"),
    liveIdentity: live("typecheck"),
  });
  assert.equal(rec.ran, false);
  assert.equal(rec.reason, "reused");
  assert.deepEqual(rec.reused, { stage: "regress", side: "head", seq: 1, stamp_sha256: H("5") });
  assert.equal(rec.exit, cand.exit);
  const verify = {
    ...headStamp([run(0, "test"), rec, { ...run(2, "reconcile"), argv: ["node", "x"] }]),
    stage: "verify",
    side: null,
    required: ["test", "typecheck"],
  };
  assert.deepEqual(validateStamp(verify, { stage: "verify", feature: FEATURE }), { ok: true });
});

// ── THE OFFER ──────────────────────────────────────────────────────────────────────────────────────
const NOW = 1_800_000_000_000;
const MARKER = Buffer.from('{"schema":"pharn-loop-active/1"}\n');
function markers(which = "pharn-loop", extra = {}) {
  const m = {};
  for (const c of DELIVERY_COMMANDS) m[c] = { state: "absent" };
  if (which) m[which] = { state: "ok", bytes: MARKER, mtimeMs: NOW - 1000 };
  return { ...m, ...extra };
}
const STAMP_BYTES = Buffer.from(JSON.stringify(headStamp()));
function offerBytes(o) {
  return { state: "ok", bytes: Buffer.from(JSON.stringify(o)) };
}
const GOOD_OFFER = buildOffer({
  feature: FEATURE,
  run: { command: "pharn-loop", markerSha256: sha256Hex(MARKER) },
  stampSha256: sha256Hex(STAMP_BYTES),
});

test("offer: the record's constants and CLOSED shape (both directions)", () => {
  assert.equal(OFFER_SCHEMA, "pharn-regress-head-offer/1");
  assert.equal(OFFER_BASENAME, "pharn-regress-head-offer.json");
  assert.equal(validateOffer(GOOD_OFFER), true);
  const bad = [
    { ...GOOD_OFFER, extra: 1 },
    { ...GOOD_OFFER, schema: "x" },
    { ...GOOD_OFFER, feature: "../x" },
    { ...GOOD_OFFER, run: { command: "pharn-review", marker_sha256: H("a") } },
    { ...GOOD_OFFER, run: { command: "pharn-loop", marker_sha256: "x" } },
    { ...GOOD_OFFER, run: { command: "pharn-loop", marker_sha256: H("a"), x: 1 } },
    { ...GOOD_OFFER, stamp_sha256: "x" },
    null,
    [],
  ];
  for (const b of bad) assert.equal(validateOffer(b), false, JSON.stringify(b));
  const missing = { ...GOOD_OFFER };
  delete missing.run;
  assert.equal(validateOffer(missing), false);
});

test("acceptReuseSource: the current run's offer binding these exact bytes is accepted, with their digest", () => {
  const r = acceptReuseSource({
    feature: FEATURE,
    markers: markers(),
    now: NOW,
    offer: offerBytes(GOOD_OFFER),
    stamp: { state: "ok", bytes: STAMP_BYTES },
  });
  assert.deepEqual(r, { ok: true, stampSha256: sha256Hex(STAMP_BYTES) });
});

test("acceptReuseSource CONTROLS — each condition alone refuses, with its own miss (first failure decides)", () => {
  const ok = { feature: FEATURE, markers: markers(), now: NOW, offer: offerBytes(GOOD_OFFER), stamp: { state: "ok", bytes: STAMP_BYTES } };
  const cases = [
    ["no marker (a standalone verify)", { markers: markers(null) }, "no-delivery-run"],
    [
      "two markers (ambiguous)",
      { markers: markers("pharn-loop", { "pharn-ship": { state: "ok", bytes: MARKER, mtimeMs: NOW } }) },
      "no-delivery-run",
    ],
    [
      "a stale marker (> 24 h)",
      { markers: markers("pharn-loop", { "pharn-loop": { state: "ok", bytes: MARKER, mtimeMs: NOW - 25 * 3600 * 1000 } }) },
      "no-delivery-run",
    ],
    ["no offer (no regress published one — e.g. --quick)", { offer: { state: "absent" } }, "no-offer"],
    ["an unusable offer (a link, a directory)", { offer: { state: "unusable" } }, "offer-malformed"],
    ["an offer that is not JSON", { offer: { state: "ok", bytes: Buffer.from("{") } }, "offer-malformed"],
    ["an offer of the wrong shape", { offer: offerBytes({ ...GOOD_OFFER, schema: "x" }) }, "offer-malformed"],
    ["another feature's offer", { offer: offerBytes({ ...GOOD_OFFER, feature: "other" }) }, "other-run"],
    [
      "an earlier run's offer (another marker digest)",
      { offer: offerBytes({ ...GOOD_OFFER, run: { command: "pharn-loop", marker_sha256: H("b") } }) },
      "other-run",
    ],
    [
      "the other delivery command's offer",
      { offer: offerBytes({ ...GOOD_OFFER, run: { command: "pharn-ship", marker_sha256: sha256Hex(MARKER) } }) },
      "other-run",
    ],
    ["no head stamp", { stamp: { state: "absent" } }, "source-absent"],
    ["an unusable head stamp", { stamp: { state: "unusable" } }, "source-unusable"],
    ["a head stamp the offer did not bind (planted or rewritten)", { stamp: { state: "ok", bytes: Buffer.from("{}") } }, "source-unbound"],
  ];
  for (const [name, o, miss] of cases) assert.deepEqual(acceptReuseSource({ ...ok, ...o }), { ok: false, miss }, name);
});

// ── CLOSURE (L36) — every miss the modules emit is a member, and every member has an emitter ────────
test("REUSE_MISSES is closed both ways over gate-reuse-core.mjs, head-reuse-offer.mjs and run-gates.mjs", () => {
  const src = ["gate-reuse-core.mjs", "head-reuse-offer.mjs", "run-gates.mjs"].map((f) => readFileSync(join(HERE, f), "utf8")).join("\n");
  const emitted = new Set([
    ...[...src.matchAll(/\b(?:miss|refuse)\("([a-z-]+)"\)/g)].map((m) => m[1]),
    ...[...src.matchAll(/miss: "([a-z-]+)"/g)].map((m) => m[1]),
  ]);
  for (const m of emitted) assert.ok(REUSE_MISSES.includes(m), `emitted miss '${m}' is not in REUSE_MISSES`);
  for (const m of REUSE_MISSES) assert.ok(emitted.has(m), `REUSE_MISSES member '${m}' has no emitter`);
});

test("TOTAL (L62) — hostile parsed JSON never throws", () => {
  const hostile = [{ toString: 1 }, [{ toString: 1 }], null, 3, "x"];
  for (const h of hostile) {
    assert.doesNotThrow(() => findReusable({ source: h, feature: FEATURE, entry: h, liveIdentity: h }));
    assert.doesNotThrow(() => acceptReuseSource({ feature: FEATURE, markers: h, now: NOW, offer: h, stamp: h }));
    assert.doesNotThrow(() => validateOffer(h));
    assert.doesNotThrow(() => executionIdentity({ ...BASE_ID, argv: h, files: h }));
  }
  const src = headStamp([run(0, "typecheck", { argv: [{ toString: 1 }] })]);
  assert.doesNotThrow(() => findReusable({ source: src, feature: FEATURE, entry: entry("typecheck"), liveIdentity: live("typecheck") }));
});

// ── LOAD GRAPH (GATE-2 review, P3) — the runner's reuse core carries no regress-stage module ───────────
test("★ LOAD GRAPH — gate-reuse-core.mjs imports only gate-run-core.mjs (and node:crypto); the offer rule lives elsewhere", () => {
  const src = readFileSync(join(HERE, "gate-reuse-core.mjs"), "utf8");
  const imports = [...src.matchAll(/^import\s+.*?from\s+["']([^"']+)["'];?\s*$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["node:crypto", "./gate-run-core.mjs"]);
  const mutant = `${src}\nimport { DELIVERY_COMMANDS } from "./stage-regress-core.mjs";\n`;
  assert.notDeepEqual(
    [...mutant.matchAll(/^import\s+.*?from\s+["']([^"']+)["'];?\s*$/gm)].map((m) => m[1]),
    imports,
    "the scan can fail (L60)"
  );
});
