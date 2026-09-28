# MEASUREMENT — verify-head-gate-reuse (2026-09-28)

Measured on the maintainer's machine (darwin, Node 24), with `.dev/features/verify-head-gate-reuse/measure.mjs`, 3
repetitions per variant, the machine otherwise idle. Each repetition builds a FRESH fixture repo carrying the floor
under test as its own `pharn/floor/` (an install's layout) and the write guards, opens a `/pharn-loop` run marker,
anchors the reconcile epoch as the build does, makes the build's edit, then runs `stage-regress.mjs` and
`stage-verify.mjs` with the pinned flags (`--timeout-ms 540000 --budget-ms 570000`; regress also `--base <sha>
--no-install`).

**The fixture.** Four gates: `test` (node:test, one test, 0.3 s), `lint` (0.8 s), `typecheck` (1 s), `build` (1 s).
Every gate appends one line naming itself and the stage it ran under (read from `PHARN_TEST_RESULTS`, whose value is
that gate's own path under the stage's `<out>`) to a counter file outside the repo. The build edit touches
`eslint.config.mjs`, so regress runs its style gate too — the widest overlap a discovered set has. The COUNTS are the
result; the wall-clock shows what the counts save on this fixture's shape, not what any real project saves.

- **before** — `main`'s floor at `2cf0e85` (`git archive 2cf0e85 pharn/floor`);
- **after** — this branch's floor.

## Counts (identical in all 3 repetitions)

| variant | regress/HEAD processes | regress/BASE processes | verify processes                 |    verify entries reused | total gate processes |
| ------- | ---------------------: | ---------------------: | -------------------------------- | -----------------------: | -------------------: |
| before  |                      4 |                      4 | 4 (test, lint, typecheck, build) |                        0 |                   12 |
| after   |                      4 |                      4 | **2** (test, lint)               | **2** (typecheck, build) |               **10** |

`reconcile` (PHARN's own gate, always last at verify and never reused) is not counted above; it runs in both variants.
`test` runs at both stages because it is never the same execution (regress: the outside-scope subset; verify: the
whole suite) and is an AC level gate; `lint` runs at both because style gates are never reused (grill B1). In the
common case where the build touches no style config, regress skips `lint` by design, so regress spawns 3 + 3 and
verify still spawns the same 2 — the reused pair is the same.

Both variants' verdicts are `PASS` in every repetition, and the after-variant's `verify-report.json` reads
`gate_reuse.reused = [typecheck, build]`.

## Wall-clock (ms, per repetition)

| variant | regress (whole stage) | verify (whole stage) |
| ------- | --------------------- | -------------------- |
| before  | 9822 / 9827 / 9763    | 4815 / 4833 / 4885   |
| after   | 9738 / 9755 / 9843    | 2506 / 2465 / 2508   |

- **Verify drops by ~2.35 s (−49%) on this fixture** — the two reused gates' own time (2 × 1 s) plus two `npm run`
  start-ups. Everything else verify does is unchanged: the chain check, the pairs, the verifier count, the
  completeness capture, `test`, `lint`, `reconcile`, two fingerprints per SPAWNED gate, the verdict and the render.
- **Regress is unchanged within noise** (−89 ms to +80 ms): it publishes one small offer record once its HEAD stamp is
  final, and records an identity per run.
- **The offer decision's own cost, timed in-process over the finished fixture (20 calls), is 16.9–17.8 ms**: one `git
rev-parse --absolute-git-dir` spawn, reading the markers, the offer and the head stamp and hashing them, plus one
  `findReusable`. It runs once per verify invocation. The per-entry cost inside `run --next` (re-reading and hashing
  the source stamp, the decision, reading, hashing and writing two logs) is inside the verify wall time above and
  replaces a gate spawn plus its post-gate fingerprint.

## Not measured, and not claimed

- **Tokens.** The stages are deterministic code; the orchestrator's calls per verify are unchanged, and a reused entry
  still spends one budgeted `run --next` call (so reuse saves processes and wall-clock inside an invocation, never a
  Bash call or a model turn).
- **A real project's saving.** It scales with the duration of the project's `typecheck` / `type-check` / `build` (and
  any structural pair both stages run). The fixture's 1 s gates stand in for minutes in a real project.
- **How often a real run offers.** Only inside a `/pharn-loop` or `/pharn-ship` run whose regress published an offer
  and whose tree did not move between regress and verify; every other verify runs every gate, as before.
