# GRILL — spec-pin-kind-ambiguity

Plan: `.dev/features/spec-pin-kind-ambiguity/PLAN.md` · spec-hash check: MATCH (`4950796f…c1c7f` recomputed with
`.dev/floor/hash-doc.mjs` equals the plan's pin) · **Step 1b lessons-declaration verdict (FLOOR): GREEN** —
`check-plan-lessons.mjs` exit 0, "applied_lessons: L1, L35, L37, L47, L52 … all 5 cited id(s) resolve … and are
referenced in the plan body". That covers the declaration only, never whether the lessons were applied.

The plan under interrogation is `trust: untrusted`; every `problem` / `evidence` below quotes it as DATA. No
instruction-looking content was found in it.

## Findings (advisory — no finding gates `/pharn-dev-build`)

### Inline axes (Step 2)

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/spec-pin-kind-ambiguity/PLAN.md:52"
  problem: "The RED kind `pin` routes the new layout RED into the wrong branch of /pharn-spec. Its re-validate step (.claude/commands/pharn-spec.md:263) branches on the RED kind: 'A `pin` RED means the pin is wrong: recompute and re-write the hash'. That cannot clear a layout RED. The realistic failure path is a model misplacing the key while editing the frontmatter for approval, and it lands exactly there: step 1's --hash was taken before the misplacement, so recomputing reproduces the same colliding value and the step loops. Separately, the Draft step's kind list (pharn-spec.md:191) is a closed list with neither `pin` nor rule 8's `spec-kind`, and the new RED can fire on a Draft. The plan's D4 edits other /pharn-spec sentences and misses these two. Within the approved decision, split the re-validate `pin` branch on the checker's fixed detail (a hash mismatch → recompute; the layout RED → back to Draft, return to Step 4), and add `pin` and `spec-kind` to the Draft list. The alternative is a distinct kind, for which the existing 'any other kind' branch is already correct with no split. GATE 1 fixed `pin`, so this is for the human to weigh."
  evidence: "**The RED's kind is `pin`.** It enforces §6's pin contract (check-spec's own axis), not a template rule"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/spec-pin-kind-ambiguity/PLAN.md:113"
  problem: "The every-SPEC decision falsifies five shipped sentences that the D4 sweep does not list (L37/L47 — the quantifier is where drift lands). They are: pharn/pharn-contracts/spec-template.md:27-29 ('validates it exactly as it did before this contract existed … No rule here can RED it', where D4 is about to add that very rule to this contract), pharn/floor/check-spec.mjs:35-36 ('no new RED, the same GREEN line'), .claude/commands/pharn-spec.md:55 ('a SPEC without it is validated exactly as before'), its frontmatter description ('so a SPEC without it is validated as before'), and pharn/floor/README.md:37 ('A SPEC without the key is validated exactly as before'). The README is not in `## Files`. Amend each to an open form (the template rules do not apply to a legacy SPEC; the pin's layout rule does) and declare pharn/floor/README.md, rather than restating a new closed claim."
  evidence: 'Swept and **not** changed: `pharn/ARCHITECTURE.md` §6 ("optional `spec_kind` (hashed into the approval pin,'
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/spec-pin-kind-ambiguity/PLAN.md:95"
  problem: "Precision: /pharn-plan's input gate is check-spec-approved.mjs, not check-plan-spec-agree.mjs. The plan-to-spec chain check starts at grill. The claim's substance holds, because both shell check-spec's full validation, but the stage list attributes the wrong checker to plan."
  evidence: "`check-spec-approved.mjs` shells that validation, so the hash chain (`check-plan-spec-agree.mjs` at"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/spec-pin-kind-ambiguity/PLAN.md:170"
  problem: "The lock's TEST-FIRST paths (buildLock / testFirstReds, ac-tests-lock.mjs:158, 449-462) never read SPEC.md's kind. They read AC-TESTS.md's facts. So for a layout-A SPEC, agreement is enforced by check-test-stage (--spec exit 2 → RED spec-unusable, before any lock is read) and by checkMapping, not by the lock. 'Not touched' states the bootstrap paths only; it should state the test-first ones too, so 'every reading agrees' is not read as covering a path that has no kind reading."
  evidence: "`pharn/floor/ac-tests-lock.mjs`: `kind: null` already refuses a bootstrap write and REDs a bootstrap check."
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/spec-pin-kind-ambiguity/PLAN.md:148"
  problem: "The finding under repair names check-spec-approved.mjs directly ('check-spec and check-spec-approved stay GREEN'), but the plan exercises it only through check-ac-tests' shelled chain (check-plan-spec-agree → check-spec-approved). A direct spawn of check-spec-approved.mjs over both layouts in check-spec.test.mjs (a declared file) is the precise regression test for the reported symptom, and it is cheap (L52: name the member the finding named)."
  evidence: "`check-spec-approved` via the shelled chain, `specVerdict` / `--spec`, `checkMapping`}**, plus the controls listed"
```

### Grillers (Step 2b — 13 registered by `count-grillers.mjs`, each applied inline)

No griller finding beyond the inline set above. Per griller, in `count-grillers.mjs` order:

- **a11y**: no user interface in the increment; no finding.
- **architecture**: fit recognized. `kindLineOpensBody` sits beside `specKindLines` in `spec-template-core.mjs`, the
  grill-G9 "one reading" precedent (the kind lines the pin hashes are read there). `check-spec.mjs` already imports
  from that core. There is no new edge and no sibling reference, and `specAcceptanceCriteria` cannot import from a
  `check-*.mjs` CLI, which is why the fold sits in the predicate (D2).
- **comprehension**: rationale recognized for every non-obvious choice: the decomposition argument (D1), the rejected
  domain separation and its major-bump cost (D1a), the every-SPEC reasoning (`spec_template` is outside the pin), and
  the stated bound (D5).
- **coupling**: clean seams recognized. The AC consumers reach the new reading only through existing interfaces
  (`kind: null`, `UNUSABLE` exit 2, the `spec-kind` RED). The one shape change is the additive `kindInBody` field; the
  two `deepEqual` tests that pin the full shape are declared.
- **documentation**: presence recognized for the three docs D4 names; the five falsified sentences are the second
  inline finding.
- **error-handling**: fail-closed recognized. Both new outcomes are REDs or UNUSABLE. The predicate coerces with
  `String(body)`, so a non-string input cannot throw a new exception path.
- **i18n**: `scan-plan-i18n.mjs` `{"found":false}`; no locale-bearing strings; no finding.
- **migrations**: `scan-plan-migrations.mjs` `{"mentions":false}`. There is no data migration. The one-time upgrade
  cost (a SPEC approved in layout A REDs after `pharn update`) is stated in D5.1 and the CHANGELOG entry; no finding.
- **observability**: `scan-plan-observability.mjs` `{"mentions":false}`; the increment's observable is its CLI
  output; no finding.
- **performance**: one anchored regex test per SPEC read; no finding.
- **privacy**: `scan-plan-pii.mjs` `{"found":false}`; no finding.
- **security**: `scan-plan-secrets.mjs` `{"found":false}`. For P2, the new RED detail and UNUSABLE line are fixed
  strings, and a no-echo test is planned; no finding.
- **testability**: presence recognized. "Evals to write" names the L52 set explicitly, both moves × four readers
  plus controls. The one gap is the direct `check-spec-approved.mjs` assertion (fifth inline finding).

## Summary

The design is sound and small. The decomposition argument holds as stated, and I re-derived it here. Kind lines are
`split("\n")` pieces, so they hold no LF, and each is hashed with one trailing LF. A body that does not open with
`spec_kind:` therefore stops the left-to-right reading exactly at the boundary. The two readers use the same body:
`matchFrontmatter` is `stripBom(text).match(FM_RE)`, the regex and BOM strip `check-spec.mjs` uses.

The two important concerns are both about **what the change does to words already shipped**:

- The approved kind `pin` sends the new RED into /pharn-spec's "recompute the hash" remedy, which cannot clear it, on
  the very path the finding calls realistic.
- The every-SPEC decision contradicts five sentences promising legacy SPECs "exactly as before".

Both have remedies inside the plan's declared files plus one README. The three minor points are precision, one
unstated path, and one direct test of the checker the finding names.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory — 2 important, 3 minor) — for the human to weigh
before /pharn-dev-build. The Step 1b lessons-declaration verdict above is a separate FLOOR result and is not counted
here.
