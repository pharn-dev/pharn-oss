// pharn/floor/check-bash-reconcile.test.mjs — behaviour pins for the Bash-write reconciler.
//
// ★ = a case the increment exists for.  ✧ = a PIN (wiring/parity that must not silently drift).
//
// Fixtures are throwaway `git init` repos, because the reconciled set is derived from git's own ignore
// rules — a fixture that faked the enumeration would test a different program (lessons-learned L26: a
// patch verified against a copy under different rules is verified under different rules).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { matchesAny, loadIgnoreData, isAlwaysReconciled, isPipelineArtifact, VERDICTS } from "./check-bash-reconcile.mjs";
import { RECORD_PATH } from "./reconcile-baseline.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const ANCHOR = join(HERE, "reconcile-baseline.mjs");
const CHECK = join(HERE, "check-bash-reconcile.mjs");
const IGNORE_JSON = join(HERE, "reconcile-ignore.json");

const made = [];
function makeRepo({ devRepo = true, gitignore = "node_modules/\n.pharn/\nrunned/\n" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-recon-test-"));
  made.push(dir);
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  git("config", "user.email", "t@example.invalid");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), gitignore);
  // The checker resolves both guards from <root>/.claude/hooks — copy the REAL ones so the fixture is
  // judged by the same code the repo runs.
  mkdirSync(join(dir, ".claude/hooks"), { recursive: true });
  for (const h of ["protect-trusted-paths.cjs", "enforce-writes-scope.cjs", "set-writes-scope.cjs"]) {
    cpSync(join(REPO, ".claude/hooks", h), join(dir, ".claude/hooks", h));
  }
  if (devRepo) mkdirSync(join(dir, ".dev/floor"), { recursive: true });
  else writeFileSync(join(dir, "pharn.config.json"), JSON.stringify({ skillsVersion: "9.9.9" }) + "\n");
  mkdirSync(join(dir, "features"), { recursive: true });
  writeFileSync(join(dir, "features/keep.md"), "seed\n");
  git("add", "-A");
  git("commit", "-q", "-m", "seed");
  return dir;
}

process.on("exit", () => {
  for (const d of made) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
});

function setScope(dir, scope) {
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(
    join(dir, ".pharn/writes-scope.json"),
    JSON.stringify({ scope, set_by: "features/t/PLAN.md", set_at: new Date().toISOString() }, null, 2) + "\n"
  );
}
const anchor = (dir, extra = []) =>
  spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "test", ...extra], { encoding: "utf8" });
function check(dir, extra = []) {
  const r = spawnSync(process.execPath, [CHECK, "--base", dir, ...extra], { encoding: "utf8" });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* leave null; the assertion will show stdout */
  }
  return { status: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

// ------------------------------------------------------------------ the cases the increment exists for

test("★ ESCAPE: a Bash write to a path outside the declared scope is detected and exits 1", () => {
  const dir = makeRepo();
  setScope(dir, ["features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "SNEAKY.txt"), "written outside the guarded surface\n");
  const r = check(dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "ESCAPE");
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["SNEAKY.txt"]
  );
  assert.equal(r.json.findings[0].severity, "blocking");
  assert.equal(r.json.findings[0].file, "SNEAKY.txt");
});

test("★ CLEAN: a Bash write INSIDE the declared scope is not an escape", () => {
  const dir = makeRepo();
  setScope(dir, ["features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "features/keep.md"), "rewritten in scope\n");
  const r = check(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "CLEAN");
  assert.equal(r.json.reconciled, 1, "the path WAS reconciled — it was judged, not skipped");
  assert.deepEqual(r.json.escapes, []);
});

test("★ NON-VACUITY CONTROL (L34): the suite cannot pass by reporting everything clean", () => {
  // The mirror of the test above, same fixture shape, opposite expectation. Without this, a checker
  // hard-wired to return CLEAN would satisfy every green assertion in this file.
  const dir = makeRepo();
  setScope(dir, ["features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "features/keep.md"), "in scope\n");
  writeFileSync(join(dir, "OUT.txt"), "out of scope\n");
  const r = check(dir);
  assert.equal(r.json.verdict, "ESCAPE");
  assert.equal(r.json.reconciled, 2, "both paths reconciled");
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["OUT.txt"],
    "exactly the out-of-scope one — not all, not none"
  );
});

test("★ no-scope FAIL-CLOSED: with no scope set, the default is delegated to the live hook", () => {
  const dir = makeRepo({ devRepo: true }); // dev posture: features/**, .dev/features/**, pharn/pharn-*/**
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "features/allowed.md"), "inside the default safe-set\n");
  writeFileSync(join(dir, "ROOT-FILE.md"), "root files are denied by the default\n");
  const r = check(dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["ROOT-FILE.md"]
  );
  assert.equal(r.json.escapes[0].denied_by, "writes-scope (fail-closed default)");
});

test("★ no-scope: the INSTALL posture is delegated too — `.dev/features/**` is NOT in an install's default", () => {
  const dir = makeRepo({ devRepo: false }); // pharn.config.json carries skillsVersion => install posture
  mkdirSync(join(dir, ".dev/features"), { recursive: true });
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, ".dev/features/x.md"), "dev-only path, install posture\n");
  const r = check(dir);
  assert.equal(r.status, 1, "an install's default does not admit .dev/features/**");
  assert.equal(r.json.escapes[0].file, ".dev/features/x.md");
});

test("★ ignored-path exemption: a git-ignored write is invisible by derivation", () => {
  const dir = makeRepo();
  setScope(dir, ["features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  mkdirSync(join(dir, "node_modules"), { recursive: true });
  writeFileSync(join(dir, "node_modules/whatever.js"), "ignored\n");
  writeFileSync(join(dir, ".pharn/scratch.json"), "{}\n");
  const r = check(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "CLEAN");
});

test("★ control surface is ALWAYS reconciled — even with no baseline at all", () => {
  const dir = makeRepo();
  // No anchor. Ordinary-path detection is unavailable, but the control surface falls back to HEAD blobs.
  writeFileSync(join(dir, ".claude/hooks/enforce-writes-scope.cjs"), "// disarmed\n");
  const r = check(dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "ESCAPE");
  assert.equal(r.json.escapes[0].file, ".claude/hooks/enforce-writes-scope.cjs");
});

test("★ control surface cannot be exempted, even if it appears in the scope snapshot", () => {
  const dir = makeRepo();
  setScope(dir, [".claude/hooks/enforce-writes-scope.cjs"]); // a forged scope naming a guard
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, ".claude/hooks/enforce-writes-scope.cjs"), "// disarmed\n");
  const r = check(dir);
  assert.equal(r.status, 1, "protect-trusted-paths denies it regardless of any scope");
  assert.equal(r.json.escapes[0].denied_by, "protect-trusted-paths.cjs");
});

test("★ memory-bank canon reached through Bash is an escape (THREAT-MODEL §2 #3)", () => {
  const dir = makeRepo();
  setScope(dir, ["features/keep.md"]);
  mkdirSync(join(dir, ".dev/memory-bank"), { recursive: true });
  writeFileSync(join(dir, ".dev/memory-bank/lessons-learned.md"), "## L1 — seed\n");
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["commit", "-q", "-m", "canon"], { cwd: dir, stdio: "pipe" });
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, ".dev/memory-bank/lessons-learned.md"), "## L1 — seed\n## L2 — poisoned\n");
  const r = check(dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(r.json.escapes[0].file, ".dev/memory-bank/lessons-learned.md");
});

// --------------------------------------------------------------------------- verdict / WARN vs RED

test("NO_BASELINE is GREEN by design, and --require-baseline turns it into a refusal", () => {
  const dir = makeRepo();
  const green = check(dir);
  assert.equal(green.status, 0);
  assert.equal(green.json.verdict, "NO_BASELINE");
  const red = check(dir, ["--require-baseline"]);
  assert.equal(red.status, 2);
  assert.equal(red.json.verdict, "INCONCLUSIVE");
});

test("a malformed baseline is INCONCLUSIVE, never a reassuring CLEAN", () => {
  const dir = makeRepo();
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, RECORD_PATH), "{ not json");
  assert.equal(check(dir).status, 2);
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify({ version: 1, epoch: "x" }));
  const r = check(dir);
  assert.equal(r.status, 2);
  assert.equal(r.json.verdict, "INCONCLUSIVE");
});

test("a FUTURE schema version is INCONCLUSIVE; an OLDER one is tolerated at read with a warning", () => {
  const dir = makeRepo();
  setScope(dir, ["features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify({ ...rec, version: 99 }));
  assert.equal(check(dir).status, 2, "a record this reader cannot understand is a refusal");
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify({ ...rec, version: 0 }));
  const old = check(dir);
  assert.equal(old.status, 0, "legacy records are tolerated at read");
  assert.ok(old.json.warnings.some((w) => /older/.test(w)));
});

test("a DELETION is a warning, not an escape — nothing was written", () => {
  const dir = makeRepo();
  setScope(dir, ["features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  rmSync(join(dir, "features/keep.md"));
  const r = check(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(r.json.warnings.some((w) => w.includes("features/keep.md")));
});

test("an absent guard is INCONCLUSIVE — no guard, no premise to reconcile against", () => {
  const dir = makeRepo();
  assert.equal(anchor(dir).status, 0);
  rmSync(join(dir, ".claude/hooks/enforce-writes-scope.cjs"));
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 2);
  assert.match(r.json.reason, /guard is absent/);
});

test("the verdict enum is CLOSED — every emitted verdict is a member (L29: iterate the set)", () => {
  const dir = makeRepo();
  const seen = new Set();
  seen.add(check(dir).json.verdict); // NO_BASELINE
  seen.add(check(dir, ["--require-baseline"]).json.verdict); // INCONCLUSIVE
  setScope(dir, ["features/keep.md"]);
  anchor(dir);
  seen.add(check(dir).json.verdict); // CLEAN
  writeFileSync(join(dir, "X.txt"), "x\n");
  seen.add(check(dir).json.verdict); // ESCAPE
  for (const v of seen) assert.ok(VERDICTS.includes(v), `${v} is not in the declared enum`);
  assert.equal(seen.size, VERDICTS.length, "every declared verdict is reachable — none is dead");
});

// ----------------------------------------------------------------------------------- ✧ PARITY PINS

test("✧ PARITY: globToRegExp agrees with enforce-writes-scope.cjs, verified by EXECUTING the hook", () => {
  // The one duplicated matcher. Compared by running the real hook, not by reading it (L37).
  const dir = makeRepo();
  const hook = join(dir, ".claude/hooks/enforce-writes-scope.cjs");
  const cases = [
    { scope: ["src/app.ts"], path: "src/app.ts" },
    { scope: ["src/app.ts"], path: "src/other.ts" },
    { scope: ["src/**"], path: "src/a/b/c.ts" },
    { scope: ["src/*"], path: "src/a/b/c.ts" },
    { scope: ["src/*.ts"], path: "src/a.ts" },
    { scope: ["pharn/pharn-*/**"], path: "pharn/pharn-core/x.md" },
    { scope: ["pharn/pharn-*/**"], path: "pharn/floor/x.mjs" },
    { scope: ["a.b.c"], path: "aXbXc" },
    { scope: ["features/**"], path: "features/x/PLAN.md" },
  ];
  for (const c of cases) {
    setScope(dir, c.scope);
    const r = spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: c.path } }),
      cwd: dir,
      encoding: "utf8",
    });
    const hookAllows = r.status === 0;
    assert.equal(
      matchesAny(c.path, c.scope),
      hookAllows,
      `parity broke for scope ${JSON.stringify(c.scope)} / path ${c.path}: hook ${hookAllows ? "allowed" : "denied"}`
    );
  }
});

test("✧ PARITY: always_reconciled.exact equals the guards' own control-surface sets", () => {
  const data = loadIgnoreData(IGNORE_JSON);
  const setter = readFileSync(join(REPO, ".claude/hooks/set-writes-scope.cjs"), "utf8");
  const control = eval(setter.match(/const CONTROL_SURFACE\s*=\s*(\[[\s\S]*?\])/)[1]);
  assert.deepEqual([...data.alwaysExact].sort(), [...control].sort(), "reconcile-ignore.json drifted from CONTROL_SURFACE");

  const protect = readFileSync(join(REPO, ".claude/hooks/protect-trusted-paths.cjs"), "utf8");
  const protected_ = eval(protect.match(/const DEFAULT_PROTECTED\s*=\s*(\[[\s\S]*?\n\])/)[1]);
  for (const p of control) {
    assert.ok(protected_.includes(p), `${p} is control surface but not in DEFAULT_PROTECTED`);
  }
});

test("✧ never_exempt holds the canon + trusted-doc set, and run-time REFUSES an exemption of one", () => {
  const data = loadIgnoreData(IGNORE_JSON);
  for (const p of [
    ".dev/memory-bank/lessons-learned.md",
    "memory-bank/lessons-learned.md",
    "pharn/CONSTITUTION.md",
    "pharn/ARCHITECTURE.md",
    "THREAT-MODEL.md",
    "LIMITS.md",
    "CODEOWNERS",
  ]) {
    assert.ok(data.neverExempt.includes(p), `${p} must be never-exempt`);
  }
  // The refusal is enforced in loadIgnoreData itself, so a bad edit fails closed at RUN time.
  const bad = mkdtempSync(join(tmpdir(), "pharn-recon-ign-"));
  made.push(bad);
  const raw = JSON.parse(readFileSync(IGNORE_JSON, "utf8"));
  raw.exempt.paths.push({ path: "LIMITS.md", writer: "forged" });
  writeFileSync(join(bad, "reconcile-ignore.json"), JSON.stringify(raw));
  const res = loadIgnoreData(join(bad, "reconcile-ignore.json"));
  assert.equal(res.ok, false);
  assert.match(res.reason, /never_exempt/);
});

test("✧ every exempt entry names a writer, and the tracked exemption set stays TINY", () => {
  const raw = JSON.parse(readFileSync(IGNORE_JSON, "utf8"));
  for (const e of raw.exempt.paths) {
    assert.ok(typeof e.writer === "string" && e.writer.length > 0, `${e.path} has no writer`);
    assert.ok(typeof e.why === "string" && e.why.length > 0, `${e.path} has no why`);
  }
  assert.ok(raw.exempt.paths.length <= 3, "an exemption set that grows is the rule being swallowed — justify before raising");
});

test("✧ isAlwaysReconciled covers the prefixes as well as the exact members", () => {
  const data = loadIgnoreData(IGNORE_JSON);
  assert.ok(isAlwaysReconciled("pharn/floor/check-verify.mjs", data));
  assert.ok(isAlwaysReconciled(".dev/floor/check-provenance.mjs", data));
  assert.ok(isAlwaysReconciled(".claude/settings.json", data));
  assert.ok(!isAlwaysReconciled("features/x/PLAN.md", data));
});

// --------------------------------------------------------------------------------- ✧ WIRING PINS

test("✧ WIRING: package.json runs the checker, and it is in the `check` chain", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.match(pkg.scripts["check:reconcile"] ?? "", /check-bash-reconcile\.mjs/);
  assert.match(pkg.scripts.check, /check:reconcile/);
});

test("✧ WIRING: ci.yml runs it as its own step — ci.yml never invokes `npm run check`", () => {
  // The check-version-badge precedent: `check`-only wiring would never fire on a PR, because ci.yml
  // runs each script individually.
  const ci = readFileSync(join(REPO, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /check:reconcile|check-bash-reconcile\.mjs/, "ci.yml does not invoke the reconciler");
  assert.ok(!/npm run check\s*$/m.test(ci), "premise of this pin: ci.yml runs scripts individually");
});

test("✧ WIRING: both verify commands run the checker and read its exit code", () => {
  for (const cmd of ["pharn-verify.md", "pharn-dev-verify.md"]) {
    const body = readFileSync(join(REPO, ".claude/commands", cmd), "utf8");
    assert.match(body, /check-bash-reconcile\.mjs/, `${cmd} does not run the reconciler`);
    assert.match(body, /--require-baseline/, `${cmd} must require a baseline — a build ran`);
  }
});

test("✧ WIRING: both build commands anchor the baseline in their first step", () => {
  for (const cmd of ["pharn-build.md", "pharn-dev-build.md"]) {
    const body = readFileSync(join(REPO, ".claude/commands", cmd), "utf8");
    assert.match(body, /reconcile-baseline\.mjs --anchor/, `${cmd} does not anchor`);
    const setter = body.indexOf("set-writes-scope.cjs");
    const anchorAt = body.indexOf("reconcile-baseline.mjs --anchor");
    assert.ok(setter >= 0 && anchorAt > setter, `${cmd}: the anchor must follow the scope-setter, so the scope is snapshotted`);
  }
});

test("★ L17: a stage's OWN pipeline artifact is exempt — changed-since-anchor must not report as scope-escape", () => {
  const dir = makeRepo();
  mkdirSync(join(dir, ".dev/features/x/lenses/security"), { recursive: true });
  setScope(dir, ["features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, ".dev/features/x/PLAN.md"), "the plan is the scope SOURCE, not a scope member\n");
  writeFileSync(join(dir, ".dev/features/x/VERIFY.md"), "written by the verify stage, after the build's anchor\n");
  writeFileSync(join(dir, ".dev/features/x/lenses/security/findings.json"), "[]\n");
  const r = check(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.exempted.length, 3);
  // ...but a STRAY file under the same directory is still reported — the enum is exact, not a `**` glob.
  writeFileSync(join(dir, ".dev/features/x/sneaky.txt"), "not a pipeline artifact\n");
  const r2 = check(dir);
  assert.equal(r2.status, 1);
  assert.deepEqual(
    r2.json.escapes.map((e) => e.file),
    [".dev/features/x/sneaky.txt"]
  );
});

test("✧ PARITY: pipeline_artifacts.names equals check-regress.mjs's PIPELINE_ARTIFACTS", () => {
  const raw = JSON.parse(readFileSync(IGNORE_JSON, "utf8"));
  const regress = readFileSync(join(HERE, "check-regress.mjs"), "utf8");
  const theirs = eval(regress.match(/const PIPELINE_ARTIFACTS\s*=\s*(\[[\s\S]*?\n\])/)[1]);
  assert.deepEqual([...raw.pipeline_artifacts.names].sort(), [...theirs].sort(), "the two artifact enums drifted — update both");
});

test("✧ the pipeline-artifact slug is shape-gated — `..` cannot build a traversing exemption", () => {
  const data = loadIgnoreData(IGNORE_JSON);
  assert.equal(isPipelineArtifact("features/../PLAN.md", data), false);
  assert.equal(isPipelineArtifact(".dev/features/../../PLAN.md", data), false);
  assert.equal(isPipelineArtifact("features/x/PLAN.md", data), true);
  assert.equal(isPipelineArtifact(".dev/features/x/SHIP.md", data), true);
  assert.equal(isPipelineArtifact("features/x/other.md", data), false, "exact enum membership, never a glob");
});

test("✧ the contract exists and declares the verdict enum this file iterates", () => {
  const contract = readFileSync(join(REPO, "pharn/pharn-contracts/reconciliation-record.md"), "utf8");
  for (const v of VERDICTS) assert.ok(contract.includes(v), `contract does not name ${v}`);
});
