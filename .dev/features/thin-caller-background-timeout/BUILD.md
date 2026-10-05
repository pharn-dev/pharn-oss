# BUILD — thin-caller-background-timeout

- plan: `.dev/features/thin-caller-background-timeout/PLAN.md` (spec hash
  `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, unchanged; no open questions)
- scope: set from the plan's `## Files` (16 paths), reconcile baseline anchored after it (`--by pharn-dev-build`)
- floor: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`

## Written

- `.claude/commands/pharn-regress.md` — the backgrounded-call bullet replaces the timeout-resume bullet, with the
  grill's "unsure → do not resume" fallback; the `unusable` cross-reference now reads "after a call that is gone".
  20,456 of 20,480 bytes (ceiling unchanged; every stated bound kept).
- `.claude/commands/pharn-verify.md` — the same bullet; 18,982 of 20,480 bytes.
- `pharn/pharn-contracts/stage-exit.md` — the kill example corrected; a "A Bash-tool timeout is not a kill" paragraph
  (ADVISORY, probed at 3 s) naming the follow-up `stage-script-in-flight-guard`.
- `.dev/floor/command-hygiene.test.mjs` — `THIN_CALLER_BACKGROUND`: one test per thin caller (iterated over
  `STAGE_SCRIPT_WIRING`), plus a mutant test (paragraph removed; old clause appended; never-resume sentence replaced),
  each matched by its own reason. Its comment states that `TIMEOUT_RESUME` catches one spelling only (grill P0).
- `SKILLS_VERSION` 6.46.0, README badge, CHANGELOG `[6.46.0]` (`### Fixed`).

## Notes

- The first wording, "(you may end your turn to wait)", made the release-step reachability test RED: its
  `TURN_END_RE` reads any "end your turn" as a turn-end. Reworded "(it may outlast this turn)". The release step still
  follows the branching, which is where a waited-for call ends.
- Step 2b: prettier, markdownlint (`--no-globs`) and eslint were run on the scoped files only.
