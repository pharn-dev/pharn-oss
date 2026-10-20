# REGRESSION — load-flake-regress

**NO REGRESSIONS outside the feature** — `regression-report.json` `.verdict` = `no-regressions` (the second run, below).

- base: `dd69efd59f968200650116cae9e0a5afb9cc4936` (`HEAD`; a working-tree dogfood build, `git status --porcelain`
  non-empty)
- inside (19): the plan's 17 `## Files` paths that changed, plus this feature's `PLAN.md` and `GRILL.md`
  (`escape_exempt`). `scope` exit 0, `escaped: []`.
- outside: 163 test files (`tests`), `validate`, and the one committed eval pair
  (`structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`). No shared style config
  is inside, so the style gates are skipped on both sides.
- **This is the first run with the per-test comparison this increment adds:** the `tests` line ran through
  `.dev/floor/node-test-results-reporter.mjs` on both sides, and Step 3 passed `--per-test tests`.

| gate                       | base | head |
| -------------------------- | ---- | ---- |
| `tests`                    | 0    | 0    |
| `validate`                 | 0    | 0    |
| `structural:…trust-fence…` | 0    | 0    |

`per_test`: base 5,464 passed / 0 failed / 6 skipped; head 5,469 passed / 0 failed / 1 skipped; `new_failures: []`. The
skipped counts differ because the base runs in a temporary worktree without this checkout's local state; no failure
depends on it.

## Run 1 — a real regression, found and fixed

The first run reported `tests` 0 → 1, `verdict: regressions`, with `per_test.new_failures` (test ids are repository
text, quoted as DATA):

```text
pharn/floor/gate-run-core.test.mjs::✧ L36 CLOSURE — every reason_code LITERAL the shipped modules emit is a member of REASON_CODES   (base: passed)
```

Cause: `check-regress.mjs` emits two new `reason_code`s that `gate-run-core.mjs`'s closed `REASON_CODES` did not name.
Fixed under `PLAN.md` "Amendment 1" (the two codes join the set; build Step 0 re-run). The HEAD side was then
captured again over the same 163 files; the BASE capture was kept, since the base commit and the outside list are
unchanged (`scope` re-run: identical `outside_tests`, `escaped: []`).

## Orchestration notes (advisory)

- Run 1 captured BASE and HEAD concurrently, not one after the other, to save wall time on a shared machine (load
  ~70–140). That is the condition the per-test comparison is for: a load-red test on one side would be named, not
  folded into one exit code.
- Every capture and the verdict used the lines `pharn-dev-regress.md` pins, with `<working tree>` = this worktree's
  absolute path and `<side>` = `base` / `head`.
