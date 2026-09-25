# REGRESSION — markdownlint-ignore-agents

- base: `0eb19bea288d0064539f054aa0581194f08db48f` (auto-detected: `git status --porcelain` was non-empty, a
  working-tree build, so `base = HEAD`)
- machine report: [`regression-report.json`](./regression-report.json), the `check-regress.mjs verdict` stdout
  verbatim (`cmp` equal)

## Partition (`check-regress.mjs scope --feature markdownlint-ignore-agents`, exit 0)

- inside (5): `.markdownlint-cli2.jsonc`, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`, and this feature's
  `PLAN.md` / `GRILL.md`
- escaped: none. `escape_exempt`: this feature's `PLAN.md` and `GRILL.md`, each written by its own stage.
- outside: 103 test files, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`; both confirmed readable before its exit code was recorded)
- style gates: **run**, because `inside` touches the shared config `.markdownlint-cli2.jsonc`. The baseline
  worktree ran `npm ci` first.

## Environment (orchestration, advisory)

The head side runs in this worktree, which holds a copy of the main checkout's gitignored `.agents/` (19
`SKILL.md` files). The same copy went into the baseline worktree before its run, so both sides lint the same
environment. Without it the base `lint:md` would have measured a tree that never shows the failure.

## Gates (exit codes, `base → head`)

```text
tests (103 outside files; 3133 tests, 3133 pass both sides)   0 → 0
validate                                                      0 → 0
structural:…/expected-injection-comment.json                  0 → 0
lint                                                          0 → 0
format:check                                                  0 → 0
lint:md                                                       1 → 0
```

- regressions: `[]`
- pre_existing: `["lint:md"]`. That is the helper's class for a gate red at base. Here it is the failure this
  increment fixes: base `Summary: 19 issues in 19 files`, all MD025 in `.agents/skills/*/SKILL.md`; head
  `Summary: 0 issues in 0 files`.

## Verdict (FLOOR — `check-regress.mjs`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This catches what the suite above catches, nothing more. A behavior no test, rule or eval covers is invisible
here. The verdict certifies the exit-code comparison only; it does not certify the increment. Choosing the base,
the partition and the `.agents/` copy was orchestration and is advisory.
