# REGRESSION — frontmatter-parser-parity

- base: `d5453a170a68a1b7842bf633b8638eb02dcd61cb` (HEAD; the tree is a dirty working-tree build, so base = HEAD)
- machine report: `regression-report.json` (`check-regress.mjs verdict`, verbatim; sha256 `b7e934fd…93d0`)
- partition: `check-regress.mjs scope --feature frontmatter-parser-parity` → exit 0; 37 inside paths, 35 declared, 148
  outside tests of 162, one outside eval pair; `escape_exempt` = this feature's `PLAN.md` and `GRILL.md`
- orchestration: Steps 1–3 ran from one node runner (`.pharn/pharn-dev-regress/capture.mjs`), with every subprocess
  spawned from an argv array. The pinned `xargs` / `$?` shell forms are refused in this isolated worktree. This is
  advisory orchestration; the verdict is the checker's.

## Run 2 (the one `regression-report.json` records)

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

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

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
