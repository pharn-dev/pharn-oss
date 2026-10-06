# GRILL — entry-run-as-base-evidence

Plan: `.dev/features/entry-run-as-base-evidence/PLAN.md` · spec-hash: `sha256(pharn/ARCHITECTURE.md)` =
`d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's `spec_content_hash` (no drift)
· **Step 1b lessons declaration (FLOOR): GREEN**, `check-plan-lessons.mjs` exit 0 ("all 15 cited id(s) resolve … and
are referenced in the plan body"). That verdict covers the declaration only. It says nothing about whether L24–L66
were applied.

Interrogated at `0e38b86` (branch `feat/entry-run-as-base-evidence`). The PLAN was read as `trust: untrusted` DATA. No
instruction-shaped content aimed at the grill was found in it. Every claim below rests on code read this run:
`entry-gates.mjs`, `entry-gates-core.mjs`, `pre-run-snapshot{,-core}.mjs`, `stage-regress{,-core}.mjs`,
`regress-base-reuse{,-core}.mjs`, `gate-run-core.mjs`, `run-gates.mjs`, `check-regress.mjs`, `loop-fresh-core.mjs`,
`stage-work.mjs`, `scope-inputs.mjs`, `worktree-fingerprint.mjs`, `entry-observations.mjs`, `ac-tests-core.mjs`, and the
`/pharn-loop` and `/pharn-ship` entry lines.

## Findings — inline axes (advisory; a finding gates nothing)

### False-hit search (the caller's focus) — P0 / P5

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:178"
  problem: >-
    The mutation rule is called "provable" and said to make the order difference unable to change a mapped result.
    That holds only for state the fingerprint sees. `worktree-fingerprint.mjs` enumerates `git ls-files --cached
    --others --exclude-standard`, so a write to an IGNORED path never sets `mutated`. Entry runs gates that regress's
    BASE never runs, and runs them BEFORE mapped ones. The entry order is STYLE_SET, then `base:test`, then the
    verify-shaped full `test`, `typecheck`, `build`, e2e (gate-run-core.mjs resolveSet). So the full-suite `test`, and
    any style gate regress skips, run before the mapped `typecheck`/`build` and can leave ignored state those gates
    read: caches, `coverage/`, `*.tsbuildinfo`, `.next/`, `dist/`. A fresh BASE never ran those gates. Rule (a) passes
    either way.
  evidence: >-
    "(a) means every mapped run judged the entry tree's `fingerprint.init` … So the order difference … cannot change a
    mapped result." The named residual (PLAN.md:494) mentions ignored content only for the snapshot → entry-init
    window, not for writes BETWEEN entry gates.
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:172"
  problem: >-
    Rule (b) accepts a mutating mapped gate when it is last in regress order (the `next build` case). But `mutated`
    cannot tell the gate's own write from a CONCURRENT write made during it, and entry-gates.mjs's header says so: "a
    front-stage write OUTSIDE pharn/features/<name>/ … landing DURING a gate it marks that gate mutated". That gives a
    false-hit sequence. On /pharn-ship the human edits `src/x.ts` while plan and grill run (an IDE format-on-save does
    the same, as does a Bash-tool write in either command). If the write lands during `build`, build reads a non-BASE
    tree and is marked `mutated`. (a) holds and (b) holds, because build is last. `--wait` publishes the offer for
    green or red, so regress takes that exit as BASE. The plan's named residuals do not include this.
  evidence: >-
    "(b) a mapped run that moved the tree is not the last mapped slot in regress order" and "That covers `next build`
    rewriting `next-env.d.ts`: `build` is last in regress order."
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:172"
  problem: >-
    The table states (a) as "an entry run BEFORE any mapped run moved the tree". §4's prose states the stronger
    predicate: every mapped run judged `fingerprint.init`. The build should implement the prose literally, as
    `fp_before === stamp.fingerprint.init` for every mapped run. Nothing else checks it: run-gates.mjs finalize and
    validateStamp compare only consecutive pairs (`runs[i].fp_before === runs[i-1].fp_after`), and never compare
    `runs[0].fp_before` with `fingerprint.init`. A chain-based reading of (a) would also miss a mapped run that follows
    another mapped mutator in entry order.
  evidence: '"(a) an entry run BEFORE any mapped run moved the tree" vs PLAN.md:178 "(a) means every mapped run judged
    the entry tree''s `fingerprint.init`"'
```

### Derived stamp vs its consumers — P0

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:222"
  problem: >-
    A derived stamp can hold a `no-files` `test` run. That happens when every pre-existing test is inside: regress then
    gives `test` `files: []` while typecheck and build stay mapped. Two consumers then need things §6 does not list.
    First, loop-fresh-core.mjs checkJ re-hashes `<seq>-<id>.out`/`.err` for EVERY run, including ran:false ones. If
    materialization writes only the "mapped entry" logs (PLAN.md:213), the empty `<seq>-test.out`/`.err` that
    run-gates writes for a no-files slot are missing, and J STOPs `output-hash-mismatch` on a correct run. Second,
    validateStamp's chain requires that run's `fp_before`/`fp_after` to equal the entry `init` the reused runs carry,
    not a live fingerprint. The ★ freshness e2e (PLAN.md:397) uses a fixture whose `test` is mapped, so it does not
    cover this.
  evidence: '"A `no-files` run is as `run-gates.mjs` writes it." and "Logs: each mapped entry `.out`/`.err` is read
    no-follow …"'
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:427"
  problem: >-
    "cannot pass as a normal one" overstates the claim. The derived stamp lives in `.pharn/pharn-regress/base-gates/`,
    which both the write tools and Bash reach. A writer can drop the `reused` blocks and write `ran: true` runs, and
    the result validates as a normal regress/base stamp. What the floor gives is narrower: validateStamp refuses a
    MALFORMED reused shape (the matrix plus the stamp-level rule). The bound should be L43's: agreement, never
    provenance.
  evidence: '"A derived BASE stamp says it is entry-derived and cannot pass as a normal one" → floor: enum-regex'
```

### Write-tool / resume (§3) — P2 / P6

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:139"
  problem: >-
    The verdict re-decision reads the HEAD stamp (`.pharn/pharn-regress/head/stamp.json`, through baseSpecFrom) as a
    predicate input, and the write tools can reach it while a killed chain is parked at `verdict`. An edit that sets
    its `test.files` to the slot list passes `shape-mismatch` and HITs. check-regress compares ids only, never files,
    so the verdict then pairs a HEAD exit over one list with a BASE exit over another. This is the inherited class (the
    same editor can rewrite HEAD exits directly), but §3's closing sentence names only stage.json and base-gates/.
  evidence: '"So a forged `stage.json` `entryReuse`, or edited derived bytes in `base-gates/`, cannot produce a reuse."'
```

## Findings — registered grillers (13, from `count-grillers.mjs`; advisory)

Scanners run this run: `scan-plan-secrets` `{"found":false}`, `scan-plan-pii` `{"found":false}`,
`scan-plan-migrations` `{"mentions":false}`, `scan-plan-i18n` `{"found":false}`, `scan-plan-observability`
`{"mentions":true}`. The observability hits are lines 118, 119, 173, 213, 224, 241, 271, 370, 371, 418, 426, 453,
474, 477, 478 and 479: the logs/telemetry vocabulary of the design.

### documentation (P7) / architecture (P3)

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:441"
  problem: >-
    The soundness argument for excluding the whole feature directory from ENTRY_ALGO rests on entry stamps never being
    reuse evidence: "Sound for this stage only: an entry stamp is read by entry-gates.mjs alone and is never reuse
    evidence" (worktree-fingerprint.mjs:112-116; the same sentence is in gate-run-core.mjs:261 and
    gate-run-record.md:234). This PR makes that premise false. `worktree-fingerprint.mjs` is not in `## Files`, so its
    shipped comment either goes stale or becomes an undeclared write. The inherited advisory's consequence also
    changes direction. Before, a non-style entry red caused by a front-stage write in the feature directory could only
    STOP the run (S14). Now `base:test`, which never causes S14, and every mapped gate can turn such a red into BASE
    evidence, and a HEAD regression then reads as `pre_existing`. The guarantee audit should say that, not only
    "inherited".
  evidence: '"Non-style entry results were not influenced by the front stages'' writes under `pharn/features/<name>/`"
    → **advisory**, inherited from 6.42.0'
```

Also for documentation: `scope-inputs.mjs`'s header states its exact load graph ("node:fs, and three floor
modules…"). Moving `defaultTestUniverse` there adds `stage-regress-core.mjs` (`isTestFile`). There is no cycle, since
stage-regress-core imports only gate-run-core, but the header sentence needs updating in the same edit.

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:70"
  problem: >-
    The slot is called "evidence only", but its own input failures can take down the WHOLE entry check. `--base-tests`
    is read "like --targets", and run-gates.mjs readTargets REFUSES the file when any entry fails badPath (a glob/`?`
    character, a leading `-`, a path under `.pharn/` or `pharn/features/`). That makes `init` refuse, and entry-gates
    `--start` then records `unusable child-refused`. A spawn error such as E2BIG, from passing every outside test as
    argv, makes run-gates `run --next` call `fail("usage-error", "gate … could not be started")`, and the runner's
    result is again `unusable`. The plan also never says what happens when the `changedPaths(HEAD)` listing fails.
    /pharn-loop goes on after exit 2, but loses its S14 protection. /pharn-ship asks the human on every run. The plan
    should state that every slot-input failure degrades to "no slot" (a later `gate-missing` MISS), never to an `init`
    refusal, and should test that.
  evidence: '"passes `--base-tests <file>` to `run-gates init --stage entry` (read like `--targets`: a file, every path
    checked by `ac-tests-core.mjs badPath`)"'
```

### comprehension (P7) / honest scope

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:31"
  problem: >-
    The run the "Why" cites would MISS under this predicate. `.dev/measurements/loop-wall-clock-2026-10-05.md` (the
    runs table) records that billing-plan-catalog started with 4 untracked files under another feature's
    `pharn/features/billing-plans-entitlements/`. That is `start-dirty`, because Q3 allows only the run's own feature
    directory. workspace-wording-ui started with a user edit: `start-dirty` again. So 2 of the 3 recorded real runs
    would not HIT, while every delivery run, quick included, pays the extra suite. On /pharn-ship, `d0` is always a
    digest (SPEC.md), so a required style gate always reads `style-unattributed`. A ship HIT therefore needs regress to
    skip style. The plan disclaims any real-project saving, which is honest, but the human should weigh this with the
    approval.
  evidence: '"That run''s BASE `test` carried an explicit outside-test list … No real-project saving is claimed."'
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:248"
  problem: >-
    Two vocabularies name the same 6.33.0 HIT. The report's new `base_evidence.source` uses `"retained"`, while the
    work record's `base.evidence` keeps `"reused"` (stage-work.mjs BASE_EVIDENCE) and gains `"entry"`. Two closed
    enums for one fact need a pin, or one name.
  evidence: '"`retained` (6.33.0 HIT) | `entry`" (PLAN.md:236) vs "`base.evidence` gains `entry`" (PLAN.md:248)'
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:494"
  problem: >-
    A question for the human. PHARN can create one specific piece of ignored content itself. A regress that stops
    before `cleanup` leaves the nested worktree `.pharn/pharn-regress/base/`, a full checkout of an older BASE, inside
    the root where the entry gates run. Only the NEXT regress's phaseFreshLate clears it. Test runners treat positional
    files as patterns or substrings (gate-run-core.mjs says so for Jest and Playwright), so a runner whose discovery
    reaches `.pharn/` could run the stale copy's tests inside `base:test`. Should `--start` clear a leftover regress
    worktree, or should the predicate MISS when one existed? This was not measured.
  evidence: '"The snapshot → entry-init window, and ignored or environment content at entry, are unattested."'
```

### testability (P1) — presence recognized

A verification approach is present: the `## Tests` section covers unit miss rows, the slot, I/O, end-to-end through
the real CLIs, ★ HOOK, ★ freshness and the historical stamps, and `## Measurement` describes the harness. Adequacy gaps
are already filed above as testable cases: a no-files HIT under `check-loop-fresh` J, a concurrent write during the
last mapped gate, an ignored-path write by the entry-only full `test`, and slot-input failures that leave entry usable.

### No finding (reason noted)

- **observability (P6):** the decision is reported through `base_evidence.source` and `.entry` (miss code, digests,
  ids), and a publication failure is a stderr note. Presence recognized. One prose-only note: `no-offer` cannot tell
  "publication failed" from "entry never reached green/red".
- **coupling (P3):** the offer is an immutable record in the git dir, bound by sha256 and following
  head-reuse-offer.mjs's shape. The list rule moves to one owner. Clean seams recognized.
- **architecture (P3):** the core/I-O split follows `regress-base-reuse{,-core}.mjs`. No sibling reach.
- **performance (P7):** one extra outside-suite run per delivery run is named as a residual (PLAN.md:500) and
  measured. No unbounded loop or fan-out.
- **migrations (P7):** the persisted shapes change (`pharn-stage-regress-progress/3`, a new offer schema). A `/2`
  resume fails closed (`progress-malformed`), as in the 6.33.0 precedent. Declared and safe.
- **security / privacy (P2):** both scanners are clean. Test paths are argv elements after badPath, and gate logs are
  hashed, never read.
- **i18n / a11y (P7):** no user-facing text and no UI.

## Checked and found sound (so the human need not re-check)

- **List equality vs command equality (axis 1).** The shapes are equal: a `files` gate in regress and `base:test` both
  run through `spawnGate` as `npm run test -- <files>`, with the same detached process group and the same
  `PHARN_TEST_RESULTS` variable (only the path differs, and no BASE-side reader uses it). The cwd differs (root vs
  `.pharn/pharn-regress/base`), and so do ignored files and `node_modules`. The plan states this as "NOT CLAIMED"
  (PLAN.md:438). Test-runner config is BASE's on both sides when the start is clean. A modified, deleted or
  `rm --cached` pre-existing test shows up in `inside` and so as a list mismatch.
- **Consumers of the BASE stamp (axis 4).** check-regress.mjs checks only `head == --base`, ordered ids and `required`,
  so it accepts a derived stamp that has the matrix row. loop-fresh C, D, E and H accept it too. J does as long as
  every log exists (see the no-files finding). G reads HEAD only. No historical stamp gains a reused run, and nothing
  validates stamp run ids against `RESERVED_IDS`, so adding `base:test` invalidates no recorded stamp.
- **Offer lifecycle.** A stale offer from an earlier run is bound to that run's marker sha256, so it reads
  `other-run`. A `--start` that refuses before discarding it is still safe.

## Prose summary

The design is careful, and most false-hit routes are closed by byte equality, sha256 binding and the protected git-dir
records. Three routes stay open without a named residual. (1) Ignored-path state written by entry-only gates (the full
`test`, skipped style gates) that run before mapped gates. The mutation rule's "provable" claim is true only over the
fingerprint. (2) A concurrent foreign write during the last mapped gate: rule (b) admits it, because `mutated` cannot
attribute a write. On /pharn-ship this is a plausible human or IDE action. (3) The inherited feature-directory overlap
advisory now fails in the unsafe direction, masking a regression as `pre_existing` where before it stopped the run.
The shipped soundness sentence in `worktree-fingerprint.mjs`, which is not in `## Files`, becomes false.

Two concrete build defects are worth fixing in the plan before /pharn-dev-build. The no-files run in a derived stamp
needs its empty logs and the entry `init` fingerprint, or check-loop-fresh J STOPs a correct run. And the slot's input
failures must degrade to no slot, not to an unusable entry check. The P7 note is for the human: the cited trigger run,
and 2 of 3 recorded runs, would read `start-dirty`.

ADVISORY VERDICT: 11 concerns raised (0 blocking-severity, 5 important, 6 minor). These are for the human to weigh
before /pharn-dev-build. The Step 1b lessons-declaration result above is a separate floor verdict and is not counted
here.
