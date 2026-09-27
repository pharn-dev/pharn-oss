# REGRESSION — loop-quick-mode

- stage model: regress — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- base: `c85be1bdeee10e333e52f9d38b4e0eb218e4c2d1` — `origin/main` after #283 (2.2, `stage-model-routing`, 6.27.0),
  the command's own default (`git merge-base HEAD origin/main`; the working tree was clean). HEAD: `b88aebd`, the merge
  of `origin/main` over the maintainer's LIMITS apply `1cbb6c4`. This run follows the apply, as `APPLY.md` orders, and
  replaces the one recorded at the GATE-2 FIX round.
- the machine report: `regression-report.json`, the helper's `verdict` JSON verbatim (`cmp` identical).

## Partition (`check-regress.mjs scope`, exit 0)

- **inside** — 51 paths: `git diff --name-only c85be1b`, and no untracked file. **declared** — the 44 `PLAN.md`
  `## Files` paths after the final-prep amendments (`scope-inputs.mjs`'s `declaredWrites`). **escaped: none.**
  `escape_exempt`: this feature's own stage artifacts, each written by its own stage under that stage's scope —
  `GRILL.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json` — and
  `LIMITS.md`, a hook-protected trusted doc the agent cannot write: its change here is the maintainer's apply
  (`1cbb6c4`).
- **outside gates** — `tests` (the 109 tracked test files not inside, of 120), `validate`, and one `structural:` eval
  pair (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before running).
- **style gates skipped** — `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`, so no style result over the outside files can flip; absent from both maps.

## Gates, base → head (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (one `node --test` over the 109 outside test files)                                | 0    | 0    |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions: []` · `pre_existing: []`. The base side ran in a detached worktree at the base SHA, created under
`.pharn/pharn-dev-regress/` and removed after capture, before the HEAD side ran; it has no `node_modules`, which the
stdlib-only core gates do not need.

**Harness note (stated, not hidden):** the command's pinned shell forms (`$(git ls-files … | paste)`,
`cat … | xargs node --test; T=$?`, `mktemp -d`) are refused in this isolated worktree, so a scratch Node runner under
`.pharn/pharn-dev-regress/` ran the same steps with argv arrays: one `node --test` invocation over the whole outside
list (xargs' semantics without its splitting), each gate's exit code recorded and never its output, and the base
worktree under `.pharn/` rather than a temp root.

## Verdict (`check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies the comparison and nothing more: `/pharn-dev-regress` catches exactly what its suite catches. A
regression no deterministic check covers is invisible here, and a build that rewrote its own `## Files` would not be
caught by the partition. Here the `PLAN.md` diff includes every amendment section that added `## Files` paths (GATE
2, the coupling, final prep), each naming and justifying its paths — read them.
