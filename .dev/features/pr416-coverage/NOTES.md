# NOTES — pr416-coverage

PR #416 (`batch/audit-2026-11-03` @ 8343100d, base `main`): pharn-ci diff coverage 99.39% against a 100% threshold,
18 listed lines uncovered. This increment adds tests only. It does not change any product code, the gate's config, or
any existing test.

## Line → test

| Listed line(s)                                | Test (file — name)                                                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `.dev/floor/check-variance.mjs:71`            | `check-variance.test.mjs` — "usage: a missing <runs-dir> is INCONCLUSIVE (exit 2) and the usage line names this file's real path"   |
| `.dev/floor/gen-lessons-index.mjs:44`         | `gen-lessons-index.test.mjs` — "CLI: a valid canon writes the index, prints one summary line and exits 0; …"                        |
| `.dev/floor/check-ship-record.mjs:151`        | `check-ship-record.test.mjs` — "valueOk: a key outside BLOCK_KEYS has no grammar, so no value is in it"                             |
| `.dev/floor/check-ship-record.mjs:331-332`    | `check-ship-record.test.mjs` — "G12: a target that does not exist, or a directory outside any git repository, is refused (exit 2)"  |
| `.dev/floor/check-ship-record.mjs:338-339`    | same test (the non-repository directory)                                                                                            |
| `.claude/hooks/protect-trusted-paths.cjs:940` | `protect-trusted-paths.test.cjs` — "✧ 7.3.0 run state through a backslash-named link — found only by the filesystem's reading …"    |
| `pharn/floor/reconcile-baseline.mjs:174-176`  | `reconcile-baseline.test.mjs` — "★ an unreadable prior baseline and a run-state directory that cannot be listed (a planted FILE) …" |
| `pharn/floor/render-review.mjs:414-415`       | `render-review.test.mjs` — "★ notes with NO assignments.json cannot be dated against the run → not rendered, …"                     |
| `pharn/floor/render-review.mjs:461-463`       | `render-review.test.mjs` — "★ CLI: a REVIEW.md that cannot be written exits 1, names the path on stderr and prints no summary"      |
| `pharn/floor/check-loop.mjs:266-267`          | **none: not reachable through the public interface** (below)                                                                        |

## The two lines no test reaches

`pharn/floor/check-loop.mjs:266-267` is the `catch` around `JSON.parse(text.slice(i, j + 1))` in the module-private
`repeatedTopLevelKeys`. Its only caller, `readVerdict`, calls it after `JSON.parse(text)` has already accepted the whole
text as an object. Every key token of an accepted JSON text is itself a valid JSON string literal, and the scanner finds
string boundaries exactly (`"` outside a string only ever opens one; `\` skips the next character). So the decode
cannot throw, and the code's own comment says so ("the decode cannot throw on a token of valid JSON", L62). Reaching the
line would mean exporting the helper or giving it text `JSON.parse` rejected. Both change product code, and the skill
rules out both. Two ways to close it are left to a human: remove the dead `catch` (a product-code change, in
`pharn/floor/`, so it bumps), or accept the 2-line gap.

## Local lcov proof (`npm run test:coverage`, the command CI runs before pharn-ci)

Run result: exit 0. 6475 tests, 6474 pass, 0 fail, 1 skipped. Hit counts for the listed lines in `coverage/lcov.info`:

```text
.dev/floor/check-variance.mjs:71 hits=8
.dev/floor/gen-lessons-index.mjs:44 hits=3
pharn/floor/check-loop.mjs:266 hits=0
pharn/floor/check-loop.mjs:267 hits=0
.claude/hooks/protect-trusted-paths.cjs:940 hits=2
pharn/floor/reconcile-baseline.mjs:174 hits=2
pharn/floor/reconcile-baseline.mjs:175 hits=2
pharn/floor/reconcile-baseline.mjs:176 hits=2
.dev/floor/check-ship-record.mjs:151 hits=3
.dev/floor/check-ship-record.mjs:331 hits=27
.dev/floor/check-ship-record.mjs:332 hits=27
.dev/floor/check-ship-record.mjs:338 hits=27
.dev/floor/check-ship-record.mjs:339 hits=27
pharn/floor/render-review.mjs:414 hits=1
pharn/floor/render-review.mjs:415 hits=1
pharn/floor/render-review.mjs:461 hits=16
pharn/floor/render-review.mjs:462 hits=16
pharn/floor/render-review.mjs:463 hits=16
```

Control: running `check-ship-record.test.mjs` alone under coverage with the new G12 test skipped
(`--test-skip-pattern`) leaves lines 331-332 and 338-339 at 0 hits. So that test is what covers them. The count of 27
is V8 adding up hits across the checker's child processes.

Estimate: 16 of the 18 lines are now covered. The 2 left would put the gate near 99.93%, still under 100%. pharn-ci's
own number comes from the next CI run.

## Bash writes in the window

`npx prettier --write` reformatted `pharn/floor/reconcile-baseline.test.mjs`, a path declared in `## Files`. CI's
`npm run test:coverage` wrote `coverage/`, which is gitignored.

## Gates

See the commit's report. `npm run check:changelog-entry` passed without a new entry ("41 new entr(ies) against the base
… this PR opens `## [7.3.0] - 2026-11-03`"), so `CHANGELOG.md` was left unchanged.
