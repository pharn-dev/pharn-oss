# GRILL — surface-bump-check

Plan: `.dev/features/surface-bump-check/PLAN.md` · spec-hash: MATCH (`2c84959c…b12e` recomputed with
`hash-doc.mjs`) · Step 1b lessons-declaration verdict (FLOOR, its own clock): **GREEN** — `check-plan-lessons.mjs`
exit 0, "all 9 cited id(s) resolve … and are referenced in the plan body".

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — each gates nothing)

### Inline interrogation + error-handling griller

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/surface-bump-check/PLAN.md:40"
  problem: "Untracked listing locally includes sibling worktrees under .claude/worktrees/ (not gitignored); the plan does not say they cannot match a pattern."
  evidence: "∪ `git ls-files --others --exclude-standard -z` (untracked)"
```

Resolution to carry into build: `git ls-files --others` lists a nested repository as one `dir/` entry and does
not descend into it, and no include pattern starts with `.claude/worktrees/`, so a sibling worktree cannot
classify as surface. Pin that with a fixture (an untracked nested repo whose inner path looks like
`pharn/floor/x.mjs` stays GREEN) and say it in the header.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/surface-bump-check/PLAN.md:56"
  problem: "The exclude `**/*.test.*` mirrors CLAUDE.md but would also exempt a future eval-case fixture named like a test file inside the shipped capability tree."
  evidence: "exclude (wins over include): `**/*.test.*`, `.claude/commands/pharn-dev-*.md`"
```

Measured this run: `git ls-files 'pharn/pharn-*' | grep '\.test\.'` → 0 files, so there is no live instance (P7:
no change, but name it as a bound in the header).

### Testability griller

Presence recognized: the `## Files` test bullet declares per-pattern classification, a closure binding with negative
controls, hermetic git fixtures for each refusal state, and execution of the committed CI line. Layer 2 (adequacy):

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/surface-bump-check/PLAN.md:201"
  problem: "No test is planned for the Q1 decision itself: that pharn/floor/README.md stays OUT while pharn/floor/*.json is IN."
  evidence: "`pharn/floor/README.md` stays OUT, and the checker header says why"
```

Carry: add `pharn/floor/README.md` and `pharn/floor/lens-family-map.json` to the classification table as a named
negative and positive.

### Architecture / coupling grillers

Fit recognized: a sibling `.dev/floor/` checker importing the ref grammar from `check-changelog-entry.mjs` and
`quote` from `changelog-core.mjs` routes shared grammar through one owner (L35), not leaf→leaf across module roots;
both live in the same apparatus directory. One axis per file holds (D1).

### Security griller

Scanner clean. Layer 2: the inputs are PR-controlled refs and path names; the plan's trust audit routes refs through
`REF_RE`/`MAX_REF_LEN` + argv-array git + `--end-of-options`, and paths only through a closed glob matcher and
`JSON.stringify`. No concern warranted.

### Performance griller

No scaling risk recognized: one `git diff`, one `git ls-files`, two `git show`s per run, linear matching.

### a11y, i18n, migrations, observability, privacy, comprehension, documentation

Not applicable to a CLI checker with no UI, no schema, no personal data; comprehension/documentation are covered by
the planned header, CONTRIBUTING and floor-checks guide sections. No findings.

## Summary

The plan is a direct application of L43's named remedy, with both of L43's design problems answered (one bound
constant; whole-PR net diff). The concerns are edges, not direction: make the untracked-worktree case explicit and
pinned, state the `*.test.*` exemption as a bound, and test the README-out / JSON-in decision by name.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict above is reported separately and is not part of this tally.
