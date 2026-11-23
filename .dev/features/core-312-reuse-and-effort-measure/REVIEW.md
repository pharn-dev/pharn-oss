# REVIEW — core-312-reuse-and-effort-measure

Reviewed: `.dev/measurements/reuse-and-effort-2026-11-23.md` (new) and the `CHANGELOG.md` `[Unreleased]` entry, both
`trust: untrusted` for this review. No instruction-looking content was found in either.

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment adds no
capability, contract, checker or product byte.

**Spot checks against the sources (advisory, done in this review):**

- Part A figures re-read from CORE-310 run 2's stored stamps: regress HEAD `test` 383287 ms (`files` 0,
  `compare_files` 1240), BASE 410037 ms (1240 files), verify `test` `ran: false` `reused` from the head stamp
  `7d0fb371…`; entry 451316 ms, build-full 327740 ms. Its reports' `gate_run` digests equal the three stamp digests the
  record lists, and verify's `gate_reuse` names `test` and `typecheck`.
- CORE-310 run 2's own summary lists routes spec/plan/grill/test on opus and triage/build on sonnet, each "effort high
  requested", and regress/verify inline by policy.
- CORE-310 run 2's load log: 42 one-minute samples, 1-minute load 13.63 to 80.30, which matches the record's "14 to
  80".
- The CORE-313 proxy claim was checked against the committed run file: `grill-medium/p4/r2/grill-findings.json`
  `G1-1` at `PLAN.md:15` names AC-4's missing revocation, and its triage gives `replan`.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/reuse-and-effort-2026-11-23.md:7"
  problem: >-
    The headline "a saving is shown" rests on a stand-in (the BASE subset run for the removed HEAD subset run); the
    record labels the arithmetic advisory in its bounds, but the headline itself carries no qualifier.
  evidence: "**CORE-89, HEAD `test` reuse: a saving is shown.**"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/reuse-and-effort-2026-11-23.md:122"
  problem: >-
    "any other the routing policy routes" leaves the changed-stage set open; CORE-310 run 2's summary shows regress and
    verify run inline by ROUTE_POLICY, so they are outside CORE-111's change, and the record could have said so.
  evidence: "supervise, test, build, and any other the routing policy routes), each configured `high`."
```

### L-eval → P1

No capability, so no eval binding applies. The record's figures are not re-derivable from the repository (the evidence
is private and held outside it); the record carries each source's sha256 and its read commands, which is the most a
committed file can do here. No finding.

### L-trust → P2

The measured project's stamps, reports, `cost.json` files and the Claude Code transcripts are untrusted inputs. Only
integers, enum strings, model ids and digests were copied; no free text from them, no session id and no project file
list reached the record. No finding.

### L-axis → P3

One new file with one reason to change (this measurement), and one CHANGELOG entry. No sibling reference. No finding.

## Verdict

**GREEN — 0 floor-gate findings, 2 advisory (minor).** Neither changes a figure or a decision.

## Lesson candidate

None proposed. One thing surprised this run: verify's first run read `format:check` red because a worktree without
`node_modules` resolved the main checkout's older Prettier. That is already recorded in the batch notes (sibling
worktrees and shared tool resolution) and was fixed by `npm ci` here. It is an environment slip, not a mechanism
failure that a lesson would prevent (L20's bar).
