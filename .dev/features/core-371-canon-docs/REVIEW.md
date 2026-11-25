# REVIEW — core-371-canon-docs

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment under review
is `trust: untrusted`; no instruction-looking text was found in the diff.

Method: the four inline lenses, plus one independent read-only probe (a sub-agent given the diff, not this plan's
conclusions) that re-checked every edited sentence and every CHANGELOG restatement against the live tree: 54 sentences
probed, 50 held as written. Its findings below were re-checked here against the cited code before being recorded.

## Floor-gate findings

None. The increment claims no new guarantee: every edit is prose that brings a restated fact back in line with the
code it cites (L-floor → P0). No capability or `enforces` binding changed (L-eval → P1). No sibling reference was added
(L-axis → P3).

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: "CHANGELOG.md:26"
  problem: "The [7.25.3] section was written on a 7.25.1 base; origin/main is now 7.25.2 (dated 2026-11-25) and already holds the moved CORE-357 entry, so after a merge the section would be dated below its predecessor and would move a released entry."
  evidence: "## [7.25.3] - 2026-11-24 … ### Added … - 2026-11-24: **Measured: on CORE-310's intent v1"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/LIMITS.md:618"
  problem: "The same stale 24 h bound this increment corrected in two guides survives in LIMITS §7: a crashed run's marker is refreshed on every scan (6.31.2), so it holds the tree fail-closed past 24 h while sessions keep writing."
  evidence: "keeps every session in the tree fail-closed for up to 24 h unless it is closed, and `touch` extends it."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/LIMITS.md:640"
  problem: "The L-4 correction dropped 'at most', so three refusals read as a fixed count, while require-loop-record.cjs allows the stop after K refusals (K a ceiling)."
  evidence: "refuses a turn end, three times per run by default (`PHARN_STOP_GUARD_MAX`, 1 to 7), while"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "CLAUDE.md:212"
  problem: "'a run's entry' covers /pharn-ship loosely: it runs --check-epoch after GATE 1 (still before its run marker opens), where /pharn-loop runs it at Step 1a."
  evidence: "since 7.3.0 `--anchor` (and since 7.24.0 a run's entry) refuses"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/guides/floor-gates.md:3"
  problem: "The new header wording 'plus … the leading indentation Prettier normalizes' reads as if indentation was added; true but awkward (all ten guides)."
  evidence: "The text began as the moved text, plus the `##` headings added for navigation and the leading indentation Prettier normalizes"
```

## Dispositions

- `CHANGELOG.md:26` — real; fixed at the merge of `origin/main` before the PR: the section is re-dated 2026-11-25, sits
  above `[7.25.2]`, and carries only this increment's entry plus whatever `[Unreleased]` holds on `main` then.
- `pharn/LIMITS.md:618` and `:640` — real; a trusted doc, so a human patch
  (`$SCRATCH/patch-core-371-canon-2.py`, pre-image `8b0e6b30…4c28`, post-image
  `a45065d52e8e4a1646c9115b2e7dd66cdf10bcab8ec313ee74811052ebccb1bf`, dry-run measured, second run refused) is handed to
  the orchestrator. Not applied in this run.
- `CLAUDE.md:212` — kept: both commands run the check before their run marker opens, which is the run's start, and
  `reconcile-baseline.mjs:238` uses the same phrase; precision would cost instruction-growth bytes.
- Guide header wording — kept: the sentence is true; rewording ten files after verify buys no accuracy.

Verdict: GREEN (0 floor-gate findings; 5 advisory, 2 of them needing a human patch to a trusted doc).

## Lesson candidate

None proposed. The LIMITS §7 miss is the L64 restatement family (a corrected claim surviving in a third file), already
promoted; it was caught by the review the plan's L64 line asked for, so no new mechanism is indicated.
