# GRILL — finding-backstop-class

**Plan:** `.dev/features/finding-backstop-class/PLAN.md` · **spec-hash:** MATCH
(`83890d97…9487` == live `sha256(pharn/ARCHITECTURE.md)`; surfaced only — `/pharn-dev-build` is where
drift blocks) · **Step 1b lessons-declaration verdict (FLOOR):** **GREEN** — `applied_lessons: L2, L6,
L13, L25, L29, L34, L36, L41, L42, L43`, all 10 ids resolve in canon and are body-referenced.

> The Step 1b verdict is a deterministic exit code and is **never** folded into the concern counts below.
> Everything below is model-authored interrogation and **gates nothing** (fix #3).
>
> The PLAN under interrogation is `trust: untrusted`. Its prose is quoted below as DATA.

## Findings — axis: correctness of the derivation (inline Step 2)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/finding-backstop-class/PLAN.md:85"
  problem: "`slice-miss` is NOT fail-closed — a failed path join produces a confident-looking negative label instead of `unknown`, which is the exact failure the brief forbids."
  evidence: "| `slice-miss` | map names a scanner ∧ `basis: scanner-bound` ∧ path ∉ `slice` ∧ not errored | a verdict was recorded and this file was not in the slice |"

- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/finding-backstop-class/PLAN.md:82"
  problem: "The plan writes `bare path ∈ slice` without specifying how the bare path is derived, and `canonFile` keeps the `:line` it would have to strip — so the single most load-bearing step in the derivation is unspecified."
  evidence: "| `scanner-assigned` | map names a scanner ∧ record `basis: scanner-bound` ∧ bare path ∈ `slice` |"

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/finding-backstop-class/PLAN.md:155"
  problem: "A silently-missed `assignments.json` degrades every label to `unknown` with no operator signal, because stdout still prints only merged/inputs/dropped — a checker certifying by staying quiet."
  evidence: "add `--lens-map` / `--assignments`; correct the two stale path comments — layer floor"

- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/finding-backstop-class/PLAN.md:196"
  problem: "The render proof is specified as a human/model read, so nothing deterministic pins the rendered label — the one eval item in the list with no assertion behind it."
  evidence: "render proof → produce an actual `REVIEW.md` from the fixtures and read it. Grepping"
```

## Findings — axis: grillers (13 registered, read live via `count-grillers.mjs`)

Membership is FLOOR; running them is advisory. Applied over the plan's structure.

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/finding-backstop-class/PLAN.md:76"
  problem: "observability — the plan declares no stdout/stderr change, so the three degradation paths (absent record, unusable map, disagreement) are indistinguishable to an operator at the terminal."
  evidence: "Materialized as one exported frozen array `BACKSTOP_ENUM`, following the `BASIS_ENUM` precedent at"

- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/finding-backstop-class/PLAN.md:84"
  problem: "comprehension — three of five members share the `scanner-` stem, and two of those (`scanner-less`, `scanner-errored`) differ by one word while meaning opposite things about whether a scanner exists."
  evidence: "| `scanner-errored` | `(lens, file)` ∈ the record's `scanner_errors` | that lens's scanner produced **no verdict** for this file |"
```

**Griller axes with no finding, stated rather than omitted:** `testability` (Layer 1 PRESENT — `## Evals
to write (P1)` is non-empty, 12 items), `architecture` / `coupling` (P3 does not bite: `pharn/floor/` is
not in the layer tree, and the new dependency is a **data read** of an artifact, not a sibling import),
`security` / `privacy` (`## Trust audit (P2)` present; the record is consumed for enum-gated fields only
and no record free-text reaches the label), `documentation` (header-comment and guarantee-audit updates
declared), `error-handling` (every unusable input has a declared resolution), `migrations` (no consumer
reads `sources[]` today — `check-structural.mjs` reads the six scalars and ignores extras),
`performance` (two O(1) file reads; the slice lookup should be a `Set`, noted not filed), `a11y` / `i18n`
(no human-language or UI surface — honest n/a, not a pass).

## Summary

The plan's structure holds: the trigger is demonstrated rather than asserted, the enumeration is
materialized, the guarantee audit strikes the three claims that would be the disease, and the
`## Files` scope parses to exactly the five declared paths.

**One concern is blocking-severity and it inverts a requirement the brief states explicitly.** The brief
requires that "a missing map must never yield output that LOOKS labelled". The plan honors that for the
map and for an absent record, but **not** for the path join: if a lens emits a `file` in a base form
`canonFile` does not normalize — an absolute path, a `../` prefix, a backslash — the file will not be
found in `slice`, and the plan's table assigns `slice-miss`, whose rendered meaning is _"a verdict was
recorded and this file was not in the slice"_. That is a **confident negative manufactured by a failed
join**, and it is indistinguishable from a true scanner miss. `canonFile`'s own comment
(`pharn/floor/merge-findings.mjs:125-130`) declares those base forms out of its scope, so this is a
live gap, not a hypothetical one.

The remedy is a membership gate rather than a new state: derive `slice-miss` only when the file is
present in the record's own `target` array, and resolve to `unknown` when it is not — "the record does
not cover this file" is the honest reading of a failed join. This also makes the two `important`
findings converge: once `target` membership is the gate, the bare-path derivation (`:82`) must be
written down precisely, and the operator signal (`:155`) becomes the thing that tells a human the
degradation happened at all.

Two `minor` griller concerns are recorded and not pressed: the operator-signal gap is the same defect
as the `important` one seen from the observability axis, and the naming similarity is a real
comprehension cost with no clearly better vocabulary on offer.

**Nothing here blocks.** The Step 1b floor stop is GREEN; every finding above is judgment for the human
to weigh.

ADVISORY VERDICT: 6 concerns raised (1 blocking-severity, 5 advisory) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration verdict is reported in the header as its own floor
verdict and is not counted here.
