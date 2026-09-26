# REGRESSION — writes-scope-run-only (after the re-review fixes, R1–R4)

- stage: `/pharn-dev-regress` — opus — set by the maintainer's instruction, overriding pharn.config.json's
  sonnet for build/regress/verify; routed via Agent subagent; effort not routed
- run: after the re-review fixes (`BUILD.md`, "After the re-review (R1–R4, 2026-09-26)"), over the working
  tree at `b9d2de5` with the fixes and the regenerated patch not yet committed. It re-ran because R2 changed
  `.claude/commands/pharn-loop.md`, which is outside the hook patch and is not a comment-only change. The
  human has not yet applied `proposed/human-only.patch`, which is the order `PLAN.md`'s chain sequencing
  sets (regress before the apply). The earlier run, after the merge and the renumber, gave the same verdict.
  Its `regression-report.json` is byte-identical to this one's, because the base, the inside set and every
  gate exit are unchanged.
- base: `1524c6ff90844ee17457ca9450a7abb894a7b1f1`. This is `git merge-base HEAD origin/main`, which is
  `main`'s tip. #277's own changes are on both sides, so the comparison covers this phase's changes on top
  of today's `main`.
- inside: 40 paths, this phase's own changes. They are the 11 product `.claude/commands/*.md`, 3 hook test
  files, the feature's own pipeline artifacts and `proposed/*`, `.dev/floor/command-hygiene.test.mjs`,
  `CHANGELOG.md`, `CLAUDE.md`, `README.md`, `SKILLS_VERSION`, `pharn/floor/README.md`, the edited and new
  `pharn/floor/*.mjs` checkers with their tests, and the two edited contracts.
  - **`escaped: []`**: nothing changed outside the plan's declared `## Files`.
  - `escape_exempt` lists exactly the feature's own stage artifacts: `BUILD.md`, `GRILL.md`,
    `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json` and `verify-report.json`.
  - `handoff/` is not in the diff: it was added and deleted inside the phase, and it was recreated for the
    renumber only in a scratch worktree.
- outside gates run. The style gates were SKIPPED: `inside` touches no shared style config, which the
  runner asserts.

  | gate                                                                                           | base | head |
  | ---------------------------------------------------------------------------------------------- | ---- | ---- |
  | `tests` (103 outside `*.test.mjs` / `*.test.cjs` files, one argv array — never a shell string) | 0    | 0    |
  | `validate` (`pharn/floor/validate.mjs .`, whole-repo)                                          | 0    | 0    |
  | `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`     | 0    | 0    |

  There are 103 outside test files where there were 98 before the merge. The new files are #277's own
  tests, which are outside this phase's scope.

- `regressions`: **none**
- `pre_existing`: **none**
- how it ran: the command's Steps 1–3 as one node runner under `.pharn/pharn-dev-regress/`, with argv
  arrays. This isolated worktree refuses the pinned `xargs` form, so the runner passes the same file list
  as one argv array. The base checkout was a detached worktree under `.pharn/pharn-dev-regress/`, removed
  before the head side ran.

## REGRESSIONS: none — no deterministically-detectable breakage outside the feature

`check-regress.mjs verdict` exited **0** (`"verdict": "no-regressions"`). Every outside gate this suite
covers was GREEN at `main`'s tip and is still GREEN at HEAD.

**The honest residual:** `/pharn-dev-regress` catches exactly what its suite catches: a deterministically
detectable pass→fail flip, nothing more. It does not certify that nothing broke. This phase expects 36
tests to fail before the human apply. They assert the patched guard against the still-unpatched hooks,
and all 36 are **inside** the declared scope, so they are `/pharn-dev-verify`'s designed STOP, not
regressions. None of the 103 outside files is among them, and this report's own `tests` gate (0 → 0)
confirms that deterministically.
