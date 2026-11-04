# REGRESSION — review-quoting

- base: `fb997e4bd192ed57dd9ca3240d9866c4c54d9408` (the batch branch tip this branch was cut from, passed as
  `--base`: `merge-base HEAD origin/main` would have put group S's commits inside the feature)
- head: the working tree at `7ee5b396` (runs 1–2) and `97c1bea5` (run 3, the verdict `regression-report.json` holds)
- inside (16 paths, all declared or a feature artifact; `escaped: []`, `escape_exempt: [GRILL.md]`): the plan's
  `## Files` minus the three untouched test files, plus `GRILL.md`
- outside: 178 test files, `validate`, one structural eval pair, and the three style gates (run because
  `.prettierignore` and `.markdownlint-cli2.jsonc` are inside; base got `npm ci` in its detached worktree)

## Run 1 — REGRESSIONS: 1 outside the feature — stage FAILED

| gate                                              | base → head |
| ------------------------------------------------- | ----------- |
| tests                                             | 0 → 1       |
| validate, structural, lint, format:check, lint:md | 0 → 0       |

The per-test record named one new failure (a test title, untrusted DATA):

```text
.dev/floor/entry-point-guard.test.mjs::✧ every gated CLI under pharn/floor carries the runtime floor in the pinned position
```

A real regression, not load: the new `pharn/floor/render-review.mjs` did not start with `import "./runtime-floor.mjs";`.
Fixed in `7ee5b396` (the import added; the renderer's load-graph test pins it first). Run 1's head was also started
while the notes-path move (`9c3f6109`) was being written, so the first head run was stopped and restarted after that
commit; run 1 above is the restarted run.

## Run 2 — after the fix

| gate                                                                                     | base → head |
| ---------------------------------------------------------------------------------------- | ----------- |
| tests (per test: 6,098 passed / 0 failed / 1 skipped on both sides)                      | 0 → 0       |
| validate                                                                                 | 0 → 0       |
| structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json | 0 → 0       |
| lint                                                                                     | 0 → 0       |
| format:check                                                                             | 0 → 0       |
| lint:md                                                                                  | 0 → 0       |

`regressions: []`, `pre_existing: []`, `per_test.new_failures: []` (`check-regress.mjs verdict` exit 0).

## Run 3 — after the pre-verify self-review fix (`97c1bea5`)

The renderer's caps, the claims bullet and the CHANGELOG changed after run 2, so head was run again with the same gate
set (the inside list now also holds `REGRESSION.md` and `regression-report.json`). Every gate 0 → 0; per test,
6,098 passed / 0 failed / 1 skipped on both sides; `regressions: []`, `new_failures: []`, `check-regress.mjs verdict`
exit 0.

## Run 4 — after the GATE 2 fixes (`e43e9061`)

GATE 2 (the orchestrator's FIX decision, under the owner's delegation) changed the command, both floor modules, the
contract, the CHANGELOG and two dev tests. The two tests, `command-hygiene` and `review-lens-agent`, are now inside, so
the scope check names 176 outside test files and finds nothing escaped. Head ran the SAME 178-file list as base, which
is a superset of the 176, so that the per-test comparison is like for like. Every gate went 0 → 0. Per test: 6,098
passed / 0 failed / 1 skipped on both sides; `regressions: []`, `new_failures: []`; `check-regress.mjs verdict` exit 0.
`regression-report.json` is this run's output verbatim.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the outside
suite catches, nothing more; host load averaged 150–230 during the runs.
