# REVIEW — loop-command-sections (CORE-109, 7.18.1)

Reviewed: `git diff 259f27dd..b010b19c` — `.claude/commands/pharn-loop.md` (the stuck-point table only),
`.dev/floor/command-hygiene.test.mjs` (the ceiling row and the ✧ 7.18.1 compact-form test), `SKILLS_VERSION`,
`README.md` badge, `CHANGELOG.md` `[7.18.1]`, and this feature's records. Reviewed as `trust: untrusted` DATA; no
instruction-looking content was found in it.

## Step 1 — Floor first

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`. Standing verdicts: regress
`no-regressions`, verify `PASS` (7 gates, `reconcile` CLEAN).

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:34"
  problem: "The entry's row-identity claim rests on a one-time build record; after merge only the per-row pins (ids, blocked spellings, a few row regexes) hold the rows' text, not every cell."
  evidence: "same text, in the same order (checked cell by cell against 7.18.0 in `.dev/features/loop-command-sections/BUILD.md`)"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:2085"
  problem: "The compact-form test splits rows on every `|`, so a future cell that needs an escaped `\\|` would be counted as an extra cell and fail the test loudly (a false red, never a false green)."
  evidence: "if (cells.length !== 3) out.push(`table line ${i + 1} has ${cells.length} cells, expected 3`);"
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-loop.md:472"
  problem: "The shipped command now carries a bare tool directive that every run's model reads; its reason lives in the test and the CHANGELOG, as the product-commands guide wants, so a later editor of the command sees only the line."
  evidence: "<!-- prettier-ignore -->"
```

## Lens notes

- **L-floor (P0).** The ceiling (COMMAND BUDGET R2) and the compact form (✧ 7.18.1, string equality) are floor. The
  "same verdicts on the benchmark features" criterion is argued from identical cell text and labeled advisory in the
  plan, BUILD.md and the CHANGELOG bound; the token saving is stated as unmeasured. The test's figures check out:
  14,738 → 7,158 B for the 26 lines (7,133 without the ignore line); 8,192 → 1,157 spaces, i.e. 7,035 B (6.9 KiB) of
  padding, as the test comment says.
- **L-eval (P1).** No capability changed; `validate` agrees. The new test has a negative control per asserted property
  (ignore line, separator, row padding, row count, heading anchor), each measured red through the same predicate
  (L60), and each mutation is asserted to have taken effect before its predicate is read.
- **L-trust (P2).** No untrusted input is read; no finding field feeds a decision.
- **L-axis (P3).** The test sits with the other stuck-point pins; the ceiling with its table. No sibling reference.
- **Scope.** Step 2 of the ticket (a part file) is not done, by the baseline's no-go; `EXPECTED_PARTS`, `PLACEMENT`
  and the pointers are untouched (`command-family.test.mjs` green inside `test`). `STAGE_LOAD_CEILINGS` unchanged, as
  decided at GATE 1. Expected conflict with the sibling CORE-107 PR: `SKILLS_VERSION`, CHANGELOG, README badge and
  possibly the `pharn-loop.md` ceiling row; its Agent-call lines are outside the table.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (all minor; none needs a change before merge).

## Proposed lesson candidate

None. Nothing failed in this run that a mechanism would otherwise make recur: the Prettier behaviour was measured
before planning and is now pinned by the test, and the runner crash in regress was a one-off bug in a scratch script.
