// pharn/floor/stage-direct.test.mjs — the orchestrators' direct stage call (6.36.0, orchestrator-direct-stage-calls).
//
// Two halves, named so neither stands in for the other (GRILL G4):
//   (a) HERE, with an INJECTED stage script: every exit code (0/2/3/4/5, a crash, a signal) passes through; the scope
//       file holds the thin caller's scope WHILE the script runs and the live guard denies a write outside `.pharn/**`
//       then; markers per mode; each failure mode the header names.
//   (b) `.dev/floor/command-hygiene.test.mjs` (DIRECT_STAGE_WIRING) runs each COMMITTED line with the REAL script in a
//       scratch tree, where the script refuses: it proves that line's pass-through, markers and release — never the
//       other codes.
// Each assertion names the mutant that turns it red (L60).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DIRECT_STAGES,
  SETTER,
  CLEAR_ARGV,
  MARKER_DEFERRED_CONTINUE,
  parseDirectArgs,
  scriptArgv,
  setterArgv,
  returnMarkerDue,
} from "./stage-direct-core.mjs";
import { runDirect } from "./stage-direct.mjs";
import { REGRESS_PATHS } from "./stage-regress-core.mjs";
import { VERIFY_PATHS } from "./stage-verify-core.mjs";
import { REGISTRY, EXIT_CODE } from "./stage-exit-core.mjs";
import { MARKER_NOT_WRITTEN, markerLine } from "./mark-phase.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const REAL_SETTER = join(REPO, SETTER);
const GUARD = join(REPO, ".claude", "hooks", "enforce-writes-scope.cjs");
const CLI = join(HERE, "stage-direct.mjs");

const fresh = (stage, extra = []) => [
  "--stage",
  stage,
  "--name",
  "demo",
  "--iteration",
  "1",
  "--timeout-ms",
  "540000",
  "--budget-ms",
  "570000",
  ...extra,
];
const resume = (stage) => ["--stage", stage, "--name", "demo", "--resume", "--budget-ms", "570000"];

// ── (a) the core ──────────────────────────────────────────────────────────────────────────────────────

test("DIRECT_STAGES — the scope target is IMPORTED from each stage's own path table; the command file and script exist", () => {
  assert.deepEqual(Object.keys(DIRECT_STAGES).sort(), ["pharn-regress", "pharn-verify"], "L34: the two floor-only stages");
  assert.equal(DIRECT_STAGES["pharn-regress"].target, REGRESS_PATHS.stageJson);
  assert.equal(DIRECT_STAGES["pharn-verify"].target, VERIFY_PATHS.stageJson);
  for (const [stage, t] of Object.entries(DIRECT_STAGES)) {
    assert.ok(existsSync(join(REPO, t.command)), `${stage}: ${t.command} exists`);
    assert.ok(existsSync(join(HERE, t.script)), `${stage}: ${t.script} exists beside the module`);
    assert.ok(Object.hasOwn(REGISTRY, t.exitStage), `${stage}: ${t.exitStage} is a stage-exit registry stage`);
    assert.deepEqual(setterArgv(stage), ["--from-frontmatter", t.command, "--target", t.target]);
  }
  assert.deepEqual(CLEAR_ARGV, ["--clear"]);
});

test("DIRECT_STAGES — every flag a registry QUESTION option appends is a flag of its stage, value or bare as the option needs (GRILL G3.6)", () => {
  const check = (table) => {
    const out = [];
    for (const [stage, t] of Object.entries(table)) {
      for (const q of Object.values(REGISTRY[t.exitStage].question ?? {})) {
        for (const opt of q.options) {
          if (opt.argv === null) continue;
          const [flag, ...rest] = opt.argv;
          const want = rest.includes("<value>") ? t.valueFlags : t.bareFlags;
          if (!want.includes(flag)) out.push(`${stage}: ${flag}`);
        }
      }
    }
    return out;
  };
  assert.deepEqual(check(DIRECT_STAGES), []);
  // CONTROL (L60): a table without --install fails the same check.
  const mutant = { ...DIRECT_STAGES, "pharn-regress": { ...DIRECT_STAGES["pharn-regress"], valueFlags: ["--base", "--gates", "--tests"] } };
  assert.deepEqual(check(mutant), ["pharn-regress: --install"]);
});

test("parseDirectArgs — a fresh call, with the stage's flags passed through in order; scriptArgv builds the script's argv", () => {
  const r = parseDirectArgs(fresh("pharn-regress", ["--base", "abc123", "--no-install"]));
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(r.opts, {
    stage: "pharn-regress",
    name: "demo",
    mode: "fresh",
    iteration: 1,
    timeoutMs: 540000,
    budgetMs: 570000,
    passthrough: ["--base", "abc123", "--no-install"],
  });
  assert.deepEqual(scriptArgv(r.opts), [
    "--feature",
    "demo",
    "--timeout-ms",
    "540000",
    "--budget-ms",
    "570000",
    "--base",
    "abc123",
    "--no-install",
  ]);
  const v = parseDirectArgs(resume("pharn-verify"));
  assert.equal(v.ok, true, v.reason);
  assert.deepEqual(scriptArgv(v.opts), ["--resume", "--budget-ms", "570000"], "a resume carries no state of its own (L44)");
});

test("parseDirectArgs — CLOSED both ways: each refusal names a flag or a vocabulary", () => {
  const refused = [
    [[], /--stage is required/],
    [["--stage", "pharn-build", "--name", "demo"], /--stage must be one of/],
    [fresh("pharn-regress").map((a) => (a === "demo" ? "Bad Name" : a)), /--name must be a feature slug/],
    [fresh("pharn-regress").filter((a, i, all) => a !== "--iteration" && all[i - 1] !== "--iteration"), /--iteration is required/],
    [fresh("pharn-regress").filter((a, i, all) => a !== "--timeout-ms" && all[i - 1] !== "--timeout-ms"), /--timeout-ms is required/],
    [["--stage", "pharn-verify", "--name", "demo"], /--budget-ms is required/],
    [fresh("pharn-verify", ["--base", "x"]), /"--base" is not a pharn-verify flag \(allowed: --gates\)/],
    [fresh("pharn-regress", ["--bogus", "x"]), /is not a pharn-regress flag/],
    [fresh("pharn-regress", ["--base", "a", "--base", "b"]), /--base was given more than once/],
    [[...resume("pharn-regress"), "--resume"], /--resume was given more than once/],
    [[...resume("pharn-regress"), "--iteration", "1"], /--resume takes only/],
    [[...resume("pharn-regress"), "--base", "x"], /--resume takes only/],
    [fresh("pharn-regress", ["--base"]), /was given with no value/],
    [fresh("pharn-regress", ["--base", "--no-install"]), /was given with no value/],
    [["positional", ...fresh("pharn-regress")], /unexpected argument "positional"/],
    [fresh("pharn-regress").map((a) => (a === "540000" ? "0" : a)), /--timeout-ms must be a positive integer/],
    [fresh("pharn-regress").map((a) => (a === "570000" ? "570000\n" : a)), /--budget-ms must be a positive integer/],
    [fresh("pharn-regress").map((a) => (a === "1" ? "-1" : a)), /no value|--iteration must be a positive integer/],
    [fresh("pharn-regress", ["--base", "a\tb"]), /--base must be a value without control characters/],
  ];
  for (const [argv, re] of refused) {
    const r = parseDirectArgs(argv);
    assert.equal(r.ok, false, `${JSON.stringify(argv)} must be refused`);
    assert.match(r.reason, re, JSON.stringify(argv));
  }
  assert.equal(parseDirectArgs(undefined).ok, false);
});

test("returnMarkerDue — every exit closes the stage's execution but continue (5)", () => {
  for (const code of [0, 1, 2, 3, 4, 6, 7, 127]) assert.equal(returnMarkerDue(code), true, String(code));
  assert.equal(returnMarkerDue(EXIT_CODE.continue), false);
  assert.equal(EXIT_CODE.continue, 5, "L34: the stage-exit table's own number");
});

// ── (a) the CLI, with an injected stage script ────────────────────────────────────────────────────────

/** A fake stage script: records what it saw (its argv, the scope file, the live guard's verdicts) on stdout as ONE JSON
 *  object, then exits as FAKE_EXIT says (a number, or "SIGKILL"). It runs with cwd = the scratch root. */
const FAKE = `
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
writeFileSync(".ran", "1");
const scope = existsSync(".pharn/writes-scope.json") ? JSON.parse(readFileSync(".pharn/writes-scope.json", "utf8")).scope : null;
const guard = (p) => spawnSync(process.execPath, [process.env.FAKE_GUARD], {
  input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: p } }), encoding: "utf8" }).status;
const seen = { argv: process.argv.slice(2), scope, inside: guard(".pharn/pharn-regress/other.json"),
  outside: guard("pharn/features/demo/REGRESSION.md") };
process.stdout.write(JSON.stringify(seen) + (process.env.FAKE_NO_NL ? "" : "\\n"));
if (process.env.FAKE_EXIT === "SIGKILL") process.kill(process.pid, "SIGKILL");
process.exitCode = Number(process.env.FAKE_EXIT ?? "0");
`;

function scratchRoot({ commands = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "stage-direct-"));
  if (commands) {
    mkdirSync(join(root, ".claude", "commands"), { recursive: true });
    for (const t of Object.values(DIRECT_STAGES)) copyFileSync(join(REPO, t.command), join(root, t.command));
  }
  writeFileSync(join(root, "fake.mjs"), FAKE);
  return root;
}

/** Run one direct call in-process with the fake script, the REAL setter and the REAL guard. */
function direct(root, argv, env = {}, opts = {}) {
  const saved = { ...process.env };
  Object.assign(process.env, { FAKE_GUARD: GUARD, ...env });
  delete process.env.CLAUDE_PROJECT_DIR;
  const pieces = [];
  try {
    const r = runDirect(argv, {
      root,
      scriptPathFor: () => join(root, "fake.mjs"),
      setterPath: REAL_SETTER,
      write: (s) => pieces.push(s),
      ...opts,
    });
    return { ...r, pieces };
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}
const markersIn = (root) => {
  const f = join(root, ".pharn", "cost", "demo", "markers.jsonl");
  return existsSync(f)
    ? readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
};
const seenBy = (out) => JSON.parse(out.split("\n").find((l) => l.startsWith("{")));

test("runDirect — the scope is the thin caller's WHILE the script runs (the live guard denies outside .pharn/**), and released after", () => {
  for (const stage of Object.keys(DIRECT_STAGES)) {
    const root = scratchRoot();
    try {
      const r = direct(root, fresh(stage));
      assert.equal(r.exit, 0, r.err.join("\n"));
      const seen = seenBy(r.out);
      // What the thin caller's own pinned setter line writes, run in another scratch root (the parity, L31).
      const ref = scratchRoot();
      try {
        const s = spawnSync(process.execPath, [REAL_SETTER, ...setterArgv(stage)], { cwd: ref, encoding: "utf8" });
        assert.equal(s.status, 0, s.stderr);
        assert.deepEqual(seen.scope, JSON.parse(readFileSync(join(ref, ".pharn", "writes-scope.json"), "utf8")).scope);
      } finally {
        rmSync(ref, { recursive: true, force: true });
      }
      assert.equal(seen.outside, 2, `${stage}: a Write outside .pharn/** is DENIED while the script runs`);
      assert.equal(seen.inside, 0, `${stage}: .pharn/** stays writable`);
      assert.equal(existsSync(join(root, ".pharn", "writes-scope.json")), false, `${stage}: released after`);
      // CONTROL: with the scope released, the same probe is allowed by the default — so the deny above was the scope's.
      const after = spawnSync(process.execPath, [GUARD], {
        cwd: root,
        input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "pharn/features/demo/REGRESSION.md" } }),
        env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "CLAUDE_PROJECT_DIR")),
        encoding: "utf8",
      });
      assert.equal(after.status, 0, after.stderr);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("runDirect — EVERY exit code passes through; the start marker precedes the script, the return marker follows every exit but 5", () => {
  for (const code of [0, 2, 3, 4, 5, 1, 7]) {
    const root = scratchRoot();
    try {
      const r = direct(root, fresh("pharn-verify"), { FAKE_EXIT: String(code) });
      assert.equal(r.exit, code, `exit ${code} passes through`);
      const m = markersIn(root);
      assert.equal(m[0].kind, "stage-start");
      assert.deepEqual([m[0].stage, m[0].iteration, "route" in m[0]], ["pharn-verify", 1, false], "byte-identical to the old marker line");
      assert.equal(r.pieces[0], `${markerLine(m[0])}\n`, "the start line is emitted FIRST, before the script's output");
      assert.equal(seenBy(r.pieces[1]).argv[0], "--feature", "then the script's stdout, verbatim");
      if (code === 5) {
        assert.equal(m.length, 1, "continue: the stage is not over");
        assert.equal(r.pieces.at(-1), `${MARKER_DEFERRED_CONTINUE}\n`);
      } else {
        assert.equal(m.length, 2, `exit ${code}: the return marker`);
        assert.equal(m[1].kind, "orchestrator");
        assert.equal(r.pieces.at(-1), `${markerLine(m[1])}\n`);
      }
      assert.equal(r.out, r.pieces.join(""), "out is exactly the emitted pieces");
      assert.equal(existsSync(join(root, ".pharn", "writes-scope.json")), false, "released on every exit");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("runDirect — a signal is exit 1 (a crash, never a verdict), named on stderr, and the stage still closes", () => {
  const root = scratchRoot();
  try {
    const r = direct(root, fresh("pharn-regress"), { FAKE_EXIT: "SIGKILL" });
    assert.equal(r.exit, 1);
    assert.match(r.err.join("\n"), /ended on a signal \(SIGKILL\)/);
    assert.equal(markersIn(root).at(-1).kind, "orchestrator");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runDirect — a resume writes no start marker, passes only --resume --budget-ms, and closes the stage", () => {
  const root = scratchRoot();
  try {
    const r = direct(root, resume("pharn-regress"));
    assert.equal(r.exit, 0);
    assert.deepEqual(seenBy(r.out).argv, ["--resume", "--budget-ms", "570000"]);
    assert.deepEqual(
      markersIn(root).map((m) => m.kind),
      ["orchestrator"]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runDirect — a setter that fails (no thin-caller command file) refuses with exit 2: nothing runs, nothing is marked (GRILL G2)", () => {
  const root = scratchRoot({ commands: false });
  try {
    const r = direct(root, fresh("pharn-regress"));
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(r.err.join("\n"), /writes-scope for pharn-regress could not be set/);
    assert.equal(existsSync(join(root, ".ran")), false, "the script never ran");
    assert.deepEqual(markersIn(root), []);
    // CONTROL: the same root WITH the command files runs.
    mkdirSync(join(root, ".claude", "commands"), { recursive: true });
    copyFileSync(join(REPO, ".claude/commands/pharn-regress.md"), join(root, ".claude/commands/pharn-regress.md"));
    assert.equal(direct(root, fresh("pharn-regress")).exit, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runDirect — an unwritable marker prints MARKER_NOT_WRITTEN and the stage still runs with its own exit; a refused argv runs nothing", () => {
  const root = scratchRoot();
  try {
    mkdirSync(join(root, ".pharn"), { recursive: true });
    writeFileSync(join(root, ".pharn", "cost"), "a file where the marker directory belongs\n");
    const r = direct(root, fresh("pharn-verify"), { FAKE_EXIT: "3" });
    assert.equal(r.exit, 3);
    assert.equal(r.pieces[0], `${MARKER_NOT_WRITTEN}\n`);
    assert.equal(r.pieces.at(-1), `${MARKER_NOT_WRITTEN}\n`);
    assert.ok(existsSync(join(root, ".ran")), "the script ran");
    assert.match(r.err.join("\n"), /stage-start marker was not written/);
    const bad = direct(root, fresh("pharn-verify", ["--base", "x"]));
    assert.deepEqual([bad.exit, bad.out], [2, ""]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runDirect — a --clear that fails is a note on stderr, never a changed exit (GRILL G2)", () => {
  const root = scratchRoot();
  try {
    // A setter that sets the scope as the real one does, then fails to release it.
    const setter = join(root, "setter.cjs");
    writeFileSync(
      setter,
      `const r = require("node:child_process").spawnSync(process.execPath, [${JSON.stringify(REAL_SETTER)}, ...process.argv.slice(2)], { stdio: "inherit" });\n` +
        `process.exitCode = process.argv[2] === "--clear" ? 9 : r.status;\n`
    );
    const r = direct(root, fresh("pharn-regress"), { FAKE_EXIT: "0" }, { setterPath: setter });
    assert.equal(r.exit, 0);
    assert.match(r.err.join("\n"), /writes-scope was not released \(setter exit 9\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runDirect — a script stdout without a final newline gets one, so the return marker stays a WHOLE line (the run binding)", () => {
  const root = scratchRoot();
  try {
    const r = direct(root, fresh("pharn-verify"), { FAKE_NO_NL: "1" });
    const m = markersIn(root);
    assert.ok(r.out.endsWith(`}\n${markerLine(m[1])}\n`), JSON.stringify(r.out.slice(-200)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the CLI by path, with the REAL script (one case; the committed lines are hygiene's ★ test) ─────────

test("the CLI — the real stage-verify.mjs refuses in a scratch tree, and the call passes its object and code through", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-direct-cli-"));
  try {
    symlinkSync(join(REPO, "pharn"), join(root, "pharn"));
    mkdirSync(join(root, ".claude"));
    symlinkSync(join(REPO, ".claude", "hooks"), join(root, ".claude", "hooks"));
    symlinkSync(join(REPO, ".claude", "commands"), join(root, ".claude", "commands"));
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    delete env.CLAUDE_CODE_SESSION_ID;
    const r = spawnSync(process.execPath, [CLI, ...fresh("pharn-verify")], { cwd: root, env, encoding: "utf8" });
    assert.equal(r.status, 2, r.stderr);
    const lines = r.stdout.trimEnd().split("\n");
    const obj = JSON.parse(lines.slice(1, -1).join("\n"));
    assert.deepEqual([obj.schema, obj.status, obj.stage], ["pharn-stage-exit/1", "unusable", "verify"]);
    assert.match(lines[0], /^marker 1: stage-start pharn-verify iter=1 /);
    assert.match(lines.at(-1), /^marker 2: orchestrator /);
    assert.equal(existsSync(join(root, ".pharn", "writes-scope.json")), false);
    // Odd argv at the CLI: exit 2, nothing on stdout, no stack trace.
    for (const argv of [[], ["--stage"], ["--stage", "toString", "--name", "demo", "--budget-ms", "1"]]) {
      const o = spawnSync(process.execPath, [CLI, ...argv], { cwd: root, env, encoding: "utf8" });
      assert.deepEqual([o.status, o.stdout], [2, ""], `${JSON.stringify(argv)}: ${o.stderr}`);
      assert.doesNotMatch(o.stderr, /at .*\.mjs:\d+/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
