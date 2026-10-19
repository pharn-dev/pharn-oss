# REGRESSION — regress-install-config

**Verdict (FLOOR, `check-regress.mjs verdict` exit 0): `no-regressions`.** No outside gate flipped pass → fail.

- base: `d5453a170a68a1b7842bf633b8638eb02dcd61cb` (the working tree was dirty, so base = HEAD — a working-tree
  dogfood build; nothing of this increment is committed)
- inside: 21 changed paths, all declared in the plan's `## Files` (`scope` exit 0, no escape)
- outside: 157 test files, 1 eval pair (`trust-fence`), plus whole-repo `validate`

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (157 outside `*.test.mjs` / `*.test.cjs`)                                          | 1    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Style gates skipped: `inside` touches no shared style config (config-touch rule).

## The red baseline, investigated rather than recorded blind

`tests` was red at the base and green at head, so the checker lists it under `pre_existing` and it cannot hide a
regression here (a regression needs head non-zero; head is 0). The base side ran in a detached `git worktree` in the
temp root with **no `node_modules`**, while the head side ran in the working tree with devDependencies installed. The
failing base test was **not isolated** (the runner records exit codes only). The likely cause is that environment
difference: 32 of the 157 outside suites name a non-builtin import or a dev tool (a text scan, not proof), and main's
CI runs the same suites green at `d5453a17`. Stated as a likely cause, not a finding. Full `npm test` at HEAD is the
verify gate.

## Orchestration deviation (ADVISORY)

This session is worktree-isolated, which refuses the pinned shell forms (`xargs`, `$VAR` capture). Steps 1.4–2 ran
through a scratch runner, `.pharn/pharn-dev-regress/capture.mjs`, which calls the same commands with argv arrays
(`check-regress.mjs scope` with the pinned declared-paths extraction, `node --test <outside tests>`, `validate.mjs`,
`check-structural.mjs`) and records only exit codes. The first attempt crashed on the eval-pair shape before writing
any result and was re-run in full.

The verdict is exactly as good as the outside suite; nothing here claims the increment is correct.
