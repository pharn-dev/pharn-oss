// pharn/floor/stage-verify.test.mjs — the /pharn-verify stage script's end-to-end suite. Every test drives the REAL CLI
// as a subprocess over a REAL throwaway git repository that holds its OWN copy of the floor closure and the write
// guards — exactly what an install carries, and what the runner's injected gates need: `run-gates.mjs` spawns
// `pharn/floor/check-build-complete.mjs` and `pharn/floor/check-bash-reconcile.mjs` relative to the project.
//
// ★ WIRING (L45) extracts `.claude/commands/pharn-verify.md`'s ONE pinned fresh line and executes it with `sh -c`.
// ★ LOOP-FRESH runs the real regress AND verify scripts over one fixture and asks the real `check-loop-fresh.mjs`.
// Every ★ test names the edit that turns it red and RUNS it (L60): a mutant copy of `stage-verify.mjs` is written
// into a fixture, never into this repository.
//
// `runCli` (GRILL G6) is the one runner: on every deliberate exit it asserts that stdout is exactly one JSON document
// `validateStageExit` accepts and whose status matches the exit code; on a crash, that NO document was printed.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
  copyFileSync,
  chmodSync,
  readdirSync,
  renameSync,
  realpathSync,
} from "node:fs";
import { execFileSync, spawnSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT_CODE, REGISTRY, allReasonCodes, validateStageExit, statusForExitCode, substituteArgv } from "./stage-exit-core.mjs";
import { VERIFY_PATHS, PROGRESS_SCHEMA, PHASES, RESUMABLE_PHASES, validateProgress } from "./stage-verify-core.mjs";
import { validateStamp, logBasename } from "./gate-run-core.mjs";
import { fingerprint } from "./worktree-fingerprint.mjs";
import { DEFAULT_STAMPS } from "./loop-fresh-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const COMMAND = join(REPO, ".claude", "commands", "pharn-verify.md");
const CLI_SRC = join(HERE, "stage-verify.mjs");
const CHECK_LOOP_FRESH = join(HERE, "check-loop-fresh.mjs");
const FEATURE = "demo";
const FEATURE_DIR = `pharn/features/${FEATURE}`;
const REPORT = `${FEATURE_DIR}/verify-report.json`;
const RENDER = `${FEATURE_DIR}/VERIFY.md`;
const STAMP = DEFAULT_STAMPS.verify;
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

// A NESTED `node --test` (a fixture's own "test" script) must not inherit this suite's coordination channel, or a
// failing assertion inside it reads back as gate exit 0 (stage-regress.test.mjs's CLEAN_ENV, same reason).
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

/** The floor closure the fixture carries: every sibling `.mjs` named in a string literal, transitively (the regress
 *  suite's own regex), from the two stage scripts and the runner's argv-named children, whose names appear only as
 *  `pharn/floor/<name>` paths inside gate-run-core.mjs and so are not reached by the regex. */
const FLOOR_MODULES = (() => {
  const seen = new Set();
  const queue = ["stage-verify.mjs", "stage-regress.mjs", "check-bash-reconcile.mjs", "check-build-complete.mjs", "check-structural.mjs"];
  while (queue.length) {
    const m = queue.shift();
    if (seen.has(m)) continue;
    seen.add(m);
    for (const [, dep] of readFileSync(join(HERE, m), "utf8").matchAll(/["'](?:\.\/)?([a-z0-9-]+\.mjs)["']/g)) {
      if (!dep.endsWith(".test.mjs") && existsSync(join(HERE, dep))) queue.push(dep);
    }
  }
  return [...seen].sort();
})();

const HOOKS = ["protect-trusted-paths.cjs", "enforce-writes-scope.cjs", "set-writes-scope.cjs"];

function specBody() {
  return "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n";
}

/** L60 — every mutation asserts its anchor was found, so a renamed line fails the test instead of passing vacuously. */
function mutate(src, from, to) {
  assert.ok(src.includes(from), `mutation anchor not found in stage-verify.mjs: ${JSON.stringify(from.slice(0, 80))}`);
  return src.replace(from, to);
}

/**
 * A throwaway project: a legacy (un-templated) approved SPEC, a PLAN pinning it, `src/`, its own floor closure and
 * write guards, one commit, then the build's own Step 0 (the plan-scope setter, then the reconcile anchor) and the
 * "build" edit to a declared file. Options:
 *   scripts        package.json scripts, or null for no package.json
 *   files          PLAN `## Files` lines (null: no `## Files` heading at all)
 *   committed      extra files committed with the base {path: content}
 *   floor          floor overrides {module: source} applied BEFORE the commit (a crash fixture)
 *   cliSource      a mutant stage-verify.mjs source, applied before the commit
 *   withPlan/withSpec  false to omit the artifact
 *   anchor         false to skip the setter + anchor (a fixture that refuses before any gate)
 */
function fixture(opts = {}) {
  const {
    scripts = { test: "node --test src/" },
    files = ["- `src/index.js` — the feature", "- `src/index.test.js` — its test"],
    committed = {},
    floor = {},
    cliSource = null,
    withPlan = true,
    withSpec = true,
    anchor = true,
  } = opts;
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "sv-")));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  if (scripts !== null) writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", version: "1.0.0", scripts }, null, 2) + "\n");
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\n");
  writeFileSync(
    join(dir, "src", "index.test.js"),
    "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from './index.js';\ntest('add', () => { assert.equal(add(1, 2), 3); });\n"
  );
  mkdirSync(join(dir, FEATURE_DIR), { recursive: true });
  const body = specBody();
  const hash = sha256(body);
  if (withSpec)
    writeFileSync(join(dir, FEATURE_DIR, "SPEC.md"), `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`);
  if (withPlan) {
    const section = files === null ? "no files section here.\n" : `## Files\n\n${files.join("\n")}\n`;
    writeFileSync(join(dir, FEATURE_DIR, "PLAN.md"), `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n${section}`);
  }
  for (const [p, content] of Object.entries(committed)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), content);
  }
  mkdirSync(join(dir, "pharn", "floor"), { recursive: true });
  for (const m of FLOOR_MODULES) copyFileSync(join(HERE, m), join(dir, "pharn", "floor", m));
  copyFileSync(join(HERE, "reconcile-ignore.json"), join(dir, "pharn", "floor", "reconcile-ignore.json"));
  for (const [m, src] of Object.entries(floor)) writeFileSync(join(dir, "pharn", "floor", m), src);
  if (cliSource !== null) writeFileSync(join(dir, "pharn", "floor", "stage-verify.mjs"), cliSource);
  mkdirSync(join(dir, ".claude", "hooks"), { recursive: true });
  for (const h of HOOKS) copyFileSync(join(REPO, ".claude", "hooks", h), join(dir, ".claude", "hooks", h));
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  if (anchor) {
    const node = (args) => spawnSync(process.execPath, args, { cwd: dir, encoding: "utf8", env: CLEAN_ENV });
    const set = node([".claude/hooks/set-writes-scope.cjs", "--from-plan", `${FEATURE_DIR}/PLAN.md`]);
    assert.equal(set.status, 0, `fixture setter: ${set.stdout}${set.stderr}`);
    const anc = node(["pharn/floor/reconcile-baseline.mjs", "--anchor", "--by", "test"]);
    assert.equal(anc.status, 0, `fixture anchor: ${anc.stdout}${anc.stderr}`);
  }
  // The build's own edit to a declared file.
  writeFileSync(join(dir, "src", "index.js"), "export function add(a, b) { return a + b; }\nexport function id(x) { return x; }\n");
  return { dir, base, git };
}

function withFixture(opts, fn) {
  const fx = fixture(opts);
  try {
    return fn(fx);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
}

/** THE runner (G6). Runs the FIXTURE's own copy of the script, as an install does. */
function runCli(dir, args, { env = CLEAN_ENV } = {}) {
  const r = spawnSync(process.execPath, ["pharn/floor/stage-verify.mjs", ...args], { cwd: dir, encoding: "utf8", env });
  return checked(r);
}

function checked(r) {
  const status = statusForExitCode(r.status);
  const raw = (r.stdout || "") + (r.stderr || "");
  if (status === null) {
    assert.equal(r.stdout, "", `a crash (exit ${r.status}) must print NO document:\n${raw}`);
    return { code: r.status, doc: null, raw };
  }
  let doc;
  assert.doesNotThrow(() => {
    doc = JSON.parse(r.stdout);
  }, `exit ${r.status}: stdout is not exactly one JSON document:\n${raw}`);
  assert.deepEqual(validateStageExit(doc), { ok: true }, `exit ${r.status}: the object does not validate:\n${raw}`);
  assert.equal(doc.status, status, "the exit code names the status");
  assert.equal(doc.stage, "verify");
  return { code: r.status, doc, raw };
}

const fresh = (extra = []) => ["--feature", FEATURE, "--timeout-ms", "30000", ...extra];
const gateLogs = (dir) => {
  const g = join(dir, VERIFY_PATHS.gates);
  return existsSync(g) ? readdirSync(g).filter((f) => /^\d+-.+\.(out|err)$/.test(f)) : [];
};
const readReport = (dir) => JSON.parse(readFileSync(join(dir, REPORT), "utf8"));

// ── ★ WIRING (L45) — the COMMITTED pharn-verify.md line, executed ───────────────────────────────────
test("★ WIRING — pharn-verify.md's pinned fresh line, executed verbatim, reaches done/PASS with every consumer check holding", (t) => {
  const text = readFileSync(COMMAND, "utf8");
  const pinned = text
    .split(/\r?\n/)
    .filter((l) => /^node pharn\/floor\/stage-verify\.mjs --feature <name> --timeout-ms \d+ --budget-ms \d+\s*$/.test(l));
  assert.equal(pinned.length, 1, `expected exactly one pinned fresh line in pharn-verify.md, found ${pinned.length}`);
  const m = pinned[0].match(/--timeout-ms (\d+) --budget-ms (\d+)/);
  assert.ok(Number(m[1]) < Number(m[2]) && Number(m[2]) < 600000, "N < B < 600000");
  const line = pinned[0].replaceAll("<name>", FEATURE).trim();
  assert.doesNotMatch(line, /<[a-z][^>]*>/, `an unsubstituted placeholder remains in: ${line}`);

  withFixture({}, ({ dir }) => {
    const start = Date.now();
    const r = checked(spawnSync("sh", ["-c", line], { cwd: dir, encoding: "utf8", env: CLEAN_ENV }));
    const wallMs = Date.now() - start;
    t.diagnostic(`★ WIRING wall time: ${wallMs} ms for the pinned line (discovered test gate + reconcile, legacy SPEC)`);
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.doc.status, "done");
    const report = readReport(dir);
    assert.equal(report.verdict, "PASS", JSON.stringify(report));
    assert.equal(r.doc.verdict, report.verdict, "G14: the done object's transient verdict equals the report's");
    assert.equal(r.doc.report, REPORT);
    assert.equal(r.doc.render, RENDER);

    // C — the stamp sits at DEFAULT_STAMPS.verify and validates.
    const stampBytes = readFileSync(join(dir, STAMP));
    const stamp = JSON.parse(stampBytes);
    assert.deepEqual(validateStamp(stamp, { stage: "verify", feature: FEATURE, side: null }), { ok: true });
    // D — the report is bound to that stamp.
    assert.equal(report.gate_run.stamp_sha256, sha256(stampBytes));
    // J — every recorded log hash matches the log on disk.
    for (const run of stamp.runs) {
      const b = logBasename(run.seq, run.id);
      assert.equal(sha256(readFileSync(join(dir, VERIFY_PATHS.gates, `${b}.out`))), run.stdout_sha256, `${run.id} stdout`);
      assert.equal(sha256(readFileSync(join(dir, VERIFY_PATHS.gates, `${b}.err`))), run.stderr_sha256, `${run.id} stderr`);
    }
    // The runner-injected reconcile gate ran LAST, with --require-baseline.
    const last = stamp.runs.at(-1);
    assert.equal(last.id, "reconcile");
    assert.ok(last.argv.includes("--require-baseline"), JSON.stringify(last.argv));
    // E — the report's checker fields ARE a fresh check-verify.mjs --stamp … --ac-gate over the same stamp.
    const cv = spawnSync(process.execPath, ["pharn/floor/check-verify.mjs", "--stamp", STAMP, "--feature", FEATURE, "--ac-gate"], {
      cwd: dir,
      encoding: "utf8",
      env: CLEAN_ENV,
    });
    const live = JSON.parse(cv.stdout);
    assert.deepEqual(
      Object.keys(report),
      [...Object.keys(live), "completeness", "verifiers"],
      "the checker's keys, in order, then the two blocks"
    );
    for (const k of Object.keys(live)) assert.deepEqual(report[k], live[k], `field ${k} is not the checker's own output`);
    // F — the stamp's final fingerprint is the live tree's, after the render wrote both artifacts.
    const fp = fingerprint(dir, { feature: FEATURE });
    assert.ok(fp.ok);
    assert.equal(stamp.fingerprint.final, fp.digest);
    // A legacy SPEC is not-applicable — said, never omitted.
    assert.equal(report.ac_gate.verdict, "NOT-APPLICABLE");
    assert.match(readFileSync(join(dir, RENDER), "utf8"), /not-applicable \(legacy spec\)/);
    assert.ok(!existsSync(join(dir, VERIFY_PATHS.stageJson)), "the progress record is removed on done");

    // The mutant: the same line with --timeout-ms dropped must NOT reach done.
    const mutant = line.replace(/--timeout-ms \d+ /, "");
    assert.notEqual(mutant, line);
    const mr = checked(spawnSync("sh", ["-c", mutant], { cwd: dir, encoding: "utf8", env: CLEAN_ENV }));
    assert.notEqual(mr.doc && mr.doc.status, "done", `dropping --timeout-ms must not reach done: ${mr.raw}`);
  });
});

// ── ★ LOOP-FRESH over the REAL stage outputs ────────────────────────────────────────────────────────
test("★ LOOP-FRESH — stage-regress.mjs then stage-verify.mjs over one fixture read FRESH, A B C D J E H F G each pass", () => {
  withFixture({}, ({ dir, base }) => {
    const reg = spawnSync(
      process.execPath,
      ["pharn/floor/stage-regress.mjs", "--feature", FEATURE, "--timeout-ms", "30000", "--no-install", "--base", base],
      {
        cwd: dir,
        encoding: "utf8",
        env: CLEAN_ENV,
      }
    );
    assert.equal(reg.status, 0, reg.stdout + reg.stderr);
    const ver = runCli(dir, fresh());
    assert.equal(ver.code, 0, ver.raw);

    const loop = () =>
      spawnSync(process.execPath, [CHECK_LOOP_FRESH, "--feature", FEATURE, "--base", base, "--iter", "1", "--repo", dir], {
        encoding: "utf8",
        env: CLEAN_ENV,
      });
    const r = loop();
    const doc = JSON.parse(r.stdout);
    assert.equal(doc.verdict, "FRESH", JSON.stringify(doc));
    assert.equal(r.status, 0);
    for (const id of ["A", "B", "C", "D", "J", "E", "H", "F", "G"])
      assert.equal(doc.checks[id], "pass", `check ${id}: ${JSON.stringify(doc.checks)}`);

    // Control: a tracked edit AFTER verify turns F into a RERUN of verify.
    writeFileSync(join(dir, "src", "index.js"), "export const moved = true;\n");
    const moved = loop();
    const mdoc = JSON.parse(moved.stdout);
    assert.equal(mdoc.verdict, "RERUN", JSON.stringify(mdoc));
    assert.equal(mdoc.stage_to_rerun, "verify");
    assert.equal(mdoc.reason_code, "tree-moved-since-verify");
  });
});

// ── VERDICTS THROUGH THE SCRIPT ─────────────────────────────────────────────────────────────────────
test("verdict FAIL — a red project gate is named; done is still exit 0 (the verdict lives in the report)", () => {
  withFixture({ scripts: { test: "node --test src/", lint: "exit 1" } }, ({ dir }) => {
    const r = runCli(dir, fresh());
    assert.equal(r.code, 0, r.raw);
    const report = readReport(dir);
    assert.equal(report.verdict, "FAIL");
    assert.deepEqual(report.failing_gates, ["lint"]);
    assert.equal(r.doc.verdict, "FAIL");
    assert.match(readFileSync(join(dir, RENDER), "utf8"), /VERIFY FAILS/);
  });
});

test("verdict INCOMPLETE — a declared concrete path absent is exit-3-as-verdict, with completeness.missing naming it", () => {
  const files = ["- `src/index.js` — the feature", "- `src/index.test.js` — its test", "- `src/never-built.js` — declared, never written"];
  withFixture({ files }, ({ dir }) => {
    const r = runCli(dir, fresh());
    assert.equal(r.code, 0, r.raw);
    const report = readReport(dir);
    assert.equal(report.verdict, "INCOMPLETE", JSON.stringify(report));
    assert.deepEqual(report.completeness.missing, ["src/never-built.js"]);
    assert.equal(report.completeness.complete, false);
    assert.match(readFileSync(join(dir, RENDER), "utf8"), /MISSING[\s\S]*src\/never-built\.js/);
  });
});

test("verdict INCONCLUSIVE — a PLAN whose ## Files holds only globs carries the checker's reason", () => {
  // The build's own setter refuses a glob-only `## Files`, so the PLAN is narrowed to globs AFTER the build anchored
  // (PLAN.md is a pipeline artifact, reconcile-exempt; its spec pin is untouched, so the chain still holds).
  withFixture({}, ({ dir }) => {
    const plan = join(dir, FEATURE_DIR, "PLAN.md");
    writeFileSync(plan, readFileSync(plan, "utf8").replace(/## Files\n\n[\s\S]*$/, "## Files\n\n- `src/**` — everything under src\n"));
    const r = runCli(dir, fresh());
    assert.equal(r.code, 0, r.raw);
    const report = readReport(dir);
    assert.equal(report.verdict, "INCONCLUSIVE", JSON.stringify(report));
    assert.match(report.reason, /build-completeness inconclusive/);
    assert.equal(report.completeness.complete, false);
    assert.match(readFileSync(join(dir, RENDER), "utf8"), /INCONCLUSIVE: the verdict could not be reached/);
  });
});

// ── EVAL PAIRS (EVAL_PAIR_RULE, through the real runner) ────────────────────────────────────────────
test("eval pairs — a declared capability's pair (tracked or untracked) becomes a structural: gate; nothing else does", () => {
  const pair = (cap, name) => ({ [`caps/${cap}/evals/expected/${name}.json`]: "[]\n", [`caps/${cap}/findings.json`]: "[]\n" });
  const files = [
    "- `src/index.js` — the feature",
    "- `src/index.test.js` — its test",
    "- `caps/a` — declared",
    "- `caps/c/c.md` — declared, no findings.json",
    "- `caps/d/` — declared, untracked pair",
    "- `caps/**` — a glob ABOVE the capability directories",
  ];
  const committed = {
    ...pair("a", "x"),
    ...pair("b", "y"),
    "caps/c/evals/expected/z.json": "[]\n",
    "caps/c/c.md": "c\n",
    ...pair("e", "v"),
  };
  withFixture({ files, committed }, ({ dir }) => {
    for (const [p, c] of Object.entries(pair("d", "w"))) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), c);
    }
    const r = runCli(dir, fresh());
    assert.equal(r.code, 0, r.raw);
    const stamp = JSON.parse(readFileSync(join(dir, STAMP), "utf8"));
    const structural = stamp.runs.map((x) => x.id).filter((id) => id.startsWith("structural:"));
    assert.deepEqual(structural, ["structural:caps/a/evals/expected/x.json", "structural:caps/d/evals/expected/w.json"]);
  });
});

// ── REFUSALS ────────────────────────────────────────────────────────────────────────────────────────
function assertRefused(dir, r, code) {
  assert.equal(r.code, 3, r.raw);
  assert.equal(r.doc.reason_code, code);
  assert.equal(r.doc.render, RENDER);
  const md = readFileSync(join(dir, RENDER), "utf8");
  assert.match(md, /feature NOT verified/);
  assert.ok(md.includes(`refused: \`${code}\``));
  assert.equal(existsSync(join(dir, REPORT)), false, "a refusal writes NO verify-report.json (Q3)");
  assert.equal(existsSync(join(dir, VERIFY_PATHS.gates)), false, "raised before the first slow step: no gate record at all");
}

test("refused missing-artifact / chain-red / plan-files-unparseable — VERIFY.md rendered, no report, no gate run", () => {
  withFixture({ withSpec: false, anchor: false }, ({ dir }) => assertRefused(dir, runCli(dir, fresh()), "missing-artifact"));
  withFixture({ anchor: false }, ({ dir }) => {
    const spec = join(dir, FEATURE_DIR, "SPEC.md");
    writeFileSync(spec, readFileSync(spec, "utf8") + "\nextra drifted content\n");
    const r = runCli(dir, fresh());
    assertRefused(dir, r, "chain-red");
    assert.match(readFileSync(join(dir, RENDER), "utf8"), /```text\nRED — /, "the checker's own message is quoted as DATA");
  });
  withFixture({ files: null, anchor: false }, ({ dir }) => assertRefused(dir, runCli(dir, fresh()), "plan-files-unparseable"));
});

// ── STALE OUTPUT, BRANCH BY BRANCH (GRILL G16) ──────────────────────────────────────────────────────
function plantEarlier(dir) {
  writeFileSync(join(dir, REPORT), '{"verdict":"PASS","stale":true}\n');
  writeFileSync(join(dir, RENDER), "STALE-EARLIER-RENDER\n");
  mkdirSync(join(dir, VERIFY_PATHS.root), { recursive: true });
  writeFileSync(
    join(dir, VERIFY_PATHS.stageJson),
    JSON.stringify({
      schema: PROGRESS_SCHEMA,
      feature: FEATURE,
      timeoutMs: 30000,
      budgetMs: null,
      phase: "verdict",
      verifiers: { registered: 0, verifiers: [] },
    })
  );
}

const earlierGone = (dir) => {
  assert.equal(existsSync(join(dir, REPORT)), false, "the earlier report must be gone");
  assert.ok(
    !existsSync(join(dir, RENDER)) || !readFileSync(join(dir, RENDER), "utf8").includes("STALE-EARLIER-RENDER"),
    "the earlier render must be gone"
  );
  assert.equal(existsSync(join(dir, VERIFY_PATHS.stageJson)), false, "the earlier progress record must be gone");
};

test("G16 — every stop after the slug and containment removed the earlier report, render AND progress record", () => {
  const cases = [
    [
      "chain-red",
      { anchor: false },
      (dir) => writeFileSync(join(dir, FEATURE_DIR, "SPEC.md"), readFileSync(join(dir, FEATURE_DIR, "SPEC.md"), "utf8") + "\ndrift\n"),
      fresh(),
      3,
    ],
    ["missing-artifact", { withPlan: false, anchor: false }, () => {}, fresh(), 3],
    ["no-gates", { scripts: null }, () => {}, fresh(), 4],
    ["a bad --timeout-ms (the N1 difference from regress)", {}, () => {}, ["--feature", FEATURE, "--timeout-ms", "50"], 2],
    ["child-refused", {}, () => {}, fresh(["--gates", "true::reconcile"]), 2],
  ];
  for (const [label, opts, prep, args, code] of cases) {
    withFixture(opts, ({ dir }) => {
      prep(dir);
      plantEarlier(dir);
      const r = runCli(dir, args);
      assert.equal(r.code, code, `${label}: ${r.raw}`);
      earlierGone(dir);
    });
  }
});

test("G16 — a pre-slug usage-error and a path-containment refusal remove NOTHING (the residual G1 answers)", () => {
  withFixture({}, ({ dir }) => {
    plantEarlier(dir);
    const r = runCli(dir, ["--feature", "Not_A_Slug", "--timeout-ms", "30000"]);
    assert.equal(r.code, 2);
    assert.equal(r.doc.reason_code, "usage-error");
    assert.equal(r.doc.feature, null);
    assert.ok(
      existsSync(join(dir, REPORT)) && existsSync(join(dir, RENDER)) && existsSync(join(dir, VERIFY_PATHS.stageJson)),
      "all three survive together"
    );
  });
  withFixture({}, ({ dir }) => {
    writeFileSync(join(dir, REPORT), '{"verdict":"PASS","stale":true}\n');
    writeFileSync(join(dir, RENDER), "STALE-EARLIER-RENDER\n");
    const outside = realpathSync(mkdtempSync(join(tmpdir(), "sv-outside-")));
    try {
      writeFileSync(join(outside, "stage.json"), "{}");
      symlinkSync(outside, join(dir, VERIFY_PATHS.root));
      const r = runCli(dir, fresh());
      assert.equal(r.code, 2);
      assert.equal(r.doc.reason_code, "path-containment");
      assert.ok(
        existsSync(join(dir, REPORT)) && existsSync(join(dir, RENDER)) && existsSync(join(outside, "stage.json")),
        "nothing was removed"
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

test("G16 — a --resume that runs a gate and then meets a runner refusal leaves that gate's log", () => {
  withFixture({}, ({ dir }) => {
    let r = runCli(dir, fresh(["--gates", "true::a,true::b", "--budget-ms", "1"]));
    assert.equal(r.code, 5, r.raw);
    writeFileSync(join(dir, "src", "index.js"), "export const between = 1;\n"); // a tree edit BETWEEN gates
    r = runCli(dir, ["--resume", "--budget-ms", "600000"]);
    assert.equal(r.code, 2, r.raw);
    assert.equal(r.doc.reason_code, "child-refused");
    assert.match(r.doc.detail, /tree-changed-between-gates/);
    assert.ok(
      gateLogs(dir).some((f) => f.startsWith("1-b.")),
      `gate b ran in the resume and its log stays: ${gateLogs(dir)}`
    );
    assert.equal(existsSync(join(dir, REPORT)), false);
  });
});

// ── G2 — a removal that fails is a CRASH, never a verdict ───────────────────────────────────────────
test("★ G2 — an unremovable earlier report crashes (exit 1, no document, no gate log); the catch-all mutant runs gates", () => {
  const plantDir = (dir) => {
    mkdirSync(join(dir, REPORT, "occupied"), { recursive: true });
    writeFileSync(join(dir, REPORT, "occupied", "f"), "x");
  };
  withFixture({}, ({ dir }) => {
    plantDir(dir);
    const r = runCli(dir, fresh());
    assert.equal(r.code, 1, r.raw);
    assert.equal(r.doc, null);
    assert.deepEqual(gateLogs(dir), [], "the crash comes before any gate");
  });
  const src = readFileSync(CLI_SRC, "utf8");
  const catchAll = mutate(
    src,
    '    if (e && e.code === "ENOENT") return;\n    throw e;\n  }\n}\n\nfunction writeRefusedAndEmit',
    "    return;\n  }\n}\n\nfunction writeRefusedAndEmit"
  );
  withFixture({ cliSource: catchAll }, ({ dir }) => {
    plantDir(dir);
    const r = runCli(dir, fresh());
    assert.equal(r.code, 1, "the mutant still dies — at the render's rename, AFTER running every gate");
    assert.ok(gateLogs(dir).length > 0, "the mutant ran gates: the test above is what the catch-all turns red");
  });
});

// ── THE QUESTION ────────────────────────────────────────────────────────────────────────────────────
test("question no-gates — exit 4, resume.argv is the invocation's argv, nothing ran, and the emitted round trip reaches done", () => {
  withFixture({ scripts: null }, ({ dir }) => {
    const args = fresh();
    const q = runCli(dir, args);
    assert.equal(q.code, 4, q.raw);
    assert.equal(q.doc.reason_code, "no-gates");
    assert.deepEqual(q.doc.resume.argv, args, "A2/N3: the original argv, unchanged");
    assert.ok(!q.doc.resume.argv.includes("--gates"));
    assert.equal(existsSync(join(dir, VERIFY_PATHS.gates)), false, "init wrote nothing");
    assert.deepEqual(gateLogs(dir), []);
    const nr = runCli(dir, ["--resume"]);
    assert.equal(nr.code, 2);
    assert.equal(nr.doc.reason_code, "no-progress", "nothing before the drain leaves a record");
    // N5 — the EMITTED object's own resume.argv and option, through the SHIPPED substituteArgv.
    const opt = q.doc.options.find((o) => o.argv !== null);
    const done = runCli(dir, [...q.doc.resume.argv, ...substituteArgv(opt.argv, "true::stub")]);
    assert.equal(done.code, 0, done.raw);
    assert.equal(done.doc.status, "done");
    assert.equal(readReport(dir).gate_run.source, "explicit");
  });
});

// ── CONTAINMENT AND RESUME ──────────────────────────────────────────────────────────────────────────
test("path-containment — a symlinked .pharn, a dangling one, a symlinked .pharn/pharn-verify and a symlinked feature dir", () => {
  const outsideOf = () => realpathSync(mkdtempSync(join(tmpdir(), "sv-link-")));
  const cases = [
    [
      "a symlinked .pharn",
      (dir, out) => {
        rmSync(join(dir, ".pharn"), { recursive: true, force: true });
        symlinkSync(out, join(dir, ".pharn"));
      },
    ],
    [
      "a dangling .pharn",
      (dir) => {
        rmSync(join(dir, ".pharn"), { recursive: true, force: true });
        symlinkSync(join(dir, "nowhere"), join(dir, ".pharn"));
      },
    ],
    [
      "a symlinked .pharn/pharn-verify",
      (dir, out) => {
        mkdirSync(join(dir, ".pharn"), { recursive: true });
        symlinkSync(out, join(dir, VERIFY_PATHS.root));
      },
    ],
    [
      "a symlinked feature directory",
      (dir, out) => {
        renameSync(join(dir, FEATURE_DIR), join(out, "moved"));
        symlinkSync(join(out, "moved"), join(dir, FEATURE_DIR));
      },
    ],
  ];
  for (const [label, link] of cases) {
    withFixture({ anchor: false }, ({ dir }) => {
      const out = outsideOf();
      try {
        const before = readdirSync(out, { recursive: true }).sort();
        link(dir, out);
        const r = runCli(dir, fresh());
        assert.equal(r.code, 2, `${label}: ${r.raw}`);
        assert.equal(r.doc.reason_code, "path-containment", label);
        assert.deepEqual(
          readdirSync(out, { recursive: true })
            .sort()
            .filter((p) => !p.startsWith("moved")),
          before,
          `${label}: nothing written through the link`
        );
        if (existsSync(join(out, "moved"))) {
          assert.ok(!existsSync(join(out, "moved", "VERIFY.md")) && !existsSync(join(out, "moved", "verify-report.json")), label);
        }
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    });
  }
});

test("--resume re-walks containment — a feature directory swapped for a link between continue and resume is refused", () => {
  withFixture({}, ({ dir }) => {
    const r = runCli(dir, fresh(["--gates", "true::a,true::b", "--budget-ms", "1"]));
    assert.equal(r.code, 5, r.raw);
    const out = realpathSync(mkdtempSync(join(tmpdir(), "sv-swap-")));
    try {
      renameSync(join(dir, FEATURE_DIR), join(out, "moved"));
      symlinkSync(join(out, "moved"), join(dir, FEATURE_DIR));
      const res = runCli(dir, ["--resume", "--budget-ms", "600000"]);
      assert.equal(res.code, 2, res.raw);
      assert.equal(res.doc.reason_code, "path-containment");
      assert.ok(
        !existsSync(join(out, "moved", "VERIFY.md")) && !existsSync(join(out, "moved", "verify-report.json")),
        "nothing written through the link"
      );
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

test("★ G9 — a feature directory swapped for a link DURING the drain is refused at the render; the no-walk mutant writes through", () => {
  const run = (cliSource) => {
    const out = realpathSync(mkdtempSync(join(tmpdir(), "sv-indrain-")));
    const target = join(out, "demo");
    const committed = { "swap.sh": `#!/bin/sh\nmv ${FEATURE_DIR} '${target}' && ln -s '${target}' ${FEATURE_DIR}\n` };
    try {
      return withFixture({ committed, cliSource }, ({ dir }) => {
        const r = runCli(dir, fresh(["--gates", "sh swap.sh::swap"]));
        return { r, wroteThrough: existsSync(join(target, "verify-report.json")) || existsSync(join(target, "VERIFY.md")) };
      });
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  };
  const real = run(null);
  assert.equal(real.r.code, 2, real.r.raw);
  assert.equal(real.r.doc.reason_code, "path-containment");
  assert.equal(real.wroteThrough, false, "nothing written through the swapped-in link");

  const noWalk = mutate(
    readFileSync(CLI_SRC, "utf8"),
    "function writeIntoFeature(feature, relPath, bytes) {\n  containmentGuard(feature);\n",
    "function writeIntoFeature(feature, relPath, bytes) {\n"
  );
  const mutant = run(noWalk);
  assert.equal(mutant.wroteThrough, true, "the mutant (no pre-write walk) writes through the link — what the walk prevents");
});

test("--resume refusals: no record, a malformed one, every non-resumable phase, and the argv forms", () => {
  withFixture({ anchor: false }, ({ dir }) => {
    let r = runCli(dir, ["--resume"]);
    assert.equal(r.doc.reason_code, "no-progress");
    mkdirSync(join(dir, VERIFY_PATHS.root), { recursive: true });
    writeFileSync(join(dir, VERIFY_PATHS.stageJson), "{not json");
    r = runCli(dir, ["--resume"]);
    assert.equal(r.doc.reason_code, "progress-malformed");
    const rec = (phase) => ({
      schema: PROGRESS_SCHEMA,
      feature: FEATURE,
      timeoutMs: 30000,
      budgetMs: null,
      phase,
      verifiers: { registered: 0, verifiers: [] },
    });
    const outside = PHASES.filter((p) => !RESUMABLE_PHASES.includes(p));
    assert.equal(outside.length, 6, "non-vacuity: every non-resumable phase is tested (G11)");
    for (const phase of outside) {
      writeFileSync(join(dir, VERIFY_PATHS.stageJson), JSON.stringify(rec(phase)));
      r = runCli(dir, ["--resume"]);
      assert.equal(r.doc.reason_code, "progress-malformed", phase);
      assert.equal(r.doc.feature, FEATURE, "a named slug is carried on the refusal");
    }
    for (const argv of [
      ["--resume", "--gates", "x"],
      ["--resume", "--budget-ms"],
      ["--resume", "--budget-ms", "100", "100"],
    ]) {
      r = runCli(dir, argv);
      assert.equal(r.code, 2);
      assert.equal(r.doc.reason_code, "usage-error", JSON.stringify(argv));
    }
  });
});

// ── G11 — the checkpointed set IS the resumable set ─────────────────────────────────────────────────
const CHECKPOINT_RE = /\bcheckpoint\(\s*state\s*,\s*"([a-z-]+)"\s*\)/g;

test("★ G11 — the phase literals passed to the checkpoint writer are exactly RESUMABLE_PHASES", () => {
  const lits = [...readFileSync(CLI_SRC, "utf8").matchAll(CHECKPOINT_RE)].map((m) => m[1]);
  assert.deepEqual([...new Set(lits)].sort(), [...RESUMABLE_PHASES].sort());
});

test("★ G11 discriminates — a third checkpoint literal fails the same comparison", () => {
  const src = `${readFileSync(CLI_SRC, "utf8")}\ncheckpoint(state, "render");\n`;
  const lits = [...src.matchAll(CHECKPOINT_RE)].map((m) => m[1]);
  assert.notDeepEqual([...new Set(lits)].sort(), [...RESUMABLE_PHASES].sort());
});

// ── G8 — a resume parked at verdict reproduces the report over an UNCHANGED tree, and only then ──────
test("G8 — a record parked at verdict after a completed run resumes to a byte-identical report; a moved AC file changes it", () => {
  withFixture({}, ({ dir }) => {
    assert.equal(runCli(dir, fresh()).code, 0);
    const first = readFileSync(join(dir, REPORT));
    const park = () => {
      const rec = {
        schema: PROGRESS_SCHEMA,
        feature: FEATURE,
        timeoutMs: 30000,
        budgetMs: null,
        phase: "verdict",
        verifiers: { registered: 0, verifiers: [] },
      };
      assert.deepEqual(validateProgress(rec), { ok: true });
      writeFileSync(join(dir, VERIFY_PATHS.stageJson), JSON.stringify(rec));
    };
    park();
    let r = runCli(dir, ["--resume"]);
    assert.equal(r.code, 0, r.raw);
    assert.deepEqual(readFileSync(join(dir, REPORT)), first, "the same stamp over an unchanged tree reproduces the report byte for byte");
    // Control (the narrowed bound): the AC gate reads live files — an AC mapping appearing beside a legacy SPEC.
    writeFileSync(join(dir, FEATURE_DIR, "AC-TESTS.md"), "---\nspec_id: demo\n---\n\n## Files\n\n## Mapping\n");
    park();
    r = runCli(dir, ["--resume"]);
    assert.equal(r.code, 0, r.raw);
    assert.notDeepEqual(readFileSync(join(dir, REPORT)), first, "a moved tree may compose a different report — the bound, demonstrated");
    assert.equal(readReport(dir).verdict, "FAIL");
  });
});

// ── ARGV (M7) ───────────────────────────────────────────────────────────────────────────────────────
test("M7 — a bad --timeout-ms, a trailing --budget-ms, an unknown flag and a positional are each usage-error up front", () => {
  withFixture({ anchor: false }, ({ dir }) => {
    for (const args of [
      ["--feature", FEATURE, "--timeout-ms", "50"],
      ["--feature", FEATURE, "--timeout-ms", "1234567890"],
      ["--feature", FEATURE, "--timeout-ms", "30000", "--budget-ms"],
      ["--feature", FEATURE, "--timeout-ms", "30000", "--bogus"],
      ["--feature", FEATURE, "--timeout-ms", "30000", "stray"],
      ["--feature", FEATURE, "--timeout-ms", "30000", "--gates", ""],
    ]) {
      const r = runCli(dir, args);
      assert.equal(r.code, 2, JSON.stringify(args));
      assert.equal(r.doc.reason_code, "usage-error", JSON.stringify(args));
      assert.equal(r.doc.feature, FEATURE);
      assert.equal(existsSync(join(dir, VERIFY_PATHS.gates)), false);
    }
    assert.match(runCli(dir, ["--feature", FEATURE, "--timeout-ms", "30000", "--budget-ms"]).doc.detail, /--budget-ms requires a value/);
  });
});

// ── ★ THE BUDGET ────────────────────────────────────────────────────────────────────────────────────
test("★ budget — --budget-ms 1 advances exactly ONE slow step per invocation and reaches the unbudgeted run's verdict", () => {
  withFixture({}, ({ dir }) => {
    const gates = ["--gates", "true::a,true::b,true::c"];
    const unbudgeted = runCli(dir, fresh(gates));
    assert.equal(unbudgeted.code, 0, unbudgeted.raw);
    const want = readReport(dir);
    assert.deepEqual(Object.keys(want.gates).sort(), ["a", "b", "c", "reconcile"], "none of the gates is skipped");

    let r = runCli(dir, fresh([...gates, "--budget-ms", "1"]));
    const ran = [];
    while (r.code === 5) {
      assert.equal(r.doc.phase, "drain");
      ran.push(JSON.parse(readFileSync(join(dir, VERIFY_PATHS.gates, "state.json"), "utf8")).runs.length);
      assert.ok(ran.length < 10, "the budget loop never converges");
      r = runCli(dir, ["--resume", "--budget-ms", "1"]);
    }
    assert.equal(r.code, 0, r.raw);
    assert.deepEqual(ran, [1, 2, 3], "each invocation advanced exactly one slow step; the fourth ran reconcile and finished");
    const got = readReport(dir);
    for (const k of ["verdict", "failing_gates", "gates", "ac_gate"]) assert.deepEqual(got[k], want[k], `${k} diverged`);
  });
});

test("★ budget clock — the opening work counts: a slow first `git ls-files` exhausts a 2 s window; the old-clock mutant does not", () => {
  const realGit = execFileSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).trim();
  const run = (budgetMs, cliSource = null) => {
    const shimDir = mkdtempSync(join(tmpdir(), "sv-gitshim-"));
    const marker = join(shimDir, "slowed");
    // ONLY the first `ls-files` of the run is slow — the stage's own pairs listing, before init; every later one
    // (the runner's fingerprints) is fast, so the stop is the budget's reading of the OPENING work.
    writeFileSync(
      join(shimDir, "git"),
      `#!/bin/sh\nif [ "$1" = ls-files ] && [ ! -f '${marker}' ]; then : > '${marker}'; sleep 3; fi\nexec "${realGit}" "$@"\n`
    );
    chmodSync(join(shimDir, "git"), 0o755);
    try {
      return withFixture({ cliSource }, ({ dir }) =>
        runCli(dir, fresh(["--gates", "true::a,true::b", "--budget-ms", String(budgetMs)]), {
          env: { ...CLEAN_ENV, PATH: `${shimDir}:${CLEAN_ENV.PATH}` },
        })
      );
    } finally {
      rmSync(shimDir, { recursive: true, force: true });
    }
  };
  const stopped = run(32000);
  assert.equal(stopped.code, 5, stopped.raw);
  assert.equal(stopped.doc.phase, "drain");
  const control = run(90000);
  assert.equal(control.code, 0, `a 60 s window runs through: ${control.raw}`);

  const oldClock = mutate(
    readFileSync(CLI_SRC, "utf8"),
    '  const state = { feature, timeoutMs: cfg.timeoutMs, budgetMs: cfg.budgetMs, phase: "drain", verifiers };\n  return runPhases(state, makeBudget(state, invocationStart));',
    '  const state = { feature, timeoutMs: cfg.timeoutMs, budgetMs: cfg.budgetMs, phase: "drain", verifiers };\n  return runPhases(state, makeBudget(state, Date.now()));'
  );
  const mutant = run(32000, oldClock);
  assert.equal(mutant.code, 0, "the old-clock mutant never charges the opening work, so it runs through — the edit this test catches");
});

// ── ★ KILL MID-DRAIN ────────────────────────────────────────────────────────────────────────────────
async function killMidDrain(cliSource) {
  const committed = { "slow.sh": "#!/bin/sh\n: > .pharn/slow-started\nwhile [ ! -f .pharn/slow-release ]; do sleep 0.1; done\nexit 0\n" };
  const fx = fixture({ committed, cliSource });
  try {
    const child = spawn(process.execPath, ["pharn/floor/stage-verify.mjs", ...fresh(["--gates", "sh slow.sh::slow,true::b"])], {
      cwd: fx.dir,
      env: CLEAN_ENV,
      stdio: "ignore",
      detached: true,
    });
    const t0 = Date.now();
    while (!existsSync(join(fx.dir, ".pharn/slow-started")) && Date.now() - t0 < 60000) await new Promise((res) => setTimeout(res, 50));
    assert.ok(existsSync(join(fx.dir, ".pharn/slow-started")), "the slow gate never started within 60 s");
    process.kill(-child.pid, "SIGKILL"); // the stage's whole process group, as a harness kill would
    await new Promise((res) => (child.exitCode !== null || child.signalCode !== null ? res() : child.once("exit", res)));
    const phase = existsSync(join(fx.dir, VERIFY_PATHS.stageJson))
      ? JSON.parse(readFileSync(join(fx.dir, VERIFY_PATHS.stageJson), "utf8")).phase
      : null;
    writeFileSync(join(fx.dir, ".pharn/slow-release"), ""); // lets the orphaned gate (its own process group) exit
    let r;
    for (let i = 0; i < 40; i++) {
      r = runCli(fx.dir, ["--resume", "--budget-ms", "600000"]);
      const busy = r.code === 2 && r.doc && r.doc.reason_code === "child-refused" && /parallel calls are refused/.test(r.doc.detail);
      if (!busy) break;
      await new Promise((res) => setTimeout(res, 250));
    }
    return { phase, r };
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
}

test("★ Kill — a SIGKILL while a gate runs leaves the record at drain, and --resume reaches done; dropping the drain checkpoint loses it", async () => {
  const real = await killMidDrain(null);
  assert.equal(real.phase, "drain", "the drain-top checkpoint was persisted before the gate ran");
  assert.equal(real.r.code, 0, real.r.raw);
  assert.equal(real.r.doc.status, "done");

  const noCheckpoint = mutate(readFileSync(CLI_SRC, "utf8"), '    checkpoint(state, "drain");\n', "");
  const mutant = await killMidDrain(noCheckpoint);
  assert.equal(mutant.phase, null, "the mutant persisted nothing before the kill");
  assert.equal(mutant.r.code, 2);
  assert.equal(mutant.r.doc.reason_code, "no-progress", "…so its resume has nothing to resume — the edit this test catches");
});

// ── VERIFIERS (counted, never run) ──────────────────────────────────────────────────────────────────
test("verifiers — one registered verifier is counted with the deferral note; the verdict equals the zero-verifier control", () => {
  const verdictOf = (committed) =>
    withFixture({ committed }, ({ dir }) => {
      const r = runCli(dir, fresh());
      assert.equal(r.code, 0, r.raw);
      return { report: readReport(dir), md: readFileSync(join(dir, RENDER), "utf8") };
    });
  const none = verdictOf({});
  const one = verdictOf({ "caps/v/verifier.md": "---\nrole: verifier\n---\n\nA verifier.\n" });
  assert.equal(none.report.verifiers.registered, 0);
  assert.equal(one.report.verifiers.registered, 1);
  assert.match(one.report.verifiers.note, /deferred/);
  assert.match(one.md, /1 verifier\(s\) registered — the live verifier runner is deferred/);
  assert.equal(one.report.verdict, none.report.verdict, "a registered verifier never flips the verdict");
});

// ── CRASH PATHS — a crash is never read as a verdict ────────────────────────────────────────────────
test("crash — a throwing check-build-complete.mjs is child-crashed before any gate, never an INCOMPLETE report", () => {
  withFixture({ floor: { "check-build-complete.mjs": 'throw new Error("boom");\n' } }, ({ dir }) => {
    const r = runCli(dir, fresh());
    assert.equal(r.code, 2, r.raw);
    assert.equal(r.doc.reason_code, "child-crashed");
    assert.match(r.doc.detail, /check-build-complete\.mjs/);
    assert.equal(existsSync(join(dir, REPORT)), false, "no INCOMPLETE report");
    assert.deepEqual(gateLogs(dir), [], "no gate ran");
  });
});

test("crash — a check-verify.mjs that throws after printing nothing is child-crashed, never FAIL (exit 1 is FAIL's code)", () => {
  withFixture({ floor: { "check-verify.mjs": 'throw new Error("boom");\n' } }, ({ dir }) => {
    const r = runCli(dir, fresh());
    assert.equal(r.code, 2, r.raw);
    assert.equal(r.doc.reason_code, "child-crashed");
    assert.equal(existsSync(join(dir, REPORT)), false);
  });
  withFixture({}, ({ dir }) => assert.equal(runCli(dir, fresh()).code, 0, "the control reaches done"));
});

// ── ★ CLOSURE over the emitted reason codes ─────────────────────────────────────────────────────────
const REASON_CODE_CALL_RE = /\b(?:emitUnusable|emitQuestion|writeRefusedAndEmit)\(\s*[^,]+,\s*"([a-z][a-z-]*)"/g;

test("★ CLOSURE — every reason_code literal stage-verify.mjs emits is a registered verify code, and every code has an emitter", () => {
  const lits = [...readFileSync(CLI_SRC, "utf8").matchAll(REASON_CODE_CALL_RE)].map((m) => m[1]);
  assert.ok(lits.length > 0, "the scan must find something");
  const registered = new Set(allReasonCodes("verify"));
  for (const l of lits) assert.ok(registered.has(l), `stage-verify.mjs emits '${l}', not in the verify registry`);
  assert.deepEqual([...new Set(lits)].sort(), [...registered].sort());
  assert.equal(REGISTRY.verify.refused.length, 3);
  assert.equal(Object.keys(REGISTRY.verify.question).length, 1);
  assert.equal(REGISTRY.verify.unusable.length, 8);
  assert.deepEqual(Object.keys(EXIT_CODE).sort(), ["continue", "done", "question", "refused", "unusable"]);
});

test("★ CLOSURE discriminates — an injected variant spelling fails the scan", () => {
  const lits = [...'emitUnusable(cfg.feature, "child-crashd", "x");'.matchAll(REASON_CODE_CALL_RE)].map((m) => m[1]);
  assert.deepEqual(lits, ["child-crashd"]);
  assert.equal(new Set(allReasonCodes("verify")).has("child-crashd"), false);
});
