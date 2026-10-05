# PLAN — loop-closeout-script: `/pharn-loop` and `/pharn-ship` run their deterministic close as ONE tested script each

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L19, L22, L29, L35, L41, L44, L45, L54, L60, L62]
- increment: after the model writes `LOOP.md`, `/pharn-loop`'s close runs one pinned line,
  `pharn/floor/loop-closeout.mjs`, that performs the deterministic tail of Steps 6b–6c, Step 7's freshness-ledger
  print and the Final step's two releases in today's order and returns ONE closed outcome by a distinct exit code;
  `/pharn-ship`'s Step 3a's six pinned lines become one line, `pharn/floor/ship-closeout.mjs`; the steps the two share
  (the run-stop marker, the ledger, its check, the run report) live once in `pharn/floor/closeout-core.mjs`.
- layer(s): `pharn/floor/` (three new modules + tests), the product `.claude/commands/` surface (the two close parts
  only), build apparatus (the pins that cover the close parts), repo meta (`CLAUDE.md`, `CHANGELOG.md`,
  `SKILLS_VERSION`, README badge).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7) — the recorded trigger, measured this run

Batch item 7 (C2 of `.dev/measurements/pipeline-performance-audit-2026-09-29.md`, the named follow-up
`ship-closeout-script`). The audit's §4.1 counts the loop's green close at **16 pinned blocks** (6b 8, 6c 5, Step 7 1,
Final 2), each its own Bash call and so its own model request re-sending the orchestrator's whole context.

Re-measured this run (P6), read-only, from the 92-minute run's orchestrator transcript
(`~/.claude/projects/-Users-pgalarowicz-Projects-pharn-starter/f4b646c1-…jsonl`, method
`.pharn/pharn-dev-plan/closeout-measure.mjs`, scratch, not committed):

- **Static count, this tree (`pharn-loop-close.md`):** green path = 16 fenced blocks + Step 6c's mandated post-commit
  `git rev-parse HEAD` = **17 Bash requests** after Step 5 (the `LOOP.md` Write, the contract Read and Step 7's reads
  are model work and stay). A non-blocked non-green stop = 11; a blocked stop = 10. `/pharn-ship` Step 3a = **6**.
- **That run took the BLOCKED close** (S10, `unlisted-ask`). From marker 16's tool result (10:09:57.189Z) to the
  releases' tool result (10:10:31.313Z): **6 requests, 34.1 s**, all on `claude-opus-5-5`, each carrying
  **498,262–503,007 tokens** of context (cache read 497,440–503,007). Model time per request: 4.31, 3.26, 2.79,
  **13.41 (the `LOOP.md` Write)**, 3.99, 2.13 s — the five non-Write requests average **3.30 s** [R·m]. The model had
  already chained Step 6b's five tail lines into one Bash call and the two releases into another, against the
  one-block-per-call prose — evidence that the prose's call count is what a careful model fights, not what it needs.
- **Orchestrator per-request model time, whole run** (`loop-wall-clock-2026-10-05.md` §4): median 3.1 s, mean 4.4 s,
  p90 6.0 s over 52 requests [R·m].

**The audit's pre-registered confirm-first bar is met by 1 of 3 runs, not by "the run above" (correction, P6).** C2
reads "in real ledgers, `orchestrator`-role requests (the run's own context) are at least 20% of a run's requests".
From each `cost.json` (`requests[]`, main context / all): `billing-plan-catalog` 52/341 = **15.2%**,
`workspace-wording-ui` 33/222 = **14.9%**, `locales-en-pl-only` 32/151 = **21.2%** [R·m]. The batch brief says the
condition is met; for C2 it is met by the quick run only. This plan proceeds because the user asked for all nine
items, and states the saving at its real, small size (below). A second, non-latency reason stands on its own: the
green commit's branch, staging and undo are today **model-executed prose** that only an unattended run reaches, which
is L44's recorded failure class; as tested code they are executed by the suite every run.

## Design

### Where the line runs, and what stays model work

| close part step              | today (each block one Bash call)                                          | after                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 6a revert (non-green only)   | setter+amend, Edit, `check-spec.mjs`                                      | **unchanged**                                                                                                |
| 6b, before the record        | setter+amend; `git rev-parse HEAD`                                        | **unchanged** (both must precede the model's Write — audit C2)                                               |
| 6b, the record               | model Write of `LOOP.md` (contract read first)                            | **unchanged**                                                                                                |
| 6b tail                      | record check (≤1 repair), decision check, run-stop, ledger, check, report | **`loop-closeout.mjs`**                                                                                      |
| 6c                           | freshness, setter+amend, staging builder, branch, add+commit, `rev-parse` | **`loop-closeout.mjs`**                                                                                      |
| 6d.1 undo                    | reset, `checkout - --`, `branch -d`                                       | **`loop-closeout.mjs`**                                                                                      |
| 6d.2–3                       | revert SPEC, rewrite `## Outcome`, re-check record                        | **unchanged** (Write-tool writes, kept under fix #7)                                                         |
| Step 7 `cat freshness.jsonl` | one Bash call                                                             | printed by `loop-closeout.mjs`                                                                               |
| Final `--clear`, `--close`   | two Bash calls                                                            | run by `loop-closeout.mjs` when no model write follows (exit 0/3); kept as pinned lines for every other path |
| ship Step 3a items 1–4       | six Bash calls                                                            | **`ship-closeout.mjs`**                                                                                      |

### `pharn/floor/loop-closeout.mjs --feature '<name>' --base '<base sha>' [--after-repair]`

Argv validated before any side effect: `--feature` a `gate-run-core.mjs` `FEATURE_SLUG_RE` member, `--base` a
`SHA_RE` member (both imported — the one owner, L35), no other flag; `pharn/features/<name>/` an lstat directory.
Any refusal → **exit 2, nothing run**. Then, in today's order (each child spawned as an argv vector, node by
`process.execPath`, floor children resolved from the script's own directory, hooks from the invoking directory as the
pinned lines did — no shell, no new input reaches a shell):

1. `check-loop-record.mjs pharn/features/<name>/LOOP.md`. RED and no `--after-repair` → **exit 5, nothing else run**
   (the ≤1 repair moves from prose to an argv round trip; still advisory — the model may pass the flag at once).
2. Read the envelope (`decision`, `mode`, `blocked`, `iterations`) with `frontmatter-core.mjs`'s `FM_RE`/`stripBom`
   and the checkers' own line grammar and `cleanScalar` guard (L14 composed, never replaced). A field outside its
   enum/regex reads as unreadable.
3. Not blocked → `check-loop-decision.mjs <LOOP.md>`; exit 0 GREEN, any other RED (a crash included, as today).
   Blocked → `N/A`, not run.
4. `mark-phase.mjs --name <name> --kind run-stop` — its printed line echoed **unindented**, so the transcript still
   holds the whole marker line the cost ledger's run membership reads back (`run-window/2`, rule 6).
5. `render-cost-ledger.mjs <name> --command /pharn-loop --base-sha <base>`; non-zero → `ledger: not-emitted`.
6. Emitted only → `check-cost-ledger.mjs pharn/features/<name>/cost.json` (today the prose says to disregard its
   verdict when nothing was emitted; skipping it is the same outcome, stated).
7. `render-run-report.mjs <name> --base pharn/features` unless the record's `mode` is `quick` (quick-part item 8 —
   the record's mode IS the invocation, Step 6b's capture rule).
8. **The green gate**, enum membership over the record: `decision ∈ {STOP_GREEN, STOP_GREEN_QUICK}`, no `blocked`.
   - not green → `not committed: <decision>` → releases → **exit 3**;
   - green and decision check RED, or the token disagrees with the record's mode, or the decision unreadable →
     `not committed: decision unverifiable` → **exit 4**.
9. `check-loop-fresh.mjs --feature <name> --base <base> --commit-gate --front`; non-zero → `evidence stale`, exit 4.
10. `set-writes-scope.cjs --from-plan pharn/features/<name>/PLAN.md`; non-zero → `stage failed`, exit 4. Then
    `reconcile-baseline.mjs --amend-scope` (its exit reported, never gating — exit 2 "no baseline" is harmless, as
    today).
11. The staging list — today's inline builder **moved verbatim into a function** (same `set_by` check → `stage failed`,
    same lock/pinned-test refusal → `stage failed`, same artifact array, same regular-file / tracked-deletion /
    not-ignored rule, same order and de-dup). Written NUL-separated to `.pharn/pharn-loop/<name>/stage.list` after a
    `stage-runtime.mjs` `containmentWalk` (lstat; L54) — stricter than today's shell redirect. Empty → `nothing
staged`, exit 4.
12. Branch: the first of `pharn-loop/<name>`, `-2`, … that `git show-ref --verify --quiet refs/heads/<b>` reports
    absent, then `git switch -c <b>`; non-zero → `branch failed`, exit 4.
13. `GIT_LITERAL_PATHSPECS=1 git add -A --pathspec-from-file=<list> --pathspec-file-nul`, then `… git commit
--pathspec-from-file=<list> --pathspec-file-nul -m 'pharn-loop(<name>): <decision> after <N> iteration(s)' -m
'<today's second line>'` — `<decision>` and `<N>` are the record's enum token and `^\d+$` value, never model-typed.
    Hooks run; never `--no-verify`, never push or merge. Non-zero add → `stage failed`; commit → `commit failed`; both
    followed by today's undo (`reset -q --pathspec-from-file …`, `checkout - --`, `branch -d <b>`), exit 4. Success →
    `git rev-parse HEAD` → `committed <b>`, exit 0.
14. Print `.pharn/pharn-loop/<name>/freshness.jsonl` (a regular file, lstat) or `no re-runs`.
15. Exit 0 or 3 only: `set-writes-scope.cjs --clear`, then `require-loop-record.cjs --close <name>` (today's Final
    order); their exits reported as `released`.

Every child's output is echoed indented under a `── <step> (exit N)` header (untrusted DATA; a child line can never
start at column 0). The **last line** is one JSON document, closed keys both ways (validated in tests):
`{schema: "pharn-loop-closeout/1", feature, exit, outcome, decision, mode, blocked, record_check, decision_check,
ledger, ledger_check, report, freshness, branch, commit, checkout, released}`. `outcome` is a member of the existing
closed set (Step 7), never a new spelling. **Control flow reads the exit code only** (P5).

**Exit codes, one class each:** 0 committed · 3 not committed, terminal (non-green) · 4 not committed on a green stop
(undo done; the model runs Step 6d.2–3 then the Final step) · 5 record RED, repair first · 2 refused, nothing ran ·
anything else, 1 included, a crash — never read as a commit decision. Every spawn and git call returns a status object;
the one top-level `catch` sets exit 1 (crash) and prints the phase reached to stderr. A crash's handling in the close
part: report it and `git status --short --branch` verbatim, commit nothing and run none of its steps by hand, then
Step 6d.2–3 with `not committed: stage failed` and the Final step.

### `pharn/floor/ship-closeout.mjs --feature '<name>'`

Exit 2 on a bad argv (nothing run). Then, in today's order: run-stop marker (echoed unindented); `run-marker.mjs
--close pharn-ship <name>`; `git rev-parse HEAD` (via `stage-runtime.mjs` `gitSync`; `unknown` on failure); the shared
ledger, check and report (report skipped when the run's own run-start marker carries `mode: quick` — `ship-outcome-core.mjs`
`runMode()` over `render-cost-ledger.mjs` `readMarkers()`, the same record the ledger's `outcome` reads). Exit 0 =
every item attempted (none gates — today's Step 3a gates nothing). Last line `{schema: "pharn-ship-closeout/1", feature,
exit, mode, run_stop, run_marker_close, base_sha, ledger, ledger_check, report}`. **No git write in this module or the
core** — pinned by a source scan (ship's claim "every git call here is a read" stays true by construction).

### `pharn/floor/closeout-core.mjs` — the shared half (L35)

`runNode(script, args)` (absolute floor path, argv vector, captured), the echo formatter, `runStop(name)`, and
`ledgerTail({name, command, baseSha, quick})` = steps 5–7 above. Pure enough to unit-test; no git. The two diverging
tails stay in their own modules (P3: the loop's changes when its commit changes, ship's when its attestation boundary
does).

### The close parts (only these two command files are edited)

- `pharn-loop-close.md`: 6b keeps its capture rules and the two pre-Write blocks; the record-check, decision-check,
  run-stop, ledger and report fences become ONE pinned closeout line plus a numbered list naming what it runs and the
  exit-code mapping; the existing `(SKIPPED in\nQuick mode — …)` pointer and every Step 7 sentence the suites pin are
  kept verbatim. 6c becomes prose (what the closeout does on a green stop; every outcome spelling unchanged). 6d keeps
  2–3 and gains a fenced `check-loop-record.mjs` re-run line. Step 7 reads the outcome, branch, SHA and checkout from
  the document instead of re-deriving them. The Final step stays (for exit 4, 2, a crash, and a stop with no feature
  directory) and says the closeout already ran it on exit 0/3. The claims block's git bullet is rewritten (below).
- `pharn-ship-close.md`: Step 3a items 1–4 become one pinned line plus the same numbered items (item 4 keeps "SKIPPED in
  Quick mode — see `## Quick mode` item 12 above"), so `pharn-ship-quick.md` item 12 stays true unedited. Item 5 and
  the claims block are re-pointed.
- `pharn-loop.md`, `pharn-ship.md` and both quick parts are **not edited**.

## Files

- `pharn/floor/closeout-core.mjs` — the shared ledger tail, child runner and echo formatter — product floor
- `pharn/floor/closeout-core.test.mjs` — its tests — test
- `pharn/floor/loop-closeout.mjs` — the loop's close (record, decision, ledger, freshness, scope, list, branch, commit, undo, releases) — product floor
- `pharn/floor/loop-closeout.test.mjs` — its tests, incl. the executed branch/undo cases moved from the hygiene suite — test
- `pharn/floor/ship-closeout.mjs` — ship's Step 3a — product floor
- `pharn/floor/ship-closeout.test.mjs` — its tests — test
- `.claude/commands/pharn-loop-close.md` — Steps 6b–7 and Final re-pointed to the closeout; claims block — product command part
- `.claude/commands/pharn-ship-close.md` — Step 3a re-pointed; claims block — product command part
- `.dev/floor/command-hygiene.test.mjs` — the close-part pins re-pointed: phase-marker obligations, the loop commit and freshness wiring, run-marker close, SHELL_VALUES (`<branch>`, `<decision>` leave), SHELL-SINK 7 (moved), the quick-forbidden render literal — apparatus test
- `.dev/floor/command-family.test.mjs` — only if an R6/R7 anchor moves — apparatus test
- `pharn/floor/render-run-report.test.mjs` — the staging-list site and the RENDERER_INVOKERS wiring re-pointed to the closeout scripts — test
- `pharn/floor/render-regression.test.mjs` — the staging-list site re-pointed — test
- `pharn/floor/render-verify.test.mjs` — the staging-list site re-pointed — test
- `pharn/floor/run-marker.test.mjs` — ship's executed CLOSE wiring re-pointed to the closeout line — test
- `pharn/floor/check-loop-fresh.test.mjs` — the executed commit-gate pin reads the closeout's exported argv — test
- `pharn/floor/stage-runtime.test.mjs` — ★ GIT CEILING map gains `loop-closeout.mjs` — test
- `pharn/floor/frontmatter-core.test.mjs` — CONSUMERS gains `loop-closeout.mjs` — test
- `CLAUDE.md` — one Commands entry for the two closeout lines — repo meta
- `CHANGELOG.md` — the 6.42.0 section (provisional) — repo meta
- `SKILLS_VERSION` — 6.38.0 → 6.42.0 (provisional; minor: new floor scripts and command behaviour) — repo meta
- `README.md` — the version badge — repo meta
- `docs/capabilities/**` and the README `CURRENT-STATE` region — regenerated by `npm run docs:generate` if they list floor modules — generated
- `.dev/features/loop-closeout-script/PLAN.md`, `GRILL.md`, `BUILD.md`, `REGRESSION.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`, `REVIEW.md`, `SHIP.md` — this increment's record — apparatus

### Not in this increment (named)

- `pharn-loop.md`, `pharn-ship.md`, `pharn-loop-quick.md`, `pharn-ship-quick.md` (other builders are editing the
  first two; the quick parts stay true unedited).
- The 6a revert and 6d.2–3 (Write-tool writes stay under fix #7), ship Steps 2c, 3, 3b (human gate, attestation).
- A Step 7 read of `RUN-REPORT.md`/the pre-run snapshot by code (stays model reads; not a pinned block).
- Any trusted doc, hook, settings file, `MIN_CLI`.

## Applied lessons

- L19 — the closeout's writes (`stage.list`, the ledger, the report, git) are Bash-side, outside fix #7, exactly as the
  lines they replace; the plan and the claims block declare that, and `LOOP.md`/`SPEC.md` stay Write-tool writes.
- L22 — fourteen prescribed lines and an inline `node -e` builder become one pinned invocation; nothing is left for the
  model to compose (the branch name, the decision token and the iteration count no longer transit the model).
- L29 — the outcome set, the exit-code classes and the closeout's child-argv table are materialized once in the module
  and the tests iterate them; the hygiene obligations become "every emitting command reaches run-stop/ledger/report
  through exactly one of: its pinned lines, or its closeout".
- L35 — the ledger tail exists once (`closeout-core.mjs`), shared by both scripts; the staging artifact array moves (not
  copied) from the close part into the module and its three test sites re-point to it.
- L41 — the injectable child runner the unit tests stub is ALSO exercised un-stubbed: one end-to-end test per script
  runs the real children in a fixture project, so the default path is covered.
- L44 — the branch name, today printed by one block and re-typed into later blocks, never leaves the process.
- L45 — the committed closeout lines are read out of the command families and EXECUTED in fixtures (not only the
  script by path), and the commit-gate argv the closeout passes is executed by `check-loop-fresh.test.mjs`'s own
  fixture.
- L54 — the `stage.list` write goes through `containmentWalk` (lstat; ENOENT the only absence), and the freshness
  ledger is read only as an lstat regular file.
- L60 — each new rule gets a per-property mutation control (a reordered child sequence, a dropped release, a pushed
  argv, a crash exit read as a decision).
- L62 — hostile JSON in `.pharn/writes-scope.json` or the lock (`{"toString":1}`, arrays of objects) must route to
  `stage failed`, never a throw; a test feeds it.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — unchanged; the closeout reads the envelope it defines and never writes the
  record.
- `pharn/pharn-contracts/cost-ledger.md` — unchanged; emission position (before the commit / before ship's Step 3b) is
  kept, now by tested code order.
- `pharn/pharn-contracts/reconciliation-record.md` — unchanged; `--amend-scope` keeps following its setter.
- No contract changes: the closeout's document is stdout, never a persisted record (its spec is the module header, the
  `run-marker.mjs` precedent, P7).

## Evals / tests (P1 — floor modules, so tests, not evals)

- loop-closeout: every exit class from a fixture (green commit; STOP_CAP; blocked; record RED → 5 then `--after-repair`;
  decision RED; stale; setter fail; builder `set_by` mismatch; lock not a file; empty list; branch fail; commit-hook
  fail → undo; bad argv → 2 with nothing run); the child ORDER recorded by a stub runner equals today's; a quick record
  skips the report; releases only on 0/3; hostile scope JSON → `stage failed`; no `push`/`merge`/`--no-verify` in the
  module; the executed branch+undo cases moved from SHELL-SINK 7 (hostile original branch, detached, no reflog, the
  intervening-checkout CONTROL); one un-stubbed end-to-end blocked run with the real children.
- ship-closeout: order (run-stop before the marker close before the ledger), quick skips the report, marker removed,
  `unknown` base outside git, exit 2 on a bad name, no git write verb in the module or the core.
- The re-pointed suites above stay green with mutation controls.

## Guarantee audit (P0)

- The closeout commits only when the record's decision is a green token that agrees with its mode, its re-derivation is
  GREEN and the commit-gate freshness check exits 0 → **tested code over floor verdicts** (enum membership over the
  record + `check-loop-decision.mjs` / `check-loop-fresh.mjs` exits, primitive #3). **Advisory:** that the run invokes
  the closeout at all, and runs no git write of its own — a model can still type `git commit`.
- The order (decision re-derived before the commit; the ledger and report before the commit; ship's ledger before Step
  3b) → **tested code** (executed order tests); the position of ship's line before Step 3b → command prose, advisory.
- Exit-code classes are closed and a crash never maps to a commit decision → the script's emission is tested; the
  model's mapping is advisory command prose.
- What the commit holds: today's builder rule, unchanged → tested code, now executed by the suite (was a pinned
  `node -e` executed only in a real run).
- Nothing pushed, merged or `--no-verify` → a source scan of the module (presence of a known spelling, never
  completeness — L36's bound).
- The ≤1 record repair → **advisory** still (an argv flag the model passes).
- Ship performs no git write → a source scan of `ship-closeout.mjs` + `closeout-core.mjs`.
- Struck: "the closeout makes the run correct", "the commit is the tree the gates judged" beyond what
  `check-loop-fresh.mjs` already narrows (agreement, never provenance).

## Trust audit (P2)

- `LOOP.md`'s envelope is model-written: only enum/regex-checked scalars reach a decision or an argv (`decision`,
  `mode`, `blocked` presence, `iterations`); the Handoff and body are never read.
- The staging list comes from `.pharn/writes-scope.json` (the setter's parse of the untrusted PLAN) and the lock's
  `files[].path` — exactly today's inputs; paths travel NUL-separated through `--pathspec-from-file` with
  `GIT_LITERAL_PATHSPECS=1`, never through a shell.
- Child output (which can quote repo paths and untrusted reasons) is echoed indented as DATA, below a fixed header;
  no branch reads it. The final JSON line's string fields are code-produced (enum tokens, the validated slug, git's
  hex SHA, a branch built from the slug).

## Saving (arithmetic)

- **Green full loop stop:** 17 Bash requests → 3 (setter+amend, `rev-parse`, closeout): **−14 requests**. At the
  measured close-window mean of 3.30 s per non-Write request: **≈ 46 s** (43–62 s at the run's 3.1 s median / 4.4 s
  mean). Context re-sent: 14 × ~500k ≈ **7.0M cache-read tokens** on opus per green stop.
- **Non-green stops:** 11 → 3 (−8, ≈ 26 s, ≈ 4.0M tokens); blocked 10 → 3 (−7, ≈ 23 s, ≈ 3.5M tokens).
- **The 92-minute run itself** (blocked; the model had already chained the tail): 6 requests → 5 (6a ×2, the 6b
  pre-Write call, the Write, the closeout): **−1 request ≈ −2.1 s**, ~0.5M tokens. **This item does not move that run
  materially**; its value is on a green stop (~1 min) and in the commit path becoming tested code.
- **`/pharn-ship`, every exit:** 6 → 1 (−5, ≈ 16–22 s); its context size is unmeasured (no ship transcript in the
  evidence), so no token figure is claimed.

## Open questions (HALT)

- (GATE 1) The confirm-first bar is met by 1 of 3 runs (above). Proceed as the batch directs?
- (GATE 1) The test churn is wider than the brief's file list: seven `pharn/floor/*.test.mjs` suites pin close-part
  lines (staging-list sites, the ship close line, the commit-gate line, the git-spawn map, the frontmatter consumers).
  Each edit is a re-point, listed above.
