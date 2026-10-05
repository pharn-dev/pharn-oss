# REVIEW — loop-entry-preflight

- reviewed: `3060476` (PR #313 before its 6.42.0 renumber), by an **independent reviewer**: a separate opus agent the
  orchestrator ran. Its findings below are quoted as **DATA** (`trust: untrusted`, P2), attributed to it, and
  paraphrased only where noted.
- decisions: by the orchestrating model under the user's delegation ("fix all"), not by a human.
- floor-gate findings: **0**. `validate` was GREEN, and regress and verify had passed on the reviewed commit.

## Findings (advisory — each cites a principle)

```yaml
- id: R1
  type: FINDING
  rule_id: P0
  severity: important
  file: pharn/floor/entry-gates.mjs
  problem: "an entry gate's write lands AFTER the pre-run snapshot, so regress counts it as this run's scope escape (typical: `next build` rewriting `next-env.d.ts`) — failure 1(a) again"
  evidence: 'reproduced: a `build` gate rewriting `a.txt` → `--wait` exit 0 green, `mutated:["build"]`, ` M a.txt`'
- id: R2
  type: FINDING
  rule_id: P5
  severity: important
  file: .claude/commands/pharn-loop.md
  problem: "an unusable entry result (runner-died, crashed, spawn-failed, aborted, tree-changed-between-gates, result-unbound, …) stops the loop at S9 although the check only failed to judge"
  evidence: "the wait block's `Anything else → **S9**`"
- id: R3
  type: FINDING
  rule_id: P0
  severity: minor
  file: pharn/floor/entry-gates-core.mjs
  problem: "the header says `d0` means 'no artifact this run wrote existed yet', which is false for /pharn-ship, where `d0` already holds the run's SPEC.md"
- id: R4
  type: FINDING
  rule_id: P2
  severity: minor
  file: pharn/floor/entry-gates.mjs
  problem: "killRunner signals descendant groups from one snapshot; it should SIGSTOP them too, re-snapshot until stable, and SIGKILL only groups whose leader still has the snapshot's ppid chain (pid/pgid reuse)"
- id: R5
  type: FINDING
  rule_id: P0
  severity: minor
  file: pharn/floor/entry-gates.mjs
  problem: "the header overstates the escape bound: a `detached` grandchild whose parent is alive at the snapshot IS killed; only a double-forked/reparented daemon escapes"
  evidence: "reproduced by the reviewer"
- id: R6
  type: FINDING
  rule_id: P5
  severity: minor
  file: pharn/floor/entry-gates.mjs
  problem: "`--start` wipes `.pharn/pharn-entry/` under a prior record whose pid is alive but cannot be verified (no `ps`); it should refuse with a closed reason"
```

**Confirmed fine by the reviewer:**

- pid ownership is checked through the nonce;
- a takeover never drains twice (run-gates' `lock-busy`);
- an entry stamp is isolated: it has its own algo, `validateStamp` asserts the stage, and `findReusable` refuses it;
- the command byte ceilings hold;
- the tests passed 28/28 in three runs and left no runner behind.

## Disposition — all fixed, none declined

- **R1 — fixed.**
  - The runner lists the changed-since-HEAD paths outside the feature directory, through `pathDigest`, before and
    after every gate (`progress.json` / `result.json` `gate_changes`).
  - `entryVerdict` takes the diff of `mutated` gates only.
  - `--wait` writes those paths with their after-digest to `<git dir>/pharn-entry-gate-changes.json`
    (`pre-run-snapshot.mjs` `recordEntryChanges`). That record uses the snapshot's `buildSnapshot`, `validateSnapshot`
    and `decidePreRun`, and is bound to the run marker; `--start` removes an earlier run's record.
  - `/pharn-regress`'s partition and `check-quick-scope.mjs` subtract such a path only while its live digest is equal.
    They report it in a conditional `entry_gate_changes` block, written only when a record exists, so every
    earlier byte is unchanged. The block appears in `scope.json`, the report, the quick document and `REGRESSION.md`
    (`regression-report.md`).
  - The `--wait` document gains `changed_paths` and `changes_record`; the loop summary and `SHIP.md` name them.
  - Tests: the reproduced case end to end, with an open run (`recorded`, then `applied`, then not applied once
    edited) and without one (`no-delivery-run`); the record's ★ HOOK matrix; and stage-regress and quick-scope end
    to end.
- **R2 — fixed.** In `/pharn-loop`, exit 2 now means "go on, and name `reason_code` / `runner_reason` in the Step 7
  summary". A failed `--start` (any exit but 3) also goes on, since the read reports it. Only 4 stops (S14), and 3 is
  S4. `/pharn-ship` still asks at the read.
- **R3 — fixed.** The core header now states both cases: in the loop `d0` is `absent`; in `/pharn-ship` it holds the
  approved SPEC.md, which verify reads too.
- **R4 — fixed.**
  - `killRunner` freezes the runner's group, then each descendant group, re-listing until the set is stable (at most 5
    passes).
  - It sends TERM + CONT, then KILLs a survivor only through `killableGroups`: a live process must match a frozen
    `(pid, ppid, pgid)`.
  - It kills the runner last, so the parent link stays intact for that check. Tested purely; the end-to-end abort
    tests still pass.
- **R5 — fixed.** The header bound is narrowed: only a process reparented before the listing escapes.
- **R6 — fixed.** `killRunner` returns `unverifiable`, and `--start` refuses `runner-unverifiable`, wiping nothing.
  Tested with `ps` off `PATH`.

## Lesson candidates

None clears L20's bar. R1 is the first occurrence of "a stage that runs before the snapshot's consumer can move the
tree it judges", and it was found by review rather than recurring.
