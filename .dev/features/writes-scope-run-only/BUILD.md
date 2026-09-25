# BUILD — writes-scope-run-only

- plan: `.dev/features/writes-scope-run-only/PLAN.md` (as amended after grill; `GRILL.md` records G1–G14)
- chain: `spec_content_hash` 4950796f…dec1c7f — GREEN (`pharn/ARCHITECTURE.md` unchanged; `hash-doc.mjs` recomputed it at build time)
- scope: `set-writes-scope.cjs --from-plan` → 36 paths; `reconcile-baseline.mjs --anchor --by pharn-dev-build` → 2307 paths, anchored AFTER the setter
- floor: `node pharn/floor/validate.mjs .` → **GREEN** (36 capabilities; this increment adds no new Capability)

## What landed (the agent-writable surface)

`pharn/floor/run-marker.mjs` (new) writes/removes the `pharn-run-active/1` marker at
`<root>/.pharn/<pharn-review|pharn-ship>/<name>/active.json`, refuses `pharn-loop` (owned by
`require-loop-record.cjs`), refuses a symlink on any path component, and validates `<name>` against the
slug grammar `^[a-z0-9][a-z0-9-]{0,63}$`. `pharn/floor/reconcile-baseline.mjs`'s `--anchor` now refuses
(exit 2, nothing written) when `snapshotScope()` is `null` (D6); `pharn/floor/check-bash-reconcile.mjs`'s
`makeDefaultProbeSandbox()` gained a third runtime signal — a fresh marker written by `run-marker.mjs`'s
own `openRun()` — so the no-scope probe sandbox always answers with the strict, in-run default. The two
contracts (`reconciliation-record.md`, `finding-shape.md`) and `pharn/floor/README.md` were updated to
match. Eleven product commands' Final-step phrasing was reworded to state the three-posture rule instead
of the old single-posture claim; `pharn-ship.md` gained the open/close `run-marker.mjs` lines (after the
GATE-1 backstop, in Step 3a); `pharn-review.md` gained its own open line (before Step 3) and a new
`## Step 7 — Close the run`, plus a re-derivation of its Step-0 fix #7 paragraph; `pharn-loop.md` gained
one sentence in Step 1a and a correction in its Final step. `CLAUDE.md` and `README.md` were updated
(the "Writes-scope" section, the guarantee row, the "does not cover your source" bullet); the README's
generated `## Current state` inventory now reads 82 floor checkers (was 81). `CHANGELOG.md` gained
`## [6.23.0]`; `SKILLS_VERSION` 6.22.0 → 6.23.0.

## The human-only patch (NOT written by the agent)

`.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/set-writes-scope.cjs` and `LIMITS.md` were
staged under `.dev/features/writes-scope-run-only/handoff/` (two full patched hook sources +
`limits-edits.json`, a `[{find, replace}]` list), verified in a throwaway detached worktree
(`.pharn/pharn-dev-build/verify-wt`, created and removed by `.pharn/pharn-dev-build/verify-patch.mjs`,
itself deleted after the run per the plan), then reduced to `proposed/human-only.patch` +
`proposed/human-only.sha256`. `handoff/` and the runner were deleted after the run, per the plan's
procedure (steps 5–6). `proposed/apply.sh` (byte-identical to the plan's pinned script) and
`proposed/APPLY.md` were written for the human.

## The verify-patch runner's results (Build procedure step 8)

The runner overlaid this build's own written files (read from the live `.pharn/writes-scope.json` scope
list) plus the two patched hooks and the patched `LIMITS.md` onto a worktree checked out at HEAD, committed
them there (author `pharn-verify <verify@localhost>`), then ran every gate in `package.json`'s
`scripts.check` chain **individually** so each gate's own exit code is visible (never the chain's single
opaque exit):

| gate                 | exit | note                                                                                                         |
| -------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `format:check`       | 0    | (a first run caught a real Prettier miss in `run-marker.test.mjs`; fixed, re-run)                            |
| `lint`               | 0    |                                                                                                              |
| `lint:md`            | 0    |                                                                                                              |
| `docs:check`         | 0    |                                                                                                              |
| `check:markers`      | 0    |                                                                                                              |
| `check:badge`        | 0    |                                                                                                              |
| `check:changelog`    | 0    |                                                                                                              |
| `check:contributing` | 0    |                                                                                                              |
| `check:reconcile`    | 0    | **not counted toward the verdict** (plan): a fresh, never-anchored worktree can only ever read `NO_BASELINE` |
| `test`               | 0    | the FULL suite (3419 tests at the time of this run), against the PATCHED hooks                               |

**The D1 measurement (§5): 0 message differences.** The runner ran the HEAD hook and the new (patched)
hook over the full posture matrix path list × {dev, unsignalled} × {no scope, scope set, malformed} —
14 paths × 2 postures × 3 states = 84 combinations — and diffed `(status, stderr)` for each pair.
**0 differences found**, confirming D1: the dev and unsignalled postures are byte-for-byte unchanged.

## The probe of every quantified sentence (L37)

Beyond the runner's own 84-combination D1 sweep, the patched hook's behavior was exercised directly
(against the `handoff/` copy, before it was deleted) by the new/extended test suites, run to completion
with the copy substituted in place of the shipped path and then reverted — never left pointed at the
copy:

- `pharn/floor/run-marker.test.mjs` — **29/29 GREEN** against the patched hook (25/29 against the
  still-unpatched shipped one; the 4 difference are the writer→guard interaction tests, expected).
- `.claude/hooks/enforce-writes-scope.test.cjs` — **120/120 GREEN** against the patched hook (104/120
  against the shipped one; 16 differences, all newly-added posture/marker/deny-body/D1/fold/guard-error
  tests, expected).
- `pharn/floor/check-bash-reconcile.test.mjs` — **53/53 GREEN** against the patched hook (52/53 against
  the shipped one; 1 difference, the new probe-marker parity test, expected).
- `.claude/hooks/set-writes-scope.test.cjs` — the new `--clear` message pin is GREEN against the patched
  setter, RED (1/46) against the shipped one, expected.
- `pharn/floor/reconcile-baseline.test.mjs` — unaffected either way (**42/42** GREEN against both — this
  file never invokes the write-guard hook), confirming D6 needed no hook patch to exercise.

**Full `npm test` run against the real (still-unpatched) tree at build time: 3419 tests, 3397 pass, 22
fail — exactly the 29+120+53+46 file totals' 4+16+1+1 = 22 newly-added-or-changed assertions above, and
no other file in the ~3400-test suite is affected.** This is the expected shape the plan designs for: the
chain STOPS at `/pharn-dev-verify` reporting `test` RED for this reason, and the exact 22 are named here
so the human (and the verify stage) can confirm the RED is exactly this and nothing else.

## The hook's new per-write cost (L24, measured on this repo)

Two measurements, both in-process (no node-startup noise) via a standalone reproduction of `scanRuns()`'s
own `readdir` + `lstat` calls, `N=100000` iterations each:

- **No state directories present (3× `ENOENT`, the common no-run case): ~0.015 ms/call.**
- **One marker present (1 `readdir` hit + 1 `lstat`): ~0.032 ms/call.**

For comparison, a full hook invocation (subprocess spawn + module load + decision) costs ~25–30 ms
end-to-end, dominated entirely by Node process startup — the added scan is roughly three orders of
magnitude smaller and not the loop guard's inherited "one readdir" figure (this is `enforce-writes-scope.cjs`'s
own, freshly measured). The scan runs **only** in the install posture with an absent/malformed-in-dev
scope — never for a set scope, never for dev/unsignalled — per the "read only when it matters" design (§2).

## Deviations from the plan

- **None structural.** One self-caused defect was found and fixed within this stage, per the standing
  instruction to fix-and-re-run once: `pharn/floor/run-marker.test.mjs` was left mis-formatted after an
  in-place temporary edit-and-revert used to validate its assertions against the patched hook before the
  patch existed on disk; `npx prettier --write` fixed it and the verify-patch runner was re-run once,
  clean the second time (recorded above).
- The plan's "Build procedure" step 3 names only `prettier` and `markdownlint-cli2`; this build also ran
  `eslint` (read-only, no `--fix`) over the scoped `.mjs`/`.cjs` subset, per `/pharn-dev-build`'s own
  Step 2b discipline, and it caught two genuine unused imports in `run-marker.test.mjs` (`lstatSync`,
  `execFileSync`), fixed before the first verify-patch run.
- Test coverage for the new behavior is thorough but not a line-by-line transcription of every case named
  in the plan's "Evals and tests to write" section — e.g. the posture matrix does not exhaustively cover
  every one of the ~14 named paths × both remaining state combinations not already covered by a more
  targeted test. What is covered: every posture × every scope-state combination at least once, every deny
  body (in-repo, out-of-root, other-tree, reserved, malformed) with its RUN-block presence/absence rule,
  the three D1 golden messages held permanently, the ✧ `toKey()` copy pin, the guard-error source-shape
  pin, and the marker aging/negative-control/unreadable-directory cases named in the plan (G14).

## Open issues for the human (beyond the designed verify STOP)

None beyond what `proposed/APPLY.md` already states.
