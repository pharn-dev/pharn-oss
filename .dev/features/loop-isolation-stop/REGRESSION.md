# REGRESSION — loop-isolation-stop

- base: `7e71753ce2ba3ed7493264d5e7a2430d45a46440` (`HEAD`; the working tree was dirty with the uncommitted build, so
  Step 1's rule chose `HEAD`)
- verdict (floor, `pharn/floor/check-regress.mjs verdict`, exit 0): **`no-regressions`**
- machine report: `regression-report.json` (the helper's JSON, verbatim)

## Partition

- **inside:** 33 paths, the 25 modified tracked files plus 8 untracked new ones (four `pharn/floor/check-run-isolation*`
  files and this feature's `GRILL.md`, `HUMAN-PATCH.md`, `PLAN.md`, `PROBE.md`). The full list is in
  `regression-report.json` `.inside`.
- **declared:** the 34 `## Files` paths of `PLAN.md` (after amendment A13), read by `plan-files-core.mjs`.
- **escaped:** none. `escape_exempt`: `.dev/features/loop-isolation-stop/GRILL.md` and `PLAN.md` (this feature's own
  stage artifacts).
- **outside gates:** `tests` over 161 outside test files (through the per-test reporter), `validate`, and
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` (the one committed eval
  pair, checked readable before it ran). Style gates were skipped: no shared style config is inside.

## Base → head

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test: base 5,260 passed, 0 failed, 4 skipped; head 5,263 passed, 0 failed, 1 skipped. New failures: none. Still
failing: 0. `regressions[]` and `pre_existing[]` are both empty.

**Round 2, after the GATE-2 fixes.** The same base, partition and gate set were re-run against the fixed working tree
in a fresh detached base worktree. The verdict was the same, **`no-regressions`**, with the same per-test counts and
no new failure, and `regression-report.json` is byte-for-byte unchanged.

## Orchestration notes (advisory)

- **A foreign untracked directory, and what happened to it.** This worktree held another session's
  `.dev/features/pharn-footprint-move/{PLAN,GRILL}.md` (untracked, present before this session). Step 1's `inside`
  rule counts untracked files, so they would have read as an escape. The maintainer chose to move them aside for this
  stage. Before that move, the other session ("Pharn OSS files migration") deleted them itself while moving out of this
  worktree, and its setter calls also cleared this worktree's `.pharn/writes-scope.json`. So `inside` above was computed
  without them. Afterwards that session sent the exact bytes. Both files were restored with a byte copy, their SHA-256
  matched the build's reconcile baseline (`PLAN.md` `cee04198…`, `GRILL.md` `7508a9a9…`), and a reconcile preview read
  `CLEAN` (16 paths, 0 escapes, 0 warnings). That copy is a `Bash` write outside the write tools. Its only effect is the
  anchored bytes, which reconcile confirms.
- **Step 0 also ran `reconcile-baseline.mjs --amend-scope`** after each setter, so this stage's artifact scopes are on
  the open epoch (amendments 1 and 2). This command's Step 0 does not prescribe it; `/pharn-dev-ship` Step 3 does for
  its own write.
- The capture ran as one Bash block with the pinned `xargs` reporter form, the base in a detached worktree removed
  afterwards (`git worktree list` shows no leftover).

REGRESSIONS: none — no deterministically-detectable breakage outside the feature. This certifies only the comparison:
the outside suite caught what it catches, at base and at head, and nothing more.
