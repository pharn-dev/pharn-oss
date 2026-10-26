# VERIFY — floor-test-glob-names

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates: []`). Reconcile: `CLEAN`, 43 paths
reconciled against the epoch `/pharn-dev-build` anchored, no escapes. That is the floor check (content-hash,
detection, non-adversarial) behind "the build wrote only `## Files`": the build's writes went through a script that
called the hooks itself, which is discipline.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

Two runs: the first PASS was on the build's bytes; after `/pharn-dev-review`'s wording fixes (CHANGELOG, three header
lines, two comment wraps, all inside `## Files`) the gates were re-run, and this report is that second run, PASS. The
other five `npm run check` gates (`docs:check`, `check:markers`, `check:badge`, `check:changelog`,
`check:contributing`) were run on the same bytes: all exit 0.

Orchestration notes (advisory): the pinned Step 1 lines ran from one scratchpad shell script; `npm test` took about
15 minutes under load from other sessions.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
