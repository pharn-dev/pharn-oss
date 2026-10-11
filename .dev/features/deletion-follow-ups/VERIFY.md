# VERIFY — deletion-follow-ups

HEAD `abd26d3` (build `41a2c49` + the regress artifacts), SKILLS_VERSION 6.57.0.

| Gate                                                                                       | Exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5300 tests, 5299 pass, 0 fail, 1 skipped)                              | 0    |
| `validate` (`FLOOR: GREEN — 37 capabilities`)                                              | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates: []`).

## Reconcile

`CLEAN` against the epoch `/pharn-dev-build` anchored after its setter (scope: the plan's 13 `## Files` paths).
`reconciled: 12`, `escapes: []`, `merged: []`, `warnings: []`. `exempted`: this feature's `REGRESSION.md` and
`regression-report.json` (pipeline artifacts of the active slug). The human's `LIMITS.md` commit `83c5829` predates the
anchor, so it is in the baseline and is not a candidate (L68). No deletion happened in the window, so the new
deletion branch had nothing to judge here; its behaviour is pinned by the suite.

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs` → `registered: 0`).

## Orchestration notes (advisory)

- The pinned shell block was run through a node runner under `.pharn/pharn-dev-verify/` with argv arrays (the worktree
  isolation guard refuses the pinned forms); it was deleted after the stage.
- Load averages: 7.45 / 38.18 / 52.59 at start, 7.73 / 18.78 / 37.81 after `npm test`, 5.66 / 17.06 / 36.41 at the end.
  No test timed out.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
