# REGRESSION — core-371-canon-docs

- Base: `7fb95462178bac162bcba8f8566f7655f458fbde` (HEAD; a dirty working-tree build, so `base = HEAD` per Step 1).
- Inside (15): the ten `.dev/guides/*.md`, `CHANGELOG.md`, `CLAUDE.md`, `README.md`, `SKILLS_VERSION`,
  `pharn-install.json` — all inside the plan's `## Files` (`check-regress.mjs scope` exit 0, `escape_exempt: []`).
- Outside: 206 test files and the one committed eval pair (trust-fence). No shared style config changed, so the style
  gates are skipped on both sides (Step 2's skip rule).
- Run by a node runner with argv arrays (the pinned shell forms are refused in this isolated worktree), holding the
  batch's heavy-slot lock; the base side ran in a detached worktree of the base SHA, the reporter at the working
  tree's absolute path on both sides.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (per-test record)                                                                  | 1    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none.
- `pre_existing[]`: `tests` — red at base only: 2 failed tests at base (7 122 passed), 0 at head (7 132 passed). The
  base failures sit in `.dev/floor/check-install-manifest.test.mjs` and `.dev/floor/install-manifest-core.test.mjs`,
  run from the detached base checkout; `per_test.new_failures` is empty.

REGRESSIONS: none — no deterministically-detectable breakage outside the feature.

Residual: this catches what the outside suite catches, nothing more; the increment's own prose is checked by no gate.
