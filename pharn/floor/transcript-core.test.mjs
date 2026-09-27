// pharn/floor/transcript-core.test.mjs — hermetic tests for the ONE reader of a session transcript's usage:
// the lookup, the walk and `sessionRequests()`. Every test builds a fresh scratch "projects" tree or stages
// a committed fixture, so nothing ever reads the real ~/.claude. The consumers' own tests live beside their
// modules (render-cost-record.test.mjs, render-cost-ledger.test.mjs, check-cost-ledger.test.mjs). The two
// renderers' files each also show their module FOLLOWS a mutated copy of this one (L52 — the set is every
// consumer). check-cost-ledger.test.mjs has no such control: the checker reaches this module only through
// the ledger emitter's `deriveLedger`.
//
// The marked groups:
//   ★ COMPLETED USAGE — the lines of one request need not carry the same usage (measured 2026-09-26), so a
//     request's usage is its line with the greatest `output_tokens`. Pinned over
//     `fixtures/cost-ledger/usage-snapshots/`, which holds the three measured shapes that the old first-line
//     rule gets wrong or a last-line rule would.
//   ★ IDENTITY — a request's identity and timestamp are its FIRST line's, so membership and attribution,
//     which key on the timestamp, do not move with the usage.
//   ★ MUTANT CONTROLS — each ★ assertion is shown to FAIL on the rule it rejects (L60): a first-line and a
//     last-line copy of this module, each anchored exactly once.
//   ✧ ONE OWNER — the transcript-usage read lives in exactly one product-floor module (L35), pinned over
//     the two spellings both pre-6.24.1 copies used.
//   ⚑ LOOKUP — the directory is found by a filename test and never derived (render-cost-record.test.mjs
//     keeps the render-level ⚑ tests, which exercise this lookup through `render()`).
//   ◆ CONTEXTS (6.29.0) — which context each record belongs to (`recordContext`, `fileContext`, `contextOf`), which
//     contexts' TOOL RESULTS hold a wanted line (`sessionScan` holders), and each agent's spawn link — every rule a
//     literal table, every departure the header names read as null, unlinked or no holder.

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, readFileSync, readdirSync, copyFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  findTranscriptDirs,
  transcriptFiles,
  sessionRequests,
  sessionScan,
  recordContext,
  fileContext,
  contextOf,
} from "./transcript-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// A project-directory name in the shape observed on a real machine (anonymised) — data, never derived.
const DIR_PLAIN = "-Users-x-Projects-repo";

function usage({ input = 0, w1h = 0, w5m = 0, read = 0, out = 0, think = 0 } = {}) {
  return {
    input_tokens: input,
    cache_creation_input_tokens: w1h + w5m,
    cache_creation: { ephemeral_1h_input_tokens: w1h, ephemeral_5m_input_tokens: w5m },
    cache_read_input_tokens: read,
    output_tokens: out,
    output_tokens_details: { thinking_tokens: think },
  };
}

function rec(requestId, u, extra = {}) {
  return JSON.stringify({
    type: "assistant",
    requestId,
    timestamp: extra.timestamp ?? "2026-08-18T10:00:00.000Z",
    message: { model: extra.model ?? "claude-opus-5", usage: u },
  });
}

/** A scratch projects dir holding one session transcript, under a LITERAL directory name. */
function scratch({ session = "s1", lines = [], extra = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "transcript-core-"));
  const proj = join(root, DIR_PLAIN);
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, `${session}.jsonl`), lines.join("\n") + "\n");
  for (const [rel, content] of Object.entries(extra)) {
    const p = join(proj, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return { root, proj };
}

const byRequest = (requests) => Object.fromEntries(requests.map((q) => [q.id, q]));

// ─── ⚑ LOOKUP and the walk ───────────────────────────────────────────────────────────────────────────

test("⚑ LOOKUP: findTranscriptDirs returns the containing directory, and returns it SORTED", () => {
  const { root, proj } = scratch({ lines: [rec("r1", usage())] });
  assert.deepEqual(findTranscriptDirs(root, "s1"), [proj]);
  assert.deepEqual(findTranscriptDirs(root, "nobody"), []);
});

test("transcriptFiles returns .jsonl only, sorted, and skips an unreadable subtree", () => {
  const { proj } = scratch({ lines: [rec("r1", usage())], extra: { "notes.txt": "x" } });
  const files = transcriptFiles(proj);
  assert.ok(files.every((f) => f.endsWith(".jsonl")));
  assert.deepEqual([...files].sort(), files);
});

// ─── ★ COMPLETED USAGE — the lines of one request need not agree (6.24.1) ────────────────────────────
//
// `fixtures/cost-ledger/usage-snapshots/` is HAND-AUTHORED from records measured on real transcripts on
// 2026-09-26 (.dev/measurements/cost-dedup-usage-2026-09-26.md). A, B and C copy the numbers and the usage
// shape of three measured requests; D and E are ordinary lines with chosen numbers:
//   A req_fx_snapshots    — three lines reading output 8, 8, 163; the first two carry no thinking detail
//   B req_fx_reappended   — its line, then the SAME line written again later in the file, counts zeroed
//   C req_fx_forked       — two parent lines at 16,886; the forked subagent's file opens with a copy of an
//                           EARLY line (output 9), and that file is walked after the parent's
//   D req_fx_plain, E req_fx_subagent_own — one line each (E is the fork's own request)
// The first-line rule reads A as 8. A last-line rule reads B as 0 and C as 9. Only the greatest-output line
// reads all three right.

const SNAP_SESSION = "00000000-0000-4000-8000-00000000beef";
const SNAP_FIXTURE = join(here, "fixtures", "cost-ledger", "usage-snapshots");
const SNAP_PARENT = join(SNAP_FIXTURE, `${SNAP_SESSION}.jsonl`);
const SNAP_FORK = join(SNAP_FIXTURE, SNAP_SESSION, "subagents", "agent-fff3333333333333.jsonl");

function stageSnapshots() {
  const root = mkdtempSync(join(tmpdir(), "transcript-core-snap-"));
  const proj = join(root, DIR_PLAIN);
  cpSync(SNAP_FIXTURE, proj, { recursive: true });
  return { root, proj };
}

test("★ the usage-snapshots fixture HAS the three shapes — read from its raw bytes, not through the module", () => {
  // NON-VACUITY (L34/L60). If any of these failed, every ★ assertion below could pass for free, so they are
  // derived without the code they are preconditions for.
  const lines = (p) =>
    readFileSync(p, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  const outs = (ls, id) => ls.filter((r) => r.requestId === id).map((r) => r.message.usage.output_tokens);
  const parent = lines(SNAP_PARENT);
  const fork = lines(SNAP_FORK);
  assert.deepEqual(outs(parent, "req_fx_snapshots"), [8, 8, 163], "A: the lines disagree, the largest is last");
  assert.equal(
    parent.find((r) => r.requestId === "req_fx_snapshots").message.usage.output_tokens_details,
    undefined,
    "A's first line has no thinking detail"
  );
  assert.deepEqual(outs(parent, "req_fx_reappended"), [522, 0], "B: the zeroed re-append is written LAST");
  assert.deepEqual(outs(parent, "req_fx_forked"), [16886, 16886], "C: the parent's lines");
  assert.deepEqual(outs(fork, "req_fx_forked"), [9], "C: the fork's copy of an early line");
  // `transcriptFiles()` sorts full paths, and `<id>.jsonl` sorts before `<id>/…` ('.' < '/'), so the fork's
  // copy is walked AFTER the parent's lines — which is what makes a last-line rule pick it.
  const { proj } = stageSnapshots();
  assert.deepEqual(
    transcriptFiles(proj).map((f) => f.slice(proj.length + 1)),
    [`${SNAP_SESSION}.jsonl`, `${SNAP_SESSION}/subagents/agent-fff3333333333333.jsonl`]
  );
});

test("★ COMPLETED USAGE, per request: the early line, the zeroed re-append and the fork's copy each lose", () => {
  const { proj } = stageSnapshots();
  const { files, requests } = sessionRequests(proj, SNAP_SESSION);
  assert.equal(files.length, 2);
  assert.deepEqual(
    requests.map((q) => q.id),
    ["req_fx_snapshots", "req_fx_reappended", "req_fx_plain", "req_fx_forked", "req_fx_subagent_own"],
    "one entry per request, in first-occurrence order — C's fork copy is not a sixth"
  );
  const q = byRequest(requests);
  assert.equal(q.req_fx_snapshots.usage.output_tokens, 163, "not 8 — the first line's early count");
  assert.equal(q.req_fx_snapshots.usage.output_tokens_details.thinking_tokens, 22);
  assert.equal(q.req_fx_reappended.usage.output_tokens, 522, "not 0 — the zeroed re-append is written last");
  assert.equal(q.req_fx_reappended.usage.input_tokens, 2);
  assert.equal(q.req_fx_reappended.usage.cache_read_input_tokens, 223446);
  assert.equal(q.req_fx_forked.usage.output_tokens, 16886, "not 9 — the fork's early copy is walked last");
});

test("★ one line's object, never assembled: the selected line's usage comes back WHOLE", () => {
  // The largest line lacks a field the early line has, and carries a SMALLER cache read. A merge of the two
  // lines would keep `service_tier`; a per-field maximum would keep cache_read 100. Only returning the
  // selected line's own object passes (REVIEW R5: without this, both mutants passed every test).
  const late = usage({ read: 50, out: 9 });
  const { proj } = scratch({ lines: [rec("r1", { ...usage({ read: 100, out: 5 }), service_tier: "early-only" }), rec("r1", late)] });
  const [q] = sessionRequests(proj, "s1").requests;
  assert.deepEqual(q.usage, late);
});

test("★ IDENTITY: a request's record is its FIRST line, so the timestamp membership reads does not move", () => {
  const { proj } = stageSnapshots();
  const q = byRequest(sessionRequests(proj, SNAP_SESSION).requests);
  assert.equal(q.req_fx_snapshots.record.timestamp, "2026-09-26T10:00:00.901Z", "A's first line, not its last (…:01.691)");
  assert.equal(q.req_fx_forked.record.isSidechain, false, "C: the parent's line, walked before the fork's copy");
  assert.equal(q.req_fx_forked.record.agentId, undefined);
  assert.equal(q.req_fx_subagent_own.record.isSidechain, true);
  assert.equal(q.req_fx_subagent_own.record.agentId, "fff3333333333333");
});

test("the returned record carries no message body — `message` is reduced to { model }", () => {
  const { proj } = stageSnapshots();
  for (const q of sessionRequests(proj, SNAP_SESSION).requests) {
    assert.deepEqual(Object.keys(q.record.message), ["model"], `${q.id}: nothing but the model leaves the reader`);
  }
});

test("a tie keeps the EARLIEST line's usage object", () => {
  const { proj } = scratch({
    lines: [rec("r1", { ...usage({ out: 5 }), service_tier: "first" }), rec("r1", { ...usage({ out: 5 }), service_tier: "second" })],
  });
  const [q] = sessionRequests(proj, "s1").requests;
  assert.equal(q.usage.service_tier, "first");
});

test("a non-number output_tokens ranks below every count, and an absent one below 0", () => {
  const absent = usage({ read: 5 });
  delete absent.output_tokens;
  const { proj } = scratch({
    lines: [
      rec("r1", { ...usage({ read: 1 }), output_tokens: "999" }),
      rec("r1", usage({ read: 2, out: 3 })),
      rec("r2", absent),
      rec("r2", usage({ read: 6, out: 0 })),
    ],
  });
  const q = byRequest(sessionRequests(proj, "s1").requests);
  assert.equal(q.r1.usage.cache_read_input_tokens, 2, 'the string "999" never outranks 3');
  assert.equal(q.r2.usage.cache_read_input_tokens, 6, "an absent count ranks below a real 0");
});

// ─── ★ MUTANT CONTROLS — each ★ COMPLETED USAGE assertion can fail (L60) ─────────────────────────────

const CORE_SOURCE = readFileSync(join(here, "transcript-core.mjs"), "utf8");
const RULE_ANCHOR = "else if (outputRank(u) > outputRank(seen.usage)) seen.usage = u;";

/** Import a copy of this module with the selection rule replaced. The anchor must be found exactly once and
 *  the mutant must differ from the source, or the control proves nothing (L60). Every non-test module of the floor
 *  is copied beside the mutant, as the renderers' FOLLOWS controls do, because the module has imports of its own
 *  (since 6.28.1, `./cost-value-core.mjs`), and a lone copy cannot resolve them. */
async function mutantCore(replacement) {
  assert.equal(CORE_SOURCE.split(RULE_ANCHOR).length, 2, "the rule's anchor must occur exactly once");
  const source = CORE_SOURCE.replace(RULE_ANCHOR, replacement);
  assert.notEqual(source, CORE_SOURCE, "the mutant must differ from the source");
  const dir = mkdtempSync(join(tmpdir(), "transcript-core-mutant-"));
  for (const f of readdirSync(here)) {
    if (f.endsWith(".mjs") && !f.endsWith(".test.mjs")) copyFileSync(join(here, f), join(dir, f));
  }
  const file = join(dir, "transcript-core.mjs");
  writeFileSync(file, source);
  return import(pathToFileURL(file).href);
}

test("★ MUTANT CONTROL: the FIRST-line rule reads the 8, 8, 163 request as 8 — the ★ 163 assertion can fail", async () => {
  const m = await mutantCore("// MUTANT: the first line's usage is kept");
  const { proj } = stageSnapshots();
  const q = byRequest(m.sessionRequests(proj, SNAP_SESSION).requests);
  assert.equal(q.req_fx_snapshots.usage.output_tokens, 8);
});

test("★ MUTANT CONTROL: a LAST-line rule reads the re-appended request as 0 and the forked one as 9 — why the rule is max, not last", async () => {
  const m = await mutantCore("else seen.usage = u; // MUTANT: the last line's usage is kept");
  const { proj } = stageSnapshots();
  const q = byRequest(m.sessionRequests(proj, SNAP_SESSION).requests);
  assert.equal(q.req_fx_reappended.usage.output_tokens, 0);
  assert.equal(q.req_fx_forked.usage.output_tokens, 9);
  assert.equal(q.req_fx_snapshots.usage.output_tokens, 163, "the one shape a last-line rule does get right");
});

test("★ MUTANT CONTROL: sessionScan reads through the SAME collector — the first-line mutant reads 8 there too (L52)", async () => {
  const m = await mutantCore("// MUTANT: the first line's usage is kept");
  const { proj } = stageSnapshots();
  const q = byRequest(m.sessionScan(proj, SNAP_SESSION, []).requests);
  assert.equal(q.req_fx_snapshots.usage.output_tokens, 8, "the ledger's reader FOLLOWS the one rule, it has no copy of its own");
});

// ─── ◆ CONTEXTS (6.29.0) ─────────────────────────────────────────────────────────────────────────────

const TS = "2026-09-27T10:00:00.000Z";
const TS_EARLY = "2026-09-27T09:00:00.000Z";
/** The fields a context writes on its records, as measured: main `isSidechain: false` and no `agentId`. */
const fieldsOf = (ctx) => (ctx === "main" ? { isSidechain: false } : { isSidechain: true, agentId: ctx });
const reqLine = (id, ctx, extra = {}) =>
  JSON.stringify({
    type: "assistant",
    requestId: id,
    timestamp: TS,
    ...fieldsOf(ctx),
    message: { model: "claude-opus-5", usage: usage({ out: 1 }) },
    ...extra,
  });
const resultLine = (ctx, content, extra = {}) =>
  JSON.stringify({
    type: "user",
    timestamp: TS,
    ...fieldsOf(ctx),
    message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_x", content }] },
    ...extra,
  });
const spawnLine = (ctx, toolUseId, ts = TS) =>
  JSON.stringify({
    type: "assistant",
    timestamp: ts,
    ...fieldsOf(ctx),
    message: { model: "claude-opus-5", content: [{ type: "tool_use", id: toolUseId, name: "Agent", input: {} }] },
  });
const agentFile = (id) => `s1/subagents/agent-${id}.jsonl`;
const metaFile = (id) => `s1/subagents/agent-${id}.meta.json`;
const metaOf = (toolUseId, extra = {}) => JSON.stringify({ agentType: "general-purpose", toolUseId, spawnDepth: 1, ...extra }) + "\n";
const jsonl = (...lines) => lines.join("\n") + "\n";

test("◆ recordContext: exactly `true` with an admitted agentId is that agent, exactly `false` is main, anything else is null (GRILL G2)", () => {
  // ONE table (L29); each row an independent literal (L43).
  const CASES = [
    [{ isSidechain: false }, "main"],
    [{ isSidechain: false, agentId: "a1" }, "main", "the session's own thread: `agentId` decides nothing"],
    [{ isSidechain: true, agentId: "a1" }, "agent:a1"],
    [{ isSidechain: true }, null, "a sidechain that names no agent"],
    [{ isSidechain: true, agentId: "" }, null],
    [{ isSidechain: true, agentId: "/Users/someone/x" }, null, "a path is not an identity"],
    [{ isSidechain: true, agentId: "a\nb" }, null],
    [{ isSidechain: true, agentId: "v".repeat(129) }, null, "longer than IDENTITY_MAX"],
    [{ isSidechain: true, agentId: 7 }, null],
    [{ isSidechain: true, agentId: { toString: 1 } }, null, "tested before anything coerces it (L62)"],
    [{ isSidechain: "true", agentId: "a1" }, null, "the string is not the boolean"],
    [{ isSidechain: 1 }, null],
    [{ isSidechain: 0 }, null],
    [{ isSidechain: null }, null],
    [{ isSidechain: { toString: 1 } }, null],
    [{}, null, "a format that drops the field reads as undecidable, never as main"],
    [null, null],
    [undefined, null],
    ["main", null],
  ];
  for (const [r, want, why] of CASES) assert.equal(recordContext(r), want, why ?? JSON.stringify(r));
});

test("◆ fileContext: the session's file is main; `subagents/agent-<id>.jsonl` and a Workflow run's are that agent; nothing else names one", () => {
  const CASES = [
    ["s1.jsonl", "main"],
    ["s1/subagents/agent-a1.jsonl", "agent:a1"],
    ["s1/subagents/workflows/wf_1/agent-a2.jsonl", "agent:a2"],
    ["s2.jsonl", null, "another session's file"],
    ["s2/subagents/agent-a1.jsonl", null, "another session's agent"],
    ["s1/agent-a1.jsonl", null, "not under subagents/"],
    ["s1/subagents/nested/agent-a1.jsonl", null, "a directory other than workflows/<run>"],
    ["s1/subagents/workflows/agent-a1.jsonl", null, "workflows/ without a run directory"],
    ["s1/subagents/workflows/wf_1/x/agent-a1.jsonl", null, "deeper than a run directory"],
    ["s1/subagents/agent-.jsonl", null, "an empty id"],
    ["s1/subagents/agent-a1.meta.json", null, "a meta file is not a transcript"],
    [`s1/subagents/agent-${"v".repeat(129)}.jsonl`, null, "an id longer than IDENTITY_MAX"],
    [7, null],
    [null, null],
  ];
  for (const [rel, want, why] of CASES) assert.equal(fileContext(rel, "s1"), want, why ?? String(rel));
});

test("◆ contextOf keeps a record's context only when its FILE agrees — a record naming another context is null (GRILL G2)", () => {
  const CASES = [
    [{ isSidechain: false }, "s1.jsonl", "main"],
    [{ isSidechain: true, agentId: "a1" }, agentFile("a1"), "agent:a1"],
    [{ isSidechain: true, agentId: "a1" }, agentFile("a2"), null, "an agent's record in ANOTHER agent's file"],
    [{ isSidechain: true, agentId: "a1" }, "s1.jsonl", null, "an agent's record in the session's own file"],
    [{ isSidechain: false }, agentFile("a1"), null, "a main record in an agent's file"],
    [{}, "s1.jsonl", null, "undecidable, wherever it sits"],
    [{ isSidechain: false }, "s1/tool-results/x.jsonl", null, "a file that names no context"],
  ];
  for (const [r, rel, want, why] of CASES) assert.equal(contextOf(r, rel, "s1"), want, why ?? `${JSON.stringify(r)} in ${rel}`);
});

test("◆ sessionScan's requests ARE sessionRequests' — same ids, records and usage — each carrying its first line's context", () => {
  const { proj } = stageSnapshots();
  const plain = sessionRequests(proj, SNAP_SESSION);
  const scan = sessionScan(proj, SNAP_SESSION, []);
  assert.deepEqual(scan.files, plain.files);
  assert.deepEqual(
    scan.requests.map(({ id, record, usage: u }) => ({ id, record, usage: u })),
    plain.requests,
    "the one collector, read twice"
  );
  const ctx = Object.fromEntries(scan.requests.map((q) => [q.id, q.context]));
  assert.deepEqual(ctx, {
    req_fx_snapshots: "main",
    req_fx_reappended: "main",
    req_fx_plain: "main",
    req_fx_forked: "main", // its first line is the parent's; the fork's copy is walked after it
    req_fx_subagent_own: "agent:fff3333333333333",
  });
  assert.deepEqual([...scan.named.keys()].sort(), ["agent:fff3333333333333", "main"]);
});

test("◆ named: each context the transcript names, with the EARLIEST parseable time of a line naming it — or null when none parses", () => {
  const { proj } = scratch({
    lines: [
      reqLine("r1", "main", { timestamp: TS }),
      reqLine("r2", "main", { timestamp: TS_EARLY }),
      resultLine("main", "x", { timestamp: "later" }),
    ],
    extra: {
      [agentFile("a1")]: jsonl(reqLine("r3", "a1", { timestamp: "not-a-time" }), resultLine("a1", "y", { timestamp: TS })),
      [agentFile("a2")]: jsonl(resultLine("a2", "z", { timestamp: 7 })),
      [agentFile("a3")]: jsonl(resultLine("a3", "w", { isSidechain: undefined })), // undecidable: names nothing
    },
  });
  const { named } = sessionScan(proj, "s1", []);
  assert.deepEqual(Object.fromEntries(named), { main: TS_EARLY, "agent:a1": TS, "agent:a2": null });
});

test("◆ holders: a wanted line counts only as a WHOLE line of a TOOL RESULT — string or text blocks — in the context that holds it", () => {
  const W = "marker 1: run-start 2026-09-27T10:00:00.000Z";
  const { proj } = scratch({
    lines: [
      resultLine("main", `${W}\nexit=0`), // held by main, as a string
      JSON.stringify({ type: "user", timestamp: TS, isSidechain: false, message: { role: "user", content: `${W}` } }), // a message, not a tool result
      JSON.stringify({
        type: "assistant",
        timestamp: TS,
        isSidechain: false,
        message: { model: "m", content: [{ type: "text", text: W }] },
      }),
    ],
    extra: {
      [agentFile("a1")]: jsonl(
        resultLine("a1", [
          { type: "text", text: `before\n${W}` },
          { type: "image", text: W }, // not a text block
          { type: "text", text: 7 },
        ])
      ),
      [agentFile("a2")]: jsonl(resultLine("a2", `prefix ${W}`), resultLine("a2", `${W} suffix`)), // never a whole line
      [agentFile("a3")]: jsonl(resultLine("a3", W, { isSidechain: undefined })), // an undecidable record
    },
  });
  const { holders } = sessionScan(proj, "s1", [W, "never printed", 7, ""]);
  assert.deepEqual([...(holders.get(W) ?? [])].sort(), ["agent:a1", "main", null].sort());
  assert.equal(holders.has("never printed"), false);
  assert.equal(holders.size, 1, "a non-string or empty wanted line is not looked for");
  // No wanted line: the holder search is skipped entirely.
  assert.equal(sessionScan(proj, "s1", []).holders.size, 0);
  assert.equal(sessionScan(proj, "s1", undefined).holders.size, 0);
});

test("◆ links: an agent's parent is the ONE other context holding its meta's `toolUseId` — nested agents included, at the earliest record", () => {
  const { proj } = scratch({
    lines: [spawnLine("main", "toolu_a1", TS), spawnLine("main", "toolu_a1", TS_EARLY), reqLine("r0", "main")],
    extra: {
      [agentFile("a1")]: jsonl(spawnLine("a1", "toolu_a2"), reqLine("r1", "a1")),
      [metaFile("a1")]: metaOf("toolu_a1"),
      [agentFile("a2")]: jsonl(reqLine("r2", "a2")),
      [metaFile("a2")]: metaOf("toolu_a2", { spawnDepth: 2, parentAgentId: "a1" }),
    },
  });
  const { links } = sessionScan(proj, "s1", []);
  assert.deepEqual(links.get("agent:a1"), { parent: "main", ts: TS_EARLY }, "the earliest copy of the spawn record");
  assert.deepEqual(links.get("agent:a2"), { parent: "agent:a1", ts: TS }, "a nested agent links to the agent that spawned it");
  assert.equal(links.size, 2);
});

test("◆ links: a FORK's own file copies its spawning line, and the fork itself is excluded from the holders", () => {
  const { proj } = scratch({
    lines: [spawnLine("main", "toolu_f1")],
    extra: {
      [agentFile("f1")]: jsonl(spawnLine("f1", "toolu_f1"), reqLine("rf", "f1")),
      [metaFile("f1")]: metaOf("toolu_f1", { agentType: "fork", isFork: true }),
    },
  });
  assert.deepEqual(sessionScan(proj, "s1", []).links.get("agent:f1"), { parent: "main", ts: TS });
});

test("◆ links: every departure the header names leaves the agent UNLINKED — never a guessed parent", () => {
  const elsewhere = mkdtempSync(join(tmpdir(), "transcript-core-meta-"));
  writeFileSync(join(elsewhere, "meta.json"), metaOf("toolu_sym"));
  const { proj } = scratch({
    lines: [spawnLine("main", "toolu_two"), spawnLine("main", "toolu_sym"), spawnLine("main", "toolu_dir")],
    extra: {
      [agentFile("nometa")]: jsonl(reqLine("r1", "nometa")),
      [agentFile("noid")]: jsonl(reqLine("r2", "noid")),
      [metaFile("noid")]: JSON.stringify({ agentType: "general-purpose", spawnDepth: 1 }) + "\n",
      [agentFile("badid")]: jsonl(reqLine("r3", "badid")),
      [metaFile("badid")]: metaOf("/Users/someone/x"),
      [agentFile("orphan")]: jsonl(reqLine("r4", "orphan")),
      [metaFile("orphan")]: metaOf("toolu_nowhere"),
      [agentFile("two")]: jsonl(reqLine("r5", "two")),
      [metaFile("two")]: metaOf("toolu_two"),
      [agentFile("other")]: jsonl(spawnLine("other", "toolu_two")), // a SECOND context holding the same block
      [agentFile("undecided")]: jsonl(reqLine("r6", "undecided")),
      [metaFile("undecided")]: metaOf("toolu_undecided"),
      [agentFile("holder")]: jsonl(JSON.stringify({ ...JSON.parse(spawnLine("holder", "toolu_undecided")), isSidechain: undefined })),
      [agentFile("torn")]: jsonl(reqLine("r7", "torn")),
      [metaFile("torn")]: '{"toolUseId": "toolu_',
      [agentFile("array")]: jsonl(reqLine("r8", "array")),
      [metaFile("array")]: "[1]\n",
      [agentFile("sym")]: jsonl(reqLine("r9", "sym")),
      [agentFile("dir")]: jsonl(reqLine("r10", "dir")),
      "s1/subagents/workflows/wf_1/agent-w1.jsonl": jsonl(reqLine("r11", "w1")),
      "s1/subagents/workflows/wf_1/agent-w1.meta.json": metaOf("toolu_two"),
    },
  });
  symlinkSync(join(elsewhere, "meta.json"), join(proj, metaFile("sym")));
  mkdirSync(join(proj, metaFile("dir")));
  const { links, requests } = sessionScan(proj, "s1", []);
  assert.deepEqual([...links.keys()], [], "no agent above is linked");
  // NON-VACUITY: every agent above is a request context the reader DID place, so only its link is missing.
  assert.deepEqual(
    requests.map((q) => q.context).sort(),
    ["nometa", "noid", "badid", "orphan", "two", "undecided", "torn", "array", "sym", "dir", "w1"].map((a) => `agent:${a}`).sort()
  );
});

test("◆ ★ MUTANT CONTROL: without the fork's self-exclusion the fork reads TWO holders and is unlinked — the exclusion is what links it", async () => {
  const anchor = ".filter((h) => h.ctx !== self)";
  assert.equal(CORE_SOURCE.split(anchor).length, 2, "the self-exclusion's anchor must occur exactly once");
  const source = CORE_SOURCE.replace(anchor, ".filter(() => true)");
  const dir = mkdtempSync(join(tmpdir(), "transcript-core-mutant-"));
  for (const f of readdirSync(here)) if (f.endsWith(".mjs") && !f.endsWith(".test.mjs")) copyFileSync(join(here, f), join(dir, f));
  writeFileSync(join(dir, "transcript-core.mjs"), source);
  const m = await import(pathToFileURL(join(dir, "transcript-core.mjs")).href);
  const { proj } = scratch({
    lines: [spawnLine("main", "toolu_f1")],
    extra: { [agentFile("f1")]: jsonl(spawnLine("f1", "toolu_f1")), [metaFile("f1")]: metaOf("toolu_f1") },
  });
  assert.equal(m.sessionScan(proj, "s1", []).links.has("agent:f1"), false);
});

// ─── ✧ ONE OWNER ─────────────────────────────────────────────────────────────────────────────────────

test("✧ ONE OWNER: exactly one product-floor module reads a transcript record's usage or spells the request-id fallback (L35)", () => {
  // THE BOUND (L36): this pins two SPELLINGS — the ones both pre-6.24.1 copies used. A re-implementation
  // under another spelling (destructuring, a helper, `||` for `??`) escapes it. It catches the shape of
  // the defect it answers: a second module growing its own copy of the reading loop.
  const USAGE_READ = /\bmessage\??\.usage\b/;
  const ID_FALLBACK = /\brequestId\s*\?\?/;
  const spells = (re, text) => text.split("\n").some((line) => re.test(line));
  // NEGATIVE CONTROL, through the SAME predicate: each pattern matches the pre-fix ledger's own line.
  assert.ok(spells(USAGE_READ, "      const u = r.message?.usage;"), "the usage-read pattern catches the copy it exists to catch");
  assert.ok(
    spells(ID_FALLBACK, "      const id = r.requestId ?? r.message?.id;"),
    "the id-fallback pattern catches the copy it exists to catch"
  );
  const modules = readdirSync(here)
    .filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"))
    .sort();
  assert.ok(modules.length > 1, "NON-VACUITY: the walk found the product floor");
  for (const [what, re] of [
    ["the usage read", USAGE_READ],
    ["the request-id fallback", ID_FALLBACK],
  ]) {
    const owners = modules.filter((f) => spells(re, readFileSync(join(here, f), "utf8")));
    assert.deepEqual(
      owners,
      ["transcript-core.mjs"],
      `${what} must live in exactly one module. A COMMENT that spells the pattern counts too — cite sessionRequests() in other modules' prose instead.`
    );
  }
});
