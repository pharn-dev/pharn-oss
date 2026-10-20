# REVIEW — hook-hardening-batch

- reviewed: the build of `.dev/features/hook-hardening-batch/PLAN.md` — `apply.py` (its 24 replacements read as the
  patched files they produce, in a disposable worktree), the three hook test files, the restatements, and
  `CHANGELOG.md` `[6.69.0]`. The increment is `trust: untrusted` to this review.
- floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`, exit 0.
- independent pass: a read-only adversarial subagent probed the patched hooks and setter, with git itself as the oracle,
  in two rounds. Round 1 found 11 items. Round 2, on the fix delta, found 3: one regression introduced by a round-1 fix,
  and two narrow items. Every fail-open it reproduced was fixed and is now pinned by a test (BUILD.md, "Decisions"). Its
  reports are model output, used here as DATA: each claim was re-run before it was acted on.

**Verdict: GREEN — 0 floor-gate findings, 6 advisory.** The one that changes what happens next is A1, the order of the
human apply.

## Floor-gate findings (blocking)

None.

- **L-floor (P0).** The new guarantees reduce to floor operations:
  - the hooks' deny on empty or unreadable stdin is a hook exit, tested;
  - the handler's deny on an uncaught exception is a hook exit, tested and pinned;
  - the setter's refusal is enum/regex membership in a Bash-run program, labelled so in the header, LIMITS §6 and
    THREAT-MODEL item 10;
  - `apply.py`'s drift refusal is a content hash.

  Every prose sentence with a quantifier was probed against the patched code or the cited measurement file (BUILD.md;
  round 2 re-checked §3b, §3g, §6, §7, item 8, item 10 and the §3 row).

- **L-eval (P1).** No capability changed, and validate is GREEN. The hook suites are the specification: 37 new or
  changed tests are RED before the apply and GREEN after.
- **L-trust (P2).** Git config values are read as data and only ADD to the refused set. No config value and no file
  content reaches a message; a refusal prints file paths and plan entries, as the existing refusals do. No
  instruction-like text was found in the reviewed files.
- **L-axis (P3).** No sibling reference. See A5 for the one axis note.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/hook-hardening-batch/PLAN.md:77"
  problem: "Committing the human-applied files inside this build's open reconcile epoch would read as an escape at /pharn-dev-verify (a commit the build makes itself is not `merged`, and protect denies all five paths), so 'commit, then regress and verify' needs a fresh epoch."
  evidence: "Order (L68). Tests + script + records are built and reviewed by `/pharn-dev-review` first; then STOP."
```

**A1 — proposed route (L68), for the orchestrator to decide:**

1. The maintainer runs the script.
2. The agent commits the five files and the script's deletion as one commit.
3. A fresh epoch opens over the committed tree: `/pharn-dev-build` Step 0, the setter and then `--anchor`, before any
   further write.
4. `/pharn-dev-regress` and `/pharn-dev-verify` run in that epoch.

This is not absorbing an uncommitted write: the human edit is committed and reviewable in the PR diff before the new
anchor. A verify run in the current epoch would report the five paths as escapes.

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".claude/hooks/set-writes-scope.cjs (patched; apply.py SETTER edit 8)"
  problem: "A non-root core.hooksPath reserves its whole subtree, and `hooksPath = .` reserves every top-level entry, so a plan in such a repository is over-refused."
  evidence: "round 1, finding 10: `hooksPath = scripts` refuses `scripts/build/x.js`; kept and stated in CHANGELOG [6.69.0]"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/hooks/set-writes-scope.cjs (patched; apply.py SETTER edit 8)"
  problem: "The repository walk follows git's rules only approximately: GIT_CEILING_DIRECTORIES and filesystem boundaries are not honored, a `.git` file is followed without git's validity checks, and include/includeIf and -c or environment configuration are not read."
  evidence: "stated in the setter header, LIMITS §6 and CHANGELOG [6.69.0]; each gap either over-refuses or is named"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/hook-hardening-batch/apply.py:728"
  problem: "The §9 slot states group G's 6.68.0 behaviour; `apply.py` checks G's presence by two strings (a `## [6.68.0]` CHANGELOG heading and `other_gates` in test-infra-core.mjs), which is a proxy for G's code, not proof of it."
  evidence: "has_g_section and has_g_code in main()"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".claude/hooks/set-writes-scope.cjs (patched)"
  problem: "The setter now also parses git configuration, a second kind of reading beside the plan parser; it stays in one file because a shared module would be a new control-surface file (the reason the setter already gives for its toKey()/isReserved() copies)."
  evidence: "readHooksPathValues(), hooksPathValues(), configValue(), realPathOf(), execConfigDirKeys()"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/hook-hardening-batch/apply.py:666"
  problem: "Every BEFORE hash pins the 6.67.1 bytes of the five targets; a batch PR that touches any of them before the apply makes the script refuse, and it must be re-pinned and re-measured (fail-closed, by design)."
  evidence: "TARGETS[*][2]"
```

## Proposed lesson candidate (not promoted; the batch defers canon)

A fix to a parser modelled on an external tool's syntax can open a new bypass. Round 1 asked for lone-CR line ends to be
honored. The fix split lines on a lone `\r`, which git treats as a blank, and that let a crafted config move a key out
of `[core]` (round 2, finding 1). Remedy: when changing a reader that mirrors an external tool's grammar, check the
change against the tool itself, not against the finding's wording. Provenance: this increment's REVIEW (rounds 1–2).
Candidate neighbours: L55, L67 and L74.
