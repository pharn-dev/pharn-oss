# VERIFY — frontmatter-parser-parity

- machine report: `verify-report.json` (the `check-verify.mjs` verdict, verbatim, plus the advisory `verifiers` block)
- orchestration: the gates ran from one node runner (`.pharn/pharn-dev-verify/capture.mjs`), with every subprocess
  spawned from an argv array. The pinned `$?` capture form is refused in this isolated worktree. This is advisory
  orchestration; the verdict is the checker's.

## Run 4 (the one `verify-report.json` records) — the final tree, after the GATE 2 fix round and the merge of `origin/main`

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5572 tests, 5564 pass, 7 fail)                                         | 1    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`--require-baseline`: `CLEAN`, 46 reconciled, 0 escapes; 12 paths `merged`)   | 0    |

**VERIFY FAILS: gate(s) `test` red — stage FAILS.**

That is the checker's verdict, and it stands. Here is what the 7 failures are, read from `.pharn/pharn-dev-verify/test.log`
(this reading is not an input to the verdict):

- Each is a slow integration test, taking 31–103 s, in one of `pharn/floor/entry-base-evidence.test.mjs`,
  `entry-gates.test.mjs`, `stage-verify.test.mjs` or `stage-regress.test.mjs`.
- This increment changes none of those four files, and none of the code they time.
- The machine's load average was 48–272 during the run, with several other sessions running suites.
- Some of the same tests failed at the untouched base in regress runs 1–3, and subsets run alone passed (runs 3 and 1
  below).

Run 3 ran the same final tree an hour earlier. It failed the same way, on 2 of these tests (`budget clock …` and
`never recorded — a timed-out base gate …`), and those two passed 4/4 when run alone. The next measurement of this gate
is a clean CI runner. This report does not claim it will pass.

## Run 2 (superseded — the pre-merge tree before the GATE 2 fix round)

| gate                                                                                              | exit |
| ------------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test`: 5570 tests, 5569 pass, 0 fail; the captured log kept only those three counts) | 0    |
| `validate`                                                                                        | 0    |
| `lint`                                                                                            | 0    |
| `format:check`                                                                                    | 0    |
| `lint:md`                                                                                         | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`        | 0    |
| `reconcile` (`--require-baseline`: `CLEAN`, 32 reconciled, 0 escapes)                             | 0    |

The two exemptions `reconcile` lists are this feature's `REGRESSION.md` and `regression-report.json`. The epoch is the
fix round's anchor (`2026-10-19T12:25:39Z`). The first build window was reconciled separately before the fix round,
also `CLEAN` (33 reconciled, 0 escapes); see PLAN `## Amendment 1`.

Run 2's verdict was **PASS** (every gate 0) on the tree before the GATE 2 fix round and the merge.

## Run 1 (superseded)

Run 1 returned `FAIL` on `test` alone: 4 of 5570 tests failed, every other gate was 0, and `reconcile` was `CLEAN`. All
four failures are slow integration tests that ran 34–80 s each. Several sessions were running suites on this machine at
once; its load average was measured at 18–33 after run 1, and at 90–175 during run 2.

- `★ equivalent environment — fresh BASE …`
- `explicit --install / --no-install MISS …`
- `precedence — a published 6.33.0 retained record …`
- `★ WIRING (reuse, L45) — the COMMITTED pharn-regress.md and pharn-verify.md lines …`

They live in `pharn/floor/entry-base-evidence.test.mjs`, `stage-verify.test.mjs` and `stage-regress.test.mjs`. Run alone,
those three files pass 167/167. `precedence …` also failed at the untouched base in regress run 2. Nothing
was changed between run 1 and run 2; run 2 is a re-run of the same tree. A re-run that passes after a fail is evidence
that the failure was environmental. It is not proof, and the report says so.

## Verifiers (advisory)

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
