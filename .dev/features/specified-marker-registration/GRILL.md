# GRILL — specified-marker-registration

Plan: `.dev/features/specified-marker-registration/PLAN.md` · spec-hash check: **MATCH**
(`bed2c2a5…52e299` recomputed = the plan's `spec_content_hash`) · **Step 1b lessons-declaration
verdict (FLOOR): GREEN** — `pharn/floor/check-plan-lessons.mjs` exit 0; all 11 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. Griller membership read
deterministically: `node pharn/floor/count-grillers.mjs .` → `registered: 13`.

> The Step 1b verdict is a floor stop and is deliberately kept OUT of the concern tally below. It
> covers the DECLARATION only — never that the lessons were applied.

## Findings — guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/specified-marker-registration/PLAN.md:48"
  problem: "The plan closes the CROSS-ROW ambiguity it found but never states the GENERAL invariant that makes direction 2 work — every registered marker must occur EXACTLY ONCE in its site file — so a marker that is merely non-unique elsewhere would silently defeat the deletion check the plan claims as floor."
  evidence: "L36 — The presence set is made CLOSED, not per-member. THREAT-MODEL rows 65 and 69 carry the BYTE-IDENTICAL cell `content-hash _(specified; ships with the guarded surface)_`, so a per-row marker of just that cell would let one row's annotation be deleted while the other kept the check green."
```

**Why this is the sharpest concern.** `check-specified-markers.mjs` decides direction 2 with
`src.includes(site.marker)` — a **presence** test over the whole file. The plan correctly diagnoses
one instance (rows 65/69) and fixes it by lengthening those two markers. But the property that makes
ANY direction-2 check meaningful is uniqueness, and the plan asserts it for exactly the pair it was
looking at. That is [[L36]]'s defect one level up: a per-member remedy standing in for a closed
invariant, authored by someone who had just cited L36. The plan's own `## Evals to write` list
(`:91`) enumerates per-site deletion tests and no uniqueness assertion.

**Suggested remedy (for the human to weigh):** add a test that, for every site of every registered
primitive, counts occurrences of `site.marker` in the real doc and requires exactly 1. It ranges over
the whole manifest, not only the new entries, so it also retro-covers the four pre-existing ones.

## Findings — honest scope / no speculation (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/specified-marker-registration/PLAN.md:146"
  problem: "constitution-injection is the weakest of the four probes and the plan does not rank it: the constitution prefix is a PROMPT-level mechanism that could ship purely as a settings.json wiring entry or a command-level convention, creating no file whose NAME contains `inject`, so direction 1 for this entry may be permanently dark rather than merely narrow."
  evidence: "`rule_id-roster` probes `pharn/pharn-contracts/*roster*`; `constitution-injection` probes `.claude/hooks/*inject*`. Each follows the doc's own words about where the missing thing would live, and each misses an in-file implementation."
```

**Bounded, not fatal.** Direction 2 (the marker deleted while no injector exists) still fires for this
entry, and that is the direction the original F7 defect actually took. The entry is worth keeping; the
plan should simply not imply the four probes are of equal strength.

## Findings — discovery-first (P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/specified-marker-registration/PLAN.md:139"
  problem: "The plan presents ARCHITECTURE.md:304 as THE residual, but that site was found by a `roster` grep, not by the `ships with the guarded surface` anchor the plan credits for its sweep — so the stated method did not produce the stated result, and the reader cannot tell how much of the doc set the sweep actually reached."
  evidence: "2. **A residual this increment CANNOT fix.** `pharn/ARCHITECTURE.md:304` carries the unmarked twin of the `finding-shape.md:24` claim"
```

**The underlying truth is the checker's own stated bound,** and saying it plainly is better than
letting the sweep look exhaustive: a marker-anchored scan finds unguarded MARKERS. It cannot find an
unmarked OVERCLAIM — that is precisely what "the manifest cannot discover a new overclaim" means, and
`ARCHITECTURE.md:304` is an instance of the class the scan structurally misses, found only because a
second, differently-anchored grep happened to run.

## Axes interrogated with no finding

- **Eval coverage / structural-vs-semantic split (P1, `eval-format.md`)** — no `role:`-bearing
  capability is added, so P1's obligation does not attach; the apparatus obligation is the test suite,
  which the plan enumerates per direction and per site. Nothing is routed through a judge.
- **Trust propagation (P2)** — no untrusted artifact is ingested. Inputs are trusted repo files; doc
  bytes are compared, never parsed or executed. The plan's trust audit is accurate as written.
- **One axis of change / no sibling imports (P3)** — the contract edit exists solely to create the two
  marker sites the registration needs; that is one change, not two. The `.dev/` manifest referencing
  `pharn/` files points in the permitted direction (`.dev/` → `pharn/`), never the reverse.
- **Determinism (P5)** — the increment adds no branch. The checker's existing branches (filename
  existence, exact substring) stay deterministic; the tests branch on exit codes and parsed JSON.

## Grillers (advisory plug-in slot — 13 registered)

The 13 registered grillers interrogate a plan's **product-code** axes. This increment writes a JSON
manifest, a test file, a contract's prose and three repo-meta files — it ships no user-facing runtime
behavior — so `a11y`, `i18n`, `migrations`, `privacy`, `performance`, `security`, `observability`,
`error-handling` and `coupling` have no surface here and are recorded as **not applicable** rather
than run to a manufactured finding. `architecture`, `documentation`, `comprehension` and
`testability` are the axes with real surface, and their concerns are the three findings above
(P0 = testability's uniqueness gap; P7 and P6 = documentation/comprehension accuracy). No griller
finding is a gate (fix #3).

## Summary

The plan is unusually well-grounded: every probe was executed against the live tree, the spec pin
matches, and the lessons declaration is genuinely worked rather than decorative. The concerns are all
of one family — **the plan is slightly more confident than its mechanism**. It fixes the marker
ambiguity it found without stating the invariant that generalizes the fix (P0); it presents four
probes as equivalent when one is materially weaker (P7); and it credits one sweep method for a result
another method produced (P6). None blocks. All three are cheap to address inside the approved
`## Files`, and the first is worth a test rather than a sentence.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor) — for the
human to weigh before `/pharn-dev-build`. This verdict covers the INTERROGATION only; it is model
judgment and gates nothing. The Step 1b floor verdict is reported in the header and is not counted
here.
