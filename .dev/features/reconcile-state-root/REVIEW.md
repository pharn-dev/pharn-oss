# REVIEW — reconcile-state-root

The increment under review is `trust: untrusted`. The issue body (#408) was read as a bug report only. No reviewed file
contained instruction-looking content, and nothing in one changed this review's behaviour.

## Step 1 — floor first

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`. No capability, `enforces` or eval
binding changed. Verify run 2 is PASS on every gate, `reconcile` included (`VERIFY.md`).

## Floor-gate findings (blocking)

None. No guarantee is claimed without a floor reduction. The new exclusion is a literal prefix test (primitive #3)
over git's enumeration. There is no capability without evals and no sibling reference: the three changed `.mjs` files
sit in one layer, `pharn/floor/`, and the import arrow `worktree-fingerprint → reconcile-baseline` already existed.

## Advisory findings (judgment, warn only)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-bash-reconcile.mjs:81"
  problem: "The header's universal quantifier is wider than the guards. It says they 'allow every write there except pharn/.run/writes-scope.json', but enforce-writes-scope.cjs also denies all of pharn/.run/** under a malformed scope record in an installed project (D4, deny-all), and protect-trusted-paths.cjs case-folds, so another spelling of the scope file on a case-insensitive volume is denied too."
  evidence: "the guards allow every write there except `pharn/.run/writes-scope.json`, which the setter writes through Bash by design"
```

The conclusion it supports still holds: the exclusion costs no detection compared with a project that ignores
`pharn/.run/`. A malformed record already denies every write, and every spelling of the scope file is the setter's
own target. This is L37's class, a quantifier read off the guard rather than probed at its edges. Only the two named
paths and three ordinary state-root files were probed, in the plan's table. **Remedy (text only, next increment that
touches the file):** "every write there except the scope file (in any spelling) and except under a malformed scope
record". `reconciliation-record.md:67` and the CHANGELOG bullet make only the narrower claim (the scope file is denied
to the Write tool), and that claim is exact.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/check-bash-reconcile.test.mjs:58"
  problem: "The ★ #408 tests were not shown to fail on the pre-change code inside the suite. The fail-before evidence is the scratch reproduction, which is the same scenario (4 escapes before the change, CLEAN after) but was not run as a mutation of the test file."
  evidence: "function makeRepo({ devRepo = true, gitignore = \"node_modules/\\npharn/.run/\\nrunned/\\n\" } = {})"
```

Low risk. The paired non-vacuity case (`SNEAKY.txt` → exactly one escape) proves the fixture can still red, and the
reproduction script is the same fixture shape.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/reconcile-state-root/SHIP.md:1"
  problem: "The build epoch was re-anchored mid-run after a fast-forward onto a sibling-branch commit. A re-anchor resets what reconcile can see, so the window from the first anchor to the fast-forward is covered only by run 1's CLEAN verify, which is recorded but not re-checkable."
  evidence: "Before the fast-forward, run 1's verify reconcile on the epoch anchored at `2026-11-02T15:18:50.070Z` … was CLEAN"
```

The re-anchor was the human's choice, relayed by the orchestrator. Its evidence (pre-ff CLEAN; post-ff escapes
exactly equal to `git diff --name-only 607d82c2 0b18864b`; §2a's `merged` class covering only `origin/HEAD`) was
written into `SHIP.md` before the anchor ran. Nothing to fix. The finding records the bound.

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/reconcile-baseline.mjs:91"
  problem: "The state-root literal now has one owner for reconcile and the worktree fingerprint, but run-gates.mjs, stage-regress.mjs and build-gate.mjs still spell 'pharn/.run' themselves, so the relocation risk L41 names (paired constants split by a bulk rename) still holds for those three."
  evidence: 'export const STATE_ROOT_SEGMENT = "pharn/.run/";'
```

The header states this and gives the reason (containment walks answer a different question). This is the grill's
concern 1, now worded honestly. No action in this increment.

## L-trust (P2)

No new free-text channel. The checker's finding `problem` strings are unchanged, and the excluded paths emit nothing.
No guaranteed decision rests on a tainted field.

## Proposed lesson candidate (for the human at GATE 2, not written to canon)

Rendered in `/pharn-dev-memory-promote`'s Step-2 candidate shape. Provenance is left for that command to capture.

- **target:** `.dev/memory-bank/lessons-learned.md`
- **type:** `process`
- **concepts:** `[test-blindspot, default-values, fixture-environment, lesson-recurrence, floor-escalation]`
- **title:** "L41 recurred through a fixture's ENVIRONMENT: every reconcile test inherited a `.gitignore` that ignores
  `pharn/.run/`, so the posture an install actually has was exercised by nothing"
- **body:** `check-bash-reconcile.test.mjs`'s `makeRepo()` defaults `.gitignore` to one that ignores `pharn/.run/`, as
  does `reconcile-baseline.test.mjs`'s, and this repository's own `.gitignore` does the same. So neither the suite
  nor dogfood ever ran reconcile over a tree where PHARN's run state is visible to git. In pharn-dev/skills it was
  visible, and a correct build failed verify on 54 of 55 escapes (#408). L41 named "a default every test overrides";
  this is its sibling, a default every test **inherits**, and the setting lives in the fixture's environment
  (an ignore file), not in a function parameter. That makes it invisible to a reading of the code under test.
  Remedy: when a floor check's answer depends on the host project's configuration (ignore rules, config files, the
  install posture), at least one fixture must take the shipped-default posture of an install that never touched
  that configuration, and the dev repo's own configuration must not be the fixture default.
- **source:** `.dev/features/reconcile-state-root/PLAN.md` § The failure (the measured reproduction and the L41 note)
  plus this REVIEW's lesson section.
- **Rationale:** this is L41's second occurrence, and L20's bar for escalating a discipline remedy is a second
  occurrence. A floor check (for example a test-hygiene pin that a reconcile fixture passes `gitignore` explicitly
  whenever it asserts state-root behaviour) is now eligible. It would recur because every new checker that reads git's
  ignore rules gets the same fixture helper.

Deferred (not carried, one line): "§2a's `merged` class covers only `origin/HEAD` commits, so a fast-forward onto a
local sibling-branch fix mid-window reads as escapes. The orchestrator assumed otherwise." Observed once.

## Verdict

**GREEN: 0 floor-gate findings, 4 advisory (all minor).**
