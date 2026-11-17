// .dev/features/loop-driver-spike/driver/loop-driver.test.mjs — the CORE-113 spike driver's own checks.
//
// Runs under `npm test` (its first glob, `**/*.test.mjs`, reaches this path) and so in CI's test job. What it proves
// is PLUMBING (L4): the tables are closed, conditionals sit only in the interpreter, scripted exit codes walk the
// program where its tables say, the rendered LOOP.md passes the real product checker, and the token and measure
// helpers compute what they claim. It proves nothing about a live driven loop; the record's figures come from the
// maintainer's runs.

import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { BLOCKED_IDS } from "../../../../pharn/floor/loop-record-core.mjs";
import {
  ACTION_RE,
  buildProgram,
  interpret,
  MAX_AGAIN,
  NEXT_STEPS,
  REFUSED,
  revertSpecText,
  ROW_IDS,
  validateArgs,
} from "./driver-core.mjs";
import { driverFigures, ledgerFigures, loopStream, measure, readStream, stageOfStep, summarizeRequests, weighted } from "./measure.mjs";
import { TABLES, tokenExit } from "./token-exit.mjs";

const HERE = import.meta.dirname;
const REPO = join(HERE, "..", "..", "..", "..");
const CHECKER = join(REPO, "pharn", "floor", "check-loop-record.mjs");
const NAME = "lg3-remove-files";
const ISO =
  '{"outcome":"HOST","evidence":["cred:ssh-dir","cred:ssh-agent","cred:gh-hosts","cred:credential-helper","cred:aws-credentials","cred:npmrc-home"],"accepted_host_execution":true}';
const SHA = "7e48564d71c510b223a2d56459e938c3d45f66d9";
const program = buildProgram();

// ── AC2: the tables are closed ────────────────────────────────────────────────────────────────────────────────

test("★ CLOSURE: every step's actions are in the closed vocabulary, every exit key is an integer, every goto resolves", () => {
  const ids = Object.keys(program.steps);
  assert.ok(ids.length > 60, "the program has its steps");
  for (const [id, step] of Object.entries(program.steps)) {
    assert.ok(["cmd", "session", "fn"].includes(step.kind), `${id}: kind ${step.kind}`);
    assert.equal(typeof step.otherwise, "string", `${id}: an explicit otherwise`);
    const actions = [...Object.values(step.on), step.otherwise];
    for (const k of Object.keys(step.on)) assert.match(k, /^(0|[1-9]\d{0,2})$/, `${id}: exit key ${k}`);
    for (const a of actions) {
      assert.match(a, ACTION_RE, `${id}: action ${a}`);
      if (a.startsWith("goto:")) assert.ok(Object.hasOwn(program.steps, a.slice(5)), `${id}: goto ${a} resolves`);
      if (a.startsWith("stop:")) assert.ok(Object.hasOwn(ROW_IDS, a.slice(5)), `${id}: row ${a}`);
    }
  }
  assert.ok(Object.hasOwn(program.steps, program.start));
  for (const entry of ["c-abort", "c-abort-green", "build-start", "c-release"]) assert.ok(Object.hasOwn(program.steps, entry));
});

test("★ CLOSURE: every row id is a loop-record blocked id, and every row has its next-steps text", () => {
  for (const [row, id] of Object.entries(ROW_IDS)) assert.ok(BLOCKED_IDS.includes(id), `${row} → ${id}`);
  assert.deepEqual(Object.keys(NEXT_STEPS).sort(), Object.keys(ROW_IDS).sort());
});

test("★ CLOSURE: the driver's refused-row codes equal token-exit's table indices", () => {
  for (const [row, code] of Object.entries(REFUSED)) assert.equal(code, 10 + TABLES["refused-row"].indexOf(`refused ${row}`), row);
  assert.equal(Object.keys(REFUSED).length, TABLES["refused-row"].length);
});

// ── AC2: conditionals only inside the interpreter ─────────────────────────────────────────────────────────────

/** Code with comments, strings, template text and regex literals removed (template EXPRESSIONS are kept). */
export function stripCode(src) {
  let out = "";
  let i = 0;
  let mode = "code";
  const stack = [];
  const regexOk = () => /(^|[(,=:[!&|?{};+\-*%<>~^]|\breturn)\s*$/.test(out);
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === "tpl") {
      if (c === "\\") i += 2;
      else if (c === "`") ((mode = "code"), (i += 1));
      else if (c === "$" && n === "{") (stack.push("tpl"), (mode = "code"), (i += 2));
      else i += 1;
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
    } else if (c === "/" && n === "*") {
      i = src.indexOf("*/", i + 2) + 2;
    } else if (c === "'" || c === '"') {
      i += 1;
      while (src[i] !== c) i += src[i] === "\\" ? 2 : 1;
      i += 1;
      out += '""';
    } else if (c === "`") {
      mode = "tpl";
      i += 1;
      out += '""';
    } else if (c === "{") {
      stack.push("brace");
      out += c;
      i += 1;
    } else if (c === "}") {
      if (stack.pop() === "tpl") mode = "tpl";
      else out += c;
      i += 1;
    } else if (c === "/" && regexOk()) {
      i += 1;
      let cls = false;
      while (i < src.length && (src[i] !== "/" || cls)) {
        if (src[i] === "\\") i += 1;
        else if (src[i] === "[") cls = true;
        else if (src[i] === "]") cls = false;
        i += 1;
      }
      i += 1;
      while (/[a-z]/.test(src[i] ?? "")) i += 1;
      out += "R";
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

const CONDITIONAL = /\bif\b|\belse\b|\bswitch\b|\bcase\b|\btry\b|\bcatch\b|\?\?|\|\||&&|\?(?![.?])/g;

test("★ AC2: no conditional token outside the interpreter region (driver-core.mjs) or anywhere in loop-driver.mjs", () => {
  const core = readFileSync(join(HERE, "driver-core.mjs"), "utf8");
  const begin = core.indexOf("// ==== INTERPRETER BEGIN ====");
  const end = core.indexOf("// ==== INTERPRETER END ====");
  assert.ok(begin > 0 && end > begin, "the region markers exist, in order");
  const outside = stripCode(core.slice(0, begin)) + stripCode(core.slice(end));
  assert.deepEqual(outside.match(CONDITIONAL) ?? [], [], "driver-core.mjs outside the interpreter");
  const cli = stripCode(readFileSync(join(HERE, "loop-driver.mjs"), "utf8"));
  assert.deepEqual(cli.match(CONDITIONAL) ?? [], [], "loop-driver.mjs");
  // non-vacuity: the scan sees a conditional in the interpreter region, and ignores one in a comment or a string
  assert.ok((stripCode(core.slice(begin, end)).match(CONDITIONAL) ?? []).length > 10);
  assert.deepEqual(stripCode("// if (x) y\nconst a = 'a ? b : c'; const t = `x ${'if'}`;").match(CONDITIONAL) ?? [], []);
  assert.equal((stripCode("const a = b ? c : d; const e = f?.g;").match(CONDITIONAL) ?? []).length, 1);
  assert.equal((stripCode("const t = `${a ?? b}`;").match(CONDITIONAL) ?? []).length, 1, "a template expression is code");
});

// ── The interpreter, walked with scripted exit codes ──────────────────────────────────────────────────────────

const SPEC_APPROVED = `---\nspec_id: ${NAME}\nstate: Approved\nspec_content_hash: "abc"\napproved_by: model\nspec_kind: quick\n---\n\n## Intent\n\nx\n`;

function fakeIo(script, { throwAt = [], writeThrows = [] } = {}) {
  const calls = {};
  const log = [];
  const proj = new Map([
    [`pharn/.run/pharn-loop/${NAME}/isolation.json`, `${ISO}\n`],
    [`pharn/features/${NAME}/SPEC.md`, SPEC_APPROVED],
  ]);
  return {
    proj,
    log,
    calls,
    uuid: () => `00000000-0000-4000-8000-${String(log.length).padStart(12, "0")}`,
    today: () => "2026-11-16",
    note: (m) => log.push(["note", m]),
    record: (e) => (log.push([e.id, e.exit]), e.exit),
    spawn: (id, argv) => {
      if ([].concat(throwAt).includes(id)) throw new Error("scripted crash");
      const n = (calls[id] = (calls[id] ?? 0) + 1);
      const s = script[id];
      const v = Array.isArray(s) ? s[Math.min(n - 1, s.length - 1)] : (s ?? 0);
      const r = typeof v === "number" ? { status: v, stdout: "" } : v;
      log.push([id, r.status, argv]);
      return r;
    },
    saveStdout: (id, text, ctx) => {
      ctx.lastStdout[id] = `/stdout/${id}`;
    },
    session: (id, stage, argv, sid, ctx) => {
      calls[id] = (calls[id] ?? 0) + 1;
      ctx.sessions.push({ stage, model: argv[argv.indexOf("--model") + 1], agent: argv.includes("--agent") });
      log.push([id, 0, argv]);
      return { status: 0 };
    },
    writeProject: (rel, t) => {
      if (writeThrows.includes(rel)) throw new Error("scripted write failure");
      proj.set(rel, t);
    },
    mkdirProject: () => {},
    editProject: (rel, fn) => proj.set(rel, fn(proj.get(rel))),
    readProjectLine: (rel) => {
      if (!proj.has(rel)) throw new Error("absent");
      return proj.get(rel).split("\n")[0];
    },
  };
}

const json = (o, status = 0) => ({ status, stdout: JSON.stringify(o) + "\n" });
const agent = (alias) => ({ status: 0, stdout: `agent:${alias}\nmarker: written\n` });
const BASE_SCRIPT = {
  "d-loop-model": json({ model: "sonnet", effort: "high" }),
  "e-name": { status: 0, stdout: `${NAME}\n` },
  "e-head": { status: 0, stdout: `${SHA}\n` },
  "e-branch": { status: 1, stdout: "" },
  "e-isolation": { status: 0, stdout: `${ISO}\n` },
  "spec-start": agent("opus"),
  "spec-effort": json({ model: "opus", effort: "high" }),
  "spec-kind-token": 10,
  "peek-1": 5,
  "plan-start": agent("opus"),
  "plan-effort": json({ model: "opus", effort: "xhigh" }),
  "peek-2": 5,
  "grill-start": 3,
  "entry-wait": [5, 0],
  "test-start": agent("opus"),
  "test-effort": json({ model: "opus", effort: "high" }),
  "probe-deny-check": 1,
  "build-start": agent("sonnet"),
  "build-effort": json({ model: "sonnet", effort: "high" }),
  verify: 5,
  "verify-resume": 0,
  "stop-read": json({ decision: "STOP_GREEN_QUICK" }, 0),
  "c-head": { status: 0, stdout: `${SHA}\n` },
  "c-closeout": { status: 0, stdout: `step output\n${JSON.stringify({ outcome: `committed pharn-loop/${NAME}` })}\n` },
};

function ctxFor(answer = "yes") {
  return validateArgs(
    { project: "/p", out: "/o", slug: NAME, intent: "/i.md", answer },
    {
      cwd: "/",
      exists: (p) => p === "/p/pharn.config.json",
      readText: () => "Remove the file library.\n\n```js\nx\n```\n",
      nodePath: "node",
      driverDir: "/d",
    }
  );
}

function walk(over = {}, opts = {}, answer = "yes") {
  const io = fakeIo({ ...BASE_SCRIPT, ...over }, opts);
  const ctx = interpret(program, ctxFor(answer), io);
  return { io, ctx, ids: ctx.trail.map((t) => t[0]) };
}

function checkRecord(text) {
  const root = mkdtempSync(join(tmpdir(), "loop-driver-"));
  try {
    const rec = join(root, "pharn", "features", NAME, "LOOP.md");
    const wit = join(root, "pharn", ".run", "pharn-loop", NAME, "isolation.json");
    mkdirSync(dirname(rec), { recursive: true });
    mkdirSync(dirname(wit), { recursive: true });
    writeFileSync(rec, text);
    writeFileSync(wit, `${ISO}\n`);
    return spawnSync(process.execPath, [CHECKER, rec], { encoding: "utf8", cwd: root });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("walk: a green quick run reaches STOP_GREEN_QUICK, writes a record the product checker accepts, and closes", () => {
  const { io, ctx, ids } = walk();
  assert.equal(ctx.stop.kind, "green");
  assert.equal(ids.at(-1), "c-close");
  assert.ok(ids.includes("probe-q-ask") && ids.includes("probe-q-answer") && ids.includes("probe-q-check"));
  assert.ok(!ids.some((i) => i.startsWith("c6a-")), "no revert on a green stop");
  assert.equal(ctx.spec, "approved by the model");
  assert.equal(io.calls["entry-wait"], 2, "a 5 from the wait runs it again");
  const rec = io.proj.get(`pharn/features/${NAME}/LOOP.md`);
  assert.match(rec, /^decision: STOP_GREEN_QUICK$/m);
  assert.match(rec, /^mode: quick$/m);
  assert.match(rec, /^cap: 3$/m);
  assert.match(rec, /^commit: committed pharn-loop\/lg3-remove-files$/m);
  const r = checkRecord(rec);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // every session (routed stages, the inline grill, both probes) runs in auto mode with no skip flag or allow list
  const sessions = io.log.filter(([id]) => Object.hasOwn(program.steps, id) && program.steps[id].kind === "session");
  assert.equal(sessions.length, 8);
  for (const [, , argv] of sessions) {
    assert.deepEqual(argv.slice(argv.indexOf("--permission-mode"), argv.indexOf("--permission-mode") + 2), ["--permission-mode", "auto"]);
    for (const bad of [
      "--dangerously-skip-permissions",
      "--allow-dangerously-skip-permissions",
      "bypassPermissions",
      "--allowedTools",
      "--allowed-tools",
    ]) {
      assert.ok(!argv.includes(bad), `no ${bad}`);
    }
  }
  const spec = io.log.find(([id]) => id === "spec-session")[2];
  assert.equal(spec[spec.indexOf("--model") + 1], "opus");
  assert.match(
    spec.at(-1),
    /^Run exactly this line, then follow what it prints: node pharn\/floor\/stage-agent\.mjs brief --command pharn-loop --stage pharn-spec --name 'lg3-remove-files' --mode quick\n\n````DATA\n/
  );
  const build = io.log.find(([id]) => id === "build-start")[2];
  assert.deepEqual(build.slice(-4), ["--iteration", "1", "--mode", "quick"]);
  const finish = io.log.find(([id]) => id === "build-finish")[2];
  assert.ok(!finish.includes("--budget-ms"), "finish runs without --budget-ms (GRILL concern 2)");
  const plan = io.log.find(([id]) => id === "plan-session")[2];
  assert.deepEqual(plan.slice(plan.indexOf("--effort"), plan.indexOf("--effort") + 2), ["--effort", "xhigh"]);
});

test("walk: CONTINUE then STOP_CAP iterates the build, reverts the SPEC and records the decision", () => {
  const { io, ctx, ids } = walk({
    "stop-read": [json({ decision: "CONTINUE" }, 3), json({ decision: "STOP_CAP" }, 1)],
    "c-closeout": { status: 3, stdout: `${JSON.stringify({ outcome: "not committed: STOP_CAP" })}\n` },
  });
  assert.equal(ctx.iter, 2);
  assert.equal(io.calls["build-start"], 2);
  assert.deepEqual(io.log.filter(([id]) => id === "build-start")[1][2].slice(-4), ["--iteration", "2", "--mode", "quick"]);
  assert.equal(ctx.stop.kind, "decision");
  assert.ok(ids.includes("c6a-edit"));
  assert.equal(ctx.spec, "reverted to Draft");
  assert.match(io.proj.get(`pharn/features/${NAME}/SPEC.md`), /^state: Draft$/m);
  const rec = io.proj.get(`pharn/features/${NAME}/LOOP.md`);
  assert.match(rec, /^decision: STOP_CAP$/m);
  assert.match(rec, /^iterations: 2$/m);
  const r = checkRecord(rec);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("walk: a spec agent's `refused S6c` stops not-quick with a blocked record", () => {
  const { io, ctx } = walk({ "spec-finish": 3, "spec-row": 14, "c6a-approved": 1 });
  assert.deepEqual([ctx.stop.kind, ctx.stop.row], ["blocked", "S6c"]);
  assert.equal(ctx.spec, "not approved");
  const rec = io.proj.get(`pharn/features/${NAME}/LOOP.md`);
  assert.match(rec, /^blocked: not-quick$/m);
  assert.doesNotMatch(rec, /^cap:/m);
  const r = checkRecord(rec);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("walk: an exit outside a step's table takes its otherwise (scope 7 → S9)", () => {
  const { ctx } = walk({ scope: 7 });
  assert.deepEqual([ctx.stop.row, ctx.stop.at, ctx.stop.exit], ["S9", "scope", 7]);
});

test("walk: a quick RERUN naming regress is S11; one naming verify re-runs verify in the same iteration", () => {
  assert.equal(walk({ fresh: 1, "fresh-rerun": 11 }).ctx.stop.row, "S11");
  const { io, ctx } = walk({ fresh: [1, 0], "fresh-rerun": 10 });
  assert.equal(ctx.stop.kind, "green");
  assert.equal(io.calls.verify, 2);
  assert.equal(ctx.iter, 1);
});

test("walk: a landed probe write stops the run (S9 at probe-deny-check); no answer skips the question probe", () => {
  assert.deepEqual([walk({ "probe-deny-check": 0 }).ctx.stop.row, walk({ "probe-deny-check": 0 }).ctx.stop.at], ["S9", "probe-deny-check"]);
  const { ids } = walk({ "probe-q-gate": 1 }, {}, "");
  assert.ok(!ids.includes("probe-q-ask"));
});

test("walk: a stop before the feature directory writes no record but still releases the scope and the marker", () => {
  const { io, ctx, ids } = walk({ "e-isolation": 2, "c-feature-dir": 1 });
  assert.equal(ctx.stop.row, "S15");
  assert.ok(!io.proj.has(`pharn/features/${NAME}/LOOP.md`));
  assert.deepEqual(ids.slice(-2), ["c-release", "c-close"]);
});

test("walk: a driver crash still writes a blocked record and closes the marker (GRILL concern 1)", () => {
  const { io, ctx, ids } = walk({}, { throwAt: "scope" });
  assert.equal(ctx.stop.row, "S9");
  assert.match(ctx.crash, /scripted crash/);
  assert.match(io.proj.get(`pharn/features/${NAME}/LOOP.md`), /The driver itself failed/);
  assert.equal(ids.at(-1), "c-close");
});

test("walk: `again` is bounded — a wait that never finishes stops S9", () => {
  const { io, ctx } = walk({ "entry-wait": 5 });
  assert.equal(io.calls["entry-wait"], MAX_AGAIN + 1);
  assert.deepEqual([ctx.stop.row, ctx.stop.at], ["S9", "entry-wait"]);
});

test("validateArgs refuses before anything runs", () => {
  const env = { cwd: "/", exists: (p) => p === "/p/pharn.config.json", readText: () => "x", nodePath: "node", driverDir: "/d" };
  const ok = { project: "/p", out: "/o", slug: NAME, intent: "/i" };
  assert.equal(validateArgs(ok, env).cap, 3);
  assert.deepEqual(validateArgs({ ...ok, "accept-host-execution": true }, env).hostArgs, ["--accept-host-execution"]);
  assert.throws(() => validateArgs({ ...ok, slug: "Bad Slug" }, env), /kebab/);
  assert.throws(() => validateArgs({ ...ok, cap: "0" }, env), /cap/);
  assert.throws(() => validateArgs({ ...ok, answer: "two words" }, env), /answer/);
  assert.throws(() => validateArgs(ok, { ...env, exists: () => true }), /already exists/);
});

test("revertSpecText edits the frontmatter only", () => {
  const out = revertSpecText(`${SPEC_APPROVED}state: Approved in the body\n`);
  assert.match(out, /^state: Draft$/m);
  assert.match(out, /^spec_content_hash: ""$/m);
  assert.doesNotMatch(out, /^approved_by:/m);
  assert.match(out, /state: Approved in the body/);
});

// ── token-exit ────────────────────────────────────────────────────────────────────────────────────────────────

test("token-exit: exact membership in each table, 9 for anything else, 2 for an unknown table", () => {
  assert.equal(tokenExit("refused-row", "refused S6c\nmarker: written\n"), 14);
  assert.equal(tokenExit("refused-row", "refused S6cx\n"), 9);
  assert.equal(tokenExit("refused-row", "refused\n"), 9);
  assert.equal(tokenExit("spec-kind", "quick\n"), 10);
  assert.equal(tokenExit("spec-kind", "feature\n"), 9);
  assert.equal(tokenExit("rerun-stage", '{"stage_to_rerun":"regress"}', "stage_to_rerun"), 11);
  assert.equal(tokenExit("fresh-reason", '{"reason_code":"ac-evidence-invalid"}', "reason_code"), 11);
  assert.equal(tokenExit("terminal-cause", '{"terminal_cause":"unmeasured"}', "terminal_cause"), 9);
  assert.equal(tokenExit("rerun-stage", "not json", "stage_to_rerun"), 9);
  assert.equal(tokenExit("rerun-stage", '{"stage_to_rerun":null}', "stage_to_rerun"), 9);
  assert.equal(tokenExit("nope", "quick"), 2);
});

test("token-exit CLI: reads a file and exits with the code; a missing file is 9", () => {
  const dir = mkdtempSync(join(tmpdir(), "token-exit-"));
  try {
    writeFileSync(join(dir, "a.txt"), "refused S9\nmarker: written\n");
    const cli = join(HERE, "token-exit.mjs");
    assert.equal(spawnSync(process.execPath, [cli, "refused-row", join(dir, "a.txt")]).status, 17);
    assert.equal(spawnSync(process.execPath, [cli, "refused-row", join(dir, "missing.txt")]).status, 9);
    assert.equal(spawnSync(process.execPath, [cli, "refused-row"]).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── measure ───────────────────────────────────────────────────────────────────────────────────────────────────

test("measure: requests dedupe by message id, the 5m/1h split is kept, deny lines are counted", () => {
  const usage = {
    input_tokens: 10,
    cache_creation: { ephemeral_5m_input_tokens: 100, ephemeral_1h_input_tokens: 20 },
    cache_read_input_tokens: 1000,
    output_tokens: 7,
  };
  const lines = [
    { type: "system", subtype: "init", model: "claude-opus-5-5", permissionMode: "auto", tools: ["Read", "Write"] },
    { type: "assistant", message: { id: "m1", model: "claude-opus-5-5", usage } },
    { type: "assistant", message: { id: "m1", model: "claude-opus-5-5", usage } },
    {
      type: "user",
      message: {
        content: [{ type: "tool_result", is_error: true, content: "PHARN floor — write blocked (writes-scope guard, fix #7)\n…" }],
      },
    },
    {
      type: "assistant",
      message: { id: "m2", model: "claude-opus-5-5", usage: { input_tokens: 1, cache_creation_input_tokens: 4, output_tokens: 1 } },
    },
    { type: "result", total_cost_usd: 0.5, duration_ms: 1000, num_turns: 2, permission_denials: [] },
  ];
  const st = readStream(lines.map((l) => JSON.stringify(l)).join("\n") + "\nnot json\n");
  assert.equal(st.requests.length, 2);
  assert.equal(st.denies, 1);
  const s = summarizeRequests(st.requests);
  assert.deepEqual(s.tokens, { input: 11, cache_write_5m: 104, cache_write_1h: 20, cache_read: 1000, output: 8 });
  assert.equal(s.weighted, Math.round(11 + 1.25 * 104 + 2 * 20 + 0.1 * 1000 + 5 * 8));
  assert.equal(s.requests_without_cache_split, 1);
  assert.equal(s.first_request_context, 1130);
});

test("measure: the ledger's orchestrator share is its rows whose context equals membership.context", () => {
  const t = (n) => ({ input: n, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0, output: 0 });
  const cost = {
    membership: { context: "main" },
    requests: [
      { sidechain: false, agent_id: null, stage: null, tokens: t(30) },
      { sidechain: true, agent_id: "a1", stage: "pharn-spec", tokens: t(70) },
    ],
    executions: { rows: [{ stage: "pharn-spec", iteration: null, elapsed_ms: 60000 }] },
  };
  const f = ledgerFigures(cost);
  assert.equal(f.orchestrator_share, 0.3);
  assert.equal(f.minutes_by_stage["pharn-spec"], 1);
  assert.equal(weighted(t(5)), 5);
});

// ── More interpreter paths (the PR's diff-coverage gate named each uncovered line) ─────────────────────────────

test("★ CLOSURE: no close step emits green, decision, stop or iterate, so a stop is entered once", () => {
  for (const [id, step] of Object.entries(program.steps)) {
    if (!id.startsWith("c")) continue;
    for (const a of [...Object.values(step.on), step.otherwise]) assert.match(a, /^(goto:[a-z0-9-]+|end)$/, `${id}: ${a}`);
  }
});

test("★ CLOSURE: no step id is defined twice (an object literal would silently keep the last one)", () => {
  const src = readFileSync(join(HERE, "driver-core.mjs"), "utf8");
  const body = src.slice(src.indexOf("export function buildProgram()"), src.indexOf("function closeoutStep("));
  const literal = [...body.matchAll(/^ {4}"?([a-z0-9-]+)"?: (?:\{|closeoutStep)/gm)].map((m) => m[1]);
  const routed = [...body.matchAll(/routedStage\("([a-z]+)"/g)].flatMap((m) =>
    ["start", "effort", "session", "finish", "row", "question"].map((x) => `${m[1]}-${x}`)
  );
  const revert = [...body.matchAll(/revertChain\("([a-z0-9]+)"/g)].flatMap((m) =>
    ["approved", "not-approved", "scope", "amend", "edit", "check", "reverted", "failed"].map((x) => `${m[1]}-${x}`)
  );
  const all = [...literal, ...routed, ...revert];
  assert.deepEqual(
    all.filter((k, i) => all.indexOf(k) !== i),
    []
  );
  assert.equal(new Set(all).size, Object.keys(program.steps).length, "the scan sees every step");
});

test("walk: a red test stage reads the preflight — exit 1 is S12 (no-test-runner), anything else S9", () => {
  const { io, ctx } = walk({ "test-gate": 1, "test-preflight": 1 });
  assert.deepEqual([ctx.stop.row, ctx.stop.at], ["S12", "test-preflight"]);
  const pre = io.log.find(([id]) => id === "test-preflight")[2];
  assert.deepEqual(pre.slice(1), [
    "pharn/floor/check-red-run.mjs",
    "--preflight",
    "--ac-tests",
    `pharn/features/${NAME}/AC-TESTS.md`,
    "--discover",
    "package.json",
    "--root",
    ".",
  ]);
  const rec = io.proj.get(`pharn/features/${NAME}/LOOP.md`);
  assert.match(rec, /^blocked: no-test-runner$/m);
  assert.match(rec, /^ac-tests: refused$/m);
  assert.equal(checkRecord(rec).status, 0);
  assert.equal(walk({ "test-gate": 1, "test-preflight": 2 }).ctx.stop.row, "S9");
});

test("walk: a closeout exit 4 runs Step 6d — revert, rewrite the Outcome from the closeout's document, re-check", () => {
  const { io, ctx, ids } = walk({
    "c-closeout": { status: 4, stdout: `${JSON.stringify({ outcome: "not committed: evidence stale" })}\n` },
  });
  for (const s of [
    "c6d-approved",
    "c6d-scope",
    "c6d-amend",
    "c6d-edit",
    "c6d-check",
    "c6d-reverted",
    "c6d-loop-scope",
    "c6d-loop-amend",
    "c6d-rewrite",
  ]) {
    assert.ok(ids.includes(s), s);
  }
  const target = (id) => io.log.find(([k]) => k === id)[2].at(-1);
  assert.equal(target("c6d-scope"), `pharn/features/${NAME}/SPEC.md`);
  assert.equal(target("c6d-loop-scope"), `pharn/features/${NAME}/LOOP.md`);
  assert.equal(ctx.spec, "reverted to Draft");
  const rec = io.proj.get(`pharn/features/${NAME}/LOOP.md`);
  assert.match(rec, /^commit: not committed: evidence stale$/m);
  assert.equal(checkRecord(rec).status, 0);
  assert.deepEqual(ids.slice(-2), ["c-release", "c-close"]);
});

test("walk: a failing fn step is exit 70 (the candidate write → S1)", () => {
  const { io, ctx } = walk({}, { writeThrows: ["pharn/.run/feature-name/candidate.txt"] });
  assert.deepEqual([ctx.stop.row, ctx.stop.at, ctx.stop.exit], ["S1", "e-candidate", 70]);
  assert.ok(io.log.some(([id, exit]) => id === "e-candidate" && exit === 70));
});

test("walk: a redirect that cannot be written is exit 70 at that step (the pre-run status → S9)", () => {
  const { io, ctx } = walk({}, { writeThrows: [`pharn/.run/pharn-loop/${NAME}/pre-run-status.txt`] });
  assert.deepEqual([ctx.stop.row, ctx.stop.at, ctx.stop.exit], ["S9", "e-status", 70]);
  assert.ok(io.log.some(([k, m]) => k === "note" && /redirect failed at e-status/.test(m)));
});

test("walk: a capture that throws is noted and changes no branch (an unparseable model resolve)", () => {
  const { io, ctx } = walk({ "d-loop-model": { status: 0, stdout: "not json\n" } });
  assert.ok(io.log.some(([k, m]) => k === "note" && /capture failed at d-loop-model/.test(m)));
  assert.equal(ctx.stop.kind, "green");
  assert.equal(ctx.loopModel.alias, "sonnet", "the default stands");
});

test("walk: a stop before the isolation witness exists records an empty isolation line, not a crash", () => {
  const { ctx } = walk({ "e-name": 1, "c-feature-dir": 1 });
  assert.equal(ctx.stop.row, "S1");
  assert.equal(ctx.isolationLine, "");
  assert.equal(ctx.crash, null);
});

test("walk: a spent step budget stops S9, and the close steps still run to the marker's release", () => {
  const { ctx, ids } = walk({ fresh: 1, "fresh-rerun": 10 });
  assert.equal(ctx.stop.row, "S9");
  assert.equal(ctx.crash, "step budget spent");
  assert.deepEqual(ids.slice(-2), ["c-release", "c-close"]);
  // a close that never ends (the closeout refusing over and over) is cut by the close allowance
  const loop = walk({ "c-closeout": 2, "c-closeout-retry": 2 });
  assert.equal(loop.ctx.stop.kind, "green");
  assert.equal(loop.ids.at(-1), "c-closeout-retry");
});

test("walk: a driver error while closing goes to the release; one at the release or the close ends the walk", () => {
  const a = walk({}, { throwAt: ["c-head"] });
  assert.equal(a.ctx.stop.kind, "green");
  assert.match(a.ctx.crash, /scripted crash/);
  assert.equal(a.ids.at(-1), "c-close");
  const b = walk({}, { throwAt: ["c-close"] });
  assert.match(b.ctx.crash, /scripted crash/);
  assert.equal(b.ids.at(-1), "c-release");
});

// ── measure, end to end on fixture directories, in process ────────────────────────────────────────────────────

test("measure: driver figures from sessions + transcripts, loop figures from its stream, and the CLI document", () => {
  const root = mkdtempSync(join(tmpdir(), "measure-"));
  try {
    const out = join(root, "driver-out");
    const loop = join(root, "loop-out");
    const tx = join(root, "transcripts");
    mkdirSync(join(out, "sessions"), { recursive: true });
    mkdirSync(loop);
    mkdirSync(tx);
    const usage = (o) => ({
      input_tokens: 1,
      cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 10 },
      cache_read_input_tokens: 100,
      output_tokens: o,
    });
    const stream = (sid, lines) => lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
    const sessions = [
      {
        stage: "spec",
        step: "spec-session",
        session_id: "s-spec",
        model: "fable",
        agent: true,
        effort: "high",
        resume: false,
        ms: 60000,
        status: 0,
      },
      {
        stage: "probe-deny",
        step: "probe-deny",
        session_id: "s-probe",
        model: "sonnet",
        agent: true,
        effort: "high",
        resume: false,
        ms: 6000,
        status: 0,
      },
    ];
    for (const s of sessions) {
      s.stream = join(out, "sessions", `${s.stage}.jsonl`);
      writeFileSync(
        s.stream,
        stream(s.session_id, [
          { type: "system", subtype: "init", model: "claude-x", permissionMode: "auto", tools: ["Read"] },
          { type: "assistant", message: { id: `m-${s.stage}`, model: "claude-x", usage: usage(1) } },
          {
            type: "user",
            message: {
              content: [{ type: "tool_result", content: [{ type: "text", text: "PHARN floor — write blocked" }, { type: "image" }] }],
            },
          },
          { type: "user", message: { content: [{ type: "tool_result", content: 42 }] } },
          { type: "result", total_cost_usd: 0.25, duration_ms: 1000, num_turns: 1, permission_denials: [{}], session_id: s.session_id },
        ])
      );
      writeFileSync(
        join(tx, `${s.session_id}.jsonl`),
        JSON.stringify({
          type: "assistant",
          requestId: `req_${s.stage.replace("-", "_")}`,
          sessionId: s.session_id,
          timestamp: "2026-11-17T01:00:00.000Z",
          message: { id: `m-${s.stage}`, model: "claude-x", usage: usage(500) },
        }) + "\n"
      );
    }
    writeFileSync(join(out, "sessions.json"), JSON.stringify(sessions));
    writeFileSync(
      join(out, "steps.jsonl"),
      [
        "spec-start",
        "plan-finish",
        "grill-session",
        "entry-wait",
        "test-gate",
        "probe-deny",
        "build-start",
        "verify",
        "stop-read",
        "e-name",
        "c-close",
        "zzz",
      ]
        .map((id, i) => JSON.stringify({ seq: i, id, ms: 60000 }))
        .join("\n") + "\n"
    );
    writeFileSync(
      join(out, "summary.json"),
      JSON.stringify({ wall_ms: 120000, stop: { kind: "green" }, decision: "STOP_GREEN_QUICK", closeout: null })
    );
    writeFileSync(
      join(loop, "loop.jsonl"),
      stream("l", [
        { type: "assistant", message: { id: "o1", model: "claude-sonnet", usage: usage(3) } },
        { type: "assistant", parent_tool_use_id: "t1", message: { id: "a1", model: "claude-fable", usage: usage(4) } },
        { type: "result", total_cost_usd: 1.5, duration_ms: 2000, modelUsage: {} },
      ])
    );
    writeFileSync(join(loop, "notes.txt"), "not a stream\n");

    const d = driverFigures(out, tx);
    assert.equal(d.sessions.length, 2);
    assert.equal(d.sessions[0].tokens.output, 500, "tokens come from the transcript");
    assert.equal(d.sessions[0].token_source, "transcript (sessionRequests)");
    assert.equal(d.sessions[0].deny_marker_lines, 1);
    assert.equal(d.sessions[0].permission_denials, 1);
    assert.equal(d.stages.probes.sessions, 1);
    assert.equal(d.total_excluding_probes.tokens.output, 500, "probes are left out of the total");
    assert.equal(d.minutes_by_stage.other, 1);
    assert.equal(d.wall_minutes, 2);
    assert.equal(driverFigures(out).sessions[0].tokens.output, 1, "without transcripts the stream's own usage is read");
    rmSync(join(out, "summary.json"));
    assert.equal(driverFigures(out, tx).wall_minutes, null);

    const l = loopStream(loop);
    assert.equal(l.length, 1);
    assert.equal(l[0].main_thread.requests, 1);
    assert.equal(l[0].subagents_in_stream.requests, 1);
    assert.equal(l[0].cli_total_cost_usd, 1.5);

    const cost = join(root, "cost.json");
    writeFileSync(
      cost,
      JSON.stringify({
        membership: { context: "main" },
        requests: [],
        window_start: "2026-11-17T01:00:00Z",
        window_end: "2026-11-17T01:30:00Z",
      })
    );
    const doc = measure(["--driver", out, "--transcripts", tx, "--driver-cost", cost, "--loop", loop, "--loop-cost", cost]);
    assert.equal(doc.schema, "loop-driver-spike-measure/1");
    assert.equal(doc.driver_ledger.window_minutes, 30);
    assert.equal(doc.loop.ledger.orchestrator_share, null);
    assert.equal(doc.loop.stream.length, 1);
    assert.deepEqual(Object.keys(measure(["--loop-cost", cost])), ["schema", "weights", "loop"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  assert.deepEqual(["spec-x", "peek-2", "fresh-rerun", "c6d-edit", "nope"].map(stageOfStep), ["spec", "plan", "verify", "close", "other"]);
});
