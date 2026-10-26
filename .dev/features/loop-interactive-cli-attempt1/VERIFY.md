# VERIFY — loop-interactive-cli-attempt1

Run at HEAD `e4b17048` with this increment's files in the working tree (2026-10-26).

| gate                                    | exit |
| --------------------------------------- | ---- |
| `test` (`npm test`)                     | 0    |
| `validate`                              | 0    |
| `lint`                                  | 0    |
| `format:check`                          | 0    |
| `lint:md`                               | 0    |
| `structural:expected-injection-comment` | 0    |
| `reconcile`                             | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0). **Reconcile: `CLEAN`** — epoch anchored by
`pharn-dev-build`, 2 paths reconciled, `escapes: []`, the two regress artifacts exempted.

**One path moved aside for this run (the human's decision).** `lint:md` reaches
`.pharn/batch-2026-10-19/followups-discovery.md`, a git-ignored local note this increment never wrote, which carries
ten MD022 / MD032 issues (L61's shape; the prep increment's verify met the same file). Asked before the run, the human
chose "move aside, restore after": the note sat in the session scratchpad during the gates and was put back with the
same sha256 (`58d36077…`). Nothing in the increment changed for this.

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
