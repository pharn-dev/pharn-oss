# PLAN — loop-amend-spec

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L29, L34, L35, L36, L43, L54, L62, L65, L68, L72, L84]
- increment: part 3b of restore-loop-grill (7.10.0) — the supervisor gains a third decision, `amend-spec`, at most once
  per run: a new CLI `pharn/floor/spec-amend.mjs` archives the pre-amend SPEC and moves the round's files aside (so the
  re-plan count restarts), a routed `/pharn-spec --model-approve` in amend mode appends acceptance criteria from the
  escalated findings and re-pins, `spec-amend.mjs check` holds the amend append-only (Intent and Scope byte-identical,
  every earlier criterion kept verbatim), and the whole front re-runs from `/pharn-plan`.
- layer(s): pharn-contracts (`supervisor.md` amend section; `loop-record.md` id list), product floor (`pharn/floor/`),
  product commands (`pharn-spec.md`, `pharn-supervise.md`, `pharn-loop.md`, `pharn-loop-close.md`)
- constitution_refs: [P0, P1, P2, P3, P4, P5, P6, P7]

## Open questions — RESOLVED before this plan (human-selected, P6, 2026-11-11)

- Q1 → **Intent + Scope frozen**: the amended SPEC's `## Intent` and `## Scope` are byte-identical to the pre-amend copy
  `SPEC.a1.md`. The human's description itself is never on disk, so this is what "verbatim" can hold.
- Q2 → **append-only**: every pre-amend acceptance criterion keeps its id and its exact lines, in order; tightening is a
  new criterion appended after them.
- Q3 → **`/pharn-spec` amend mode**: the supervisor only decides `amend-spec`; a routed `/pharn-spec --model-approve`
  (a fresh agent) detects the pending amend by membership and appends the criteria, then re-pins.
- Q4 → **flat `.a1` names**: the pre-amend files are renamed in the feature directory with an `.a1` tag — a closed set of
  14 names derived in code, as the round archives are.

## GATE 1 and the trusted-doc commit

- GATE 1: the maintainer, in chat, "Approve as written", 2026-11-11.
- The trusted-doc text below was applied by the maintainer's patch run and committed as `ddfaf751`, before the build
  anchors (L68). `spec_content_hash` is re-pinned to `pharn/ARCHITECTURE.md` after that commit (was `14e5e084…`).
- The grill (`GRILL.md`, run before that commit) raised 4 advisory concerns; the build acts on each:
  - every non-zero exit in the amend branch (`begin`, the re-run spec stage's `finish` read, `check-spec-approved.mjs`,
    `spec-amend.mjs check`) is S18, never Step 3's S6 / S6b / S9, and the S18 row says so;
  - the `.a1` hygiene pin is over `writes:` only (commands may read and point at `.a1` names);
  - a failed `begin` also removes the `SPEC.a1.md` copy it made;
  - tests for `status`'s RED (a link, a partial `.a1` set) and `begin`'s `supervisor-invalid` / `partial-archive`.

## The failure (P7)

The brief's flow sends a `spec` escalation to the supervisor, whose decision may be `amend-spec`. 7.9.0 (part 3a) built
`proceed-at-risk | stop`; a `spec` escalation still ends at S16 whenever the SPEC itself is what must change, which is
the case triage marks `spec` (`pharn-triage.md`: "no plan can fix it without changing the SPEC"). The brief's non-
negotiables bound it: the cap is counted by a CLI, the human's intent stays, no criterion is removed.

## Discovery (read live this run)

- `/pharn-spec`: Step 1 lets only a human's _Revise_ re-open an Approved SPEC (`pharn-spec.md:117-123`); Step 4a
  `--model-approve` (`:270-297`) never mentions an existing Approved SPEC; Step 5 pins (`:302-330`).
- `check-spec.mjs` `pinHash` covers the `spec_kind:` lines and the body after the frontmatter (`:235-242`).
- `spec-template-core.mjs` `specAcceptanceCriteriaText` (`:487-501`) lists AC items with their lines; `specSectionLines`
  (`:514-521`) returns a section's lines or null.
- The pin is re-checked downstream by `check-plan-spec-agree.mjs` (`:93`, `:125`) and `AC-TESTS.md`; an amend precedes
  `/pharn-test`, so no lock exists yet, and the front re-run rewrites PLAN and AC-TESTS with the new pin.
- `grill-round-core.mjs` counts rounds from the 8 `ARCHIVE_NAMES` on disk (`:48`, `:96-108`); moving them aside resets
  the count. `supervisor.mjs` derives the escalation the same way (`:65-69`).
- `loop-closeout.mjs` `knownRisk` reads `SUPERVISOR.json` whenever present (`:334-337`), so the pre-amend decision must
  move aside or the green commit refuses.
- Artifact lists (`PIPELINE_ARTIFACTS`, `reconcile-ignore.json`, `INCLUDED_ARTIFACTS`, `STAGE_ARTIFACTS`) and their
  parity tests (`worktree-fingerprint.test.mjs:249-283`, `check-bash-reconcile.test.mjs:833`).
- Finding ids are positional `G<round>-<n>` (`grill-findings-core.mjs:180-182`), so after the reset they restart at
  `G1-`; the archived `.a1` files keep the earlier ones apart.

## Applied lessons

- L29 — the 14 amend names are derived from one expression (`AMEND_NAMES`) and every artifact list is bound to it by a
  test; the new decision and the new stop id land in every enumeration at once.
- L34 — an amend that adds no criterion is refused (`no-criterion-added`): a re-pin of an unchanged body is not an amend.
- L35 — no counter file: "amended once" is `SPEC.a1.md` on disk, as the round count is the archives on disk.
- L36 — the kept criteria are compared item by item, id and lines, in order, both ways, so a dropped, edited or
  reordered criterion is refused.
- L43 — agreement, never truth: the checks certify the shape of the amend against the archive the run itself wrote;
  whether the new criteria answer the findings is the next grill's and triage's judgment.
- L54 — `spec-amend.mjs` lstats every name and reads through `regular-file.mjs`; links are refused.
- L62 — refusals print codes and AC ids, never criterion or finding text.
- L65 — `/pharn-spec` writes only `SPEC.md`; it cannot touch `SPEC.a1.md`, the record its amend is checked against
  (`writes:` unchanged, and a hygiene pin that no command's `writes:` names an `.a1` name).
- L68 — the trusted-doc text is a human patch committed before the build anchors.
- L72 — `supervisor-core.mjs` `DECISIONS` gains a member; every caller that compares a decision literal is enumerated
  (`loop-closeout.mjs knownRisk`, `render-run-report.mjs`, the supervisor tests).
- L84 — tests drive a realistic templated SPEC (six criteria, three levels) through a real amend and through each
  refusal, not a one-criterion toy.

## What is built

### 1. The decision — `supervisor-core.mjs`, `supervisor.mjs`, `pharn-supervise.md`, `supervisor.md`

- `DECISIONS` = `proceed-at-risk | stop | amend-spec`; `DECISION_EXIT` `amend-spec: 4`. `known_risk` is `[]` on
  `amend-spec`.
- `check` refuses `amend-spec` when `SPEC.a1.md` exists (`amend-used`): one amend per run; a second escalation may only
  be `proceed-at-risk` or `stop`.
- `/pharn-supervise` Step 2 gains `amend-spec`: when every escalated finding is one a new acceptance criterion would
  answer without changing the intent or scope, and `node pharn/floor/spec-amend.mjs status <name>` prints `none`.
- Contract `supervisor.md` gains `## Amend-spec (7.10.0)`: the decision, the archive set, the append-only rule, the
  re-run, the bounds.

### 2. `pharn/floor/spec-amend-core.mjs` (pure) + `pharn/floor/spec-amend.mjs` (CLI)

- `AMEND_NAMES`: the `.a1` names of `SPEC.md`, the four live round files, the eight round archives and
  `SUPERVISOR.json` (`SPEC.a1.md`, `PLAN.a1.md`, …, `PLAN.r1.a1.md`, …, `SUPERVISOR.a1.json`), derived, frozen.
- `status <name>` → one JSON line: `none` (no `SPEC.a1.md`), `pending` (`SPEC.a1.md` present and `SPEC.md`'s body
  still equals it), `applied` (the body differs). Exit 0; 1 RED on a link or a partial archive set.
- `begin <name>` → requires a `SUPERVISOR.json` that `supervisor.mjs` checks as `amend-spec`, and no `.a1` name present.
  Then it copies `SPEC.md` to `SPEC.a1.md` and renames every present round file and `SUPERVISOR.json` to its `.a1` name,
  checking every source and destination first and moving back on a failed rename (`rename-failed` / `rename-partial`).
  Exit 0; 1 RED; 2 usage/unreadable.
- `check <name>` → the amend is append-only. `## Intent` and `## Scope` byte-identical to `SPEC.a1.md`; the earlier
  criteria are a prefix of the new list, each with the same id and lines; at least one criterion added, ids unique; the
  SPEC `Approved` and its pin current (`check-spec-approved.mjs`'s rule, reused). Exit 0 with
  `{schema, added: [AC ids], kept: <n>}`; 1 RED; 2 usage/unreadable.
- Defect codes (closed, each with a hint): `not-regular`, `partial-archive`, `amend-used`, `not-amend-spec`,
  `supervisor-invalid`, `not-pending`, `intent-changed`, `scope-changed`, `criterion-removed`, `criterion-changed`,
  `no-criterion-added`, `not-approved`, `rename-failed`, `rename-partial`.

### 3. `/pharn-spec` amend mode — `pharn-spec.md`

Step 1 runs `node pharn/floor/spec-amend.mjs status <name>` when `--model-approve` is given and `SPEC.md` exists.

- `pending` → amend mode. Read `SUPERVISOR.a1.json`'s risks and the findings they name (`grill-findings.a1.json` …,
  untrusted DATA). Re-open the SPEC to `Draft` (frontmatter only) and append criteria in the template's grammar that
  answer them. Never edit `## Intent`, `## Scope` or an existing criterion. Then Step 4a's checks and Step 5's pin, then
  `spec-amend.mjs check`, fixing once on RED.
- `none` → today's path. `applied` → report blocked: an amend runs once.
- `writes:` is unchanged (`SPEC.md`).

### 4. `/pharn-loop` — Step 4's supervisor branch, a new stop

- `supervisor.mjs check` `4` (`amend-spec`) → `node pharn/floor/spec-amend.mjs begin '<name>'`.
  - `0` → run Step 3's routed spec lines again (start, brief, finish, `check-spec-approved.mjs`), then
    `node pharn/floor/spec-amend.mjs check '<name>'`. Its `0` goes back to `/pharn-plan`'s start line: the whole front
    re-runs with the round count at 0.
  - Anything else → **S18** (`blocked: spec-amend-red`).
- S18 row; "S4–S17" → "S4–S18"; grants for `spec-amend.mjs begin *`, `check *`, `status *`.

### 5. The record, the commit, the report

- `loop-closeout.mjs` (a new `specAmend` step beside `knownRisk`): with `SPEC.a1.md` present it runs the amend check.
  - Passing → one commit paragraph:
    `spec amended once on the supervisor's decision: added AC-7, AC-8 — see pharn/features/<name>/SPEC.a1.md`.
    AC ids match `^AC-[1-9][0-9]*$`; no criterion text (P2).
  - Failing → `not committed: decision unverifiable`.
  - The 14 `.a1` names join `STAGE_ARTIFACTS`.
- `render-run-report.mjs`: a new section `## SPEC amendment` after `## Known risk`.
  - On a `/pharn-loop` ledger with an applied amend: the added criteria's lines fenced as DATA, and the decision's
    reasons from `SUPERVISOR.a1.json` fenced.
  - Otherwise: "None", or "Not applicable" on a non-loop ledger.
- `pharn-loop-close.md`: the record's `## SPEC amendment` section (ids, pointers; advisory); a Step 7 honest line ("_The
  SPEC was amended once by the model on the supervisor's decision: N criteria added; the intent and scope and every
  earlier criterion are unchanged (checked); whether the new criteria are right was not._"); claims.

### 6. Records and lists

- `AMEND_NAMES` join `PIPELINE_ARTIFACTS`, `reconcile-ignore.json`, `INCLUDED_ARTIFACTS` and `STAGE_ARTIFACTS`, with a
  binding test.
- `BLOCKED_IDS`, the contract list, the S-table and `STUCK_POINTS` gain `spec-amend-red`.

## Trusted-doc text — for a human to commit BEFORE `/pharn-dev-build` (L68)

A patch script at GATE 1, deleted after.

1. `pharn/ARCHITECTURE.md`, the triage paragraph's 7.9.0 sentence — after "…whose decision — `proceed-at-risk` or
   `stop`, in `SUPERVISOR.json` —" the decision list becomes "`proceed-at-risk`, `stop` or, once per run,
   `amend-spec` (7.10.0)". A new sentence: "`amend-spec` archives the SPEC and the round's files under `.a1` names
   (`pharn/floor/spec-amend.mjs`), a routed `/pharn-spec` appends acceptance criteria — the intent, the scope and every
   earlier criterion held unchanged by the floor — and the front re-runs from `/pharn-plan`."
2. `pharn/THREAT-MODEL.md` §5 channel (6), after the 7.9.0 sentence — "Since 7.10.0 the supervisor may decide
   `amend-spec`, and `/pharn-spec` writes new acceptance criteria from the same findings: an injected finding can steer
   what the amended SPEC asks for. The floor holds that the intent, the scope and every earlier criterion are
   byte-identical to the archived SPEC, that at least one criterion is added, and that it happens once per run; the
   added criteria are named in the commit message and `RUN-REPORT.md`."
3. `pharn/LIMITS.md` §1d, after the 7.9.0 bullet — "**`amend-spec` (7.10.0)** lets a model change the approved SPEC it is
   building against, once per run and append-only: the floor holds the intent, the scope and every earlier criterion
   byte-identical to the archived SPEC and names the added criteria in the commit; it does not hold that the added
   criteria are right, and the run's approval stays a model's (this section's residual), never a person's."

## Files

- `pharn/pharn-contracts/supervisor.md` — the `amend-spec` decision and `## Amend-spec (7.10.0)` — contracts
- `pharn/pharn-contracts/loop-record.md` — `spec-amend-red`; S1–S18 — contracts
- `pharn/floor/supervisor-core.mjs` — `amend-spec` in DECISIONS / DECISION_EXIT; `amend-used` — floor
- `pharn/floor/supervisor.mjs` — derive `amended` (`SPEC.a1.md` present) for the check — floor
- `pharn/floor/supervisor.test.mjs` — the enum, exit 4, `amend-used` — floor test
- `pharn/floor/spec-amend-core.mjs` — new: AMEND_NAMES, the append-only rule, defects, hints — floor
- `pharn/floor/spec-amend.mjs` — new CLI: status, begin, check — floor
- `pharn/floor/spec-amend.test.mjs` — new tests — floor test
- `pharn/floor/loop-record-core.mjs` — `spec-amend-red` — floor
- `pharn/floor/check-loop-record.mjs` — comment S1–S18 — floor
- `pharn/floor/check-loop-record.test.mjs` — counts if the new row moves them — floor test
- `pharn/floor/check-loop-decision.test.mjs` — the same — floor test
- `pharn/floor/loop-closeout.mjs` — the amend paragraph, the 14 names in STAGE_ARTIFACTS — floor
- `pharn/floor/loop-closeout.test.mjs` — paragraph, refusal, order pin — floor test
- `pharn/floor/render-run-report.mjs` — `## SPEC amendment` — floor
- `pharn/floor/render-run-report.test.mjs` — closure (11) and the section's states — floor test
- `pharn/floor/check-regress.mjs` — AMEND_NAMES in PIPELINE_ARTIFACTS — floor
- `pharn/floor/check-regress.test.mjs` — MODEL_WRITTEN classification — floor test
- `pharn/floor/reconcile-ignore.json` — AMEND_NAMES — floor data
- `pharn/floor/worktree-fingerprint.mjs` — AMEND_NAMES in INCLUDED_ARTIFACTS — floor
- `pharn/floor/worktree-fingerprint.test.mjs` — parity, if its fixture lists names — floor test
- `pharn/floor/check-bash-reconcile.test.mjs` — parity, if its fixture lists names — floor test
- `pharn/floor/stage-agent-core.mjs` — header sentence: the spec cell re-runs once on an amend — floor
- `.claude/commands/pharn-spec.md` — amend mode — commands
- `.claude/commands/pharn-supervise.md` — `amend-spec` — commands
- `.claude/commands/pharn-loop.md` — the amend branch, S18, grants, reads — commands
- `.claude/commands/pharn-loop-close.md` — record section, summary line, claims — commands
- `.dev/floor/command-hygiene.test.mjs` — ceilings, STUCK_POINTS, front order, grants, the `.a1` writes pin — dev test
- `.dev/floor/stage-load-budget.test.mjs` — ceilings if the loads move — dev test
- `.dev/guides/floor-checks.md` — `spec-amend.mjs` section; supervisor section's exits — dev guide
- `.dev/guides/floor-orchestration.md` — the amend sentence — dev guide
- `docs/limitations.md` — the amend's cost and bound — docs
- `CHANGELOG.md` — `## [7.10.0]`, `### Added` — repo-meta
- `SKILLS_VERSION` — 7.10.0 (MINOR: a new decision and checker; no shape an install reads changes incompatibly) —
  repo-meta
- `README.md` — badge; regenerated CURRENT-STATE — repo-meta

### Not changed

- `pharn.config.json`, `MIN_CLI`; `/pharn-ship`; `--quick`; `grill-round*.mjs` (its archives move aside, its rules do
  not change); `check-spec.mjs` and `spec-template-core.mjs` (their exports are reused).

## Contracts satisfied

- `supervisor.md` (extended); `spec-template.md` (the AC grammar the amend writes and the check parses, cited);
  `grill-triage.md` (the escalated ids); `loop-record.md`.

## Evals / tests to write (P1)

No Capability. Node tests:

- `spec-amend.test.mjs`
  - A realistic templated SPEC (six criteria at unit / integration / e2e) and a real `amend-spec` decision: `begin`
    moves 6 files after a round-1 `spec` escalation and 14 at the cap; `status` goes `none` → `pending` → `applied`.
  - `check` passes an appended criterion.
  - `check` refuses, each by code: an edited Intent, an edited Scope, a removed criterion, an edited criterion, a
    reordered one, no added criterion, an unpinned SPEC.
  - `begin` refuses a second amend (`amend-used`), a `stop` decision (`not-amend-spec`), a link, and a failed rename
    (rolled back); the binding test over the four artifact lists.
  - No output prints criterion text.
- `supervisor.test.mjs`: `amend-spec` exits 4; `amend-used` once `SPEC.a1.md` exists.
- `loop-closeout.test.mjs`: the amend paragraph (ids only), the refusal on a failing amend, the order pin.
- `render-run-report.test.mjs`: SECTIONS closure (11); the section's applied / none / not-applicable states.
- `command-hygiene.test.mjs`: the amend branch order, S18, grants closed, the `.a1` writes pin, budgets.

## Guarantee audit (P0)

- "an amend happens at most once per run" → floor (`amend-used` over `SPEC.a1.md`; L35), at write time only: a Bash
  `rm` of the archive is neither prevented nor detected (the archives are pipeline artifacts reconcile exempts).
- "the intent, the scope and every earlier criterion are unchanged" → floor (byte equality against `SPEC.a1.md`).
- "the amend adds a criterion" → floor. "the added criteria answer the findings" → advisory.
- "the commit names the added criteria" → floor (tested closeout over the checked amend).
- "the run's SPEC approval" → advisory, a model's (LIMITS §1d), as before.

## Trust audit (P2)

- The amend reads `SUPERVISOR.a1.json`'s reasons and the named findings — untrusted. The added criteria inherit the tag.
- The checks read section bytes and AC ids. The commit gets ids. `RUN-REPORT.md` fences the criterion lines.
- Residual: an injected finding can steer what is added (THREAT-MODEL text 2). Bounded by the append-only rule and by
  every added criterion being named where a person reads it.

## Determinism audit (P5)

Every branch is an exit code: supervisor `0/3/4/other`, `begin` `0/other`, the spec read, `check` `0/other`. Amend mode
is chosen by `spec-amend.mjs status`'s token, never by the model reading the directory.

## Cost

One extra spec agent and one more whole front (plan, grill, triage, possibly two re-plan rounds and a second supervisor)
on an amend. Worst case per run: 6 plans, 6 grills, 6 triages, 2 supervisors, 2 specs — the brief's line with cap 2 and
one amend.

## Open questions (HALT)

- None.
