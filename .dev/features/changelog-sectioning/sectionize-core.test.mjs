// .dev/features/changelog-sectioning/sectionize-core.test.mjs — fixture tests for the migration's pure
// core. NEVER the live CHANGELOG: the migration is one-shot and the live file moves on, so every input
// here is built in the test. Each closed set the core exports (STATUSES, MARKER_FORMS, INVARIANTS,
// PLACEHOLDER_FORMS, HALT_CODES) is ITERATED, one fixture per member (L29/L52), and every refusal pairs
// with a passing control on the same fixture (L34). Non-LLM, stdlib-only.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as core from "./sectionize-core.mjs";

const seenHalts = new Set();
function expectHalt(fn, code) {
  let err = null;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  assert.ok(err instanceof core.MigrationHalt, `expected MigrationHalt ${code}, got ${err ? err.message : "no throw"}`);
  assert.equal(err.code, code, err.message);
  seenHalts.add(code);
  return err;
}

// A fixture SHA whose SHORT form (first 7) is distinct per n, so a rendered short SHA is assertable.
const sha = (n) => n.toString(16).padStart(7, "0").padEnd(40, "f");
const row = (n, date, value) => ({ sha: sha(n), date, value });
const indexOf = (n) => new Map(Array.from({ length: n }, (_, k) => [sha(k), k]));

// A first-parent chain of 10 commits (sha(0)..sha(9)); bumps at 1, 3, 4, 5 (revert), 6, 8.
const ROWS = [
  row(1, "2026-01-01", "1.0.0"),
  row(3, "2026-01-03", "1.1.0"),
  row(4, "2026-01-04", "1.2.0"),
  row(5, "2026-01-05", "1.1.0"),
  row(6, "2026-01-06", "1.2.1"),
  row(8, "2026-01-08", "1.2.2"),
];
const IDX = indexOf(10);
const UNTOUCHED = ["1.0.0"];

// ── Version table ────────────────────────────────────────────────────────────────────────────────

test("version table: first appearance wins, a re-set is a reset, a later LOWER value marks REVERTED", () => {
  const t = core.buildVersionTable(ROWS);
  assert.deepEqual(
    t.versions.map((v) => v.version),
    ["1.0.0", "1.1.0", "1.2.0", "1.2.1", "1.2.2"]
  );
  assert.deepEqual(t.byVersion.get("1.2.0").reverted, { sha: sha(5), date: "2026-01-05" });
  assert.equal(t.byVersion.get("1.1.0").reverted, null);
  assert.deepEqual(
    t.resets.map((r) => [r.version, r.sha]),
    [["1.1.0", sha(5)]]
  );
});

test("version table refusals — each a named halt, each beside a passing control", () => {
  assert.ok(core.buildVersionTable(ROWS)); // control
  expectHalt(() => core.buildVersionTable([]), "EMPTY_HISTORY");
  expectHalt(() => core.buildVersionTable([{ sha: "xyz", date: "2026-01-01", value: "1.0.0" }]), "BAD_ROW");
  expectHalt(() => core.buildVersionTable([row(1, "01/01/2026", "1.0.0")]), "BAD_ROW");
  expectHalt(() => core.buildVersionTable([row(1, "2026-01-01", "v1.0")]), "BAD_SEMVER");
  // 1.1.0 first, then 1.0.5 first-appearing later: semver order != chronological order.
  expectHalt(
    () => core.buildVersionTable([row(1, "2026-01-01", "1.1.0"), row(2, "2026-01-02", "1.0.5"), row(3, "2026-01-03", "1.2.0")]),
    "ORDER"
  );
  // 1.1.0 reverted to 1.0.0, then 1.1.0 re-set: the method has no rule for a re-landed reverted value.
  expectHalt(
    () =>
      core.buildVersionTable([
        row(1, "2026-01-01", "1.0.0"),
        row(2, "2026-01-02", "1.1.0"),
        row(3, "2026-01-03", "1.0.0"),
        row(4, "2026-01-04", "1.1.0"),
      ]),
    "RELANDED_REVERTED"
  );
  expectHalt(() => core.cmpSemver("1.0", "1.0.0"), "BAD_SEMVER");
});

test("cmpSemver orders numerically, not lexically", () => {
  assert.equal(core.cmpSemver("2.7.10", "2.7.9"), 1);
  assert.equal(core.cmpSemver("6.10.0", "6.9.3"), 1);
  assert.equal(core.cmpSemver("1.0.0", "1.0.0"), 0);
  assert.equal(core.cmpSemver("1.0.0", "1.0.1"), -1);
});

test("versionForIndex: a bump commit's change is that bump; a no-bump commit's is the NEXT bump; reverted skipped; none after the last", () => {
  const t = core.buildVersionTable(ROWS);
  assert.equal(core.versionForIndex(t, IDX, 1), "1.0.0"); // the bump commit itself (untouched, still mappable)
  assert.equal(core.versionForIndex(t, IDX, 2), "1.1.0"); // no-bump commit → next bump
  assert.equal(core.versionForIndex(t, IDX, 3), "1.1.0");
  assert.equal(core.versionForIndex(t, IDX, 4), "1.2.1"); // 1.2.0 is reverted → skipped
  assert.equal(core.versionForIndex(t, IDX, 7), "1.2.2");
  assert.equal(core.versionForIndex(t, IDX, 9), null); // after the last bump → [Unreleased]
  expectHalt(() => core.versionForIndex(t, new Map([[sha(1), 1]]), 2), "UNKNOWN_COMMIT");
});

// ── Parse ────────────────────────────────────────────────────────────────────────────────────────

const PRE = "# Changelog\n\nPreamble text.\n\n";
const INTRO = "<!-- a comment\n     that spans lines -->\n";
const DROP = "> > > dropped marker";

test("parse: bullets span indented, multi-paragraph and LAZY lines; trailing blanks are not part of a bullet", () => {
  const text =
    PRE +
    `## [Unreleased]\n\n${INTRO}\n### Added\n\n` +
    "- one line\n\n" +
    "- first line\n  indented continuation\n\n  second paragraph\n\n" +
    "- lazy head\nlazy continuation, unindented\n\n" +
    `${DROP}\n\n` +
    "### Fixed\n\n- fixed one\n\n" +
    "## [1.0.0] - 2026-01-01\n\n- The first cut.\n";
  const p = core.parseChangelog(text, { allowDrop: [DROP], untouched: UNTOUCHED });
  assert.equal(p.preamble.join("\n"), "# Changelog\n\nPreamble text.\n");
  assert.deepEqual(
    p.bullets.map((b) => b.text),
    [
      "- one line",
      "- first line\n  indented continuation\n\n  second paragraph",
      "- lazy head\nlazy continuation, unindented",
      "- fixed one",
    ]
  );
  assert.deepEqual(p.bullets[2].lazy, [20]);
  assert.deepEqual(p.dropped, [{ line: 22, text: DROP }]);
  assert.equal(p.tail.version, "1.0.0");
  assert.equal(p.tail.text, "## [1.0.0] - 2026-01-01\n\n- The first cut.\n");
  assert.deepEqual(p.sections[0].intro, ["", "<!-- a comment", "     that spans lines -->", ""]);
  assert.deepEqual(
    p.bullets.map((b) => b.group),
    ["### Added", "### Added", "### Added", "### Fixed"]
  );
});

test("parse refusals — every structural surprise halts, never guesses", () => {
  const ok = PRE + "## [Unreleased]\n\n### Added\n\n- a\n";
  assert.ok(core.parseChangelog(ok)); // control
  // An unindented line AFTER a blank line is not a lazy continuation: it is an orphan.
  expectHalt(() => core.parseChangelog(PRE + "## [Unreleased]\n\n### Added\n\n- a\n\norphan\n"), "ORPHAN");
  expectHalt(() => core.parseChangelog(PRE + "## [Unreleased]\n\nstray intro text\n"), "ORPHAN");
  expectHalt(() => core.parseChangelog(PRE + "## [Unreleased]\n\n### Added\n\n- a\n", { allowDrop: [DROP] }), "DROPPED_MISMATCH");
  expectHalt(() => core.parseChangelog(PRE + "## Not a version\n"), "BAD_HEADING");
  expectHalt(() => core.parseChangelog(PRE + "## [Unreleased]\n\n## [Unreleased]\n"), "DUPLICATE_SECTION");
  expectHalt(() => core.parseChangelog(ok.replace("\n", "\r\n")), "CR_IN_INPUT");
  expectHalt(() => core.parseChangelog(ok.slice(0, -1)), "NO_FINAL_NEWLINE");
  expectHalt(() => core.parseChangelog(PRE + "## [Unreleased]\n\n<!-- never closed\n"), "UNCLOSED_COMMENT");
  expectHalt(() => core.parseChangelog(PRE + "## [Unreleased]\n\n- a bullet under no group\n"), "BULLET_OUTSIDE_GROUP");
  assert.equal(core.parseChangelog(PRE + "## [Unreleased]\n\n- a bullet under no group\n", { allowUngrouped: true }).bullets.length, 1);
  expectHalt(
    () => core.parseChangelog(PRE + "## [1.0.0] - 2026-01-01\n\n- x\n\n## [Unreleased]\n", { untouched: UNTOUCHED }),
    "UNTOUCHED_NOT_LAST"
  );
});

// ── Markers ──────────────────────────────────────────────────────────────────────────────────────

test("markers: each `pair` spelling measured in the live file (L52 — every member, not one)", () => {
  const formats = [
    ["(`SKILLS_VERSION` 3.1.0 → **3.1.1**, minor: a newly shipped guard)", "3.1.0", "3.1.1"],
    ["(`SKILLS_VERSION` **3.0.5 → 3.0.6**; the product checker is", "3.0.5", "3.0.6"],
    ["Relocated. `SKILLS_VERSION` `4.0.0` → `5.0.0`.** Requires", "4.0.0", "5.0.0"],
    ["(`SKILLS_VERSION`\n  6.7.0 → **6.7.1**, patch)", "6.7.0", "6.7.1"],
  ];
  for (const [text, from, to] of formats) assert.deepEqual(core.extractMarkers(text), [{ form: "pair", from, to }], text);
});

test("markers: every MARKER_FORMS member is read (L29/L36), and a spelling none of them reads is REPORTED, not dropped", () => {
  const byForm = {
    pair: ["(`SKILLS_VERSION` 3.1.0 → **3.1.1**)", { form: "pair", from: "3.1.0", to: "3.1.1" }],
    "arrow-only": ["`SKILLS_VERSION` → `2.4.5`, patch", { form: "arrow-only", from: null, to: "2.4.5" }],
    "bumped-to": ["`SKILLS_VERSION` bumped to 2.6.1 (patch)", { form: "bumped-to", from: null, to: "2.6.1" }],
  };
  assert.deepEqual(Object.keys(byForm).sort(), Object.keys(core.MARKER_FORMS).sort());
  for (const [text, want] of Object.values(byForm)) {
    assert.deepEqual(core.extractMarkers(text), [want], text);
    assert.deepEqual(core.unreadMentions(text), [], text);
  }
  // A gap never crosses another SKILLS_VERSION, so each marker binds to its nearest one, in text order.
  assert.deepEqual(core.extractMarkers("SKILLS_VERSION bumped to 2.6.1; later SKILLS_VERSION 2.6.1 → 2.6.2"), [
    { form: "bumped-to", from: null, to: "2.6.1" },
    { form: "pair", from: "2.6.1", to: "2.6.2" },
  ]);
  assert.deepEqual(core.unreadMentions("`SKILLS_VERSION` had reached\n  2.5.1, so no bump"), ["SKILLS_VERSION had reached 2.5.1"]);
  assert.deepEqual(core.unreadMentions("SKILLS_VERSION alone, and no version anywhere near it at all............"), []);
});

test("markers: the window, the token boundary, and the non-markers", () => {
  assert.deepEqual(core.extractMarkers("SKILLS_VERSION " + "x".repeat(41) + " 1.0.0 → 1.1.0"), []); // > 40 chars away
  assert.deepEqual(core.extractMarkers("[Unreleased] 2.7.13 → 2.7.14"), []); // no SKILLS_VERSION
  assert.deepEqual(core.extractMarkers("SKILLS_VERSION 3.0.5 → 3.0.60 done"), [{ form: "pair", from: "3.0.5", to: "3.0.60" }]);
  assert.deepEqual(core.extractMarkers("SKILLS_VERSION 3.0.5 → 3.0.6."), [{ form: "pair", from: "3.0.5", to: "3.0.6" }]);
});

test("classifyMarker: none | target | ghost | nontarget (reverted, untouched) | multi", () => {
  const t = core.buildVersionTable(ROWS);
  const m = (to, from = "0.0.1") => ({ from, to });
  assert.deepEqual(core.classifyMarker([], t, UNTOUCHED), { kind: "none" });
  assert.deepEqual(core.classifyMarker([m("1.2.1")], t, UNTOUCHED), { kind: "target", version: "1.2.1" });
  assert.deepEqual(core.classifyMarker([m("1.2.1"), m("1.2.1", "1.1.0")], t, UNTOUCHED), { kind: "target", version: "1.2.1" });
  assert.deepEqual(core.classifyMarker([m("5.0.0")], t, UNTOUCHED), { kind: "ghost", names: "5.0.0" });
  assert.deepEqual(core.classifyMarker([m("1.2.0")], t, UNTOUCHED), { kind: "nontarget", names: "1.2.0" });
  assert.deepEqual(core.classifyMarker([m("1.0.0")], t, UNTOUCHED), { kind: "nontarget", names: "1.0.0" });
  assert.deepEqual(core.classifyMarker([m("1.1.0"), m("1.2.1")], t, UNTOUCHED), { kind: "multi", names: ["1.1.0", "1.2.1"] });
});

// ── Probes + introductions ───────────────────────────────────────────────────────────────────────

test("countOccurrences is overlapping and never matches an empty needle", () => {
  assert.equal(core.countOccurrences("aaa", "aa"), 2);
  assert.equal(core.countOccurrences("abc", ""), Infinity);
  assert.equal(core.countOccurrences("abc", "d"), 0);
});

test("headProbe: 60 chars when unique, lengthened within the first line, crossing it only when forced", () => {
  const long = "x".repeat(50) + " unique-tail-of-first-line and more words here";
  const b1 = `- ${long}`;
  assert.deepEqual(core.headProbe(b1, b1), { probe: long.slice(0, 60), crossLine: false });
  const shared = "S".repeat(70);
  const b2 = `- ${shared} two`;
  const file2 = `- ${shared} one\n${b2}\n`;
  assert.deepEqual(core.headProbe(b2, file2), { probe: `${shared} two`, crossLine: false });
  const b3 = `- ${shared}\n  second line B`;
  const file3 = `- ${shared}\n  second line A\n${b3}\n`;
  const p3 = core.headProbe(b3, file3);
  assert.equal(p3.crossLine, true);
  assert.equal(core.countOccurrences(file3, p3.probe), 1);
  expectHalt(() => core.headProbe(b1, `${b1}\n${b1}\n`), "PROBE_NOT_UNIQUE");
});

test("tailProbe: suffix of the last non-empty line; skips short and never-unique lines", () => {
  const b = "- head\n  " + "t".repeat(20) + " a distinctive final line of the bullet that is long";
  const tp = core.tailProbe(b, b);
  assert.equal(tp.probe, ("t".repeat(20) + " a distinctive final line of the bullet that is long").slice(-60));
  assert.deepEqual(core.tailProbe("- head\n  short end", "- head\n  short end"), { skip: "short" });
  const dup = "- a\n  " + "the same closing line appears twice here ok";
  assert.deepEqual(core.tailProbe(dup, `${dup}\n${dup}\n`), { skip: "not-unique" });
});

test("introductions: the LAST 0 -> >0 transition is the introducer — the earliest match is the wrong answer", () => {
  // The reverted-then-re-landed shape: added at 3 (bump 1.1.0), removed at 4, re-added at 6 (bump 1.2.1).
  const counts = [
    { sha: sha(3), count: 1 },
    { sha: sha(4), count: 0 },
    { sha: sha(6), count: 1 },
  ];
  const r = core.introductions(counts);
  assert.equal(r.intro, sha(6));
  assert.deepEqual(r.earlier, [sha(3)]);
  // Mutation control (L4): an earliest-match implementation files it under a DIFFERENT version.
  const t = core.buildVersionTable(ROWS);
  const earliest = counts[0].sha;
  assert.notEqual(core.versionForIndex(t, IDX, IDX.get(earliest)), core.versionForIndex(t, IDX, IDX.get(r.intro)));
  assert.equal(core.versionForIndex(t, IDX, IDX.get(r.intro)), "1.2.1");
  // A duplicate added and removed is not a new introduction.
  assert.deepEqual(
    core.introductions([
      { sha: sha(1), count: 1 },
      { sha: sha(2), count: 2 },
      { sha: sha(3), count: 1 },
    ]),
    { intro: sha(1), earlier: [] }
  );
  assert.deepEqual(
    core.introductions([
      { sha: sha(1), count: 1 },
      { sha: sha(2), count: 0 },
    ]),
    { intro: null, earlier: [sha(1)] }
  );
  assert.deepEqual(core.introductions([]), { intro: null, earlier: [] });
});

// ── Classification ───────────────────────────────────────────────────────────────────────────────

const h = (n, version) => ({ sha: sha(n), version });
const STATUS_FIXTURES = {
  UNRESOLVED: { head: { sha: null, version: null }, tail: { skip: "short" }, marker: { kind: "none" } },
  DRIFTED: { head: h(2, "1.1.0"), tail: h(6, "1.2.1"), marker: { kind: "target", version: "1.1.0" } },
  OUT_OF_SCOPE: { head: h(1, "1.0.0"), tail: h(1, "1.0.0"), marker: { kind: "none" } },
  MULTI: { head: h(3, "1.1.0"), tail: { skip: "short" }, marker: { kind: "multi", names: ["1.1.0", "1.2.1"] } },
  CONFLICT: { head: h(6, "1.2.1"), tail: h(6, "1.2.1"), marker: { kind: "nontarget", names: "1.2.0" } },
  AGREE: { head: h(3, "1.1.0"), tail: h(3, "1.1.0"), marker: { kind: "target", version: "1.1.0" } },
  PICKAXE: { head: h(7, "1.2.2"), tail: { skip: "not-unique" }, marker: { kind: "ghost", names: "1.3.0" } },
};

test("classifyBullet: one fixture per STATUSES member (L29), and the classifier's range is closed over the set (L36)", () => {
  assert.deepEqual(Object.keys(STATUS_FIXTURES).sort(), [...core.STATUSES].sort());
  for (const s of core.STATUSES) assert.equal(core.classifyBullet({ ...STATUS_FIXTURES[s], untouched: UNTOUCHED }), s, s);
  assert.equal(
    core.classifyBullet({ head: h(3, "1.1.0"), tail: null, marker: { kind: "target", version: "1.2.1" }, untouched: UNTOUCHED }),
    "CONFLICT"
  );
  assert.equal(core.classifyBullet({ head: h(3, "1.1.0"), tail: null, marker: { kind: "none" }, untouched: UNTOUCHED }), "PICKAXE");
});

test("classifyBullet precedence follows STATUSES order: DRIFTED outranks every marker verdict", () => {
  const base = { head: h(2, "1.1.0"), tail: h(6, "1.2.1"), untouched: UNTOUCHED };
  for (const marker of [
    { kind: "multi", names: ["a", "b"] },
    { kind: "nontarget", names: "1.2.0" },
    { kind: "target", version: "1.1.0" },
    { kind: "none" },
  ])
    assert.equal(core.classifyBullet({ ...base, marker }), "DRIFTED");
});

// ── Overrides ────────────────────────────────────────────────────────────────────────────────────

function classifiedFixture() {
  const b = (line, text) => ({ line, text, group: "### Added", order: line });
  return [
    { bullet: b(1, "- auto"), probe: "auto", status: "AGREE", head: h(3, "1.1.0") },
    { bullet: b(2, "- unreleased"), probe: "unreleased", status: "PICKAXE", head: { sha: sha(9), version: null } },
    { bullet: b(3, "- drifted"), probe: "drifted", status: "DRIFTED", head: h(2, "1.1.0") },
  ];
}
const OV = {
  probe: "drifted",
  status: "DRIFTED",
  version: "1.1.0",
  evidence: { sha: "0000002", reason: "introduced at 2; tail edited at 6" },
};

test("applyOverrides: auto statuses assign from the head (null → Unreleased); flagged ones only from a matching override", () => {
  const t = core.buildVersionTable(ROWS);
  const c = classifiedFixture();
  const a = core.applyOverrides(c, [OV], t, UNTOUCHED);
  assert.deepEqual(
    c.map((x) => a.get(x.bullet)),
    ["1.1.0", "Unreleased", "1.1.0"]
  );
});

test("applyOverrides refusals — missing, stale, duplicate, mismatched, bad version, bad shape", () => {
  const t = core.buildVersionTable(ROWS);
  const c = classifiedFixture();
  expectHalt(() => core.applyOverrides(c, [], t, UNTOUCHED), "OVERRIDE_MISSING");
  expectHalt(() => core.applyOverrides(c, [OV, { ...OV, probe: "auto", status: "DRIFTED" }], t, UNTOUCHED), "OVERRIDE_STALE");
  expectHalt(() => core.applyOverrides(c, [OV, { ...OV, probe: "matches nothing" }], t, UNTOUCHED), "OVERRIDE_STALE");
  expectHalt(() => core.applyOverrides(c, [OV, OV], t, UNTOUCHED), "OVERRIDE_DUPLICATE");
  expectHalt(() => core.applyOverrides(c, [{ ...OV, status: "CONFLICT" }], t, UNTOUCHED), "OVERRIDE_STATUS_MISMATCH");
  for (const version of ["1.2.0", "1.0.0", "9.9.9"])
    expectHalt(() => core.applyOverrides(c, [{ ...OV, version }], t, UNTOUCHED), "OVERRIDE_BAD_VERSION");
  const badShapes = [
    null,
    { ...OV, probe: "" },
    { ...OV, status: "AGREE" },
    { ...OV, status: "NOPE" },
    { ...OV, version: 1 },
    { ...OV, evidence: null },
    { ...OV, evidence: { sha: "zz", reason: "r" } },
    { ...OV, evidence: { sha: "0000002", reason: "  " } },
  ];
  for (const o of badShapes) expectHalt(() => core.applyOverrides(c, [o], t, UNTOUCHED), "OVERRIDE_BAD_SHAPE");
  expectHalt(() => core.applyOverrides(c, "nope", t, UNTOUCHED), "OVERRIDE_BAD_SHAPE");
});

// ── Placeholders ─────────────────────────────────────────────────────────────────────────────────

test("placeholders: every base × suffix combination renders, matches its form, and matches the closed line regex (L29/L36)", () => {
  const t = core.buildVersionTable(ROWS);
  const plain = t.byVersion.get("1.2.2");
  const reverted = t.byVersion.get("1.2.0");
  const relanded = [{ earlier: sha(4), intro: sha(6), version: "1.2.1" }];
  const cases = [
    { v: plain, opts: { windowTouches: [], relanded: [] }, form: "recorded-none" },
    { v: plain, opts: { windowTouches: [sha(7), sha(8)], relanded: [] }, form: "none-filed" },
    { v: reverted, opts: { windowTouches: [], relanded: [] }, form: "recorded-none" },
    { v: reverted, opts: { windowTouches: [sha(4)], relanded }, form: "none-filed" },
  ];
  const seenForms = new Set();
  for (const { v, opts, form } of cases) {
    const line = core.placeholderFor(v, opts);
    assert.match(line, core.PLACEHOLDER_FORMS[form]);
    for (const [other, re] of Object.entries(core.PLACEHOLDER_FORMS)) if (other !== form) assert.doesNotMatch(line, re);
    assert.match(line, core.PLACEHOLDER_LINE_RE);
    seenForms.add(form);
  }
  assert.deepEqual([...seenForms].sort(), Object.keys(core.PLACEHOLDER_FORMS).sort());
  const s = (n) => sha(n).slice(0, 7);
  assert.equal(
    core.placeholderFor(reverted, { windowTouches: [sha(4)], relanded }),
    `- No entry in this file is filed under this version (bump commit ${s(4)}); CHANGELOG.md changed in its window at ${s(4)}. Reverted by ${s(5)} on 2026-01-05. An entry added at ${s(4)} was re-landed in ${s(6)} and is filed under [1.2.1].`
  );
  assert.equal(
    core.placeholderFor(plain, { windowTouches: [], relanded: [] }),
    `- No CHANGELOG entry was recorded for this version (bump commit ${s(8)}).`
  );
  assert.doesNotMatch("- No CHANGELOG entry was recorded for this version (bump commit 0000008). Extra.", core.PLACEHOLDER_LINE_RE);
});

// ── Render + invariants ──────────────────────────────────────────────────────────────────────────

const ENTRY = { group: "### Changed", text: "- 2026-01-09: the migration's own entry." };
const INPUT =
  PRE +
  `## [Unreleased]\n\n${INTRO}\n` +
  "### Fixed\n\n- fix for 1.2.1\n\n- fix for 1.1.0\n\n" +
  "### Added\n\n- add for 1.1.0 first\n\n- add for 1.2.2\n\n- add for 1.1.0 second\n\n" +
  `${DROP}\n\n` +
  "### Custom\n\n- custom for 1.2.2\n\n" +
  "## [1.1.9] - 2026-01-02\n\n### Changed — BREAKING\n\n- breaking from a ghost section\n\n" +
  "## [1.0.0] - 2026-01-01\n\n### Added\n\n- The first cut.\n";
const TARGETS = {
  "- fix for 1.2.1": "1.2.1",
  "- fix for 1.1.0": "1.1.0",
  "- add for 1.1.0 first": "1.1.0",
  "- add for 1.2.2": "1.2.2",
  "- add for 1.1.0 second": "1.1.0",
  "- custom for 1.2.2": "1.2.2",
  "- breaking from a ghost section": "1.1.0",
};

function world(overrides = {}) {
  const table = core.buildVersionTable(ROWS);
  const parsed = core.parseChangelog(INPUT, { allowDrop: [DROP], untouched: UNTOUCHED });
  const assignment = new Map(parsed.bullets.map((b) => [b, TARGETS[b.text]]));
  const placeholders = new Map([["1.2.0", core.placeholderFor(table.byVersion.get("1.2.0"), { windowTouches: [sha(4)], relanded: [] })]]);
  const w = {
    table,
    parsed,
    assignment,
    placeholders,
    entry: ENTRY,
    untouched: UNTOUCHED,
    allowDrop: [DROP],
    skillsVersion: "1.2.2",
    ...overrides,
  };
  w.outText = core.renderChangelog(w);
  return w;
}

test("render: sections descend, groups follow TYPE_ORDER then first-seen, bullets keep order, ghost section folded, tail verbatim", () => {
  const { outText } = world();
  const s = (n) => sha(n).slice(0, 7);
  const expected =
    PRE +
    `## [Unreleased]\n\n${INTRO}\n### Changed\n\n- 2026-01-09: the migration's own entry.\n\n` +
    "## [1.2.2] - 2026-01-08\n\n### Added\n\n- add for 1.2.2\n\n### Custom\n\n- custom for 1.2.2\n\n" +
    "## [1.2.1] - 2026-01-06\n\n### Fixed\n\n- fix for 1.2.1\n\n" +
    `## [1.2.0] - 2026-01-04\n\n- No entry in this file is filed under this version (bump commit ${s(4)}); CHANGELOG.md changed in its window at ${s(4)}. Reverted by ${s(5)} on 2026-01-05.\n\n` +
    "## [1.1.0] - 2026-01-03\n\n### Changed — BREAKING\n\n- breaking from a ghost section\n\n### Added\n\n- add for 1.1.0 first\n\n- add for 1.1.0 second\n\n### Fixed\n\n- fix for 1.1.0\n\n" +
    "## [1.0.0] - 2026-01-01\n\n### Added\n\n- The first cut.\n";
  assert.equal(outText, expected);
});

test("render refusals: no [Unreleased]; intro text in a section that is being dissolved", () => {
  const table = core.buildVersionTable(ROWS);
  const noUnrel = core.parseChangelog(PRE + "## [1.2.2] - 2026-01-08\n\n### Added\n\n- x\n");
  const empty = { table, assignment: new Map(), placeholders: new Map(), entry: ENTRY, untouched: UNTOUCHED };
  expectHalt(() => core.renderChangelog({ ...empty, parsed: noUnrel }), "NO_UNRELEASED");
  const lost = core.parseChangelog(
    PRE + "## [Unreleased]\n\n### Added\n\n- x\n\n## [1.1.9] - 2026-01-02\n\n<!-- kept? -->\n\n### Added\n\n- y\n"
  );
  expectHalt(() => core.renderChangelog({ ...empty, parsed: lost }), "INTRO_CONTENT_LOST");
});

test("invariants: the untampered render is GREEN on every member (the non-vacuity control, L34)", () => {
  const w = world();
  const r = core.checkInvariants(w);
  assert.deepEqual(
    r.map((x) => x.id),
    core.INVARIANTS
  );
  for (const x of r) assert.ok(x.ok, `${x.id}: ${x.detail}`);
  assert.equal(core.assertInvariants(r), r);
});

// One tamper per INVARIANTS member (L29). Each names the member it must turn RED.
const swapLines = (text, a, b) => text.replace(a, "\u0000").replace(b, a).replace("\u0000", b);
const TAMPERS = {
  NONEMPTY_PARSE: (w) => {
    const parsed = core.parseChangelog(
      PRE + "## [Unreleased]\n\n### Added\n\n" + `${DROP}\n\n## [1.0.0] - 2026-01-01\n\n### Added\n\n- The first cut.\n`,
      {
        allowDrop: [DROP],
        untouched: UNTOUCHED,
      }
    );
    const x = { ...w, parsed, assignment: new Map() };
    return { ...x, outText: core.renderChangelog(x) };
  },
  BULLET_MULTISET: (w) => ({ ...w, outText: w.outText.replace("- add for 1.2.2\n\n", "") }),
  NO_DUPLICATES: (w) => ({ ...w, outText: w.outText.replace("- add for 1.2.2\n", "- add for 1.2.2\n\n- add for 1.2.2\n") }),
  NO_GHOST_SECTION: (w) => ({
    ...w,
    outText: w.outText.replace("## [1.2.1] - 2026-01-06", "## [1.2.1] - 2026-01-06\n\n## [1.1.5] - 2026-01-06"),
  }),
  ONE_SECTION_PER_VERSION: (w) => ({ ...w, outText: w.outText.replace(/## \[1\.2\.0\][^\n]*\n\n[^\n]*\n\n/, "") }),
  HEADINGS_DESCEND: (w) => ({ ...w, outText: swapLines(w.outText, "## [1.2.2] - 2026-01-08", "## [1.2.1] - 2026-01-06") }),
  DATES_NONINCREASING: (w) => ({ ...w, outText: w.outText.replace("## [1.1.0] - 2026-01-03", "## [1.1.0] - 2026-02-01") }),
  DATES_MATCH_TABLE: (w) => ({ ...w, outText: w.outText.replace("## [1.2.1] - 2026-01-06", "## [1.2.1] - 2026-01-07") }),
  NEWEST_IS_SKILLS_VERSION: (w) => ({ ...w, skillsVersion: "1.2.1" }),
  DROPPED_EXACT: (w) => ({ ...w, allowDrop: [] }),
  PREAMBLE_INTRO_TAIL_BYTES: (w) => ({ ...w, outText: w.outText.replace("Preamble text.", "Preamble text!") }),
  ASSIGNMENT_ON_REPARSE: (w) => ({
    ...w,
    outText: w.outText
      .replace("\n\n### Fixed\n\n- fix for 1.2.1\n", "")
      .replace("### Added\n\n- add for 1.2.2", "### Added\n\n- add for 1.2.2\n\n### Fixed\n\n- fix for 1.2.1"),
  }),
  GROUP_ORDER: (w) => ({
    ...w,
    outText: w.outText.replace(
      "### Added\n\n- add for 1.1.0 first\n\n- add for 1.1.0 second\n\n### Fixed\n\n- fix for 1.1.0",
      "### Fixed\n\n- fix for 1.1.0\n\n### Added\n\n- add for 1.1.0 first\n\n- add for 1.1.0 second"
    ),
  }),
  RELATIVE_ORDER: (w) => ({ ...w, outText: swapLines(w.outText, "- add for 1.1.0 first", "- add for 1.1.0 second") }),
  PLACEHOLDERS_WELL_FORMED: (w) => ({ ...w, outText: w.outText.replace("Reverted by", "Reverted  by") }),
};

test("invariants: one tamper per INVARIANTS member turns THAT member RED (L29 — the set is iterated, not sampled)", () => {
  assert.deepEqual(Object.keys(TAMPERS).sort(), [...core.INVARIANTS].sort());
  for (const id of core.INVARIANTS) {
    const r = core.checkInvariants(TAMPERS[id](world()));
    assert.equal(r.find((x) => x.id === id).ok, false, `${id} should be RED under its tamper`);
    expectHalt(() => core.assertInvariants(r), "INVARIANT_FAILED");
  }
  // DROPPED_EXACT's OUTPUT half (review finding): a dropped line that reappears in the output — here as a
  // lazy continuation, which re-parses — is RED even though the input half still agrees.
  const w = world();
  const back = core.checkInvariants({ ...w, outText: w.outText.replace("- add for 1.2.2\n", `- add for 1.2.2\n${DROP}\n`) });
  assert.equal(back.find((x) => x.id === "DROPPED_EXACT").ok, false);
  assert.match(back.find((x) => x.id === "DROPPED_EXACT").detail, /1 present in the output/);
});

test("invariants: an output that does not re-parse is RED on every member", () => {
  const w = world();
  const r = core.checkInvariants({
    ...w,
    outText: w.outText.replace("own entry.\n\n## [1.2.2]", "own entry.\n\norphan after a blank\n\n## [1.2.2]"),
  });
  assert.ok(r.every((x) => !x.ok));
  assert.equal(r.length, core.INVARIANTS.length);
});

// ── Positional references ────────────────────────────────────────────────────────────────────────

test("positionalMentions: a confirmed reference must be right in the OLD order and wrong in the NEW one — checked, not trusted", () => {
  const w = world();
  // Input order: Fixed [fix 1.2.1, fix 1.1.0], Added [add 1.1.0 first, add 1.2.2, add 1.1.0 second], …
  // Output order: [1.2.2] add 1.2.2 … [1.2.1] fix 1.2.1 … [1.1.0] add first, add second, fix 1.1.0.
  const text = INPUT.replace("- add for 1.2.2", "- add for 1.2.2, after the entry above")
    .replace("- fix for 1.1.0", "- fix for 1.1.0, like the entry above")
    .replace("- add for 1.1.0 first", "- add for 1.1.0 first, before the entry below");
  const parsed = core.parseChangelog(text, { allowDrop: [DROP], untouched: UNTOUCHED });
  const assignment = new Map(parsed.bullets.map((b) => [b, TARGETS[b.text.split(",")[0]]]));
  const outText = core.renderChangelog({ ...w, parsed, assignment });
  const known = (phrase, referent) => [{ phrase, referent }];
  // Broken by the move: "add for 1.1.0 first" was above "add for 1.2.2"; it now sits in [1.1.0], below it.
  const r = core.positionalMentions(parsed.bullets, known("after the entry above", "add for 1.1.0 first"), outText);
  assert.deepEqual(
    r.confirmed.map((c) => [c.word, c.bullet.text.split(",")[0], c.referent.text.split(",")[0]]),
    [["above", "- add for 1.2.2", "- add for 1.1.0 first"]]
  );
  assert.deepEqual(
    r.candidates.map((b) => b.text.split(",")[0]),
    ["- fix for 1.1.0", "- add for 1.1.0 first", "- add for 1.2.2"]
  );
  // Still right after the move ([1.2.1] sits above [1.1.0]) → refused: it is not broken.
  expectHalt(
    () => core.positionalMentions(parsed.bullets, known("like the entry above", "fix for 1.2.1"), outText),
    "POSITIONAL_UNMATCHED"
  );
  // Already wrong before the move ("fix for 1.2.1" was ABOVE "add for 1.1.0 first", not below) → refused.
  expectHalt(
    () => core.positionalMentions(parsed.bullets, known("before the entry below", "fix for 1.2.1"), outText),
    "POSITIONAL_UNMATCHED"
  );
  // Not unique / absent / no positional word → refused.
  expectHalt(() => core.positionalMentions(parsed.bullets, known("the entry", "fix for 1.2.1"), outText), "POSITIONAL_UNMATCHED");
  expectHalt(
    () => core.positionalMentions(parsed.bullets, known("after the entry above", "no such entry"), outText),
    "POSITIONAL_UNMATCHED"
  );
  expectHalt(() => core.positionalMentions(parsed.bullets, known("add for 1.2.2", "fix for 1.2.1"), outText), "POSITIONAL_UNMATCHED");
  // A bullet missing from the output cannot be ranked → refused.
  expectHalt(
    () => core.positionalMentions(parsed.bullets, known("after the entry above", "add for 1.1.0 first"), "\n"),
    "POSITIONAL_UNMATCHED"
  );
});

// ── The entry + the report ───────────────────────────────────────────────────────────────────────

function classifiedWorld() {
  const w = world();
  const byText = (t) => w.parsed.bullets.find((b) => b.text === t);
  const c = (text, status, marker, head, tail) => ({
    bullet: byText(text),
    probe: text.slice(2),
    status,
    markers: marker.kind === "none" ? [] : [{ form: "pair" }],
    marker,
    head,
    headEarlier: [],
    tail,
  });
  const classified = [
    c("- fix for 1.2.1", "CONFLICT", { kind: "nontarget", names: "1.2.0" }, h(6, "1.2.1"), h(6, "1.2.1")),
    c("- fix for 1.1.0", "AGREE", { kind: "target", version: "1.1.0" }, h(3, "1.1.0"), h(2, "1.1.0")),
    c("- add for 1.1.0 first", "PICKAXE", { kind: "ghost", names: "1.0.9" }, h(2, "1.1.0"), { skip: "short" }),
    c("- add for 1.2.2", "PICKAXE", { kind: "none" }, h(7, "1.2.2"), null),
    c("- add for 1.1.0 second", "MULTI", { kind: "multi", names: ["1.1.0", "1.2.1"] }, h(3, "1.1.0"), { skip: "not-unique" }),
    c("- custom for 1.2.2", "PICKAXE", { kind: "target", version: "1.2.1" }, h(8, "1.2.2"), h(8, "1.2.2")),
    c("- breaking from a ghost section", "PICKAXE", { kind: "none" }, h(3, "1.1.0"), h(3, "1.1.0")),
  ];
  return { w, classified };
}

// The untouched section's history. SAME: the value was first set on the first-parent chain itself.
// BRANCH: first set on a side branch that a later merge brought onto main (the live 1.0.0 shape: 126e2b3,
// merged by 8753940) — the case the first-parent table alone misdated before the review caught it.
const HISTORY_SAME = {
  version: "1.0.0",
  headingDate: "2026-01-01",
  firstEver: { sha: sha(1), date: "2026-01-01", value: "1.0.0" },
  firstParent: { sha: sha(1), date: "2026-01-01" },
};
const HISTORY_BRANCH = {
  version: "1.0.0",
  headingDate: "2026-06-23",
  firstEver: { sha: sha(0x126), date: "2026-06-23", value: "1.0.0" },
  firstParent: { sha: sha(0x875), date: "2026-06-24" },
};
const ENTRY_BASE = {
  date: "2026-01-09",
  bulletCount: 1,
  filledCount: 1,
  overrideCount: 0,
  stale: [],
  removedHeadings: [],
  placeholderVersions: [],
  dropped: [],
  history: HISTORY_SAME,
  unchangedLines: 14,
};

test("staleMentions + renderEntry: every stale kind is named, counts come from the data", () => {
  const { w, classified } = classifiedWorld();
  const stale = core.staleMentions(classified, w.assignment);
  assert.deepEqual(
    stale.map((s) => [s.kind, s.names, s.filed]),
    [
      ["stale", "1.2.0", "1.2.1"],
      ["ghost", "1.0.9", "1.1.0"],
      ["multi", "1.1.0, 1.2.1", "1.1.0"],
      ["stale", "1.2.1", "1.2.2"],
    ]
  );
  const e = core.renderEntry({
    ...ENTRY_BASE,
    bulletCount: 7,
    filledCount: 4,
    overrideCount: 2,
    stale,
    removedHeadings: ["## [1.1.9] - 2026-01-02"],
    placeholderVersions: ["1.2.0"],
    dropped: [DROP],
    positional: { candidates: [1, 2, 3], confirmed: [1] },
  });
  assert.match(e, /^- 2026-01-09: \*\*/);
  assert.ok(!e.includes("\n"), "the entry is one line");
  for (const needle of [
    "The 7 entries",
    "into 4 version sections",
    "2 needed a reviewed override",
    "1.0.9 (filed under 1.1.0)",
    "an entry naming 1.2.0 is filed under 1.2.1",
    "`## [1.1.9] - 2026-01-02`",
    "`[1.2.0]` keeps a section",
    "(`> > > dropped marker …`)",
    "`[1.0.0]` is unchanged. Its heading date (2026-01-01) is the date `0000001` first set `SKILLS_VERSION` to 1.0.0. No git tag",
    "cite past line 14 elsewhere in the repo now points at moved text",
    "giving each bump its own section is the follow-up `changelog-per-pr`",
    '3 entries still say "above" or "below"',
    "at least 1 now point the wrong way",
  ])
    assert.ok(e.includes(needle), needle);
  const bare = core.renderEntry(ENTRY_BASE);
  assert.ok(!bare.includes("heading is gone") && !bare.includes("placeholder") && !bare.includes("was dropped") && !bare.includes("above"));
});

test("renderEntry: the untouched section's history — first set on a merged branch, and a heading date that disagrees", () => {
  const branch = core.renderEntry({ ...ENTRY_BASE, history: HISTORY_BRANCH });
  assert.ok(
    branch.includes(
      "Its heading date (2026-06-23) is the date `0000126` first set `SKILLS_VERSION` to 1.0.0, on a branch that reached `main` at `0000875` (2026-06-24)."
    )
  );
  const off = core.renderEntry({ ...ENTRY_BASE, history: { ...HISTORY_SAME, headingDate: "2026-01-02" } });
  assert.ok(off.includes("Its heading date (2026-01-02) differs from the date `0000001` first set"));
  assert.ok(!off.includes("on a branch"));
});

test("outOfScopeFilings groups entries whose head is an untouched version, and the entry names them (GRILL G2)", () => {
  const b = (line) => ({ line, text: `- e${line}` });
  const x = [b(1), b(2), b(3)];
  const classified = [
    { bullet: x[0], head: h(1, "1.0.0") },
    { bullet: x[1], head: h(1, "1.0.0") },
    { bullet: x[2], head: h(3, "1.1.0") },
  ];
  const assignment = new Map(x.map((y) => [y, "1.1.0"]));
  const groups = core.outOfScopeFilings(classified, assignment, UNTOUCHED);
  assert.deepEqual(groups, [{ sha: sha(1), version: "1.0.0", filed: "1.1.0", count: 2 }]);
  assert.ok(
    core
      .renderEntry({ ...ENTRY_BASE, outOfScope: groups })
      .includes(
        "2 entries that reach `main` in `0000001`, the first-parent commit where `SKILLS_VERSION` 1.0.0 first appears, are filed under `[1.1.0]` by a reviewed override, because `[1.0.0]` is kept byte-for-byte (the evidence is in `MIGRATION.md`)."
      )
  );
  assert.ok(
    core
      .renderEntry({ ...ENTRY_BASE, outOfScope: [{ ...groups[0], count: 1 }] })
      .includes(
        "One entry that reaches `main` in `0000001`, the first-parent commit where `SKILLS_VERSION` 1.0.0 first appears, is filed under `[1.1.0]`"
      )
  );
  assert.deepEqual(core.outOfScopeFilings([{ bullet: x[2], head: { sha: null, version: null } }], assignment, UNTOUCHED), []);
});

test("fenceFor is longer than any back-tick run, minimum three", () => {
  assert.equal(core.fenceFor("plain"), "```");
  assert.equal(core.fenceFor("has ```` four"), "`````");
});

test("renderReport: every section present, the status tally names every member, rows are fenced DATA", () => {
  const { w, classified } = classifiedWorld();
  const overrides = [
    { probe: "fix for 1.2.1", status: "CONFLICT", version: "1.2.1", evidence: { sha: "0000006", reason: "re-landed at 6" } },
  ];
  const base = {
    sha: sha(9),
    skillsVersion: "1.2.2",
    table: w.table,
    untouched: UNTOUCHED,
    history: HISTORY_BRANCH,
    positional: { candidates: [], confirmed: [] },
  };
  const report = core.renderReport({
    ...base,
    classified,
    assignment: w.assignment,
    overrides,
    placeholders: w.placeholders,
    stale: core.staleMentions(classified, w.assignment),
    removedHeadings: ["## [1.1.9] - 2026-01-02"],
    dropped: w.parsed.dropped,
    invariants: core.checkInvariants(w),
    sectionCount: 4,
    filledCount: 3,
    unread: new Map(classified.map((c, k) => [c.bullet, k === 0 ? ["SKILLS_VERSION had reached 1.1.0"] : []])),
    bumpShas: new Set([sha(3), sha(6), sha(8)]),
  });
  for (const heading of [
    "## Invariants",
    "## Version table",
    "## Ghost versions",
    "## Other stale version text",
    "## Positional references",
    "## SKILLS_VERSION mentions that no marker form reads",
    "## Entries introduced by a commit that did not change SKILLS_VERSION",
    "## Overrides",
    "## Placeholders",
    "## Dropped lines",
    "## Head/tail commit disagreements",
    "## Reported, not changed",
    "## Per-bullet assignment",
    "## Bounds (P0)",
  ])
    assert.ok(report.includes(heading), heading);
  for (const s of core.STATUSES) assert.match(report, new RegExp(`${s} \\d+`));
  for (const f of Object.keys(core.MARKER_FORMS)) assert.match(report, new RegExp(`${f} \\d+`));
  assert.match(report, /Unassigned bullets: 0\./);
  assert.match(report, /REVERTED by 0000005 on 2026-01-05/);
  assert.match(report, /re-set at 0000005 \(not a new version\)/);
  assert.match(report, /Text names `1\.0\.9`, shipped as `1\.1\.0`/);
  assert.match(report, /Input line \d+, \*\*CONFLICT\*\* → filed under `1\.2\.1`/);
  assert.match(report, /head 0000003, tail 0000002, both → 1\.1\.0/);
  assert.match(report, /line 12: SKILLS_VERSION had reached 1\.1\.0/);
  assert.match(report, /2 entries\. Each is filed under the NEXT bump/); // heads at 2 and 7 are not in bumpShas
  assert.match(report, /Sections generated: 4 \(3 hold entries; 1 hold only a placeholder\)/);
  assert.ok(report.includes("Pinned input: `0000009"), "the SHA binds the report; no ref name is rendered");
  // The override's free-text reason is quoted inside a fence as DATA (review finding, P2).
  assert.ok(report.includes("Evidence `0000006`:\n\n```text\nre-landed at 6\n```"));
  assert.match(
    report,
    /first set anywhere in history by `0000126` on 2026-06-23 .* first appears at `0000875` on 2026-06-24.* The heading date matches the commit that set the value/
  );
  assert.ok(!/[ \t]$/m.test(report), "no trailing whitespace (prettier would strip it inside fences)");
  const empty = core.renderReport({
    ...base,
    classified: [],
    assignment: new Map(),
    overrides: [],
    placeholders: new Map(),
    stale: [],
    removedHeadings: [],
    dropped: [],
    invariants: [],
    sectionCount: 0,
    filledCount: 0,
    history: { ...HISTORY_BRANCH, headingDate: "2026-06-22" },
    unread: new Map(),
    bumpShas: new Set(),
  });
  assert.equal((empty.match(/^None\.$/gm) || []).length, 7);
  assert.match(empty, /The heading date does NOT match the commit that set the value/);
});

test("relandedIn: an EARLIER introduction inside the window (lo, hi] — and only there", () => {
  const b = { line: 1, text: "- x" };
  const classified = [{ bullet: b, head: h(6, "1.2.1"), headEarlier: [sha(4)] }];
  const assignment = new Map([[b, "1.2.1"]]);
  assert.deepEqual(core.relandedIn({ classified, assignment, indexOf: IDX, lo: 3, hi: 4 }), [
    { earlier: sha(4), intro: sha(6), version: "1.2.1" },
  ]);
  assert.deepEqual(core.relandedIn({ classified, assignment, indexOf: IDX, lo: 4, hi: 5 }), []); // lo is exclusive
  assert.deepEqual(core.relandedIn({ classified, assignment, indexOf: IDX, lo: 1, hi: 3 }), []); // hi is inclusive, 4 > 3
});

// ── Closure over HALT_CODES (L29/L36) — kept LAST: it reads what the tests above observed ───────────

test("every HALT_CODES member is exercised by some test above, and no test observed a code outside the set", () => {
  for (const c of seenHalts) assert.ok(core.HALT_CODES.includes(c), c);
  assert.deepEqual(
    core.HALT_CODES.filter((c) => !seenHalts.has(c)),
    []
  );
});
