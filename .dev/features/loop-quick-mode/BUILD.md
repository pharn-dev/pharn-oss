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

## Open issues, named

- `quick-scope-inputs-by-code`, `architecture-loop-quick-line`, `loop-quick-run-report`, `quick-size-signal` — pending,
  as the plan records.
- The `stage-model-routing` coupling (Chain sequencing items 4 and 5) is not built here: it belongs to whichever of the
  two phases merges second.
- `origin/main` has moved to `008b24b` (6.26.0, `stage-verify-script`, #281) since this branch's base; merging it and
  renumbering, if needed, is the orchestrator's (Chain sequencing, item 3).
