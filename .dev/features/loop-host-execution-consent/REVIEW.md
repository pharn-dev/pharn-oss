# REVIEW — loop-host-execution-consent (Linear CORE-397)

Floor first: `node pharn/floor/validate.mjs .` GREEN (37 capabilities), at build and in every verify run. Verify
PASS (run 4, after the nit fix), regress `no-regressions` (run 4). Everything below is **advisory**.

## Re-review after GATE 2 "fix review nits first"

Both findings below are resolved:

- **P0 label (`pharn-loop.md:396`)**: fixed. Step 1a now reads "… after a refusal or a non-zero exit (ADVISORY: nothing
  checks that a run obeys this)." The ✧ 7.26.1 pins still match, since the label sits after the pinned sentence. The
  command is 88,082 bytes under its 91,136 ceiling.
- **LIMITS.md sentence (`CHANGELOG.md:30`)**: landed. The human applied the patch script after verify run 4 PASS. The
  bytes equal the copy tested on a scratch tree (`cmp`), and `pharn-install.json` was regenerated (`docs:check` GREEN,
  65 install-manifest tests pass). An earlier application had landed inside the anchor→verify window and reddened
  verify run 3's `reconcile` (L68). It was reverted and re-applied; `VERIFY.md` § History has the record.

Re-reviewed the added Step 1a words and the LIMITS.md §6 sentence. The LIMITS text keeps the command's quantifiers
("where Claude Code shows one", "at most one", "that run only", L64) and claims nothing as a guarantee. No new
finding.

Reviewed: `git diff` of `.claude/commands/pharn-loop.md` (Step 1a isolation paragraph, S15 row),
`.claude/commands/pharn-loop-close.md` (Step 7 isolation bullet), the new ✧ 7.26.1 test in
`.dev/floor/command-hygiene.test.mjs`, the CHANGELOG 7.26.1 entry, and the version bump.

## Floor-gate findings

None. No guarantee is claimed without a floor reduction or an advisory label. No capability, `rule_id` or eval binding
changed, and no sibling reference was added.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-loop.md:396"
  problem: "The new rule (at most one isolation line, never retried) carries no ADVISORY label in its own paragraph; the label lives in Step 1's flag paragraph, so a reader of Step 1a alone could read it as enforced."
  evidence: "A run runs at most one of the two lines, once: never the second after the first, never either again after a refusal or a non-zero exit."
```

Nothing checks that a run obeys the sentence. The ✧ test pins the text, and the CHANGELOG says "That a run obeys it is
advisory". Adding the label in Step 1a would cost about 15 bytes of the 3,103 left under `pharn-loop.md`'s ceiling.
It is optional.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:30"
  problem: "The issue's done-when names pharn/LIMITS.md, which this change cannot write; until the human edit lands, the shipped product says which consent counts only in the command, not in the limits doc."
  evidence: "The matching sentence in `pharn/LIMITS.md §6` is a human edit made after this change's verify."
```

The sentence is in `PLAN.md`, under "Human-only edit". Per L68 it lands after verify, committed, followed by an
`npm run docs:generate` so that `pharn-install.json` carries its new sha256.

### L-eval → P1

No capability changed, so there is no eval. The ✧ 7.26.1 test has one negative control per asserted property (L60):
a dropped which-consent sentence, a dropped once-rule, a dropped S15 trigger, and a summary that names a person. Each
control is asserted caught, and each removal is checked as found first. The 7.3.0 test, which keeps the flagged line
ungranted, is unchanged and still passes.

### L-trust → P2

No new input. The distinction "the prompt was refused" vs "the check refused" rests on the model seeing a denied tool
result. That feeds only an advisory screen line, and no guaranteed decision rests on it. Grill's attribution finding
is resolved: the wording names Claude Code's permission settings, never a person. No instruction-looking content in
the reviewed diff affected this review.

### L-axis → P3

One axis per file: the loop command (the rule), the close part (the summary) and the test (the pin). The quick part
needed no edit, because Step 1a runs unchanged under `--quick` and its entry grammar is untouched.

## Verdict

GREEN — 0 floor findings, 2 minor advisory findings, both resolved in the re-review.

## Lesson candidate (proposed, not canon)

- **Not a candidate:** the `lint` RED from the ship's own scratch runner under git-ignored `pharn/.run/` (verify run
  1). That recurs **L61**'s class (a git-ignored path is still in a whole-repo linter's reach, here eslint), whose
  remedy is in canon.
- **Candidate:** **L68 recurred despite its remedy being followed.** The PLAN said WHEN ("before build Step 0 or after
  verify"), and the human was told at GATE 1. But the patch script was handed over while regress and verify were
  still to run, and it was run at once. Verify run 3's `reconcile` turned red on the human's correct edit, and the
  repair cost a revert, a second regress and a fourth verify. L68's remedy is an instruction to people, so it recurs.
  A mechanism would close it: a human-only patch script refuses unless the feature's `verify-report.json` reads
  `PASS` and the tree still matches its stamp, or the script is not handed over until verify passes. Source: this
  `VERIFY.md` § History (run 3) and `REGRESSION.md` § History (runs 2–3).
