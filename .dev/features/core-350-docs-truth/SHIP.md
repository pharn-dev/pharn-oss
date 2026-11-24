# SHIP — core-350-docs-truth

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

- GATE 1: model decision under delegation (orchestrator), 2026-11-24 — F1, F2, F4–F8 approved; D1 = (b), the docs
  corrected to the live ruleset state. Not a human approval. The `pharn/LIMITS.md` §11 and `.github/workflows/release.yml`
  comment edits were applied by the user from scripts, sha-checked, and committed before the build anchor (L68), as
  `33db1df7`.
- GATE 2: model decision under delegation (orchestrator → this agent): no blocker in `REVIEW.md`; proceed to the PR.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the recurring cause (docs about external GitHub settings drifting with no check) is the stated bound,
and a checker would need a network call the floor does not make; L20's bar is not met.

deferred: none

Pointers: `REVIEW.md` (two minor advisory findings, including F9, a ninth stale claim fixed inside `README.md`),
`GRILL.md` (advisory), `REGRESSION.md`, `VERIFY.md`.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
