# PLAN — gate-runner-batch

- feature: gate-runner-batch
- applied_lessons: [L34, L41, L52]

Audit batch B2 (LIGHT path) over the gate runner, from the 2026-10-07 production-readiness audit: P2-F (a snapshot-oracle
AC test passes the AC gate, because vitest and Jest write a missing snapshot when `CI` is unset), P3-J (`validateStamp`
never compares `fingerprint.init` with `runs[0].fp_before`), P3-P (a harness SIGKILL of `run-gates` orphans its gate's
process group, and stale-lock recovery then re-runs the entry while the orphan still runs), and CodeQL alerts #10/#17 on
the gate spawn. `run-gates` hands `CI=1` to the test-level gates (`test`, `test:e2e`, `e2e`, `base:test`) unless the
inherited environment already defines `CI`; `/pharn-test` gains an advisory rule against snapshot and build-written
oracles; `validateStamp` and the runner's finalize refuse `init !== runs[0].fp_before` as `tree-changed-between-gates`
(an existing LAPSE member, so the gate-run-core edit stays inside `validateStamp`); the runner records the running gate's
process group in a sidecar `<out>/lock.child`, stale-lock recovery stops that group before re-running, and SIGTERM /
SIGINT / SIGHUP are forwarded to the group, the entry left unrecorded. SIGKILL of the runner itself cannot be caught.
The CodeQL flows are inherent (gate commands are project-configured by design): a justification comment, dismissal left
to the orchestrator.

## Applied lessons

- L34: every refusal test pairs with its non-vacuity control (a project's explicit `CI` is passed unchanged; a lint gate
  gets no `CI`; an `init === runs[0].fp_before` stamp still validates; a live sidecar group of a LIVE lock is not killed).
- L41: the orphan-recovery and signal paths are unreachable from an end-to-end run, so each test constructs the state
  directly (a real orphaned group recorded in a sidecar, a real SIGTERM to a running runner).
- L52: the CI rule is iterated over every member of the test-gate set and a non-member, not one id.

## Files

- `.dev/features/gate-runner-batch/PLAN.md` — **NEW.** this plan.
- `pharn/floor/run-gates.mjs` — **EDIT.** CI=1 for test-level gates; the `lock.child` sidecar, orphan-group reap on
  stale-lock recovery, signal forwarding; finalize refuses `init !== runs[0].fp_before`; CodeQL justification comment.
- `pharn/floor/run-gates.test.mjs` — **EDIT.** tests for the CI rule, the orphan reap, signal forwarding and the
  init-chain refusal at finalize.
- `pharn/floor/gate-run-core.mjs` — **EDIT.** `validateStamp` compares `fingerprint.init` with `runs[0].fp_before`.
- `pharn/floor/gate-run-core.test.mjs` — **EDIT.** the init-chain refusal and its control.
- `pharn/floor/ac-gate-core.test.mjs` — **EDIT.** a snapshot-oracle AC fixture run through the real `spawnGate` fails
  the AC gate.
- `pharn/floor/entry-base-evidence-core.test.mjs` — **EDIT.** its init-mismatch case is now refused one step earlier
  (validateStamp → `source-invalid`); `mutated-prefix` keeps a case that still reaches it (an unflagged moved run).
- `pharn/floor/stage-work.mjs` — **EDIT.** item 6 (coordinator, CI flake on #328): `appendJsonLine`'s lstat→ENOENT→mkdir
  race. On EEXIST from `mkdirSync`, re-lstat and apply the same symlink / not-a-directory refusal (never followed);
  a test seam between the missing lstat and the mkdir.
- `pharn/floor/stage-work.test.mjs` — **EDIT.** the deterministic race test through the seam (a directory created in
  the window is accepted; a symlink created in the window is refused).
- `.claude/commands/pharn-test.md` — **EDIT.** Step 3 rule: no snapshot or build-written oracle.
- `pharn/pharn-contracts/gate-run-record.md` — **EDIT.** the CI variable, the init→first-gate chain, the orphan bound.
- `.dev/guides/floor-gates.md` — **EDIT.** the runner's bounds line (orphan recovery, CI).
- `SKILLS_VERSION` — **EDIT.** patch bump.
- `CHANGELOG.md` — **EDIT.** the version section.
- `README.md` — **EDIT.** the version badge.
