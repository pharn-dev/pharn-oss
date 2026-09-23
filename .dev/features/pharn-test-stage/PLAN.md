# PLAN — pharn-test-stage

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L1, L6, L15, L22, L29, L31, L34, L35, L36, L41, L43, L52]
- increment: Ship a NEW standalone product stage `/pharn-test` that writes each Acceptance Criterion's test BEFORE build from an `AC-TESTS.md` mapping `/pharn-plan` owns, floor-checks that mapping, pins the written tests in a script-written `AC-TESTS.lock.json`, and keeps the tests outside the build's writes-scope — with the regress/artifact enumerations that the build exclusion makes necessary.
- layer(s): the product floor (`spec-template-core.mjs`, new `check-ac-tests.mjs`, new `ac-tests-lock.mjs`, `check-model-config.mjs`, `check-regress.mjs`, `reconcile-ignore.json`, `worktree-fingerprint.mjs`), pharn-contracts (new `ac-tests.md`), the product `.claude/` surface (new `pharn-test.md`, `pharn-plan.md`, `pharn-regress.md`), repo meta.
- constitution_refs: [P0, P1, P2, P3, P4, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

Measured on branch `pharn-test-stage` off `main` = `7e9ed52` (`SKILLS_VERSION` 6.16.0; items 01–02 merged as PRs 256
and 257).

1. **`set-writes-scope.cjs --from-plan` accepts any file** (the STOP condition the brief names does not fire).
   The mode dispatch (`set-writes-scope.cjs:317-336`) checks only that the file exists and parses
   `pathsFromPlanFiles`; no name check. So `--from-plan pharn/features/<n>/AC-TESTS.md` scopes `/pharn-test` with
   no hook edit.
2. **The build exclusion would make every `/pharn-regress` run RED on the AC tests** — a consequence the brief does
   not name. `check-regress.mjs scope` reports as a blocking **escape** every changed path that is neither in
   `--declared` (the PLAN's `## Files`, `pharn-regress.md:174`) nor a named pipeline artifact
   (`PIPELINE_ARTIFACTS`, `check-regress.mjs:108`). The AC test files are, by design, NOT in the PLAN's
   `## Files`, and `AC-TESTS.md` / `AC-TESTS.lock.json` are not artifacts it knows. So this increment also (a) adds
   the two artifact names to `PIPELINE_ARTIFACTS` and its two pinned copies (`reconcile-ignore.json`
   `pipeline_artifacts.names`; the fingerprint partition, `worktree-fingerprint.mjs:83-100`), and (b) makes
   `/pharn-regress`'s `--declared` the union of the PLAN's and AC-TESTS.md's `## Files`. The artifact names are
   forced anyway: `check-regress.test.mjs:210` fails when a command declares a `pharn/features/<name>/<x>` the
   enum lacks.
3. **No `spec-template-core.test.mjs` exists**; the core is tested through `check-spec.test.mjs`. The new AC export
   gets its tests in `check-ac-tests.test.mjs`, which is the module that consumes it.
4. **The installer needs no change.** `pharn-cli` copies every `pharn-*.md` not `pharn-dev-*`
   (`src/lib/install-capabilities.ts:167`, read this run), so `pharn-test.md` ships with the next `pharn update`.
   `MIN_CLI` stays 0.5.0.

## Decisions for the options halt (approved under the overnight delegation — see SHIP.md)

a. **Mapping grammar, and why a SEPARATE file.** One regex, one line per AC under `## Mapping`:

```text
- AC-<n> | <unit|integration|e2e> | `<test file>` | <public target>
```

The regex:

```text
^- (AC-[1-9][0-9]*) \| (unit|integration|e2e) \| `([^`\s][^`]*)` \| (\S.*)$
```

The target is free text the floor
checks only for presence (its quality is advisory — a named follow-up, `grill-ac-targets`). `AC-TESTS.md` is a
separate file because it must be a `--from-plan` scope source whose `## Files` is **exactly** the test files: the
setter reads the FIRST `## Files` of a file, so a section inside `PLAN.md` would either join the build's scope or
need a second extractor in `set-writes-scope.cjs`, which is a protected hook (`DEFAULT_PROTECTED`) — rejected.

b. **Lock → one new floor script, `ac-tests-lock.mjs --write | --check <name>`.** `--write` computes every digest
itself (L22); `--check` recomputes each test file's sha256 and the AC-TESTS.md digest and REDs naming the PATH,
never content. The lock carries `schema` and named sections — `spec`, `mapping`, `files`, plus `red_run: null` and
`test_infra: null` reserved for items 04 and 06 (one record per feature, L35).

c. **Stage key → `ac-test`.** `test` would collide in a reader's eye with the `test` gate id in the same
`pharn.config.json` (`testResults.test`). Command name stays `/pharn-test` as briefed.

d. **`/pharn-grill` → no change now.** The floor check covers completeness (every AC mapped once, levels agree);
judging whether a target is a good public interface is model work → follow-up `grill-ac-targets`, named not built
(P7).

e. **Legacy SPEC → a distinct exit code, not prose.** `check-ac-tests.mjs` exits **3** (`legacy-spec`) when the SPEC
has no `spec_template`, so `/pharn-test` branches on a membership test. Exit **2** = unusable input (a file
missing). `/pharn-plan` writes no AC-TESTS.md for a legacy SPEC.

## Files

- `pharn/floor/spec-template-core.mjs` — `specAcceptanceCriteria(text)`: a templated SPEC's AC ids and `verify:`
  levels, through the SAME item parser `checkAcceptanceCriteria` uses (extracted, not copied) — product floor
- `pharn/floor/plan-files-core.mjs` — port the setter's wrapped-continuation exemption (amended after grill: the
  core claimed parity with `set-writes-scope.cjs` and lacked it, so `in-plan-files` could pass while the build's
  scope still named the test) — product floor
- `pharn/floor/check-build-complete.test.mjs` — the ★ PARITY case for that rule, with a mutation control — floor
  test (apparatus)
- `pharn/floor/check-bash-reconcile.test.mjs` — its PIPELINE_ARTIFACTS parity becomes `names ∪ pre_anchor.names`
  — floor test (apparatus)
- `pharn/floor/worktree-fingerprint.test.mjs` — the partition compares against the same union — floor test
  (apparatus)
- `.claude/commands/pharn-spec.md` — `:114-115` ("PHARN itself does not yet write … acceptance tests") becomes
  true to 6.17.0 — product command
- `.dev/floor/command-hygiene.test.mjs` — a test that EXECUTES every `--from-frontmatter … --target …` line in the
  commands (amended after review: a formatter-split `writes:` broke one and only presence was pinned) — floor
  test (apparatus)
- `.claude/commands/pharn-loop.md` — `AC-TESTS.md` joins the Step-6c commit list (amended after review) — product
  command
- `.dev/floor/check-config.mjs` — a comment's "ten" product commands → eleven — dev floor (apparatus)
- `pharn/floor/check-ac-tests.mjs` — NEW. The mapping checker: closed RED kinds (below); exit 0 / 1 / 2 / 3 —
  product floor
- `pharn/floor/check-ac-tests.test.mjs` — NEW. One fixture per rule, the AC export, and the hook-deny test — floor
  test (apparatus)
- `pharn/floor/ac-tests-lock.mjs` — NEW. `--write` / `--check` — product floor
- `pharn/floor/ac-tests-lock.test.mjs` — NEW — floor test (apparatus)
- `pharn/floor/check-model-config.mjs` — `ac-test` joins `PRODUCT_STAGES` (ten → eleven) — product floor
- `pharn/floor/check-model-config.test.mjs` — its mirror of the set — floor test (apparatus)
- `pharn.config.json` — `models.stages["ac-test"]`: `opus` / `high` (test authorship from intent, like `plan`) —
  repo meta
- `pharn/floor/check-regress.mjs` — `AC-TESTS.md`, `AC-TESTS.lock.json` join `PIPELINE_ARTIFACTS` — product floor
- `pharn/floor/reconcile-ignore.json` — the same two names in `pipeline_artifacts.names` (pinned copy) — product
  floor
- `pharn/floor/worktree-fingerprint.mjs` — both classified `INCLUDED` (a change to either changes what verify's
  AC gate will judge) — product floor
- `pharn/pharn-contracts/ac-tests.md` — NEW contract: AC-TESTS.md shape and grammar, the checker's rules, the lock,
  bounds — pharn-contracts
- `.claude/commands/pharn-test.md` — NEW product command — product command
- `.claude/commands/pharn-plan.md` — `writes:` + a Step 4c that re-scopes, writes AC-TESTS.md (templated SPEC
  only) and runs the checker — product command
- `.claude/commands/pharn-regress.md` — `--declared` = PLAN `## Files` ∪ AC-TESTS.md `## Files`; the exempt-name
  list — product command
- `pharn/features/README.md` — the two new per-feature artifacts — product doc
- `README.md` — badge 6.16.0 → 6.17.0; `/pharn-test` in the commands table and the pipeline section; any
  `CURRENT-STATE` bytes `npm run docs:generate` rewrites (a Bash write, declared — L19) — repo meta
- `docs/capabilities/README.md` — only if `docs:generate` rewrites it — generated
- `CLAUDE.md` — the product command list and the "ten" count — repo meta
- `SKILLS_VERSION` — 6.16.0 → 6.17.0 (MINOR: a new command, checker and script) — repo meta
- `CHANGELOG.md` — `## [6.17.0] - <date>` — repo meta
- `.dev/features/pharn-test-stage/PROTECTED-FOLLOWUPS.md` — NEW — dev artifact

### Not written by the build

- `pharn/ARCHITECTURE.md` §6 (the pipeline spine gains a `test` stage between grill and build) and §4 (the
  contract list gains `ac-tests`) — protected; suggested text goes to `PROTECTED-FOLLOWUPS.md`.
- `/pharn-ship`, `/pharn-loop`, `check-loop-fresh.mjs`, `ship-outcome-core.mjs`, `mark-phase` stages — item 05.

## The mapping checker's rules (each a closed kind, one fixture each)

`check-ac-tests.mjs <AC-TESTS.md> <SPEC.md> <PLAN.md> [--features-dir <dir>]`

| kind                | RED when                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `legacy-spec`       | the SPEC has no `spec_template` (exit **3**, checked first)                                |
| `pin`               | `check-plan-spec-agree.mjs <AC-TESTS.md> <SPEC.md>` exits non-zero (SHELLED, never copied) |
| `malformed-line`    | a non-blank line under `## Mapping` does not match the grammar                             |
| `missing-ac`        | a SPEC AC id has no mapping line                                                           |
| `duplicate-ac`      | an AC id has more than one mapping line                                                    |
| `unknown-ac`        | a mapped id is not a SPEC AC id                                                            |
| `level-mismatch`    | a mapped level differs from the SPEC's `verify:` level                                     |
| `unlisted-file`     | a mapped test file is not in AC-TESTS.md `## Files`                                        |
| `unmapped-file`     | a `## Files` entry is mapped by no line                                                    |
| `in-plan-files`     | a test file appears in PLAN.md `## Files` (the build would be scoped to it)                |
| `claimed-elsewhere` | a test file is in another feature's AC-TESTS.md `## Files`                                 |
| `no-files`          | AC-TESTS.md has no `## Files`, or it lists nothing                                         |

Exit 0 GREEN · 1 RED (every kind above but `legacy-spec`) · 2 unusable input (a named file absent/unreadable) ·
3 `legacy-spec`.

## Evals to write (P1)

No Capability (`role:`). The suites are the specification: one fixture per kind that trips ONLY it, from one
passing fixture (L34/L52); `specAcceptanceCriteria` over a templated SPEC (ids + levels), a legacy SPEC (not
templated, no ids) and one reusing the exact parser (a SPEC `check-spec.mjs` accepts yields the ids it counted);
the lock `--write` then `--check` GREEN, one edited test file → RED naming its path, an edited AC-TESTS.md → RED
naming it, a missing file → RED; and the hook test — a build scoped `--from-plan PLAN.md` is DENIED a Write to an
AC test file by `enforce-writes-scope.cjs` (exit 2), and `--from-plan AC-TESTS.md` ALLOWS it (control).

## Guarantee audit (P0)

- "every SPEC AC has exactly one mapping line at the SPEC's level" → floor: enum/regex (checker).
- "the mapping was made against the current approved SPEC" → floor: content-hash, via the SHELLED
  `check-plan-spec-agree.mjs`.
- "the build cannot write an AC test file" → floor: hook (fix #7) — the file is absent from PLAN.md `## Files`
  (checker kind `in-plan-files`), and the build's scope is `--from-plan PLAN.md`. Bounded: a Bash write bypasses
  the hook (`LIMITS.md §6`) and is detected only inside the reconcile window.
- "the tests the lock pins are the files on disk" → floor: content-hash (`--check`). NOT that the tests are good,
  assert the right thing, or were written from SPEC+PLAN alone (L43).
- "`/pharn-test` reads only SPEC, PLAN and AC-TESTS.md" → **advisory**: `reads:` is not enforced
  (`pharn/ARCHITECTURE.md §3.1`).
- **Stated bound (the brief's):** the Bash-write reconcile epoch opens at `/pharn-build` Step 0, so `/pharn-test`'s
  writes precede it and a `/pharn-test` Bash write outside its scope is not reconciled. No anchor is added here: an
  anchor RESETS the baseline, and one at `/pharn-test` would be erased by the build's.

## Trust audit (P2)

SPEC, PLAN and AC-TESTS.md bodies are untrusted DATA. The checker ranges over ids, a closed level enum, paths and
two digests; the free-text target is checked only for presence and never interpreted. The lock holds digests and
paths only.

## Determinism audit (P5)

Every branch is a membership test or an exit code: the four exit codes, the closed kinds, the level enum. The
command's terminal fallback on an ambiguous `<name>` is to ask.

## Applied lessons

- L1 — the docs this changes are in `## Files` (README, CLAUDE.md, pharn/features/README.md, the contract,
  CHANGELOG); ARCHITECTURE §4/§6 go to PROTECTED-FOLLOWUPS.
- L6 — AC ids and levels are read from the SPEC's structured AC items through the SAME parser `check-spec.mjs`
  uses, never grepped from prose.
- L15 — every keyed lookup (AC id → level, file → owner) is a `Map`, never a plain-object index.
- L22 — the lock's digests are computed by the script, never typed by the model.
- L29 — the checker's kinds, the exit codes and `PIPELINE_ARTIFACTS` are materialized sets the tests iterate.
- L31 — `PIPELINE_ARTIFACTS` has two pinned copies (reconcile-ignore, the fingerprint partition); all three move in
  this increment together.
- L34 — a SPEC's AC list is non-empty by the template rules, and `no-files` REDs an AC-TESTS.md that lists nothing,
  so no rule can pass over an empty domain.
- L35 — one lock per feature with named sections for items 04 and 06; the chain logic is shelled, not copied.
- L36 — the kinds are closed, and a closure test ties every emitted kind to the set.
- L41 — the checker's `--features-dir` has one default, exercised by a test that omits it.
- L43 — the lock certifies the files match their recorded digests, never that the tests are right.
- L52 — each kind has its own one-mutation fixture.

## Open questions (HALT)

None. Decisions a–e are the options halt, approved under the overnight delegation (recorded in SHIP.md).

## Amended after grill

The independent grill (GRILL.md) found two blocking defects and several gaps; each is adopted here.

- **`check-model-config` maps stage → FILE NAME, and its reverse pass derived the stage from the file name**
  (`check-model-config.mjs:351-354`), so a key `ac-test` for `pharn-test.md` would RED as unmapped drift. The
  reverse pass now tests membership in the map's VALUES; its test helper writes the map's file names. Both are
  edits to an existing test, recorded as deviations.
- **`plan-files-core.mjs` lacked the setter's wrapped-continuation exemption** its own header claims
  (`set-writes-scope.cjs:267-273`). Ported, with a ★ parity case, so `in-plan-files` reads PLAN.md exactly as the
  build's setter does.
- **Pre-anchor artifacts are NOT reconcile-exempt.** `AC-TESTS.md` and `AC-TESTS.lock.json` are written before
  `/pharn-build`'s anchor, so a build-window change to either must stay visible. They go in a new
  `reconcile-ignore.json` `pre_anchor_artifacts.names` (read by nothing that exempts), and the two parity tests
  become `pipeline_artifacts.names ∪ pre_anchor_artifacts.names == PIPELINE_ARTIFACTS`, disjoint (L39: one list,
  two consumers, two questions). At regress they are still exempt (they changed since base by design).
- **AC-TESTS.md frontmatter is fixed:** `spec_id` and `spec_content_hash` (what `check-plan-spec-agree.mjs`
  requires). The checker detects missing files itself (exit 2) and relabels the shelled chain's RED as `pin`.
- **`/pharn-test`, specified:** Step 0 `--from-plan AC-TESTS.md` (fail-closed on a non-zero setter exit) and a
  final `--clear`; gates `check-spec-approved SPEC`, `check-plan-spec-agree PLAN SPEC` and `check-ac-tests`; every
  test's OWN title starts `AC-<n>:`; the lock re-scope (`--from-frontmatter … --target …/AC-TESTS.lock.json`)
  before `ac-tests-lock.mjs --write`, whose write is a Bash write (declared, L19); `model: opus`, `effort: high`.
- **New kind `bad-path`:** a `## Files` entry that is a placeholder or glob, not normalized (`./`, `..`, `//`,
  trailing `/`), absolute, under `.pharn/` (always writable) or under `pharn/features/` (a pipeline directory).
- **Stated bounds added:** the build exclusion holds only while PLAN.md is unchanged after `/pharn-test` (item 05's
  build precondition closes that); `/pharn-test` can write ONLY mapped test files, so a shared helper or fixture
  must be mapped to an AC or written by the build; a Draft SPEC is refused by the chain (`pin`) and gets its own
  fixture.
- **Stale docs added:** `pharn-spec.md:114-115`; `pharn.config.json`'s note, README's and CLAUDE.md's "ten" counts;
  the fingerprint's "exactly four" wording; `LIMITS.md`'s "ten" goes to PROTECTED-FOLLOWUPS.
- **Declined, with reasons:** moving the hook-deny test to the hook's own suite (it tests the property the
  checker's `in-plan-files` kind exists to guarantee, end to end, so it lives with the checker); dropping the
  `red_run` / `test_infra` placeholders (the brief asks for named sections for items 04/06 in this file).
- **Coverage method:** `check-ac-tests.mjs` and `ac-tests-lock.mjs` export their pure cores and are also run as
  CLIs; coverage is measured in-process for the cores and with `NODE_V8_COVERAGE` for the CLI entry points.

## Amended after review

The independent review (REVIEW.md, iteration 1) found two blocking defects and several gaps. Adopted:

- **`in-plan-files` and `claimed-elsewhere` compare what the setter SCOPES**, not the raw `## Files` text: every
  side goes through the setter's `clean` (strip a trailing parenthesised annotation) and `isConcrete`, and the comparison is
  case-folded (APFS). `plan-files-core.mjs`'s `clean` gets the setter's exact `\s+` (its "byte-faithful" claim
  was false), and a parity case pins it.
- **`pharn-test.md`'s `writes:` is one line** (the setter reads only a one-line array; Prettier had split it), and a
  hygiene test now runs the setter on every pinned `--from-frontmatter` line (L45: an invocation is covered only by
  executing it).
- **`/pharn-plan`:** Step 4b hands on to Step 4c; legacy is decided by a new `check-ac-tests.mjs --spec <SPEC.md>`
  mode (0 templated / 3 legacy / 2 unusable) BEFORE any AC-TESTS.md exists; a RED that needs a PLAN.md change
  re-scopes to PLAN.md and re-runs 4b and 4c.
- **Full mode with a legacy SPEC is RED (exit 1), not 3:** a mapping for a SPEC with no `spec_template` means the
  key was removed after mapping (it sits outside the body hash, so the pin cannot see it).
- **AC-TESTS.md becomes reconcile-EXEMPT, like PLAN.md; only the LOCK is pre-anchor.** A re-plan after the build's
  anchor legitimately rewrites both plan files; the lock is what pins the tests, so a build-window change to it (or
  to a test file) stays visible. A re-plan that leaves the lock stale is caught by `ac-tests-lock.mjs --check`.
- **`/pharn-loop`** stages AC-TESTS.md in its Step-6c commit.
- **Lock:** a null mapping digest refuses the write; `lockShapeError` closes nested keys, requires `red_run` and
  `test_infra` to be `null` under `ac-tests-lock/1`, and requires unique, sorted files; the mapping path is compared
  resolved; the header's exit codes are corrected.
- **Checker:** a nonexistent `--features-dir` is unusable (exit 2); a second `## Mapping` is `malformed-line`.
- **Honesty:** the pre-existing-test bound is stated (a mapped file that already exists is rewritten by
  `/pharn-test` and leaves the regression comparison — `/pharn-plan` is told to map only new files); "later stages
  match the prefix" and the CHANGELOG's "prove both" are corrected; the hook guarantee carries its Bash bound.
- **Declined, with reason:** a `pre-existing` RED kind — knowing "new" needs a git baseline this checker does not
  have, and no run has failed on it yet (P7); the bound is stated instead.
