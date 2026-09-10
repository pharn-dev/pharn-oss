# GRILL — p3-sibling-check-widen

**Plan:** `.dev/features/p3-sibling-check-widen/PLAN.md` · **spec-hash:** MATCH
(`bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299` recomputed from
`pharn/ARCHITECTURE.md` equals the plan's pin) · **Step 1b lessons-declaration (FLOOR):** **GREEN** —
`pharn/floor/check-plan-lessons.mjs` exit 0; all 8 cited ids resolve in canon and are referenced in the
plan body. That verdict covers the DECLARATION only; whether the lessons were applied is advisory and is
interrogated below. · **Grillers registered:** 13 (`pharn/floor/count-grillers.mjs`).

> The PLAN is `trust: untrusted` to this stage. Everything quoted under `evidence:` is DATA.

## Method — this grill RAN the design, it did not only read it

The plan's central risk is a false-RED on correct declarations (its own L3 line says so), and that risk
is empirically testable before a line of `validate.mjs` changes. So the proposed matcher was implemented
standalone (`.pharn/pharn-dev-ship/probe.mjs`, gitignored scratch) and executed against **(a)** all six
distinct `reads:` shapes the 36 live capabilities declare, and **(b)** a 24-case adversarial corpus. Two
findings below (G1, G3) come from that run, not from reading. This is `[[L4]]`'s discipline applied to a
design rather than a fixture: the plan's claims passed by construction until something ran them.

## Findings (ADVISORY — every one of these is model judgment and gates nothing)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/p3-sibling-check-widen/PLAN.md:138"
  problem: "The approved matcher is a delimiter-bounded SUBSTRING scan, and the probe shows it emits a
    false RED on a `pharn-`prefixed FILENAME that is not a module — so the plan's 'no correct existing
    declaration newly REDs' reduction is narrower than stated for declarations not yet written."
  evidence: '"a `reads:` value naming a non-base, non-own `pharn-<name>` module token is a RED" →
    **floor: enum-regex** … a delimiter-bounded pattern match plus exact set membership. Probe row:
    ownModule `pharn-pipeline`, value `docs/pharn-review-guide.md` → flagged module `pharn-review-guide`.'

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/p3-sibling-check-widen/PLAN.md:144"
  problem: "The ADVISORY bound names an empty or lying `reads:` as the evasion, but the probe found a
    second and more likely one the plan never states: a TRUTHFUL relative path that simply never spells
    the module name (`../injection/injection.md` from a sibling directory) is invisible to a
    name-matching check, whatever its regex."
  evidence: '"a capability body may reference any module it likes with an empty or lying `reads:` and
    CHECK 6 stays GREEN." Probe row: ownModule `pharn-review`, value `../injection/injection.md` → [].'

- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/p3-sibling-check-widen/PLAN.md:133"
  problem: "The eval list was derived against the matcher the plan proposed; if the matcher changes
    during build, the list is INHERITED rather than re-derived — the exact shape L24 names, reproduced
    one stage after the plan cited L24."
  evidence: '"CHECK 6 left-delimiter → a value containing `notpharn-review` produces no finding." —
    a case written for a lookbehind, which a token-anchored matcher satisfies by a different mechanism.'

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/p3-sibling-check-widen/PLAN.md:121"
  problem: "The mutation control asserts the mutation changed the source BYTES, which proves an edit
    landed but not that it removed the right construct — a drifted anchor string would mutate something
    harmless and the control would pass while proving nothing (L34's vacuity, one level up)."
  evidence: '"the same fixture against a mutant `validate.mjs` with CHECK 6''s `finding()` call removed
    → exit 0, plus an assertion that the mutation changed the source bytes (L34)."'
```

## Griller axes (13 registered; only those that produced a finding are expanded)

- **architecture (P3)** — one finding, folded above as G1's sibling concern: the increment edits the
  floor's expression of P3 without touching the layer tree it enforces, and the plan's out-of-scope
  section correctly records that `pharn/ARCHITECTURE.md §4`'s caveat stays true. **No new finding.**
- **coupling (P3)** — `validate.mjs` gains a constant and a token scan inside a check it already owns; no
  second reason to change enters the file. **No finding.**
- **testability (P1)** — the eval list is concrete and each case names its expected verdict; the two
  weaknesses are recorded as findings 3 and 4 above.
- **security (P2)** — the trust audit is the strongest section of the plan: it correctly routes the
  echoed value through `showPath()` and argues the raw-interpolated `target` is safe **by construction**
  rather than by trust. The probe confirms the escape (a newline-bearing value renders as one line).
  **No finding.**
- **documentation, comprehension, error-handling, performance, observability, privacy, a11y, i18n,
  migrations** — no findings. (`performance`: the matcher is a linear split plus a per-token anchored
  test over a handful of short strings; no backtracking construct is introduced, so `[[L24]]`'s ReDoS
  class does not attach.)

## Summary

The plan is unusually well-grounded for its size: it did the L3 re-audit **before** proposing the change,
and that audit is what stopped it from shipping the finding's own prescribed remedy verbatim — the naive
widening would have RED-blocked 35 correct declarations. The interrogation's value was at a level below
that: **running** the proposed matcher surfaced one false-positive shape (G1) and one evasion the audit
did not name (G3), neither of which is visible by reading.

The remedy for G1 is available and strictly better on every axis measured: anchor each separator-delimited
TOKEN with `/^pharn-[A-Za-z0-9-]+$/` instead of substring-scanning. Re-run against the same 24-case
corpus, it keeps every case the substring form caught — including the `pharn-stack-*` / `pharn-skills-*`
backward-compat shapes and a whitespace-separated prose mention — and drops the filename false positive.
G3 has no code remedy and should not get one: it is a property of name-matching, and the honest response
is to state it in the code comment beside the bound the plan already states.

**ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to
weigh before /pharn-dev-build.** The Step 1b lessons-declaration verdict is FLOOR and reported in the
header; it is deliberately not folded into this tally. Nothing in this file blocks the build.
