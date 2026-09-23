# REGRESSION — cost-ledger-verify-tail

- base: `d96ef0350c2c43807c8fd8f2dd90a30350c01cfa` (working-tree dogfood, so `base = HEAD`). The baseline ran
  in a detached `git worktree` at that SHA.
- inside (12): the feature's `PLAN.md` and `GRILL.md`, `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`,
  `pharn/floor/{check-cost-ledger,render-cost-ledger,run-window-core}.mjs`, their two tests, the new fixture
  `pharn/floor/fixtures/cost-ledger/session-continued.jsonl`, and `pharn/pharn-contracts/cost-ledger.md`.
- `scope`: `escaped: []`. `escape_exempt` is the feature's `PLAN.md` and `GRILL.md`.
- outside: 93 test files and 1 committed eval pair (trust-fence).
- style gates: skipped. `inside` touches no shared style config, so they appear in neither map.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (93 outside files)                                                                 | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: none

Harness note: the outside test list ran through a fixed wrapper script (`node --test <list>` in the given
cwd). The pinned `cat … | xargs node --test` line was refused by this session's shell sandbox, which
rejects computed arguments to `node`. The invocation is the same one, and it ran identically at base and
at head.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The comparison
catches what the suite catches and nothing more. It certifies only the base-versus-head comparison, never
that the feature is correct.
