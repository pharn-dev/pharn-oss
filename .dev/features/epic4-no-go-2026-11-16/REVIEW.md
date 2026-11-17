# REVIEW — epic4-no-go-2026-11-16

Reviewed: `.dev/measurements/epic-4-no-go-2026-11-16.md` and the `CHANGELOG.md` `[Unreleased]` entry, both
`trust: untrusted` for this review. Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities`.

**Verdict: GREEN — 0 floor-gate findings, 3 advisory findings.**

## Floor-gate findings

None. The increment claims no guarantee: "What this record may claim (P0)" says nothing it concludes is a floor
guarantee and puts every decision, trigger and reading under advisory (L-floor). It adds no Capability or `rule_id`
(L-eval). It emits no finding object, and the text it quotes (ticket close conditions, baseline cause lines) is marked
DATA and steers nothing; no instruction-looking text in the reviewed files changed this review (L-trust). Two files,
each with one reason to change, and no reference across module roots (L-axis).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/measurements/epic-4-no-go-2026-11-16.md:120"
  problem: "The second row subtracts a token gap measured in this repository's probe tree, with a one-line prompt, from first-request sizes measured in a project's November runs; the row is labelled an estimate and bounded below the table, but a reader skimming the table alone may read 7.2%–6.9% as the expected share."
  evidence: "the baseline's routed first request less the probe's gap (94k and 97k, − 26,044) | 67,956–70,956 | 7.2%–6.9%"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/measurements/epic-4-no-go-2026-11-16.md:35"
  problem: "'No run has been added since the baseline' rests on a file count and mtimes, which a copy or a touch can move either way; the record says an mtime is metadata, and the claim stays advisory, not measured."
  evidence: "together with the unchanged count it says no run has been added since the baseline read them"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/measurements/epic-4-no-go-2026-11-16.md:62"
  problem: "Lines 62, 107–109 and 144 run past the 120-column wrap the rest of the file keeps (edits after the formatter, which preserves prose wrapping); no gate checks it, so it is cosmetic only."
  evidence: "`pharn-plan.md` is 26,749 B, unchanged since 7.10.3 (`git log v7.10.3..HEAD` over the file prints nothing) [S·m], against a 29,696-byte ceiling"
```

## Checks made (re-derived during review)

- The byte table and both headrooms (2,947 B, 1,656 B), re-run with the record's own Reproduce lines at HEAD and
  `v7.3.0`; the shares in section 4 recomputed from 4,896 over each denominator (23.3, 7.2, 6.9, 5.2, 5.0, 2.6, 1.6%).
- Each figure the CHANGELOG entry restates (129, 7.10.3, 0.76 / 0.43, 4 of 36, 1,656 vs 3,296, 19,582 B, 4.9k,
  5.0–7.2%) matches the record (L64).
- The reopen triggers match the GATE 1 answers (Q1–Q3) word for word in substance, and the CORE-97 note that the second
  reason is weaker since `gates.timeoutMs` is kept.
- Baseline citations (§3, §7, §9, §10, §12) point at the sections that hold those figures.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written to canon)

- **Title:** A hand-rolled replacement for a pinned gate line must check the shape of every value it feeds in, or it
  fabricates a gate that is red on both sides and is filed as pre-existing.
- **What happened:** `/pharn-dev-regress` ran through a node runner because the isolated worktree refuses the pinned
  shell forms. The runner read `check-regress.mjs scope`'s `outside_eval_pairs` as `expected::actual` strings, while
  they are `{expected, actual}` objects, so it ran a non-existent pair. The gate `structural:[object Object]` was exit 1
  at base and head, and `check-regress.mjs verdict` filed it under `pre_existing` and returned `no-regressions`. The run
  was discarded and the stage re-run (`.dev/features/epic4-no-go-2026-11-16/REGRESSION.md`, "Orchestration notes").
- **Why it would recur:** every isolated-worktree run reimplements the pinned lines (the memory note on worktree
  isolation prescribes a node runner), and L5 / L16 / L21's input-capture failures recurred through a new route. A
  floor remedy exists: `check-regress.mjs verdict` could refuse a gate id that is not a recognised shape (for example
  `structural:` followed by a path that exists), so a setup error fails as a setup error.
- **Source:** this REVIEW.md, this section; type `process`; concepts `input-capture`, `lesson-recurrence`,
  `floor-escalation`, `false-green`.
