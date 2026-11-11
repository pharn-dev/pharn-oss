# SHIP — loop-amend-spec (7.10.0)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → human trusted-doc patch (commit `ddfaf751`) →
`/pharn-dev-build` → `/pharn-dev-regress` (a STOP, fixed, re-run) → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

- **Open questions: the maintainer**, in chat, before the plan: Intent + Scope frozen; append-only criteria; a
  `/pharn-spec` amend mode; flat `.a1` names.
- **GATE 1 (plan acceptance): the maintainer**, in chat, "Approve as written", 2026-11-11.
- **Grill before the trusted-doc commit:** the grill ran over the plan pinned to the pre-patch spec hash; the plan was
  then re-pinned after the commit, and its 4 advisory concerns were recorded in `PLAN.md` for the build to act on.
- **Trusted-doc edits: the maintainer**, who ran the patch script for `pharn/ARCHITECTURE.md`, `pharn/THREAT-MODEL.md`
  and `pharn/LIMITS.md`; committed as `ddfaf751` before the build anchored (L68).
- **One deviation from the plan's defect list:** `criteria-unreadable` was added for a SPEC whose acceptance criteria
  cannot be parsed (not templated, or not exactly one section); the plan's list had no code for it.
- **GATE 2 (merge / fix / abandon): the maintainer**, in chat, "Yes, ship it", 2026-11-11 — merge once the pull
  request's CI is green.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Grill: advisory, `GRILL.md` (4 concerns: 1 important — which stop a failed re-run spec stage maps to; 3 minor — the
  L65 wording, removing the copy on a failed `begin`, two untested refusals; all acted on in the build).
- Regress: `REGRESSION.md` / `regression-report.json` — base `ddfaf751`, 182 outside test files. **First run: a STOP**
  — `frontmatter-core.test.mjs`'s consumer closure failed, because `spec-amend-core.mjs` read the frontmatter fence
  without being a listed consumer. Fixed in declared files (`status`'s `pending` now compares the criteria section, not
  the body); the directory was cleared and the stage re-run: base 6,017 / head 6,023 passed, `new_failures: []`.
- **A fix made during regress, before its head side ran:** on a stop that is not green, Step 6a reverts SPEC.md to Draft
  before the run report renders, so `## SPEC amendment` would have read `not-approved` for a sound amend. The report now
  reads the amend without the approval check (`readAmend(dir, {approval: false})`); the closeout keeps it. Declared
  files, plan scope, tests added.
- Verify: `VERIFY.md` / `verify-report.json` — all eight gates exit 0, `reconcile` included (stamp `c3049393…`).
- Review: `REVIEW.md` (GREEN, 0 floor-gate findings, 3 minor advisory: the trusted docs' "byte-identical" against a
  line-for-line check, the archived reason shown after a shape read only, the amend branch not yet exercised by a real
  run).
- Local checks before CI: diff coverage 634/634 added lines; no test title from `main` removed or renamed (TI02).

changelog-entry: exit 0

lesson: none — the regress STOP is the second time a closure test keyed on an idiom (here the frontmatter-fence regex;
in 7.9.0 a routed-cell count) was missed by the plan's name grep, but both times a deterministic check caught it before
merge, so the remedy is already a mechanism, not "remember next time" (L20).

deferred: a pharn-cli port that accepts a `supervise` key (as 0.18.1 did for `triage`); the heading spelling in the
append-only check, or a trusted-doc wording of "line for line" (REVIEW finding 1).

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
