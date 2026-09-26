// pharn/floor/run-marker.test.mjs — behaviour pins for the /pharn-ship + /pharn-review run-marker writer.
//
// ★ = a case the increment exists for.  ✧ = a PIN (wiring/parity that must not silently drift).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync, utimesSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { RUN_MARKER_COMMANDS, markerPath, openRun, closeRun } from "./run-marker.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const CLI = join(HERE, "run-marker.mjs");
const HOOK = join(REPO, ".claude", "hooks", "enforce-writes-scope.cjs");
const LOOP_HOOK = join(REPO, ".claude", "hooks", "require-loop-record.cjs");

const made = [];
function tmp() {
  const dir = mkdtempSync(join(tmpdir(), "pharn-run-marker-"));
  made.push(dir);
  return dir;
}
process.on("exit", () => {
  for (const d of made) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

function cli(dir, ...args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8" });
}

function hookAllows(dir, filePath) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: filePath } }),
    cwd: dir,
    encoding: "utf8",
  });
  assert.ok(r.status === 0 || r.status === 2, `hook answered neither allow nor deny: ${r.status} ${r.stderr}`);
  return r.status === 0;
}

function seedInstalled(dir) {
  writeFileSync(join(dir, "pharn.config.json"), JSON.stringify({ skillsVersion: "9.9.9" }) + "\n");
  return dir;
}

// ------------------------------------------------------------------------------------------- exports

test("✧ RUN_MARKER_COMMANDS is exactly {pharn-review, pharn-ship} — pharn-loop is deliberately absent", () => {
  assert.deepEqual([...RUN_MARKER_COMMANDS].sort(), ["pharn-review", "pharn-ship"]);
});

test("✧ markerPath() is <root>/.pharn/<command>/<name>/active.json", () => {
  assert.equal(markerPath("/r", "pharn-ship", "demo"), join("/r", ".pharn", "pharn-ship", "demo", "active.json"));
});

// ------------------------------------------------------------------------------------------- openRun / closeRun (JS API)

test("★ openRun writes a well-shaped pharn-run-active/1 marker and closeRun removes it", () => {
  const dir = tmp();
  const r = openRun({ root: dir, command: "pharn-ship", name: "demo", sessionId: "sess-1", now: 1_700_000_000_000 });
  assert.equal(r.ok, true, JSON.stringify(r));
  const marker = JSON.parse(readFileSync(markerPath(dir, "pharn-ship", "demo"), "utf8"));
  assert.equal(marker.schema, "pharn-run-active/1");
  assert.equal(marker.command, "pharn-ship");
  assert.equal(marker.name, "demo");
  assert.equal(marker.session_id, "sess-1");
  assert.equal(marker.started_at, new Date(1_700_000_000_000).toISOString());

  const c = closeRun({ root: dir, command: "pharn-ship", name: "demo" });
  assert.equal(c.ok, true);
  assert.equal(existsSync(markerPath(dir, "pharn-ship", "demo")), false);
});

test("★ session_id falls back to null when omitted or empty — never the string 'undefined'", () => {
  const dir = tmp();
  openRun({ root: dir, command: "pharn-review", name: "demo" });
  assert.equal(JSON.parse(readFileSync(markerPath(dir, "pharn-review", "demo"), "utf8")).session_id, null);
  const dir2 = tmp();
  openRun({ root: dir2, command: "pharn-review", name: "demo", sessionId: "" });
  assert.equal(JSON.parse(readFileSync(markerPath(dir2, "pharn-review", "demo"), "utf8")).session_id, null);
});

test("★ --open OVERWRITES and refreshes the age — a second open on the same name updates started_at", () => {
  const dir = tmp();
  openRun({ root: dir, command: "pharn-ship", name: "demo", now: 1_000 });
  openRun({ root: dir, command: "pharn-ship", name: "demo", now: 2_000_000 });
  const marker = JSON.parse(readFileSync(markerPath(dir, "pharn-ship", "demo"), "utf8"));
  assert.equal(marker.started_at, new Date(2_000_000).toISOString());
});

test("★ --close is IDEMPOTENT — closing an already-absent marker is ok, not a refusal", () => {
  const dir = tmp();
  const r = closeRun({ root: dir, command: "pharn-ship", name: "never-opened" });
  assert.equal(r.ok, true);
});

test("★ REFUSAL: pharn-loop is not a member — that marker has its own owner", () => {
  const dir = tmp();
  const r = openRun({ root: dir, command: "pharn-loop", name: "demo" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /own marker owner/);
  assert.equal(existsSync(join(dir, ".pharn", "pharn-loop")), false, "nothing was written");
});

test("★ REFUSAL: an unknown command is rejected and nothing is written", () => {
  const dir = tmp();
  const r = openRun({ root: dir, command: "pharn-build", name: "demo" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /unknown command/);
});

test("★ REFUSAL: a bad name (uppercase, empty, leading hyphen, too long, path separator) is rejected", () => {
  const dir = tmp();
  for (const bad of ["", "Demo", "-demo", "a".repeat(65), "demo/x", "demo x", "../x"]) {
    const r = openRun({ root: dir, command: "pharn-ship", name: bad });
    assert.equal(r.ok, false, `expected a refusal for name ${JSON.stringify(bad)}`);
    assert.match(r.reason, /invalid name/);
  }
  // a name at exactly the 64-char ceiling is accepted (boundary, not off-by-one)
  const ok = openRun({ root: dir, command: "pharn-ship", name: "a".repeat(64) });
  assert.equal(ok.ok, true);
});

test("★ REFUSAL: a symlink on ANY path component (.pharn, the command dir, the name dir, the marker file itself)", () => {
  // .pharn itself is a symlink
  const dir1 = tmp();
  const realDir = tmp();
  symlinkSync(realDir, join(dir1, ".pharn"));
  assert.equal(openRun({ root: dir1, command: "pharn-ship", name: "demo" }).ok, false);

  // the command directory is a symlink
  const dir2 = tmp();
  mkdirSync(join(dir2, ".pharn"), { recursive: true });
  symlinkSync(realDir, join(dir2, ".pharn", "pharn-ship"));
  assert.equal(openRun({ root: dir2, command: "pharn-ship", name: "demo" }).ok, false);

  // the name directory is a symlink
  const dir3 = tmp();
  mkdirSync(join(dir3, ".pharn", "pharn-ship"), { recursive: true });
  symlinkSync(realDir, join(dir3, ".pharn", "pharn-ship", "demo"));
  assert.equal(openRun({ root: dir3, command: "pharn-ship", name: "demo" }).ok, false);

  // the marker FILE itself is a symlink (pre-existing, from an earlier open elsewhere)
  const dir4 = tmp();
  mkdirSync(join(dir4, ".pharn", "pharn-ship", "demo"), { recursive: true });
  writeFileSync(join(realDir, "elsewhere.json"), "{}");
  symlinkSync(join(realDir, "elsewhere.json"), join(dir4, ".pharn", "pharn-ship", "demo", "active.json"));
  assert.equal(openRun({ root: dir4, command: "pharn-ship", name: "demo" }).ok, false);
  assert.equal(closeRun({ root: dir4, command: "pharn-ship", name: "demo" }).ok, false, "close refuses the same alias");
});

test("openRun() and closeRun() REQUIRE root — no default, so no caller can silently drift onto the wrong tree (L41)", () => {
  assert.equal(openRun({ command: "pharn-ship", name: "demo" }).ok, false);
  assert.equal(openRun({ root: "", command: "pharn-ship", name: "demo" }).ok, false);
  assert.equal(closeRun({ command: "pharn-ship", name: "demo" }).ok, false);
});

// ------------------------------------------------------------------------------------------- CLI

test("★ CLI --open / --close round-trip, exercised as a real subprocess (the shipped invocation form)", () => {
  const dir = tmp();
  const o = cli(dir, "--open", "pharn-review", "demo-run");
  assert.equal(o.status, 0, o.stderr);
  assert.ok(existsSync(markerPath(dir, "pharn-review", "demo-run")));
  const c = cli(dir, "--close", "pharn-review", "demo-run");
  assert.equal(c.status, 0, c.stderr);
  assert.equal(existsSync(markerPath(dir, "pharn-review", "demo-run")), false);
});

test("★ the CLI's default root is the invoking cwd — exercised by a real spawn, not assumed (L41)", () => {
  const dir = tmp();
  cli(dir, "--open", "pharn-ship", "cwd-probe");
  assert.ok(existsSync(join(dir, ".pharn", "pharn-ship", "cwd-probe", "active.json")), "the marker landed under the SPAWN's cwd");
});

test("★ CLI REFUSAL: pharn-loop exits 2 and writes nothing", () => {
  const dir = tmp();
  const r = cli(dir, "--open", "pharn-loop", "demo");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /own marker owner/);
  assert.equal(existsSync(join(dir, ".pharn", "pharn-loop")), false);
});

test("★ CLI REFUSAL: a malformed invocation (missing name, extra argv, unknown mode) exits 2", () => {
  const dir = tmp();
  assert.equal(cli(dir, "--open", "pharn-ship").status, 2);
  assert.equal(cli(dir, "--open", "pharn-ship", "demo", "extra").status, 2);
  assert.equal(cli(dir, "--bogus", "pharn-ship", "demo").status, 2);
  assert.equal(cli(dir).status, 2);
});

// ------------------------------------------------------------------------------------------- ★ non-vacuity: the marker actually flips the real hook's verdict

test("★ NON-VACUITY (L34): opening EACH command's marker flips the install no-scope verdict for src/x.js 0 -> 2, and closing flips it back", () => {
  for (const command of RUN_MARKER_COMMANDS) {
    const dir = seedInstalled(tmp());
    assert.equal(hookAllows(dir, "src/x.js"), true, `${command}: premise — permissive with no run open`);
    assert.equal(openRun({ root: dir, command, name: "probe" }).ok, true);
    assert.equal(hookAllows(dir, "src/x.js"), false, `${command}: an open run must hold today's fail-closed default`);
    assert.equal(closeRun({ root: dir, command, name: "probe" }).ok, true);
    assert.equal(hookAllows(dir, "src/x.js"), true, `${command}: closing must release it`);
  }
});

test("★ the require-loop-record.cjs marker under .pharn/pharn-loop/ ALSO flips the write guard — no third writer needed", () => {
  const dir = seedInstalled(tmp());
  assert.equal(hookAllows(dir, "src/x.js"), true, "premise");
  const open = spawnSync(process.execPath, [LOOP_HOOK, "--open", "probe", "--cap", "3"], { cwd: dir, encoding: "utf8" });
  assert.equal(open.status, 0, open.stderr);
  assert.equal(hookAllows(dir, "src/x.js"), false, "the loop's OWN marker holds the fail-closed default too");
  const close = spawnSync(process.execPath, [LOOP_HOOK, "--close", "probe"], { cwd: dir, encoding: "utf8" });
  assert.equal(close.status, 0, close.stderr);
  assert.equal(hookAllows(dir, "src/x.js"), true, "closing releases it");
});

test("★ a marker under an UNKNOWN state directory is ignored (negative control — the state-dir set is closed)", () => {
  const dir = seedInstalled(tmp());
  mkdirSync(join(dir, ".pharn", "pharn-foo", "demo"), { recursive: true });
  writeFileSync(join(dir, ".pharn", "pharn-foo", "demo", "active.json"), JSON.stringify({ schema: "x" }) + "\n");
  assert.equal(hookAllows(dir, "src/x.js"), true, "an unrecognized state directory must not hold the guard fail-closed");
});

// ------------------------------------------------------------------------------------------- ✧ WIRING: the shipped commands' pinned lines, EXECUTED

const COMMANDS_DIR = join(REPO, ".claude", "commands");

// Return the WHOLE shipped line that carries a match for `re` — exactly one such line must exist — so that
// anything a later edit appends after the pinned text on that line (`|| true`, `; …`) is EXECUTED by the
// tests below rather than silently dropped. The first version returned only the regex match, so an
// appended `|| true` would have turned a failing --open into exit 0 in the command and never here (GATE-2
// review, the P1 minor on pinnedLine). Leading indentation (a list item's code block) is trimmed; nothing
// else is. L45: pin what is EXECUTED, never a line re-typed by hand.
function pinnedLine(file, re) {
  const body = readFileSync(join(COMMANDS_DIR, file), "utf8");
  const lines = body.split("\n").filter((l) => re.test(l));
  assert.equal(lines.length, 1, `${file} must contain exactly one line matching ${re}`);
  return lines[0].trim();
}

// The pinned lines are relative to a REPO checkout ("node pharn/floor/run-marker.mjs …", "node
// .claude/hooks/require-loop-record.cjs …"), because that is where a real command runs them from. These
// tests execute them with `cwd` set to a THROWAWAY sandbox (so the marker lands there, not in this repo's
// own `.pharn/`), so the relative script path is rewritten to this repo's absolute one first — the
// SUBSTITUTED PATH is infrastructure for running the test in isolation; the argv the line passes after the
// script name (--open/--close, the command, the quoted name) is executed completely unedited.
function runShellLine(dir, line) {
  const resolved = line
    .replace("node pharn/floor/run-marker.mjs", `node ${JSON.stringify(CLI)}`)
    .replace("node .claude/hooks/require-loop-record.cjs", `node ${JSON.stringify(LOOP_HOOK)}`);
  return spawnSync("sh", ["-c", resolved], { cwd: dir, encoding: "utf8" });
}

test("✧ WIRING: pharn-ship.md's pinned OPEN line, executed verbatim (with <name> substituted), opens a pharn-ship marker", () => {
  const line = pinnedLine("pharn-ship.md", /node pharn\/floor\/run-marker\.mjs --open pharn-ship '<name>'/).replace("<name>", "demo-run");
  const dir = tmp();
  const r = runShellLine(dir, line);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(markerPath(dir, "pharn-ship", "demo-run")), "the pinned open line must create the marker");
});

test("✧ WIRING: pharn-ship.md's pinned CLOSE line, executed verbatim, removes it", () => {
  const openLine = pinnedLine("pharn-ship.md", /node pharn\/floor\/run-marker\.mjs --open pharn-ship '<name>'/).replace(
    "<name>",
    "demo-run"
  );
  const closeLine = pinnedLine("pharn-ship.md", /node pharn\/floor\/run-marker\.mjs --close pharn-ship '<name>'/).replace(
    "<name>",
    "demo-run"
  );
  const dir = tmp();
  runShellLine(dir, openLine);
  assert.ok(existsSync(markerPath(dir, "pharn-ship", "demo-run")));
  const r = runShellLine(dir, closeLine);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(markerPath(dir, "pharn-ship", "demo-run")), false);
});

test("✧ WIRING: pharn-ship's OPEN line sits AFTER the GATE-1 backstop and BEFORE /pharn-plan's stage-start marker", () => {
  const body = readFileSync(join(COMMANDS_DIR, "pharn-ship.md"), "utf8");
  const backstop = body.indexOf("node pharn/floor/check-spec-approved.mjs pharn/features/<name>/SPEC.md");
  const open = body.indexOf("node pharn/floor/run-marker.mjs --open pharn-ship '<name>'");
  const planStart = body.indexOf("node pharn/floor/mark-phase.mjs --name '<name>' --kind stage-start --stage pharn-plan");
  assert.ok(backstop >= 0 && open >= 0 && planStart >= 0, "all three anchors must exist in pharn-ship.md");
  assert.ok(backstop < open, "the open must come after the GATE-1 backstop");
  assert.ok(open < planStart, "the open must come before /pharn-plan's stage-start marker");
});

test("✧ WIRING: pharn-ship's CLOSE line sits directly after Step 3a's run-stop marker", () => {
  const body = readFileSync(join(COMMANDS_DIR, "pharn-ship.md"), "utf8");
  const runStop = body.indexOf("node pharn/floor/mark-phase.mjs --name '<name>' --kind run-stop");
  const close = body.indexOf("node pharn/floor/run-marker.mjs --close pharn-ship '<name>'");
  assert.ok(runStop >= 0 && close >= 0, "both anchors must exist");
  assert.ok(runStop < close, "the close must come after Step 3a's run-stop marker");
  assert.ok(close - runStop < 400, "the close must sit DIRECTLY after run-stop, not merely somewhere later");
});

test("✧ WIRING: pharn-review.md's pinned OPEN line, executed verbatim, opens a pharn-review marker", () => {
  const line = pinnedLine("pharn-review.md", /node pharn\/floor\/run-marker\.mjs --open pharn-review '<name>'/).replace(
    "<name>",
    "demo-run"
  );
  const dir = tmp();
  const r = runShellLine(dir, line);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(markerPath(dir, "pharn-review", "demo-run")));
});

test("✧ WIRING: pharn-review.md's pinned CLOSE line (Step 7), executed verbatim, removes it", () => {
  const openLine = pinnedLine("pharn-review.md", /node pharn\/floor\/run-marker\.mjs --open pharn-review '<name>'/).replace(
    "<name>",
    "demo-run"
  );
  const closeLine = pinnedLine("pharn-review.md", /node pharn\/floor\/run-marker\.mjs --close pharn-review '<name>'/).replace(
    "<name>",
    "demo-run"
  );
  const dir = tmp();
  runShellLine(dir, openLine);
  const r = runShellLine(dir, closeLine);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(markerPath(dir, "pharn-review", "demo-run")), false);
});

test("✧ WIRING: pharn-review's OPEN line sits after Step 1b and before Step 3; a new '## Step 7 — Close the run' exists", () => {
  const body = readFileSync(join(COMMANDS_DIR, "pharn-review.md"), "utf8");
  const step1b = body.indexOf("## Step 1b");
  const open = body.indexOf("node pharn/floor/run-marker.mjs --open pharn-review '<name>'");
  const step3 = body.indexOf("## Step 3 —");
  const step7 = body.indexOf("## Step 7 — Close the run");
  assert.ok(step1b >= 0 && open >= 0 && step3 >= 0 && step7 > 0, "all anchors must exist");
  assert.ok(step1b < open && open < step3, "the open must sit between Step 1b and Step 3");
  assert.ok(step7 > step3, "Step 7 must follow Step 3 (it is the last procedure step)");
});

test("✧ WIRING: no command OTHER than pharn-ship.md / pharn-review.md invokes run-marker.mjs (closed over the corpus)", () => {
  const files = readFileSync(join(COMMANDS_DIR, "pharn-loop.md"), "utf8"); // control: the loop keeps its OWN marker
  assert.doesNotMatch(files, /run-marker\.mjs/, "pharn-loop.md must not invoke run-marker.mjs — it keeps require-loop-record.cjs");
  const all = [
    "pharn-spec.md",
    "pharn-plan.md",
    "pharn-grill.md",
    "pharn-test.md",
    "pharn-build.md",
    "pharn-regress.md",
    "pharn-verify.md",
    "pharn-memory-promote.md",
  ];
  for (const f of all) {
    assert.doesNotMatch(readFileSync(join(COMMANDS_DIR, f), "utf8"), /run-marker\.mjs/, `${f} must not invoke run-marker.mjs`);
  }
});

test("✧ WIRING: pharn-loop.md's existing --open/--close lines still work unchanged (the loop's marker writer is untouched)", () => {
  const openLine = pinnedLine("pharn-loop.md", /node \.claude\/hooks\/require-loop-record\.cjs --open '<name>' --cap <M>/)
    .replace("<name>", "demo-run")
    .replace("<M>", "3");
  const closeLine = pinnedLine("pharn-loop.md", /node \.claude\/hooks\/require-loop-record\.cjs --close '<name>'/).replace(
    "<name>",
    "demo-run"
  );
  const dir = tmp();
  mkdirSync(join(dir, "pharn", "features", "demo-run"), { recursive: true });
  const o = runShellLine(dir, openLine);
  assert.equal(o.status, 0, o.stderr);
  assert.ok(existsSync(join(dir, ".pharn", "pharn-loop", "demo-run", "active.json")));
  const c = runShellLine(dir, closeLine);
  assert.equal(c.status, 0, c.stderr);
  assert.equal(existsSync(join(dir, ".pharn", "pharn-loop", "demo-run", "active.json")), false);
});

// ------------------------------------------------------------------------------------------- age / staleness (via the real hook, since run-marker.mjs never reads age itself)

test("★ an aged marker (utimesSync) past 24h no longer holds the install default fail-closed", () => {
  const dir = seedInstalled(tmp());
  openRun({ root: dir, command: "pharn-ship", name: "stale" });
  const p = markerPath(dir, "pharn-ship", "stale");
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
  utimesSync(p, old, old);
  assert.equal(hookAllows(dir, "src/x.js"), true, "a marker older than 24h must be ignored");
});

test("★ a marker aged 23h still counts (inside the ceiling)", () => {
  const dir = seedInstalled(tmp());
  openRun({ root: dir, command: "pharn-ship", name: "fresh" });
  const p = markerPath(dir, "pharn-ship", "fresh");
  const recent = new Date(Date.now() - 23 * 60 * 60 * 1000);
  utimesSync(p, recent, recent);
  assert.equal(hookAllows(dir, "src/x.js"), false, "a marker 23h old must still hold the fail-closed default");
});

// ------------------------------------------------------------------------------------------- ★ S1 (GATE-2 review): a planted file is a refusal, never a crash

// Every place a FILE can stand where the writer needs a directory. The Write tool can create each of these
// in an installed project (.pharn/** is always writable), which is what made them reachable.
const PLANTS = [
  { at: [".pharn"], command: "pharn-review", label: ".pharn itself" },
  { at: [".pharn", "pharn-review"], command: "pharn-review", label: ".pharn/pharn-review" },
  { at: [".pharn", "pharn-ship"], command: "pharn-ship", label: ".pharn/pharn-ship" },
  { at: [".pharn", "pharn-review", "feat"], command: "pharn-review", label: ".pharn/pharn-review/feat" },
];

function plant(dir, at) {
  mkdirSync(join(dir, ...at.slice(0, -1)), { recursive: true });
  writeFileSync(join(dir, ...at), "planted\n");
}

test("★ S1: openRun() RETURNS a refusal for every planted file — it never throws", () => {
  for (const { at, command, label } of PLANTS) {
    const dir = tmp();
    plant(dir, at);
    let r;
    assert.doesNotThrow(() => {
      r = openRun({ root: dir, command, name: "feat" });
    }, label);
    assert.equal(r.ok, false, label);
    assert.match(r.reason, /^cannot write \.pharn\/pharn-(review|ship)\/feat\/active\.json \([A-Z0-9_]+\)/, label);
  }
});

test("★ S1: the CLI exits 2 — never 1, never a stack trace — for every planted file", () => {
  for (const { at, command, label } of PLANTS) {
    const dir = tmp();
    plant(dir, at);
    const r = cli(dir, "--open", command, "feat");
    assert.equal(r.status, 2, `${label}: ${r.stderr}`);
    assert.match(r.stderr, /^run-marker: cannot write /, label);
    assert.doesNotMatch(r.stderr, /\n\s+at |node:fs/, `${label}: no raw stack trace`);
  }
});

test("★ S1: --close under a planted file is a refusal (exit 2), not a crash", () => {
  const dir = tmp();
  plant(dir, [".pharn", "pharn-review"]);
  const r = cli(dir, "--close", "pharn-review", "feat");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /^run-marker: cannot remove /);
});

test("★ S1: the planted file that makes --open refuse ALSO makes the guard read the tree as run-open (install, no scope)", () => {
  const dir = seedInstalled(tmp());
  plant(dir, [".pharn", "pharn-review"]);
  assert.equal(cli(dir, "--open", "pharn-review", "feat").status, 2);
  assert.equal(hookAllows(dir, "src/x.js"), false, "a file where the state directory belongs is a scan error, i.e. fail-closed");
});

// ------------------------------------------------------------------------------------------- ✧ WIRING: a failed --open STOPS the command — EXECUTED

// The command-side half of S1: both commands branch on the --open exit and STOP on non-zero. The pinned
// line is EXECUTED here against a planted regular file, so the test proves the exit the STOP branch reads
// is really non-zero; command-hygiene.test.mjs pins that the STOP sentence sits between the open line and
// the next step. Neither proves a run obeyed the branch (P0).
for (const { file, command, next } of [
  {
    file: "pharn-ship.md",
    command: "pharn-ship",
    next: "node pharn/floor/mark-phase.mjs --name '<name>' --kind stage-start --stage pharn-plan",
  },
  { file: "pharn-review.md", command: "pharn-review", next: "## Step 3 —" },
]) {
  test(`✧ WIRING: ${file}'s pinned OPEN line, executed against a FILE planted at .pharn/${command}, exits non-zero`, () => {
    const line = pinnedLine(file, new RegExp(`node pharn/floor/run-marker\\.mjs --open ${command} '<name>'`)).replace("<name>", "demo-run");
    const dir = tmp();
    plant(dir, [".pharn", command]);
    const r = runShellLine(dir, line);
    assert.notEqual(r.status, 0, `the line the STOP branch reads must fail here: ${r.stdout}${r.stderr}`);
    assert.equal(r.status, 2);
  });

  test(`✧ WIRING: ${file} STOPS on a non-zero --open, and says so between the open line and the next step`, () => {
    const body = readFileSync(join(COMMANDS_DIR, file), "utf8");
    const open = body.indexOf(`node pharn/floor/run-marker.mjs --open ${command} '<name>'`);
    const stop = body.indexOf("**Non-zero → STOP**", open);
    const nextAt = body.indexOf(next, open);
    assert.ok(open >= 0 && nextAt > open, "anchors");
    assert.ok(stop > open && stop < nextAt, "the STOP branch must follow the open line, before the next step");
  });
}

// ------------------------------------------------------------------------------------------- ✧ WIRING: /pharn-loop's run-state lines STOP on a planted file — EXECUTED (re-review R2)

// The loop's marker writer is require-loop-record.cjs, a human-only hook left unchanged: a FILE planted at
// .pharn/pharn-loop/<name> makes it exit 1 with a stack trace. So the command STOPs (S9) on ANY non-zero exit
// of its Step 1a snapshot line and of its --open line. Both lines are EXECUTED here, whole, in a git sandbox —
// a control run with nothing planted must succeed, so a failure below is the plant's — against a FILE at each
// of the three places the Write tool can put one. Neither proves a run obeyed the branch (P0).
const LOOP_SNAPSHOT_RE =
  /mkdir -p \.pharn\/pharn-loop\/<name> && git status --porcelain -uall > \.pharn\/pharn-loop\/<name>\/pre-run-status\.txt/;
const LOOP_OPEN_RE = /node \.claude\/hooks\/require-loop-record\.cjs --open '<name>' --cap <M>/;
const LOOP_PLANTS = [[".pharn"], [".pharn", "pharn-loop"], [".pharn", "pharn-loop", "demo-run"]];

function gitSandbox() {
  const dir = tmp();
  const r = spawnSync("git", ["init", "-q"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  mkdirSync(join(dir, "pharn", "features", "demo-run"), { recursive: true });
  return dir;
}

function loopLines() {
  return {
    snap: pinnedLine("pharn-loop.md", LOOP_SNAPSHOT_RE).replaceAll("<name>", "demo-run"),
    open: pinnedLine("pharn-loop.md", LOOP_OPEN_RE).replace("<name>", "demo-run").replace("<M>", "3"),
  };
}

test("✧ WIRING (R2): pharn-loop.md's pinned snapshot and --open lines, executed with NOTHING planted, succeed (control)", () => {
  const { snap, open } = loopLines();
  const dir = gitSandbox();
  const s = runShellLine(dir, snap);
  assert.equal(s.status, 0, s.stderr);
  const o = runShellLine(dir, open);
  assert.equal(o.status, 0, o.stderr);
});

for (const at of LOOP_PLANTS) {
  test(`✧ WIRING (R2): with a FILE planted at ${at.join("/")}, pharn-loop.md's snapshot line AND its --open line both exit non-zero`, () => {
    const { snap, open } = loopLines();
    const dir = gitSandbox();
    plant(dir, at);
    assert.notEqual(runShellLine(dir, snap).status, 0, "the snapshot line the STOP branch reads must fail here");
    assert.notEqual(runShellLine(dir, open).status, 0, "the --open line the STOP branch reads must fail here");
  });
}

test("✧ WIRING (R2): pharn-loop.md STOPs as S9 after EACH of the two lines, before the next step, and says why S9", () => {
  const body = readFileSync(join(COMMANDS_DIR, "pharn-loop.md"), "utf8");
  const snapAt = body.search(LOOP_SNAPSHOT_RE);
  const openAt = body.search(LOOP_OPEN_RE);
  const ledgerAt = body.indexOf("node pharn/floor/mark-phase.mjs --name '<name>' --kind run-start");
  assert.ok(snapAt >= 0 && snapAt < openAt && openAt < ledgerAt, "anchors, in order");
  const stop1 = body.indexOf("**Non-zero → STOP**", snapAt);
  const stop2 = body.indexOf("**Non-zero → STOP**", openAt);
  assert.ok(stop1 > snapAt && stop1 < openAt, "a STOP between the snapshot line and the --open line");
  assert.ok(stop2 > openAt && stop2 < ledgerAt, "a STOP between the --open line and the cost-ledger step");
  for (const at of [stop1, stop2]) assert.match(body.slice(at, at + 200), /\bS9\b[\s\S]*`blocked: stage-refused`/);
  assert.match(body, /\*\*Why Step 1a's snapshot and `--open` lines stop as S9/);
});

test("✧ pinnedLine() executes the WHOLE line — an appended `|| true` would be caught (mutation control)", () => {
  const dir = tmp();
  plant(dir, [".pharn", "pharn-review"]);
  const line = pinnedLine("pharn-review.md", /node pharn\/floor\/run-marker\.mjs --open pharn-review '<name>'/).replace(
    "<name>",
    "demo-run"
  );
  assert.equal(runShellLine(dir, line).status, 2, "premise: the shipped line fails here");
  assert.equal(
    runShellLine(dir, `${line} || true`).status,
    0,
    "a suffix on the same line changes the exit — which is why the whole line is executed"
  );
});
