# DOCS-PROPOSAL — review-quoting (batch group G8)

Proposed human edits to trusted docs that this increment's changes make true. Not applied by the agent (hard
constraint 1). The orchestrator folds these into the owner-run docs script. Each is an exact replacement.

## 1. `pharn/ARCHITECTURE.md:328` — §8, the `type` list is now closed

Why: `pharn/pharn-contracts/finding-shape.md` and `pharn/floor/merge-findings.mjs` (`TYPE_ENUM`) close the list to two
values in 7.3.0. A `| ...` left here would be the one place the list still reads as open. Optional: the contract
elaborates §8, and no test binds this line.

Old (line 328):

```text
  type: "<enum>" # FINDING | CONSTITUTION_VIOLATION | ...
```

New:

```text
  type: "<enum>" # FINDING | CONSTITUTION_VIOLATION
```

## 2. `pharn/LIMITS.md:128` — §3a, no aggregate bound on the review set

Why: the 2026-11-03 audit measured that `render-review-assignments.mjs` bounds each DISCOVERED file (512 KiB) but not
the set: a file named with `--target` is kept unfiltered, and every scanner-less lens group gets the whole resolved
target. 7.3.0 states this in `/pharn-review` Step 1b and adds no cap (no observed failure; a refusal threshold would
stop legitimate large reviews). §3a is where the fan-out cost is owned.

Old (line 128, the end of §3a's first paragraph):

```text
the largest practical token problem and it is not yet solved.
```

New:

```text
the largest practical token problem and it is not yet solved. Nor is the review set bounded as a whole:
`render-review-assignments.mjs` skips a discovered file over 512 KiB, but keeps a file named with `--target` as
named, and every scanner-less lens group receives the whole resolved target, so a large target enters each of
those contexts in full (`/pharn-review` Step 1b states it; no cap exists).
```

## Not proposed here, named for the orchestrator

- Canon `L14` (`.dev/memory-bank/lessons-learned.md`) states that JavaScript `$` without the `m` flag matches before a
  trailing newline; measured false on Node 24 (`/^P[0-7]$/.test("P2\n") === false`). This increment corrected the
  restatement in `merge-findings.mjs`'s `isCleanScalar` comment only; the canon correction belongs to group G9's sweep.
