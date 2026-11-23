# REGRESSION — core-312-reuse-and-effort-measure

- base: `a950aaecbe752aa358383685686570e730994b40` (working-tree build, so `base = HEAD`)
- inside (changed by the build): `CHANGELOG.md`, `.dev/measurements/reuse-and-effort-2026-11-23.md`
- outside gates: `tests` (all 204 test files, through the per-test reporter), `validate`, and the one committed eval pair
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`. No style gate: the build
  touched no shared style config.
- scope check: exit 0, nothing escaped, no exemption used.

| gate                                           | base → head |
| ---------------------------------------------- | ----------- |
| `tests`                                        | 1 → 0       |
| `validate`                                     | 0 → 0       |
| `structural:…/expected-injection-comment.json` | 0 → 0       |

- **Per test:** base 7080 passed, 1 failed, 9 skipped; head 7082 passed, 0 failed, 8 skipped. New failures at head:
  none.
- **The base red:** one test failed at base and passed at head, in `pharn/floor/stage-direct.test.mjs` (the C4(a)
  runner-group-kill case, a process-timing test). The base run took 684.9 s and the head run 803.3 s, with the 1-minute
  load average read at 14.75, 15.83 and 12.46 at their start and ends. The checker files it under `pre_existing`, never as a regression.
- **Timing:** heavy lock held by CORE-312; load average at the base run's start 14.75 and at the head run's end 12.46.

**REGRESSIONS: none — no deterministically-detectable regression outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`). That covers what these gates check, never that nothing else regressed.
