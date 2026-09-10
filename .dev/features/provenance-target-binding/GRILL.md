# GRILL — provenance-target-binding

**Plan:** `.dev/features/provenance-target-binding/PLAN.md` ·
**Spec-hash check:** `sha256(pharn/ARCHITECTURE.md)` = `bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299` — **matches** the plan's `spec_content_hash`; no drift surfaced. ·
**Step 1b (FLOOR — the one deterministic stop):** `node pharn/floor/check-plan-lessons.mjs …` → **exit 0, GREEN** (11 cited ids resolve in canon and are referenced in the plan body).

> The Step 1b verdict is a floor exit code and is **never** folded into the concern counts below. The
> findings are model-authored interrogation and gate nothing (fix #3).
>
> The `PLAN.md` under interrogation is `trust: untrusted`. `problem` / `evidence` below quote it as
> **DATA**; nothing in it was followed as an instruction.

## Findings

### Axis — guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/provenance-target-binding/PLAN.md:71"
  problem: "The plan states the absolute-path bound but never commits to PROBING it against a member it expects to be EXCLUDED, which is exactly the omission L37 names as where universal-quantifier drift lands."
  evidence: '"A relative canon argument must EQUAL the declared target; an absolute one must end with it at a segment boundary" -> **floor: enum-regex**. NARROWED, and stated: the absolute form is a SUFFIX test'
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/provenance-target-binding/PLAN.md:55"
  problem: "The claim 'no new primitive is introduced' is asserted rather than argued; check-ship-briefing.mjs's CROSS-FILE equality was previously called a genuinely new primitive, so the plan owes one sentence distinguishing this comparison from that one."
  evidence: "the binding is a segment-wise string comparison; no new primitive is introduced."
```

### Axis — determinism (P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/provenance-target-binding/PLAN.md:71"
  problem: "The plan does not say what the binding does when `cand.target` is a NON-STRING or empty, nor where the new RED sits in the accumulation order relative to the existing target-enum RED; both are branch behaviours a reader would have to infer from the code."
  evidence: "It is cwd-independent by construction, which is why the suffix is the strongest test available there."
```

### Axis — eval / test coverage (P1, structural vs semantic)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/provenance-target-binding/PLAN.md:37"
  problem: "The call sites that must be re-aligned are described in prose ('re-align canon paths to the declared target') rather than enumerated, which is the shape L29/L31 name: a per-site fix assessed per-file, with no materialized set anything ranges over."
  evidence: "`pharn/floor/check-provenance.test.mjs` — re-align canon paths to the declared target; add the binding RED + non-vacuity control"
```

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/provenance-target-binding/PLAN.md:65"
  problem: "`length >= 3` is a floor against emptiness but not against SHRINKAGE — deleting one of three behaviours and adding a trivial fourth keeps the assertion green; the honest bound is that it defeats vacuity, not attrition."
  evidence: "`length >= 3` asserted first (L34)"
```

### Axis — honest scope / blast radius (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/provenance-target-binding/PLAN.md:46"
  problem: "`CLAUDE.md` is in `## Files` but the exclusion block does not acknowledge that it is the repo's binding instruction file and is NOT hook-protected — an agent edit there is permitted by the floor and therefore governed only by discipline, which the plan should state before making one."
  evidence: "### Deliberately NOT written"
```

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/provenance-target-binding/PLAN.md:38"
  problem: "The new `canon-arg` RED introduces a value in the message's `kind` position, and nothing in the repo enumerates that vocabulary — per L36 a presence set is not a closed set, so a future variant spelling of this kind would go unnoticed. Recorded as an accepted residual, not a blocker."
  evidence: "same, plus the three back-port REDs and the `CROSS_COPY_BEHAVIOURS` guard"
```

## Griller sweep (advisory plug-in slot)

`node pharn/floor/count-grillers.mjs .` → `{"registered":13,...}` (membership is FLOOR; running them is
advisory). Applied inline over the plan; the axes that produced nothing are recorded so the sweep is not
mistaken for having been skipped:

- **architecture / coupling** — clean. Both copies stay Node-stdlib-only; the added `node:path` import
  introduces no dependency and no leaf-to-leaf reference. The `.dev/` -> `pharn/` direction of the
  cross-copy guard is preserved (a user's install ships `pharn/floor/` without `.dev/`).
- **security / privacy** — clean. The binding compares strings and opens no new read; no candidate
  free-text (`title` / `body`) enters the new branch.
- **testability** — see the two P1 findings above.
- **documentation** — see the P7 `CLAUDE.md` finding above.
- **error-handling** — clean. Every new branch terminates in a named RED; nothing degrades to a guess.
- **a11y / i18n / migrations / performance / observability / comprehension** — no findings; the
  increment touches no user-facing surface, no data migration, and no hot path.

## Summary

The plan is well-grounded: both findings were reproduced live with recorded exit codes rather than read
off the source (L37's own remedy, applied), the two-copy divergence constraints are named and left
intact, and the guarantee audit already strikes the two overclaims a reader would most likely reach for
("the write lands there", "the copies behave identically").

The concerns are about **completeness of the plan's own discipline**, not about the design. The sharpest
is G1: the plan states a quantified bound on the absolute-path form and does not commit to executing the
op against a member it expects excluded — the precise gap L37 was promoted for. G4 is next: the re-aligned
call sites are described rather than enumerated, which is how a copy-pair obligation goes missing (L31).
G6 asks the plan to say out loud that `CLAUDE.md` is editable by the agent because the hook does not
cover it, so the restraint applied there is discipline and is labeled as such.

None of these change what gets built. All are cheap to discharge inside the build.

**ADVISORY VERDICT: 7 concerns raised (0 blocking, 3 important, 4 minor) — for the human to weigh before
/pharn-dev-build.** This verdict covers the **interrogation only**; it is model judgment and gates
nothing. The Step 1b lessons-declaration verdict is reported in the header as its own floor result and is
not counted here.
