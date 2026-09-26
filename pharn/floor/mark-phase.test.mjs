// pharn/floor/mark-phase.test.mjs — hermetic tests for the phase-marker writer.
//
// NON-VACUITY (L34) is a stated obligation here, not an afterthought: several assertions below iterate
// a marker list, and "for each marker, assert P" says NOTHING over an empty list. Every such test first
// asserts the list's LENGTH, so a writer that silently stopped appending fails rather than passing over
// an empty domain.
//
// THE NO-ARGUMENT PATH IS TESTED ON PURPOSE (L41). Every other test passes `--base` explicitly for
// hermeticity — which is exactly the convention that made `render-ship-briefing.mjs`'s duplicated
// default invisible for a whole release line while the suite stayed green. One test therefore runs the
// CLI with no `--base` at all and asserts it lands on `DEFAULT_BASE`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  markPhase,
  countMarkers,
  MARKER_KINDS,
  DEFAULT_BASE,
  PENDING_DIR,
  NO_SESSION_KEY,
  pendingFile,
  writePendingStart,
} from "./mark-phase.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "mark-phase.mjs");

const run = (args, cwd) => {
  try {
    return { status: 0, stdout: execFileSync("node", [CLI, ...args], { cwd, encoding: "utf8" }) };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
};

const lines = (f) =>
  readFileSync(f, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

test("appends N markers with strictly increasing seq, one JSON object per line", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  for (let i = 0; i < 5; i++) markPhase({ name: "feat", kind: "stage-start", stage: "pharn-build", iteration: i + 1, base });
  const got = lines(join(base, "feat", "markers.jsonl"));
  assert.equal(got.length, 5, "NON-VACUITY: the list must be non-empty before per-item assertions mean anything");
  assert.deepEqual(
    got.map((m) => m.seq),
    [1, 2, 3, 4, 5]
  );
  for (const m of got) {
    assert.equal(m.kind, "stage-start");
    assert.equal(m.stage, "pharn-build");
    assert.match(m.ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "millisecond ISO — the reason this is Node and not BSD `date`");
  }
});

test("seq continues across processes — a resumed run does not restart the sequence", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  assert.equal(run(["--name", "feat", "--kind", "run-start", "--base", base]).status, 0);
  assert.equal(run(["--name", "feat", "--kind", "stage-start", "--stage", "pharn-plan", "--base", base]).status, 0);
  assert.equal(run(["--name", "feat", "--kind", "run-stop", "--base", base]).status, 0);
  const got = lines(join(base, "feat", "markers.jsonl"));
  assert.equal(got.length, 3);
  assert.deepEqual(
    got.map((m) => m.seq),
    [1, 2, 3]
  );
});

test("a torn final line is tolerated and not counted — an interrupted append is expected, not an error", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  const dir = join(base, "feat");
  mkdirSync(dir, { recursive: true });
  const f = join(dir, "markers.jsonl");
  writeFileSync(
    f,
    '{"seq":1,"kind":"run-start","stage":null,"iteration":null,"ts":"2026-01-01T00:00:00.000Z","session_id":null}\n{"seq":2,"kind":"sta'
  );
  assert.equal(countMarkers(f), 1, "the torn line is not a marker");
  const m = markPhase({ name: "feat", kind: "run-stop", base });
  assert.equal(m.seq, 2, "the next seq follows the last INTACT marker");
});

test("countMarkers on a missing file is 0, not a throw — the ordinary first-call state", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  assert.equal(countMarkers(join(base, "nope", "markers.jsonl")), 0);
});

test("session_id is captured from the environment and recorded on the marker", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  const env = { ...process.env, CLAUDE_CODE_SESSION_ID: "sess-abc" };
  execFileSync("node", [CLI, "--name", "feat", "--kind", "run-start", "--base", base], { env, encoding: "utf8" });
  const [m] = lines(join(base, "feat", "markers.jsonl"));
  assert.equal(m.session_id, "sess-abc");
});

test("L41 NO-ARGUMENT CONTROL: with no --base the CLI lands on DEFAULT_BASE, the single definition", () => {
  // Every other test passes --base for hermeticity — the exact convention that hid a duplicated default
  // in render-ship-briefing.mjs for a whole release line. This one deliberately does not.
  const cwd = mkdtempSync(join(tmpdir(), "mark-phase-nodefault-"));
  const r = run(["--name", "feat", "--kind", "run-start"], cwd);
  assert.equal(r.status, 0, r.stderr);
  const landed = join(cwd, DEFAULT_BASE, "feat", "markers.jsonl");
  assert.ok(existsSync(landed), `expected the marker at the single default ${DEFAULT_BASE}, found nothing`);
  assert.equal(lines(landed).length, 1);
  rmSync(cwd, { recursive: true, force: true });
});

test("every MARKER_KINDS member is accepted — the enumeration is the deliverable, not one member (L29)", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  assert.ok(MARKER_KINDS.size >= 4, "NON-VACUITY: the enum must be non-empty for this loop to assert anything");
  for (const kind of MARKER_KINDS) {
    const r = run(["--name", "feat", "--kind", kind, "--base", base]);
    assert.equal(r.status, 0, `${kind} should be accepted: ${r.stderr}`);
  }
  assert.equal(lines(join(base, "feat", "markers.jsonl")).length, MARKER_KINDS.size);
});

test("fail-closed on every bad input: nothing is written and the exit is 2", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  const bad = [
    { args: ["--name", "feat", "--kind", "not-a-kind", "--base", base], why: "kind outside the enum" },
    { args: ["--name", "../escape", "--kind", "run-start", "--base", base], why: "a traversing name" },
    { args: ["--name", "feat/sub", "--kind", "run-start", "--base", base], why: "a name with a separator" },
    { args: ["--name", "Feat", "--kind", "run-start", "--base", base], why: "an uppercase name" },
    { args: ["--kind", "run-start", "--base", base], why: "no name at all" },
    { args: ["--name", "feat", "--base", base], why: "no kind at all" },
    { args: ["--name", "feat", "--kind", "run-start", "--iteration", "0", "--base", base], why: "a zero iteration" },
    { args: ["--name", "feat", "--kind", "run-start", "--iteration", "x", "--base", base], why: "a non-numeric iteration" },
    { args: ["--name", "feat", "--kind", "run-start", "--stage", "Bad Stage", "--base", base], why: "a stage with a space" },
    { args: ["--name", "feat", "--kind", "run-start", "--frobnicate", "--base", base], why: "an unknown flag" },
  ];
  assert.ok(bad.length > 0, "NON-VACUITY: the refusal table must be non-empty");
  for (const c of bad) {
    const r = run(c.args);
    assert.equal(r.status, 2, `${c.why} must exit 2`);
  }
  assert.ok(!existsSync(join(base, "feat", "markers.jsonl")), "a refused call must write NOTHING");
});

test("a control character in --name is rejected before any shape regex runs (L14 composition)", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  // A trailing newline is the L14 vector itself: JS `$` without the `m` flag matches BEFORE a single
  // trailing newline, so `/^[a-z0-9-]+$/.test("feat\n")` is TRUE and the shape regex alone would admit
  // it. The control-char guard runs first, which is why this exits 2.
  assert.equal(run(["--name", "feat\n", "--kind", "run-start", "--base", base]).status, 2);
  // A NUL byte never reaches the process at all — Node refuses to build an argv containing one. That is
  // a platform property, not this file's guard, and it is asserted as such rather than being counted as
  // evidence for the guard above.
  assert.throws(
    () => execFileSync("node", [CLI, "--name", "feat\u0000x", "--kind", "run-start", "--base", base], { encoding: "utf8" }),
    /argument|null bytes|ERR_INVALID_ARG_VALUE/i,
    "the platform rejects a NUL in argv before the CLI is reached"
  );
});

test("MUTATION CONTROL: the refusal is real — the same call with a valid kind succeeds", () => {
  // Without this, "bad input exits 2" could pass because the CLI exits 2 on everything.
  const base = mkdtempSync(join(tmpdir(), "mark-phase-"));
  assert.equal(run(["--name", "feat", "--kind", "bogus", "--base", base]).status, 2);
  assert.equal(run(["--name", "feat", "--kind", "run-start", "--base", base]).status, 0);
});

// ---------------------------------------------------------------- the PENDING start (run-window/1)
// The pending start exists so `/pharn-ship` can open its run window BEFORE `/pharn-spec` names the
// feature. Every expectation below is a literal, never a value read back from the module (L43).

const SESS = "00000000-0000-4000-8000-00000000abcd";
const envWith = (sid) => {
  const env = { ...process.env };
  if (sid === null) delete env.CLAUDE_CODE_SESSION_ID;
  else env.CLAUDE_CODE_SESSION_ID = sid;
  return env;
};

test("PENDING: a named run-start in the SAME session adopts the pending ts, marks origin, and consumes the file", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-pending-"));
  writePendingStart({ base, sessionId: SESS, now: new Date("2026-09-21T10:00:00.000Z") });
  const pf = join(base, PENDING_DIR, `${SESS}.json`);
  assert.ok(existsSync(pf), "the pending file must exist before adoption");
  const m = markPhase({
    name: "feat",
    kind: "run-start",
    base,
    sessionId: SESS,
    now: new Date("2026-09-21T10:07:00.000Z"),
    adoptPending: true,
  });
  assert.equal(m.ts, "2026-09-21T10:00:00.000Z", "the marker carries the PENDING moment, not the write moment");
  assert.equal(m.origin, "pending");
  assert.equal(existsSync(pf), false, "adoption consumes the pending file");
  const [onDisk] = lines(join(base, "feat", "markers.jsonl"));
  assert.equal(onDisk.origin, "pending");
  // A SECOND run-start (a new invocation) finds no pending file and is byte-identical to the old shape.
  const m2 = markPhase({
    name: "feat",
    kind: "run-start",
    base,
    sessionId: SESS,
    now: new Date("2026-09-21T11:00:00.000Z"),
    adoptPending: true,
  });
  assert.equal(m2.ts, "2026-09-21T11:00:00.000Z");
  assert.equal("origin" in m2, false);
});

test("PENDING: another session's pending start is NEVER adopted", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-pending-"));
  writePendingStart({ base, sessionId: "00000000-0000-4000-8000-00000000ffff", now: new Date("2026-09-21T09:00:00.000Z") });
  const m = markPhase({
    name: "feat",
    kind: "run-start",
    base,
    sessionId: SESS,
    now: new Date("2026-09-21T10:00:00.000Z"),
    adoptPending: true,
  });
  assert.equal(m.ts, "2026-09-21T10:00:00.000Z");
  assert.equal("origin" in m, false);
});

test("PENDING: only run-start adopts — a stage-start leaves the pending file untouched", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-pending-"));
  writePendingStart({ base, sessionId: SESS, now: new Date("2026-09-21T09:00:00.000Z") });
  const m = markPhase({
    name: "feat",
    kind: "stage-start",
    stage: "pharn-plan",
    base,
    sessionId: SESS,
    now: new Date("2026-09-21T10:00:00.000Z"),
  });
  assert.equal(m.ts, "2026-09-21T10:00:00.000Z");
  assert.ok(existsSync(join(base, PENDING_DIR, `${SESS}.json`)));
});

test("PENDING: a malformed or FUTURE-dated pending file is ignored (degrades to ts = now), never guessed", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-pending-"));
  mkdirSync(join(base, PENDING_DIR), { recursive: true });
  const pf = join(base, PENDING_DIR, `${SESS}.json`);
  for (const body of [
    "{torn",
    JSON.stringify({ ts: "yesterday", session_id: SESS }),
    JSON.stringify({ ts: "2026-09-21T12:00:00.000Z", session_id: SESS }),
  ]) {
    writeFileSync(pf, body);
    const m = markPhase({
      name: "feat",
      kind: "run-start",
      base,
      sessionId: SESS,
      now: new Date("2026-09-21T10:00:00.000Z"),
      adoptPending: true,
    });
    assert.equal(m.ts, "2026-09-21T10:00:00.000Z", `must not adopt ${body}`);
    assert.equal("origin" in m, false);
  }
});

test("PENDING CLI: --pending-start then a named run-start, both through the real CLI, keyed by the env session", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-pending-cli-"));
  const env = envWith(SESS);
  const a = execFileSync("node", [CLI, "--pending-start", "--base", base], { env, encoding: "utf8" });
  assert.match(a, /^pending run-start: \d{4}-/);
  const pts = JSON.parse(readFileSync(join(base, PENDING_DIR, `${SESS}.json`), "utf8")).ts;
  const b = execFileSync("node", [CLI, "--name", "feat", "--kind", "run-start", "--adopt-pending", "--base", base], {
    env,
    encoding: "utf8",
  });
  assert.match(b, /adopted pending start/);
  const [m] = lines(join(base, "feat", "markers.jsonl"));
  assert.equal(m.ts, pts);
  assert.equal(m.session_id, SESS);
});

test("PENDING CLI: with no session id the key is the literal no-session; refuses mixing with marker flags", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-pending-cli-"));
  execFileSync("node", [CLI, "--pending-start", "--base", base], { env: envWith(null), encoding: "utf8" });
  assert.ok(existsSync(join(base, PENDING_DIR, `${NO_SESSION_KEY}.json`)));
  assert.equal(NO_SESSION_KEY, "no-session");
  const r = run(["--pending-start", "--name", "feat", "--base", base]);
  assert.equal(r.status, 2, "--pending-start with --name is a usage error");
  assert.equal(pendingFile(base, "../escape"), null, "a session id that cannot name a file is refused, not rewritten");
});

test("PENDING L41 NO-ARGUMENT CONTROL: with no --base the pending file lands under DEFAULT_BASE", () => {
  const cwd = mkdtempSync(join(tmpdir(), "mark-phase-pending-nodefault-"));
  execFileSync("node", [CLI, "--pending-start"], { cwd, env: envWith(SESS), encoding: "utf8" });
  assert.ok(existsSync(join(cwd, DEFAULT_BASE, PENDING_DIR, `${SESS}.json`)));
  rmSync(cwd, { recursive: true, force: true });
});

test("PENDING is OPT-IN: a run-start WITHOUT --adopt-pending (every /pharn-loop run-start) never adopts, and leaves the file", () => {
  // REVIEW finding 1, probed: an abandoned /pharn-ship's pending start was adopted by a later /pharn-loop
  // run-start in the same session, widening the loop's window back to the ship's moment.
  const base = mkdtempSync(join(tmpdir(), "mark-phase-pending-optin-"));
  writePendingStart({ base, sessionId: SESS, now: new Date("2026-09-21T08:00:00.000Z") });
  const m = markPhase({ name: "loopfeat", kind: "run-start", base, sessionId: SESS, now: new Date("2026-09-21T10:00:00.000Z") });
  assert.equal(m.ts, "2026-09-21T10:00:00.000Z");
  assert.equal("origin" in m, false);
  assert.ok(existsSync(join(base, PENDING_DIR, `${SESS}.json`)), "a non-adopting run-start leaves the pending file alone");
  // Through the real CLI, too — the flag-less form is the loop's pinned invocation.
  const out = execFileSync("node", [CLI, "--name", "loopfeat2", "--kind", "run-start", "--base", base], {
    env: envWith(SESS),
    encoding: "utf8",
  });
  assert.doesNotMatch(out, /adopted/);
  const r = run(["--name", "feat", "--kind", "stage-start", "--stage", "pharn-plan", "--adopt-pending", "--base", base]);
  assert.equal(r.status, 2, "--adopt-pending on a non-run-start kind is a usage error");
});

// ---------------------------------------------------------------- --mode (6.23.0, /pharn-ship --quick)

test("--mode quick is accepted on run-start: recorded on disk and printed", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-mode-"));
  const out = execFileSync("node", [CLI, "--name", "feat", "--kind", "run-start", "--mode", "quick", "--base", base], { encoding: "utf8" });
  assert.match(out, /\(mode quick\)/);
  const [m] = lines(join(base, "feat", "markers.jsonl"));
  assert.equal(m.mode, "quick");
});

test("--mode is refused on every non-run-start kind — exit 2, nothing written (lstat proves it)", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-mode-"));
  for (const kind of [...MARKER_KINDS].filter((k) => k !== "run-start")) {
    const r = run(["--name", "feat", "--kind", kind, "--mode", "quick", "--base", base]);
    assert.equal(r.status, 2, `--mode with --kind ${kind} must be refused`);
  }
  assert.ok(!existsSync(join(base, "feat", "markers.jsonl")), "a refused --mode call must write NOTHING");
});

test("--mode fast (outside MARKER_MODES) is refused on run-start too — exit 2, nothing written", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-mode-"));
  const r = run(["--name", "feat", "--kind", "run-start", "--mode", "fast", "--base", base]);
  assert.equal(r.status, 2);
  assert.ok(!existsSync(join(base, "feat", "markers.jsonl")), "a refused --mode value must write NOTHING");
  // MUTATION CONTROL: the same call with the one accepted value succeeds, so the refusal above is real.
  assert.equal(run(["--name", "feat", "--kind", "run-start", "--mode", "quick", "--base", base]).status, 0);
});

test("--mode absent: the marker carries NO mode key at all — byte-identical to a pre-6.23.0 marker (L41)", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-mode-"));
  markPhase({ name: "feat", kind: "run-start", base });
  const [m] = lines(join(base, "feat", "markers.jsonl"));
  assert.equal("mode" in m, false);
  // And through the real CLI, whose printed line must not claim a mode either.
  const base2 = mkdtempSync(join(tmpdir(), "mark-phase-mode-cli-"));
  const out = execFileSync("node", [CLI, "--name", "feat", "--kind", "run-start", "--base", base2], { encoding: "utf8" });
  assert.doesNotMatch(out, /\(mode /);
});

test("--mode with --adopt-pending: the marker carries BOTH origin: pending and mode: quick", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-mode-pending-"));
  writePendingStart({ base, sessionId: SESS, now: new Date("2026-09-21T10:00:00.000Z") });
  const m = markPhase({
    name: "feat",
    kind: "run-start",
    base,
    sessionId: SESS,
    now: new Date("2026-09-21T10:07:00.000Z"),
    adoptPending: true,
    mode: "quick",
  });
  assert.equal(m.origin, "pending");
  assert.equal(m.mode, "quick");
  assert.equal(m.ts, "2026-09-21T10:00:00.000Z", "the adopted moment still wins, exactly as without --mode");
});

test("--pending-start refuses --mode, exactly as it refuses --name/--kind/--stage/--iteration/--adopt-pending", () => {
  const base = mkdtempSync(join(tmpdir(), "mark-phase-mode-pending-cli-"));
  const r = run(["--pending-start", "--mode", "quick", "--base", base]);
  assert.equal(r.status, 2, "--pending-start with --mode is a usage error");
});
