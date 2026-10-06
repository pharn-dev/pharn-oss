// .dev/floor/installed-skills-consumers.test.mjs — the consumer/mode matrix for the installed-skill catalogue
// (6.47.0, selective-skill-reads), pinned over the command TEXT.
//
// WHY IT LIVES IN .dev/. It reads `.claude/commands/` and the dev-only fixtures under
// `.dev/floor/test-fixtures/skill-selection/`, and it imports `pharn/floor/installed-skills-core.mjs`. The
// dependency may point `.dev/` → `pharn/`, never the reverse, because an install ships `pharn/floor/`
// without `.dev/` (the same reason entry-point-guard.test.mjs lives here).
//
// HONEST SCOPE (P0). Every pin over command text is PRESENCE or ABSENCE of a pinned line inside a named
// section. That a run follows the section is advisory — nothing here executes a stage. The matrix it pins:
//
//   consumer                    | catalogue line | selection skill | legacy fallback line
//   /pharn-build Step 2b        | yes            | yes             | yes
//   full /pharn-grill Step 3    | yes            | yes             | yes
//   /pharn-grill --quick        | no             | no              | no
//   /pharn-grill --floor-only   | no             | no              | no
//   /pharn-review Step 3b       | no (the orchestrator reads neither catalogue nor bodies)
//   /pharn-review Step 4 (lens) | yes            | yes             | yes
//   every other product command | no             | no              | no
//
// The last block pins that each committed eval case's embedded catalogue is byte-for-byte what the real
// helper prints over that case's fixture repo, so the evaluation measures the catalogue consumers actually get.
//
// The fixture skills are stored under `<case>/skills/`, NOT `<case>/.claude/skills/`: Claude Code loads any
// nested `.claude/skills/*/SKILL.md` as a live skill of this repo's own sessions (6.47.0 review, A2). Each case
// is materialized into a scratch repo (`skills/` → `.claude/skills/`) before the helper runs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, mkdtempSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { buildCatalogue } from "../../pharn/floor/installed-skills-core.mjs";

/** Copy a fixture case into a scratch repo with its skills under `.claude/skills/`; returns the scratch root. */
function materialize(caseDir) {
  const root = mkdtempSync(join(tmpdir(), "pharn-skillsel-"));
  for (const entry of readdirSync(caseDir)) {
    if (entry === "skills") continue;
    cpSync(join(caseDir, entry), join(root, entry), { recursive: true });
  }
  mkdirSync(join(root, ".claude"), { recursive: true });
  cpSync(join(caseDir, "skills"), join(root, ".claude", "skills"), { recursive: true });
  return root;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CMDS = join(ROOT, ".claude", "commands");
const CATALOGUE_LINE = "node pharn/floor/catalogue-installed-skills.mjs .";
const LEGACY_LINE = "node pharn/floor/scan-installed-skills.mjs .";
const SKILL = "pharn/pharn-core/installed-skill-selection/installed-skill-selection.md";
const SKILL_DIR = join(ROOT, "pharn", "pharn-core", "installed-skill-selection");
const FIXTURES = join(ROOT, ".dev", "floor", "test-fixtures", "skill-selection");

const read = (f) => readFileSync(join(CMDS, f), "utf8");

/** The text from the heading line starting with `start` up to the next heading of the same or higher level. */
function section(text, start) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.startsWith(start));
  assert.notEqual(i, -1, `section not found: ${start}`);
  const level = start.match(/^#+/)[0].length;
  let j = i + 1;
  while (j < lines.length && !(lines[j].match(/^#+ /) && lines[j].match(/^#+/)[0].length <= level)) j++;
  return lines.slice(i, j).join("\n");
}

/** The paragraph starting with `start` (up to the next blank line followed by a heading or a bold paragraph). */
function paragraphFrom(text, start, until) {
  const i = text.indexOf(start);
  assert.notEqual(i, -1, `paragraph not found: ${start}`);
  const j = text.indexOf(until, i + start.length);
  return text.slice(i, j === -1 ? undefined : j);
}

const SELECTING = [
  ["pharn-build.md Step 2b", () => section(read("pharn-build.md"), "## Step 2b — ")],
  [
    "pharn-grill.md Step 3 installed-skills paragraph",
    () => paragraphFrom(read("pharn-grill.md"), "**Installed-skills consideration", "## Step 3b — "),
  ],
  ["pharn-review.md Step 4", () => section(read("pharn-review.md"), "## Step 4 — ")],
];

for (const [label, get] of SELECTING) {
  test(`✧ ${label}: runs the catalogue line, cites the selection skill, keeps the legacy fallback line`, () => {
    const s = get();
    assert.ok(s.includes(CATALOGUE_LINE), "the pinned catalogue line (L22)");
    assert.ok(s.includes(SKILL), "the selection skill path");
    assert.ok(s.includes(LEGACY_LINE), "the legacy fallback line");
    assert.ok(s.includes("installed-skills/1"), "the catalogue format check");
    assert.ok(/`unsafe`/.test(s), "unsafe entries are named as never read");
  });
}

test("✧ /pharn-build selects against PLAN.md and the code, never SPEC.md", () => {
  assert.match(section(read("pharn-build.md"), "## Step 2b — "), /never `SPEC\.md`/);
});

test("✧ /pharn-grill --quick and --floor-only still skip installed skills entirely", () => {
  const g = read("pharn-grill.md");
  for (const start of ["## `--quick` mode", "## `--floor-only` mode"]) {
    const s = section(g, start);
    assert.ok(!s.includes("catalogue-installed-skills"), `${start} must not run the catalogue`);
    assert.ok(!s.includes("scan-installed-skills"), `${start} must not run the scanner`);
    assert.ok(!s.includes(SKILL), `${start} must not read the selection skill`);
  }
  assert.match(section(g, "## `--quick` mode"), /no installed-skills scan/);
});

test("✧ /pharn-review's orchestrator (Step 3b) reads neither the catalogue nor any SKILL.md, and selection never decides a spawn", () => {
  const s = section(read("pharn-review.md"), "## Step 3b — ");
  assert.ok(!s.includes(CATALOGUE_LINE) && !s.includes(LEGACY_LINE), "no discovery line in the orchestrator's step");
  assert.match(s, /read neither the catalogue nor any `SKILL\.md`/);
  assert.match(s, /never decides whether a lens spawns/);
  assert.match(s, /The suppression asymmetry/, "the suppression-risk block stays");
});

test("✧ no other product command runs either skill helper or cites the selection skill (routing untouched)", () => {
  const allowed = new Set(["pharn-build.md", "pharn-grill.md", "pharn-review.md"]);
  const offenders = [];
  for (const f of readdirSync(CMDS).filter((n) => n.startsWith("pharn-") && !n.startsWith("pharn-dev-") && n.endsWith(".md"))) {
    if (allowed.has(f)) continue;
    const t = read(f);
    if (t.includes("catalogue-installed-skills") || t.includes("scan-installed-skills") || t.includes(SKILL)) offenders.push(f);
  }
  assert.deepEqual(offenders, []);
});

test("✧ the selection skill states the conservative rules a consumer must not lose", () => {
  const t = readFileSync(join(SKILL_DIR, "installed-skill-selection.md"), "utf8");
  for (const must of [
    /role: skill/,
    /Never read an `unsafe` entry/,
    /every entry whose `metadata` is not `ok`/,
    /When unsure, read it/,
    /There is no top-k limit/,
    /never decides whether \*\*another\*\* entry is read/,
    /Expand as you go/,
    /^skills: mode=/m,
    /never proof that a skill was loaded/,
  ]) {
    assert.match(t, must);
  }
});

// ── the eval cases measure the real catalogue ─────────────────────────────────────────────────────────

const CASES = [
  "c1-ui-copy",
  "c2-orm-wrapper",
  "c3-tenancy",
  "c4-legacy-no-frontmatter",
  "c5-misleading-metadata",
  "c6-lens-validation",
  "c7-fallback-heavy",
];

test("✧ every eval case has a case file, an expected file and a fixture repo — and nothing else is in the set", () => {
  assert.deepEqual(
    readdirSync(join(SKILL_DIR, "evals", "cases")).sort(),
    CASES.map((c) => `${c}.md`)
  );
  assert.deepEqual(
    readdirSync(join(SKILL_DIR, "evals", "expected")).sort(),
    CASES.map((c) => `${c}.md`)
  );
  assert.deepEqual(readdirSync(FIXTURES).sort(), CASES);
});

for (const c of CASES) {
  test(`✧ eval ${c}: the embedded catalogue equals the helper's output over its fixture`, () => {
    const text = readFileSync(join(SKILL_DIR, "evals", "cases", `${c}.md`), "utf8");
    const m = text.match(/```json catalogue\n([\s\S]*?)\n```/);
    assert.ok(m, "a ```json catalogue fenced block");
    assert.ok(existsSync(join(FIXTURES, c, "skills")));
    assert.ok(!existsSync(join(FIXTURES, c, ".claude")), "fixtures never sit under a harness-discovered .claude/ (A2)");
    const root = materialize(join(FIXTURES, c));
    try {
      assert.deepEqual(JSON.parse(m[1]), buildCatalogue(root));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
