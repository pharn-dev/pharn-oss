# SHIP — loop-supervisor (7.9.0)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → human trusted-doc patch (commit `eae5fce8`) → `/pharn-dev-grill` →
`/pharn-dev-build` (with one `## Files` amendment and a re-anchor) → `/pharn-dev-regress` → `/pharn-dev-verify` →
`/pharn-dev-review` → GATE 2.

- **Open questions: the maintainer**, in chat, before the plan: split (3a now, amend-spec as 3b); KNOWN RISK as ids in
  the commit; `/pharn-supervise` resolves through `default` with a pharn-cli port as a follow-up.
- **GATE 1 (plan acceptance): the maintainer**, in chat, "Approve as written", 2026-11-11 — including the one deviation
  from the brief: S16 keeps `grill-escalation` for the supervisor's `stop`, and only `supervisor-red` (S17) is new.
- **Trusted-doc edits: the maintainer**, who ran the patch script for `pharn/ARCHITECTURE.md`, `pharn/THREAT-MODEL.md`
  and `pharn/LIMITS.md`; committed as `eae5fce8` before the build anchored (L68), the plan's `spec_content_hash`
  re-pinned.
- **Amended during the build:** `pharn/floor/stage-agent.test.mjs` (a routed-cell count) was missing from `## Files`. It
  was added to the plan, the scope setter re-run and the reconcile baseline re-anchored before the edit (`PLAN.md`,
  "Amended during the build"). Every write before the re-anchor was to a declared path; the cost is that reconcile does
  not audit those earlier writes.
- **GATE 2 (merge / fix / abandon): the maintainer**, in chat, "Yes, ship it", 2026-11-11 — merge once the pull
  request's CI is green.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Grill: advisory, `GRILL.md` (4 concerns: 2 important — a stale decision shown in a `/pharn-ship` report, and the
  wording of "only on an escalation" — both acted on in the build; 2 minor, both acted on).
- Regress: `REGRESSION.md` / `regression-report.json` — base eae5fce8, 179 outside test files, base 5,899 / head 5,905
  passed, `new_failures: []`.
- Verify: `VERIFY.md` / `verify-report.json` — all eight gates exit 0, `reconcile` included.
- Review: `REVIEW.md` (GREEN, 0 floor-gate findings, 3 minor advisory).

changelog-entry: exit 0

lesson: none — the one recurring shape (a test that pins a count of cells rather than naming the stage, missed by a
name grep) is L29/L36's enumeration family; one occurrence here does not meet L20's bar for a new lesson.

deferred: a pharn-cli port that accepts a `supervise` key (as 0.18.1 did for `triage`); part 3b (amend-spec, 7.10.0).

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
