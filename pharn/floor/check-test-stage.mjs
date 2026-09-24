#!/usr/bin/env node
// pharn/floor/check-test-stage.mjs — did the TEST STAGE complete for this feature's current SPEC and PLAN?
// Contract: pharn/pharn-contracts/ac-tests.md, "The test-stage gate".
//
// WHY (the queue's item 05, the maintainer's decision — P7): /pharn-test (6.17.0, red run 6.18.0) was standalone.
// Wiring it between /pharn-grill and /pharn-build is only an ORDER if something refuses the build without it — and the
// gate a step merely ASKS for is the one that gets skipped (PHARN's own build-loop lessons L5/L30). So /pharn-build,
// /pharn-ship, /pharn-loop and check-loop-fresh.mjs's front check all read THIS verdict, and the branch on the
// SPEC's mode lives here, in tested code, once (L35) — never in four commands' prose.
//
// THE MODE, decided by `check-ac-tests.mjs --spec` (its exit code, P5):
//   templated (0) → `check-ac-tests.mjs` full — the mapping still agrees with the CURRENT SPEC and PLAN (so a PLAN
//                   edit after /pharn-test that scopes the build to a test file is caught here, closing item 03's
//                   stated bound) — then `ac-tests-lock.mjs --check <name> --require-red-run`   → READY test-first
//   bootstrap (4) → `ac-tests-lock.mjs --check <name> --require-red-run --allow-bootstrap`       → READY bootstrap
//   legacy    (3) → no AC ids, nothing to test first; an AC-TESTS.md or a lock present is RED      → NOT-APPLICABLE
// In both non-legacy branches the lock's recorded `mode` must MATCH the SPEC's (`lock-mode-mismatch`): a test-first
// lock's own `--check` never reads SPEC.md, so without it a SPEC re-approved as test-infra beside an old test-first
// lock read `READY bootstrap` (grill G1).
// A test-first lock must also carry the test-infrastructure pin (6.20.0, schema `ac-tests-lock/3`): a `/2` or `/1`
// lock that the lock script checks GREEN is `lock-red` here, BEFORE the build, because /pharn-verify's AC gate would
// fail it as `test-infra-unpinned` after one — when re-running /pharn-test means setting the build aside.
//
// THE ONE BOUND ON "NOT-APPLICABLE", stated (grill G2): it is decided by `spec_template`, which the approval pin does
// not cover (spec-template.md, "Opt-in"). Removing that key AND deleting both AC-TESTS.md and the lock reads legacy.
// /pharn-loop — whose /pharn-spec always fills the template — therefore accepts only `READY *`.
// Every child is SHELLED, never re-derived (P3): this module owns only the branch and the closed vocabulary.
//
// OUTPUT: the FIRST line is one closed token — `READY test-first` | `READY bootstrap` | `NOT-APPLICABLE legacy-spec`
// (exit 0) or `RED <reason>` (exit 1), <reason> ∈ TEST_STAGE_REASONS — followed by the child checker's own lines,
// indented, as diagnosis. Exit 2 = unusable (bad usage, a child that could not be spawned or returned an unknown
// code). A child that CRASHES (a module-load failure, an uncaught throw) exits 1 — the same code as its RED — so it
// reads as that RED: fail-closed, but named by the child's reason rather than as a crash.
//
// `--require-test-first` is a caller's POLICY, in tested code: any pass other than `READY test-first` becomes
// `RED mode-not-allowed`. /pharn-loop and check-loop-fresh.mjs pass it — the loop never writes a legacy SPEC and never
// approves a test-infra one, so a bootstrap or legacy reading there means the SPEC changed around the gate.
//
// WHAT IT PROVES, and not (P0): that the checks it shells are GREEN now, for the files on disk now — floor, by their
// primitives (enum membership, content-hash). NOT that /pharn-test ran in THIS run (a lock from an earlier run over
// the same files passes — tree identity, not recency, as check-loop-fresh.mjs states for its own evidence), not
// that the tests are right, and not provenance: a self-consistent rewrite of tests and lock passes (L43).
// Test-file paths resolve against the CURRENT directory, exactly as the lock script resolves them: run it from the
// project root (check-loop-fresh.mjs spawns it with `cwd` = its `--repo`).

import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_AC_TESTS = join(HERE, "check-ac-tests.mjs");
const AC_TESTS_LOCK = join(HERE, "ac-tests-lock.mjs");

/** The features directory the lock script defaults to — passed through, never re-guessed. */
export const FEATURE_BASE = "pharn/features";

/** The closed RED vocabulary. Sorted; both closure directions are tested (L36). */
export const TEST_STAGE_REASONS = Object.freeze([
  "legacy-with-mapping",
  "lock-mode-mismatch",
  "lock-red",
  "lock-unusable",
  "mapping-red",
  "mode-not-allowed",
  "no-lock",
  "no-mapping",
  "spec-unusable",
]);

/** The closed PASS tokens (exit 0). */
export const READY_TOKENS = Object.freeze(["NOT-APPLICABLE legacy-spec", "READY bootstrap", "READY test-first"]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_CHILD_LINES = 20;

function present(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function run(script, args, cwd) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
  const lines = `${r.stdout ?? ""}${r.stderr ?? ""}`.split("\n").filter((l) => l.trim() !== "");
  return { status: r.error ? null : r.status, lines: lines.slice(-MAX_CHILD_LINES) };
}

const red = (reason, detail, child = null) => {
  if (!TEST_STAGE_REASONS.includes(reason)) throw new Error(`internal: ${reason} is not a TEST_STAGE_REASONS member`);
  return { code: 1, token: `RED ${reason}`, reason, detail, child };
};
const ready = (token, detail, child = null) => ({ code: 0, token, reason: null, detail, child });
const unusable = (detail, child = null) => ({ code: 2, token: "UNUSABLE", reason: null, detail, child });

/** The lock's recorded mode: `test-first` for an `ac-tests-lock/1` lock (it had no other), else its `mode` field;
 *  `null` when the file is not a JSON object (the lock script then says `lock-unusable`). Read only to compare with
 *  the SPEC's mode — REVIEW G1: a test-first lock's own `--check` never reads SPEC.md, so a SPEC re-approved as
 *  `test-infra` beside an old test-first lock would otherwise pass the bootstrap branch. */
function lockModeOf(path) {
  let v;
  try {
    v = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
  if (v === null || typeof v !== "object" || Array.isArray(v)) return null;
  if (v.schema === "ac-tests-lock/1") return "test-first";
  return typeof v.mode === "string" ? v.mode : null;
}

/** Does the lock carry the test-infrastructure pin (`test_infra`, schema `ac-tests-lock/3`, 6.20.0)? Read only after
 *  the lock script checked it GREEN, so the shape is already known good. REVIEW finding 8: a `/2` or `/1` test-first
 *  lock with a red run passes the lock's own `--check --require-red-run`, and /pharn-verify's AC gate then fails it
 *  as `test-infra-unpinned` — after a build that re-running /pharn-test would have to set aside. Refused HERE, before
 *  the build, where re-running /pharn-test is still cheap. */
function lockPinned(path) {
  try {
    const v = JSON.parse(readFileSync(path, "utf8"));
    return v !== null && typeof v === "object" && v.test_infra !== null && typeof v.test_infra === "object";
  } catch {
    return false;
  }
}

/** Map a lock `--check` result onto the gate's vocabulary. */
function fromLock(lock, readyToken, readyDetail) {
  if (lock.status === 0) return ready(readyToken, readyDetail, lock.lines);
  if (lock.status === 1) return red("lock-red", "the lock does not hold for the files on disk, or records no red run", lock.lines);
  if (lock.status === 2) return red("lock-unusable", "the lock is missing, not JSON, or not the closed shape", lock.lines);
  return unusable(`ac-tests-lock.mjs exited ${lock.status}`, lock.lines);
}

/**
 * The gate. `cwd` is the project root the children run in (test paths resolve against it); `base` is the features
 * directory relative to it.
 * @returns {{code: 0|1|2, token: string, reason: string|null, detail: string, child: string[]|null}}
 */
export function evaluateTestStage({ name, base = FEATURE_BASE, cwd = process.cwd(), requireTestFirst = false }) {
  const r = decide({ name, base, cwd });
  // The caller's POLICY, in tested code (REVIEW finding 2): /pharn-loop's /pharn-spec always fills the template and
  // never approves a test-infra SPEC, so for it only `READY test-first` is a pass — a bootstrap or a legacy reading
  // there means the SPEC was changed around the gate.
  if (requireTestFirst && r.code === 0 && r.token !== "READY test-first") {
    return red("mode-not-allowed", `the caller requires READY test-first, and the gate read ${r.token}`, r.child);
  }
  return r;
}

function decide({ name, base, cwd }) {
  if (typeof name !== "string" || !SLUG_RE.test(name)) return unusable(`<name> must be a plain slug matching ${SLUG_RE}`);
  const dir = join(base, name);
  const spec = join(dir, "SPEC.md");
  const plan = join(dir, "PLAN.md");
  const mapping = join(dir, "AC-TESTS.md");
  const lockFile = join(dir, "AC-TESTS.lock.json");
  const baseArgs = base === FEATURE_BASE ? [] : ["--base", base];

  const mode = run(CHECK_AC_TESTS, ["--spec", spec], cwd);
  if (mode.status === 2) return red("spec-unusable", "the SPEC is unreadable, or its criteria or spec_kind are unusable", mode.lines);
  if (mode.status === 3) {
    const leftovers = [mapping, lockFile].filter((p) => present(resolve(cwd, p)));
    if (leftovers.length) {
      return red(
        "legacy-with-mapping",
        `the SPEC has no spec_template, yet ${leftovers.join(" and ")} exist — the key was removed after mapping`
      );
    }
    return ready("NOT-APPLICABLE legacy-spec", "the SPEC has no spec_template, so it has no AC ids and no test stage");
  }
  if (mode.status === 4) {
    if (!present(resolve(cwd, lockFile))) return red("no-lock", `${lockFile} is absent — /pharn-test did not record the bootstrap`);
    const recorded = lockModeOf(resolve(cwd, lockFile));
    if (recorded !== null && recorded !== "bootstrap") {
      return red("lock-mode-mismatch", `the SPEC is spec_kind: test-infra but the lock is a ${recorded} lock — re-run /pharn-test`);
    }
    const lock = run(AC_TESTS_LOCK, ["--check", name, "--require-red-run", "--allow-bootstrap", ...baseArgs], cwd);
    return fromLock(lock, "READY bootstrap", "a spec_kind: test-infra SPEC with a bootstrap lock — no test ran before the build (weaker)");
  }
  if (mode.status !== 0) return unusable(`check-ac-tests.mjs --spec exited ${mode.status}`, mode.lines);

  if (!present(resolve(cwd, mapping))) return red("no-mapping", `${mapping} is absent — /pharn-plan writes it for a templated SPEC`);
  const full = run(CHECK_AC_TESTS, [mapping, spec, plan], cwd);
  if (full.status !== 0) {
    if (full.status === 1 || full.status === 2) {
      return red(
        "mapping-red",
        "the mapping no longer agrees with the current SPEC and PLAN (or a file it names is unreadable)",
        full.lines
      );
    }
    return unusable(`check-ac-tests.mjs exited ${full.status}`, full.lines);
  }
  if (!present(resolve(cwd, lockFile))) return red("no-lock", `${lockFile} is absent — /pharn-test did not run`);
  const recorded = lockModeOf(resolve(cwd, lockFile));
  if (recorded !== null && recorded !== "test-first") {
    return red("lock-mode-mismatch", `the SPEC is a feature SPEC but the lock is a ${recorded} lock — re-run /pharn-test`);
  }
  const lock = run(AC_TESTS_LOCK, ["--check", name, "--require-red-run", ...baseArgs], cwd);
  const r = fromLock(lock, "READY test-first", "the mapping holds and the lock records a red run over the pinned tests");
  if (r.code === 0 && !lockPinned(resolve(cwd, lockFile))) {
    return red(
      "lock-red",
      "the lock carries no test-infrastructure pin (written before 6.20.0) — re-run /pharn-test before the build",
      lock.lines
    );
  }
  return r;
}

export function main(argv) {
  const args = argv.slice(2);
  const name = args[0];
  let base = FEATURE_BASE;
  let requireTestFirst = false;
  let ok = typeof name === "string" && !name.startsWith("--");
  for (let i = 1; ok && i < args.length; i++) {
    if (args[i] === "--require-test-first") requireTestFirst = true;
    else if (args[i] === "--base" && args[i + 1] && !args[i + 1].startsWith("--")) base = args[++i];
    else ok = false;
  }
  if (!ok) {
    console.log("usage: check-test-stage.mjs <name> [--base <features-dir>] [--require-test-first]");
    return 2;
  }
  const r = evaluateTestStage({ name, base, requireTestFirst });
  console.log(`${r.token} — ${r.detail}`);
  for (const l of r.child ?? []) console.log(`  ${l}`);
  return r.code;
}

if (import.meta.main) process.exit(main(process.argv));
