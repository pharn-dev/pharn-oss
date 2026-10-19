# REGRESSION — frontmatter-parser-parity

- orchestration: Steps 1–3 ran from one node runner (`.pharn/pharn-dev-regress/capture.mjs`), with every subprocess
  spawned from an argv array. The pinned `xargs` / `$?` shell forms are refused in this isolated worktree. This is
  advisory orchestration; the verdict is the checker's.
- machine report: `regression-report.json` records **run 3** (`check-regress.mjs verdict`, verbatim; sha256
  `5d0ca98e…344f`).

## Run 3 (the one `regression-report.json` records) — after the GATE 2 fix round and the merge of `origin/main`

- base: `94ad252baef07e219db9adfccad83df2c40e2e58` (`origin/main` at 6.64.3, #359). The tree was clean and committed,
  so base = `git merge-base HEAD origin/main`.
- partition: `check-regress.mjs scope --feature frontmatter-parser-parity` → exit 0; 42 inside paths, 36 declared,
  149 outside tests of 163, one outside eval pair. `escape_exempt` = this feature's seven stage artifacts.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (149 outside test files, one `node --test` run)                                    | 1    | 1    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions`: none. `pre_existing`: `tests`.
- The logs, read because the gate is one exit code for the whole suite:
  - base: 1 of 5154 failed, `★ budget clock — …` (32.6 s), the same timing test as runs 1 and 2.
  - head: 1 of 5154 failed, a different timing test in `pharn/floor/stage-regress.test.mjs` (`never recorded — a
timed-out base gate …`, 28.5 s). Run alone, it passes (2/2 matching tests). This increment does not touch that file
    or the code it runs. The machine's load average was 140–270 during the run.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

## Run 2 (superseded by run 3) — base `d5453a17`, HEAD of a dirty working-tree build

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (148 outside test files, one `node --test` run)                                    | 1    | 1    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions`: none. `pre_existing`: `tests`.
- What the `tests` 1 is, read from the two captured logs (`.pharn/pharn-dev-regress/base-tests.log`,
  `head-tests.log`), and not used for the verdict:
  - base: 2 of 5141 failed, both timing tests that ran 28–53 s under machine load. One is `★ budget clock — the opening
work counts …` (`pharn/floor/stage-verify.test.mjs`); the other is `precedence — a published 6.33.0 retained record
HITs first …`.
  - head: 1 of 5141 failed, the same `budget clock` test (32.9 s). Run alone, it passes (1/1).
  - No head failure is new. Both logs were read to confirm that, because the gate is one exit code for the whole suite.

Run 2's verdict was `no-regressions`, and its machine report is superseded by run 3's.

## Run 1 (superseded; kept because it found a real regression the verdict did not show)

Run 1 at the first build gave the same verdict, `no-regressions`, with `tests` base 1 → head 1, classed
`pre_existing`. The head log held **11 new failures**, in `pharn/floor/render-review-assignments.test.mjs` and
`pharn/floor/lens-groups.test.mjs`. Both copy `count-lenses.mjs` into a scratch repo without `frontmatter-core.mjs`, which
`count-lenses.mjs` now imports. The base failure was the one `budget clock` timing test, which passed at head. Because the
gate is one exit code over the whole suite, a flaky base RED hid the head REDs.

That is a regression this increment caused, so it was fixed rather than passed on. PLAN `## Amendment 1` adds the two
test files to `## Files`. Before the edit, the first build window reconciled `CLEAN` (33 paths, no escapes). Build Step 0
then ran again (the setter and a new anchor), and both copy lists now include `frontmatter-core.mjs`. Run 2 above is the
re-run, and its head log has no failure in either file.

Residual: this stage catches what its suite catches, nothing more. Run 1 shows a sharper bound too. With the outside
tests folded into one gate, any RED at base hides every new RED at head, unless someone reads the logs.
