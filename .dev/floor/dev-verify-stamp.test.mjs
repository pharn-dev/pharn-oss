// .dev/floor/dev-verify-stamp.test.mjs — EXECUTES /pharn-dev-verify's committed verdict line against the shapes a
// hand-edited gate map takes (dev-verdict-discipline, 7.3.0; review 2026-11-03 HIGH, "the dev verify twin has no
// --stamp, so a hand-substituted gate map yields PASS").
//
// The line is read from `.claude/commands/pharn-dev-verify.md` itself, never retyped here (L45: a fix in a checker
// never reaches production while the file that invokes it keeps the defect), and run from a scratch directory whose
// `pharn/.run/pharn-dev-verify/gates/stamp.json` holds each fixture. Only the checker path is pointed at this
// checkout's real `pharn/floor/check-verify.mjs`; `<name>` becomes `demo`.
//
// What it pins: a stamp shaped like the runner's reads PASS; each recorded substitution shape is REFUSED (exit 2,
// its own reason_code) — the old flat map written where the stamp goes, a declared gate whose (red) run was deleted,
// a run spliced in from another tree, a positional map passed beside --stamp, an unfinalized stamp. The NEGATIVE
// CONTROL runs the pre-7.3.0 positional line over the substituted flat map of `.dev/features/loop-cost-6-73-2/` and
// shows it read PASS — the defect, reproduced.
//
// ── Honest scope (P0, L43) ───────────────────────────────────────────────────────────────────────────────────────
// These are the shapes a substitution LEAVES. A self-consistent fabricated stamp still passes (pharn/floor/
// check-verify.test.mjs proves that bound); and a green run here never means a dev run executed the line.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CHECK_VERIFY = join(REPO, "pharn", "floor", "check-verify.mjs");
const COMMAND = join(REPO, ".claude", "commands", "pharn-dev-verify.md");
const STAMP_REL = "pharn/.run/pharn-dev-verify/gates/stamp.json";
/** The line the command used before 7.3.0 — the negative control's subject, carried as a literal. */
const PRE_FIX_LINE = "node pharn/floor/check-verify.mjs pharn/.run/pharn-dev-verify/results.json --feature <name>";

/** The committed verdict line: the one fenced line that runs check-verify.mjs. */
function committedLine() {
  const lines = readFileSync(COMMAND, "utf8")
    .split("\n")
    .filter((l) => /^node pharn\/floor\/check-verify\.mjs\b/.test(l));
  assert.equal(lines.length, 1, `exactly one committed check-verify line expected, found ${lines.length}`);
  return lines[0];
}

const A64 = "a".repeat(64);
const C64 = "c".repeat(64);

/** A finalized verify stamp shaped like the dev verify runner's: the five --gates ids, then the runner's two. */
function mkStamp(exits = {}) {
  const ids = ["test", "validate", "lint", "format:check", "lint:md", "instruction-growth", "reconcile"];
  const runs = ids.map((id, i) => ({
    seq: i,
    id,
    exit: exits[id] ?? 0,
    ran: true,
    timed_out: false,
    mutated: false,
    reason: null,
    fp_before: A64,
    fp_after: A64,
    stdout_sha256: A64,
    stderr_sha256: A64,
  }));
  return {
    schema: "gate-run-record/1",
    stage: "verify",
    side: null,
    feature: "demo",
    head: "0".repeat(40),
    source: "explicit",
    source_raw:
      "env -u PHARN_TEST_RESULTS npm test::test,node pharn/floor/validate.mjs .::validate,npm run lint::lint,npm run format:check::format:check,npm run lint:md::lint:md",
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: "worktree-fingerprint/2+sha256", init: A64, final: A64 },
    required: ids.slice(0, 5),
    runs,
    aux: { completeness: 0 },
  };
}

/** Write `stampValue` (an object, or raw text) where the line reads it, plus optional extra files; run `line`. */
function runLine(line, stampValue, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-dvs-"));
  try {
    const put = (rel, v) => {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), typeof v === "string" ? v : JSON.stringify(v, null, 2));
    };
    if (stampValue !== undefined) put(STAMP_REL, stampValue);
    for (const [rel, v] of Object.entries(extra)) put(rel, v);
    const cmd = line.replace("node pharn/floor/check-verify.mjs", `node ${JSON.stringify(CHECK_VERIFY)}`).replaceAll("<name>", "demo");
    assert.notEqual(cmd, line, "the checker path must have been rewritten");
    const r = spawnSync("sh", ["-c", cmd], { cwd: dir, encoding: "utf8" });
    let json = null;
    try {
      json = JSON.parse(r.stdout);
    } catch {
      // a non-JSON stdout is asserted on by the caller through `json === null`
    }
    return { code: r.status, json, out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("★ the committed line carries --stamp and reads the runner's stamp path", () => {
  const line = committedLine();
  assert.match(line, /--stamp pharn\/\.run\/pharn-dev-verify\/gates\/stamp\.json/);
  assert.match(line, /--feature <name>$/);
});

test("★ a runner-shaped stamp reads PASS through the committed line; a red gate in it reads FAIL", () => {
  const pass = runLine(committedLine(), mkStamp());
  assert.equal(pass.code, 0, pass.out);
  assert.equal(pass.json.verdict, "PASS");
  assert.match(pass.json.gate_run.stamp_sha256, /^[0-9a-f]{64}$/, "the gate_run block check-ship-record.mjs reads");
  const fail = runLine(committedLine(), mkStamp({ "lint:md": 1 }));
  assert.equal(fail.code, 1, fail.out);
  assert.deepEqual(fail.json.failing_gates, ["lint:md"]);
});

test("★ each substitution shape is REFUSED (exit 2) with its own reason_code", () => {
  const dropped = mkStamp({ "lint:md": 1 });
  dropped.runs = dropped.runs.filter((r) => r.id !== "lint:md").map((r, i) => ({ ...r, seq: i }));
  const spliced = mkStamp();
  spliced.runs[4] = { ...spliced.runs[4], fp_before: C64, fp_after: C64 }; // lint:md re-measured in another tree
  const unfinalized = { ...mkStamp(), finalized: false };
  const flatMap = { test: 0, validate: 0, lint: 0, "format:check": 0, "lint:md": 0, reconcile: 0 };
  const cases = [
    ["the old flat {gate: exit} map written where the stamp goes", flatMap, "stamp-malformed"],
    ["a declared gate whose red run was deleted", dropped, "coverage-violation"],
    ["a run spliced in from another tree", spliced, "tree-changed-between-gates"],
    ["an unfinalized stamp", unfinalized, "stamp-unfinalized"],
    ["no stamp at all", undefined, "stamp-missing"],
  ];
  for (const [what, stamp, code] of cases) {
    const r = runLine(committedLine(), stamp);
    assert.equal(r.code, 2, `${what}: ${r.out}`);
    assert.equal(r.json?.verdict, "INCONCLUSIVE", what);
    assert.equal(r.json?.reason_code, code, what);
  }
});

test("★ a hand-assembled positional map passed BESIDE --stamp is refused", () => {
  // Inserted as the FIRST operand: check-verify.mjs reads its positional map there (a trailing extra operand after
  // `--feature <name>` is not read at all — recorded in this feature's REVIEW.md, outside this increment's scope).
  const line = committedLine().replace("check-verify.mjs --stamp", "check-verify.mjs pharn/.run/pharn-dev-verify/results.json --stamp");
  assert.notEqual(line, committedLine(), "the mutation must change the line (L34)");
  const r = runLine(line, mkStamp(), { "pharn/.run/pharn-dev-verify/results.json": { test: 0 } });
  assert.equal(r.code, 2, r.out);
  assert.match(r.json.reason, /mutually exclusive/);
});

test("★ NEGATIVE CONTROL — the pre-7.3.0 positional line read PASS over the substituted map (the defect)", () => {
  // loop-cost-6-73-2's map: lint:md was 1 in the working tree and 0 in a clean copy; the 0 was spliced in by hand.
  const substituted = { test: 0, validate: 0, lint: 0, "format:check": 0, "lint:md": 0, reconcile: 0 };
  const r = runLine(PRE_FIX_LINE, undefined, { "pharn/.run/pharn-dev-verify/results.json": substituted });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.json.verdict, "PASS", "the old line accepts any map it is handed");
  assert.notEqual(committedLine(), PRE_FIX_LINE, "the committed line is no longer the pre-fix one");
});

test("✧ fixture sanity — the stamp declares the same five ids the committed init line's --gates string does", () => {
  const init = readFileSync(COMMAND, "utf8")
    .split("\n")
    .find((l) => /^node pharn\/floor\/run-gates\.mjs init --stage verify\b/.test(l));
  assert.ok(init, "the committed init line");
  const ids = init
    .match(/--gates "([^"]*)"/)[1]
    .split(",")
    .map((t) => t.slice(t.indexOf("::") + 2));
  assert.deepEqual(mkStamp().required, ids, "the fixture would otherwise test a set the command does not declare");
});
