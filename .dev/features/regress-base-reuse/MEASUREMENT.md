# MEASUREMENT — regress-base-reuse (2026-09-28)

Measured on the maintainer's machine (darwin, Node 24), with `.dev/features/regress-base-reuse/measure.mjs`, 3
repetitions per variant. Each repetition builds a FRESH fixture repo, opens a `/pharn-loop` run marker, and runs
`stage-regress.mjs` twice over the same BASE requirement, with an in-scope implementation edit between the runs (what
a later loop iteration's build does). Pinned flags: `--timeout-ms 540000 --budget-ms 570000 --base <sha>`.

**The fixture.** An npm lockfile whose `postinstall` sleeps 1.5 s (so the base-commit `npm ci` is a real install
with a cost). Three gates: `test` (node:test, one outside test, 0.8 s), `typecheck` (1 s), `build` (1 s). Every gate
and the install append one line to a counter file outside the repo, and a `post-checkout` hook counts `git worktree
add` checkouts. The COUNTS are the result. The wall-clock shows what the counts save on this fixture's shape. It is not
a claim about any real project.

- **before** — `main`'s floor at `a2b5f6b` (`git archive a2b5f6b pharn/floor`);
- **after** — this branch's floor.

## Counts (identical in all 3 repetitions)

| variant | invocation | worktree checkouts | base installs | base gate runs | head gate runs | all gate runs |
| ------- | ---------- | -----------------: | ------------: | -------------: | -------------: | ------------: |
| before  | 1st        |                  1 |             1 |              3 |              3 |             6 |
| before  | 2nd        |                  1 |             1 |              3 |              3 |             6 |
| after   | 1st        |                  1 |             1 |              3 |              3 |             6 |
| after   | 2nd        |              **0** |         **0** |          **0** |              3 |         **3** |

After the first invocation, the reports read:

- `base_evidence = {reused: false, miss: "no-record", recorded: true}`;
- `base_evidence = {reused: true, miss: null, recorded: true}`, with the same `requirement_sha256`.

## Wall-clock (ms, per repetition)

| variant | 1st invocation        | 2nd invocation        |
| ------- | --------------------- | --------------------- |
| before  | 10606 / 10181 / 10093 | 10107 / 10114 / 10068 |
| after   | 10225 / 10218 / 10173 | 4400 / 4436 / 4365    |

- **The first invocation is unchanged in behaviour.** It does the same work and adds the decision and one record
  write. The difference, −381 ms to +125 ms, is within run-to-run noise.
- **The second invocation drops by ~5.7 s (−56%) on this fixture.** That saving is the base worktree checkout, the
  install and the three base gates, and the counts say those are gone. What remains is the HEAD side plus fixed costs:
  the spec chain, the partition, git, node start-up and the render.
- **The decision's own cost, timed in-process over the second run's fixture (20 calls), is 17.3–18.4 ms per decision.**
  That covers one `git rev-parse` spawn, reading and hashing the record, the stamp, three gates' logs and the markers.
  It runs once per invocation, plus once more at the verdict on a HIT.

## Not measured, and not claimed

- **Tokens.** The stage is deterministic code; the orchestrator's model turns per regress call are unchanged.
- **A real project's saving.** It scales with the base install and base suite time. The fixture's 1.5 s install and
  2.8 s of base gates stand in for minutes in a real project.
- **How often a real loop iteration keeps its BASE requirement.** A build that touches another outside test file, a
  style config or a root-level file misses, correctly. The miss categories in `base_evidence` are the data to count
  that later.
