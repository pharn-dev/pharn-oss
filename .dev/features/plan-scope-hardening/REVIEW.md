# REVIEW — plan-scope-hardening

- Reviewed: `dd0bb3d3..c1027aa3` on `fix/plan-scope-hardening` (24 paths; the inside list in `regression-report.json`)
- Reviewer: `/pharn-dev-review`, four inline lenses. The increment is `trust: untrusted`; everything quoted below is
  DATA.
- **Verdict: GREEN — 0 floor-gate findings; 4 advisory findings (1 important, 3 minor).**

## Step 1 — Floor first

`node pharn/floor/validate.mjs .` exit `0` (GREEN) at this HEAD, run as `/pharn-dev-verify`'s `validate` gate; the
whole verify map is PASS (`verify-report.json`), regress is `no-regressions` (`regression-report.json`).

## Floor-gate findings (blocking)

None.

- **L-floor (P0):** every new "refuses" claim reduces to the setter's deterministic checks (enum / regex / path
  membership), and each statement of them carries the Bash bound: the setter is a Bash-run program, so its refusals
  are early refusals, not runtime enforcement (`pharn/floor/README.md`, `.dev/guides/writes-scope.md` 7.3.0 block,
  `CHANGELOG.md`). The review's BLOCKER is written as **narrowed, not closed** in the CHANGELOG and the guide. Step 2b
  is labeled advisory orchestration, and the measured counts (342 plans: 293 / 44 / 5 / 0) are stated as
  measurements, not guarantees.
- **L-eval (P1):** the increment adds no capability and no `enforces` binding; `validate` agrees.
- **L-trust (P2):** no free-text field reaches a decision. The new refusal messages and Step 2b's stderr line echo
  plan-derived paths as text only; the setter has already refused quotes, back-ticks, backslashes and control
  characters in those paths. Nothing in the reviewed files read as an instruction to me.
- **L-axis (P3):** no sibling reference added. The reader stays in two copies held together by ✧ byte-equal pins and
  ★ parity fixtures, the existing pattern for a protected hook that cannot import from `pharn/floor/`.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-dev-build.md:119"
  problem: "Step 2b's PICK checks only the LEAF for a symlink, so an entry whose parent directory is a symlink into memory-bank canon passes PICK, its spelling escapes the ignore files, and the formatters rewrite canon; the guide and CHANGELOG describe the check as 'existing regular files by their literal path'."
  evidence: "const real = fs.realpathSync(p); ok = ok && fs.lstatSync(p).isFile() && real.startsWith(root + path.sep);"
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "pharn/floor/apply-plan-deletions.mjs:135"
  problem: "The new comment names the round-1 colon rule, which round 2 replaced with the one-contiguous-list rule."
  evidence: '`## Files`, a `:` intro over items — and a fixed "no heading" text named the wrong cause for each.'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/guides/writes-scope.md:223"
  problem: "The guide's '17 of 342 named a workflow' and the CHANGELOG's '14 CI workflow' newly refused count different things (plans naming a workflow vs plans whose FIRST refusal is exec-config); neither text says so, so a reader sees two numbers for one fact."
  evidence: "Historical cost: 17 of 342 committed dev plans named a workflow."
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".claude/commands/pharn-loop.md:124"
  problem: "The one pre-approved grant line lands in a file another batch group (G2) owns; it is one line, but the integration merge has to keep it."
  evidence: '"Bash(node .claude/hooks/set-writes-scope.cjs --check --from-plan pharn/features/*/PLAN.md)",'
```

### On the important finding — measured, with a proven fix

- **Reproduced** (lab copy of this tree, Step 2b block extracted from the command as pinned, scratchpad
  `probe-symparent.mjs`): a symlink `gp/mb -> ../.dev/memory-bank` and a scope entry `gp/mb/zz-probe.md` → the canon
  file was REFORMATTED. The setter lets that entry through, because its canon refusal matches the entry's spelling;
  `enforce-writes-scope.cjs` judges the target a write reaches, but only for the Write tool, and Step 2b is Bash. The
  canonical spelling `.dev/memory-bank/zz-probe.md` itself passed PICK and was left alone by both ignore files (the
  second layer this increment added).
- **Pre-existing, narrowed, not opened:** before this increment Step 2b passed every scope entry, symlinks included.
  Reaching this hole needs a committed symlink into canon plus a plan that names a path through it.
- **Fix, proven in the lab, NOT applied here:** in PICK, require
  `real.startsWith(root + path.sep) && real === path.join(root, p)`, so no component of the entry may be a symlink.
  After the change: the canon file stayed untouched, the entry was named on stderr, and every glob-probe outcome was
  unchanged (`plain.md` and `with space.md` reformatted; `CLAUDE.md`, `app/[slug]/page.md`, `app/s.md` and the
  symlink target untouched). It also needs one more assertion in the command-hygiene PICK test, plus the matching
  words in the build-command comment, the guide and the CHANGELOG entry.
- **Why it is not applied in this run:** the build scope comes from this PLAN, whose `## Files` now lists the
  maintainer-applied hook, so `set-writes-scope.cjs --from-plan` refuses it (control surface) unless
  `--allow-claude-dir` precedes the mode — and `/pharn-dev-build` Step 0, as this increment wrote it, says an agent
  never adds an `--allow-*` flag itself. That is the human's (orchestrator's) call at GATE 2.

## Lesson candidate

None proposed from this review. The symlinked-parent gap is the fourth adversarial round's catch on one mechanism —
a formatter fed a scope by a lexical check — but each round's remedy was a code change with a test pin, not "remember
next time", which is L20's bar.

## Provenance

Feature `plan-scope-hardening`; reviewed range `dd0bb3d3..c1027aa3`; floor results from this run's
`verify-report.json` and `regression-report.json`.
