# PLAN — stage-verify-script: `/pharn-verify` as one tested stage script, on 6.23.0's shared stage-exit contract

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L1, L5, L6, L7, L8, L10, L19, L21, L22, L23, L24, L25, L27, L29, L30, L31, L33, L34, L35, L36, L37, L38, L40, L41, L43, L44, L45, L47, L50, L52, L54, L57, L60, L62]
- increment: move every deterministic step of `/pharn-verify` into one tested script, `pharn/floor/stage-verify.mjs` (plus a pure core and a pure renderer), which writes `verify-report.json` from the verdict checker's own output and renders `VERIFY.md` from that JSON by code, reusing 6.23.0's stage-exit contract and its budget-and-resume protocol; add verify's entry to the stage-exit registry; make `.claude/commands/pharn-verify.md` a thin caller of the script.
- layer(s): `pharn/floor/` (product floor), `pharn-contracts` (L-1, schemas only), the product command surface (`.claude/commands/pharn-*.md`)
- constitution_refs: [P0, P1, P2, P3, P4, P5, P6, P7]
- roadmap: Phase 1.2 of the token-reduction roadmap (maintainer-approved 2026-09-25)
- base: `main` at `1524c6f` (SKILLS_VERSION 6.23.0, MIN_CLI 0.5.0). This increment bumps to **6.24.0** (minor: new floor scripts, a rewritten product command, a new registry entry). The sibling phases `writes-scope-run-only` (0.2) and `ship-quick-mode` (3.1) also bump; whichever merges later renumbers and reconciles.
- stage model: plan — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed
- gate1: PENDING — delegated to the orchestrator (the maintainer's 2026-09-25 delegation). Open questions Q1–Q6 below each carry a recommendation.

## Applied lessons

- **L1** — every meta-doc that states a fact this changes is in `## Files`: `CLAUDE.md` (a new Commands entry, the run-gates entry's "pinned lines are now EXECUTED by" sentence, the AC-gate entry's two `/pharn-verify` step cites, and the stage-regress entry's expired "a future stage-verify.mjs"), `CHANGELOG.md`, `SKILLS_VERSION` and `README.md` (badge plus the regenerated inventory).
- **L5** — the stage's floor inputs are captured by tested code: the eval-pair list comes from `git ls-files -z` through a pure rule, reaches the runner as a JSON `--extra` array built by code, and the verdict checker's stdout is parsed by code. Nothing is assembled by the model.
- **L6** — every membership fact is read from its structured location: verifier membership from frontmatter (the shelled `count-verifiers.mjs`), completeness from the runner's capture, the verdict from the report's `verdict` field, the eval pairs from path structure (`/evals/expected/<name>.json`).
- **L7** — `pharn-verify.md`'s `writes:` becomes `[".pharn/pharn-verify/stage.json"]`, the stage's own scratch record: the command no longer writes either artifact through the Write tool (the script does, L19 below), so it must not declare them.
- **L8** — the one-`--target` setter shaped today's command into two setter calls (one per artifact). The thin command needs exactly one call, because the only Write-tool path it could ever need is its own scratch record.
- **L10** — `VERIFY.md` sits on `validate.mjs`'s scanned surface (`pharn/features/**`), and CHECK 5 fires on any file holding both `rule_id:` and `problem:`. The renderer's fixed preamble therefore names both markers CHECK 5 looks for ("enum-gated", "untrusted"), so quoted untrusted text can never turn validate RED; a test runs the real `validate.mjs` over a render that quotes a hostile `rule_id:`/`problem:` pair, with a control that removes the preamble.
- **L19** — the script writes `verify-report.json` and `VERIFY.md` itself through `fs`, reached through Bash and outside fix #7. Declared here and in the command, with the new bound stated plainly: these writes happen AFTER this stage's own `reconcile` gate, so no reconcile window covers them (Guarantee audit).
- **L21** — the worktree listing is read per file with `-z` (`git ls-files -z --cached --others --exclude-standard`), never from `git status`, so an untracked capability directory contributes its files, never one directory-shaped entry.
- **L22** — the command pins literal lines only: the setter, the fresh invocation, the question re-invocation template, the resume line and the release. No technique is described in prose.
- **L23** — `VERIFY.md` becomes machine-rendered and quotes untrusted text (a gate id, a PLAN-derived path, a checker's reason), so `pharn/features/*/VERIFY.md` joins `.prettierignore` and `.markdownlint-cli2.jsonc` beside `REGRESSION.md` and `RUN-REPORT.md`. `verify-report.json` is already listed in `.prettierignore`.
- **L24** — bounds are measured, not inherited: `count-verifiers.mjs .` took 0.32 s on this repo this run; the build measures the ★ WIRING run's wall time and records it in `BUILD.md` (6.23.0's review A5 found that measurement discarded with `void`).
- **L25** — the rationale comments that assert the old story are re-derived, not carried: `ship-outcome-core.mjs`'s "UNCHANGED, at its full original width, for `/pharn-verify`", `stage-exit-core.mjs`'s "Phase 1.2's stage-verify.mjs next", `loop-fresh-core.mjs`'s "pharn-verify.md Step 3c" and "pinned Step 5", `gate-run-core.mjs`'s three verify step cites, `ac-gate-core.mjs`'s "Step 2's chain check", and `count-verifiers.mjs`'s "/verify Step 2".
- **L27** — the thin command's `2` bullet states, per branch, what has already happened when `unusable` fires, and every `refused` bullet names a remedy reachable from its own reason code (6.23.0's review M3 and N1 were this class).
- **L29** — the verify vocabulary is one registry entry that every rule iterates: the builders, the validator, the closure test over the script's emitted literals, and the loop-mapping closure. `STAGE_SCRIPT_WIRING` becomes a two-member set whose rules iterate both members.
- **L30** — the thin command asks the model to run no gate and no checker: every gate, the chain check, the verifier count and the verdict run inside the script.
- **L31** — two copy-pairs are answered in writing. (1) `stage-regress.mjs` and `stage-verify.mjs` would otherwise duplicate the argv rules, the containment walk, the drain and the budget clock that 6.23.0's review repaired one by one (M7a/b/c, A4, A3); Q1 recommends one shared owner, `pharn/floor/stage-runtime.mjs`. (2) `/pharn-dev-verify` stays a prose flow, named as the follow-up `dev-verify-stage-script`.
- **L33** — four forward-looking sentences expire the moment this lands, and each is in `## Files`: `stage-exit.md`'s purpose line ("a future stage-verify.mjs"), its "Why it exists" paragraph, `stage-exit-core.mjs`'s header and registry comment, and `CLAUDE.md`'s stage-regress entry ("a future stage-verify.mjs (roadmap Phase 1.2) reuses it").
- **L34** — every new set pins its size (the verify registry, `STAGE_SCRIPT_WIRING`, the `VERIFY.md` enumeration sites); an empty eval-pair set passes no `--extra` at all, and the renderer states "no criteria" or "no gates" explicitly rather than leaving a section empty.
- **L35** — one owner per fact: `VERIFY_PATHS` in the new core, with `loop-fresh-core.mjs`'s `DEFAULT_STAMPS.verify` derived from it; the pairing rule stays `gate-run-core.mjs`'s `actualForExpected`; quoting stays `quote-core.mjs`; the chain read stays `shelled-verdict-core.mjs`; and, under Q1, the stage-script mechanics get one owner instead of two copies.
- **L36** — the progress record is closed in both directions (every required key present, no extra key); the composed report refuses a checker key that collides with a merged advisory key; a closure test collects every `reason_code` literal the script emits and requires registry membership, with a variant-spelling control.
- **L37** — every quantified sentence this increment writes is probed with a member expected to be excluded, and the probes are listed in the Guarantee audit for the build to run and record. The writes-scope claim was probed at plan time: the real setter and the real guard, exit codes recorded under "The thin command".
- **L38** — the one-run-per-worktree bound is stated: a fresh start clears `.pharn/pharn-verify/`, so a second `/pharn-verify` started in the same worktree destroys the first run's in-progress state, as `run-gates.mjs init` already does to its own `<out>`.
- **L40** — the plan-time scope probe varied the attributed condition: the same probe with no scope file allows `VERIFY.md` (exit 0), so the deny comes from the set scope, not from a default.
- **L41** — `--timeout-ms` is required with no default; `--budget-ms` has no default (absent = unbudgeted) and one test drives the absent path; `count-verifiers.mjs` is always invoked with an explicit `.` target.
- **L43** — the report certifies agreement with its stamp, never provenance; the command, the contract and `CLAUDE.md` say so, and a self-consistent forged report still passes `check-loop-fresh` E exactly as before.
- **L44** — the resume line carries no state: `--resume` reads everything from the progress record on disk.
- **L45** — a ★ WIRING test extracts the command's committed fresh line and executes it in a fixture, and `run-gates.test.mjs`'s header stops saying `/pharn-verify`'s pinned lines are exercised only through hand-typed arguments.
- **L47** — the expired "a future stage-verify.mjs" is replaced by an open form ("the registry is keyed by stage; each stage script adds its own entry"), never by a new closed count such as "the two stages".
- **L50** — the sweep is by referent: every cite of a `/pharn-verify` step number or of "verify's discovery is command prose", on every surface, is classified under Discovery, including the ones that stay true.
- **L52** — each remedy names its set: one question round trip per verify question code, one ★ assertion per consumer check the stage must satisfy (C, D, E, F, J), and one refusal test per registered `refused` and `unusable` code the script can reach.
- **L54** — containment is an `lstat` walk where `lstat`'s ENOENT is the only proof of absence, re-run on `--resume` (6.23.0's A4); the tests cover a live link, a dangling link and a symlinked feature directory.
- **L57** — this stage's own format step runs `prettier --ignore-unknown --write` and `markdownlint-cli2 --no-globs --fix` over this PLAN path only; the build does the same over its named files.
- **L60** — every ★ test names the edit that must turn it red and runs it: the wiring test's dropped `--timeout-ms` mutant, the budget test's old-clock mutant, the closure test's variant spelling, and every anchor asserted found before slicing.
- **L62** — every child reason quoted into a stage-exit `detail` or into `VERIFY.md` goes through `dataText` (total); a `{"toString":1}` case is tested, with a control asserting that `String()` really throws on it.

## Why (P7 — the measured trigger)

The trigger is Phase 1.1's, and it is recorded, not hypothetical. A user's own `/pharn-ship` `cost.json`
ledgers showed pharn's own stages at about 48% of relative cost on large features and about 81% on three
small fixes (weights: input 1, cache write 1.25/2, cache read 0.1, output 5; an older installed version,
lower-bound coverage). Cost is roughly turns times context. 6.23.0 removed the regress share of it;
`/pharn-verify` is the other stage whose deterministic work runs as one model turn per step.

Measured on the command at `1524c6f`, re-derivable by reading it:

- the command is **55,683 bytes** (the largest product command after the two orchestrators `/pharn-ship`
  and `/pharn-loop`, measured this run with `wc -c`), with **8** fenced bash blocks;
- a happy-path run prescribes **14 + d + G + P** tool calls, where G is the number of project gates, P the
  number of eval-pair gates and d ∈ {0, 1} the eval-pair discovery call (see "Success measure");
- every one of those calls is a full model turn that re-reads the 55 KB prompt.

## Discovery (P6) — live state read this run

- `HEAD` = `1524c6f` (6.23.0). The ARCHITECTURE pin above is from `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`.
- **Lessons index:** `node .dev/floor/check-lessons-index.mjs .` → exit **0** (`GREEN`). The two-step sweep ran:
  candidates selected from `docs/lessons-index.md`, then every cited entry read in full from
  `.dev/memory-bank/lessons-learned.md` (all 62 entries were read this run).
- **The 6.23.0 record** (`.dev/features/stage-regress-script/`): PLAN, GRILL, REVIEW (all three rounds) and
  SHIP were read. The defects this plan is shaped against, each with the design element that answers it:
  - F2, a stale report surviving an early stop → verify's "fresh" removes the report AND clears its scratch
    immediately after the slug and containment pass (below);
  - A1, the question re-run line documented as `--resume` → the command's `4` bullet pins the fresh-style
    template, and `--resume` appears only under `5`;
  - A3, progress persisted only at budget exits → a checkpoint at the top of every phase from "drain" on;
  - A4, `--resume` skipping containment → the same walk re-runs on every `--resume`;
  - F1, options not deep-checked → already closed in `stage-exit-core.mjs` (`optionsMatchRegistry`); verify's
    registry entry inherits it, and the tests carry forged-label and forged-argv controls for verify's
    options;
  - M7a/b/c, argv rules diverging from the runner's → one shared owner (Q1);
  - the recurring "claims stronger than the code" (the REVIEW's lesson candidate: F1, F2, A6, M1, M2, then
    N1, N2 and the A3 comment) → the Guarantee audit lists every new quantified sentence with the probe the
    build must run and record.
- **`/pharn-verify` at `1524c6f`** does, in prose: resolve `<name>`; set the scope to `verify-report.json`;
  read PLAN and SPEC; shell `check-plan-spec-agree.mjs` (on RED, write a fail-closed `INCONCLUSIVE`
  report); discover eval pairs from the PLAN's `## Files` by hand; `run-gates.mjs init --stage verify … --discover package.json [--gates] [--extra]`;
  one `run --next --timeout-ms 540000` call per gate; `count-verifiers.mjs .`;
  `check-verify.mjs --stamp .pharn/pharn-verify/gates/stamp.json --feature <name> --ac-gate`; merge
  `completeness.json` and a `verifiers` block into the checker's JSON; re-scope and write `VERIFY.md` by hand;
  release the scope. On a runner error it writes a fail-closed report carrying the runner's `reason_code`.
- **`check-verify.mjs`** prints one JSON object (`feature`, `gates`, `verdict`, `failing_gates`, and
  `gate_run` / `ac_gate` / `reason` / `reason_code` where they apply) and exits 0 PASS · 1 FAIL ·
  2 INCONCLUSIVE · 3 INCOMPLETE. It sets `process.exitCode` (the 6.20.4 flush rule), so its stdout is
  complete through a pipe. Its output carries neither `completeness` nor `verifiers`; the command merges
  both today, and `verify-report.md`'s object documents both.
- **`run-gates.mjs init --stage verify`** captures `check-build-complete.mjs`'s exit into the stamp's
  `aux.completeness` and its stdout into `<out>/completeness.json`, and injects `reconcile` last with the
  fixed argv `node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline`, run in the invoking
  directory. A crashed `check-build-complete.mjs` exits node's 1, which the stamp records as "incomplete"
  (a crash read as a verdict, pre-existing; see "Behaviour changes"). **Probed this run** with the real
  runner's `init` over a throwaway git fixture under `.pharn/pharn-dev-plan/` (git-ignored, removed after)
  whose `check-build-complete.mjs` throws: init exit 0, `aux.completeness` 1, `completeness.json` 0 bytes.
  Control, the real checker: init exit 0, `aux.completeness` 0, 174 bytes. The capture is taken at `init`,
  before any gate runs, and every one of the checker's own outputs (`complete`, `incomplete`, each
  `inconclusive` branch) carries `complete` as a boolean and `missing` / `skipped` as arrays (read this run).
- **The stage-exit contract** (`stage-exit.md`, `stage-exit-core.mjs`) is keyed by stage with `regress`
  the only key; `validateStageExit` already deep-checks options (F1); `mayStartSlowStep` is shared; the
  `refused` row reads "no machine report".
- **Consumers read this run** (the table under "Consumer compatibility"): `loop-fresh-core.mjs` (checks A,
  B, C, D, J, E, H, F, G, I), `check-loop.mjs`, `check-loop-decision.mjs`, `ship-outcome-core.mjs`,
  `render-run-report.mjs`, `render-ship-briefing.mjs`, `check-ship-briefing.mjs`, `/pharn-ship` (steps 7, 2b,
  2c and the Step 3 roll-up) and `/pharn-loop` (Step 2 mapping, Step 5).
- **Fingerprint and reconcile sets:** `worktree-fingerprint.mjs` `EXCLUDED_ARTIFACTS` already holds
  `VERIFY.md` and `verify-report.json`, and `reconcile-ignore.json` `pipeline_artifacts.names` holds both.
  So removing or writing them never moves the verify stamp's fingerprint, and never reads as an escape.
- **Tests that read `pharn-verify.md` today:** `.dev/floor/command-hygiene.test.mjs` (GATE_RUN_WIRING, the
  `=$?` rule, the Step-6 verbatim-field pin, the pinned verdict line, the retired `--complete`),
  `pharn/floor/gate-run-core.test.mjs` (the brace allowlist parity), and
  `pharn/floor/check-bash-reconcile.test.mjs` (the verify command names `check-bash-reconcile.mjs` and
  `--require-baseline`). RULE B's multi-artifact domain was measured this run at 6 commands (`pharn-dev-regress`,
  `pharn-dev-verify`, `pharn-loop`, `pharn-plan`, `pharn-ship`, `pharn-verify`); `pharn-verify.md` leaves it,
  so it becomes 5, still at the pinned floor of 5.
- **The referent sweep (L50)** — every cite of a `/pharn-verify` step number, or of "verify's gate discovery
  is command prose", on the product surface and in `CLAUDE.md`:
  - **becomes false, edited:** `pharn-regress.md` ("the same way `/pharn-verify` does (its Step 3a, which
    stays command prose)"); `pharn-ship.md` (step 5's "`/pharn-verify` Step 3a discover it", step 7's
    "`/pharn-verify` **always** emits this machine artifact", the chain paragraph's "an `INCONCLUSIVE`
    `verify-report.json`", Step 2c's "the same shape `/pharn-regress` and `/pharn-verify` already use" — stale
    for regress since 6.23.0 —, and the guarantee-audit bullet "exactly like `/pharn-verify`'s Step 3a
    discovery"); `ac-tests.md` ("`/pharn-verify` Step 5", "`pharn-verify.md` Step 3a"); `loop-fresh-core.mjs`
    (":155" Step 3c, ":548" pinned Step 5); `gate-run-core.mjs` (":52" Step 3c quote, ":68" Step 3a, ":315"
    Step 3b); `ac-gate-core.mjs` (":51" Step 2); `count-verifiers.mjs` (":4" "/verify Step 2");
    `ship-outcome-core.mjs` (the verify residual); `CLAUDE.md` (the AC-gate entry's "Step 5's pinned line" and
    "`/pharn-verify` Step 3a says"; the run-gates entry's pinned-lines sentence; the stage-regress entry's
    "a future stage-verify.mjs").
  - **stays true, unchanged, with the reason:** `gate-run-core.mjs:9` and `CLAUDE.md`'s "verify's Step 3c
    captured five exit codes" (history, in the past tense); `run-gates.mjs:517` ("an interactive HALT under
    /pharn-verify" — the no-gates question is relayed interactively); `pharn/floor/README.md:81` and `:145`
    (verify runs `check-structural.mjs` per pair and runs `check-bash-reconcile.mjs` — both still true through
    the script's runner); `pharn-loop.md` Step 5 ("both stages now run their gates through run-gates.mjs" —
    still true through their scripts); `README.md` prose (no step numbers); every `.dev/features/**` record
    (history, never swept).
  - **Coverage boundary (L49), stated:** checker-backed sites are the ALLOWLIST parity
    (`gate-run-core.test.mjs`), the verify-command pins in `command-hygiene.test.mjs`, the reconcile pin in
    `check-bash-reconcile.test.mjs` and CHECK 8 of `validate.mjs` (relocated-checker cites only). Every other
    site above was found by reading and search, so a missed variant spelling is possible.
- **Siblings read this run** (`git show <branch>:.dev/features/<name>/PLAN.md`): `writes-scope-run-only`
  rewords the Final step of every product command (retracting the phrase "absence of a scope file = the
  fail-closed default-safe-set", with a closure test over the product corpus) and adds run markers to
  `/pharn-ship` and `/pharn-review`; `ship-quick-mode` adds a `/pharn-ship --quick` mode that skips
  `/pharn-regress`, runs `/pharn-verify` unchanged, and edits `pharn-verify.md`'s first paragraph and version.
  Both are based on `767bf61` (6.22.0).

## Design

### The script — `pharn/floor/stage-verify.mjs` (CLI, execution)

```text
node pharn/floor/stage-verify.mjs --feature <name> --timeout-ms <N> [--budget-ms <B>] [--gates "<cmd>[::<id>],…"]
node pharn/floor/stage-verify.mjs --resume [--budget-ms <B>]
```

**Exit codes are the stage-exit table, unchanged** (`stage-exit-core.mjs` owns it): 0 `done` · 2 `unusable` ·
3 `refused` · 4 `question` · 5 `continue` · anything else, 1 included, is a crash. Every deliberate exit
prints exactly one `pharn-stage-exit/1` object and ends by setting `process.exitCode` (the 6.20.4 flush rule,
through the same sentinel pattern `stage-regress.mjs` uses). **A `done` exit carries the stage's verdict only
as a transient copy; the verdict lives in `verify-report.json`, so `done` with `FAIL` is still exit 0.**

**Phases, in order** (`stage-verify-core.mjs` `PHASES`, the one owner of the order):
`fresh → chain → pairs → verifiers → init → drain → verdict → render`. Every refusal and the one question are
raised before the first slow step.

1. **fresh**, in this order:
   1. `--feature` must parse as a slug (`FEATURE_SLUG_RE`), else `unusable usage-error` with `feature: null`.
      Nothing has been removed.
   2. The `lstat` containment walk over `.pharn`, `.pharn/pharn-verify` and `pharn/features/<name>`, else
      `unusable path-containment`. Nothing has been removed.
   3. Remove THIS feature's earlier `verify-report.json` and `VERIFY.md` (ENOENT is the normal case).
   4. Clear `.pharn/pharn-verify/` (containment already proven), unlinking the progress record
      `stage.json` first. **This is earlier than regress, on purpose:** every flag after `--feature` is
      validated after this clear, so a `usage-error` there cannot leave an earlier run's progress record beside
      a removed report for an out-of-flow `--resume` to revive (regress's N1 state). An exit before this step
      (a pre-slug `usage-error`, `path-containment`) removes nothing, so the earlier run's report and record
      stay together, as if this invocation had not run. The one remaining window for the N1 state, named: a
      kill landing after step 3 and before step 4 has unlinked the record.
   5. Validate the rest of argv: `--timeout-ms` required and 3–9 digits (the runner's own `run --next` rule),
      `--budget-ms` a non-negative integer with a value present, `--gates` non-empty, no unknown flag and no
      positional → else `unusable usage-error`.
   6. The feature directory must exist (`unusable no-feature`); `PLAN.md` and `SPEC.md` must exist
      (`refused missing-artifact`, rendered into `VERIFY.md`).
2. **chain**: shell `check-plan-spec-agree.mjs PLAN SPEC` and read it through `shelledVerdict`: green
   proceeds, red is `refused chain-red` (the checker's stdout quoted into `VERIFY.md` as DATA), crashed is
   `unusable child-crashed`.
3. **pairs** (EVAL_PAIR_RULE, below): parse the PLAN's `## Files` with `plan-files-core.mjs`
   (`pathsFromPlanFiles` + `clean`) → `refused plan-files-unparseable` on failure; list the worktree with
   `git ls-files -z --cached --others --exclude-standard` → `unusable git-failed` on failure; apply the rule.
4. **verifiers**: shell `count-verifiers.mjs .` → exit 0 with `{registered: int ≥ 0, verifiers: string[]}`,
   else `unusable child-crashed`. It runs before the slow steps so its time is charged to the budget clock
   and a crash costs no gate run (0.32 s on this repo, measured). The count is persisted in the progress record.
5. **init**: `run-gates.mjs init --stage verify --feature <name> --out .pharn/pharn-verify/gates`, plus
   `--gates <spec>` when given, else `--discover package.json` when `package.json` exists, plus
   `--extra <json>` when the pair list is non-empty. Exit 3 → `question no-gates`; exit 2 or unparseable
   output → `unusable child-refused`, its `detail` quoting the runner's closed `reason_code` and reason through
   `dataText`. Then the completeness capture the runner took at init,
   `.pharn/pharn-verify/gates/completeness.json`, must pass `checkCompleteness` (below), else
   `unusable child-crashed` — before any gate runs, so a crashed `check-build-complete.mjs` costs no gate
   (the probe under Discovery: the crash leaves 0 bytes).
6. **drain** (the slow steps; a checkpoint at its top): `run-gates.mjs run --next --out .pharn/pharn-verify/gates --timeout-ms <N>`
   until the stamp is finalized, one gate per call, each gate a slow step under `mayStartSlowStep` →
   `continue` on budget, `unusable child-refused` on a runner refusal.
7. **verdict** (a checkpoint at its top; the record stays parked here through "render"):
   `check-verify.mjs --stamp .pharn/pharn-verify/gates/stamp.json --feature <name> --ac-gate` (spawnSync's
   default 1 MiB buffer, the same bound `check-loop-fresh` E has). The result must be a JSON object whose
   `verdict` ∈ {PASS, FAIL, INCONCLUSIVE, INCOMPLETE} and whose exit equals that verdict's code {0, 1, 2, 3}
   (VERDICT_EXIT); anything else is `unusable child-crashed` — node exits 1 on a crash, which is also FAIL's
   code, so the exit alone is never read as a verdict. Then re-read `.pharn/pharn-verify/gates/completeness.json`
   from disk (a `--resume` has nothing else), run `checkCompleteness` on it again, and compose the report
   (below); a capture that fails the check is `unusable child-crashed`.
8. **render**: write `verify-report.json` and then `VERIFY.md` atomically (a tmp file under
   `.pharn/pharn-verify/`, then `rename`), remove the progress record, and exit `done`.

**Checker INCONCLUSIVE is a verdict, not a refusal.** When `check-verify.mjs` itself returns INCONCLUSIVE (a
stamp that does not validate, an unmeasurable AC gate, inconclusive completeness), the script writes that
report and exits `done`, exactly as today's command writes it. `check-loop-fresh` B keeps routing such a
report's lapse `reason_code` to a re-run.

**The budget (`--budget-ms`) — the 600 s cap is the script's problem, exactly as in regress.** A gate starts
only if it is the first slow step of the invocation or `elapsed + N ≤ B` (`mayStartSlowStep`, shared).
`elapsed` is measured from the top of `runFresh`/`runResume` (6.23.0 round 2). With no `--budget-ms` nothing
is budgeted. The pinned numbers are `--timeout-ms 540000 --budget-ms 570000` with a Bash-tool timeout of
600000, the regress values (Q6). What the clock does not count, named: node's startup and module loading,
and the fast work after the last permitted slow step (`run --next`'s two fingerprints, the verdict call, the
composition, the render and the writes). Those must fit the remaining 30 s.

**`--resume`** accepts only `--budget-ms` and reads everything else from `.pharn/pharn-verify/stage.json`
(`pharn-stage-verify-progress/1`): no record → `unusable no-progress`; a malformed one →
`unusable progress-malformed`; any other flag, a flag without its value, or a stray token →
`unusable usage-error`. It re-runs the containment walk before anything else (A4). A hard kill leaves the
record at the phase it interrupted and `--resume` re-runs that phase: a gate through `run-gates.mjs`'s
stale-lock recovery, or the verdict and render, which are idempotent over the durable stamp. A kill before
"drain" leaves no record of this run → `no-progress`, and the caller starts fresh.

### The closed rules — `pharn/floor/stage-verify-core.mjs` (pure; imports only `gate-run-core.mjs`)

- **VERIFY_PATHS** — `{root: ".pharn/pharn-verify", gates: ".pharn/pharn-verify/gates", stageJson: ".pharn/pharn-verify/stage.json"}`,
  the one owner of the stage's scratch layout. `loop-fresh-core.mjs`'s `DEFAULT_STAMPS.verify` is derived from it.
- **PHASES** and **RESUMABLE_PHASES** (`drain`, `verdict`).
- **PROGRESS_SCHEMA** `pharn-stage-verify-progress/1` and `validateProgress`, closed in both directions over
  `{schema, feature, timeoutMs, budgetMs, phase, verifiers: {registered, verifiers}}`.
- **EVAL_PAIR_RULE** — `featureEvalPairs({declared, listing})`. A committed eval pair the feature ships is an
  expected file `E` in the listing matching `/evals/expected/<file>.json` (the regex `stage-regress.mjs`
  already uses), whose `actualForExpected(E)` (`gate-run-core.mjs`, the one owner of the pairing, also the
  runner's) is in the listing too, and whose capability directory the PLAN declares: some cleaned `## Files`
  entry equals `<capDir>` or begins with `<capDir>/`. The output is sorted and unique. Named bounds: the
  listing is tracked plus untracked-not-ignored (a new capability's evals are untracked at verify time and
  must count); a declared glob above the capability directory (`src/**`) does not select it — declare the
  directory or a file inside it; a path holding `*` is refused by the runner's `parseExtras` (`bad-extra`,
  then `unusable child-refused`), never mangled. Today's prose rule said "for each capability directory the
  feature declares" and left the matching to the model; this is that rule made membership.
- **VERDICT_EXIT** `{PASS: 0, FAIL: 1, INCONCLUSIVE: 2, INCOMPLETE: 3}` and `classifyVerdict({status, stdout})`.
- **checkCompleteness(text)** — the capture parses as one JSON object with `complete` a boolean and `missing`
  and `skipped` arrays of strings; anything else (the measured crash's empty file included) is a refusal the
  script reports as `child-crashed`. **Bound, stated:** it is a shape check, not an agreement check. A capture
  that is well-shaped but disagrees with the exit the stamp recorded is not detected; `check-build-complete.mjs`
  prints its one document and then exits, so no crash mode is known to produce one (P7: no check without a
  failure).
- **composeReport({checker, completeness, verifiers})** — the report is the checker's object with every key
  kept, value and order, followed by two advisory blocks: `completeness` (the runner's capture, verbatim, after
  `checkCompleteness`) and `verifiers` (`{registered, findings: []}`, plus a fixed `note` when
  `registered > 0`). A checker key named `completeness` or `verifiers` is refused rather than overwritten (Q2).
- **Load-graph constraint** (6.23.0's G8): `loop-fresh-core.mjs` imports `VERIFY_PATHS`, so this core imports
  only `gate-run-core.mjs`, already in the freshness checker's graph. A test pins the import list, with an
  injected-import control.

### The shared stage runtime — `pharn/floor/stage-runtime.mjs` (execution helpers, no CLI; Q1)

The mechanics both stage scripts need, lifted byte-for-byte out of `stage-regress.mjs` so each has one owner:
`flag`/`has`; `parseTimeoutMs`, `parseBudgetMs` and `parseResumeArgv` (M7a/b/c); `lstatSafe` and
`containmentWalk` (L54); `atomicWrite(tmpDir, relPath, bytes)`; `gitSync` and `nulList`;
`makeBudget({timeoutMs, budgetMs}, invocationStart)` over `mayStartSlowStep`; and `drainGates`, which RETURNS
`done` / `budget` / `refused` instead of emitting, so each script keeps its own emit wrappers and reason codes.
Imports: node builtins and `stage-exit-core.mjs`. `stage-regress.mjs` imports these and deletes its copies;
its behaviour at the CLI is unchanged, and its existing suite, which drives only the CLI, is the evidence.
If GATE 1 chooses per-script copies instead, this file and the `stage-regress.mjs` edit drop out, and
`stage-verify.test.mjs` gains an executed cross-copy test (Q1).

### The report and the render

- **`verify-report.json`** = `composeReport(...)` serialized as `JSON.stringify(report, null, 2) + "\n"`. Every
  field the verdict checker printed is that checker's output (deep-equal, key order kept); the two advisory
  blocks are merged by tested code where the model used to merge them. **It exists only when
  `check-verify.mjs` ran:** no `refused` and no `unusable` exit writes one (Q3), and "fresh" removed the earlier
  one.
- **`pharn/floor/render-verify.mjs`** (pure, no CLI; imports `quote-core.mjs`) renders `VERIFY.md` from the
  report JSON alone, `renderDone(report)`, and a refusal from `renderRefused({feature, reasonCode, detail})`.
  Content, today's Step 6.2 list rendered by code:
  - the gate source (`gate_run.source`: discovered or explicit `--gates`);
  - the per-gate exit codes as a fenced DATA block (no markdown table, the `render-run-report.mjs` reason; a
    gate id can be user text or a PLAN-derived `structural:` path);
  - the verdict line per closed verdict (`VERIFIED: floor gates PASS`, `VERIFY FAILS: …`, `INCOMPLETE: …`,
    `INCONCLUSIVE: …`), with `failing_gates`, `completeness.missing` and the checker's `reason` fenced;
  - the completeness line; the acceptance-criteria lines (`ac_gate.verdict` and `mode` rendered only as
    closed-set members, BOOTSTRAP said as weaker, "not-applicable (legacy spec)" never omitted, the ids and
    reasons of criteria not delivered fenced), with the per-AC table CITED to the report's `ac_gate` block,
    never retyped (today's rule);
  - the verifier section ("no verifiers registered — floor gates only.", today's exact phrase, or the deferral
    note);
  - today's honest residual line;
  - a fixed preamble naming the enum-gated / untrusted split (L10).

- **A refusal's `VERIFY.md`** (`renderRefused`) says `refused: <code>` (a closed-set member, rendered only
  after a membership test), "feature NOT verified", and the refusal's detail fenced as DATA, under the same
  fixed preamble.

### The shared contract — verify's registry entry (`stage-exit-core.mjs`, `stage-exit.md`)

The core stays stage-generic: the change is one new `REGISTRY` key plus the header and comment text that
expired. The closed `verify` vocabulary:

| status     | reason codes                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `question` | `no-gates`                                                                                                                           |
| `refused`  | `missing-artifact`, `chain-red`, `plan-files-unparseable`                                                                            |
| `unusable` | `usage-error`, `no-feature`, `path-containment`, `git-failed`, `child-crashed`, `child-refused`, `no-progress`, `progress-malformed` |

- **`no-gates`'s fixed text** names verify's one cause (no `--gates` and no allowlisted script in
  `package.json`, or no `package.json`) and its caveat: for a SPEC written from the template, gates named with
  `--gates` are read by the AC gate as not the discovered `npm run <id>` (`test-infra-changed` / `ac-untested`),
  so adding the missing script is the better answer there. Options: `--gates <value>` (`gates-spec`) or stop.
  Its `resume.argv` is the original argv, unchanged: the question fires only when `--gates` was absent, since
  an explicit `--gates` never reaches an empty source set (an empty token is `bad-gates`).
- **`/pharn-loop`'s mapping for verify** (a paragraph beside regress's, same rule): `question no-gates` → S4;
  `refused` and `unusable` → S9; a crash → S9; `continue` is handled inside `/pharn-verify`.
- **`stage-exit.md`** gains the verify vocabulary, verify's timing of what an `unusable` has already removed,
  the verify line of the question section, the verify mapping, and verify's checkpoint and clock sentences.
  Its purpose line and "Why it exists" drop the expired future tense (L33, L47).

### The thin command — `.claude/commands/pharn-verify.md`

- **Frontmatter:** `writes: [".pharn/pharn-verify/stage.json"]`; `reads:` the constitution, the architecture,
  the PLAN (untrusted), `pharn/floor/stage-verify.mjs` and `pharn/pharn-contracts/stage-exit.md`; `model:`,
  `effort:` and `model_tier:` unchanged (`check-model-config.mjs` holds them to `pharn.config.json`);
  `version: "0.5.0"`.
- **The writes-scope, set to the strictest scope the setter can express** (the 6.23.0 A1 shape). Probed this
  run with the real setter and the real guard (a scratch command file under `.pharn/pharn-dev-plan/`, a scratch
  root with `CLAUDE_PROJECT_DIR` pointed at it): setter exit 0, scope `[".pharn/pharn-verify/stage.json"]`; Writes
  to `pharn/features/demo/VERIFY.md`, `pharn/features/demo/verify-report.json`, `src/app.js` and
  `.dev/features/x/PLAN.md` → exit **2**; to `.pharn/pharn-verify/other.json` and `.pharn/pharn-verify/stage.json`
  → exit **0**. Control (L40): with no scope file, `pharn/features/demo/VERIFY.md` and `verify-report.json` →
  exit **0**, so the deny comes from the set scope. A set scope is authoritative in every posture of the 0.2
  design, so this holds in an install whether or not a run marker is open.

  ```bash
  node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-verify.md --target .pharn/pharn-verify/stage.json
  ```

- **Step 1, the pinned line** (Bash timeout 600000; the invoker's `--gates` appended verbatim — with the
  AC-evidence caveat kept in the reference section):

  ```bash
  node pharn/floor/stage-verify.mjs --feature <name> --timeout-ms 540000 --budget-ms 570000
  ```

- **Branch on the exit code only:**
  - `0` done → report the report's `verdict` (a `FAIL` is a FAIL) and point at `VERIFY.md`; write nothing;
  - `2` unusable → present `detail` as quoted DATA and stop, with what already happened per branch (before
    the slug or at containment: nothing; any later stop: the earlier report and the scratch are gone, and
    from "init" on this run's own scratch may exist; a `--resume`'s own stop: nothing);
  - `3` refused → present the refusal, its rendered `VERIFY.md`, and its remedy: `missing-artifact` →
    `/pharn-plan` or `/pharn-spec`; `chain-red` → re-plan via `/pharn-plan`, or re-approve via `/pharn-spec`
    when the SPEC change is intended; `plan-files-unparseable` → fix the PLAN's `## Files` via `/pharn-plan`;
    **`feature NOT verified`**, never a pass;
  - `4` question → relay `question` and `options[]` verbatim; on an answer re-run
    `node pharn/floor/stage-verify.mjs <resume.argv…> <chosen option's argv…>`, each appended value
    single-quoted with an embedded `'` written as `'\''` — never `--resume`;
  - `5` continue → run the pinned resume line again while it exits 5, then branch on its exit code as above (a
    resume runs only the drain, the verdict and the render, so it can end in 0, 2, 5 or a crash):

    ```bash
    node pharn/floor/stage-verify.mjs --resume --budget-ms 570000
    ```

  - anything else, 1 included → the script crashed; present what exists and stop, never a verdict;
  - the Bash tool itself timed out → run the resume line once.
- **Kept, condensed:** "The two layers"; "What you may claim" (the guarantee, the correctness residual, the
  absolute-threshold residual, the AC-gate meaning with its bootstrap and legacy readings); the verifier
  plug-in slot section, as today (zero verifiers, P7; the runner deferred until the first verifier lands; its
  findings never reach the verdict); the reference section (the brace allowlist
  **`{ test, lint, format:check, lint:md, typecheck, type-check, build, test:e2e, e2e }`** that
  `gate-run-core.test.mjs` pins, the e2e clause, the `--gates`-and-the-AC-gate caveat, the eval-pair rule in one
  sentence, and the runner-injected `reconcile` gate with its fixed argv `check-bash-reconcile.mjs --base . --require-baseline`,
  which the `check-bash-reconcile.test.mjs` pin reads); the guarantee, trust and determinism audits; the named
  limits.
- **The Final step** releases the scope with the byte-identical `node .claude/hooks/set-writes-scope.cjs --clear`,
  and the "Before ending your turn, run the release step" pointer sits above the last turn-end. Its prose uses
  none of the phrase the 0.2 sibling retracts.
- **Target size:** at most 20,000 bytes, against 55,683 today; measured at build and recorded in `BUILD.md`.

## Files

- `pharn/floor/stage-verify.mjs` — NEW. The stage CLI: argv, containment, git, the shelled checkers, the budget loop, the report composition call, atomic artifact writes, the stage-exit JSON — layer pharn/floor
- `pharn/floor/stage-verify-core.mjs` — NEW, pure, imports only `gate-run-core.mjs`: VERIFY_PATHS, PHASES, RESUMABLE_PHASES, the progress schema and validator, EVAL_PAIR_RULE, VERDICT_EXIT, classifyVerdict, checkCompleteness, composeReport — layer pharn/floor
- `pharn/floor/render-verify.mjs` — NEW, pure, no CLI, imports `quote-core.mjs`: `VERIFY.md` from the report JSON, and a refusal render — layer pharn/floor
- `pharn/floor/stage-runtime.mjs` — NEW (Q1): the stage-script mechanics with one owner (argv rules, containment walk, atomic write, git helpers, budget tracker, drain loop) — layer pharn/floor
- `pharn/floor/stage-regress.mjs` — EDIT (Q1): import the shared mechanics from `stage-runtime.mjs` and delete its local copies; CLI behaviour identical — layer pharn/floor
- `pharn/floor/stage-exit-core.mjs` — EDIT: the `verify` registry entry; header and registry comment re-derived (L33) — layer pharn/floor
- `pharn/floor/loop-fresh-core.mjs` — EDIT: `DEFAULT_STAMPS.verify` derived from `VERIFY_PATHS`; the two step cites re-pointed — layer pharn/floor
- `pharn/floor/gate-run-core.mjs` — EDIT, comments only: the three `/pharn-verify` step cites re-pointed — layer pharn/floor
- `pharn/floor/ac-gate-core.mjs` — EDIT, comment only: "Step 2's chain check" re-pointed at the script's chain phase — layer pharn/floor
- `pharn/floor/count-verifiers.mjs` — EDIT, comment only: its caller is now `stage-verify.mjs` — layer pharn/floor
- `pharn/floor/ship-outcome-core.mjs` — EDIT, comment only: the stale-report residual narrowed for `/pharn-verify` too — layer pharn/floor
- `pharn/pharn-contracts/stage-exit.md` — EDIT: the verify vocabulary, verify's unusable timing, the question line, the loop mapping, checkpoints and clock; the expired future tense re-derived — layer pharn-contracts
- `pharn/pharn-contracts/verify-report.md` — EDIT: the writer is `stage-verify.mjs`; the two advisory blocks merged by code; no report on a refusal; the stale-report removal — layer pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — EDIT: the two `/pharn-verify` step cites re-pointed — layer pharn-contracts
- `.claude/commands/pharn-verify.md` — REWRITE: the thin caller above — product command
- `.claude/commands/pharn-loop.md` — EDIT: verify's stage-exit mapping paragraph beside regress's — product command
- `.claude/commands/pharn-ship.md` — EDIT: step 5's discovery cite, step 7's missing-report STOP and its residual, the chain paragraph, Step 2c's comparison sentence, and the guarantee-audit discovery bullet — product command
- `.claude/commands/pharn-regress.md` — EDIT: the reference sentence that calls verify's discovery command prose — product command
- `pharn/floor/stage-verify.test.mjs` — NEW: end-to-end fixture repos, ★ WIRING, ★ loop-fresh over real stage outputs, budget and resume, the question round trip, refusals, containment, the closure over emitted codes
- `pharn/floor/stage-verify-core.test.mjs` — NEW: every rule with members and non-members, the progress validator's closure, composeReport, classifyVerdict, the load-graph pin
- `pharn/floor/render-verify.test.mjs` — NEW: the render per verdict and refusal, hostile text inert, L62, no absolute path, CHECK 5 via the real `validate.mjs`, the ★ `VERIFY.md` enumeration, a style probe
- `pharn/floor/stage-runtime.test.mjs` — NEW (Q1): the argv rules, the containment walk's link kinds, the budget tracker, the drain's three outcomes, and a one-owner pin over both stage scripts
- `pharn/floor/stage-exit-core.test.mjs` — EDIT: `STAGES` is `["regress", "verify"]`; verify's vocabulary exact; F1 controls for verify's question; cross-stage isolation
- `pharn/floor/run-gates.test.mjs` — EDIT, header comment only: `/pharn-verify`'s pinned lines are now executed by `stage-verify.test.mjs`
- `.dev/floor/command-hygiene.test.mjs` — EDIT: GATE_RUN_WIRING 2 → 1; STAGE_SCRIPT_WIRING 1 → 2 with per-stage patterns, per-stage no-direct-invocation lists and per-stage A1 probes; the loop-mapping closure per stage; the three verify pins re-pointed at the script; RULE B's message
- `.prettierignore` — `pharn/features/*/VERIFY.md` (L23)
- `.markdownlint-cli2.jsonc` — `pharn/features/*/VERIFY.md` (L23)
- `SKILLS_VERSION` — 6.23.0 → 6.24.0
- `CHANGELOG.md` — a new `## [6.24.0]` section (`[Unreleased]` is empty at base) stating the weaker and the stronger claim and every behaviour change listed below
- `README.md` — the shields badge to 6.24.0 and the regenerated CURRENT-STATE region (`npm run docs:generate`; floor checkers 86 → 90 with Q1, 89 without)
- `CLAUDE.md` — a Commands entry for `stage-verify.mjs`; the run-gates, AC-gate and stage-regress entries' verify sentences re-pointed
- `.dev/features/stage-verify-script/BUILD.md` — the build's own record: the measurements, the probes with their exit codes, the command's byte size

### Explicitly not touched

- `.claude/commands/pharn-dev-verify.md` and the dev floor keep their prose flow (follow-up `dev-verify-stage-script`).
- `pharn/ARCHITECTURE.md`, `LIMITS.md`, `THREAT-MODEL.md`, `pharn/CONSTITUTION.md`, `CODEOWNERS`, `.claude/settings*.json`, the four hook scripts and `pharn.spec-template.md` are human-only; this increment needs no change to any of them (the §4 contract list gains no entry, since no new contract is added).
- `pharn/floor/check-verify.mjs`, `run-gates.mjs`, `check-build-complete.mjs` and `check-loop.mjs` keep their bytes: the script only shells them.
- `pharn/floor/check-bash-reconcile.test.mjs` needs no edit: the thin command's reference section still names the reconcile gate's fixed argv, and the executed binding (the stamp's last run is `reconcile` with `--require-baseline`) moves into `stage-verify.test.mjs`.
- `pharn/floor/gate-run-core.test.mjs` needs no edit: the thin command keeps the brace allowlist.
- `pharn/floor/check-loop-fresh.test.mjs` needs no edit: its floor-module closure is derived from string literals and it uses `DEFAULT_STAMPS` symbolically.
- `pharn/floor/stage-regress.test.mjs` needs no edit: it drives only the CLI, so it is the unchanged evidence for the Q1 refactor.
- `.claude/hooks/writes-scope-release.test.cjs` needs no edit: its sets are derived from the corpus and `pharn-verify.md` stays in both.
- `pharn/floor/README.md` needs no edit: its two verify sentences stay true.
- `MIN_CLI` stays 0.5.0: no installed path moves.

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — the envelope, the exit table, the closed question round trip and the shared budget rule, reused; one registry key added (cited, not restated — P4).
- `pharn/pharn-contracts/gate-run-record.md` — the stamp is produced by `run-gates.mjs` exactly as before, at the same `--out`, with `reconcile` last and completeness in `aux`.
- `pharn/pharn-contracts/verify-report.md` — the checker's fields verbatim, the two advisory blocks as the contract's object shows them; only the writer changes, from the model to code.
- `pharn/pharn-contracts/ac-tests.md` — the AC gate runs exactly as today: `--ac-gate` passed on every verdict call.
- `pharn/pharn-contracts/reconciliation-record.md` — both artifacts are already `pipeline_artifacts`, `.pharn/` is git-ignored, and nothing new needs an exemption.
- `pharn/pharn-contracts/finding-shape.md` — verifier findings (none today) would render fenced as DATA; the `structural:` gates keep the emission contract's `findings.json` pairing through `actualForExpected`.

## Evals to write (P1)

No `role:`-bearing capability is added, so `validate.mjs`'s eval obligation does not arise. Every new floor
module ships a `*.test.mjs`, and every ★ test names the edit that turns it red (L60).

- **★ WIRING (L45):** extract `pharn-verify.md`'s pinned fresh line and run it with `sh -c` in a fixture repo
  that holds the floor closure (derived from string literals, as `stage-regress.test.mjs` derives it, plus the
  runner's argv-named children `check-bash-reconcile.mjs`, `check-build-complete.mjs`, `check-structural.mjs`
  and their closures), the guards `reconcile` executes (`.claude/hooks/protect-trusted-paths.cjs`,
  `enforce-writes-scope.cjs`, and the setter), `reconcile-ignore.json`, and a baseline anchored after a
  setter call (as `/pharn-build` Step 0 does). It must reach `done` with verdict `PASS`, and: the report's
  checker fields deep-equal a fresh `check-verify.mjs --stamp … --feature … --ac-gate` (E); `gate_run.stamp_sha256`
  equals the stamp's sha256 (D); every log hash matches (J); the stamp sits at `DEFAULT_STAMPS.verify` and
  validates (C); `fingerprint.final` equals the live fingerprint after the render (F); the last run is
  `reconcile` with `--require-baseline` in its argv. Control: the same line with `--timeout-ms` dropped does not
  reach `done`. The wall time is measured and recorded (L24).
- **★ LOOP-FRESH over REAL outputs:** run `stage-regress.mjs` and then `stage-verify.mjs` over one fixture and
  run `check-loop-fresh.mjs --feature … --base … --iter 1` → `FRESH`, with A, B, C, D, J, E, H, F and G each
  asserted `pass`. Control: an edit to a tracked file after verify turns F into a RERUN.
- **Verdicts through the script:** a red project gate → `done`, `FAIL`, the gate named; a declared concrete path
  absent → `done`, `INCOMPLETE` (check-verify's exit 3 is a verdict, so `/pharn-ship` Step 2b still fires), with
  `completeness.missing` naming it; a PLAN whose `## Files` holds only globs → `done`, `INCONCLUSIVE`, the reason
  carried; a legacy SPEC → `ac_gate` `NOT-APPLICABLE`, and `VERIFY.md` says "not-applicable (legacy spec)".
- **Eval pairs:** a declared capability directory with `evals/expected/x.json` and `findings.json` → a
  `structural:` entry in the stamp; the same pair untracked still counts; an undeclared capability's pair, a
  pair with no `findings.json`, and a declared glob above the directory → no entry.
- **Refusals:** `missing-artifact`, `chain-red`, `plan-files-unparseable` → exit 3, `VERIFY.md` rendered,
  **no** `verify-report.json`.
- **Stale output:** an earlier report and `VERIFY.md` are gone after every exit that follows the slug and
  containment point (`chain-red`, `missing-artifact`, `no-gates`, a bad `--timeout-ms`, `child-refused`), and
  both survive a pre-slug `usage-error` and a `path-containment` refusal (the named residual). An earlier
  run's `.pharn/pharn-verify/stage.json` is gone after a bad `--timeout-ms` (the N1 difference from regress).
- **Question:** no `package.json` and no `--gates` → exit 4; the object validates; re-invoking the EMITTED
  object's `resume.argv` plus its first option's `argv`, through the shipped `substituteArgv`, reaches `done`
  (6.23.0's N5 fidelity note, applied).
- **Containment and resume:** a symlinked `.pharn`, a dangling one, a symlinked `.pharn/pharn-verify`, and a
  symlinked feature directory → `path-containment` with nothing written through the link; a feature directory
  swapped for a link between a `continue` and `--resume` → `path-containment`; `--resume` with no record →
  `no-progress`; with a malformed record, or one naming a phase outside RESUMABLE_PHASES → `progress-malformed`;
  `--resume --gates x`, `--resume --budget-ms`, `--resume --budget-ms 100 100` → `usage-error`.
- **Argv (M7):** `--timeout-ms 50` and a 10-digit value → `usage-error` up front; a trailing `--budget-ms` →
  `usage-error`; an unknown flag and a positional → `usage-error`.
- **★ Budget:** `--budget-ms 1` over three or more gates → exit 5 repeatedly, every invocation advancing
  exactly one slow step, and `--resume` reaches the same `verdict`, `failing_gates`, `gates` and `ac_gate` as an
  unbudgeted run. The clock: a PATH shim that makes only `git ls-files` slow shows the opening work is charged
  (a 2 s window stops the second gate; a 60 s control reaches `done`); the old-clock mutant turns it red.
- **★ Kill mid-drain:** a SIGKILL while a gate runs leaves the record at `drain`; `--resume` reaches `done`.
- **Verifiers:** a fixture with one `role: verifier` markdown file → `verifiers.registered` 1 with the note, the
  deferral line in `VERIFY.md`, and the same verdict as the zero-verifier control (verifiers never flip it).
- **Crash paths:** a fixture floor whose `check-build-complete.mjs` throws → `unusable child-crashed`, never an
  `INCOMPLETE` report, and no gate log exists under `.pharn/pharn-verify/gates/` (no gate ran); a fixture floor
  whose `check-verify.mjs` throws after printing nothing → `child-crashed`; controls reach `done`.
- **★ CLOSURE:** every `reason_code` literal in `stage-verify.mjs` is a registered verify code, and every
  registered verify code has an emitter; an injected variant spelling fails.
- **Core:** VERIFY_PATHS; the progress validator closed both ways (a missing key, an extra key, a bad phase);
  EVAL_PAIR_RULE members and non-members (the last `/evals/expected/` marker wins; a root-level `evals/`
  pairs with nothing); classifyVerdict over every verdict and exit pair, a mismatched pair, non-JSON, an array
  and a verdict outside the set; checkCompleteness over each of the checker's real output shapes (complete,
  incomplete, inconclusive) and the non-members (empty text, a JSON array, `complete` as a string, a non-string
  inside `missing`, `{"toString":1}` — L62); composeReport's key order, its collision refusal, and the note only
  when `registered > 0`; the load graph is exactly `gate-run-core.mjs`, with an injected-import control.
- **Render:** one fixture per verdict and per refusal; a hostile gate id, missing path and reason (fence runs,
  a fake heading, an inline link) stay inside fences; L62 cases with the `String()` control; no rendered
  outcome matches `ABS_PATH_RE` (imported by the test only); the real `validate.mjs` stays GREEN over a render
  quoting `rule_id:` and `problem:`, and the no-preamble control goes RED; ★ ENUMERATION — `VERIFY.md` is named
  in `PIPELINE_ARTIFACTS`, `reconcile-ignore.json`, `EXCLUDED_ARTIFACTS`, `/pharn-loop`'s staging list,
  `.prettierignore` and `.markdownlint-cli2.jsonc` (six sites, counted); a style probe that self-skips without
  `node_modules`.
- **Runtime (Q1):** each argv rule over members and non-members; the containment walk over a regular path, a
  live link, a dangling link and a file component; the budget tracker at `elapsed + N === B` and `+1`; the drain's
  three outcomes; a pin that neither stage script defines `containmentWalk`, `lstatSafe`, `makeBudget` or the
  argv rules itself.
- **stage-exit-core:** `STAGES` is exactly `["regress", "verify"]`; the verify vocabulary is exact; forged-label,
  forged-argv, extra-key, added-option and removed-option controls for verify's `no-gates`; a regress-only code
  (`scope-escaped`) is not a verify member and a verify question is not a regress question with verify's text.
- **command-hygiene:** STAGE_SCRIPT_WIRING pins both stages' fresh and resume lines with `N < B < 600000`, that
  `pharn-verify.md` invokes none of `run-gates.mjs`, `check-verify.mjs`, `check-plan-spec-agree.mjs`,
  `check-build-complete.mjs`, `count-verifiers.mjs` and `check-structural.mjs` directly, and the A1 scope
  EXECUTED for verify (VERIFY.md, verify-report.json and `src/x.js` denied; `.pharn/pharn-verify/x.json`
  allowed; the no-scope control); the loop-mapping closure runs per stage with a mutant control; the verdict-line
  pin reads the script's check-verify argv (`--stamp`, `--feature`, `--ac-gate`) and never a `--complete`.

## Guarantee audit (P0)

Each claim carries its reduction, and each quantified sentence names the probe the build runs and records in
`BUILD.md` with its exit code (L37).

- "The named gates passed" / "every AC was delivered" → **floor**, unchanged: `check-verify.mjs`'s exit-code
  threshold and the AC gate, now shelled by tested code.
- "The verdict rests on a current, approved plan" → **floor**: content-hash + enum,
  `check-plan-spec-agree.mjs`, read through `shelledVerdict`, so a crash is never read as a RED.
- "Verifier membership is deterministic" → **floor**: the frontmatter enum read, `count-verifiers.mjs`, shelled.
  A crash is `child-crashed`, never a zero.
- "The gate map's keys and values are the runner's" → **floor, given the stamp**, unchanged.
- "The eval-pair set is deterministic" → **floor**: path membership over a `-z` listing
  (`featureEvalPairs`), newly tested code where it was model judgment. Whether the rule FITS a project's layout
  is **advisory**.
- "Every field the checker printed is in the report, verbatim" → tested code (`composeReport`), and in the loop
  `check-loop-fresh` E re-derives it (**floor** there). Never provenance (L43). Probe: a report whose
  `ac_gate` was edited fails E.
- "A report on disk means `check-verify.mjs` ran for it" → **narrowed, not a guarantee**: every `refused` stop,
  and every `unusable` stop at or after the slug and containment point, removes the earlier report first and
  writes none. Probe: each named refusal and a post-slug `usage-error` leave no report. **The residual:** a stop
  before the slug parses, `path-containment` itself, or a genuine crash can leave an earlier report — exactly
  why `/pharn-ship` tests the current file's `.verdict`, and the same residual regress carries.
- "`VERIFY.md` is rendered from the JSON" → tested deterministic code; it gates nothing (**advisory** content).
- "While the script runs, no Write-tool write lands outside `.pharn/**`" → **floor: hook** (fix #7), probed at
  plan time (above) and by the executed hygiene test. STRONGER than before, when the scope admitted the two
  artifacts. Running the setter is command prose (advisory), as for every command.
- "The script writes only its two artifacts and `.pharn/pharn-verify/**`" → **weaker than before, stated.**
  Before, fix #7 PREVENTED a Write-tool write elsewhere. Now the writes are `fs` calls through Bash (L19) at fixed
  literal paths under a slug-gated feature directory, pinned by tests. **And unlike regress, NOT detected
  either:** they happen after this stage's own `reconcile` gate ran, and no later stage reconciles, so a stray
  write by this script would be neither prevented nor detected. The mitigation is the small, literal write set
  and its tests — tested code, not a floor claim.
- "No question leaves the stage guessing" → **floor**: the closed `no-gates` code (enum); relaying and
  answering it are **advisory**.
- "A crash is never read as a verdict" → **floor, narrowed to the two readings this stage makes**: exit 1 is
  not a member of the stage-exit table; the verdict call's exit must match its JSON verdict (a crash that exits
  1 is `child-crashed`, not `FAIL`); and a completeness capture that fails `checkCompleteness` is
  `child-crashed`, not `INCOMPLETE`. Probes: a throwing `check-verify.mjs` → `child-crashed`; a throwing
  `check-build-complete.mjs` → `child-crashed` with no gate run. **Not covered:** a well-shaped capture that
  disagrees with its recorded exit (the `checkCompleteness` bound), and a crash inside a gate, which is that
  gate's exit code and is data by design.
- "The harness never kills a gate" → **conditional** on the caller's numbers, as in regress: the script
  guarantees only the start rule, `N < B < 600000` is pinned for the committed command, and the unbudgeted
  tail is a named bound.
- "The feature is correct" → **not a claim**; it stays struck.

## Trust audit (P2)

- **Inputs.** The PLAN's `## Files` text is untrusted and becomes only declared path strings, used as prefix
  operands of a membership test. An eval pair must also exist in the git listing, so a PLAN cannot introduce
  a path the tree does not hold, and the runner's `parseExtras` shape-gates each one before building a fixed
  argv. `SPEC.md` is hashed by the shelled checker and never read here.
- **Child output.** `check-verify.mjs` stdout is parsed; only its `verdict` enum and exit integer branch; the
  object is copied into the report as data. `count-verifiers.mjs` contributes an integer and paths.
  `completeness.json` is shape-checked and copied; its `missing[]` values originate in the untrusted PLAN and
  render fenced. Every child reason quoted into a `detail` goes through `dataText` (L62).
- **Executed commands.** The user's own suite (discovered, or the user's own `--gates` text), and the runner's
  fixed-argv children (`check-structural.mjs`, `check-build-complete.mjs`, `check-bash-reconcile.mjs`). No
  command comes from PLAN or SPEC text.
- **The render.** Every untrusted value sits inside a fence computed longer than any back-tick run in it; closed
  values render inline only after a membership test; the fixed preamble keeps CHECK 5 GREEN over any quoted
  text (L10). No absolute path the script supplies appears: every path handed to a child or the renderer is
  repo-relative. A user's own `--gates` text renders as given, so that is the stated bound, as in regress.
- **The question object.** Fixed text and the user's own argv only.
- **Residual.** A human or model reading `VERIFY.md`'s quoted text is the accepted, bounded residual
  (`LIMITS.md §2`, `THREAT-MODEL.md §5`). Nothing gates on it.

## Determinism audit (P5)

- Every branch reads a membership test: the shelled checkers' exit codes and enums, the closed rules, the
  budget decision, and the progress validator.
- No branch reads prose, and the model classifies nothing: gate discovery is the runner's fixed rule, and the
  eval-pair discovery moves from model judgment to `featureEvalPairs`.
- The terminal fallback is the structured `no-gates` question, and `/pharn-loop` maps it to a fixed row.

## Consumer compatibility — verified by reading each consumer this run

| consumer                                              | reads                                                                                                            | why it stays compatible                                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check-loop-fresh` A                                  | `verify-report.json` parses, `verdict` in its enum                                                               | the report is the checker's object plus two blocks; a refusal leaves none, and the loop stops at S9 before reading it                                                 |
| `check-loop-fresh` B                                  | the report's `reason_code`                                                                                       | only the checker writes one, from `gate-run-core`'s closed set                                                                                                        |
| `check-loop-fresh` C                                  | the verify stamp at `DEFAULT_STAMPS.verify`                                                                      | the same `--out`, now derived from `VERIFY_PATHS`                                                                                                                     |
| `check-loop-fresh` D                                  | `gate_run.stamp_sha256`                                                                                          | the stamp is never touched after it is finalized                                                                                                                      |
| `check-loop-fresh` J                                  | log and per-test results hashes                                                                                  | the script never touches `gates/` after the drain                                                                                                                     |
| `check-loop-fresh` E                                  | a live `check-verify` re-run WITH `--ac-gate` (unmoved tree) or WITHOUT (moved tree)                             | the report's checker fields are that same output, so equality holds unmoved; moved, `gates`, the non-AC `failing_gates` and the verdict rule come from the same stamp |
| `check-loop-fresh` F                                  | the stamp's `fingerprint.final` against the live tree                                                            | everything written after the drain is `.pharn/` or an EXCLUDED artifact of the active feature                                                                         |
| `check-loop-fresh` G                                  | regress head `final` equals verify `init`                                                                        | "fresh" removes only EXCLUDED artifacts and `.pharn/` before init                                                                                                     |
| `check-loop.mjs`, `check-loop-decision.mjs`           | `verdict`; `failing_gates` on FAIL                                                                               | verbatim from the checker                                                                                                                                             |
| `ship-outcome-core.mjs`                               | `verdict`                                                                                                        | unchanged logic; its residual narrows for verify                                                                                                                      |
| `render-run-report.mjs`                               | `verdict`, `failing_gates`, `ac_gate`                                                                            | verbatim; an absent report already renders "the run stopped before a verify, or it was blocked"                                                                       |
| `render-ship-briefing.mjs`, `check-ship-briefing.mjs` | `verdict`                                                                                                        | verbatim                                                                                                                                                              |
| `/pharn-ship` step 7 and Step 2b                      | `.verdict`, `.failing_gates[]`, `.completeness.missing[]`, `.ac_gate`                                            | all kept; `INCOMPLETE` passes through, so Step 2b fires; a refusal is the missing-report STOP (the text is updated)                                                   |
| `/pharn-loop`                                         | the stage's outcome; Step 5 hands `.failing_gates[]`, `.completeness.missing[]`, `.ac_gate.acs[]` to the rebuild | the verify mapping paragraph; the fields are kept                                                                                                                     |

## Behaviour changes, disclosed (each goes into CHANGELOG [6.24.0])

- **A refusal writes no `verify-report.json`** (a RED chain, a missing artifact, an unparseable `## Files`).
  Before, the command wrote a fail-closed `INCONCLUSIVE` report on a RED chain. `/pharn-ship` still STOPs, now
  on its missing-report rule; `/pharn-loop` stops at S9 as before (Q3).
- **A runner refusal inside the stage is `unusable child-refused`, so `/pharn-loop` stops at S9.** Before, the
  command wrote a fail-closed report carrying the runner's `reason_code`, and `check-loop-fresh` B re-ran verify
  once when that code was a lapse (`lock-busy`, `tree-changed-between-gates`, …). Inside one script those
  lapses need a concurrent process or an external writer; stopping is the fail-closed direction, as regress has
  since 6.23.0 (Q5).
- **An unparseable PLAN `## Files` is a refusal at verify.** Before, the gates ran and the verdict read
  `INCONCLUSIVE` through completeness. Build and regress refuse such a PLAN first, so only a standalone
  `/pharn-verify` reaches it (Q6).
- **A crashed `check-build-complete.mjs` stops the stage before any gate runs** (`unusable child-crashed`).
  Before, the stamp's `aux.completeness` read node's exit 1 as "incomplete" (probed under Discovery), the
  verdict read `INCOMPLETE`, and `/pharn-ship` Step 2b answered it with its one bounded rebuild. The runner is
  unchanged, so `/pharn-dev-verify` and any direct `check-verify.mjs` caller keep the old reading (named
  follow-up).
- **Registered verifiers are counted and none is run** (Q4).
- **The eval-pair discovery is a rule, not a judgment**, so a PLAN that names no file under a capability
  directory gets no `structural:` gate for it.

## Success measure — tool calls before vs after

**Before (counted on the command at `1524c6f`).** A happy-path run with G project gates, P eval-pair gates and
the injected `reconcile` prescribes **14 + d + G + P** tool calls:

- 13 fixed: the constitution read, the setter, the PLAN read, the SPEC read, the chain check, `init`,
  `count-verifiers`, `check-verify`, the `completeness.json` read, the report Write, the re-scope, the
  `VERIFY.md` Write, the release;
- d ∈ {0, 1}: the eval-pair discovery the command leaves to the model;
- G + P + 1 `run --next` calls.

For G = 3 and P = 0 that is **17–18** calls, each a full model turn over a 55,683-byte prompt, from 8 fenced
bash blocks.

**After.** **4 + k** calls: the constitution read, the setter, the pinned line, one resume call per `continue`,
and the release. k = 0 when every slow step after the first starts inside the 30 s window; k ≤ G + P, since each
invocation advances at least one of the G + P + 1 slow steps. For G = 3 and P = 0 that is **4–7**, over a
prompt of at most 20,000 bytes, from 5 fenced bash blocks (setter, fresh line, question template, resume line,
release).

**Recorded-run measure (outside this build).** The `pharn-verify` rows of `cost.json`'s
`by_stage_iteration_model` view in the user's ledgers (roadmap 0.3), against a run after `pharn update` to 6.24.0.

## Siblings in flight — reconciliation (whichever merges later)

- **Version:** each sibling bumps to 6.23.0 from 6.22.0; this plan bumps 6.23.0 → 6.24.0. The later merge
  renumbers by diff and moves `[Unreleased]` entries as the CHANGELOG rules require.
- **`writes-scope-run-only` (0.2):** it rewords every product command's Final step. The thin `pharn-verify.md`
  contains none of the phrase its closure test retracts, so it passes that test as written; the later merge
  applies whichever Final-step wording is newer. It also edits `check-bash-reconcile.test.mjs` and
  `command-hygiene.test.mjs` in other hunks.
- **`ship-quick-mode` (3.1):** it edits `pharn-verify.md`'s first paragraph ("in a full run, `/pharn-regress`
  (a `/pharn-ship --quick` run starts no `/pharn-regress` …)") and bumps its version to 0.4.1. The later merge
  carries that sentence into the thin command's opening paragraph and keeps version 0.5.0 or higher. Its
  `ship-outcome-core.mjs` header rewrite and this plan's one-comment edit overlap in the same header.

## Deferred — named, not dropped

- `dev-verify-stage-script`: `/pharn-dev-verify` keeps its prose flow (L31).
- The verifier runner stays deferred until the first `role: verifier` capability is authored outside PHARN's own
  shipped surface (the recorded reopen trigger).
- `stage-exit-runner-lapse-rerun`: a closed stage-exit code that `/pharn-loop` could re-run once, if an observed
  lapse ever motivates it (Q5; P7).
- `run-gates-completeness-crash`: the runner reads a crashed `check-build-complete.mjs` as "incomplete" for
  every caller except this stage.
- `count-verifiers-flush-rule`: `count-verifiers.mjs` still ends with `process.exit`, and this stage now parses
  its stdout. A listing past 64 KiB (about a thousand verifier paths; zero exist) could be cut on a platform
  whose piped stdout is asynchronous, which reads as `child-crashed` — fail-closed, named rather than converted
  (P7).
- `architecture-contract-list-stage-exit` (from 6.23.0, unchanged).
- Retiring the allowlist prose copy (kept, with its parity test).

## Open questions (HALT)

Each carries a recommendation; GATE 1 is the orchestrator's, under the maintainer's delegation.

- **Q1 — one owner for the stage-script mechanics, or two copies?** (a) Recommended: `pharn/floor/stage-runtime.mjs`,
  lifted out of `stage-regress.mjs`, which then imports it; the regress suite, unchanged, is the evidence.
  (b) Per-script copies plus an executed cross-copy test in `stage-verify.test.mjs` over the shared refusal cases.
  Why (a): the copied helpers are exactly the ones 6.23.0's review repaired one at a time (M7a/b/c, A4, A3), and
  L31 records that the second copy of a pair is where such an obligation is dropped. Cost of (a): the diff reaches
  a script that shipped yesterday.
- **Q2 — the report's bytes.** The brief says "the checker's own bytes". Today's command merges `completeness` and
  `verifiers` into the checker's JSON, `verify-report.md`'s object shows both, and `/pharn-ship` and `/pharn-loop`
  read `.completeness.missing[]`. (a) Recommended: the checker's object verbatim plus those two blocks, merged by
  tested code. (b) The checker's exact bytes, with the two blocks moved to `VERIFY.md` only: a contract change,
  and two consumer reads to re-point.
- **Q3 — does a refusal still write a fail-closed report?** (a) Recommended: no. A report exists only when the
  checker ran, symmetric with regress and with the contract's `refused` row ("no machine report"), and
  `/pharn-ship`'s missing-report rule already STOPs. (b) Keep today's script-written `INCONCLUSIVE` chain-red report,
  which is not the checker's output and needs a per-stage exception in the contract.
- **Q4 — registered verifiers when the runner is deferred.** (a) Recommended: count them, record
  `registered` with a fixed note, run none, and let the verdict stand (verifiers never flip it). (b) Refuse with an
  `unusable` code. (c) Ask with a `question`. (b) and (c) would block verify on an advisory layer.
- **Q5 — runner lapses inside the stage.** (a) Recommended: `unusable child-refused` → S9, disclosed, as regress
  does. (b) A new closed code the loop re-runs once (`stage-exit-runner-lapse-rerun`); no observed lapse motivates
  it (P7).
- **Q6 — the pinned numbers and the `plan-files-unparseable` refusal.** Recommended: keep regress's
  `--timeout-ms 540000 --budget-ms 570000` (the per-gate limit README already documents), and refuse an unparseable
  `## Files` rather than silently running with no eval pairs, which would be a coverage loss.
