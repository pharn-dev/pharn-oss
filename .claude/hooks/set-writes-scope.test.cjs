// .claude/hooks/set-writes-scope.test.cjs — locks the dev/product ARTIFACT SPLIT (fix #7 setter).
//
// After the dev/product boundary move, the build-loop commands write their artifacts under
// `.dev/features/`, NOT root `features/` (root `features/` is reserved for the PRODUCT pipeline's
// SPEC.md etc.). That split is enforced DETERMINISTICALLY by each `pharn-dev-*` command's `writes:`
// placeholder being `.dev/features/<name>/…`: the setter resolves a `.dev/features/<name>` --target,
// and a ROOT `features/<name>` --target matches no entry → fail-closed (no scope written).
//
// This pins that for `/pharn-dev-plan` against the REAL command file (membership, not a synthetic
// fixture — mirrors enforce-writes-scope.test.cjs's real-review.md regression test). It also backfills
// dedicated set-writes-scope.cjs coverage (previously exercised only via enforce-writes-scope.test.cjs).
// Run as a subprocess so the setter keeps its dependency-free, top-level-exec contract; cwd = a fresh
// temp dir so the real repo .pharn/ is never touched.

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
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".dev/features/sample/PLAN.md"]);
});

test("artifact-split lock: a ROOT features/<name> --target is REJECTED (pharn-dev-* write .dev/features/, never root features/)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", PLAN_CMD, "--target", "features/sample/PLAN.md");
  // pharn-dev-plan's `writes:` placeholder is `.dev/features/<name>/PLAN.md`; a root `features/…` target
  // matches no entry, so the setter emits no concrete scope, exits non-zero, and writes nothing (fail-closed).
  assert.equal(r.status, 1);
  assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
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
  assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
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
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
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
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
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
  assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
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
  assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
});

// --- F3: the setter REFUSES to authorize the write-guards' own control surface (fail-closed) ---
// A declared `writes:` / `## Files` list is untrusted input (CONSTITUTION P2). Before this refusal, an
// entry naming a hook emitted a scope that enforce-writes-scope.cjs honored, so an untrusted document
// could authorize disarming a guard. The refusal is exact membership over the same four paths
// protect-trusted-paths.cjs protects; --allow-claude-dir is the only opt-in.

const CONTROL_SURFACE = [
  ".claude/settings.json",
  ".claude/settings.local.json",
  ".claude/hooks/protect-trusted-paths.cjs",
  ".claude/hooks/enforce-writes-scope.cjs",
  ".claude/hooks/set-writes-scope.cjs",
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
    assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
  });
}

test("--allow-claude-dir opts back in: the same PLAN succeeds and the entry survives in scope", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-plan", planWith(cwd, ".claude/settings.json", "src/legit.ts"), "--allow-claude-dir");
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".claude/settings.json", "src/legit.ts"]);
});

test("--allow-claude-dir is its own arg-loop branch: placed FIRST it does not eat the positional mode/file", () => {
  const cwd = tmp();
  const r = setter(cwd, "--allow-claude-dir", "--from-plan", planWith(cwd, ".claude/settings.json"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".claude/settings.json"]);
});

test("--from-frontmatter with a control path in `writes:` is REFUSED without the flag", () => {
  const cwd = tmp();
  const cap = join(cwd, "cap.md");
  fs.writeFileSync(cap, ["---", 'writes: [".claude/hooks/enforce-writes-scope.cjs"]', "---", "", "# cap", ""].join("\n"));
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /refusing to scope the write-guards' own control surface/);
  assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
});

// The membership test normalizes the entry (lexically) so a trivial re-spelling cannot walk past it.
// NOT a realpath — a symlink resolving onto a control file is still not caught here; that is the
// enforcing hook's job. These pin the normalization, not a resolution guarantee.
for (const spelling of ["./.claude/settings.json", ".claude/hooks/../hooks/set-writes-scope.cjs", ".claude//settings.json"]) {
  test(`a re-spelled control path is still REFUSED: ${spelling}`, () => {
    const cwd = tmp();
    const r = setter(cwd, "--from-plan", planWith(cwd, spelling));
    assert.notEqual(r.status, 0);
    assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
  });
}

// --- Deliberately NOT refused: commands and the hooks' own tests. An increment that edits either must
// not need an opt-in flag (46 of 104 historical plans write a command file). ---

test("a PLAN naming .claude/commands/* and .claude/hooks/*.test.cjs is UNAFFECTED (no flag needed)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-plan", planWith(cwd, ".claude/commands/pharn-plan.md", ".claude/hooks/set-writes-scope.test.cjs"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, [".claude/commands/pharn-plan.md", ".claude/hooks/set-writes-scope.test.cjs"]);
});

// --- Regression: a plan with no control path emits exactly the scope it always did ---

test("a PLAN with no control path emits the identical scope as before the refusal existed", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-plan", planWith(cwd, "src/widget.ts", "src/widget.test.ts"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
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
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["app/(marketing)"]);
});

test("F15 fix: a NESTED route-group path `app/(a)/(b)` survives `clean()` intact", () => {
  const cwd = tmp();
  const cap = capWith(cwd, "writes:", '  - "app/(a)/(b)"');
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["app/(a)/(b)"]);
});

test("F15 regression guard: the documented SPACE-separated annotation (e.g. ` (gated)`) is still stripped", () => {
  const cwd = tmp();
  const cap = capWith(cwd, "writes:", '  - "src/widget.ts (gated)"');
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["src/widget.ts"]);
});

test("F15 regression guard: a route-group FILE (`app/(marketing)/page.tsx`) was never affected either way", () => {
  const cwd = tmp();
  const cap = capWith(cwd, "writes:", '  - "app/(marketing)/page.tsx"');
  const r = setter(cwd, "--from-frontmatter", cap);
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
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
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, 'writes: ["features/*/REVIEW.md"]'), "--target", "features/x/REVIEW.md");
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["features/x/REVIEW.md"]);
});

test("--from-frontmatter: a GLOB that does not match --target yields no scope (fail-closed)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, 'writes: ["features/*/REVIEW.md"]'), "--target", "docs/other.md");
  assert.notEqual(r.status, 0);
  assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
});

test("--from-frontmatter reads the BLOCK-list `writes:` form", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, "writes:", '  - "src/a.ts"', "  - src/b.ts"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["src/a.ts", "src/b.ts"]);
});

test("--from-frontmatter reads an UNQUOTED inline-array `writes:` form", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, "writes: [src/a.ts, src/b.ts]"));
  assert.equal(r.status, 0);
  const rec = JSON.parse(fs.readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8"));
  assert.deepEqual(rec.scope, ["src/a.ts", "src/b.ts"]);
});

test("a BLOCK-list `writes:` naming a control file is refused too (the refusal is form-independent)", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, "writes:", '  - ".claude/settings.json"'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /refusing to scope the write-guards' own control surface/);
  assert.equal(fs.existsSync(join(cwd, ".pharn", "writes-scope.json")), false);
});

test("--target that escapes the repo root is rejected", () => {
  const cwd = tmp();
  const r = setter(cwd, "--from-frontmatter", capWith(cwd, 'writes: ["features/<name>/PLAN.md"]'), "--target", "../outside/PLAN.md");
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

test("✧ the control surface names exactly the wiring files plus the three hook scripts — no command, no test file", () => {
  // Pins the GATE-1 decision itself: `.claude/commands/**` and `*.test.cjs` must stay OUT, or the
  // self-hosting loop breaks (46 of 104 historical plans write a command file).
  const set = arrayEntries(SETTER, "CONTROL_SURFACE");
  assert.equal(set.filter((p) => p.endsWith(".test.cjs")).length, 0, "a hook's own tests must never be refused");
  assert.equal(set.filter((p) => p.startsWith(".claude/commands/")).length, 0, "commands must never be refused");
  assert.ok(set.includes(".claude/settings.json"), "the file that WIRES both hooks must be covered");
  // BOTH settings files, not just the committed one: settings.local.json is loaded too and can wire or
  // override the same hooks, so covering only settings.json left the control surface half-open.
  assert.ok(set.includes(".claude/settings.local.json"), "the LOCAL wiring file must be covered too");
  assert.equal(set.filter((p) => p.startsWith(".claude/hooks/") && p.endsWith(".cjs")).length, 3, "all three hooks");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// --clear — the writes-scope LIFECYCLE (feature `writes-scope-lifecycle`).
//
// A SET scope REPLACES enforce-writes-scope.cjs's fail-closed DEFAULT_SAFE_SET, so a command that
// finished and left `.pharn/writes-scope.json` behind is STRICTER than no scope at all: paths the
// default PERMITS start being denied in later sessions. `--clear` deletes the file, returning control
// to that default. These tests pin the flag's behavior AND the enforce-side consequence, because the
// flag's whole purpose lives in the other hook's fallback, not in its own exit code.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const ENFORCE = join(__dirname, "enforce-writes-scope.cjs");
const SCOPE_REL = join(".pharn", "writes-scope.json");

function enforce(cwd, filePath) {
  return spawnSync(process.execPath, [ENFORCE], {
    cwd,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: filePath } }),
  });
}

function seedScope(cwd, record) {
  fs.mkdirSync(join(cwd, ".pharn"), { recursive: true });
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
  // present-but-empty scope[] yields ONLY `.pharn/**` — stricter than the stale scope --clear removes.
  const cwd = tmp();
  seedScope(cwd, { scope: [] });
  assert.equal(enforce(cwd, ".dev/features/other/PLAN.md").status, 2, "empty-array scope denies the safe-set");
  seedScope(cwd, { scope: [".dev/features/demo/SHIP.md"], set_by: "x.md", set_at: "t" });
  setter(cwd, "--clear");
  assert.equal(fs.existsSync(join(cwd, SCOPE_REL)), false, "--clear must DELETE, never leave an empty scope[]");
});

test("--clear surfaces a non-ENOENT unlink failure as an error, never as a silent success", () => {
  // The catch treats ENOENT as the idempotent no-op and everything else as a real failure. Exercised
  // by making `.pharn` a FILE, so unlinking `.pharn/writes-scope.json` fails with ENOTDIR rather than
  // ENOENT. Without this, the branch's message and exit code were unverified — an error path that has
  // never run is an assumption, not a behavior.
  const cwd = tmp();
  fs.writeFileSync(join(cwd, ".pharn"), "not a directory\n");
  const r = setter(cwd, "--clear");
  assert.notEqual(r.status, 0, "a non-ENOENT failure must not report success");
  assert.match(r.stderr, /could not clear \.pharn\/writes-scope\.json/);
  assert.doesNotMatch(r.stdout, /writes-scope cleared/, "it must not claim to have cleared anything");
});
