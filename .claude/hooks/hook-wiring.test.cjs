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
