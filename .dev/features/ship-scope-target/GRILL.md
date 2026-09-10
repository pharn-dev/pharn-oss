# GRILL — ship-scope-target

**Plan:** `.dev/features/ship-scope-target/PLAN.md` · **spec-hash check:** MATCH
(`69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e` recomputed live from
`pharn/ARCHITECTURE.md` via `.dev/floor/hash-doc.mjs`, equal to the plan's pin — no drift, fix #4) ·
**Step 1b lessons-declaration verdict (FLOOR):** **GREEN**, exit 0 —
`GREEN — applied_lessons: L2, L3, L4, L8, L19, L20, L22, L25, L29, L31, L33, L34, L35, L36; all 14 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body.`

> The Step 1b verdict is this stage's **only** deterministic stop. It is reported here as its own floor
> verdict and is **never** folded into the concern counts below — a deterministic stop and a
> model-authored concern must not share a tally. The findings below are **advisory** and gate nothing.

## Findings

```yaml
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: ".dev/features/ship-scope-target/PLAN.md:145"
  problem: "Rule B as stated would RED two CORRECT commands — it converts an existing correct declaration into a block, which is the exact L3 failure the plan's own body claims to avoid."
  evidence: "**Rule B — every placeholder-bearing `writes:` path appears as a `--target` in the same command.**"

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/ship-scope-target/PLAN.md:183"
  problem: "The bullet claims 'at any instant the active scope is one path' as FLOOR, but that state depends on the command's ADVISORY prose ordering actually running the setter; only the deny-given-a-scope half reduces to the hook."
  evidence: '"each of the four writes is scoped to exactly that one path at the moment it happens" → **floor: hook**, same primitive. It is **stricter** than the bullet above: at any instant the active scope is one path'

- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/ship-scope-target/PLAN.md:31"
  problem: "The P7 trigger leans on L20's 'second occurrence' bar, but L8's canon entry records its first instance as AVOIDED-not-hit, so /pharn-ship is the FIRST observed hit and that bar is arguably unmet; the sufficient trigger is the observed CRIT itself."
  evidence: "L20 — L8 shipped with a **discipline-only** remedy … `/pharn-ship` is the second occurrence, so L20's trigger has fired"

- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/ship-scope-target/PLAN.md:70"
  problem: "The increment carries two arguable axes of change — correcting a command's procedure, and adding corpus rules to a test file — bundled in one plan."
  evidence: "`.claude/commands/pharn-ship.md` … `.dev/floor/command-hygiene.test.mjs` — two new corpus rules"

- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/ship-scope-target/PLAN.md:125"
  problem: "Every prose-correction site is cited by LINE NUMBER in the very file the increment edits, so the first edit invalidates the remaining three citations."
  evidence: '- `:266-267` — "covered by **one** call, since no `--target` narrows it"'
```

## G1 — the blocking one, reproduced live rather than reasoned

Rule B says: _every placeholder-bearing `writes:` path appears as a `--target` in the same command_,
with membership = `contains <` ∧ `contains /` ∧ `no whitespace`. Applying that predicate to the **live**
corpus this run:

| command                       | qualifying `writes:` entries    | `--target` values it actually passes |
| ----------------------------- | ------------------------------- | ------------------------------------ |
| `pharn-memory-promote.md`     | `memory-bank/<canon-file>`      | `<canon-file>`                       |
| `pharn-dev-memory-promote.md` | `.dev/memory-bank/<canon-file>` | `<canon-file>`                       |

Both commands are **correct**: `<canon-file>` is an operator placeholder the human substitutes at run
time (the real invocation is `--target memory-bank/lessons-learned.md`, which `resolveEntry`'s
placeholder regex `memory-bank/[^/]+` then matches). Rule B as written would RED both — a false positive
on two commands that do exactly the right thing. That is the defect the plan cites **L3** to avoid, three
sections above the rule that reintroduces it.

**Remedy, verified live:** restrict Rule B's domain to commands declaring **≥2** qualifying entries.
That is not an exemption invented to dodge the failure — it is **L8's own stated domain**: _"A command
that emits **≥2** artifacts under placeholder paths therefore cannot scope them all in a single setter
call."_ A single-artifact command has no such obligation and may legitimately document a bare
placeholder target. Re-run over the live corpus with the `≥2` filter:

| command                | qualifying entries | distinct `--target`s | verdict                                                      |
| ---------------------- | ------------------ | -------------------- | ------------------------------------------------------------ |
| `pharn-dev-regress.md` | 2                  | 2                    | OK                                                           |
| `pharn-dev-verify.md`  | 2                  | 2                    | OK                                                           |
| `pharn-regress.md`     | 2                  | 2                    | OK                                                           |
| `pharn-verify.md`      | 2                  | 2                    | OK                                                           |
| `pharn-ship.md`        | 3                  | 0                    | **MISSING all three** — the defect under repair, and only it |

A **5-member, non-vacuous** domain (L34 satisfied by construction rather than by an added assertion), in
which `pharn-ship.md` is the sole offender. The corrected rule still closes the L36 gap the plan
identified: a one-call fix passing only `--target features/<name>/SHIP.md` would leave two of three
entries missing and still RED.

## G2 — the two clocks, one bullet short

The hook is genuinely floor: **given** an active scope, a write outside it is denied, every time, by a
non-LLM program. What is **not** floor is that the intended scope is active when each write happens —
that depends on the command's prose being followed, and command prose is advisory orchestration by the
command's own admission. The plan already draws this split correctly for Rule B ("ordering stays
advisory command prose") and then does not draw it for the hook bullet. Split it the same way.

## G3 — the trigger, stated the way this repo states triggers

`L8`'s provenance says, verbatim: _"Honest trigger (P7): the constraint was learned at design time and
the sidecar friction was **AVOIDED, not hit** — surfaced by reading `set-writes-scope.cjs` live, not by a
dogfood failure."_ So the count of **observed failures** before this increment is **zero**, not one, and
`L20`'s "the second occurrence is the trigger" bar is not obviously met. This matters because the repo
has an explicit precedent for refusing a manufactured trigger: `CLAUDE.md` records that
`check-plan-lessons` sub-check (D) "answered no observed failure … it was added at the maintainer's
explicit direction (P5), and this comment says so rather than inventing a trigger."

The increment does not need L20. P7's own bar — _"an addition is triggered by a real failure"_ — is met
directly and abundantly: an external adversarial review reported a CRIT, and this run reproduced the
`exit 1` / no-scope-written behaviour live. Lead with that; keep L20 as corroboration, explicitly marked
arguable.

## G4 / G5 — the two minor ones

**G4 (P3).** Fix-plus-enumeration in one increment is what L20 and L29 jointly prescribe, and the repo
has done it before (`deny-message-phantom-commands`, `build-step2b-lint`). Raised for the human's eye,
not as an objection.

**G5 (P6).** The build must locate each prose site by its **text**, never by the plan's line numbers —
editing site 1 shifts sites 2–4. A mechanical note, but the kind that silently produces a wrong edit.

## Griller sweep (advisory plug-in slot; membership is FLOOR)

`node pharn/floor/count-grillers.mjs .` → `{"registered":13}`. The five grillers carrying deterministic
plan-scanners were run over `PLAN.md`; all five report no hits, which is correct for an increment that
touches command prose and a test file and no user-facing surface:

| scanner                       | result                         | exit |
| ----------------------------- | ------------------------------ | ---- |
| `scan-plan-i18n.mjs`          | `{"found":false,"hits":[]}`    | 0    |
| `scan-plan-migrations.mjs`    | `{"mentions":false,"hits":[]}` | 0    |
| `scan-plan-observability.mjs` | `{"mentions":false,"hits":[]}` | 0    |
| `scan-plan-pii.mjs`           | `{"found":false,"hits":[]}`    | 0    |
| `scan-plan-secrets.mjs`       | `{"found":false,"hits":[]}`    | 0    |

The remaining eight registered grillers (`a11y`, `architecture`, `comprehension`, `coupling`,
`documentation`, `error-handling`, `performance`, `testability`) were applied inline. Only two produced
anything, and both are already carried above rather than duplicated: `architecture` → G4 (the two-axes
question), `testability` → G1 (a rule whose domain was never enumerated against the live corpus is a rule
nobody has tested). `a11y`, `coupling`, `error-handling`, `i18n`, `migrations`, `observability`,
`performance` and `privacy` do not trigger on a plan that adds no user-facing surface, no runtime code
path, and no data handling.

## Summary

The plan is well-grounded — every load-bearing claim about the defect was re-derived live, and the
lessons declaration is unusually dense and genuinely load-bearing rather than decorative. Two things
need to change before build, and one of them would have failed the build:

1. **Rule B's domain is wrong as written** and would RED `/pharn-memory-promote` and
   `/pharn-dev-memory-promote`, two correct commands. The `≥2`-entry restriction fixes it and is L8's own
   domain, not an invented carve-out. **This is the finding worth stopping for.**
2. **Two honesty edges** — a floor claim that quietly annexes advisory sequencing (G2), and a P7 trigger
   that leans on a bar L8's own text says was never met (G3). Neither breaks anything; both are the exact
   class of overstatement this repo exists to prevent, and both are cheap to correct in the artifact.

Note what the grill could **not** do: nothing here tested whether the four corrected prose sites will be
_true_ after the build, or whether the setter calls will be placed immediately before their writes.
Nothing reads command prose for truth — `validate.mjs` ignores `.claude/commands/` (confirmed live at
`pharn/floor/validate.mjs:29`), and the new rules read invocation lines, not claims. That residual is the
plan's own, correctly stated, and this stage does not narrow it.

**ADVISORY VERDICT: 5 concerns raised (1 blocking-severity, 2 important, 2 minor) — for the human to
weigh before `/pharn-dev-build`.** The severities are model-assigned and gate nothing; the only
deterministic verdict in this run is the Step 1b GREEN reported in the header.
