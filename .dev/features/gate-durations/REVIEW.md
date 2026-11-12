# REVIEW — gate-durations

Reviewed: the working-tree increment on `61deb6b1` (the 26 paths `/pharn-dev-regress` listed as inside). The increment
is `trust: untrusted` to this review; nothing in it read as an instruction.

**Step 1 — floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`.

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: "pharn/floor/stage-work.mjs:250"
  problem: >-
    validateWork now closes the `head` and `gates` key sets of a `/1` row too (before, only `base` was tested), so a
    `/1` line with an extra key on either side is dropped. The change is in scope and no writer ever produced such a
    line, but neither the plan nor the CHANGELOG entry says so.
  evidence: "if (!(isPlain(s) && exactKeys(s, v2 ? [...keys, DURATIONS_KEY] : keys))) return `${path} key set`;"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/gate-run-record.md:96"
  problem: >-
    The two contracts name the release (7.11.0) in several places, as their convention does; if a sibling PR takes
    7.11.0 first, each of those strings and the CHANGELOG heading must be renumbered by hand, and nothing checks the
    contract strings.
  evidence: "| `runs[].duration_ms`     | Optional (7.11.0)."
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/entry-observations.mjs:214"
  problem: >-
    `identityKey` gains a `gate` branch that no shipped caller reaches (the view drops gate events first); it is
    tested directly and documented as deciding nothing, but it is code kept only for totality.
  evidence: 'if (e.event === "gate") return `${e.nonce}|gate|${e.id}`;'
```

## Lens notes

- **L-floor (P0):** every new claim is labelled. The field's shape is floor (`validateStamp`, `validateWork`,
  `validateEntryEvent`: integer, membership and closed-key tests); the value is labelled an observation in both
  contracts and every module header; the timeout bound and the "no reader" parity are labelled tested behaviour, with
  the closure scan's bound ("the readers that exist today") stated. The grill's P0 finding (labels overstating tested
  behaviour as floor) was applied in the build.
- **L-eval (P1):** no Capability or `enforces` rule changed. Each acceptance criterion has a named test, with a
  negative control where a comparison could pass vacuously (L60): `gate-durations.test.mjs`'s exit flips, the
  requirement's `gates-changed` miss, the entry `not-completed` miss, the identity's `files` control.
- **L-trust (P2):** the only value copied into `cost.json` that came from a project is a gate id, and it passes a
  membership test (`ledgerGateId`) first; a `--gates` command line, an absolute path or an over-long id is written as
  `null` (work rows) or refused (entry events). Gate output stays a sha256.
- **L-axis (P3):** `run-gates.mjs` gains the timing (execution), `gate-run-core.mjs` its shape check, `stage-work.mjs`
  and `entry-observations.mjs` their own record shapes; `entry-observations.mjs` already imported `stage-work.mjs`, so
  `ledgerGateId` adds no new dependency edge. No sibling reference.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (1 important, 2 minor). The important one is cheap and in scope: the
CHANGELOG entry should disclose the `/1` key-set tightening. That edit lands after verify, so regress and verify are
re-run on the edited tree (a second iteration).

**Iteration 2 (re-review of the one change).** The CHANGELOG `[7.11.0]` entry now names the `/1` key-set
tightening; the important finding is fixed. Regress (`no-regressions`) and verify (`PASS`) were re-run on that tree.
The two minor findings stand as follow-ups. Verdict: GREEN — 0 floor-gate findings.

## Proposed lesson candidate

None. No mechanism failed in a way that would recur: the one defect class worth noting (a `--gates` id defaults to its
command line, so a shape test would have let a command line into a committed ledger) was caught by the grill before
the build, and its remedy is a membership test now in code and tested.
