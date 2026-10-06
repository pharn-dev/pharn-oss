# GRILL — claude-md-bootstrap

Plan: `.dev/features/claude-md-bootstrap/PLAN.md` · spec-hash: recomputed `d831d30d…f4f4` == pinned (no drift) ·
**Step 1b lessons-declaration verdict (FLOOR): GREEN** — `check-plan-lessons.mjs` exit 0, all 6 cited ids resolve and
are referenced in the body.

## Findings (advisory — model judgment; none is a gate)

### Inline axes

```yaml
- type: FINDING
  rule_id: "P4"
  severity: important
  file: ".dev/features/claude-md-bootstrap/PLAN.md:68"
  problem: "The four floor-*.md guides move ~128 KB of checker summaries verbatim. That restates module headers and contracts, and the move does not retire the restatement, so L64's drift risk travels with the text."
  evidence: "`.dev/guides/floor-checks.md` — **NEW.** Floor CLI reference: validate, structural, …"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/claude-md-bootstrap/PLAN.md:58"
  problem: "The plan bounds new root lines at 2,048 B but names no procedure if the first draft is over. It should say: trim the index wording first, then report an over verdict honestly; never raise the budget or change the base."
  evidence: "its total must stay ≤ 2,048 B"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/claude-md-bootstrap/PLAN.md:66"
  problem: "Two root bullets (fail-closed, write-blocked) are kept truncated with a new tail, while the guide holds the whole bullet. The first lines therefore exist twice, and a later edit to one copy can miss the other."
  evidence: "`.dev/guides/writes-scope.md` — **NEW.** fix #7 detail: installed-project posture, …"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/claude-md-bootstrap/PLAN.md:71"
  problem: "`floor-orchestration.md` groups the loop stop/freshness checkers, the cost ledger and stage routing. These are three subsystems that change for different reasons. It is acceptable for a reference index, but the per-entry `##` sections are what keep reads narrow."
  evidence: "Floor CLI reference: loop stop core, freshness, stop guard, … cost ledger, … stage-agent routing, direct stage call."
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/claude-md-bootstrap/PLAN.md:20"
  problem: "The trigger is the maintainer's direction plus a measured size, which the plan states honestly. Nothing measures whether a smaller prefix changes model behavior, so the CHANGELOG entry must not imply a quality or cost result."
  evidence: "No observed failure in this repo is claimed as the trigger."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/claude-md-bootstrap/PLAN.md:75"
  problem: "The 6.46.1 version claim is safe only while main stays at 6.46.0. Re-fetch before the PR and renumber by diff if main moved."
  evidence: "Opens `## [6.46.1] - 2026-10-06` above `[6.46.0]`"
```

### Registered grillers (13, from `count-grillers.mjs`; each procedure applied inline, briefly)

- `documentation`: the plan gives each guide a "read when" header and a root index. No further finding beyond the
  duplication note above.
- `testability`: no executable behavior changes. Existing pins (`check-bash-reconcile.test.mjs` NON-ADVERSARIAL,
  `check:markers`, `check:badge`, `docs:check`) and the one-off `check-migration.mjs` cover the risks. No new test is
  justified (P7). No finding.
- `security`: the moved text is trusted instruction text. The guides are not hook-protected, but neither was
  `CLAUDE.md`. No finding.
- `architecture`, `coupling`: covered by the P3 note above.
- `a11y`, `i18n`, `migrations`, `privacy`, `performance`, `observability`, `error-handling`, `comprehension`: no code,
  UI, data, telemetry or error path in scope. No findings.

## Summary

The plan is a verbatim relocation with a line-accounting verifier. It changes no executable file, and the only
product edit is one contract sentence under a patch bump. The main concern is P4: the floor CLI summaries keep
restating their owners after the move. Dedupe against the module headers was not verified here and should be a named
follow-up. A second concern: the growth budget needs a stated fallback.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 3 important, 3 minor) — for the human to weigh before
/pharn-dev-build.
