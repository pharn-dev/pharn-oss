# SHIP — finding-backstop-class

Worktree `.claude/worktrees/finding-backstop-class`, branch `worktree-finding-backstop-class`, base
`231e422` (= `main` = `origin/main`). Nothing is committed, pushed, merged or sealed.

## Stages that ran, in order, and where the run ended

| #   | stage                | structural verdict READ                                           |
| --- | -------------------- | ----------------------------------------------------------------- |
| 1   | `/pharn-dev-plan`    | ended at its own approval halt → **GATE 1**, human approved       |
| 2   | `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit **0** (the stage's ONE floor stop)  |
| 3   | `/pharn-dev-build`   | `validate.mjs` exit **0** — `FLOOR: GREEN — 36 capabilities`      |
| 4   | `/pharn-dev-regress` | `regression-report.json` `.verdict` = **`no-regressions`**        |
| 5   | `/pharn-dev-verify`  | `verify-report.json` `.verdict` = **`PASS`**, `failing_gates: []` |
| 6   | `/pharn-dev-review`  | no structural verdict by construction — prose `REVIEW.md` only    |
| 2b  | lesson-extract       | human promoted at the promote command's own gate                  |

**The run ended at GATE 2** — the post-review human decision. No stage returned a non-GREEN verdict, so
there was no RED-verdict STOP.

## Verdicts verbatim

- `/pharn-dev-grill` → `node pharn/floor/check-plan-lessons.mjs …` **exit 0**: `applied_lessons` present,
  well-formed, all 10 cited ids resolve in canon and are body-referenced. **This covers the DECLARATION,
  never that the lessons were applied.**
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` **exit 0**.
- `/pharn-dev-regress` → `.verdict: "no-regressions"`, `regressions: []`, `pre_existing: []`; base
  `231e422…`, 3 outside gates (`tests` over 79 files, `validate`, `structural:…`) all 0→0.
- `/pharn-dev-verify` → `.verdict: "PASS"`; 7 gates each exit 0 (`test`, `validate`, `lint`,
  `format:check`, `lint:md`, `structural:…expected-injection-comment`, `reconcile`).

**Post-run, after the review fixes and the canon write:** `npm run check` **exit 0**, 2168 tests pass /
0 fail; `npm run docs:check` GREEN on both regions; `check-bash-reconcile` **CLEAN** (7 reconciled).

## Pointers (cited, not restated — P4)

- `.dev/features/finding-backstop-class/REVIEW.md` — the 4 advisory lenses, 5 findings. **Two were
  blocking-severity and both were fixed in-increment**; one of the three advisory findings became the
  lesson below.
- `.dev/features/finding-backstop-class/GRILL.md` — advisory interrogation, 6 concerns. Its one
  blocking-severity finding changed the derivation: `slice-miss` was not fail-closed, and is now gated on
  the record's `target`.
- `.dev/features/finding-backstop-class/VERIFY.md` — including the disclosure that the `reconcile` gate
  REDded on its **first** run, why that was a stale snapshot rather than a Bash escape, and how it was
  resolved with the sanctioned `--amend-scope` (never a hand-edited baseline).

## Two things this run changed that the plan did not originally contain

Recorded because a reader comparing the plan to the diff would otherwise find them unexplained:

1. **`slice-miss` gated on `target` membership** — from `GRILL.md`'s blocking finding. Same files, same
   five enum members; it makes the plan's own stated fail-closed requirement actually hold.
2. **`README.md` added to `## Files`** — `check-version-badge` holds the README shields badge equal to
   `SKILLS_VERSION`, so the bump without the badge was a RED. Declared in the plan and the setter
   re-run, per the writes-scope discipline; never routed around the hook.

lesson: promoted L47

deferred: none — the other four `REVIEW.md` findings were either fixed in-increment (2) or recorded as
named residuals rather than lesson candidates: `review-backstop-render-check` (the render half of the
axis is discipline, and L20's bar is a second occurrence with no first), and the `merge-findings.mjs`
widened change-reason (filed, minor, and a consequence of the human's option-B choice at the options
halt).

## Follow-ups recorded, not built (P7)

- **`finding-shape-sources-array`** — `pharn/pharn-contracts/finding-shape.md` never mentions `sources[]`
  at all (verified live: zero occurrences), and `review-assignments/v1` has no contract file either. This
  increment consumes both and documents neither, by the human's decision at the options halt.
- **`review-backstop-render-check`** — nothing reads a produced `REVIEW.md`, so "the render shows the
  label" is command discipline. The new closure rule pins the render **table** against the enumeration;
  it does not pin that a run emitted it.

## The honest line

Chain ran; the named floor verdicts are as shown — this is **NOT** a judgment that the increment is good
or wise; that is the human's call at the post-review gate. `SKILLS_VERSION` moved 6.3.0 → **6.4.0** and
`CHANGELOG.md` records it, but nothing here is a self-issued "shipped", an approval, or a
`PHARN ✓ reviewed` seal.
