# SHIP — test-infra-plan-scope

`/pharn-dev-ship` (gated mode, not `--loop`), run in an isolated worktree for the review-fix group B. The branch is
`review-fix/test-infra-plan-scope`. It started at `7bcd7a8` (6.20.5), was rebased onto `8eec2d7` (6.20.6, #269), and
then onto `67b7b8b` (6.20.7, #270). It ships `SKILLS_VERSION` **6.21.0** (MINOR).

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`; the lessons declaration self-check is GREEN. **GATE 1** (delegated, below).
2. `/pharn-dev-grill` → `GRILL.md`. **Floor verdict read:** `check-plan-lessons.mjs` **exit 0**. It raised 9 advisory
   concerns (3 important, 6 minor, 0 blocking); all 9 were folded into the build (PLAN.md, "Amended after grill").
3. `/pharn-dev-build` → `BUILD.md`. **Floor verdict read:** `node pharn/floor/validate.mjs .` **exit 0** (GREEN). This
   was re-confirmed after each rebase and after the review fixes.
4. `/pharn-dev-regress` → `regression-report.json`. **Floor verdict read:** `.verdict` = **`no-regressions`**. It ran
   three times: against `7bcd7a8`, `8eec2d7` and `67b7b8b`, all `no-regressions`. The last one is recorded.
5. `/pharn-dev-verify` → `verify-report.json`. **Floor verdict read:** `.verdict` = **`PASS`**, every gate 0,
   including `reconcile` (CLEAN). It ran twice: on `36e09c7` and on the final `20ef275`, both PASS.
6. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 4 advisory (1 important, 3 minor).
   **GATE 2** (delegated, below).

The run ended at **GATE 2**.

## The rebases (main moved twice during the run)

- **Onto `8eec2d7` (6.20.6).** `SKILLS_VERSION`, the README badge and the CHANGELOG conflicted; `[6.21.0]` was
  re-inserted above `[6.20.6]` and renumbered. Main's new crashed-child test in `check-test-stage.test.mjs` then
  failed. It broke `test-infra-core.mjs` to crash the lock child, which this increment now also loads from the mapping
  child. The lock cases now break `red-run-core.mjs`, which only the lock child loads, and a fourth case pins the
  shared-dependency crash (`ffc6f1c`; BUILD.md, "Amended during the rebase").
- **Onto `67b7b8b` (6.20.7).** The conflicts were the same three version files, resolved the same way. Main's
  sections are byte-identical, and the `[6.21.0]` text is unchanged except for its bump line (6.20.7 → 6.21.0). A
  double blank line from the re-insertion was fixed (`16cb080`). All suites touching the changed modules passed
  (417/417) before regress and verify re-ran.

## GATE 1 — plan acceptance (a model decision under delegation, NOT a human approval)

The user's instruction (2026-09-24, verbatim): _"fix all findings, if you can ship some of them at one run do it, if
you can ship some of them simultaniuslly in worktrees do it. each fix needs to be fixed by using pharn-dev-ship command
and needs to ends by merged pull request. you merge pull requests when the CI are green."_ Under it, the orchestrating
session approved the plan **as written**, including MINOR 6.21.0. Its reasoning: every plan the new RED catches could
already never reach green, the one previously-passable case is fixed by deleting a line, and nothing changes shape.
That is the same classification `[6.19.0]` and `[6.20.0]` used in this pipeline. The approval attached four notes, all
honoured:

- one predicate, imported, never a second regex;
- the NOTE never changes an exit code, with a test;
- the end-to-end test is appended in its own `describe` block;
- edits in `check-ac-tests.mjs` and `ac-tests.md` stay local.

PLAN.md, "GATE 1 — delegated decision", records it.

## GATE 2 — merge / fix / abandon (a model decision under delegation, NOT a human approval)

**Decision: merge once CI is green.** This is the delegated rule applied to the standing verdicts, not a judgement
that the increment is good:

- The floor verdicts are all green: `validate` exit 0, regress `no-regressions`, verify `PASS`.
- `REVIEW.md` has no blocking finding.
- The cheap should-fix findings were fixed, and regress and verify were re-run over them (`3b5e696`):
  - **important (P0):** the CHANGELOG's quantified claim is now backed by a ★ HOOK test over all six probed PLAN
    spellings (it had two), and names that set;
  - **minor (P7):** the split `spec_kind: test-infra` code span in `pharn-test.md` was reworded.
- The other two minor findings are recorded, not actioned. The first is the `/pharn-verify` and S13 remedy wording,
  where the contract is the one copy. The second is the mapping checker's larger load graph, already handled at the
  rebase.

The orchestrator merges; this run does not.

- review: [`REVIEW.md`](./REVIEW.md) (findings are not restated here, P4)
- grill: [`GRILL.md`](./GRILL.md) (advisory)
- changelog-entry: exit 0
- lesson: none — the one fixed review finding is L52/L37 recurring (a quantified claim backed by a smaller test set),
  which canon already names; a new entry would restate them (P4), and "a prose quantifier matches a test's member
  set" has no deterministic check to escalate to
- deferred: a test that breaks a shared module to crash one particular child silently changes which child crashes
  when the module's importer set grows (6.20.6's crashed-child test, above). It was caught by the test's own
  child-name assertion, so this is a first occurrence, below L20's bar.

## Protected docs

No trusted-doc change was needed. `LIMITS.md` §AC evidence defers "what the pin does not see" to
`pharn/floor/test-infra-core.mjs`'s header, which this increment amends, so there is no `PROTECTED-FOLLOWUPS.md`.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
