# PLAN — gate-exclusion-config: a project may exclude a discovered gate, pinned and disclosed

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L6, L15, L29, L34, L35, L36, L41, L43, L62, L64, L65]
- increment: an optional, closed `pharn.config.json` declaration `{"gates": {"exclude": [<ALLOWLIST ids>]}}` removes those ids from gate DISCOVERY at every stage that discovers (regress, verify, the `ac-test` red run); `/pharn-test` pins the declaration in the test-infrastructure pin (lock schema `ac-tests-lock/5`), so a later change reads `test-infra-changed` at verify; a criterion whose level maps only to excluded gates fails the red-run preflight; every stamp, report and render that shows a verdict names the excluded ids and where they were declared.
- layer(s): pharn-floor (product), pharn-contracts (five contracts), product `.claude/commands/` (`pharn-verify.md`, `pharn-regress.md`, `pharn-test.md` — reference prose only, no pinned line changes)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7)

The trigger is recorded, not hypothetical (batch brief §2, finding 1c, read this run): in `~/Projects/pharn-starter`
(PHARN 6.35.0) the `e2e` script (`playwright test --project=app`) cannot run on the user's machine (not enough RAM).
`/pharn-verify` always discovers it, and the only way around it, an explicit `--gates` list, makes the AC gate read
`test-infra-changed` by design (`pharn-verify.md`, "Reference — `--gates` and the AC gate"). Two of the three
post-6.35.0 `/pharn-loop` runs stopped on exactly this:

- `pharn/features/billing-plan-catalog/LOOP.md` (the 92-min run): "the discovered gate set includes `e2e`, which the
  user does not allow to run locally (not enough RAM). An explicit `--gates` list would make the AC gate read
  `test-infra-changed`. The verify run was stopped … The user decided to stop the loop here" (S10).
- `pharn/features/locales-en-pl-only/LOOP.md` (`--quick`, 28 min): stopped as S10 after iteration 1's verify ran
  Playwright locally (50 passed, 2.1 min) before the user's instruction arrived; "every further iteration's
  `/pharn-verify` would run the discovered `e2e` gate again".

## Confirmed current behavior (read this run, `main` @ `ea0234b`, 6.35.0)

- Discovery is `gate-run-core.mjs` `discoverGates(scripts)` = `ALLOWLIST ∩ Object.hasOwn(scripts, id)`, in ALLOWLIST
  order. `resolveSet` uses it for verify/regress (regress then drops `E2E_SET`, reported as the init-only
  `e2e_excluded`, never in the stamp) and `resolveAcTest` for the red run (selects `LEVEL_GATES` of the mapped levels).
  `red-run-core.mjs` calls `discoverGates` in `preflight` and re-runs `resolveSet` in `bindStamp`; `test-infra-core.mjs`
  calls it in `readGates`. Nothing else discovers.
- Every caller passes `--discover package.json` from the project root: `stage-verify.mjs` `phaseInit`,
  `stage-regress.mjs` `phaseHeadInit` (the base side copies the head spec through `baseSpecFrom`, never discovers),
  `pharn-test.md` Step 5 (`--stage ac-test`), and the preflight (`--discover package.json --root .`).
- `pharn.config.json` is already the project's opt-in file for floor behaviour (`testResults`, read by
  `test-results-core.mjs` `loadResultsConfig`, `CONFIG_FILE`), and the test-infrastructure pin already records each
  level gate's `testResults` format so a change reads `test-infra-changed`. The lock is `ac-tests-lock/4`; `/3`, `/2`,
  `/1` are still read; a `/3` pin is judged by what it pinned and whatever only `/4` pins reads `unpinned`.
- `pharn-cli` (read only, not changed): `gates` is not a `CLI_OWNED_KEYS` member, so it is a user-owned key that
  every CLI command carries over (`userOwnedConfigEntries`), exactly as `testResults` is.
- `check-loop-fresh.mjs` E compares only `verdict, failing_gates, gates, ac_gate` (verify) and `verdict, regressions,
pre_existing, outside_gates` (regress); `gate_run` is advisory and not compared. `check-regress.mjs` compares the two
  sides' run ids and `required` only.

## The design

1. **The declaration — one new module, `pharn/floor/gate-exclusion-core.mjs` (P3: it changes when "how a project
   declares an exclusion" changes).** `readGateExclusion(text|null)` (pure) and `loadGateExclusion(dir)` (reads
   `<dir>/pharn.config.json`, `CONFIG_FILE` imported from `test-results-core.mjs`, L35). Absent file, or no own `gates`
   key → `{ok, exclude: []}` (nothing changes). Otherwise CLOSED, fail-closed, every refusal `bad-gate-exclusion`:
   a file that exists but cannot be read or parsed, a non-object root, `gates` not a plain object, any `gates` key
   but `exclude`, `exclude` not an array, an element not an `ALLOWLIST` member, a duplicate. `[]` and `{}` are valid
   and exclude nothing. Values quoted into a reason go through `quote-core.mjs`'s total `shown()` (L62). Returned in
   ALLOWLIST order.
2. **Discovery applies it — `gate-run-core.mjs`.** `resolveSet` (and `resolveAcTest`) take `exclude` (default `[]`,
   validated by one exported `exclusionError()` the module above also calls — one rule, L35). In the DISCOVER branch
   only: `excluded = discovered ∩ exclude`, removed BEFORE the regress e2e rule and before the empty-source test, so
   an exclusion that leaves nothing is `empty-source-set` (the existing no-gates stop, L34) with a reason naming the
   exclusion. An explicit `--gates` is never filtered. The spec gains `excluded: {ids, declared_in:
"pharn.config.json#gates.exclude"}` only when `ids` is non-empty. New `REASON_CODES` member `bad-gate-exclusion`.
   `validateStamp` admits an OPTIONAL `excluded` (exact keys; `declared_in` the one member; `ids` non-empty, unique
   ALLOWLIST members in ALLOWLIST order; `source: "discover"`; no id in `required` or `runs`), else `stamp-malformed`.
   `gateRunBlock` copies it when present — so `verify-report.json` and `regression-report.json` (`gate_run.head`)
   carry it with no checker change. `baseSpecFrom` is NOT changed: the base side runs the head's set and
   `gate_run.head.excluded` is the regress disclosure.
3. **The runner reads it — `run-gates.mjs` (minimal, ~10 lines).** `init` with `--discover <m>` and no `--gates` loads
   the declaration from `dirname(<m>)` (every caller: the project root), refuses `bad-gate-exclusion` (exit 2) on a
   bad one, passes it to `resolveSet`, writes `excluded` into the record (kept at finalize) and into its stdout only
   when non-empty. No caller line changes (`stage-verify.mjs`, `stage-regress.mjs`, `pharn-test.md` untouched in
   their pinned lines).
4. **The pin — `test-infra-core.mjs` + `ac-tests-lock.mjs`, lock schema `ac-tests-lock/5`.** The `/5` pin adds
   `exclude`: the DECLARED list (ALLOWLIST order, `[]` when none), loaded from `root`; a bad declaration refuses the
   pin (`--write` exit 2). `diffTestInfra` names an id added to / removed from it (closed values only, P2) →
   `--check` RED / `test-infra-changed`. A `/4` or `/3` lock is judged by what it pinned, and a NON-EMPTY live
   declaration is reported `unpinned` (`--check` RED "test infrastructure unpinned", AC gate `test-infra-unpinned`)
   — the 6.31.0 `/3`→`/4` precedent; with no declaration they read exactly as today. `--record-red-run` writes only
   on `/5`. A pre-6.36 floor reads a `/5` lock as `lock-unusable` (fail-closed, never GREEN).
   **Not pinned, stated:** a legacy SPEC (no lock), a bootstrap lock (`test_infra: null`), and agreement-not-provenance
   (L43: a self-consistent rewrite of config + lock passes; the lock stays out of the build's scope through
   `ac-artifact-in-plan`, and a PLAN naming `pharn.config.json` keeps its advisory NOTE, whose text gains
   `gates.exclude`).
5. **The red run — `red-run-core.mjs` + `check-red-run.mjs`.** `preflight` takes the exclusion (the CLI loads it
   from `--root`, `UNUSABLE` exit 2 on a bad one): a level whose discovered gates are ALL excluded is
   `ac-level-unavailable` with `why` naming the exclusion — never a vacuous pass (L34). `blockedLine` keeps its
   closed `blocked: no-test-runner — …` prefix (S12 is decided by exit code); when every unavailable AC is
   exclusion-caused its `suggested:` names the exclusion instead of a test-infra increment. `bindStamp` re-resolves
   with the same exclusion read from `root`.
6. **Disclosure everywhere a verdict is shown.** Stamp `excluded`; `verify-report.json` `gate_run.excluded`;
   `regression-report.json` `gate_run.head.excluded`; `VERIFY.md` (`render-verify.mjs`) and `REGRESSION.md`
   (`render-regression.mjs`) render one line DIRECTLY UNDER the verdict line — "N discovered gate(s) EXCLUDED and NOT
   RUN by the project's `pharn.config.json` `gates.exclude`: `e2e` — this verdict covers only the gates listed" — ids
   inline only after an ALLOWLIST membership test, else a fixed phrase (P2). The two `no-gates` question texts
   (`stage-exit-core.mjs`) name the new cause.

## Files

- `pharn/floor/gate-exclusion-core.mjs` — NEW: the declaration's closed grammar + loader — layer pharn-floor
- `pharn/floor/gate-exclusion-core.test.mjs` — NEW: its tests — layer pharn-floor (test)
- `pharn/floor/gate-run-core.mjs` — `exclude` in resolveSet/resolveAcTest, `exclusionError`, `bad-gate-exclusion`, stamp `excluded`, gateRunBlock — layer pharn-floor
- `pharn/floor/gate-run-core.test.mjs` — tests — layer pharn-floor (test)
- `pharn/floor/run-gates.mjs` — init loads the declaration beside the `--discover` manifest and records it — layer pharn-floor
- `pharn/floor/run-gates.test.mjs` — tests — layer pharn-floor (test)
- `pharn/floor/test-infra-core.mjs` — `/5` pin key `exclude`, diff, `/4`/`/3` unpinned — layer pharn-floor
- `pharn/floor/test-infra-core.test.mjs` — tests — layer pharn-floor (test)
- `pharn/floor/ac-tests-lock.mjs` — schema `ac-tests-lock/5`, `/4` still read — layer pharn-floor
- `pharn/floor/ac-tests-lock.test.mjs` — tests — layer pharn-floor (test)
- `pharn/floor/red-run-core.mjs` — preflight and bindStamp apply the exclusion; blockedLine suggestion — layer pharn-floor
- `pharn/floor/check-red-run.mjs` — preflight CLI loads the declaration from `--root` — layer pharn-floor
- `pharn/floor/check-red-run.test.mjs` — tests — layer pharn-floor (test)
- `pharn/floor/check-ac-tests.mjs` — the manifest NOTE names `gates.exclude` — layer pharn-floor
- `pharn/floor/check-ac-tests.test.mjs` — test (only if a NOTE text assertion needs it) — layer pharn-floor (test)
- `pharn/floor/render-verify.mjs` — the exclusion line under the verdict — layer pharn-floor
- `pharn/floor/render-verify.test.mjs` — tests — layer pharn-floor (test)
- `pharn/floor/render-regression.mjs` — the exclusion line under the verdict — layer pharn-floor
- `pharn/floor/render-regression.test.mjs` — tests — layer pharn-floor (test)
- `pharn/floor/stage-exit-core.mjs` — the two `no-gates` question texts name the exclusion cause — layer pharn-floor
- `pharn/floor/stage-exit-core.test.mjs` — test (only if a text pin needs it) — layer pharn-floor (test)
- `pharn/floor/stage-verify.test.mjs` — ★ WIRING: the real stage script over a project with a declaration — layer pharn-floor (test)
- `pharn/floor/stage-regress.test.mjs` — ★ WIRING: the real stage script discloses `gate_run.head.excluded` — layer pharn-floor (test)
- `pharn/pharn-contracts/gate-run-record.md` — the declaration, the stamp field, the reason code — layer pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — the `/5` pin key, preflight, migration, what is not pinned — layer pharn-contracts
- `pharn/pharn-contracts/verify-report.md` — `gate_run.excluded` — layer pharn-contracts
- `pharn/pharn-contracts/regression-report.md` — `gate_run.head.excluded` — layer pharn-contracts
- `pharn/pharn-contracts/stage-exit.md` — the `no-gates` causes — layer pharn-contracts
- `.claude/commands/pharn-verify.md` — reference: discovery minus `gates.exclude` (instead of `--gates`) — product command
- `.claude/commands/pharn-regress.md` — reference: discovery minus `gates.exclude`; the no-gates causes — product command
- `.claude/commands/pharn-test.md` — Step 2b names the exclusion cause; Step 4 names `/5` and the pinned list — product command
- `SKILLS_VERSION` — 6.35.0 → 6.36.0 (provisional; minor: new behaviour) — repo meta
- `README.md` — badge (and the generated region only through `npm run docs:generate`, if it moves) — repo meta
- `CHANGELOG.md` — `## [6.36.0]`, moving `[Unreleased]` — repo meta
- `CLAUDE.md` — the lock-schema mentions (`/4` → `/5`) and one line on `gates.exclude` — repo meta
- `.dev/features/gate-exclusion-config/PLAN.md` — this plan — apparatus
- `.dev/features/gate-exclusion-config/GRILL.md` — grill log — apparatus
- `.dev/features/gate-exclusion-config/PROTECTED-FOLLOWUPS.md` — LIMITS §5 sentence (below) — apparatus
- `.dev/features/gate-exclusion-config/REGRESSION.md` — regress report — apparatus
- `.dev/features/gate-exclusion-config/regression-report.json` — regress report — apparatus
- `.dev/features/gate-exclusion-config/VERIFY.md` — verify report — apparatus
- `.dev/features/gate-exclusion-config/verify-report.json` — verify report — apparatus
- `.dev/features/gate-exclusion-config/REVIEW.md` — review record — apparatus
- `.dev/features/gate-exclusion-config/SHIP.md` — ship record — apparatus

## Contracts satisfied

- `gate-run-record.md` — the stamp gains an optional, additive `excluded` field (SCHEMA unchanged, like `results_sha256`
  6.15.0 and `reused` 6.34.0); coverage is unchanged (`required` = the kept source ids).
- `ac-tests.md` — the test-infrastructure pin gains `exclude` under a new lock schema (closed key set per schema, L36).
- `verify-report.md` / `regression-report.md` — the advisory `gate_run` block gains an optional key; every consumer
  reads named fields (re-verified: `check-loop-fresh.mjs` COMPARED_FIELDS, `check-regress.mjs` spec agreement).
- `stage-exit.md` — registry question texts only; no code, status or option changes.

## Evals to write (P1)

- No Capability (`role:`) is added or changed, so no eval. The floor modules are held by `node --test` suites.

## Tests and negative controls (the build must deliver each)

- Parser/loader: absent file; file without `gates`; `{}`; `[]`; valid list re-ordered to ALLOWLIST order; EVERY
  refusal (unreadable, invalid JSON, non-object root, `gates` non-object, unknown key, `exclude` non-array,
  non-ALLOWLIST id, duplicate, `{"toString":1}` element with a control that `String()` throws on it — L62;
  `"toString"`/`"__proto__"` keys — L15). Closure: the refusal code is a `REASON_CODES` member with an emitter (L36).
- resolveSet over EVERY discovering stage × {absent, excluding a present id, excluding an absent id, excluding all}
  (L29): `excluded` only when non-empty; regress e2e rule after exclusion; empty-by-exclusion = `empty-source-set`
  naming the exclusion; explicit `--gates` never filtered. ac-test: a level whose gates are all excluded =
  `coverage-violation`; one of two e2e gates excluded runs the other.
- validateStamp: a stamp with no `excluded` is byte-for-byte as before; each malformed `excluded` shape (extra key,
  wrong `declared_in`, unsorted, duplicate, non-ALLOWLIST, id in `runs`/`required`, `source: explicit`) is
  `stamp-malformed`; gateRunBlock copies it only when present.
- run-gates init (the production path passes NO flag for the config — L41): config beside the manifest → stamp
  `excluded`, `required`/ids without it; malformed → exit 2 `bad-gate-exclusion`, nothing written; all excluded →
  exit 3; `--gates` with a malformed config → still runs (never read); no config → stamp bytes identical to today.
- Pin: `/5` records `exclude`; a change → `changed`; `/4` + live declaration → `unpinned`, `/4` with none → GREEN;
  malformed → pin refuses. Lock: `--write` writes `/5`; a hand-built `/4` lock still checks GREEN; `--check` RED on an
  added exclusion.
- Preflight: an e2e AC with `e2e` excluded → exit 1, `ac-level-unavailable`, `why` names it, last line keeps the
  `blocked: no-test-runner —` prefix with the exclusion suggestion; with `test:e2e` also present → GREEN; malformed →
  exit 2. bindStamp: a red-run stamp under an exclusion binds.
- Renders: the line appears DIRECTLY under the verdict iff `excluded` is present, for every verdict value; a
  non-ALLOWLIST id is not rendered inline. A test runs `validate.mjs`-unaffected (the line carries no marker).
- ★ WIRING (L45): `stage-verify.mjs` over a temp project with `pharn.config.json` excluding a failing gate → `done`,
  `verify-report.json` `gate_run.excluded`, `VERIFY.md` line; and the control without the config → that gate runs.
  `stage-regress.mjs` likewise for `gate_run.head.excluded` (if the suite's fixtures allow it cheaply).

## Guarantee audit (P0)

- "A declared id is not discovered at regress, verify or the red run" → floor: enum-regex (ALLOWLIST membership over
  the parsed declaration, set difference in resolveSet; tested per stage).
- "A malformed declaration refuses rather than running a different set" → floor: enum-regex (closed shape).
- "A change to the declaration after `/pharn-test` reads `test-infra-changed` at verify (test-first SPEC)" → floor:
  content-hash/equality over the `/5` pin — AGREEMENT, never provenance (L43); the act of running `/pharn-test` first
  is advisory command discipline.
- "A level whose gates are all excluded fails the preflight" → floor: enum-regex (LEVEL_GATES membership).
- "The excluded ids are disclosed in the stamp and both reports" → floor for the stamp field's shape
  (validateStamp); the renders are deterministic code, advisory for being read.
- NOT claimed: that excluding a gate is safe; that a legacy SPEC or a bootstrap lock pins the declaration (neither
  does); that a PASS over fewer gates means what a full PASS means.

## Trust audit (P2)

- `pharn.config.json` is agent-editable project input: parsed as JSON, used only as ALLOWLIST members after a closed
  membership test; a refusal quotes a value only through `shown()`. Ids reaching a render are ALLOWLIST members
  (inline) or replaced by a fixed phrase; nothing is executed or interpolated into a command.

## Determinism audit (P5)

- Every branch is membership (ALLOWLIST, own-property `gates`/`exclude`, LEVEL_GATES) or a closed refusal. No
  classification. The terminal fallback for a bad declaration is a loud refusal; for an exclusion that empties a
  stage, the existing `no-gates` question (ask).

## Applied lessons

- L6 — the declaration is read from its structured location (`pharn.config.json` → `gates.exclude`), never grepped.
- L15 — `Object.hasOwn` for the `gates` key and every lookup; prototype-named keys are tested.
- L29 — the rule is quantified over "every stage that discovers": the deliverable is the enumeration (verify, regress,
  ac-test, preflight, bindStamp, the pin) and a test per member.
- L34 — an exclusion that empties a stage's set is `empty-source-set`, and an AC whose level is fully excluded is
  `ac-level-unavailable`: neither passes vacuously.
- L35 — one parser/loader (`gate-exclusion-core.mjs`) and one membership rule (`exclusionError`), imported by every
  reader; `CONFIG_FILE` imported, not restated.
- L36 — closed shape in both directions (config block, stamp field, pin key set per schema); the new reason code is
  closure-tested both ways.
- L41 — the production path reads the config with NO flag; tests exercise exactly that path (no test-only override).
- L43 — the pin certifies agreement, never provenance; stated in the contract and CHANGELOG.
- L62 — every refusal quotes through `shown()`, with a `{"toString":1}` test and its control.
- L64 — before hand-off, every restatement (CHANGELOG, the four contracts, the three commands, CLAUDE.md) is grepped
  for "excluded"/"exclude" and probed as its own sentence.
- L65 — the declaration is pinned in the lock the build may not write (`ac-artifact-in-plan`); the plan-scope NOTE
  for `pharn.config.json` names it.

## Trusted-doc impact

- `LIMITS.md §5` (line 203): "`/pharn-verify` re-runs the project's own gates; if the project has no telemetry test,
  neither does PHARN." — INCOMPLETE, not an overclaim (already partly stale since 6.34.0's reuse). A proposed
  replacement goes in `PROTECTED-FOLLOWUPS.md`. No other trusted sentence is made false (ARCHITECTURE §6's verify row
  and LIMITS §9 stay true; §9 already lists `pharn.config.json` as agent-editable).

## Hooks / settings / MIN_CLI

- None. `pharn.config.json` keeps its reserved-path status in the write guard unchanged; `MIN_CLI` unchanged (no
  installed path moves; `gates` is a user-owned key every CLI version carries over).

## Named residuals (not closed here)

- `gate-exclusion-summary-disclosure` — `RUN-REPORT.md` and `BRIEFING.md` show verdicts by linking/copying the report
  verdict tokens; they do not repeat the exclusion line (the linked `VERIFY.md`/`REGRESSION.md` do).
- `gate-exclusion-bootstrap-pin` — a `spec_kind: test-infra` (bootstrap) lock carries no test-infrastructure pin, so
  the declaration is not pinned there (as nothing else is); verify still discloses it.

## Open questions (HALT)

- Q1: the config shape `{"gates": {"exclude": [...]}}` (a closed object leaves room for a later key without a new
  top-level name) — accept, or prefer a flat `"excludeGates": [...]`?
- Q2: a lock schema bump to `/5` (vs an optional key under `/4`): chosen because the pin's key set is closed per
  schema and the 6.31.0 precedent bumped for added pin keys; cost: every in-flight `/4` feature in a project that
  DECLARES an exclusion must re-run `/pharn-test` (fail-closed `unpinned`). Accept?
- Q3: scope the disclosure to the four artifacts + stamp named in the brief, leaving RUN-REPORT/BRIEFING as the named
  residual above — accept?
