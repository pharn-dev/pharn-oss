// .claude/hooks/hook-wiring.test.cjs — executes the REAL guard wiring in .claude/settings.json.
//
// WHY THIS FILE EXISTS (hook-cwd-anchoring). Every other hook suite spawns a hook by ABSOLUTE script path,
// which is not how Claude Code runs it. Claude Code runs the `command` STRING from settings.json, in
// Claude's CURRENT directory. The relative form `node .claude/hooks/<guard>.cjs` therefore could not start
// after a persisted `cd` into a subdirectory: node exits 1 (`Cannot find module`), which Claude Code treats
// as a non-blocking error, so BOTH guards were silently off. protect-trusted-paths.test.cjs's "cwd is a
// SUBDIRECTORY" test stayed green through all of it, because it never exercised the command string
// (lessons-learned L41: a default every test overrides is exercised by nothing). These tests run the
// committed strings themselves, and a negative control proves they can tell the fix from the defect (L40).
//
// BOUND (P0): the strings run under `sh -c` with the placeholder substituted as text, which is the
// documented macOS/Linux shape. Git Bash and PowerShell are executed by no test, and nothing here proves
// that Claude Code performs the substitution — only that the committed strings are the anchored ones, and
// that those strings start from a subdirectory when it does.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const { join } = require("node:path");

const REPO = fs.realpathSync(join(__dirname, "..", ".."));
const MATCHER = "Write|Edit|MultiEdit|NotebookEdit";
const PLACEHOLDER = "${CLAUDE_PROJECT_DIR}";
const SUBDIR = join(REPO, "pharn", "pharn-core");

// The closed set, pinned as WHOLE strings (L36): a variant spelling of either command fails the equality
// below, where a presence test for the placeholder would not.
const GUARDS = ["protect-trusted-paths.cjs", "enforce-writes-scope.cjs"];
const ANCHORED = GUARDS.map((g) => `node "${PLACEHOLDER}"/.claude/hooks/${g}`);
const RELATIVE = GUARDS.map((g) => `node .claude/hooks/${g}`);

// One payload per guard that the guard denies WHATEVER writes-scope is live, so a scope another stage set
// concurrently cannot move the verdict: a trusted doc for fix #2, a path outside every tree for fix #7.
const PAYLOAD = {
  "protect-trusted-paths.cjs": { tool_name: "Edit", tool_input: { file_path: join(REPO, "LIMITS.md") } },
  "enforce-writes-scope.cjs": { tool_name: "Write", tool_input: { file_path: join(os.tmpdir(), "pharn-wiring-probe.md") } },
};

function wiredCommands() {
  const settings = JSON.parse(fs.readFileSync(join(REPO, ".claude", "settings.json"), "utf8"));
  const groups = (settings.hooks && settings.hooks.PreToolUse) || [];
  return groups
    .filter((g) => g && g.matcher === MATCHER)
    .flatMap((g) => (Array.isArray(g.hooks) ? g.hooks : []))
    .filter((h) => h && h.type === "command")
    .map((h) => h.command);
}

// As documented: the placeholder is substituted as text, AND exported as an environment variable.
function runAsClaudeCodeWould(command, cwd, payload) {
  return spawnSync("/bin/sh", ["-c", command.split(PLACEHOLDER).join(REPO)], {
    cwd,
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: REPO },
  });
}

test("✧ the Write|Edit|MultiEdit|NotebookEdit matcher wires EXACTLY the two anchored guard commands", () => {
  assert.deepEqual(
    wiredCommands(),
    ANCHORED,
    "settings.json must wire both guards through the CLAUDE_PROJECT_DIR placeholder, in this order, and nothing else"
  );
});

test("precondition: the subdirectory these tests start the guards from exists", () => {
  assert.ok(fs.statSync(SUBDIR).isDirectory(), `${SUBDIR} must exist for the subdirectory cases to mean anything`);
});

for (let i = 0; i < GUARDS.length; i++) {
  const guard = GUARDS[i];

  test(`✧ ${guard}: the anchored command STARTS and denies when Claude's cwd is a subdirectory`, (t) => {
    if (process.platform === "win32") return t.skip("sh -c is the macOS/Linux shape");
    const r = runAsClaudeCodeWould(ANCHORED[i], SUBDIR, PAYLOAD[guard]);
    assert.equal(r.status, 2, `expected a denial, got exit ${r.status}: ${r.stderr}`);
  });

  test(`✧ NEGATIVE CONTROL: the old relative ${guard} command does NOT start from that subdirectory`, (t) => {
    if (process.platform === "win32") return t.skip("sh -c is the macOS/Linux shape");
    const r = runAsClaudeCodeWould(RELATIVE[i], SUBDIR, PAYLOAD[guard]);
    assert.ok(r.status !== 0 && r.status !== 2, `the relative form must fail to start here (the defect), got exit ${r.status}`);
    assert.match(r.stderr, /Cannot find module/);
  });

  test(`${guard}: the anchored command denies from the repo root too (control)`, (t) => {
    if (process.platform === "win32") return t.skip("sh -c is the macOS/Linux shape");
    assert.equal(runAsClaudeCodeWould(ANCHORED[i], REPO, PAYLOAD[guard]).status, 2);
  });
}

// ---------------------------------------------------------------------------------------------------
// The STOP guard's wiring — a SECOND shape, kept apart from the PreToolUse reader above rather than
// widening it: matcher-less (Stop has no matcher support), EXEC form (`command` + `args`, no shell), and an
// explicit small timeout so a stalled guard cannot sit on every turn end for the 600 s default.
//
// settings.json is protected (fix #2), so a HUMAN applies this entry
// (.dev/features/loop-stop-guard/settings-patch/APPLY.md). Until then the committed file has no Stop event,
// and the first test says so on its diagnostic channel instead of failing. The moment it is wired, the
// same test binds it to exactly this entry. The staged entry itself is EXECUTED below either way (L45).
// ---------------------------------------------------------------------------------------------------

const STOP_ENTRY = Object.freeze({
  type: "command",
  command: "node",
  args: Object.freeze([`${PLACEHOLDER}/.claude/hooks/require-loop-record.cjs`]),
  timeout: 10,
});
const APPLY = join(REPO, ".dev", "features", "loop-stop-guard", "settings-patch", "APPLY.md");

test("✧ the Stop event is either NOT YET WIRED (a human applies it) or wired EXACTLY as the staged entry", (t) => {
  const settings = JSON.parse(fs.readFileSync(join(REPO, ".claude", "settings.json"), "utf8"));
  const stop = settings.hooks && settings.hooks.Stop;
  if (stop === undefined) {
    t.diagnostic("Stop guard NOT WIRED in .claude/settings.json — inert until a human applies settings-patch/APPLY.md");
    return;
  }
  assert.deepEqual(
    JSON.parse(JSON.stringify(stop)),
    [{ hooks: [JSON.parse(JSON.stringify(STOP_ENTRY))] }],
    "the wired Stop entry must be exactly the staged one — matcher-less, exec form, timeout 10"
  );
});

test("✧ the staged APPLY.md carries this exact entry (the patch and the test cannot drift apart)", () => {
  const text = fs.readFileSync(APPLY, "utf8");
  assert.ok(text.includes(JSON.stringify(STOP_ENTRY)), "APPLY.md must contain the entry verbatim as one JSON line");
});

/** A throwaway project with the guard, an open run for SESSION, and a feature directory with no record. */
function stopFixture() {
  const root = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), "wiring-stop-")));
  fs.mkdirSync(join(root, ".git"));
  fs.mkdirSync(join(root, ".claude", "hooks"), { recursive: true });
  fs.copyFileSync(join(REPO, ".claude", "hooks", "require-loop-record.cjs"), join(root, ".claude", "hooks", "require-loop-record.cjs"));
  fs.mkdirSync(join(root, ".pharn", "pharn-loop", "demo"), { recursive: true });
  fs.writeFileSync(
    join(root, ".pharn", "pharn-loop", "demo", "active.json"),
    JSON.stringify({
      schema: "pharn-loop-active/1",
      name: "demo",
      session_id: "wiring-session",
      started_at: new Date().toISOString(),
      cap: 3,
    })
  );
  fs.mkdirSync(join(root, "pharn", "features", "demo", "sub"), { recursive: true });
  return root;
}

function runExecForm(entry, root, cwd) {
  const argv = entry.args.map((a) => a.split(PLACEHOLDER).join(root));
  return spawnSync(entry.command === "node" ? process.execPath : entry.command, argv, {
    cwd,
    input: JSON.stringify({ session_id: "wiring-session", permission_mode: "default", hook_event_name: "Stop", stop_hook_active: false }),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  });
}

test("✧ the staged Stop entry STARTS in exec form from a SUBDIRECTORY and blocks an open, record-less run", (t) => {
  if (process.platform === "win32") return t.skip("POSIX fixture");
  const root = stopFixture();
  try {
    const r = runExecForm(STOP_ENTRY, root, join(root, "pharn", "features", "demo", "sub"));
    assert.equal(r.status, 0, `the guard must exit 0, got ${r.status}: ${r.stderr}`);
    assert.equal(JSON.parse(r.stdout).decision, "block");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("✧ NEGATIVE CONTROL: a mistyped (relative) path does NOT start from that subdirectory — the test can tell them apart (L40)", (t) => {
  if (process.platform === "win32") return t.skip("POSIX fixture");
  const root = stopFixture();
  try {
    const typo = { ...STOP_ENTRY, args: ["./.claude/hooks/require-loop-record.cjs"] };
    const r = runExecForm(typo, root, join(root, "pharn", "features", "demo", "sub"));
    assert.ok(r.status !== 0, "a mistyped path must fail to start (the silent-disable class)");
    assert.match(r.stderr, /Cannot find module/);
    assert.equal(r.stdout.trim(), "", "and it blocks nothing — which is why the anchored form matters");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
