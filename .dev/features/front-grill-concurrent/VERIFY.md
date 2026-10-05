# VERIFY — front-grill-concurrent

This is the latest run, at `aa7438c`: the review-fix commit, on top of `origin/main` 7696477 (6.40.0). The first
run, at `093413b` before any merge, was also PASS (4,653 tests, reconcile CLEAN over 15 paths).

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, 4,734 tests, 0 failing)                                                | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md` (re-run, see below)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`CLEAN`: 13 paths reconciled, 0 escapes; re-anchored after the merge)         | 0    |

**`lint:md` was re-run.** In this run it first exited 1. The cause was a gitignored scratch fixture of the builder's,
`.pharn/gs/PLAN.md`, which held a bare e-mail literal. No tracked file was involved. The fixture was removed and
`lint:md` was re-run alone: exit 0, "0 issues". The verdict was recomputed from that map.

**VERIFIED: floor gates PASS** (`pharn/floor/check-verify.mjs`, exit 0).

**Verifiers:** none registered, so the floor gates are the only check.

"Verified" means the named gates passed. It is not a guarantee of correctness beyond what those gates check;
verifier concerns would be advisory help, not assurance.
