# SHIP — entry-cache-per-worktree (Linear CORE-358)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress`
(run 1 STOP, re-plan + re-build, run 2) → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

- **GATE 1** — model decision under delegation (orchestrator), not a human approval: approved the per-worktree move
  (giving up the unmeasured cross-worktree hits), ignore-by-schema (`/2`) with no migration code, and patch 7.25.1;
  fold in both grill concerns; state that clearing `pharn/.run/` alone does not reset the record, and why.
- **GATE 2** — model decision under delegation (orchestrator), not a human approval: no floor finding; the one minor
  advisory wording finding (`REVIEW.md`, the `entry-gate-cache-core.mjs:53` parenthetical) is left as is — the claim
  is true and advisory-labelled, and editing product bytes after verify would need a re-verify for no behaviour change.
  Proceed to the PR; no merge.

## Plan corrections during the build (recorded, not hidden)

1. **README badge.** `check:badge` binds `README.md`'s badge to `SKILLS_VERSION`, and the plan had not declared
   `README.md`. Before any gate ran: the edits were saved as a patch, the tree reverted to clean, `README.md` added to
   `## Files`, the build's Step 0 re-run (setter, then `--anchor`), and the patch re-applied.
2. **Install manifest.** Regress run 1 went red (`regressions`: two `pharn-install.json` drift tests, real, not load).
   The plan had not declared the generated `pharn-install.json`. Remedy: the same revert → declare → re-run build Step 0
   → re-apply → `node .dev/floor/gen-install-manifest.mjs .` → `validate` GREEN, then regress re-run (green). Run 1's
   verdict is kept verbatim in `REGRESSION.md`.

Each re-anchor was taken on a clean tracked tree, so the reconciled window covers every build edit; verify's
`reconcile` read CLEAN over 11 paths.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- `/pharn-dev-review`: `REVIEW.md` — GREEN, 0 floor findings, 1 minor advisory. Grill: `GRILL.md` (advisory, 2 minor,
  both folded into the build).

changelog-entry: exit 0

lesson: none — the miss (an undeclared generated manifest) was caught where designed (`docs:check` inside `npm test`,
at regress), and the remedy already exists as a mechanism, not a "remember next time".

deferred: none

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
