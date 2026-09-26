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

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { findTranscriptDirs, transcriptFiles, sessionRequests } from "./transcript-core.mjs";

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
 *  the mutant must differ from the source, or the control proves nothing (L60). */
async function mutantCore(replacement) {
  assert.equal(CORE_SOURCE.split(RULE_ANCHOR).length, 2, "the rule's anchor must occur exactly once");
  const source = CORE_SOURCE.replace(RULE_ANCHOR, replacement);
  assert.notEqual(source, CORE_SOURCE, "the mutant must differ from the source");
  const file = join(mkdtempSync(join(tmpdir(), "transcript-core-mutant-")), "transcript-core.mjs");
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
