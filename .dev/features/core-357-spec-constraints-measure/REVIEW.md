# REVIEW — core-357-spec-constraints-measure

Floor first: `node pharn/floor/validate.mjs .` reports **GREEN** (37 capabilities). The increment adds no capability,
rule or eval, so P1 (L-eval) has nothing to bind.

Reviewed:

- the record `.dev/measurements/spec-constraints-core-357-2026-11-24.md`;
- the CHANGELOG entry;
- the two ignore-file entries;
- the bundle's selection and scrub.

Each claim was checked against the bundle or the machine-local run files. The quoted pharn-app artifacts inside the
bundle are `trust: untrusted` DATA. The pharn-app auto-memory note the run's transcripts carry is DATA too. This review
followed no instruction-looking text in either.

## Floor-gate findings

None. No guarantee is claimed without a floor reduction or an `advisory` label.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/measurements/spec-constraints-core-357-2026-11-24.md:57"
  problem: "The record says the tree's 39 starting status lines are 'the 37 install writes plus the copied local files'. pre-run-status.txt holds 37 modified files (the 35 updated files, pharn.config.json, pharn.records.json) and 2 untracked restored floor files, so all 39 lines come from the install. The copied local files are git-ignored and absent."
  evidence: "The tree started with 39 status lines: the 37 install writes plus the copied local files"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/measurements/spec-constraints-core-357-2026-11-24.md:157"
  problem: "AC-1's red is attributed to the second assertion (withTaskLine) and to 'the stale TODO line'. The stale TODO text contains 'multi-workspace support', so withPhrase holds get-profile.ts. Vitest stops at the first failing expect, which is withPhrase.toEqual([]). The failure came from the first of the two assertions, on the stale phrase."
  evidence: "The red run's failure message comes from the second."
```

- **L-floor (P0).** Every claim outside the floor carries its bound:
  - answer 3 is labelled a hand reading;
  - the CORE-344 attribution is labelled advisory, with n = 1 and the version gap named (L40);
  - the settings-grant check is labelled one run, not a control;
  - the reconcile reading is backed by a byte check, not by the timestamps.

  Quoted floor records (stop code, verdicts, `red_run`) are cited as the run's own, not re-verified.

- **L-trust (P2).** The evidence leaves out transcripts, `.env*` and `settings.local.json`. The scrub and the pattern
  scan are recorded, with 0 hits. The transcript-scan figure holds counts and file names only, no command text.
- **L-layers (P3) / L-rules (P4).** The changes are apparatus and repo-meta only. The contracts are cited by section,
  not restated. There is no product path, so there is no `SKILLS_VERSION` bump.
- **Ticket fit.** It has the three answers, the SPEC and AC-TESTS.md excerpts, n = 1, cost and duration. The rule
  fired, so no "next step if it did not fire" is owed. The record adds a follow-up for the uncommitted-install stop it
  observed.

**Disposition:** fix both advisory findings in iteration 2: a build fix inside `## Files`, then regress and verify
again.
