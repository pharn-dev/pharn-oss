// .dev/features/changelog-sectioning/sectionize.test.mjs — end-to-end tests of the migration's git I/O
// + CLI, through a THROWAWAY git repo built in os.tmpdir() (never this repo, never the live CHANGELOG).
// The fixture history reproduces, in miniature, every shape the live migration met: a no-bump entry, a
// marker that agrees, a reverted version, an entry reverted with it and re-landed (CONFLICT), an entry
// added at one bump, removed, and re-added at a later one (the LAST introduction wins), a tail edited by a
// later commit (DRIFTED), a ghost marker, a lazy continuation line, the dropped conflict-marker line, a
// positional reference the move breaks, a version whose window never touched CHANGELOG.md, and the
// untouched [1.0.0]. Git runs isolated from the user's config (GIT_CONFIG_GLOBAL/SYSTEM=/dev/null) for
// this whole process — the fixture builder AND the in-process `run()` calls — so a signing, hooks or
// `log.showSignature` setting cannot leak in.
//
// ASSUMPTIONS, named so an old CI image fails recognisably rather than as a migration bug (GRILL G4):
// git >= 2.32 (GIT_CONFIG_GLOBAL / GIT_CONFIG_SYSTEM), git >= 2.28 (`init -b`), and an explicit
// GIT_AUTHOR_DATE / GIT_COMMITTER_DATE per commit so `%cs` — the section dates — is stable.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run, parseArgs, REPORT_PATH } from "./sectionize.mjs";
import { headProbe } from "./sectionize-core.mjs";

Object.assign(process.env, { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" });

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "sectionize.mjs");

const PRE = "# Changelog\n\nFixture preamble.\n\n";
const UNREL = "## [Unreleased]\n\n<!-- the intro comment -->\n";
const TAIL = "## [1.0.0] - 2026-01-01\n\n### Added\n\n- The first cut.\n";
const BETA = "- **Beta** arrived in a commit that did not bump the version, so the next bump owns it.";
const ETA_HEAD = "- **Eta** starts with a stable head sentence that is long enough to probe on its own.";
const ETA_OLD = "  Its original closing line is long enough to be probed as a tail as well.";
const ETA_NEW = "  Its closing line was rewritten by a later commit, which is exactly what drifts.";
const GAMMA = "- **Gamma** fixes a thing (`SKILLS_VERSION` 1.0.0 → **1.1.0**, minor) and agrees with its marker.";
const ZETA = "- **Zeta** is added at 1.1.0, removed at 1.2.0, and re-added unchanged at 1.2.1 later on.";
const EPSILON = "- **Epsilon** ships a ledger (`SKILLS_VERSION` 1.1.0 → **1.2.0**) and is reverted with its version.";
const THETA = "- **Theta** names a version that never shipped (`SKILLS_VERSION` 1.2.1 → **1.3.0**, minor), like the Beta entry above.";
const DROP = "> > > > fixture conflict marker (a line that belongs to no entry)";
const LAMBDA =
  "- **Lambda** has a lazy continuation line right below its first line of text\nthat is not indented at all, which markdown allows and the parser must keep.";

function changelog({ added = [], fixed = [], drop = false }) {
  let s = PRE + UNREL;
  if (added.length) s += "\n### Added\n\n" + added.join("\n\n") + "\n";
  if (drop) s += "\n" + DROP + "\n";
  if (fixed.length) s += "\n### Fixed\n\n" + fixed.join("\n\n") + "\n";
  return s + "\n" + TAIL;
}

// Each step: [name, date, SKILLS_VERSION, CHANGELOG content or null for "unchanged"].
const STEPS = [
  ["c1", "2026-01-01", "1.0.0", changelog({})],
  ["c2", "2026-01-02", "1.0.0", changelog({ added: [BETA, `${ETA_HEAD}\n${ETA_OLD}`] })],
  ["c3", "2026-01-03", "1.1.0", changelog({ added: [BETA, `${ETA_HEAD}\n${ETA_OLD}`, ZETA], fixed: [GAMMA] })],
  ["c4", "2026-01-04", "1.2.0", changelog({ added: [BETA, `${ETA_HEAD}\n${ETA_OLD}`, EPSILON], fixed: [GAMMA] })],
  ["c5", "2026-01-05", "1.1.0", changelog({ added: [BETA, `${ETA_HEAD}\n${ETA_OLD}`], fixed: [GAMMA] })],
  ["c6", "2026-01-06", "1.2.1", changelog({ added: [BETA, `${ETA_HEAD}\n${ETA_NEW}`, EPSILON, ZETA], fixed: [GAMMA], drop: true })],
  [
    "c7",
    "2026-01-07",
    "1.2.2",
    changelog({ added: [BETA, `${ETA_HEAD}\n${ETA_NEW}`, EPSILON, ZETA, THETA, LAMBDA], fixed: [GAMMA], drop: true }),
  ],
  ["c8", "2026-01-08", "1.2.3", null], // a bump that never touches CHANGELOG.md
];

function buildTemplate() {
  const dir = mkdtempSync(join(tmpdir(), "pharn-sectionize-tpl-"));
  const git = (...a) => execFileSync("git", ["-C", dir, ...a], { encoding: "utf8" });
  git("init", "-q", "-b", "main");
  mkdirSync(join(dir, dirname(REPORT_PATH)), { recursive: true });
  const shas = {};
  for (const [name, date, version, cl] of STEPS) {
    writeFileSync(join(dir, "SKILLS_VERSION"), version + "\n");
    if (cl !== null) writeFileSync(join(dir, "CHANGELOG.md"), cl);
    git("add", "SKILLS_VERSION", "CHANGELOG.md");
    const when = `${date}T12:00:00+00:00`;
    execFileSync(
      "git",
      ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", "commit", "-q", "-m", name],
      {
        env: { ...process.env, GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when },
      }
    );
    shas[name] = git("rev-parse", "HEAD").trim();
  }
  return { dir, shas };
}

// The fixture history is built ONCE; each test works on its own copy (a test writes the working tree).
let template = null;
after(() => template && rmSync(template.dir, { recursive: true, force: true }));
function buildRepo() {
  if (!template) template = buildTemplate();
  const dir = mkdtempSync(join(tmpdir(), "pharn-sectionize-"));
  cpSync(template.dir, dir, { recursive: true });
  return { dir, shas: template.shas };
}

function overridesFor(dir, shas, drop = []) {
  const text = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
  const probe = (bulletFirstLine) => headProbe(bulletFirstLine, text).probe;
  const all = [
    {
      probe: probe(ETA_HEAD),
      status: "DRIFTED",
      version: "1.1.0",
      evidence: { sha: shas.c2.slice(0, 7), reason: "introduced at c2; its tail was rewritten at c6" },
    },
    {
      probe: probe(EPSILON),
      status: "CONFLICT",
      version: "1.2.1",
      evidence: { sha: shas.c6.slice(0, 7), reason: "reverted with 1.2.0 at c5 and re-landed at c6" },
    },
  ].filter((o) => !drop.includes(o.status));
  const file = join(dir, "overrides.json");
  const positional = [{ phrase: "like the Beta entry above", referent: "**Beta** arrived" }];
  writeFileSync(file, JSON.stringify({ allowDrop: [DROP], positional, overrides: all }, null, 2));
  return file;
}

const section = (text, version) => {
  const start = text.indexOf(`## [${version}]`);
  assert.ok(start >= 0, `no section ${version}`);
  const next = text.indexOf("\n## [", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
};

test("parseArgs: every flag is required and exactly one mode is accepted (no defaults — L41)", () => {
  assert.deepEqual(parseArgs(["--repo", "r", "--ref", "x", "--overrides", "o.json", "--write"]), {
    repo: "r",
    ref: "x",
    overrides: "o.json",
    mode: "write",
  });
  for (const argv of [
    ["--ref", "x", "--overrides", "o", "--write"],
    ["--repo", "r", "--overrides", "o", "--verify"],
    ["--repo", "r", "--ref", "x", "--write"],
    ["--repo", "r", "--ref", "x", "--overrides", "o"],
    ["--repo", "r", "--ref", "x", "--overrides", "o", "--write", "--verify"],
    ["--repo", "--ref", "x", "--overrides", "o", "--write"],
    ["--repo", "r", "--ref", "x", "--overrides", "o", "--write", "--bogus"],
  ])
    assert.throws(() => parseArgs(argv), /needs a value|missing|exactly one|unexpected/, argv.join(" "));
});

test("the CLI maps a usage error to exit 2 and a halt to exit 1", () => {
  const usage = spawnSync(process.execPath, [SCRIPT, "--write"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /usage: sectionize\.mjs/);
  const { dir } = buildRepo();
  try {
    writeFileSync(join(dir, "empty.json"), JSON.stringify({ allowDrop: [DROP], positional: [], overrides: [] }));
    const r = spawnSync(process.execPath, [SCRIPT, "--repo", dir, "--ref", "main", "--overrides", join(dir, "empty.json"), "--write"], {
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /^HALT OVERRIDE_MISSING/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--write files every entry by the rules, over a real git history", () => {
  const { dir, shas } = buildRepo();
  try {
    const ov = overridesFor(dir, shas);
    const r = run(["--repo", dir, "--ref", "main", "--overrides", ov, "--write"]);
    assert.equal(r.code, 0, r.message);
    const out = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
    // Section order, descending; the untouched tail last and verbatim.
    const heads = [...out.matchAll(/^## \[([^\]]+)\]/gm)].map((m) => m[1]);
    assert.deepEqual(heads, ["Unreleased", "1.2.3", "1.2.2", "1.2.1", "1.2.0", "1.1.0", "1.0.0"]);
    assert.ok(out.endsWith("\n" + TAIL));
    // A no-bump commit's entry belongs to the NEXT bump.
    assert.ok(section(out, "1.1.0").includes(BETA));
    // The marker agrees.
    assert.ok(section(out, "1.1.0").includes(GAMMA));
    // Added at 1.1.0, removed, re-added at 1.2.1: the LAST introduction wins, the earliest does not.
    assert.ok(section(out, "1.2.1").includes(ZETA));
    assert.ok(!section(out, "1.1.0").includes(ZETA));
    // DRIFTED and CONFLICT land where their reviewed overrides say.
    assert.ok(section(out, "1.1.0").includes(ETA_HEAD));
    assert.ok(section(out, "1.2.1").includes(EPSILON));
    // A ghost marker never picks the version; the pickaxe does.
    assert.ok(section(out, "1.2.2").includes(THETA));
    // The lazy continuation line travels with its bullet, byte-for-byte.
    assert.ok(section(out, "1.2.2").includes(LAMBDA));
    // The conflict-marker line is gone.
    assert.ok(!out.includes(DROP));
    // The reverted version keeps a section, with the placeholder that is TRUE for it.
    const s = (n) => shas[n].slice(0, 7);
    assert.equal(
      section(out, "1.2.0").trim(),
      `## [1.2.0] - 2026-01-04\n\n- No entry in this file is filed under this version (bump commit ${s("c4")}); CHANGELOG.md changed in its window at ${s("c4")}. Reverted by ${s("c5")} on 2026-01-05. An entry added at ${s("c4")} was re-landed in ${s("c6")} and is filed under [1.2.1].`
    );
    // A bump whose window never touched CHANGELOG.md gets the prompt's wording, because it is true there.
    assert.equal(
      section(out, "1.2.3").trim(),
      `## [1.2.3] - 2026-01-08\n\n- No CHANGELOG entry was recorded for this version (bump commit ${s("c8")}).`
    );
    // The migration's own entry, under the type group the intro comment prescribes.
    assert.match(section(out, "Unreleased"), /### Changed\n\n- 2026-09-23: \*\*`CHANGELOG\.md` is cut into one section per/);
    assert.match(section(out, "Unreleased"), /1\.3\.0 \(filed under 1\.2\.2\)/);
    // The confirmed positional reference is checked and counted: "above" now points at a LOWER section.
    assert.match(section(out, "Unreleased"), /at least 1 now point the wrong way/);
    // Here 1.0.0 was first set on the first-parent chain itself, so no "on a branch" clause is rendered.
    assert.ok(
      section(out, "Unreleased").includes(
        `Its heading date (2026-01-01) is the date \`${s("c1")}\` first set \`SKILLS_VERSION\` to 1.0.0. No git tag`
      )
    );
    // 5 sections are generated; the 1.2.0 and 1.2.3 placeholders hold no entry, so entries fill 3 of them.
    assert.match(section(out, "Unreleased"), /moved byte-for-byte into 3 version sections/);
    const report = readFileSync(join(dir, REPORT_PATH), "utf8");
    assert.ok(report.includes(`Pinned input: \`${shas.c8}\``));
    assert.match(report, /Unassigned bullets: 0\./);
    assert.match(report, /DRIFTED 1 · OUT_OF_SCOPE 0 · MULTI 0 · CONFLICT 1 · AGREE 1 · PICKAXE 4/);
    assert.ok(!report.includes("RED `"), "every invariant GREEN");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--verify is GREEN on the written output, RED on a one-byte tamper, and --write refuses to run twice", () => {
  const { dir, shas } = buildRepo();
  try {
    const ov = overridesFor(dir, shas);
    const argv = (mode) => ["--repo", dir, "--ref", shas.c8, "--overrides", ov, mode];
    assert.equal(run(argv("--write")).code, 0);
    const v = run(argv("--verify"));
    assert.equal(v.code, 0, v.message);
    assert.match(v.message, /^VERIFY: GREEN/);
    // The report is held to the render too (review finding): a hand edit to MIGRATION.md is RED.
    const report = join(dir, REPORT_PATH);
    const reportText = readFileSync(report, "utf8");
    writeFileSync(report, reportText.replace("Unassigned bullets: 0.", "Unassigned bullets: 0!"));
    const badReport = run(argv("--verify"));
    assert.equal(badReport.code, 1);
    assert.match(
      badReport.message,
      /^VERIFY: RED — the working \.dev\/features\/changelog-sectioning\/MIGRATION\.md differs .* at line \d+/
    );
    writeFileSync(report, reportText);
    const file = join(dir, "CHANGELOG.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("**Zeta**", "**Zeta!**"));
    const bad = run(argv("--verify"));
    assert.equal(bad.code, 1);
    assert.match(bad.message, /^VERIFY: RED — the working CHANGELOG\.md differs .* at line \d+/);
    assert.throws(() => run(argv("--write")), /INVARIANT_FAILED: the working CHANGELOG\.md is not byte-identical/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the inputs file: every key is required and shape-checked — no default stands in for a missing one (L41)", () => {
  const { dir, shas } = buildRepo();
  try {
    const good = JSON.parse(readFileSync(overridesFor(dir, shas), "utf8"));
    const f = join(dir, "bad.json");
    const bad = [
      { ...good, allowDrop: undefined },
      { ...good, positional: "x" },
      { ...good, overrides: null },
      { ...good, allowDrop: ["two\nlines"] },
      { ...good, allowDrop: [""] },
      { ...good, positional: [{ phrase: "x" }] },
    ];
    for (const doc of bad) {
      writeFileSync(f, JSON.stringify(doc));
      assert.throws(
        () => run(["--repo", dir, "--ref", "main", "--overrides", f, "--verify"]),
        /OVERRIDE_BAD_SHAPE/,
        JSON.stringify(doc).slice(0, 80)
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("halts: a flagged bullet with no override, and an override whose evidence commit does not resolve", () => {
  const { dir, shas } = buildRepo();
  try {
    const partial = overridesFor(dir, shas, ["CONFLICT"]);
    assert.throws(() => run(["--repo", dir, "--ref", "main", "--overrides", partial, "--verify"]), /OVERRIDE_MISSING: CONFLICT bullet/);
    const ov = overridesFor(dir, shas);
    const doc = JSON.parse(readFileSync(ov, "utf8"));
    doc.overrides[0].evidence.sha = "deadbee";
    writeFileSync(ov, JSON.stringify(doc));
    assert.throws(
      () => run(["--repo", dir, "--ref", "main", "--overrides", ov, "--verify"]),
      /OVERRIDE_BAD_SHAPE: evidence commit deadbee does not resolve/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
