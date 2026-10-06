#!/usr/bin/env node
// .dev/features/entry-run-as-base-evidence/measure.mjs — the controlled measurement for 6.49.0 (apparatus; never
// shipped). One fixture builder, two floors:
//   A = origin/main's pharn/floor at the base SHA (extracted with `git archive` into a scratch dir) — normal BASE;
//   B = this checkout's pharn/floor — entry-derived BASE when eligible.
// Same fixture, same inputs, the same pinned flags (--timeout-ms 540000, --budget-ms 570000), N repetitions each, for
//   F-hit  — a clean start, outside tests, a build that edits source and ADDS an inside test (B HITs);
//   F-miss — the same build that also EDITS a pre-existing test (B MISSes shape-mismatch, the realistic common case).
// Every gate and the postinstall sleep a fixed time and append "<what> <side>" to a counter outside the repo; a
// post-checkout hook counts BASE worktree checkouts. The selector's own cost is timed in-process with performance.now()
// around decideEntryFromDisk and materializeEntryBase (B only). No model runs; no real-project saving is claimed.
//
// Usage: node .dev/features/entry-run-as-base-evidence/measure.mjs [--reps 3] [--base-ref <sha>] [--json <out>]

import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, chmodSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir, cpus } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const REPS = Number(opt("--reps", "3"));
const BASE_REF = opt("--base-ref", "0e38b861f7839a7c19f8bb29756888d84e152568");
const JSON_OUT = opt("--json", null);
const FEATURE = "demo";
const SLEEP = { test: 400, typecheck: 300, build: 600, install: 500 };
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;

// ── the two floors ──────────────────────────────────────────────────────────────────────────────────────────────────
const scratch = mkdtempSync(join(tmpdir(), "ebe-measure-"));
const floorA = join(scratch, "main");
mkdirSync(floorA, { recursive: true });
execFileSync("sh", ["-c", `git -C '${ROOT}' archive '${BASE_REF}' pharn/floor | tar -x -C '${floorA}'`]);
const FLOORS = { A: join(floorA, "pharn", "floor"), B: join(ROOT, "pharn", "floor") };
const LOOP_RECORD = join(ROOT, ".claude", "hooks", "require-loop-record.cjs");

const COUNT_JS = `import { appendFileSync } from 'node:fs';
const side = /[\\\\/]\\.pharn[\\\\/]pharn-regress[\\\\/]base([\\\\/]|$)/.test(process.cwd()) ? 'base'
  : /[\\\\/]\\.pharn[\\\\/]pharn-entry[\\\\/]/.test(process.env.PHARN_TEST_RESULTS || '') ? 'entry' : 'head';
if (process.env.EBE_COUNTER) appendFileSync(process.env.EBE_COUNTER, process.argv[2] + ' ' + side + '\\n');
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.argv[3] || 0));
`;

function fixture() {
  const dir = mkdtempSync(join(scratch, "fx-"));
  const counter = `${dir}.counter`;
  writeFileSync(counter, "");
  const w = (p, c) => {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), c);
  };
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "m@m");
  git("config", "user.name", "m");
  w(".gitignore", ".pharn/\nnode_modules/\n");
  w("count.mjs", COUNT_JS);
  w(
    "package.json",
    JSON.stringify({
      name: "fx",
      version: "1.0.0",
      scripts: {
        test: `node count.mjs test ${SLEEP.test} && node --test`,
        typecheck: `node count.mjs typecheck ${SLEEP.typecheck}`,
        build: `node count.mjs build ${SLEEP.build}`,
        postinstall: `node count.mjs install ${SLEEP.install}`,
      },
    })
  );
  w(
    "package-lock.json",
    JSON.stringify({ name: "fx", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "fx", version: "1.0.0" } } })
  );
  w("src/index.js", "export function add(a, b) { return a + b; }\n");
  for (const n of ["a", "b"]) {
    w(
      `src/${n}.test.js`,
      `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from './index.js';\ntest('${n}', () => { assert.equal(add(1, 2), 3); });\n`
    );
  }
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  const hook = join(dir, ".git", "hooks", "post-checkout");
  writeFileSync(hook, '#!/bin/sh\n[ -n "$EBE_COUNTER" ] && echo "worktree base" >> "$EBE_COUNTER"\nexit 0\n');
  chmodSync(hook, 0o755);
  return { dir, counter, base, w };
}

function run(fx, file, argv) {
  const t0 = performance.now();
  const r = spawnSync(process.execPath, [file, ...argv], { cwd: fx.dir, encoding: "utf8", env: { ...env, EBE_COUNTER: fx.counter } });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, ms: Math.round(performance.now() - t0) };
}

function counted(fx, from) {
  const c = { entry: 0, head: 0, base: 0, worktree: 0, install: 0 };
  const lines = readFileSync(fx.counter, "utf8").split("\n").filter(Boolean);
  for (const l of lines.slice(from)) {
    const [what, side] = l.split(" ");
    if (what === "worktree") c.worktree++;
    else if (what === "install") c.install++;
    else c[side]++;
  }
  return { c, n: lines.length };
}

const median = (xs) => (xs.length ? Number([...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)].toFixed(2)) : null);

async function one(floorKey, kind) {
  const floor = FLOORS[floorKey];
  const fx = fixture();
  try {
    run(fx, LOOP_RECORD, ["--open", FEATURE, "--cap", "3"]);
    run(fx, join(floor, "pre-run-snapshot.mjs"), ["--capture", FEATURE]);
    const start = run(fx, join(floor, "entry-gates.mjs"), ["--start", "--feature", FEATURE, "--timeout-ms", "540000"]);
    let wait;
    let waitMs = 0;
    for (let i = 0; i < 40; i++) {
      wait = run(fx, join(floor, "entry-gates.mjs"), ["--wait", "--feature", FEATURE, "--budget-ms", "570000"]);
      waitMs += wait.ms;
      if (wait.code !== 5) break;
    }
    const entry = counted(fx, 0);
    // the front stages' artifacts and the build
    const body = "\n## Intent\n\nx\n\n## Scope\n\nx\n\n## Acceptance Criteria\n\nx\n\n## Constraints\n\nx\n";
    const hash = createHash("sha256").update(body).digest("hex");
    fx.w(`pharn/features/${FEATURE}/SPEC.md`, `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`);
    const files = ["src/index.js", "src/new.test.js", ...(kind === "miss" ? ["src/a.test.js"] : [])];
    fx.w(
      `pharn/features/${FEATURE}/PLAN.md`,
      `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n${files.map((f) => `- \`${f}\` — x`).join("\n")}\n`
    );
    fx.w("src/index.js", "export function add(a, b) { return a + b; }\nexport const id = (x) => x;\n");
    fx.w("src/new.test.js", "import { test } from 'node:test';\ntest('new', () => {});\n");
    if (kind === "miss") fx.w("src/a.test.js", "import { test } from 'node:test';\ntest('a2', () => {});\n");
    const rg = run(fx, join(floor, "stage-regress.mjs"), ["--feature", FEATURE, "--timeout-ms", "540000", "--budget-ms", "570000"]);
    const reg = counted(fx, entry.n);
    const reportPath = join(fx.dir, "pharn", "features", FEATURE, "regression-report.json");
    const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
    const be = report ? report.base_evidence : null;
    const stampPath = join(fx.dir, ".pharn", "pharn-regress", "base-gates", "stamp.json");
    const copies =
      be && be.source === "entry" && existsSync(stampPath)
        ? JSON.parse(readFileSync(stampPath, "utf8")).runs.filter((r) => r.reason === "reused").length * 2
        : 0;
    // the selector's own cost (B only): decide + materialize, timed in-process over the finished run, 10 times each
    let selector = null;
    if (floorKey === "B") {
      const mod = await import(join(floor, "entry-base-evidence.mjs"));
      const cwd = process.cwd();
      process.chdir(fx.dir);
      try {
        const times = { decide: [], materialize: [] };
        for (let i = 0; i < 10; i++) {
          let t = performance.now();
          const d = mod.decideEntryFromDisk({ feature: FEATURE, base: fx.base, timeoutMs: 540000, installOverride: false });
          times.decide.push(performance.now() - t);
          if (d.decision.reused) {
            t = performance.now();
            mod.materializeEntryBase({ feature: FEATURE, base: fx.base, detail: d.detail, entryStampSha256: d.decision.sourceStampSha256 });
            times.materialize.push(performance.now() - t);
          }
        }
        selector = { decide_ms_median: median(times.decide), materialize_ms_median: median(times.materialize) };
      } finally {
        process.chdir(cwd);
      }
    }
    return {
      floor: floorKey,
      kind,
      start_exit: start.code,
      wait_status: JSON.parse(wait.stdout).status,
      entry_gate_executions: entry.c.entry,
      entry_ms: start.ms + waitMs,
      regress_exit: rg.code,
      regress_ms: rg.ms,
      head_gate_executions: reg.c.head,
      base_worktree_checkouts: reg.c.worktree,
      base_installs: reg.c.install,
      base_gate_executions: reg.c.base,
      log_copies: copies,
      verdict: report ? report.verdict : null,
      base_source: be ? (be.source ?? (be.reused ? "reused" : "fresh")) : null,
      entry_miss: be && be.entry ? be.entry.miss : null,
      selector,
    };
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(fx.counter, { force: true });
  }
}

const rows = [];
for (const kind of ["hit", "miss"]) {
  for (let i = 0; i < REPS; i++) {
    for (const f of ["A", "B"]) rows.push({ rep: i + 1, ...(await one(f, kind)) });
  }
}
rmSync(scratch, { recursive: true, force: true });
const meta = { node: process.version, cpus: cpus().length, cpu: cpus()[0]?.model, base_ref: BASE_REF, reps: REPS, sleeps_ms: SLEEP };
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ meta, rows }, null, 2));
console.log(JSON.stringify(meta));
for (const r of rows) console.log(JSON.stringify(r));
