// pharn/floor/entry-context-core.test.mjs — the entry-context guard's rule (entry-context-guard). ★ = behaviour,
// ✧ = a structural pin. The fixture-transcript behaviour lives in check-entry-context.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_ENTRY_CONTEXT_TOKENS,
  EXIT,
  MAX_ENTRY_CONTEXT_TOKENS,
  MIN_ENTRY_CONTEXT_TOKENS,
  REASONS,
  VERDICTS,
  contextKind,
  contextSize,
  decide,
  parseEntryThreshold,
  unknownVerdict,
} from "./entry-context-core.mjs";
import { markerLine } from "./mark-phase.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ── the threshold ─────────────────────────────────────────────────────────────────────────────────────────────

test("★ the default applies with no file, no budget key or no entryContextTokens key — the one copy (L41)", () => {
  const dflt = { ok: true, value: DEFAULT_ENTRY_CONTEXT_TOKENS, source: "default" };
  assert.equal(DEFAULT_ENTRY_CONTEXT_TOKENS, 320000);
  assert.deepEqual(parseEntryThreshold(null), dflt);
  assert.deepEqual(parseEntryThreshold(undefined), dflt);
  assert.deepEqual(parseEntryThreshold("{}"), dflt);
  assert.deepEqual(parseEntryThreshold('{"budget":{"instructionGrowthBytes":2048}}'), dflt);
});

test("★ a configured value inside [1, 1,000,000] is taken, at both bounds", () => {
  for (const v of [MIN_ENTRY_CONTEXT_TOKENS, 250000, MAX_ENTRY_CONTEXT_TOKENS]) {
    assert.deepEqual(parseEntryThreshold(JSON.stringify({ budget: { entryContextTokens: v } })), { ok: true, value: v, source: "config" });
  }
});

test("★ every malformed shape is threshold-malformed, never the default", () => {
  for (const text of [
    "not json",
    "[]",
    "null",
    '{"budget":[]}',
    '{"budget":7}',
    '{"budget":{"entryContextTokens":0}}',
    '{"budget":{"entryContextTokens":1000001}}',
    '{"budget":{"entryContextTokens":-5}}',
    '{"budget":{"entryContextTokens":1.5}}',
    '{"budget":{"entryContextTokens":"320000"}}',
    '{"budget":{"entryContextTokens":null}}',
    '{"budget":{"entryContextTokens":1e300}}',
  ]) {
    const r = parseEntryThreshold(text);
    assert.equal(r.ok, false, text);
    assert.equal(r.reason, "threshold-malformed", text);
    assert.equal(typeof r.detail, "string", text);
  }
});

test("★ L15 — an inherited or `__proto__` key reads as absent, never as a value", () => {
  const dflt = { ok: true, value: DEFAULT_ENTRY_CONTEXT_TOKENS, source: "default" };
  assert.deepEqual(parseEntryThreshold('{"__proto__":{"budget":{"entryContextTokens":5}}}'), dflt);
  assert.deepEqual(parseEntryThreshold('{"budget":{"__proto__":{"entryContextTokens":5}}}'), dflt);
  assert.deepEqual(parseEntryThreshold('{"budget":{"toString":5}}'), dflt);
});

test("★ L62 — a value whose String() throws is quoted by its built-in tag; the parse does not throw", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: this value really does make String() throw");
  const r = parseEntryThreshold('{"budget":{"entryContextTokens":{"toString":1}}}');
  assert.equal(r.ok, false);
  assert.match(r.detail, /\(got "\[object Object\]"\)/);
  const r2 = parseEntryThreshold('{"budget":{"toString":1,"valueOf":2,"x":{"toString":1}},"z":1}');
  assert.equal(r2.ok, true, "unrelated hostile keys are not read");
  const r3 = parseEntryThreshold('{"budget":[{"toString":1}]}');
  assert.equal(r3.ok, false);
  assert.match(r3.detail, /`budget` is not an object \(got "\[object Array\]"\)/);
});

// ── the size and the kind ─────────────────────────────────────────────────────────────────────────────────────

test("★ contextSize sums input, cache writes and cache reads — output is not context", () => {
  assert.equal(
    contextSize({ input_tokens: 2, cache_creation_input_tokens: 3000, cache_read_input_tokens: 400000, output_tokens: 99999 }),
    403002
  );
  assert.equal(contextSize({ input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }), 0);
});

test("★ contextSize is null when any counted class is missing or not an admitted token count", () => {
  for (const u of [
    null,
    [],
    "x",
    {},
    { input_tokens: 1, cache_creation_input_tokens: 1 },
    { input_tokens: 1, cache_creation_input_tokens: -1, cache_read_input_tokens: 1 },
    { input_tokens: 1.5, cache_creation_input_tokens: 1, cache_read_input_tokens: 1 },
    { input_tokens: 1, cache_creation_input_tokens: "1", cache_read_input_tokens: 1 },
    { input_tokens: 1, cache_creation_input_tokens: 1, cache_read_input_tokens: Number.MAX_SAFE_INTEGER + 2 },
  ]) {
    assert.equal(contextSize(u), null, JSON.stringify(u));
  }
});

test("★ contextKind names the kind, never the id", () => {
  assert.equal(contextKind("main"), "main");
  assert.equal(contextKind("agent:a1b2"), "agent");
  assert.equal(contextKind(null), null);
  assert.equal(contextKind("other"), null);
});

// ── the decision and the printed line ─────────────────────────────────────────────────────────────────────────

const T = { ok: true, value: 320000, source: "default" };

test("★ decide: over is strictly greater; at or under is within; the line carries no id", () => {
  const over = decide({ status: "measured", size: 320001, kind: "main" }, T);
  assert.equal(over.verdict, "over");
  assert.equal(over.exit, EXIT.over);
  assert.match(over.line, /^entry-context: over 320001 > 320000 tokens \(context main, threshold default\) — .*fresh session/);
  const at = decide({ status: "measured", size: 320000, kind: "agent" }, T);
  assert.deepEqual(at, {
    verdict: "within",
    exit: EXIT.ok,
    line: "entry-context: within 320000 <= 320000 tokens (context agent, threshold default)",
  });
});

test("★ decide: a malformed threshold wins over any measure, and an unknown measure goes on", () => {
  const bad = { ok: false, reason: "threshold-malformed", detail: "x" };
  const a = decide({ status: "measured", size: 999999, kind: "main" }, bad);
  assert.equal(a.exit, EXIT.ok);
  assert.equal(a.line, `entry-context: unknown threshold-malformed — ${REASONS["threshold-malformed"]}: x; going on`);
  const b = decide({ status: "unknown", reason: "no-holder", detail: null }, T);
  assert.deepEqual(b, { verdict: "unknown", exit: EXIT.ok, line: `entry-context: unknown no-holder — ${REASONS["no-holder"]}; going on` });
});

test("✧ unknown always means go on — every REASONS member exits ok; a non-member is reported as `crashed`", () => {
  for (const reason of Object.keys(REASONS)) {
    const v = unknownVerdict(reason);
    assert.equal(v.exit, EXIT.ok, reason);
    assert.equal(v.verdict, "unknown");
    assert.equal(v.line, `entry-context: unknown ${reason} — ${REASONS[reason]}; going on`);
  }
  assert.match(unknownVerdict("toString").line, /^entry-context: unknown crashed — /);
  assert.match(unknownVerdict("not-a-reason").line, /^entry-context: unknown crashed — /);
});

test("✧ the closed sets are frozen and as specified", () => {
  assert.ok(Object.isFrozen(REASONS) && Object.isFrozen(EXIT) && Object.isFrozen(VERDICTS));
  assert.deepEqual({ ...EXIT }, { ok: 0, usage: 2, over: 3 });
  assert.deepEqual([...VERDICTS], ["within", "over", "unknown"]);
  assert.deepEqual(Object.keys(REASONS), [
    "no-session",
    "no-transcript",
    "several-transcripts",
    "window-unknown",
    "no-holder",
    "several-holders",
    "no-request",
    "usage-unreadable",
    "threshold-malformed",
    "crashed",
  ]);
});

// ── one owner of the binding (L35) ────────────────────────────────────────────────────────────────────────────

test("✧ L35 — the binding is imported from its owners, never re-spelled", () => {
  const src = readFileSync(join(here, "entry-context-core.mjs"), "utf8");
  assert.match(src, /import \{ findTranscriptDirs, sessionScan \} from "\.\/transcript-core\.mjs";/);
  assert.match(src, /import \{ AGENT_CONTEXT_PREFIX, MAIN_CONTEXT, bindRun, bindingMarkers, runWindow \} from "\.\/run-window-core\.mjs";/);
  assert.match(src, /import \{ markerLine \} from "\.\/mark-phase\.mjs";/);
  // no second copy of the reader's loop or the binding rule
  assert.doesNotMatch(src, /readFileSync|JSON\.parse\(line|tool_result|isSidechain/);
  const cli = readFileSync(join(here, "check-entry-context.mjs"), "utf8");
  assert.match(cli, /import \{ readMarkers \} from "\.\/render-cost-ledger\.mjs";/);
  const reader = readFileSync(join(here, "transcript-core.mjs"), "utf8");
  assert.match(reader, /entry-context-core\.mjs/, "transcript-core.mjs's header names its third consumer");
});

// ── L84 / L81 — the stop branch is live: a mutant that never stops fails the stop test ─────────────────────────

test("★ L84 MUTANT CONTROL — with the compare removed, a context over the threshold no longer stops", () => {
  const SID = "11111111-2222-4333-8444-555555555555";
  const marker = { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2026-11-12T10:00:00.000Z", session_id: SID };
  const root = mkdtempSync(join(tmpdir(), "entry-context-mutant-"));
  try {
    const proj = join(root, "projects", "-p");
    mkdirSync(proj, { recursive: true });
    const recs = [
      { type: "user", isSidechain: false, message: { content: [{ type: "tool_result", content: markerLine(marker) }] } },
      {
        type: "assistant",
        isSidechain: false,
        requestId: "req_1",
        message: {
          id: "m1",
          model: "claude-test",
          usage: { input_tokens: 1, cache_creation_input_tokens: 1, cache_read_input_tokens: 500000 },
        },
      },
    ];
    writeFileSync(join(proj, `${SID}.jsonl`), recs.map((r) => JSON.stringify(r)).join("\n") + "\n");
    mkdirSync(join(root, "m", "f"), { recursive: true });
    writeFileSync(join(root, "m", "f", "markers.jsonl"), JSON.stringify(marker) + "\n");
    // The WHOLE floor is copied (L81), then only the compare is mutated.
    const floorWith = (coreSource) => {
      const dir = mkdtempSync(join(root, "floor-"));
      for (const f of readdirSync(here)) if (f.endsWith(".mjs") && !f.endsWith(".test.mjs")) copyFileSync(join(here, f), join(dir, f));
      writeFileSync(join(dir, "entry-context-core.mjs"), coreSource);
      return dir;
    };
    const exitWith = (floor) =>
      spawnSync(
        process.execPath,
        [
          join(floor, "check-entry-context.mjs"),
          "--feature",
          "f",
          "--session",
          SID,
          "--projects-dir",
          join(root, "projects"),
          "--markers-base",
          join(root, "m"),
          "--root",
          root,
        ],
        {
          encoding: "utf8",
        }
      ).status;
    const source = readFileSync(join(here, "entry-context-core.mjs"), "utf8");
    const ANCHOR = "if (measure.size > threshold.value) {";
    assert.equal(source.split(ANCHOR).length, 2, "the compare's anchor occurs exactly once");
    assert.equal(exitWith(floorWith(source)), 3, "control: the real floor stops");
    assert.equal(exitWith(floorWith(source.replace(ANCHOR, "if (false) {"))), 0, "the mutant goes on — the stop test is not vacuous");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
