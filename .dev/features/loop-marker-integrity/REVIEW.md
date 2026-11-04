# REVIEW — loop-marker-integrity

Reviewed: `git diff dd0bb3d3..HEAD` on `fix/loop-marker-integrity` (head `c9ee2be0`, plus this stage's artifacts),
including the maintainer-applied hook commit `bc9c9bc8`. The increment under review is `trust: untrusted`. No
instruction-looking content in it was acted on.

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`.
`/pharn-dev-verify` → `PASS` (7 gates); `/pharn-dev-regress` → `no-regressions`.

## Floor-gate findings (blocking)

None. No capability or `enforces` binding changed (L-eval). Every new guarantee in the diff points at its floor
operation. Each such claim names its primitive and its bound in the diff:

- the `--open` refusal: the hook's own `lstat`;
- the run-state write deny: a `PreToolUse` hook, `protect-trusted-paths.cjs` `RUN_STATE_SUBTREES`;
- `MODE_UNWITNESSED` and `BLOCKED_UNKNOWN`: enum membership;
- the grant closure: test-time set membership.

No sibling reference was added: `check-loop-decision.mjs` imports the `loop-record-core.mjs` and `loop-mode-core.mjs`
cores, and the floor never imports a hook (the hook's `MODES` is restated and test-pinned, L35).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/pharn-contracts/loop-record.md:213"
  problem: "MODE_UNWITNESSED binds the record's mode to a value the model itself types at Step 1a (`<mode>`), so it moves the choice earlier and makes a later change RED, but it is still agreement between run-writable files, not proof of what the person typed."
  evidence: "Bound: the model types `<mode>` from its own reading of its argv, so this is agreement between files the run can write, never proof of what the person typed"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/hooks/protect-trusted-paths.test.cjs:1"
  problem: "The safety of denying the whole run-state subtrees to the write tools rests on 'no command writes there with the Write tool', and the test that holds it is a line-local prose scan (a path and 'Write tool' on one line), presence-grade only."
  evidence: "A prose scan, so presence-grade (P0): it finds a path named next to the Write tool on one line, not every way a command could ask for such a write."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-run-isolation.mjs:47"
  problem: "The header still says the Write tool reaches the isolation witness, which this increment made false; left unedited on purpose so group S's change to the same file merges mechanically."
  evidence: "The witness is git-ignored `pharn/.run/` state the Write tool and Bash both reach and reconcile"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/guides/writes-scope.md:1"
  problem: "Neither the writes-scope guide's 'What under pharn/.run/ is load-bearing' section nor CLAUDE.md hard constraint 1 mentions that protect-trusted-paths.cjs now denies the write tools the three run-state subtrees; both still read as complete lists of what that hook covers."
  evidence: "Deliberately the one file, **not** `pharn/.run/**` — the rest is disposable runtime scratch stages legitimately write."
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/loop-record-core.mjs:1"
  problem: "The core now carries two vocabularies (the Handoff grammar and the blocked-stop ids); the header argues one axis (the loop-record contract), which holds as long as both change only with that contract."
  evidence: "the loop-record's shared vocabulary: the ONE implementation of its `## Handoff` grammar, and (7.3.0) the frozen set of blocked-stop ids"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".claude/commands/pharn-loop.md:311"
  problem: "A FILE the Write tool plants at `pharn/.run/pharn-loop` (the directory path, deliberately not denied) still stops every loop run at S9 until a person removes it — a denial of service, not an escalation, and stated in the hook header."
  evidence: "`pharn/.run` or `pharn/.run/pharn-loop` (the Write tool can plant a file at either)"
```

## Process notes (advisory)

- Three defects surfaced only when the build's own checks ran, each a change of plan recorded in PLAN.md. The first
  two were found by tests; the third by `/pharn-dev-regress`'s scope check.
  - A1: the unflagged isolation grant's `*` carried a trailing `--accept-host-execution`.
  - `stage-regress.test.mjs` re-opened a loop marker with a second `--open`.
  - The PLAN listed the maintainer-applied hooks only in prose, not as `## Files` bullets.
- The orchestrator's independent review of `apply.py` found the confirmed HIGH (A2) that this build's own tests did
  not: the Write tool could rewrite the marker. The `--open` refusal had been reasoned about only on the CLI surface.

## Proposed lesson candidate (not promoted — `/pharn-dev-memory-promote` decides)

- **title:** A guard that closes one write route for a file must enumerate every writer of that file — the CLI
  refusal left the write-tool route to the same bytes open.
- **type:** floor · **concepts:** [write-surface, enumeration, run-state, closure-assertion]
- **body (draft):** `require-loop-record.cjs --open` was changed to refuse an existing marker, and the plan, the
  contract and the hook header said a run "cannot re-open its own marker in one line". An independent review then
  wrote the same file through the Write tool, prompt-free: `enforce-writes-scope.cjs` always allows `pharn/.run/**`
  and `protect-trusted-paths.cjs` had no entry. The remedy is to list the file's writers first — the Write and Edit
  tools, Bash, and each CLI — then close or state each one.
- **provenance:** feature `loop-marker-integrity`; source `.dev/features/loop-marker-integrity/PLAN.md`
  "Amendment A2" + this REVIEW.md; commit to be captured by the promote command.

**VERDICT: GREEN** — no floor-gate findings; 6 advisory findings (2 important, 4 minor), for the human.
