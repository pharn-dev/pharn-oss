# VERIFY — review-fanout

**VERIFIED: floor gates PASS.** `check-verify.mjs` returned exit 0, verdict `PASS`, `failing_gates: []`. It ran over
HEAD `c21652c` with the working-tree changes, after `origin/main` (6.59.0) was merged in.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5,403 tests, 5,402 pass, 0 fail, 656 s)                                | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0    |

## Reconcile, both windows

The build anchored twice. The second anchor came after the plan gained `pharn/floor/stage-runtime.test.mjs` (PLAN.md,
"Re-plan after the first build pass"), and an anchor resets the baseline, so each window has its own result.

- **First window** (anchor 00:29 UTC to the re-plan): `CLEAN`, 30 paths reconciled, no escape. It was checked before
  the re-anchor; the output was kept in the scratchpad as `reconcile-window1.json`.
- **Second window** (anchor 09:35 UTC to this verify): `CLEAN`, 40 paths reconciled, no escape.
  - Three paths were exempted as this feature's pipeline artifacts.
  - The 33 paths `origin/main` brought in that this feature does not also change were classified `merged`: their
    bytes are exactly the upstream bytes HEAD merged in during the window. The three it does change (`CHANGELOG.md`,
    `README.md`, `SKILLS_VERSION`) are in the plan's scope.

## Verifiers

No verifiers are registered (`count-verifiers.mjs`: 0), so this verdict rests on the floor gates only.

## How the gates were run

A node runner under `.pharn/pharn-dev-verify/` ran each gate, because the isolated worktree refuses the command's pinned
`$?` captures. The gate set is exactly the command's. The verdict is the helper's, over that map.

---

_Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check. A verifier
concern would be advisory help, not assurance._
