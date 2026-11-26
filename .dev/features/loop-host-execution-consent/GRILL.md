# GRILL — loop-host-execution-consent (Linear CORE-397)

Plan: `.dev/features/loop-host-execution-consent/PLAN.md` · spec hash `8566b443…a9167` matches the pin (no drift) ·
**Step 1b lessons-declaration verdict (FLOOR): GREEN** — `check-plan-lessons.mjs` exit 0 (L29, L60, L64, L68, L87 all
resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 25 (revert). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Security / trust (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/loop-host-execution-consent/PLAN.md:48"
  problem: "The S15 summary would say the PERSON refused whenever the flagged call is denied, but a denial can also come from a deny rule or auto mode's classifier, with nobody asked."
  evidence: 'It says either "refused at Claude Code''s permission prompt (the check never ran)" or the check''s reason code.'
```

The model sees a denied tool call, not who denied it. The build should word the summary as "refused by Claude Code's
permission settings (a prompt answer, a deny rule, or auto mode's classifier); the check never ran". It should use the
same wording in the S15 row. Otherwise the screen line credits a person with a decision that may have been a rule.

### Comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-host-execution-consent/PLAN.md:44"
  problem: "The issue title asks not to be asked twice; the plan removes a second ask inside one run but keeps one ask per new run, and the command should say why so the next reader does not 'fix' it."
  evidence: "The second prompt in the issue therefore belongs only to a new run the person starts, and each run asks once. That is intended: an approval at the prompt covers this run only."
```

### Error handling (P7)

No finding. The plan's failure path is S15 (any non-zero exit, or a refusal). Its added rule removes the one
recovery branch a model could invent: retrying the line or switching to the flagged one. A denied call runs nothing,
so no witness is written and the existing "no feature directory, no record" route applies unchanged.

### Testability (P1)

Presence recognized: the plan names one ✧ test with two negative controls (L60) and keeps the 7.3.0 test. Layer 2:
the test can pin only the TEXT. The plan's guarantee audit labels obedience ADVISORY, which is honest.

### Other axes

Architecture, coupling, documentation, a11y, i18n, migrations, observability, performance and privacy have no concern
worth raising. The change is prose in two command files plus one test, with no new file, layer or data. The migrations
scan's "revert" hit (line 25) refers to reverting 7.3.0's fix, not to a schema change.

## Summary

The plan keeps the 7.3.0 guarantee (the flagged line stays out of `allowed-tools`, FLOOR over frontmatter). It adds
advisory text: which consent counts, one isolation line per run with no retry, and a clearer S15 summary. The main
gap is attribution in that summary. A denied call is not proof that a person said no. The other point is a sentence
saying why a new run asks again.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 1 important, 1 minor) — for the human to weigh before
/pharn-dev-build.
