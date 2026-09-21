// pharn/floor/check-build-complete.test.mjs — hermetic tests for the deterministic build-completeness checker.
//
// NO `claude -p`, NO network. We compose a scratch repo (os.tmpdir()) with a PLAN.md and optionally touch
// the declared files, then assert the public surface (exit code + stdout JSON) by subprocess — mirroring
// check-verify.test.mjs / check-regress.test.mjs.
//
// The ★ tests are load-bearing:
//   • every concrete declared path exists → complete (exit 0); a declared path absent → incomplete
//     (exit 1), the offender named in missing[];
//   • a placeholder/glob `## Files` entry is SKIPPED, never counted missing (parity with the setter's
//     isConcrete filter);
//   • a missing/unparseable PLAN or a `## Files` with no concrete path → INCONCLUSIVE (exit 2),
//     fail-closed, NEVER a silent complete;
//   • ★ PARITY: this checker's `declared` set equals set-writes-scope.cjs's `--from-plan` scope over a
//     shared fixture — the two `## Files` parsers stay in lock-step (Q3 of the plan);
//   • ★ PARITY: the Boundary-2 exclusion CUE truncates the list identically in both parsers, and its two
//     exemptions (a blockquote, an authorized item's own description) do NOT truncate it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CBC = join(here, "check-build-complete.mjs");
const SETTER = join(here, "..", "..", ".claude", "hooks", "set-writes-scope.cjs");

function run(args, opts = {}) {
  return spawnSync(process.execPath, [CBC, ...args], { encoding: "utf8", ...opts });
}
function json(r) {
  return JSON.parse(r.stdout);
}

// Build a scratch repo dir with a PLAN.md (given `## Files` body) and touch the `existing` files.
function withPlan({ filesBody, existing = [] }, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const plan = join(root, "PLAN.md");
    writeFileSync(plan, `# PLAN — fixture\n\n## Files\n\n${filesBody}\n\n## Next section\n\nend\n`);
    for (const f of existing) {
      const abs = join(root, f);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, "x");
    }
    return fn(plan, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("★ complete: every concrete declared path exists → exit 0, verdict complete, missing []", () => {
  withPlan({ filesBody: "- `src/a.js` — a\n- `src/b.js` — b", existing: ["src/a.js", "src/b.js"] }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 0);
    const o = json(r);
    assert.equal(o.verdict, "complete");
    assert.equal(o.complete, true);
    assert.deepEqual(o.missing, []);
    assert.deepEqual([...o.declared].sort(), ["src/a.js", "src/b.js"]);
  });
});

test("★ incomplete: a declared path absent → exit 1, verdict incomplete, the offender named", () => {
  withPlan({ filesBody: "- `src/a.js` — a\n- `src/b.js` — b", existing: ["src/a.js"] }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 1);
    const o = json(r);
    assert.equal(o.verdict, "incomplete");
    assert.equal(o.complete, false);
    assert.deepEqual(o.missing, ["src/b.js"]); // exactly the unbuilt path
  });
});

test("★ placeholder/glob entries are SKIPPED, never counted missing (isConcrete parity)", () => {
  withPlan(
    { filesBody: "- `src/real.js` — real\n- `<capDir>/evals/x` — placeholder\n- `gen/*.md` — glob", existing: ["src/real.js"] },
    (plan, root) => {
      const r = run([plan, root]);
      assert.equal(r.status, 0); // the only CONCRETE path exists → complete
      const o = json(r);
      assert.deepEqual(o.declared, ["src/real.js"]);
      assert.deepEqual([...o.skipped].sort(), ["<capDir>/evals/x", "gen/*.md"]);
      assert.deepEqual(o.missing, []);
    }
  );
});

test("exclusion subsection: a path under `### Explicitly not touched` is NOT required", () => {
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const plan = join(root, "PLAN.md");
    // The exclusion path is absent from the repo; it must NOT make the build incomplete.
    writeFileSync(
      plan,
      "# PLAN — fixture\n\n## Files\n\n- `src/a.js` — a\n\n### Explicitly not touched\n\n- `never/built.js` — excluded\n"
    );
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src/a.js"), "x");
    const r = run([plan, root]);
    assert.equal(r.status, 0);
    const o = json(r);
    assert.deepEqual(o.declared, ["src/a.js"]); // the excluded path never enters the declared set
    assert.deepEqual(o.missing, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("inconclusive: a PLAN with no `## Files` heading → exit 2, fail-closed (never a silent complete)", () => {
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const plan = join(root, "PLAN.md");
    writeFileSync(plan, "# PLAN — no files section\n\njust prose.\n");
    const r = run([plan, root]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "inconclusive");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("inconclusive: a `## Files` with only placeholders (no concrete path) → exit 2, fail-closed", () => {
  withPlan({ filesBody: "- `<capDir>/x` — placeholder only", existing: [] }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "inconclusive");
  });
});

test("inconclusive: a missing PLAN file → exit 2", () => {
  const r = run([join(tmpdir(), "does-not-exist-plan.md"), "."]);
  assert.equal(r.status, 2);
  assert.equal(json(r).verdict, "inconclusive");
});

test("inconclusive: an UNREADABLE PLAN (a directory) → exit 2, the read-error catch (fail-closed)", () => {
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const dirAsPlan = join(root, "PLAN.md");
    mkdirSync(dirAsPlan); // existsSync() is true, but readFileSync throws EISDIR → the `cannot read` catch
    const r = run([dirAsPlan, root]);
    assert.equal(r.status, 2);
    const o = json(r);
    assert.equal(o.verdict, "inconclusive");
    assert.match(o.reason, /cannot read/); // exercises the try/catch branch, not the missing-file branch
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("inconclusive: no PLAN path at all → exit 2", () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.equal(json(r).verdict, "inconclusive");
});

test("trust (P2): a `## Files` path with shell metacharacters is a LITERAL operand, never executed", () => {
  // The path is reported missing (existsSync over the literal string) — no subshell runs; the `; touch`
  // is inert. Proves the untrusted `## Files` value reaches ONLY a filesystem-read operand.
  withPlan({ filesBody: "- `a; touch pwned.js` — hostile", existing: [] }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 1);
    const o = json(r);
    assert.deepEqual(o.missing, ["a; touch pwned.js"]); // treated as one literal path
    assert.equal(r.stderr, ""); // nothing spawned
  });
});

test("★ PARITY: `declared` equals set-writes-scope.cjs's `--from-plan` scope over a shared fixture", () => {
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const plan = join(root, "PLAN.md");
    // Exercise the subtle bits both parsers must agree on: literal paths (in), a placeholder + a glob
    // (filtered), and an exclusion subsection (never scanned).
    writeFileSync(
      plan,
      [
        "# PLAN — parity fixture",
        "",
        "## Files",
        "",
        "- `keep/one.md` — x",
        "- `keep/two.mjs` — y",
        "- `<capDir>/evals/x` — placeholder skipped",
        "- `gen/*.md` — glob skipped",
        "",
        "### Explicitly not touched",
        "",
        "- `excluded/secret.md` — must be excluded",
        "",
      ].join("\n")
    );
    // The setter writes root/.pharn/writes-scope.json (cwd=root, so the repo's real scope is untouched).
    const s = spawnSync(process.execPath, [SETTER, "--from-plan", plan], { encoding: "utf8", cwd: root });
    assert.equal(s.status, 0, `setter failed: ${s.stderr}`);
    const scope = JSON.parse(readFileSync(join(root, ".pharn", "writes-scope.json"), "utf8")).scope;
    const declared = json(run([plan, root])).declared;
    assert.deepEqual([...declared].sort(), [...scope].sort()); // lock-step extraction
    assert.deepEqual([...scope].sort(), ["keep/one.md", "keep/two.mjs"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The cue boundary is the rule this parser has had WRONG TWICE — a bare narrative line between two path
// items silently truncated the authorized scope (setter-cue-fix), and the continuation case needed a
// second repair (plan-cue-continuation). The extraction to plan-files-core.mjs made it visible that the
// `break` itself was reached by NO test in the product floor: the branch was covered only in the setter's
// own `.cjs` suite, so this copy carried a twice-wrong rule with nothing ranging over it (L31 — the
// second copy is where the obligation drops). This closes that, and does it as a PARITY case so the two
// implementations are held to the same answer rather than merely each to itself.
test("★ PARITY: a head-less exclusion CUE truncates both parsers, and its two exemptions do not", () => {
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const plan = join(root, "PLAN.md");
    writeFileSync(
      plan,
      [
        "# PLAN — cue fixture",
        "",
        "## Files",
        "",
        // EXEMPTION 1 — an authorized item's OWN description matches the cue regex (`not modif…`) and
        // must NOT end the list. Without the path-item exemption this line alone would drop everything.
        "- `keep/one.md` — the public API is not modified by this change",
        // EXEMPTION 2 — a blockquote matches the cue (`not touch…`) and is explanatory commentary.
        "> These notes are commentary; the vendored tree is not touched here.",
        "",
        "- `keep/two.mjs` — y",
        "",
        // THE CUE — a bare, non-path, non-blockquote prose line. This is the break under test.
        "The paths below are explicitly excluded from the build.",
        "",
        "- `dropped/three.md` — after the cue, never authorized",
        "",
      ].join("\n")
    );

    const s = spawnSync(process.execPath, [SETTER, "--from-plan", plan], { encoding: "utf8", cwd: root });
    assert.equal(s.status, 0, `setter failed: ${s.stderr}`);
    const scope = JSON.parse(readFileSync(join(root, ".pharn", "writes-scope.json"), "utf8")).scope;
    const declared = json(run([plan, root])).declared;

    // Lock-step: whatever the cue does, it does to BOTH.
    assert.deepEqual([...declared].sort(), [...scope].sort(), "the two parsers disagreed about the cue");

    // The exact set: both exemptions held, and the cue truncated.
    assert.deepEqual([...scope].sort(), ["keep/one.md", "keep/two.mjs"]);

    // NON-VACUITY (L34): the assertion above must be capable of failing on each half. A fixture that
    // proved only "the cue truncates" would stay green if the exemptions silently stopped working.
    assert.ok(scope.includes("keep/one.md"), "the path-item exemption did not hold — its own description truncated the list");
    assert.ok(scope.includes("keep/two.mjs"), "the blockquote exemption did not hold — commentary truncated the list");
    assert.ok(!scope.includes("dropped/three.md"), "the cue did not truncate — a path after it was authorized");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
