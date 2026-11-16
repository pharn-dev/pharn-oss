# PLAN — stage-gate-reap: each stage script stops a leftover gate group before it deletes its gate directory

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L35, L41, L54, L81]
- increment: `stage-verify.mjs` and `stage-regress.mjs` stop a gate process group recorded in their gate directory's
  `lock.child` (under an absent or stale `lock`) BEFORE their fresh start deletes that directory, through the
  `run-gates.mjs` reap logic exported for them; an end-to-end takeover test per stage proves no two gates overlap; the
  7.15.0 claim that `init`'s reap covers the takeover path is corrected (the stage-direct header, run-gates' comment,
  and a new CHANGELOG entry, since the 7.15.0 section is frozen). Also splits the EACCES subcases in
  `stage-direct.test.mjs` into their own root-skipped tests (CodeRabbit, PR #443).
- layer(s): product floor `pharn/floor/` (`run-gates.mjs`, `stage-verify.mjs`, `stage-regress.mjs`, `stage-direct.mjs`
  header, tests), build apparatus (`.dev/guides/floor-gates.md`, this feature folder), repo meta.
- constitution_refs: [P0, P3, P5, P6, P7]
- revision: v1, approved at GATE 1 by the human on 2026-11-13 ("Approve, script route").
- write route: this desktop worktree session's write hooks judge the main checkout, so every Write/Edit here is
  denied. The human chose the "script route" at GATE 1: every in-repo write goes through a scratchpad helper that
  first runs BOTH real hooks of this worktree (`protect-trusted-paths.cjs`, `enforce-writes-scope.cjs`, cwd and
  `CLAUDE_PROJECT_DIR` = the worktree, a synthesized Write/Edit payload) and writes only when both exit 0. That the
  helper was used for every write is discipline; verify's `reconcile` gate is the floor that would catch an escape.

## Why (P7) — the recorded failure

- CodeRabbit on PR #443 (pharn-dev/pharn-oss#443): a runner death during the FIRST gate leaves that gate running in its
  own process group (run-gates starts every gate `detached`); `stage-direct.mjs`'s takeover then re-runs the FRESH
  argv. #443 made `run-gates.mjs init` (`startRecord`, lines 885-890) reap `lock.child` before its wipe — but read live
  this run, both stage scripts delete the gate directory BEFORE calling `init`:
  - `stage-verify.mjs:220-229` `removeEarlierOutput` → `rmSync(VERIFY_PATHS.root)` (holds `gates/lock.child`), called
    at `runFresh` line 512, before `phaseInit`.
  - `stage-regress.mjs:415-431` `clearScratchKeepingBaseEvidence` → `rmSync` of every entry but a retained
    `base-gates/`, so `head/lock.child` is deleted; called from `phaseFreshLate` before the HEAD `init`.
    So `init` finds no record and the replacement gate starts beside the survivor. The #443 test
    (`run-gates.test.mjs:2480`, "PR #443 — a fresh `init` after a SIGKILLed runner …") calls `init` directly and never
    passes through the stage cleanup — the gap is invisible to it.
- The 7.15.0 CHANGELOG entry (lines 53-55) and `stage-direct.mjs:148-153` both state `init`'s reap covers "a takeover's
  fresh re-run". That is false today, so it is corrected here, as the brief asks.

## The design

1. **`run-gates.mjs` — one reap, exported, non-emitting.** Split today's `reapOrphanGroup` (which calls `fail()`, i.e.
   prints a run-gates JSON object and throws `EMITTED` — wrong inside a stage script that owns its stdout) into:
   - `reapGroup(outAbs)` → `{ ok: true } | { ok: false, pgid }`: today's body (read `lock.child`, SIGTERM then SIGKILL
     with `KILL_GRACE_MS` each, remove the record) with no emission;
   - `reapOrphanGroup(outAbs)` → `reapGroup` + today's `fail("lock-busy", …)` on `ok: false` (callers unchanged:
     `takeLock`'s stale recovery);
   - exported `reapLeftoverGate(outAbs)`: read `<out>/lock`; a LIVE lock (`!isStaleLock`) → `{ ok: true }`, nothing
     signalled; absent, unreadable or stale → `reapGroup(outAbs)`. `startRecord` calls it in place of its inline
     lock test + `reapOrphanGroup` (so the absent-or-stale rule exists once, L35), keeping `fail("lock-busy")`.
   - `startRecord`'s comment is corrected: its reap covers a direct `init` re-run over an existing `<out>`; the stage
     scripts delete their directories first and so reap themselves.
2. **`stage-verify.mjs` `removeEarlierOutput`** — order becomes: the two feature reports, `stage.json`, then a
   containment walk of `VERIFY_PATHS.gates` (the existing `containmentWalk`, L54 — a symlinked `gates` refuses
   `path-containment` and nothing is signalled through it), then `reapLeftoverGate(VERIFY_PATHS.gates)`, then the
   `rmSync` of the root. `ok: false` → `unusable` `child-refused` (an existing registered code — no vocabulary change,
   so no contract change and no MIN_CLI concern) with a detail naming the pgid and "refusing to overlap it". A refusal
   leaves no report and no progress record behind (the existing G1/N1 rule holds: both removed before the reap).
3. **`stage-regress.mjs` `phaseFreshLate`** — before `clearBaseWorktree()`: for both `REGRESS_PATHS.head` and
   `REGRESS_PATHS.baseGates` (a runner killed during a BASE gate leaves one there too; `base-gates/` is retained by the
   scratch clear but the retained-miss discard can delete it before the base `init`), containment walk + the same reap +
   the same `child-refused` refusal. Reaping before the base worktree is removed also stops a base gate before its cwd
   disappears.
4. **Header and docs corrected** — `stage-direct.mjs:148-153` (the bound now names the stage scripts' fresh start as
   the takeover's reap and `init`'s as the direct caller's); `.dev/guides/floor-gates.md` run-gates bounds line (one
   clause).
5. **`stage-direct.test.mjs` EACCES split** — the subcases that `chmod` `RUNNER_LOG` (0o444, two sites ~2451, ~2685)
   and `LOCK_DIR` (0o600 ~2623, 0o500 ~2732) move into their own `test(…, { skip: process.getuid?.() === 0 }, …)`, as
   `apply-plan-deletions.test.mjs:238` does; the remaining subcases of each original test are unchanged. No assertion
   is weakened; only the grouping and the skip change.
6. **Patch bump** 7.15.0 → 7.15.1 (a correction to shipped bytes), CHANGELOG `### Fixed` entry in a new `[7.15.1]`
   section that also states the 7.15.0 entry's takeover claim was wrong, README badge.

## Applied lessons

- L35 — the absent-or-stale-lock rule and the reap live once, in `run-gates.mjs`; the stage scripts import
  `reapLeftoverGate` and `startRecord` uses the same function, rather than a second copy of the rule in each stage.
- L41 — the new tests run the production path end to end: the REAL `stage-direct.mjs`, the REAL stage scripts and the
  REAL `run-gates.mjs` (no fakes, no injection), with a real SIGKILL of the runner's group, since the state is
  unreachable without a crashed runner.
- L54 — the gate directory is walked with the existing lstat-based `containmentWalk` before its `lock.child` is read,
  so a symlinked `gates/`/`head/` is refused, never followed to a planted record.
- L81 — the test's scratch project copies the whole `pharn/floor/` directory and the whole `.claude/hooks/`
  directory, never a hand list of modules.

## Files

- `pharn/floor/run-gates.mjs` — `reapGroup` / `reapLeftoverGate` split + export; `startRecord` calls it; comment
  corrected — layer product floor
- `pharn/floor/stage-verify.mjs` — the reap in `removeEarlierOutput` — layer product floor
- `pharn/floor/stage-regress.mjs` — the reap of `head/` and `base-gates/` in `phaseFreshLate` — layer product floor
- `pharn/floor/stage-direct.mjs` — header bound corrected (prose only) — layer product floor
- `pharn/floor/stage-gate-reap.test.mjs` — NEW: the two end-to-end takeover tests — layer product floor (test, not
  shipped)
- `pharn/floor/stage-direct.test.mjs` — the EACCES split — layer product floor (test, not shipped)
- `.dev/guides/floor-gates.md` — one clause in the run-gates bounds — layer build apparatus
- `SKILLS_VERSION` — 7.15.0 → 7.15.1 — layer repo meta
- `CHANGELOG.md` — new `[7.15.1]` section, one `### Fixed` entry — layer repo meta
- `README.md` — version badge only — layer repo meta

### Not touched, on purpose

- The four trusted docs — `pharn/LIMITS.md` has no sentence about `init`'s reap (grep: no hit for `lock.child`).
- `stage-exit-core.mjs` / `pharn/pharn-contracts/stage-exit.md` — the refusal reuses `child-refused`; no new code.
- `run-gates.test.mjs` — the #443 init tests stay as they are; they still pin `startRecord`'s behaviour through the
  refactor (a regression there turns them red).
- `MIN_CLI` — no installed path or contract shape changes.

## Evals to write (P1)

No capability (`role:`) changes, so no `evals/` fixture is owed. Tests in the new `stage-gate-reap.test.mjs`, each over
a scratch git project holding the whole floor, the hooks, the two thin-caller command files, an approved SPEC/PLAN and a
one-gate `--gates "node gate.cjs::slow"` whose gate appends `{pid, overlapping: [pids of earlier gates still alive]}` to
a log on start, then sleeps (first invocation) or exits 0 (later ones):

- **verify takeover** → fresh `stage-direct.mjs --stage pharn-verify … --gates …` in the background; once the gate has
  logged and `gates/lock.child` exists, SIGKILL the runner's process group (`state.json` `runner_pid`); assert the first
  gate is still alive (fixture non-vacuity: the orphan exists); the waiting call ends exit 5; run the resume line;
  assert it exits 0 with a `done` object, the first gate is dead, the log holds exactly two starts, and the second
  start's `overlapping` is empty.
- **regress takeover** → the same over `--stage pharn-regress --base <sha> --gates … --no-install --no-tests`, killed
  during the first (HEAD) gate.
- **RED first** → both tests are run against the pre-change stage scripts during build and must fail on the
  `overlapping` / first-gate-dead assertions; the result is recorded in `BUILD.md`.
- Not tested, named: the `child-refused` path (a group that survives SIGKILL is not reproducible — the same bound as
  #443's `lock-busy`); a live lock left alone (covered at `init` by the existing #443 control, and at the stage level
  unreachable through `stage-direct.mjs`, whose in-flight lock refuses a second fresh call).

## Guarantee audit (P0)

- "a takeover's fresh re-run never starts a gate beside a survivor" → **tested behaviour** (the two e2e tests), not a
  floor reduction; holds for a group recorded in `lock.child` under an absent or stale lock. Bounds unchanged from
  run-gates' header: a SIGKILL between the spawn and the sidecar write leaves an unrecorded group; a `setsid`
  descendant escapes; a reused pgid of an exited group may be signalled.
- "the reap logic exists once" → structural (one function, imported); not checked by any test beyond use.

## Trust audit (P2)

- `lock` and `lock.child` are unauthenticated `pharn/.run/` state (L19): a Bash writer can plant a `lock.child` naming
  any same-user pgid, as today for run-gates' own recovery; the containment walk only stops a planted symlink. No new
  trust surface: the stage scripts read the same files run-gates already acts on, one step earlier.

## Determinism audit (P5)

Membership/integer tests only: lock parse + pid liveness + elapsed budget (`isStaleLock`), pgid integer > 1, group
liveness via `kill(-pgid, 0)`, the closed `child-refused` code.

## Open questions (HALT)

None. Resolved at GATE 1 (2026-11-13): the plan as written, built by the script route.
