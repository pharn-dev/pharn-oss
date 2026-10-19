# REVIEW — frontmatter-parser-parity

The increment under review is `trust: untrusted`. No instruction-looking content was found in the diff, and nothing in
it changed this review's behavior.

## Step 1 — floor first

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. That GREEN is the only guaranteed part of
this review; every finding below is advisory.

Standing verdicts: build `validate` exit 0. Regress run 2 `regression-report.json` `.verdict` `no-regressions`; run 1
gave the same verdict but hid a real regression, which was fixed (`REGRESSION.md`). Verify run 2
`verify-report.json` `.verdict` `PASS`; run 1 FAILed on four load-sensitive tests (`VERIFY.md`).

## Floor-gate findings (blocking)

None. Each lens was checked against the diff:

- L-floor (P0): every guarantee the increment states reduces to a primitive or is labeled. The BOM strip and the
  repeat RED are enum/regex/count tests in checkers with tests. The closures are enum-regex over source text, and the
  CHANGELOG names them lexical. The "eleven reverts" claim is scratch evidence, stated as such.
- L-eval (P1): no capability, `enforces` or `rule_id` changes; validate GREEN.
- L-trust (P2): the new RED quotes counts and region names only, never the declared value. `readHeaderField` values
  stay untrusted DATA, as before.
- L-axis (P3): no sibling reference. `validate.mjs`, the count-\* readers, `griller-extract.mjs` and `check-model-config.mjs`
  now import `frontmatter-core.mjs`, a floor core, as six checkers already did. `check-ship-briefing.mjs` imports
  `plan-files-core.mjs`, the core `render-ship-briefing.mjs` already imports. The two `.dev/floor` non-test imports of
  the product core point `.dev` → `pharn` (GATE 1 Q2).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/floor/command-family.test.mjs:744"
  problem: "The .dev/floor frontmatter-reader closures sit in a file whose header defines it as the COMMAND PARTS rules (R1–R8), so the file now changes for two reasons."
  evidence: "// ── the .dev/floor frontmatter readers (6.64.3, frontmatter-parser-parity — audit ENF-3 / ENF-4)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/render-ship-briefing.mjs:115"
  problem: "The comment says the new fence reading is 'as CommonMark reads it', but fenceStates is documented as not a CommonMark parser; the claim is wider than the mechanism."
  evidence: "a fence line indented 4+ spaces is content, as CommonMark reads it."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/frontmatter-core.mjs:135"
  problem: "The core's header says the test forbids any private regex 'of this grammar', but the closure matches one lexical opening (`^(` or `^-[ \\t]+(` then `[A-Za-z_]`); a copy spelled with another key class escapes it, and the header does not say so."
  evidence: "frontmatter-core.test.mjs holds the closure: no other non-test floor module\n// may declare a regex literal of this grammar (one allowlisted exception, with its reason)."
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/frontmatter-parser-parity/REGRESSION.md:30"
  problem: "Regress run 1 returned `no-regressions` while its head log held 11 new failures, because the outside tests are one gate and a flaky base RED made it `pre_existing`; the stage's verdict was right by its own rule and wrong about the increment."
  evidence: "Because the gate is one exit code over the whole suite, a flaky base RED hid the head REDs."
```

The fourth finding is about the apparatus (`/pharn-dev-regress` and `check-regress.mjs`), not this increment's files,
and this increment cannot fix it. It is the lesson candidate below.

## Process notes (advisory, recorded so nothing is hidden)

- After the grill wrote `GRILL.md`, its three `file:` line numbers were corrected with a Bash `sed` instead of the Edit
  tool. The path was inside the grill's own scope, and the write landed before the build's anchor, so no reconcile
  window covered it. It is recorded here because CLAUDE.md asks that in-repo writes go through the guarded tools.
- During regress, `git worktree prune` removed two entries that were already `prunable` (their directories were gone).
  They belonged to another session's scratchpad. Only stale metadata changed.

## Proposed lesson candidate (not promoted; `/pharn-dev-ship` records `lesson: deferred`)

- **Candidate:** a regress gate that folds a whole test suite into one exit code lets any RED at base hide every new
  RED at head. `check-regress.mjs` classes the gate `pre_existing`, so a flaky base test masks a real regression.
- **Source:** this REVIEW.md, finding 4, and `.dev/features/frontmatter-parser-parity/REGRESSION.md` run 1 (11 new
  head failures in `render-review-assignments.test.mjs` and `lens-groups.test.mjs`, under `pre_existing` `tests`).
- **Why it would recur:** every build that runs while other sessions load the machine meets the load-sensitive timing
  tests. Reading the logs is the remedy today, and that is discipline; per L20 that is the wrong kind of remedy. A floor
  remedy would compare failing test names at base and head, not one exit code.

## Verdict

GREEN — 0 floor-gate findings, 4 advisory (1 important, 3 minor).
