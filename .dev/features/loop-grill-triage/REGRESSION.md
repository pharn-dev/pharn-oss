# REGRESSION — loop-grill-triage

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

`/pharn-dev-regress` catches exactly what its suite catches, nothing more: a regression no deterministic check covers
is invisible to it. This certifies the comparison below, not that the feature is whole.

- **Verdict:** `pharn/floor/check-regress.mjs verdict` exit `0` (`no-regressions`). Machine report:
  `regression-report.json` (the helper's JSON verbatim).
- **Base:** `5be519316f42a24fd248b579816e3d2ff290417f` (`HEAD`; the tree was dirty, a working-tree build), checked out
  in a detached scratch worktree. Head: this worktree.
- **Partition:** `check-regress.mjs scope --feature loop-grill-triage` exit `0`, no escapes. 32 inside paths (the
  plan's `## Files` plus this feature's own records); 177 outside test files; 1 outside eval pair.
- **Style gates:** skipped — no inside path touches a shared style config, so an outside style result cannot flip.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (177 outside files, per-test reporter)                                             | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test: base 5,904 passed, 0 failed, 7 skipped; head 5,910 passed, 0 failed, 1 skipped; `new_failures`: none.
`regressions`: none. `pre_existing`: none.

## How this run got here (stated)

The **first** run was RED: `tests` 0 → 1, with two `new_failures`, both in `pharn/floor/entry-gates.test.mjs` — its
WIRING pins anchored on the full loop's old inline-grill marker line
(`mark-phase.mjs … --kind stage-start --stage pharn-grill`), which this increment removes. That file was not in the
plan: the probe that listed the tests to change applied the routing change only, so it could not see a pin on the loop's
text (L72). The fix moved the two anchors to the new Step 4 lines (the final entry-gate wait follows the triage read;
the plan's peek precedes the grill-stop read). The file was added to `## Files`, the build's scope re-set from the plan
and the epoch re-anchored — after `check-bash-reconcile.mjs` reported `CLEAN` over all 29 build writes of the previous
epoch, so the re-anchor hid no escape. Both sides were then re-run over the new partition; this report is that run.

One earlier stop, also stated: the first `scope` call exited `1` on
`.dev/features/loop-grill-triage/GRILL-CHECK-MEASUREMENT.md` — the plan's Q3 measurement, written before the build,
outside the closed set of stage-artifact names. It is now listed in `## Files` as a pre-build record.
