// .dev/floor/command-hygiene.test.mjs — the guard that keeps `lessons-learned.md` L19 closed.
//
// WHY IT LIVES HERE, with no paired checker (GRILL F4). Every other `*.test.mjs` under `.dev/floor/`
// tests a sibling `.mjs` checker. This one tests COMMAND PROSE instead, because the thing it guards is a
// shell invocation embedded in markdown — there is no checker to pair with, and inventing one for a
// single regex would be the speculative addition P7 forbids. It sits here because `.dev/floor/` is where
// the repo's deterministic apparatus lives, and it runs under the same `npm test` glob as everything else.
//
// WHAT IT GUARDS (L19). fix #7 gates `Write|Edit|MultiEdit` only, so a tool a stage invokes through Bash
// writes wherever it likes. `/pharn-dev-build`'s Step 2b used to prescribe `npm run format` — which is
// `prettier --write .`, the WHOLE REPO — while its own prose said "the just-written files". It silently
// reformatted files no plan had declared. This asserts no stage command re-acquires that habit.
//
// ── Honest scope (P0) — what this does and does NOT buy ──────────────────────────────────────────────
// FLOOR (what a green run means): none of the KNOWN repo-wide write invocations appears as a prescribed
//   command in `.claude/commands/*.md`.
// NOT guaranteed: that no repo-wide write can happen. This pins a VOCABULARY, not a behavior — a novel
//   spelling (a new npm script, a shell alias, a different tool) passes untouched. It is a negative
//   assertion over known-bad strings, never a proof of absence, and it does NOT close L19's class: any
//   Bash-invoked tool still escapes the writes-scope entirely. Removing one instance is not closing a door.
//
// Non-LLM, stdlib-only.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const COMMANDS_DIR = new URL("../../.claude/commands/", import.meta.url).pathname;

// A region a command may mark to quote a rejected form for the historical record without tripping this
// guard. Same mechanism as the `TYPE-ENUM:BEGIN/END` block in pharn-dev-memory-promote.md — the house
// pattern for "a doc must quote a value a checker also validates".
const SKIP_RE = /<!--\s*COMMAND-HYGIENE:SKIP-BEGIN[\s\S]*?COMMAND-HYGIENE:SKIP-END\s*-->/g;

/**
 * Forbidden invocations. Each is checked PER LINE, and a line containing `xargs` is exempt — because the
 * correct scoped form ends in the same token as the incorrect bare one:
 *     WRONG: npx markdownlint-cli2 --fix                    (no paths -> config globs -> whole repo)
 *     RIGHT: … | xargs npx markdownlint-cli2 --fix          (paths arrive on argv from stdin)
 * A regex that cannot tell those apart would forbid the very form this repo standardized on.
 */
const FORBIDDEN = [
  {
    // `npm run format` — but NOT `npm run format:check`, which is a read-only gate every stage may use.
    re: /\bnpm run format(?![:\w])/,
    why: "`npm run format` is `prettier --write .` — the whole repo. Format only the paths the stage wrote.",
  },
  {
    // prettier pointed at the repo root, or with no path at all.
    re: /\bprettier\b[^\n]*--write(?:\s+\.)?\s*$/,
    why: "a repo-wide `prettier --write .` (or `--write` with no path) rewrites files no plan declared.",
  },
  {
    // markdownlint-cli2 --fix with no paths: falls back to its config globs = the whole repo.
    re: /\bmarkdownlint-cli2\b[^\n]*--fix\s*$/,
    why: "a bare `markdownlint-cli2 --fix` lints and FIXES every file its config globs match.",
  },
];

function commandFiles() {
  return readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

test("✧ L19: no stage command prescribes a repo-wide formatter/linter WRITE", () => {
  const offenders = [];
  for (const file of commandFiles()) {
    const text = readFileSync(join(COMMANDS_DIR, file), "utf8").replace(SKIP_RE, "");
    text.split(/\r?\n/).forEach((line, i) => {
      if (/\bxargs\b/.test(line)) return; // the scoped form: paths arrive on argv
      for (const { re, why } of FORBIDDEN) {
        if (re.test(line)) offenders.push(`${file}:${i + 1} — ${why}\n      ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `repo-wide formatter write(s) prescribed in command prose:\n    ${offenders.join("\n    ")}`);
});

test("✧ the guard actually DISCRIMINATES — it flags the rejected forms and passes the scoped ones", () => {
  // L4: an authored assertion passes by construction. Pin the matcher's behavior directly, so a future
  // loosening of the regexes fails here rather than silently permitting the defect.
  const flags = (line) => !/\bxargs\b/.test(line) && FORBIDDEN.some(({ re }) => re.test(line));

  // REJECTED — each is the real historical or plausible form.
  assert.ok(flags("- Run the project formatter — `npm run format` (prettier `--write`)"), "npm run format must be flagged");
  assert.ok(flags("npx prettier --write ."), "repo-wide prettier must be flagged");
  assert.ok(flags("npx markdownlint-cli2 --fix"), "bare markdownlint-cli2 --fix must be flagged");

  // ACCEPTED — the forms this repo standardized on.
  assert.ok(!flags("npm run format:check"), "the read-only gate must NOT be flagged");
  assert.ok(!flags("npx prettier --ignore-unknown --write .dev/features/<name>/VERIFY.md"), "a scoped path must not be flagged");
  assert.ok(!flags("npx markdownlint-cli2 --fix .dev/features/<name>/VERIFY.md"), "a scoped path must not be flagged");
  assert.ok(!flags('  node -p "…" | xargs npx prettier --ignore-unknown --write'), "the xargs form must not be flagged");
  assert.ok(!flags('  [ -n "$MD" ] && printf \'%s\\n\' "$MD" | xargs npx markdownlint-cli2 --fix'), "the xargs form must not be flagged");
});

test("✧ the SKIP region is honored, and only inside its markers", () => {
  const marked = `before\n<!-- COMMAND-HYGIENE:SKIP-BEGIN -->\nnpm run format\n<!-- COMMAND-HYGIENE:SKIP-END -->\nafter`;
  assert.ok(!/\bnpm run format(?![:\w])/.test(marked.replace(SKIP_RE, "")), "a quoted form inside the markers must be skipped");
  const unmarked = `before\nnpm run format\nafter`;
  assert.ok(/\bnpm run format(?![:\w])/.test(unmarked.replace(SKIP_RE, "")), "the same string outside the markers must still be caught");
});

// ── Step 2b's gate set: the ENUMERATION is the deliverable (L29) ─────────────────────────────────────
//
// L12 created `/pharn-dev-build` Step 2b to make an increment's own style conformance a BUILD step.
// The step named three tools and RAN two, leaving `eslint` as a prose line asking the agent to confirm
// `npm run lint` was clean — and the asked-for one is the one that got skipped: a `no-useless-assignment`
// in freshly-built code reached `/pharn-dev-verify` as a red `lint` gate one stage later
// (`.dev/features/validate-bad-target/VERIFY.md`). L20 says a discipline-only remedy's second occurrence
// earns a check; L29 says what that check must RANGE OVER — the set, materialized once, with the rules
// iterating it, so a fourth tool added later inherits every rule instead of needing its own assertion.
//
// Honest scope, and it is narrow: this pins that the command's Step 2b block INVOKES each member. It is
// a VOCABULARY assertion like the FORBIDDEN rules above — it cannot prove a run executed the step (Step
// 2b is ADVISORY orchestration, outside the PreToolUse gate), and a mistyped flag would satisfy it.
const STEP_2B_GATES = [
  { tool: "prettier", re: /\|\s*xargs\s+npx\s+prettier\b/ },
  { tool: "markdownlint-cli2", re: /\|\s*xargs\s+npx\s+markdownlint-cli2\b/ },
  { tool: "eslint", re: /\|\s*xargs\s+npx\s+eslint\b/ },
];

function step2bBlock() {
  const body = readFileSync(join(COMMANDS_DIR, "pharn-dev-build.md"), "utf8").replace(SKIP_RE, "");
  const start = body.indexOf("SCOPE=.pharn/writes-scope.json");
  assert.notEqual(start, -1, "Step 2b's scope-reading block must still exist in pharn-dev-build.md");
  const end = body.indexOf("```", start);
  assert.notEqual(end, -1, "Step 2b's fenced block must be closed");
  return body.slice(start, end);
}

for (const gate of STEP_2B_GATES) {
  test(`✧ Step 2b RUNS ${gate.tool} over the scoped paths, rather than naming it in prose`, () => {
    assert.match(step2bBlock(), gate.re, `Step 2b must invoke ${gate.tool} on the paths it parsed from .pharn/writes-scope.json`);
  });

  // The other half, and the load-bearing one: an invocation with NO paths falls back to the tool's own
  // whole-repo default. Measured for eslint (~1.1s bare vs ~1.1s for `eslint .` vs ~0.3s for one file),
  // and already recorded for markdownlint-cli2 in the block's own comment.
  //
  // Shell COMMENT lines are stripped first: the block deliberately discusses the path-less form in
  // order to explain the guard, exactly as the command file uses a SKIP region to quote a rejected
  // form. An assertion that cannot tell a prescription from its own rationale would forbid the
  // explanation (the same distinction FORBIDDEN's `xargs`-exemption makes above).
  test(`✧ Step 2b's ${gate.tool} invocation is never path-less`, () => {
    const invocations = step2bBlock()
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("#"))
      .filter((l) => new RegExp(`npx\\s+${gate.tool}\\b`).test(l));
    assert.ok(invocations.length > 0, `expected a prescribed ${gate.tool} invocation in Step 2b`);
    for (const line of invocations) {
      assert.match(line, /\bxargs\b/, `a path-less ${gate.tool} falls back to the whole repo: ${line.trim()}`);
    }
  });
}

// The non-empty guard is what makes the path-less case unreachable on an empty list under GNU xargs,
// so it is asserted for every SUBSET gate — the ones that filter the scope before piping it.
for (const gate of STEP_2B_GATES.filter((g) => g.tool !== "prettier")) {
  test(`✧ Step 2b guards its ${gate.tool} subset against the empty list (L16)`, () => {
    assert.match(
      step2bBlock(),
      /\[\s-n\s+"\$\w+"\s\]\s+&&/,
      `an empty subset must not reach ${gate.tool}: GNU xargs runs the command once with NO arguments`
    );
  });
}

// ── The lessons-index wiring set: the same L29 shape, one domain over ────────────────────────────────
//
// The lessons index has TWO wiring sites per surface: a plan stage must CHECK the index is fresh before
// selecting from it, and a promote stage must REGENERATE it after landing an entry. That is four members
// across the dev/product pair, and the pair is exactly where this went wrong: the PRODUCT half shipped
// both invocations while the DEV half shipped neither, leaving `/pharn-dev-plan` with prose that NAMED
// staleness ("if the index is stale, fall back") and invoked nothing that could detect it — L30's
// runs-some/asks-for-the-rest shape — and `/pharn-dev-memory-promote` with no regeneration at all, so a
// same-session plan after a promotion read an index missing the just-promoted lesson.
//
// L29 is why this is an ARRAY and not four hand-written assertions: a rule quantified over a set must
// materialize the set once and iterate it, or it gets applied to whichever member was in front of the
// author — which is precisely how the product half came to be wired alone. A fifth site added later
// inherits every rule below for free.
//
// Each regex is FLOOR-SPECIFIC on purpose (`.dev/floor/…` vs `pharn/floor/…`), because these are a
// deliberate copy-pair: pasting the product path into a dev command would regenerate the USER's
// gitignored cache instead of this repo's committed index, and every other gate would stay green.
//
// Honest scope, and it is the same narrow kind as FORBIDDEN and STEP_2B_GATES above: this pins that the
// command PROSE contains the invocation. It CANNOT prove a run executed it, that the branch is obeyed,
// or that the flags are right — "the wiring is pinned" NEVER means "the sweep was fresh" (P0). It lives
// under `.dev/` and not `pharn/floor/` because a user's install ships `pharn/floor/` WITHOUT `.dev/`,
// so the dependency may only point `.dev/` -> product, never the reverse.
const LESSONS_SWEEP_WIRING = [
  { file: "pharn-plan.md", role: "checks the index before selecting", re: /pharn\/floor\/check-lessons-index\.mjs\b[^\n]*--verdict/ },
  { file: "pharn-dev-plan.md", role: "checks the index before selecting", re: /node\s+\.dev\/floor\/check-lessons-index\.mjs/ },
  { file: "pharn-memory-promote.md", role: "regenerates the index after a promotion", re: /node\s+pharn\/floor\/gen-lessons-index\.mjs/ },
  {
    file: "pharn-dev-memory-promote.md",
    role: "regenerates the index after a promotion",
    re: /node\s+\.dev\/floor\/gen-lessons-index\.mjs/,
  },
];

function commandBody(file) {
  return readFileSync(join(COMMANDS_DIR, file), "utf8").replace(SKIP_RE, "");
}

for (const site of LESSONS_SWEEP_WIRING) {
  test(`✧ ${site.file} ${site.role} — the invocation is present, not merely described`, () => {
    assert.match(commandBody(site.file), site.re, `${site.file} must INVOKE its lessons-index tool, not name the condition in prose`);
  });

  // L4: an authored assertion passes by construction. Pin the matcher's DISCRIMINATION directly — strip
  // the invocation out of the real body and require the regex to stop matching — so a future loosening
  // (e.g. dropping `node\s+`, or widening the floor path) fails here instead of silently certifying a
  // command that lost its wiring.
  test(`✧ the ${site.file} rule DISCRIMINATES — it fails on a body with the invocation removed`, () => {
    const stripped = commandBody(site.file).replace(new RegExp(site.re.source, "g"), "<<removed>>");
    assert.doesNotMatch(stripped, site.re, `the ${site.file} matcher must not still pass once the invocation is gone`);
  });
}

test("✧ the lessons-index wiring set is non-vacuous — every named command exists on disk", () => {
  // L25's failure mode is a checker that certifies by STAYING SILENT. Without this, renaming a command
  // would make its rules above throw ENOENT rather than pass — but adding a member that never existed,
  // or a future refactor to a forgiving reader, would go quietly green over an empty domain.
  const present = new Set(commandFiles());
  const missing = LESSONS_SWEEP_WIRING.filter((s) => !present.has(s.file)).map((s) => s.file);
  assert.deepEqual(missing, [], `these wiring-set members name no live command file: ${missing.join(", ")}`);
  assert.equal(LESSONS_SWEEP_WIRING.length, 4, "expected both surfaces x both sites (dev/product x check/regenerate)");
});

// ── The `applied_lessons` re-verification wiring (check-plan-lessons.mjs) ─────────────────────────────
//
// A SEPARATE set from LESSONS_SWEEP_WIRING above, deliberately. That one ranges over the lessons INDEX
// tooling (check-lessons-index / gen-lessons-index — a derived address book); this one ranges over
// check-plan-lessons.mjs, a different checker answering a different question (is the PLAN's declaration
// well-formed and resolvable?). Merging them would put two obligations behind one `length` assertion,
// which is the failure L29 names, not a tidier version of it.
//
// WHY the set spans SIX commands and not the two that re-verify. The obligation is "every command whose
// procedure branches on this checker INVOKES it", and that is what must be enumerated — not the subset
// that happens to be interesting. Two PLAN stages self-check the field they just wrote; two GRILL stages
// re-verify a field they did NOT author (which is what makes the declaration stop being self-attested);
// two SHIP orchestrators read the exit code as a proceed/stop input. A seventh site added later inherits
// every rule below for free.
//
// The LESSONS-FILE ARGUMENT is the discriminating axis here, NOT the checker path. Unlike the index
// pair above — where `.dev/floor/…` vs `pharn/floor/…` separates the copies — check-plan-lessons.mjs is
// a SINGLE checker under pharn/floor/ that BOTH surfaces invoke. What must not cross the boundary is the
// CANON it is pointed at: a dev command pointed at the user's `memory-bank/` (or a product command at
// this repo's `.dev/memory-bank/`) would check the wrong canon and every other gate would stay green.
// So each member pins its own full invocation, argument included.
//
// Honest scope, the same narrow kind as FORBIDDEN / STEP_2B_GATES / LESSONS_SWEEP_WIRING above: this
// pins that the command PROSE contains the invocation with the right canon argument. It CANNOT prove a
// run executed it, that the exit-code branch is obeyed, or that a RED actually stops the stage —
// "the wiring is pinned" NEVER means "the declaration was re-verified" (P0).
const CHECKER = String.raw`node\s+pharn\/floor\/check-plan-lessons\.mjs`;
const PLAN_LESSONS_WIRING = [
  // `\s+\S+\s+` is the PLAN.md argument; the trailing group is the canon this site must point at.
  {
    file: "pharn-plan.md",
    role: "self-checks the declaration it just wrote",
    re: new RegExp(`${CHECKER}\\s+\\S+\\s+memory-bank\\/lessons-learned\\.md`),
  },
  {
    file: "pharn-dev-plan.md",
    role: "self-checks the declaration it just wrote",
    re: new RegExp(`${CHECKER}\\s+\\S+\\s+\\.dev\\/memory-bank\\/lessons-learned\\.md`),
  },
  {
    file: "pharn-grill.md",
    role: "re-verifies a declaration it did not author",
    re: new RegExp(`${CHECKER}\\s+\\S+\\s+memory-bank\\/lessons-learned\\.md`),
  },
  {
    file: "pharn-dev-grill.md",
    role: "re-verifies a declaration it did not author",
    re: new RegExp(`${CHECKER}\\s+\\S+\\s+\\.dev\\/memory-bank\\/lessons-learned\\.md`),
  },
  {
    file: "pharn-ship.md",
    role: "reads the exit code as a proceed/stop input",
    re: new RegExp(`${CHECKER}\\s+\\S+\\s+memory-bank\\/lessons-learned\\.md`),
  },
  {
    file: "pharn-dev-ship.md",
    role: "reads the exit code as a proceed/stop input",
    re: new RegExp(`${CHECKER}\\s+\\S+\\s+\\.dev\\/memory-bank\\/lessons-learned\\.md`),
  },
];

for (const site of PLAN_LESSONS_WIRING) {
  test(`✧ ${site.file} ${site.role} — the invocation is present, not merely described`, () => {
    assert.match(
      commandBody(site.file),
      site.re,
      `${site.file} must INVOKE check-plan-lessons.mjs against its own canon, not name the condition in prose`
    );
  });

  // L4: an authored assertion passes by construction. Pin the matcher's DISCRIMINATION directly.
  test(`✧ the ${site.file} lessons-reverify rule DISCRIMINATES — it fails on a body with the invocation removed`, () => {
    const stripped = commandBody(site.file).replace(new RegExp(site.re.source, "g"), "<<removed>>");
    assert.doesNotMatch(stripped, site.re, `the ${site.file} matcher must not still pass once the invocation is gone`);
  });

  // The CROSS-SURFACE guard, and it is the load-bearing half: a dev command must NOT invoke the checker
  // against the user's `memory-bank/`, and a product command must NOT reach into this repo's
  // `.dev/memory-bank/`. Asserting only presence would let a pasted line check the wrong canon silently.
  test(`✧ ${site.file} points the checker at ITS OWN canon — the other surface's path does not appear on the invocation`, () => {
    const isDev = site.file.startsWith("pharn-dev-");
    const wrong = isDev
      ? new RegExp(`${CHECKER}\\s+\\S+\\s+memory-bank\\/lessons-learned\\.md`)
      : new RegExp(`${CHECKER}\\s+\\S+\\s+\\.dev\\/memory-bank\\/lessons-learned\\.md`);
    assert.doesNotMatch(
      commandBody(site.file),
      wrong,
      `${site.file} invokes check-plan-lessons.mjs against the ${isDev ? "PRODUCT" : "DEV"} canon — the surfaces must not cross`
    );
  });
}

test("✧ the lessons-reverify wiring set is non-vacuous — every named command exists on disk", () => {
  // Without this, renaming a command would make the rules above throw ENOENT rather than pass, and a
  // member naming no live file would certify over an empty domain (L34: a per-item assertion set says
  // nothing when there are no items).
  const present = new Set(commandFiles());
  const missing = PLAN_LESSONS_WIRING.filter((s) => !present.has(s.file)).map((s) => s.file);
  assert.deepEqual(missing, [], `these wiring-set members name no live command file: ${missing.join(", ")}`);
  assert.equal(
    PLAN_LESSONS_WIRING.length,
    6,
    "expected both surfaces x three roles (dev/product x plan-selfcheck/grill-reverify/ship-read)"
  );
});

// ── The lesson-extract wiring (Step 2b of /pharn-dev-ship) ───────────────────────────────────────────
//
// A THIRD set, separate from both above for the reason L29 gives: three obligations behind one `length`
// assertion is the failure, not a tidier version of it. LESSONS_SWEEP_WIRING ranges over the index
// tooling, PLAN_LESSONS_WIRING over the declaration checker; this one ranges over the PROPOSE-and-ask
// step, which invokes neither checker and answers a different question again (did the run offer its
// lesson to a human, and route an accepted one through the gated command?).
//
// WHY THE SET HAS THREE NAMED MEMBERS AND ONE WIRED MEMBER, written down rather than discovered later.
// L31: a deliberate copy-pair creates an obligation set nothing ranges over, and the second copy is
// where the obligation gets dropped — precisely because the first copy is correct and reviewable in
// isolation. Scoping lesson-extract to /pharn-dev-ship ALONE (an explicit human decision at the
// discovery halt, not an oversight) CREATES exactly such a set: three orchestrators reach a
// post-verify human gate, and one of them now offers a lesson there. So the set is materialized NOW,
// with the two unwired members carried as `wired: false` rather than omitted — an omitted member is
// indistinguishable from a member nobody thought of, which is the whole defect L31 names.
//
// `pharn-loop.md` additionally needs a DIFFERENT shape when it is wired, and that is recorded here
// because it is the kind of fact that is expensive to rediscover: it already carries a lesson-adjacent
// `## Handoff` -> `### learned`, and pharn/floor/check-loop-record.mjs holds that subsection list to
// EXACT equality — so a lesson there is a MODIFICATION of an existing step (a new top-level section or
// an envelope key), never an added `###`, which would be an immediate RED.
//
// Honest scope, the same narrow kind as every set above: these pin that the command PROSE carries the
// invocation, the ordering, and the outcome vocabulary. They CANNOT prove a run executed Step 2b, that
// a human was actually asked, or that a candidate was not dropped — the increment's only real behavior
// is untestable from here by construction (commands are not `role:`-bearing capabilities, so nothing
// can run a behavioral case over one). "The wiring is pinned" NEVER means "the lesson was extracted".
const LESSON_EXTRACT_WIRING = [
  {
    file: "pharn-dev-ship.md",
    wired: true,
    role: "proposes a lesson at GATE 2 and routes an accepted one through the gated promote command",
    // The PROMOTE COMMAND is the discriminating token: Step 2b must hand off to the dedicated command,
    // never write canon itself. Dev surface, so the DEV promote command — a product `/pharn-memory-promote`
    // here would point a dev run at the user's memory-bank/, the same cross-surface error
    // PLAN_LESSONS_WIRING guards on its own axis.
    re: /\/pharn-dev-memory-promote/,
  },
  { file: "pharn-ship.md", wired: false, role: "not wired — deferred by explicit human decision", re: null },
  { file: "pharn-loop.md", wired: false, role: "not wired — deferred; needs the Handoff-modification shape", re: null },
];

// The five outcome values, materialized once (L29). Three carry a VARIABLE payload, so a member is a
// MATCHER and not a bare literal: string equality over `promoted L<n>` would fail on the very values it
// exists to pin, and a `.includes()` on the stem alone would let `lesson: promoted` (no id) pass. Each
// pattern is anchored on the literal `lesson:` prefix so a stray mention of the word elsewhere in the
// command cannot satisfy it.
const LESSON_OUTCOMES = [
  { name: "promoted", re: /`lesson: promoted L<n>`/ },
  { name: "skipped", re: /`lesson: skipped`/ },
  { name: "none", re: /`lesson: none`/ },
  { name: "not-reached", re: /`lesson: not-reached \(<stage>\)`/ },
  { name: "error", re: /`lesson: error <reason>`/ },
];

// A LINE-INITIAL `## ` heading offset, not an `indexOf` over the body (GRILL F2 -> L6: a structural
// fact is read from its structured location, never pattern-matched as a substring). The command's own
// `description:` frontmatter and its prose both mention step names; only a heading declares one.
// Returns -1 when absent, and every caller below asserts >= 0 FIRST, so a missing heading fails closed
// rather than comparing against -1 and silently reading as "earlier".
// The L7 guard's logic, EXTRACTED so the real body and a mutant run through the SAME code path.
// Returns null when there is no `writes:` line at all (the caller REDs on that separately — a command
// with no declaration is not silently "clean"), else whether that line names canon.
function canonInWritesLine(body) {
  const line = body.match(/^writes:.*$/m);
  if (!line) return null;
  return /memory-bank/.test(line[0]);
}

function headingOffset(body, title) {
  const re = new RegExp(`^ {0,3}#{2,6}[ \\t]+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m");
  const m = body.match(re);
  return m ? m.index : -1;
}

for (const site of LESSON_EXTRACT_WIRING.filter((s) => s.wired)) {
  test(`✧ ${site.file} ${site.role} — the invocation is present, not merely described`, () => {
    assert.match(
      commandBody(site.file),
      site.re,
      `${site.file} must INVOKE /pharn-dev-memory-promote for an accepted candidate, not name the condition in prose`
    );
  });

  // L4: an authored assertion passes by construction. Pin the DISCRIMINATION directly.
  test(`✧ the ${site.file} lesson-extract rule DISCRIMINATES — it fails on a body with the invocation removed`, () => {
    const stripped = commandBody(site.file).replace(new RegExp(site.re.source, "g"), "<<removed>>");
    assert.doesNotMatch(stripped, site.re, `the ${site.file} matcher must not still pass once the invocation is gone`);
  });

  // The L7 GUARD, and it is the load-bearing rule in this file for this increment. A stage that only
  // PROPOSES a lesson must not hold write-scope to canon: declaring the canon path in `writes:` would
  // make set-writes-scope.cjs resolve a scope the pre-write hook then PERMITS, handing this command the
  // ungated canon write that check-provenance + the human accept exist to withhold. That is L7's own
  // recorded instance (it happened to /review) and it was available here. Scoped to the `writes:` LINE
  // so the path may still appear in `reads:` and in prose, which it must.
  test(`✧ ${site.file} does NOT declare memory-bank canon in writes: (L7)`, () => {
    const verdict = canonInWritesLine(commandBody(site.file));
    assert.notEqual(verdict, null, `${site.file} must declare a writes: line at all`);
    assert.equal(
      verdict,
      false,
      `${site.file} declares canon in writes: — a proposing stage must route the write through /pharn-dev-memory-promote, never hold scope to it`
    );
  });

  // L4: an authored fixture passes by construction. An earlier version of this test matched a
  // hand-written `writes:` string against a hand-written regex — it exercised NONE of the guard's own
  // extraction, so it would have stayed green even if `canonInWritesLine` had stopped finding the line
  // at all. The mutant is derived from the REAL body, so both sides run the same code.
  test(`✧ the ${site.file} writes: guard DISCRIMINATES — canon spliced into the REAL writes: line is caught`, () => {
    const body = commandBody(site.file);
    const mutant = body.replace(/^writes:.*$/m, (l) => l.replace(/\]\s*$/, `, ".dev/memory-bank/lessons-learned.md"]`));
    assert.notEqual(mutant, body, "the mutation must actually change the body, or this test is vacuous (L34)");
    assert.equal(
      canonInWritesLine(mutant),
      true,
      "the guard must catch a canon path spliced into the command's own writes: line — otherwise it certifies by not looking"
    );
  });

  // POSITION (the re-anchored "before the final commit" requirement). No ship/loop command performs any
  // git operation, so the original anchor does not exist; the real one is "before the roll-up write".
  test(`✧ ${site.file} runs lesson-extract BEFORE the SHIP.md write step`, () => {
    const body = commandBody(site.file);
    const lesson = headingOffset(body, "Step 2b — lesson-extract");
    const write = headingOffset(body, "Step 3 —");
    assert.ok(lesson >= 0, `${site.file} must carry a line-initial "Step 2b — lesson-extract" heading`);
    assert.ok(write >= 0, `${site.file} must carry a line-initial "Step 3 —" heading`);
    assert.ok(
      lesson < write,
      `${site.file} places lesson-extract at offset ${lesson}, after the Step-3 roll-up write at ${write} — the lesson must be decided before the artifact that records it is written`
    );
  });

  for (const outcome of LESSON_OUTCOMES) {
    test(`✧ ${site.file} specifies the \`${outcome.name}\` lesson outcome`, () => {
      assert.match(
        commandBody(site.file),
        outcome.re,
        `${site.file} must name the ${outcome.name} outcome — an outcome the command does not spell out is one a run can silently omit`
      );
    });
  }

  // THE CLOSURE assertion, and it is the half that makes the enumeration above mean anything. Presence
  // rules are satisfiable by a set that is not closed: the command shipped `not-reached (<stop>)`
  // alongside `not-reached (<stage>)` and every presence rule stayed GREEN, because a matcher can only
  // pin the spelling its author was looking at. Caught at /pharn-dev-review, in the increment whose
  // stated purpose was to close this very set.
  //
  // L27's shape — "present in its own case AND ABSENT from the others" — applied to SPELLING rather
  // than to branches: collect EVERY back-ticked `lesson: …` the command writes and require each to be a
  // member. A variant of any member (not just the one that drifted) now fails here. The parameterized
  // members are the ones at risk, because a parameter is the part an author re-derives from local
  // context instead of copying — `<stop>` read naturally in a section about loop stops.
  test(`✧ ${site.file} writes NO lesson-outcome spelling outside the enumeration (closure, not just presence)`, () => {
    const found = [...commandBody(site.file).matchAll(/`lesson: [^`]+`/g)].map((m) => m[0]);
    assert.ok(found.length > 0, "expected at least one back-ticked lesson: outcome — otherwise this rule is vacuous (L34)");
    const stray = [...new Set(found.filter((f) => !LESSON_OUTCOMES.some((o) => o.re.test(f))))];
    assert.deepEqual(
      stray,
      [],
      `${site.file} writes lesson-outcome spelling(s) outside LESSON_OUTCOMES: ${stray.join(", ")} — add the member, or fix the spelling; a set with a member under two names is not a closed set`
    );
  });
}

test("✧ the lesson-extract wiring set is non-vacuous — every named command exists on disk", () => {
  // L34, and it is not decorative here: the WIRED subset has exactly ONE member, so without this guard
  // every rule above would pass vacuously the day someone renames the command, and a vacuous pass is
  // indistinguishable from a real one at the verdict. Both the total and the wired count are pinned, so
  // wiring a deferred member (or dropping one) fails here and forces the change to be deliberate.
  const present = new Set(commandFiles());
  const missing = LESSON_EXTRACT_WIRING.filter((s) => !present.has(s.file)).map((s) => s.file);
  assert.deepEqual(missing, [], `these wiring-set members name no live command file: ${missing.join(", ")}`);
  assert.equal(LESSON_EXTRACT_WIRING.length, 3, "expected all three post-verify orchestrators to be NAMED (L31)");
  assert.equal(
    LESSON_EXTRACT_WIRING.filter((s) => s.wired).length,
    1,
    "expected exactly one WIRED member (/pharn-dev-ship); the product two are deferred by explicit decision"
  );
  assert.equal(LESSON_OUTCOMES.length, 5, "the outcome enumeration is the deliverable (L29) — pin its size");
});
