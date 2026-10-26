# REGRESSION — release-workflow

**Verdict (floor, `check-regress.mjs verdict`, exit 0): `no-regressions`.**

- Base: `77e01aef` (HEAD; a working-tree build, so `git status` was non-empty → `base = HEAD`).
- Inside (13 paths): the plan's `## Files` that changed plus this feature's `PLAN.md` / `GRILL.md`. `scope` exit 0,
  `escaped: []`, `escape_exempt: [PLAN.md, GRILL.md]`.
- Outside gates, identical set at base and head:

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (174 outside test files, per-test reporter)                                        | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- Per test: base 6,087 passed / 0 failed / 6 skipped; head 6,092 passed / 0 failed / 1 skipped. `new_failures: []`.
- Style gates skipped by the rule: no shared style config is inside.

## Orchestration notes (advisory)

- **Two untracked paths were left out of `--changed` by hand:** `.claude/skills/` and `skills-lock.json`. They are
  the user's, were untracked before this run started (session-start `git status`), and are not this feature's
  writes. Passing them would have made `scope` report them as escapes. Recorded so the exclusion is visible.
- The gates ran from a scratchpad script that uses the pinned `xargs node --test` line with the absolute reporter
  path on both sides; base in a detached worktree at `77e01aef`, removed afterwards.
- `CLAUDE.md` and `README.md` (both inside) were corrected once during this stage, before the HEAD side ran, to
  narrow "the required checks" to "the required checks that run on a push" (L64). Inside paths only; the outside
  gate set is unaffected.

The guarantee is what the suite covers: a regression no deterministic check covers is invisible here.
