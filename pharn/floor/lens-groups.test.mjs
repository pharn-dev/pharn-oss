// pharn/floor/lens-groups.test.mjs — the family map's invariants and the grouping helper (review-lens-grouping).
//
// THREE KINDS OF PIN, each with its own negative controls (L60 — a control per asserted property, not per loop):
//   ★ MAP: the COMMITTED pharn/floor/lens-family-map.json against REALITY — count-lenses.mjs's live membership and
//     lens-scanner-map.json's bases. Closed both ways (L36), non-empty first (L34). Each invariant is a function over
//     plain data, so its control runs the same predicate on an in-memory mutant: a lens dropped or doubled, a 23rd
//     lens, `trust-fence` given a sibling, a mixed-basis family, an empty family.
//   ★ DERIVATION: computeLensGroups over hand-built records — idle, scanner_errors-only, a partly active family, a lens
//     the map does not name, a map member the record lacks, map order over record order, the null-map fallback. Every
//     fixture has at least one active group (L34). Prototype names (L15) and `{"toString":1}` refusals (L62).
//   ★ CLI: the line /pharn-review Step 3 pins, read from the command and executed verbatim (only `<name>` filled in),
//     over a record the REAL emitter wrote with REAL scanners in a scratch tree that holds the COMMITTED map — no option
//     beyond the record path, the one path the command uses (L41). It also pins the three exit codes and that exit 1
//     prints nothing.
//
// HONEST SCOPE (P0): green means the map holds its invariants in THIS repository and the helper computes the groups it
// documents. It never means a run spawned those groups, that a lens in a group judged only its own files, or anything
// about the subagent type the groups run as (that is .dev/floor/review-lens-agent.test.mjs's text pin, and advisory).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FENCE_LENS,
  SCHEMA,
  UNWRITTEN_REASONS,
  checkFamilyMap,
  computeLensGroups,
  readFamilyMap,
  unwrittenLenses,
} from "./lens-groups.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const COMMITTED_MAP = JSON.parse(readFileSync(join(HERE, "lens-family-map.json"), "utf8"));
const SCANNERS = JSON.parse(readFileSync(join(HERE, "lens-scanner-map.json"), "utf8")).scanners;

/** count-lenses.mjs's live membership, as lens names. */
function registeredLenses() {
  const r = spawnSync(process.execPath, [join(HERE, "count-lenses.mjs"), REPO], { encoding: "utf8" });
  assert.equal(r.status, 0, `count-lenses.mjs must exit 0: ${r.stderr}`);
  return JSON.parse(r.stdout).lenses.map((p) => basename(dirname(p)));
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

/**
 * The six security lenses GATE 1 round 2 kept each alone (question 1, option a): a human-ratified list pinned HERE, not
 * derived from anything. `input-validation` is not on it: it runs in `whole-target`, as GATE 1 approved. The helper does
 * not refuse a grouped security lens at run time; only this test over the committed map holds them alone.
 */
const SECURITY_SOLOS = Object.freeze([
  "injection",
  "insecure-crypto",
  "path-traversal",
  "secrets-in-code",
  "ssrf",
  "unsafe-deserialization",
]);

// ── ★ MAP — the committed map against reality ──────────────────────────────────────────────────────────────────────

/** Every invariant of Design §1, as offenders over plain data. Empty means the map holds them all. */
function mapOffenders(parsed, registered, scanners) {
  const shape = checkFamilyMap(parsed);
  if (!shape.ok) return [`shape: ${shape.reason}`];
  const out = [];
  const inMap = shape.families.flatMap((f) => f.lenses);
  if (inMap.length === 0) out.push("non-vacuity: the map names no lens");
  if (registered.length === 0) out.push("non-vacuity: count-lenses.mjs registers no lens");
  const mapSet = new Set(inMap);
  const regSet = new Set(registered);
  const missing = registered.filter((l) => !mapSet.has(l));
  const extra = inMap.filter((l) => !regSet.has(l));
  if (missing.length) out.push(`closure: registered but in no family: ${missing.join(", ")}`);
  if (extra.length) out.push(`closure: in a family but not registered: ${extra.join(", ")}`);
  if (inMap.length !== mapSet.size) out.push("exactly-once: a lens appears twice");
  if (!mapSet.has(FENCE_LENS)) out.push(`fence: \`${FENCE_LENS}\` is in no family`);
  for (const s of SECURITY_SOLOS) {
    const f = shape.families.find((x) => x.lenses.includes(s));
    if (!f) out.push(`security: \`${s}\` is in no family`);
    else if (f.lenses.length !== 1 || f.family !== s) out.push(`security: \`${s}\` is not alone in a family named after itself`);
  }
  for (const f of shape.families) {
    if (f.lenses.includes(FENCE_LENS) && f.lenses.length !== 1) out.push(`fence: \`${FENCE_LENS}\` shares ${f.family}`);
    const unknown = f.lenses.filter((l) => !has(scanners, l));
    if (unknown.length) out.push(`basis: ${f.family} holds ${unknown.join(", ")}, absent from lens-scanner-map.json`);
    const bases = new Set(f.lenses.filter((l) => has(scanners, l)).map((l) => (scanners[l] === null ? "scanner-less" : "scanner-bound")));
    if (bases.size > 1) out.push(`basis: ${f.family} mixes a scanner-bound and a scanner-less lens`);
  }
  return out;
}

test("★ MAP: the committed map holds every invariant against count-lenses.mjs and lens-scanner-map.json", () => {
  const registered = registeredLenses();
  assert.ok(registered.length > 0, "L34: count-lenses.mjs registers no lens, so the closure below would be vacuous");
  assert.ok(COMMITTED_MAP.families.length > 0, "L34: the committed map has no family");
  assert.deepEqual(mapOffenders(COMMITTED_MAP, registered, SCANNERS), []);
});

test("★ MAP: family names are unique kebab-case, and the committed map passes the run-time shape check", () => {
  const r = checkFamilyMap(COMMITTED_MAP);
  assert.equal(r.ok, true, r.reason);
  const names = COMMITTED_MAP.families.map((f) => f.family);
  assert.equal(new Set(names).size, names.length);
  for (const n of names) assert.match(n, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test("★ MAP controls: each invariant turns red on its own mutant (L60)", () => {
  const registered = registeredLenses();
  const firstMulti = () => COMMITTED_MAP.families.findIndex((f) => f.lenses.length > 1);
  assert.notEqual(firstMulti(), -1, "the committed map has no multi-lens family to mutate");
  const scannerLess = Object.keys(SCANNERS).find((l) => SCANNERS[l] === null && l !== FENCE_LENS);
  assert.ok(scannerLess, "no scanner-less lens other than trust-fence to build the mixed-basis mutant from");
  const mutants = [
    ["a lens dropped", (m) => m.families[firstMulti()].lenses.pop(), /closure: registered but in no family/],
    ["a lens doubled", (m) => m.families[0].lenses.push(m.families[1].lenses[0]), /shape: lens .* is in family/],
    ["a 23rd lens", (m) => m.families[0].lenses.push("phantom-lens"), /closure: in a family but not registered: phantom-lens/],
    [
      "trust-fence given a sibling",
      (m) => {
        m.families = m.families.filter((f) => !f.lenses.includes("ssrf"));
        m.families.find((f) => f.lenses.includes(FENCE_LENS)).lenses.push("ssrf");
      },
      /shape: `trust-fence` shares family/,
    ],
    [
      "a mixed-basis family",
      (m) => {
        for (const f of m.families) f.lenses = f.lenses.filter((l) => l !== scannerLess);
        m.families = m.families.filter((f) => f.lenses.length > 0);
        m.families[firstMulti()].lenses.push(scannerLess);
      },
      /basis: .* mixes a scanner-bound and a scanner-less lens/,
    ],
    ["an empty family", (m) => m.families.push({ family: "empty", lenses: [] }), /shape: family "empty" has no lenses/],
    [
      "no trust-fence at all",
      (m) => (m.families = m.families.filter((f) => !f.lenses.includes(FENCE_LENS))),
      /fence: `trust-fence` is in no family/,
    ],
  ];
  for (const [label, mutate, expected] of mutants) {
    const m = clone(COMMITTED_MAP);
    mutate(m);
    const off = mapOffenders(m, registered, SCANNERS);
    assert.ok(
      off.some((o) => expected.test(o)),
      `${label}: expected an offender matching ${expected}, got ${JSON.stringify(off)}`
    );
  }
  // The non-vacuity half: an empty registered set is red even over the committed map.
  assert.ok(mapOffenders(COMMITTED_MAP, [], SCANNERS).some((o) => o.startsWith("non-vacuity")));
});

test("★ MAP: the six security lenses are each alone, in a family named after itself (GATE 1 round 2, question 1)", () => {
  const registered = new Set(registeredLenses());
  assert.equal(SECURITY_SOLOS.length, 6, "L34: the pinned list is the six GATE 1 approved");
  for (const s of SECURITY_SOLOS) assert.ok(registered.has(s), `${s} is not a registered lens: the pin went stale`);
  assert.deepEqual(
    mapOffenders(COMMITTED_MAP, [...registered], SCANNERS).filter((o) => o.startsWith("security")),
    []
  );
  // CONTROLS (L60): each way of breaking a solo turns red, every mutant still passing the run-time shape check.
  const without = (m, lens) => {
    const f = m.families.find((x) => x.lenses.includes(lens));
    f.lenses = f.lenses.filter((l) => l !== lens);
  };
  const mutants = [
    [
      "injection grouped into hygiene",
      (m) => {
        m.families = m.families.filter((f) => f.family !== "injection");
        m.families.find((f) => f.family === "hygiene").lenses.push("injection");
      },
      /security: `injection` is not alone/,
    ],
    [
      "a sibling joins a security family",
      (m) => {
        without(m, "magic-values");
        m.families.find((f) => f.family === "ssrf").lenses.push("magic-values");
      },
      /security: `ssrf` is not alone/,
    ],
    [
      "a security family renamed",
      (m) => (m.families.find((f) => f.family === "path-traversal").family = "paths"),
      /security: `path-traversal` is not alone/,
    ],
    [
      "a security lens in no family",
      (m) => (m.families = m.families.filter((f) => f.family !== "secrets-in-code")),
      /security: `secrets-in-code` is in no family/,
    ],
  ];
  for (const [label, mutate, expected] of mutants) {
    const m = clone(COMMITTED_MAP);
    mutate(m);
    assert.equal(checkFamilyMap(m).ok, true, `${label}: the mutant must pass the run-time shape check, so only this pin catches it`);
    const off = mapOffenders(m, [...registered], SCANNERS);
    assert.ok(
      off.some((o) => expected.test(o)),
      `${label}: expected an offender matching ${expected}, got ${JSON.stringify(off)}`
    );
  }
});

// ── the run-time shape check ───────────────────────────────────────────────────────────────────────────────────────

test("checkFamilyMap refuses each malformed shape, and never throws", () => {
  const cases = [
    [null, /no `families` array/],
    [[], /no `families` array/],
    [{ families: {} }, /no `families` array/],
    [{ families: [] }, /`families` is empty/],
    [{ families: ["x"] }, /a family is not an object/],
    [{ families: [{ family: "Not-Kebab", lenses: ["a"] }] }, /is not kebab-case/],
    [
      {
        families: [
          { family: "a", lenses: ["x"] },
          { family: "a", lenses: ["y"] },
        ],
      },
      /appears twice/,
    ],
    [{ families: [{ family: "a", lenses: [] }] }, /has no lenses/],
    [{ families: [{ family: "a" }] }, /has no lenses/],
    [{ families: [{ family: "a", lenses: ["x y"] }] }, /which is not kebab-case/],
    [
      {
        families: [
          { family: "a", lenses: ["x"] },
          { family: "b", lenses: ["x"] },
        ],
      },
      /is in family "a" and in family "b"/,
    ],
    [{ families: [{ family: "a", lenses: ["x", FENCE_LENS] }] }, /`trust-fence` shares family "a"/],
  ];
  for (const [input, expected] of cases) {
    const r = checkFamilyMap(input);
    assert.equal(r.ok, false, `accepted ${JSON.stringify(input)}`);
    assert.match(r.reason, expected);
  }
  // CONTROL: the same shapes made well-formed are accepted (the refusals are not refusing everything).
  assert.equal(
    checkFamilyMap({
      families: [
        { family: "a", lenses: ["x"] },
        { family: FENCE_LENS, lenses: [FENCE_LENS] },
      ],
    }).ok,
    true
  );
});

test('L62: a refusal quotes `{"toString":1}` from the map without throwing', () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "CONTROL: the value really does make String() throw");
  const r = checkFamilyMap(JSON.parse('{"families":[{"family":{"toString":1},"lenses":["a"]}]}'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /family name "\[object Object\]" is not kebab-case/);
  const r2 = checkFamilyMap(JSON.parse('{"families":[{"family":"a","lenses":[{"toString":1}]}]}'));
  assert.match(r2.reason, /holds lens "\[object Object\]"/);
});

test("readFamilyMap reads <repoDir>/pharn/floor/lens-family-map.json and reports an unreadable one, never throwing", () => {
  const ok = readFamilyMap(REPO);
  assert.equal(ok.ok, true, ok.reason);
  const dir = mkdtempSync(join(tmpdir(), "pharn-lens-groups-map-"));
  try {
    const r = readFamilyMap(dir);
    assert.equal(r.ok, false);
    assert.match(r.reason, /lens-family-map\.json could not be read as JSON \("ENOENT"\)/);
    mkdirSync(join(dir, "pharn/floor"), { recursive: true });
    writeFileSync(join(dir, "pharn/floor/lens-family-map.json"), "{not json");
    assert.match(readFamilyMap(dir).reason, /could not be read as JSON \("SyntaxError"\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── ★ DERIVATION ───────────────────────────────────────────────────────────────────────────────────────────────────

const FAMILIES = [
  { family: "pair", lenses: ["alpha", "beta"] },
  { family: "trio", lenses: ["gamma", "delta", "epsilon"] },
  { family: "solo", lenses: ["solo"] },
  { family: FENCE_LENS, lenses: [FENCE_LENS] },
];

/** A record over the given {lens: sliceLength}, in the given order, plus scanner_errors lenses. */
function rec(slices, errored = []) {
  return {
    assignments: Object.entries(slices).map(([lens, n]) => ({ lens, slice: Array.from({ length: n }, (_, i) => `f${i}.js`) })),
    scanner_errors: errored.map((lens) => ({ lens, file: "f0.js" })),
  };
}

const groupsOf = (r) => {
  assert.equal(r.ok, true, r.reason);
  return r.groups.map((g) => `${g.family}:${g.lenses.join("+")}`);
};

test("★ DERIVATION: an empty slice is idle, and a family with one active member spawns with that member only", () => {
  const r = computeLensGroups(rec({ alpha: 0, beta: 2, gamma: 1, delta: 0, epsilon: 0, [FENCE_LENS]: 3 }), FAMILIES);
  assert.deepEqual(groupsOf(r), ["pair:beta", "trio:gamma", `${FENCE_LENS}:${FENCE_LENS}`]);
  assert.deepEqual(r.idle, ["alpha", "delta", "epsilon"]);
});

test("★ DERIVATION: a scanner_errors-only lens is grouped (a failed scanner fails toward review)", () => {
  const r = computeLensGroups(rec({ alpha: 0, beta: 0, [FENCE_LENS]: 1 }, ["alpha"]), FAMILIES);
  assert.deepEqual(groupsOf(r), ["pair:alpha", `${FENCE_LENS}:${FENCE_LENS}`]);
  assert.deepEqual(r.idle, ["beta"]);
  // CONTROL: without the scanner_errors entry the same lens is idle.
  assert.deepEqual(computeLensGroups(rec({ alpha: 0, beta: 0, [FENCE_LENS]: 1 }), FAMILIES).idle, ["alpha", "beta"]);
});

test("★ DERIVATION: a recorded lens the map does not name runs alone, after the map's groups; a map member the record lacks is ignored", () => {
  const r = computeLensGroups(rec({ community: 1, alpha: 1, [FENCE_LENS]: 1 }), FAMILIES);
  assert.deepEqual(groupsOf(r), ["pair:alpha", `${FENCE_LENS}:${FENCE_LENS}`, "community:community"]);
  assert.deepEqual(r.idle, []);
  assert.ok(!JSON.stringify(r.groups).includes("beta"), "beta is a map member absent from the record");
});

test("★ DERIVATION: groups and members follow the MAP's order, never the record's", () => {
  // The record lists the lenses in reverse: a record-order implementation would print trust-fence first.
  const r = computeLensGroups(rec({ [FENCE_LENS]: 1, epsilon: 1, gamma: 1, beta: 1, alpha: 1 }), FAMILIES);
  assert.deepEqual(groupsOf(r), ["pair:alpha+beta", "trio:gamma+epsilon", `${FENCE_LENS}:${FENCE_LENS}`]);
});

test("★ DERIVATION: with no usable map (null), every active lens runs alone, in record order", () => {
  const r = computeLensGroups(rec({ beta: 1, alpha: 1, gamma: 0 }), null);
  assert.deepEqual(groupsOf(r), ["beta:beta", "alpha:alpha"]);
  assert.deepEqual(r.idle, ["gamma"]);
});

test("the record refusals: each unusable shape is refused with a reason, never thrown", () => {
  const cases = [
    [null, /not a JSON object/],
    [[], /not a JSON object/],
    [{ scanner_errors: [] }, /`assignments` is missing/],
    [{ assignments: [] }, /`scanner_errors` is missing/],
    [{ assignments: [7], scanner_errors: [] }, /not a \{lens, slice\} object/],
    [{ assignments: [{ lens: "a" }], scanner_errors: [] }, /not a \{lens, slice\} object/],
    [{ assignments: [{ lens: "a/b", slice: [] }], scanner_errors: [] }, /one path segment \(lens "a\/b"\)/],
    [{ assignments: [{ lens: "..", slice: [] }], scanner_errors: [] }, /one path segment/],
    [{ assignments: [{ lens: "", slice: [] }], scanner_errors: [] }, /one path segment/],
    [
      {
        assignments: [
          { lens: "a", slice: [] },
          { lens: "a", slice: [] },
        ],
        scanner_errors: [],
      },
      /two `assignments` entries/,
    ],
    [{ assignments: [{ lens: "a", slice: [] }], scanner_errors: [{ lens: "b", file: "x" }] }, /names lens "b", which has no/],
    [{ assignments: [{ lens: "a", slice: [] }], scanner_errors: ["x"] }, /not an object with a lens string/],
  ];
  for (const [record, expected] of cases) {
    const r = computeLensGroups(record, FAMILIES);
    assert.equal(r.ok, false, `accepted ${JSON.stringify(record)}`);
    assert.match(r.reason, expected);
  }
  // CONTROL: a well-formed record is accepted.
  assert.equal(computeLensGroups(rec({ alpha: 1 }), FAMILIES).ok, true);
});

test("L15: `toString`, `__proto__` and `constructor` are ordinary lens names, never prototype members", () => {
  const record = JSON.parse(
    '{"assignments":[{"lens":"toString","slice":["a.js"]},{"lens":"__proto__","slice":["a.js"]},{"lens":"constructor","slice":[]}],"scanner_errors":[{"lens":"constructor","file":"a.js"}]}'
  );
  const r = computeLensGroups(record, FAMILIES);
  assert.deepEqual(groupsOf(r), ["toString:toString", "__proto__:__proto__", "constructor:constructor"]);
  // A map member named `constructor` is matched by name, and a record that never lists it does not inherit one.
  const fam = [{ family: "proto", lenses: ["constructor", "alpha"] }];
  assert.deepEqual(groupsOf(computeLensGroups(rec({ alpha: 1 }), fam)), ["proto:alpha"]);
  assert.deepEqual(groupsOf(computeLensGroups(record, fam)), ["proto:constructor", "toString:toString", "__proto__:__proto__"]);
  // A scanner_errors entry naming a prototype member with no assignment is refused, not matched to Object.prototype.
  const stray = computeLensGroups(
    { assignments: [{ lens: "alpha", slice: [] }], scanner_errors: [{ lens: "toString", file: "a" }] },
    FAMILIES
  );
  assert.equal(stray.ok, false);
  assert.match(stray.reason, /names lens "toString", which has no `assignments` entry/);
});

test('L62: a record refusal quotes `{"toString":1}` without throwing', () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "CONTROL: the value really does make String() throw");
  const r = computeLensGroups(JSON.parse('{"assignments":[{"lens":{"toString":1},"slice":[]}],"scanner_errors":[]}'), FAMILIES);
  assert.equal(r.ok, false);
  assert.match(r.reason, /\(lens "\[object Object\]"\)/);
  const r2 = computeLensGroups(JSON.parse('{"assignments":[{"lens":"a","slice":[]}],"scanner_errors":[{"toString":1}]}'), FAMILIES);
  assert.match(r2.reason, /not an object with a lens string \("\[object Object\]"\)/);
});

// ★ UNWRITTEN — absent | stale | equal | fresh, on REAL files whose times are set with utimesSync. The record's time is
// T; each fixture is judged by the same call, and each has a control that moves only the property it asserts.
const T = new Date("2026-10-18T12:00:00.000Z");
const at = (seconds) => new Date(T.getTime() + seconds * 1000);
const mtimeNs = (p) => statSync(p, { bigint: true }).mtimeNs;

/** A scratch record dir: assignments.json at T, plus each {lens: offsetSeconds | "dir"} findings.json. */
function unwrittenFixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-lens-groups-unwritten-"));
  const record = join(dir, "assignments.json");
  writeFileSync(record, "{}\n");
  utimesSync(record, T, T);
  for (const [lens, offset] of Object.entries(files)) {
    const p = join(dir, "lenses", lens, "findings.json");
    if (offset === "dir") {
      mkdirSync(p, { recursive: true });
      continue;
    }
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "[]\n");
    utimesSync(p, at(offset), at(offset));
  }
  return { dir, record };
}

test("★ UNWRITTEN: absent, a directory, stale and equal-time files are unwritten with their reason; a later file is written", () => {
  const { dir, record } = unwrittenFixture({ stale: -60, equal: 0, fresh: 5, notfile: "dir" });
  try {
    assert.equal(mtimeNs(join(dir, "lenses", "equal", "findings.json")), mtimeNs(record), "the equal fixture really is equal");
    const groups = [
      { family: "a", lenses: ["absent", "stale"] },
      { family: "b", lenses: ["equal", "fresh", "notfile"] },
    ];
    assert.deepEqual(unwrittenLenses(record, groups, mtimeNs(record)), [
      { lens: "absent", reason: "absent" },
      { lens: "stale", reason: "stale" },
      { lens: "equal", reason: "stale" },
      { lens: "notfile", reason: "absent" },
    ]);
    for (const u of unwrittenLenses(record, groups, mtimeNs(record))) assert.ok(UNWRITTEN_REASONS.includes(u.reason), u.reason);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ UNWRITTEN controls: moving one file's time or presence flips only that lens (L60)", () => {
  const { dir, record } = unwrittenFixture({ stale: -60, equal: 0, fresh: 5 });
  try {
    const one = (lens) => unwrittenLenses(record, [{ family: "x", lenses: [lens] }], mtimeNs(record));
    // stale → fresh: re-time the earlier run's file to after the record.
    assert.deepEqual(one("stale"), [{ lens: "stale", reason: "stale" }]);
    const staleFile = join(dir, "lenses", "stale", "findings.json");
    utimesSync(staleFile, at(1), at(1));
    assert.deepEqual(one("stale"), []);
    // equal → fresh by one second; fresh → stale by moving it before the record.
    assert.deepEqual(one("equal"), [{ lens: "equal", reason: "stale" }]);
    utimesSync(join(dir, "lenses", "equal", "findings.json"), at(1), at(1));
    assert.deepEqual(one("equal"), []);
    assert.deepEqual(one("fresh"), []);
    utimesSync(join(dir, "lenses", "fresh", "findings.json"), at(-1), at(-1));
    assert.deepEqual(one("fresh"), [{ lens: "fresh", reason: "stale" }]);
    // absent → written: the file appears after the record.
    assert.deepEqual(one("absent"), [{ lens: "absent", reason: "absent" }]);
    mkdirSync(join(dir, "lenses", "absent"), { recursive: true });
    writeFileSync(join(dir, "lenses", "absent", "findings.json"), "[]\n");
    utimesSync(join(dir, "lenses", "absent", "findings.json"), at(2), at(2));
    assert.deepEqual(one("absent"), []);
    // The record's own time is the reference: re-time the RECORD past every file and all of them read stale.
    utimesSync(record, at(10), at(10));
    assert.deepEqual(
      unwrittenLenses(record, [{ family: "x", lenses: ["stale", "equal", "fresh", "absent"] }], mtimeNs(record)).map((u) => u.reason),
      ["stale", "stale", "stale", "stale"]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── ★ CLI — the pinned line, over a real emitter record ─────────────────────────────────────────────────────────────

/** /pharn-review Step 3's pinned helper line, read from the command (L45: execute what is pinned, never a retype). */
function pinnedHelperLine() {
  const text = readFileSync(join(REPO, ".claude", "commands", "pharn-review.md"), "utf8");
  const lines = text.split("\n").filter((l) => /^node pharn\/floor\/lens-groups\.mjs /.test(l));
  assert.equal(lines.length, 1, "pharn-review.md must hold exactly one pinned lens-groups.mjs line");
  return lines[0];
}

// The scanner-bound lenses of the scratch tree, all real; the map is the COMMITTED one, so its other 17 members are
// absent from the record and ignored — the install case (a superset map).
const FIXTURE_SCANNERS = {
  "magic-values": "scan-code-magic-values.mjs",
  "missing-error-handling": "scan-code-missing-error-handling.mjs",
  "secrets-in-code": "scan-code-secrets.mjs",
  "swallowed-exception": "scan-code-swallowed-exception.mjs",
  "trust-fence": null,
};

function scratchTree() {
  const dir = mkdtempSync(join(tmpdir(), "pharn-lens-groups-cli-"));
  mkdirSync(join(dir, "pharn/floor"), { recursive: true });
  const floor = [
    "count-lenses.mjs",
    "frontmatter-core.mjs", // count-lenses.mjs imports its BOM strip (6.65.2)
    "render-review-assignments.mjs",
    "runtime-floor.mjs",
    "code-scanner-cli.mjs",
    "lens-groups.mjs",
    "quote-core.mjs",
    "loop-record-core.mjs",
    "lens-family-map.json",
    ...Object.values(FIXTURE_SCANNERS).filter(Boolean),
  ];
  for (const f of floor) cpSync(join(HERE, f), join(dir, "pharn/floor", f));
  writeFileSync(join(dir, "pharn/floor/lens-scanner-map.json"), JSON.stringify({ scanners: FIXTURE_SCANNERS }, null, 2));
  for (const lens of Object.keys(FIXTURE_SCANNERS)) {
    mkdirSync(join(dir, "pharn/pharn-review", lens), { recursive: true });
    writeFileSync(join(dir, `pharn/pharn-review/${lens}/${lens}.md`), `---\nrole: lens\n---\n\n# ${lens}\n`);
  }
  writeFileSync(
    join(dir, "magic.js"),
    "export function wait(retries) {\n  if (retries > 37) return 86400000;\n  return retries * 3600;\n}\n"
  );
  writeFileSync(join(dir, "plain.js"), "export function add(a, b) {\n  return a + b;\n}\n");
  writeFileSync(
    join(dir, "swallow.js"),
    'import { readFileSync } from "node:fs";\nexport function cfg(p) {\n  const raw = readFileSync(p, "utf8");\n  return JSON.parse(raw);\n}\n' +
      "export function load(p) {\n  try {\n    return cfg(p);\n  } catch (e) {}\n}\n"
  );
  return dir;
}

const runIn = (dir, argv) => spawnSync(process.execPath, argv, { cwd: dir, encoding: "utf8" });

/** The pinned line's argv, `<name>` filled in; the line holds no quoting, so a space split is exact. */
const pinnedArgv = (name) => pinnedHelperLine().replace("<name>", name).split(" ").slice(1);

test("★ CLI: the pinned line over a real emitter record prints the map's groups, and `unwritten` tracks findings.json", () => {
  const dir = scratchTree();
  try {
    const emit = runIn(dir, [
      "pharn/floor/render-review-assignments.mjs",
      "t",
      "--target",
      "magic.js",
      "--target",
      "plain.js",
      "--target",
      "swallow.js",
    ]);
    assert.equal(emit.status, 0, emit.stderr);
    const argv = pinnedArgv("t");
    assert.deepEqual(argv, ["pharn/floor/lens-groups.mjs", "pharn/features/t/assignments.json"], "L41: no option beyond the record path");
    const r = runIn(dir, argv);
    assert.equal(r.status, 0, r.stderr);
    const doc = JSON.parse(r.stdout);
    assert.equal(doc.schema, SCHEMA);
    assert.deepEqual(doc.groups, [
      { family: "error-handling", lenses: ["missing-error-handling", "swallowed-exception"] },
      { family: "hygiene", lenses: ["magic-values"] },
      { family: "trust-fence", lenses: ["trust-fence"] },
    ]);
    assert.deepEqual(doc.idle, ["secrets-in-code"]);
    const absent = (lens) => ({ lens, reason: "absent" });
    assert.deepEqual(doc.unwritten, ["missing-error-handling", "swallowed-exception", "magic-values", "trust-fence"].map(absent));
    assert.equal(doc.map_error, null);
    // A group that stopped after its first lens, beside a file an EARLIER run left (the eval's run-2 shape): the re-run
    // names the stale one too, never only the missing ones.
    const recordTime = statSync(join(dir, "pharn/features/t/assignments.json")).mtime;
    const put = (lens, seconds) => {
      const p = join(dir, `pharn/features/t/lenses/${lens}/findings.json`);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, "[]\n");
      const when = new Date(recordTime.getTime() + seconds * 1000);
      utimesSync(p, when, when);
    };
    put("missing-error-handling", 5);
    put("swallowed-exception", -3600);
    assert.deepEqual(JSON.parse(runIn(dir, argv).stdout).unwritten, [
      { lens: "swallowed-exception", reason: "stale" },
      absent("magic-values"),
      absent("trust-fence"),
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ CLI: an unusable map exits 2 and prints the one-lens-per-group fallback with map_error", () => {
  const dir = scratchTree();
  try {
    assert.equal(runIn(dir, ["pharn/floor/render-review-assignments.mjs", "t", "--target", "swallow.js"]).status, 0);
    writeFileSync(
      join(dir, "pharn/floor/lens-family-map.json"),
      JSON.stringify({ families: [{ family: "x", lenses: ["trust-fence", "magic-values"] }] })
    );
    const r = runIn(dir, pinnedArgv("t"));
    assert.equal(r.status, 2, r.stderr);
    const doc = JSON.parse(r.stdout);
    assert.deepEqual(doc.groups, [
      { family: "missing-error-handling", lenses: ["missing-error-handling"] },
      { family: "swallowed-exception", lenses: ["swallowed-exception"] },
      { family: "trust-fence", lenses: ["trust-fence"] },
    ]);
    assert.match(doc.map_error, /`trust-fence` shares family "x"/);
    assert.match(r.stderr, /MAP UNUSABLE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A preload that makes `process.versions.node` read as 22.16.0 before any floor module evaluates (entry-point-guard's). */
const FAKE_OLD_NODE =
  "data:text/javascript," +
  encodeURIComponent(
    'Object.defineProperty(process, "versions", { value: { ...process.versions, node: "22.16.0" }, configurable: true });'
  );

test("★ CLI: exit 2 has a second cause — the runtime-floor refusal — and it prints NO lens-groups/v1 line (Step 3 stops)", () => {
  const dir = scratchTree();
  try {
    assert.equal(runIn(dir, ["pharn/floor/render-review-assignments.mjs", "t", "--target", "swallow.js"]).status, 0);
    const old = runIn(dir, ["--import", FAKE_OLD_NODE, ...pinnedArgv("t")]);
    assert.equal(old.status, 2, old.stderr);
    assert.equal(old.stdout, "", "the refusal prints nothing on stdout, so it can never be read as the map fallback");
    assert.match(old.stderr, /Node >= 24\.2\.0/);
    // CONTROL: the same record and map without the preload exit 0 with the document.
    const ok = runIn(dir, pinnedArgv("t"));
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).schema, SCHEMA);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ CLI: an unusable record exits 1 and prints nothing — judged before the map, and the usage is closed", () => {
  const dir = scratchTree();
  try {
    const missing = runIn(dir, pinnedArgv("absent"));
    assert.equal(missing.status, 1);
    assert.equal(missing.stdout, "");
    assert.match(missing.stderr, /RECORD UNUSABLE .*"ENOENT"/);
    mkdirSync(join(dir, "pharn/features/bad"), { recursive: true });
    writeFileSync(join(dir, "pharn/features/bad/assignments.json"), JSON.stringify({ assignments: "x", scanner_errors: [] }));
    writeFileSync(join(dir, "pharn/floor/lens-family-map.json"), "{not json"); // both broken: the record decides
    const bad = runIn(dir, pinnedArgv("bad"));
    assert.equal(bad.status, 1);
    assert.equal(bad.stdout, "");
    assert.match(bad.stderr, /RECORD UNUSABLE — `assignments` is missing or not an array/);
    for (const argv of [[], ["a.json", "b.json"], ["--record", "a.json"], [""]]) {
      const u = runIn(dir, ["pharn/floor/lens-groups.mjs", ...argv]);
      assert.equal(u.status, 1, `usage ${JSON.stringify(argv)}`);
      assert.equal(u.stdout, "");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
