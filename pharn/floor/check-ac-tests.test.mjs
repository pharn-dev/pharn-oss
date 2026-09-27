// pharn/floor/check-ac-tests.test.mjs — the AC-tests mapping checker's suite, plus specAcceptanceCriteria()
// (spec-template-core.mjs), which exists for this checker.
//
// Every RED kind has ONE mutation of the passing world that trips it and no other kind (L34/L52), with the passing
// world as its non-vacuity control; `no-files` is the one kind that cannot be isolated (a mapping line whose file is
// not listed is also `unlisted-file`), and its test says so. The last test asserts that every KINDS member was
// reached (L36). The ★ HOOK test runs the REAL writes-scope setter and pre-write guard: a build scoped by PLAN.md is
// denied a Write to an AC test file, which is the property the `in-plan-files` kind exists to protect. 6.30.0 adds two
// more: every measured PLAN spelling that opens the lock, AC-TESTS.md or a script-named reporter to the build is RED,
// and the composed proof that `package.json` can stay an advisory NOTE once the lock is out of the build's scope.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KINDS, LEVELS, LOCK_NAME, MAPPING_RE, badPath, checkMapping, mappingOf, ownArtifacts } from "./check-ac-tests.mjs";
import { LOCK_NAME as LOCK_SCRIPT_NAME } from "./ac-tests-lock.mjs";
import { specAcceptanceCriteria, specVerdict } from "./spec-template-core.mjs";
import { acRowsOf, scopeKey, scopedPath } from "./ac-tests-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK = join(HERE, "check-ac-tests.mjs");
const CHECK_SPEC = join(HERE, "check-spec.mjs");
const SETTER = join(HERE, "..", "..", ".claude", "hooks", "set-writes-scope.cjs");
const ENFORCER = join(HERE, "..", "..", ".claude", "hooks", "enforce-writes-scope.cjs");
const TEMPLATE = readFileSync(join(HERE, "..", "pharn-contracts", "templates", "spec-template.md"), "utf8");
const REF = spawnSync(process.execPath, [CHECK_SPEC, "--template-ref", "pharn-default"], { encoding: "utf8" }).stdout.trim();
const NAME = "demo";
const UNIT = "tests/ac/demo.unit.test.js";
const E2E = "tests/ac/demo.e2e.spec.js";

/** A templated SPEC from the SHIPPED template: AC-1 at `unit`, AC-2 at `e2e`; Approved + pinned unless `draft`. */
function specText({ draft = false, legacy = false, kind = null } = {}) {
  let t = TEMPLATE.replace(/<!--\s*pharn:guidance[\s\S]*?-->\n?/g, "")
    .replace("spec_id: <name>", `spec_id: ${NAME}`)
    .replace("<the line check-spec.mjs --resolve-template-ref prints>", REF)
    .replace("<unit | integration | e2e>", "unit")
    .replace(/<[^>\n]+>/g, "filled");
  t = t.replace("  - verify: unit\n", "  - verify: unit\n- **AC-2** Given a user When they reset Then a mail is sent\n  - verify: e2e\n");
  if (legacy) t = t.replace(/^spec_template:.*\n/m, "");
  // A `spec_kind:` line goes in BEFORE the pin is computed: the pin covers it (check-spec.mjs pinHash, 6.18.0).
  if (kind !== null) t = t.replace(/^(spec_id: .*\n)/m, `$1spec_kind: ${kind}\n`);
  if (draft) return t;
  const tmp = mkdtempSync(join(tmpdir(), "act-spec-"));
  try {
    writeFileSync(join(tmp, "SPEC.md"), t);
    const hash = spawnSync(process.execPath, [CHECK_SPEC, "--hash", join(tmp, "SPEC.md")], { encoding: "utf8" }).stdout.trim();
    return t.replace("state: Draft", "state: Approved").replace('spec_content_hash: ""', `spec_content_hash: ${hash}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
const SPEC = specText();
const HASH = SPEC.match(/^spec_content_hash: ([0-9a-f]{64})$/m)[1];

function acTests({ hash = HASH, files = [UNIT, E2E], mapping } = {}) {
  const rows = mapping ?? [
    `- AC-1 | unit | \`${UNIT}\` | src/demo.js#reset(token): Promise<void>`,
    `- AC-2 | e2e | \`${E2E}\` | /reset — button "Reset password"`,
  ];
  return [
    "---",
    `spec_id: ${NAME}`,
    `spec_content_hash: ${hash}`,
    "---",
    "",
    "# AC tests — demo",
    "",
    "## Files",
    "",
    ...files.map((f) => `- \`${f}\` — an AC test`),
    "",
    "## Mapping",
    "",
    ...rows,
    "",
  ].join("\n");
}
function planText(files = ["src/demo.js"]) {
  return [
    "---",
    `spec_id: ${NAME}`,
    `spec_content_hash: ${HASH}`,
    "applied_lessons: none",
    "---",
    "",
    "## Files",
    "",
    ...files.map((f) => `- \`${f}\` — x`),
    "",
  ].join("\n");
}

/** A project root holding the feature; `others` is `{feature: AC-TESTS.md text}` for other feature dirs; `files` is
 *  `{path: body}` for anything else at the root (a package.json, a reporter). */
function world({ spec = SPEC, ac = acTests(), plan = planText(), others = {}, files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "act-"));
  const dir = join(root, "pharn", "features", NAME);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SPEC.md"), spec);
  writeFileSync(join(dir, "AC-TESTS.md"), ac);
  writeFileSync(join(dir, "PLAN.md"), plan);
  for (const [f, text] of Object.entries(others)) {
    mkdirSync(join(root, "pharn", "features", f), { recursive: true });
    writeFileSync(join(root, "pharn", "features", f, "AC-TESTS.md"), text);
  }
  for (const [f, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), body);
  }
  return root;
}
/** THIS feature's AC artifacts as main() computes them for a run from the project root. */
const ART = [`pharn/features/${NAME}/AC-TESTS.md`, `pharn/features/${NAME}/${LOCK_NAME}`];
/** checkMapping with its two required 6.30.0 inputs defaulted to this world's (no script names a file). */
const cm = (input) => checkMapping({ acArtifacts: ART, scriptFiles: [], ...input });
function run(root, extra = []) {
  const f = (n) => `pharn/features/${NAME}/${n}`;
  const r = spawnSync(process.execPath, [CHECK, f("AC-TESTS.md"), f("SPEC.md"), f("PLAN.md"), ...extra], { cwd: root, encoding: "utf8" });
  const kinds = [...new Set([...r.stdout.matchAll(/^RED — ([a-z-]+):/gm)].map((m) => m[1]))].sort();
  return { code: r.status, out: r.stdout, kinds };
}
const REACHED = new Set();
function onlyKind(opts, kind, extra) {
  const root = world(opts);
  try {
    const r = run(root, extra);
    assert.equal(r.code, 1, r.out);
    assert.deepEqual(r.kinds, [kind], `expected ONLY ${kind}:\n${r.out}`);
    REACHED.add(kind);
    return r;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------
// specAcceptanceCriteria — the AC ids as data, through check-spec's own parser.
// ---------------------------------------------------------------------------------------------------

test("specAcceptanceCriteria: a templated SPEC → its AC ids and verify levels, in order", () => {
  const r = specAcceptanceCriteria(SPEC);
  assert.equal(r.templated, true);
  assert.equal(r.sections, 1);
  assert.deepEqual(
    r.items.map((i) => [i.id, i.level]),
    [
      ["AC-1", "unit"],
      ["AC-2", "e2e"],
    ]
  );
});

test("specAcceptanceCriteria agrees with check-spec.mjs's own AC count (one parser, not two)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "act-agree-"));
  try {
    writeFileSync(join(tmp, "SPEC.md"), SPEC);
    const r = spawnSync(process.execPath, [CHECK_SPEC, join(tmp, "SPEC.md")], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout);
    const counted = Number(r.stdout.match(/(\d+) AC item\(s\)/)[1]);
    assert.equal(specAcceptanceCriteria(SPEC).items.length, counted);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("specAcceptanceCriteria: legacy (no spec_template, or no frontmatter) → no ids; a duplicated section → sections 2, no ids", () => {
  assert.deepEqual(specAcceptanceCriteria(specText({ legacy: true })), {
    templated: false,
    kind: "feature",
    kindInBody: false,
    sections: 0,
    items: [],
  });
  assert.deepEqual(specAcceptanceCriteria("## Acceptance Criteria\n- **AC-1** Given a When b Then c\n  - verify: unit\n"), {
    templated: false,
    kind: "feature",
    kindInBody: false,
    sections: 0,
    items: [],
  });
  const dup = SPEC + "\n## Acceptance Criteria\n\n- **AC-3** Given a When b Then c\n  - verify: unit\n";
  const r = specAcceptanceCriteria(dup);
  assert.equal(r.sections, 2);
  assert.deepEqual(r.items, []);
  // A malformed verify line carries level null (the shipped template's placeholder example is one).
  assert.equal(specAcceptanceCriteria(TEMPLATE.replace(/<!--\s*pharn:guidance[\s\S]*?-->\n?/g, "")).items[0].level, null);
});

// ---------------------------------------------------------------------------------------------------
// The checker — control, then one mutation per kind.
// ---------------------------------------------------------------------------------------------------

test("control: the passing world is GREEN (every mutation below starts here)", () => {
  const root = world();
  try {
    const r = run(root);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^GREEN — 2 AC\(s\) mapped/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy-spec — in FULL mode a mapping for a SPEC without spec_template is RED (the key was removed after mapping)", () => {
  onlyKind({ spec: specText({ legacy: true }) }, "legacy-spec");
});

test("specAcceptanceCriteria reports the kind: absent → feature, test-infra, and null for an invalid value", () => {
  assert.equal(specAcceptanceCriteria(SPEC).kind, "feature");
  assert.equal(specAcceptanceCriteria(specText({ kind: "test-infra" })).kind, "test-infra");
  assert.equal(specAcceptanceCriteria(specText({ kind: "feature" })).kind, "feature");
  assert.equal(specAcceptanceCriteria(specText({ draft: true, kind: "library" })).kind, null);
});

// ── 6.20.7 layout A: the `spec_kind:` line moved from the frontmatter to the body's first line. The pin cannot tell the
// two apart (check-spec.mjs pinHash), so every AC-mode reading refuses layout A instead of reading a mode from it.
/** Move a SPEC's frontmatter `spec_kind:` line to the body's first line, keeping every other byte (and the pin). */
function bodyOpensWithKind(text) {
  const line = text.match(/^spec_kind: .*\n/m)[0];
  const t = text.replace(line, "");
  const end = t.indexOf("\n---\n", 3) + "\n---\n".length;
  return t.slice(0, end) + line + t.slice(end);
}

test("layout A — specAcceptanceCriteria: a templated body opening with `spec_kind:` has kind null (kindInBody); legacy keeps feature", () => {
  const b = specText({ kind: "test-infra" });
  const a = bodyOpensWithKind(b);
  assert.equal(a.match(/^spec_content_hash: (\S+)$/m)[1], b.match(/^spec_content_hash: (\S+)$/m)[1], "the move keeps the pin");
  assert.deepEqual(
    (({ kind, kindInBody }) => ({ kind, kindInBody }))(specAcceptanceCriteria(a)),
    { kind: null, kindInBody: true },
    "layout A: no mode is read from it"
  );
  assert.deepEqual((({ kind, kindInBody }) => ({ kind, kindInBody }))(specAcceptanceCriteria(b)), {
    kind: "test-infra",
    kindInBody: false,
  });
  assert.deepEqual((({ kind, kindInBody }) => ({ kind, kindInBody }))(specAcceptanceCriteria(SPEC)), {
    kind: "feature",
    kindInBody: false,
  });
  const legacyA = bodyOpensWithKind(specText({ legacy: true, kind: "test-infra" }));
  assert.deepEqual((({ templated, kind, kindInBody }) => ({ templated, kind, kindInBody }))(specAcceptanceCriteria(legacyA)), {
    templated: false,
    kind: "feature",
    kindInBody: true,
  });
});

test("layout A — --spec: both moves leave the usable readings (B → A is BOOTSTRAP 4 → UNUSABLE 2; A → B is 2 → 4); legacy stays 3", () => {
  const root = world();
  try {
    const f = (n) => `pharn/features/${NAME}/${n}`;
    const spec = (text) => {
      writeFileSync(join(root, f("SPEC.md")), text);
      return spawnSync(process.execPath, [CHECK, "--spec", f("SPEC.md")], { cwd: root, encoding: "utf8" });
    };
    for (const kind of ["test-infra", "feature"]) {
      const b = specText({ kind });
      const inFm = spec(b);
      assert.equal(inFm.status, kind === "test-infra" ? 4 : 0, inFm.stdout);
      const inBody = spec(bodyOpensWithKind(b));
      assert.equal(inBody.status, 2, inBody.stdout);
      assert.equal(
        inBody.stdout.trim(),
        "UNUSABLE — the SPEC's body opens with a `spec_kind:` line, which the approval pin cannot tell from the frontmatter key — run check-spec.mjs"
      );
    }
    assert.equal(spec(bodyOpensWithKind(specText({ legacy: true, kind: "test-infra" }))).status, 3, "legacy is read before the kind");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("layout A — FULL mode: a mapping for it REDs spec-kind (the layout named) and pin (check-spec REDs it through the shelled chain)", () => {
  const root = world({ spec: bodyOpensWithKind(specText({ kind: "feature" })) });
  try {
    const r = run(root);
    assert.equal(r.code, 1, r.out);
    assert.deepEqual(r.kinds, ["pin", "spec-kind"], r.out);
    assert.match(r.out, /body opens with a `spec_kind:` line/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("spec-kind — in FULL mode a mapping for a `spec_kind: test-infra` SPEC is RED (re-approved, so the pin holds)", () => {
  const spec = specText({ kind: "test-infra" });
  const hash = spec.match(/^spec_content_hash: ([0-9a-f]{64})$/m)[1];
  assert.notEqual(hash, HASH, "the pin covers the kind, so the test-infra SPEC pins differently");
  const r = onlyKind({ spec, ac: acTests({ hash }) }, "spec-kind");
  assert.match(r.out, /bootstrap increment/);
});

test("spec-kind — an INVALID kind REDs as spec-kind, and the pin with it (check-spec's rule 8 fails the shelled chain)", () => {
  const root = world({ spec: specText({ kind: "library" }) });
  try {
    const r = run(root);
    assert.equal(r.code, 1, r.out);
    assert.deepEqual(r.kinds, ["pin", "spec-kind"], r.out);
    assert.match(r.out, /not one of \{feature, test-infra, quick\}/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--spec exit 4 — a test-infra SPEC is BOOTSTRAP with its levels; precedence 2 → 3 → 2 (kind) → 2 (criteria) → 4 → 0 (grill G10)", () => {
  const root = world();
  try {
    const f = (n) => `pharn/features/${NAME}/${n}`;
    const spec = (text) => {
      writeFileSync(join(root, f("SPEC.md")), text);
      return spawnSync(process.execPath, [CHECK, "--spec", f("SPEC.md")], { cwd: root, encoding: "utf8" });
    };
    const b = spec(specText({ kind: "test-infra" }));
    assert.equal(b.status, 4, b.stdout);
    assert.match(b.stdout, /^BOOTSTRAP — spec_kind: test-infra; no AC-TESTS\.md; the lock records levels: e2e, unit$/m);
    assert.equal(spec(specText({ kind: "feature" })).status, 0, "an explicit feature is templated");
    // legacy wins over the kind: a legacy SPEC has no AC ids either way
    assert.equal(spec(specText({ legacy: true, kind: "test-infra" })).status, 3);
    const inv = spec(specText({ kind: "library" }));
    assert.equal(inv.status, 2, inv.stdout);
    assert.match(inv.stdout, /spec_kind/);
    // an invalid kind outranks missing criteria; a test-infra SPEC with no usable criteria is unusable, not bootstrap
    const noAc = (k) => specText({ draft: true, kind: k }).replace(/## Acceptance Criteria[\s\S]*?(?=\n## )/, "");
    assert.match(spec(noAc("library")).stdout, /spec_kind/);
    assert.equal(spec(noAc("test-infra")).status, 2);
    const badLevel = specText({ draft: true, kind: "test-infra" }).replace("  - verify: e2e\n", "  - verify: smoke\n");
    const bl = spec(badLevel);
    assert.equal(bl.status, 2, bl.stdout);
    assert.match(bl.stdout, /verify level is malformed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── quick (6.25.0): a spec_kind: quick SPEC is TEST_FIRST_KINDS, exactly like feature ──────────────────

/** A genuinely valid `spec_kind: quick` SPEC (unlike `specText({kind:"quick"})`, which keeps the shared
 *  fixture's e2e AC-2 and would RED spec-template-core's own quick rule 9 under a full validate — this
 *  checker's `--spec`/mapping logic does not run rule 9 itself, but the SHELLED `check-plan-spec-agree.mjs`
 *  chain check does, via `check-spec-approved.mjs`, so a quick fixture used across the chain must satisfy it). */
function quickSpecText() {
  const t = specText({ draft: true, kind: "quick" }).replace("  - verify: e2e\n", "  - verify: integration\n");
  const tmp = mkdtempSync(join(tmpdir(), "act-quick-spec-"));
  try {
    writeFileSync(join(tmp, "SPEC.md"), t);
    const hash = spawnSync(process.execPath, [CHECK_SPEC, "--hash", join(tmp, "SPEC.md")], { encoding: "utf8" }).stdout.trim();
    return t.replace("state: Draft", "state: Approved").replace('spec_content_hash: ""', `spec_content_hash: ${hash}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test("--spec: a quick SPEC is TEMPLATED (0), exactly like feature", () => {
  const root = world();
  try {
    const f = (n) => `pharn/features/${NAME}/${n}`;
    writeFileSync(join(root, f("SPEC.md")), specText({ kind: "quick" }));
    const r = spawnSync(process.execPath, [CHECK, "--spec", f("SPEC.md")], { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /^TEMPLATED — /);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("full mode: a valid mapping over a quick SPEC is GREEN, exactly as for a feature SPEC", () => {
  const quickSpec = quickSpecText();
  const quickHash = quickSpec.match(/^spec_content_hash: ([0-9a-f]{64})$/m)[1];
  const root = world({
    spec: quickSpec,
    ac: acTests({
      hash: quickHash,
      mapping: [`- AC-1 | unit | \`${UNIT}\` | src/demo.js#reset(): void`, `- AC-2 | integration | \`${E2E}\` | src/demo.js#send(): void`],
    }),
    plan: planText().replace(HASH, quickHash),
  });
  try {
    const r = run(root);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^GREEN — /);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("full mode: a quick SPEC's mapping is checked the SAME WAY a feature SPEC's is — level-mismatch still fires", () => {
  const quickSpec = quickSpecText();
  const quickHash = quickSpec.match(/^spec_content_hash: ([0-9a-f]{64})$/m)[1];
  onlyKind(
    {
      spec: quickSpec,
      ac: acTests({ hash: quickHash, mapping: [`- AC-1 | integration | \`${UNIT}\` | x`, `- AC-2 | integration | \`${E2E}\` | y`] }),
      plan: planText().replace(HASH, quickHash),
    },
    "level-mismatch"
  );
});

test("✧ L35 — specVerdict IS the --spec reading: the CLI prints its line and exits its code, for every token", () => {
  const root = world();
  try {
    const path = join(root, "pharn", "features", NAME, "SPEC.md");
    const seen = new Set();
    for (const text of [
      SPEC,
      specText({ legacy: true }),
      specText({ kind: "test-infra" }),
      specText({ kind: "library" }),
      bodyOpensWithKind(specText({ kind: "test-infra" })),
    ]) {
      writeFileSync(path, text);
      const v = specVerdict(text);
      const r = spawnSync(process.execPath, [CHECK, "--spec", path], { encoding: "utf8" });
      assert.equal(r.status, v.code, v.line);
      assert.equal(r.stdout.trim(), v.line);
      seen.add(v.token);
    }
    assert.deepEqual([...seen].sort(), ["BOOTSTRAP", "LEGACY", "TEMPLATED", "UNUSABLE"], "every token was exercised");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--spec mode decides templated vs legacy BEFORE any mapping exists: 0 / 3 / 2", () => {
  const root = world();
  try {
    const f = (n) => `pharn/features/${NAME}/${n}`;
    const spec = (text) => {
      writeFileSync(join(root, f("SPEC.md")), text);
      return spawnSync(process.execPath, [CHECK, "--spec", f("SPEC.md")], { cwd: root, encoding: "utf8" });
    };
    const t = spec(SPEC);
    assert.equal(t.status, 0, t.stdout);
    assert.match(t.stdout, /TEMPLATED — 2 AC\(s\): AC-1 \(unit\), AC-2 \(e2e\)/);
    assert.equal(spec(specText({ legacy: true })).status, 3);
    assert.equal(spec(SPEC + "\n## Acceptance Criteria\n\n- **AC-3** Given a When b Then c\n  - verify: unit\n").status, 2);
    assert.equal(spawnSync(process.execPath, [CHECK, "--spec", "nope.md"], { cwd: root }).status, 2);
    assert.equal(spawnSync(process.execPath, [CHECK, "--spec"], { cwd: root }).status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("pin — a stale spec_content_hash, and a Draft SPEC (the shelled chain refuses both)", () => {
  onlyKind({ ac: acTests({ hash: "0".repeat(64) }) }, "pin");
  onlyKind({ spec: specText({ draft: true }) }, "pin");
});

test("malformed-line — a line under ## Mapping outside the grammar", () => {
  const rows = [`- AC-1 | unit | \`${UNIT}\` | t`, `- AC-2 | e2e | \`${E2E}\` | t`, "- AC-1 unit tests/x.js"];
  onlyKind({ ac: acTests({ mapping: rows }) }, "malformed-line");
});

test("missing-ac — a SPEC AC with no line (its file removed too, so nothing else trips)", () => {
  onlyKind({ ac: acTests({ files: [UNIT], mapping: [`- AC-1 | unit | \`${UNIT}\` | t`] }) }, "missing-ac");
});

test("duplicate-ac — the same AC mapped twice", () => {
  const rows = [`- AC-1 | unit | \`${UNIT}\` | t`, `- AC-1 | unit | \`${UNIT}\` | u`, `- AC-2 | e2e | \`${E2E}\` | t`];
  onlyKind({ ac: acTests({ mapping: rows }) }, "duplicate-ac");
});

test("unknown-ac — a mapped id the SPEC does not have", () => {
  const rows = [`- AC-1 | unit | \`${UNIT}\` | t`, `- AC-2 | e2e | \`${E2E}\` | t`, `- AC-9 | unit | \`${UNIT}\` | t`];
  onlyKind({ ac: acTests({ mapping: rows }) }, "unknown-ac");
});

test("level-mismatch — AC-2 mapped at unit where the SPEC says e2e", () => {
  const rows = [`- AC-1 | unit | \`${UNIT}\` | t`, `- AC-2 | unit | \`${E2E}\` | t`];
  onlyKind({ ac: acTests({ mapping: rows }) }, "level-mismatch");
});

test("unlisted-file — a mapped file missing from ## Files", () => {
  onlyKind({ ac: acTests({ files: [UNIT] }) }, "unlisted-file");
});

test("unmapped-file — a ## Files entry no line maps", () => {
  onlyKind({ ac: acTests({ files: [UNIT, E2E, "tests/ac/helper.js"] }) }, "unmapped-file");
});

test("in-plan-files — a test file in PLAN.md ## Files, where the build would be scoped to it", () => {
  onlyKind({ plan: planText(["src/demo.js", UNIT]) }, "in-plan-files");
});

test("in-plan-files compares what the SETTER scopes: a `(gated)` annotation and a case variant are both caught", () => {
  // The review's blocking probe: the setter strips ` (gated)` and APFS folds case, so both would let the build write
  // the AC test while a raw string compare passed.
  onlyKind({ plan: planText(["src/demo.js", `${UNIT} (gated)`]) }, "in-plan-files");
  onlyKind({ plan: planText(["src/demo.js", UNIT.replace("tests/", "Tests/")]) }, "in-plan-files");
  // Control: a DIFFERENT file with a parenthesised name is not the AC test file.
  const root = world({ plan: planText(["src/demo.js", "src/demo(unit).js"]) });
  try {
    assert.equal(run(root).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("claimed-elsewhere — another feature's AC-TESTS.md already owns the file (default --features-dir, L41)", () => {
  const other = acTests({ files: [E2E], mapping: [] }).replace(`spec_id: ${NAME}`, "spec_id: other");
  const r = onlyKind({ others: { other } }, "claimed-elsewhere");
  assert.match(r.out, /feature "other"/);
});

test("claimed-elsewhere honours an explicit --features-dir, and a dir outside it is not consulted", () => {
  const other = acTests({ files: [E2E], mapping: [] });
  const root = world({ others: { other } });
  const empty = mkdtempSync(join(tmpdir(), "act-empty-"));
  try {
    assert.equal(run(root, ["--features-dir", empty]).code, 0, "a features dir with no other feature cannot claim the file");
    assert.deepEqual(run(root, ["--features-dir", join(root, "pharn", "features")]).kinds, ["claimed-elsewhere"]);
    assert.equal(run(root, ["--features-dir"]).code, 2, "a flag with no value is unusable, never a guess");
    assert.equal(
      run(root, ["--features-dir", join(root, "no-such-dir")]).code,
      2,
      "a missing features dir would make claimed-elsewhere vacuous"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  }
});

test("bad-path — every rejected shape (L52), each listed AND mapped so nothing else trips", () => {
  for (const p of [
    "tests/<x>.js",
    "tests/*.js",
    "/abs/x.test.js",
    "./tests/x.test.js",
    "tests/../x.test.js",
    "tests//x.test.js",
    "tests/dir/",
    ".pharn/x.test.js",
    "pharn/features/demo/x.test.js",
    // grill G4: the red run hands mapped files to a runner as argv, and `--` stops npm's parsing, not the runner's
    "-u",
    "--config=evil.js",
  ]) {
    const rows = [`- AC-1 | unit | \`${p}\` | t`, `- AC-2 | e2e | \`${E2E}\` | t`];
    onlyKind({ ac: acTests({ files: [p, E2E], mapping: rows }) }, "bad-path");
  }
  assert.equal(badPath("tests/ac/x.test.js"), null, "control: a plain repo-relative path is fine");
});

test("no-files — no ## Files list (it cannot be isolated: every mapped file is then also unlisted)", () => {
  const root = world({ ac: acTests().replace(/## Files\n\n(- .*\n)+/, "") });
  try {
    const r = run(root);
    assert.equal(r.code, 1);
    assert.ok(r.kinds.includes("no-files"), r.out);
    assert.deepEqual(r.kinds, ["no-files", "unlisted-file"]);
    REACHED.add("no-files");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing ## Mapping section is malformed-line; a SPEC whose AC section is duplicated is refused, never read as 'nothing to map'", () => {
  const noMap = cm({
    acTestsText: acTests().replace(/## Mapping[\s\S]*$/, ""),
    specText: SPEC,
    planText: planText(),
    others: [],
  });
  assert.ok(noMap.findings.some((f) => f.kind === "malformed-line"));
  const dup = SPEC + "\n## Acceptance Criteria\n\n- **AC-3** Given a When b Then c\n  - verify: unit\n";
  const r = cm({ acTestsText: acTests(), specText: dup, planText: planText(), others: [] });
  assert.ok(r.findings.some((f) => f.kind === "missing-ac" && /absent, duplicated or empty/.test(f.detail)));
});

test("a second ## Mapping section is malformed-line (only one is read)", () => {
  onlyKind({ ac: acTests() + "\n## Mapping\n\n- AC-1 | unit | `x.js` | t\n" }, "malformed-line");
});

test("unusable input → exit 2: a missing file, and bad usage", () => {
  const root = world();
  try {
    rmSync(join(root, "pharn", "features", NAME, "PLAN.md"));
    assert.equal(run(root).code, 2);
    assert.equal(spawnSync(process.execPath, [CHECK], { cwd: root }).status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the mapping grammar: MAPPING_RE and mappingOf over every level (L52), stopping at the next heading", () => {
  for (const level of LEVELS) assert.match(`- AC-1 | ${level} | \`t.js\` | x`, MAPPING_RE);
  for (const bad of [
    "- AC-01 | unit | `t.js` | x",
    "- AC-1 | smoke | `t.js` | x",
    "- AC-1 | unit | t.js | x",
    "- AC-1 | unit | `t.js` |",
  ]) {
    assert.doesNotMatch(bad, MAPPING_RE, bad);
  }
  const m = mappingOf("## Mapping\n\n- AC-1 | unit | `a.js` | x\n\n## Next\n- AC-2 | unit | `b.js` | y\n");
  assert.deepEqual(
    m.rows.map((r) => r.id),
    ["AC-1"]
  );
  assert.deepEqual(mappingOf("no section"), { present: false, rows: [], malformed: [], extraSections: 0 });
});

// ---------------------------------------------------------------------------------------------------
// ★ HOOK — the property `in-plan-files` protects, through the REAL setter and pre-write guard.
// ---------------------------------------------------------------------------------------------------

test("★ HOOK — a build scoped --from-plan PLAN.md is DENIED a Write to an AC test file; --from-plan AC-TESTS.md allows it", () => {
  const root = world();
  try {
    execFileSync("git", ["init", "-q", "."], { cwd: root });
    const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
    const setScope = (file) =>
      assert.equal(spawnSync(process.execPath, [SETTER, "--from-plan", `pharn/features/${NAME}/${file}`], { cwd: root, env }).status, 0);
    const write = (p) =>
      spawnSync(process.execPath, [ENFORCER], {
        cwd: root,
        env,
        input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(root, p) } }),
        encoding: "utf8",
      }).status;
    setScope("PLAN.md"); // the build's scope (pharn-build.md Step 0)
    assert.equal(write(UNIT), 2, "the build was allowed to write an AC test file");
    assert.equal(write("src/demo.js"), 0, "control: the build may write its own file");
    setScope("AC-TESTS.md"); // /pharn-test's scope
    assert.equal(write(UNIT), 0, "/pharn-test was denied its own test file");
    assert.equal(write("src/demo.js"), 2, "/pharn-test was allowed an implementation file");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── 6.21.0: the test infrastructure /pharn-test pins stays out of PLAN.md's `## Files` ─────────────────────────────

const infraKinds = (r) => [...new Set(r.findings.map((f) => f.kind))].sort();

test("test-infra-in-plan — a root runner config in PLAN.md `## Files` (the review's repro: vite.config.ts, then the build edits it)", () => {
  const r = onlyKind({ plan: planText(["src/demo.js", "vite.config.ts"]) }, "test-infra-in-plan");
  assert.match(r.out, /names "vite\.config\.ts", a root runner config \/pharn-test pins before the build/);
  assert.match(r.out, /`spec_kind: test-infra` increment first \(via \/pharn-ship\)/, "the remedy is named");
  // Every spelling the setter would scope to the root file is caught — the ones the ★ HOOK test below proves open it.
  for (const spelling of ["Vite.config.ts", "vite.config.ts (new alias)", "jest.config.cjs", "VITEST.WORKSPACE.JSON"]) {
    onlyKind({ plan: planText(["src/demo.js", spelling]) }, "test-infra-in-plan");
  }
});

test("test-infra-in-plan is NOT raised for an entry that cannot reach the root config: nested, `./`-led, glob, placeholder", () => {
  for (const entry of ["web/vite.config.ts", "./vite.config.ts", "*.config.ts", "<runner config>", "tsconfig.json"]) {
    const r = cm({ acTestsText: acTests(), specText: SPEC, planText: planText(["src/demo.js", entry]), others: [] });
    assert.deepEqual(infraKinds(r), [], JSON.stringify(entry));
    assert.deepEqual(r.notes, [], JSON.stringify(entry));
  }
});

test("NOTE, never a RED — package.json / pharn.config.json in PLAN.md stay exit 0, with one advisory NOTE each", () => {
  for (const manifest of ["package.json", "pharn.config.json", "Package.json (add a dependency)"]) {
    const root = world({ plan: planText(["src/demo.js", manifest]) });
    try {
      const r = run(root);
      assert.equal(r.code, 0, r.out);
      assert.deepEqual(r.kinds, []);
      const notes = r.out.split("\n").filter((l) => l.startsWith("NOTE — "));
      assert.equal(notes.length, 1, r.out);
      assert.match(notes[0], /the build may change it \(a dependency, say\), but not the level gates' scripts/);
      assert.match(notes[0], /ADVISORY: this checker cannot see which part the build will change\./);
      assert.match(r.out, /^GREEN — /m);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  // On the RED path the NOTE prints too, and the exit code is the RED's own.
  const root = world({ plan: planText(["src/demo.js", "vite.config.ts", "package.json"]) });
  try {
    const r = run(root);
    assert.equal(r.code, 1);
    assert.deepEqual(r.kinds, ["test-infra-in-plan"]);
    assert.equal(r.out.split("\n").filter((l) => l.startsWith("NOTE — ")).length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a bootstrap (`spec_kind: test-infra`) SPEC is the REMEDY, so its PLAN may name the config: checkMapping never reaches the check", () => {
  const spec = specText({ kind: "test-infra" });
  const r = cm({ acTestsText: acTests(), specText: spec, planText: planText(["vite.config.ts", "package.json"]), others: [] });
  assert.deepEqual(infraKinds(r), ["spec-kind"], "only the mapping-for-a-bootstrap RED, never test-infra-in-plan");
  assert.deepEqual(r.notes, []);
});

// The six PLAN spellings the plan-time probe measured (PLAN.md D2), each run through the REAL setter and write guard:
// the kind fires for exactly the rows whose scope opens a root runner config to the build. The write targets are the
// two root spellings; on APFS `Vite.config.ts` IS the existing `vite.config.ts` (why the name is matched folded). The
// set is the probed one — it does not certify every possible spelling (L37).
const HOOK_ROWS = [
  ["vite.config.ts", true],
  ["vite.config.ts (new alias)", true],
  ["Vite.config.ts", true],
  ["./vite.config.ts", false],
  ["*.config.ts", false],
  ["web/vite.config.ts", false],
];

test("★ HOOK — the RED is load-bearing: over the six probed spellings it fires exactly when the build could write a root config", () => {
  for (const [entry, opens] of HOOK_ROWS) {
    const root = world({ plan: planText(["src/demo.js", entry]) });
    try {
      execFileSync("git", ["init", "-q", "."], { cwd: root });
      const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
      assert.equal(spawnSync(process.execPath, [SETTER, "--from-plan", `pharn/features/${NAME}/PLAN.md`], { cwd: root, env }).status, 0);
      const writable = ["vite.config.ts", "Vite.config.ts"].filter(
        (target) =>
          spawnSync(process.execPath, [ENFORCER], {
            cwd: root,
            env,
            input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(root, target) } }),
            encoding: "utf8",
          }).status === 0
      );
      assert.equal(
        writable.length > 0,
        opens,
        `${entry}: the build's Write to a root config spelling (allowed: ${JSON.stringify(writable)})`
      );
      assert.equal(
        infraKinds(cm({ acTestsText: acTests(), specText: SPEC, planText: planText(["src/demo.js", entry]), others: [] })).includes(
          "test-infra-in-plan"
        ),
        opens,
        `${entry}: the kind fires exactly when the build could write a root config`
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

// ── 6.30.0 (H2): the build may be scoped neither to what it is judged by, nor to what the level gates run ───────────

const LOCK = `pharn/features/${NAME}/${LOCK_NAME}`;
const MAPPING = `pharn/features/${NAME}/AC-TESTS.md`;
const REPORTER = "tools/pharn-reporter.mjs";
/** A project whose `test` gate names a pharn-json reporter (the review's wB), with a chained script naming another file. */
const REPORTER_FILES = {
  "package.json": JSON.stringify({
    scripts: { test: `vitest run --reporter=./${REPORTER} && npm run test:setup`, "test:setup": "node tools/setup.mjs", lint: "eslint ." },
  }),
  [REPORTER]: "export default class Reporter {}\n",
};

test("ac-artifact-in-plan — THIS feature's lock or AC-TESTS.md in PLAN.md `## Files` (the review's H2: the build re-pinned its own change)", () => {
  const r = onlyKind({ plan: planText(["src/demo.js", LOCK]) }, "ac-artifact-in-plan");
  assert.match(r.out, /names "pharn\/features\/demo\/AC-TESTS\.lock\.json", this feature's "AC-TESTS\.lock\.json"/);
  assert.match(r.out, /the build may never be scoped to it; drop the entry/);
  onlyKind({ plan: planText(["src/demo.js", MAPPING]) }, "ac-artifact-in-plan");
  // every spelling the setter scopes to either file is RED — the fold over-reports a case variant the guard would deny
  for (const spelling of [`${LOCK} (re-pinned)`, `pharn/features/Demo/ac-tests.lock.json`, `${MAPPING} (mapping)`]) {
    onlyKind({ plan: planText(["src/demo.js", spelling]) }, "ac-artifact-in-plan");
  }
  // CONTROLS: spellings that open nothing to the build, and another feature's pair (this feature's pair only, P7)
  for (const entry of [
    `./${LOCK}`,
    "pharn/features/*/AC-TESTS.lock.json",
    "pharn/features/other/AC-TESTS.lock.json",
    "pharn/features/other/AC-TESTS.md",
  ]) {
    const g = cm({ acTestsText: acTests(), specText: SPEC, planText: planText(["src/demo.js", entry]), others: [] });
    assert.deepEqual(infraKinds(g), [], JSON.stringify(entry));
  }
});

test("ac-artifact-in-plan: the pair is spelled relative to the invoking directory — the root the setter resolves entries against", () => {
  const root = world();
  try {
    assert.deepEqual(ownArtifacts(MAPPING, root), [MAPPING, LOCK]);
    assert.deepEqual(ownArtifacts(`./${MAPPING}`, root), [MAPPING, LOCK], "a ./-led argv");
    assert.deepEqual(ownArtifacts(join(root, MAPPING), root), [MAPPING, LOCK], "an absolute argv inside the root");
    assert.deepEqual(ownArtifacts("AC-TESTS.md", join(root, "pharn", "features", NAME)), ["AC-TESTS.md", LOCK_NAME]);
    assert.deepEqual(
      ownArtifacts(`features/${NAME}/AC-TESTS.md`, join(root, "pharn")),
      [`features/${NAME}/AC-TESTS.md`, `features/${NAME}/${LOCK_NAME}`],
      "from a subdirectory, as that directory spells it"
    );
    assert.ok(
      ownArtifacts(join(root, MAPPING), join(root, "..")).every((p) => !p.startsWith("..")),
      "from a parent directory"
    );
    mkdirSync(join(root, "elsewhere"));
    assert.deepEqual(
      ownArtifacts(join(root, MAPPING), join(root, "elsewhere")),
      [`../${MAPPING}`, `../${LOCK}`],
      "a mapping outside the invoking directory: `..`-led, which no setter scope entry opens"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("✧ LOCK_NAME parity: check-ac-tests.mjs spells the lock exactly as ac-tests-lock.mjs does, without importing it", () => {
  assert.equal(LOCK_NAME, LOCK_SCRIPT_NAME);
  assert.doesNotMatch(readFileSync(CHECK, "utf8"), /from "\.\/ac-tests-lock\.mjs"/, "the mapping checker's load graph stays small");
});

test("checkMapping's 6.30.0 inputs are REQUIRED (L41): an omitted one would silently switch its RED off", () => {
  const base = { acTestsText: acTests(), specText: SPEC, planText: planText(), others: [] };
  assert.throws(() => checkMapping({ ...base, scriptFiles: [] }), /acArtifacts/);
  assert.throws(() => checkMapping({ ...base, acArtifacts: ART }), /scriptFiles/);
  assert.throws(() => checkMapping({ ...base, acArtifacts: "x", scriptFiles: [] }), /acArtifacts/);
  assert.throws(() => checkMapping({ ...base, acArtifacts: ART, scriptFiles: [1] }), /scriptFiles/);
  assert.deepEqual(checkMapping({ ...base, acArtifacts: ART, scriptFiles: [] }).findings, [], "control");
});

test("test-infra-in-plan — a file a level gate's script NAMES (the review's wB: the build wrote the reporter), absent ones too", () => {
  const r = onlyKind({ plan: planText(["src/demo.js", REPORTER]), files: REPORTER_FILES }, "test-infra-in-plan");
  assert.match(r.out, /names "tools\/pharn-reporter\.mjs", a file a level gate's script names \("tools\/pharn-reporter\.mjs"\)/);
  assert.match(r.out, /`spec_kind: test-infra` increment first \(via \/pharn-ship\)/, "the remedy is named");
  for (const spelling of [`${REPORTER} (new hook)`, "Tools/Pharn-Reporter.mjs", "tools/setup.mjs"]) {
    onlyKind({ plan: planText(["src/demo.js", spelling]), files: REPORTER_FILES }, "test-infra-in-plan");
  }
  // CONTROLS: a `./`-led spelling opens nothing; a file no level gate's script reaches; the same plan with no package.json
  for (const [entry, files] of [
    [`./${REPORTER}`, REPORTER_FILES],
    ["tools/other.mjs", REPORTER_FILES],
    [REPORTER, {}],
  ]) {
    const root = world({ plan: planText(["src/demo.js", entry]), files });
    try {
      const g = run(root);
      assert.equal(g.code, 0, `${entry}: ${g.out}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("test-infra-in-plan — a root package-manager config (.npmrc: its script-shell runs every `npm run <gate>`)", () => {
  const r = onlyKind({ plan: planText(["src/demo.js", ".npmrc"]) }, "test-infra-in-plan");
  assert.match(r.out, /names "\.npmrc", a root package-manager config \/pharn-test pins before the build/);
  onlyKind({ plan: planText(["src/demo.js", ".yarnrc.yml"]) }, "test-infra-in-plan");
});

test("a tree the pin cannot read is a NOTE at plan time, never a silent GREEN — /pharn-test's lock refuses the same tree", () => {
  const root = world({ plan: planText(["src/demo.js", REPORTER]), files: { "package.json": "{ not json" } });
  try {
    const r = run(root);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^NOTE — the files the level gates' scripts name could not be read \(package\.json is not valid JSON/m);
    assert.match(r.out, /none was checked against PLAN\.md `## Files`; \/pharn-test's lock refuses the same tree/);
    // the GREEN line claims only what was checked (P0): it says the named files were NOT checked, never "none named"
    assert.match(r.out, /^GREEN — .*\(the files a level gate's script names NOT checked — see the NOTE\)/m);
    assert.doesNotMatch(r.out, /no file a level gate's script names/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  // control: over a readable tree the GREEN line does make the claim
  const ok = world({ files: REPORTER_FILES });
  try {
    const g = run(ok);
    assert.equal(g.code, 0, g.out);
    assert.match(g.out, /^GREEN — .*no file a level gate's script names, and neither this feature's AC-TESTS\.md nor its lock/m);
  } finally {
    rmSync(ok, { recursive: true, force: true });
  }
});

/** Through the REAL setter and write guard: set the build's scope from PLAN.md, then ask which targets it may write. */
function buildScopeAllows(root, targets) {
  execFileSync("git", ["init", "-q", "."], { cwd: root });
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  assert.equal(spawnSync(process.execPath, [SETTER, "--from-plan", `pharn/features/${NAME}/PLAN.md`], { cwd: root, env }).status, 0);
  return targets.filter(
    (target) =>
      spawnSync(process.execPath, [ENFORCER], {
        cwd: root,
        env,
        input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(root, target) } }),
        encoding: "utf8",
      }).status === 0
  );
}

/** Probe the volume `dir` is on: does a case variant of an existing name reach that same file? APFS and HFS+ by
 *  default: yes. ext4 (CI's Linux) and a case-sensitive APFS volume: no. */
function caseInsensitiveVolume(dir = tmpdir()) {
  const probe = mkdtempSync(join(dir, "act-case-probe-"));
  try {
    writeFileSync(join(probe, "case-probe"), "");
    return existsSync(join(probe, "CASE-PROBE"));
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
}

// The PLAN spellings the plan-time probe measured (PLAN.md A1/A2), through the REAL setter and write guard, with the
// files ON DISK as they are at build time (the lock and the reporter exist). Two facts per row, kept apart because only
// one of them depends on the filesystem:
//   `opens` — the build may write a file it is JUDGED BY (the lock, AC-TESTS.md, the reporter), decided by file
//     identity (same dev + inode), never by spelling. It is the same on every filesystem: only the exact and the
//     annotated spellings open one. On a case-insensitive volume the guard judges an existing file at its on-disk
//     spelling, so a case variant is denied; on a case-sensitive one the variant is a different, new file, which the
//     guard allows and which opens nothing.
//   `probed` — the row's RAW measurement (does the guard allow any listed spelling at all?) depends on the volume.
//     THESE ROWS DEPEND ON THE PROBE: the four case variants — allowed on a case-sensitive volume (their own new file),
//     denied on a case-insensitive one. Every other row reads the same on both (measured on APFS and on a case-
//     sensitive APFS image; CI's ext4 is the case-sensitive branch).
// `isRed` does not depend on the probe: the fold is deliberately fail-closed, so a case variant is RED on both — an
// over-report on a case-sensitive volume, where it opens nothing. What the test holds is "every spelling that opens
// is RED", plus the table itself (L37 — the probed set, never every spelling).
const ARTIFACT_HOOK_ROWS = [
  // [entry, opens, isRed, probed]
  [LOCK, true, true, false],
  [`${LOCK} (pinned)`, true, true, false],
  ["pharn/features/demo/ac-tests.lock.json", false, true, true],
  ["pharn/features/Demo/AC-TESTS.lock.json", false, true, true],
  [`./${LOCK}`, false, false, false],
  ["pharn/features/*/AC-TESTS.lock.json", false, false, false],
  [MAPPING, true, true, false],
  [REPORTER, true, true, false],
  [`${REPORTER} (x)`, true, true, false],
  ["Tools/pharn-reporter.mjs", false, true, true],
  ["tools/Pharn-Reporter.mjs", false, true, true],
  [`./${REPORTER}`, false, false, false],
];
/** The files the build is judged by, and every spelling the rows' guard is asked about. */
const JUDGED = [LOCK, MAPPING, REPORTER];
const ARTIFACT_TARGETS = [...JUDGED, ...ARTIFACT_HOOK_ROWS.filter((row) => row[3]).map((row) => row[0])];

/** The raw measurement a row must read on a volume: a spelling the guard allows exists iff the row opens a judged
 *  file, or it is a case variant on a case-sensitive volume (a new file of its own). Pure, so both branches are
 *  exercised whatever volume the suite runs on. */
const expectWritable = ([, opens, , probed], caseInsensitive) => opens || (probed && !caseInsensitive);

/** Which of `targets` are, on disk, the same file as one of `JUDGED` (identity, never spelling). It discriminates only
 *  on a case-sensitive volume, where the guard allows a variant that is not the judged file; on a case-insensitive one
 *  the guard already denies every variant, so a spelling fold would read the same (mutation-checked on both). */
function judgedAmong(root, targets) {
  const ids = JUDGED.map((p) => statSync(join(root, p))).map((s) => `${s.dev}:${s.ino}`);
  return targets.filter((t) => {
    const s = statSync(join(root, t), { throwIfNoEntry: false });
    return s !== undefined && ids.includes(`${s.dev}:${s.ino}`);
  });
}

test("the probe-dependent rows: only the case variants' raw reading moves with the volume, and on neither does one open a judged file", () => {
  // Both probe results, injected, so the case-sensitive branch is exercised on APFS and the case-insensitive one on ext4.
  for (const row of ARTIFACT_HOOK_ROWS) {
    const [entry, opens, isRed, probed] = row;
    const folds = JUDGED.some((j) => j !== entry && j.toLowerCase() === entry.toLowerCase());
    assert.equal(probed, folds, `${entry}: a row depends on the probe exactly when it is a case variant of a judged file`);
    assert.equal(expectWritable(row, true), opens, `${entry}: on a case-insensitive volume the raw reading IS \`opens\``);
    assert.equal(expectWritable(row, false), opens || probed, `${entry}: on a case-sensitive volume a variant is its own file`);
    if (probed) assert.ok(isRed && !opens, `${entry}: a case variant opens nothing on either volume and stays RED (fail-closed)`);
  }
});

test("★ HOOK — every PLAN spelling that opens the lock, AC-TESTS.md or a script-named reporter to the build is RED (measured table)", () => {
  const caseInsensitive = caseInsensitiveVolume();
  for (const row of ARTIFACT_HOOK_ROWS) {
    const [entry, opens, isRed] = row;
    const root = world({ plan: planText(["src/demo.js", entry]), files: { ...REPORTER_FILES, [LOCK]: "{}\n" } });
    try {
      assert.equal(caseInsensitiveVolume(root), caseInsensitive, "the probe and the world are on one volume");
      const writable = buildScopeAllows(root, ARTIFACT_TARGETS);
      const on = caseInsensitive ? "case-insensitive" : "case-sensitive";
      assert.equal(
        writable.length > 0,
        expectWritable(row, caseInsensitive),
        `${entry} (${on} volume): measured — the build may write ${JSON.stringify(writable)}`
      );
      const judged = judgedAmong(root, writable);
      assert.equal(judged.length > 0, opens, `${entry} (${on} volume): the judged files the build may write: ${JSON.stringify(judged)}`);
      const r = run(root);
      const red = r.kinds.includes("ac-artifact-in-plan") || r.kinds.includes("test-infra-in-plan");
      assert.equal(red, isRed, `${entry}: ${r.out}`);
      if (opens) assert.ok(red, `${entry} opens a file the build is judged by, and is NOT RED`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("★ HOOK composed — package.json stays an advisory NOTE: with the lock out of scope, a script edit the build may make is `--check` RED", () => {
  const LOCK_CLI = join(HERE, "ac-tests-lock.mjs");
  const files = {
    "package.json": JSON.stringify({ scripts: { test: "vitest run" } }),
    [UNIT]: 'test("AC-1: x", () => {});\n',
    [E2E]: 'test("AC-2: y", () => {});\n',
  };
  // a GREEN plan naming package.json: exit 0 with its NOTE
  let root = world({ plan: planText(["src/demo.js", "package.json"]), files });
  try {
    const g = run(root);
    assert.equal(g.code, 0, g.out);
    assert.match(g.out, /^NOTE — PLAN\.md `## Files` names "package\.json"/m);
    const w = spawnSync(process.execPath, [LOCK_CLI, "--write", NAME], { cwd: root, encoding: "utf8" });
    assert.equal(w.status, 0, w.stdout);
    // the build's scope: package.json writable, the lock and AC-TESTS.md not
    assert.deepEqual(buildScopeAllows(root, ["package.json", LOCK, MAPPING]), ["package.json"]);
    // the build edits the test script (in scope) — the pin, unwritable to it, names the change
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run --passWithNoTests" } }));
    const c = spawnSync(process.execPath, [LOCK_CLI, "--check", NAME], { cwd: root, encoding: "utf8" });
    assert.equal(c.status, 1, c.stdout);
    assert.match(c.stdout, /test infrastructure changed — gate test: its package\.json script changed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  // CONTROL: the same plan naming the lock too — the checker REDs it, and the guard WOULD have let the build write it
  root = world({ plan: planText(["src/demo.js", "package.json", LOCK]), files: { ...files, [LOCK]: "{}\n" } });
  try {
    assert.deepEqual(run(root).kinds, ["ac-artifact-in-plan"]);
    assert.deepEqual(buildScopeAllows(root, ["package.json", LOCK]), ["package.json", LOCK]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------------
// Closure (L36): every kind literal the checker emits is a member, and every member was reached above.
// ---------------------------------------------------------------------------------------------------

test("✧ L36 CLOSURE — every kind literal in check-ac-tests.mjs is a KINDS member", () => {
  const src = readFileSync(CHECK, "utf8");
  const found = new Set([...src.matchAll(/\bred\("([a-z-]+)"/g)].map((m) => m[1]));
  found.add("pin");
  assert.ok(found.size > 5);
  assert.deepEqual(
    [...found].filter((k) => !KINDS.includes(k)),
    []
  );
  assert.deepEqual([...KINDS].sort(), [...KINDS], "KINDS is sorted");
});

test("✧ L36 REVERSE CLOSURE — every KINDS member was reached by a test in this file", () => {
  assert.deepEqual(
    KINDS.filter((k) => !REACHED.has(k)),
    []
  );
});

// ── 6.20.5: every consumer gets the path the setter scoped; the fold is the write guard's ─────────────────────────

const kindsOf = (r) => [...new Set(r.findings.map((f) => f.kind))].sort();
const mapRows = (unitCell) => [`- AC-1 | unit | \`${unitCell}\` | src/demo.js#reset()`, `- AC-2 | e2e | \`${E2E}\` | /reset — "Reset"`];

test("6.20.5: a mapping cell that differs from its `## Files` entry only by case is unlisted-file, naming the entry to copy", () => {
  const cell = "tests/ac/Demo.unit.test.js";
  const r = cm({ acTestsText: acTests({ mapping: mapRows(cell) }), specText: SPEC, planText: planText(), others: [] });
  assert.deepEqual(kindsOf(r), ["unlisted-file", "unmapped-file"]);
  assert.match(
    r.findings.find((f) => f.kind === "unlisted-file").detail,
    /entry "tests\/ac\/demo\.unit\.test\.js" only in letter case or Unicode form — spell the cell byte-for-byte/
  );
  // Why it matters: the consumers read the cell VERBATIM, so this cell could never match the file the setter scoped.
  assert.equal(acRowsOf(acTests({ mapping: mapRows(cell) })).rows[0].file, cell);
  // Control: the exact spelling is GREEN.
  assert.deepEqual(kindsOf(cm({ acTestsText: acTests(), specText: SPEC, planText: planText(), others: [] })), []);
});

test("6.20.5: a mapping cell with whitespace at its edge is malformed-line, and reaches no consumer", () => {
  const text = acTests({ mapping: mapRows(`${UNIT} `) });
  assert.doesNotMatch(`- AC-1 | unit | \`${UNIT} \` | x`, MAPPING_RE, "a trailing space inside the back-ticks");
  assert.doesNotMatch(`- AC-1 | unit | \` ${UNIT}\` | x`, MAPPING_RE, "a leading one (refused before 6.20.5 too)");
  assert.match(`- AC-1 | unit | \`${UNIT}\` | x`, MAPPING_RE, "control");
  assert.match("- AC-1 | unit | `a` | x", MAPPING_RE, "a one-character path still matches");
  assert.ok(kindsOf(cm({ acTestsText: text, specText: SPEC, planText: planText(), others: [] })).includes("malformed-line"));
  assert.equal(acRowsOf(text).ok, false, "run-gates / red-run-core / the AC gate refuse it too");
});

test("6.20.5: scopeKey folds like the write guard — NFC and full case folding — pinned by value, not by its implementation", () => {
  const nfc = "tests/ac/café.test.js";
  const nfd = "tests/ac/café.test.js";
  assert.notEqual(nfc, nfd, "precondition: two byte spellings");
  assert.equal(scopeKey(nfd), scopeKey(nfc));
  assert.equal(scopeKey("teſts/ac/a.test.js"), "tests/ac/a.test.js", "ſ (U+017F) folds to s");
  assert.equal(scopeKey("Tests/AC/A.test.js (gated)"), "tests/ac/a.test.js", "cleaned, then folded");
  assert.equal(scopeKey("tests/ac/<x>.test.js"), null, "a placeholder is dropped, as the setter drops it");
  assert.equal(scopedPath("tests/ac/A.test.js (new)"), "tests/ac/A.test.js", "scopedPath cleans but never folds");
});

test("6.20.5: NFD, ſ and case spellings of an AC test file are in-plan-files, and claimed-elsewhere in another feature", () => {
  const nfcFile = "tests/ac/café.unit.test.js";
  const nfdFile = "tests/ac/café.unit.test.js";
  const ac = acTests({ files: [nfcFile, E2E], mapping: mapRows(nfcFile) });
  assert.deepEqual(kindsOf(cm({ acTestsText: ac, specText: SPEC, planText: planText(), others: [] })), [], "control: GREEN");
  for (const spelling of [nfdFile, "teſts/ac/café.unit.test.js", "Tests/AC/CAFÉ.unit.test.js"]) {
    const inPlan = cm({ acTestsText: ac, specText: SPEC, planText: planText(["src/demo.js", spelling]), others: [] });
    assert.deepEqual(kindsOf(inPlan), ["in-plan-files"], `PLAN.md naming ${JSON.stringify(spelling)} would scope the build to the AC test`);
    const elsewhere = cm({
      acTestsText: ac,
      specText: SPEC,
      planText: planText(),
      others: [{ feature: "other", files: [spelling] }],
    });
    assert.deepEqual(kindsOf(elsewhere), ["claimed-elsewhere"], `another feature claiming ${JSON.stringify(spelling)}`);
  }
});

// ── 6.21.1 — a CRASH of the chain check is no verdict on the pin (the `nested-child-crash` follow-up) ──────────────
// Appended as one block. Each crash mode breaks the copied check-plan-spec-agree.mjs; the L40 controls vary the
// condition, not the member: the intact copy is GREEN, and the same checker exiting 1 WITH its line is still `pin`.
import { cpSync, unlinkSync } from "node:fs";

/** The product floor (no tests, no fixtures) with pharn-contracts beside it, copied so ONE checker can be broken. */
function floorCopy() {
  const dir = mkdtempSync(join(tmpdir(), "act-floor-"));
  cpSync(HERE, join(dir, "pharn", "floor"), {
    recursive: true,
    filter: (src) => !src.endsWith(".test.mjs") && !src.includes("test-fixtures"),
  });
  cpSync(join(HERE, "..", "pharn-contracts"), join(dir, "pharn", "pharn-contracts"), { recursive: true });
  return dir;
}
const AGREE = (copy) => join(copy, "pharn", "floor", "check-plan-spec-agree.mjs");
/** L29: the set of ways the shelled chain check can crash — each must read as no verdict, never as `pin`. */
const CHAIN_CRASHES = [
  [
    "throws only when handed AC-TESTS.md (input-dependent: check-loop-fresh's run over PLAN.md still passes)",
    (copy) => {
      const src = readFileSync(AGREE(copy), "utf8");
      assert.equal(src.split("function main() {").length, 2, "the anchor moved — update this test");
      writeFileSync(
        AGREE(copy),
        src.replace(
          "function main() {",
          'function main() {\n  if (String(process.argv[2]).endsWith("AC-TESTS.md")) throw new Error("simulated crash");'
        )
      );
    },
  ],
  ["throws at load", (copy) => writeFileSync(AGREE(copy), 'throw new Error("simulated module-load failure");\n')],
  ["is missing", (copy) => unlinkSync(AGREE(copy))],
  ["exits 1 with no output", (copy) => writeFileSync(AGREE(copy), "process.exit(1);\n")],
  [
    "exits with a code outside its contract, a RED line printed",
    (copy) => writeFileSync(AGREE(copy), 'console.log("RED — x"); process.exit(3);\n'),
  ],
];
function runCopy(copy, root) {
  const f = (n) => `pharn/features/${NAME}/${n}`;
  const r = spawnSync(
    process.execPath,
    [join(copy, "pharn", "floor", "check-ac-tests.mjs"), f("AC-TESTS.md"), f("SPEC.md"), f("PLAN.md")],
    {
      cwd: root,
      encoding: "utf8",
    }
  );
  return { code: r.status, out: r.stdout, kinds: [...new Set([...r.stdout.matchAll(/^RED — ([a-z-]+):/gm)].map((m) => m[1]))].sort() };
}
function withCopy(breakIt, fn) {
  const copy = floorCopy();
  try {
    if (breakIt) breakIt(copy);
    return fn(copy);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

test("6.21.1: a crashed chain check with no other RED is exit 2, the `UNUSABLE child-crashed` line FIRST — never a `pin` RED", () => {
  const root = world();
  try {
    withCopy(null, (copy) => assert.equal(runCopy(copy, root).code, 0, "control: the intact copy is GREEN over the same world"));
    for (const [label, breakIt] of CHAIN_CRASHES) {
      withCopy(breakIt, (copy) => {
        const r = runCopy(copy, root);
        assert.equal(r.code, 2, `${label}: ${r.out}`);
        assert.match(r.out.split("\n")[0], /^UNUSABLE child-crashed — check-plan-spec-agree\.mjs (exited|was killed|could not)/, label);
        assert.match(r.out.split("\n")[0], /the SPEC pin was not checked$/, label);
        assert.doesNotMatch(r.out, /^RED — /m, `${label}: no RED line at all`);
      });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.21.1: beside a definite RED the exit stays 1 — the RED kinds without `pin`, the crash named before the closing line", () => {
  const root = world({ ac: acTests({ files: [UNIT], mapping: [`- AC-1 | unit | \`${UNIT}\` | t`] }) });
  try {
    withCopy(CHAIN_CRASHES[0][1], (copy) => {
      const r = runCopy(copy, root);
      assert.equal(r.code, 1, r.out);
      assert.deepEqual(r.kinds, ["missing-ac"], "the definite RED, and no pin");
      const lines = r.out.trimEnd().split("\n");
      assert.match(lines[0], /^RED — missing-ac: /, "the first line is the RED, never the token");
      assert.ok(
        lines.some((l) => l.startsWith("UNUSABLE child-crashed — check-plan-spec-agree.mjs")),
        "the crash is named"
      );
      assert.equal(lines.at(-1), "RED — 1 AC-tests mapping check(s) failed", "the closing line counts the REDs only");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.21.1 control (L40): the same chain check exiting 1 WITH its RED line is still the `pin` RED, never a crash", () => {
  const root = world({ ac: acTests({ hash: "0".repeat(64) }) });
  try {
    withCopy(null, (copy) => {
      const r = runCopy(copy, root);
      assert.equal(r.code, 1, r.out);
      assert.deepEqual(r.kinds, ["pin"]);
      assert.doesNotMatch(r.out, /child-crashed/);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
