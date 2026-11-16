# PLAN — gate-timeout-above-bash-cap

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L15, L35, L41, L43, L62, L65, L81, L83, L84]
- increment: a project may declare a longer per-gate timeout, `gates.timeoutMs` in `pharn.config.json`, which the entry runner and the detached stage runner (regress, verify) read from floor code in place of the pinned `--timeout-ms 540000`, pinned for the run by the entry record; with no declaration every line, record and stamp is byte-identical to 7.15.0.
- layer(s): product floor (`pharn/floor/`), pharn-contracts (`gate-run-record.md`, `stage-exit.md`), product commands (`/pharn-loop`, its close part, `/pharn-ship`'s stages part)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- linear: CORE-87 (sub-issue of epic CORE-13)
- version: SKILLS_VERSION 7.15.0 → 7.16.0 (minor); MIN_CLI unchanged (0.14.0)

## Why (P7 — measured)

`.dev/measurements/loop-baseline-2026-11-11.md` §7/§12: 12 of 36 measured runs stopped `gates-unmeasured-at-entry`, 11
of those 12 name `test` killed at the 540 s per-gate timeout, and 6 of the 9 `STOP_TERMINAL` stops are the same gate
timed out at regress or verify. `.dev/measurements/loop-wall-clock-2026-10-25.md` §5 measured a project whose base-side
`test` finished at about 538 s and whose head-side run was killed at 540 s. The baseline's §12 table rates CORE-87
**go**. A killed gate is unmeasured (INCONCLUSIVE since 6.59.0, never a pass), so the run stops with nothing learned.

Why the value cannot simply be raised on the pinned lines: 540000 is chosen so a gate fits inside one 600 s Bash call.
Two places no longer run gates inside a Bash call — the entry runner (detached since 6.42.0) and, since 7.15.0
(CORE-76, PR #443), the regress/verify stage runner — so only there can a longer timeout be honoured. The thin callers
(`/pharn-regress`, `/pharn-verify` run by a person), `/pharn-build`'s `build-gate.mjs` and `/pharn-test`'s red run still
run gates inside a Bash call and keep 540000 (see "Out of scope").

## The design

### The declaration (AC3)

```json
{ "gates": { "timeoutMs": 900000 } }
```

- **Read by floor code only.** `pharn/floor/gate-exclusion-core.mjs` already owns the closed `gates` block
  (`GATES_KEYS`); its key set becomes `["exclude", "timeoutMs"]` and `readGateExclusion` also returns `timeoutMs`
  (`null` when absent). Every reader of the block (run-gates `init`, the red run, the test-infrastructure pin) therefore
  refuses a malformed `timeoutMs`, exactly as it refuses a malformed `exclude` today (`bad-gate-exclusion`).
- **The value rules live in a new pure module, `pharn/floor/gate-timeout-core.mjs`** (P3: it changes when the timeout
  rule changes; the block reader changes when the block's shape does): `TIMEOUT_KEY`, `TIMEOUT_MAX_MS = 1800000`,
  `timeoutDeclarationError(v)` (an own-property-read safe integer from 100 to `TIMEOUT_MAX_MS` — 100 is run-gates'
  3-digit floor), and `effectiveTimeoutMs({declared, pinnedMs})`:
  - `declared === null` → `pinnedMs`, unchanged (AC1);
  - `declared < pinnedMs` → refusal: _a declaration may only lengthen the pinned per-gate timeout_;
  - else → `declared`.
- **No second copy of 540000 (L35).** The lower bound is RELATIVE to the pinned `--timeout-ms` the caller was given,
  so the pinned lines stay the one place the default lives. This also lets the tests drive real time at small scale
  (pinned 300 ms, declared 3000 ms), which is how AC2 is shown without a nine-minute test.
- **The upper bound, and what it costs (the constraint).** 1800000 ms (30 min). A longer timeout also lengthens a HUNG
  gate: each gate that hangs runs the full declared time before it is killed, at entry and on each side of regress and
  at verify. The bound, the contract and the stop text all say so.
- **AC5 — an older floor.** A floor ≤ 7.15.0 reading `gates.timeoutMs` refuses discovery with
  `` pharn.config.json `gates` has the key "timeoutMs"; its only key is `exclude` `` — it names the key, but shipped
  bytes cannot be changed to name the update. From 7.16.0 the unknown-key refusal names the remedy: a key a newer PHARN
  added needs that PHARN (`npx @pharn-dev/pharn@latest update`), otherwise remove it. The CHANGELOG entry and
  `docs/pipeline.md` name both the old message and the remedy. (Decision D2.)

### Entry (`entry-gates.mjs --start`)

After the existing wipe and before `runner.json` is written: `loadGateExclusion(".")` → `effectiveTimeoutMs` with the
pinned `--timeout-ms`. A declaration below the pinned value writes an `unusable` result with a new closed reason
`bad-gate-timeout` and refuses (exit 2), as `child-refused` does today; its observation is the existing `init-refused`
outcome (GRILL G3). A block that refuses is NOT a timeout refusal (GRILL G1): the pinned value is used and `run-gates.mjs
init` refuses it as today (`child-refused`, runner reason `bad-gate-exclusion`). Otherwise the
effective value is what `runner.json` `timeout_ms`, the runner's argv, the cached-evidence inputs and the base-evidence
offer carry — all already read from that one variable. The takeover in `--wait` already reads `runner.json`
`timeout_ms`, so it uses the same value. With no declaration the value is the pinned one, so every record is
byte-identical (AC1).

### Regress and verify (`stage-direct.mjs`, the detached stage runner)

The fresh START call (before `runner.json` is written) resolves the effective value the same way from the project root,
then:

1. **The run pin (AC4, "pinned for the run").** When `pharn/.run/pharn-entry/runner.json` is a valid entry runner
   record (`entry-gates-core.mjs runnerRecordDefect`) naming this `--name`, its `timeout_ms` must equal the effective
   value; otherwise the call refuses `timeout-changed` (exit 2), naming both values and the remedy (restore the
   declaration, or start a new run). A record that is absent, unreadable or another feature's pins nothing (a stated
   bound).
2. The recorded fresh argv's `--timeout-ms` value is replaced by the effective one (a new pure
   `stage-direct-core.mjs withTimeout(argv, ms)`), so the runner, every `--resume` and a takeover all read the one
   recorded value. `stage-regress.mjs` already keeps `timeoutMs` in its progress record and both its base and head
   drains read it, so the two sides of one comparison share it (AC4) with no change to the script.
3. Two new closed refusals in `CALL_REFUSALS`: `timeout-unusable` (a declaration below the pinned value; a block that
   refuses falls through with the pinned value to the stage script's existing refusal — GRILL G2) and
   `timeout-changed`. The orchestrators already map a stage-direct exit 2 as the stage's `unusable` (S9 / STOP); no
   mapping changes.

With `T > --budget-ms`, `mayStartSlowStep` lets each script invocation start exactly one slow step (its first, L58), so
the runner still makes progress one gate per invocation and resumes on each exit 5; the orchestrator's waits stay
bounded by `--budget-ms`. A TAKEOVER's one foreground invocation can then outlast the 600 s Bash call (already a named
bound in `stage-direct.mjs` and `stage-exit.md`: the Bash tool backgrounds such a call); the bound is restated with the
declared value. The entry `--wait` takeover has the same bound.

### The stop text (AC6)

- `/pharn-loop` S14b's row and Step 4's `6` bullet: beside "list it in `pharn.config.json` `gates.exclude`", add "or, for
  a slow but healthy gate, declare a longer per-gate timeout in `gates.timeoutMs` (at most 1800000 ms; a hung gate then
  also runs that long before it is killed), committed before the re-run".
- `/pharn-ship`'s stages part, Step 2.3's `6` branch: the same remedy named when an unmeasured entry is presented.
- `/pharn-loop`'s close part, the "not measured" bullet (the regress/verify `STOP_TERMINAL unmeasured` stop): the same
  remedy, one clause.

The pinned command lines and their grants do not change (AC1).

## Applied lessons

- L15 — `gates.timeoutMs` is read with `Object.hasOwn` at both levels (the block reader already does for `exclude`); a
  test feeds `__proto__` / `toString` keys and an inherited `timeoutMs` and expects "absent", never a value.
- L35 — the lower bound is relative to the pinned `--timeout-ms`, so 540000 keeps ONE home (the pinned lines); no floor
  default and no `MIN = 540000` constant is added.
- L41 — every new test file has a no-declaration case driving the production path (no config file at all, and a config
  with no `gates` key) and asserting the byte-identical records and argv; the AC1 claim rests on those, not on fixtures
  that always declare.
- L43 — the entry-record comparison is stated as agreement between two `pharn/.run/` records a Bash writer reaches,
  never provenance of the value; the contract text says so.
- L62 — every refusal quotes the declared value and an unknown key through `quote-core.mjs shown()`; a test feeds a
  `{"toString":1}` value and an array holding one.
- L65 — the pin's record (`pharn/.run/pharn-entry/runner.json`) is written only by `entry-gates.mjs` through `fs`;
  the contract states that a build whose plan could name it, or a Bash writer, could rewrite it consistently, so the
  pin narrows a mid-run change and never proves who chose the value.
- L81 — `stage-direct.test.mjs` copies the whole `pharn/floor/` (no hand-picked list), so the two new imports
  (`gate-exclusion-core.mjs` → `gate-timeout-core.mjs`, `entry-gates-core.mjs`) need no copy-list edit; any other test
  that copies named modules and reaches `gate-exclusion-core.mjs` is found by a grep at build and updated.
- L83 — the timeout refusal is surfaced at the earliest stage that reads the declaration: `entry-gates.mjs --start`
  (Step 1a / Step 2.1) writes it as the entry result's reason, and `/pharn-test`'s red-run preflight refuses a malformed
  block through the same reader before the build, so only the "below the pinned value" case first STOPs at regress — a
  stated bound.
- L84 — the feature's only effect is a branch off the pinned default, so tests take the branch on realistic input: a
  real gate that runs longer than the pinned timeout and shorter than the declared one is MEASURED with the
  declaration and UNMEASURED without it, at entry and at verify (and through the regress argv/progress record).

## Files

- `pharn/floor/gate-timeout-core.mjs` — NEW: the timeout value rules (key, upper bound, shape error, effective value) — product floor
- `pharn/floor/gate-timeout-core.test.mjs` — NEW: shape, bounds, relative lower bound, own-property reads, total refusals — floor test
- `pharn/floor/gate-exclusion-core.mjs` — `GATES_KEYS` gains `timeoutMs`; returns `timeoutMs`; unknown-key refusal names the remedy; header — product floor
- `pharn/floor/gate-exclusion-core.test.mjs` — the new key, `null` when absent, malformed values, the remedy text — floor test
- `pharn/floor/entry-gates.mjs` — `--start` resolves the effective timeout; `bad-gate-timeout` result; header — product floor
- `pharn/floor/entry-gates-core.mjs` — the `bad-gate-timeout` reason in the closed unusable-reason set — product floor
- `pharn/floor/entry-gates.test.mjs` — AC1 records byte-identical; AC2 at small scale (measured vs unmeasured); refusals — floor test
- `pharn/floor/stage-direct-core.mjs` — `withTimeout`, the two new `CALL_REFUSALS` — product floor
- `pharn/floor/stage-direct.mjs` — the start call resolves the timeout, checks the entry pin, records the argv; header — product floor
- `pharn/floor/stage-direct.test.mjs` — AC1 argv identical; declared value reaches both stages' scripts; pin refusal; AC2 through the real stage-verify — floor test
- `pharn/floor/run-gates.test.mjs` — `init` refuses a malformed `gates.timeoutMs` as `bad-gate-exclusion`; updated unknown-key message — floor test
- `pharn/pharn-contracts/gate-run-record.md` — new section "A longer per-gate timeout (`gates.timeoutMs`, 7.16.0)"; the `--timeout-ms is required` bound amended — contract
- `pharn/pharn-contracts/stage-exit.md` — the takeover/Bash-cap sentence names the declared value — contract
- `.claude/commands/pharn-loop.md` — S14b row and Step 4's `6` bullet name `gates.timeoutMs` (AC6) — product command
- `.claude/commands/pharn-loop-close.md` — the "not measured" bullet names the remedy (AC6) — product command
- `.claude/commands/pharn-ship-stages.md` — Step 2.3's `6` branch names the remedy (AC6) — product command
- `.dev/floor/command-hygiene.test.mjs` — pins AC6 (both remedies named in each stop text); byte ceilings if the measured bytes need it — dev test
- `.dev/floor/stage-load-budget.test.mjs` — load ceilings, only if the measured totals need it — dev test
- `docs/pipeline.md` — a "Lengthening the per-gate timeout (7.16.0)" section; the e2e line's "(540 s)" qualified — docs
- `README.md` — one clause beside `gates.exclude` in the loop section; the generated current-state count — root doc
- `CHANGELOG.md` — the 7.16.0 entry — repo meta
- `SKILLS_VERSION` — 7.16.0 — repo meta
- `.dev/guides/floor-gates.md` — the gate-exclusion and entry-gates sections name the key — apparatus
- `.dev/guides/floor-orchestration.md` — the stage-direct section names the resolution and the two refusals — apparatus

### Not written by this increment

- The four trusted docs, `CODEOWNERS`, the settings files and the hook scripts (protected). No edit is required:
  `pharn/LIMITS.md` names no timeout value this changes. An optional sentence for `pharn/LIMITS.md` (a declared timeout
  lengthens a hung gate) is proposed in the PR body, not written.
- `MIN_CLI` (stays 0.14.0, see "Versioning").

## Versioning

- **Minor (7.16.0).** A newly shipped capability (a config key read by the floor). Not major: no contract, finding or
  frontmatter shape that existing installs read is invalidated — every existing `pharn.config.json` stays valid and
  produces byte-identical records. The forward case (an older floor refusing a config that declares the new key) is a
  refusal with a named key, not a broken install.
- **MIN_CLI unchanged.** `.dev/guides/versioning.md`: bump only when an older CLI would install a BROKEN tree. The CLI
  neither writes nor validates `gates`: pharn-cli's `userOwnedConfigEntries` (`src/lib/pharn-config.ts`, read this
  run) carries every top-level key it does not own — `gates` included — verbatim through `init`, `add`, `update` and
  `remove`. So an older CLI installs this tree intact, and a declared key survives its writes.

## Contracts satisfied

- `gate-run-record.md` — the runner's `--timeout-ms` stays required with no floor default; the new section records
  that the entry runner and the stage runner pass a declared value in its place, and the bounds (cited, not restated in
  commands — P4).
- `stage-exit.md` — the stage-exit protocol is unchanged; only the stated Bash-cap bound for a takeover names the
  declared value.
- `regression-report.md` / `verify-report.md` — unchanged: stamps carry no timeout field, and `identity_sha256`
  (`gate-reuse-core.mjs`) already includes the timeout, so verify reuses regress's head runs only when both used the same
  value, which the pin makes the case within a run.

## Evals to write (P1)

No Capability is added (floor code + contract + command text), so no `evals/` directory; the tests are the evals.

- gate-timeout-core → absent → pinned exactly; 600000 with pinned 540000 → 600000; 1800000 → ok; 1800001, 0, 99,
  -1, 1.5, "900000", null, true, [], {} → refused; declared 539999 with pinned 540000 → refused "may only lengthen";
  `{"toString":1}` → refusal text, no throw.
- gate-exclusion-core → no file / no `gates` / `{}` → `timeoutMs: null` and `exclude: []`; `{"timeoutMs": 900000}` →
  900000; `{"exclude":["e2e"],"timeoutMs":900000}` → both; an unknown key → refusal naming `exclude`, `timeoutMs` and
  the update remedy; `__proto__` key → refused as unknown, never read as a value.
- entry-gates → no config: `runner.json` `timeout_ms` and the runner argv equal the pinned value (AC1); declared 3000
  with pinned 300 and a gate that runs ~1 s → exit 0 green (measured); the same gate with no declaration → exit 6
  unmeasured (AC2); declared below pinned → exit 2 `bad-gate-timeout` and an `unusable` result.
- stage-direct → no config: `runner.json` argv byte-identical to the call's (AC1); declared value → `runner.json` argv
  and the fake script's received argv carry it, for regress and for verify; entry record of this feature with another
  `timeout_ms` → `refused (timeout-changed)`, nothing run; another feature's record → no refusal; declared below pinned
  → `refused (timeout-unusable)`; through the REAL stage-verify: a slow gate measured with the declaration, unmeasured
  without (AC2 at verify). Regress: the declared value reaches the real stage-regress fresh argv and its progress
  record (the one value both sides read — AC4).
- run-gates → `init --discover` with a malformed `gates.timeoutMs` → exit 2 `bad-gate-exclusion`.
- command-hygiene → S14b's row, Step 4's `6` bullet, ship Step 2.3's `6` branch and the close part's not-measured bullet
  each name both `gates.exclude` and `gates.timeoutMs` (AC6); the pinned entry/stage lines are unchanged (existing pins).

## Guarantee audit (P0)

- "with no declaration every line, record and stamp is byte-identical" → floor: enum-regex — tested runner code
  (`effectiveTimeoutMs` returns the pinned value; tests compare the records and argv byte for byte); the pinned lines
  are pinned by the existing command-hygiene tests.
- "the value is read by floor code, closed shape, upper bound" → floor: enum-regex (integer range, closed key set) in
  tested code. ADVISORY: that the orchestrator runs the pinned lines at all.
- "never chosen by the model" → advisory, narrowed: no pinned line carries it and no prompt asks for it; the value
  comes from `pharn.config.json`, which is agent-editable project input (not write-protected; in an installed project
  outside a run it is on the guard's reserved list, inside a run the build's plan could name it, and Bash reaches it).
  The entry pin narrows a mid-run change; reconcile reports an undeclared Bash write to it. Agreement, never provenance
  (L43).
- "pinned for the run (entry → regress → verify)" → floor: integer equality between the effective value and the entry
  record, in tested code — bounded: only when an entry record of this feature exists; both are `pharn/.run/` records a
  Bash writer reaches.
- "the same value on both sides of one comparison" → floor by construction: one `timeoutMs` in stage-regress's progress
  record, read by both drains (existing tested code); a test asserts the record holds the declared value.
- "a gate that finishes before T is measured, one past T is unmeasured" → floor: run-gates' existing tested timer and
  `unmeasuredRuns`; the new tests show the declared value reaches it.
- "an older floor fails with a message naming the remedy" → partly unachievable and stated: shipped floors name the
  key, not the update; from 7.16.0 the floor's own refusal names it (enum-regex, tested text).
- "the stop text names the declaration" → floor: regex over the command text (command-hygiene); that a model reads it
  is advisory.

## Trust audit (P2)

- `pharn.config.json` is untrusted project DATA: parsed as JSON, keys tested by own-property, the value used only as an
  integer after a range test; every value quoted into a refusal goes through `shown()`.
- `pharn/.run/pharn-entry/runner.json` is unauthenticated state: parsed by the existing total `runnerRecordDefect`,
  used only for an integer equality; a forged record can only refuse a stage (a stop), never lengthen a timeout beyond
  the declared, range-checked value.

## Determinism audit (P5)

Every branch is a membership or integer test: key presence (own-property), integer range, `declared < pinned`,
`entry.feature === name`, `entry.timeout_ms === effective`. Refusals end in a stop the orchestrators already map, whose
remedy goes to a person.

## Out of scope (named follow-ups)

- `build-gate-declared-timeout` — `/pharn-build`'s `build-gate.mjs --mode full` runs the suite inside a Bash call at
  540 s and reads a timed-out gate as `red`; with a nine-minute suite the build's full gate can never pass. It cannot
  take the declaration without a detached runner of its own.
- `thin-caller-declared-timeout` — `/pharn-regress` and `/pharn-verify` run by a person keep 540000 (their Bash call
  binds them); a declared project still sees its slow gate unmeasured there.
- `entry-timeout-refusal-stop` — a declaration below the pinned value is refused at entry with exit 2, which both
  orchestrators read as "go on"; the run then STOPs at regress. Mapping it to an entry stop is a command change.

## Decisions at GATE 1 (2026-11-16)

The four questions this plan held open, each decided as recommended:

- **D1 — upper bound:** 1800000 ms (30 min). `TIMEOUT_MAX_MS = 1800000`.
- **D2 — AC5 for floors already shipped:** accepted. Floors ≤ 7.15.0 keep their existing message (it names the key
  `timeoutMs` and says the only key is `exclude`); from 7.16.0 the refusal names `npx @pharn-dev/pharn@latest update`
  (or removing the key). The CHANGELOG entry and `docs/pipeline.md` state the remedy.
- **D3 — a mid-run change of the declaration:** refuse `timeout-changed` at regress/verify (a stop).
- **D4 — lower bound:** relative — a declaration may only lengthen the pinned value.

Out of scope and kept as named follow-ups in the PR body, scope not widened: `build-gate-declared-timeout`,
`thin-caller-declared-timeout`, `entry-timeout-refusal-stop`.

## Amended after `/pharn-dev-grill` (2026-11-16)

`GRILL.md` raised six advisory concerns; each is folded in here or in the line it names, no path added:

- **G1 / G2** — the two new refusals mean only "a well-formed declaration below the pinned value"; a block that refuses
  keeps today's refusal path (entry: init's `child-refused`; regress/verify: the script's own `unusable`).
- **G3** — the entry refusal's observation is `init-refused` (START_OUTCOMES unchanged; `entry-observations.mjs` is not
  written).
- **G4** — the contract section states that regress's base-side install is bounded by the same value.
- **G5** — `docs/pipeline.md` names where the declaration does not apply (the thin callers, `/pharn-build`'s full gate,
  `/pharn-test`'s red run).
- **G6** — the run pin stays as planned, read through the imported `runnerRecordDefect`.

**APPROVED on 2026-11-16 by the orchestrator** — a model decision made under the user's 2026-11-16 delegation, **not a
human approval**. The plan was accepted as written: 24 declared paths, SKILLS_VERSION 7.16.0 (minor), MIN_CLI unchanged
at 0.14.0, no protected path written.

## Open questions (HALT)

- none.
