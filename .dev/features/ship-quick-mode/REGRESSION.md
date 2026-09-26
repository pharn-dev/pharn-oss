# REGRESSION — ship-quick-mode

**Base:** `767bf61f493f73c859a9820a01bddcb8f4f40a8d` (= `git merge-base HEAD origin/main`; the
orchestrator's explicit instruction for this run — at the time this base was resolved, `HEAD` was a
prior grill-stage checkpoint commit (`wip(ship-quick-mode): grill`) sitting exactly at this same SHA, so
the explicit base and the command's own working-tree-dirty auto-detect rule (`base = HEAD`) coincided.
After a session restart, `HEAD` advanced to that grill commit while `origin/main` stayed at the same SHA,
so the two are no longer numerically equal; the orchestrator's explicit base was kept unchanged, since it
still correctly spans everything this phase branch has changed since its fork point (the grill commit's
own diff plus every uncommitted build-stage change), which is the more complete "outside" comparison.

**Verdict: `no-regressions`** — no deterministically-detectable breakage outside the feature.

## Partition

- **Declared** (`.dev/features/ship-quick-mode/PLAN.md` `## Files`): 37 paths.
- **Inside** (`git diff --name-only <base>` + untracked): 38 paths — the 37 declared paths plus
  `.dev/features/ship-quick-mode/GRILL.md`, exempted by `--feature ship-quick-mode` (a feature-directory
  artifact from an earlier stage, not an escape).
- **Escaped:** none (`escaped: []`).
- **Outside tests:** 94 files (`*.test.mjs` / `*.test.cjs` minus the inside set).
- **Outside eval pairs:** 1 — the one committed pair the command names by convention:
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`.

## Gate table (base → head)

| gate                                                                                            | base | head | verdict |
| ----------------------------------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (94 outside files, `cat outside-tests.txt \| xargs node --test`)                        | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)                                      | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural.mjs` on the trust-fence eval) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.**

## Baseline mechanism (a deviation from the command's literal `git worktree add`, documented)

The command's Step 2 prescribes `git worktree add --detach "$TMP" "<base>"` to materialize the baseline.
This run used `git archive <base> | tar -x` into a scratch directory instead, for one reason: this
worktree shares its underlying `.git` object store with roughly a dozen other concurrently-active agent
worktrees (confirmed live via `git worktree list` after a session restart), and `git worktree add/remove`
mutates shared worktree-registry metadata under that store — a plausible source of contention/slowness
between concurrent agents, which the coordinator explicitly asked this run to avoid ("avoid any single
Bash call that could block indefinitely"). `git archive` reads the base commit's tree and writes nothing
to shared git metadata, so it carries none of that risk. The resulting file tree is behaviorally identical
for the three stdlib-only gates this stage runs (none of them need `.git`).

**One harness artifact caught and corrected, recorded rather than hidden (the command's own warning: "a
red baseline/head flip is a signal to investigate the harness, never to record the number").** The first
attempt placed the baseline snapshot under `.pharn/pharn-dev-regress/baseline/` (repo-internal scratch).
Because `.pharn/` is not itself excluded by every filesystem-walking check, the HEAD gate run — executed
from the worktree root, which by then contained that nested snapshot — double-counted `pharn-review`
lenses (`22` real + `22` from the nested snapshot copy `= 44`), tripping two outside tests
(`pharn/floor/lens-scanner-map.test.mjs`, `pharn/floor/check-review-assignments.test.mjs`) that were
GREEN at baseline. This was a self-inflicted artifact of scratch placement, not a build regression: the
baseline run (executed before the HEAD run, from inside the snapshot itself, which never nested a second
copy) was unaffected and reported clean. The snapshot was deleted and rebuilt under a plain system temp
directory (outside the repo tree, matching where the command's own `mktemp -d` would have placed a real
worktree), and the HEAD gate run was repeated; both flagged tests returned to `0` and every subsequent
result in this report reflects that corrected run.

## The honest residual (P0/P7)

`/pharn-dev-regress` catches exactly what its suite catches — nothing more. A behavior change outside the
feature with no test, rule, or eval covering it is invisible to this stage. This run's claim is
"deterministically-detectable breakage outside `ship-quick-mode` is caught, and none was found" — not
"nothing broke."

`validate` is whole-repo (no outside-only CLI scope), so a `validate` flip would be reported at repo
granularity; per-file precision lives in the scoped `tests` gate. Style gates (`lint` / `format:check` /
`lint:md`) were skipped by the deterministic config-touch rule: `inside` touches no shared style config
(`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`), so a style flip
outside the feature is provably impossible and both gate maps correctly omit the three style keys.
