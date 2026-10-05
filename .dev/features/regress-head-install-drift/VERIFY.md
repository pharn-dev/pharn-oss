# VERIFY — regress-head-install-drift

Run at HEAD after merging `origin/main` (d8fd005, 6.38.1) into the branch; provisional version 6.42.0.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`: 4683 tests, 4683 pass)                                                 |    0 |
| `validate`                                                                                 |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`--require-baseline`)                                                         |    0 |

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0).

**The reconcile epoch, stated.** The build's epoch (anchored at `/pharn-dev-build` Step 0, amended once for the
`.dev/floor/command-hygiene.test.mjs` build amendment, L48) was checked after the merge of `origin/main`: it read
`ESCAPE` with 32 paths, and **every one of them is a path `origin/main` changed since `1b737cd`** (`git diff
--name-only 1b737cd origin/main`, 41 paths), i.e. the merge commit, none from this build. The epoch was then
re-anchored on the merged tree (`--by post-merge-reanchor`, scope from the plan) and this verify's `reconcile` gate
judges that window. So the `0` above covers anchor→verify after the merge only; the build window's evidence is the
pre-merge comparison just described.

The merge resolved conflicts in `CHANGELOG.md`, `CLAUDE.md`, `README.md`, `SKILLS_VERSION`,
`pharn/floor/stage-regress.mjs`, `pharn/floor/stage-regress.test.mjs` and `regression-report.md` by keeping both
sides; the version moved 6.41.0 → 6.42.0 everywhere; `pharn-verify.md` (18,519 B with main's growth) passed its
18,432 B ceiling, which was raised to 20,480 (measured + 10%, next 512) in `COMMAND_BYTE_CEILINGS`.

no verifiers registered — floor gates only.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
