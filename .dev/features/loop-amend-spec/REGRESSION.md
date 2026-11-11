# REGRESSION — loop-amend-spec

- **Base:** `ddfaf751704baf1028af577cb8fe43b436cfaa2f` (HEAD, the maintainer's trusted-doc commit; the working tree held
  the uncommitted build, so base = HEAD), checked out detached in a scratch worktree.
- **Inside (33):** the 31 `## Files` paths this build changed (four declared tests needed no edit:
  `check-loop-record.test.mjs`, `check-loop-decision.test.mjs`, `worktree-fingerprint.test.mjs`,
  `check-bash-reconcile.test.mjs`) plus this feature's `PLAN.md` and `GRILL.md` (exempted by `--feature`, listed in
  `escape_exempt`). `escaped: []`.
- **Outside:** 182 test files (every `*.test.mjs` / `*.test.cjs` not inside), `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`). Style gates skipped: no shared style config is inside.

## First run — REGRESSIONS (a STOP)

The first run (same base, same scope) read `tests` base 0 / head 1, `per_test.new_failures` one test:

```text
pharn/floor/frontmatter-core.test.mjs::✧ CLOSURE (6.65.2): every non-test floor module that tests the frontmatter fence is a listed consumer
```

The new `pharn/floor/spec-amend-core.mjs` read a SPEC's body with `FM_RE`, which that closure counts as testing the
frontmatter fence, and it is not a listed consumer. **Fix:** `spec-amend-core.mjs` no longer reads the fence. `status`'s
`pending` is now "the `## Acceptance Criteria` lines still equal `SPEC.a1.md`'s" (through `spec-template-core.mjs`
`specSectionLines`), which is what `/pharn-spec`'s amend mode needs to know (nothing appended yet), instead of "the
body after the frontmatter is unchanged". The contract and the CLI header say so; the tests drive both states with real
SPEC texts. Every changed file is a declared `## Files` path, written under the plan's scope. The regress directory was
then cleared and the stage re-run from its first step.

## Second run — the verdict

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests`                                 | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

**Per-test (`tests`):** base 6,017 passed / 0 failed / 7 skipped; head 6,023 passed / 0 failed / 1 skipped;
`new_failures: []`, `still_failing: 0`. The six tests skipped at the base only are the same shape the 7.9.0 run
recorded; why they skip in the scratch checkout was not investigated.

`regressions: []` · `pre_existing: []`

Verdict: **REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This comparison catches what the outside suite catches and nothing more: a break no test, `validate` or eval pair covers
is invisible to it.
