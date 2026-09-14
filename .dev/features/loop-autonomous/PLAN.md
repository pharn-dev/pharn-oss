# PLAN — loop-autonomous

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4
- applied_lessons: [L1, L7, L8, L19, L21, L22, L29, L33, L34, L36, L37, L38]
- increment: Rebuild the product `/pharn-loop` as a fully autonomous run — the model approves its own SPEC, retries any measurable red up to the cap (a reconcile red excepted), resolves mechanical stuck points by fixed rules and stops-and-reports on judgment ones, commits a `STOP_GREEN` result to a new local branch, reverts its own approval on every other stop, and ends with a summary instead of a question.
- layer(s): pharn-pipeline (the product commands), floor (`check-loop.mjs` decision table), pharn-contracts (`loop-record.md`, `verify-report.md` prose only), repo-meta
- constitution_refs: [P0, P2, P3, P5, P6, P7]

> **HONEST TRIGGER (P7) — no observed failure.** This increment answers the maintainer's explicit direction
> on 2026-09-14 ("it should be fully autonomic. ai should decide. just say that it finished and what was
> done at the end"), recorded as such rather than dressed in a manufactured failure — the
> `check-plan-lessons` sub-check D precedent.
>
> **Revision 2 (after `/pharn-dev-grill`, 2026-09-14).** `GRILL.md` raised 21 advisory concerns, two of
> blocking severity. The human chose to revise before building and decided items 8–10 below. Every finding's
> disposition is listed under `## Grill disposition`.

## Decisions already made by the human

1. **SPEC approval:** the model approves its own SPEC. The approval is recorded as the model's, never
   presented as a human sign-off.
2. **On a red:** fix and retry any measurable red (verify `FAIL` / `INCOMPLETE`, regress `regressions`)
   up to the cap; the stop stays a tested, deterministic decision. Narrowed by decision 9.
3. **When stuck:** the human first chose "pick a default", which violates P5/P6 (a fallback may not end in
   a guess). That was flagged, not auto-fixed, and the human then chose **fixed rules for the mechanical
   cases, stop-and-report on the rest**. No constitution change is needed or made.
4. **End of run:** a summary, plus a commit to a new local branch — no push, no merge.
5. **Bump size (GATE 1):** major, 5.1.2 → 6.0.0 — a shipped command's safety behavior reverses (no human
   approval gate, and it now commits).
6. **Which stops commit (GATE 1):** `STOP_GREEN` only. Every other stop creates no branch and no commit;
   its changes stay in the working tree and the final summary says so.
7. **Plan approval (GATE 1):** approved by the human with decisions 5 and 6 folded in. Built on branch
   `feat/loop-autonomous`.
8. **After the grill:** revise the plan with the fixes, then build.
9. **A reconcile red is terminal:** when verify is `FAIL` and its `failing_gates` contains the exact gate key
   `reconcile`, `check-loop.mjs` returns `STOP_TERMINAL`. Every other `FAIL` still retries.
10. **Model approval does not outlive a non-green run:** on every stop other than a successfully committed
    `STOP_GREEN`, `/pharn-loop` flips the SPEC back to `Draft`, so a human must approve before any stage
    reuses it. Inside a `STOP_GREEN` commit the SPEC stays `Approved` with `approved_by: model`, and the
    branch's human merge review is the check.

## Applied lessons

- L1 — Every meta-doc that states the loop's old behavior is named in `## Files`: `README.md` (quick-start,
  table row, diagram, loop sentence, token-cost bullet, badge), `CHANGELOG.md`, `SKILLS_VERSION`, the two
  sibling commands that describe the loop (`pharn-spec.md`, `pharn-ship.md`), and — added by the grill —
  both contracts whose prose the new behavior contradicts (`loop-record.md`, `verify-report.md`).
- L7 — `/pharn-loop`'s `writes:` grows to exactly the two files it writes itself with the Write/Edit tools:
  `pharn/features/<name>/SPEC.md` (the Draft revert only — the approval pin stays `/pharn-spec`'s write) and
  `pharn/features/<name>/LOOP.md`. It names no canon path and no downstream stage's target.
- L8 — The setter resolves one `--target` per call, so the command re-scopes immediately before each of its
  writes (the SPEC revert, the record, and the record's outcome rewrite after a failed commit).
- L19 — Every git step is a Bash call outside the fix #7 hooks. The command says so in its guarantee audit,
  and the commit runs after `/pharn-verify`'s reconcile gate has closed the epoch, so no claim is made that
  the hook or the reconciler covers it.
- L21 — The pre-run dirty-tree snapshot uses `git status --porcelain -uall`, so an untracked directory is
  recorded as its files, not as one directory entry.
- L22 — Branch-name collision, list building, staging, the commit and the failure recovery are pinned as
  literal command lines in the command, with the forbidden forms (`--no-verify`, `git push`, `git merge`)
  named in prose beside them rather than described vaguely.
- L29 — The stuck-point rules are ONE enumerated table (S1–S10) and the commit outcomes ONE closed set; the
  new `command-hygiene` pins iterate materialized arrays of both rather than asserting one member.
- L33 — The stale-prose sweep ran over invariant substrings (`self-approv`, `never commits`, `Design B`,
  `retryable-only`, `terminal failure`, `human gates`, `no human between`). The grill showed that sweep
  missed two contract statements and `LIMITS.md §1d`, because they carry none of those substrings; the
  revision adds `only file`, `verbatim`, `nothing else` and `never asked a human` to the sweep, and every
  shipped hit is either a `## Files` row or recorded under `## Doc reconciliation for the human`.
- L34 — S4 stops when gate discovery yields no gates instead of letting verify pass over an empty gate map;
  every rebuilt `check-loop.test.mjs` case carries a non-empty verdict pair; each new hygiene pin asserts its
  discovered domain is non-empty.
- L36 — The hygiene pins add CLOSURE assertions: every back-ticked `blocked: <id>` and `not committed: <x>`
  spelling the command writes must be a member of its enumerated set, so a variant fails, not only an
  absence.
- L37 — Claims that rest on external behavior are PROBED at build in a scratch repo, not read off docs:
  `git commit --pathspec-from-file` leaves other pre-staged content uncommitted; directory and `.` entries
  are filtered out before staging; the failure recovery returns the checkout to the original branch with
  nothing left staged; `check-spec.mjs` is GREEN on an Approved SPEC carrying `approved_by: model` and on the
  reverted Draft; `check-loop-record.mjs` is GREEN on a record carrying a `blocked:` frontmatter key.
- L38 — Step 6 never reuses the scope file an earlier stage left: it re-runs `set-writes-scope.cjs
--from-plan` and reads `.pharn/writes-scope.json` on the next line. The wider window an unattended run
  gives a second session to clobber that file is recorded under Trust audit as an enlarged residual (P7 —
  no remedy added).

## Files

- `.claude/commands/pharn-loop.md` — rewritten as the autonomous orchestrator (entry, spec via `/pharn-spec --model-approve`, stuck-point table, retry loop, stop handling with Draft revert, record, `STOP_GREEN` commit with failure recovery, final summary) — layer pharn-pipeline
- `pharn/floor/check-loop.mjs` — Design C table: retry any measurable red under the cap; inconclusive verdicts and a reconcile red are terminal; reads `failing_gates` only when verify is `FAIL`; header re-justifies staying separate from `check-ship.mjs` — layer floor
- `pharn/floor/check-loop.test.mjs` — ★ tests re-pinned to the new table, including the reconcile, malformed-`failing_gates` and exact-membership cases; fail-closed, review-independence and trust cases kept — layer floor
- `pharn/pharn-contracts/loop-record.md` — prose only: what `/pharn-loop` writes (SPEC revert + LOOP.md); the `commit` field names `HEAD` at record time, before the loop's own commit; `decision` is copied from the helper except on a blocked stop, which carries the ignored-extra-key `blocked:`; `iterations` for a stop before the first build; `STOP_TERMINAL`'s narrowed meaning and how pre-6.0.0 records used it; envelope, enum and template byte-identical — layer pharn-contracts
- `pharn/pharn-contracts/verify-report.md` — prose only: `check-loop.mjs` now also reads `failing_gates` for exact membership of `reconcile` when `verdict` is `FAIL`; the "each reads `verdict` and nothing else" statement and the dated probe section are corrected to say so — layer pharn-contracts
- `.claude/commands/pharn-spec.md` — Step 4 gains the `--model-approve` branch used only by `/pharn-loop` (skip the form, pin via Step 5, add `approved_by: model`); every "the model never self-approves" statement scoped to runs without that flag — layer pharn-pipeline
- `.claude/commands/pharn-ship.md` — the two passages describing `/pharn-loop` (attestation note, `--loop` deferral note) updated to the autonomous behavior — layer pharn-pipeline
- `.dev/floor/command-hygiene.test.mjs` — new `AUTONOMOUS_LOOP` pins with mutation controls: no interactive-ask token in `pharn-loop.md`; stuck-point ids S1–S10 presence + `blocked:` closure; commit-outcome set presence + closure; the commit block re-derives scope with `--from-plan` and commits with `--pathspec-from-file`; no fenced command line invokes `git push`, `git merge` or `--no-verify`; `pharn-spec.md` carries the `--model-approve` branch naming `approved_by: model` — layer apparatus
- `README.md` — the `/pharn-loop` quick-start paragraph, the command table row, the pipeline diagram edge labels and the loop sentence under it, the token-cost bullet, plus the version badge — layer repo-meta
- `CHANGELOG.md` — one entry at the top of `### Changed — BREAKING` under `[Unreleased]` — layer repo-meta
- `SKILLS_VERSION` — bump 5.1.2 → 6.0.0 (major, decision 5) — layer repo-meta

### Deliberately NOT in scope

- `pharn/floor/check-loop-record.mjs` and its test — `DECISION_ENUM` stays `{STOP_GREEN, STOP_CAP, STOP_TERMINAL, INCONCLUSIVE}`, and the contract already ignores extra frontmatter keys, so `blocked:` needs no checker change.
- `pharn/floor/check-ship.mjs`, `.claude/commands/pharn-dev-ship.md` — the dev loop is a separate core (Design A) and is unaffected.
- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` — human-only (fix #2). `LIMITS.md §1d` needs a human edit this increment cannot make; it is listed under `## Doc reconciliation for the human`, not recorded as unaffected.
- `CLAUDE.md` — zero sweep hits for the loop's gate, approval or commit behavior.
- `MIN_CLI` — no installed path moves and no frontmatter shape changes; the migrations griller confirmed the installer reads only `role` / `applies` from capability frontmatter and never parses a command's `writes:`, so an older CLI installs a working tree.
- `pharn.config.json` — `/pharn-loop`'s `model:` / `effort:` stay `sonnet` / `high`, so `check-model-config` agreement is unaffected.
- `.claude/commands/pharn-plan.md`, `pharn-grill.md`, `pharn-build.md`, `pharn-regress.md`, `pharn-verify.md` — their standalone behavior is unchanged; `/pharn-loop` maps their human asks to its table through its own turn semantics. `pharn-verify.md`'s premise that project gate commands are user-trusted is surfaced under `## Doc reconciliation for the human`.
- `pharn/pharn-contracts/regression-report.md` — `check-loop.mjs` still reads only its `verdict`.
- `docs/capabilities/**` and the README `CURRENT-STATE` region — `capability-catalog-core.mjs` renders no `description`; they list names only and no name changes; the build confirms with `npm run docs:check`.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — the record still conforms; only its prose about what the loop
  writes, the `commit` and `iterations` fields, the blocked-stop `decision` and `STOP_TERMINAL` is corrected
  (P4 — the command cites the contract, it does not restate it).
- `pharn/pharn-contracts/verify-report.md` — read for `.verdict` and, on `FAIL`, `.failing_gates`
  membership; its consumer prose is corrected to match.
- `pharn/pharn-contracts/regression-report.md` — read only for its `.verdict` enum, exactly as today.

## Design

### 1. The stop core — `check-loop.mjs`, "Design C: retry any measurable red, except a reconcile red"

Inputs unchanged: `{verify-report.json, regression-report.json, --iter, --cap}`; output keys unchanged.
Precedence, top-down (`v` = verify verdict, `r` = regress verdict, `fg` = verify `failing_gates`):

| condition                                                                                                     | decision        | exit |
| ------------------------------------------------------------------------------------------------------------- | --------------- | ---- |
| bad input (missing/unparseable report, enum miss, bad argv, or `v == FAIL` with `fg` not an array of strings) | `INCONCLUSIVE`  | 2    |
| `v == INCONCLUSIVE` or `r == inconclusive`                                                                    | `STOP_TERMINAL` | 4    |
| `v == FAIL` and `fg` contains the exact string `reconcile`                                                    | `STOP_TERMINAL` | 4    |
| `v == PASS` and `r == no-regressions`                                                                         | `STOP_GREEN`    | 0    |
| a measurable red (`v` in `{FAIL, INCOMPLETE}` or `r == regressions`), `iter < cap`                            | `CONTINUE`      | 3    |
| a measurable red, `iter >= cap`                                                                               | `STOP_CAP`      | 1    |

- **Why an inconclusive verdict stays terminal:** the stage could not measure, so a fix has nothing to be
  judged against, and retrying would spend iterations blind (P5 fail-closed).
- **Why a reconcile red is terminal (decision 9):** a retry re-enters `/pharn-build`, whose Step 0
  re-anchors the reconciliation baseline, and "each anchor RESETS the baseline, so a later one would erase an
  earlier escape" (`pharn-build.md` Step 0). Retrying would turn a detected Bash escape into a clean verify
  and a commit. The key is the literal gate id `/pharn-verify` writes into its results map
  (`"reconcile":<rc>`), matched by exact array membership — `structural:reconcile-x` does not count.
- **`fg` is read only when `v == FAIL`**, so a `PASS` / `INCOMPLETE` / `INCONCLUSIVE` report's
  `failing_gates` stays unread, as today.
- **Why it stays a separate file from `check-ship.mjs` (P3, grill A2):** the tables still differ on three
  axes — `INCOMPLETE` is accepted, `STOP_TERMINAL` (exit 4) exists, and a reconcile red is terminal — and
  folding them together would change the dev loop's Design A, a second reason to change one file. The header
  comment says this instead of the old "retries ONLY INCOMPLETE" justification.
- The record's decision enum is identical, so neither `check-loop-record.mjs` nor the contract template
  moves. **`STOP_TERMINAL` changes meaning** (grill M1): records written before 6.0.0 used it for a `FAIL`
  or regression stop; from 6.0.0 it means an inconclusive verdict or a reconcile red. The record has no
  version field and none is added (P7 — nothing branches on a prior record's `decision`; Step 1b reads only
  its Handoff). The contract states the change.

### 2. The stuck-point table (the ONE enumeration — L29)

Every human ask a sub-stage would make is replaced by exactly one row.

| id  | trigger                                                                                                                                                                       | rule                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | always, at entry                                                                                                                                                              | the model chooses a kebab-case slug; the candidate must match `^[a-z0-9][a-z0-9-]{0,63}$` before any other use; the description itself never enters a shell string; a failing candidate stops `blocked: no-slug`                      |
| S2  | `pharn/features/<slug>/` already exists                                                                                                                                       | append `-2`, `-3`, … and take the first absent directory; never overwrite                                                                                                                                                             |
| S3  | always, before the first stage                                                                                                                                                | capture the base SHA (`git rev-parse HEAD`) and the original checkout (`git symbolic-ref --short -q HEAD`, else detached at the base SHA); pass the SHA as `/pharn-regress --base`; a failed SHA capture stops `blocked: no-git-base` |
| S4  | gate discovery yields no gates (no `--gates`, allowlist ∩ scripts empty)                                                                                                      | stop `blocked: no-gates` — never run verify over an empty gate map                                                                                                                                                                    |
| S5  | `/pharn-build` seam-config extraction or `check-seam-config.mjs` is non-zero                                                                                                  | stop `blocked: seam-config` — never substitute the default policy                                                                                                                                                                     |
| S6  | the description cannot fill the SPEC's required sections without invented intent                                                                                              | stop `blocked: thin-intent`                                                                                                                                                                                                           |
| S7  | the build finds the plan ambiguous (judgment)                                                                                                                                 | stop `blocked: plan-ambiguity`                                                                                                                                                                                                        |
| S8  | the seam resolver's walk reaches `ask`                                                                                                                                        | stop `blocked: seam-unresolved`                                                                                                                                                                                                       |
| S9  | a stage refuses before emitting its verdict (missing artifact, RED chain, RED lessons declaration, no parseable `## Files`, an unresolved `## Open questions (HALT)` heading) | stop `blocked: stage-refused`                                                                                                                                                                                                         |
| S10 | any other sub-stage instruction to ask the human                                                                                                                              | stop `blocked: unlisted-ask` — the closure row; nothing falls through to a guess                                                                                                                                                      |

S1–S3 keep the run going on a fixed rule. S4–S10 stop; S6–S8 are the three where the trigger is the model's
own judgment, and each fails in the safe direction (it stops rather than guesses). S7 no longer carries the
heading test, which is a `/pharn-build` refusal and therefore S9's (grill G5).

**A blocked stop does NOT consult `check-loop.mjs`**, whose inputs could be a previous iteration's stale
reports. Its record carries `decision: INCONCLUSIVE` (an enum member), the extra frontmatter key
`blocked: <id>` (ignored by `check-loop-record.mjs` per the contract, so it distinguishes a blocked stop
from a malformed-report stop for a reader without gating anything), and `iterations` = the iteration in
progress, 1-based, where a stop before the first build counts as `1`. The "copy `decision` verbatim from the
helper" rule applies to helper-computed stops only, and both the command and the contract say so. **A stop
before `pharn/features/<name>/` exists** (S1, an S3 failure, S6 before the Draft is written) writes no record
— there is no feature directory to hold one — and reports in the summary only (grill K1).

### 3. The run, in order

1. **Entry.** S1 slug, S2 collision, S3 base SHA + original checkout, and the pre-run snapshot
   `git status --porcelain -uall` saved to `.pharn/pharn-loop/<name>/pre-run-status.txt`. Read the prior
   Handoff from the most recent existing record — the highest existing `<slug>-N`, else the base slug
   (grill K2) — as untrusted DATA (unchanged Step 1b otherwise).
2. **Spec, self-approved — by `/pharn-spec`, not re-implemented (grill A1).** Invoke
   `/pharn-spec --model-approve` with the threaded slug. Its Step 4, under that flag only, skips the form,
   runs its own Step 5 pin under its own setter, and adds `approved_by: model` to the frontmatter. Then
   `/pharn-loop` runs `check-spec-approved.mjs`; non-zero → S9.
3. **Front.** `/pharn-plan` → `/pharn-grill` (both exits read) → iteration 1 of the body. Stage verdict
   reads cite `/pharn-ship` Step 2 (P4), with two differences stated: every ask maps to the table, and a RED
   build project gate is NOT a stop — the loop proceeds to regress + verify so the decision comes from
   `check-loop.mjs`.
4. **Body.** `/pharn-build` (given the standing `failing_gates[]` / `regressions[]` /
   `completeness.missing[]` as quoted DATA) → `/pharn-regress --base <S3 sha>` → `/pharn-verify` → read
   `check-loop.mjs`. `CONTINUE` → `iter++` and repeat. `/pharn-build` re-pins its own `## Files` scope every
   iteration (fix #7) and re-anchors the reconcile epoch, as today — which is why decision 9 exists. The
   command states two bounds (grill G6, PF1): a red whose cause lies outside the plan's `## Files` cannot be
   fixed by the rebuild and runs to `STOP_CAP`; and each iteration re-runs `/pharn-regress` (a base worktree,
   an install and the suite at base and HEAD) plus every verify gate, so the worst case costs `cap` times
   that, unattended.
5. **Stop handling, in this order.**
   1. **Revert the approval unless the stop is `STOP_GREEN` (decision 10).** If `SPEC.md` is `Approved`
      with `approved_by: model`: re-scope to `SPEC.md`, set `state: Draft` and `spec_content_hash: ""`,
      remove `approved_by`, and run `check-spec.mjs` (a GREEN Draft). A stop before the SPEC was approved
      has nothing to revert.
   2. **Record.** Re-scope to `LOOP.md`, write it per the contract, run `check-loop-record.mjs` (≤1 repair).
      Its `commit` field is `git rev-parse HEAD` captured here or the literal `unknown` — never the loop's
      own commit, which would have to name the commit containing it. Its body carries an `## Outcome`
      section: the commit outcome from the closed set below (for `STOP_GREEN`, the expected
      `committed <branch>`, rewritten on failure), the SPEC state (`approved by the model` |
      `reverted to Draft`), and the `blocked:` id if any — so the outcome is durable on disk, not only in
      the summary (grill O1).
   3. **Commit — `STOP_GREEN` only (decision 6; pinned lines, Bash).**
      - Re-derive the plan scope — `node .claude/hooks/set-writes-scope.cjs --from-plan
pharn/features/<name>/PLAN.md` — and read `.pharn/writes-scope.json`'s `scope` on the next line
        (L38; grill G1).
      - Build a NUL-separated list at `.pharn/pharn-loop/<name>/stage.list`: keep a scope entry only if it
        is a regular file, or a path tracked at `HEAD` that is now absent (a deletion); drop `.`,
        directories and anything else; drop git-ignored paths (`git check-ignore -q`); then append the
        feature's artifact files that exist, by name (`SPEC.md`, `PLAN.md`, `GRILL.md`, `BUILD.md`,
        `REGRESSION.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`, `LOOP.md`) — never
        the directory (grill S-2).
      - Empty list → `not committed: nothing staged`.
      - `git switch -c pharn-loop/<name>` (first absent of `-2`, `-3`, …); failure →
        `not committed: branch failed`.
      - `git add -A --pathspec-from-file=<list> --pathspec-file-nul`; failure → `not committed: stage failed`.
      - `git commit --pathspec-from-file=<list> --pathspec-file-nul` with subject
        `pharn-loop(<name>): STOP_GREEN after <N> iteration(s)` and a body stating the SPEC was
        model-approved and nothing was merged or pushed. The pathspec form commits only the listed paths, so
        content the user had already staged stays staged and uncommitted. Hooks run; failure →
        `not committed: commit failed`. Never `--no-verify`, never `git push`, never `git merge`.
      - Not a git repo → `not committed: not a git repo`.
   4. **Recovery after `branch failed` / `stage failed` / `commit failed` (grill E2).** Unstage only the
      run's list (`git reset -q --pathspec-from-file=<list> --pathspec-file-nul`), return to the original
      checkout (`git switch <branch>`, or `git switch --detach <base sha>`), and delete the new branch with
      the safe `git branch -d` (it holds no new commit). Then apply 5.1's revert (no commit happened, so
      there is no review point) and rewrite the record's `## Outcome` lines under a fresh `LOOP.md` re-scope,
      re-running `check-loop-record.mjs`. The same revert applies to `not a git repo` and `nothing staged`.
6. **Summary, then end the turn — no question.** Finished; decision; iterations; `blocked:` id if any; files
   changed; per-iteration verdicts; the commit outcome from the closed set —
   `committed <branch>` | `not committed: <decision>` | `not committed: nothing staged` |
   `not committed: not a git repo` | `not committed: branch failed` | `not committed: stage failed` |
   `not committed: commit failed`; the end-of-run checkout (grill G4): after a commit the checkout stays on
   `pharn-loop/<name>` and the summary names the original branch to return to, otherwise it is the original
   checkout; paths from the pre-run snapshot that the commit included; the SPEC state. Then
   `set-writes-scope.cjs --clear`.

## Evals to write (P1)

- None, by membership test: no file in `## Files` carries a `role:` key and none gains one, so the
  Capability eval obligation does not attach. The floor coverage is `check-loop.test.mjs`:
  - ★ `PASS` ∧ `no-regressions` → `STOP_GREEN` (0)
  - ★ `FAIL` (`["test"]`) ∧ `no-regressions`, under cap → `CONTINUE` (3) — the case Design B made terminal
  - ★ `FAIL` (`["reconcile"]`) ∧ `no-regressions`, under cap → `STOP_TERMINAL` (4); `["lint", "reconcile"]` → 4
  - ★ exact membership: `FAIL` (`["structural:reconcile-x"]`) under cap → `CONTINUE` (3)
  - ★ `FAIL` with `failing_gates` missing, not an array, or holding a non-string → `INCONCLUSIVE` (2)
  - ★ `PASS` ∧ `regressions`, under cap → `CONTINUE` (3); at cap → `STOP_CAP` (1)
  - ★ `INCOMPLETE` ∧ `no-regressions`, under cap → `CONTINUE` (3); at cap → `STOP_CAP` (1)
  - ★ `INCOMPLETE` ∧ `regressions`, under cap → `CONTINUE` (3)
  - ★ `FAIL` at cap → `STOP_CAP` (1); off-by-one `cap-1` → 3, `cap` → 1
  - ★ `v == INCONCLUSIVE` → `STOP_TERMINAL` (4); `r == inconclusive` → 4
  - ★ precedence: `FAIL` ∧ `inconclusive` → 4 (inconclusive beats a measurable red)
  - existing fail-closed argv/report cases → `INCONCLUSIVE` (2), unchanged
  - ★ review-independence key set unchanged and the poisoned-free-text trust case, retargeted to the new table
- `command-hygiene.test.mjs` pins listed in `## Files`, each with a mutation control (L4 house pattern) and
  a non-empty-domain assertion (L34).
- **Named residual (grill T1):** the staging filter, the Draft revert and the failure recovery are command
  prose, which nothing in this repo can execute (commands are not runnable capabilities). They get presence
  pins plus the one-time scratch-repo probes under L37, recorded in the build's notes — not a committed
  behavioral test. A committed harness for command git steps is not built (P7).

## Guarantee audit (P0)

- "The loop stops on the decision table above" → floor: enum-regex (`check-loop.mjs`, tested).
- "A reconcile red is never retried" → floor: exact membership of `reconcile` in `failing_gates` when `v` is
  `FAIL` (`check-loop.mjs`, tested) — bounded by `/pharn-verify` actually running the gate and writing that
  key, which is orchestration (advisory).
- "At most N iterations" → floor compare over an agent-supplied `--iter`; the bound on the AGENT stays
  advisory (`LIMITS.md §1d`), unchanged from today.
- "A fix never writes outside the plan's `## Files`" → floor: hook (fix #7, owned by `/pharn-build`'s own
  setter, each iteration) — for the Write/Edit/MultiEdit/NotebookEdit surface only.
- "A Bash write by a fix is caught" → floor: content-hash (`check-bash-reconcile.mjs` at `/pharn-verify`),
  detection only, non-adversarial, as the reconciliation contract states — and now also not erased by a
  retry, because a reconcile red is terminal.
- "The SPEC is approved" → advisory. `/pharn-spec --model-approve` approves; `approved_by: model` sits in the
  frontmatter, outside the body hash, so it is neither gated nor tamper-evident. Its absence proves nothing
  about a human.
- "A non-green stop leaves no model-approved SPEC behind" → advisory (the revert is agent-performed); the
  reverted file's `Draft` shape is floor (`check-spec.mjs`). Forgery stays `LIMITS.md §1d`.
- "Every sub-stage ask maps to a table row" → advisory command prose; the hygiene pin proves the rows and
  the closure spelling are PRESENT in the command, never that a run obeyed them.
- "The loop never asks the human" → advisory; the pin proves no interactive-ask token is in the command.
- "The commit contains only regular files from the plan's `## Files` plus the named artifacts" → advisory
  (Bash, L19); the pinned lines are present, the pathspec semantics are probed once at build, and nothing on
  the floor enforces either.
- "Only a `STOP_GREEN` commits" → the `decision` it branches on is floor (`check-loop.mjs` exit 0); skipping
  the commit on every other decision is advisory command prose.
- "Nothing is pushed or merged" → advisory; the pin proves no fenced command line invokes them, never that a
  run did not type them.
- "The checkout returns to the original branch after a failed commit" → advisory (Bash), probed once at build.
- "`/pharn-loop` finished" means exactly: a stop was reached and recorded. STRUCK: "the feature is good",
  "a human approved the intent", "the fix converged".

## Trust audit (P2)

- **Untrusted prose now reaches an approved pin with no human reading it.** The description (untrusted, per
  `/pharn-spec`) becomes an Approved SPEC, a PLAN, a writes-scope and code in one unattended turn.
  Instruction-looking content in it can steer what is built. Bounded by: fix #7 per build (but the scope
  itself derives from that input), the canon denylist, reconcile detection at verify (not erasable by a
  retry), the Draft revert on every non-green stop, no push or merge, and the human still standing between
  the branch and a merge. **This increment enlarges the residual** (`LIMITS.md §2`, `THREAT-MODEL.md §5`)
  and the command says so.
- **Code built from unread intent is EXECUTED before any human sees it (grill S-3).** `/pharn-verify`'s
  project gates, `/pharn-regress`'s suite and the repo's commit hooks run code the model wrote — possibly
  including a `package.json` script, if the plan lists that file — with pre-egress still unbuilt. The
  command states it; nothing bounds it beyond fix #7's write scope.
- **The staging list derives from untrusted input (grill S-2).** Filtering to regular files and dropping
  ignored paths removes the `.` / directory sweep, but a plan that explicitly lists a tracked, non-ignored
  file the user edited before the run commits that edit; the summary names such paths from the pre-run
  snapshot.
- **The slug is model-chosen and regex-validated; the description never enters a shell string (grill S-1).**
  The residual: the validation command itself carries the candidate, so a candidate containing a quote
  character must be refused by the model before it is typed — advisory.
- **A prior run's Handoff now informs an unattended run.** Still quoted as DATA, still branches nothing —
  but no human reads it first. Enlarged, stated.
- **The commit message carries no free text.** Only the S1-validated slug, an enum decision and an integer.
- **L38 residual, enlarged:** a longer unattended run means a longer window for a second session to
  overwrite `.pharn/writes-scope.json`; Step 6's re-derivation narrows the window to one line, not to zero.

## Determinism audit (P5)

- Stop/continue: `check-loop.mjs` exit code only.
- S1 regex, S2 directory existence, S3 exit code, S4 empty-set test, S5/S9 exit codes and heading presence,
  the staging filter (file test, `HEAD` tracking, `check-ignore`) and the commit outcome (exit codes) —
  membership tests. S6, S7 and S8 are judgment-triggered, and each ends in a STOP, never a guess.
- The terminal fallback on every stuck point is a stop whose final summary asks for what the run needs —
  P5's "ask the human", delivered when the run halts rather than mid-run (P6: it halts on ambiguity).

## Doc reconciliation for the human (reported, never agent-edited)

- **`LIMITS.md §1d`** describes a self-stamped `Approved` as the act of "a non-compliant or prompt-injected
  agent that never asked a human". After this increment a shipped command does it by design, and the
  section's backstop list should name the Draft revert and the branch merge review. Human-only (fix #2); the
  command's own doc-reconciliation section repeats this.
- **`pharn-verify.md`'s trust note** treats project gate commands as user-trusted on the premise of
  human-approved intent. Under `/pharn-loop` that premise no longer holds. Not a trusted doc, but outside this
  plan's `## Files`; recorded as a follow-up rather than silently widened.

## Grill disposition

- G1 staging source (blocking) → Design §3.5.3: re-derive with `--from-plan` on the line before the read.
- C2 reconcile laundering (blocking) → decision 9, Design §1, tests.
- G2 contract statements → `loop-record.md` row in `## Files`.
- G3 `LIMITS.md §1d` → `## Doc reconciliation for the human`.
- G4 end-of-run checkout → Design §3.6.
- G5 S7/S9 overlap → Design §2.
- G6 reds outside `## Files` → Design §3.4.
- G7 four behaviors in one increment → accepted: all four are the maintainer's explicit direction; the
  CHANGELOG entry lists them separately so a regression can be traced to one.
- A1 spec pin re-implemented → Design §3.2: `/pharn-spec --model-approve`.
- A2 separation from `check-ship.mjs` → Design §1.
- K1 pre-build blocked stops → Design §2.
- K2 Handoff from the base slug → Design §3.1.
- E2 git failure paths → Design §3.5.3–3.5.4.
- O1 outcome not durable → Design §3.5.2 `## Outcome`; `blocked:` key.
- S-1 slug input → Design §2 S1; Trust audit.
- S-2 staging `.` / pre-staged index → Design §3.5.3; Trust audit.
- S-3 gates and hooks execute unread code → Trust audit; `## Doc reconciliation for the human`.
- S-4 model approval outlives the run → decision 10, Design §3.5.1.
- T1 riskiest behaviors untested → new test cases; named residual under `## Evals to write`.
- M1 `STOP_TERMINAL` meaning → Design §1; `loop-record.md` row.
- PF1 unattended cost → Design §3.4.

## Resolved at GATE 1 and after the grill (2026-09-14)

The two GATE-1 questions are decisions 5 and 6; the three post-grill questions are decisions 8–10. No open
questions remain.
