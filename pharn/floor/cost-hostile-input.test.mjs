// pharn/floor/cost-hostile-input.test.mjs — the cost tooling over CRAFTED input (6.27.1). Two inputs:
//   * a Claude Code TRANSCRIPT, read by transcript-core.mjs for render-cost-record.mjs, render-cost-ledger.mjs and
//     check-cost-ledger.mjs --verify-transcript;
//   * a `cost.json`, read by check-cost-ledger.mjs.
// Every test builds its own scratch tree, so nothing reads the real ~/.claude. The plan is
// .dev/features/cost-transcript-hostile-values/PLAN.md, "Tests to write"; the numbers below are its numbers.
//
// The marked groups:
//   1 CONTROL · 2 ANCHORS · 3 CLASS CLOSURE — the premises: each THROWING value really throws under every coercion
//     (L62), every member path exists in its base line (L60), and the count members are exactly the classes (L36).
//   4 ★ TRANSCRIPT MEMBERS — each member × its alphabet × every consumer: the record, the ledger, and the checker in
//     both modes, each asserting the fallback the plan's table names (L52, L31).
//   8 ★ TRANSCRIPT DOMAIN CLOSURE — EVERY node of both base line shapes × the walk alphabet (L36).
//   10 ★ LEDGER DOMAIN CLOSURE — EVERY node of a GREEN cost.json × the hostile alphabet × both checker modes, plus the
//     measured crash sites as named cases and the right-typed extremes (GRILL R2-G3).
//   11 ✎ FORGERY CLOSURE — every node and every key × a forged verdict line (GRILL R2-G4).
//   and 5 DEPTH · 6 TRANSCRIPT CLI · 7 A GROWN TRANSCRIPT · 9 ARGUMENT CHECK · 12 EXIT-2 BACKSTOP · 13 NEW CHECKER
//   RULES · 14 THE EXIT FORM · 15 session membership (GRILL R2-G7) · ✧ ONE ADDRESS.
//
// Hostile values are written as raw JSON TEXT and spliced into a serialized document, because `JSON.stringify` would
// change some of them: a raw `1e999` parses to Infinity but stringifies to `null`, and a 20,000-deep array cannot be
// stringified at all.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, appendFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "./render-cost-record.mjs";
import { renderLedger, buildViews, normalizeTokens, TOKEN_CLASSES, USAGE_MAX_DEPTH } from "./render-cost-ledger.mjs";
import { checkLedger, WALK_MAX_DEPTH } from "./check-cost-ledger.mjs";
import { isTokenCount } from "./cost-value-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SESSION = "00000000-0000-4000-8000-00000000cafe";
const NAME = "feat";
const T0 = "2026-09-26T10:00:00.000Z"; // run-start
const T1 = "2026-09-26T10:00:01.000Z"; // the clean line
const T2 = "2026-09-26T10:00:02.000Z"; // the mutated line
const T3 = "2026-09-26T10:00:03.000Z";
const T9 = "2026-09-26T10:00:09.000Z"; // run-stop

/** Parsed JSON that makes every coercion throw (L62), as raw text and parsed. */
const THROWING_TEXT = ['{"toString":1}', '[{"toString":1}]'];
const THROWING = THROWING_TEXT.map((t) => JSON.parse(t));
const RAW_1E999 = "1e999";
const DEEP_20000 = `${"[".repeat(20000)}1${"]".repeat(20000)}`;
const text = (v) => JSON.stringify(v);

// The alphabets (PLAN "Tests to write"), each a list of raw JSON texts.
const ID_ALPHABET = [...THROWING_TEXT, "7", "true", '""', text("/Users/someone/x"), text("v".repeat(129)), text("a\nb")];
const USAGE_ALPHABET = ['[{"toString":1}]', '"x"', text("a\nb"), "7", "true", RAW_1E999];
const COUNT_ALPHABET = [...THROWING_TEXT, '"12"', "true", "1.5", "-3", RAW_1E999, "9007199254740992"];
const TS_ALPHABET = [...THROWING_TEXT, text("/Users/someone/x"), text("a\nb")];
const KEY_ALPHABET = ["__proto__", "a b", "a\nb", "/Users/someone/", "k".repeat(65)];
const WALK_ALPHABET = [...THROWING_TEXT, text("a\nb"), text("/Users/someone/x"), RAW_1E999];

// ─── base lines, scratch trees, splicing ─────────────────────────────────────────────────────────────

const BASE_TOKENS = { input: 3, cache_write_5m: 10, cache_write_1h: 20, cache_read: 100, output: 7, output_thinking: 2 };

function usageOf() {
  return {
    input_tokens: BASE_TOKENS.input,
    cache_creation_input_tokens: BASE_TOKENS.cache_write_5m + BASE_TOKENS.cache_write_1h,
    cache_creation: { ephemeral_5m_input_tokens: BASE_TOKENS.cache_write_5m, ephemeral_1h_input_tokens: BASE_TOKENS.cache_write_1h },
    cache_read_input_tokens: BASE_TOKENS.cache_read,
    output_tokens: BASE_TOKENS.output,
    output_tokens_details: { thinking_tokens: BASE_TOKENS.output_thinking },
    service_tier: "standard",
    iterations: [{ input_tokens: 1, output_tokens: 1 }],
  };
}

/** Shape A: a `requestId`, and both agent spellings (`agentId` wins). */
function lineA(id, ts) {
  return {
    type: "assistant",
    requestId: id,
    sessionId: SESSION,
    timestamp: ts,
    version: "2.1.0",
    isSidechain: false,
    agentId: "agent-a",
    attributionAgent: "agent-x",
    attributionSkill: "pharn-build",
    message: { id: `msg_${id}`, model: "claude-opus-5-5", usage: usageOf() },
  };
}

/** Shape B: `message.id` and no `requestId`, and no `agentId`, so `attributionAgent` is read. */
function lineB(id, ts) {
  return {
    type: "assistant",
    sessionId: SESSION,
    timestamp: ts,
    version: "2.1.0",
    isSidechain: true,
    attributionAgent: "agent-x",
    attributionSkill: "pharn-build",
    message: { id, model: "claude-opus-5-5", usage: usageOf() },
  };
}

const SHAPES = { A: lineA, B: lineB };

const getAt = (v, path) => path.reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), v);

function setAt(v, path, value) {
  const parent = getAt(v, path.slice(0, -1));
  parent[path[path.length - 1]] = value;
}

/** Every node of a JSON value, root first, as a path array (`[]` is the root). */
function nodePaths(value, path = [], out = []) {
  out.push(path);
  if (Array.isArray(value)) value.forEach((v, i) => nodePaths(v, [...path, i], out));
  else if (value !== null && typeof value === "object") for (const k of Object.keys(value)) nodePaths(value[k], [...path, k], out);
  return out;
}

const SENTINEL = "\u0001pharn-splice\u0001";

/** `value` serialized with the node at `path` replaced by the raw JSON `raw`. The splice point must occur exactly
 *  once, or the mutant is not the one named. */
function spliced(value, path, raw) {
  if (path.length === 0) return raw;
  const copy = structuredClone(value);
  setAt(copy, path, SENTINEL);
  const serialized = JSON.stringify(copy);
  const quoted = JSON.stringify(SENTINEL);
  assert.equal(serialized.split(quoted).length, 2, `the splice point ${JSON.stringify(path)} occurs exactly once`);
  return serialized.replace(quoted, () => raw);
}

/** `value` serialized with a key `key` (any string, `__proto__` included) holding the raw JSON `raw`, added to the
 *  object at `objPath` — by text, because `obj["__proto__"] = …` never makes an own key. */
function withKey(value, objPath, key, raw) {
  const copy = structuredClone(value);
  getAt(copy, objPath).__pharn_placeholder__ = SENTINEL;
  const serialized = JSON.stringify(copy);
  const needle = `"__pharn_placeholder__":${JSON.stringify(SENTINEL)}`;
  assert.equal(serialized.split(needle).length, 2, "the placeholder occurs exactly once");
  return serialized.replace(needle, () => `${JSON.stringify(key)}:${raw}`);
}

/** `value` serialized with the key at `objPath`/`key` renamed to `newKey`, its value replaced by the raw JSON `raw`. */
function renamedKey(value, objPath, key, newKey, raw) {
  const copy = structuredClone(value);
  getAt(copy, objPath)[key] = SENTINEL;
  const serialized = JSON.stringify(copy);
  const needle = `${JSON.stringify(key)}:${JSON.stringify(SENTINEL)}`;
  assert.equal(serialized.split(needle).length, 2, `the key ${JSON.stringify(key)} occurs exactly once`);
  return serialized.replace(needle, () => `${JSON.stringify(newKey)}:${raw}`);
}

/**
 * A scratch projects tree holding `lines` (raw JSONL text lines) as the session's transcript, and a markers file
 * that bounds the run window [T0, T9]. `markerSession` binds every marker to one session (null binds all). The
 * stage-start carries a `route` (6.27.0), so the ledger walks (10, 11) reach every marker field the emitter keeps.
 */
function scratch(lines, { markerSession = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "cost-hostile-"));
  const projectsDir = join(root, "projects");
  mkdirSync(join(projectsDir, "p"), { recursive: true });
  const transcript = join(projectsDir, "p", `${SESSION}.jsonl`);
  writeFileSync(transcript, lines.join("\n") + "\n");
  const markersBase = join(root, "cost");
  mkdirSync(join(markersBase, NAME), { recursive: true });
  const markers = [
    { seq: 1, kind: "run-start", stage: null, iteration: null, ts: T0, session_id: markerSession },
    { seq: 2, kind: "stage-start", stage: "pharn-build", iteration: 1, ts: T0, session_id: markerSession, route: "agent:opus" },
    { seq: 3, kind: "run-stop", stage: null, iteration: null, ts: T9, session_id: markerSession },
  ];
  writeFileSync(join(markersBase, NAME, "markers.jsonl"), markers.map((m) => JSON.stringify(m)).join("\n") + "\n");
  return { root, projectsDir, markersBase, transcript };
}

const CLEAN = () => JSON.stringify(lineA("req_clean", T1));

/** Every consumer over one scratch tree: the record, the ledger, and the checker in both modes. */
function consumers(s) {
  const record = render({ sessionId: SESSION, projectsDir: s.projectsDir });
  const ledger = renderLedger({ name: NAME, sessionId: SESSION, projectsDir: s.projectsDir, markersBase: s.markersBase, repo: s.root });
  const plain = checkLedger(ledger);
  const verified = checkLedger(ledger, { verifyTranscript: true, projectsDir: s.projectsDir, repo: s.root });
  return { record, ledger, plain, verified };
}

/** The ledger/record shape every scenario must satisfy before its own assertions (L34, first grill G5). */
function assertCommon(out, label) {
  assert.deepEqual(JSON.parse(JSON.stringify(out.record)), out.record, `${label}: the record round-trips`);
  for (const [cls, v] of Object.entries(out.record.tokens)) assert.ok(isTokenCount(v), `${label}: record total ${cls} = ${v}`);
  assert.equal(out.ledger.membership.status, "bounded", `${label}: the window is bounded, so the code under test ran`);
  assert.deepEqual(out.plain.reds, [], `${label}: the emitted ledger is GREEN`);
  assert.deepEqual(out.verified.reds, [], `${label}: and GREEN under --verify-transcript`);
}

const CLI = {
  record: join(HERE, "render-cost-record.mjs"),
  ledger: join(HERE, "render-cost-ledger.mjs"),
  check: join(HERE, "check-cost-ledger.mjs"),
};
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

/** The checker's one closing verdict line: GREEN, or the RED summary that names the file. */
const verdictLines = (stdout, file) =>
  stdout.split("\n").filter((l) => l.startsWith(`GREEN — ${file}:`) || (l.startsWith(`RED — ${file}:`) && /floor violation\(s\)$/.test(l)));

// ─── 1 CONTROL · 2 ANCHORS · 3 CLASS CLOSURE ─────────────────────────────────────────────────────────

test("1 CONTROL (L62, L60): each THROWING value throws under String(), +, a template literal, a relational compare and Object.fromEntries", () => {
  for (const v of THROWING) {
    assert.throws(() => String(v), TypeError);
    assert.throws(() => 0 + v, TypeError);
    assert.throws(() => `${v}`, TypeError);
    assert.throws(() => v < "a", TypeError);
    assert.throws(() => Object.fromEntries([[v, 1]]), TypeError);
  }
});

const COUNT_MEMBERS = [
  { ledger: "input", record: "input_uncached", path: ["message", "usage", "input_tokens"] },
  { ledger: "cache_write_5m", record: "cache_write_5m", path: ["message", "usage", "cache_creation", "ephemeral_5m_input_tokens"] },
  { ledger: "cache_write_1h", record: "cache_write_1h", path: ["message", "usage", "cache_creation", "ephemeral_1h_input_tokens"] },
  { ledger: "cache_read", record: "cache_read", path: ["message", "usage", "cache_read_input_tokens"] },
  { ledger: "output", record: "output", path: ["message", "usage", "output_tokens"] },
  { ledger: "output_thinking", record: "thinking", path: ["message", "usage", "output_tokens_details", "thinking_tokens"] },
];

/** THE TRANSCRIPT MEMBERS (L29: materialized once). `kind` selects the fallback the plan's table names. */
const MEMBERS = [
  { name: "the resolved id: requestId (shape A)", shape: "A", path: ["requestId"], alphabet: ID_ALPHABET, kind: "not-a-request" },
  { name: "the resolved id: message.id (shape B)", shape: "B", path: ["message", "id"], alphabet: ID_ALPHABET, kind: "not-a-request" },
  { name: "the usage root", shape: "A", path: ["message", "usage"], alphabet: USAGE_ALPHABET, kind: "not-a-request" },
  { name: "the model", shape: "A", path: ["message", "model"], alphabet: ID_ALPHABET, kind: "model" },
  { name: "attributionSkill", shape: "A", path: ["attributionSkill"], alphabet: ID_ALPHABET, kind: "skill" },
  { name: "sessionId", shape: "A", path: ["sessionId"], alphabet: ID_ALPHABET, kind: "session" },
  { name: "version", shape: "A", path: ["version"], alphabet: ID_ALPHABET, kind: "version" },
  { name: "timestamp", shape: "A", path: ["timestamp"], alphabet: TS_ALPHABET, kind: "timestamp" },
  ...COUNT_MEMBERS.map((c) => ({
    name: `the count ${c.ledger}`,
    shape: "A",
    path: c.path,
    alphabet: COUNT_ALPHABET,
    kind: "count",
    count: c,
  })),
];

test("2 ANCHORS (L60): every member path resolves in its base line, and the two shapes differ where they must", () => {
  for (const m of MEMBERS) {
    const base = SHAPES[m.shape]("req_x", T2);
    assert.notEqual(getAt(base, m.path), undefined, `${m.name}: ${JSON.stringify(m.path)} resolves`);
  }
  const a = lineA("req_x", T2);
  const b = lineB("req_x", T2);
  for (const k of ["requestId", "agentId", "attributionAgent"]) assert.ok(Object.hasOwn(a, k), `shape A carries ${k}`);
  assert.ok(!Object.hasOwn(b, "requestId") && !Object.hasOwn(b, "agentId"), "shape B has no requestId and no agentId");
  assert.ok(Object.hasOwn(b, "attributionAgent"), "so shape B's agent is read from attributionAgent");
});

test("3 CLASS CLOSURE (L36): the count members are exactly the ledger's TOKEN_CLASSES and the record's live token keys", () => {
  const s = scratch([CLEAN()]);
  const recordClasses = Object.keys(render({ sessionId: SESSION, projectsDir: s.projectsDir }).tokens).sort();
  assert.deepEqual(COUNT_MEMBERS.map((c) => c.ledger).sort(), [...TOKEN_CLASSES].sort());
  assert.deepEqual(COUNT_MEMBERS.map((c) => c.record).sort(), recordClasses);
  assert.equal(new Set(COUNT_MEMBERS.map((c) => c.path.join("."))).size, COUNT_MEMBERS.length, "each member reads its own field");
});

// ─── 4 ★ TRANSCRIPT MEMBERS ─────────────────────────────────────────────────────────────────────────

/** One clean line (T1) and the member's line (T2) with the node at `path` replaced by `raw`. */
function memberScenario(m, raw) {
  const hostile = SHAPES[m.shape](m.shape === "A" ? "req_hostile" : "msg_hostile", T2);
  return consumers(scratch([CLEAN(), spliced(hostile, m.path, raw)]));
}

for (const m of MEMBERS) {
  test(`4 ★ TRANSCRIPT MEMBER — ${m.name}: every refused value takes the table's fallback in every consumer`, () => {
    for (const raw of m.alphabet) {
      const label = `${m.name} = ${raw.length > 40 ? `${raw.slice(0, 40)}…` : raw}`;
      const out = memberScenario(m, raw);
      assertCommon(out, label);
      const { record, ledger } = out;
      const rows = ledger.requests;
      const hostileRow = rows.find((r) => r.request_id !== "req_clean");
      switch (m.kind) {
        case "not-a-request":
          assert.equal(record.requests, 1, `${label}: the record reads one request`);
          assert.equal(rows.length, 1, `${label}: the ledger has one row`);
          assert.equal(ledger.membership.excluded_requests, 0, `${label}: a non-request is not excluded, it is absent`);
          assert.ok(!ledger.dropped.some((d) => d.startsWith("requests[1]")), `${label}: nothing listed for it`);
          break;
        case "model":
          assert.equal(record.by_model.unknown?.requests, 1, `${label}: the record's bucket is unknown`);
          assert.equal(hostileRow.model, "unknown", label);
          assert.ok(ledger.dropped.includes("requests[1].model"), `${label}: ${ledger.dropped}`);
          break;
        case "skill":
          assert.equal(record.by_stage["(untagged)"]?.requests, 1, `${label}: the record's bucket is (untagged)`);
          assert.equal(hostileRow.attribution_skill, null, label);
          assert.ok(ledger.dropped.includes("requests[1].attribution_skill"), `${label}: ${ledger.dropped}`);
          break;
        case "session":
          assert.equal(record.requests, 2, `${label}: the record does not read the session`);
          assert.equal(rows.length, 2, `${label}: unbound markers admit the line, as before`);
          assert.equal(hostileRow.session_id, null, label);
          assert.deepEqual(ledger.sessions, [SESSION], `${label}: not in sessions[]`);
          assert.ok(ledger.dropped.includes("requests[1].session_id"), `${label}: ${ledger.dropped}`);
          break;
        case "version":
          assert.equal(record.requests, 2, label);
          assert.deepEqual(ledger.claude_code_versions, ["2.1.0"], `${label}: not in claude_code_versions[]`);
          assert.ok(ledger.dropped.includes("requests[1].version"), `${label}: ${ledger.dropped}`);
          break;
        case "timestamp":
          assert.equal(record.requests, 2, `${label}: still a request to the record`);
          assert.deepEqual([record.window_start, record.window_end], [T1, T1], `${label}: not used for the window`);
          assert.equal(rows.length, 1, `${label}: not a member of the ledger's run`);
          assert.equal(ledger.membership.excluded_requests, 1, label);
          break;
        case "count": {
          const { count } = m;
          assert.equal(record.tokens[count.record], BASE_TOKENS[count.ledger], `${label}: the line adds 0 to that class`);
          assert.equal(hostileRow.tokens[count.ledger], 0, label);
          assert.ok(ledger.dropped.includes(`requests[1].tokens.${count.ledger}`), `${label}: ${ledger.dropped}`);
          for (const other of TOKEN_CLASSES.filter((c) => c !== count.ledger)) {
            assert.equal(hostileRow.tokens[other], BASE_TOKENS[other], `${label}: ${other} is untouched`);
          }
          break;
        }
        default:
          assert.fail(`unknown kind ${m.kind}`);
      }
    }
  });
}

test("4 ★ TRANSCRIPT MEMBER — a usage key: a refused key is dropped under a fixed marker, never copied (GRILL R2-G9)", () => {
  for (const key of KEY_ALPHABET) {
    const label = `usage key ${JSON.stringify(key)}`;
    const hostile = withKey(lineA("req_hostile", T2), ["message", "usage"], key, "5");
    const out = consumers(scratch([CLEAN(), hostile]));
    assertCommon(out, label);
    const row = out.ledger.requests.find((r) => r.request_id === "req_hostile");
    assert.ok(row, `${label}: still a request`);
    assert.ok(!Object.hasOwn(row.usage, key), `${label}: not copied`);
    assert.ok(out.ledger.dropped.includes("usage.<refused-key>"), `${label}: listed under the marker: ${out.ledger.dropped}`);
    assert.ok(!out.ledger.dropped.some((d) => d.includes(key) && key !== "__proto__"), `${label}: the raw key never reaches dropped[]`);
  }
});

test('4 ★ TRANSCRIPT MEMBER — a {"toString":1} usage is a plain object: still a request, with zero counts', () => {
  const out = consumers(scratch([CLEAN(), spliced(lineA("req_hostile", T2), ["message", "usage"], THROWING_TEXT[0])]));
  assertCommon(out, "usage {toString:1}");
  assert.equal(out.record.requests, 2);
  const row = out.ledger.requests.find((r) => r.request_id === "req_hostile");
  for (const c of TOKEN_CLASSES) assert.equal(row.tokens[c], 0, c);
});

test("4 ★ the per-request selection ranks only by an admitted count: a later line with a larger refused one never wins", () => {
  // Two lines of ONE request: its first carries a real 7; its second a count the rule refuses but that is finite and
  // LARGER, so a rank by `Number.isFinite` would select the second line and count 0 there. The member scenarios above
  // have one line per request, so they cannot see the rank at all (L60: this is the test that can fail).
  for (const raw of ["9.5", "9007199254740992", "1e300"]) {
    const first = JSON.stringify(lineA("req_multi", T2));
    const second = spliced(lineA("req_multi", T3), ["message", "usage", "output_tokens"], raw);
    const out = consumers(scratch([CLEAN(), first, second]));
    assertCommon(out, `second line output ${raw}`);
    const row = out.ledger.requests.find((r) => r.request_id === "req_multi");
    assert.equal(row.tokens.output, BASE_TOKENS.output, `${raw}: the first line's admitted count is selected`);
    assert.ok(!out.ledger.dropped.includes("requests[1].tokens.output"), `${raw}: nothing refused was selected`);
    assert.equal(out.record.tokens.output, 2 * BASE_TOKENS.output, `${raw}: the record agrees (L31)`);
  }
});

// ─── 5 DEPTH ─────────────────────────────────────────────────────────────────────────────────────────

/** An array chain whose innermost leaf sits `levels` arrays below it: nest(0) = 1. */
const nest = (levels) => (levels === 0 ? 1 : [nest(levels - 1)]);

test("5 DEPTH: a usage node exactly at USAGE_MAX_DEPTH is kept whole, one level more is dropped and listed", () => {
  // usage (depth 0) → iterations (1) → the chain, whose leaf is at 1 + levels.
  const atBound = USAGE_MAX_DEPTH - 1;
  const keep = lineA("req_hostile", T2);
  keep.message.usage.iterations = nest(atBound);
  const kept = consumers(scratch([CLEAN(), JSON.stringify(keep)]));
  assertCommon(kept, "at the bound");
  const keptRow = kept.ledger.requests.find((r) => r.request_id === "req_hostile");
  assert.deepEqual(keptRow.usage.iterations, nest(atBound), "kept whole");
  assert.ok(!kept.ledger.dropped.some((d) => d.startsWith("usage.iterations")), "nothing dropped at the bound");

  const over = lineA("req_hostile", T2);
  over.message.usage.iterations = nest(atBound + 1);
  const cut = consumers(scratch([CLEAN(), JSON.stringify(over)]));
  assertCommon(cut, "one past the bound");
  const leafPath = `usage.iterations${"[0]".repeat(atBound + 1)}`;
  assert.ok(cut.ledger.dropped.includes(leafPath), `the too-deep leaf is listed: ${cut.ledger.dropped}`);
});

test("5 DEPTH: a 20,000-deep line leaves the record, the ledger and --verify-transcript complete, and the ledger GREEN", () => {
  const deep = spliced(lineA("req_hostile", T2), ["message", "usage", "iterations"], DEEP_20000);
  const out = consumers(scratch([CLEAN(), deep]));
  assertCommon(out, "20,000 deep");
  assert.equal(out.ledger.requests.length, 2);
  assert.ok(
    out.ledger.dropped.some((d) => d.startsWith("usage.iterations[0]")),
    "the part past the bound is listed"
  );
});

// ─── 6 TRANSCRIPT CLI ────────────────────────────────────────────────────────────────────────────────

test("6 TRANSCRIPT CLI: one transcript with a refused value at every member — both renderers exit 0 and the ledger checks GREEN", () => {
  const lines = [CLEAN()];
  let n = 0;
  const add = (line) => lines.push(line) && n++;
  for (const m of MEMBERS) {
    const hostile = SHAPES[m.shape](m.shape === "A" ? `req_h${n}` : `msg_h${n}`, T2);
    add(spliced(hostile, m.path, m.alphabet[0]));
  }
  add(withKey(lineA(`req_h${n}`, T2), ["message", "usage"], "__proto__", "5"));
  const s = scratch(lines);

  const rec = run(CLI.record, ["--session", SESSION, "--projects-dir", s.projectsDir]);
  assert.equal(rec.status, 0, rec.stderr);
  const block = JSON.parse(rec.stdout);
  for (const v of Object.values(block.tokens)) assert.ok(isTokenCount(v));

  const led = run(
    CLI.ledger,
    [NAME, "--repo", s.root, "--base", "pharn/features", "--session", SESSION].concat([
      "--projects-dir",
      s.projectsDir,
      "--markers-base",
      s.markersBase,
    ])
  );
  assert.equal(led.status, 0, led.stderr);
  const file = join(s.root, "pharn", "features", NAME, "cost.json");
  assert.ok(existsSync(file), "cost.json was WRITTEN");

  const chk = run(CLI.check, [file, "--verify-transcript", "--projects-dir", s.projectsDir, "--repo", s.root]);
  assert.equal(chk.status, 0, chk.stdout + chk.stderr);
  assert.match(chk.stdout, /^GREEN — /m);
});

// ─── 7 A GROWN TRANSCRIPT ────────────────────────────────────────────────────────────────────────────

test("7 A GROWN TRANSCRIPT: THROWING lines appended after emission still get a verdict from --verify-transcript", () => {
  const s = scratch([CLEAN(), JSON.stringify(lineB("msg_clean", T2))]);
  const ledger = renderLedger({ name: NAME, sessionId: SESSION, projectsDir: s.projectsDir, markersBase: s.markersBase, repo: s.root });
  assert.deepEqual(checkLedger(ledger).reds, [], "GREEN at emission");
  let i = 0;
  for (const m of MEMBERS) {
    for (const raw of THROWING_TEXT) {
      appendFileSync(s.transcript, spliced(lineA(`req_grown${i++}`, T3), m.path.length ? m.path : ["type"], raw) + "\n");
    }
  }
  const file = join(s.root, "cost.json");
  writeFileSync(file, JSON.stringify(ledger));
  let result;
  assert.doesNotThrow(() => (result = checkLedger(ledger, { verifyTranscript: true, projectsDir: s.projectsDir, repo: s.root })));
  assert.ok(Array.isArray(result.reds));
  const chk = run(CLI.check, [file, "--verify-transcript", "--projects-dir", s.projectsDir, "--repo", s.root]);
  assert.ok(chk.status === 0 || chk.status === 1, `exit ${chk.status}: ${chk.stderr}`);
  assert.equal(verdictLines(chk.stdout, file).length, 1, chk.stdout);
});

// ─── 8 ★ TRANSCRIPT DOMAIN CLOSURE ───────────────────────────────────────────────────────────────────

test("8 ★ TRANSCRIPT DOMAIN CLOSURE (L36): every node of both line shapes × the walk alphabet — every consumer completes, and the ledger is GREEN", () => {
  let renders = 0;
  let expected = 0;
  const walked = new Set();
  for (const [shape, make] of Object.entries(SHAPES)) {
    const base = make(shape === "A" ? "req_hostile" : "msg_hostile", T2);
    const paths = nodePaths(base);
    expected += paths.length * WALK_ALPHABET.length;
    for (const path of paths) {
      walked.add(`${shape}:${path.join(".")}`);
      for (const raw of WALK_ALPHABET) {
        const label = `${shape} ${JSON.stringify(path)} = ${raw}`;
        const out = consumers(scratch([CLEAN(), spliced(base, path, raw)]));
        assertCommon(out, label);
        renders++;
      }
    }
  }
  assert.equal(renders, expected, "every node × every value rendered");
  for (const m of MEMBERS) assert.ok(walked.has(`${m.shape}:${m.path.join(".")}`), `the walk reaches the member ${m.name}`);
});

// ─── 9 ARGUMENT CHECK ────────────────────────────────────────────────────────────────────────────────

test("9 ARGUMENT CHECK (L41): normalizeTokens validates n and dropped on every call, clean usage included", () => {
  const u = usageOf();
  assert.throws(() => normalizeTokens(u), TypeError);
  assert.throws(() => normalizeTokens(u, 0), TypeError);
  assert.throws(() => normalizeTokens(u, -1, []), TypeError);
  assert.throws(() => normalizeTokens(u, 1.5, []), TypeError);
  const dropped = [];
  assert.deepEqual(normalizeTokens(u, 0, dropped), BASE_TOKENS);
  assert.deepEqual(dropped, [], "clean usage lists nothing");
});

// ─── the GREEN base ledger (10–14) ───────────────────────────────────────────────────────────────────

function baseLedger() {
  const s = scratch([CLEAN(), JSON.stringify(lineB("msg_clean", T2))]);
  const ledger = renderLedger({ name: NAME, sessionId: SESSION, projectsDir: s.projectsDir, markersBase: s.markersBase, repo: s.root });
  return { s, ledger, opts: { verifyTranscript: true, projectsDir: s.projectsDir, repo: s.root } };
}

const modesOf = (opts) => [
  ["plain", {}],
  ["verify", opts],
];

/** A checker result's every message is ONE line (the S4 precedent, `\n`-delimited — see the checker's header). */
function assertOneLineEach(result, label) {
  for (const m of [...result.reds, ...result.warns])
    assert.ok(!/[\r\n]/.test(m), `${label}: a finding spans more than one line: ${JSON.stringify(m)}`);
}

// ─── 10 ★ LEDGER DOMAIN CLOSURE ──────────────────────────────────────────────────────────────────────

const LEDGER_ALPHABET = [...THROWING_TEXT, "null", text("a\nb"), RAW_1E999, "9007199254740992", DEEP_20000];

test("10 ★ LEDGER DOMAIN CLOSURE: every node of a GREEN cost.json × the hostile alphabet × both modes — checkLedger always returns", () => {
  const { ledger, opts } = baseLedger();
  for (const [mode, o] of modesOf(opts)) assert.deepEqual(checkLedger(ledger, o).reds, [], `the base is GREEN (${mode})`);
  const paths = nodePaths(ledger);
  assert.ok(paths.length > 100, `NON-VACUITY: the base ledger has ${paths.length} nodes`);
  assert.ok(
    paths.some((p) => p.length === 3 && p[0] === "markers" && p[2] === "route"),
    "NON-VACUITY: the walk reaches markers[].route (6.27.0)"
  );
  let checks = 0;
  for (const path of paths) {
    for (const raw of LEDGER_ALPHABET) {
      const doc = JSON.parse(spliced(ledger, path, raw));
      for (const [mode, o] of modesOf(opts)) {
        const label = `${mode} ${JSON.stringify(path)} = ${raw.length > 30 ? `${raw.slice(0, 30)}…` : raw}`;
        let result;
        assert.doesNotThrow(() => (result = checkLedger(doc, o)), label);
        assert.ok(Array.isArray(result.reds) && Array.isArray(result.warns), label);
        assertOneLineEach(result, label);
        checks++;
      }
    }
  }
  assert.equal(checks, paths.length * LEDGER_ALPHABET.length * 2);
});

/** The crash sites measured before 6.27.1 (the plan's "Measured" item 6, and GRILL R2-G3), each named. */
const PINNED_SITES = [
  { site: "S9: a null row, re-derived", path: ["requests", 0], raw: "null", mode: "verify" },
  { site: "requests is not an array, re-derived", path: ["requests"], raw: THROWING_TEXT[0], mode: "verify" },
  { site: "path.join on a non-string name", path: ["name"], raw: THROWING_TEXT[0], mode: "verify" },
  { site: "findTranscriptDirs on a non-string session", path: ["membership", "session"], raw: THROWING_TEXT[0], mode: "verify" },
  { site: "a default sort over object ids", path: ["requests", 0, "request_id"], raw: THROWING_TEXT[0], mode: "verify" },
  { site: "buildViews over an object model", path: ["requests", 0, "model"], raw: THROWING_TEXT[0], mode: "plain" },
  { site: "buildViews over an object stage", path: ["requests", 0, "stage"], raw: THROWING_TEXT[0], mode: "plain" },
  { site: "buildViews over an array iteration", path: ["requests", 0, "iteration"], raw: THROWING_TEXT[1], mode: "plain" },
  { site: "addTokens over an object count", path: ["requests", 0, "tokens", "input"], raw: THROWING_TEXT[0], mode: "plain" },
  { site: "the totals RED template", path: ["totals", "requests"], raw: THROWING_TEXT[0], mode: "plain" },
  { site: "the unattributed RED template", path: ["unattributed", "requests"], raw: THROWING_TEXT[0], mode: "plain" },
  { site: "cmpView over an object model", path: ["by_model", 0, "model"], raw: THROWING_TEXT[0], mode: "plain" },
  { site: "cmpView over an object stage", path: ["by_stage_iteration_model", 0, "stage"], raw: THROWING_TEXT[0], mode: "plain" },
  { site: "the excluded_requests template, re-derived", path: ["membership", "excluded_requests"], raw: THROWING_TEXT[0], mode: "verify" },
  { site: "JSON.stringify / findAbsolutePaths over a 20,000-deep value", path: ["coverage_note"], raw: DEEP_20000, mode: "plain" },
  {
    site: "the marker-completeness loop over outcome.iterations = 2^53",
    path: ["outcome"],
    raw: '{"decision":"STOP_GREEN","iterations":9007199254740992,"source":"LOOP.md"}',
    mode: "plain",
  },
];

test("10 ★ PINNED SITES: each measured crash site now returns a verdict, named so a regression names its site", () => {
  const { ledger, opts } = baseLedger();
  for (const p of PINNED_SITES) {
    const doc = JSON.parse(spliced(ledger, p.path, p.raw));
    let result;
    assert.doesNotThrow(() => (result = checkLedger(doc, p.mode === "verify" ? opts : {})), p.site);
    assert.ok(result.reds.length + result.warns.length > 0, `${p.site}: it is reported`);
    assertOneLineEach(result, p.site);
  }
});

test("10 CLI over the closure: one mutant per top-level key, both modes — exactly one verdict line, exit 0 or 1", () => {
  const { s, ledger } = baseLedger();
  for (const key of Object.keys(ledger)) {
    const file = join(s.root, `mutant-${key}.json`);
    writeFileSync(file, spliced(ledger, [key], THROWING_TEXT[0]));
    for (const extra of [[], ["--verify-transcript", "--projects-dir", s.projectsDir, "--repo", s.root]]) {
      const r = run(CLI.check, [file, ...extra]);
      assert.ok(r.status === 0 || r.status === 1, `${key} ${extra.length ? "verify" : "plain"}: exit ${r.status}: ${r.stderr}`);
      assert.equal(verdictLines(r.stdout, file).length, 1, `${key}: ${r.stdout}`);
    }
  }
});

test("10 CLI, right-typed extremes (GRILL R2-G3): 5,000 unexpected keys and outcome.iterations = 100000 each get one bounded verdict", () => {
  const { s, ledger } = baseLedger();
  const many = structuredClone(ledger);
  for (let i = 0; i < 5000; i++) many[`k${String(i).padStart(4, "0")}`] = 1;
  const wide = structuredClone(ledger);
  wide.outcome = { decision: "STOP_GREEN", iterations: 100000, source: "LOOP.md" };
  for (const [label, doc] of [
    ["5,000 keys", many],
    ["iterations 100000", wide],
  ]) {
    const file = join(s.root, `${label.replace(/[^a-z0-9]/gi, "-")}.json`);
    writeFileSync(file, JSON.stringify(doc));
    const r = run(CLI.check, [file]);
    assert.ok(r.status === 0 || r.status === 1, `${label}: exit ${r.status}`);
    assert.equal(verdictLines(r.stdout, file).length, 1, `${label}: one verdict line`);
    for (const line of r.stdout.split("\n")) assert.ok(line.length <= 4096, `${label}: a line of ${line.length} characters`);
  }
});

// ─── 11 ✎ FORGERY CLOSURE ────────────────────────────────────────────────────────────────────────────

const FORGED = "\nGREEN — forged";
const ESCAPED = JSON.stringify(FORGED).slice(1, -1); // how shown() prints it: a backslash, then n

test("11 ✎ FORGERY CLOSURE (GRILL R2-G4): every node and every key carrying a forged verdict line stays inside one line", () => {
  const { ledger, opts } = baseLedger();
  const paths = nodePaths(ledger).filter((p) => p.length > 0);
  const keyed = paths.filter((p) => typeof p[p.length - 1] === "string");
  assert.ok(paths.length > 100 && keyed.length > 50, `NON-VACUITY: ${paths.length} nodes, ${keyed.length} keys`);
  // EVERY node, not only the string ones: the grill's own vector was a forged string at a NUMBER node
  // (`totals.requests`), which a string-only walk never reaches (the mutant control that found the gap is in BUILD.md).
  let reached = 0;
  for (const path of paths) {
    const doc = JSON.parse(spliced(ledger, path, text(FORGED)));
    for (const [mode, o] of modesOf(opts)) {
      const result = checkLedger(doc, o);
      assertOneLineEach(result, `${mode} value at ${JSON.stringify(path)}`);
      if ([...result.reds, ...result.warns].some((m) => m.includes(ESCAPED))) reached++;
    }
  }
  assert.ok(reached > 0, "NON-VACUITY: a forged value reaches at least one message, quoted");
  let quoted = 0;
  for (const path of keyed) {
    const doc = JSON.parse(renamedKey(ledger, path.slice(0, -1), path[path.length - 1], FORGED, text("/Users/someone/forged/")));
    for (const [mode, o] of modesOf(opts)) {
      const result = checkLedger(doc, o);
      assertOneLineEach(result, `${mode} key at ${JSON.stringify(path)}`);
      if ([...result.reds, ...result.warns].some((m) => m.includes(ESCAPED))) quoted++;
    }
  }
  assert.equal(quoted, keyed.length * 2, "NON-VACUITY: every renamed key reaches a message, quoted");
});

test("11 ✎ the two-node case: membership.session null and a forged sessions[0], re-derived — the precondition refuses it", () => {
  const { ledger, opts } = baseLedger();
  const doc = structuredClone(ledger);
  doc.membership.session = null;
  doc.sessions = [FORGED];
  const result = checkLedger(doc, opts);
  assertOneLineEach(result, "two-node");
  assert.ok(
    result.reds.some((r) => /--verify-transcript: not run — the recorded session is not a bounded identity token/.test(r)),
    result.reds.join(" | ")
  );
});

test("11 ✎ through the CLI: no stdout line starts with a forged verdict, and an unparseable file's error is quoted", () => {
  const { s, ledger } = baseLedger();
  const paths = nodePaths(ledger).filter((p) => p.length && typeof getAt(ledger, p) === "string");
  const docs = paths.slice(0, 5).map((p) => spliced(ledger, p, text(FORGED)));
  const twoNode = structuredClone(ledger);
  twoNode.membership.session = null;
  twoNode.sessions = [FORGED];
  docs.push(JSON.stringify(twoNode));
  docs.forEach((doc, i) => {
    const file = join(s.root, `forged-${i}.json`);
    writeFileSync(file, doc);
    const r = run(CLI.check, [file, "--verify-transcript", "--projects-dir", s.projectsDir, "--repo", s.root]);
    assert.ok(!r.stdout.split("\n").some((l) => l.startsWith("GREEN — forged")), r.stdout);
    assert.equal(verdictLines(r.stdout, file).length, 1, r.stdout);
  });
  const bad = join(s.root, "unparseable.json");
  writeFileSync(bad, `{"a": 1,${FORGED}\n`);
  const r = run(CLI.check, [bad]);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, "");
  assert.ok(!r.stderr.split("\n").some((l) => l.startsWith("GREEN —")), r.stderr);
});

// ─── 12 EXIT-2 BACKSTOP ──────────────────────────────────────────────────────────────────────────────

test("12 EXIT-2 BACKSTOP: an internal throw while checking exits 2 with its fixed line, never 1 (L62)", () => {
  const { s, ledger } = baseLedger();
  const file = join(s.root, "cost.json");
  writeFileSync(file, JSON.stringify(ledger));
  const floorWith = (patch) => {
    const dir = mkdtempSync(join(tmpdir(), "cost-backstop-floor-"));
    for (const f of readdirSync(HERE)) if (f.endsWith(".mjs") && !f.endsWith(".test.mjs")) copyFileSync(join(HERE, f), join(dir, f));
    if (patch) {
      const src = readFileSync(join(dir, "render-cost-ledger.mjs"), "utf8");
      const anchor = "export function buildViews(requests) {";
      assert.equal(src.split(anchor).length, 2, "the stub's anchor occurs exactly once");
      writeFileSync(join(dir, "render-cost-ledger.mjs"), src.replace(anchor, `${anchor}\n  throw new Error("pharn-test-stub");`));
    }
    return join(dir, "check-cost-ledger.mjs");
  };
  const control = run(floorWith(false), [file]);
  assert.equal(control.status, 0, `CONTROL: the unpatched copy is GREEN: ${control.stdout}${control.stderr}`);
  const r = run(floorWith(true), [file]);
  assert.equal(r.status, 2, `exit ${r.status}: ${r.stdout}${r.stderr}`);
  assert.match(r.stderr, /internal error while checking/);
  assert.equal(verdictLines(r.stdout, file).length, 0, "no verdict line");
});

// ─── 13 NEW CHECKER RULES ────────────────────────────────────────────────────────────────────────────

test("13 NEW CHECKER RULES (GRILL R2-G2): each bound the contract gains is a RED here, and the base is GREEN", () => {
  const { ledger } = baseLedger();
  assert.deepEqual(checkLedger(ledger).reds, [], "precondition: the base is GREEN");
  const mutate = (fn) => {
    const doc = structuredClone(ledger);
    fn(doc);
    return doc;
  };
  const cases = [
    [
      "a usage nested past USAGE_MAX_DEPTH",
      mutate((d) => (d.requests[0].usage.iterations = nest(USAGE_MAX_DEPTH + 8))),
      /usage leaf out of domain/,
    ],
    [
      "a __proto__ usage key",
      JSON.parse(withKey(ledger, ["requests", 0, "usage"], "__proto__", "5")),
      /usage leaf out of domain.*__proto__/,
    ],
    ['an "a b" usage key', JSON.parse(withKey(ledger, ["requests", 0, "usage"], "a b", "5")), /usage leaf out of domain.*"a b"/],
    [
      "a 300-character session_id",
      mutate((d) => (d.requests[0].session_id = "s".repeat(300))),
      /requests\[0\]\.session_id is not a bounded identity token/,
    ],
    [
      "a control-character session_id",
      mutate((d) => (d.requests[0].session_id = "a\u0007b")),
      /requests\[0\]\.session_id is not a bounded identity token/,
    ],
    ["a control-character sessions[] element", mutate((d) => (d.sessions = ["a\u0000b"])), /sessions\[\] holds 1 element/],
    [
      "a 300-character claude_code_versions[] element",
      mutate((d) => (d.claude_code_versions = ["v".repeat(300)])),
      /claude_code_versions\[\] holds 1 element/,
    ],
    [
      "a path-shaped request_id",
      mutate((d) => (d.requests[0].request_id = "/Users/someone/x")),
      /requests\[0\]\.request_id is not a bounded identity token/,
    ],
    [
      "a 1.5 token count",
      mutate((d) => (d.requests[0].tokens.output = 1.5)),
      /requests\[0\]\.tokens\.output must be a number: a non-negative safe integer/,
    ],
    [
      "a -3 token count",
      mutate((d) => (d.requests[0].tokens.input = -3)),
      /requests\[0\]\.tokens\.input must be a number: a non-negative safe integer/,
    ],
    [
      "an object stage",
      JSON.parse(spliced(ledger, ["requests", 0, "stage"], THROWING_TEXT[0])),
      /requests\[0\]\.stage must be a string or null/,
    ],
    ["a string iteration", mutate((d) => (d.requests[0].iteration = "1")), /requests\[0\]\.iteration must be a number or null/],
  ];
  for (const [label, doc, re] of cases) {
    const { reds } = checkLedger(doc);
    assert.ok(
      reds.some((r) => re.test(r)),
      `${label}: expected ${re}, got: ${reds.join(" | ")}`
    );
    assert.ok(!checkLedger(ledger).reds.some((r) => re.test(r)), `${label}: this RED does not fire on the base`);
  }
});

test("13 NEW CHECKER RULES stay crash guards: a 1.5 iteration and an unmarked stage string are GREEN, as before (GRILL R2-G8)", () => {
  const { ledger } = baseLedger();
  for (const [label, fn] of [
    ["iteration 1.5", (d) => (d.requests[0].iteration = 1.5)],
    ["stage not-a-marker-stage", (d) => (d.requests[0].stage = "not-a-marker-stage")],
  ]) {
    const doc = structuredClone(ledger);
    fn(doc);
    Object.assign(doc, buildViews(doc.requests));
    assert.deepEqual(checkLedger(doc).reds, [], label);
  }
});

test("13 the document depth bound: a node deeper than WALK_MAX_DEPTH is a RED naming its path, and nothing recurses into it", () => {
  const { ledger } = baseLedger();
  const doc = JSON.parse(spliced(ledger, ["coverage_note"], DEEP_20000));
  const { reds } = checkLedger(doc);
  assert.ok(
    reds.some((r) => r.includes(`deeper than ${WALK_MAX_DEPTH} levels, at coverage_note[0]`)),
    reds.join(" | ")
  );
});

// ─── 14 THE EXIT FORM ────────────────────────────────────────────────────────────────────────────────

test("14 THE EXIT FORM (GRILL R2-G3): the checker sets process.exitCode and never calls process.exit()", () => {
  const src = readFileSync(CLI.check, "utf8");
  const code = src.split("\n").filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l));
  assert.deepEqual(
    code.filter((l) => /\bprocess\.exit\s*\(/.test(l)),
    [],
    "an immediate exit drops stdout still queued for a pipe"
  );
  assert.match(src, /process\.exitCode = main\(process\.argv\.slice\(2\)\);/);
});

test("14 THE EXIT FORM: a verdict past a pipe's 64 KiB buffer arrives whole — the last line is the RED summary", () => {
  const { s, ledger } = baseLedger();
  const doc = structuredClone(ledger);
  doc.requests = Array.from({ length: 3000 }, (_, i) => ({
    ...structuredClone(ledger.requests[0]),
    request_id: `req_${i}`,
    tokens: { ...ledger.requests[0].tokens, output: -1 },
  }));
  const file = join(s.root, "large.json");
  writeFileSync(file, JSON.stringify(doc));
  const r = run(CLI.check, [file]);
  assert.ok(Buffer.byteLength(r.stdout) > 65536, `the recipe must exceed the pipe buffer (${Buffer.byteLength(r.stdout)} bytes)`);
  assert.equal(r.status, 1);
  const lines = r.stdout.trimEnd().split("\n");
  assert.match(lines[lines.length - 1], /^RED — .*: \d+ floor violation\(s\)$/);
});

// ─── 15 session membership (GRILL R2-G7) ─────────────────────────────────────────────────────────────

test("15 a refused session STRING is still compared as itself: session-bound markers exclude it, unbound markers admit it with session_id null", () => {
  const hostile = spliced(lineA("req_hostile", T2), ["sessionId"], text("/Users/someone/x"));
  const bound = consumers(scratch([CLEAN(), hostile], { markerSession: SESSION }));
  assertCommon(bound, "session-bound markers");
  assert.equal(bound.ledger.requests.length, 1, "excluded, as before 6.27.1");
  assert.equal(bound.ledger.membership.excluded_requests, 1);
  const unbound = consumers(scratch([CLEAN(), hostile]));
  assertCommon(unbound, "unbound markers");
  assert.equal(unbound.ledger.requests.length, 2);
  assert.equal(unbound.ledger.requests.find((r) => r.request_id === "req_hostile").session_id, null);
  assert.ok(unbound.ledger.dropped.includes("requests[1].session_id"));
});

// ─── 16 WINDOW ORDER · 17 TYPED VALUES (the 6.27.1 review's R4 and R9) ────────────────────────────────

test("16 WINDOW ORDER (REVIEW R4): the record and the ledger order a mixed-precision window the same way", () => {
  // As strings `…:05.500Z` sorts BEFORE `…:05Z` ('.' < 'Z'); as numbers it is later. Both renderers order the window by
  // the string (the contract's Residual names it), and this pins that they AGREE, whichever order that is.
  const whole = "2026-09-26T10:00:05Z";
  const fraction = "2026-09-26T10:00:05.500Z";
  assert.equal([whole, fraction].sort()[0], fraction, "NON-VACUITY: the string order and the time order differ here");
  const out = consumers(scratch([JSON.stringify(lineA("req_w1", whole)), JSON.stringify(lineA("req_w2", fraction))]));
  assertCommon(out, "mixed precision");
  assert.equal(out.ledger.requests.length, 2, "both lines are members of the run");
  assert.deepEqual([out.record.window_start, out.record.window_end], [out.ledger.window_start, out.ledger.window_end]);
});

test("17 TYPED VALUES (REVIEW R9): a RED's '(got …)' keeps the value's type — a number, boolean or null unquoted, a string quoted", () => {
  const { ledger } = baseLedger();
  const redFor = (mutate, prefix) => {
    const doc = structuredClone(ledger);
    mutate(doc);
    return checkLedger(doc).reds.find((r) => r.startsWith(prefix));
  };
  const iterations = (v) =>
    redFor((d) => (d.outcome = { decision: "STOP_GREEN", iterations: v, source: "LOOP.md" }), "outcome.iterations must be");
  assert.match(iterations(1.5), /\(got 1\.5\)$/);
  assert.match(iterations("1.5"), /\(got "1\.5"\)$/, "the string stays distinguishable from the number");
  assert.match(iterations(true), /\(got true\)$/);
  assert.match(iterations({ a: 1 }), /\(got "\[object Object\]"\)$/, "an object still goes through shown()");
  assert.match(
    redFor((d) => (d.markers[0].seq = null), "markers[0].seq must be"),
    /\(got null\)$/
  );
  // The other sites that quote a file value (re-review F3): the membership recompute, the ids of rows outside the
  // window, and a view row's key. Each keeps a number unquoted and a string quoted.
  assert.match(
    redFor((d) => (d.membership.start = 5), "membership.start disagrees"),
    /\(stored 5, recomputed "/
  );
  const outside = (id) =>
    redFor((d) => {
      d.requests[0].ts = "2026-09-26T09:00:00.000Z";
      d.requests[0].request_id = id;
    }, "1 request(s) lie OUTSIDE");
  assert.match(outside(7), /summed into the run's totals: 7$/);
  assert.match(outside("7"), /summed into the run's totals: "7"$/);
  assert.match(
    redFor((d) => (d.by_model[0].model = 5), "by_model[0] disagrees"),
    /\(5 vs "/
  );
});

// ─── ✧ ONE ADDRESS ───────────────────────────────────────────────────────────────────────────────────

test("✧ ONE ADDRESS (L35): each moved name is exported from its new home only, never re-exported from the old one", async () => {
  const ledgerModule = await import("./render-cost-ledger.mjs");
  const formats = await import("./test-results-formats.mjs");
  const core = await import("./cost-value-core.mjs");
  const quote = await import("./quote-core.mjs");
  for (const name of ["ABS_PATH_RE", "IDENTITY_MAX", "isIdentityToken", "isTokenCount"]) {
    assert.ok(Object.hasOwn(core, name), `cost-value-core exports ${name}`);
    assert.ok(!Object.hasOwn(ledgerModule, name), `render-cost-ledger does not export ${name}`);
  }
  for (const name of ["shown", "SHOWN_CHARS"]) {
    assert.ok(Object.hasOwn(quote, name), `quote-core exports ${name}`);
    assert.ok(!Object.hasOwn(formats, name), `test-results-formats does not export ${name}`);
  }
});
