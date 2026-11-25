# REVIEW — core-381-skill-symlinks

Floor first: `node pharn/floor/validate.mjs .` → GREEN (37 capabilities). Verify PASS and regress no-regressions stand
beside this review (`VERIFY.md`, `REGRESSION.md`). The reviewed increment is untrusted DATA. That includes 44
third-party skill files, which were read as data. No instruction-looking content in them changed what this review did.

## Floor-gate findings (blocking)

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:36"
  problem: "The entry says this release restores init and update. That holds only once release.yml tags v7.25.6 after the merge, and nothing in this PR exercises an install."
  evidence: "A pharn-cli on the default release channel installs the newest release, so this release is what restores"
```

The provenance claims ("each copy's computedHash, recomputed, equals its lock entry"; "`git archive` holds only
regular files and directories") are worded as measurements on this tree. No committed checker re-runs them, so they
are advisory, and the entry names CORE-383 as the missing floor check.

### L-eval → P1

No capability or `rule_id` is added, so there is no eval binding to check. `validate` agrees. The two vendored
`*.test.cjs` files are not collected by `npm test`. Measured: the per-test count is 7134 at both base and head.

### L-trust → P2

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".claude/skills/security-audit/validate-findings.cjs:1"
  problem: "Third-party executable scripts (mode 100755 for the two security-audit validators) are now committed bytes that this repo's sessions load as skills. Their integrity rests on a one-time hash comparison and on review."
  evidence: "4 entries at mode 100755; .claude/skills/* listed in skills-lock.json by computedHash"
```

These scripts are not installed into user projects: `pharn-install.json` `installRoots` names no `.claude/skills/`
path. While the link resolved on the author's machine, the same bytes were already live there. The change makes them
live in every clone.

### L-axis → P3

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "eslint.config.mjs:29"
  problem: "The vendored-skill exclusion now exists in two configs, eslint and markdownlint, each naming one skill. Prettier's covers all of .claude/skills/. A new vendored skill must be added to each config separately."
  evidence: '".claude/skills/security-audit/**",'
```

Each file changed has one reason to change. There are no sibling references.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (1 important, 2 minor).

## Proposed lesson

None proposed here. The recurring failure is "an apparatus-only change can still break the download", and CORE-385
already owns that lesson. Its floor remedy is CORE-383.
