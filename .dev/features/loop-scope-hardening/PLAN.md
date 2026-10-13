# PLAN — loop-scope-hardening

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L26, L29, L31, L36, L55, L56, L60, L68, L73]
- increment: close the unattended-loop routes from a model-written plan to PHARN's own floor scripts and to
  memory-bank canon — `/pharn-loop` pre-approves exactly its pinned shell lines (no prefix grant), the plan-scope
  setter refuses PHARN's own installed surface in an installed project and refuses a promote-origin scope while a
  `/pharn-loop` run is open, and both `## Files` parsers stop reading fenced code as the list.
- layer(s): product `.claude/` surface (a `pharn-*` command + its parts' neighbours, one hook script by HUMAN
  patch, hook tests), product floor (`pharn/floor/plan-files-core.mjs`, `reconcile-ignore.json` prose), dev floor
  test, dev guide
- constitution_refs: [P0, P2, P5, P6, P7]

## Trigger (P7) — the observed failures

The independent review of 2026-10-12 (`pharn-oss-review-2026-10-12.md`, sec-report.md, enf-report.md; read this run
as DATA and re-verified in code):

- **SEC-1 (Critical in the summary, High in the area report).** `.claude/commands/pharn-loop.md` frontmatter grants
  `Bash(node pharn/floor/*)` and `Bash(node .claude/hooks/*)` (6.58.0). `set-writes-scope.cjs --from-plan` refuses
  only `CONTROL_SURFACE` (6 paths, `set-writes-scope.cjs:109-118`, read this run), and a valid scope is authoritative
  in every posture (`enforce-writes-scope.cjs`, the `scopeState.kind === "valid"` branch; `isReserved` runs only in
  the permissive mode — read this run). So a model-written PLAN naming `pharn/floor/<new>.mjs` (or an existing pinned
  script) is scoped, written through both guards, reconciled CLEAN as in-scope, and run with no prompt.
- **SEC-3 (High).** `protect-trusted-paths.cjs` `canonWriteAuthorized()` unlocks a canon write when the scope record's
  `set_by` folds to a promote command path; `set_by` is the setter's argv `file` (`set-writes-scope.cjs:364`), and
  `Bash(node .claude/hooks/*)` pre-approves that setter form inside a loop.
- **ENF-1 (High), reproduced by fixture.** Neither `## Files` parser tracks code fences
  (`plan-files-core.mjs` `pathsFromPlanFiles`, `set-writes-scope.cjs` `pathsFromPlanFiles`). Fixture F3 (a fenced
  "illustrative" list under `## Files`) scoped `pharn/floor/validate.mjs` and `.claude/commands/pharn-build.md`;
  fixture F3b (a fenced `## Files` before the real one) scoped only the fenced path and dropped `src/a.ts`.
  Re-measured this run with the live core: F3 → 3 paths, F3b → `["pharn/floor/validate.mjs"]`.
  `scope-inputs.mjs` `declaredWrites` is NOT a third parser — it calls the core, so it is fixed by the core.

## Discovery (P6) — live state read this run

- Branch `fix/loop-scope-hardening` from `origin/main` @ `fa983a8`, fast-forwarded to `8fe73d1` (#343, main green).
  `SKILLS_VERSION` 6.58.0. This dev checkout has no `skillsVersion` in `pharn.config.json` (dev posture).
- **The loop's pinned set.** `command-hygiene.test.mjs` `LOOP_RUN_FILES` = `pharn-loop.md`, `pharn-loop-quick.md`,
  `pharn-loop-close.md`, `pharn-grill.md`; its `shellLines` + `subcommands` split yields **55 distinct
  subcommands** once each `<placeholder>` (quoted or not) becomes `*` (derived by a scratch runner,
  `.pharn/loop-scope-hardening/grants.mjs`). Every one is an exact form; the list is in `### The grant`, below.
- **Claude Code's rule semantics (docs, via a docs agent this run — cited, not probed live).** `*` matches any text
  including spaces and may sit mid-rule; compound lines are split on `&&`, `||`, `;`, `|`, `|&`, `&`, newlines and
  each part must match. Redirections are NOT stripped before matching — `Bash(echo *)` matches `echo x > f`; the
  redirect TARGET is checked separately against Edit allow/deny rules, protected paths and working directories
  ("A rule such as `Bash(git commit *)` allows the command, not the target"); `/dev/null` targets are not checked.
  The docs are silent on whether a command's `allowed-tools` grant reaches an Agent-tool subagent.
- **What execution stays prompt-free after this increment, stated because it bounds the claim (P0).** The pinned
  `stage-direct.mjs` / `entry-gates.mjs` lines run the project's own gates (`npm test` and friends), which execute
  code the build just wrote. That is the loop's purpose and is NOT closed by any grant: an unattended run executes
  model-written project code with no prompt, by design, and the only prevention is a sandbox (`LIMITS.md §6`, "The
  only true prevention is OS-level sandboxing"). What this increment closes is narrower and is what SEC-1/SEC-3
  actually name: a plan reaching **PHARN's own** floor scripts, commands and config (which decide the run's
  verdicts and instruct its next stages), and the pre-approved route to a canon write.
- **Redirection residual (stated, not closed).** Because the loop also grants bare `Edit`, and Claude Code checks a
  redirect target against Edit rules, any granted line carrying a `*` can in principle carry `> path` and write its
  own stdout there. The exact forms keep the CONTENT the pinned script's own output (no `echo *` / `cat .pharn/*`
  any more, whose content an agent chooses). A Bash write is still outside both PHARN guards and reconciled only
  inside a build's anchor→verify window (`LIMITS.md §6`).
- **Run markers.** `require-loop-record.cjs` writes `<root>/.pharn/pharn-loop/<name>/active.json`;
  `enforce-writes-scope.cjs` `scanRuns()` treats a marker as open when lstat-present with mtime within 24 h either
  way, and treats a non-directory / unreadable state dir (or a symlinked `.pharn`) as "cannot rule out" = open. It
  refreshes the mtime of an open marker; the setter will not (read-only).
- **Posture signal.** `enforce-writes-scope.cjs` `isPharnInstalledProject()`: `pharn.config.json` at ROOT is an
  lstat regular file (a symlink is NOT installed) whose JSON has a non-empty string `skillsVersion`. The setter reads
  everything at `process.cwd()` (it writes `cwd/.pharn/writes-scope.json`), so its copy reads the config there.
- **Fence grammar measured over the corpus.** A dual-reading draft (below) parsed all **281** committed
  `PLAN.md` / `AC-TESTS.md` files to the byte-identical list the current core returns (scratch runner
  `.pharn/loop-scope-hardening/measure.mjs`). A naive "refuse any fence indented 4+" rule instead refused 2 of 281
  (`.dev/features/spec-template/PLAN.md:188`, `.dev/features/stage-verify-script/PLAN.md:449` — fences nested
  three list levels deep, in sections before `## Files`), which is why the design reads both ways and refuses only
  on disagreement.
- **Consumers of the core** (all handle `{ok:false}` already): `check-build-complete.mjs` (INCONCLUSIVE, exit 2),
  `scope-inputs.mjs` → `stage-regress.mjs` / `quick-scope-core.mjs` / `build-gate.mjs` (refusal),
  `ac-tests-lock.mjs`, `check-ac-tests.mjs`, `apply-plan-deletions.mjs`, `render-run-report.mjs` (a plan note).
- **Command byte budget.** `pharn-loop.md` 50306 / 52736; `pharn-build.md` 24560 / 24576; `pharn-plan.md` 23924 / 24064. The exact grant list is ~4.7 KB, so `pharn-loop.md` needs a ceiling raise by the table's rule (measured +
  10 %, up to a multiple of 512), as do the two one-sentence edits below.
- **Trusted docs.** No sentence in `LIMITS.md`, `THREAT-MODEL.md`, `pharn/ARCHITECTURE.md` or
  `pharn/CONSTITUTION.md` becomes inaccurate (grep for `allowed-tools`, `pre-approv`, `set-writes-scope`, `setter`,
  `CONTROL_SURFACE`, `fence`, `## Files` this run). The human patch therefore carries only the hook script.

## Applied lessons

- L26 — the human patch is verified at the REAL path: applied in a throwaway `git worktree` of this branch and run
  through `npm run check` there (eslint/prettier/markdownlint resolve by path), never only in a sandbox copy.
- L29 — every remedy here is quantified over a set, so each set is materialized and iterated: the loop's pinned
  subcommands (the grant is DERIVED from them and compared by set equality), the refusal set's members, the fence
  fixture list shared by both parity suites.
- L31 — the `## Files` parser is a deliberate copy-pair (core ↔ setter); the obligation "both track fences, both
  refuse the same ambiguous shapes" is held by ★ PARITY cases that run BOTH over the same fixtures, not by two
  separate suites.
- L36 — the grant test asserts CLOSURE (grants == templatized pinned set, both directions), not per-line presence;
  the setter's `toKey`/`isReserved`/`PROMOTE_COMMANDS` copies are pinned byte-equal / set-equal to their owners.
- L55 — the fence model is probed against a reference renderer (markdown-it, already in `node_modules`) over the
  281-file corpus plus the adversarial fixtures, in scratch; results recorded in BUILD.md.
- L56 — the STATED bounds of the fence model (indented code blocks, HTML blocks, setext headings, `*`/`+` bullets)
  get the same markdown-it probe as the rules, and so does every fix made after a probe.
- L60 — each new ★ assertion gets a named negative control run once (the pre-fix core for the fence cases; a grant
  widened back to a prefix for the closure test; a fresh vs. stale vs. absent marker for the promote refusal).
- L68 — the hook edit is human-only AND in the always-reconciled control surface (committed-blob anchored since
  6.53.0), so it must be applied and COMMITTED before `/pharn-dev-build` Step 0 anchors, never mid-window; this plan
  sequences it there (see `## Sequencing`).
- L73 — the setter's refusals are LEXICAL (`toKey` fold, the owners' own function), stated as such; the Write
  surface stays closed for re-spellings because `enforce-writes-scope.cjs` matches a scope entry against the
  RESOLVED target, so an entry authorizes only its own resolved spelling (and a symlinked parent needs Bash).

## Design

### 1. The grant (SEC-1, `pharn-loop.md` frontmatter)

Every `Bash(...)` grant is one pinned subcommand with each `<placeholder>` (and `'<placeholder>'`) replaced by `*`.
No prefix grant remains: `Bash(node pharn/floor/*)`, `Bash(node .claude/hooks/*)`, `Bash(git rev-parse *)`,
`Bash(git symbolic-ref *)`, `Bash(git status *)`, `Bash(mkdir -p .pharn/*)`, `Bash(cat .pharn/*)`, `Bash(echo *)`
all go. The non-Bash grants are unchanged (`Read, Write, Edit, Glob, Grep, Agent, Skill`). The derived list (55):

```text
Bash(node pharn/floor/feature-name.mjs --fresh)
Bash(git rev-parse HEAD)
Bash(git rev-parse HEAD 2>/dev/null)
Bash(git symbolic-ref --short -q HEAD)
Bash(echo detached)
Bash(echo unknown)
Bash(echo "no git step reached")
Bash(mkdir -p .pharn/pharn-loop/*)
Bash(git status --porcelain -uall > .pharn/pharn-loop/*/pre-run-status.txt)
Bash(git status --short --branch)
Bash(cat .pharn/pharn-loop/*/closeout-phase 2>/dev/null)
Bash(node .claude/hooks/require-loop-record.cjs --open * --cap *)
Bash(node .claude/hooks/require-loop-record.cjs --close *)
Bash(node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-loop.md --target pharn/features/*/SPEC.md)
Bash(node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-loop.md --target pharn/features/*/LOOP.md)
Bash(node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-grill.md --target pharn/features/*/GRILL.md)
Bash(node .claude/hooks/set-writes-scope.cjs --clear)
Bash(node pharn/floor/pre-run-snapshot.mjs --capture *)
Bash(node pharn/floor/mark-phase.mjs --name * --kind run-start)
Bash(node pharn/floor/mark-phase.mjs --name * --kind orchestrator)
Bash(node pharn/floor/mark-phase.mjs --name * --kind stage-start --stage pharn-grill)
Bash(node pharn/floor/mark-phase.mjs --name * --kind stage-start --stage * --route 'inline:route-unavailable')
Bash(node pharn/floor/entry-gates.mjs --start --feature * --timeout-ms 540000)
Bash(node pharn/floor/entry-gates.mjs --wait --feature * --budget-ms 570000)
Bash(node pharn/floor/entry-gates.mjs --abort --feature *)
Bash(node pharn/floor/stage-agent.mjs start --command pharn-loop --stage pharn-spec --name *)
Bash(node pharn/floor/stage-agent.mjs start --command pharn-loop --stage pharn-spec --name * --mode quick)
Bash(node pharn/floor/stage-agent.mjs finish --command pharn-loop --name * --stage pharn-spec)
Bash(node pharn/floor/stage-agent.mjs start --command pharn-loop --stage pharn-plan --name *)
Bash(node pharn/floor/stage-agent.mjs finish --command pharn-loop --name * --stage pharn-plan)
Bash(node pharn/floor/stage-agent.mjs start --command pharn-loop --stage pharn-test --name *)
Bash(node pharn/floor/stage-agent.mjs finish --command pharn-loop --name * --stage pharn-test)
Bash(node pharn/floor/stage-agent.mjs start --command pharn-loop --stage pharn-build --name * --iteration *)
Bash(node pharn/floor/stage-agent.mjs start --command pharn-loop --stage pharn-build --name * --iteration * --mode quick)
Bash(node pharn/floor/stage-agent.mjs finish --command pharn-loop --name * --stage pharn-build --iteration *)
Bash(node pharn/floor/stage-direct.mjs --stage pharn-regress --name * --iteration * --timeout-ms 540000 --budget-ms 570000 --base *)
Bash(node pharn/floor/stage-direct.mjs --stage pharn-verify --name * --iteration * --timeout-ms 540000 --budget-ms 570000)
Bash(node pharn/floor/stage-direct.mjs --stage pharn-regress --name * --resume --budget-ms 570000)
Bash(node pharn/floor/stage-direct.mjs --stage pharn-verify --name * --resume --budget-ms 570000)
Bash(node pharn/floor/check-spec-approved.mjs pharn/features/*/SPEC.md)
Bash(node pharn/floor/check-spec.mjs pharn/features/*/SPEC.md)
Bash(node pharn/floor/check-spec.mjs --spec-kind pharn/features/*/SPEC.md)
Bash(node pharn/floor/check-test-stage.mjs * --require-test-first)
Bash(node pharn/floor/check-red-run.mjs --preflight --ac-tests pharn/features/*/AC-TESTS.md --discover package.json --root .)
Bash(node pharn/floor/check-loop-fresh.mjs --feature * --base * --iter * --front)
Bash(node pharn/floor/check-loop.mjs pharn/features/*/verify-report.json pharn/features/*/regression-report.json --iter * --cap *)
Bash(node pharn/floor/check-quick-scope.mjs --feature * --base *)
Bash(node pharn/floor/check-loop-record.mjs pharn/features/*/LOOP.md)
Bash(node pharn/floor/reconcile-baseline.mjs --amend-scope)
Bash(node pharn/floor/loop-closeout.mjs --feature * --base *)
Bash(node pharn/floor/grill-scan.mjs pharn/features/*/PLAN.md)
Bash(node pharn/floor/check-plan-spec-agree.mjs pharn/features/*/PLAN.md pharn/features/*/SPEC.md)
Bash(node pharn/floor/check-plan-lessons.mjs pharn/features/*/PLAN.md memory-bank/lessons-learned.md)
Bash(node pharn/floor/catalogue-installed-skills.mjs .)
Bash(node pharn/floor/count-grillers.mjs .)
```

**Amended at GATE 1 (the orchestrator's item (a)): the set also covers the INLINE-STAGE fallback.** When a routed
stage's `stage-agent.mjs start` exits `3` (`inline:<reason>`) or crashes, the orchestrator runs `/pharn-spec`,
`/pharn-plan`, `/pharn-test` or `/pharn-build` INLINE, in its own turn, so their pinned lines are lines the loop's own
turn runs. The grant is therefore derived from `pharn-loop.md`, `pharn-loop-quick.md`, `pharn-loop-close.md`,
`pharn-grill.md` (as above) **plus** `pharn-spec.md`, `pharn-plan.md`, `pharn-test.md`, `pharn-build.md` — 45 more
subcommands measured this run, every one of which the old prefix grants covered, so no line that ran prompt-free
under 6.58.0 starts prompting. `/pharn-regress` and `/pharn-verify` have no inline fallback (one `stage-direct.mjs`
call each, Step 5). The list above is the loop-files half; the full list is derived at build and the test owns it.
**Deliberately left out, and why:** `pharn-build.md`'s seam-config `node -e "…"` line (Step 2b) — the old grants did
not cover it either (it stalled the same way under 6.58.0), its quoted JavaScript contains `;` and `|`, which the
test's splitter (and possibly Claude Code's) reads as separators, and a grant for `node -e` with any wildcard would
pre-approve arbitrary code. An exact, wildcard-free grant is possible but its matching is unverified; named as a
residual (the remedy is moving that snippet into a floor script, a separate increment).

Consequences, each tested: no grant matches `node pharn/floor/<a new file>.mjs`; no grant matches the promote setter
line (`--from-frontmatter .claude/commands/pharn-memory-promote.md --target memory-bank/lessons-learned.md`); the two
granted `--from-plan` setter lines (inline `/pharn-build`, inline `/pharn-test`) cannot carry an opt-in flag, because
the setter now refuses an operator flag placed after the mode (§2 (d)) and both grants begin with the mode;
`reconcile-baseline.mjs` is granted only `--amend-scope` and the inline build's exact `--anchor --by pharn-build`;
`echo` / `cat` carry no agent-chosen content.

The 6.58.0 sentence "The grant does not widen what the run may write …" is replaced by one that says what it DOES
widen: it pre-approves exactly the pinned lines, each `*` matching any text (Claude Code's rule), so a pinned script
runs with whatever arguments the run gives it and a shell redirection on a granted line writes that script's output
where Claude Code's Edit rules allow; the pinned gate lines run the project's own tests, which execute code the build
wrote, with no prompt — so run an unattended loop only where that is acceptable (a sandbox, a container, a throwaway
checkout). The write guards still judge every Write and Edit; a Bash write stays outside both (`LIMITS.md §6`).

### 2. The setter refusals (SEC-1, SEC-3 — `set-writes-scope.cjs`, HUMAN patch)

Layered AFTER the existing empty-scope fail and control-surface refusal (L14: compose, never replace). Nothing is
written on any refusal; exit 1, the existing `fail()` shape.

- **(a) PHARN's own installed surface, `--from-plan` only, installed posture only, unless `--allow-pharn-surface`.**
  Posture = `isPharnInstalledProject()` mirrored at `process.cwd()` (an lstat-regular `pharn.config.json` whose JSON
  has a non-empty string `skillsVersion`). Refused entries = every scope entry for which `isReserved(entry)` holds,
  where `toKey()` and `isReserved()` are byte-equal copies of `enforce-writes-scope.cjs`'s (the set that hook already
  denies outside a run): `toKey(e) === "pharn.config.json"`, or `toKey(e)` starts with `.claude/`, or `toKey(e)`
  starts with `pharn/` while `e` as written does not start with `pharn/features/`. The flag is an operator argv flag
  (no declared file can set it, no pinned line passes it), its OWN arg-loop branch, advertised in the usage line, and
  independent of `--allow-claude-dir` (a guard file still needs that flag too). The dev checkout and an unsignalled
  tree are unchanged.
- **(b) A promote-origin scope while a `/pharn-loop` run is open — every mode, every posture, no flag.** Origin =
  `toKey(file)` ∈ `PROMOTE_COMMANDS` (a set-equal copy of `protect-trusted-paths.cjs`'s two paths). Open = the same
  test `enforce-writes-scope.cjs` `scanRuns()` applies, for the `pharn-loop` state directory only, at
  `process.cwd()`: a `.pharn` that is a symlink or unreadable, a `.pharn/pharn-loop` that is not a readable directory,
  any `<name>/active.json` lstat-present with mtime within 24 h either way, or an lstat error other than
  ENOENT/ENOTDIR — all "open". Read-only (no mtime refresh). The message names each slug-shaped marker and its close
  command (`node .claude/hooks/require-loop-record.cjs --close <name>`), never a non-slug name (enforce's rule).
- **(c) ENF-1 — the `## Files` parser tracks fences.** See §3; the setter fails with the ambiguity reason when the two
  readings disagree.
- **(d) Operator flags precede the mode (added at GATE 1, from item (a)).** `--allow-claude-dir` and
  `--allow-pharn-surface` are honoured only BEFORE `--from-plan` / `--from-frontmatter`; one placed after the mode is
  refused (exit 1, nothing written). Reason: a granted line's `*` matches any text, so
  `--from-plan pharn/features/*/PLAN.md` would otherwise pre-approve
  `--from-plan pharn/features/x/PLAN.md --allow-pharn-surface --target pharn/features/y/PLAN.md`; with this rule no
  pre-approved setter line can carry an opt-in, because every pinned setter line starts with its mode. Usage line
  updated to the new order; existing tests that pass `--allow-claude-dir` last move it first.
- **Messages (GATE 1 Q1/Q3).** (a)'s refusal tells a user who genuinely edits their own `.claude/` files (or PHARN's)
  how to proceed: a person edits the file directly, or a person re-runs the setter with `--allow-pharn-surface` placed
  before the mode — never Bash, never an agent's own opt-in. (b)'s refusal names every open marker path it found and
  the command that closes one (`node .claude/hooks/require-loop-record.cjs --close <name>`), and says a marker the
  scan could not read keeps the refusal standing.

Patch size target: ~110 added lines, 0 changed behaviour for the existing suite (verified per L26 before hand-off).

### 3. The fence grammar (ENF-1 — core and setter, the same rule)

A **fence line** is optional leading spaces/tabs, then a run of three or more backticks or tildes, then the rest,
where a backtick run's rest contains no backtick (CommonMark: a backtick run followed by more backticks on the line is
inline code). Fence lines and every line inside an open fence are skipped entirely —
never the `## Files` heading, never a path item, never a heading break, never an exclusion cue — except that a blank
fenced line still closes an open path-item body (the existing reset, so the cue exemption never widens). A closer is
a fence line of the opener's character, at least as long, with a blank rest. Because this reader does not track list
nesting, it reads the plan TWICE:

- **top-level reading** — a fence line counts only when indented 0–3 spaces (no tab);
- **nested reading** — a fence line counts at any indentation, and a bare closer indented LESS than its opener ends
  that fence and opens a new one (what CommonMark does when a list item ends under a fence).

The two readings return `{start, items}`; equal → that list; different → refuse (`{ok:false, reason}` in the core,
`fail()` in the setter) with one reason naming the cause and the remedy (indent each fence's opening and closing
lines alike, at most three spaces). Measured: identical to today on all 281 committed plans; F3 → `["src/a.ts"]`,
F3b → `["src/a.ts"]`, a fence nested four spaces deep under `## Files` → refused, a closer at column 0 under an
item's fence → refused, `~~~` containing ` ``` `, a four-backtick fence, an unclosed fence (hides to EOF) and an
inline ` ```x``` ` line all as CommonMark renders them. **Stated residuals (not a CommonMark parser):** an
indented code block (a 4+-space path-item line after a paragraph and a blank line), an HTML block or comment holding a
fence line, setext headings, and `*`/`+` bullets — each to be probed with markdown-it at build (L56) and named in
both headers.

## Files

- `pharn/floor/plan-files-core.mjs` — fence tracking + dual reading in `pathsFromPlanFiles`, a header section
  (FENCED BLOCKS) with the rule, the refusal and the residuals; parity note updated. — layer: product floor
- `pharn/floor/check-build-complete.test.mjs` — ★ PARITY cases running the checker AND the real setter over one
  shared fence fixture list: F3, F3b, the ambiguous nested fence, the less-indented closer (both refuse: setter exit
  1, checker INCONCLUSIVE exit 2), the tilde/four-backtick/unclosed/inline shapes; negative control against the
  pre-fix behaviour documented. — layer: product floor test
- `.claude/hooks/set-writes-scope.test.cjs` — setter cases: F3/F3b; the installed-surface refusal over its members
  (`pharn/floor/x.mjs`, `pharn/pharn-core/x.md`, `.claude/commands/x.md`, `.claude/skills/x/SKILL.md`,
  `pharn.config.json`, a case/trailing-dot variant, a `pharn/features./x` variant) with `pharn/features/x/y.md` and
  `src/a.ts` allowed; the flag opting back in; dev/unsignalled trees unaffected; a symlinked or malformed config is
  not installed; the promote refusal over fresh / stale (>24 h) / absent markers, a planted file as the state dir,
  both promote paths and a re-spelled one, and a non-promote origin unaffected; ✧ pins: `toKey`/`isReserved`
  byte-equal to `enforce-writes-scope.cjs`, `PROMOTE_COMMANDS` set-equal to `protect-trusted-paths.cjs`; usage line
  advertises the new flag. — layer: hook test
- `pharn/floor/render-ship-briefing.mjs` — (GATE 1 item (b)) its `extractSection` (the `## Files`, Decision and
  Contracts sections it quotes to the human) uses the core's fence rule (the top-level reading) instead of its own
  boolean toggle, so the briefing and the scope agree on which lines are fenced; imports the core's exported fence
  helper. — layer: product floor
- `pharn/floor/render-ship-briefing.test.mjs` — a case where the old toggle and CommonMark differ (a ` ``` `
  line inside a `~~~` fence under `## Files`), with the pre-fix behaviour as its negative control. — layer: product
  floor test
- `.claude/commands/pharn-loop.md` — the exact grant list (§1, loop files + inline-able stages); the reworded "No
  prompt from Claude Code either" bullet; `version:` bump. — layer: product command
- `.claude/commands/pharn-build.md` — Step 3's "a non-zero exit from the setter means …" sentence names the setter's
  printed reason (no parseable `## Files`, a fence it cannot read, or a path it refuses) instead of only "no parseable
  `## Files`"; `version:` bump. — layer: product command
- `.claude/commands/pharn-plan.md` — one sentence in the `## Files` note: fenced lines are never read, and in an
  installed project the setter refuses PHARN's own files, so a plan never names them; `version:` bump. — layer:
  product command
- `.dev/floor/command-hygiene.test.mjs` — the loop grant test ranges over the loop files PLUS the four inline-able
  stage commands, and asserts the Bash grants EQUAL the templatized pinned set minus one named exclusion (the
  seam-config `node -e` line, asserted to match exactly one pinned line) — closure both ways, L36; keeps
  `loopGrantOffenders`; adds negative controls (a prefix grant, a new floor script line, the promote setter line,
  `reconcile-baseline.mjs --anchor` without `--by pharn-build`, `echo x > f`); `COMMAND_BYTE_CEILINGS` raised for `pharn-loop.md`, `pharn-build.md`, `pharn-plan.md` by the rule,
  each with a comment. — layer: dev floor test
- `pharn/floor/reconcile-ignore.json` — the `not_a_deny` sentence ("a plan that legitimately declares
  `pharn/floor/x.mjs` … writes it cleanly") gains the installed-project bound (the setter refuses it there without
  `--allow-pharn-surface`). — layer: product floor data (prose)
- `pharn/floor/README.md` — (grill disposition) the setter paragraph names the two new refusals, the flag and the
  flag order, and the fence rule, beside the existing control-surface refusal. — layer: product floor doc
- `.dev/guides/writes-scope.md` — "The setter refuses to scope the guards themselves" section extended with the two
  new refusals, the flag, and the fence rule. — layer: dev guide
- `SKILLS_VERSION` — → 6.61.0 (provisional; 6.59.0 went to #345 and 6.60.0 to grill-griller-trim; renumbered by
  diff at push if main moved again).
- `CHANGELOG.md` — one new 6.61.0 entry, including the correction of CHANGELOG [6.58.0]'s "does not widen" claim.
- `README.md` — the version badge.
- `.dev/floor/installed-skills-consumers.test.mjs` — (fix-loop pass, regress RED) its "no other product command runs
  either skill helper" scan strips the frontmatter `allowed-tools` list before reading, as `command-hygiene.test.mjs`
  does: the loop's exact grant names `catalogue-installed-skills.mjs`, which is a permission, not a run. — layer: dev
  floor test

### Human-applied (NOT in the build's scope — hook-protected, applied by a human before the anchor)

- `.claude/hooks/set-writes-scope.cjs` — §2 (a)–(d) and §3, delivered as ONE unified diff plus a self-deleting,
  sha256-checked Python apply script under `.pharn/loop-scope-hardening/human-patch/`.

### Explicitly not touched

- `LIMITS.md`, `THREAT-MODEL.md`, `pharn/ARCHITECTURE.md`, `pharn/CONSTITUTION.md` — no sentence becomes inaccurate
  (checked this run); optional disclosure text is offered in the GATE 1 report, not patched.
- `.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/protect-trusted-paths.cjs` — unchanged; the setter copies
  their functions and tests pin the copies.

## Grill dispositions (folded in before build)

Per GRILL.md (8 advisory concerns, 0 blocking-severity):

- P3 fifth fence rule → the core EXPORTS its fence helper and `render-ship-briefing.mjs` imports it (one floor
  home); the other four copies are a named follow-up `fence-rule-unify`.
- P0 inline `--anchor` grant → named in the reworded loop bullet and in the CHANGELOG (pre-existing under 6.58.0's
  prefix grant; not a regression).
- P0 `pharn/floor/README.md` stale → added to `## Files` above.
- P1 differential probe scratch-only → the probe runs at build and its result goes in BUILD.md; the CHANGELOG's Not
  covered list says the fence rule is held by fixtures plus a one-time probe.
- P1 SEC-3 composition → `set-writes-scope.test.cjs` gains an end-to-end case through `protect-trusted-paths.cjs`
  (refused setter → canon Write denied; marker removed → setter exit 0 → the same Write allowed).
- P2 raw entries in refusal messages → pre-existing pattern, noted as a residual, not widened.
- Cost → the measured grant bytes and the ceiling raise are reported at GATE 2.
- P5 briefing heading regex → follow-up `briefing-files-heading`, not this increment.

## Fix-loop pass 1 (after the regress RED) — delegated decision

`/pharn-dev-regress` returned `regressions` (`tests` 0 → 1): `.dev/floor/installed-skills-consumers.test.mjs:120`
reads each product command's raw text, and the loop's exact grant names `catalogue-installed-skills.mjs`. Decision
(delegated: decided by the orchestrating model under the maintainer's 2026-10-13 delegation, not a human approval):
FIX through a fresh `/pharn-dev-build` pass — the test joins `## Files` above, Step 0 re-sets the scope and re-anchors
from this amended plan, and the test strips the grant list before reading, as `command-hygiene.test.mjs` does. The
grant stays as it is. The second failing test (`stage-regress.test.mjs:2207`, a 16 s timing case) passed alone and
is re-checked at the re-run regress. The version moves to 6.61.0 (see `## Files`). The hook header's version
mentions are removed by a second human patch prepared at GATE 2.

## Sequencing (L68)

1. GATE 1 approval.
2. Write the human patch (diff + apply script) under `.pharn/loop-scope-hardening/human-patch/`, verify it per L26 in
   a throwaway worktree of this branch (`npm run check` there, existing suite unchanged), then STOP and report.
3. The maintainer applies it; it is committed on this branch as its own commit BEFORE `/pharn-dev-build` Step 0 —
   the hook scripts are always-reconciled against committed blobs, so an uncommitted hook edit REDs
   `check:reconcile` and a mid-window one reads as an escape.
4. `/pharn-dev-grill` → `/pharn-dev-build` (the files above) → `/pharn-dev-regress` → `/pharn-dev-verify` →
   `/pharn-dev-review` → GATE 2.

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — unchanged; the human hook edit lands before the anchor (§2a of
  that contract is not needed).
- `pharn/pharn-contracts/finding-shape.md` — the setter's refusal messages quote untrusted plan paths only as data
  after their shape is fixed; no new finding shape.
- No contract restates the `## Files` grammar (the product `pharn-plan.md` note cites the setter); none changes.

## Evals to write (P1)

No Capability (`role:`) is added or changed, so no `evals/` directory is owed. The executable specs are tests:

- core ↔ setter ★ PARITY over the shared fence fixture list → identical lists or both refuse.
- setter → the installed-surface refusal per member + controls; the promote refusal per marker state + controls.
- command-hygiene → grants == templatized pinned set; each negative-control line uncovered.

## Guarantee audit (P0)

- "`/pharn-loop` pre-approves no line outside its pinned set" → floor: enum-regex (set equality over the committed
  text, `command-hygiene.test.mjs`). That Claude Code HONORS the grant, how it matches redirections, and whether it
  reaches a stage agent → advisory (harness behaviour; docs cited).
- "a plan cannot scope PHARN's own installed surface in an installed project" → floor: enum-regex at declaration
  (the setter's membership test) composing with hook (fix #7) at write time — for the Write/Edit/MultiEdit/
  NotebookEdit surface only. Bounded: lexical (L73), operator flag opts out, any agent holding Bash can pass the flag
  or write the record (`LIMITS.md §6`), and a tree whose config is missing/malformed/symlinked is not an install.
- "a promote-origin scope cannot be set while a `/pharn-loop` run is open" → floor: the setter's presence/age test,
  at the moment it runs. Bounded: the marker is Bash-written state (a run that skipped `--open`, or an agent that
  deletes the marker, defeats it); the record can still be forged with Bash.
- "the `## Files` lists both parsers return ignore fenced lines and refuse a nesting-dependent reading" → floor:
  regex/line grammar, held equal across the copy-pair by ★ PARITY tests (example-based, not a proof). NOT a
  CommonMark parser — the named residuals stay.
- "the loop no longer executes model-written code without a prompt" → **struck**: the project's own gates run code the
  build wrote, prompt-free, by design.
- What IS closed, stated as the orchestrator framed it: (1) a plan reaching PHARN's own floor, hooks, commands and
  config — the evaluator — in an installed project (setter refusal + fix #7 hook, Write surface); (2) prompt-free
  execution of a `node` script beyond the pinned forms (grant set equality; harness honouring is advisory).

## Trust audit (P2)

- PLAN.md `## Files` (untrusted) → the setter emits paths as data; the new refusal messages print offending entries
  verbatim the way the control-surface refusal already does (stderr, a human/agent reads them as data).
- Run-marker directory names (agent-nameable) → printed only when they match the slug grammar, else elided.
- `pharn.config.json` (project file) → only `skillsVersion`'s non-emptiness is read (a membership test).

## Determinism audit (P5)

Every new branch is a membership or presence test: posture (`skillsVersion` non-empty), `isReserved` (prefix/equal
over a fold), origin ∈ `PROMOTE_COMMANDS`, marker lstat + age, fence-line regex, list equality of two readings. The
ambiguous case ends in a refusal that names the remedy (ask the author), never a guess.

## Version (proposed)

Minor: → 6.61.0 (provisional, see `## Files`) — the setter gains two refusals and a new operator flag (a newly shipped behaviour that can
stop a product build at Step 0); the grant narrowing and the fence fix are corrections that ride along.

## GATE 1 — approved (delegated)

Approved 2026-10-13 — **delegated: decided by the orchestrating model under the maintainer's 2026-10-13
delegation**, not a human approval. Answers:

- Q1 — keep `.claude/**` in the refusal set (an instruction channel for later stages: commands, skills, agents); the
  refusal message says how a user who genuinely edits their own `.claude/` files proceeds (§2, Messages).
- Q2 — `--allow-pharn-surface`, separate from `--allow-claude-dir`.
- Q3 — mirror enforce's 24 h definition; the message names the marker path(s) found and the close command.
- Q4 — the L68 sequencing above: write and verify the patch, STOP and report with the exact apply command (absolute
  paths) and the expected pre/post sha256; the maintainer applies it in this worktree and commits nothing; the agent
  commits it before `/pharn-dev-build` Step 0.
- Q5 — full templatized forms.
- Added: (a) cover every Bash line the loop's own turn can run, inline-stage fallback included (§1 amendment, §2 (d));
  (b) every other `## Files` reader goes through the core or takes its fence rule (`scope-inputs.mjs` already calls
  the core; `render-ship-briefing.mjs` added to `## Files`). The residuals (redirect targets, indented code blocks,
  HTML comments, setext headings, `*`/`+` bullets) go in the CHANGELOG's Not covered list.

## Open questions (HALT)

- None open.
