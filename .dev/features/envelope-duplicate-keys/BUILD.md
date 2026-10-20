# BUILD — envelope-duplicate-keys

Built at `dd69efd5` (6.71.0) on `fix/envelope-duplicate-keys`. The scope was set from the plan (24 paths), and the
reconcile epoch was anchored after the setter (`--anchor --by pharn-dev-build`, 3111 paths). The spec hash still
matches the pin (`2c84959c…`). The floor is **GREEN**: `node pharn/floor/validate.mjs .` reports 37 capabilities
checked, exit 0.

## What landed

- `frontmatter-core.mjs`: `frontmatterEntries(text)` returns `{ entries, repeated }` or null.
  `describeRepeats(repeated)` renders keys and counts. The "WHAT IT DOES NOT DO" paragraph now names both refusing
  families.
- The five readers route through `frontmatterEntries`:
  - `check-loop-record`: RED (A0), before the mandatory-field checks.
  - `check-ship-briefing`: RED `envelope`, before the required-field check. Its exported `readEnvelope` returns null
    on a repeat.
  - `check-loop-decision`: RED, before the blocked-stop skip.
  - `loop-closeout` `readEnvelope`: null. The header's step 2 says so.
  - `render-cost-ledger` `readOutcome`: null.
- `render-run-report.mjs`: the derived-outcome reason is command-aware (GATE 1 Q3). The `/pharn-ship` sentence is
  byte-identical.
- Contracts `loop-record.md` and `ship-briefing.md`, the two dev guides, `SKILLS_VERSION` 6.71.1, the README badge,
  and `CHANGELOG [6.71.1]`.
- `npm run docs:generate` changed nothing. `stage-load-budget.test.mjs` passes, and the `pharn-loop` ceiling is
  untouched, so that file was not edited.

## Grill findings carried in

- G-closure: the closure is an equality over `frontmatterEntries(` callers, plus a classification of every
  `fieldEntries(` caller.
- G-null-mode: `loop-closeout`'s doc comment states that a null mode reads as full. The closeout test asserts
  `doc.mode === null` and that no branch and no commit were made.
- G-install-bound: the CHANGELOG states it.

## The ★ tests, run once against the 6.71.0 readers

`.pharn/envelope-duplicate-keys/prechange.mjs` (scratch) copied the tree, put back the six `HEAD` reader bytes, and
ran the new tests. Every new ★ test failed there:

- `check-loop-record`: 2
- `check-ship-briefing`: 2
- `check-loop-decision`: 2
- `loop-closeout`: 2
- `render-cost-ledger`: 1
- `render-run-report`: 1
- `frontmatter-core`: the 6.71.1 closure

The scratch tree also failed some wiring tests that read `.claude/commands/`, which the copy did not include. Those
failures are environmental. In the real tree, all seven suites pass:

| suite                      | pass |
| -------------------------- | ---- |
| `frontmatter-core.test`    | 28   |
| `check-loop-record.test`   | 97   |
| `check-loop-decision.test` | 35   |
| `loop-closeout.test`       | 46   |
| `render-cost-ledger.test`  | 109  |
| `check-ship-briefing.test` | 45   |
| `render-run-report.test`   | 97   |

## Bash writes inside the scope, stated

`SKILLS_VERSION` was written with `printf` and the README badge with `sed`. The grill stage's `GRILL.md` line numbers
were corrected with `sed`. All three targets were inside the scope active at the time: the build scope, and for
`GRILL.md` the grill scope. Because of that, no guard would have denied them. They should still have gone through
Edit, and the next stage uses Edit.

Step 2b ran as a node runner (`.pharn/envelope-duplicate-keys/format.mjs`). The pinned xargs form is refused in an
isolated worktree. The runner covered 23 existing paths with prettier, markdownlint `--no-globs --fix` and eslint, all
exit 0. The whole-repo `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`,
`check:changelog` and `check:contributing` all exit 0.
