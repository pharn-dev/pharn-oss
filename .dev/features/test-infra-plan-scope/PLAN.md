# PLAN — test-infra-plan-scope

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L35, L36, L37, L39, L47, L50, L52]
- increment: Keep the 6.20.0 test-infrastructure pin out of the build's reach at PLAN time — a new `check-ac-tests.mjs` RED kind `test-infra-in-plan` for a root runner config in PLAN.md `## Files` (an advisory NOTE for `package.json` / `pharn.config.json`), a case-folded runner-config name match, the two false "a rebuild passes" claims corrected, and `/pharn-test`'s no-runner question offering only `/pharn-ship` — fixing three verified review findings (MINOR 6.21.0).
- layer(s): the product floor (`pharn/floor/test-infra-core.mjs`, `pharn/floor/check-ac-tests.mjs` + suites), pharn-contracts (`ac-tests.md`), three product commands (`pharn-plan.md`, `pharn-build.md`, `pharn-test.md`), repo meta (CHANGELOG, SKILLS_VERSION, README badge, CLAUDE.md).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (the three findings, measured on `main` = `7bcd7a8`, SKILLS_VERSION 6.20.5)

Every repro below was re-run against THIS worktree's floor (the review's scripts re-pointed with `sed`, originals
untouched), not taken from the review's text (P6).

1. **CONFIRMED — the pin is reachable by the build, and two shipped sentences say it is not.**
   `pharn/pharn-contracts/ac-tests.md:279-280` ("It passes on a rebuild: the lock pins only the AC tests, and the
   mapping check reads SPEC, PLAN and AC-TESTS.md, none of which the build may write") and
   `.claude/commands/pharn-build.md:115-116` (same claim) are false since 6.20.0: the lock's `test_infra` also pins
   every ROOT runner config matching `CONFIG_NAME_RE` (`pharn/floor/test-infra-core.mjs:49-50`) and the level gates'
   `package.json` script values (+ `pre`/`post`) and `testResults` formats. Nothing at plan time refuses or warns
   (`check-ac-tests.mjs` KINDS has no such kind; `pharn-plan.md` Step 4c has no such rule). Repro
   (`review/a3/infra-repro.mjs`): a PLAN naming `src/demo.js` + `vite.config.ts` → `check-ac-tests` **exit 0 GREEN**;
   `ac-tests-lock --write` pins `vite.config.ts`; the build's in-scope edit → `--check` **exit 1** "vite.config.ts:
   the runner config changed"; `check-test-stage` **exit 1 `RED lock-red`**. At `/pharn-verify` that is
   `test-infra-changed` (EVIDENCE → `ac-evidence` → FAIL → `/pharn-loop` S13), and the prescribed remedy (set the
   build aside, re-run `/pharn-test`, rebuild) re-pins the old config and the rebuild edits it again — so a feature
   that must change a root runner config has no path to green through `/pharn-loop`, and through `/pharn-ship` only
   by a human who knows to split it.
2. **PLAUSIBLE, mechanism verified live — a case-variant config is loaded but never pinned.** `CONFIG_NAME_RE` is
   lowercase-only and tested against raw `readdirSync` names (`test-infra-core.mjs:151`). Repro
   (`angleE/repro5-case-config.mjs`): add `Vitest.config.ts` after the pin → `configs` `[]` before AND after,
   `diffTestInfra` **`[]`**, while `existsSync(<root>/vitest.config.ts)` (the lookup vite/vitest do) is **true** on
   this APFS volume. The review measured real vitest 5.0.1 loading such a file (`include: ["nomatch/**"]`,
   `passWithNoTests` → no tests run, exit 0). `test-infra-core.test.mjs:171` asserts `VITEST.CONFIG.TS` is NOT a
   member, deliberately; this plan reverses that deliberately.
3. **CONFIRMED — `/pharn-test` offers a route that cannot run.** `.claude/commands/pharn-test.md:132-133` asks "Run
   a test-setup increment first via `/pharn-ship` or `/pharn-loop`?". Repro (`review/a3/loop-repro.mjs`): a
   `spec_kind: test-infra` SPEC with a bootstrap lock → `check-test-stage` `READY bootstrap` (exit 0), but with
   `--require-test-first` (what `pharn-loop.md:314` passes) → **`RED mode-not-allowed`** (exit 1); and
   `pharn-spec.md:225` never approves a `test-infra` Draft under `--model-approve`. `red-run-core.mjs` `blockedLine`
   already suggests `/pharn-ship` only; the interactive prose disagrees with it.

## Decisions (proposed — confirm or correct at GATE 1)

- **D1 — one predicate for "a path the pin covers", in `test-infra-core.mjs` (P3: it changes when what counts as
  test infrastructure changes).** Export `isRunnerConfigName(name)` = `CONFIG_NAME_RE.test(foldName(name))` and use
  it at all three sites that today test `CONFIG_NAME_RE` directly: the root listing in `computeTestInfra`, the shape
  check in `pinShapeError`, and the new plan-time classifier. Export `testInfraPathKind(scoped)` → `"config"` (a
  root-level name, i.e. no `/`, that `isRunnerConfigName` accepts) | `"manifest"` (a root-level name whose fold is
  `package.json` or `CONFIG_FILE` = `pharn.config.json`, the two files the pin reads values from) | `null`. The
  manifest names become one frozen `PIN_MANIFESTS` list, and `readScripts` reads `package.json` through the same
  constant, so the name the pin reads and the name the plan check tests are one copy (L35).
- **D2 — the plan-time check is a new RED kind, `test-infra-in-plan`, in `check-ac-tests.mjs`** (KINDS stays
  sorted; the kind goes between `spec-kind` and `unknown-ac`). For every PLAN.md `## Files` entry, take
  `scopedPath` (the setter's `clean` + `isConcrete` — exactly what `--from-plan` would scope, L39) and RED when
  `testInfraPathKind` is `"config"`. The detail names the path (bounded by `shown()`, P2) and the remedy: put the
  runner/config change in a `spec_kind: test-infra` increment first (via `/pharn-ship`), then plan this feature.
  **Why a RED and not a warning:** every write the build can make to that path changes the pinned bytes (or adds a
  pinned file), so a GREEN would certify a plan whose own build must read `test-infra-changed` — there is no
  in-plan way through. It applies only to a `feature` SPEC with a mapping: `checkMapping` already returns early for
  a legacy or `test-infra` SPEC, so the bootstrap increment that IS the remedy may name the config freely.
  **No path normalization beyond the setter's:** `./vite.config.ts` or `a/../vite.config.ts` is NOT flagged,
  because the write guard matches a scope entry as a literal glob against the target's root-relative path
  (`enforce-writes-scope.cjs` `globToRegExp` + `rel`), so such an entry does not let the build write
  `vite.config.ts` at all. **Probed at plan time, not read off the hook (L37)** — the real setter `--from-plan`
  then the real enforcer, in a fresh `git init` root holding `vite.config.ts` (enforcer exit for a Write to
  `vite.config.ts` / to `Vite.config.ts`): entry `vite.config.ts` → **0** / 2; `vite.config.ts (new)` → **0** / 2;
  `Vite.config.ts` → 2 / **0** (and on APFS that write lands in the existing `vite.config.ts` — hence the fold);
  `./vite.config.ts` → 2 / 2; `*.config.ts` → 2 / 2 (the setter dropped it: 1 path); `web/vite.config.ts` → 2 / 2.
  So exactly the entries the kind flags are the ones that open the file to the build. The ★ HOOK test repeats
  the first and fourth rows.
- **D3 — `package.json` and `pharn.config.json` in PLAN.md: an advisory NOTE, never a RED, plus a stated bound.**
  The checker can see that PLAN.md names the file; it cannot see WHICH part the build will change. A dependency
  added to `package.json` is a legitimate build change the pin deliberately ignores (it pins the level gates'
  script values, not the manifest), so refusing the file would block ordinary features with no correct remedy. So
  `checkMapping` returns `notes` alongside `findings`, and the CLI prints one `NOTE — …` line per such entry (exit
  code unaffected, on the GREEN and the RED path alike): the build may change it, but not the level gates'
  scripts, their `pre`/`post` scripts or the `testResults` formats — that reads `test-infra-changed` at
  `/pharn-verify`. Stated in the contract as what the checker cannot see.
- **D4 — the name match is folded (finding 2), deliberately reversing `test-infra-core.test.mjs:171`.** Why: to the
  runner on a case-insensitive volume `Vitest.config.mjs` IS `vitest.config.mjs` (vite/vitest look the lowercase
  name up with an existence check), and the repo already folds for APFS with the same function everywhere a path's
  identity matters (`scopeKey`, 6.20.5; the write guard's `toKey`). `foldName` (NFC + full case folding) rather than
  a regex `i` flag, so `ſ` and NFD spellings fold the way `scopeKey` folds them. **Consequence for an existing
  `/3` lock, stated in the CHANGELOG and the contract:** a case-variant config that sat at the root when the lock
  was written was not pinned then and is now recomputed → `<path>: a runner config was added` → `lock-red` /
  `test-infra-changed`. Fail-closed; remedy as for any pin change (set the build aside, re-run `/pharn-test`).
  Rare: it needs a runner config whose name is not lowercase. **Bound:** the fold is the modelled equivalence — a
  name the filesystem folds beyond it is not caught (fail-open), one it folds beyond the filesystem is pinned
  anyway (fail-closed, over-reports), exactly as `ac-tests.md` already states for `scopeKey`. The recorded `path`
  stays the on-disk spelling, so a case-only rename reads gone + added (fail-closed).
- **D5 — correct the two false sentences (L47: change FORM, not only value).** Not "the lock pins the AC tests and
  X" as a new closed list: the rebuild bullet says the gate passes on a rebuild **that stayed out of what the lock
  pins**, names where that list lives (the pin section, one copy — L35), and says which part the plan check keeps
  out of the build's scope (the tests: `in-plan-files`; a root runner config: `test-infra-in-plan`) and which it
  cannot (`package.json` scripts, `pharn.config.json` `testResults` — D3). `pharn-build.md` cites the contract and
  adds the instruction: never change the level gates' scripts, their `pre`/`post` scripts, `testResults` or a root
  runner config, even when PLAN.md names the file.
- **D6 — `/pharn-plan` Step 4c wiring.** One bullet in step 2's list: the test infrastructure stays out of PLAN.md's
  `## Files` too, why (the pin, S13), the RED kind, the split-first remedy, and the manifest NOTE. Step 3's RED
  handling names `test-infra-in-plan` beside `in-plan-files` (both are fixed in PLAN.md), and the guarantee-audit
  line gains the new floor claim.
- **D7 — finding 3: offer only `/pharn-ship`.** `pharn-test.md`'s interactive question offers a `spec_kind:
test-infra` increment via `/pharn-ship`, and says why not `/pharn-loop` (it never approves such a SPEC and reads
  the test stage with `--require-test-first`, which refuses a bootstrap lock). A test in
  `check-red-run.test.mjs` pins that the interactive offer and `blockedLine`'s `suggested:` name the same single
  command — two statements of one fact that must both exist (the interactive and the unattended branch), so they
  are pinned rather than merged (L35's question asked first: yes, the second copy must exist).
- **D8 — bump: MINOR, 6.20.5 → 6.21.0.** Argued below; `MIN_CLI` stays 0.5.0 (no installed path moves).

### The bump-size argument (D8)

- **By the letter of CLAUDE.md** — patch = a correction to shipped bytes; minor = a newly shipped capability,
  command or checker; major = a breaking SHAPE change (a contract / finding-shape / frontmatter change that
  invalidates existing installs). Findings 2's code change and all of the prose are patches; the new RED kind is a
  new check, so the release is at least minor. Nothing changes shape: the lock stays `ac-tests-lock/3` and
  `pinShapeError` only WIDENS (every lock valid before stays valid), AC-TESTS.md's grammar is unchanged, exit codes
  are unchanged, and `KINDS` gains one member of a RED-kind enum that no consumer branches on by name
  (`check-test-stage.mjs` maps any `check-ac-tests` exit 1 to `mapping-red`; the commands read exit codes).
- **The precedent conflict, faced.** `[3.0.0]` (sub-check D) and `[4.0.0]` (the reconcile gate) were versioned
  MAJOR against that letter "because it can RED a previously-green run" — both entries say so in words. `[6.19.0]`
  and `[6.20.0]` went MINOR while REDding previously-green runs too (6.19.0 refused `/pharn-build` for features
  planned before 6.17.0: "What changes is a precondition"; 6.20.0's AC gate FAILs verify runs that passed under
  6.19). The two most recent precedents are in THIS subsystem (the AC-evidence pipeline), and they settled on the
  letter.
- **What actually turns red, measured by the repro, not assumed.** A PLAN naming a root runner config whose build
  then edits it was ALREADY unable to reach green: verify reads `test-infra-changed`, an EVIDENCE reason that no
  rebuild clears (`/pharn-loop` S13). The new kind moves that inevitable failure from after the build to plan
  time, where it costs one PLAN edit. The only run it turns red that could previously have gone green is a PLAN
  that over-declares a config the build never touches — fixed by deleting one line. Finding 2's fold REDs only a
  tree holding a case-variant config the runner actually loads, i.e. a tree whose previous GREEN was unsound.
- **So MINOR, 6.21.0**, on the letter plus the two in-subsystem precedents; the 3.0.0/4.0.0 reading is recorded
  here so the approver can overrule it (it would make this 7.0.0).

## Files

- `pharn/floor/test-infra-core.mjs` — `isRunnerConfigName` (folded), `PIN_MANIFESTS`, `testInfraPathKind`; the listing and `pinShapeError` use the one predicate; header: the fold, the plan-time reuse, the "does not catch" list amended (D1, D4).
- `pharn/floor/test-infra-core.test.mjs` — the name set folded (case variants, `ſ`, NFD are members; the non-members stay non-members); a case-variant config added after the pin is diffed as added (the repro); `testInfraPathKind` over root/nested/annotated/`./`-led/manifest entries; ✧ closure: `CONFIG_NAME_RE.test(` appears once in the module and nowhere in `check-ac-tests.mjs`; a pin recording a case-variant path is shape-valid.
- `pharn/floor/check-ac-tests.mjs` — KINDS + `test-infra-in-plan`; `checkMapping` returns `notes`; the CLI prints them; header (D2, D3).
- `pharn/floor/check-ac-tests.test.mjs` — `onlyKind` for `test-infra-in-plan` (exact, case variant, annotated); nested / glob / `./`-led entries stay GREEN; `package.json` / `pharn.config.json` → exit 0 + one NOTE each; a bootstrap SPEC's PLAN naming a config is not this kind; ★ HOOK: the real setter + enforcer ALLOW a Write to `vite.config.ts` from a PLAN naming it (so the RED is load-bearing) and deny it from `./vite.config.ts`.
- `pharn/floor/check-test-stage.test.mjs` — the review's scenario end to end: a PLAN naming `vite.config.ts` → `RED mapping-red` carrying `test-infra-in-plan`; a runner config (and a case-variant one) appearing after the lock → `RED lock-red`.
- `pharn/floor/check-red-run.test.mjs` — `/pharn-test`'s interactive no-runner offer and `blockedLine`'s `suggested:` name exactly `/pharn-ship`, and neither names `/pharn-loop` (D7).
- `pharn/pharn-contracts/ac-tests.md` — the kind row; what the plan check can and cannot see for the pin; the fold + the `/3` migration note; the rebuild bullet rewritten (D5); the proof section's floor line.
- `.claude/commands/pharn-plan.md` — Step 4c bullet, RED handling, guarantee-audit line (D6).
- `.claude/commands/pharn-build.md` — the rebuild paragraph corrected, the do-not-change instruction (D5).
- `.claude/commands/pharn-test.md` — the interactive offer names only `/pharn-ship`, with why (D7).
- `CLAUDE.md` — the check-ac-tests kind list gains `test-infra-in-plan`; the pin's config-name set is matched folded.
- `CHANGELOG.md` — `[6.21.0]`.
- `SKILLS_VERSION` — 6.21.0.
- `README.md` — the version badge; the generated inventory only if `docs:generate` rewrites it — generated.
- `docs/capabilities/README.md` — only if `docs:generate` rewrites it — generated.
- `.dev/features/test-infra-plan-scope/PLAN.md` — this plan.
- `.dev/features/test-infra-plan-scope/GRILL.md` — the grill.
- `.dev/features/test-infra-plan-scope/BUILD.md` — the build record.
- `.dev/features/test-infra-plan-scope/REGRESSION.md` — the regress record.
- `.dev/features/test-infra-plan-scope/regression-report.json` — the regress verdict.
- `.dev/features/test-infra-plan-scope/VERIFY.md` — the verify record.
- `.dev/features/test-infra-plan-scope/verify-report.json` — the verify verdict.
- `.dev/features/test-infra-plan-scope/REVIEW.md` — the review.
- `.dev/features/test-infra-plan-scope/SHIP.md` — the ship record.

## Contracts satisfied

- `pharn/pharn-contracts/ac-tests.md` — the checker's closed kind table and "The test-infrastructure pin"; this
  increment amends both (it is the contract of the files it changes), cited by the commands, never restated (P4).
- `pharn/pharn-contracts/test-results-record.md` — `CONFIG_FILE` is read, not redefined.

## Evals to write (P1)

- No `role:`-bearing capability is added or changed, so no `evals/cases` are owed. The floor changes carry their
  own suites (the `Files` rows above); each RED kind is reached by a test, which `check-ac-tests.test.mjs`'s ✧ L36
  REVERSE CLOSURE already enforces for the new member.

## Guarantee audit (P0)

- "A PLAN.md whose `## Files` names a root runner config the pin covers is RED" → **floor: enum/regex** (the folded
  name against a closed regex, over the setter's scoped path). **Invoking** it is advisory at `/pharn-plan` Step 4c;
  the same checker is RE-RUN by `check-test-stage.mjs` at `/pharn-build` Step 0, `/pharn-ship`, `/pharn-loop` and
  `check-loop-fresh.mjs` check I, whose verdicts are floor.
- "So the build's Write/Edit cannot reach a root runner config" → **floor: hook (fix #7)** composed with the kind
  above: the setter scopes only concrete `## Files` entries, and a GREEN mapping check means none is a root runner
  config. **Bounds, stated:** Bash writes bypass the hook (detected at verify by `reconcile` and by the pin itself —
  `test-infra-changed`, content-hash); the fold is the modelled equivalence (D4); a config the runner reads from
  outside the root or under another name is not pinned at all (unchanged, already stated).
- "`package.json` / `pharn.config.json` in PLAN.md" → **advisory** NOTE (a deterministic membership test whose
  output nothing branches on). The pinned script values are still checked at verify (**floor**, content compare) —
  late, and the remedy costs the build. Stated as the checker's blind spot, not closed.
- "A case-variant root runner config is pinned" → **floor: enum/regex** over the folded name + **content-hash** of
  the file; bound as D4.
- "The rebuild passes the test-stage gate" → narrowed in the prose to a rebuild that stayed out of what the lock
  pins; the gate's verdict is floor, the claim about the build's behaviour is advisory.
- "`/pharn-test` offers only a route that can run" → **advisory** prose, **pinned** by a test (presence and
  absence of the command names in the offer and in `blockedLine`), never proof a run follows it.

## Trust audit (P2)

- PLAN.md `## Files` is untrusted DATA. The new RED and NOTE quote at most one bounded path (`shown()`, 80 chars);
  the verdict is a membership test over the path, never an interpretation of its annotation.
- Root file names read by `readdirSync` are untrusted; they are folded and regex-tested, hashed without following a
  link (unchanged), and a difference names the on-disk path, never file content.

## Determinism audit (P5)

- Every new branch is a membership test: `isRunnerConfigName` (regex over a fold), `testInfraPathKind` (no `/` +
  regex, or set membership in `PIN_MANIFESTS`). The remedy for a RED is a person splitting the increment — no
  fallback guesses.

## Applied lessons

- L35 — the manifest names and the config-name predicate each get ONE copy (`PIN_MANIFESTS`, `isRunnerConfigName`)
  imported by the plan check, instead of a second list in `check-ac-tests.mjs` kept in sync; and for the one fact
  that must be stated twice (`/pharn-test`'s interactive offer vs `blockedLine`), the question "must the second copy
  exist?" was asked first — yes, two branches — so it is pinned by a test rather than merged.
- L36 — `CONFIG_NAME_RE` is a closed set that a variant spelling (`Vitest.config.mjs`) slipped through; the fix is a
  fold at every consumer through one predicate, and a ✧ closure assertion that `CONFIG_NAME_RE.test(` appears once,
  so a future site cannot test the raw name again.
- L37 — "the build cannot write a root runner config once the check is GREEN" is a quantified claim about a guard,
  so the ★ HOOK test EXECUTES the real setter and enforcer (allowed for `vite.config.ts`, denied for
  `./vite.config.ts`) instead of reading the hook.
- L39 — PLAN.md `## Files` is read by the setter (what may the build write?) and by this check (would the build
  change the pin?); the check reuses the setter's own `scopedPath` so both answer over the same paths, and D2 says
  why no further normalization is applied.
- L47 — the false "the lock pins only the AC tests" is not replaced by a new closed list of what the lock pins; the
  rewrite points at the pin section (one list) and changes the claim's form to "a rebuild that stayed out of what
  the lock pins".
- L50 — the sweep for the broken claim enumerated the CITES of the referent that changed (what the lock pins; what
  the build may not write), not only the sentence's wording: `git grep` over shipped surfaces for `pins only`,
  `lock pins`, `none of which`, `rebuild` found the two false sites plus `pharn-loop.md:350` ("the pinned tests
  themselves are outside the plan's `## Files`" — true, left as is) and `ac-tests.md:360` (the proof section, which
  gains the new floor line). No trusted doc restates it: `LIMITS.md:394` defers to `test-infra-core.mjs`'s list.
- L52 — the tests are written over the SET the fix quantifies over: all three sites that tested `CONFIG_NAME_RE`
  (listing, shape check, plan check), both manifests, and both branches of the no-runner offer — not one member.

## Open questions (HALT)

- None blocking. D8 (MINOR vs the 3.0.0/4.0.0 MAJOR reading) is decided and argued above; the approver may overrule
  it at GATE 1.

## GATE 1 — delegated decision (recorded 2026-09-25)

**A model decision under delegation, NOT a human approval.** The user's instruction (2026-09-24, verbatim): _"fix
all findings, if you can ship some of them at one run do it, if you can ship some of them simultaniuslly in
worktrees do it. each fix needs to be fixed by using pharn-dev-ship command and needs to ends by merged pull
request. you merge pull requests when the CI are green."_ Under it, the orchestrating session approved this plan
**as written**, including D8 (MINOR, 6.21.0), with this reasoning to record: every plan the new RED catches could
already never reach green, the one previously-passable case is fixed by deleting a line, and nothing changes shape
— the same classification as `[6.19.0]` and `[6.20.0]` in this pipeline. The CHANGELOG entry must name the
`[3.0.0]` / `[4.0.0]` precedent and say why it does not apply.

Notes attached to the approval, each binding on the build:

1. **One predicate:** `isRunnerConfigName` in `test-infra-core.mjs`, imported by `check-ac-tests.mjs` — never a
   second regex (D1's closure assertion enforces it).
2. **The `NOTE` line never changes an exit code** and is worded advisory (P0) in the contract; a test proves a PLAN
   naming `package.json` stays exit 0 with the NOTE printed.
3. **The end-to-end regression test in `check-test-stage.test.mjs` sits in its own `describe` block, appended at
   the end of the file** — group D edits `check-test-stage.mjs` and its test file in parallel, so the rebase stays
   trivial.
4. **Group F edits `check-ac-tests.mjs` and `ac-tests.md` too** — edits there stay local (the KINDS member, one
   check block, the notes return; the table row, the pin section, the rebuild bullet, the proof line).

## Amended after grill (2026-09-25)

`GRILL.md` raised 9 advisory concerns (3 important, 6 minor). All are folded in, inside the files already
declared above — no path is added:

- **G-remedy (important):** the remedy sentences that loop for an INTENDED infrastructure change are fixed too —
  `ac-tests.md`'s pin section and `test-infra-core.mjs`'s header now say that re-running `/pharn-test` cannot help
  when the change is the feature's intent; split it into a `spec_kind: test-infra` increment first.
- **G-rewrite (important):** the rewritten rebuild bullet names a verify-time gate that rewrites a pinned runner
  config (a formatter / `--fix` linter over the root), beside the existing pinned-test case.
- **G-fs (important):** tests create ONE spelling per directory (APFS and CI's Linux agree), and D4's bound states
  the case-sensitive-filesystem over-pinning (a case-variant name the runner does not load is pinned anyway —
  fail-closed).
- **G-shape (minor):** `testInfraPathKind(entry)` takes the raw `## Files` entry and applies `scopedPath` itself.
- **G-closure (minor):** the ✧ closure ranges over every non-test `pharn/floor/*.mjs`.
- **G-migration (minor):** the CHANGELOG also covers an in-flight feature whose PLAN names a root runner config
  (now `RED mapping-red` at `/pharn-build` Step 0), and the forward-compatibility bound (a 6.21 lock recording a
  case-variant path is `lock-unusable` to a 6.20.x floor).
- **G-docs (minor):** the README's test-stage paragraph and check-ac-tests' GREEN line mention the new refusal.
- **G-fold-home (minor):** noted only — `foldName`'s home in `spec-template-core.mjs` is not moved (P7).
