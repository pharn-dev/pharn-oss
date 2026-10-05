# VERIFY — loop-entry-preflight

- head: `17930a9`, the build plus a merge of `origin/main` at `d8fd005` (6.38.1). That `main` carries the squashed
  #308 snapshot that this branch had first merged pre-squash, plus #311 and #310.
- driver: `.pharn/pharn-dev-verify/run.mjs`. It runs each gate once and records only exit codes.
  `pharn/floor/check-verify.mjs` decides the verdict.

## Floor gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, the whole suite, the feature's 4 test files included)                  | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile`                                                                                | 0    |

**VERDICT: PASS.** `check-verify.mjs` exited 0, and `failing_gates` is empty.

## The reconcile epoch, stated

- **First epoch.** The build anchored at `/pharn-dev-build` Step 0. Over that epoch `check:reconcile` was green: the
  pre-merge `npm run check` exited 0.
- **Why it was re-anchored.** Merging `origin/main` brought in other increments' files, which the build's scope never
  named, so the reconciler read that merge as escapes. A merge is a git operation, not a build write.
- **Second epoch.** After the merge commit the baseline was re-anchored under the same plan scope
  (`--by pharn-dev-build-after-main-merge`). The `reconcile` 0 above covers that second epoch only.

## Advisory layer

No verifiers are registered (`count-verifiers.mjs`: 0). Only the floor gates ran.

_The verdict is exactly as good as the deterministic suite. It does not claim the feature is correct beyond what
those gates check._
