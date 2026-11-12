# BUILD — inline-fallback-stop

Floor: `node pharn/floor/validate.mjs .` exit 0 (`FLOOR: GREEN — 37 capabilities checked`).

- `.claude/commands/pharn-loop.md` — the `--no-foreground-agent` paragraph deleted; item 2's lead reads "On start exit
  `0` only, the Agent call, whatever parameters your Agent tool lists:".
- `pharn/floor/stage-agent.mjs` — `start` accepts the bare flag at most once and ignores it (`decideStart` /
  `startStage` lost the parameter); `NO_FOREGROUND_AGENT_IGNORED` on stderr when given; header and usage updated.
- `pharn/floor/stage-agent-core.mjs` — the reason row says retired; the remedy names no action; the
  `stage-agent-background` residual gains the RULE REMOVED paragraph (measured / not measured, the S9b window, the
  edited-6.73.2 sentence).
- `pharn/floor/route-token-core.mjs` — the header comment calls the member retired and kept.
- Tests: the ignored path (`stage-agent.test.mjs`), the retired remedy (`stage-agent-core.test.mjs`), the explicit
  `isRouteToken` pin (`route-token-core.test.mjs`), `normalizeMarkers` keeps the token (`render-cost-ledger.test.mjs`),
  a pre-change ledger checks GREEN (`check-cost-ledger.test.mjs`), the family-wide absence pin, the item-2 pin and
  the `--no-agent-tool` grant tail (`.dev/floor/command-hygiene.test.mjs`).
- `.dev/guides/floor-orchestration.md`, `CHANGELOG.md` (`## [7.11.0]`, the `[Unreleased]` entry moved in),
  `SKILLS_VERSION` 7.11.0, `README.md` badge.

**Re-anchor, stated.** `check:badge` binds the README badge to `SKILLS_VERSION`, and the plan's L1 sweep had not named
`README.md`. Before any write to it, the first epoch was reconciled (`CLEAN`, 13 reconciled, no escapes), `README.md`
was added to `## Files`, and Step 0 was re-run (setter, then `--anchor`), so the second epoch covers the README edit.
The files written before the re-anchor were all written through the Write/Edit tools under the first scope, plus two
plan-declared splices through Node (`stage-agent.test.mjs`, the Step 2b formatter).

Whole-repo confirms: `format:check`, `lint:md`, `lint`, `check:badge`, `check:changelog`, `docs:check` all exit 0.
