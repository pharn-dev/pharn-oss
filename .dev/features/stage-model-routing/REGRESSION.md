# REGRESSION — stage-model-routing

## After the human apply at GATE 2 (2026-09-27)

- **Run:** on the committed tree at `0344ff1` — the maintainer's human apply of `proposed/human-only.patch`
  (`LIMITS.md` only, sha256 `b7e0754b…`, equal to `human-only.sha256`) over the GATE-2 fixes `5bf6b18` — with a clean
  tree, after the plan's scope was re-set and the baseline re-anchored (`--by stage-model-routing-after-apply`), per
  `proposed/APPLY.md`. Stage model: opus — set by the maintainer's instruction, overriding pharn.config.json; routed
  via Agent subagent; effort not routed.
- **Base:** `008b24b593ddb6b58fdacc1b60039ffb8f1fe70b`, passed explicitly by the orchestrator, and equal to
  `git merge-base HEAD origin/main` (re-checked by the runner).

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** Verdict `no-regressions`
(`check-regress.mjs verdict`, exit 0; `regression-report.json` is its stdout, byte-identical — `cmp` clean).

### Partition

- **Declared** (`PLAN.md` `## Files`): 32 paths.
- **Inside** (`git diff --name-only <base>` + untracked): 39 paths — the 38 of the GATE-2 run below, plus
  `LIMITS.md`, which the human apply changed. `check-regress.mjs scope` lists it in `escape_exempt` beside the
  feature's seven pipeline artifacts: it is one of the four hook-protected trusted docs, which the agent cannot
  write at all.
- **Escaped:** none (`check-regress.mjs scope` exit 0, `escaped: []`).
- **Outside tests:** 111 files — the 118 tracked `*.test.mjs` / `*.test.cjs` minus the 7 inside.
- **Outside eval pairs:** 1 — the trust-fence pair, both paths confirmed readable before its exit code was recorded.

### Gate table (base → head)

| gate                                                                | base | head | verdict |
| ------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (the 111 outside files, one `node --test` over the list)    | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)          | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural`) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.** The style gates were skipped by the config-touch rule: `inside` touches
none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`.

### How the baseline was obtained (orchestration — advisory)

The same method as the runs below: a scratch Node runner under `.pharn/pharn-dev-regress/` (argv arrays only,
deleted after the stage), `git archive <base>` extracted under `.pharn/pharn-dev-regress/base/` with
`GIT_CEILING_DIRECTORIES` set, and the snapshot removed before the HEAD run. The outside tests took 158 s at base and
192 s at head.

## GATE-2 FIX round (2026-09-27)

- **Run:** on the working tree the round left — HEAD `1b4158e` (`REVIEW.md`) plus the uncommitted A1–A8 and A10
  fixes — after the plan's scope was re-set and the reconciliation baseline re-anchored
  (`--by stage-model-routing-gate2`) before any fix was written. Stage model: opus — set by the maintainer's
  instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed.
- **Base:** `008b24b593ddb6b58fdacc1b60039ffb8f1fe70b`, passed explicitly by the orchestrator, and equal to
  `git merge-base HEAD origin/main` (re-checked by the runner). The command's own auto-detect would pick `HEAD` for
  a dirty tree; the invoker's `--base` takes precedence, so the comparison is this phase's whole change against the
  `main` it merges into.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** Verdict `no-regressions`
(`check-regress.mjs verdict`, exit 0; `regression-report.json` is its stdout, byte-identical — `cmp` clean).

### Partition

- **Declared** (`PLAN.md` `## Files`): 32 paths.
- **Inside** (`git diff --name-only <base>` + untracked): 38 paths — 31 of the declared paths, and seven of this
  feature's own pipeline artifacts, which `--feature stage-model-routing` exempts and reports in `escape_exempt`:
  `GRILL.md`, `PLAN.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json` and
  `verify-report.json`. The 32nd declared path, `MIN_CLI`, is back at the base's bytes (A2 reversed the bump), so
  it is not in the diff.
- **Escaped:** none (`check-regress.mjs scope` exit 0, `escaped: []`).
- **Outside tests:** 111 files — the 118 tracked `*.test.mjs` / `*.test.cjs` minus the 7 inside.
- **Outside eval pairs:** 1 — the trust-fence pair, both paths confirmed readable before its exit code was recorded.

### Gate table (base → head)

| gate                                                                | base | head | verdict |
| ------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (the 111 outside files, one `node --test` over the list)    | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)          | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural`) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.** The style gates were skipped by the config-touch rule: `inside` touches
none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`.

### How the baseline was obtained (orchestration — advisory)

The same method as the runs below: a scratch Node runner under `.pharn/pharn-dev-regress/` (argv arrays only,
deleted after the stage), `git archive <base>` extracted under `.pharn/pharn-dev-regress/base/` with
`GIT_CEILING_DIRECTORIES` set, and the snapshot removed before the HEAD run. The outside tests took 116 s at base and
117 s at head. One earlier start was stopped during its base side, before any result was recorded, to fix an
ordering in the new `pharn-ship.md` relay text; the runner then ran from scratch on the final tree.

## After merging main (6.26.0, #281) (2026-09-27)

- **Run:** on the committed merge `28bbc1a` (`origin/main` `008b24b`, `stage-verify-script`, merged in), with a clean
  tree at run time, after the plan's scope was re-set and the reconciliation baseline re-anchored
  (`--by stage-model-routing-merge-main`). Stage model: opus — set by the maintainer's instruction, overriding
  pharn.config.json; routed via Agent subagent; effort not routed.
- **Base:** `008b24b593ddb6b58fdacc1b60039ffb8f1fe70b`, the command's own rule on a clean tree:
  `git merge-base HEAD origin/main`. So the comparison is exactly this phase's changes against the `main` it merges
  into — the 6.26.0 changes are in the base.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** Verdict `no-regressions`
(`check-regress.mjs verdict`, exit 0; `regression-report.json` is its stdout, byte-identical — `cmp` clean).

### Partition

- **Declared** (`PLAN.md` `## Files`): 32 paths.
- **Inside** (`git diff --name-only <base>` + untracked): 38 paths — the 32 declared paths plus six of this
  feature's own pipeline artifacts, which `--feature stage-model-routing` exempts and reports in `escape_exempt`:
  `GRILL.md`, `PLAN.md`, `REGRESSION.md`, `VERIFY.md`, `regression-report.json` and `verify-report.json`.
- **Escaped:** none (`check-regress.mjs scope` exit 0, `escaped: []`).
- **Outside tests:** 111 files — the 118 tracked `*.test.mjs` / `*.test.cjs` minus the 7 inside (the three new ones,
  committed now, and `mark-phase`, `render-cost-ledger`, `ship-outcome-core`, `command-hygiene`). #281's new suites
  (`stage-verify`, `stage-verify-core`, `stage-runtime`, `render-verify`) are outside, and ran on both sides.
- **Outside eval pairs:** 1 — the trust-fence pair, both paths confirmed readable before its exit code was recorded.

### Gate table (base → head)

| gate                                                                | base | head | verdict |
| ------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (the 111 outside files, one `node --test` over the list)    | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)          | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural`) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.** The style gates were skipped by the config-touch rule: `inside`
touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc` (#281 changed
two of them, and that change is in the base, not inside).

### How the baseline was obtained (orchestration — advisory)

As in the run below: a scratch Node runner under `.pharn/pharn-dev-regress/` (argv arrays only, deleted after the
stage), `git archive <base>` extracted under `.pharn/pharn-dev-regress/base/` with `GIT_CEILING_DIRECTORIES` set,
and the snapshot removed before the HEAD run. The outside tests took 140 s at base and 300 s at head.

## Before the merge — the build's run (kept for the audit trail)

- **Run:** the build's run, on the uncommitted working tree the build left (HEAD `25a2599` plus the build's changes).
  Stage model: opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent;
  effort not routed.
- **Base:** `2e5c2e3183c595c76abadde8878d1fa2e94d115e`, passed explicitly by the orchestrator as
  `git merge-base HEAD origin/main` (`main` at 6.25.0, #280). The command's own auto-detect would have picked `HEAD`
  for a dirty tree; the invoker's `--base` takes precedence, so the comparison is this phase's whole change —
  plan, grill and build — against the `main` it merges into.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** Verdict `no-regressions`
(`check-regress.mjs verdict`, exit 0). That run's `regression-report.json` was superseded by the run above.

### Partition (before the merge)

- **Declared** (`PLAN.md` `## Files`): 32 paths.
- **Inside** (`git diff --name-only <base>` + untracked): 34 paths — the 32 declared paths plus this feature's own
  `PLAN.md` and `GRILL.md`, which `--feature stage-model-routing` exempts and reports in `escape_exempt`.
- **Escaped:** none (`check-regress.mjs scope` exit 0, `escaped: []`).
- **Outside tests:** 107 files — the 111 tracked `*.test.mjs` / `*.test.cjs` minus the 4 inside
  (`mark-phase`, `render-cost-ledger`, `ship-outcome-core`, `command-hygiene`). The four new test files are
  untracked, so inside.
- **Outside eval pairs:** 1 — `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both paths confirmed readable before its exit code was recorded.

### Gate table (base → head, before the merge)

| gate                                                                | base | head | verdict |
| ------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (the 107 outside files, one `node --test` over the list)    | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)          | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural`) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.** The style gates were skipped by the config-touch rule.

### How the baseline was obtained (before the merge)

The command's Bash (Steps 1–3) ran through a scratch Node runner under `.pharn/pharn-dev-regress/`, with argv arrays
only, because this isolated worktree refuses shell variables, pipes and `xargs`; the runner is deleted after the
stage. It computed nothing the command does not prescribe — `check-regress.mjs` owns the partition and the verdict.
The baseline was `git archive <base>` extracted under `.pharn/pharn-dev-regress/base/`, with
`GIT_CEILING_DIRECTORIES` set so git inside the snapshot could not walk up into this repository, and the snapshot
was removed before the HEAD run (a nested snapshot under the worktree would be seen by the HEAD gates). The outside
tests took 282 s at base and 254 s at head.

## The honest residual (P0/P7)

`/pharn-dev-regress` catches exactly what its suite catches — nothing more. A behavior change outside the feature
with no test, rule or eval covering it is invisible here. The claim is "deterministically-detectable breakage outside
`stage-model-routing` is caught, and none was found", never "nothing broke". `validate` is whole-repo, so a flip
there is reported at repo granularity; per-file precision lives in the scoped `tests` gate.
