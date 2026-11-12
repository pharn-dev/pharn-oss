# SHIP — loop-amend-exit6 (7.10.1)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → human trusted-doc patch (commit `622d508e`) →
`/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

- **Trigger:** CodeRabbit's review of the 7.10.0 pull request — the amend branch sent the re-run spec stage's `finish`
  exit `6` to S18, against `## Running a stage`'s S9b rule.
- **GATE 1 (plan acceptance): the maintainer**, in chat, "Approve as written", 2026-11-11.
- **Trusted-doc edits: the maintainer**, who ran the patch script for `pharn/LIMITS.md` §1d and `pharn/THREAT-MODEL.md`
  §5; committed as `622d508e` before the build anchored (L68); the script was deleted.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Grill: advisory, `GRILL.md` (3 minor concerns on the new test — fold whitespace, range over the three `/pharn-loop`
  files, state the stems-only bound in the test's comment; all acted on in the build).
- Build: one note — prettier widened the whole stuck-point table when the S18 cell outgrew its column, so the cell was
  shortened (`finish` exit 6: S9b) and the diff kept to that row.
- Regress: `REGRESSION.md` / `regression-report.json` — base `622d508e`, 188 outside test files; base 6,297 / head 6,303
  passed, `new_failures: []`.
- Verify: `VERIFY.md` / `verify-report.json` — all eight gates exit 0, `reconcile` included (stamp `5c909c36…`).
- Review: `REVIEW.md` (GREEN, 0 floor-gate findings, 2 minor advisory: the amend branch does not restate Step 3's
  TaskStop-before-stop on a finish exit `2` after a background launch; the amend branch is still unexercised by a real
  run).

- **GATE 2, first presentation: the maintainer**, in chat, "Fix finding 1 first", 2026-11-12. The amend branch gained
  the TaskStop-before-S18 sentence for a `finish` exit `2` or a crash after a background launch, with its pin and a
  CHANGELOG clause (declared files, plan scope). Regress and verify were re-run fresh over the fixed tree: no-regressions
  (`new_failures: []`), PASS (all eight gates, stamp `91f22036…`); the verdict lines above are the re-run's. `REVIEW.md`
  records finding 1 as fixed.

- **GATE 2 (merge / fix / abandon): the maintainer**, in chat, "Yes, ship it", 2026-11-12 — merge once the pull
  request's required checks pass.

changelog-entry: exit 0

lesson: none — the miss (one branch overriding a file-wide "at every routed stage" rule) is now caught by the closure
test this increment adds, so the remedy is already a mechanism (L20).

deferred: none

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
