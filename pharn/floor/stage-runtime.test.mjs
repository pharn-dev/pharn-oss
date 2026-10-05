// pharn/floor/stage-runtime.test.mjs — the shared stage-script mechanics (GATE 1 Q1): each argv rule over members
// and non-members (M7a/b/c), the containment walk over every link kind (L54), the stale-output removal rule (only
// ENOENT is absence — and, end to end, the regress CLI's crash on an unremovable earlier report, GATE 2 F5), the
// budget tracker at the exact boundary, the drain's three outcomes through the REAL runner, a one-owner pin over
// both stage scripts, and the closure-parity test GRILL G3 demands — the regress suite's own fixture regex, run
// transitively over `stage-regress.mjs`, must reach this module and every module it names.
// Since 6.28.3 (stage-git-maxbuffer): gitSync over a real listing past node's 1 MiB default, gitFailureDetail live and
// total, and two static closures — ★ GIT CEILING over every shipped floor module's git spawns, and ★ GIT-FAILED DETAIL
// over the stage scripts' `git-failed` emissions. Each closure states its bounds in its own section, below.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
  existsSync,
  realpathSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStageExit } from "./stage-exit-core.mjs";
import {
  flag,
  has,
  scanFlags,
  parseTimeoutMs,
  parseBudgetMs,
  parseResumeArgv,
  lstatSafe,
  containmentWalk,
  removeIfPresent,
  atomicWrite,
  gitSync,
  gitFailureDetail,
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

test("removeIfPresent: a file is removed and absence (ENOENT) is quiet; any OTHER unlink error propagates (GRILL G2)", () => {
  const root = mkdtempSync(join(tmpdir(), "rt-remove-"));
  try {
    const file = join(root, "report.json");
    writeFileSync(file, "{}");
    removeIfPresent(file);
    assert.equal(existsSync(file), false, "a present file is removed");
    assert.doesNotThrow(() => removeIfPresent(file), "absence is the normal case");
    assert.doesNotThrow(() => removeIfPresent(join(root, "no-such-dir", "report.json")), "a missing parent is ENOENT too");
    const dir = join(root, "occupied.json");
    mkdirSync(join(dir, "inner"), { recursive: true });
    assert.throws(
      () => removeIfPresent(dir),
      (e) => e.code !== "ENOENT",
      "a directory at the path is not absence: the error propagates (EPERM on darwin, EISDIR on Linux)"
    );
    assert.ok(existsSync(dir), "…and nothing was removed");
  } finally {
    rmSync(root, { recursive: true, force: true });
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
    assert.equal(spent, 4, "a, b and the two injected entries (instruction-growth, reconcile) — each a slow step");
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
  "removeIfPresent",
  "atomicWrite",
  "gitSync",
  "gitFailureDetail",
  "nulList",
  "makeBudget",
  "drainGates",
];
const SCRIPTS = ["stage-regress.mjs", "stage-verify.mjs"];
const definesRe = (name) => new RegExp(`(?:\\bfunction\\s+${name}\\s*\\(|\\b(?:const|let|var)\\s+${name}\\s*=)`);

test("★ ONE OWNER — neither stage script defines a mechanic stage-runtime.mjs owns; both import it", () => {
  assert.equal(OWNED.length, 15, "non-vacuity: the owned set is counted");
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
  // The mutation lands in EVERY module of the closure that imports the runtime literally. Since 6.28.0 there are two:
  // stage-regress.mjs and scope-inputs.mjs (loop-quick-mode GATE 2) — mutating one alone would leave the runtime
  // reachable through the other, and the test would no longer show the regex's blind spot.
  const LITERAL = 'from "./stage-runtime.mjs";';
  const COMPUTED = 'from `./stage-${"runtime"}.mjs`;';
  const importers = [...fixtureClosure("stage-regress.mjs", readReal)].filter((m) => readReal(m).includes(LITERAL));
  assert.ok(
    importers.includes("stage-regress.mjs") && importers.includes("scope-inputs.mjs"),
    `the runtime's literal importers in the regress closure: ${importers}`
  );
  const read = (m) => (importers.includes(m) ? readReal(m).replace(LITERAL, COMPUTED) : readReal(m));
  for (const m of importers) assert.notEqual(read(m), readReal(m), `the mutation must land in ${m}`);
  const closure = fixtureClosure("stage-regress.mjs", read);
  assert.equal(
    closure.has("stage-runtime.mjs"),
    false,
    "a computed path must be invisible to the fixture regex — the parity test's reason to exist"
  );
});

// ── ★ F5 (GATE 2 review) — the regress CLI no longer swallows a failed stale-report removal ─────────────────────
// Before the fix, `stage-regress.mjs`'s "fresh" phase caught EVERY unlink error, so an earlier
// `regression-report.json` that could not be removed survived beside the later stop — the reviewer's probe: a bad
// `--timeout-ms` then exited 2 `usage-error` with the earlier report still on disk, falsifying "every stop after the
// slug leaves no report". The fixture runs its OWN copy of the regress floor (the closure the fixture regex finds), so
// the mutant can restore the catch-all in that copy's `stage-runtime.mjs` without touching this repository.
function regressFixture({ runtimeSource = null, plant = true } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "rt-f5-")));
  mkdirSync(join(dir, "pharn", "floor"), { recursive: true });
  for (const m of fixtureClosure("stage-regress.mjs", readReal)) copyFileSync(join(HERE, m), join(dir, "pharn", "floor", m));
  if (runtimeSource !== null) writeFileSync(join(dir, "pharn", "floor", "stage-runtime.mjs"), runtimeSource);
  mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
  // An earlier report that CANNOT be removed: a non-empty directory at its path (unlink → EPERM/EISDIR, never ENOENT).
  if (plant) {
    const occupied = join(dir, "pharn", "features", "demo", "regression-report.json", "occupied");
    mkdirSync(occupied, { recursive: true });
    writeFileSync(join(occupied, "f"), "x");
  }
  return dir;
}

function runRegress(dir) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  // A bad --timeout-ms: validated AFTER the removal, so the only question is what the removal did.
  return spawnSync(process.execPath, ["pharn/floor/stage-regress.mjs", "--feature", "demo", "--timeout-ms", "50", "--no-install"], {
    cwd: dir,
    encoding: "utf8",
    env,
  });
}

test("★ F5 — an unremovable earlier regression-report.json CRASHES stage-regress.mjs (exit 1, no document); the catch-all mutant reports usage-error over it", () => {
  const dirs = [];
  try {
    // Control: the same fixture with nothing planted reaches the ordinary usage-error, so the harness itself works.
    const control = regressFixture({ plant: false });
    dirs.push(control);
    const c = runRegress(control);
    assert.equal(c.status, 2, c.stdout + c.stderr);
    assert.equal(JSON.parse(c.stdout).reason_code, "usage-error");

    const real = regressFixture();
    dirs.push(real);
    const r = runRegress(real);
    assert.equal(r.status, 1, `a failed removal must be a crash, never a verdict: ${r.stdout}${r.stderr}`);
    assert.equal(r.stdout, "", "a crash prints NO stage-exit document");
    assert.match(r.stderr, /^stage-regress: /m, "the crash reaches stderr through the script's own top-level catch");
    assert.ok(existsSync(join(real, "pharn/features/demo/regression-report.json")), "precondition: the removal really failed");

    // The mutant: stage-runtime.mjs's ENOENT test replaced by a catch-all — regress's pre-fix behaviour.
    const src = readReal("stage-runtime.mjs");
    const rule = '    if (e && e.code === "ENOENT") return;\n    throw e;';
    assert.ok(src.includes(rule), "mutation anchor not found in stage-runtime.mjs (L60)");
    const mutantDir = regressFixture({ runtimeSource: src.replace(rule, "    return;") });
    dirs.push(mutantDir);
    const m = runRegress(mutantDir);
    assert.equal(m.status, 2, "the mutant swallows the failure and goes on to refuse argv — the edit this test catches");
    const doc = JSON.parse(m.stdout);
    assert.deepEqual(validateStageExit(doc), { ok: true });
    assert.equal(doc.reason_code, "usage-error");
    assert.ok(existsSync(join(mutantDir, "pharn/features/demo/regression-report.json")), "…with the earlier report still on disk");
  } finally {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
});

// ── ★ THE GIT OUTPUT CEILING (stage-git-maxbuffer, 6.28.3) — a listing past node's 1 MiB default ─────────────────────
// L41: the limit no hermetic fixture reached, so only production met it. This fixture really crosses it and the code
// under test is the real gitSync — no injected buffer anywhere. The stage suites cross it through each stage script.
const LISTING_MIN_BYTES = (1 << 20) + (1 << 18); // 1.25 MiB: past node's 1 MiB default, with room to spare

/** Empty files three 250-byte directory levels deep: each path is 766 bytes, so ~1,700 files list past
 *  LISTING_MIN_BYTES (bytes are what maxBuffer counts, not files) while an absolute path stays under darwin's 1,024-byte
 *  PATH_MAX. Returns the repo-relative paths and the exact length of their `-z` listing (each path plus its NUL). */
function bigTree(root) {
  const dir = ["big", "a".repeat(250), "b".repeat(250), "c".repeat(250)].join("/");
  mkdirSync(join(root, dir), { recursive: true });
  const paths = [];
  let bytes = 0;
  for (let i = 0; bytes <= LISTING_MIN_BYTES; i++) {
    const p = `${dir}/${String(i).padStart(5, "0")}.txt`;
    writeFileSync(join(root, p), "");
    paths.push(p);
    bytes += Buffer.byteLength(p) + 1;
  }
  return { paths, bytes };
}

test("★ gitSync — a `-z` listing past node's 1 MiB default comes back whole; the same call at the default buffer is ENOBUFS (L40)", () => {
  const dir = runnerRepo();
  try {
    const { paths, bytes } = bigTree(dir);
    const args = ["ls-files", "-z", "--others", "--exclude-standard"];
    assert.ok(bytes > 1 << 20, `anchor (L60): the fixture lists ${bytes} bytes, past the 1 MiB default`);
    // THE ATTRIBUTION CONTROL (L40): gitSync's call before 6.28.3 — the same options, no ceiling — over the same fixture.
    assert.throws(
      () => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
      (e) => e.code === "ENOBUFS",
      "at node's default buffer the same listing fails ENOBUFS — the stop the review reproduced"
    );
    const r = inDir(dir, () => gitSync(args));
    assert.equal(r.ok, true, r.detail);
    assert.equal(Buffer.byteLength(r.stdout), bytes, "every byte of the listing");
    assert.deepEqual(nulList(r.stdout).sort(), [...paths].sort(), "every path, as git printed it");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("gitFailureDetail — a spawn error names node's code; git's own failure keeps its message and gains its exit status", () => {
  // Live ENOENT: no git on PATH. The control: that call's raw stderr, which the detail quoted before 6.28.3, is empty.
  const saved = process.env.PATH;
  let noGit;
  try {
    process.env.PATH = join(tmpdir(), "pharn-no-such-dir-for-git");
    noGit = gitSync(["--version"]);
  } finally {
    process.env.PATH = saved;
  }
  assert.equal(noGit.ok, false);
  assert.equal(noGit.stderr, "", "control: the stderr the old detail quoted is empty");
  assert.equal(noGit.detail, "node error ENOENT");

  // Live non-zero exits in a repo, with a message and without one (`--quiet`).
  const dir = runnerRepo();
  try {
    const said = inDir(dir, () => gitSync(["rev-parse", "--verify", "no-such-ref"]));
    assert.equal(said.ok, false);
    assert.match(said.detail, /^fatal: .+ \(git exited 128\)$/);
    const quiet = inDir(dir, () => gitSync(["rev-parse", "--verify", "--quiet", "no-such-ref"]));
    assert.equal(quiet.ok, false);
    assert.equal(quiet.detail, "git exited 1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // Shapes a live run here cannot produce cheaply: ENOBUFS (each stage suite produces it live, through a mutant), a
  // signal, a Buffer stderr, and an error carrying none of the fields.
  assert.equal(gitFailureDetail({ code: "ENOBUFS", stderr: "", status: 0 }), "node error ENOBUFS: git's output exceeded the read buffer");
  assert.equal(gitFailureDetail({ status: null, signal: "SIGKILL", stderr: "" }), "git was killed by SIGKILL");
  assert.equal(gitFailureDetail({ stderr: Buffer.from("fatal: x\n"), status: 2 }), "fatal: x (git exited 2)");
  assert.equal(gitFailureDetail(new Error("plain")), "git failed with no exit status, signal or error code");
});

test("gitFailureDetail is TOTAL (L62) — hostile and odd shapes yield text, never a throw", () => {
  const hostileJson = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostileJson), TypeError, "control: String() really throws on this parsed-JSON shape");
  const trap = new Proxy(
    {},
    {
      get() {
        throw new Error("read trap");
      },
    }
  );
  assert.throws(() => trap.stderr, /read trap/, "control: the Proxy really throws on a read");
  const shapes = [
    undefined,
    null,
    0,
    "text",
    [],
    hostileJson,
    { code: hostileJson },
    { stderr: hostileJson },
    { signal: hostileJson },
    { status: "128" },
    Object.create(null),
    trap,
  ];
  // The label is the shape's INDEX: describing the Proxy (even Object.prototype.toString) reads a trapped property.
  shapes.forEach((v, i) => {
    let out;
    assert.doesNotThrow(() => {
      out = gitFailureDetail(v);
    }, `shape #${i}`);
    assert.equal(typeof out, "string", `shape #${i}`);
    assert.ok(out.length > 0, `shape #${i}: never empty`);
  });
  assert.equal(gitFailureDetail(trap), "git failed (its error could not be read)");
  assert.equal(gitFailureDetail({ status: "128" }), "git failed with no exit status, signal or error code", "a string is no exit status");
});

// ── ★ GIT CEILING — every git spawn in a shipped floor module that can print a listing carries a maxBuffer ──────────
// (stage-git-maxbuffer, GATE 1 Q2.) The discipline was followed by three listing calls and missed by two — gitSync and
// render-review-assignments.mjs's merge-base diff — so it is held here rather than left to a comment (L20, L25).
// THE RULE, closed over the corpus (L36): every non-test pharn/floor/*.mjs is scanned for a child_process call whose
// first argument is the string `git`, the call's full text is read, and `maxBuffer` must appear in it unless its first
// literal subcommand is in BOUNDED. A variable argv (gitSync, render-run-report.mjs's `git()`) counts as a listing.
// THE ENUMERATION (L29, L34): the spawns found must equal GIT_SPAWNS file by file, so a new or removed spawn fails until
// it is listed here in the same diff.
// BOUNDS, stated where the check lives (GATE 1 Q2; GRILL G1, G2):
//   • PRESENCE, not magnitude: `maxBuffer: 1024` passes. gitSync's real ceiling is pinned by the crossing test above.
//   • Only the spelling it finds: a call named execFileSync, spawnSync, execSync, execFile, spawn or exec whose first
//     argument is the literal `"git"`, `'git'` or a backquoted git. A git run through a variable command name, a shell
//     string, child_process reached another way, or a wrapper script is invisible to it.
//   • The exemption is by NAME: `rev-parse --all` or `merge-base --all` prints more than one SHA and would still pass.
//   • Comments: a match whose line holds `//` before it, or starts with `*`, is skipped. A real spawn after a `//`
//     inside a string on the same line would be skipped (a false GREEN); a spawn quoted inside a block comment whose
//     lines do not start with `*` would be counted (a false RED, which the pinned map exposes).
const GIT_SPAWN_RE = /\b(?:execFileSync|spawnSync|execSync|execFile|spawn|exec)\(\s*(["'`])git\1/g;
const BOUNDED = new Set(["rev-parse", "merge-base"]);
const GIT_SPAWNS = {
  "check-bash-reconcile.mjs": ["diff"],
  "instruction-files.mjs": [null, null],
  "reconcile-baseline.mjs": ["ls-files"],
  "render-review-assignments.mjs": ["merge-base", "rev-parse", "diff"],
  "render-run-report.mjs": [null],
  "render-ship-briefing.mjs": ["rev-parse"],
  "run-gates.mjs": ["rev-parse"],
  "stage-runtime.mjs": [null],
};

/** The source text of the call named at `start`, through the `)` that closes its `(` — string literals and comments
 *  skipped, so a `)` inside either does not close it. Null when it never closes. */
function callText(src, start) {
  let depth = 0;
  for (let i = src.indexOf("(", start); i >= 0 && i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      if (end === -1) return null;
      i = end;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end === -1) return null;
      i = end + 1;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

/** A match on a comment line — `//` before it on its line, or a line starting with `*` — is no call (bounds above). */
function onCommentLine(src, index) {
  const before = src.slice(src.lastIndexOf("\n", index) + 1, index);
  return before.includes("//") || /^\s*\*/.test(before);
}

/** Every git spawn in `sources` ({file: text}), with its call text and its first literal subcommand (null: variable). */
function scanSpawns(sources) {
  const out = [];
  for (const [file, src] of Object.entries(sources)) {
    for (const m of src.matchAll(GIT_SPAWN_RE)) {
      if (onCommentLine(src, m.index)) continue;
      const text = callText(src, m.index);
      const sub = text === null ? null : (text.match(/^\w+\(\s*["'`]git["'`]\s*,\s*\[\s*["']([^"']+)["']/)?.[1] ?? null);
      out.push({ file, sub, text });
    }
  }
  return out;
}

const ceilingViolations = (spawns) => spawns.filter((s) => s.text === null || (!BOUNDED.has(s.sub) && !/\bmaxBuffer\b/.test(s.text)));

function floorSources() {
  const out = {};
  for (const f of readdirSync(HERE).sort()) {
    if (f.endsWith(".mjs") && !f.endsWith(".test.mjs")) out[f] = readFileSync(join(HERE, f), "utf8");
  }
  return out;
}

test("★ GIT CEILING — every git spawn in a shipped floor module is listed, and each that can print a listing carries a maxBuffer", () => {
  const spawns = scanSpawns(floorSources());
  const map = {};
  for (const s of spawns) (map[s.file] ??= []).push(s.sub);
  assert.deepEqual(map, GIT_SPAWNS, "the enumeration (L29): list a new or removed git spawn here in the same diff");
  assert.equal(spawns.length, 11, "non-vacuity (L34): the eleven spawns the sweep found");
  assert.deepEqual(
    ceilingViolations(spawns).map((s) => `${s.file}: ${s.text}`),
    [],
    "a git spawn that can print a listing runs at node's 1 MiB default"
  );
  assert.match(spawns.find((s) => s.file === "stage-runtime.mjs").text, /maxBuffer: GIT_MAX_BUFFER/, "gitSync carries the ceiling");
});

test("★ GIT CEILING discriminates — each property has a falsifier (L60)", () => {
  const real = floorSources();
  const without = (file, anchor) => {
    assert.ok(real[file].includes(anchor), `mutation anchor not found in ${file} (L60): ${anchor}`);
    return { ...real, [file]: real[file].replace(anchor, "") };
  };
  // (a) gitSync without its ceiling, (b) the review emitter's diff without its ceiling: each is flagged, alone.
  assert.deepEqual(
    ceilingViolations(scanSpawns(without("stage-runtime.mjs", ", maxBuffer: GIT_MAX_BUFFER"))).map((s) => s.file),
    ["stage-runtime.mjs"]
  );
  assert.deepEqual(
    ceilingViolations(scanSpawns(without("render-review-assignments.mjs", "      maxBuffer: 1 << 28,\n"))).map((s) => `${s.file}:${s.sub}`),
    ["render-review-assignments.mjs:diff"]
  );
  // (c) synthetic sources: the rule by subcommand (and a variable argv), a `)` string and a comment inside a call, and
  // the comment-line skip.
  const synthetic = scanSpawns({
    "a.mjs": 'execFileSync("git", ["ls-files"], { cwd });\n',
    "b.mjs": 'spawnSync("git", ["rev-parse", "HEAD"]);\n',
    "c.mjs": 'execFileSync("git", ["diff", ")"], {\n  // a ) and an apostrophe\'s in a comment\n  maxBuffer: 1,\n});\n',
    "d.mjs": "execFileSync('git', args, {});\n",
    "e.mjs": '// execFile("git", [x]) in a comment\n * spawn("git", ["ls-files"]) in a block comment line\n',
  });
  assert.deepEqual(
    synthetic.map((s) => `${s.file}:${s.sub}`),
    ["a.mjs:ls-files", "b.mjs:rev-parse", "c.mjs:diff", "d.mjs:null"],
    "four calls found; e.mjs's two comment lines are none"
  );
  assert.deepEqual(
    ceilingViolations(synthetic).map((s) => s.file),
    ["a.mjs", "d.mjs"],
    "a listing and a variable argv without a ceiling"
  );
  assert.match(
    synthetic.find((s) => s.file === "c.mjs").text,
    /maxBuffer: 1,\n\}\)$/,
    "the `)` string and the comment did not close the call"
  );
});

// ── ★ GIT-FAILED DETAIL — every `git-failed` emission quotes gitSync's failure cause, never raw stderr ─────────────────
// (stage-git-maxbuffer.) Before 6.28.3 each quoted `.stderr`, which an ENOBUFS left empty, so the stop named no cause.
// The enumeration is the ten emissions (L29), counted per module (L34). BOUND: a lexical scan — an emission is a call to
// `emitUnusable(` or `inconclusive(` whose text holds the literal "git-failed"; one built any other way is not seen.
const DETAIL_SITES = { "stage-regress.mjs": 8, "stage-verify.mjs": 1, "quick-scope-core.mjs": 1 };
const EMIT_RE = /\b(?:emitUnusable|inconclusive)\(/g;

function gitFailedCalls(src) {
  const out = [];
  for (const m of src.matchAll(EMIT_RE)) {
    if (onCommentLine(src, m.index)) continue;
    const text = callText(src, m.index);
    if (text !== null && text.includes('"git-failed"')) out.push(text);
  }
  return out;
}

test("★ GIT-FAILED DETAIL — every git-failed emission quotes `.detail` and never `.stderr`", () => {
  for (const [file, n] of Object.entries(DETAIL_SITES)) {
    const calls = gitFailedCalls(readFileSync(join(HERE, file), "utf8"));
    assert.equal(calls.length, n, `${file}: ${n} git-failed emission(s)`);
    for (const c of calls) {
      assert.match(c, /\.detail\b/, `${file}: ${c}`);
      assert.doesNotMatch(c, /\.stderr\b/, `${file}: ${c}`);
    }
  }
});

test("★ GIT-FAILED DETAIL discriminates — a `.detail` swapped back to `.stderr` is caught (L60)", () => {
  const src = readFileSync(join(HERE, "stage-verify.mjs"), "utf8");
  const anchor = "dataText(ls.detail)";
  assert.ok(src.includes(anchor), "mutation anchor not found in stage-verify.mjs (L60)");
  const [call] = gitFailedCalls(src.replace(anchor, "dataText(ls.stderr)"));
  assert.match(call, /\.stderr\b/);
  assert.doesNotMatch(call, /\.detail\b/, "the mutant fails the rule the test above applies");
});
