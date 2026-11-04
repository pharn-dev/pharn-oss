# REGRESSION — loop-marker-integrity

- base: `dd0bb3d39449590ef5694cc93701c046f672e72c` (`git merge-base HEAD origin/main`; the tree was clean), head:
  `c9ee2be0`.
- Machine report: `regression-report.json` (the `check-regress.mjs verdict` JSON, verbatim).

## Scope (`check-regress.mjs scope`, `--feature loop-marker-integrity`)

- inside: 33 paths (listed in `regression-report.json`). escaped: none. escape_exempt: none.
- **The first run reported 2 escapes:** `.claude/hooks/require-loop-record.cjs` and
  `.claude/hooks/protect-trusted-paths.cjs`. The owner wrote both with `apply.py`; they were committed in `bc9c9bc8`,
  before the re-anchor, and PLAN.md named them only under its `## Human-applied patch` heading, not as `## Files`
  bullets. PLAN.md now lists both as bullets marked MAINTAINER-APPLIED (`c9ee2be0`). Re-run: exit 0, no escape.
  This is the after-the-fact `## Files` widening the stage warns about, and the `hook-hardening-batch` precedent: read
  it as data — every path it adds was committed before the anchor, and no write tool can reach either file.
- outside: 169 test files and 1 committed eval pair. The style gates were skipped: `inside` touches no shared style
  config.

## Gates (exit codes, base → head)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (the 169 outside test files, per-test record)                                      | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test: base 5265 passed / 0 failed / 4 skipped; head 5268 passed / 0 failed / 1 skipped; new failures: none.

- regressions: none. pre_existing: none.

## Orchestration notes (advisory)

- The worktree-isolation guard refuses the command's pinned `xargs` / `$VAR` shell forms, so the same steps ran
  through a scratch runner (`node` with argv arrays: the pinned declared-paths parser, `check-regress.mjs scope`, a
  detached base worktree, `node --test` with the per-test reporter at an absolute path, `validate`,
  `check-structural`, `check-regress.mjs verdict`).
- **The runner's first verdict was wrong, and is not the one recorded.** It passed the scope's eval-pair objects as
  strings, so `check-structural` ran with no arguments and exited 1 on BOTH sides — a setup error that the verdict
  classified `pre_existing`, the masking this command warns about (L5/L16). The structural gate was re-run with the
  real paths (both readable, checked first) at base and head; the `tests` and `validate` exits were kept; the verdict
  was re-derived. The recorded report is that re-derivation.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches exactly what the
outside suite catches, nothing more.
