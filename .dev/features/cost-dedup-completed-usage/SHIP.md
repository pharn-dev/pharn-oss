# SHIP — cost-dedup-completed-usage

`/pharn-dev-ship` (gated mode). The request: the cost renderers' transcript dedup kept each request's FIRST line and
so under-counted output tokens. Count the completed usage instead, keep the rule in one owner, correct the false
header claim, add an 8, 8, 163 fixture test with a mutant control, and ship it as a patch with a CHANGELOG entry.

## Where the run ended

**At the second GATE 2, which chose "Fix, then commit + PR".** The stages, in order:

1. `/pharn-dev-plan`
2. GATE 1
3. `/pharn-dev-grill`
4. `/pharn-dev-build`
5. `/pharn-dev-regress`
6. `/pharn-dev-verify`
7. `/pharn-dev-review`, iteration 1
8. GATE 2, which chose "Fix, then re-run"
9. `/pharn-dev-memory-promote`, which wrote L63
10. `/pharn-dev-build`, fix iteration 1 (PLAN.md, "Fix iteration 1")
11. `/pharn-dev-regress`, iteration 2
12. `/pharn-dev-verify`, iteration 2
13. `/pharn-dev-review`, iteration 2, by a fresh independent reviewer
14. GATE 2, which chose "Fix, then commit + PR"
15. `/pharn-dev-build`, fix iteration 2 (PLAN.md, "Fix iteration 2")
16. `/pharn-dev-regress`, iteration 3
17. `/pharn-dev-verify`, iteration 3
18. the K7 correction re-applied after verify
19. a commit, a merge of `origin/main` with the renumber, and pull request
    [#279](https://github.com/pharn-dev/pharn-oss/pull/279)

The grill ran once, on the approved plan. Neither fix iteration was re-grilled, and the second was not re-reviewed:
the maintainer chose that at the second GATE 2.

## The human gates and forms

- **GATE 1 (plan acceptance):** identity and timestamp come from the request's first line, and the plan was approved
  as written.
- **GATE 2, first pass:** R1 "Bound it", R2 "Extract a core now", "Fix, then re-run", and the lesson "Promote". The
  promote gate then answered "Accept & write".
- **GATE 2, second pass:** "Fix, then commit + PR". The fix covered S1 (the comment only), S2, S3, S4, S6, S7 and
  S10.
- **Two further forms during fix iteration 2**, each answered by the maintainer:
  - **L63's route:** the floor refused a canon edit from the build's scope, and the maintainer chose "Promote-origin
    scope".
  - **Verify's reconcile RED on canon:** the maintainer chose "Revert for verify, re-apply after" (`VERIFY.md`).

None of these was delegated. `/pharn-dev-ship` itself merges nothing and applies no seal.

## Structural verdicts, verbatim

| stage                | verdict read                           | value                                                               |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit          | `0` (GREEN)                                                         |
| `/pharn-dev-build`   | `node pharn/floor/validate.mjs .` exit | `0` (`FLOOR: GREEN — 36 capabilities`), in all three builds         |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`    | `"no-regressions"`, in all three iterations; the file holds the 3rd |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`        | `"PASS"`, in all three iterations; the file holds the 3rd           |

Verify iteration 3's first run was RED on `reconcile` alone. `VERIFY.md` records why, and the second run is the one
the report holds.

**After the merge of `origin/main`,** every gate was re-run over the merged tree:

- exit 0: `validate`, `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`,
  `check:changelog`, `check:contributing` and `test` (3604 tests, 0 fail, 0 skipped);
- exit 0: `check:changelog-entry`, against the new merge-base `ec06f7b`;
- **`check:reconcile` is RED locally, and expected.** It lists 70 escapes. By set difference against
  `git diff 767bf61 origin/main`, 69 are files PRs #277 and #278 changed, which `git merge` wrote and the build's
  epoch cannot attribute. The 70th is `.dev/memory-bank/lessons-learned.md`: the K7 correction re-applied after
  verify, and the renumber of L63's two version mentions, both made through the `Edit` tool under promote-origin
  scopes. The epoch's opening snapshot claims canon, so those writes read as escapes (`VERIFY.md`). CI has no
  baseline and reads `NO_BASELINE`. The baseline was not edited.

## Pointers

- `REVIEW.md`: two independent reviews, iteration 2 on top. Iteration 2 found 0 floor-gate and 10 minor advisory
  findings. S1, S2, S3, S4, S6, S7 and S10 were fixed in fix iteration 2; S5, S8 and S9 are follow-ups below.
- `GRILL.md`: 12 advisory concerns. PLAN.md's "Post-grill amendments" records how each was taken.
- `BUILD.md`, `REGRESSION.md` and `VERIFY.md`: every iteration, and each deviation stated.

## Recorded lines

changelog-entry: exit 0

It was run after each CHANGELOG edit, and last after the merge, against `--merge-base origin/main (ec06f7bf143d)`.

lesson: promoted L63

The human chose Promote at the first GATE 2 and Accept & write at the promote gate. The id is read from the `## L63`
heading in `.dev/memory-bank/lessons-learned.md`. `origin/main`'s canon ends at L62, so the merge caused no id
collision. Before merge, one remedy sentence was corrected (S10, K7) and two version mentions were renumbered, all
under promote-origin scopes on the maintainer's answers.

deferred:

- The iteration-2 review notes that S2 recurs [[L60]]'s class. That would be a note on L60, not a new entry.
- [[L7]] recurred in fix iteration 2. The plan declared canon in a build's `## Files`. The canon guard refused the
  write, but the declaration also put canon in the reconcile epoch's opening snapshot, so a later, authorized
  promote-origin write in the same epoch read as an escape. This is not carried, because it is one instance of L7's
  class. A remedy that removes the choice would be `set-writes-scope.cjs --from-plan` refusing canon paths. That is
  named and not built: it is the first occurrence of this consequence (P7).

## Named follow-ups (not built)

- **Non-string transcript ids and `null` ledger rows** (R11 + S9). The follow-up task runs in session `95a99e`,
  which was told that #279 moves the reader into `transcript-core.mjs`.
- **S5:** the projects-directory default is spelled out in three CLIs.
- **S8:** the "skips an unreadable subtree" test never makes anything unreadable.
- **The "standing division" paragraph in `/pharn-dev-memory-promote`** says annotating a canon entry travels the
  build path. The canon denylist has refused exactly that since 3.1.1.

## The version number

This release was planned as 6.22.1. `main` gained 6.23.0 (#277) and 6.24.0 (#278) during the run, so the merge
renumbered it to **6.24.1**. That covers every line this branch adds outside this directory, 43 lines in all. The
stage records here (PLAN, GRILL, BUILD, REGRESSION, VERIFY and REVIEW) keep the number they were written with, because
each was true when its stage ran.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
