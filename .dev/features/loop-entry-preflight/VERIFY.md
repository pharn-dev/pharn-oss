# VERIFY — loop-entry-preflight

- **Current run (after the independent review):** head `46085a9`. It holds the build, the review fixes R1–R6 and a
  merge of `origin/main` at `ab0b11c` (6.39.0, #309, plus the apparatus #315). All 7 gates below exited 0 again and the
  verdict is **PASS**.
  - The run before it, over the review fixes plus `43c09ba`, read `test` 1. stage-runtime's GIT CEILING enumeration
    flagged a raw `git rev-parse` spawn the R1 fix had added to `entry-gates.mjs`. It now reads `HEAD` through
    `gitSync`, which removes the spawn.
- **First run:** head `17930a9`, the build plus a merge of `origin/main` at `d8fd005` (6.38.1). That `main` carries the
  squashed #308 snapshot this branch had first merged pre-squash, plus #311 and #310. That run also passed.
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
  (`--by pharn-dev-build-after-main-merge`). The `reconcile` 0 recorded in the first run covers that epoch only.
- **Later epochs.** The baseline was re-anchored twice more, each time after a further merge of `main`
  (`…-after-review-and-main-merge`, `…-after-main-merge-2`). The current `reconcile` 0 covers only the last of these.
  The review fixes were made with the Write/Edit tools under the plan's scope, plus scoped `prettier --write` runs on
  the plan's own files. Those runs are Bash writes, so they fall outside fix #7 and are not seen by any reconcile
  window.

## Advisory layer

No verifiers are registered (`count-verifiers.mjs`: 0). Only the floor gates ran.

_The verdict is exactly as good as the deterministic suite. It does not claim the feature is correct beyond what
those gates check._
