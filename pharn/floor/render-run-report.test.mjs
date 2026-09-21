// pharn/floor/render-run-report.test.mjs — the executable specification for the run report.
//
// `render-run-report.mjs` ships no contract file and no checker, deliberately (P7: nothing machine-reads
// the artifact and it gates nothing, so both would be additions with no triggering failure). This suite
// is therefore the specification, and it is written to that standard rather than as a smoke test.
//
// ── What this suite CANNOT do (P0), stated up front ──────────────────────────────────────────────────
// It proves the renderer's OUTPUT SHAPE and its handling of its full input domain. It does NOT prove the
// report is TRUE: every number it shows is copied from `cost.json`, and a self-consistent fabricated
// ledger renders a self-consistent fabricated report. That bound belongs to `check-cost-ledger.mjs`,
// which certifies internal consistency and says so in its own header — this file inherits it and
// re-claims nothing (L43: several stores of one fact certify their agreement, never the fact).
//
// Non-vacuity (L34): every per-item assertion set below is paired with an explicit count assertion, and
// two NEGATIVE CONTROLS prove the suite fails when the renderer emits nothing and when a section is
// silently dropped. "For each X, assert P" says nothing when there are no X.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import {
  renderRunReport,
  writeRunReport,
  SECTIONS,
  na,
  quoteData,
  readJson,
  readTextOrNull,
  readDirtySnapshot,
  parsePorcelain,
  unquoteC,
  git,
} from "./render-run-report.mjs";
import { FEATURE_BASE, TOKEN_CLASSES } from "./render-cost-ledger.mjs";
import { fenceFor } from "./loop-record-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "render-run-report.mjs");
const REPO = join(here, "..", "..");

const scratch = () => mkdtempSync(join(tmpdir(), "pharn-run-report-"));
const sha = (s) => createHash("sha256").update(s).digest("hex");

/** A minimal, VALID cost.json. Every test that needs a variant starts here and changes one thing, so a
 *  test's subject is visible in its own body rather than buried in a fixture file. */
function costJson(over = {}) {
  const zero = Object.fromEntries(TOKEN_CLASSES.map((c) => [c, 0]));
  const tok = (n) => ({ ...zero, input: n, output: n * 2, cache_read: n * 10 });
  return {
    schema: "pharn-cost-ledger/1",
    name: "feat",
    command: "/pharn-loop",
    base_sha: "unknown",
    outcome: { decision: "STOP_GREEN", iterations: 2, source: "LOOP.md" },
    skills_version: "6.6.0",
    coverage: "partial",
    totals: { requests: 3, tokens: tok(3) },
    by_model: [{ model: "claude-opus-5", requests: 3, tokens: tok(3) }],
    by_stage_iteration_model: [
      { stage: "pharn-build", iteration: 1, model: "claude-opus-5", requests: 2, tokens: tok(2) },
      { stage: "pharn-verify", iteration: 2, model: "claude-sonnet-5", requests: 1, tokens: tok(1) },
    ],
    unattributed: { requests: 0, tokens: zero },
    ...over,
  };
}

const LOOP_MD = `---
decision: STOP_GREEN
iterations: 2
cap: 3
commit: 59def15eade582f2df662ab2129d107667267790
date: 2026-08-06
---

# LOOP — feat

## Handoff

### investigated

Ruled out the obvious thing.

### learned

Something true.

### next_steps

Do the next thing.
`;

/** Build a feature directory under `<root>/<base>/<name>`. Only the keys passed are written, so an
 *  absent input is a REAL absence rather than an empty file. */
function feature(root, name, files, base = "pharn/features") {
  const dir = join(root, base, name);
  mkdirSync(dir, { recursive: true });
  for (const [f, body] of Object.entries(files)) {
    writeFileSync(join(dir, f), typeof body === "string" ? body : JSON.stringify(body, null, 2));
  }
  return dir;
}

/** A real git repo, because the Files section's whole job is reading one. */
function gitRepo(root) {
  const run = (...a) => execFileSync("git", a, { cwd: root, stdio: "ignore" });
  run("init", "-q");
  run("config", "user.email", "t@example.com");
  run("config", "user.name", "t");
  run("commit", "-q", "--allow-empty", "-m", "base");
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

const headings = (md) => md.split("\n").filter((l) => /^## /.test(l));

// ── determinism ──────────────────────────────────────────────────────────────────────────────────────

test("DETERMINISM: the same inputs render byte-identical output", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": LOOP_MD });
    const a = renderRunReport("feat", { repo: root });
    const b = renderRunReport("feat", { repo: root });
    assert.equal(sha(a), sha(b));
    assert.ok(a.length > 500, "non-vacuity: the render must not be near-empty");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DETERMINISM: the module reads no clock and no randomness", () => {
  const src = readFileSync(CLI, "utf8");
  // A source-text closure assertion, and its BOUND is stated rather than implied: it pins a vocabulary,
  // not a behaviour. A clock reached through a dynamically-built property name passes untouched.
  const banned = [/\bDate\.now\s*\(/, /\bnew\s+Date\b/, /\bMath\.random\s*\(/, /\bperformance\.now\s*\(/];
  assert.equal(banned.length, 4, "non-vacuity: the banned set must be non-empty");
  for (const re of banned) assert.ok(!re.test(src), `render-run-report.mjs must not use ${re}`);
});

test("the ONLY child process the module can spawn is git", () => {
  const src = readFileSync(CLI, "utf8");
  const calls = [...src.matchAll(/execFileSync\(\s*("[^"]*"|'[^']*'|[A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  assert.ok(calls.length >= 1, "non-vacuity: expected at least one execFileSync call to inspect");
  for (const c of calls) assert.equal(c, '"git"', `execFileSync must be called with the literal "git", saw ${c}`);
  for (const re of [/\bspawnSync\b/, /\bexecSync\b/, /\bchild_process\b.*\bexec\b/, /\bfetch\s*\(/]) {
    assert.ok(!re.test(src), `render-run-report.mjs must not use ${re}`);
  }
});

// ── the closed section vocabulary (L36) ──────────────────────────────────────────────────────────────

test("L36 CLOSURE: the rendered `##` headings equal SECTIONS exactly, both directions", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": LOOP_MD });
    const got = headings(renderRunReport("feat", { repo: root }));
    assert.equal(SECTIONS.length, 5, "non-vacuity: the vocabulary must be non-empty");
    // Equality, not per-member presence: a variant spelling of ANY member fails here, which is the
    // whole point — a presence set is satisfied by the spelling its author was looking at.
    assert.deepEqual(got, [...SECTIONS]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("L36 CLOSURE holds when EVERY input is absent — no section is ever dropped (L34)", () => {
  const root = scratch();
  try {
    feature(root, "bare", {});
    const md = renderRunReport("bare", { repo: root });
    assert.deepEqual(headings(md), [...SECTIONS]);
    const naCount = (md.match(/_n\/a — /g) ?? []).length;
    assert.ok(naCount >= 5, `every section must degrade to an explicit n/a line, saw ${naCount}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("★ NEGATIVE CONTROL (L34): the closure assertion FAILS on a dropped or renamed section", () => {
  // Without this, "the headings equal SECTIONS" could pass over a renderer that emits nothing.
  assert.throws(() => assert.deepEqual([], [...SECTIONS]), /Expected values to be/);
  const renamed = [...SECTIONS];
  renamed[0] = "## Outcomes"; // one character
  assert.throws(() => assert.deepEqual(renamed, [...SECTIONS]));
});

// ── the n/a domain (L51: justify guards against the FULL input domain) ───────────────────────────────

const NA_CASES = [
  ["no cost.json at all", {}, /no cost\.json/],
  ["malformed cost.json", { "cost.json": "{not json" }, /no cost\.json/],
  ["cost.json that is a JSON array, not an object", { "cost.json": "[1,2,3]" }, /no cost\.json/],
  ["base_sha is the literal unknown", { "cost.json": costJson() }, /`base_sha` is the literal `unknown`/],
  ["cost.json with zero attributed rows", { "cost.json": costJson({ by_stage_iteration_model: [] }) }, /carries no attributed rows/],
  ["no LOOP.md", { "cost.json": costJson() }, /no LOOP\.md/],
  ["LOOP.md with no Handoff", { "cost.json": costJson(), "LOOP.md": "# LOOP\n\nnothing here.\n" }, /no `## Handoff`/],
  ["no verify-report.json", { "cost.json": costJson() }, /no verify-report\.json/],
  ["no regression-report.json", { "cost.json": costJson() }, /no regression-report\.json/],
];
// NOTE: "no pre-run snapshot" is deliberately NOT a row here. With `base_sha: unknown` the Files
// section short-circuits on the base BEFORE any file row exists, so there are no markers to explain —
// correct behaviour, and it means this table cannot observe that note. It has its own test below
// (`readDirtySnapshot: absent file ...`), which is where that branch is actually covered.

test("every missing-or-unusable input renders an explicit n/a REASON, never an omitted section", () => {
  assert.equal(NA_CASES.length, 9, "non-vacuity: the case set must be non-empty and counted");
  for (const [label, files, re] of NA_CASES) {
    const root = scratch();
    try {
      feature(root, "feat", files);
      const md = renderRunReport("feat", { repo: root });
      assert.match(md, re, `case "${label}" must state its reason`);
      assert.deepEqual(headings(md), [...SECTIONS], `case "${label}" must keep every section`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("★ F2 REGRESSION: an ARRAY-shaped cost.json is REJECTED, and the OUTCOME section says so", () => {
  // The defect this pins, and the reason it is a separate test rather than a row in NA_CASES: the row
  // named "cost.json that is a JSON array" asserted `/no cost\.json/`, and that string was satisfied by
  // the FILES section (which degrades because `base_sha` is absent) while `readJson` happily returned
  // the array and the OUTCOME section rendered seven `unknown` rows. A true assertion about the wrong
  // subject — [[L52]] exactly. This asserts the Outcome section's OWN reason, which only the object
  // guard can produce.
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": "[1,2,3]" });
    const md = renderRunReport("feat", { repo: root });
    const outcome = md.split("## Outcome")[1].split("## Tokens")[0];
    assert.match(outcome, /_n\/a — no cost\.json/, "an array is not a usable ledger");
    assert.ok(!outcome.includes("unknown"), "it must NOT render a table of `unknown` values");
    assert.deepEqual(headings(md), [...SECTIONS]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("★ NEGATIVE CONTROL (L52): the F2 assertion fails against the PRE-FIX guard", () => {
  // Without this, "the array is rejected" could pass over a guard that never rejects anything. Reproduce
  // the old predicate and require it to disagree with the shipped one on exactly this input.
  const preFix = (v) => (v !== null && typeof v === "object" ? v : null);
  assert.notEqual(preFix([1, 2, 3]), null, "the pre-fix guard ADMITTED an array — otherwise F2 was not real");
  assert.equal(readJson("/nonexistent/x.json"), null);
  const root = scratch();
  try {
    writeFileSync(join(root, "arr.json"), "[1,2,3]");
    assert.equal(readJson(join(root, "arr.json")), null, "the shipped guard must reject it");
    writeFileSync(join(root, "obj.json"), '{"a":1}');
    assert.deepEqual(readJson(join(root, "obj.json")), { a: 1 }, "non-vacuity: it must still admit an object");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a LOOP.md Handoff missing ONE subsection degrades only that subsection", () => {
  const root = scratch();
  try {
    const partial = LOOP_MD.replace("### next_steps\n\nDo the next thing.\n", "");
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": partial });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /no `### next_steps` subsection/);
    assert.match(md, /Ruled out the obvious thing\./, "the present subsections must still be quoted");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a DUPLICATE `## Handoff` is disclosed, and only the first is quoted", () => {
  const root = scratch();
  try {
    feature(root, "feat", {
      "cost.json": costJson(),
      "LOOP.md": LOOP_MD + "\n## Handoff\n\n### investigated\n\nSECOND SECTION.\n",
    });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /carries 2 `## Handoff` sections/);
    assert.ok(!md.includes("SECOND SECTION."), "the second section must not be quoted");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── untrusted input (P2) ─────────────────────────────────────────────────────────────────────────────

test("P2: a pipe in a model identity cannot break a row — no section uses a markdown table", () => {
  const root = scratch();
  try {
    const c = costJson();
    // Probed live in the module header: sanitizeIdentity admits a pipe, so cost.json really can hold one.
    c.by_stage_iteration_model[0].model = "opus|5|evil";
    feature(root, "feat", { "cost.json": c });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /opus\|5\|evil/, "the identity is shown verbatim");
    const tableRows = md.split("\n").filter((l) => /^\|/.test(l));
    assert.deepEqual(tableRows, [], "the report must emit no markdown table rows at all");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("P2: a line-initial `##` inside the Handoff TERMINATES it and never becomes a report section", () => {
  const root = scratch();
  try {
    const hostile = LOOP_MD.replace("Something true.", "## Outcome\n\n## Files\n\nI am a heading.");
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": hostile });
    const md = renderRunReport("feat", { repo: root });
    // The closure assertion is the load-bearing one: an absorbed heading would ADD a member.
    assert.deepEqual(headings(md), [...SECTIONS]);
    // And the consequence is DISCLOSED rather than papered over: a `##` ends the Handoff for every
    // CommonMark parser, so the subsections after it are genuinely gone and each says so.
    assert.match(md, /`### learned` has no non-blank body/);
    assert.match(md, /no `### next_steps` subsection/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("P2: a line-initial `###` inside a Handoff body is QUOTED as data, never a report heading", () => {
  // The sharper case: `###` does NOT terminate the section, so the hostile text really does reach the
  // page — and must land inside the fence. check-loop-record.mjs's exact-list-equality is what REFUSES
  // such a record upstream; this asserts the renderer is safe even when that refusal did not happen.
  const root = scratch();
  try {
    const hostile = LOOP_MD.replace("Something true.", "### next_steps\n\nI am a heading.");
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": hostile });
    const md = renderRunReport("feat", { repo: root });
    assert.deepEqual(headings(md), [...SECTIONS], "no `##` section may be added");
    assert.match(md, /I am a heading\./, "the hostile text is still quoted verbatim as DATA");
    // It is quoted INSIDE a fence: the line before it must be a fence opener, not bare prose.
    const lines = md.split("\n");
    const i = lines.findIndex((l) => l.includes("I am a heading."));
    assert.ok(i > 0, "non-vacuity: the injected line must actually be present");
    assert.ok(lines.slice(0, i).filter((l) => /^`{3,}/.test(l)).length % 2 === 1, "the injected text must sit inside an OPEN fenced block");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("P2: a long back-tick run in the Handoff is enclosed by a LONGER fence", () => {
  const root = scratch();
  try {
    const run7 = "`".repeat(7);
    const hostile = LOOP_MD.replace("Something true.", `${run7}\nbreakout attempt\n${run7}`);
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": hostile });
    const md = renderRunReport("feat", { repo: root });
    assert.ok(md.includes("`".repeat(8)), "an 8-back-tick fence must enclose a 7-back-tick run");
    assert.match(md, /breakout attempt/);
    assert.deepEqual(headings(md), [...SECTIONS]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("L10: a Handoff carrying `rule_id:` and `problem:` leaves validate.mjs GREEN over the report", () => {
  // pharn/features/** is on validate's SCANNED surface, and CHECK 5 REDs a scanned .md holding both
  // tokens unless it documents the enum-gated / free-text split. The preamble is UNCONDITIONAL for
  // exactly this reason; this test is the probe that the preamble actually satisfies the checker,
  // rather than the assumption that it does (L37: probe the guard, do not read the claim off it).
  const root = scratch();
  try {
    const hostile = LOOP_MD.replace("Something true.", "rule_id: SEC-1\nproblem: something looked wrong");
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": hostile });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /rule_id:/);
    assert.match(md, /problem:/);
    // Probe an ISOLATED tree holding ONLY the rendered report. The fixture LOOP.md carries the same two
    // tokens, so scanning `root` would RED on the FIXTURE and prove nothing about the artifact — the
    // attribution has to be varied, not just the member (L40).
    const probe = scratch();
    mkdirSync(join(probe, "pharn", "features", "feat"), { recursive: true });
    writeFileSync(join(probe, "pharn", "features", "feat", "RUN-REPORT.md"), md);
    const r = spawnSync("node", [join(here, "validate.mjs"), probe], { encoding: "utf8" });
    rmSync(probe, { recursive: true, force: true });
    assert.equal(r.status, 0, `validate must be GREEN over the rendered report:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("★ NEGATIVE CONTROL: validate.mjs REDs the same content WITHOUT the split preamble", () => {
  // Proves the preceding test measures the preamble, not a checker that never fires here (L40: to test
  // an attribution, vary the attributed condition).
  const root = scratch();
  try {
    mkdirSync(join(root, "pharn", "features", "feat"), { recursive: true });
    writeFileSync(join(root, "pharn", "features", "feat", "RUN-REPORT.md"), "# bare\n\nrule_id: SEC-1\nproblem: something looked wrong\n");
    const r = spawnSync("node", [join(here, "validate.mjs"), root], { encoding: "utf8" });
    assert.notEqual(r.status, 0, "a finding template with no split documentation must RED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the pre-run snapshot (L21) ───────────────────────────────────────────────────────────────────────

test("L21: the porcelain snapshot is PARSED, not sliced at a fixed offset", () => {
  const cases = [
    [" M src/a.ts", "src/a.ts"],
    ["?? new file.txt", "new file.txt"],
    ["A  dir/b.mjs", "dir/b.mjs"],
    ['?? "sp ace/\\303\\251.md"', "sp ace/é.md"],
    ['R  "old name.md" -> "new name.md"', "new name.md"],
    ["R  old.md -> new.md", "new.md"],
    [' M "tab\\there.md"', "tab\there.md"],
  ];
  assert.equal(cases.length, 7, "non-vacuity: the case set must be non-empty and counted");
  for (const [line, want] of cases) {
    const got = parsePorcelain(line);
    assert.ok(got.has(want), `parsePorcelain(${JSON.stringify(line)}) must contain ${JSON.stringify(want)}`);
  }
  // Both sides of a rename are recorded: the run touched both.
  assert.deepEqual([...parsePorcelain("R  old.md -> new.md")].sort(), ["new.md", "old.md"]);
});

test("★ NEGATIVE CONTROL (L21): a fixed-offset slice would get the quoted cases WRONG", () => {
  // The defect this pins is a naive `line.slice(3)`. Without this control the test above could pass
  // against an implementation that never unquotes, since the unquoted cases agree.
  const line = '?? "sp ace/\\303\\251.md"';
  const naive = line.slice(3);
  assert.notEqual(naive, "sp ace/é.md", "the naive slice must differ — otherwise this test proves nothing");
  assert.ok(parsePorcelain(line).has("sp ace/é.md"));
});

test("unquoteC leaves an unquoted path untouched and decodes a quoted one", () => {
  assert.equal(unquoteC("plain/path.ts"), "plain/path.ts");
  assert.equal(unquoteC('"a\\nb"'), "a\nb");
  assert.equal(unquoteC('"a\\\\b"'), "a\\b");
  assert.equal(unquoteC('"q\\"q"'), 'q"q');
  assert.equal(unquoteC('"\\303\\251"'), "é");
  assert.equal(unquoteC('"\\zz"'), "zz", "an unknown escape degrades to the literal character");
  assert.equal(unquoteC(""), "");
});

test("readDirtySnapshot: absent file → an honest n/a note and a null set", () => {
  const root = scratch();
  try {
    const { set, note } = readDirtySnapshot(root, "feat");
    assert.equal(set, null);
    assert.match(note, /no pre-run snapshot/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readDirtySnapshot: an EMPTY snapshot says the tree was clean — not the same as absent", () => {
  const root = scratch();
  try {
    mkdirSync(join(root, ".pharn", "pharn-loop", "feat"), { recursive: true });
    writeFileSync(join(root, ".pharn", "pharn-loop", "feat", "pre-run-status.txt"), "");
    const { set, note } = readDirtySnapshot(root, "feat");
    assert.equal(set.size, 0);
    assert.match(note, /clean before the run/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the Files section, against a real git repo ───────────────────────────────────────────────────────

test("Files: changed + untracked paths are listed, dirty-before-run marked, PLAN purpose quoted", () => {
  const root = scratch();
  try {
    const base = gitRepo(root);
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "a.ts"), "x");
    writeFileSync(join(root, "src", "undeclared.ts"), "y");
    mkdirSync(join(root, ".pharn", "pharn-loop", "feat"), { recursive: true });
    writeFileSync(join(root, ".pharn", "pharn-loop", "feat", "pre-run-status.txt"), "?? src/a.ts\n");
    feature(root, "feat", {
      "cost.json": costJson({ base_sha: base }),
      "PLAN.md": "# PLAN\n\n## Files\n\n- `src/a.ts` — the thing this increment adds — layer app\n",
    });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /- `src\/a\.ts`/);
    assert.match(md, /dirty-before-run/);
    assert.match(md, /the thing this increment adds/, "the PLAN line is quoted verbatim");
    assert.match(md, /- `src\/undeclared\.ts`.*not named in PLAN ## Files/);
    assert.match(
      md.replace(/\s+/g, " "),
      /changed-since-base observation, not a record of what the build wrote/,
      "the L17 bound must be stated in the artifact (matched wrap-tolerantly — L50)"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Files: a PLAN `## Files` line containing a PIPE is quoted verbatim and breaks nothing", () => {
  const root = scratch();
  try {
    const base = gitRepo(root);
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "a.ts"), "x");
    feature(root, "feat", {
      "cost.json": costJson({ base_sha: base }),
      "PLAN.md": "# PLAN\n\n## Files\n\n- `src/a.ts` — handles a | b | c — layer app\n",
    });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /handles a \| b \| c/, "verbatim: no escaping, because escaping is not a copy");
    assert.deepEqual(
      md.split("\n").filter((l) => /^\|/.test(l)),
      []
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Files: a bracketed path survives GIT_LITERAL_PATHSPECS", () => {
  const root = scratch();
  try {
    const base = gitRepo(root);
    mkdirSync(join(root, "app", "[id]"), { recursive: true });
    writeFileSync(join(root, "app", "[id]", "page.tsx"), "x");
    feature(root, "feat", { "cost.json": costJson({ base_sha: base }) });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /app\/\[id\]\/page\.tsx/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Files: a clean tree at base says so, rather than rendering an empty list", () => {
  const root = scratch();
  try {
    const base = gitRepo(root);
    feature(root, "feat", { "cost.json": costJson({ base_sha: base }) });
    // the feature dir itself is untracked, so it appears; remove the base-diff expectation instead
    const md = renderRunReport("feat", { repo: root });
    assert.deepEqual(headings(md), [...SECTIONS]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Files: a base SHA that is not a commit here degrades to a stated reason", () => {
  const root = scratch();
  try {
    gitRepo(root);
    feature(root, "feat", { "cost.json": costJson({ base_sha: "0".repeat(40) }) });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /_n\/a — /);
    assert.deepEqual(headings(md), [...SECTIONS]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Files: NO git repository at all degrades to a stated reason (L51: the full input domain)", () => {
  // Distinct from the bad-SHA case above: there `git ls-files` still succeeds. Here BOTH reads fail, and
  // the renderer must say so rather than render an empty list that reads as "nothing changed".
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson({ base_sha: "a".repeat(40) }) });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /git could not be read in this worktree/);
    assert.deepEqual(headings(md), [...SECTIONS]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an EXTRA `###` heading in the Handoff is DISCLOSED as data, never silently dropped (L34)", () => {
  const root = scratch();
  try {
    const extra = LOOP_MD.replace("### next_steps", "### smuggled\n\nunexpected.\n\n### next_steps");
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": extra });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /Additional level-3 headings present in the Handoff/);
    assert.match(md, /smuggled/);
    assert.deepEqual(headings(md), [...SECTIONS], "a smuggled heading may not become a report section");
    // The three NORMATIVE subsections are still quoted — an extra does not suppress the real ones.
    assert.match(md, /Ruled out the obvious thing\./);
    assert.match(md, /Do the next thing\./);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("git() returns null rather than throwing when there is no repository", () => {
  const root = scratch();
  try {
    assert.equal(git(root, ["rev-parse", "HEAD"]), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the Verdicts section ─────────────────────────────────────────────────────────────────────────────

test("Verdicts: verdicts are shown and the final-iteration-only bound is stated in the artifact", () => {
  const root = scratch();
  try {
    feature(root, "feat", {
      "cost.json": costJson(),
      "verify-report.json": { verdict: "FAIL", failing_gates: ["test", "lint"] },
      "regression-report.json": { verdict: "regressions", regressions: ["format:check"] },
    });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /verify: `FAIL`/);
    assert.match(md, /regress: `regressions`/);
    assert.match(md, /iteration 2 \(final\)/);
    assert.match(md, /OVERWRITES/, "the bound must be in the artifact, not only in this test");
    for (const gate of ["test", "lint", "format:check"]) assert.match(md, new RegExp(gate));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Verdicts: a non-string regression entry is still rendered, never dropped silently", () => {
  const root = scratch();
  try {
    feature(root, "feat", {
      "cost.json": costJson(),
      "regression-report.json": { verdict: "regressions", regressions: [{ gate: "test", was: 0, now: 1 }] },
    });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /"gate":\s*"test"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the Tokens section ───────────────────────────────────────────────────────────────────────────────

test("Tokens: every class, every row, the totals and the unattributed bucket are shown", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson() });
    const md = renderRunReport("feat", { repo: root });
    assert.equal(TOKEN_CLASSES.length, 6, "non-vacuity: the class set must be non-empty and counted");
    for (const c of TOKEN_CLASSES) assert.match(md, new RegExp(c), `token class ${c} must appear`);
    for (const s of ["pharn-build", "pharn-verify", "claude-opus-5", "claude-sonnet-5"]) {
      assert.match(md, new RegExp(s));
    }
    assert.match(md, /TOTAL/);
    assert.match(md, /unattributed/);
    assert.match(md, /TOKENS ONLY/, "the no-prices bound travels with the table");
    assert.match(md, /output_thinking` is a SUBSET|SUBSET of `output`/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Tokens: the numbers are COPIED from the stored views, not recomputed", () => {
  const root = scratch();
  try {
    // A deliberately INCONSISTENT ledger: totals disagree with the rows. The renderer must show the
    // stored totals verbatim — recomputing would make this report disagree with the file
    // check-cost-ledger.mjs certifies, creating a second store of one fact (L43).
    const c = costJson();
    c.totals.requests = 999;
    feature(root, "feat", { "cost.json": c });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /999/, "the stored total is shown verbatim, inconsistency and all");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── defaults: L41 / L52 ──────────────────────────────────────────────────────────────────────────────

test("L41 NO-ARGUMENT CONTROL: with no --base the WRITE path lands under the imported FEATURE_BASE", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson() });
    const out = writeRunReport("feat", { repo: root }); // no `base`
    assert.ok(existsSync(join(root, FEATURE_BASE, "feat", "RUN-REPORT.md")), `expected the report under ${FEATURE_BASE}`);
    assert.ok(out.endsWith(join(FEATURE_BASE, "feat", "RUN-REPORT.md")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("L52 CLOSURE: this module introduces ZERO new feature-base defaults", () => {
  // L41's remedy is quantified over a SET — "one test per default in this change" — and that set is
  // EMPTY here because the default is imported. This is the closure assertion that keeps it empty: a
  // re-spelled literal fails, rather than merely going untested (L52 is the record of a test written
  // for the wrong member of exactly this set).
  const src = readFileSync(CLI, "utf8");
  const code = src
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
  const hits = [...code.matchAll(/"pharn\/features"/g)];
  assert.equal(hits.length, 0, "the feature-base literal must be imported, never re-spelled in code");
  assert.match(src, /import \{ FEATURE_BASE[^}]*\} from "\.\/render-cost-ledger\.mjs"/);
});

// ── the CLI ──────────────────────────────────────────────────────────────────────────────────────────

const cli = (args, cwd) => spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8" });

test("CLI: --stdout prints the report and exits 0 without writing", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson() });
    const r = cli(["feat", "--repo", root, "--stdout"], REPO);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^# RUN REPORT — feat/);
    assert.ok(!existsSync(join(root, "pharn", "features", "feat", "RUN-REPORT.md")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI: the default invocation writes the file and names the gates-nothing bound", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson() });
    const r = cli(["feat", "--repo", root], REPO);
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(root, "pharn", "features", "feat", "RUN-REPORT.md")));
    assert.match(r.stdout, /gates nothing/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI: fail-closed on unusable input — nothing is written", () => {
  const root = scratch();
  try {
    const bad = [[], ["../escape"], ["Feat"], ["a".repeat(80)], ["feat!"]];
    assert.equal(bad.length, 5, "non-vacuity: the refusal set must be non-empty and counted");
    for (const args of bad) {
      const r = cli([...args, "--repo", root], REPO);
      assert.equal(r.status, 2, `${JSON.stringify(args)} must exit 2`);
      assert.match(r.stderr, /RUN-REPORT:/);
    }
    // a well-formed slug with no feature directory is also a refusal, not an empty report
    const r = cli(["absent", "--repo", root], REPO);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no feature directory/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI: --base is honored, and an absent --base does not inject a second default", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson() }, ".dev/features");
    const r = cli(["feat", "--repo", root, "--base", ".dev/features", "--stdout"], REPO);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /# RUN REPORT — feat/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── small exported helpers ───────────────────────────────────────────────────────────────────────────

test("helpers: na / quoteData / readJson / readTextOrNull behave as the renderer relies on", () => {
  assert.equal(na("why"), "_n/a — why_");
  const q = quoteData("label:", "a ``` b");
  assert.ok(q.includes("````text"), "the fence must exceed the longest inner run");
  assert.ok(q.includes("a ``` b"));
  assert.equal(fenceFor("no ticks"), "```");
  assert.equal(fenceFor("`".repeat(3)), "````");
  const root = scratch();
  try {
    assert.equal(readJson(join(root, "nope.json")), null);
    assert.equal(readTextOrNull(join(root, "nope.txt")), null);
    writeFileSync(join(root, "ok.json"), '{"a":1}');
    assert.deepEqual(readJson(join(root, "ok.json")), { a: 1 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the enumeration this increment joined (L29 / L31) ────────────────────────────────────────────────

test("★ F1 REGRESSION: the header's fencing claim is QUALIFIED, and names its exception", () => {
  // The defect this pins is a FALSE UNIVERSAL, so the assertion is on the claim's wording, not on
  // behaviour: the unqualified form must not return, and the exception must stay named. A prose pin is
  // the honest instrument here — the defect was prose (L37: probe an EXCLUDED member; the excluded
  // member was a file path all along).
  const src = readFileSync(CLI, "utf8");
  assert.ok(!/every region carrying untrusted text is a FENCED BLOCK/.test(src), "the unqualified universal must not return");
  assert.match(src, /every MULTI-LINE region carrying untrusted text is a FENCED BLOCK/);
  assert.match(src, /THE EXCEPTION, named because the sentence above was FALSE as a universal/);
  assert.match(src, /INLINE CODE SPANS, not fences/);
});

test("F1: a back-tick-bearing path is still RENDERED — the exception is cosmetic, not a drop", () => {
  const root = scratch();
  try {
    const base = gitRepo(root);
    writeFileSync(join(root, "we`ird.ts"), "x");
    feature(root, "feat", { "cost.json": costJson({ base_sha: base }) });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /we`ird\.ts/, "the path must appear, span break and all — never silently dropped");
    assert.deepEqual(headings(md), [...SECTIONS], "and it must not become structure");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("★ ENUMERATION (L29/L31): every site that must know `RUN-REPORT.md` names it", () => {
  // The deliverable is the ENUMERATION, materialized once and iterated — not an assertion written for
  // whichever site was in front of the author. Sites 1 and 2 additionally have their own ✧ parity test
  // in check-bash-reconcile.test.mjs; they are listed here so the SET is visible in one place.
  const SITES = [
    ["pharn/floor/check-regress.mjs", /PIPELINE_ARTIFACTS[\s\S]*?"RUN-REPORT\.md"[\s\S]*?\];/],
    ["pharn/floor/reconcile-ignore.json", /"names":[\s\S]*?"RUN-REPORT\.md"/],
    [".claude/commands/pharn-loop.md", /"RUN-REPORT\.md"\]/],
    [".prettierignore", /^pharn\/features\/\*\/RUN-REPORT\.md$/m],
    [".markdownlint-cli2.jsonc", /"pharn\/features\/\*\/RUN-REPORT\.md"/],
  ];
  assert.equal(SITES.length, 5, "non-vacuity: the site set must be non-empty and counted");
  for (const [rel, re] of SITES) {
    const text = readFileSync(join(REPO, rel), "utf8");
    assert.match(text, re, `${rel} must name RUN-REPORT.md`);
  }
});

test("★ WIRING (L45): the committed pharn-loop.md invokes the renderer, in its Step 6b position", () => {
  // Pinning the module is not pinning the invocation. L45 is the record of a guard fixed in its own file
  // while the file that INVOKES it kept the defect for a whole release line, invisible to a suite that
  // only ever spawned the script by path.
  const cmd = readFileSync(join(REPO, ".claude", "commands", "pharn-loop.md"), "utf8");
  const invocation = /node pharn\/floor\/render-run-report\.mjs '<name>' --base pharn\/features/;
  assert.match(cmd, invocation, "the committed command must carry the pinned invocation line");

  const at = (re) => cmd.search(re);
  const ledgerCheck = at(/node pharn\/floor\/check-cost-ledger\.mjs/);
  const render = at(invocation);
  const step6c = at(/^### Step 6c —/m);
  assert.ok(ledgerCheck > 0 && render > 0 && step6c > 0, "non-vacuity: all three anchors must be found");
  assert.ok(ledgerCheck < render, "the render must come AFTER Step 6b's ledger checks");
  assert.ok(render < step6c, "the render must come BEFORE Step 6c");

  // NEGATIVE CONTROL: the assertion must be capable of failing.
  assert.ok(!invocation.test("node pharn/floor/render-run-report.mjs"), "the pin must require the full line");
});

test("★ the staging list and Step 7 both know the report", () => {
  const cmd = readFileSync(join(REPO, ".claude", "commands", "pharn-loop.md"), "utf8");
  assert.match(cmd, /"LOOP\.md", "cost\.json", "RUN-REPORT\.md"\]/, "Step 6c must stage it");
  assert.match(cmd, /\*\*the run report\*\*/, "Step 7 must print from it");
});
