# PLAN — loop-entry-preflight: a delivery run runs verify's gates once on the tree it starts from, and an unattended run stops before any model work when one is already red

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L22, L30, L34, L35, L38, L41, L44, L45, L54, L62, L66]
- increment: `/pharn-loop` (Step 1a) and `/pharn-ship` (Step 2 item 1) run one new floor CLI, `entry-gates.mjs`, right after the run's entry steps and before any stage: it resolves the gate set `/pharn-verify` will discover (`resolveSet`, the project's `gates.exclude` applied) and runs it ONCE, through `run-gates.mjs`, in the working tree the run starts from. A red gate stops an unattended run as a new stuck point `S14` (`blocked: gates-red-at-entry`) unless the person opted in with a leading `--allow-red-entry`; `/pharn-ship`, which has a person present, asks.
- layer(s): pharn-floor (product), pharn-contracts (one contract), product `.claude/commands` (four files)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7)

The batch brief's evidence (§2, finding 1b), re-read this run from `~/Projects/pharn-starter` (read-only) and from
`.dev/measurements/loop-wall-clock-2026-10-05.md` (on `main`):

- **All three 6.35.0 `/pharn-loop` runs had gates red before any change, and nothing looked until verify.**
  `billing-plan-catalog` (91.75 min): `build` red at base and head (its `REGRESSION.md`, `pre_existing`), plus a
  discovered `e2e` the user does not run locally. `workspace-wording-ui` (33 min): its `LOOP.md` records "standing reds
  outside the plan would also have kept verify red: 2 unit tests and the Sentry `typecheck`". `locales-en-pl-only`
  (`--quick`, 27.5 min): its `verify-report.json` reads `test: 1, typecheck: 2, build: 1`, and `LOOP.md` says all three
  are red at base. `/pharn-verify`'s threshold is absolute, so no such run can PASS; `check-loop.mjs` reads a verify
  `FAIL` as `CONTINUE` until `STOP_CAP`.
- **Items 2 and 3 of the batch remove the other two entry causes** (pre-run dirt at regress, 6.37.0; an unrunnable
  discovered gate, 6.36.0). With both merged, each of these runs would no longer stop early on them: it would iterate
  build → regress → verify to `STOP_CAP` (M = 3) on gates no build in its plan can fix.
- **The project itself records that fixing a red gate is a feature purpose**: `pharn/features/` holds `fix-ci-reds`,
  `fix-main-red-checks` and `fix-repo-lint-format-gates`. So a run must be able to say "this red gate is the point".

## Confirmed current behavior (read this run, on 6.37.0 = this branch's base)

- Nothing runs a project gate before `/pharn-test`'s red run (AC files only). The first full gate run is the build
  agent's own (advisory), then `/pharn-regress` HEAD, then `/pharn-verify`.
- `gate-run-core.mjs` `resolveSet` is the one discovery rule (ALLOWLIST ∩ `package.json` scripts, `E2E_SET` dropped at
  regress only, `gates.exclude` applied after it, `empty-source-set` before any injection). `STAGES` is
  `["verify", "regress", "ac-test"]`; for any stage but `verify` no `reconcile` is injected, and `run-gates.mjs` runs
  `check-build-complete` only for `verify`. So a stage value `entry` would get exactly verify's discovered set, no
  `reconcile`, no completeness, with no other code change (read: `resolveSet`, `orderEntries`, run-gates `init` lines
  590–760, `run --next` line 986).
- `stage-runtime.mjs` already owns the budgeted drain (`drainGates`, `makeBudget`, `mayStartSlowStep`) both stage
  scripts use; `run-gates.mjs init` wipes `<out>` and asserts its containment under `.pharn/`.
- `/pharn-loop` Step 1a (6.37.0): S1 slug → S2 dir → S3 base → porcelain snapshot → Stop-guard `--open` → pre-run
  snapshot `--capture` → `run-start` marker. A stop there writes no record and goes to the close part's Step 7.
  `/pharn-ship` Step 2 item 1: GATE-1 backstop → `run-marker --open` → pre-run snapshot → `/pharn-plan`.

## The core decision — where and when the gates run

Three placements were weighed against measured facts from this very project. **Chosen: (A), foreground, in the working
tree, before the spec stage.**

|                              | (A) foreground, working tree, before spec                 | (B) background, isolated worktree + install, read before the first build                                                                                                                                                                                                                                                                                      | (C) background, working tree, overlapping the spec stage                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| healthy-run cost             | + the gates' wall time, E ≈ 4–9 min here [R·e, below]     | ≈ 0 on the critical path                                                                                                                                                                                                                                                                                                                                      | ≈ max(0, E − spec) ≈ 1–6 min                                                                                                                                                                            |
| doomed-run stop              | ≈ minute 4–10, no feature dir, nothing to revert          | at the end of the front: min 30.1 / 18.9 / 6.9 in the three runs [R·m markers]                                                                                                                                                                                                                                                                                | ≈ minute 4–10, after a SPEC exists                                                                                                                                                                      |
| fidelity to what verify runs | exact: same tree, same `node_modules`, same ignored files | **measured false red**: the regress BASE worktree's `next build` fails `Production environment validation failed: NEXT_PUBLIC_SITE_URL is required…` because the git-ignored `.env.local` is absent there (`.pharn/pharn-regress/base-gates/2-build.err`); a fresh install also hides the stale-`node_modules` typecheck red the working tree has (finding 2) | exact for the tree, but the spec stage writes `pharn/features/<name>/SPEC.md` mid-run, which `run-gates.mjs` refuses at finalize (`tree-changed-between-gates`) and a project's `format:check` may read |
| new mechanism                | none: `run-gates` + `stage-runtime` drain                 | a detached worker (unmeasured survival across Bash-tool calls), a worktree overlay from the snapshot, an install, a wait line, cleanup; concurrency with `/pharn-test`'s red run on shared ports/DBs                                                                                                                                                          | a second executor without the between-gate fingerprint rule                                                                                                                                             |

**Why (A).** (B)'s one advantage, zero critical-path time, is real, but in the evidence project its isolated tree
**false-reds `build` on every run** (the ignored `.env.local` is never in a fresh worktree), so it would stop healthy runs
too — the worst outcome for a speed item — and its fresh install hides one class (stale dependencies) that the working
tree shows. (C) saves at most the spec stage's 1.3–3.6 min [R·m] and needs an executor that tolerates a moving tree,
which is the property `run-gates.mjs` exists to refuse. (A) answers exactly the question "can verify pass on this
tree's pre-existing gates?", reuses the one executor, and inherits batch item 5's parallel drain for free, which would
cut E to about the longest gate.

**The cost is stated, not hidden.** E is the project's full verify gate time (e2e included, since verify runs it), paid
once per run, in wall clock, with no model tokens beyond the orchestrator's 1–6 continue round trips. Measured inputs
for pharn-starter: `test` 155 s (the 92-min run's verify, vitest JSON span) [R·m]; `typecheck` ~5 s and a warm, failing `build`
~63 s (mtimes of a later run's head logs; a passing build is longer) [R·e]; the whole verify set with `e2e`, 8.6 min (the `locales-en-pl-only`
verify interval, which ran all six gates) [R·m]. Under load the same `test` took 481–511 s [R·m]. Two named follow-ups
recover it (see "Follow-ups").

### Expected saving, per recorded run (A)

Entry steps before the check take 7 s (run-start 08:38:43 → spec start 08:38:50) [R·m]; E = 4–9 min.

| run                        |    actual | red at entry (source)                      | under (A) |      vs actual |                  vs the post-6.36/6.37 counterfactual |
| -------------------------- | --------: | ------------------------------------------ | --------: | -------------: | ----------------------------------------------------: |
| billing-plan-catalog       | 91.75 min | `build` [R·m], `e2e` unless excluded [R·m] |  4–10 min |     −82 to −88 | ≈ 30.1 + 3 × (25.7 + 11.1 + 8.6) ≈ 166 → −156 to −162 |
| workspace-wording-ui       |    33 min | `test`, `typecheck` [R·m]                  |  4–10 min |     −23 to −29 | ≈ 18.9 + 3 × (13.1 + 11.1 + 8.6) ≈ 117 → −107 to −113 |
| locales-en-pl-only (quick) |  27.5 min | `test`, `typecheck`, `build` [R·m]         |  4–10 min | −17.5 to −23.5 |            ≈ 6.9 + 3 × (10.9 + 8.6) ≈ 65 → −55 to −61 |

The counterfactual column [R·e] assumes items 2 and 3 merged (so the run reaches verify), three iterations to
`STOP_CAP` at the measured iteration-1 stage durations (regress = the 92-min run's second regress, 11.1 min; verify =
locales' full verify, 8.6 min). A healthy run pays +E (4–9 min) here.

## The design

### The CLI — `pharn/floor/entry-gates.mjs` (execution) + `pharn/floor/entry-gates-core.mjs` (pure rules)

```text
node pharn/floor/entry-gates.mjs --feature '<name>' --timeout-ms 540000 --budget-ms 570000
node pharn/floor/entry-gates.mjs --resume --feature '<name>' --timeout-ms 540000 --budget-ms 570000
```

1. Validates argv with `stage-runtime.mjs`'s `scanFlags` / `parseTimeoutMs` / `parseBudgetMs` (one owner, L35); `<name>`
   against `FEATURE_SLUG_RE`. `--timeout-ms` is required, no default (L41).
2. Fresh: `run-gates.mjs init --stage entry --feature <name> --out .pharn/pharn-entry/gates --discover package.json`
   (no `--discover` when there is no `package.json`, which `resolveSet` reads as the empty set). Init wipes `<out>`, so the
   directory this run reads was created empty by this run (L66); its exit 3 is `no-gates`.
3. `--resume`: no init; the in-progress record or the stamp under `<out>` must name the same feature (read with
   `regress-base-reuse.mjs` `readInProject`, lstat-walked, never followed, capped — L54/L59), else `unusable`.
4. Drains with `stage-runtime.mjs` `drainGates` + `makeBudget` (the budget clock starts at the first statement); out of
   budget → `continue`.
5. Reads `<out>/stamp.json` the same way, `validateStamp(stamp, {stage: "entry", feature})`, and decides with the pure
   `entryVerdict`: red = every run with `exit !== 0` or `timed_out` — by membership over the validated stamp (P5).
6. Prints ONE JSON document, `pharn-entry-gates/1`, a closed key set for every status:
   `{schema, status, feature, gates: [{id, exit, timed_out}], red: [ids], excluded, out, reason_code, detail}`.

**Exits (closed; `1` deliberately unused, so node's own crash exit is never a verdict — the 6.21.1 rule):** `0` green ·
`4` red · `3` no-gates · `5` continue · `2` unusable (closed `REASON_CODES`: `usage-error`, `child-refused` — a runner
refusal, `tree-changed-between-gates` included —, `no-progress`, `feature-mismatch`, `stamp-invalid`, `crashed`). Every
untrusted value quoted into `detail` goes through a total function (L62).

**It writes only through `run-gates.mjs`, under `.pharn/pharn-entry/` (one per tree, L38).** It judges nothing about the
gates' output (untrusted free text, P2); only exit codes from the stamp.

### `gate-run-core.mjs` — ONE line

`STAGES` gains `"entry"`. Nothing else: `resolveSet` already gives a non-verify stage verify's discovered set (e2e kept,
`gates.exclude` applied) without `reconcile`, and `validateStamp` is generic. The `entry` stamp's consumers are this CLI
alone; every existing reader passes `expect.stage` and refuses it (`stage-mismatch`).

### `/pharn-loop` — Step 1a item 6 (local; no stage line touched)

After the `run-start` marker: the pinned line, then the resume line on exit 5, branching only on the exit code (P5):
`0` → go on; `4` → **S14** `blocked: gates-red-at-entry`, the printed `red` ids quoted as DATA in the summary — unless
`--allow-red-entry` was given, then go on and name them in the Step 7 summary; `3` → **S4** (`blocked: no-gates`, now
at entry); anything else → **S9**. A stop here precedes `pharn/features/<name>/`, so no record and no SPEC revert: the
close part's Step 7, unchanged. New table row S14 (cells kept under the current column widths, so no other row
re-pads). Step 1's grammar gains the opt-in: read only among the leading flags (after `--quick`, before `--max-iter`),
never by scanning the description (P2) — ADVISORY, an instruction to the model, like `--quick`'s rule.

### `/pharn-ship` — Step 2 item 1 (after the pre-run snapshot)

Same pinned lines. `0` → `/pharn-plan`; `4` → present the red ids (DATA) and ask, through the interactive form the
stages use: **Stop now** (a STOP via Steps 3/3a) or **Continue** (the feature fixes them, or the person accepts a FAIL at
GATE 2; keep the ids for `SHIP.md`) — never a silent continue; `3` → proceed (ship's verify still asks `no-gates` and
can take explicit gates from the person, as today); anything else → STOP. The quick part's order sentence names the step.

### What is NOT in this increment

- **The item-9 prefix-weight note is dropped** (orchestrator scope change): the `instruction-growth-gate` increment owns
  instruction-file measurement (`instruction-files-core.mjs`, `check-instruction-files.mjs`); a second owner would be L35
  duplication.
- No close part is edited (the `loop-closeout-script` builder owns them); no stage line is edited
  (`orchestrator-direct-stage-calls`); no `run-gates.mjs` edit (`gates-parallel-drain`).

## Follow-ups (named, not built — P7)

- `entry-run-as-base-evidence` — offer a green-or-red entry stamp as `/pharn-regress`'s BASE evidence (6.33.0) when the
  entry tree is the base commit (empty pre-run snapshot). It would remove the regress BASE side (worktree, install, base
  gates: calls 4–5 of the 92-min run, 146.2 + 192.1 s [R·m]) and compare HEAD against the same environment (finding 2's
  false regression), turning E into a net saving. Touches regress-base-reuse and item 4's area; not trivial.
- `entry-gates-background` — (B) with a nested worktree that inherits the project's `node_modules` by resolution and git's
  ignored root files, if usage data shows healthy runs dominate; needs the detached-worker survival measured first.
- `entry-gates-ledger-row` — the entry check has no stage marker, so its time shows only as the gap between `run-start`
  and the first stage-start in `cost.json`.

## Applied lessons

- L22 — the CLI and its resume line are pinned literal command lines in both commands; no technique is described.
- L30 — the step runs every gate it names: the set is `resolveSet`'s, the model names none.
- L34 — an empty set is `no-gates` (exit 3), never a vacuous green; the empty-source refusal is `resolveSet`'s own.
- L35 — one allowlist (`resolveSet`), one executor (`run-gates.mjs`), one drain (`stage-runtime.mjs`); nothing copied.
- L38 — `.pharn/pharn-entry/` is one per tree; the stamp's `feature` binds it to this run's fresh S2 name.
- L41 — `--timeout-ms` has no default; the tests run the CLI with the exact pinned argv.
- L44 — the resume line carries no run state: only `<name>` and the two pinned constants.
- L45 — a ★ WIRING test EXECUTES both commands' committed lines in a git sandbox and pins each branch's row.
- L54 — the stamp and the in-progress record are read lstat-first, never followed (`readInProject`).
- L62 — every untrusted value in a `detail` is quoted through a total function, tested with `{"toString":1}`.
- L66 — the verdict reads only the stamp this invocation's drain (or a same-feature resume) finalized, in a directory
  `init` created empty.

## Files

- `pharn/floor/entry-gates-core.mjs` — NEW. Pure: `ENTRY_PATHS`, `ENTRY_SCHEMA`, `ENTRY_STATUSES` + exit map,
  `REASON_CODES`, `entryVerdict(stamp, feature)`, `entryDocument(...)`, `validateEntryDocument` (closed both ways). —
  layer pharn-floor
- `pharn/floor/entry-gates.mjs` — NEW. The CLI (fresh and `--resume`), the `import.meta.main` guard. — layer
  pharn-floor
- `pharn/floor/entry-gates.test.mjs` — NEW. Every exit with a one-input mutation (green, red, timed out, no
  `package.json`, empty set, `gates.exclude` honoured and disclosed, e2e kept, `continue` then `--resume`, a resume with
  no record / another feature's record, a malformed exclusion, a symlinked `.pharn/pharn-entry`, a mutating gate →
  `tree-changed-between-gates`, a throwing value in a detail); ✧ PARITY (the entry set == `resolveSet` verify's
  required set minus nothing but `reconcile`); ★ WIRING (both commands' pinned lines EXECUTED in a git sandbox, their
  order after the entry steps and before the first stage, and each exit's branch). — layer pharn-floor (test)
- `pharn/floor/gate-run-core.mjs` — `STAGES` gains `"entry"`. — layer pharn-floor
- `pharn/floor/gate-run-core.test.mjs` — the `STAGES` pin; `resolveSet({stage: "entry"})` keeps e2e, applies the
  exclusion, injects no `reconcile`; an `entry` stamp validates and is refused under `expect.stage: "verify"`. — layer
  pharn-floor (test)
- `pharn/pharn-contracts/gate-run-record.md` — the stage enum gains `entry`; a short "The entry stage" section. —
  layer pharn-contracts
- `.claude/commands/pharn-loop.md` — Step 1 grammar (`--allow-red-entry`), Step 1a item 6, the S14 row, the
  before-the-feature-dir stop list, `reads:`. — product command
- `.claude/commands/pharn-loop-quick.md` — item 1's entry grammar names the opt-in. — product command
- `.claude/commands/pharn-ship.md` — Step 2 item 1's entry-gates paragraph and question, `reads:`. — product command
- `.claude/commands/pharn-ship-quick.md` — the quick order sentence names the step. — product command
- `.dev/floor/command-hygiene.test.mjs` — `STUCK_POINTS` gains S14 (count 16); `COMMAND_BYTE_CEILINGS` only if a
  measured body exceeds its ceiling (a visible diff, measured + 10 %). — dev floor (test)
- `CLAUDE.md` — a Commands entry for `entry-gates.mjs`; the run-gates usage line's `--stage` list. — repo meta
- `CHANGELOG.md` — the new version section. — repo meta
- `SKILLS_VERSION` — 6.37.0 → 6.38.0 (provisional; the orchestrator assigns the final one at stacking). — repo meta
- `README.md` — the badge, and the generated CURRENT-STATE region if `npm run docs:generate` changes it. — repo meta
- `docs/capabilities/**` — only what `npm run docs:generate` regenerates. — generated
- `.dev/features/loop-entry-preflight/**` — this increment's pipeline artifacts (PLAN, GRILL, BUILD, REGRESSION,
  VERIFY, REVIEW, SHIP and their JSON reports). — dev apparatus

## Contracts satisfied

- `gate-run-record.md` — an `entry` stamp is an ordinary `gate-run-record/1` (validated by `validateStamp`), consumed by
  `entry-gates.mjs` only.
- `stage-exit.md` — deliberately NOT used: the entry check is no stage script (no report, no render, no question); its own
  closed exit set mirrors the protocol's "1 is never a verdict" rule.

## Evals to write (P1)

No capability (`role:`) is added, so no eval fixture. The tests above are the specification of the CLI.

## Guarantee audit (P0)

- The entry set is exactly `resolveSet`'s discovered verify set for the stage `entry` → floor: enum/regex (the one rule,
  ✧ parity-tested).
- A gate's recorded exit is the exit `run-gates.mjs` recorded, in a stamp that validates → floor (agreement over the
  validated stamp; L43: never provenance — a Bash writer can forge `.pharn/` state).
- The CLI's exit is `4` iff a validated stamp's runs contain a non-zero exit or a timeout → floor (membership, tested).
- That the run STOPS on exit 4, that the opt-in is read only from the leading flags, and that `/pharn-ship` asks → advisory
  (command prose the model follows), pinned for presence and order by tests, never proven run.
- "The run would have failed verify" → NOT claimed. A gate red at entry predicts a red verify gate only if the run does
  not fix it; a gate green at entry may still go red (flaky, environment). The stop's message says "red on the tree the
  run starts from", nothing more.
- E (the healthy-run cost) → measured inputs [R·m] + an estimate [R·e]; never claimed reproducible.

## Trust audit (P2)

- Gate stdout/stderr → untrusted; reduced to a sha256 by `run-gates.mjs`; never read here.
- Gate ids in `red` → `ALLOWLIST` members from the validated stamp (closed set); still quoted as DATA in summaries.
- The user's description → never parsed for `--allow-red-entry` beyond the leading flags; it reaches no shell line.
- `package.json` / `pharn.config.json` → read by `run-gates.mjs` exactly as at verify (shape-gated by `gate-run-core`).

## Determinism audit (P5)

Every branch is an exit-code membership test; the terminal fallback of every unknown exit is a stop (`S9` / STOP), never
a guess. The opt-in is the one judgment input, and it is the person's, read before the run.

## Open questions (HALT)

- None blocking. For the orchestrator at GATE 1: (1) confirm (A) over (B) given the measured `.env.local` false red;
  (2) the opt-in's name `--allow-red-entry`; (3) `/pharn-ship` asking on red (vs. a plain STOP).
