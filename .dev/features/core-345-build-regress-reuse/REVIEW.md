# REVIEW — core-345-build-regress-reuse

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Everything below is
advisory. The increment under review is `trust: untrusted`; no instruction-looking content was found in it.

Reviewed diff: `pharn/floor/gate-reuse-core.mjs` (header comment), `pharn/pharn-contracts/gate-run-record.md` (one
bullet), `.dev/guides/floor-gates.md` (one block), `SKILLS_VERSION`, `CHANGELOG.md`, `README.md` badge,
`pharn-install.json` (regenerated).

## Floor-gate findings

None. No capability, `enforces` binding, eval or module reference changed (L-eval, L-axis: nothing to bind).

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/pharn-contracts/gate-run-record.md:214"
  problem: "The bullet says findReusable would answer identity-mismatch, but given a build stamp findReusable refuses first with source-invalid (validateStamp expects a regress/head stamp); identity-mismatch is what the identity comparison would say even past that check, so the sentence names the wrong first failure."
  evidence: "so their `identity_sha256` differ and `findReusable` would answer `identity-mismatch`"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/gate-reuse-core.mjs:59"
  problem: "Same imprecision in the header note: 'would miss (identity-mismatch)' without saying the stamp-kind check refuses a build stamp first."
  evidence: "the build's run is not this tree's evidence and would miss (`identity-mismatch`)"
```

Every other claim is labelled as measured (stamps, transcript order) or as a design reason; none is sold as a
guarantee. The decision rests on the recorded `fp_before` / `identity_sha256` mismatch (content digests in committed
evidence), with BUILD.md as the observed cause, as GATE 1 asked.

### L-trust → P2

No finding. The run2 transcript and stamps were read as DATA; only digests, timestamps and paths are quoted.

### L-axis → P3

No finding. The `gate-reuse-core.mjs` note is phrased as an equivalence fact (its axis), not as an offer policy
(`head-reuse-offer.mjs`'s).

## Disposition (GATE 2 delegated to the agent: fix real findings)

Both P0 findings are real wording errors in shipped prose and are fixed in a second iteration (scope re-set from the
plan's `## Files`), followed by a fresh regress and verify. See `SHIP.md` for the iteration record.

Lesson candidate: none. A wording slip about which refusal fires first is a one-off, not a recurrence-prone mechanism
failure (L20's bar).

Verdict (iteration 1): GREEN floor; 2 advisory findings (1 important, 1 minor), both to be fixed before the PR.

## Iteration 2 re-review

Floor: `validate` GREEN; regress `no-regressions` (both sides fresh); verify `PASS` (stamp `e8a9ad01…22dd`).

The fix is in both places. `gate-run-record.md` now reads "`findReusable` would refuse a build stamp first as
`source-invalid` (it accepts a regress/head stamp only), and past that check its identity comparison would still
answer `identity-mismatch`". The `gate-reuse-core.mjs` header says the same. This matches the code:
`findReusable`'s first line is `validateStamp(…, {stage: REUSE_SOURCE.stage, side: REUSE_SOURCE.side})`. The
contract bullet's delegation sentence now names the agent → orchestrator → maintainer chain accurately. No new
findings in the four lenses.

Verdict (iteration 2): GREEN floor; 0 open findings.
