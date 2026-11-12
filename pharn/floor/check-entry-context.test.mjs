// pharn/floor/check-entry-context.test.mjs — the entry-context guard's CLI over fixture transcripts (entry-context-guard).
// ★ = behaviour. Each fixture is a scratch projects dir holding one session's transcript (main thread and, where named,
// one agent), a markers file holding the run's run-start marker, and a project root with or without pharn.config.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, run } from "./check-entry-context.mjs";
import { DEFAULT_ENTRY_CONTEXT_TOKENS, EXIT, REASONS } from "./entry-context-core.mjs";
import { markerLine } from "./mark-phase.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "check-entry-context.mjs");
const SID = "11111111-2222-4333-8444-555555555555";
const FEATURE = "feat";
const TS = "2026-11-12T10:00:00.000Z";
const MARKER = { seq: 1, kind: "run-start", stage: null, iteration: null, ts: TS, session_id: SID };
const LINE = markerLine(MARKER);

let reqN = 0;
/** One request: an assistant record whose usage carries `size` tokens split over the three counted classes. */
function request(size, { agent = null, usage = null } = {}) {
  reqN += 1;
  const u = usage ?? { input_tokens: 2, cache_creation_input_tokens: 1000, cache_read_input_tokens: size - 1002, output_tokens: 40 };
  return {
    type: "assistant",
    isSidechain: agent !== null,
    ...(agent ? { agentId: agent } : {}),
    timestamp: "2026-11-12T10:00:05.000Z",
    requestId: `req_${reqN}`,
    message: { id: `msg_${reqN}`, model: "claude-test", role: "assistant", content: [{ type: "text", text: "x" }], usage: u },
  };
}
/** A tool result carrying `text`, in the main thread or an agent. */
function toolResult(text, { agent = null } = {}) {
  return {
    type: "user",
    isSidechain: agent !== null,
    ...(agent ? { agentId: agent } : {}),
    timestamp: "2026-11-12T10:00:01.000Z",
    message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_x", content: `${text}\n` }] },
  };
}
const jsonl = (records) => records.map((r) => JSON.stringify(r)).join("\n") + "\n";

/**
 * A scratch tree: `{ root, projectsDir, markersBase, args, cleanup }`. `main` / `agents` are record lists (an agent is
 * keyed by its id); `transcript: false` writes no session file; `config` is pharn.config.json's text (absent when null);
 * `markers: false` writes no markers file.
 */
function fixture({ main = [], agents = {}, transcript = true, config = null, markers = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "entry-context-"));
  const projectsDir = join(root, "projects");
  const proj = join(projectsDir, "-scratch-project");
  mkdirSync(proj, { recursive: true });
  if (transcript) {
    writeFileSync(join(proj, `${SID}.jsonl`), jsonl(main));
    for (const [id, recs] of Object.entries(agents)) {
      mkdirSync(join(proj, SID, "subagents"), { recursive: true });
      writeFileSync(join(proj, SID, "subagents", `agent-${id}.jsonl`), jsonl(recs));
    }
  }
  const markersBase = join(root, "markers");
  if (markers) {
    mkdirSync(join(markersBase, FEATURE), { recursive: true });
    writeFileSync(join(markersBase, FEATURE, "markers.jsonl"), JSON.stringify(MARKER) + "\n");
  }
  const project = join(root, "project");
  mkdirSync(project);
  if (config !== null) writeFileSync(join(project, "pharn.config.json"), config);
  const args = ["--feature", FEATURE, "--session", SID, "--projects-dir", projectsDir, "--markers-base", markersBase, "--root", project];
  return { root, projectsDir, markersBase, project, args, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
function withFixture(spec, fn) {
  const fx = fixture(spec);
  try {
    return fn(fx);
  } finally {
    fx.cleanup();
  }
}
const runFx = (fx, extra = []) => run([...fx.args, ...extra], {});

// ── criterion 1: a main-thread context over the threshold stops; under it goes on ─────────────────────────────

test("★ criterion 1 — a main-thread context over the threshold exits 3 with an `over` line", () => {
  withFixture({ main: [request(150000), toolResult(LINE), request(400000)] }, (fx) => {
    const r = runFx(fx);
    assert.equal(r.exit, EXIT.over);
    assert.equal(r.exit, 3);
    assert.match(r.stdout, /^entry-context: over 400000 > 320000 tokens \(context main, threshold default\) — /);
    assert.equal(r.stdout.split("\n").length, 2, "exactly one line");
  });
});

test("★ criterion 1 — under the threshold exits 0 `within`, and exactly the threshold is within (strict >)", () => {
  for (const [size, verdict, exit] of [
    [300000, "within", 0],
    [DEFAULT_ENTRY_CONTEXT_TOKENS, "within", 0],
    [DEFAULT_ENTRY_CONTEXT_TOKENS + 1, "over", 3],
  ]) {
    withFixture({ main: [toolResult(LINE), request(size)] }, (fx) => {
      const r = runFx(fx);
      assert.equal(r.exit, exit, `size ${size}`);
      assert.match(r.stdout, new RegExp(`^entry-context: ${verdict} ${size} `));
    });
  }
});

test("★ the LAST request of the bound context is measured, not the largest (a compacted context reads small)", () => {
  withFixture({ main: [toolResult(LINE), request(900000), request(200000)] }, (fx) => {
    const r = runFx(fx);
    assert.equal(r.exit, 0);
    assert.match(r.stdout, /within 200000 /);
  });
});

// ── criterion 2: the bound context decides, never the session's main thread ───────────────────────────────

test("★ criterion 2 — an agent under the threshold inside a parent session over it exits 0 (context agent)", () => {
  const spec = {
    main: [request(880000), request(900000)],
    agents: { a1: [toolResult(LINE, { agent: "a1" }), request(200000, { agent: "a1" })] },
  };
  withFixture(spec, (fx) => {
    const r = runFx(fx);
    assert.equal(r.exit, 0);
    assert.match(r.stdout, /^entry-context: within 200000 <= 320000 tokens \(context agent, threshold default\)$/m);
  });
});

test("★ criterion 2 control — the same session with the run-start line in MAIN's tool result exits 3 (non-vacuity)", () => {
  // The fixture above is not passing by accident: the main thread's latest request IS over the threshold, and a run
  // bound to main is stopped. A naive read of the session file would have measured this 900,000 for the agent's run.
  const spec = {
    main: [request(880000), toolResult(LINE), request(900000)],
    agents: { a1: [request(200000, { agent: "a1" })] },
  };
  withFixture(spec, (fx) => {
    const r = runFx(fx);
    assert.equal(r.exit, 3);
    assert.match(r.stdout, /over 900000 > 320000 tokens \(context main/);
  });
});

// ── criterion 3: no holder, two holders, no transcript → exit 0 with a closed unknown reason ─────────────────

const UNKNOWN_CASES = [
  ["no-holder", { main: [request(900000)] }, []],
  [
    "several-holders",
    { main: [toolResult(LINE), request(900000)], agents: { a1: [toolResult(LINE, { agent: "a1" }), request(900000, { agent: "a1" })] } },
    [],
  ],
  ["no-transcript", { transcript: false }, []],
  ["window-unknown", { main: [toolResult(LINE), request(900000)], markers: false }, []],
  ["no-request", { main: [toolResult(LINE)], agents: { a1: [request(900000, { agent: "a1" })] } }, []],
  [
    "usage-unreadable",
    {
      main: [
        toolResult(LINE),
        request(0, { usage: { input_tokens: 2, cache_creation_input_tokens: "1000", cache_read_input_tokens: 900000 } }),
      ],
    },
    [],
  ],
  ["threshold-malformed", { main: [toolResult(LINE), request(900000)], config: '{"budget":{"entryContextTokens":"big"}}' }, []],
];

for (const [reason, spec] of UNKNOWN_CASES) {
  test(`★ criterion 3 — ${reason}: exit 0, \`unknown ${reason}\`, going on`, () => {
    withFixture(spec, (fx) => {
      const r = runFx(fx);
      assert.equal(r.exit, 0);
      assert.ok(r.stdout.startsWith(`entry-context: unknown ${reason} — ${REASONS[reason]}`), r.stdout);
      assert.ok(r.stdout.endsWith("; going on\n"), r.stdout);
      assert.equal(r.stdout.split("\n").length, 2, "exactly one line");
    });
  });
}

test("★ criterion 3 — no-session (no --session and no CLAUDE_CODE_SESSION_ID) and several-transcripts", () => {
  withFixture({ main: [toolResult(LINE), request(900000)] }, (fx) => {
    const args = fx.args.filter((_, i, a) => a[i] !== "--session" && a[i - 1] !== "--session");
    const r = run(args, {});
    assert.equal(r.exit, 0);
    assert.match(r.stdout, /^entry-context: unknown no-session — /);
    // a second project directory holding the same session id
    const other = join(fx.projectsDir, "-another-project");
    mkdirSync(other);
    writeFileSync(join(other, `${SID}.jsonl`), jsonl([request(10)]));
    const r2 = runFx(fx);
    assert.equal(r2.exit, 0);
    assert.match(r2.stdout, /^entry-context: unknown several-transcripts — /);
  });
});

test("✧ closure (L29/L36) — every REASONS member but `crashed` is reached by a fixture above; `crashed` by a forced throw", () => {
  const reached = new Set([...UNKNOWN_CASES.map(([r]) => r), "no-session", "several-transcripts", "crashed"]);
  assert.deepEqual([...reached].sort(), Object.keys(REASONS).sort());
  // `crashed`: no fixture input makes the rule throw, so force a throw by handing run() an env whose getter throws.
  const env = new Proxy(
    {},
    {
      get() {
        throw new Error("boom");
      },
    }
  );
  const fx = fixture({ main: [toolResult(LINE), request(900000)] });
  try {
    const args = fx.args.filter((_, i, a) => a[i] !== "--session" && a[i - 1] !== "--session");
    const r = run(args, env);
    assert.equal(r.exit, 0);
    assert.equal(r.stdout, `entry-context: unknown crashed — ${REASONS.crashed}; going on\n`);
  } finally {
    fx.cleanup();
  }
});

// ── the threshold from pharn.config.json ──────────────────────────────────────────────────────────────────────

test("★ a configured threshold applies: 400,000 is within when budget.entryContextTokens is 500000", () => {
  withFixture({ main: [toolResult(LINE), request(400000)], config: '{"budget":{"entryContextTokens":500000}}' }, (fx) => {
    const r = runFx(fx);
    assert.equal(r.exit, 0);
    assert.match(r.stdout, /within 400000 <= 500000 tokens \(context main, threshold config\)/);
  });
});

test("★ a malformed key is VISIBLE: the unknown line names the key and quotes the value (GATE 1 Q3)", () => {
  withFixture({ main: [toolResult(LINE), request(900000)], config: '{"budget":{"entryContextTokens":0}}' }, (fx) => {
    const r = runFx(fx);
    assert.equal(r.exit, 0);
    assert.match(
      r.stdout,
      /^entry-context: unknown threshold-malformed — .*budget\.entryContextTokens` must be an integer from 1 to 1000000 \(got "0"\); going on$/m
    );
  });
});

test("★ an unreadable pharn.config.json (a directory) is threshold-malformed, never read as absent", () => {
  withFixture({ main: [toolResult(LINE), request(900000)] }, (fx) => {
    mkdirSync(join(fx.project, "pharn.config.json"));
    const r = runFx(fx);
    assert.equal(r.exit, 0);
    assert.match(r.stdout, /unknown threshold-malformed — .*: pharn\.config\.json exists but cannot be read; going on$/m);
  });
});

test("★ a pharn.config.json that is not JSON says so", () => {
  withFixture({ main: [toolResult(LINE), request(900000)], config: "{ not json" }, (fx) => {
    const r = runFx(fx);
    assert.equal(r.exit, 0);
    assert.match(r.stdout, /unknown threshold-malformed — .*: pharn\.config\.json is not valid JSON; going on$/m);
  });
});

// ── criterion 5: the check writes nothing ─────────────────────────────────────────────────────────────────────

function listTree(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      out.push(relative(dir, p));
      if (e.isDirectory()) walk(p);
    }
  };
  walk(dir);
  return out.sort();
}

test("★ criterion 5 — a stop (exit 3) writes no file and no directory: no pharn/features/<name>/, nothing at all", () => {
  withFixture({ main: [toolResult(LINE), request(900000)] }, (fx) => {
    const before = listTree(fx.root);
    const r = spawnSync(process.execPath, [CLI, ...fx.args], { cwd: fx.project, env: { PATH: process.env.PATH }, encoding: "utf8" });
    assert.equal(r.status, 3, r.stderr);
    assert.deepEqual(listTree(fx.root), before);
  });
});

// ── the CLI process, and the production defaults (L41) ───────────────────────────────────────────────────────

test("★ L41 — no --session, no --projects-dir, no config: the env's session and $CLAUDE_CONFIG_DIR/projects, the default threshold", () => {
  withFixture({ main: [toolResult(LINE), request(400000)] }, (fx) => {
    const configDir = join(fx.root, "claude-config");
    mkdirSync(configDir);
    // move the projects dir under the config dir, where the default looks
    renameSync(fx.projectsDir, join(configDir, "projects"));
    const args = ["--feature", FEATURE, "--markers-base", fx.markersBase, "--root", fx.project];
    const r = spawnSync(process.execPath, [CLI, ...args], {
      cwd: fx.project,
      env: { PATH: process.env.PATH, CLAUDE_CODE_SESSION_ID: SID, CLAUDE_CONFIG_DIR: configDir },
      encoding: "utf8",
    });
    assert.equal(r.status, 3, r.stderr);
    assert.match(r.stdout, /over 400000 > 320000 tokens \(context main, threshold default\)/);
    assert.equal(r.stderr, "");
  });
});

test("★ L41 — the default markers base and project root: run from a project with pharn/.run/cost/<name>/markers.jsonl", () => {
  withFixture({ main: [toolResult(LINE), request(400000)] }, (fx) => {
    mkdirSync(join(fx.project, "pharn", ".run", "cost", FEATURE), { recursive: true });
    writeFileSync(join(fx.project, "pharn", ".run", "cost", FEATURE, "markers.jsonl"), JSON.stringify(MARKER) + "\n");
    writeFileSync(join(fx.project, "pharn.config.json"), '{"budget":{"entryContextTokens":450000}}');
    const r = spawnSync(process.execPath, [CLI, "--feature", FEATURE, "--session", SID, "--projects-dir", fx.projectsDir], {
      cwd: fx.project,
      env: { PATH: process.env.PATH },
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /within 400000 <= 450000 tokens \(context main, threshold config\)/);
  });
});

test("★ usage: exit 2 with a stderr message and an empty stdout, for each malformed argv", () => {
  for (const argv of [
    [],
    ["--feature"],
    ["--feature", "Bad Name"],
    ["--feature", "ok", "--bogus", "x"],
    ["--feature", "a", "--feature", "b"],
  ]) {
    const r = run(argv, {});
    assert.equal(r.exit, EXIT.usage, JSON.stringify(argv));
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /^check-entry-context: .*\nusage: /);
  }
  const p = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
  assert.equal(p.status, 2);
  assert.equal(p.stdout, "");
});

test("parseArgs keeps each flag's value and refuses an inherited key name (L15)", () => {
  assert.deepEqual(parseArgs(["--feature", "f", "--root", "r"]).opts, { feature: "f", root: "r" });
  assert.match(parseArgs(["--feature", "f", "toString", "x"]).error, /unknown argument/);
  assert.match(parseArgs(["--feature", "f", "__proto__", "x"]).error, /unknown argument/);
});
