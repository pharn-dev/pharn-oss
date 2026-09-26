# REGRESSION — loop-quick-mode

- stage model: regress — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- base: `2e5c2e3183c595c76abadde8878d1fa2e94d115e` — `git merge-base HEAD origin/main`, passed as the explicit base
  (the orchestrator's instruction; 6.25.0, #280). HEAD: the uncommitted build on `007bc87`.
- the machine report: `regression-report.json`, the helper's `verdict` JSON verbatim (`cmp` identical).

## Partition (`check-regress.mjs scope`, exit 0)

- **inside** — 33 paths: `git diff --name-only 2e5c2e3` (25) plus untracked (8). **declared** — the 32 `PLAN.md`
  `## Files` paths (`plan-files-core.mjs`'s parser). **escaped: none.** `escape_exempt`:
  `.dev/features/loop-quick-mode/GRILL.md` (written by `/pharn-dev-grill` under its own scope).
- **outside gates** — `tests` (the 106 tracked test files not inside, of 111), `validate`, and one
  `structural:` eval pair (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before running).
- **style gates skipped** — `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`, so no style result over the outside files can flip; absent from both maps.

## Gates, base → head (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (one `node --test` over the outside list; 3,299 tests each side)                   | 0    | 0    |
| `validate` (`node pharn/floor/validate.mjs .`, whole-repo)                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions: []` · `pre_existing: []`. The base side ran in a detached worktree at the base SHA (created under
`.pharn/pharn-dev-regress/`, removed after capture); its two skipped tests are the ones that need `node_modules`, which
the stdlib-only core gates do not install — skipped, not failed, so the `tests` exit is 0 on both sides.

**Harness note (stated, not hidden):** the command's pinned shell forms (`$(git ls-files … | paste)`,
`cat … | xargs node --test; T=$?`, `mktemp -d`) are refused in this isolated worktree, so a scratch Node runner under
`.pharn/pharn-dev-regress/` ran the same steps with argv arrays — one `node --test` invocation over the whole outside
list (xargs' semantics without its splitting), each gate's exit code recorded and never its output, the base worktree
under `.pharn/` rather than a temp root — the fallback the orchestrator's brief names for exactly this case.

## Verdict (`check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies the comparison and nothing more: `/pharn-dev-regress` catches exactly what its suite catches. A
regression no deterministic check covers is invisible here, and a build that rewrote its own `## Files` would not be
caught by the partition (the `PLAN.md` diff here is the plan's own GATE-1 and grill amendments, committed before the
build).
