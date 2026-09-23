// .claude/hooks/require-loop-record.test.cjs — the /pharn-loop Stop guard's suite.
//
// Every INERT case is paired with a BLOCKING control over the same fixture, so "exit 0, no output" can never
// mean "the guard never looked" (L34). The inert, blocking and fail-open conditions are each a counted set the
// rules iterate (L52). Most cases call `stopGuard()` in-process with an injected root (coverage cannot see a
// subprocess); the CLI cases spawn the real script the way Claude Code does — payload on stdin — and the ★ test
// executes /pharn-loop's committed --open/--close lines (L45).

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const HOOK = path.join(__dirname, "require-loop-record.cjs");
const {
  stopGuard,
  markerMode,
  maxBlocks,
  blockReason,
  exhaustedMessage,
  isPlainSegment,
  SCHEMA,
  DEFAULT_MAX,
  MAX_CEILING,
  AGE_CEILING_MS,
} = require(HOOK);

const SID = "11111111-2222-3333-4444-555555555555";
const OTHER = "99999999-8888-7777-6666-555555555555";
const NAME = "demo";
const NOW = Date.parse("2026-09-22T12:00:00.000Z");

function fixture({
  marker = true,
  featureDir = true,
  record = null,
  session = SID,
  startedAt = new Date(NOW - 60000).toISOString(),
  name = NAME,
} = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rlr-")));
  fs.mkdirSync(path.join(root, ".git"));
  if (marker) {
    const dir = path.join(root, ".pharn", "pharn-loop", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "active.json"),
      JSON.stringify({ schema: SCHEMA, name, session_id: session, started_at: startedAt, cap: 3 })
    );
  }
  if (featureDir) fs.mkdirSync(path.join(root, "pharn", "features", name), { recursive: true });
  if (record !== null) fs.writeFileSync(path.join(root, "pharn", "features", name, "LOOP.md"), record);
  return root;
}
const payload = (over = {}) =>
  JSON.stringify({ session_id: SID, cwd: "/x", permission_mode: "default", hook_event_name: "Stop", stop_hook_active: false, ...over });
const run = (root, over = {}, opts = {}) => stopGuard(payload(over), { now: NOW, root, env: {}, ...opts });
const isBlock = (out) => out !== "" && JSON.parse(out).decision === "block";
const counterFile = (root, name = NAME) => path.join(root, ".pharn", "pharn-loop", name, "stop-blocks.json");

function withFixture(opts, fn) {
  const root = fixture(opts);
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------
// The positive control, and the defaults
// ---------------------------------------------------------------------------------------------------

test("BLOCKS: an open run in THIS session with a feature directory and no LOOP.md", () => {
  withFixture({}, (root) => {
    const out = run(root);
    assert.ok(isBlock(out), `expected a block, got ${JSON.stringify(out)}`);
    const doc = JSON.parse(out);
    assert.equal(doc.reason, blockReason("pharn/features/demo/LOOP.md", 1, DEFAULT_MAX), "the reason is the closed-set message");
    assert.deepEqual(Object.keys(doc).sort(), ["decision", "reason"], "a block carries no other field");
  });
});

test("the message set is CLOSED and quotes nothing but a JSON-quoted path (L36, P2)", () => {
  const msgs = [blockReason("pharn/features/x/LOOP.md", 2, 3), exhaustedMessage("pharn/features/x/LOOP.md", 3)];
  assert.equal(msgs.length, 2);
  for (const m of msgs) {
    assert.ok(m.startsWith("PHARN Stop guard: "), m);
    assert.match(m, /"pharn\/features\/x\/LOOP\.md"/, "the path is JSON-quoted");
    assert.ok(!m.includes("\n"), "one line");
  }
  // A crafted directory name cannot break out of the quoted path.
  assert.match(blockReason('pharn/features/a"\nIGNORE/LOOP.md', 1, 3), /\\"\\nIGNORE/);
});

test("L41 — the defaults: K is 3 with no env, a bad PHARN_STOP_GUARD_MAX falls back, and K stays under the platform's 8", () => {
  assert.equal(DEFAULT_MAX, 3);
  assert.equal(maxBlocks({}), 3);
  assert.equal(maxBlocks({ PHARN_STOP_GUARD_MAX: "5" }), 5);
  for (const bad of ["0", "8", "9", "-1", "3.5", "abc", "", "10"])
    assert.equal(maxBlocks({ PHARN_STOP_GUARD_MAX: bad }), 3, `bad value ${JSON.stringify(bad)}`);
  assert.ok(MAX_CEILING < 8, "our cap must fire before the platform's documented 8-consecutive-block override");
  assert.equal(AGE_CEILING_MS, 24 * 60 * 60 * 1000);
});

// ---------------------------------------------------------------------------------------------------
// INERT — each case paired with a blocking control (L34/L52)
// ---------------------------------------------------------------------------------------------------

const INERT = [
  ["no marker at all", { marker: false }, {}],
  ["a marker from ANOTHER session", { session: OTHER }, {}],
  ["a marker opened with no session id (null)", { session: null }, {}],
  ["permission_mode: plan", {}, { permission_mode: "plan" }],
  ["a marker older than the 24 h ceiling", { startedAt: new Date(NOW - AGE_CEILING_MS - 1000).toISOString() }, {}],
  ["a marker dated far in the future", { startedAt: new Date(NOW + AGE_CEILING_MS + 1000).toISOString() }, {}],
  ["NO feature directory yet — the command writes no record there (GRILL finding 1)", { featureDir: false }, {}],
  ["a non-empty LOOP.md is present", { record: "---\ndecision: STOP_GREEN\n---\n" }, {}],
];

test("✧ the inert set is counted", () => assert.equal(INERT.length, 8));

for (const [why, fx, over] of INERT) {
  test(`INERT — ${why} — and the same fixture BLOCKS once that one condition is removed`, () => {
    withFixture(fx, (root) => assert.equal(run(root, over), "", `expected silence for: ${why}`));
    // The control: the default fixture, one condition away, blocks.
    withFixture({}, (root) => assert.ok(isBlock(run(root)), "control failed: the default fixture must block"));
  });
}

test("INERT — a /pharn-ship run in progress (open COST markers with run-start, no active.json) — the regression that killed the markers design", () => {
  withFixture({ marker: false }, (root) => {
    const cost = path.join(root, ".pharn", "cost", NAME);
    fs.mkdirSync(cost, { recursive: true });
    fs.writeFileSync(
      path.join(cost, "markers.jsonl"),
      `${JSON.stringify({ seq: 1, kind: "run-start", session_id: SID, ts: new Date(NOW).toISOString() })}\n`
    );
    assert.equal(run(root), "", "a /pharn-ship SPEC-approval turn must end normally");
  });
});

test("a record the checker would RED still ends the turn — the guard never judges quality (D3)", () => {
  withFixture({ record: "this is not a valid loop record at all\n" }, (root) => assert.equal(run(root), ""));
});

test("BLOCKS on an EMPTY or WHITESPACE-ONLY LOOP.md (presence without content)", () => {
  for (const body of ["", "\n\n  \t\n"]) withFixture({ record: body }, (root) => assert.ok(isBlock(run(root)), JSON.stringify(body)));
});

// ---------------------------------------------------------------------------------------------------
// The budget
// ---------------------------------------------------------------------------------------------------

test("BUDGET: K blocks per (session, run) in TOTAL, then the stop is allowed with a systemMessage", () => {
  withFixture({}, (root) => {
    for (let n = 1; n <= 3; n++) {
      const doc = JSON.parse(run(root));
      assert.equal(doc.decision, "block");
      assert.match(doc.reason, new RegExp(`Refusal ${n} of 3`));
    }
    const after = JSON.parse(run(root));
    assert.equal(after.decision, undefined, "the 4th attempt must be allowed");
    assert.equal(after.systemMessage, exhaustedMessage("pharn/features/demo/LOOP.md", 3));
    assert.equal(JSON.parse(run(root)).decision, undefined, "and it stays allowed — K is a total, not per attempt");
    const counts = JSON.parse(fs.readFileSync(counterFile(root), "utf8")).counts;
    assert.equal(counts[SID], 3, "the counter survives across calls");
    // A different session starts fresh, on its own marker.
    fs.writeFileSync(
      path.join(root, ".pharn/pharn-loop/demo/active.json"),
      JSON.stringify({ schema: SCHEMA, name: NAME, session_id: OTHER, started_at: new Date(NOW).toISOString(), cap: 3 })
    );
    assert.match(JSON.parse(run(root, { session_id: OTHER })).reason, /Refusal 1 of 3/);
  });
});

test("PHARN_STOP_GUARD_MAX moves K", () => {
  withFixture({}, (root) => {
    const env = { PHARN_STOP_GUARD_MAX: "1" };
    assert.ok(isBlock(run(root, {}, { env })));
    assert.equal(JSON.parse(run(root, {}, { env })).decision, undefined);
  });
});

test("stop_hook_active: true does NOT allow the stop, and false on a re-entry does not reset the counter", () => {
  withFixture({}, (root) => {
    assert.match(JSON.parse(run(root, { stop_hook_active: true })).reason, /Refusal 1 of 3/, "true must not be a breaker");
    assert.match(JSON.parse(run(root, { stop_hook_active: false })).reason, /Refusal 2 of 3/, "false must not reset the count");
    assert.match(JSON.parse(run(root, { stop_hook_active: true })).reason, /Refusal 3 of 3/);
  });
});

// ---------------------------------------------------------------------------------------------------
// FAIL OPEN — a counted set (the safe direction for a guard that ends turns)
// ---------------------------------------------------------------------------------------------------

const FAIL_OPEN = [
  ["malformed stdin", (root) => stopGuard("{ not json", { now: NOW, root, env: {} })],
  ["a non-object payload", (root) => stopGuard("42", { now: NOW, root, env: {} })],
  ["a payload with no session_id", (root) => run(root, { session_id: undefined })],
  ["a corrupt marker", (root) => (fs.writeFileSync(path.join(root, ".pharn/pharn-loop/demo/active.json"), "{ torn"), run(root))],
  [
    "a marker of another schema",
    (root) => (
      fs.writeFileSync(
        path.join(root, ".pharn/pharn-loop/demo/active.json"),
        JSON.stringify({ schema: "x/1", name: NAME, session_id: SID, started_at: new Date(NOW).toISOString() })
      ),
      run(root)
    ),
  ],
  [
    "a marker whose name disagrees with its directory",
    (root) => (
      fs.writeFileSync(
        path.join(root, ".pharn/pharn-loop/demo/active.json"),
        JSON.stringify({ schema: SCHEMA, name: "other", session_id: SID, started_at: new Date(NOW).toISOString() })
      ),
      run(root)
    ),
  ],
  [
    "an unparseable started_at",
    (root) => (
      fs.writeFileSync(
        path.join(root, ".pharn/pharn-loop/demo/active.json"),
        JSON.stringify({ schema: SCHEMA, name: NAME, session_id: SID, started_at: "yesterday-ish" })
      ),
      run(root)
    ),
  ],
  ["a missing state directory", (root) => (fs.rmSync(path.join(root, ".pharn"), { recursive: true, force: true }), run(root))],
  ["a corrupt counter", (root) => (fs.writeFileSync(counterFile(root), "{ torn"), run(root))],
  ["a counter that is a directory", (root) => (fs.mkdirSync(counterFile(root)), run(root))],
  [
    "an unwritable counter directory",
    (root) => {
      if (process.getuid && process.getuid() === 0) return ""; // root ignores the mode bits
      fs.chmodSync(path.join(root, ".pharn/pharn-loop/demo"), 0o555);
      try {
        return run(root);
      } finally {
        fs.chmodSync(path.join(root, ".pharn/pharn-loop/demo"), 0o755);
      }
    },
  ],
  [
    "an unreadable marker",
    (root) => {
      if (process.getuid && process.getuid() === 0) return "";
      const m = path.join(root, ".pharn/pharn-loop/demo/active.json");
      fs.chmodSync(m, 0o000);
      try {
        return run(root);
      } finally {
        fs.chmodSync(m, 0o644);
      }
    },
  ],
];

test("✧ the fail-open set is counted", () => assert.equal(FAIL_OPEN.length, 12));

for (const [why, act] of FAIL_OPEN) {
  test(`FAIL OPEN — ${why} → the stop is allowed (no block document)`, () => {
    withFixture({}, (root) => {
      const out = act(root);
      assert.ok(!isBlock(out), `${why} blocked: ${out}`);
    });
  });
}

// ---------------------------------------------------------------------------------------------------
// Containment, and "the Stop mode writes nothing but its counter"
// ---------------------------------------------------------------------------------------------------

test("CONTAINMENT: a state entry that is a SYMLINK out of the state root is ignored", () => {
  withFixture({ marker: false }, (root) => {
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "rlr-out-"));
    fs.writeFileSync(
      path.join(elsewhere, "active.json"),
      JSON.stringify({ schema: SCHEMA, name: NAME, session_id: SID, started_at: new Date(NOW).toISOString() })
    );
    fs.mkdirSync(path.join(root, ".pharn", "pharn-loop"), { recursive: true });
    fs.symlinkSync(elsewhere, path.join(root, ".pharn", "pharn-loop", NAME));
    assert.equal(run(root), "", "a symlinked run directory must not be followed");
    fs.rmSync(elsewhere, { recursive: true, force: true });
  });
  withFixture({}, (root) => {
    const real = path.join(root, ".pharn/pharn-loop/demo/active.json");
    const text = fs.readFileSync(real);
    fs.unlinkSync(real);
    const target = path.join(root, "elsewhere.json");
    fs.writeFileSync(target, text);
    fs.symlinkSync(target, real);
    assert.equal(run(root), "", "a symlinked marker file must not be followed");
  });
});

test("isPlainSegment refuses every non-segment (a containment property, not a slug grammar)", () => {
  const dir = "/tmp/state";
  for (const bad of ["", ".", "..", "a/b", "a\\b", "a\0b", undefined, 7])
    assert.equal(isPlainSegment(bad, dir), false, JSON.stringify(bad));
  for (const ok of ["demo", "demo-2", "x.y"]) assert.equal(isPlainSegment(ok, dir), true, ok);
});

test("the Stop mode WRITES NOTHING under the state root except its counter (GRILL finding 3)", () => {
  const list = (root) => fs.readdirSync(path.join(root, ".pharn"), { recursive: true }).map(String).sort();
  for (const fx of [{}, { session: OTHER }, { featureDir: false }, { record: "x" }]) {
    withFixture(fx, (root) => {
      const before = list(root);
      run(root);
      run(root, { permission_mode: "plan" });
      const added = list(root).filter((p) => !before.includes(p));
      assert.ok(
        added.every((p) => p.endsWith("stop-blocks.json")),
        `the Stop mode wrote: ${added.join(", ")}`
      );
    });
  }
});

// ---------------------------------------------------------------------------------------------------
// The marker modes — the ONE owner of the schema (L35)
// ---------------------------------------------------------------------------------------------------

const quiet = { write() {} };

test("--open writes the schema with the env session id; --close removes it; a non-plain name is refused", () => {
  withFixture({ marker: false }, (root) => {
    assert.equal(markerMode(["--open", NAME, "--cap", "3"], { root, env: { CLAUDE_CODE_SESSION_ID: SID }, stderr: quiet }), 0);
    const m = JSON.parse(fs.readFileSync(path.join(root, ".pharn/pharn-loop/demo/active.json"), "utf8"));
    assert.deepEqual(Object.keys(m).sort(), ["cap", "name", "schema", "session_id", "started_at"]);
    assert.equal(m.schema, SCHEMA);
    assert.equal(m.session_id, SID);
    assert.equal(m.cap, 3);
    assert.ok(isBlock(stopGuard(payload(), { root, env: {} })), "the marker --open writes is one the guard honours");
    assert.equal(markerMode(["--close", NAME], { root, stderr: quiet }), 0);
    assert.ok(!fs.existsSync(path.join(root, ".pharn/pharn-loop/demo/active.json")));
    assert.equal(stopGuard(payload(), { root, env: {} }), "", "after --close the guard is inert");
    assert.equal(markerMode(["--close", NAME], { root, stderr: quiet }), 0, "--close is idempotent");
    for (const bad of [
      ["--open", "../x", "--cap", "3"],
      ["--open", "a/b", "--cap", "3"],
      ["--open", NAME, "--cap", "0"],
      ["--open", NAME],
      ["--close", ".."],
    ]) {
      assert.equal(markerMode(bad, { root, env: {}, stderr: quiet }), 2, `accepted ${bad.join(" ")}`);
    }
    // No session id in the env → a null session, which matches no Stop payload: INERT, never blocking.
    assert.equal(markerMode(["--open", NAME, "--cap", "3"], { root, env: {}, stderr: quiet }), 0);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".pharn/pharn-loop/demo/active.json"), "utf8")).session_id, null);
    assert.equal(stopGuard(payload(), { root, env: {} }), "");
  });
});

test("--open refuses to write through a symlinked state directory", () => {
  withFixture({ marker: false }, (root) => {
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "rlr-out-"));
    fs.mkdirSync(path.join(root, ".pharn"), { recursive: true });
    fs.symlinkSync(elsewhere, path.join(root, ".pharn", "pharn-loop"));
    assert.equal(markerMode(["--open", NAME, "--cap", "3"], { root, env: { CLAUDE_CODE_SESSION_ID: SID }, stderr: quiet }), 2);
    assert.deepEqual(fs.readdirSync(elsewhere), [], "nothing was written through the link");
    fs.rmSync(elsewhere, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------------------------------
// The CLI — spawned the way Claude Code runs it (payload on stdin, cwd = Claude's directory)
// ---------------------------------------------------------------------------------------------------

function cli(cwd, input, env = {}) {
  const clean = { ...process.env };
  delete clean.CLAUDE_PROJECT_DIR;
  delete clean.PHARN_STOP_GUARD_MAX;
  return spawnSync(process.execPath, [HOOK], { cwd, input, encoding: "utf8", env: { ...clean, ...env } });
}

test("CLI: blocks from a SUBDIRECTORY of the project (the root is found by the .git walk), exit 0 with JSON", () => {
  // The CLI judges the marker against the REAL clock (no `now` is injectable across a spawn), so the marker
  // must be dated from the real clock too. Dated from the fixed NOW, this test expired 24 h after NOW — the
  // hook's age ceiling — and failed on every branch from 2026-09-23T12:00Z (changelog-per-pr, R7).
  withFixture({ startedAt: new Date(Date.now() - 60000).toISOString() }, (root) => {
    const sub = path.join(root, "pharn", "features", NAME);
    const r = cli(sub, payload());
    assert.equal(r.status, 0, "the guard never exits non-zero");
    assert.equal(JSON.parse(r.stdout).decision, "block");
  });
});

test("CLI: every failure path exits 0 — a crash can never block (fail-open by construction)", () => {
  withFixture({}, (root) => {
    for (const input of ["", "{ torn", "null", payload({ session_id: 5 })]) {
      const r = cli(root, input);
      assert.equal(r.status, 0, JSON.stringify(input));
      assert.ok(r.stdout.trim() === "" || JSON.parse(r.stdout).decision !== "block", JSON.stringify(input));
    }
  });
});

test("CLI: --open reads CLAUDE_CODE_SESSION_ID, and a bad invocation exits 2", () => {
  withFixture({ marker: false }, (root) => {
    const open = spawnSync(process.execPath, [HOOK, "--open", NAME, "--cap", "3"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CLAUDE_CODE_SESSION_ID: SID },
    });
    assert.equal(open.status, 0, open.stderr);
    assert.equal(JSON.parse(cli(root, payload()).stdout).decision, "block");
    assert.equal(spawnSync(process.execPath, [HOOK, "--close"], { cwd: root, encoding: "utf8" }).status, 2);
    assert.equal(spawnSync(process.execPath, [HOOK, "--close", NAME], { cwd: root, encoding: "utf8" }).status, 0);
    assert.equal(cli(root, payload()).stdout, "");
  });
});

// ---------------------------------------------------------------------------------------------------
// ★ WIRING — /pharn-loop's COMMITTED --open / --close lines, executed (L45)
// ---------------------------------------------------------------------------------------------------

const LOOP_CMD = path.join(__dirname, "..", "commands", "pharn-loop.md");

function pinned(re) {
  const lines = fs
    .readFileSync(LOOP_CMD, "utf8")
    .split(/\r?\n/)
    .filter((l) => re.test(l))
    .map((l) => l.trim());
  assert.equal(lines.length, 1, `expected ONE pinned line matching ${re}, found ${lines.length}`);
  return lines[0];
}

test("★ WIRING — /pharn-loop's pinned --open line guards the run, and its pinned --close line releases it", () => {
  const open = pinned(/^\s*node \.claude\/hooks\/require-loop-record\.cjs --open /);
  const close = pinned(/^\s*node \.claude\/hooks\/require-loop-record\.cjs --close /);
  withFixture({ marker: false }, (root) => {
    fs.mkdirSync(path.join(root, ".claude", "hooks"), { recursive: true });
    fs.copyFileSync(HOOK, path.join(root, ".claude", "hooks", "require-loop-record.cjs"));
    const sub = (line) => {
      const out = line.replaceAll("'<name>'", `'${NAME}'`).replaceAll("<M>", "3");
      assert.doesNotMatch(out, /<[a-z][^>]*>/, `an unsubstituted placeholder remains in: ${out}`);
      return out;
    };
    const sh = (line) =>
      spawnSync("sh", ["-c", sub(line)], { cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_CODE_SESSION_ID: SID } });
    assert.equal(sh(open).status, 0, "the pinned --open line failed");
    assert.equal(JSON.parse(cli(root, payload()).stdout).decision, "block", "an opened run with no record must block");
    fs.writeFileSync(path.join(root, "pharn/features/demo/LOOP.md"), "---\ndecision: INCONCLUSIVE\nblocked: stale-evidence\n---\n");
    assert.equal(cli(root, payload()).stdout, "", "a written record ends the turn");
    fs.unlinkSync(path.join(root, "pharn/features/demo/LOOP.md"));
    assert.equal(sh(close).status, 0, "the pinned --close line failed");
    assert.equal(cli(root, payload()).stdout, "", "a closed run is inert");
  });
});
