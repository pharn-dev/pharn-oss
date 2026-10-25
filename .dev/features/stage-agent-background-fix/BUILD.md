# BUILD — stage-agent-background-fix

Floor: `node pharn/floor/validate.mjs .` → **GREEN** (exit 0, 37 capabilities). Spec hash at build Step 1:
`2c84959c…db12e`, equal to the plan's pin.

## What landed

- `pharn/floor/route-token-core.mjs` — `no-foreground-agent` joins `INLINE_REASONS` (11 members); the comment says
  which reasons the model's reading decides.
- `pharn/floor/stage-agent.mjs` — `start` takes the bare flag `--no-foreground-agent` anywhere in argv, refuses it
  twice, and on an `agent` cell returns `inline:no-foreground-agent` (exit 3) without reading the config;
  `--no-agent-tool` wins when both are given. Header and usage line updated. `main` now strips both bare flags in one
  loop.
- `pharn/floor/stage-agent-core.mjs` — the fallback-table row, its remedy in `INLINE_REMEDIES` (names
  `run_in_background`, never "allow the Agent tool"), and the rewritten `stage-agent-background` residual.
- `.claude/commands/pharn-loop.md` — item 1 gains the `--no-foreground-agent` paragraph (placed right after
  `--name '<name>'`); item 2 names the JSON boolean.
- `.claude/commands/pharn-ship-stages.md` — item 2 names the JSON boolean; no flag.
- Tests: `route-token-core.test.mjs` (11), `mark-phase.test.mjs` (15 tokens), `stage-agent-core.test.mjs` (the
  remedy's reachability, L27), `stage-agent.test.mjs` (the flag: no config read, its own remedy on stderr, mid-argv for
  the build and quick lines, a policy cell, both flags, twice, as a value), `.dev/floor/command-hygiene.test.mjs`
  (STAGE_AGENT_WIRING (5) pins the JSON-boolean wording in both commands and the flag sentence in the loop only; a new
  ✧ test inserts the flag after `--name` in every pinned loop start line and requires an `allowed-tools` grant to cover
  it — GRILL F1).
- `.dev/guides/floor-orchestration.md`, `SKILLS_VERSION` 6.73.2, the CHANGELOG 6.73.2 section, the README badge.

Tests run at build: the five product-floor suites touched (219/219) and the four command suites (334/334). Step 2b
formatted the 23 scoped paths (prettier changed `stage-agent.mjs` and `stage-agent.test.mjs`; markdownlint 0 issues;
eslint clean). Whole-repo `format:check`, `lint:md`, `lint`: clean.

## Decisions and deviations (recorded for GATE 2)

1. **Writes went through a hook-checked Bash helper, by the human's choice at GATE 1.** In this desktop worktree
   session the PreToolUse hooks judge paths from the main checkout and deny every in-worktree Write. The helper
   (scratchpad `w.mjs`) runs both real hooks (`protect-trusted-paths.cjs`, `enforce-writes-scope.cjs`) with this
   worktree as cwd and `CLAUDE_PROJECT_DIR`, and writes only when both exit 0. A probe confirmed the scope guard denies
   an undeclared path through it. Verify's reconcile judges every changed path independently.
2. **Step 0 ran twice.** The first anchor's scope lacked `README.md` (the version badge `check:badge` reads). No
   in-repo file had been written since that anchor (`git status`: only the untracked feature directory), so the plan
   gained the line and Step 0 (setter, then anchor) ran again before any build write.
3. **`pharn/floor/mark-phase.test.mjs` was added to `## Files` after the anchor.** Its whole-grammar test pins the token
   count (`tokens.length, 14`). The plan's L72 sweep (Discovery 4) searched the runtime readers and found
   `route-token-core.test.mjs`'s count, but not this one; the first test run failed on it. The build had written files
   by then, so re-anchoring would have erased them from the epoch: the setter was re-run without an anchor, and verify's
   reconcile is expected to list this path as `plan-widened-after-anchor` for the human to judge at GATE 2.
4. **The grant test's non-vacuity floor is six start lines**, the number pinned today (the quick plan and test lines
   are the full ones plus `--mode quick`).

## Fix round after the independent review (before regress completed)

The review (REVIEW.md) ran while the first regress run was on its base side. That regress run was stopped (its temporary
base worktree removed), the fixes below were written under the same plan scope (setter re-run, no re-anchor), and
regress was restarted from the beginning, so its HEAD side measures the fixed tree.

- **A1 (important) — applied.** The loop's start grants all end their name position in `*`, which matches any text,
  so the flag is covered in any position; the plan's Discovery 5 and follow-up (b) were wrong, and (b) is struck. The
  command now says "append", like `--no-agent-tool`; the CHANGELOG no longer gives placement as the reason; the ✧ grant
  test now asserts the real property (either bare flag, or both, appended to every pinned start line is covered) plus a
  negative case for its regex. The PLAN is left as approved; this note is the correction.
- **A2 — applied.** `route-token-core.mjs`'s comment names both writers of `inline:route-unavailable`.
- **A3 — applied.** The remedy is hedged to what was read: "Claude Code 2.1.309's terminal CLI did" and "as this
  session read its Agent tool"; the loop's sentence says "as read in Claude Code's desktop app".
- **A4 — applied.** The residual and the CHANGELOG say the JSON-boolean probe is the measuring session's record, not
  re-run here.
- **A5 — applied.** The `start` test gains the no-config control run, exit statuses on every call, and a check that a
  refused start writes no marker.
- **A6 — not a code change.** The write route and the expected `plan-widened-after-anchor` entry are for the human at
  GATE 2.
- **A7 — the lesson candidate**, presented at GATE 2.

Tests after the fixes: the eight touched suites, 444/444.
