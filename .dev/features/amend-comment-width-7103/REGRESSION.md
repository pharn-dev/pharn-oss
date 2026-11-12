# REGRESSION — amend-comment-width-7103 (7.10.3)

- **Base:** `5568d4ce` (HEAD; the working tree held the build, so base = HEAD per Step 1).
- **Inside** (changed): `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`, `pharn/floor/spec-amend-core.mjs`, and this
  feature's `PLAN.md` / `GRILL.md` (exempt as its own stage artifacts). `scope` exit 0, `escaped: []`.
- **Outside:** 189 test files, `validate`, and the one committed eval pair (`trust-fence` ↔
  `.dev/features/trust-fence/findings.json`). No shared style config touched, so the style gates were skipped on both
  sides.
- **Runner:** the pinned commands, run with argv arrays from a scratchpad Node script (the worktree guard refuses the
  pinned `xargs` / `$(...)` shell forms); same reporter, same destinations, `rm -f` of each side's record first.

| gate                                           | base | head |
| ---------------------------------------------- | ---- | ---- |
| `tests` (per-test)                             | 0    | 0    |
| `validate`                                     | 0    | 0    |
| `structural:…/expected-injection-comment.json` | 0    | 0    |

Per-test: base 6,638 passed / 0 failed / 9 skipped; head 6,646 passed / 0 failed / 1 skipped; `new_failures: []`.

- `regressions[]`: none
- `pre_existing[]`: none

REGRESSIONS: none — no deterministically-detectable pass→fail flip outside the feature (`check-regress.mjs` verdict
`no-regressions`, exit 0). This covers exactly the gates above, never a defect they do not encode.
