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
//     lines DISAGREE (6.24.1); described where the reader's own tests live, transcript-core.test.mjs.
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
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  copyFileSync,
  cpSync,
  existsSync,
  appendFileSync,
} from "node:fs";
import { markerLine } from "./mark-phase.mjs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderLedger,
  buildViews,
  sanitizeUsage,
  attribute,
  readMarkers,
  normalizeMarkers,
  readOutcome,
  readSkillsVersion,
  table,
  TOKEN_CLASSES,
  TOP_LEVEL_KEYS,
  SCHEMA,
  FEATURE_BASE,
  DEFAULT_COMMAND,
  UNKNOWN_BASE_SHA,
  OUTCOME_SOURCES,
  OUTCOME_KEYS,
  LOOP_RECORD_SOURCE,
} from "./render-cost-ledger.mjs";
import { ABS_PATH_RE } from "./cost-value-core.mjs";
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

/** `with-subagents/`: the main thread spawns both agents at 10:10:00 (by the request `req-parent-2`), recorded as the
 *  platform records a spawn (`spawnAgent`); the committed metas name the two `toolUseId`s. */
function stageSubagents() {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-sub-"));
  const proj = join(root, "projects");
  mkdirSync(proj, { recursive: true });
  cpSync(join(FIXTURES, "with-subagents"), join(proj, "wt"), { recursive: true });
  spawnAgent(join(proj, "wt"), SUB_SESSION, "aaa1111111111111", {
    ts: "2026-09-21T10:10:00.500Z",
    toolUseId: "toolu_fx_sub_aaa",
    meta: false,
  });
  spawnAgent(join(proj, "wt"), SUB_SESSION, "bbb2222222222222", {
    ts: "2026-09-21T10:10:00.600Z",
    toolUseId: "toolu_fx_sub_bbb",
    meta: false,
  });
  return { root, projectsDir: proj };
}

/** `usage-snapshots/`: requests whose transcript lines DISAGREE (6.24.1). Described where the rule's own
 *  tests live, transcript-core.test.mjs; the ★ COMPLETED USAGE tests below pin the ledger's reading. */
const SNAP_SESSION = "00000000-0000-4000-8000-00000000beef";

function stageSnapshots() {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-snap-"));
  const proj = join(root, "projects");
  mkdirSync(proj, { recursive: true });
  cpSync(join(FIXTURES, "usage-snapshots"), join(proj, "wt"), { recursive: true });
  // The fork is spawned by the main thread's `req_fx_forked` request (10:00:20.000), whose line the fork's own file
  // opens with a copy of — the measured fork shape. The committed meta names the `toolUseId`.
  spawnAgent(join(proj, "wt"), SNAP_SESSION, "fff3333333333333", {
    ts: "2026-09-26T10:00:20.000Z",
    toolUseId: "toolu_fx_fork_fff",
    meta: false,
  });
  return { root, projectsDir: proj };
}

/**
 * Write the markers file AND record each marker's printed line in the tool results of the context that ran it —
 * what the platform writes when an orchestrator's Bash call runs mark-phase (6.29.0, `run-window/2`: that line is how
 * the ledger learns which context ran the run). By default the printer is the MAIN thread of every session staged
 * under `root/projects` that the marker is bound to. `{ printedBy: null }` records nothing (an unbound run);
 * `{ printedBy: "<agentId>" }` records into that agent's file. The line is `markerLine` of the NORMALIZED marker —
 * the emitter's own reading, so a test never rebuilds the format by hand (L35).
 */
function writeMarkers(root, name, markers, { printedBy = "main" } = {}) {
  const dir = join(root, "cost", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "markers.jsonl"), markers.map((m) => JSON.stringify(m)).join("\n") + "\n");
  if (printedBy !== null) printMarkers(join(root, "projects"), markers, printedBy);
  return join(root, "cost");
}

/** Every staged session's main transcript under a projects dir: `[{ dir, sid }]`, one level of project dirs deep. */
function stagedSessions(projectsDir) {
  const out = [];
  if (!existsSync(projectsDir)) return out;
  for (const p of readdirSync(projectsDir, { withFileTypes: true })) {
    if (!p.isDirectory()) continue;
    for (const e of readdirSync(join(projectsDir, p.name), { withFileTypes: true })) {
      const m = e.isFile() ? /^(.+)\.jsonl$/.exec(e.name) : null;
      if (m) out.push({ dir: join(projectsDir, p.name), sid: m[1] });
    }
  }
  return out;
}

/** The transcript file of a context: the session's main file, or `subagents/agent-<id>.jsonl`. */
const contextFile = (dir, sid, agentId) =>
  agentId === "main" ? join(dir, `${sid}.jsonl`) : join(dir, sid, "subagents", `agent-${agentId}.jsonl`);

/** One tool-result record carrying `text`, written as the context `agentId` (`"main"` or an agent id) records it. */
const toolResultLine = (sid, agentId, ts, text, n) =>
  JSON.stringify({
    type: "user",
    sessionId: sid,
    timestamp: ts,
    isSidechain: agentId !== "main",
    ...(agentId === "main" ? {} : { agentId }),
    message: { role: "user", content: [{ type: "tool_result", tool_use_id: `toolu_fx_print_${n}`, content: `${text}\nexit=0` }] },
  });

function printMarkers(projectsDir, markers, printedBy) {
  for (const { dir, sid } of stagedSessions(projectsDir)) {
    const lines = [];
    for (const m of normalizeMarkers(markers)) {
      if (m.session_id !== null && m.session_id !== sid) continue;
      lines.push(toolResultLine(sid, printedBy, m.ts ?? OPEN_TS, markerLine(m), m.seq));
    }
    if (lines.length) appendFileSync(contextFile(dir, sid, printedBy), lines.join("\n") + "\n");
  }
}

/**
 * Stage an agent's SPAWN the way the platform records it: its meta file naming a `toolUseId`, and the PARENT
 * context's assistant record holding that `tool_use` block, at `ts` (6.29.0 links: `transcript-core.mjs`
 * `spawnLinks`). The record carries no usage, so it counts as no request. It is message content, which is why it is
 * staged in the scratch copy and never committed (the fixture guard below). `meta: false` keeps an existing
 * committed meta file.
 */
function spawnAgent(dir, sid, agentId, { ts, toolUseId = `toolu_fx_spawn_${agentId}`, parent = "main", meta = true }) {
  const sub = join(dir, sid, "subagents");
  mkdirSync(sub, { recursive: true });
  if (meta)
    writeFileSync(
      join(sub, `agent-${agentId}.meta.json`),
      JSON.stringify({ agentType: "general-purpose", toolUseId, spawnDepth: 1 }) + "\n"
    );
  const line = JSON.stringify({
    type: "assistant",
    sessionId: sid,
    timestamp: ts,
    isSidechain: parent !== "main",
    ...(parent === "main" ? {} : { agentId: parent }),
    message: { model: "claude-opus-5-5", content: [{ type: "tool_use", id: toolUseId, name: "Agent", input: {} }] },
  });
  appendFileSync(contextFile(dir, sid, parent), line + "\n");
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

test("D2: sidechain rows from nested subagent files are included, each under the agentId its file is named for", () => {
  // 6.29.0 (GRILL G6): the fixture now carries the MEASURED shape — every agent line's `agentId` equals its file's
  // id, and `attributionAgent` carries the agent TYPE. Before, one line carried only `attributionAgent` as its id.
  // That spelling can no longer reach a row of a KNOWN ledger: a sidechain line without an `agentId` has no
  // context, so membership is `unknown` (pinned by the next test). The row field keeps its fallback for a
  // main-thread line.
  const { root, projectsDir } = stageSubagents();
  const led = renderLedger({ name: "feat", sessionId: SUB_SESSION, projectsDir, markersBase: openRun(root, "feat") });
  assert.equal(led.requests.length, 4, "2 parent + 2 subagent rows");
  const subs = led.requests.filter((r) => r.sidechain);
  assert.equal(subs.length, 2, "NON-VACUITY: the subagent rows must exist for the next assertions to mean anything");
  const agents = subs.map((r) => r.agent_id).sort();
  assert.deepEqual(agents, ["aaa1111111111111", "bbb2222222222222"], "the agentId, never the attributionAgent TYPE");
  assert.deepEqual(led.membership.contexts, ["agent:aaa1111111111111", "agent:bbb2222222222222", "main"]);
  assert.equal(led.membership.context, "main", "the main thread printed the run's markers");
  assert.ok(
    led.requests.every((r) => typeof r.sidechain === "boolean"),
    "sidechain is always a boolean, never undefined"
  );
});

test("D2 (6.29.0): a sidechain line with NO agentId has no context, so a window holding one is UNKNOWN — never counted, never dropped", () => {
  const { root, projectsDir } = stageSubagents();
  const file = join(projectsDir, "wt", SUB_SESSION, "subagents", "agent-bbb2222222222222.jsonl");
  const line = JSON.parse(readFileSync(file, "utf8").trim());
  delete line.agentId; // only the attributionAgent TYPE is left: the pre-6.29.0 fixture's shape
  writeFileSync(file, JSON.stringify(line) + "\n");
  const led = renderLedger({ name: "feat", sessionId: SUB_SESSION, projectsDir, markersBase: openRun(root, "feat") });
  assert.equal(led.membership.status, "unknown");
  assert.equal(led.membership.reason, UNKNOWN_REASONS.UNLINKED_CONTEXT);
  assert.equal(led.coverage, "unavailable");
  assert.deepEqual(led.requests, []);
  assert.equal(led.membership.excluded_requests, null);
  assert.deepEqual(checkLedger(led).reds, [], "an honest unknown is a well-formed ledger");
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
  // `isSidechain: false` is the measured main-thread shape; without it the line's context is undecidable (6.29.0).
  const line = (model, id) =>
    JSON.stringify({
      type: "assistant",
      requestId: id,
      timestamp: "2026-01-01T00:00:00.000Z",
      sessionId: "s1",
      isSidechain: false,
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

// ── normalizeMarkers keeps `mode` only as a MARKER_MODES member (6.25.0) — the `origin` precedent ───────

test('normalizeMarkers: mode: "quick" on a run-start survives normalization', () => {
  const [m] = normalizeMarkers([
    { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2026-01-01T00:00:00.000Z", session_id: null, mode: "quick" },
  ]);
  assert.equal(m.mode, "quick");
});

test("normalizeMarkers: every garbage mode value is DROPPED — no mode key at all", () => {
  for (const bad of ["QUICK", "Quick", "fast", 1, true, "", null, {}]) {
    const [m] = normalizeMarkers([
      { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2026-01-01T00:00:00.000Z", session_id: null, mode: bad },
    ]);
    assert.equal("mode" in m, false, `mode=${JSON.stringify(bad)} must be dropped`);
  }
});

test("normalizeMarkers: an absent mode key stays absent — byte-identical to a pre-6.25.0 marker", () => {
  const [m] = normalizeMarkers([
    { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2026-01-01T00:00:00.000Z", session_id: null },
  ]);
  assert.equal("mode" in m, false);
});

test("normalizeMarkers: mode survives on a NON-run-start marker too (this module reads only MARKER_MODES membership; the run-start-only rule is mark-phase.mjs's WRITE-time rule)", () => {
  // Read-time normalization keeps any MARKER_MODES member regardless of kind — it does not re-derive
  // mark-phase.mjs's write-time refusal, which is the shape that never reaches disk in the first place.
  const [m] = normalizeMarkers([
    { seq: 1, kind: "stage-start", stage: "pharn-build", iteration: 1, ts: "2026-01-01T00:00:00.000Z", session_id: null, mode: "quick" },
  ]);
  assert.equal(m.mode, "quick");
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
  // THE BOUND (L43), and it bit: agreement is all this proves. Until 6.24.1 both renderers kept each
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

// ---------------------------------------------------------------- ★ completed usage (6.24.1)
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
  // Since 6.9.1 the verdicts count only when BOTH stages started in the current run (applicability), and
  // since 6.25.0 only AFTER that iteration's latest pharn-build stage-start (ship-outcome-core, condition (a)).
  const mb = writeMarkers(out, "feat", [
    { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2025-12-31T23:59:00.000Z", session_id: "s1" },
    { seq: 2, kind: "stage-start", stage: "pharn-build", iteration: 1, ts: "2025-12-31T23:59:15.000Z", session_id: "s1" },
    { seq: 3, kind: "stage-start", stage: "pharn-regress", iteration: 1, ts: "2025-12-31T23:59:30.000Z", session_id: "s1" },
    { seq: 4, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-01-01T00:00:00.000Z", session_id: "s1" },
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

test("outcome FALLBACK, quick (6.25.0): a --quick run's run-start (mode: quick) derives gate2-quick from verify PASS alone — NO pharn-regress stage-start needed, and its markers.mode survives into the ledger", () => {
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-derived-quick-"));
  const dir = join(out, "f", "feat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "verify-report.json"), '{"verdict":"PASS"}');
  // A regression-report.json left on disk (e.g. by an earlier full run over the same feature dir) must be
  // IGNORED for a quick run's outcome — quick mode never consults the regress verdict at all.
  writeFileSync(join(dir, "regression-report.json"), '{"verdict":"regressions"}');
  const mb = writeMarkers(out, "feat", [
    { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2025-12-31T23:59:00.000Z", session_id: "s1", mode: "quick" },
    { seq: 2, kind: "stage-start", stage: "pharn-build", iteration: 1, ts: "2025-12-31T23:59:30.000Z", session_id: "s1" },
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
  assert.equal(led.outcome.decision, "gate2-quick");
  assert.equal(led.outcome.source, SHIP_OUTCOME_SOURCE);
  assert.equal(led.markers[0].mode, "quick", "the run-start's mode must survive into the ledger's own markers[]");
});

test("outcome FALLBACK, quick: a FULL run (no mode) with only pharn-verify started stays stop:pharn-verify, never gate2-quick", () => {
  const { projectsDir } = stageSingle();
  const out = mkdtempSync(join(tmpdir(), "cost-ledger-derived-full-noregress-"));
  const dir = join(out, "f", "feat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "verify-report.json"), '{"verdict":"PASS"}');
  const mb = writeMarkers(out, "feat", [
    { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2025-12-31T23:59:00.000Z", session_id: "s1" },
    { seq: 2, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-01-01T00:00:00.000Z", session_id: "s1" },
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
  assert.equal(led.outcome.decision, "stop:pharn-verify");
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
  // The CLI prints each marker's line into the calling context's tool result (6.29.0); markPhase() is the library
  // call, so the test records what the platform would have.
  printMarkers(projectsDir, readMarkers(join(base, "feat", "markers.jsonl")), "main");
  const led = renderLedger({ name: "feat", sessionId: RS, projectsDir, markersBase: base });
  assert.equal(led.totals.tokens.input, 27, "20 + 5 spec + 2 plan; the 50 that issued the pending call is before the window");
  assert.equal(led.unattributed.tokens.input, 25, "spec work has no stage marker in /pharn-ship — in the run, unattributed");
  assert.equal(led.membership.excluded_requests, 1);
  assert.equal(led.markers[0].origin, "pending", "the adopted boundary is traceable in the ledger");
  // WITHOUT the pending start the same run would open at 10:05 and lose the spec work: the contrast.
  const base2 = join(root, "cost-no-pending");
  markPhase({ name: "feat", kind: "run-start", base: base2, sessionId: RS, now: new Date("2026-09-21T10:05:00.000Z") });
  markPhase({ name: "feat", kind: "run-stop", base: base2, sessionId: RS, now: new Date("2026-09-21T10:30:00.000Z") });
  printMarkers(projectsDir, readMarkers(join(base2, "feat", "markers.jsonl")), "main");
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
  // Unrelated work later in the SAME session is appended to the transcript; the run is closed. (Appended, as the
  // platform appends: a rewrite would also erase the tool results that bind the run to its context.)
  appendFileSync(join(projectsDir, "p", `${RS}.jsonl`), rec({ id: "later", ts: "2026-09-21T10:30:00.001Z", input: 5000 }) + "\n");
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
  // Two agents, each file named for its agentId (the measured shape): `ax1` is spawned INSIDE the run and works
  // there; `ax0` was spawned before it and worked before it. (Until 6.29.0 one agent did both, which a real
  // transcript cannot hold: an agent's requests follow its spawn.)
  const { root, projectsDir } = synth(RS, [rec({ id: "old", ts: "2026-09-21T09:00:00.000Z", input: 100 }), dup, dup, dup], {
    "agent-ax1": [
      rec({ id: "sub-in", ts: "2026-09-21T10:10:00.000Z", input: 4, out: 1, model: "claude-sonnet-5", side: true, agent: "ax1" }),
    ],
    "agent-ax0": [rec({ id: "sub-old", ts: "2026-09-21T09:30:00.000Z", input: 60, model: "claude-sonnet-5", side: true, agent: "ax0" })],
  });
  spawnAgent(join(projectsDir, "p"), RS, "ax1", { ts: "2026-09-21T10:02:00.000Z" });
  spawnAgent(join(projectsDir, "p"), RS, "ax0", { ts: "2026-09-21T09:25:00.000Z" });
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
  // A compliant run starts its build first: since 6.25.0 a verdict stage-start counts only after the same
  // iteration's latest pharn-build stage-start (ship-outcome-core, condition (a)).
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2020-01-01T00:00:00.000Z"),
    marker(2, "stage-start", "pharn-build", 1, "2020-01-01T00:00:30.000Z"),
    marker(3, "stage-start", "pharn-regress", 1, "2020-01-01T00:01:00.000Z"),
    marker(4, "stage-start", "pharn-verify", 1, "2020-01-01T00:02:00.000Z"),
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
  for (const key of ROW_ARRAYS) {
    const arr = led[key];
    if (arr.length === 0) {
      // `work` (6.35.0) is the LAST key, so its empty form carries no trailing comma.
      if (!lines.includes(`  "${key}": [],`) && !lines.includes(`  "${key}": []`))
        problems.push(`${key}: an empty fact array must be written as []`);
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
  assert.deepEqual(
    [...ROW_ARRAYS],
    ["markers", "requests", "work", "entry_events"],
    "exactly the four fact arrays — equality, not presence (L36)"
  );
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

// ── ROUTED STAGES (6.27.0, stage-model-routing) — `markers[].route` and a stage agent's rows ─────────────
//
// `fixtures/cost-ledger/with-routed-stage/` — HAND-AUTHORED in the 2.1.281 record shape the plan's Discovery
// read (identity fields only): a parent session on `claude-opus-5-5`, and ONE stage agent's file on
// `claude-sonnet-5` whose records carry BOTH `agentId` (the id) and `attributionAgent: "general-purpose"`
// (the agent TYPE, which 2.1.281 writes there), plus the `agent-<id>.meta.json` sibling the platform writes.
// It covers the member no earlier fixture does (L52): a ROUTED stage's sidechain rows bracketed by a routed
// stage-start. Walk inclusion, a subagent row's identity and fork dedup are `with-subagents` and
// `usage-snapshots`, and are not duplicated here. Authored, so it proves the READER's shape — never that a
// live run routes (L4); that is the plan's M2 measurement.

import { runWindow } from "./run-window-core.mjs";
import { ledgerCurrency } from "./render-run-report.mjs";

const ROUTED_SESSION = "00000000-0000-4000-8000-0000000c0de5";
const ROUTED_AGENT_ID = "a0f1e2d3c4b5a6978";

function stageRouted() {
  const root = mkdtempSync(join(tmpdir(), "cost-ledger-routed-"));
  const proj = join(root, "projects");
  mkdirSync(proj, { recursive: true });
  cpSync(join(FIXTURES, "with-routed-stage"), join(proj, "wt"), { recursive: true });
  // `req_rs_p2` (10:01:05) issues the Agent call that spawns the routed build's stage agent (6.29.0 links).
  spawnAgent(join(proj, "wt"), ROUTED_SESSION, ROUTED_AGENT_ID, {
    ts: "2026-09-26T10:01:05.500Z",
    toolUseId: "toolu_fx_rs_build",
    meta: false,
  });
  return { root, projectsDir: proj, projectDir: join(proj, "wt") };
}

/** The ship bracket around a routed build: run-start → stage-start (route) → orchestrator → run-stop. */
function routedMarkers(stageStartTs = "2026-09-26T10:01:00.000Z", route = "agent:sonnet") {
  const start = { ...marker(2, "stage-start", "pharn-build", 1, stageStartTs, ROUTED_SESSION), ...(route === null ? {} : { route }) };
  return [
    marker(1, "run-start", null, null, "2026-09-26T10:00:00.000Z", ROUTED_SESSION),
    start,
    marker(3, "orchestrator", null, null, "2026-09-26T10:05:00.000Z", ROUTED_SESSION),
    marker(4, "run-stop", null, null, "2026-09-26T10:06:00.000Z", ROUTED_SESSION),
  ];
}

test("normalizeMarkers: route is KEPT as a valid token, and DROPPED as anything else", () => {
  const base = { seq: 1, kind: "stage-start", stage: "pharn-plan", iteration: null, ts: "2026-01-01T00:00:00.000Z", session_id: null };
  for (const good of ["agent:opus", "agent:sonnet", "inline:no-config", "inline:floor-only", "inline:route-unavailable"]) {
    assert.equal(normalizeMarkers([{ ...base, route: good }])[0].route, good, good);
  }
  for (const bad of [
    "agent:gpt",
    "Agent:opus",
    "agent:opus ",
    "agent:opus\n",
    "inline:other",
    "",
    1,
    true,
    null,
    {},
    ["agent:opus"],
    JSON.parse('{"toString":1}'),
  ]) {
    const [m] = normalizeMarkers([{ ...base, route: bad }]);
    assert.equal("route" in m, false, `route=${JSON.stringify(bad)} must be dropped`);
  }
  assert.equal("route" in normalizeMarkers([base])[0], false, "absent stays absent — byte-identical to a pre-6.27.0 marker");
});

test("✧ ROUTED STAGE: the stage agent's rows are billed to the routed build on the SERVED model, beside the three orchestrator rows", () => {
  const { root, projectsDir } = stageRouted();
  const markersBase = writeMarkers(root, "feat", routedMarkers());
  const led = renderLedger({ name: "feat", command: "/pharn-ship", sessionId: ROUTED_SESSION, projectsDir, markersBase });
  assert.equal(led.coverage, "partial");
  assert.equal(led.requests.length, 8, "5 parent + 3 stage-agent rows — the .meta.json adds none");

  const bucket = led.requests.filter((r) => r.stage === "pharn-build" && r.iteration === 1);
  const agentRows = bucket.filter((r) => r.sidechain);
  const orchRows = bucket.filter((r) => !r.sidechain);
  assert.equal(agentRows.length, 3, "NON-VACUITY (L34): the routed stage's sidechain rows exist");
  assert.deepEqual([...new Set(agentRows.map((r) => r.model))], ["claude-sonnet-5"], "one SERVED model, the routed one");
  assert.deepEqual([...new Set(agentRows.map((r) => r.agent_id))], [ROUTED_AGENT_ID], "agent_id is the id, never the TYPE");
  assert.ok(!led.requests.some((r) => r.agent_id === "general-purpose"), "attributionAgent's type never becomes an id");
  assert.deepEqual(
    orchRows.map((r) => r.request_id),
    ["req_rs_p2", "req_rs_p3", "req_rs_p4"],
    "the bracket's orchestrator rows: the Agent call, the read, and the closing marker's issuer (G-P6)"
  );
  assert.ok(orchRows.every((r) => r.model === "claude-opus-5-5"));
  // The view a reader of §12 uses.
  const view = (model) => led.by_stage_iteration_model.find((v) => v.stage === "pharn-build" && v.iteration === 1 && v.model === model);
  assert.equal(view("claude-sonnet-5").requests, 3);
  assert.equal(view("claude-opus-5-5").requests, 3);
  assert.equal(view("claude-sonnet-5").tokens.output, 500, "120 + 300 + 80");
  // The REQUESTED route survives into cost.json beside the SERVED model.
  const start = led.markers.find((m) => m.kind === "stage-start");
  assert.equal(start.route, "agent:sonnet");
  // And the file checks GREEN — internally, and re-derived from the transcript under the recorded markers.
  const { reds } = checkLedger(led, { verifyTranscript: true, projectsDir });
  assert.deepEqual(reds, []);
});

test("✧ ROUTED STAGE non-vacuity: a stage-start written AFTER the agent's rows bills them elsewhere (L60)", () => {
  const { root, projectsDir } = stageRouted();
  const markersBase = writeMarkers(root, "feat", routedMarkers("2026-09-26T10:04:45.000Z"));
  const led = renderLedger({ name: "feat", command: "/pharn-ship", sessionId: ROUTED_SESSION, projectsDir, markersBase });
  const billed = led.requests.filter((r) => r.stage === "pharn-build" && r.sidechain);
  assert.notEqual(billed.length, 3, "the mutant must move the agent's rows out of the build bucket");
  assert.ok(
    led.requests.some((r) => r.sidechain && r.stage === null),
    "they land in the unattributed bucket — which is why the bracket discipline is a command rule"
  );
});

test("✧ ROUTED STAGE: the .meta.json sibling is in the fixture, and the walk never reads it", () => {
  const { projectDir } = stageRouted();
  const sub = join(projectDir, ROUTED_SESSION, "subagents");
  assert.deepEqual(
    readdirSync(sub).sort(),
    [`agent-${ROUTED_AGENT_ID}.jsonl`, `agent-${ROUTED_AGENT_ID}.meta.json`],
    "CONTROL: the sibling exists"
  );
  const files = transcriptFiles(projectDir).map((f) => f.slice(projectDir.length + 1));
  assert.deepEqual(
    files,
    [`${ROUTED_SESSION}.jsonl`, `${ROUTED_SESSION}/subagents/agent-${ROUTED_AGENT_ID}.jsonl`],
    "only .jsonl files are walked"
  );
});

test("L63 INERTNESS: `route` changes no re-derivation of markers[] — membership, attribution, rows, outcome, currency, --verify-transcript", () => {
  const { root, projectsDir } = stageRouted();
  const withRoute = routedMarkers();
  const without = routedMarkers(undefined, null);
  assert.equal(withRoute[1].route, "agent:sonnet", "precondition: the two marker sets differ by the route key");
  assert.equal("route" in without[1], false);
  const baseA = writeMarkers(join(root, "a"), "feat", withRoute);
  const baseB = writeMarkers(join(root, "b"), "feat", without);
  // A feature dir with verify PASS + no-regressions, so the ship outcome derivation has verdicts to read.
  const repo = join(root, "repo");
  const fdir = join(repo, "pharn", "features", "feat");
  mkdirSync(fdir, { recursive: true });
  writeFileSync(join(fdir, "verify-report.json"), JSON.stringify({ verdict: "PASS" }));
  writeFileSync(join(fdir, "regression-report.json"), JSON.stringify({ verdict: "no-regressions" }));
  const a = renderLedger({ name: "feat", command: "/pharn-ship", repo, sessionId: ROUTED_SESSION, projectsDir, markersBase: baseA });
  const b = renderLedger({ name: "feat", command: "/pharn-ship", repo, sessionId: ROUTED_SESSION, projectsDir, markersBase: baseB });
  // run-window-core (membership, and check-cost-ledger rule 8's recompute) — identical.
  assert.deepEqual(a.membership, b.membership);
  // runWindow's result carries a closure (`openings`), so compare its data and what the closure answers.
  const winA = runWindow(normalizeMarkers(withRoute), ROUTED_SESSION);
  const winB = runWindow(normalizeMarkers(without), ROUTED_SESSION);
  const data = ({ openings, ...rest }) => (void openings, rest);
  assert.deepEqual(data(winA), data(winB));
  assert.deepEqual(winA.openings(ROUTED_SESSION), winB.openings(ROUTED_SESSION));
  // attribute() — identical stage attribution per request.
  assert.deepEqual(a.requests, b.requests);
  for (const r of a.requests)
    assert.deepEqual(attribute(normalizeMarkers(withRoute), r.ts, r.session_id), attribute(normalizeMarkers(without), r.ts, r.session_id));
  // Every view, and the ship outcome (ship-outcome-core) — identical.
  for (const k of ["totals", "by_model", "by_stage_iteration_model", "unattributed", "outcome"]) assert.deepEqual(a[k], b[k], k);
  // render-run-report's staleness identity (the latest run-start's seq and ts) — each ledger is CURRENT
  // against the OTHER's live markers.
  assert.equal(ledgerCurrency(a, without).state, "current");
  assert.equal(ledgerCurrency(b, withRoute).state, "current");
  // The only difference is the route key itself.
  assert.deepEqual(
    a.markers.map(({ route, ...rest }) => (void route, rest)),
    b.markers
  );
  // check-cost-ledger --verify-transcript passes the RECORDED markers into deriveLedger: GREEN for both.
  assert.deepEqual(checkLedger(a, { verifyTranscript: true, projectsDir, repo }).reds, []);
  assert.deepEqual(checkLedger(b, { verifyTranscript: true, projectsDir, repo }).reds, []);
});

// ===================================================================================================
// RUN CONTEXT (`run-window/2`, 6.29.0) — the regression set for finding H3: "a cost ledger counts only its
// own run's requests, never a concurrent run's in the same session". A subagent's Bash sees its PARENT's
// session id, so the window alone admitted every concurrent context's request inside it: three /pharn-loop
// runs in three background agents of one session shared most of their rows, main-thread rows included
// (.dev/measurements/cost-ledger-run-scope-2026-09-27.md). Synthetic transcripts in the MEASURED shape
// (agent files named for their agentId, spawns recorded as the parent's tool_use + the child's meta, marker
// lines recorded as tool results), explicit timestamps, and every expected number a literal (L43).
// ===================================================================================================

import { sessionRequests, sessionScan } from "./transcript-core.mjs";
import { isMember, runWindow as runWindowFor, CONTEXT_REASONS } from "./run-window-core.mjs";
import { rowContext, MEMBERSHIP_KEYS } from "./render-cost-ledger.mjs";

const CS = "00000000-0000-4000-8000-0000000000c1"; // one session, three contexts
const AGENT_A = "a1c0ffee0000000001"; // runs `fa`
const AGENT_B = "a2c0ffee0000000002"; // runs `fb`, concurrently

/** Two concurrent runs, each orchestrated by its own background agent of ONE session, plus main-thread requests
 *  inside both windows — the H3 shape. `fa` = [10:01, 10:30], `fb` = [10:02, 10:35]. */
function concurrentRuns() {
  const { root, projectsDir } = synth(
    CS,
    [
      rec({ id: "main-before", ts: "2026-09-25T09:59:00.000Z", sid: CS, input: 1000 }),
      rec({ id: "main-in-both", ts: "2026-09-25T10:08:00.000Z", sid: CS, input: 100 }),
      rec({ id: "main-in-both-2", ts: "2026-09-25T10:20:00.000Z", sid: CS, input: 200 }),
    ],
    {
      [`agent-${AGENT_A}`]: [
        rec({ id: "a-1", ts: "2026-09-25T10:05:00.000Z", sid: CS, input: 1, side: true, agent: AGENT_A }),
        rec({ id: "a-2", ts: "2026-09-25T10:10:00.000Z", sid: CS, input: 2, side: true, agent: AGENT_A }),
      ],
      [`agent-${AGENT_B}`]: [
        rec({ id: "b-1", ts: "2026-09-25T10:06:00.000Z", sid: CS, input: 10, side: true, agent: AGENT_B }),
        rec({ id: "b-2", ts: "2026-09-25T10:12:00.000Z", sid: CS, input: 20, side: true, agent: AGENT_B }),
      ],
    }
  );
  const dir = join(projectsDir, "p");
  spawnAgent(dir, CS, AGENT_A, { ts: "2026-09-25T10:00:00.000Z" });
  spawnAgent(dir, CS, AGENT_B, { ts: "2026-09-25T10:00:30.000Z" });
  const fa = writeMarkers(
    root,
    "fa",
    [marker(1, "run-start", null, null, "2026-09-25T10:01:00.000Z", CS), marker(2, "run-stop", null, null, "2026-09-25T10:30:00.000Z", CS)],
    { printedBy: AGENT_A }
  );
  const fb = writeMarkers(
    root,
    "fb",
    [marker(1, "run-start", null, null, "2026-09-25T10:02:00.000Z", CS), marker(2, "run-stop", null, null, "2026-09-25T10:35:00.000Z", CS)],
    { printedBy: AGENT_B }
  );
  return { root, projectsDir, dir, fa, fb };
}

test("★ H3: two concurrent runs in agents of ONE session each count only their own agent — disjoint rows, the main thread in neither", () => {
  const { projectsDir, fa, fb } = concurrentRuns();
  const a = renderLedger({ name: "fa", sessionId: CS, projectsDir, markersBase: fa });
  const b = renderLedger({ name: "fb", sessionId: CS, projectsDir, markersBase: fb });
  assert.deepEqual(
    a.requests.map((r) => r.request_id),
    ["a-1", "a-2"]
  );
  assert.deepEqual(
    b.requests.map((r) => r.request_id),
    ["b-1", "b-2"]
  );
  assert.equal(a.totals.tokens.input, 3, "1 + 2: none of B's 30 and none of the main thread's 300");
  assert.equal(b.totals.tokens.input, 30);
  assert.equal(a.membership.method, "run-window/2");
  assert.equal(a.membership.context, `agent:${AGENT_A}`, "bound to the agent that printed fa's markers");
  assert.deepEqual(a.membership.contexts, [`agent:${AGENT_A}`]);
  assert.equal(b.membership.context, `agent:${AGENT_B}`);
  // excluded_requests counts every session request outside the run: main-before (time) + B's two and the main
  // thread's two inside fa's window (context).
  assert.equal(a.membership.excluded_requests, 5);
  assert.match(a.coverage_note, /5 session request\(s\) outside the run were excluded, 4 of them inside the window from other contexts/);
  for (const led of [a, b]) {
    assert.deepEqual(checkLedger(led).reds, [], "each ledger is GREEN");
    assert.deepEqual(checkLedger(led, { verifyTranscript: true, projectsDir }).reds, [], "and re-derives from the transcript");
  }
});

test("★ H3 CONTROL (L60): on the SAME bytes the window alone — run-window/1 — would have shared rows and counted the main thread", () => {
  const { projectsDir, fa, fb } = concurrentRuns();
  const { requests } = sessionRequests(join(projectsDir, "p"), CS);
  const windowOnly = (base, name) => {
    const win = runWindowFor(readMarkers(join(base, name, "markers.jsonl")), CS);
    return requests.filter((q) => isMember(win, q.record.timestamp, q.record.sessionId)).map((q) => q.id);
  };
  const oldA = windowOnly(fa, "fa");
  const oldB = windowOnly(fb, "fb");
  const shared = oldA.filter((id) => oldB.includes(id));
  assert.ok(shared.length >= 4, `the window alone shares rows between the two runs (shared ${shared.join(", ")})`);
  assert.ok(oldA.includes("main-in-both") && oldA.includes("b-1"), "and puts the main thread's and B's requests into A's run");
});

test("★ R1: a FOREGROUND agent's report quoting its run's marker line lands in the orchestrator's TOOL RESULT — the run becomes unknown, never re-bound", () => {
  const { projectsDir, dir, fa } = concurrentRuns();
  // The shape measured on 2026-09-27: a foreground Agent call's return is a `tool_result` whose content is text blocks.
  const line = markerLine(normalizeMarkers([marker(1, "run-start", null, null, "2026-09-25T10:01:00.000Z", CS)])[0]);
  appendFileSync(
    join(dir, `${CS}.jsonl`),
    JSON.stringify({
      type: "user",
      sessionId: CS,
      timestamp: "2026-09-25T10:40:00.000Z",
      isSidechain: false,
      message: {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "toolu_fx_report", content: [{ type: "text", text: `Done.\n${line}\nall green` }] }],
      },
    }) + "\n"
  );
  const a = renderLedger({ name: "fa", sessionId: CS, projectsDir, markersBase: fa });
  assert.equal(a.membership.status, "unknown");
  assert.equal(a.membership.reason, UNKNOWN_REASONS.AMBIGUOUS_CONTEXT);
  assert.equal(a.coverage, "unavailable");
  assert.deepEqual(a.requests, []);
  assert.deepEqual(checkLedger(a).reds, [], "an honest unknown is well-formed");
});

test("★ R1 CONTROL: a BACKGROUND agent's hand-back, or a human's paste, is a user message — not a tool result — and leaves the binding alone", () => {
  const { projectsDir, dir, fa } = concurrentRuns();
  const line = markerLine(normalizeMarkers([marker(1, "run-start", null, null, "2026-09-25T10:01:00.000Z", CS)])[0]);
  // The shapes measured on 2026-09-27: a background hand-back arrives as a `queue-operation` record and a `user`
  // record whose content is a STRING; a human's paste is a `user` record too.
  appendFileSync(
    join(dir, `${CS}.jsonl`),
    [
      JSON.stringify({
        type: "queue-operation",
        sessionId: CS,
        timestamp: "2026-09-25T10:40:00.000Z",
        content: `<agent-message>\n${line}\n`,
      }),
      JSON.stringify({
        type: "user",
        sessionId: CS,
        timestamp: "2026-09-25T10:40:00.100Z",
        isSidechain: false,
        message: { role: "user", content: `Another Claude session sent a message:\n${line}` },
      }),
      JSON.stringify({
        type: "user",
        sessionId: CS,
        timestamp: "2026-09-25T10:41:00.000Z",
        isSidechain: false,
        message: { role: "user", content: [{ type: "text", text: line }] },
      }),
    ].join("\n") + "\n"
  );
  const a = renderLedger({ name: "fa", sessionId: CS, projectsDir, markersBase: fa });
  assert.equal(a.membership.status, "bounded");
  assert.equal(a.membership.context, `agent:${AGENT_A}`);
  assert.deepEqual(
    a.requests.map((r) => r.request_id),
    ["a-1", "a-2"]
  );
});

test("★ the orchestrator's own Bash reading a sub-run's output back is a second holder: unknown (the mention case refuses)", () => {
  const { projectsDir, dir, fb } = concurrentRuns();
  const line = markerLine(normalizeMarkers([marker(2, "run-stop", null, null, "2026-09-25T10:35:00.000Z", CS)])[0]);
  appendFileSync(join(dir, `${CS}.jsonl`), toolResultLine(CS, "main", "2026-09-25T10:50:00.000Z", line, 99) + "\n");
  const b = renderLedger({ name: "fb", sessionId: CS, projectsDir, markersBase: fb });
  assert.equal(b.membership.reason, UNKNOWN_REASONS.AMBIGUOUS_CONTEXT);
});

test("NO_CONTEXT: a run whose marker lines reached no tool result is unknown — never bound by guess", () => {
  const { root, projectsDir } = synth(CS, [rec({ id: "m-1", ts: "2026-09-25T10:05:00.000Z", sid: CS, input: 5 })]);
  const base = writeMarkers(
    root,
    "fx",
    [marker(1, "run-start", null, null, "2026-09-25T10:00:00.000Z", CS), marker(2, "run-stop", null, null, "2026-09-25T10:30:00.000Z", CS)],
    { printedBy: null }
  );
  const led = renderLedger({ name: "fx", sessionId: CS, projectsDir, markersBase: base });
  assert.equal(led.membership.status, "unknown");
  assert.equal(led.membership.reason, UNKNOWN_REASONS.NO_CONTEXT);
  assert.equal(led.membership.start, "2026-09-25T10:00:00.000Z", "the window's own bounds are kept — they are re-derivable");
  assert.equal(led.membership.excluded_requests, null);
  assert.equal(led.membership.context, null);
  assert.equal(led.membership.contexts, null);
  assert.deepEqual(checkLedger(led).reds, []);
});

test("UNLINKED_CONTEXT: an agent with no spawn record working inside the window makes the run unknown, whoever ran it", () => {
  const { root, projectsDir } = synth(CS, [rec({ id: "m-1", ts: "2026-09-25T10:05:00.000Z", sid: CS, input: 5 })], {
    "agent-a9nometa00000000": [
      rec({ id: "x-1", ts: "2026-09-25T10:06:00.000Z", sid: CS, input: 7, side: true, agent: "a9nometa00000000" }),
    ],
  });
  const base = writeMarkers(root, "fx", [
    marker(1, "run-start", null, null, "2026-09-25T10:00:00.000Z", CS),
    marker(2, "run-stop", null, null, "2026-09-25T10:30:00.000Z", CS),
  ]);
  const led = renderLedger({ name: "fx", sessionId: CS, projectsDir, markersBase: base });
  assert.equal(led.membership.reason, UNKNOWN_REASONS.UNLINKED_CONTEXT, "no meta: the agent may or may not be the run's");
  assert.deepEqual(led.requests, []);
  assert.ok(CONTEXT_REASONS.includes(led.membership.reason));
});

test("a NESTED agent (spawned by the run's agent inside the window) is the run's; the rest of the tree is not", () => {
  const { projectsDir, dir, fa } = concurrentRuns();
  const nested = "a3nested000000000003";
  mkdirSync(join(dir, CS, "subagents"), { recursive: true });
  writeFileSync(
    join(dir, CS, "subagents", `agent-${nested}.jsonl`),
    rec({ id: "n-1", ts: "2026-09-25T10:15:00.000Z", sid: CS, input: 40, side: true, agent: nested }) + "\n"
  );
  spawnAgent(dir, CS, nested, { ts: "2026-09-25T10:14:00.000Z", parent: AGENT_A });
  const a = renderLedger({ name: "fa", sessionId: CS, projectsDir, markersBase: fa });
  assert.deepEqual(
    a.requests.map((r) => r.request_id),
    ["a-1", "a-2", "n-1"]
  );
  assert.deepEqual(a.membership.contexts, [`agent:${AGENT_A}`, `agent:${nested}`]);
});

test("the run's agents are the ones spawned DURING it: a background agent the main thread spawned before its run-start is excluded (and admitted when spawned inside)", () => {
  const build = (spawnTs) => {
    const { root, projectsDir } = synth(CS, [rec({ id: "m-1", ts: "2026-09-25T10:05:00.000Z", sid: CS, input: 5 })], {
      "agent-a4bg00000000000004": [
        rec({ id: "bg-1", ts: "2026-09-25T10:07:00.000Z", sid: CS, input: 70, side: true, agent: "a4bg00000000000004" }),
      ],
    });
    spawnAgent(join(projectsDir, "p"), CS, "a4bg00000000000004", { ts: spawnTs });
    const base = writeMarkers(root, "fx", [
      marker(1, "run-start", null, null, "2026-09-25T10:00:00.000Z", CS),
      marker(2, "run-stop", null, null, "2026-09-25T10:30:00.000Z", CS),
    ]);
    return renderLedger({ name: "fx", sessionId: CS, projectsDir, markersBase: base });
  };
  const before = build("2026-09-25T09:50:00.000Z");
  assert.deepEqual(
    before.requests.map((r) => r.request_id),
    ["m-1"],
    "spawned before the run: its in-window work is not the run's"
  );
  assert.deepEqual(before.membership.contexts, ["main"]);
  const inside = build("2026-09-25T10:01:00.000Z");
  assert.deepEqual(
    inside.requests.map((r) => r.request_id),
    ["m-1", "bg-1"],
    "CONTROL: spawned inside the run, it is the run's"
  );
});

test("a record whose context disagrees with its FILE is undecidable (GRILL G2): isSidechain false inside an agent file makes the run unknown", () => {
  const { root, projectsDir } = synth(CS, [rec({ id: "m-1", ts: "2026-09-25T10:05:00.000Z", sid: CS, input: 5 })], {
    "agent-a5drift0000000005": [rec({ id: "d-1", ts: "2026-09-25T10:06:00.000Z", sid: CS, input: 9, side: false })],
  });
  spawnAgent(join(projectsDir, "p"), CS, "a5drift0000000005", { ts: "2026-09-25T10:01:00.000Z" });
  const base = writeMarkers(root, "fx", [
    marker(1, "run-start", null, null, "2026-09-25T10:00:00.000Z", CS),
    marker(2, "run-stop", null, null, "2026-09-25T10:30:00.000Z", CS),
  ]);
  const led = renderLedger({ name: "fx", sessionId: CS, projectsDir, markersBase: base });
  assert.equal(led.membership.reason, UNKNOWN_REASONS.UNLINKED_CONTEXT, "it would have read as main, the fail-open direction");
});

test("EMITTER == CHECKER: every emitted row's rowContext equals the context the reader decided for its request", () => {
  const cases = [
    () => {
      const s = stageSubagents();
      return { projectsDir: s.projectsDir, sid: SUB_SESSION, base: openRun(s.root, "feat"), dir: join(s.projectsDir, "wt") };
    },
    () => {
      const s = stageRouted();
      return { projectsDir: s.projectsDir, sid: ROUTED_SESSION, base: writeMarkers(s.root, "feat", routedMarkers()), dir: s.projectDir };
    },
    () => {
      const s = concurrentRuns();
      return { projectsDir: s.projectsDir, sid: CS, base: s.fa, name: "fa", dir: s.dir };
    },
  ];
  let rows = 0;
  for (const make of cases) {
    const { projectsDir, sid, base, name = "feat", dir } = make();
    const led = renderLedger({ name, sessionId: sid, projectsDir, markersBase: base });
    const ctxOf = new Map(sessionScan(dir, sid, []).requests.map((q) => [q.id, q.context]));
    for (const r of led.requests) {
      rows++;
      assert.equal(rowContext(r), ctxOf.get(r.request_id), `${r.request_id}: the checker reads the emitter's context`);
    }
  }
  assert.ok(rows >= 10, `NON-VACUITY (L34): ${rows} rows compared`);
});

test("membership carries the two context keys, in the closed order, on a measured ledger", () => {
  const { projectsDir, fa } = concurrentRuns();
  const led = renderLedger({ name: "fa", sessionId: CS, projectsDir, markersBase: fa });
  assert.deepEqual(Object.keys(led.membership), [...MEMBERSHIP_KEYS]);
  assert.ok(MEMBERSHIP_KEYS.includes("context") && MEMBERSHIP_KEYS.includes("contexts"));
});

// ─── the contract's named residuals, each PINNED as it behaves today (L37: a stated bound is probed) ──

const window1030 = () => [
  marker(1, "run-start", null, null, "2026-09-25T10:00:00.000Z", CS),
  marker(2, "run-stop", null, null, "2026-09-25T10:30:00.000Z", CS),
];

test("RESIDUAL cost-ledger-workflow-agents: a Workflow-tool agent working inside the window is unlinked by construction — the run is unknown", () => {
  const WF = "a6wf000000000006";
  const build = (ts) => {
    const { root, projectsDir } = synth(CS, [rec({ id: "m-1", ts: "2026-09-25T10:05:00.000Z", sid: CS, input: 5 })]);
    const wf = join(projectsDir, "p", CS, "subagents", "workflows", "wf_fx1");
    mkdirSync(wf, { recursive: true });
    writeFileSync(join(wf, `agent-${WF}.jsonl`), rec({ id: "w-1", ts, sid: CS, input: 3, side: true, agent: WF }) + "\n");
    // The measured Workflow meta: a phase, and no toolUseId.
    writeFileSync(join(wf, `agent-${WF}.meta.json`), JSON.stringify({ agentType: "workflow", workflowPhase: "build" }) + "\n");
    return renderLedger({ name: "fx", sessionId: CS, projectsDir, markersBase: writeMarkers(root, "fx", window1030()) });
  };
  const inside = build("2026-09-25T10:06:00.000Z");
  assert.equal(inside.membership.reason, UNKNOWN_REASONS.UNLINKED_CONTEXT);
  // CONTROL: the same agent working only AFTER the window is excluded by time, never placed — the run is measured.
  const after = build("2026-09-25T10:40:00.000Z");
  assert.equal(after.membership.status, "bounded");
  assert.deepEqual(
    after.requests.map((r) => r.request_id),
    ["m-1"]
  );
});

test("RESIDUAL cost-ledger-mention-only: lines held ONLY by a context that read them back bind the run to THAT context — the rule cannot tell a reader from a printer", () => {
  // The run printed with its output redirected, so nothing reached the main thread's tool results; agent R, which
  // the main thread spawned during the run, later read the output back.
  const R = "a7reader0000000007";
  const { root, projectsDir } = synth(CS, [rec({ id: "m-1", ts: "2026-09-25T10:05:00.000Z", sid: CS, input: 5 })], {
    [`agent-${R}`]: [rec({ id: "r-1", ts: "2026-09-25T10:06:00.000Z", sid: CS, input: 6, side: true, agent: R })],
  });
  spawnAgent(join(projectsDir, "p"), CS, R, { ts: "2026-09-25T10:01:00.000Z" });
  const led = renderLedger({
    name: "fx",
    sessionId: CS,
    projectsDir,
    markersBase: writeMarkers(root, "fx", window1030(), { printedBy: R }),
  });
  assert.equal(led.membership.context, `agent:${R}`, "measured, as the reader's run");
  assert.deepEqual(
    led.requests.map((r) => r.request_id),
    ["r-1"]
  );
});

test("RESIDUAL cost-ledger-shared-markers-file: two runs appending to ONE markers file are refused as ambiguous only when both printed lines of the current run", () => {
  const A = "a8runa0000000008";
  const B = "a9runb0000000009";
  const build = (printedByA) => {
    const { root, projectsDir } = synth(CS, [], {
      [`agent-${A}`]: [rec({ id: "a-1", ts: "2026-09-25T10:05:00.000Z", sid: CS, input: 1, side: true, agent: A })],
      [`agent-${B}`]: [rec({ id: "b-1", ts: "2026-09-25T10:06:00.000Z", sid: CS, input: 2, side: true, agent: B })],
    });
    const dir = join(projectsDir, "p");
    spawnAgent(dir, CS, A, { ts: "2026-09-25T09:58:00.000Z" });
    spawnAgent(dir, CS, B, { ts: "2026-09-25T09:59:00.000Z" });
    // A's run-start, then B's run-start in the SAME file, then A's stage-start, then B's run-stop.
    const markers = [
      marker(1, "run-start", null, null, "2026-09-25T10:00:00.000Z", CS),
      marker(2, "run-start", null, null, "2026-09-25T10:01:00.000Z", CS),
      marker(3, "stage-start", "pharn-build", 1, "2026-09-25T10:02:00.000Z", CS),
      marker(4, "run-stop", null, null, "2026-09-25T10:30:00.000Z", CS),
    ];
    const base = writeMarkers(root, "fs", markers, { printedBy: null });
    const lines = normalizeMarkers(markers).map((m) => markerLine(m));
    const byA = printedByA.map((i) => toolResultLine(CS, A, markers[i].ts, lines[i], 10 + i));
    const byB = [1, 3].filter((i) => !printedByA.includes(i)).map((i) => toolResultLine(CS, B, markers[i].ts, lines[i], 20 + i));
    appendFileSync(contextFile(dir, CS, A), byA.join("\n") + "\n");
    appendFileSync(contextFile(dir, CS, B), byB.join("\n") + "\n");
    return renderLedger({ name: "fs", sessionId: CS, projectsDir, markersBase: base });
  };
  // A printed its run-start AND the stage-start that follows B's run-start: both hold a line of the current run.
  assert.equal(build([0, 2]).membership.reason, UNKNOWN_REASONS.AMBIGUOUS_CONTEXT);
  // A printed only its own run-start, which B's supersedes: the current run's lines are B's alone, and B is measured.
  const onlyB = build([0]);
  assert.equal(onlyB.membership.context, `agent:${B}`);
  assert.deepEqual(
    onlyB.requests.map((r) => r.request_id),
    ["b-1"]
  );
});

// ── 6.35.0 (run-performance-breakdown): the `executions` view and the `work[]` facts ─────────────────────────────

/** A bounded run with every stage bracketed by its orchestrator return, plus a work.jsonl beside the markers. */
function perfRun({ work = null } = {}) {
  const { root, projectsDir } = stageSingle();
  const markersBase = writeMarkers(root, "feat", [
    marker(1, "run-start", null, null, "2026-09-21T08:00:00.000Z"),
    marker(2, "stage-start", "pharn-build", 1, "2026-09-21T08:36:00.000Z"),
    marker(3, "orchestrator", null, null, "2026-09-21T08:38:00.000Z"),
    marker(4, "stage-start", "pharn-regress", 1, "2026-09-21T08:38:30.000Z"),
    marker(5, "orchestrator", null, null, "2026-09-21T08:40:00.000Z"),
    marker(6, "stage-start", "pharn-verify", 1, "2026-09-21T08:41:00.000Z"),
    marker(7, "orchestrator", null, null, "2026-09-21T08:44:00.000Z"),
    marker(8, "stage-start", "pharn-verify", 1, "2026-09-21T08:44:10.000Z"),
    marker(9, "run-stop", null, null, "2026-09-21T09:00:00.000Z"),
  ]);
  if (work !== null)
    writeFileSync(
      join(markersBase, "feat", "work.jsonl"),
      work.map((w) => (typeof w === "string" ? w : JSON.stringify(w))).join("\n") + "\n"
    );
  return { root, projectsDir, markersBase };
}

const REGRESS_WORK = {
  schema: "pharn-stage-work/1",
  stage: "pharn-regress",
  ts: "2026-09-21T08:39:59.000Z",
  session_id: null,
  head: { required: 3, executed: 2, reused: 0, no_files: 1 },
  base: { evidence: "fresh", miss: "no-record", required: 3, executed: 2, reused: 0, no_files: 1 },
  install: { exit: 0, timed_out: false, ms: 1234 },
};
const VERIFY_WORK = {
  schema: "pharn-stage-work/1",
  stage: "pharn-verify",
  ts: "2026-09-21T08:43:00.000Z",
  session_id: null,
  gates: { required: 4, executed: 2, reused: 2, no_files: 0 },
};

test("6.35.0 — every ledger carries `executions` (a view over markers) and `work` (facts), after membership", () => {
  const { projectsDir, markersBase } = perfRun({ work: [REGRESS_WORK, VERIFY_WORK] });
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase });
  assert.deepEqual(Object.keys(led).slice(-5), ["membership", "executions", "work", "entry_events", "entry"]);
  assert.deepEqual(led.work, [REGRESS_WORK, VERIFY_WORK]);
  assert.equal(led.executions.method, "stage-start-to-return/1");
  assert.deepEqual(
    led.executions.rows.map((r) => [r.stage, r.iteration, r.run, r.elapsed_ms, r.unmeasured, r.work]),
    [
      ["pharn-build", 1, 1, 120000, null, []],
      ["pharn-regress", 1, 1, 90000, null, [0]],
      ["pharn-verify", 1, 1, 180000, null, [1]],
      ["pharn-verify", 1, 2, null, "no-return-marker", []],
    ]
  );
  assert.deepEqual(checkLedger(led).reds, []);
});

test("✧ 6.35.0 does not move model accounting: requests, every view and membership are identical with and without work.jsonl", () => {
  const a = perfRun();
  const b = perfRun({ work: [REGRESS_WORK, VERIFY_WORK, "not json"] });
  const without = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  const withWork = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: b.projectsDir, markersBase: b.markersBase });
  assert.ok(without.requests.length > 0, "non-vacuity: rows were measured");
  for (const k of [
    "requests",
    "totals",
    "by_model",
    "by_stage_iteration_model",
    "unattributed",
    "membership",
    "markers",
    "coverage",
    "sessions",
  ]) {
    assert.deepStrictEqual(withWork[k], without[k], k);
  }
  // Stage attribution of every request is exactly `attribute()` over the markers — untouched by the new view.
  for (const r of withWork.requests)
    assert.deepEqual({ stage: r.stage, iteration: r.iteration }, attribute(withWork.markers, r.ts, r.session_id));
  assert.deepEqual(
    withWork.dropped.filter((d) => d.startsWith("work.jsonl")),
    ["work.jsonl[2]"],
    "an invalid line is listed by index, never copied"
  );
  assert.deepEqual(without.work, []);
  assert.deepEqual(
    without.executions.rows.map((r) => r.work),
    [[], [], [], []]
  );
});

test("6.35.0 — a work record outside the run window is not a row (the membership test requests use)", () => {
  const early = { ...VERIFY_WORK, ts: "2026-09-21T07:00:00.000Z" };
  const { projectsDir, markersBase } = perfRun({ work: [early, VERIFY_WORK] });
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase });
  assert.deepEqual(led.work, [VERIFY_WORK]);
});

test("6.35.0 — timing needs only markers: a ledger with NO transcript still carries its elapsed rows and work", () => {
  const { markersBase } = perfRun({ work: [VERIFY_WORK] });
  const led = renderLedger({ name: "feat", sessionId: null, projectsDir: join(tmpdir(), "absent-projects"), markersBase });
  assert.equal(led.coverage, "unavailable");
  assert.equal(led.executions.status, "derived");
  assert.equal(led.executions.rows.length, 4);
  assert.deepEqual(led.work, [VERIFY_WORK]);
  assert.deepEqual(checkLedger(led).reds, []);
});

test("6.35.0 LAYOUT — work records and executions rows are one per line; the parse is unchanged", () => {
  const { projectsDir, markersBase } = perfRun({ work: [REGRESS_WORK, VERIFY_WORK] });
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase });
  const text = serializeLedger(led);
  assert.deepStrictEqual(JSON.parse(text), JSON.parse(JSON.stringify(led)));
  const lines = text.split("\n");
  for (const r of led.executions.rows)
    assert.ok(lines.includes(`      ${JSON.stringify(r)},`) || lines.includes(`      ${JSON.stringify(r)}`));
  for (const w of led.work) assert.ok(lines.includes(`    ${JSON.stringify(w)},`) || lines.includes(`    ${JSON.stringify(w)}`));
  assert.ok(text.split("\n").length <= (JSON.stringify(led, null, 2) + "\n").split("\n").length);
});

test("6.35.0 table() — three separate blocks; an unmeasured row prints its reason, never a number", () => {
  const { projectsDir, markersBase } = perfRun({ work: [REGRESS_WORK, VERIFY_WORK] });
  const out = table(renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase }));
  assert.match(out, /observed elapsed — wall clock between PHARN's stage markers \(not CPU, model or tool time; not monotonic\)/);
  assert.match(out, /pharn-regress\s+1\s+1\s+90\.0 s/);
  assert.match(out, /pharn-verify\s+1\s+2\s+unmeasured — no-return-marker/);
  assert.match(
    out,
    /pharn-regress iter 1 run 1: HEAD gates 2 run, 0 reused, 1 nothing-to-run, of 3; BASE fresh \(no-record\) — worktree created, install ran \(exit 0, 1234 ms\)/
  );
  assert.match(out, /pharn-verify iter 1 run 1: gates 2 run, 2 reused, 0 nothing-to-run, of 4/);
  const reused = {
    ...REGRESS_WORK,
    base: { evidence: "reused", miss: null, required: 3, executed: 0, reused: 2, no_files: 1 },
    install: null,
  };
  const { projectsDir: p2, markersBase: m2 } = perfRun({ work: [reused] });
  assert.match(
    table(renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: p2, markersBase: m2 })),
    /BASE REUSED \(no worktree, no install, 0 base gate processes; 2 results from earlier evidence\)/
  );
});

test("GATE-2 — an UNKNOWN run window prints UNKNOWN work, never 'no work'; a known one with no record says so", () => {
  const { projectsDir, markersBase } = perfRun({ work: [VERIFY_WORK] });
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase });
  const unknown = { ...led, membership: { ...led.membership, status: "unknown", reason: "no run-start marker was recorded" }, work: [] };
  const out = table(unknown);
  assert.match(out, /UNKNOWN — the run window is unknown, so no work record was admitted\. Not a zero\./);
  assert.doesNotMatch(out, /no \/pharn-regress or \/pharn-verify execution recorded one/);
  const none = { ...led, work: [], executions: { ...led.executions, rows: led.executions.rows.map((r) => ({ ...r, work: [] })) } };
  assert.match(table(none), /no \/pharn-regress or \/pharn-verify execution recorded one/);
});

test("GATE-2 (L58) — a --verify-transcript re-derivation never reads the live work file", () => {
  const { projectsDir, markersBase } = perfRun({ work: [VERIFY_WORK] });
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase });
  const again = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir, markersBase, markers: led.markers });
  assert.deepEqual(again.work, [], "the recorded-boundary path reads no live work.jsonl");
  assert.deepEqual(led.work, [VERIFY_WORK]);
});

// ── 6.48.0: the entry-gate observations (`entry_events[]` facts + the `entry` view) ─────────────────────────────────
import { TOP_LEVEL_KEYS_PRE_ENTRY, ENTRY_KEYS, entryLines, windowLines } from "./render-cost-ledger.mjs";
import { OBS_SCHEMA } from "./entry-observations.mjs";

const ENONCE = "e".repeat(32);
const eStart = (o = {}) => ({
  schema: OBS_SCHEMA,
  event: "start",
  nonce: ENONCE,
  run: { seq: 1, ts: "2026-09-21T08:00:00.000Z" },
  ts: "2026-09-21T08:00:01.000Z",
  end_ts: "2026-09-21T08:00:01.400Z",
  elapsed_ms: 400,
  outcome: "started",
  session_id: null,
  ...o,
});
const eBegin = (o = {}) => ({
  schema: OBS_SCHEMA,
  event: "segment-begin",
  nonce: ENONCE,
  segment: "5".repeat(16),
  kind: "runner",
  ts: "2026-09-21T08:00:02.000Z",
  session_id: null,
  ...o,
});
const eEnd = (o = {}) => ({
  schema: OBS_SCHEMA,
  event: "segment-end",
  nonce: ENONCE,
  segment: "5".repeat(16),
  kind: "runner",
  ts: "2026-09-21T08:20:02.000Z",
  elapsed_ms: 1199990,
  end: "done",
  gates: 4,
  session_id: null,
  ...o,
});
const eWait = (o = {}) => ({
  schema: OBS_SCHEMA,
  event: "wait",
  nonce: ENONCE,
  call: "9".repeat(16),
  ts: "2026-09-21T08:30:00.000Z",
  end_ts: "2026-09-21T08:30:00.150Z",
  elapsed_ms: 150,
  status: "green",
  takeover: null,
  session_id: null,
  ...o,
});
const writeEntry = (markersBase, lines) =>
  writeFileSync(
    join(markersBase, "feat", "entry.jsonl"),
    lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n"
  );

test("6.48.0 REGRESSION — the same request/marker/work fixture keeps every pre-6.48.0 key identical with and without entry observations", () => {
  const a = perfRun({ work: [REGRESS_WORK, VERIFY_WORK] });
  const without = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  writeEntry(a.markersBase, [eStart(), eBegin(), eEnd(), eWait()]);
  const withEntry = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  assert.deepEqual([...ENTRY_KEYS], ["entry_events", "entry"]);
  assert.ok(without.requests.length > 0, "non-vacuity: the fixture has request rows");
  for (const k of TOP_LEVEL_KEYS_PRE_ENTRY) assert.deepEqual(withEntry[k], without[k], `${k} is unchanged by the observations`);
  for (const k of [
    "requests",
    "totals",
    "by_model",
    "by_stage_iteration_model",
    "unattributed",
    "membership",
    "markers",
    "executions",
    "work",
  ])
    assert.ok(TOP_LEVEL_KEYS_PRE_ENTRY.includes(k), `${k} is among the keys compared`);
  assert.deepEqual(without.entry_events, [], "no entry file: no facts");
  assert.equal(without.entry.invocations.length, 0);
  assert.equal(withEntry.entry_events.length, 4);
  assert.equal(withEntry.entry.invocations[0].lifetime.status, "measured");
  assert.deepEqual(checkLedger(withEntry).reds, []);
  assert.deepEqual(checkLedger(without).reds, []);
});

test("6.48.0 CUTOFF — a segment end written after the run-stop is not a fact (it stays INCOMPLETE); invalid lines are dropped by index; exact duplicates once", () => {
  const a = perfRun({ work: [] });
  const late = eEnd({ ts: "2026-09-21T09:30:00.000Z" }); // run-stop is 09:00
  writeEntry(a.markersBase, [eStart(), eBegin(), eBegin(), late, '{"schema":"x"}', eWait()]);
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  assert.equal(led.entry.cutoff_ts, "2026-09-21T09:00:00.000Z");
  assert.ok(!led.entry_events.some((e) => e.event === "segment-end"), "the late end is not admitted");
  assert.equal(led.entry_events.filter((e) => e.event === "segment-begin").length, 1, "the exact duplicate is dropped");
  assert.ok(led.dropped.includes("entry.jsonl[4]"), "the invalid line is listed by its index");
  const x = led.entry.invocations[0];
  assert.equal(x.segments[0].status, "incomplete", "late completion is NOT converted into completion before the cutoff");
  assert.equal(x.lifetime.status, "incomplete");
  assert.equal(x.segments_union_ms, null);
  assert.deepEqual(checkLedger(led).reds, []);
});

test("6.48.0 RENDER — known zero, unknown, none recorded and not recorded read differently; the ledger window is labelled for what it is", () => {
  const a = perfRun({ work: [] });
  writeEntry(a.markersBase, [eStart({ outcome: "no-gates" })]);
  const zero = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  const zt = entryLines(zero).join("\n");
  assert.match(zt, /lifetime 400 ms \(wall clock, start to the start end record/);
  assert.match(zt, /execution union: 0 ms/);
  writeEntry(a.markersBase, [eStart(), eBegin()]);
  const unknown = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  const ut = entryLines(unknown).join("\n");
  assert.match(ut, /lifetime INCOMPLETE — no end record at or before the cutoff/);
  assert.match(ut, /execution union: UNKNOWN — .*not a zero/);
  assert.doesNotMatch(ut, /execution union: 0 ms/);
  writeEntry(a.markersBase, []);
  const none = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  assert.match(entryLines(none).join("\n"), /no entry invocation recorded in this run/);
  const old = structuredClone(none);
  delete old.entry;
  delete old.entry_events;
  assert.deepEqual(entryLines(old), ["entry gates — not recorded (a ledger written before 6.48.0)"]);
  assert.match(
    windowLines(none)[0],
    /run-start to run-stop marker: 3600\.0 s \(run-stop is written before this ledger, the report and the closeout; not the whole command\)/
  );
  assert.match(table(zero), /entry gates — the background check/);
  const hostile = structuredClone(zero);
  hostile.entry.invocations[0].nonce = JSON.parse('{"toString":1}');
  assert.doesNotThrow(() => entryLines(hostile));
  assert.match(entryLines(hostile).join("\n"), /does not have the shape/);
});

test("REVIEW F2 — a wait call or a start that ENDED after the run-stop is not admitted; a start that did makes its whole invocation unbound", () => {
  const a = perfRun({ work: [] });
  writeEntry(a.markersBase, [eStart(), eBegin(), eEnd(), eWait({ ts: "2026-09-21T08:59:00.000Z", end_ts: "2026-09-21T09:40:00.000Z" })]);
  const led = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  assert.ok(!led.entry_events.some((e) => e.event === "wait"), "the wait ended after the cutoff");
  assert.equal(led.entry.invocations[0].waits_union_ms, null);
  writeEntry(a.markersBase, [eStart({ outcome: "no-gates", end_ts: "2026-09-21T09:30:00.000Z" })]);
  const late = renderLedger({ name: "feat", sessionId: REAL_SESSION, projectsDir: a.projectsDir, markersBase: a.markersBase });
  assert.deepEqual(late.entry_events, []);
  assert.equal(late.entry.invocations.length, 0, "never a 'measured' lifetime ending after the cutoff");
  assert.deepEqual(checkLedger(late).reds, []);
});

// ── 6.49.0: the entry-derived BASE in one line — no worktree, no install, no base process ─────────────────────────────
import { workSummary as workSummaryEntry } from "./render-cost-ledger.mjs";

test("workSummary: an entry-derived BASE says where it came from and that no base process, worktree or install ran", () => {
  const line = workSummaryEntry({
    stage: "pharn-regress",
    head: { required: 3, executed: 3, reused: 0, no_files: 0 },
    base: { evidence: "entry", miss: "no-record", required: 3, executed: 0, reused: 2, no_files: 1 },
    install: null,
  });
  assert.equal(
    line,
    "HEAD gates 3 run, 0 reused, 0 nothing-to-run, of 3; BASE from the entry gates (no worktree, no install, 0 base gate processes; 2 results from this run's entry check, 1 nothing-to-run)"
  );
});
