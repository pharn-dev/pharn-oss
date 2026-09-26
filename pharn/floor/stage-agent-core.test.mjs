// pharn/floor/stage-agent-core.test.mjs — the pure half of stage-model routing (6.27.0).
//
// Every assertion names the mutant that turns it red (L60). The policy table, the invocation table, the
// remedy table and the loop rows are each iterated from the module, never re-listed here (L29), except
// where a test pins a count on purpose (L34 — a count is what makes an empty iteration fail).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_MODELS, INLINE_REASONS, isRouteToken } from "./route-token-core.mjs";
import { EXIT_CODE } from "./stage-exit-core.mjs";
import {
  STAGE_AGENT_COMMANDS,
  STAGES,
  ITERATED_STAGES,
  STAGE_CONFIG_KEYS,
  AGENT,
  SKIPPED,
  POLICY_INLINE,
  POLICY_CELLS,
  FULL_MODE,
  ROUTE_POLICY,
  INVOCATIONS,
  INLINE_REMEDIES,
  LOOP_ROWS,
  FIX_LIST_FIELDS,
  RESULT_SCHEMA,
  RESULT_KEYS,
  RESULT_STATUSES,
  GATES,
  READ_EXIT,
  UNUSABLE_REASONS,
  NO_RESULT_TEXT,
  BRIEF_PROMPT_PREFIX,
  quote,
  policyCell,
  modesOf,
  decideRoute,
  reportLine,
  reportLines,
  briefLine,
  renderBrief,
  validateResult,
  readVerdict,
  unusableVerdict,
  buildResult,
  fixListApplies,
} from "./stage-agent-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CHECKER = join(HERE, "check-model-config.mjs");
const ASK_TOKEN_RE = /\bAsk(?:User)?Question\b/;
const PLACEHOLDER_RE = /<[A-Za-z][^>\n]*>/;
const HOSTILE = () => JSON.parse('{"toString":1}');

/** Every (command, mode, stage, cell) the policy holds — iterated, never listed (L29). */
function allCells(policy = ROUTE_POLICY) {
  const out = [];
  for (const command of Object.keys(policy)) {
    for (const mode of Object.keys(policy[command])) {
      for (const stage of Object.keys(policy[command][mode])) out.push({ command, mode, stage, cell: policy[command][mode][stage] });
    }
  }
  return out;
}

/** The iteration a cell needs for a valid brief/result. */
const iterFor = (stage, n = 1) => (ITERATED_STAGES.includes(stage) ? n : null);

// ── The policy table ─────────────────────────────────────────────────────────────────────────────────

/** Every way a policy table can fail totality. Extracted so the real table and a mutant copy run through
 *  the SAME code (L60). */
function policyTotalityReds(policy) {
  const reds = [];
  const cmds = Object.keys(policy).sort();
  if (JSON.stringify(cmds) !== JSON.stringify([...STAGE_AGENT_COMMANDS].sort())) reds.push(`commands ${cmds.join(",")}`);
  for (const command of cmds) {
    if (!Object.hasOwn(policy[command], FULL_MODE)) reds.push(`${command} has no ${FULL_MODE} column`);
    for (const mode of Object.keys(policy[command])) {
      const stages = Object.keys(policy[command][mode]).sort();
      if (JSON.stringify(stages) !== JSON.stringify([...STAGES].sort())) reds.push(`${command}/${mode} does not hold every stage`);
      for (const [stage, cell] of Object.entries(policy[command][mode])) {
        if (!POLICY_CELLS.includes(cell)) reds.push(`${command}/${mode}/${stage} holds ${cell}`);
      }
    }
  }
  return reds;
}

test("POLICY TOTALITY — every command has a full column, and every column holds every stage exactly once, each a policy cell", () => {
  assert.deepEqual(policyTotalityReds(ROUTE_POLICY), []);
  assert.equal(allCells().length, 21, "three columns x seven stages (ship full, ship quick, loop full) — L34");
});

test("POLICY TOTALITY DISCRIMINATES — a column missing one cell, or holding an unknown cell, fails (L60)", () => {
  const copy = JSON.parse(JSON.stringify(ROUTE_POLICY));
  delete copy["pharn-ship"].quick["pharn-test"];
  assert.match(policyTotalityReds(copy).join("\n"), /pharn-ship\/quick does not hold every stage/);
  const copy2 = JSON.parse(JSON.stringify(ROUTE_POLICY));
  copy2["pharn-loop"].full["pharn-verify"] = "fast";
  assert.match(policyTotalityReds(copy2).join("\n"), /holds fast/);
});

test("the policy's inline cells are inline REASONS, and the table is frozen", () => {
  for (const r of POLICY_INLINE) assert.ok(INLINE_REASONS.includes(r), `${r} must be a route-token inline reason`);
  assert.ok(Object.isFrozen(ROUTE_POLICY) && Object.isFrozen(ROUTE_POLICY["pharn-ship"].full), "frozen at every level");
});

test("the plan's policy, cell by cell — the routed set per column (a flipped cell fails, L60)", () => {
  const routed = (command, mode) =>
    allCells()
      .filter((c) => c.command === command && c.mode === mode && c.cell === AGENT)
      .map((c) => c.stage);
  assert.deepEqual(routed("pharn-ship", "full"), ["pharn-plan", "pharn-grill", "pharn-test", "pharn-build"]);
  assert.deepEqual(routed("pharn-ship", "quick"), ["pharn-plan", "pharn-test", "pharn-build"]);
  assert.deepEqual(routed("pharn-loop", "full"), ["pharn-spec", "pharn-plan", "pharn-grill", "pharn-test", "pharn-build"]);
  assert.equal(policyCell("pharn-ship", "full", "pharn-spec"), "interactive", "ship's spec IS GATE 1");
  assert.equal(policyCell("pharn-ship", "quick", "pharn-regress"), SKIPPED);
  assert.equal(policyCell("pharn-ship", "quick", "pharn-grill"), "floor-only");
  for (const command of STAGE_AGENT_COMMANDS) {
    for (const mode of modesOf(command)) {
      for (const stage of ["pharn-regress", "pharn-verify"]) {
        assert.ok(["floor-only", SKIPPED].includes(policyCell(command, mode, stage)), `${command}/${mode}/${stage} is never routed`);
      }
    }
  }
});

test("policyCell / modesOf are own-property lookups — an inherited name is never a member (L15)", () => {
  for (const bad of ["toString", "__proto__", "constructor", "hasOwnProperty"]) {
    assert.equal(policyCell(bad, FULL_MODE, "pharn-plan"), null);
    assert.equal(policyCell("pharn-ship", bad, "pharn-plan"), null);
    assert.equal(policyCell("pharn-ship", FULL_MODE, bad), null);
    assert.deepEqual(modesOf(bad), []);
  }
  assert.equal(policyCell("pharn-loop", "quick", "pharn-plan"), null, "/pharn-loop has no quick column in this base (amendment C)");
  assert.deepEqual(modesOf("pharn-loop"), ["full"]);
  assert.deepEqual(modesOf("pharn-ship").sort(), ["full", "quick"]);
});

test("INVOCATIONS holds exactly the agent cells — mutant: an invocation for an inline cell, or a routed cell without one", () => {
  const agentKeys = allCells()
    .filter((c) => c.cell === AGENT)
    .map((c) => `${c.command}/${c.mode}/${c.stage}`)
    .sort();
  const invKeys = [];
  for (const command of Object.keys(INVOCATIONS)) {
    for (const mode of Object.keys(INVOCATIONS[command]))
      for (const stage of Object.keys(INVOCATIONS[command][mode])) invKeys.push(`${command}/${mode}/${stage}`);
  }
  assert.deepEqual(invKeys.sort(), agentKeys);
  assert.equal(INVOCATIONS["pharn-loop"].full["pharn-test"], "/pharn-test <name> --unattended", "the loop's test stage never asks");
  assert.equal(INVOCATIONS["pharn-loop"].full["pharn-spec"], "/pharn-spec --model-approve");
});

test("INLINE_REMEDIES names a remedy for EVERY inline reason, and for nothing else (L27)", () => {
  assert.deepEqual(Object.keys(INLINE_REMEDIES).sort(), [...INLINE_REASONS].sort());
  for (const [r, text] of Object.entries(INLINE_REMEDIES)) assert.ok(typeof text === "string" && text.length > 10, `${r} has a remedy`);
});

// ── decideRoute — the truth table ─────────────────────────────────────────────────────────────────────

const resolved = (model, effort = "high") => ({ status: 0, stdout: `${JSON.stringify({ model, effort })}\n` });

test("decideRoute — POLICY PRECEDENCE: a policy-inline cell never consults the config", () => {
  for (const cell of POLICY_INLINE) {
    assert.deepEqual(decideRoute(cell), { token: `inline:${cell}`, exit: 3, reason: cell }, "no observation at all");
    assert.equal(decideRoute(cell, { configPresent: false }).token, `inline:${cell}`, "a missing config does not turn it into no-config");
    assert.equal(
      decideRoute(cell, { configPresent: true, resolve: resolved("opus") }).token,
      `inline:${cell}`,
      "a routable config does not route it"
    );
  }
  assert.deepEqual(decideRoute(SKIPPED), { refuse: "skipped" });
  assert.deepEqual(decideRoute("fast"), { refuse: "unknown-cell" });
  assert.deepEqual(decideRoute(HOSTILE()), { refuse: "unknown-cell" }, "a hostile cell never throws");
});

test("decideRoute — the agent cell asks for exactly one observation at a time", () => {
  assert.deepEqual(decideRoute(AGENT), { need: "config" });
  assert.deepEqual(decideRoute(AGENT, { configPresent: true }), { need: "resolve" });
  assert.deepEqual(decideRoute(AGENT, { configPresent: true, resolve: { status: 1, stdout: "" } }), { need: "validate" });
  assert.deepEqual(decideRoute(AGENT, null), { need: "config" }, "a null observation set is treated as empty");
});

test("decideRoute — every row of the fallback table, from synthetic observations", () => {
  const rows = [
    [{ configPresent: false }, "inline:no-config", 3],
    [{ configPresent: true, resolve: { status: 1, stdout: "" }, validate: { status: 0 } }, "inline:no-stages", 3],
    [{ configPresent: true, resolve: { status: 1, stdout: "" }, validate: { status: 1 } }, "inline:config-red", 3],
    [{ configPresent: true, resolve: resolved("inherit") }, "inline:inherit", 3],
    [{ configPresent: true, resolve: resolved("claude-opus-5-5") }, "inline:model-id", 3],
    [{ configPresent: true, resolve: { status: 2, stdout: "" } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: { status: null, stdout: "" } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: { status: 0, stdout: "not json" } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: { status: 0, stdout: '{"model":"opus"}' } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: { status: 0, stdout: '{"model":1,"effort":"high"}' } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: { status: 0, stdout: '["opus"]' } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: { status: 0, stdout: "null" } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: resolved("gpt") }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: resolved("Opus") }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: { status: 1, stdout: "" }, validate: { status: 2 } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: { status: 1, stdout: "" }, validate: { status: null } }, "inline:resolve-failed", 3],
    [{ configPresent: true, resolve: null }, "inline:resolve-failed", 3],
  ];
  for (const [obs, token, exit] of rows) {
    const d = decideRoute(AGENT, obs);
    assert.equal(d.token, token, JSON.stringify(obs));
    assert.equal(d.exit, exit);
    assert.ok(isRouteToken(d.token), "every decision is a grammar-valid token");
  }
});

test("decideRoute — every agent alias routes to itself, and only those four", () => {
  for (const alias of AGENT_MODELS) {
    const d = decideRoute(AGENT, { configPresent: true, resolve: resolved(alias) });
    assert.deepEqual([d.token, d.exit], [`agent:${alias}`, 0]);
  }
});

// ── The brief ─────────────────────────────────────────────────────────────────────────────────────────

test("renderBrief — every ROUTED cell renders; every other cell is refused", () => {
  let rendered = 0;
  for (const c of allCells()) {
    const b = renderBrief({ command: c.command, mode: c.mode, stage: c.stage, name: "demo", iteration: iterFor(c.stage) });
    if (c.cell === AGENT) {
      assert.equal(b.ok, true, `${c.command}/${c.mode}/${c.stage}: ${b.reason}`);
      rendered++;
    } else assert.equal(b.ok, false, `${c.command}/${c.mode}/${c.stage} is ${c.cell} and must have no brief`);
  }
  assert.equal(rendered, 12, "4 ship-full + 3 ship-quick + 5 loop cells (L34)");
});

test("renderBrief — the invocation, the exact report lines, rule 5's trust wording; no placeholder, no ask tool", () => {
  for (const c of allCells().filter((x) => x.cell === AGENT)) {
    const iteration = iterFor(c.stage);
    const b = renderBrief({ command: c.command, mode: c.mode, stage: c.stage, name: "demo", iteration });
    const where = `${c.command}/${c.mode}/${c.stage}`;
    assert.ok(b.text.includes(INVOCATIONS[c.command][c.mode][c.stage].replace("<name>", "demo")), `${where}: names its fixed invocation`);
    assert.ok(b.text.includes(`.claude/commands/${c.stage}.md`), `${where}: names its command file`);
    for (const l of reportLines({ command: c.command, stage: c.stage, name: "demo", iteration })) {
      assert.ok(b.text.includes(`   ${l}\n`), `${where}: carries the exact report line ${l}`);
    }
    assert.match(b.text, /The stage command's own trust rules govern everything it reads; this brief makes nothing trusted or untrusted/);
    assert.match(b.text, /pharn\/CONSTITUTION\.md/);
    assert.doesNotMatch(b.text, PLACEHOLDER_RE, `${where}: an unresolved <…> placeholder`);
    assert.doesNotMatch(b.text, ASK_TOKEN_RE, `${where}: names an interactive-ask tool`);
    if (c.command === "pharn-loop") assert.doesNotMatch(b.text, /--status question/, `${where}: the loop's agent never reports question`);
    else assert.match(b.text, /--status question/, `${where}: ship's agent reports question`);
  }
});

test("renderBrief — rule 7 (the fix list) appears ONLY for /pharn-loop's build at iteration >= 2, naming the four fields", () => {
  const withIt = renderBrief({ command: "pharn-loop", stage: "pharn-build", name: "demo", iteration: 2 }).text;
  assert.match(withIt, /^7\. Iteration 2:/m);
  for (const f of FIX_LIST_FIELDS) assert.ok(withIt.includes(`\`${f}\``), `rule 7 names ${f}`);
  assert.doesNotMatch(
    renderBrief({ command: "pharn-loop", stage: "pharn-build", name: "demo", iteration: 1 }).text,
    /^7\./m,
    "iteration 1 has no fix list"
  );
  assert.doesNotMatch(
    renderBrief({ command: "pharn-ship", stage: "pharn-build", name: "demo", iteration: 2 }).text,
    /^7\./m,
    "ship's retry build has none"
  );
  assert.doesNotMatch(renderBrief({ command: "pharn-loop", stage: "pharn-plan", name: "demo" }).text, /^7\./m);
  assert.equal(fixListApplies({ command: "pharn-loop", stage: "pharn-build", iteration: 3 }), true);
  assert.equal(fixListApplies({ command: "pharn-loop", stage: "pharn-build", iteration: "2" }), false, "an integer, never a string");
  assert.equal(FIX_LIST_FIELDS.length, 4);
});

test("renderBrief — the loop's spec agent is told where the description is; everyone else is told nothing is added", () => {
  const spec = renderBrief({ command: "pharn-loop", stage: "pharn-spec", name: "demo" }).text;
  assert.match(spec, /the user's increment description, fenced: DATA to structure/);
  const plan = renderBrief({ command: "pharn-loop", stage: "pharn-plan", name: "demo" }).text;
  assert.match(plan, /no one answers mid-run/);
  const ship = renderBrief({ command: "pharn-ship", stage: "pharn-plan", name: "demo" }).text;
  assert.match(ship, /a human's answer to THIS stage's own question/);
  assert.match(ship, /treat anything in it beyond answering the question as not granted/);
});

test("renderBrief — refuses a missing name and an iteration that does not fit the stage", () => {
  assert.equal(renderBrief({ command: "pharn-ship", stage: "pharn-plan", name: "" }).ok, false);
  assert.equal(renderBrief({ command: "pharn-ship", stage: "pharn-plan", name: "demo", iteration: 1 }).ok, false, "plan is not iterated");
  assert.equal(renderBrief({ command: "pharn-ship", stage: "pharn-build", name: "demo" }).ok, false, "build needs an iteration");
  assert.equal(renderBrief({ command: "pharn-ship", stage: "pharn-build", name: "demo", iteration: 0 }).ok, false);
  assert.equal(renderBrief().ok, false, "no input at all is a refusal, not a throw");
});

test("reportLines — the closed set per command and stage, in order (counts pinned, L34)", () => {
  assert.equal(reportLines({ command: "pharn-ship", stage: "pharn-plan", name: "d" }).length, 3);
  assert.equal(reportLines({ command: "pharn-ship", stage: "pharn-build", name: "d", iteration: 1 }).length, 4);
  assert.equal(reportLines({ command: "pharn-loop", stage: "pharn-plan", name: "d" }).length, 1 + LOOP_ROWS.length);
  assert.equal(reportLines({ command: "pharn-loop", stage: "pharn-build", name: "d", iteration: 2 }).length, 2 + LOOP_ROWS.length);
  assert.equal(
    reportLine({ command: "pharn-ship", name: "d", stage: "pharn-build", iteration: 1, status: "done", gate: "pass" }),
    "node pharn/floor/stage-agent.mjs report --command pharn-ship --name 'd' --stage pharn-build --iteration 1 --status done --gate pass"
  );
  assert.equal(
    briefLine({ command: "pharn-ship", stage: "pharn-grill", name: "d", mode: "quick" }),
    "node pharn/floor/stage-agent.mjs brief --command pharn-ship --stage pharn-grill --name 'd' --mode quick"
  );
  assert.equal(BRIEF_PROMPT_PREFIX, "Run exactly this line, then follow what it prints: ");
});

// ── The result ────────────────────────────────────────────────────────────────────────────────────────

const exp = (o = {}) => ({ command: "pharn-ship", name: "demo", stage: "pharn-plan", iteration: null, ...o });
const res = (o = {}) => ({ ...buildResult({ command: "pharn-ship", name: "demo", stage: "pharn-plan", status: "done" }), ...o });

test("validateResult — a valid result per status reads back", () => {
  assert.deepEqual(validateResult(res(), exp()), { ok: true, result: res() });
  assert.equal(validateResult(res({ status: "refused" }), exp()).ok, true);
  assert.equal(validateResult(res({ status: "question" }), exp()).ok, true);
  const build = res({ stage: "pharn-build", iteration: 2, gate: "fail" });
  assert.equal(validateResult(build, exp({ stage: "pharn-build", iteration: 2 })).ok, true);
  const loop = res({ command: "pharn-loop", status: "refused", row: "S9" });
  assert.equal(validateResult(loop, exp({ command: "pharn-loop" })).ok, true);
});

test("validateResult — CLOSED both ways: an extra key, a missing key, a wrong schema are each malformed (L36)", () => {
  assert.equal(validateResult({ ...res(), extra: 1 }, exp()).reason, "malformed");
  const missing = res();
  delete missing.gate;
  assert.equal(validateResult(missing, exp()).reason, "malformed");
  assert.equal(validateResult(res({ schema: "pharn-stage-agent-result/2" }), exp()).reason, "malformed");
  assert.equal(RESULT_KEYS.length, 8);
  assert.equal(RESULT_SCHEMA, "pharn-stage-agent-result/1");
});

test("validateResult — the cross-field rules: row, gate and iteration each only where they belong", () => {
  const bad = [
    [res({ row: "S9" }), exp(), "a row for ship"],
    [res({ command: "pharn-loop", row: "S9" }), exp({ command: "pharn-loop" }), "a row with done"],
    [res({ gate: "pass" }), exp(), "a gate off build"],
    [res({ stage: "pharn-build", iteration: 1 }), exp({ stage: "pharn-build", iteration: 1 }), "a build done without its gate"],
    [
      res({ stage: "pharn-build", iteration: 1, status: "refused", gate: "pass" }),
      exp({ stage: "pharn-build", iteration: 1 }),
      "a gate with refused",
    ],
    [res({ iteration: 1 }), exp({ iteration: 1 }), "an iteration on a non-iterated stage"],
    [res({ stage: "pharn-build", gate: "pass" }), exp({ stage: "pharn-build" }), "a build without an iteration"],
    [res({ status: "passed" }), exp(), "a status outside the set"],
    [res({ command: "pharn-loop", status: "refused", row: "S11" }), exp({ command: "pharn-loop" }), "a row outside LOOP_ROWS"],
    [res({ gate: "green", stage: "pharn-build", iteration: 1 }), exp({ stage: "pharn-build", iteration: 1 }), "a gate outside the set"],
    [res({ stage: "pharn-build", iteration: 1.5, gate: "pass" }), exp({ stage: "pharn-build", iteration: 1.5 }), "a fractional iteration"],
  ];
  for (const [obj, e, why] of bad) assert.equal(validateResult(obj, e).reason, "malformed", why);
});

test("validateResult — a result for another command, feature, stage or iteration is a MISMATCH", () => {
  assert.equal(validateResult(res(), exp({ command: "pharn-loop" })).reason, "mismatch");
  assert.equal(validateResult(res(), exp({ name: "other" })).reason, "mismatch");
  assert.equal(validateResult(res(), exp({ stage: "pharn-grill" })).reason, "mismatch");
  const build = res({ stage: "pharn-build", iteration: 1, gate: "pass" });
  assert.equal(
    validateResult(build, exp({ stage: "pharn-build", iteration: 2 })).reason,
    "mismatch",
    "a stale iteration-1 result never answers iteration 2"
  );
});

test('validateResult — {"toString":1} in EVERY field is malformed and never throws (L62)', () => {
  assert.throws(() => String(HOSTILE()), TypeError, "CONTROL: the value really does make String() throw");
  for (const k of RESULT_KEYS) {
    const v = validateResult({ ...res(), [k]: HOSTILE() }, exp());
    assert.equal(v.ok, false, k);
    assert.equal(v.reason, "malformed", k);
    assert.equal(typeof v.detail, "string");
  }
  for (const top of [null, "done", 1, [], [res()], HOSTILE()]) assert.equal(validateResult(top, exp()).ok, false);
  const oddKey = validateResult({ ...res(), "bad\nkey": 1 }, exp());
  assert.equal(oddKey.reason, "malformed", "an odd key name is quoted, not thrown on");
  assert.ok(!oddKey.detail.includes("\n"), "a quoted key never spans a line");
  // A parsed `__proto__` key is an OWN property of a JSON.parse result — closure must still see it.
  const proto = JSON.parse(`{${JSON.stringify(res()).slice(1, -1)},"__proto__":1}`);
  assert.equal(validateResult(proto, exp()).reason, "malformed", "a parsed __proto__ key is an extra key");
});

test("readVerdict / unusableVerdict — the closed lines and exits", () => {
  assert.deepEqual(readVerdict(res()), { line: "done", exit: 0 });
  assert.deepEqual(readVerdict(res({ stage: "pharn-build", iteration: 1, gate: "pass" })), { line: "done gate:pass", exit: 0 });
  assert.deepEqual(readVerdict(res({ status: "refused" })), { line: "refused", exit: 3 });
  assert.deepEqual(readVerdict(res({ command: "pharn-loop", status: "refused", row: "S7" })), { line: "refused S7", exit: 3 });
  assert.deepEqual(readVerdict(res({ status: "question" })), { line: "question", exit: 4 });
  assert.deepEqual(unusableVerdict("no-result"), { line: `unusable no-result — ${NO_RESULT_TEXT}`, exit: 2 });
  for (const r of UNUSABLE_REASONS.filter((x) => x !== "no-result"))
    assert.deepEqual(unusableVerdict(r), { line: `unusable ${r}`, exit: 2 });
  assert.equal(unusableVerdict("anything").line, "unusable malformed", "an unknown reason falls closed");
  assert.match(NO_RESULT_TEXT, /may still be running, or ended without reporting/);
});

test("✧ PARITY: READ_EXIT uses the stage-exit numbers, and never 1 (node's crash code)", () => {
  for (const s of RESULT_STATUSES) assert.equal(READ_EXIT[s], EXIT_CODE[s], s);
  assert.equal(READ_EXIT.unusable, EXIT_CODE.unusable);
  assert.ok(!Object.values(READ_EXIT).includes(1));
  assert.deepEqual(GATES, ["pass", "fail"]);
});

test("quote() is total over hostile values and never spans a line (L62)", () => {
  for (const v of [HOSTILE(), [HOSTILE()], undefined, Symbol("s"), () => 1, 10n, "a\nb", "x".repeat(500), null]) {
    const q = quote(v);
    assert.equal(typeof q, "string");
    assert.ok(!/[\n\r]/.test(q), "no newline");
    assert.ok(q.length <= 81, "bounded");
  }
});

// ── ✧ STAGE_CONFIG_KEYS parity, through the REAL checker ──────────────────────────────────────────────
// A typo'd key would resolve to `default` silently (the checker's own documented fallback), so the fixture
// gives EVERY key its own distinct model id and requires each stage to resolve to its own.

test("✧ PARITY: every STAGE_CONFIG_KEYS value resolves to ITS OWN model through check-model-config.mjs", () => {
  assert.deepEqual(Object.keys(STAGE_CONFIG_KEYS).sort(), [...STAGES].sort(), "one key per stage");
  const dir = mkdtempSync(join(tmpdir(), "stage-keys-"));
  try {
    const stages = { default: { model: "claude-k-default", effort: "high" } };
    for (const key of Object.values(STAGE_CONFIG_KEYS)) stages[key] = { model: `claude-k-${key}`, effort: "high" };
    const config = join(dir, "pharn.config.json");
    writeFileSync(config, JSON.stringify({ models: { stages } }));
    for (const [stage, key] of Object.entries(STAGE_CONFIG_KEYS)) {
      const r = spawnSync(process.execPath, [CHECKER, "resolve", key, "--config", config], { encoding: "utf8" });
      assert.equal(r.status, 0, `${stage}: ${r.stdout}${r.stderr}`);
      assert.equal(JSON.parse(r.stdout).model, `claude-k-${key}`, `${stage} must resolve its OWN key, never default`);
    }
    // CONTROL (L60): a key the config does not hold falls back to default — the silent failure this pins against.
    const typo = spawnSync(process.execPath, [CHECKER, "resolve", "bulid", "--config", config], { encoding: "utf8" });
    assert.equal(JSON.parse(typo.stdout).model, "claude-k-default");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── LOOP_ROWS ⊆ pharn-loop.md's stuck-point table ─────────────────────────────────────────────────────

test("LOOP_ROWS is a subset of pharn-loop.md Step 2's stuck-point ids (S9 and S10 included)", () => {
  const body = readFileSync(join(REPO, ".claude", "commands", "pharn-loop.md"), "utf8");
  const ids = new Set([...body.matchAll(/^\|\s*(S\d+b?)\s*\|/gm)].map((m) => m[1]));
  assert.ok(ids.size >= 13, `the table scan found ${ids.size} rows — the scan broke (L34)`);
  for (const r of LOOP_ROWS) assert.ok(ids.has(r), `${r} is not a stuck-point row in pharn-loop.md`);
  assert.ok(LOOP_ROWS.includes("S9") && LOOP_ROWS.includes("S10"), "the two fallback rows");
  for (const r of ["S11", "S12", "S13"]) assert.ok(!LOOP_ROWS.includes(r), `${r} is decided by a checker, never reported by an agent`);
});
