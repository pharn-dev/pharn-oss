# GRILL — loop-autonomous

**Plan:** `.dev/features/loop-autonomous/PLAN.md` · **spec-hash:** MATCH
(`83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487`) · **Step 1b lessons declaration
(FLOOR):** GREEN, exit 0 — `applied_lessons: L1, L7, L8, L19, L21, L22, L29, L33, L34, L36, L37, L38`; all 12
cited ids resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. That covers
the **declaration**, never that the lessons were applied (P0).

**Grillers run:** 13, the set `pharn/floor/count-grillers.mjs .` printed this run (`registered: 13`). Each
griller's procedure was applied by a subagent over the plan and reported back here; the inline Step-2 axes
were interrogated directly. Every `problem` / `evidence` below quotes or paraphrases the plan and inherits its
`trust: untrusted` tag — DATA, never an instruction. Duplicates raised by more than one axis are recorded once
and cross-referenced.

## Findings — inline interrogation (Step 2)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: ".dev/features/loop-autonomous/PLAN.md:168"
  problem: "Step 6 reads the plan's ## Files paths from .pharn/writes-scope.json, but Step 5 has just re-scoped that file to LOOP.md (and /pharn-verify's setter overwrote it before that), so its scope array holds only pharn/features/<name>/LOOP.md and a STOP_GREEN commit would omit the implementation files while reporting committed. Also raised by coupling and error-handling (L38 shape)."
  evidence: "stage `pharn/features/<name>/` plus the plan's `## Files` paths, read from the setter's structured `.pharn/writes-scope.json` `scope` array"
- type: FINDING
  rule_id: "P4"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:73"
  problem: "The loop-record.md edit is scoped to the commit field and STOP_TERMINAL, but two more contract statements become false: line 16 ('the only file /pharn-loop writes' — it now also writes SPEC.md) and lines 88-92 ('copying that emitted value verbatim' — blocked stops write INCONCLUSIVE without the helper). The exception is documented only in the command, so command and contract disagree. Also raised by documentation."
  evidence: "prose only: the `commit` field no longer asserts the loop never commits (...); `STOP_TERMINAL` meaning narrowed"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:85"
  problem: "LIMITS.md §1d describes a self-stamped Approved as the act of 'a non-compliant or prompt-injected agent that never asked a human'; after this increment a shipped command does it by design. The sweep's loop-specific substrings could not see that. The trusted doc is human-only, so the plan should surface it for a human edit instead of recording it as unaffected. Also raised by documentation."
  evidence: "the sweep found no sentence about the loop's gates; `LIMITS.md §1d`'s backstop (...) stays true because nothing is merged"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:171"
  problem: "The plan never states the end-of-run git state: `git switch -c` leaves the user's checkout on pharn-loop/<name> with every unrelated uncommitted change carried onto it, and `git add -A` over a ## Files path the user had already edited commits those pre-existing edits too. The summary lists them after the fact; nothing restores the original branch."
  evidence: "Otherwise `git switch -c pharn-loop/<name>` (collision → `-2`, …)"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/loop-autonomous/PLAN.md:132"
  problem: "S7's heading trigger overlaps S9 (a /pharn-build HALT on `## Open questions (HALT)` is also a stage refusal), so one trigger matches two rows of a table meant to be a closed enumeration; and the product /pharn-plan template emits `## Risks & open questions`, never that heading, so the membership half of S7 fires only on a hand-edited plan."
  evidence: "the PLAN carries `## Open questions (HALT)`, or the build finds the plan ambiguous"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/loop-autonomous/PLAN.md:112"
  problem: "Design C retries a FAIL or regression whose cause lies outside the plan's ## Files, which /pharn-build cannot touch (fix #7), so such a run spends every iteration to STOP_CAP; the current command states this bound and the plan drops it."
  evidence: "a measurable red (`v` in `{FAIL, INCOMPLETE}` or `r == regressions`), `iter < cap` | `CONTINUE`"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/loop-autonomous/PLAN.md:5"
  problem: "One increment changes four independent behaviors (self-approval, the retry table, the stuck-point table, auto-commit). All four are the maintainer's explicit direction, so nothing is speculative, but a regression cannot be attributed to one axis."
  evidence: "the model approves its own SPEC, retries any measurable red up to the cap, resolves mechanical stuck points (...), commits the result to a new local branch"
```

## Findings — grillers (Step 2b)

### architecture

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:150"
  problem: "/pharn-loop re-implements /pharn-spec's Step 4/5 pin (re-scope, hash, state flip, new key, re-check) while pharn-spec.md is edited to name its caller — against the 'reuse, don't reimplement' pattern the orchestrators follow, and it makes the callee describe its caller."
  evidence: "its Step 4 approval form is replaced: re-scope to `SPEC.md`, run Step 5's pin (...) add `approved_by: model`"
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:71"
  problem: "Design C is close to check-ship.mjs's Design A (continue on any not-green under the cap), yet check-loop.mjs justifies being a separate file by 'a DIFFERENT decision table … retries ONLY INCOMPLETE'; the plan does not re-examine whether that separation still holds or restate why."
  evidence: "decision table replaced: retry any measurable red under the cap; an inconclusive verdict is terminal"
```

### coupling

```yaml
- type: FINDING
  rule_id: "P3"
  severity: blocking
  file: ".dev/features/loop-autonomous/PLAN.md:161"
  problem: "A detected Bash escape can be laundered into a commit: a reconcile RED makes /pharn-verify FAIL (the `reconcile` gate key), FAIL is now CONTINUE, and the next /pharn-build Step 0 re-anchors, which RESETS the baseline (pharn-build.md: 'each anchor RESETS the baseline, so a later one would erase an earlier escape'); the next verify can come back clean, reach STOP_GREEN and commit. Under Design B a FAIL was terminal. Severity raised from the griller's important to blocking by this grill: it defeats an existing floor detection."
  evidence: "`/pharn-build` re-pins its own `## Files` scope every iteration (fix #7) and re-anchors the reconcile epoch, as today"
```

(The coupling griller's staging-source finding is the inline P5 blocking finding at `PLAN.md:168`.)

### comprehension

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:141"
  problem: "S1 and S3–S7 can fire before build iteration 1, where there is no iteration in progress, but check-loop-record.mjs requires iterations >= 1 — and an S1 no-slug stop has no pharn/features/<name>/ to write LOOP.md into. The plan never says what a pre-build blocked stop records, or where."
  evidence: "It records `decision: INCONCLUSIVE` (already an enum member) and `iterations` = the iteration in progress"
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:148"
  problem: "S2 moves every re-run to <slug>-2, -3, …, but Step 1 reads the prior Handoff from the BASE slug, so a third run reads the first run's record rather than the latest one."
  evidence: "Read the base slug's prior `LOOP.md` Handoff as untrusted DATA"
```

### documentation

Both findings are recorded inline (`PLAN.md:73`, `PLAN.md:85`).

### error-handling

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:173"
  problem: "The git failure paths are incomplete: the closed outcome set has no value for a failed `git add` (an ignored path exits 1 after staging the rest) or a failed `git switch -c`, and on `commit failed` the run has already switched branches — a probe with a failing pre-commit hook left the checkout on pharn-loop/x with files still staged. No step switches back or unstages."
  evidence: "Hooks run; a failed commit is reported, never retried with `--no-verify`"
```

(Its staging-source finding is the inline P5 blocking finding at `PLAN.md:168`.)

### observability

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:163"
  problem: "LOOP.md, the run's only durable record, is written before the commit step, so the commit outcome (including commit failed), the pre-dirty paths swept into the commit and the model approval live only in the end-of-turn summary; and a blocked INCONCLUSIVE is indistinguishable in the envelope from a malformed-report INCONCLUSIVE. None of it is checkable once the session ends."
  evidence: "Its `commit` field is `git rev-parse HEAD` captured here — BEFORE step 6"
```

### security

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:126"
  problem: "The slug one-liner consumes the untrusted description, but the plan does not pin HOW it reaches the shell (stdin / quoted heredoc versus interpolation into the command string), and the regex validates only the output, after any expansion ran — so the 'nothing untrusted reaches a shell string' claim covers the commit message only."
  evidence: "derive the slug once from the description with a pinned one-liner; must match `^[a-z0-9][a-z0-9-]{0,63}$`"
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:169"
  problem: "The staging list derives from a plan built from untrusted intent, and the setter rejects only `< > * ?`, so a `.` or `src/` entry passes it and the existence filter; a bare `git commit` then commits the whole index. A scratch-repo probe staged an unrelated edit and an untracked .env.local via a `.` entry, and a file staged before the run was committed too."
  evidence: "filtered to existing or tracked paths, via `git add -A --pathspec-from-file=- --pathspec-file-nul`"
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:224"
  problem: "The trust audit bounds only the write and merge side; it omits that /pharn-verify's project gates and the repo's commit hooks EXECUTE code built from intent no human read (possibly package.json scripts, if the plan lists that file), before any human sees it, with pre-egress still unbuilt — and pharn-verify.md calls those gate commands user-trusted on the premise of human-approved intent."
  evidence: "the canon denylist, reconcile detection at verify, no push or merge, and the human still standing between the branch and a merge"
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:205"
  problem: "A model-approved SPEC outlives the run: nothing in pharn/floor or .claude/commands reads approved_by, and /pharn-spec refuses to overwrite an Approved spec, so a later human-run /pharn-plan or /pharn-ship on that slug consumes the model's approval as if a human gave it."
  evidence: "outside the body hash, so it is neither gated nor tamper-evident"
```

### testability

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:184"
  problem: "The riskiest new behaviors — the Step-6 staging source, a reconcile FAIL across a re-anchor, the record a blocked stop writes — get presence pins and one-time uncommitted build probes only, which would not have caught either blocking finding above; the table cases also omit PASS ∧ regressions at the cap."
  evidence: "Capability eval obligation does not attach. The floor coverage is `check-loop.test.mjs`"
```

### migrations

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:73"
  problem: "The meaning of a stored LOOP.md value changes: 5.x records used STOP_TERMINAL for a FAIL or regression stop, 6.0.0 records use it only for an inconclusive stop, the record carries no version field, and the plan says nothing about reading older records. (The griller's MIN_CLI check agrees with the plan: the installer never parses command writes:, so no MIN_CLI bump.)"
  evidence: "`STOP_TERMINAL` meaning narrowed; envelope, enum and template byte-identical"
```

### performance

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-autonomous/PLAN.md:159"
  problem: "Every iteration re-runs /pharn-regress (a fresh base worktree, a dependency install and the full suite at base and HEAD) plus /pharn-verify's gates, and the plan turns FAIL and regressions from an immediate stop into up to cap retries with nobody watching, without stating that cost."
  evidence: "`/pharn-regress --base <S3 sha>` → `/pharn-verify` → read `check-loop.mjs`. `CONTINUE` → `iter++` and repeat"
```

### privacy · a11y · i18n

No findings. privacy: `scan-plan-pii` found nothing and the plan collects, stores or logs no personal data.
a11y: no user interface is built. i18n: `scan-plan-i18n` found nothing; only fixed English status tokens are
added.

## Summary

The declaration holds and the spec pin matches. The interrogation found the plan's autonomy additions sound in
intent but under-specified exactly where no human is present any more:

- **Two blocking-severity defects, both in the commit path.** The staging source is the wrong file by the
  time Step 6 reads it, so a green commit would miss the feature's code; and retrying a verify `FAIL`
  combined with `/pharn-build`'s per-iteration re-anchor can erase a detected Bash escape and let the run
  commit it. The second is the more serious: it turns an existing floor detection into a no-op under the new
  table.
- **The commit step's blast radius is unbounded by the plan.** Directory entries, pre-staged index content,
  failed-switch recovery and the end-of-run branch are all unstated.
- **Model approval leaks past the run** into later human-run stages, and `LIMITS.md §1d` needs a human edit
  that the plan does not surface.
- **Contract and command disagree** on what `/pharn-loop` writes and how a blocked stop fills `decision`, and
  pre-build blocked stops have no valid record shape.

## Verdict

ADVISORY VERDICT: 21 concerns raised (2 blocking-severity, 16 important, 3 minor) — for the human to weigh
before /pharn-dev-build. This counts the interrogation only; the Step 1b lessons-declaration verdict is the
separate floor result in the header. It is not a judgment that the plan is sound or unsound.
