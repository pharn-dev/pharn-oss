# REVIEW — stage-load-budget

Reviewed: this branch at `e401ac0` against `origin/main` `791d205` (11 files, +1022/−1). The increment is treated as
`trust: untrusted`; no content in it read as an instruction to the reviewer.

**Floor first (Step 1):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The standing
verdicts: build floor exit 0; regress `no-regressions`; verify `PASS` (7 gates, `reconcile` `CLEAN`).

**Verdict: GREEN — 0 floor-gate findings; 4 advisory findings (1 at blocking severity, judgment only).**

## Floor-gate findings (blocking, content-checkable)

None. No guarantee is claimed without a floor reduction or an `advisory`/bound label, no capability or `enforces`
binding is added (validate agrees), and no sibling reference is introduced (a `.dev/` test importing
`pharn/floor/stage-agent-core.mjs` and spawning the shipped counters is the allowed dev → product direction).

## Advisory findings (judgment — they inform; none is the basis of a guaranteed block)

```yaml
- type: FINDING
  rule_id: P3
  severity: blocking
  file: ".dev/floor/stage-load-budget.test.mjs:487"
  problem: "The file has two reasons to change: the stage load budget (L1–L6, which moves with commands, contracts, grillers and lenses) and the instruction-growth CI wiring (W1–W3, which moves with ci.yml and package.json). P3 says two reasons → two files."
  evidence: 'test("✧ W1: package.json carries check:instruction-growth, and keeps it OUT of `npm run check` (it needs a base)"'

- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:48"
  problem: "The entry says every failure names the row to add or the ceiling to raise; only L1, L3, L4 and L5 do. L2 names the row but no remedy, and W1–W3 are plain assertions."
  evidence: "Every failure names the row to add or the ceiling to raise."

- type: FINDING
  rule_id: P0
  severity: minor
  file: "CONTRIBUTING.md:76"
  problem: "The new section says the CI step has 'the same CI bounds as the per-PR CHANGELOG check' and lists three in parentheses; that section lists four, and the omitted one (it judges the test merge commit as of the PR's last CI run, and main can move before the merge) applies here too."
  evidence: "It is also subject to the same CI bounds as the per-PR CHANGELOG check below (no direct pushes, admin merges, the PR's own copy of the checker)."

- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/floor/stage-load-budget.test.mjs:408"
  problem: "The 'each path counts once' property is asserted on JavaScript's Set, not on loadSet: a loadSet rewritten to an array would double-count /pharn-ship's Constitution and /pharn-spec's entries and still pass (147,718 + 7,958 < 162,816). The direction is an over-count (safe), so this is a weak control, not a hole."
  evidence: 'total(new Set(["a", "a", "b"]), (p) => (p === "a" ? 10 : 1)),'
```

### Notes behind the findings

- **P3 (the one at blocking severity).** The plan approved at GATE 1 put W1–W3 in this file on purpose (L45: pin an
  invoker beside what it tests). The precedent it follows, `check-changelog-entry.test.mjs`, pins the invokers of
  **its own** checker. Here W1–W3 pin the invokers of `check-instruction-files.mjs`, a different checker. The severity
  is a judgment: nothing on the floor detects a file's change-reasons. **Recommended fix before the PR:** move W1–W3,
  `ciStepBlock` and the five `GROWTH_*`/`CI_*` constants into `.dev/floor/instruction-growth-wiring.test.mjs` unchanged,
  and point the `floor-gates.md` and test-header cites at it. That is a plan amendment adding one `## Files` path. Under
  6.54.0 a path added after the anchor reconciles as `plan-widened-after-anchor`, so the fix needs a re-anchored build
  pass (`/pharn-dev-ship` fix loop: build → regress → verify), not a quiet edit.
- **What was checked and holds.**
  - **L-floor (P0).** The test header separates FLOOR (byte totals over the table's classification, closure, anchors,
    the regex closure) from NOT-guaranteed. Not guaranteed: what a model reads, growth inside the headroom, repetition
    across contexts, L5's blind phrasings, and that W3 runs the `node` line only. `CONTRIBUTING.md`,
    `.dev/guides/product-commands.md`, `.dev/guides/floor-gates.md` and the CHANGELOG entry carry the same bounds
    (except the two minors above). The CI step's comment names it a verdict over the loader model (`LIMITS.md §3e`).
    The GRILL's four minor concerns are discharged: the fetch line is stated as pinned-not-run, the headroom bound is
    in the header, guide and CHANGELOG, parts come only from `command-family.mjs` `allParts`, and `READ_RE` is pinned
    with a control per verb and per fold.
  - **L-eval (P1).** No capability, so `validate`'s binding rule has nothing new. Each rule carries its own control.
    In a scratch mutation run during the build (13 mutants, each put back in a copy of the test), every mutant turned
    its rule red: closure (extra row; empty disk — this one initially passed and the control was fixed), existence
    (missing file; empty membership), anchor, budget (never failing; real ceiling too low), READ_RE (verb `follow`
    dropped; blockquote fold dropped; project-artifact exemption dropped; a real table row removed), inline derivation,
    and the W2 block slicer. The minor P1 finding above is the one property without a real control.
  - **L-trust (P2).** The test reads PHARN's own files as data (bytes, substrings, regex). The CI step interpolates no
    `${{ }}` into `run:` (pinned by W2) and reads a contributor's `CLAUDE.md` only through the checker's data-only
    parser. No guaranteed decision rests on free text.
  - **L-axis (P3).** Apart from the finding above: one new file, no product file references `.dev/`, and no sibling
    reference.

## Proposed lesson candidate (not written to canon — `/pharn-dev-memory-promote` is a separate, human-gated run)

- **Candidate:** _A pinned shell procedure the execution environment refuses becomes a prose procedure again — each
  run re-implements it, and the re-implementations diverge (L22 recurring through worktree isolation)._ In this run
  the isolated worktree refused `/pharn-dev-regress`'s and `/pharn-dev-verify`'s pinned `$(…)` / `xargs` / `$?` forms
  and `/pharn-dev-build` Step 2b's. Each was rewritten as an ad-hoc node runner. The regress runner crashed: it read
  `check-regress.mjs scope`'s `outside_eval_pairs` as `EXPECTED::ACTUAL` strings (the shape the pinned command line
  passes in) when the JSON returns `{expected, actual}` objects. It cost a full baseline-suite run and left a stale
  worktree. The remedy shape L22 names (remove the choice) would be a shipped runner per stage, not a prose
  instruction to write one.
- **type / concepts:** tooling · [command-prescription, shell-portability, lesson-recurrence, worktree-isolation]
- **Provenance:** feature `stage-load-budget`; source `.dev/features/stage-load-budget/REGRESSION.md` (orchestration
  note); the runner forms are recorded in REGRESSION.md and VERIFY.md.
- **Bar (L20):** a recurrence. The user's auto-memory already records the refused-forms workaround from earlier
  sessions, and this run shows its failure mode. Whether that clears the bar is the human's call.
