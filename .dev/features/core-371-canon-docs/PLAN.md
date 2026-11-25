# PLAN — core-371-canon-docs

- spec_content_hash: 8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167
- applied_lessons: [L50, L64, L68, L75, L78]
- increment: check that `CLAUDE.md`, the four trusted docs and the ten `.dev/guides/*.md` say what `main` (93c2af1b,
  `SKILLS_VERSION` 7.25.1) really does, and correct only the claims that are false or stale (Linear CORE-371, part B;
  part A owns `README.md` prose, `docs/*.md`, `CONTRIBUTING.md`, `SECURITY.md`, `pharn/floor/README.md`).
- layer(s): trusted docs (`pharn/THREAT-MODEL.md`, `pharn/LIMITS.md`, `pharn/ARCHITECTURE.md`, by the human patch
  route) = product surface → patch bump 7.25.3 (part A takes 7.25.2); `CLAUDE.md` and `.dev/guides/*.md` = repo-meta /
  build apparatus.
- constitution_refs: [P0, P2, P6, P7]

The `spec_content_hash` above is the post-patch `pharn/ARCHITECTURE.md` (`hash-doc.mjs`, measured after the human's
patch was committed as `cef96e15`); the plan was first pinned to the pre-patch hash
`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d` and re-pinned before `/pharn-dev-build` Step 0.

## Discovery (read this run)

Method: CORE-350's claim table (claim / file:line / live evidence / verdict), over every concrete claim — paths,
functions, constants and their values, flags, exit codes, closed sets, command wiring (grep of `.claude/commands/`),
npm scripts, CI steps, "since X.Y.Z" against `CHANGELOG.md` sections, and the GitHub ruleset (`gh api`). The four
large guides and the two big trusted docs were read by five read-only sub-agents, one file group each; every FALSE or
STALE verdict below was re-checked by me against the live file and the code it cites (the quoted evidence). I read
`CLAUDE.md`, `pharn/CONSTITUTION.md` and `pharn/ARCHITECTURE.md` myself, with the delta since CORE-350's base
(`git diff 08d7f63e..93c2af1b`) as the first lens.

Claim table summary: **about 1 250 claims checked, 40 false or stale** (10 in trusted docs, 1 in `CLAUDE.md`, 29 in
the guides, counting the ten-file preamble as ten). Per file: `CLAUDE.md` ~40 (after CORE-350's ~140 today),
`CONSTITUTION.md` ~10, `ARCHITECTURE.md` ~30, `THREAT-MODEL.md` ~55, `LIMITS.md` ~150, `floor-gates.md` ~230,
`floor-checks.md` ~230, `floor-orchestration.md` ~180, `floor-ac-tests.md` ~95, `writes-scope.md` ~80,
`product-commands.md` ~45, `lessons.md` ~30, `versioning.md` ~15, `deferred-decisions.md` ~12, `generated-docs.md`
~12. `node .dev/floor/check-lessons-index.mjs .` GREEN (exit 0); no generated region needs regeneration at the base.

### False or stale — trusted docs (human patch, `$SCRATCH/patch-core-371-canon-1.py`)

- **TM-1** `THREAT-MODEL.md:20-21` "the security griller (in `/pharn-loop --quick`, only its deterministic secret
  scan)" — FALSE: the quick loop runs `/pharn-grill --quick`, "the same two floor stops … and no plan scans"
  (`pharn-loop-quick.md:75-77`); `pharn-grill.md:104` "Steps 3 and 3b are SKIPPED entirely … no griller". → "(not run
  at all by `/pharn-loop --quick`'s two-check grill)".
- **TM-2** `THREAT-MODEL.md:73-75` "pre-approves the Skill tool only as … five names" — STALE: `pharn-loop.md:75-81`
  also grants `Skill(pharn-triage *)` and `Skill(pharn-supervise *)` (7.7.0, 7.9.0). → seven names listed.
- **TM-3** `THREAT-MODEL.md:122` "the control surface and, in an installed project, PHARN's installed files, a CI
  workflow or a git hooks directory" — STALE: `set-writes-scope.cjs:1188` refuses executable project config "in every
  posture since 7.3.0" (the same doc's item 10 says so). → the posture qualifier moves to "PHARN's installed files" only.
- **TM-4** `THREAT-MODEL.md:143-145` "since 2026-10-26 `main`'s required-checks ruleset has no bypass actor, so no
  account merges a tree whose required checks failed" — STALE: `gh api repos/pharn-dev/pharn-oss/rulesets/25907495` →
  `bypass_actors [{actor_id 7968018, User, always}]`, `updated_at 2026-11-04`; CORE-350 corrected LIMITS §11
  (`LIMITS.md:824-829`) and missed this restatement (L64). → "since 2026-11-04 … has the owner as bypass actor, so the
  owner's account can merge a tree whose required checks failed, skipping the review and … `gitleaks` check too".
- **L-1** `LIMITS.md:301-302` "Under `/pharn-loop --quick` the grill runs only the observability scanner" — FALSE,
  same evidence as TM-1 (and `LIMITS.md` §3a itself says the quick grill "runs its two floor stops only"). → "runs
  neither the observability scanner nor the griller's judgment".
- **L-2** `LIMITS.md:409-410` "since 7.3.0 `--anchor` refuses to do that while the other feature's … marker is open"
  — INCOMPLETE (part A hand-off): since 7.24.0 `reconcile-baseline.mjs --check-epoch` runs the same predicate at
  `/pharn-loop` Step 1a (`pharn-loop.md:351`) and after `/pharn-ship` GATE 1 (`pharn-ship-stages.md:182`;
  `reconcile-baseline.mjs:83-91`). → adds "(since 7.24.0 `--check-epoch` asks the same at `/pharn-loop`'s entry and
  after `/pharn-ship`'s GATE 1)".
- **L-3** `LIMITS.md:417` "the always-reconciled control surface (`.claude/hooks/*`, …" — OVERSTATED:
  `reconcile-ignore.json` `always_reconciled.exact` names the four guard scripts only; `.claude/hooks/*.test.cjs` are
  not in it. → "the four `.claude/hooks/` guards".
- **L-4** `LIMITS.md:639` "refuses a turn end, at most three times per run" — FALSE as a bound:
  `require-loop-record.cjs:46-47` "Default 3; PHARN_STOP_GUARD_MAX (an integer 1..7) overrides it". → "three times per
  run by default (`PHARN_STOP_GUARD_MAX`, 1 to 7)".
- **A-1** `ARCHITECTURE.md:132-136` §4 contract list — STALE: `ls pharn/pharn-contracts/` has `grill-triage.md`
  (7.7.0) and `supervisor.md` (7.9.0), not listed; CHANGELOG [6.5.2] made this list name every contract. → both added.
- **A-2** `ARCHITECTURE.md:144` "the stages: pharn-spec … pharn-ship (+ loop, review, memory-promote)" — STALE:
  `.claude/commands/pharn-triage.md`, `pharn-supervise.md` exist. → "(+ loop, triage, supervise, review,
  memory-promote)".

Patch script: pre-images `THREAT-MODEL.md` e0ad698c…, `LIMITS.md` 9a4f502c…, `ARCHITECTURE.md` f058fca3…; it checks
all three and every anchor (exactly one hit each) before writing, and refuses a second run. Measured on a scratch copy:
post sha256 `THREAT-MODEL.md` `1940a6378b9c385418305f03abec63be4858cb975b9f7f03a7ab956337834976`, `LIMITS.md`
`8b0e6b30b135407526d09d21fd69bc8bb4f94a3fc48277c31a946e16e5304c28`, `ARCHITECTURE.md`
`8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167` (`hash-doc.mjs` agrees); second run refused. All
four trusted docs are excluded from prettier and markdownlint, so no style gate reads them.

### False or stale — `CLAUDE.md`

- **C-1** `CLAUDE.md:211-212` "since 7.3.0 `--anchor` refuses while that run's loop/ship marker is open" — INCOMPLETE,
  the L-2 evidence. → "since 7.3.0 `--anchor` (and since 7.24.0 a run's entry) refuses …" (+34 bytes; budget 2 048).

### False or stale — `.dev/guides/`

- **G-0** all ten guides, line 3: "The text is the moved text, unchanged except for the `##` headings … and the leading
  indentation Prettier normalizes" — STALE: all ten were added in `c441b096`; 95 later commits touch `.dev/guides/`
  (e.g. `555ddde4`, `93c820be` added paragraphs). → "The text began as the moved text, plus `##` headings for
  navigation and Prettier's leading indentation; later increments edit it."
- **FG-A** `floor-gates.md:756` "--start 0 · 3 · 2" — STALE since 7.14.0: `entry-gates.mjs:21-24` exit 4 "red on
  CACHED evidence", `:565` `return EXIT.red`. → "--start 0 · 3 · 4 (cached red) · 2".
- **FG-B** `floor-gates.md:673-675` "CREDENTIAL_CODES (16: … GH_TOKEN, …" — STALE since 7.3.0: the imported array has
  17 (adds `cred:env:GITHUB_TOKEN`). → "(17: … GH_TOKEN, GITHUB_TOKEN outside GitHub Actions, …".
- **FG-C** `floor-gates.md:172-173` "The three codes are gate-run-core.mjs UNMEASURED_CODES" — STALE since 7.17.0:
  five members (`gate-run-core.mjs:240-248`). → "The three codes are in gate-run-core.mjs UNMEASURED_CODES".
- **FG-D** `floor-gates.md:392-393` NON_REUSABLE_IDS "= every AC level gate, every STYLE_SET gate (…) and reconcile" —
  INCOMPLETE equality: `gate-run-core.mjs:358-359` also has `INSTRUCTION_GROWTH_ID` (6.38.0). → "…, reconcile and
  instruction-growth)".
- **FG-E** `floor-gates.md:438-439` verify's stage-exit lists — STALE: `stage-exit-core.mjs:362-373` refused also has
  `head-install-drift`, unusable also `bad-gate-timeout`. → both added.
- **FG-F** `floor-gates.md:202` "per-test-results-core.mjs's readResultsFile + parseResults + buildRecord" — FALSE for
  `parseResults`: defined `per-test-results-formats.mjs:392`, imported by core. → attribute it to -formats.
- **FG-G** `floor-gates.md:86-88` run-gates usage lines — STALE: no line for `init --stage build` (6.39.0;
  `run-gates.mjs:934-947`, usage `:1578`). → add that usage line.
- **FO-A** `floor-orchestration.md:541-542` "pins `--budget-ms 570000` on its four finish lines" — STALE: seven
  `stage-agent.mjs finish` lines (`pharn-loop.md:738, 776, 811, 842, 879, 989, 1048`). → "seven".
- **FO-C** `floor-orchestration.md:58-59` "an UNMEASURED_CODES member — base-timed-out, gate-not-measured,
  head-timed-out, 6.59.0 —" — STALE since 7.17.0. → append "per-test-record-refused, per-test-unaccounted-red (7.17.0)".
- **FC-2** `floor-checks.md:154-155` "(worktree-fingerprint.mjs re-exports them" — FALSE for `isStateRootPath`:
  `worktree-fingerprint.mjs:102` imports both, `:135` exports `STATE_ROOT_SEGMENT` only. → "imports both and
  re-exports the constant".
- **FC-3** `floor-checks.md:164-165` "PIPELINE_RE + activeFeatureSlug … the checker re-exports" — FALSE for
  `PIPELINE_RE`: `check-bash-reconcile.mjs:220` `export { activeFeatureSlug };` only. → "the checker imports both,
  re-exports activeFeatureSlug".
- **FC-4** `floor-checks.md:216-217` "`/pharn-ship` opens right after its GATE-1 resume backstop" — STALE:
  `pharn-ship-stages.md:191` "immediately after the epoch check" (backstop → base → epoch check → marker). → "opens in
  Step 2.1 after its GATE-1 backstop, base capture and epoch check".
- **FC-5** `floor-checks.md:771` "(a doc listing all seven and explaining each wrongly stays GREEN)" — STALE count:
  `scripts.check` chains ten gates. → "every gate".
- **FC-6** `floor-checks.md:622` "`npm test` (in `npm run check`, and CI's Test step)" — IMPRECISE: CI's Test step runs
  `npm run test:coverage` (`ci.yml:103-105`), the same globs. → "(in `npm run check`; CI's Test step runs it as
  `test:coverage`)".
- **FC-7** `floor-checks.md:220-221` "one that skips `--close` leaves the fail-closed default standing for at most
  24h" — STALE since 6.31.2: `enforce-writes-scope.cjs:577-584` refreshes a fresh marker's mtime on every scan
  (CHANGELOG [6.31.2]). → "until 24h after the last write the guard judged without a scope (each such write refreshes
  the marker, 6.31.2)".
- **WS-A** `writes-scope.md:101-102` — same claim and evidence as FC-7; same correction.
- **WS-C** `writes-scope.md:174-175` "names `.claude/settings.json` or one of the four hook scripts" — INCOMPLETE:
  `CONTROL_SURFACE` (`set-writes-scope.cjs:252-261`) also lists `.claude/settings.local.json`. → "names either settings
  file or one of the four hook scripts".
- **AT-B** `floor-ac-tests.md:70-71` "(only /pharn-test's Step B does)" — STALE since 6.19.0, contradicting its own
  `:145-146`: `check-test-stage.mjs:228` passes `--allow-bootstrap`. → "(only /pharn-test's Step B and
  check-test-stage.mjs's bootstrap branch do)".
- **AT-D** `floor-ac-tests.md:55` "(--gates/--extra/--skip-style/--scope-json/--spec-from/--side refused" —
  INCOMPLETE: `run-gates.mjs:919` also refuses `--base`. → add "/--base".

### Checked and kept (not false)

- "COST LEDGER trio (added 6.5.0)" (`floor-orchestration.md:222`): the CHANGELOG [6.5.2] entry itself records the
  bump as 6.4.3 → 6.5.0; kept.
- `ship-outcome-core.mjs` "nothing machine-reads its output but the emitter" (`floor-orchestration.md:370-374`):
  `render-run-report.mjs` and `ship-closeout.mjs` import helpers (`runMode`, `verdictApplicability`), not the outcome;
  kept.
- `LIMITS.md:747-748` (a typo-failed test reads like a missing-behaviour one): still true of the AC gate's evidence
  after 7.25.0's type check; kept.
- `CONSTITUTION.md` "Every `/pharn-*` … command names this file in its frontmatter `reads:`": five command PARTS
  (`pharn-*-close`, `-quick`, `-stages`) do not, but they are not invocable commands; kept.
- Part A's hand-off for `floor-checks.md:163`: the ENTRY CHECK (7.24.0) paragraph already sits at `:169-170`; no edit.

### Hand-offs and follow-ups (out of this set; not edited)

- `.claude/commands/pharn-grill.md:110` "`/pharn-loop` invokes this form (inline) in its full mode" looks stale since
  7.7.0 (the full loop routes a full grill) — command, methodology source; follow-up.
- `pharn/floor/check-regress.mjs:100` header repeats FG-F's misattribution — product floor code comment; follow-up.
- `.dev/floor/stage-agent-type.test.mjs:27` says pharn-cli does not copy `.claude/agents/`; `product-commands.md`
  says pharn-cli 0.21.1 installs both agents — unsettled (pharn-cli is another repo); follow-up.
- No false claim found in part A's files.

## Applied lessons

- L50 — the sweeps below go by referent as well as by phrase: for TM-4 every cite of ruleset 25907495 / "bypass" in the
  five files, for L-2/C-1 every cite of the `--anchor` epoch-owner refusal.
- L64 — each corrected claim is checked at each restatement: TM-4 is CORE-350's LIMITS §11 fix restated in
  THREAT-MODEL; FC-7 and WS-A are one claim in two guides; FG-C and FO-C one list in two guides; TM-1 and L-1 one
  cause.
- L68 — the human applies the trusted-doc patch and it is committed BEFORE `/pharn-dev-build` Step 0's anchor, and
  the `spec_content_hash` is re-pinned to the post-patch hash before build Step 0.
- L75 — the sweep lines below list each phrase with its hits and one disposition per hit.
- L78 — dated records keep what was true when written: merged CHANGELOG entries, `.dev/features/**`, the historical
  "had grown to SEVEN" (`floor-checks.md:765`) and `LIMITS.md:824`'s "had no bypass actor from 2026-10-26" are not
  rewritten.

## Sweep (L75)

Over `CLAUDE.md`, the four trusted docs and `.dev/guides/*.md`:

- `no bypass actor`, `2026-10-26`: `THREAT-MODEL.md:143` (TM-4, edit); `LIMITS.md:824` (dated, true, keep);
  `LIMITS.md:698`, `THREAT-MODEL.md:210` (a measurement file name, keep).
- `Skill(pharn-test`: `THREAT-MODEL.md:74` (TM-2, edit); no other.
- `secret scan`, `observability scanner`: `THREAT-MODEL.md:21` (TM-1), `LIMITS.md:302` (L-1); no other.
- `anchor` refuses: `CLAUDE.md:212` (C-1), `LIMITS.md:409` (L-2), `floor-checks.md:163` (already followed by the
  7.24.0 ENTRY CHECK paragraph, keep).
- `hooks/*`: `LIMITS.md:417` (L-3); no other.
- `three times`: `LIMITS.md:639` (L-4); `floor-checks.md:99` (another subject, keep); `floor-orchestration.md:102`
  states K = 3 with `PHARN_STOP_GUARD_MAX 1..7` (true, keep).
- `stage-exit, spec-template`, `review, memory-promote`: `ARCHITECTURE.md:135, :144` (A-1, A-2); no other.
- `unchanged except`: line 3 of all ten guides (G-0, edit); `floor-gates.md:456` (another subject, keep).
- `--start 0`: `floor-gates.md:756` (FG-A); `:776, :782` already say exit 4 (keep).
- `CREDENTIAL_CODES`: `floor-gates.md:673` (FG-B); no other.
- `UNMEASURED_CODES`: `floor-gates.md:173` (FG-C), `floor-orchestration.md:58` (FO-C), `floor-gates.md:223` (true,
  keep).
- `NON_REUSABLE_IDS`: `floor-gates.md:392` (FG-D); no other.
- `re-exports`: `floor-checks.md:155` (FC-2), `:165` (FC-3); `:141`, `:151`, `floor-gates.md:508` (true, keep).
- `finish lines`: `floor-orchestration.md:542` (FO-A); no other.
- `at most 24`: `floor-checks.md:221` (FC-7), `writes-scope.md:102` (WS-A); no other.
- `one of the four hook scripts`: `writes-scope.md:175` (WS-C); no other.
- `Step B does`: `floor-ac-tests.md:71` (AT-B); no other.

## Files

- `CLAUDE.md` — C-1 — layer repo-meta
- `.dev/guides/deferred-decisions.md` — G-0 — layer build apparatus
- `.dev/guides/floor-ac-tests.md` — G-0, AT-B, AT-D — layer build apparatus
- `.dev/guides/floor-checks.md` — G-0, FC-2 … FC-7 — layer build apparatus
- `.dev/guides/floor-gates.md` — G-0, FG-A … FG-G — layer build apparatus
- `.dev/guides/floor-orchestration.md` — G-0, FO-A, FO-C — layer build apparatus
- `.dev/guides/generated-docs.md` — G-0 — layer build apparatus
- `.dev/guides/lessons.md` — G-0 — layer build apparatus
- `.dev/guides/product-commands.md` — G-0 — layer build apparatus
- `.dev/guides/versioning.md` — G-0 — layer build apparatus
- `.dev/guides/writes-scope.md` — G-0, WS-A, WS-C — layer build apparatus
- `CHANGELOG.md` — a new `## [7.25.3]` section — layer repo-meta
- `SKILLS_VERSION` — 7.25.2 → 7.25.3 (patch: corrected shipped trusted-doc sentences) — layer repo-meta
- `README.md` — the version badge only — layer repo-meta
- `pharn-install.json` — regenerated by `npm run docs:generate` (skillsVersion and three trusted-doc sha256s) — layer
  repo-meta (generated)

### Not in `## Files`, by design

- `pharn/THREAT-MODEL.md`, `pharn/LIMITS.md`, `pharn/ARCHITECTURE.md` — the human patch route
  (`$SCRATCH/patch-core-371-canon-1.py`, expected post sha256s above), sha-checked by me and committed BEFORE build
  Step 0's anchor (L68); the setter refuses them in `## Files`.
- Generated regions (`docs/capabilities/**`, README `CURRENT-STATE`, `docs/lessons-index.md`): no version or
  trusted-doc content in them (grep); `docs:check` is re-run at build.

## Contracts satisfied

- None changed. CHANGELOG entry per CONTRIBUTING "CHANGELOG entries".

## Evals to write (P1)

- None: no capability or checker changes.

## Guarantee audit (P0)

- "ruleset 25907495 has the owner as bypass actor since 2026-11-04" → a live `gh api` read of GitHub settings
  (advisory; it can change after this run).
- "`/pharn-loop --quick`'s grill runs no plan scanner" → read from the command text (advisory: the commands are
  advisory orchestration).
- Every edited sentence remains prose; no new guarantee is claimed and none is widened. The guide edits only bring
  restated constants and lists back in line with the code they cite.

## Trust audit (P2)

- The sub-agents' reports are model output: each FALSE/STALE verdict above was re-checked against the live file
  before it entered this plan. `gh api` output is read as data.

## Determinism audit (P5)

- No new branch in any tool.

## Open questions (HALT)

- GATE 1 (orchestrator): approve the 40 corrections above, the 7.25.3 patch bump, and the trusted-doc patch for the
  human to apply.
