# GRILL — ship-outcome-evidence-applicability

Plan: `.dev/features/ship-outcome-evidence-applicability/PLAN.md` · spec-hash: **match** · Step 1b
lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: 13 registered. The deterministic scanners (`migrations`, `observability`, `pii`, `secrets`)
all reported `false`. The a11y, i18n and performance axes do not apply.

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/ship-outcome-evidence-applicability/PLAN.md:60"
  problem: "Marker-based applicability accepts a report whose stage STARTED in the current run but REFUSED before rewriting it. On a new invocation, /pharn-regress can run fresh while /pharn-verify writes its stage-start and then refuses (for example S4 no-gates or a RED chain). The previous run's PASS verify-report stays on disk, both stages carry current-run stage-starts, and gate2 is still derived for a run that STOPped at verify. The plan names this only for the retry, but it applies to every attempt."
  evidence: "`current` iff the current run carries a `stage-start pharn-regress` **and** a `stage-start pharn-verify`"
```

Recommendation: do not widen this increment into orchestration. The intent forbids changing execution
gates and orchestration strategy, and binding a report to its attempt needs either a report-side run id
(a `verify-report` / `regression-report` contract change) or a lifecycle invalidation in `/pharn-ship`
(an orchestration change). State the gap as a **named residual that applies to every attempt**, pin its
current behaviour with a test so it is visible rather than hidden, and name the follow-up.

**Also worth surfacing:** the same stale file is what `/pharn-ship`'s **own** step-6 proceed read would
see after a verify that refused without writing. That is an instruction-level concern, since the ship
prose says to STOP on "missing-or-stale". It belongs to the follow-up, not here.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/ship-outcome-evidence-applicability/PLAN.md:77"
  problem: "`/pharn-loop`'s fallback (no LOOP.md → derived) now also goes through the applicability rule. That is a semantics change on the loop path, even though it is rarely reached: the loop writes LOOP.md before the ledger at every stop with a feature dir."
  evidence: "Any other command keeps today's precedence, `LOOP.md ?? derived`"
```

Recommendation: say so in the contract and the CHANGELOG, and keep the declared `LOOP.md` path
byte-identical.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/ship-outcome-evidence-applicability/PLAN.md:25"
  problem: "R2's reachability (a /pharn-ship run over a loop's feature directory) rests on /pharn-spec's resume prose, which is an instruction, not code. It is real supported usage, but it should be labelled instruction-level."
  evidence: "can be resumed by `/pharn-ship` through the same `/pharn-spec` resume path"
```

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/ship-outcome-evidence-applicability/PLAN.md:151"
  problem: "The eval list has no case for the refused-stage residual (finding 1). Without one, the remaining gap is unpinned and a later change could silently widen or close it without anyone noticing."
  evidence: "Mixed: verify `stage-start` in the current run but regress only in a previous run"
```

## Summary

The design is the right shape. It reuses the 6.9.0 run identity instead of inventing one, selects the
outcome source by command, and uses one applicability function for both the outcome and the report. Its
real limit is that markers prove a stage **started** in the current attempt, never that it **rewrote**
its report. That limit covers every attempt, not only the retry, and it must be stated at that width.

ADVISORY VERDICT: 4 concerns raised (1 blocking-severity, 2 important, 1 minor) — for the human to weigh
before `/pharn-dev-build`. The Step 1b floor verdict is GREEN and is reported above, separately.
