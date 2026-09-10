# GRILL — review-name-and-backstop

**Plan:** `.dev/features/review-name-and-backstop/PLAN.md`
**Spec-hash check (content-hash, surfaced not blocking):** GREEN — live
`sha256(pharn/ARCHITECTURE.md)` = `bed2c2a5…52e299` equals the plan's pinned `spec_content_hash`.
**Step 1b — `applied_lessons` re-verification (FLOOR, the ONE deterministic stop):** **GREEN, exit 0** —
all 10 cited ids (L3, L6, L7, L8, L20, L29, L33, L34, L36, L37) resolve in canon and are referenced in the
plan body. Per the checker's own note, that is the DECLARATION, never the application.
**Griller membership (FLOOR, `count-grillers.mjs`):** 13 registered.

> The plan is `trust: untrusted` to this stage. Every `problem` / `evidence` below quotes it as DATA.

## Findings

### Axis: honest scope / no speculation (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/review-name-and-backstop/PLAN.md:29"
  problem: "The plan justifies a new floor check by citing L20 ('the second occurrence is the trigger') but named no FIRST occurrence — as written, this is a first-occurrence escalation, which is the speculative-addition shape P7 forbids."
  evidence: "L20 — a defect whose only remedy is 'remember to update it' has earned a floor check. If a lens gains or loses a scanner in the map, the carve-out's four names go stale and nothing today would notice"
```

**RESOLVED during this grill, by live discovery — recorded rather than quietly dropped.** Occurrence #1
exists and is documented in the map's own `doc` string: _"lens-scanner-map.test.mjs enforces consistency
with disk + count-lenses so prose/map drift is caught (P7 — **a real, already-observed drift: two lenses'
prose name scanners that do not exist**)."_ That was **lens prose vs. scanners**. The defect under repair
is **command prose vs. the map** — the same class on a surface the first response did not cover. L20's bar
is therefore genuinely met, and `lens-scanner-map.test.mjs` is the precedent response to #1. The plan must
state this trigger explicitly instead of asserting the bar.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/review-name-and-backstop/PLAN.md:88"
  problem: "The decision to ship NO writes-scope setter is argued from probes, but the plan does not record the strongest counter-option it rejected, so a reader cannot tell whether it was considered or missed."
  evidence: "Decision — /pharn-review gets NO writes-scope setter, and the command now SAYS SO"
```

**The rejected counter-option, stated so the record is complete.** A scope COULD be set immediately before
Step 6's `REVIEW.md` write — the one Write-tool write the orchestrator itself makes — and the fan-out race
is closed by data dependency (Step 5's merge consumes every lens `findings.json`, so by Step 6 the parallel
writers have provably finished). It was rejected on four grounds, in order of weight: (1) **P7** — it
prevents no observed failure; (2) the narrowing is **near-nil** — `REVIEW.md` sits inside `features/**`,
which the fail-closed default already permits, so it forecloses only an unobserved stray write elsewhere in
the same tree; (3) it would newly oblige a `--clear` step and **stale the control-case comment** in
`.claude/hooks/writes-scope-release.test.cjs:97`, which names `pharn-review.md` as a non-setter — a file
this plan's `## Files` does not authorize, so the increment would have to be re-planned; (4) Step 5's merge
output is written by **Bash** (`merge-findings.mjs`), which `PreToolUse` never gates (L19), so a scope
cannot reach the artifact a reader would most expect it to cover. Verdict: the absence stands, and the
command must SAY it is deliberate.

### Axis: guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/review-name-and-backstop/PLAN.md:130"
  problem: "The audit line 'the backstop covers the 18 scanner-bound lenses -> floor: enum-regex' risks re-introducing the very disease the increment repairs, one scope-step smaller — a narrowed universal is still a universal."
  evidence: "'the backstop covers the 18 scanner-bound lenses' -> floor: enum-regex, but ONLY in the narrow sense that those lenses' Layer-1 verdict has a deterministic scanner behind it."
```

The plan already carries the qualifier, but the **command's** wording is what ships. The carve-out must not
read as "the other 18 are safe." What is floor-true is narrow: for a scanner-bound lens a deterministic
regex produced the shape. Whether the lens then **reports** it is advisory — spawning, slicing and the
lens's judgment are all advisory, and a lens can decline to emit for reasons no scanner constrains. The
command must state the backstop's strength as _"the shape's DETECTION is deterministic"_, never as _"the
finding will be reported."_

### Axis: determinism (P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/review-name-and-backstop/PLAN.md:150"
  problem: "The plan says the test pins 'the carve-out region' without saying how that region is located; a line-number or offset locate would be fragile, since editing the command shifts every line below."
  evidence: "carve-out <-> map agreement -> every `null` lens in `lens-scanner-map.json` is NAMED in the carve-out region"
```

Binding: the region MUST be located **structurally**, by a pinned literal stem, never by a line number —
the `check-version-badge.mjs` precedent, which finds the badge by its shields URL PATTERN "never a line
number, since editing the README shifts lines". Locating it by scanning the whole file is also rejected:
Step 3 already names the four lenses, so a whole-file scan would pass with no carve-out present at all —
a vacuous green in the exact direction L34 names.

### Axis: one axis of change (P3)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/review-name-and-backstop/PLAN.md:5"
  problem: "The increment bundles two independent reasons to change one file: a false-claim repair and a missing-step addition."
  evidence: "Correct the four unbounded suppression-backstop claims in /pharn-review …, add the missing <name> resolution step, and pin the carve-out with a corpus test."
```

**Accepted with justification, not waived.** Both defects are HIGH findings from a single review of a
single file, and splitting them would produce two branches editing overlapping regions of
`.claude/commands/pharn-review.md` — a self-inflicted merge conflict, which the operator explicitly
directed against. P3 governs a _file's_ reasons to change; an increment repairing one file's review findings
as a batch is the established shape here (`docs-drift-resync` is the precedent). Recorded so the trade is
visible rather than silently taken.

### Axis: eval coverage (P1)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/review-name-and-backstop/PLAN.md:141"
  problem: "The plan ships no eval fixtures; a reader could mistake that for an unmet P1 obligation."
  evidence: "No `role:`-bearing capability is added or changed, so P1's eval obligation is not triggered."
```

**Correct as planned.** P1 binds Capabilities and `rule_id`s in `enforces`. This increment adds neither: it
edits a command (excluded from `validate.mjs`'s capability walk) and one apparatus test. The verification
burden correctly lands on the corpus test's own non-vacuity and discrimination assertions instead.

## Grillers (ADVISORY — 13 registered, they gate nothing)

Applied inline (the live isolated runner is deferred, P7). Ten of the thirteen — `a11y`, `i18n`,
`migrations`, `observability`, `performance`, `privacy`, `security`, `coupling`, `error-handling`,
`testability` — range over axes a markdown-prose + one-test increment does not touch, and produced no
findings; recording the empty result rather than omitting it, since a silent omission and an examined-clean
axis must not look the same (L34's shape applied to this log).

- **`architecture`** — no finding. The `.dev/` → `pharn/` read direction the new test needs (it parses
  `pharn/floor/lens-scanner-map.json` from `.dev/floor/`) is the ALLOWED direction; the reverse would break
  an install, which ships `pharn/floor/` without `.dev/`.
- **`documentation`** — one concern, folded into the P0 finding above: the carve-out is prose whose accuracy
  no checker can read. The test pins the four NAMES; it cannot pin that the sentence around them is true.
- **`comprehension`** — one concern: four separate repair sites risk drifting apart in future edits. Bounded,
  not closed — the test pins one site (the Step-3b blockquote). Widening it to all four is recorded as a
  residual in the plan, deferred under L20's own bar (one occurrence, not two).

## Summary

The plan's two repairs are grounded in live probes rather than reasoning, which is the right posture for a
defect of exactly this class (L37). Its strongest work is the L33 lower-bound scan: the review named one
claim site and the plan found four, so a repair limited to the reported site would have left the file still
asserting the false universal three times.

Three items need to land in the BUILD, not just the plan: (1) the P7 trigger for the new test must name
occurrence #1 from the map's `doc` string, rather than asserting L20's bar; (2) the carve-out's wording must
bound the backstop to DETECTION, never to reporting — otherwise the repair re-creates the disease at 18/22
instead of 22/22; (3) the test's region locate must be a pinned literal stem, never a line number.

The writes-scope decision is sound and now has its rejected counter-option on the record. The residual worth
restating: this increment stops a document from lying. It does **not** reduce the suppression risk for the
four scanner-less lenses — including `trust-fence`, the attempt-0 injection probe — which remains bounded
by nothing structural.

**ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 3 important, 3 minor) — for the human to weigh
before `/pharn-dev-build`.** This verdict covers the **interrogation** only and gates nothing. The Step-1b
lessons-declaration result is reported in the header as its own floor verdict and is deliberately not folded
into these counts.
