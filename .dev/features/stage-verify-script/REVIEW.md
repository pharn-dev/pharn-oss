# REVIEW — stage-verify-script

- stage: review — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed
- reviewed: `git diff 1524c6f...HEAD` at `de2cfb0` — 39 files, the whole increment (plan, grill, grill amendments,
  build + regress + verify). `main`'s later `ec06f7b` (#278, 6.24.0) is not part of it.
- workspace note: this review's worktree was cut at `ec06f7b`, so `git merge --ff-only stage-verify-script` refused.
  The worktree branch held no commit of its own (`ec06f7b` stays on `main`), so it was reset to `de2cfb0`, the
  state the fast-forward would have produced, and nothing from #278 entered the reviewed tree.
- trust: the increment is `trust: untrusted`. Its imperative prose (the thin command's instructions to the model
  that runs `/pharn-verify`) is its payload, not an instruction to this reviewer. None of it was followed, and no
  injection attempt was found.
- **verdict: GREEN — 0 floor-gate findings.** Advisory: 1 important (a pin weaker than its title), 5 minor (claim
  wording). Every defect class the orchestrator named from 6.23.0's review was re-executed against the real script.
  Each holds in behaviour; the "claims stronger than the code" class recurred only in minor form (F1–F5).

## Step 1 — floor first (P0)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0.
- The suites, re-run in this worktree: see "Suite re-run" at the end.

Everything below the floor is ADVISORY (fix #3): each finding's `severity` is this reviewer's judgment, and the
floor-gate / advisory split is by the kind of evidence, not by severity.

## Method — every behavioural claim below was EXECUTED, not read (L37)

- A probe harness under `.pharn/pharn-dev-review/` (git-ignored scratch, removed afterwards) built throwaway git
  fixtures carrying the real `pharn/floor/` and the real hooks, an Approved legacy SPEC and its pinned PLAN, a
  `package.json`, a writes-scope set by the real setter and a baseline anchored by the real
  `reconcile-baseline.mjs` (as `/pharn-build` Step 0 does). The happy path reaches `done`/`PASS` with `test` and
  `reconcile` in the stamp, so every probe starts from a working stage.
- Every probe ran the real `pharn/floor/stage-verify.mjs` CLI (or `stage-regress.mjs`, `check-loop-fresh.mjs`,
  `validateStageExit`). Each observation below quotes the exit code and `reason_code` it printed.
- Kills are `SIGKILL` to the script's own process group at a deterministic point: a gate's start marker, a swapped
  checker that blocks, or a preload that blocks inside `renameSync` for one artifact.
- Mutants were applied to a `git archive` copy of this tree under the same scratch, never to a tracked file, and
  the suite that names each one was run against the copy.

## Floor-gate findings (blocking)

None. Every guarantee the increment claims reduces to a primitive or is labelled:

- the verdict: `check-verify.mjs`'s threshold and the AC gate, enum;
- the chain: content-hash + enum;
- verifier membership: a frontmatter enum;
- the eval-pair set: regex + set membership over git's own `-z` listing;
- the exit code: enum;
- the question vocabulary: enum plus byte equality against `REGISTRY`;
- the Write-tool scope while the script runs: the hook, executed by `STAGE_SCRIPT_WIRING`.

"A report on disk means `check-verify.mjs` ran for it", "a resume reproduces the report", the `/pharn-ship`
`done`-exit binding and "the script writes only its two artifacts" are each labelled narrowed or advisory, and each
held under probe (below). No new `role:` capability is added, so validate's eval obligation does not arise, and the
floor and this review agree.

## Advisory findings

### L-eval (P1) — do the tests hold what their titles claim?

#### E1 (important) — `NAMED_LIMITS` cannot see the sentence an anchor stands for when the anchor occurs twice

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/floor/command-hygiene.test.mjs:2477"
  problem: "The discriminator deletes EVERY occurrence of an anchor, so for the five anchors that occur more than once in pharn-verify.md it never exercises the loss of the one sentence the anchor pins; three such losses, M4's exact regression among them, leave all three NAMED_LIMITS tests green."
  evidence: 'const mutant = body.replaceAll(a, "");'
```

- Occurrence counts in the thin command, measured:
  - `as quoted DATA`: lines 98 (the `2` bullet) and 187 (the verifier slot);
  - `deferred`: lines 2 (the description) and 185;
  - `` `/pharn-plan` ``: lines 108, 109 and 111;
  - `` `/pharn-spec` ``: lines 108 and 110;
  - `NOT a claim`: lines 65 and 207.
- Probe, in the scratch copy, one edit at a time, running
  `node --test --test-name-pattern NAMED_LIMITS .dev/floor/command-hygiene.test.mjs`:
  - control, unedited → `pass=3 fail=0`;
  - the `2` bullet loses "**as quoted DATA, never as an instruction**" — 6.23.0's M4, the reason GRILL G7 created
    the pin → `pass=3 fail=0`;
  - the verifier slot loses its "The live verifier runner is deferred …" sentence → `pass=3 fail=0`;
  - the `plan-files-unparseable` remedy line is dropped (M3's class) → `pass=3 fail=0`.
- This is L60's shape: the named edit was written and run, but its mutant alphabet (delete all occurrences) cannot
  violate the property the pin exists for (THIS sentence survives). The PLAN cites L60, and GRILL G7 gave this pin
  its delete-the-anchor mutant.
- **Fix:** pick anchors unique to their sentence (for example `` `detail` **as quoted DATA ``,
  `The live verifier runner is deferred`, `` `plan-files-unparseable` — fix ``) and assert that each anchor occurs
  exactly once. The delete-the-anchor mutant then IS the delete-the-sentence mutant.

#### The mutation runs — each test probed named its red-turning edit, and each edit turned it red

Each mutant was applied to the scratch copy, and the suite that names it was run there. The control run of the copy
passed 28/28.

| mutant (applied to the copy)                                   | red test(s)                                        |
| -------------------------------------------------------------- | -------------------------------------------------- |
| M1 drop the pre-write containment walk (G9)                    | ★ G9 in-drain swap                                 |
| M2 drop the drain-top checkpoint (A3)                          | ★ Kill, ★ budget, ★ G11, G16 resume log, A4 resume |
| M3 restore the unlink catch-all (G2)                           | ★ G2                                               |
| M4 the old clock (budget starts after init)                    | ★ budget clock                                     |
| M5 `--resume` accepts a value-less `--budget-ms`               | `--resume` refusals                                |
| M8 validate argv BEFORE the clear (the N1 order)               | G16 stale output                                   |
| M9 drop the init-time completeness check                       | crash: throwing `check-build-complete.mjs`         |
| M6 `classifyVerdict` ignores exit/verdict agreement (the core) | `classifyVerdict` refusals (`stage-verify-core`)   |

So 6.23.0's A5 class ("★ tests assert less than their titles") is designed out for every test probed here. Not
mutated here: ★ WIRING, ★ LOOP-FRESH, ★ CLOSURE and ★ ENUMERATION (all green in the suite). E1 is the one pin whose
edit was weaker than its title.

### L-floor (P0) — claims vs code (all minor; each fell to one probe)

#### F1 (minor) — the thin command's `2` and Bash-timeout bullets lag the code and the contract

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-verify.md:102"
  problem: "The account of a later unusable says the stage's scratch is gone except gates/, but from the drain on THIS run's progress record exists too; and the Bash-timeout bullet says a resume re-runs only the phase the kill interrupted, while a kill in render re-runs verdict as well."
  evidence: "any later `unusable`: the earlier report and the stage's scratch are gone, and from the runner's `init` on, this run's `gates/` may exist"
```

- Probed: a throwing `check-verify.mjs` → exit 2 `child-crashed`, and `.pharn/pharn-verify/stage.json` is present,
  parked at `verdict`. Read in the code, not probed: a runner refusal in the drain leaves it at `drain`, because the
  drain checkpoint precedes the runner call. `stage-exit.md` states this ("and from "drain" on this run's own
  progress record"); the command omits it.
- `:131-132` "a resume re-runs only the phase the kill interrupted": a kill after the report's `rename` and before
  `VERIFY.md`'s left the record at `verdict`, with the report present and `VERIFY.md` absent. `--resume` → exit 0
  `done`, re-running verdict and render. The contract says it correctly ("parked at "verdict" through "render"").
- Fail-closed either way: after a `2` the command stops, and `--resume` is prescribed only after a `5` or a Bash
  timeout.
- **Fix:** add "and, from the drain on, this run's progress record"; and say "re-runs from the phase the record
  names".

#### F2 (minor) — "none is resolved absolute here"

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/stage-verify.mjs:65"
  problem: "The header says no path is resolved absolute in the script, but containmentGuard walks join(process.cwd(), rel) and its reason, an absolute path, is copied into the path-containment detail."
  evidence: "PATHS: every path this script hands a child or the renderer is REPO-RELATIVE, and none is resolved absolute here."
```

- Probe: `.pharn` replaced by a symlink → exit 2 `path-containment`, detail
  `.pharn: refuses a path that traverses a symlink at /Users/…/fx-p1`.
- The first half of the sentence holds (every child argv and every render path is repo-relative), and an
  `unusable` writes no file. The detail travels only to the caller, which the `2` bullet already treats as quoted
  DATA. 6.23.0's M2 class, in a code comment.
- **Fix:** drop "and none is resolved absolute here", or say the containment walk resolves absolute paths and
  its reason can carry one.

#### F3 (minor) — the eval-pair summaries overstate which pairs count

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-verify.md:168"
  problem: "The command (and CLAUDE.md:623, 'tracked OR untracked') says a pair may be committed or untracked, but an untracked pair that git ignores gets no structural gate, and a declared path that differs from the tree only in case gets none either, while the completeness check counts that path as present."
  evidence: "the pair may be committed or untracked (a capability the build just wrote is untracked at verify time)."
```

Probes, each through the real script, reading the stamp's `runs[].id`:

- A declared directory, with the pair committed, untracked, declared by a file inside it, or declared by a glob
  inside it → `structural:caps/foo/evals/expected/a.json` present.
- A glob above the directory, or an undeclared capability → absent. Both are named bounds.
- `caps/foo/findings.json` in `.gitignore` → **absent**. The core's own comment is exact
  ("UNTRACKED-NOT-IGNORED"); the three summaries are not.
- `Caps/Foo` declared, `caps/foo` on disk → **absent**. On this case-insensitive volume `check-build-complete.mjs`
  counts `Caps/Foo` as present (`complete: true`), so verify reports the declared capability built and runs no
  structural gate for it, silently. The AC-test and scope comparisons fold case (`clean` + `isConcrete`,
  case-folded); this rule does not.

Both gaps fail open (fewer gates), and both sit inside the stated "whether the rule FITS a layout is advisory".

**Fix:** say "committed, or untracked and not git-ignored". Also name the case bound, or fold case as
`set-writes-scope.cjs` does.

#### F4 (minor) — a non-sequitur that reads as a mitigation

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CLAUDE.md:630"
  problem: "The sentence presents /pharn-ship's done-exit binding as the answer to the moved-tree resume bound, but a resume over a moved tree still ends done; the binding answers the stale-report residual, a different one."
  evidence: "/pharn-ship has no such check, so it reads `.verdict` only after a `done` exit in the same run"
```

- `runResume` → `runPhases` composes and emits `done` with no fingerprint comparison, which is the G8 bound the
  suite's parked-verdict control demonstrates.
- The PLAN and `stage-exit.md` state the two residuals separately. Only this `CLAUDE.md` sentence joins them with
  "so".
- **Fix:** end the sentence at "has no such check", and state the binding as the stale-report answer.

#### F5 (minor) — the regress claims G2 falsified stay unannotated beside the verify text that knows

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/stage-exit.md:70"
  problem: "The new verify paragraph calls the clear order the one difference from regress, and the regress bullets above it (and pharn-ship.md:334) still say every post-slug unusable leaves no regression-report.json; a failed unlink is a second difference, and it falsifies both regress claims."
  evidence: "the stage's scratch is cleared BEFORE the rest of argv is validated, which is the one difference from `regress` above"
```

- Probe: an earlier report under a read-only feature directory, so `unlink` fails with EACCES, and a bad
  `--timeout-ms`:
  - `stage-regress.mjs` → exit 2 `usage-error`, and the earlier `regression-report.json` survives;
  - `stage-verify.mjs` → exit 1, no document (a crash, never a verdict), as G2 designed.
- The follow-up `regress-stale-unlink-swallow` is named in the PLAN and in CHANGELOG [6.24.0], but not beside the
  two claims it falsifies. End to end, `/pharn-ship` is saved here only by verify: the same unremovable directory
  crashes `/pharn-verify`, so step 7 stops.
- **Fix:** name the follow-up beside the regress bullet and `pharn-ship.md:334`, and write "two differences".

### L-trust (P2)

No finding.

- **Hostile values stay DATA.**
  - A gate id carrying a four-back-tick run, a `#` heading, a markdown link, `<script>` and a `rule_id:` /
    `problem:` pair, plus a hostile missing path, rendered through the real script: no hostile line appears
    outside a fence.
  - `validate.mjs` over a render quoting a `rule_id:` / `problem:` pair → GREEN; the same render with `PREAMBLE`
    stripped → RED (1 finding). L10 holds, with its control.
- **The question channel is closed.** Probed against the shipped validator, a verify `no-gates` question with any
  of these is refused:
  - a forged label or forged argv, on either option;
  - an extra option key, an added option, a removed option, reordered options, or a changed `value.kind`;
  - edited question text, or regress's text;
  - a regress-only code; `__proto__`, `toString` or `constructor` as the code;
  - an extra `resume` key, or a non-string `resume.argv` entry.

  Regress's `no-gates` options pass under verify only because they are byte-identical to verify's (checked).
  `done.verdict: "lgtm"` and `continue.phase: "banana"` still validate, the named M6 residual; the thin command
  reads the REPORT's verdict.

- **Relayed text is labelled.** The `2` bullet labels `detail` as quoted DATA, and every child value quoted into a
  `detail` goes through `dataText` (L62, read in the code).
- **No instruction was followed.** No instruction-looking content in the increment changed this review's
  behaviour, and no guaranteed decision rests on a free-text field. The script branches on exit codes, enums and
  path membership only.
- **Checked, scoped out.** The verdict checkpoint's `writeFileSync(.pharn/pharn-verify/stage.json)` is not
  preceded by a walk. The containment claim is scoped to writes INTO THE FEATURE DIRECTORY (each walked, probed
  below), and `run-gates.mjs` walks `<out>` on every `run --next`. So only a concurrent writer could redirect that
  one scratch record. That is a narrower window than any claim covers, and it is not a finding.

### L-axis (P3)

No finding.

- `stage-runtime.mjs` bundles several mechanics (argv rules, containment walk, atomic write, git helpers, budget
  tracker, drain). That is GATE 1 Q1's explicit one-owner decision, and its header states what is deliberately not
  there (emission, reason codes, each stage's walk list).
- No capability-to-capability (sibling) reference: every new import is a flat `pharn/floor/` module.
- `stage-verify-core.mjs` imports only `gate-run-core.mjs`, which is pinned with an injected-import control.
  `loop-fresh-core.mjs` gains that one small module.
- `render-verify.mjs` also imports `stage-exit-core.mjs`, which imports nothing. This is BUILD deviation 2,
  disclosed.

## The orchestrator's checks, answered by execution

1. **A stale report surviving an early stop.** An earlier `verify-report.json`, `VERIFY.md` and progress record
   were planted, then 22 stops were driven, all as documented:
   - **everything survives:** a bad `--feature`, a missing one, a trailing one; `.pharn` or the feature directory
     as a symlink (`path-containment`). This is the named residual.
   - **everything is gone:** a bad `--timeout-ms`, an unknown flag, a positional, a trailing `--budget-ms`,
     `--gates ""`, `--gates ","` (`child-refused`), no `package.json` (the question), a crashing count, chain,
     completeness or verdict checker, and `git ls-files` failing. The record is gone too (the N1 order holds);
     the one exception is a verdict crash, which leaves THIS run's record (F1).
   - **each refusal** (`missing-artifact`, `chain-red`, `plan-files-unparseable`) → exit 3, a NEW refusal
     `VERIFY.md`, and no report.
   - **a failed removal:** the report path as a non-empty directory → exit 1 (EPERM), no document, no gate run; an
     uncleanable `.pharn/pharn-verify` → exit 1 (ENOTEMPTY).
2. **The question re-run line, run exactly as documented.**
   - The emitted `resume.argv` is the original argv; the options are `[["--gates","<value>"], null]`.
   - `node pharn/floor/stage-verify.mjs <resume.argv…> <option argv…>`, every value single-quoted with `'\''`,
     through `/bin/sh` with an answer carrying `'` and `"`, reached `done` with the answer as the gate id,
     byte-exact.
   - `--resume` after the question → `no-progress`, and `--resume` plus the option → `usage-error`: the 6.23.0 A1
     dead end is gone from the documented path.
   - No `package.json` plus an eval pair → still the question, never `child-refused`.
3. **Progress persisted across a kill, phase by phase.**
   - Mid-drain → record `drain`, `--resume` → `done` `PASS`; the stamp holds each gate once, and the killed gate was
     re-run once through the stale lock.
   - In verdict → record `verdict` → `done`. The verdict was `FAIL`, because the probe swapped `check-verify.mjs`
     after the anchor and `reconcile` correctly flagged that write.
   - In render, after the report's `rename` → record `verdict`, report present, `VERIFY.md` absent → `done`.
   - In render, before the report's `rename` → `done`.
   - In init, before the drain → no record → `no-progress`, as documented.
4. **`--resume` containment.** After a `continue`, the feature directory, `pharn/features`, `pharn` or
   `.pharn/pharn-verify` was swapped for a symlink to an outside directory. Each → exit 2 `path-containment`, and no
   file was added to the outside directory (its file list compared before and after). A gate that swaps the feature
   directory during the drain → `path-containment` at the render, and neither artifact appears in the outside
   directory (G9).
5. **Forged options against `validateStageExit`** — see L-trust.
6. **The budget and resume path.** Four project gates, one red, plus `reconcile`:
   - `--budget-ms 1` took 5 invocations, each advancing exactly one slow step; `verdict`, `failing_gates`, `gates`,
     `ac_gate` and `completeness` are identical to an unbudgeted run on an identical fixture;
   - per-gate side-effect counters read 1 each, and the stamp lists each gate once in order;
   - `--budget-ms 0`, then `--resume --budget-ms 570000`, finishes in one resume;
   - the clock: a `git` shim sleeping 3 s on `ls-files` stops the run after one gate in a 2.5 s window, where the
     control runs two. The opening work is charged.
   - Verify's `--resume` refuses a value-less `--budget-ms`, a duplicate number, `--gates`, `--feature`, `-5` and a
     positional, and the run still resumes to `done` afterwards.
7. **Claims stronger than the code** — F1–F5 and E1. Each fell to one probe. None touches a verdict.

**Consumers.**

- **`check-loop-fresh` A–J.** Over real `stage-regress.mjs` + `stage-verify.mjs` outputs in one fixture →
  exit 0 `FRESH` (A B C D J E H F G `pass`; I skipped without `--front`). Then:
  - `ac_gate` edited on an unmoved tree (the `--ac-gate` branch) → exit 4, E `report-verdict-mismatch`;
  - `verdict` forged with the tree moved (the flag-less branch) → exit 4, E;
  - the tree moved alone → exit 1 RERUN, F `tree-moved-since-verify`;
  - restored → `FRESH`;
  - a forged `completeness` block → `FRESH`, as documented: that block is advisory and E compares only `verdict`,
    `failing_gates`, `gates` and `ac_gate`.
- **`/pharn-ship` Step 2b.** A PLAN declaring an unbuilt path → exit 0 `done` with the report's `INCOMPLETE`,
  `completeness.missing` naming it, so the one rebuild stays reachable. The same plus a red gate → `FAIL`, and
  `VERIFY.md` still names the missing path (the A6 matrix). A glob-only `## Files` → `done` `INCONCLUSIVE`, with the
  reason fenced.
- **The G1 binding.** It is present in step 7 and Step 2b's re-read, and pinned. It is advisory by design (the model
  reads its own exit code). The stale-report residuals it answers (a pre-slug stop, `path-containment`) were
  reproduced in check 1.
- **The lift.** The base `1524c6f` `stage-regress.mjs` and the lifted one were run over identical fixtures, with
  fixture paths and base SHA normalized:
  - identical exit codes, stage-exit objects and `REGRESSION.md` bytes across 13 argv and resume cases,
    `--gates ","`, a `.pharn` symlink and the happy path;
  - a 4-invocation `--budget-ms 1` sequence: every stage-exit object identical, and the final report identical
    once its digests are masked;
  - the only differing bytes are the report's `gate_run` `fingerprint.final` and `stamp_sha256`, which differ
    because the two fixtures' floors differ;
  - `git diff --exit-code 1524c6f -- pharn/floor/stage-regress.test.mjs` → exit 0, and `run-gates.mjs`,
    `check-build-complete.mjs`, `check-loop.mjs`, `stage-regress-core.mjs`, `render-regression.mjs` and the hooks
    are untouched.
- **The disclosed behaviour change.** The pre-6.24.0 prose flow (runner `init`, `run --next`, then
  `check-verify.mjs --stamp … --ac-gate`) over a throwing `check-build-complete.mjs` committed before the anchor →
  exit 3 `INCOMPLETE`. The script, same fixture → exit 2 `child-crashed`, with no gate run. CHANGELOG [6.24.0] and
  `/pharn-ship` Step 2b say exactly this.

## Checked, no finding

- **The `4` bullet.** It says nothing slow has run and no record exists; after the question, no `gates/` and no
  `stage.json` exist.
- **Refusals write no report** — all three probed.
- **The two numbers.** `N < B < 600000`, and the thin command is 17,276 bytes (`wc -c`), under the 20,000 target.
- **The `done` object** validates (checked on the answered-question run), and its `verdict` equals the report's in
  every `done` probe that printed both.
- **GATE 1's two conditions.** The regress suite is byte-identical and green, and the crash change is named in the
  CHANGELOG and Step 2b.

## Merge notes (not findings against this increment)

- **The version collides with `main`.** `main`'s #278 took 6.24.0. 30 of the 39 files carry a `6.24.0` reference in
  their diff (CHANGELOG, `SKILLS_VERSION`, the README badge, `CLAUDE.md`, three contracts, four commands, the module
  headers, and test titles and messages). The later merge renumbers them by diff.
- **#278 is the 0.2 sibling.** The thin command carries none of the retracted Final-step phrase (the NAMED_LIMITS
  negative pin). Re-run `STAGE_SCRIPT_WIRING`'s executed A1 scope probe under #278's guard posture, and re-measure
  RULE B's domain, which sits exactly on its floor of 5 (G19).

## Suite re-run

- `npm test` in this worktree → exit 0: tests 3546, pass 3546, fail 0, skipped 0.
- The increment's own suites, run separately first: `stage-verify`, `stage-verify-core`, `render-verify`,
  `stage-runtime`, `stage-exit-core` and `stage-regress`, all green. `stage-verify.test.mjs` passed 28/28 as the
  mutation control.
- A green suite is not the evidence here. The probes above are, and E1 is a gap the suite does not see.

## Proposed lesson candidate (for a separate, human-gated `/pharn-dev-memory-promote` — not written here)

**L60 recurred, in an increment that cited it.**

- The PLAN applies L60 as "every ★ test names the edit that must turn it red and runs it", and its Evals give the ✧
  `NAMED_LIMITS` pin a delete-the-anchor mutant, which the suite runs. But the edit deletes every occurrence of a
  phrase, and the property is that ONE sentence survives.
- The transferable part: **a presence anchor pins a sentence only if it occurs once.** A delete-all-occurrences
  mutant proves the predicate, not the property.
- Candidate title: "A presence pin's anchor must be unique to the sentence it guards — assert its count is 1, or the
  delete-the-anchor mutant cannot remove the sentence alone."
- Candidate `type`: `process`. Candidate `concepts`: `[non-vacuity, test-blindspot, false-green, mutation-testing, doc-drift]`.
- Provenance: feature `stage-verify-script`; source this REVIEW.md E1 and its probe; commit = the review commit.
- Also recorded, not a new candidate: F2, F3 and F5 are unprobed quantified sentences outside the Guarantee audit.
  The audit's own claims held wherever this review probed them. That is one more occurrence for 6.23.0's pending
  "L37 recurred" candidate, at a lower severity this time.
