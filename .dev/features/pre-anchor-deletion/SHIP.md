# SHIP — pre-anchor-deletion (CORE-346)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` (three runs; the third is recorded) → `/pharn-dev-review` → GATE 2.

- **GATE 1** — model decision under delegation (orchestrator), not a human approval. The orchestrator approved the plan
  with three conditions: pin every row of the case table with a test (EACCES rows skip under root); contract §3 states
  the exception and that the clear never applies to a path that exists now; CHANGELOG records that a legacy baseline
  keeps the old fail-closed behaviour until re-anchored. All three are met (the tests in the two test files; contract
  §3; the CHANGELOG `[7.23.1]` entry).
- **GATE 2** — model decision under delegation (this agent, per the orchestrator's brief: fix blockers, otherwise
  proceed). REVIEW.md has no floor-gate finding and two minor advisory findings, carried as follow-ups. Decision:
  proceed to the pull request. Not a merge; nothing is sealed.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one slip (a source-region test that a `--test-name-pattern` run skipped) was caught by verify's whole-suite gate on its first run, so the remedy is not "remember next time".

deferred: none

Pointers: `GRILL.md` (4 minor advisory concerns, all acted on in the build), `REGRESSION.md`, `VERIFY.md`, `REVIEW.md`
(findings not restated here).

## Build notes

- **Build restart.** The first build pass found `docs:check` RED on `pharn-install.json`, which the plan had not
  named. Rather than widen the plan after the anchor (a `plan-widened-after-anchor` escape at verify), the build added
  the path to `## Files`, put the nine edited files' HEAD bytes back, re-ran the setter and `--anchor` over that
  unchanged tree, and then restored the edits. Every build write therefore sits inside one window: reconcile at verify
  read `reconciled: 10`, `CLEAN`.
- **Mutation controls (L60).** Each conjunct of the checker's clear was removed in turn, on a copy restored
  byte-for-byte afterwards, and the CORE-346 tests were run: A (no clear branch) → 4 tests red; B (no `provenAbsent`
  now) → 2 red; C (no `absent_at_anchor` membership) → 2 red; D (no `Array.isArray` guard) → 1 red; E (no
  `entries[rel] === undefined`) → 1 red. D first survived when the malformed row used a string; the row now uses an
  object, and the redundant string filter was dropped from the checker.
- **Verify runs.** Run 1 FAIL: `reconcile-baseline.test.mjs`'s CWE-367 source-region test caught `provenAbsent`
  inside the `hashFile..snapshotScope` region; it was moved. Run 2 FAIL: an `entry-gates.test.mjs` timing test under a
  load average of 70 or more, which passed in isolation. Run 3 PASS. Details in VERIFY.md.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
