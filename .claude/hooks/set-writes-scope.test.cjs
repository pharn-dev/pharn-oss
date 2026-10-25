// .claude/hooks/set-writes-scope.test.cjs — locks the dev/product ARTIFACT SPLIT (fix #7 setter).
//
// After the dev/product boundary move, the build-loop commands write their artifacts under
// `.dev/features/`, NOT root `pharn/features/` (root `pharn/features/` is reserved for the PRODUCT pipeline's
// SPEC.md etc.). That split is enforced DETERMINISTICALLY by each `pharn-dev-*` command's `writes:`
// placeholder being `.dev/features/<name>/…`: the setter resolves a `.dev/features/<name>` --target,
// and a ROOT `pharn/features/<name>` --target matches no entry → fail-closed (no scope written).
//
// This pins that for `/pharn-dev-plan` against the REAL command file (membership, not a synthetic
// fixture — mirrors enforce-writes-scope.test.cjs's real-review.md regression test). It also backfills
// dedicated set-writes-scope.cjs coverage (previously exercised only via enforce-writes-scope.test.cjs).
// Run as a subprocess so the setter keeps its dependency-free, top-level-exec contract; cwd = a fresh
// temp dir so the real repo pharn/.run/ is never touched.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const { join } = require("node:path");

const SETTER = join(__dirname, "set-writes-scope.cjs");
const PLAN_CMD = join(__dirname, "..", "commands", "pharn-dev-plan.md");
const PLAN_PRODUCT_CMD = join(__dirname, "..", "commands", "pharn-plan.md");

function tmp() {
  return fs.mkdtempSync(join(os.tmpdir(), "pharn-sws-"));
}

function seedDevRepo(cwd) {
  fs.mkdirSync(join(cwd, ".dev", "floor"), { recursive: true });
  return cwd;
}
function setter(cwd, ...args) {
  return spawnSync(process.execPath, [SETTER, ...args], { cwd, encoding: "utf8" });
}

test("artifact-split lock: /pharn-dev-plan resolves a .dev/features/<name> --target to that one build-loop path", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", PLAN_CMD, "--target", ".dev/features/sample/PLAN.md");
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".dev/features/sample/PLAN.md"]);
});

test("artifact-split lock: a ROOT pharn/features/<name> --target is REJECTED (pharn-dev-* write .dev/features/, never root pharn/features/)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", PLAN_CMD, "--target", "pharn/features/sample/PLAN.md");
  // pharn-dev-plan's `writes:` placeholder is `.dev/features/<name>/PLAN.md`; a root `pharn/features/…` target
  // matches no entry, so the setter emits no concrete scope, exits non-zero, and writes nothing (fail-closed).
  assert.equal(r.status, 1);
  assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
});

// --- fail-closed: --from-plan on a PLAN with no parseable `## Files` (the /pharn-build crux) ---
// /pharn-build sets its writes-scope via `set-writes-scope.cjs --from-plan PLAN.md`, which requires a
// `## Files` heading whose items lead with a back-tick path. The product /pharn-plan template currently
// emits a free-text `## Steps / Files` section instead — so the setter MUST fail-closed (exit 1, no scope
// written) rather than guess a scope from un-parseable prose. This pins that crux scenario (previously
// uncovered: every other --from-plan test feeds a present `## Files`).

test("--from-plan on a PLAN with no `## Files` heading (a free-text `## Steps / Files`) exits 1 and writes nothing (fail-closed)", () => {
  const cwd = tmp();
  const plan = join(cwd, "PLAN.md");
  fs.writeFileSync(
    plan,
    ["# PLAN — x", "", "## Steps / Files", "", "- a concrete step or file to change", "- another step", ""].join("\n")
  );
  const r = setter(cwd, "--from-plan", plan);
  assert.equal(r.status, 1);
  assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
});

// --- closing-the-loop: --from-plan SUCCEEDS on a PLAN in /pharn-plan's NEW emitted shape ---
// The inverse of the fail-closed test above (and of the /pharn-build crux). After the `plan-files-scope`
// increment, the product /pharn-plan template emits a parseable `## Files` (a `## Files` heading whose
// items lead with a back-tick path), splitting the old free-text `## Steps / Files`. This pins that a
// PLAN in that shape sets a scope = exactly its `## Files` back-tick paths — proving the product chain
// spec → plan → build can now derive a writes-scope. The fixture mirrors the template's section
// structure (## Approach / ## Steps / ## Files / ### Explicitly not touched / ## Acceptance mapping) so
// it pins the PRODUCER's shape, not an arbitrary parser-accepted one (cf. the producer-faithfulness test
// below, which runs the setter over the real pharn-plan.md template).

test("--from-plan on a /pharn-plan-shaped PLAN (## Files with back-tick paths) exits 0; scope = exactly the authorized paths", () => {
  const cwd = tmp();
  const plan = join(cwd, "PLAN.md");
  fs.writeFileSync(
    plan,
    [
      "---",
      "spec_id: sample-feature",
      "spec_content_hash: 0000000000000000000000000000000000000000000000000000000000000000",
      "---",
      "",
      "## Approach",
      "",
      "Rework the widget pipeline; the public `src/should-not-leak.ts` API is not touched.",
      "",
      "## Steps", // advisory prose BEFORE ## Files — its back-tick paths must NOT enter scope
      "",
      "- `src/also-not-scope.ts` — a step that names a file in back-ticks above ## Files",
      "- wire the new module into the pipeline",
      "",
      "## Files",
      "",
      "- `src/widget.ts` — the new widget module",
      "- `src/widget.test.ts` — its unit tests",
      "",
      "### Explicitly not touched", // a heading → the setter stops here; these paths never enter scope
      "",
      "- `src/legacy.ts` — reused, never edited",
      "",
      "## Acceptance mapping",
      "",
      "- AC-1 → the widget renders",
      "",
    ].join("\n")
  );
  const r = setter(cwd, "--from-plan", plan);
  assert.equal(r.status, 0); // SUCCESS — the inverse of the fail-closed cases above
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  // scope is EXACTLY the ## Files back-tick paths, in order …
  assert.deepEqual(rec.scope, ["src/widget.ts", "src/widget.test.ts"]);
  // … and excludes the `### Explicitly not touched` path (the #15 hardening, here for a product plan) …
  assert.equal(rec.scope.includes("src/legacy.ts"), false);
  // … and excludes a back-tick path that appeared in ## Steps / ## Approach BEFORE ## Files.
  assert.equal(rec.scope.includes("src/also-not-scope.ts"), false);
  assert.equal(rec.scope.includes("src/should-not-leak.ts"), false);
});

// --- CF-E regression: an explanatory BLOCKQUOTE under `## Files` must NOT truncate the authorized list.
// A `> …` note that mentions an exclusion cue ("not touched", e.g. a reference to the
// `### Explicitly not touched` subsection) is explanatory commentary, never an exclusion-section intro.
// Before the fix it tripped the head-less-exclusion Boundary-2 break and zeroed the scope → fail-closed
// exit 1, blocking a valid plan (CF-E, .dev/features/product-pipeline-probe/PROBE.md). Only blockquotes are
// exempted — the next test pins that a NON-blockquote head-less intro still fails closed.

test("--from-plan: a blockquote note with an exclusion cue ABOVE the paths does NOT truncate scope (CF-E)", () => {
  const cwd = tmp();
  const plan = join(cwd, "PLAN.md");
  fs.writeFileSync(
    plan,
    [
      "## Files",
      "",
      "> Explanatory note: the files below are written; others are not touched (see the",
      "> `### Explicitly not touched` subsection).",
      "",
      "- `src/widget.ts` — the new widget module",
      "",
      "### Explicitly not touched",
      "",
      "- `src/legacy.ts` — reused, never edited",
      "",
    ].join("\n")
  );
  const r = setter(cwd, "--from-plan", plan);
  assert.equal(r.status, 0); // the blockquote no longer fails it closed
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["src/widget.ts"]); // the path AFTER the blockquote is collected …
  assert.equal(rec.scope.includes("src/legacy.ts"), false); // … and the `### Explicitly not touched` path stays excluded
});

test("--from-plan: a NON-blockquote head-less exclusion intro (`Files NOT written:`) still fails closed", () => {
  const cwd = tmp();
  const plan = join(cwd, "PLAN.md");
  // No authorized path precedes the head-less intro, so Boundary 2 (preserved for non-blockquotes) breaks
  // before any path is collected → empty scope → fail-closed. Proves the CF-E fix did NOT weaken exclusions.
  fs.writeFileSync(plan, ["## Files", "", "Files NOT written:", "", "- `src/legacy.ts` — excluded", ""].join("\n"));
  const r = setter(cwd, "--from-plan", plan);
  assert.equal(r.status, 1);
  assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
});

// --- producer-faithfulness: the REAL product /pharn-plan template fails closed (locks the placeholder
// style). The template's `## Files` example items are angle-bracket placeholders (`- `<path>``), which
// `isConcrete` rejects → the setter emits no scope and exits 1. This ties a test to the actual producer
// file: if the template ever regressed to a BARE-WORD example (`- `path``), that bare word would parse
// as a real scope path, the setter would exit 0, and THIS test would fail — catching the regression
// (the fail-closed-on-unfilled discipline the dev /pharn-dev-plan `<path>` placeholder also preserves).

test("--from-plan over the real pharn-plan.md template exits 1 (its `## Files` `<path>` placeholders fail closed)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-plan", PLAN_PRODUCT_CMD);
  assert.equal(r.status, 1);
  assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
});

// --- F3: the setter REFUSES to authorize the write-guards' own control surface (fail-closed) ---
// A declared `writes:` / `## Files` list is untrusted input (CONSTITUTION P2). Before this refusal, an
// entry naming a hook emitted a scope that enforce-writes-scope.cjs honored, so an untrusted document
// could authorize disarming a guard. The refusal is exact membership over the same control-surface paths
// protect-trusted-paths.cjs protects; --allow-claude-dir is the only opt-in.

const CONTROL_SURFACE = [
  ".claude/settings.json",
  ".claude/settings.local.json",
  ".claude/hooks/protect-trusted-paths.cjs",
  ".claude/hooks/enforce-writes-scope.cjs",
  ".claude/hooks/set-writes-scope.cjs",
  ".claude/hooks/require-loop-record.cjs",
];

function planWith(cwd, ...paths) {
  const plan = join(cwd, "PLAN.md");
  fs.writeFileSync(plan, ["## Files", "", ...paths.map((p) => `- \`${p}\` — an entry`), ""].join("\n"));
  return plan;
}

for (const ctl of CONTROL_SURFACE) {
  test(`--from-plan naming the control file ${ctl} is REFUSED and writes nothing`, () => {
    const cwd = tmp();
    const r = setter(cwd, "--from-plan", planWith(cwd, ctl, "src/legit.ts"));
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /refusing to scope the write-guards' own control surface/);
    assert.match(r.stderr, new RegExp(ctl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
  });
}

// Audit P3-R (2026-10-07): the membership test compared case-sensitively, so `.CLAUDE/hooks/…` was EMITTED as scope
// (protect-trusted-paths.cjs, which folds case, still denied the write). On a case-insensitive volume every spelling
// below names the same file, so each is refused here too. NFD is the decomposed form of a precomposed character; the
// control paths are ASCII, so it is pinned with a non-control control: the fold must not refuse an unrelated path.
for (const ctl of CONTROL_SURFACE) {
  for (const variant of [ctl.toUpperCase(), ctl.replace(".claude", ".Claude"), ctl.replace(/\.(cjs|json)$/, (m) => m.toUpperCase())]) {
    test(`--from-plan naming the case variant ${variant} is REFUSED and writes nothing`, () => {
      const cwd = tmp();
      const r = setter(cwd, "--from-plan", planWith(cwd, variant, "src/legit.ts"));
      assert.notEqual(r.status, 0, r.stdout);
      assert.match(r.stderr, /refusing to scope the write-guards' own control surface/);
      assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
    });
  }
}

test("the case fold refuses only the control surface: ordinary mixed-case paths are still emitted", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-plan", planWith(cwd, ".claude/commands/Pharn-Thing.md", "src/Legit.TS", "docs/café.md"));
  assert.equal(r.status, 0, r.stderr);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".claude/commands/Pharn-Thing.md", "src/Legit.TS", "docs/café.md"]);
});

test("--allow-claude-dir opts back in: the same PLAN succeeds and the entry survives in scope", () => {
  const cwd = tmp();
  // 6.61.0: the operator flag goes BEFORE the mode (OPERATOR FLAGS in the setter's header); after it, it is refused.
  const r = setter(cwd, "--allow-claude-dir", "--from-plan", planWith(cwd, ".claude/settings.json", "src/legit.ts"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".claude/settings.json", "src/legit.ts"]);
});

test("--allow-claude-dir is its own arg-loop branch: placed FIRST it does not eat the positional mode/file", () => {
  const cwd = tmp();
  const r = setter(cwd, "--allow-claude-dir", "--from-plan", planWith(cwd, ".claude/settings.json"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".claude/settings.json"]);
});

test("--from-frontmatter with a control path in `writes:` is REFUSED without the flag", () => {
  const cwd = tmp();
  const cap = join(cwd, "cap.md");
  fs.writeFileSync(cap, ["---", 'writes: [".claude/hooks/enforce-writes-scope.cjs"]', "---", "", "# cap", ""].join("\n"));
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /refusing to scope the write-guards' own control surface/);
  assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
});

// The membership test normalizes the entry (lexically) so a trivial re-spelling cannot walk past it.
// NOT a realpath — a symlink resolving onto a control file is still not caught here; that is the
// enforcing hook's job. These pin the normalization, not a resolution guarantee.
for (const spelling of ["./.claude/settings.json", ".claude/hooks/../hooks/set-writes-scope.cjs", ".claude//settings.json"]) {
  test(`a re-spelled control path is still REFUSED: ${spelling}`, () => {
    const cwd = tmp();
    const r = setter(cwd, "--from-plan", planWith(cwd, spelling));
    assert.notEqual(r.status, 0);
    assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
  });
}

// --- Deliberately NOT refused: commands and the hooks' own tests. An increment that edits either must
// not need an opt-in flag (46 of 104 historical plans write a command file). ---

test("a PLAN naming .claude/commands/* and .claude/hooks/*.test.cjs is UNAFFECTED (no flag needed)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-plan", planWith(cwd, ".claude/commands/pharn-plan.md", ".claude/hooks/set-writes-scope.test.cjs"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".claude/commands/pharn-plan.md", ".claude/hooks/set-writes-scope.test.cjs"]);
});

// --- Regression: a plan with no control path emits exactly the scope it always did ---

test("a PLAN with no control path emits the identical scope as before the refusal existed", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-plan", planWith(cwd, "src/widget.ts", "src/widget.test.ts"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["src/widget.ts", "src/widget.test.ts"]);
});

test("the refusal is layered AFTER the empty-scope fail, which stays reachable (L14: compose, never replace)", () => {
  const cwd = tmp();
  const plan = join(cwd, "PLAN.md");
  fs.writeFileSync(plan, ["## Files", "", "- no back-tick path here", ""].join("\n"));
  const r = setter(cwd, "--from-plan", plan);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no back-tick paths/); // the pre-existing fail, not the new refusal
  assert.doesNotMatch(r.stderr, /refusing to scope/);
});

test("the usage line advertises --allow-claude-dir", () => {
  const cwd = tmp();
  const r = setter(cwd);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--allow-claude-dir/);
});

// --- F15: `clean()`'s trailing-annotation strip must not mangle a path segment that itself ends in
// `)` — a Next.js route-group directory (`app/(marketing)`) is a real, concrete `writes:` value whose
// last path segment is `(marketing)`. The old `\s*\([^)]*\)\s*$` matched a ZERO-space gap, so it
// stripped the group off entirely (scope collapsed to `app/`), silently under-scoping the writes-scope
// guard for a common layout. An annotation (the documented use, e.g. ` (gated)`) is always written with
// a LEADING SPACE, so requiring `\s+` distinguishes the two without behavior change for the documented
// case. ---

test("F15 fix: a route-group directory `app/(marketing)` survives `clean()` intact (was mangled to `app/`)", () => {
  const cwd = tmp();
  const cap = capWith(cwd, "writes:", '  - "app/(marketing)"');
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["app/(marketing)"]);
});

test("F15 fix: a NESTED route-group path `app/(a)/(b)` survives `clean()` intact", () => {
  const cwd = tmp();
  const cap = capWith(cwd, "writes:", '  - "app/(a)/(b)"');
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["app/(a)/(b)"]);
});

test("F15 regression guard: the documented SPACE-separated annotation (e.g. ` (gated)`) is still stripped", () => {
  const cwd = tmp();
  const cap = capWith(cwd, "writes:", '  - "src/widget.ts (gated)"');
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["src/widget.ts"]);
});

test("F15 regression guard: a route-group FILE (`app/(marketing)/page.tsx`) was never affected either way", () => {
  const cwd = tmp();
  const cap = capWith(cwd, "writes:", '  - "app/(marketing)/page.tsx"');
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["app/(marketing)/page.tsx"]);
});

// Mutant MEASURED (L4 — an authored assertion passes by construction until proven otherwise): reverting
// `\s+` back to `\s*` in `clean()` was applied to the live file and both F15-fix tests above FAILED
// (scope collapsed to `["app/"]` / `["app/(a)"]`); the fix was then restored and the full suite is green
// again. No mutant-guard test is added here (that would just re-encode the same regex the fix already
// pins) — the measurement is recorded as evidence the two tests above are not vacuous.

// --- Coverage backfill for the entry-resolution paths this increment's refusal sits downstream of.
// These were untested before: a refusal that runs over `scope` is only as sound as the parsing that
// builds `scope`, so the glob / block-list / unquoted-inline forms are pinned here. ---

function capWith(cwd, ...frontmatterLines) {
  const cap = join(cwd, "cap.md");
  fs.writeFileSync(cap, ["---", ...frontmatterLines, "---", "", "# cap", ""].join("\n"));
  return cap;
}

test("--from-frontmatter resolves a GLOB `writes:` entry against --target", () => {
  const cwd = tmp();
  const r = setter(
    cwd,
    "--from-frontmatter",
    capWith(cwd, 'writes: ["pharn/features/*/REVIEW.md"]'),
    "--target",
    "pharn/features/x/REVIEW.md"
  );
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["pharn/features/x/REVIEW.md"]);
});

test("--from-frontmatter: a GLOB that does not match --target yields no scope (fail-closed)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, 'writes: ["pharn/features/*/REVIEW.md"]'), "--target", "docs/other.md");
  assert.notEqual(r.status, 0);
  assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
});

test("--from-frontmatter reads the BLOCK-list `writes:` form", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, "writes:", '  - "src/a.ts"', "  - src/b.ts"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["src/a.ts", "src/b.ts"]);
});

test("--from-frontmatter reads an UNQUOTED inline-array `writes:` form", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, "writes: [src/a.ts, src/b.ts]"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, "pharn", ".run", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["src/a.ts", "src/b.ts"]);
});

test("a BLOCK-list `writes:` naming a control file is refused too (the refusal is form-independent)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, "writes:", '  - ".claude/settings.json"'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /refusing to scope the write-guards' own control surface/);
  assert.equal(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), false);
});

test("--target that escapes the repo root is rejected", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, 'writes: ["pharn/features/<name>/PLAN.md"]'), "--target", "../outside/PLAN.md");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /escapes repo root/);
});

test("--target with no value, an unexpected extra argument, and a missing file each fail-closed", () => {
  const cwd = tmp();
  assert.match(setter(cwd, "--from-plan", "P.md", "--target").stderr, /--target requires a path/);
  assert.match(setter(cwd, "--from-plan", "a.md", "b.md", "c.md").stderr, /unexpected argument/);
  assert.match(setter(cwd, "--from-plan", "nope.md").stderr, /file not found/);
});

test("a frontmatter file with no `writes:` key, and one with no frontmatter at all, each fail-closed", () => {
  const cwd = tmp();
  assert.match(setter(cwd, "--from-frontmatter", capWith(cwd, "role: skill")).stderr, /no `writes:` key/);
  const bare = join(cwd, "bare.md");
  fs.writeFileSync(bare, "# no frontmatter\n");
  assert.match(setter(cwd, "--from-frontmatter", bare).stderr, /no YAML frontmatter/);
});

// ── ✧ CROSS-COPY AGREEMENT GUARD (the guards' control surface) ───────────────────────────────────────
//
// WHY THIS EXISTS. The four control paths are a DELIBERATE duplicate: `CONTROL_SURFACE` in
// set-writes-scope.cjs and the `.claude/` entries of `DEFAULT_PROTECTED` in protect-trusted-paths.cjs.
// A shared module was rejected for the reason the check-provenance.mjs split records — each hook must
// stay a standalone, stdlib-only script invoked as `node <file>`, and routing the membership set through
// an import makes the gate's set reachable. Two copies drift; that is the cost of the choice, and this
// guard is the mitigation that makes the choice acceptable. It converts "drifts silently" into "drifts
// loudly", exactly as .dev/floor/check-provenance.test.mjs does for its own second copy.
//
// It pins THREE copies, because this file's own CONTROL_SURFACE literal above is the third: adding a
// fifth control path to one file alone would otherwise leave every gate GREEN while the setter silently
// stopped covering it.
//
// ── Honest scope (P0) — what a green run does and does NOT buy ───────────────────────────────────────
// FLOOR, and only within the `npm test` gate: the three declarations are the same SET of paths.
//   `node --test` is not a fourth floor primitive; what makes this binding is its membership in
//   /pharn-dev-verify's check-verify.mjs gate map (the `test` gate) — the same standing every other
//   *.test.cjs here has. Its VERDICT is floor-grade there; its EXISTENCE is advisory (two clocks).
// NOT guaranteed: that the two guards BEHAVE identically on those paths. The hook matches path
//   FRAGMENTS via isProtected(); the setter does exact membership over a normalized entry. This compares
//   declarations, not logic — a divergence in matching behavior passes untouched.
//
// MEASURED REJECTING MUTANTS before being trusted (L4 — an authored assertion passes by construction).
// Three mutations were applied to a sandbox copy of the two hooks and confirmed to FAIL, then reverted:
//   1. a fifth path appended to DEFAULT_PROTECTED only        → 1 failure (the agreement test)
//   2. an entry removed from CONTROL_SURFACE only             → 7 failures
//   3. `.claude/commands/pharn-plan.md` added to CONTROL_SURFACE → 4 failures (the GATE-1 decision guard)
// The unmutated sandbox was green before and after. If that measurement is ever repeated and the guard
// stays green, the guard is inert and this comment is a lie — treat it as such.

const PROTECT_HOOK = join(__dirname, "protect-trusted-paths.cjs");

// Extract the quoted entries of a top-level `const <NAME> = [ … ];` from a source file. Line comments are
// stripped first so commentary inside the array can never be read as an entry. Deliberately textual and
// derived from BOTH sources — neither side is restated as a literal in the assertion.
function arrayEntries(file, name) {
  const src = fs.readFileSync(file, "utf8").replace(/^[ \t]*\/\/.*$/gm, "");
  const m = src.match(new RegExp(`^const ${name} = \\[([\\s\\S]*?)^\\];`, "m"));
  assert.ok(m, `${file} must declare a top-level \`const ${name} = [ … ];\``);
  return (m[1].match(/"([^"]*)"/g) || []).map((s) => s.slice(1, -1));
}

test("✧ the two guards agree on the control surface: setter CONTROL_SURFACE == the hook's `.claude/` protected entries", () => {
  const setterSet = arrayEntries(SETTER, "CONTROL_SURFACE");
  const hookClaude = arrayEntries(PROTECT_HOOK, "DEFAULT_PROTECTED").filter((p) => p.startsWith(".claude/"));
  assert.ok(setterSet.length > 0, "CONTROL_SURFACE must not be empty — an empty set silently disables the refusal");
  assert.deepEqual(
    [...setterSet].sort(),
    [...hookClaude].sort(),
    "the control surface has drifted between set-writes-scope.cjs and protect-trusted-paths.cjs — " +
      "change BOTH copies, or split them deliberately and update this guard"
  );
});

test("✧ this file's own CONTROL_SURFACE literal (the third copy) matches the setter's", () => {
  assert.deepEqual([...CONTROL_SURFACE].sort(), [...arrayEntries(SETTER, "CONTROL_SURFACE")].sort());
});

test("✧ the control surface names exactly the wiring files plus the four hook scripts — no command, no test file", () => {
  // Pins the GATE-1 decision itself: `.claude/commands/**` and `*.test.cjs` must stay OUT, or the
  // self-hosting loop breaks (46 of 104 historical plans write a command file).
  const set = arrayEntries(SETTER, "CONTROL_SURFACE");
  assert.equal(set.filter((p) => p.endsWith(".test.cjs")).length, 0, "a hook's own tests must never be refused");
  assert.equal(set.filter((p) => p.startsWith(".claude/commands/")).length, 0, "commands must never be refused");
  assert.ok(set.includes(".claude/settings.json"), "the file that WIRES both hooks must be covered");
  // BOTH settings files, not just the committed one: settings.local.json is loaded too and can wire or
  // override the same hooks, so covering only settings.json left the control surface half-open.
  assert.ok(set.includes(".claude/settings.local.json"), "the LOCAL wiring file must be covered too");
  assert.equal(set.filter((p) => p.startsWith(".claude/hooks/") && p.endsWith(".cjs")).length, 4, "all four hooks");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// --clear — the writes-scope LIFECYCLE (feature `writes-scope-lifecycle`).
//
// A SET scope REPLACES enforce-writes-scope.cjs's fail-closed DEFAULT_SAFE_SET, so a command that
// finished and left `pharn/.run/writes-scope.json` behind is STRICTER than no scope at all: paths the
// default PERMITS start being denied in later sessions. `--clear` deletes the file, returning control
// to that default. These tests pin the flag's behavior AND the enforce-side consequence, because the
// flag's whole purpose lives in the other hook's fallback, not in its own exit code.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const ENFORCE = join(__dirname, "enforce-writes-scope.cjs");
const SCOPE_REL = join("pharn", ".run", "writes-scope.json");

function enforce(cwd, filePath) {
  return spawnSync(process.execPath, [ENFORCE], {
    cwd,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: filePath } }),
  });
}

function seedScope(cwd, record) {
  fs.mkdirSync(join(cwd, "pharn", ".run"), { recursive: true });
  fs.writeFileSync(join(cwd, SCOPE_REL), JSON.stringify(record, null, 2) + "\n");
}

test("--clear removes a present scope and reports it", () => {
  const cwd = tmp();
  seedScope(cwd, { scope: [".dev/features/demo/SHIP.md"], set_by: "x.md", set_at: "t" });
  const r = setter(cwd, "--clear");
  assert.equal(r.status, 0);
  assert.equal(fs.existsSync(join(cwd, SCOPE_REL)), false, "the scope file must be gone");
  assert.match(r.stdout, /writes-scope cleared/);
});

// 6.24.0 (D4 in the plan): the --clear message no longer claims a SINGLE posture — the default it returns
// control to is fail-closed everywhere EXCEPT an installed project outside an open PHARN run, where it is
// the newer permissive one. Pinned against the SHIPPED hook path (not a handoff/ copy), so this test is
// expected to be RED until the human applies the pending hook patch, and GREEN after — exactly like the
// enforce-writes-scope.test.cjs golden dev-posture pins.
test("★ 6.24.0: the --clear message no longer claims a single fail-closed posture, either way", () => {
  const cwd = tmp();
  seedScope(cwd, { scope: [".dev/features/demo/SHIP.md"], set_by: "x.md", set_at: "t" });
  const r1 = setter(cwd, "--clear");
  assert.doesNotMatch(r1.stdout, /fail-closed default-safe-set active/, "the old unqualified claim must be gone");
  assert.match(r1.stdout, /installed project outside an open PHARN run/i);

  const r2 = setter(cwd, "--clear"); // the absent-file (idempotent) branch carries the same qualifier
  assert.doesNotMatch(r2.stdout, /fail-closed default-safe-set active/);
  assert.match(r2.stdout, /installed project outside an open PHARN run/i);
});

test("--clear is IDEMPOTENT: with no scope file it still exits 0 (a last step must be safe to re-run)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--clear");
  assert.equal(r.status, 0);
  assert.equal(fs.existsSync(join(cwd, SCOPE_REL)), false);
});

test("after --clear, enforce falls back to the DEFAULT_SAFE_SET — a safe-set path is ALLOWED again", () => {
  const cwd = seedDevRepo(tmp());
  // A one-path scope that does NOT cover `.dev/features/**` — the shape a finished command leaves.
  seedScope(cwd, { scope: [".dev/features/demo/SHIP.md"], set_by: "x.md", set_at: "t" });
  assert.equal(enforce(cwd, ".dev/features/other/PLAN.md").status, 2, "denied while the stale scope stands");
  assert.equal(setter(cwd, "--clear").status, 0);
  assert.equal(enforce(cwd, ".dev/features/other/PLAN.md").status, 0, "allowed once the scope is released");
});

test("after --clear, enforce is still FAIL-CLOSED — an out-of-safe-set path stays DENIED", () => {
  const cwd = seedDevRepo(tmp());
  seedScope(cwd, { scope: [".dev/features/demo/SHIP.md"], set_by: "x.md", set_at: "t" });
  assert.equal(setter(cwd, "--clear").status, 0);
  // Clearing returns to the DEFAULT, never to "anything goes": root files and the sensitive zones are
  // outside DEFAULT_SAFE_SET and must remain denied.
  assert.equal(enforce(cwd, "CHANGELOG.md").status, 2);
  assert.equal(enforce(cwd, ".claude/settings.json").status, 2);
  assert.equal(enforce(cwd, "pharn/floor/validate.mjs").status, 2);
});

test("--clear REFUSES to combine with --from-plan / --from-frontmatter / --target, and writes nothing", () => {
  for (const extra of [
    ["--from-plan", "PLAN.md"],
    ["--from-frontmatter", "cap.md"],
    ["--target", "a/b.md"],
  ]) {
    const cwd = tmp();
    seedScope(cwd, { scope: ["keep/me.md"], set_by: "x.md", set_at: "t" });
    const r = setter(cwd, "--clear", ...extra);
    assert.equal(r.status, 1, `--clear ${extra[0]} must fail`);
    assert.match(r.stderr, /--clear takes no other arguments/);
    // Fail-closed in BOTH directions: it neither cleared nor set.
    const rec = JSON.parse(fs.readFileSync(join(cwd, SCOPE_REL), "utf8"));
    assert.deepEqual(rec.scope, ["keep/me.md"], "the existing scope must be untouched");
  }
});

test("--clear never writes a `{scope: []}` marker — an empty array is TRUTHY and would deny everything", () => {
  // The trap this flag had to avoid: enforce computes allow = [...ALWAYS, ...(scope || SAFE_SET)], so a
  // present-but-empty scope[] yields ONLY `pharn/.run/**` — stricter than the stale scope --clear removes.
  const cwd = tmp();
  seedScope(cwd, { scope: [] });
  assert.equal(enforce(cwd, ".dev/features/other/PLAN.md").status, 2, "empty-array scope denies the safe-set");
  seedScope(cwd, { scope: [".dev/features/demo/SHIP.md"], set_by: "x.md", set_at: "t" });
  setter(cwd, "--clear");
  assert.equal(fs.existsSync(join(cwd, SCOPE_REL)), false, "--clear must DELETE, never leave an empty scope[]");
});

test("--clear surfaces a non-ENOENT unlink failure as an error, never as a silent success", () => {
  // The catch treats ENOENT as the idempotent no-op and everything else as a real failure. Exercised
  // by making `pharn/.run` a FILE, so unlinking `pharn/.run/writes-scope.json` fails with ENOTDIR rather than
  // ENOENT. Without this, the branch's message and exit code were unverified — an error path that has
  // never run is an assumption, not a behavior.
  const cwd = tmp();
  fs.mkdirSync(join(cwd, "pharn"), { recursive: true });
  fs.writeFileSync(join(cwd, "pharn", ".run"), "not a directory\n");
  const r = setter(cwd, "--clear");
  assert.notEqual(r.status, 0, "a non-ENOENT failure must not report success");
  assert.match(r.stderr, /could not clear pharn\/\.run\/writes-scope\.json/);
  assert.doesNotMatch(r.stdout, /writes-scope cleared/, "it must not claim to have cleared anything");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 6.61.0 (loop-scope-hardening — review findings SEC-1, SEC-3, ENF-1 of 2026-10-12). Four additions to the setter,
// each pinned here: (1) OPERATOR FLAGS precede the mode; (2) an INSTALLED project's `--from-plan` scope refuses
// PHARN's own surface unless --allow-pharn-surface; (3) a PROMOTION-origin scope is refused while a /pharn-loop
// marker is open; (4) the `## Files` reader skips fenced code (the shared fixture list lives in
// pharn/floor/check-build-complete.test.mjs's ★ PARITY case; F3/F3b are repeated here against the setter alone).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const scopeOf = (cwd) => {
  const f = join(cwd, "pharn", ".run", "writes-scope.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).scope : null;
};

function seedInstalled(cwd, skillsVersion = "6.61.0") {
  fs.writeFileSync(join(cwd, "pharn.config.json"), JSON.stringify({ skillsVersion }) + "\n");
  return cwd;
}

// (1) OPERATOR FLAGS — every opt-in, after the mode: refused, nothing written. `--allow-exec-config` joined the set in
// hook-hardening-batch, so its case is RED until that increment's apply.py has run.
for (const flag of ["--allow-claude-dir", "--allow-pharn-surface", "--allow-exec-config"]) {
  test(`${flag} AFTER the mode is REFUSED and writes nothing (a granted line's trailing * cannot carry it)`, () => {
    const cwd = tmp();
    const r = setter(cwd, "--from-plan", planWith(cwd, "src/a.ts"), flag);
    assert.equal(r.status, 1);
    assert.match(r.stderr, new RegExp(`${flag} must come BEFORE the mode`));
    assert.equal(scopeOf(cwd), null);
    const before = setter(cwd, flag, "--from-plan", planWith(cwd, "src/a.ts"));
    assert.equal(before.status, 0, `control: the same flag BEFORE the mode is accepted: ${before.stderr}`);
  });
}

test("the usage line advertises all three opt-ins, before the mode", () => {
  const r = setter(tmp());
  assert.notEqual(r.status, 0);
  assert.match(
    r.stderr,
    /usage: set-writes-scope\.cjs \[--allow-claude-dir\] \[--allow-pharn-surface\] \[--allow-exec-config\] \(--from-frontmatter/
  );
});

// (2) PHARN'S OWN INSTALLED SURFACE — the members enforce-writes-scope.cjs's isReserved() names, re-spellings
// included, and the controls on each side of the boundary.
const RESERVED_MEMBERS = [
  "pharn/floor/x.mjs",
  "pharn/floor/check-loop.mjs",
  "pharn/pharn-core/x.md",
  "pharn/CONSTITUTION.md",
  ".claude/commands/x.md",
  ".claude/skills/x/SKILL.md",
  "pharn.config.json",
  "PHARN/Floor/x.mjs",
  "pharn/floor./x.mjs",
  "pharn/features./x.md",
  "./pharn/floor/x.mjs",
];
for (const p of RESERVED_MEMBERS) {
  test(`installed project: --from-plan naming ${p} is REFUSED and writes nothing`, () => {
    const cwd = seedInstalled(tmp());
    const r = setter(cwd, "--from-plan", planWith(cwd, "src/a.ts", p));
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stderr, /refusing to scope PHARN's own installed files from a plan/);
    assert.ok(r.stderr.includes(p), "the offending entry is named");
    assert.equal(scopeOf(cwd), null);
  });
}

test("installed project: the refusal names how a person proceeds — a hand edit or the flag BEFORE the mode, never Bash", () => {
  const cwd = seedInstalled(tmp());
  const r = setter(cwd, "--from-plan", planWith(cwd, ".claude/skills/x/SKILL.md"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /your own \.claude\/ commands or skills included/);
  assert.match(r.stderr, /edit it yourself, outside the agent/);
  assert.match(r.stderr, /--allow-pharn-surface placed BEFORE --from-plan/);
  assert.match(r.stderr, /pharn update/);
  assert.doesNotMatch(r.stderr, /Bash/);
});

test("installed project: pharn/features/** and ordinary source are NOT refused", () => {
  const cwd = seedInstalled(tmp());
  const r = setter(cwd, "--from-plan", planWith(cwd, "src/a.ts", "pharn/features/feat/notes.md", "pharnx/y.md", "lib/pharn/z.md"));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(scopeOf(cwd), ["src/a.ts", "pharn/features/feat/notes.md", "pharnx/y.md", "lib/pharn/z.md"]);
});

test("installed project: --allow-pharn-surface (before the mode) opts back in, and the entry survives in scope", () => {
  const cwd = seedInstalled(tmp());
  const r = setter(
    cwd,
    "--allow-pharn-surface",
    "--from-plan",
    planWith(cwd, "src/a.ts", "pharn/floor/x.mjs", ".claude/skills/x/SKILL.md")
  );
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(scopeOf(cwd), ["src/a.ts", "pharn/floor/x.mjs", ".claude/skills/x/SKILL.md"]);
});

test("installed project: --allow-pharn-surface does NOT open the control surface — --allow-claude-dir still governs it", () => {
  const cwd = seedInstalled(tmp());
  const r = setter(cwd, "--allow-pharn-surface", "--from-plan", planWith(cwd, ".claude/settings.json"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /refusing to scope the write-guards' own control surface/);
  const both = setter(cwd, "--allow-claude-dir", "--allow-pharn-surface", "--from-plan", planWith(cwd, ".claude/settings.json"));
  assert.equal(both.status, 0, both.stderr);
});

test("the dev checkout and an unsignalled tree are UNCHANGED: the same plan is scoped as before", () => {
  for (const seed of [(d) => seedDevRepo(d), (d) => d, (d) => seedInstalled(d, "")]) {
    const cwd = seed(tmp());
    const r = setter(cwd, "--from-plan", planWith(cwd, "src/a.ts", "pharn/floor/x.mjs", ".claude/commands/x.md"));
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(scopeOf(cwd), ["src/a.ts", "pharn/floor/x.mjs", ".claude/commands/x.md"]);
  }
});

test("a pharn.config.json that is a symlink, a directory, or not JSON is not an install (enforce's own reading)", () => {
  const targets = tmp();
  fs.writeFileSync(join(targets, "real.json"), JSON.stringify({ skillsVersion: "6.61.0" }));
  for (const seed of [
    (d) => fs.symlinkSync(join(targets, "real.json"), join(d, "pharn.config.json")),
    (d) => fs.mkdirSync(join(d, "pharn.config.json")),
    (d) => fs.writeFileSync(join(d, "pharn.config.json"), "{ not json"),
  ]) {
    const cwd = tmp();
    seed(cwd);
    const r = setter(cwd, "--from-plan", planWith(cwd, "pharn/floor/x.mjs"));
    assert.equal(r.status, 0, r.stderr);
  }
});

test("--from-frontmatter is unchanged in an installed project (the refusal is --from-plan's)", () => {
  const cwd = seedInstalled(tmp());
  const cap = join(cwd, "cap.md");
  fs.writeFileSync(cap, ["---", 'writes: [".claude/commands/x.md"]', "---", ""].join("\n"));
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(scopeOf(cwd), [".claude/commands/x.md"]);
});

// (3) PROMOTION ORIGIN WHILE A /pharn-loop RUN IS OPEN — every marker state enforce's scanRuns() distinguishes.
const PROMOTE_PRODUCT = join(__dirname, "..", "commands", "pharn-memory-promote.md");

function promoteTree() {
  const cwd = tmp();
  fs.mkdirSync(join(cwd, ".claude", "commands"), { recursive: true });
  fs.copyFileSync(PROMOTE_PRODUCT, join(cwd, ".claude", "commands", "pharn-memory-promote.md"));
  fs.copyFileSync(
    join(__dirname, "..", "commands", "pharn-dev-memory-promote.md"),
    join(cwd, ".claude", "commands", "pharn-dev-memory-promote.md")
  );
  return cwd;
}
function openLoopMarker(cwd, name = "feat", ageMs = 0) {
  const dir = join(cwd, "pharn", ".run", "pharn-loop", name);
  fs.mkdirSync(dir, { recursive: true });
  const f = join(dir, "active.json");
  fs.writeFileSync(f, "{}\n");
  if (ageMs) {
    const t = new Date(Date.now() - ageMs);
    fs.utimesSync(f, t, t);
  }
}
const promote = (cwd, file = ".claude/commands/pharn-memory-promote.md", target = "pharn/memory-bank/lessons-learned.md") =>
  setter(cwd, "--from-frontmatter", file, "--target", target);

test("promotion origin with a FRESH /pharn-loop marker is REFUSED; the message names the marker and its close command", () => {
  const cwd = promoteTree();
  openLoopMarker(cwd, "feat");
  const r = promote(cwd);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /refusing a memory-bank promotion scope while a \/pharn-loop run is open/);
  assert.match(r.stderr, /pharn\/\.run\/pharn-loop\/feat\/active\.json/);
  assert.match(r.stderr, /node \.claude\/hooks\/require-loop-record\.cjs --close feat/);
  assert.equal(scopeOf(cwd), null);
});

test("promotion origin: no marker, or one older than 24 h, is NOT a run — the promotion scope is set (controls)", () => {
  const none = promoteTree();
  assert.equal(promote(none).status, 0);
  assert.deepEqual(scopeOf(none), ["pharn/memory-bank/lessons-learned.md"]);
  const stale = promoteTree();
  openLoopMarker(stale, "old", 26 * 3600 * 1000);
  const r = promote(stale);
  assert.equal(r.status, 0, r.stderr);
});

test("promotion origin: a FILE planted where pharn/.run/pharn-loop belongs keeps the refusal standing (cannot rule a run out)", () => {
  const cwd = promoteTree();
  fs.mkdirSync(join(cwd, "pharn", ".run"), { recursive: true });
  fs.writeFileSync(join(cwd, "pharn", ".run", "pharn-loop"), "x");
  const r = promote(cwd);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /pharn\/\.run\/pharn-loop — not a readable run-state entry/);
});

test("promotion origin: a non-slug marker directory is never rendered by name", () => {
  const cwd = promoteTree();
  openLoopMarker(cwd, "Evil Name");
  const r = promote(cwd);
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stderr, /Evil Name/);
  assert.match(r.stderr, /whose directory name is not a plain slug/);
});

test("promotion origin: BOTH promote commands, and a re-spelled one, are refused during a loop", () => {
  for (const file of [
    ".claude/commands/pharn-memory-promote.md",
    ".claude/commands/pharn-dev-memory-promote.md",
    "./.claude/commands/pharn-memory-promote.md",
  ]) {
    const cwd = promoteTree();
    openLoopMarker(cwd);
    const target = file.includes("dev") ? ".dev/memory-bank/lessons-learned.md" : "pharn/memory-bank/lessons-learned.md";
    const r = promote(cwd, file, target);
    assert.equal(r.status, 1, `${file}: ${r.stdout}`);
    assert.match(r.stderr, /while a \/pharn-loop run is open/);
  }
});

test("a NON-promotion origin is unaffected by an open loop marker (the loop's own lines keep working)", () => {
  const cwd = promoteTree();
  openLoopMarker(cwd);
  const r = setter(cwd, "--from-frontmatter", PLAN_PRODUCT_CMD, "--target", "pharn/features/feat/PLAN.md");
  assert.equal(r.status, 0, r.stderr);
  const p = setter(cwd, "--from-plan", planWith(cwd, "src/a.ts"));
  assert.equal(p.status, 0, p.stderr);
});

// SEC-3 end to end — the refusal exists only because protect-trusted-paths.cjs unlocks canon on a promote-origin record.
test("★ SEC-3 composition: a refused promotion leaves no record, so the canon Write is denied; without a loop it is allowed", () => {
  const sb = promoteTree();
  fs.mkdirSync(join(sb, ".claude", "hooks"), { recursive: true });
  fs.symlinkSync(PROTECT_HOOK, join(sb, ".claude", "hooks", "protect-trusted-paths.cjs"));
  fs.mkdirSync(join(sb, "pharn", "memory-bank"), { recursive: true });
  fs.writeFileSync(join(sb, "pharn", "memory-bank", "lessons-learned.md"), "# canon\n");
  const write = () =>
    spawnSync(process.execPath, [join(sb, ".claude", "hooks", "protect-trusted-paths.cjs")], {
      cwd: sb,
      encoding: "utf8",
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "pharn/memory-bank/lessons-learned.md" } }),
    });
  openLoopMarker(sb);
  assert.equal(promote(sb).status, 1, "the setter refuses during the loop");
  const denied = write();
  assert.equal(denied.status, 2, "no promote-origin record exists, so canon stays denied");
  assert.match(denied.stderr, /memory-bank CANON/);
  fs.rmSync(join(sb, "pharn", ".run", "pharn-loop"), { recursive: true, force: true });
  assert.equal(promote(sb).status, 0, "control: with no loop open the promotion scope is set");
  assert.equal(write().status, 0, "control: and the canon Write it authorizes passes the hook");
});

// (4) FENCED CODE — F3 / F3b against the setter alone (the shared list: check-build-complete.test.mjs).
test("F3: a fenced example list under ## Files is not scoped", () => {
  const cwd = tmp();
  const plan = join(cwd, "PLAN.md");
  fs.writeFileSync(
    plan,
    [
      "## Files",
      "- `src/a.ts` — the only file",
      "",
      "```text",
      "- `pharn/floor/validate.mjs` — example",
      "- `.claude/commands/pharn-build.md` — example",
      "```",
      "",
    ].join("\n")
  );
  const r = setter(cwd, "--from-plan", plan);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(scopeOf(cwd), ["src/a.ts"]);
});

test("F3b: a fenced ## Files before the real one is not the list", () => {
  const cwd = tmp();
  const plan = join(cwd, "PLAN.md");
  fs.writeFileSync(
    plan,
    [
      "## Context",
      "",
      "```markdown",
      "## Files",
      "- `pharn/floor/validate.mjs`",
      "```",
      "",
      "## Files",
      "- `src/a.ts` — the real one",
      "",
    ].join("\n")
  );
  const r = setter(cwd, "--from-plan", plan);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(scopeOf(cwd), ["src/a.ts"]);
});

test("a nesting-dependent fence is REFUSED with the remedy, and nothing is written", () => {
  const cwd = tmp();
  const plan = join(cwd, "PLAN.md");
  fs.writeFileSync(plan, ["## Files", "- `src/a.ts`", "  - sub:", "    ```", "    - `pharn/floor/evil.mjs`", "    ```", ""].join("\n"));
  const r = setter(cwd, "--from-plan", plan);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /indent each fence's opening and\s+closing lines alike, at most three spaces/);
  assert.equal(scopeOf(cwd), null);
});

// ✧ PINS — the copies this setter carries (L31): toKey()/isReserved() byte-equal to enforce-writes-scope.cjs's,
// PROMOTE_COMMANDS set-equal to protect-trusted-paths.cjs's.
function fnSource(file, name) {
  const m = fs.readFileSync(file, "utf8").match(new RegExp(`^function ${name}\\(rel\\) \\{[\\s\\S]*?\\n\\}`, "m"));
  assert.ok(m, `${file} must declare a top-level \`function ${name}(rel) { … }\``);
  return m[0];
}
test("✧ PIN: the setter's toKey() and isReserved() are byte-equal to enforce-writes-scope.cjs's", () => {
  for (const name of ["toKey", "isReserved"]) {
    assert.equal(fnSource(SETTER, name), fnSource(ENFORCE, name), `${name}() has drifted — update both copies (L31)`);
  }
});
test("✧ PIN: the setter's PROMOTE_COMMANDS equal protect-trusted-paths.cjs's (the origins the canon escape trusts)", () => {
  // Both declare it on ONE line, so arrayEntries()'s multi-line form does not apply.
  const entries = (file) => {
    const m = fs.readFileSync(file, "utf8").match(/^const PROMOTE_COMMANDS = \[([^\]]*)\];/m);
    assert.ok(m, `${file} must declare a top-level \`const PROMOTE_COMMANDS = [ … ];\``);
    return (m[1].match(/"([^"]*)"/g) || []).map((s) => s.slice(1, -1));
  };
  const mine = entries(SETTER);
  assert.equal(mine.length, 2, "non-vacuous: both promote commands");
  assert.deepEqual([...mine].sort(), [...entries(PROTECT_HOOK)].sort());
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// hook-hardening-batch (review finding SEC-5 of 2026-10-12): in an INSTALLED project a `--from-plan` scope may not
// name a CI workflow or a git hooks directory — `.github/workflows/**`, `.husky/**`, and every `core.hooksPath` inside
// the project — unless the operator passes --allow-exec-config before the mode. Every ★ test below is RED until
// .dev/features/hook-hardening-batch/apply.py has run (before it, the setter scopes all of these), GREEN after; the
// controls are GREEN on both sides. Each run gets its own HOME, XDG_CONFIG_HOME and GIT_CONFIG_GLOBAL, and each tree
// its own repository (`.git/HEAD` and an empty `.git/config`), so neither a developer's git config nor a repository
// above os.tmpdir() reaches a case that did not ask for it (L41).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

function execTree({ installed = true, git = true } = {}) {
  const cwd = fs.realpathSync(tmp());
  if (installed) seedInstalled(cwd);
  if (git) gitDirWithConfig(cwd, "");
  const home = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), "pharn-sws-home-")));
  return { cwd, home };
}
function execEnv(home, extra = {}) {
  return {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    GIT_CONFIG_GLOBAL: join(home, ".gitconfig"),
    ...extra,
  };
}
function setterIn({ cwd, home }, args, extraEnv = {}) {
  return spawnSync(process.execPath, [SETTER, ...args], { cwd, encoding: "utf8", env: execEnv(home, extraEnv) });
}
function gitDirWithConfig(cwd, configText) {
  fs.mkdirSync(join(cwd, ".git"), { recursive: true });
  fs.writeFileSync(join(cwd, ".git", "HEAD"), "ref: refs/heads/main\n");
  fs.writeFileSync(join(cwd, ".git", "config"), configText);
}
const EXEC_REFUSAL = /refusing to scope, from a plan, files whose code runs outside this run/;

const EXEC_MEMBERS = [
  ".github/workflows/ci.yml",
  ".github/workflows/sub/deploy.yaml",
  ".github/workflows",
  ".husky/pre-commit",
  ".husky/_/husky.sh",
  ".GITHUB/Workflows/ci.yml",
  ".Husky/pre-push",
  ".husky./pre-commit",
  "./.github/workflows/x.yml",
  "src/../.github/workflows/x.yml",
];
for (const p of EXEC_MEMBERS) {
  test(`★ installed project: --from-plan naming ${p} is REFUSED and writes nothing`, () => {
    const t = execTree();
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, "src/a.ts", p)]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, EXEC_REFUSAL);
    assert.ok(r.stderr.includes(p), "the offending entry is named");
    assert.equal(scopeOf(t.cwd), null);
  });
}

test("installed project: the neighbours of the class are NOT refused (controls)", () => {
  const t = execTree();
  const entries = [
    ".github/dependabot.yml",
    ".github/ISSUE_TEMPLATE/bug.md",
    ".github/workflowsx/a.yml",
    ".huskyrc",
    "src/.husky/x",
    "docs/.github/workflows/x.yml",
  ];
  const r = setterIn(t, ["--from-plan", planWith(t.cwd, ...entries)]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(scopeOf(t.cwd), entries);
});

test("★ a core.hooksPath in the repository's own .git/config is reserved, in any letter case, quoted or commented", () => {
  for (const [config, hooked] of [
    ["[core]\n\thooksPath = tools/git-hooks\n", "tools/git-hooks/pre-commit"],
    ['[Core]\n  HOOKSPATH = "my hooks" # the team hooks\n', "my hooks/pre-push"],
    ["[core] hookspath=.config/hooks ; trailing\n", ".config/hooks/commit-msg"],
    ['[core]\n\thooksPath = "a\\\\b"\n', "a\\b/pre-commit"],
  ]) {
    const t = execTree();
    gitDirWithConfig(t.cwd, config);
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, "src/a.ts", hooked)]);
    assert.equal(r.status, 1, `${JSON.stringify(config)}: ${r.stderr}`);
    assert.match(r.stderr, EXEC_REFUSAL);
    const ok = setterIn(t, ["--from-plan", planWith(t.cwd, "src/a.ts", "tools/other.sh")]);
    assert.equal(ok.status, 0, `control, ${JSON.stringify(config)}: ${ok.stderr}`);
  }
});

test("a hooksPath under a SUBSECTION, another section or a key with no value is not core.hooksPath (controls)", () => {
  const t = execTree();
  gitDirWithConfig(t.cwd, '[core "x"]\n\thooksPath = sub\n[other]\n\thooksPath = other\n[core]\n\thooksPath\n');
  const r = setterIn(t, ["--from-plan", planWith(t.cwd, "sub/pre-commit", "other/pre-commit")]);
  assert.equal(r.status, 0, r.stderr);
});

test("★ every hooksPath value counts — a later one does not hide an earlier one", () => {
  const t = execTree();
  gitDirWithConfig(t.cwd, "[core]\n\thooksPath = first\n[core]\n\thooksPath = second\n");
  for (const p of ["first/pre-commit", "second/pre-commit"]) {
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, p)]);
    assert.equal(r.status, 1, `${p}: ${r.stderr}`);
  }
});

test("★ a BOM before the first header, and lone-CR line ends, do not hide a hooksPath (git reads both)", () => {
  for (const config of ["\uFEFF[core]\n\thooksPath = hooks\n", "[core]\r\thooksPath = hooks\r"]) {
    const t = execTree();
    gitDirWithConfig(t.cwd, config);
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, "hooks/pre-commit")]);
    assert.equal(r.status, 1, `${JSON.stringify(config)}: ${r.stderr}`);
    assert.match(r.stderr, EXEC_REFUSAL);
  }
});

test("★ FAIL-CLOSED: a hooksPath value continued onto the next line refuses the plan rather than read half of it", () => {
  const t = execTree();
  gitDirWithConfig(t.cwd, "[core]\n\thooksPath = ho\\\noks\n");
  const r = setterIn(t, ["--from-plan", planWith(t.cwd, "src/a.ts")]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /a core\.hooksPath value continues onto the next line/);
  assert.equal(scopeOf(t.cwd), null);
});

test("★ a project in a SUBDIRECTORY of a repository reads that repository's config, resolving against its top", () => {
  const top = fs.realpathSync(tmp());
  const home = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), "pharn-sws-home-")));
  gitDirWithConfig(top, "[core]\n\thooksPath = app/githooks\n");
  const cwd = join(top, "app");
  fs.mkdirSync(cwd);
  seedInstalled(cwd);
  const r = setterIn({ cwd, home }, ["--from-plan", planWith(cwd, "githooks/pre-commit")]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, EXEC_REFUSAL);
  const ok = setterIn({ cwd, home }, ["--from-plan", planWith(cwd, "app/githooks/pre-commit", "src/a.ts")]);
  assert.equal(ok.status, 0, `control: the value is resolved against the work-tree top, not the project: ${ok.stderr}`);
});

test("★ a lone CR inside a line is a blank, not a line end — it cannot move a hooksPath out of [core] (git agrees)", () => {
  for (const config of ["[core]\n\tfoo = a\r[x]\n\thooksPath = hooks\n", "[core]\n\t# note\r[x]\n\thooksPath = hooks\n"]) {
    const t = execTree();
    gitDirWithConfig(t.cwd, config);
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, "hooks/pre-commit")]);
    assert.equal(r.status, 1, `${JSON.stringify(config)}: ${r.stderr}`);
    assert.match(r.stderr, EXEC_REFUSAL);
  }
});

test("★ a .git directory with no HEAD is not a repository: the walk goes on to the one above, as git's does", () => {
  const top = fs.realpathSync(tmp());
  const home = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), "pharn-sws-home-")));
  gitDirWithConfig(top, "[core]\n\thooksPath = app/hk\n");
  const cwd = join(top, "app");
  fs.mkdirSync(join(cwd, ".git"), { recursive: true });
  fs.writeFileSync(join(cwd, ".git", "config"), "[core]\n");
  seedInstalled(cwd);
  const r = setterIn({ cwd, home }, ["--from-plan", planWith(cwd, "hk/pre-commit")]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, EXEC_REFUSAL);
});

test("★ a linked worktree's hooksPath is read through its .git file and commondir, and config.worktree counts too", () => {
  const t = execTree({ git: false });
  const common = join(t.home, "main-repo.git");
  const wtDir = join(common, "worktrees", "w");
  fs.mkdirSync(wtDir, { recursive: true });
  fs.writeFileSync(join(common, "config"), "[core]\n\thooksPath = shared-hooks\n");
  fs.writeFileSync(join(wtDir, "commondir"), "../..\n");
  fs.writeFileSync(join(wtDir, "config.worktree"), "[core]\n\thooksPath = wt-hooks\n");
  fs.writeFileSync(join(t.cwd, ".git"), `gitdir: ${wtDir}\n`);
  for (const p of ["shared-hooks/pre-commit", "wt-hooks/pre-commit"]) {
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, p)]);
    assert.equal(r.status, 1, `${p}: ${r.stderr}`);
    assert.match(r.stderr, EXEC_REFUSAL);
  }
});

test("★ a relative hooksPath in the global or XDG user config is reserved inside this project", () => {
  for (const [rel, file] of [
    [".gitconfig", "global-hooks"],
    [join(".config", "git", "config"), "xdg-hooks"],
  ]) {
    const t = execTree();
    fs.mkdirSync(join(t.home, ".config", "git"), { recursive: true });
    fs.writeFileSync(join(t.home, rel), `[core]\n\thooksPath = ${file}\n`);
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, `${file}/pre-commit`)]);
    assert.equal(r.status, 1, `${rel}: ${r.stderr}`);
  }
});

test("★ an absolute hooksPath inside the project is reserved; one outside it reserves nothing here", () => {
  const t = execTree();
  gitDirWithConfig(t.cwd, `[core]\n\thooksPath = ${join(t.cwd, "abs-hooks")}\n[core]\n\thooksPath = ${join(t.home, "elsewhere")}\n`);
  assert.equal(setterIn(t, ["--from-plan", planWith(t.cwd, "abs-hooks/pre-commit")]).status, 1);
  const ok = setterIn(t, ["--from-plan", planWith(t.cwd, "elsewhere/pre-commit")]);
  assert.equal(ok.status, 0, ok.stderr);
});

test("★ a `~/` hooksPath resolves against the home directory", () => {
  const t = execTree();
  gitDirWithConfig(t.cwd, "[core]\n\thooksPath = ~/proj-hooks\n");
  const r = setterIn({ cwd: t.cwd, home: t.cwd }, ["--from-plan", planWith(t.cwd, "proj-hooks/pre-commit")]);
  assert.equal(r.status, 1, r.stderr);
  const other = setterIn(t, ["--from-plan", planWith(t.cwd, "~other/x", "proj-hooks/pre-commit")]);
  assert.equal(other.status, 0, `control: with HOME elsewhere, nothing is reserved here: ${other.stderr}`);
});

test("★ a hooksPath that names a symlink reserves the real directory too (L73)", () => {
  const t = execTree();
  fs.mkdirSync(join(t.cwd, "scripts", "hooks"), { recursive: true });
  fs.symlinkSync(join("scripts", "hooks"), join(t.cwd, "hk"));
  gitDirWithConfig(t.cwd, "[core]\n\thooksPath = hk\n");
  for (const p of ["hk/pre-commit", "scripts/hooks/pre-commit"]) {
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, p)]);
    assert.equal(r.status, 1, `${p}: ${r.stderr}`);
  }
  const ok = setterIn(t, ["--from-plan", planWith(t.cwd, "scripts/build.sh")]);
  assert.equal(ok.status, 0, ok.stderr);
});

test("★ a hooksPath equal to the project root reserves its top-level entries only", () => {
  const t = execTree();
  gitDirWithConfig(t.cwd, "[core]\n\thooksPath = .\n");
  assert.equal(setterIn(t, ["--from-plan", planWith(t.cwd, "pre-commit")]).status, 1);
  const ok = setterIn(t, ["--from-plan", planWith(t.cwd, "src/a.ts")]);
  assert.equal(ok.status, 0, ok.stderr);
});

test("★ FAIL-CLOSED: a git configuration that cannot be read refuses the plan, naming the file", () => {
  const cases = [
    [
      "a .git file with no gitdir: line",
      (t) => fs.writeFileSync(join(t.cwd, ".git"), "nonsense\n"),
      /\.git \(a file with no `gitdir:` line\)/,
    ],
    [
      "a repository's .git directory with no config",
      (t) => {
        fs.mkdirSync(join(t.cwd, ".git"));
        fs.writeFileSync(join(t.cwd, ".git", "HEAD"), "ref: refs/heads/main\n");
      },
      /config \(could not be examined\)/,
    ],
    [
      "a .git/config that is a directory",
      (t) => {
        fs.mkdirSync(join(t.cwd, ".git", "config"), { recursive: true });
        fs.writeFileSync(join(t.cwd, ".git", "HEAD"), "ref: refs/heads/main\n");
      },
      /config \(not a regular file\)/,
    ],
    [
      "a global config that is a directory",
      (t) => {
        gitDirWithConfig(t.cwd, "");
        fs.mkdirSync(join(t.home, ".gitconfig"));
      },
      /\.gitconfig \(not a regular file\)/,
    ],
  ];
  for (const [what, seed, detail] of cases) {
    const t = execTree({ git: false });
    seed(t);
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, "src/a.ts")]);
    assert.equal(r.status, 1, `${what}: ${r.stderr}`);
    assert.match(r.stderr, /the git configuration that says where git hooks run could not be read/, what);
    assert.match(r.stderr, detail, what);
    assert.match(r.stderr, /--allow-exec-config placed BEFORE --from-plan/, what);
    assert.equal(scopeOf(t.cwd), null, what);
  }
});

test("absent optional git config files are skipped, and GIT_CONFIG_GLOBAL=/dev/null is accepted (controls)", () => {
  const t = execTree();
  const r = setterIn(t, ["--from-plan", planWith(t.cwd, "src/a.ts")], { GIT_CONFIG_GLOBAL: "/dev/null" });
  assert.equal(r.status, 0, r.stderr);
});

test("★ --allow-exec-config BEFORE the mode opts back in; AFTER it the setter refuses", () => {
  const t = execTree();
  const ok = setterIn(t, ["--allow-exec-config", "--from-plan", planWith(t.cwd, ".github/workflows/ci.yml", ".husky/pre-commit")]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(scopeOf(t.cwd), [".github/workflows/ci.yml", ".husky/pre-commit"]);
  const t2 = execTree();
  const late = setterIn(t2, ["--from-plan", planWith(t2.cwd, "src/a.ts"), "--allow-exec-config"]);
  assert.equal(late.status, 1);
  assert.match(late.stderr, /--allow-exec-config must come BEFORE the mode/);
  assert.equal(scopeOf(t2.cwd), null);
});

test("★ --allow-exec-config also skips the git-config reading (the operator's way past an unreadable file)", () => {
  const t = execTree({ git: false });
  fs.writeFileSync(join(t.cwd, ".git"), "nonsense\n");
  const r = setterIn(t, ["--allow-exec-config", "--from-plan", planWith(t.cwd, "src/a.ts")]);
  assert.equal(r.status, 0, r.stderr);
});

test("★ each opt-in opens only its own class (--allow-pharn-surface and --allow-exec-config are independent)", () => {
  const t = execTree();
  const a = setterIn(t, ["--allow-pharn-surface", "--from-plan", planWith(t.cwd, ".husky/pre-commit")]);
  assert.equal(a.status, 1);
  assert.match(a.stderr, EXEC_REFUSAL);
  const b = setterIn(t, ["--allow-exec-config", "--from-plan", planWith(t.cwd, "pharn/floor/x.mjs")]);
  assert.equal(b.status, 1);
  assert.match(b.stderr, /refusing to scope PHARN's own installed files from a plan/);
});

test("★ L27: each refusal names only remedies that work for it", () => {
  const t = execTree();
  const exec = setterIn(t, ["--from-plan", planWith(t.cwd, ".github/workflows/ci.yml")]);
  assert.equal(exec.status, 1);
  assert.match(exec.stderr, /edit it yourself, outside the agent/);
  assert.match(exec.stderr, /--allow-exec-config placed BEFORE --from-plan/);
  assert.doesNotMatch(exec.stderr, /pharn update|--allow-pharn-surface|Bash/);
  const surface = setterIn(t, ["--from-plan", planWith(t.cwd, "pharn/floor/x.mjs")]);
  assert.equal(surface.status, 1);
  assert.doesNotMatch(surface.stderr, /--allow-exec-config/);
});

test("the dev checkout, an unsignalled tree and --from-frontmatter are UNCHANGED for the class, even with unreadable git config (controls)", () => {
  for (const seed of [(d) => seedDevRepo(d), (d) => d]) {
    const t = execTree({ installed: false, git: false });
    seed(t.cwd);
    fs.writeFileSync(join(t.cwd, ".git"), "nonsense\n");
    const r = setterIn(t, ["--from-plan", planWith(t.cwd, ".github/workflows/ci.yml", ".husky/pre-commit")]);
    assert.equal(r.status, 0, r.stderr);
  }
  const t = execTree();
  const cap = join(t.cwd, "cap.md");
  fs.writeFileSync(cap, ["---", 'writes: [".github/workflows/ci.yml"]', "---", ""].join("\n"));
  const r = setterIn(t, ["--from-frontmatter", cap]);
  assert.equal(r.status, 0, r.stderr);
});

// ============================== 7.0.0 — the scope file moved to pharn/.run/ (pharn-footprint-move) ==============
// The CONTROL_SURFACE ↔ DEFAULT_PROTECTED parity pin covers only the `.claude/`-prefixed members, so it cannot see a
// scope-file path the setter and the enforcer disagree on. These two tests can: one behavioural (the enforcer honours
// what the setter wrote, and --clear removes exactly that file), one a ✧ pin over the three copies of the path (L31).
test("★ 7.0.0 the setter writes exactly the file the enforcer reads — set, honoured, cleared", () => {
  const cwd = seedDevRepo(tmp());
  assert.equal(enforce(cwd, "src/legit.ts").status, 2, "control: no scope, so the dev default-safe-set denies src/");
  const r = setter(cwd, "--from-plan", planWith(cwd, "src/legit.ts"));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), "the record is at pharn/.run/");
  assert.ok(!fs.existsSync(join(cwd, ".pharn")), "nothing is written at the OLD root"); // migration
  assert.equal(enforce(cwd, "src/legit.ts").status, 0, "the enforcer reads the record the setter wrote");
  assert.equal(enforce(cwd, "src/other.ts").status, 2, "and only that scope");
  assert.equal(setter(cwd, "--clear").status, 0);
  assert.ok(!fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")));
  assert.equal(enforce(cwd, "src/legit.ts").status, 2, "after --clear the default applies again");
});

test("✧ 7.0.0 PIN: the scope-file path is the same in the setter, the enforcer and the protect list (L31)", () => {
  const read = (f) => fs.readFileSync(join(__dirname, f), "utf8");
  assert.match(read("enforce-writes-scope.cjs"), /^const SCOPE_FILE = "pharn\/\.run\/writes-scope\.json";$/m);
  assert.match(read("protect-trusted-paths.cjs"), /^ {2}"pharn\/\.run\/writes-scope\.json",$/m);
  const setterSrc = read("set-writes-scope.cjs");
  assert.match(setterSrc, /path\.resolve\(process\.cwd\(\), "pharn", "\.run", "writes-scope\.json"\)/, "--clear");
  assert.match(setterSrc, /path\.resolve\(process\.cwd\(\), "pharn", "\.run"\);\n.*\n.*"writes-scope\.json"/, "the write");
});

test("★ 7.0.0 promotion origin: a symlink at EITHER segment of the scratch root keeps the refusal standing", () => {
  for (const seg of ["pharn", "pharn/.run"]) {
    const cwd = promoteTree();
    const elsewhere = fs.mkdtempSync(join(os.tmpdir(), "pharn-sws-out-"));
    fs.mkdirSync(join(elsewhere, ".run", "pharn-loop"), { recursive: true });
    if (seg === "pharn/.run") fs.mkdirSync(join(cwd, "pharn"), { recursive: true });
    fs.symlinkSync(seg === "pharn" ? elsewhere : join(elsewhere, ".run"), join(cwd, ...seg.split("/")));
    const r = promote(cwd);
    assert.equal(r.status, 1, `${seg}: ${r.stderr}`);
    assert.match(r.stderr, new RegExp(`${seg.replace(/[./]/g, "\\$&")} \\(a symbolic link\\)`));
    fs.rmSync(elsewhere, { recursive: true, force: true });
  }
});
