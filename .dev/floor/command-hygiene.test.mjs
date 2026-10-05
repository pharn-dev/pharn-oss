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
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REGISTRY } from "../../pharn/floor/stage-exit-core.mjs";
import { CANDIDATE_REL } from "../../pharn/floor/feature-name.mjs";
import {
  ROUTE_POLICY,
  AGENT,
  POLICY_INLINE,
  FULL_MODE,
  LOOP_ROWS,
  FIX_LIST_FIELDS,
  BRIEF_PROMPT_PREFIX,
  STAGE_CONFIG_KEYS,
  modesOf,
  renderBrief,
  fixListFields,
} from "../../pharn/floor/stage-agent-core.mjs";
import { allParts, commandFamilyText } from "./command-family.mjs";

const COMMANDS_DIR = new URL("../../.claude/commands/", import.meta.url).pathname;

// 6.32.0 (orchestrator-context): a product command may keep text in PART files — `pharn-<cmd>-quick.md` and
// `pharn-<cmd>-close.md`, recognized by their `part_of:` frontmatter (`.dev/floor/command-family.mjs`). A rule about
// what a COMMAND carries reads the command's FAMILY text (its file plus its parts, spliced where the text sat before
// the move); a rule that reports `file:line`, or budgets bytes per file, reads each file on disk, parts included.
// `.dev/floor/command-family.test.mjs` holds the rules about WHERE a line must live.
const PART_FILES = new Set(allParts(COMMANDS_DIR).map((p) => p.file));
/** A command's text: its file plus its parts. A file with no parts reads as itself. */
const commandText = (file) => commandFamilyText(COMMANDS_DIR, file);

// A region a command may mark to quote a rejected form for the historical record without tripping this
// guard. Same mechanism as the `TYPE-ENUM:BEGIN/END` block in pharn-dev-memory-promote.md — the house
// pattern for "a doc must quote a value a checker also validates".
const SKIP_RE = /<!--\s*COMMAND-HYGIENE:SKIP-BEGIN[\s\S]*?COMMAND-HYGIENE:SKIP-END\s*-->/g;

/**
 * Forbidden invocations. Each is checked PER LINE, and a line containing `xargs` is exempt — because the
 * correct scoped form ends in the same token as the incorrect bare one:
 *     WRONG: npx markdownlint-cli2 --fix                    (no paths -> config globs -> whole repo)
 *     RIGHT: … | xargs npx markdownlint-cli2 --no-globs --fix   (paths arrive on argv from stdin)
 * A regex that cannot tell those apart would forbid the very form this repo standardized on. Note that a
 * path on argv is NOT by itself a scope for markdownlint-cli2 — it ADDS its config's globs to the paths
 * it is given — which is why the RIGHT form carries `--no-globs`; that half is pinned separately below
 * (MARKDOWNLINT_SITES), because it applies to the xargs form this rule deliberately exempts.
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

/** The commands — every `.md` file in `.claude/commands/` that is not a PART of another command. */
function commandFiles() {
  return commandAndPartFiles().filter((f) => !PART_FILES.has(f));
}

/** Every `.md` file in `.claude/commands/`, parts included — for rules that report `file:line` or budget bytes. */
function commandAndPartFiles() {
  return readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

test("✧ L19: no stage command prescribes a repo-wide formatter/linter WRITE", () => {
  const offenders = [];
  for (const file of commandAndPartFiles()) {
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
  assert.ok(!flags("npx markdownlint-cli2 --no-globs --fix .dev/features/<name>/VERIFY.md"), "a scoped path must not be flagged");
  assert.ok(!flags('  node -p "…" | xargs npx prettier --ignore-unknown --write'), "the xargs form must not be flagged");
  assert.ok(
    !flags('  [ -n "$MD" ] && printf \'%s\\n\' "$MD" | xargs npx markdownlint-cli2 --no-globs --fix'),
    "the xargs form must not be flagged"
  );
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
  const body = commandText("pharn-dev-build.md").replace(SKIP_RE, "");
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

// ── Every markdownlint-cli2 invocation lints ONLY the files it names (`--no-globs`) ──────────────────
//
// THE FAILURE (P7, 2026-09-23: reported by the human, then re-measured). markdownlint-cli2 ADDS its
// config's `globs` to the paths on argv. It does not replace them. `.markdownlint-cli2.jsonc` declares
// `"globs": ["**/*.md", ".dev/**/*.md"]`. So `npx markdownlint-cli2 --fix <one file>`, the form every L13
// format step prescribed as "scoped to this stage's own artifact", linted and FIXED every markdown file
// those globs reach: `Linting: 1340 files` from this repo, measured. From a checkout holding other
// sessions' worktrees it reached those too, because `ignores` entries match only at the root. One
// /pharn-dev-build Step 2b run rewrote 124 files inside `.claude/worktrees/<other>/`, two of them tracked
// test fixtures. That is L19 recurring INSIDE the remedy that L19 and L16 prescribed, and the ACCEPTED list
// above had asserted the flagless form was "a scoped path". With `--no-globs` the same run prints
// `Linting: 1 file`, and every `ignores` entry still applies.
//
// THE RULE covers EVERY invocation in EVERY command (L36: closure, not presence). Each invocation must
// carry `--no-globs` after the tool name and before any shell comment. MARKDOWNLINT_SITES is the
// enumeration (L29/L31), and the set of commands with a detected invocation must EQUAL it (L34). That
// way the rule cannot pass over an empty domain, and the product half of the dev/product pair cannot be
// the one that drops out.
//
// Honest scope (P0), the same narrow kind as FORBIDDEN above: this pins a VOCABULARY. An invocation is
// recognized when the tool name (optionally `@<version>`) is followed by an argument-shaped token, or
// when it sits path-less at the end of an `xargs` line. It is NOT recognized through a shell variable
// (`$MDL --fix a.md`), through `node node_modules/…`, with the name split across lines, or under the
// older `markdownlint` binary. `npm exec -- markdownlint-cli2 …` IS recognized. The enumeration catches
// a site that STOPS being detected, never a new site written in an undetected spelling. It never proves
// a run executed the line. And `--no-globs` narrows the tool's REACH; it gates nothing. A Bash-run tool
// still passes neither write guard, so L19 stays true.
const MARKDOWNLINT_SITES = [
  "pharn-dev-build.md",
  "pharn-dev-grill.md",
  "pharn-dev-memory-promote.md",
  "pharn-dev-plan.md",
  "pharn-dev-regress.md",
  "pharn-dev-review.md",
  "pharn-dev-ship.md",
  "pharn-dev-verify.md",
  "pharn-memory-promote.md", // PRODUCT: read-only check over a USER's canon, through vendor/bin
  "pharn-ship-close.md", // PRODUCT: the BRIEFING.md format step (in /pharn-ship's close part since 6.32.0)
];

// The tool name followed by an argument-shaped token: a flag, a `<placeholder>`, a quoted, `$`- or
// backtick-expanded argument, a glob, a `\` continuation, or a path (a token holding `/` or ending
// `.md`). Prose is left alone: `.markdownlint-cli2.jsonc`, a back-ticked `markdownlint-cli2`, the
// `[ -x vendor/bin/markdownlint-cli2 ]` existence test, a version banner.
const MDL_WITH_ARGS = /\bmarkdownlint-cli2(?:@[\w.-]+)?[ \t]+(?:[-<$"'`*\\]|[\w./*-]*(?:\/|\.md\b))/g;
// The stdin route: paths arrive through `xargs`, so a path-less spelling at the line's end still names files.
const MDL_XARGS_BARE = /\bxargs\b.*\bmarkdownlint-cli2(?:@[\w.-]+)?[ \t]*$/;
const NO_GLOBS = /\s--no-globs(?![\w-])/;

// One segment per invocation on the line: from its tool name to the next invocation or the line's end,
// cut at a shell comment. That way the flag must belong to THIS invocation, and a trailing
// `# … --no-globs` cannot satisfy it. A whole-line shell COMMENT is rationale, not a prescription (the
// Step 2b precedent above).
function markdownlintSegments(line) {
  if (line.trimStart().startsWith("#")) return [];
  const starts = [...line.matchAll(MDL_WITH_ARGS)].map((m) => m.index);
  if (starts.length === 0 && MDL_XARGS_BARE.test(line)) starts.push(line.lastIndexOf("markdownlint-cli2"));
  return starts.map((s, i) => line.slice(s, starts[i + 1] ?? line.length).split(/\s#/)[0]);
}

const lacksNoGlobs = (line) => markdownlintSegments(line).some((segment) => !NO_GLOBS.test(segment));

// SKIP regions are blanked LINE-PRESERVINGLY, so a reported `file:line` stays true.
function linePreservingBody(file) {
  return readFileSync(join(COMMANDS_DIR, file), "utf8").replace(SKIP_RE, (m) => m.replace(/[^\n]/g, ""));
}

function markdownlintInvocations(body) {
  return body.split(/\r?\n/).flatMap((text, i) => (markdownlintSegments(text).length > 0 ? [{ line: i + 1, text }] : []));
}

function unflaggedInvocations(corpus) {
  const out = [];
  for (const [file, body] of corpus) {
    for (const { line, text } of markdownlintInvocations(body)) if (lacksNoGlobs(text)) out.push({ file, line, text });
  }
  return out;
}

const commandCorpus = () => new Map(commandAndPartFiles().map((f) => [f, linePreservingBody(f)]));

test("✧ every markdownlint-cli2 invocation in a command carries --no-globs (closure over the corpus)", () => {
  const offenders = unflaggedInvocations(commandCorpus()).map(({ file, line, text }) => `${file}:${line}\n      ${text.trim()}`);
  assert.deepEqual(
    offenders,
    [],
    `markdownlint-cli2 run WITHOUT --no-globs also lints and fixes every file its config globs reach:\n    ${offenders.join("\n    ")}`
  );
});

test("✧ the commands that invoke markdownlint-cli2 are EXACTLY MARKDOWNLINT_SITES (non-vacuous, both surfaces)", () => {
  const detected = [...commandCorpus()].filter(([, body]) => markdownlintInvocations(body).length > 0).map(([file]) => file);
  assert.deepEqual(
    detected,
    [...MARKDOWNLINT_SITES].sort(),
    "a command gained or lost a markdownlint-cli2 invocation: update MARKDOWNLINT_SITES"
  );
  assert.ok(
    MARKDOWNLINT_SITES.some((f) => f.startsWith("pharn-dev-")) && MARKDOWNLINT_SITES.some((f) => !f.startsWith("pharn-dev-")),
    "the enumeration must span BOTH surfaces (L31): the dev commands and the shipped product commands"
  );
});

test("✧ the --no-globs rule DISCRIMINATES: it flags the incident's forms and passes the flagged ones", () => {
  // L4: an authored assertion passes by construction. Pin the matcher's behavior on literal lines.
  const REJECTED = [
    "npx markdownlint-cli2 --fix .dev/features/<name>/PLAN.md", // the exact shape the L13 steps prescribed
    `  [ -n "$MD" ] && printf '%s\\n' "$MD" | xargs npx markdownlint-cli2 --fix`, // the line that ran
    "[ -x vendor/bin/markdownlint-cli2 ] && NODE_ENV=production vendor/bin/markdownlint-cli2 <canon-file>",
    "npx markdownlint-cli2 README.md", // read-only is still reach: it REPORTS on every globbed file
    "printf '%s\\n' \"$MD\" | xargs npx markdownlint-cli2", // path-less on the xargs route
    "npx markdownlint-cli2@0.23.2 --fix a.md",
    'npx markdownlint-cli2 "*.md"',
    "npx markdownlint-cli2 \\",
    "npm exec -- markdownlint-cli2 --fix a.md",
    "Run `npx markdownlint-cli2 --fix <file>` over the artifact.", // a back-ticked prose prescription
    "npx markdownlint-cli2 --fix a.md # not --no-globs", // the flag must not come from a comment
    "npx markdownlint-cli2 --no-globs a.md && npx markdownlint-cli2 --fix b.md", // each invocation, not the line
  ];
  for (const line of REJECTED) assert.ok(lacksNoGlobs(line), `must be flagged: ${line}`);

  const ACCEPTED = [
    "npx markdownlint-cli2 --no-globs --fix .dev/features/<name>/PLAN.md",
    `  [ -n "$MD" ] && printf '%s\\n' "$MD" | xargs npx markdownlint-cli2 --no-globs --fix`,
    "[ -x vendor/bin/markdownlint-cli2 ] && NODE_ENV=production vendor/bin/markdownlint-cli2 --no-globs <canon-file>",
    "npx markdownlint-cli2 --fix --no-globs a.md",
  ];
  for (const line of ACCEPTED)
    assert.ok(markdownlintSegments(line).length > 0 && !lacksNoGlobs(line), `must be detected AND pass: ${line}`);

  const NOT_INVOCATIONS = [
    "  `.prettierignore`, `.markdownlint-cli2.jsonc`). Rationale: over the **outside** files",
    "scoped `prettier` + `markdownlint-cli2` pass over `BRIEFING.md` all run through **Bash**, which",
    "`vendor/bin/prettier` or `vendor/bin/markdownlint-cli2` is absent, skip that advisory check",
    "npm run lint:md > /dev/null 2>&1; lm=$?",
    "markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)",
    "  # list, GNU xargs runs the command ONCE WITH NO ARGUMENTS — and a bare `markdownlint-cli2 --fix`",
    "npx markdownlint-cli2", // a bare whole-repo READ is `lint:md`'s shape; --no-globs would make it lint nothing
  ];
  for (const line of NOT_INVOCATIONS) assert.deepEqual(markdownlintSegments(line), [], `not an invocation: ${line}`);
  assert.ok(lacksNoGlobs("npx markdownlint-cli2 --no-globsx --fix a.md"), "`--no-globs` must be a whole flag");
});

for (const site of MARKDOWNLINT_SITES) {
  test(`✧ removing --no-globs from ${site} makes the closure name exactly that file (mutation control)`, () => {
    // L4 over the REAL corpus: the rule must stop being green the moment one site loses the flag.
    const corpus = commandCorpus();
    corpus.set(site, corpus.get(site).replace(/[ \t]--no-globs(?![\w-])/g, ""));
    const files = [...new Set(unflaggedInvocations(corpus).map((o) => o.file))];
    assert.deepEqual(files, [site], `stripping --no-globs from ${site} must flag ${site} alone`);
  });
}

// ── The PREMISE the rule rests on, EXECUTED rather than read off `--help` (L37/L45) ──────────────────
//
// The rule above is only worth pinning if `--no-globs` really does scope a run under THIS repo's
// config and the INSTALLED binary. A tool upgrade or a config change could make that false while every
// assertion above stayed green. So run it, read-only (never `--fix`). The positive half runs at the REAL
// path (L26). The negative control and the worktree-ignore probe run in a scratch tree that holds this
// config's BYTES, with `cwd` pinned on EVERY spawn: an unflagged run over the real repo costs ~5 s
// (measured), and from a main checkout it would also read every other session's worktree, which is
// the reach this section exists to remove. Measured cost of the whole test: ~1.5 s for six spawns.
//
// Honest scope: this pins the INSTALLED version's behavior over THIS config. It is SKIPPED where the dev
// toolchain is absent (the stdlib-only `floor` workflow), and a skip exits 0, which is why
// `check-verify.mjs` cannot tell a skipped premise from a proven one (L37).
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MDL_BIN = join(REPO_ROOT, "node_modules", ".bin", "markdownlint-cli2");

function lintedCount(args, cwd) {
  const r = spawnSync(MDL_BIN, args, { cwd, encoding: "utf8" });
  assert.ifError(r.error);
  const m = /^Linting: (\d+) files?$/m.exec(r.stdout);
  assert.ok(m, `no "Linting:" line from markdownlint-cli2 ${args.join(" ")} (cwd ${cwd}):\n${r.stdout}${r.stderr}`);
  return Number(m[1]);
}

test(
  "premise: --no-globs lints EXACTLY the named files under this repo's config, and .claude/worktrees is ignored",
  { skip: !existsSync(MDL_BIN) && "dev toolchain not installed (missing markdownlint-cli2) — run `npm ci`" },
  () => {
    assert.equal(lintedCount(["--no-globs", "CLAUDE.md"], REPO_ROOT), 1, "one named file must be one linted file");
    assert.equal(
      lintedCount(["--no-globs", "LIMITS.md"], REPO_ROOT),
      0,
      "an `ignores` entry must still beat an explicit path, or --no-globs would put the trusted docs within a fixer's reach"
    );

    const root = mkdtempSync(join(tmpdir(), "pharn-mdl-premise-"));
    try {
      const config = readFileSync(join(REPO_ROOT, ".markdownlint-cli2.jsonc"), "utf8");
      const cfg = join(root, ".markdownlint-cli2.jsonc");
      writeFileSync(cfg, config);
      for (const rel of ["a.md", "b.md", ".claude/worktrees/other/c.md", ".claude/worktrees/other/node_modules/pkg/README.md"]) {
        mkdirSync(dirname(join(root, rel)), { recursive: true });
        writeFileSync(join(root, rel), "# T\n\nx\n");
      }
      assert.equal(
        lintedCount(["a.md"], root),
        2,
        "control: WITHOUT --no-globs one named file is not one file, because the globs are ADDED"
      );
      assert.equal(lintedCount(["--no-globs", "a.md"], root), 1, "WITH --no-globs: exactly the named file");
      assert.equal(lintedCount([], root), 2, "a bare run (the `lint:md` shape) must not reach .claude/worktrees/**");

      // The ignore's own negative control: the same tree without that one entry DOES reach the nested
      // worktree, its node_modules included, since every `ignores` entry matches only at the root.
      const without = config.replace(/^[ \t]*"\.claude\/worktrees",[ \t]*\n/m, "");
      assert.notEqual(without, config, "`.claude/worktrees` must sit in .markdownlint-cli2.jsonc's ignores on a line of its own");
      writeFileSync(cfg, without);
      assert.equal(lintedCount([], root), 4, "control: without the entry a bare run lints the nested worktree's files too");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
);

// `.agents` is the second untracked directory in `ignores`: Codex's "import from Claude Code" output, excluded by
// `.gitignore` (`/.agents/`), so CI never has it. The probe above covers `.claude/worktrees` only, so it says
// nothing about this entry (L52: a test for the member it is about). The failure it pins (2026-09-25): with the
// import present, a bare `lint:md` reported MD025 on every `.agents/skills/*/SKILL.md`, because each nests a
// command's H1 under the importer's own. The scratch SKILL.md reproduces that shape. The directory sits at the
// scratch root, where the importer writes it and where an `ignores` entry matches (L57).
test(
  "premise: a bare lint:md run does not reach .agents (Codex's gitignored import)",
  { skip: !existsSync(MDL_BIN) && "dev toolchain not installed (missing markdownlint-cli2) — run `npm ci`" },
  () => {
    const root = mkdtempSync(join(tmpdir(), "pharn-mdl-agents-"));
    try {
      const config = readFileSync(join(REPO_ROOT, ".markdownlint-cli2.jsonc"), "utf8");
      const cfg = join(root, ".markdownlint-cli2.jsonc");
      writeFileSync(cfg, config);
      writeFileSync(join(root, "a.md"), "# T\n\nx\n");
      mkdirSync(join(root, ".agents", "skills", "s"), { recursive: true });
      writeFileSync(join(root, ".agents", "skills", "s", "SKILL.md"), "# Importer\n\n## Command Template\n\n# Command\n");
      assert.equal(lintedCount([], root), 1, "a bare run (the `lint:md` shape) must not reach .agents/**");

      const without = config.replace(/^[ \t]*"\.agents",[ \t]*\n/m, "");
      assert.notEqual(without, config, "`.agents` must sit in .markdownlint-cli2.jsonc's ignores on a line of its own");
      writeFileSync(cfg, without);
      assert.equal(lintedCount([], root), 2, "control: without the entry a bare run lints .agents/** too");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
);

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
  return commandText(file).replace(SKIP_RE, "");
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

  // POSITION (the re-anchored "before the final commit" requirement). /pharn-dev-ship makes no commit,
  // merge or push — its only git calls are Step 2c's fetch (which updates origin/main, never a branch) and
  // the CHANGELOG checker's read-only rev-parse/merge-base/show — so the original anchor does not exist for
  // it; the real one is "before the roll-up write". (/pharn-loop does commit, at its Step 6c — it is not a
  // member of this wired set.)
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
// DEFAULT_SAFE_SET (which permits any path under `pharn/features/**`) while the command's own guarantee audit
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
 * correct declaration into a block). A glob entry with no `<` (pharn-review.md's `pharn/features/**`,
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
    // 6.26.0: pharn-verify.md left the domain (its one `writes:` entry is concrete), as pharn-regress.md did in
    // 6.23.0 — the domain is now exactly this floor, so the next sibling that removes a placeholder re-measures it.
    `expected >=5 multi-artifact commands (ship, loop, plan and the two dev regress/verify commands), got ${domain.length}: ${domain.map((c) => c.file).join(", ")}`
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
  const mutant = body.replace(/^writes:.*$/m, (l) => l.replace(/\]\s*$/, `, "pharn/features/<name>/NEVER-SCOPED.md"]`));
  assert.notEqual(mutant, body, "the mutation must actually change the body, or this test is vacuous (L34)");
  const entries = writesEntries(mutant).filter(isScopeablePlaceholder);
  assert.ok(entries.includes("pharn/features/<name>/NEVER-SCOPED.md"), "the guard must SEE the spliced entry — else it proves nothing");
  assert.ok(
    !targetValues(mutant).has("pharn/features/<name>/NEVER-SCOPED.md"),
    "the guard must catch a declared path that is never passed as a --target — otherwise it certifies by not looking"
  );
});

test("✧ the placeholder predicate DISCRIMINATES — it admits real scopeable paths and rejects the known non-paths", () => {
  // L36/L29: the predicate is the part that decides Rule B's DOMAIN, so pinning it directly is what
  // stops a future loosening from silently emptying the rule. Every rejected string below is a REAL
  // `writes:` entry live in this corpus, not an invented one.
  assert.ok(isScopeablePlaceholder("pharn/features/<name>/SHIP.md"), "a real placeholder path must qualify");
  assert.ok(isScopeablePlaceholder(".dev/features/<name>/regression-report.json"), "a dev placeholder path must qualify");
  assert.ok(
    !isScopeablePlaceholder("<user-code files named in the plan's ## Files (Phase-1, via --from-plan — not from this list)>"),
    "pharn-build.md's PROSE entry must not qualify — it is scoped via --from-plan, not --target"
  );
  assert.ok(!isScopeablePlaceholder("<files named in PLAN.md only>"), "pharn-dev-build.md's prose entry must not qualify");
  assert.ok(!isScopeablePlaceholder("pharn/features/**"), "a bare glob with no placeholder must not qualify (pharn-review.md)");
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

  const region = carveOutRegion(commandText(REVIEW_CMD));
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

  const region = carveOutRegion(commandText(REVIEW_CMD));
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
  const body = commandText(REVIEW_CMD);

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
  return commandFiles().filter((f) => /--from-(frontmatter|plan)\s+\S*[./]/.test(commandText(f)));
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
    const reason = releaseUnreachableReason(commandText(file));
    if (reason) offenders.push(`${file} — ${reason}`);
  }
  assert.deepEqual(offenders, [], `release step unreachable in:\n    ${offenders.join("\n    ")}`);
});

test("✧ the reachability rule DISCRIMINATES — it fails on the real pre-fix shape (L4 mutation control)", () => {
  // Mutated from a REAL command body, not a synthetic string: strip the pointer from live bytes and the
  // rule must fail. Without this, the rule above passes by construction on a corpus already fixed.
  const file = setterCommands()[0];
  const real = commandText(file);
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

// ── A Capability's `writes:` binds to NOTHING, and the lens set must at least be HONEST about it ──────
//
// THE DEFECT (adversarial review: `capability-writes-never-bound-to-guard`, HIGH). ARCHITECTURE §3.1
// annotates `writes:` as "ENFORCED by the pre-write hook", and finding-shape.md claimed the guard "pins
// the path" once a Capability names findings.json. Both are false. enforce-writes-scope.cjs reads ONE
// input — .pharn/writes-scope.json — which set-writes-scope.cjs writes from `--from-frontmatter <file>`,
// and EVERY call site in the corpus names a COMMAND file. Not one names a Capability. So a Capability's
// `writes:` is parsed by nothing.
//
// It was also WRONG on its face: the 22 lenses declared `features/<lens>/findings.json` and
// `features/<lens>/REVIEW.md`, while /pharn-review directs each subagent to
// `pharn/features/<name>/lenses/<lens>/findings.json` and writes REVIEW.md ITSELF at Step 6. Two errors in a
// field nothing reads, which is exactly how it stayed wrong.
//
// HONEST SCOPE (P0): these rules make the declaration TRUTHFUL and keep it truthful. They do NOT make it
// ENFORCED — nothing here binds a lens's `writes:` to the guard, and this test does not pretend to. The
// enforcement that exists belongs to the invoking COMMAND's scope (or the fail-closed default), is
// coarser than a per-Capability pin, and is unchanged by this file.
const LENS_ROOT = join(COMMANDS_DIR, "..", "..", "pharn", "pharn-review");
const LENS_WRITES_RE = /^writes:\s*\["pharn\/features\/<name>\/lenses\/([^/"]+)\/findings\.json"\]\s*$/m;

function lensCapabilityFiles() {
  const out = [];
  for (const e of readdirSync(LENS_ROOT, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    for (const f of readdirSync(join(LENS_ROOT, e.name))) {
      if (!f.endsWith(".md")) continue;
      const text = readFileSync(join(LENS_ROOT, e.name, f), "utf8");
      if (/^role:\s*lens\s*$/m.test(text)) out.push({ dir: e.name, file: join(LENS_ROOT, e.name, f), text });
    }
  }
  return out;
}

test("✧ L34 — lens capabilities are discovered (the writes: rule below cannot pass vacuously)", () => {
  assert.ok(lensCapabilityFiles().length > 0, `discovered 0 role: lens capabilities under ${LENS_ROOT} — the walk broke`);
});

test("✧ every lens's `writes:` names the path /pharn-review ACTUALLY directs it to", () => {
  const offenders = [];
  for (const { dir, file, text } of lensCapabilityFiles()) {
    const m = LENS_WRITES_RE.exec(text);
    if (!m) offenders.push(`${dir} — writes: is not \`["pharn/features/<name>/lenses/${dir}/findings.json"]\``);
    else if (m[1] !== dir) offenders.push(`${dir} — writes: names lens directory "${m[1]}", not its own "${dir}"`);
    void file;
  }
  assert.deepEqual(offenders, [], `lens writes: disagrees with /pharn-review's Step 4 path:\n    ${offenders.join("\n    ")}`);
});

test("✧ NO --from-frontmatter call site names a Capability — the reason lens writes: binds to nothing", () => {
  // The load-bearing fact behind the corrected finding-shape.md bullet. Measured from the corpus, so if
  // a future increment DOES point the setter at a capability, this fails and the corrected prose — which
  // says a Capability's writes: is parsed by nothing — must be revisited.
  const targets = [];
  for (const file of commandFiles()) {
    const text = commandText(file);
    // Only REAL invocations: the argument must look like a path. Guarantee-audit prose writes
    // `--from-frontmatter … --target`, and an ellipsis is a citation of the flag, not a call site.
    for (const m of text.matchAll(/--from-frontmatter\s+(\S+)/g)) {
      if (/[./]/.test(m[1])) targets.push(m[1]);
    }
  }
  assert.ok(targets.length > 0, "discovered 0 --from-frontmatter call sites — the walk broke (L34)");
  const nonCommand = [...new Set(targets)].filter((t) => !t.includes(".claude/commands/"));
  assert.deepEqual(
    nonCommand,
    [],
    "A --from-frontmatter call site now names something outside .claude/commands/. If it names a " +
      "Capability, then a Capability's writes: IS parsed, and finding-shape.md's corrected bullet " +
      `("parsed by nothing") must be re-derived. Offending targets: ${JSON.stringify(nonCommand)}`
  );
});

// ── The SHIPPED surface must not cite `.dev/` CANON, which a user's install does not have ────────────
//
// THE DEFECT (adversarial review: `product-cmds-cite-dev-canon`, LOW, and its verifier EXTENDED the
// class): 9 of 10 product commands cited `.dev/memory-bank/lessons-learned.md L<n>` in prose, and so did
// the shipped floor (validate.mjs, check-spec.mjs) and pharn-contracts/loop-record.md. An install ships
// `pharn/` plus the product `.claude/` surface WITHOUT `.dev/`, so every one of those pointers resolves
// to nothing in the place it is read.
//
// THE FIX WAS NOT TO DELETE THE PROVENANCE. P4 says cite rather than restate, and the lessons are real;
// what was wrong was the PATH, which promised a file the reader cannot open. Each site now reads
// "PHARN's own build-loop lesson L<n>" — provenance kept, dangling pointer gone — and in every case the
// surrounding sentence already carried the lesson's substance, so nothing was lost by dropping the path.
//
// SCOPED to `.dev/memory-bank/` CANON on purpose. A shipped file may still name `.dev/` when the subject
// IS the dev surface: /pharn-memory-promote explains that `/pharn-dev-memory-promote` -> `.dev/memory-bank/`
// is a separate command, which is correct and must not be flagged. The rule targets the lessons-canon
// citation shape, not the string `.dev/`.
//
// HONEST SCOPE (P0): this proves no shipped file cites the dev canon FILE. It does not prove the
// remaining prose is accurate, and it cannot check the installer (its source is out of tree) — the
// install-absence half rests on CLAUDE.md's documented dev/product boundary, exactly as the review's
// verifier scoped it.
const DEV_CANON_RE = /\.dev\/memory-bank\/lessons-learned\.md/;

function shippedSurfaceFiles() {
  const out = [];
  for (const f of commandFiles()) {
    if (f.startsWith("pharn-dev-")) continue; // apparatus commands legitimately cite dev canon
    out.push(["'.claude/commands/" + f + "'", join(COMMANDS_DIR, f)]);
  }
  const PHARN = join(COMMANDS_DIR, "..", "..", "pharn");
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if ((e.name.endsWith(".mjs") || e.name.endsWith(".md")) && !e.name.includes(".test.")) out.push([p, p]);
    }
  };
  walk(PHARN);
  return out;
}

test("✧ L34 — the shipped surface is non-empty (the dev-canon rule below cannot pass vacuously)", () => {
  assert.ok(shippedSurfaceFiles().length > 0, "discovered 0 shipped-surface files — the walk broke");
});

test("✧ no SHIPPED file cites `.dev/memory-bank/lessons-learned.md` — an install has no `.dev/`", () => {
  const offenders = [];
  for (const [label, path] of shippedSurfaceFiles()) {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (DEV_CANON_RE.test(line)) offenders.push(`${label}:${i + 1} — ${line.trim().slice(0, 110)}`);
      });
  }
  assert.deepEqual(
    offenders,
    [],
    "Shipped bytes cite the DEV lessons canon, which a user's install does not contain. Keep the " +
      'provenance and drop the path — write "PHARN\'s own build-loop lesson L<n>" instead:\n    ' +
      offenders.join("\n    ")
  );
});

test("✧ the dev-canon rule DISCRIMINATES — it fires on the real pre-fix citation shape (L4)", () => {
  // Mutated from the REAL historical string rather than a synthetic one, so a future loosening of the
  // matcher fails here instead of silently re-admitting the defect.
  const pre = "sits outside the `PreToolUse` gate entirely (`.dev/memory-bank/lessons-learned.md` L19) — nothing on";
  const post = "sits outside the `PreToolUse` gate entirely (PHARN's own build-loop lesson **L19**) — nothing on";
  assert.ok(DEV_CANON_RE.test(pre), "the matcher must fire on the pre-fix citation, or the rule above is vacuous");
  assert.ok(!DEV_CANON_RE.test(post), "the matcher must NOT fire on the corrected form, or the fix is unachievable");
});

// ── /pharn-loop runs UNATTENDED — its closed sets and its commit block (loop-autonomous, 6.0.0) ────────
//
// WHY THESE EXIST. `/pharn-loop` no longer stops for a person: every question a sub-stage could ask maps to
// ONE row of its stuck-point table, a green result is committed through pinned git lines, and the run ends
// with a summary. With no human reading the run, the only places a drift can be caught are the command's
// own spellings. L29: the table and the commit-outcome set are the deliverables, so the pins iterate
// materialized arrays, not one member. L36: presence is not closure, so every back-ticked `blocked:` and
// `not committed:` spelling in the file must be a member — a variant fails, not only an absence. L38 is
// the reason for the ordering pin: the commit must re-derive the plan's scope with `--from-plan` before it
// stages, because by then `.pharn/writes-scope.json` holds the record's scope, not the plan's — the defect
// the loop-autonomous grill caught at blocking severity. Its review then found two more defects of the
// same kind, both pinned below: the branch-delete line read `$b`, a variable set in an EARLIER fenced block —
// each block runs as its own shell, so it was empty — and the staging lines let git glob a listed
// `app/[id]/page.tsx` into `app/i/page.tsx` (reproduced), fixed by `GIT_LITERAL_PATHSPECS=1`.
//
// HONEST SCOPE (P0), the same narrow kind as every set above: these read command PROSE. They prove the
// rows, the spellings, the pinned lines and their order are PRESENT, that no fenced line spells a known
// push / merge / `--no-verify` form, and that no fenced block reads a shell variable it did not assign. They
// CANNOT prove a run asked nobody, mapped a question to the right row, staged only the listed files, or did
// not type a forbidden command in a novel spelling or outside a fence.
// "The wiring is pinned" NEVER means "the run behaved".
const LOOP_FILE = "pharn-loop.md";

const STUCK_POINTS = [
  { id: "S1", blocked: "no-slug" },
  { id: "S2", blocked: null }, // a fixed rule that never stops the run
  { id: "S3", blocked: "no-git-base" },
  { id: "S4", blocked: "no-gates" },
  { id: "S5", blocked: "seam-config" },
  { id: "S6", blocked: "thin-intent" },
  { id: "S6b", blocked: "needs-clarification" }, // /pharn-spec left a clarification marker in the Draft (spec-template)
  { id: "S6c", blocked: "not-quick" }, // 6.28.0: a --quick run's intent does not fit a quick SPEC, or its kind read is not quick
  { id: "S7", blocked: "plan-ambiguity" },
  { id: "S8", blocked: "seam-unresolved" },
  { id: "S9", blocked: "stage-refused" },
  { id: "S10", blocked: "unlisted-ask" },
  { id: "S11", blocked: "stale-evidence" },
  { id: "S12", blocked: "no-test-runner" }, // 6.19.0: /pharn-test's preflight found a level with no runner
  { id: "S13", blocked: "ac-evidence-invalid" }, // 6.20.0: the AC evidence changed or is missing — a rebuild cannot fix it
];
// The one non-member spelling the closure admits: the command's own placeholder in generic prose.
const BLOCKED_PLACEHOLDER = "<id>";

const COMMIT_OUTCOMES = [
  "committed <branch>",
  "not committed: <decision>",
  "not committed: decision unverifiable",
  "not committed: evidence stale",
  "not committed: nothing staged",
  "not committed: branch failed",
  "not committed: stage failed",
  "not committed: commit failed",
];

const ASK_TOKEN_RE = /\bAsk(?:User)?Question\b/;
const LOOP_COMMIT_HEADING = "### Step 6c";
const LOOP_FROM_PLAN_LINE = /^[ \t]*node \.claude\/hooks\/set-writes-scope\.cjs --from-plan pharn\/features\/<name>\/PLAN\.md\s*$/;
// Both staging lines must disable pathspec globbing — a listed path is a path, never a pattern.
const LOOP_ADD_LINE = /^[ \t]*GIT_LITERAL_PATHSPECS=1 git add -A --pathspec-from-file=\S+ --pathspec-file-nul\s*$/;
const LOOP_COMMIT_LINE = /^[ \t]*GIT_LITERAL_PATHSPECS=1 git commit --pathspec-from-file=\S+ --pathspec-file-nul\b/;
// Anywhere on a fenced line, not only at its start: a compound line (`b=…; git push`), a global option
// (`git -C . push`) and an argv array (`execFileSync("git", ["push"])`) are all the same invocation. A word
// boundary keeps `pushed` / `merged` in the commit message's prose from matching.
const FORBIDDEN_GIT_LINE = /\bgit\b[^\n]*\s(?:push|merge)\b|--no-verify|["'](?:push|merge)["']/;
const SHELL_ASSIGN_RE = /(?:^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)=/g;
const SHELL_READ_RE = /\$\{?([A-Za-z_][A-Za-z0-9_]*)/g;

/** Fenced blocks as {start, lines: [{line, text}]}. A fence may be indented inside a list item. */
function fencedBlocks(body) {
  const blocks = [];
  let current = null;
  body.split(/\r?\n/).forEach((text, i) => {
    if (/^[ \t]*```/.test(text)) {
      if (current) {
        blocks.push(current);
        current = null;
      } else current = { start: i + 1, lines: [] };
      return;
    }
    if (current) current.lines.push({ line: i + 1, text });
  });
  return blocks;
}

function fencedLines(body) {
  return fencedBlocks(body).flatMap((b) => b.lines);
}

/** Every `$var` a fenced block reads without assigning it in the SAME block — shell state does not survive between blocks. */
function crossBlockVariableOffenders(body) {
  const out = [];
  for (const block of fencedBlocks(body)) {
    const text = block.lines.map((l) => l.text).join("\n");
    const assigned = new Set([...text.matchAll(SHELL_ASSIGN_RE)].map((m) => m[1]));
    for (const l of block.lines) {
      for (const m of l.text.matchAll(SHELL_READ_RE)) {
        if (!assigned.has(m[1])) out.push(`${l.line}: $${m[1]}`);
      }
    }
  }
  return out;
}

function blockedClosureOffenders(body) {
  const allowed = new Set([...STUCK_POINTS.map((s) => s.blocked).filter(Boolean), BLOCKED_PLACEHOLDER]);
  return [...body.matchAll(/`blocked: ([^`]+)`/g)].map((m) => m[1]).filter((v) => !allowed.has(v));
}

function outcomeClosureOffenders(body) {
  const allowed = new Set(COMMIT_OUTCOMES);
  const spelled = [...body.matchAll(/`((?:not )?committed[: ][^`]*)`/g)].map((m) => m[1]);
  return spelled.filter((v) => !allowed.has(v));
}

/** null when the commit block re-derives scope, stages and commits, in that order, under Step 6c; else why. */
function commitBlockReason(body) {
  const lines = body.split(/\r?\n/);
  const heading = lines.findIndex((l) => l.startsWith(LOOP_COMMIT_HEADING));
  const fromPlan = lines.findIndex((l) => LOOP_FROM_PLAN_LINE.test(l));
  const add = lines.findIndex((l) => LOOP_ADD_LINE.test(l));
  const commit = lines.findIndex((l) => LOOP_COMMIT_LINE.test(l));
  if (heading === -1) return `no \`${LOOP_COMMIT_HEADING}\` heading`;
  if (fromPlan === -1) return "no `--from-plan` re-derivation line";
  if (add === -1) return "no `git add -A --pathspec-from-file` line";
  if (commit === -1) return "no `git commit --pathspec-from-file` line";
  if (!(heading < fromPlan && fromPlan < add && add < commit)) {
    return `out of order: heading ${heading + 1}, --from-plan ${fromPlan + 1}, add ${add + 1}, commit ${commit + 1}`;
  }
  return null;
}

function forbiddenGitOffenders(body) {
  return fencedLines(body)
    .filter((l) => FORBIDDEN_GIT_LINE.test(l.text))
    .map((l) => `${l.line}: ${l.text.trim()}`);
}

test("✧ L34 — the /pharn-loop sets are non-empty and well-formed (the rules below cannot pass vacuously)", () => {
  assert.equal(STUCK_POINTS.length, 15, "the stuck-point table is S1–S13 plus S6b and S6c");
  assert.equal(new Set(STUCK_POINTS.map((s) => s.id)).size, STUCK_POINTS.length, "duplicate stuck-point id");
  assert.ok(COMMIT_OUTCOMES.length > 0, "the commit-outcome set is empty");
  assert.ok(fencedLines(commandBody(LOOP_FILE)).length > 0, `found no fenced lines in ${LOOP_FILE} — the fence scan broke`);
});

test("✧ /pharn-loop names no interactive-ask tool — the run asks nobody", () => {
  assert.doesNotMatch(
    commandBody(LOOP_FILE),
    ASK_TOKEN_RE,
    `${LOOP_FILE} names an interactive-ask tool; an unattended run must map the question to its stuck-point table`
  );
});

for (const s of STUCK_POINTS) {
  test(`✧ /pharn-loop's stuck-point table carries ${s.id}${s.blocked ? ` and its \`blocked: ${s.blocked}\` spelling` : ""}`, () => {
    const body = commandBody(LOOP_FILE);
    assert.match(body, new RegExp(`^\\|\\s*${s.id}\\s*\\|`, "m"), `${LOOP_FILE} has no table row for ${s.id}`);
    if (s.blocked) assert.ok(body.includes(`\`blocked: ${s.blocked}\``), `${LOOP_FILE} never spells \`blocked: ${s.blocked}\``);
  });
}

for (const o of COMMIT_OUTCOMES) {
  test(`✧ /pharn-loop spells the commit outcome \`${o}\``, () => {
    assert.ok(commandBody(LOOP_FILE).includes(`\`${o}\``), `${LOOP_FILE} never spells the commit outcome \`${o}\``);
  });
}

test("✧ CLOSURE — every `blocked:` and commit-outcome spelling in /pharn-loop is a member of its set (L36)", () => {
  const body = commandBody(LOOP_FILE);
  assert.deepEqual(blockedClosureOffenders(body), [], "a `blocked:` spelling outside STUCK_POINTS");
  assert.deepEqual(outcomeClosureOffenders(body), [], "a commit-outcome spelling outside COMMIT_OUTCOMES");
});

test("✧ /pharn-loop's commit re-derives the plan scope, then stages, then commits by pathspec (L38)", () => {
  assert.equal(commitBlockReason(commandBody(LOOP_FILE)), null);
});

test("✧ no fenced line in /pharn-loop spells a known `git push`, `git merge` or `--no-verify` form", () => {
  assert.deepEqual(forbiddenGitOffenders(commandBody(LOOP_FILE)), []);
});

test("✧ no fenced block in /pharn-loop reads a shell variable it did not assign — each block is its own shell", () => {
  assert.deepEqual(crossBlockVariableOffenders(commandBody(LOOP_FILE)), []);
});

// ── FRESHNESS WIRING (L45/L22): the loop reads the stop only after check-loop-fresh.mjs, and commits only
// after it runs again at the commit gate. Presence + ORDER over the committed prose — NEVER proof a run
// executed either line (P0). The lines themselves are EXECUTED by pharn/floor/check-loop-fresh.test.mjs.
const LOOP_FRESH_DECISION = /^[ \t]*node pharn\/floor\/check-loop-fresh\.mjs --feature '<name>' --base '<base sha>' --iter <N> --front\s*$/;
const LOOP_FRESH_COMMIT =
  /^[ \t]*node pharn\/floor\/check-loop-fresh\.mjs --feature '<name>' --base '<base sha>' --commit-gate --front\s*$/;
const LOOP_STOP_LINE = /^[ \t]*node pharn\/floor\/check-loop\.mjs pharn\/features\/<name>\/verify-report\.json /;

/** null when both freshness calls are pinned exactly once, the decision call precedes check-loop.mjs, and
 *  the commit-gate call sits under Step 6c BEFORE the scope re-derivation and the staging lines; else why. */
function freshnessWiringReason(body) {
  const lines = body.split(/\r?\n/);
  const idx = (re) => lines.map((l, i) => (re.test(l) ? i : -1)).filter((i) => i !== -1);
  const decision = idx(LOOP_FRESH_DECISION);
  const commit = idx(LOOP_FRESH_COMMIT);
  const stop = idx(LOOP_STOP_LINE);
  const heading = lines.findIndex((l) => l.startsWith(LOOP_COMMIT_HEADING));
  const fromPlan = lines.findIndex((l) => LOOP_FROM_PLAN_LINE.test(l));
  const add = lines.findIndex((l) => LOOP_ADD_LINE.test(l));
  if (decision.length !== 1) return `expected ONE decision-time freshness call, found ${decision.length}`;
  if (commit.length !== 1) return `expected ONE commit-gate freshness call, found ${commit.length}`;
  if (stop.length !== 1) return `expected ONE check-loop.mjs stop line, found ${stop.length}`;
  if (!(decision[0] < stop[0])) return "the decision-time freshness call must precede check-loop.mjs";
  if (!(heading < commit[0] && commit[0] < fromPlan && commit[0] < add)) {
    return "the commit-gate freshness call must sit under Step 6c, before the scope re-derivation and the staging lines";
  }
  return null;
}

test("✧ /pharn-loop reads check-loop-fresh.mjs BEFORE the stop, and again FIRST in the Step 6c commit gate", () => {
  assert.equal(freshnessWiringReason(commandBody(LOOP_FILE)), null);
  assert.ok(commandBody(LOOP_FILE).includes('"pharn/floor/check-loop-fresh.mjs"'), "the checker must be in `reads:`");
});

test("✧ the freshness wiring rule DISCRIMINATES — each mutant of the real command fails (L4)", () => {
  const real = commandBody(LOOP_FILE);
  const drop = (re) =>
    real
      .split("\n")
      .filter((l) => !re.test(l))
      .join("\n");
  const noDecision = drop(LOOP_FRESH_DECISION);
  assert.notEqual(noDecision, real, "precondition: the decision call must exist to be dropped (L34)");
  assert.match(freshnessWiringReason(noDecision), /ONE decision-time/);
  const noCommit = drop(LOOP_FRESH_COMMIT);
  assert.notEqual(noCommit, real, "precondition: the commit-gate call must exist to be dropped (L34)");
  assert.match(freshnessWiringReason(noCommit), /ONE commit-gate/);
  // Move the decision call AFTER the stop line.
  const lines = real.split("\n");
  const d = lines.findIndex((l) => LOOP_FRESH_DECISION.test(l));
  const moved = [...lines];
  const [call] = moved.splice(d, 1);
  moved.splice(moved.findIndex((l) => LOOP_STOP_LINE.test(l)) + 1, 0, call);
  assert.match(freshnessWiringReason(moved.join("\n")), /must precede check-loop\.mjs/);
  // Move the commit-gate call AFTER the staging line.
  const c = lines.findIndex((l) => LOOP_FRESH_COMMIT.test(l));
  const late = [...lines];
  const [gate] = late.splice(c, 1);
  late.splice(late.findIndex((l) => LOOP_ADD_LINE.test(l)) + 1, 0, gate);
  assert.match(freshnessWiringReason(late.join("\n")), /under Step 6c, before/);
});

// ── STOP-GUARD MARKER (L22/L45): the run is OPENED right after the pre-run snapshot and CLOSED after the
// writes-scope release, each by ONE pinned line. Presence + order over committed prose — never proof a run
// executed either (P0). The lines are EXECUTED by .claude/hooks/require-loop-record.test.cjs.
const LOOP_GUARD_OPEN = /^[ \t]*node \.claude\/hooks\/require-loop-record\.cjs --open '<name>' --cap <M>\s*$/;
const LOOP_GUARD_CLOSE = /^[ \t]*node \.claude\/hooks\/require-loop-record\.cjs --close '<name>'\s*$/;
const LOOP_SNAPSHOT = /pre-run-status\.txt\s*$/;
const LOOP_RUN_START = /^[ \t]*node pharn\/floor\/mark-phase\.mjs --name '<name>' --kind run-start\s*$/;
const LOOP_CLEAR = /^[ \t]*node \.claude\/hooks\/set-writes-scope\.cjs --clear\s*$/;

/** null when --open sits between the snapshot and run-start, and --close after the Final step's --clear. */
function stopGuardWiringReason(body) {
  const lines = body.split(/\r?\n/);
  const idx = (re) => lines.map((l, i) => (re.test(l) ? i : -1)).filter((i) => i !== -1);
  const open = idx(LOOP_GUARD_OPEN);
  const close = idx(LOOP_GUARD_CLOSE);
  const snap = idx(LOOP_SNAPSHOT);
  const start = idx(LOOP_RUN_START);
  const clear = idx(LOOP_CLEAR);
  if (open.length !== 1) return `expected ONE --open line, found ${open.length}`;
  if (close.length !== 1) return `expected ONE --close line, found ${close.length}`;
  if (snap.length !== 1 || start.length !== 1 || clear.length !== 1) return "an anchor line is missing (snapshot / run-start / --clear)";
  if (!(snap[0] < open[0] && open[0] < start[0])) return "--open must follow the pre-run snapshot and precede run-start";
  if (!(clear[0] < close[0])) return "--close must follow the Final step's --clear";
  return null;
}

test("✧ /pharn-loop opens the Stop-guard marker after the snapshot and closes it in the Final step", () => {
  assert.equal(stopGuardWiringReason(commandBody(LOOP_FILE)), null);
});

test("✧ the Stop-guard marker rule DISCRIMINATES — dropping or misplacing either line fails (L4)", () => {
  const real = commandBody(LOOP_FILE);
  const lines = real.split("\n");
  const drop = (re) => lines.filter((l) => !re.test(l)).join("\n");
  assert.notEqual(drop(LOOP_GUARD_OPEN), real, "precondition: the --open line exists (L34)");
  assert.match(stopGuardWiringReason(drop(LOOP_GUARD_OPEN)), /ONE --open/);
  assert.notEqual(drop(LOOP_GUARD_CLOSE), real, "precondition: the --close line exists (L34)");
  assert.match(stopGuardWiringReason(drop(LOOP_GUARD_CLOSE)), /ONE --close/);
  // Move --close ABOVE --clear.
  const c = lines.findIndex((l) => LOOP_GUARD_CLOSE.test(l));
  const early = [...lines];
  const [closeLine] = early.splice(c, 1);
  early.splice(
    early.findIndex((l) => LOOP_CLEAR.test(l)),
    0,
    closeLine
  );
  assert.match(stopGuardWiringReason(early.join("\n")), /must follow the Final step/);
  // Move --open AFTER run-start.
  const o = lines.findIndex((l) => LOOP_GUARD_OPEN.test(l));
  const late = [...lines];
  const [openLine] = late.splice(o, 1);
  late.splice(late.findIndex((l) => LOOP_RUN_START.test(l)) + 1, 0, openLine);
  assert.match(stopGuardWiringReason(late.join("\n")), /must follow the pre-run snapshot/);
});

test("✧ /pharn-spec carries the `--model-approve` branch /pharn-loop relies on, recording `approved_by: model`", () => {
  const body = commandBody("pharn-spec.md");
  assert.ok(body.includes("### Step 4a — `--model-approve`"), "pharn-spec.md has no Step 4a `--model-approve` branch");
  assert.ok(body.includes("`approved_by: model`"), "pharn-spec.md never spells `approved_by: model`");
});

test("✧ the /pharn-loop rules DISCRIMINATE — each fails on a mutant of the real command (L4)", () => {
  const real = commandBody(LOOP_FILE);

  const asks = `${real}\nCall \`AskUserQuestion\` here.\n`;
  assert.match(asks, ASK_TOKEN_RE, "the ask-token matcher must fire on an inserted tool name");

  const variant = real.replace("`blocked: no-slug`", "`blocked: no_slug`");
  assert.notEqual(variant, real, "precondition: the mutation must change the body (L34)");
  assert.deepEqual(blockedClosureOffenders(variant), ["no_slug"], "blocked closure must reject a variant id");

  const outcome = real.replace("`not committed: commit failed`", "`not committed: commit error`");
  assert.notEqual(outcome, real, "precondition: the mutation must change the body (L34)");
  assert.deepEqual(outcomeClosureOffenders(outcome), ["not committed: commit error"], "outcome closure must reject a variant");

  const noRederive = real
    .split("\n")
    .filter((l) => !LOOP_FROM_PLAN_LINE.test(l))
    .join("\n");
  assert.notEqual(noRederive, real, "precondition: the --from-plan line must exist to be removed (L34)");
  assert.equal(
    commitBlockReason(noRederive),
    "no `--from-plan` re-derivation line",
    "the ordering rule must reject a commit block that reuses a stale scope"
  );

  const globbing = real.replace(/GIT_LITERAL_PATHSPECS=1 git add -A/, "git add -A");
  assert.notEqual(globbing, real, "precondition: the literal-pathspec add line must exist to be mutated (L34)");
  assert.equal(
    commitBlockReason(globbing),
    "no `git add -A --pathspec-from-file` line",
    "the ordering rule must reject a staging line that lets git glob a listed path"
  );

  for (const line of ["git push origin HEAD", "b=x; git push origin HEAD", "git -C . push", 'execFileSync("git", ["push"]);']) {
    const pushes = `${real}\n\`\`\`bash\n${line}\n\`\`\`\n`;
    assert.equal(forbiddenGitOffenders(pushes).length, 1, `the forbidden-git rule must fire on a fenced \`${line}\``);
  }

  const splitVar = `${real}\n\`\`\`bash\nb='x'\n\`\`\`\n\n\`\`\`bash\ngit branch -d "$b"\n\`\`\`\n`;
  assert.equal(crossBlockVariableOffenders(splitVar).length, 1, "the cross-block rule must fire on a variable set in an earlier block");

  assert.deepEqual(blockedClosureOffenders(real), [], "and every rule must ACCEPT the real command");
  assert.equal(commitBlockReason(real), null);
  assert.deepEqual(crossBlockVariableOffenders(real), []);
});

// ── PHASE-MARKER WIRING — the ENUMERATION over emitting commands (L29/L31/L36) ───────────────────────
//
// `/pharn-loop` was the only command writing phase markers until `/pharn-ship` was wired. The moment a
// capability has TWO callers, what each caller OWES becomes a set — and [[L31]] is the record of exactly
// this shape going wrong: a deliberate pair whose CODE was pinned to agree while its OBLIGATIONS were
// enumerated nowhere, so the second copy shipped missing both invocations for a whole release line with
// every gate green. The failure was not that someone forgot; it was that the set of sites was never
// written down, so "done" was assessed per-file.
//
// So the obligations are materialized HERE and the rules iterate them: a third emitting command inherits
// every rule below without anyone editing this file, and the CORPUS CLOSURE test makes it FAIL until it
// is enumerated rather than silently going uncovered.
//
// Honest scope, the same narrow kind as every set above: these read command PROSE. They prove the
// invocation is PRESENT with the right flags. They cannot prove a run executed it, that the marker file
// was written, or that the stage named actually ran — "the wiring is pinned" NEVER means "the marker was
// written" (P0), which is `mark-phase.mjs`'s own stated bound and is not re-claimed stronger here.

const MARK_PHASE = /node pharn\/floor\/mark-phase\.mjs[^\n]*/g;

const PHASE_MARKER_WIRING = [
  {
    file: "pharn-loop.md",
    // The loop marks pharn-spec: it resolves `<name>` at S2 and marks run-start there, before the spec
    // stage runs.
    stages: ["pharn-spec", "pharn-plan", "pharn-grill", "pharn-test", "pharn-build", "pharn-regress", "pharn-verify"],
    iterated: ["pharn-build", "pharn-regress", "pharn-verify"],
    // The loop's iteration count is a RUNTIME value under a `--max-iter` cap, so the command pins the
    // PLACEHOLDER and the agent substitutes it. Pinning `\d+` here would be wrong for this command.
    iterationForm: /^<N>$/,
    iterationWhy: "a runtime value under --max-iter, substituted by the agent",
  },
  {
    file: "pharn-ship.md",
    // Ship does NOT mark pharn-spec, and the omission is DELIBERATE, not a gap: `<name>` is resolved BY
    // `/pharn-spec`, and `<name>` is the marker file's own directory — so no NAMED marker can exist
    // before that stage has already run. Since `run-window/1` the spec work is nonetheless INSIDE the
    // run: Step 1 records a session-keyed `--pending-start` that the named run-start adopts (pinned
    // below). The spec's requests are therefore run members in the `unattributed` stage bucket. A rule
    // demanding a `pharn-spec` stage marker here would demand an impossible one.
    stages: ["pharn-plan", "pharn-grill", "pharn-test", "pharn-build", "pharn-regress", "pharn-verify"],
    iterated: ["pharn-build", "pharn-regress", "pharn-verify"],
    // Ship does not iterate: it runs the chain once, with AT MOST ONE build-completion retry. So its
    // iteration numbers are LITERAL — 1 in the chain, 2 in the Step-2b retry — and a `<N>` placeholder
    // here would be a copied-from-the-loop mistake that renders an invalid `--iteration` at runtime.
    // The two forms are pinned per command precisely so neither can drift into the other.
    iterationForm: /^[12]$/,
    iterationWhy: "a literal: 1 in the chain, 2 in the single Step-2b retry",
  },
];

test("✧ PHASE-MARKER ENUMERATION is non-vacuous and CLOSED over the corpus", () => {
  assert.ok(PHASE_MARKER_WIRING.length >= 2, `expected >=2 emitting commands, got ${PHASE_MARKER_WIRING.length}`);
  const enumerated = PHASE_MARKER_WIRING.map((c) => c.file).sort();
  assert.deepEqual([...new Set(enumerated)], enumerated, "no duplicate member");
  // Closure over the CORPUS, not over this list — this is the assertion that makes a third caller fail
  // here instead of shipping uncovered (L31's exact gap).
  const live = readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".md") && !PART_FILES.has(f) && /node pharn\/floor\/mark-phase\.mjs/.test(commandText(f)))
    .sort();
  assert.deepEqual(live, enumerated, "every command invoking mark-phase.mjs must be enumerated above");
});

for (const cmd of PHASE_MARKER_WIRING) {
  test(`✧ ${cmd.file} brackets its run and every stage it runs`, () => {
    const body = commandBody(cmd.file);
    // A `--pending-start` call carries no --kind by design (it is a moment, not a marker); it is pinned
    // by its own test below and excluded from the kind closure here. A `--mode` run-start (6.25.0,
    // `/pharn-ship --quick`) is the QUICK ALTERNATIVE to the command's one named full-mode run-start —
    // command prose carries BOTH lines (the full one, and the quick one inside `## Quick mode`), so it is
    // excluded here too and pinned separately by QUICK_MODE_WIRING below. This is the "count the run-start
    // lines WITHOUT --mode" carve-out `.dev/features/ship-quick-mode/PLAN.md` §6 records (this comment and
    // QUICK_MODE_WIRING's header are its only other statements): it keeps this rule's "exactly one
    // run-start" the FULL-MODE pin, unchanged in strength.
    const calls = (body.match(MARK_PHASE) ?? []).filter((c) => !/--pending-start/.test(c) && !/--mode\b/.test(c));
    assert.ok(calls.length > 0, `non-vacuity: ${cmd.file} must carry mark-phase invocations`);

    const kindsSeen = calls.map((c) => (c.match(/--kind\s+(\S+)/) ?? [])[1]);
    // CLOSURE over the kind vocabulary (L36): an invented `--kind` fails, which a per-member presence
    // set would not catch. The set is the one `mark-phase.mjs` enforces; a typo'd kind is refused at
    // runtime, so a pinned typo would be a command that silently records nothing.
    for (const k of kindsSeen) {
      assert.ok(
        ["run-start", "stage-start", "orchestrator", "run-stop"].includes(k),
        `${cmd.file} uses an unknown --kind ${JSON.stringify(k)}`
      );
    }

    // The RUN boundaries: exactly one of each. Two `run-start`s would mean two epochs in one ledger.
    for (const kind of ["run-start", "run-stop"]) {
      const n = kindsSeen.filter((k) => k === kind).length;
      assert.equal(n, 1, `${cmd.file} must carry exactly one --kind ${kind} invocation; found ${n}`);
    }

    // Every stage this command runs must be marked.
    const staged = new Set(calls.map((c) => (c.match(/--stage\s+(\S+)/) ?? [])[1]).filter(Boolean));
    assert.deepEqual([...staged].sort(), [...cmd.stages].sort(), `${cmd.file}'s marked stages must equal its declared stage set`);

    // An `orchestrator` marker per stage-start, so a stage's tail is not attributed to the stage.
    const starts = kindsSeen.filter((k) => k === "stage-start").length;
    const orchs = kindsSeen.filter((k) => k === "orchestrator").length;
    assert.equal(orchs, starts, `${cmd.file} must return to the orchestrator after every stage-start (${starts} starts, ${orchs} returns)`);

    // The iterated stages carry an explicit --iteration; the once-only stages must NOT, or their
    // requests would land in a bucket the run never iterated.
    for (const c of calls) {
      const stage = (c.match(/--stage\s+(\S+)/) ?? [])[1];
      if (!stage) continue;
      const iter = (c.match(/--iteration\s+(\S+)/) ?? [])[1];
      if (cmd.iterated.includes(stage)) {
        assert.ok(iter !== undefined, `${cmd.file}: ${stage} is iterated and must carry --iteration`);
        assert.match(iter, cmd.iterationForm, `${cmd.file}: ${stage}'s --iteration must be ${cmd.iterationWhy}`);
      } else {
        assert.equal(iter, undefined, `${cmd.file}: ${stage} runs once and must not carry --iteration`);
      }
    }
  });
}

// The PENDING START (`run-window/1`). The set of commands that need one is CLOSED and named: `/pharn-ship`
// alone, because it is the only emitting command whose `<name>` is resolved BY `/pharn-spec`. The loop
// names its slug at S2 and marks run-start before spec, so a pending call there would be dead weight.
// Presence + ORDER only: this proves the prose carries the call before the spec step, NEVER that an agent
// executes it (P0, L19).
const PENDING_START_WIRING = [{ file: "pharn-ship.md", before: ["/pharn-spec <description>", "--kind run-start"] }];

test("✧ PENDING-START is wired exactly where it is needed, and ONLY there", () => {
  assert.equal(PENDING_START_WIRING.length, 1, "non-vacuity: the enumeration is counted");
  const live = PHASE_MARKER_WIRING.map((c) => c.file)
    .filter((f) => /mark-phase\.mjs --pending-start/.test(commandBody(f)))
    .sort();
  assert.deepEqual(
    live,
    PENDING_START_WIRING.map((c) => c.file).sort(),
    "closure: a command that gains or loses --pending-start must be enumerated here"
  );
  for (const w of PENDING_START_WIRING) {
    const body = commandBody(w.file);
    const calls = body.match(/node pharn\/floor\/mark-phase\.mjs --pending-start[^\n]*/g) ?? [];
    assert.equal(calls.length, 1, `${w.file}: exactly one --pending-start invocation`);
    assert.equal(calls[0].trim(), "node pharn/floor/mark-phase.mjs --pending-start", "pinned verbatim — no extra flags (L22)");
    const at = body.indexOf(calls[0]);
    for (const anchor of w.before) {
      const other = body.indexOf(anchor);
      assert.ok(other > -1, `${w.file}: anchor ${JSON.stringify(anchor)} must exist, or the order check is vacuous`);
      assert.ok(at < other, `${w.file}: --pending-start must precede ${JSON.stringify(anchor)}`);
    }
  }
});

test("✧ ADOPTION is opt-in: ONLY the pending-start commands' named run-start carries --adopt-pending", () => {
  // REVIEW finding 1: when every run-start adopted, an abandoned ship's pending file widened a later
  // /pharn-loop window. The flag must sit exactly where --pending-start does, and nowhere else.
  const pendingFiles = new Set(PENDING_START_WIRING.map((w) => w.file));
  for (const cmd of PHASE_MARKER_WIRING) {
    // The QUICK run-start (6.25.0, carries --mode) is a SEPARATE line pinned by QUICK_MODE_WIRING below,
    // which asserts it ALSO carries --adopt-pending (the same carve-out PHASE-MARKER ENUMERATION above
    // documents) — excluded here so "exactly one named run-start" stays the full-mode pin.
    const starts = (commandBody(cmd.file).match(MARK_PHASE) ?? []).filter((c) => /--kind run-start/.test(c) && !/--mode\b/.test(c));
    assert.equal(starts.length, 1, `${cmd.file}: exactly one named run-start`);
    assert.equal(
      /--adopt-pending/.test(starts[0]),
      pendingFiles.has(cmd.file),
      `${cmd.file}: --adopt-pending must be present iff the command records a --pending-start`
    );
  }
});

test("✧ PENDING-START order check DISCRIMINATES — moving the call after the spec step fails it", () => {
  const body = commandBody("pharn-ship.md");
  const call = "node pharn/floor/mark-phase.mjs --pending-start\n";
  assert.ok(body.includes(call), "the real body must carry the call, or this control is vacuous");
  const moved = body.replace(call, "").replace("/pharn-spec <description>", "/pharn-spec <description>\n" + call);
  assert.ok(moved.indexOf("--pending-start") > moved.indexOf("/pharn-spec <description>"), "the mutation must reorder");
});

test("✧ PHASE-MARKER rules DISCRIMINATE — a dropped orchestrator and a mistyped kind are both caught", () => {
  // L4/L34: an assertion that only ever sees the correct corpus certifies nothing. Mutate the REAL body
  // so the guard's own extraction runs on both sides.
  const body = commandBody("pharn-ship.md");
  const dropped = body.replace(/node pharn\/floor\/mark-phase\.mjs --name '<name>' --kind orchestrator\n/, "");
  assert.notEqual(dropped, body, "the mutation must change the body, or this test is vacuous");
  const kindsOf = (s) => (s.match(MARK_PHASE) ?? []).map((c) => (c.match(/--kind\s+(\S+)/) ?? [])[1]);
  const k = kindsOf(dropped);
  assert.notEqual(
    k.filter((x) => x === "orchestrator").length,
    k.filter((x) => x === "stage-start").length,
    "a dropped orchestrator must break the pairing rule"
  );
  const mistyped = body.replace("--kind run-stop", "--kind run-stopped");
  assert.ok(kindsOf(mistyped).includes("run-stopped"), "the guard must SEE a mistyped kind — else it proves nothing");
  assert.ok(!["run-start", "stage-start", "orchestrator", "run-stop"].includes("run-stopped"), "and the closure must reject it");
});

test("✧ every emitting command emits the LEDGER and the REPORT, and checks the ledger", () => {
  // The three invocations are one obligation set: an emitter that writes cost.json but never checks it
  // ships an unvalidated artifact, and one that skips the report leaves the ledger with no human view.
  const OBLIGATIONS = [
    ["render-cost-ledger", /node pharn\/floor\/render-cost-ledger\.mjs '<name>' --command \/pharn-\w+/],
    ["check-cost-ledger", /node pharn\/floor\/check-cost-ledger\.mjs pharn\/features\/<name>\/cost\.json/],
    ["render-run-report", /node pharn\/floor\/render-run-report\.mjs '<name>' --base pharn\/features/],
  ];
  assert.equal(OBLIGATIONS.length, 3, "non-vacuity: the obligation set must be non-empty and counted");
  for (const cmd of PHASE_MARKER_WIRING) {
    const body = commandBody(cmd.file);
    for (const [label, re] of OBLIGATIONS) {
      assert.match(body, re, `${cmd.file} must invoke ${label} with its pinned arguments`);
    }
    // `--command` must name THIS command, not a sibling — the defect a copied invocation produces, and
    // the reason the ledger's `command` field is worth checking at all.
    const slug = cmd.file.replace(/\.md$/, "");
    assert.match(
      body,
      new RegExp(`render-cost-ledger\\.mjs '<name>' --command /${slug}\\b`),
      `${cmd.file} must pass --command /${slug} — a copied sibling value would mislabel every ledger it writes`
    );
  }
});

// ── QUICK MODE WIRING (6.25.0, /pharn-ship --quick) — the same L29/L31/L36 shape, one domain over ─────
//
// A shorter spine for a small change trades checks for cost (the maintainer's 2026-09-25 decision, the
// AC-delivery queue's Phase 3.1). Command prose now carries BOTH the full-mode named run-start (pinned
// above, unaffected — PHASE_MARKER_WIRING and ADOPTION exclude a `--mode`-bearing line by the carve-out
// `.dev/features/ship-quick-mode/PLAN.md` §6 records) AND a QUICK alternative inside `## Quick mode`; this
// set is that alternative's OWN obligations, materialized once (L29) rather than folded into either set
// above — the same reason LESSONS_SWEEP_WIRING and PLAN_LESSONS_WIRING stay separate sets despite sharing
// a domain.
//
// Honest scope, the same narrow kind as every other set in this file: these pin that the command PROSE
// carries the invocation / section / pointer / literal. They CANNOT prove a run executed it, that --quick
// was actually passed, or that a skip was honored at runtime — "the wiring is pinned" NEVER means "a quick
// run behaved this way" (P0).

/** Every `mark-phase.mjs` invocation carrying `--mode` (there is exactly one such call today: the quick
 *  run-start `/pharn-ship`'s `## Quick mode` section pins). */
const MODE_MARK_PHASE = /node pharn\/floor\/mark-phase\.mjs[^\n]*--mode\b[^\n]*/g;

test("✧ QUICK MODE: the quick run-start line appears exactly once in the corpus, in pharn-ship.md, with --adopt-pending", () => {
  const hits = [];
  for (const file of commandFiles()) {
    for (const m of commandBody(file).match(MODE_MARK_PHASE) ?? []) hits.push({ file, line: m });
  }
  assert.deepEqual(
    hits.map((h) => h.file),
    ["pharn-ship.md"],
    "the quick run-start line must appear EXACTLY ONCE in the corpus, and only in pharn-ship.md"
  );
  assert.match(hits[0].line, /--kind run-start/, "the --mode line must be a run-start (mode is run-start-only)");
  assert.match(hits[0].line, /--adopt-pending/, "the quick run-start must still adopt the pending start, like the full one");
});

test("✧ QUICK MODE: every mark-phase.mjs --mode value in the corpus is EXACTLY --mode quick (closure, L36)", () => {
  for (const file of commandFiles()) {
    for (const m of commandBody(file).match(MODE_MARK_PHASE) ?? []) {
      assert.match(m, /--mode quick(?!\S)/, `${file}: a --mode value other than the literal quick was found: ${m.trim()}`);
    }
  }
});

/** The `## Quick mode` section of pharn-ship.md, by HEADING OFFSET (L6: a structural fact from its
 *  structured location, never `indexOf` over the body's prose) — both boundary anchors asserted FOUND
 *  first (L60), so a renamed or removed heading fails loudly rather than silently slicing from/to the
 *  wrong point. */
function quickModeSection() {
  const body = commandBody("pharn-ship.md");
  const start = headingOffset(body, "Quick mode — `/pharn-ship --quick` (6.25.0)");
  assert.ok(start >= 0, "pharn-ship.md must carry a line-initial `## Quick mode — …` heading");
  const end = headingOffset(body, "Step 2 — Run the chain, branching ONLY on each stage's STRUCTURAL verdict (P5)");
  assert.ok(end > start, "pharn-ship.md's `## Step 2 — …` heading must exist and follow `## Quick mode`");
  return body.slice(start, end);
}

test("✧ QUICK MODE: pharn-ship.md's ## Quick mode section holds the --spec-kind line", () => {
  assert.match(quickModeSection(), /node pharn\/floor\/check-spec\.mjs --spec-kind pharn\/features\/<name>\/SPEC\.md/);
});

// The skip set (L29): every full-mode item a quick run does NOT perform. Materialized once; each member's
// regex is a phrase actually present in the section, not a paraphrase — so the rule fails the moment the
// section stops naming that member, rather than merely stops naming it a particular way.
const QUICK_SKIP_SET = [
  { name: "/pharn-regress", re: /`\/pharn-regress`/ },
  { name: "the Step-2b regress re-run", re: /regress re-run and its two markers are SKIPPED/ },
  { name: "Step 2c (BRIEFING.md)", re: /Steps 2c and 2d: SKIPPED/ },
  { name: "Step 2d (PR handoff)", re: /Steps 2c and 2d: SKIPPED/ },
  { name: "Step 3a item 4 (RUN-REPORT.md)", re: /\(`render-run-report\.mjs`\) is SKIPPED/ },
];

test("✧ QUICK MODE: pharn-ship.md's ## Quick mode section names every member of the skip set (L29)", () => {
  assert.equal(QUICK_SKIP_SET.length, 5, "non-vacuity: the skip-set enumeration is counted");
  const section = quickModeSection();
  for (const skip of QUICK_SKIP_SET) {
    assert.match(section, skip.re, `## Quick mode must name ${skip.name} among what quick mode skips`);
  }
});

test("✧ QUICK MODE: pharn-ship.md's ## Quick mode section states cost.json is kept", () => {
  assert.match(quickModeSection(), /cost\.json.*is kept in quick mode/);
});

// Each skip SITE (as opposed to the ## Quick mode section's own summary) carries a one-line pointer back —
// so a reader hitting the full-mode step directly, never having read ## Quick mode, still learns the delta.
const QUICK_SKIP_POINTERS = [
  {
    site: "the regress stage item (Step 2)",
    re: /`\/pharn-regress`[\s\S]*?SKIPPED\s+entirely in Quick mode — see `## Quick mode` above/,
  },
  { site: "Step 2b heading", re: /In Quick mode the regress re-run and its two markers are SKIPPED — see `## Quick mode`/ },
  { site: "Step 2c heading", re: /SKIPPED entirely in Quick mode — see `## Quick mode` item 10 above\. `BRIEFING\.md`'s only reader/ },
  { site: "Step 2d heading", re: /SKIPPED entirely in Quick mode — see `## Quick mode` item 10 above\. Its only input/ },
  { site: "Step 3a item 4", re: /SKIPPED in Quick mode — see `## Quick mode` item 12 above/ },
  // GATE 2 (review F3): the regress site also points at the scope check quick mode KEEPS, and Step 2b at its re-run.
  {
    site: "the regress stage item's kept scope check",
    re: /Quick mode runs this stage's scope check itself, from\s+`## Quick mode` item 7/,
  },
  { site: "Step 2b's kept scope check", re: /with the kept scope check \(item 7\) between them/ },
];

for (const pointer of QUICK_SKIP_POINTERS) {
  test(`✧ QUICK MODE: ${pointer.site} carries its one-line pointer to ## Quick mode`, () => {
    assert.match(commandBody("pharn-ship.md"), pointer.re);
  });
}

test("✧ QUICK MODE: pharn-grill.md pins its --spec-kind line and the skip literal", () => {
  const body = commandBody("pharn-grill.md");
  assert.match(body, /node pharn\/floor\/check-spec\.mjs --spec-kind pharn\/features\/<name>\/SPEC\.md/);
  assert.match(body, /interrogation NOT performed — skipped by mode \(quick\)/);
});

test("✧ QUICK MODE: pharn-spec.md pins the literal spec_kind: quick and its Step-4 trade sentence", () => {
  const body = commandBody("pharn-spec.md");
  assert.match(body, /spec_kind: quick/);
  assert.match(body, /looks for no\s*\n\s*regression outside the feature and does not interrogate the plan/);
  // GATE 2 (review F3): the sentence the human reads before approving names the check quick mode KEEPS.
  assert.match(body, /does not interrogate the plan; it still stops on a changed file\s+outside the plan's declared files/);
});

test("✧ QUICK MODE: SHIP.md's quick bullet names its three items (grill G10)", () => {
  const section = quickModeSection();
  assert.match(section, /regressions outside the feature/);
  assert.match(section, /the plan interrogation/);
  assert.match(section, /the briefing and the run report/);
});

test("✧ QUICK MODE: both pharn-ship.md and pharn-spec.md state --quick is read only as the first token (grill G3)", () => {
  for (const file of ["pharn-ship.md", "pharn-spec.md"]) {
    assert.match(
      commandBody(file),
      /recognized only as the FIRST TOKEN of the arguments/,
      `${file} must state --quick is recognized only as the first token`
    );
  }
});

// ── GATE 2 review fixes (2026-09-26) — each pin names the finding it holds, and each has a control below ────

/** F2: the first-token rule is labelled ADVISORY where it is stated, with the SPEC named as the backstop. */
const FIRST_TOKEN_ADVISORY = [
  { file: "pharn-ship.md", re: /This rule is ADVISORY \(P0\): it is an instruction to you, the\s+orchestrating model\./ },
  { file: "pharn-ship.md", re: /The floor backstop is the SPEC, never the invocation:/ },
  { file: "pharn-ship.md", re: /_"`--quick` is read only as the first token of the arguments"_ → \*\*ADVISORY\*\*/ },
  { file: "pharn-spec.md", re: /This\s+rule is ADVISORY \(P0\) — an instruction to you; nothing on the floor parses the invocation\./ },
  { file: "pharn-grill.md", re: /That rule is\s+\*\*ADVISORY\*\* \(an instruction to you; nothing parses the invocation\)/ },
];

test("✧ QUICK MODE (GATE-2 F2): the first-token rule is labelled ADVISORY, and the SPEC is named as its floor backstop", () => {
  assert.equal(FIRST_TOKEN_ADVISORY.length, 5, "NON-VACUITY (L34)");
  for (const site of FIRST_TOKEN_ADVISORY) assert.match(commandBody(site.file), site.re, site.file);
  // The impossibility wording the review struck must not come back (F2's evidence line, verbatim).
  assert.doesNotMatch(commandBody("pharn-ship.md"), /can never switch a run into this mode/);
});

/** F3: the scope check quick mode KEEPS — the pinned line, its STOP, its re-run and its SHIP.md record. Since 6.28.0
 *  (loop-quick-mode GATE 2, review F1) the line carries ONLY the slug and a resolved base: 6.25.0's line pasted the
 *  changed and declared lists into double-quoted shell arguments. pharn/floor/check-quick-scope.test.mjs EXECUTES both
 *  commands' committed lines against hostile names; this suite pins the line's presence and place. */
const QUICK_SCOPE_LINE = "node pharn/floor/check-quick-scope.mjs --feature '<name>' --base '<base sha>'";

test("✧ QUICK MODE (GATE-2 F3): ## Quick mode keeps the scope check — the pinned line once, its STOP, its re-run, and SHIP.md's record", () => {
  const section = quickModeSection();
  const lines = commandBody("pharn-ship.md")
    .split(/\r?\n/)
    .map((l) => l.trim());
  assert.equal(lines.filter((l) => l === QUICK_SCOPE_LINE).length, 1, "the quick scope line appears exactly once in pharn-ship.md");
  assert.ok(section.includes(QUICK_SCOPE_LINE), "…and it sits inside ## Quick mode");
  assert.match(section, /7\. \*\*The scope check: KEPT — run it before `\/pharn-verify`\.\*\*/);
  assert.match(section, /`1` → \*\*STOP\*\*:\s+a changed path is outside the declared writes/);
  assert.match(section, /the scope\s+check \(item 7\) runs again between the re-build and the re-verify/);
  assert.match(
    section,
    /\*\*Kept:\*\* the\s+scope check \(item 7\) — a file the run changed outside the plan's `## Files` still stops the run/
  );
  assert.match(section, /the scope\s+check's result verbatim \(`scope: clean`, item 7\)/);
});

test("✧ QUICK MODE (GATE-2 review): SHIP.md never points at another run's REGRESSION.md / BRIEFING.md / RUN-REPORT.md", () => {
  const section = quickModeSection();
  assert.match(section, /\*\*Never point at another run's artifacts\.\*\*/);
  assert.match(
    section,
    /_"Any `REGRESSION\.md`, `regression-report\.json`, `BRIEFING\.md` or\s+`RUN-REPORT\.md` in this directory predates this run and is not part of it\."_/
  );
  assert.match(section, /They are \*\*labelled, not\s+removed\*\*/, "the choice between removing and labelling is stated");
  // The full-mode Step 3 carries the pointer back, so a reader of Step 3 alone learns the carve-out.
  assert.match(commandBody("pharn-ship.md"), /\*\*the run's mode\*\* \(6\.25\.0\): `mode: full`, or `mode: quick`/);
});

// ★ F3, EXECUTED (L45): a stray written BEFORE the build's reconcile anchor is invisible to check-bash-reconcile
// (it covers anchor → verify only), and the committed quick scope line is what stops the run. The fixture is a
// throwaway git repo carrying the REAL guards, exactly as check-bash-reconcile.test.mjs builds its own.
test("★ QUICK MODE (GATE-2 F3): a stray planted before the anchor passes reconcile, and the committed quick scope line STOPs on it", () => {
  const FLOOR = join(REPO_ROOT, "pharn", "floor");
  const dir = mkdtempSync(join(tmpdir(), "hyg-quick-scope-"));
  try {
    const git = (...a) => {
      const r = spawnSync("git", a, { cwd: dir, encoding: "utf8" });
      assert.equal(r.status, 0, `git ${a.join(" ")}: ${r.stderr}`);
      return r.stdout;
    };
    git("init", "-q");
    git("config", "user.email", "t@example.invalid");
    git("config", "user.name", "t");
    writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
    mkdirSync(join(dir, ".claude", "hooks"), { recursive: true });
    for (const h of ["protect-trusted-paths.cjs", "enforce-writes-scope.cjs", "set-writes-scope.cjs"]) {
      writeFileSync(join(dir, ".claude", "hooks", h), readFileSync(join(REPO_ROOT, ".claude", "hooks", h)));
    }
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "a.js"), "export const a = 1;\n");
    git("add", "-A");
    git("commit", "-q", "-m", "seed");

    // /pharn-test-stage time: a Bash write OUTSIDE the plan's scope, before the build's anchor.
    writeFileSync(join(dir, "src", "stray.js"), "written before the anchor\n");
    // /pharn-build Step 0: the scope the plan declares, then the anchor.
    mkdirSync(join(dir, ".pharn"), { recursive: true });
    writeFileSync(join(dir, ".pharn", "writes-scope.json"), JSON.stringify({ scope: ["src/a.js"], set_by: "PLAN.md" }) + "\n");
    const anchor = spawnSync(process.execPath, [join(FLOOR, "reconcile-baseline.mjs"), "--anchor", "--base", dir, "--by", "test"], {
      encoding: "utf8",
    });
    assert.equal(anchor.status, 0, anchor.stderr);
    // The build writes its one declared file.
    writeFileSync(join(dir, "src", "a.js"), "export const a = 2;\n");

    // /pharn-verify's reconcile gate: CLEAN — the stray predates the anchor, so it is outside the window.
    const reconcile = spawnSync(process.execPath, [join(FLOOR, "check-bash-reconcile.mjs"), "--base", dir, "--require-baseline"], {
      encoding: "utf8",
    });
    assert.equal(reconcile.status, 0, `reconcile is blind to a pre-anchor stray: ${reconcile.stdout}${reconcile.stderr}`);

    // Quick mode item 7, the COMMITTED line (6.28.0): it takes only the slug and the base (HEAD here — an uncommitted
    // working-tree build) and builds the changed and declared sets itself, the declared ones from the plan's ## Files.
    const plan = (paths) => `# PLAN\n\n## Files\n\n${paths.map((p) => `- \`${p}\` — declared`).join("\n")}\n`;
    mkdirSync(join(dir, "pharn", "features", "feat"), { recursive: true });
    writeFileSync(join(dir, "pharn", "features", "feat", "PLAN.md"), plan(["src/a.js"]));
    const head = git("rev-parse", "HEAD").trim();
    // The line is read out of ## Quick mode as COMMITTED (L45), never re-typed here; the pin test above binds it.
    const committed = quickModeSection()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l === QUICK_SCOPE_LINE);
    assert.equal(committed.length, 1, "## Quick mode must carry exactly one scope line to execute");
    const run = () =>
      spawnSync(
        "sh",
        [
          "-c",
          committed[0]
            .replace("pharn/floor/check-quick-scope.mjs", join(FLOOR, "check-quick-scope.mjs"))
            .replace("<name>", "feat")
            .replace("<base sha>", head),
        ],
        { cwd: dir, encoding: "utf8" }
      );
    const stop = run();
    assert.equal(stop.status, 1, `the quick scope line must STOP on the stray: ${stop.stdout}${stop.stderr}`);
    assert.deepEqual(JSON.parse(stop.stdout).escaped, ["src/stray.js"]);
    assert.deepEqual(JSON.parse(stop.stdout).inside.sort(), ["pharn/features/feat/PLAN.md", "src/a.js", "src/stray.js"]);
    // CONTROL: the same run with the stray declared too is clean — the STOP above is the stray, not the line.
    writeFileSync(join(dir, "pharn", "features", "feat", "PLAN.md"), plan(["src/a.js", "src/stray.js"]));
    const clean = run();
    assert.equal(clean.status, 0, `${clean.stdout}${clean.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ QUICK MODE (GATE-2) mutation controls: each new pin fails when its text is broken (L60)", () => {
  const ship = commandBody("pharn-ship.md");
  const spec = commandBody("pharn-spec.md");
  const cases = [
    // F2: drop the ADVISORY label at its first site in pharn-ship.md.
    [
      ship,
      "This rule is ADVISORY (P0): it is an instruction to you, the",
      "This rule is binding: it is an instruction to you, the",
      FIRST_TOKEN_ADVISORY[0].re,
    ],
    // F3: drop the pinned scope line's --base flag.
    [
      ship,
      " --base '<base sha>'\n   ```\n\n   **Never type a path into it**",
      "\n   ```\n\n   **Never type a path into it**",
      new RegExp(QUICK_SCOPE_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    ],
    // F3: drop the KEPT clause from the trade sentence.
    [spec, "; it still stops on a changed file", ".", /does not interrogate the plan; it still stops on a changed file/],
    // Stale artifacts: drop the fixed line.
    [ship, "predates this run and is not part of it.", "is kept.", /predates this run and is not part of it\./],
  ];
  assert.equal(cases.length, 4, "NON-VACUITY (L34)");
  for (const [body, find, replace, re] of cases) {
    assert.ok(body.includes(find), `fixture sanity: the anchor ${JSON.stringify(find.slice(0, 40))} must exist`);
    assert.match(body, re, "the unbroken text must match its pin");
    assert.doesNotMatch(body.replace(find, replace), re, `breaking ${JSON.stringify(find.slice(0, 40))} must fail its pin`);
  }
});

test("✧ QUICK MODE mutation controls: each asserted property fails when broken (L60)", () => {
  const shipBody = commandBody("pharn-ship.md");

  // (1) drop --mode quick -> the quick run-start must disappear from MODE_MARK_PHASE detection.
  const droppedMode = shipBody.replace(" --mode quick", "");
  assert.notEqual(droppedMode, shipBody, "fixture sanity: the mutation must change the body");
  assert.deepEqual(droppedMode.match(MODE_MARK_PHASE), null, "dropping --mode quick must remove the quick run-start from detection");

  // (2) spell it --mode fast -> the closure-over-corpus rule must catch it.
  const misspelled = shipBody.replace("--mode quick", "--mode fast");
  const misspelledMatches = misspelled.match(MODE_MARK_PHASE) ?? [];
  assert.ok(misspelledMatches.length > 0, "fixture sanity: the mutant line must still be detected as a --mode line");
  assert.doesNotMatch(misspelledMatches[0], /--mode quick(?!\S)/, "a --mode fast line must fail the closure assertion");

  // (3) move the --spec-kind line out of the ## Quick mode section -> the section-scoped test must miss it.
  const specKindLine = "node pharn/floor/check-spec.mjs --spec-kind pharn/features/<name>/SPEC.md\n";
  assert.ok(shipBody.includes(specKindLine), "fixture sanity: the real body must carry the line once");
  const moved = shipBody.replace(specKindLine, "");
  const startIdx = headingOffset(moved, "Quick mode — `/pharn-ship --quick` (6.25.0)");
  const endIdx = headingOffset(moved, "Step 2 — Run the chain, branching ONLY on each stage's STRUCTURAL verdict (P5)");
  assert.ok(startIdx >= 0 && endIdx > startIdx, "fixture sanity: both headings must survive the removal");
  assert.doesNotMatch(moved.slice(startIdx, endIdx), /--spec-kind pharn\/features\/<name>\/SPEC\.md/);

  // (4) drop one skip pointer (Step 3a item 4's) -> that pointer's own rule must stop matching.
  const droppedPointer = shipBody.replace(
    "4. **Render the human-readable run report** _(SKIPPED in Quick mode — see `## Quick mode` item 12 above;\n   items 1–3 above still run, so `cost.json` is kept)_:",
    "4. **Render the human-readable run report:**"
  );
  assert.notEqual(droppedPointer, shipBody, "fixture sanity: the mutation must change the body");
  assert.doesNotMatch(droppedPointer, /SKIPPED in Quick mode — see `## Quick mode` item 12 above/);

  // (5) add a second quick run-start -> the exactly-once-in-the-corpus rule must fail.
  const doubled = `${shipBody}\n\`\`\`bash\nnode pharn/floor/mark-phase.mjs --name '<name>' --kind run-start --adopt-pending --mode quick\n\`\`\`\n`;
  const doubledHits = doubled.match(MODE_MARK_PHASE) ?? [];
  assert.equal(doubledHits.length, 2, "a second quick run-start must be detected, breaking the exactly-once-in-the-corpus rule");
});

test("✧ QUICK MODE wiring is non-vacuous — pharn-ship.md, pharn-grill.md and pharn-spec.md all exist on disk", () => {
  const present = new Set(commandFiles());
  for (const file of ["pharn-ship.md", "pharn-grill.md", "pharn-spec.md"]) {
    assert.ok(present.has(file), `${file} must exist for the QUICK MODE rules above to range over a real file`);
  }
});

// ── LOOP QUICK WIRING (6.28.0, /pharn-loop --quick) — the pair's second member (L31), materialized once (L29) ────────
//
// `/pharn-ship --quick` (above) and `/pharn-loop --quick` are a deliberate pair; .dev/features/loop-quick-mode/PLAN.md
// Design §5 enumerates the pair's obligations with each side's answer. This set pins the LOOP's side in its command
// prose: the section and its closing anchor; its two pinned lines — exactly once in the file, inside the section; the
// quick invocations; the skip set and a pointer at each skip site; the green token at its three decisive sites; the
// ADVISORY first-token label; the not-checked list; the record's `mode` capture and its no-repair rule (grill G1); the
// /pharn-spec and /pharn-grill sides; and a CLOSURE — the section quotes none of the whole-file pinned literals other
// suites read by first occurrence or by count (grill G7). The two pinned lines are EXECUTED further down (L45). Until
// GATE 2 there were three: a git listing fed the scope line's pasted lists, and both were replaced by one line that
// takes only the slug and the base (review F1; pharn/floor/check-quick-scope.test.mjs runs it on hostile names).
//
// Honest scope, as for every set in this file: prose PRESENCE and closure. It cannot prove a run read `--quick` as the
// first token, skipped `/pharn-regress`, ran the scope line, or wrote `mode: quick` — "the wiring is pinned" NEVER means
// "a quick loop behaved this way" (P0). What a quick loop's stop is decided by is check-loop.mjs's own tested table.

const LOOP_QUICK_HEADING = "Quick mode — `/pharn-loop --quick` (6.28.0)";
const LOOP_QUICK_NEXT = "Step 3 — The SPEC, approved by the model through `/pharn-spec` (reused, not re-implemented)";
const LOOP_SPEC_KIND_LINE = "node pharn/floor/check-spec.mjs --spec-kind pharn/features/<name>/SPEC.md";

/** pharn-loop.md's `## Quick mode` section, by HEADING OFFSET, both anchors asserted FOUND first (L60). */
function loopQuickSection(body = commandBody(LOOP_FILE)) {
  const start = headingOffset(body, LOOP_QUICK_HEADING);
  assert.ok(start >= 0, "pharn-loop.md must carry a line-initial `## Quick mode — …` heading");
  const end = headingOffset(body, LOOP_QUICK_NEXT);
  assert.ok(end > start, "pharn-loop.md's `## Step 3 — …` heading must exist and follow `## Quick mode`");
  return body.slice(start, end);
}

/** null when every pinned line appears exactly once in the file and inside the section, and no model-assembled git
 *  listing survives there (GATE 2, F1); else why. */
function loopQuickPinnedReason(body = commandBody(LOOP_FILE)) {
  const section = loopQuickSection(body);
  const lines = body.split(/\r?\n/).map((l) => l.trim());
  for (const pinned of [LOOP_SPEC_KIND_LINE, QUICK_SCOPE_LINE]) {
    const n = lines.filter((l) => l === pinned).length;
    if (n !== 1) return `expected ${JSON.stringify(pinned)} exactly once in ${LOOP_FILE}, found ${n}`;
    if (!section.split(/\r?\n/).some((l) => l.trim() === pinned)) return `${JSON.stringify(pinned)} is not inside ## Quick mode`;
  }
  const listing = fencedBlocks(section).find((b) => b.lines.some((l) => /^git (diff|ls-files)\b/.test(l.text.trim())));
  if (listing) return "## Quick mode must not ask the model to list paths for the scope check — the checker lists them itself";
  return null;
}

/** The skip set (L29), each member a phrase actually present in the section. */
const LOOP_QUICK_SKIP_SET = [
  { name: "/pharn-regress, its scope check kept", re: /`\/pharn-regress` SKIPPED, its scope check KEPT/ },
  { name: "/pharn-regress's markers", re: /No `\/pharn-regress` and none of its\s+markers/ },
  { name: "the render-run-report.mjs line", re: /its\s+`render-run-report\.mjs` line is SKIPPED/ },
];

/** A one-line pointer at each skip site outside the section (so a reader of the full-mode step learns the delta). */
const LOOP_QUICK_POINTERS = [
  {
    site: "Step 5.2 (regress)",
    re: /`\/pharn-regress` and its two markers are\s+SKIPPED in Quick mode: the scope check runs instead — `## Quick mode` item 5/,
  },
  {
    site: "Step 5.3's RERUN bullet (S11)",
    re: /A quick run: a RERUN naming `regress` is \*\*S11\*\*, never a regress run —\s+`## Quick mode` item 6/,
  },
  { site: "Step 6b's render line", re: /\(SKIPPED in\s+Quick mode — `## Quick mode` item 8; `cost\.json` is still emitted above\)/ },
  { site: "Step 7's report bullet", re: /a quick run renders none — `## Quick mode` item 8/ },
  // 6.28.0 coupling — each full-mode route site whose quick run uses ## Quick mode's --mode lines instead (appended, so the
  // mutation test's index into this list is unchanged).
  {
    site: "Step 3's route lines",
    re: /_\(A `--quick` run uses `## Quick mode` item 2's route and brief lines, each with\s+`--mode quick`, in place of Step 3's two\.\)_/,
  },
  {
    site: "Step 4's grill route line",
    re: /Then `\/pharn-grill`, the same way _\(a `--quick` run: `## Quick mode` item 3's route line, which runs it inline\)_:/,
  },
  {
    site: "Step 5.1's build route lines",
    re: /at iteration `<N>` _\(a `--quick` run:\s+`## Quick mode` item 4's route and brief lines, each with `--mode quick`\)_:/,
  },
];

/** STOP_GREEN_QUICK at the three decisive sites: the stop's exit-0 bullet, and the headings of Step 6a and Step 6c. */
const LOOP_QUICK_GREEN_SITES = [
  { site: "Step 5.4's exit-0 bullet", re: /\*\*For a quick SPEC exit `0` is\s+`STOP_GREEN_QUICK`\*\*/ },
  { site: "Step 6a's heading", re: /^### Step 6a — [^\n]*`STOP_GREEN_QUICK`/m },
  { site: "Step 6c's heading", re: /^### Step 6c — [^\n]*`STOP_GREEN_QUICK`/m },
];

/** The section's other obligations, each a phrase present in it. */
const LOOP_QUICK_SECTION_PINS = [
  { what: "the /pharn-spec quick invocation", re: /`\/pharn-spec --quick --model-approve <description>`/ },
  { what: "the /pharn-grill quick invocation", re: /`\/pharn-grill <name> --quick`/ },
  { what: "cost.json is kept", re: /\*\*`cost\.json` is kept\*\*/ },
  { what: "the first-token rule, first token only", re: /\*\*`--quick` is recognized only as the FIRST TOKEN of the arguments\*\*/ },
  {
    what: "the first-token rule labelled ADVISORY",
    re: /\*\*This rule is ADVISORY \(P0\): it is an\s+instruction to you, the orchestrating model; nothing parses the invocation\.\*\*/,
  },
  { what: "the mode binding", re: /\*\*The mode is the SPEC's pinned kind, never a flag\.\*\*/ },
  { what: "the not-checked heading", re: /\*\*`## Not checked in quick mode`\*\*/ },
  {
    what: "not checked: regressions outside the feature",
    re: /- \*\*regressions outside the feature\*\* — no base comparison ran; the scope check did;/,
  },
  {
    what: "not checked: the plan interrogation",
    re: /- \*\*the plan interrogation\*\* — `\/pharn-grill --quick` ran its two floor stops only;/,
  },
  { what: "not checked: RUN-REPORT.md", re: /- \*\*`RUN-REPORT\.md`\*\* — not rendered; `cost\.json` is\./ },
  { what: "a RERUN naming regress is S11", re: /\*\*A\s+RERUN naming `regress` is S11\*\*/ },
  { what: "exit 0 is STOP_GREEN_QUICK", re: /\*\*Exit `0` is\s+`STOP_GREEN_QUICK`\*\*/ },
];

/** grill G1: Step 6b's capture bullet names the invocation and refuses the JSON copy; its repair rule excludes `mode`. */
const LOOP_MODE_CAPTURE = [
  { what: "the mode capture bullet names the invocation", re: /- \*\*`mode`\*\* \(6\.28\.0\) records the run's \*\*invocation\*\*/ },
  { what: "…and is never copied from check-loop.mjs's JSON", re: /It is \*\*never copied from `check-loop\.mjs`'s JSON\*\*/ },
  { what: "the ≤1 repair rule excludes mode", re: /\*\*A decision↔mode RED is never repaired by editing `mode`\*\*/ },
];

/** grill G7: the whole-file pinned literals other suites read by FIRST occurrence or by COUNT — none may sit in the
 *  section, which precedes them all. RENDER_INVOCATION is render-run-report.test.mjs's own, copied here with a parity
 *  assertion below (a test file cannot be imported without running its tests). */
const RENDER_INVOCATION_COPY = /node pharn\/floor\/render-run-report\.mjs '<name>' --base pharn\/features/;
const LOOP_QUICK_FORBIDDEN = [
  { what: "the render-run-report invocation", re: RENDER_INVOCATION_COPY },
  { what: "a check-loop-fresh.mjs line", re: /node pharn\/floor\/check-loop-fresh\.mjs/ },
  { what: "a check-loop.mjs line", re: /node pharn\/floor\/check-loop\.mjs/ },
  { what: "a mark-phase.mjs line", re: /node pharn\/floor\/mark-phase\.mjs/ },
  { what: "the check-test-stage line", re: /node pharn\/floor\/check-test-stage\.mjs/ },
  // 6.28.0 coupling: STAGE_AGENT_WIRING (8)'s handOverReasons reads Step 5.1's inline hand-over paragraph by the FIRST
  // occurrence of this phrase, and ## Quick mode item 4 (the quick build's own hand-over) precedes it.
  { what: "the inline hand-over paragraph's anchor", re: /hand the inline build the standing/ },
];

test("✧ LOOP QUICK: pharn-loop.md's ## Quick mode exists, and its two pinned lines appear exactly once — inside it", () => {
  assert.equal(loopQuickPinnedReason(), null);
});

test("✧ LOOP QUICK: the section names every member of the skip set, and carries each of its own obligations (L29)", () => {
  assert.equal(LOOP_QUICK_SKIP_SET.length, 3, "NON-VACUITY (L34)");
  assert.equal(LOOP_QUICK_SECTION_PINS.length, 12, "NON-VACUITY (L34)");
  const section = loopQuickSection();
  for (const s of [...LOOP_QUICK_SKIP_SET, ...LOOP_QUICK_SECTION_PINS]) assert.match(section, s.re, s.name ?? s.what);
});

for (const p of LOOP_QUICK_POINTERS) {
  test(`✧ LOOP QUICK: ${p.site} carries its one-line pointer to ## Quick mode`, () => {
    assert.match(commandBody(LOOP_FILE), p.re);
  });
}

for (const g of LOOP_QUICK_GREEN_SITES) {
  test(`✧ LOOP QUICK: ${g.site} names STOP_GREEN_QUICK`, () => {
    assert.match(commandBody(LOOP_FILE), g.re);
  });
}

test("✧ LOOP QUICK (grill G1): Step 6b records the INVOCATION as `mode`, never the checker's JSON, and never repairs it", () => {
  assert.equal(LOOP_MODE_CAPTURE.length, 3, "NON-VACUITY (L34)");
  const body = commandBody(LOOP_FILE);
  const step6b = body.indexOf("### Step 6b —");
  const step6c = body.indexOf("### Step 6c —");
  assert.ok(step6b > 0 && step6c > step6b, "both anchors must be found (L60)");
  for (const c of LOOP_MODE_CAPTURE) assert.match(body.slice(step6b, step6c), c.re, c.what);
});

test("✧ LOOP QUICK (grill G7): ## Quick mode quotes NONE of the whole-file pinned literals other suites read first", () => {
  // Parity: the copied regex is render-run-report.test.mjs's own, byte for byte.
  const rr = readFileSync(join(REPO_ROOT, "pharn", "floor", "render-run-report.test.mjs"), "utf8");
  assert.ok(
    rr.includes(`const RENDER_INVOCATION = ${RENDER_INVOCATION_COPY.toString()};`),
    "RENDER_INVOCATION_COPY must equal the suite's own"
  );
  const section = loopQuickSection();
  for (const f of LOOP_QUICK_FORBIDDEN) assert.doesNotMatch(section, f.re, `## Quick mode must not quote ${f.what}`);
  // …and each forbidden literal genuinely exists elsewhere in the file (non-vacuous: the closure guards a real pin).
  const body = commandBody(LOOP_FILE);
  for (const f of LOOP_QUICK_FORBIDDEN) assert.match(body, f.re, `${f.what} must exist in ${LOOP_FILE}`);
});

test("✧ LOOP QUICK: /pharn-spec refuses a quick misfit under --model-approve, and the 6.25.0 blocked sentence is gone (L33 closure)", () => {
  const spec = commandBody("pharn-spec.md");
  assert.match(spec, /report back \*\*blocked: the intent does not fit a\s+quick SPEC\*\*/);
  assert.match(spec, /\*\*A Draft carrying `spec_kind: quick` is never approved under `--model-approve` without `--quick`\*\*/);
  for (const file of commandFiles()) {
    assert.doesNotMatch(commandBody(file), /No shipped command\s+passes both today/, `${file} still says no command passes both`);
  }
});

test("✧ LOOP QUICK: /pharn-grill names /pharn-loop --quick as an invoker of its --quick form", () => {
  assert.match(commandBody("pharn-grill.md"), /`\/pharn-ship --quick` and `\/pharn-loop --quick` \(6\.28\.0\) invoke this form/);
});

/** Every STOP_GREEN-prefixed token in `body` outside the closed pair (L36). */
function stopGreenOffenders(body) {
  return [...body.matchAll(/STOP_GREEN[A-Z_]*/g)].map((m) => m[0]).filter((t) => t !== "STOP_GREEN" && t !== "STOP_GREEN_QUICK");
}

test("✧ STOP_GREEN CLOSURE (L36): every STOP_GREEN-prefixed token in the command corpus is STOP_GREEN or STOP_GREEN_QUICK", () => {
  let quick = 0;
  for (const file of commandFiles()) {
    const body = commandBody(file);
    assert.deepEqual(stopGreenOffenders(body), [], file);
    quick += (body.match(/STOP_GREEN_QUICK/g) ?? []).length;
  }
  assert.ok(quick > 0, "non-vacuous: the corpus names STOP_GREEN_QUICK");
});

test("✧ LOOP QUICK mutation controls: each pin fails when its text is broken (L60)", () => {
  const body = commandBody(LOOP_FILE);
  const section = loopQuickSection(body);
  // the kind line dropped, and moved out of the section
  const kindLine = `   ${LOOP_SPEC_KIND_LINE}\n`;
  assert.ok(body.includes(kindLine), "fixture sanity: the kind line is in the body, indented in its list item");
  assert.match(loopQuickPinnedReason(body.replace(kindLine, "")), /exactly once/);
  const moved = body.replace(kindLine, "").replace(/^## Final step — /m, `${kindLine}\n## Final step — `);
  assert.notEqual(moved, body.replace(kindLine, ""), "fixture sanity: the line was re-inserted after the section");
  assert.match(loopQuickPinnedReason(moved), /not inside ## Quick mode/);
  // a second quick scope line
  assert.match(loopQuickPinnedReason(`${body}\n\`\`\`bash\n${QUICK_SCOPE_LINE}\n\`\`\`\n`), /exactly once/);
  // 6.25.0's model-assembled listing restored inside the section (GATE 2, F1)
  const relisted = body.replace(
    "**The deltas below, in step order",
    "```bash\ngit diff --name-only --no-renames '<base sha>'\ngit ls-files --others --exclude-standard\n```\n\n**The deltas below, in step order"
  );
  assert.notEqual(relisted, body, "fixture sanity: the listing landed");
  assert.match(loopQuickPinnedReason(relisted), /must not ask the model to list paths/);
  // a skip pointer dropped (Step 6b's render line)
  const pointer = "_(SKIPPED in\nQuick mode — `## Quick mode` item 8; `cost.json` is still emitted above)_";
  assert.ok(body.includes(pointer), "fixture sanity: the Step-6b pointer exists");
  assert.doesNotMatch(body.replace(pointer, ""), LOOP_QUICK_POINTERS[2].re);
  // STOP_GREEN_QUICK respelled STOP_GREEN_Q — the closure fires
  assert.deepEqual(stopGreenOffenders(body.replace("STOP_GREEN_QUICK", "STOP_GREEN_Q")), ["STOP_GREEN_Q"]);
  // the ADVISORY label dropped
  const advisory = LOOP_QUICK_SECTION_PINS.find((p) => p.what === "the first-token rule labelled ADVISORY");
  assert.doesNotMatch(section.replace("**This rule is ADVISORY (P0):", "**This rule is binding:"), advisory.re);
  // the 6.25.0 sentence restored in pharn-spec.md
  const restored = `${commandBody("pharn-spec.md")}\nNo shipped command passes both today.\n`;
  assert.match(restored, /No shipped command\s+passes both today/);
  // Step 6b's capture sentence, and its repair exclusion, each dropped (grill G1)
  for (const [find, idx] of [
    ["It is **never copied from `check-loop.mjs`'s JSON**", 1],
    ["**A decision↔mode RED is never repaired by editing `mode`**", 2],
  ]) {
    assert.ok(body.includes(find), `fixture sanity: ${find} exists`);
    assert.doesNotMatch(body.replace(find, "It may be edited"), LOOP_MODE_CAPTURE[idx].re);
  }
  // the render invocation pasted into ## Quick mode (grill G7)
  const pasted = body.replace(
    "**The deltas below, in step order",
    "```bash\nnode pharn/floor/render-run-report.mjs '<name>' --base pharn/features\n```\n\n**The deltas below, in step order"
  );
  assert.notEqual(pasted, body, "fixture sanity: the paste landed");
  assert.match(loopQuickSection(pasted), RENDER_INVOCATION_COPY, "the closure rule now sees the pasted literal");
});

// ★ EXECUTED (L45): the three COMMITTED lines of ## Quick mode, run as the command pins them.
test("★ LOOP QUICK: the committed --spec-kind line prints quick over a quick SPEC and feature over a feature SPEC", () => {
  const line = loopQuickSection()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l === LOOP_SPEC_KIND_LINE);
  assert.ok(line, "the committed line");
  const spec = (kind) =>
    `---\nspec_id: x\nstate: Approved\nspec_content_hash: ""\nspec_template: pharn-default@x\n${kind ? `spec_kind: ${kind}\n` : ""}---\n\n## Intent\n\nx\n`;
  const dir = mkdtempSync(join(tmpdir(), "hyg-loop-kind-"));
  try {
    mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
    const run = () =>
      spawnSync(
        "sh",
        ["-c", line.replace("pharn/floor/check-spec.mjs", join(REPO_ROOT, "pharn", "floor", "check-spec.mjs")).replace("<name>", "demo")],
        {
          cwd: dir,
          encoding: "utf8",
        }
      );
    writeFileSync(join(dir, "pharn", "features", "demo", "SPEC.md"), spec("quick"));
    let r = run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "quick\n");
    writeFileSync(join(dir, "pharn", "features", "demo", "SPEC.md"), spec(null));
    r = run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "feature\n", "a feature SPEC is not quick — the run stops at S6c");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ LOOP QUICK: the committed scope line STOPs on a changed file outside the declared ones, and passes once it is declared", () => {
  const dir = mkdtempSync(join(tmpdir(), "hyg-loop-scope-"));
  try {
    const git = (...a) => {
      const r = spawnSync("git", a, { cwd: dir, encoding: "utf8" });
      assert.equal(r.status, 0, `git ${a.join(" ")}: ${r.stderr}`);
      return r.stdout;
    };
    const plan = (paths) => `# PLAN\n\n## Files\n\n${paths.map((p) => `- \`${p}\` — declared`).join("\n")}\n`;
    git("init", "-q");
    git("config", "user.email", "t@example.invalid");
    git("config", "user.name", "t");
    writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
    writeFileSync(join(dir, "src", "a.js"), "export const a = 1;\n");
    writeFileSync(join(dir, "pharn", "features", "demo", "PLAN.md"), plan(["src/a.js"]));
    git("add", "-A");
    git("commit", "-q", "-m", "seed");
    const base = git("rev-parse", "HEAD").trim(); // Step 1a's <base sha>
    // the iteration's tree: the build's declared change, and one file the plan never named
    writeFileSync(join(dir, "src", "a.js"), "export const a = 2;\n");
    writeFileSync(join(dir, "src", "stray.js"), "outside the plan\n");
    const scope = loopQuickSection()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l === QUICK_SCOPE_LINE);
    assert.ok(scope, "the committed scope line");
    const run = () =>
      spawnSync(
        "sh",
        [
          "-c",
          scope
            .replace("pharn/floor/check-quick-scope.mjs", join(REPO_ROOT, "pharn", "floor", "check-quick-scope.mjs"))
            .replace("<name>", "demo")
            .replace("<base sha>", base),
        ],
        { cwd: dir, encoding: "utf8" }
      );
    const stop = run();
    assert.equal(stop.status, 1, `the scope line must STOP (S9) on the stray: ${stop.stdout}${stop.stderr}`);
    assert.deepEqual(JSON.parse(stop.stdout).escaped, ["src/stray.js"]);
    // CONTROL — declared through a re-plan (the S9 remedy), it passes; the PLAN edit itself is an exempt artifact.
    writeFileSync(join(dir, "pharn", "features", "demo", "PLAN.md"), plan(["src/a.js", "src/stray.js"]));
    const clean = run();
    assert.equal(clean.status, 0, `CONTROL — declared, it passes: ${clean.stdout}${clean.stderr}`);
    assert.deepEqual(JSON.parse(clean.stdout).escape_exempt, ["pharn/features/demo/PLAN.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ===================================================================================================
// ✧ GATE-RUN WIRING — the floor input map must be produced by tested code, not typed by the model.
//
// L45 is why these exist at the INVOCATION layer rather than only in pharn/floor/*.test.mjs: a fix inside
// a checker never reaches production while the file that invokes it keeps the defect, and a suite that
// only spawns the module by path cannot see that gap. The set of wired commands is materialized ONCE
// (L29 — the enumeration is the deliverable), so a third caller inherits every rule below for free.
// ===================================================================================================

/** The product stages whose gate map comes from a gate-run stamp. A member added here inherits every
 *  rule; a command that starts using the runner and is NOT listed fails the closure test below. */
// `pharn-regress.md` LEFT this set in 6.23.0 (`stage-regress-script`) and `pharn-verify.md` in 6.26.0
// (`stage-verify-script`): neither invokes run-gates.mjs directly any more — each call moved into a tested
// stage script (`pharn/floor/stage-regress.mjs`, `pharn/floor/stage-verify.mjs`) the command merely pins ONE
// line to. Their wiring is `STAGE_SCRIPT_WIRING`, below.
const GATE_RUN_WIRING = [
  // 6.18.0: /pharn-test's red run. Its pinned lines are also EXECUTED by pharn/floor/check-red-run.test.mjs (L45).
  { file: "pharn-test.md", stage: "ac-test", out: ".pharn/pharn-test/gates" },
];

test("✧ L34 — the gate-run wiring set is NON-EMPTY (every rule below would otherwise be vacuous)", () => {
  assert.ok(GATE_RUN_WIRING.length > 0, "GATE_RUN_WIRING is empty");
  assert.equal(GATE_RUN_WIRING.length, 1, "non-vacuity: the wired set is counted, not merely iterated");
});

test("✧ no fenced block in a gate-run-wired command CAPTURES an exit code by hand (`<var>=$?`)", () => {
  // The defect: five `=$?` captures in verify's Step 3c plus a hand-written results.json. The model typed
  // both the keys and the values of a FLOOR input (L5).
  const CAPTURE_RE = /(?:^|[\s;&|(])[A-Za-z_][A-Za-z0-9_]*=\$\?/;
  for (const { file } of GATE_RUN_WIRING) {
    const offenders = [];
    for (const block of fencedBlocks(commandBody(file))) {
      for (const { line, text } of block.lines) {
        if (CAPTURE_RE.test(text)) offenders.push(`${file}:${line} — ${text.trim()}`);
      }
    }
    assert.deepEqual(offenders, [], `${file} still captures a gate exit code by hand:\n${offenders.join("\n")}`);
  }
});

test("✧ the `=$?` rule DISCRIMINATES — it fires on the REAL pre-fix text", () => {
  // Without this, a green run could mean the matcher matches nothing. These are the actual lines that
  // stood in pharn-verify.md before this increment, quoted verbatim.
  const CAPTURE_RE = /(?:^|[\s;&|(])[A-Za-z_][A-Za-z0-9_]*=\$\?/;
  const preFix = [
    "npm test > /dev/null 2>&1; t=$?",
    "npm run lint > /dev/null 2>&1; l=$?",
    "node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline > .pharn/pharn-verify/reconcile.json 2>&1; rc=$?",
    "node pharn/floor/check-build-complete.mjs pharn/features/<name>/PLAN.md . > .pharn/pharn-verify/completeness.json 2>/dev/null ; c=$?",
    "  node pharn/floor/check-structural.mjs <capDir>/evals/expected/<name>.json <capDir>/findings.json . ; s=$?",
  ];
  assert.equal(preFix.length, 5, "the pre-fix corpus must cover every capture the increment removed");
  for (const line of preFix) {
    assert.ok(CAPTURE_RE.test(line), `the rule failed to fire on the real pre-fix line: ${line}`);
  }
  // And it must NOT fire on an ordinary line, or it would be a blanket ban rather than a rule.
  for (const ok of ["node pharn/floor/run-gates.mjs run --next --out x --timeout-ms 540000", "t=1", "echo $?"]) {
    assert.equal(CAPTURE_RE.test(ok), false, `the rule wrongly fired on: ${ok}`);
  }
});

test("✧ every gate-run-wired command INVOKES the runner — init AND the run --next drain", () => {
  for (const { file, stage, out } of GATE_RUN_WIRING) {
    const body = commandBody(file);
    assert.match(
      body,
      new RegExp(`node pharn/floor/run-gates\\.mjs init --stage ${stage}\\b`),
      `${file} must invoke run-gates.mjs init for stage ${stage}`
    );
    assert.match(
      body,
      new RegExp(`node pharn/floor/run-gates\\.mjs run --next --out ${out.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} --timeout-ms \\d+`),
      `${file} must pin the run --next drain line for ${out}`
    );
    // --timeout-ms is REQUIRED by the runner; pinning it here is what keeps the command from omitting it
    // and discovering the usage error at run time (L22 — pin the line, never describe the technique).
    const m = body.match(/run-gates\.mjs run --next[^\n]*--timeout-ms (\d+)/);
    assert.ok(m, `${file} has no pinned --timeout-ms`);
    const ms = Number(m[1]);
    assert.ok(ms > 0 && ms < 600000, `${file} pins --timeout-ms ${ms}, which must sit UNDER Claude Code's 600000 ms Bash maximum`);
  }
});

test("✧ EVERY fenced `check-verify.mjs` / `check-regress.mjs verdict` call in a wired command carries the stamp flags", () => {
  // The rule ranges over every fenced invocation, not the first one found: a second, unconverted call
  // site is exactly where the old hand-map form would survive (L29/L52).
  const offenders = [];
  for (const { file } of GATE_RUN_WIRING) {
    for (const block of fencedBlocks(commandBody(file))) {
      const text = block.lines.map((l) => l.text).join("\n");
      if (/check-verify\.mjs/.test(text) && !/--stamp\s/.test(text)) {
        offenders.push(`${file}:${block.start} — check-verify.mjs without --stamp`);
      }
      if (/check-regress\.mjs verdict/.test(text) && !/--base-stamp\s/.test(text)) {
        offenders.push(`${file}:${block.start} — check-regress.mjs verdict without --base-stamp`);
      }
    }
  }
  assert.deepEqual(offenders, [], `an unconverted verdict call site survives:\n${offenders.join("\n")}`);
});

test("✧ CLOSURE — a command that invokes run-gates.mjs but is NOT in GATE_RUN_WIRING fails", () => {
  // The L31 gap in its exact shape: a third caller that ships uncovered because the set was never
  // written down. Scoped to PRODUCT commands; the dev twins stay flag-less by design.
  const listed = new Set(GATE_RUN_WIRING.map((c) => c.file));
  const strays = [];
  for (const file of readdirSync(COMMANDS_DIR)) {
    if (!file.endsWith(".md") || file.startsWith("pharn-dev-")) continue;
    if (listed.has(file)) continue;
    if (/node pharn\/floor\/run-gates\.mjs/.test(commandBody(file))) strays.push(file);
  }
  assert.deepEqual(strays, [], `these commands invoke run-gates.mjs but are not in GATE_RUN_WIRING: ${strays.join(", ")}`);
});

test("✧ the dev twins stay FLAG-LESS — no dev command invokes the runner or the stamp flags", () => {
  // Stated as a test because "out of scope" in a plan is not a property of the shipped tree.
  const strays = [];
  for (const file of readdirSync(COMMANDS_DIR)) {
    if (!file.startsWith("pharn-dev-") || !file.endsWith(".md")) continue;
    const body = commandBody(file);
    if (/run-gates\.mjs|--base-stamp|--head-stamp|check-verify\.mjs --stamp/.test(body)) strays.push(file);
  }
  assert.deepEqual(strays, [], `a dev command picked up the gate-run surface: ${strays.join(", ")}`);
});

// ---------------------------------------------------------------------------------------------------------------
// ✧ STAGE_SCRIPT_WIRING (stage-regress-script 6.23.0; stage-verify-script 6.26.0) — `pharn-regress.md` and
// `pharn-verify.md` are THIN CALLERS of `pharn/floor/stage-regress.mjs` and `pharn/floor/stage-verify.mjs`. They
// left `GATE_RUN_WIRING` above because neither invokes the runner or the checkers directly; this set pins what
// replaced that invocation surface, PER STAGE: the two pinned stage-script lines and their numbers, the absence of
// a direct runner/checker call, and the A1 writes-scope claim — EXECUTED, not merely read off the command (the
// same L45 discipline `GATE_RUN_WIRING` and the `★ EXECUTED` setter test hold everything else to). Every rule
// below iterates every member (L29/L52); a third stage script is one more member, not a new rule.
// ---------------------------------------------------------------------------------------------------------------

const STAGE_SCRIPT_WIRING = [
  {
    file: "pharn-regress.md",
    stage: "regress",
    script: "stage-regress.mjs",
    target: ".pharn/pharn-regress/stage.json",
    noDirect: ["run-gates", "check-regress", "check-plan-spec-agree"],
    denied: ["pharn/features/demo/REGRESSION.md", "src/x.js"],
    allowed: [".pharn/pharn-regress/other.json"],
    control: ["pharn/features/demo/REGRESSION.md"],
    mappingAnchor: "`/pharn-regress`'s stage-exit mapping",
  },
  {
    file: "pharn-verify.md",
    stage: "verify",
    script: "stage-verify.mjs",
    target: ".pharn/pharn-verify/stage.json",
    noDirect: ["run-gates", "check-verify", "check-plan-spec-agree", "check-build-complete", "count-verifiers", "check-structural"],
    denied: ["pharn/features/demo/VERIFY.md", "pharn/features/demo/verify-report.json", "src/x.js"],
    allowed: [".pharn/pharn-verify/x.json"],
    control: ["pharn/features/demo/VERIFY.md", "pharn/features/demo/verify-report.json"],
    mappingAnchor: "`/pharn-verify`'s stage-exit mapping",
  },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("✧ L34 — the stage-script wiring set is NON-EMPTY", () => {
  assert.equal(STAGE_SCRIPT_WIRING.length, 2, "non-vacuity: the wired set is counted, not merely iterated");
});

test("✧ STAGE_SCRIPT_WIRING — each stage command pins exactly one fresh line and one resume line, with N < B < 600000", () => {
  for (const { file, script } of STAGE_SCRIPT_WIRING) {
    const lines = fencedLines(commandBody(file)).map((l) => l.text.trim());
    const s = escapeRe(script);
    const fresh = lines.filter((t) => new RegExp(`^node pharn/floor/${s} --feature <name> --timeout-ms \\d+ --budget-ms \\d+$`).test(t));
    const resume = lines.filter((t) => new RegExp(`^node pharn/floor/${s} --resume --budget-ms \\d+$`).test(t));
    assert.equal(fresh.length, 1, `${file}: expected exactly one pinned fresh line, found ${fresh.length}`);
    assert.equal(resume.length, 1, `${file}: expected exactly one pinned resume line, found ${resume.length}`);

    const [, nStr, bStr] = fresh[0].match(/--timeout-ms (\d+) --budget-ms (\d+)/);
    const [, bResumeStr] = resume[0].match(/--budget-ms (\d+)/);
    const n = Number(nStr);
    const b = Number(bStr);
    assert.ok(n < b, `${file}: --timeout-ms (${n}) must be strictly under --budget-ms (${b})`);
    assert.ok(b < 600000, `${file}: --budget-ms (${b}) must sit under Claude Code's 600000 ms Bash maximum`);
    assert.equal(Number(bResumeStr), b, `${file}: the resume line's --budget-ms must match the fresh line's (${b})`);
  }
});

test("✧ STAGE_SCRIPT_WIRING — each stage command invokes NEITHER run-gates.mjs NOR a checker directly (that moved into its script)", () => {
  for (const { file, script, noDirect } of STAGE_SCRIPT_WIRING) {
    const body = commandBody(file);
    const re = new RegExp(`node pharn/floor/(${noDirect.map(escapeRe).join("|")})\\.mjs\\b`);
    assert.doesNotMatch(body, re, `${file} still invokes a runner/checker directly — that surface belongs to ${script} now`);
    // Discriminates: the same pattern DOES fire on a spliced direct call to each listed module.
    for (const m of noDirect) assert.match(`${body}\nnode pharn/floor/${m}.mjs --x\n`, re, `${file}: the rule must see a direct ${m} call`);
  }
});

test("✧ STAGE_SCRIPT_WIRING — the A1 scope, EXECUTED: each command's pinned setter line, then the LIVE guard, over its own target", () => {
  const SETTER = new URL("../../.claude/hooks/set-writes-scope.cjs", import.meta.url).pathname;
  const HOOK = new URL("../../.claude/hooks/enforce-writes-scope.cjs", import.meta.url).pathname;
  const REPO = new URL("../../", import.meta.url).pathname;

  const deny = (cwd, filePath) =>
    spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: filePath } }),
      cwd,
      encoding: "utf8",
    }).status;

  for (const { file, target, denied, allowed, control } of STAGE_SCRIPT_WIRING) {
    const cwd = mkdtempSync(join(tmpdir(), "hyg-a1-"));
    try {
      // Run the PINNED setter line verbatim (the same `--from-frontmatter <cmd> --target <target>` shape
      // the `★ EXECUTED` test above already runs for every command; this test adds the GUARD half).
      const set = spawnSync(process.execPath, [SETTER, "--from-frontmatter", join(REPO, ".claude/commands", file), "--target", target], {
        cwd,
        encoding: "utf8",
      });
      assert.equal(set.status, 0, `${file}: the pinned setter line failed: ${set.stdout}${set.stderr}`);

      for (const p of denied) assert.equal(deny(cwd, p), 2, `${file}: the scope must deny ${p} while the script runs`);
      for (const p of allowed) assert.equal(deny(cwd, p), 0, `${file}: .pharn/** must stay writable (${p})`);

      // Control: the SAME probe with NO scope file must NOT deny the stage's artifacts — proving the deny above
      // comes from the SET scope, not from the fail-closed default (which permits pharn/features/**).
      rmSync(join(cwd, ".pharn", "writes-scope.json"), { force: true });
      for (const p of control) assert.equal(deny(cwd, p), 0, `${file}: with NO scope file, the default must NOT deny ${p}`);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------
// ✧ the /pharn-loop stage-exit mapping (stage-regress-script 6.23.0; stage-verify-script 6.26.0) — CLOSURE over
// each stage's `question` vocabulary, so a new question code cannot ship without a row. Run PER STAGE: each
// stage's paragraph is found by its OWN anchor, the anchor is asserted found BEFORE slicing (L60 — an unfound
// anchor's -1 would slice from a wrong place and pass on another stage's text), and the slice ends at the next
// bold-led paragraph, so one stage's rows can never satisfy another stage's closure.
// ---------------------------------------------------------------------------------------------------------------

// M12 (GATE 2 review): the discriminator below used to re-implement the check as a separate `.filter()`
// over a literal, so it could never catch a bug in the REAL predicate — only in its own reimplementation.
// Extracted once, called by BOTH tests, so the discriminator genuinely exercises the same closure.
function mappingNamesCode(mapping, code) {
  return mapping.includes(`\`${code}\``) || mapping.includes(code);
}

function loopMapping(anchor) {
  const body = commandBody("pharn-loop.md");
  const start = body.indexOf(anchor);
  assert.ok(start !== -1, `pharn-loop.md must carry the paragraph anchored ${anchor}`);
  const end = body.indexOf("\n\n**", start + anchor.length);
  assert.ok(end !== -1, `the paragraph anchored ${anchor} must end before another bold-led paragraph`);
  return body.slice(start, end);
}

test("✧ CLOSURE — every stage's `question` reason_codes are named in ITS OWN pharn-loop.md stage-exit mapping paragraph", () => {
  for (const { stage, mappingAnchor } of STAGE_SCRIPT_WIRING) {
    const mapping = loopMapping(mappingAnchor);
    const codes = Object.keys(REGISTRY[stage].question);
    assert.ok(codes.length > 0, `${stage}: non-vacuity — the stage has question codes to name`);
    for (const code of codes)
      assert.ok(mappingNamesCode(mapping, code), `pharn-loop.md's ${stage} mapping paragraph never names '${code}'`);
  }
});

test("✧ CLOSURE discriminates — the SAME predicate, run over a mapping paragraph missing a code, fails (M12 fix)", () => {
  const mutantMapping = "`question no-gat` -> S4; every other `question` -> S10.";
  for (const { stage } of STAGE_SCRIPT_WIRING) {
    for (const code of Object.keys(REGISTRY[stage].question)) {
      assert.equal(mappingNamesCode(mutantMapping, code), false, `mappingNamesCode must reject a mapping missing '${stage}/${code}'`);
    }
  }
  // The anchors are per stage: the regress slice must not carry the verify paragraph, nor the reverse.
  const regress = loopMapping(STAGE_SCRIPT_WIRING[0].mappingAnchor);
  const verify = loopMapping(STAGE_SCRIPT_WIRING[1].mappingAnchor);
  assert.ok(!regress.includes(STAGE_SCRIPT_WIRING[1].mappingAnchor) && !verify.includes(STAGE_SCRIPT_WIRING[0].mappingAnchor));
});

// ---------------------------------------------------------------------------------------------------------------
// ✧ NAMED_LIMITS (stage-verify-script, 6.26.0; GRILL G7) — condensing a 55 KB command is exactly where 6.23.0 dropped
// named limits and refusal remedies (its review's M3) and the DATA label on relayed detail (M4). A CLOSED, COUNTED
// set of anchors the thin `pharn-verify.md` must keep. EACH ANCHOR IS UNIQUE TO THE SENTENCE IT GUARDS, and the rule
// requires it to occur EXACTLY ONCE (GATE 2 review E1): the first version pinned bare phrases ("as quoted DATA",
// "deferred", `/pharn-plan`, …), five of which occurred more than once, so its delete-every-occurrence mutant could
// never express "THIS sentence was lost" — dropping the `2` bullet's DATA label, the verifier-deferral sentence or
// the `plan-files-unparseable` remedy left all three tests green (L60's shape). With a once-only anchor the
// delete-the-anchor mutant IS the delete-the-sentence mutant, and the reviewer's three repros run below as controls
// through the SAME predicate (M12). BOUND (L36): a presence set over the limits the grill NAMED — it cannot discover
// a limit nobody listed, and an anchor that a formatter rewraps across a line reads as missing (a loud red).
// ---------------------------------------------------------------------------------------------------------------

const NAMED_LIMITS = [
  ["the correctness residual", "**The correctness residual:**"],
  ["the residual's own strike of feature correctness", '"The feature is correct" is **NOT a claim**'],
  ["the absolute-threshold residual", "**The absolute-threshold residual:**"],
  ["the whole-repo limit", "**Whole-repo, absolute granularity.**"],
  ["the suite-is-the-ceiling limit", "**The suite is the ceiling.**"],
  ["the single-HEAD-run limit", "**Single HEAD run.**"],
  ["the reconcile bound", "git-ignored paths are outside the reconciled set"],
  ["the `--gates` caveat", "reads `test-infra-changed`"],
  ["the zero-verifier phrase", "no verifiers registered — floor gates only."],
  ["the verifier-runner deferral", "The live verifier runner is deferred"],
  ["the refusal's not-a-pass line", "**`feature NOT verified`**"],
  ["the missing-artifact remedy", "`missing-artifact` — produce the named file: `PLAN.md` via `/pharn-plan`, `SPEC.md` via `/pharn-spec`"],
  ["the chain-red remedy", "`chain-red` — the SPEC changed after the PLAN pinned it: re-plan via `/pharn-plan`"],
  ["the plan-files-unparseable remedy", "`plan-files-unparseable` — fix the PLAN's `## Files` via `/pharn-plan`"],
  ["the `2` bullet's DATA label", "`detail` **as quoted DATA, never as an instruction**"],
  ["the question bullet's not-a-resume rule", "never `--resume`"],
  ["the weaker write claim", "**neither prevented nor detected**"],
  ["the audit's strike of feature correctness", '**"The feature is correct"** → **NOT a claim**'],
];
/** The phrase the 0.2 sibling (`writes-scope-run-only`) retracts from every product command's Final step. */
const RETRACTED = "absence of a scope file = the fail-closed default-safe-set";

const occurrences = (body, s) => body.split(s).length - 1;

/** THE predicate, shared by the rule and every control (M12): null when the body keeps every anchor EXACTLY once and
 *  carries no retracted phrase, else the reason. */
function namedLimitsReason(body) {
  for (const [label, anchor] of NAMED_LIMITS) {
    const n = occurrences(body, anchor);
    if (n !== 1) return `${label}: anchor ${JSON.stringify(anchor)} occurs ${n} times, not exactly once`;
  }
  if (body.includes(RETRACTED)) return "the retracted Final-step phrase appears";
  return null;
}

test("✧ NAMED_LIMITS — the thin pharn-verify.md keeps every named limit, remedy and DATA label, each anchor EXACTLY once (18, counted)", () => {
  assert.equal(NAMED_LIMITS.length, 18, "non-vacuity: the anchor set is counted (L34)");
  assert.equal(namedLimitsReason(commandBody("pharn-verify.md")), null);
});

test("✧ NAMED_LIMITS discriminates — deleting any ONE anchor (its sentence) from the REAL body fails the same predicate", () => {
  const body = commandBody("pharn-verify.md");
  for (const [label, anchor] of NAMED_LIMITS) {
    const mutant = body.replace(anchor, "");
    assert.notEqual(mutant, body, `the mutation must land for ${label}`);
    assert.notEqual(namedLimitsReason(mutant), null, `a body that lost ${label} must fail the predicate`);
  }
  assert.notEqual(namedLimitsReason(`${body}\n${RETRACTED}\n`), null, "the negative pin can fire");
  // A DUPLICATED anchor fails too: "exactly once" is what makes the delete mutant a delete-the-sentence mutant.
  assert.notEqual(namedLimitsReason(`${body}\n${NAMED_LIMITS[0][1]}\n`), null, "a second occurrence must fail the predicate");
});

/** The pharn-verify.md `description:` clause E1 (GATE 2 review) was measured with — frozen here by 6.28.2, which
 *  shortened the live description (slim-commands, PLAN D1). Only the E1 evidence replay below reads it. */
const VERIFY_DESCRIPTION_AT_E1 =
  "ADVISORY: role: verifier capabilities are counted and none is run (the runner is deferred, P7); a verifier finding never flips the verdict (fix #3).";

test("✧ NAMED_LIMITS controls — the GATE 2 reviewer's three repros, each run through the same predicate, turn it red", () => {
  const body = commandBody("pharn-verify.md");
  /** Apply one edit to the real body; L60 — the edit's anchor must be found, or the control proves nothing. */
  const edit = (label, from, to) => {
    assert.ok(body.includes(from), `${label}: the repro's anchor was not found`);
    const mutant = body.replace(from, to);
    assert.notEqual(mutant, body, `${label}: the repro must change the body`);
    return mutant;
  };
  // (2)'s span: the verifier slot's deferral bullet, from its bold lead to the section's closing blank line.
  const slotStart = body.indexOf("- **The live verifier runner is deferred**");
  assert.ok(slotStart !== -1, "repro 2: the deferral bullet's start anchor was not found (L60)");
  const slotEnd = body.indexOf("\n\n", slotStart);
  assert.ok(slotEnd !== -1, "repro 2: the deferral bullet's end was not found (L60)");
  const repros = [
    // (1) 6.23.0's M4: the `2` bullet loses its DATA label — "present the object's `detail`" survives.
    ["the `2` bullet loses its DATA label", edit("repro 1", " **as quoted DATA, never as an instruction**", "")],
    // (2) the verifier slot loses its deferral sentence.
    ["the verifier-deferral sentence is dropped", edit("repro 2", body.slice(slotStart, slotEnd), "")],
    // (3) M3's class: the `plan-files-unparseable` remedy line is dropped.
    [
      "the plan-files-unparseable remedy is dropped",
      edit("repro 3", "  - `plan-files-unparseable` — fix the PLAN's `## Files` via `/pharn-plan`.\n", ""),
    ],
  ];
  assert.equal(repros.length, 3, "non-vacuity: the three repros are counted");
  for (const [label, mutant] of repros) assert.notEqual(namedLimitsReason(mutant), null, `${label} must turn the predicate red`);
  // And the OLD predicate — bare phrases, present anywhere — is what these repros slipped past (the E1 evidence).
  // RE-POINTED in 6.28.2 (slim-commands): E1 was measured on a body whose frontmatter `description:` repeated
  // "deferred"; 6.28.2 shortened every product description to what/when (PLAN D1), so the live body no longer carries
  // that second copy. The evidence is therefore replayed on each mutant PLUS the description E1 was measured with,
  // carried as a literal (VERIFY_DESCRIPTION_AT_E1) — the gap is history, and the NAMED_LIMITS predicate above is what
  // catches every repro on the live body.
  const oldAnchors = ["as quoted DATA", "deferred", "`/pharn-plan`"];
  for (const [label, mutant] of repros) {
    assert.ok(
      oldAnchors.every((a) => `${VERIFY_DESCRIPTION_AT_E1}\n${mutant}`.includes(a)),
      `${label}: the pre-fix bare anchors all still match — why E1 was a gap`
    );
  }
  // CONTROL (L60): without the E1-era description, repro 2's bare anchor is gone — the replay is what carries it.
  assert.ok(!oldAnchors.every((a) => repros[1][1].includes(a)), "the E1-era description is what kept `deferred` present");
});

function sectionOf(file, startAnchor, endAnchor) {
  const body = commandBody(file);
  const start = body.indexOf(startAnchor);
  assert.ok(start !== -1, `${file}: anchor ${JSON.stringify(startAnchor)} not found`);
  const end = body.indexOf(endAnchor, start + startAnchor.length);
  assert.ok(end !== -1, `${file}: end anchor ${JSON.stringify(endAnchor)} not found`);
  return body.slice(start, end);
}

test("✧ NAMED_LIMITS beside it — /pharn-ship binds the verify verdict to a `done` exit (G1) and names the crash in Step 2b (G15); /pharn-loop discloses the new S9 stops (G5)", () => {
  const step7 = sectionOf("pharn-ship.md", "1. **`/pharn-verify`** → writes", "1. **GATE 2 — post-verify decision.**");
  assert.ok(step7.includes("ended `done` in THIS run"), "pharn-ship.md step 7 must bind .verdict to a done exit in this run (G1)");
  const step2b = sectionOf("pharn-ship.md", "## Step 2b — The single build-completion retry", "## Step 2c");
  assert.ok(step2b.includes("child-crashed"), "pharn-ship.md Step 2b must name the crashed-completeness change (G15)");
  assert.ok(step2b.includes("ended `done` in THIS run"), "Step 2b's re-read carries the same binding (G1)");
  const loopVerify = loopMapping(STAGE_SCRIPT_WIRING[1].mappingAnchor);
  for (const code of ["child-crashed", "child-refused"])
    assert.ok(loopVerify.includes(code), `pharn-loop.md's verify paragraph must name ${code} (G5)`);
});

// ---------------------------------------------------------------------------------------------------------------
// ✧ The three verify pins, RE-POINTED at the script (6.26.0): the thin command no longer composes the report, runs the
// verdict or passes flags — `stage-verify.mjs` does, so that is where each pin now reads.
// ---------------------------------------------------------------------------------------------------------------
const STAGE_VERIFY_SRC = () => readFileSync(join(REPO_ROOT, "pharn/floor/stage-verify.mjs"), "utf8");

test("✧ verify's report keeps EVERY checker field — composeReport spreads the checker's object, then the merged blocks", () => {
  const core = readFileSync(join(REPO_ROOT, "pharn/floor/stage-verify-core.mjs"), "utf8");
  assert.match(
    core,
    /report: \{ \.\.\.checker, completeness, verifiers: block, gate_reuse: \{ reused: gateReuse\.reused \}, head_install: headInstall \}/,
    "the checker's object is carried whole — gate_run and ac_gate included — then the merged blocks (6.34.0: gate_reuse; 6.40.0: head_install)"
  );
  assert.match(STAGE_VERIFY_SRC(), /composeReport\(\{\s*checker: verdict\.report,/, "the script composes through composeReport");
});

test("✧ verify's verdict call passes --stamp, --feature and --ac-gate — the flag check-loop-fresh.mjs re-derives the report with", () => {
  const calls = [...STAGE_VERIFY_SRC().matchAll(/\[CHECK_VERIFY, ([^\]]*)\]/g)].map((m) => m[1]);
  assert.deepEqual(
    calls,
    ['"--stamp", STAMP, "--feature", state.feature, "--ac-gate"'],
    "exactly one check-verify argv, with the three flags"
  );
  // and the freshness checker's own re-run passes the same flag, so the two cannot drift apart (L45). The checker's
  // code lives in loop-fresh-core.mjs since 6.21.1; check-loop-fresh.mjs is the entry that loads it.
  assert.match(readFileSync(join(REPO_ROOT, "pharn/floor/loop-fresh-core.mjs"), "utf8"), /"--feature", ctx\.feature, "--ac-gate"\]/);
});

test("✧ the `--complete` hand-pass stays RETIRED (completeness comes from the stamp), in the script and the command", () => {
  // GRILL R1: completeness must reach check-verify.mjs on its existing --complete PATH but never as a gate. Neither the
  // script's argv nor the thin command passes the flag — the checker reads aux.completeness.
  assert.doesNotMatch(STAGE_VERIFY_SRC(), /"--complete"/, "stage-verify.mjs must not hand-pass --complete");
  const offenders = [];
  for (const block of fencedBlocks(commandBody("pharn-verify.md"))) {
    const text = block.lines.map((l) => l.text).join("\n");
    if (/check-verify\.mjs|--complete/.test(text)) offenders.push(`pharn-verify.md:${block.start}`);
  }
  assert.deepEqual(offenders, [], `a hand-passed --complete or a direct verdict call survives: ${offenders.join(", ")}`);
});

// ---------------------------------------------------------------------------------------------------------------
// ★ EXECUTED — every pinned `set-writes-scope.cjs --from-frontmatter <cmd> --target <path>` line RUNS (6.17.0).
// ---------------------------------------------------------------------------------------------------------------
// Rule A pins that each such line CARRIES `--target`; it never ran one. Prettier then split /pharn-test's `writes:`
// across lines, which the setter cannot read, and its lock re-scope exited 1 while every hygiene test stayed green
// (the pharn-test-stage review's blocking finding). PHARN's own lesson L45: an invocation is covered only by
// EXECUTING it. So every such line in every command is run here, `<name>` substituted, from a scratch cwd, and must
// exit 0 and scope exactly its target.
test("★ EXECUTED — every `--from-frontmatter … --target …` line in the commands runs the setter to exit 0", () => {
  const SETTER = new URL("../../.claude/hooks/set-writes-scope.cjs", import.meta.url).pathname;
  const LINE_RE = /node \.claude\/hooks\/set-writes-scope\.cjs --from-frontmatter (\.claude\/commands\/[\w.-]+\.md) --target (\S+)/g;
  const REPO = new URL("../../", import.meta.url).pathname;
  const sites = [];
  for (const file of readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()) {
    const text = readFileSync(join(COMMANDS_DIR, file), "utf8");
    // `<canon-file>` (the two memory-promote commands) is a member of that command's own `writes:` prefix; the
    // lessons file is the concrete member both promote to.
    const canon = file === "pharn-dev-memory-promote.md" ? ".dev/memory-bank/lessons-learned.md" : "memory-bank/lessons-learned.md";
    for (const m of text.matchAll(LINE_RE)) {
      const target = m[2]
        .replace(/<name>/g, "demo")
        .replace(/<canon-file>/g, canon)
        .replace(/[`"')]+$/, "");
      sites.push({ file, cmd: m[1], target });
    }
  }
  assert.ok(sites.length >= 15, `only ${sites.length} site(s) found — the scan broke, not the commands (L34)`);
  const cwd = mkdtempSync(join(tmpdir(), "hyg-scope-"));
  try {
    for (const s of sites) {
      const r = spawnSync(process.execPath, [SETTER, "--from-frontmatter", join(REPO, s.cmd), "--target", s.target], {
        cwd,
        encoding: "utf8",
      });
      assert.equal(r.status, 0, `${s.file}: \`--from-frontmatter ${s.cmd} --target ${s.target}\` failed: ${r.stdout}${r.stderr}`);
      const scope = JSON.parse(readFileSync(join(cwd, ".pharn", "writes-scope.json"), "utf8")).scope;
      assert.deepEqual(scope, [s.target], `${s.file}: the setter scoped ${JSON.stringify(scope)}, not the target`);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// ── The run-marker WIRING (pharn/floor/run-marker.mjs, 6.24.0, D3) ─────────────────────────────────────
//
// A FIFTH set, separate from every one above for the reason L29 gives: this one ranges over WHICH
// commands open/close a `/pharn-ship` / `/pharn-review` run marker, and WHERE — a different question from
// the phase-marker (mark-phase.mjs), lessons-sweep, lessons-reverify and lesson-extract sets, none of
// which this schema shares a writer with.
//
// WHY IT EXISTS (P7 — the recorded trigger). Since 6.24.0 `enforce-writes-scope.cjs`'s no-scope default
// in an INSTALLED project depends on whether a PHARN run is open — see the hook's own header and
// `CLAUDE.md`, "Writes-scope". `/pharn-ship` and `/pharn-review` are the two commands that can reach a
// Write-tool write with no scope of their own active (ship between its scoped steps; review sets none at
// all), so they are the two that must OPEN a marker before that matters and CLOSE it on every exit. A
// third command opening one that `pharn-loop.md` (below) must NOT — its existing marker already covers
// the same guard for free — is exactly the kind of drift L31 names for a deliberate small surface.
//
// Honest scope, the same narrow kind as every set above: these pin that the command PROSE carries the
// exact invocation, in the right order relative to a named anchor. They CANNOT prove a run executed
// either line, that the marker was actually written, or that the guard actually consulted it — that half
// is EXECUTED (not merely read) by `pharn/floor/run-marker.test.mjs`'s own ✧ WIRING tests, which run the
// pinned lines (substituting `<name>`) as real subprocesses against the real hook (L45). "The wiring is
// pinned" here NEVER means "a run opened or closed one" (P0).
const RUN_MARKER_OPEN = /node pharn\/floor\/run-marker\.mjs --open (pharn-review|pharn-ship) '<name>'/g;
const RUN_MARKER_CLOSE = /node pharn\/floor\/run-marker\.mjs --close (pharn-review|pharn-ship) '<name>'/g;
const RUN_MARKER_OPEN_STOP = "**Non-zero → STOP**";

const RUN_MARKER_WIRING = [
  {
    file: "pharn-ship.md",
    command: "pharn-ship",
    openAfter: "node pharn/floor/check-spec-approved.mjs pharn/features/<name>/SPEC.md",
    // 6.37.0: the pre-run snapshot line follows the open line, before /pharn-plan, with its OWN STOP — so the next
    // pinned line, not the plan marker, is what the open line's STOP must precede (pre-run-snapshot.test.mjs pins the
    // capture line's order and STOP).
    openBefore: "node pharn/floor/pre-run-snapshot.mjs --capture '<name>'",
    closeAfter: "node pharn/floor/mark-phase.mjs --name '<name>' --kind run-stop",
  },
  {
    file: "pharn-review.md",
    command: "pharn-review",
    openAfter: "## Step 1b",
    openBefore: "## Step 3 —",
    closeAfter: "## Step 6b",
  },
];

test("✧ RUN-MARKER ENUMERATION is non-vacuous and CLOSED over the corpus — no third caller, no drop", () => {
  assert.equal(RUN_MARKER_WIRING.length, 2, "expected exactly the two commands with no scope of their own active at a Write-tool write");
  const enumerated = RUN_MARKER_WIRING.map((c) => c.file).sort();
  assert.deepEqual([...new Set(enumerated)], enumerated, "no duplicate member");
  const live = readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".md") && !PART_FILES.has(f) && /node pharn\/floor\/run-marker\.mjs/.test(commandText(f)))
    .sort();
  assert.deepEqual(
    live,
    enumerated,
    "every command invoking run-marker.mjs must be enumerated above — a new caller fails here, not silently"
  );
});

test("✧ pharn-loop.md does NOT invoke run-marker.mjs — its existing marker already covers the guard (no second writer)", () => {
  assert.doesNotMatch(
    commandBody("pharn-loop.md"),
    /run-marker\.mjs/,
    "the loop keeps require-loop-record.cjs as its marker's one owner (L35)"
  );
});

for (const cmd of RUN_MARKER_WIRING) {
  test(`✧ ${cmd.file} opens exactly one ${cmd.command} run marker and closes exactly one, matching commands`, () => {
    const body = commandBody(cmd.file);
    const opens = [...body.matchAll(RUN_MARKER_OPEN)];
    const closes = [...body.matchAll(RUN_MARKER_CLOSE)];
    assert.equal(opens.length, 1, `${cmd.file}: expected exactly one --open line`);
    assert.equal(closes.length, 1, `${cmd.file}: expected exactly one --close line`);
    assert.equal(opens[0][1], cmd.command, `${cmd.file}: --open must name ${cmd.command}`);
    assert.equal(closes[0][1], cmd.command, `${cmd.file}: --close must name ${cmd.command}`);
  });

  test(`✧ ${cmd.file}'s --open sits after '${cmd.openAfter.slice(0, 40)}…' and before '${cmd.openBefore.slice(0, 40)}…'`, () => {
    const body = commandBody(cmd.file);
    const after = body.indexOf(cmd.openAfter);
    const open = body.search(RUN_MARKER_OPEN);
    const before = body.indexOf(cmd.openBefore);
    assert.ok(after >= 0 && open >= 0 && before >= 0, `${cmd.file}: all three anchors must exist`);
    assert.ok(after < open, `${cmd.file}: --open must come after the resume/ask anchor`);
    assert.ok(open < before, `${cmd.file}: --open must come before the next stage/step anchor`);
  });

  test(`✧ ${cmd.file}'s --close sits after '${cmd.closeAfter.slice(0, 40)}…', on the every-exit path`, () => {
    const body = commandBody(cmd.file);
    const after = body.indexOf(cmd.closeAfter);
    const close = body.search(RUN_MARKER_CLOSE);
    assert.ok(after >= 0 && close >= 0, `${cmd.file}: both anchors must exist`);
    assert.ok(after < close, `${cmd.file}: --close must come after its anchor`);
  });

  // GATE-2 review, S1: a failed --open must STOP the command — the exit code is the contract, so the branch
  // sits between the open line and the step it guards. run-marker.test.mjs EXECUTES the pinned line against
  // a planted file to show that exit really is non-zero; this pins that the prose reads it.
  test(`✧ ${cmd.file} STOPS on a non-zero --open, between the open line and '${cmd.openBefore.slice(0, 30)}…'`, () => {
    const body = commandBody(cmd.file);
    const open = body.search(RUN_MARKER_OPEN);
    const before = body.indexOf(cmd.openBefore);
    const stop = body.indexOf(RUN_MARKER_OPEN_STOP, open);
    assert.ok(open >= 0 && stop > open && stop < before, `${cmd.file}: a "${RUN_MARKER_OPEN_STOP}" branch must follow --open`);
    // L4 mutation control: the same check over a body with the branch removed must fail.
    const mutated = body.slice(0, open) + body.slice(open).replace(RUN_MARKER_OPEN_STOP, "Non-zero → continue");
    const mStop = mutated.indexOf(RUN_MARKER_OPEN_STOP, open);
    assert.ok(!(mStop > open && mStop < mutated.indexOf(cmd.openBefore)), `${cmd.file}: the rule must fail once the STOP branch is gone`);
  });

  // L4: an authored assertion passes by construction. Pin the matcher's DISCRIMINATION directly.
  test(`✧ the ${cmd.file} run-marker rule DISCRIMINATES — it fails once the invocations are removed`, () => {
    const stripped = commandBody(cmd.file).replace(RUN_MARKER_OPEN, "<<removed>>").replace(RUN_MARKER_CLOSE, "<<removed>>");
    assert.doesNotMatch(stripped, RUN_MARKER_OPEN, `${cmd.file}: the open matcher must not still pass once removed`);
    assert.doesNotMatch(stripped, RUN_MARKER_CLOSE, `${cmd.file}: the close matcher must not still pass once removed`);
  });
}

test("✧ neither run-marker command is scoped to `pharn-loop` — the CLI refuses it, and no command tries", () => {
  for (const file of commandFiles()) {
    assert.doesNotMatch(
      commandBody(file),
      /run-marker\.mjs --(open|close) pharn-loop\b/,
      `${file}: pharn-loop is not a run-marker.mjs command`
    );
  }
});

// ── ✧ STAGE_AGENT_WIRING (6.27.0, stage-model-routing) — a routed stage's pinned lines, in the two orchestrators ──
//
// `/pharn-ship` and `/pharn-loop` run each routed stage through four pinned lines — `stage-agent.mjs route`, the
// stage-start marker carrying `--route '<route>'`, the one-line brief prompt the Agent call carries, and
// `stage-agent.mjs read` — then the orchestrator marker. The routed set is ONE table, `ROUTE_POLICY` in
// `pharn/floor/stage-agent-core.mjs`, and these rules iterate it (L29): a policy cell flipped without its route
// lines, or route lines added without their cell, fail here. The committed route and brief lines are EXECUTED
// (L45), and the guards are probed with and without a subagent's `agent_id`/`agent_type` (L37).
//
// Honest scope, the same narrow kind as every set above: PRESENCE and ORDER over committed prose. These never
// prove a run executed a line, that the orchestrator passed the alias, or that a stage agent obeyed its brief
// (P0) — the plan's live M2 run is what measures routing.

const STAGE_AGENT_WIRING = [
  {
    file: "pharn-ship.md",
    command: "pharn-ship",
    // stage -> the iterations its full-mode route lines carry (null = not iterated). Build twice: the chain's
    // iteration 1 and the Step-2b re-build's iteration 2.
    routed: { "pharn-plan": [null], "pharn-grill": [null], "pharn-test": [null], "pharn-build": ["1", "2"] },
    // mode -> the stages with a `--mode <mode>` route line (a DELTA replacing that stage's full-mode line).
    modeLines: { quick: ["pharn-grill"] },
    section: "Running a stage (6.27.0) — a routed stage runs as a stage agent, requested on its configured model",
    waitRule: /A call that returns\s+a background-launch notice has not: wait for the agent's completion notice first/,
  },
  {
    file: "pharn-loop.md",
    command: "pharn-loop",
    routed: { "pharn-spec": [null], "pharn-plan": [null], "pharn-grill": [null], "pharn-test": [null], "pharn-build": ["<N>"] },
    // 6.28.0 (loop-quick-mode): ## Quick mode's lines — the spec (its brief names the quick invocation), the grill
    // (inline by policy) and the build (its brief's rule 7 reads verify-report.json alone).
    modeLines: { quick: ["pharn-spec", "pharn-grill", "pharn-build"] },
    section: "Running a stage (6.27.0) — a routed stage runs as a stage agent, requested on its configured model",
    waitRule: /a call that\s+returns a background-launch notice instead is \*\*S9\*\*/,
  },
];

const SA_ROUTE = /^node pharn\/floor\/stage-agent\.mjs route (.*)$/;
const SA_READ = /^node pharn\/floor\/stage-agent\.mjs read (.*)$/;
const SA_BRIEF = new RegExp(`^${BRIEF_PROMPT_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}node pharn/floor/stage-agent\\.mjs brief (.*)$`);
const SA_MARK = /^node pharn\/floor\/mark-phase\.mjs (.*)$/;

/** `--flag value` pairs of one pinned line; a single-quoted value is unquoted, a bare flag is `true`. */
function saFlags(rest) {
  const toks = rest.trim().split(/\s+/);
  const out = {};
  for (let i = 0; i < toks.length; i++) {
    if (!toks[i].startsWith("--")) continue;
    const next = toks[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[toks[i].slice(2)] = next.replace(/^'(.*)'$/, "$1");
      i++;
    } else out[toks[i].slice(2)] = true;
  }
  return out;
}

/** Every stage-agent and mark-phase line of a body's fenced blocks, classified, in order. */
function saLines(body) {
  const out = [];
  for (const { line, text } of fencedLines(body)) {
    const t = text.trim();
    let m;
    if ((m = t.match(SA_ROUTE))) out.push({ idx: line, kind: "route", flags: saFlags(m[1]), text: t });
    else if ((m = t.match(SA_READ))) out.push({ idx: line, kind: "read", flags: saFlags(m[1]), text: t });
    else if ((m = t.match(SA_BRIEF))) out.push({ idx: line, kind: "brief", flags: saFlags(m[1]), text: t });
    else if ((m = t.match(SA_MARK))) {
      const f = saFlags(m[1]);
      const kind = f.kind === "stage-start" ? "stage-start" : f.kind === "orchestrator" ? "orchestrator" : "marker";
      out.push({ idx: line, kind, flags: f, text: t });
    }
  }
  return out;
}

const saKey = (f) => `${f.stage}@${f.iteration ?? "-"}`;
const sortedKeys = (lines) => lines.map((l) => saKey(l.flags)).sort();
const saModeKey = (f) => `${f.mode}:${saKey(f)}`;

/** A cell of `policy` by own-property lookups only (L15) — null when the command, mode or stage is not in it. Takes the
 *  table as an argument so a mutated copy runs through the same rule (L60). */
function saCell(policy, command, mode, stage) {
  if (!Object.hasOwn(policy, command) || !Object.hasOwn(policy[command], mode)) return null;
  return Object.hasOwn(policy[command][mode], stage) ? policy[command][mode][stage] : null;
}

/** Rule 2 — the routed set, the read/brief lines, and --route only where a route line is. [] when clean. */
function saWiringReasons(cmd, body, policy = ROUTE_POLICY) {
  const reasons = [];
  const L = saLines(body);
  for (const l of L.filter((x) => ["route", "read", "brief"].includes(x.kind))) {
    if (l.flags.command !== cmd.command) reasons.push(`line ${l.idx} names --command ${l.flags.command}, not ${cmd.command}`);
    if (l.flags.name !== "<name>") reasons.push(`line ${l.idx} does not pass --name '<name>'`);
  }
  const full = L.filter((l) => l.kind === "route" && l.flags.mode === undefined);
  const want = Object.entries(cmd.routed)
    .flatMap(([s, its]) => its.map((it) => `${s}@${it ?? "-"}`))
    .sort();
  const have = sortedKeys(full);
  if (JSON.stringify(have) !== JSON.stringify(want)) reasons.push(`full-mode route lines [${have}] != [${want}]`);
  const reads = sortedKeys(L.filter((l) => l.kind === "read"));
  if (JSON.stringify(reads) !== JSON.stringify(have)) reasons.push(`read lines [${reads}] != route lines [${have}]`);
  // A brief line carries its route line's --mode (6.28.0 split): the full-mode briefs pair with the full-mode route lines;
  // a --mode brief exists exactly for a --mode route line whose cell is agent (an inline cell has no brief). A --mode
  // stage reuses its full-mode read line — `read` takes no --mode — so the read rule above is unchanged.
  const briefs = sortedKeys(L.filter((l) => l.kind === "brief" && l.flags.mode === undefined));
  if (JSON.stringify(briefs) !== JSON.stringify(have)) reasons.push(`brief prompt lines [${briefs}] != route lines [${have}]`);
  const haveModeBriefs = L.filter((l) => l.kind === "brief" && l.flags.mode !== undefined)
    .map((l) => saModeKey(l.flags))
    .sort();
  const wantModeBriefs = L.filter(
    (l) => l.kind === "route" && l.flags.mode !== undefined && saCell(policy, cmd.command, l.flags.mode, l.flags.stage) === AGENT
  )
    .map((l) => saModeKey(l.flags))
    .sort();
  if (JSON.stringify(haveModeBriefs) !== JSON.stringify(wantModeBriefs))
    reasons.push(`--mode brief prompt lines [${haveModeBriefs}] != --mode route lines of agent cells [${wantModeBriefs}]`);
  const withRoute = L.filter((l) => l.kind === "stage-start" && l.flags.route !== undefined);
  for (const l of withRoute)
    if (l.flags.route !== "<route>") reasons.push(`line ${l.idx}: --route must be the literal '<route>' placeholder`);
  const withRouteKeys = sortedKeys(withRoute);
  if (JSON.stringify(withRouteKeys) !== JSON.stringify(have))
    reasons.push(`stage-starts carrying --route [${withRouteKeys}] != routed [${have}]`);
  const modeLines = L.filter((l) => l.kind === "route" && l.flags.mode !== undefined);
  const wantModes = Object.entries(cmd.modeLines)
    .flatMap(([m, stages]) => stages.map((s) => `${m}:${s}`))
    .sort();
  const haveModes = modeLines.map((l) => `${l.flags.mode}:${l.flags.stage}`).sort();
  if (JSON.stringify(haveModes) !== JSON.stringify(wantModes)) reasons.push(`--mode route lines [${haveModes}] != [${wantModes}]`);
  const fullStages = new Set(full.map((l) => l.flags.stage));
  for (const l of modeLines) {
    if (!fullStages.has(l.flags.stage))
      reasons.push(`line ${l.idx}: a --mode route line for ${l.flags.stage}, which has no full-mode route line`);
  }
  return reasons;
}

/** Rule 3 — POLICY PARITY, iterated over every (command, mode) column the policy holds. [] when clean. */
function saPolicyReasons(policy, cmd, body) {
  const reasons = [];
  const byMode = policy[cmd.command];
  const routes = saLines(body).filter((l) => l.kind === "route");
  const fullStages = new Set(routes.filter((l) => l.flags.mode === undefined).map((l) => l.flags.stage));
  for (const l of routes.filter((x) => x.flags.mode !== undefined)) {
    if (l.flags.mode === FULL_MODE || !Object.hasOwn(byMode, l.flags.mode))
      reasons.push(`line ${l.idx}: --mode ${l.flags.mode} names no column`);
  }
  for (const mode of Object.keys(byMode)) {
    const cells = byMode[mode];
    const agentElsewhere = (s) => Object.keys(byMode).some((m2) => m2 !== mode && byMode[m2][s] === AGENT);
    const expected = new Set(
      Object.keys(cells).filter((s) => cells[s] === AGENT || (POLICY_INLINE.includes(cells[s]) && agentElsewhere(s)))
    );
    let effective;
    if (mode === FULL_MODE) effective = fullStages;
    else {
      const modeStages = new Set(routes.filter((l) => l.flags.mode === mode).map((l) => l.flags.stage));
      effective = new Set([...modeStages, ...[...fullStages].filter((s) => cells[s] === AGENT && !modeStages.has(s))]);
      for (const s of fullStages) {
        if (POLICY_INLINE.includes(cells[s]) && !modeStages.has(s)) {
          reasons.push(`${cmd.command}/${mode}: ${s} is ${cells[s]} here, but only its full-mode route line exists — which would route it`);
        }
      }
    }
    const a = [...effective].sort();
    const b = [...expected].sort();
    if (JSON.stringify(a) !== JSON.stringify(b)) reasons.push(`${cmd.command}/${mode}: stages with a route line [${a}] != policy [${b}]`);
  }
  return reasons;
}

/** Rule 4 — ORDER, per full-mode route line: stage-start < brief < read < the orchestrator return, all before the
 *  next route line, and the brief's argv equal to the route line's. Per --mode route line (6.28.0) — a DELTA whose
 *  markers and read line are the full-mode ones: an agent cell's brief line follows it, before the next route line,
 *  with the same argv; an inline cell has none there. [] when clean. */
function saOrderReasons(body, policy = ROUTE_POLICY) {
  const reasons = [];
  const L = saLines(body);
  const routes = L.filter((l) => l.kind === "route");
  for (const r of routes.filter((l) => l.flags.mode !== undefined)) {
    const next = routes.find((l) => l.idx > r.idx);
    const briefs = L.filter((l) => l.kind === "brief" && l.idx > r.idx && (!next || l.idx < next.idx));
    const where = `${saModeKey(r.flags)} (line ${r.idx})`;
    const cell = saCell(policy, r.flags.command, r.flags.mode, r.flags.stage);
    if (cell !== AGENT) {
      if (briefs.length) reasons.push(`${where}: an inline (${cell}) --mode cell is followed by a brief prompt line`);
      continue;
    }
    if (briefs.length !== 1) {
      reasons.push(`${where}: an agent --mode cell needs exactly one brief prompt line before the next route line, found ${briefs.length}`);
      continue;
    }
    for (const k of ["command", "stage", "name", "iteration", "mode"]) {
      if (briefs[0].flags[k] !== r.flags[k])
        reasons.push(`${where}: the brief line's --${k} ${briefs[0].flags[k]} differs from the route line's ${r.flags[k]}`);
    }
  }
  const full = routes.filter((l) => l.flags.mode === undefined);
  for (let i = 0; i < full.length; i++) {
    const r = full[i];
    const end = i + 1 < full.length ? full[i + 1].idx : Infinity;
    const after = L.filter((l) => l.idx > r.idx && l.idx < end);
    const where = `${saKey(r.flags)} (line ${r.idx})`;
    const ss = after.find((l) => l.kind === "stage-start");
    if (!ss || ss.flags.stage !== r.flags.stage || ss.flags.iteration !== r.flags.iteration || ss.flags.route !== "<route>") {
      reasons.push(`${where}: the next stage-start is not this stage's, carrying --route '<route>'`);
      continue;
    }
    const brief = after.find((l) => l.kind === "brief" && l.idx > ss.idx);
    if (!brief) {
      reasons.push(`${where}: no brief prompt line after the stage-start`);
      continue;
    }
    for (const k of ["command", "stage", "name", "iteration", "mode"]) {
      if (brief.flags[k] !== r.flags[k])
        reasons.push(`${where}: the brief line's --${k} ${brief.flags[k]} differs from the route line's ${r.flags[k]}`);
    }
    const read = after.find((l) => l.kind === "read" && l.idx > brief.idx);
    if (!read || read.flags.stage !== r.flags.stage || read.flags.iteration !== r.flags.iteration) {
      reasons.push(`${where}: no read line for this stage after the brief line`);
      continue;
    }
    if (L.some((l) => ["stage-start", "orchestrator", "marker"].includes(l.kind) && l.idx > ss.idx && l.idx < read.idx)) {
      reasons.push(`${where}: a marker sits between the stage-start and the read`);
    }
    const next = L.find((l) => ["stage-start", "orchestrator", "marker"].includes(l.kind) && l.idx > read.idx);
    if (!next || next.kind !== "orchestrator" || next.idx > end)
      reasons.push(`${where}: the next marker after read is not the orchestrator return`);
  }
  return reasons;
}

/** The `## Running a stage` section of a command, by heading offset, both anchors asserted found (L60). */
function saSection(cmd, body = commandBody(cmd.file)) {
  const start = headingOffset(body, cmd.section);
  assert.ok(start >= 0, `${cmd.file}: the \`## ${cmd.section}\` heading must exist`);
  const rest = body.slice(start + 3);
  const nextHeading = rest.search(/^## /m);
  assert.ok(nextHeading > 0, `${cmd.file}: a heading must follow the Running-a-stage section`);
  return body.slice(start, start + 3 + nextHeading);
}

test("✧ STAGE_AGENT_WIRING (1) — CLOSURE: every command invoking stage-agent.mjs is enumerated, and each exists", () => {
  assert.equal(STAGE_AGENT_WIRING.length, 2, "L34: the two orchestrators");
  const live = commandFiles()
    .filter((f) => /node pharn\/floor\/stage-agent\.mjs/.test(commandBody(f)))
    .sort();
  assert.deepEqual(live, STAGE_AGENT_WIRING.map((c) => c.file).sort(), "a third caller must be enumerated here");
  assert.deepEqual(STAGE_AGENT_WIRING.map((c) => c.command).sort(), Object.keys(ROUTE_POLICY).sort(), "one entry per policy command");
});

for (const cmd of STAGE_AGENT_WIRING) {
  test(`✧ STAGE_AGENT_WIRING (2) — ${cmd.file}: the routed set, one read and one brief line per route line, --route only on those stage-starts`, () => {
    assert.ok(
      saLines(commandBody(cmd.file)).some((l) => l.kind === "route"),
      "L34: the scan found route lines"
    );
    assert.deepEqual(saWiringReasons(cmd, commandBody(cmd.file)), []);
  });

  test(`✧ STAGE_AGENT_WIRING (3) — ${cmd.file}: POLICY PARITY over every column ROUTE_POLICY holds`, () => {
    assert.ok(modesOf(cmd.command).length > 0, "L34: the command has policy columns");
    assert.deepEqual(saPolicyReasons(ROUTE_POLICY, cmd, commandBody(cmd.file)), []);
  });

  test(`✧ STAGE_AGENT_WIRING (4) — ${cmd.file}: ORDER — route < stage-start < brief < read < the orchestrator return`, () => {
    assert.deepEqual(saOrderReasons(commandBody(cmd.file)), []);
  });

  test(`✧ STAGE_AGENT_WIRING (5) — ${cmd.file}: ## Running a stage names the Agent call's parameters and the read rules`, () => {
    const s = saSection(cmd);
    assert.match(s, /`subagent_type: "general-purpose"`/);
    assert.match(s, /`run_in_background: false`/);
    assert.match(s, /\*\*no\s+`isolation`\*\*/);
    assert.match(s, cmd.waitRule, "the wait-before-read rule");
    assert.match(s, /\*\*The read line — only after an Agent call has returned the agent's COMPLETED result\.\*\*/);
    assert.match(s, /\*\*Never run `read` for a stage that ran inline\.\*\*/);
    assert.match(s, /\*\*The model is routed; effort is not\*\*/);
    assert.match(s, /pharn\/floor\/stage-agent-core\.mjs`'s header/, "the protocol is cited, not restated (P4)");
    // GATE-2 review: A1 (the heading says requested), A5 (a refused stage-start line), A6 (the prose claim is ADVISORY,
    // the free-text residual named).
    assert.match(s, /^## Running a stage \(6\.27\.0\) — a routed stage runs as a stage agent, requested on its configured model$/m);
    assert.match(s, /If it exits\s+`2`\s+it\s+wrote\s+no\s+marker[^.]*\):\s+run\s+it\s+once\s+more\s+without\s+`--route '<route>'`/);
    assert.match(s, /control\s+flow\s+never\s+uses\s+the\s+agent's\s+prose\s+is\s+\*\*ADVISORY\*\*/);
    assert.match(s, /`THREAT-MODEL\.md §5`'s\s+free-text\s+residual/);
    if (cmd.command === "pharn-ship") {
      assert.match(s, /with\s+SendMessage — load its schema first if the harness lists it as a deferred tool/);
      assert.match(s, /If SendMessage is absent\s+altogether, re-run the stage's route line/);
      // A8: a fresh agent never saw the question, so its prompt carries it too; a re-run route line off 0 is a STOP.
      assert.match(s, /the stage's question and its options verbatim, then the\s+human's answer verbatim/);
      assert.match(s, /labelled DATA \(the\s+first as the stage's question, the second as the human's answer to it\)/);
      assert.match(s, /On\s+any\s+other\s+exit\s+of\s+that\s+route\s+line,\s+\*\*STOP\*\*/);
      const readAgain = s.search(/Either way, then run `read` again\./);
      assert.ok(
        readAgain > 0 && readAgain < s.search(/On\s+any\s+other\s+exit\s+of\s+that\s+route\s+line/),
        "read again, THEN the STOP branch"
      );
    } else {
      assert.doesNotMatch(commandBody(cmd.file), ASK_TOKEN_RE, "the loop still names no interactive-ask tool");
    }
  });
}

// ★ (6) EXECUTED (L45): every committed route line, run in a scratch dir against this repo's config, no config, and a
// pre-0.7.0-shaped block; every committed brief line runs at exit 0. The expected alias is what the REAL checker
// resolves — never re-typed here.
test("★ STAGE_AGENT_WIRING (6) — every committed route line runs to its expected route over three configs, and every brief line runs", () => {
  const CLI = join(REPO_ROOT, "pharn", "floor", "stage-agent.mjs");
  const CHECKER = join(REPO_ROOT, "pharn", "floor", "check-model-config.mjs");
  const repoConfig = readFileSync(join(REPO_ROOT, "pharn.config.json"), "utf8");
  const pre070 = JSON.stringify({
    models: { default: { model: "sonnet-5", effort: "high" }, stages: { plan: { model: "opus-4-8", effort: "high" } } },
  });
  const sub = (line) =>
    line.replaceAll("'<name>'", "'demo'").replaceAll("<N>", "1").replace("pharn/floor/stage-agent.mjs", JSON.stringify(CLI));
  let routes = 0;
  let briefs = 0;
  for (const cmd of STAGE_AGENT_WIRING) {
    for (const l of saLines(commandBody(cmd.file))) {
      if (l.kind === "brief") {
        const dir = mkdtempSync(join(tmpdir(), "hyg-sa-brief-"));
        try {
          const r = spawnSync("sh", ["-c", sub(l.text.slice(BRIEF_PROMPT_PREFIX.length))], { cwd: dir, encoding: "utf8" });
          assert.equal(r.status, 0, `${cmd.file}:${l.idx}: ${r.stderr}`);
          assert.match(r.stdout, /^PHARN stage-agent brief/);
          briefs++;
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
        continue;
      }
      if (l.kind !== "route") continue;
      const cell = ROUTE_POLICY[l.flags.command][l.flags.mode ?? FULL_MODE][l.flags.stage];
      for (const [label, config] of [
        ["this repo's config", repoConfig],
        ["no config", null],
        ["a pre-0.7.0 block", pre070],
      ]) {
        const dir = mkdtempSync(join(tmpdir(), "hyg-sa-route-"));
        try {
          if (config !== null) writeFileSync(join(dir, "pharn.config.json"), config);
          let want;
          if (cell !== AGENT) want = [3, `inline:${cell}\n`];
          else if (config === null) want = [3, "inline:no-config\n"];
          else if (config === pre070) want = [3, "inline:config-red\n"];
          else {
            const res = spawnSync(
              process.execPath,
              [CHECKER, "resolve", STAGE_CONFIG_KEYS[l.flags.stage], "--config", join(dir, "pharn.config.json")],
              {
                encoding: "utf8",
              }
            );
            want = [0, `agent:${JSON.parse(res.stdout).model}\n`];
          }
          const r = spawnSync("sh", ["-c", sub(l.text)], { cwd: dir, encoding: "utf8" });
          assert.deepEqual([r.status, r.stdout], want, `${cmd.file}:${l.idx} over ${label}: ${r.stderr}`);
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      }
      routes++;
    }
  }
  assert.equal(
    routes,
    14,
    "L34: 6 ship route lines (plan, grill, test, build@1, build@2, the quick grill) + 8 loop lines (5 full; the quick spec, grill and build — 6.28.0)"
  );
  assert.equal(
    briefs,
    12,
    "one brief prompt line per full-mode route line (10), plus the loop's quick spec and build (the quick grills run inline, so have none)"
  );
});

// ★ (7) PROBED (L37, L40): the two write guards give IDENTICAL verdicts for a subagent-shaped payload (with
// `agent_id`/`agent_type`) and the same payload without them — over a deny, an allow and a trusted doc.
test("★ STAGE_AGENT_WIRING (7) — both guards judge a stage agent's write exactly as the orchestrator's", () => {
  const HOOKS = join(REPO_ROOT, ".claude", "hooks");
  const dir = mkdtempSync(join(tmpdir(), "hyg-sa-guards-"));
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  try {
    // The scratch cwd is an UNSIGNALLED tree with no scope: `pharn/floor/**` is outside its fail-closed default,
    // `pharn/features/**` inside it. The trusted doc is named by its ABSOLUTE path in this repo, because
    // protect-trusted-paths.cjs guards the tree its own file lives in (a bare `LIMITS.md` would name the
    // scratch dir's own, unprotected file).
    const cases = [
      ["pharn/floor/x.mjs", { "enforce-writes-scope.cjs": 2, "protect-trusted-paths.cjs": 0 }],
      ["pharn/features/x/y.md", { "enforce-writes-scope.cjs": 0, "protect-trusted-paths.cjs": 0 }],
      [join(REPO_ROOT, "LIMITS.md"), { "enforce-writes-scope.cjs": 2, "protect-trusted-paths.cjs": 2 }],
    ];
    for (const [file_path, want] of cases) {
      for (const hook of Object.keys(want)) {
        const status = (extra) =>
          spawnSync(process.execPath, [join(HOOKS, hook)], {
            cwd: dir,
            env,
            input: JSON.stringify({ tool_name: "Write", tool_input: { file_path }, ...extra }),
            encoding: "utf8",
          }).status;
        const plain = status({});
        const asAgent = status({ agent_id: "a0f1e2d3c4b5a6978", agent_type: "general-purpose" });
        assert.equal(plain, want[hook], `${hook} on ${file_path}: the expected verdict (non-vacuity)`);
        assert.equal(asAgent, plain, `${hook} on ${file_path}: a stage agent's payload must be judged the same`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// (8) LOOP ROWS: every row a loop stage agent may report is a stuck-point row, and each is named in the loop's
// mapping (closure); and the inline build's hand-over paragraph names the same four fields as the brief's rule 7.
function loopRowsReasons(body) {
  const reasons = [];
  const ids = new Set(STUCK_POINTS.map((s) => s.id));
  const cmd = STAGE_AGENT_WIRING.find((c) => c.command === "pharn-loop");
  const section = saSection(cmd, body);
  for (const row of LOOP_ROWS) {
    if (!ids.has(row)) reasons.push(`${row} is not a stuck-point row`);
    if (!section.includes(`**${row}**`)) reasons.push(`${row} is not named in pharn-loop.md's ## Running a stage mapping`);
  }
  return reasons;
}

function handOverReasons(body) {
  const at = body.indexOf("hand the inline build the standing");
  if (at === -1) return ["pharn-loop.md has no inline-build hand-over paragraph"];
  const para = body.slice(at, body.indexOf("\n\n", at));
  return FIX_LIST_FIELDS.filter((f) => !para.includes(`\`${f}\``)).map((f) => `the hand-over paragraph does not name ${f}`);
}

/** 6.28.0 — ## Quick mode item 4 (the quick build) names exactly the quick fix list, and never the regress field. */
function quickHandOverReasons(body) {
  const section = loopQuickSection(body);
  const start = section.indexOf("\n4. **Step 5, sub-step 1 — the build.**");
  const end = section.indexOf("\n5. **Step 5, sub-step 2");
  if (start === -1 || end <= start) return ["## Quick mode has no item 4 (the build) followed by item 5"];
  const item = section.slice(start, end);
  const reasons = fixListFields("quick")
    .filter((f) => !item.includes(`\`${f}\``))
    .map((f) => `## Quick mode item 4 does not name ${f}`);
  for (const f of FIX_LIST_FIELDS.filter((x) => !fixListFields("quick").includes(x))) {
    if (item.includes(`\`${f}\``)) reasons.push(`## Quick mode item 4 names ${f}, which a quick run has no report for`);
  }
  return reasons;
}

test("✧ STAGE_AGENT_WIRING (8) — LOOP_ROWS are stuck points named in the loop's mapping; the hand-over paragraph and rule 7 name the same fields", () => {
  assert.equal(LOOP_ROWS.length, 9, "L34 — S6c joined in 6.28.0");
  const body = commandBody("pharn-loop.md");
  assert.deepEqual(loopRowsReasons(body), []);
  assert.deepEqual(handOverReasons(body), []);
  const rule7 = renderBrief({ command: "pharn-loop", stage: "pharn-build", name: "demo", iteration: 2 }).text;
  for (const f of FIX_LIST_FIELDS) assert.ok(rule7.includes(`\`${f}\``), `the brief's rule 7 names ${f}`);
  // 6.28.0 — the quick build: its brief's rule 7 and ## Quick mode item 4 name the same, smaller list.
  assert.deepEqual(fixListFields("quick"), FIX_LIST_FIELDS.slice(0, 3), "L34: the three verify-report.json fields");
  assert.deepEqual(quickHandOverReasons(body), []);
  const quick7 = renderBrief({ command: "pharn-loop", mode: "quick", stage: "pharn-build", name: "demo", iteration: 2 }).text;
  for (const f of fixListFields("quick")) assert.ok(quick7.includes(`\`${f}\``), `the quick brief's rule 7 names ${f}`);
  assert.ok(!quick7.includes("`.regressions[]`") && !quick7.includes("regression-report.json"), "no regression report in quick mode");
});

// (9) MUTATION CONTROLS (L60) — each property above fails on a mutant of the REAL command, run through the SAME rule.
test("✧ STAGE_AGENT_WIRING (9) — each rule fails on its mutant: route, read, --route, order, brief argv, a loop row, a policy cell", () => {
  const ship = STAGE_AGENT_WIRING.find((c) => c.command === "pharn-ship");
  const loop = STAGE_AGENT_WIRING.find((c) => c.command === "pharn-loop");
  const real = commandBody(ship.file);
  const dropLine = (body, needle) => {
    const lines = body.split("\n");
    const i = lines.findIndex((l) => l.trim() === needle);
    assert.ok(i >= 0, `fixture sanity: ${needle} must exist`);
    lines.splice(i, 1);
    return lines.join("\n");
  };
  const planRoute = "node pharn/floor/stage-agent.mjs route --command pharn-ship --stage pharn-plan --name '<name>'";
  const planRead = "node pharn/floor/stage-agent.mjs read --command pharn-ship --name '<name>' --stage pharn-plan";
  const planStart = "node pharn/floor/mark-phase.mjs --name '<name>' --kind stage-start --stage pharn-plan --route '<route>'";
  const planBrief = `${BRIEF_PROMPT_PREFIX}node pharn/floor/stage-agent.mjs brief --command pharn-ship --stage pharn-plan --name '<name>'`;

  assert.match(saWiringReasons(ship, dropLine(real, planRoute)).join("\n"), /full-mode route lines/, "a dropped route line");
  assert.match(saWiringReasons(ship, dropLine(real, planRead)).join("\n"), /read lines/, "a dropped read line");
  const noRoute = real.replace(planStart, planStart.replace(" --route '<route>'", ""));
  assert.notEqual(noRoute, real);
  assert.match(saWiringReasons(ship, noRoute).join("\n"), /stage-starts carrying --route/, "a dropped --route");
  // A swapped order: the read line moved ABOVE its stage-start.
  const swapped = real.replace(planRead, "__READ__").replace(planStart, `${planRead}\n${planStart}`).replace("__READ__", "");
  assert.notEqual(swapped, real);
  assert.ok(saOrderReasons(swapped).length > 0, "a swapped order");
  // A brief line whose --stage differs from its route line's.
  const wrongBrief = real.replace(planBrief, planBrief.replace("--stage pharn-plan", "--stage pharn-grill"));
  assert.notEqual(wrongBrief, real);
  assert.match(saOrderReasons(wrongBrief).join("\n"), /brief line's --stage/, "a brief line naming another stage");
  // A LOOP_ROWS member missing from the loop's mapping.
  const loopBody = commandBody(loop.file);
  const noS7 = loopBody.replace("`refused S7` → **S7**", "`refused S7` → S7");
  assert.notEqual(noS7, loopBody);
  assert.match(loopRowsReasons(noS7).join("\n"), /S7 is not named/, "a loop row missing from the mapping");
  // A policy cell flipped in a copy of the table.
  const flipped = JSON.parse(JSON.stringify(ROUTE_POLICY));
  flipped["pharn-ship"].full["pharn-grill"] = "floor-only";
  assert.ok(saPolicyReasons(flipped, ship, real).length > 0, "a flipped policy cell");
  const flipped2 = JSON.parse(JSON.stringify(ROUTE_POLICY));
  flipped2["pharn-loop"].full["pharn-verify"] = AGENT;
  assert.ok(saPolicyReasons(flipped2, loop, loopBody).length > 0, "a newly routed cell with no route line");
  // 6.28.0 — the loop's QUICK column (the coupling), through the same rules: a quick cell flipped inline with no
  // --mode line, a quick cell newly routed, a brief after the inline quick grill, a dropped quick brief, and a quick
  // brief that lost its --mode.
  const flippedQ = JSON.parse(JSON.stringify(ROUTE_POLICY));
  flippedQ["pharn-loop"].quick["pharn-plan"] = "floor-only";
  assert.match(
    saPolicyReasons(flippedQ, loop, loopBody).join("\n"),
    /pharn-loop\/quick: pharn-plan is floor-only here/,
    "a quick cell flipped inline without its --mode route line"
  );
  const routedQ = JSON.parse(JSON.stringify(ROUTE_POLICY));
  routedQ["pharn-loop"].quick["pharn-verify"] = AGENT;
  assert.match(
    saPolicyReasons(routedQ, loop, loopBody).join("\n"),
    /pharn-loop\/quick: stages with a route line/,
    "a quick cell newly routed with no route line"
  );
  const qGrillRoute = "node pharn/floor/stage-agent.mjs route --command pharn-loop --stage pharn-grill --name '<name>' --mode quick";
  const qGrillBrief = `${BRIEF_PROMPT_PREFIX}node pharn/floor/stage-agent.mjs brief --command pharn-loop --stage pharn-grill --name '<name>' --mode quick`;
  const briefAfterInline = loopBody.replace(`${qGrillRoute}\n`, `${qGrillRoute}\n${qGrillBrief}\n`);
  assert.notEqual(briefAfterInline, loopBody, "fixture sanity: the brief landed after the quick grill's route line");
  assert.match(saOrderReasons(briefAfterInline).join("\n"), /an inline \(floor-only\) --mode cell is followed by a brief/);
  assert.match(saWiringReasons(loop, briefAfterInline).join("\n"), /--mode brief prompt lines/, "…and the wiring rule sees it");
  const qSpecBrief = `${BRIEF_PROMPT_PREFIX}node pharn/floor/stage-agent.mjs brief --command pharn-loop --stage pharn-spec --name '<name>' --mode quick`;
  const noQuickBrief = dropLine(loopBody, qSpecBrief);
  assert.match(saWiringReasons(loop, noQuickBrief).join("\n"), /--mode brief prompt lines/, "a dropped quick brief");
  assert.match(saOrderReasons(noQuickBrief).join("\n"), /needs exactly one brief prompt line/, "…and the order rule sees it");
  const qBuildBrief = `${BRIEF_PROMPT_PREFIX}node pharn/floor/stage-agent.mjs brief --command pharn-loop --stage pharn-build --name '<name>' --iteration <N> --mode quick`;
  const noMode = loopBody.replace(qBuildBrief, qBuildBrief.replace(" --mode quick", ""));
  assert.notEqual(noMode, loopBody, "fixture sanity: the quick build brief lost its --mode");
  assert.match(saWiringReasons(loop, noMode).join("\n"), /brief prompt lines/, "a quick brief without --mode");
  assert.match(saOrderReasons(noMode).join("\n"), /the brief line's --mode undefined differs/, "…and its argv differs");
  // CONTROLS: every rule ACCEPTS the real commands.
  assert.deepEqual(saWiringReasons(ship, real), []);
  assert.deepEqual(saOrderReasons(real), []);
  assert.deepEqual(saPolicyReasons(ROUTE_POLICY, ship, real), []);
  assert.deepEqual(saWiringReasons(loop, loopBody), []);
  assert.deepEqual(saOrderReasons(loopBody), []);
  assert.deepEqual(saPolicyReasons(ROUTE_POLICY, loop, loopBody), []);
  assert.deepEqual(loopRowsReasons(loopBody), []);
});

// (10) 6.28.0 — the loop's --mode lines live in ## Quick mode and nowhere else: they replace Steps 3-5's full-mode lines
// for a --quick run, and the section is where a reader of that run looks (L29: derived from the lines, never re-listed).
test("✧ STAGE_AGENT_WIRING (10) — every --mode stage-agent line of pharn-loop.md sits inside ## Quick mode", () => {
  const body = commandBody("pharn-loop.md");
  const modeText = (b) =>
    saLines(b)
      .filter((l) => (l.kind === "route" || l.kind === "brief") && l.flags.mode !== undefined)
      .map((l) => l.text)
      .sort();
  const inFile = modeText(body);
  assert.equal(inFile.length, 5, "L34: the quick spec's route and brief, the quick grill's route, the quick build's route and brief");
  assert.deepEqual(modeText(loopQuickSection(body)), inFile);
  // CONTROL (L60): a --mode line pasted after the section is seen outside it.
  const pasted = `${body}\n\`\`\`bash\n${inFile.find((t) => t.includes(" route "))}\n\`\`\`\n`;
  assert.notDeepEqual(modeText(loopQuickSection(pasted)), modeText(pasted));
});

// ── THE COMMAND BUDGET (slim-commands, 6.28.2) ───────────────────────────────────────────────────────
// WHAT IT BOUNDS. A product command's file is what the platform inserts as the prompt each time the command
// runs, and its `description:` is what every session of a user's project carries in its command listing.
// 6.28.2 cut both (the measured before/after is in `.dev/features/slim-commands/BUILD.md` and CHANGELOG
// [6.28.2]); this section keeps them cut. BOTH are budgeted, over the whole set, one rule per property:
//   R1 closure — the product command FILES on disk (`pharn-*.md` minus `pharn-dev-*`, a command's parts included,
//      6.32.0) EQUAL the table's keys: non-empty, no file without a ceiling, no ceiling without a file;
//   R2 body — each file's UTF-8 bytes, measured after folding `\r\n` to `\n` (a CRLF checkout measures what the
//      repository holds), is at most its ceiling;
//   R3 description — each description, read from the frontmatter as ONE double-quoted scalar (a description
//      this reader cannot parse fails the rule), is at most DESCRIPTION_MAX_BYTES UTF-8 bytes;
//   R4 no claim vocabulary — no description matches CLAIM_VOCABULARY_RE (claims live in the claims block);
//   R5 the claims block — each command, read with its parts, has exactly one heading line starting
//      `## What you may claim`, counted outside fenced blocks.
// THE CEILINGS ARE MEASURED, never chosen: after the slim, ceiling = the file's measured bytes + 10%, rounded
// up to the next multiple of 512. RAISING ONE IS A DELIBERATE, VISIBLE DIFF in the PR that needs it — the
// table below is the only place a ceiling lives, so a command that grows past its headroom fails here until
// someone edits this table and says why.
//
// ── Honest scope (P0) ─────────────────────────────────────────────────────────────────────────────────
// FLOOR (what a green run means): the five rules above hold for the product files on disk (fifteen at 6.32.0:
//   eleven commands and four parts).
// NOT guaranteed: it bounds BYTES and VOCABULARY, never meaning. A paraphrased claim ("ensures",
//   "guarantees") passes R4 — named follow-up `description-claim-paraphrase`. R5 proves the block EXISTS,
//   never that it is complete or true. A body within its ceiling can still have lost an instruction: the
//   other pins in this file and the review hold that, not this section. The `pharn-dev-*` commands are
//   outside it (slim-commands D8, follow-up `dev-command-slim`).

// 6.32.0 (orchestrator-context): the budget is per FILE on disk, a command's PARTS included — a part is inserted into
// the run when its command reads it, so its bytes are budgeted like a command's. pharn-loop.md and pharn-ship.md were
// re-measured after their quick and stop text moved into parts (79,903 → 43,036 and 69,421 → 35,982 bytes, after the GATE-2 review fixes); their
// rows went DOWN, and each part's row is its own measure + 10%, rounded up to 512.
const COMMAND_BYTE_CEILINGS = Object.freeze({
  "pharn-build.md": 22016,
  "pharn-grill.md": 23040,
  "pharn-loop.md": 47616,
  "pharn-loop-close.md": 34816,
  "pharn-loop-quick.md": 12288,
  "pharn-memory-promote.md": 27648,
  "pharn-plan.md": 24064,
  "pharn-regress.md": 20480,
  "pharn-review.md": 24064,
  "pharn-ship.md": 39936,
  "pharn-ship-close.md": 31232,
  "pharn-ship-quick.md": 12800,
  "pharn-spec.md": 27136,
  "pharn-test.md": 20480,
  "pharn-verify.md": 20480, // 6.40.0 regress-head-install-drift: 18519 B measured + 10% → next 512 (was 18432)
});
const DESCRIPTION_MAX_BYTES = 250;
const CLAIM_VOCABULARY_RE = /\b(FLOOR|ADVISORY)\b|NEVER means|\(P[0-7]\)/;
const CLAIMS_HEADING_RE = /^## What you may claim/;

/** `pharn-review.md`'s description before 6.28.2 — R4's control fixture, carried as a literal. */
const REVIEW_DESCRIPTION_BEFORE_SLIM =
  "Review a codebase with PHARN's code-review lenses run IN PARALLEL as subagents, then DETERMINISTICALLY merge+dedup their findings into one findings.json. Membership (which lenses run) is FLOOR (count-lenses.mjs, frontmatter not prose); the merge+dedup is FLOOR (merge-findings.mjs, keyed on enum-gated fields only). Parallel spawn + per-lens code-slicing + each lens's judgment are ADVISORY orchestration. '/pharn-review produced findings' NEVER means 'the code is correct/safe' (P0) — a lens can't decide approve (§7); the merge only assembles.";

/** The product commands on disk: `pharn-*.md` minus `pharn-dev-*`, sorted. */
function productCommandFiles() {
  return commandAndPartFiles().filter((f) => f.startsWith("pharn-") && !f.startsWith("pharn-dev-"));
}

/** One product FILE's bytes as the repository holds them — a part is budgeted on its own (R1–R4). */
function productCommandText(file) {
  return readFileSync(join(COMMANDS_DIR, file), "utf8");
}

/** R1 — offenders when the files on disk and the table's keys differ, or when there is nothing to budget. */
function budgetClosureOffenders(onDisk, table) {
  const keys = Object.keys(table);
  const out = [];
  if (onDisk.length === 0) out.push("no product command on disk — an empty set is never a vacuous pass");
  for (const f of onDisk) if (!Object.hasOwn(table, f)) out.push(`${f}: on disk, no ceiling`);
  for (const k of keys) if (!onDisk.includes(k)) out.push(`${k}: a ceiling, no file`);
  return out;
}

/** The bytes the repository holds: `\r\n` folded to `\n`, then UTF-8. */
function commandBytes(text) {
  return Buffer.byteLength(text.replace(/\r\n/g, "\n"), "utf8");
}

/** R2 — an offender when the body is over its ceiling. */
function bodyBudgetOffender(file, text, table = COMMAND_BYTE_CEILINGS) {
  const bytes = commandBytes(text);
  return bytes > table[file] ? `${file}: ${bytes} bytes > ceiling ${table[file]}` : null;
}

/** The frontmatter `description:` as one double-quoted scalar, or null when this reader cannot parse it. */
function frontmatterDescription(text) {
  const fm = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) return null;
  const lines = fm[1].split("\n").filter((l) => l.startsWith("description:"));
  if (lines.length !== 1) return null;
  const raw = lines[0].slice("description:".length).trim();
  if (!raw.startsWith('"')) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/** R3 — an offender when the description cannot be read, or is over DESCRIPTION_MAX_BYTES. */
function descriptionBudgetOffender(file, text) {
  const d = frontmatterDescription(text);
  if (d === null) return `${file}: description is not one double-quoted scalar this reader can parse`;
  const bytes = Buffer.byteLength(d, "utf8");
  return bytes > DESCRIPTION_MAX_BYTES ? `${file}: description ${bytes} bytes > ${DESCRIPTION_MAX_BYTES}` : null;
}

/** R5 — how many heading lines start `## What you may claim`, outside fenced blocks. */
function claimsHeadingCount(text) {
  const fenced = new Set(fencedLines(text).map((l) => l.line));
  return text.split(/\r?\n/).filter((t, i) => !fenced.has(i + 1) && CLAIMS_HEADING_RE.test(t)).length;
}

test("✧ BUDGET R1: the product commands on disk equal COMMAND_BYTE_CEILINGS' keys", () => {
  const onDisk = productCommandFiles();
  assert.deepEqual(budgetClosureOffenders(onDisk, COMMAND_BYTE_CEILINGS), []);
  assert.equal(onDisk.length, Object.keys(COMMAND_BYTE_CEILINGS).length);
  // CONTROLS (L60): a table missing one key, and a table with an extra key, are both red.
  const [first, ...rest] = Object.keys(COMMAND_BYTE_CEILINGS);
  const missing = Object.fromEntries(rest.map((k) => [k, COMMAND_BYTE_CEILINGS[k]]));
  assert.deepEqual(budgetClosureOffenders(onDisk, missing), [`${first}: on disk, no ceiling`]);
  const extra = { ...COMMAND_BYTE_CEILINGS, "pharn-extra.md": 512 };
  assert.deepEqual(budgetClosureOffenders(onDisk, extra), ["pharn-extra.md: a ceiling, no file"]);
  assert.notDeepEqual(budgetClosureOffenders([], COMMAND_BYTE_CEILINGS), []);
});

test("✧ BUDGET R2: every product command's body is within its measured ceiling", () => {
  const offenders = productCommandFiles()
    .map((f) => bodyBudgetOffender(f, productCommandText(f)))
    .filter(Boolean);
  assert.deepEqual(offenders, [], "raise a ceiling only as a deliberate, visible diff to COMMAND_BYTE_CEILINGS");
  // CONTROL (L60): the real body plus the bytes that put it one over its ceiling is red.
  const file = "pharn-ship.md";
  const body = productCommandText(file);
  const pad = "x".repeat(COMMAND_BYTE_CEILINGS[file] - commandBytes(body) + 1);
  assert.equal(
    bodyBudgetOffender(file, `${body}${pad}`),
    `${file}: ${COMMAND_BYTE_CEILINGS[file] + 1} bytes > ceiling ${COMMAND_BYTE_CEILINGS[file]}`
  );
  // A CRLF checkout measures what the repository holds.
  assert.equal(commandBytes(body.replace(/\n/g, "\r\n")), commandBytes(body));
});

test("✧ BUDGET R3: every product command's description is one parsable scalar of at most 250 bytes", () => {
  const offenders = productCommandFiles()
    .map((f) => descriptionBudgetOffender(f, productCommandText(f)))
    .filter(Boolean);
  assert.deepEqual(offenders, []);
  // CONTROLS (L60): bytes, not characters — a 2-byte character counts twice.
  const fm = (value) => `---\ndescription: ${value}\n---\n\nbody\n`;
  assert.equal(descriptionBudgetOffender("x.md", fm(JSON.stringify("é".repeat(125)))), null, "250 bytes passes");
  assert.equal(descriptionBudgetOffender("x.md", fm(JSON.stringify(`${"é".repeat(125)}a`))), "x.md: description 251 bytes > 250");
  assert.match(descriptionBudgetOffender("x.md", fm("plain scalar")), /not one double-quoted scalar/);
  assert.match(descriptionBudgetOffender("x.md", fm('"unterminated')), /not one double-quoted scalar/);
});

test("✧ BUDGET R4: no product command's description carries claim vocabulary", () => {
  const offenders = productCommandFiles().filter((f) => CLAIM_VOCABULARY_RE.test(frontmatterDescription(productCommandText(f)) ?? ""));
  assert.deepEqual(offenders, [], "claims belong in the command's `## What you may claim` block, not its description");
  // CONTROL (L60): the description pharn-review.md carried before 6.28.2 is red.
  assert.match(REVIEW_DESCRIPTION_BEFORE_SLIM, CLAIM_VOCABULARY_RE);
});

test("✧ BUDGET R5: every product command has exactly one `## What you may claim` block — counted over the command with its parts", () => {
  // 6.32.0: a command's claims block may sit in its close part; the rule is one block per COMMAND, never per file.
  const offenders = productCommandFiles()
    .filter((f) => !PART_FILES.has(f))
    .map((f) => [f, claimsHeadingCount(commandText(f))])
    .filter(([, n]) => n !== 1)
    .map(([f, n]) => `${f}: ${n} claims headings`);
  assert.deepEqual(offenders, []);
  // CONTROLS (L60): the real body with its heading removed, and with it doubled, are both red.
  const body = productCommandText("pharn-build.md");
  const heading = body.split(/\r?\n/).find((l) => CLAIMS_HEADING_RE.test(l));
  assert.equal(claimsHeadingCount(body.replace(`${heading}\n`, "")), 0);
  assert.equal(claimsHeadingCount(body.replace(`${heading}\n`, `${heading}\n\n${heading}\n`)), 2);
  // A heading inside a fence is not a block.
  assert.equal(claimsHeadingCount(body.replace(`${heading}\n`, `\`\`\`text\n${heading}\n\`\`\`\n`)), 0);
});

// ── SHELL-SINK (shell-sink-validation, 6.30.0) — no model-typed value derived from untrusted input reaches a shell line
//    before tested code has validated it ─────────────────────────────────────────────────────────────────────────────
//
// THE RECORDED FAILURE (P7, reproduced — `.dev/features/shell-sink-validation/PLAN.md`, "Trigger"): at 6.28.2,
// /pharn-loop S1's own slug validator, /pharn-spec's first setter line and a single-quoted `--name '<name>'` line each
// ran a command carried inside a model-derived feature name; /pharn-loop Step 6d typed git's own branch name into
// `git switch '…'`; and /pharn-ship --quick item 7 typed a description-borne ref into `git rev-parse --verify`. The fix:
// a name reaches a shell line only as `pharn/floor/feature-name.mjs` printed it — read from a file the Write tool wrote —
// Step 6d returns with a constant line, and item 7 takes no ref from the description.
//
// WHAT THIS SECTION HOLDS (L29 — each enumeration materialized once, and every rule iterates it):
//   1. SHELL_VALUES — every placeholder a product command's SHELL LINE takes, CLOSED both ways over the corpus (L36). A
//      shell line is a non-comment line of a bash/sh fence, the Agent brief-prompt line of a text fence (the part after
//      BRIEF_PROMPT_PREFIX), or an inline code span outside any fence that starts with a command word (SHELL_SPAN_RE).
//   2. NAME_ORIGINS — where each product command's `<name>` comes from, CLOSED both ways over the commands with a
//      `<name>` shell line: `validates` (where a name is born), `via` (takes it from a validating stage), `asks` /
//      `resolves` (a name the command did not receive as its argument is asked for / resolved only through the CLI).
//   3. ORDER — a validating or resolving command's pinned CLI line precedes its first `<name>` shell line, and names the
//      candidate path before it.
//   4. SENTENCES — each asks / resolves command carries its fixed sentence inside its Step 0, and not the other's.
//   5. ★ EXECUTED — every validating and resolving command's COMMITTED CLI line, under `sh -c`, over HOSTILE_CANDIDATES.
//   6. ★ EXECUTED — /pharn-loop Step 6c's committed branch block, then Step 6d's committed undo block, in throwaway git
//      repositories — with the CONTROL that makes the undo line's stated dependency visible: a checkout in between.
//   7. ★ CONTROLS — the 6.28.2 lines, carried as literals and each run once: each must run its payload, or the rule it
//      backs guards nothing (L60).
//
// HONEST SCOPE (P0): the closure sees the three line kinds above — an inline command span starting with a word outside
// SHELL_SPAN_RE, or a shell line outside any fence, is not seen (L49). Each member's CLASS is reviewed judgment, never
// checked. The sentence pins prove a sentence is PRESENT, never that a run follows it; the order pin proves TEXT order,
// never run order. The executed tests prove the committed lines and the CLI refuse hostile names without running them —
// never that a model writes the candidate with the Write tool, or re-types only the printed value.

const SHELL_SPAN_RE = /^(?:[A-Z_][A-Z0-9_]*=\S*\s+)?(?:node|git|npx|npm|cat|mkdir|test|gh)\b/;
const SINK_PLACEHOLDER_RE = /<([A-Za-z][^<>]*)>/g;

/** Every shell line of a command body, in order: [{ line, kind: "fence" | "brief" | "inline", text }]. */
function shellLines(body) {
  const out = [];
  let lang = null;
  body.split(/\r?\n/).forEach((raw, i) => {
    const fence = raw.match(/^[ \t]*```(\S*)/);
    if (fence) {
      lang = lang === null ? fence[1] : null;
      return;
    }
    const t = raw.trim();
    if (lang !== null) {
      if ((lang === "bash" || lang === "sh") && t !== "" && !t.startsWith("#")) out.push({ line: i + 1, kind: "fence", text: t });
      else if (lang === "text" && t.startsWith(BRIEF_PROMPT_PREFIX)) {
        out.push({ line: i + 1, kind: "brief", text: t.slice(BRIEF_PROMPT_PREFIX.length) });
      }
      return;
    }
    for (const m of raw.matchAll(/`([^`\n]+)`/g)) {
      const span = m[1].trim();
      if (SHELL_SPAN_RE.test(span)) out.push({ line: i + 1, kind: "inline", text: span });
    }
  });
  return out;
}

/** Every value a product command's shell line takes, and why it is out of the class or validated first. */
const SHELL_VALUES = Object.freeze({
  "<name>": "the feature slug — validated where it is born (NAME_ORIGINS), a FEATURE_SLUG_RE member from then on",
  "<route>": "a closed code token (route-token-core.mjs ROUTE_TOKEN_RE), printed by stage-agent.mjs route",
  "<N>": "the loop's own iteration counter",
  "<M>": "human argv: the --max-iter value the person typed",
  "<base sha>": "git's own rev-parse / merge-base output (hex), or the literal unknown — a producer grammar",
  "<branch>": "the name /pharn-loop Step 6c's branch block printed from the validated <name>",
  "<decision>": "a closed code token (check-loop.mjs's green token)",
  "<canon-file>": "a closed choice: one of the two memory-bank files /pharn-memory-promote Step 0 names",
  "<id>": "a closed code token (project | pharn-default), cut from check-spec.mjs's printed line",
  "<path>": "human argv: /pharn-review's explicit targets (directories are expanded in code, render-review-assignments.mjs)",
  "<target>": "the project directory /pharn-build runs validate.mjs over",
  "<resume.argv…>": "code-produced: the stage script's own printed resume.argv",
  "<chosen option's argv…>": "a registry-held flag plus the human's answer, single-quoted",
});

/** placeholder -> ["file:line", …] over [file, body] pairs. */
function placeholdersOf(pairs) {
  const found = new Map();
  for (const [file, body] of pairs) {
    for (const l of shellLines(body)) {
      for (const m of l.text.matchAll(SINK_PLACEHOLDER_RE)) {
        const k = `<${m[1]}>`;
        if (!found.has(k)) found.set(k, []);
        found.get(k).push(`${file}:${l.line}`);
      }
    }
  }
  return found;
}

function shellValueOffenders(found) {
  const out = [];
  for (const [k, sites] of found) {
    if (!Object.hasOwn(SHELL_VALUES, k)) out.push(`${k} — not a SHELL_VALUES member (${sites.slice(0, 3).join(", ")})`);
  }
  for (const k of Object.keys(SHELL_VALUES)) if (!found.has(k)) out.push(`${k} — a member no shell line takes`);
  return out;
}

// Per COMMAND (6.32.0): a part's shell lines are read inside its command's family text, never as a command of its own.
const productPairs = () =>
  productCommandFiles()
    .filter((f) => !PART_FILES.has(f))
    .map((f) => [f, commandBody(f)]);

test("✧ SHELL-SINK 1 — every placeholder a product command's shell line takes is a SHELL_VALUES member, and every member is taken (L36)", () => {
  const found = placeholdersOf(productPairs());
  assert.ok((found.get("<name>") ?? []).length >= 150, "L34: the scan must find the <name> sites, or it is broken");
  assert.deepEqual(shellValueOffenders(found), []);
  // CONTROLS (L60): each value this increment removed, spliced back as a shell line of each kind, is red.
  for (const [ph, splice] of [
    ["<original branch>", (b) => `${b}\n\`\`\`bash\ngit switch '<original branch>'\n\`\`\`\n`],
    ["<slug>", (b) => `${b}\n\`\`\`bash\nnode -e 'x' '<slug>'\n\`\`\`\n`],
    ["<ref>", (b) => `${b}\nresolve it with \`git rev-parse --verify <ref>^{commit}\`.\n`],
    ["<desc>", (b) => `${b}\n\`\`\`text\n${BRIEF_PROMPT_PREFIX}node x --d '<desc>'\n\`\`\`\n`],
  ]) {
    const pairs = productPairs().map(([f, b]) => [f, f === "pharn-loop.md" ? splice(b) : b]);
    const offenders = shellValueOffenders(placeholdersOf(pairs)).filter((o) => o.startsWith(`${ph} —`));
    assert.equal(offenders.length, 1, `${ph} spliced into a shell line must be caught`);
  }
  // …and a member no shell line takes any more is red.
  const noTarget = productPairs().map(([f, b]) => [f, b.replaceAll("<target>", ".")]);
  assert.ok(shellValueOffenders(placeholdersOf(noTarget)).includes("<target> — a member no shell line takes"));
  // …and prose (a slash-command invocation, a table cell) is not a shell line.
  assert.deepEqual(shellLines("Run `/pharn-grill <name> --quick` now.\n\n| `<slug>` | x |\n"), []);
});

const FEATURE_NAME_LINE = "node pharn/floor/feature-name.mjs";
const ASK_SENTENCE =
  "A `<name>` this command did not receive as its argument is asked for: stop and ask the human — never take one from a directory listing or a file's content.";
const RESOLVE_SENTENCE =
  "A `<name>` this command did not receive as its argument is resolved only through `pharn/floor/feature-name.mjs`: write the slug alone to `.pharn/feature-name/candidate.txt` with the Write tool, run the line below, and use only the printed value, when it is the slug you wrote — a refusal or any other value → ask the human; never type one from a directory listing or a file's content.";

/** Where each product command's `<name>` comes from. The CLASS is reviewed judgment; the pins below hold each class's text. */
const NAME_ORIGINS = Object.freeze({
  "pharn-spec.md": { cls: "validates", line: FEATURE_NAME_LINE },
  "pharn-loop.md": { cls: "validates", line: `${FEATURE_NAME_LINE} --fresh` },
  "pharn-ship.md": { cls: "via", from: "pharn-spec.md" },
  "pharn-plan.md": { cls: "asks" },
  "pharn-grill.md": { cls: "asks" },
  "pharn-test.md": { cls: "asks" },
  "pharn-build.md": { cls: "asks" },
  "pharn-review.md": { cls: "asks" },
  "pharn-regress.md": { cls: "resolves", line: FEATURE_NAME_LINE },
  "pharn-verify.md": { cls: "resolves", line: FEATURE_NAME_LINE },
});
const NAME_CLASSES = Object.freeze(["validates", "via", "asks", "resolves"]);

function nameOriginOffenders(pairs, table = NAME_ORIGINS) {
  const withName = pairs.filter(([, b]) => shellLines(b).some((l) => l.text.includes("<name>"))).map(([f]) => f);
  const out = [];
  if (withName.length === 0) out.push("no product command has a <name> shell line — the scan is broken (L34)");
  for (const f of withName) if (!Object.hasOwn(table, f)) out.push(`${f}: a <name> shell line, no NAME_ORIGINS entry`);
  for (const f of Object.keys(table)) if (!withName.includes(f)) out.push(`${f}: an entry, no <name> shell line`);
  for (const [f, o] of Object.entries(table)) if (!NAME_CLASSES.includes(o.cls)) out.push(`${f}: unknown class ${o.cls}`);
  return out;
}

test("✧ SHELL-SINK 2 — NAME_ORIGINS is closed over the product commands with a `<name>` shell line, both ways", () => {
  assert.deepEqual(nameOriginOffenders(productPairs()), []);
  assert.equal(Object.keys(NAME_ORIGINS).length, 10, "L34: the classified set is counted, not merely iterated");
  // CONTROLS (L60): a command that gains a <name> shell line with no entry, and an entry dropped, are both red.
  const gained = productPairs().map(([f, b]) => [f, f === "pharn-memory-promote.md" ? `${b}\n\`\`\`bash\nx '<name>'\n\`\`\`\n` : b]);
  assert.deepEqual(nameOriginOffenders(gained), ["pharn-memory-promote.md: a <name> shell line, no NAME_ORIGINS entry"]);
  const rest = Object.fromEntries(Object.entries(NAME_ORIGINS).filter(([f]) => f !== "pharn-plan.md"));
  assert.deepEqual(nameOriginOffenders(productPairs(), rest), ["pharn-plan.md: a <name> shell line, no NAME_ORIGINS entry"]);
});

/** null when `line` is pinned once in a bash fence, carries no placeholder, follows the candidate path and precedes the
 *  first `<name>` shell line; else why. */
function cliOrderReason(body, line) {
  const shell = shellLines(body);
  const at = shell.filter((l) => l.kind === "fence" && l.text === line);
  if (at.length !== 1) return `the pinned line must appear exactly once in a bash fence (found ${at.length})`;
  if (/<[A-Za-z]/.test(line)) return "the pinned line must carry no placeholder";
  const firstName = shell.find((l) => l.text.includes("<name>"));
  if (!firstName) return "no <name> shell line";
  if (!(at[0].line < firstName.line)) return `the pinned line (${at[0].line}) must precede the first <name> shell line (${firstName.line})`;
  const cand = body.split(/\r?\n/).findIndex((t) => t.includes(CANDIDATE_REL)) + 1;
  if (cand === 0 || !(cand < at[0].line)) return "the candidate path must be named before the pinned line";
  return null;
}

const CLI_LINE_COMMANDS = Object.entries(NAME_ORIGINS).filter(([, o]) => o.cls === "validates" || o.cls === "resolves");

// The Write tool REFUSES a link at the path (measured 2026-09-27) and names the link's target as the path to write
// instead; a model that followed that would write wherever a planted link points. Each command that writes a
// candidate carries this rule — PRESENCE ONLY, never that a run obeys it.
const WRITE_REFUSAL_RULE = "never Read it and never write to any other path it names";
// The CLI leaves a DIRECTORY at the candidate path in place, so "run once, write again" cannot clear it: each command
// says to stop there (ask the human; the unattended loop stops `blocked: no-slug`). PRESENCE ONLY.
const DIRECTORY_RULE = "A directory at that path is never removed: stop";

test("✧ SHELL-SINK 3 — each validating and resolving command runs the CLI before its first `<name>` shell line", () => {
  assert.equal(CLI_LINE_COMMANDS.length, 4, "L34: spec, loop, regress, verify");
  for (const [file, o] of CLI_LINE_COMMANDS) assert.equal(cliOrderReason(commandBody(file), o.line), null, file);
  for (const [file] of CLI_LINE_COMMANDS) {
    const body = commandBody(file);
    assert.ok(body.replace(/\s+/g, " ").includes(WRITE_REFUSAL_RULE), `${file}: the Write-refusal rule`);
    // CONTROL: the rule removed is seen.
    const without = body.replace(looseSentenceRe(WRITE_REFUSAL_RULE), "");
    assert.notEqual(without, body, `${file}: precondition — the rule is found where it is removed`);
    assert.equal(without.replace(/\s+/g, " ").includes(WRITE_REFUSAL_RULE), false);
    assert.ok(body.replace(/\s+/g, " ").includes(DIRECTORY_RULE), `${file}: the directory rule`);
    const noDir = body.replace(looseSentenceRe(DIRECTORY_RULE), "");
    assert.notEqual(noDir, body, `${file}: precondition — the directory rule is found where it is removed`);
    assert.equal(noDir.replace(/\s+/g, " ").includes(DIRECTORY_RULE), false);
  }
  // CONTROLS (L60): the line dropped, and moved below the first <name> shell line, are each red — for every member.
  for (const [file, o] of CLI_LINE_COMMANDS) {
    const body = commandBody(file);
    const lines = body.split("\n");
    const idx = lines.findIndex((t) => t.trim() === o.line);
    const dropped = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join("\n");
    assert.match(cliOrderReason(dropped, o.line), /exactly once/, `${file}: a dropped line is red`);
    const moved = `${dropped}\n\n\`\`\`bash\n${o.line}\n\`\`\`\n`;
    assert.match(cliOrderReason(moved, o.line), /must precede/, `${file}: a line below the first <name> line is red`);
  }
});

test("✧ SHELL-SINK 4 — a `via` command takes its name from a validating stage and names the CLI before its first `<name>` shell line", () => {
  const via = Object.entries(NAME_ORIGINS).filter(([, o]) => o.cls === "via");
  assert.equal(via.length, 1, "L34");
  const reason = (body) => {
    const firstName = shellLines(body).find((l) => l.text.includes("<name>"));
    const mention = body.split(/\r?\n/).findIndex((t) => t.includes("pharn/floor/feature-name.mjs")) + 1;
    return mention > 0 && firstName && mention < firstName.line ? null : "the CLI is not named before the first <name> shell line";
  };
  for (const [file, o] of via) {
    assert.equal(NAME_ORIGINS[o.from].cls, "validates", `${file}: its source must validate`);
    assert.equal(reason(commandBody(file)), null, file);
    // CONTROL: the mention removed is red.
    assert.notEqual(reason(commandBody(file).replaceAll("pharn/floor/feature-name.mjs", "x")), null);
  }
});

/** A sentence may wrap across indented lines, so it is matched with any run of whitespace between its words. */
const looseSentenceRe = (s) => new RegExp(escapeRe(s).replace(/ /g, "\\s+"));

/** The text of a command's `## Step 0` section, whitespace-collapsed, or null. */
function stepZeroText(body) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => /^## Step 0\b/.test(l));
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  return lines
    .slice(start, end === -1 ? undefined : end)
    .join("\n")
    .replace(/\s+/g, " ");
}

function sentenceReason(file, body) {
  const cls = NAME_ORIGINS[file].cls;
  const z = stepZeroText(body);
  if (z === null) return "no ## Step 0";
  const has = (s) => z.includes(s.replace(/\s+/g, " "));
  const [own, other] = cls === "asks" ? [ASK_SENTENCE, RESOLVE_SENTENCE] : [RESOLVE_SENTENCE, ASK_SENTENCE];
  if (!has(own)) return `Step 0 lacks its ${cls} sentence`;
  if (has(other)) return "Step 0 carries the other class's sentence";
  return null;
}

test("✧ SHELL-SINK 5 — each asks / resolves command carries its fixed sentence in Step 0 (PRESENCE ONLY — never that a run follows it)", () => {
  const set = Object.entries(NAME_ORIGINS).filter(([, o]) => o.cls === "asks" || o.cls === "resolves");
  assert.equal(set.length, 7, "L34: the seven commands that take a name");
  for (const [file] of set) assert.equal(sentenceReason(file, commandBody(file)), null, file);
  // CONTROLS (L60), per member: the sentence deleted is red, and swapped for the other class's is red.
  const loose = looseSentenceRe;
  for (const [file, o] of set) {
    const body = commandBody(file);
    const [own, other] = o.cls === "asks" ? [ASK_SENTENCE, RESOLVE_SENTENCE] : [RESOLVE_SENTENCE, ASK_SENTENCE];
    assert.match(body, loose(own), `${file}: precondition — the sentence is found where it is removed (L34)`);
    assert.match(sentenceReason(file, body.replace(loose(own), "")) ?? "", /lacks/, `${file}: deleted is red`);
    assert.match(sentenceReason(file, body.replace(loose(own), other)) ?? "", /lacks/, `${file}: swapped for the other is red`);
    assert.match(sentenceReason(file, `${body.replace(/^## Step 1\b/m, `${other}\n\n## Step 1`)}`) ?? "", /other/, `${file}: both is red`);
  }
});

/** Every shape a committed CLI line must refuse without running it (grill G-H) — written byte for byte to the candidate. */
const HOSTILE_CANDIDATES = Object.freeze([
  "x$(touch PWNED)",
  "x`touch PWNED`",
  "fix;touch${IFS}PWNED;x",
  "fix'$(touch PWNED)'",
  'fix"$(touch PWNED)"',
  "fix\ntouch PWNED",
  "fix-login\r\n",
  "fix login",
  "-rf",
  "..",
  "a/b",
  "Fix-login",
  "fix\u0000login",
  "﻿fix-login",
  "a".repeat(65),
  "",
]);

/** A throwaway project whose pharn/floor is this tree's, reached through a symlink. */
function nameFixture() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "shell-sink-")));
  mkdirSync(join(dir, "pharn", "features"), { recursive: true });
  symlinkSync(join(REPO_ROOT, "pharn", "floor"), join(dir, "pharn", "floor"), "dir");
  const cand = join(dir, ...CANDIDATE_REL.split("/"));
  return {
    dir,
    put(bytes) {
      mkdirSync(dirname(cand), { recursive: true });
      writeFileSync(cand, bytes);
    },
    candidatePresent: () => existsSync(cand),
    sh: (line) => spawnSync("sh", ["-c", line], { cwd: dir, encoding: "utf8", timeout: 30000 }),
    done: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("★ SHELL-SINK 6 — every validating and resolving command's COMMITTED line refuses each hostile candidate and runs none of it", () => {
  const fx = nameFixture();
  try {
    for (const [file, o] of CLI_LINE_COMMANDS) {
      const committed = shellLines(commandBody(file)).filter((l) => l.kind === "fence" && l.text === o.line);
      assert.equal(committed.length, 1, `${file}: its committed line, read from the command file`);
      const line = committed[0].text;
      for (const bytes of HOSTILE_CANDIDATES) {
        fx.put(bytes);
        const r = fx.sh(line);
        assert.equal(r.status, 2, `${file} over ${JSON.stringify(bytes)}: ${r.stdout}${r.stderr}`);
        assert.equal(r.stdout, "", `${file}: no name is printed`);
        assert.equal(existsSync(join(fx.dir, "PWNED")), false, `${file}: a command in the candidate ran`);
        assert.equal(fx.candidatePresent(), false, `${file}: the candidate is consumed`);
      }
      fx.put("demo\n");
      const ok = fx.sh(line);
      assert.equal(ok.status, 0, `${file}: ${ok.stderr}`);
      assert.equal(ok.stdout, "demo\n", `${file}: a valid candidate prints itself`);
    }
    // The loop's committed --fresh line picks the first absent feature directory; the plain line never does.
    mkdirSync(join(fx.dir, "pharn", "features", "demo"));
    fx.put("demo");
    assert.equal(fx.sh(NAME_ORIGINS["pharn-loop.md"].line).stdout, "demo-2\n");
    fx.put("demo");
    assert.equal(fx.sh(NAME_ORIGINS["pharn-spec.md"].line).stdout, "demo\n");
  } finally {
    fx.done();
  }
});

/** A throwaway git repository with a tracked `a` and a tracked file literally named `-`. */
function gitFixture({ reflog = true } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "shell-sink-git-")));
  const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  if (!reflog) git("config", "core.logAllRefUpdates", "false");
  git("config", "user.email", "t@example.invalid");
  git("config", "user.name", "t");
  git("config", "commit.gpgsign", "false");
  if (!reflog) rmSync(join(dir, ".git", "logs"), { recursive: true, force: true });
  writeFileSync(join(dir, "a"), "a\n");
  writeFileSync(join(dir, "-"), "committed\n");
  git("add", "-A");
  assert.equal(git("commit", "-q", "-m", "seed").status, 0, "fixture: the seed commit");
  const base = git("rev-parse", "HEAD").stdout.trim();
  const head = () => git("symbolic-ref", "--short", "-q", "HEAD").stdout.trim() || `detached@${git("rev-parse", "HEAD").stdout.trim()}`;
  const hasBranch = (b) => git("show-ref", "--verify", "--quiet", `refs/heads/${b}`).status === 0;
  const sh = (cmd) => spawnSync("sh", ["-c", cmd], { cwd: dir, encoding: "utf8" });
  /** What a failed Step 6c leaves before Step 6d: a staged change and its NUL-separated stage list. */
  const stageFailed = () => {
    writeFileSync(join(dir, "a"), "changed by the run\n");
    git("add", "a");
    mkdirSync(join(dir, ".pharn", "pharn-loop", "demo"), { recursive: true });
    writeFileSync(join(dir, ".pharn", "pharn-loop", "demo", "stage.list"), "a\0");
  };
  return { dir, git, base, head, hasBranch, sh, stageFailed, done: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Step 6c's committed branch block and Step 6d's committed undo block, read out of pharn-loop.md. */
function loopBlocks() {
  const body = commandBody("pharn-loop.md");
  const branch = fencedLines(body)
    .map((l) => l.text.trim())
    .filter((t) => t.startsWith("b='pharn-loop/<name>'"));
  const undo = fencedBlocks(body).filter((b) => b.lines.some((l) => l.text.trim() === "git checkout - --"));
  assert.equal(branch.length, 1, "pharn-loop.md carries one Step 6c branch block");
  assert.equal(undo.length, 1, "pharn-loop.md carries one Step 6d undo block");
  const undoText = undo[0].lines.map((l) => l.text.trim()).join("\n");
  assert.deepEqual([...new Set([...undoText.matchAll(SINK_PLACEHOLDER_RE)].map((m) => m[1]))].sort(), ["branch", "name"]);
  return {
    branch: () => branch[0].replaceAll("<name>", "demo"),
    undo: (printed) => undoText.replaceAll("<name>", "demo").replaceAll("<branch>", printed),
  };
}

const HOSTILE_BRANCH = "fix';touch${IFS}PWNED_BRANCH;'x";
const STEP_6D_BOUND = "It is correct only because nothing checks out between Step 6c's branch block and this line";

test("★ SHELL-SINK 7 — Step 6c's branch block then Step 6d's undo block return to the original checkout and type no git output", () => {
  const blocks = loopBlocks();
  // A hostile original branch name: git accepts it, the old line ran it, the committed block never types it.
  let g = gitFixture();
  try {
    assert.equal(g.git("check-ref-format", "--branch", HOSTILE_BRANCH).status, 0, "precondition: git accepts the name");
    assert.equal(g.git("switch", "-q", "-c", HOSTILE_BRANCH).status, 0);
    const made = g.sh(blocks.branch());
    assert.equal(made.status, 0, made.stderr);
    const printed = made.stdout.trim();
    assert.equal(printed, "pharn-loop/demo");
    g.stageFailed();
    g.sh(blocks.undo(printed));
    assert.equal(existsSync(join(g.dir, "PWNED_BRANCH")), false, "the undo block ran a command from a branch name");
    assert.equal(g.head(), HOSTILE_BRANCH, "back on the original branch");
    assert.equal(g.hasBranch("pharn-loop/demo"), false, "the new branch is deleted");
    assert.equal(g.git("diff", "--cached", "--name-only").stdout, "", "the run's list is unstaged");
    assert.equal(readFileSync(join(g.dir, "a"), "utf8"), "changed by the run\n", "and its change stays in the working tree");
  } finally {
    g.done();
  }
  // A detached original checkout returns to its commit, still detached.
  g = gitFixture();
  try {
    g.git("switch", "-q", "--detach", "HEAD");
    const printed = g.sh(blocks.branch()).stdout.trim();
    g.stageFailed();
    g.sh(blocks.undo(printed));
    assert.equal(g.head(), `detached@${g.base}`);
    assert.equal(g.hasBranch("pharn-loop/demo"), false);
  } finally {
    g.done();
  }
  // No HEAD reflog: the line refuses and restores nothing — a locally edited tracked file named `-` survives.
  g = gitFixture({ reflog: false });
  try {
    g.git("switch", "-q", "-c", "orig");
    const printed = g.sh(blocks.branch()).stdout.trim();
    writeFileSync(join(g.dir, "-"), "LOCAL EDIT\n");
    g.stageFailed();
    g.sh(blocks.undo(printed));
    assert.equal(readFileSync(join(g.dir, "-"), "utf8"), "LOCAL EDIT\n", "the `--` keeps git from reading `-` as a file");
    assert.equal(g.head(), "pharn-loop/demo", "the checkout stays on the new branch, which the summary reports");
  } finally {
    g.done();
  }
});

test("★ SHELL-SINK 7 CONTROL — the stated dependency, made visible: a checkout between the two blocks sends the undo to the WRONG place", () => {
  const blocks = loopBlocks();
  const g = gitFixture();
  try {
    g.git("switch", "-q", "-c", "orig");
    const printed = g.sh(blocks.branch()).stdout.trim();
    g.git("switch", "-q", "-c", "intervening"); // e.g. a commit hook that checks out, or a second session in this tree
    g.stageFailed();
    g.sh(blocks.undo(printed));
    assert.equal(g.head(), "pharn-loop/demo", "`-` names the checkout before the intervening one, not the original");
    assert.notEqual(g.head(), "orig");
  } finally {
    g.done();
  }
  // …which is why the command states the bound where the line is (presence pinned; a run's compliance is advisory).
  const body = commandBody("pharn-loop.md");
  const stated = (b) => b.replace(/\s+/g, " ").includes(STEP_6D_BOUND);
  assert.ok(stated(body), "pharn-loop.md Step 6d states its bound");
  assert.notEqual(body.replace(looseSentenceRe(STEP_6D_BOUND), ""), body, "precondition: the sentence is found where it is removed");
  assert.equal(stated(body.replace(looseSentenceRe(STEP_6D_BOUND), "")), false, "CONTROL: the pin sees its removal");
});

// The 6.28.2 lines, verbatim — CONTROLS only. Each is run once, inside a throwaway directory, with a hostile value.
const OLD_S1_LINE = "node -e 'process.exit(/^[a-z0-9][a-z0-9-]{0,63}$/.test(process.argv[1]) ? 0 : 1)' '<slug>'";
const OLD_SPEC_SETTER =
  "node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-spec.md --target pharn/features/<name>/SPEC.md";
const OLD_6D_LINE = "git switch '<original branch>'";
const OLD_QUICK_REF_LINE = "git rev-parse --verify <ref>^{commit}";

test("★ SHELL-SINK 8 CONTROLS — each 6.28.2 line runs its payload (else the rules above guard nothing), and the removed ones are gone", () => {
  for (const [line, ph, value] of [
    [OLD_S1_LINE, "<slug>", "x'$(touch PWNED)'"],
    [OLD_SPEC_SETTER, "<name>", "fix-login;touch${IFS}PWNED;x"],
    [OLD_6D_LINE, "<original branch>", HOSTILE_BRANCH.replace("PWNED_BRANCH", "PWNED")],
    [OLD_QUICK_REF_LINE, "<ref>", "HEAD;touch${IFS}PWNED;:"],
  ]) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "shell-sink-old-")));
    try {
      spawnSync("sh", ["-c", line.replace(ph, value)], { cwd: dir, encoding: "utf8", timeout: 30000 });
      assert.equal(existsSync(join(dir, "PWNED")), true, `the 6.28.2 line must run the payload — else this control is vacuous: ${line}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  // Plain `git checkout -` (no `--`) with no HEAD reflog reads `-` as a FILE and overwrites a local edit, exit 0.
  const g = gitFixture({ reflog: false });
  try {
    g.git("switch", "-q", "-c", "orig");
    g.git("switch", "-q", "-c", "pharn-loop/demo");
    writeFileSync(join(g.dir, "-"), "LOCAL EDIT\n");
    const r = g.sh("git checkout -");
    assert.equal(r.status, 0);
    assert.equal(readFileSync(join(g.dir, "-"), "utf8"), "committed\n", "plain `-` must lose the edit — else the `--` pin guards nothing");
  } finally {
    g.done();
  }
  // The removed forms are absent from the commands that carried them.
  assert.ok(!commandBody("pharn-loop.md").includes(OLD_S1_LINE), "pharn-loop.md still carries the 6.28.2 S1 line");
  assert.ok(!commandBody("pharn-loop.md").includes(OLD_6D_LINE), "pharn-loop.md still types <original branch>");
  assert.ok(!commandBody("pharn-ship.md").includes("<ref>^{commit}"), "pharn-ship.md still types a description-borne ref");
});

// ── WRITE_TOOL_RULE (6.35.1, build-writes-through-tools) ─────────────────────────────────────────────────
// THE RECORDED FAILURE (P7): a routed /pharn-build agent wrote the user's code through 48 Bash calls and no Edit, so
// the writes-scope guard judged none of those writes, and a `prettier --write` over two directories reformatted a
// pinned AC test (.dev/measurements/loop-wall-clock-2026-10-05.md). The brief's rule 4 carries the routed-agent copy
// (stage-agent-core.test.mjs pins it); a person or an inline orchestrator runs the COMMAND and never sees the brief,
// so each command that writes the user's files says it in its own Step 3. PRESENCE only, inside that step: it never
// proves the rule is obeyed (no shell command is parsed — LIMITS.md §6). Self-contained so a stacking merge appends.
const WRITE_TOOL_RULE_SITES = Object.freeze({
  "pharn-build.md": [
    "Author files in the project with the write tools",
    "never through Bash",
    "Keep scratch under `.pharn/`",
    "named one by one — never a directory, a glob or a `git status` list",
  ],
  "pharn-test.md": ["with the Write or Edit tool, never through Bash", "never route\n  one through Bash"],
});

/** The text of `## Step 3 …` up to the next `## ` heading, or null when the file has no such step. */
function writeToolStep3(text) {
  const start = text.search(/^## Step 3\b/m);
  if (start < 0) return null;
  const rest = text.slice(start + 1);
  const next = rest.search(/^## /m);
  return next < 0 ? text.slice(start) : text.slice(start, start + 1 + next);
}

const writeToolRuleHeld = (step, phrases) => typeof step === "string" && phrases.every((p) => step.includes(p));

test("WRITE_TOOL_RULE — each command that writes the user's files says, in its Step 3, to write with the write tools", () => {
  for (const [file, phrases] of Object.entries(WRITE_TOOL_RULE_SITES)) {
    const step = writeToolStep3(readFileSync(join(COMMANDS_DIR, file), "utf8"));
    assert.ok(step !== null, `${file}: no ## Step 3`);
    assert.ok(writeToolRuleHeld(step, phrases), `${file}: its ## Step 3 lacks the write-tool rule`);
    // Non-vacuity (L60): the same step with each phrase removed fails the SAME predicate.
    for (const p of phrases) assert.equal(writeToolRuleHeld(step.replace(p, ""), phrases), false, `${file}: control without "${p}"`);
  }
  assert.equal(Object.keys(WRITE_TOOL_RULE_SITES).length, 2, "the two commands that write the user's files (L34)");
});

// ── INSTRUCTION_FILE_RULE (6.38.1, plan-instruction-file-rule) ──────────────────────────────────────────────
// THE RECORDED FAILURE (P7): in pharn-starter the harness attached 634,379 B of instruction files (CLAUDE.md 418,456 B,
// 14 `.claude/rules/*.md` 213,290 B, MEMORY.md 2,633 B) to every stage agent, about half of each agent's ~302k-token
// first request (.dev/measurements/loop-wall-clock-2026-10-05.md §3, §10). The user reports, unverified here, that
// nearly every PLAN there named CLAUDE.md in `## Files` and added a per-feature section. So each product command that
// AUTHORS a PLAN carries one advisory rule in its Step 3, under the anchor below. The AUTHOR set is derived from each
// command's `writes:` frontmatter (L6), never listed, and the rule is closed both ways (L36): in every author's Step 3,
// in no other product command file. PRESENCE only: it never proves a plan obeys the rule. Self-contained so a stacking
// merge appends.
const INSTRUCTION_FILE_ANCHOR = "Instruction files load into every agent";

/** A command's `writes:` frontmatter entries; [] without the key. Throws on a value that is not a one-line JSON array. */
function frontmatterWrites(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  const line = fm && fm[1].match(/^writes:(.*)$/m);
  if (!line) return [];
  const value = JSON.parse(line[1].trim());
  if (!Array.isArray(value)) throw new Error(`writes: is not an array: ${line[1]}`);
  return value;
}

const authorsPlan = (text) => frontmatterWrites(text).some((w) => typeof w === "string" && w.endsWith("/PLAN.md"));

/** Every rule break over `{file: text}`: an author whose ## Step 3 lacks the anchor, or a non-author carrying it. */
function instructionFileRuleOffenders(texts) {
  const offenders = [];
  for (const [file, text] of Object.entries(texts)) {
    const step = writeToolStep3(text);
    if (authorsPlan(text)) {
      if (step === null || !step.includes(INSTRUCTION_FILE_ANCHOR)) offenders.push(`${file}: authors a PLAN; its ## Step 3 lacks the rule`);
    } else if (text.includes(INSTRUCTION_FILE_ANCHOR)) offenders.push(`${file}: carries the rule but authors no PLAN`);
  }
  return offenders;
}

test("INSTRUCTION_FILE_RULE — every product command that authors a PLAN carries the instruction-file rule in its Step 3, and no other", () => {
  const files = readdirSync(COMMANDS_DIR).filter((f) => /^pharn-.+\.md$/.test(f) && !f.startsWith("pharn-dev-"));
  const texts = Object.fromEntries(files.map((f) => [f, readFileSync(join(COMMANDS_DIR, f), "utf8")]));
  const authors = files.filter((f) => authorsPlan(texts[f]));
  // L34: the derived set is not empty, and it holds the one command known to write PLAN.md.
  assert.ok(authors.includes("pharn-plan.md"), `derived AUTHOR set ${JSON.stringify(authors)} lacks pharn-plan.md`);
  assert.deepEqual(instructionFileRuleOffenders(texts), []);

  // Non-vacuity (L60): one control per asserted property, each run through the same predicate.
  const author = "pharn-plan.md";
  const consumer = files.find((f) => !authors.includes(f) && PART_FILES.has(f));
  assert.ok(consumer, "no part file to run the closure control on");
  const without = texts[author].replaceAll(INSTRUCTION_FILE_ANCHOR, "");
  const one = (t) => instructionFileRuleOffenders(t).length;
  assert.equal(one({ [author]: without }), 1, "presence: the author without the rule");
  assert.equal(one({ [author]: `${without}\n${INSTRUCTION_FILE_ANCHOR}\n` }), 1, "placement: the rule outside Step 3");
  assert.equal(one({ [author]: texts[author].replace(/^## Step 3\b/m, "## Stage 3") }), 1, "an unfound Step 3 never passes");
  assert.equal(one({ [consumer]: `${texts[consumer]}\n${INSTRUCTION_FILE_ANCHOR}\n` }), 1, "closure: a non-author with the rule");
  assert.equal(one({ "x.md": '---\nwrites: ["pharn/features/<name>/PLAN.md"]\n---\n\n## Step 3 — x\n' }), 1, "derivation");
  assert.throws(() => frontmatterWrites('---\nwrites:\n  ["a"]\n---\n'), SyntaxError, "a multi-line writes: is refused");
});
