// pharn/floor/check-bash-reconcile.test.mjs — behaviour pins for the Bash-write reconciler.
//
// ★ = a case the increment exists for.  ✧ = a PIN (wiring/parity that must not silently drift).
//
// Fixtures are throwaway `git init` repos, because the reconciled set is derived from git's own ignore
// rules — a fixture that faked the enumeration would test a different program (lessons-learned L26: a
// patch verified against a copy under different rules is verified under different rules).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, symlinkSync, unlinkSync, chmodSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  matchesAny,
  loadIgnoreData,
  isAlwaysReconciled,
  isHumanOnly,
  HUMAN_ONLY_REMEDY,
  isPipelineArtifact,
  activeFeatureSlug,
  makeDefaultProbeSandbox,
  VERDICTS,
} from "./check-bash-reconcile.mjs";
import { RECORD_PATH, buildRecord, hashFile } from "./reconcile-baseline.mjs";

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
  mkdirSync(join(dir, "pharn", "features"), { recursive: true });
  writeFileSync(join(dir, "pharn/features/keep.md"), "seed\n");
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
    JSON.stringify({ scope, set_by: "pharn/features/t/PLAN.md", set_at: new Date().toISOString() }, null, 2) + "\n"
  );
}
const anchor = (dir, extra = []) =>
  spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "test", ...extra], { encoding: "utf8" });

// D6 (6.24.0): the CLI now REFUSES --anchor with no usable scope, so `scope_snapshot: null` is reachable
// going forward only as a LEGACY shape (a baseline anchored before 6.24.0). Built directly via the JS API
// — bypassing the CLI's new refusal — which is exactly the shape such a pre-existing baseline has on disk.
function anchorLegacyNoScope(dir, by = "test") {
  const built = buildRecord(dir, by);
  if (!built.ok) throw new Error(built.reason);
  mkdirSync(dirname(join(dir, RECORD_PATH)), { recursive: true });
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify(built.record, null, 2) + "\n");
  return built.record;
}
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
  setScope(dir, ["pharn/features/keep.md"]);
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
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "pharn/features/keep.md"), "rewritten in scope\n");
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
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "pharn/features/keep.md"), "in scope\n");
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
  const dir = makeRepo({ devRepo: true }); // dev posture: pharn/features/**, .dev/features/**, pharn/pharn-*/**
  anchorLegacyNoScope(dir); // D6: a fresh CLI anchor now REFUSES with no scope — see the legacy helper above
  writeFileSync(join(dir, "pharn/features/allowed.md"), "inside the default safe-set\n");
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
  anchorLegacyNoScope(dir); // D6: a fresh CLI anchor now REFUSES with no scope — see the legacy helper above
  writeFileSync(join(dir, ".dev/features/x.md"), "dev-only path, install posture\n");
  const r = check(dir);
  assert.equal(r.status, 1, "an install's default does not admit .dev/features/**");
  assert.equal(r.json.escapes[0].file, ".dev/features/x.md");
});

test("★ ignored-path exemption: a git-ignored write is invisible by derivation", () => {
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
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
  setScope(dir, ["pharn/features/keep.md"]);
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
  anchorLegacyNoScope(dir); // overwritten immediately below; only its directory matters here
  writeFileSync(join(dir, RECORD_PATH), "{ not json");
  assert.equal(check(dir).status, 2);
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify({ version: 1, epoch: "x" }));
  const r = check(dir);
  assert.equal(r.status, 2);
  assert.equal(r.json.verdict, "INCONCLUSIVE");
});

test("a FUTURE schema version is INCONCLUSIVE; an OLDER one is tolerated at read with a warning", () => {
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
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
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  rmSync(join(dir, "pharn/features/keep.md"));
  const r = check(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(r.json.warnings.some((w) => w.includes("pharn/features/keep.md")));
});

test("an absent guard is INCONCLUSIVE — no guard, no premise to reconcile against", () => {
  const dir = makeRepo();
  anchorLegacyNoScope(dir); // the guard-absence check runs before the baseline is even read
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
  setScope(dir, ["pharn/features/keep.md"]);
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
    { scope: ["pharn/features/**"], path: "pharn/features/x/PLAN.md" },
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

// D7d / L42 (6.24.0) — the default probe sandbox now carries a THIRD signal, a fresh run marker, so an
// install-posture sandbox always answers with the STRICT in-run default rather than the newer permissive
// one. Executed against the REAL hook (L37), not asserted from reading the source.
test("★ PARITY: makeDefaultProbeSandbox()'s own run marker flips the REAL install-posture hook 0 -> 2", () => {
  const withMarker = makeDefaultProbeSandbox(makeRepo({ devRepo: false }));
  const hookAbs = join(withMarker, ".claude", "hooks", "enforce-writes-scope.cjs");
  // The sandbox itself has no hook copied in — copy the real one, exactly as askHookUnderScope() does.
  mkdirSync(dirname(hookAbs), { recursive: true });
  cpSync(join(REPO, ".claude/hooks/enforce-writes-scope.cjs"), hookAbs);
  const withMarkerResult = spawnSync(process.execPath, [hookAbs], {
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "src/x.js" } }),
    cwd: withMarker,
    encoding: "utf8",
  });
  assert.equal(withMarkerResult.status, 2, "the probe's own marker must hold the strict default fail-closed");

  // Non-vacuity control (L34): the SAME sandbox construction with the marker directory removed answers 0.
  rmSync(join(withMarker, ".pharn", "pharn-ship"), { recursive: true, force: true });
  const withoutMarkerResult = spawnSync(process.execPath, [hookAbs], {
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "src/x.js" } }),
    cwd: withMarker,
    encoding: "utf8",
  });
  assert.equal(withoutMarkerResult.status, 0, "without the marker the same install-posture sandbox is permissive");
});

test("✧ the probe CHECKS openRun()'s result, and a refused marker can never reach a verdict (GATE-2 review, minor 8)", () => {
  // No fixture can make openRun() refuse inside a fresh mkdtemp directory, so this is a SOURCE-SHAPE pin —
  // presence and order, not a demonstrated refusal. What it pins: the result is read and a refusal throws
  // (an install sandbox with no marker would answer with the PERMISSIVE default — the very fail-open the
  // third signal exists to prevent), and the one caller outside a try maps that throw to INCONCLUSIVE, never
  // to node's exit 1, which is this checker's ESCAPE code.
  const src = readFileSync(CHECK, "utf8");
  const body = src.slice(src.indexOf("export function makeDefaultProbeSandbox("), src.indexOf("function emit("));
  assert.match(body, /const marker = openRun\(/, "the openRun() result must be captured");
  assert.match(body, /if \(!marker\.ok\) throw /, "a refused marker must throw");
  const call = src.indexOf("sandbox = makeDefaultProbeSandbox(root);");
  assert.ok(call > 0, "the main-loop call site");
  const around = src.slice(Math.max(0, call - 120), call + 400);
  assert.match(around, /try \{/, "the call sits inside a try");
  assert.match(around, /verdict: "INCONCLUSIVE"/, "whose catch emits INCONCLUSIVE");
});

test("✧ isAlwaysReconciled covers the prefixes as well as the exact members", () => {
  const data = loadIgnoreData(IGNORE_JSON);
  assert.ok(isAlwaysReconciled("pharn/floor/check-verify.mjs", data));
  assert.ok(isAlwaysReconciled(".dev/floor/check-provenance.mjs", data));
  assert.ok(isAlwaysReconciled(".claude/settings.json", data));
  assert.ok(!isAlwaysReconciled("pharn/features/x/PLAN.md", data));
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
  // `set_by` names THIS feature's plan, so `x` is the active slug and its artifacts are the exempt ones.
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(
    join(dir, ".pharn/writes-scope.json"),
    JSON.stringify({ scope: ["pharn/features/keep.md"], set_by: ".dev/features/x/PLAN.md", set_at: "T" })
  );
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

test("✧ PARITY: pipeline_artifacts.names ∪ pre_anchor_artifacts.names equals check-regress.mjs's PIPELINE_ARTIFACTS, disjoint", () => {
  // Since 6.17.0 the two lists legitimately DIFFER (L39): the pre-anchor artifacts are regress-exempt (they changed
  // since base by design) but must stay reconcile-VISIBLE (nothing changes them after the build's anchor).
  const raw = JSON.parse(readFileSync(IGNORE_JSON, "utf8"));
  const regress = readFileSync(join(HERE, "check-regress.mjs"), "utf8");
  const theirs = [...regress.match(/const PIPELINE_ARTIFACTS\s*=\s*\[([\s\S]*?)\n\];/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const exempt = raw.pipeline_artifacts.names;
  const preAnchor = raw.pre_anchor_artifacts.names;
  assert.ok(preAnchor.length > 0, "pre_anchor_artifacts.names is empty — the split would be vacuous");
  assert.deepEqual([...exempt, ...preAnchor].sort(), [...theirs].sort(), "the artifact enums drifted — update all three");
  assert.deepEqual(
    exempt.filter((n) => preAnchor.includes(n)),
    [],
    "a name is both reconcile-exempt and pre-anchor"
  );
});

test("✧ a PRE-ANCHOR artifact (the AC-tests lock) is NOT reconcile-exempt; AC-TESTS.md, a plan file, IS", () => {
  const raw = JSON.parse(readFileSync(IGNORE_JSON, "utf8"));
  const data = loadIgnoreData(IGNORE_JSON);
  assert.deepEqual(raw.pre_anchor_artifacts.names, ["AC-TESTS.lock.json"]);
  for (const name of raw.pre_anchor_artifacts.names) {
    assert.equal(isPipelineArtifact(`pharn/features/demo/${name}`, data), false, `${name} was exempted`);
  }
  // A re-plan after the anchor legitimately rewrites both plan files; a stale lock is caught by ac-tests-lock --check.
  assert.equal(isPipelineArtifact("pharn/features/demo/AC-TESTS.md", data), true, "AC-TESTS.md must be exempt like PLAN.md");
  assert.equal(isPipelineArtifact("pharn/features/demo/PLAN.md", data), true, "control: a post-anchor-editable artifact is exempt");
});

test("✧ the pipeline-artifact slug is shape-gated — `..` cannot build a traversing exemption", () => {
  const data = loadIgnoreData(IGNORE_JSON);
  assert.equal(isPipelineArtifact("pharn/features/../PLAN.md", data), false);
  assert.equal(isPipelineArtifact(".dev/features/../../PLAN.md", data), false);
  assert.equal(isPipelineArtifact("features/x/PLAN.md", data), false, "legacy root features/ is not a pipeline exemption");
  assert.equal(isPipelineArtifact("pharn/features/x/PLAN.md", data), true);
  assert.equal(isPipelineArtifact(".dev/features/x/SHIP.md", data), true);
  assert.equal(isPipelineArtifact("pharn/features/x/other.md", data), false, "exact enum membership, never a glob");
});

// ------------------------------------------------- fail-open defects found in review (PR #212)

test("★ REVIEW: the control surface is reconciled against HEAD even WITH a baseline present", () => {
  // The defect: with a baseline, a caller who can edit a guard through Bash can also rewrite that
  // guard's baseline entry to the new hash — the path then matches its baseline, never becomes a
  // candidate, and the verdict is CLEAN. The guarantee this file claims is "reconciled ALWAYS".
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  const hook = join(dir, ".claude/hooks/enforce-writes-scope.cjs");
  writeFileSync(hook, "// disarmed\n");
  // ...and forge the baseline entry so the hash comparison alone would clear it.
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  rec.entries[".claude/hooks/enforce-writes-scope.cjs"] = createHash("sha256").update(readFileSync(hook)).digest("hex");
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify(rec));
  const r = check(dir);
  assert.equal(r.status, 1, "a forged baseline entry must not clear a control-surface change");
  assert.equal(r.json.escapes[0].file, ".claude/hooks/enforce-writes-scope.cjs");
});

test("★ REVIEW: an unexpected hook exit code is INCONCLUSIVE, never treated as permission", () => {
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "OUT.txt"), "x\n");
  // A guard that malfunctions (exit 1) must not read as "allowed".
  writeFileSync(join(dir, ".claude/hooks/protect-trusted-paths.cjs"), "process.exit(1);\n");
  const r = check(dir);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "INCONCLUSIVE");
  assert.match(r.json.reason, /unexpected exit code/);
});

test("★ REVIEW: an EXPLICIT empty scope denies everything — it is not 'no scope'", () => {
  // `{"scope": []}` means "this stage may write nothing". Falling through to the fail-closed DEFAULT
  // would be more permissive than the strictest scope a stage can declare — fail-open.
  const dir = makeRepo();
  setScope(dir, []);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "pharn/features/keep.md"), "would be allowed by the DEFAULT safe-set\n");
  const r = check(dir);
  assert.equal(r.status, 1, "pharn/features/** is in the default safe-set but NOT in an empty explicit scope");
  assert.equal(r.json.escapes[0].denied_by, "writes-scope (snapshot)");
});

test("★ REVIEW: an unreadable path is treated as CHANGED, not waved through as a warning", () => {
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  // Replace a tracked regular file with a directory: enumerated, but not hashable.
  rmSync(join(dir, "pharn/features/keep.md"));
  mkdirSync(join(dir, "pharn/features/keep.md"), { recursive: true });
  writeFileSync(join(dir, "pharn/features/keep.md/inner.txt"), "x\n");
  const r = check(dir);
  assert.ok(
    r.json.warnings.some((w) => /treated as changed/.test(w)),
    "the substitution must be reported"
  );
});

test("★ REVIEW: the pipeline exemption is restricted to the ACTIVE feature slug", () => {
  const dir = makeRepo();
  mkdirSync(join(dir, ".dev/features/mine"), { recursive: true });
  mkdirSync(join(dir, ".dev/features/other"), { recursive: true });
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(
    join(dir, ".pharn/writes-scope.json"),
    JSON.stringify({ scope: ["pharn/features/keep.md"], set_by: ".dev/features/mine/PLAN.md", set_at: "T" })
  );
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, ".dev/features/mine/SHIP.md"), "this feature's own artifact\n");
  writeFileSync(join(dir, ".dev/features/other/SHIP.md"), "someone else's feature\n");
  const r = check(dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    [".dev/features/other/SHIP.md"],
    "only the ACTIVE feature's artifacts are exempt"
  );
  assert.deepEqual(r.json.exempted, [".dev/features/mine/SHIP.md"]);
});

test("✧ activeFeatureSlug derives from set_by, and falls back to slug-agnostic rather than guessing", () => {
  assert.equal(activeFeatureSlug({ set_by: ".dev/features/mine/PLAN.md" }), "mine");
  assert.equal(activeFeatureSlug({ set_by: "pharn/features/x/PLAN.md" }), "x");
  assert.equal(activeFeatureSlug({ set_by: ".claude/commands/pharn-verify.md" }), null);
  assert.equal(activeFeatureSlug(null), null);
  const data = loadIgnoreData(IGNORE_JSON);
  assert.equal(isPipelineArtifact("pharn/features/any/PLAN.md", data, null), true, "no slug known => no narrowing");
  assert.equal(isPipelineArtifact("pharn/features/any/PLAN.md", data, "mine"), false);
});

test("★ REVIEW: a FORGED baseline entry hides an ordinary-path escape — the bound, pinned as behaviour", () => {
  // This test asserts a LIMITATION, deliberately. The baseline is unauthenticated state inside the
  // writable tree, so on an ORDINARY path a writer who edits a denied file AND rewrites its entry gets a
  // silent CLEAN. Pinning it means the docs cannot quietly drift back to claiming otherwise, and if a
  // later increment closes the hole this test FAILS and forces the claim to be widened deliberately.
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "DENIED.txt"), "an out-of-scope write\n");
  assert.equal(check(dir).status, 1, "precondition: it IS detected before the entry is forged");
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  rec.entries["DENIED.txt"] = createHash("sha256")
    .update(readFileSync(join(dir, "DENIED.txt")))
    .digest("hex");
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify(rec));
  const r = check(dir);
  assert.equal(r.status, 0, "KNOWN BOUND: a forged entry yields CLEAN on an ordinary path");
  assert.equal(r.json.verdict, "CLEAN");
  // ...and the SAME forgery does NOT work on the control surface, which is the asymmetry the claim rests on.
  const hook = join(dir, ".claude/hooks/set-writes-scope.cjs");
  writeFileSync(hook, "// disarmed\n");
  const rec2 = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  rec2.entries[".claude/hooks/set-writes-scope.cjs"] = createHash("sha256").update(readFileSync(hook)).digest("hex");
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify(rec2));
  assert.equal(check(dir).status, 1, "the control surface is anchored in blob ids, so the same forgery fails");
});

test("✧ the shipped claim says NON-ADVERSARIAL everywhere it is stated (P0 — no surface may overclaim)", () => {
  // The defect class this whole increment exists for is a doc claiming more than its mechanism. Every
  // surface that states the claim must carry the same qualifier, so drift in ONE of them is a red.
  const surfaces = {
    "pharn/floor/check-bash-reconcile.mjs": /NON-ADVERSARIAL|non-adversarial/,
    "pharn/pharn-contracts/reconciliation-record.md": /non-adversarial/i,
    "README.md": /non-adversarial/i,
    "CLAUDE.md": /NON-ADVERSARIAL|non-adversarial/,
    ".dev/features/bash-write-reconciler/proposed/LIMITS.md.patch": /NON-ADVERSARIAL|non-adversarial/,
  };
  for (const [rel, re] of Object.entries(surfaces)) {
    assert.match(readFileSync(join(REPO, rel), "utf8"), re, `${rel} states the claim without the qualifier`);
  }
});

test("✧ the contract exists and declares the verdict enum this file iterates", () => {
  const contract = readFileSync(join(REPO, "pharn/pharn-contracts/reconciliation-record.md"), "utf8");
  for (const v of VERDICTS) assert.ok(contract.includes(v), `contract does not name ${v}`);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// scope_amendments — an epoch may hold MORE THAN ONE authorized scope.
//
// The measured trigger is .dev/features/product-features-relocation/REVIEW.md F3: /pharn-dev-ship's
// Step 2b invokes /pharn-dev-memory-promote AFTER the Step-3 build anchor, so a canon write that passed
// BOTH live guards and a human accept was reported as "a write reached it outside the guarded tool
// surface". Canon is `never_exempt` by design and per L7 the build scope may never NAME canon, so the
// plan side cannot fix it. Without amendments EVERY promoting ship run ends RED — L17's failure mode.

const CANON = ".dev/memory-bank/lessons-learned.md";
const PROMOTE = ".claude/commands/pharn-dev-memory-promote.md";

function seedCanon(dir) {
  mkdirSync(join(dir, ".dev/memory-bank"), { recursive: true });
  writeFileSync(join(dir, CANON), "## L1 — seed\n");
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["commit", "-q", "-m", "canon"], { cwd: dir, stdio: "pipe" });
}
const amend = (dir) => spawnSync(process.execPath, [ANCHOR, "--amend-scope", "--base", dir], { encoding: "utf8" });
function setPromoteScope(dir, target) {
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(
    join(dir, ".pharn/writes-scope.json"),
    JSON.stringify({ scope: [target], set_by: PROMOTE, set_at: new Date().toISOString() }, null, 2) + "\n"
  );
}

test("★ F3 REGRESSION: a promote-stage canon write recorded as an amendment is CLEAN, not an escape", () => {
  const dir = makeRepo();
  seedCanon(dir);
  setScope(dir, ["pharn/features/keep.md"]); // the BUILD stage's scope — cannot name canon (L7)
  assert.equal(anchor(dir).status, 0);

  // The promote stage: its own Step-0 setter, then the amendment, then the canon write.
  setPromoteScope(dir, CANON);
  assert.equal(amend(dir).status, 0);
  writeFileSync(join(dir, CANON), "## L1 — seed\n\n## L2 — promoted\n");

  const r = check(dir);
  assert.equal(r.json?.verdict, "CLEAN", `expected CLEAN, got ${r.stdout}`);
  assert.equal(r.status, 0);
});

test("★ F3 REGRESSION: it stays CLEAN after the promote scope is RELEASED — the real F3 condition", () => {
  const dir = makeRepo();
  seedCanon(dir);
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  setPromoteScope(dir, CANON);
  assert.equal(amend(dir).status, 0);
  writeFileSync(join(dir, CANON), "## L1 — seed\n\n## L2 — promoted\n");
  // Every command's LAST step clears the scope, which is exactly when the checker runs.
  rmSync(join(dir, ".pharn/writes-scope.json"), { force: true });

  const r = check(dir);
  assert.equal(r.json?.verdict, "CLEAN", `a released scope must not resurrect the escape: ${r.stdout}`);
});

// L34 non-vacuity: the clearance must come from the AMENDMENT, not from the test's own shape.
test("★ NON-VACUITY: the SAME canon write with NO amendment recorded is still an ESCAPE", () => {
  const dir = makeRepo();
  seedCanon(dir);
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, CANON), "## L1 — seed\n\n## L2 — unaccounted\n");

  const r = check(dir);
  assert.equal(r.json?.verdict, "ESCAPE", "canon must stay VISIBLE — amendments account for writes, they never exempt paths");
  assert.equal(r.status, 1);
  assert.ok(r.json.escapes.some((e) => e.file === CANON));
});

test("★ an amendment whose ORIGIN is not a promote command does NOT clear a canon write", () => {
  const dir = makeRepo();
  seedCanon(dir);
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  // A plan-derived scope naming canon: the exact vector protect-trusted-paths' canon denylist closes.
  setScope(dir, [CANON]); // set_by is a PLAN.md, not a promote command
  assert.equal(amend(dir).status, 0);
  writeFileSync(join(dir, CANON), "## L1 — seed\n\n## L2 — smuggled\n");

  const r = check(dir);
  assert.equal(r.json?.verdict, "ESCAPE", "an amendment cannot launder a canon write past the ORIGIN check");
  assert.ok(r.json.escapes.some((e) => e.file === CANON && e.denied_by === "protect-trusted-paths.cjs"));
});

test("★ an amendment authorizes an ORDINARY path the opening scope did not cover", () => {
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  setScope(dir, ["later.md"]);
  assert.equal(amend(dir).status, 0);
  writeFileSync(join(dir, "later.md"), "written under the amendment\n");
  assert.equal(check(dir).json?.verdict, "CLEAN");
});

// L41: an epoch with NO amendments is the default path — exercised explicitly, not assumed.
test("★ a baseline with NO scope_amendments behaves exactly as before (the default path)", () => {
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  delete rec.scope_amendments; // a baseline anchored before the field existed
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify(rec, null, 2) + "\n");
  writeFileSync(join(dir, "SNEAKY.txt"), "outside\n");

  const r = check(dir);
  assert.equal(r.json?.verdict, "ESCAPE", "an absent field must read as [], never as 'authorize everything'");
  assert.ok(r.json.escapes.some((e) => e.file === "SNEAKY.txt"));
});

test("★ activeFeatureSlug reads the OPENING snapshot only — an amendment cannot repoint the exemption", () => {
  // A promote amendment's set_by is a COMMAND path, not a feature; letting it win would silently move
  // the pipeline-artifact exemption to another slug.
  assert.equal(activeFeatureSlug({ set_by: "pharn/features/real/PLAN.md" }), "real");
  assert.equal(activeFeatureSlug({ set_by: PROMOTE }), null, "a command path names no feature");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SYMLINKS — the downstream false ESCAPE, end to end (.dev/features/reconcile-symlink-hash/PLAN.md).
// A repo tracking a symlink to a directory reconciled as ESCAPE on EVERY run with zero writes, because
// hashFile returned null for it: the anchor never recorded it and the reconcile read it as "unreadable,
// treated as changed". Measured downstream as 20 `.claude/skills/*` links ending each /pharn-loop
// STOP_TERMINAL. The fixture mirrors that shape: a tracked directory link and a dangling one, under a
// build scope that does not cover them.

function repoWithLinks() {
  const dir = makeRepo();
  mkdirSync(join(dir, "vendored/skill-a"), { recursive: true });
  writeFileSync(join(dir, "vendored/skill-a/SKILL.md"), "skill\n");
  mkdirSync(join(dir, ".claude/skills"), { recursive: true });
  symlinkSync("../../vendored/skill-a", join(dir, ".claude/skills/skill-a"));
  symlinkSync("../../vendored/gone", join(dir, ".claude/skills/dangling"));
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["commit", "-q", "-m", "links"], { cwd: dir, stdio: "pipe" });
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  return dir;
}

test("★ an UNCHANGED tracked directory symlink and a dangling one reconcile CLEAN — no false ESCAPE", () => {
  const dir = repoWithLinks();
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "CLEAN");
  assert.deepEqual(r.json.escapes, []);
  assert.ok(
    !r.json.warnings.some((w) => /treated as changed/.test(w)),
    `no link may read as unreadable: ${JSON.stringify(r.json.warnings)}`
  );
});

test("★ NON-VACUITY (L34): RE-POINTING a tracked directory symlink is still an ESCAPE naming exactly it", () => {
  // The mirror of the test above, same fixture. Without it, a checker that simply stopped looking at links
  // would satisfy the CLEAN case.
  const dir = repoWithLinks();
  unlinkSync(join(dir, ".claude/skills/skill-a"));
  symlinkSync("../../vendored", join(dir, ".claude/skills/skill-a"));
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "ESCAPE");
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    [".claude/skills/skill-a"],
    "exactly the re-pointed link — not the untouched dangling one, not none"
  );
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SYMLINKS TO REGULAR FILES (6.20.8, .dev/features/reconcile-symlink-target/PLAN.md). Up to 6.20.7 hashFile
// FOLLOWED such a link and recorded the TARGET's bytes under the LINK's path, which the explicit-scope matcher
// judges as text — while the live guard `realpath`s a Write's target first. So a tracked CLAUDE.md -> AGENTS.md
// under a scope of [AGENTS.md] reported a false ESCAPE on CLAUDE.md for an edit the guard ALLOWS. Every link is
// hashed by its link text now; each CLEAN case below has an ESCAPE mirror on the same fixture (L34), and the
// guard is EXECUTED in the fixture rather than assumed (L37 — the reconciler never runs it for an explicit
// scope, so without these assertions "agrees with the guard" would rest on nothing in this suite).

function repoWithAgentsLink() {
  const dir = makeRepo();
  writeFileSync(join(dir, "AGENTS.md"), "agents v1\n");
  writeFileSync(join(dir, "OTHER.md"), "agents v1\n"); // the same bytes as AGENTS.md, on purpose
  symlinkSync("AGENTS.md", join(dir, "CLAUDE.md"));
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["commit", "-q", "-m", "agents link"], { cwd: dir, stdio: "pipe" });
  setScope(dir, ["AGENTS.md"]);
  assert.equal(anchor(dir).status, 0);
  return dir;
}

/** The fixture's OWN copy of the live scope guard, asked about a Write — exit 0 allows, 2 denies. */
function guardAllows(dir, path) {
  const r = spawnSync(process.execPath, [join(dir, ".claude/hooks/enforce-writes-scope.cjs")], {
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: path } }),
    cwd: dir,
    encoding: "utf8",
  });
  assert.ok(r.status === 0 || r.status === 2, `the guard answered neither allow nor deny: ${r.status} ${r.stderr}`);
  return r.status === 0;
}

test("★ CLAUDE.md -> AGENTS.md, scope [AGENTS.md]: an edit of AGENTS.md is CLEAN — the guard allows it, and so does the reconciler", () => {
  const dir = repoWithAgentsLink();
  // The guard, executed (L37): it resolves the link, so a Write to EITHER name is allowed; OTHER.md is the control.
  assert.equal(guardAllows(dir, "AGENTS.md"), true);
  assert.equal(guardAllows(dir, "CLAUDE.md"), true, "the live guard realpaths CLAUDE.md to AGENTS.md");
  assert.equal(guardAllows(dir, "OTHER.md"), false, "control: the guard does deny an out-of-scope path");
  writeFileSync(join(dir, "AGENTS.md"), "agents v2\n"); // the build's edit, made through Bash
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "CLEAN", "up to 6.20.7 this was ESCAPE on CLAUDE.md, 'writes-scope (snapshot)'");
  assert.deepEqual(r.json.escapes, []);
  assert.ok(!r.json.warnings.some((w) => /treated as changed/.test(w)), JSON.stringify(r.json.warnings));
});

test("★ NON-VACUITY (L34): CLAUDE.md RE-POINTED to OTHER.md — identical bytes — is an ESCAPE naming exactly CLAUDE.md", () => {
  // Unseen through 6.20.7: the link hashed its target's BYTES, and both targets hold the same bytes.
  const dir = repoWithAgentsLink();
  unlinkSync(join(dir, "CLAUDE.md"));
  symlinkSync("OTHER.md", join(dir, "CLAUDE.md"));
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["CLAUDE.md"]
  );
});

test("★ NON-VACUITY (L34): an edit THROUGH a link to an OUT-of-scope target is an ESCAPE naming the TARGET, not the link", () => {
  const dir = repoWithAgentsLink();
  writeFileSync(join(dir, "NOTES.md"), "notes v1\n");
  symlinkSync("NOTES.md", join(dir, "notes-link"));
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["commit", "-q", "-m", "notes link"], { cwd: dir, stdio: "pipe" });
  assert.equal(anchor(dir).status, 0);
  assert.equal(guardAllows(dir, "notes-link"), false, "the guard judges the link by its target, NOTES.md — out of scope");
  writeFileSync(join(dir, "notes-link"), "notes v2\n"); // written THROUGH the link
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["NOTES.md"],
    "attributed to the path the bytes live at — the one the guard would have judged"
  );
});

test("★ a tracked link to a file OUTSIDE the repo whose content changes is CLEAN — not a change to any repo path", () => {
  const dir = repoWithAgentsLink();
  const outside = mkdtempSync(join(tmpdir(), "pharn-recon-outside-"));
  made.push(outside);
  writeFileSync(join(outside, "shared.md"), "shared v1\n");
  symlinkSync(join(outside, "shared.md"), join(dir, "shared-link"));
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["commit", "-q", "-m", "outside link"], { cwd: dir, stdio: "pipe" });
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(outside, "shared.md"), "shared v2\n");
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "CLEAN", "up to 6.20.7 the link carried the outside file's bytes and read as changed");
});

test("★ L51 boundary: a link's in-repo target made UNREADABLE after a change is still a candidate — the TARGET, not the link", (t) => {
  // 6.17.1 guarded this evasion on the LINK's entry (LINK_TEXT_ERRNOS excluded EACCES). The link is never opened
  // now, so the guard lives on the target's own entry: unreadable is treated as changed there.
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    t.skip("root reads a mode-000 file, so the unreadable state cannot be built");
    return;
  }
  const dir = repoWithAgentsLink();
  writeFileSync(join(dir, "NOTES.md"), "notes v1\n");
  symlinkSync("NOTES.md", join(dir, "notes-link"));
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["commit", "-q", "-m", "notes link"], { cwd: dir, stdio: "pipe" });
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "NOTES.md"), "notes v2 — then hidden\n");
  chmodSync(join(dir, "NOTES.md"), 0o000);
  try {
    const r = check(dir, ["--require-baseline"]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.deepEqual(
      r.json.escapes.map((e) => e.file),
      ["NOTES.md"]
    );
    assert.ok(
      r.json.warnings.some((w) => w === "unreadable during reconcile, treated as changed: NOTES.md"),
      JSON.stringify(r.json.warnings)
    );
  } finally {
    chmodSync(join(dir, "NOTES.md"), 0o644);
  }
});

test("★ UPGRADE (GATE-1 note 2): a baseline anchored before 6.20.8 — the link carrying its TARGET's digest — is FLAGGED, never passed", () => {
  // RECORD_VERSION stays 1, so nothing marks such a baseline. What makes the straddle fail CLOSED is the digest
  // inequality itself: the pre-6.20.8 entry is sha256(target bytes), the live one sha256("symlink\0" + text).
  const dir = repoWithAgentsLink();
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  rec.entries["CLAUDE.md"] = createHash("sha256").update("agents v1\n").digest("hex"); // what 6.20.7 recorded
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify(rec, null, 2) + "\n");
  const r = check(dir, ["--require-baseline"]); // nothing changed since the anchor
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["CLAUDE.md"],
    "the one-epoch cost, stated in the contract and the CHANGELOG: the next anchor records the link text"
  );
  assert.equal(anchor(dir).status, 0);
  assert.equal(check(dir, ["--require-baseline"]).json.verdict, "CLEAN", "…and a fresh anchor clears it");
});

// ------------------------------------------------------- the `merged` classification (6.51.0, audit P3-L)
//
// Real git histories, never a faked enumeration (L26). Upstream lives on branch `upstream`, committed through a
// second worktree so the reconciled worktree is never touched by building it, and is named the way a clone names
// it: refs/remotes/origin/main, with refs/remotes/origin/HEAD pointing at it. Each NON-VACUITY case below differs
// from the positive case's fixture in ONE condition and must stay an ESCAPE (L34) — so the suite cannot pass by
// classifying everything `merged`.

const g = (dir, ...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// A repo with dep.json committed, on branch `feat` cut from that commit (BASE). `beforeAnchor` runs on `feat`
// before the anchor; the scope is the in-scope seed file only, so dep.json is OUT of scope.
function mergeFixture({ beforeAnchor = () => {}, baseFiles = {} } = {}) {
  const dir = makeRepo();
  for (const [p, c] of Object.entries(baseFiles)) writeFileSync(join(dir, p), c);
  writeFileSync(join(dir, "dep.json"), "v1\n");
  g(dir, "add", "-A");
  g(dir, "commit", "-q", "-m", "dep v1");
  const base = g(dir, "rev-parse", "HEAD");
  g(dir, "checkout", "-q", "-b", "feat");
  beforeAnchor(dir);
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  return { dir, base };
}

const upstreamWorktrees = new Map();
// Commit `files` on `upstream` (cut from BASE on first use) and point origin/main + origin/HEAD at it.
function upstreamCommit({ dir, base }, files) {
  let wt = upstreamWorktrees.get(dir);
  if (!wt) {
    wt = mkdtempSync(join(tmpdir(), "pharn-recon-up-"));
    made.push(wt);
    rmSync(wt, { recursive: true, force: true });
    g(dir, "worktree", "add", "-q", "-b", "upstream", wt, base);
    upstreamWorktrees.set(dir, wt);
  }
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(wt, p)), { recursive: true });
    writeFileSync(join(wt, p), c);
  }
  g(wt, "add", "-A");
  g(wt, "commit", "-q", "-m", "upstream");
  g(dir, "update-ref", "refs/remotes/origin/main", "refs/heads/upstream");
  g(dir, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
}

// The build's own in-scope commit, then the merge of upstream — the "main moved mid-ship" sequence.
function buildThenMerge(dir) {
  writeFileSync(join(dir, "pharn/features/keep.md"), "built in scope\n");
  g(dir, "commit", "-q", "-am", "build");
  g(dir, "merge", "-q", "--no-edit", "upstream");
}

test("★ MERGED: paths an upstream merge changed after the anchor are classified merged, not escapes — every escape kind", () => {
  // On main before 6.51.0 this exact sequence was ESCAPE on all three paths (the audit's P3-L false RED).
  const fx = mergeFixture();
  upstreamCommit(fx, { "dep.json": "v2\n", "LIMITS.md": "a trusted doc changed on main\n", "pharn/floor/new.mjs": "// floor\n" });
  buildThenMerge(fx.dir);
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "CLEAN");
  assert.deepEqual(r.json.escapes, []);
  assert.deepEqual([...r.json.merged].sort(), ["LIMITS.md", "dep.json", "pharn/floor/new.mjs"]);
  assert.ok(
    r.json.warnings.some((w) => /3 path\(s\) classified merged/.test(w)),
    "reported, never silent (L48): " + r.json.warnings.join(" | ")
  );
});

test("★ ANTI-LAUNDERING: a path the build COMMITTED itself stays an escape; the upstream path beside it is merged", () => {
  const fx = mergeFixture();
  writeFileSync(join(fx.dir, "OUT.txt"), "the build's own out-of-scope write, committed\n");
  g(fx.dir, "add", "OUT.txt");
  g(fx.dir, "commit", "-q", "-m", "escape, committed");
  upstreamCommit(fx, { "dep.json": "v2\n" });
  buildThenMerge(fx.dir);
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["OUT.txt"]
  );
  assert.deepEqual(r.json.merged, ["dep.json"]);
});

test("★ NON-VACUITY (f): the build's own commit to a merged path, AFTER the merge, is an escape", () => {
  const fx = mergeFixture();
  upstreamCommit(fx, { "dep.json": "v2\n" });
  buildThenMerge(fx.dir);
  writeFileSync(join(fx.dir, "dep.json"), "v3 by the build\n");
  g(fx.dir, "commit", "-q", "-am", "the build edits the merged file and commits it");
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["dep.json"]
  );
  assert.deepEqual(r.json.merged, []);
});

test("★ a LATER fetch that moves origin/main past the merged commit does not undo the classification", () => {
  const fx = mergeFixture();
  upstreamCommit(fx, { "dep.json": "v2\n" });
  buildThenMerge(fx.dir);
  upstreamCommit(fx, { "dep.json": "v3 — main moved again, not merged here\n" });
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(r.json.merged, ["dep.json"], "judged against the merge base, the upstream commit HEAD contains");
});

test("★ NON-VACUITY (a): a baseline with no anchored_head (pre-6.51.0) gets no classification, and says so", () => {
  const fx = mergeFixture();
  const rec = JSON.parse(readFileSync(join(fx.dir, RECORD_PATH), "utf8"));
  delete rec.anchored_head;
  writeFileSync(join(fx.dir, RECORD_PATH), JSON.stringify(rec, null, 2) + "\n");
  upstreamCommit(fx, { "dep.json": "v2\n" });
  buildThenMerge(fx.dir);
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["dep.json"]
  );
  assert.ok(r.json.warnings.some((w) => /no anchored_head/.test(w)));
});

test("★ NON-VACUITY (b), GATE-1: HEAD moved by a REBASE — the anchored commit is not an ancestor: no classification, a warning, RED", () => {
  const fx = mergeFixture({
    beforeAnchor: (dir) => {
      writeFileSync(join(dir, "pharn/features/keep.md"), "a feat commit the anchor sits on\n");
      g(dir, "commit", "-q", "-am", "feat before anchor");
    },
  });
  upstreamCommit(fx, { "dep.json": "v2\n" });
  g(fx.dir, "rebase", "-q", "upstream"); // rewrites the anchored commit
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "ESCAPE");
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["dep.json"]
  );
  assert.deepEqual(r.json.merged, []);
  assert.ok(
    r.json.warnings.some((w) => /not its ancestor/.test(w)),
    r.json.warnings.join(" | ")
  );
});

test("★ NON-VACUITY (c): no refs/remotes/origin/HEAD — the class is inert, the warning names the remedy, RED", () => {
  const fx = mergeFixture();
  upstreamCommit(fx, { "dep.json": "v2\n" });
  buildThenMerge(fx.dir);
  g(fx.dir, "symbolic-ref", "--delete", "refs/remotes/origin/HEAD");
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(r.json.merged, []);
  assert.ok(r.json.warnings.some((w) => /git remote set-head origin --auto/.test(w)));
});

test("★ NON-VACUITY (d), GATE-1: an UNCOMMITTED edit to the path at anchor time keeps it an escape after main changes it", () => {
  const fx = mergeFixture({
    beforeAnchor: (dir) => writeFileSync(join(dir, "dep.json"), "a local, uncommitted edit at anchor time\n"),
  });
  g(fx.dir, "checkout", "--", "dep.json"); // the edit is discarded (a write in the window), so the merge can land
  upstreamCommit(fx, { "dep.json": "v2\n" });
  buildThenMerge(fx.dir);
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["dep.json"]
  );
  assert.deepEqual(r.json.merged, []);
});

test("★ NON-VACUITY (e): an uncommitted edit ON TOP of a merged path is an escape", () => {
  const fx = mergeFixture();
  upstreamCommit(fx, { "dep.json": "v2\n" });
  buildThenMerge(fx.dir);
  writeFileSync(join(fx.dir, "dep.json"), "v2 plus a Bash edit\n");
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["dep.json"]
  );
});

test("★ NON-VACUITY (c, merge base new since the anchor): HEAD moved by the build's OWN commits only — a revert to upstream's old bytes is an escape", () => {
  // X carries a pre-anchor feat change to dep.json; after the anchor the build reverts it to BASE's bytes and
  // commits. H's blob then equals the merge base's (BASE, an upstream commit) — but BASE is already inside X, so
  // no upstream commit entered HEAD in the window and nothing here is explained by a merge.
  const fx = mergeFixture({
    beforeAnchor: (dir) => {
      writeFileSync(join(dir, "dep.json"), "feat's own dep change, committed before the anchor\n");
      g(dir, "commit", "-q", "-am", "feat dep");
    },
  });
  upstreamCommit(fx, { "OTHER.md": "upstream exists, never merged\n" });
  writeFileSync(join(fx.dir, "dep.json"), "v1\n");
  g(fx.dir, "commit", "-q", "-am", "revert dep to base, out of scope");
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["dep.json"]
  );
  assert.deepEqual(r.json.merged, []);
});

test("★ GATE-2 A1: an anchored_head that is not an object id (a leading `-`) is refused before git — never an option", () => {
  const fx = mergeFixture();
  const rec = JSON.parse(readFileSync(join(fx.dir, RECORD_PATH), "utf8"));
  rec.anchored_head = "--all";
  writeFileSync(join(fx.dir, RECORD_PATH), JSON.stringify(rec, null, 2) + "\n");
  upstreamCommit(fx, { "dep.json": "v2\n" });
  buildThenMerge(fx.dir);
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(r.json.merged, []);
  assert.ok(
    r.json.warnings.some((w) => /anchored_head is not a full object id/.test(w)),
    "refused by shape, not by whatever git makes of the option: " + r.json.warnings.join(" | ")
  );
});

test("★ GATE-2 A2: filenames holding pathspec magic (`:(top)`) or glob characters are LITERAL paths to git — each is merged", () => {
  // At X, `dep.json` exists. Read as pathspec magic, `:(top)dep.json` would name it at X, the lookup would not be
  // "absent", and (d) would fail closed — so `:(top)dep.json` is merged only because every pathspec is literal
  // (measured: removing GIT_LITERAL_PATHSPECS fails this test). `ls-tree` reads `*` and `?` literally on its own;
  // those two names pin that, so a future switch to a globbing subcommand is caught as well.
  const fx = mergeFixture({
    beforeAnchor: (dir) => {
      writeFileSync(join(dir, "dep-x.json"), "a sibling a `?` pattern would match\n");
      g(dir, "add", "dep-x.json");
      g(dir, "commit", "-q", "-m", "sibling");
    },
  });
  upstreamCommit(fx, { ":(top)dep.json": "magic-looking name\n", "dep-?.json": "added on upstream\n", "dep-*.json": "also added\n" });
  buildThenMerge(fx.dir);
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual([...r.json.merged].sort(), [":(top)dep.json", "dep-*.json", "dep-?.json"]);
});

test("★ GATE-2 A2: a SYMLINK upstream added (mode 120000) is merged — digest = sha256(`symlink\\0` + link text), the baseline's rule", () => {
  const fx = mergeFixture();
  const wtFiles = { "dep.json": "v2\n" };
  upstreamCommit(fx, wtFiles);
  const wt = upstreamWorktrees.get(fx.dir);
  symlinkSync("dep.json", join(wt, "link.json"));
  g(wt, "add", "link.json");
  g(wt, "commit", "-q", "-m", "upstream adds a link");
  g(fx.dir, "update-ref", "refs/remotes/origin/main", "refs/heads/upstream");
  assert.equal(g(fx.dir, "ls-tree", "upstream", "--", "link.json").split(" ")[0], "120000", "the fixture is a real mode-120000 entry");
  buildThenMerge(fx.dir);
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual([...r.json.merged].sort(), ["dep.json", "link.json"]);
});

test("✧ `merged` is always present in the verdict — an empty array when HEAD did not move", () => {
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "SNEAKY.txt"), "x\n");
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 1);
  assert.deepEqual(r.json.merged, []);
  assert.ok(!r.json.warnings.some((w) => /merged/.test(w)), "no HEAD move, no classification talk");
});

// ------------------------------------------------ the human-only surface joins the control surface (6.53.0)
//
// Audit 2026-10-07: a Bash edit of LIMITS.md plus a forged baseline entry read CLEAN, because the trusted docs were
// not always-reconciled. And `git diff HEAD` never lists an UNTRACKED file, so a control path absent at HEAD could be
// added through Bash and hidden the same way. Each case below fails on the 6.51.0 checker.

// Rewrite a path's baseline entry to its CURRENT bytes — the forgery the contract's non-adversarial bound names.
function forge(dir, rel) {
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  rec.entries[rel] = hashFile(join(dir, rel));
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify(rec, null, 2) + "\n");
}

// Every human-only member: the exact list, plus one canon file per subtree prefix (L29: iterate the set).
function humanOnlyMembers() {
  const data = loadIgnoreData(IGNORE_JSON);
  return [...data.humanOnly, ...data.humanOnlyPrefixes.map((p) => `${p}lessons-learned.md`)];
}

test("★ FORGED BASELINE: a Bash edit of LIMITS.md with its baseline entry rewritten is still an ESCAPE — and names the remedy", () => {
  const dir = makeRepo();
  writeFileSync(join(dir, "LIMITS.md"), "the human-only text\n");
  g(dir, "add", "LIMITS.md");
  g(dir, "commit", "-q", "-m", "limits");
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, "LIMITS.md"), "rewritten through Bash\n");
  forge(dir, "LIMITS.md");
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => `${e.file}:${e.denied_by}`),
    ["LIMITS.md:protect-trusted-paths.cjs"]
  );
  assert.ok(r.json.findings[0].problem.endsWith(HUMAN_ONLY_REMEDY), "GATE-1 addition: the one-line remedy is carried");
});

test("★ L29: EVERY human-only member, ADDED as an untracked file with a forged entry, is an ESCAPE naming exactly it", () => {
  const members = humanOnlyMembers();
  assert.equal(members.length, 10, "non-vacuity (L34): 8 human_only paths + 2 canon subtrees");
  for (const rel of members) {
    const dir = makeRepo();
    setScope(dir, ["pharn/features/keep.md"]);
    assert.equal(anchor(dir).status, 0);
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), "added through Bash\n");
    forge(dir, rel);
    const r = check(dir, ["--require-baseline"]);
    assert.equal(r.status, 1, `${rel}: ${r.stdout}${r.stderr}`);
    assert.deepEqual(
      r.json.escapes.map((e) => e.file),
      [rel],
      rel
    );
  }
});

test("★ ADDED FILE: an untracked new pharn/floor/ file with a forged entry is an ESCAPE (the 6.51.0 added-file hole) — no human-only remedy", () => {
  const dir = makeRepo();
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  mkdirSync(join(dir, "pharn/floor"), { recursive: true });
  writeFileSync(join(dir, "pharn/floor/x.mjs"), "// planted\n");
  forge(dir, "pharn/floor/x.mjs");
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["pharn/floor/x.mjs"]
  );
  assert.ok(!r.json.findings[0].problem.includes(HUMAN_ONLY_REMEDY), "the remedy is for the human-only surface only");
});

test("★ NO BASELINE: an untracked pharn.spec-template.md is an ESCAPE, not NO_BASELINE", () => {
  const dir = makeRepo();
  writeFileSync(join(dir, "pharn.spec-template.md"), "<!-- an instruction channel -->\n");
  const r = check(dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "ESCAPE");
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    ["pharn.spec-template.md"]
  );
});

test("★ L68 CONSEQUENCE, pinned: with no baseline, a human's UNCOMMITTED trusted-doc edit is an ESCAPE carrying the remedy", () => {
  const dir = makeRepo();
  writeFileSync(join(dir, "LIMITS.md"), "v1\n");
  g(dir, "add", "LIMITS.md");
  g(dir, "commit", "-q", "-m", "limits");
  writeFileSync(join(dir, "LIMITS.md"), "a maintainer's own edit, not yet committed\n");
  const r = check(dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.json.findings[0].problem, /commit it before running the gates/);
  g(dir, "commit", "-q", "-am", "the human commits it");
  assert.equal(check(dir).json.verdict, "NO_BASELINE", "…and committing it is the remedy that works");
});

test("★ NON-VACUITY (GATE-1): with no baseline, an untracked file OUTSIDE the control surface is NOT reported", () => {
  // `ls-files --others` must widen the HEAD comparison to added CONTROL paths only, never to every untracked file.
  const dir = makeRepo();
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "NOTES.txt"), "scratch\n");
  writeFileSync(join(dir, "src/x.js"), "export {};\n");
  writeFileSync(join(dir, "pharn/features/stray.md"), "x\n");
  const r = check(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.verdict, "NO_BASELINE");
  assert.deepEqual(r.json.escapes, []);
});

test("★ MERGED still applies: LIMITS.md MODIFIED on upstream and merged in during the window is merged, not an escape", () => {
  const fx = mergeFixture({ baseFiles: { "LIMITS.md": "v1\n" } });
  upstreamCommit(fx, { "LIMITS.md": "v2, edited by a human on main\n" });
  buildThenMerge(fx.dir);
  const r = check(fx.dir, ["--require-baseline"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(r.json.merged, ["LIMITS.md"]);
});

test("★ GATE-2 R2: a TRACKED canon file with a NON-ASCII name, Bash-edited and baseline-forged, is an ESCAPE (no quotePath miss)", () => {
  const rel = ".dev/memory-bank/lessons-ü.md";
  const dir = makeRepo();
  mkdirSync(join(dir, ".dev/memory-bank"), { recursive: true });
  writeFileSync(join(dir, rel), "v1\n");
  g(dir, "add", "-A");
  g(dir, "commit", "-q", "-m", "canon with a non-ASCII name");
  assert.match(g(dir, "diff", "--name-only", "HEAD~1", "HEAD"), /\\303\\274/, "precondition: git QUOTES this name by default");
  setScope(dir, ["pharn/features/keep.md"]);
  assert.equal(anchor(dir).status, 0);
  writeFileSync(join(dir, rel), "rewritten through Bash\n");
  forge(dir, rel);
  const r = check(dir, ["--require-baseline"]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(
    r.json.escapes.map((e) => e.file),
    [rel]
  );
});

test("★ GATE-2 R2: a staged `git mv` of a trusted doc is seen under the doc's OWN path (no rename collapse)", () => {
  const dir = makeRepo();
  writeFileSync(join(dir, "LIMITS.md"), "the human-only text, long enough to be detected as a rename\n".repeat(4));
  g(dir, "add", "LIMITS.md");
  g(dir, "commit", "-q", "-m", "limits");
  g(dir, "mv", "LIMITS.md", "ELSEWHERE.md");
  const r = check(dir); // no baseline: the HEAD comparison is the only reference
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.ok(
    r.json.escapes.some((e) => e.file === "LIMITS.md"),
    JSON.stringify(r.json.escapes)
  );
});

test("✧ PARITY: human_only and its canon prefixes equal the hook's own sets; never_exempt is always reconciled", () => {
  const data = loadIgnoreData(IGNORE_JSON);
  const protect = readFileSync(join(REPO, ".claude/hooks/protect-trusted-paths.cjs"), "utf8");
  const protected_ = eval(protect.match(/const DEFAULT_PROTECTED\s*=\s*(\[[\s\S]*?\n\])/)[1]);
  const subtrees = eval(protect.match(/const PROTECTED_SUBTREES\s*=\s*(\[[^\]]*\])/)[1]);
  const setter = readFileSync(join(REPO, ".claude/hooks/set-writes-scope.cjs"), "utf8");
  const control = eval(setter.match(/const CONTROL_SURFACE\s*=\s*(\[[\s\S]*?\])/)[1]);
  // `.pharn/writes-scope.json` is excluded BY NAME: gitignored runtime state, never in the reconciled set.
  const expected = protected_.filter((p) => !control.includes(p) && p !== ".pharn/writes-scope.json");
  assert.deepEqual([...data.humanOnly].sort(), [...expected].sort(), "reconcile-ignore.json human_only drifted from DEFAULT_PROTECTED");
  assert.deepEqual(
    [...data.humanOnlyPrefixes].sort(),
    subtrees.map((s) => `${s}/`).sort(),
    "human_only_prefixes drifted from PROTECTED_SUBTREES"
  );
  for (const p of data.neverExempt) assert.ok(isAlwaysReconciled(p, data), `never_exempt ${p} is not always reconciled`);
  assert.ok(isHumanOnly(".dev/memory-bank/feature-catalog.md", data), "the whole canon subtree, not four files");
  assert.ok(!isHumanOnly("pharn/floor/x.mjs", data));
});
