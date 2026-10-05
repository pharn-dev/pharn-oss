# VERIFY — regress-head-install-drift

**Run 2: after the independent review's fixes (R1–R5) and the merge of `origin/main` 43c09ba (6.39.0, #309).**
Version 6.40.0.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`: 4723 tests, 4723 pass)                                                 |    0 |
| `validate`                                                                                 |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`--require-baseline`)                                                         |    0 |

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0). `docs:check`, `check-changelog-entry --merge-base
origin/main` and validate were also GREEN.

**The reconcile epochs.** Each epoch below was checked before the next one replaced it.

- **The build epoch** was anchored at `/pharn-dev-build` Step 0 and amended once for the
  `.dev/floor/command-hygiene.test.mjs` build amendment (L48). After the first merge of `origin/main` (d8fd005), it
  read `ESCAPE` on 32 paths. Every one of them is a path `origin/main` changed since `1b737cd`, so none came from this
  build.
- **The second epoch** was re-anchored on that merged tree (`post-merge-reanchor`). Verify run 1 PASSed within it
  (4683/4683).
- **The third epoch.** After the second merge (43c09ba), the second epoch again named only main's paths (from
  `check:reconcile` in `npm run check`). It was re-anchored (`review-fixes-post-merge`) with the plan's scope, which
  now includes `.claude/commands/pharn-loop.md` (review R2), BEFORE the review fixes were written.
- **This run's `reconcile` = 0** therefore covers the review fixes.

**Run 1** was at 6.42.0, provisional, after merging d8fd005. All seven gates were 0, with 4683 of 4683 tests passing.
That merge resolved conflicts by keeping both sides. `pharn-verify.md` grew to 18,519 B with main's changes, which
passed its 18,432 B ceiling, so the ceiling was raised to 20,480 (measured + 10%, next 512).

no verifiers registered — floor gates only.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
