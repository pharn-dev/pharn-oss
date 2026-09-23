// .dev/floor/check-changelog-entry.test.mjs — apparatus tests for the per-PR CHANGELOG diff checker.
//
// Disciplines from canon, applied deliberately:
//   - L29/L34 — REFUSAL_STATES is iterated from the checker's own export, with a closure assertion against
//     this file's case table in both directions; every iterated table is asserted non-empty first.
//   - L27 — each state's remedy is present in its own output AND absent from every other state's.
//   - L45 — the CI step is not only pinned, it is EXECUTED from its committed bytes in a repo prepared the
//     way actions/checkout prepares one, with a negative control. A suite that only spawns the script by
//     path would say nothing about the invocation.
//   - L41/L52 — the defaults: `targetDir` is reached by the executed CI block, which passes none; there is
//     no base default (a base flag is required, and BAD_USAGE is tested).
//   - L32 — `--merge-base` and `--base-ref` are contrasted on a repo whose `main` moved after branching.
//
// Every git process runs with an environment built FROM SCRATCH (grill finding: this suite itself runs
// inside CI's `npm test`, where the real GITHUB_SHA and possibly GIT_* variables are set). Nothing is
// inherited but PATH.
//
// WHERE THE /pharn-dev-ship PIN LIVES, and why here: the `check-skills-version-recorded.test.mjs`
// precedent pins a checker's own invokers (package.json, ci.yml) beside the checker. The other home for
// command-wiring pins is `.dev/floor/command-hygiene.test.mjs` (PLAN_LESSONS_WIRING, LESSON_EXTRACT_WIRING);
// a reader looking for every pin over /pharn-dev-ship should read both.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareChangelogs,
  parseArgs,
  main,
  REFUSAL_STATES,
  INPUT_STATES,
  FIX,
  MAX_LISTED,
  MAX_REF_LEN,
} from "./check-changelog-entry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, "check-changelog-entry.mjs");
const REPO = join(HERE, "..", "..");
const FIXTURES = join(HERE, "test-fixtures", "changelog-per-pr");

// ── helpers ───────────────────────────────────────────────────────────────────────────────────────

/** A sectioned changelog. `unreleased` is null (no section) or entry texts; `sections` newest first. */
function changelog({
  unreleased = ["- 2026-09-10: **An earlier no-bump change.**"],
  sections = SECTIONS,
  comment = "guidance",
  preamble = [],
} = {}) {
  let s = `# Changelog\n\nAll notable changes are documented here.\n\n${preamble.map((e) => `${e}\n`).join("")}\n`;
  if (unreleased !== null) {
    s += `## [Unreleased]\n\n<!-- ${comment} -->\n\n### Changed\n\n${unreleased.map((e) => `${e}\n`).join("\n")}\n`;
  }
  for (const sec of sections)
    s += `${sec.heading ?? `## [${sec.v}] - ${sec.d}`}\n\n### Fixed\n\n${sec.entries.map((e) => `${e}\n`).join("\n")}\n`;
  return s;
}

const SECTIONS = [
  { v: "3.0.3", d: "2026-09-10", entries: ["- **The newest release's entry.**"] },
  {
    v: "3.0.1",
    d: "2026-09-08",
    entries: ["- **An older release's entry.**", "- 2026-09-07: **A dated entry that was moved into 3.0.1.**"],
  },
];

const types = (res) => res.findings.map((f) => f.type);
const NEW_ENTRY = "- 2026-09-23: **This PR's change.**";

/** An environment built from scratch: nothing inherited but PATH (grill finding, P1). */
/** ONE throwaway HOME for the whole suite, removed after it (review finding 14: one per call leaked). */
const HOME_DIR = mkdtempSync(join(tmpdir(), "pharn-cle-home-"));
after(() => rmSync(HOME_DIR, { recursive: true, force: true }));

function cleanEnv(extra = {}) {
  const home = HOME_DIR;
  return {
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? "/usr/bin:/bin"}`,
    HOME: home,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@example.invalid",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@example.invalid",
    ...extra,
  };
}

function git(cwd, args, env = cleanEnv()) {
  return execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Run the CLI as a child; never throws. */
function run(args, { cwd = REPO, env = cleanEnv() } = {}) {
  const r = spawnSync(process.execPath, [CHECKER, ...args], { cwd, env, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** Run main() in-process; returns {code, out}. */
function runIn(args) {
  let out = "";
  const code = main(args, { out: (s) => (out += s) });
  return { code, out };
}

function tmp(prefix = "pharn-cle-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** A base file + a target dir holding a head CHANGELOG. Returns {base, target, cleanup}. */
function filePair(baseText, headText) {
  const dir = tmp();
  const base = join(dir, "base.md");
  const target = join(dir, "head");
  mkdirSync(target);
  if (baseText !== null) writeFileSync(base, baseText);
  if (headText !== null) writeFileSync(join(target, "CHANGELOG.md"), headText);
  return { base, target, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

// ── ✧ The refusal-state ENUMERATION (L29) ─────────────────────────────────────────────────────────

const BASE = changelog();
const BRANCH_CASES = {
  BAD_USAGE: { args: () => [], marker: /pass exactly one of --base-ref <ref>/ },
  BASE_UNREADABLE: {
    args: (p) => ["--base-file", join(p.target, "..", "missing.md"), p.target],
    marker: /git fetch --no-tags origin <ref>/,
  },
  HEAD_UNREADABLE: { head: null, marker: /the directory that holds CHANGELOG\.md/ },
  EMPTY_BASE: { base: "", marker: /the base holds no version section/ },
  NO_NEW_ENTRY: { head: BASE, marker: /add at least one entry for this PR/ },
  ENTRY_CHANGED: {
    head: changelog({
      unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY],
      sections: [SECTIONS[0], { ...SECTIONS[1], entries: [SECTIONS[1].entries[1]] }],
    }),
    marker: /a merged entry is never edited or deleted/,
  },
  ENTRY_MISPLACED: {
    head: changelog({ sections: [{ ...SECTIONS[0], entries: [...SECTIONS[0].entries, NEW_ENTRY] }, SECTIONS[1]] }),
    marker: /put a new entry under ## \[Unreleased\]/,
  },
  HEADING_CHANGED: {
    base: changelog({ sections: [...SECTIONS, { v: "3.0.0", d: "2026-09-01", entries: [] }] }),
    head: changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY] }),
    marker: /a released section heading is never edited or removed/,
  },
  HEADING_INSERTED: {
    head: changelog({
      unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY],
      sections: [SECTIONS[0], { v: "3.0.2", d: "2026-09-09", entries: [] }, SECTIONS[1]],
    }),
    marker: /a new version section may be added only ABOVE every existing one/,
  },
  SECTION_CHANGED: {
    head: changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY] }).replace(
      "## [3.0.1] - 2026-09-08\n\n### Fixed\n\n",
      "## [3.0.1] - 2026-09-08\n\n### Fixed\n\n* **A sneaky asterisk entry.**\n\n"
    ),
    marker: /a released section is frozen whole: restore its text byte-for-byte/,
  },
  UNRELEASED_NOT_MOVED: {
    head: changelog({ sections: [{ v: "3.0.4", d: "2026-09-23", entries: ["- **The bump's own entry.**"] }, ...SECTIONS] }),
    marker: /this PR opens a new version section, so it is the bump/,
  },
};

test("✧ NON-VACUITY + CLOSURE: every exported REFUSAL_STATE has a case, and there are no extras (L29/L34)", () => {
  assert.ok(REFUSAL_STATES.length >= 10);
  assert.deepEqual([...REFUSAL_STATES].sort(), Object.keys(BRANCH_CASES).sort());
  assert.ok(
    INPUT_STATES.every((s) => REFUSAL_STATES.includes(s)),
    "every input state is a member of the closed set"
  );
  assert.deepEqual(Object.keys(FIX).sort(), [...REFUSAL_STATES].sort(), "every state has exactly one remedy");
});

function outputOf(state) {
  const c = BRANCH_CASES[state];
  const p = filePair(
    c.base ?? BASE,
    c.head === undefined ? changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY] }) : c.head
  );
  try {
    return run(c.args ? c.args(p) : ["--base-file", p.base, p.target]);
  } finally {
    p.cleanup();
  }
}

const OUTPUTS = Object.fromEntries(REFUSAL_STATES.map((s) => [s, outputOf(s)]));

for (const state of REFUSAL_STATES) {
  const expected = INPUT_STATES.includes(state) ? 2 : 1;
  test(`✧ ${state} → exit ${expected}, named, alone, and no stack trace`, () => {
    const { code, out } = OUTPUTS[state];
    assert.equal(code, expected, out);
    assert.match(out, new RegExp(`\\[${state}\\]`));
    const others = REFUSAL_STATES.filter((s) => s !== state && new RegExp(`\\[${s}\\]`).test(out));
    assert.deepEqual(others, [], `${state}'s fixture must trigger that state alone`);
    assert.doesNotMatch(out, /at .*\.mjs:\d+/);
  });

  test(`✧ ${state}'s remedy is REACHABLE for it and ABSENT from every other branch (L27)`, () => {
    assert.match(OUTPUTS[state].out, BRANCH_CASES[state].marker);
    for (const other of REFUSAL_STATES.filter((s) => s !== state)) {
      assert.doesNotMatch(OUTPUTS[other].out, BRANCH_CASES[state].marker, `${other} must NOT print ${state}'s remedy`);
    }
  });
}

// ── ✧ PR scenarios (the pure core) ────────────────────────────────────────────────────────────────

test("✧ a NO-BUMP PR: one dated entry added under [Unreleased] → GREEN", () => {
  const head = changelog({ unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"] });
  const res = compareChangelogs(BASE, head);
  assert.deepEqual(types(res), []);
  assert.equal(res.stats.fresh, 1);
  assert.equal(res.stats.bump, null);
});

test("✧ a BUMP PR that moves [Unreleased] into its new section, KEEPING the date prefix → GREEN", () => {
  const head = changelog({
    unreleased: null,
    sections: [{ v: "3.0.4", d: "2026-09-23", entries: ["- **The bump.**", "- 2026-09-10: **An earlier no-bump change.**"] }, ...SECTIONS],
  });
  const res = compareChangelogs(BASE, head);
  assert.deepEqual(types(res), []);
  assert.equal(res.stats.bump, "## [3.0.4] - 2026-09-23");
});

test("✧ a BUMP PR that moves [Unreleased], DROPPING the date prefix, and keeps an emptied [Unreleased] → GREEN", () => {
  const head = changelog({
    unreleased: [],
    sections: [{ v: "3.0.4", d: "2026-09-23", entries: ["- **The bump.**", "- **An earlier no-bump change.**"] }, ...SECTIONS],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), []);
});

test("✧ an edited RELEASED bullet → ENTRY_CHANGED (the edited text also sits in a released section)", () => {
  const head = changelog({
    unreleased: ["- 2026-09-10: **An earlier no-bump change.**"],
    sections: [{ ...SECTIONS[0], entries: ["- **The newest release's entry, edited.**"] }, SECTIONS[1]],
  });
  const t = types(compareChangelogs(BASE, head));
  assert.ok(t.includes("ENTRY_CHANGED"), t.join());
  assert.ok(t.includes("ENTRY_MISPLACED"), "the edited copy is a new text inside a released section");
});

test("✧ an edited [Unreleased] bullet → ENTRY_CHANGED (merged means merged, released or not)", () => {
  const head = changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change, reworded.**"] });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["ENTRY_CHANGED"]);
});

test("✧ RE-DATING an [Unreleased] entry in place is the one permitted edit (the STALE_UNRELEASED repair) → GREEN", () => {
  const head = changelog({ unreleased: [NEW_ENTRY, "- 2026-09-23: **An earlier no-bump change.**"] });
  assert.deepEqual(types(compareChangelogs(BASE, head)), []);
});

test("✧ re-dating a RELEASED entry is not permitted → ENTRY_CHANGED", () => {
  const head = changelog({
    unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY],
    sections: [
      SECTIONS[0],
      { ...SECTIONS[1], entries: [SECTIONS[1].entries[0], "- 2026-09-08: **A dated entry that was moved into 3.0.1.**"] },
    ],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["ENTRY_CHANGED"]);
});

test("✧ an [Unreleased] entry moved into an OLD section (no bump) → ENTRY_MISPLACED", () => {
  const head = changelog({
    unreleased: [NEW_ENTRY],
    sections: [{ ...SECTIONS[0], entries: [...SECTIONS[0].entries, "- 2026-09-10: **An earlier no-bump change.**"] }, SECTIONS[1]],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["ENTRY_MISPLACED"]);
});

test("✧ a released entry moved to another released section → ENTRY_MISPLACED", () => {
  const head = changelog({
    unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY],
    sections: [
      { ...SECTIONS[0], entries: [...SECTIONS[0].entries, SECTIONS[1].entries[0]] },
      { ...SECTIONS[1], entries: [SECTIONS[1].entries[1]] },
    ],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["ENTRY_MISPLACED"]);
});

test("✧ a COPY of a released entry into another released section, original left in place → ENTRY_MISPLACED (D13)", () => {
  const head = changelog({
    unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY],
    sections: [{ ...SECTIONS[0], entries: [...SECTIONS[0].entries, SECTIONS[1].entries[0]] }, SECTIONS[1]],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["ENTRY_MISPLACED"], "every head occurrence is judged, not only the first");
});

test("✧ a fake mid-history section with an entry under it → HEADING_INSERTED (D11)", () => {
  const head = changelog({ sections: [SECTIONS[0], { v: "3.0.2", d: "2026-09-10", entries: [NEW_ENTRY] }, SECTIONS[1]] });
  const t = types(compareChangelogs(BASE, head));
  assert.ok(t.includes("HEADING_INSERTED"), t.join());
  assert.ok(t.includes("ENTRY_MISPLACED"), "an entry under an inserted heading is not under NEW");
});

test("✧ a heading and an entry inside a FENCE, indented with the new entry, are ignored → GREEN with exactly one new entry", () => {
  const fenced = `${NEW_ENTRY} Example:\n\n  \`\`\`markdown\n  ## [9.9.9] - 2026-01-01\n  - not an entry\n  \`\`\``;
  const res = compareChangelogs(BASE, changelog({ unreleased: [fenced, "- 2026-09-10: **An earlier no-bump change.**"] }));
  assert.deepEqual(types(res), []);
  assert.equal(res.stats.fresh, 1);
});

test("✧ editing the [Unreleased] HTML COMMENT is not an entry change → GREEN with a new entry", () => {
  const head = changelog({
    comment: "guidance, extended with\n- a hyphen line\n## and a heading-like line",
    unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), []);
});

test("✧ a COLUMN-0 heading after an in-entry fence opener IS a heading — a hidden 'newest version' is RED (review finding 1)", () => {
  const hidden = `${NEW_ENTRY}\n\n  \`\`\`\n## [9.9.9] - 2026-09-23`;
  // The rendered heading reads as a bump (it is the first version heading and absent at base), and the
  // PR's own entry sits above it under [Unreleased] — so the diff check REDs; Check 1 separately REDs
  // NOT_NEWEST, because the SKILLS_VERSION did not move.
  const t = types(compareChangelogs(BASE, changelog({ unreleased: [hidden, "- 2026-09-10: **An earlier no-bump change.**"] })));
  assert.deepEqual(t, ["UNRELEASED_NOT_MOVED"], "the rendered heading must not pass unseen");
});

// ── ✧ SECTION_CHANGED: a released section is immutable outside its entries (review finding 2) ──────

const SECTION_EDITS = [
  {
    name: "an asterisk bullet before the first entry",
    from: "### Fixed\n\n- **An older",
    to: "### Fixed\n\n* **Sneaky.**\n\n- **An older",
  },
  {
    name: "a committed merge-conflict marker",
    from: "### Fixed\n\n- **An older",
    to: "### Fixed\n\n<<<<<<< HEAD\n=======\n>>>>>>> 940eb16 x\n\n- **An older",
  },
  { name: "a renamed group heading", from: "## [3.0.1] - 2026-09-08\n\n### Fixed", to: "## [3.0.1] - 2026-09-08\n\n### Security" },
  // REVIEW iteration 2, finding 3 — "frozen whole" includes order and grouping, not only entry text.
  {
    name: "a released entry moved to another group of the same section",
    from: "- **An older release's entry.**\n\n- 2026-09-07:",
    to: "- **An older release's entry.**\n\n### Added\n\n- 2026-09-07:",
  },
  {
    name: "two released entries reordered",
    from: "- **An older release's entry.**\n\n- 2026-09-07: **A dated entry that was moved into 3.0.1.**",
    to: "- 2026-09-07: **A dated entry that was moved into 3.0.1.**\n\n- **An older release's entry.**",
  },
  {
    name: "a blank line removed between released entries",
    from: "- **An older release's entry.**\n\n- 2026-09-07:",
    to: "- **An older release's entry.**\n- 2026-09-07:",
  },
];

test("✧ NON-VACUITY: the section-edit table is non-empty (L34)", () => {
  assert.ok(SECTION_EDITS.length >= 6);
});

test("✧ a pristine DUPLICATE of a released section above the original cannot shield an edit to it → SECTION_CHANGED (review 3)", () => {
  const dup =
    "## [3.0.1] - 2026-09-08\n\n### Fixed\n\n- **An older release's entry.**\n\n- 2026-09-07: **A dated entry that was moved into 3.0.1.**\n\n";
  const head = changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY] }).replace(dup, `${dup}${dup}`);
  assert.ok(head.split("## [3.0.1] - 2026-09-08").length === 3, "the fixture must hold the heading twice, or this test proves nothing");
  assert.ok(types(compareChangelogs(BASE, head)).includes("SECTION_CHANGED"));
});

test("✧ a one-line HTML opener such as <!--> hides nothing: a fake newest version after it is seen → RED (review 3)", () => {
  const fake = `${NEW_ENTRY}\n\n<!-->\n## [9.9.9] - 2026-09-24`;
  const t = types(compareChangelogs(BASE, changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change.**", fake] })));
  assert.deepEqual(t, ["UNRELEASED_NOT_MOVED"], "the heading must be seen (here as a bump that left entries behind)");
});

test("✧ SECTION_CHANGED is not stacked on an entry-level finding for the same section (reported once, most specific)", () => {
  const head = changelog({
    unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY],
    sections: [SECTIONS[0], { ...SECTIONS[1], entries: [SECTIONS[1].entries[1]] }],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["ENTRY_CHANGED"]);
});

// REVIEW iteration 2, findings 1 and 2 — a PR that makes GitHub stop rendering the rest of the file.
test("✧ a column-0 fence with a 4-space 'closer' hides every later heading → RED (HEADING_CHANGED), never GREEN", () => {
  const hidden = `${NEW_ENTRY}\n\`\`\`text\nexample\n    \`\`\``;
  const t = types(compareChangelogs(BASE, changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change.**", hidden] })));
  assert.ok(t.includes("HEADING_CHANGED"), t.join());
});

test("✧ an unclosed <pre> or <textarea> block hides every later heading → RED (HEADING_CHANGED), never GREEN", () => {
  for (const tag of ["<pre>", "<textarea>"]) {
    const t = types(compareChangelogs(BASE, changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY, tag] })));
    assert.ok(t.includes("HEADING_CHANGED"), `${tag}: ${t.join()}`);
  }
});

for (const e of SECTION_EDITS) {
  test(`✧ ${e.name} in a RELEASED section → SECTION_CHANGED`, () => {
    const head = changelog({ unreleased: ["- 2026-09-10: **An earlier no-bump change.**", NEW_ENTRY] });
    assert.ok(head.includes(e.from), "the edit must apply, or this test proves nothing");
    assert.deepEqual(types(compareChangelogs(BASE, head.replace(e.from, e.to))), ["SECTION_CHANGED"]);
  });
}

test("✧ [Unreleased]'s own group headings and the preamble are NOT frozen", () => {
  const head = changelog({ unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"], preamble: [] })
    .replace("## [Unreleased]\n\n<!-- guidance -->\n\n### Changed", "## [Unreleased]\n\n<!-- guidance -->\n\n### Added")
    .replace("All notable changes are documented here.", "All notable changes are documented here, reworded.");
  assert.deepEqual(types(compareChangelogs(BASE, head)), []);
});

// ── ✧ A bump records what it ships under its own section (review finding 3) ─────────────────────────

test("✧ a bump that leaves its OWN new entry under [Unreleased] → UNRELEASED_NOT_MOVED", () => {
  const head = changelog({
    unreleased: [NEW_ENTRY],
    sections: [{ v: "3.0.4", d: "2026-09-23", entries: ["- 2026-09-10: **An earlier no-bump change.**"] }, ...SECTIONS],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["UNRELEASED_NOT_MOVED"]);
});

test("✧ a bump that opens an EMPTY section and files everything under [Unreleased] → UNRELEASED_NOT_MOVED", () => {
  const head = changelog({
    unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"],
    sections: [{ v: "3.0.4", d: "2026-09-23", entries: [] }, ...SECTIONS],
  });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["UNRELEASED_NOT_MOVED"]);
});

test("✧ a CRLF head against an LF base → GREEN (round-1 finding 20)", () => {
  const head = changelog({ unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"] }).replace(/\n/g, "\r\n");
  assert.deepEqual(types(compareChangelogs(BASE, head)), []);
});

test("✧ a new entry in the PREAMBLE → ENTRY_MISPLACED", () => {
  const head = changelog({ preamble: [NEW_ENTRY] });
  assert.deepEqual(types(compareChangelogs(BASE, head)), ["ENTRY_MISPLACED"]);
});

test("✧ an EMPTY base is refused, never a vacuous GREEN (D12, L34)", () => {
  assert.deepEqual(types(compareChangelogs("", changelog())), ["EMPTY_BASE"]);
  assert.deepEqual(types(compareChangelogs("# Changelog\n\n- an entry, no section\n", changelog())), ["EMPTY_BASE"]);
});

test("✧ THIS PR's own transition (recorded excerpts of 392817f and this branch) → GREEN, its two new entries", () => {
  const res = compareChangelogs(readFileSync(join(FIXTURES, "base.md"), "utf8"), readFileSync(join(FIXTURES, "head.md"), "utf8"));
  assert.deepEqual(types(res), []);
  assert.equal(res.stats.fresh, 2, "the feature entry and the R7 test-fix entry");
  assert.equal(res.stats.bump, null, "this PR does not bump");
});

test("✧ findings are CAPPED per state and the rest counted; an ESC is escaped (P2)", () => {
  const ESC = String.fromCharCode(27);
  const many = Array.from({ length: 30 }, (_, i) => `- ${ESC}[31mentry ${i}`);
  const base = changelog({ sections: [{ v: "3.0.3", d: "2026-09-10", entries: many }] });
  const p = filePair(base, changelog({ sections: [{ v: "3.0.3", d: "2026-09-10", entries: [] }] }));
  try {
    const { code, out } = run(["--base-file", p.base, p.target]);
    assert.equal(code, 1);
    assert.equal((out.match(/^- \[ENTRY_CHANGED\]/gm) ?? []).length, MAX_LISTED + 1, "MAX_LISTED quotes plus one summary line");
    assert.match(out, new RegExp(`\\[ENTRY_CHANGED\\] … and ${30 - MAX_LISTED} more`));
    assert.ok(!out.includes(ESC));
    assert.match(out, /\\u001b/);
  } finally {
    p.cleanup();
  }
});

// ── ✧ Argument handling and refs (P2) ────────────────────────────────────────────────────────────

test("✧ parseArgs refuses every malformed invocation", () => {
  const bad = [
    [],
    ["--base-ref"],
    ["--base-ref", "a", "--base-file", "b"],
    ["--merge-base", "a", "--base-ref", "b"],
    ["--nope"],
    ["--base-file", "b", "t1", "t2"],
    ["--base-ref", "-x"],
    ["--base-ref", "--output=/tmp/x"],
    ["--base-ref", "has space"],
    ["--base-ref", `a${String.fromCharCode(10)}b`],
    ["--base-ref", "a".repeat(MAX_REF_LEN + 1)],
    ["--merge-base", ""],
  ];
  assert.ok(bad.length >= 12);
  for (const argv of bad) assert.ok(parseArgs(argv).error, JSON.stringify(argv));
  assert.deepEqual(parseArgs(["--base-ref", "HEAD^1"]), { base: { kind: "ref", value: "HEAD^1", flag: "--base-ref" }, target: "." });
  assert.equal(parseArgs(["--merge-base", "origin/main", "x"]).target, "x");
  assert.equal(
    parseArgs(["--base-file", "-weird-name.md"]).base.value,
    "-weird-name.md",
    "a FILE path is not a ref, so no ref rule applies"
  );
});

test("✧ OPTION INJECTION: a ref like --output=<dir>/x is refused before git runs, and nothing is written", () => {
  const repo = tmp("pharn-cle-inj-");
  const drop = tmp("pharn-cle-drop-");
  try {
    git(repo, ["init", "-q", "-b", "main"]);
    writeFileSync(join(repo, "CHANGELOG.md"), BASE);
    git(repo, ["add", "."]);
    git(repo, ["commit", "-qm", "base"]);
    // POSITIVE CONTROL — the danger is real: unvalidated, git itself writes a file into `drop`.
    const ctl = tmp("pharn-cle-ctl-");
    try {
      git(repo, ["show", `--output=${join(ctl, "x")}:CHANGELOG.md`]);
      assert.ok(readdirSync(ctl).length > 0, "unvalidated git show --output must write a file, or this test proves nothing");
    } finally {
      rmSync(ctl, { recursive: true, force: true });
    }
    const { code, out } = run(["--base-ref", `--output=${join(drop, "x")}`, repo]);
    assert.equal(code, 2);
    assert.match(out, /\[BAD_USAGE\]/);
    assert.deepEqual(readdirSync(drop), [], "the drop directory must stay EMPTY");
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(drop, { recursive: true, force: true });
  }
});

// ── ✧ git paths: --base-ref, --merge-base, a range, a subdirectory ────────────────────────────────

/** A repo whose main moved after `feature` branched. Returns {repo, cleanup}; feature is checked out. */
function movedMainRepo() {
  const repo = tmp("pharn-cle-git-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeFileSync(join(repo, "CHANGELOG.md"), BASE);
  git(repo, ["add", "."]);
  git(repo, ["commit", "-qm", "C0"]);
  git(repo, ["switch", "-qc", "feature"]);
  writeFileSync(join(repo, "CHANGELOG.md"), changelog({ unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"] }));
  git(repo, ["commit", "-qam", "C1 feature entry"]);
  git(repo, ["switch", "-q", "main"]);
  writeFileSync(
    join(repo, "CHANGELOG.md"),
    changelog({ unreleased: ["- 2026-09-22: **Main moved on.**", "- 2026-09-10: **An earlier no-bump change.**"] })
  );
  git(repo, ["commit", "-qam", "C2 main entry"]);
  git(repo, ["switch", "-q", "feature"]);
  return { repo, cleanup: () => rmSync(repo, { recursive: true, force: true }) };
}

test("✧ --base-ref reads the base from git: GREEN with an entry, NO_NEW_ENTRY without", () => {
  const repo = tmp("pharn-cle-git-");
  try {
    git(repo, ["init", "-q", "-b", "main"]);
    writeFileSync(join(repo, "CHANGELOG.md"), BASE);
    git(repo, ["add", "."]);
    git(repo, ["commit", "-qm", "base"]);
    const none = run(["--base-ref", "HEAD", repo]);
    assert.equal(none.code, 1, none.out);
    assert.match(none.out, /\[NO_NEW_ENTRY\]/);
    writeFileSync(join(repo, "CHANGELOG.md"), changelog({ unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"] }));
    const green = run(["--base-ref", "HEAD", repo]);
    assert.equal(green.code, 0, green.out);
    assert.match(green.out, /GREEN — 1 new entr/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("✧ L32 CONTRAST: --merge-base judges the branch's own change (GREEN); --base-ref on main's tip reads main's new entry as ENTRY_CHANGED", () => {
  const { repo, cleanup } = movedMainRepo();
  try {
    const mb = run(["--merge-base", "main", repo]);
    assert.equal(mb.code, 0, mb.out);
    const tip = run(["--base-ref", "main", repo]);
    assert.equal(tip.code, 1, tip.out);
    assert.match(tip.out, /\[ENTRY_CHANGED\]/);
    assert.match(tip.out, /If your branch is behind its base, rebase first/, "the remedy names the stale-branch case");
  } finally {
    cleanup();
  }
});

test("✧ a RANGE (main..HEAD) passes the character rule but names no single commit → BASE_UNREADABLE, never an empty base (D12)", () => {
  const { repo, cleanup } = movedMainRepo();
  try {
    const { code, out } = run(["--base-ref", "main..HEAD", repo]);
    assert.equal(code, 2, out);
    assert.match(out, /\[BASE_UNREADABLE\]/);
  } finally {
    cleanup();
  }
});

test("✧ a SUBDIRECTORY target reads <sha>:./CHANGELOG.md relative to it, not the repo root", () => {
  const repo = tmp("pharn-cle-sub-");
  try {
    git(repo, ["init", "-q", "-b", "main"]);
    mkdirSync(join(repo, "pkg"));
    writeFileSync(join(repo, "CHANGELOG.md"), "# not this one\n");
    writeFileSync(join(repo, "pkg", "CHANGELOG.md"), BASE);
    git(repo, ["add", "."]);
    git(repo, ["commit", "-qm", "base"]);
    writeFileSync(
      join(repo, "pkg", "CHANGELOG.md"),
      changelog({ unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"] })
    );
    const { code, out } = run(["--base-ref", "HEAD", join(repo, "pkg")]);
    assert.equal(code, 0, out);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("✧ a MISSING target is HEAD_UNREADABLE before git runs, never a git error with a fetch remedy (review finding 11)", () => {
  const { code, out } = run(["--base-ref", "HEAD", join(tmpdir(), `pharn-cle-missing-${process.pid}`)]);
  assert.equal(code, 2, out);
  assert.match(out, /\[HEAD_UNREADABLE\]/);
  assert.doesNotMatch(out, /git fetch --no-tags origin <ref>/);
});

test("main() runs in-process: GREEN exit 0, RED exit 1, unusable exit 2", () => {
  const p = filePair(BASE, changelog({ unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"] }));
  try {
    assert.equal(runIn(["--base-file", p.base, p.target]).code, 0);
    writeFileSync(join(p.target, "CHANGELOG.md"), BASE);
    assert.equal(runIn(["--base-file", p.base, p.target]).code, 1);
    assert.equal(runIn(["--bogus"]).code, 2);
  } finally {
    p.cleanup();
  }
});

// ── ✧ WIRING (L45): package.json, ci.yml — pinned AND executed — and /pharn-dev-ship ─────────────

test("✧ package.json: check:changelog-entry uses --merge-base origin/main, and is NOT in the `check` chain", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.equal(pkg.scripts["check:changelog-entry"], "node .dev/floor/check-changelog-entry.mjs --merge-base origin/main .");
  const chain = pkg.scripts.check.split("&&").map((s) => s.trim());
  assert.ok(chain.length >= 2, "the chain must be non-empty (L34)");
  assert.ok(!chain.includes("npm run check:changelog-entry"), "it needs a base, so it must stay out of `check`");
});

/** The per-PR step's block in ci.yml, from its `- name:` line to the next step or EOF. */
function ciStep() {
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8");
  const start = ci.indexOf("      - name: CHANGELOG per-PR entry check\n");
  assert.ok(start >= 0, "ci.yml must carry the step by its name");
  const rest = ci.slice(start + 1);
  const next = rest.search(/^ {6}- /m);
  return { ci, block: ci.slice(start, next === -1 ? ci.length : start + 1 + next) };
}

function runLines(block) {
  const m = block.match(/^ {8}run: \|\n((?: {10}[^\n]*\n?)+)/m);
  assert.ok(m, "the step must carry a literal `run: |` block");
  return m[1]
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => l.slice(10));
}

test("✧ ci.yml: the per-PR step's `if:`, its two `run:` lines, no ${{ }} in `run:`, and persist-credentials: false", () => {
  const { ci, block } = ciStep();
  assert.match(
    block,
    /^ {8}if: \$\{\{ always\(\) && steps\.install\.outcome == 'success' && github\.event_name == 'pull_request' && github\.event\.pull_request\.user\.login != 'dependabot\[bot\]' \}\}$/m
  );
  assert.deepEqual(runLines(block), [
    'git fetch --no-tags --depth=2 origin "$GITHUB_SHA"',
    "node .dev/floor/check-changelog-entry.mjs --base-ref HEAD^1",
  ]);
  assert.ok(!runLines(block).join("\n").includes("${{"), "nothing may be interpolated into run:");
  assert.doesNotMatch(block, /^ {8}env:/m, "the step needs no env: — GITHUB_SHA is the runner's own");
  assert.match(ci, /uses: actions\/checkout@[0-9a-f]{40}[^\n]*\n {8}with:\n {10}persist-credentials: false/);
});

/**
 * EXECUTE the committed run block (L45) in a repo prepared the way actions/checkout prepares a
 * pull_request run: a depth-1 fetch of GitHub's test merge commit, checked out detached, with
 * GITHUB_SHA set. It runs under `bash -e`, GitHub's default for a `run:` with no `shell:` key.
 */
function executeCiBlock({ prAddsEntry }) {
  const root = tmp("pharn-cle-ci-");
  const env = cleanEnv();
  try {
    const seed = join(root, "seed");
    mkdirSync(seed);
    git(seed, ["init", "-q", "-b", "main"], env);
    writeFileSync(join(seed, "CHANGELOG.md"), BASE);
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-qm", "base"], env);
    git(seed, ["switch", "-qc", "pr"], env);
    writeFileSync(join(seed, "note.txt"), "a code change\n");
    if (prAddsEntry)
      writeFileSync(join(seed, "CHANGELOG.md"), changelog({ unreleased: [NEW_ENTRY, "- 2026-09-10: **An earlier no-bump change.**"] }));
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-qm", "pr"], env);
    git(seed, ["switch", "-q", "main"], env);
    git(seed, ["merge", "-q", "--no-ff", "-m", "test merge", "pr"], env);
    const merge = git(seed, ["rev-parse", "HEAD"], env);
    git(seed, ["update-ref", "refs/pull/1/merge", merge], env);
    git(root, ["clone", "-q", "--bare", seed, "bare.git"], env);
    git(seed, ["push", "-q", join(root, "bare.git"), "refs/pull/1/merge"], env);

    const work = join(root, "work");
    mkdirSync(work);
    git(work, ["init", "-q"], env);
    git(work, ["remote", "add", "origin", `file://${join(root, "bare.git")}`], env);
    git(work, ["fetch", "-q", "--no-tags", "--depth=1", "origin", merge], env);
    git(work, ["checkout", "-q", "--detach", merge], env);
    mkdirSync(join(work, ".dev", "floor"), { recursive: true });
    for (const f of ["check-changelog-entry.mjs", "changelog-core.mjs"]) copyFileSync(join(HERE, f), join(work, ".dev", "floor", f));

    const script = runLines(ciStep().block).join("\n");
    const r = spawnSync("bash", ["-e", "-c", script], { cwd: work, env: { ...env, GITHUB_SHA: merge }, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("✧ EXECUTED: the committed CI run block is GREEN on a merge whose PR adds an entry", () => {
  const { code, out } = executeCiBlock({ prAddsEntry: true });
  assert.equal(code, 0, out);
  assert.match(out, /CHANGELOG-ENTRY: GREEN — 1 new entr/);
  assert.match(out, /--base-ref HEAD\^1/, "the default targetDir (cwd) and HEAD^1 were what it read");
});

test("✧ EXECUTED NEGATIVE CONTROL: the same block is RED on a merge whose PR adds no entry", () => {
  const { code, out } = executeCiBlock({ prAddsEntry: false });
  assert.equal(code, 1, out);
  assert.match(out, /\[NO_NEW_ENTRY\]/);
});

test("✧ /pharn-dev-ship: Step 2c pins the two lines in order, between Step 2b and Step 3, and its vocabulary is CLOSED (L36)", () => {
  const body = readFileSync(join(REPO, ".claude", "commands", "pharn-dev-ship.md"), "utf8");
  const at = (title) => {
    const m = body.match(new RegExp(`^## ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
    return m ? m.index : -1;
  };
  const s2b = at("Step 2b — lesson-extract");
  const s2c = at("Step 2c — CHANGELOG entry check");
  const s3 = at("Step 3 —");
  assert.ok(s2b >= 0 && s2c >= 0 && s3 >= 0, "all three headings must exist");
  assert.ok(s2b < s2c && s2c < s3, "the order must be 2b, then 2c, then 3");
  const section = body.slice(s2c, s3);
  assert.match(section, /```bash\ngit fetch --no-tags origin main\nnpm run check:changelog-entry\n```/);

  const MEMBERS = [/^changelog-entry: exit <n>$/, /^changelog-entry: not-reached \(<stage>\)$/];
  // The same shape as command-hygiene's `lesson:` closure: a VALUE is the stem, a space and something; the
  // bare stem `changelog-entry:` names the line and is not a value.
  const seen = [...body.matchAll(/`(changelog-entry: [^`]+)`/g)].map((m) => m[1]);
  assert.ok(seen.length >= 2, "the vocabulary must be written somewhere (L34)");
  for (const v of seen)
    assert.ok(
      MEMBERS.some((re) => re.test(v)),
      `variant spelling ${JSON.stringify(v)} is not a member`
    );
  for (const re of MEMBERS)
    assert.ok(
      seen.some((v) => re.test(v)),
      `member ${re} must be present`
    );
});
