# SHIP — core-345-build-regress-reuse

Linear CORE-345. `/pharn-dev-ship`, gated chain plus one fix iteration after review. Stages ran in order: plan →
GATE 1 → grill → build → regress → verify → review → fix (iteration 2) → regress → verify → review → GATE 2.

- **GATE 1:** model decision under delegation (orchestrator). It approved the decision (no offer, doc-only patch)
  with "lead with the measured fingerprint/identity mismatch, BUILD.md as the observed cause, keep the reopen
  condition, apply both grill concerns". This is not a human approval.
- **GATE 2:** model decision under delegation (orchestrator, delegated to the agent: fix blockers, otherwise proceed).
  The review raised two real P0 wording findings (which refusal `findReusable` gives first). Both were fixed in
  iteration 2 under the plan's scope, then regress, verify and review re-ran. This is not a human approval.

## Decision recorded

The build's full-gate `test` run is not offered to regress HEAD. The two runs' recorded `fp_before` differ (CORE-310
run2: `a234ec98…` vs `bc340bab…`), so their execution identities differ. The observed cause is `BUILD.md`, written
by the build after its full gate. A match would need a weaker identity than CORE-89's, and the reopen condition is
stated. Text: `pharn/pharn-contracts/gate-run-record.md` (CORE-89 section) and the `pharn/floor/gate-reuse-core.mjs`
header. Reasoning: `PLAN.md`.

## Iterations

| iteration | regress                                                                  | verify                     |
| --------- | ------------------------------------------------------------------------ | -------------------------- |
| 1         | `no-regressions` (base record kept, see REGRESSION.md note — superseded) | `PASS` (stamp `c33b5647…`) |
| 2         | `no-regressions` (both sides fresh)                                      | `PASS` (stamp `e8a9ad01…`) |

The verdict block below carries iteration 2's verdicts.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one review finding was a one-off wording slip about which refusal fires first, not a
recurrence-prone mechanism failure (L20's bar).

deferred: none

Pointers: `REVIEW.md` (findings and re-review), `GRILL.md` (advisory), `REGRESSION.md`, `VERIFY.md`.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
