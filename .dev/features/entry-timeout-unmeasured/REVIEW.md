# REVIEW — entry-timeout-unmeasured

Reviewed: `git diff 471a54bb..6d0fe9ab` (branch `fix/entry-timeout-unmeasured`), by an independent review stage that did
not see the build. The increment is `trust: untrusted`; no instruction-looking content in it was found or followed.

## Floor (P0)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0).
- `npm run check` (whole repo, this worktree, no `.claude/worktrees/` inside it) → exit 0 (5,965 tests: 5,964 pass, 0 fail, 1
  skipped).
- `check-surface-bump.mjs --base-ref 471a54bb` → GREEN (4 product paths, 6.73.2 → 6.74.0).
- `check-changelog-entry.mjs --base-ref 471a54bb` and `--merge-base origin/main` → GREEN (opens `[6.74.0]`).
- Touched and adjacent suites (`entry-gates`, `entry-observations`, `entry-base-evidence`, `command-hygiene`) → 389/389.

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "CHANGELOG.md:35"
  problem: "The 6.74.0 Why bullet says the entry check was the last place that did not treat a timed-out gate as not measured; /pharn-build's gate still decides on exit alone, so a shipped release note overstates (and a merged entry cannot be edited later)."
  evidence: 'Verify (since 6.59.0) and regress already treat such a gate as not measured; the entry check was the last place that did not. — build-gate-core.mjs:168: return stamp.runs.every((r) => r.exit === 0) ? "green" : "red";'
```

Fix: before merge, say what is true — verify and regress's timed-out handling already did; `/pharn-build`'s gate
(`build-gate-core.mjs` `decide`) still reads the exit alone (a killed `test` is RED there, and a gate that traps the
group signal and exits 0 is GREEN). Name it as a follow-up rather than claim completeness.

```yaml
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/floor/entry-base-evidence.mjs:85"
  problem: "The L75 sweep missed the phrase 'green or red': the base-evidence offer is now published on an unmeasured verdict too (decideDone's comment was updated), but its callee and core still say green or red only."
  evidence: "entry-base-evidence.mjs:13 'for a green or red verdict'; :85 'after `entryVerdict`, green or red only'; entry-base-evidence-core.mjs:124 '(green or red)'; entry-base-evidence.test.mjs:637 test name 'a validated green or red --wait'"
```

Fix: "green, red or unmeasured" in the three product comments (same bump) and the test name. Behavior is unchanged —
a timed-out entry run was `red` and offered before, and is `unmeasured` and offered now; a timed-out run is still refused
as reusable base evidence by `entry-base-evidence-core.mjs:181`.

```yaml
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/floor/gate-run-core.mjs:1172"
  problem: "unmeasuredRuns' header names its readers for the L35 one-owner rule but still lists only check-verify.mjs; entry-gates-core.mjs is now a second reader."
  evidence: "The ONE owner of this predicate: check-verify.mjs's stamp path reads it;"
```

Fix: add "and entry-gates-core.mjs `entryVerdict` (6.74.0, minus the `base:test` slot)".

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-gates-core.mjs:347"
  problem: "documentDefect closes one direction only: status unmeasured requires a non-empty unmeasured list and no red, but a green document carrying unmeasured entries is accepted, so the closed-shape check does not pin 'green implies nothing unmeasured'."
  evidence: 'if (d.status === "unmeasured" && (d.unmeasured.length === 0 || d.red.length !== 0)) return "unmeasured";'
```

Fix: also return `"unmeasured"` when `d.status === "green" && d.unmeasured.length !== 0`, with one defect case in the
`documentDefect` test. `entryVerdict` never emits such a document today, so this is hardening, not a live bug.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/entry-gates.test.mjs:1166"
  problem: "The plan's evals said the 6.49.0 base:test test would be extended to assert the slot is never in `unmeasured`; it was not edited. The exclusion is still pinned (that test asserts status green with a timed-out slot, and the L35 test's length-3 control), so this is a plan/build divergence, not a coverage hole."
  evidence: "PLAN.md Evals: 'base:test. A timed-out slot is in `gates`, but not in `red`, `unattributed` or `unmeasured` … This extends the existing 6.49.0 test.'"
```

Fix: add `assert.deepEqual(v.unmeasured, [])` inside that loop, so the exclusion is asserted directly, not via status.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "README.md:136"
  problem: "'since nothing was measured' overstates: the other gates were measured; the one that stopped the run was not."
  evidence: "it stops there too, as `blocked: gates-unmeasured-at-entry` (6.74.0), since nothing was measured."
```

Fix: "since that gate was not measured".

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-ship-stages.md:283"
  problem: "The Continue option still describes only the red case; after an exit-6 Continue, the expected outcome is an INCONCLUSIVE verify (gate-not-measured), not a red one."
  evidence: "**Continue** (fixing that gate is the feature, or the human accepts a red verify at GATE 2;"
```

Fix: "accepts a red or unmeasured verify at GATE 2".

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-loop.md:654"
  problem: "The S14b next-step prose states '540 s, verify's too' as a literal; the entry --start line and the verify line are each pinned at 540000 by separate tests, but nothing binds the prose number to them (the GRILL's concern 1, softened by the build, not closed)."
  evidence: "timeout this command pins for every gate run (540 s, verify's too)"
```

Fix (optional): drop the literal ("the per-gate timeout this command pins for every gate run, verify's included"), or
accept it as advisory text.

### Ship-step note (not a defect in the diff)

`origin/main` moved to `56e3989c` (#392) after the build. `git merge-tree 6d0fe9ab origin/main` reports a CONFLICT in
`CHANGELOG.md` (README auto-merges). Per the CHANGELOG header rule and the GATE-1 decision, #392's `[Unreleased]` entry
moves into `[6.74.0]` when the branch merges `origin/main`; then re-run `check:changelog-entry` against the new base.

## What was checked and held

- **Consumers of the `--wait` document and exits** (whole-repo grep, not only the plan's files):
  `entry-observations.mjs` imports `STATUSES` as `WAIT_STATUSES`, so `wait` events with status `unmeasured` validate;
  `render-cost-ledger.mjs` prints the status as text; no other reader parses the document. `loop-closeout.mjs`
  `BLOCKED_RE` admits `gates-unmeasured-at-entry`; `check-loop-record.mjs` and `loop-record.md` keep `blocked:` open.
  The quick and close parts name no `--wait` exit and no S14 row. `stage-agent-core.mjs` `LOOP_ROWS` correctly excludes
  S14/S14b (the entry read is the orchestrator's, never a stage agent's).
- **S-code enumerations:** `pharn-loop.md` "S4–S14b", the S14b row, the Step 4 branch, and `STUCK_POINTS` (17) agree;
  the closure test ranges over every `blocked:` spelling.
- **Precedence and the slot:** red first is pinned (`build` red + `test` timed out + `typecheck` 127 → `red`, both lists
  filled, exit 4); exit 126/127 → `not-started` with measured-red controls (1, 2, 125, 128, 137, 143); every style gate
  unmeasured whatever the digests; `base:test` excluded (status-green assertion and the L35 diff). The L35 source
  closure would RED on a re-grown `timed_out === true` or a 126/127 literal; it would not catch a truthy `r.timed_out`
  re-derivation (acceptable — the diff against `unmeasuredRuns` would).
- **P0 wording:** the header's WHAT IT DOES NOT CLAIM and the CHANGELOG's last sentence both say "unmeasured" does not
  predict pass or fail. "Raising only the entry timeout would move the stop to verify" is stated as reasoning over the
  pinned lines, not as a guarantee.
- **Version:** minor (new status, exit code, document key and stop row) matches `.dev/guides/versioning.md` and the
  6.59.0 precedent; badge, `SKILLS_VERSION` and CHANGELOG heading agree.
- **L-trust (P2):** `unmeasured` holds validated stamp ids and closed `cause` tokens; the loop copies them as DATA. No
  guaranteed decision rests on free text. **L-axis (P3):** the new import is from `gate-run-core.mjs`, the layer the
  module already imports from; no sibling edge. **L-eval (P1):** no capability changed; floor GREEN.

## Proposed lesson

None. The "last place that did not" overclaim is one instance; L75 (sweep phrase by phrase) already covers the stale
"green or red" prose.

## Verdict

GREEN — 0 floor findings; 8 advisory (1 important: the CHANGELOG overclaim, which must be fixed before merge because a
merged entry is frozen).
