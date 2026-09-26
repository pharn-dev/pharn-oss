# VERIFY — stage-regress-script

**Re-run note.** This stage ran twice. Between the first run and this one, the build stage completed a
deferred comment-only fix to `pharn/floor/gate-run-core.mjs` (see `BUILD.md`, "Re-runs") and `/pharn-dev-regress`
was re-run in full over the corrected tree (see `REGRESSION.md`). All seven gates below were re-captured
fresh over the final tree; every one stayed green across both runs.

## Gate table

| gate                                                                 | exit |
| -------------------------------------------------------------------- | ---- |
| `test` (`npm test`, 3428 tests)                                      | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                       | 0    |
| `lint` (`npm run lint`)                                              | 0    |
| `format:check` (`npm run format:check`)                              | 0    |
| `lint:md` (`npm run lint:md`)                                        | 0    |
| `structural:…/expected-injection-comment.json`                       | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) | 0    |

## Verdict

**VERIFIED: floor gates PASS.**

`failing_gates`: none.

## Verifiers

No verifiers registered — floor gates only. `node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`.

## Reconcile detail

`check-bash-reconcile.mjs` reports `"verdict": "CLEAN"` against the `/pharn-dev-build` Step-0 anchor: 28
paths reconciled, 0 escapes. This feature's own pipeline artifacts (`BUILD.md`, `REGRESSION.md`,
`regression-report.json`) are exempted by name, as designed — none is a Bash-write escape.

## Re-run after GATE 2 fix (6feee30)

- stage: verify re-run over `6feee30` (the GATE-2 review fixes). Model: **opus was set by the
  maintainer's instruction, overriding pharn.config.json**, not by the config (which names sonnet for
  verify). Model routed via Agent subagent; effort not routed.
- The gates were run by a node runner under `.pharn/pharn-dev-verify/`, not by the pinned shell block. The
  isolated worktree refuses shell variables and heredocs. The gate set, order and exit-code-only capture
  are the same as Step 1, and `reconcile` still ran last.

### Gate table (re-run)

| gate                                                                 | exit |
| -------------------------------------------------------------------- | ---- |
| `test` (`npm test`, 3450 tests: 3450 pass, 0 fail, 0 skipped)        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                       | 0    |
| `lint` (`npm run lint`)                                              | 0    |
| `format:check` (`npm run format:check`)                              | 0    |
| `lint:md` (`npm run lint:md`)                                        | 0    |
| `structural:…/expected-injection-comment.json`                       | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) | 0    |

### Verdict (re-run)

**VERIFIED: floor gates PASS.** `node pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json
--feature stage-regress-script` → exit 0, `"verdict": "PASS"`, `failing_gates`: none. `verify-report.json`
is that output verbatim plus the advisory `verifiers` block. It is byte-identical to the original run's,
because the machine report carries no run identity. The original run's numbers above are kept as recorded.

No verifiers registered — floor gates only (`{"registered":0,"verifiers":[]}`, re-read this run).

### Reconcile — two epochs, both recorded

This worktree held no reconcile baseline, so the re-run anchored its own. The two results cover different
windows, and neither substitutes for the other.

- **Full window (build + GATE-2 fixes), run by the orchestrator in the original build worktree at
  `6feee30`:** `{"verdict":"CLEAN","epoch":"2026-09-25T22:17:32.549Z","anchored_by":"pharn-dev-build","reconciled":29,"escapes":[]}`,
  exit 0. This reviewer relays it and did not re-execute it here: that baseline lives in another worktree's
  git-ignored `.pharn/`.
- **This re-run's own epoch:** anchored with
  `node pharn/floor/reconcile-baseline.mjs --anchor --by stage-regress-script-opus-verify`. That ran after
  `/pharn-dev-build` Step 0's setter (`set-writes-scope.cjs --from-plan`, 35 scope entries: the PLAN's
  original `## Files` plus its GATE-2 amendment). It anchored 2324 paths. The `reconcile` gate then
  reported `{"verdict":"CLEAN","epoch":"2026-09-26T08:26:19.858Z","anchored_by":"stage-regress-script-opus-verify","reconciled":0,"escapes":[]}`.
  It covers only writes from that anchor through this gate, and no tracked path changed in that window.
  A `CLEAN` means no escape was detected, never that none occurred
  (`pharn/pharn-contracts/reconciliation-record.md`).

## Re-run after GATE-2 round 2 — the standing run

- **What changed.** GATE-2 round 2 changed code (`stage-regress.mjs`, `stage-regress.test.mjs`) and
  prose (the contract, the command, CHANGELOG [6.23.0]). BUILD.md, "GATE 2 round 2", lists it.
- **Model.** opus, by the maintainer's instruction, overriding `pharn.config.json`'s sonnet for verify.
  Model routed via Agent subagent; effort not routed.
- **How the gates ran.** Through the same node runner, with the same gate set and order and `reconcile`
  last.

### Two attempts, both recorded

1. **First attempt: FAIL (`test` exit 1, 3452/3453).** The one failure was a round-1 test's fixed 800 ms
   wait before a kill, which a loaded run (141 s wall) outran; the test assumed the run had reached its
   first checkpoint by then. The test was fixed to wait for the install step, under the build's scope,
   because the verify scope denied the edit, as it should. BUILD.md, "A test timing flake", has the
   details. All other gates were 0, and `reconcile` was CLEAN.
2. **Second attempt: PASS** (all 7 gates 0, 3453/3453). After it, two prose-only edits to
   `pharn-regress.md` (BUILD.md, "Two last prose edits") made the tree differ from what it verified.
3. **Third attempt, on the final tree: PASS.** This is the standing verify. The table below is its
   capture.

### Gate table (round-2 re-run, third attempt — the standing one)

| gate                                                                 | exit |
| -------------------------------------------------------------------- | ---- |
| `test` (`npm test`, 3453 tests: 3453 pass, 0 fail, 0 skipped)        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                       | 0    |
| `lint` (`npm run lint`)                                              | 0    |
| `format:check` (`npm run format:check`)                              | 0    |
| `lint:md` (`npm run lint:md`)                                        | 0    |
| `structural:…/expected-injection-comment.json`                       | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) | 0    |

### Verdict (round-2 re-run)

**VERIFIED: floor gates PASS.** `check-verify.mjs` → exit 0, `"verdict": "PASS"`, `failing_gates`: none.
`verify-report.json` is that output plus the advisory `verifiers` block, byte-identical again. No
verifiers registered — floor gates only (re-read this run).

### Reconcile (round 2)

This round anchored a fresh epoch before its first edit, after the PLAN's setter:
`reconcile-baseline.mjs --anchor --by stage-regress-script-gate2-round2`, 2324 paths, 35 scope entries.
The gate reported
`{"verdict":"CLEAN","epoch":"2026-09-26T08:42:12.538Z","anchored_by":"stage-regress-script-gate2-round2","reconciled":5,"escapes":[]}`.

- The five reconciled paths are this round's in-scope edits.
- `BUILD.md`, `REGRESSION.md` and `regression-report.json` are exempt by name as pipeline artifacts.
- The window is anchor to this gate: this round only. The two epochs above cover the earlier windows.

---

**verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates
check — verifier concerns are advisory help, not assurance.**
