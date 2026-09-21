// pharn/floor/render-cost-ledger.test.mjs — hermetic tests for the cost-ledger emitter.
//
// TWO COMMITTED FIXTURES, and their provenance is deliberately different:
//   * `fixtures/cost-ledger/single-session.jsonl` — DERIVED from this repo's own `loop-decision-integrity`
//     run, stripped to `usage` + ids. Real numbers, so the ✧ parity test below compares two
//     implementations over bytes a platform actually wrote.
//   * `fixtures/cost-ledger/with-subagents/` — HAND-AUTHORED from the observed record shape. No third-party
//     transcript bytes are committed. It exists because the real `loop-decision-integrity` transcript has
//     ZERO sidechain records, so it structurally cannot exercise the subagent path — the L41/L34 blind
//     spot, closed here rather than named and left.
//
// THE FIXTURE GUARD (the post-grill gate's blocking finding). Every guard in this increment covers
// `cost.json`; none covered a committed `.jsonl` fixture, so "usage + ids only, no message content" was a
// description of how the file was BUILT rather than a check on what it CONTAINS. In this repo an intent is
// not a check. The test below runs `check-cost-ledger.mjs`'s own absolute-path regex over the bytes of
// EVERY committed fixture — discovered by walking the directory, so a fixture added later inherits the
// guard for free (L29: the enumeration is the deliverable, not an assertion written for the member in
// front of the author).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderLedger,
  buildViews,
  sanitizeUsage,
  attribute,
  readMarkers,
  readOutcome,
  readSkillsVersion,
  table,
  TOKEN_CLASSES,
  ABS_PATH_RE,
  TOP_LEVEL_KEYS,
  SCHEMA,
  FEATURE_BASE,
} from "./render-cost-ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "render-cost-ledger.mjs");
const RECORD_CLI = join(HERE, "render-cost-record.mjs");
const FIXTURES = join(HERE, "fixtures", "cost-ledger");
const REAL_SESSION = "51a7441d-0e03-4066-8d1c-be5a2d419121";
const SUB_SESSION = "00000000-0000-4000-8000-00000000cafe";

/** Stage the single-session fixture as `<projectsDir>/<dir>/<session>.jsonl`, the layout the lookup
 *  expects. The fixture file is DATA; the directory shape is built per-test so each is hermetic. */
function stageSingle() {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-"));
  const proj = join(root, "projects", "some-project");
  mkdirSync(proj, { recursive: true });
  copyFileSync(join(FIXTURES, "single-session.jsonl"), join(proj, `${REAL_SESSION}.jsonl`));
  return { root, projectsDir: join(root, "projects") };
}

function stageSubagents() {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-sub-"));
  const proj = join(root, "projects");
  mkdirSync(proj, { recursive: true });
  cpSync(join(FIXTURES, "with-subagents"), join(proj, "wt"), { recursive: true });
  return { root, projectsDir: proj };
}

function writeMarkers(root, name, markers) {
  const dir = join(root, "cost", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "markers.jsonl"), markers.map((m) => JSON.stringify(m)).join("\n") + "\n");
  return join(root, "cost");
}

const marker = (seq, kind, stage, iteration, ts, session_id = null) => ({ seq, kind, stage, iteration, ts, session_id });

const run = (args) => {
  try {
    return { status: 0, stdout: execFileSync("node", [CLI, ...args], { encoding: "utf8" }) };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
};

// ---------------------------------------------------------------- the emitted shape

test("emits the closed top-level key set, exactly — no extra key, no missing key", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "none") });
  assert.deepEqual(Object.keys(led).sort(), [...TOP_LEVEL_KEYS].sort());
  assert.equal(led.schema, SCHEMA);
  assert.equal(led.coverage, "partial");
});

test("one row per DEDUPED requestId — the dedup is load-bearing, not a nicety", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-dup-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  const rec = (id, out) =>
    JSON.stringify({
      type: "assistant",
      requestId: id,
      timestamp: "2026-01-01T00:00:00.000Z",
      sessionId: "s1",
      isSidechain: false,
      message: { model: "m", usage: { input_tokens: 1, output_tokens: out, cache_creation: {}, output_tokens_details: {} } },
    });
  // The same response written three times, as the platform really does it.
  writeFileSync(join(proj, "s1.jsonl"), [rec("r1", 10), rec("r1", 10), rec("r1", 10), rec("r2", 5)].join("\n") + "\n");
  const led = renderLedger({ name: "f", sessionId: "s1", projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  assert.equal(led.requests.length, 2, "three lines for one request must collapse to one row");
  assert.equal(led.totals.tokens.output, 15, "a naive sum would report 35");
});

test("DETERMINISM: the same transcript AND markers bytes render byte-identically", () => {
  // The markers half of the conjunction is load-bearing: markers[] is copied verbatim from a file whose
  // `ts` a DIFFERENT process wrote at wall-clock time, so "same transcript bytes" alone would be a false
  // quantifier (L37). Holding both fixed is what makes the claim true.
  const { root, projectsDir } = stageSingle();
  const markersBase = writeMarkers(root, "feat", [marker(1, "run-start", null, null, "2026-09-21T08:00:00.000Z")]);
  const a = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase });
  const b = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test("no absolute-path string reaches the emitted ledger, over the real fixture", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "none") });
  const hits = [];
  const walk = (v, p) => {
    if (typeof v === "string") {
      if (ABS_PATH_RE.test(v)) hits.push(`${p} = ${v}`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === "object") for (const k of Object.keys(v)) walk(v[k], `${p}.${k}`);
  };
  walk(led, "");
  assert.deepEqual(hits, []);
});

// ---------------------------------------------------------------- D1: arrays are walked

test("D1: usage.iterations[] is WALKED, not dropped — `verbatim` stays true", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "none") });
  assert.ok(led.requests.length > 0, "NON-VACUITY: no rows means the assertion below says nothing");
  const withIter = led.requests.filter((r) => Array.isArray(r.usage?.iterations));
  assert.ok(withIter.length > 0, "the real fixture carries usage.iterations[]");
  assert.equal(typeof withIter[0].usage.iterations[0].input_tokens, "number", "array members are walked to their scalars");
  assert.deepEqual(led.dropped, [], "on real data nothing is out of domain");
});

test("D1 NON-VACUITY: dropped[] fires on a synthetic out-of-domain leaf", () => {
  // dropped[] is [] on every real record, so its non-vacuity rests on this synthetic case — stated in
  // the plan rather than discovered when the field turned out to be dead.
  const dropped = [];
  const out = sanitizeUsage(
    { ok: 1, arr: [1, "tok", { deep: 2 }], bad: () => 1, long: "x".repeat(200), path: "/Users/someone/x/" },
    "usage",
    dropped
  );
  assert.deepEqual(out.arr, [1, "tok", { deep: 2 }], "arrays survive with their scalars");
  assert.ok(dropped.includes("usage.bad"), "a function leaf is dropped and its path listed");
  assert.ok(dropped.includes("usage.long"), "an over-long string is dropped");
  assert.ok(dropped.includes("usage.path"), "an absolute-path string is dropped");
  assert.equal(out.bad, undefined);
});

// ---------------------------------------------------------------- D2: the subagent path

test("D2: sidechain rows from disjoint nested files are included, with BOTH agent key spellings", () => {
  const { root, projectsDir } = stageSubagents();
  const led = renderLedger({ name: "feat", sessionId: SUB_SESSION, projectsDir, markersBase: join(root, "none") });
  assert.equal(led.requests.length, 4, "2 parent + 2 subagent rows");
  const subs = led.requests.filter((r) => r.sidechain);
  assert.equal(subs.length, 2, "NON-VACUITY: the subagent rows must exist for the next assertions to mean anything");
  const agents = subs.map((r) => r.agent_id).sort();
  assert.deepEqual(agents, ["agent-aaa1111111111111", "agent-bbb2222222222222"], "`agentId` AND `attributionAgent` both resolve (L36)");
  assert.ok(
    led.requests.every((r) => typeof r.sidechain === "boolean"),
    "sidechain is always a boolean, never undefined"
  );
});

// ---------------------------------------------------------------- attribution (the VIEW)

test("attribution: the latest marker at-or-before ts, same session; before the first marker is unattributed", () => {
  const ms = [
    marker(1, "run-start", null, null, "2026-09-21T10:05:00.000Z", "s"),
    marker(2, "stage-start", "pharn-build", 1, "2026-09-21T10:09:00.000Z", "s"),
    marker(3, "orchestrator", null, null, "2026-09-21T10:11:30.000Z", "s"),
  ];
  assert.deepEqual(attribute(ms, "2026-09-21T10:00:00.000Z", "s"), { stage: null, iteration: null }, "before every marker");
  assert.deepEqual(attribute(ms, "2026-09-21T10:10:00.000Z", "s"), { stage: "pharn-build", iteration: 1 }, "inside the stage");
  assert.deepEqual(
    attribute(ms, "2026-09-21T10:12:00.000Z", "s"),
    { stage: null, iteration: null },
    "after the orchestrator marker — NOT billed to the stage that just ended"
  );
});

test("attribution ignores markers from a different session", () => {
  const ms = [marker(1, "stage-start", "pharn-build", 1, "2026-09-21T10:00:00.000Z", "other")];
  assert.deepEqual(attribute(ms, "2026-09-21T11:00:00.000Z", "mine"), { stage: null, iteration: null });
  assert.deepEqual(attribute(ms, "2026-09-21T11:00:00.000Z", "other"), { stage: "pharn-build", iteration: 1 });
});

test("D5: the orchestrator marker is what keeps the run's tail off the last stage", () => {
  const { root, projectsDir } = stageSubagents();
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T10:05:00.000Z", SUB_SESSION),
    marker(2, "stage-start", "pharn-build", 1, "2026-09-21T10:09:00.000Z", SUB_SESSION),
    marker(3, "orchestrator", null, null, "2026-09-21T10:11:30.000Z", SUB_SESSION),
  ]);
  const led = renderLedger({ name: "feat", sessionId: SUB_SESSION, projectsDir, markersBase });
  const byId = Object.fromEntries(led.requests.map((r) => [r.request_id, r]));
  assert.equal(byId["req-parent-2"].stage, "pharn-build");
  assert.equal(byId["req-sub-a1"].stage, "pharn-build", "a subagent request inside the stage window is attributed to it");
  assert.equal(byId["req-sub-b1"].stage, null, "after the orchestrator marker the tail is NOT billed to pharn-build");
  assert.equal(led.unattributed.requests, 2);
});

// ---------------------------------------------------------------- views

test("every view is a pure function of requests[] — buildViews reproduces the stored ones", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "none") });
  const v = buildViews(led.requests);
  assert.deepEqual(led.totals, v.totals);
  assert.deepEqual(led.by_model, v.by_model);
  assert.deepEqual(led.by_stage_iteration_model, v.by_stage_iteration_model);
  assert.deepEqual(led.unattributed, v.unattributed);
  assert.ok(led.by_model.length >= 2, "NON-VACUITY: the real fixture carries more than one model");
});

test("totals sum every token class separately — a cached and an uncached token are never blended", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "none") });
  for (const c of TOKEN_CLASSES) {
    const manual = led.requests.reduce((n, r) => n + r.tokens[c], 0);
    assert.equal(led.totals.tokens[c], manual, `${c} must be the row-wise sum`);
  }
});

// ---------------------------------------------------------------- honest degradation

test("no session id -> an honest `unavailable` ledger, never a zero-row `partial`", () => {
  const led = renderLedger({ name: "f", sessionId: null, projectsDir: "/nope", markersBase: "/nope" });
  assert.equal(led.coverage, "unavailable");
  assert.equal(led.requests.length, 0);
  assert.match(led.coverage_note, /no session id/);
});

test("a hit that yields no readable transcript -> `unavailable` (L51: the guard that was deleted as unreachable)", () => {
  // `<dir>/<id>.jsonl` STATS while the recursive walk finds nothing, because the two matchers disagree
  // on a `..`-bearing id. Without the files===0 guard this renders `partial` with zeros — an absence
  // dressed as a cheap run. That defect is exactly what L51 was promoted for; this pins the repair.
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-esc-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(root, "projects", "decoy.jsonl"), "");
  const led = renderLedger({ name: "f", sessionId: "../decoy", projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  assert.equal(led.coverage, "unavailable", "never `partial` with zero rows");
  assert.equal(led.totals.requests, 0);
});

test("a transcript with no usage-bearing records -> `unavailable`, and it SAYS so", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-empty-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, "s1.jsonl"), JSON.stringify({ type: "user", message: {} }) + "\n");
  const led = renderLedger({ name: "f", sessionId: "s1", projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  assert.equal(led.coverage, "unavailable");
  assert.equal(led.requests.length, 0);
});

test("a synthetic model is skipped — it is not a real API call", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-syn-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  const line = (model, id) =>
    JSON.stringify({
      type: "assistant",
      requestId: id,
      timestamp: "2026-01-01T00:00:00.000Z",
      sessionId: "s1",
      message: { model, usage: { output_tokens: 7 } },
    });
  writeFileSync(join(proj, "s1.jsonl"), [line("<synthetic>", "a"), line("claude-opus-5", "b")].join("\n") + "\n");
  const led = renderLedger({ name: "f", sessionId: "s1", projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  assert.equal(led.requests.length, 1);
  assert.equal(led.requests[0].model, "claude-opus-5");
});

// ---------------------------------------------------------------- recovery from markers alone

test("RECOVERY: after an aborted run the record rebuilds from the markers file alone", () => {
  // No transcript reachable, markers on disk. The ledger must still carry the boundaries — that is the
  // half of the data that is irrecoverable later — and must say `unavailable` rather than imply it
  // measured something.
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-recov-"));
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T10:00:00.000Z", "s"),
    marker(2, "stage-start", "pharn-build", 1, "2026-09-21T10:01:00.000Z", "s"),
    marker(3, "run-stop", null, null, "2026-09-21T10:30:00.000Z", "s"),
  ]);
  const led = renderLedger({ name: "feat", sessionId: "gone", projectsDir: join(root, "absent"), markersBase });
  assert.equal(led.coverage, "unavailable");
  assert.equal(led.markers.length, 3, "the boundaries survive the aborted run");
  assert.equal(led.attribution.markers, 3);
  assert.deepEqual(
    led.markers.map((m) => m.kind),
    ["run-start", "stage-start", "run-stop"]
  );
});

test("readMarkers tolerates a torn line and sorts by seq", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-torn-"));
  const dir = join(root, "cost", "feat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "markers.jsonl"),
    [
      JSON.stringify(marker(2, "run-stop", null, null, "2026-01-01T00:02:00.000Z")),
      JSON.stringify(marker(1, "run-start", null, null, "2026-01-01T00:01:00.000Z")),
      '{"seq":3,"kind":"run',
    ].join("\n") + "\n"
  );
  const got = readMarkers(join(dir, "markers.jsonl"));
  assert.equal(got.length, 2, "the torn line is skipped, not repaired");
  assert.deepEqual(
    got.map((m) => m.seq),
    [1, 2],
    "sorted by seq"
  );
});

test("readMarkers on a missing file returns [] — the recovery case is a real state", () => {
  assert.deepEqual(readMarkers(join(tmpdir(), "definitely-absent-xyz", "markers.jsonl")), []);
});

// ---------------------------------------------------------------- outcome + skills version

test("outcome is read from the LOOP.md ENVELOPE only, never grepped from the body (L6)", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-out-"));
  const dir = join(root, "pharn", "features", "feat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "LOOP.md"),
    [
      "---",
      "decision: STOP_GREEN",
      "iterations: 2",
      "cap: 3",
      "---",
      "",
      "# LOOP",
      "",
      "decision: STOP_CAP is prose ABOUT a record, not a declaration of one.",
      "",
    ].join("\n")
  );
  const o = readOutcome(join(dir, "LOOP.md"));
  assert.deepEqual(o, { decision: "STOP_GREEN", iterations: 2, source: "LOOP.md" });
});

test("a blocked stop carries its `blocked` key through verbatim", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-blk-"));
  const dir = join(root, "f");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "LOOP.md"),
    ["---", "decision: INCONCLUSIVE", "iterations: 1", "blocked: no-gates", "---", "", "# LOOP", ""].join("\n")
  );
  assert.equal(readOutcome(join(dir, "LOOP.md")).blocked, "no-gates");
});

test("no LOOP.md -> outcome is null, not invented", () => {
  assert.equal(readOutcome(join(tmpdir(), "absent-xyz", "LOOP.md")), null);
});

test("skills_version: pharn.config.json wins, then SKILLS_VERSION, then an honest `unknown`", () => {
  const a = mkdtempSync(join(tmpdir(), "sv-a-"));
  writeFileSync(join(a, "pharn.config.json"), JSON.stringify({ skillsVersion: "9.9.9" }));
  writeFileSync(join(a, "SKILLS_VERSION"), "1.1.1\n");
  assert.deepEqual(readSkillsVersion(a), { version: "9.9.9", source: "pharn.config.json" }, "an install's config wins");

  const b = mkdtempSync(join(tmpdir(), "sv-b-"));
  writeFileSync(join(b, "SKILLS_VERSION"), "6.4.3\n");
  assert.deepEqual(readSkillsVersion(b), { version: "6.4.3", source: "SKILLS_VERSION" }, "pharn-oss itself");

  const c = mkdtempSync(join(tmpdir(), "sv-c-"));
  assert.deepEqual(readSkillsVersion(c), { version: null, source: "unknown" }, "neither: null, never a fabricated version");

  const d = mkdtempSync(join(tmpdir(), "sv-d-"));
  writeFileSync(join(d, "pharn.config.json"), "{ not json");
  writeFileSync(join(d, "SKILLS_VERSION"), "2.2.2\n");
  assert.deepEqual(
    readSkillsVersion(d),
    { version: "2.2.2", source: "SKILLS_VERSION" },
    "an unreadable config falls through rather than throwing"
  );
});

// ---------------------------------------------------------------- ✧ parity

test("✧ PARITY: ledger totals equal render-cost-record totals over the SAME bytes, mapping asserted (D4)", () => {
  // The two files name the classes differently on purpose: the ledger's names are 1:1 with the
  // dimensions a price list charges for. Asserting the MAPPING binds the values to their referent
  // rather than letting two spellings drift silently (L43).
  const { projectsDir } = stageSingle();
  const record = JSON.parse(
    execFileSync("node", [RECORD_CLI, "--session", REAL_SESSION, "--projects-dir", projectsDir], { encoding: "utf8" })
  );
  const ledger = JSON.parse(
    execFileSync(
      "node",
      [CLI, "x", "--stdout", "--session", REAL_SESSION, "--projects-dir", projectsDir, "--markers-base", join(tmpdir(), "absent-xyz")],
      { encoding: "utf8" }
    )
  );

  const MAPPING = {
    input: "input_uncached",
    cache_write_5m: "cache_write_5m",
    cache_write_1h: "cache_write_1h",
    cache_read: "cache_read",
    output: "output",
    output_thinking: "thinking",
  };
  assert.deepEqual(
    Object.keys(MAPPING).sort(),
    [...TOKEN_CLASSES].sort(),
    "the mapping must range over EVERY class, not the ones in front of the author (L29)"
  );
  assert.equal(ledger.totals.requests, record.requests, "both dedup on requestId");
  assert.ok(ledger.totals.requests > 0, "NON-VACUITY: a zero-request parity is vacuously true");
  for (const [ours, theirs] of Object.entries(MAPPING)) {
    assert.equal(ledger.totals.tokens[ours], record.tokens[theirs], `${ours} must equal render-cost-record's ${theirs}`);
  }
});

// ---------------------------------------------------------------- the committed-fixture guard

test("GUARD: no committed fixture contains an absolute-path string (the gate's blocking finding)", () => {
  // Walks the fixture tree, so a fixture added later is covered without editing this test (L29).
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(FIXTURES);
  assert.ok(files.length >= 4, `NON-VACUITY: expected the committed fixtures, found ${files.length}`);
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const [i, line] of text.split("\n").entries()) {
      if (!line) continue;
      assert.ok(!ABS_PATH_RE.test(line), `${f}:${i + 1} contains an absolute-path-shaped string`);
    }
  }
});

test("GUARD NON-VACUITY: the same regex DOES fire on a path-shaped line (mutation control)", () => {
  // Without this, the guard above would pass just as happily if ABS_PATH_RE never matched anything.
  assert.ok(ABS_PATH_RE.test('{"cwd":"/Users/someone/Projects/x"}'), "a real home path must match");
  assert.ok(!ABS_PATH_RE.test('{"schema":"pharn-cost-ledger/1"}'), "the schema token must NOT match");
});

test("no committed fixture carries message content or a cwd/gitBranch field", () => {
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".jsonl")) files.push(p);
    }
  };
  walk(FIXTURES);
  assert.ok(files.length >= 3, "NON-VACUITY: the fixture set must be non-empty");
  for (const f of files) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (!line) continue;
      const r = JSON.parse(line);
      assert.equal(r.cwd, undefined, `${f}: cwd must never be committed`);
      assert.equal(r.gitBranch, undefined, `${f}: gitBranch must never be committed`);
      assert.equal(r.message?.content, undefined, `${f}: message content must never be committed`);
    }
  }
});

// ---------------------------------------------------------------- the CLI

test("the CLI WRITES cost.json itself (D3) and prints the per-stage table", () => {
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-out-"));
  const r = run([
    "feat",
    "--repo",
    out,
    "--base",
    "pharn/features",
    "--session",
    REAL_SESSION,
    "--projects-dir",
    projectsDir,
    "--markers-base",
    join(tmpdir(), "absent-xyz"),
  ]);
  assert.equal(r.status, 0, r.stderr);
  const p = join(out, "pharn", "features", "feat", "cost.json");
  assert.ok(existsSync(p), "the emitter writes the file — a model never retypes hundreds of numbers");
  const led = JSON.parse(readFileSync(p, "utf8"));
  assert.equal(led.requests.length, 12);
  assert.match(r.stdout, /cost ledger — feat/);
  assert.match(r.stdout, /TOKENS ONLY/, "the screen copy carries the pricing bound too");
});

test("--stdout prints without writing — used by the parity test and by a dry run", () => {
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-nowrite-"));
  const r = run([
    "feat",
    "--repo",
    out,
    "--stdout",
    "--session",
    REAL_SESSION,
    "--projects-dir",
    projectsDir,
    "--markers-base",
    join(tmpdir(), "absent-xyz"),
  ]);
  assert.equal(r.status, 0);
  assert.ok(!existsSync(join(out, "pharn", "features", "feat", "cost.json")));
  assert.equal(JSON.parse(r.stdout).schema, SCHEMA);
});

test("L41 NO-ARGUMENT CONTROL: with no --base the CLI WRITES to the single FEATURE_BASE default", () => {
  // The defect this pins: `FEATURE_BASE` was two literals, and the CLI write path's copy was reached by
  // NO test, because every other CLI case passes `--base` (or `--stdout`, which does not write). That is
  // `render-ship-briefing.mjs:438` exactly — the stale copy on the production path, invisible to a green
  // suite. This test is the one that goes through the no-flag branch and lands on disk.
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-nobase-"));
  const r = run([
    "feat",
    "--repo",
    out,
    "--session",
    REAL_SESSION,
    "--projects-dir",
    projectsDir,
    "--markers-base",
    join(tmpdir(), "absent-xyz"),
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(out, FEATURE_BASE, "feat", "cost.json")), `expected the ledger under the single default ${FEATURE_BASE}`);
});

test("FEATURE_BASE is referenced, never re-spelled — one literal in the module", () => {
  // A closure assertion, not a presence one (L36): count the OCCURRENCES of the literal in the source.
  // Exactly one may exist — the const itself. A second would be a re-introduced duplicate default.
  const src = readFileSync(CLI, "utf8");
  const hits = src.match(/"pharn\/features"/g) ?? [];
  assert.equal(hits.length, 1, `the default must appear exactly once (the const); found ${hits.length}`);
  assert.match(src, /export const FEATURE_BASE = "pharn\/features";/);
});

test("identity fields are BOUNDED at emission — an over-long or control-char value is dropped, not copied", () => {
  // The blocking review finding: `model` / `attribution_skill` / `agent_id` were copied with a bare
  // typeof test into a COMMITTED artifact, while the contract claimed the leaf rule bounded them.
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-ident-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  const rec = (id, extra) =>
    JSON.stringify({
      type: "assistant",
      requestId: id,
      timestamp: "2026-01-01T00:00:00.000Z",
      sessionId: "s1",
      isSidechain: false,
      ...extra,
      message: { model: extra.__model ?? "claude-opus-5", usage: { output_tokens: 1 } },
    });
  writeFileSync(
    join(proj, "s1.jsonl"),
    [
      rec("r1", { attributionSkill: "x".repeat(5000) }),
      rec("r2", { attributionSkill: "ok\nRED — forged verdict line" }),
      rec("r3", { agentId: "a\u0007b" }),
      rec("r4", { __model: "m".repeat(5000) }),
    ].join("\n") + "\n"
  );
  const led = renderLedger({ name: "f", sessionId: "s1", projectsDir: join(root, "projects"), markersBase: join(root, "none") });
  assert.equal(led.requests.length, 4);
  const by = Object.fromEntries(led.requests.map((r) => [r.request_id, r]));
  assert.equal(by.r1.attribution_skill, null, "an over-long skill is dropped, never truncated into a value that was never there");
  assert.equal(by.r2.attribution_skill, null, "a newline-bearing value cannot forge a line");
  assert.equal(by.r3.agent_id, null, "a control char is refused");
  assert.equal(by.r4.model, "unknown", "model falls back to the honest sentinel, since the field is required");
  for (const p of ["requests[0].attribution_skill", "requests[1].attribution_skill", "requests[2].agent_id", "requests[3].model"]) {
    assert.ok(led.dropped.includes(p), `every refusal is recorded: expected ${p} in dropped[], got ${JSON.stringify(led.dropped)}`);
  }
});

test("MUTATION CONTROL: ordinary identity values survive untouched", () => {
  // Without this, the test above would pass just as happily against a sanitizer that nulled everything.
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "none") });
  assert.ok(
    led.requests.some((r) => r.attribution_skill === "pharn-loop"),
    "the real fixture's tagged rows keep their skill"
  );
  assert.ok(
    led.requests.every((r) => /^claude-/.test(r.model)),
    "every real model id survives"
  );
  assert.deepEqual(led.dropped, [], "nothing in the real fixture is refused");
});

test("the CLI refuses bad usage with exit 2 and writes nothing", () => {
  assert.equal(run([]).status, 2, "no name");
  assert.equal(run(["a", "--frobnicate"]).status, 2, "unknown flag");
  assert.equal(run(["a", "b"]).status, 2, "two positionals");
});

test("the table renders an honest line when nothing is attributed", () => {
  const led = renderLedger({ name: "f", sessionId: null, projectsDir: "/nope", markersBase: "/nope" });
  assert.match(table(led), /no attributed requests/);
});

test("pricing_note states tokens-only and carries the output_thinking subset warning", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "none") });
  assert.match(led.pricing_note, /TOKENS ONLY/);
  assert.match(led.pricing_note, /SUBSET of `output`/);
  assert.match(led.pricing_note, /LIST-PRICE EQUIVALENT/);
  assert.ok(!/\$/.test(JSON.stringify(led)), "no price symbol anywhere in the emitted file");
});
