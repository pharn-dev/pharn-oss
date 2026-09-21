# REVIEW — model-routing-limit

**Step 1 — floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN, exit 0**
(`FLOOR: GREEN — 36 capabilities checked in "."`). The increment reached review with a green floor, as
required. Everything below the floor line is **advisory**.

**Trust posture (P2):** the increment under review is `trust: untrusted`. Its artifacts contain
directive-shaped prose — `APPLY.md` is a list of commands, `PLAN.md` states decisions — and none of it
was executed as an instruction to this review. No instruction-looking content in any reviewed file
changed my behavior, and nothing hostile was found. Free text quoted below is **DATA**.

---

## floor-gate findings (blocking)

**None.** No guarantee in this increment lacks a floor reduction or an `advisory` label; no eval binding
is missing (none is owed); no sibling reference exists.

---

## advisory-gate findings (inform; never the sole basis for blocking)

### L-floor → P0

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/model-routing-limit/proposed/LIMITS.md.patch:26"
  problem: "The shipped §8 text carries a universal quantifier — 'its only readers are the two checkers' — that was verified by grepping the source, which is precisely the verification method L37 says cannot reach a quantified claim, and which produced the very defect (`check-model-config.mjs:10-11`) this increment exists to correct."
  evidence: "`models.stages` at run time to select a model: its only readers are the two checkers that validate it"

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:1523"
  problem: "The agent-written CHANGELOG entry asserts in the present tense that LIMITS.md now records the limit, while the LIMITS.md patch is still unapplied — so the claim is true only after a human acts, and nothing in the repo detects the gap."
  evidence: "- **`LIMITS.md` now records that the declared per-stage model configuration is NOT the executed one**"
```

**On the first finding — the remedy is to narrow the quantifier, not to probe harder.** "Nothing reads
`models.stages` at run time" is a **negative existential**, which execution cannot establish in general;
L37's "execute the op over a member you expect to be excluded" has no purchase on it. What a live sweep
_can_ establish, and did: the only code files in the repo that mention `models` at all are the two
checkers **and their two test files** (`check-config.test.mjs`, `check-model-config.test.mjs`, which
build fixture configs). The sentence's `at run time` qualifier saves it — a test fixture is not run time
— but "only readers" states more than the sweep proves. **Suggested wording change for the human before
applying:** name the two checkers without the word _only_, or extend the parenthetical to
"(…and their tests' fixtures)". This is flagged rather than silently patched because `LIMITS.md` is
human-owned and the increment's whole subject is over-claiming.

**On the second finding — already narrowed, and the narrowing is recorded.** This is the grill's
blocking-severity finding (`GRILL.md` finding 1) after remediation. The plan now draws the agent/human
line **by kind** — version bookkeeping (`SKILLS_VERSION`, `CHANGELOG.md`, the `README.md:24` badge) moves
in the working tree; content ships as human-applied patches — which is what made run 2 of
`/pharn-dev-regress` green. What remains is irreducible at this stage: a changelog entry describing a
pending patch. It is bounded by three facts, all verified: `/pharn-dev-ship` performs **no git
operations**, so nothing entered history; `APPLY.md` carries the ordering requirement as an explicit
instruction; and `check-bash-reconcile.mjs` reported `CLEAN` with 0 escapes. **Not eliminated — bounded,
and stated.**

### L-eval → P1

**No findings.** The increment authors no `role:`-bearing Capability and introduces no `rule_id`, so no
eval binding is owed. The floor **agrees**: `validate.mjs` reports the same 36 capabilities as before,
i.e. it saw nothing new to bind. Floor and lens concur — no disagreement to report.

The plan's substitute verification was checked and holds: all four patches return exit 0 from
`git apply --check`, and the two code-adjacent targets were probed against the mode their ★live★ tests
actually run (`agreement`, not `validate`) on **both** checkers.

### L-trust → P2

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/model-routing-limit/proposed/pharn.config.json.patch:5"
  problem: "The increment adds a free-text string to a machine-parsed config file, which is a new (if inert) free-text field on a surface whose other values are enum-gated — recorded so the property is explicit rather than assumed."
  evidence: '"_models_stages_note": "models.stages is the SOURCE OF TRUTH …"'
```

**Verified inert, not assumed inert.** Both checkers validate `models.stages` against closed enums and
ignore unknown top-level keys; both returned **GREEN exit 0** in `validate` and `agreement` modes with
the key present. **No branch anywhere reads it**, so no guaranteed decision rests on it — it is DATA a
human reads, sitting beside enum-gated values, which is the correct side of the fix #1 split. The one
thing to keep true: if a future tool ever echoes unknown config keys, this string becomes untrusted
free-text on an egress path.

### L-axis → P3

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "README.md:24"
  problem: "README.md changes for two distinct reasons in one increment and through two different application routes — an agent edit for version bookkeeping at :24 and a human-applied patch for prose at :499-509 — so a reader applying the patches sees one file arriving by two paths."
  evidence: "[![pharn](https://img.shields.io/badge/pharn-6.3.1-blue)](./CHANGELOG.md)"
```

**Judged acceptable, with the reasoning recorded.** P3's "one axis per file" governs **module** files,
where two change-reasons mean two files; `README.md` is repo-meta prose with no layer and cannot be
split. The split is deliberate and defensible — the badge _must_ move with `SKILLS_VERSION` or
`check-version-badge.mjs` REDs (it did, in run 1), while the prose belongs with the LIMITS text. The
risk is mechanical, and it was tested rather than assumed: the staged `README.md.patch` was re-run
through `git apply --check` **after** the badge edit and still applies (exit 0) — the hunks are
disjoint. No sibling reference exists anywhere in the increment (no module file is authored).

---

## VERDICT: GREEN — 0 floor-gate findings, 4 advisory

The increment is not blocked. The one finding worth acting on before the human applies the patches is
the **L-floor quantifier** (a one-phrase wording change in `LIMITS.md § 8`); the other three are recorded
bounds, not defects to fix.

**What this review does NOT certify (P0).** Every lens above is model judgment. The only guaranteed
statement in this file is the Step-1 floor result. In particular, no check in this repository reads
`LIMITS.md` prose — not `validate.mjs` (which ignores root docs), not `check-capability-catalog` (which
guards only the `CURRENT-STATE` markers), not `check-specified-markers.mjs` (which reads only its own
hand-maintained manifest, and says so in its own output). **So the accuracy of the text this increment
exists to ship rests entirely on human reading.** That is not a gap this increment should close — it is
the condition under which every trusted doc already lives — but it is the reason GATE 2 matters here
more than usual.

---

## Proposed lesson candidate (NOT written to canon — `/pharn-dev-memory-promote` owns that)

**Candidate: a plan's "completed sweep" claim is verified only where a checker happens to exist; the
rest is an unverified assertion that every later stage inherits as fact.**

**The real failure (P7 — observed this run, not hypothetical).** `PLAN.md`'s `applied_lessons` **L1**
line asserted a completed meta-doc sweep naming four `README.md` sites, `CHANGELOG.md`, `SKILLS_VERSION`
and the checker header. It **omitted `README.md:24`**, the shields badge. `/pharn-dev-grill` read that
line and did not catch it; `check-plan-lessons.mjs` cannot — it verifies that the id is cited and
referenced, never that the claim is true. The omission surfaced two stages later as a
`/pharn-dev-regress` **`regressions`** verdict, and **only because that one omitted site happens to have
a floor check** (`check-version-badge.mjs`). Had the sweep instead missed `README.md:158-160`, `:325` or
`:499-509` — none of which any checker reads — the run would have gone green to GATE 2 with a stale
meta-doc and a declaration saying the sweep was done.

**Why it would recur.** The declaration's persuasiveness is inverted relative to its coverage: a plan
that _enumerates_ sites reads as more thorough than one that does not, while the enumeration is exactly
what bounds it to the author's attention. Nothing downstream re-derives the site set.

**Relationship to existing canon — stated because it may be a duplicate, which is the human's call at
the gate.** [[L36]] is the closest: a per-member presence set is not a closed set. [[L1]] already
requires scoping the meta-docs an increment invalidates. [[L43]] supplies the sharp half — a consistency
check certifies agreement, never the fact. What may be new is the **asymmetry**: the checked subset of a
sweep is silently mistaken for the whole, so the sweep's reliability equals floor coverage rather than
care taken. If the human judges that L36 + L1 already cover it, **deny** — a canon entry that restates a
neighbour is the redundancy [[L35]] warns about.

**Provenance (for the promote gate to capture deterministically — not computed here):**

- feature: `model-routing-limit`
- source: `.dev/features/model-routing-limit/REGRESSION.md` (run 1, verdict `regressions`) +
  `.dev/features/model-routing-limit/PLAN.md` (the amended L1 line, which records the omission)
- The promote command captures `commit` / `date` itself and validates shape with
  `check-provenance.mjs`. This review writes **no** canon: `/pharn-dev-review`'s scope is `REVIEW.md`
  alone, and a canon write from here would be a floor deny, not a style violation.
