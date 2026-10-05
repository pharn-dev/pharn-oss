# BUILD — loop-closeout-script

Built from `PLAN.md` (spec hash `d831d30d…` unchanged; no open questions). Landed: `pharn/floor/closeout-core.mjs` (the
shared run-stop, ledger, check and report steps, the child runner with stdin ignored, the DATA echo),
`pharn/floor/loop-closeout.mjs` (the loop's tail after `LOOP.md`, exit classes 0/3/4/5/2, the GRILL G1 still-Approved
rule) and `pharn/floor/ship-closeout.mjs` (Step 3a, no git write), each with tests that pin every step's argv against
the close parts' former lines and run each script end-to-end with its real children; the two close parts re-pointed
(Step 6b's closeout line and exit mapping, Step 6c as prose, Step 6d's owed writes and crash presentation, Step 7, the
Final step, both claims blocks); the pins that read the close parts re-pointed in `command-hygiene.test.mjs`,
`render-run-report`/`render-regression`/`render-verify.test.mjs`, `run-marker.test.mjs`, `check-loop-fresh.test.mjs`,
`stage-runtime.test.mjs` and `frontmatter-core.test.mjs`; CLAUDE.md, CHANGELOG [6.43.0] (provisional), SKILLS_VERSION,
README badge. `node pharn/floor/validate.mjs .` → GREEN (36 capabilities). Decisions: stacking was dropped by the orchestrator;
`origin/main` was merged twice (6.38.1, then 6.39.0 once #309 landed — every build-gate file taken as main's), the
version is the pre-assigned 6.43.0, and the reconcile baseline was re-anchored after each merge (the merges are git
operations, not build writes). A late re-point: `check-test-stage.test.mjs` executed the inline builder, so it now runs
`buildStageList` (added to `## Files`, the scope re-set and `--amend-scope`d). `npm run check` exits 0 (4,739 tests).
One deviation from "verbatim" in the builder is stated (lstat absence, L54).
