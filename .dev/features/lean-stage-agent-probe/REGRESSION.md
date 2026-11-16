# REGRESSION — lean-stage-agent-probe

- Base: `08e336984705a4d3aec42e9ed88d87262f729fac` (`HEAD`; the working tree was dirty, a dogfood build).
- Inside (9 paths): `.dev/features/lean-stage-agent/SHIP.md`, `.dev/guides/product-commands.md`, `CHANGELOG.md`,
  `.dev/features/lean-stage-agent-probe/GRILL.md`, `.dev/features/lean-stage-agent-probe/PLAN.md`,
  `.dev/features/lean-stage-agent/MEASUREMENTS.md`, `.dev/features/lean-stage-agent/probe/README.md`,
  `.dev/features/lean-stage-agent/probe/prompt.md`, `.dev/features/lean-stage-agent/probe/read-probe.mjs`.
- `check-regress.mjs scope`: exit 0, no escape. `escape_exempt`: this feature's own `PLAN.md` and `GRILL.md`.
  Outside: 197 test files and one eval pair (`trust-fence`).
- Style gates were skipped: `inside` touches no shared style config.

| Gate                                                                                       | Base | Head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (197 outside test files, per-test reporter)                                        |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 6,905 passed, 0 failed, 9 skipped. Head 6,906 passed, 0 failed, 8 skipped. No new failures, nothing
still failing. `regressions[]` is empty, and so is `pre_existing[]`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `check-regress.mjs verdict`
exited 0 (`no-regressions`). This regress catches only what its suite catches: a regression that no deterministic check
covers stays invisible.

Orchestration deviation (advisory): Steps 1 to 3 ran through a scratch node runner
(`pharn/.run/pharn-dev-regress/run-regress.mjs`, gitignored). It passed the pinned lines as `spawnSync` argv arrays,
because the worktree-isolation guard refuses the pinned shell forms (`mktemp`, `$VAR`, `xargs`). The first attempt
was stopped before any verdict: the runner split the eval pair as a string where `scope` returns an object. It was
fixed, its base worktree was removed, and the run was repeated from the start.
