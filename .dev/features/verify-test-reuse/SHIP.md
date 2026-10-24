# SHIP — verify-test-reuse (audit LOOP-8)

- Stages run: `/pharn-dev-plan` only, which wrote `PLAN.md` (`check-plan-lessons` exit 0).
- GATE 1: decided by the batch orchestrator (a model), acting under the maintainer's delegation. This was **not** a
  human approval. Decision: close LOOP-8 as won't-fix and correct the rationale (Q1 = a), and add `instruction-growth`
  to the contract's list (Q2 = yes). Version 6.72.2.
- **Skipped stages: `/pharn-dev-grill`, `/pharn-dev-build`, `/pharn-dev-regress`, `/pharn-dev-verify` and
  `/pharn-dev-review` were not run.** After GATE 1 the increment was only prose: one code comment, one contract
  paragraph, one guide line, and the version files. The orchestrator therefore had it finished in LIGHT mode. No
  `GRILL.md`, `REGRESSION.md`, `VERIFY.md` or `REVIEW.md` exists for this increment, and no stage verdict was
  produced.
- Gates run instead: `npm run check`, `node pharn/floor/validate.mjs .`, `npm run check:surface-bump` and
  `npm run check:changelog-entry`. Their exit codes are in the PR body and the final report.
- changelog-entry: see the PR body (run by hand, not by Step 2c).
- lesson: deferred — candidate: "When a rationale comment names one sufficient reason for an exclusion, an audit treats
  that reason as the whole cause and proposes removing it. LOOP-8 proposed copying a results file to satisfy the AC
  gate, while the file sets alone already made the reuse impossible (L25/L40 recurring at audit time)." Not promoted in
  this batch, by direction.
- deferred: none

The chain did not run, and nothing above judges whether the increment is good or wise. That call belongs to the
orchestrator at the PR.
