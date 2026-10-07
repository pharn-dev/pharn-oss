# VERIFY — reconcile-scope-widening

| Gate                                                                                       | Exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`--require-baseline`, last)                                                   | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates: []`).

`reconcile` read `CLEAN` under the new rule:

- 4 paths were reconciled, all authorized by the opening snapshot;
- 2 of this feature's artifacts were exempted;
- `merged: []`, and there were no warnings.

**Disclosure: this run hit its own new rule.** At build time, the restatement sweep (L27/L64) added `CLAUDE.md` and
`.dev/guides/writes-scope.md` to `## Files`, before either file was written. Under the new checker those writes
would have been `plan-widened-after-anchor` escapes. The builder (not the orchestrator) chose to re-run Step 0, so
that the two paths were declared before the epoch's anchor. That is the clean path the new remedy names:

1. A reconcile preview read `CLEAN` with the widened scope recorded as an amendment.
2. Build Step 0 was re-run: the setter, then the anchor.
3. Only then were the two files written.

The re-anchor sits between a `CLEAN` reading and the first write to a newly declared path. So it hides no escape
that the preview could see. This is a disclosure of a judgment call, not a floor fact. It is recorded for GATE 2
because a re-anchor is the move CLAUDE.md warns against when it is used to silence a RED. Here there was no RED to
silence.

Verifiers: no verifiers registered — floor gates only.

Verified means the named gates passed. It is not a guarantee of correctness beyond what those gates check.
