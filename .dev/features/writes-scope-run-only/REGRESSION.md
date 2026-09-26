# REGRESSION — writes-scope-run-only (after GATE 2 fix)

- stage: `/pharn-dev-regress` — opus — set by the maintainer's instruction, overriding pharn.config.json's
  sonnet for build/regress/verify; routed via Agent subagent; effort not routed
- run: after the GATE-2 fix pass, over the working tree (uncommitted), before the human applies
  `proposed/human-only.patch` — the order `PLAN.md`'s chain sequencing sets (regress before the apply)
- base: `767bf61f493f73c859a9820a01bddcb8f4f40a8d` (`git merge-base HEAD origin/main` — the phase's fork
  point from `main`, the same base the first regress run used, so the comparison covers the whole phase)
- inside (40 paths, this phase's own changes): the 11 product `.claude/commands/*.md`, 3 hook test files, the
  feature's own pipeline artifacts and `proposed/*`, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md` /
  `CLAUDE.md` / `README.md` / `SKILLS_VERSION`, `pharn/floor/README.md`, the edited and new `pharn/floor/*.mjs`
  checkers with their tests, and the two edited contracts. **`escaped: []`** — nothing changed outside the
  plan's declared `## Files`; `escape_exempt` lists exactly the feature's own stage artifacts (`BUILD.md`,
  `GRILL.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`).
  `handoff/` is not in the diff: it was added and deleted inside the phase.
- outside gates run (style gates SKIPPED — `inside` touches no shared style config, asserted by the runner):

  | gate                                                                                          | base | head |
  | --------------------------------------------------------------------------------------------- | ---- | ---- |
  | `tests` (98 outside `*.test.mjs` / `*.test.cjs` files, one argv array — never a shell string) | 0    | 0    |
  | `validate` (`pharn/floor/validate.mjs .`, whole-repo)                                         | 0    | 0    |
  | `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`    | 0    | 0    |

- `regressions`: **none**
- `pre_existing`: **none**
- how it ran: the command's Steps 1–3 as one node runner under `.pharn/pharn-dev-regress/` (argv arrays;
  this isolated worktree refuses the pinned `xargs` form, so the runner passes the same file list as one
  argv array). The base checkout was a detached worktree under `.pharn/pharn-dev-regress/`, removed before
  the head side ran.

## REGRESSIONS: none — no deterministically-detectable breakage outside the feature

`check-regress.mjs verdict` exited **0** (`"verdict": "no-regressions"`): every outside gate this suite covers
was GREEN at the phase's base and is still GREEN at HEAD.

**The honest residual:** `/pharn-dev-regress` catches exactly what its suite catches — a deterministically
detectable pass→fail flip, nothing more. It does not certify that nothing broke. The 36 tests this phase
expects to fail before the human apply are all **inside** the declared scope (they assert the patched guard
against the still-unpatched hooks) and are `/pharn-dev-verify`'s designed STOP, not regressions: none of the
98 outside files is among them, and this report's own `tests` gate (0 → 0) is the deterministic confirmation.
