// pharn/floor/render-cost-ledger.test.mjs — hermetic tests for the cost-ledger emitter.
//
// THE COMMITTED FIXTURES THIS FILE STAGES, and their provenance is deliberately different:
//   * `fixtures/cost-ledger/single-session.jsonl` — DERIVED from this repo's own `loop-decision-integrity`
//     run, stripped to `usage` + ids. Real numbers, so the ✧ parity test below compares two
//     implementations over bytes a platform actually wrote.
//   * `fixtures/cost-ledger/with-subagents/` — HAND-AUTHORED from the observed record shape. No third-party
//     transcript bytes are committed. It exists because the real `loop-decision-integrity` transcript has
//     ZERO sidechain records, so it structurally cannot exercise the subagent path — the L41/L34 blind
//     spot, closed here rather than named and left.
//   * `fixtures/cost-ledger/usage-snapshots/` — HAND-AUTHORED from three measured records whose transcript
//     lines DISAGREE (6.22.1); described where the reader's own tests live, transcript-core.test.mjs.
// (`session-continued.jsonl`, the fourth, is check-cost-ledger.test.mjs's.)
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
  DEFAULT_COMMAND,
  UNKNOWN_BASE_SHA,
  OUTCOME_SOURCES,
  OUTCOME_KEYS,
  LOOP_RECORD_SOURCE,
} from "./render-cost-ledger.mjs";
import { OUTCOME_SOURCE as SHIP_OUTCOME_SOURCE } from "./ship-outcome-core.mjs";
import { checkLedger, findAbsolutePaths } from "./check-cost-ledger.mjs";
import { findTranscriptDirs, transcriptFiles } from "./transcript-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "render-cost-ledger.mjs");
const RECORD_CLI = join(HERE, "render-cost-record.mjs");
const CHECK_CLI = join(HERE, "check-cost-ledger.mjs");
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

/** `usage-snapshots/`: requests whose transcript lines DISAGREE (6.22.1). Described where the rule's own
 *  tests live, transcript-core.test.mjs; the ★ COMPLETED USAGE tests below pin the ledger's reading. */
const SNAP_SESSION = "00000000-0000-4000-8000-00000000beef";

function stageSnapshots() {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-snap-"));
  const proj = join(root, "projects");
  mkdirSync(proj, { recursive: true });
  cpSync(join(FIXTURES, "usage-snapshots"), join(proj, "wt"), { recursive: true });
  return { root, projectsDir: proj };
}

function writeMarkers(root, name, markers) {
  const dir = join(root, "cost", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "markers.jsonl"), markers.map((m) => JSON.stringify(m)).join("\n") + "\n");
  return join(root, "cost");
}

const marker = (seq, kind, stage, iteration, ts, session_id = null) => ({ seq, kind, stage, iteration, ts, session_id });

/** A run window that CONTAINS every fixture record: one run-start long before them, bound to no session
 *  (the null wildcard). Tests of the pre-/2 behaviour — dedup, subagents, identity bounds, views — are
 *  about rows INSIDE a run, and since `pharn-cost-ledger/2` a transcript with no run boundary yields NO
 *  rows (membership `unknown`), so they now open a run explicitly instead of relying on the old
 *  whole-session population. */
const OPEN_TS = "2020-01-01T00:00:00.000Z";
function openRun(root, name) {
  return writeMarkers(root, name, [marker(1, "run-start", null, null, OPEN_TS)]);
}

const runScript = (script, args, env) => {
  try {
    return { status: 0, stdout: execFileSync("node", [script, ...args], { encoding: "utf8", env: { ...process.env, ...env } }) };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
};
const run = (args, env = {}) => runScript(CLI, args, env);
const runChecker = (args) => runScript(CHECK_CLI, args, {});

// ---------------------------------------------------------------- the emitted shape

test("emits the closed top-level key set, exactly — no extra key, no missing key", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: openRun(root, "feat") });
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
  // One request written as three identical lines. The platform writes a request as several lines, and they
  // need NOT be identical — the ★ COMPLETED USAGE tests below cover lines that disagree.
  writeFileSync(join(proj, "s1.jsonl"), [rec("r1", 10), rec("r1", 10), rec("r1", 10), rec("r2", 5)].join("\n") + "\n");
  const led = renderLedger({ name: "f", sessionId: "s1", projectsDir: join(root, "projects"), markersBase: openRun(root, "f") });
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
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: openRun(root, "feat") });
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
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: openRun(root, "feat") });
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

test("D2: sidechain rows from nested subagent files are included, with BOTH agent key spellings", () => {
  const { root, projectsDir } = stageSubagents();
  const led = renderLedger({ name: "feat", sessionId: SUB_SESSION, projectsDir, markersBase: openRun(root, "feat") });
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
  // Through /1 this was 2: req-parent-1 (10:00) preceded run-start (10:05) and was folded into the run as
  // `unattributed`. Since /2 it is OUTSIDE the run window — excluded, not unattributed.
  assert.equal(led.unattributed.requests, 1);
  assert.equal(byId["req-parent-1"], undefined, "a pre-run request is not a run row");
  assert.equal(led.membership.excluded_requests, 1);
});

// ---------------------------------------------------------------- views

test("every view is a pure function of requests[] — buildViews reproduces the stored ones", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: openRun(root, "feat") });
  const v = buildViews(led.requests);
  assert.deepEqual(led.totals, v.totals);
  assert.deepEqual(led.by_model, v.by_model);
  assert.deepEqual(led.by_stage_iteration_model, v.by_stage_iteration_model);
  assert.deepEqual(led.unattributed, v.unattributed);
  assert.ok(led.by_model.length >= 2, "NON-VACUITY: the real fixture carries more than one model");
});

test("totals sum every token class separately — a cached and an uncached token are never blended", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: openRun(root, "feat") });
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
  const led = renderLedger({ name: "f", sessionId: "../decoy", projectsDir: join(root, "projects"), markersBase: openRun(root, "f") });
  assert.equal(led.coverage, "unavailable", "never `partial` with zero rows");
  assert.equal(led.totals.requests, 0);
});

test("a transcript with no usage-bearing records -> `unavailable`, and it SAYS so", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-empty-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, "s1.jsonl"), JSON.stringify({ type: "user", message: {} }) + "\n");
  const led = renderLedger({ name: "f", sessionId: "s1", projectsDir: join(root, "projects"), markersBase: openRun(root, "f") });
  assert.equal(led.coverage, "unavailable");
  assert.equal(led.requests.length, 0);
});

// ---------------------------------------------------------------- path-free `unavailable` notes
//
// The two notes that used to end `under ${projectsDir}` / `under ${projectDir}` wrote a LOCAL path into
// cost.json, which check-cost-ledger.mjs rule 3 then REDs — so an ordinary transcript miss produced an
// artifact the shipped checker refuses. The fix is at the source; the checker is unchanged, and the
// negative control below proves its regex still fires on the same field.
//
// The remedy is quantified over EVERY `unavailable` branch, so the branches are ENUMERATED here and each
// rule iterates the list (L29) — not a test for the two branches that happened to carry the defect.
// Each entry asserts WHICH branch it reached through the lookup itself (`findTranscriptDirs` hit count,
// `transcriptFiles` selection), never by matching note wording, which is not a documented contract.

const SYN_SESSION = "00000000-0000-4000-8000-00000000dead";

/** Every `unavailable` branch of renderLedger, each built over an ABSOLUTE temp projects dir. */
function unavailableBranches() {
  const mk = (tag) => {
    const root = mkdtempSync(join(tmpdir(), `cost-ledger-unav-${tag}-`));
    const projectsDir = join(root, "projects");
    mkdirSync(projectsDir, { recursive: true });
    return { root, projectsDir, markersBase: join(root, "none") };
  };
  const selected = (projectsDir, sessionId) => {
    const hits = findTranscriptDirs(projectsDir, sessionId);
    return { hits: hits.length, files: hits.length === 1 ? transcriptFiles(hits[0]).length : null };
  };
  return [
    {
      branch: "no-session",
      build() {
        const t = mk("nosess");
        return {
          ...t,
          sessionId: null,
          led: renderLedger({ name: "f", sessionId: null, projectsDir: t.projectsDir, markersBase: t.markersBase }),
        };
      },
      reached: (b) => assert.equal(b.sessionId, null),
    },
    {
      branch: "no-dir",
      build() {
        const t = mk("nodir");
        mkdirSync(join(t.projectsDir, "unrelated-project"));
        const led = renderLedger({ name: "f", sessionId: SYN_SESSION, projectsDir: t.projectsDir, markersBase: t.markersBase });
        return { ...t, sessionId: SYN_SESSION, led };
      },
      reached: (b) => assert.equal(selected(b.projectsDir, b.sessionId).hits, 0),
    },
    {
      // A separator-bearing id stats the SAME file from every sibling directory — the live route to the
      // multi-hit refusal on a sane tree (render-cost-ledger.mjs keeps that branch deliberately, L51).
      branch: "multi-dir",
      build() {
        const t = mk("multi");
        mkdirSync(join(t.projectsDir, "p"));
        mkdirSync(join(t.projectsDir, "q"));
        writeFileSync(join(t.projectsDir, "p", "s.jsonl"), "");
        const led = renderLedger({ name: "f", sessionId: "../p/s", projectsDir: t.projectsDir, markersBase: t.markersBase });
        return { ...t, sessionId: "../p/s", led };
      },
      reached: (b) => assert.equal(selected(b.projectsDir, b.sessionId).hits, 2),
    },
    {
      // The existing L51 boundary staging: `<dir>/../decoy.jsonl` stats, the recursive walk under `<dir>`
      // selects nothing. No race, no production seam — the two matchers simply disagree on `..`.
      branch: "empty-selection",
      build() {
        const t = mk("empty");
        mkdirSync(join(t.projectsDir, "p"));
        writeFileSync(join(t.projectsDir, "decoy.jsonl"), "");
        const led = renderLedger({ name: "f", sessionId: "../decoy", projectsDir: t.projectsDir, markersBase: t.markersBase });
        return { ...t, sessionId: "../decoy", led };
      },
      reached: (b) => {
        const s = selected(b.projectsDir, b.sessionId);
        assert.equal(s.hits, 1, "the stat found exactly one directory");
        assert.equal(s.files, 0, "…and the walk under it selected nothing");
      },
    },
    {
      branch: "no-usage",
      build() {
        const t = mk("nousage");
        mkdirSync(join(t.projectsDir, "p"));
        writeFileSync(join(t.projectsDir, "p", `${SYN_SESSION}.jsonl`), JSON.stringify({ type: "user", message: {} }) + "\n");
        const led = renderLedger({ name: "f", sessionId: SYN_SESSION, projectsDir: t.projectsDir, markersBase: t.markersBase });
        return { ...t, sessionId: SYN_SESSION, led };
      },
      reached: (b) => assert.equal(selected(b.projectsDir, b.sessionId).files, 1),
    },
  ];
}

function assertPathFreeUnavailable(led, localPaths, label) {
  assert.equal(led.coverage, "unavailable", label);
  assert.deepEqual(led.requests, [], label);
  assert.equal(led.totals.requests, 0, label);
  for (const c of TOKEN_CLASSES) assert.equal(led.totals.tokens[c], 0, `${label}: totals.tokens.${c}`);
  const json = JSON.stringify(led);
  for (const p of localPaths) assert.ok(!json.includes(p), `${label}: serialized ledger contains the local path ${p}`);
  const hits = [];
  findAbsolutePaths(led, "", hits);
  assert.deepEqual(hits, [], `${label}: absolute-path-shaped string(s) in the ledger`);
  const { reds } = checkLedger(led);
  assert.deepEqual(reds, [], `${label}: check-cost-ledger REDs`);
}

test("A: a missing transcript under an ABSOLUTE projects dir -> a path-free, checker-GREEN `unavailable` ledger", () => {
  const b = unavailableBranches().find((x) => x.branch === "no-dir");
  const built = b.build();
  b.reached(built);
  assertPathFreeUnavailable(built.led, [built.projectsDir, built.root], "no-dir");
});

test("B: a located directory whose selection is EMPTY -> the same path-free, checker-GREEN result", () => {
  const b = unavailableBranches().find((x) => x.branch === "empty-selection");
  const built = b.build();
  b.reached(built);
  assertPathFreeUnavailable(built.led, [built.projectsDir, join(built.projectsDir, "p"), built.root], "empty-selection");
});

test("L29 ENUMERATION: EVERY `unavailable` branch is path-free and checker-GREEN — the set, not the two defective members", () => {
  const branches = unavailableBranches();
  assert.deepEqual(
    branches.map((b) => b.branch),
    ["no-session", "no-dir", "multi-dir", "empty-selection", "no-usage"]
  );
  for (const b of branches) {
    const built = b.build();
    b.reached(built);
    assertPathFreeUnavailable(built.led, [built.projectsDir, built.root], b.branch);
  }
});

test("the no-dir and empty-selection notes stay DISTINGUISHABLE — absence is not reported as an unusable directory", () => {
  const by = Object.fromEntries(unavailableBranches().map((b) => [b.branch, b.build().led.coverage_note]));
  const notes = Object.values(by);
  assert.equal(new Set(notes).size, notes.length, "every unavailable branch carries its own note");
});

test("D NEGATIVE CONTROL: the checker still REDs an absolute path placed in coverage_note", () => {
  const b = unavailableBranches().find((x) => x.branch === "no-dir");
  const led = { ...b.build().led, coverage_note: "no transcript found under /Users/example/.claude/projects" };
  const { reds } = checkLedger(led);
  assert.equal(reds.length, 1, reds.join("\n"));
  assert.match(reds[0], /absolute-path/);
  assert.match(reds[0], /coverage_note/);
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
  const led = renderLedger({ name: "f", sessionId: "s1", projectsDir: join(root, "projects"), markersBase: openRun(root, "f") });
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
  //
  // THE BOUND (L43), and it bit: agreement is all this proves. Until 6.22.1 both renderers kept each
  // request's FIRST transcript line and this test stayed GREEN while both under-counted output. It now
  // also ranges over `usage-snapshots`, whose lines disagree, and the ★ COMPLETED USAGE tests are what
  // bind the counted value to the transcript shapes actually seen.
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
  for (const [label, stage, session] of [
    ["single-session", stageSingle, REAL_SESSION],
    ["usage-snapshots", stageSnapshots, SNAP_SESSION],
  ]) {
    const { root, projectsDir } = stage();
    // The record is SESSION-scoped (pharn-cost-record/1 is unchanged, D5); the ledger is RUN-scoped. They
    // agree exactly when the run window contains the whole session, which is what this window is.
    const mbAll = openRun(root, "x");
    const record = JSON.parse(
      execFileSync("node", [RECORD_CLI, "--session", session, "--projects-dir", projectsDir], { encoding: "utf8" })
    );
    const ledger = JSON.parse(
      execFileSync("node", [CLI, "x", "--stdout", "--session", session, "--projects-dir", projectsDir, "--markers-base", mbAll], {
        encoding: "utf8",
      })
    );
    assert.equal(ledger.totals.requests, record.requests, `${label}: both count one entry per request`);
    assert.ok(ledger.totals.requests > 0, `${label}: NON-VACUITY: a zero-request parity is vacuously true`);
    for (const [ours, theirs] of Object.entries(MAPPING)) {
      assert.equal(ledger.totals.tokens[ours], record.tokens[theirs], `${label}: ${ours} must equal render-cost-record's ${theirs}`);
    }
  }
});

// ---------------------------------------------------------------- ★ completed usage (6.22.1)
//
// `fixtures/cost-ledger/usage-snapshots/` (described in transcript-core.test.mjs, where the rule's own
// tests live) holds one request written as 8, 8, 163, one re-appended later with zeroed counts, and one
// whose early line a forked subagent's transcript copies. These tests pin what the LEDGER does with them:
// the ledger is a consumer of the one owner, and L52's set is every consumer, not the owner alone.

test("★ COMPLETED USAGE: the ledger row for the 8, 8, 163 request counts 163, and keeps its FIRST line's ts", () => {
  const { root, projectsDir } = stageSnapshots();
  const led = renderLedger({ name: "f", sessionId: SNAP_SESSION, projectsDir, markersBase: openRun(root, "f") });
  const row = (id) => led.requests.find((r) => r.request_id === id);
  assert.equal(led.requests.length, 5, "the fork's copy of C is not a sixth row");
  assert.equal(row("req_fx_snapshots").tokens.output, 163, "not 8");
  assert.equal(row("req_fx_snapshots").tokens.output_thinking, 22);
  assert.equal(row("req_fx_snapshots").usage.output_tokens, 163, "the verbatim usage is the completed line's object");
  assert.equal(row("req_fx_snapshots").ts, "2026-09-26T10:00:00.901Z", "the request's FIRST line, not its last (…:01.691)");
  assert.equal(row("req_fx_reappended").tokens.output, 522, "not 0");
  assert.equal(row("req_fx_reappended").tokens.input, 2);
  assert.equal(row("req_fx_forked").tokens.output, 16886, "not 9");
  assert.equal(row("req_fx_forked").sidechain, false, "the parent's identity: its line is walked first");
  assert.equal(row("req_fx_forked").agent_id, null);
  assert.equal(row("req_fx_subagent_own").sidechain, true);
  assert.equal(row("req_fx_subagent_own").agent_id, "fff3333333333333");
  assert.equal(led.totals.tokens.output, 163 + 522 + 100 + 16886 + 50);
  assert.deepEqual(checkLedger(led).reds, [], "the emitted ledger is internally consistent");
});

test("★ MEMBERSHIP reads the FIRST line: a window closing between A's first and last line keeps A, at 163", () => {
  // Discriminates identity-from-the-first-line: a reader that keyed the request on its selected (largest)
  // line would read …:01.691, after the window's end, and exclude it.
  const { root, projectsDir } = stageSnapshots();
  const mb = writeMarkers(root, "f", [
    marker(1, "run-start", null, null, "2026-09-26T09:59:00.000Z"),
    marker(2, "run-stop", null, null, "2026-09-26T10:00:01.000Z"),
  ]);
  const led = renderLedger({ name: "f", sessionId: SNAP_SESSION, projectsDir, markersBase: mb });
  assert.equal(led.membership.status, "bounded");
  assert.deepEqual(
    led.requests.map((r) => r.request_id),
    ["req_fx_snapshots"],
    "A's first line (…:00.901) is inside the window; its last (…:01.691) is not"
  );
  assert.equal(led.requests[0].tokens.output, 163, "a member is still counted at its completed usage");
  assert.equal(led.membership.excluded_requests, 4);
  assert.deepEqual(checkLedger(led).reds, []);
});

test("★ MUTANT CONTROL: the ledger's numbers FOLLOW the owner — a first-line owner makes the ledger read 8", () => {
  // The whole product floor is copied, then ONLY the owner's rule is mutated. If the ledger still carried
  // a second copy of the reading loop, the mutated copy would read 163 like the control (L35, L60).
  const source = readFileSync(join(HERE, "transcript-core.mjs"), "utf8");
  const ANCHOR = "else if (outputRank(u) > outputRank(seen.usage)) seen.usage = u;";
  assert.equal(source.split(ANCHOR).length, 2, "the rule's anchor must occur exactly once");
  const mutant = source.replace(ANCHOR, "// MUTANT: the first line's usage is kept");
  assert.notEqual(mutant, source);
  const floorWith = (coreSource) => {
    const dir = mkdtempSync(join(tmpdir(), "cost-ledger-floor-"));
    for (const f of readdirSync(HERE)) {
      if (f.endsWith(".mjs") && !f.endsWith(".test.mjs")) copyFileSync(join(HERE, f), join(dir, f));
    }
    writeFileSync(join(dir, "transcript-core.mjs"), coreSource);
    return dir;
  };
  const rowA = (floor) => {
    const { root, projectsDir } = stageSnapshots();
    const out = execFileSync(
      "node",
      [
        join(floor, "render-cost-ledger.mjs"),
        "f",
        "--stdout",
        "--session",
        SNAP_SESSION,
        "--projects-dir",
        projectsDir,
        "--markers-base",
        openRun(root, "f"),
        "--repo",
        root,
      ],
      { encoding: "utf8" }
    );
    return JSON.parse(out).requests.find((r) => r.request_id === "req_fx_snapshots").tokens.output;
  };
  assert.equal(rowA(floorWith(source)), 163, "CONTROL: the unmutated copy runs and reads the completed line");
  assert.equal(rowA(floorWith(mutant)), 8, "the mutated owner: nothing in the ledger compensates");
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
  const { root, projectsDir } = stageSingle();
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
    openRun(root, "feat"),
  ]);
  assert.equal(r.status, 0, r.stderr);
  const p = join(out, "pharn", "features", "feat", "cost.json");
  assert.ok(existsSync(p), "the emitter writes the file — a model never retypes hundreds of numbers");
  const led = JSON.parse(readFileSync(p, "utf8"));
  assert.equal(led.requests.length, 12);
  assert.match(r.stdout, /cost ledger — feat/);
  assert.match(r.stdout, /TOKENS ONLY/, "the screen copy carries the pricing bound too");
});

test("C: the CLI WRITE path on a missing transcript -> exit 0, a path-free cost.json the checker CLI accepts", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-cli-unav-"));
  const projectsDir = join(root, "projects");
  mkdirSync(projectsDir, { recursive: true });
  const out = join(root, "repo");
  const args = [
    "feat",
    "--repo",
    out,
    "--base",
    "pharn/features",
    "--session",
    SYN_SESSION,
    "--projects-dir",
    projectsDir,
    "--markers-base",
    join(root, "none"),
  ];
  const r = run(args);
  assert.equal(r.status, 0, r.stderr);
  const p = join(out, "pharn", "features", "feat", "cost.json");
  const text = readFileSync(p, "utf8");
  assert.ok(!text.includes(projectsDir), "cost.json must not carry the fixture's projects dir");
  assert.ok(!text.includes(root), "cost.json must not carry the fixture root");
  const led = JSON.parse(text);
  assert.equal(led.coverage, "unavailable");
  assert.equal(led.totals.requests, 0);
  const chk = runChecker([p]);
  assert.equal(chk.status, 0, chk.stdout + chk.stderr);

  // --stdout stays a bare JSON document on the same path
  const so = run([...args, "--stdout"]);
  assert.equal(so.status, 0);
  assert.equal(JSON.parse(so.stdout).coverage, "unavailable");
  assert.ok(!so.stdout.includes(projectsDir));
});

test("C / L41: with NO --projects-dir the CLI derives it from CLAUDE_CONFIG_DIR — and that path stays out of cost.json too", () => {
  // Every other CLI test passes --projects-dir, so the default derivation is the production path no test
  // reached. CLAUDE_CONFIG_DIR points it at a scratch dir: the developer's real transcripts are never read.
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-cli-cfg-"));
  const cfg = join(root, "claude-config");
  mkdirSync(join(cfg, "projects"), { recursive: true });
  const out = join(root, "repo");
  const r = run(["feat", "--repo", out, "--base", "pharn/features", "--session", SYN_SESSION, "--markers-base", join(root, "none")], {
    CLAUDE_CONFIG_DIR: cfg,
  });
  assert.equal(r.status, 0, r.stderr);
  const p = join(out, "pharn", "features", "feat", "cost.json");
  const text = readFileSync(p, "utf8");
  assert.ok(!text.includes(root), "cost.json must not carry the derived projects dir");
  assert.equal(JSON.parse(text).coverage, "unavailable");
  const chk = runChecker([p]);
  assert.equal(chk.status, 0, chk.stdout + chk.stderr);
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

// ── the OTHER two defaults this module carried twice (L41 / L52) ─────────────────────────────────────
//
// L52's transferable rule is that a set-quantified remedy must NAME THE SET in the same sentence, because
// the singular phrasing ("one test exercises the no-argument path") is what licenses covering one member
// and declaring it done — and its recorded instance is THIS MODULE, one constant over. The set here is
// "every default retired in this change": `command` and `baseSha`. One no-argument test each, plus one
// closure assertion each. Not one test, and not a test for whichever default was in front of the author.

test("L41/L52 NO-ARGUMENT CONTROL 1 of 2: with no --command the CLI lands on the single DEFAULT_COMMAND", () => {
  // Before this, `main()`'s opts object ALWAYS passed its own copy, so `renderLedger`'s destructuring
  // default was dead to every CLI test — the same blind spot, a different constant.
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-nocmd-"));
  const r = run(["feat", "--repo", out, "--base", "f", "--session", REAL_SESSION, "--projects-dir", projectsDir, "--stdout"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).command, DEFAULT_COMMAND);
});

test("L41/L52 NO-ARGUMENT CONTROL 2 of 2: with no --base-sha the CLI lands on the single UNKNOWN_BASE_SHA", () => {
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-nosha-"));
  const r = run(["feat", "--repo", out, "--base", "f", "--session", REAL_SESSION, "--projects-dir", projectsDir, "--stdout"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).base_sha, UNKNOWN_BASE_SHA);
});

test("L52 CLOSURE: each retired default appears exactly ONCE in the module source", () => {
  // The closure half of L52's remedy: a re-introduced duplicate FAILS here rather than merely going
  // untested. Counting occurrences is what distinguishes this from a presence assertion.
  const src = readFileSync(CLI, "utf8");
  for (const [literal, decl] of [
    ['"/pharn-loop"', /export const DEFAULT_COMMAND = "\/pharn-loop";/],
    ['"unknown"', null], // see below — `unknown` is a WORD this module uses for other facts too
  ]) {
    if (decl === null) continue;
    const hits = src.split(literal).length - 1;
    assert.equal(hits, 1, `${literal} must appear exactly once (the const); found ${hits}`);
    assert.match(src, decl);
  }
  // `"unknown"` cannot be counted the same way: it is ALSO a member of SKILLS_VERSION_SOURCES and the
  // fallback for an unreadable model id — genuinely different facts that share a spelling. So the
  // closure for THIS default is that the CLI no longer carries a base-sha literal at all: `main()` must
  // pass it conditionally, exactly as it does for `--base`.
  assert.match(src, /export const UNKNOWN_BASE_SHA = "unknown";/);
  assert.match(src, /baseSha = UNKNOWN_BASE_SHA,/, "renderLedger must reference the const, not a literal");
  assert.match(
    src,
    /\.\.\.\(opts\.baseSha === null \? \{\} : \{ baseSha: opts\.baseSha \}\),/,
    "the CLI must spread the flag away when absent"
  );
  assert.match(src, /\.\.\.\(opts\.command === null \? \{\} : \{ command: opts\.command \}\),/);
});

// ── outcome: the loop DECLARES, every other caller DERIVES ───────────────────────────────────────────

test("outcome PRECEDENCE: a LOOP.md envelope always wins over the derived ship outcome", () => {
  // The loop's bytes must not move. A feature dir carrying BOTH a record and verdict reports must still
  // report the DECLARED decision — deriving is a fallback, never a re-interpretation.
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-prec-"));
  const dir = join(out, "f", "feat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "LOOP.md"), "---\ndecision: STOP_GREEN\niterations: 2\n---\n\n# LOOP\n");
  writeFileSync(join(dir, "verify-report.json"), '{"verdict":"FAIL"}');
  writeFileSync(join(dir, "regression-report.json"), '{"verdict":"regressions"}');
  const mb = writeMarkers(out, "feat", [
    { seq: 1, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-01-01T00:00:00.000Z", session_id: "s1" },
  ]);
  const r = run([
    "feat",
    "--repo",
    out,
    "--base",
    "f",
    "--markers-base",
    mb,
    "--session",
    REAL_SESSION,
    "--projects-dir",
    projectsDir,
    "--stdout",
  ]);
  assert.equal(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout).outcome;
  assert.equal(o.decision, "STOP_GREEN", "the DECLARED envelope wins");
  assert.equal(o.source, LOOP_RECORD_SOURCE);
});

test("outcome FALLBACK: with no LOOP.md the ledger carries the DERIVED ship outcome", () => {
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-derived-"));
  const dir = join(out, "f", "feat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "verify-report.json"), '{"verdict":"PASS"}');
  writeFileSync(join(dir, "regression-report.json"), '{"verdict":"no-regressions"}');
  // Since 6.9.1 the verdicts count only when BOTH stages started in the current run (applicability).
  const mb = writeMarkers(out, "feat", [
    { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2025-12-31T23:59:00.000Z", session_id: "s1" },
    { seq: 2, kind: "stage-start", stage: "pharn-regress", iteration: 1, ts: "2025-12-31T23:59:30.000Z", session_id: "s1" },
    { seq: 3, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-01-01T00:00:00.000Z", session_id: "s1" },
  ]);
  const r = run([
    "feat",
    "--repo",
    out,
    "--base",
    "f",
    "--markers-base",
    mb,
    "--command",
    "/pharn-ship",
    "--session",
    REAL_SESSION,
    "--projects-dir",
    projectsDir,
    "--stdout",
  ]);
  assert.equal(r.status, 0, r.stderr);
  const led = JSON.parse(r.stdout);
  assert.equal(led.command, "/pharn-ship");
  assert.equal(led.outcome.decision, "gate2");
  assert.equal(led.outcome.source, SHIP_OUTCOME_SOURCE);
});

test("OUTCOME_SOURCES is the closed two-member enum, defined once and shared with the checker", () => {
  assert.deepEqual([...OUTCOME_SOURCES], [LOOP_RECORD_SOURCE, SHIP_OUTCOME_SOURCE], "equality, not presence (L36)");
  assert.equal(OUTCOME_SOURCES.length, 2, "non-vacuity: gaining or losing a member must fail here");
  assert.deepEqual([...OUTCOME_KEYS], ["decision", "iterations", "source", "blocked"]);
  // The member is IMPORTED from the module that produces it, never re-spelled here (L35).
  const src = readFileSync(CLI, "utf8");
  assert.match(src, /OUTCOME_SOURCE as SHIP_OUTCOME_SOURCE/, "the derived member must be imported, not duplicated");
  assert.equal(src.split('"verdicts+markers"').length - 1, 0, "the derived source literal must not be re-spelled in this module");
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
  const led = renderLedger({ name: "f", sessionId: "s1", projectsDir: join(root, "projects"), markersBase: openRun(root, "f") });
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
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: openRun(root, "feat") });
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

test("the table renders an honest line when nothing is attributed — and says UNKNOWN, not zero, when membership is unknown", () => {
  const unknownLed = renderLedger({ name: "f", sessionId: null, projectsDir: "/nope", markersBase: "/nope" });
  assert.equal(unknownLed.membership.status, "unknown");
  assert.match(table(unknownLed), /run usage UNKNOWN/);
  assert.doesNotMatch(table(unknownLed), /no attributed requests/);
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-table-"));
  const known = renderLedger({ name: "f", sessionId: null, projectsDir: "/nope", markersBase: openRun(root, "f") });
  assert.equal(known.membership.status, "open");
  assert.match(table(known), /no attributed requests/);
});

test("pricing_note states tokens-only and carries the output_thinking subset warning", () => {
  const { root, projectsDir } = stageSingle();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: openRun(root, "feat") });
  assert.match(led.pricing_note, /TOKENS ONLY/);
  assert.match(led.pricing_note, /SUBSET of `output`/);
  assert.match(led.pricing_note, /LIST-PRICE EQUIVALENT/);
  assert.ok(!/\$/.test(JSON.stringify(led)), "no price symbol anywhere in the emitted file");
});

// ===================================================================================================
// RUN MEMBERSHIP (`pharn-cost-ledger/2`, `run-window/1`) — the regression set for "unrelated session
// activity inflates the run". Synthetic transcripts, explicit timestamps, isolated temp dirs; no real
// transcript is read. EVERY expected number below is a LITERAL computed by hand from the fixture, never
// a value read back from `buildViews` or from the checker (L43 — agreement between an emitter and a
// checker that share a helper is not evidence the number is right).
// ===================================================================================================

import { markPhase, writePendingStart } from "./mark-phase.mjs";
import { UNKNOWN_REASONS } from "./run-window-core.mjs";

const RS = "00000000-0000-4000-8000-0000000000a1"; // the run's session
const RS2 = "00000000-0000-4000-8000-0000000000a2"; // a session the run is resumed in

/** One usage-bearing assistant record. `input` is the only non-zero class unless `out` is given. */
function rec({ id, ts, sid = RS, input = 0, out = 0, model = "claude-opus-5", side = false, agent = null }) {
  return JSON.stringify({
    type: "assistant",
    requestId: id,
    timestamp: ts,
    sessionId: sid,
    isSidechain: side,
    ...(agent ? { agentId: agent } : {}),
    version: "2.1.300",
    message: { model, usage: { input_tokens: input, output_tokens: out, cache_creation: {}, output_tokens_details: {} } },
  });
}

/** Write a session transcript (+ optional subagent files) under a scratch projects dir. */
function synth(sessionId, lines, subagents = {}) {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-run-"));
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, `${sessionId}.jsonl`), lines.join("\n") + "\n");
  for (const [agent, recs] of Object.entries(subagents)) {
    const d = join(proj, sessionId, "subagents");
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, `${agent}.jsonl`), recs.join("\n") + "\n");
  }
  return { root, projectsDir: join(root, "projects") };
}

test("RUN 1 — 100 input tokens BEFORE the run and 10 INSIDE it measure 10, not 110", () => {
  const { root, projectsDir } = synth(RS, [
    rec({ id: "unrelated", ts: "2026-09-21T09:00:00.000Z", input: 100 }),
    rec({ id: "in-run", ts: "2026-09-21T10:05:00.000Z", input: 10 }),
  ]);
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T10:00:00.000Z", RS),
    marker(2, "run-stop", null, null, "2026-09-21T10:30:00.000Z", RS),
  ]);
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  assert.equal(led.schema, "pharn-cost-ledger/2");
  assert.equal(led.totals.tokens.input, 10, "pharn-cost-ledger/1 reported 110 here (100 + 10) — the defect");
  assert.equal(led.totals.requests, 1);
  assert.deepEqual(
    led.requests.map((r) => r.request_id),
    ["in-run"]
  );
  assert.equal(led.membership.status, "bounded");
  assert.equal(led.membership.excluded_requests, 1);
  assert.equal(led.membership.start, "2026-09-21T10:00:00.000Z");
  assert.equal(led.membership.end, "2026-09-21T10:30:00.000Z");
  assert.equal(led.coverage, "partial");
  // Every aggregate uses the SAME population: by_model and the stage view sum to 10 as well.
  assert.equal(
    led.by_model.reduce((a, m) => a + m.tokens.input, 0),
    10
  );
  assert.equal(
    led.by_stage_iteration_model.reduce((a, m) => a + m.tokens.input, 0),
    10
  );
  assert.deepEqual(checkLedger(led).reds, []);
});

test("RUN 2 — membership vs attribution: an in-run request with NO stage marker counts; a pre-run one does not", () => {
  const { root, projectsDir } = synth(RS, [
    rec({ id: "pre", ts: "2026-09-21T09:59:59.999Z", input: 1000 }),
    rec({ id: "unmarked", ts: "2026-09-21T10:01:00.000Z", input: 7 }),
    rec({ id: "staged", ts: "2026-09-21T10:06:00.000Z", input: 3 }),
  ]);
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T10:00:00.000Z", RS),
    marker(2, "stage-start", "pharn-plan", null, "2026-09-21T10:05:00.000Z", RS),
    marker(3, "run-stop", null, null, "2026-09-21T10:30:00.000Z", RS),
  ]);
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  assert.equal(led.totals.tokens.input, 10, "7 (unmarked, in run) + 3 (staged) — the 1000 is outside");
  assert.equal(led.unattributed.requests, 1);
  assert.equal(led.unattributed.tokens.input, 7, "unattributed is a STAGE bucket inside the run, not an out-of-run bucket");
  const plan = led.by_stage_iteration_model.find((r) => r.stage === "pharn-plan");
  assert.equal(plan.tokens.input, 3);
});

test("RUN 3 — spec boundary: a PENDING start recorded before the feature is named counts the spec work", () => {
  const { root, projectsDir } = synth(RS, [
    // The request that ISSUES the --pending-start call precedes the marker it writes: the documented gap.
    rec({ id: "issues-pending", ts: "2026-09-21T09:59:59.000Z", input: 50 }),
    rec({ id: "spec-1", ts: "2026-09-21T10:01:00.000Z", input: 20 }),
    rec({ id: "spec-2", ts: "2026-09-21T10:04:00.000Z", input: 5 }),
    rec({ id: "plan-1", ts: "2026-09-21T10:07:00.000Z", input: 2 }),
  ]);
  const base = join(root, "cost");
  // Before `/pharn-spec` has named the feature: no `<name>` exists yet, only a session.
  writePendingStart({ base, sessionId: RS, now: new Date("2026-09-21T10:00:00.000Z") });
  // `/pharn-spec` resolves `feat`; the named run-start ADOPTS the pending moment.
  const rsm = markPhase({
    name: "feat",
    kind: "run-start",
    base,
    sessionId: RS,
    now: new Date("2026-09-21T10:05:00.000Z"),
    adoptPending: true,
  });
  assert.equal(rsm.ts, "2026-09-21T10:00:00.000Z");
  markPhase({ name: "feat", kind: "stage-start", stage: "pharn-plan", base, sessionId: RS, now: new Date("2026-09-21T10:06:00.000Z") });
  markPhase({ name: "feat", kind: "run-stop", base, sessionId: RS, now: new Date("2026-09-21T10:30:00.000Z") });
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase: base });
  assert.equal(led.totals.tokens.input, 27, "20 + 5 spec + 2 plan; the 50 that issued the pending call is before the window");
  assert.equal(led.unattributed.tokens.input, 25, "spec work has no stage marker in /pharn-ship — in the run, unattributed");
  assert.equal(led.membership.excluded_requests, 1);
  assert.equal(led.markers[0].origin, "pending", "the adopted boundary is traceable in the ledger");
  // WITHOUT the pending start the same run would open at 10:05 and lose the spec work: the contrast.
  const base2 = join(root, "cost-no-pending");
  markPhase({ name: "feat", kind: "run-start", base: base2, sessionId: RS, now: new Date("2026-09-21T10:05:00.000Z") });
  markPhase({ name: "feat", kind: "run-stop", base: base2, sessionId: RS, now: new Date("2026-09-21T10:30:00.000Z") });
  const late = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase: base2 });
  assert.equal(late.totals.tokens.input, 2);
});

test("RUN 4 — a CLOSED run is not contaminated by later session activity, and a re-render is byte-identical", () => {
  const lines = [rec({ id: "in", ts: "2026-09-21T10:05:00.000Z", input: 10 })];
  const { root, projectsDir } = synth(RS, lines);
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T10:00:00.000Z", RS),
    marker(2, "run-stop", null, null, "2026-09-21T10:30:00.000Z", RS),
  ]);
  const first = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  const again = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  assert.equal(JSON.stringify(first), JSON.stringify(again), "re-rendering never double-counts");
  // Unrelated work later in the SAME session is appended to the transcript; the run is closed.
  writeFileSync(
    join(projectsDir, "p", `${RS}.jsonl`),
    [...lines, rec({ id: "later", ts: "2026-09-21T10:30:00.001Z", input: 5000 })].join("\n") + "\n"
  );
  const rerender = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  assert.equal(rerender.totals.tokens.input, 10);
  assert.equal(rerender.membership.excluded_requests, 1);
});

test("RUN 5 — a NEW invocation for the same feature measures only its own window", () => {
  const { root, projectsDir } = synth(RS, [
    rec({ id: "run1", ts: "2026-09-21T08:10:00.000Z", input: 40 }),
    rec({ id: "between", ts: "2026-09-21T09:00:00.000Z", input: 900 }),
    rec({ id: "run2", ts: "2026-09-21T10:10:00.000Z", input: 4 }),
  ]);
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T08:00:00.000Z", RS),
    marker(2, "run-stop", null, null, "2026-09-21T08:30:00.000Z", RS),
    marker(3, "run-start", null, null, "2026-09-21T10:00:00.000Z", RS),
    marker(4, "run-stop", null, null, "2026-09-21T10:30:00.000Z", RS),
  ]);
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  assert.equal(led.totals.tokens.input, 4, "NOT a feature-lifetime total (40 + 4) and not the session (944)");
  assert.equal(led.membership.excluded_requests, 2);
});

test("RUN 6 — a run RESUMED in a new session keeps its window; that session's pre-resume work stays out", () => {
  const { root, projectsDir } = synth(RS2, [
    rec({ id: "pre-resume", sid: RS2, ts: "2026-09-21T11:00:00.000Z", input: 300 }),
    rec({ id: "resumed", sid: RS2, ts: "2026-09-21T12:05:00.000Z", input: 6 }),
  ]);
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T10:00:00.000Z", RS),
    marker(2, "stage-start", "pharn-plan", null, "2026-09-21T12:00:00.000Z", RS2),
    marker(3, "run-stop", null, null, "2026-09-21T12:30:00.000Z", RS2),
  ]);
  const led = renderLedger({ name: "feat", sessionId: RS2, projectsDir, markersBase });
  assert.equal(led.totals.tokens.input, 6);
  assert.equal(led.membership.session, RS2);
  assert.equal(led.membership.excluded_requests, 1);
  // SELECTED-SESSION bound, stated: RS's requests (the spec half) are simply not read here.
  assert.deepEqual(led.sessions, [RS2]);
});

test("RUN 7 — missing, malformed or ambiguous boundary evidence → UNKNOWN: unavailable, no rows, excluded null", () => {
  const lines = [rec({ id: "a", ts: "2026-09-21T10:05:00.000Z", input: 10 }), rec({ id: "b", ts: "2026-09-21T10:06:00.000Z", input: 1 })];
  const cases = [
    { label: "no markers file", markers: null, reason: UNKNOWN_REASONS.NO_MARKERS },
    {
      label: "no run-start",
      markers: [marker(1, "stage-start", "pharn-plan", null, "2026-09-21T10:00:00.000Z", RS)],
      reason: UNKNOWN_REASONS.NO_RUN_START,
    },
    {
      label: "run-start with no valid ts",
      markers: [marker(1, "run-start", null, null, "sometime", RS)],
      reason: UNKNOWN_REASONS.BAD_RUN_START_TS,
    },
    {
      label: "a stage after a run-stop (a skipped run-start)",
      markers: [
        marker(1, "run-start", null, null, "2026-09-21T08:00:00.000Z", RS),
        marker(2, "run-stop", null, null, "2026-09-21T08:30:00.000Z", RS),
        marker(3, "stage-start", "pharn-plan", null, "2026-09-21T10:00:00.000Z", RS),
      ],
      reason: UNKNOWN_REASONS.MARKER_AFTER_STOP,
    },
  ];
  assert.equal(cases.length, 4, "NON-VACUITY (L34)");
  for (const c of cases) {
    const { root, projectsDir } = synth(RS, lines);
    const markersBase = c.markers ? writeMarkers(root, "feat", c.markers) : join(root, "none");
    const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
    assert.equal(led.coverage, "unavailable", c.label);
    assert.equal(led.membership.status, "unknown", c.label);
    assert.equal(led.membership.reason, c.reason, c.label);
    assert.equal(led.membership.excluded_requests, null, `${c.label}: unmeasured is not excluded`);
    assert.deepEqual(led.requests, [], `${c.label}: whole-session usage is NEVER presented as run usage`);
    assert.match(led.coverage_note, /run membership unknown/, c.label);
    assert.match(led.coverage_note, /2 usage-bearing request\(s\)/, c.label);
    assert.deepEqual(checkLedger(led).reds, [], `${c.label}: an honest unknown is a valid ledger`);
  }
});

test("RUN 8 — a KNOWN window that contains nothing is an OBSERVED zero (partial), distinct from unknown", () => {
  const { root, projectsDir } = synth(RS, [rec({ id: "before", ts: "2026-09-21T09:00:00.000Z", input: 10 })]);
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T10:00:00.000Z", RS),
    marker(2, "run-stop", null, null, "2026-09-21T10:30:00.000Z", RS),
  ]);
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  assert.equal(led.coverage, "partial");
  assert.equal(led.membership.status, "bounded");
  assert.equal(led.membership.excluded_requests, 1);
  assert.equal(led.totals.requests, 0);
  assert.match(led.coverage_note, /OBSERVED zero/);
  assert.deepEqual(checkLedger(led).reds, []);
});

test("RUN 9 — dedup, subagents and the three views all operate on the SAME in-window population", () => {
  const dup = rec({ id: "dup", ts: "2026-09-21T10:05:00.000Z", input: 8, out: 2 });
  const { root, projectsDir } = synth(RS, [rec({ id: "old", ts: "2026-09-21T09:00:00.000Z", input: 100 }), dup, dup, dup], {
    "agent-x": [
      rec({ id: "sub-in", ts: "2026-09-21T10:10:00.000Z", input: 4, out: 1, model: "claude-sonnet-5", side: true, agent: "agent-x" }),
      rec({ id: "sub-old", ts: "2026-09-21T09:30:00.000Z", input: 60, model: "claude-sonnet-5", side: true, agent: "agent-x" }),
    ],
  });
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T10:00:00.000Z", RS),
    marker(2, "stage-start", "pharn-build", 1, "2026-09-21T10:01:00.000Z", RS),
    marker(3, "run-stop", null, null, "2026-09-21T10:30:00.000Z", RS),
  ]);
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  assert.deepEqual(
    led.requests.map((r) => r.request_id),
    ["dup", "sub-in"]
  );
  assert.equal(led.totals.tokens.input, 12, "8 (dup, counted ONCE) + 4 (subagent, in window)");
  assert.equal(led.totals.tokens.output, 3);
  assert.equal(led.membership.excluded_requests, 2, "the pre-run parent AND the pre-run subagent request");
  const sub = led.requests.find((r) => r.request_id === "sub-in");
  assert.equal(sub.sidechain, true);
  assert.equal(sub.stage, "pharn-build", "a subagent row inside the stage window is attributed to it");
  assert.deepEqual(
    led.by_model.map((m) => [m.model, m.tokens.input]),
    [
      ["claude-opus-5", 8],
      ["claude-sonnet-5", 4],
    ]
  );
  assert.equal(
    led.by_stage_iteration_model.reduce((a, r) => a + r.requests, 0),
    2
  );
});

test("RUN 10 — the path-free unavailable notes of 6.8.2 survive: no transcript + a known window stays path-free", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-run-unav-"));
  const projectsDir = join(root, "projects");
  mkdirSync(projectsDir, { recursive: true });
  const markersBase = writeMarkers(root, "feat", [marker(1, "run-start", null, null, "2026-09-21T10:00:00.000Z", RS)]);
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase });
  assert.equal(led.coverage, "unavailable");
  assert.equal(led.membership.status, "open");
  assert.equal(led.membership.excluded_requests, 0, "nothing was read, so nothing was excluded");
  assert.deepEqual(findAbsolutePaths(led, "", []), []);
  assert.ok(!JSON.stringify(led).includes(root));
  assert.deepEqual(checkLedger(led).reds, []);
});

test("attribute() compares timestamps as NUMBERS — a millisecond-less marker is not mis-ordered (REVIEW finding 4)", () => {
  // As strings "…10:00:00Z" > "…10:00:00.500Z", so the old lexical compare skipped this marker for a
  // request 500 ms after it and left the request unattributed.
  const ms = [{ seq: 1, kind: "stage-start", stage: "pharn-build", iteration: 1, ts: "2026-09-21T10:00:00Z", session_id: null }];
  assert.deepEqual(attribute(ms, "2026-09-21T10:00:00.500Z", RS), { stage: "pharn-build", iteration: 1 });
  assert.deepEqual(attribute(ms, "2026-09-21T09:59:59.999Z", RS), { stage: null, iteration: null });
  assert.deepEqual(attribute(ms, null, RS), { stage: null, iteration: null });
});

test("SOURCE SELECTION (6.9.1): a /pharn-ship ledger NEVER copies a LOOP.md left in the feature directory; /pharn-loop still does", () => {
  // Reachable through supported use: /pharn-ship resumes a /pharn-loop feature via /pharn-spec's resume
  // path. Pre-fix (9d866ed) the old loop's decision was reported as the ship run's own outcome.
  const { root, projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-srcsel-"));
  const dir = join(out, "f", "feat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "LOOP.md"), "---\ndecision: STOP_CAP\niterations: 3\n---\n\n# LOOP\n");
  writeFileSync(join(dir, "verify-report.json"), '{"verdict":"PASS"}');
  writeFileSync(join(dir, "regression-report.json"), '{"verdict":"no-regressions"}');
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2020-01-01T00:00:00.000Z"),
    marker(2, "stage-start", "pharn-regress", 1, "2020-01-01T00:01:00.000Z"),
    marker(3, "stage-start", "pharn-verify", 1, "2020-01-01T00:02:00.000Z"),
  ]);
  const common = { name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase, repo: out, featureBase: "f" };
  const ship = renderLedger({ ...common, command: "/pharn-ship" });
  assert.deepEqual(ship.outcome, { decision: "gate2", iterations: 1, source: SHIP_OUTCOME_SOURCE });
  const loop = renderLedger({ ...common, command: "/pharn-loop" });
  assert.equal(loop.outcome.decision, "STOP_CAP", "the loop's DECLARED envelope still wins for the loop");
  assert.equal(loop.outcome.source, LOOP_RECORD_SOURCE);
  assert.deepEqual(checkLedger(ship).reds, []);
});

// ===================================================================================================
// THE ON-DISK LAYOUT (6.14.1): the two FACT arrays, one element per `\n`-delimited line.
//
// THE RECORDED FAILURE (P7): a downstream `/pharn-loop` ledger (630 rows) committed 33,051 lines, about
// 52 per request row, because the emitter wrote `JSON.stringify(ledger, null, 2)`, which expands every
// nested `usage` object of every row. It was 33,051 of the 38,927 lines its PR added. The contract had
// disclosed the size in KiB; the cost that hurt was LINE COUNT in a diff, and nobody had measured it.
//
// The parsed document must not move, and that is asserted as deep-equality over EVERY shape the emitter
// produces (L29), never one hand-picked ledger. The layout itself is asserted as a CLOSURE: every element
// is one whole JSON value on its own line, in order, and the array closes right after the last one. A
// row that spans lines fails, and the old serialization is run through the same assertion as a mutation
// control, so the check cannot pass on the emitter it replaced.
// ===================================================================================================

import { isDeepStrictEqual } from "node:util";

/** Every way the written text can break the layout rule, or `[]`. Shared by every test below and by the
 *  mutation control, so the rule is stated once. */
function rowLayoutProblems(text, led) {
  const problems = [];
  const lines = text.split("\n");
  if (lines.at(-1) !== "" || lines.at(-2) === "") problems.push("the file must end with exactly one newline");
  for (const key of ["markers", "requests"]) {
    const arr = led[key];
    if (arr.length === 0) {
      if (!lines.includes(`  "${key}": [],`)) problems.push(`${key}: an empty fact array must be written as []`);
      continue;
    }
    const open = lines.indexOf(`  "${key}": [`);
    if (open === -1) {
      problems.push(`${key}: no opening line`);
      continue;
    }
    for (let i = 0; i < arr.length; i++) {
      const line = lines[open + 1 + i] ?? "";
      const wantComma = i < arr.length - 1;
      let parsed;
      try {
        if (!line.startsWith("    {") || line.endsWith(",") !== wantComma) throw new Error("shape");
        parsed = JSON.parse(line.slice(4, wantComma ? -1 : undefined));
      } catch {
        problems.push(`${key}[${i}] is not one whole JSON value on its own line`);
        break;
      }
      if (!isDeepStrictEqual(parsed, arr[i])) {
        problems.push(`${key}[${i}]'s line does not parse to that element`);
        break;
      }
    }
    if (!["  ],", "  ]"].includes(lines[open + 1 + arr.length]))
      problems.push(`${key}: the array does not close right after its last element`);
  }
  return problems;
}

/** A bounded run with stage markers over the real fixture: 12 rows, 4 markers. */
function boundedWithStages() {
  const { root, projectsDir } = stageSingle();
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T08:00:00.000Z"),
    marker(2, "stage-start", "pharn-build", 1, "2026-09-21T08:36:00.000Z"),
    marker(3, "stage-start", "pharn-verify", 1, "2026-09-21T08:41:00.000Z"),
    marker(4, "run-stop", null, null, "2026-09-21T09:00:00.000Z"),
  ]);
  return { root, projectsDir, markersBase };
}

test("LAYOUT (6.14.1): the CLI writes every request and every marker on ONE \\n-delimited line", () => {
  const { projectsDir, markersBase } = boundedWithStages();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-layout-"));
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
    markersBase,
  ]);
  assert.equal(r.status, 0, r.stderr);
  const text = readFileSync(join(out, "pharn", "features", "feat", "cost.json"), "utf8");
  const led = JSON.parse(text);
  // NON-VACUITY (L34): both fact arrays are populated, or "every element on its own line" is free.
  assert.equal(led.requests.length, 12);
  assert.equal(led.markers.length, 4);
  assert.deepEqual(rowLayoutProblems(text, led), []);
  // MUTATION CONTROL: the serialization this replaced fails the same assertion.
  assert.ok(rowLayoutProblems(JSON.stringify(led, null, 2) + "\n", led).length > 0, "the old pretty-printed layout must FAIL the rule");
});

import { serializeLedger, ROW_ARRAYS } from "./render-cost-ledger.mjs";
import { readJson } from "./render-run-report.mjs";

/** EVERY ledger shape the emitter produces from the committed fixtures, in ONE table (L29). */
function layoutCases() {
  const cases = [];
  {
    const { projectsDir, markersBase } = boundedWithStages();
    cases.push({
      label: "bounded, rows + stage markers",
      led: renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase }),
    });
  }
  {
    const { root, projectsDir } = stageSingle();
    cases.push({
      label: "open window, rows",
      led: renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: openRun(root, "feat") }),
    });
  }
  {
    const { root, projectsDir } = stageSubagents();
    cases.push({
      label: "subagent rows",
      led: renderLedger({ name: "feat", sessionId: SUB_SESSION, projectsDir, markersBase: openRun(root, "feat") }),
    });
  }
  {
    const { root, projectsDir } = stageSingle();
    const markersBase = writeMarkers(root, "feat", [
      marker(1, "run-start", null, null, "2026-09-21T12:00:00.000Z"),
      marker(2, "run-stop", null, null, "2026-09-21T12:30:00.000Z"),
    ]);
    cases.push({
      label: "observed zero (known window, no rows)",
      led: renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase }),
    });
  }
  {
    const { root, projectsDir } = stageSingle();
    cases.push({
      label: "unknown window (no markers)",
      led: renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase: join(root, "none") }),
    });
  }
  cases.push({
    label: "no session id (unavailable shell)",
    led: renderLedger({ name: "feat", sessionId: null, projectsDir: "/nope", markersBase: "/nope" }),
  });
  return cases;
}

test("LAYOUT: JSON.parse of the new file equals JSON.parse of the old one — over EVERY emitter shape (L29/L34)", () => {
  const cases = layoutCases();
  assert.equal(cases.length, 6, "non-vacuity: the table ranges over every shape it names");
  assert.ok(
    cases.some((c) => c.led.requests.length > 0 && c.led.markers.length > 0),
    "non-vacuity: some case has both fact arrays populated"
  );
  assert.ok(
    cases.some((c) => c.led.requests.length === 0) && cases.some((c) => c.led.markers.length === 0),
    "both fact arrays are also seen EMPTY"
  );
  assert.equal(cases.find((c) => /observed zero/.test(c.label)).led.coverage, "partial", "the observed-zero case really is one");
  assert.equal(cases.find((c) => /unknown/.test(c.label)).led.coverage, "unavailable");
  for (const { label, led } of cases) {
    const text = serializeLedger(led);
    const old = JSON.stringify(led, null, 2) + "\n";
    assert.deepStrictEqual(JSON.parse(text), JSON.parse(old), `${label}: the parsed document must not move`);
    assert.deepStrictEqual(Object.keys(JSON.parse(text)), Object.keys(JSON.parse(old)), `${label}: key order is unchanged`);
    assert.deepStrictEqual(rowLayoutProblems(text, led), [], `${label}: layout`);
    assert.equal(serializeLedger(structuredClone(led)), text, `${label}: byte-deterministic for an equal object`);
    assert.ok(text.split("\n").length <= old.split("\n").length, `${label}: never MORE lines than the old layout`);
  }
  assert.deepEqual([...ROW_ARRAYS], ["markers", "requests"], "exactly the two fact arrays — equality, not presence (L36)");
});

test("LAYOUT: a value carrying \\n or U+2028 stays on its row's line — the \\n-delimited claim, probed (L37)", () => {
  const { projectsDir, markersBase } = boundedWithStages();
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase });
  // In-memory only: the emitter never writes these (identity fields are bounded, usage leaves are
  // tokens), but `session_id` and a marker's `stage` are copied as strings, so the serializer must hold
  // the property for ANY string, not only the ones the emitter happens to produce today.
  led.requests[0].session_id = "a\nb c d\u0085e";
  led.markers[1].stage = "x\ny";
  const text = serializeLedger(led);
  assert.deepStrictEqual(rowLayoutProblems(text, led), []);
  assert.deepStrictEqual(JSON.parse(text), led);
  assert.ok(text.includes(" "), "BOUND, pinned: U+2028 is left RAW by JSON.stringify — the contract says so");
});

test("LAYOUT (L41): the file write AND --stdout both emit exactly serializeLedger's bytes; readers accept them", () => {
  const { projectsDir, markersBase } = boundedWithStages();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-layout-cli-"));
  const args = [
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
    markersBase,
  ];
  const want = serializeLedger(renderLedger({ name: "feat", repo: out, sessionId: REAL_SESSION, projectsDir, markersBase }));
  const w = run(args);
  assert.equal(w.status, 0, w.stderr);
  const p = join(out, "pharn", "features", "feat", "cost.json");
  const written = readFileSync(p, "utf8");
  assert.equal(written, want, "the file write path");
  const so = run([...args, "--stdout"]);
  assert.equal(so.status, 0, so.stderr);
  assert.equal(so.stdout, want, "the --stdout path");
  // Determinism across two whole CLI emissions of the same inputs.
  assert.equal(run(args).status, 0);
  assert.equal(readFileSync(p, "utf8"), written, "a second emission is byte-identical");
  // The two readers that parse the file: the checker CLI and the run report's reader.
  const chk = runChecker([p]);
  assert.equal(chk.status, 0, chk.stdout + chk.stderr);
  assert.deepStrictEqual(readJson(p), JSON.parse(want));
});
