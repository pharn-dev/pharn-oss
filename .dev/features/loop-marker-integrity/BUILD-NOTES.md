# BUILD-NOTES — loop-marker-integrity

GATE 1 was decided by the batch orchestrator (a model) under the owner's delegation, 2026-11-03: plan approved as
written, D1 (refuse, no snapshot hash) and D3 (flag pinned and ungranted, no env var) confirmed, item 8 (`reads:`)
won't-fix and item 9 agreed. It is not a human approval.

## What landed (before the human patch)

- `pharn/floor/loop-record-core.mjs` — frozen `BLOCKED_IDS` (18 stuck-point ids); header names the module's
  three consumers.
- `pharn/floor/check-loop-record.mjs` — (A8) `blocked` membership, RED `BLOCKED_UNKNOWN`; L14 comment corrected.
- `pharn/floor/check-loop-decision.mjs` — `markerRun` returns cap + mode (own property, absent → full, outside
  LOOP_MODES → `CAP_UNWITNESSED`); RED `MODE_UNWITNESSED`; a blocked stop is skipped only for a member, else RED
  `BLOCKED_UNKNOWN`.
- `pharn/pharn-contracts/loop-record.md` — the `LOOP-BLOCKED-IDS` list, the `blocked` table row and "third exception",
  the marker's mode (`MODE_UNWITNESSED`) and the re-open refusal with its residual.
- `.claude/commands/pharn-loop.md` — `--open '<name>' --cap <M> --mode <mode>`; the refusal → S9; grant
  `--open * --cap * --mode *`; the flagged isolation line ungranted and reordered (A1); the "No prompt" bullet names
  it and cites the setter header for what a plan may scope (G1 relay); the turn-end wording.
- `.claude/commands/pharn-loop-quick.md` — item 1: `<mode>` is `quick`; the "writes no mode marker" sentence struck.
- Build amendment A1 (PLAN.md): `check-run-isolation.mjs` accepts `--accept-host-execution` only first. Found by the
  new hygiene test on its first run: the unflagged grant's `--feature *` also covered a TRAILING
  `--accept-host-execution`, so deleting the flagged grant alone left the flag pre-approved.
- `pharn/floor/run-marker.test.mjs` — two WIRING tests that execute the loop's `--open` line now substitute `<mode>`
  (the first full `npm test` found them: left in, `<mode` read as a shell redirection).
- Tests: `check-loop-decision.test.mjs` (MODE_UNWITNESSED both ways, unusable marker mode, BLOCKED_UNKNOWN, every
  member SKIPPED, hook MODES == LOOP_MODES, a real `--open --mode quick` marker), `check-loop-record.test.mjs` (made-up
  ids RED; the command's S-table extracted and equal to `BLOCKED_IDS`; the contract list equal), `command-hygiene`
  (open-line pin, `<mode>` in SHELL_VALUES, LOOP_UNGRANTED_LINES pinned and uncovered, corpus: no grant carries the
  flag, turn-end vocabulary, STUCK_POINTS == BLOCKED_IDS), `require-loop-record.test.cjs` (second open refused and
  first bytes kept, any entry at the path refused, `--mode` grammar, a half-failed write leaves no marker and no tmp),
  `check-run-isolation.test.mjs` (a trailing flag is `usage`), `pre-run-snapshot.test.mjs` / `entry-gates.test.mjs`
  pins updated.

## Floor at build

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0). Step 2b: prettier,
markdownlint and eslint over the 26 scoped paths, explicit lists (the pinned `xargs` form is refused in an isolated
worktree): clean.

## Test state before the patch (this worktree, `npm test`)

`ℹ tests 6207 · pass 6196 · fail 10`. Every failure needs the patched hook: the 7.3.0 block of
`require-loop-record.test.cjs` (4), its WIRING test (the pinned line now passes `--mode full`), the two
`check-loop-decision.test.mjs` tests that call the real hook, `pre-run-snapshot.test.mjs`'s WIRING capture test and
`run-marker.test.mjs`'s two loop WIRING tests (all execute the pinned `--open … --mode full` line, which the unpatched
hook refuses as usage). The run-marker pair also lacked the `<mode>` substitution; fixed above.

## Amendment A2 (the orchestrator's adversarial review of apply.py, before hand-over)

See PLAN.md, "Amendment A2". apply.py now patches two files: `require-loop-record.cjs` (plus `--close` refusing a
non-regular-file marker, `--open`'s message for that case, the tmp removed only when created) and
`protect-trusted-paths.cjs` (the `RUN_STATE_SUBTREES` rule and its `runstate` deny body). Prose corrected where it said
the Write tool reaches the loop's state: `pharn-loop.md` (twice), `pharn-loop-close.md`, `loop-record.md` (twice),
`run-marker.mjs`, `regress-base-reuse-core.mjs`, `check-loop-decision.mjs`, both floor guides, DOCS-PROPOSAL blocks 3
and 4. The new protect test that scans the commands for a Write-tool write into those directories found one real drift
(`pharn-loop.md`'s Step 1a said the Write tool can plant a file at `pharn/.run/pharn-loop/<name>`). Not edited, to keep
group S's merge mechanical: `pharn/floor/check-run-isolation.mjs:47` still says the Write tool reaches the witness.

## The human patch (`apply.py`, not committed)

Targets `.claude/hooks/require-loop-record.cjs` and (A2) `.claude/hooks/protect-trusted-paths.cjs`. The tests that need
it are written and RED until it lands: the 7.3.0 blocks of `require-loop-record.test.cjs` and
`protect-trusted-paths.test.cjs`, and every test that executes the pinned `--open … --mode` line.
