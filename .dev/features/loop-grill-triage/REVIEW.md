# REVIEW — loop-grill-triage

**Verdict: GREEN — 0 floor-gate findings, 4 advisory.** The increment is reviewed as `trust: untrusted`; nothing in it
read as an instruction to the reviewer.

- **Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Regress
  `no-regressions` (`REGRESSION.md`), verify `PASS` on all seven gates (`VERIFY.md`). Those verdicts are the floor;
  everything below is advisory.

## Floor-gate findings

None.

## Advisory findings

**Outcome (maintainer: "Fix all four"):** every finding below is **FIXED**, and verify was re-run over the final tree
(PASS, stamp `0db23173…`):

- **A1 FIXED** — `.dev/floor/command-hygiene.test.mjs`, "LOOP GRILL + TRIAGE (L65)": `pharn-triage.md`'s `writes:` must
  be exactly `["pharn/features/<name>/grill-triage.json"]`, with three negative controls (widened, emptied, removed).
- **A2 FIXED** — the close part's summary line now requires a triage read that exited `0`, `3` or `4`; any other exit
  adds nothing.
- **A3 FIXED** — the CHANGELOG states the routed grill's measured 229–284 s and says the triage agent's time is not
  measured yet.
- **A4 FIXED** — `pharn/floor/regular-file.mjs` is the one reader both grill CLIs call; `check-loop-record.mjs` keeps
  its witness reader, whose contract differs (named in the new module's header). This added two paths to `## Files`
  after a `CLEAN` reconcile and a re-anchor (`VERIFY.md`).

The findings as raised, kept for the record:

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/loop-grill-triage/PLAN.md:371"
  problem: "The plan promised a hygiene pin that pharn-triage.md's writes: is exactly grill-triage.json (its L65 line), and no test was written: the rule that the triage stage can never write grill-findings.json, the record it is checked against, rests on the frontmatter alone, so an edit widening writes: would pass every test."
  evidence: "`pharn-triage.md` `writes:` is exactly `grill-triage.json` (L65)"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop-close.md:279"
  problem: "The summary line 'Every grill finding was given a disposition by the triage model' is conditioned on a full run that 'reached the triage read', which includes a triage read that exited 1 or 2 (S9) — a run where the dispositions were refused or never written."
  evidence: 'A full run that reached the triage read adds (7.7.0): _"Every grill finding was given a disposition by the triage model'
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:57"
  problem: "'A full run's front is about nine minutes longer' adds an unmeasured triage estimate (~200 s, the plan's guess) to the measured grill times without saying which part is measured."
  evidence: "A full run's front is about nine minutes longer (a routed grill took 229–284 s in the measurement, against 8.5 s for the floor-only grill)."
```

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/grill-triage.mjs:40"
  problem: "readInput is a third copy of the one-descriptor O_NOFOLLOW reader (grill-findings.mjs:49, check-loop-record.mjs's witness read), differing only in returning bytes; a fix to one copy does not reach the others (L35)."
  evidence: "function readInput(path, label) {"
```

## By lens

- **L-floor (P0).** Every guarantee the increment claims reduces to a primitive or is labeled: the triage verdict, the
  id alignment, the disposition enum and the `blocking` rule are enum/regex in `grill-triage.mjs`; the binding is a
  content-hash the checker recomputes; `/pharn-triage` writing one file is the fix #7 hook. The contract and the command's
  claims block label every disposition advisory and name agreement-not-truth (L43). Two minor overstatements above.
- **L-eval (P1).** No capability, so no eval pair; the checker has 15 tests including the escalation branch on a
  realistic findings file (L84) and the zero-findings and empty-triage cases (L34). One promised pin is missing (A1).
- **L-trust (P2).** The triage reads the grill's free text and the plan as untrusted DATA (its trusted-prefix fence);
  the checker never reads or prints a `reason`; the loop copies only the verdict and the regex-gated ids into
  `### next_steps` and points at the file for reasons. The residual — an injected finding steering a disposition toward
  `proceed` — is named in the contract, the command and `THREAT-MODEL.md §5` channel (6).
- **L-axis (P3).** `grill-triage-core.mjs` imports `repeatedKeyCount` and the CLI imports `validate` from
  `grill-findings-core.mjs` (the same floor layer, one shape owner each); the contract is its own file, separate from
  `finding-shape.md`. One duplication (A4).

## Process notes (stated, not findings)

- The build moved to its own worktree mid-run after the main checkout was switched to `main` from outside this session;
  the epoch was re-anchored twice, each time after a `CLEAN` reconcile (`VERIFY.md`).
- Regress first went RED on two `entry-gates.test.mjs` pins anchored on a removed loop line; the plan's probe could not
  see text pins (`REGRESSION.md`).

## Lesson candidate

None proposed. The one recurring failure — a removed command line still pinned by a test outside the plan — is
`.dev/memory-bank/lessons-learned.md` L72's shape (a caller of a changed literal outside the plan), already canon; by
L20 a further recurrence would be the trigger for a floor remedy (for example, a check that every exact command line a
test pins exists in the command files).
