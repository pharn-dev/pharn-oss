# PLAN — loop-entry-preflight: a delivery run runs verify's gates once on the tree it starts from, in the background, and stops before the build when one is already red

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L22, L30, L34, L35, L38, L41, L44, L45, L54, L62, L66]
- increment: `/pharn-loop` (Step 1a) and `/pharn-ship` (Step 2 item 1) start one new floor CLI, `entry-gates.mjs --start`, right after the run's entry steps. It resolves the gate set `/pharn-verify` will discover (`resolveSet`, `gates.exclude` applied) and runs it ONCE, through `run-gates.mjs`, in the working tree, in a detached background runner, while the spec, plan and grill stages run. A pinned `--wait` line reads its verdict just before `/pharn-test`. A red gate stops an unattended run as a new stuck point `S14` (`blocked: gates-red-at-entry`) unless the person opted in with a leading `--allow-red-entry`; `/pharn-ship`, which has a person present, asks. `--abort` runs at every stop.
- layer(s): pharn-floor (product), pharn-contracts (one contract), product `.claude/commands` (four files)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## GATE 1 record

GATE 1 was decided by the orchestrating model under the user's delegation (2026-10-05), not by a human: approved with
one design change. The first plan's placement (A), foreground before the spec stage, became (D), background in the
working tree, overlapping spec + plan + grill, read before `/pharn-test`. The evidence against (B) (an isolated
worktree) was accepted. The item-9 prefix-weight note was dropped from this increment (below).

## Why (P7)

The batch brief's evidence (§2, finding 1b), re-read this run from `~/Projects/pharn-starter` (read-only) and from
`.dev/measurements/loop-wall-clock-2026-10-05.md` (on `main`):

- **All three 6.35.0 `/pharn-loop` runs had gates red before any change, and nothing looked until verify.**
  `billing-plan-catalog` (91.75 min): `build` red at base and head (its `REGRESSION.md`, `pre_existing`), plus a
  discovered `e2e` the user does not run locally. `workspace-wording-ui` (33 min): its `LOOP.md` records "standing reds
  outside the plan would also have kept verify red: 2 unit tests and the Sentry `typecheck`". `locales-en-pl-only`
  (`--quick`, 27.5 min): its `verify-report.json` reads `test: 1, typecheck: 2, build: 1`, and its `LOOP.md` says all
  three are red at base. `/pharn-verify`'s threshold is absolute, so no such run can PASS; `check-loop.mjs` reads a
  verify `FAIL` as `CONTINUE` until `STOP_CAP`.
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
  `["verify", "regress", "ac-test"]`. For any stage but `verify`, no `reconcile` is injected, and `run-gates.mjs` runs
  `check-build-complete` only for `verify`. So a stage `entry` gets exactly verify's discovered set, with no `reconcile`
  and no completeness.
- `run-gates.mjs` fingerprints the tree before and after every gate (`worktree-fingerprint.mjs`) and refuses to finalize
  when one gate's `fp_before` differs from the previous gate's `fp_after` (`tree-changed-between-gates`). The
  fingerprint excludes `.pharn/` and a closed set of POST-build artifacts; `SPEC.md`, `PLAN.md`, `GRILL.md` and
  `AC-TESTS.md` are INCLUDED, so the front stages' writes would trip that refusal for an overlapping run.
- The front stages write only `pharn/features/<name>/**`: `writes:` of `/pharn-spec` (`SPEC.md`), `/pharn-plan`
  (`PLAN.md`, `AC-TESTS.md`), `/pharn-grill` (`GRILL.md`); none runs a formatter over them. Their other writes are under
  `.pharn/` (markers, stage results, the writes-scope record). `/pharn-test` (`AC-TESTS.lock.json` + the test files) is
  the first stage that writes files a gate reads outside the feature directory.
- `gate-reuse-core.mjs` `findReusable` accepts only a `regress`/`head` stamp (`validateStamp` with `REUSE_SOURCE`), and
  the execution identity includes the fingerprint algo.
- **Measured this run: a process spawned `detached: true, stdio: "ignore"` and `unref()`'d from a Bash-tool call
  survives the call's end** (it wrote its file 20 s later, after the Bash call had returned).

## The core decision — where and when the gates run

|                     | (A) foreground before spec (first plan) | (B) background, isolated worktree + install                                                                                                                                                                | (D) background, working tree, overlapping the front (chosen)         |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| healthy full run    | + E ≈ 4–9 min                           | ≈ 0                                                                                                                                                                                                        | ≈ 0 while E ≤ the front (spec + plan + grill: 20.7 / 13.5 min [R·m]) |
| healthy quick run   | + E                                     | ≈ 0                                                                                                                                                                                                        | + max(0, E − front); the quick front was 5.1 min [R·m]               |
| doomed run stops at | ≈ minute 4–10                           | end of the front                                                                                                                                                                                           | end of the front, or E if longer                                     |
| fidelity to verify  | exact                                   | **false red measured**: the base worktree lacks the ignored `.env.local`, so `next build` fails env validation (`.pharn/pharn-regress/base-gates/2-build.err`); a fresh install hides stale `node_modules` | exact: same tree, same `node_modules`, same ignored files            |

E is the project's verify gate time: `test` 155 s [R·m]; `typecheck` ≈ 5 s and a failing `build` ≈ 63 s [R·e, mtimes];
the whole verify set with `e2e` 8.6 min [R·m, the locales verify interval].

## The design

### Three invariants (D) must keep, and how

1. **The front stages' writes must not make the run refuse.** The `entry` stage's fingerprint excludes exactly
   `pharn/features/<name>/` — the validated slug, a literal prefix, never a glob — and carries its own algo token
   (`worktree-fingerprint/2+sha256+entry-feature-dir`). Any other tree change between gates still refuses
   (`tree-changed-between-gates`). **Sound for `entry` only:** an entry stamp is read by `entry-gates.mjs` alone; it is
   never reuse evidence (`findReusable` accepts only `regress`/`head`, and its identity's algo differs), and every
   other consumer passes `expect.stage` to `validateStamp` and refuses it. A test pins all three.
2. **A model-written artifact must not false-red a style gate.** The `entry` set drains `STYLE_SET` first. The runner
   records the feature directory's digest when the run starts (`d0`) and before and after every gate. A style gate's
   red counts only when that gate's run began and ended with the directory as it was at `d0`, i.e. before this run
   wrote any artifact. Otherwise it is `unattributed`: reported, never a stop. **What remains when a style gate is
   slow:** its red is then `unattributed`, so the run continues exactly as it does today and verify judges it.
   Non-style gates are not held to this rule. The front writes only markdown under the feature directory, and the
   assumption that `test` / `typecheck` / `build` / `e2e` do not read it is ADVISORY. It is stated, and
   `--allow-red-entry` is the remedy.
3. **No gate is left running, and no wait is a model poll.** `--start` spawns a detached runner (`setsid`) and records
   `{feature, nonce, pid}`. `--wait` blocks inside node up to `--budget-ms` and exits `5` to be re-run as the same
   pinned line. `--abort` freezes the runner's process group (SIGSTOP), snapshots `ps -A -o pid=,ppid=,pgid=`, then
   SIGTERMs every descendant gate's process group and SIGKILLs the runner's, with a SIGKILL after a grace. Every signal
   is sent only after `ps -p <pid> -o args=` shows the runner's own nonce, so a reused pid is never signalled. One
   runner per tree (L38): a new `--start` supersedes an earlier one (abort first, then wipe).

### The CLI — `pharn/floor/entry-gates.mjs` (I/O) + `pharn/floor/entry-gates-core.mjs` (pure rules)

```text
node pharn/floor/entry-gates.mjs --start --feature '<name>' --timeout-ms 540000
node pharn/floor/entry-gates.mjs --wait --feature '<name>' --budget-ms 570000
node pharn/floor/entry-gates.mjs --abort --feature '<name>'
```

- `--start`: validates argv (`stage-runtime.mjs` helpers, `FEATURE_SLUG_RE`; `--timeout-ms` required, no default —
  L41); supersedes an earlier runner; wipes `.pharn/pharn-entry/` (containment-walked, lstat-first — L54); runs
  `run-gates.mjs init --stage entry --feature <name> --out .pharn/pharn-entry/gates [--discover package.json]`
  synchronously. Init exit 3 → writes the result `no-gates`, exits `3`. A refusal (a bad `gates.exclude` included) →
  `2`. Else it records `runner.json` (`{schema, feature, nonce, pid: null, timeout_ms, d0}`) BEFORE the spawn, spawns
  the runner, then rewrites the record with the pid (atomic rename) and exits `0` — so the runner, which checks only the
  nonce, can never read the directory before its record exists (grill: the start/runner race).
- the runner (`--runner`, internal; refuses unless `runner.json` names its nonce): one `run-gates.mjs run --next` per
  gate, the feature-directory digest before and after each, then writes `result.json` LAST (atomic rename), carrying
  the nonce, the stamp's sha256 and the per-gate digests. A runner error writes an `unusable` result.
- `--wait`: reads `runner.json` and `result.json` only through `readInProject` (lstat-walked, not followed, capped —
  imported from `regress-base-reuse.mjs`, so a change to that reader reaches this check too; reused, not copied, L35),
  and only when `result.json` carries THIS run's nonce and feature (L66). It then re-reads the stamp, checks its sha256,
  `validateStamp(stamp, {stage: "entry", feature})`, and decides with the pure `entryVerdict`. No result and the runner
  alive → keep waiting, or exit `5` when out of budget. No result and the runner gone → `unusable runner-died`.
- `--abort`: a no-op when no runner record exists or it names another feature; otherwise the kill sequence above, then
  an `aborted` result. Its exit never changes the stop it runs at.

**`--wait` prints ONE JSON document `pharn-entry-gates/1`**, with closed keys for every status:
`{schema, status, feature, gates: [{id, exit, timed_out, mutated}], red, unattributed, mutated, excluded, reason_code,
runner_reason, detail}`. `mutated` names every gate run-gates recorded as having changed the tree itself (grill: a
mutating entry gate moves the tree after the pre-run snapshot; this makes it visible). `runner_reason` is run-gates'
own closed `reason_code` when the runner refused (e.g. `tree-changed-between-gates`, which a front-stage write outside
the feature directory causes), else null. Exits are closed: `0` green (nothing attributable red) · `4` red · `3`
no-gates · `5` continue · `2` unusable (closed `REASON_CODES`: `usage-error`, `path-containment`, `child-refused` — any
runner refusal, named by `runner_reason` —, `no-runner`, `runner-died`, `result-unbound`, `stamp-invalid`, `aborted`,
`spawn-failed`, `crashed`). **Bound (grill):** a front-stage agent's write outside the feature directory during the
entry run is `child-refused` / `tree-changed-between-gates`, so the loop stops at S9 although the run might have been
healthy. That write would itself read `scope-escaped` at regress unless removed again; the bound is stated, not closed.
`1` is never chosen, so node's own crash exit is never a verdict (the 6.21.1 rule). Every untrusted value quoted into
`detail` goes through a total function (L62). Gate output is never read (P2).

### `gate-run-core.mjs` — minimal

`STAGES` gains `"entry"`, and `resolveSet` orders an `entry` source `STYLE_SET` first (stable within each part).
Nothing else changes.

### `worktree-fingerprint.mjs` + `run-gates.mjs` — the stage-scoped exclusion

`fingerprint(baseDir, {feature, stage})`: for `stage === "entry"`, the whole `pharn/features/<feature>/` is excluded
and the algo is `ENTRY_ALGO`. For every other stage the digest and `ALGO` are unchanged, and the golden test still
pins them. `run-gates.mjs` passes `stage` at its three fingerprint calls. That is a three-token diff, with no change to
the drain.

### `/pharn-loop`

- **Step 1 grammar.** `/pharn-loop [--quick] [--allow-red-entry] [--max-iter N] <description>`. The opt-in is read only
  among the leading flags, never by scanning the description (P2). This is ADVISORY, like `--quick`'s rule.
- **Step 1a item 6, after the `run-start` marker:** the `--start` line. `0` → go on; `3` → **S4**; anything else →
  **S9**. These stops precede the feature directory, so the close part's Step 7 runs unchanged.
- **Step 4, between the grill's return marker and the test stage:** the `--wait` line. `5` → run it again; `0` → go on;
  `4` → **S14** `blocked: gates-red-at-entry`, the `red` ids copied into the record's `### next_steps` as DATA (the
  S12 precedent, so the close part needs no edit), or, with `--allow-red-entry`, go on and name them in the Step 7
  summary (the wait block says so; the close part is not edited), and keep
  the ids for the summary; `3` → **S4**; anything else → **S9**. S14 is an ordinary blocked stop (the feature directory
  exists): record, SPEC revert, close part, all unchanged. A new table row S14 is added.
- **`## At the stop`** (main file): the `--abort` line runs first, before the close part is read.
- The quick part's item 1 grammar names the opt-in. Nothing else in it moves: the read point is the same place, and the
  quick grill runs inline.

### `/pharn-ship`

- **Step 2 item 1, after the pre-run snapshot:** the `--start` line. `0` or `3` → `/pharn-plan`; anything else → STOP.
- **Before `/pharn-test`:** the `--wait` line. `5` → again; `0` or `3` → proceed; `4`, `2` or anything else → present
  the `red` ids or the refusal as DATA and ask **Stop** (STOP via Steps 3/3a) or **Continue** (keep the ids for
  `SHIP.md`). Never a silent continue. That is the terminal fallback to the human (P5).
- **`## Closing the run`** (main file): the `--abort` line runs first at every STOP. The quick part's order sentence
  names the start.

### What is NOT in this increment

- **The item-9 prefix-weight note is dropped** (orchestrator scope change). The `instruction-growth-gate` increment owns
  instruction-file measurement (`instruction-files-core.mjs`, `check-instruction-files.mjs`), and a second owner would
  be L35 duplication.
- No close part is edited (the `loop-closeout-script` builder owns them). No routed stage line is edited
  (`orchestrator-direct-stage-calls`). No `run-gates.mjs` drain change (`gates-parallel-drain`); its edit here is the
  three fingerprint arguments.

## Expected saving (D), per recorded run

Start at t ≈ 0.1 min (after Step 1a). The read point is the grill's return marker: 20.8 / 13.6 / 5.2 min [R·m]. The
verdict is ready at max(read point, 0.1 + E). A stop then costs the close part, ≈ 1–2 min [R·e].

| run                        |    actual | red at entry                       |                            under (D) |    vs actual | vs the post-6.36/6.37 counterfactual |
| -------------------------- | --------: | ---------------------------------- | -----------------------------------: | -----------: | -----------------------------------: |
| billing-plan-catalog       | 91.75 min | `build` [R·m]                      |                          ≈ 22–23 min |   −69 to −70 |                 ≈ 166 → −143 to −144 |
| workspace-wording-ui       |    33 min | `typecheck`, `test` [R·m]          |                          ≈ 15–16 min |   −17 to −18 |                 ≈ 117 → −101 to −102 |
| locales-en-pl-only (quick) |  27.5 min | `test`, `typecheck`, `build` [R·m] | ≈ 9.7–11 min (E = 8.6 → read at 8.7) | −16.5 to −18 |                    ≈ 65 → −54 to −55 |

The counterfactual [R·e] assumes items 2 and 3 merged (so the run reaches verify), and three iterations to `STOP_CAP` at
the measured iteration-1 durations: build 25.7 / 13.1 / 10.9 min; regress 11.1 min; verify 8.6 min. **A healthy run:**
+0 on the two full runs (E 4–9 ≤ front 13.6–20.8), and + max(0, E − 5.1) ≈ 0–3.5 min on the quick one, plus two
orchestrator round trips (`--start`, `--wait`). `workspace-wording-ui`'s `test` red may read `unattributed` only if it
were a style gate. It is not, so its red counts.

## Follow-ups (named, not built — P7)

- `entry-run-as-base-evidence`: offer the entry stamp as `/pharn-regress`'s BASE evidence (6.33.0) when the entry tree
  is the base commit (an empty pre-run snapshot). It would remove the regress BASE side (calls 4–5 of the 92-min run,
  146.2 + 192.1 s [R·m]) and compare HEAD against the same environment (finding 2). Not trivial: it needs a fingerprint
  algo regress accepts, and it touches item 4's area.
- `entry-gates-ledger-row`: the entry runner has no stage marker, so `cost.json` does not show its time. It overlaps the
  front by design.
- `entry-gates-nonstyle-overlap`: if a project's non-style gate is found reading `pharn/features/**`, extend rule 2 to
  that gate class.

## Applied lessons

- L22 — `--start`, `--wait` and `--abort` are pinned literal lines in both commands; no technique is described, and
  no poll is asked of the model.
- L30 — the runner runs every gate the set names; the model names none.
- L34 — an empty set is `no-gates` (exit 3), never a vacuous green. The empty-source refusal is `resolveSet`'s own.
- L35 — one allowlist (`resolveSet`), one executor (`run-gates.mjs`), one argv/containment owner (`stage-runtime.mjs`),
  one reader (`readInProject`). The prefix note stays with its owner increment.
- L38 — one runner per tree under `.pharn/pharn-entry/`. A new start supersedes, and the record binds feature + nonce.
- L41 — `--timeout-ms` / `--budget-ms` have no defaults; the tests run the CLI with the exact pinned argv.
- L44 — the `--wait` re-run line carries no state: only `<name>` and a pinned constant.
- L45 — a ★ WIRING test EXECUTES both commands' committed lines in a git sandbox (start → wait → abort) and pins each
  branch's row.
- L54 — every read under `.pharn/pharn-entry/` is lstat-walked and never followed.
- L62 — every untrusted value in a `detail` is quoted through a total function, tested with `{"toString":1}`.
- L66 — `--wait` reads only a `result.json` that the runner wrote LAST, carrying the nonce `--start` recorded, in a
  directory `--start` created empty.

## Files

- `pharn/floor/entry-gates-core.mjs` — NEW. Pure: `ENTRY_PATHS`, schemas, `ENTRY_STATUSES` + exit map,
  `REASON_CODES`, `entryVerdict`, the runner/result record validators (closed both ways), `parsePsTable`,
  `descendantGroups`. — layer pharn-floor
- `pharn/floor/entry-gates.mjs` — NEW. The CLI (`--start`, `--wait`, `--abort`, internal `--runner`) and
  `featureDirDigest`; the `import.meta.main` guard. — layer pharn-floor
- `pharn/floor/entry-gates.test.mjs` — NEW. The test cases:
  - every status and exit, each with a one-input mutation: green, red, timed out, no `package.json`, empty set,
    `gates.exclude` honoured and disclosed, e2e kept, `continue` then green;
  - a feature-directory write between gates does not refuse, and a write elsewhere refuses;
  - the style-first order, and a style red after `d0` moved reads `unattributed`;
  - result unbound (another nonce, another feature), runner died, a symlinked `.pharn/pharn-entry`;
  - abort kills a running gate's group, observed as ESRCH on the pid that gate wrote, and a reused pid is never
    signalled; a superseding start. Every test that starts a runner aborts it in `finally` (grill: no leaked process
    on CI);
  - a `{"toString":1}` detail;
  - ✧ the entry set == verify's discovered set minus `reconcile`, style first;
  - ★ WIRING: both commands' pinned lines EXECUTED in a git sandbox, their order (start after the entry steps,
    wait after the grill and before the test stage, abort at the stop pointer), and each exit's branch.

  — layer pharn-floor (test)

- `pharn/floor/gate-run-core.mjs` — `STAGES` + `"entry"`; the entry style-first order. — layer pharn-floor
- `pharn/floor/gate-run-core.test.mjs` — the `STAGES` pin; `resolveSet({stage: "entry"})`; an entry stamp refused as
  any other stage, and refused by `findReusable`. — layer pharn-floor (test)
- `pharn/floor/worktree-fingerprint.mjs` — the `stage` option, `ENTRY_ALGO`, and the feature-directory exclusion. —
  layer pharn-floor
- `pharn/floor/worktree-fingerprint.test.mjs` — the exclusion is exactly the one directory (a sibling feature, a
  prefix-sharing name and `.dev/features/<name>/` stay in), the default digest is unchanged, and the algo differs. —
  layer pharn-floor (test)
- `pharn/floor/run-gates.mjs` — `stage` passed at the three fingerprint calls. — layer pharn-floor
- `pharn/pharn-contracts/gate-run-record.md` — the stage enum gains `entry`; a short "The entry stage" section. —
  layer pharn-contracts
- `.claude/commands/pharn-loop.md` — the Step 1 grammar, Step 1a item 6, the S14 row, the Step 4 wait block,
  `## At the stop`'s abort line, and `reads:`. — product command
- `.claude/commands/pharn-loop-quick.md` — item 1's grammar names the opt-in. — product command
- `.claude/commands/pharn-ship.md` — Step 2 item 1's start line, the wait block before `/pharn-test`,
  `## Closing the run`'s abort line, and `reads:`. — product command
- `.claude/commands/pharn-ship-quick.md` — the quick order sentence names the start. — product command
- `.dev/floor/command-hygiene.test.mjs` — `STUCK_POINTS` gains S14. `COMMAND_BYTE_CEILINGS` changes only if a
  measured body exceeds its ceiling (a visible diff). — dev floor (test)
- `CLAUDE.md` — a Commands entry for `entry-gates.mjs`; the run-gates usage line's `--stage` list. — repo meta
- `CHANGELOG.md` — the new version section. — repo meta
- `SKILLS_VERSION` — 6.37.0 → 6.38.0 (provisional; the orchestrator assigns the final one at stacking). — repo meta
- `README.md` — the badge, plus the generated CURRENT-STATE region if `npm run docs:generate` changes it. — repo meta
- `docs/capabilities/**` — only what `npm run docs:generate` regenerates. — generated
- `.dev/features/loop-entry-preflight/**` — this increment's pipeline artifacts. — dev apparatus
- `.dev/features/loop-entry-preflight/REVIEW.md` — the independent review, quoted as DATA. — dev apparatus
- `.dev/features/loop-entry-preflight/SHIP.md` — the ship record. — dev apparatus
- `pharn/floor/pre-run-snapshot-core.mjs` — (review R1) the entry-gate-changes record's basename. — layer pharn-floor
- `pharn/floor/pre-run-snapshot.mjs` — (review R1) `recordEntryChanges` / `entryChangesUnchanged`: the same record shape,
  digest and decision as the snapshot, a second file. — layer pharn-floor
- `pharn/floor/pre-run-snapshot.test.mjs` — (review R1) the second record's write, binding and decision. — layer
  pharn-floor (test)
- `pharn/floor/stage-regress.mjs` — (review R1) the partition also subtracts the entry gates' recorded paths and
  reports them in a conditional `entry_gate_changes` block. — layer pharn-floor
- `pharn/floor/stage-regress.test.mjs` — (review R1) the block end to end. — layer pharn-floor (test)
- `pharn/floor/quick-scope-core.mjs` — (review R1) the same, for the quick scope check. — layer pharn-floor
- `pharn/floor/check-quick-scope.test.mjs` — (review R1) the quick case. — layer pharn-floor (test)
- `pharn/floor/render-regression.mjs` — (review R1) the block's lines in REGRESSION.md. — layer pharn-floor
- `pharn/floor/render-regression.test.mjs` — (review R1) render cases. — layer pharn-floor (test)
- `pharn/pharn-contracts/regression-report.md` — (review R1) the conditional `entry_gate_changes` block. — layer
  pharn-contracts

## Review amendments (independent review of `3060476`; decisions by the orchestrating model under the user's delegation)

- R1 — an entry gate's own write lands after the pre-run snapshot, so regress counted it as an escape. The runner lists
  the changed paths (`changedPaths(HEAD)` minus the feature directory, each with `pathDigest`) before and after every gate;
  `--wait` records the paths a `mutated` gate changed, with their digest after it, in `<git dir>/pharn-entry-gate-changes.json`,
  bound to the open run's marker (the snapshot's `buildSnapshot`, `decidePreRun`, `pathDigest` — reused, L35). The
  partition subtracts such a path only while its live digest equals the recorded one, and reports it.
- R2 — `/pharn-loop` reads entry exit 2 as "go on, name the reason in the summary"; only 4 stops (S14), 3 is S4.
- R3 — the header names the `/pharn-ship` case of `d0` (the approved SPEC.md is already there).
- R4 — `--abort` freezes the descendant gate groups too, re-lists until the set is stable, and sends the final SIGKILL
  only to a group a process of which still matches a listed `(pid, ppid, pgid)`.
- R5 — the header's escape bound is narrowed: only a double-forked/reparented process escapes.
- R6 — `--start` refuses `runner-unverifiable` when an earlier runner's pid is alive but `ps` cannot verify it.

## Contracts satisfied

- `gate-run-record.md`: an `entry` stamp is an ordinary `gate-run-record/1` (`validateStamp`), with its own
  fingerprint algo, consumed by `entry-gates.mjs` only.
- `stage-exit.md`: deliberately NOT used. The entry check writes no report, render or question; its own closed exit set
  mirrors the protocol's "1 is never a verdict" rule.

## Evals to write (P1)

No capability (`role:`) is added, so there is no eval fixture. The tests above specify the CLI.

## Guarantee audit (P0)

- The entry set is exactly `resolveSet`'s discovered verify set, style first → floor: enum/regex (one rule,
  ✧ parity-tested).
- A gate's exit is the exit `run-gates.mjs` recorded, in a stamp that validates and whose sha256 the result names →
  floor (agreement, L43: never provenance; a Bash writer can forge `.pharn/` state).
- No tree change outside `pharn/features/<name>/` between gates → floor (content hash, the existing refusal).
- `--wait` exits `4` iff an attributable gate is red under `entryVerdict` → floor (membership over recorded values,
  tested).
- A style red counts only when the feature directory held its `d0` content before and after that gate → floor over the
  runner's recorded digests. That the gate read nothing between those samples is not claimed (a write and a
  byte-identical restore inside one gate is invisible).
- The runner survives the Bash call; `--abort` leaves no gate running → measured / tested on darwin and on CI's Linux.
  Not claimed for a `setsid` descendant (run-gates' own bound) or when `ps` is unavailable (then only the runner's group
  is killed, and the line says so).
- That the run STOPS on exit 4, reads the opt-in from the leading flags only, runs `--abort` at every stop, and that
  `/pharn-ship` asks → advisory (command prose), pinned for presence and order, never proven run.
- "The run would have failed verify" → NOT claimed. A gate red at entry predicts a red verify gate only if the run does
  not fix it. The stop's text says "red on the tree the run started from".
- E and the savings → measured inputs [R·m] plus estimates [R·e]; never claimed reproducible.

## Trust audit (P2)

- Gate stdout/stderr → untrusted. They are reduced to a sha256 by `run-gates.mjs` and never read here.
- `red` / `unattributed` ids → `ALLOWLIST` members from a validated stamp (a closed set); still quoted as DATA.
- The user's description → never parsed for `--allow-red-entry` beyond the leading flags, and it reaches no shell line.
- `ps` output → parsed as three integer columns only; a malformed line is skipped. Nothing in it is executed.

## Determinism audit (P5)

Every branch is an exit-code membership test. The fallback for an unknown exit is a stop (`S9`, or ship's question to
the human), never a guess. The opt-in is the one judgment input, and it is the person's, given before the run.

## Open questions (HALT)

- None.
