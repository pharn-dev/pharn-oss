# REGRESSION — ci-permissions

**Base:** `ab9aabdf5ea5177713bda2fee82c7220ec559a7c` (auto-detected: `git status --porcelain` was non-empty,
so this is a working-tree dogfood and `base = HEAD`).

## Inside / outside partition (computed by `pharn/floor/check-regress.mjs scope`, not by judgment)

| set             | members                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `inside`        | `.github/workflows/ci.yml`, `.dev/features/ci-permissions/GRILL.md`, `.dev/features/ci-permissions/PLAN.md` |
| `declared`      | `.github/workflows/ci.yml` (the plan's `## Files`)                                                          |
| `escaped`       | **none** — the build did not exceed its plan                                                                |
| `escape_exempt` | `.dev/features/ci-permissions/GRILL.md`, `.dev/features/ci-permissions/PLAN.md`                             |

The two exempted paths are this feature's own pipeline artifacts, each written by its own stage under that
stage's Step-0 writes-scope. They are exempted by `--feature ci-permissions`, not by hand-filtering — the
remedy `.dev/memory-bank/lessons-learned.md` **L17** documents and **L20** demanded be given a floor check.
The `escape_exempt` list was read, the way the setter's path count is read.

**Outside gate set:** 70 test files (the complete committed test universe — **no** test file is inside the
changed scope) + `validate` (whole-repo) + one `structural:` pair.

**Style gates (`lint` / `format:check` / `lint:md`) were SKIPPED at both sides, deterministically.** The
skip rule fires when `inside` touches no shared style config; `inside` here is one workflow file plus two
`.dev/features/` artifacts, and none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
`.markdownlint-cli2.jsonc` is among them. Over outside files that are byte-identical at base and head, a
style result cannot flip, so the gate is absent from **both** maps — never from one.

## Per-gate exit codes

| gate                                                                                       | base | head | flip |
| ------------------------------------------------------------------------------------------ | ---- | ---- | ---- |
| `tests`                                                                                    | 0    | 0    | no   |
| `validate`                                                                                 | 0    | 0    | no   |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    | no   |

`tests` reported **1683 pass / 0 fail** at both sides. Identical gate-ids on both sides, so
`check-regress.mjs` had no gate-set mismatch to fail inconclusive on.

## How the baseline was obtained, stated because the method is non-standard

`/pharn-dev-regress` Step 2 prescribes `git worktree add --detach` at the base SHA. **This run was
constrained to perform no git write commands**, and `git worktree add` is one, so the baseline was
materialized differently: the single tracked change was reverted **in place**, in this worktree, at the real
repository path — `git diff --name-only HEAD` then returned **empty**, i.e. the tree was byte-identical to
`ab9aabd` — the three gates were run, and the change was re-applied. `git diff HEAD` afterwards shows the
same clean three-line addition and no other hunk, so the round-trip was lossless.

The honest consequences, each stated rather than counted — the count is deliberately not written here, and
that is not a stylistic choice: an earlier draft of this very section read "Two honest consequences, neither
hidden" above **three** bullets, which is the same defect `GRILL.md` had just raised against `PLAN.md:69`,
reproduced by the same author one stage later. See `REVIEW.md`:

- **It satisfies `.dev/memory-bank/lessons-learned.md` L26 better than a sandbox copy would**, because every
  gate ran at the real path where config resolution applies — which is exactly L26's prescription. The
  prescribed `git worktree` remedy also runs at a real path, so this substitutes the mechanism, not the
  property.
- **It is not equivalent in one respect:** an in-place revert leaves the untracked
  `.dev/features/ci-permissions/*` artifacts present during the baseline run, where a detached worktree would
  not have them. Those files are inside the changed scope and are read by no outside gate, so no gate's
  result can depend on them — but the difference is real and is recorded rather than glossed.
- **The `tests` gate was invoked as `npm test` rather than the prescribed
  `cat outside-tests.txt | xargs node --test`.** The harness refused the `xargs` form (it could not verify
  the computed operand). The substitution is exact **here and only here**: `outside_tests` is all 70
  committed test files, because no test file is inside the changed scope, and that is precisely the set
  `npm test`'s globs run — verified by the 1683-test count matching the pre-build baseline. Had any test
  file been inside the feature, `npm test` would have been the **wrong** command and this note would say so.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
(`pharn/floor/check-regress.mjs verdict` → `"verdict": "no-regressions"`, exit 0. `regressions[]` empty,
`pre_existing[]` empty.)

**The honest residual (P0/P7):** `/pharn-dev-regress` catches exactly what its suite catches, nothing more.
The claim is "deterministically-detectable breakage outside the feature is caught" — **never** "nothing
broke." That bound is sharper than usual for this increment: the change is a GitHub Actions
`permissions:` key, and **no gate in this repo executes a workflow file**. Every gate above is green
because the change is inert to all of them, not because any of them evaluated it. Whether the key behaves
as intended is decided by GitHub when CI next runs, which is outside every clock this stage owns.

**The verdict is floor-grade** — an exit-code comparison by `check-regress.mjs`. Choosing the base,
partitioning the scope, and running the suite is **advisory orchestration**. This certifies the comparison,
not the feature.
