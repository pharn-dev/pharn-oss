// pharn/floor/stage-agent.test.mjs — the stage-agent CLI end to end (stage-model routing, 6.27.0).
//
// Every test runs the REAL CLI as a subprocess in a scratch directory (its cwd is the "repo root" the
// result file and the default config resolve against). The `resolve-failed` cases run a BYTE-IDENTICAL copy
// of stage-agent.mjs (plus its import closure) beside a STUB checker, because the CLI shells the checker
// from its own directory and nothing else — no environment variable or flag can redirect it.
// Each assertion names the mutant that turns it red (L60).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKER_TIMEOUT_MS, DEFAULT_CONFIG, RESULT_MAX_BYTES } from "./stage-agent.mjs";
import { AGENT_MODELS } from "./route-token-core.mjs";
import {
  ROUTE_POLICY,
  STAGES,
  ITERATED_STAGES,
  AGENT,
  RESULT_FILE,
  RESULT_KEYS,
  NO_RESULT_TEXT,
  renderBrief,
  buildResult,
} from "./stage-agent-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CLI = join(HERE, "stage-agent.mjs");
const REPO_CONFIG = join(REPO, "pharn.config.json");
/** The CLI's import closure — copied beside a stub checker for the resolve-failed cases. */
const CLOSURE = ["stage-agent.mjs", "stage-agent-core.mjs", "route-token-core.mjs", "gate-run-core.mjs"];

function scratch(prefix = "stage-agent-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

function run(cwd, args, cli = CLI) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", ms: Date.now() - t0 };
}

const routeArgs = (stage, extra = []) => {
  const it = ITERATED_STAGES.includes(stage) ? ["--iteration", "1"] : [];
  return ["route", "--command", "pharn-ship", "--stage", stage, "--name", "demo", ...it, ...extra];
};

function writeConfig(dir, obj) {
  writeFileSync(join(dir, "pharn.config.json"), typeof obj === "string" ? obj : JSON.stringify(obj));
}
const stagesConfig = (stages) => ({ models: { stages: { default: { model: "sonnet", effort: "high" }, ...stages } } });

// ── route ─────────────────────────────────────────────────────────────────────────────────────────────

test("route over THIS repo's config: each routed ship stage gets the alias the checker resolves, on ONE stdout line", () => {
  const dir = scratch();
  try {
    copyFileSync(REPO_CONFIG, join(dir, "pharn.config.json"));
    const cfg = JSON.parse(readFileSync(REPO_CONFIG, "utf8")).models.stages;
    const keyOf = { "pharn-plan": "plan", "pharn-grill": "grill", "pharn-test": "ac-test", "pharn-build": "build" };
    for (const [stage, key] of Object.entries(keyOf)) {
      const r = run(dir, routeArgs(stage));
      assert.equal(r.status, 0, `${stage}: ${r.stderr}`);
      assert.equal(r.stdout, `agent:${cfg[key].model}\n`, `${stage}: exactly one line, the token`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("L41 — with NO --config, route reads DEFAULT_CONFIG in the invoking directory (and --config overrides it)", () => {
  const dir = scratch();
  try {
    assert.equal(DEFAULT_CONFIG, "pharn.config.json");
    writeConfig(dir, stagesConfig({ plan: { model: "haiku", effort: "low" } }));
    const plain = run(dir, routeArgs("pharn-plan"));
    assert.deepEqual([plain.status, plain.stdout], [0, "agent:haiku\n"], "the default path was read");
    mkdirSync(join(dir, "elsewhere"));
    writeConfig(join(dir, "elsewhere"), stagesConfig({ plan: { model: "fable", effort: "low" } }));
    const flagged = run(dir, routeArgs("pharn-plan", ["--config", "elsewhere/pharn.config.json"]));
    assert.deepEqual([flagged.status, flagged.stdout], [0, "agent:fable\n"], "--config is honoured");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("route — every fallback the config decides, each at exit 3 with its remedy on stderr", () => {
  const dir = scratch();
  try {
    const cases = [
      ["absent", null, "inline:no-config", /@pharn-dev\/pharn >= 0\.7\.0/],
      ["no stages", { ship: { requireAttestation: false } }, "inline:no-stages", /add a models\.stages block/],
      ["empty object", {}, "inline:no-stages", /add a models\.stages block/],
      [
        "a pre-0.7.0-shaped block (bare model names, `default` outside stages)",
        { models: { default: { model: "sonnet-5", effort: "high" }, stages: { plan: { model: "opus-4-8", effort: "high" } } } },
        "inline:config-red",
        /pharn update/,
      ],
      ["not JSON", "{ nope", "inline:config-red", /pharn update/],
      ["inherit", stagesConfig({ plan: { model: "inherit", effort: "high" } }), "inline:inherit", /an alias/],
      [
        "a claude-* id",
        stagesConfig({ plan: { model: "claude-opus-5-5", effort: "high" } }),
        "inline:model-id",
        /never mapped to an alias/,
      ],
    ];
    for (const [label, cfg, token, remedy] of cases) {
      rmSync(join(dir, "pharn.config.json"), { force: true });
      if (cfg !== null) writeConfig(dir, cfg);
      const r = run(dir, routeArgs("pharn-plan"));
      assert.equal(r.status, 3, `${label}: ${r.stderr}`);
      assert.equal(r.stdout, `${token}\n`, label);
      assert.match(r.stderr, remedy, `${label}: the remedy for THIS reason (L27)`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("route — every Agent alias routes to itself (mutant: an alias dropped from AGENT_MODELS)", () => {
  const dir = scratch();
  try {
    for (const alias of AGENT_MODELS) {
      writeConfig(dir, stagesConfig({ plan: { model: alias, effort: "high" } }));
      const r = run(dir, routeArgs("pharn-plan"));
      assert.deepEqual([r.status, r.stdout], [0, `agent:${alias}\n`], alias);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("route — a DANGLING config link reads no-config, exactly as the checker reads it (L59)", () => {
  const dir = scratch();
  try {
    symlinkSync(join(dir, "missing.json"), join(dir, "pharn.config.json"));
    const r = run(dir, routeArgs("pharn-plan"));
    assert.deepEqual([r.status, r.stdout], [3, "inline:no-config\n"]);
    const checker = spawnSync(process.execPath, [join(HERE, "check-model-config.mjs"), "validate"], { cwd: dir, encoding: "utf8" });
    assert.equal(checker.status, 0, "CONTROL: the checker, too, reads a dangling config as absent (GREEN by design)");
    // A looping link is NOT absent: the checker cannot read it, so it is config-red.
    rmSync(join(dir, "pharn.config.json"));
    symlinkSync("pharn.config.json", join(dir, "pharn.config.json"));
    const loop = run(dir, routeArgs("pharn-plan"));
    assert.deepEqual([loop.status, loop.stdout], [3, "inline:config-red\n"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("route — POLICY PRECEDENCE at the CLI: a policy-inline cell ignores even a RED config", () => {
  const dir = scratch();
  try {
    writeConfig(dir, "{ nope");
    const spec = run(dir, ["route", "--command", "pharn-ship", "--stage", "pharn-spec", "--name", "demo"]);
    assert.deepEqual([spec.status, spec.stdout], [3, "inline:interactive\n"]);
    const verify = run(dir, ["route", "--command", "pharn-loop", "--stage", "pharn-verify", "--name", "demo", "--iteration", "2"]);
    assert.deepEqual([verify.status, verify.stdout], [3, "inline:floor-only\n"]);
    const quickGrill = run(dir, ["route", "--command", "pharn-ship", "--stage", "pharn-grill", "--name", "demo", "--mode", "quick"]);
    assert.deepEqual([quickGrill.status, quickGrill.stdout], [3, "inline:floor-only\n"]);
    const plan = run(dir, routeArgs("pharn-plan"));
    assert.deepEqual(
      [plan.status, plan.stdout],
      [3, "inline:config-red\n"],
      "CONTROL: the same config sends a ROUTED cell inline as config-red"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("route — refusals (exit 2, empty stdout): an inherited stage name, a loop quick column, a skipped stage", () => {
  const dir = scratch();
  try {
    copyFileSync(REPO_CONFIG, join(dir, "pharn.config.json"));
    const cases = [
      ["route", "--command", "pharn-ship", "--stage", "toString", "--name", "demo"],
      ["route", "--command", "pharn-ship", "--stage", "__proto__", "--name", "demo"],
      ["route", "--command", "pharn-loop", "--stage", "pharn-plan", "--name", "demo", "--mode", "quick"],
      ["route", "--command", "pharn-ship", "--stage", "pharn-plan", "--name", "demo", "--mode", "full"],
      ["route", "--command", "pharn-ship", "--stage", "pharn-regress", "--name", "demo", "--iteration", "1", "--mode", "quick"],
      ["route", "--command", "pharn-dev-ship", "--stage", "pharn-plan", "--name", "demo"],
      ["route", "--command", "pharn-ship", "--stage", "pharn-plan", "--name", "Bad_Name"],
      ["route", "--command", "pharn-ship", "--stage", "pharn-plan", "--name", "demo\n"],
      ["route", "--command", "pharn-ship", "--stage", "pharn-build", "--name", "demo"],
      ["route", "--command", "pharn-ship", "--stage", "pharn-plan", "--name", "demo", "--iteration", "1"],
      ["route", "--command", "pharn-ship", "--stage", "pharn-build", "--name", "demo", "--iteration", "01"],
    ];
    for (const args of cases) {
      const r = run(dir, args);
      assert.equal(r.status, 2, `${JSON.stringify(args)}: ${r.stdout}${r.stderr}`);
      assert.equal(r.stdout, "", "a refusal prints no token");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("route — an agent route removes a leftover result; an inline route leaves it for no one (read never runs)", () => {
  const dir = scratch();
  try {
    copyFileSync(REPO_CONFIG, join(dir, "pharn.config.json"));
    const resultPath = join(dir, ".pharn", "pharn-ship", "demo", RESULT_FILE);
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(
      resultPath,
      `${JSON.stringify(buildResult({ command: "pharn-ship", name: "demo", stage: "pharn-plan", status: "done" }))}\n`
    );
    const r = run(dir, routeArgs("pharn-plan"));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(existsSync(resultPath), false, "a stale result can never answer for the new agent");
    // A leftover that is not a regular file cannot be cleared safely: route refuses, so the stage runs inline.
    mkdirSync(resultPath);
    const blocked = run(dir, routeArgs("pharn-plan"));
    assert.deepEqual([blocked.status, blocked.stdout], [2, ""]);
    assert.match(blocked.stderr, /not a regular file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── brief ─────────────────────────────────────────────────────────────────────────────────────────────

test("brief — exit 0 for EVERY routed cell with renderBrief's exact text; exit 2 for every other cell", () => {
  const dir = scratch();
  try {
    let routed = 0;
    for (const command of Object.keys(ROUTE_POLICY)) {
      for (const mode of Object.keys(ROUTE_POLICY[command])) {
        for (const stage of STAGES) {
          const iteration = ITERATED_STAGES.includes(stage) ? 1 : null;
          const args = ["brief", "--command", command, "--stage", stage, "--name", "demo"];
          if (iteration !== null) args.push("--iteration", String(iteration));
          if (mode !== "full") args.push("--mode", mode);
          const r = run(dir, args);
          if (ROUTE_POLICY[command][mode][stage] === AGENT) {
            routed++;
            assert.equal(r.status, 0, `${command}/${mode}/${stage}: ${r.stderr}`);
            assert.equal(r.stdout, renderBrief({ command, mode, stage, name: "demo", iteration }).text);
          } else {
            assert.equal(r.status, 2, `${command}/${mode}/${stage} is not routed and has no brief`);
            assert.equal(r.stdout, "");
          }
        }
      }
    }
    assert.equal(routed, 12, "L34");
    assert.deepEqual(readdirSync(dir), [], "brief writes nothing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── report → read ─────────────────────────────────────────────────────────────────────────────────────

test("report → read round trip, per status; read CONSUMES, and a second read is no-result with its wording", () => {
  const dir = scratch();
  try {
    const cases = [
      [["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan"], ["--status", "done"], "done", 0],
      [["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan"], ["--status", "refused"], "refused", 3],
      [["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-grill"], ["--status", "question"], "question", 4],
      [
        ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-build", "--iteration", "1"],
        ["--status", "done", "--gate", "pass"],
        "done gate:pass",
        0,
      ],
      [
        ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-build", "--iteration", "2"],
        ["--status", "done", "--gate", "fail"],
        "done gate:fail",
        0,
      ],
      [["--command", "pharn-loop", "--name", "demo", "--stage", "pharn-spec"], ["--status", "refused", "--row", "S6b"], "refused S6b", 3],
      [
        ["--command", "pharn-loop", "--name", "demo", "--stage", "pharn-build", "--iteration", "3"],
        ["--status", "refused", "--row", "S7"],
        "refused S7",
        3,
      ],
      [["--command", "pharn-loop", "--name", "demo", "--stage", "pharn-test"], ["--status", "refused"], "refused", 3],
    ];
    for (const [who, what, line, exit] of cases) {
      const rep = run(dir, ["report", ...who, ...what]);
      assert.equal(rep.status, 0, `${JSON.stringify(what)}: ${rep.stderr}`);
      const saved = JSON.parse(readFileSync(join(dir, ".pharn", who[1], "demo", RESULT_FILE), "utf8"));
      assert.deepEqual(Object.keys(saved), [...RESULT_KEYS], "the written object carries exactly the closed key set, in order");
      const rd = run(dir, ["read", ...who]);
      assert.deepEqual([rd.status, rd.stdout], [exit, `${line}\n`], JSON.stringify(what));
      const again = run(dir, ["read", ...who]);
      assert.deepEqual([again.status, again.stdout], [2, `unusable no-result — ${NO_RESULT_TEXT}\n`], "consumed");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report refuses a result that would not read back — nothing is written", () => {
  const dir = scratch();
  try {
    const bad = [
      ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan", "--status", "done", "--row", "S9"],
      ["--command", "pharn-loop", "--name", "demo", "--stage", "pharn-plan", "--status", "done", "--row", "S9"],
      ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan", "--status", "done", "--gate", "pass"],
      ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-build", "--iteration", "1", "--status", "done"],
      ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan", "--status", "passed"],
      ["--command", "pharn-loop", "--name", "demo", "--stage", "pharn-plan", "--status", "refused", "--row", "S11"],
      ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan"],
      ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan", "--status", "done", "--status", "refused"],
    ];
    for (const args of bad) {
      const r = run(dir, ["report", ...args]);
      assert.equal(r.status, 2, `${JSON.stringify(args)}: ${r.stdout}`);
    }
    assert.deepEqual(readdirSync(dir), [], "nothing was written, not even a directory");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("read — every unusable reason: no-result, malformed, mismatch, unreadable, usage", () => {
  const dir = scratch();
  try {
    const who = ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan"];
    const resultPath = join(dir, ".pharn", "pharn-ship", "demo", RESULT_FILE);
    // no-result: no state dir at all, then a state dir with no file.
    assert.deepEqual(run(dir, ["read", ...who]).stdout, `unusable no-result — ${NO_RESULT_TEXT}\n`);
    mkdirSync(dirname(resultPath), { recursive: true });
    assert.equal(run(dir, ["read", ...who]).status, 2);
    const cases = [
      ["not JSON", "{ nope", "unusable malformed"],
      ["an array", "[]", "unusable malformed"],
      [
        "an extra key",
        JSON.stringify({ ...buildResult({ command: "pharn-ship", name: "demo", stage: "pharn-plan", status: "done" }), x: 1 }),
        "unusable malformed",
      ],
      [
        "another stage's result",
        JSON.stringify(buildResult({ command: "pharn-ship", name: "demo", stage: "pharn-grill", status: "done" })),
        "unusable mismatch",
      ],
      [
        "another feature's result",
        JSON.stringify(buildResult({ command: "pharn-ship", name: "other", stage: "pharn-plan", status: "done" })),
        "unusable mismatch",
      ],
      ["larger than the bound", `{"pad":"${"x".repeat(RESULT_MAX_BYTES)}"}`, "unusable malformed"],
    ];
    for (const [label, text, line] of cases) {
      writeFileSync(resultPath, text);
      const r = run(dir, ["read", ...who]);
      assert.deepEqual([r.status, r.stdout], [2, `${line}\n`], label);
      assert.equal(existsSync(resultPath), false, `${label}: a regular result file is consumed even when it is unusable`);
    }
    mkdirSync(resultPath);
    assert.deepEqual(run(dir, ["read", ...who]).stdout, "unusable unreadable\n", "a directory at the result path");
    rmSync(resultPath, { recursive: true });
    const usage = run(dir, ["read", "--command", "pharn-ship", "--name", "demo"]);
    assert.deepEqual([usage.status, usage.stdout], [2, "unusable usage\n"], "a missing --stage");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('read — {"toString":1} in EVERY field is `unusable malformed`, exit 2, never a crash (L62)', () => {
  const dir = scratch();
  try {
    assert.throws(() => String(JSON.parse('{"toString":1}')), TypeError, "CONTROL: the value really makes String() throw");
    const who = ["--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan"];
    const resultPath = join(dir, ".pharn", "pharn-ship", "demo", RESULT_FILE);
    mkdirSync(dirname(resultPath), { recursive: true });
    const base = buildResult({ command: "pharn-ship", name: "demo", stage: "pharn-plan", status: "done" });
    for (const k of RESULT_KEYS) {
      writeFileSync(resultPath, JSON.stringify({ ...base, [k]: { toString: 1 } }));
      const r = run(dir, ["read", ...who]);
      assert.deepEqual([r.status, r.stdout], [2, "unusable malformed\n"], k);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── PATH_KINDS (L59) — each state-root component, and the result path itself, as every link/file kind ────

/** The kinds a path the CLI did not create can be. Each builder plants `kind` at `path`, with any link
 *  target placed under `outside` so a write that followed it would be visible there. */
const PATH_KINDS = [
  { kind: "a file where a directory belongs", plant: (path) => writeFileSync(path, "planted\n") },
  {
    kind: "a link to a directory",
    plant: (path, outside) => {
      mkdirSync(join(outside, "target-dir"), { recursive: true });
      symlinkSync(join(outside, "target-dir"), path);
    },
  },
  { kind: "a dangling link", plant: (path, outside) => symlinkSync(join(outside, "does-not-exist"), path) },
  { kind: "a looping link", plant: (path) => symlinkSync(path, path) },
];

test("PATH_KINDS — every state-root component as every kind: report, read and route each refuse (exit 2), nothing written outside", () => {
  assert.equal(PATH_KINDS.length, 4, "L34");
  const components = [[".pharn"], [".pharn", "pharn-ship"], [".pharn", "pharn-ship", "demo"]];
  let cases = 0;
  for (const parts of components) {
    for (const k of PATH_KINDS) {
      const dir = scratch();
      const outside = scratch("stage-agent-outside-");
      try {
        copyFileSync(REPO_CONFIG, join(dir, "pharn.config.json"));
        if (parts.length > 1) mkdirSync(join(dir, ...parts.slice(0, -1)), { recursive: true });
        k.plant(join(dir, ...parts), outside);
        const where = `${parts.join("/")} as ${k.kind}`;
        const rep = run(dir, ["report", "--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan", "--status", "done"]);
        assert.equal(rep.status, 2, `report, ${where}: ${rep.stdout}${rep.stderr}`);
        const rd = run(dir, ["read", "--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan"]);
        assert.equal(rd.status, 2, `read, ${where}`);
        assert.equal(rd.stdout, "unusable unreadable\n", `read, ${where}`);
        const rt = run(dir, routeArgs("pharn-plan"));
        assert.deepEqual([rt.status, rt.stdout], [2, ""], `route, ${where}`);
        const leaked = existsSync(join(outside, "target-dir")) ? readdirSync(join(outside, "target-dir")) : [];
        assert.deepEqual(leaked, [], `${where}: nothing was written through the link`);
        assert.equal(existsSync(join(outside, "does-not-exist")), false, `${where}: a dangling link was never created through`);
        cases++;
      } finally {
        rmSync(dir, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
      }
    }
  }
  assert.equal(cases, 12);
});

test("PATH_KINDS — the RESULT path itself as a link or a directory: refused, never followed, the target untouched", () => {
  const kinds = [
    ...PATH_KINDS.filter((k) => k.kind !== "a file where a directory belongs"),
    {
      kind: "a link to a regular file",
      plant: (path, outside) => (writeFileSync(join(outside, "victim.json"), "keep\n"), symlinkSync(join(outside, "victim.json"), path)),
    },
    { kind: "a directory", plant: (path) => mkdirSync(path) },
  ];
  for (const k of kinds) {
    const dir = scratch();
    const outside = scratch("stage-agent-outside-");
    try {
      copyFileSync(REPO_CONFIG, join(dir, "pharn.config.json"));
      const resultPath = join(dir, ".pharn", "pharn-ship", "demo", RESULT_FILE);
      mkdirSync(dirname(resultPath), { recursive: true });
      k.plant(resultPath, outside);
      const rep = run(dir, ["report", "--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan", "--status", "done"]);
      assert.equal(rep.status, 2, `report over ${k.kind}`);
      const rd = run(dir, ["read", "--command", "pharn-ship", "--name", "demo", "--stage", "pharn-plan"]);
      assert.deepEqual([rd.status, rd.stdout], [2, "unusable unreadable\n"], `read over ${k.kind}`);
      assert.equal(run(dir, routeArgs("pharn-plan")).status, 2, `route over ${k.kind}`);
      assert.ok(lstatSync(resultPath, { throwIfNoEntry: false }) !== undefined, `${k.kind}: the planted entry is left for a person`);
      if (existsSync(join(outside, "victim.json"))) assert.equal(readFileSync(join(outside, "victim.json"), "utf8"), "keep\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  }
});

// ── resolve-failed — a byte-identical copy of the CLI beside a stub checker ───────────────────────────

function stubbed(stubSource) {
  const dir = scratch("stage-agent-stub-");
  const bin = join(dir, "floor");
  mkdirSync(bin);
  for (const f of CLOSURE) copyFileSync(join(HERE, f), join(bin, f));
  writeFileSync(join(bin, "check-model-config.mjs"), stubSource);
  assert.equal(readFileSync(join(bin, "stage-agent.mjs"), "utf8"), readFileSync(CLI, "utf8"), "the copy is the real CLI, byte for byte");
  copyFileSync(REPO_CONFIG, join(dir, "pharn.config.json"));
  return { dir, cli: join(bin, "stage-agent.mjs") };
}

test("resolve-failed — a checker that exits 2, one that prints no {model, effort}, one that fails validate oddly", () => {
  const stubs = [
    ["exits 2", "process.exitCode = 2;\n"],
    ["prints garbage at exit 0", 'process.stdout.write("not json\\n");\n'],
    ["prints a model with no effort", 'process.stdout.write(JSON.stringify({ model: "opus" }) + "\\n");\n'],
    ["resolve 1 then validate 7", 'process.exitCode = process.argv[2] === "resolve" ? 1 : 7;\n'],
    ["throws (node's own exit 1 on resolve, then 1 on validate)", 'throw new Error("boom");\n'],
  ];
  for (const [label, src] of stubs) {
    const { dir, cli } = stubbed(src);
    try {
      const r = run(dir, routeArgs("pharn-plan"), cli);
      const want = label.startsWith("throws") ? "inline:config-red\n" : "inline:resolve-failed\n";
      assert.deepEqual([r.status, r.stdout], [3, want], `${label}: ${r.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test(`resolve-failed — a checker that outlives CHECKER_TIMEOUT_MS (${CHECKER_TIMEOUT_MS} ms) is killed, and the stage runs inline`, () => {
  const { dir, cli } = stubbed("setInterval(() => {}, 1000);\n");
  try {
    const r = run(dir, routeArgs("pharn-plan"), cli);
    assert.deepEqual([r.status, r.stdout], [3, "inline:resolve-failed\n"], r.stderr);
    assert.ok(r.ms >= CHECKER_TIMEOUT_MS - 500, `it waited for the bound (${r.ms} ms)`);
    assert.ok(r.ms < CHECKER_TIMEOUT_MS + 15_000, `and not much longer (${r.ms} ms) — the child was killed, not awaited`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── never a crash; the measured spawn ─────────────────────────────────────────────────────────────────

test("never a crash — odd argv exits 2 (never 1, node's crash code), for every subcommand", () => {
  const dir = scratch();
  try {
    const cases = [
      [],
      ["nope"],
      ["route"],
      ["route", "--command"],
      ["route", "--command", "--stage"],
      ["route", "--bogus", "x"],
      ["brief", "--command", "pharn-ship", "--stage", "pharn-plan", "--name", "demo", "--config", "x"],
      // argv cannot carry a NUL (spawn refuses it), so the control character is a tab.
      ["report", "--command", "pharn-ship", "--stage", "pharn-plan", "--name", "a\tb", "--status", "done"],
      ["read", "--command", "pharn-ship", "--stage", "pharn-plan", "--name", "x".repeat(200)],
      ["read", "--command", "pharn-ship", "--stage", "pharn-plan", "--name", "demo", "--iteration", "1"],
      ["toString"],
      ["__proto__", "--command", "pharn-ship"],
    ];
    for (const args of cases) {
      const r = run(dir, args);
      assert.equal(r.status, 2, `${JSON.stringify(args)}: ${r.stdout}${r.stderr}`);
      assert.doesNotMatch(r.stderr, /at .*\.mjs:\d+/, "no stack trace");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the measured spawn: a real `route` finishes far inside CHECKER_TIMEOUT_MS", (t) => {
  const dir = scratch();
  try {
    copyFileSync(REPO_CONFIG, join(dir, "pharn.config.json"));
    const times = [];
    for (let i = 0; i < 5; i++) {
      const r = run(dir, routeArgs("pharn-plan"));
      assert.equal(r.status, 0);
      times.push(r.ms);
    }
    t.diagnostic(`route spawn, 5 runs (ms): ${times.join(", ")}`);
    assert.ok(
      Math.max(...times) < CHECKER_TIMEOUT_MS / 2,
      `the slowest route took ${Math.max(...times)} ms — the bound has lost its margin`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
