# VERIFY — regress-base-reuse

- tree: the working tree of branch `regress-base-reuse` (uncommitted), based on `a2b5f6b` (6.32.1), including the
  GATE-2 review fixes.
- iterations:
  1. **FAIL `[lint]`**: an unused `lstatSync` import in `stage-regress.test.mjs`. It was removed under the plan's
     scope. Every other gate was 0 (4392 / 4392 tests).
  2. Stopped before its verdict, because the review fixes changed the tree.
  3. **PASS**, recorded below.
- stage model: opus, inline. The gates ran through one Bash script, `.pharn/pharn-dev-verify/iter3.sh`, which captures
  each exit with `$?`. The eval pair's two paths were confirmed readable before its exit was recorded.

## Floor gates (own the verdict)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

- `npm test`: **4394 tests, 4394 pass, 0 fail**. That is iteration 1's 4392 plus the review fixes' A2 end-to-end
  control and the glosses closure test. The A2 unit case extends an existing test.
- `reconcile` read **CLEAN** against the epoch the build anchored (`--by pharn-dev-build`): 23 paths reconciled, no
  escapes. Exempted: this feature's `REGRESSION.md`, `REVIEW.md` and `regression-report.json`. The review fixes'
  Bash edits (to `CLAUDE.md`, `CHANGELOG.md`, the contract, the command, the floor modules and their tests) all landed
  on paths in PLAN.md `## Files`, so none is an escape.

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0; `failing_gates: []`).

## Verifiers (advisory)

No verifiers registered (`count-verifiers.mjs` → `registered: 0`), so only the floor gates ran.

Verified means the named gates passed. It is not a guarantee of correctness beyond what those gates check. In
particular, "a reused BASE result equals a fresh one" is advisory: the gates check the reuse decision and its
controls, never that a real project's suite is deterministic.
