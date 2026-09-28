#!/usr/bin/env node
// measure.mjs — HEAD→VERIFY gate-reuse measurement harness (verify-head-gate-reuse). Builds ONE fresh fixture repo per
// repetition, carrying <floorDir> as its own `pharn/floor/` (an install's layout) plus the write guards, opens a
// /pharn-loop run marker, anchors the reconcile epoch as the build does, makes the "build" edit, then runs
// <floorDir>/stage-regress.mjs and <floorDir>/stage-verify.mjs with the pinned flags. Counts come from the fixture:
// every gate script appends one line naming the gate and the stage it ran under (read from PHARN_TEST_RESULTS, whose
// value is that gate's own path under the stage's `<out>`) to a counter file OUTSIDE the repo.
//
// The fixture's gates: `test` (node:test, 0.3 s), `lint` (0.8 s), `typecheck` (1 s), `build` (1 s). The build edit
// touches `eslint.config.mjs`, so /pharn-regress runs its style gate too — the widest overlap a discovered set has. Style
// gates are never reused (gate-run-core.mjs NON_REUSABLE_IDS, grill B1), nor is `test` (an AC level gate), so the
// reusable overlap is `typecheck` + `build`. The decision cost is timed in-process: the offer rule (one `git rev-parse`
// spawn, the markers, the offer and the stamp read and hashed) plus one `findReusable`.
//
// Usage: node .dev/features/verify-head-gate-reuse/measure.mjs <floorDir> <label> [repetitions]
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync, readdirSync, realpathSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const floorDir = resolve(process.argv[2]);
const label = process.argv[3] ?? "run";
const FEATURE = "demo";
const SESSION = "vhgr-measure-session";
const HOOKS = ["protect-trusted-paths.cjs", "enforce-writes-scope.cjs", "set-writes-scope.cjs"];

function fixture() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "vhgr-measure-")));
  const counter = `${dir}.counter.log`;
  writeFileSync(counter, "");
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "m@m");
  git("config", "user.name", "m");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\nnode_modules/\n");
  const scripts = {
    test: "node count.mjs test && node --test src/",
    lint: "node count.mjs lint && node sleep.mjs 800",
    typecheck: "node count.mjs typecheck && node sleep.mjs 1000",
    build: "node count.mjs build && node sleep.mjs 1000",
  };
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", version: "1.0.0", scripts }, null, 2) + "\n");
  writeFileSync(
    join(dir, "count.mjs"),
    "import { appendFileSync } from 'node:fs';\n" +
      "const p = process.env.PHARN_TEST_RESULTS || '';\n" +
      "const stage = /pharn-verify/.test(p) ? 'verify' : /pharn-regress[\\\\/]base-gates/.test(p) ? 'base' : /pharn-regress[\\\\/]head/.test(p) ? 'head' : 'other';\n" +
      "appendFileSync(process.env.VHGR_COUNTER, `${process.argv[2]} ${stage}\\n`);\n"
  );
  writeFileSync(join(dir, "sleep.mjs"), "setTimeout(() => {}, Number(process.argv[2]));\n");
  writeFileSync(join(dir, "eslint.config.mjs"), "export default [];\n");
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\n");
  writeFileSync(join(dir, "src", "other.js"), "import { add } from './index.js';\nexport const addOne = (x) => add(x, 1);\n");
  writeFileSync(
    join(dir, "src", "other.test.js"),
    "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { addOne } from './other.js';\n" +
      "test('addOne', async () => { await new Promise((r) => setTimeout(r, 300)); assert.equal(addOne(1), 2); });\n"
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
    `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n- \`src/index.js\` — the feature\n- \`eslint.config.mjs\` — its lint config\n`
  );
  mkdirSync(join(dir, "pharn", "floor"), { recursive: true });
  for (const f of readdirSync(floorDir)) {
    if ((f.endsWith(".mjs") && !f.endsWith(".test.mjs")) || f === "reconcile-ignore.json") {
      copyFileSync(join(floorDir, f), join(dir, "pharn", "floor", f));
    }
  }
  mkdirSync(join(dir, ".claude", "hooks"), { recursive: true });
  for (const h of HOOKS) copyFileSync(join(REPO, ".claude", "hooks", h), join(dir, ".claude", "hooks", h));
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  return { dir, counter, base };
}

const env = { ...process.env, CLAUDE_CODE_SESSION_ID: SESSION };
delete env.NODE_TEST_CONTEXT;

function node(fx, args) {
  return spawnSync(process.execPath, args, { cwd: fx.dir, env: { ...env, VHGR_COUNTER: fx.counter }, encoding: "utf8" });
}

function counterLines(fx) {
  return readFileSync(fx.counter, "utf8").split("\n").filter(Boolean);
}

function stage(fx, script, args) {
  const before = counterLines(fx).length;
  const t0 = process.hrtime.bigint();
  const r = node(fx, [join("pharn", "floor", script), ...args]);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const lines = counterLines(fx).slice(before);
  let doc = null;
  try {
    doc = JSON.parse(r.stdout);
  } catch {
    /* reported below */
  }
  return {
    exit: r.status,
    status: doc && doc.status,
    verdict: doc && doc.verdict,
    wall_ms: Math.round(ms),
    lines,
    stderr: r.status === 0 ? undefined : r.stderr,
  };
}

const reps = Number(process.argv[4] ?? 1);
const results = [];
for (let rep = 1; rep <= reps; rep++) {
  const fx = fixture();
  try {
    // /pharn-loop Step 1a's marker, then the build's Step 0 (plan scope + reconcile anchor), then the build's edit.
    const mdir = join(fx.dir, ".pharn", "pharn-loop", FEATURE);
    mkdirSync(mdir, { recursive: true });
    writeFileSync(
      join(mdir, "active.json"),
      `${JSON.stringify({ schema: "pharn-loop-active/1", name: FEATURE, session_id: SESSION, started_at: new Date().toISOString(), cap: 3 })}\n`
    );
    const set = node(fx, [".claude/hooks/set-writes-scope.cjs", "--from-plan", `pharn/features/${FEATURE}/PLAN.md`]);
    if (set.status !== 0) throw new Error(`setter: ${set.stdout}${set.stderr}`);
    const anc = node(fx, ["pharn/floor/reconcile-baseline.mjs", "--anchor", "--by", "measure"]);
    if (anc.status !== 0) throw new Error(`anchor: ${anc.stdout}${anc.stderr}`);
    writeFileSync(join(fx.dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport const id = (x) => x;\n");
    writeFileSync(join(fx.dir, "eslint.config.mjs"), "export default [{ rules: {} }];\n");

    const reg = stage(fx, "stage-regress.mjs", [
      "--feature",
      FEATURE,
      "--timeout-ms",
      "540000",
      "--budget-ms",
      "570000",
      "--base",
      fx.base,
      "--no-install",
    ]);
    const ver = stage(fx, "stage-verify.mjs", ["--feature", FEATURE, "--timeout-ms", "540000", "--budget-ms", "570000"]);
    let report = null;
    try {
      report = JSON.parse(readFileSync(join(fx.dir, "pharn", "features", FEATURE, "verify-report.json"), "utf8"));
    } catch {
      /* reported as null */
    }
    const byStage = (lines, s) => lines.filter((l) => l.endsWith(` ${s}`)).map((l) => l.split(" ")[0]);
    const headProcs = byStage(reg.lines, "head");
    const baseProcs = byStage(reg.lines, "base");
    const verifyProcs = byStage(ver.lines, "verify");
    const reused = report && report.gate_reuse ? report.gate_reuse.reused.map((r) => r.id) : [];

    // The decision's own cost, in-process over the finished fixture: the source-offer rule + one findReusable.
    let decision = null;
    const coreUrl = pathToFileURL(join(fx.dir, "pharn", "floor", "gate-reuse-core.mjs")).href;
    let hasCore = true;
    try {
      readFileSync(join(fx.dir, "pharn", "floor", "gate-reuse-core.mjs"));
    } catch {
      hasCore = false;
    }
    if (hasCore) {
      const core = await import(coreUrl);
      const io = await import(pathToFileURL(join(fx.dir, "pharn", "floor", "regress-base-reuse.mjs")).href);
      const offerIo = await import(pathToFileURL(join(fx.dir, "pharn", "floor", "head-reuse-offer.mjs")).href);
      const { STAMP_MAX_BYTES } = await import(pathToFileURL(join(fx.dir, "pharn", "floor", "regress-base-reuse-core.mjs")).href);
      const prev = process.cwd();
      process.chdir(fx.dir);
      const N = 20;
      const t0 = process.hrtime.bigint();
      let ok;
      for (let i = 0; i < N; i++) {
        const offer = offerIo.acceptReuseSource({
          feature: FEATURE,
          markers: io.readMarkers(FEATURE),
          now: Date.now(),
          offer: offerIo.readOffer(),
          stamp: io.readInProject(io.HEAD_STAMP, STAMP_MAX_BYTES),
        });
        const src = JSON.parse(readFileSync(io.HEAD_STAMP, "utf8"));
        const typecheck = src.runs.find((r) => r.id === "typecheck");
        ok =
          offer.ok && core.findReusable({ source: src, feature: FEATURE, entry: typecheck, liveIdentity: typecheck.identity_sha256 }).hit;
      }
      decision = { mean_ms: Number(process.hrtime.bigint() - t0) / 1e6 / N, offer_and_hit: ok };
      process.chdir(prev);
    }
    results.push({
      rep,
      regress: {
        exit: reg.exit,
        status: reg.status,
        verdict: reg.verdict,
        wall_ms: reg.wall_ms,
        head_processes: headProcs,
        base_processes: baseProcs,
        stderr: reg.stderr,
      },
      verify: {
        exit: ver.exit,
        status: ver.status,
        verdict: ver.verdict,
        wall_ms: ver.wall_ms,
        processes: verifyProcs,
        reused,
        stderr: ver.stderr,
      },
      totals: { gate_processes: headProcs.length + baseProcs.length + verifyProcs.length, verify_entries_reused: reused.length },
      decision_cost: decision,
    });
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(fx.counter, { force: true });
  }
}
console.log(JSON.stringify({ label, floorDir, results }, null, 2));
