# REGRESSION — loop-entry-peek-before-spec

- base: `d2da72dc38c1d4a80c4ace6f54a6e4456928c71e` (working-tree build, so base = HEAD: the L87 promotion commit on
  `94347bc8`)
- inside (15): the plan's ten `## Files` paths plus this feature's own stage artifacts (`escape_exempt`)
- outside: the remaining tracked test files, `validate`, one structural eval pair; no style gate (no shared style
  config touched)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (per-test record)                                                                  | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: none
- per-test: base 7,168 passed / 0 failed / 9 skipped; head 7,176 passed / 0 failed / 1 skipped; new failures: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

Honest residual: this comparison catches what the outside suite catches, nothing more.

## History — the first run of this plan (STOP)

The first run stopped here with `verdict: regressions`: `.dev/floor/command-family.test.mjs` R4/R5 failed at head
only, because the build had reworded `/pharn-loop`'s close-part pointer sentence, which that test pins verbatim and
which was outside `## Files`. The human chose to re-plan with the test; the re-plan adds it to `## Files`, and this run
is the regress stage re-run after that re-plan's grill and build.

## History — the GATE 2 "fix" round

At GATE 2 the human chose to fix the review's stop-wording finding first. The re-run after that build stopped at
`check-regress.mjs scope` (exit 1, before any gate ran): `.dev/memory-bank/lessons-learned.md` and
`docs/lessons-index.md` read as escapes, because the L87 promotion had been made after verify and nothing was
committed, so they sat in `git diff <base>` beside the build's paths. The human approved committing the promotion
alone (`d2da72dc`); this report is the re-run on that base.

How the gates ran (both runs): Step 2's pinned `xargs` form is refused in this worktree-isolated session, so a
scratchpad node runner spawned the same gates (`node --test` with the per-test reporter at an absolute path,
`validate.mjs`, `check-structural.mjs`) at a base worktree and at HEAD, then `check-regress.mjs verdict` with
`--per-test`.
