# REGRESSION — slim-commands

- stage: `/pharn-dev-regress`, re-run at GATE 2 after the FIX round and the merge of `origin/main` at 6.28.1 (#282,
  `b9c5a46`), on the merge commit `9d5e2f9`. The build-time run (base `b6274095`) is replaced by this one.
- stage model: regress — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- base: `b9c5a4669e3f19b14c86f791e4df63413d8667dd` (`git merge-base HEAD origin/main`; the tree was clean, so this
  is also the command's own auto rule).
- machine report: `regression-report.json` (the `check-regress.mjs verdict` stdout, byte-identical — `cmp` exit 0).

## Scope partition (`check-regress.mjs scope --feature slim-commands` → exit 0)

- **inside** (24): `git diff --name-only <base>`, no untracked file — the eleven product commands,
  `command-hygiene.test.mjs`, `CHANGELOG.md`, `CLAUDE.md`, `README.md`, `SKILLS_VERSION`, and this feature's
  `PLAN.md`, `BUILD.md`, `GRILL.md`, `REVIEW.md` and earlier stage reports.
- **declared** (18): PLAN.md `## Files`.
- **escaped:** none. **escape_exempt:** this feature's own stage artifacts — `GRILL.md`, `REGRESSION.md`,
  `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`.
- **outside gates:** 121 test files (every committed `*.test.mjs` / `*.test.cjs` but the one inside), `validate`, and
  the one committed eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`, both
  confirmed readable before its exit was recorded).
- **style gates skipped:** `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`, so a style flip over the outside files is impossible; the gates are absent from both maps.

## Per-gate exit codes

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (121 outside files, `node --test` with the paths on argv)                          | 0 → 0       |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

The base side ran in a detached `git worktree` of the base commit (removed afterwards, exit 0), the head side in the
working tree; both from the same runner under `.pharn/pharn-dev-regress/`, which passes the outside-test paths to
`node --test` as an argv array — the isolated worktree refuses the pinned `xargs` shell form, and neither recorded
wrong form (`$LIST`, `xargs -a`) was used.

- `regressions`: none. `pre_existing`: none.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`,
exit 0, `no-regressions`).

This certifies the comparison only: `/pharn-dev-regress` catches exactly what its suite catches, nothing more. A
regression no deterministic check covers is invisible here.
