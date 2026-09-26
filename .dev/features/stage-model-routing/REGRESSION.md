# REGRESSION — stage-model-routing

- **Run:** the build's run, on the uncommitted working tree the build left (HEAD `25a2599` plus the build's changes).
  Stage model: opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent;
  effort not routed.
- **Base:** `2e5c2e3183c595c76abadde8878d1fa2e94d115e`, passed explicitly by the orchestrator as
  `git merge-base HEAD origin/main` (`main` at 6.25.0, #280). The command's own auto-detect would have picked `HEAD`
  for a dirty tree; the invoker's `--base` takes precedence, so the comparison is this phase's whole change —
  plan, grill and build — against the `main` it merges into.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** Verdict `no-regressions`
(`check-regress.mjs verdict`, exit 0; `regression-report.json` is its stdout, byte-identical — `cmp` clean).

## Partition

- **Declared** (`PLAN.md` `## Files`): 32 paths.
- **Inside** (`git diff --name-only <base>` + untracked): 34 paths — the 32 declared paths plus this feature's own
  `PLAN.md` and `GRILL.md`, which `--feature stage-model-routing` exempts and reports in `escape_exempt`.
- **Escaped:** none (`check-regress.mjs scope` exit 0, `escaped: []`).
- **Outside tests:** 107 files — the 111 tracked `*.test.mjs` / `*.test.cjs` minus the 4 inside
  (`mark-phase`, `render-cost-ledger`, `ship-outcome-core`, `command-hygiene`). The four new test files are
  untracked, so inside.
- **Outside eval pairs:** 1 — `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both paths confirmed readable before its exit code was recorded.

## Gate table (base → head)

| gate                                                                | base | head | verdict |
| ------------------------------------------------------------------- | ---- | ---- | ------- |
| `tests` (the 107 outside files, one `node --test` over the list)    | 0    | 0    | clean   |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)          | 0    | 0    | clean   |
| `structural:…/expected-injection-comment.json` (`check-structural`) | 0    | 0    | clean   |

**`regressions: []` · `pre_existing: []`.** The style gates were skipped by the config-touch rule: `inside`
touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`.

## How the baseline was obtained (orchestration — advisory)

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
