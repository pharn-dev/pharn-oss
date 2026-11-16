// pharn/floor/stage-gate-reap.test.mjs — a runner killed during its FIRST gate, then the resume line: no two gates overlap.
//
// The state is unreachable without a crashed runner, so the crash is real (L41): the REAL stage-direct.mjs, the REAL stage
// scripts and the REAL run-gates.mjs, copied whole into a scratch project (L81), and a SIGKILL of the runner's process
// group while its first gate runs. run-gates starts every gate in its OWN process group, so the gate survives the kill.
// The takeover then re-runs the FRESH argv, and each stage script's fresh start deletes its gate directory — before 7.15.1
// that deleted `lock.child` too, so run-gates' `init` reap (PR #443) saw no record and the replacement gate ran beside
// the survivor. Each gate appends {pid, overlapping} to a log the test reads: `overlapping` is the pids of the earlier
// gates still alive when it started.
//
// Waits are event-driven with wide ceilings (the full suite runs these beside every other test).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STATE_FILE } from "./stage-direct-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !["NODE_TEST_CONTEXT", "CLAUDE_PROJECT_DIR", "CLAUDE_CODE_SESSION_ID"].includes(k))
);
const notTest = (src) => !/\.test\.[cm]?js$/.test(src);

// The gate: log this start, then sleep if it is the first one (the gate the kill orphans), else pass at once.
const GATE = `const fs = require("fs");
const log = process.env.GATE_LOG;
if (!log) process.exit(0);
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const prior = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
fs.appendFileSync(log, JSON.stringify({ pid: process.pid, overlapping: prior.map((p) => p.pid).filter(alive) }) + "\\n");
if (prior.length === 0) setTimeout(() => {}, 600000);
`;

/** A git project with the whole floor and hooks, both thin-caller commands, an approved SPEC/PLAN for `demo`, the gate,
 *  one base commit, the plan-scope setter + reconcile anchor (so verify's reconcile gate has an epoch), then the build's
 *  edit to the declared file. */
function project() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "stage-gate-reap-")));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), "pharn/.run/\n");
  writeFileSync(join(dir, "package.json"), `${JSON.stringify({ name: "fx", version: "1.0.0" })}\n`);
  writeFileSync(join(dir, "gate.cjs"), GATE);
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "index.js"), "export const add = (a, b) => a + b;\n");
  cpSync(HERE, join(dir, "pharn", "floor"), { recursive: true, filter: notTest });
  cpSync(join(REPO, ".claude", "hooks"), join(dir, ".claude", "hooks"), { recursive: true, filter: notTest });
  mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
  for (const c of ["pharn-verify.md", "pharn-regress.md"])
    cpSync(join(REPO, ".claude", "commands", c), join(dir, ".claude", "commands", c));
  const feat = join(dir, "pharn", "features", "demo");
  mkdirSync(feat, { recursive: true });
  const body = "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n";
  const hash = createHash("sha256").update(body).digest("hex");
  writeFileSync(join(feat, "SPEC.md"), `---\nspec_id: demo\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`);
  writeFileSync(
    join(feat, "PLAN.md"),
    `---\nspec_id: demo\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — the feature\n`
  );
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  const node = (args) => spawnSync(process.execPath, args, { cwd: dir, encoding: "utf8", env: ENV });
  const set = node([".claude/hooks/set-writes-scope.cjs", "--from-plan", "pharn/features/demo/PLAN.md"]);
  assert.equal(set.status, 0, `fixture setter: ${set.stdout}${set.stderr}`);
  const anc = node(["pharn/floor/reconcile-baseline.mjs", "--anchor", "--by", "test"]);
  assert.equal(anc.status, 0, `fixture anchor: ${anc.stdout}${anc.stderr}`);
  writeFileSync(join(dir, "src", "index.js"), "export const add = (a, b) => a + b;\nexport const id = (x) => x;\n");
  return { dir, base, log: join(dir, "pharn", ".run", "gate-test", "log.jsonl") };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(cond, why, ms = 120_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(50)) if (cond()) return;
  assert.fail(`timed out waiting for: ${why}`);
}
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
/** Does process group `pgid` have a live, non-zombie member? */
function groupLive(pgid) {
  const r = spawnSync("ps", ["-A", "-o", "pgid=,stat="], { encoding: "utf8", maxBuffer: 1 << 26 });
  return r.stdout.split("\n").some((row) => {
    const [pg, stat] = row.trim().split(/\s+/);
    return Number(pg) === pgid && stat && !stat.startsWith("Z");
  });
}
function killGroup(pgid) {
  try {
    process.kill(-pgid, "SIGKILL");
  } catch {
    // already gone
  }
}
const readLog = (log) =>
  existsSync(log)
    ? readFileSync(log, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];

/**
 * Start the fresh line in the background, SIGKILL the runner's group once the first gate runs and has its `lock.child`,
 * run the resume line, and return what each gate logged. `childRel` is the first gate's sidecar.
 */
async function killDuringFirstGateThenResume({ dir, log }, stage, extra, childRel) {
  const env = { ...ENV, GATE_LOG: log };
  mkdirSync(dirname(log), { recursive: true });
  const cli = join(dir, "pharn", "floor", "stage-direct.mjs");
  const fresh = ["--stage", stage, "--name", "demo", "--iteration", "1", "--timeout-ms", "60000", "--budget-ms", "300000", ...extra];
  const first = spawn(process.execPath, [cli, ...fresh], { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });
  let firstErr = "";
  first.stderr.on("data", (d) => (firstErr += d));
  first.stdout.resume();
  const firstDone = new Promise((res) => first.on("close", (status) => res(status)));
  let orphan = null;
  try {
    await until(
      () => readLog(log).length === 1 && existsSync(join(dir, childRel)) && existsSync(join(dir, STATE_FILE)),
      `${stage}: the first gate running with its lock.child`
    );
    orphan = readLog(log)[0].pid;
    const pgid = JSON.parse(readFileSync(join(dir, STATE_FILE), "utf8")).runner_pid;
    killGroup(pgid);
    await until(() => !groupLive(pgid), `${stage}: the runner's group ${pgid} gone`);
    assert.ok(alive(orphan), `${stage} fixture: the runner's SIGKILL must leave its first gate running — the orphan`);
    assert.equal(await firstDone, 5, `${stage}: the waiting call defers once its runner is gone\n${firstErr}`);
    const resume = spawnSync(process.execPath, [cli, "--stage", stage, "--name", "demo", "--resume", "--budget-ms", "300000"], {
      cwd: dir,
      env,
      encoding: "utf8",
      timeout: 360_000,
    });
    return { resume, orphan, gates: readLog(log) };
  } finally {
    if (orphan !== null) killGroup(orphan);
    first.kill("SIGKILL");
  }
}

function assertNoOverlap(stage, { resume, orphan, gates }, minGates) {
  assert.match(resume.stderr, new RegExp(`took over ${stage} for demo \\(fresh\\)`), `${stage}: the takeover re-ran the fresh argv`);
  assert.equal(alive(orphan), false, `${stage}: the orphaned first gate was still running after the takeover`);
  assert.ok(gates.length >= minGates, `${stage}: expected at least ${minGates} gate starts, got ${JSON.stringify(gates)}`);
  for (const [i, g] of gates.entries()) {
    assert.deepEqual(
      g.overlapping,
      [],
      `${stage}: gate start ${i} (pid ${g.pid}) ran beside earlier gates ${JSON.stringify(g.overlapping)}`
    );
  }
  assert.equal(resume.status, 0, `${stage}: the resume line closes the stage\n${resume.stdout}\n${resume.stderr}`);
  assert.match(resume.stdout, /"status": "done"/, `${stage}: a done object`);
}

test(
  "7.15.1 — verify: a runner killed during its FIRST gate, then the resume line — the takeover stops the orphaned gate before deleting gates/, and no two gates overlap",
  { timeout: 600_000 },
  async () => {
    const fx = project();
    try {
      const r = await killDuringFirstGateThenResume(
        fx,
        "pharn-verify",
        ["--gates", "node gate.cjs::slow"],
        "pharn/.run/pharn-verify/gates/lock.child"
      );
      assertNoOverlap("pharn-verify", r, 2);
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  }
);

test(
  "7.15.1 — regress: a runner killed during its FIRST (HEAD) gate, then the resume line — the takeover stops the orphaned gate before clearing head/, and no two gates overlap",
  { timeout: 600_000 },
  async () => {
    const fx = project();
    try {
      const extra = ["--base", fx.base, "--gates", "node gate.cjs::slow", "--no-install", "--no-tests"];
      const r = await killDuringFirstGateThenResume(fx, "pharn-regress", extra, "pharn/.run/pharn-regress/head/lock.child");
      assertNoOverlap("pharn-regress", r, 3); // the orphan, the HEAD re-run, the base side
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  }
);
