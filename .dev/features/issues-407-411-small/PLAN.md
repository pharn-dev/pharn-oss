# PLAN — issues-407-411-small

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L29, L31, L36, L60]
- increment: Fix the two small issues of the 2026-11-02 batch by hand, at the maintainer's request ("fix all small by
  yourself"): #407 (capability discovery counts git-ignored copies) and #411 (the cost-ledger iteration warning on a
  pre-build stop, and the test-stage brief that can only report S4–S10). The three medium issues (#408, #409, #410)
  run as their own `/pharn-dev-ship` increments on this same branch; this plan also opens the branch's one version
  section (7.2.0) that their entries join.
- layer(s): product floor (`pharn/floor/`), one product command (`.claude/commands/pharn-loop.md`), version files.
- constitution_refs: [P0, P3, P4, P5, P7]
- approval: NOT a `/pharn-dev-plan` output and not grilled. The maintainer asked for these two fixes to be made
  directly; this file exists so the write guard's scope comes from a declared `## Files` list (fix #7) and so the
  reconcile epoch has a plan to judge against.

## Live state measured this run (P6)

- `origin/main` = `4faed62e` (SKILLS_VERSION 7.1.4); branch `fix/issues-407-411` cut from it.
- #407: `validate.mjs`, `count-grillers.mjs`, `count-lenses.mjs`, `count-verifiers.mjs` each define their own
  `readdirSync` `walk()` and never ask git. `griller-extract.mjs` takes its list from `count-grillers.mjs`.
  `render-review-assignments.mjs` already lists a directory through `git ls-files --cached --others
--exclude-standard` with a walk fallback (the precedent).
- #411 A: `check-cost-ledger.mjs` marker-completeness WARN expects a stage-start marker carrying every iteration
  `1..outcome.iterations`; only build/regress/verify stage-starts carry `iteration`, and `loop-record.md` says a stop
  before the first build counts as `iterations: 1`.
- #411 B: `validateResult` already accepts `row: null` with `status: refused` from a `/pharn-loop` agent, but
  `reportLines()` offers a loop agent only `refused --row S4..S10`, and brief rule 3 tells it to pick one. The loop
  decides the test stage's row from `check-test-stage.mjs` and the pinned preflight (Step 4), never from the report.

## Design

### #407 — one git-aware markdown list

New `pharn/floor/capability-files-core.mjs` exports `listMarkdownFiles(target)`:

- Inside a git work tree: the `.md` files `git --literal-pathspecs ls-files -z --cached --others --exclude-standard`
  lists when asked FROM the target, PLUS every `.md` under the target's own `pharn/` directory (an install a project
  chose not to commit must not drop out of discovery). Only paths that are regular files now (a tracked file
  deleted from the work tree is not listed). Sorted.
- Outside a work tree, when git cannot run, or when git lists nothing at all for the target (an empty or wholly
  ignored directory): the old `readdirSync` walk, unchanged.
- The four consumers import it and drop their copies; each keeps its own `EXCLUDE_SEGMENTS` and frontmatter reader.
- `stage-runtime.test.mjs`'s GIT CEILING map gains the new spawn (it carries a `maxBuffer`).

### #411 A — no warning a contract-following record cannot avoid

Skip the iteration part of the marker-completeness WARN when no stage-start marker carries any `iteration` (the run
never reached an iterated stage). Everything else in the block is unchanged; a record that reached build and lost a
marker still warns.

### #411 B — a test-stage agent reports no row

`reportLines()` offers a `/pharn-loop` `pharn-test` agent one `refused` line with no `--row`, and brief rule 3 tells
that agent the loop's checkers decide its row. `LOOP_ROWS` is unchanged, so no agent can claim S11–S15.
`/pharn-loop`'s paragraph naming `LOOP_ROWS` says so.

## Files

- `pharn/floor/capability-files-core.mjs`
- `pharn/floor/capability-files-core.test.mjs`
- `pharn/floor/validate.mjs`
- `pharn/floor/count-grillers.mjs`
- `pharn/floor/count-lenses.mjs`
- `pharn/floor/count-verifiers.mjs`
- `pharn/floor/stage-runtime.test.mjs`
- `pharn/floor/check-cost-ledger.mjs`
- `pharn/floor/check-cost-ledger.test.mjs`
- `pharn/floor/stage-agent-core.mjs`
- `pharn/floor/stage-agent-core.test.mjs`
- `pharn/floor/stage-agent.test.mjs`
- `.claude/commands/pharn-loop.md`
- `.dev/floor/command-hygiene.test.mjs`
- `.dev/guides/floor-checks.md`
- `.dev/guides/floor-orchestration.md`
- `SKILLS_VERSION`
- `CHANGELOG.md`
- `README.md`
- `.dev/features/issues-407-411-small/PLAN.md`

## Applied lessons

- L29: the set the #407 fix quantifies over (every capability reader) is materialised as a consumer list the new
  test ranges over, not asserted for `count-grillers.mjs` alone.
- L31: the four `walk()` copies are the copy-set; the fix retires them into one module instead of patching each.
- L36: the closure test asserts no consumer keeps its own `readdirSync` walk, rather than checking the one spelling
  in front of me.
- L60: each new assertion gets a falsifier (an ignored copy that would be counted without the fix; a pre-build
  ledger that warned before).
