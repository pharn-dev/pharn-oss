# REGRESSION — ship-quick-mode

## After the merge of main (2026-09-26)

- **Run:** after `origin/main` (`1524c6f`, `stage-regress-script`, 6.23.0) was merged in and the re-review's N1–N3
  were fixed. It ran on the committed merge, with a clean tree at run time and without the human-only patch. That
  merge commit was then amended to add only this chain's three records (`REGRESSION.md`, `regression-report.json`
  and `VERIFY.md`), so the code this run measured is the code on the branch. Stage model: opus — set by the maintainer's instruction, overriding pharn.config.json's sonnet for
  build/regress/verify; routed via Agent subagent; effort not routed.
- **Base:** `1524c6ff90844ee17457ca9450a7abb894a7b1f1`, which is `origin/main`, passed explicitly on the
  orchestrator's instruction. After the merge it is also `git merge-base HEAD origin/main`, so the comparison is
  exactly this phase's changes against the `main` it merges into.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** Verdict
`no-regressions` (`check-regress.mjs verdict`, exit 0; `regression-report.json` is its stdout, byte-identical).

### Partition

- **Declared** (`PLAN.md` `## Files`, unchanged by the merge): 38 paths.
- **Inside** (`git diff --name-only <base>` + untracked): 44 paths. These are the 38 declared paths plus six of this
  feature's own pipeline artifacts, which `--feature ship-quick-mode` exempts and reports in `escape_exempt`:
  `GRILL.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json` and `verify-report.json`.
- **Escaped:** none (`check-regress.mjs scope` exit 0, `escaped: []`).
- **Outside tests:** 99 files, the 109 tracked `*.test.mjs` / `*.test.cjs` minus the 10 inside. #277 added five
  test files, so the count is up from 94.
- **Outside eval pairs:** 1 — `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
  ↔ `.dev/features/trust-fence/findings.json`, both paths confirmed readable before its exit code was recorded.

### Gate table (base → head)

| gate                                                                | base | head | verdict |
| ------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (the 99 outside files, one `node --test` over the list)     | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)          | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural`) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.** The style gates were skipped by the config-touch rule: `inside`
touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`. #277
changed two of them, but that change is in the base, not in this phase's diff.

### How the baseline was obtained (orchestration — advisory)

It was obtained as in the run below. A scratch Node runner under `.pharn/pharn-dev-regress/` used argv arrays only,
and was deleted afterwards. `git archive <base>` was extracted under `.pharn/pharn-dev-regress/snap/base/`, with
`GIT_CEILING_DIRECTORIES` set to its parent. The snapshot was removed before the HEAD run. The merge was committed
before this run because `pharn/floor/` is reconciled against `HEAD`'s blobs (`PLAN.md`, "Amended at GATE 2 (merge
of main)"). The committed tree is what both `/pharn-dev-regress` and `/pharn-dev-verify` measured.

### The honest residual (P0/P7)

Unchanged, and stated in the run below: this catches what the suite catches — nothing more.

## After GATE 2 fix (2026-09-26)

- **Run:** after the GATE-2 review-fix pass, on the working tree over `2071a97` (the fixes uncommitted at run
  time). Stage model: opus — set by the maintainer's instruction, overriding pharn.config.json's sonnet for
  build/regress/verify; routed via Agent subagent; effort not routed.
- **Base:** `767bf61f493f73c859a9820a01bddcb8f4f40a8d` — `git merge-base HEAD origin/main`, the phase branch's
  fork point, passed explicitly as the previous run did, so the comparison spans the whole phase (build and
  review fixes), not only the uncommitted fix pass.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** Verdict
`no-regressions` (`check-regress.mjs verdict`, exit 0; `regression-report.json` is its stdout, byte-identical).

### Partition

- **Declared** (`PLAN.md` `## Files`, the amended plan): 38 paths — the 37 of the build plus
  `.claude/commands/pharn-verify.md`, added at GATE 2.
- **Inside** (`git diff --name-only <base>` + untracked): 44 paths — the 38 declared plus six of this feature's
  own pipeline artifacts, exempted by `--feature ship-quick-mode` and reported in `escape_exempt`: `GRILL.md`,
  `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`.
- **Escaped:** none (`check-regress.mjs scope` exit 0, `escaped: []`).
- **Outside tests:** 94 files (the 104 tracked `*.test.mjs` / `*.test.cjs` minus the inside set).
- **Outside eval pairs:** 1 — `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
  ↔ `.dev/features/trust-fence/findings.json`, both paths confirmed readable before its exit code was recorded.

### Gate table (base → head)

| gate                                                                | base | head | verdict |
| ------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (the 94 outside files, one `node --test` over the list)     | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)          | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural`) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.** The style gates were skipped by the config-touch rule: `inside`
touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`.

### How the baseline was obtained (orchestration — advisory)

The command's Bash (Steps 1–3) was run through a scratch Node runner under `.pharn/pharn-dev-regress/`, with
argv arrays only, because this isolated worktree refuses shell variables, pipes and heredocs; the runner was
deleted afterwards. It computed nothing the command does not prescribe — `check-regress.mjs` owns the
partition and the verdict. The baseline was `git archive <base>` extracted under `.pharn/pharn-dev-regress/base/`
(scratch stays under `.pharn/<command>/`), with `GIT_CEILING_DIRECTORIES` set so that git inside the snapshot
could not walk up into this repository — the snapshot ran outside any repository, as the previous run's
did. The snapshot was **removed before the HEAD run**, because a nested snapshot under the worktree
double-counts lenses in the HEAD gates (the previous run's recorded harness artifact).

### The honest residual (P0/P7)

`/pharn-dev-regress` catches exactly what its suite catches — nothing more. A behavior change outside the
feature with no test, rule or eval covering it is invisible here. The claim is "deterministically-detectable
breakage outside `ship-quick-mode` is caught, and none was found", never "nothing broke". `validate` is
whole-repo, so a flip there is reported at repo granularity; per-file precision lives in the scoped `tests`
gate.

## Before GATE 2 — the build's run (kept for the audit trail)

**Base:** `767bf61f493f73c859a9820a01bddcb8f4f40a8d` (= `git merge-base HEAD origin/main`; the
orchestrator's explicit instruction for this run — at the time this base was resolved, `HEAD` was a
prior grill-stage checkpoint commit (`wip(ship-quick-mode): grill`) sitting exactly at this same SHA, so
the explicit base and the command's own working-tree-dirty auto-detect rule (`base = HEAD`) coincided.
After a session restart, `HEAD` advanced to that grill commit while `origin/main` stayed at the same SHA,
so the two are no longer numerically equal; the orchestrator's explicit base was kept unchanged, since it
still correctly spans everything this phase branch has changed since its fork point (the grill commit's
own diff plus every uncommitted build-stage change), which is the more complete "outside" comparison.

**Verdict: `no-regressions`** — no deterministically-detectable breakage outside the feature.

- **Declared** (`.dev/features/ship-quick-mode/PLAN.md` `## Files`): 37 paths.
- **Inside** (`git diff --name-only <base>` + untracked): 38 paths — the 37 declared paths plus
  `.dev/features/ship-quick-mode/GRILL.md`, exempted by `--feature ship-quick-mode` (a feature-directory
  artifact from an earlier stage, not an escape).
- **Escaped:** none (`escaped: []`).
- **Outside tests:** 94 files (`*.test.mjs` / `*.test.cjs` minus the inside set).
- **Outside eval pairs:** 1 — `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
  ↔ `.dev/features/trust-fence/findings.json`.

| gate                                                                                            | base | head | verdict |
| ----------------------------------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (94 outside files, `cat outside-tests.txt \| xargs node --test`)                        | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)                                      | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural.mjs` on the trust-fence eval) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.**

**Baseline mechanism (a deviation from the command's literal `git worktree add`, documented).** That run used
`git archive <base> | tar -x` into a scratch directory instead of `git worktree add --detach`, because this
worktree shares its object store with many concurrently active agent worktrees and `git worktree add/remove`
mutates shared worktree-registry metadata. The resulting tree is behaviorally identical for the three
stdlib-only gates. **One harness artifact was caught and corrected:** a first attempt placed the snapshot
under `.pharn/pharn-dev-regress/baseline/`, and the HEAD run, executed while that nested snapshot existed,
double-counted `pharn-review` lenses (22 real + 22 nested = 44), reddening two outside tests that were GREEN
at baseline. The snapshot was deleted and rebuilt outside the repo tree, the HEAD run repeated, and both
tests returned to `0`.
