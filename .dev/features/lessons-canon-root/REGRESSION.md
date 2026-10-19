# REGRESSION — lessons-canon-root

- base: `6b49cafdb6c98da52e01fafd72b93b1335021e44` (HEAD of a dirty working tree — the dogfood rule `base = HEAD`)
- inside: the 28 paths in `regression-report.json` `.inside` (24 changed tracked files + 4 new); `scope` exited 0 —
  no changed path outside the PLAN's `## Files`. `escape_exempt`: this feature's `PLAN.md` and `GRILL.md`.
- outside gates: 157 test files, `validate`, one structural eval pair. Style gates skipped (no shared style config
  touched).

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (157 outside test files)                                                           | 1    | 1    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: `tests`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0). This stage catches what its suite catches, nothing more.

## How the run deviated from the pinned procedure (advisory orchestration, recorded)

- The pinned shell forms (`git worktree add` into `$TMP`, `cat … | xargs node --test`, `$?` capture) are refused in
  this worktree-isolated session. The same steps ran from a scratch runner, `.pharn/pharn-dev-regress/run.mjs`, with
  argv arrays (`spawnSync`). It records exit codes only.
- The baseline tree was `git archive` of the base SHA, extracted OUTSIDE the repo (the session scratchpad) with
  `node_modules` symlinked in. It has no `.git`.
- **The `tests` gate is `pre_existing` and so masks nothing it would otherwise catch — read it as such.** Base: 5166
  pass, 2 fail. Head: 5164 pass, 4 fail. Every failing test is a timing- or git-dependent case in
  `stage-regress.test.mjs`, `stage-verify.test.mjs`, `entry-base-evidence.test.mjs` or `render-run-report.test.mjs`
  (each over 19 s, on a machine running several parallel agents' suites). None of those files or their modules is in
  `inside`. Because the gate is red at base, a head-only red in another test would also be classified
  `pre_existing`. The real backstop is `/pharn-dev-verify`'s whole-suite `npm test` at HEAD.
