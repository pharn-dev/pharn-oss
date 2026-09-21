# GRILL — skills-threat-surface

**Header.** Plan: `.dev/features/skills-threat-surface/PLAN.md`. **Spec-hash check:** recomputed
`sha256(pharn/ARCHITECTURE.md)` = `83890d97…9487`, **equal** to the plan's pinned
`spec_content_hash` — no drift surfaced. **Step 1b lessons-declaration verdict (FLOOR — the one
deterministic stop):** `pharn/floor/check-plan-lessons.mjs` **exit 0, GREEN** — 10 cited ids all
resolve in `.dev/memory-bank/lessons-learned.md` and are all referenced in the plan body. Proceeded.
**Griller membership (FLOOR):** `count-grillers.mjs` → **13 registered**, applied inline.

> The plan is `trust: untrusted` to this stage. Its self-claims were tested, not believed; every
> quote below is DATA.

---

## Findings

### Axis: documentation / comprehension — mirrored state

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/skills-threat-surface/PLAN.md:239"
  problem: "D4 retires the 'one residual' quantifier in THREAT-MODEL §5 while D3 leaves LIMITS.md untouched — but the same claim is MIRRORED in LIMITS.md twice, so after the patch the file that WINS on conflict still asserts there is exactly one residual."
  evidence: "D4 — `§5` IS reworded to admit a second residual. … D3 — `LIMITS.md` is NOT touched."
```

**Measured, not reasoned about.** The claim has **four spellings across two files**:

| site                  | text                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| `THREAT-MODEL.md:123` | `## 5. The one residual (named, bounded, not zeroed)`                             |
| `THREAT-MODEL.md:128` | "This is the **single place** the trust model is not provable on paper."          |
| `LIMITS.md:95`        | "the **one place** the trust model is not provable on paper, and is the target…"  |
| `LIMITS.md:141`       | "The **one residual** (§2) is named and is the first thing the experiment tests." |

`LIMITS.md:11` states its own precedence: _"If a claim elsewhere contradicts a limit named here, the
limit wins."_ So D3+D4 as approved produce a repo where the **winning** document contradicts the
patched one. This is **L43** (a consistency story over several stores of one fact) and **L33** (the
repair pass misses the variant spellings) firing together — and note the spellings genuinely differ
("single place" vs "one place"), which is the precise mechanism L33 was promoted from.

**This is not a request to overturn D3.** D3's reasoning against a _restatement_ of `§1a` stands
untouched. What it did not consider is a **retraction**: LIMITS.md:95/:141 do not restate `§1a`, they
assert a **count** that D4 makes false. Three ways out, for the human:

1. extend the patch set to LIMITS.md:95/:141 (a quantifier correction, not a restatement — P4 safe);
2. narrow D4 so `§5` admits the second residual **without** retracting "one" (e.g. `§5` keeps its
   scope and gains an explicit "a second residual of this kind is recorded at `§2` item 8");
3. accept the inconsistency and record it as a known defect with a follow-up slug.

### Axis: architecture / testability — an unimplementable registration

```yaml
- type: FINDING
  rule_id: "P6"
  severity: blocking
  file: ".dev/features/skills-threat-surface/PLAN.md:253"
  problem: "D5 commits to a forward_claims registration, but every forward_claims record requires a mandatory `probe` naming a path, and the absence this increment would register ('nothing gates the skills roster') has NO named path — the exact case the manifest already DEFERRED rather than guess."
  evidence: "D5 — BOTH shapes are registered in `.dev/floor/specified-primitives.json`, but as a STAGED PATCH, never a live write."
```

**Measured.** `check-specified-markers.mjs:255` runs `validatePrimitive(c)` over forward claims —
_"identical record shape: id + probe + sites"_ — and `isLive()` at `:145` **throws** on a missing
probe, which the checker turns into **exit 2, fail-closed**. A probe is `type: "path"` or
`type: "dir-contains"`; both name a filesystem location.

The manifest's own `$forward_claims_comment` already ruled on this class:

> "the `live griller runner` class … and `/pharn-verify`'s verifier runner. Both are real expiring
> claims, but **neither subject has a NAMED path in this repo, so a probe would have to invent one.
> Deferred rather than guessed (P6)**."

"A gate that reads the skills roster" is that same shape: no such file is planned, named, or
conceivable today, so any probe path is an invention. **The `named_artifacts` half of D5 is
unaffected and remains implementable** — `scan-installed-skills.mjs` exists at a real path, and that
entry is precisely the `secrets-in-code` precedent.

Recommendation for the human: implement **D5 as `named_artifacts` only**, and record the
forward-claim as a deferral citing the manifest's own precedent. That is a narrowing of D5, not a
reversal — and it is what P6's "deferred rather than guessed" already prescribes for this shape.

### Axis: security — the inflation vector the plan names but does not close

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/skills-threat-surface/PLAN.md:167"
  problem: "The plan forbids an unhedged 'enum/regex' cell but never forbids the `_(specified; ships with the guarded surface)_` marker, which EVERY neighbouring §3 Floor cell carries and which asserts a protection that will ship — false here, since nothing is coming."
  evidence: 'A `§3` cell naming "enum/regex" **without** "gates nothing" would read as answered.'
```

Four of the seven existing `§3` Floor cells end in that marker. An author matching local table style
would carry it into row 8 by reflex, and it would then be a **registered-primitive-shaped claim with
no primitive behind it and nothing coming** — the overclaim direction `check-specified-markers.mjs`
exists to catch, in a row nobody registered. The patch text must state, in the row itself, that no
primitive is specified or planned.

### Axis: comprehension — a build-gate ambiguity the plan introduced

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/skills-threat-surface/PLAN.md:268"
  problem: "The plan renames its halt section to `## Open questions — none remain` but keeps question-shaped numbered content beneath it; /pharn-dev-build HALTs on an unresolved `## Open questions (HALT)`, so the build's branch now depends on reading prose rather than a membership test."
  evidence: "## Open questions — none remain … 1. **`§2`: a new numbered surface (item 8), or an extension of item 6 …?**"
```

`pharn-dev-build.md:55`: _"Read `PLAN.md`. If it has unresolved `## Open questions (HALT)` → **HALT**;
it is not approved."_ The retained Q1 framing is genuinely resolved (D1 records the decision), but it
is rendered as a numbered question under a heading whose stem still reads "Open questions". A
deterministic reader keying on the exact heading passes; a model reading the section may HALT. Either
outcome is an accident of wording, which is what P5 says to remove. Remedy: move the retained framing
under an unambiguous heading (`## Q1 framing, retained for the patch author`) so no "Open questions"
stem survives.

### Axis: the remaining registered grillers

`a11y`, `coupling`, `error-handling`, `i18n`, `migrations`, `observability`, `performance`, `privacy`
were applied and produced **no findings**: the increment writes two patches and an `APPLY.md`, adds
no code path, no user-facing surface, no data handling, and no runtime behavior. Recorded explicitly
rather than omitted, so "no findings" and "not run" do not look the same (**L34**).

---

## Prose summary

The plan's trigger is genuinely established — the full-file search is shown rather than asserted, and
both halves of the P7 case are quoted from live reads. Its honesty posture is strong: it strikes the
"adds protection" claim outright, and it measured the D5 RED rather than assuming it.

The two blocking findings are both **consequences of the human's own gate answers that the answers
could not have anticipated**, which is exactly what this stage exists to surface. F1 is the sharper
one: D3 and D4 were each defensible alone and are jointly inconsistent, and the inconsistency lands
in the document that wins on conflict. F2 is narrower — D5's named_artifacts half is sound and only
its forward_claims half is unimplementable without violating P6.

Neither finding blocks `/pharn-dev-build`, and this stage does not gate it. Both are for the human to
weigh, and both have remedies that are narrowings rather than reversals.

---

**ADVISORY VERDICT: 4 concerns raised (2 blocking-severity, 2 important) — for the human to weigh
before `/pharn-dev-build`.** The severities are **model-assigned and advisory** (fix #3); this
verdict covers the **interrogation only**. The Step 1b floor verdict is reported in the header as its
own result and is deliberately **not** folded into these counts.
