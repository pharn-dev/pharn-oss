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
README badge. `node pharn/floor/validate.mjs .` → GREEN (36 capabilities). Decisions: `origin/main` (6.38.1) was not
merged — its 6.38.0 collides with this branch's base (#309, also 6.38.0), which the orchestrator is restacking; the merge
happens at stacking. One deviation from "verbatim" in the builder is stated (lstat absence, L54).
