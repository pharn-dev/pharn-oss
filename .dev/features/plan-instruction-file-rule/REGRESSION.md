# REGRESSION — plan-instruction-file-rule

**Base:** `d40667d1e998ecfc3039a658648065cba0243e9c` (`HEAD`; the working tree was dirty, so base = `HEAD`).

## Partition (from `check-regress.mjs scope`, exit 0)

- **Inside (8):**
  - `.claude/commands/pharn-plan.md`
  - `.dev/floor/command-hygiene.test.mjs`
  - `CHANGELOG.md`
  - `README.md`
  - `SKILLS_VERSION`
  - `.dev/features/plan-instruction-file-rule/{BUILD,GRILL,PLAN}.md`
- **Escaped:** none.
- **`escape_exempt`:** `GRILL.md`, `PLAN.md` (this feature's own stage artifacts).
- **Outside tests:** 129 files. **Outside eval pairs:** 1 (trust-fence).
- **Style gates:** skipped. No shared style config is inside, so a style flip over the outside files is impossible.

## Gates (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (129 outside test files)                                                           |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

`regressions: []`, `pre_existing: []`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`check-regress.mjs verdict`, exit 0, `"no-regressions"`. It catches what the suite catches, nothing more: a
breakage no test, eval or rule covers is invisible here.

## Orchestration notes (advisory)

- **The gates ran through `.pharn/pharn-dev-regress/run.mjs`, as argv arrays.** The worktree guard refuses the pinned
  `xargs` / `$?` / `printf` forms, so the runner makes the same calls: `node --test <outside tests>`, `validate`, and
  `check-structural` per pair.
- **The first attempt crashed on a runner bug,** before any results map was written: the eval pairs come back from
  `scope` as `{expected, actual}` objects, and the runner read them as strings. No partial result was recorded. The
  fixed runner ran base and head as two parallel processes, each writing its own map.
- **`LIMITS.md` was not changed while these gates ran.** A human applied the §3e patch during the first attempt and
  reverted it before this run started. `LIMITS.md` is outside `inside`, and the two runs here saw it at `HEAD`'s
  bytes.
