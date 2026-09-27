# VERIFY — shell-sink-validation

- stage: `/pharn-dev-verify`, over the uncommitted working tree, after the re-run `/pharn-dev-regress` read
  `no-regressions`.
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- load at start: 11.42 (1-minute), 26.46 when the verdict was written.
- machine report: `verify-report.json` (`check-verify.mjs` stdout verbatim + the advisory `verifiers` block).

## Per-gate exit codes (Step 1)

| Gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 4,122 tests, 4,122 passing, 0 skipped)                                 | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`, run last)             | 0    |

`reconcile` read `CLEAN` against the epoch `/pharn-dev-build` anchored (18 paths reconciled, no escapes; the exempted
paths are this feature's own `BUILD.md`, `REGRESSION.md`, `SHIP.md` and `regression-report.json`).

The gates ran from one runner under `.pharn/pharn-dev-verify/` that captures each exit code from an argv-array spawn —
the isolated worktree refuses the pinned `t=$?` / `printf` capture form. Same gate set, same order, `reconcile` last.

## Verdict (Step 3)

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0, `failing_gates: []`).

## Verifiers (Step 2)

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
