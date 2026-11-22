# PLAN — core-299-reap-start-time: the orphan-gate reap signals a group only when its leader's start time matches the record

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L34, L37, L41, L64, L67, L75, L84]
- increment: 7.22.2 (PATCH) — `reapGroup` in `pharn/floor/run-gates.mjs` reads the recorded group leader's elapsed time
  (`ps -o etime= -p <pgid>`), and signals the group only when the start it implies is within 10 s of the record's
  `started_ms`. On a mismatch, or when the start cannot be read, it signals nothing, removes `<out>/lock.child`, and
  writes one `run-gates: note —` line to stderr. Linear CORE-299 (epic CORE-294).
- layer(s): product floor (`pharn/floor/run-gates.mjs`), pharn-contracts (`gate-run-record.md`), floor tests, repo meta
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- L34 — the new mismatch test has a control beside it: the existing in-process "torn lock" case, moved to a fixture
  whose leader is alive, still shows a MATCHING record stops the group, so "left alone" cannot pass because the reap
  does nothing at all. The end-to-end SIGKILL tests in `run-gates.test.mjs` and `stage-gate-reap.test.mjs` are the
  real-spawn control (their `started_ms` comes from `onSpawn`, unchanged).
- L37 — every bound sentence this increment writes is probed before it is written: `ps -o etime=` was executed on
  macOS this run (a fresh leader reads `00:00`, a 2.6 s one `00:03`; implied start within 0.4 s of `Date.now()` taken
  right after `spawn`), and the "leader already exited ⇒ unreadable ⇒ not signalled" bound is executed by a test (the
  existing `orphanGroup()` fixture, whose leader is gone). Linux is probed by CI (ubuntu runners run the suite).
- L41 — the 10 s tolerance is one constant with no override, so no test bypasses it: the match path is reached with a
  real `started_ms` (end-to-end tests and the live-leader control), the mismatch path with a record an hour off.
- L64 — the old bound is restated in three places, and all three are changed together: the `lock.child` comment's
  BOUNDS paragraph, the file header's BOUNDS bullet ("stops the group `<out>/lock.child` names"), and
  `gate-run-record.md`'s "a group that had already exited may have had its id reused, which nothing can tell apart".
  The CHANGELOG entry states the new bound in the same words as the contract, not a looser summary.
- L67 — `ps -o etime=` output is an external tool's grammar: POSIX gives `[[dd-]hh:]mm:ss`. The parser is a small pure
  function exported for a unit test whose cases enumerate the grammar's forms (`mm:ss`, `hh:mm:ss`, `dd-hh:mm:ss`,
  leading spaces and a trailing newline) and the refusals (empty, `-`, letters, a missing field), each refusal
  reaching "cannot be read".
- L75 — the sweep below records each phrase, every hit, and one disposition per hit.
- L84 — the feature's only effect is a branch away from the old default (signal), so the new branch is taken in a test
  on realistic input: a real, live process group whose leader is not this process's child, with a record whose
  `started_ms` is an hour earlier. The test asserts the group still runs after the call, not only the return value.

## The failure (P7)

The code's own BOUNDS note (`run-gates.mjs:598-601`, and `gate-run-record.md:495-497`) names it: if the whole orphan
group exited, its pgid can be reused by an unrelated group of the same user, and the reap would SIGTERM/SIGKILL it.
Since 7.15.1 (PR #444) the reap also runs from the stage scripts' fresh start under an absent, unreadable or stale lock,
so a `lock.child` left by a crash or a reboot is acted on from more places. Recorded in the 2026-11-22 review, Linear
CORE-299.

## Discovery (read this run; `origin/main` at `476882bc`, SKILLS_VERSION 7.22.0)

1. **`started_ms` is the runner's `Date.now()` taken immediately after the gate leader exists.** `run --next` passes
   `onSpawn: (pgid) => writeAtomic(childPath(outAbs), JSON.stringify({ runner_pid, pgid, started_ms: Date.now() }))`
   (`run-gates.mjs:1388`); `spawnGate` calls `hooks.onSpawn(child.pid)` synchronously right after `spawn(...)` returns
   (`:1157`, `:1179-1181`). Node's `spawn` forks and waits for the exec synchronously, so the leader's kernel start
   time (fork time; preserved across `exec`, including `/bin/sh` exec-ing its command) precedes `started_ms` by the
   exec time — milliseconds normally. It is NOT the runner's own start, so the two cannot differ by the runner's
   lifetime. Measured this run on macOS: implied start minus recorded `started_ms` = +8 ms and −385 ms (macOS `ps`
   rounds `etime` rather than truncating).
2. **The reap has four callers, one implementation.** `reapGroup(outAbs)` (`:670`) is reached through
   `reapOrphanGroup` (stale-lock recovery in `takeLock`, `:567`), `reapLeftoverGate` (`init`'s `startRecord`, `:988`;
   `stage-verify.mjs stopLeftoverGate`, `:243`; `stage-regress.mjs stopLeftoverGates`, `:454`). Changing `reapGroup`
   covers all four; no caller changes.
3. **Output channels.** run-gates' stdout is one JSON object owned by the caller (`fail()` / emit); stderr carries
   only a crash trace today. The stage scripts already use stderr for advisory notes (`stage-regress.mjs:469`,
   `:992`, `:1201`: `stage-regress: note — …`). No test asserts run-gates' or the stage scripts' stderr is empty
   (grep over `run-gates.test.mjs`, `stage-gate-reap.test.mjs`, `stage-verify.test.mjs`, `stage-regress.test.mjs`).
4. **`ps` field choice.** `etime` is a POSIX-specified `ps -o` field (`[[dd-]hh:]mm:ss`), present in macOS `ps` and
   Linux procps; it needs no locale, time-zone or DST parsing. `lstart` is not POSIX and prints a local-time string
   (`Mon Nov 23 00:09:12 2026`), whose parse depends on `LC_ALL`/`TZ` and is ambiguous in the DST fall-back hour.
   `etimes` (seconds) is procps-only; macOS `ps` lacks it. `ps -o etime= -p <pid>` for a pid that does not exist exits
   1 with empty stdout on both (macOS probed: exit 1; a too-large pid prints an error and exits 1).
5. **Existing tests that the change reaches.**
   - `run-gates.test.mjs` "audit P3-P — a SIGKILLed runner's gate group is stopped…" and "PR #443 — a fresh `init`…":
     real runner, real `onSpawn` record, leader alive (`/bin/sh` or `node` running `slow.cjs`) → match path → still
     stopped. Unchanged.
   - `stage-gate-reap.test.mjs` end-to-end cases (`killDuringFirstGateThenResume`): same, unchanged.
   - `stage-gate-reap.test.mjs` "reapLeftoverGate — a LIVE lock … a torn (unparseable) lock is stale, so the group is
     stopped": its `orphanGroup()` fixture's leader (`/bin/sh`) has ALREADY EXITED (that is how its `sleep` member
     stops being this process's child). Under the new rule `ps -p <pgid>` finds nothing ⇒ not signalled, so this test
     would fail. It is changed: the torn-lock half uses a new fixture whose leader is alive and not this process's
     child; `orphanGroup()` becomes the fixture of the new "cannot be read" case.
6. **PR #463 (CORE-296)** edits the cleanup lines of `run-gates.test.mjs` (~2500–2581). This plan does not touch
   `run-gates.test.mjs` at all; every new or changed test is in `stage-gate-reap.test.mjs`, which already holds the
   in-process `reapLeftoverGate` cases and the `groupLive` / `killGroup` / `until` helpers.
7. **Trusted docs.** `pharn/LIMITS.md` and `pharn/THREAT-MODEL.md` do not state this bound (grep for `lock.child`,
   `pgid`, `reused`, `process group`, `orphan`, `SIGKILL` over both: no hit on the reap). **No patch script is needed.**

## Decision (proposed at GATE 1)

- **Field: `etime`**, parsed by an exported pure `parseElapsedSeconds(text)` → integer seconds or `null`. Run as
  `execFileSync("ps", ["-o", "etime=", "-p", String(pgid)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
timeout: 5000, env: { ...process.env, LC_ALL: "C" } })`; any throw (non-zero exit, timeout, no `ps`) ⇒ `null`.
  Implied start = `Date.now()` taken after `ps` returns, minus `seconds * 1000`.
- **Tolerance: 10 000 ms**, both directions (`START_MATCH_TOLERANCE_MS`). It covers `etime`'s 1 s resolution
  (truncated on procps, rounded on macOS), the spawn→`Date.now()` gap, and `ps`'s own latency on a loaded machine
  (this machine runs at load 60–170 during batches). A false match needs an unrelated group leader with the SAME pid
  that started within 10 s of our gate's start — and our gate held that pid from its start until it exited, so the
  pid must also have been freed and reused inside that window, i.e. a full pid wrap in under 10 s. A false mismatch
  (a genuine orphan judged not ours) is the fail-safe direction the ticket asks for: nothing is killed.
- **On a mismatch or unreadable start:** no signal, `removeChildRecord(outAbs)`, return `{ ok: true }`, and write one
  stderr line: `run-gates: note — <out>/lock.child named process group <pgid>, whose leader's start time
<does not match the record (started <n> s apart) | cannot be read>; the group was not signalled and the record was
dropped`. stderr because stdout is the caller's one JSON object (`reapGroup` "emits nothing" there, and still
  doesn't); the stage scripts already note on stderr. The return shape is unchanged, so every caller and every
  existing `deepEqual(…, { ok: true })` holds.
- **A record with no integer `started_ms`** (a pre-7.22.2 record has one; a hand-made or torn one may not) is the
  "cannot be read" case: not signalled, dropped, noted.
- **A group whose leader exited while members live** is "cannot be read" too, so it is no longer reaped. Real gate
  leaders (`npm`, `/bin/sh`, `node`) wait for their children, so a runner SIGKILL leaves the leader alive; the bound
  is named, not hidden.

## Files

- `pharn/floor/run-gates.mjs` — `reapGroup` start-time check; `parseElapsedSeconds` + `START_MATCH_TOLERANCE_MS`
  (exported for the test); the `lock.child` comment's BOUNDS paragraph and the header's BOUNDS bullet restated to the
  new limit — product floor
- `pharn/floor/stage-gate-reap.test.mjs` — the mismatch test, the cannot-be-read test, the torn-lock control moved to
  a live-leader fixture, and the `parseElapsedSeconds` grammar cases — floor test (not shipped)
- `pharn/pharn-contracts/gate-run-record.md` — the SIGKILL bound sentence restated to the new limit — pharn-contracts
- `SKILLS_VERSION` — 7.22.0 → 7.22.2 (patch; 7.22.1 is pre-assigned to CORE-298) — repo meta
- `README.md` — the version badge — repo meta
- `CHANGELOG.md` — a `## [7.22.2]` section with this entry (moving any `[Unreleased]` entries into it, per the file's
  own rule) — repo meta
- `pharn-install.json` — regenerated by `node .dev/floor/gen-install-manifest.mjs .` (it records product-file hashes
  and the version) — repo meta

### Not in this increment

- `run-gates.test.mjs` — untouched (PR #463 owns its cleanup lines; the existing end-to-end reap tests need no edit).
- `.dev/guides/floor-gates.md` — its run-gates BOUNDS line (`:60`) names the reap but not the pgid-reuse bound, so it
  stays true; no edit.
- `entry-gates-core.mjs killableGroups` — a different mechanism (a frozen `(pid, ppid, pgid)` snapshot) that already
  refuses a reused group id; unchanged.

## Sweep (L75) — phrases and every hit (product surface, `.claude/`, `.dev/guides`, root docs; `.dev/features` excluded)

Phrases: `reused by an unrelated`, `id reused`, `nothing can tell`, `tell the two apart`, `pgid.*reuse`, `reuse.*pgid`,
`lock.child`.

- `pharn/floor/run-gates.mjs:600-601` (the old bound) — **changed** to the new limit.
- `pharn/floor/run-gates.mjs:53` (header BOUNDS: "stops the group `<out>/lock.child` names") — **changed**: "…names,
  when its leader's start time matches the record".
- `pharn/floor/run-gates.mjs:224`, `:592`, `:604`, `:639`, `:667`, `:701`, `:983` — describe the record or the
  stale-lock rule, not the reuse bound; `:667`'s `reapGroup` doc comment is **changed** to name the new outcome
  (dropped + noted); the rest **unchanged**.
- `pharn/pharn-contracts/gate-run-record.md:494-497` — **changed** to the new limit.
- `.dev/guides/floor-gates.md:60` — names the reap, not the reuse bound — **unchanged**.
- `pharn/floor/stage-verify.mjs:235`, `pharn/floor/stage-regress.mjs:445` — history of the 7.15.1 fix; "the bounds are
  the group's, above" points at run-gates — **unchanged**.
- `pharn/floor/entry-gates-core.mjs:454`, `pharn/floor/entry-gates.test.mjs:354,361` — a different, already-guarded
  mechanism — **unchanged**.
- `pharn/floor/mark-phase.mjs:58`, `pharn/floor/griller-extract.mjs:232`, `pharn/floor/render-review-assignments.test.mjs:708`,
  `pharn/floor/check-cost-ledger.mjs:778`, `.dev/memory-bank/lessons-learned.md:2254` — unrelated uses of the phrase —
  **unchanged**.
- `pharn/floor/run-gates.test.mjs` (6 `lock.child` hits), `pharn/floor/stage-gate-reap.test.mjs` (10 hits) — tests;
  `stage-gate-reap.test.mjs:221` (`writeChild`, `started_ms: Date.now()`) is used with the live-leader fixture, where
  `Date.now()` is within the tolerance of the leader's start; **changed** only where listed under Files.
- `CHANGELOG.md` (6 hits) — merged entries, frozen — **unchanged**; the new entry is added.

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — the SIGKILL/orphan bullet is the contract for the reap; its bound
  sentence is updated to match the code (cite, not restated elsewhere — P4).

## Evals to write (P1)

No Capability is added or changed (floor code only), so no eval. Tests (in `stage-gate-reap.test.mjs`):

- **mismatch (AC 3):** a live process group whose leader is not this process's child; `lock.child` with that pgid and
  `started_ms` one hour earlier; no `lock` (absent ⇒ stale). `reapLeftoverGate(dir)` → `{ ok: true }`; the group is
  still live after the call; `lock.child` is gone; captured stderr matches `does not match the record`.
- **cannot be read:** the existing `orphanGroup()` (leader exited, member alive) with a current `started_ms` →
  `{ ok: true }`, group still live, record gone, stderr matches `cannot be read`. Plus a record with no `started_ms`
  over the live-leader fixture → same outcome.
- **control (L34):** the torn-lock case over the live-leader fixture with `started_ms: Date.now()` → the group is
  stopped and the record removed (the match path, in-process).
- **grammar (L67):** `parseElapsedSeconds` over `"00:00\n"` → 0, `"  01:05"` → 65, `"02:00:01"` → 7201,
  `"3-04:05:06"` → 273906, and `""`, `"-"`, `"abc"`, `"1:2:3:4"`, `"05"` → `null`.

## Guarantee audit (P0)

- "the reap signals a group only when its leader's start time matches `started_ms` within 10 s" → **floor-adjacent,
  stated as tested behaviour**: an integer compare in floor code over `ps` output, pinned by the mismatch test. It is
  not one of the three primitives and is not called a guarantee; it is the runner's behaviour, as the reap itself is.
- "a reused pgid is not signalled" → **bounded, not guaranteed**: holds unless an unrelated leader with the same pid
  started within 10 s of the recorded start (a pid wrap inside the window). Stated in the BOUNDS and the contract.
- "a group whose leader exited is not reaped" → a stated **new limit** (it was reaped before).
- `ps` is looked up on `PATH` by bare name (as `git` is here); a missing or failing `ps` ⇒ unreadable ⇒ not signalled
  (fail-safe). Wall-clock steps between the record and the reap (NTP) larger than 10 s read as a mismatch — named.
- The stderr note is **advisory** output: nothing parses it.

## Trust audit (P2)

`lock.child` sits in gitignored runtime state that Bash reaches; it was already trusted only to name a pgid to judge.
`ps` stdout is parsed by an anchored regex into integers; anything else is `null`. Nothing from either reaches a
verdict or the caller's stdout; the note interpolates only the integer pgid, the integer seconds and the `<out>` path
the caller already holds.

## Determinism audit (P5)

Every branch is an integer or regex membership test: `Number.isInteger(started_ms)`, the anchored `etime` regex,
`|implied − started_ms| ≤ 10 000`. No model judgment.

## Open questions (HALT)

- None blocking. Settled here, for the orchestrator to confirm at GATE 1: the field (`etime`, not `lstart`), the 10 s
  tolerance, the stderr note as "the existing output", and the new limit that a group whose leader already exited is
  no longer reaped.
