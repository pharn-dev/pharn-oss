# PLAN — plan-instruction-file-rule: `/pharn-plan` stops routing feature narrative into project instruction files

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L1, L6, L28, L29, L34, L36, L60]
- increment: add one ADVISORY planning rule, under the stable anchor phrase "Instruction files load into every
  agent", to `/pharn-plan`'s Step 3 (the only product command that authors a PLAN `## Files`), pin its presence with a
  closed structural test, and record the bound in `LIMITS.md §3` (human-applied — see Open questions).
- layer(s): the product `.claude/commands/` surface (`pharn-plan.md`), one trusted doc (`LIMITS.md`, human-only), build
  apparatus (`.dev/floor/command-hygiene.test.mjs`, `.dev/features/`), repo-meta (`SKILLS_VERSION`, `README.md`,
  `CHANGELOG.md`).
- constitution_refs: [P0, P5, P6, P7]

## Why (P7) — the recorded failure, split by what this repo can verify

**Verified this run from disk** (`.dev/measurements/loop-wall-clock-2026-10-05.md`, labels as that record defines
them: `R` = the real pharn-starter runs, `S` = static files, `m` = measured, `e` = estimate):

- §3: every stage agent's first request carried 302,207–304,974 tokens; the harness attached the same 16 instruction
  files to every stage agent, 634,379 B in total — `CLAUDE.md` 418,456 B, 14 `.claude/rules/*.md` 213,290 B,
  `MEMORY.md` 2,633 B [R·m]; about 159k tokens, roughly half the prefix [R·e, 634,379 / 4].
- §10: `.claude/rules/` holds 14 files, none with a `paths:` key [S·m], and all 14 were attached to every stage
  agent [R·m].
- `git grep -n 'CLAUDE.md' -- .claude/commands/pharn-plan.md` → no output, exit 1: `/pharn-plan` neither tells the
  model to edit `CLAUDE.md` nor counters it doing so.

**User-reported, NOT verifiable from this repo** (pharn-starter is not in this tree): nearly every PLAN under that
project's `pharn/features/` (~98) lists `CLAUDE.md` in `## Files` with a "Docs" step, each adding a per-feature
section ("Organizations (phase 3a …)", "billing increment 3a", …), which is how that file reached 418 KB. This plan
treats it as the reported cause, not a measured one; the measured fact is only the size and the attachment.

**Platform behaviour, documented by Claude Code, not probed here:** `CLAUDE.md` imports files named with `@…`, and a
`.claude/rules/` file with `paths:` frontmatter loads only for matching paths. The record observes the converse only
(no file had `paths:`, and none was left out). The rule text below says what the record measured ("without `paths:`
frontmatter … every agent") and does not claim a measured saving for `paths:`.

## Discovery — AUTHOR vs CONSUMER of a PLAN `## Files` (P6)

Full list: `git grep -ln '## Files' -- '.claude/commands/pharn-*.md' ':!.claude/commands/pharn-dev-*'` → **11 files**
(count printed by `wc -l`: 11). Classification is read from each command's structured `writes:` frontmatter first
(L6) and confirmed against the cited lines:

| command                   | verdict    | citation                                                                                                                                                                                                     |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pharn-plan.md`           | **AUTHOR** | `pharn-plan.md:22` `writes: ["pharn/features/<name>/PLAN.md", …]`; `pharn-plan.md:166` the PLAN template's `## Files`; `:184` its parse rules                                                                |
| `pharn-build.md`          | CONSUMER   | `pharn-build.md:19` `writes:` = user code via `--from-plan` + `BUILD.md`; `:86` "Set the scope from the plan's `## Files`"                                                                                   |
| `pharn-test.md`           | CONSUMER   | `pharn-test.md:23` `writes:` = AC test files from AC-TESTS.md `## Files` + the lock; `:159` "The writes-scope permits exactly AC-TESTS.md `## Files`" (AC-TESTS.md is itself authored by `pharn-plan.md:22`) |
| `pharn-regress.md`        | CONSUMER   | `pharn-regress.md:17` `writes: [".pharn/pharn-regress/stage.json"]`; `:138` "fix `PLAN.md`'s `## Files`"                                                                                                     |
| `pharn-verify.md`         | CONSUMER   | `pharn-verify.md:17` `writes: [".pharn/pharn-verify/stage.json"]`; `:128` "fix the PLAN's `## Files` via `/pharn-plan`"                                                                                      |
| `pharn-memory-promote.md` | CONSUMER   | `pharn-memory-promote.md:19` `writes: ["memory-bank/<canon-file>"]`; `:388` names a PLAN's `## Files` only as a scope source it must not rely on                                                             |
| `pharn-ship.md`           | CONSUMER   | `pharn-ship.md:45` `writes:` = SHIP.md, ship-record.json, BRIEFING.md; `:264` "`/pharn-plan` → writes `pharn/features/<name>/PLAN.md`" (it delegates; routed or inline it runs `/pharn-plan`)                |
| `pharn-ship-close.md`     | CONSUMER   | part of `pharn-ship` (no `writes:`); `:208` reproduces RUN-REPORT.md's `## Files` list; `:361` names a build rewriting `## Files`                                                                            |
| `pharn-ship-quick.md`     | CONSUMER   | part of `pharn-ship`; `:64`–`:66` "then `/pharn-plan` starts" (delegates); `:132` the scope check reads the plan's `## Files`                                                                                |
| `pharn-loop.md`           | CONSUMER   | `pharn-loop.md:47` `writes:` = SPEC.md, LOOP.md; `:380`–`:399` Step 4 runs `/pharn-plan` (routed); `:202` S9 "no parseable `## Files`"                                                                       |
| `pharn-loop-close.md`     | CONSUMER   | part of `pharn-loop`; `:311` prints RUN-REPORT.md's `## Files` list; `:345`/`:365` the rebuild stays inside the plan's `## Files`                                                                            |

Also checked, outside the grep's hits: `pharn-loop-quick.md:74` hands the plan to `/pharn-plan` (CONSUMER, no
`## Files` text); `pharn/floor/stage-agent-core.mjs:576` (the routed agent's brief) mentions `## Files` only to say
pinned tests sit outside it — it carries no planning text, and the routed plan agent runs `/pharn-plan` itself, so the
rule reaches routed runs through the command. **AUTHOR set = {`pharn-plan.md`}.** Every other command reaches a PLAN
only by invoking `/pharn-plan`, so one copy covers ship, loop and both quick modes.

## The rule (the shipped bytes, drafted here; the build may only re-wrap it)

Inserted in `pharn-plan.md` as a blockquote directly after Step 3's existing paragraph (line 132), before
`## Step 4`. **Not** in the PLAN template's `## Files` block and not under any `## Files` heading, so neither the
template nor `set-writes-scope.cjs`'s parse rules move (L28):

```markdown
> **Instruction files load into every agent (ADVISORY — nothing checks a plan for it).** `CLAUDE.md`, any file it
> imports with `@…` (e.g. `AGENTS.md`), and every `.claude/rules/` file without `paths:` frontmatter are loaded into
> every agent of every stage, so each byte there is paid on every run. A feature's narrative, rationale, history and
> limits already live in its record (`pharn/features/<name>/`); if the project keeps a docs folder, a page there may
> be planned. Neither becomes a new section in an instruction file. Name an instruction file in `## Files` only when
> the feature changes a standing convention every future session must obey, as
> ``- `CLAUDE.md` — convention: <the one convention, one line>``; a convention for some paths only belongs in a
> `.claude/rules/` file with `paths:` frontmatter.
```

8 lines + 1 blank separator = **9 added lines** (budget ≤ 12), ~990 bytes. `pharn-plan.md` is 22,301 B against its
`COMMAND_BYTE_CEILINGS` entry of 24,064 B, so ~23,300 B stays under the ceiling and the table is **not** raised. The
only other change in the file is `version: "0.5.2"` → `"0.5.3"` (the brief's checklist item 7).

## Files

- `.claude/commands/pharn-plan.md` — Step 3 gains the blockquote above; frontmatter `version` 0.5.2 → 0.5.3 — product
  command
- `.dev/floor/command-hygiene.test.mjs` — new `INSTRUCTION_FILE_RULE` section (below), appended after
  `WRITE_TOOL_RULE` — apparatus
- `SKILLS_VERSION` — 6.35.2 → 6.35.3, a patch (argued below)
- `README.md` — the version badge (`check:badge` holds it to `SKILLS_VERSION`)
- `CHANGELOG.md` — a new `[6.35.3] - 2026-10-05` section with one `### Changed` entry carrying the measurement
  figures
- `.dev/features/plan-instruction-file-rule/BUILD.md` — the build record, if `/pharn-dev-build` writes one

### Explicitly not touched

- `LIMITS.md` — §3 gets the bound, but the file is human-only (fix #2 hook); the human applies the drafted text below
- `MIN_CLI` — its bar ("an older CLI would install a BROKEN tree") is not met: an older CLI installs this tree and
  simply ships the extra sentence
- `CLAUDE.md` — no repo convention, contract or directory changes (a new hygiene pin is not a convention)
- `docs/**` — no command `description:` changes, and the catalog does not render `version:`

## The `LIMITS.md §3` text (drafted for the human; the agent cannot write it)

A new subsection after `### 3d`, in that section's register:

```markdown
### 3e. Instruction files are a fixed cost per agent

Every stage agent starts with the project's instruction files attached: `CLAUDE.md`, the files it imports, and every
`.claude/rules/` file without `paths:` frontmatter. Their size is paid once per agent, for every agent of every run,
whatever the change. PHARN neither measures nor bounds it. `/pharn-plan` carries an advisory planning rule (6.35.3)
against putting a feature's narrative into those files; nothing deterministic stops a plan from naming one, and no
behavioural eval covers `/pharn-plan`. A deterministic backstop, a context-budget floor check, is a separate increment
and is not built.
```

"No behavioural eval covers `/pharn-plan`" was checked with a full count this run, not a truncated listing:
`git ls-files -- '*/evals/*'` → 347 files in 37 directories, every one under `pharn/pharn-pipeline/grillers/*`,
`pharn/pharn-review/*`, `pharn/pharn-core/seam-resolver` or `pharn/floor/test-fixtures/green`. The 108 files with
`plan` in their path are griller evals whose INPUT is a plan; none runs `/pharn-plan` or judges its output.

## The structural test (apparatus; `.dev/floor/command-hygiene.test.mjs`, section `INSTRUCTION_FILE_RULE`)

- **The AUTHOR set is derived, never listed** (L6, L29): the product commands on disk (`pharn-*.md`, not `pharn-dev-*`,
  not a part file) whose frontmatter `writes:` names a path ending in `/PLAN.md`. Today that is `{pharn-plan.md}`.
- **Non-empty** (L34): the derived set has ≥ 1 member, and it equals `["pharn-plan.md"]` today (a change to it fails
  loudly so the next author is classified on purpose).
- **Closed both ways** (L36): for every product command, the anchor phrase is present ⇔ the command is in the AUTHOR
  set. A consumer that grows a copy fails as surely as an author that loses it.
- **In Step 3** (reuses `writeToolStep3`): the anchor sits inside `## Step 3 …` up to the next `##` heading, and that
  step was found (L60: an unfound anchor fails, never slices to end-of-file).
- **Negative controls per property** (L60), in-suite: the author's text with the phrase removed fails the presence
  predicate; a consumer's text with the phrase inserted fails the closure predicate; an empty derived set fails the
  non-empty assertion.
- **The live mutation run the brief asks for**, done once at build and its output recorded in BUILD.md: delete the
  anchor line from `pharn-plan.md`, run `node --test .dev/floor/command-hygiene.test.mjs`, show it RED, restore, show
  GREEN. No `.mjs`/`.cjs` source is created or modified, so checklist items 1–2 (unit tests, ≥ 90 % coverage) do not
  apply.
- **No behavioural test is possible today** — there is no plan eval harness (the count above). The pin proves the
  sentence is present in the right place, never that a model obeys it.

## Version and CHANGELOG

- **Patch, 6.35.2 → 6.35.3.** CLAUDE.md "SKILLS_VERSION discipline": minor = "a newly shipped capability / command /
  checker"; this adds none — it clarifies what an existing command's `## Files` should contain. The precedent is
  6.35.1, which added the "write with the write tools" sentence to two commands' Step 3 as a patch.
- The `CHANGELOG.md` entry carries the measurement figures (302k-token first requests; 634,379 B attached =
  `CLAUDE.md` 418,456 B + 14 rules 213,290 B + `MEMORY.md` 2,633 B; ~159k tokens at 4 B/token, an estimate), labels the
  ~98-PLAN cause as user-reported, says the rule is advisory, and names the deterministic backstop as unbuilt.
- `npm run check:changelog-entry` after the edit; `MIN_CLI` untouched (above).

## Applied lessons

- L1 — the meta-docs this increment invalidates are named: `CHANGELOG.md`, `README.md` (badge), `SKILLS_VERSION`, and
  `LIMITS.md §3` (human-applied); `CLAUDE.md` was checked and states no fact this changes.
- L6 — the AUTHOR/CONSUMER verdict and the test's AUTHOR set are read from each command's `writes:` frontmatter, not
  from a grep over prose (the `## Files` grep is only the discovery list).
- L28 — the rule lives in Step 3 as a blockquote, never under a `## Files` heading, so no line of it can act as the
  setter's exclusion cue; the template block is untouched.
- L29 — the AUTHOR set is materialized once (derived from frontmatter) and every rule in the test iterates it.
- L34 — the test asserts the derived AUTHOR set is non-empty, with a control proving that assertion fails on `[]`.
- L36 — closure, not presence: the anchor is required in every author and forbidden in every consumer.
- L60 — each asserted property (presence, closure, in-Step-3, non-empty) has its own negative control, and the Step 3
  anchor must be found before slicing.

## Contracts satisfied

- None changed. `set-writes-scope.cjs`'s `## Files` extractor and `pharn/ARCHITECTURE.md §6` are cited, unchanged.

## Evals to write (P1)

- None: no `role:` capability is added or changed. The structural pin above is a hygiene test, not an eval.

## Guarantee audit (P0)

- "Every product command that authors a PLAN carries the rule, in its Step 3, and no other command does" → **floor:
  enum-regex** (string presence + set membership over frontmatter), in a test — presence, never compliance.
- "A plan no longer routes narrative into `CLAUDE.md`" → **advisory**. Nothing reads a PLAN's `## Files` for
  instruction-file paths; the command text says so. The deterministic backstop is unbuilt.
- "The rule costs < 1 KB per `/pharn-plan` run" → **floor: the existing `COMMAND_BYTE_CEILINGS` budget test**
  (bytes only).
- "Instruction-file bytes are paid by every agent" → **measured** for pharn-starter's runs [R·m]; the `paths:`
  exemption is documented platform behaviour, **not probed** here.

## Trust audit (P2)

- No new input is ingested. The rule is trusted command text; a PLAN's `## Files` remains untrusted DATA exactly as
  before.

## Self-review before the halt (brief items a–g)

- (a) Every AUTHOR/CONSUMER verdict above carries a `file:line`, including the three part files, which have no
  `writes:` of their own and are cited by the lines where they hand off to `/pharn-plan` or read `## Files`. No
  correction needed.
- (b) No edit inside a `## Files` template block: the rule is placed after Step 3's paragraph (line 132), ahead of the
  template (line 166) and its parse note (line 184).
- (c) No shipped text cites `.dev/**`: the rule and the `LIMITS.md` draft name no `.dev/` path; the measurement file is
  cited only in this PLAN, the test comment (apparatus) and the CHANGELOG entry. No correction needed. The
  CHANGELOG is repo-meta read in the repository, where `.dev/` exists (7 existing entries already cite
  `.dev/measurements/`); the `LIMITS.md` text, which lands in installs, cites no `.dev/` path.
- (d) The rule's first words are "ADVISORY — nothing checks a plan for it"; no guarantee wording.
- (e) 9 added lines in `pharn-plan.md` plus a 1-line `version:` change; to be proved with `git diff --numstat` at
  build.
- (f) The ~98-PLAN cause is labelled user-reported and unverifiable here; the `paths:` behaviour is labelled
  documented, not probed.
- (g) Absence claims come from full counts: the `## Files` grep (11, by `wc -l`), the `CLAUDE.md` grep (empty, exit 1),
  the eval census (347 files, all 37 directories listed).

## Resolved at GATE 1 (2026-10-05, the human)

- **Plan: approved as written.**
- **`LIMITS.md` (trusted doc, human-only):** the human asked for a Python patch to execute themselves. The agent writes
  it to `.pharn/plan-instruction-file-rule/limits_3e_patch.py` (gitignored scratch, not in `## Files`), and it inserts
  the §3e text above verbatim. The human runs it after `/pharn-dev-verify`, because `reconcile` would read a mid-run
  write to a trusted doc as an escape. Then `npm run check` is re-run. The agent never writes `LIMITS.md`.
