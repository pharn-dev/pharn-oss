# REGRESSION — stage-agent-background-fix

Base: `9ee54c8bd97dde9756758f37359117a41be6bb75` (`git status --porcelain` non-empty → working-tree dogfood → `base =
HEAD`). The base side ran in a detached `git worktree` at that SHA; the head side in this working tree.

## Partition (`check-regress.mjs scope`, exit 0)

- **inside** (17 paths): the two command files, `command-hygiene.test.mjs`, the floor guide, `CHANGELOG.md`,
  `README.md`, `SKILLS_VERSION`, `route-token-core.mjs` and its test, `stage-agent-core.mjs` and its test,
  `stage-agent.mjs` and its test, `mark-phase.test.mjs`, and this feature's PLAN, GRILL and BUILD.
- **declared**: the PLAN's `## Files` through `plan-files-core.mjs` (the pinned line). **escaped: none**;
  `escape_exempt`: none.
- **outside gates**: `tests` (166 outside test files, through the per-test reporter), `validate`, and
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`. No shared style config is
  inside, so the style gates are skipped on both sides.

## Run 1 — RED, a load failure (superseded by Run 2)

A first attempt was stopped during its base side so the review's fixes could land first (BUILD.md, "Fix round"); its
temporary worktree was removed and it produced no verdict. The next full run (Run 1) gave:

| gate         | base → head |
| ------------ | ----------- |
| `tests`      | 0 → **1**   |
| `validate`   | 0 → 0       |
| `structural` | 0 → 0       |

`check-regress.mjs verdict` exit 1, `regressions: ["tests"]`, one new failure (test title, DATA):

```text
.claude/hooks/enforce-writes-scope.test.cjs::✧ a 100k-segment payload path is judged in linear time and still denied outside the scope
```

Investigation: the test asserts a 10 s wall-clock bound (`enforce-writes-scope.test.cjs:2959`) over a hook this
increment does not touch. Run alone at HEAD it passed 3 of 3, at about 130 ms each. The machine's 15-minute load average
was 16.66 when Run 1 ended (`uptime` at Run 2's start: `3.59 6.28 16.66`), with other sessions active on this host. So
Run 1's red is a load failure, not a change in the code. Its records are kept under `.pharn/pharn-dev-regress/run1/`
(gitignored).

## Run 2 — the verdict

| gate         | base → head |
| ------------ | ----------- |
| `tests`      | 0 → 0       |
| `validate`   | 0 → 0       |
| `structural` | 0 → 0       |

Per test: base 5,539 passed, 0 failed, 4 skipped; head 5,542 passed, 0 failed, 1 skipped. `new_failures`: none.
`regressions: []`, `pre_existing: []`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `regression-report.json` `.verdict` = `"no-regressions"`).

This certifies only the comparison: it catches what the outside suite, the floor and the one structural eval pair
catch, nothing more. A run that took two attempts is recorded as such: Run 1's red was investigated and attributed to
load (its one failing test passed alone), not waved through, and the stage's verdict is Run 2's.
