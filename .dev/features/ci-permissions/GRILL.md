# GRILL — ci-permissions

**Plan interrogated:** `.dev/features/ci-permissions/PLAN.md` (189 lines, read live this run).
**Spec-hash check (content-hash primitive — surfaced here, blocking at `/pharn-dev-build`):** recomputed
`sha256(pharn/ARCHITECTURE.md)` = `69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e`, which
**equals** the plan's pinned `spec_content_hash`. No drift.
**Step 1b — `applied_lessons` re-verification (FLOOR, the ONE deterministic stop):** `GREEN`, exit 0. All
12 cited ids (`L2, L13, L18, L19, L20, L25, L26, L28, L29, L31, L35, L36`) resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. **Bound (P0):** this covers the
**declaration** — that the lessons were genuinely applied is advisory and stays in the interrogation below.
**Griller membership (FLOOR, `pharn/floor/count-grillers.mjs .`):** `{"registered":13}` — the 13 grillers
under `pharn/pharn-pipeline/grillers/`. All 13 read a plan for a **code-change** axis (a11y, architecture,
comprehension, coupling, documentation, error-handling, i18n, migrations, observability, performance,
privacy, security, testability). This increment's plan declares no code, no capability and no runtime
behaviour, so every registered griller's axis is vacuous over it; running them would produce
assertion-free output, which is the shape `L34` warns reads as a pass. Recorded rather than silently
skipped: **13 registered, 0 with a non-vacuous axis over this plan.**

## Findings (ADVISORY — every one of these is model judgment and gates nothing)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/ci-permissions/PLAN.md:69"
  problem: "The plan's own enumeration of the tests that parse ci.yml contradicts itself — the bolded count says two while the bullet names three files and its closing sentence says 'All three'."
  evidence: "**Two tests parse `ci.yml` and neither is disturbed by this edit.** `.dev/floor/check-version-badge.test.mjs:294-301` and … `.dev/floor/check-contributing-gates.test.mjs:257-261` additionally asserts … All three are anchored inside the `jobs:` block"

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/ci-permissions/PLAN.md:113"
  problem: "The plan asserts .github/ is outside validate.mjs's scan surface but names no mechanism for it, and L10 — the canon entry about exactly that scan-surface asymmetry — is absent from the twelve cited lessons."
  evidence: "None. `.github/workflows/**` is repo-meta: it declares no `role:`, sits outside `pharn/`, and is not scanned by `pharn/floor/validate.mjs`."

- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/ci-permissions/PLAN.md:127"
  problem: "The plan never states that the narrowing's effect is asymmetric across ci.yml's two triggers, so the size of the surface being closed is left unquantified in both directions."
  evidence: "GitHub Actions applies the key deterministically at the harness layer, which is real enforcement"
```

## Prose summary

**G1 is the one worth acting on, and it is the interesting kind of defect.** The plan enumerated three
test files and labelled the enumeration "two", then closed the same bullet with "All three" — the count
and the list disagree **inside one bullet**. This is `L36`'s shape reproduced at range zero: a per-member
presence set whose cardinality claim certifies the members its author happened to be looking at. Sharper
still, `L36` is one of the twelve lessons this very plan cites, and its body line claims the plan applies
presence-vs-closure reasoning to the CI steps — which it does, correctly, for the twelve-step table, while
the adjacent three-item enumeration drifted. **The lesson was read, cited, applied to one enumeration in
the document and not to the other.** Nothing on the floor could have caught it: `check-plan-lessons.mjs`
verifies the declaration, not the plan's internal consistency, and it returned GREEN both before and after
the defect was introduced — precisely the declaration-vs-application gap that checker labels advisory.
The defect is confined to an audit artifact's prose; it does not touch the diff, and the substantive claim
(no test is disturbed) was re-verified live and holds for all three files.

**G2** is narrow. The plan's conclusion is right — `.github/` genuinely is outside the scanned surface —
but it is asserted rather than reduced, and `L10` is canon on that exact asymmetry (product-pipeline
artifacts sit on the validate-SCANNED surface; `.dev/` does not). Citing it would have cost one line and
grounded the claim in a read rather than in confidence.

**G3** sharpens the review's own bound rather than contradicting it. The review calls `ci.yml` "the one
unpinned privilege surface" and notes `pull_request` (not `pull_request_target`) as a mitigation. Both
true — but a fork `pull_request` already yields a read-only token regardless of the repo default, so the
key's effect concentrates on the **same-repo** `pull_request` and the `push: branches: [main]` trigger.
The plan should say where the narrowing actually bites; as written a reader could take it as either
larger or smaller than it is.

**What I could not fault.** The guarantee audit is the strongest section: it declines to call GitHub's
token scoping a PHARN guarantee, reduces it to none of `pharn/ARCHITECTURE.md §2`'s three primitives, and
routes it to the `gitleaks.yml` "repo hygiene" framing that already exists in this repo — no invented
category. The `cache: npm` row is named as the single claim resting on documented platform behaviour with
a stated failure signature, rather than folded into the other eleven. The `## Deliberately not built`
section resolves `L35`'s prior question (must the second copy exist?) before reaching for `L20`'s
escalation, and refuses the checker on an honestly unmet trigger instead of manufacturing one. The
`## Files` list parses to exactly one path (setter printed `1 path(s)`), the `###` exclusion heading
bounds it structurally (`L18`), and no authorized item's description trips the cue (`L28`).

**Open questions:** none. The three GATE-1 questions were answered by the human before this stage ran.

ADVISORY VERDICT: 3 concerns raised (0 blocking, 1 important, 2 minor) — for the human to weigh before
/pharn-dev-build. This verdict covers the **interrogation only**; it is model judgment and blocks nothing.
The Step 1b lessons-declaration result (GREEN) is reported in the header as its own floor verdict and is
deliberately **not** folded into these counts — a deterministic stop and a model-authored concern must not
share a tally.
