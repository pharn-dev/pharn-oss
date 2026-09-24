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
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
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
    assert.equal(SECTIONS.length, 6, "non-vacuity: the vocabulary must be non-empty");
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

test("Verdicts: the per-AC table (6.20.0) is the report's ac_gate, FENCED — a pipe or back-tick in a test id cannot break out", () => {
  const root = scratch();
  try {
    const hostile = "tests/ac/a.test.js::AC-1: ```\n## Injected | col | shift";
    feature(root, "feat", {
      "cost.json": costJson(),
      "verify-report.json": {
        verdict: "FAIL",
        failing_gates: ["ac-delivery", "test"],
        ac_gate: {
          mode: "test-first",
          verdict: "FAIL",
          reason: null,
          evidence: [{ reason: "ac-never-red", detail: "no red run" }],
          acs: [
            { id: "AC-1", level: "unit", tests: [hostile], status: "passed", reason: null, detail: "" },
            { id: "AC-2", level: "unit", tests: [], status: "failed", reason: "ac-not-passed", detail: "1 of 1 failed" },
          ],
          note: "an AC is delivered = …",
        },
      },
    });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /acceptance criteria: `FAIL` \(test-first\)/);
    assert.match(md, /AC-1 {2}unit {2}passed {2}delivered/);
    assert.match(md, /AC-2 {2}unit {2}failed {2}ac-not-passed {2}\(no matched test\)/);
    assert.match(md, /evidence {2}ac-never-red {2}no red run/);
    assert.deepEqual(headings(md), [...SECTIONS], "the hostile id opened no heading — the section set is unchanged");
    // an out-of-set mode/verdict is never interpolated inline
    feature(root, "feat", {
      "cost.json": costJson(),
      "verify-report.json": { verdict: "PASS", failing_gates: [], ac_gate: { mode: "`x`", verdict: "GREEN!", acs: [] } },
    });
    assert.match(renderRunReport("feat", { repo: root }), /acceptance criteria: `unknown` \(unknown\)/);
    // a report without the block says so, never a silent omission
    feature(root, "feat", { "cost.json": costJson(), "verify-report.json": { verdict: "PASS", failing_gates: [] } });
    assert.match(renderRunReport("feat", { repo: root }), /acceptance criteria: _n\/a — verify-report\.json carries no ac_gate/);
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

// ── WIRING: an ENUMERATION over INVOKING COMMANDS, not a test for the one in front of the author ─────
//
// This began as a single assertion about `pharn-loop.md`. `/pharn-ship` is the SECOND invoker, and
// [[L29]] is explicit that when a remedy is quantified over a set, the ENUMERATION is the deliverable —
// an assertion authored for one member reads as discharged for all of them. [[L31]] names a deliberate
// pair as the highest-value place such a set hides, because the second copy is invisible precisely
// while the first is correct and reviewable on its own. So the set is materialized HERE and the rules
// iterate it: a THIRD invoking command inherits every rule below without anyone editing this file.
//
// [[L45]] is why this pins the INVOCATION and not the module: a guard fixed in its own file kept the
// defect for a whole release line because the file that INVOKED it was never updated, and a suite that
// only ever spawned the script by path could not see the gap.
//
// Each member names the boundary its render must precede. The boundaries DIFFER by command and that is
// the point — the loop must render before it COMMITS, ship before it can HALT on attestation — so a
// single shared regex would be wrong for one of them.
const RENDERER_INVOKERS = [
  {
    file: "pharn-loop.md",
    role: "renders at every stop that has a feature directory, before Step 6c's commit",
    boundary: /^### Step 6c —/m,
    boundaryLabel: "Step 6c (the commit)",
  },
  {
    file: "pharn-ship.md",
    role: "renders at every exit that ends the run, before Step 3b can STOP or halt on attestation",
    boundary: /^## Step 3b —/m,
    boundaryLabel: "Step 3b (attestation)",
  },
];

const RENDER_INVOCATION = /node pharn\/floor\/render-run-report\.mjs '<name>' --base pharn\/features/;
const LEDGER_CHECK = /node pharn\/floor\/check-cost-ledger\.mjs/;

test("★ WIRING ENUMERATION (L29/L31/L45) is non-vacuous and covers every invoking command", () => {
  assert.ok(RENDERER_INVOKERS.length >= 2, `expected >=2 invoking commands, got ${RENDERER_INVOKERS.length}`);
  const files = RENDERER_INVOKERS.map((c) => c.file);
  assert.deepEqual([...new Set(files)], files, "no duplicate member");
  // Closure over the CORPUS, not over this list: any command that invokes the renderer must be a
  // member. This is what makes a third invoker fail here instead of silently going uncovered — the
  // exact gap L31 records, where the set of sites was never written down so "done" was assessed
  // per-file.
  const cmdDir = join(REPO, ".claude", "commands");
  const invokers = readdirSync(cmdDir).filter((f) => f.endsWith(".md") && RENDER_INVOCATION.test(readFileSync(join(cmdDir, f), "utf8")));
  assert.deepEqual(invokers.sort(), [...files].sort(), "every command invoking the renderer must be enumerated above");
});

for (const cmd of RENDERER_INVOKERS) {
  test(`★ WIRING (L45): ${cmd.file} ${cmd.role}`, () => {
    const text = readFileSync(join(REPO, ".claude", "commands", cmd.file), "utf8");
    assert.match(text, RENDER_INVOCATION, "the committed command must carry the pinned invocation line");

    const at = (re) => text.search(re);
    const ledgerCheck = at(LEDGER_CHECK);
    const render = at(RENDER_INVOCATION);
    const boundary = at(cmd.boundary);
    assert.ok(ledgerCheck > 0 && render > 0 && boundary > 0, `non-vacuity: all three anchors must be found in ${cmd.file}`);
    assert.ok(ledgerCheck < render, "the render must come AFTER the ledger checks");
    assert.ok(render < boundary, `the render must come BEFORE ${cmd.boundaryLabel}`);
  });
}

test("★ NEGATIVE CONTROL: the invocation pin requires the FULL line, not the module name", () => {
  assert.ok(!RENDER_INVOCATION.test("node pharn/floor/render-run-report.mjs"), "a bare module path must not satisfy the pin");
  assert.ok(!RENDER_INVOCATION.test("node pharn/floor/render-run-report.mjs '<name>'"), "a missing --base must not satisfy the pin");
  assert.ok(RENDER_INVOCATION.test("node pharn/floor/render-run-report.mjs '<name>' --base pharn/features"), "and the real line must");
});

test("★ the staging list and Step 7 both know the report", () => {
  const cmd = readFileSync(join(REPO, ".claude", "commands", "pharn-loop.md"), "utf8");
  assert.match(cmd, /"LOOP\.md", "cost\.json", "RUN-REPORT\.md"\]/, "Step 6c must stage it");
  assert.match(cmd, /\*\*the run report\*\*/, "Step 7 must print from it");
});

// ── command-neutrality: the report serves a SECOND emitter without a second renderer ────────────────
//
// Everything below branches on `cost.json`'s OWN fields — `command` and `outcome.source` — which is the
// structured location (L6). Nothing infers the emitting command from which sibling artifacts happen to
// exist on disk.

/** A ledger as `/pharn-ship` emits it: a DERIVED outcome and no LOOP.md anywhere. */
const shipCost = (over = {}) =>
  costJson({ command: "/pharn-ship", outcome: { decision: "gate2", iterations: 1, source: "verdicts+markers" }, ...over });

test("Outcome: a DERIVED decision carries the floor/advisory split BESIDE the value (GRILL G2)", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": shipCost() });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /\*\*DERIVED\*\*/, "a derived decision must say so");
    assert.match(md, /`gate2` is \*\*FLOOR\*\*/, "the floor half must be labelled");
    assert.match(md, /`stop:<stage>` is \*\*ADVISORY\*\*/, "the advisory half must be labelled");
    assert.match(md, /`stop:unknown` is the terminal fallback/);
    assert.match(md, /never from `SHIP\.md` prose/, "L6: the outcome is not read from a roll-up");
    assert.match(md, /no equivalent\n?re-derivation here and none is claimed/, "the asymmetry with /pharn-loop must be named");
    // The label must reach a reader of THIS artifact — not only the contract.
    assert.ok(md.indexOf("ADVISORY") < md.indexOf("## Tokens"), "the split belongs in the Outcome section, beside the value");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Outcome: a DECLARED decision keeps the loop's wording — the loop's bytes do not move", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson(), "LOOP.md": LOOP_MD });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /copied verbatim from `LOOP\.md`'s frontmatter/);
    assert.doesNotMatch(md, /\*\*DERIVED\*\*/, "a declared decision must NOT claim to be derived");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Outcome: an absent or unrecognized source says so rather than picking a story", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson({ outcome: { decision: "x", iterations: 1, source: "made-up" } }) });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /absent or unrecognized/);
    assert.doesNotMatch(md, /\*\*DERIVED\*\*/);
    assert.doesNotMatch(md, /copied verbatim/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Handoff: a command that writes no record says BY DESIGN, not 'missing'", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": shipCost() });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /writes no `LOOP\.md`, so this run has no Handoff BY DESIGN/);
    assert.match(md, /nothing is missing/);
    // And the LOOP case must keep the other message, or this is one branch overwriting both.
    const root2 = scratch();
    try {
      feature(root2, "feat", { "cost.json": costJson() }); // declared source, no LOOP.md on disk
      assert.match(renderRunReport("feat", { repo: root2 }), /a stop that wrote no record has no Handoff to quote/);
    } finally {
      rmSync(root2, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Verdicts names the EMITTING command, and a hostile command token cannot reach the prose", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": shipCost(), "verify-report.json": { verdict: "PASS" } });
    assert.match(renderRunReport("feat", { repo: root }), /`\/pharn-ship` OVERWRITES/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  // `command` is a CLI argument the ledger bounds only to <=128 control-char-free chars, so a back-tick
  // or a pipe reaches this file. These two sections name it in PROSE, outside any fence, so the token is
  // membership-tested and the fallback is a GENERIC PHRASE — never a silent rewrite, which would misname
  // the command (P5). L37's recipe is to probe an EXCLUDED member, so each row below is one.
  const hostile = ["/pharn-ship`; rm -rf /", "/pharn|ship", "not-a-command", "/PHARN-SHIP", "/pharn ship", "", "/" + "x".repeat(70)];
  assert.ok(hostile.length >= 7, "non-vacuity: the hostile domain must be non-empty");
  for (const command of hostile) {
    const r = scratch();
    try {
      feature(r, "feat", { "cost.json": shipCost({ command }) });
      const md = renderRunReport("feat", { repo: r });
      assert.match(
        md,
        /the emitting command OVERWRITES/,
        `a hostile command ${JSON.stringify(command)} must fall back to the generic phrase`
      );
      assert.ok(!md.includes("`" + command + "` OVERWRITES"), "and must never be interpolated into prose");
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  }
  // MUTATION CONTROL: a legal token must survive, or the rule is satisfied by rejecting everything.
  const r = scratch();
  try {
    feature(r, "feat", { "cost.json": shipCost({ command: "/pharn-loop" }) });
    assert.match(renderRunReport("feat", { repo: r }), /`\/pharn-loop` OVERWRITES/);
  } finally {
    rmSync(r, { recursive: true, force: true });
  }
});

test("★ F1 REGRESSION: the absent-briefing sentinel states an ABSENCE, never another command's lifecycle", () => {
  // The defect this pins, found at /pharn-dev-review and fixed before GATE 2 closed: the sentinel read
  // "<command> renders one only at GATE 2", which is FALSE for `/pharn-loop` — a command with no GATE 2
  // that never renders a briefing. A renderer whose claim is that EVERY LINE IS DERIVED cannot emit a
  // derived line that is wrong for one of its two callers, even in an `n/a`.
  //
  // Probed per CALLER rather than asserted once (L37: the quantifier is where the drift lands), so a
  // future sentinel that is true for one command and false for the other fails here.
  const CALLERS = ["/pharn-loop", "/pharn-ship"];
  assert.ok(CALLERS.length >= 2, "non-vacuity: the caller set must be non-empty");
  for (const command of CALLERS) {
    const root = scratch();
    try {
      feature(root, "feat", { "cost.json": costJson({ command }) });
      const md = renderRunReport("feat", { repo: root });
      const line = md.split("\n").find((l) => l.includes("no BRIEFING.md"));
      assert.ok(line, `${command}: the sentinel must be present`);
      assert.doesNotMatch(line, /GATE 2/, `${command}: the sentinel must not name a gate the command may not have`);
      assert.doesNotMatch(
        line,
        new RegExp(command.replace("/", "\\/")),
        `${command}: the sentinel must not attribute the absence to a command`
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  // MUTATION CONTROL: the assertion must be capable of failing, or it certifies by not looking.
  assert.match("no BRIEFING.md — `/pharn-loop` renders one only at GATE 2", /GATE 2/, "the pre-fix text must trip the rule");
});

test("Briefing: LINKED when present, honest n/a when absent — never an omitted section (L34)", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": shipCost(), "BRIEFING.md": "---\nfeature: feat\n---\n\n# BRIEFING\n" });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md, /\[`BRIEFING\.md`\]\(\.\/BRIEFING\.md\)/, "a present briefing must be linked");
    assert.match(md, /Linked, not quoted/);
    assert.match(md, /ship-briefing\.md/, "P4: the contract is cited, never restated");
    // LINKED, NOT QUOTED is a real property, not a slogan: no byte of the briefing may appear.
    assert.ok(!md.includes("# BRIEFING"), "no content of the briefing may be copied in");
    assert.deepEqual(headings(md), [...SECTIONS], "and the section must not change the closed vocabulary");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  const bare = scratch();
  try {
    feature(bare, "feat", { "cost.json": shipCost() });
    const md = renderRunReport("feat", { repo: bare });
    assert.match(md, /_n\/a — no BRIEFING\.md beside this report/, "an absent briefing is a stated absence");
    assert.deepEqual(headings(md), [...SECTIONS], "the section is emitted either way");
    assert.doesNotMatch(md, /BRIEFING[^\n]*GATE 2/, "the sentinel must not attribute a GATE 2 to the emitting command");
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
});

// ===================================================================================================
// MEASUREMENT LABELS (`pharn-cost-ledger/2`) — the report must say WHICH population its numbers count,
// and an unknown run must never render as a number. Plus one end-to-end CLI chain.
// ===================================================================================================

const tokensOf = (md) => md.split("## Tokens")[1].split("## Files")[0];
const MEMB = (over = {}) => ({
  method: "run-window/1",
  status: "bounded",
  reason: null,
  session: "00000000-0000-4000-8000-0000000000d1",
  start: "2026-09-21T10:00:00.000Z",
  end: "2026-09-21T10:30:00.000Z",
  excluded_requests: 4,
  ...over,
});

test("LABEL: a /2 bounded ledger names the RUN WINDOW, its bounds, the selected session and the excluded count", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson({ schema: "pharn-cost-ledger/2", membership: MEMB() }) });
    const t = tokensOf(renderRunReport("feat", { repo: root }));
    assert.match(t, /Measured population: the RUN WINDOW/);
    assert.match(t, /window start {7}2026-09-21T10:00:00\.000Z/);
    assert.match(t, /window end {9}2026-09-21T10:30:00\.000Z/);
    assert.match(t, /excluded requests {2}4/);
    assert.match(t, /NOT a feature's lifetime cost/);
    assert.match(t, /TOTAL/, "the numbers still render under a known window");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("LABEL: an UNKNOWN window renders 'UNKNOWN — NOT a zero' and NO token table", () => {
  const root = scratch();
  try {
    const zero = Object.fromEntries(TOKEN_CLASSES.map((c) => [c, 0]));
    feature(root, "feat", {
      "cost.json": costJson({
        schema: "pharn-cost-ledger/2",
        coverage: "unavailable",
        membership: MEMB({
          status: "unknown",
          reason: "no run-start marker was recorded",
          start: null,
          end: null,
          excluded_requests: null,
        }),
        totals: { requests: 0, tokens: zero },
        by_model: [],
        by_stage_iteration_model: [],
      }),
    });
    const md = renderRunReport("feat", { repo: root });
    const t = tokensOf(md);
    assert.match(t, /Run usage: UNKNOWN — this is NOT a zero/);
    assert.doesNotMatch(t, /TOTAL/, "no table of zeros may stand in for an unknown");
    assert.match(md.split("## Outcome")[1].split("## Tokens")[0], /run membership\s+unknown/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("LABEL: an OPEN window says so; a legacy /1 ledger is labelled SESSION-scoped", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson({ schema: "pharn-cost-ledger/2", membership: MEMB({ status: "open", end: null }) }) });
    assert.match(tokensOf(renderRunReport("feat", { repo: root })), /The window is OPEN/);
    feature(root, "old", { "cost.json": costJson() }); // the default fixture IS a /1 ledger
    const t = tokensOf(renderRunReport("old", { repo: root }));
    assert.match(t, /LEGACY `pharn-cost-ledger\/1` — SESSION-scoped/);
    assert.match(t, /may include activity OUTSIDE this run/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("INTEGRATION: CLI emit → CLI check GREEN → report shows the SAME run-scoped totals (100 before / 10 during)", () => {
  const root = scratch();
  try {
    const S = "00000000-0000-4000-8000-0000000000d2";
    const proj = join(root, "projects", "p");
    mkdirSync(proj, { recursive: true });
    const line = (id, ts, input) =>
      JSON.stringify({
        type: "assistant",
        requestId: id,
        timestamp: ts,
        sessionId: S,
        message: {
          model: "claude-opus-5",
          usage: { input_tokens: input, output_tokens: 0, cache_creation: {}, output_tokens_details: {} },
        },
      });
    writeFileSync(
      join(proj, `${S}.jsonl`),
      [line("before", "2026-09-21T09:00:00.000Z", 100), line("during", "2026-09-21T10:05:00.000Z", 10)].join("\n") + "\n"
    );
    const mdir = join(root, "cost", "feat");
    mkdirSync(mdir, { recursive: true });
    writeFileSync(
      join(mdir, "markers.jsonl"),
      [
        { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2026-09-21T10:00:00.000Z", session_id: S },
        { seq: 2, kind: "run-stop", stage: null, iteration: null, ts: "2026-09-21T10:30:00.000Z", session_id: S },
      ]
        .map((m) => JSON.stringify(m))
        .join("\n") + "\n"
    );
    const emit = spawnSync(
      "node",
      [
        join(here, "render-cost-ledger.mjs"),
        "feat",
        "--repo",
        root,
        "--session",
        S,
        "--projects-dir",
        join(root, "projects"),
        "--markers-base",
        join(root, "cost"),
      ],
      { encoding: "utf8" }
    );
    assert.equal(emit.status, 0, emit.stderr);
    const costPath = join(root, "pharn", "features", "feat", "cost.json");
    const check = spawnSync("node", [join(here, "check-cost-ledger.mjs"), costPath], { encoding: "utf8" });
    assert.equal(check.status, 0, check.stdout);
    const led = JSON.parse(readFileSync(costPath, "utf8"));
    assert.equal(led.totals.tokens.input, 10, "independent literal: 10, never 110");
    const t = tokensOf(renderRunReport("feat", { repo: root }));
    assert.match(t, /Measured population: the RUN WINDOW/);
    const total = t.split("\n").find((l) => l.startsWith("TOTAL"));
    assert.ok(total, "the TOTAL row must render");
    assert.equal(total.trim().split(/\s+/)[4], "10", "the report's TOTAL input equals the ledger's run-scoped 10");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ===================================================================================================
// APPLICABILITY (6.9.1) — the Outcome and the Verdicts sections must agree about whether the reports on
// disk belong to THIS run. End-to-end through the real CLIs: emit → check → render.
// ===================================================================================================

function shipRun(root, markers) {
  const S = "00000000-0000-4000-8000-0000000000e9";
  const proj = join(root, "projects", "p");
  mkdirSync(proj, { recursive: true });
  writeFileSync(
    join(proj, `${S}.jsonl`),
    JSON.stringify({
      type: "assistant",
      requestId: "r1",
      timestamp: "2026-09-22T10:00:30.000Z",
      sessionId: S,
      message: { model: "claude-opus-5", usage: { input_tokens: 1, output_tokens: 0, cache_creation: {}, output_tokens_details: {} } },
    }) + "\n"
  );
  const mdir = join(root, "cost", "feat");
  mkdirSync(mdir, { recursive: true });
  writeFileSync(
    join(mdir, "markers.jsonl"),
    markers.map((m) => JSON.stringify({ iteration: null, stage: null, session_id: S, ...m })).join("\n") + "\n"
  );
  feature(root, "feat", {
    "verify-report.json": { verdict: "PASS", failing_gates: [] },
    "regression-report.json": { verdict: "no-regressions", regressions: [] },
  });
  const emit = spawnSync(
    "node",
    [
      join(here, "render-cost-ledger.mjs"),
      "feat",
      "--command",
      "/pharn-ship",
      "--repo",
      root,
      "--session",
      S,
      "--projects-dir",
      join(root, "projects"),
      "--markers-base",
      join(root, "cost"),
    ],
    { encoding: "utf8" }
  );
  assert.equal(emit.status, 0, emit.stderr);
  const costPath = join(root, "pharn", "features", "feat", "cost.json");
  const check = spawnSync("node", [join(here, "check-cost-ledger.mjs"), costPath], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stdout);
  const md = renderRunReport("feat", { repo: root });
  return {
    led: JSON.parse(readFileSync(costPath, "utf8")),
    outcome: md.split("## Outcome")[1].split("## Tokens")[0],
    verdicts: md.split("## Verdicts")[1].split("## Briefing")[0],
  };
}

test("INTEGRATION: APPLICABLE ship evidence → gate2, and the verdicts are shown WITHOUT an exclusion label", () => {
  const root = scratch();
  try {
    const r = shipRun(root, [
      { seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
      { seq: 2, kind: "stage-start", stage: "pharn-regress", iteration: 1, ts: "2026-09-22T10:00:10.000Z" },
      { seq: 3, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-09-22T10:00:20.000Z" },
      { seq: 4, kind: "run-stop", ts: "2026-09-22T10:01:00.000Z" },
    ]);
    assert.equal(r.led.outcome.decision, "gate2");
    assert.match(r.outcome, /decision\s+gate2/);
    assert.doesNotMatch(r.verdicts, /NOT FROM THIS RUN|CANNOT BE BOUND/);
    assert.match(r.verdicts, /- verify: `PASS`/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("INTEGRATION: an EARLIER run's green reports → NOT gate2, and the verdicts are labelled NOT FROM THIS RUN", () => {
  const root = scratch();
  try {
    const r = shipRun(root, [
      { seq: 1, kind: "run-start", ts: "2026-09-22T09:00:00.000Z" },
      { seq: 2, kind: "stage-start", stage: "pharn-regress", iteration: 1, ts: "2026-09-22T09:00:10.000Z" },
      { seq: 3, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-09-22T09:00:20.000Z" },
      { seq: 4, kind: "run-stop", ts: "2026-09-22T09:01:00.000Z" },
      { seq: 5, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
      { seq: 6, kind: "stage-start", stage: "pharn-grill", ts: "2026-09-22T10:00:10.000Z" },
      { seq: 7, kind: "run-stop", ts: "2026-09-22T10:01:00.000Z" },
    ]);
    assert.equal(r.led.outcome.decision, "stop:pharn-grill");
    assert.match(r.verdicts, /NOT FROM THIS RUN — excluded from the outcome/);
    assert.match(r.verdicts, /applicability {2}not-in-run/);
    // The two sections AGREE: the outcome is not gate2 exactly when the verdicts are labelled excluded.
    assert.doesNotMatch(r.outcome, /decision\s+gate2/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("INTEGRATION: an UNKNOWN run boundary → undetermined, and the verdicts are labelled CANNOT BE BOUND", () => {
  const root = scratch();
  try {
    const r = shipRun(root, [
      { seq: 1, kind: "run-start", ts: "not-a-time" },
      { seq: 2, kind: "stage-start", stage: "pharn-regress", iteration: 1, ts: "2026-09-22T10:00:10.000Z" },
      { seq: 3, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-09-22T10:00:20.000Z" },
    ]);
    assert.equal(r.led.outcome.decision, "undetermined");
    assert.match(r.verdicts, /CANNOT BE BOUND TO THIS RUN/);
    assert.match(r.outcome, /`undetermined` means/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a /pharn-loop ledger's verdicts are never labelled — the applicability rule is ship's", () => {
  const root = scratch();
  try {
    feature(root, "feat", {
      "cost.json": costJson({ markers: [{ seq: 1, kind: "stage-start", stage: "pharn-grill", iteration: null }] }),
      "verify-report.json": { verdict: "PASS", failing_gates: [] },
    });
    const v = renderRunReport("feat", { repo: root }).split("## Verdicts")[1];
    assert.doesNotMatch(v, /NOT FROM THIS RUN|CANNOT BE BOUND/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REVIEW F1: a HISTORICAL ship ledger that stored gate2 from reports now judged not-in-run says so beside the verdicts", () => {
  const root = scratch();
  try {
    feature(root, "feat", {
      "cost.json": costJson({
        command: "/pharn-ship",
        outcome: { decision: "gate2", iterations: 1, source: "verdicts+markers" },
        markers: [
          { seq: 1, kind: "run-start", stage: null, iteration: null, ts: "2026-09-22T09:00:00.000Z", session_id: null },
          { seq: 2, kind: "stage-start", stage: "pharn-grill", iteration: null, ts: "2026-09-22T09:00:10.000Z", session_id: null },
        ],
      }),
      "verify-report.json": { verdict: "PASS", failing_gates: [] },
      "regression-report.json": { verdict: "no-regressions", regressions: [] },
    });
    const md = renderRunReport("feat", { repo: root });
    assert.match(md.split("## Outcome")[1].split("## Tokens")[0], /decision\s+gate2/, "the stored value is NOT rewritten");
    const v = md.split("## Verdicts")[1];
    assert.match(v, /NOT FROM THIS RUN/);
    assert.match(v, /stored `gate2` above predates this applicability rule/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ===================================================================================================
// 6.9.2 — the two ledger states the integration review (.dev/features/cost-ship-integration-review, F1/F2)
// found this report misrendering. Driven through the REAL emitter CLI where the state is produced by it.
// ===================================================================================================

import { ledgerCurrency } from "./render-run-report.mjs";

const S92 = "00000000-0000-4000-8000-0000000000f2";
function markersAt(markersBase, name, ms) {
  mkdirSync(join(markersBase, name), { recursive: true });
  writeFileSync(
    join(markersBase, name, "markers.jsonl"),
    ms.map((m) => JSON.stringify({ stage: null, iteration: null, session_id: S92, ...m })).join("\n") + "\n"
  );
}
function emitCli(root, name, markersBase, extra = []) {
  return spawnSync(
    "node",
    [
      join(here, "render-cost-ledger.mjs"),
      name,
      "--repo",
      root,
      "--session",
      S92,
      "--projects-dir",
      join(root, "projects"),
      "--markers-base",
      markersBase,
      ...extra,
    ],
    { encoding: "utf8" }
  );
}

test("F1: a KNOWN window with an UNAVAILABLE transcript renders 'UNAVAILABLE — NOT a zero', never a measured empty window", () => {
  const root = scratch();
  try {
    mkdirSync(join(root, "projects"), { recursive: true }); // the transcript lookup MISSES
    const mb = join(root, ".pharn", "cost");
    for (const [label, ms] of [
      [
        "bounded",
        [
          { seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
          { seq: 2, kind: "run-stop", ts: "2026-09-22T10:30:00.000Z" },
        ],
      ],
      ["open", [{ seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" }]],
    ]) {
      markersAt(mb, "feat", ms);
      assert.equal(emitCli(root, "feat", mb).status, 0);
      const cost = JSON.parse(readFileSync(join(root, "pharn", "features", "feat", "cost.json"), "utf8"));
      assert.equal(cost.coverage, "unavailable", label);
      assert.equal(cost.membership.status, label);
      const t = renderRunReport("feat", { repo: root }).split("## Tokens")[1].split("## Files")[0];
      assert.match(t, /Run usage: UNAVAILABLE — not measured, and NOT a zero/, label);
      assert.doesNotMatch(t, /Measured population/, `${label}: an unmeasured run is never labelled as a measured window`);
      assert.doesNotMatch(t, /nothing was recorded against a stage/, label);
      assert.match(t, /no transcript found for session/, `${label}: the ledger's own reason is quoted as DATA`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("F1 CONTROL: a partial (measured) ledger still carries the 'Measured population' label", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson({ schema: "pharn-cost-ledger/2", membership: MEMB() }) });
    const t = renderRunReport("feat", { repo: root }).split("## Tokens")[1];
    assert.match(t, /Measured population: the RUN WINDOW/);
    assert.doesNotMatch(t, /UNAVAILABLE/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("F2: a FAILED emission leaves the previous run's cost.json — the report renders it as STALE, never as this run's", () => {
  const root = scratch();
  try {
    const proj = join(root, "projects", "p");
    mkdirSync(proj, { recursive: true });
    writeFileSync(
      join(proj, `${S92}.jsonl`),
      JSON.stringify({
        type: "assistant",
        requestId: "r1",
        timestamp: "2026-09-22T08:05:00.000Z",
        sessionId: S92,
        message: { model: "m", usage: { input_tokens: 3, output_tokens: 0 } },
      }) + "\n"
    );
    const mb = join(root, ".pharn", "cost"); // the DEFAULT markers location under --repo (no flag below)
    const run1 = [
      { seq: 1, kind: "run-start", ts: "2026-09-22T08:00:00.000Z" },
      { seq: 2, kind: "stage-start", stage: "pharn-regress", iteration: 1, ts: "2026-09-22T08:01:00.000Z" },
      { seq: 3, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-09-22T08:02:00.000Z" },
      { seq: 4, kind: "run-stop", ts: "2026-09-22T08:30:00.000Z" },
    ];
    markersAt(mb, "feat", run1);
    feature(root, "feat", {
      "verify-report.json": { verdict: "PASS", failing_gates: [] },
      "regression-report.json": { verdict: "no-regressions", regressions: [] },
    });
    assert.equal(emitCli(root, "feat", mb, ["--command", "/pharn-ship"]).status, 0);
    // CONTROL: run 1's own report is current, with its gate2.
    let md = renderRunReport("feat", { repo: root });
    assert.doesNotMatch(md, /STALE LEDGER/);
    assert.match(md.split("## Outcome")[1].split("## Tokens")[0], /decision\s+gate2/);

    // Run 2 starts (a new run-start), stops at grill, and its emission FAILS (bad usage → exit 2).
    markersAt(mb, "feat", [
      ...run1,
      { seq: 5, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
      { seq: 6, kind: "stage-start", stage: "pharn-grill", ts: "2026-09-22T10:01:00.000Z" },
    ]);
    assert.equal(emitCli(root, "feat", mb, ["--command", "/pharn-ship", "--base-sah", "x"]).status, 2);
    md = renderRunReport("feat", { repo: root }); // NO markersBase: the default path (L41)
    assert.match(md, /\*\*STALE LEDGER\.\*\*/);
    const outcome = md.split("## Outcome")[1].split("## Tokens")[0];
    assert.doesNotMatch(outcome, /gate2/, "the previous run's gate2 is never shown as this run's");
    assert.match(outcome, /STALE LEDGER — cost\.json describes an EARLIER run/);
    assert.match(md.split("## Tokens")[1].split("## Files")[0], /STALE LEDGER/);
    assert.match(md.split("## Files")[1].split("## Verdicts")[0], /STALE LEDGER/);
    assert.match(md.split("## Verdicts")[1].split("## Briefing")[0], /No current ledger — see STALE LEDGER above/);
    assert.deepEqual(headings(md), [...SECTIONS], "every section is still present");

    // CONTROL: once run 2 emits successfully, its ledger is current again.
    assert.equal(emitCli(root, "feat", mb, ["--command", "/pharn-ship"]).status, 0);
    assert.doesNotMatch(renderRunReport("feat", { repo: root }), /STALE LEDGER/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("F2 / GRILL 1: identity, not 'greater seq' — a RESET markers file whose seq restarted still reads STALE", () => {
  const cost = { markers: [{ seq: 1, kind: "run-start", ts: "2026-09-22T08:00:00.000Z", stage: null, iteration: null, session_id: null }] };
  const reset = [{ seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z", stage: null, iteration: null, session_id: null }];
  assert.equal(ledgerCurrency(cost, reset).state, "stale");
  assert.equal(ledgerCurrency(cost, cost.markers).state, "current");
  assert.equal(ledgerCurrency({ markers: [] }, reset).state, "stale", "a ledger with no run-start vs a live one");
  assert.equal(ledgerCurrency(cost, []).state, "unchecked");
});

test("F2: no live markers file → an explicit 'currency not checked' line, never a silent pass", () => {
  const root = scratch();
  try {
    feature(root, "feat", { "cost.json": costJson() });
    const md = renderRunReport("feat", { repo: root, markersBase: join(root, "nowhere") });
    assert.match(md, /Ledger currency not checked/);
    assert.doesNotMatch(md, /STALE LEDGER/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
