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
