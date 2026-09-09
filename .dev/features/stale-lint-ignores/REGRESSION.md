# REGRESSION — stale-lint-ignores

**Base:** `ab9aabdf5ea5177713bda2fee82c7220ec559a7c` (working-tree dogfood → `base = HEAD`, resolved by
the deterministic state test: `git status --porcelain` non-empty).

## Inside / outside partition (computed by `pharn/floor/check-regress.mjs scope`, not by hand)

**Inside (changed since base):**

- `.markdownlint-cli2.jsonc` — the plan's one declared write
- `.dev/features/stale-lint-ignores/PLAN.md`, `.dev/features/stale-lint-ignores/GRILL.md` — this
  feature's own stage artifacts

**`escaped`: `[]`** — `scope` exited 0; the build did not write outside the plan's `## Files`.
**`escape_exempt`** returned exactly the two stage artifacts above and was **read** rather than assumed
(the L17/L20 discipline: the helper's own output is the check, and `--feature stale-lint-ignores` was
passed instead of hand-filtering `--changed`).

**Outside gates run:** `tests` (70 files), `validate`, one `structural:*` eval pair, plus the three
style gates.

**The style gates RAN — the skip did not apply, and that is the point of this increment.** The
deterministic skip rule fires only when `inside` leaves the shared style configs untouched;
`.markdownlint-cli2.jsonc` is named in that list, so a style flip is exactly the failure mode that is
possible here. Skipping them would have left the one gate this change can actually break unmeasured.

## Per-gate exit codes

| gate                                           | base | head |
| ---------------------------------------------- | ---- | ---- |
| `tests`                                        | 0    | 0    |
| `validate`                                     | 0    | 0    |
| `structural:…/expected-injection-comment.json` | 0    | 0    |
| `lint`                                         | 0    | 0    |
| `format:check`                                 | 0    | 0    |
| `lint:md`                                      | 0    | 0    |

`regressions: []` · `pre_existing: []`

## Orchestration notes (ADVISORY — the verdict rests on the exit codes, not on these)

Two deviations from the command's literal prescription, declared rather than left implicit, because the
verdict is only as trustworthy as the orchestration that captured its inputs (L5).

1. **The `tests` gate ran as `npm test`, not the prescribed `cat outside-tests.txt | xargs node --test`.**
   The harness's worktree-isolation guard refuses the `xargs` form (it cannot verify a command whose
   operands are computed at runtime). Rather than improvise an equivalent — the class of substitution
   that fabricated a red in L5, L16 and L22 — the substitution was justified by a **measured set
   equality**: `scope` returned `outside_tests` = 70, `git ls-files '*.test.mjs' '*.test.cjs'` = 70, and
   **zero** test files are inside the feature, so the outside set and the whole universe are the same
   set here. `npm test`'s globs are literals, so no computed operand is involved. The cardinality
   assertion L5 asks for is the 70 == 70 above, stated rather than assumed.
2. **The baseline worktree obtained devDeps by symlinking the repo's `node_modules`, not by `npm ci`.**
   Same install, therefore byte-identical tool versions on both sides — which is what a base/head
   comparison needs. `npm ci` would have re-resolved and could, in principle, differ.

Both are **advisory orchestration**. Neither touches `check-regress.mjs`'s comparison, which read six
gate-ids present on both sides and computed the verdict itself.

## Verdict (FLOOR — `pharn/floor/check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

**The honest residual (P0/P7):** this catches exactly what the suite catches, nothing more. A breakage
no deterministic check covers is invisible to it. "No regressions" is **not** "nothing broke", and it is
**not** a judgment that the increment is good — that is the human's call at the post-review gate.
