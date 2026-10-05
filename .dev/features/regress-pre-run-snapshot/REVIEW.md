# REVIEW — regress-pre-run-snapshot

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked` (re-run after the
fixes below).

**How this review was run (recorded, advisory).** An independent, read-only Opus agent with a fresh context reviewed
pushed commit `d51b254` (the diff against `4c4c0c5`), probing the live code and guards rather than the plan's
descriptions. The orchestrator relayed its findings and decided, under the maintainer's delegation, to fix all five.
That is a model decision, not a human approval. The reviewer's free text below inherits the increment's untrusted tag
and is quoted as DATA (P2). The builder wrote this file. Each fix is described in its own words beneath the finding.

## Floor-gate findings (blocking)

None. The reviewer reported 0 floor-gate findings, and validate is GREEN.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-ship-quick.md:113"
  problem: "Under /pharn-ship --quick a subtracted path is never shown to the human — item 7 branches on the exit code only, item 11 records `scope: clean` verbatim, and the quick-scope document goes to stdout only; contradicts 'REPORTS them (never silent)'."
  evidence: "pre-run-snapshot-core.mjs:19 and the CHANGELOG entry claim the subtracted paths are always reported."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/pharn-contracts/regression-report.md:301"
  problem: "'A standalone /pharn-regress reads no-delivery-run and behaves exactly as before' is false when an interrupted loop or ship of the same feature left its marker (≤ 24 h) — deliveryRunIdentity checks presence and age only."
  evidence: "pre-run-snapshot-core.mjs:30 says the same."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/pre-run-snapshot.test.mjs:516"
  problem: "The ★ HOOK test header and title say both guards deny on both layouts, but in a linked worktree only enforce-writes-scope denies (protect-trusted-paths exits 0 there, beside or nested under main/.claude/worktrees/); the composed deny holds in every cell probed (4 layouts × 3 postures × run/no-run × {no scope, src/**, **})."
  evidence: "Reproduced by the reviewer's probe-hooks.mjs."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/pre-run-snapshot.mjs:84"
  problem: "A non-UTF-8 file name is decoded to U+FFFD by nulList; lstat of the decoded name is ENOENT, so it digests `absent` at capture and at check, and a later content change is subtracted as unchanged (a byte-name filesystem such as ext4, via a Bash write; APFS refuses such names)."
  evidence: "Reproduced by the reviewer's probe-nonutf8.mjs."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-regress.md:142"
  problem: "'A re-run does not clear it' reads as 're-running won't help', but a re-run passes, reporting the escape as pre-run."
  evidence: "The re-run bound pinned in stage-regress.test.mjs."
```

The reviewer also confirmed these as fine, quoted as DATA: the git-dir record is out of write-tool reach; marker
rewrites yield `other-run` / `no-delivery-run`; symlink, case and restore tricks fail toward counting; capture ordering
and write-once hold; ship `base-changed` holds; the `check-regress.mjs scope` CLI is unchanged; a no-run
`REGRESSION.md` is byte-identical; the STOP lines are pinned and executed; and the PROTECTED-FOLLOWUPS text matches
`LIMITS.md`.

## Fixes (each finding taken)

- **R1:** `/pharn-ship --quick` item 7 now keeps the document's `pre_run_snapshot.unchanged`. Item 11 records
  `pre-run unchanged: <n>` with the paths fenced as quoted DATA, and quick GATE 2 presents them. In full mode,
  `/pharn-ship`'s GATE 2 presents `regression-report.json`'s `pre_run_snapshot.unchanged`, and `SHIP.md`'s roll-up
  records `pre-run unchanged: <n>` beside the regress verdict. The loop's summary line already listed them. A new
  `✧ REPORTED (R1)` test in `pre-run-snapshot.test.mjs` pins each surface (presence only).
- **R2:** the ≤ 24 h unclosed-marker qualifier is now in four places:
  - the core header's `no-delivery-run` row;
  - the contract's `status` bullet;
  - the CHANGELOG entry and the CLAUDE.md block;
  - the stage-regress partition comment and the quick checker's header.
- **R3:** the module header and the test now say which guard denies which layout. In a main checkout,
  protect-trusted-paths denies (a `.git` segment). In a linked worktree, beside or nested, enforce-writes-scope denies
  (another git tree). The ★ HOOK test runs every posture × run state × scope (none, `src/**`, `**`) per layout (54
  cells) and pins `protect = 0` in a linked worktree. One cell the reviewer's probe also covered is now a stated,
  pinned bound: a separate git dir kept inside the project under a non-`.git` name is reachable under a `**` scope, or
  installed with no scope and no run open.
- **R4:** `pathDigest` returns `unhashable` for any path holding U+FFFD. The decoded name can never reach the real
  file, so such a path is never subtracted. A test pins the rule and an end-to-end case with a valid-UTF-8 name that
  holds U+FFFD.
- **R5:** the remedy reads: "Re-running does not fix it; it only replaces the refusal with a report, and the escaped
  change stays in the tree."

## Lesson candidate (not promoted — the orchestrator declined promotion during the unattended batch)

- **R3 is an L37 recurrence.** L37 says "a doc stating a guard's bounds must be PROBED against the guard". A ★ HOOK test
  title restated a two-guard bound that only its main-checkout half had probed, and the independent probe found the
  linked-worktree half false. It is recorded for the maintainer as a possible addition to L37's provenance, not as a
  new lesson.

**Verdict: GREEN — 0 floor-gate findings; 5 advisory findings, all fixed.**
