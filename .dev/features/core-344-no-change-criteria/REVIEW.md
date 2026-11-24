# REVIEW — core-344-no-change-criteria

Step 1 (floor first): `node pharn/floor/validate.mjs .`: GREEN (37 capabilities). Verify: PASS (7 gates, reconcile
CLEAN). Everything below is **advisory**.

Reviewed: the diff of `pharn/pharn-contracts/spec-template.md`, `pharn/pharn-contracts/ac-tests.md`,
`.claude/commands/pharn-{spec,loop,grill,triage,test}.md`, `SKILLS_VERSION`, `README.md` (badge), the regenerated
`pharn-install.json`, and the CHANGELOG `[7.23.1]` entry. The CORE-310 evidence quoted in the contracts is
measured-project text, quoted as DATA. No content in the reviewed files tried to steer this review.

## Floor-gate findings

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: .claude/commands/pharn-spec.md:165
  problem: "The Step 2 bullet scopes the rule as 'every kind but test-infra'. The owner, spec-template.md:283, also excludes a legacy SPEC (no AC tests), so the command's restatement is wider by one case."
  evidence: "command: '(advisory; every kind but `test-infra`)'; contract: 'a `feature` or `quick` kind, not `test-infra` … and not a legacy SPEC (which gets no AC tests)'"
- type: FINDING
  rule_id: P0
  severity: minor
  file: .claude/commands/pharn-loop.md:482
  problem: "The S6 row's new clause reads as 'every criterion is unscopable or already holds'. Step 4a's two bullets each end in thin intent only when no criterion remains, which includes a mix of the two; the row's wording covers the mix only loosely."
  evidence: "'or every criterion needs a write no plan may scope or already holds before the build (`/pharn-spec` Step 4a)'"
```

Lens notes:

- **L-floor (P0):** every new rule sentence is labelled advisory in the contracts and the commands. The one floor
  claim, that `check-red-run.mjs` REDs a criterion whose test passes before the build, is true of the existing checker
  (`ac-test-passes-before-build`, `ac-tests.md` reason table) and is not widened. The guard paragraph states that the
  floor cannot see a guard. The constraint wording says "only as far as those gates observe it", and names the quick
  run's missing base comparison. Restatement sweep (L64): the CHANGELOG bullet, the four command lines and the S6 row
  were checked against the two owners. The first advisory finding above is the one mismatch.
- **L-eval (P1):** no capability or `rule_id` was added or changed; validate GREEN agrees.
- **L-trust (P2):** no new ingestion. The new command lines ask the model to judge SPEC criteria that are already fenced
  as untrusted DATA in each command. No guaranteed decision rests on that judgment.
- **L-axis (P3):** each rule has one owner under `pharn-contracts`, and the commands cite it rather than restate it
  (L76). No sibling reference was added.

## Verdict

GREEN, with 0 floor findings and 2 minor advisory findings. Neither changes what a run does: a legacy SPEC never
reaches `/pharn-test`, and the mixed case still ends in the same S6 stop. Under the delegated GATE 2 they are
recorded, not fixed, because fixing either would re-open verify for wording only.

## Proposed lesson candidate

One candidate: _a plan that bumps `SKILLS_VERSION` must declare the README badge and `pharn-install.json`._ This run's
regress iteration 1 failed on exactly that. It is not proposed: `check-version-badge` and `check-install-manifest`
already catch it deterministically, at regress and in `npm run check`, so the remedy is not "remember next time" (L20's
bar). The cost was one regress iteration.
