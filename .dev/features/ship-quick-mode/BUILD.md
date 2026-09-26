# BUILD — ship-quick-mode

Built from `.dev/features/ship-quick-mode/PLAN.md` as merged at `8e9126917da2e67e72c97f5f1215873dfbd908a1` (branch
`ship-quick-mode` fast-forwarded onto `main` at `767bf61`). GATE 1 was approved by the orchestrator as a model
decision under the maintainer's 2026-09-25 delegation, not by a human (recorded in PLAN.md's header and Q1).
`node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` re-confirmed `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`
against the plan's pinned `spec_content_hash` before any write — no drift.

## What landed

Every file in PLAN.md's `## Files` list, and nothing outside `.pharn/writes-scope.json`'s 37-entry scope
(`set-writes-scope.cjs --from-plan`, anchored by `reconcile-baseline.mjs --anchor --by pharn-dev-build`
immediately after):

- **Product floor** (`pharn/floor/`): `spec-template-core.mjs` (the `quick` kind, `TEST_FIRST_KINDS`,
  `QUICK_KIND`/`QUICK_MAX_ACS`/`QUICK_LEVELS`, rule 9, `specVerdict` made explicit), `check-spec.mjs` (the
  `--spec-kind` print mode), `check-ac-tests.mjs` (the `TEST_FIRST_KINDS` branch, three reworded messages),
  `check-test-stage.mjs` (one reworded message), `ac-gate-core.mjs` (one reworded message), `mark-phase.mjs`
  (`--mode`, `MARKER_MODES`, `QUICK_MODE`), `render-cost-ledger.mjs` (`normalizeMarkers` keeps `mode`),
  `ship-outcome-core.mjs` (`runMode`, `verdictStages`, `GATE2_QUICK`, the five-form `SHIP_DECISION_FORMS`,
  `deriveShipOutcome`'s quick branch), `render-run-report.mjs` (the `gate2-quick` preamble bullet, the quick
  regress line), `README.md` (the `--spec-kind` mode, one sentence).
- **pharn-contracts**: `spec-template.md` (the `quick` kind, rule 9, the sections decision, `--spec-kind`,
  the open-form rules table), `cost-ledger.md` (`markers[].mode`, `gate2-quick`, the quick applicability, the
  render note), `ac-tests.md` (the one sentence: a quick SPEC is TEMPLATED (0) and `TEST_FIRST_KINDS`
  throughout).
- **Product commands**: `pharn-ship.md` (the `## Quick mode` section, the Step-1/2/2b/2c/2d/3/3a deltas and
  pointers, the sweep edits, description, `reads:`, version `0.8.1` → `0.9.0`), `pharn-grill.md` (the
  `## --quick mode` section, description, version `0.1.0` → `0.2.0`), `pharn-spec.md` (`## --quick`, the fit
  checks, the Step-4 trade sentence, the "eight rules" → open-form correction, description, version `0.5.0`
  → `0.6.0`).
- **Product floor tests**: new/extended tests in `check-spec.test.mjs`, `check-ac-tests.test.mjs`,
  `check-test-stage.test.mjs`, `ac-gate-core.test.mjs`, `mark-phase.test.mjs`, `render-cost-ledger.test.mjs`,
  `check-cost-ledger.test.mjs`, `ship-outcome-core.test.mjs`, `render-run-report.test.mjs`.
- **Dev tests**: `.dev/floor/command-hygiene.test.mjs` (the `--mode` carve-out in `PHASE_MARKER_WIRING` and
  `ADOPTION`, the new `QUICK_MODE_WIRING` block with mutation controls).
- **Repo-meta**: `CLAUDE.md` (the spine paragraph, the `mark-phase` usage line, the ship-outcome and
  AC-tests comments), `README.md` (badge `6.23.0`, the paper-trail list, the `--quick` usage example, the
  `/pharn-ship` commands-table row, the token-cost bullet), `CHANGELOG.md` (`## [6.23.0]`), `SKILLS_VERSION`
  (`6.22.0` → `6.23.0`).
- **Dev artifacts (new)**: `handoff/make-patch.mjs` (the committed patch generator), `proposed/apply.sh`
  (pinned verbatim from PLAN.md §7), `proposed/APPLY.md`, `proposed/human-only.patch`,
  `proposed/human-only.sha256` — the last two are **Bash writes**, produced by running
  `handoff/make-patch.mjs` once, exactly as PLAN.md's Build procedure step 4 prescribes.

**Explicitly not touched** (PLAN.md, "Explicitly not touched by the agent"): `LIMITS.md`,
`pharn/ARCHITECTURE.md`, `pharn/CONSTITUTION.md`, `THREAT-MODEL.md`, `CODEOWNERS`,
`.claude/settings.json`, `.claude/settings.local.json`, the four hook scripts, `pharn.spec-template.md`,
`MIN_CLI`, `pharn/pharn-contracts/templates/spec-template.md`, every non-`pharn-ship`/`pharn-grill`/`pharn-spec`
product command, every `pharn-dev-*` command, and `pharn/floor/reconcile-ignore.json` /
`worktree-fingerprint.mjs` / `check-regress.mjs`.

## Format (Build procedure step 3)

Scoped `prettier --write` and `markdownlint-cli2 --no-globs --fix`, over the explicit list of paths this
build actually wrote (never the whole tree, never via `xargs`/pipe — L57), plus a read-only `eslint` pass:
all clean. Repo-wide confirmation, also clean: `npm run format:check`, `npm run lint:md`, `npm run lint`,
`npm run docs:check`, `npm run check:markers`, `npm run check:contributing`.

## The floor (Build procedure step 6)

```text
$ node pharn/floor/validate.mjs .
FLOOR: GREEN — 36 capabilities checked in "."

$ npm test
ℹ tests 3402
ℹ pass 3402
ℹ fail 0
```

No capability was added or touched, so the capability count is unchanged from `main` at `767bf61`. `npm test`
is the aggregate of the hook, product-floor and dev-floor suites (`.claude/hooks/*.test.cjs` +
`pharn/floor/*.test.mjs` + `.dev/floor/*.test.mjs`); 3402 is the live count at this HEAD (up from 3346 before
this increment — 56 new tests, +6 earlier-mutated pre-existing assertions corrected in place, see "Deviations"
below), read live per P6, never asserted from memory.

## The L37 probes — a quantified remedy, probed with a member expected to fail

Each run live, on this build's own HEAD, immediately before this record was written. Full transcripts are
not reproduced here (P2 — the tooling's own stdout is fixed, deterministic text, but the probes' scratch
fixtures are throwaway); the exit code and the first line of output are.

| #   | probe                                                                                                          | exit                | first line                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1a  | `check-spec.mjs --spec-kind` on a `feature` SPEC (no line)                                                     | 0                   | `feature`                                                                                                       |
| 1b  | `check-spec.mjs --spec-kind` on a `test-infra` SPEC                                                            | 0                   | `test-infra`                                                                                                    |
| 1c  | `check-spec.mjs --spec-kind` on a `quick` SPEC                                                                 | 0                   | `quick`                                                                                                         |
| 1d  | `check-spec.mjs --spec-kind` on a legacy SPEC (no `spec_template`)                                             | 0                   | `feature`                                                                                                       |
| 2   | `check-ac-tests.mjs` over a valid **quick** mapping                                                            | 0                   | `GREEN — 1 AC(s) mapped once each…`                                                                             |
| 3   | `check-ac-tests.mjs` over a **test-infra** SPEC with a mapping                                                 | 1                   | `RED — spec-kind: the SPEC is \`spec_kind: test-infra\`, a bootstrap increment: it gets no AC-TESTS.md mapping` |
| 4   | `mark-phase.mjs --name feat --kind run-start --mode fast`                                                      | 2                   | `mark-phase: --mode must be one of {quick}`                                                                     |
| 5   | `ship-outcome-core.mjs deriveShipOutcome`: quick run, verify `PASS`, a `regressions` report on disk            | n/a (function call) | `decision: "gate2-quick"` — the on-disk report is never read                                                    |
| 6   | `deriveShipOutcome`: full run, verify `PASS`, regress `no-regressions`, but **no** `pharn-regress` stage-start | n/a (function call) | `decision: "stop:pharn-verify"` — **never** `gate2`                                                             |
| 7   | `check-test-stage.mjs` on a READY **quick** world (mapping + lock + red run)                                   | 0                   | `READY test-first — the mapping holds and the lock records a red run over the pinned tests`                     |

Probes 1–4 and 7 ran the real CLI as a subprocess against scratch fixtures under a temp directory; probes 5–6
called `deriveShipOutcome` directly. All seven match PLAN.md's "Evals and tests to write" predictions exactly;
none needed a build fix. The same behaviors are additionally pinned as committed `node --test` cases in
`check-spec.test.mjs`, `check-ac-tests.test.mjs`, `check-test-stage.test.mjs` and `ship-outcome-core.test.mjs`
(a probe run once here and never again would prove nothing about the NEXT change — L60).

## The generator's `stage-exit` line and its refusal probes

```text
$ node .dev/features/ship-quick-mode/handoff/make-patch.mjs
stage-exit: absent
new ARCHITECTURE pin: 0e34408a42e23d4e5d7194728ad958ad1cf65efd6a9bf2c4d9318773bd4e3b27
```

`pharn/pharn-contracts/stage-exit.md` does not exist on this tree (the `stage-regress-script` sibling has not
merged), so the `§4` edit was **not** included — `human-only.patch` touches only `LIMITS.md §3a` and
`pharn/ARCHITECTURE.md §6`. `APPLY.md` records both pins (old `4950796f…`, new `0e34408a…`) and the
sibling re-pin obligation.

**Refusal probes (L60 — a check never seen failing proves nothing), one call of each with an input it must
refuse, against the generator's four exported checks:**

| check                    | bad input                                                                                 | result                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `applyOnce`              | a find string (`"X"`) present **twice** in `"aXbXc"`                                      | refused: `find string matched 2 time(s), expected exactly 1`                                  |
| `markerPreservationReds` | a registered marker (`"KEEP-ME"`) present in `before`, dropped from `after`               | refused: `… was present and is now absent — the edit must not move a registered marker`       |
| `checkFive`              | a text holding both `rule_id:` and `problem:` with **no** enum-gated/free-text vocabulary | refused: `holds both rule_id: and problem: but not the enum-gated/free-text split vocabulary` |
| `contractsCompleteness`  | a §4 name list missing a stem (`cost-ledger`) that is present on disk                     | refused: `missing=["cost-ledger"]`                                                            |
| the inline no-CR check   | `"line one\r\nline two"`                                                                  | detected (`.includes("\r")` is `true`)                                                        |

Each control (the same input corrected — one match, the marker kept, the split vocabulary present, the
complete list, an LF-only text) passed cleanly, confirming the refusals above are real and not a check that
fails on everything (L4).

## The proposed patch — generated, checked, and scratch-applied

`git apply --check` (inside the generator, against the real working tree) passed. Separately, as a second,
independent confirmation: the two trusted-doc files were copied into a throwaway scratch directory
(`.pharn/pharn-dev-build/scratch-apply-test/`, never a tracked path), `git apply --directory=<scratch>
proposed/human-only.patch` applied cleanly, `shasum -a 256 -c proposed/human-only.sha256` reported
`LIMITS.md: OK` and `pharn/ARCHITECTURE.md: OK` against the applied bytes, and the scratch directory was then
removed. Neither the generator nor this verification ever wrote `LIMITS.md` or `pharn/ARCHITECTURE.md` in
this worktree.

## Deviations from the plan

- **Two transcription slips in the generator's first draft, caught by running it, not by inspection**: the
  §6 `find` string was anchored on the wrong preceding word (`"SPEC. Shape and bounds:"` instead of the
  real `"every build. Shape and bounds:"`), and the first diff-header rewrite doubled the `a/`/`b/` prefix
  (git's own `--no-index` prefixing plus a manually-prepended one). Both were fixed in place before the
  generator ever produced a patch; neither reached `proposed/`.
- **Three pre-existing tests needed a one-line update, not a defect fix**: `ac-gate-core.test.mjs` and
  `check-ac-tests.test.mjs` each asserted the OLD literal wording of a message this plan intentionally
  reworded (`"spec_kind: feature"` / `"{feature, test-infra}"`); `ship-outcome-core.test.mjs`'s closure test
  asserted the OLD count of 4 `SHIP_DECISION_FORMS`. All three were updated to the plan's own stated new
  wording/count — never relaxed or removed — the moment `npm test` named them, before proceeding further.
- ~~Everything else matches the plan as amended after grill; no other deviation.~~ **Corrected at GATE 2
  (2026-09-26) — that line was false.** `/pharn-dev-review` found four things PLAN.md and GRILL.md promised
  that this build did not deliver: the ★ WIRING test that executes the committed quick run-start line into
  `gate2-quick` with the full line as its control (PLAN "Evals", Outcome); the quick Step-2b applicability
  cases; the CHANGELOG rollback sentence GRILL G11 marked FIXED; and `mode: full` / `ship-record.json`'s
  `mode` in full-mode Step 3/3b (Decision 9 lived only in a parenthetical inside `## Quick mode`). All four
  were built by the GATE-2 review-fix pass; see "GATE 2 — review fixes" below. A fifth, found while correcting
  this line and **not** built: PLAN.md's Build procedure step 7 says this file records the structural call
  counts re-derived on the build's HEAD, and it does not. They remain PLAN.md's figures at `767bf61`
  (`/pharn-ship` 42 full → 33 quick), unre-counted; the GATE-2 scope check (review F3) adds one call to a
  quick run's happy path (and one more inside Step 2b), so `/pharn-ship`'s own saving is 8 net, not 9.

## GATE 2 — review fixes (2026-09-26)

Stage model: opus — set by the maintainer's instruction, overriding pharn.config.json's sonnet for
build/regress/verify; routed via Agent subagent; effort not routed. Built from `PLAN.md`'s "Amended at GATE 2
(review fixes)" section, in a fresh worktree fast-forwarded to `2071a97`, with the setter re-run from the
amended plan and the reconcile baseline anchored `--by ship-quick-mode-opus-fixes`, then amended
(`--amend-scope`) when `.claude/commands/pharn-verify.md` joined `## Files`.

- **F1** — `ship-outcome-core.mjs` `verdictApplicability`: conditions (a) ORDER and (b) NO REPEAT. Seven
  existing fixtures modelled a compliant run with no `pharn-build` stage-start before its verdict stages
  (`ship-outcome-core`, `render-cost-ledger`, `render-run-report`, `check-cost-ledger` suites); each gained the
  build marker a real run writes, and the "★ RESIDUAL, PINNED" test keeps pinning its residual on that trail.
  New tests: the reviewer's repro (→ `undetermined`), (a) alone, (b) per stage with the verdict-stage controls,
  a 22-shape enumeration of earlier runs under a skipped quick run-start (all `undetermined`/`stop:*`, each
  with a `gate2-quick` control), the named residual, quick Step 2b, and the ★ WIRING test. Mutation-probed
  (L60): removing (b) reds the repro, (b) and enumeration tests; removing (a)'s order or its build requirement
  reds the (a) and Step-2b tests.
- **F2** — the first-token rule is labelled ADVISORY with its floor backstop and bound (`pharn-ship.md`,
  `pharn-spec.md`, `pharn-grill.md`, README, CHANGELOG); a guarantee-audit bullet added.
- **F3** — `## Quick mode` item 7 keeps `check-regress.mjs scope` (Step 2b re-runs it); items renumbered;
  named KEPT in the trade text and `SHIP.md`. A ★ hygiene test plants a stray before the anchor and runs the
  committed line.
- **Advisory** — stale-artifact labelling (`SHIP.md` + the renderer's `## Briefing`); the `spec_template`
  residual; the wording items; `make-patch.mjs` checks on stdin before writing; `apply.sh`'s message.
- The regenerated patch's sums and new ARCHITECTURE pin are recorded in `proposed/APPLY.md` and `VERIFY.md`.

## Open issues for `/pharn-dev-regress` and `/pharn-dev-verify`

None known. `npm test` is green at 3402/3402, `validate.mjs` is GREEN, and every repo-wide gate
(`format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`,
`check:contributing`) passed during this build. The human-only patch is intentionally **not** applied on
this branch (Q1 → (a): GATE 2, after `/pharn-dev-verify`), so `/pharn-dev-regress` and `/pharn-dev-verify`
run — and are designed to pass — against the **unpatched** `LIMITS.md` / `pharn/ARCHITECTURE.md`.
