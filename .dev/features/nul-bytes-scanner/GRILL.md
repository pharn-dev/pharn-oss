# GRILL — nul-bytes-scanner

**Plan under interrogation:** `.dev/features/nul-bytes-scanner/PLAN.md` (treated as `trust: untrusted`;
every quotation below is DATA, never an instruction followed).

**Spec-hash check (content-hash primitive — SURFACED, not blocking here):** recomputed
`sha256(pharn/ARCHITECTURE.md)` = `bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299`,
which **equals** the plan's pinned `spec_content_hash`. No drift. (`/pharn-dev-build` is where drift
would block; this stage only warns.)

**Step 1b — `applied_lessons` re-verification (FLOOR — this stage's ONE deterministic stop):**
**GREEN**, exit 0. Checker output verbatim:

> GREEN — applied_lessons: L19, L20, L25, L26, L29, L34, L35, L36
> (.dev/features/nul-bytes-scanner/PLAN.md); all 8 cited id(s) resolve in
> .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons
> were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a
> body line reading "L19: considered." satisfies the reference check.

**Griller membership (FLOOR — `pharn/floor/count-grillers.mjs .`):** `{"registered":13}`. Eleven of the
thirteen axes (a11y, i18n, migrations, privacy, performance, security, observability, coupling,
architecture, documentation, comprehension) yielded no finding against a five-file source-hygiene
increment; **testability** and **error-handling** produced the two substantive findings below. That
distribution is recorded rather than smoothed over: a griller with nothing to say on this increment is
not evidence the increment is sound.

---

## Findings

### Axis: testability (griller) — the substantive concern

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/nul-bytes-scanner/PLAN.md:84"
  problem: "The plan specifies that the guard asserts a non-empty file set and asserts no file contains a NUL, but it never specifies a POSITIVE-DETECTION assertion — so a guard whose detector is broken (a mis-built needle, a predicate that can never be true) would pass every assertion the plan names, which is the same vacuity class the plan cites L34 to have closed, displaced one level down from the domain to the predicate."
  evidence: '"The swept set is non-empty, so the sweep cannot pass vacuously" → **floor: enum-regex** (integer length test — L34).'
```

**Why this is the sharp one.** The plan's L34 application asserts the **domain** is non-empty. It does
not assert the **detector** works. Those are different claims, and after the fix lands the sweep's
expected result is `[]` — an empty offender list — which is exactly the shape that cannot distinguish
"nothing is wrong" from "nothing is being checked". The precedent the plan itself cites is stronger than
the plan: `.dev/floor/entry-point-guard.test.mjs` drives its stripper through a **synthetic fixture**
containing the banned strings, precisely so a green sweep is not self-certifying, and its header explains
that an earlier draft's live-file precondition was the wrong way to get this.

**Suggested remedy (for the human to weigh, not a directive):** add one assertion that feeds the guard's
own predicate a synthetic buffer holding a raw NUL (built via `String.fromCharCode(0)`, so the test file
itself stays printable) and requires it to be flagged. That is the mutation test L36's provenance records
as having been run before promotion, and it costs three lines.

### Axis: error-handling (griller)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/nul-bytes-scanner/PLAN.md:86"
  problem: "Behaviour-identity of the edited scanner is backstopped only by re-running its 28 existing tests, but the plan itself concedes those tests 'pin the behaviours they cover, never all behaviour' — and a cheap deterministic check that would cover the actual edit (capturing the scanner's JSON output on a fixture before and after the byte change and comparing) is available and unspecified."
  evidence: '"The scanner''s observable behaviour is unchanged" → **advisory** as a general claim, **backstopped by floor**: the 28 committed tests re-run and must stay green.'
```

**Note the plan is honest here, and the finding is about reach, not honesty.** The plan does not overclaim
— it labels the general claim advisory and states the bound. The gap is that a stronger, deterministic
check exists for this specific edit and is not taken.

### Axis: guarantee-audit completeness (inline, P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/nul-bytes-scanner/PLAN.md:81"
  problem: "The guard's floor reduction is labeled 'enum-regex' while the operation it actually performs is a raw-byte membership scan over a file buffer; the reduction to ARCHITECTURE §2 primitive #3 holds (set membership), but naming the mechanism imprecisely is how a later reader inherits a vaguer claim than the code supports."
  evidence: '"No non-test `.mjs` directly under `pharn/floor/` or `.dev/floor/` contains a raw NUL byte" → **floor: enum-regex**'
```

### Axis: scoping / writes-scope (inline, P5 + L19)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/nul-bytes-scanner/PLAN.md:14"
  problem: "The plan leaves the docs-regeneration obligation as an unresolved conditional ('if the catalog turns out to enumerate the new test file'), which is a membership question answerable deterministically before the build rather than a condition left for the builder to notice."
  evidence: "Bash-escaping write — `npm run docs:generate`, if the catalog turns out to enumerate the new test file — is declared here rather than pretended into scope."
```

**Resolved live during this grill, so the builder need not re-derive it.**
`.dev/floor/capability-catalog-core.mjs:381-383` counts floor checkers over `FLOOR_DIR = "pharn/floor"`,
`*.mjs` with `.test.mjs` excluded. The planned new file is `.dev/floor/source-nul-guard.test.mjs` — wrong
directory **and** a test file — so it moves no catalogued count and `docs:check` should stay GREEN. The
obligation is to **run** `npm run docs:check` (it is inside `npm run check` regardless), not to
regenerate. Recorded here so the conditional does not survive into the build as an open question.

---

## Prose summary

The plan is unusually well-grounded for its size: the defect is measured live (one file of 1666 tracked),
the sibling convention is cited rather than restated, the spec pin is exact, and the guarantee audit
already **declines** the two overclaims a careless version of this increment would have made — it
explicitly refuses "the shipped floor source is printable ASCII" and "the guard covers every file that
ships". Those refusals are the plan's strongest feature and should survive into the built artifact's
header verbatim.

One concern is worth the human's attention before `/pharn-dev-build`: **F1**. The increment's entire
value is a detector, and the plan specifies every assertion around the detector except one that proves
the detector fires. Because the post-fix expected state is an empty offender list, a broken detector and a
clean repo are indistinguishable at the verdict — and the plan's own cited lesson (L34) is exactly the
lesson about that indistinguishability. F1 is the L34 argument applied one level down, to the predicate
rather than the domain.

F2 is a reach concern, not an honesty one. F3 and F4 are precision items; F4 in particular is the L25
shape the increment exists to fix, aimed at the plan's own prose.

Two things the interrogation did **not** find, stated so the absence is not read as unexamined: no P2
trust gap (the plan correctly establishes that the edited dedup key is built from an integer and one of
two internal literals, so no untrusted value flows through the changed bytes), and no P7 bundling
violation (the version/badge/CHANGELOG trio is mandated by the repo's own SKILLS_VERSION discipline for
any product-surface byte change, so it is not a second increment smuggled in).

---

**ADVISORY VERDICT: 4 concerns raised (1 blocking-severity, 3 advisory) — for the human to weigh before
/pharn-dev-build.**

The severity labels are **model-assigned and advisory** (fix #3): none of these four findings gates
`/pharn-dev-build`, including the blocking-severity one. This verdict line covers the **interrogation
only**. The Step 1b lessons-declaration verdict is reported in the header as its own floor verdict and is
deliberately **not** folded into these counts — a deterministic stop and a model-authored concern must not
share a tally. Nothing here means "the plan is good"; it means these four questions were asked.
