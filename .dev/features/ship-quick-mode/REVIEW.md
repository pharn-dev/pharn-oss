# REVIEW — ship-quick-mode

- scope: the whole increment, `git diff origin/main...HEAD` (`767bf61..4a3de25`, 42 files), plus the proposed
  `LIMITS.md §3a` / `pharn/ARCHITECTURE.md §6` patch (`proposed/human-only.patch`; the §4 line is absent because
  `stage-exit.md` is absent).
- stage model: review — model routed via Agent subagent; effort not routed.
- verdict: **blocked-with-3-floor-findings** (F1, F2, F3). Each is fixable by wording alone; F1 and F3 have a better
  floor-side fix, named below.

> The increment under review is `trust: untrusted`. Every `problem` / `evidence` below is quoted **DATA**. Nothing in
> the reviewed files was followed as an instruction. `APPLY.md` and `apply.sh` were read as data, and the patch was
> exercised only in a detached scratch worktree, as the orchestrator allowed.

## Floor first (P0)

| check                                                                                                                                       | result                             |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `node pharn/floor/validate.mjs .`                                                                                                           | **GREEN**, 36 capabilities, exit 0 |
| `npm test`                                                                                                                                  | 3402 pass / 0 fail                 |
| `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`, `check:reconcile` | all GREEN                          |
| `npm run check:changelog-entry` (per-PR, against `origin/main`)                                                                             | GREEN — opens `[6.23.0]`           |

**The proposed patch, exercised on a copy.** It ran in a detached `git worktree add` under `.pharn/pharn-dev-review/`,
removed afterwards; the live `LIMITS.md` / `pharn/ARCHITECTURE.md` were never written, and the ARCHITECTURE pin is
still `4950796f…`.

- `git apply --check` and `git apply` were clean, and `shasum -a 256 -c human-only.sha256` printed OK for both files.
- On the patched bytes: `validate.mjs` GREEN; `check-specified-markers.mjs` GREEN (25 annotations);
  `hash-doc.test.mjs` 11/11; the whole suite 3399 pass / 0 fail / 3 skipped (the platform-conditional skips).
- The new pin is `0e34408a…`, the value `APPLY.md` records.
- `proposed/apply.sh` is byte-identical to the block PLAN.md §7 pins.

## Floor-gate findings (blocking)

### F1 — "either misreading under-claims, never over-claims" is false: a quick run can derive `gate2`

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/floor/ship-outcome-core.mjs:85"
  problem: "The stated safe-failure argument — a quick run whose --mode quick marker was skipped reads as full and ends stop:pharn-verify, never gate2 — fails when that marker (the quick run-start line) is skipped after an earlier /pharn-ship run on the same feature ended without its run-stop: the quick run's markers join the earlier run's window, and deriveShipOutcome returns the FLOOR decision gate2 from the earlier run's pharn-regress stage-start and its regression-report.json, a regress check that never ran over this build."
  evidence: "EITHER MISREADING UNDER-CLAIMS, NEVER OVER-CLAIMS (stated because it is the safe-failure argument for trusting a Bash-written marker at all): a quick run whose `--mode quick` marker was skipped reads as full, so it has no regress stage-start and its outcome is `stop:pharn-verify`, never `gate2`."
```

**Reproduction.** The real `deriveShipOutcome` was called over `normalizeMarkers(...)`.

- Markers: an earlier full run `[run-start, stage-start pharn-plan, pharn-build@1, pharn-regress@1]` with no
  `run-stop` (interrupted), then the quick run with its run-start skipped
  `[pharn-plan, pharn-build@1, pharn-verify@1, run-stop]`.
- Reports: verify `PASS`; a stale `no-regressions` report from the earlier run.
- Result: **`gate2`** (`runMode` → `full`).
- Controls: the same trail after an earlier run that did close with `run-stop` gives `undetermined`, and a quick
  run-start written without `--mode` gives `stop:pharn-verify`. So the claim holds only for the case the test builds
  (`mode: undefined` on a written run-start). It fails for a skipped marker, which is the case the sentence names.

**Why this is new with quick mode.** Iteration numbers restart at 1 in every run. A quick run never starts
`/pharn-regress`, so the earlier run's `pharn-regress@1` completes full-mode applicability for this run's
`pharn-verify@1`. A full run in the same position would have started its own `pharn-regress@1`.

**The same sentence, or "never `gate2`", appears at:**

- `pharn/pharn-contracts/cost-ledger.md:364`
- `CLAUDE.md:647`
- `.claude/commands/pharn-ship.md:257` (the quick guarantee audit), `:164` and the description
- CHANGELOG [6.23.0]
- `proposed/human-only.patch:20` (`LIMITS.md §3a`) and `:39` (`ARCHITECTURE.md §6`). These two would carry the claim
  into trusted docs.

**Fix (one of).** Preferred, on the floor: in `verdictApplicability`, count a latest-iteration regress or verify
stage-start only when it follows that iteration's last `pharn-build` stage-start. The merged pair then reads
`not-in-run`, in both modes. Minimal: narrow every site to "a run-start written without `--mode`", and name the
skipped-run-start merge as a residual beside 6.9.1's. Fix the patch text either way, before a human applies it.

### F2 — the first-token rule is advisory model parsing, stated as an impossibility

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".claude/commands/pharn-ship.md:169"
  problem: "The first-token rule is prose the orchestrating model reads — no hook and no floor code parses the invocation — yet four sites state its consequence as an impossibility and none labels it advisory; the one floor backstop (check-spec-approved plus --spec-kind) passes for ANY Approved quick SPEC however --quick was obtained, so in a resumed feature directory whose SPEC is already Approved quick, a mis-scanned --quick runs the shorter spine with every floor check green and no fresh human decision."
  evidence: "a pasted description that happens to contain the substring `--quick` can never switch a run into this mode"
```

**The same claim appears at:**

- `.claude/commands/pharn-spec.md:82` ("never switches this command's mode")
- `README.md:155` ("so it can never be triggered from inside your description")
- CHANGELOG [6.23.0] ("can never switch a run's mode (P2)")

The quick guarantee audit (`pharn-ship.md:241-259`) does not list the claim, and PLAN.md's determinism audit calls
it "a membership test".

**Reproduction.**

- Every `--quick` in `pharn/floor/*.mjs` and `.claude/hooks/*.cjs` is a comment or a string. No `UserPromptSubmit`
  hook is wired.
- An Approved, templated quick SPEC gives `check-spec-approved.mjs` exit 0 and `--spec-kind` → `quick`. The floor
  sees the SPEC, never the invocation.

**Fix.** At all four sites, call it ADVISORY: an instruction to the orchestrating model. Name the floor backstop and
its bound: the kind check stops a non-quick SPEC, but it cannot tell a typed `--quick` from a misread one. Add the
claim to the quick guarantee audit.

### F3 — "everything it skips is named" omits a fix #7 control that quick mode drops

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".claude/commands/pharn-ship.md:165"
  problem: "Quick mode claims everything it skips is named, but skipping /pharn-regress also skips check-regress.mjs scope — the only check that detects a changed path outside PLAN.md and AC-TESTS.md ## Files made BEFORE the build's reconcile anchor (a /pharn-test-stage Bash write, say), because check-bash-reconcile covers only anchor-to-verify — and neither the Not-checked list, the GATE-1 trade sentence, the README, the CHANGELOG nor the LIMITS §3a patch names this writes-scope loss."
  evidence: "**Quick mode is not `--yolo`: both human gates stay, and everything it skips is named below, not hidden.**"
```

**The same completeness claim appears at:**

- `pharn-ship.md:226-230` (the list names regressions, the interrogation and the two artifacts)
- `pharn-spec.md:101` (the trade sentence)
- `README.md:149` ("Its ship record names exactly what it did not check")
- CHANGELOG [6.23.0] ("names exactly what was skipped")
- `human-only.patch` §3a ("it does not check three things")

PLAN.md's own guarantee audit names the loss ("`check-regress scope`'s smoke alarm does not run either"), but it did
not reach any durable artifact. That is **L2**'s shape.

**Reproduction.** A nested scratch git repo was built from `pharn/floor` and `.claude/hooks`, with `.pharn/` ignored
and a PLAN scoping `src/a.js`.

1. A pre-anchor out-of-scope `src/stray.js` was written; then the setter and `reconcile-baseline.mjs --anchor` ran,
   then the in-scope `src/a.js` was written.
2. `check-bash-reconcile.mjs --require-baseline` → **CLEAN**, exit 0.
3. `check-regress.mjs scope --changed src/a.js,src/stray.js --declared src/a.js` → `escaped: [src/stray.js]`, exit 1.
4. Control: a post-anchor `src/stray2.js` → reconcile **ESCAPE**.

**Fix.** Preferred: keep the control. Run `check-regress.mjs scope` in quick mode before `/pharn-verify` — it needs no
base worktree and no install — and STOP on `escaped`, as `/pharn-regress`'s Step 4 does. Otherwise, name the loss in
all of these, with an open form in place of "three things" (**L47**):

- the Not-checked list, as a fourth bullet;
- the trade sentence;
- the README;
- the LIMITS patch.

## Advisory-gate findings (inform; never the sole basis for blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-ship.md:237"
  problem: "In a resumed feature directory (D7 lets a quick SPEC run the full flow first), an earlier full run's REGRESSION.md, regression-report.json, BRIEFING.md and RUN-REPORT.md stay on disk; the quick GATE-2 note says neither pointer target exists, and quick item 10 only ADDS to Step 3, so Step 3's full-mode bullets still direct the orchestrator to record the regress .verdict verbatim and to point at REGRESSION.md, BRIEFING.md and RUN-REPORT.md's ## Verdicts — all from another run, and the last two carry that run's regress verdict."
  evidence: "minus the regress verdict (never read) and the `RUN-REPORT.md`/`BRIEFING.md` pointers (neither exists)"
```

The Step-3 bullets that are not carved out are at `pharn-ship.md:769`, `:776` and `:779`.

The renderer has the same gap, probed with a quick ship ledger beside a stale `BRIEFING.md`:

- `## Verdicts` correctly prints `regress: not part of this run`;
- `## Briefing` links the stale file as "the GATE-2 briefing, rendered beside this report".

Fix: quick item 10 should omit those three Step-3 bullets, and say that any such file already in the directory
predates this run. `briefingSection` should say "not part of this run" for a quick ship ledger.

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/ship-quick-mode/BUILD.md:153"
  problem: "BUILD.md says everything else matches the plan with no other deviation, but several things PLAN.md and GRILL.md promised were not built: the L45 WIRING test that executes the committed quick run-start line into gate2-quick (with the full-line control), the quick Step-2b applicability cases, the CHANGELOG rollback sentence GRILL G11 marked FIXED, and mode: full / ship-record.json mode in full-mode Step 3 (Decision 9 lives only in a parenthetical inside ## Quick mode)."
  evidence: "Everything else matches the plan as amended after grill; no other deviation."
```

The behaviour itself is correct, probed live:

- a quick run with `pharn-build@2` started and verify only at 1 → `stop:pharn-build`;
- with `pharn-verify@2` → `gate2-quick`.

It is pinned by no test. The committed `--spec-kind` WIRING tests exist; the run-start one does not.

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/pharn-contracts/spec-template.md:155"
  problem: "An Approved LEGACY SPEC carrying an inert spec_kind: quick line becomes quick-eligible without re-approval by adding one spec_template line, which is outside the pin: check-spec-approved stays exit 0 and --spec-kind flips from feature to quick; the contract's 'a legacy SPEC is therefore never quick' holds only while the SPEC stays legacy."
  evidence: "A legacy SPEC's `spec_kind` is not validated: a legacy SPEC has no AC ids either way — a legacy SPEC is therefore never quick."
```

Probed. The legacy pin equals the templated quick pin, because the pin covers the kind line either way.

This bound is not new. The same path turns a legacy `spec_kind: test-infra` line into a BOOTSTRAP SPEC, and
CLAUDE.md names "spec_template, which the pin does not cover" only for NOT-APPLICABLE.

Fix: state the bound in the quick paragraph. A follow-up could put the presence of the `spec_template` line into the
pin.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-ship.md:263"
  problem: "Quick mode says every verdict it reads is a pre-existing checker reused exactly as full mode reuses it, but check-spec.mjs --spec-kind is new in this increment, full mode never reads it, and in quick mode it gates (a STOP on any token but quick)."
  evidence: "is a pre-existing checker, reused exactly as full mode reuses it."
```

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/pharn-contracts/spec-template.md:173"
  problem: "The rule-9 rationale says an e2e criterion needs the slowest gate, which quick mode exists to avoid, but /pharn-verify in a quick run still discovers and runs the project's test:e2e / e2e gates; excluding e2e criteria avoids an e2e red run at /pharn-test, not the e2e suite."
  evidence: "an `e2e` criterion needs the slowest gate and its own runner, which is exactly what quick mode exists to let a small change avoid."
```

The same wording is in the `spec-template-core.mjs` constants comment.

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "CLAUDE.md:1087"
  problem: "Two docs point at a 'Quick mode' section that does not exist in either file, and command-hygiene.test.mjs twice says the --mode carve-out is documented in CLAUDE.md's Writes-scope section, which holds no such text."
  evidence: '`regress` entirely (see "Quick mode" below).'
```

The other sites are `README.md:69` and `.dev/floor/command-hygiene.test.mjs:2021` and `:2173`.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/floor/ship-outcome-core.mjs:49"
  problem: "Rationale text left on the old story (L25, L47), including a re-count the plan's own L47 line forbids."
  evidence: "so a fourth\n// form fails rather than merely going untested."
```

The other stale sites:

- `ship-outcome-core.mjs:59` — the 6.9.1 paragraph still says gate2 needs a stage-start for BOTH stages, unqualified.
- `spec-template-core.mjs:424` — the JSDoc kind set lacks `quick`.
- `check-spec.test.mjs:883` — the title says "covers all NINE kinds", but the plan promised no count in it.
- `pharn-ship.md:175` — the run-start is Step 1's third bullet, not its "second".
- `pharn-verify.md:32` — "You sit AFTER `/pharn-build` and `/pharn-regress`", which is false for a quick run. The L50
  sweep missed it.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/ship-quick-mode/handoff/make-patch.mjs:41"
  problem: "The header says a refused git apply --check writes nothing on the patch side, but human-only.patch is written (line 278) before the check (line 282), leaving a fresh patch beside a stale sums file; apply.sh's 'restored from HEAD' uses git checkout --, which restores from the index. Both fail safe."
  evidence: "written on the trusted-doc/patch side; a partially written scratch dir is removed either way."
```

## Lens results

### L-floor (P0)

F1, F2 and F3 are blocking. The minor findings on `pharn-ship.md:263`, `spec-template.md:173` and `make-patch.mjs:41`
are wording. The rest reduces to the floor or is labeled, and was probed where testable:

- rule 9 is an enum and count check: a quick SPEC with 4 criteria REDs `quick`;
- the pin covers `quick`: a feature → quick flip REDs `pin`;
- `--spec-kind` prints a closed token or an empty line;
- the `--mode` vocabulary is closed, and a refusal writes nothing;
- `normalizeMarkers` keeps only a `MARKER_MODES` member;
- `gate2-quick` is floor relative to the recorded markers, and says so;
- full mode's decision table is byte-identical.

### L-eval (P1)

No `role:` capability was added or changed. `validate.mjs` agrees: 36 capabilities, no missing binding. The suite is
green at 3402 tests. The gaps are the plan-promised tests in the BUILD.md finding.

### L-trust (P2)

The new inputs are closed sets. `--spec-kind` never echoes raw text. The `mark-phase` refusal names the vocabulary,
not the argv. Rule 9 names a line, an AC id and a `VERIFY_LEVELS` member. The quick `GRILL.md` holds fixed text and no
finding object.

F2 is the trust-relevant gap. No instruction-looking content in the increment changed this review.

### L-axis (P3)

There are no sibling references. The new imports stay inside `pharn/floor`:

- `ship-outcome-core` → `mark-phase` (`QUICK_MODE`);
- `render-run-report` → `ship-outcome-core` (`runMode`);
- `check-ac-tests` → `spec-template-core` (`TEST_FIRST_KINDS`).

There is no cycle, and `mark-phase`'s CLI is guarded by `import.meta.main`. No finding.

## The orchestrator's priority questions

1. **An over-claimed regress check or plan interrogation?**
   - In the ledger: yes, through F1 (a skipped quick run-start after an unclosed run).
   - In `SHIP.md` and the report: through stale artifacts (the `pharn-ship.md:237` finding).
   - In `GRILL.md`: no. The quick grill-log pins "interrogation NOT performed".
2. **Can untrusted input switch a run into quick mode, or flip a SPEC's kind?**
   - The switch rests only on the model's parse (F2).
   - A kind flip through the `spec_kind` line is pin RED (probed).
   - An Approved legacy SPEC can flip without re-approval through the unpinned `spec_template` key (the
     `spec-template.md:155` finding).
3. **Did a full-mode pin get weaker?** No.
   - `PHASE_MARKER_WIRING` and `ADOPTION` exclude only `--mode` lines. `QUICK_MODE_WIRING` requires exactly one such
     line in the whole corpus: in `pharn-ship.md`, a `run-start` with `--adopt-pending`.
   - Adding `--mode` to the full run-start fails both rules.
   - The closure tests moved by equality (4 → 5 forms, `{gate2}` → `{gate2, gate2-quick}`, 8 → 9 kinds).
4. **Is quick treated exactly like test-first?** Yes, probed:
   - `check-ac-tests --spec` → `TEMPLATED` (0), as for `feature`;
   - `--write-bootstrap` is refused, as for `feature`;
   - the AC gate reads a quick world as `test-first` / `PASS`;
   - `check-test-stage` reads `READY test-first`, with `--require-test-first` too.
5. **`/pharn-loop` and `check-loop-fresh`?** Unaffected:
   - the loop always opens a fresh feature directory (S2), so it never meets a quick SPEC or `GRILL.md`;
   - `--quick` with `--model-approve` reports blocked, which lands on the S10 closure row;
   - check I needs only that `GRILL.md` exists;
   - a quick SPEC satisfies `--require-test-first`.
6. **Doc sentences stronger than the code:**
   - F1, F2 and F3;
   - the stale-artifact, `pharn-ship.md:263`, `spec-template.md:173` and `ship-outcome-core.mjs:49` findings.

## Proposed lesson (for a separate, human-gated `/pharn-dev-memory-promote` — not written here)

**Title.** A safety argument about an advisory boundary marker must be probed with the marker ABSENT, not only with a
wrong value. A missing run-start does not read as the default mode. It re-opens the previous run's window, and that
run's evidence counts as this one's.

**Why it recurs.** 6.9.1 fixed an earlier run's green reports counting as this run's. F1 is the same class, reached
through the missing boundary itself. The committed test altered the marker's value (`mode: undefined`) and never
removed the marker.

**Neighbours.** [[L37]] (probe with a member expected to fail) and [[L42]] (capture at the moment).

**Candidate record.**

- type: process
- concepts: [advisory-marker, run-window, negative-probe, boundary-record]
- provenance: feature `ship-quick-mode`, commit `4a3de25` (the reviewed build), source this REVIEW.md F1, date
  2026-09-26.

## Scratch

The probes ran from `.pharn/pharn-dev-review/`. That covered the scratch worktree, a nested probe repo and four
`node` probe scripts, and all of it was deleted before this file was written. `git status` is clean apart from this
file.

## Re-review after GATE-2 fixes (opus)

- reviewed: `036393f` (`wip(ship-quick-mode): GATE-2 review fixes (opus)`), fast-forwarded from `2071a97`; the
  sections above are the original review, left as written.
- stage model: review — opus, set by the maintainer's 2026-09-26 instruction, overriding pharn.config.json; model
  routed via Agent subagent; effort not routed.
- verdict: **GREEN — 0 floor-gate findings open.**
  - F1, F2 and F3 are verified-fixed, each repro re-executed against the real code.
  - Every advisory is verified-fixed or narrowed-ok.
  - Three new findings, all minor and advisory (N1–N3 below).

### Floor, re-run

- `node pharn/floor/validate.mjs .`: **GREEN**, 36 capabilities.
- `npm test`: 3417 pass / 0 fail.
- `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`,
  `check:contributing`, `check:reconcile` and `check:changelog-entry`: all GREEN.
  - `lint` was RED once, on two `.js` files in my own probe repo under `.pharn/`. ESLint does not exclude
    `.pharn/`, the same shape VERIFY.md records. It was GREEN once that scratch was deleted.
- The live `pharn/ARCHITECTURE.md` pin is still `4950796f…`, and `check-plan-lessons` on the amended PLAN is GREEN
  (34 ids).

**The proposed patch, in a detached scratch worktree only** (removed afterwards):

- `git apply --check` and `git apply` were clean, and `shasum -c` printed OK for both files.
- On the patched bytes:
  - `validate.mjs` GREEN;
  - `check-specified-markers.mjs` GREEN, 25 annotations;
  - `hash-doc.test.mjs` 11/11;
  - the whole suite 3414 pass / 0 fail / 3 skipped (platform-conditional).
- The new pin is `7b02b45c…`, the value `APPLY.md` records.
- `stage-exit.md` is still absent, so the patch carries no §4 line, and `apply.sh` is byte-identical to the amended
  PLAN's pinned block.
- **Reproducible:** `make-patch.mjs` run on the unpatched scratch tree rewrote `proposed/` byte-for-byte (`git diff`
  empty).
- **Refusal:** run on an already-patched tree, it exits 1 ("find string matched 0 time(s)") and writes nothing. Both
  `proposed/` files kept their sums, and no scratch was left behind.

### Per-finding status

| finding                                             | status         | re-executed evidence                                                                                                                                               |
| --------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1 — a skipped quick run-start could derive `gate2` | verified-fixed | the original repro now gives `undetermined`; the compliant trails and mutation controls are below                                                                  |
| F2 — first-token rule stated as an impossibility    | verified-fixed | ADVISORY at all four sites (and at `pharn-grill.md`), backstop and bound named, a guarantee-audit bullet; a hygiene pin forbids the struck sentence                |
| F3 — a fix #7 control dropped unnamed               | verified-fixed | the committed item-7 line, run in a nested repo with a stray written before the anchor: reconcile CLEAN, item 7 exit 1 `escaped: ["src/stray.js"]`; control exit 0 |
| stale full-run artifacts (`pharn-ship.md:237`)      | narrowed-ok    | labelled, not removed, and the reason is stated; the renderer's `## Briefing` for a quick ledger says "not part of this run"; the full-ledger control still links  |
| BUILD.md "no other deviation" / promised tests      | verified-fixed | the ★ WIRING test executes the committed quick lines; the quick Step-2b cases, the G11 rollback sentence and `mode` in Step 3/3b exist; BUILD.md corrected         |
| legacy SPEC via unpinned `spec_template`            | narrowed-ok    | re-run: exit 0 and `--spec-kind` `feature` → `quick`; the templated-flip control is exit 1; now stated in the contract, `## Quick mode`'s audit and the CHANGELOG  |
| `pharn-ship.md:263` "pre-existing checker"          | verified-fixed | `--spec-kind` is named as the one new gating read                                                                                                                  |
| `spec-template.md:173` e2e rationale                | verified-fixed | the contract and the constants comment say `/pharn-verify` still runs the project's e2e gates                                                                      |
| dangling "Quick mode" refs / hygiene comments       | verified-fixed | `CLAUDE.md` and `README.md` now point at real anchors, and the test comments cite PLAN.md §6                                                                       |
| stale wording                                       | verified-fixed | `ship-outcome-core.mjs:49`/`:59`, `spec-template-core.mjs:424`, the check-spec test title, `pharn-ship.md:175` ("third bullet") and `pharn-verify.md:32`           |
| `make-patch.mjs:41` / `apply.sh` message            | verified-fixed | the check reads the patch from stdin before either file is written; the message says "restored from the index"                                                     |

**F1, in depth.** The real `deriveShipOutcome` was run over `normalizeMarkers`.

- **Compliant trails** — none reads `undetermined`:
  - a full run → `gate2`, with the Step-2b retry → `gate2`;
  - a quick run → `gate2-quick`, with the Step-2b retry → `gate2-quick`;
  - a resumed full or quick `/pharn-ship` after a closed and after an unclosed full run → `gate2` / `gate2-quick`;
  - resumed after a grill STOP → `gate2`;
  - a `/pharn-loop` trail with two iterations and freshness re-runs of `verify@1` and `regress@2` → `gate2`. Those are
    the only re-runs: `loop-fresh-core` names `verify` or `regress` as `stage_to_rerun`, never another stage, and both
    are exempt from (b).
- **What (b) now turns into `undetermined`:** only a deviation — a duplicated `build@1` line, say. That is the
  under-claiming direction.
- **The two stated bounds hold as written:**
  - skipping every stage-start as well as the run-start yields a trail identical to a real full run (`gate2`);
  - an earlier run that left only its run-start yields `gate2-quick` or `stop:pharn-verify`.
- **Mutation controls (L60), each on a scratch copy of the module:**
  - disabling (b) reds 3 tests — the repro, (b) and the 22-shape enumeration;
  - disabling (a)'s order reds 2 — (a) and quick Step 2b;
  - disabling (a)'s build requirement reds 1 — (a).

**F3, in depth.**

- **Placement:** item 7 runs after the build and before `/pharn-verify`, and Step 2b re-runs it between the re-build
  and the re-verify. Its exits 1 and 2 both STOP.
- **Inputs:** the same as `/pharn-regress`'s Step 3 (base, `inside`, the declared set, `--feature`), so its exemptions
  and its exposure to an un-ignored `.pharn/` match full mode exactly.
- It writes no marker, so no quick run carries a `pharn-regress` stage-start.

### New findings (advisory — minor)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/cost-ledger.md:382"
  problem: "The re-derived bound says a skipped quick run-start reads undetermined 'either way', but an unclosed earlier run that repeats none of the quick run's stage-starts reads stop:pharn-verify: the safe direction, yet outside bound (2) as worded ('left nothing but its run-start'); the builder's own test title says 'undetermined or stop:*'."
  evidence: "(condition (b)), so the outcome is `undetermined` either way"
```

N1 was probed with an unclosed `/pharn-loop` trail, `[run-start, stage-start pharn-spec]`, then a quick
`/pharn-ship` over that feature directory with its run-start skipped. The result is `stop:pharn-verify`
(`not-in-run`). "Never `gate2`" still holds.

The same quantifier appears at:

- `ship-outcome-core.mjs:107`
- `pharn-ship.md:330`
- `CLAUDE.md:653`
- CHANGELOG [6.23.0]

Fix: "`undetermined` or `stop:*`, never `gate2`", or widen bound (2) to "an earlier run none of whose stage-starts
the new run repeats".

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/floor/render-run-report.mjs:626"
  problem: "When 6.23.0's conditions (a)/(b) exclude a stored gate2, the report still says the ledger predates the 6.9.1 rule, so a 6.20.0 ledger is mis-dated."
  evidence: "**The stored `gate2` above predates this applicability rule (6.9.1)** and rests on these same"
```

N2 was probed with a `skills_version: 6.20.0` ship ledger that stores `gate2` over a duplicated `build@1` marker. It
renders "CANNOT BE BOUND TO THIS RUN" plus the 6.9.1 sentence. This is rare: it needs a deviating historical trail.

Fix: "predates the applicability rules in force today (6.9.1, 6.23.0)".

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: "LIMITS.md:256"
  problem: "LIMITS §6 bounds check-regress.mjs scope as firing only if /pharn-regress runs; since F3 a quick run also runs it (item 7) without /pharn-regress, so the sentence now understates it, and the human-only patch touches only §3a, whose new 'still stops the run' does not point at §6's advisory, smoke-alarm bounds."
  evidence: "Four bounds, every one stated in that checker's own header: it fires only if `/pharn-regress` runs;"
```

N3 is a trusted-doc sentence gone stale in the safe (understating) direction, so no gate reads it. Fix: before the
human applies the patch, add one §6 edit to the generator — "(or `/pharn-ship --quick`'s item 7)" — and have §3a's
scope-check clause cite §6's bounds. Otherwise, name it as owed by a later trusted-docs catch-up. A generator edit
changes the pin and the sums, so it means regenerating.

### Re-review scratch

The re-review's probes also ran from `.pharn/pharn-dev-review/`, and all of it was deleted before this section was
written:

- the scratch worktree (patch applied, mutation controls);
- a nested probe repo for F3;
- five `node` probe scripts.

`git status` is clean apart from this file.
