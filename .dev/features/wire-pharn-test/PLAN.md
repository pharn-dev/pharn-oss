# PLAN — wire-pharn-test

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L5, L19, L22, L29, L30, L34, L35, L45, L52, L58]
- increment: Put `/pharn-test` into both orchestrated chains between `/pharn-grill` and `/pharn-build`, and make the order enforced rather than narrated — one new checker, `check-test-stage.mjs`, answers "did the test stage complete for this SPEC and PLAN?", and `/pharn-build`, `/pharn-ship`, `/pharn-loop` and `check-loop-fresh.mjs`'s front check all read it.
- layer(s): the product floor (new `check-test-stage.mjs`, `check-loop-fresh.mjs`, `render-ship-briefing.mjs`, `check-ship-briefing.mjs`), pharn-contracts (`ac-tests.md`, `ship-briefing.md`), the product `.claude/` surface (`pharn-build.md`, `pharn-ship.md`, `pharn-loop.md`, `pharn-test.md`), repo meta.
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

Measured on branch `wire-pharn-test` off `main` = `927cd6b` (`SKILLS_VERSION` 6.18.0; items 01–04 merged as PRs 256,
257, 258 and 261, plus #259 6.17.1 and #260 L59 from another session).

1. **"S2 resumes existing dirs" is false for `/pharn-loop`.** S2 always takes a FRESH directory (`<slug>-2`, …) and
   never reuses one, and `/pharn-spec` always fills the template, so a loop run cannot meet a legacy SPEC. The
   legacy branch is kept anyway — the new checker handles it for free — and it is reachable under `/pharn-ship`,
   whose `/pharn-spec` may refresh an existing legacy SPEC and keep it legacy (`spec-template.md`, "Opt-in").
2. **The loop never re-runs plan or grill.** `check-loop-fresh.mjs` offers a RERUN only for `verify` and `regress`;
   every front failure (check I) is a STOP `front-stage-red`. And `/pharn-test` cannot be re-run after the build
   by construction: the implementation now exists, so its red run would read `ac-test-passes-before-build`. So
   stale test evidence found after the front is a **STOP** (`front-stage-red`, naming `/pharn-test`), never a
   re-run. The brief's "re-run offered" is answered by that named stop plus the remedy it prints.
3. **`check-loop-decision.mjs` enumerates no stage.** Its blocked-stop exemption keys on `decision: INCONCLUSIVE`
   plus a `blocked` key of any value, so `blocked: no-test-runner` is covered with no change (confirmed by reading).
4. **`scan-installed-skills.mjs` does not enumerate the chain.** Its header names the three stages that read its
   roster (`/pharn-build`, `/pharn-grill`, `/pharn-review`); `/pharn-test` does not, so it is unchanged.
5. **`render-ship-briefing.mjs` enumerates stage VERDICTS** (grill, regress, verify), which is the chain
   enumeration the brief means; the test stage joins it (decision g).
6. **Step 6c's staging list does not stage the AC tests.** Item 03 added `AC-TESTS.md`, but not the lock or the test
   files, which are outside PLAN.md `## Files` by design — so a `STOP_GREEN` commit would today omit them.

## Decisions for the options halt (approved under the overnight delegation — see SHIP.md)

a. **`ship-outcome-core.mjs` `VERDICT_STAGES` stays {regress, verify}** (the brief's recommendation). The red run
is a precondition of the build, not a verdict on it; `gate2` means "the build's verdicts passed", and a run that
stopped at the test stage already reads `stop:pharn-test` from its last stage-start marker.

b. **One checker owns "the test stage completed": `pharn/floor/check-test-stage.mjs <name> [--base <dir>]`.** It
SHELLS the three existing checkers (P3 — never re-derives them): `check-ac-tests.mjs --spec` decides the mode;
templated → `check-ac-tests.mjs` full (the mapping still agrees with the current SPEC and PLAN — this closes item
03's stated bound that a PLAN edit after `/pharn-test` reopened `in-plan-files` until something re-checked) then
`ac-tests-lock.mjs --check <name> --require-red-run`; bootstrap → `ac-tests-lock.mjs --check <name>
--require-red-run --allow-bootstrap`; legacy with no AC-TESTS.md → not applicable. First line is a closed token:
`READY test-first` | `READY bootstrap` | `NOT-APPLICABLE legacy-spec` (exit 0) or `RED <reason>` (exit 1) with
`<reason>` ∈ {`spec-unusable`, `no-mapping`, `mapping-red`, `no-lock`, `lock-red`, `lock-unusable`,
`legacy-with-mapping`}; exit 2 unusable (bad usage). The branch on the mode lives in tested code, not in three
commands' prose (L22/L35).

c. **`/pharn-build` refuses without it** — a new Step 2a after the chain gate, the same kind of precondition: exit 0
→ proceed (the token goes into `BUILD.md`); non-zero → HALT, naming the reason and the remedy (`/pharn-test`, or
`/pharn-plan` for `no-mapping`/`mapping-red`). Read-only, so its place after Step 0's anchor interleaves nothing.

d. **`/pharn-ship`**: a new stage 3b `/pharn-test <name>` between grill and build, marked `--stage pharn-test`, its
verdict read = `check-test-stage.mjs` exit 0. `/pharn-test` asks interactively on no runner; the chain STOPs either
way. SHIP.md records the token (`ac-tests: test-first` / `bootstrap` / `not-applicable (legacy spec)`).

e. **`/pharn-loop`**: the front becomes plan → grill → test (`/pharn-test <name> --unattended`), marked. New row
**S12** — `/pharn-test` prints `blocked: no-test-runner — …` → stop `blocked: no-test-runner`, the printed
suggestion copied into the record's `## Handoff` `### next_steps` as DATA; every other `/pharn-test` refusal is
**S9** `stage-refused`. `check-loop-fresh.mjs` check I (`--front`) adds `check-test-stage.mjs`: non-zero → STOP
`front-stage-red` (decision 2 above). The record's `## Outcome` gains `ac-tests:` (the token). Step 6c stages
`AC-TESTS.lock.json` and the lock's own `files[].path` (the pinned tests), read from the lock the gate just checked —
no second `## Files` parser (L35).

f. **Marks and routing**: each command marks `stage-start --stage pharn-test` and an `orchestrator` return
(`PHASE_MARKER_WIRING` gains the stage for both commands, not iterated). `check-model-config.mjs` already maps
`ac-test` → `pharn-test.md`; the per-stage routing bound (turn scope — a stage run inside `/pharn-ship` or
`/pharn-loop` gets no per-stage model) is unchanged and stated.

g. **The GATE-2 briefing** gains `ac_tests_mode` — a verbatim copy of `AC-TESTS.lock.json`'s `mode`
(`test-first` | `bootstrap`), else `n/a` — and a `test` row in `## Verdicts`. `check-ship-briefing.mjs`
cross-verifies it against the live lock when present; it is OPTIONAL in the envelope so every briefing rendered
before 6.19.0 still checks. `briefing_contract_version` → `0.2.0`.

## Files

- `pharn/floor/check-test-stage.mjs` — NEW: the test-stage gate — product floor
- `pharn/floor/check-test-stage.test.mjs` — NEW — floor test (apparatus)
- `pharn/floor/check-loop-fresh.mjs` — check I runs the test-stage gate — product floor
- `pharn/floor/check-loop-fresh.test.mjs` — check I cases — floor test (apparatus)
- `pharn/floor/render-ship-briefing.mjs` — `ac_tests_mode` + the `test` row — product floor
- `pharn/floor/render-ship-briefing.test.mjs` — floor test (apparatus)
- `pharn/floor/check-ship-briefing.mjs` — cross-verify `ac_tests_mode` — product floor
- `pharn/floor/check-ship-briefing.test.mjs` — floor test (apparatus)
- `pharn/pharn-contracts/ship-briefing.md` — the new field — pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — wired; the build gate; the loop's staleness — pharn-contracts
- `.claude/commands/pharn-build.md` — Step 2a, the test-stage gate — product command
- `.claude/commands/pharn-ship.md` — the test stage; description, chain, gates, SHIP.md — product command
- `.claude/commands/pharn-loop.md` — the front, S12, Outcome line, staging list, description — product command
- `.claude/commands/pharn-test.md` — no longer standalone — product command
- `.dev/floor/command-hygiene.test.mjs` — `STUCK_POINTS` + S12, `PHASE_MARKER_WIRING` + pharn-test, the executed
  test-stage lines — floor test (apparatus)
- `.claude/commands/pharn-spec.md` — (amended after grill, G3) the spine string — product command
- `.claude/commands/pharn-plan.md` — (amended after grill, G3) the spine string — product command
- `.claude/commands/pharn-grill.md` — (amended after grill, G3) the spine string, "before `/pharn-test`" — product
  command
- `.claude/commands/pharn-regress.md` — (amended after grill, G3) the spine string and ordinal — product command
- `.claude/commands/pharn-verify.md` — (amended after grill, G3) the spine string and ordinal — product command
- `README.md` — the pipeline (diagram, commands table, AC section); badge; `CURRENT-STATE` bytes from
  `npm run docs:generate` (a Bash write, declared — L19) — repo meta
- `docs/capabilities/README.md` — only if `docs:generate` rewrites it — generated
- `CLAUDE.md` — the spine and the chain descriptions — repo meta
- `pharn/features/README.md` — the spine string — product doc
- `.dev/features/wire-pharn-test/PROTECTED-FOLLOWUPS.md` — the `ARCHITECTURE.md` §6 spine — dev artifact
- `SKILLS_VERSION` — 6.18.0 → 6.19.0 (MINOR) — repo meta
- `CHANGELOG.md` — `## [6.19.0] - <date>` — repo meta

### Not written by the build

- `ship-outcome-core.mjs` (decision a), `check-loop-decision.mjs`, `scan-installed-skills.mjs` (record items 3–4).
- The verify AC gate and item 04's bootstrap evidence at verify — item 06.

## Amended after grill (2026-09-24)

An inline grill (3 concerns) and an independent read-only agent (11 findings: 2 blocking, 4 important, 5 minor) ran.
Every finding is adopted; decisions a–g stand as amended here.

- **G1 (blocking) — a bootstrap SPEC with an old test-first lock read `READY bootstrap`.** `check-test-stage` reads
  the lock's `mode` (an `ac-tests-lock/1` lock is test-first by definition) and REDs a new reason,
  `lock-mode-mismatch`, unless it matches the SPEC's mode: bootstrap needs `bootstrap`, templated needs
  `test-first`. Tested both ways, plus a `/1` lock.
- **G2 (blocking) — deleting `spec_template` (outside the pin) plus both files reads NOT-APPLICABLE.** A legacy SPEC
  beside a mapping OR a lock is already RED. `/pharn-loop`, whose `/pharn-spec` always fills the template, accepts
  only `READY *`: `NOT-APPLICABLE` there is S9. `/pharn-build` and `/pharn-ship` still accept it (a legacy feature
  from before 6.14 must stay buildable), and the remaining bound — both files deleted and the key removed — is
  stated in the build's audit and in `ac-tests.md`. Extending the pin to `spec_template` would move every existing
  approved templated pin, so it is not done.
- **G3 — enumerations.** The spine gains `test` in EVERY command that restates it (spec, plan, grill, regress,
  verify, added to Files) and the ordinals renumber (build fifth, regress sixth, verify seventh, ship eighth,
  "stages 1–7"); `PROTECTED-FOLLOWUPS.md` records the matching `pharn/ARCHITECTURE.md` §6 edit.
- **G4 — in-flight features.** Behaviour, not shape: no install breaks and no contract or frontmatter changes shape,
  so MINOR by this repo's rule — argued in the CHANGELOG. Newly refused: a templated feature planned before 6.17.0
  (`no-mapping`), tested under 6.17.0 (a `/1` lock has no red run), or planned but never through `/pharn-test`. The
  remedy is in the build's HALT and the CHANGELOG; a feature already partly built without `/pharn-test` must revert
  the implementation before `/pharn-test`, because its red run would read `ac-test-passes-before-build`.
- **G5 — S12 must not rest on relayed text.** When `check-test-stage` is non-zero after `/pharn-test`, the loop runs
  `check-red-run.mjs --preflight` ITSELF (a pinned line): exit 1 → S12, its last line copied into `### next_steps`;
  anything else → S9. The line is executed by the hygiene suite (L45).
- **G6 — Step 6c must not drop a pinned test.** The builder adds the lock and every `files[].path`; a lock path that is
  not a regular, non-ignored file exits 4 → `not committed: stage failed`.
- **G7 — the briefing field** is required from 0.2.0 (already so), compared both ways (equality with the live read),
  `n/a` for a `/1` lock, and the contract labels it the RECORDED mode, not a verdict.
- **G8 — exit mapping.** A full `check-ac-tests` exit 2 is `mapping-red` (the RED line says the input was unusable);
  `no-lock` is decided by `lstat` (a dangling link is present, then `lock-unusable`); children inherit the caller's
  cwd, never a chdir.
- **G9 — check I's STOP quotes the lock's own RED line** (it names the path) and names the real remedy — a re-plan
  or a human — since a mutating gate (an inline snapshot, `eslint --fix`) can rewrite a pinned test.
- **G10 — `/pharn-build` runs the gate BEFORE its scope set and anchor** (Step 0, read-only), so a refusal leaves no
  scope or epoch behind.
- **G11 — a bound, stated:** an abandoned loop run leaves its `AC-TESTS.md` and tests; a retry in `<slug>-2` then
  REDs `claimed-elsewhere` at `/pharn-plan` until a person removes them.

## Evals to write (P1)

No Capability. Suites, each refusal one mutation of a GREEN world (L34/L52): `check-test-stage` — READY test-first
(a mapping, a lock with `red_run`), READY bootstrap, NOT-APPLICABLE legacy, and each RED reason (`no-mapping`,
`mapping-red` via a PLAN that now names a test file, `no-lock`, `lock-red` via no `red_run` and via an edited test,
`lock-unusable`, `legacy-with-mapping`, `spec-unusable`), plus bad usage; `check-loop-fresh` check I — a templated
feature with a GREEN lock is FRESH, a lock without `red_run` or an edited test STOPs `front-stage-red`; the briefing
— the field for each mode and `n/a`, the cross-check stale case, and an older briefing without the field still
GREEN; hygiene — S12 in the table, the pharn-test marks in both commands, and the pinned `check-test-stage.mjs`
lines EXECUTED from each command (L45).

## Guarantee audit (P0)

- "`/pharn-build` does not build without the test stage" → FLOOR verdict (`check-test-stage.mjs`: enum membership +
  the content-hash checks it shells), obeyed by command discipline (advisory — a model can skip the step, L5/L30).
- "stale test evidence stops the loop" → FLOOR (`check-loop-fresh.mjs` check I), at the decision and the commit gate.
- "the commit holds the pinned tests" → the staging builder reads them from the lock the gate verified; the builder
  is command prose (advisory), its input is floor-checked.
- Bounds carried forward: a Bash write bypasses the write hooks; the lock certifies agreement, not provenance.

## Trust audit (P2)

`/pharn-test`'s printed suggestion is built from closed-set values only (item 04), yet it is quoted in the record
as DATA. Lock paths are read from a lock `--check` just verified; the builder stages them as literal paths
(`GIT_LITERAL_PATHSPECS=1`), as it does the plan's.

## Determinism audit (P5)

Every new branch reads an exit code or a closed token: the mode, the reason, S12's line prefix.

## Applied lessons

- L5 / L30 — the gate a step asks for is the one that gets skipped, so the build refuses on the checker's exit, and
  the loop re-checks the same evidence at the decision and the commit gate rather than trusting the front ran.
- L19 — `docs:generate` and the staging builder are Bash writes, declared.
- L22 — every new invocation is a pinned line, never a described technique.
- L29 / L52 — the enumerations (stuck points, phase markers, staging artifacts, briefing fields) each gain the
  member in the same edit, and each is tested over every member.
- L34 — `check-test-stage` never reads "no AC-TESTS.md" as GREEN for a templated SPEC.
- L35 — one checker owns the mode branch; the staging builder reads the lock rather than a second parser.
- L45 — the pinned `check-test-stage.mjs` lines are executed by the hygiene suite.
- L58 — the lock is bound to the TESTS, which must not change after the red run, while the implementation the build
  writes is outside it; the post-build re-check asks exactly the part that may not change.

## Open questions (HALT)

None. Decisions a–g are the options halt, approved under the overnight delegation (recorded in SHIP.md).
