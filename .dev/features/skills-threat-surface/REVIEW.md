# REVIEW — skills-threat-surface

**Floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities. The increment
reached review with a green floor, as required. Everything below the floor line is **advisory**.

**Under review:** the four artifacts `/pharn-dev-build` wrote —
`proposed/THREAT-MODEL.md.patch` (3 hunks), `proposed/LIMITS.md.patch` (2 hunks),
`proposed/specified-primitives.json.patch` (1 hunk), `proposed/APPLY.md`.

---

## Floor-gate findings (blocking)

**None.** No guarantee in the built artifacts lacks a floor reduction or an `advisory` label; no
Capability or `rule_id` was added, so P1 has no binding to check (the floor agrees — `validate`
counted 36 capabilities, unchanged); no sibling reference was introduced.

---

## Advisory findings

### F1 — the `§5` repair reintroduces the defect class it was written to fix

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/skills-threat-surface/proposed/THREAT-MODEL.md.patch:52"
  problem: "The hunk retracts the false count 'the one residual' and replaces it with a NEW count claim — 'There are two such places' — which is the same universal-quantifier shape that just went stale, and which nothing in the repo can detect going stale again."
  evidence: "**There are two such places, and this section names both.**"
```

This is the increment's sharpest self-inflicted issue, and it was found by reading the patch against
the lesson that motivated it. **L37**: universal quantifiers are the fragment a careful reading does
not check. **L33**: nothing reads shipped prose, so the transition from true to false is undetected.
The repair moved the quantifier correctly — "one" → "two" is accurate **today** — but a third residual
makes the new sentence false exactly as the old one became false, and `LIMITS.md` now mirrors the new
count too (`one of two`), so the same two-file mirror is rebuilt at the new value.

**It is not obviously avoidable, which is why this is `important` and not `blocking`.** Any statement of
a count is a quantifier. The cheap mitigation is to make the claim **open**: "at least two", or "these
two", or "the residuals named here" — phrasings that stay true when a third is added, at the cost of
sounding less precise. The human should weigh precision against staleness; both options are honest,
and the current wording is the more brittle of the two.

### F2 — "every lens subagent" states an advisory orchestration step as a fact

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/skills-threat-surface/proposed/THREAT-MODEL.md.patch:11"
  problem: "The new §2 item 8 says /pharn-review hands the SKILL.md files to 'every' lens subagent, but that is command prescription, not a floor-forced property — the same command states that nothing forces every lens to run."
  evidence: "`/pharn-review` hands them to **every** lens subagent."
```

Checked against the source rather than asserted: `pharn-review.md:187-190` does instruct that each lens
subagent receive the files, but `:197-198` states plainly that **"nothing on the floor forces parallelism
or forces every lens to run — this is advisory."** So "every" is true of the written procedure and not of
any run. In a **threat model**, that distinction matters in the dangerous direction: it makes the exposure
sound uniformly distributed when it is actually whatever the orchestrator did that run.

The fix is small — "hands them to each lens subagent it spawns" — and preserves the point (the channel
reaches lens judgment broadly) without implying a guarantee.

### F3 — the `§1a` citation covers Capabilities, not `.claude/skills/`

```yaml
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".dev/features/skills-threat-surface/proposed/THREAT-MODEL.md.patch:9"
  problem: "The new text cites LIMITS.md §1a for the claim that a dropped SKILL.md is executable input, but §1a's own text is scoped to a Capability body and never mentions installed skills."
  evidence: "Same delivery mechanism as 6 — markdown is executable (`LIMITS.md §1a`)"
```

`§1a` reads _"A Capability body is instructions an LLM executes. A community Capability — pure markdown,
zero `.cjs` — is a prompt-injection delivery mechanism by design."_ A reader following the cite finds
text about Capabilities and must make the generalization themselves.

**Precedent exists and argues for leaving it:** `scan-installed-skills.mjs:21` already cites `§1a` for
exactly this file class, so the new text is **consistent** with the shipped code rather than inventing a
stretch. Recorded as minor because the alternative — widening `§1a` — is a `LIMITS.md` content change
that **D3 deliberately excluded**, and doing it here would reopen a settled decision on review's say-so.

---

## Lens-by-lens

- **L-floor → P0.** No unreduced guarantee found. `APPLY.md`'s strongest claims are all exit-code
  backed (`git apply --check` exit 0; the prettier check; the JSON parse) and its **absences are stated
  as absences** — the "post-apply `check:markers` GREEN was never executed" paragraph is the increment
  doing P0 correctly on itself. The `§3` row's Floor cell carries its hedge inline
  (`ENUMERATION ONLY … GATES NOTHING … No primitive is specified or planned`) and correctly omits the
  `_(specified; ships with the guarded surface)_` marker. F1/F2 are the two places wording outruns what
  is true.
- **L-eval → P1.** No `role:`-bearing file, no `enforces`, no `rule_id` — nothing to bind. Floor and
  lens **agree**: `validate` GREEN with an unchanged capability count confirms no capability-without-eval
  was introduced. No finding.
- **L-trust → P2.** The increment ingests **no** untrusted artifact — probed, `count:0`, this repo has no
  `.claude/skills/`. Its inputs are trusted docs, trusted command files and a repo JSON. No
  instruction-looking content in any reviewed artifact altered this review's behavior, and none was
  present to. The patches propagate no taint: they add prose to trusted docs and one hand-written
  manifest entry. Worth stating because the increment is _about_ an untrusted channel: it **describes**
  one without **opening** one. No finding.
- **L-axis → P3.** One axis per artifact: each patch changes one file for one reason (`THREAT-MODEL.md`
  = model the surface; `LIMITS.md` = retract the count; the manifest = register the citation), and
  `APPLY.md`'s single axis is "how a human applies this". No sibling reference: `THREAT-MODEL.md` is a
  root doc, not a `pharn/pharn-*` module, so its cites to `.claude/commands/pharn-review.md` and
  `pharn/floor/lens-scanner-map.json` are not leaf→leaf module references. No finding.

---

## An observation about this run's input (not a finding against the increment)

The invoking brief arrived **truncated in two places** —
`── SHAPE OF THE INCREMENT ────────────────────olumns.` and a trailing
`cut it and leav or state explicitly why \`none\`.` Both were interpreted from surrounding context
rather than halted on, because the intent was recoverable and the ambiguity did not reach a decision
(P6's halt bar). Recorded because a truncated instruction block is, in principle, a place where content
could be lost or hidden, and silently smoothing over it is how that stops being noticeable.

---

## Proposed lesson candidate (NOT promoted — `/pharn-dev-review` cannot write canon)

**Candidate A — "Retracting a false quantifier by substituting a new count rebuilds the defect at the
new value."**

- **The failure, observed in this increment at range zero.** The increment's own grill finding F1 was
  that `THREAT-MODEL.md §5`'s "the one residual" had gone stale and was mirrored in `LIMITS.md`. The
  repair corrected both sites — and asserted **"There are two such places"** in one and **"one of two"**
  in the other, rebuilding the identical two-file mirror at the new count, in the same edit, by the
  author who had just written the lesson body lines about L33 and L37 into the plan.
- **Why it is not already covered.** `L33` says a repair pass misses the **variant spellings** — here
  every spelling was found and fixed. `L40` says probing members never confirms the stated **cause** —
  the cause was not at issue. `L37` says quantifiers are where drift lands — true, and this is the
  sharpening: the **remedy** for a stale quantifier is itself a quantifier, so the class is
  self-reproducing unless the repair deliberately chooses an **open** form ("at least two", "the ones
  named here") over a closed count.
- **Honest trigger assessment (P7), stated rather than dressed up.** The new sentence is **true today**
  — nothing has actually gone stale yet. So this is an observed _reproduction of a defect shape_, not an
  observed _failure_. By `L20`'s bar that is arguably a first occurrence, not a second. **The human
  should weigh that at the promote gate; this review does not claim the bar is met.**
- **Provenance** (to be captured deterministically by `/pharn-dev-memory-promote`, not fabricated here):
  feature `skills-threat-surface`; source `.dev/features/skills-threat-surface/GRILL.md` F1 +
  `.dev/features/skills-threat-surface/REVIEW.md` F1.

---

## Verdict

**GREEN — 0 floor-gate (blocking) findings; 3 advisory findings (2 important, 1 minor).**

The increment does what it set out to do and does not overclaim: it adds no protection and says so in
four separate places. Its honesty posture is its strongest feature — the measured RED that forced the
three patches to be atomic, and the explicitly unexecuted post-apply GREEN, are both the kind of thing
that usually goes unstated.

F1 and F2 are wording corrections to a **staged** patch, so they cost nothing to apply now and are
cheapest before a human applies it. Neither blocks. **The standing decision is the human's.**
