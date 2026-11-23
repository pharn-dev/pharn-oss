# REGRESSION — core-311-stage-agent-benchmark

**REGRESSIONS: none — no deterministically-detectable regression outside the feature** (`check-regress.mjs verdict`
exit 0, `regression-report.json` `.verdict: "no-regressions"`). That is the verdict over the gates below, never a claim
that nothing regressed.

- **Base:** `ead56eadd4c42f044d5fd803ee3147986aa90c95` (`git merge-base HEAD origin/main`; the tree was clean after the
  merge of origin/main, so the base rule's second branch applied).
- **Inside (8):** the plan's six `## Files` paths plus this feature's `PLAN.md` and `GRILL.md`: `PLAN.md`, `GRILL.md`,
  `measure.mjs`, `measure-output.json` (this feature), `.dev/measurements/stage-agent-benchmark-2026-11-23.md`,
  `.dev/features/lean-stage-agent/SHIP.md`, `.dev/guides/product-commands.md`, `CHANGELOG.md`. `scope` exit 0;
  `escape_exempt`: this feature's `PLAN.md` and `GRILL.md`.
- **Outside gates:** 204 test files through the per-test reporter, `validate`, and the one committed eval pair
  (`structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`). No style config is
  inside, so the style gates were skipped on both sides.

| Gate                                             | Base | Head |
| ------------------------------------------------ | ---: | ---: |
| tests (per-test: 7,081 / 7,082 passed, 0 failed) |    0 |    0 |
| validate                                         |    0 |    0 |
| structural: trust-fence expected-injection       |    0 |    0 |

## The earlier attempt, recorded verbatim (a STOP that was re-run, not waved through)

The first run against this base (16:22–17:05) read `"verdict": "regressions"`, `"regressions": ["tests"]`, with one
new head failure:

```text
pharn/floor/entry-gates.test.mjs::CLI cache (AC3): a green clears the slot; a timed-out, a style-only or a peeked red is never recorded
```

The 1-minute load average ran up to about 136 during it (other projects' test runs on this host). That test is timing-
sensitive, and the increment changes no product code and no test. Per the ship command's STOP rule the stage was re-run
once the load fell below 20 (17:09–17:24, load 3–13); the second run is the verdict above. The first run's maps and
verdict are kept in `pharn/.run/pharn-dev-regress/attempt1/`.

Two earlier runs before the origin/main merge (base `e8f0527e`, dirty tree) are superseded by the merge: the first
crashed in the run script before any verdict (an eval pair read as a string), the second read `no-regressions`.
