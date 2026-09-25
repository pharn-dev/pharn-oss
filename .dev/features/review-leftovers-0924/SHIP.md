# SHIP — review-leftovers-0924

The user asked for the six review leftovers as one `/pharn-dev-ship` increment ending in an opened pull request:
_"Run them as ONE `/pharn-dev-ship` increment … Open a PR and merge it only when CI is green and the user has asked
for it."_ Both human gates are therefore recorded as **model decisions made under that delegation**, never as human
approvals. The **merge is not delegated**: it waits for the user's explicit request. The Step 2b lesson question and
`/pharn-dev-memory-promote`'s accept/deny were asked of the user in the session, and the user answered both.

## Stages, in order

1. **`/pharn-dev-plan`** wrote `PLAN.md` and halted. `check-plan-lessons.mjs` exit 0.
   **GATE 1 was a model decision under delegation:** the plan was approved as written, including item 6 (the
   optional dedicated RED kind) and two widenings past the prompt's letter. Item 4 covers the sibling crash sites.
   Item 5 covers all sixteen stale line cites. The decision is recorded in `PLAN.md`.
2. **`/pharn-dev-grill`** was run by an independent reader agent and wrote `GRILL.md`. **Verdict read (FLOOR):
   `check-plan-lessons.mjs` exit 0.** It raised 10 advisory findings (1 blocking-severity, 4 important, 5 minor), and
   none gates. All ten were absorbed before the build ("Post-grill amendments" in `PLAN.md`). The new kind was
   renamed `pin-layout` → `kind-in-body`, so it shares no prefix with `pin`.
3. **`/pharn-dev-build`**. **Verdict read (FLOOR): `node pharn/floor/validate.mjs .` exit 0** (GREEN, 36
   capabilities). One build-time addition to D4 is recorded in `BUILD.md`: `base_sha` reaches `git` only as a commit
   id. Before, `--output=<file>` made git write that file.
4. **`/pharn-dev-regress`**. **Verdict read (FLOOR): `regression-report.json` `.verdict` = `no-regressions`**
   (base `cf90897`; `tests` over 101 outside files, `validate` and the eval pair, all 0 → 0).
5. **`/pharn-dev-verify`**. **Verdict read (FLOOR): `verify-report.json` `.verdict` = `PASS`**, `failing_gates: []`.
   Raw `lint:md` was 1, all of it from the gitignored `.agents/`, which CI never has. The clean copy gave 0, and both
   are recorded in `VERIFY.md`. `reconcile` was `CLEAN`.
6. **`/pharn-dev-review`** was run by an independent reader agent and wrote `REVIEW.md`: floor GREEN, 7 advisory
   findings, all minor.

**GATE 2 was a model decision under delegation: fix.** Findings 1–6 were fixed within the plan's `## Files`, and
finding 7 (the verdict enums are a third copy; drift fails safe) was accepted and documented in the code.
`BUILD.md` "Iteration 2" has the details, including the measured mutation checks that the two ★ tests now fail on
their defect. `base_sha`'s guard was widened to 7–64 hex digits of either case, so every spelling of a commit id git
accepts still works. Its narrowing to commit ids is ratified here. Then:

- **iteration 2 regress:** `.verdict` = **`no-regressions`** (`check-regress.mjs verdict` exit 0);
- **iteration 2 verify:** `.verdict` = **`PASS`** (`check-verify.mjs` exit 0, byte-identical verdict JSON);
- after the promotion: the `npm run check` chain was run script by script. Every script exited 0 (`test`
  3290/3290, `check:reconcile` `CLEAN`, `docs:check` GREEN), except raw `lint:md`, whose red is the same
  environment-only one as above.

## Standing verdicts, verbatim

- `/pharn-dev-build`: `validate` exit **0**
- `/pharn-dev-regress`: `regression-report.json` `.verdict` = **`no-regressions`** (base `cf90897`)
- `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`PASS`**, `failing_gates: []`

Pointers: `GRILL.md` (advisory), `REVIEW.md` (advisory), `BUILD.md`, `REGRESSION.md`, `VERIFY.md`.

- changelog-entry: exit 0
- lesson: promoted L60
- deferred:
  - a floor check that bans `file:line` cites on the product surface. `PLAN.md` "Sweeps" names it and the allowlist
    it would need for historical labels. This is its second occurrence after 6.13.0's CHANGELOG line cite, so it
    is a candidate for its own increment.
  - `/pharn-spec`'s Draft-step kind list omits `input` (an unreadable file). This was noticed in planning and is out of
    this increment's scope.
  - `.agents/` is not in `.markdownlint-cli2.jsonc`'s ignores, so a local `lint:md` goes RED in a checkout that has
    it, the same way the `.claude/worktrees` case 6.13.1 fixed. This is environment-only: CI does not have it.

_The chain ran, and the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise.
That call belongs to the post-review gate, held here by the orchestrator under the delegation quoted above. The
merge waits for the user._
