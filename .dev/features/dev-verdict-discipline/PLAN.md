# PLAN — dev-verdict-discipline (review 2026-11-03: the dev loop merged past red floor verdicts)

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L5, L20, L22, L27, L29, L34, L35, L36, L43, L44, L45, L61, L62]
- increment: `/pharn-dev-verify` takes its gate map from a `run-gates.mjs` stamp and validates it with `check-verify.mjs --stamp` (a map the runner did not write is refused); `/pharn-dev-ship` makes a non-GREEN floor verdict a STOP that no delegation turns into a proceed and records the run's verdicts as a closed-set block in `SHIP.md`; a new per-PR dev check, `check-ship-record.mjs`, REDs a pull request that changes product surface without a green dev-chain record.
- layer(s): build apparatus only — `.claude/commands/pharn-dev-*.md`, `.dev/floor/`, `.dev/guides/`, CI wiring, repo meta. No product-surface byte changes, so no `SKILLS_VERSION` bump (CLAUDE.md, "SKILLS_VERSION discipline").
- constitution_refs: [P0, P2, P5, P6, P7]

## Applied lessons

- L5 — the dev verify map was assembled by the command's own Bash (`printf` over `$?` captures) and a hand-edited copy was what passed; the remedy moves input capture into the tested runner, whose stamp `check-verify --stamp` validates.
- L20 — four recorded escapes (#377/#380, #391, #392, #385) of a discipline-only rule ("stop on a red verdict") earn a floor check: the stamp refusal at verify and `check-ship-record.mjs` at the PR.
- L22 — the dev verify Step 1 pins the literal `run-gates.mjs init` / `run --next` lines instead of describing a capture technique.
- L27 — every refusal state of `check-ship-record.mjs` carries its own remedy line; none is shared.
- L29 — the `SHIP.md` verdict-block vocabulary is one exported enumeration in the checker that both the checker and the hygiene pins iterate.
- L34 — a diff with product paths and zero records is its own RED (`NO_SHIP_RECORD`), never a vacuous GREEN over an empty record set; the hygiene closure asserts the command names at least one block line.
- L35 — one grammar for the block: the checker exports it, and the command-hygiene pin checks the command's spelling against that export instead of keeping a second copy.
- L36 — a closure assertion collects every back-ticked `verdict-*:` / `run-ended:` spelling in `pharn-dev-ship.md` and requires each to parse under the checker's grammar.
- L43 — a green record is bound to its referent: the sibling `verify-report.json` must read `PASS` and carry the stamp path's `gate_run` block, so the record's PASS is checked against the checker's own output, not against more prose (still agreement, never provenance — stated as a bound).
- L44 — `run --next` is pinned one invocation per Bash call with no shell variable carried between blocks.
- L45 — the CI step and the npm script are pinned as committed strings, and the dev verify's committed `check-verify` line is EXECUTED by the new wiring test against hand-edited inputs.
- L61 — the recorded substitution (`loop-cost-6-73-2`) was a gitignored-scratch `lint:md` red; the new rule names the remedy (clean the tree or record the FAIL), never a value measured in another tree.
- L62 — every value `check-ship-record.mjs` quotes into a finding (paths, record lines) goes through `quote()`, which cannot throw on parsed input.

## The findings (verified live this run, P6)

1. **HIGH — dev verify has no `--stamp`.** `grep -n stamp .claude/commands/pharn-dev-verify.md` → no match. Step 1 assembles
   `pharn/.run/pharn-dev-verify/results.json` with `printf` over `$?` captures and Step 3 runs
   `check-verify.mjs pharn/.run/pharn-dev-verify/results.json`. `.dev/features/loop-cost-6-73-2/VERIFY.md:3-5` records a
   PASS over a map with one gate re-measured in another tree ("the substitution is a judgment").
2. **HIGH — dev ship proceeded past red verdicts.** `.dev/features/scanner-redos-sweep-2/SHIP.md:17-24` (verify FAIL →
   "the run proceeded to review instead of stopping"), `.dev/features/stage-agent-background-fix/SHIP.md`,
   `.dev/features/verify-test-reuse/SHIP.md` (product bump 6.72.1 → 6.72.2 with no grill/build/regress/verify/review).
   `pharn-dev-ship.md` Step 2 already says "On the first non-GREEN verdict, STOP"; nothing names delegation, and nothing
   at the PR reads a SHIP.md.
3. **SPEC (overflow) — dev review says floor-gate findings "block the increment".** `pharn-dev-review.md:99-101` and
   `:117`; `pharn-dev-ship.md:139-146` says nothing reads `REVIEW.md`, and `check-ship.mjs` has no review input. The
   review report cites `check-loop.mjs:48` for the product loop; the dev loop's helper is `.dev/floor/check-ship.mjs`
   (same property, "no `/pharn-dev-review` input") — the citation is the product twin's, the finding stands.

The report is right on all three; no non-bug is being fixed. `AskQuestion` renames are group S's.

## Design

### A — `/pharn-dev-verify` reads a runner stamp (`.claude/commands/pharn-dev-verify.md`)

Step 1 becomes three pinned lines, each its own Bash call (L44):

```bash
node pharn/floor/run-gates.mjs init --stage verify --feature <name> --base .dev/features --out pharn/.run/pharn-dev-verify/gates --gates "npm test::test,node pharn/floor/validate.mjs .::validate,npm run lint::lint,npm run format:check::format:check,npm run lint:md::lint:md"
node pharn/floor/run-gates.mjs run --next --out pharn/.run/pharn-dev-verify/gates --timeout-ms 570000   # once per Bash call (timeout 600000) until it exits 3
node pharn/floor/check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json --feature <name>
```

- The runner injects `instruction-growth` and `reconcile` (last, argv `check-bash-reconcile.mjs --base . --require-baseline`
  — the line the command runs today) and captures `aux.completeness` from
  `check-build-complete.mjs .dev/features/<name>/PLAN.md .`. So the dev verdict gains two rows it did not have:
  **INCOMPLETE** (exit 3 — a declared `## Files` path is missing) and **INCONCLUSIVE `gate-not-measured`** (a gate the
  runner killed at `--timeout-ms` or could not start). Both are the product twin's rows; both are STOPs in dev ship.
- A feature that ships an eval pair adds one token: `node pharn/floor/check-structural.mjs <expected> <actual> .::eval:<name>`
  (`--extra` cannot express it: it derives `<capDir>/findings.json`, and the one dev pair's actual lives in
  `.dev/features/trust-fence/`).
- Step 3's exits: 0 PASS · 1 FAIL · 2 INCONCLUSIVE (any refusal: unfinalized stamp, missing gate, tree changed between
  gates, a positional map passed with `--stamp`, an unmeasured gate) · 3 INCOMPLETE. `verify-report.json` = the checker's
  stdout verbatim (now with its `gate_run` block) + the advisory `verifiers` block.
- New sentence in Step 3: a gate value measured anywhere else (another tree, a clean copy, a re-run outside the runner) is
  never substituted; an environmental red is recorded as FAIL and the stage is re-run after the environment is fixed.

### B — `/pharn-dev-ship` (`.claude/commands/pharn-dev-ship.md`)

- Step 2 item 5 adds `"INCOMPLETE"` to the STOP set (`check-verify --stamp` can now return it).
- New paragraph after the Step 2 list, **"A STOP is a STOP — no delegated proceed"**: a delegated decision (a batch
  brief, an orchestrator) covers GATE 1 and GATE 2 only; it never turns a non-GREEN floor verdict into a proceed, and
  never substitutes a gate value or hand-edits a map. The only ways forward from a STOP are: fix the cause and re-run the
  stopped stage (a new verdict), re-plan, or abandon. An environmental red (load-timing tests) is re-run, both results
  recorded; a red that persists stays a STOP.
- Step 3's `SHIP.md` gains a **verdict block**, five lines, from one closed set (exported by `check-ship-record.mjs`):
  - `verdict-grill: exit <n>` | `verdict-grill: not-reached (<stage>)`
  - `verdict-build: exit <n>` | `verdict-build: not-reached (<stage>)` — `validate`'s exit
  - `verdict-regress: <no-regressions|regressions|inconclusive>` | `verdict-regress: not-reached (<stage>)`
  - `verdict-verify: <PASS|FAIL|INCONCLUSIVE|INCOMPLETE>` | `verdict-verify: not-reached (<stage>)`
  - `run-ended: GATE 2` | `run-ended: STOP <stage>` (`<stage>` ∈ `grill | build | regress | verify`)
    Under `--loop` the block carries the last iteration's verdicts.
- Guarantee audit gains one bullet: "a STOP is never proceeded past" → ADVISORY at the command, backstopped at the PR by
  `check-ship-record.mjs` (enum/regex over the committed record + the sibling report).

### C — `.dev/floor/check-ship-record.mjs` (new per-PR dev check)

`node .dev/floor/check-ship-record.mjs (--base-ref <ref> | --merge-base <ref>) [target]`, reusing
`check-surface-bump.mjs`'s `parseArgs`, `readBase` (the PR's net diff ∪ untracked) and `isProductSurface` — one path set,
one diff rule (L35).

- No product-surface path in the diff, or only the four human-only trusted docs → **GREEN** (an agent chain cannot write
  those through the guarded tools; requiring a chain record for a human edit would ask the owner to fabricate one).
- Records = diff paths `.dev/features/<slug>/SHIP.md` present at head (`<slug>` by `FEATURE_SLUG_RE`).
- Per record: a record with **no** block line is legacy/unstructured and is neither green nor red. A record with any
  block line must carry all five exactly once, each in the closed set, else **`RECORD_MALFORMED`**. A well-formed record
  that is not green (`run-ended: STOP …`, or any verdict other than grill/build `exit 0`, `no-regressions`, `PASS`) →
  **`RECORD_NOT_GREEN`**. A green record whose sibling `verify-report.json` is absent, unparseable, not `verdict: "PASS"`,
  not for this feature, or lacks the stamp path's `gate_run.stamp_sha256`, or whose `regression-report.json` is not
  `verdict: "no-regressions"` → **`REPORT_MISMATCH`**.
- At least one green, matched record is required → else **`NO_SHIP_RECORD`**.
- Exit 0 GREEN · 1 RED (the four above) · 2 input unusable (`BAD_USAGE`, `BASE_UNREADABLE`, `HEAD_UNREADABLE`, reusing
  surface-bump's meanings). One remedy per state (L27). Exported `REFUSAL_STATES`, `BLOCK_KEYS`, `parseBlock`,
  `judgeRecords` for the tests and the hygiene pin.
- Wiring: `package.json` `check:ship-record` (`--merge-base origin/main .`), a PR-only `ci.yml` step after the
  surface-bump step on the same `HEAD^1` base, `CONTRIBUTING.md` and `CLAUDE.md` name the third per-PR gate,
  `.dev/guides/floor-checks.md` gets its section. NOT in `npm run check` (it needs a base).

### D — `/pharn-dev-review` wording (`.claude/commands/pharn-dev-review.md`)

`:99-101` and `:117` say what is true: a floor-gate finding re-states a red that a floor check owns (`validate` at build,
the verify gates), and that check's own verdict is what stops `/pharn-dev-ship`; `REVIEW.md` itself is read by no checker
— the human (or a delegated GATE 2) reads it, and a blocking finding means the GATE 2 decision is "fix", not "merge".

**Correction after GATE 1, found by dogfooding A at verify (recorded, not hidden).** The approved `## Files` also named
this feature's `VERIFY.md`, `verify-report.json`, `REVIEW.md` and `SHIP.md`. Under A, verify's completeness capture
requires every concrete `## Files` path to exist, and those four are written by verify itself and the stages after it,
so the new verdict read INCOMPLETE before verify had run (`check-build-complete.mjs`: `missing` = exactly those four).
They were removed from `## Files`: each is written under its own stage's `--from-frontmatter` scope and is a reconcile
`pipeline_artifacts` member, so the build never needed them. 35 of 343 committed dev plans declare such artifacts; the
command now says not to (pharn-dev-verify.md Step 1), and the GATE 2 report names a `/pharn-dev-plan` follow-up.

**Second correction, same source.** The pinned `--timeout-ms 570000` (a foreground call under the Bash tool's 600 s
cap) cannot hold this repo's `npm test`: CI's `Test` step took 586 s (run 41514424884) and two dev verify attempts here
timed out at 570 s (`gate-not-measured`) with the host's load average at 50–140. The `run --next` line now runs with
the Bash tool's `run_in_background: true` and `--timeout-ms 3600000`; the GATE_RUN_WIRING timeout pin allows that for
a member marked `background` and requires the command to say so.

**Third correction, same source.** The third verify attempt measured `test` red (exit 1, not timed out): one test,
`run-gates.test.mjs` "resultsFile: null means NO PHARN_TEST_RESULTS variable", which reads the variable the runner
itself hands every gate (measured: red with `PHARN_TEST_RESULTS` set, green without). The `test` token is now
`env -u PHARN_TEST_RESULTS npm test::test`, pinned by `command-hygiene.test.mjs` with a mutant. `spawnGate` passing
an inherited `PHARN_TEST_RESULTS` through when `resultsFile` is null is product code, so it is reported, not changed.

## Files

- `.claude/commands/pharn-dev-verify.md` — Steps 1/3/4: runner + `check-verify --stamp`, INCOMPLETE, no substitution — dev command
- `.claude/commands/pharn-dev-ship.md` — STOP rule, INCOMPLETE stop, SHIP.md verdict block, audit bullet — dev command
- `.claude/commands/pharn-dev-review.md` — floor-gate "block" wording — dev command
- `.dev/floor/check-ship-record.mjs` — new per-PR checker — dev floor
- `.dev/floor/check-ship-record.test.mjs` — its tests, incl. the CI/npm wiring pins — dev floor
- `.dev/floor/dev-verify-stamp.test.mjs` — new: executes pharn-dev-verify.md's committed `check-verify` line against hand-edited maps — dev floor
- `.dev/floor/command-hygiene.test.mjs` — pins for A (`--stamp`, no `results.json`), B (STOP rule, INCOMPLETE, block closure) and D — dev floor
- `.dev/guides/floor-checks.md` — `check-ship-record.mjs` section — dev guide
- `.dev/guides/floor-gates.md` — the "dev twins are byte-identical" line: dev verify now reads a stamp — dev guide
- `package.json` — `check:ship-record` script — repo meta
- `.github/workflows/ci.yml` — PR-only "Dev-chain record check" step — CI
- `CONTRIBUTING.md` — the third per-PR check — repo meta
- `CLAUDE.md` — "Two per-PR gates" → three — repo meta
- `CHANGELOG.md` — `[Unreleased]` entries (Changed / Added) — repo meta
- `.dev/features/dev-verdict-discipline/GRILL.md`
- `.dev/features/dev-verdict-discipline/REGRESSION.md`
- `.dev/features/dev-verdict-discipline/regression-report.json`

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — consumed as-is (the stamp `run-gates.mjs` writes and `check-verify --stamp` validates); no contract changes.
- `pharn/pharn-contracts/verify-report.md` — the dev `verify-report.json` gains the `gate_run` block the stamp path already emits.
- `pharn/pharn-contracts/finding-shape.md` — `REVIEW.md` / `GRILL.md` findings, unchanged.

## Evals / tests to write (P1 — no Capability changes, so no eval cases; tests instead)

- `check-ship-record.test.mjs`: one fixture per refusal state over a scratch git repo (base commit → head diff): product
  path + no record → `NO_SHIP_RECORD`; partial / repeated / out-of-set line → `RECORD_MALFORMED`; `run-ended: STOP verify`
  and `verdict-verify: FAIL` → `RECORD_NOT_GREEN`; green record with sibling report `FAIL` / no `gate_run` / missing →
  `REPORT_MISMATCH`; green record + matching reports → GREEN; only a trusted doc changed → GREEN; no product path →
  GREEN; legacy record alongside a green one → GREEN, legacy alone → `NO_SHIP_RECORD`; bad usage / unreadable base → 2.
  The scanner-redos-sweep-2 shape (product path + a record whose verify line reads FAIL) is a named case. Every
  REFUSAL_STATES member is produced by ≥1 case (closure over the set, L29). Wiring: npm script and ci.yml step pinned as
  strings, the step's `if:` is PR-only and not disabled.
- `dev-verify-stamp.test.mjs`: extract the committed `check-verify` line from pharn-dev-verify.md, substitute `<name>`, run
  it against (a) a clean stamp → PASS, (b) the old flat `{gate: exit}` map → refused, (c) a stamp with the failing run
  deleted → `coverage-violation`, (d) a stamp with one run spliced from another tree → `tree-changed-between-gates`,
  (e) the positional map passed beside `--stamp` → refused. A negative control runs the pre-change positional line over
  (b) and shows it would have read PASS.
- `command-hygiene.test.mjs`: pharn-dev-verify.md's verdict line carries `--stamp` and no `results.json`/`printf` assembly
  remains; dev ship names INCOMPLETE as a STOP and carries the no-delegated-proceed sentence; every block-key member is
  named in pharn-dev-ship.md and every back-ticked block spelling parses under `parseBlock` (closure, L36); each rule has
  a mutant that it catches.

## Guarantee audit (P0)

- "dev verify's verdict is computed over the runner's stamp" → floor: enum/regex (`validateStamp`: finalized, coverage,
  fingerprint chain, reconcile last) — given the command runs the pinned line (ADVISORY). Bound, stated in the command:
  internal consistency, never provenance — a self-consistent fabricated stamp passes (L43; `check-verify.mjs` NOTE).
- "a hand-assembled or partially substituted map is refused" → floor: enum/regex over the stamp shape; true for the
  recorded shapes (flat map, dropped gate, run from another tree), not for a deliberate rewrite of `stamp.json`.
- "a non-GREEN verdict is never proceeded past" → ADVISORY (command discipline), backstopped at merge time by
  `check-ship-record.mjs` — which is itself bounded: it reads committed records and reports, so it proves a green record
  is present and agrees with its report, never that the chain ran; an admin merge bypasses required checks; a multi-feature
  PR passes on one green record while a legacy (block-less) record rides along.
- "the SHIP.md verdict block is well-formed" → floor: enum/regex (`parseBlock`), at PR time only.
- "`REVIEW.md` gates nothing mechanically" → true by construction (no checker reads it); restated in pharn-dev-review.md.

## Trust audit (P2)

- `SHIP.md` and the two report JSONs are PR-controlled text read by a CI checker: parsed line-anchored with fixed regexes
  (no regex built from input), JSON read with own-property tests, every quoted value through `quote()` (L62). No value
  is executed or interpolated into a command; the verdict reads only enum members and ints.
- The gate logs the runner writes are untrusted free text, reduced to sha256 by the runner; no verdict reads them.

## Decisions taken (for GATE 1)

1. **Exempt the four trusted docs** from the record requirement (human-only paths). Alternative: no exemption, so a
   human-only LIMITS fix also needs a dev-chain record.
2. **Lenient on legacy records** (no block line → ignored; ≥1 green record required). This keeps the batch's final PR
   GREEN while other workers' SHIP.md files predate the block. Alternative: every SHIP.md in a product-surface PR must
   carry a green block (stricter; the final batch PR would need every worker's SHIP.md updated).
3. **`check-ship.mjs` (`--loop`) unchanged**: its verify set has no `INCOMPLETE`, so an INCOMPLETE verify under `--loop`
   stops INCONCLUSIVE (fail-closed). No recorded need for an INCOMPLETE → CONTINUE row (P7).
4. **`/pharn-dev-regress` unchanged** (positional map): the finding names verify only.

## Open questions (HALT)

- None blocking; the four decisions above are recommendations for the orchestrator to confirm or flip at GATE 1.
