# VERIFY — pipeline-performance-audit

This is the second run, after the GATE-2 fix build (the maintainer chose "Fix, then PR"). The first run was also
`PASS`. The gates ran at HEAD, on the working tree with the fixed increment present.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`)                                                                        |    0 |
| `validate` (`pharn/floor/validate.mjs .`)                                                  |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                |    0 |

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0, `failing_gates: []`).

- **`reconcile`:** `CLEAN`. The epoch was re-anchored by the fix build (`pharn-dev-build`) at 2026-09-29T07:37:23Z.
  It reconciled 3 paths and found no escapes.
- **`lint:md`, a local note.** Before the first run, a git-ignored `.pharn/pr-body.md` sat in the checkout. It was left
  by an earlier session and held the body of already-merged PR #298, and it would have turned the whole-repo `lint:md`
  red. It is not this increment's file and CI never sees it (L61). Following L61's precedent, it was moved aside in
  place, to `.pharn/pr-body.md.bak`, and not deleted.
- **Verifiers:** none registered (`count-verifiers.mjs` → `{"registered":0}`), so these are the floor gates only.

"Verified" means the named gates passed. It is not a guarantee of correctness beyond what those gates check. In
particular, no gate checks this increment's report for accuracy: its figures are advisory, and `/pharn-dev-review`
is the stage that reads them.
