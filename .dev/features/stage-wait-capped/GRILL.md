# GRILL — stage-wait-capped

Plan: `.dev/features/stage-wait-capped/PLAN.md` · spec-hash check: MATCH (`d5a97430…`, recomputed with
`.dev/floor/hash-doc.mjs`) · Step 1b lessons declaration (FLOOR): GREEN — `check-plan-lessons.mjs` exit 0
("applied_lessons: L27, L29, L72, L75 … all 4 cited id(s) resolve … and are referenced in the plan body").

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 36 (logging), 58 (logging), 69 (logging), 108 (logging), 115 (logging), 132 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — each gates nothing)

### Inline axes

- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/stage-wait-capped/PLAN.md:92"
  problem: "The same command already maps an exit 6 to a different row — entry-gates.mjs --wait exit 6 is S14b — so an
  unqualified 'exit 6 → S9b' in pharn-loop.md invites the orchestrating model to map one CLI's 6 by the other's rule."
  evidence: "a new item maps exit `6` (`capped …`, `marker: withheld (capped)`) to **S9b** at every routed stage"

- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/stage-wait-capped/PLAN.md:83"
  problem: "The judgment trigger stops the run without running finish, so a result the agent wrote before the session
  ended is left on disk unread; the plan calls this failing safe but does not say the remedy text should tell the
  person a reported result may exist."
  evidence: "or, when work resumes, the session ended while a stage agent ran (your own judgment — ADVISORY, failing safe)"

- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-wait-capped/PLAN.md:102"
  problem: "With no return marker, the orchestrator's own requests between the capped finish and the run-stop (the S9b
  stop's record, revert and ledger steps) also bill to the stage's bucket, not only the agent's rows; the contract
  sentence should not imply only the agent's rows land there."
  evidence: "so an agent still running bills its later rows to the stage until the run's `run-stop`"

### Grillers

- testability: verification declared (`## Evals to write (P1)` lists spawned-CLI cases incl. the issue's repro, a
  second capped call, the unchanged ship path, and hygiene pins) — presence recognized; no finding.
- architecture / coupling: changes stay inside the existing floor pair (pure core + CLI) and the one command family
  that consumes it; no sibling reference, no new shared store — fit recognized; no finding.
- comprehension: the non-obvious choices (exit 6 over exit 2, the row name, the judgment trigger) each carry a WHY
  under "Decisions taken" — rationale recognized; no finding.
- documentation: header, guide, contract sentence and CHANGELOG are declared — no finding.
- error-handling: the change is itself failure handling (the cap path); the TaskStop-failure case reuses item 3's
  "may still be running" summary — no finding beyond the inline P0 note above.
- observability: the scanner's mentions are the word "logging" inside unrelated prose (line hits name `stage-start`
  /log lines only incidentally); the closed `capped …` line and the unmeasured ledger row are the observability this
  change adds — adequate; no finding.
- performance: no new I/O beyond one extra consume on the capped path — no scaling risk.
- security / privacy / i18n / a11y / migrations: no secret, PII, user-facing string, UI or persisted schema — no
  concern warranted.

## Summary

The plan is narrow and its consumer sweep is explicit. The most useful concern is reader confusion: `/pharn-loop`
already branches on an exit `6` from `entry-gates.mjs` (S14b), so the new mapping should name its CLI
(`stage-agent.mjs finish`'s exit `6`) wherever it appears, and the hygiene pin should match that qualified spelling.
The two minor notes ask the S9b remedy to mention that a reported result may still be on disk (judgment trigger), and
the cost-ledger sentence to say the whole stop's requests bill to the open stage, not only the agent's.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 1 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this count.
