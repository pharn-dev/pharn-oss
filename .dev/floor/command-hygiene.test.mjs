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
    // The IMPERATIVE INVOCATION is the discriminating token — not the bare command name. The name
    // appears EIGHT times in this command (in `reads:`, in the frontmatter rationale comment, in the
    // 2b.4 outcome table, and in five prose citations), so a bare-name matcher would stay GREEN with
    // the actual hand-off deleted: it would certify by not looking precisely enough, the same defect
    // as the first `writes:` guard below. Anchoring on `**invoke \`…\`` means only Step 2b's actual
    // instruction satisfies it. Dev surface, so the DEV promote command — a product
    // `/pharn-memory-promote` here would point a dev run at the user's `memory-bank/`, the
    // cross-surface error PLAN_LESSONS_WIRING guards on its own axis.
    re: /\*\*invoke\s+`\/pharn-dev-memory-promote`/,
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
  //
  // The SECOND assertion is the load-bearing one, and it names the failure mode a bare-name matcher
  // would have missed: after stripping the invocation the command name is STILL present many times
  // over (`reads:`, the frontmatter comment, the outcome table, five prose citations). A matcher
  // keyed on the bare name would keep passing on that body — certifying a command that had lost its
  // hand-off. Asserting the name SURVIVED the mutation is what stops the first assertion from passing
  // for the uninteresting reason that the mutation erased every trace.
  test(`✧ the ${site.file} lesson-extract rule DISCRIMINATES — surviving prose mentions do NOT satisfy it`, () => {
    const stripped = commandBody(site.file).replace(new RegExp(site.re.source, "g"), "<<removed>>");
    assert.doesNotMatch(stripped, site.re, `the ${site.file} matcher must not still pass once the invocation is gone`);
    assert.match(
      stripped,
      /pharn-dev-memory-promote/,
      "the mutant must still MENTION the command — otherwise this proves nothing about a matcher keyed on the bare name"
    );
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

// ── The *memory-promote GATE-PROCEDURE parity set ────────────────────────────────────────────────────
//
// A FOURTH set, separate from the three above for the reason L29 gives. Those range over the index
// tooling, the declaration checker, and the propose-and-ask step; this one ranges over the GATE
// PROCEDURE the two *memory-promote commands run before they write canon — a different question again:
// does each surface's promote command still perform every hardening step, or has one copy quietly kept
// fewer than the other?
//
// WHY IT EXISTS (the P7 trigger — a REAL prior occurrence, not a hypothetical). Five product-only
// hardenings (`SKILLS_VERSION` 2.2.4-2.2.8) landed in ONE PR (#117) that CREATED and hardened
// `/pharn-memory-promote`; the dev twin was never brought forward and kept NONE of them, with every
// gate green. That is the SECOND time this exact pair has dropped an obligation: the FIRST is recorded
// in canon as L31, whose own provenance is `dev-lessons-index-gate` — the increment where "the product
// half shipped both invocations while the dev half shipped neither" was discovered in the very same
// *memory-promote / *plan wiring (see LESSONS_SWEEP_WIRING's header above, which narrates it). L20's
// bar is "a discipline-only remedy WILL recur; the second occurrence is the trigger to give it a floor
// check", and that bar is met here with a named first occurrence rather than a manufactured one.
//
// L31 diagnoses WHY it recurs: a deliberate copy-pair's CODE is pinned to agree (check-provenance.mjs's
// twin has ✧ agreement tests), while the pair's COMMAND OBLIGATIONS were enumerated nowhere — so "done"
// was assessed per-file, and the second copy is where the obligation gets dropped precisely because the
// first is correct and reviewable in isolation. This array is that missing enumeration.
//
// THE 5 -> 8 MAPPING, written down so the CHANGELOG correspondence stays traceable. The five shipped
// hardenings expand to eight INDEPENDENTLY DROPPABLE obligations, and the count tracks droppability
// rather than the changelog, because droppability is what the test is for:
//   2.2.4 (canon TOCTOU)          -> `canon-hash-pin` + `canon-hash-reverify`   (pin and compare can be
//                                     dropped separately; a pin nobody compares is inert)
//   2.2.5 (canon write channel)   -> `canon-write-channel` + `canon-write-forbidden-routes`
//                                     (the mandate and the denied-alternatives list are separable — the
//                                     dev command already carried a fragment of the first with none of
//                                     the second)
//   2.2.6 (title shape)           -> `title-shape-gate`
//   2.2.7 (live-state provenance) -> `runtime-date-capture` + `provenance-captured-not-composed`
//                                     (a runtime `date` capture and the no-model-recall rule are
//                                     separately removable)
//   2.2.8 (two clocks + gate)     -> `gate-before-askquestion`
//
// THE ANCHORS ARE PINNED STRINGS, NOT PARAPHRASES (L22): each `re` matches a literal command line or a
// mandated-verb heading the command must carry, never incidental prose. Every anchor was MEASURED
// against live bytes of both commands BEFORE this set was authored (L4: an authored assertion passes by
// construction) — all eight were present in the product command and ABSENT from the pre-port dev
// command, 8/8, so each matcher demonstrably measures the hardening rather than pre-existing text.
//
// !! IF A PRODUCT-SIDE MEMBER GOES RED, RE-READ `pharn-memory-promote.md` — DO NOT LOOSEN THE REGEX. !!
// This instruction lives HERE, at the point where the pressure is felt, and not only in a plan nobody
// re-reads. The pressure is real and structural: an increment scoped to the DEV command cannot edit the
// product one, so weakening the matcher is the only remedy available inside such a scope — which is
// exactly the ratchet toward a set that certifies less and less (L29 / L36). A product-side red means
// the product command changed; the correct responses are to update the anchor to the product's NEW
// pinned line (having read it), or to port the change. Never to widen.
//
// Honest scope, the same narrow kind as the three sets above: this pins that each command's PROSE
// contains the pinned line or mandated verb. It CANNOT prove a run executed the step, that a HALT is
// obeyed, or that the ported one-liners are implemented correctly (two of them are inline `node -e`
// with no test of their own). "The parity is pinned" NEVER means "the gate ran" (P0).
const PROMOTE_GATE_PARITY = [
  {
    obligation: "canon-hash-pin", // 2.2.4a
    role: "pins the canon content-hash at discovery, for the Step-6 TOCTOU compare",
    dev: /\.pharn\/pharn-dev-memory-promote\/canon-content-hash\.txt/,
    prod: /\.pharn\/pharn-memory-promote\/canon-content-hash\.txt/,
  },
  {
    obligation: "canon-hash-reverify", // 2.2.4b
    role: "re-verifies canon against that pin immediately before the accept-path write",
    dev: /changed since Step 1 discovery/,
    prod: /changed since Step 1 discovery/,
  },
  {
    obligation: "canon-write-channel", // 2.2.5a
    role: "mandates a hook-gated Write/Edit/MultiEdit channel for every canon byte",
    dev: /\*\*Canon write channel \(fix #7\)\.\*\*/,
    prod: /\*\*Canon write channel \(fix #7\)\.\*\*/,
  },
  {
    obligation: "canon-write-forbidden-routes", // 2.2.5b
    role: "names the denied alternatives (shell redirection / Node fs / formatter auto-fix)",
    dev: /\*\*Explicitly forbidden for canon writes:\*\*/,
    prod: /\*\*Explicitly forbidden for canon writes:\*\*/,
  },
  {
    obligation: "title-shape-gate", // 2.2.6
    role: "validates the candidate title's shape before any Markdown render",
    dev: /title must be a single line \(no newlines\)/,
    prod: /title must be a single line \(no newlines\)/,
  },
  {
    obligation: "runtime-date-capture", // 2.2.7a
    role: "captures `date` from runtime rather than a model-estimated today",
    dev: /date \+%Y-%m-%d/,
    prod: /date \+%Y-%m-%d/,
  },
  {
    obligation: "provenance-captured-not-composed", // 2.2.7b
    role: "forbids model-composed provenance fields",
    dev: /\*\*Provenance is captured, not composed \(P5\)\.\*\*/,
    prod: /\*\*Provenance is captured, not composed \(P5\)\.\*\*/,
  },
  {
    obligation: "gate-before-askquestion", // 2.2.8
    role: "blocks the human gate until the Step-3 floor check is GREEN",
    dev: /Do not call `AskQuestion`/,
    prod: /Do not call `AskQuestion`/,
  },
];

// THE CROSS-SURFACE COUPLING THIS SET INTRODUCES, recorded because it was ACCEPTED, not overlooked.
// Ranging over both surfaces makes a DEV-side test's health a function of PRODUCT-side prose: an unrelated
// reword of `pharn-memory-promote.md` can redden this suite for reasons having nothing to do with the dev
// command. That is a real ripple across the boundary the dev/product split otherwise insulates, and it was
// put to the maintainer at the plan gate and accepted deliberately — a dev-only set would repeat the
// per-file assessment that let all five hardenings go missing in the first place (L31), which is the whole
// defect this set exists to close. The mitigation is the anchor discipline stated above (pinned command
// lines and mandated verbs only, never incidental prose), NOT a narrower domain.
//
// Note the direction, because it is the permitted one: this dependency points `.dev/` -> `.claude/commands/`.
// A user's install ships `pharn/floor/` WITHOUT `.dev/`, so nothing on the shipped surface depends on this
// test; the honest consequence is the same as the lessons-index pair's — it guards the two commands IN THIS
// REPO and does not travel with the shipped code.
const PROMOTE_SURFACES = [
  { file: "pharn-dev-memory-promote.md", key: "dev", label: "DEV" },
  { file: "pharn-memory-promote.md", key: "prod", label: "PRODUCT" },
];

for (const site of PROMOTE_GATE_PARITY) {
  for (const surface of PROMOTE_SURFACES) {
    const re = site[surface.key];

    test(`✧ ${surface.file} carries the ${site.obligation} gate step — it ${site.role}`, () => {
      assert.match(
        commandBody(surface.file),
        re,
        `${surface.file} is missing the ${site.obligation} step. If this is the PRODUCT command, RE-READ it and update the anchor or port the change — never loosen the regex.`
      );
    });

    // L4: an authored assertion passes by construction. Pin the matcher's DISCRIMINATION directly, the
    // same way every set above does — strip the matched text and require the regex to stop matching.
    test(`✧ the ${surface.file} ${site.obligation} rule DISCRIMINATES — it fails on a body with the step removed`, () => {
      const stripped = commandBody(surface.file).replace(new RegExp(re.source, "g"), "<<removed>>");
      assert.doesNotMatch(stripped, re, `the ${surface.file} ${site.obligation} matcher must not still pass once the step is gone`);
    });
  }
}

// The CROSS-SURFACE closure guard, and it is the load-bearing half (L27's "present in its own case AND
// absent from the other", which L29 calls the part that is not decorative). The paste error this pair
// invites is copying a step across without re-pointing its floor path — a dev step running the PRODUCT
// checker would validate a candidate against the wrong TARGET_ENUM and the wrong COMMIT_RE (the product
// copy admits `unknown`, which the dev surface deliberately rejects), and every other gate would stay
// green. Presence alone cannot see that; this can.
//
// Scoped to `floor` paths ONLY, deliberately: the product command legitimately CITES `.dev/memory-bank/`
// canon paths in its L19 attributions, and a separate in-flight change may remove them, so a broader
// `\.dev\/` rule would couple this test to prose it has no business pinning.
for (const surface of PROMOTE_SURFACES) {
  test(`✧ ${surface.file} runs its OWN surface's check-provenance — the other floor's copy does not appear`, () => {
    const wrong = surface.key === "dev" ? /pharn\/floor\/check-provenance\.mjs/ : /\.dev\/floor\/check-provenance\.mjs/;
    assert.doesNotMatch(
      commandBody(surface.file),
      wrong,
      `${surface.file} references the ${surface.key === "dev" ? "PRODUCT" : "DEV"} check-provenance.mjs — the two copies gate different TARGET_ENUMs and COMMIT_REs, so the surfaces must not cross`
    );
  });

  test(`✧ ${surface.file} does invoke a check-provenance at all — otherwise the closure rule above is vacuous (L34)`, () => {
    const own = surface.key === "dev" ? /\.dev\/floor\/check-provenance\.mjs/ : /pharn\/floor\/check-provenance\.mjs/;
    assert.match(
      commandBody(surface.file),
      own,
      `${surface.file} invokes no check-provenance.mjs — the absence would satisfy the cross-surface rule for free`
    );
  });
}

test("✧ the promote gate-parity set is non-vacuous — both commands exist and the enumeration is pinned", () => {
  // L34: "for each X, assert P" says nothing when there are no X. Both the surface list and the
  // obligation list are pinned, so truncating either — or renaming a command — fails HERE rather than
  // silently reducing the domain every rule above ranges over.
  const present = new Set(commandFiles());
  const missing = PROMOTE_SURFACES.filter((s) => !present.has(s.file)).map((s) => s.file);
  assert.deepEqual(missing, [], `these promote surfaces name no live command file: ${missing.join(", ")}`);
  assert.equal(PROMOTE_SURFACES.length, 2, "the parity set spans the copy-PAIR — a one-surface set is the per-file assessment L31 names");
  assert.equal(
    PROMOTE_GATE_PARITY.length,
    8,
    "eight independently-droppable obligations (the 5 -> 8 mapping is in this section's header); pin the size, per L29"
  );
  // Every member must name a distinct obligation: a duplicated key would inflate the count above while
  // covering less than it claims.
  const keys = PROMOTE_GATE_PARITY.map((s) => s.obligation);
  assert.equal(new Set(keys).size, keys.length, `duplicate obligation key(s) in PROMOTE_GATE_PARITY: ${keys.join(", ")}`);
});

// ── The `--target` narrowing rules (L8's mechanic, converted from canon note to check) ───────────────
//
// WHY THIS EXISTS (P7). An external adversarial review reported, and this increment reproduced live,
// that `/pharn-ship` invoked `set-writes-scope.cjs --from-frontmatter` with NO `--target` while
// declaring THREE placeholder `writes:` paths. `resolveEntry` returns null for every placeholder entry
// when `target` is undefined, so the scope came back empty and the setter FAILED CLOSED — exit 1, no
// scope file written — leaving the terminal pipeline stage running under `enforce-writes-scope.cjs`'s
// DEFAULT_SAFE_SET (which permits any path under `features/**`) while the command's own guarantee audit
// claimed "FLOOR: hook (fix #7) … pin exactly these three paths". A false floor claim in the stage that
// ends the pipeline. The setter's refusal was CORRECT and is unchanged; the call site was the bug.
//
// THE TRIGGER, STATED RATHER THAN INFLATED. `lessons-learned.md` L8 already names this mechanic and
// prescribes the remedy verbatim ("re-scope per-artifact — call the setter once immediately before each
// write, as /pharn-dev-regress and /pharn-dev-verify do"). But L8's own provenance records its first
// instance as "AVOIDED, not hit — surfaced by reading set-writes-scope.cjs live, not by a dogfood
// failure". So this is the FIRST OBSERVED failure and L20's "the second occurrence is the trigger" bar
// is NOT cleanly met. It does not need to be: P7's own bar — an addition triggered by a real failure —
// is met directly by the reported, reproduced defect. Recorded this way because a manufactured trigger
// is exactly the disease P0 names; `check-plan-lessons` sub-check (D) takes the same posture.
//
// WHY TWO RULES AND NOT ONE (L36 — presence is not closure). Rule A alone is satisfied by a single call
// carrying one `--target`, which would have left two of `/pharn-ship`'s three artifacts unscoped: the
// per-line rule cannot see that a command owes N calls. Rule B ranges over the ARTIFACTS instead, so a
// partial fix still fails.
//
// The site set is DISCOVERED from the corpus rather than hand-listed (L29 in its strongest available
// form): a command added later inherits both rules without anyone editing this file.
//
// Honest scope, the same narrow kind as every set above: these read command PROSE. Rule A proves the
// flag is PRESENT on an anchored invocation LINE. Rule B is deliberately WEAKER and the difference is
// stated rather than glossed: it proves each declared path appears somewhere in the body after a
// `--target` token — `targetValues()` scans the whole body, NOT only invocation lines — so a path named
// after `--target` in ordinary prose would satisfy it. Rule A is what keeps the invocations themselves
// honest; Rule B ranges over the ARTIFACTS, and the two are complementary rather than nested. Neither
// can prove a run executed the line, that a call sits immediately before the write it authorizes, or
// that the ordering is right — "the wiring is pinned" NEVER means "the scope was set" (P0). Tightening
// Rule B to invocation lines only would pass over today's corpus, but no observed failure motivates it
// (P7), so it is recorded as the named residual `ruleb-invocation-line-scan` rather than built.

// Anchored to line start, so a prose mention of the script name never counts as an invocation — the
// same discipline `.claude/hooks/writes-scope-release.test.cjs` uses (pharn-ship.md names the setter in
// prose several times and invokes it four times).
const FROM_FRONTMATTER_LINE = /^[ \t]*node \.claude\/hooks\/set-writes-scope\.cjs --from-frontmatter\b/;
const FROM_PLAN_LINE = /^[ \t]*node \.claude\/hooks\/set-writes-scope\.cjs --from-plan\b/;
// `--target` followed by a real operand. `\S` excludes the flag-with-no-value form, which the setter
// itself rejects (`--target requires a path`).
const TARGET_ON_LINE = /\s--target\s+\S/;
const TARGET_VALUES = /--target\s+(\S+)/g;

/**
 * Is this `writes:` entry a SCOPEABLE placeholder path — one the setter can only resolve via --target?
 * Three deterministic tests, no judgment (P5): it carries a placeholder, it looks like a path, and it
 * has no whitespace. The whitespace test is what excludes pharn-build.md's prose entry
 * `<user-code files named in the plan's ## Files (Phase-1, via --from-plan — not from this list)>`
 * BY CONSTRUCTION rather than by a hand-written exemption (L3: a rule must not convert an existing
 * correct declaration into a block). A glob entry with no `<` (pharn-review.md's `features/**`,
 * pharn-dev-eval.md's `runs/**`) is likewise out — neither command invokes the setter at all.
 */
function isScopeablePlaceholder(entry) {
  return entry.includes("<") && entry.includes("/") && !/\s/.test(entry);
}

/**
 * The `writes:` entries of a command, read from its FRONTMATTER FENCE — never grepped from the body
 * (L6: a structural fact is read from its structured location). The quoted-string extraction mirrors
 * `set-writes-scope.cjs`'s own `writesFromFrontmatter`, so this sees what the setter sees.
 */
function writesEntries(body) {
  const fm = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return [];
  const line = fm[1].split(/\r?\n/).find((l) => /^writes:/.test(l));
  if (!line) return [];
  return [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

function targetValues(body) {
  return new Set([...body.matchAll(TARGET_VALUES)].map((m) => m[1]));
}

/** Every `--from-frontmatter` invocation in the corpus, as {file, line, text}. Discovered, not listed. */
function fromFrontmatterSites() {
  const sites = [];
  for (const file of commandFiles()) {
    commandBody(file)
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (FROM_FRONTMATTER_LINE.test(line)) sites.push({ file, line: i + 1, text: line.trim() });
      });
  }
  return sites;
}

/** Commands owing >=2 setter calls: L8's exact domain ("a command that emits >=2 artifacts"). */
function multiArtifactCommands() {
  return commandFiles()
    .map((file) => ({ file, entries: writesEntries(commandBody(file)).filter(isScopeablePlaceholder) }))
    .filter((c) => c.entries.length >= 2);
}

test("✧ RULE A: every `--from-frontmatter` setter invocation narrows to a `--target`", () => {
  // Without --target, set-writes-scope.cjs resolves every placeholder entry to null, finds an empty
  // scope, and exits 1 having written NOTHING — so the command runs on the fail-closed default instead
  // of its declared scope, and any floor claim it makes about its own writes is false.
  const offenders = fromFrontmatterSites()
    .filter((s) => !TARGET_ON_LINE.test(s.text))
    .map((s) => `${s.file}:${s.line} — ${s.text}`);
  assert.deepEqual(
    offenders,
    [],
    `these setter invocations resolve ZERO paths (placeholder \`writes:\` needs \`--target\`):\n    ${offenders.join("\n    ")}`
  );
});

test("✧ RULE A is non-vacuous — the discovered invocation set is non-trivial", () => {
  // L34: "for each X, assert P" says nothing when there are no X. If the anchor above ever stops
  // matching (the command line is reworded, the commands move), Rule A would pass over an empty domain
  // and a vacuous pass is indistinguishable from a real one at the verdict.
  const sites = fromFrontmatterSites();
  assert.ok(sites.length >= 15, `expected the --from-frontmatter corpus to be non-trivial, got ${sites.length}`);
});

test("✧ RULE A DISCRIMINATES — a real invocation line with its `--target` stripped is caught", () => {
  // L4: an authored fixture passes by construction. The mutant is derived from a REAL corpus line, so
  // both sides run the same matchers; a hand-written string would exercise neither.
  const sites = fromFrontmatterSites();
  const sample = sites.find((s) => TARGET_ON_LINE.test(s.text));
  assert.ok(sample, "expected at least one compliant invocation to mutate (L34)");
  const mutant = sample.text.replace(TARGET_VALUES, "").trimEnd();
  assert.notEqual(mutant, sample.text, "the mutation must actually change the line, or this test is vacuous");
  assert.ok(FROM_FRONTMATTER_LINE.test(mutant), "the mutant must still READ as an invocation — else this proves nothing");
  assert.ok(!TARGET_ON_LINE.test(mutant), "Rule A must flag an invocation whose --target was removed");
});

test("✧ RULE A is CONDITIONAL — `--from-plan` invocations are exempt, and the corpus exercises that branch", () => {
  // L3: a rule made load-bearing must not turn an existing correct declaration into a block.
  // `--from-plan` reads the PLAN's `## Files`, which are already concrete, so it needs no --target and
  // deliberately carries none. Without this control the exemption would be untested and a future
  // widening of the anchor to `--from-` would RED three correct commands.
  const planSites = commandFiles().flatMap((file) =>
    commandBody(file)
      .split(/\r?\n/)
      .filter((l) => FROM_PLAN_LINE.test(l))
      .map((l) => ({ file, text: l.trim() }))
  );
  assert.ok(planSites.length > 0, "expected at least one --from-plan invocation as the control case (L34)");
  for (const s of planSites) {
    assert.ok(!FROM_FRONTMATTER_LINE.test(s.text), `${s.file}: a --from-plan line must not match the --from-frontmatter anchor`);
  }
});

test("✧ RULE B: a command declaring >=2 placeholder `writes:` paths names EACH as a `--target`", () => {
  // L8's mechanic stated over ARTIFACTS rather than over call sites, which is what closes the gap Rule A
  // leaves: one call with one --target satisfies Rule A while leaving the other declared paths unscoped,
  // and the pre-write hook then DENIES them.
  //
  // The >=2 filter is L8's own domain ("a command that emits >=2 artifacts under placeholder paths"),
  // NOT an exemption invented to dodge a failure. It is load-bearing: /pharn-memory-promote and
  // /pharn-dev-memory-promote each declare ONE placeholder entry (`memory-bank/<canon-file>`) and pass
  // `--target <canon-file>` — a bare operator placeholder the human substitutes at run time, which the
  // setter's placeholder regex then resolves. Both are CORRECT; an unfiltered Rule B would RED them,
  // reintroducing the exact L3 defect this file's Rule A control case guards against.
  const offenders = [];
  for (const { file, entries } of multiArtifactCommands()) {
    const targets = targetValues(commandBody(file));
    const missing = entries.filter((e) => !targets.has(e));
    if (missing.length) offenders.push(`${file} — declared but never a --target: ${missing.join(", ")}`);
  }
  assert.deepEqual(offenders, [], `multi-artifact commands must scope EACH declared path:\n    ${offenders.join("\n    ")}`);
});

test("✧ RULE B is non-vacuous — the multi-artifact domain is non-empty and pinned", () => {
  // L34 again, and it bites harder here than for Rule A: the domain is derived through TWO filters
  // (frontmatter parse, then the placeholder predicate), so a change to either could silently empty it.
  // The floor is pinned rather than merely `> 0` so that losing a member fails loudly.
  const domain = multiArtifactCommands();
  assert.ok(
    domain.length >= 5,
    `expected >=5 multi-artifact commands (ship + the regress/verify pairs), got ${domain.length}: ${domain.map((c) => c.file).join(", ")}`
  );
  assert.ok(
    domain.some((c) => c.file === "pharn-ship.md"),
    "pharn-ship.md declares three placeholder writes: paths and MUST be in Rule B's domain — it is the defect this rule was built from"
  );
});

test("✧ RULE B DISCRIMINATES — a fourth placeholder spliced into the REAL writes: line is caught", () => {
  // L4, in the form the LESSON_EXTRACT_WIRING guard already uses: mutate the REAL body so the guard's
  // own frontmatter extraction runs on both sides. An earlier shape that matched a hand-written
  // `writes:` string against a hand-written regex would have stayed green even if `writesEntries` had
  // stopped finding the line at all.
  const body = commandBody("pharn-ship.md");
  const mutant = body.replace(/^writes:.*$/m, (l) => l.replace(/\]\s*$/, `, "features/<name>/NEVER-SCOPED.md"]`));
  assert.notEqual(mutant, body, "the mutation must actually change the body, or this test is vacuous (L34)");
  const entries = writesEntries(mutant).filter(isScopeablePlaceholder);
  assert.ok(entries.includes("features/<name>/NEVER-SCOPED.md"), "the guard must SEE the spliced entry — else it proves nothing");
  assert.ok(
    !targetValues(mutant).has("features/<name>/NEVER-SCOPED.md"),
    "the guard must catch a declared path that is never passed as a --target — otherwise it certifies by not looking"
  );
});

test("✧ the placeholder predicate DISCRIMINATES — it admits real scopeable paths and rejects the known non-paths", () => {
  // L36/L29: the predicate is the part that decides Rule B's DOMAIN, so pinning it directly is what
  // stops a future loosening from silently emptying the rule. Every rejected string below is a REAL
  // `writes:` entry live in this corpus, not an invented one.
  assert.ok(isScopeablePlaceholder("features/<name>/SHIP.md"), "a real placeholder path must qualify");
  assert.ok(isScopeablePlaceholder(".dev/features/<name>/regression-report.json"), "a dev placeholder path must qualify");
  assert.ok(
    !isScopeablePlaceholder("<user-code files named in the plan's ## Files (Phase-1, via --from-plan — not from this list)>"),
    "pharn-build.md's PROSE entry must not qualify — it is scoped via --from-plan, not --target"
  );
  assert.ok(!isScopeablePlaceholder("<files named in PLAN.md only>"), "pharn-dev-build.md's prose entry must not qualify");
  assert.ok(!isScopeablePlaceholder("features/**"), "a bare glob with no placeholder must not qualify (pharn-review.md)");
  assert.ok(!isScopeablePlaceholder("runs/**"), "a bare glob with no placeholder must not qualify (pharn-dev-eval.md)");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// /pharn-review's SUPPRESSION-BACKSTOP CARVE-OUT must keep naming exactly the SCANNER-LESS lenses.
//
// WHY THIS EXISTS (P7 — the trigger is an occurrence, not a hypothetical). `/pharn-review` Step 3b
// asserted, with no carve-out, that "a lens's Layer-1 verdict comes from the scanner's deterministic regex
// … so a skill … cannot erase a scanner-detected shape". That is FALSE for the lenses
// `pharn/floor/lens-scanner-map.json` maps to `null`: no scanner runs, so the backstop does not exist and
// suppression is unbounded — including for `trust-fence`, the attempt-0 injection probe. The command's own
// Step 3 stated the opposite twelve lines above, and nothing detected the contradiction, because
// `validate.mjs` excludes `.claude/commands/`.
//
// This is the SECOND occurrence of the class, which is what earns it a check rather than a comment (L20).
// Occurrence #1 is recorded in the map's own `doc` string — "a real, already-observed drift: two lenses'
// prose name scanners that do not exist" — and the response to it was `pharn/floor/lens-scanner-map.test.mjs`,
// which pins map↔disk↔count-lenses. That test does NOT read command prose, which is precisely the gap that
// let this drift land: a maintainer who wires a scanner for a null lens updates the map and that test, and
// leaves this carve-out naming a lens that is no longer scanner-less, GREEN.
//
// MEMBERSHIP COMES FROM THE MAP, NEVER FROM THIS FILE (L6). Both sets are derived at run time, so a lens
// that gains or loses a scanner is covered the day it changes; nothing here hardcodes a name or a count.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR: the carve-out region NAMES every scanner-less lens and NO scanner-bound one.
// NOT guaranteed: that the prose around those names is TRUE or sufficient. A carve-out listing all four
//   and explaining them wrongly stays GREEN — the same bound `check-contributing-gates` states about
//   itself. It also pins ONE site; the command's three other bounded claims are not covered here (one
//   occurrence, and L20's bar is a second).
const REVIEW_CMD = "pharn-review.md";

// PINNED LITERAL anchor, never a line number — editing the command shifts every line below it
// (the `check-version-badge.mjs` precedent, which locates the badge by URL pattern for this reason).
const CARVE_OUT_ANCHOR = "**The carve-out, and it is the sharp half (P0).**";

function lensScannerMap() {
  const p = new URL("../../pharn/floor/lens-scanner-map.json", import.meta.url).pathname;
  return JSON.parse(readFileSync(p, "utf8")).scanners;
}

// The contiguous blockquote containing the anchor. Structural: expand over `>`-prefixed lines, so the
// region tracks the blockquote rather than an offset.
function carveOutRegion(body) {
  const lines = body.split(/\r?\n/);
  const at = lines.findIndex((l) => l.includes(CARVE_OUT_ANCHOR));
  if (at === -1) return null;
  let lo = at;
  let hi = at;
  while (lo > 0 && /^\s*>/.test(lines[lo - 1])) lo--;
  while (hi < lines.length - 1 && /^\s*>/.test(lines[hi + 1])) hi++;
  return lines.slice(lo, hi + 1).join("\n");
}

// Lens names are matched as BACK-TICKED tokens, not bare substrings. This is load-bearing, not cosmetic:
// `injection` is itself a mapped lens name AND an ordinary English word the carve-out uses in prose
// ("the attempt-0 injection probe"), so a substring test would make the closure rule below unsatisfiable.
// The command names every lens in a code span, so the back-ticks are the real signal.
function backtickedLensNames(region, names) {
  const found = new Set();
  for (const m of region.matchAll(/`([^`]+)`/g)) if (names.has(m[1])) found.add(m[1]);
  return found;
}

test("✧ the /pharn-review carve-out NAMES every scanner-less lens (derived from the map, not hardcoded)", () => {
  const scanners = lensScannerMap();
  const nullLenses = Object.keys(scanners).filter((k) => scanners[k] === null);
  // L34: a per-item assertion set says NOTHING over an empty domain. If the map ever stopped parsing, or
  // every lens gained a scanner, the loop below would certify the carve-out by examining zero lenses.
  assert.ok(nullLenses.length > 0, "no scanner-less lens in the map — the rule below would pass vacuously");

  const region = carveOutRegion(readFileSync(join(COMMANDS_DIR, REVIEW_CMD), "utf8"));
  assert.ok(region, `${REVIEW_CMD}: carve-out anchor not found — the suppression carve-out is missing or reworded`);

  const named = backtickedLensNames(region, new Set(Object.keys(scanners)));
  const missing = nullLenses.filter((l) => !named.has(l));
  assert.deepEqual(
    missing,
    [],
    `the carve-out omits scanner-less lens(es): ${missing.join(", ")} — a lens with no backstop that the carve-out does not name is the exact defect this rule exists to catch`
  );
});

test("✧ the carve-out is CLOSED — it names no SCANNER-BOUND lens (presence is not closure, L36)", () => {
  const scanners = lensScannerMap();
  const mapped = Object.keys(scanners).filter((k) => scanners[k] !== null);
  // L34 again, for the other direction of the domain.
  assert.ok(mapped.length > 0, "no scanner-bound lens in the map — the closure rule below would pass vacuously");

  const region = carveOutRegion(readFileSync(join(COMMANDS_DIR, REVIEW_CMD), "utf8"));
  assert.ok(region, `${REVIEW_CMD}: carve-out anchor not found`);

  // The stale-list direction: a lens gains a scanner, the map is updated, and the carve-out keeps naming
  // it as unprotected. A presence-only rule stays GREEN on exactly that, which is why this half exists.
  const named = backtickedLensNames(region, new Set(Object.keys(scanners)));
  const wrong = mapped.filter((l) => named.has(l));
  assert.deepEqual(
    wrong,
    [],
    `the carve-out names scanner-BOUND lens(es) as unprotected: ${wrong.join(", ")} — it has gone stale against the map`
  );
});

test("✧ the carve-out rules DISCRIMINATE — both halves fail on a mutated command body", () => {
  // Mutation-tested against the REAL body, not a synthetic fixture: a rule that never fails is
  // indistinguishable from one that passes for the right reason.
  const scanners = lensScannerMap();
  const names = new Set(Object.keys(scanners));
  const nullLenses = Object.keys(scanners).filter((k) => scanners[k] === null);
  const mapped = Object.keys(scanners).filter((k) => scanners[k] !== null);
  const body = readFileSync(join(COMMANDS_DIR, REVIEW_CMD), "utf8");

  // (a) DROP a scanner-less lens from the carve-out -> the presence rule must catch it.
  const dropped = body.replace(new RegExp("\\*\\*`" + nullLenses[0] + "`\\*\\*"), "**`totally-made-up-lens`**");
  assert.notEqual(
    dropped,
    body,
    `mutation (a) changed nothing — the carve-out does not name ${nullLenses[0]} in the expected bold-code form`
  );
  const regionA = carveOutRegion(dropped);
  assert.ok(
    !backtickedLensNames(regionA, names).has(nullLenses[0]),
    "mutation (a) did not remove the name from the region — the presence rule would not have been exercised"
  );

  // (b) SPLICE a scanner-bound lens into the carve-out -> the closure rule must catch it.
  const spliced = body.replace(CARVE_OUT_ANCHOR, CARVE_OUT_ANCHOR + " Also `" + mapped[0] + "`.");
  assert.notEqual(spliced, body, "mutation (b) changed nothing — the anchor was not found");
  const regionB = carveOutRegion(spliced);
  assert.ok(
    backtickedLensNames(regionB, names).has(mapped[0]),
    `mutation (b) should make the closure rule fail on ${mapped[0]}, but the name did not land inside the region`
  );

  // (c) REMOVE the anchor entirely -> both rules must fail closed, not silently find an empty region.
  assert.equal(
    carveOutRegion(body.replace(CARVE_OUT_ANCHOR, "")),
    null,
    "removing the anchor must make the region unlocatable, so the rules fail rather than pass over nothing"
  );
});

// ── The release step must be REACHABLE, not merely present ───────────────────────────────────────────
//
// THE DEFECT, measured across the corpus before the fix: in ALL 17 setter-invoking commands the
// `## Final step — release the writes-scope` heading sat BELOW the command's last "end your turn"
// instruction. A reader following the document top-to-bottom is told to stop before ever reaching it, so
// `--clear` never ran on any happy path. CLAUDE.md states why that matters: "a SET scope REPLACES the
// safe-set, making a finished run's leftover scope STRICTER than no scope at all" — paths the
// fail-closed default permits start being denied in later sessions, with nothing naming the cause.
// (That leftover state is not hypothetical: it is what denied /pharn-review's own lens writes, exit 2.)
//
// WHY THE EXISTING TEST DID NOT CATCH IT, which is the instructive half. A test already pinned that each
// setter-invoking command DECLARES the release and orders it AFTER every set. Both properties held while
// the step was unreachable — presence and set-relative ordering say nothing about whether a reader gets
// there. The missing axis was ordering relative to the TERMINAL INSTRUCTION.
//
// Surfaced by an adversarial review of this repo (finding `release-step-unreachable`, HIGH, 17/17).
//
// HONEST SCOPE (P0): this proves a POINTER precedes the terminal instruction in the command's prose. It
// does NOT prove any run executed `--clear` — the release is a Bash call outside the PreToolUse gate
// (L19), so nothing on the floor forces it, and an early abort still skips it. It raises the odds a
// reader reaches the step; it does not make the release a guarantee. The next command's first-step SET
// still overwrites a leftover scope either way.
const RELEASE_POINTER = "Before ending your turn, run the release step";
const TURN_END_RE = /end (your|the) turn/i;

/**
 * Commands that SET a writes-scope — the only ones that can LEAVE one behind and therefore owe a
 * release. Membership is `--from-frontmatter` / `--from-plan`, NOT the bare string "set-writes-scope":
 * `/pharn-review` invokes the setter only as `--clear` (it deliberately sets no scope of its own, since
 * its Step 4 fans out to N parallel writers), so a substring test wrongly demanded a release step from a
 * command that has nothing to release. Surfaced by this very rule firing on it once both changes landed
 * together — the domain was wrong, not the command.
 */
function setterCommands() {
  return commandFiles().filter((f) => /--from-(frontmatter|plan)\s+\S*[./]/.test(readFileSync(join(COMMANDS_DIR, f), "utf8")));
}

test("✧ L34 — the setter-invoking corpus is non-empty (the per-file rules below cannot pass vacuously)", () => {
  assert.ok(
    setterCommands().length > 0,
    "discovered 0 setter-invoking commands — the walk broke, and every rule below would pass vacuously"
  );
});

/**
 * THE ACCEPTANCE PREDICATE, extracted so the rule and its mutation control share ONE implementation.
 * Returns null when the body is acceptable, else the reason string. Raised by an automated review: the
 * control previously re-scanned the mutant itself and only confirmed the pointer was gone, so it never
 * exercised the production rule — if the rule stopped rejecting the mutation, the control still passed.
 * Sharing the predicate is what makes the control a real check on the rule rather than on its input.
 */
function releaseUnreachableReason(body) {
  const lines = body.split(/\r?\n/);
  const pointer = lines.findIndex((l) => l.includes(RELEASE_POINTER));
  let lastTurnEnd = -1;
  lines.forEach((l, i) => {
    if (TURN_END_RE.test(l)) lastTurnEnd = i;
  });
  if (pointer === -1) return "no release pointer; a reader stopping at the turn-end never reaches `--clear`";
  if (lastTurnEnd !== -1 && pointer > lastTurnEnd) {
    return `release pointer at line ${pointer + 1} sits BELOW the last turn-end at line ${lastTurnEnd + 1}`;
  }
  return null;
}

test("✧ every setter-invoking command names the release step BEFORE its last turn-end instruction", () => {
  const offenders = [];
  for (const file of setterCommands()) {
    const reason = releaseUnreachableReason(readFileSync(join(COMMANDS_DIR, file), "utf8"));
    if (reason) offenders.push(`${file} — ${reason}`);
  }
  assert.deepEqual(offenders, [], `release step unreachable in:\n    ${offenders.join("\n    ")}`);
});

test("✧ the reachability rule DISCRIMINATES — it fails on the real pre-fix shape (L4 mutation control)", () => {
  // Mutated from a REAL command body, not a synthetic string: strip the pointer from live bytes and the
  // rule must fail. Without this, the rule above passes by construction on a corpus already fixed.
  const file = setterCommands()[0];
  const real = readFileSync(join(COMMANDS_DIR, file), "utf8");
  assert.ok(real.includes(RELEASE_POINTER), `precondition: ${file} must carry the pointer, or this control mutates nothing`);

  // The mutant: the real body with its pointer stripped — the exact pre-fix shape.
  const mutant = real
    .split("\n")
    .filter((l) => !l.includes(RELEASE_POINTER))
    .join("\n");
  assert.notEqual(mutant, real, "the mutation must actually change the body, or the control is vacuous (L34)");

  // THE LOAD-BEARING ASSERTION: run the PRODUCTION predicate against the mutant. If the rule ever stops
  // rejecting this shape, THIS fails — which a control that re-scanned the mutant itself could not do.
  assert.equal(
    releaseUnreachableReason(mutant),
    "no release pointer; a reader stopping at the turn-end never reaches `--clear`",
    `the production predicate must REJECT the pre-fix shape of ${file}`
  );
  // And it must ACCEPT the unmutated body, so the rejection above is about the mutation, not the fixture.
  assert.equal(releaseUnreachableReason(real), null, `the production predicate must ACCEPT the real ${file}`);
});
