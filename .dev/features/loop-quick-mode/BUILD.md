# BUILD — loop-quick-mode (`/pharn-loop --quick`, 6.27.0)

- plan: `.dev/features/loop-quick-mode/PLAN.md` at `007bc87` (the approved plan, its GATE-1 amendments and the grill's
  G1–G8 folds), built on branch `loop-quick-mode` from `2e5c2e3` (6.25.0, #280).
- stage model: build — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- date: 2026-09-26 → 2026-09-27 (the build crossed midnight; the CHANGELOG section carries the build's date, 2026-09-27).
- verdict: `node pharn/floor/validate.mjs .` → **exit 0**, `FLOOR: GREEN — 36 capabilities checked in "."`.

Every line below records a command this build ran, with its exit code. Nothing is asserted from the plan.

## Step 0 and Step 1 — scope, anchor, drift, preconditions

- `node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/loop-quick-mode/PLAN.md` → exit 0,
  `32 path(s)` (= the 32 `## Files` bullets; the `###` exclusion block contributed none).
- `node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-dev-build` → exit 0, `2370 path(s), scope 32 entr(ies)`.
- `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` → `d831d30d…f4f4` = the plan's `spec_content_hash` — no drift.
  `## Open questions (HALT)`: Q1 resolved at GATE 1 ((a)). `SKILLS_VERSION` read `6.25.0`, `MIN_CLI` `0.5.0`.
- Before any test was written, the unchanged suites were run over the new code:
  `node --test pharn/floor/check-loop.test.mjs … check-loop-record … check-loop-decision … cli-stdout-flush` → 123/124
  (the one red: the key-set test, which the plan names as gaining `mode`); `node --test pharn/floor/check-loop-fresh.test.mjs`
  → 48/49 (the one red: the 6.21.1 contract stub, whose document lacked the new `mode` key). Both reds were the
  planned consequences and were updated with the tests below; no other existing test moved.

## Files written vs `## Files` (32)

All 32 scoped paths, nothing else (`npm run check:reconcile` → exit 0, `CLEAN`, below):

- NEW (8): `pharn/floor/loop-mode-core.mjs`, `pharn/floor/loop-mode-core.test.mjs`,
  `.dev/features/loop-quick-mode/handoff/make-patch.mjs`, `proposed/human-only.patch`, `proposed/human-only.sha256`,
  `proposed/apply.sh`, `proposed/APPLY.md`, and this `BUILD.md`.
- EDITED (23): `check-loop.mjs`, `loop-fresh-core.mjs`, `check-loop-fresh.mjs`, `check-loop-record.mjs`,
  `check-loop-decision.mjs`, `render-run-report.mjs` (one comment), `pharn/floor/README.md`, the three contracts
  (`loop-record.md`, `cost-ledger.md`, `spec-template.md`), the four commands (`pharn-loop.md`, `pharn-spec.md`,
  `pharn-grill.md`, `pharn-ship.md`), the four existing test files (`check-loop`, `check-loop-fresh`,
  `check-loop-record`, `check-loop-decision`), `.dev/floor/command-hygiene.test.mjs`, `CLAUDE.md`, `README.md`,
  `CHANGELOG.md`, `SKILLS_VERSION`.
- IN SCOPE, UNCHANGED (1): `PLAN.md` (the formatter left it byte-identical).
- Human-only files: none written by any tool. `LIMITS.md` travels only in `proposed/human-only.patch`.

**Declared Bash writes:** `npx prettier --ignore-unknown --write <27 explicit paths>`, then on explicit paths again
after a later edit — `README.md` (the commands row shortened so the table keeps its width), `pharn-loop.md` (the S6c
and S9 cells, likewise), `APPLY.md` + `apply.sh`, and `BUILD.md` (exit 0 each); `npx markdownlint-cli2 --no-globs
--fix <12 .md paths>`, then `APPLY.md` and `BUILD.md`, and `pharn-loop.md` read-only (exit 0, 0 issues each);
`npx eslint <14 .mjs paths>` (read-only, exit 0); `npm run docs:generate`, run once (exit 0 —
README's CURRENT-STATE region, **floor checkers 88 → 89**; `docs/capabilities/` and `docs/lessons-index.md` came back
byte-identical); `node .dev/features/loop-quick-mode/handoff/make-patch.mjs` (exit 0, below). Scratch lived only under
`.pharn/pharn-dev-build/` (`.mjs`, `.log`, never `.md`) and is deleted before the commit.

## The floor and the gates

| command                                                                  | exit | result                                                                       |
| ------------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------- |
| `node pharn/floor/validate.mjs .`                                        | 0    | `FLOOR: GREEN — 36 capabilities`                                             |
| `npm test`                                                               | 0    | 3782 tests, 3782 pass, 0 fail                                                |
| `npm run format:check`, `lint`, `lint:md`, `docs:check`, `check:markers` | 0    | each exit 0                                                                  |
| `npm run check:badge`, `check:changelog`, `check:contributing`           | 0    | badge `6.27.0` = `SKILLS_VERSION`; newest section `## [6.27.0] - 2026-09-27` |
| `npm run check:reconcile`                                                | 0    | `CLEAN` (the epoch this build anchored)                                      |
| `npm run check:changelog-entry` (merge base `2e5c2e3`)                   | 0    | GREEN — 1 new entry, opens `## [6.27.0]`, no merged entry or heading changed |

The targeted suites, `node --test --test-reporter=tap <file>`: `loop-mode-core.test.mjs` 20/20;
`check-loop.test.mjs` + `cli-stdout-flush.test.mjs` 48/48; `check-loop-record.test.mjs` 94/94;
`check-loop-decision.test.mjs` 24/24; `check-loop-fresh.test.mjs` 65/65; `command-hygiene.test.mjs` 236/236; and the
suites that read `pharn-loop.md` whole-file (`render-run-report`, `check-test-stage`, `run-marker`,
`require-loop-record`) together with hygiene and `check-loop`: 484/484 after the last edit to the command.

## The probes (P1 — each with the control that must turn it red)

Every probe the plan names under "Evals and tests" is a test in the files above; the load-bearing ones:

- **The mode reading** — `loopModeOf` over 15 laid-out cases, ✧ parity with `check-spec.mjs --spec-kind` on every one
  (the CLI printed `quick` on exactly the 4 quick fixtures), ★ flipping only the kind line flips the mode both ways.
- **The table** — ★ a feature SPEC never yields `STOP_GREEN_QUICK` and a quick one never `STOP_GREEN`, over 7 verify ×
  4 regress × 2 cap cases (non-vacuous: each table reached its own green); ★ PASS + a `regressions` report is CONTINUE
  under a feature SPEC and `STOP_GREEN_QUICK` under a quick one; ★ `--quick`, `--mode quick` and `--mode full` are
  refused (INCONCLUSIVE, `mode: null`) beside either SPEC; ★ D3 — a copied floor whose `loop-mode-core.mjs` throws at
  load, exports nothing, is missing, or returns a non-member decides a full case byte-identically and a quick case
  INCONCLUSIVE; full mode byte-identical with and without a feature SPEC over 11 cases; ★ WIRING — the committed stop
  line from `pharn-loop.md`, executed in a quick feature directory → `STOP_GREEN_QUICK`, over a feature SPEC →
  INCONCLUSIVE; ✧ the source assigns exactly five decisions and `INCONCLUSIVE` only in its refusal objects.
- **Freshness** — QUICK FRESH (A–F, J, I pass; G, H `skipped`); each of the eight checks the quick column runs, broken
  alone (L52, and a ✧ closure that the break set covers exactly those checks); ★ stale regress evidence (another
  feature's stamps, a `regressions` report) never read in quick mode, and the same files STOP (`feature-mismatch`) once
  the SPEC reads full; ★ the kind re-pinned to feature → RERUN `regress` at A; ★ a kind flipped after approval — to
  quick over a full run's evidence → STOP `front-stage-red` at I, away from quick → RERUN `regress` at A; ★ WIRING —
  both committed freshness lines over a quick fixture → FRESH, then a moved tree → RERUN verify / STOP.
- **The record** — the cross-field rule both ways; `mode` shapes (`QUICK`, `fast`, `full,quick`, a tab, `toString`,
  empty → RED); a blocked quick record → GREEN; ✧ `DECISION_ENUM` equals `check-loop.mjs`'s stop tokens plus
  `INCONCLUSIVE` (source and behaviour); ★ L42/L58 — a quick `STOP_CAP` record over a SPEC reverted the Step-6a way →
  GREEN; ★ D8's own record (`STOP_GREEN_QUICK`, no `mode`, quick SPEC) → RED `MODE_MISMATCH` here and RED in
  `check-loop-record.mjs`, and the "repaired" record (`mode: quick`) turns both GREEN — the control that shows why Step
  6b never edits `mode`; ★ G3 — a quick GREEN line never names `regression-report.json`, a full one names both.
- **The command** — `LOOP_QUICK_WIRING`: the three pinned lines exactly once and inside `## Quick mode`, the skip set,
  four skip-site pointers, `STOP_GREEN_QUICK` at three sites, the ADVISORY label, the not-checked list, the G1 capture
  and no-repair sentences, the G7 closure (with a byte parity against `render-run-report.test.mjs`'s own
  `RENDER_INVOCATION`), the `/pharn-spec` misfit refusal and the absent 6.25.0 sentence, the `/pharn-grill` invoker; the
  `STOP_GREEN` closure over the corpus; ten mutation controls, each run; and ★ EXECUTED — the committed `--spec-kind`
  line prints `quick` / `feature`, and the committed git listing + scope line exit 1 on a stray and 0 once it is
  declared.

**The patch generator** — `node .dev/features/loop-quick-mode/handoff/make-patch.mjs` → exit 0, printed
`3e9ae509fbbf19cf473b8a8b84fb65af2b1997e67165f8690ceee39bbcdbd446  LIMITS.md`; `git apply --check
.dev/features/loop-quick-mode/proposed/human-only.patch` → exit 0; `git apply --stat` → `LIMITS.md | 17 +++++++++++---`
(14 insertions, 3 deletions: §3a's "gated" and its unattended paragraph, §6's first bound). One refusal per in-memory
check, run through `node .pharn/pharn-dev-build/probe-make-patch.mjs` (scratch) → exit 0:

- a `find` matching twice (the §6 find doubled) → refused, `FailedGeneration`: "find string matched 2 time(s), expected
  exactly 1 — nothing written"; control: the live `LIMITS.md` edits cleanly (+1,056 bytes);
- a replacement dropping a registered marker string → 1 red ("…was present and is now absent"); control: the real
  edit, 0 reds over the 7 registered `LIMITS.md` sites;
- a CHECK-5 text stripped of its split words → `ok=false`; control: the edited `LIMITS.md` → `ok=true`;
- (this generator's own) a stray CR outside every hunk, the REAL generator run in a throwaway repo → exit 1, nothing
  written on the patch side.

## The success measure, re-derived on this HEAD

`node .pharn/pharn-dev-build/count-calls.mjs` (scratch, exit 0) over the committed commands. A "call" is one fenced bash
block the command prescribes, or one Read/Write the step requires; happy path, no re-run (the plan's definition).

| per iteration (Step 5)            | full                    | quick                 | re-derived from                                                                  |
| --------------------------------- | ----------------------- | --------------------- | -------------------------------------------------------------------------------- |
| stages invoked                    | 3                       | 2                     | `## Quick mode` item 5                                                           |
| phase-marker calls                | 6                       | 4                     | Step 5: 6 `mark-phase.mjs` lines (3 stage-start, 3 orchestrator), 1 regress pair |
| `/pharn-regress`'s own calls      | 3                       | 0                     | `pharn-regress.md`: 5 fences, 2 of them conditional resumes                      |
| `/pharn-regress`'s prompt re-read | 19,526 B                | 0                     | `pharn-regress.md` size                                                          |
| the scope check                   | inside `/pharn-regress` | +2 fences, +0–2 Reads | `## Quick mode`: the listing fence and the scope-line fence                      |
| freshness + stop                  | 2                       | 2                     | Step 5: 2 pinned lines                                                           |
| **loop-level calls**              | **11**                  | **8–10**              | 8 Step-5 fences + regress's 3; 8 − 2 + 2..4                                      |

| per run (once)       | full                                                                          | quick                                        | difference   |
| -------------------- | ----------------------------------------------------------------------------- | -------------------------------------------- | ------------ |
| Step 3               | `/pharn-spec --model-approve` + `check-spec-approved`                         | + the kind read (1 fence in `## Quick mode`) | +1           |
| `/pharn-grill`       | 6 fences + 3 Reads + n `SKILL.md` + ≥ 1 griller read + the write = **11 + n** | 5 fences + existence + the write = **7**     | **≥ −4 − n** |
| Step 6b/7 run report | the render fence + the print                                                  | none                                         | −2           |

**One figure moved on re-derivation:** the plan's `/pharn-grill` row reads "≥ 10 + n", but its own enumeration
(setter, three reads, two floor stops, the skills scan + n, the griller count + ≥ 1 griller read, the write, `--clear`)
sums to 11 + n, and `pharn-grill.md`'s seven fences confirm the six the full path runs. So a run of k iterations
prescribes about `k·(1…3) + (4 + n) + 1` fewer calls (the plan: `k·(1…3) + (3 + n) + 1`), and k fewer regress stages —
a base worktree, a base install and two suite runs each.

**A cost the plan did not count, disclosed:** `pharn-loop.md` grew from 76,680 B to 95,988 B (+19,308 B — `## Quick
mode` is 14,364 B of it, the named line edits the rest), and every `/pharn-loop` run carries the command prompt, full or
quick. A quick run still nets out per iteration (it drops the 19,526 B regress prompt each time); a full run pays the
growth. Measured, not assumed; whether to trim is a review question.

## Decisions and deviations, each named

1. **`LOOP_MODES` has four importers, not two.** `check-loop-record.mjs` and `check-loop-decision.mjs` import the
   vocabulary from `loop-mode-core.mjs` (L35 — one owner of the fact) instead of restating `{full, quick}`;
   `loopModeOf` itself still has exactly the plan's two readers.
2. **`make-patch.mjs` adds one check of its own** — no CR in the edited text — because `human-only.sha256` is
   verified by `shasum -c` over raw bytes while the imported `hashDoc` folds CRLF; probed (above).
3. **Three small `pharn-loop.md` edits beyond the named list** (for the `stage-model-routing` merger): the Step 2
   "A stop before `pharn/features/<name>/` exists" sentence names S6c; Step 6b's envelope sentence names the optional
   `mode`; and "What `/pharn-loop` does NOT do"'s approval bullet reads "a committed green stop" (an R2 referent the
   sweep missed). The `## Quick mode` question table and the S6c and S9 table cells were worded to keep the
   stuck-point table at its 6.25.0 width (360 columns), so no other row's bytes move.
4. **`check-loop-fresh.test.mjs`'s shared helpers changed:** `expectCrashDoc` now asserts `mode: null`, and the 6.21.1
   contract stub's document carries `mode` — both required by the new `DOC_KEYS`.
5. **The hygiene suite executes the three `## Quick mode` lines** (★ above) in addition to the presence pins the plan
   lists — L45's invocation-layer check for the two lines new in this increment.

## The merge of `origin/main` 6.26.0 (#281), and the re-verification on it

- `git fetch origin` → exit 0; `git merge --no-commit --no-ff origin/main` (`008b24b`, `stage-verify-script`, 6.26.0)
  → 4 conflicts. Four more files changed on both sides auto-merged (`pharn-loop.md`, `pharn-ship.md`,
  `command-hygiene.test.mjs`, `CLAUDE.md`); the other 33 files main changed are main's version.
- The conflicts, each resolved keeping both sides:
  1. `pharn/floor/loop-fresh-core.mjs`, the import block — main's `VERIFY_PATHS` (`stage-verify-core.mjs`, which now
     derives `DEFAULT_STAMPS.verify`) and this branch's `loopModeOf` (`loop-mode-core.mjs`), both kept; main's
     `DEFAULT_STAMPS.verify` and check-E comment edits auto-merged beside the quick column.
  2. `SKILLS_VERSION` — `6.27.0`.
  3. `README.md` — badge `pharn-6.27.0`; the generated CURRENT-STATE block regenerated by `npm run docs:generate`
     (exit 0): floor checkers **93** (main's 92 plus `loop-mode-core.mjs`); `docs/capabilities/` and
     `docs/lessons-index.md` came back byte-identical to the merged sources.
  4. `CHANGELOG.md` — `[6.27.0]` directly above main's `[6.26.0]`, its bump sentence now `6.26.0 → 6.27.0`. A scratch
     check (`.pharn/pharn-dev-build/check-changelog-merge.mjs`, exit 0) proved the file is `origin/main`'s byte for
     byte plus one insertion, this section (6,732 B), with nothing else moved.
- **The Quick mode, aligned to the thin caller** (not a conflict: main's Step 2 gained a `/pharn-verify` stage-exit
  mapping). Item 5's exit-0 branch now runs `/pharn-verify` exactly as a full iteration does — the thin caller of
  `pharn/floor/stage-verify.mjs`, its exit mapped by that Step 2 block — and the question table's `/pharn-verify` row
  reads `question no-gates` / `refused`, `unusable` or a crash (`continue` it handles itself) → S4 / S9. S10 left the
  row: 6.26.0's verify registers one question code, `no-gates`. `pharn-ship.md` auto-merged coherently — this branch's
  two `STOP_GREEN_QUICK` sentences and its version `0.10.0` beside main's verdict-binding edits (main left the version).
- Before the merge commit: `node --test` over `command-hygiene`, `stage-verify`, `stage-verify-core`, `stage-runtime`,
  `stage-exit-core`, `stage-regress`, `render-verify`, `check-loop-fresh`, `check-loop`, `check-loop-record`,
  `check-loop-decision`, `loop-mode-core`, `cli-stdout-flush` and `run-marker` → 696/696, so 1.2's
  `STAGE_SCRIPT_WIRING` and this branch's `LOOP_QUICK_WIRING` pins both hold on the merged text; `npx prettier --check`,
  `npx eslint` and `npx markdownlint-cli2` over the merged files → exit 0; `npm run docs:check` → GREEN.
- Merge commit `c9d279c` (`wip(loop-quick-mode): merge main 6.26.0 (#281)`), before any verify.
- `node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/loop-quick-mode/PLAN.md` → exit 0, 32 paths;
  `node pharn/floor/reconcile-baseline.mjs --anchor --by loop-quick-mode-merge-main` → exit 0, 2399 paths, scope 32.
- `/pharn-dev-regress`, default base `git merge-base HEAD origin/main` = `008b24b` → `no-regressions`, exit 0 (inside
  37, escaped none; outside `tests` 3,391 on each side, `validate`, one `structural:` pair; style gates skipped).
- `/pharn-dev-verify` → `PASS`, exit 0 (seven gates `0`; `npm test` 3,878/3,878; `reconcile` `CLEAN` over the new
  epoch, no escapes; `verify-report.json` re-derived byte-identical).
- `npm run check` → exit 0 (3,878 tests); `npm run check:changelog-entry` (merge base `008b24b`) → exit 0, GREEN,
  1 new entry opening `## [6.27.0]`.
- `git apply --check .dev/features/loop-quick-mode/proposed/human-only.patch` → exit 0 against the live `LIMITS.md`
  (1.2 changed no trusted doc: `git diff 2e5c2e3 008b24b` over the four is empty). Applied to a scratch copy under
  `.pharn/` only, the result hashes to `3e9ae509…d446`, the value `human-only.sha256` records; the live `LIMITS.md` was
  not touched.
- **Sizes after the merge.** `pharn-loop.md` is **97,748 B** — main's 78,020 B plus this branch's 19,728 B
  (`## Quick mode` 14,784 B, +420 B for the thin-caller wording). `pharn-regress.md` is now 19,683 B (main +157 B, still
  5 fences), so a quick iteration skips 19,683 B of regress prompt; `pharn-verify.md` is now 18,418 B (5 fences, was
  56,314 B), which both modes run, so it moves neither side of the comparison above.
- The `[6.27.0]` entry's and `CLAUDE.md`'s "full mode byte-identical to 6.25.0" still holds against 6.26.0: main did
  not change `check-loop.mjs` or anything it imports.

## GATE 2 FIX round — 2026-09-27

- The orchestrator's GATE-2 decision — a model decision under the maintainer's 2026-09-25 delegation, not a human one:
  FIX, on `REVIEW.md` at `5ea5e67` (GREEN, 0 floor-gate findings; F1 important, security). Stage model: opus — set by
  the maintainer's instruction; routed via Agent subagent; effort not routed.
  `git merge --ff-only loop-quick-mode` → `29fe0fc..5ea5e67`, exit 0.
- Step 0: `PLAN.md` amended (`## GATE 2 amendments`); `node pharn/floor/check-plan-lessons.mjs …` → exit 0;
  `set-writes-scope.cjs --from-plan` → exit 0, 37 paths; `reconcile-baseline.mjs --anchor --by loop-quick-mode-gate2` →
  exit 0, 2400 paths, scope 37. Mid-round `stage-runtime.test.mjs` joined `## Files` (below): the setter → 38 paths,
  then `reconcile-baseline.mjs --amend-scope` → exit 0, amendment 1 — the contract's order, the setter first.

### F1 — the design

- **The pinned line, at both call sites:** `node pharn/floor/check-quick-scope.mjs --feature '<name>' --base '<base sha>'`
  — `pharn-loop.md` `## Quick mode` item 5 (the git listing fence and 6.25.0's scope line removed) and `pharn-ship.md`
  `## Quick mode` item 7 (6.25.0's line replaced; the base still resolved by `BASE_RULE`, now to its 40-hex SHA). No
  path list reaches any shell argument.
- **The code, and which set each part computes:**
  - `pharn/floor/check-quick-scope.mjs` (new CLI) — pairwise argv (`--feature` and `--base`, each once, nothing else);
    the slug against `gate-run-core.mjs`'s `FEATURE_SLUG_RE`; the base against `SHA_RE` and
    `git rev-parse --verify --quiet <base>^{commit}`; an lstat containment walk of `pharn/features/<name>`
    (`stage-runtime.mjs`'s `containmentWalk`); exit 0 / 1 / 2 with a closed `reason_code` set, a crash caught as 2.
  - The declared set — `pharn/floor/scope-inputs.mjs`'s `declaredWrites`: `PLAN.md` ∪ `AC-TESTS.md` `## Files`
    through `plan-files-core.mjs` (`pathsFromPlanFiles`, `clean`); then `check-regress.mjs`'s `normPath`, exactly as its
    `parseList` applies it.
  - The changed set — `scope-inputs.mjs`'s `changedPaths`: `git diff --name-only --no-renames -z <base>` ∪
    `git ls-files -z --others --exclude-standard`, NUL-split (`stage-runtime.mjs`'s `gitSync`, `nulList`), minus
    `.pharn/` (`worktree-fingerprint.mjs`'s `isExcluded`) — never trimmed.
  - The verdict — `check-regress.mjs`'s newly exported `partitionScope` and `scopeFindings`, the rule and finding
    shape its `scope` CLI applies; the CLI now calls them (output unchanged, `check-regress.test.mjs` 45/45) and runs
    only under `import.meta.main`.
  - One owner (L35): `stage-regress.mjs`'s `readPlanDeclared` / `computeInside` now call `declaredWrites` /
    `changedPaths`, every detail string byte-identical; `stage-regress.test.mjs` is unchanged and passes (at head in the
    regress run below too).
- **The hostile-name test** — `pharn/floor/check-quick-scope.test.mjs`, 28/28, exit 0. Both committed lines, read out of
  the two command files and run under `sh -c` with only `<name>` and `<base sha>` substituted, in a git fixture whose
  `pharn/floor` is a symlink excluded through `.git/info/exclude`. Eleven hostile untracked names —
  `src/$(touch INJECTED).js`, a backtick pair, `src/x$Q.js` (Q unset), `src/x.js,src/x.js`,
  `pharn/features/demo/SPEC.md,src/x.js`, a single quote, a double quote, a newline, `--declared`, `-n`, and
  `src/x.js` with a trailing space — each exits 1 on both lines, with `escaped` equal to that one path byte for byte,
  one finding, and no `INJECTED` file. A **declared** `src/$(touch INJECTED).js` exits 0, and still no `INJECTED`.
  **The control:** 6.25.0's line, run as it instructed in the same fixture — the `$(touch INJECTED)` name created
  `INJECTED`, and `src/x$Q.js` exited 0 (the false pass); the committed line exited 1 on that same tree. The line's own
  shape is pinned too: exactly the two placeholders, each single-quoted, no other shell-active character, and the same
  line in both commands.
- **A second literal importer of the runtime.** `scope-inputs.mjs` imports `stage-runtime.mjs`, so
  `stage-runtime.test.mjs`'s "G3 discriminates" mutation (a computed import path in `stage-regress.mjs` alone) no
  longer dropped the runtime from the regress fixture closure:
  `node --test pharn/floor/stage-regress.test.mjs pharn/floor/stage-runtime.test.mjs pharn/floor/stage-regress-core.test.mjs pharn/floor/cli-stdout-flush.test.mjs`
  → 85/86. The test now mutates every literal importer in the closure, asserting both are found → 19/19. That file
  joined `## Files` through the amendment above.
- **Found by this fix, named, not built — `regress-scope-list-grammar`.** `/pharn-regress`'s own partition still
  reaches `check-regress.mjs scope` through its comma-list argv.
  `node pharn/floor/check-regress.mjs scope --changed "--declared" --declared "src/a.js" --feature demo` → exit 0,
  `escaped: []` (a lone path spelled like the flag shadows it); `--changed "src/a.js " --declared "src/a.js"` → exit 0
  (the trim). Reproduced at that CLI, not through a `stage-regress.mjs` fixture, which already refuses a comma or
  newline path (`unrepresentable-path`). The quick check is immune by construction (arrays); the full mode's remedy is
  the same move, outside this increment. Also stated in `check-regress.mjs`'s header, `CLAUDE.md` and
  `CHANGELOG [6.27.0]`.

### F2–F6 and the patch

- **F2** — `pharn-loop.md`'s quick audit bullet: "Nothing downstream re-checks it: it leaves no record (stdout only),
  `check-loop-fresh.mjs` skips G and H … and the commit gate does not re-run it"; item 5's bound says the same. No new
  artifact.
- **F3** — `check-loop.mjs`'s header: the import fallback holds in this file; the two record checkers import
  `LOOP_MODES` statically and fail to load (exit 1, never GREEN).
- **F4** — `spec-template.md`: "failing that," → "then".
- **F5** — `pharn-loop.md`: a quick qualifier at Step 5.3's FRESH bullet, the retry paragraph and the guarantee audit's
  freshness bullet; `README.md`: "stops (S6c, under `/pharn-loop --quick`) or takes the full pipeline".
- **F6** — Step 5.4's exit-0 bullet: the green of the table the SPEC's kind chose, `decision` read from the JSON; a run
  without `--quick` over a quick SPEC gets `STOP_GREEN_QUICK` and Step 6 never commits it. Its hygiene pin moved with
  it.
- **The LIMITS patch** — `make-patch.mjs`: §3a's scope check gains "(within the bounds §6 states for that check; it
  leaves no record, so nothing after its iteration re-checks it)"; §6's clause names `check-quick-scope.mjs` in place of
  "which run the same partition". `node .dev/features/loop-quick-mode/handoff/make-patch.mjs` → exit 0, printed
  `9accea6586b3901df97fba9a0c81673c62b0510196c7e8d0f3085b08d772b474  LIMITS.md`; `git apply --check` → exit 0;
  `git apply --stat` → 15 insertions, 3 deletions; applied to a scratch copy under `.pharn/` only, the result hashes to
  the recorded sums, and the live `LIMITS.md` is untouched. `APPLY.md`'s two bullets follow. It is regenerated once
  more after `stage-model-routing`'s §8 lands on main.
- **Also touched:** both commands' `reads:` name `check-quick-scope.mjs` in place of `check-regress.mjs`;
  `pharn-ship.md`'s closing paragraph counts two new gating reads; `CLAUDE.md` gains the checker's Commands entry;
  `CHANGELOG [6.27.0]` gains a Fixed entry (the security correction to 6.25.0's bytes) and its Added bullets follow;
  the hygiene suite's quick pins follow the new line (240/240, a mutation control added for a restored listing).

### Gates, this round

| command                                                | exit | result                                                                         |
| ------------------------------------------------------ | ---- | ------------------------------------------------------------------------------ |
| `node pharn/floor/validate.mjs .`                      | 0    | `FLOOR: GREEN — 36 capabilities`                                               |
| `npm run docs:generate`                                | 0    | README CURRENT-STATE: floor checkers 93 → 95; the other regions byte-identical |
| `/pharn-dev-regress` (base `008b24b`)                  | 0    | `no-regressions`; 3,372 outside tests on each side                             |
| `/pharn-dev-verify`                                    | 0    | `PASS`, seven gates `0`; `npm test` 3,906/3,906; `reconcile` `CLEAN`, 18 paths |
| `npm run check`                                        | 0    | 3,906 tests                                                                    |
| `npm run check:changelog-entry` (merge base `008b24b`) | 0    | GREEN — 2 new entries, opens `## [6.27.0]`                                     |

Sizes after this round: `pharn-loop.md` 98,902 B (+1,154 B; `## Quick mode` 15,327 B, +543 B); `pharn-ship.md`
109,295 B.

### Deferred, carried

- **F7 (size) → roadmap Phase 4.1**, with the review's numbers: about 4.9 KB of `## Quick mode` is rationale or audit,
  not instruction (the mode-binding paragraph 522 B, the D8 paragraph 852 B, the quick guarantee audit 2,266 B, item
  5's divergence note 456 B — replaced this round by its bound, the first-token rule's bound about 400 B, item 1's
  mode-marker note about 150 B); about 2 KB of the 2,912 B question table restates Step 2 rows (only four are
  quick-only); and moving `## Quick mode` to a file read only under `--quick` would save about 13–14 KB per full-run
  read, on the review's four conditions (a file outside `.claude/commands/`; `LOOP_QUICK_WIRING` and the two ★ tests
  re-pointed; the S6c row, Step 6b's `mode` sentences and the skip-site pointers stay; the G7 closure goes moot).
- deferred:
  - `lesson: skipped` — the review's candidate (double quotes are not a boundary for untrusted text; L5 recurring) is
    not promoted here; a separate, human-gated `/pharn-dev-memory-promote` decides it.
  - the `stage-model-routing` coupling (Chain sequencing, items 4 and 5) — unbuilt until 2.2 merges.
  - `regress-scope-list-grammar` — above.

## Merge of `stage-model-routing` (2.2) and the coupling — 2026-09-27

- The orchestrator's decision (a model decision under the maintainer's 2026-09-25 delegation, not a human one): 2.2
  merges first as 6.27.0, and this branch takes it in and builds the coupling on it. Stage model: opus — set by the
  maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed. Regress and
  verify are not run this round, and the LIMITS patch is not regenerated (the orchestrator's instruction): both follow in
  one final round, after 2.2's human-applied `LIMITS.md` §8 exists.

### The merge

- `git merge --no-commit --no-ff stage-model-routing` (`5bf6b18`) → 3 conflicts; `pharn-ship.md`,
  `command-hygiene.test.mjs`, `CLAUDE.md` and `README.md` changed on both sides and auto-merged. Each conflict kept both
  sides (PLAN Chain sequencing item 5):
  1. `.claude/commands/pharn-loop.md` — the stuck-point table: 2.2's S9 trigger (a routed stage agent's unusable
     result) beside this branch's S6c row and S9 rule; `## Running a stage (6.27.0)` placed before `## Quick mode`, so
     each section ends at the other's heading; Step 3 and Step 7 keep 2.2's routed text with this branch's quick
     pointers; `version:` 0.11.0 (both sides were at 0.10.0); `reads:` the union.
  2. `pharn/pharn-contracts/cost-ledger.md` — this branch's "`/pharn-loop --quick` writes no mode marker" paragraph,
     then 2.2's `## Route` section.
  3. `CHANGELOG.md` — this branch's section renumbered `[6.28.0]` and placed directly above 2.2's `[6.27.0]`. A scratch
     check (`.pharn/pharn-dev-build/check-changelog-merge.mjs`, exit 0) proved the file is 2.2's byte for byte plus one
     insertion (8,942 B).
- The renumber, 6.27.0 → 6.28.0, found by searching the diff against `stage-model-routing` (scratch
  `.pharn/pharn-dev-build/added-lines-scan.mjs`, exit 0): whole files where 2.2's copy carries no 6.27.0 (the loop
  checkers and their tests, `loop-mode-core.mjs`, `check-quick-scope.mjs`, `scope-inputs.mjs`, `pharn-grill.md`,
  `pharn-spec.md`, three contracts, `make-patch.mjs`, `APPLY.md`, …), line by line in the shared files (`pharn-ship.md`,
  `CLAUDE.md`, `README.md`, the hygiene suite — two of its pins regex-escaped); `SKILLS_VERSION` 6.28.0; the badge;
  `pharn-ship.md` 0.11.0. The only added lines still reading 6.27.0 are this directory's records of earlier rounds and
  the proposed patch (stale until the final round's regeneration).
- Before the merge commit: `npx prettier --write .claude/commands/pharn-loop.md` (the table's padding);
  `npm run docs:generate` → exit 0 (README CURRENT-STATE, 5 lines); `npm test` → exit 0, 3,988/3,988; `npm run lint`,
  `lint:md`, `format:check`, `check:badge`, `check:changelog`, `check:contributing`, `check:markers` → each exit 0.
  `npm run check:reconcile` was RED, as expected: 2.2's files changed since the gate2 epoch, whose scope never named
  them. The fresh epoch below answers it.
- Merge commit `51cf513`.

### Step 0 of the coupling

- `PLAN.md` gains `## Coupling amendments` and five `## Files` paths (38 → 43);
  `node pharn/floor/check-plan-lessons.mjs .dev/features/loop-quick-mode/PLAN.md .dev/memory-bank/lessons-learned.md`
  → exit 0.
- `node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/loop-quick-mode/PLAN.md` → exit 0, 43 paths;
  `node pharn/floor/reconcile-baseline.mjs --anchor --by loop-quick-mode-coupling` → exit 0, 2,426 paths, scope 43. No
  path joined mid-round, so no `--amend-scope` was needed.

### The coupling (Chain sequencing item 4)

- **The loop's quick column** (`pharn/floor/stage-agent-core.mjs`): `ROUTE_POLICY["pharn-loop"].quick` — spec, plan,
  test and build `agent`, grill `floor-only`, regress skipped, verify `floor-only`; `INVOCATIONS["pharn-loop"].quick`
  — `/pharn-spec --quick --model-approve`, `/pharn-plan <name>`, `/pharn-test <name> --unattended`,
  `/pharn-build <name>`. `stage-agent.mjs` reads the accepted `--mode` values from the table, so only its header
  changed; `route --command pharn-loop --mode quick` now routes (2.2's refusal case moved into a new ROUTES test, and
  the refusal list gained the loop's skipped quick regress and a `--mode fast`).
- **`S6c` in `LOOP_ROWS`**, mapped in `## Running a stage` (`refused S6c` → **S6c**) and named in its rows sentence.
- **Rule 7 per mode.** `FIX_LIST_SOURCES` names each fix-list field's stage; `fixListFields(mode)` drops a field whose
  stage the mode skips, derived from `ROUTE_POLICY` (a mode the loop does not hold reads nothing). Quick: the three
  `verify-report.json` fields, "each from `…/verify-report.json` (this mode never runs /pharn-regress, …)". A scratch
  comparison of every 6.27.0 brief against the new core (`.pharn/pharn-dev-build/brief-parity.mjs`, exit 0): 39
  (command, mode, stage, iteration) briefs, 0 differing once the S6c row is set aside — full mode's rule 7 is
  byte-identical.
- **`## Quick mode`** gains the routing lines: item 2 the spec's route and brief with `--mode quick` (its brief names
  the quick invocation); item 3 the grill's route with `--mode quick`, which prints `inline:floor-only`, then
  `/pharn-grill <name> --quick` inline with no brief and no `read`; item 4 — beyond item 4's list in the PLAN (spec
  and grill), because rule 7 is rendered from the brief's `--mode` — the build's route and brief with
  `--iteration <N> --mode quick`, and the inline hand-over naming the same three fields. Markers, `read` lines and the
  returns stay in Steps 3–5, which gain one pointer each; the quick audit gains a bullet (the brief text FLOOR, running
  the `--mode quick` lines ADVISORY, every miss failing safe).
- **The hygiene pins** (`.dev/floor/command-hygiene.test.mjs` `STAGE_AGENT_WIRING`): the loop's `modeLines` = quick →
  spec, grill, build; rule 2's brief comparison split by mode (a `--mode` brief exactly for a `--mode` route line whose
  cell is agent); rule 4 gains an order rule for `--mode` route lines; ★(6) executes 14 route lines and 12 brief lines;
  (8) pins `LOOP_ROWS` at 9 and the quick fix-list parity (`## Quick mode` item 4 against `fixListFields("quick")`);
  (9) adds five mutants of the quick column (a cell flipped inline, a cell newly routed, a brief after the inline grill,
  a dropped quick brief, a quick brief without `--mode`) and the loop's controls; (10), new, requires every `--mode`
  line of `pharn-loop.md` to sit inside `## Quick mode`. `LOOP_QUICK_WIRING` gains the three pointers and one G7
  closure entry — the inline hand-over's anchor phrase, which (8) reads by first occurrence and item 4 precedes.
- `node --test pharn/floor/stage-agent-core.test.mjs pharn/floor/stage-agent.test.mjs` → exit 0, 54/54;
  `node --test .dev/floor/command-hygiene.test.mjs` → exit 0, 257/257.

### `regress-scope-list-grammar` — fixed for the decision

- `stage-regress.mjs`'s partition phase now calls `check-regress.mjs`'s `partitionScope` in-process over the arrays
  `scope-inputs.mjs` builds (the declared patterns through `normPath`, as the CLI's `parseList` gives them), and writes
  the scope document that CLI printed; no child is spawned for the scope.
- `pharn/floor/stage-regress.test.mjs`: a changed `src/index.js` spelled with one leading space (a directory named
  space-`src`) and a lone changed path named `--declared` each end `refused scope-escaped` with the exact name in
  `escaped`; each test's control feeds the same sets to `check-regress.mjs scope` as comma lists, which passes them
  (exit 0). A `--declared` file the PLAN declares proceeds to `done`. A ✧ parity test pins scope.json byte-identical to
  the CLI's stdout for ordinary names.
  `node --test --test-name-pattern="hostile name|control\)|scope-escaped" pharn/floor/stage-regress.test.mjs` → exit
  0, 5/5; the parity test → exit 0, 1/1.
- Named, not built: `regress-inside-echo-list` — the verdict call's `inside` echo (ADVISORY, read by no floor op) is
  still a comma list, so `assertRepresentable` still refuses a comma or newline changed path (now over the changed paths
  only), and `unrepresentable-path` stays reachable. Retiring it needs an array-safe verdict input, a stage-exit
  registry change and a decision on `REGRESSION.md`'s one-path-per-line listing.

### Gates, this round

| command                                                            | exit | result                                                         |
| ------------------------------------------------------------------ | ---- | -------------------------------------------------------------- |
| `node pharn/floor/validate.mjs .`                                  | 0    | `FLOOR: GREEN — 36 capabilities`                               |
| `npm run docs:check`                                               | 0    | GREEN — the coupling changed no generated region               |
| `npm test`                                                         | 0    | 4,000/4,000                                                    |
| `npm run check`                                                    | 0    | every gate, `check:reconcile` over the coupling epoch included |
| `node .dev/floor/check-changelog-entry.mjs --merge-base 5bf6b18 .` | 0    | GREEN — against 2.2, this PR opens only `## [6.28.0]`          |

Sizes: `pharn-loop.md` 112,241 B (the merge commit's 108,429 B + 3,812 B; `## Quick mode` 18,431 B, `## Running a
stage` 5,716 B); `pharn-ship.md` 123,792 B.

## Final prep — 2026-09-27

- The round-2 re-review (`REVIEW.md` `## Round 2`, `49e1b65`) is GREEN with 0 floor-gate findings, and it raised three
  minor findings, R1–R3. The orchestrator's final-prep decision folds all three. It is a model decision under the
  maintainer's 2026-09-25 delegation, not a human one. Stage model: opus — set by the maintainer's instruction,
  overriding pharn.config.json; routed via Agent subagent; effort not routed. Regress and verify are not run this
  round: they run once, after 2.2 lands on `main` and the maintainer applies this patch.
- `git merge --ff-only loop-quick-mode` → exit 0 (`8b2b8c3..49e1b65`).
- `git merge --no-ff --no-commit stage-model-routing` (`0344ff1`, the maintainer's human-applied §8) → exit 0, clean.
  The staged `LIMITS.md` is 2.2's blob `63374de`, byte for byte. Merge commit `6fca772`.
- Step 0: `PLAN.md` gains `## Final-prep amendments` and one `## Files` path (43 → 44).
  `set-writes-scope.cjs --from-plan` → exit 0, 44 paths.
  `reconcile-baseline.mjs --anchor --by loop-quick-mode-final-prep` → exit 0, 2,426 paths, scope 44.

### R1 — `apply.sh`'s dirty-`LIMITS.md` guard

- 2.2's guard line goes in before `git apply --check`, with its comment and its failure message. A scratch parity check
  (`.pharn/pharn-dev-build/apply-guard-parity.mjs`, exit 0) found the guard and the message each present once and
  byte-identical to 2.2's, the guard ahead of the check, and no CR. `sh -n` → exit 0. `APPLY.md`'s steps gain the
  refusal, and its restore text now says `HEAD`.
- A drill in a throwaway clone of HEAD, with the working `apply.sh`, patch and sums dropped in
  (`.pharn/pharn-dev-build/apply-drill.mjs`, exit 0):
  - With an unstaged line appended to `LIMITS.md`: exit 1 with "refusing to start". The line survived and `HEAD` did
    not move.
  - With a clean `LIMITS.md`: exit 0, one commit touching `LIMITS.md` only (15 insertions, 3 deletions), and the
    applied file hashes to the sums.
  - The clone was deleted, and the live `LIMITS.md` was never written.

### R2 — "a crash is caught as 2, never 1", made true

- `pharn/floor/quick-scope-core.mjs` (NEW) holds the checker, moved out of `check-quick-scope.mjs`. `evaluate(args)`
  returns `{code, doc}`, and any throw that is not its own verdict propagates.
- `check-quick-scope.mjs` is now an entry with no static import, `check-loop-fresh.mjs`'s 6.21.1 pattern trimmed to this
  contract. A load failure, a throw, or a result outside the contract is exit 2 `crashed`, with its document. Its
  `EXIT` and its crash code are the two pinned second copies.
- Named, not caught: the entry file itself unloadable, which is a run from outside the project root. That is node's
  exit 1 with no document. A test pins it, and both commands' exit-1 branch now says so (`pharn-loop.md` item 5,
  `pharn-ship.md` item 7).
- `pharn/floor/check-quick-scope.test.mjs` → 33/33 (28 before). The five new tests:
  - three load failures in a copied floor (a syntax error in `scope-inputs.mjs`, that file missing, the core missing),
    each with the unbroken copy as the control and, for the first two, a static import of the same broken module
    exiting 1 with no document;
  - a throw while checking;
  - six results outside the contract;
  - the no-static-import and second-copy pins;
  - the residual.
- `CLAUDE.md`, the CHANGELOG [6.28.0] Fixed entry and the comments naming the checker's callers
  (`check-regress.mjs`, `scope-inputs.mjs`, `stage-regress.mjs`) follow. Both commands' `reads:` gain the core.

### R3 — the untracked nested repository, named

- The claim is now named at `stage-regress.mjs`'s partition comment, in the CHANGELOG [6.28.0] Fixed entry, in
  `CLAUDE.md`, in the core's header, and in PLAN's final-prep R3 bullet: git lists such a repository as `vendor/lib/`,
  so a bare `vendor/lib` declaration reads `scope-escaped`, while `vendor/**` covers it.
- `pharn/floor/stage-regress.test.mjs` gains two tests, both → exit 0, 2/2:
  - the bare declaration → `refused scope-escaped` with `escaped: ["vendor/lib/"]`; the comma-list route as the control
    exits 0 with `inside: ["vendor/lib"]`;
  - `vendor/**` → `done/no-regressions`.

### The patch

- `node .dev/features/loop-quick-mode/handoff/make-patch.mjs` → exit 0, run once. It printed
  `e7be1413b84f0198ced7e8f1dbc17b779d271a148e725b4b186685b7cd0bb5d7  LIMITS.md`, the value the round-2 review
  computed in its clone.
- A scratch check (`.pharn/pharn-dev-build/verify-patch.mjs`, exit 0):
  - `git apply --check` exits 0, and `--stat` reads 15 insertions and 3 deletions;
  - applied to a scratch copy, the file hashes to the sums;
  - no CR appears in the patch, the sums, `apply.sh` or the applied file;
  - `(6.28.0)` appears twice and `(6.27.0)` never;
  - the hunks start at lines 127, 141 and 270, all before §8 (line 399);
  - the live `LIMITS.md` is untouched.
- `APPLY.md`'s "When to apply" gives the final-prep order: §8 is merged, this pair was regenerated against it (with
  its sums line), it is applied after 2.2 lands on `main`, and the final regress and verify run after the apply, which
  is its out-of-order case.

### Gates, this round

| command                                                            | exit | result                                                                  |
| ------------------------------------------------------------------ | ---- | ----------------------------------------------------------------------- |
| `node pharn/floor/validate.mjs .`                                  | 0    | `FLOOR: GREEN — 36 capabilities`                                        |
| `npm run docs:generate`, then `npm run docs:check`                 | 0, 0 | README CURRENT-STATE: floor checkers 98 → 99; other regions unchanged   |
| `npm test`                                                         | 0    | 4,007/4,007                                                             |
| `npm run check`                                                    | 0    | every gate; `check:reconcile` CLEAN over the final-prep epoch, 16 paths |
| `node .dev/floor/check-changelog-entry.mjs --merge-base 0344ff1 .` | 0    | GREEN — against 2.2, this PR opens only `## [6.28.0]`                   |

Sizes: `pharn-loop.md` 112,538 B; `pharn-ship.md` 124,078 B.

## Open issues, named

- `architecture-loop-quick-line`, `loop-quick-run-report`, `quick-size-signal` — pending, as the plan records.
  `quick-scope-inputs-by-code` is built (the GATE 2 round above); `regress-scope-list-grammar` is built for the decision
  (the coupling round above), leaving `regress-inside-echo-list`, new and pending.
- The `stage-model-routing` coupling (Chain sequencing items 4 and 5) is built (the coupling round above).
- Owed after this round: the maintainer applies `proposed/apply.sh` once 2.2 lands on `main`. Then `/pharn-dev-regress`
  and `/pharn-dev-verify` run once over that tree, with the epoch re-opened first (`APPLY.md`).
- `origin/main` at `008b24b` (6.26.0, `stage-verify-script`, #281) is merged in (`c9d279c`); `stage-model-routing` at
  `5bf6b18` (6.27.0) is merged in (`51cf513`), and at `0344ff1` (its human-applied §8) in `6fca772`. This increment is
  renumbered 6.28.0.
