# SHIP — s14-gates-exclude-remedy

Stages run, in order: `/pharn-dev-plan` (GATE 1: approved as written) → `/pharn-dev-grill` → `/pharn-dev-build` →
`/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review`. The run ended at GATE 2.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Grill: `GRILL.md` — 3 advisory concerns (0 blocking-severity), gating nothing.
- Regress: `regression-report.json` — outside gates `tests` / `validate` / one eval pair 0 → 0; per test 6425 passed,
  no new failures.
- Verify: `verify-report.json` — all 7 gates exit 0 (`test`, `validate`, `lint`, `format:check`, `lint:md`,
  `instruction-growth`, `reconcile`); no verifiers registered.
- Review: `REVIEW.md` — GREEN, 0 floor-gate findings, 2 minor advisory findings.

## After GATE 2 (human decision: "Fix S14b, then PR")

- Fixed review finding 1: the S14b row and exit-6 step now say "committed before the re-run"; the CHANGELOG entry
  matches. The table re-padding (finding 2) is left as is.
- Verify re-run 2: **FAIL** (`test`: `check-ship-record.test.mjs` P5 read this `SHIP.md`'s required block as
  unexpected; it exempted only `dev-verdict-discipline` by name). A STOP, handed to the human, who chose to widen the
  plan with that test (`PLAN.md`, "Widened at GATE 2"). P5 now accepts a block that parses with no defects. The build
  scope was re-set and the reconcile epoch re-anchored right after run 2's `reconcile` gate came back clean.
- Verify re-run 3: **PASS**, all 7 gates exit 0 — the `verdict-verify` line and `verify-report.json` are this run.
- Regress was not re-run: the post-GATE-2 changes touch only paths inside the plan (`pharn-loop.md`, `CHANGELOG.md`
  and the widened test file), and verify's whole-repo `test` gate covers the suite at the final tree.
- `changelog-entry` above was measured before the post-GATE-2 CHANGELOG edits; re-checked at commit time below.

changelog-entry: exit 0

lesson: none — no recurring mechanism failure surfaced; the review's two findings are one-off wording and formatting
points (L20's bar is not met).

deferred: none

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
