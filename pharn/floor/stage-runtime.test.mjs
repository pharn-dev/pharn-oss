// pharn/floor/stage-runtime.test.mjs — the shared stage-script mechanics (GATE 1 Q1): each argv rule over members
// and non-members (M7a/b/c), the containment walk over every link kind (L54), the budget tracker at the exact
// boundary, the drain's three outcomes through the REAL runner, a one-owner pin over both stage scripts, and the
// closure-parity test GRILL G3 demands — the regress suite's own fixture regex, run transitively over
// `stage-regress.mjs`, must reach this module and every module it names.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync, realpathSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  flag,
  has,
  scanFlags,
  parseTimeoutMs,
  parseBudgetMs,
  parseResumeArgv,
  lstatSafe,
  containmentWalk,
  atomicWrite,
  gitSync,
  nulList,
  makeBudget,
  drainGates,
} from "./stage-runtime.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── argv rules ──────────────────────────────────────────────────────────────────────────────────────
test("flag/has: the first occurrence's value; a trailing flag has no value; absence is undefined", () => {
  assert.equal(flag(["--a", "1", "--a", "2"], "--a"), "1");
  assert.equal(flag(["--a"], "--a"), undefined);
  assert.equal(flag([], "--a"), undefined);
  assert.equal(has(["--a"], "--a"), true);
  assert.equal(has([], "--a"), false);
});

test("scanFlags: known flags pass; a positional and an unknown flag are refused, first in argv order", () => {
  const known = new Set(["--feature", "--gates", "--no-x"]);
  const value = new Set(["--feature", "--gates"]);
  assert.deepEqual(scanFlags(["--feature", "demo", "--no-x", "--gates", "a,b"], known, value), { ok: true });
  assert.deepEqual(scanFlags(["--feature", "demo", "stray"], known, value), {
    ok: false,
    detail: 'unexpected positional argument "stray"',
  });
  assert.deepEqual(scanFlags(["--bogus", "--feature", "x"], known, value), { ok: false, detail: 'unrecognized flag "--bogus"' });
  assert.deepEqual(scanFlags(["--gates", "--bogus"], known, value), { ok: true }, "a value flag consumes the next token");
});

test("M7(a) parseTimeoutMs: 3-9 digits (run --next's own rule); everything else refused", () => {
  for (const good of ["100", "540000", "999999999"])
    assert.deepEqual(parseTimeoutMs(["--timeout-ms", good]), { ok: true, value: Number(good) });
  for (const bad of [
    [],
    ["--timeout-ms"],
    ["--timeout-ms", "50"],
    ["--timeout-ms", "1234567890"],
    ["--timeout-ms", "-500"],
    ["--timeout-ms", "5e3"],
  ]) {
    const r = parseTimeoutMs(bad);
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.equal(r.detail, "--timeout-ms is required and must be a 3-9 digit positive integer (matches run-gates.mjs run --next)");
  }
});

test("M7(b) parseBudgetMs: absent is null; a trailing flag with no value is refused, never 'unbudgeted'", () => {
  assert.deepEqual(parseBudgetMs([]), { ok: true, value: null });
  assert.deepEqual(parseBudgetMs(["--budget-ms", "0"]), { ok: true, value: 0 });
  assert.deepEqual(parseBudgetMs(["--budget-ms", "570000"]), { ok: true, value: 570000 });
  assert.deepEqual(parseBudgetMs(["--budget-ms"]), { ok: false, detail: "--budget-ms requires a value" });
  assert.deepEqual(parseBudgetMs(["--budget-ms", "-1"]), { ok: false, detail: "--budget-ms must be a non-negative integer" });
  assert.deepEqual(parseBudgetMs(["--budget-ms", "--resume"]), { ok: false, detail: "--budget-ms must be a non-negative integer" });
});

test("M7(c) parseResumeArgv: only --budget-ms <n>; a stray duplicate number is refused (by-index scan)", () => {
  assert.deepEqual(parseResumeArgv(["--resume"]), { ok: true, budgetOverride: undefined });
  assert.deepEqual(parseResumeArgv(["--resume", "--budget-ms", "100"]), { ok: true, budgetOverride: 100 });
  assert.deepEqual(parseResumeArgv(["--resume", "--budget-ms", "100", "100"]), {
    ok: false,
    detail: '--resume accepts only --budget-ms; got "100"',
  });
  assert.deepEqual(parseResumeArgv(["--resume", "--gates", "x"]), {
    ok: false,
    detail: '--resume accepts only --budget-ms; got "--gates"',
  });
  // The one composition difference, named in the module header: parseResumeArgv ALONE accepts a value-less
  // trailing --budget-ms (regress's 6.23.0 behaviour); stage-verify.mjs ALSO applies parseBudgetMs, which refuses it.
  assert.deepEqual(parseResumeArgv(["--resume", "--budget-ms"]), { ok: true, budgetOverride: undefined });
  assert.equal(parseBudgetMs(["--resume", "--budget-ms"]).ok, false);
});

// ── containment (L54) ───────────────────────────────────────────────────────────────────────────────
test("containmentWalk: a regular path and an absent tail pass; a live link, a dangling link and an outside path refuse", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "rt-contain-")));
  const outside = realpathSync(mkdtempSync(join(tmpdir(), "rt-outside-")));
  try {
    mkdirSync(join(root, "a", "b"), { recursive: true });
    assert.deepEqual(containmentWalk(root, join(root, "a", "b")), { ok: true });
    assert.deepEqual(containmentWalk(root, join(root, "a", "absent", "deeper")), { ok: true }, "lstat's ENOENT is the only absence");
    symlinkSync(outside, join(root, "live"));
    assert.equal(containmentWalk(root, join(root, "live", "x")).ok, false, "a live link component refuses");
    symlinkSync(join(root, "nowhere"), join(root, "dangling"));
    assert.equal(containmentWalk(root, join(root, "dangling")).ok, false, "a DANGLING link refuses — existsSync would call it absent");
    assert.equal(containmentWalk(root, root).ok, false, "the root itself refuses");
    assert.equal(containmentWalk(root, outside).ok, false, "a path outside the root refuses");
    writeFileSync(join(root, "file"), "x");
    assert.deepEqual(
      containmentWalk(root, join(root, "file", "under")),
      { ok: false, reason: `cannot lstat ${join(root, "file", "under")}: ${lstatSafe(join(root, "file", "under")).reason}` },
      "a file component refuses"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("atomicWrite: the artifact lands, and no tmp file is left beside it or under the tmp dir", () => {
  const root = mkdtempSync(join(tmpdir(), "rt-atomic-"));
  const cwd = process.cwd();
  try {
    process.chdir(root);
    atomicWrite(".pharn/x", "pharn/features/demo/VERIFY.md", "hello\n");
    assert.equal(readFileSync(join(root, "pharn/features/demo/VERIFY.md"), "utf8"), "hello\n");
    assert.deepEqual(execFileSync("ls", ["-A", join(root, ".pharn/x")], { encoding: "utf8" }), "");
    assert.deepEqual(execFileSync("ls", ["-A", join(root, "pharn/features/demo")], { encoding: "utf8" }).trim(), "VERIFY.md");
  } finally {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("gitSync/nulList: an argv vector, never shell text; a failure is data, never a throw", () => {
  assert.equal(gitSync(["--version"]).ok, true);
  const bad = gitSync(["definitely-not-a-git-subcommand"]);
  assert.equal(bad.ok, false);
  assert.equal(typeof bad.stderr, "string");
  assert.deepEqual(nulList("a\0b c\0\0"), ["a", "b c"]);
});

// ── the budget tracker ──────────────────────────────────────────────────────────────────────────────
test("★ makeBudget: the first slow step always starts; then the exact boundary elapsed + N === B starts and +1 does not", (t) => {
  let now = 1_000_000;
  t.mock.method(Date, "now", () => now);
  const state = { timeoutMs: 100, budgetMs: 150 };
  const b = makeBudget(state, 1_000_000);
  now = 1_000_000 + 999_999;
  assert.equal(b.may(), true, "the first slow step of the invocation always starts");
  b.spent();
  now = 1_000_050; // elapsed 50 + 100 === 150
  assert.equal(b.may(), true, "elapsed + timeout === budget starts");
  now = 1_000_051; // elapsed 51 + 100 === 151 > 150
  assert.equal(b.may(), false, "one millisecond over does not");
  state.budgetMs = null;
  assert.equal(b.may(), true, "state is read at CALL time — an unbudgeted state always starts");
});

test("makeBudget: the clock is the CALLER's invocationStart — opening work before the tracker is built is charged", (t) => {
  let now = 5_000;
  t.mock.method(Date, "now", () => now);
  const b = makeBudget({ timeoutMs: 100, budgetMs: 150 }, 0); // the invocation began 5 s before the tracker
  b.spent();
  assert.equal(b.may(), false, "5000 elapsed + 100 > 150: the opening work counts");
  const late = makeBudget({ timeoutMs: 100, budgetMs: 150 }, 5_000); // the OLD clock: started at the tracker
  late.spent();
  assert.equal(late.may(), true, "the old-clock control: the same moment reads as fresh");
});

// ── the drain, through the REAL runner ──────────────────────────────────────────────────────────────
function runnerRepo() {
  const dir = mkdtempSync(join(tmpdir(), "rt-drain-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  writeFileSync(join(dir, "a.txt"), "a\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  return dir;
}

function inDir(dir, fn) {
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(cwd);
  }
}

function initGates(dir, out) {
  const r = spawnSync(
    process.execPath,
    [join(HERE, "run-gates.mjs"), "init", "--stage", "verify", "--feature", "demo", "--out", out, "--gates", "true::a,true::b"],
    {
      cwd: dir,
      encoding: "utf8",
    }
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
}

test("★ drainGates — {kind: budget} starts nothing when the budget forbids the first call it is asked about", () => {
  const dir = runnerRepo();
  try {
    initGates(dir, ".pharn/g");
    const res = inDir(dir, () =>
      drainGates({ outDir: ".pharn/g", timeoutMs: 30000, budget: { may: () => false, spent: () => assert.fail("nothing ran") } })
    );
    assert.deepEqual(res, { kind: "budget" });
    assert.equal(JSON.parse(readFileSync(join(dir, ".pharn/g/state.json"), "utf8")).runs.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ drainGates — {kind: done} after every entry ran (each counted once), and an idempotent repeat is done too", () => {
  const dir = runnerRepo();
  try {
    initGates(dir, ".pharn/g");
    let spent = 0;
    const budget = { may: () => true, spent: () => spent++ };
    assert.deepEqual(
      inDir(dir, () => drainGates({ outDir: ".pharn/g", timeoutMs: 30000, budget })),
      { kind: "done" }
    );
    assert.equal(spent, 3, "a, b and the injected reconcile — each a slow step");
    assert.ok(existsSync(join(dir, ".pharn/g/stamp.json")));
    assert.deepEqual(
      inDir(dir, () => drainGates({ outDir: ".pharn/g", timeoutMs: 30000, budget })),
      { kind: "done" },
      "exit 3 is an idempotent repeat"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ drainGates — {kind: refused} carries the runner's parsed refusal for the CALLER to word", () => {
  const dir = runnerRepo();
  try {
    const res = inDir(dir, () => drainGates({ outDir: ".pharn/none", timeoutMs: 30000, budget: { may: () => true, spent: () => {} } }));
    assert.equal(res.kind, "refused");
    assert.equal(res.status, 2);
    assert.equal(res.parsed.reason_code, "stamp-missing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── ONE OWNER over both stage scripts ───────────────────────────────────────────────────────────────
const OWNED = [
  "flag",
  "has",
  "scanFlags",
  "parseTimeoutMs",
  "parseBudgetMs",
  "parseResumeArgv",
  "lstatSafe",
  "containmentWalk",
  "atomicWrite",
  "gitSync",
  "nulList",
  "makeBudget",
  "drainGates",
];
const SCRIPTS = ["stage-regress.mjs", "stage-verify.mjs"];
const definesRe = (name) => new RegExp(`(?:\\bfunction\\s+${name}\\s*\\(|\\b(?:const|let|var)\\s+${name}\\s*=)`);

test("★ ONE OWNER — neither stage script defines a mechanic stage-runtime.mjs owns; both import it", () => {
  assert.equal(OWNED.length, 13, "non-vacuity: the owned set is counted");
  const runtime = readFileSync(join(HERE, "stage-runtime.mjs"), "utf8");
  for (const name of OWNED) assert.match(runtime, new RegExp(`export function ${name}\\(`), `stage-runtime.mjs must export ${name}`);
  for (const s of SCRIPTS) {
    const src = readFileSync(join(HERE, s), "utf8");
    assert.match(src, /from "\.\/stage-runtime\.mjs";/, `${s} must import the runtime`);
    for (const name of OWNED) assert.doesNotMatch(src, definesRe(name), `${s} defines its own ${name}`);
  }
});

test("★ ONE OWNER discriminates — a local definition injected into a script's source is caught", () => {
  const src = readFileSync(join(HERE, "stage-verify.mjs"), "utf8");
  assert.match(`${src}\nfunction lstatSafe(p) { return p; }\n`, definesRe("lstatSafe"));
  assert.match(`${src}\nconst makeBudget = () => 1;\n`, definesRe("makeBudget"));
});

// ── GRILL G3 — CLOSURE PARITY with the regress suite's own fixture regex ────────────────────────────
// `stage-regress.test.mjs` (unchanged, GATE 1 condition 1) copies the floor modules this regex finds in string
// literals, transitively from stage-regress.mjs. If the runtime were imported by a computed path, the unchanged
// fixture would lack it and every ★ WIRING run would crash.
const FIXTURE_RE = /["'](?:\.\/)?([a-z0-9-]+\.mjs)["']/g;

function fixtureClosure(start, read) {
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const m = queue.shift();
    if (seen.has(m)) continue;
    seen.add(m);
    for (const [, dep] of read(m).matchAll(FIXTURE_RE)) {
      if (!dep.endsWith(".test.mjs") && existsSync(join(HERE, dep))) queue.push(dep);
    }
  }
  return seen;
}

const readReal = (m) => readFileSync(join(HERE, m), "utf8");

test("★ G3 — the regress fixture regex reaches stage-runtime.mjs and every module it names", () => {
  const closure = fixtureClosure("stage-regress.mjs", readReal);
  assert.ok(closure.has("stage-runtime.mjs"), "the fixture closure must carry the runtime");
  const named = [...readReal("stage-runtime.mjs").matchAll(FIXTURE_RE)].map((m) => m[1]).filter((d) => !d.endsWith(".test.mjs"));
  assert.ok(named.includes("run-gates.mjs") && named.includes("stage-exit-core.mjs"), `the runtime names its children literally: ${named}`);
  for (const d of named) assert.ok(closure.has(d), `the closure misses ${d}, which stage-runtime.mjs needs`);
});

test("★ G3 discriminates — a COMPUTED import path drops the runtime from the closure", () => {
  const mutated = readReal("stage-regress.mjs").replace('from "./stage-runtime.mjs";', 'from `./stage-${"runtime"}.mjs`;');
  assert.notEqual(mutated, readReal("stage-regress.mjs"), "the mutation must land");
  const closure = fixtureClosure("stage-regress.mjs", (m) => (m === "stage-regress.mjs" ? mutated : readReal(m)));
  assert.equal(
    closure.has("stage-runtime.mjs"),
    false,
    "a computed path must be invisible to the fixture regex — the parity test's reason to exist"
  );
});
