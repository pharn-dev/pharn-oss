// pharn/floor/check-ac-tests.test.mjs — the AC-tests mapping checker's suite, plus specAcceptanceCriteria()
// (spec-template-core.mjs), which exists for this checker.
//
// Every RED kind has ONE mutation of the passing world that trips it and no other kind (L34/L52), with the passing
// world as its non-vacuity control; `no-files` is the one kind that cannot be isolated (a mapping line whose file is
// not listed is also `unlisted-file`), and its test says so. The last test asserts that every KINDS member was
// reached (L36). The ★ HOOK test runs the REAL writes-scope setter and pre-write guard: a build scoped by PLAN.md is
// denied a Write to an AC test file, which is the property the `in-plan-files` kind exists to protect.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KINDS, LEVELS, MAPPING_RE, badPath, checkMapping, mappingOf } from "./check-ac-tests.mjs";
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

/** A project root holding the feature; `others` is `{feature: AC-TESTS.md text}` for other feature dirs. */
function world({ spec = SPEC, ac = acTests(), plan = planText(), others = {} } = {}) {
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
  return root;
}
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
    assert.match(r.out, /not one of \{feature, test-infra\}/);
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
  const noMap = checkMapping({
    acTestsText: acTests().replace(/## Mapping[\s\S]*$/, ""),
    specText: SPEC,
    planText: planText(),
    others: [],
  });
  assert.ok(noMap.findings.some((f) => f.kind === "malformed-line"));
  const dup = SPEC + "\n## Acceptance Criteria\n\n- **AC-3** Given a When b Then c\n  - verify: unit\n";
  const r = checkMapping({ acTestsText: acTests(), specText: dup, planText: planText(), others: [] });
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
    const r = checkMapping({ acTestsText: acTests(), specText: SPEC, planText: planText(["src/demo.js", entry]), others: [] });
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
  const r = checkMapping({ acTestsText: acTests(), specText: spec, planText: planText(["vite.config.ts", "package.json"]), others: [] });
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
        infraKinds(
          checkMapping({ acTestsText: acTests(), specText: SPEC, planText: planText(["src/demo.js", entry]), others: [] })
        ).includes("test-infra-in-plan"),
        opens,
        `${entry}: the kind fires exactly when the build could write a root config`
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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
  const r = checkMapping({ acTestsText: acTests({ mapping: mapRows(cell) }), specText: SPEC, planText: planText(), others: [] });
  assert.deepEqual(kindsOf(r), ["unlisted-file", "unmapped-file"]);
  assert.match(
    r.findings.find((f) => f.kind === "unlisted-file").detail,
    /entry "tests\/ac\/demo\.unit\.test\.js" only in letter case or Unicode form — spell the cell byte-for-byte/
  );
  // Why it matters: the consumers read the cell VERBATIM, so this cell could never match the file the setter scoped.
  assert.equal(acRowsOf(acTests({ mapping: mapRows(cell) })).rows[0].file, cell);
  // Control: the exact spelling is GREEN.
  assert.deepEqual(kindsOf(checkMapping({ acTestsText: acTests(), specText: SPEC, planText: planText(), others: [] })), []);
});

test("6.20.5: a mapping cell with whitespace at its edge is malformed-line, and reaches no consumer", () => {
  const text = acTests({ mapping: mapRows(`${UNIT} `) });
  assert.doesNotMatch(`- AC-1 | unit | \`${UNIT} \` | x`, MAPPING_RE, "a trailing space inside the back-ticks");
  assert.doesNotMatch(`- AC-1 | unit | \` ${UNIT}\` | x`, MAPPING_RE, "a leading one (refused before 6.20.5 too)");
  assert.match(`- AC-1 | unit | \`${UNIT}\` | x`, MAPPING_RE, "control");
  assert.match("- AC-1 | unit | `a` | x", MAPPING_RE, "a one-character path still matches");
  assert.ok(kindsOf(checkMapping({ acTestsText: text, specText: SPEC, planText: planText(), others: [] })).includes("malformed-line"));
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
  assert.deepEqual(kindsOf(checkMapping({ acTestsText: ac, specText: SPEC, planText: planText(), others: [] })), [], "control: GREEN");
  for (const spelling of [nfdFile, "teſts/ac/café.unit.test.js", "Tests/AC/CAFÉ.unit.test.js"]) {
    const inPlan = checkMapping({ acTestsText: ac, specText: SPEC, planText: planText(["src/demo.js", spelling]), others: [] });
    assert.deepEqual(kindsOf(inPlan), ["in-plan-files"], `PLAN.md naming ${JSON.stringify(spelling)} would scope the build to the AC test`);
    const elsewhere = checkMapping({
      acTestsText: ac,
      specText: SPEC,
      planText: planText(),
      others: [{ feature: "other", files: [spelling] }],
    });
    assert.deepEqual(kindsOf(elsewhere), ["claimed-elsewhere"], `another feature claiming ${JSON.stringify(spelling)}`);
  }
});
