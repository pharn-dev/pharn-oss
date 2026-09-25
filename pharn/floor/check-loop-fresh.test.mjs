// pharn/floor/check-loop-fresh.test.mjs — the freshness checker's suite.
//
// Every fixture is built by ONE helper (`iterate`) that fingerprints the fixture's REAL tree with
// worktree-fingerprint.mjs, writes real gate logs, and produces both reports by RUNNING check-verify.mjs
// --stamp and check-regress.mjs verdict — so a positive control passes because every check genuinely
// held, never because one was skipped (L34). Each check is then broken ALONE, and repaired, so every
// failing test names exactly one cause (GRILL finding 4).
//
// Most tests call `evaluate()` in-process, because `--experimental-test-coverage` cannot see a subprocess;
// the defaults test and the ★ WIRING test drive the real CLI, because the property there is what a pinned
// command line produces (L41, L45).
//
// NOTE, and it is the L43 proof rather than a shortcut: none of these stamps comes from a real gate run.
// They are self-consistent FABRICATIONS over the live tree, and the checker certifies them FRESH. That is
// its stated bound — agreement with the tree, never provenance.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  copyFileSync,
  symlinkSync,
  appendFileSync,
  unlinkSync,
  realpathSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint, ALGO } from "./worktree-fingerprint.mjs";
import { SCHEMA, LAPSE_CODES, REASON_CODES, AC_RESERVED_IDS, RESERVED_IDS, logBasename, resultsFileName } from "./gate-run-core.mjs";
import { filesDigest } from "./ac-tests-lock.mjs";
import { FAILING_IDS } from "./ac-gate-core.mjs";
import {
  evaluate,
  parseArgs,
  CHECKS,
  DEFAULT_STAMPS,
  DEFAULT_MAX_RERUNS,
  FEATURE_BASE,
  LEDGER_DIR,
  LEDGER_FILE,
  EXIT,
  COMPARED_FIELDS,
  stampDerivedMismatch,
} from "./check-loop-fresh.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "check-loop-fresh.mjs");
const FEATURE = "demo";
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const OTHER_SHA = "b".repeat(40);

function git(dir, ...args) {
  return execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

const CHECK_SPEC = join(HERE, "check-spec.mjs");
const LOCK_CLI = join(HERE, "ac-tests-lock.mjs");
const TEMPLATE = readFileSync(join(HERE, "..", "pharn-contracts", "templates", "spec-template.md"), "utf8");
const TEMPLATE_REF = spawnSync(process.execPath, [CHECK_SPEC, "--template-ref", "pharn-default"], { encoding: "utf8" }).stdout.trim();
const AC_TEST = "tests/ac/demo.unit.test.js";

/** The front a /pharn-loop run leaves (6.19.0): a TEMPLATED SPEC filled from the shipped template and pinned by
 *  `check-spec.mjs --hash`, a PLAN carrying that pin and `applied_lessons: none`, a GRILL.md, and a COMPLETE test
 *  stage — AC-TESTS.md mapping AC-1 to one test file, and a lock `ac-tests-lock.mjs --write` wrote, carrying a red run
 *  bound to its files. So check I's `check-test-stage --require-test-first` reads READY test-first (REVIEW finding 3:
 *  before this the fixture was a legacy SPEC, and the loop's real path through check I was never exercised). */
function writeFront(proj) {
  const fd = join(proj, FEATURE_BASE, FEATURE);
  mkdirSync(fd, { recursive: true });
  const draft = TEMPLATE.replace(/<!--\s*pharn:guidance[\s\S]*?-->\n?/g, "")
    .replace("spec_id: <name>", `spec_id: ${FEATURE}`)
    .replace("<the line check-spec.mjs --resolve-template-ref prints>", TEMPLATE_REF)
    .replace("<unit | integration | e2e>", "unit")
    .replace(/<[^>\n]+>/g, "filled");
  writeFileSync(join(fd, "SPEC.md"), draft);
  const h = spawnSync(process.execPath, [CHECK_SPEC, "--hash", join(fd, "SPEC.md")], { encoding: "utf8" }).stdout.trim();
  writeFileSync(
    join(fd, "SPEC.md"),
    draft.replace("state: Draft", "state: Approved").replace('spec_content_hash: ""', `spec_content_hash: ${h}`)
  );
  writeFileSync(
    join(fd, "PLAN.md"),
    `---\nspec_id: ${FEATURE}\nspec_content_hash: ${h}\napplied_lessons: none\n---\n\n## Files\n\n- \`a.txt\` — a\n`
  );
  writeFileSync(join(fd, "GRILL.md"), "# GRILL\n");
  // The project's test infrastructure, BEFORE --write takes its pin (6.20.0): the `test` script and its results format.
  writeFileSync(join(proj, "package.json"), JSON.stringify({ name: "fixture", scripts: { test: "vitest run" } }));
  writeFileSync(join(proj, "pharn.config.json"), JSON.stringify({ testResults: { test: "vitest-json" } }));
  writeFileSync(
    join(fd, "AC-TESTS.md"),
    `---\nspec_id: ${FEATURE}\nspec_content_hash: ${h}\n---\n\n## Files\n\n- \`${AC_TEST}\` — t\n\n## Mapping\n\n- AC-1 | unit | \`${AC_TEST}\` | src/x.js#f(): void\n`
  );
  mkdirSync(join(proj, "tests", "ac"), { recursive: true });
  writeFileSync(join(proj, AC_TEST), 'test("AC-1: t", async () => { await import("../../src/x.js"); });\n');
  const w = spawnSync(process.execPath, [LOCK_CLI, "--write", FEATURE], { cwd: proj, encoding: "utf8" });
  assert.equal(w.status, 0, `fixture: ac-tests-lock --write: ${w.stdout}`);
  const lockPath = join(fd, "AC-TESTS.lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.red_run = {
    stamp_sha256: "a".repeat(64),
    files_sha256: filesDigest(lock.files),
    gates: [{ gate: "test", results_sha256: "b".repeat(64) }],
    acs: [{ id: "AC-1", tests: [`${AC_TEST}::AC-1: t`] }],
  };
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));
}

/** A committed project. `sub` puts the PROJECT in a subdirectory of the git repo (the install-at-a-subpath
 *  case). Returns {root, proj, base}. */
function makeRepo({ sub = null, extra = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "clf-"));
  git(root, "init", "-q", ".");
  git(root, "config", "user.email", "t@t");
  git(root, "config", "user.name", "t");
  const proj = sub ? join(root, sub) : root;
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, ".gitignore"), ".pharn/\n");
  writeFileSync(join(proj, "a.txt"), "a\n");
  writeFront(proj);
  if (extra) extra(proj);
  git(root, "add", "-A");
  git(root, "commit", "-qm", "init");
  return { root, proj, base: git(root, "rev-parse", "HEAD") };
}

function withRepo(fn, opts) {
  const r = makeRepo(opts);
  try {
    return fn(r);
  } finally {
    rmSync(r.root, { recursive: true, force: true });
  }
}

/** Write one stamp and its logs under `<proj>/<stampRel>`'s directory. */
/** A vitest-json report of AC-1's test, as the reporter would write it at `proj` — under the path ITS process saw, the
 *  realpath of its cwd (`/private/var/…` on macOS, not the `/var/…` mkdtemp returns). */
function vitestDoc(proj, status) {
  return JSON.stringify({
    testResults: [
      {
        name: join(realpathSync(proj), AC_TEST),
        status,
        assertionResults: [{ ancestorTitles: [], title: "AC-1: t", fullName: "AC-1: t", status }],
      },
    ],
  });
}

function writeStamp(proj, stampRel, { stage, side, head, init, final, runs, completeness = null }) {
  const out = join(proj, dirname(stampRel));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const rec = runs.map(([id, exit, acStatus], seq) => {
    const b = logBasename(seq, id);
    writeFileSync(join(out, `${b}.out`), `out ${id} ${exit}\n`);
    writeFileSync(join(out, `${b}.err`), "");
    // The verify `test` gate writes its per-test results (6.15.0), which the AC gate reads (6.20.0): AC-1's test,
    // passed when the gate exited 0 unless a third element says otherwise; `malformed` is a hash-consistent file no
    // adapter can read — the AC gate's UNMEASURABLE reading (6.20.6 tests).
    let results_sha256 = null;
    if (stage === "verify" && id === "test") {
      const doc = acStatus === "malformed" ? "{ not json" : vitestDoc(proj, acStatus ?? (exit === 0 ? "passed" : "failed"));
      writeFileSync(join(out, resultsFileName(seq, id)), doc);
      results_sha256 = sha256(Buffer.from(doc));
    }
    return {
      seq,
      id,
      exit,
      ran: true,
      timed_out: false,
      mutated: false,
      reason: null,
      argv: id === "reconcile" ? ["true"] : ["npm", "run", id],
      shell: null,
      files: [],
      fp_before: init,
      fp_after: final,
      stdout_sha256: sha256(readFileSync(join(out, `${b}.out`))),
      stderr_sha256: sha256(readFileSync(join(out, `${b}.err`))),
      results_sha256,
    };
  });
  // fp chain: every run sees the same tree (init === final in every fixture below).
  const stamp = {
    schema: SCHEMA,
    stage,
    side,
    feature: FEATURE,
    head,
    source: "discover",
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: ALGO, init, final },
    required: runs.map(([id]) => id).filter((id) => id !== "reconcile"),
    runs: rec,
    aux: { completeness },
  };
  writeFileSync(join(proj, stampRel), JSON.stringify(stamp, null, 2));
  return stamp;
}

function runChecker(proj, script, args) {
  const r = spawnSync(process.execPath, [join(HERE, script), ...args], { cwd: proj, encoding: "utf8" });
  return JSON.parse(r.stdout);
}

/** Produce ONE iteration's evidence over the tree as it is now. `only` limits it to one stage — the
 *  "a stage was skipped" incident. `verifyRuns` / `regressRuns` set the recorded gate exits. */
function iterate(
  r,
  {
    only = null,
    verifyRuns = [
      ["test", 0],
      ["reconcile", 0],
    ],
    regressRuns = [["test", 0]],
    completeness = 0,
  } = {}
) {
  const { proj, base } = r;
  const fp = fingerprint(proj, { feature: FEATURE });
  assert.ok(fp.ok, "the fixture must fingerprint");
  const head = git(proj, "rev-parse", "HEAD");
  const fd = join(proj, FEATURE_BASE, FEATURE);
  if (only === null || only === "regress") {
    writeStamp(proj, DEFAULT_STAMPS.regressHead, {
      stage: "regress",
      side: "head",
      head,
      init: fp.digest,
      final: fp.digest,
      runs: regressRuns,
    });
    const bfp = sha256("base-tree");
    writeStamp(proj, DEFAULT_STAMPS.regressBase, { stage: "regress", side: "base", head: base, init: bfp, final: bfp, runs: regressRuns });
    const rep = runChecker(proj, "check-regress.mjs", [
      "verdict",
      "--base-stamp",
      join(proj, DEFAULT_STAMPS.regressBase),
      "--head-stamp",
      join(proj, DEFAULT_STAMPS.regressHead),
      "--base",
      base,
    ]);
    writeFileSync(join(fd, "regression-report.json"), JSON.stringify(rep, null, 2));
  }
  if (only === null || only === "verify") {
    writeStamp(proj, DEFAULT_STAMPS.verify, {
      stage: "verify",
      side: null,
      head,
      init: fp.digest,
      final: fp.digest,
      runs: verifyRuns,
      completeness,
    });
    const rep = runChecker(proj, "check-verify.mjs", ["--stamp", join(proj, DEFAULT_STAMPS.verify), "--feature", FEATURE, "--ac-gate"]);
    rep.completeness = { complete: true, missing: [], skipped: [] };
    rep.verifiers = { registered: 0, findings: [] };
    writeFileSync(join(fd, "verify-report.json"), JSON.stringify(rep, null, 2));
  }
}

const args = (r, extra = []) => ["--feature", FEATURE, "--base", r.base, "--iter", "1", "--repo", r.proj, ...extra];
const reportPath = (r, f) => join(r.proj, FEATURE_BASE, FEATURE, f);
const readJ = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJ = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2));
const ledger = (r) => join(r.proj, LEDGER_DIR, FEATURE, LEDGER_FILE);

function expect(res, { code, verdict, reason_code = undefined, stage = undefined }) {
  assert.equal(res.code, code, `exit ${res.code} ≠ ${code}: ${JSON.stringify(res.doc)}`);
  assert.equal(res.doc.verdict, verdict);
  if (reason_code !== undefined) assert.equal(res.doc.reason_code, reason_code, res.doc.reason);
  if (stage !== undefined) assert.equal(res.doc.stage_to_rerun, stage);
}

// ---------------------------------------------------------------------------------------------------
// The sets are counted (L34/L52)
// ---------------------------------------------------------------------------------------------------

test("✧ L34/L52 — the check set is exactly A–J in evaluation order, fabrication before staleness", () => {
  assert.deepEqual([...CHECKS], ["A", "B", "C", "D", "J", "E", "H", "F", "G", "I"]);
  assert.ok(
    CHECKS.indexOf("J") < CHECKS.indexOf("F") && CHECKS.indexOf("E") < CHECKS.indexOf("F") && CHECKS.indexOf("H") < CHECKS.indexOf("G")
  );
  assert.deepEqual(COMPARED_FIELDS.verify, ["verdict", "failing_gates", "gates", "ac_gate"]);
  // The AC ids E subtracts over a moved tree (6.20.6): gate-run-core's named half, which must AGREE with the AC gate's
  // own FAILING_IDS (L43 — two stores of one fact, pinned), sit inside RESERVED_IDS, and never include a real gate id.
  assert.ok(Object.isFrozen(AC_RESERVED_IDS));
  assert.deepEqual([...AC_RESERVED_IDS].sort(), Object.values(FAILING_IDS).sort());
  assert.ok(AC_RESERVED_IDS.every((id) => RESERVED_IDS.includes(id)));
  assert.ok(!AC_RESERVED_IDS.includes("reconcile"), "reconcile is a real verify gate — never subtracted");
  assert.deepEqual(COMPARED_FIELDS.regress, ["verdict", "regressions", "pre_existing", "outside_gates"]);
  assert.ok(LAPSE_CODES.length > 0 && LAPSE_CODES.every((c) => REASON_CODES.includes(c)));
});

test("✧ L52 — the feature root is ONE literal in the module source (no second copy of the default)", () => {
  const src = readFileSync(CLI, "utf8");
  assert.equal(src.match(/"pharn\/features"/g).length, 1);
});

// ---------------------------------------------------------------------------------------------------
// The positive control, and the defaults
// ---------------------------------------------------------------------------------------------------

test("FRESH: a complete iteration over the current tree passes EVERY check, including --front", () => {
  withRepo((r) => {
    iterate(r);
    const res = evaluate(args(r, ["--front"]));
    expect(res, { code: EXIT.FRESH, verdict: "FRESH", reason_code: null });
    for (const c of CHECKS) assert.equal(res.doc.checks[c], "pass", `check ${c} did not run and pass`);
  });
});

test("L41 — the CLI with NONE of the stamp flags, no --repo and no --max-reruns uses the pinned defaults", () => {
  withRepo((r) => {
    iterate(r);
    const run = (a) => spawnSync(process.execPath, [CLI, ...a], { cwd: r.proj, encoding: "utf8" });
    const base = ["--feature", FEATURE, "--base", r.base, "--iter", "1"];
    let p = run(base);
    assert.equal(p.status, 0, p.stdout);
    assert.equal(JSON.parse(p.stdout).verdict, "FRESH");
    assert.match(p.stderr, /never provenance/, "the bound is printed on stderr");
    // The default --max-reruns is 1: one RERUN, then the budget is spent.
    writeFileSync(join(r.proj, "a.txt"), "moved\n");
    p = run(base);
    assert.equal(p.status, 1, p.stdout);
    assert.equal(DEFAULT_MAX_RERUNS, 1);
    p = run(base);
    assert.equal(p.status, 4);
    assert.equal(JSON.parse(p.stdout).reason_code, "rerun-budget-exhausted");
  });
});

test("the explicit stamp flags are honoured (a relocated stamp set is found, the default location ignored)", () => {
  withRepo((r) => {
    iterate(r);
    const moved = { verify: ".pharn/x/v.json", regressHead: ".pharn/x/h.json", regressBase: ".pharn/x/b.json" };
    // A stamp's logs live in its own directory, so relocate each stamp WITH its logs.
    for (const [k, to] of Object.entries(moved)) {
      const fromDir = join(r.proj, dirname(DEFAULT_STAMPS[k]));
      const toDir = join(r.proj, dirname(to), k);
      mkdirSync(toDir, { recursive: true });
      for (const f of execFileSync("ls", [fromDir], { encoding: "utf8" }).split("\n").filter(Boolean))
        copyFileSync(join(fromDir, f), join(toDir, f));
      moved[k] = join(dirname(to), k, "stamp.json");
      rmSync(fromDir, { recursive: true, force: true });
    }
    expect(evaluate(args(r)), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "stamp-missing" });
    rmSync(ledger(r), { force: true });
    const res = evaluate(
      args(r, ["--verify-stamp", moved.verify, "--regress-head-stamp", moved.regressHead, "--regress-base-stamp", moved.regressBase])
    );
    expect(res, { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

// ---------------------------------------------------------------------------------------------------
// Each check fails ALONE with its own code and stage, and passes once repaired (L4/L34/L52)
// ---------------------------------------------------------------------------------------------------

test("A — a missing report re-runs THAT stage (report-missing), and passes once restored", () => {
  withRepo((r) => {
    iterate(r);
    for (const [file, stage] of [
      ["verify-report.json", "verify"],
      ["regression-report.json", "regress"],
    ]) {
      const p = reportPath(r, file);
      const keep = readFileSync(p);
      unlinkSync(p);
      expect(evaluate(args(r, ["--max-reruns", "9"])), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "report-missing", stage });
      writeFileSync(p, keep);
    }
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("A — an unparseable report, and a verdict outside its enum, are report-malformed re-runs", () => {
  withRepo((r) => {
    iterate(r);
    const p = reportPath(r, "regression-report.json");
    const keep = readFileSync(p);
    writeFileSync(p, "{ not json");
    expect(evaluate(args(r, ["--max-reruns", "9"])), {
      code: EXIT.RERUN,
      verdict: "RERUN",
      reason_code: "report-malformed",
      stage: "regress",
    });
    const v = JSON.parse(keep);
    v.verdict = "GREEN";
    writeJ(p, v);
    expect(evaluate(args(r, ["--max-reruns", "9"])), {
      code: EXIT.RERUN,
      verdict: "RERUN",
      reason_code: "report-malformed",
      stage: "regress",
    });
    writeFileSync(p, keep);
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("B — EVERY lapse code re-runs the stage (L52: each member of LAPSE_CODES)", () => {
  withRepo((r) => {
    iterate(r);
    const p = reportPath(r, "verify-report.json");
    const keep = readFileSync(p);
    for (const code of LAPSE_CODES) {
      const v = JSON.parse(keep);
      v.reason_code = code;
      writeJ(p, v);
      expect(evaluate(args(r, ["--max-reruns", "99"])), { code: EXIT.RERUN, verdict: "RERUN", reason_code: code, stage: "verify" });
    }
    writeFileSync(p, keep);
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("B — empty-source-set is S4 (a STOP carrying its own code), never stale evidence", () => {
  withRepo((r) => {
    iterate(r);
    const p = reportPath(r, "verify-report.json");
    const v = readJ(p);
    v.reason_code = "empty-source-set";
    writeJ(p, v);
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "empty-source-set", stage: null });
  });
});

test("B — a NON-lapse member stops with its own code; a non-member is a report-malformed re-run", () => {
  withRepo((r) => {
    iterate(r);
    const p = reportPath(r, "regression-report.json");
    const keep = readFileSync(p);
    for (const code of ["coverage-violation", "base-head-mismatch", "usage-error"]) {
      const v = JSON.parse(keep);
      v.reason_code = code;
      writeJ(p, v);
      assert.ok(!LAPSE_CODES.includes(code), `precondition: ${code} is not a lapse`);
      expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: code });
    }
    const v = JSON.parse(keep);
    v.reason_code = "stamp-missng";
    writeJ(p, v);
    expect(evaluate(args(r)), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "report-malformed", stage: "regress" });
  });
});

test("C — a missing or unfinalized stamp re-runs its stage; a malformed or mis-labelled one stops", () => {
  withRepo((r) => {
    iterate(r);
    const vp = join(r.proj, DEFAULT_STAMPS.verify);
    const keep = readFileSync(vp);
    unlinkSync(vp);
    expect(evaluate(args(r, ["--max-reruns", "9"])), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "stamp-missing", stage: "verify" });
    const s = JSON.parse(keep);
    writeJ(vp, { ...s, finalized: false });
    expect(evaluate(args(r, ["--max-reruns", "9"])), {
      code: EXIT.RERUN,
      verdict: "RERUN",
      reason_code: "stamp-unfinalized",
      stage: "verify",
    });
    writeFileSync(vp, "{ torn");
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "stamp-malformed" });
    writeJ(vp, { ...s, feature: "other" });
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "feature-mismatch" });
    writeFileSync(vp, keep);
    const bp = join(r.proj, DEFAULT_STAMPS.regressBase);
    const bkeep = readFileSync(bp);
    writeJ(bp, { ...JSON.parse(bkeep), side: "head" });
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "side-mismatch" });
    unlinkSync(bp);
    expect(evaluate(args(r, ["--max-reruns", "9"])), {
      code: EXIT.RERUN,
      verdict: "RERUN",
      reason_code: "stamp-missing",
      stage: "regress",
    });
    writeFileSync(bp, bkeep);
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("D — a report whose gate_run does not name the stamp on disk re-runs (report-stamp-unbound), both reports", () => {
  withRepo((r) => {
    iterate(r);
    for (const [stampRel, stage] of [
      [DEFAULT_STAMPS.verify, "verify"],
      [DEFAULT_STAMPS.regressHead, "regress"],
      [DEFAULT_STAMPS.regressBase, "regress"],
    ]) {
      const p = join(r.proj, stampRel);
      const keep = readFileSync(p);
      // Same content, different bytes: validateStamp still passes, the hash binding does not.
      writeFileSync(p, JSON.stringify(JSON.parse(keep)));
      expect(evaluate(args(r, ["--max-reruns", "9"])), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "report-stamp-unbound", stage });
      writeFileSync(p, keep);
    }
    // A hand-written report with no gate_run at all is unbound too.
    const rp = reportPath(r, "verify-report.json");
    const rkeep = readFileSync(rp);
    const v = JSON.parse(rkeep);
    delete v.gate_run;
    writeJ(rp, v);
    expect(evaluate(args(r, ["--max-reruns", "9"])), {
      code: EXIT.RERUN,
      verdict: "RERUN",
      reason_code: "report-stamp-unbound",
      stage: "verify",
    });
    writeFileSync(rp, rkeep);
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("J — an edited, appended-to or pruned gate log STOPS (output-hash-mismatch, the member's first emitter)", () => {
  withRepo((r) => {
    iterate(r);
    const log = join(r.proj, dirname(DEFAULT_STAMPS.verify), `${logBasename(0, "test")}.out`);
    const keep = readFileSync(log);
    appendFileSync(log, "late write\n");
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "output-hash-mismatch" });
    unlinkSync(log);
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "output-hash-mismatch" });
    writeFileSync(log, keep);
    const blog = join(r.proj, dirname(DEFAULT_STAMPS.regressBase), `${logBasename(0, "test")}.err`);
    writeFileSync(blog, "x");
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "output-hash-mismatch" });
    writeFileSync(blog, "");
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("J — an edited or removed per-test RESULTS file STOPS output-hash-mismatch (6.20.0), never a verdict mismatch at E", () => {
  withRepo((r) => {
    iterate(r);
    const file = join(r.proj, dirname(DEFAULT_STAMPS.verify), resultsFileName(0, "test"));
    const keep = readFileSync(file);
    writeFileSync(file, keep.toString().replace('"passed"', '"failed"'));
    let res = evaluate(args(r));
    expect(res, { code: EXIT.STOP, verdict: "STOP", reason_code: "output-hash-mismatch" });
    assert.equal(res.doc.checks.J, "fail");
    assert.match(res.doc.reason, /results_sha256 for gate "test"/);
    unlinkSync(file);
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "output-hash-mismatch" });
    writeFileSync(file, keep);
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("E defers to F when the tree moved (grill G6): the AC gate reads the live tree, so staleness is a RERUN — but a forged `gates` still STOPS", () => {
  withRepo((r) => {
    iterate(r);
    const p = reportPath(r, "verify-report.json");
    const keep = readFileSync(p);
    // the tree moves after verify: the AC gate's re-derivation now reads a different lock/test world
    writeFileSync(join(r.proj, AC_TEST), "moved after verify\n");
    let res = evaluate(args(r));
    expect(res, { code: EXIT.RERUN, verdict: "RERUN", reason_code: "tree-moved-since-verify", stage: "verify" });
    assert.equal(res.doc.checks.E, "pass", "E deferred instead of calling staleness a fabrication");
    // control: `gates` depends on the stamp ALONE, so a forgery of it is caught even over a moved tree
    const v = JSON.parse(keep);
    writeJ(p, { ...v, gates: { ...v.gates, reconcile: 1 } });
    res = evaluate(args(r));
    expect(res, { code: EXIT.STOP, verdict: "STOP", reason_code: "report-verdict-mismatch" });
    // and over an UNMOVED tree the AC block is compared too: an edited per-AC table is a fabrication
    git(r.root, "checkout", "--", ".");
    writeFileSync(p, keep);
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
    writeJ(p, { ...v, ac_gate: { ...v.ac_gate, acs: v.ac_gate.acs.map((a) => ({ ...a, tests: ["forged"] })) } });
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "report-verdict-mismatch" });
  });
});

// ── E over a MOVED tree compares what the stamp alone decides (6.20.6, 2026-09-24 review finding 1) ────────────────────

/** Each world: the verify evidence it is built from, and the forgeries of its STAMP-DERIVED part — every one must STOP
 *  over a moved tree in both modes (L29: the set is the deliverable, iterated below). */
const MOVED_TREE_WORLDS = [
  {
    name: "a red test gate (honest FAIL [ac-delivery, test]) — the review's forgery",
    opts: {
      verifyRuns: [
        ["test", 1],
        ["reconcile", 0],
      ],
    },
    forgeries: [
      (v) => ({ ...v, verdict: "PASS", failing_gates: [] }),
      (v) => ({ ...v, failing_gates: ["ac-delivery"] }),
      (v) => ({ ...v, verdict: "INCOMPLETE", failing_gates: [] }),
      (v) => ({ ...v, failing_gates: "test" }),
    ],
  },
  {
    name: "a reconcile red (honest FAIL [reconcile])",
    opts: {
      verifyRuns: [
        ["test", 0],
        ["reconcile", 1],
      ],
    },
    forgeries: [(v) => ({ ...v, failing_gates: [] }), (v) => ({ ...v, verdict: "PASS", failing_gates: [] })],
  },
  {
    name: "an incomplete build (honest INCOMPLETE [])",
    opts: { completeness: 1 },
    forgeries: [(v) => ({ ...v, verdict: "PASS" })],
  },
  {
    name: "a green iteration (honest PASS [])",
    opts: {},
    forgeries: [(v) => ({ ...v, verdict: "PASS", failing_gates: ["ac-delivery"] }), (v) => ({ ...v, verdict: "FAIL" })],
  },
];

test("E over a MOVED tree: a forgery of anything the stamp alone decides STOPs report-verdict-mismatch (iteration AND commit gate); the honest report still re-runs", () => {
  withRepo((r) => {
    let iter = 0;
    const at = (extra) => ["--feature", FEATURE, "--base", r.base, "--repo", r.proj, ...extra];
    const p = reportPath(r, "verify-report.json");
    for (const w of MOVED_TREE_WORLDS) {
      git(r.root, "checkout", "--", ".");
      iterate(r, w.opts);
      const keep = readFileSync(p);
      writeFileSync(join(r.proj, "a.txt"), `moved under ${w.name}\n`);
      // the honest report over the moved tree: staleness, re-run (a fresh --iter each, so the budget never decides)
      let res = evaluate(at(["--iter", String(++iter)]));
      expect(res, { code: EXIT.RERUN, verdict: "RERUN", reason_code: "tree-moved-since-verify", stage: "verify" });
      assert.equal(res.doc.checks.E, "pass", `${w.name}: E let the honest report through`);
      expect(evaluate(at(["--commit-gate"])), { code: EXIT.STOP, verdict: "STOP", reason_code: "tree-moved-since-verify" });
      for (const forge of w.forgeries) {
        writeJ(p, forge(JSON.parse(keep)));
        res = evaluate(at(["--iter", String(++iter)]));
        expect(res, { code: EXIT.STOP, verdict: "STOP", reason_code: "report-verdict-mismatch" });
        assert.equal(res.doc.checks.E, "fail", `${w.name}: the forgery was named by E`);
        expect(evaluate(at(["--commit-gate"])), { code: EXIT.STOP, verdict: "STOP", reason_code: "report-verdict-mismatch" });
      }
      writeFileSync(p, keep);
    }
  });
});

test("THE STATED RESIDUAL: a forgery confined to the AC part over a moved tree is re-run (never trusted), and the commit gate stops", () => {
  withRepo((r) => {
    // the AC gate could not measure (a hash-consistent malformed results file): honest INCONCLUSIVE over green gates
    iterate(r, {
      verifyRuns: [
        ["test", 0, "malformed"],
        ["reconcile", 0],
      ],
    });
    const p = reportPath(r, "verify-report.json");
    assert.equal(readJ(p).verdict, "INCONCLUSIVE", "precondition: the AC gate is unmeasurable");
    writeJ(p, { ...readJ(p), verdict: "PASS" });
    expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "report-verdict-mismatch" });
    writeFileSync(join(r.proj, "a.txt"), "moved\n");
    expect(evaluate(args(r)), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "tree-moved-since-verify", stage: "verify" });
    expect(evaluate(["--feature", FEATURE, "--base", r.base, "--repo", r.proj, "--commit-gate"]), {
      code: EXIT.STOP,
      verdict: "STOP",
      reason_code: "tree-moved-since-verify",
    });
  });
});

test("stampDerivedMismatch — each field named; the GATE-1 merge-order pins accept BOTH check-verify precedences", () => {
  const gates = { reconcile: 0, test: 0 };
  const incomplete = { gates, failing_gates: [], verdict: "INCOMPLETE" };
  // over an INCOMPLETE stamp: group C's precedence (INCOMPLETE outranks a delivery-only or unmeasurable AC gate) and
  // 6.20.0's (a delivery red is FAIL, an unmeasurable gate INCONCLUSIVE) are both honest; PASS is not
  assert.equal(stampDerivedMismatch({ gates, failing_gates: [], verdict: "INCOMPLETE" }, incomplete), null);
  assert.equal(stampDerivedMismatch({ gates, failing_gates: ["ac-delivery"], verdict: "FAIL" }, incomplete), null);
  assert.equal(stampDerivedMismatch({ gates, failing_gates: [], verdict: "INCONCLUSIVE" }, incomplete), null);
  assert.equal(stampDerivedMismatch({ gates, failing_gates: [], verdict: "PASS" }, incomplete), "verdict");
  const pass = { gates, failing_gates: [], verdict: "PASS" };
  const red = { gates: { reconcile: 0, test: 1 }, failing_gates: ["test"], verdict: "FAIL" };
  for (const [report, stampOnly, want] of [
    [{ gates: { reconcile: 0, test: 1 }, failing_gates: [], verdict: "PASS" }, pass, "gates"],
    [{ gates, failing_gates: "none", verdict: "PASS" }, pass, "failing_gates"],
    [{ gates, failing_gates: ["bogus"], verdict: "FAIL" }, pass, "failing_gates"],
    [{ ...red, failing_gates: [] }, red, "failing_gates"],
    [{ ...red, failing_gates: ["ac-delivery"] }, red, "failing_gates"],
    [{ ...red, verdict: "PASS" }, red, "verdict"],
    [{ gates, failing_gates: [], verdict: "FAIL" }, pass, "verdict"],
    [{ gates, failing_gates: ["ac-evidence"], verdict: "PASS" }, pass, "verdict"],
    [{ ...red, failing_gates: ["ac-delivery", "ac-evidence", "test"] }, red, null],
    [{ gates, failing_gates: ["ac-evidence"], verdict: "FAIL" }, pass, null],
    [{ gates, failing_gates: [], verdict: "INCONCLUSIVE" }, pass, null],
    [pass, pass, null],
    // stated bound: a hand-made stamp whose GATE is named like an AC id reads as a mismatch — a STOP, fail-closed
    [
      { gates: { "ac-delivery": 1 }, failing_gates: ["ac-delivery"], verdict: "FAIL" },
      { gates: { "ac-delivery": 1 }, failing_gates: ["ac-delivery"], verdict: "FAIL" },
      "failing_gates",
    ],
  ]) {
    assert.equal(stampDerivedMismatch(report, stampOnly), want, JSON.stringify(report));
  }
});

test("✧ DIFFERENTIAL (L55) — the relation holds for EVERY honest report the REAL check-verify produces, with and without --ac-gate", () => {
  withRepo((r) => {
    const fp = fingerprint(r.proj, { feature: FEATURE });
    const head = git(r.proj, "rev-parse", "HEAD");
    const stampPath = join(r.proj, DEFAULT_STAMPS.verify);
    const verify = (extra) => runChecker(r.proj, "check-verify.mjs", ["--stamp", stampPath, "--feature", FEATURE, ...extra]);
    const worlds = [];
    for (const testExit of [0, 1])
      for (const completeness of [0, 1])
        for (const ac of ["passed", "skipped", "malformed", "evidence"])
          worlds.push({
            runs: [
              ["test", testExit, ac === "evidence" ? undefined : ac],
              ["reconcile", 0],
            ],
            completeness,
            evidence: ac === "evidence",
          });
    worlds.push({
      runs: [
        ["test", 0],
        ["reconcile", 1],
      ],
      completeness: 0,
      evidence: false,
    });
    const seen = { withAc: new Set(), flagless: new Set(), ac: new Set(), ids: new Set(), forgedPasses: 0, forgedStops: 0 };
    const pristine = readFileSync(join(r.proj, AC_TEST));
    for (const w of worlds) {
      writeFileSync(join(r.proj, AC_TEST), w.evidence ? "edited after the red run\n" : pristine);
      writeStamp(r.proj, DEFAULT_STAMPS.verify, {
        stage: "verify",
        side: null,
        head,
        init: fp.digest,
        final: fp.digest,
        runs: w.runs,
        completeness: w.completeness,
      });
      const withAc = verify(["--ac-gate"]);
      const flagless = verify([]);
      assert.equal(
        stampDerivedMismatch(withAc, flagless),
        null,
        `an HONEST report read as a mismatch: ${JSON.stringify({ w, withAc: [withAc.verdict, withAc.failing_gates], flagless: [flagless.verdict, flagless.failing_gates] })}`
      );
      seen.withAc.add(withAc.verdict);
      seen.flagless.add(flagless.verdict);
      seen.ac.add(withAc.ac_gate?.verdict);
      for (const id of withAc.failing_gates) seen.ids.add(id);
      // negative control: the review's forgery is caught exactly when the STAMP alone says not-PASS — else it is the
      // stated AC-only residual (re-run at F, never trusted)
      const caught = stampDerivedMismatch({ ...withAc, verdict: "PASS", failing_gates: [] }, flagless) !== null;
      assert.equal(caught, flagless.verdict !== "PASS", JSON.stringify(w));
      if (caught) seen.forgedStops++;
      else if (withAc.verdict !== "PASS") seen.forgedPasses++;
    }
    writeFileSync(join(r.proj, AC_TEST), pristine);
    // L34 — non-vacuous: every verdict class and both AC ids were actually produced, and both control outcomes seen
    for (const v of ["PASS", "FAIL", "INCOMPLETE", "INCONCLUSIVE"])
      assert.ok(seen.withAc.has(v), `no world produced ${v} with --ac-gate: ${[...seen.withAc]}`);
    for (const v of ["PASS", "FAIL", "INCOMPLETE"]) assert.ok(seen.flagless.has(v), `no world produced ${v} flag-less`);
    for (const v of ["PASS", "FAIL", "INCONCLUSIVE"]) assert.ok(seen.ac.has(v), `no world produced an AC gate ${v}: ${[...seen.ac]}`);
    for (const id of [...AC_RESERVED_IDS, "test", "reconcile"]) assert.ok(seen.ids.has(id), `no world failed ${id}`);
    assert.ok(seen.forgedStops > 0 && seen.forgedPasses > 0, JSON.stringify(seen));
  });
});

test("★ END TO END (6.20.0) — an undelivered AC iterates, the fix stops GREEN, and a Bash-edited pinned test is S13 with no commit", () => {
  const CHECK_LOOP = join(HERE, "check-loop.mjs");
  const DECISION = join(HERE, "check-loop-decision.mjs");
  withRepo((r) => {
    const fd = join(r.proj, FEATURE_BASE, FEATURE);
    const loop = (iter) => {
      const out = spawnSync(
        process.execPath,
        [CHECK_LOOP, join(fd, "verify-report.json"), join(fd, "regression-report.json"), "--iter", String(iter), "--cap", "3"],
        { encoding: "utf8" }
      );
      return { code: out.status, doc: JSON.parse(out.stdout) };
    };
    const verify = () => JSON.parse(readFileSync(join(fd, "verify-report.json"), "utf8"));

    // 1. The build has not delivered AC-1: the test gate fails and AC-1's own test failed.
    iterate(r, {
      verifyRuns: [
        ["test", 1],
        ["reconcile", 0],
      ],
    });
    expect(evaluate(args(r, ["--front"])), { code: EXIT.FRESH, verdict: "FRESH" }); // the pinned freshness line first (L45)
    assert.equal(verify().verdict, "FAIL");
    assert.deepEqual(verify().failing_gates, ["ac-delivery", "test"]);
    assert.equal(verify().ac_gate.acs[0].reason, "ac-not-passed");
    let d = loop(1);
    assert.equal(d.doc.decision, "CONTINUE", "an undelivered AC is a measurable red: the loop iterates");
    assert.equal(d.doc.terminal_cause, null);

    // 1b. The headline case (REVIEW finding 6): every real gate GREEN, AC-1's test SKIPPED — only the AC gate is red.
    iterate(r, {
      verifyRuns: [
        ["test", 0, "skipped"],
        ["reconcile", 0],
      ],
    });
    expect(evaluate(args(r, ["--front"])), { code: EXIT.FRESH, verdict: "FRESH" });
    assert.deepEqual(verify().failing_gates, ["ac-delivery"]);
    assert.deepEqual(verify().gates, { reconcile: 0, test: 0 });
    d = loop(1);
    assert.equal(d.doc.decision, "CONTINUE");

    // 2. The fix: AC-1's test passes on the head run.
    iterate(r);
    expect(evaluate(args(r, ["--front"])), { code: EXIT.FRESH, verdict: "FRESH" });
    assert.equal(verify().verdict, "PASS");
    assert.equal(verify().ac_gate.verdict, "PASS");
    d = loop(2);
    assert.equal(d.doc.decision, "STOP_GREEN");
    expect(evaluate([...args(r, ["--front"]).filter((a, i, all) => a !== "--iter" && all[i - 1] !== "--iter"), "--commit-gate"]), {
      code: EXIT.FRESH,
      verdict: "FRESH",
    });

    // 3. A pinned test edited through Bash after the red run. It is outside the build's scope, so reconcile is red too.
    writeFileSync(join(r.proj, AC_TEST), 'test("AC-1: t", () => {});\n');
    iterate(r, {
      verifyRuns: [
        ["test", 0],
        ["reconcile", 1],
      ],
    });
    assert.deepEqual(verify().failing_gates, ["ac-evidence", "reconcile"]);
    assert.equal(verify().ac_gate.evidence[0].reason, "ac-tests-modified");
    // the decision-time freshness line meets it first — S13, never S11 (grill G1)
    const fresh = evaluate(args(r, ["--front"]));
    expect(fresh, { code: EXIT.STOP, verdict: "STOP", reason_code: "ac-evidence-invalid" });
    // and past check I, the stop core itself stops terminally on the evidence, never STOP_GREEN, never a retry
    d = loop(1);
    assert.equal(d.code, 4);
    assert.equal(d.doc.decision, "STOP_TERMINAL");
    assert.equal(d.doc.terminal_cause, "ac-evidence");
    // the Step 6c commit gate refuses too — a STOP, never a re-run
    const commitArgs = [...args(r, ["--front"]).filter((a, i, all) => a !== "--iter" && all[i - 1] !== "--iter"), "--commit-gate"];
    expect(evaluate(commitArgs), { code: EXIT.STOP, verdict: "STOP", reason_code: "ac-evidence-invalid" });
    // no commit: a record forged to STOP_GREEN over these reports is not re-derivable, so Step 6c refuses it
    writeFileSync(
      join(fd, "LOOP.md"),
      "---\ndecision: STOP_GREEN\niterations: 1\ncommit: unknown\ndate: 2026-09-24\ncap: 3\n---\n\n## Handoff\n\n### investigated\n\nx\n\n### learned\n\ny\n\n### next_steps\n\nz\n"
    );
    const dec = spawnSync(process.execPath, [DECISION, join(fd, "LOOP.md")], { encoding: "utf8" });
    assert.equal(dec.status, 1, dec.stdout);
    assert.match(dec.stdout, /STOP_TERMINAL/);
  });
});

test("E — LAPSE vs FABRICATION: a report whose floor fields disagree with a live re-derivation STOPS", () => {
  withRepo((r) => {
    // A reconcile red: the verify report says FAIL with failing_gates ["reconcile"] — STOP_TERMINAL for the
    // loop. The forgery drops `reconcile` so check-loop.mjs would read a retryable red instead.
    iterate(r, {
      verifyRuns: [
        ["test", 0],
        ["reconcile", 1],
      ],
    });
    const p = reportPath(r, "verify-report.json");
    const keep = readFileSync(p);
    assert.deepEqual(JSON.parse(keep).failing_gates, ["reconcile"], "precondition: the honest report names the reconcile red");
    assert.equal(JSON.parse(keep).ac_gate.verdict, "PASS", "precondition: AC-1 is delivered, so the forgery below is the only difference");
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
    for (const forge of [
      (v) => ({ ...v, failing_gates: [] }),
      (v) => ({ ...v, verdict: "PASS", failing_gates: [] }),
      (v) => ({ ...v, gates: { ...v.gates, reconcile: 0 } }),
    ]) {
      writeJ(p, forge(JSON.parse(keep)));
      expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "report-verdict-mismatch" });
    }
    writeFileSync(p, keep);
    const rp = reportPath(r, "regression-report.json");
    const rkeep = readFileSync(rp);
    for (const forge of [
      (v) => ({ ...v, verdict: "regressions" }),
      (v) => ({ ...v, regressions: ["test"] }),
      (v) => ({ ...v, outside_gates: {} }),
    ]) {
      writeJ(rp, forge(JSON.parse(rkeep)));
      expect(evaluate(args(r)), { code: EXIT.STOP, verdict: "STOP", reason_code: "report-verdict-mismatch" });
    }
    writeFileSync(rp, rkeep);
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("H — a regress base stamp from a different base STOPS (base-head-mismatch)", () => {
  withRepo((r) => {
    iterate(r);
    expect(evaluate(["--feature", FEATURE, "--base", OTHER_SHA, "--iter", "1", "--repo", r.proj]), {
      code: EXIT.STOP,
      verdict: "STOP",
      reason_code: "base-head-mismatch",
    });
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("F — an edit to an INCLUDED file after verify re-runs verify; an EXCLUDED artifact does not; PLAN.md does (L39)", () => {
  withRepo((r) => {
    iterate(r);
    // Excluded post-build artifacts: writing them after verify is the pipeline's own normal behaviour.
    for (const f of ["VERIFY.md", "cost.json", "RUN-REPORT.md", "LOOP.md"]) writeFileSync(reportPath(r, f), "written after verify\n");
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
    // An included source file.
    writeFileSync(join(r.proj, "a.txt"), "moved\n");
    expect(evaluate(args(r)), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "tree-moved-since-verify", stage: "verify" });
    writeFileSync(join(r.proj, "a.txt"), "a\n");
    rmSync(ledger(r), { force: true });
    expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
    // PLAN.md is INCLUDED by the fingerprint even though reconcile exempts it — the L39 divergence.
    appendFileSync(reportPath(r, "PLAN.md"), "\nedited after verify\n");
    expect(evaluate(args(r)), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "tree-moved-since-verify", stage: "verify" });
  });
});

test("F/G — THE INCIDENT: a skipped verify, then a skipped regress, each re-runs exactly the skipped stage", () => {
  withRepo((r) => {
    iterate(r); // iteration 1, complete
    writeFileSync(join(r.proj, "a.txt"), "iteration 2 build\n"); // iteration 2's build changed the tree
    iterate(r, { only: "regress" }); // … and /pharn-verify was SKIPPED
    expect(evaluate(["--feature", FEATURE, "--base", r.base, "--iter", "2", "--repo", r.proj]), {
      code: EXIT.RERUN,
      verdict: "RERUN",
      reason_code: "tree-moved-since-verify",
      stage: "verify",
    });
  });
  withRepo((r) => {
    iterate(r);
    writeFileSync(join(r.proj, "a.txt"), "iteration 2 build\n");
    iterate(r, { only: "verify" }); // … and /pharn-regress was SKIPPED
    expect(evaluate(["--feature", FEATURE, "--base", r.base, "--iter", "2", "--repo", r.proj]), {
      code: EXIT.RERUN,
      verdict: "RERUN",
      reason_code: "regress-verify-tree-mismatch",
      stage: "regress",
    });
    // The re-run lands, and the evidence is fresh again.
    iterate(r, { only: "regress" });
    expect(evaluate(["--feature", FEATURE, "--base", r.base, "--iter", "2", "--repo", r.proj]), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("THE RECENCY BOUND, proven: last iteration's evidence over an UNCHANGED tree is FRESH (tree identity, not recency)", () => {
  // This is the bound the header states, pinned so it cannot be mistaken for coverage: an iteration whose
  // build changed nothing and whose regress/verify were skipped reuses iteration 1's evidence, and the
  // checker cannot tell — the stamp records no time. Closing it needs transcript binding (a follow-up).
  withRepo((r) => {
    iterate(r);
    expect(evaluate(["--feature", FEATURE, "--base", r.base, "--iter", "2", "--repo", r.proj]), { code: EXIT.FRESH, verdict: "FRESH" });
  });
});

test("I — with --front, a Draft SPEC, a broken chain, a bad lessons declaration or a missing GRILL.md STOPS", () => {
  withRepo((r) => {
    iterate(r);
    const fd = join(r.proj, FEATURE_BASE, FEATURE);
    const mutations = [
      ["SPEC.md", (t) => t.replace("state: Approved", "state: Draft")],
      ["PLAN.md", (t) => t.replace(/spec_content_hash: [0-9a-f]+/, `spec_content_hash: ${"c".repeat(64)}`)],
      ["PLAN.md", (t) => t.replace("applied_lessons: none", "applied_lessons: [L1]")],
    ];
    for (const [f, mut] of mutations) {
      const p = join(fd, f);
      const keep = readFileSync(p, "utf8");
      writeFileSync(p, mut(keep));
      assert.notEqual(readFileSync(p, "utf8"), keep, "precondition: the mutation changed the file");
      // The edit also moves the tree, so re-take the evidence: I must be the ONLY failing check.
      iterate(r);
      const res = evaluate(args(r, ["--front"]));
      expect(res, { code: EXIT.STOP, verdict: "STOP", reason_code: "front-stage-red" });
      assert.equal(res.doc.checks.I, "fail");
      writeFileSync(p, keep);
    }
    iterate(r);
    unlinkSync(join(fd, "GRILL.md"));
    iterate(r);
    expect(evaluate(args(r, ["--front"])), { code: EXIT.STOP, verdict: "STOP", reason_code: "front-stage-red" });
    // Without --front the same state is FRESH: I is opt-in, and reported as skipped.
    const res = evaluate(args(r));
    expect(res, { code: EXIT.FRESH, verdict: "FRESH" });
    assert.equal(res.doc.checks.I, "skipped");
  });
});

test("I — the test stage: stale /pharn-test evidence STOPS ac-evidence-invalid (6.20.0, S13), run from --repo, never a RERUN", () => {
  for (const sub of [null, "app"]) {
    withRepo(
      (r) => {
        iterate(r);
        expect(evaluate(args(r, ["--front"])), { code: EXIT.FRESH, verdict: "FRESH" }); // control: READY test-first
        const fd = join(r.proj, FEATURE_BASE, FEATURE);
        const lockPath = join(fd, "AC-TESTS.lock.json");
        const keepLock = readFileSync(lockPath, "utf8");
        for (const [why, mutate, token] of [
          [
            "the lock records no red run",
            () => spawnSync(process.execPath, [LOCK_CLI, "--write", FEATURE], { cwd: r.proj }),
            "RED lock-red",
          ],
          ["a pinned test rewritten after the red run", () => writeFileSync(join(r.proj, AC_TEST), "weakened\n"), "RED lock-red"],
          [
            "the pinned test script changed (the test-infrastructure pin, 6.20.0)",
            () =>
              writeFileSync(
                join(r.proj, "package.json"),
                JSON.stringify({ name: "fixture", scripts: { test: "vitest run --passWithNoTests" } })
              ),
            "RED lock-red",
          ],
          [
            "the SPEC re-read as legacy (spec_template removed)",
            () => {
              const spec = join(fd, "SPEC.md");
              writeFileSync(spec, readFileSync(spec, "utf8").replace(/^spec_template:.*\n/m, ""));
            },
            "RED legacy-with-mapping",
          ],
        ]) {
          mutate();
          iterate(r); // the mutation moved the tree: re-take the evidence so I is the ONLY failing check
          const res = evaluate(args(r, ["--front"]));
          expect(res, { code: EXIT.STOP, verdict: "STOP", reason_code: "ac-evidence-invalid" });
          assert.equal(res.doc.checks.I, "fail", why);
          assert.ok(res.doc.reason.includes(`(${token})`), `${why}: ${res.doc.reason}`);
          assert.match(res.doc.reason, /cannot be re-run over a built tree: set the build aside and re-run it, re-plan, or a person/);
          assert.equal(res.doc.stage_to_rerun, null, "never a re-run");
          // restore the READY world for the next mutation
          git(r.root, "checkout", "--", ".");
          writeFileSync(lockPath, keepLock);
          iterate(r);
          expect(evaluate(args(r, ["--front"])), { code: EXIT.FRESH, verdict: "FRESH" });
        }
      },
      { sub }
    );
  }
});

// ---------------------------------------------------------------------------------------------------
// The budget — a counter, not prose
// ---------------------------------------------------------------------------------------------------

test("BUDGET: R rows for one (iter, stage) then STOP; a new --iter resets; --max-reruns moves R; 0 means none", () => {
  withRepo((r) => {
    iterate(r);
    writeFileSync(join(r.proj, "a.txt"), "moved\n");
    const at = (iter, extra = []) => evaluate(["--feature", FEATURE, "--base", r.base, "--iter", String(iter), "--repo", r.proj, ...extra]);
    expect(at(1), { code: EXIT.RERUN, verdict: "RERUN", stage: "verify" });
    let res = at(1);
    expect(res, { code: EXIT.STOP, verdict: "STOP", reason_code: "rerun-budget-exhausted" });
    assert.match(res.doc.reason, /tree-moved-since-verify/, "the exhausted stop names the cause that kept recurring");
    expect(at(2), { code: EXIT.RERUN, verdict: "RERUN" });
    const rows = readFileSync(ledger(r), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    assert.deepEqual(
      rows.map((x) => [x.iter, x.stage, x.reason_code]),
      [
        [1, "verify", "tree-moved-since-verify"],
        [2, "verify", "tree-moved-since-verify"],
      ]
    );
    expect(at(3, ["--max-reruns", "2"]), { code: EXIT.RERUN, verdict: "RERUN" });
    res = at(3, ["--max-reruns", "2"]);
    expect(res, { code: EXIT.RERUN, verdict: "RERUN" });
    assert.equal(res.doc.reruns_used, 2);
    expect(at(3, ["--max-reruns", "2"]), { code: EXIT.STOP, verdict: "STOP", reason_code: "rerun-budget-exhausted" });
    expect(at(4, ["--max-reruns", "0"]), { code: EXIT.STOP, verdict: "STOP", reason_code: "rerun-budget-exhausted" });
  });
});

test("--commit-gate never re-runs and never touches the budget: a stale tree is a STOP with the cause's own code", () => {
  withRepo((r) => {
    iterate(r);
    const gate = () => evaluate(["--feature", FEATURE, "--base", r.base, "--commit-gate", "--front", "--repo", r.proj]);
    expect(gate(), { code: EXIT.FRESH, verdict: "FRESH" });
    writeFileSync(join(r.proj, "a.txt"), "moved after the decision\n");
    expect(gate(), { code: EXIT.STOP, verdict: "STOP", reason_code: "tree-moved-since-verify", stage: null });
    expect(gate(), { code: EXIT.STOP, verdict: "STOP", reason_code: "tree-moved-since-verify" });
    assert.ok(!existsSync(ledger(r)), "--commit-gate wrote a budget row");
  });
});

test("the ledger fails CLOSED: a corrupt row is ledger-malformed, a symlinked path is path-containment", () => {
  withRepo((r) => {
    iterate(r);
    writeFileSync(join(r.proj, "a.txt"), "moved\n");
    mkdirSync(dirname(ledger(r)), { recursive: true });
    writeFileSync(ledger(r), "{ torn\n");
    expect(evaluate(args(r)), { code: EXIT.INCONCLUSIVE, verdict: "INCONCLUSIVE", reason_code: "ledger-malformed" });
    writeFileSync(ledger(r), `${JSON.stringify({ iter: "1", stage: "verify" })}\n`);
    expect(evaluate(args(r)), { code: EXIT.INCONCLUSIVE, verdict: "INCONCLUSIVE", reason_code: "ledger-malformed" });
    rmSync(join(r.proj, LEDGER_DIR), { recursive: true, force: true });
    const elsewhere = mkdtempSync(join(tmpdir(), "clf-elsewhere-"));
    symlinkSync(elsewhere, join(r.proj, LEDGER_DIR));
    expect(evaluate(args(r)), { code: EXIT.INCONCLUSIVE, verdict: "INCONCLUSIVE", reason_code: "path-containment" });
    rmSync(join(r.proj, LEDGER_DIR));
    mkdirSync(dirname(ledger(r)), { recursive: true });
    symlinkSync(join(elsewhere, "target"), ledger(r));
    expect(evaluate(args(r)), { code: EXIT.INCONCLUSIVE, verdict: "INCONCLUSIVE", reason_code: "path-containment" });
    rmSync(elsewhere, { recursive: true, force: true });
    // Control: the same stale tree with a clean ledger path is an ordinary RERUN.
    rmSync(join(r.proj, LEDGER_DIR), { recursive: true, force: true });
    expect(evaluate(args(r)), { code: EXIT.RERUN, verdict: "RERUN" });
  });
});

// ---------------------------------------------------------------------------------------------------
// Unusable input — every case fail-closed (L52: one case per rule)
// ---------------------------------------------------------------------------------------------------

test("INCONCLUSIVE on every malformed invocation, each with usage-error", () => {
  const sha = "a".repeat(40);
  const cases = [
    [[], "no flags"],
    [["--base", sha, "--iter", "1"], "no --feature"],
    [["--feature", "../x", "--base", sha, "--iter", "1"], "a traversing slug"],
    [["--feature", FEATURE, "--base", "main", "--iter", "1"], "a symbolic base"],
    [["--feature", FEATURE, "--base", sha], "neither --iter nor --commit-gate"],
    [["--feature", FEATURE, "--base", sha, "--iter", "0"], "--iter 0"],
    [["--feature", FEATURE, "--base", sha, "--iter", "1", "--commit-gate"], "--iter with --commit-gate"],
    [["--feature", FEATURE, "--base", sha, "--iter", "1", "--max-reruns", "-1"], "a negative budget"],
    [["--feature", FEATURE, "--base", sha, "--iter", "1", "--frobnicate"], "an unknown flag"],
    [["--feature", FEATURE, "--feature", FEATURE, "--base", sha, "--iter", "1"], "a repeated flag"],
    [["--feature", FEATURE, "--base", sha, "--iter"], "a flag missing its value"],
    [["--feature", FEATURE, "--base", sha, "--iter", "1", "--repo", join(tmpdir(), "clf-does-not-exist")], "a missing --repo"],
  ];
  for (const [a, why] of cases) {
    const res = evaluate(a);
    assert.equal(res.code, EXIT.INCONCLUSIVE, `${why} was accepted: ${JSON.stringify(res.doc)}`);
    assert.equal(res.doc.reason_code, "usage-error", why);
  }
  assert.equal(
    parseArgs(["--feature", FEATURE, "--base", sha, "--commit-gate"]).ok,
    true,
    "control: a well-formed commit-gate call parses"
  );
});

test("INCONCLUSIVE when the live tree cannot be fingerprinted (not a git repo) — never a guessed FRESH", () => {
  withRepo((r) => {
    iterate(r);
    rmSync(join(r.root, ".git"), { recursive: true, force: true });
    expect(evaluate(args(r)), { code: EXIT.INCONCLUSIVE, verdict: "INCONCLUSIVE", reason_code: "usage-error" });
  });
});

// ---------------------------------------------------------------------------------------------------
// Root semantics — a project that is a SUBDIRECTORY of its git repo
// ---------------------------------------------------------------------------------------------------

test("a project rooted in a git SUBDIRECTORY is judged on its own subtree", () => {
  withRepo(
    (r) => {
      iterate(r);
      expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
      // A file OUTSIDE the project subtree is not part of this project's tree.
      writeFileSync(join(r.root, "outside.txt"), "sibling\n");
      expect(evaluate(args(r)), { code: EXIT.FRESH, verdict: "FRESH" });
      writeFileSync(join(r.proj, "a.txt"), "moved\n");
      expect(evaluate(args(r)), { code: EXIT.RERUN, verdict: "RERUN", reason_code: "tree-moved-since-verify" });
    },
    { sub: "proj" }
  );
});

// ---------------------------------------------------------------------------------------------------
// ★ WIRING — the COMMITTED /pharn-loop lines, executed (L45)
// ---------------------------------------------------------------------------------------------------

const LOOP_CMD = join(HERE, "..", "..", ".claude", "commands", "pharn-loop.md");
/** The floor modules the pinned calls need in the fixture: the CLOSURE, from check-loop-fresh.mjs, of every sibling
 *  `.mjs` a module names in a string literal — an import or a spawned checker alike. Computed, never listed by hand:
 *  a hand list went stale twice (6.19.0, 6.20.0), and a module missing from it crashes a shelled child — which the
 *  caller read as an ordinary RED until 6.20.6, and reads as UNUSABLE since (L29 — the enumeration is the deliverable). */
const FLOOR_MODULES = (() => {
  const seen = new Set();
  const queue = ["check-loop-fresh.mjs"];
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

function pinnedLoopLines() {
  const lines = readFileSync(LOOP_CMD, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^\s*node pharn\/floor\/check-loop-fresh\.mjs /.test(l))
    .map((l) => l.trim());
  const decision = lines.filter((l) => /--iter <N>/.test(l));
  const commit = lines.filter((l) => /--commit-gate/.test(l));
  assert.equal(decision.length, 1, `expected ONE pinned decision-time call in pharn-loop.md, found ${decision.length}`);
  assert.equal(commit.length, 1, `expected ONE pinned commit-gate call in pharn-loop.md, found ${commit.length}`);
  return { decision: decision[0], commit: commit[0] };
}

test("★ WIRING — both pinned /pharn-loop calls, executed in a fixture: FRESH, then a changed tree is caught at each", () => {
  const pin = pinnedLoopLines();
  assert.match(pin.decision, /--front/, "the decision-time call carries --front");
  assert.match(pin.commit, /--front/, "the commit-gate call carries --front");
  withRepo(
    (r) => {
      const sub = (line) => {
        const out = line.replaceAll("'<name>'", `'${FEATURE}'`).replaceAll("'<base sha>'", `'${r.base}'`).replaceAll("<N>", "1");
        assert.doesNotMatch(out, /<[a-z][^>]*>/, `an unsubstituted placeholder remains in: ${out}`);
        return out;
      };
      const sh = (line) => spawnSync("sh", ["-c", sub(line)], { cwd: r.proj, encoding: "utf8" });
      iterate(r);
      let p = sh(pin.decision);
      assert.equal(p.status, 0, `the pinned decision call is not FRESH on a complete iteration: ${p.stdout}${p.stderr}`);
      p = sh(pin.commit);
      assert.equal(p.status, 0, `the pinned commit-gate call is not FRESH: ${p.stdout}${p.stderr}`);
      // Negative control — ONE cause: the tree moved after the evidence was taken.
      writeFileSync(join(r.proj, "a.txt"), "moved\n");
      p = sh(pin.decision);
      assert.equal(p.status, 1, p.stdout);
      assert.equal(JSON.parse(p.stdout).reason_code, "tree-moved-since-verify");
      p = sh(pin.commit);
      assert.equal(p.status, 4, "the commit gate must STOP, never offer a re-run");
      assert.equal(JSON.parse(p.stdout).reason_code, "tree-moved-since-verify");
      // 6.20.6 (2026-09-24 review finding 1), through the pinned lines: the review's forgery — PASS [] over a stamp with a red
      // gate — then any edit. Before the fix this read RERUN / STOP tree-moved-since-verify; now E names it at both.
      iterate(r, {
        verifyRuns: [
          ["test", 1],
          ["reconcile", 0],
        ],
      });
      const rp = reportPath(r, "verify-report.json");
      writeJ(rp, { ...readJ(rp), verdict: "PASS", failing_gates: [] });
      writeFileSync(join(r.proj, "a.txt"), "moved after the forgery\n");
      for (const line of [pin.decision, pin.commit]) {
        p = sh(line);
        assert.equal(p.status, 4, p.stdout);
        assert.equal(JSON.parse(p.stdout).reason_code, "report-verdict-mismatch", line);
      }
    },
    {
      extra: (proj) => {
        mkdirSync(join(proj, "pharn/floor"), { recursive: true });
        for (const m of FLOOR_MODULES) copyFileSync(join(HERE, m), join(proj, "pharn/floor", m));
      },
    }
  );
});

test("★ WIRING — check I routes only a RED test stage to ac-evidence-invalid; a crashed one stays front-stage-red (REVIEW finding 5)", () => {
  const pin = pinnedLoopLines();
  withRepo(
    (r) => {
      const out0 = pin.decision.replaceAll("'<name>'", `'${FEATURE}'`).replaceAll("'<base sha>'", `'${r.base}'`).replaceAll("<N>", "1");
      // 6.20.6 (2026-09-24 review finding 2): the lock child CRASHES at run time — exit 1 like its RED, but no RED line. A
      // RUN-TIME throw in its --check path, never a load failure: this checker imports test-infra-core.mjs itself, so a
      // load failure there would crash it before check I runs (grill R2, the `loop-fresh-load-crash` follow-up).
      const lockSrc = join(r.proj, "pharn/floor/ac-tests-lock.mjs");
      const original = readFileSync(lockSrc, "utf8");
      const anchor = 'requireRedRun: args.includes("--require-red-run"),';
      assert.equal(original.split(anchor).length, 2, "the --check path's anchor moved — update this test");
      writeFileSync(lockSrc, original.replace(anchor, 'requireRedRun: (() => { throw new Error("simulated crash"); })(),'));
      iterate(r);
      const c = spawnSync("sh", ["-c", out0], { cwd: r.proj, encoding: "utf8" });
      assert.equal(c.status, 4, c.stdout + c.stderr);
      const crash = JSON.parse(c.stdout);
      assert.equal(crash.checks.I, "fail");
      assert.equal(crash.reason_code, "front-stage-red", crash.reason);
      assert.match(crash.reason, /check-test-stage exits 2 \(UNUSABLE\)/);
      writeFileSync(lockSrc, original);
      // the test-stage gate's own child is gone, so it cannot run: exit 2, never evidence that the AC tests changed
      unlinkSync(join(r.proj, "pharn/floor/check-ac-tests.mjs"));
      iterate(r); // re-take the evidence over the tree without it, so I is the only failing check
      const out = pin.decision.replaceAll("'<name>'", `'${FEATURE}'`).replaceAll("'<base sha>'", `'${r.base}'`).replaceAll("<N>", "1");
      const p = spawnSync("sh", ["-c", out], { cwd: r.proj, encoding: "utf8" });
      assert.equal(p.status, 4, p.stdout + p.stderr);
      const doc = JSON.parse(p.stdout);
      assert.equal(doc.checks.I, "fail");
      assert.equal(doc.reason_code, "front-stage-red", doc.reason);
      assert.match(doc.reason, /check-test-stage exits 2/);
      // and the case the RED-token condition exists for: the gate ITSELF crashing with exit 1 and no token
      writeFileSync(join(r.proj, "pharn/floor/check-test-stage.mjs"), "process.exit(1);\n");
      iterate(r);
      const q = spawnSync("sh", ["-c", out], { cwd: r.proj, encoding: "utf8" });
      assert.equal(q.status, 4, q.stdout + q.stderr);
      const crashed = JSON.parse(q.stdout);
      assert.equal(crashed.reason_code, "front-stage-red", crashed.reason);
      assert.match(crashed.reason, /check-test-stage exits 1 \(\)/);
    },
    {
      extra: (proj) => {
        mkdirSync(join(proj, "pharn/floor"), { recursive: true });
        for (const m of FLOOR_MODULES) copyFileSync(join(HERE, m), join(proj, "pharn/floor", m));
      },
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// THE FINGERPRINT ALGO BUMP (6.20.8, .dev/features/reconcile-symlink-target/PLAN.md) — self-contained on purpose,
// appended as one block. ALGO is NOT part of the digest, so an unchanged tree fingerprints EQUAL under /1 and /2:
// what refuses a stamp written before the upgrade is the `algo` comparison, never the digest. Each case writes one
// ordinary iteration, rewrites ONE stamp's algo to the previous token, and regenerates that stamp's report through
// the real checker (so the D binding holds and F or G is what decides). Fail-closed, and the reason names both.
test("★ UPGRADE STRADDLE — a stamp fingerprinted with the previous ALGO is never FRESH, even with an equal digest", async (t) => {
  const OLD = "worktree-fingerprint/1+sha256";
  assert.notEqual(ALGO, OLD, "premise: ALGO was bumped past the token this block simulates");
  const retag = (r, rel) => {
    const p = join(r.proj, rel);
    const s = JSON.parse(readFileSync(p, "utf8"));
    s.fingerprint.algo = OLD;
    writeFileSync(p, JSON.stringify(s, null, 2));
    return p;
  };

  await t.test("F: the verify stamp → RERUN verify, tree-moved-since-verify, naming both algos", () => {
    withRepo((r) => {
      iterate(r);
      const stamp = retag(r, DEFAULT_STAMPS.verify);
      const rep = runChecker(r.proj, "check-verify.mjs", ["--stamp", stamp, "--feature", FEATURE, "--ac-gate"]);
      rep.completeness = { complete: true, missing: [], skipped: [] };
      rep.verifiers = { registered: 0, findings: [] };
      writeFileSync(join(r.proj, FEATURE_BASE, FEATURE, "verify-report.json"), JSON.stringify(rep, null, 2));
      const res = evaluate(["--feature", FEATURE, "--base", r.base, "--iter", "1", "--repo", r.proj]);
      assert.equal(res.code, EXIT.RERUN, JSON.stringify(res.doc));
      assert.equal(res.doc.reason_code, "tree-moved-since-verify", res.doc.reason);
      assert.equal(res.doc.stage_to_rerun, "verify");
      assert.match(res.doc.reason, /fingerprinted with worktree-fingerprint\/1\+sha256, the live tree with/);
    });
  });

  await t.test("G: the regress head stamp → RERUN regress, regress-verify-tree-mismatch, naming both algos", () => {
    withRepo((r) => {
      iterate(r);
      const head = retag(r, DEFAULT_STAMPS.regressHead);
      const rep = runChecker(r.proj, "check-regress.mjs", [
        "verdict",
        "--base-stamp",
        join(r.proj, DEFAULT_STAMPS.regressBase),
        "--head-stamp",
        head,
        "--base",
        r.base,
      ]);
      writeFileSync(join(r.proj, FEATURE_BASE, FEATURE, "regression-report.json"), JSON.stringify(rep, null, 2));
      const res = evaluate(["--feature", FEATURE, "--base", r.base, "--iter", "1", "--repo", r.proj]);
      assert.equal(res.code, EXIT.RERUN, JSON.stringify(res.doc));
      assert.equal(res.doc.reason_code, "regress-verify-tree-mismatch", res.doc.reason);
      assert.equal(res.doc.stage_to_rerun, "regress");
      assert.match(res.doc.reason, /fingerprinted with worktree-fingerprint\/1\+sha256, the verify stamp with/);
      assert.doesNotMatch(res.doc.reason, /different tree/, "the digests are equal — the tree did not change");
    });
  });
});
