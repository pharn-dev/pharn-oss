# GRILL — skills-version-recorded

**Plan:** `.dev/features/skills-version-recorded/PLAN.md` · **Spec-hash check:** recomputed
`bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299` == the plan's `spec_content_hash`
(no drift; surfaced only — `/pharn-dev-build` is where drift blocks) · **Step 1b lessons-declaration
verdict (FLOOR — the one deterministic stop):** **GREEN**, exit 0 — all 13 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body.

> The Step 1b verdict is a floor exit code and is deliberately **not** folded into the concern counts
> below. Everything below it is model-authored interrogation and gates nothing.

## Deterministic griller sub-checks (membership is FLOOR; running them is advisory)

`node pharn/floor/count-grillers.mjs .` → `{"registered":13}`. The five plan scanners were executed
against this plan:

| scanner                       | result                                                                      |
| ----------------------------- | --------------------------------------------------------------------------- |
| `scan-plan-secrets.mjs`       | `{"found":false,"hits":[]}` — exit 0                                        |
| `scan-plan-pii.mjs`           | `{"found":false,"hits":[]}` — exit 0                                        |
| `scan-plan-i18n.mjs`          | `{"found":false,"hits":[]}` — exit 0                                        |
| `scan-plan-migrations.mjs`    | `{"mentions":true,...}` — hit is `reversible` (prose), no migration planned |
| `scan-plan-observability.mjs` | `{"mentions":true,...}` — hit is `tracing` (prose), no telemetry planned    |

The two `mentions:true` results are scanner false positives on ordinary English words and are recorded
rather than suppressed. The remaining eight grillers' axes (a11y, comprehension, coupling,
documentation, error-handling, performance, security, testability) were applied **inline** — the
isolated per-griller runner is deferred (P7). Four of them have **no purchase** on this increment and
that is stated rather than faked: a11y, i18n, migrations and privacy have no UI, no locale, no schema
and no personal data anywhere in a Node CLI checker that reads two repo files.

## Findings

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/skills-version-recorded/PLAN.md:83"
  problem: "The plan asserts a NEGATIVE about the generated doc regions that it did not measure — that no
    docs/ region needs regeneration — and an unmeasured negative is exactly the class P6 forbids; the
    generated README inventory is a plausible consumer of a newly added floor checker."
  evidence: "`docs/lessons-index.md`, `docs/capabilities/**` — generated regions; no capability, contract,
    command, hook or **product**-floor checker changes ... so `npm run docs:generate` has nothing to
    regenerate."
```

**Resolved during the grill, and the resolution is the point.** Measured live rather than argued: the
generated inventory's floor-checker line counts, in its own words, fifty `.mjs` files **under
`pharn/floor/`** with tests excluded, and `capability-catalog-core.mjs:381` comments its counter the same
way. A `.dev/floor/` checker is **outside** that walk, so the count does not
move. The plan's conclusion is correct; its **method** was not. The build must run `npm run docs:check`
and record its exit code as the confirming probe (already planned as P-check, now load-bearing).

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/skills-version-recorded/PLAN.md:158"
  problem: "The trust audit says no untrusted input is ingested, but the plan's own design decision (2)
    has the UNRECORDED message quote NEAR-MISS CONTEXT out of CHANGELOG.md — and on a fork or an outside
    contributor's PR, CHANGELOG.md is attacker-influenced text that would then reach stdout."
  evidence: "No untrusted third-party input is ingested; taint reaches no gate."
```

The claim is true of the **gate** (no branch reads CHANGELOG prose) and false of the **output**. The
build must therefore: emit any near-miss context through `JSON.stringify` (never raw), **cap its
length**, and cap the number of near-misses reported. Without the cap a crafted CHANGELOG could flood a
terminal or smuggle an ESC sequence — the `check-version-badge` ESC test exists for exactly this and
must be mirrored here on the **CHANGELOG** side, not only the version side.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/skills-version-recorded/PLAN.md:180"
  problem: "'Pinned to agree on every shared constant' would overstate what the pin test proves: textual
    equality of two regex sources is not agreement about what a valid SKILLS_VERSION is, and the two
    checkers deliberately DIVERGE — check-version-badge has an UNSUPPORTED hyphen refusal this checker
    does not."
  evidence: "So: copy, and pin the pair by ✧ test — the `check-provenance` precedent, and the L31 remedy
    (something must RANGE OVER the pair)."
```

The `check-provenance` precedent the plan cites asserts **both** halves — shared constants AGREE **and**
the deliberately-divergent ones DIFFER — and the plan cites only the first. Fold in: the pin test must
also record that this checker has **no** `UNSUPPORTED` state, and **why** that is not a hole — a
hyphen-bearing version is already rejected by the shared `VERSION_RE`, so both checkers RED on a
pre-release; only the refusal's NAME differs. State it, or a reader infers the hyphen case is unhandled.

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/skills-version-recorded/PLAN.md:105"
  problem: "The near-miss cases assert the checker REDs, but nothing asserts that the boundary rule is
    what makes them RED — so a bare-substring implementation regression would be caught only by accident,
    and the design decision that justifies the whole anchor is untested."
  evidence: "✧ `UNRECORDED` on a NEAR MISS → exit 1, **naming the near miss**: `3.0.20` present, `3.0.2`
    not; `13.0.2` present; `3.0.2.1` present; `v3.0.2` present."
```

Fold in a **mutation assertion**: for each near-miss fixture, assert that the naive predicate
`changelog.includes(version)` is `true` **while** the checker exits 1. That makes the boundary rule's
value falsifiable rather than asserted — L4's discipline applied to a design decision instead of to a
fixture.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/skills-version-recorded/PLAN.md:120"
  problem: "Three test files will now hard-code the same ci.yml `if:` guard string with nothing ranging
    over them — the L31/L36 shape the plan itself cites, reproduced by this increment."
  evidence: "`ci.yml` contains a step whose `run:` is `npm run check:changelog` and whose `if:` is the
    sibling install-gate."
```

**Not fixed here, deliberately (P7).** Extracting a shared `ciStepFor(gate)` helper would edit two
working test files for a second axis of change with no triggering failure — the guard string has never
drifted. Recorded as the named residual `ci-if-guard-enumeration`, to be built on the first occurrence,
per the L20 bar the rest of this increment is held to. Naming it is the deliverable; building it is not.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/skills-version-recorded/PLAN.md:130"
  problem: "'No input state is GREEN by default' is a universal quantifier over inputs, and L37 says that
    is precisely the fragment a careful reading does not check — the plan reasons it rather than
    executing the excluded members."
  evidence: '"no input state is GREEN by default" → **floor: enum-regex.** Six named refusal states.'
```

The build must **execute** the awkward members and record exit codes, not argue them: `SKILLS_VERSION`
is a **directory**; `CHANGELOG.md` is a **directory**; a zero-byte `CHANGELOG.md`; a whitespace-only
`CHANGELOG.md`; and the empty-needle case asserted directly on the pure function. Each must be exit 1 or
a named refusal, never a crash and never GREEN.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/skills-version-recorded/PLAN.md:72"
  problem: "The script name `check:changelog` names the DOCUMENT, not the property checked, so a future
    second changelog gate has no name left and this one reads broader than it is."
  evidence: "`package.json` — add `check:changelog` and chain it in `scripts.check` — layer none (repo-meta)"
```

Raised for the human rather than decided by the griller. The counter-argument is the live precedent:
`check:contributing` also names its document, and consistency across the three sibling gates has value.
**Recommendation: keep `check:changelog`**, and let the checker's own name
(`check-skills-version-recorded.mjs`) carry the precision — the gate id is a menu label, the file name is
the claim.

## Summary

The plan is unusually well-grounded — every design decision is backed by an executed probe, and the L35
question ("must the second copy exist?") is asked **before** L20's escalation is applied rather than
after, which is the ordering L35 exists to enforce. The concerns are concentrated in two places, and both
are the same shape: **a negative asserted by reasoning where the repo's own lessons demand execution**
(G1's docs claim, G6's universal quantifier) and **a bound stated in one direction only** (G2's trust
audit is true of the gate and false of the output; G3's pin cites agreement without its deliberate
divergence). G4 is the most valuable to fold in: without a mutation assertion, the boundary rule — the
single design decision the whole increment turns on — has no test that fails if it is removed.

Nothing here reaches the plan's `## Open questions (HALT)`; G7 is a naming preference with a
recommendation attached.

**ADVISORY VERDICT: 7 concerns raised (0 blocking, 4 important, 3 minor) — for the human to weigh before
/pharn-dev-build.** This is an interrogation, not a gate: none of it blocks, and none of it means the
plan is good. The only floor-grade result in this run is the Step 1b GREEN in the header, which covers
the **declaration** of `applied_lessons` and says nothing about whether those lessons were applied.
