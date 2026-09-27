# REGRESSION — loop-quick-mode

- stage model: regress — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- base: `008b24b593ddb6b58fdacc1b60039ffb8f1fe70b` — `origin/main` at 6.26.0 (#281), passed explicitly (the
  orchestrator's instruction for the GATE-2 FIX round; the working tree holds the uncommitted fixes, so the command's
  own default would have been `HEAD`). HEAD: `5ea5e67` (the review) plus the uncommitted GATE-2 fixes. This run
  replaces the one recorded on `c9d279c`.
- the machine report: `regression-report.json`, the helper's `verdict` JSON verbatim (`cmp` identical).

## Partition (`check-regress.mjs scope`, exit 0)

- **inside** — 44 paths: `git diff --name-only 008b24b` (41) plus untracked (3: `check-quick-scope.mjs`, its test,
  `scope-inputs.mjs`). **declared** — the 38 `PLAN.md` `## Files` paths after the GATE 2 amendments
  (`plan-files-core.mjs`'s parser). **escaped: none.** `escape_exempt`: this feature's own stage artifacts, each
  written by its own stage under that stage's scope — `GRILL.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`,
  `regression-report.json`, `verify-report.json`.
- **outside gates** — `tests` (the 109 tracked test files not inside, of 116 — among them `stage-regress.test.mjs`,
  `check-regress.test.mjs` and `cli-stdout-flush.test.mjs`, unchanged, which exercise the refactored
  `stage-regress.mjs` and `check-regress.mjs` at head), `validate`, and one `structural:` eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before running).
- **style gates skipped** — `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`, so no style result over the outside files can flip; absent from both maps.

## Gates, base → head (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (one `node --test` over the outside list; 3,372 tests each side)                   | 0    | 0    |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions: []` · `pre_existing: []`. The base side ran in a detached worktree at the base SHA (created under
`.pharn/pharn-dev-regress/`, removed after capture); its three skipped tests are the ones that need `node_modules`,
which the stdlib-only core gates do not install — skipped, not failed, so the `tests` exit is 0 on both sides.

**Harness note (stated, not hidden):** the command's pinned shell forms (`$(git ls-files … | paste)`,
`cat … | xargs node --test; T=$?`, `mktemp -d`) are refused in this isolated worktree, so a scratch Node runner under
`.pharn/pharn-dev-regress/` ran the same steps with argv arrays — one `node --test` invocation over the whole outside
list (xargs' semantics without its splitting), each gate's exit code recorded and never its output, the base worktree
under `.pharn/` rather than a temp root — the fallback the orchestrator's brief names for exactly this case.

## Verdict (`check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies the comparison and nothing more: `/pharn-dev-regress` catches exactly what its suite catches. A
regression no deterministic check covers is invisible here, and a build that rewrote its own `## Files` would not be
caught by the partition — here the `PLAN.md` diff includes the GATE 2 amendments, which add six paths to `## Files`,
each named and justified in that section (read it).
