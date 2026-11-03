# BUILD — loop-record-honesty

GATE 1 was decided by the batch orchestrator (a model) under the owner's delegation. It was not a human approval.
It approved the plan as written: Q1 no refusal (the miss is reported in `left_dirty.status`), Q2 drop the
parenthetical, Q3 the exact 15-name list, described in the contract as a placeholder deny-list. All five grill items
were folded in, and `BLOCKED_RE` was not touched.

Build Step 0 ran the setter (`--from-plan`, 21 paths) and then `reconcile-baseline.mjs --anchor --by pharn-dev-build`.
The spec hash matched (`d5a97430…`). Floor: `node pharn/floor/validate.mjs .` reported GREEN (37 capabilities), exit 0.

## Finding → outcome

| finding (review §3 / axis4)                                                       | outcome                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOW — a duplicate-key verify/regression report reads last-wins                    | **fixed**: `check-loop.mjs` `repeatedTopLevelKeys`; any repeated top-level key → INCONCLUSIVE exit 2 (keys ≤ 5 shown, each ≤ 64 chars); nested repeat not refused (stated)                                                                      |
| LOW — the same finding, for check-spec's repeated `state:`                        | **fixed**: `repeated-key` RED for `state` / `approved_by` (narrowed in build — PLAN "Build deviations"); `--state` keeps readField parity; check-spec-approved refuses through validate (no new reader)                                         |
| LOW — check-attestation accepts `by: agent` and an impossible date                | **fixed**: `RESERVED_BY` (15 names, case-folded, exact) and `realInstant` (calendar, leap years, offset; leap second refused, reason in code)                                                                                                   |
| LOW — `approved_by` validated by nothing; the commit message hard-codes it        | **fixed**: `approved-by` RED unless `model` when present (absence not detected, stated); `COMMIT_BODY` no longer cites the field                                                                                                                |
| MEDIUM — a user's pre-existing edit to a plan-named path is swept into the commit | **fixed**: `buildStageList` asks `preRunUnchanged` about scope paths (not artifacts or pinned tests); unchanged ones are left out and named in `left_dirty`; a miss subtracts nothing and is reported; a reader throw crashes before the branch |

## Grill items folded in

1. Reader throws → not caught, so the closeout crashes before the branch step (header text and a test).
2. Quoted repeated keys are bounded (5 keys, 64 characters each), with a test.
3. Log line `── left out of the commit (…; pre-run snapshot <status>): N path(s)` followed by the paths, with a test.
4. The leap-second rationale is in the code and the contract.
5. The 24 h marker bound is stated beside the miss rule in the `buildStageList` header, the close part and the
   CHANGELOG.

## Notes

- **First `npm run check` was RED (exit 1): 6218 tests, 6213 pass, 4 fail.** The failures were in
  `ac-tests-lock.test.mjs` (×2), `frontmatter-core.test.mjs` (✧ PARITY `--state` = `readField`) and
  `check-plan-spec-agree.test.mjs` (chain message). The plan had gone wider than the finding, so the build narrowed
  `repeated-key` to `state` / `approved_by` and kept `--state` last-wins (PLAN "Build deviations"). It then widened
  `## Files` by `check-plan-spec-agree.test.mjs` only. Reconcile over the first window was CLEAN (18 reconciled,
  0 escapes), and build Step 0 was re-run (setter with 22 paths, then `--anchor`).

- `check-spec-approved.mjs`'s header still tells the history of its old first-wins `readState()` in terms of
  check-spec's "LAST-wins" parse. That is the historical record of the earlier divergence. The file is not in this
  plan's `## Files`, so it is left as is.
- No trusted doc changes and no hook or settings change. There is no DOCS-PROPOSAL.md and no apply.py.
