# SHIP — cost-ledger-compact-rows

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`, and `check-plan-lessons` was GREEN.
   - The size was measured read-only on the downstream repo before planning. The 630-row ledger was
     33,051 lines and 960,206 bytes, and the 14 committed ledgers totalled 231,615 lines. PR #104's 38,927
     insertions were confirmed with `git show --shortstat`.
   - **GATE 1 was approved by the model under explicit user delegation (2026-09-23).** It is recorded as
     such, not as a human approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exited `0`. It raised 3 advisory concerns:
   - F1, about U+2028, came from a probe run at the grill. It was applied in the build: the contract,
     serializer header and a test now state "`\n`-delimited".
   - F2, the one-time rewrite at re-emission, was applied in the CHANGELOG.
   - F3, P3 placement, was accepted as considered.
3. `/pharn-dev-build`: `validate` exit **0** (`FLOOR: GREEN — 36 capabilities checked`). The setter parsed
   5 paths from 5 `## Files` bullets.
4. `/pharn-dev-regress`: `regression-report.json` `.verdict` = **`no-regressions`**. The base was
   `b958a12`, increment (a)'s commit. The gates were 94 outside tests, validate and 1 eval pair.
5. `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`PASS`**. There were 7 gates, including
   `reconcile` CLEAN, and `npm test` gave 2888/2888 with 0 skipped.
6. `/pharn-dev-review`: 0 floor-gate findings and 2 advisory ones, both minor and left as recorded.
7. **GATE 2:** the decision was **merge**, meaning commit this increment and open the single PR for both
   increments. It was taken by the model under the same delegation. The PR is left open, and the user
   merges.

## Build note

`render-cost-ledger.mjs` gains `ROW_ARRAYS` and `serializeLedger()`. The file write and `--stdout` both use
it. It writes `markers[]` and `requests[]` one element per `\n`-delimited line and pretty-prints the rest.
The parse is unchanged, and the output stays byte-deterministic. The contract's Size section now carries
the measured cost in lines and bytes, before and after:

- the 630-row ledger: 33,051 → 823 lines and 960,206 → 629,344 bytes;
- all 14 downstream ledgers: 231,615 → 6,922 lines.

The emitter header and `CLAUDE.md` point to that section instead of restating the old KiB figure. No
`SKILLS_VERSION` change: increment (a) already bumped this PR to 6.13.1, and this is a `### Changed` entry
in that section.

## Pointers

- `REVIEW.md`: not restated here.
- `GRILL.md`: advisory.
- `VERIFY.md`: the red-before-green and the downstream measurement.

changelog-entry: exit 0

lesson: none. A size disclosed in the wrong unit is a first occurrence of that shape, and L24's
re-measure-after-swap remedy already covers the part that recurs. L20's bar is a second occurrence.

deferred:

- Dropping `usage.iterations[]` (22.0% of the new bytes) or the verbatim `usage` copy (60.7%). Both are
  schema and fidelity decisions, considered and not taken.
- A user project's own formatter re-expanding `cost.json`. It changes bytes, never the parse.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
