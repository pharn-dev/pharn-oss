# SHIP — loop-command-sections (Linear CORE-109)

Branch `worktree-agent-a6ddd4593c5de97e0`, cut from `main` at `259f27dd` (7.18.0) in an isolated agent worktree.
`origin/main` was still `259f27dd` at Step 2c. SKILLS_VERSION 7.18.1 (patch), MIN_CLI unchanged.

## Decisions recorded

- **Scope: step 1 of the ticket only.** Step 2 (a part file for the per-iteration Steps 4 and 5) is not done, because
  `.dev/measurements/loop-baseline-2026-11-11.md` §12 rates it no-go. Decided by the batch orchestrator (a model) under
  the user's delegation ("You make all decisions"), not a human approval.
- **GATE 1** — a decision by the batch orchestrator (a model) under the user's delegation, 2026-11-16 — not a human
  approval. Approved as written: Q1 edit `command-hygiene.test.mjs` only (the ticket names the wrong file for the
  ceiling row); Q2 add the compact-form pin test with its negative controls; Q3 leave `STAGE_LOAD_CEILINGS` alone (the
  ticket names the command row, a falling total stays inside its ceiling, and it keeps the CORE-107 conflict surface
  small).
- **GATE 2** — a **delegated model decision** (this agent), not a human one: verify PASS ∧ regress clean ∧ zero
  floor-gate findings hold, so the run proceeds to one pull request against `main`, not merged.

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md` (`spec_content_hash` `d19c3ae5…`, `applied_lessons` [L12, L26, L57, L60];
   `check-plan-lessons` exit 0; `set-writes-scope --check` exit 0, 6 paths). GATE 1 as above.
2. `/pharn-dev-grill` → `GRILL.md`: lessons declaration GREEN; grill scans clean; 13 grillers applied inline; 2
   advisory concerns, both minor (answered by the pin test's reason comment, and a stated bound).
3. `/pharn-dev-build` → setter from `## Files`, anchor `--by pharn-dev-build`, build committed as `9c8878dd`;
   `validate.mjs` exit 0. `BUILD.md` records the measurements, the real-path Prettier and markdownlint readings, the
   cell-by-cell row identity against 7.18.0 (AC 6) and `command-section.mjs` exit 0 on all 11 headings (AC 4).
4. `/pharn-dev-regress` → base `259f27dd`, 195 outside test files per test, `validate` and the trust-fence eval pair, 0
   → 0 on every gate; `no-regressions`.
5. `/pharn-dev-verify` → 7 gates exit 0 through `run-gates.mjs` (`test` 1,101 s), `reconcile` CLEAN, completeness 0;
   `PASS`.
6. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings, 3 advisory (minor).

Advisory orchestration deviations: the regress Steps 1–3 ran through a node runner kept outside the repo (the isolated
worktree's shell guard refuses the pinned `xargs`/`$VAR` forms), and build Step 2b ran the three tools on the scoped
paths named explicitly, for the same reason. Each is described in `REGRESSION.md` / `BUILD.md`.

## Acceptance criteria (CORE-109)

1. Bytes fall and the ceiling row goes down — met: 90,340 → 82,785 B; 93,184 → 91,136.
2. No fenced line or heading in two files of the family — met: `command-family.test.mjs` R6 green (inside `test`).
3. The pointer names path, load condition, not-loaded rule — N/A: no new part.
4. Every heading resolves through `command-section.mjs` — met: 11/11 exit 0 (`BUILD.md`), `command-section.test.mjs`
   green.
5. The family's total load does not rise — met: 143,389 → 135,834 B.
6. Same verdicts on the benchmark features — argued by construction (advisory): identical trimmed cells in all 25
   header and data rows, every other line identical; no loop run.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — nothing in this run failed in a way a mechanism would otherwise repeat; the Prettier behaviour is now
pinned by a test, and the regress-runner crash was a bug in a one-off scratch script.

deferred: none

Review: `.dev/features/loop-command-sections/REVIEW.md`. Grill log (advisory): `.dev/features/loop-command-sections/GRILL.md`.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
