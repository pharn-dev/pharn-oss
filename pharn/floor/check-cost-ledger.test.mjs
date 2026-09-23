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

/** A markers dir whose single run-start (null session = every session) precedes the whole fixture, so
 *  the run window contains every fixture row. Since `pharn-cost-ledger/2` a missing markers file means
 *  membership `unknown` and NO rows, so a test about rows must open a run explicitly. */
function openRun(root) {
  const dir = join(root, "cost", "feat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "markers.jsonl"),
    JSON.stringify({ seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2020-01-01T00:00:00.000Z", session_id: null }) + "\n"
  );
  return join(root, "cost");
}
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
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: join(root, "projects"), markersBase: openRun(root) });
  assert.ok(led.requests.length > 0, "NON-VACUITY: an unknown-membership ledger would re-derive to nothing and pass for free");
  const { reds } = checkLedger(led, { verifyTranscript: true, projectsDir: join(root, "projects") });
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
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: join(root, "projects"), markersBase: openRun(root) });

  led.requests = led.requests.slice(0, 3); // drop rows, then make the file agree with itself again
  Object.assign(led, buildViews(led.requests));

  assert.deepEqual(checkLedger(led).reds, [], "the fabricated ledger is INTERNALLY CONSISTENT — this is the bound L43 names");
  const { reds } = checkLedger(led, { verifyTranscript: true, projectsDir: join(root, "projects") });
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

// ===================================================================================================
// RULE 8 — run membership (`pharn-cost-ledger/2`) and the `/1` compatibility policy. Mutations are made
// on a REAL emitted ledger, and every RED is paired with the GREEN it came from (a mutation control).
// ===================================================================================================

import { LEGACY_SCHEMA, TOP_LEVEL_KEYS_V1 } from "./render-cost-ledger.mjs";
import { appendFileSync } from "node:fs";

const RS = "00000000-0000-4000-8000-0000000000c1";
const recLine = (id, ts, input) =>
  JSON.stringify({
    type: "assistant",
    requestId: id,
    timestamp: ts,
    sessionId: RS,
    isSidechain: false,
    message: { model: "claude-opus-5", usage: { input_tokens: input, output_tokens: 0, cache_creation: {}, output_tokens_details: {} } },
  });

/** 100 input tokens before the run, 10 inside it — the reproduction from the defect report. */
function runFixture() {
  const root = mkdtempSync(join(tmpdir(), "check-cl-run-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  writeFileSync(
    join(proj, `${RS}.jsonl`),
    [recLine("before", "2026-09-21T09:00:00.000Z", 100), recLine("during", "2026-09-21T10:05:00.000Z", 10)].join("\n") + "\n"
  );
  const mdir = join(root, "cost", "feat");
  mkdirSync(mdir, { recursive: true });
  writeFileSync(
    join(mdir, "markers.jsonl"),
    [
      { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2026-09-21T10:00:00.000Z", session_id: RS },
      { seq: 2, kind: "run-stop", stage: null, iteration: null, ts: "2026-09-21T10:30:00.000Z", session_id: RS },
    ]
      .map((m) => JSON.stringify(m))
      .join("\n") + "\n"
  );
  const projectsDir = join(root, "projects");
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase: join(root, "cost") });
  return { root, projectsDir, led, markersFile: join(mdir, "markers.jsonl") };
}

test("RULE 8 — the 100-before/10-during ledger is GREEN and measures 10", () => {
  const { led } = runFixture();
  assert.equal(led.totals.tokens.input, 10);
  assert.deepEqual(redsOf(led), []);
});

test("RULE 8 — a pre-run row smuggled back in (views recomputed, so internally consistent) is RED", () => {
  // This is the /1 defect expressed as a /2 file: 110 with every view agreeing. RULE 6 alone is GREEN.
  const { led } = runFixture();
  const bad = clone(led);
  bad.requests.unshift({
    ...clone(bad.requests[0]),
    request_id: "before",
    ts: "2026-09-21T09:00:00.000Z",
    tokens: { ...bad.requests[0].tokens, input: 100 },
  });
  Object.assign(bad, buildViews(bad.requests));
  assert.equal(bad.totals.tokens.input, 110);
  const reds = redsOf(bad);
  assert.ok(
    reds.some((r) => /OUTSIDE the recorded run window/.test(r)),
    reds.join(" | ")
  );
  assert.deepEqual(redsOf(led), [], "MUTATION CONTROL: the unmutated ledger is GREEN");
});

test("RULE 8 — a stored membership that disagrees with a recompute from markers[] is RED", () => {
  const { led } = runFixture();
  for (const [k, v] of [
    ["status", "open"],
    ["start", "2026-09-21T09:00:00.000Z"],
    ["end", null],
  ]) {
    const bad = clone(led);
    bad.membership[k] = v;
    assert.ok(
      redsOf(bad).some((r) => new RegExp(`membership\\.${k} disagrees`).test(r)),
      `${k} tamper must RED`
    );
  }
});

test("RULE 8 — membership key set is CLOSED in both directions; method and status are enums", () => {
  const { led } = runFixture();
  const extra = clone(led);
  extra.membership.memberships = 1;
  assert.ok(redsOf(extra).some((r) => /membership key set is not closed — unexpected/.test(r)));
  const missing = clone(led);
  delete missing.membership.excluded_requests;
  assert.ok(redsOf(missing).some((r) => /membership key set is not closed — missing/.test(r)));
  const method = clone(led);
  method.membership.method = "run-window/9";
  assert.ok(redsOf(method).some((r) => /membership\.method/.test(r)));
  const status = clone(led);
  status.membership.status = "complete";
  assert.ok(redsOf(status).some((r) => /membership\.status must be one of/.test(r)));
  const nomem = clone(led);
  delete nomem.membership;
  assert.ok(
    redsOf(nomem).some((r) => /missing key\(s\): membership/.test(r)),
    "a /2 file must carry membership"
  );
});

test("RULE 8 — UNKNOWN must be unavailable, row-free, and excluded_requests null; never a measurement", () => {
  const root = mkdtempSync(join(tmpdir(), "check-cl-unk-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, `${RS}.jsonl`), recLine("x", "2026-09-21T10:05:00.000Z", 10) + "\n");
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  assert.equal(led.membership.status, "unknown");
  assert.deepEqual(redsOf(led), [], "the honest unknown is GREEN");
  const asPartial = clone(led);
  asPartial.coverage = "partial";
  assert.ok(redsOf(asPartial).some((r) => /unknown but coverage is not `unavailable`/.test(r)));
  const zero = clone(led);
  zero.membership.excluded_requests = 0;
  assert.ok(redsOf(zero).some((r) => /must be null when membership is unknown/.test(r)));
});

test("RULE 8 / L34 — an EMPTY partial is admitted only under a KNOWN window (an observed zero)", () => {
  const { led } = runFixture();
  const zero = clone(led);
  zero.requests = [];
  Object.assign(zero, buildViews([]));
  zero.membership.excluded_requests = 2;
  assert.deepEqual(redsOf(zero), [], "bounded window + no rows = an observed zero, GREEN");
  const legacyEmpty = clone(zero);
  legacyEmpty.schema = LEGACY_SCHEMA;
  delete legacyEmpty.membership;
  assert.ok(
    redsOf(legacyEmpty).some((r) => /empty but coverage is not `unavailable`/.test(r)),
    "under /1 the old rule stands"
  );
});

test("COMPATIBILITY — a legacy /1 ledger is GREEN under its own rules, WARNed as SESSION-scoped, never reinterpreted", () => {
  const { led } = runFixture();
  // Build a faithful /1-shaped file: the old whole-session population (both rows, 110), no membership.
  const v1 = clone(led);
  v1.schema = LEGACY_SCHEMA;
  delete v1.membership;
  v1.requests.unshift({
    ...clone(v1.requests[0]),
    request_id: "before",
    ts: "2026-09-21T09:00:00.000Z",
    tokens: { ...v1.requests[0].tokens, input: 100 },
  });
  Object.assign(v1, buildViews(v1.requests));
  assert.deepEqual(Object.keys(v1).sort(), [...TOP_LEVEL_KEYS_V1].sort());
  const { reds, warns } = checkLedger(v1);
  assert.deepEqual(reds, [], "a historical ledger is not retroactively REDed");
  assert.ok(warns.some((w) => /legacy pharn-cost-ledger\/1 — totals are SESSION-scoped/.test(w)));
  const withMembership = clone(v1);
  withMembership.membership = clone(led.membership);
  assert.ok(
    redsOf(withMembership).some((r) => /unexpected key\(s\): membership/.test(r)),
    "/1 keeps its OWN closed key set"
  );
  const { warns: vw } = checkLedger(v1, { verifyTranscript: true, projectsDir: join(tmpdir(), "absent") });
  assert.ok(vw.some((w) => /not supported for a legacy/.test(w)));
});

test("an unknown schema is RED under the CURRENT rules — never downgraded to the legacy path", () => {
  const { led } = runFixture();
  const bad = clone(led);
  bad.schema = "pharn-cost-ledger/3";
  assert.ok(redsOf(bad).some((r) => /schema must be/.test(r)));
});

test("--verify-transcript uses the RECORDED boundary — a later invocation's run-start does not re-bound it", () => {
  const { led, projectsDir, markersFile } = runFixture();
  appendFileSync(
    markersFile,
    JSON.stringify({ seq: 3, kind: "run-start", stage: null, iteration: null, ts: "2026-09-21T12:00:00.000Z", session_id: RS }) + "\n"
  );
  const { reds } = checkLedger(led, { verifyTranscript: true, projectsDir });
  assert.deepEqual(reds, []);
});

test("--verify-transcript REDs a tampered excluded_requests the internal check cannot see", () => {
  const { led, projectsDir } = runFixture();
  const bad = clone(led);
  bad.membership.excluded_requests = 0;
  assert.deepEqual(redsOf(bad), [], "internally, a count is just a count — this is the L43 bound");
  const { reds } = checkLedger(bad, { verifyTranscript: true, projectsDir });
  assert.ok(
    reds.some((r) => /excluded_requests does not match the transcript/.test(r)),
    reds.join(" | ")
  );
});

test("--verify-transcript applies the SAME membership rule: dropping the in-run row is RED", () => {
  const { led, projectsDir } = runFixture();
  const bad = clone(led);
  bad.requests = [];
  Object.assign(bad, buildViews([]));
  assert.deepEqual(redsOf(bad), [], "an observed-zero-looking file is internally consistent");
  const { reds } = checkLedger(bad, { verifyTranscript: true, projectsDir });
  assert.ok(
    reds.some((r) => /does not match the transcript \(0 recorded, 1 re-derived\)/.test(r)),
    reds.join(" | ")
  );
});

test("--verify-transcript on an UNKNOWN ledger WARNs that it certified nothing — never a silent GREEN (REVIEW finding 2)", () => {
  const root = mkdtempSync(join(tmpdir(), "check-cl-vt-unk-"));
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir: join(root, "none"), markersBase: join(root, "none") });
  assert.equal(led.membership.status, "unknown");
  const { reds, warns } = checkLedger(led, { verifyTranscript: true, projectsDir: join(root, "gone") });
  assert.deepEqual(reds, []);
  assert.ok(
    warns.some((w) => /membership is `unknown`, so there are no rows to re-derive/.test(w)),
    warns.join(" | ")
  );
});

// ===================================================================================================
// --verify-transcript over a session that CONTINUED after the run (6.13.1).
//
// THE RECORDED FAILURE (P7): a downstream `/pharn-loop` ledger (630 rows, `excluded_requests: 423`) went
// RED under `--verify-transcript` with "423 recorded, 508 re-derived", and the number kept moving. The
// rows and totals re-derived exactly. The transcript is append-only, so the exclusion is two parts: the
// requests BEFORE the window, fixed once the window is, and the requests AFTER its end, which keep coming
// for as long as the session goes on (the emission's own turn, the loop's commit, the conversation after
// it). An equality check on the sum failed every real stop. [[L42]]: the re-derivation answers "what is it
// NOW", the recorded value answered "what was it THEN", and the tail is the one input that legitimately
// changed between them.
//
// EVERY EXPECTATION IS AN INDEPENDENT LITERAL, counted from the committed fixture by hand, never asked of
// the code under test ([[L43]]). `single-session.jsonl` carries 12 deduped requests; the window below is
// 08:36:00 → 08:40:00, so 3 fall BEFORE it (08:35:42, :46, :59), 5 INSIDE (08:36:05 … 08:37:02) and 4
// AFTER its end (08:41:05 … 08:43:03). `session-continued.jsonl` then appends 3 more deduped requests
// (4 lines — one response written twice), all after the end.
// ===================================================================================================

import { readFileSync } from "node:fs";

const TAIL_FIXTURE = join(FIXTURES, "session-continued.jsonl");
const MID_START = "2026-09-21T08:36:00.000Z";
const MID_STOP = "2026-09-21T08:40:00.000Z";
const BEFORE = 3;
const INSIDE = 5;
const AFTER_AT_EMISSION = 4;
const APPENDED = 3;

/** Stage the real fixture with a window in its MIDDLE, emit the ledger, and hand back a function that
 *  continues the session by appending the committed tail to the staged transcript. `stop: false` leaves
 *  the window OPEN. */
function midRun({ stop = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "check-cl-tail-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  const transcript = join(proj, `${REAL_SESSION}.jsonl`);
  copyFileSync(join(FIXTURES, "single-session.jsonl"), transcript);
  const mdir = join(root, "cost", "feat");
  mkdirSync(mdir, { recursive: true });
  const markers = [{ seq: 1, kind: "run-start", stage: null, iteration: null, ts: MID_START, session_id: REAL_SESSION }];
  if (stop) markers.push({ seq: 2, kind: "run-stop", stage: null, iteration: null, ts: MID_STOP, session_id: REAL_SESSION });
  writeFileSync(join(mdir, "markers.jsonl"), markers.map((m) => JSON.stringify(m)).join("\n") + "\n");
  const projectsDir = join(root, "projects");
  const opts = { name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "cost") };
  const led = renderLedger(opts);
  const continueSession = () => appendFileSync(transcript, readFileSync(TAIL_FIXTURE, "utf8"));
  // The live count under the ledger's OWN recorded markers — what the checker re-derives.
  const liveExcluded = () => renderLedger({ ...opts, markers: led.markers }).membership.excluded_requests;
  return { root, led, projectsDir, continueSession, liveExcluded };
}

const verify = (led, projectsDir) => checkLedger(led, { verifyTranscript: true, projectsDir });
const CONTINUED_WARN = /--verify-transcript: the session continued after the run/;
const EXCLUDED_RED = /--verify-transcript: membership\.excluded_requests does not match the transcript/;

test("--verify-transcript: a session that CONTINUED after the run is GREEN — the tail grew, nothing was wrong (6.13.1)", () => {
  const { led, projectsDir, continueSession, liveExcluded } = midRun();
  // NON-VACUITY (L34): each part of the split is non-empty, or the range would be degenerate.
  assert.equal(led.requests.length, INSIDE);
  assert.equal(led.membership.status, "bounded");
  assert.equal(led.membership.excluded_requests, BEFORE + AFTER_AT_EMISSION);
  continueSession();
  assert.equal(liveExcluded(), BEFORE + AFTER_AT_EMISSION + APPENDED, "precondition: the appended tail really moved the live count");
  const { reds, warns } = verify(led, projectsDir);
  assert.deepEqual(reds, [], "a genuine ledger whose session went on must not RED");
  assert.equal(warns.filter((w) => CONTINUED_WARN.test(w)).length, 1, `exactly one continuation WARN, got: ${warns.join(" | ")}`);
});

test("--verify-transcript: excluded_requests is a RANGE [before, live] — each edge and one past it, EXECUTED (L29/L37)", () => {
  const { led, projectsDir, continueSession } = midRun();
  continueSession();
  const LIVE = BEFORE + AFTER_AT_EMISSION + APPENDED;
  // ONE materialised table; the loop below is the only assertion site (L29).
  const TABLE = [
    { label: "one below the before-window count", value: BEFORE - 1, red: true },
    { label: "the before-window count (lower edge)", value: BEFORE, red: false },
    { label: "the genuine emission value", value: BEFORE + AFTER_AT_EMISSION, red: false },
    { label: "the live total (upper edge) — THE STATED BOUND: an inflated value up to it passes", value: LIVE, red: false },
    { label: "one above the live total", value: LIVE + 1, red: true },
  ];
  assert.equal(TABLE.length, 5, "non-vacuity: both edges, one past each, and the genuine value");
  for (const row of TABLE) {
    const l = clone(led);
    l.membership.excluded_requests = row.value;
    assert.deepEqual(redsOf(l), [], `${row.label}: internally a count is just a count (the L43 bound) — only verify can judge it`);
    const reds = verify(l, projectsDir).reds;
    assert.equal(
      reds.some((r) => EXCLUDED_RED.test(r)),
      row.red,
      `${row.label} (${row.value}): expected ${row.red ? "RED" : "GREEN"}, got: ${reds.join(" | ")}`
    );
    if (row.red) {
      assert.ok(
        reds.some(
          (r) =>
            r.includes(`re-derived ${BEFORE} before the window + ${AFTER_AT_EMISSION + APPENDED} after its end`) &&
            r.includes(`[${BEFORE}, ${LIVE}]`)
        ),
        `${row.label}: the RED must name both parts and the range, got: ${reds.join(" | ")}`
      );
    }
  }
});

test("--verify-transcript: an IMMEDIATE verify (nothing appended) matches exactly and says nothing about a continuation", () => {
  const { led, projectsDir } = midRun();
  const { reds, warns } = verify(led, projectsDir);
  assert.deepEqual(reds, []);
  assert.ok(!warns.some((w) => CONTINUED_WARN.test(w)), `no continuation WARN when recorded == live, got: ${warns.join(" | ")}`);
  const over = clone(led);
  over.membership.excluded_requests += 1;
  assert.ok(
    verify(over, projectsDir).reds.some((r) => EXCLUDED_RED.test(r)),
    "above the live total is RED, continued or not"
  );
});

test("--verify-transcript: an OPEN window has no end, so nothing is 'after' it and the range collapses to equality", () => {
  const { led, projectsDir, continueSession } = midRun({ stop: false });
  assert.equal(led.membership.status, "open");
  assert.equal(led.membership.excluded_requests, BEFORE, "open: only the 3 before the start are excluded");
  assert.equal(led.requests.length, INSIDE + AFTER_AT_EMISSION);
  assert.deepEqual(verify(led, projectsDir).reds, []);
  for (const v of [BEFORE - 1, BEFORE + 1]) {
    const l = clone(led);
    l.membership.excluded_requests = v;
    assert.ok(
      verify(l, projectsDir).reds.some((r) => EXCLUDED_RED.test(r)),
      `open window: ${v} must RED — the range is [${BEFORE}, ${BEFORE}]`
    );
  }
  // THE DEFERRED RESIDUAL, pinned rather than hidden: an open window absorbs the appended requests as
  // members, so a continued session REDs on the ROWS. Both emitters write run-stop before emitting.
  continueSession();
  const reds = verify(led, projectsDir).reds;
  assert.ok(
    reds.some((r) => /requests\[\] does not match the transcript \(9 recorded, 12 re-derived\)/.test(r)),
    `an open window's rows grow with the session — the named residual, got: ${reds.join(" | ")}`
  );
});

test("--verify-transcript on a continued session through the CLI: exit 0, the WARN printed (the production path, L41)", () => {
  const { root, led, projectsDir, continueSession } = midRun();
  continueSession();
  const p = join(root, "cost.json");
  writeFileSync(p, JSON.stringify(led, null, 2));
  const r = run([p, "--verify-transcript", "--projects-dir", projectsDir]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^WARN — --verify-transcript: the session continued after the run/m);
  assert.match(r.stdout, /^GREEN —/m);
});

// ---------------------------------------------------------------- the emitter is untouched by the split

import { cpSync } from "node:fs";
import { deriveLedger } from "./render-cost-ledger.mjs";

const SUB_SESSION = "00000000-0000-4000-8000-00000000cafe";

/** EVERY ledger shape the emitter produces from the committed fixtures, in ONE table (L29): a bounded window
 *  with a tail, an open one, an unknown one, subagent transcripts with a sidechain tail, and the two
 *  transcript-absence shells. `after` is an INDEPENDENT literal counted from the fixture timestamps (L43). */
function emitterCases() {
  const cases = [];
  const stage = (label, { fixture, session, markers, after }) => {
    const root = mkdtempSync(join(tmpdir(), "check-cl-derive-"));
    const projectsDir = join(root, "projects");
    mkdirSync(join(projectsDir, "p"), { recursive: true });
    if (fixture === "single") copyFileSync(join(FIXTURES, "single-session.jsonl"), join(projectsDir, "p", `${REAL_SESSION}.jsonl`));
    if (fixture === "subagents") cpSync(join(FIXTURES, "with-subagents"), join(projectsDir, "p"), { recursive: true });
    const mdir = join(root, "cost", "feat");
    mkdirSync(mdir, { recursive: true });
    if (markers) writeFileSync(join(mdir, "markers.jsonl"), markers.map((m) => JSON.stringify(m)).join("\n") + "\n");
    cases.push({ label, after, opts: { name: "feat", sessionId: session, projectsDir, markersBase: join(root, "cost") } });
  };
  const m = (seq, kind, ts, session_id) => ({ seq, kind, stage: null, iteration: null, ts, session_id });
  stage("single-session, bounded mid window", {
    fixture: "single",
    session: REAL_SESSION,
    markers: [m(1, "run-start", MID_START, REAL_SESSION), m(2, "run-stop", MID_STOP, REAL_SESSION)],
    after: 4,
  });
  stage("single-session, open mid window", {
    fixture: "single",
    session: REAL_SESSION,
    markers: [m(1, "run-start", MID_START, REAL_SESSION)],
    after: 0,
  });
  stage("single-session, no markers (unknown)", { fixture: "single", session: REAL_SESSION, markers: null, after: 0 });
  stage("subagents, bounded before the two sidechain requests", {
    fixture: "subagents",
    session: SUB_SESSION,
    markers: [m(1, "run-start", "2026-09-21T09:59:00.000Z", SUB_SESSION), m(2, "run-stop", "2026-09-21T10:10:30.000Z", SUB_SESSION)],
    after: 2,
  });
  stage("no session id (unavailable shell)", { fixture: "single", session: null, markers: null, after: 0 });
  stage("no transcript for the session (unavailable shell)", {
    fixture: "none",
    session: REAL_SESSION,
    markers: [m(1, "run-start", MID_START, REAL_SESSION), m(2, "run-stop", MID_STOP, REAL_SESSION)],
    after: 0,
  });
  return cases;
}

test("deriveLedger returns renderLedger's ledger BYTE-FOR-BYTE, plus the after-window count — over every fixture shape (L29)", () => {
  const cases = emitterCases();
  assert.equal(cases.length, 6, "non-vacuity (L34): the table must range over every shape it names");
  assert.ok(
    cases.some((c) => c.after > 0),
    "non-vacuity: at least one case must actually have a tail"
  );
  for (const c of cases) {
    const d = deriveLedger(c.opts);
    const r = renderLedger(c.opts);
    assert.equal(JSON.stringify(d.ledger, null, 2), JSON.stringify(r, null, 2), `${c.label}: the emitted ledger must not move`);
    assert.equal(d.excludedAfterWindow, c.after, `${c.label}: after-window count`);
    assert.ok(
      d.ledger.membership.excluded_requests === null || d.excludedAfterWindow <= d.ledger.membership.excluded_requests,
      `${c.label}: the tail is a PART of the exclusion, never more than it`
    );
    assert.ok(!("excludedAfterWindow" in d.ledger), `${c.label}: the count is never written into the file`);
  }
});
