# GRILL — coverage-record

**Plan:** `.dev/features/coverage-record/PLAN.md` · **Spec-hash:** MATCH
(`83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487`, recomputed via
`.dev/floor/hash-doc.mjs` — no drift; `/pharn-dev-build` is where drift blocks) ·
**Step 1b lessons-declaration (FLOOR):** **GREEN**, exit 0 — 13 cited ids all resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. Re-verified by this stage,
which did not author the field, and re-run inside the worktree. Per the checker's own note: this covers
the **declaration**, never the application.

**Griller membership (FLOOR):** `count-grillers.mjs` → **13 registered**. Deterministic plan-scanners run
over `PLAN.md`: `i18n` no hits · `migrations` no hits · `pii` no hits · `secrets` no hits ·
`observability` one hit (line 185, term "instrumentation") — inspected, it is the plan's own risk prose,
not an observability gap. No scanner-derived finding.

---

## Findings (ADVISORY — every one of these is model judgment and gates nothing)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: ".dev/features/coverage-record/PLAN.md:77"
  problem: "The emitter is specified to 'resolve the target' but the plan never says what it does on the command's THIRD resolution branch, whose terminal fallback is ask-the-human — which a deterministic emitter structurally cannot do."
  evidence: "`pharn/floor/render-review-assignments.mjs` — NEW. Deterministic emitter: resolves the target, runs `count-lenses.mjs`, runs each mapped scanner, writes `assignments.json`."

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/coverage-record/PLAN.md:84"
  problem: "The reconcile-ignore.json edit is filed under enumeration hygiene, understating it: the emitter writes assignments.json through Bash, so without that entry the reconciliation checker reports the artifact as an escape and the reconcile gate fails verify."
  evidence: '`pharn/floor/reconcile-ignore.json` — `pipeline_artifacts.names += "assignments.json"`, pinned set-equal to the above — layer pharn/floor'

- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/coverage-record/PLAN.md:159"
  problem: "The plan concedes the checker is near-vacuous over a deterministic emitter and then leaves the weaker justification standing; the stronger one — that the checker makes the record falsifiable by a consumer who did not run the emitter — is never stated, so the P7 case reads thinner than it is."
  evidence: "It earns its place through its test suite and as a regression detector if the emitter drifts."

- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/coverage-record/PLAN.md:117"
  problem: "I1 demands closure over the count-lenses registered set and I5 demands a scanner-bound basis name a scanner present in lens-scanner-map.json, but no behaviour is specified for a lens that is registered and absent from the map — the emitter has no defined fail-closed path."
  evidence: "**I5 — basis enum.** Each assignment's `basis ∈ {scanner-bound, whole-target-fallback}`, and a `scanner-bound` entry names a scanner present in `lens-scanner-map.json`."

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/coverage-record/PLAN.md:134"
  problem: "The section heading asserts P1 while its body argues P1 does not attach to this increment; a heading that claims a principle the text disclaims is the kind of mismatch a later reader resolves in the wrong direction."
  evidence: "## Evals to write (P1)"

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/coverage-record/PLAN.md:158"
  problem: "The L43 bound is stated for target-aptness only; the adjacent instance is unstated — a record whose slices AND unassigned_scanner_bound are fabricated CONSISTENTLY also passes every invariant, since I3 recomputes the difference from the record's own fields."
  evidence: '"The resolved target was the complete or correct set of files to review" → **ADVISORY** (L43). The checker certifies internal agreement, never the target''s aptness.'
```

## Summary

The plan's spine is sound and its honesty discipline is unusually tight for an increment of this kind:
the trigger is a real dogfood with sha256 evidence rather than a hypothetical, the `unassigned[]` →
`unassigned_scanner_bound[]` correction is a genuine L34 catch made during planning rather than after
review, and the Guarantee audit strikes the two claims that would have made the increment net-negative
("a lens read its slice", "/pharn-review reviewed these files").

The concerns cluster in one place: **the emitter's undefined edges**. Two findings (P5, lines 77 and 117)
are the same shape — the plan specifies the emitter's happy path precisely and its failure paths not at
all. That matters more here than usual, because a deterministic emitter's whole value is that its output
needs no trust; an emitter that silently produces an empty or partial record on an edge case hands the
checker something that passes I1–I6 while describing a review that did not happen. I4 catches the empty
target specifically, which is why line 77 is raised at blocking severity rather than higher — the
vacuity guard is the backstop, and it was already in the plan.

The reconcile finding (line 84) is the one most likely to bite during this increment's own
`/pharn-dev-verify` rather than later, and it is mis-filed rather than missing.

The two minor findings are wording, not mechanism.

**Nothing here contradicts the approved axis.** No finding asks for lens-membership, merge-key, lens-body
or finding-shape changes, and none argues for wiring the exit code to a gate.

## Verdict

**ADVISORY VERDICT: 6 concerns raised (1 blocking-severity, 3 important, 2 minor) — for the human to
weigh before `/pharn-dev-build`.**

The severities above are **LLM-assigned and advisory** (fix #3): none of them gates `/pharn-dev-build`,
and `blocking-severity` here means "I judge this the sharpest concern", never "the floor stops the
build". This verdict line covers the **interrogation only**. The Step 1b floor result is reported in the
header as its own verdict and is deliberately **not** folded into these counts — a deterministic stop and
a model-authored concern do not share a tally.
