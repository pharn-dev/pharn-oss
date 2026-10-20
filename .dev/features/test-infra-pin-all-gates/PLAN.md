# PLAN — test-infra-pin-all-gates (audit SEC-4)

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L36, L37, L52, L64, L65, L75]
- increment: The AC-TESTS lock's test-infrastructure pin covers the command of EVERY allowlisted gate the project has
  (script, pre/post, the scripts it chains to), not only the AC level gates — lock schema `ac-tests-lock/6`; a `/5`,
  `/4` or `/3` lock is judged by what it pinned and reads `unpinned` (never GREEN) for every other gate the live tree has.
- layer(s): product floor (`pharn/floor/`), pharn-contracts (`ac-tests.md`), product commands (prose only)
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Trigger (P7)

Audit 2026-10-12 finding **SEC-4 (Medium)**, re-read live on `origin/main` 6.65.1:

- `pharn/floor/test-infra-core.mjs:257-260` `candidateGates(levels)` = the union of `LEVEL_GATES` over the mapped
  levels; `readGates` (`:458-468`) pins only those. Only `exclude` (`:47-52`) ranges over the whole allowlist.
- `pharn/floor/gate-run-core.mjs:431-440` `discoverGates` runs every `ALLOWLIST` id `package.json` has as
  `npm run <id>` (`test, lint, format:check, lint:md, typecheck, type-check, build, test:e2e, e2e`).
- `pharn/floor/check-ac-tests.mjs:299-302` prints only an advisory `NOTE —` when PLAN `## Files` names `package.json`.
- So a build scoped to `package.json` can rewrite `scripts.lint` / `typecheck` / `build` (or `prelint`, or a script
  `lint` chains to) — to `true` (a forged green gate) or to any command — and verify's AC gate stays PASS. Real
  failure: the audit's reproduction; not hypothetical.

## Approach

`test-infra-core.mjs`, the one place the pin is defined (P4):

1. `computeTestInfra` adds two sections (`/6`):
   - **`other_gates`** — `{id, script, pre, post}` for every `ALLOWLIST` id `package.json` HAS that is not a candidate
     level gate for the pin's levels (so `test:e2e` lands here when no e2e AC is mapped), sorted by id. Read with the
     existing `valuesOf` (own-property, string, ≤ MAX_SCRIPT — a refusal otherwise). Excluded gates are NOT filtered
     out, exactly as `gates` is not (the contract's existing rule).
   - **`other_chained`** — every script an `other_gates` value chains to, transitively, by the SAME closed token pass
     (`chainedIds`, `MAX_CHAIN_HOPS`, own-property), not already in `gates` / `chained` / `other_gates`; sorted by id.
2. **What is NOT added: named files.** The level-gate walk keeps producing `script_files`; the other-gate walk records
   chains only. Reason: a non-level gate's named files are typically SOURCE (`tsup src/index.ts`,
   `esbuild src/main.ts`), and pinning them would make every feature that edits an entry file read
   `test-infra-changed` (and `scriptNamedFiles`' plan-time `test-infra-in-plan` RED would refuse the plan). Their
   configs (`eslint.config.*`, `tsconfig.json`, Prettier/markdownlint configs) are unpinned anyway, so pinning only
   the named files would be a partial with a large cost. Stated as a bound (header NOT-caught list + contract).
   `scriptNamedFiles` is unchanged (level gates only).
3. `diffTestInfra`: `other_gates` changed / added / gone / pre-post (by id); `other_chained` value / pre-post /
   no-longer-reached / newly-reached (by quoted id). Never a script's text (P2).
4. **Old locks (the explicit decision).** `testInfraReds` for a recorded pin WITHOUT `other_gates` (`/5`, `/4`, `/3`):
   `changed` = its own sections' diff, exactly as today; `unpinned` += one line per live `other_gates` entry and per
   `other_chained` entry ("… an ac-tests-lock/5 pin does not cover it"). So an old lock over a tree with ANY non-level
   allowlisted gate (almost every project: `lint`) reads **`--check` RED "test infrastructure unpinned — …"**
   (`lock-red` at check-test-stage) and **`test-infra-unpinned` at the AC gate → `ac-evidence` → verify FAIL**
   (`/pharn-loop`: S13 `ac-evidence-invalid`). Never GREEN, never `changed`. A tree with no non-level gate reads
   exactly as before. Remedy = the existing one: set the build aside, re-run `/pharn-test` (writes `/6`). This is the
   6.31.0 (`/3`) and 6.36.0 (`/4`) precedent. Shape: `/5`, `/4`, `/3` still read; nothing becomes shape-invalid.
5. `pinShapeError({version: 6})`: closed keys `PIN_KEYS` (+`other_chained`, `other_gates`), `PIN_KEYS_V5` kept;
   `other_gates` ids ∈ ALLOWLIST \ candidateGates(levels), sorted/unique, `{id, post, pre, script}` exact;
   `other_chained` `{id, post, pre, script}` exact, clean ids, sorted/unique; the four id sets pairwise disjoint (L36:
   closed at every level, no id recorded twice).

`ac-tests-lock.mjs`: `SCHEMA = "ac-tests-lock/6"`, `SCHEMA_V5 = "ac-tests-lock/5"` added to the read set and the
`pinVersion` map; `--record-red-run` writes only on `/6` (existing rule: current schema only); `--write`'s WROTE
line also counts other gates. `ac-gate-core.mjs`: no logic change (it reads `pinReds`); header comment names `/5`.
`check-ac-tests.mjs`: the `package.json` NOTE text says every allowlisted gate's script is compared at verify.

**Quick and loop paths.** `spec_kind: quick` is a `TEST_FIRST_KINDS` member: `/pharn-ship --quick` and
`/pharn-loop --quick` run the same `/pharn-test` (`--write` → `/6`) and the same `/pharn-verify --ac-gate`, so they
get exactly the full pin, no delta (`pharn-ship-quick.md` item 5, `pharn-loop-quick.md` item 3 — verified live). A
`/pharn-loop` build that edits any gate's script now stops S13 `ac-evidence-invalid` instead of PASSing. A
`spec_kind: test-infra` (bootstrap) or legacy SPEC still pins nothing — unchanged, stated.

## Files

- `pharn/floor/test-infra-core.mjs` — the /6 pin (other_gates, other_chained), shape, diff, old-lock unpinned — product floor
- `pharn/floor/test-infra-core.test.mjs` — per-member tests (below) — test
- `pharn/floor/ac-tests-lock.mjs` — SCHEMA /6, /5 still read, WROTE line, header — product floor
- `pharn/floor/ac-tests-lock.test.mjs` — schema /6 written, /5 read + unpinned, --record-red-run on /6 only — test
- `pharn/floor/ac-gate-core.mjs` — header comment only (/5 lock reading) — product floor
- `pharn/floor/ac-gate-core.test.mjs` — AC gate: lint script changed → test-infra-changed; /5 lock → test-infra-unpinned — test
- `pharn/floor/check-ac-tests.mjs` — package.json NOTE text + header — product floor
- `pharn/floor/check-ac-tests.test.mjs` — NOTE regex — test
- `pharn/floor/check-red-run.test.mjs` — schema literal /5 → /6 — test
- `pharn/floor/check-test-stage.test.mjs` — only if a fixture's old-schema lock now reads unpinned — test
- `pharn/pharn-contracts/ac-tests.md` — the lock example, schema list, the pin's sections, NOT-caught list, migration — contract
- `.claude/commands/pharn-test.md` — Step 4 sentence: what the pin covers (within its byte ceiling) — product command
- `.claude/commands/pharn-build.md` — Step 2 sentence "never change the level gates' scripts" → every allowlisted gate's (one sentence; group F owns this file's grants — minimal, disjoint hunk) — product command
- `.claude/commands/pharn-plan.md` — the test-infra split sentence names a gate-script change — product command
- `.dev/guides/floor-ac-tests.md` — schema /6 and the pin's reach — dev guide
- `.dev/floor/command-hygiene.test.mjs` — only if `pharn-test.md` outgrows its 20480 ceiling: raise by the documented
  rule (measured + 10%, rounded up to 512) — dev test (GRILL documentation finding)
- `.dev/features/test-infra-pin-all-gates/HUMAN-PATCH.md` — the LIMITS.md §9 disclosure (trusted doc, human applies) — dev
- `CHANGELOG.md` — `[6.66.0]` section — repo meta
- `SKILLS_VERSION` — 6.65.1 → 6.66.0 — repo meta
- `README.md` — the shields version badge only (`check:badge` pins it to `SKILLS_VERSION`; missed at first planning,
  added before any README write, and build Step 0 — setter then anchor — re-run so the epoch's opening scope names
  it) — repo meta

## Contracts satisfied

- `pharn/pharn-contracts/ac-tests.md` "The test-infrastructure pin" — extended in place; the header of
  `test-infra-core.mjs` stays the one copy of the NOT-caught list (P4) and the contract restates it.
- `pharn/pharn-contracts/verify-report.md` `ac_gate` — unchanged: the reasons (`test-infra-changed`,
  `test-infra-unpinned`) and their EVIDENCE class are the existing closed set.

## Evals / tests to write (P1) — one per member of each set (L52)

- `computeTestInfra`: default world (`test` + `lint`) → `other_gates: [lint]`, `other_chained: []`; a world with every
  ALLOWLIST id → each non-level id in `other_gates`, each level id in `gates` (enumerated over `ALLOWLIST`, not
  hand-picked — L36/L52); e2e level mapped vs not (test:e2e in `gates` vs `other_gates`).
- `diffTestInfra` per member, each tripping only itself: other gate script changed / added / gone / pre added / post
  gone; other chained value changed / pre added / no longer reached / newly reached; P2: no script text in any line.
- `other_chained` walk: `lint: "npm run lint:all"` pins `lint:all`; a script reached by both a level gate and an
  other gate is recorded once (in `chained`); hop bound refuses; a non-string other-gate value refuses the pin.
- Named files from other gates NOT pinned (the stated bound, probed — L37): `build: "tsup src/index.ts"` → editing
  `src/index.ts` keeps the pin GREEN, and `scriptNamedFiles` does not list it.
- Migration, per old schema (L52 — `/5`, `/4`, `/3` each): no non-level gate → HOLDS; `lint` present → `unpinned`
  names `lint` (never `changed`); a `/5` change still `changed` beside it.
- `pinShapeError` v6: good pin null; `/5`-shaped under 6; each bad member (unknown key, other_gates id that is a level
  gate for these levels, id outside ALLOWLIST, unsorted, duplicate, id in two sections, non-string script, extra key).
- Lock: `--write` writes `/6`; a hand-written `/5` lock over a tree with `lint` → `--check` RED "unpinned"; with no
  non-level gate → GREEN; `--record-red-run` refuses a `/5` lock.
- (GRILL testability) closure: for worlds over every subset shape tried, ids(`gates`) ∪ ids(`other_gates`) equals
  `discoverGates(scripts)`'s ids — the pinned set IS the run set.
- (GRILL error-handling) a non-string `lint` value refuses the pin (`--write` exit 2), named by id.
- AC gate (ac-gate-core.test): a `/6` lock + `lint` rewritten → `test-infra-changed` evidence; a `/5` lock + `lint` →
  `test-infra-unpinned`.

## Guarantee audit (P0)

- "a change to any allowlisted gate's script, pre/post or chained script after /pharn-test is a RED" → floor:
  content-hash/equality (recompute + exact compare in `test-infra-core.mjs`), read by `ac-tests-lock --check`
  and the AC gate's enum verdict. **DETECTED at verify, never PREVENTED**: by then the changed command has already
  run (build gate, regress head side, verify itself). Stated wherever the claim is made.
- "an old lock never reads GREEN over an unpinned gate" → floor: set membership (`unpinned` non-empty ⇒ RED /
  `test-infra-unpinned`), tested per schema.
- What the pin does NOT cover for a non-level gate (named files, its configs, env) → advisory/unpinned, stated in the
  header's NOT-caught list and the contract; HUMAN-PATCH for `LIMITS.md §9`.
- Agreement, never provenance (L43/L65): a lock rewritten to match passes; the lock stays outside the build's scope
  (`ac-artifact-in-plan`, unchanged).
- `check-ac-tests` package.json NOTE stays advisory (it cannot see which part of package.json the build will change).

## Trust audit (P2)

- Script values are untrusted DATA: hashed/compared, never echoed. A diff line names an ALLOWLIST id (closed set) or a
  chained id through `shown()` (quoted, bounded) — same rule as `chained`.

## Determinism audit (P5)

- Section membership is set arithmetic over ALLOWLIST, LEVEL_GATES and `Object.hasOwn(scripts, id)`; the old-lock
  branch keys on `Object.hasOwn(recorded, "other_gates")`, never on prose.

## Applied lessons

- L36 — the new `other_gates` / `other_chained` shapes are CLOSED at every level (exact keys, id domain, sorted, and the
  four id sets pairwise disjoint), and `PIN_KEYS` keeps a closure test; the ALLOWLIST-wide test iterates the constant.
- L37 — every bound sentence (named files NOT pinned for other gates; detected-not-prevented; old locks unpinned) is
  bound to a test that executes it, written before the sentence.
- L52 — the remedy ranges over SETS: tests iterate every ALLOWLIST id, every diff member, and every old schema
  (`/5`, `/4`, `/3`), not one representative.
- L64 — the CHANGELOG entry, the contract, the guide, the three command sentences and HUMAN-PATCH restate the bound;
  each restatement is re-checked against the tests at GATE 2 (the quantifier "every allowlisted gate" means the
  command only, never the files it names).
- L65 — the pin's strength rests on the lock staying out of the build's scope; `ac-artifact-in-plan` is unchanged and
  cited, not weakened.
- L75 — sweep for the referent that moved ("the level gates' scripts" as the pin's whole reach; `ac-tests-lock/5` as
  the written schema), hits with disposition:
  - `test-infra-core.mjs` header/JSDoc — EDIT; `ac-tests-lock.mjs:8-35,114,394-410,625-630,704` — EDIT;
    `ac-gate-core.mjs:21-25` — EDIT (comment); `check-ac-tests.mjs:31-42,301` — EDIT (NOTE + header);
    `check-ac-tests.mjs:64,152,273,282,440,463,502-503,306` — KEEP (about `scriptNamedFiles`, which stays level-only);
  - `ac-tests.md:240,278-293,321-356,400,444-448,509-513,629` — EDIT; `ac-tests.md:99,110` — re-read at build, EDIT if
    they claim the pin's whole reach;
  - `pharn-test.md:192` — EDIT; `pharn-build.md:82` — EDIT; `pharn-plan.md:291-296` — EDIT (split sentence);
    `pharn-plan.md:342-346` — KEEP (about plan-time named files and the package.json NOTE, still true);
  - `floor-ac-tests.md:24` — KEEP (named files); `:32`, `:132-150` — EDIT;
  - tests: `ac-tests-lock.test.mjs:238,412,845`, `check-red-run.test.mjs:904` — EDIT to /6 where they assert the
    WRITTEN schema, KEEP where they construct an old lock on purpose; `ac-gate-core.test.mjs:463,495`,
    `check-test-stage.test.mjs:760`, `check-ac-tests.test.mjs:866-913` — KEEP (named files);
  - `LIMITS.md:559-563` ("script chaining", "npm's own configuration" — stale since 6.31.0, plus the new reach) —
    HUMAN-PATCH.md;
  - `CHANGELOG.md` older sections — KEEP (released, append-only).

## Bump

**minor → 6.66.0.** A new lock schema (`/6`) and a wider pin = a newly shipped checker capability. Not major: no
existing lock becomes shape-invalid — `/5`, `/4`, `/3`, `/2`, `/1` are all still read; an old lock over a tree with a
non-level gate reads `unpinned` (a stated, remedied verdict, the 6.31.0/6.36.0 precedent, both minor). Rolling back:
a pre-6.66.0 floor reads a `/6` lock `lock-unusable` / `ac-tests-modified` (never GREEN), stated. `MIN_CLI` unchanged
(no installed path moves; the CLI does not read the lock).

## Out of scope (stated)

- Prevention (refusing to RUN a changed gate before verify/regress/build-gate) — a separate increment; this is detection.
- Pinning what a non-level gate READS (named files, eslint/tsconfig/prettier configs) — bound, not built (cost above).
- `pharn.config.json` `regress.install` (group E), `pharn-build.md` / `pharn-loop.md` grants (group F) — not touched
  beyond the one `pharn-build.md` sentence above.

## GATE 1 decision (delegated to the orchestrator, recorded — not a human approval)

APPROVED. Q1 unpinned/RED for old locks, with an explicit upgrade note in the CHANGELOG entry (what an in-progress
feature sees after updating; remedy: re-run `/pharn-test`). Q2 no — bound stated. Q3 yes, fail-closed — stated in the
CHANGELOG and in the `pharn-test.md` / `pharn-plan.md` text a planner reads. Q4 minor, renumbered at PR time. The
GRILL's four advisory findings are folded in above (closure test, refusal test, the ceiling-table entry, and the
detection bound naming the build gate, each loop iteration, regress head and verify).

## Open questions (resolved at GATE 1) — recommended answers in bold

1. Old `/5` (and `/4`, `/3`) lock over a tree with a non-level gate: **`unpinned` → `--check` RED / AC gate
   `test-infra-unpinned` (verify FAIL), remedy re-run `/pharn-test`** — vs a NOTE-only grace reading (would let an
   in-flight feature pass with lint unpinned; rejected by the brief: "must not silently pass as pinned").
2. Named files of non-level gates: **not pinned, stated bound** — vs pinned (closes `node tools/lint.mjs` edits but
   reds every feature that edits a bundler entry and adds a plan-time RED).
3. A NEW allowlisted script added by the build (e.g. `typecheck` where none existed): **`changed` ("a package.json
   script was added") → test-infra-changed**, fail-closed (an added gate is an attacker-chosen command just the same);
   cost stated: a feature that introduces a gate script must be a `spec_kind: test-infra` increment.
4. Bump **minor 6.66.0** (justified above).
