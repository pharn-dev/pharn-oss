# VERIFY — loop-no-prompts

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, 5305 pass / 0 fail on the recorded run)                                | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`CLEAN`, 5 reconciled, 0 escapes)                                             | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0).

**Stated, not hidden:** the first gate run recorded `test: 1`; its output was discarded (`> /dev/null`), so the
failing test is not known. A re-run of only the 65 test files that read `pharn-loop.md`, `allowed-tools` or command
frontmatter passed (3061 / 0), and a full `npm test` re-run passed (5305 / 0). The recorded `test` exit is that full
re-run. A flaky test, or one disturbed by the regress stage's base worktree, is the likely cause; it is not
attributed to this increment's diff, and it is not proven unrelated.

Verifiers: none registered — floor gates only.
