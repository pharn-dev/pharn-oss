# SHIP — ship-lesson-extract

Gated `/pharn-dev-ship` run (no `--loop`). Ended at **GATE 2**.

## Stages that ran, in order

| #   | stage                | structural verdict read                       | value                        |
| --- | -------------------- | --------------------------------------------- | ---------------------------- |
| 1   | `/pharn-dev-plan`    | — (GATE 1, human approval halt)               | approved as written          |
| 2   | `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit code            | **0** (GREEN)                |
| 3   | `/pharn-dev-build`   | `pharn/floor/validate.mjs .` exit code        | **0** (GREEN, 36 caps)       |
| 4   | `/pharn-dev-regress` | `regression-report.json` `.verdict`           | **`"no-regressions"`**       |
| 5   | `/pharn-dev-verify`  | `verify-report.json` `.verdict`               | **`"PASS"`**                 |
| 6   | `/pharn-dev-review`  | — (no structural verdict; advisory by design) | 1 blocking finding, remedied |
| 2b  | lesson-extract       | — (advisory; gates nothing)                   | see `lesson:` below          |

Each proceed decision was read from the verdict named in its row, never from a stage's prose or my
assessment. No verdict came back non-GREEN, so the run reached GATE 2 rather than a RED-verdict STOP.

## Artifacts (cited, not restated — P4)

- `.dev/features/ship-lesson-extract/PLAN.md` — the approved plan (11 cited lessons)
- `.dev/features/ship-lesson-extract/GRILL.md` — advisory interrogation, 6 concerns
- `.dev/features/ship-lesson-extract/REGRESSION.md` + `regression-report.json`
- `.dev/features/ship-lesson-extract/VERIFY.md` + `verify-report.json`
- `.dev/features/ship-lesson-extract/REVIEW.md` — 1 floor-gate finding (remedied) + 4 advisory

## lesson

**`lesson: promoted L36`**

`deferred: none` — Step 2b proposed exactly one candidate and no further candidate was surfaced but left
uncarried.

The run **dogfooded the step it built**: `/pharn-dev-review` proposed the candidate, Step 2b.3 asked and
the human answered _Promote_, and the write went through `/pharn-dev-memory-promote` — which set its own
writes-scope to the one canon file, ran `.dev/floor/check-provenance.mjs` (GREEN: provenance valid, `L36`
unique, `type: floor`, 5 concepts), and held its **own** accept/deny gate before appending. Two human
answers were required and both were given; `/pharn-dev-ship` never held write-scope to
`.dev/memory-bank/**` at any point. `<n>` = 36 was read from the `## L<n>` headings in canon after the
promote returned, not from that command's printed output (L6).

`docs/lessons-index.md` was regenerated with the narrow generator (`node .dev/floor/gen-lessons-index.mjs .`,
not `npm run docs:generate` — L22) and `check-lessons-index.mjs` is GREEN at 36 lessons, 36 tagged, 0
malformed, 0 untagged. Canon and index are two files in one logical change and belong in the same commit.

## Two corrections this run made rather than shipped

Recorded because a run that reports only its green verdicts is not reporting what happened.

1. **The writes-scope setter parsed 5 paths against the 3 the human approved** (`/pharn-dev-build` Step 0).
   The plan's exclusion list opened with a **bold prose intro rather than a heading**, so the setter swept
   `.claude/commands/pharn-ship.md` and `SKILLS_VERSION` into scope — both files the plan explicitly
   excludes, and the latter one this increment must not bump. This is **L18's defect recurring exactly as
   L20 predicts**, in the dangerous direction, and it was caught only because the setter prints its path
   count and the count was read. Remedy: the exclusion subsection is now a `### Explicitly not touched`
   heading, so the list ends **structurally**; the re-run parsed 3.
2. **`/pharn-dev-review` found a blocking defect that all six verify gates were green over.** The
   enumerated outcome `not-reached` shipped in two spellings (`(<stage>)` and `(<stop>)`) — in the
   increment whose stated purpose was to close that set. Fixed, plus a **closure** assertion added
   (every back-ticked `lesson: …` the command writes must match a member), mutation-tested against the
   pre-fix text. Both `regression-report.json` and `verify-report.json` were then **recomputed** rather
   than carried forward; a PASS about a tree that no longer existed would have been the disease.

## Standing state at GATE 2

`npm run check` **exit 0** — 8 gates, **1683 tests, 1683 pass, 0 fail** (1671 → 1683; +12 from this
increment). `pharn/floor/validate.mjs .` GREEN. `SKILLS_VERSION` **unchanged at 3.0.1** — a `pharn-dev-*`
command and a `*.test.mjs` are both outside the bump-triggering set, and the product surface is untouched.

Files changed: `.claude/commands/pharn-dev-ship.md`, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`
(the plan's declared three) plus `.dev/memory-bank/lessons-learned.md` and `docs/lessons-index.md` from the
separately-gated promotion, and the feature's own artifacts under `.dev/features/ship-lesson-extract/`.

## The honest line

The chain ran; the named floor verdicts are as shown. **This is NOT a judgment that the increment is good
or wise; that is the human's call at the post-review gate.** In particular: the increment's only real
behavior — propose, ask, route, record — is verified by **prose-shape assertions and nothing else**,
because commands carry no `role:`, ship no evals, and no runner can execute a behavioral case over one.
**"The wiring is pinned" never means "the lesson was extracted."** The one property a gate genuinely holds
is the L7 guard: `writes:` names no canon path, so the fix #7 hook denies a Write-tool canon write from
this command — floor for the `PreToolUse` surface only, since a Bash-run append would bypass it (L19).
