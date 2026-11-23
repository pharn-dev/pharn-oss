# SHIP — core-313-p4-rescore

`/pharn-dev-ship core-313-p4-rescore` for Linear CORE-313 (epic CORE-293): correct the CORE-112 record's grill-effort
verdict after a hand re-score of `grill-medium` p4/r2, keep the scorer unchanged, and add a hand-check rule to the probe
set's README. This is build apparatus only: `SKILLS_VERSION` stays 7.23.0, nothing under `pharn/` or `.claude/`
changed, and no shipped default changed.

## Stages and gates

1. `/pharn-dev-plan` wrote `PLAN.md`: `check-plan-lessons` GREEN (L64, L75, L78), `set-writes-scope --check` 3 paths.
   **GATE 1** was not a human approval. The orchestrator decided it as a model decision under the maintainer's
   delegation ("You make all decisions"): plan accepted as written. The scorer stays unchanged, the README gains the
   hand-check rule, the record shows both readings with the hand one labelled advisory, the CHANGELOG gets an
   `[Unreleased]` Fixed entry, and the follow-up Linear task is opened at build time and says the default is the
   maintainer's decision.
2. `/pharn-dev-grill` wrote `GRILL.md`, lessons declaration GREEN. It raised 3 advisory concerns (1 important), all
   folded in at build: the README rule states its three-part test; the record derives the corrected reading through all
   six rules; and it says why only lost pairs are hand-checked.
3. `/pharn-dev-build`: Linear CORE-342 ("Decide the shipped grill effort default (high → medium) with E1 loop pairs")
   was opened under CORE-293 before the record was edited. The floor is GREEN. `origin/main` moved twice during the run
   (ead56ead, CORE-312; 2ec930d7, CORE-311). Each was merged (merge, not rebase; the CHANGELOG entries were kept), and
   the epoch was re-anchored and the floor re-run after each merge, GREEN both times.
4. `/pharn-dev-regress`: run 1 STOPPED with `regressions` (one load-timing test, `stage-direct.test.mjs` C4(a), red at
   head under load spikes above 60; it passed alone). The stage was re-run in full at base 2ec930d7 once the load was
   below 20, and run 2 gave `no-regressions`. Both runs are recorded in `REGRESSION.md`.
5. `/pharn-dev-verify` gave `PASS` (`VERIFY.md`), with `reconcile` clean, after `npm ci` in this worktree.
6. `/pharn-dev-review`: GREEN, with 0 floor-gate findings and 3 minor advisory ones (`REVIEW.md`).

**GATE 2** was not a human approval. It was this agent's model decision under the orchestrator's delegation, under the
rule verify PASS ∧ regress clean ∧ zero floor-gate review findings. All three hold, so the next step is a pull request.
The PR is not merged.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one failure (a correct catch cited off a pre-registered anchor) has occurred once, and its remedy is
a documented hand check; L20's bar for a floor check is a second occurrence, so no candidate was taken to promotion.

deferred: none

Pointers: `REVIEW.md` (advisory findings), `GRILL.md` (advisory), `REGRESSION.md`, `VERIFY.md`.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
