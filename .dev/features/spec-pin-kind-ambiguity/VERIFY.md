# VERIFY — spec-pin-kind-ambiguity

## FLOOR layer (owns the verdict)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, the whole hermetic suite)                                              | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**VERIFIED: floor gates PASS.** This is `check-verify.mjs` exit 0 (`verify-report.json`), with `failing_gates: []`.

**Verify ran three times, and the table above is the LAST run**, on the final tree rebased onto `8eec2d7` (#269).
All three runs were PASS with every gate at exit 0. What `reconcile` covered differs between them, and that difference
matters:

1. **Base `7bcd7a8`, right after the build:** `CLEAN`. It reconciled 9 changed paths, with 0 escapes and 3 exempted
   pipeline artifacts.
2. **Base `7bcd7a8`, after the two REVIEW fixes were applied:** `CLEAN`. It reconciled 11 changed paths, with 0
   escapes. The review fixes were Bash writes (exact-phrase replacements) to declared `## Files` paths.
3. **Base `8eec2d7`, the final run:** `CLEAN` over **0** reconciled paths, 0 escapes and 1 exempted artifact.

The third run's CLEAN says **nothing** about this build's writes. The branch was rebased twice mid-run at the
orchestrator's instruction: onto `7bcd7a8` (#268), then onto `8eec2d7` (#269). Each time, build Step 0 (setter, then
anchor) was re-run on the new base, because otherwise the merged PRs' own files would have read as changes since the
anchor. By the last anchor, every build write, including the 6.20.7 renumbering, was already in the anchored tree. The
build's writes are therefore accounted for by runs 1 and 2. The 6.20.6 → 6.20.7 renumber happened between run 2 and
the last anchor, and no reconcile window covers it: those writes were exact-phrase replacements to declared `## Files`
paths, readable in the diff. This is the "the window is anchor → reconcile" bound of
`pharn/pharn-contracts/reconciliation-record.md`. No baseline was edited by hand; each anchor was a fresh
`reconcile-baseline.mjs --anchor`.

## ADVISORY layer (annotates, never gates)

`count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`. No verifiers are registered, so this is floor gates only.

## Orchestration deviation (advisory)

The pinned `cmd; t=$?` / `printf` capture is refused in this worktree-isolated session. So
`.pharn/pharn-dev-verify/run-verify.cjs` ran the same seven gate commands with `spawnSync` argv arrays, recorded only
exit codes into `.pharn/pharn-dev-verify/results.json`, and handed that map to `check-verify.mjs`. The eval-pair paths
were confirmed readable before any exit code was recorded. `verify-report.json` is the helper's stdout with the
`verifiers` block merged in, written by `node`, not by the Write tool. It is a pipeline artifact that reconcile
exempts.

_Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check. Verifier
concerns are advisory help, not assurance._
