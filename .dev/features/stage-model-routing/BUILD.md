# BUILD — stage-model-routing

- plan: `.dev/features/stage-model-routing/PLAN.md` (GATE 1 and its amendments A–E, the 15 grill amendments, and the
  orchestrator's acceptance of grill finding 1, recorded under "Amended after grill" before this build started)
- base: `stage-model-routing` at `25a2599` (the plan, GATE-1 amendments and GRILL at `a3d7b45`, merged with `main`
  `2e5c2e3`, 6.25.0)
- stage model: build — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed
- floor verdict: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`, **exit 0**

## Step 0 and Step 1 (read live)

- `node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/stage-model-routing/PLAN.md` printed
  `writes-scope set: 32 path(s)`, and `## Files` holds 32 bullets above `### Deliberately NOT in scope` (L28: equal).
- `node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-dev-build` → 2370 paths, scope 32 entries.
- `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` → `d831d30d…f4f4`, equal to the plan's pin; every open
  question was resolved at GATE 1. `SKILLS_VERSION` 6.25.0 and `MIN_CLI` 0.5.0 at base; `npm view @pharn-dev/pharn
version` → `0.7.0` (published, so the `MIN_CLI` bump cannot strand an install).

## What landed

- `pharn/floor/route-token-core.mjs` — the route-token grammar (`AGENT_MODELS`, `INLINE_REASONS`,
  `ROUTE_TOKEN_RE` built from the two sets, `isRouteToken`), zero imports.
- `pharn/floor/stage-agent-core.mjs` — `ROUTE_POLICY`, `STAGE_CONFIG_KEYS`, `decideRoute` (pure; asks for one
  observation at a time, so a routed stage costs one checker spawn), `INVOCATIONS`, `INLINE_REMEDIES`, `renderBrief`,
  the closed result (`validateResult`), `LOOP_ROWS`, `FIX_LIST_FIELDS`, `READ_EXIT`, the total `quote()`. Its header
  is the protocol's spec.
- `pharn/floor/stage-agent.mjs` — `route` / `brief` / `report` / `read`; the followed config stat, the checker shelled
  by absolute path under `CHECKER_TIMEOUT_MS`, the per-component lstat walk, the atomic write, the consuming read.
- `mark-phase.mjs --route` (stage-start only); `render-cost-ledger.mjs`'s `normalizeMarkers` keeps a valid token.
- The `with-routed-stage` ledger fixture (parent on `claude-opus-5-5`, one stage agent on `claude-sonnet-5` with both
  `agentId` and `attributionAgent: "general-purpose"`, and the `.meta.json` sibling).
- `## Running a stage (6.27.0)` in `pharn-ship.md` and `pharn-loop.md`, and each routed stage's four pinned lines;
  `STAGE_AGENT_WIRING` in `.dev/floor/command-hygiene.test.mjs`.
- `check-model-config.mjs` header (MECHANISM, TURN SCOPE), `cost-ledger.md` "Route", `pharn.config.json`'s note,
  `MIN_CLI` 0.7.0, `SKILLS_VERSION` 6.27.0, CHANGELOG `[6.27.0]`, CLAUDE.md (a new Commands entry, the
  check-model-config entry, the `mark-phase.mjs` line, the `MIN_CLI` paragraph), README (badge, the regenerated
  inventory — floor checkers 88 → 91 —, the `:194` description, the routing limitation).
- `route-a-evidence.txt` — a byte-identical copy of the 2.1 summary (`cmp`: identical; sha256 `ddb8f373…aa2a`).
- The human-only handoff: `handoff/make-patch.mjs` and `proposed/{human-only.patch, human-only.sha256, apply.sh,
APPLY.md}`. **Not applied.**

## Measurements (L24)

- **`CHECKER_TIMEOUT_MS` = 10 000 ms**, from `check-model-config.mjs resolve plan` spawned 30 times on this machine
  (darwin, Node 24.13.1). First run, with other agents busy: first 59.1 ms, min 46.6, median 89.9, p90 205.8, max
  329.9. Re-measured idle: median 27.4, p90 31.0, max 32.9. The bound is about 30 times the slowest spawn seen under
  load — headroom for a cold, loaded CI machine.
- **`route` end to end** (one node spawn plus one checker spawn), 10 runs idle: min 54.4, median 58.1, max 62.7 ms;
  the suite's own 5-run diagnostic under load: 102–146 ms.
- **The timeout, exercised:** the stub checker that never exits was killed at the bound; the test took 10 083 ms and
  `route` printed `inline:resolve-failed` at exit 3.

## Probes, with exit codes

- **The guards and a stage agent (L37, L40)** — each Write payload with and without `agent_id`/`agent_type`, from an
  unsignalled scratch tree with no scope: `enforce-writes-scope.cjs` exit 2/2 on `pharn/floor/x.mjs`, 0/0 on
  `pharn/features/x/y.md`, 2/2 on this repo's absolute `LIMITS.md`; `protect-trusted-paths.cjs` 0/0, 0/0, 2/2. Identical
  in every case; now the ★ test `STAGE_AGENT_WIRING (7)`. (`.dev/features/**` is outside the unsignalled default, so
  the allow case is `pharn/features/**`.)
- **make-patch.mjs's three checks, each seen failing (L60):** `applyOnce` on 2 occurrences → refused; on 0 →
  refused; `editLimits` over a sibling-edited §8 → refused ("matched 0 time(s)"); over a duplicated §8 → refused
  ("matched 2 time(s)"); `markerPreservationReds` with a registered LIMITS.md marker removed → 1 red, over the real
  edit → 0 reds across the 7 LIMITS.md sites; `noCarriageReturn("a\r\nb")` → false, over the real edit → true.
- **The patch against the LIVE `LIMITS.md`:** `make-patch.mjs` exit 0; `git apply --check
.dev/features/stage-model-routing/proposed/human-only.patch` → **exit 0** (1 file, +39 −30). `LIMITS.md` now:
  sha256 `deea816c…2b19`; after the patch: `c8b9582e…4933` (`human-only.sha256`). `LIMITS.md` itself is unchanged
  in the working tree (`git status` shows nothing for it).
- **L14, measured:** on Node 24 the anchored `ROUTE_TOKEN_RE.test("agent:opus\n")` is already `false`; the clean-scalar
  guard is kept as defense in depth, and a test pins both layers.

## Gates run at build

- `npm test`: **3764 pass, 0 fail** (read live; new: `route-token-core` 9, `stage-agent-core` 27, `stage-agent` 19,
  `STAGE_AGENT_WIRING` 13, plus the added `mark-phase` and `render-cost-ledger` cases).
- Step 2b formatted the 31 existing scoped paths (prettier over all — 22 it knows —, markdownlint over the 7 `.md`,
  eslint read-only over the 14 JS): all clean. Repo-wide `format:check`, `lint`, `lint:md`: clean.
- `docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`: GREEN; `check:reconcile`:
  CLEAN, 31 reconciled, no escape; `check:changelog-entry`: GREEN (one new section, `[6.27.0]`).

## Decisions and deviations, each stated

1. **`route`'s stdout is exactly one line;** for an inline reason it also prints that reason's remedy (the plan's §4
   table, `INLINE_REMEDIES`) on **stderr**, so the run can name it (L27).
2. **`gate` is REQUIRED for a `pharn-build` `done`,** not merely allowed: a build's `done` always carries its gate, and
   one without it reads `unusable malformed`. `report` refuses such a result before writing it.
3. **`route` clears a leftover result only before a spawn (exit 0),** and refuses (exit 2) when the leftover is not a
   regular file or a state-root component is a link or a non-directory — the orchestrator then runs the stage inline
   as `route-unavailable`.
4. **In `/pharn-loop` the test stage's `read` line never decides a row** (`unusable` included): the plan's "Loop rows"
   rule — the checker decides — applied literally; the generic "exit 2 → S9" covers every other routed stage.
5. **`## Running a stage` sits before `## Quick mode` in `pharn-ship.md`,** so the hygiene pin's `quickModeSection()`
   slice is not widened; the quick grill's route line sits in `## Quick mode` item 4, as planned.
6. **`pharn-ship.md`'s Guarantee audit "Net" and its "No new _gating_ floor primitive" bullet are narrowed** to name
   `stage-agent.mjs read` as a new STOP input and the routed build's advisory `done gate:pass` — P0 honesty about a
   claim the routing change touches.
7. **The brief's rule 7 is omitted, not stubbed,** outside `/pharn-loop`'s build at iteration ≥ 2.
8. **The `.meta.json` fixture's keys** (`agentType`, `description`, `model`) come from the plan's Discovery, not from
   a fresh read: the auto-mode classifier refused reading this session's transcript directory during this stage.
   The fixture is hand-authored and carries no path-shaped value.
9. **`stage-agent-core.mjs` imports only `route-token-core.mjs`, as planned,** so it has no slug grammar: `renderBrief`
   states the precondition that the CLI validated the name with `gate-run-core.mjs`'s `FEATURE_SLUG_RE`, and
   `validateResult` compares the name by equality with that validated value — no fifth copy of the slug regex.

## Not done here, and why

- **The live success measure (Design §12, M2) is pending.** It needs a real `/pharn-ship` run in a project installed by
  `@pharn-dev/pharn` ≥ 0.7.0, with a routed stage configured to a model different from the orchestrator's; the
  fixture proves the reader's shape, never that a live run routes (L4).
- **`LIMITS.md §8` is unchanged** until a person runs `proposed/apply.sh` at GATE 2; until then its "nothing reads
  `models.stages` at run time" is stale, and the CHANGELOG says so.
- **`pharn-cli`'s vendored `check-model-config.mjs`** is pinned there by sha256; this header-only edit makes that copy
  lag until it is refreshed in `pharn-cli` (no rule or output changed).
- Named residuals, unchanged: `stage-agent-hang`, `stage-agent-background`, `agent-model-set-drift`,
  `stage-agent-effort`, `run-report-routing-view`, `route-script-stages`.

## Merge of main 6.26.0 (#281) (2026-09-27, the coordinator's instruction)

`git fetch origin` then `git merge origin/main` (`008b24b`, `stage-verify-script`: `/pharn-verify` becomes a thin caller
of `pharn/floor/stage-verify.mjs`, and `stage-runtime.mjs` is lifted out of `stage-regress.mjs`), committed as
`28bbc1a` before any verify, because reconcile checks `pharn/floor/` against `HEAD`. Three textual conflicts, each
resolved by keeping both sides:

- **`SKILLS_VERSION`** (`6.27.0` vs `6.26.0`) → `6.27.0`, this increment's bump over main's.
- **`README.md`** — the badge → `6.27.0`; the generated floor-checker count was taken from either side and then
  regenerated by `npm run docs:generate` (92 on main + this increment's 3 → 95); `docs/capabilities/` byte-identical.
- **`CHANGELOG.md`** — main's sections kept byte for byte, `[6.26.0]` included, with `[6.27.0]` directly above it. A
  scratch script proved it: the merged file minus the `[6.27.0]` section equals `origin/main:CHANGELOG.md` exactly,
  and `[6.27.0]` sits directly above `[6.26.0]`. One deliberate correction inside this increment's own unmerged
  section: the bump line now reads `6.26.0 → 6.27.0` (it read `6.25.0 → 6.27.0`, written before 6.26.0 existed).

Auto-merged, then checked by hand: `pharn-ship.md`, `pharn-loop.md`, `command-hygiene.test.mjs`, `CLAUDE.md`. #281's
verify thin-caller wiring (the verdict read bound to a `done` exit in THIS run, the Step 2b note, the loop's verify
stage-exit mapping) sits beside this increment's `## Running a stage` and route/read lines. Per GATE-1 Q5 `/pharn-verify`
stays inline `floor-only`: it has no route line, no brief and no `read`, and its stage-start carries no `--route`. Two
wording edits keep the prose honest about that: `pharn-ship.md`'s verify item now says it runs inline by policy and
that the orchestrator runs the thin caller itself and reads its exit; `pharn-loop.md`'s `## Running a stage` now says
"their stage-exit mappings above" (regress's and, since #281, verify's). On the merged text, both pins hold:
`STAGE_AGENT_WIRING` (13) and #281's `STAGE_SCRIPT_WIRING` (3), 16/16.

After the merge commit: the setter re-run from the PLAN (32 paths) and the baseline re-anchored with
`--by stage-model-routing-merge-main` (2407 paths). Then:

- `/pharn-dev-regress`, default base `git merge-base HEAD origin/main` = `008b24b` (clean tree): `no-regressions`,
  `check-regress` exit 0 — 111 outside tests, `validate` and the trust-fence structural gate, 0 → 0.
- `/pharn-dev-verify`: `PASS`, `check-verify` exit 0 — all seven gates 0, `reconcile` CLEAN over the new epoch.
- `npm run check`: exit 0 over every gate in the chain; its `test` gate ran 3860 tests, 3860 pass, 0 fail (up from
  3764: #281's suites).
- `npm run check:changelog-entry` against `origin/main` (`008b24b`): exit 0.
- `git apply --check .dev/features/stage-model-routing/proposed/human-only.patch` → exit 0 against the live
  `LIMITS.md`, which #281 did not touch (sha256 still `deea816c…2b19`); the patch and its sum are unchanged.

## GATE-2 FIX round (2026-09-27, the orchestrator's decision)

`git merge --ff-only stage-model-routing` brought in `REVIEW.md` (`1b4158e`): GREEN, 0 floor-gate findings, 10
advisory. The orchestrator decided the round under the maintainer's 2026-09-25 delegation — **a MODEL decision, not
a human one**: fix A1–A8 and A10; defer A9 and the lesson candidate. Stage model: opus — set by the maintainer's
instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed.

**Order.** `PLAN.md` was amended first — a new "Amended at GATE 2" section, Design §8 and Open question 4 marked
reversed, the fallback table's three rows, and the `MIN_CLI` line in `## Files` — under the dev default-safe-set,
since the PLAN's own scope does not cover the PLAN. Then the setter from the PLAN (32 paths) and the re-anchor
`--by stage-model-routing-gate2` (2408 paths, scope 32), **before** any fix, so the reconcile window covers every
edit of the round.

**The fixes.**

- **A1 (P0).** "runs … on its configured model" became "requested on" in both `## Running a stage` headings and
  lead sentences (with `STAGE_AGENT_WIRING`'s two `section` strings, plus a new heading pin), the CHANGELOG
  `[6.27.0]` lead, README's limitation, CLAUDE.md (the check-model-config MECHANISM line and the STAGE-MODEL ROUTING
  entry), `cost-ledger.md`'s "Route" section, the headers of `stage-agent-core.mjs`, `stage-agent.mjs`,
  `route-token-core.mjs` and `check-model-config.mjs` ("spawned on" → "REQUESTED on"), and the brief's opening
  sentence ("spawned you, requesting the model …"; a test asserts it never says "on the model"). A final grep finds
  only "requested on" and the struck claims.
- **A2.** `MIN_CLI` is back to `0.5.0`, byte-identical to the base. CLAUDE.md's paragraph is restored and says why it
  did not move: the install is degraded (`inline:config-red`, with the `pharn update` remedy), not broken, and no
  product command gates on the checker. The CHANGELOG says "`MIN_CLI` stays 0.5.0" and that routing needs a
  0.7.0-shaped `models.stages` block, which `pharn update` with `@pharn-dev/pharn` ≥ 0.7.0 migrates; README names the
  same remedy. `PLAN.md` records the reversal of GATE-1 Q4 as the orchestrator's decision.
- **A6 (P2).** "the stage agent's prose never reaches control flow" is labelled **ADVISORY** in `pharn-ship.md`'s
  Bounds and Trust audit and in `pharn-loop.md`'s Bounds. Each names the residual — the Agent tool returns the
  agent's final text into the orchestrator's context, `THREAT-MODEL.md §5`'s free-text residual — and that only
  `read`'s closed line is floor. The same note is in `stage-agent-core.mjs`'s TRUST line, CLAUDE.md and the
  CHANGELOG's Bounds. `STAGE_AGENT_WIRING` rule 5 pins both commands' wording.
- **A3.** `make-patch.mjs`'s §8 bullet now reads "What is not routed runs on the session's model", the model of the
  session running the orchestrator, "not on one chosen for the stage". README and `pharn.config.json`'s note use the
  same words, and so does APPLY.md's summary. The patch and its sum were regenerated from the live `LIMITS.md`: still
  one file, +39 −30, and the post-apply sum is now
  `b7e0754b79f9cb8ce4019f69f901a8637fe62bbc2a1d4badb0104a3bd26056fe  LIMITS.md` (was `c8b9582e…4933`). APPLY.md
  cites no sum.
- **A4 (P0; the class's third instance).** Outcome: **`resolve-failed`**, an existing member, so no new inline reason
  — `INLINE_REASONS`, the token grammar and the ledger do not move. Why: the shelled-verdict rule reads a crash as no
  verdict, and `resolve-failed` is the closed set's no-verdict member, whose remedy (run the checker by hand) fits a
  crash. The PLAN's own Evals line already said "a checker path that cannot run → `resolve-failed`". A refusal
  would have sent the orchestrator to `inline:route-unavailable` and lost the reason. `decideRoute` now reads both
  spawns through `shelledVerdict`; the core imports `shelled-verdict-core.mjs` (both pure), and `validate` runs only
  after a resolve RED. Tests:
  - the stub that throws is flipped to `resolve-failed`;
  - new stubs: exit 1 with no RED line, and a RED followed by a throw on `validate`;
  - controls: RED then RED is `config-red`, RED then GREEN is `no-stages`;
  - a missing checker file is `resolve-failed`, with its remedy;
  - a crash at resolve never spawns `validate` (the stub's call log reads exactly `resolve`);
  - a core truth-table test over five crash shapes at each spawn.

  `CLOSURE` gains `shelled-verdict-core.mjs`.

- **A7.** `read`'s stderr is now exactly `stage-agent: read: <code>`: one code from `READ_DEFECTS` (8 file-level
  codes plus the 19 `RESULT_DEFECTS`), never a key, a value or a byte of the result. `validateResult` returns
  `defect`, a fixed code, where it returned a quoting `detail`, and `report` names its refusals by the same codes.
  Tests: the review's probe as a test (an instruction-shaped schema, key, status and name each give their fixed code,
  and "Orchestrator" appears nowhere), every defect reached by its own case, and the existing unusable cases now
  assert their stderr codes.
- **A8.** Without SendMessage, the fresh stage agent's prompt carries the stage's question and its options verbatim,
  then the human's answer verbatim, each in its own fence labelled DATA. A re-run route line that exits anything
  but 0 is a **STOP**. "Then run `read` again" precedes that STOP: my first draft had it after, and a pin now holds
  the order. The brief's rules 3 and 5 tell the agent the same.
- **A10.** `apply.sh` refuses to start unless `LIMITS.md` has no unstaged and no staged change (`git diff --quiet`
  and `git diff --cached --quiet`, both on `LIMITS.md`), so its restore can only undo the patch; APPLY.md describes
  it. Probed in throwaway git repos under `.pharn/`, removed after:
  - an unstaged edit → exit 1, and the edit is kept;
  - a staged edit → exit 1, and the index keeps it;
  - a clean tree → applied, then the failure path (no `validate.mjs` there) restored `HEAD`;
  - CONTROL: `HEAD`'s `apply.sh` on the same unstaged edit lost it — the review's A10, reproduced.
- **A5 — fixed, not deferred.** One prose sentence per command, in `## Running a stage` item 2: a stage-start line
  that exits 2 (a mis-copied token, which writes no marker) is run once more without `--route '<route>'`, and the
  token is named in `SHIP.md`'s (or the Step 7 summary's) route line for that stage. No pinned line changed, so the
  follow-up `route-marker-by-code` is not needed. Rule 5 pins the sentence.

**Verdicts.**

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities`, exit 0.
- `/pharn-dev-regress`, base `008b24b` passed explicitly: `no-regressions`, `check-regress` exit 0 — 111 outside
  tests, `validate` and the trust-fence structural gate, 0 → 0; nothing escaped.
- `/pharn-dev-verify`: `PASS`, `check-verify` exit 0 — all seven gates 0; `reconcile` CLEAN over the
  `stage-model-routing-gate2` epoch (20 reconciled, 0 escapes).
- `npm run check`: exit 0; its `test` gate ran 3864 tests, 3864 pass, 0 fail (3860 → 3864: this round's four new
  tests).
- `npm run check:changelog-entry` against `origin/main` (`008b24b`): exit 0 — one new entry, `[6.27.0]`; no merged
  entry or released heading changed.
- `git apply --check` of the regenerated `human-only.patch` against the live `LIMITS.md` (sha256 `deea816c…2b19`,
  untouched): exit 0. **Not applied.**

**Deferred — for `SHIP.md`, which is not written yet (it follows the maintainer's apply and the final verify).**

- `lesson: skipped`, and `deferred:` carries `REVIEW.md`'s candidate: "A new caller of a floor checker reads its
  exit 1 through `shelledVerdict` — reading exit 1 as the RED recurred in `stage-agent.mjs route`, and its test
  pinned the crash reading as intended." (`REVIEW.md`, "Proposed lesson candidate", type `floor`, source finding
  A4.) A4 itself is fixed; the candidate is the transferable part, and its proposed check is a closure pin over
  every `spawnSync` of a `pharn/floor/check-*.mjs` whose status 1 is branched on.
- Follow-up **A9** → the roadmap's Phase 4.1, carrying `REVIEW.md`'s list of rationale the orchestrator never
  executes:
  - in `pharn-ship.md`, about 4.8 KB: the section's opening "why" (~769 B) and Bounds (~611 B), the Guarantee-audit
    bullets (+1,208 B), the Net narrowing (+691 B), the Trust bullet (+547 B), the "No new gating" note (+329 B),
    the "does NOT do" bullet (+383 B) and the spec-inline rationale (+290 B);
  - in `pharn-loop.md`, about 1.4 KB: the opening paragraph (~731 B) and Bounds (~630 B);
  - not needed at run time: each routed block's connective prose (five times per command), `reads:` naming
    `stage-agent-core.mjs` (32,962 B), and the loop's re-padded S1–S13 table.

  This round lengthened the Bounds and Trust paragraphs (A6, A8), so re-measure at Phase 4.1.

- Found in this round, not built: `shelled-verdict-core.mjs`'s header says three checkers import it, but
  `stage-regress.mjs` and `stage-verify.mjs` already did before this increment, and `stage-agent-core.mjs` now does
  too. A header-only correction for whenever that file next changes (follow-up `shelled-verdict-load-graph-note`);
  the file is outside this PLAN's `## Files`.
