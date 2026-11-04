# PLAN — audit-small-2026-11-03

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L2, L4, L19, L35, L43]
- increment: the small findings of the 2026-11-03 principal review (batch group S, items 1–18): stale names, versions
  and headers corrected against live state, three small floor fixes with tests (surface-bump whitespace version,
  GITHUB_TOKEN off Actions, release.yml's gitleaks wait), new ✧ pins, prompt-hygiene sentences, `npx --no-install`,
  `npm audit fix` and the two load-flaky TAKEOVER tests on the virtual clock.
- layer(s): product surface (commands, floor checkers, contracts — the batch orchestrator bumps once to 7.3.0) and
  build apparatus (`.dev/**`, tests, CI, root docs).
- constitution_refs: [P0, P2, P4, P6, P7]
- mode: LIGHT (batch group S): no `/pharn-dev-ship` chain; gates are `npm run check` and `node pharn/floor/validate.mjs .`,
  recorded in `NOTES.md`.

## Why (P7)

Every item is a finding of the 2026-11-03 principal review, re-verified live in this worktree before planning
(P6). The evidence for each, and its outcome, is in `NOTES.md`.

## Lessons

- L2: every corrected doc line cites what the live code, CHANGELOG, `gh api` or run log shows today (6.68.1, 5.1.2,
  ruleset 25907495, TAG_ELSEWHERE, the CLI's 0.8.0 Node refusal), never the prose it replaces.
- L4: each new ✧ pin carries a negative control or a fixture that proves it can fail (the ci.yml step pin is checked
  against a disabled-`if:` copy; the surface-bump case runs the trailing-space version that used to pass).
- L19: the dev-command formatter lines keep their single scoped path; `--no-install` only stops npx fetching a
  package, it does not widen what is written.
- L35: `test:coverage`'s globs are a second copy of `test`'s; the new pin binds them equal (both must exist: one runs
  under coverage in CI). release.yml's REQUIRED_CHECKS stays a declared copy of the ruleset plus classic protection,
  and its comment now names both sources.
- L43: the surface-bump checker certified "the version bytes differ", not "the version moved"; a whitespace-only
  difference is now not a bump, binding the check to a valid version change.

## Files

- `.dev/features/audit-small-2026-11-03/PLAN.md` — this plan
- `.dev/features/audit-small-2026-11-03/NOTES.md` — item → outcome, gate output
- `CHANGELOG.md` — `[Unreleased]` entries
- `.claude/commands/pharn-dev-plan.md` — item 1, 15, 16
- `.claude/commands/pharn-dev-memory-promote.md` — item 1
- `.claude/commands/pharn-spec.md` — item 1
- `.claude/commands/pharn-memory-promote.md` — item 1
- `.claude/commands/pharn-dev-ship.md` — item 1, 16
- `.claude/commands/pharn-dev-grill.md` — item 16
- `.claude/commands/pharn-dev-regress.md` — item 16
- `.claude/commands/pharn-ship-stages.md` — item 5
- `.claude/commands/pharn-ship-close.md` — item 5
- `.claude/commands/pharn-build.md` — item 15
- `.dev/floor/command-hygiene.test.mjs` — item 1 pin rename, item 16 pin
- `docs/guarantees.md` — item 2
- `docs/limitations.md` — item 2
- `docs/pipeline.md` — item 2
- `CLAUDE.md` — item 2, 14
- `pharn/features/README.md` — item 2
- `CONTRIBUTING.md` — item 2, 7
- `SECURITY.md` — item 3
- `pharn/floor/runtime-floor.mjs` — item 4
- `pharn/floor/check-spec-approved.mjs` — item 5
- `.dev/guides/versioning.md` — item 6
- `.github/workflows/release.yml` — item 7
- `.dev/floor/release-workflow.test.mjs` — item 7
- `pharn/floor/check-regress.mjs` — item 8
- `.dev/floor/check-variance.mjs` — item 8
- `pharn/pharn-review/trust-fence/trust-fence.md` — item 8
- `pharn/pharn-contracts/stage-exit.md` — item 8
- `.dev/floor/check-surface-bump.mjs` — item 9
- `.dev/floor/check-surface-bump.test.mjs` — item 9
- `package-lock.json` — item 10 (written by `npm audit fix`, a Bash write declared here)
- `.claude/hooks/enforce-writes-scope.test.cjs` — item 11
- `.claude/hooks/protect-trusted-paths.test.cjs` — item 11
- `.claude/hooks/set-writes-scope.test.cjs` — item 11
- `pharn/floor/instruction-files.mjs` — item 12
- `pharn/floor/instruction-files-core.mjs` — item 12
- `.dev/floor/ci-steps.test.mjs` — item 13 (new)
- `.dev/floor/test-globs.test.mjs` — item 13
- `README.md` — item 14
- `pharn/floor/check-run-isolation-core.mjs` — item 17
- `pharn/floor/check-run-isolation.mjs` — item 17
- `pharn/floor/check-run-isolation-core.test.mjs` — item 17
- `pharn/floor/check-run-isolation.test.mjs` — item 17
- `pharn/pharn-contracts/loop-record.md` — item 17
- `pharn/floor/entry-gates.test.mjs` — item 18

## Not in scope

Files other batch groups own (GROUPS.md "Not yours"): `pharn-dev-build.md` (G1), `pharn-dev-verify.md` and
`pharn-dev-review.md` (G5), and `pharn-dev-memory-promote.md` beyond item 1's rename (G9). Item 16's `npx` lines in
those four files are left to their owners and listed in `NOTES.md`; the item-16 pin names them as pending.

## Open questions

none
