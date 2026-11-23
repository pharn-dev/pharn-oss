# REVIEW — core-299-reap-start-time

Reviewed: the build commit `67d1cc37` and the merges to `464c6ba9` (`pharn/floor/run-gates.mjs`,
`pharn/floor/stage-gate-reap.test.mjs`, `pharn/pharn-contracts/gate-run-record.md`, the version bump files). This was a
single-reviewer inline review, deliberately not fanned out: the batch's load rules apply, and the 2026-11-17 fan-out
restarted the machine. The increment was treated as `trust: untrusted`. No instruction-looking content was found in the
diff.

## Floor first

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. `/pharn-dev-verify` PASS covers every gate
(`test`, `validate`, `lint`, `format:check`, `lint:md`, `instruction-growth`, `reconcile`).

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/run-gates.mjs:697"
  problem: "The start-time match is described as the runner's behaviour, not a guarantee, and it is not a floor primitive; the contract and CHANGELOG sentences keep it that way, but nothing pins the 10 s bound to the contract's wording."
  evidence: "signalled only when its leader's start time (`ps -o etime=`) is within 10 s of the record's `started_ms`"
```

No claim in the diff says "guarantee". The bound sentences in the code BOUNDS paragraph, the contract and the CHANGELOG
name the same four limits: a pid wrap inside the tolerance, a leader that exited, a wall-clock step, and the `ps` PATH
lookup (the last appears in the code BOUNDS and the plan only). The executed probes:

- `ps -o etime=` on macOS, this run.
- The leader-exited case, as a test.
- The mismatch case, as a test, with a mutation run. Disabling the check fails both CORE-299 reap tests.

Linux `ps` is exercised by CI's ubuntu runner, not locally.

### L-eval → P1

No Capability or `rule_id` changed, so no eval binding applies. The tests cover each branch of the new code on realistic
input:

- mismatch: a live group whose leader is not the test's child, record an hour off;
- unreadable: the leader exited, and a record with no `started_ms`;
- match: the torn-lock control, now on a live-leader fixture;
- the `etime` grammar.

The torn-lock assertion keeps its intent: a stale (torn) lock over a recorded live group still stops the group and
removes its record. Only the fixture changed. The old one had an exited leader, which the new rule can no longer judge.
The end-to-end reap tests in `run-gates.test.mjs` and `stage-gate-reap.test.mjs` cover the match path on a real
`onSpawn` record, and they passed in regress and verify.

### L-trust → P2

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/run-gates.mjs:697"
  problem: "`ps` stdout is reduced by an anchored regex to integers before any decision; the note interpolates only the pgid integer, the rounded seconds and the caller's own <out> path, so no free text reaches stdout or a verdict."
  evidence: "/^[ \\t]*(?:(?:(\\d+)-)?(\\d+):)?(\\d+):(\\d+)[ \\t]*\\n?$/"
```

This is recorded as a confirmation, not a defect. `lock.child` stays gitignored runtime state that Bash can reach. A
forged record can now only make the reap do less (no signal), or name a group whose leader started within 10 s of a time
the forger chose, which was already possible before this change.

### L-axis → P3

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/run-gates.mjs:55"
  problem: "The header BOUNDS line added here is 137 columns, over the 120 the file's prose otherwise aims at; no gate checks comment width (60 lines in this file already exceed 120 at the base)."
  evidence: "PROCESS GROUP, below). That is why the invoking command's Bash timeout must still exceed `--timeout-ms`, and why `--timeout-ms` is"
```

This is cosmetic and was left as is, because rewrapping after verify would stale the stamp. A later edit to the file can
fold it in. `parseElapsedSeconds` sits in `run-gates.mjs` rather than `gate-run-core.mjs`, as GRILL already discussed.
It is the reap's own parser, and no record grammar uses it.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (minor) findings. The GATE 2 decision is the orchestrator's, under delegation.

## Proposed lesson candidate

None. This increment applied existing lessons (L34, L37, L41, L64, L67, L84). Nothing recurred that is not already
canon. The reconcile-after-a-non-`origin/main`-merge issue the orchestrator relayed is already covered by the
memory-bank-adjacent note "ff onto a local fix mid-window" and was handled by re-anchoring, not by a new rule.
