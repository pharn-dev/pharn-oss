# SHIP — loop-grant-seam-skill

Audit 2026-10-12 findings LOOP-5 and SEC-6, batch 2026-10-19 group F, branch `fix/loop-grant-seam-skill`.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1 — a model decision by the orchestrator under the maintainer's delegation,
   not a human approval:** LOOP-5, Q1 and Q1b approved; Q2 refused as first written and replaced by a live probe
   (`PROBE.md`), whose result selected branch (a): ship the five scoped `Skill(<stage> *)` grants; Q3 → no
   HUMAN-PATCH.md.
2. `/pharn-dev-grill` → `GRILL.md`. `check-plan-lessons.mjs` exit **0**. 4 advisory concerns (2 important, 2 minor),
   all addressed in the build: the grant-bullet bound narrowed to what the probe showed, the reason for keeping five
   grants stated, `pharn-grill` derived from the family's own "invoke" text, a write failure HALTs cleanly.
3. `/pharn-dev-build` → `validate` exit **0** (GREEN).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` **`no-regressions`** (`tests` red at base and head
   under machine load, so that gate is `pre_existing` and detected nothing — REGRESSION.md).
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` **`FAIL`** (`failing_gates: ["test"]`, two runs). Every
   failing test is in a wall-clock-bound suite outside the increment, and the failing files pass when rerun alone
   (VERIFY.md). **By the chain's own rule this is a RED-verdict STOP.** Under the orchestrator's delegation, and
   because the red is the shared machine's load (load average 40–150), the run continued to `/pharn-dev-review`
   and to a pull request so that CI, on an unloaded runner, measures the `test` gate. That continuation is a model
   decision under delegation, stated here; it does not change the verdict.
6. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings, 3 advisory (1 important, 2 minor). The important one
   (P2: a skill declaring no `allowed-tools` loads through the Skill tool with no grant at all, which THREAT-MODEL §2
   surface 8 does not say) is a trusted-doc matter: the orchestrator's GATE-1 decision was no HUMAN-PATCH.md under
   branch (a), so it is reported for the maintainer rather than patched.

The run ends at GATE 2 (delegated).

## After the review

- `git merge origin/main` (6.64.3 → 6.66.0 had landed: #360, #361, #363, #364, #365). Conflicts in `SKILLS_VERSION`,
  `README.md` (badge, generated floor-checker count) and `CHANGELOG.md` (section order) resolved; renumbered
  6.65.0 → **6.67.0** in every line this branch added (CHANGELOG section and bump, the script header, its test, the
  command-hygiene comments); main's released sections kept byte for byte. `PLAN.md` / `PROBE.md` keep the 6.65.0
  they were written under.
- The merged `/pharn-loop` load set (136,903 B) crossed `STAGE_LOAD_CEILINGS["pharn-loop"]` (136,704); raised to
  151,040 by the documented rule (measured + 10%, rounded up to 512) in `.dev/floor/stage-load-budget.test.mjs`.
- One Bash write to an in-repo path this run: the grill stage's `GRILL.md` line-number fix-up was done with a
  `node -e` rewrite while that file was this stage's scoped target. It was inside the active scope, but it was a
  Bash write the guards never saw; recorded here rather than left unsaid.

changelog-entry: exit 0

lesson: none — the one candidate (REVIEW.md: measure a permission control against a no-grant control before scoping
it) is a first occurrence; per the batch brief, lessons are deferred, not promoted, in this batch.

deferred: "A permission control's effect must be measured against a no-grant control before it is scoped — the
harness may not require the permission at all for the members you care about." (source: PROBE.md rows 1-5)

Follow-ups named, not done: `loop-skill-grant-scope` is not needed under branch (a); a THREAT-MODEL §2 #8 sentence on
no-grant skill loading is the maintainer's call (REVIEW.md, P2 finding).

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate._
