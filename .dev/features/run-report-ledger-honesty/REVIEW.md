# REVIEW — run-report-ledger-honesty

**Floor:** `validate` is GREEN. Verify is `PASS` and regress is `no-regressions`. Everything below is
advisory, and the increment was treated as untrusted during review.

## Floor-gate findings (blocking)

None.

- The UNAVAILABLE label branches on the `coverage` enum.
- Staleness is an identity compare over the recorded marker `seq`/`ts`.
- Both are labelled with their bounds in the module, the CHANGELOG, `CLAUDE.md` and the command prose.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-run-report.mjs:875"
  problem: "The plan promised a 'no current ledger' prefix on ## Verdicts when the ledger is STALE. The build only dropped the ledger-derived applicability label there and relied on the top banner, so a reader who jumps to Verdicts saw unqualified reports."
  evidence: '## Verdicts renders as today, but prefixed "no current ledger"'
```

**Fixed within the planned files.** `verdictsSection` now prints "No current ledger — see STALE LEDGER
above", and the F2 test asserts it.

## Lens notes

- **L-floor (P0).** The identity comparison, adopted from GRILL finding 1, closes the reset-`seq`
  fail-open case, and a test pins it. The blind spot is stated: a failed run that also wrote no
  `run-start`.
- **L-eval (P1).** F1 is tested through the real emitter CLI, for both bounded and open windows, with a
  measured control. F2 is tested through a real failed-emission sequence on the default markers path,
  with before and after controls. The review's own probe runs 18/18 when pointed at this tree.
- **L-trust (P2).** `coverage_note` is quoted in a fence; it is emitter text that is path-free since
  6.8.2.
- **L-axis (P3).** The renderer imports `readMarkers` and `normalizeMarkers` from the emitter and
  `DEFAULT_BASE` from `mark-phase.mjs`, which is the existing direction of the import chain. Nothing is
  copied.

## Verdict

GREEN at the floor. There was 1 minor advisory finding, and it is fixed.

## Proposed lesson candidate

None. The candidate recorded by the integration review ("a new status dimension must reach every
VIEW") remains a first occurrence.
