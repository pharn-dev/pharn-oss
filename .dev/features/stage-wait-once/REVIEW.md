# REVIEW — stage-wait-once

- increment: the working tree against `0ff65527` (Linear CORE-76), plan v2
- floor: `node pharn/floor/validate.mjs .` GREEN (exit 0 at build, again as `/pharn-dev-verify`'s `validate` gate)
- standing verdicts: regress `no-regressions`; verify `PASS` (7 gates, `reconcile` clean)
- how the lenses ran: an independent general-purpose agent with a fresh context (it did not plan or build the
  increment), read-only, with one scratch-tree probe under the session scratchpad. Its findings are model output,
  quoted below as **DATA** (`trust: untrusted`, P2).
- its checks: `node --test pharn/floor/stage-direct.test.mjs` 43/43; the four `allowed-tools` grants
  (`pharn-loop.md:124-127`) and the four fenced pinned lines byte-identical to `0ff65527` (line numbers moved only).
- L-trust: no instruction-looking content in the increment changed the reviewer's behaviour; the refusal-detail
  strings are the tool's own product text for the orchestrator.

## Floor-gate (blocking)

None. No guarantee lacks a floor reduction or an advisory label; no `role:` capability changed, so no eval binding is
owed; no sibling reference.

## Advisory

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/stage-direct.mjs:797"
  problem: "takeover() turns every acquireLock `in-flight` result into {again: true}, including 'holds no readable lock record', so with a torn or pre-upgrade lock and a dead runner every resume line exits 5 'takeover deferred' forever; this contradicts the header's failure mode and the plan's 'never an endless exit-5 loop'."
  evidence: 'stage-direct.mjs:797 `if (!lock.ok) return lock.reason === "in-flight" ? { again: true } : refuse(...)`; header :113-114 "A torn lock is never guessed stale: `refused (in-flight)`, as before." Probe: empty in-flight.json, dead runner, valid runner.json/state.json → three resume lines each exit=5 ''takeover deferred'' in 0.3 s. No test covers it.'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:44"
  problem: "The entry says the change is what lets CORE-87 lift the 540 s per-gate timeout, but the new stage-exit.md text keeps the 600 s tie on a takeover's one foreground invocation, whose first slow step is always permitted up to --timeout-ms; that bound is missing from the claim."
  evidence: 'CHANGELOG.md:44-45 "the change is what lets CORE-87 lift the 540 s per-gate timeout"; stage-exit.md "the 600 s tie binds the call''s in-node wait (at most `--budget-ms`) and a takeover''s one invocation"'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:520"
  problem: "'only a takeover's one script run can outlast the cap' drops the header's qualifier (start-up, spawn, final print, up to 5 s release wait), and 'each gate is bounded by --timeout-ms, so the wait ends' ignores that the runner spawns the script with no timeout, so a script hung outside a gate makes every resume line exit 5 forever; the same sentence is at pharn-ship-stages.md:128."
  evidence: 'pharn-loop.md:520; stage-direct.mjs:115-117 "unless node''s start-up, the spawn and the final print do not fit the last 30 s"; :543 spawnSync(... no timeout); :80'
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".claude/commands/pharn-loop.md:500"
  problem: "Stale: the regress mapping still says the call prints the script's one pharn-stage-exit/1 object, but an exit 5 from the call (waiting, takeover deferred) prints no object, only the deferred marker line."
  evidence: "pharn-loop.md:500-501; stage-direct.mjs:785-788 deferred(): err line + MARKER_DEFERRED_CONTINUE, exit 5"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/stage-direct-core.mjs:187"
  problem: "Tests pin rules production no longer runs: returnMarkerDue is imported only by the test, waitStep's `print` row is unreachable (waitFor passes result:false), and the core doc cites a `holderAlive` that does not exist (the function is `alive`)."
  evidence: "returnMarkerDue only in stage-direct.test.mjs:64,192 and core :18,187; stage-direct.mjs:895 `result: false,`; core :434"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/stage-direct.mjs:836"
  problem: "Untested: the takeover's own invocation exiting 5 (records the continue, exits 5, next line resumes), and the runner's HANDOFF_MAX_MS refusal."
  evidence: "stage-direct.mjs:836-841; no test matches 'takeover's script run continues' or the handoff refusal text (:709)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/stage-direct.mjs:448"
  problem: "clearStale's put-back is unsafe in a three-call race (A renames B's live lock aside, C creates a lock, A's link fails, A unlinks B's lock), and this is not named as a bound; the header claims safety for two calls."
  evidence: 'stage-direct.mjs:448-457; header :53 "(two calls clearing one stale lock: one takes it, the other finds it held)"'
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/stage-direct.mjs:998"
  problem: "A failed lock handoff refuses 'nothing was run' but leaves runner.json, so a later resume line takes over with step `start` and runs the fresh argv of a refused start."
  evidence: "stage-direct.mjs:992-999 refuse lock-unusable with no unlink of RUNNER_FILE; :977-983 spawn-failed does unlink it"
```

## Verdict

GREEN — 0 floor-gate findings; 8 advisory (1 important, 7 minor). The important one (the takeover's endless exit-5 loop
on an unreadable lock, reproduced) is the reviewer's recommended fix before merge; the rest are wording and test gaps.

## Fix round and re-review (after GATE 2 chose "fix")

The human chose "Fix review findings" at GATE 2. A build agent fixed all eight findings above inside the plan's
`## Files`:

- the takeover now refuses `lock-unusable` on an unreadable lock instead of deferring forever (the important one), with
  a test;
- the lock is created as a tmp file and hard-linked into place;
- the CHANGELOG, `stage-exit.md` and both commands' prose now carry the takeover's foreground bound and the hung-script
  bound;
- the regress mapping names the exit-5 deferred line;
- `returnMarkerDue` is now the runner's loop condition, `waitStep`'s dead `print` row is gone, and the core doc names
  `alive`;
- tests now cover the takeover's own exit 5 and the `HANDOFF_MAX_MS` refusal;
- a failed lock handoff now removes `runner.json`;
- the three-call `clearStale` race is named as a bound in the header.

A second independent reviewer agent re-read the fixed tree. It confirmed all eight fixed and raised two new minor
findings (DATA, model output):

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/stage-direct.mjs"
  problem: "acquireLock read the lock and then lstat'ed it separately, so a lock a racing call linked in between the two could be reported as unreadable."
  evidence: "re-review R1: the read and the presence check were two syscalls"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/stage-direct.mjs"
  problem: "The lock now needs hard links, but no bound names what happens on a filesystem without them."
  evidence: "re-review R2: createLock uses linkSync; header BOUNDS and CHANGELOG silent on it"
```

Both were fixed by the orchestrator: one bounded read now decides absent vs present (the separate `pathPresent` check
is removed), and the header BOUNDS and the CHANGELOG entry state that a filesystem without hard links makes every call
refuse `lock-unusable`. That last edit was not re-reviewed by an agent; it is covered by the stage-direct suite
(47/47), the re-run regress (`no-regressions`) and the re-run verify (`PASS`, stamp `2588449f…`).

Verdict after the fix round: GREEN — 0 floor-gate findings, 0 open advisory findings.

## Lesson candidate

None proposed: the important finding is a single occurrence, not a recurring failure (P7).
