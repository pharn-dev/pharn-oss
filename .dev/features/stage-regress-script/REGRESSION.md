# REGRESSION — stage-regress-script

**base**: `767bf61f493f73c859a9820a01bddcb8f4f40a8d` (`git merge-base HEAD origin/main`, per the maintainer's
delegated instruction for this run)

**Re-run note.** This stage ran twice. The first run's `inside` set omitted `pharn/floor/gate-run-core.mjs`
because a planned comment-only edit to it had been deferred during the build and, at that point, never
completed — the file was still byte-identical to base. After the build stage caught the omission, applied
the fix, and re-verified (see `BUILD.md`, "Re-runs"), this stage was re-run in full over the corrected
tree. The base commit is unchanged, so only the HEAD-side gate captures and the partition were redone; all
six gates stayed green on both sides across both runs.

## Inside / outside partition

- **inside (changed since base, 35 paths)**: the 29 files the PLAN's `## Files` declares, plus this
  feature's own pipeline artifacts written by earlier stages — `BUILD.md`, `GRILL.md`, `PLAN.md`,
  `REGRESSION.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json` — exempted from the escape
  check via `--feature stage-regress-script`, never a build escape.
- **escaped**: none. `check-regress.mjs scope` exited 0.
- **escape_exempt**:
  `.dev/features/stage-regress-script/{BUILD.md,GRILL.md,PLAN.md,REGRESSION.md,VERIFY.md,regression-report.json,verify-report.json}`.
- **outside_tests**: 102 of the repo's 104 `*.test.mjs`/`*.test.cjs` files, per `check-regress.mjs scope`'s
  own set-membership computation (the source of truth this line only restates).
- **outside_eval_pairs**: the one committed pair,
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`.
- **Style gates ran** (`lint`, `format:check`, `lint:md`): `inside` touches `.prettierignore` and
  `.markdownlint-cli2.jsonc`, so the config-touch skip does not apply.

## Gate table (base → head)

| gate                                           | base | head |
| ---------------------------------------------- | ---- | ---- |
| `tests` (102 outside files, via `node --test`) | 0    | 0    |
| `validate` (`node pharn/floor/validate.mjs .`) | 0    | 0    |
| `structural:…/expected-injection-comment.json` | 0    | 0    |
| `lint` (`eslint .`)                            | 0    | 0    |
| `format:check` (`prettier --check .`)          | 0    | 0    |
| `lint:md` (`markdownlint-cli2`)                | 0    | 0    |

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

`pre_existing`: none. `regressions`: none.

`/pharn-dev-regress` catches exactly what its suite catches — nothing more. This is not a claim that
nothing broke; it is a claim that the six deterministic gates above, run over the outside-scope area at
this base and at HEAD, show no pass→fail flip.
