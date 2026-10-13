# REGRESSION — grill-griller-trim

- Base: `791d20537314989c25f4f1e4a04193626087d59b` (working tree dirty → `base = HEAD`; `origin/main` at the time).
- Verdict source: `node pharn/floor/check-regress.mjs verdict` → exit **0**; `regression-report.json` is its stdout
  verbatim.

## Partition (`check-regress.mjs scope`, exit 0)

**Inside (11):** `.claude/commands/pharn-grill.md`, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`, `README.md`,
`SKILLS_VERSION`, `.dev/features/grill-griller-trim/{GRILL.md, MEASUREMENTS.md, PLAN.md, measure.mjs}`,
`pharn/floor/griller-extract.mjs`, `pharn/floor/griller-extract.test.mjs`.

No escape: every changed path is in the plan's `## Files` or `escape_exempt` (`GRILL.md`, `PLAN.md` — this feature's
own stage artifacts, `--feature grill-griller-trim`).

**Outside gates:** 154 outside test files (one `tests` gate), `validate`, and the one committed eval pair
(`structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json`, both confirmed readable before running). Style gates skipped: no shared
style config is inside.

## Base → head

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (154 outside files)                                                                |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the suite
catches, nothing more: a broken behavior no test, rule or eval covers is invisible here.

## Run note (advisory orchestration)

The pinned shell forms (`xargs`, `$VAR` capture, the `paste` pipeline) are refused in this isolated worktree, so
Steps 1–3 ran through a node runner under `.pharn/pharn-dev-regress/run.mjs` with argv arrays: the same base rule, the
pinned `plan-files-core.mjs` declared-paths line, the same `scope` and `verdict` calls, the outside tests passed as one
`node --test` argv list, and every gate's exit code recorded. A first run crashed in the runner (it read the eval pair
as a `::` string; `scope` returns `{expected, actual}` objects) before any verdict; the base worktree was removed and the
second run is the one recorded.
