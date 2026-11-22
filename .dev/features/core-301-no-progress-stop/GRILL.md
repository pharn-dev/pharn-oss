# GRILL — core-301-no-progress-stop

Plan: `.dev/features/core-301-no-progress-stop/PLAN.md` · spec hash: matches
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · **Step 1b lessons declaration: GREEN**
(`check-plan-lessons.mjs` exit 0 — all 10 cited ids resolve and are referenced in the body; the declaration, never
the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Inline — guarantee audit / determinism

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/core-301-no-progress-stop/PLAN.md:84"
  problem: "The plan says no-progress goes to Step 6 'as emitted' but pins nothing that holds the routing: a later edit of Step 5.4's STOP_TERMINAL bullet could leave the new cause unnamed, and nothing shows that no re-plan, supervisor or amend path reacts to it (GATE-1 condition 1)."
  evidence: "Step 5.4's `STOP_TERMINAL` bullet adds `no-progress` to the causes that go to Step 6 as emitted"
```

Checked live: the re-plan round, the supervisor and the amend are reached only from Step 4's triage read
(`pharn-loop.md` "`3` (`replan`)", "`4` (`spec`)", S16–S18), never from a `check-loop.mjs` exit; Step 5.4 sends
every `STOP_TERMINAL` cause but `ac-evidence` to Step 6, and `loop-closeout.mjs` commits only a green token. The
remedy is a test, not prose: every `TERMINAL_CAUSES` member other than `ac-evidence` must be named in Step 5.4's
Step-6 sentence (an L29 enumeration over the cause set), and the PR cites the triage-only entry to the supervisor.

### Inline — documentation (AC 2)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/core-301-no-progress-stop/PLAN.md:86"
  problem: "Only the record's capture rule names the repeat; the Step 7 summary the person reads at the stop is not told to name the repeated gates, ACs and regressions (GATE-1 condition 2)."
  evidence: "the close part's Step 6b capture rules add one line ... The Step 7 summary already lists per-iteration verdicts and standing reds."
```

Remedy: the Step 7 summary's per-iteration-verdicts bullet also names the JSON's `repeated` sets on a `no-progress`
stop (one clause; the close part has ~1.3 KB of headroom).

### Error handling

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/core-301-no-progress-stop/PLAN.md:57"
  problem: "The plan does not say what the run does when a copy line fails (no regression report on disk, a missing run directory): the model could treat it as a stop."
  evidence: "`/pharn-loop` Step 5.4's `CONTINUE` bullet gains one fenced block, run before `N++`"
```

Remedy: the bullet says a failed copy changes nothing — iterate anyway; the next stop read then compares nothing
new.

### Coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/core-301-no-progress-stop/PLAN.md:53"
  problem: "check-loop.mjs gains a second copy of the run-directory path shape that check-loop-decision.mjs's markerRun already holds; a relocation of pharn/.run/pharn-loop/ must now change both."
  evidence: "derives `pharn/.run/pharn-loop/<name>/prev-verify-report.json` ... exactly as `check-loop-decision.mjs`'s `markerRun` locates the marker"
```

Accepted as written: `check-loop-decision.mjs` reaches `check-loop.mjs` only as a CLI (its header forbids a
sibling import), and the copy is one join; a test that runs both on one fixture project binds them (the planned
decision test does).

### Testability

Presence recognized (`## Evals to write`). One addition: record the L84 mutation results (drop the AC component;
drop the `iter >= 2` guard) in the build notes, so "a test fails" is a measurement, not a claim.

### Not engaged

a11y, i18n, migrations, privacy, performance, observability, security (beyond the trust audit): no UI, text, schema,
personal data, hot path, runtime service or new input surface. The copies are read with the same `readVerdict` as
the reports (it follows symlinks); a forged or linked copy reaches only a non-green stop, as the plan's guarantee
audit states. architecture: fit recognized (one floor file, its tests, contracts' reader rows, command lines).

## Summary

The design is the smallest one available and keeps the decision deterministic. Two concerns are the GATE-1
conditions in finding form: pin the Step-6 routing of the new cause by a test, and make the user-facing summary
name the repeat. The rest is minor wording and a recorded mutation check.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
