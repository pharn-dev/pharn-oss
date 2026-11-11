# REVIEW — loop-replan-rounds (7.8.0)

Reviewed: the working-tree diff of `feat/loop-replan-rounds` against `8839760` (25 planned files), treated as
`trust: untrusted` (P2). Floor first: `node pharn/floor/validate.mjs .` — see Step 1 below.

## Step 1 — floor

- `node pharn/floor/validate.mjs .` → GREEN (exit 0), re-run at review time (`FLOOR: GREEN — 37 capabilities`).
- Verify's gate map (`verify-report.json`) → PASS; regress (`regression-report.json`) → no-regressions.

## Floor-gate findings

None. Every guarantee the increment claims reduces to enum/regex (the round arithmetic, the closed archive set, the
verdict and round agreement in `grill-round-core.mjs`) or is labelled advisory/bounded (the archives are protected at
write time only; that a re-plan fixes what triage escalated is the next grill's and triage's judgment). The four
artifact lists are bound to `ARCHIVE_NAMES` by a test (`grill-round.test.mjs`, ★ every artifact list).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/grill-triage.md:111"
  problem: "'no archive is ever overwritten' rests on a check made before the renames, not on an exclusive rename; a writer that creates an archive between the check and renameSync would be overwritten (POSIX rename replaces its target)."
  evidence: "that no archive is ever overwritten; and links or non-regular files are refused"
- type: FINDING
  rule_id: P6
  severity: minor
  file: "pharn/floor/grill-round.mjs:127"
  problem: "`current` treats a live triage that fails its check the same as no triage: it answers `replan_from` from the newest archive (or null) instead of refusing, so a hand re-plan after an S16 stop whose grill-triage.json was later corrupted silently re-plans from an older round or as a first plan."
  evidence: "binds = p.ok && p.round === a.archived + 1;"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".claude/commands/pharn-plan.md:87"
  problem: "Re-plan mode feeds triage `reason` text (model-written over untrusted findings) into plan revision; the channel is named in THREAT-MODEL §5 (6) and the contract's Trust paragraph, and bounded by a fresh grill, triage and the cap — recorded here as the residual this increment enlarges, not a defect."
  evidence: "revise that plan so each finding triaged `replan` is addressed"
```

## L-eval (P1)

No Capability was added; the new floor CLI ships with 17 tests covering every defect code, both subcommands, symlinks,
a forced rename failure and the two-advances-then-cap sequence. Command-text pins added in `command-hygiene.test.mjs`
(REPLAN ROUND, ARCHIVES ARE NO STAGE'S TO WRITE).

## L-axis (P3)

`grill-round.mjs` imports only floor siblings already used the same way (`grill-findings-core`, `grill-triage-core`,
`gate-run-core`'s slug regex, `regular-file`); the core is pure. No sibling capability-module reference.

## Proposed lesson

None: no finding's remedy reduces to "remember next time".

VERDICT: GREEN — 0 floor-gate findings, 3 advisory (all minor).
