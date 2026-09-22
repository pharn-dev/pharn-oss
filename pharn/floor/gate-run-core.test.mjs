// pharn/floor/gate-run-core.test.mjs — the grammar/coverage/stamp-validation core's suite.
//
// Every guard below gets a MUTATION that turns it RED (the input that would pass if the guard were
// dropped), every per-item rule proves it is NON-VACUOUS over a non-empty domain (lessons-learned L34),
// and every rule quantified over a set iterates EVERY member rather than the one in front of the author
// (L52). The ✧ tests are the cross-file pins: a closure assertion over the emitted reason_codes (L36) and
// the parity assertions over the constants that exist in more than one place (L29/L31/L35).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ALLOWLIST,
  STYLE_SET,
  RESERVED_IDS,
  REASON_CODES,
  LAPSE_CODES,
  RESERVED_REASON_CODES,
  logBasename,
  STRUCTURAL_PREFIX,
  SCHEMA,
  STAGES,
  SIDES,
  FEATURE_SLUG_RE,
  SHA_RE,
  isReasonCode,
  parseGatesSpec,
  discoverGates,
  parseExtras,
  actualForExpected,
  reconcileEntry,
  completenessArgv,
  orderEntries,
  resolveSet,
  coverageGap,
  validateStamp,
  stampToMap,
  completenessFromStamp,
  gateRunBlock,
} from "./gate-run-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const read = (rel) => readFileSync(join(REPO, rel), "utf8");

/** Every reason_code LITERAL written at a `fail("…"` / `err("…"` / `reason_code: "…"` site across the modules
 *  that emit the vocabulary. One scan, used by BOTH closure directions. */
const EMITTING_MODULES = [
  "pharn/floor/gate-run-core.mjs",
  "pharn/floor/run-gates.mjs",
  "pharn/floor/check-verify.mjs",
  "pharn/floor/check-regress.mjs",
  "pharn/floor/check-loop-fresh.mjs",
];
function emittedReasonCodes() {
  const found = new Set();
  for (const rel of EMITTING_MODULES) {
    for (const m of read(rel).matchAll(/(?:\b(?:fail|err)\(\s*|reason_code:\s*)"([a-z][a-z0-9-]*)"/g)) found.add(m[1]);
  }
  return found;
}

/** A minimal VALID stamp. Every malformed-case test below mutates exactly one field of this, so each
 *  assertion is attributable to the field it names rather than to a second defect in the fixture. */
function goodStamp(over = {}) {
  const A = "a".repeat(64);
  const B = "b".repeat(64);
  return {
    schema: SCHEMA,
    stage: "verify",
    side: null,
    feature: "demo",
    head: "0".repeat(40),
    source: "discover",
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: "worktree-fingerprint/1+sha256", init: A, final: B },
    required: ["test"],
    runs: [
      {
        seq: 0,
        id: "test",
        exit: 0,
        ran: true,
        timed_out: false,
        mutated: false,
        reason: null,
        fp_before: A,
        fp_after: A,
        stdout_sha256: A,
        stderr_sha256: A,
      },
      {
        seq: 1,
        id: "reconcile",
        exit: 0,
        ran: true,
        timed_out: false,
        mutated: false,
        reason: null,
        fp_before: A,
        fp_after: B,
        stdout_sha256: A,
        stderr_sha256: A,
      },
    ],
    aux: { completeness: 0 },
    ...over,
  };
}

// ---------------------------------------------------------------------------------------------------
// The closed sets, and the ✧ cross-file pins.
// ---------------------------------------------------------------------------------------------------

test("✧ L34 — every enumeration under test is NON-EMPTY (the per-member rules below cannot pass vacuously)", () => {
  for (const [label, set] of [
    ["ALLOWLIST", ALLOWLIST],
    ["STYLE_SET", STYLE_SET],
    ["RESERVED_IDS", RESERVED_IDS],
    ["REASON_CODES", REASON_CODES],
    ["STAGES", STAGES],
    ["SIDES", SIDES],
  ]) {
    assert.ok(set.length > 0, `${label} is empty — every rule quantified over it would be true for free`);
  }
});

test("REASON_CODES is sorted, unique, and isReasonCode agrees with it over EVERY member (L52)", () => {
  assert.deepEqual([...REASON_CODES].sort(), [...REASON_CODES], "REASON_CODES must be sorted so a diff is readable");
  assert.equal(new Set(REASON_CODES).size, REASON_CODES.length, "REASON_CODES has a duplicate");
  for (const c of REASON_CODES) assert.ok(isReasonCode(c), `isReasonCode rejected the member ${c}`);
  // The mutation control: a non-member must be refused, or the predicate is vacuous.
  for (const bad of ["", "nope", "STAMP-MISSING", "stamp_missing"]) {
    assert.equal(isReasonCode(bad), false, `isReasonCode accepted the non-member ${JSON.stringify(bad)}`);
  }
});

test("✧ L36 CLOSURE — every reason_code LITERAL the shipped modules emit is a member of REASON_CODES", () => {
  // A per-member PRESENCE set would certify only the spellings its author looked at. This collects every
  // literal actually written at a `reason_code:`-shaped site across the whole surface and requires
  // membership, so a VARIANT of ANY member fails rather than only the one that happened to drift.
  const found = emittedReasonCodes();
  assert.ok(found.size > 0, "the closure scan found no reason_code literals — the scan broke, not the code");
  const strays = [...found].filter((c) => !isReasonCode(c)).sort();
  assert.deepEqual(strays, [], `these emitted reason_code literals are not members of REASON_CODES: ${strays.join(", ")}`);
});

test("✧ L36 REVERSE CLOSURE — every REASON_CODES member has an EMITTER or a RESERVED entry with a reason", () => {
  // The direction the test above cannot see: a member with no emitter passes "emitted ⊆ members" for free.
  // That is exactly how `output-hash-mismatch` sat in the vocabulary with no emitter for a release line.
  const found = emittedReasonCodes();
  const reserved = Object.keys(RESERVED_REASON_CODES);
  for (const c of reserved) {
    assert.ok(isReasonCode(c), `reserved ${c} is not a member`);
    assert.equal(typeof RESERVED_REASON_CODES[c], "string", `reserved ${c} carries no reason`);
    assert.ok(!found.has(c), `${c} is both reserved and emitted — drop the reservation`);
  }
  const orphans = REASON_CODES.filter((c) => !found.has(c) && !reserved.includes(c));
  assert.deepEqual(orphans, [], `these members have no emitter and no reserved-with-reason entry: ${orphans.join(", ")}`);
  assert.deepEqual(reserved, [], "RESERVED_REASON_CODES is empty today; a reservation must be deliberate and this test updated");
});

test("✧ L36 REVERSE CLOSURE discriminates — an unemitted, unreserved member is caught", () => {
  const found = emittedReasonCodes();
  const orphan = [...REASON_CODES, "zz-never-emitted"].filter((c) => !found.has(c) && !Object.hasOwn(RESERVED_REASON_CODES, c));
  assert.deepEqual(orphan, ["zz-never-emitted"]);
});

test("LAPSE_CODES is a sorted subset of REASON_CODES, and the stop-class codes are NOT in it (L52: every member)", () => {
  assert.deepEqual([...LAPSE_CODES].sort(), [...LAPSE_CODES]);
  for (const c of LAPSE_CODES) assert.ok(isReasonCode(c), `lapse ${c} is not a member`);
  // The routing boundary is the point: these must NOT be lapses (a re-run would paper over them).
  for (const c of [
    "usage-error",
    "stamp-malformed",
    "coverage-violation",
    "reconcile-not-last",
    "base-head-mismatch",
    "empty-source-set",
    "output-hash-mismatch",
    "report-verdict-mismatch",
  ]) {
    assert.ok(!LAPSE_CODES.includes(c), `${c} must not be a lapse`);
  }
  // The three the contract named are all present.
  for (const c of ["stamp-missing", "stamp-unfinalized", "tree-changed-between-gates"]) assert.ok(LAPSE_CODES.includes(c));
});

test("logBasename is the runner's log naming rule, and run-gates.mjs keeps no second copy of it (L35)", () => {
  assert.equal(logBasename(0, "test"), "0-test");
  assert.equal(logBasename(3, "format:check"), "3-format_check");
  assert.equal(logBasename(5, "structural:a/b c.json"), "5-structural_a_b_c.json");
  assert.ok(
    !read("pharn/floor/run-gates.mjs").includes("[^A-Za-z0-9._-]"),
    "run-gates.mjs re-implements the log naming instead of importing it"
  );
});

test("✧ L36 CLOSURE discriminates — an injected variant spelling FAILS the scan", () => {
  // The mutation control for the test above: prove the scan can see a stray, so a green run means the
  // surface is clean rather than that the matcher matches nothing.
  const injected = 'fail("stamp-missng", "typo")';
  const hits = [...injected.matchAll(/(?:\b(?:fail|err)\(\s*|reason_code:\s*)"([a-z][a-z0-9-]*)"/g)].map((m) => m[1]);
  assert.deepEqual(hits, ["stamp-missng"]);
  assert.equal(isReasonCode("stamp-missng"), false);
});

test("✧ L31/L35 PARITY — the ALLOWLIST prose in BOTH commands matches the constant, member for member", () => {
  // The commands keep a prose enumeration because a user reads the command, not the .mjs. A copy that
  // must stay gets a closure parity test rather than a note to keep it in sync.
  for (const rel of [".claude/commands/pharn-verify.md", ".claude/commands/pharn-regress.md"]) {
    const text = read(rel);
    const m = text.match(/\*\*`\{([^}]*)\}`\*\*/);
    assert.ok(m, `${rel} no longer carries the brace-delimited allowlist enumeration this test pins`);
    const listed = m[1]
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    assert.deepEqual(listed, [...ALLOWLIST], `${rel}'s prose allowlist diverged from gate-run-core ALLOWLIST`);
  }
});

test("✧ L52 PARITY — the feature-slug grammar agrees across all THREE copies", () => {
  // Named rather than implied: mark-phase.mjs and render-run-report.mjs each keep a private copy and
  // neither exports it, so this module adds a third. The follow-up is to fold them into one export; until
  // then this pins that they cannot drift apart. It iterates EVERY copy, not one.
  const copies = [
    ["pharn/floor/mark-phase.mjs", /const NAME_RE = (\/\^.*\$\/);/],
    ["pharn/floor/render-run-report.mjs", /const SLUG_RE = (\/\^.*\$\/);/],
    ["pharn/floor/gate-run-core.mjs", /export const FEATURE_SLUG_RE = (\/\^.*\$\/);/],
  ];
  const seen = [];
  for (const [rel, re] of copies) {
    const m = read(rel).match(re);
    assert.ok(m, `${rel} no longer carries the slug literal this parity test reads`);
    seen.push([rel, m[1]]);
  }
  assert.equal(seen.length, 3, "the parity test must range over all three copies");
  const [, first] = seen[0];
  for (const [rel, lit] of seen) assert.equal(lit, first, `${rel}'s slug grammar diverged from ${seen[0][0]}'s`);
  assert.equal(first, String(FEATURE_SLUG_RE), "the exported constant disagrees with its own source literal");
});

test("STYLE_SET ⊂ ALLOWLIST, and RESERVED_IDS is disjoint from ALLOWLIST (every member checked)", () => {
  for (const s of STYLE_SET) assert.ok(ALLOWLIST.includes(s), `STYLE_SET member ${s} is not in ALLOWLIST`);
  for (const r of RESERVED_IDS) assert.ok(!ALLOWLIST.includes(r), `RESERVED_IDS member ${r} collides with ALLOWLIST`);
});

// ---------------------------------------------------------------------------------------------------
// parseGatesSpec
// ---------------------------------------------------------------------------------------------------

test("parseGatesSpec accepts `cmd::id` and bare `cmd`, defaulting the id to the command", () => {
  const r = parseGatesSpec("npm run foo::foo, make check");
  assert.ok(r.ok);
  assert.deepEqual(
    r.entries.map((e) => [e.id, e.shell]),
    [
      ["foo", "npm run foo"],
      ["make check", "make check"],
    ]
  );
});

test("parseGatesSpec REFUSES each malformed shape, one case per rule (L52)", () => {
  const cases = [
    ["", "empty string"],
    ["a,,b", "an empty token"],
    ["cmd::", "an empty id after ::"],
    ["::id", "an empty command"],
    ["a::reconcile", "a reserved id"],
    ["a::completeness", "the other reserved id"],
    [`a::${STRUCTURAL_PREFIX}x`, "the structural prefix"],
    ["a::x,b::x", "a duplicate id"],
    ["a::with\u0000nul", "a control character"],
  ];
  for (const [input, why] of cases) {
    const r = parseGatesSpec(input);
    assert.equal(r.ok, false, `parseGatesSpec accepted ${JSON.stringify(input)} (${why})`);
    assert.equal(r.reason_code, "bad-gates", `wrong reason_code for ${why}`);
  }
  // Non-vacuity control: the SAME shapes minus the defect are accepted, so the refusals above are
  // attributable to the rule and not to a blanket rejection.
  assert.equal(parseGatesSpec("a::x,b::y").ok, true);
});

// ---------------------------------------------------------------------------------------------------
// discoverGates
// ---------------------------------------------------------------------------------------------------

test("discoverGates returns ALLOWLIST ∩ scripts IN ALLOWLIST ORDER, never manifest order", () => {
  const scripts = { build: "x", test: "x", "lint:md": "x", unrelated: "x" };
  assert.deepEqual(
    discoverGates(scripts).map((e) => e.id),
    ["test", "lint:md", "build"]
  );
});

test("discoverGates runs each discovered script as `npm run <id>` (every member checked)", () => {
  const all = Object.fromEntries(ALLOWLIST.map((id) => [id, "x"]));
  const got = discoverGates(all);
  assert.equal(got.length, ALLOWLIST.length, "not every allowlist member was discovered");
  for (const e of got) assert.deepEqual(e.argv, ["npm", "run", e.id], `${e.id} got the wrong argv`);
});

test("discoverGates uses an OWN-property test — an inherited prototype member is NOT a script (L15)", () => {
  const proto = { test: "inherited" };
  const scripts = Object.create(proto);
  scripts.lint = "own";
  assert.deepEqual(
    discoverGates(scripts).map((e) => e.id),
    ["lint"],
    "an inherited member leaked into the discovered set"
  );
});

test("discoverGates is empty on a missing/!object manifest — never a partial guess", () => {
  for (const bad of [null, undefined, [], "scripts", 7]) assert.deepEqual(discoverGates(bad), []);
});

// ---------------------------------------------------------------------------------------------------
// parseExtras + the DERIVED <actual> (GRILL R5)
// ---------------------------------------------------------------------------------------------------

test("actualForExpected derives the COLOCATED findings.json, and refuses a non-eval path", () => {
  assert.equal(actualForExpected("pharn/pharn-review/x/evals/expected/a.json"), "pharn/pharn-review/x/findings.json");
  // A capability directory containing the word "evals" is safe: the LAST marker wins.
  assert.equal(actualForExpected("a/evals/b/evals/expected/c.json"), "a/evals/b/findings.json");
  for (const bad of ["a.json", "expected/a.json", "/evals/expected/a.json"]) {
    assert.equal(actualForExpected(bad), null, `derived an <actual> for ${bad}`);
  }
});

test("parseExtras builds the fixed check-structural argv with the DERIVED actual", () => {
  const r = parseExtras(JSON.stringify(["pharn/pharn-review/x/evals/expected/a.json"]));
  assert.ok(r.ok);
  assert.equal(r.entries[0].id, `${STRUCTURAL_PREFIX}pharn/pharn-review/x/evals/expected/a.json`);
  assert.deepEqual(r.entries[0].argv, [
    "node",
    "pharn/floor/check-structural.mjs",
    "pharn/pharn-review/x/evals/expected/a.json",
    "pharn/pharn-review/x/findings.json",
    ".",
  ]);
});

test("parseExtras REFUSES each malformed shape, one case per rule (L52)", () => {
  const cases = [
    ["{}", "not an array"],
    ["[1]", "a non-string entry"],
    ['["a/*.json"]', "a glob"],
    ['["nope.json"]', "a path whose actual cannot be derived"],
    ['["a/evals/expected/x.json","a/evals/expected/x.json"]', "a duplicate"],
    ["not json", "unparseable JSON"],
  ];
  for (const [input, why] of cases) {
    const r = parseExtras(input);
    assert.equal(r.ok, false, `parseExtras accepted ${input} (${why})`);
    assert.equal(r.reason_code, "bad-extra");
  }
  assert.deepEqual(parseExtras(undefined), { ok: true, entries: [] }, "absent --extra must be an empty set, not an error");
});

// ---------------------------------------------------------------------------------------------------
// resolveSet — coverage, ordering, and the L34 empty-SOURCE refusal
// ---------------------------------------------------------------------------------------------------

test("L34 — an EMPTY SOURCE set exits with `empty-source-set` EVEN THOUGH the injected entries exist", () => {
  // This is the load-bearing non-vacuity case. The injected `reconcile` entry always exists, so a
  // membership test written against the FINAL set would be true for free and this refusal unreachable.
  const r = resolveSet({ stage: "verify", feature: "demo", scripts: { unrelated: "x" } });
  assert.equal(r.ok, false);
  assert.equal(r.reason_code, "empty-source-set");
  // The control: ONE allowlisted script is enough to make it resolvable, so the refusal is about the
  // source set being empty and not about resolveSet refusing everything.
  const ok = resolveSet({ stage: "verify", feature: "demo", scripts: { test: "x" } });
  assert.equal(ok.ok, true);
  assert.ok(
    ok.spec.entries.some((e) => e.id === "reconcile"),
    "verify must inject reconcile"
  );
});

test("verify ORDER: source ids, then structural sorted, then reconcile LAST", () => {
  const r = resolveSet({
    stage: "verify",
    feature: "demo",
    scripts: { test: "x", lint: "x" },
    extras: JSON.stringify(["z/evals/expected/b.json", "z/evals/expected/a.json"]),
  });
  assert.ok(r.ok);
  assert.deepEqual(
    r.spec.entries.map((e) => e.id),
    ["test", "lint", `${STRUCTURAL_PREFIX}z/evals/expected/a.json`, `${STRUCTURAL_PREFIX}z/evals/expected/b.json`, "reconcile"]
  );
  assert.deepEqual(
    r.spec.entries.map((e) => e.seq),
    [0, 1, 2, 3, 4]
  );
});

test("regress does NOT inject reconcile, and requires a --side", () => {
  const r = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts: { test: "x" } });
  assert.ok(r.ok);
  assert.ok(!r.spec.entries.some((e) => e.id === "reconcile"));
  assert.equal(resolveSet({ stage: "regress", feature: "demo", scripts: { test: "x" } }).reason_code, "usage-error");
  assert.equal(resolveSet({ stage: "verify", side: "head", feature: "demo", scripts: { test: "x" } }).reason_code, "usage-error");
});

test("--skip-style removes EVERY STYLE_SET member and records style_skipped (L52: every member)", () => {
  const scripts = Object.fromEntries(ALLOWLIST.map((id) => [id, "x"]));
  const r = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts, skipStyle: true });
  assert.ok(r.ok);
  assert.equal(r.spec.style_skipped, true);
  for (const s of STYLE_SET) assert.ok(!r.spec.required.includes(s), `${s} survived --skip-style`);
  for (const a of ALLOWLIST.filter((x) => !STYLE_SET.includes(x))) {
    assert.ok(r.spec.required.includes(a), `--skip-style wrongly dropped the non-style gate ${a}`);
  }
  // `style_skipped` is FALSE when the flag removed nothing — it records what happened, not what was asked.
  const none = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts: { build: "x" }, skipStyle: true });
  assert.equal(none.spec.style_skipped, false);
  // And it refuses rather than silently running nothing when the flag empties the set.
  const empty = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts: { lint: "x" }, skipStyle: true });
  assert.equal(empty.reason_code, "empty-source-set");
});

test("resolveSet refuses a non-slug --feature (fail-closed, never sanitized)", () => {
  for (const bad of ["..", ".", "a/b", "A", "", "-x", "x".repeat(65)]) {
    const r = resolveSet({ stage: "verify", feature: bad, scripts: { test: "x" } });
    assert.equal(r.ok, false, `accepted --feature ${JSON.stringify(bad)}`);
    assert.equal(r.reason_code, "usage-error");
  }
});

test("explicit --gates records source/source_raw; discovery records `discover`", () => {
  const e = resolveSet({ stage: "verify", feature: "demo", gates: "make t::t" });
  assert.equal(e.spec.source, "explicit");
  assert.equal(e.spec.source_raw, "make t::t");
  const d = resolveSet({ stage: "verify", feature: "demo", scripts: { test: "x" } });
  assert.equal(d.spec.source, "discover");
  assert.equal(d.spec.source_raw, null);
});

test("orderEntries / reconcileEntry / completenessArgv are the fixed argv the contract names", () => {
  assert.deepEqual(reconcileEntry().argv, ["node", "pharn/floor/check-bash-reconcile.mjs", "--base", ".", "--require-baseline"]);
  assert.deepEqual(completenessArgv("demo", "pharn/features"), [
    "node",
    "pharn/floor/check-build-complete.mjs",
    "pharn/features/demo/PLAN.md",
    ".",
  ]);
  const ordered = orderEntries([{ id: "a" }], [{ id: "s:b" }], true);
  assert.deepEqual(
    ordered.map((e) => e.id),
    ["a", "s:b", "reconcile"]
  );
});

// ---------------------------------------------------------------------------------------------------
// validateStamp — one case per refusal, each a single-field mutation of the same good fixture
// ---------------------------------------------------------------------------------------------------

test("validateStamp accepts the good fixture (the non-vacuity control for every mutation below)", () => {
  assert.deepEqual(validateStamp(goodStamp(), { stage: "verify", feature: "demo", side: null }), { ok: true });
});

test("validateStamp REFUSES each malformed shape with its OWN reason_code (L52: one per rule)", () => {
  const A = "a".repeat(64);
  const cases = [
    [goodStamp({ schema: "nope" }), "stamp-malformed", "wrong schema"],
    [goodStamp({ stage: "ship" }), "stamp-malformed", "stage outside the enum"],
    [goodStamp({ side: "head" }), "stamp-malformed", "verify with a side"],
    [goodStamp({ feature: ".." }), "stamp-malformed", "traversing feature"],
    [goodStamp({ source: "guessed" }), "stamp-malformed", "source outside the enum"],
    [goodStamp({ head: "zz" }), "stamp-malformed", "non-SHA head"],
    [goodStamp({ finalized: false }), "stamp-unfinalized", "not finalized"],
    [goodStamp({ runs: [] }), "stamp-malformed", "empty runs"],
    [goodStamp({ fingerprint: { algo: "x", init: "short", final: A } }), "stamp-malformed", "bad digest"],
    [null, "stamp-malformed", "not an object"],
  ];
  for (const [stamp, code, why] of cases) {
    const r = validateStamp(stamp);
    assert.equal(r.ok, false, `validateStamp accepted: ${why}`);
    assert.equal(r.reason_code, code, `wrong reason_code for ${why}`);
  }
});

test("validateStamp catches a TREE CHANGE between consecutive gates", () => {
  const A = "a".repeat(64);
  const C = "c".repeat(64);
  const s = goodStamp();
  s.runs[1].fp_before = C; // != runs[0].fp_after
  const r = validateStamp(s);
  assert.equal(r.reason_code, "tree-changed-between-gates");
  // Control: restoring the chain makes it valid, so the refusal is about the chain and nothing else.
  s.runs[1].fp_before = A;
  assert.equal(validateStamp(s).ok, true);
});

test("validateStamp requires `reconcile` to be LAST when it is present", () => {
  const s = goodStamp();
  s.runs = [s.runs[1], { ...s.runs[0], seq: 1 }];
  s.runs[0].seq = 0;
  s.runs[0].fp_after = s.runs[1].fp_before;
  const r = validateStamp(s);
  assert.equal(r.reason_code, "reconcile-not-last");
});

test("validateStamp enforces COVERAGE — a required id absent from runs is a violation", () => {
  const s = goodStamp({ required: ["test", "lint"] });
  const r = validateStamp(s);
  assert.equal(r.reason_code, "coverage-violation");
  assert.match(r.reason, /lint/);
});

test("validateStamp refuses a duplicate id and a wrong seq", () => {
  const s1 = goodStamp();
  s1.runs[1].id = "test";
  assert.equal(validateStamp(s1).reason_code, "stamp-malformed");
  const s2 = goodStamp();
  s2.runs[1].seq = 7;
  assert.equal(validateStamp(s2).reason_code, "stamp-malformed");
});

test("validateStamp refuses an entry that never ran unless it carries the `no-files` reason", () => {
  const s = goodStamp();
  s.runs[0].ran = false;
  assert.equal(validateStamp(s).reason_code, "entry-not-run");
  s.runs[0].reason = "no-files";
  assert.equal(validateStamp(s).ok, true, "a legitimate no-files entry must remain valid");
});

test("validateStamp reports the CALLER's expectation mismatches with their own codes", () => {
  const s = goodStamp();
  assert.equal(validateStamp(s, { stage: "regress" }).reason_code, "stage-mismatch");
  assert.equal(validateStamp(s, { feature: "other" }).reason_code, "feature-mismatch");
  const r = goodStamp({ stage: "regress", side: "head" });
  assert.equal(validateStamp(r, { side: "base" }).reason_code, "side-mismatch");
});

// ---------------------------------------------------------------------------------------------------
// The derived views
// ---------------------------------------------------------------------------------------------------

test("stampToMap / completenessFromStamp / coverageGap / gateRunBlock", () => {
  const s = goodStamp();
  assert.deepEqual(stampToMap(s), { test: 0, reconcile: 0 });
  assert.equal(completenessFromStamp(s), 0);
  assert.equal(completenessFromStamp(goodStamp({ aux: {} })), null, "a missing aux.completeness must be null, never 0");
  assert.deepEqual(coverageGap(s), []);
  assert.deepEqual(coverageGap(goodStamp({ required: ["nope"] })), ["nope"]);
  assert.deepEqual(gateRunBlock(s, "deadbeef"), {
    stamp_sha256: "deadbeef",
    source: "discover",
    fingerprint: { algo: "worktree-fingerprint/1+sha256", final: "b".repeat(64) },
  });
});

test("SHA_RE and FEATURE_SLUG_RE are anchored (a crafted value cannot pass by prefix)", () => {
  assert.ok(SHA_RE.test("0".repeat(40)));
  assert.equal(SHA_RE.test("0".repeat(41)), false);
  assert.equal(SHA_RE.test(`x${"0".repeat(40)}`), false);
  assert.ok(FEATURE_SLUG_RE.test("gate-run-stamp"));
  assert.equal(FEATURE_SLUG_RE.test("gate/run"), false);
});
