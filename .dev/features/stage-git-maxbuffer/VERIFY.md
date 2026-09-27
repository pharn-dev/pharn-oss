# VERIFY — stage-git-maxbuffer

- stage: `/pharn-dev-verify`, run on the final working tree (after `/pharn-dev-regress` and the three post-regress
  wording edits `BUILD.md` records).
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- machine report: `verify-report.json` — `check-verify.mjs`'s verdict JSON verbatim (its fields compared equal to the
  helper's stdout) with the advisory `verifiers` block merged in.

## FLOOR layer — the gates

| Gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

- `npm test`: 4,072 tests, 4,072 passing, 0 skipped (`duration_ms` 244,940).
- `reconcile`: **CLEAN** against the epoch `/pharn-dev-build` anchored (`2026-09-27T15:42:57Z`, `--by pharn-dev-build`):
  14 paths reconciled, no escape; three pipeline artifacts exempted by name (`BUILD.md`, `REGRESSION.md`,
  `regression-report.json`). CLEAN means no escape was detected, never that none occurred
  (`pharn/pharn-contracts/reconciliation-record.md`).
- The eval pair's two paths were confirmed readable before its exit was recorded.
- The gates ran from one node runner under `.pharn/pharn-dev-verify/` with argv arrays — the isolated worktree refuses
  the pinned `$?` capture forms; the gate set is the command's seven, unchanged. The runner was the only script left
  under `.pharn/` when `lint` ran (the others were deleted first), and it is lint-clean.

## Verdict

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0, `failing_gates: []`).

## ADVISORY layer — verifiers

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
