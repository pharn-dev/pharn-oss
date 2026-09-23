# REVIEW — cost-ledger-verify-tail

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. The
increment under review is `trust: untrusted`. No instruction-looking content was found in the diff, the
fixture or the contract edit. The fixture's free-text-shaped fields are request ids and model tokens.

**Verdict: GREEN — 0 floor-gate findings, 3 advisory findings (all minor).**

## Floor-gate findings (blocking)

None.

- **L-floor (P0).** Every new claim reduces to a floor op or carries a bound:
  - "RED below `before`" and "RED above `live`" are integer compares over a re-derivation, the same
    primitive `--verify-transcript` already used;
  - "an inflated value up to `live` passes" is stated in the WARN text, the contract and the header, and a
    table row pins it;
  - "the before-window part is fixed" is labelled a platform behaviour, not a floor fact, in both the
    contract and `isAfterWindow`'s header.
- **L-eval (P1).** No capability, so there is no eval binding to check. The test binding is present, and it
  was RED on the unfixed code first.
- **L-trust (P2).** The new RED and WARN strings interpolate integers only, never transcript text. The
  transcript's timestamps decide which side of the end a request falls on, which is the existing
  "Transcript timestamps are untrusted" bound. `cost.json` still gates nothing, and `--verify-transcript` is
  wired into no command.
- **L-axis (P3).** `isAfterWindow` sits beside `isMember` in the window core, one definition imported by
  the emitter. `deriveLedger` stays in the emitter and the comparison in the checker. There is no sibling
  import and no second copy of the window rule.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs:478"
  problem: "`before` is computed as live − after, i.e. every excluded request NOT after the end. That set also holds a request with no parseable timestamp, or one from an unbound session inside the window's time span. The messages and the contract call all of it 'before the window'. That is true of every observed transcript, but it is a name for a residue, not a measured position."
  evidence: "const before = live - after;"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs:485"
  problem: "The continuation WARN fires whenever recorded < live. In practice that is every manual --verify-transcript run after a real stop, because the Bash call that runs the checker is itself appended after the emission. So the WARN carries the bound, but it is not a rare signal. GRILL F1 raised this, and the build kept it deliberately."
  evidence: "if (recorded !== live) {"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/cost-ledger-verify-tail/PLAN.md:139"
  problem: "The plan's eval 3 says an immediate verify 'stays exact' and calls it the control that the range did not loosen the untouched case. It did loosen the downward side: with a non-empty after-window part at emission, recorded − 1 now passes as well. The test only asserts recorded + 1 → RED and the absence of the WARN, which is accurate. The plan sentence overstates it."
  evidence: "This is the regression control that the range did not loosen the untouched case."
```

## Summary

The fix is the smallest one the current schema allows. The one input that legitimately changes after
emission (the transcript tail) is split off, the fixed part is still compared exactly, and nothing in
`cost.json` moves. `deriveLedger` is pinned byte-for-byte to `renderLedger` over six fixture shapes. The
tamper table executes both edges and one value past each, so the contract's range sentence was probed, not
read (L37). The real downstream ledger was re-checked read-only: 6.13.0 gives `RED (423 recorded, 640
re-derived)`, and this build gives exit 0 with one WARN that is exact for the 422 before the window.

The three advisory findings are wording and precision points. None changes a verdict, and they are left
as recorded.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

- **Title:** A record bound to a live referent must ask which part of that referent may still change —
  L42 recurred as a snapshot count re-derived from a growing log.
- **type:** floor · **concepts:** [temporal-state, referent-binding, append-only, snapshot-staleness,
  lesson-recurrence]
- **Why it clears L20's bar.** L42 (canon since 2026-09-10) names the class: an after-the-fact re-execution
  answers "NOW", not "THEN". `run-scoped-token-accounting` (6.9.0, 2026-09-22) then added an EQUALITY
  re-derivation of `excluded_requests` against a transcript that is still being appended to. Its plan
  cited L43 (bind to the referent) and not L42 (the referent moves). Every genuine ledger whose session
  continued went RED downstream. So this is a second occurrence of L42's class after it was canon, reached
  through L43's remedy, which says to bind a value to its referent and does not ask whether that referent is
  still being written.
- **Remedy shape.** When a check binds a recorded value to a live referent, split the referent into the
  part the record could see and the part written since. Compare the first exactly and bound the second.
  Name the split in the contract.
- **source:** `.dev/features/cost-ledger-verify-tail/REVIEW.md` (this section) +
  `.dev/features/cost-ledger-verify-tail/PLAN.md` (the defect).
