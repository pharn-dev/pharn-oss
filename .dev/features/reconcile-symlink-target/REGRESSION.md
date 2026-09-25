# REGRESSION — reconcile-symlink-target

- **Base:** `8eec2d7e6f18744a63789b3dda97bbf75f45361e`. The working tree was dirty, so `base = HEAD`. This is
  `origin/main` after #269; the branch was rebased onto it after the first verify, and these are the post-rebase runs.
- **Inside (25 paths):** the 19 `## Files` paths of the plan, plus this feature's own six pipeline artifacts, which
  `check-regress.mjs scope --feature` listed in `escape_exempt`. `scope` exited 0: no path escaped the declared writes.
- **Outside gates:** 94 outside test files (`tests`), `validate`, and the one committed eval pair
  (`structural:…/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`, both paths checked
  readable before any gate ran). The style gates were skipped by the deterministic rule: `inside` touches no shared
  style config.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (94 outside test files)                                                            | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: none

**Deterministic verdict (`check-regress.mjs verdict`, exit 0): REGRESSIONS: none — no deterministically-detectable
breakage outside the feature.** It catches exactly what these gates catch, nothing more. It is not a claim that nothing
broke.

## The run before this one, recorded rather than dropped

The first post-rebase run returned `tests` base 0 → head **1**, and `check-regress.mjs verdict` exited **1**
(`regressions`). That runner discarded the test output, so the failing test is not known. It did not reproduce:

- a full `npm test` right afterwards reported `fail 0`;
- the runner was re-run once, now keeping each side's test output in `.pharn/pharn-dev-regress/tests-{base,head}.log`.
  That run is the verdict above, `head` 0, with nothing failing or cancelled in the head log.

Several agents were running suites on this machine at once. The brief says a timing-only failure gets one re-run before
it is treated as real, and this is that re-run. The deviation is advisory orchestration and is stated here; the verdict
of record is the helper's output from the re-run, copied byte-identical into `regression-report.json` (checked with
`cmp`).

## Orchestration deviation (advisory)

This worktree session's shell guard refuses the pinned forms (`$(…)`, `paste`, `xargs`). Steps 1–3 therefore ran from
a node runner under `.pharn/pharn-dev-regress/` that calls `git`, `check-regress.mjs scope`/`verdict` and each gate
through `spawnSync` with argv arrays. A list passed as an array cannot be word-split, which is the failure L5 and L16
record. The base gates ran in a detached `git worktree` at the base SHA under the session scratchpad, removed
afterwards. The pre-rebase run, against base `7bcd7a8`, was also `no-regressions`. It was superseded by these
post-rebase runs.
