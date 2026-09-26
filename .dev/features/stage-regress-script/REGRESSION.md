# REGRESSION — stage-regress-script

**base**: `767bf61f493f73c859a9820a01bddcb8f4f40a8d` (`git merge-base HEAD origin/main`, per the maintainer's
delegated instruction for this run) for the original two runs (see below); `a2a06e80a069944db909c6cea53d4b8e2b322a25`
for the GATE-2 re-run below (the working tree was dirty with the GATE-2 fixes, so `base = HEAD` per the
command's own base-resolution rule); and `767bf61…` again, passed as an explicit `--base`, for the GATE-2
round-2 re-run at the end of this file. **That last re-run is the standing one:**
`regression-report.json` is its output.

**Re-run note (original build).** This stage ran twice during the original build. The first run's
`inside` set omitted `pharn/floor/gate-run-core.mjs` because a planned comment-only edit to it had been
deferred during the build and, at that point, never completed — the file was still byte-identical to
base. After the build stage caught the omission, applied the fix, and re-verified (see `BUILD.md`,
"Re-runs"), this stage was re-run in full over the corrected tree. The base commit was unchanged for that
re-run, so only the HEAD-side gate captures and the partition were redone; all six gates stayed green on
both sides across both runs.

**Re-run note (after GATE 2 fix, 2026-09-26).** `.dev/features/stage-regress-script/REVIEW.md` (GATE 2)
returned `blocked-with-2-floor-findings`; the orchestrator decided GATE 2 **FIX** under the maintainer's
delegation. This stage was re-run in full over the fixed tree, per `BUILD.md`'s "GATE 2 — review fixes"
section. The working tree was dirty with the fixes at re-run time, so `base = HEAD` (`a2a06e8`, the
commit that merged `REVIEW.md` in) resolved per the command's own rule; `inside` is therefore exactly the
17 paths this GATE-2 fix pass touched, not the full 35-path set the original build compared. Every gate
below is this re-run's own capture, superseding the original build's numbers (still recorded above for
the historical record); the verdict is unchanged: no regressions.

## Inside / outside partition (GATE-2 re-run)

- **inside (changed since `a2a06e8`, 17 paths)**: the 15 product/test files this fix pass edited
  (`stage-exit-core.mjs`/`.test.mjs`, `stage-regress-core.mjs`/`.test.mjs`, `stage-regress.mjs`/`.test.mjs`,
  `render-regression.mjs`/`.test.mjs`, `stage-exit.md`, `pharn-regress.md`, `pharn-loop.md`,
  `pharn-ship.md`, `CHANGELOG.md`, `CLAUDE.md`, `command-hygiene.test.mjs`), plus this feature's own
  `BUILD.md`/`PLAN.md` (the GATE-2 disposition record and its `## Files` amendment).
- **escaped**: none. `check-regress.mjs scope` exited 0 against the amended `## Files` list (which now
  also names `BUILD.md`/`REGRESSION.md`/`VERIFY.md`/`regression-report.json`/`verify-report.json` under
  the "Amended at GATE 2 (review fixes)" note, since a plan's `## Files` never listed the dev-pipeline's
  own process artifacts in the first place).
- **escape_exempt**: none needed this run (every changed dev-pipeline artifact is now directly declared).
- **outside_tests**: 104 of the repo's 108 `*.test.mjs`/`*.test.cjs` files (the four newly-changed test
  files are `inside`, not outside).
- **outside_eval_pairs**: the one committed pair,
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`.
- **Style gates SKIPPED**: `inside` touches no shared eslint/prettier/markdownlint config this run — the
  config-touch skip applies (unlike the original build, which touched `.prettierignore` and
  `.markdownlint-cli2.jsonc` and ran them).

## Gate table (base → head), GATE-2 re-run

| gate                                           | base | head |
| ---------------------------------------------- | ---- | ---- |
| `tests` (104 outside files, via `node --test`) | 0    | 0    |
| `validate` (`node pharn/floor/validate.mjs .`) | 0    | 0    |
| `structural:…/expected-injection-comment.json` | 0    | 0    |

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

`pre_existing`: none. `regressions`: none.

`/pharn-dev-regress` catches exactly what its suite catches — nothing more. This is not a claim that
nothing broke; it is a claim that the three deterministic gates above, run over the outside-scope area at
this base and at HEAD, show no pass→fail flip. The full `npm run check` (format, lint, lint:md, docs,
markers, badge, changelog, contributing, reconcile, and all 3450 `npm test` cases, including every file
this fix pass itself touched) was ALSO run separately and is GREEN — see `VERIFY.md` for that gate table.

## Re-run after GATE-2 round 2 (opus, 2026-09-26) — the standing run

- **Why.** GATE-2 round 2 changed code: `stage-regress.mjs` (worktree clearing, the budget clock, the
  cleanup rule) and `stage-regress.test.mjs`. BUILD.md, "GATE 2 round 2", has the details.
- **Model.** opus, by the maintainer's instruction, overriding `pharn.config.json`'s sonnet for regress.
  Model routed via Agent subagent; effort not routed.
- **Base.** `767bf61f493f73c859a9820a01bddcb8f4f40a8d`, passed as an explicit `--base` (the command's
  first rule). It is the increment's own merge-base with `origin/main` (re-resolved this run), so this
  re-run compares the WHOLE increment: the original build, both GATE-2 fix rounds and every stage
  artifact. The round-1 re-run above covered only the fix pass.
- **How the gates ran.** They ran through a node runner under `.pharn/pharn-dev-regress/`, not the pinned
  `xargs` line. The isolated worktree refuses that shell form. The runner hands the outside-test list to
  `node --test` as an argv array, so there is no shell word-splitting at all, the L5/L16 hazard the pinned
  form exists to avoid.
- **The base worktree.** It was created at `.pharn/pharn-dev-regress/base` (never `/tmp`), given `npm ci`
  because the style gates run, and removed BEFORE the HEAD gates. It sits under `.pharn/`, which neither
  `eslint .` nor `markdownlint-cli2` ignores, so the HEAD gates must not see it.

### Inside / outside partition (round-2 re-run)

- **inside (37 paths):** everything the increment changed since the base, including REVIEW.md.
- **escaped:** none; `check-regress.mjs scope` exited 0.
- **escape_exempt:** `GRILL.md`, `REVIEW.md` (this feature's own pipeline artifacts; the others are
  declared by the PLAN's GATE-2 amendment).
- **outside_tests:** 102.
- **outside_eval_pairs:** the one committed pair,
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json` (readability confirmed first).
- **Style gates RAN:** `inside` touches `.prettierignore` and `.markdownlint-cli2.jsonc`.

### Gate table (base → head), round-2 re-run

| gate                                           | base | head |
| ---------------------------------------------- | ---- | ---- |
| `tests` (102 outside files, via `node --test`) | 0    | 0    |
| `validate` (`node pharn/floor/validate.mjs .`) | 0    | 0    |
| `structural:…/expected-injection-comment.json` | 0    | 0    |
| `lint` (`npm run lint`)                        | 0    | 0    |
| `format:check` (`npm run format:check`)        | 0    | 0    |
| `lint:md` (`npm run lint:md`)                  | 0    | 0    |

### Verdict (round-2 re-run)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `check-regress.mjs
verdict` exited 0, and `regression-report.json` is its stdout byte for byte (`cmp`-checked).
`pre_existing`: none. `regressions`: none.

`/pharn-dev-regress` catches exactly what its suite catches — nothing more. This is not a claim that
nothing broke.

**One sentence above is recorded as history, not repeated.** The round-1 re-run's closing line cites
`VERIFY.md` for a run that had not yet happened when it was written (review finding N4). The verify
re-run came later, in the review agent's worktree.
