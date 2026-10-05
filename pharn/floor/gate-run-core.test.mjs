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
  E2E_SET,
  STYLE_SET,
  RESERVED_IDS,
  REASON_CODES,
  LAPSE_CODES,
  RESERVED_REASON_CODES,
  logBasename,
  RESULTS_ENV,
  resultsFileName,
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
  baseSpecFrom,
  LEVEL_GATES,
  acFilesFor,
  coverageGap,
  validateStamp,
  stampToMap,
  completenessFromStamp,
  gateRunBlock,
  REUSED_REASON,
  REUSE_SOURCE,
  REUSE_TARGET_STAGE,
  REUSED_BLOCK_KEYS,
  NON_REUSABLE_IDS,
  MAX_REUSABLE_EXIT,
  EXCLUSION_DECLARED_IN,
  EXCLUDED_KEYS,
  exclusionError,
  levelExcludedGates,
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
  "pharn/floor/loop-fresh-core.mjs",
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
    fingerprint: { algo: "worktree-fingerprint/2+sha256", init: A, final: B },
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
    ["E2E_SET", E2E_SET],
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
test("✧ L31/L35 PARITY — /pharn-regress's 'minus the e2e ids' clause names exactly E2E_SET, in both places", () => {
  const text = read(".claude/commands/pharn-regress.md");
  const want = `minus the e2e ids ${E2E_SET.map((e) => `\`${e}\``).join(" and ")}`;
  assert.ok(text.includes(want), `pharn-regress.md no longer says "${want}"`);
  assert.equal(text.split("(minus the e2e ids)").length - 1, 1, "the determinism audit's shorthand clause is gone");
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

test("6.20.0 — the AC gate's failing ids are RESERVED: --gates refuses `ac-delivery` and `ac-evidence` as gate ids", () => {
  for (const id of ["ac-delivery", "ac-evidence", "reconcile", "completeness"]) {
    assert.ok(RESERVED_IDS.includes(id), id);
    const r = parseGatesSpec(`npm test::${id}`);
    assert.equal(r.ok, false, id);
    assert.equal(r.reason_code, "bad-gates");
    assert.match(r.reason, /RESERVED/);
  }
  assert.ok(REASON_CODES.includes("ac-evidence-invalid"), "check-loop-fresh check I's own code is a member");
});

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
  // E2E_SET members are excluded from EVERY discovered regress source (6.16.0), --skip-style or not, so the
  // non-style set this flag must keep is ALLOWLIST minus STYLE_SET minus E2E_SET.
  for (const a of ALLOWLIST.filter((x) => !STYLE_SET.includes(x) && !E2E_SET.includes(x))) {
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

test("results_sha256 is OPTIONAL and additive: absent, null and a digest all validate; anything else is stamp-malformed", () => {
  const withSha = (v) => {
    const s = goodStamp();
    s.runs[0] = { ...s.runs[0], results_sha256: v };
    return s;
  };
  // A stamp written before the field existed — the good fixture carries no results_sha256 at all.
  assert.ok(!Object.hasOwn(goodStamp().runs[0], "results_sha256"), "the control must be a pre-6.15 stamp");
  assert.deepEqual(validateStamp(goodStamp()), { ok: true });
  assert.deepEqual(validateStamp(withSha(null)), { ok: true });
  assert.deepEqual(validateStamp(withSha("c".repeat(64))), { ok: true });
  for (const bad of ["zz", "C".repeat(64), "c".repeat(63), 7, false, {}, `${"c".repeat(63)}\n`]) {
    const r = validateStamp(withSha(bad));
    assert.equal(r.ok, false, `accepted results_sha256 ${JSON.stringify(bad)}`);
    assert.equal(r.reason_code, "stamp-malformed");
  }
});

test("resultsFileName is the ONE copy of the results-file naming rule (L35), and RESULTS_ENV is its handover", () => {
  assert.equal(RESULTS_ENV, "PHARN_TEST_RESULTS");
  assert.equal(resultsFileName(0, "test"), "0-test.test-results.json");
  assert.equal(resultsFileName(3, "format:check"), "3-format_check.test-results.json", "sanitized exactly like the logs");
  assert.notEqual(resultsFileName(0, "test"), "results.json", "never the name that reads as a second store of the gate map");
  for (const rel of ["pharn/floor/run-gates.mjs", "pharn/floor/test-results-core.mjs"]) {
    const src = read(rel);
    assert.ok(!src.includes(".test-results.json"), `${rel} re-spells the results file name instead of importing resultsFileName`);
    assert.ok(src.includes("resultsFileName"), `${rel} does not use resultsFileName`);
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
    fingerprint: { algo: "worktree-fingerprint/2+sha256", final: "b".repeat(64) },
  });
});

test("SHA_RE and FEATURE_SLUG_RE are anchored (a crafted value cannot pass by prefix)", () => {
  assert.ok(SHA_RE.test("0".repeat(40)));
  assert.equal(SHA_RE.test("0".repeat(41)), false);
  assert.equal(SHA_RE.test(`x${"0".repeat(40)}`), false);
  assert.ok(FEATURE_SLUG_RE.test("gate-run-stamp"));
  assert.equal(FEATURE_SLUG_RE.test("gate/run"), false);
});

// ---------------------------------------------------------------------------------------------------
// The e2e gate (6.16.0): discovered only when the script exists, after `build`, at verify only.
// ---------------------------------------------------------------------------------------------------

/** The allowlist exactly as it stood before 6.16.0 — the byte-identical-when-absent control. */
const PRE_E2E_ALLOWLIST = ["test", "lint", "format:check", "lint:md", "typecheck", "type-check", "build"];

test("E2E_SET ⊂ ALLOWLIST, LAST in it, and disjoint from STYLE_SET and RESERVED_IDS (every member)", () => {
  for (const e of E2E_SET) {
    assert.ok(ALLOWLIST.includes(e), `${e} is not in ALLOWLIST`);
    assert.ok(!STYLE_SET.includes(e), `${e} is a style gate`);
    assert.ok(!RESERVED_IDS.includes(e), `${e} is reserved`);
  }
  assert.deepEqual(ALLOWLIST.slice(-E2E_SET.length), [...E2E_SET], "the e2e ids must be the LAST allowlist members");
  assert.deepEqual(ALLOWLIST.slice(0, ALLOWLIST.length - E2E_SET.length), PRE_E2E_ALLOWLIST, "the pre-6.16 members moved");
});

test("ABSENT → the resolved gate set is unchanged: every pre-6.16 member resolves to exactly the pre-6.16 set, both stages", () => {
  const scripts = Object.fromEntries(PRE_E2E_ALLOWLIST.map((id) => [id, "x"]));
  const v = resolveSet({ stage: "verify", feature: "demo", scripts });
  assert.deepEqual(v.spec.required, PRE_E2E_ALLOWLIST);
  assert.deepEqual(
    v.spec.entries.map((e) => e.id),
    [...PRE_E2E_ALLOWLIST, "reconcile"]
  );
  const r = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts });
  assert.deepEqual(r.spec.required, PRE_E2E_ALLOWLIST);
});

test("PRESENT → each e2e script is discovered at verify, as `npm run <id>`, AFTER build (L52: every member)", () => {
  for (const e of E2E_SET) {
    const v = resolveSet({ stage: "verify", feature: "demo", scripts: { test: "x", build: "x", [e]: "x" } });
    assert.ok(v.ok);
    assert.deepEqual(
      v.spec.entries.map((x) => x.id),
      ["test", "build", e, "reconcile"]
    );
    assert.deepEqual(v.spec.entries.find((x) => x.id === e).argv, ["npm", "run", e]);
  }
  // Both present → both run, in ALLOWLIST order (the typecheck/type-check precedent: no precedence rule).
  const both = resolveSet({ stage: "verify", feature: "demo", scripts: { e2e: "x", "test:e2e": "x", test: "x" } });
  assert.deepEqual(both.spec.required, ["test", "test:e2e", "e2e"]);
});

test("REGRESS never discovers an e2e gate, on either side (every member); an e2e-only manifest is empty-source-set", () => {
  for (const side of SIDES) {
    for (const e of E2E_SET) {
      const r = resolveSet({ stage: "regress", side, feature: "demo", scripts: { test: "x", [e]: "x" } });
      assert.ok(r.ok);
      assert.deepEqual(r.spec.required, ["test"], `${side}: ${e} reached a regress source`);
    }
    const only = resolveSet({ stage: "regress", side, feature: "demo", scripts: { "test:e2e": "x", e2e: "x" } });
    assert.equal(only.reason_code, "empty-source-set", `${side}: an e2e-only regress source must route to the no-gates stop`);
    assert.match(only.reason, /only the e2e gates \(test:e2e, e2e\)/, "the refusal must say WHY the set is empty");
  }
  // Control: the SAME e2e-only manifest resolves at verify.
  assert.deepEqual(resolveSet({ stage: "verify", feature: "demo", scripts: { "test:e2e": "x", e2e: "x" } }).spec.required, [...E2E_SET]);
  // The drop is REPORTED (init prints it), per member, and nothing is reported at verify or when absent.
  for (const e of E2E_SET) {
    const r = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts: { test: "x", [e]: "x" } });
    assert.deepEqual(r.spec.e2e_excluded, [e]);
    assert.deepEqual(resolveSet({ stage: "verify", feature: "demo", scripts: { test: "x", [e]: "x" } }).spec.e2e_excluded, []);
  }
  assert.deepEqual(resolveSet({ stage: "regress", side: "head", feature: "demo", scripts: { test: "x" } }).spec.e2e_excluded, []);
  // --skip-style + only e2e left: the refusal names BOTH causes, never blames --skip-style alone.
  const styleAndE2e = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts: { lint: "x", e2e: "x" }, skipStyle: true });
  assert.equal(styleAndE2e.reason_code, "empty-source-set");
  assert.match(styleAndE2e.reason, /regress never discovers the e2e gates \(e2e\)/);
  // An EXPLICIT --gates string naming an e2e command is the caller's choice and is kept at regress.
  const explicit = resolveSet({ stage: "regress", side: "head", feature: "demo", gates: "npm run test:e2e::test:e2e" });
  assert.deepEqual(explicit.spec.required, ["test:e2e"]);
});

// ---------------------------------------------------------------------------------------------------
// ac-test (6.18.0) — /pharn-test's red run: the set is selected BY ID from the mapping's levels.
// ---------------------------------------------------------------------------------------------------

const AC_ROWS = [
  { id: "AC-1", level: "unit", file: "tests/ac/b.unit.test.js" },
  { id: "AC-2", level: "integration", file: "tests/ac/a.int.test.js" },
  { id: "AC-3", level: "e2e", file: "tests/e2e/reset.spec.js" },
  { id: "AC-4", level: "unit", file: "tests/ac/b.unit.test.js" },
];
const ALL_SCRIPTS = Object.fromEntries(ALLOWLIST.map((id) => [id, "x"]));

test("✧ L29 — LEVEL_GATES's keys are the mapping's closed level set; every value is a subset of the ALLOWLIST", async () => {
  const { LEVELS } = await import("./ac-tests-core.mjs");
  assert.deepEqual(Object.keys(LEVEL_GATES).sort(), [...LEVELS].sort());
  for (const [level, ids] of Object.entries(LEVEL_GATES)) {
    assert.ok(ids.length > 0, `${level} maps to no gate`);
    for (const id of ids) assert.ok(ALLOWLIST.includes(id), `${level} → ${id} is not an allowlisted gate`);
  }
  assert.deepEqual([...LEVEL_GATES.e2e], [...E2E_SET]);
  assert.ok(STAGES.includes("ac-test"));
});

test("ac-test: every allowlisted script discovered, only the levels' gates are kept, each with its mapped files", () => {
  const r = resolveSet({ stage: "ac-test", feature: "demo", scripts: ALL_SCRIPTS, acRows: AC_ROWS });
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(r.spec.required, ["test", "test:e2e", "e2e"], "style, typecheck and build are not selected");
  assert.deepEqual(
    r.spec.entries.map((e) => [e.id, e.files, e.seq]),
    [
      ["test", ["tests/ac/a.int.test.js", "tests/ac/b.unit.test.js"], 0],
      ["test:e2e", ["tests/e2e/reset.spec.js"], 1],
      ["e2e", ["tests/e2e/reset.spec.js"], 2],
    ]
  );
  assert.ok(!r.spec.entries.some((e) => e.id === "reconcile"), "the red run is not a verify: no reconcile");
  assert.equal(r.spec.side, null);
  assert.equal(r.spec.source, "discover");
  // only unit rows → only `test`; only e2e rows → only the discovered e2e gate
  const unitOnly = resolveSet({ stage: "ac-test", feature: "demo", scripts: ALL_SCRIPTS, acRows: [AC_ROWS[0]] });
  assert.deepEqual(unitOnly.spec.required, ["test"]);
  const e2eOnly = resolveSet({ stage: "ac-test", feature: "demo", scripts: { e2e: "x", test: "x" }, acRows: [AC_ROWS[2]] });
  assert.deepEqual(e2eOnly.spec.required, ["e2e"]);
});

test("acFilesFor: sorted, unique, and only the rows whose level maps to the gate", () => {
  assert.deepEqual(acFilesFor(AC_ROWS, "test"), ["tests/ac/a.int.test.js", "tests/ac/b.unit.test.js"]);
  assert.deepEqual(acFilesFor(AC_ROWS, "e2e"), ["tests/e2e/reset.spec.js"]);
  assert.deepEqual(acFilesFor(AC_ROWS, "lint"), []);
});

test("ac-test: a level with no discovered gate is coverage-violation naming the ACs (never a silently smaller set — L34)", () => {
  const r = resolveSet({ stage: "ac-test", feature: "demo", scripts: { test: "x" }, acRows: AC_ROWS });
  assert.equal(r.ok, false);
  assert.equal(r.reason_code, "coverage-violation");
  assert.match(r.reason, /AC-3 \(e2e\)/);
  assert.doesNotMatch(r.reason, /AC-1/);
  const none = resolveSet({ stage: "ac-test", feature: "demo", scripts: null, acRows: AC_ROWS });
  assert.equal(none.reason_code, "coverage-violation");
});

test("ac-test REFUSES --gates, --extra, --skip-style, --side, no/empty/bad rows; --ac-tests rows on another stage (grill G5)", () => {
  const base = { stage: "ac-test", feature: "demo", scripts: ALL_SCRIPTS, acRows: AC_ROWS };
  for (const [why, over] of [
    ["--gates", { gates: "npm test::test" }],
    ["--extra", { extras: "[]" }],
    ["--skip-style", { skipStyle: true }],
    ["--side", { side: "head" }],
    ["no rows", { acRows: null }],
    ["empty rows", { acRows: [] }],
    ["a row with an unknown level", { acRows: [{ id: "AC-1", level: "smoke", file: "x" }] }],
    ["a row with no file", { acRows: [{ id: "AC-1", level: "unit" }] }],
    ["a row that is not an object", { acRows: ["AC-1"] }],
    ["a bad feature", { feature: "../x" }],
  ]) {
    const r = resolveSet({ ...base, ...over });
    assert.equal(r.ok, false, why);
    assert.equal(r.reason_code, "usage-error", why);
  }
  assert.equal(resolveSet(base).ok, true, "control: the same call without the mutation resolves");
  for (const stage of ["verify", "regress"]) {
    const r = resolveSet({ stage, side: stage === "regress" ? "head" : null, feature: "demo", scripts: ALL_SCRIPTS, acRows: AC_ROWS });
    assert.equal(r.reason_code, "usage-error", `${stage} with --ac-tests rows`);
  }
});

test("validateStamp accepts an ac-test stamp (side null) and refuses one with a side; other readers see stage-mismatch", () => {
  const s = goodStamp({ stage: "ac-test", required: ["test"] });
  s.runs = s.runs.filter((r) => r.id !== "reconcile");
  assert.deepEqual(validateStamp(s), { ok: true });
  assert.equal(validateStamp({ ...s, side: "head" }).reason_code, "stamp-malformed");
  assert.equal(validateStamp(s, { stage: "verify" }).reason_code, "stage-mismatch");
  assert.equal(validateStamp(s, { stage: "regress" }).reason_code, "stage-mismatch");
});

// ── baseSpecFrom (6.33.0) — run-gates.mjs init --side base's copy rule, extracted so the BASE-reuse predicate applies
//    the SAME function (L35). run-gates.test.mjs pins that init still copies the head spec verbatim through it. ──
function headRecordFor(overrides = {}) {
  return {
    stage: "regress",
    side: "head",
    feature: "demo",
    source: "explicit",
    source_raw: "make test::t",
    style_skipped: true,
    required: ["t"],
    entries: [{ id: "t", shell: "make test", argv: null, files: ["a.test.js"], seq: 0 }],
    runs: [],
    ...overrides,
  };
}

test("baseSpecFrom: an in-progress head record's `entries` are copied verbatim, re-sequenced", () => {
  const r = baseSpecFrom(headRecordFor(), "demo");
  assert.equal(r.ok, true);
  assert.deepEqual(r.spec, {
    stage: "regress",
    side: "base",
    feature: "demo",
    source: "explicit",
    source_raw: "make test::t",
    style_skipped: true,
    required: ["t"],
    entries: [{ id: "t", shell: "make test", argv: null, files: ["a.test.js"], seq: 0 }],
  });
});

test("baseSpecFrom: a FINALIZED head stamp (no entries) is reconstructed from its runs, extra run fields dropped", () => {
  const r = baseSpecFrom(
    headRecordFor({
      entries: undefined,
      runs: [{ seq: 0, id: "t", shell: null, argv: ["npm", "run", "t"], files: [], exit: 1, ran: true }],
    }),
    "demo"
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.spec.entries, [{ id: "t", shell: null, argv: ["npm", "run", "t"], files: [], seq: 0 }]);
});

test("baseSpecFrom: every refusal is spec-mismatch, and it is TOTAL over parsed JSON (L62)", () => {
  const bad = [
    null,
    [],
    "x",
    headRecordFor({ side: "base" }),
    headRecordFor({ stage: "verify" }),
    headRecordFor({ feature: "other" }),
    headRecordFor({ entries: [], runs: [] }),
    headRecordFor({ entries: [null] }),
    headRecordFor({ required: "t" }),
    headRecordFor({ stage: { toString: 1 } }),
  ];
  for (const h of bad) {
    const r = baseSpecFrom(h, "demo");
    assert.equal(r.ok, false, JSON.stringify(h));
    assert.equal(r.reason_code, "spec-mismatch");
  }
});

// ── REUSED ENTRIES (6.34.0, verify-head-gate-reuse) — the SHAPE validateStamp admits, and every way to miss it ──
function reusedStamp(mutate = () => {}) {
  const s = goodStamp({ required: ["test", "typecheck"] });
  const A = s.runs[0].fp_after;
  const typecheck = {
    seq: 1,
    id: "typecheck",
    exit: 0,
    ran: false,
    timed_out: false,
    mutated: false,
    reason: REUSED_REASON,
    argv: ["npm", "run", "typecheck"],
    shell: null,
    files: [],
    fp_before: A,
    fp_after: A,
    stdout_sha256: A,
    stderr_sha256: A,
    results_sha256: null,
    identity_sha256: "c".repeat(64),
    reused: { stage: "regress", side: "head", seq: 3, stamp_sha256: "d".repeat(64) },
  };
  s.runs = [s.runs[0], typecheck, { ...s.runs[1], seq: 2, fp_before: A }];
  mutate(s, typecheck);
  return s;
}

test("reused entry: the constants are the one sanctioned source and target", () => {
  assert.equal(REUSED_REASON, "reused");
  assert.deepEqual({ ...REUSE_SOURCE }, { stage: "regress", side: "head" });
  assert.equal(REUSE_TARGET_STAGE, "verify");
  assert.deepEqual([...REUSED_BLOCK_KEYS], ["stage", "side", "seq", "stamp_sha256"]);
  assert.deepEqual([...NON_REUSABLE_IDS], [...new Set([...Object.values(LEVEL_GATES).flat(), ...STYLE_SET, "reconcile"])].sort());
});

test("reused entry: a well-formed one validates (the non-vacuity control), and its exit reaches the map", () => {
  const s = reusedStamp();
  assert.deepEqual(validateStamp(s), { ok: true });
  assert.deepEqual(stampToMap(s), { test: 0, typecheck: 0, reconcile: 0 });
});

test("reused entry: EACH shape defect is refused as stamp-malformed (L52: one mutation per rule)", () => {
  const defects = [
    ["ran: true", (s, r) => (r.ran = true)],
    ["no reused block", (s, r) => delete r.reused],
    ["a reused block without the reason", (s, r) => (r.reason = null)],
    ["the block is not an object", (s, r) => (r.reused = "regress/head")],
    ["an extra key", (s, r) => (r.reused.extra = 1)],
    ["a missing key", (s, r) => delete r.reused.seq],
    ["another stage", (s, r) => (r.reused.stage = "verify")],
    ["the base side", (s, r) => (r.reused.side = "base")],
    ["a negative seq", (s, r) => (r.reused.seq = -1)],
    ["a non-integer seq", (s, r) => (r.reused.seq = "3")],
    ["a malformed stamp digest", (s, r) => (r.reused.stamp_sha256 = "x")],
    ["no identity", (s, r) => delete r.identity_sha256],
    ["timed out", (s, r) => (r.timed_out = true)],
    ["mutated", (s, r) => (r.mutated = true)],
    ["fp_after differs", (s, r) => (r.fp_after = "e".repeat(64))],
    ["a results digest", (s, r) => (r.results_sha256 = "f".repeat(64))],
    ["no results field", (s, r) => delete r.results_sha256],
    ["in a regress stamp", (s) => Object.assign(s, { stage: "regress", side: "head" })],
  ];
  for (const [name, m] of defects) {
    const s = reusedStamp(m);
    // Keep the fp chain intact where a mutation moved fp_after, so only the rule under test can refuse.
    if (s.runs[2]) s.runs[2].fp_before = s.runs[1].fp_after;
    assert.equal(validateStamp(s).reason_code, "stamp-malformed", name);
  }
});

test("reused entry: EVERY never-reused id is refused, whatever its shape (grill I1)", () => {
  for (const gate of NON_REUSABLE_IDS) {
    const s = reusedStamp((st, r) => {
      r.id = gate;
      st.required = ["test", gate].filter((x, i, a) => a.indexOf(x) === i);
    });
    if (gate === "test") s.runs[0].id = "lint-other"; // keep ids unique; `test` itself is the reused one here
    if (gate === "reconcile") s.runs[2].id = "structural:x/evals/expected/a.json";
    const v = validateStamp(s);
    assert.equal(v.ok, false, gate);
    assert.equal(v.reason_code, "stamp-malformed", `${gate}: ${v.reason}`);
    assert.match(v.reason, /are never reused/, `${gate} is refused by the never-reused rule, not another (L60): ${v.reason}`);
  }
  // Control: the same construction with a reusable id validates, so the refusals above are the rule's.
  assert.equal(validateStamp(reusedStamp()).ok, true);
});

test("identity_sha256 (6.34.0) is optional and additive — absent validates, a malformed value is refused", () => {
  const s = goodStamp();
  assert.equal(validateStamp(s).ok, true, "a pre-6.34.0 stamp (no identity) still validates");
  s.runs[0].identity_sha256 = "a".repeat(64);
  assert.equal(validateStamp(s).ok, true);
  for (const bad of ["x", null, 3, "A".repeat(64)]) {
    s.runs[0].identity_sha256 = bad;
    assert.equal(validateStamp(s).reason_code, "stamp-malformed", String(bad));
  }
});

test("entry-not-run is unchanged for every reason but `no-files` and a well-formed reuse", () => {
  const s = goodStamp();
  s.runs[0].ran = false;
  for (const reason of [null, "skipped", "reuse", "REUSED"]) {
    s.runs[0].reason = reason;
    assert.equal(validateStamp(s).reason_code, "entry-not-run", String(reason));
  }
});

test("reused entry: its exit must be a completed process exit (0..MAX_REUSABLE_EXIT) — GATE-2 review", () => {
  for (const exit of [0, 1, MAX_REUSABLE_EXIT])
    assert.equal(validateStamp(reusedStamp((s, r) => (r.exit = exit))).ok, true, `exit ${exit}`);
  for (const exit of [126, 127, 137, -1, 1.5]) {
    const v = validateStamp(reusedStamp((s, r) => (r.exit = exit)));
    assert.equal(v.ok, false, `exit ${exit}`);
    if (Number.isInteger(exit)) assert.match(v.reason, /completed process exit/, `exit ${exit}: ${v.reason}`);
  }
});

// ---------------------------------------------------------------------------------------------------
// 6.36.0 — a project's gate exclusion: applied to DISCOVERY at every discovering stage, disclosed in the stamp.
// ---------------------------------------------------------------------------------------------------

test("exclusionError: distinct ALLOWLIST members pass (every member — L52); anything else names a position, never a value", () => {
  assert.equal(exclusionError([]), null);
  assert.equal(exclusionError([...ALLOWLIST]), null);
  for (const id of ALLOWLIST) assert.equal(exclusionError([id]), null, id);
  for (const bad of [null, "e2e", {}, ["nope"], ["reconcile"], [1], ["e2e", "e2e"], [JSON.parse('{"toString":1}')]]) {
    const e = exclusionError(bad);
    assert.equal(typeof e, "string", JSON.stringify(bad));
  }
});

test("ABSENT → nothing changes: with no exclusion every stage resolves exactly as before, and the spec's `excluded` is null", () => {
  for (const [stage, side] of [
    ["verify", null],
    ["regress", "head"],
  ]) {
    const a = resolveSet({ stage, side, feature: "demo", scripts: ALL_SCRIPTS });
    const b = resolveSet({ stage, side, feature: "demo", scripts: ALL_SCRIPTS, exclude: [] });
    assert.deepEqual(a, b, stage);
    assert.equal(a.spec.excluded, null, stage);
  }
  const ac = resolveSet({ stage: "ac-test", feature: "demo", scripts: ALL_SCRIPTS, acRows: AC_ROWS });
  assert.equal(ac.spec.excluded, null);
});

test("verify: a declared id that is discovered is REMOVED and named; one that is not discovered changes nothing (L34 control)", () => {
  const scripts = { test: "x", typecheck: "x", build: "x", e2e: "x" };
  const r = resolveSet({ stage: "verify", feature: "demo", scripts, exclude: ["e2e", "typecheck"] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.spec.required, ["test", "build"]);
  assert.deepEqual(
    r.spec.entries.map((e) => e.id),
    ["test", "build", "reconcile"]
  );
  assert.deepEqual(r.spec.excluded, { declared_in: EXCLUSION_DECLARED_IN, ids: ["typecheck", "e2e"] });
  const none = resolveSet({ stage: "verify", feature: "demo", scripts, exclude: ["lint"] });
  assert.equal(none.spec.excluded, null, "an excluded id the manifest does not have removes nothing");
  assert.deepEqual(none.spec.required, ["test", "typecheck", "build", "e2e"]);
});

test("regress: the exclusion applies AFTER the e2e rule (grill G9) — `excluded` never credits the declaration with an e2e id", () => {
  const scripts = { test: "x", typecheck: "x", e2e: "x" };
  const r = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts, exclude: ["e2e", "typecheck"] });
  assert.deepEqual(r.spec.required, ["test"]);
  assert.deepEqual(r.spec.e2e_excluded, ["e2e"], "the fixed rule keeps its own line");
  assert.deepEqual(r.spec.excluded, { declared_in: EXCLUSION_DECLARED_IN, ids: ["typecheck"] });
});

test("L34 — an exclusion that leaves NOTHING is empty-source-set naming it, at verify and at regress; --skip-style composes", () => {
  const v = resolveSet({ stage: "verify", feature: "demo", scripts: { test: "x" }, exclude: ["test"] });
  assert.equal(v.reason_code, "empty-source-set");
  assert.match(v.reason, /once the project's pharn\.config\.json#gates\.exclude removed test/);
  const r = resolveSet({ stage: "regress", side: "head", feature: "demo", scripts: { test: "x", e2e: "x" }, exclude: ["test"] });
  assert.equal(r.reason_code, "empty-source-set");
  assert.match(r.reason, /only the e2e gates \(e2e\) once the project's pharn\.config\.json#gates\.exclude removed test/);
  const s = resolveSet({
    stage: "regress",
    side: "head",
    feature: "demo",
    scripts: { test: "x", lint: "x" },
    exclude: ["test"],
    skipStyle: true,
  });
  assert.equal(s.reason_code, "empty-source-set");
});

test("an explicit --gates string is NEVER filtered: passing an exclusion with it is a usage error; a bad exclusion is refused", () => {
  const g = resolveSet({ stage: "verify", feature: "demo", gates: "npm test::test", exclude: ["test"] });
  assert.equal(g.reason_code, "usage-error");
  assert.match(g.reason, /DISCOVERY only/);
  const ok = resolveSet({ stage: "verify", feature: "demo", gates: "npm test::test" });
  assert.equal(ok.ok, true, "the control: the same --gates with no exclusion resolves");
  for (const bad of [["nope"], "test", ["test", "test"], null]) {
    const r = resolveSet({ stage: "verify", feature: "demo", scripts: { test: "x" }, exclude: bad });
    assert.equal(r.reason_code, "bad-gate-exclusion", JSON.stringify(bad));
  }
});

test("ac-test: a level whose discovered gates are ALL excluded is coverage-violation naming the exclusion; one of two e2e gates is not", () => {
  const rows = [AC_ROWS[0], AC_ROWS[2]];
  const scripts = { test: "x", e2e: "x", typecheck: "x" };
  const all = resolveSet({ stage: "ac-test", feature: "demo", scripts, acRows: rows, exclude: ["e2e"] });
  assert.equal(all.reason_code, "coverage-violation");
  assert.match(all.reason, /AC-3 \(e2e\).*pharn\.config\.json#gates\.exclude removed them \(e2e\)/);
  const two = resolveSet({
    stage: "ac-test",
    feature: "demo",
    scripts: { ...scripts, "test:e2e": "x" },
    acRows: rows,
    exclude: ["e2e", "typecheck"],
  });
  assert.equal(two.ok, true);
  assert.deepEqual(two.spec.required, ["test", "test:e2e"]);
  assert.deepEqual(two.spec.excluded, { declared_in: EXCLUSION_DECLARED_IN, ids: ["e2e"] }, "never the non-level typecheck");
});

test("levelExcludedGates (review R5) — the gates a level has, ALL excluded → them; else []; no manifest reads every gate", () => {
  assert.deepEqual(levelExcludedGates({ level: "e2e", scripts: { e2e: "x" }, exclude: ["e2e"] }), ["e2e"]);
  assert.deepEqual(levelExcludedGates({ level: "e2e", scripts: { e2e: "x", "test:e2e": "x" }, exclude: ["e2e"] }), []);
  assert.deepEqual(levelExcludedGates({ level: "unit", scripts: { test: "x" }, exclude: ["test"] }), ["test"]);
  assert.deepEqual(
    levelExcludedGates({ level: "unit", scripts: { lint: "x" }, exclude: ["test"] }),
    [],
    "no runner is not the exclusion's"
  );
  assert.deepEqual(levelExcludedGates({ level: "e2e", scripts: null, exclude: ["e2e"] }), [], "no manifest: every gate must be excluded");
  assert.deepEqual(levelExcludedGates({ level: "e2e", scripts: null, exclude: ["test:e2e", "e2e"] }), ["test:e2e", "e2e"]);
  assert.deepEqual(levelExcludedGates({ level: "toString", scripts: null, exclude: [...ALLOWLIST] }), [], "L15: not a level");
  assert.deepEqual(
    levelExcludedGates({ level: "unit", scripts: Object.create({ test: "x" }), exclude: ["test"] }),
    [],
    "L15: own scripts only"
  );
});

/** goodStamp() plus an `excluded` block (the runner's shape) over a discovered stamp whose required set lacks it. */
const excludedStamp = (over = {}) => goodStamp({ excluded: { declared_in: EXCLUSION_DECLARED_IN, ids: ["typecheck", "e2e"] }, ...over });

test("validateStamp: the `excluded` block is OPTIONAL and additive — absent and well-formed both validate", () => {
  assert.deepEqual(validateStamp(goodStamp()), { ok: true });
  assert.deepEqual(validateStamp(excludedStamp()), { ok: true });
  assert.deepEqual([...EXCLUDED_KEYS].sort(), ["declared_in", "ids"]);
});

test("validateStamp REFUSES each malformed `excluded` block as stamp-malformed (L52: one mutation per rule)", () => {
  const block = (b) => excludedStamp({ excluded: b });
  const cases = [
    ["not an object", block(["e2e"])],
    ["null", block(null)],
    ["an extra key", block({ declared_in: EXCLUSION_DECLARED_IN, ids: ["e2e"], by: "x" })],
    ["a missing key", block({ ids: ["e2e"] })],
    ["another source", block({ declared_in: "env", ids: ["e2e"] })],
    ["an empty list", block({ declared_in: EXCLUSION_DECLARED_IN, ids: [] })],
    ["a non-allowlist id", block({ declared_in: EXCLUSION_DECLARED_IN, ids: ["nope"] })],
    ["a duplicate", block({ declared_in: EXCLUSION_DECLARED_IN, ids: ["e2e", "e2e"] })],
    ["out of ALLOWLIST order", block({ declared_in: EXCLUSION_DECLARED_IN, ids: ["e2e", "typecheck"] })],
    ["an id the stamp ran", block({ declared_in: EXCLUSION_DECLARED_IN, ids: ["test"] })],
    [
      "an id the stamp requires",
      excludedStamp({ required: ["test", "e2e"], excluded: { declared_in: EXCLUSION_DECLARED_IN, ids: ["e2e"] } }),
    ],
    ["an explicit source", excludedStamp({ source: "explicit", source_raw: "npm test::test" })],
  ];
  for (const [why, s] of cases) {
    const v = validateStamp(s);
    assert.equal(v.ok, false, why);
    assert.equal(v.reason_code, "stamp-malformed", why);
    assert.match(v.reason, /^stamp\.excluded /, `${why}: ${v.reason}`);
  }
});

test("gateRunBlock copies `excluded` ONLY when the stamp carries it — every report over a stamp without one is unchanged", () => {
  assert.equal(Object.hasOwn(gateRunBlock(goodStamp(), "x"), "excluded"), false);
  const s = excludedStamp();
  const b = gateRunBlock(s, "x");
  assert.deepEqual(b.excluded, { declared_in: EXCLUSION_DECLARED_IN, ids: ["typecheck", "e2e"] });
  b.excluded.ids.push("build");
  assert.deepEqual(s.excluded.ids, ["typecheck", "e2e"], "a copy, never the stamp's own array");
});
