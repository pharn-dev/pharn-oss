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
test("★ PARITY: clean() strips only a SPACE-separated trailing annotation, exactly as the setter does (6.17.0)", () => {
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const plan = join(root, "PLAN.md");
    writeFileSync(
      plan,
      ["# PLAN — clean fixture", "", "## Files", "", "- `src/a(b)` — no space: part of the name", "- `src/c.mjs (gated)` — x", ""].join(
        "\n"
      )
    );
    const s = spawnSync(process.execPath, [SETTER, "--from-plan", plan], { encoding: "utf8", cwd: root });
    assert.equal(s.status, 0, `setter failed: ${s.stderr}`);
    const scope = JSON.parse(readFileSync(join(root, ".pharn", "writes-scope.json"), "utf8")).scope.sort();
    const declared = [...json(run([plan, root])).declared].sort();
    assert.deepEqual(declared, scope, "the core and the setter disagreed about a parenthesised name");
    assert.deepEqual(scope, ["src/a(b)", "src/c.mjs"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("★ PARITY: a WRAPPED path-item description containing the cue does NOT truncate either parser (6.17.0)", () => {
  // The rule the setter had and this core lacked: an indented line while a path-item's body is open is that
  // item's own wrapped text. Mutation control: the SAME words after a blank line are a cue in both.
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const plan = join(root, "PLAN.md");
    const write = (lines) => writeFileSync(plan, ["# PLAN — wrap fixture", "", "## Files", "", ...lines, ""].join("\n"));
    const both = () => {
      const s = spawnSync(process.execPath, [SETTER, "--from-plan", plan], { encoding: "utf8", cwd: root });
      assert.equal(s.status, 0, `setter failed: ${s.stderr}`);
      const scope = JSON.parse(readFileSync(join(root, ".pharn", "writes-scope.json"), "utf8")).scope;
      return { scope: [...scope].sort(), declared: [...json(run([plan, root])).declared].sort() };
    };
    write(["- `src/a.mjs` — the adapter; everything the SPEC calls", "  out of scope stays untouched", "- `src/b.mjs` — y"]);
    const wrapped = both();
    assert.deepEqual(wrapped.declared, wrapped.scope, "the two parsers disagreed about a wrapped description");
    assert.deepEqual(wrapped.scope, ["src/a.mjs", "src/b.mjs"], "a wrapped description truncated the list");
    // Control: separated by a blank line, the same words are a head-less cue — both parsers stop.
    write(["- `src/a.mjs` — the adapter", "", "  out of scope stays untouched", "- `src/b.mjs` — y"]);
    const cue = both();
    assert.deepEqual(cue.declared, cue.scope);
    assert.deepEqual(cue.scope, ["src/a.mjs"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

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

// ── FENCED CODE (6.59.0, loop-scope-hardening — review finding ENF-1) ─────────────────────────────────────────
// Neither `## Files` parser tracked code fences: F3 (a fenced "illustrative" list under `## Files`) scoped the fenced
// paths, and F3b (a fenced `## Files` before the real one) made the fenced list THE list and dropped the real one.
// FENCE_FIXTURES is the ONE list both parsers range over (L29/L31): for each, the setter's scope and this checker's
// `declared` must agree with each other AND with `want` — a path list, or `REFUSED` (setter exit 1 + checker
// INCONCLUSIVE exit 2, the dual reading disagreeing). Negative control, run once against the pre-6.59.0 core and
// setter: F3 read 3 paths and F3b read ["pharn/floor/validate.mjs"], so both `want`s failed there.
const REFUSED = "REFUSED";
const FENCE_FIXTURES = [
  {
    name: "F3 — a fenced example list under ## Files is not scope",
    plan: [
      "## Files",
      "- `src/a.ts` — the only file",
      "",
      "Example (illustrative only):",
      "",
      "```text",
      "- `pharn/floor/validate.mjs` — example",
      "- `.claude/commands/pharn-build.md` — example",
      "```",
      "",
    ],
    want: ["src/a.ts"],
  },
  {
    name: "F3b — a fenced ## Files before the real one is not the list",
    plan: [
      "---",
      "spec_id: FEAT-1",
      "---",
      "## Context",
      "",
      "```markdown",
      "## Files",
      "- `pharn/floor/validate.mjs`",
      "```",
      "",
      "## Files",
      "- `src/a.ts` — the only real file",
      "",
    ],
    want: ["src/a.ts"],
  },
  {
    name: "a ``` line inside a ~~~ block does not close it",
    plan: ["## Files", "- `src/a.ts`", "~~~", "```", "- `pharn/floor/evil.mjs`", "```", "~~~", "- `src/b.ts`", ""],
    want: ["src/a.ts", "src/b.ts"],
  },
  {
    name: "a four-backtick fence holds a three-backtick one",
    plan: ["## Files", "- `src/a.ts`", "````md", "```", "- `pharn/floor/evil.mjs`", "```", "````", "- `src/b.ts`", ""],
    want: ["src/a.ts", "src/b.ts"],
  },
  {
    name: "an unclosed fence hides the rest of the file",
    plan: ["## Files", "- `src/a.ts`", "```", "- `pharn/floor/evil.mjs`", ""],
    want: ["src/a.ts"],
  },
  {
    name: "an inline ```x``` line is code, not a fence",
    plan: ["## Files", "- `src/a.ts`", "```x``` is inline code", "- `src/b.ts`", ""],
    want: ["src/a.ts", "src/b.ts"],
  },
  {
    name: "a fence inside a list item (two spaces) is still a fence",
    plan: ["## Files", "- `src/a.ts` — shaped like:", "", "  ```ts", "  - `not/a/path.ts`", "  ```", "", "- `src/b.ts`", ""],
    want: ["src/a.ts", "src/b.ts"],
  },
  {
    name: "a fence nested four spaces deep is refused (its reading depends on list nesting)",
    plan: [
      "## Files",
      "- `src/a.ts` — real",
      "  - sub-item:",
      "    ```text",
      "    - `pharn/floor/evil.mjs`",
      "    ```",
      "- `src/b.ts`",
      "",
    ],
    want: REFUSED,
  },
  {
    name: "a closer indented less than its opener is refused",
    plan: ["## Files", "- `src/a.ts` — real", "  ```", "  x", "```", "- `pharn/floor/evil.mjs`", "```", ""],
    want: REFUSED,
  },
  {
    name: "a 4-space fence line outside any list, read both ways alike, is not refused",
    plan: ["## Context", "", "    ```", "```", "## Files", "- `pharn/floor/evil.mjs`", "```", "## Files", "- `src/a.ts`", "```", ""],
    want: ["src/a.ts"],
  },
];

test("★ PARITY: FENCE_FIXTURES — the setter's scope and the checker's `declared` agree, fixture by fixture (ENF-1)", () => {
  assert.ok(FENCE_FIXTURES.length >= 10 && FENCE_FIXTURES.some((f) => f.want === REFUSED), "non-vacuous: both outcomes are exercised");
  for (const fx of FENCE_FIXTURES) {
    const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
    try {
      const plan = join(root, "PLAN.md");
      writeFileSync(plan, fx.plan.join("\n"));
      const s = spawnSync(process.execPath, [SETTER, "--from-plan", plan], { encoding: "utf8", cwd: root });
      const c = run([plan, root]);
      if (fx.want === REFUSED) {
        assert.equal(s.status, 1, `${fx.name}: the setter must refuse`);
        assert.match(s.stderr, /reads differently depending on whether a code fence sits inside a list item/, fx.name);
        assert.equal(c.status, 2, `${fx.name}: the checker must be INCONCLUSIVE`);
        assert.equal(json(c).verdict, "inconclusive", fx.name);
        assert.match(json(c).reason, /reads differently depending on whether a code fence sits inside a list item/, fx.name);
      } else {
        assert.equal(s.status, 0, `${fx.name}: setter failed: ${s.stderr}`);
        const scope = JSON.parse(readFileSync(join(root, ".pharn", "writes-scope.json"), "utf8")).scope;
        assert.deepEqual(scope, fx.want, `${fx.name}: setter scope`);
        assert.deepEqual(json(c).declared, fx.want, `${fx.name}: checker declared`);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

// ── PLAN-DECLARED DELETIONS (6.56.0, plan-declared-deletions) ─────────────────────────────────────────────
// An item marked ``- `path` (delete)`` must be ABSENT after the build (lstat ENOENT — L54); unmarked items must
// still exist. Every output keeps the capture shape stage-verify-core.mjs's checkCompleteness requires (GRILL G2).

import { symlinkSync } from "node:fs";
import { pathsFromPlanFiles, DELETE_MARKER_RE, DELETE_NEAR_MISS_RE } from "./plan-files-core.mjs";
import { checkCompleteness } from "./stage-verify-core.mjs";

const shapeOk = (r) => checkCompleteness(r.stdout).ok;

test("★ plan-files-core: the exact marker sets `delete`; each near-miss sets `deleteNearMiss`; neither moves `value`", () => {
  const lines = [
    ["- `a.ts` (delete) — gone", true, false],
    ["- `a.ts` (delete)", true, false],
    ["- `a.ts` (delete)\t— tab after the marker", true, false],
    ["- `a.ts`\t(delete) — a tab before it", false, true],
    ["- `a.ts`  (delete) — two spaces before it", false, true],
    ["- `a.ts` — orphan (delete) — after the description (stated bound)", false, false],
    ["- `a.ts` (Delete) — case", false, true],
    ["- `a.ts` (DELETE)", false, true],
    ["- `a.ts` ( delete ) — spaces", false, true],
    ["- `a.ts` (deleted)", false, true],
    ["- `a.ts` (deletes)", false, true],
    ["- `a.ts`(delete) — no space", false, true],
    ["- `a.ts` (delete)— no space after", false, true],
    ["- `a.ts (delete)` — inside the back-ticks", false, false],
    ["- `a.ts` — keep; the (delete) note below", false, false],
    ["- `a.ts` (new) (delete)", false, false],
    ["- `a.ts` (remove) — a synonym is an ordinary item (stated bound)", false, false],
    ["- `a.ts` (deleted helper moved)", false, false],
  ];
  for (const [line, del, near] of lines) {
    const p = pathsFromPlanFiles(`# PLAN\n\n## Files\n\n${line}\n`);
    assert.equal(p.ok, true);
    assert.equal(p.entries[0].delete, del, `delete for ${JSON.stringify(line)}`);
    assert.equal(p.entries[0].deleteNearMiss, near, `deleteNearMiss for ${JSON.stringify(line)}`);
    assert.equal(DELETE_MARKER_RE.test(line), del);
    assert.equal(!del && DELETE_NEAR_MISS_RE.test(line), near);
  }
  // `value` is byte-identical with and without the marker (L72: additive members only).
  const marked = pathsFromPlanFiles("# PLAN\n\n## Files\n\n- `x/a.ts` (delete) — d\n- `x/b.ts` — e\n");
  const plain = pathsFromPlanFiles("# PLAN\n\n## Files\n\n- `x/a.ts` — d\n- `x/b.ts` — e\n");
  assert.deepEqual(marked.value, plain.value);
  assert.deepEqual(marked.value, ["x/a.ts", "x/b.ts"]);
});

test("★ a marked path that is absent → complete; an unmarked one must still exist", () => {
  withPlan({ filesBody: "- `src/old.ts` (delete) — orphan\n- `src/keep.ts` — edited", existing: ["src/keep.ts"] }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 0, r.stdout);
    const o = json(r);
    assert.equal(o.verdict, "complete");
    assert.deepEqual(o.declared, ["src/keep.ts"]);
    assert.deepEqual(o.deletions, ["src/old.ts"]);
    assert.deepEqual(o.undeleted, []);
    assert.deepEqual(o.missing, []);
    assert.ok(shapeOk(r));
  });
  // CONTROL (L60): the same plan with the unmarked file gone is incomplete on `missing`.
  withPlan({ filesBody: "- `src/old.ts` (delete) — orphan\n- `src/keep.ts` — edited" }, (plan, root) => {
    const o = json(run([plan, root]));
    assert.equal(o.verdict, "incomplete");
    assert.deepEqual(o.missing, ["src/keep.ts"]);
    assert.deepEqual(o.undeleted, []);
  });
});

test("★ a marked path still present (a file, a directory, a dangling link) → incomplete, named in undeleted[]", () => {
  withPlan(
    {
      filesBody: "- `src/old.ts` (delete) — orphan\n- `src/dir` (delete) — dir\n- `src/dl` (delete) — dangling",
      existing: ["src/old.ts", "src/dir/x"],
    },
    (plan, root) => {
      symlinkSync(join(root, "nowhere"), join(root, "src", "dl"));
      const r = run([plan, root]);
      assert.equal(r.status, 1);
      const o = json(r);
      assert.equal(o.verdict, "incomplete");
      assert.equal(o.complete, false);
      assert.deepEqual(o.undeleted, ["src/old.ts", "src/dir", "src/dl"]); // the dangling link is PRESENT (L54)
      assert.deepEqual(o.missing, []);
      assert.ok(shapeOk(r));
    }
  );
});

test("★ a plan that ONLY deletes files can be complete — the empty-domain refusal covers declared ∪ deletions (L34)", () => {
  withPlan({ filesBody: "- `content/blog/a.mdx` (delete) — orphan\n- `.vscode/settings.json` (delete) — orphan" }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 0, r.stdout);
    const o = json(r);
    assert.equal(o.verdict, "complete");
    assert.deepEqual(o.declared, []);
    assert.deepEqual(o.deletions, ["content/blog/a.mdx", ".vscode/settings.json"]);
  });
  // CONTROL: a plan with no concrete item at all is still inconclusive, in the capture shape.
  withPlan({ filesBody: "- `<path>` (delete) — placeholder" }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 2);
    assert.equal(json(r).verdict, "inconclusive");
    assert.deepEqual(json(r).skipped, ["<path>"]);
    assert.ok(shapeOk(r));
  });
});

test("★ a near-miss marker and a conflicting declaration are inconclusive, in the capture shape (L36, G2)", () => {
  withPlan({ filesBody: "- `src/old.ts` (Delete) — case", existing: [] }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 2);
    assert.match(json(r).reason, /spells the deletion marker another way/);
    assert.ok(shapeOk(r));
  });
  withPlan({ filesBody: "- `src/old.ts` (delete) — gone\n- `src/old.ts` — kept", existing: ["src/old.ts"] }, (plan, root) => {
    const r = run([plan, root]);
    assert.equal(r.status, 2);
    assert.match(json(r).reason, /both for deletion and as an ordinary path/);
    assert.ok(shapeOk(r));
  });
  // CONTROL: the exact spelling of the first fixture is complete.
  withPlan({ filesBody: "- `src/old.ts` (delete) — case" }, (plan, root) => assert.equal(run([plan, root]).status, 0));
});

test("★ PARITY: the setter scopes a marked item's bare path — setter scope == declared ∪ deletions", () => {
  const root = mkdtempSync(join(tmpdir(), "pharn-complete-"));
  try {
    const plan = join(root, "PLAN.md");
    writeFileSync(
      plan,
      [
        "# PLAN — deletion parity",
        "",
        "## Files",
        "",
        "- `keep/one.md` — x",
        "- `gone/two.tsx` (delete) — removed",
        "- `.vscode/settings.json` (delete) — orphan",
        "- `gen/*.md` (delete) — glob skipped by both",
        "",
      ].join("\n")
    );
    const s = spawnSync(process.execPath, [SETTER, "--from-plan", plan], { encoding: "utf8", cwd: root });
    assert.equal(s.status, 0, `setter failed: ${s.stderr}`);
    const scope = JSON.parse(readFileSync(join(root, ".pharn", "writes-scope.json"), "utf8")).scope;
    const o = json(run([plan, root]));
    assert.deepEqual([...o.declared, ...o.deletions].sort(), [...scope].sort());
    assert.deepEqual([...scope].sort(), [".vscode/settings.json", "gone/two.tsx", "keep/one.md"]);
    assert.deepEqual(o.deletions, ["gone/two.tsx", ".vscode/settings.json"]);
    assert.deepEqual(o.skipped, ["gen/*.md"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
