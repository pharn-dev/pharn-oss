# REVIEW — docs-sync-6-11

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Everything
below is advisory.

The increment is treated as `trust: untrusted`. The `pharn-cli` source read during discovery was also
treated as data. Neither contained instruction-looking content aimed at the reviewer.

## Floor-gate findings

None.

- **L-floor → P0.** The one new guarantee (the gate-runner row) claims exactly the four facts
  `gate-run-record.md` lists under "What a validating stamp PROVES". Its bound carries the contract's
  forgery, ran-at-all and freshness limits, with `check-loop-fresh.mjs` named as the narrowing. Every
  install claim is prose, and the plan and VERIFY.md label it advisory. No sentence calls anything
  guaranteed that is not.
- **L-eval → P1.** No Capability was touched.
- **L-axis → P3.** Each file changes for one reason: docs catching up with shipped behaviour. `APPLY.md`
  gains one checklist step.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "README.md:337"
  problem: "The new row says 'the verify and regress verdicts' without naming `/pharn-verify` / `/pharn-regress`. In README's product context that is the right reading. But this repo's own `/pharn-dev-verify` and `/pharn-dev-regress` still assemble their maps in shell, which this very run did. A contributor reading README inside the repo could over-apply it."
  evidence: "The verify and regress verdicts are computed from a gate map the gate runner wrote, not one a model typed"
```

This is left as is. README is the product page, and the dev pipeline is described in `CLAUDE.md`.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "README.md:199"
  problem: "The dated clause 'As of `6.11.1` … lands inert' is still a sentence that will expire. The `APPLY.md` step makes its revision part of the checklist the human follows, but following a checklist is advisory. Nothing detects the clause going stale."
  evidence: "As of `6.11.1` the `settings.json` PHARN ships does not register it, so it lands inert."
```

This is accepted and stated. A checker would need a trigger (P7), and there has been no failure.

## Verdict

**GREEN — 0 floor-gate findings, 2 advisory (minor).**

No lesson candidate. Site 4 is a recurrence of L33's own shape, and L33 already names the remedy that
found it (re-derive the claim from the referent's source). A second lesson would restate it.
