#!/usr/bin/env node
// measure.mjs — BASE-reuse measurement harness (regress-base-reuse). Builds ONE fresh fixture repo per
// variant, opens a /pharn-loop run marker, and runs <floorDir>/stage-regress.mjs twice over the SAME BASE
// requirement (an in-scope implementation edit between the two runs, as a later loop iteration would make).
// Counts come from the fixture itself: every gate script and the base-commit install append one line to a
// counter file OUTSIDE the repo, and a post-checkout hook appends one line per `git worktree add` checkout.
//
// Usage: node .dev/features/regress-base-reuse/measure.mjs <floorDir> <label> [repetitions]
// The decision's own cost is timed in-process (the floor's regress-base-reuse.mjs, when the floor has it) over the
// fixture left by the second run. Timings are this fixture's shape (sleeps of 0.8–1.5 s stand in for real gates and a
// real install); the COUNTS are the result, the wall-clock an illustration of what the counts save.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const floorDir = resolve(process.argv[2]);
const label = process.argv[3] ?? "run";
const FEATURE = "demo";
const SESSION = "rbr-measure-session";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "rbr-measure-"));
  const counter = `${dir}.counter.log`;
  writeFileSync(counter, "");
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "m@m");
  git("config", "user.name", "m");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\nnode_modules/\n");
  const scripts = {
    test: "node count.mjs test && node --test",
    typecheck: "node count.mjs typecheck && node sleep.mjs 1000",
    build: "node count.mjs build && node sleep.mjs 1000",
    postinstall: "node count.mjs install && node sleep.mjs 1500",
  };
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", version: "1.0.0", scripts }, null, 2) + "\n");
  writeFileSync(
    join(dir, "package-lock.json"),
    JSON.stringify(
      { name: "fx", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "fx", version: "1.0.0" } } },
      null,
      2
    ) + "\n"
  );
  writeFileSync(
    join(dir, "count.mjs"),
    "import { appendFileSync } from 'node:fs';\n" +
      "const side = /[\\\\/]\\.pharn[\\\\/]pharn-regress[\\\\/]base([\\\\/]|$)/.test(process.cwd()) ? 'base' : 'head';\n" +
      "appendFileSync(process.env.RBR_COUNTER, `${process.argv[2]} ${side}\\n`);\n"
  );
  writeFileSync(join(dir, "sleep.mjs"), "setTimeout(() => {}, Number(process.argv[2]));\n");
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\n");
  writeFileSync(join(dir, "src", "other.js"), "import { add } from './index.js';\nexport const addOne = (x) => add(x, 1);\n");
  writeFileSync(
    join(dir, "src", "other.test.js"),
    "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { addOne } from './other.js';\n" +
      "test('addOne', async () => { await new Promise((r) => setTimeout(r, 800)); assert.equal(addOne(1), 2); });\n"
  );
  mkdirSync(join(dir, "pharn", "features", FEATURE), { recursive: true });
  const body = "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n";
  const hash = createHash("sha256").update(body).digest("hex");
  writeFileSync(
    join(dir, "pharn", "features", FEATURE, "SPEC.md"),
    `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`
  );
  writeFileSync(
    join(dir, "pharn", "features", FEATURE, "PLAN.md"),
    `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — the feature\n`
  );
  const hook = join(dir, ".git", "hooks", "post-checkout");
  writeFileSync(hook, '#!/bin/sh\necho "worktree base" >> "$RBR_COUNTER"\n');
  chmodSync(hook, 0o755);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  return { dir, counter, base };
}

function openLoopMarker(dir) {
  const mdir = join(dir, ".pharn", "pharn-loop", FEATURE);
  mkdirSync(mdir, { recursive: true });
  const marker = { schema: "pharn-loop-active/1", name: FEATURE, session_id: SESSION, started_at: new Date().toISOString(), cap: 3 };
  writeFileSync(join(mdir, "active.json"), `${JSON.stringify(marker)}\n`);
}

const env = {
  ...process.env,
  CLAUDE_CODE_SESSION_ID: SESSION,
  npm_config_offline: "true",
  npm_config_audit: "false",
  npm_config_fund: "false",
  npm_config_update_notifier: "false",
};
delete env.NODE_TEST_CONTEXT;

function counts(lines) {
  const c = { worktree_checkouts: 0, base_installs: 0, base_gate_runs: 0, head_gate_runs: 0 };
  for (const l of lines) {
    const [what, side] = l.split(" ");
    if (what === "worktree") c.worktree_checkouts++;
    else if (what === "install") c.base_installs++;
    else if (side === "base") c.base_gate_runs++;
    else c.head_gate_runs++;
  }
  c.all_gate_runs = c.base_gate_runs + c.head_gate_runs;
  return c;
}

function runOnce(fx, n) {
  const before = readFileSync(fx.counter, "utf8").split("\n").filter(Boolean).length;
  const t0 = process.hrtime.bigint();
  const r = spawnSync(
    process.execPath,
    [join(floorDir, "stage-regress.mjs"), "--feature", FEATURE, "--timeout-ms", "540000", "--budget-ms", "570000", "--base", fx.base],
    { cwd: fx.dir, env: { ...env, RBR_COUNTER: fx.counter }, encoding: "utf8" }
  );
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const lines = readFileSync(fx.counter, "utf8").split("\n").filter(Boolean).slice(before);
  let doc = null;
  try {
    doc = JSON.parse(r.stdout);
  } catch {
    /* reported below */
  }
  let baseEvidence = null;
  if (doc && doc.report && existsSync(join(fx.dir, doc.report))) {
    baseEvidence = JSON.parse(readFileSync(join(fx.dir, doc.report), "utf8")).base_evidence ?? "absent";
  }
  return {
    invocation: n,
    exit: r.status,
    status: doc && doc.status,
    verdict: doc && doc.verdict,
    wall_ms: Math.round(ms),
    ...counts(lines),
    base_evidence: baseEvidence,
    stderr: r.status === 0 ? undefined : r.stderr,
  };
}

const reps = Number(process.argv[4] ?? 1);
const results = [];
for (let rep = 1; rep <= reps; rep++) {
  const fx = fixture();
  try {
    writeFileSync(join(fx.dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport const id = (x) => x;\n");
    openLoopMarker(fx.dir);
    const first = runOnce(fx, 1);
    // A later loop iteration: the build edits an in-scope implementation file again; the BASE requirement is unchanged.
    writeFileSync(
      join(fx.dir, "src", "index.js"),
      "export function add(a, b) { return a + b; }\nexport const id = (x) => x;\nexport const two = 2;\n"
    );
    const second = runOnce(fx, 2);
    let decision = null;
    const io = join(floorDir, "regress-base-reuse.mjs");
    if (existsSync(io)) {
      const m = await import(pathToFileURL(io).href);
      const { ALGO } = await import(pathToFileURL(join(floorDir, "worktree-fingerprint.mjs")).href);
      const { SCHEMA } = await import(pathToFileURL(join(floorDir, "gate-run-core.mjs")).href);
      const prev = process.cwd();
      process.chdir(fx.dir);
      process.env.RBR_COUNTER = fx.counter;
      const N = 20;
      const t0 = process.hrtime.bigint();
      let d;
      for (let i = 0; i < N; i++) {
        d = m.decideFromDisk({
          feature: FEATURE,
          base: fx.base,
          install: { kind: "cmd", cmd: "npm ci", unmeasured: false },
          timeoutMs: 540000,
          gateRunSchema: SCHEMA,
          fingerprintAlgo: ALGO,
        });
      }
      decision = { mean_ms: Number(process.hrtime.bigint() - t0) / 1e6 / N, reused: d.reused, miss: d.miss };
      process.chdir(prev);
    }
    results.push({ rep, runs: [first, second], decision_cost: decision });
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(fx.counter, { force: true });
  }
}
console.log(JSON.stringify({ label, floorDir, results }, null, 2));
