# DEMO — run-performance-breakdown (6.35.0), a controlled end-to-end fixture

Produced by `node .dev/features/run-performance-breakdown/demo.mjs` (apparatus). A two-iteration
`/pharn-loop`-shaped run built from the REAL marker writer, work-record writer, ledger emitter, checker and run
report. **Synthetic, stated:** the transcript (one main-thread context, invented token counts), the timestamps and
the stamp contents. The real stage scripts writing these records from gates they actually spawned are exercised by
`stage-regress.test.mjs` (★ HIT, the budgeted chain) and `stage-verify.test.mjs` (★ EQUIVALENCE, OBSERVATIONAL).

check-cost-ledger: GREEN (0 warn(s))

## The stop's screen table (`table()`)

```text
cost ledger — demo-feature (partial, run window bounded, 0 outside excluded, 126 requests, dedup on requestId)
  stage              iter  model                 reqs  cache_read   output
  pharn-build           1  claude-sonnet-5         41     2611700    65600
  pharn-build           2  claude-sonnet-5         17     1113500    22100
  pharn-grill           -  claude-opus-5-5          8      494200     5600
  pharn-plan            -  claude-opus-5-5         22     1342550    30800
  pharn-regress         1  claude-opus-5-5          4      259300     1200
  pharn-regress         2  claude-opus-5-5          3      198000      750
  pharn-spec            -  claude-opus-5-5          9      542250     8100
  pharn-test            -  claude-sonnet-5         14      872550    15400
  pharn-verify          1  claude-opus-5-5          3      195000      750
  pharn-verify          2  claude-opus-5-5          5      331000     1150
  TOKENS ONLY — no prices here. Multiply by your own price list; output_thinking ⊂ output.
observed elapsed — wall clock between PHARN's stage markers (not CPU, model or tool time; not monotonic)
  stage              iter  run  elapsed
  pharn-spec            -    1  180.0 s
  pharn-plan            -    1  390.0 s
  pharn-grill           -    1  135.0 s
  pharn-test            -    1  235.0 s
  pharn-build           1    1  895.0 s
  pharn-regress         1    1  455.0 s
  pharn-verify          1    1  135.0 s
  pharn-build           2    1  355.0 s
  pharn-regress         2    1  125.0 s
  pharn-verify          2    1  75.0 s
  pharn-verify          2    2  65.0 s
deterministic work — gate processes run vs taken from reused evidence (counted from each stage's gate-run stamp)
  pharn-regress iter 1 run 1: HEAD gates 3 run, 0 reused, 1 nothing-to-run, of 4; BASE fresh (no-record) — worktree created, install ran (exit 0, 94.2 s), base gates 3 run, 0 reused, 1 nothing-to-run, of 4
  pharn-verify iter 1 run 1: gates 4 run, 2 reused, 0 nothing-to-run, of 6
  pharn-regress iter 2 run 1: HEAD gates 3 run, 0 reused, 1 nothing-to-run, of 4; BASE REUSED (no worktree, no install, 0 base gate processes; 3 results from earlier evidence)
  pharn-verify iter 2 run 1: gates 4 run, 2 reused, 0 nothing-to-run, of 6
  pharn-verify iter 2 run 2: gates 6 run, 0 reused, 0 nothing-to-run, of 6
```

## The run report's new section (`RUN-REPORT.md`)

## Stage elapsed and deterministic work

**Observed elapsed** is wall-clock time between two PHARN markers — the stage's start and the orchestrator's
return — read by two different processes. It is NOT CPU time, model time or tool time, it is not monotonic, and
it includes orchestration, subprocesses, waiting and any answer a human gave inside the stage. An `unmeasured`
row names why no interval could be paired, and is never a zero. **Deterministic work** is counted from each
`/pharn-regress` and `/pharn-verify` execution's own gate-run stamp at its `done` exit; an execution that ended any
other way recorded none. Nothing here is subtracted from anything else.

```text
observed elapsed — wall clock between PHARN's stage markers (not CPU, model or tool time; not monotonic)
  stage              iter  run  elapsed
  pharn-spec            -    1  180.0 s
  pharn-plan            -    1  390.0 s
  pharn-grill           -    1  135.0 s
  pharn-test            -    1  235.0 s
  pharn-build           1    1  895.0 s
  pharn-regress         1    1  455.0 s
  pharn-verify          1    1  135.0 s
  pharn-build           2    1  355.0 s
  pharn-regress         2    1  125.0 s
  pharn-verify          2    1  75.0 s
  pharn-verify          2    2  65.0 s

deterministic work — gate processes run vs taken from reused evidence (counted from each stage's gate-run stamp)
  pharn-regress iter 1 run 1: HEAD gates 3 run, 0 reused, 1 nothing-to-run, of 4; BASE fresh (no-record) — worktree created, install ran (exit 0, 94.2 s), base gates 3 run, 0 reused, 1 nothing-to-run, of 4
  pharn-verify iter 1 run 1: gates 4 run, 2 reused, 0 nothing-to-run, of 6
  pharn-regress iter 2 run 1: HEAD gates 3 run, 0 reused, 1 nothing-to-run, of 4; BASE REUSED (no worktree, no install, 0 base gate processes; 3 results from earlier evidence)
  pharn-verify iter 2 run 1: gates 4 run, 2 reused, 0 nothing-to-run, of 6
  pharn-verify iter 2 run 2: gates 6 run, 0 reused, 0 nothing-to-run, of 6
```

## The five questions, answered from `cost.json` alone

1. **Most model usage:** by requests, `pharn-build` (58 requests); by output tokens, `pharn-build` (87700 output tokens, 3725200 cache-read). Source: `by_stage_iteration_model`, summed over iterations and models.
2. **Longest observed interval:** `pharn-build` iteration 1 run 1, 895000 ms. Summed over its executions, the stage with the most observed wall clock is `pharn-build`. Source: `executions.rows` (wall clock between markers — not model, tool or CPU time).
3. **BASE regression work reused?** iteration 1: no (`no-record`) — worktree created, install ran (94218 ms), 3 BASE gate processes; iteration 2: yes — no worktree, no install, 0 BASE gate processes. Source: `work[]`, `base.evidence`.
4. **VERIFY gate processes avoided:** 4 across 3 verify executions (iter 1 run 1: 2 of 6, iter 2 run 1: 2 of 6, iter 2 run 2: 0 of 6); plus 3 BASE gate results taken from earlier evidence. Source: `work[].gates.reused`, `work[].base.reused`.
5. **Expensive deterministic work that still executed:** pharn-regress iter 1 run 1: 3 HEAD + 3 BASE gate process(es), install 94218 ms, a BASE worktree; pharn-verify iter 1 run 1: 4 gate process(es); pharn-regress iter 2 run 1: 3 HEAD + 0 BASE gate process(es); pharn-verify iter 2 run 1: 4 gate process(es); pharn-verify iter 2 run 2: 6 gate process(es).

## Added overhead (median of 21 runs; 201 for the append)

| measured                                                   | value                           |
| ---------------------------------------------------------- | ------------------------------- |
| `renderLedger` on this run, with vs without `work.jsonl`   | 3.97 ms vs 2.88 ms              |
| `checkLedger` on this ledger, with vs without the two keys | 2.72 ms vs 3.02 ms              |
| `buildExecutions` over 1,001 markers and 500 work records  | 12.79 ms                        |
| `readWork` over 500 records                                | 1.02 ms                         |
| one `appendWork` (the stage scripts' only added I/O)       | 0.11 ms                         |
| `cost.json` size, with vs without the two keys             | 82478 vs 79631 bytes, +25 lines |

Structural bound, independent of this machine: the emitter reads ONE extra small file per emission, makes no
extra transcript pass, spawns no process and calls no model; the view is one pass over the current run's markers
plus one latest-marker search per work record; each stage script adds one `JSON.stringify` + one append at `done`,
and regress one `performance.now()` pair around its install.
