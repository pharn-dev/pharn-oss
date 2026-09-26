# GRILL — stage-verify-script

**Header.** The plan grilled is `.dev/features/stage-verify-script/PLAN.md` as committed at `e1816eb`
(`wip(stage-verify-script): plan`). This stage did NOT change it. See "PLAN amendments: blocked" below.

- **Spec-hash check:** match. `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` =
  `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, equal to the plan's `spec_content_hash`.
- **Step 1b, the lessons declaration (FLOOR):** GREEN, exit 0. `check-plan-lessons.mjs` printed: "all 34 cited
  id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body".
- **Grillers discovered:** 13, by `node pharn/floor/count-grillers.mjs .` (`{"registered":13,…}`).
- stage: grill — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed.
- gate1: APPROVED on 2026-09-26. This is a MODEL decision by the orchestrator under the maintainer's 2026-09-25
  delegation, NOT a human approval. Q1–Q6 were resolved as the PLAN recommended:
  - Q1: a shared `stage-runtime.mjs`, lifted from `stage-regress.mjs`. **Condition:** the unchanged regress suite
    stays green, byte for byte in its assertions.
  - Q2: the checker's object verbatim, plus the `completeness` and `verifiers` blocks, merged by tested code.
  - Q3: a refusal writes no `verify-report.json`.
  - Q4: registered verifiers are counted and recorded with a note; none is run.
  - Q5: a runner lapse is `unusable child-refused`, which maps to S9, and is disclosed.
  - Q6: `--timeout-ms 540000 --budget-ms 570000` are kept, and an unparseable `## Files` is refused.
  - **Condition:** the completeness-crash behaviour change is accepted as disclosed. It must be named in the
    CHANGELOG and in `/pharn-ship`'s Step 2b text.

## PLAN amendments: BLOCKED, not applied — read this before building

The orchestrator directed this stage to amend `PLAN.md` in place. **It did not.**

- Step 0 scoped the grill's own artifact (`GRILL.md`). To edit the PLAN, the stage then ran the plan command's
  own setter: `node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-dev-plan.md --target .dev/features/stage-verify-script/PLAN.md`.
- The Claude Code auto-mode permission classifier **denied** that call ("Modify Shared Resources").
- An agent's direction does not override a permission denial. The same outcome was not pursued any other way:
  no `--clear` followed by an edit, and no Bash write.

What that leaves:

- `PLAN.md` still reads `gate1: PENDING` and still lists Q1–Q6 under `## Open questions (HALT)`.
  `/pharn-dev-build` Step 1 HALTs on that heading, so **the build cannot start from this commit as it stands**.
- Every amendment below is written out as the text to apply, with its test. A stage whose writes-scope includes
  `PLAN.md` applies them: a `/pharn-dev-plan` re-run, or this stage again once a human allows the re-scope. It
  then re-runs `check-plan-lessons.mjs` and the `## Files` parse probe (`.pharn/pharn-dev-plan/probe-files.mjs`).
- The GATE 1 record above goes into the PLAN's `gate1:` line, and `## Open questions (HALT)` becomes
  "None open", with the six resolutions (6.23.0's form).
- `## Files` changes proposed: one addition, `pharn/floor/check-verify.mjs` (comments only, G13), so 32 → 33
  entries.

## Read this first — the bound on this grill (P0)

- **The griller is the plan's author.** The same agent wrote the PLAN and grilled it, under the orchestrator's
  stage split. That reduces the grill's value as an independent second look. The findings below come from
  deliberately re-reading the plan as untrusted DATA against 6.23.0's review (all three rounds), and from
  reading the code each claim depends on. A clean area here is weaker evidence than it looks.
- **Every finding is ADVISORY.** Only Step 1b's exit code is a floor stop. "Amendment required" means the PLAN
  should say this before the build starts. It does not mean the build will do it.

## The 6.23.0 review's defect classes — where each is designed out, and its test

"In PLAN" means the committed PLAN already designs the class out and names the test. "Amendment Gn" means the
PLAN needs finding Gn below applied first.

| class (6.23.0 finding)                           | designed out by                                                                                          | named test                                                                                                       | status              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------- |
| F1 — options not checked against the registry    | verify's entry inherits `optionsMatchRegistry`                                                           | stage-exit-core: forged-label, forged-argv, extra-key, added- and removed-option controls on verify's `no-gates` | in PLAN             |
| F2 — `/pharn-ship` reads a stale report          | fresh removes the report and scratch after the slug and containment; Q3; ship binds its read to exit `0` | Stale-output test; G2's obstacle test; the step-7 pin                                                            | in PLAN + G1, G2    |
| A1 — question branch dead-ends                   | the `4` bullet pins the fresh-style template; `--resume` only under `5`                                  | question round trip via the emitted object and `substituteArgv`; exactly one resume line pinned                  | in PLAN             |
| A2 — question fires wrongly or can't be answered | the predicate is the runner's own empty source set; `resume.argv` never holds `--gates`                  | the question test asserts `resume.argv` equals the invocation argv                                               | in PLAN + G6        |
| A3 — kill loses the run; late clock              | checkpoints at the top of `drain` and `verdict`; clock from the top of `runFresh`/`runResume`            | ★ Kill (with its mutant); ★ Budget clock shim with the old-clock mutant                                          | in PLAN + G6        |
| A4 — `--resume` skips containment                | the walk re-runs on every `--resume`, and before every write                                             | symlink swap between `continue` and `--resume`; G9's in-drain swap                                               | in PLAN + G9        |
| A5 — ★ tests assert less than their titles       | every ★ asserts its title and names its red-turning edit                                                 | the G6 list                                                                                                      | G6                  |
| A6 — render asserts what it did not observe      | the render reads the report JSON alone                                                                   | G6's render matrix                                                                                               | in PLAN + G6        |
| A7 — new loop stops not disclosed                | a disclosure in `pharn-loop.md` and CHANGELOG                                                            | the per-stage mapping closure, plus a presence pin                                                               | G5                  |
| M1 — gate ids inline, claimed fenced             | every gate id is fenced                                                                                  | the render's hostile-id case                                                                                     | in PLAN             |
| M2 — "never an absolute path"                    | the claim is scoped to paths the script supplies                                                         | G10's control                                                                                                    | G10                 |
| M3, M4 — limits and the DATA label dropped       | a closed presence set over the condensed command                                                         | `NAMED_LIMITS` (G7)                                                                                              | G7                  |
| M5, N1 — `unusable` wording ahead of the code    | the clear precedes argv validation; the `2` bullet's account follows the code                            | the Stale-output test, branch by branch                                                                          | in PLAN + G16       |
| M6 — any string as `done.verdict`                | the command reads the report's verdict                                                                   | ★ WIRING asserts the two agree                                                                                   | G14                 |
| M7 — argv rules diverge from the runner's        | one shared owner (Q1)                                                                                    | the Argv (M7) tests                                                                                              | in PLAN             |
| M8 — a second slug regex                         | the slug regex is imported from `gate-run-core.mjs`                                                      | a static no-redeclaration pin                                                                                    | G12                 |
| M9 — resumable phases never persisted            | the resumable set equals the checkpointed set                                                            | a closure pin                                                                                                    | G11                 |
| M10 — a GATE-1 condition never reached           | both conditions carried into Files and pinned                                                            | G3's BUILD.md record; the Step 2b pin                                                                            | G15                 |
| M11 — probe writes into the live repo            | pre-clean plus `t.after()` on a named directory                                                          | the render style probe                                                                                           | G17                 |
| M12 — discriminator re-implements the predicate  | the mutant runs the same `mappingNamesCode`                                                              | the per-stage closure                                                                                            | G17                 |
| N2 — "idempotent" overclaimed                    | narrowed to "the same stamp over an unchanged tree"                                                      | the parked-at-`verdict` byte-identity test with its moved-tree control                                           | G8                  |
| N3 — `resume.argv` described too broadly         | verify's is the original argv, unchanged                                                                 | the question test's equality assertion                                                                           | in PLAN + G6        |
| N4 — a record asserted a run before it ran       | BUILD.md records only runs that happened                                                                 | none possible (narrative); the review re-executes                                                                | G18                 |
| N5 — round trips built from REGISTRY             | the emitted object plus the shipped `substituteArgv`                                                     | the question round trip                                                                                          | in PLAN             |
| N6 — unprobed quantified claims                  | each new claim is paired with its probe                                                                  | G1, G2, G3, G8, G10 below                                                                                        | amendments          |
| N7 — a leftover survives the fresh start         | none needed: verify has no worktree, and the clear removes `<out>`                                       | —                                                                                                                | checked, no finding |
| containment TOCTOU (A4's residual)               | a containment walk before every write                                                                    | G9's in-drain swap                                                                                               | G9                  |
| kill mid-clear                                   | step 4 unlinks the record first; the window is named                                                     | —                                                                                                                | in PLAN (named)     |
| the fixed 800 ms kill flake                      | the kill waits for the gate's own start marker                                                           | ★ Kill                                                                                                           | G6                  |

## Findings — inline axes (Step 2)

### Guarantee-audit completeness (P0)

#### G1 — `/pharn-ship` can still reach GATE 2 on an earlier run's report

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/stage-verify-script/PLAN.md:633"
  problem: "The plan makes a missing verify-report.json the /pharn-ship STOP, but a stop before the slug parses, a path-containment refusal or a crash before fresh leaves an EARLIER run's report on disk, and /pharn-ship has no freshness check (only /pharn-loop's check-loop-fresh F binds a report to the live tree), so a re-run /pharn-ship can reach GATE 2 on a previous run's PASS."
  evidence: "all kept; `INCOMPLETE` passes through, so Step 2b fires; a refusal is the missing-report STOP (the text is updated)"
```

**Disposition — AMENDMENT REQUIRED (not applied; see above).**

- In `## Files`, the `pharn-ship.md` entry gains: step 7 and Step 2b's re-read accept `.verdict` **only** when
  `/pharn-verify` ended `done` in THIS run, meaning its pinned line or its last `--resume` exited `0`. Any other
  ending — `2`, `3`, an unanswered `4`, or a crash — is a STOP, whatever file is on disk.
- The Guarantee audit gains: "`/pharn-ship` reads a verdict this run produced" → **advisory**. The orchestrating
  model reads its own exit code. The `.verdict` membership test stays floor. The residual is a model that skips
  the exit check.
- Test: G7's presence set pins the exit-`0` condition in `pharn-ship.md` step 7. The Stale-output test keeps
  asserting that an earlier report SURVIVES a pre-slug `usage-error` and `path-containment`, so the residual this
  rule answers stays demonstrated.
- The regress half of the same residual (step 6) is unchanged. It is named as follow-up `ship-regress-exit-binding`.

#### G2 — a swallowed unlink error would falsify "the earlier report is removed"

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/stage-verify-script/PLAN.md:181"
  problem: "Regress's stale-output removal swallows every unlink error (stage-regress.mjs phaseFreshEarly: catch { /* absent — the normal case */ }), so an earlier report that cannot be removed (a directory by that name, a read-only feature directory) silently survives; copied into verify, the plan's 'every stop at or after the slug removes the earlier report' is false."
  evidence: "3. Remove THIS feature's earlier `verify-report.json` and `VERIFY.md` (ENOENT is the normal case)."
```

**Disposition — AMENDMENT REQUIRED.**

- Fresh steps 3 and 4: only `ENOENT` is absence. Any other error from the unlink, or from step 4's clear,
  propagates. That is a crash, never a verdict, so no refusal or `unusable` can be emitted after a failed
  removal, and the removal claim stays true.
- Test: `verify-report.json` pre-created as a non-empty directory → exit 1, no stage-exit document, and no gate
  log under `.pharn/pharn-verify/gates/`.
- Mutant: restore the catch-all. The run then reaches the drain and fails only at the render's rename, so a gate
  log exists, and the test goes red.
- Regress's copy is unchanged here, because Q1 keeps regress's CLI behaviour. It is named as follow-up
  `regress-stale-unlink-swallow`: the same hole sits under 6.23.0's narrowed F2 claim.

#### G3 — Q1's "byte-for-byte" lift cannot hold, and the GATE-1 condition constrains it in ways the plan does not name

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/stage-verify-script/PLAN.md:280"
  problem: "'lifted byte-for-byte' cannot hold: parseRestOfArgv, drain and containmentGuard call emitUnusable inline, so they must be refactored to return results; and GATE 1 made the unchanged regress suite a condition, which constrains that refactor in three ways the plan does not name."
  evidence: "The mechanics both stage scripts need, lifted byte-for-byte out of `stage-regress.mjs` so each has one owner"
```

The three constraints, each read in the code this stage:

1. `stage-regress.test.mjs:521` matches `detail` against `/--budget-ms requires a value/`. `:736` matches the
   runner's `parallel calls are refused` as passed through a `child-refused` detail. Every `detail` text must
   survive verbatim.
2. Its ★ WIRING fixture copies the floor closure that the regex `["'](?:\.\/)?([a-z0-9-]+\.mjs)["']` finds,
   transitively, from `stage-regress.mjs` (`:1055-1066`). So `stage-runtime.mjs` must be imported as
   `"./stage-runtime.mjs"`. Any child it spawns must be named in that literal form, or be passed in by the
   caller. Otherwise the unchanged fixture lacks a module.
3. Regress's order must not move: `phaseFreshEarly` before `parseRestOfArgv`, and the drain's exit-3 idempotent
   repeat.

**Disposition — AMENDMENT REQUIRED.**

- Reword the lift as: "extracted and refactored to return a result instead of emitting; every `detail` text
  preserved verbatim".
- BUILD.md must record `node --test pharn/floor/stage-regress.test.mjs` run before and after the lift, with the
  same pass count. It must also record `git diff --exit-code 1524c6f -- pharn/floor/stage-regress.test.mjs` →
  exit 0.
- `stage-runtime.test.mjs` gains a closure-parity test: the same regex, run over `stage-regress.mjs`, reaches
  `stage-runtime.mjs` and every module it names. Mutant: a computed import path → red.

#### G4 — the plan changes which eval pairs count, and calls it the old rule

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/stage-verify-script/PLAN.md:262"
  problem: "Today's prose pairs 'the committed expected finding arrays' with 'that capability's committed findings.json', and regress's computeEvalPairs lists tracked files only (git ls-files -z); the plan's rule also admits untracked-not-ignored files, which changes which structural gates run, yet it is presented as the old rule made membership and is absent from Behaviour changes."
  evidence: "left the matching to the model; this is that rule made membership."
```

**Disposition — AMENDMENT REQUIRED.** Add the change to Behaviour changes, to CHANGELOG [6.24.0], and to the thin
command's one-sentence eval-pair rule:

- An untracked pair under a declared capability directory now gets a `structural:` gate.
- The old text said "committed". A capability the build just wrote is untracked at verify time, so the literal
  reading gave it no gate.
- Regress's tracked-only rule is unchanged. The two differ on purpose, and the plan says so rather than
  asserting a reason nobody measured.

The test is already planned: "the same pair untracked still counts".

#### G8 — "idempotent over the durable stamp" states more than the verdict phase does

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:243"
  problem: "The verdict is re-derived from the durable stamp AND from live files the AC gate reads (the lock, the SPEC and the mapping in the feature directory), so a resume after the tree moved can compose a different report than the interrupted run would have; 6.23.0's N2 was the same word."
  evidence: "or the verdict and render, which are idempotent over the durable stamp."
```

**Disposition — AMENDMENT REQUIRED.**

- Reword: "re-derived from the same stamp; over an unchanged tree it reproduces the interrupted run's report. In
  `/pharn-loop`, check-loop-fresh F catches a moved tree. `/pharn-ship` has no such check."
- Test: after a completed run, a hand-built progress record parked at `verdict` (and passing `validateProgress`)
  → `--resume` → `done`, with `verify-report.json` byte-identical.
- Control: edit a pinned AC test file before the resume → the report differs, which demonstrates the bound.

#### G10 — "no rendered outcome matches ABS_PATH_RE" is a claim about fixtures, not code

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:522"
  problem: "check-verify.mjs evaluates the AC gate with root = process.cwd() (absolute, check-verify.mjs:320), and the renderer quotes a checker's reason as given, so nothing in the plan establishes that no rendered reason carries an absolute path; 6.23.0's M2 was this overclaim."
  evidence: "outcome matches `ABS_PATH_RE` (imported by the test only)"
```

**Disposition — AMENDMENT REQUIRED.**

- Narrow the test and the claim to what the script supplies: the stage-exit object's `report` and `render` paths,
  the render's fixed text, and every argv operand the script builds. The Trust audit's own sentence already says
  "the script supplies".
- Add a control: a checker reason that carries an absolute path renders inside a fence, as given.

#### G14 — 6.23.0's M6 residual now covers verify's objects too

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:169"
  problem: "validateStageExit accepts any string as done.verdict and continue.phase (6.23.0's M6, deferred and named for regress); verify's done object carries the same unchecked verdict copy, and stage-exit.md's residual names only regress."
  evidence: "**A `done` exit carries the stage's verdict only"
```

**Disposition — AMENDMENT REQUIRED.** `stage-exit.md`'s M6 residual names verify too. The thin command already
reads the report's verdict, not the object's. ★ WIRING asserts the two agree (G6).

### Trust propagation (P2)

#### G9 — containment is walked once per invocation; the writes land up to about 570 s later

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:222"
  problem: "A feature directory swapped for a symlink during the drain is written through, because containment runs at the top of the invocation and the render writes after the last gate; 6.23.0 left this open as A4's residual, and the plan neither closes nor names it for verify."
  evidence: "8. **render**: write `verify-report.json` and then `VERIFY.md` atomically (a tmp file under"
```

**Disposition — AMENDMENT REQUIRED.**

- Re-run the containment walk immediately before every write into the feature directory: the render's two
  writes, and the refusal render. The residual narrows to the gap between that walk and the rename, and is named.
- Test: a fixture gate replaces `pharn/features/<name>` with a symlink to an outside directory during the drain →
  `unusable path-containment` at the render, and nothing is written through the link.
- Mutant: drop the pre-write walk → files appear in the outside directory.

### One axis of change / no sibling imports (P3)

#### G12 — the slug regex needs one named owner

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:177"
  problem: "The plan names FEATURE_SLUG_RE without its owner; 6.23.0's stage-exit-core re-declared it and needed a parity pin (M8), and a copy in a new module would repeat that."
  evidence: "1. `--feature` must parse as a slug (`FEATURE_SLUG_RE`), else `unusable usage-error` with `feature: null`."
```

**Disposition — AMENDMENT REQUIRED.** Import it from `gate-run-core.mjs`. A static pin checks that none of the
four new modules declares `FEATURE_SLUG_RE =`.

### Determinism (P5)

#### G11 — the resumable set must equal the checkpointed set

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:250"
  problem: "6.23.0 shipped a RESUMABLE_PHASES set wider than the phases its script persisted, and a resume from an unpersisted phase crashed (M9); the plan defines verify's set but no test ties it to the checkpoint call sites."
  evidence: "- **PHASES** and **RESUMABLE_PHASES** (`drain`, `verdict`)."
```

**Disposition — AMENDMENT REQUIRED.**

- A closure test: the phase literals the script passes to its checkpoint writer are exactly `RESUMABLE_PHASES`.
- A record naming any other `PHASES` member → `progress-malformed`. Every member is tested, not one.

#### G16 — the `2` bullet's account misses two branches

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:369"
  problem: "The 2 bullet's per-branch account omits a --resume that ran gates before a runner refusal (their logs stay), and after G2 a failed removal is a crash rather than a 2; 6.23.0's M5 and N1 were this sentence stating a cleanup that had not happened."
  evidence: "- `2` unusable → present `detail` as quoted DATA and stop, with what already happened per branch (before"
```

**Disposition — AMENDMENT REQUIRED.** Rewrite the parenthetical, and `stage-exit.md`'s verify timing, as:

- before the slug parses, or at `path-containment`: nothing is removed. An earlier report and progress record
  survive together.
- any later `unusable`: the earlier report and the scratch are gone. From `init` on, this run's `gates/` may
  exist.
- a `--resume`'s own stop removes nothing, but may follow gates it ran; their logs stay.
- a failed removal is a crash, not a `2`.

Test: the Stale-output test asserts each branch's files, the crash branch included.

### Honest scope / no speculation (P7)

#### G5 — the new `/pharn-loop` stops are not disclosed

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/stage-verify-script/PLAN.md:651"
  problem: "The disclosed crash change names /pharn-ship Step 2b only; under /pharn-loop a crashed check-build-complete.mjs used to read INCOMPLETE, which check-loop.mjs CONTINUEs (a rebuild iteration, up to the cap), and now stops at S9, and every runner refusal (a malformed package.json, a lock lapse) now reaches S9 at the stage instead of a fail-closed report read by check-loop-fresh; the pharn-loop.md edit discloses none of it (6.23.0's A7 class)."
  evidence: "verdict read `INCOMPLETE`, and `/pharn-ship` Step 2b answered it with its one bounded rebuild."
```

**Disposition — AMENDMENT REQUIRED.**

- `pharn-loop.md`'s verify mapping paragraph gains an A7-style disclosure. As of 6.24.0, three cases stop at S9:
  - a crashed completeness checker (before, INCOMPLETE → CONTINUE);
  - a runner refusal, a lapse included (before, a fail-closed report that check-loop-fresh read);
  - an unparseable `## Files`.
- CHANGELOG [6.24.0] names them.
- Test: the per-stage mapping closure, plus a G7 presence pin: the verify paragraph names `child-crashed` and
  `child-refused`.

#### G15 — GATE 1's two conditions must reach the artifacts they bind

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:11"
  problem: "GATE 1 attached two conditions (the unchanged regress suite green byte for byte in its assertions; the completeness-crash change named in the CHANGELOG and in /pharn-ship's Step 2b text); 6.23.0's M10 was a GATE-1 condition that never reached its artifact."
  evidence: "- gate1: PENDING — delegated to the orchestrator (the maintainer's 2026-09-25 delegation). Open questions Q1–Q6 below each carry a recommendation."
```

**Disposition — AMENDMENT REQUIRED.**

- The `gate1:` line takes the header's record.
- `## Open questions (HALT)` takes the six resolutions.
- The `pharn-ship.md` Files entry names Step 2b's crash sentence: a crashed `check-build-complete.mjs` is
  `unusable child-crashed` with no report, so the retry no longer fires on a crash.
- G7's set pins `child-crashed` inside Step 2b.
- Condition 1 is G3's BUILD.md record.

#### G18 — BUILD.md must record only runs that already happened

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:435"
  problem: "6.23.0's BUILD.md asserted a verify re-run before it happened (N4); the plan's BUILD.md entry lists what to record but not that only a run already made, with the exit code it printed, may be written."
  evidence: "- `.dev/features/stage-verify-script/BUILD.md` — the build's own record: the measurements, the probes with their exit codes, the command's byte size"
```

**Disposition — AMENDMENT REQUIRED.** Add: "each line reports a command already run, with the exit code it
printed; nothing is recorded ahead of its run." This is not code-testable, which is stated rather than hidden.
The review re-executes the probes (L37).

## Findings — grillers (Step 2b, applied inline; each griller is ADVISORY)

| griller        | Layer 1 (deterministic, where one exists)                                     | outcome                                                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a11y           | membership only                                                               | no UI surface: no finding                                                                                                                                                                                        |
| architecture   | membership only                                                               | fit recognized: one owner per rule (`VERIFY_PATHS`, the pairing via `actualForExpected`, `quote-core`, `shelled-verdict-core`, the shared runtime under Q1). G3 and G12 are the fit concerns                     |
| comprehension  | membership only                                                               | the non-obvious decisions carry their WHY: the clear before argv, the completeness check at init, `VERDICT_EXIT`, 540000/570000. The untracked pairs' WHY lands with G4. No further finding                      |
| coupling       | membership only                                                               | named: shared `.pharn/pharn-verify/` (one run per worktree, L38); `stage-runtime.mjs` couples the two stage scripts by design (Q1), so a change for one ripples to the other, which both suites catch. G19 below |
| documentation  | membership only                                                               | declared: the contract, the CLAUDE.md Commands entry, the command prose, CHANGELOG. G13 below                                                                                                                    |
| error-handling | membership only                                                               | declared: refusals, `unusable` codes, crash semantics, kill-resume, runner lapses. G2, G9 and G16 are the gaps                                                                                                   |
| i18n           | `scan-plan-i18n.mjs` → `{"found":false}`                                      | scanner clean; developer-facing English artifacts only                                                                                                                                                           |
| migrations     | `scan-plan-migrations.mjs` → `{"mentions":false}`                             | no persisted user-data shape change: the report keeps the checker's fields plus the same two blocks, and the progress record is versioned `/1`                                                                   |
| observability  | `scan-plan-observability.mjs` → mentions at PLAN l. 471, 509, 625 (gate logs) | real observability for what the plan builds: per-gate logs hashed in the stamp (check J), one stage-exit object per exit, the progress record. No finding                                                        |
| performance    | membership only                                                               | the pre-drain work (chain, git listing, `count-verifiers`, init's fingerprint) is charged to the budget clock; `count-verifiers` already ran on every verify. No finding                                         |
| privacy        | `scan-plan-pii.mjs` → `{"found":false}`                                       | scanner clean; G10 (an absolute path in a committed artifact) is the one privacy-shaped concern                                                                                                                  |
| security       | `scan-plan-secrets.mjs` → `{"found":false}`                                   | scanner clean; the answer-quoting rule (single quotes, `'\''`) is carried, and the executed input is the user's own `--gates` text, as today. No further finding                                                 |
| testability    | membership only                                                               | verification present (many ★ tests with controls); G6, G7 and G17 are adequacy concerns                                                                                                                          |

### Testability (P1)

#### G6 — the ★ tests must assert what their titles promise

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/stage-verify-script/PLAN.md:505"
  problem: "Two ★ tests name no red-turning edit (Kill mid-drain, ENUMERATION), the Kill test does not say how it knows the gate started (6.23.0's fixed 800 ms wait flaked), and several quantified claims have no assertion: every exit validates, refusals precede the first slow step, a kill before drain leaves no record, and the done object's verdict equals the report's (6.23.0's A5 class)."
  evidence: "- **★ Kill mid-drain:** a SIGKILL while a gate runs leaves the record at `drain`; `--resume` reaches `done`."
```

**Disposition — AMENDMENT REQUIRED.** The Evals section gains:

1. **★ Kill:** the fixture gate writes a start marker, then sleeps. The test polls for the marker, never a fixed
   delay, then SIGKILLs the process group. It asserts the record's phase is `drain`, and `--resume` → `done`.
   Mutant: drop the drain-top checkpoint → `--resume` answers `no-progress`.
2. **★ ENUMERATION:** mutant — `VERIFY.md` removed from one site → red.
3. **★ Budget:** the unbudgeted run executes in the same test, over the same fixture, with three or more gates
   and none skipped. Verdict, `failing_gates`, `gates` and `ac_gate` must deep-equal.
4. **★ WIRING:** the wall time goes out through `t.diagnostic` and into BUILD.md, never `void`. The test asserts
   `done.verdict` equals the report's `verdict`.
5. A `runCli` helper checks, on every CLI test, that stdout is exactly one JSON document and that
   `validateStageExit` accepts it.
6. Every refusal test and the question test assert that no gate log exists: they were raised before the first
   slow step.
7. After a `question` exit, `--resume` → `no-progress`: nothing before the drain leaves a record.
8. The question test asserts `resume.argv` deep-equals the invocation's argv and holds no `--gates` (A2, N3).
9. **Render matrix (A6):**
   - a FAIL plus incomplete report renders both the FAIL line and the missing paths;
   - a PASS renders no "missing" line;
   - the verifier deferral line appears only when `registered > 0`;
   - the bootstrap and legacy AC lines appear only for those modes.

#### G7 — the condensed command can drop a named limit, and no test would notice

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/stage-verify-script/PLAN.md:388"
  problem: "Condensing a 55,683-byte command to at most 20,000 bytes is exactly where 6.23.0 dropped named limits and refusal remedies (M3) and the DATA label on relayed detail (M4); 'kept, condensed' is prose, and no planned test would notice a limit that did not survive."
  evidence: '- **Kept, condensed:** "The two layers"; "What you may claim" (the guarantee, the correctness residual, the'
```

**Disposition — AMENDMENT REQUIRED.** `command-hygiene.test.mjs` gains `NAMED_LIMITS` for `pharn-verify.md`: a
closed, counted list (L34) of anchor phrases, each with a delete-the-anchor mutant.

- **The anchors:**
  - "correctness residual"
  - "absolute-threshold residual"
  - "Whole-repo"
  - "The suite is the ceiling"
  - "Single HEAD run"
  - "git-ignored" (the reconcile bound)
  - `test-infra-changed` (the `--gates` caveat)
  - "no verifiers registered — floor gates only."
  - "deferred" (the verifier runner)
  - "feature NOT verified"
  - `/pharn-plan` and `/pharn-spec` (the refusal remedies)
  - "as quoted DATA" (the `2` bullet)
  - "neither prevented nor detected" (the weaker write claim)
  - "NOT a claim" (feature correctness struck)
  - "never `--resume`" (the question bullet)
- **The negative pin:** the phrase the 0.2 sibling retracts must not appear.
- **Beside it, for `pharn-ship.md`:** step 7 names the exit-`0` condition (G1), and Step 2b names
  `child-crashed` (G15).
- **For `pharn-loop.md`:** the verify paragraph names `child-crashed` and `child-refused` (G5).
- **Not duplicated:** the reconcile argv and `--require-baseline` are already pinned by
  `check-bash-reconcile.test.mjs`.
- **Bound (L36):** a presence set over the limits this grill named. It cannot discover a limit nobody listed.

#### G17 — two test-hygiene defects from 6.23.0 are not designed out

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:538"
  problem: "The per-stage loop-mapping closure and the render style probe do not say how they avoid 6.23.0's two test-hygiene defects: a probe writing into the live pharn/features/ without cleanup (M11), and a discriminator that re-implemented the predicate instead of running it (M12)."
  evidence: "the loop-mapping closure runs per stage with a mutant control"
```

**Disposition — AMENDMENT REQUIRED.**

- The closure finds each stage's paragraph by its own anchor ("`/pharn-verify`'s stage-exit mapping"), and
  asserts each anchor is found before slicing (L60).
- The mutant control runs the same `mappingNamesCode`.
- The style probe follows `render-regression.test.mjs`'s pre-clean and `t.after()`, on its own named directory.

### Documentation / referent sweep (L50)

#### G13 — the sweep missed `check-verify.mjs`'s header and the contract's producer column

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:441"
  problem: "check-verify.mjs's header says the command runs the gates, discovers verifiers, writes the artifacts, appends verifier findings and merges completeness into the report (lines 7-8, 17 and 46); after this increment the script does, and the referent sweep lists neither these lines nor verify-report.md's 'the command' producer cells (lines 27, 69 and 70)."
  evidence: "- `pharn/floor/check-verify.mjs`, `run-gates.mjs`, `check-build-complete.mjs` and `check-loop.mjs` keep their bytes: the script only shells them."
```

**Disposition — AMENDMENT REQUIRED.**

- `## Files` gains `pharn/floor/check-verify.mjs` — EDIT, comments only: lines 7-8, 17 and 46 re-pointed at
  `stage-verify.mjs`. The code, the verdict table and the flush pattern `cli-stdout-flush.test.mjs` pins stay
  untouched.
- "Explicitly not touched" drops `check-verify.mjs`.
- The `verify-report.md` entry names lines 27, 69 and 70.
- The referent-sweep bullet lists both files.

### Coupling (siblings)

#### G19 — RULE B lands exactly on its pinned floor

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-verify-script/PLAN.md:125"
  problem: "RULE B's domain drops from 6 to exactly its pinned floor of 5, so a sibling that removes a second placeholder writes: path from any of the five remaining commands fails RULE B's non-vacuity test at merge, and the test's message names 'the regress/verify pairs', which stops being true."
  evidence: "so it becomes 5, still at the pinned floor of 5."
```

**Disposition — AMENDMENT REQUIRED.** The siblings section names it: the later merge re-measures RULE B's domain.
The message rewording is already in the `command-hygiene.test.mjs` entry.

## Checked, no finding (recorded so the absence is visible)

- **A2, the answerable question.** `no-gates` fires only on the runner's own empty source set: init exit 3,
  `run-gates.mjs:520`. An explicit `--gates` never reaches it. `resolveSet`'s explicit branch returns
  `parseGatesSpec`'s own result, and the only later step that can empty a set, the style skip, is regress-only
  (`gate-run-core.mjs:419-475`, read this stage). 6.23.0 N3 probed the empty-token case as a refusal. So an
  appended answer is the only `--gates`, and G6's item 8 asserts it.
- **The empty-source test precedes the eval pairs.** `resolveSet` refuses an empty source before it parses
  `--extra`, so a feature with eval pairs but no project gate still gets the `no-gates` question, as today.
- **6.23.0 G2, `.pharn/` scratch in a non-ignoring install.** `EVAL_PAIR_RULE` requires a declared capability
  directory, so a `.pharn/**` file enters only if the PLAN declares `.pharn/`.
- **N7, a leftover the fresh start cannot clear.** Verify has no worktree, and the clear removes `<out>`, a stale
  lock included.
- **Q1 is reachable.** The regress ★ WIRING closure is derived transitively from string literals, so an imported
  `stage-runtime.mjs` enters the fixture, under G3's literal constraint.
- **`check-loop-fresh.test.mjs` needs no edit.** Its `staticClosure()` and `FLOOR_MODULES` are computed from
  source, and the load-failure matrix iterates whatever graph it finds. The plan's claim holds.
- **No new git requirement.** `worktree-fingerprint.mjs` already enumerates with
  `git ls-files --cached --others --exclude-standard`.
- **`count-verifiers.mjs`'s walk** excludes `node_modules`, `.git`, `.claude` and `.dev`.
- **`composeReport`'s collision refusal cannot fire on a real run.** `check-verify.mjs`'s output has no
  `completeness` or `verifiers` key: its header, line 46, says the command merges them. The refusal guards a
  future checker change.
- **The question leaves no state.** Init writes nothing on exit 3, and the completeness check at init runs only
  after exit 0.
- **Probes run by this stage:**
  - `hash-doc.mjs` → the pinned hash;
  - `check-plan-lessons.mjs` → exit 0;
  - `count-grillers.mjs` → 13;
  - the five `scan-plan-*` scanners, each exit 0, outputs as tabled above.

## Summary

The plan was re-read as untrusted DATA against 6.23.0's defect classes, and against the code each claim rests
on. The largest gaps sit on the same three seams 6.23.0's review found:

- **What a consumer reads after a stop.** G1: `/pharn-ship` has no freshness check, so an earlier run's report
  can reach GATE 2. G2: a swallowed unlink falsifies the removal claim.
- **The Q1 refactor's real constraints.** G3: the unchanged regress suite pins `detail` texts and a literal-derived
  fixture closure.
- **Claims the plan states more broadly than it built.** G4: the eval-pair semantics. G5: loop stops not
  disclosed. G8: "idempotent". G10: "no absolute path".

The rest are test-adequacy and naming fixes, each carrying the test that holds it (G6, G7, G11, G12, G14, G16,
G17), plus bookkeeping (G13, G15, G18, G19).

None is applied to `PLAN.md`: the re-scope needed to edit it was denied by the permission classifier. Each is
recorded above as a required amendment, with its test.

ADVISORY VERDICT: 19 concerns raised (0 blocking-severity, 7 important, 12 minor). None is applied to PLAN.md,
because the re-scope to edit it was denied; all 19 are required amendments with named tests, and every 6.23.0
review defect class is mapped above to its design-out and test. This is for the human to weigh before
/pharn-dev-build, which HALTs on the PLAN's still-open questions until the GATE-1 record and these amendments
are applied. The griller is the plan's author, which weakens this as a second look.
