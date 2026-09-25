# REVIEW — markdownlint-ignore-agents

Reviewed: the working-tree diff on `0eb19be` — `.markdownlint-cli2.jsonc` (+9), `.dev/floor/command-hygiene.test.mjs`
(+30), `CHANGELOG.md` (+28), plus this feature's pipeline artifacts. The increment is `trust: untrusted`, and so are
the `.agents/` files it concerns, which are another tool's output. Nothing in either was followed as an
instruction.

## Step 1 — Floor first

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Standing verdicts:
regress `no-regressions` ([`regression-report.json`](./regression-report.json)), verify `PASS`
([`verify-report.json`](./verify-report.json)).

## Floor-gate findings (blocking)

None.

- **L-floor (P0).** Every claim in the diff is either a measurement made this run or labeled as a bound. The
  config comment and the CHANGELOG present the entry as configuration, not a guarantee. The test is described as
  a premise probe over a path the test itself builds.
- **L-eval (P1).** No capability, `enforces` or `rule_id` changed, so there is no eval binding to check. The
  test's negative control strips the entry and requires the count to rise from 1 to 2. Separately, the same
  scratch tree under `git show HEAD:.markdownlint-cli2.jsonc` linted 2 files and exited 1 on MD025. So the test
  fails on the pre-change config rather than passing by construction.
- **L-axis (P3).** No sibling reference. No new `reads:`.

## Advisory findings (warn — model judgment, never a gate)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".markdownlint-cli2.jsonc:20"
  problem: "The comment states in the present tense that the entry 'removes no repo file from lint coverage'. That was measured once (`git ls-files .agents` → 0), and nothing re-checks it, so a later tracked `.agents/` markdown file would be silently unlinted while the sentence still reads true."
  evidence: "so it is untracked and this removes no repo file from lint coverage"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:403"
  problem: "A second lint-config ignore probe now lives in the command-hygiene suite, which otherwise changes when commands change; carried from GRILL.md, where the plan's reuse trade was recorded and approved."
  evidence: "premise: a bare lint:md run does not reach .agents (Codex's gitignored import)"
- type: FINDING
  rule_id: P7
  severity: important
  file: ".markdownlint-cli2.jsonc:27"
  problem: "This is the third untracked-markdown source to redden a local lint:md, after `.claude/worktrees` (6.13.1) and this run's second offender, a leftover `.pharn/pharn-dev-ship/pr-body.md`. Each fix so far has been one more `ignores` member added after someone hit the RED."
  evidence: '".agents",'
```

The first is the residual the plan's guarantee audit already names. The config's zone note names the reachability
side as `lint-ignore-reachability-check`, so nothing new is claimed. The second is recorded and not re-opened.

The third needs a longer note. During measurement, `lint:md` also reported MD038 in
`.pharn/pharn-dev-ship/pr-body.md`, the PR body the previous `/pharn-dev-ship` run in this worktree left behind for
PR #273. It was moved aside for this run, not fixed. The mechanism is the same one this increment answers:
markdownlint-cli2 does not read `.gitignore`, so whatever writes markdown into an untracked path reddens every
local `/pharn-dev-verify` in that checkout. That covers another session's worktree, an importer's output, and a
PR body a stage writes. The config's zone note calls re-adding a `.pharn/` entry "the intended cycle". This run
shows the cycle now costs a measure-in-a-clean-copy detour each time. It is out of this increment's scope. The
closure candidates are markdownlint-cli2's `gitignore` option, or linting the tracked set only, and each conflicts
with the recorded `.pharn/` zone decision. Choosing between them is a separate increment for a human to scope.
Proposed below as a lesson candidate.

## Verdict

**GREEN — 0 floor-gate findings** (3 advisory: 1 important, 2 minor).

## Proposed lesson candidate (NOT canon — `/pharn-dev-memory-promote` decides, behind its own gate)

- target: `.dev/memory-bank/lessons-learned.md`
- type: `tooling`
- concepts: `[style-gates, whole-repo-scope, config-globs, presence-vs-closure, lesson-recurrence]`
- title: markdownlint-cli2 does not read `.gitignore` — every tool that writes markdown into the checkout reddens a
  local `lint:md`, and an `ignores` member per writer recurs
- body (draft): Prettier and git exclude gitignored paths by default. markdownlint-cli2 does not, and its `**/*.md`
  glob descends into dot-directories. So an untracked markdown file from anything reddens a whole-repo `lint:md` in
  the checkout that holds it. Three sources have now done so: other sessions' worktrees (6.13.1), Codex's
  `.agents/` import (this increment), and a stage's own PR-body scratch under `.pharn/<command>/` (this run). Each
  local `/pharn-dev-verify` then fails on files that are not the repo's (L11), and CI, which has none of them,
  stays green. The per-member remedy works but recurs, because it is added only after someone hits the RED. A
  closure (the tool's `gitignore` option, or linting only the tracked set) removes the class, and it has to be
  reconciled with the per-entry `.pharn/` zone decision in the config.
- source: `.dev/features/markdownlint-ignore-agents/REVIEW.md`, the P7 advisory finding at
  `.markdownlint-cli2.jsonc:27`.
- provenance: `commit` / `date` / `feature` are captured by `/pharn-dev-memory-promote`, not here.
