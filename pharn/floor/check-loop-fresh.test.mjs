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
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint, ALGO } from "./worktree-fingerprint.mjs";
import { SCHEMA, LAPSE_CODES, REASON_CODES, logBasename } from "./gate-run-core.mjs";
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
} from "./check-loop-fresh.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "check-loop-fresh.mjs");
const FEATURE = "demo";
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const OTHER_SHA = "b".repeat(40);

function git(dir, ...args) {
  return execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** A SPEC/PLAN/GRILL front that the three front checkers accept: an Approved SPEC pinned by its body hash,
 *  a PLAN carrying that hash and `applied_lessons: none`, and a GRILL.md. */
function writeFront(proj) {
  const fd = join(proj, FEATURE_BASE, FEATURE);
  mkdirSync(fd, { recursive: true });
  let body = "\n";
  for (const h of ["Intent", "Scope", "Acceptance Criteria", "Constraints"]) body += `## ${h}\n\nfiller\n\n`;
  const h = sha256(body);
  writeFileSync(join(fd, "SPEC.md"), `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${h}\n---\n${body}`);
  writeFileSync(
    join(fd, "PLAN.md"),
    `---\nspec_id: ${FEATURE}\nspec_content_hash: ${h}\napplied_lessons: none\n---\n\n## Files\n\n- \`a.txt\` — a\n`
  );
  writeFileSync(join(fd, "GRILL.md"), "# GRILL\n");
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
function writeStamp(proj, stampRel, { stage, side, head, init, final, runs, completeness = null }) {
  const out = join(proj, dirname(stampRel));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const rec = runs.map(([id, exit], seq) => {
    const b = logBasename(seq, id);
    writeFileSync(join(out, `${b}.out`), `out ${id} ${exit}\n`);
    writeFileSync(join(out, `${b}.err`), "");
    return {
      seq,
      id,
      exit,
      ran: true,
      timed_out: false,
      mutated: false,
      reason: null,
      argv: ["true"],
      shell: null,
      files: [],
      fp_before: init,
      fp_after: final,
      stdout_sha256: sha256(readFileSync(join(out, `${b}.out`))),
      stderr_sha256: sha256(readFileSync(join(out, `${b}.err`))),
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
      completeness: 0,
    });
    const rep = runChecker(proj, "check-verify.mjs", ["--stamp", join(proj, DEFAULT_STAMPS.verify), "--feature", FEATURE]);
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
  assert.deepEqual(COMPARED_FIELDS.verify, ["verdict", "failing_gates", "gates"]);
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
const FLOOR_MODULES = [
  "check-loop-fresh.mjs",
  "gate-run-core.mjs",
  "worktree-fingerprint.mjs",
  "reconcile-baseline.mjs",
  "check-verify.mjs",
  "check-regress.mjs",
  "check-spec-approved.mjs",
  "check-spec.mjs",
  "check-plan-spec-agree.mjs",
  "check-plan-lessons.mjs",
  "frontmatter-core.mjs",
];

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
    },
    {
      extra: (proj) => {
        mkdirSync(join(proj, "pharn/floor"), { recursive: true });
        for (const m of FLOOR_MODULES) copyFileSync(join(HERE, m), join(proj, "pharn/floor", m));
      },
    }
  );
});
