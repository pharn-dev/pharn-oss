# SHIP — changelog-per-pr

**Where the run ended:** GATE 2, after five iterations of the verification body.

## Human gates

The maintainer's standing delegation for queued `/pharn-dev-ship` runs covers the first two gates. Each
is recorded here as a **model decision**, never as a human approval.

- **GATE 1 (plan approval) — a model decision under that delegation.**
  - The plan deviated from the brief in 13 places, each with a stated reason (D1–D13), because the brief
    predated #249.
  - It went through one adversarial self-review round before approval, which falsified 6 claims; they were
    corrected inline.
- **GATE 2 (merge / fix / abandon) — a model decision under that delegation.**
  - Reviews 1 and 2 were blocked, and the decision was fix both times. Review 3 was GREEN with advisory
    findings, which were closed in a third fix round. Review 4 was GREEN with none.
  - The final merge is the maintainer's: this command never merges, and the auto-mode classifier
    previously refused `gh pr merge --admin`.
- **Step 2b (lesson) — decided by the human in this session**, through two interactive answers: "Promote",
  then "Accept & write".

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`. `check-plan-lessons.mjs` GREEN, with 19 lessons declared.
2. `/pharn-dev-grill` → `GRILL.md`.
   - **Floor verdict:** `check-plan-lessons.mjs` exit **0**.
   - 11 advisory concerns, all folded into the plan as dispositions before build.
3. `/pharn-dev-build`.
   - Scope set to exactly the plan's 16 paths, and the reconciliation epoch anchored.
   - **Floor verdict:** `node pharn/floor/validate.mjs .` exit **0**.
4. The verification body, run five times. Each fix round was recorded in the plan (R1–R6 and the review-3
   dispositions) and re-scoped to the same 16 paths.

   Iteration 5 re-ran after R7. At ship time a pre-existing test on `main`
   (`.claude/hooks/require-loop-record.test.cjs`, dated from a fixed clock under a 24-hour ceiling) began
   failing every branch at 2026-09-23T12:00Z. It was declared in the plan and fixed in one line, with its
   own dated CHANGELOG entry.

   | iteration | `/pharn-dev-regress` `.verdict` | `/pharn-dev-verify` `.verdict` | `/pharn-dev-review`                                 |
   | --------- | ------------------------------- | ------------------------------ | --------------------------------------------------- |
   | 1         | `no-regressions`                | `PASS`                         | blocked — 3 floor-gate findings                     |
   | 2         | `no-regressions`                | `PASS`                         | blocked — 3 floor-gate findings                     |
   | 3         | `no-regressions`                | `PASS`                         | GREEN — 0 floor-gate, 6 advisory (fixed in round 3) |
   | 4         | `no-regressions`                | `PASS`                         | GREEN — no findings                                 |
   | 5         | `no-regressions`                | `PASS`                         | GREEN — no findings (the R7 delta)                  |

## Standing verdicts, verbatim

- `/pharn-dev-build` → `validate` exit `0`
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: `no-regressions`
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: `PASS`. The eight gates, all `0`:
  - `test` (2774 tests, iteration 5);
  - `validate`;
  - `lint`;
  - `format:check`;
  - `lint:md`;
  - `structural:…`;
  - `changelog-entry`;
  - `reconcile` (`CLEAN`).
- `changelog-entry: exit 0` (Step 2c: `git fetch --no-tags origin main`, then `npm run check:changelog-entry`; re-run after R7, still `0`)

## Pointers

- `REVIEW.md` — four iterations, each finding in finding-shape. Not restated here.
- `GRILL.md` — advisory.
- `REGRESSION.md`, `VERIFY.md` — the human renders of the two floor verdicts.

## Lesson

lesson: promoted L55

L55 is "A check that re-derives a renderer's structure must be probed against the renderer — fixtures
written from the author's model certify that model". It is read from its `## L55` heading in
`.dev/memory-bank/lessons-learned.md`, and `docs/lessons-index.md` was regenerated
(`check-lessons-index.mjs` GREEN).

deferred:

- **The dead line cite at `pharn/floor/gate-run-core.mjs:15`** (`CHANGELOG.md:1817-1818`). The fix is the
  version-anchored cite `CHANGELOG [6.3.0]`. It is product surface, so it waits for the next increment
  that bumps.
- **L43's referent check** (bind a `SKILLS_VERSION` bump to the product bytes it covers) — still unbuilt.
- **L55's remedy: a differential test against a reference Markdown parser.** It needs a dependency
  decision (markdown-it is only transitive today). Until then, the stated exceptions stay places where the
  grammar and GitHub can differ: setext headings, nested items, blockquotes, and HTML types 6/7.
- **Lesson candidate, not taken this run** (one per run). A test that spawns a CLI cannot inject a clock, so any
  fixture that CLI judges by time must be dated from the real clock, or the test carries an expiry date. The instance
  is R7's `require-loop-record.test.cjs`, which was GREEN in CI for a day and then RED everywhere. This neighbours
  L41 (a default every test overrides).
- **Git tags / GitHub releases** — still not cut (carried from #249).
- **README "Since `6.5.0`" and the CLAUDE.md "COST LEDGER trio (added 6.5.0)" wording** — carried from
  #249's SHIP.md, untouched here.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
