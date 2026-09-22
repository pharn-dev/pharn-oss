// pharn/floor/check-cost-ledger.test.mjs — hermetic tests for the cost-ledger checker.
//
// EVERY FLOOR RULE GETS A MUTATION CONTROL. A checker test that only ever feeds it a GOOD file proves
// nothing: the same suite passes against a checker that returns GREEN unconditionally. So each rule is
// exercised twice — once on a clean ledger (must be GREEN) and once on a ledger mutated in exactly that
// one way (must be RED) — and the mutation table is materialised in ONE place so a rule added later is
// covered by the loop rather than by whichever assertion its author remembered to write (L29/L36).
//
// NON-VACUITY (L34) is the second discipline here. `check-cost-ledger.mjs`'s per-request rules iterate
// `requests[]`, so over an EMPTY array they are all true and say nothing. The tests below assert both
// halves of the intended behaviour: an empty `requests[]` is LEGITIMATE (an `unavailable` ledger has
// one) and must still be held to agreement with `coverage` and with every view — silence and
// asserted-silence are different claims.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkLedger, findAbsolutePaths } from "./check-cost-ledger.mjs";
import { renderLedger, buildViews, TOP_LEVEL_KEYS, ATTRIBUTION_METHOD, SCHEMA } from "./render-cost-ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "check-cost-ledger.mjs");
const FIXTURES = join(HERE, "fixtures", "cost-ledger");
const REAL_SESSION = "51a7441d-0e03-4066-8d1c-be5a2d419121";

/** A clean, real ledger built from the committed fixture. Deep-cloned per test so a mutation in one
 *  cannot leak into another. */
function cleanLedger() {
  const root = mkdtempSync(join(tmpdir(), "check-cl-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  copyFileSync(join(FIXTURES, "single-session.jsonl"), join(proj, `${REAL_SESSION}.jsonl`));
  const markers = join(root, "cost", "feat");
  mkdirSync(markers, { recursive: true });
  writeFileSync(
    join(markers, "markers.jsonl"),
    [
      JSON.stringify({ seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2026-09-21T08:00:00.000Z", session_id: null }),
      JSON.stringify({ seq: 2, kind: "stage-start", stage: "pharn-build", iteration: 1, ts: "2026-09-21T08:30:00.000Z", session_id: null }),
      JSON.stringify({ seq: 3, kind: "run-stop", stage: null, iteration: null, ts: "2026-09-21T09:59:00.000Z", session_id: null }),
    ].join("\n") + "\n"
  );
  return renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: join(root, "projects"), markersBase: join(root, "cost") });
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const redsOf = (led, opts) => checkLedger(led, opts).reds;

const run = (args) => {
  try {
    return { status: 0, stdout: execFileSync("node", [CLI, ...args], { encoding: "utf8" }) };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
};

// ---------------------------------------------------------------- the green control

test("a freshly emitted ledger is GREEN — the control that makes every RED below meaningful", () => {
  const led = cleanLedger();
  assert.ok(led.requests.length > 0, "NON-VACUITY: a zero-request ledger would make the per-request rules vacuous");
  assert.deepEqual(redsOf(led), [], "the emitter must satisfy its own checker");
});

// ---------------------------------------------------------------- the mutation table

/** ONE materialised table. A rule added later gets its control here and is covered by the loop below —
 *  never by an assertion written for whichever rule was in front of the author (L29). */
const MUTATIONS = [
  { rule: "1 closed key set / extra", mutate: (l) => void (l.surprise = 1), expect: /not closed — unexpected key/ },
  { rule: "1 closed key set / missing", mutate: (l) => void delete l.dropped, expect: /not closed — missing key/ },
  // A nested OBJECT is not itself a violation — the walker recurses into it, exactly as it does for the
  // real `cache_creation` and `output_tokens_details`. The violation is a LEAF outside the domain, so
  // the mutation puts one at depth to prove the recursion reaches it.
  {
    rule: "2 usage leaf domain",
    mutate: (l) => void (l.requests[0].usage.nested = { an: "a string with spaces is not a token" }),
    expect: /usage leaf out of domain/,
  },
  {
    rule: "2 usage leaf / inside a walked array",
    mutate: (l) => void (l.requests[0].usage.iterations[0].type = "not a token either"),
    expect: /usage leaf out of domain/,
  },
  {
    rule: "2 usage leaf / over-long string",
    mutate: (l) => void (l.requests[0].usage.service_tier = "x".repeat(200)),
    expect: /usage leaf out of domain/,
  },
  { rule: "3 absolute path", mutate: (l) => void (l.coverage_note = "see /Users/someone/secret/"), expect: /absolute-path-shaped string/ },
  {
    rule: "3 absolute path / nested in a marker",
    mutate: (l) => void (l.markers[0].stage = "/etc/passwd/"),
    expect: /absolute-path-shaped string/,
  },
  { rule: "4 unique request ids", mutate: (l) => void (l.requests[1].request_id = l.requests[0].request_id), expect: /is a duplicate/ },
  { rule: "5 monotonic marker seq", mutate: (l) => void (l.markers[1].seq = l.markers[0].seq), expect: /strictly increasing/ },
  { rule: "5 marker kind enum", mutate: (l) => void (l.markers[0].kind = "not-a-kind"), expect: /markers\[0\]\.kind must be one of/ },
  { rule: "6 totals view", mutate: (l) => void (l.totals.requests = 999), expect: /totals disagrees with a recompute/ },
  { rule: "6 totals tokens", mutate: (l) => void (l.totals.tokens.output += 1), expect: /totals disagrees with a recompute/ },
  { rule: "6 by_model view", mutate: (l) => void l.by_model.pop(), expect: /by_model disagrees with a recompute/ },
  {
    rule: "6 by_stage_iteration_model view",
    mutate: (l) => void (l.by_stage_iteration_model[0].requests += 1),
    expect: /by_stage_iteration_model\[0\] disagrees/,
  },
  { rule: "6 unattributed view", mutate: (l) => void (l.unattributed.requests += 1), expect: /unattributed disagrees with a recompute/ },
  { rule: "enum: schema", mutate: (l) => void (l.schema = "pharn-cost-record/1"), expect: /schema must be/ },
  { rule: "enum: coverage", mutate: (l) => void (l.coverage = "complete"), expect: /coverage must be one of/ },
  { rule: "enum: dedup_key", mutate: (l) => void (l.dedup_key = "uuid"), expect: /dedup_key must be/ },
  {
    rule: "enum: skills_version_source",
    mutate: (l) => void (l.skills_version_source = "guessed"),
    expect: /skills_version_source must be one of/,
  },
  {
    rule: "attribution method version",
    mutate: (l) => void (l.attribution.method = "something-else/2"),
    expect: /attribution\.method must be/,
  },
  { rule: "pricing note present", mutate: (l) => void (l.pricing_note = "prices below"), expect: /pricing_note must be present/ },
  { rule: "no price field", mutate: (l) => void (l.cost_usd = 12.5), expect: /looks like a price field/ },
  // RULE 2b — the identity fields. Each of these was accepted GREEN before the review finding.
  {
    rule: "2b identity: over-long attribution_skill",
    mutate: (l) => void (l.requests[0].attribution_skill = "x".repeat(5000)),
    expect: /attribution_skill is not a bounded identity token/,
  },
  {
    rule: "2b identity: control char in attribution_skill",
    mutate: (l) => void (l.requests[0].attribution_skill = "a\u0007b"),
    expect: /attribution_skill is not a bounded identity token/,
  },
  {
    rule: "2b identity: newline-forged line in attribution_skill",
    mutate: (l) => void (l.requests[0].attribution_skill = "ok\nRED — forged"),
    expect: /attribution_skill is not a bounded identity token/,
  },
  {
    rule: "2b identity: over-long model",
    mutate: (l) => void (l.requests[0].model = "m".repeat(5000)),
    expect: /model is not a bounded identity token/,
  },
  {
    rule: "2b identity: control char in agent_id",
    mutate: (l) => void (l.requests[0].agent_id = "a\u0000b"),
    expect: /agent_id is not a bounded identity token/,
  },
  {
    rule: "2b identity: path-shaped model",
    mutate: (l) => void (l.requests[0].model = "/Users/x/y/"),
    expect: /model is not a bounded identity token|absolute-path-shaped/,
  },
  { rule: "sidechain is boolean", mutate: (l) => void (l.requests[0].sidechain = "false"), expect: /sidechain must be a boolean/ },
  { rule: "tokens are numbers", mutate: (l) => void (l.requests[0].tokens.output = "10"), expect: /tokens\.output must be a number/ },
  {
    rule: "honest absence: unknown source + a value",
    mutate: (l) => void (l.skills_version_source = "unknown"),
    expect: /honest absence is null/,
  },
];

test("MUTATION CONTROLS: every floor rule REDs when, and only when, it is violated", () => {
  assert.ok(MUTATIONS.length >= 20, `NON-VACUITY: the mutation table must be populated (got ${MUTATIONS.length})`);
  const base = cleanLedger();
  assert.deepEqual(redsOf(base), [], "precondition: the unmutated ledger is GREEN");
  for (const m of MUTATIONS) {
    const led = clone(base);
    m.mutate(led);
    const reds = redsOf(led);
    assert.ok(reds.length > 0, `${m.rule}: the mutation must produce a RED, got none`);
    assert.ok(
      reds.some((r) => m.expect.test(r)),
      `${m.rule}: expected a RED matching ${m.expect}, got: ${reds.join(" | ")}`
    );
  }
});

test("MUTATION CONTROLS are SPECIFIC: each mutation's RED disappears on the clean ledger", () => {
  // Guards against a checker that REDs on everything, which would satisfy the table above.
  const base = cleanLedger();
  for (const m of MUTATIONS) {
    assert.ok(!redsOf(base).some((r) => m.expect.test(r)), `${m.rule}: this RED must NOT fire on a clean ledger`);
  }
});

// ---------------------------------------------------------------- non-vacuity over an empty domain

test("NON-VACUITY: an empty requests[] is legitimate but must AGREE with coverage and every view", () => {
  const led = renderLedger({ name: "f", sessionId: null, projectsDir: "/nope", markersBase: "/nope" });
  assert.equal(led.requests.length, 0);
  assert.equal(led.coverage, "unavailable");
  assert.deepEqual(redsOf(led), [], "an honest `unavailable` ledger is a valid record, not a failure");
});

test("NON-VACUITY: an empty requests[] that claims `partial` is RED — silence is not asserted silence", () => {
  // This is the L34 shape exactly: the per-request rules are all vacuously true here, so without this
  // guard a suppressed measurement would be certified by the checker as a cheap run.
  const led = renderLedger({ name: "f", sessionId: null, projectsDir: "/nope", markersBase: "/nope" });
  led.coverage = "partial";
  const reds = redsOf(led);
  assert.ok(
    reds.some((r) => /empty but coverage is not `unavailable`/.test(r)),
    `expected the empty-domain guard to fire, got: ${reds.join(" | ")}`
  );
});

test("NON-VACUITY: an empty requests[] with a populated view is RED", () => {
  const led = renderLedger({ name: "f", sessionId: null, projectsDir: "/nope", markersBase: "/nope" });
  led.by_model = [{ model: "m", requests: 1, tokens: {} }];
  assert.ok(redsOf(led).some((r) => /empty but a view carries rows/.test(r)));
});

// ---------------------------------------------------------------- WARN, never RED

test("a missing iteration marker is a WARN WITH A COUNT, never a RED and never a silent merge", () => {
  const led = cleanLedger();
  led.outcome = { decision: "STOP_CAP", iterations: 3, source: "LOOP.md" };
  const { reds, warns } = checkLedger(led);
  assert.deepEqual(reds, [], "an orchestration lapse must not fail a well-formed artifact");
  assert.ok(warns.length > 0, "NON-VACUITY: the WARN must actually fire");
  assert.ok(
    warns.some((w) => /marker completeness/.test(w) && /2, 3/.test(w)),
    `expected a counted completeness WARN, got: ${warns.join(" | ")}`
  );
  assert.ok(
    warns.some((w) => /NOT merged into a neighbour/.test(w)),
    "the WARN must state that nothing was merged"
  );
});

test("a complete marker set produces no completeness WARN", () => {
  const led = cleanLedger();
  led.outcome = { decision: "STOP_GREEN", iterations: 1, source: "LOOP.md" };
  const { warns } = checkLedger(led);
  assert.ok(!warns.some((w) => /iteration/.test(w)), `expected no iteration WARN, got: ${warns.join(" | ")}`);
});

// ---------------------------------------------------------------- the absolute-path walker

test("findAbsolutePaths reaches every depth, and the schema token is NOT a false positive", () => {
  const hits = findAbsolutePaths({ a: { b: [{ c: "/Users/x/y/" }] }, schema: "pharn-cost-ledger/1", ok: "not_available" }, "", []);
  assert.equal(hits.length, 1, `expected exactly the nested path, got: ${hits.join(" | ")}`);
  assert.match(hits[0], /a\.b\[0\]\.c/);
});

test("findAbsolutePaths catches the home-relative and Windows spellings too (L36: variant spellings)", () => {
  for (const s of ["~/secrets", "C:\\Users\\x", "/etc/passwd/", 'cwd="/home/someone/repo/"']) {
    assert.equal(findAbsolutePaths({ v: s }, "", []).length, 1, `${s} must be caught`);
  }
  for (const s of ["pharn-cost-ledger/1", "not_available", "claude-opus-5", "2026-09-21T08:35:42.425Z", "a/b"]) {
    assert.equal(findAbsolutePaths({ v: s }, "", []).length, 0, `${s} must NOT be caught`);
  }
});

// ---------------------------------------------------------------- --verify-transcript (L43)

test("--verify-transcript GREEN when the rows really do re-derive from the transcript", () => {
  const root = mkdtempSync(join(tmpdir(), "check-cl-vt-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  copyFileSync(join(FIXTURES, "single-session.jsonl"), join(proj, `${REAL_SESSION}.jsonl`));
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  const { reds } = checkLedger(led, { verifyTranscript: true, projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  assert.deepEqual(reds, []);
});

test("--verify-transcript REDs a FABRICATED row set that is internally consistent (the L43 gap, closed)", () => {
  // This is the whole point of the mode. The mutated ledger below is PERFECTLY self-consistent — its
  // views are recomputed from its own rows — so the default check is GREEN. Only binding the rows to
  // their referent catches it.
  const root = mkdtempSync(join(tmpdir(), "check-cl-fab-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  copyFileSync(join(FIXTURES, "single-session.jsonl"), join(proj, `${REAL_SESSION}.jsonl`));
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: join(root, "projects"), markersBase: join(root, "none") });

  led.requests = led.requests.slice(0, 3); // drop rows, then make the file agree with itself again
  Object.assign(led, buildViews(led.requests));

  assert.deepEqual(checkLedger(led).reds, [], "the fabricated ledger is INTERNALLY CONSISTENT — this is the bound L43 names");
  const { reds } = checkLedger(led, { verifyTranscript: true, projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  assert.ok(
    reds.some((r) => /does not match the transcript/.test(r)),
    `--verify-transcript must catch it, got: ${reds.join(" | ")}`
  );
});

test("--verify-transcript degrades to a WARN, never a false RED, when the transcript is gone", () => {
  const led = cleanLedger();
  const { reds, warns } = checkLedger(led, { verifyTranscript: true, projectsDir: join(tmpdir(), "absent-xyz-9731") });
  assert.deepEqual(reds, [], "a pruned transcript is not evidence the ledger is wrong");
  assert.ok(warns.some((w) => /no longer available/.test(w)));
});

// ---------------------------------------------------------------- the CLI

test("the CLI exits 0 GREEN on a clean ledger and prints its own bound", () => {
  const dir = mkdtempSync(join(tmpdir(), "check-cl-cli-"));
  const p = join(dir, "cost.json");
  writeFileSync(p, JSON.stringify(cleanLedger(), null, 2));
  const r = run([p]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^GREEN —/m);
  assert.match(
    r.stdout,
    /INTERNAL CONSISTENCY, never that requests\[\] matches the transcript/,
    "the bound must travel with the verdict (L43)"
  );
});

test("the CLI exits 1 RED and names every violation", () => {
  const dir = mkdtempSync(join(tmpdir(), "check-cl-cli-"));
  const led = cleanLedger();
  led.surprise = 1;
  led.requests[1].request_id = led.requests[0].request_id;
  const p = join(dir, "cost.json");
  writeFileSync(p, JSON.stringify(led, null, 2));
  const r = run([p]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /unexpected key/);
  assert.match(r.stdout, /is a duplicate/);
});

test("the CLI exits 2 on unusable input — never GREEN by default (fail-closed)", () => {
  const dir = mkdtempSync(join(tmpdir(), "check-cl-cli-"));
  assert.equal(run([join(dir, "absent.json")]).status, 2, "a missing file");
  const bad = join(dir, "bad.json");
  writeFileSync(bad, "{ not json");
  assert.equal(run([bad]).status, 2, "unparseable JSON");
  assert.equal(run([]).status, 2, "no argument");
  assert.equal(run(["a", "--frobnicate"]).status, 2, "unknown flag");
});

test("a non-object ledger is RED, not a crash", () => {
  assert.ok(checkLedger([]).reds.some((r) => /not a JSON object/.test(r)));
  assert.ok(checkLedger(null).reds.some((r) => /not a JSON object/.test(r)));
});

test("the exported TOP_LEVEL_KEYS is what the checker actually enforces (one definition, L35)", () => {
  const led = cleanLedger();
  assert.deepEqual(Object.keys(led).sort(), [...TOP_LEVEL_KEYS].sort());
  assert.equal(led.schema, SCHEMA);
  assert.equal(led.attribution.method, ATTRIBUTION_METHOD);
});

// ── RULE 7: the `outcome` shape ──────────────────────────────────────────────────────────────────────
//
// WHY THESE EXIST. `cost-ledger.md` advertised `outcome` as `FLOOR (shape)` from the day the contract
// shipped, while this checker validated nothing inside it — a FLOOR label with no running op behind it,
// which is the disease P0 names and the rule [[L2]] states. The rule was built rather than the label
// relabelled because `/pharn-ship` adds a SECOND producer and a SECOND `source` member: leaving the
// field unchecked would have deepened the overclaim instead of inheriting it.
//
// Each rule below is paired with a MUTATION CONTROL (L4): an assertion that only ever sees the valid
// input certifies nothing about the invalid one.

test("RULE 7: a null outcome is VALID — and so is each shipped producer's real shape", () => {
  const led = cleanLedger();
  // Non-vacuity first (L34): the domain must be non-empty and the clean ledger must actually pass, or
  // every "must RED" assertion below is satisfied by a checker that reds on everything.
  const valid = [
    null,
    { decision: "STOP_GREEN", iterations: 1, source: "LOOP.md" },
    { decision: "INCONCLUSIVE", iterations: 2, source: "LOOP.md", blocked: "S7" },
    { decision: "gate2", iterations: 1, source: "verdicts+markers" },
    { decision: "stop:pharn-verify", iterations: null, source: "verdicts+markers" },
    { decision: "stop:unknown", iterations: null, source: "verdicts+markers" },
  ];
  assert.ok(valid.length >= 6, "non-vacuity: the valid domain must be non-empty");
  for (const outcome of valid) {
    const l = clone(led);
    l.outcome = outcome;
    assert.deepEqual(redsOf(l), [], `a valid outcome must not RED: ${JSON.stringify(outcome)}`);
  }
});

test("RULE 7 DISCRIMINATES: every malformed outcome REDs, and the message names the field", () => {
  const led = cleanLedger();
  const invalid = [
    [{ decision: "gate2", iterations: 1, source: "SHIP.md" }, /outcome\.source/],
    [{ decision: "gate2", iterations: 1, source: null }, /outcome\.source/],
    [{ decision: "gate2", iterations: 1 }, /outcome\.source/],
    [{ decision: "", iterations: 1, source: "LOOP.md" }, /outcome\.decision/],
    [{ decision: 7, iterations: 1, source: "LOOP.md" }, /outcome\.decision/],
    [{ decision: "a\nb", iterations: 1, source: "LOOP.md" }, /outcome\.decision/],
    [{ decision: "x".repeat(129), iterations: 1, source: "LOOP.md" }, /outcome\.decision/],
    [{ decision: "gate2", iterations: 1.5, source: "LOOP.md" }, /outcome\.iterations/],
    [{ decision: "gate2", iterations: "1", source: "LOOP.md" }, /outcome\.iterations/],
    [{ decision: "gate2", iterations: 1, source: "LOOP.md", blocked: 9 }, /outcome\.blocked/],
    [{ decision: "gate2", iterations: 1, source: "LOOP.md", extra: true }, /unknown key/],
    [[1, 2], /outcome must be an object or null/],
    ["STOP_GREEN", /outcome must be an object or null/],
  ];
  assert.ok(invalid.length >= 13, "non-vacuity: the invalid domain must be non-empty");
  for (const [outcome, re] of invalid) {
    const l = clone(led);
    l.outcome = outcome;
    const reds = redsOf(l);
    assert.ok(reds.length > 0, `must RED: ${JSON.stringify(outcome)}`);
    assert.ok(
      reds.some((m) => re.test(m)),
      `the RED must name the offending field for ${JSON.stringify(outcome)}; got ${JSON.stringify(reds)}`
    );
  }
});

test("RULE 7 closes the key set in BOTH directions — presence would miss a variant spelling (L36)", () => {
  const led = cleanLedger();
  // A per-member presence set is satisfied by a ledger carrying `decisions` beside `decision`; closure
  // is what fails it. Each variant below is a plausible mis-spelling of a REAL member.
  for (const k of ["decisions", "Decision", "iteration", "sources", "blocked_by"]) {
    const l = clone(led);
    l.outcome = { decision: "gate2", iterations: 1, source: "LOOP.md", [k]: "x" };
    assert.ok(
      redsOf(l).some((m) => /unknown key/.test(m)),
      `a variant key ${k} must fail closure`
    );
  }
  // MUTATION CONTROL: the four real keys must NOT trip it, or the rule rejects everything.
  const ok = clone(led);
  ok.outcome = { decision: "INCONCLUSIVE", iterations: 3, source: "LOOP.md", blocked: "S9" };
  assert.deepEqual(redsOf(ok), []);
});
