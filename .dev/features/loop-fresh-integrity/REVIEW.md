# REVIEW — loop-fresh-integrity

**Floor (P0): GREEN** — `node pharn/floor/validate.mjs .` exit 0 (the verify run's `validate` gate; 36 capabilities).
Everything below is **advisory**. The increment under review is `trust: untrusted`, and no instruction-looking content
was found in it.

**Verdict: GREEN — 0 floor-gate findings; 1 advisory should-fix (fixed before the PR), 2 advisory notes.**

## Floor-gate findings (blocking)

None. No guarantee claim lacks a floor reduction or an `advisory` label. No capability or `enforces` binding changed
(P1 is not engaged). No sibling reference crosses a capability root.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: "pharn/floor/check-test-stage.mjs:36"
  problem: "The new comments cite the 2026-09-24 external review as 'REVIEW finding 2' (check-test-stage.mjs:36,:98) and 'REVIEW finding 1' (check-loop-fresh.mjs:185,:547), but both files already use 'REVIEW finding N' for OTHER reviews — check-test-stage.mjs:166's 'REVIEW finding 2' is the pharn-test-stage review's policy finding — so a reader following the cite lands on the wrong finding."
  evidence: "for a fault that says nothing about the tests (REVIEW finding 2)."
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/check-loop-fresh.mjs:185"
  problem: "stampDerivedMismatch restates check-verify's verdict precedence as a relation (a second statement of another checker's table); it is proved against the real checker by the differential test, which is the right bound, but only over the worlds the test enumerates."
  evidence: "The invariant relied on, stated once: the AC gate can only ADD an AC id to `failing_gates`"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-test-stage.test.mjs:1"
  problem: "The ✧ closure over the children's `return 1` sites is a source-shape pin with an 8-line look-back window: it proves a RED print is PRESENT near each exit-1 return, not that it executes on that path — which is how the plan and the header describe it, so this is a note, not a gap."
  evidence: "const before = lines.slice(Math.max(0, i - 8), i).join(\"\\n\");"
```

### By lens

- **L-floor (P0).** Each new claim is labelled. "A forgery of the stamp-derived part STOPs" reduces to set/enum
  equality over a live re-derivation (primitive #3). The AC-only residual is stated in the header, the contract and
  the CHANGELOG, and pinned by a test. "A crashed child is UNUSABLE" reduces to exit code plus an anchored regex; the
  nested-child bound and the spoofed-line direction (fail-closed only) are stated. The ✧ closure is described as
  what it is (third finding above).
- **L-eval (P1).** No capability, no `enforces`. The behaviour is specified by the suites, with named sets: the forgery
  list × both modes, the crash kinds × both branches, the merge-order pins for both precedences, and the
  differential test's non-vacuity guard (L34). Every mutation control was observed failing on the pre-fix code:
  the review repros, and regress iteration 1, which caught the argv pin.
- **L-trust (P2).** No free text reaches a decision. Child stdout is read by one anchored regex, and the rest is
  indented diagnosis as before. Report fields are used as enum and set operands only. Nothing in the reviewed
  files tried to instruct the reviewer.
- **L-axis (P3).** `gate-run-core.mjs` names the AC half of its own `RESERVED_IDS` literal, with no second store and
  the same reason to change. check-loop-fresh's new import comes from a module it already loads. The one coupling
  (the restated precedence) is the second finding, bounded by the differential test.

## Disposition

The P6 citation finding is cheap and was fixed in this increment: each new cite names the review by date and points
to `.dev/features/loop-fresh-integrity/`. Regress and verify were re-run afterwards (SHIP.md). The two minor notes
need no change.

## Proposed lesson candidate

None proposed. Both mid-run REDs (regress iteration 1: a source-literal pin broken by an argv refactor; verify
iteration 1: a stage skipping the L13 format pass on its own artifact) are single occurrences of classes canon
already names — L45 (pinned invocations) and L13 (format your own artifact) — and L20's bar is a second occurrence
after promotion. No finding here meets it.
