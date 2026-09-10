# GRILL — readme-audit-repairs

**Plan:** `.dev/features/readme-audit-repairs/PLAN.md` · **spec-hash check:** MATCH
(`bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299` == the plan's pin; recomputed this
run with `.dev/floor/hash-doc.mjs`) · **Step 1b lessons-declaration verdict (FLOOR):** **GREEN, exit 0** —
`applied_lessons: L1, L18, L19, L20, L28, L33, L35, L36, L37`; all 9 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body.

> The Step 1b verdict above is a **deterministic stop** and is deliberately **not** folded into the
> concern counts below. Everything else in this file is **model-authored interrogation** and gates
> nothing.

---

## Findings

### Axis: guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/readme-audit-repairs/PLAN.md:89"
  problem: "F5's description of the memory-bank escape states only its ORIGIN condition, but the escape is CONJUNCTIVE — a README row authored from this summary would describe the guard as weaker than it is, which is the same defect class the increment exists to repair."
  evidence: "canon is writable through the write tool under a promote-command origin, the trusted docs never are"
```

**Probed, not read** (L37's remedy; exit codes recorded live this run):

| writes-scope record                                          | write to `memory-bank/lessons-learned.md` |
| ------------------------------------------------------------ | ----------------------------------------- |
| promote origin + **1** entry **== target**                   | exit 0 — allowed                          |
| promote origin + **2** entries (target among them)           | **exit 2 — denied**                       |
| promote origin + 1 entry **!= target**                       | **exit 2 — denied**                       |
| `.claude/commands/pharn-dev-memory-promote.md` + 1 == target | exit 0 — allowed                          |
| `.claude/commands/pharn-build.md` + 1 == target              | **exit 2 — denied**                       |

The gate is `set_by ∈ PROMOTE_COMMANDS` **AND** `scope.length === 1` **AND** `scope[0] === target`
(`protect-trusted-paths.cjs:500–505`). "Under a promote-command origin" is a **necessary, not
sufficient** condition. The replacement row must not imply the origin alone opens canon.

### Axis: honest scope / evidence sourcing (P6, P7)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: blocking
  file: ".dev/features/readme-audit-repairs/PLAN.md:61"
  problem: "F2 treats README:438 as ground truth for what the installer copies, but README:438 is itself an unverified claim about a program in a different repository, and the installer's own published documentation contradicts it on three counts."
  evidence: "It omits `pharn/CONSTITUTION.md` and `pharn/ARCHITECTURE.md`, which README:438 says the installer **does** copy, and `pharn/pharn-core/` (the seam-resolver — the `1 skill` in the generated inventory, verified live)."
```

The published `@pharn-dev/pharn` README's **"What it installs"** table — the only installer-side source
readable from this tree — lists:

| Artifact                                                  | What lands                 |
| --------------------------------------------------------- | -------------------------- |
| `pharn-pipeline/grillers/<name>/`, `pharn-review/<name>/` | selected grillers + lenses |
| `.claude/commands/`, `.claude/hooks/`                     | commands + hooks           |
| `pharn-contracts/`, **`.dev/floor/`**                     | schemas + floor checkers   |
| **`CONSTITUTION.md`**                                     | "copied verbatim"          |
| `pharn.config.json`                                       | config                     |

Three conflicts, none resolvable from this repository:

1. **`ARCHITECTURE.md` does not appear.** README:438 and README:447 both assert it is copied. If the
   installer table is current, **README:438 is itself a defect** — and F2 would propagate it into the
   tree diagram, adding a _second_ false statement of the same claim.
2. **Floor checkers land at `.dev/floor/`,** not `pharn/floor/` as README:161 shows. One of the two is
   stale. This cuts both ways: the installer doc may be the stale one, since `CLAUDE.md` records the
   `pharn/floor/` relocation in 2.4.0.
3. **`pharn-core` appears nowhere,** and the table defines a capability as "one **griller** … or
   **lens**" — a unit that excludes `role: skill`. F2's proposal to add `pharn/pharn-core/` to the
   install tree is therefore **unbacked by any readable source**; the plan's evidence for it ("the 1
   skill in the generated inventory, verified live") establishes that it exists **in this repo**, never
   that a user receives it.

**Terminal fallback is ask (P5/P6).** The authoritative source is the `pharn-cli` implementation, which
is not in this tree. I do not guess it, and the build must not either.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/readme-audit-repairs/PLAN.md:26"
  problem: "The L33 class sweep was organized by defect SHAPE (miscount, false exclusivity, universal quantifier) and not by EVIDENCE SOURCE, so it never enumerated the class where this repo has no authority at all — claims about installer behavior — which is the class F2's own premise sits in."
  evidence: "I treated the audit's list of five as a **lower bound to beat**, swept `README.md` for the defect _classes_ rather than the five sentences, and beat it by one"
```

The installer-claims class has at least seven members (README:101, 141, 146, 172, 430, 436, 438). The
plan caught **two** of them (F3, F4) and, in the same breath, **consumed a third as ground truth**
(README:438 → F2). L33's rule is that a prior enumeration is a lower bound to beat; the plan beat it
along one dimension and did not notice the second.

### Axis: documentation griller (advisory, `pharn/pharn-pipeline/grillers/documentation/`)

Layer 1 (presence): **no absence finding** — the increment adds no public API, config key, or exported
surface, so no documentation declaration is owed. Layer 2 (advisory adequacy) corroborates the P0
finding above: the non-obvious thing a reader needs from F5's new row is _precisely_ the escape's
conjunctive narrowness, which the plan's specification of that row omits.

---

## What I tested and did NOT find a problem with

Recorded so a later reader does not re-derive them, and so the finding list is not mistaken for the
whole of what was checked:

- **The P7 deferral of registering README sites in `.dev/floor/specified-primitives.json` is a TRUE
  bound, not an excuse.** `check-specified-markers.mjs:145–165` — `isLive()` accepts exactly `path` and
  `dir-contains`, both pure `existsSync`/`readdirSync` existence tests, and **throws** on any other
  value (fail-closed, exit 2). A behavioural claim ("the hook denies `memory-bank/**`") is genuinely
  inexpressible without a new probe type. The plan's reasoning holds and its reopen trigger is sound.
- **The three sites the plan cleared are genuinely clear.** Re-derived independently: `ci.yml:41` does
  run `npm run docs:check` (README:361 stands); `.claude/commands/pharn-review.md:173-175` does spawn
  one subagent per lens (README:423 stands).
- **F1, F3, F4, F6 are correctly specified** and their evidence is in-tree and re-verifiable.
- **Scope discipline is clean.** `## Files` resolves to exactly `['README.md']`, matching the plan's
  authorized set; the `###` heading form is Boundary 1 at `set-writes-scope.cjs:233`.

---

## Summary

The plan is strong on the axes it chose and **wrong about one thing in a way it could not see from
inside its own method**. Its L33 sweep looked for defect _shapes_ and found a sixth instance (F6, good).
It never asked the orthogonal question — _which of these claims can this repository actually
adjudicate?_ — and so it took README:438, a member of the one class this repo cannot verify, as the
premise for F2. The installer's own published table contradicts that premise on three counts.

F2 is the only repair whose evidence points **outside** this tree. Every other repair (F1, F3, F4, F5,
F6) is grounded in a file or an exit code readable here. The asymmetry is the whole finding: F4's repair
correctly **drops** an unverifiable installer claim, while F2 as written would **add** one or two.

The P0 finding on F5 is smaller but the same family — a summary that is true and incomplete, where the
omitted half is exactly the part a reader would rely on.

## Verdict

**ADVISORY VERDICT: 3 concerns raised (1 blocking-severity, 2 important) — for the human to weigh before
`/pharn-dev-build`.**

This verdict covers the **interrogation only** and **gates nothing**. It is model judgment, not a floor
operation: no finding above is a deterministic stop, and `severity: blocking` is my advisory
**assignment**, not a gate. The stage's one floor verdict — Step 1b, GREEN — is reported in the header
and is not counted here. Nothing in this file means "the plan is good" or "the plan is bad"; it means
these questions were asked and these answers were probed.
