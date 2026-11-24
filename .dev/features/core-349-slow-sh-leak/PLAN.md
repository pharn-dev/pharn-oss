# PLAN — core-349-slow-sh-leak

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L13, L52, L60]
- increment: Stop `pharn/floor/stage-verify.test.mjs`'s `killMidDrain` from leaking one forever-looping `sh slow.sh`
  per test run, by reaping every gate process group the fixture started before the fixture is removed, and asserting
  that none survives.
- layer(s): build apparatus only — a `*.test.mjs` file (never ships) + `CHANGELOG.md` `[Unreleased]` entry. No
  `SKILLS_VERSION` bump.
- constitution_refs: [P1, P6, P7]

## Why (P7 — a real, recorded failure)

Linear CORE-349 (found in the CORE-293 batch, 2026-11-23): 22 orphaned `sh slow.sh` processes, ppid 1, ages up to 8 h,
cwd a deleted `$TMPDIR/sv-*` fixture. Measured again this run, before any change: four such orphans were already
alive on this machine (ages 8–11 h, cwd `$TMPDIR/sv-*`), and one targeted run
(`node --test --test-name-pattern=Kill pharn/floor/stage-verify.test.mjs`) added one more (pid 84855, then 89010 on a
second traced run).

**Cause, traced this run** (a 100 ms poller over `ps`/`lsof` during the test): the test writes
`pharn/.run/slow-release` after the SIGKILL, then runs `--resume` and removes the fixture in `finally`. The gate
`sh slow.sh` runs in its own detached process group, so the SIGKILL of the stage's group does not reach it; it exits
only when it next sees `slow-release`. In the **real** call the resume re-runs the drain, which takes long enough for
the orphan to see the file. In the **mutant** call (no drain checkpoint) the resume returns `no-progress` at once, and
`rmSync` deletes the fixture inside the orphan's ~100 ms poll window — the traced orphan (89010) was the mutant's, and
the poller saw `release=yes` and then the directory gone. From then on `slow-release` can never appear: the shell loops
forever. The ticket's reading ("the release can never appear") is right; the trigger is a race between the release
write and `rmSync`, not a missing release write (the write exists at `:1209`).

## Approach

1. `slow.sh` appends its own pid to `pharn/.run/slow-pids` (`echo $$ >> …`) before it writes `slow-started`, so each
   run of the gate — the killed one and the one the real call's `--resume` re-runs — is recorded. (`ps` showed the
   gate is its own group leader, pgid == pid; the reap below does not depend on that.)
2. A helper `reapSlowGates(dir)` in the test file. A recorded pid counts as this fixture's gate only while
   `ps -o command= -p <pid>` reads exactly `sh slow.sh` (GRILL finding 1: a stale pid may have been reused by another
   process of the same user, so it is never signalled and never counted). For each such pid,
   `process.kill(-pid, "SIGKILL")` and `process.kill(pid, "SIGKILL")`, each ignoring `ESRCH`; then poll the same `ps`
   test up to 5 s; return the pids still alive.
3. In `killMidDrain`: right after the stage group is SIGKILLed and has exited, and **before** `slow-release` is written,
   call `reapSlowGates` and return its survivors as `orphans`. The release write stays (the real call's resume re-runs
   `sh slow.sh` and needs it to exit). In `finally`, call `reapSlowGates` again before `rmSync` (covers the resume's
   re-run and any failure path).
4. The test asserts `deepEqual(real.orphans, [])` and `deepEqual(mutant.orphans, [])`, with a message naming the
   leak, and asserts the pid file recorded at least one pid (so the empty list is not vacuous: no recorded pid would
   also give `[]`).

Stated consequence (GRILL finding 2): the real call's `--resume` now always meets the recorded gate group dead. Before,
the release was written first, so the orphan usually exited inside its ~100 ms poll before the resume read
`lock.child`; the live-group reap was never deterministically exercised by this test, and its named property (the
drain checkpoint persisted, the resume reaches `done`) is unchanged.

Rejected: reading the pgid from run-gates' `lock.child` record — it couples the test to a runtime record's path and
shape for no gain, and the record is gone once the stage's resume reaps it. Waiting for the orphan to exit on its own
after the release — that is the race itself.

## Sweep: other floor tests with the same pattern (L52 — the set, enumerated)

The set is: every test under `pharn/floor/*.test.mjs`, `.dev/floor/*.test.mjs`, `.claude/hooks/*.test.cjs` that starts
a process which runs until a file appears or forever. Searched this run with
`grep -nE 'while (\[|true|:)|sleep [0-9]|detached: true'` over those globs. Members found:

- `stage-verify.test.mjs` `killMidDrain` — the only file-gated forever loop (`while [ ! -f … ]`). **Fixed here.**
- Bounded sleeps (`sleep 30`/`60`/`120`, `sleep 3`, `setTimeout(…, 60000)`) in `check-verify`, `loop-closeout`,
  `run-gates`, `stage-direct`, `stage-gate-reap`, `stage-regress` tests — each ends on its own within 2 min, so none
  leaks **forever**; out of this ticket's axis and left alone (P7: no recorded failure).

## Applied lessons

- L60 — the new "no orphan" assertion gets its own negative control, run once by hand and recorded in the build's
  notes: with the step-3 reap call removed (scratch copy), the assertion must go red, because without the reap the
  orphan is still alive at that point (the release is written only after it). The "at least one pid recorded" check is
  there so an empty survivor list cannot pass by recording nothing.
- L52 — the remedy is quantified over a set (tests that leak a looping gate), so the set is enumerated above with the
  grep that produced it, and each member is named fixed or out of axis.
- L13 — the build formats the files it writes (`prettier --write` on the test file and `CHANGELOG.md`,
  `markdownlint --fix` on `CHANGELOG.md`) before its floor.

## Files

- `pharn/floor/stage-verify.test.mjs` — `slow.sh` records its pid; `reapSlowGates`; reap before release and in
  `finally`; the orphan assertions — apparatus (`*.test.*`, never ships)
- `CHANGELOG.md` — one dated `[Unreleased]` entry — repo meta

## Contracts satisfied

- None changed. The test still exercises `stage-verify.mjs`'s drain checkpoint exactly as before (its real/mutant
  assertions are unchanged).

## Evals to write (P1)

- No capability changes, so no capability eval. The test itself gains the orphan assertion (see L60 above for its
  negative control).

## Guarantee audit (P0)

- "the Kill test leaves no `slow.sh` it started running" → a test assertion over `process.kill(pid, 0)` after a
  SIGKILL — a deterministic check inside the suite, bounded: it covers the pids `slow.sh` recorded in its own fixture,
  not processes from earlier runs (the orphans already on a machine stay until killed by hand), and not a gate that
  dies before it writes its pid.
- No product claim changes; `SKILLS_VERSION` stays 7.23.0 (test-only, `*.test.*` is outside the bump set).

## Trust audit (P2)

- No untrusted input is ingested; the fixture is test-authored.

## Open questions (HALT)

- None.
