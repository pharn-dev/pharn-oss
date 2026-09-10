// pharn/floor/check-ship-briefing.test.mjs — black-box tests for the deterministic ship-briefing
// cross-file checker. Run as a subprocess (mirrors check-loop-record.test.mjs / check-provenance.test.mjs)
// so the checker keeps its dependency-free, top-level-exec contract. Fixtures live in a fresh temp dir per
// test — nothing touches the real pharn/features/ tree.
//
// ✧ PARITY — check-ship-briefing.mjs duplicates three field readers from render-ship-briefing.mjs (P3, no
//   sibling import). This group asserts both copies produce IDENTICAL output across a shared fixture set,
//   so a future edit to one side that silently diverges from the other is caught, not merely hoped
//   against (mirrors CLAUDE.md's description of check-provenance.mjs's dev/product copy-pair tests).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import * as checker from "./check-ship-briefing.mjs";
import * as renderer from "./render-ship-briefing.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(here, "check-ship-briefing.mjs");

function scratchDir() {
  return mkdtempSync(join(tmpdir(), "check-ship-briefing-"));
}

function run(path) {
  return spawnSync(process.execPath, [CHECKER, path], { encoding: "utf8" });
}

const GOOD_FM = [
  "---",
  'feature: "feat"',
  'spec_id: "FEAT-1"',
  'spec_state: "Approved"',
  'grill_verdict: "ADVISORY VERDICT: 0 concerns raised."',
  'regress_verdict: "no-regressions"',
  'verify_verdict: "PASS"',
  'rendered_at_commit: "abcdef1"',
  'briefing_contract_version: "0.1.0"',
  "---",
].join("\n");

const GOOD_BODY = ["", "# BRIEFING — feat", "", "## Why this design", "", "some quoted rationale.", ""].join("\n");

function writeGoodFixture(dir) {
  writeFileSync(join(dir, "BRIEFING.md"), GOOD_FM + "\n" + GOOD_BODY);
  writeFileSync(join(dir, "SPEC.md"), ["---", 'spec_id: "FEAT-1"', "state: Approved", "---", ""].join("\n"));
  writeFileSync(join(dir, "GRILL.md"), ["# GRILL", "", "**ADVISORY VERDICT: 0 concerns raised.**", ""].join("\n"));
  writeFileSync(join(dir, "regression-report.json"), JSON.stringify({ verdict: "no-regressions" }));
  writeFileSync(join(dir, "verify-report.json"), JSON.stringify({ verdict: "PASS" }));
}

test("GREEN: a well-shaped briefing whose fields all match live siblings", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^GREEN —/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED: unreadable file", () => {
  const r = run("/nonexistent/BRIEFING.md");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /unreadable/);
});

test("RED: no frontmatter at all", () => {
  const dir = scratchDir();
  try {
    writeFileSync(join(dir, "BRIEFING.md"), "# BRIEFING — feat\n\nno frontmatter here.\n");
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /no `---`-fenced YAML frontmatter/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED: a missing required field", () => {
  const dir = scratchDir();
  try {
    const fm = GOOD_FM.split("\n")
      .filter((l) => !l.startsWith("verify_verdict:"))
      .join("\n");
    writeFileSync(join(dir, "BRIEFING.md"), fm + "\n" + GOOD_BODY);
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /missing required frontmatter field `verify_verdict`/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const SPEC_ID_CONTROL_CHAR_VALUE = '"' + "\x01" + 'bad"';

const SHAPE_CASES = [
  ["feature", '""', /`feature` must be/],
  ["spec_id", SPEC_ID_CONTROL_CHAR_VALUE, /`spec_id` must be/],
  ["spec_state", '"Pending"', /`spec_state` must be/],
  ["grill_verdict", `"${"x".repeat(300)}"`, /`grill_verdict` must be/],
  ["regress_verdict", '"MAYBE"', /`regress_verdict` not in/],
  ["verify_verdict", '"MAYBE"', /`verify_verdict` not in/],
  ["rendered_at_commit", '"not-hex!!!"', /`rendered_at_commit` must be/],
  ["briefing_contract_version", '"abc"', /`briefing_contract_version` must be/],
];

for (const [field, badValue, expected] of SHAPE_CASES) {
  test(`RED shape: ${field} = ${badValue}`, () => {
    const dir = scratchDir();
    try {
      const fm = GOOD_FM.split("\n")
        .map((l) => (l.startsWith(`${field}:`) ? `${field}: ${badValue}` : l))
        .join("\n");
      writeFileSync(join(dir, "BRIEFING.md"), fm + "\n" + GOOD_BODY);
      const r = run(join(dir, "BRIEFING.md"));
      assert.equal(r.status, 1);
      assert.match(r.stdout, expected);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("RED stale: spec_id disagrees with live SPEC.md", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    writeFileSync(join(dir, "SPEC.md"), ["---", 'spec_id: "FEAT-DIFFERENT"', "state: Approved", "---", ""].join("\n"));
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /`spec_id` = "FEAT-1" but .*SPEC\.md currently reads "FEAT-DIFFERENT"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED stale: spec_state disagrees (SPEC.md now Draft)", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    writeFileSync(join(dir, "SPEC.md"), ["---", 'spec_id: "FEAT-1"', "state: Draft", "---", ""].join("\n"));
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /`spec_state` = "Approved" but .*SPEC\.md currently reads "n\/a"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED stale: grill_verdict disagrees with live GRILL.md", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    writeFileSync(join(dir, "GRILL.md"), ["# GRILL", "", "**ADVISORY VERDICT: 9 concerns raised.**", ""].join("\n"));
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /`grill_verdict` = .* but .*GRILL\.md currently reads/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED stale: regress_verdict disagrees with live regression-report.json", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    writeFileSync(join(dir, "regression-report.json"), JSON.stringify({ verdict: "regressions" }));
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /`regress_verdict` = "no-regressions" but regression-report\.json currently reads "regressions"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED stale: verify_verdict disagrees with live verify-report.json", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    writeFileSync(join(dir, "verify-report.json"), JSON.stringify({ verdict: "FAIL" }));
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /`verify_verdict` = "PASS" but verify-report\.json currently reads "FAIL"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("GREEN when every field honestly reads n/a and no sibling sources exist", () => {
  const dir = scratchDir();
  try {
    const fm = [
      "---",
      'feature: "feat"',
      'spec_id: "n/a"',
      'spec_state: "n/a"',
      'grill_verdict: "n/a"',
      'regress_verdict: "n/a"',
      'verify_verdict: "n/a"',
      'rendered_at_commit: "unknown"',
      'briefing_contract_version: "0.1.0"',
      "---",
    ].join("\n");
    writeFileSync(join(dir, "BRIEFING.md"), fm + "\n" + GOOD_BODY);
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 0, r.stdout + r.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED structure: no `## Why this design` section", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    writeFileSync(join(dir, "BRIEFING.md"), GOOD_FM + "\n\n# BRIEFING — feat\n\nno such heading here.\n");
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /no `## Why this design` section found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED structure: two `## Why this design` sections", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    const body = ["", "# BRIEFING — feat", "", "## Why this design", "", "a.", "", "## Why this design", "", "b.", ""].join("\n");
    writeFileSync(join(dir, "BRIEFING.md"), GOOD_FM + "\n" + body);
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /2 `## Why this design` sections found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RED structure: a mangled `## Why this design` heading", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    const body = ["", "# BRIEFING — feat", "", "## Why this design (mangled)", "", "x.", ""].join("\n");
    writeFileSync(join(dir, "BRIEFING.md"), GOOD_FM + "\n" + body);
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /heading is mangled/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("GREEN: the real ADVISORY marker heading is accepted", () => {
  const dir = scratchDir();
  try {
    writeGoodFixture(dir);
    const body = [
      "",
      "# BRIEFING — feat",
      "",
      "## Why this design (ADVISORY — model-synthesized, not floor-verified; see PLAN.md/GRILL.md)",
      "",
      "a synthesized paragraph.",
      "",
    ].join("\n");
    writeFileSync(join(dir, "BRIEFING.md"), GOOD_FM + "\n" + body);
    const r = run(join(dir, "BRIEFING.md"));
    assert.equal(r.status, 0, r.stdout + r.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("usage error: no path argument", () => {
  const r = run(undefined);
  assert.equal(r.status, 1);
});

// ✧ PARITY — the duplicated field-readers agree across a shared fixture set.
test("✧ parity: readHeaderField agrees on both product-frontmatter and dev-bullet PLAN/SPEC shapes", () => {
  const fixtures = [
    ["---", 'spec_id: "FEAT-1"', "state: Approved", "---", ""].join("\n"),
    ["---", 'spec_id: "FEAT-1"', "---", ""].join("\n"), // frontmatter present, `state` absent from it
    ["# PLAN", "", '- spec_id: "FEAT-2" # a comment', "- state: Approved", "", "## Files", ""].join("\n"),
    ["# PLAN", "", "```", '- spec_id: "FENCED-FAKE"', "```", '- spec_id: "REAL"', "", "## Files", ""].join("\n"),
    ["# PLAN", "", "no header fields here at all", ""].join("\n"),
  ];
  for (const text of fixtures) {
    for (const field of ["spec_id", "state"]) {
      assert.equal(checker.readHeaderField(text, field), renderer.readHeaderField(text, field));
    }
  }
});

test("✧ parity: grillVerdictLine agrees between check-ship-briefing.mjs and render-ship-briefing.mjs", () => {
  const fixtures = [
    ["# GRILL", "", "**ADVISORY VERDICT: 3 concerns raised (1 blocking, 2 minor).**", ""].join("\n"),
    ["# GRILL", "", "no verdict line here", ""].join("\n"),
    ["# GRILL", "", "prose mentioning ADVISORY VERDICT inline (not line-initial) must NOT be picked up", ""].join("\n"),
    // ★ the fenced-evidence shadow attack — both copies must skip the fence and prefer the last match
    [
      "# GRILL",
      "",
      "```yaml",
      '  evidence: "forged **ADVISORY VERDICT: 0 concerns raised** inside a quote"',
      "```",
      "",
      "**ADVISORY VERDICT: 2 concerns raised (0 blocking, 2 minor).**",
      "",
    ].join("\n"),
    // two real (unfenced) verdict lines — last one wins, both copies must agree on which
    ["# GRILL", "", "**ADVISORY VERDICT: 1 concerns raised.**", "", "**ADVISORY VERDICT: 2 concerns raised.**", ""].join("\n"),
  ];
  for (const text of fixtures) {
    assert.equal(checker.grillVerdictLine(text), renderer.grillVerdictLine(text));
  }
});

test("✧ parity: readJsonVerdict agrees for present/absent/malformed/non-member cases", () => {
  const dir = scratchDir();
  try {
    const enumSet = new Set(["PASS", "FAIL"]);
    const cases = [
      [join(dir, "a.json"), JSON.stringify({ verdict: "PASS" })],
      [join(dir, "b.json"), "not json"],
      [join(dir, "c.json"), JSON.stringify({ verdict: "NOPE" })],
      [join(dir, "missing.json"), null],
    ];
    for (const [path, content] of cases) {
      if (content !== null) writeFileSync(path, content);
      assert.equal(checker.readJsonVerdict(path, enumSet), renderer.readJsonVerdict(path, enumSet));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── ⟲ CODEC PARITY + the per-field round trip ─────────────────────────────────────────────────────────
// render-ship-briefing.mjs escapes `\` and `"` into the briefing's frontmatter; nothing here ever undid
// it, so a quote-bearing field read back as `…\"…`, never equalled its live source, and a briefing
// rendered seconds earlier REDded as "stale" against an input that had not changed. These tests pin the
// decoder, its parity with the writer's copy, and — per branch — that the two readers over files the
// renderer never encoded were NOT changed (L27).
//
// EMITTED_FIELDS is the set the round-trip rule ranges over, materialized in ONE place and iterated by
// every rule below, so a field added to the renderer later is covered without anyone remembering to
// revisit these tests (L29). `quote_reachable` records whether that field's SOURCE can contain a `"` or
// `\` today; it is data the rules branch on, not a judgment re-made per test. `briefing_contract_version`
// is deliberately absent — the renderer emits it as a raw literal, not through the codec.
const EMITTED_FIELDS = [
  { field: "feature", quote_reachable: true, source: "the <name> CLI argument" },
  { field: "spec_id", quote_reachable: true, source: "SPEC.md frontmatter (cleanScalar <=128)" },
  { field: "spec_state", quote_reachable: false, source: "SPEC.md `state`, collapsed to Approved|n/a" },
  { field: "grill_verdict", quote_reachable: true, source: "GRILL.md's ADVISORY VERDICT line (free text)" },
  { field: "regress_verdict", quote_reachable: false, source: "regression-report.json, enum-closed" },
  { field: "verify_verdict", quote_reachable: false, source: "verify-report.json, enum-closed" },
  { field: "rendered_at_commit", quote_reachable: false, source: "git rev-parse — hex, or the literal `unknown`" },
];

const CODEC_CORPUS = [
  "plain",
  "n/a",
  "",
  'has a " quote',
  'ends with a quote "',
  '"fully wrapped"',
  "has a \\ backslash",
  "ends with a backslash \\",
  "ends with two backslashes \\\\",
  'the literal escape \\" sequence',
  '\\"',
  "\\",
  '"',
  'ADVISORY VERDICT: 0 concerns — not "grill passed".',
  "C:\\Users\\x",
];

test("✧ parity: yamlScalar / isQuotedScalar / yamlUnscalar agree between both copies over CODEC_CORPUS", () => {
  for (const v of CODEC_CORPUS) {
    assert.equal(checker.yamlScalar(v), renderer.yamlScalar(v), `yamlScalar diverged for ${JSON.stringify(v)}`);
    const raw = renderer.yamlScalar(v);
    assert.equal(checker.isQuotedScalar(raw), renderer.isQuotedScalar(raw));
    assert.equal(checker.yamlUnscalar(raw), renderer.yamlUnscalar(raw));
  }
  // and on inputs the writer never produces, where a divergent fallback would be just as damaging
  for (const raw of ["", '"', "unquoted", '"a\\"', "'single'", '"x" # note']) {
    assert.equal(checker.isQuotedScalar(raw), renderer.isQuotedScalar(raw), `isQuotedScalar diverged for ${JSON.stringify(raw)}`);
    assert.equal(checker.yamlUnscalar(raw), renderer.yamlUnscalar(raw), `yamlUnscalar diverged for ${JSON.stringify(raw)}`);
  }
});

test("⟲ round-trip through the checker's copy: yamlUnscalar(yamlScalar(v)) === v over CODEC_CORPUS", () => {
  for (const v of CODEC_CORPUS) {
    assert.equal(checker.yamlUnscalar(checker.yamlScalar(v)), v, `round-trip failed for ${JSON.stringify(v)}`);
  }
});

// ── The per-field rules, iterating EMITTED_FIELDS (L29) ───────────────────────────────────────────────

function renderWith(base, name, files) {
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) writeFileSync(join(dir, rel), content);
  return renderer.renderBriefing(name, { base });
}

const PAYLOAD = 'a " quote and a \\ backslash and a trailing \\';

test("⟲ EVERY yamlScalar-emitted field renders as a COMPLETE quoted scalar — a raw-literal field would fail here", () => {
  const base = scratchDir();
  try {
    const r = renderWith(base, "feat", {
      "PLAN.md": ["---", 'spec_id: "FEAT-1"', "state: Approved", "---", "", "## Files", "", "- a.mjs — x", ""].join("\n"),
      "SPEC.md": ["---", 'spec_id: "FEAT-1"', "state: Approved", "---", "", "# SPEC", ""].join("\n"),
      "GRILL.md": "**ADVISORY VERDICT: 0 concerns.**",
      "regression-report.json": JSON.stringify({ verdict: "no-regressions" }),
      "verify-report.json": JSON.stringify({ verdict: "PASS" }),
    });
    assert.equal(r.ok, true);
    const fm = r.markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
    for (const { field } of EMITTED_FIELDS) {
      const line = fm.split(/\r?\n/).find((l) => l.startsWith(`${field}:`));
      assert.ok(line, `field ${field} is not emitted at all`);
      const raw = line.slice(field.length + 1).trim();
      assert.equal(checker.isQuotedScalar(raw), true, `${field} is not a complete quoted scalar: ${raw}`);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("⟲ every QUOTE-REACHABLE field survives render→readEnvelope byte-for-byte", () => {
  for (const { field, quote_reachable } of EMITTED_FIELDS.filter((f) => f.quote_reachable)) {
    assert.equal(quote_reachable, true);
    const base = scratchDir();
    try {
      // Drive the payload into THIS field's own source, leaving the others at their defaults.
      const name = field === "feature" ? `fe${PAYLOAD}` : "feat";
      const specText = ["---", `spec_id: ${field === "spec_id" ? PAYLOAD : "FEAT-1"}`, "state: Approved", "---", "", "# SPEC", ""].join(
        "\n"
      );
      const grillText = `**ADVISORY VERDICT: ${field === "grill_verdict" ? PAYLOAD : "0 concerns."}**`;
      const r = renderWith(base, name, {
        "PLAN.md": ["---", "state: Approved", "---", "", "## Files", "", "- a.mjs — x", ""].join("\n"),
        "SPEC.md": specText,
        "GRILL.md": grillText,
        "regression-report.json": JSON.stringify({ verdict: "no-regressions" }),
        "verify-report.json": JSON.stringify({ verdict: "PASS" }),
      });
      assert.equal(r.ok, true, `render failed for ${field}`);

      // `want` is what the RENDERER read from the source, computed with the renderer's own reader — not
      // the payload as authored. SPEC.md and GRILL.md are files the renderer never encoded, so their
      // readers do not decode (L27); the property under test is that the ENVELOPE hands back exactly the
      // value the renderer copied, which is also the value the checker compares against live.
      const want =
        field === "feature"
          ? name
          : field === "spec_id"
            ? renderer.readHeaderField(specText, "spec_id")
            : renderer.grillVerdictLine(grillText);
      assert.ok(want.includes('"') || want.includes("\\"), `precondition: ${field}'s payload must carry an escapable char`);
      const line = r.markdown.split(/\r?\n/).find((l) => l.startsWith(`${field}:`));
      assert.match(line, /\\/, `precondition: ${field} must actually be ESCAPED in the rendered bytes, else this is vacuous`);
      const got = checker.readEnvelope(r.markdown).get(field);
      assert.equal(got, want, `${field} did not survive the round trip`);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  }
});

// ── End-to-end: the defect's own reproduction, as a test ──────────────────────────────────────────────

test("⟲ a quote- AND backslash-bearing briefing renders and CHECKS GREEN against its own live sources", () => {
  const dir = scratchDir();
  try {
    const verdict = 'ADVISORY VERDICT: the plan says "escape it" and uses a back\\slash';
    const specId = 'FEAT-"1"\\x';
    const files = {
      "PLAN.md": ["---", "state: Approved", "---", "", "## Files", "", "- a.mjs — x", ""].join("\n"),
      "SPEC.md": ["---", `spec_id: ${renderer.yamlScalar(specId)}`, "state: Approved", "---", "", "# SPEC", ""].join("\n"),
      "GRILL.md": `**${verdict}**`,
      "regression-report.json": JSON.stringify({ verdict: "no-regressions" }),
      "verify-report.json": JSON.stringify({ verdict: "PASS" }),
    };
    mkdirSync(join(dir, "feat"), { recursive: true });
    for (const [rel, content] of Object.entries(files)) writeFileSync(join(dir, "feat", rel), content);
    const r = renderer.renderBriefing("feat", { base: dir });
    assert.equal(r.ok, true);
    const briefing = join(dir, "feat", "BRIEFING.md");
    writeFileSync(briefing, r.markdown);
    // the escapes really are in the rendered bytes — otherwise this test would pass vacuously
    assert.match(r.markdown, /grill_verdict: ".*\\"escape it\\".*back\\\\slash"/);
    const res = run(briefing);
    assert.equal(res.status, 0, `expected GREEN, got:\n${res.stdout}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── L27: per branch — the decode landed on ONE reader, and provably not on the other two ──────────────

test("⟲ the decode did NOT leak into readHeaderField or grillVerdictLine — both still agree with the renderer", () => {
  // These read files the renderer never encoded. A blanket unescape inside clean() would change them and
  // silently break their parity; assert per branch, in its own case AND absent from the others.
  const spec = ["---", 'spec_id: "FEAT-\\"1\\""', "---", ""].join("\n");
  assert.equal(checker.readHeaderField(spec, "spec_id"), renderer.readHeaderField(spec, "spec_id"));
  assert.equal(checker.readHeaderField(spec, "spec_id"), 'FEAT-\\"1\\"'); // literal, NOT decoded

  const grill = '**ADVISORY VERDICT: a \\" literal**';
  assert.equal(checker.grillVerdictLine(grill), renderer.grillVerdictLine(grill));
  assert.equal(checker.grillVerdictLine(grill), 'ADVISORY VERDICT: a \\" literal'); // literal, NOT decoded

  // ...while the envelope reader, whose input the renderer DID encode, decodes.
  const fm = ["---", `grill_verdict: ${renderer.yamlScalar('a " and a \\')}`, "---", ""].join("\n");
  assert.equal(checker.readEnvelope(fm).get("grill_verdict"), 'a " and a \\');
});

// ── L14: the decoder is layered BEFORE the shape guard, never in place of it ──────────────────────────

test("⟲ a decoded value is still shape-guarded — a control char behind an escape does not launder through", () => {
  const dir = scratchDir();
  try {
    const del = String.fromCharCode(0x7f); // built, never written as a raw byte in this source
    const fm = [
      "---",
      'feature: "feat"',
      'spec_id: "n/a"',
      'spec_state: "n/a"',
      `grill_verdict: "bad${del}value"`,
      'regress_verdict: "n/a"',
      'verify_verdict: "n/a"',
      'rendered_at_commit: "abcdef1"',
      'briefing_contract_version: "0.1.0"',
      "---",
    ].join("\n");
    const p = join(dir, "BRIEFING.md");
    writeFileSync(p, fm + GOOD_BODY);
    const r = run(p);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /grill_verdict.*control-char-free/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("⟲ an over-long value is still length-guarded AFTER decoding — the bound applies to the decoded string", () => {
  const dir = scratchDir();
  try {
    // 200 escaped quotes decode to 200 characters, well under 256; 300 decode to 300, over it. The bound
    // must be read on the DECODED value, or the escaping would inflate a legal value past its own limit.
    for (const [n, wantStatus] of [
      [200, 0],
      [300, 1],
    ]) {
      const decoded = '"'.repeat(n);
      mkdirSync(join(dir, String(n)), { recursive: true });
      const d = join(dir, String(n));
      writeFileSync(join(d, "GRILL.md"), `**ADVISORY VERDICT: ${decoded}**`);
      const live = renderer.grillVerdictLine(readFileSync(join(d, "GRILL.md"), "utf8"));
      const fm = [
        "---",
        'feature: "feat"',
        'spec_id: "n/a"',
        'spec_state: "n/a"',
        `grill_verdict: ${renderer.yamlScalar(live)}`,
        'regress_verdict: "n/a"',
        'verify_verdict: "n/a"',
        'rendered_at_commit: "abcdef1"',
        'briefing_contract_version: "0.1.0"',
        "---",
      ].join("\n");
      const p = join(d, "BRIEFING.md");
      writeFileSync(p, fm + GOOD_BODY);
      assert.equal(run(p).status, wantStatus, `n=${n}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
