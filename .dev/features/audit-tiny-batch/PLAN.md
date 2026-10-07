# PLAN — audit-tiny-batch

- feature: audit-tiny-batch
- applied_lessons: [L4]

Seven small fixes from the 2026-10-07 production-readiness audit, one PR, light path (delegated by the
orchestrator). (1) P3-K: every test file an AC-TESTS.md mapping cell names must be pinned in the lock's `files`;
`--write` refuses otherwise and `--check` (so the test-stage gate, `--record-red-run` and the AC gate's
`ac-tests-modified`) REDs. (2) P2-G: `/pharn-ship`'s close formats `BRIEFING.md` with the project's own
`node_modules/.bin` binaries only when present, never through a package runner that can fetch from the registry;
a hygiene test forbids package-runner invocations in every product command; SECURITY.md's egress sentence is made
exact. (3) P3-O(b): `/pharn-memory-promote` halts and asks on a failed `git rev-parse HEAD` instead of writing
`unknown` on its own; `unknown` stays the honest value only when the human confirms the project has no commit.
(4) P3-M(a): the hook-wiring test requires the Stop block. (5) P3-M(b): NotebookEdit `notebook_path` and
MultiEdit `edits[]` payload tests against both guards. (6) P3-N: `floor.yml` runs `npm test` on Node 24 and the
setup-node comment names v7.0.0 in both workflows. (7) Test gap 11: a test runs `npm test`'s own globs through the
real `node --test` over a fixture holding `.claude/worktrees/**` and asserts they are not collected.

## Applied lessons

- **L4** — an authored assertion passes by construction, so item 4's Stop-block check is factored into a function
  run against a settings object WITHOUT the Stop block (it must throw), and item 7 runs the real `node --test` over
  a fixture instead of re-deriving glob semantics by regex.

## Files

- `.dev/features/audit-tiny-batch/PLAN.md` — **NEW.** this plan.
- `pharn/floor/ac-tests-lock.mjs` — **EDIT.** mapped cells must be pinned files (`--write` refusal, `testFirstReds` RED).
- `pharn/floor/ac-tests-lock.test.mjs` — **EDIT.** P3-K tests; fixture maps a listed file.
- `pharn/floor/ac-gate-core.test.mjs` — **EDIT.** AC gate reads an unpinned mapped file as `ac-tests-modified`.
- `pharn/floor/check-test-stage.test.mjs` — **EDIT.** fixture alignment if the new refusal reaches it.
- `pharn/floor/check-red-run.test.mjs` — **EDIT.** fixture alignment if the new refusal reaches it.
- `pharn/floor/check-loop-fresh.test.mjs` — **EDIT.** fixture alignment if the new refusal reaches it.
- `pharn/floor/loop-closeout.test.mjs` — **EDIT.** fixture alignment if the new refusal reaches it.
- `pharn/floor/check-regress.test.mjs` — **EDIT.** fixture alignment if the new refusal reaches it.
- `pharn/floor/check-bash-reconcile.test.mjs` — **EDIT.** fixture alignment if the new refusal reaches it.
- `pharn/floor/check-ship-briefing.test.mjs` — **EDIT.** fixture alignment if the new refusal reaches it.
- `pharn/floor/test-infra-core.test.mjs` — **EDIT.** fixture alignment if the new refusal reaches it.
- `pharn/pharn-contracts/ac-tests.md` — **EDIT.** the lock contract states the mapped-cell rule.
- `.dev/guides/floor-ac-tests.md` — **EDIT.** the CLI reference states the mapped-cell rule.
- `.claude/commands/pharn-ship-close.md` — **EDIT.** local-binary-or-skip formatter step.
- `.claude/commands/pharn-memory-promote.md` — **EDIT.** halt and ask on a failed `git rev-parse HEAD`.
- `.claude/commands/pharn-dev-memory-promote.md` — **EDIT.** its divergence note describes the product twin truly.
- `.dev/floor/command-hygiene.test.mjs` — **EDIT.** no package-runner invocation in any product command.
- `.dev/floor/check-provenance.test.mjs` — **EDIT.** the product command halts on a failed rev-parse.
- `.claude/hooks/hook-wiring.test.cjs` — **EDIT.** Stop block required, with a negative control.
- `.claude/hooks/enforce-writes-scope.test.cjs` — **EDIT.** NotebookEdit and MultiEdit payload tests.
- `.claude/hooks/protect-trusted-paths.test.cjs` — **EDIT.** NotebookEdit and MultiEdit payload tests.
- `.github/workflows/floor.yml` — **EDIT.** Node 24, `npm test`, correct setup-node comment.
- `.github/workflows/ci.yml` — **EDIT.** correct setup-node comment.
- `.dev/floor/test-globs.test.mjs` — **NEW.** npm test's globs exclude `.claude/worktrees/**`; floor.yml mirrors ci.yml.
- `SECURITY.md` — **EDIT.** exact egress sentence.
- `SKILLS_VERSION` — **EDIT.** patch bump.
- `CHANGELOG.md` — **EDIT.** new section.
- `README.md` — **EDIT.** version badge and generated inventory.
