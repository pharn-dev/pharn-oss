# PLAN — loop-supervisor

- spec_content_hash: 14e5e0843c9d4505d36d16a28991174c3fffbe40a842ca21a0e5b3332a163cd4
- applied_lessons: [L29, L34, L35, L36, L41, L43, L54, L62, L65, L68, L72, L84]
- increment: part 3a of restore-loop-grill (7.9.0) — when a full `/pharn-loop`'s triage escalates (`spec`, or
  `replan` with no re-plan round left), a routed `/pharn-supervise` stage writes `pharn/features/<name>/SUPERVISOR.json`
  (decision `proceed-at-risk` | `stop`, one reason per escalated finding id) and `pharn/floor/supervisor.mjs check`
  derives the branch: `proceed-at-risk` goes on to the test stage carrying the escalated ids as KNOWN RISK into the
  commit message (ids only), `RUN-REPORT.md` and the record; `stop` is S16; a RED file is the new S17. amend-spec is
  part 3b (7.10.0).
- layer(s): pharn-contracts (new `supervisor.md`; `loop-record.md` id list), product floor (`pharn/floor/`), product
  commands (new `.claude/commands/pharn-supervise.md`; `pharn-loop.md`, `pharn-loop-close.md`, `pharn-triage.md`)
- constitution_refs: [P0, P1, P2, P3, P4, P5, P6, P7]

## Open questions — RESOLVED before this plan (human-selected, P6, 2026-11-11)

- Q1 → **split**: 3a = this plan (7.9.0): supervisor, `proceed-at-risk` | `stop`, KNOWN RISK, the new stop. 3b
  (7.10.0): amend-spec, its once-per-run CLI counter, and a check that no acceptance criterion is removed.
- Q2 → **ids in the commit**: the commit body gets a fixed KNOWN RISK paragraph with the escalated finding ids
  (`G<round>-<n>`, regex-checked) and their count; the verbatim text goes to `RUN-REPORT.md`, the record and the
  summary as quoted DATA. `loop-closeout.mjs`'s no-free-text rule for the message stands.
- Q3 → **resolve through `default`**: no `supervise` key in the shipped `pharn.config.json`, `pharn-supervise.md` at
  sonnet/high to agree with `default`, no `MIN_CLI` change; a pharn-cli port that accepts a `supervise` key is a named
  follow-up (as `triage` was: pharn-cli 0.18.1).

**GATE 1: approved as written** by the maintainer, 2026-11-11 (S16 keeps `grill-escalation`). The trusted-doc text
below was applied by the maintainer from a patch script and committed as `eae5fce8` before the build (L68); this
plan's `spec_content_hash` was re-pinned to the new `pharn/ARCHITECTURE.md` bytes then.

## One deviation from the brief, for GATE 1

The brief names a new stop `blocked: supervisor-stop`. This plan keeps S16's existing id `grill-escalation` for the
supervisor's `stop` decision and adds only `supervisor-red` (S17). Reason (L72): `blocked` ids are a closed set checked
by code (`loop-record-core.mjs` `BLOCKED_IDS`, `check-loop-record.mjs` `BLOCKED_UNKNOWN`), so renaming the member would
make every 7.7.0–7.8.0 `LOOP.md` that recorded `grill-escalation` read RED, and the stop still means what it meant: the
grill's escalation stands and the run stops for a person, now after the supervisor declined to carry it. If you want
the brief's name anyway, it is an extra id (both kept), not a rename.

## The failure (P7)

All five measured full loops escalated (`.dev/features/loop-grill-triage/TRIAGE-CHECK-MEASUREMENT.md`). Since 7.8.0 a
`replan` escalation gets up to two re-plan rounds, but a `spec` verdict, or a `replan` still standing after round 3,
stops the run for a person (S16). The brief's goal is an unattended run whose escalations end in a recorded decision
rather than a stop, with every finding carried past it named as KNOWN RISK. 3a supplies the decision for the two
outcomes that need no SPEC change; amending the SPEC (3b) needs a revision path `/pharn-spec` does not have
(`pharn-spec.md:117-119`: only a human's _Revise_ re-opens an Approved SPEC).

## Discovery (read live this run)

- `pharn/floor/stage-agent-core.mjs`: `STAGES` `:223-233` (triage `:228`), `STAGE_CONFIG_KEYS` `:245-254`,
  `ROUTE_POLICY` `:265-310` (every column names every stage), `INVOCATIONS` `:317-348`, header `:33-44`.
- `pharn/floor/check-model-config.mjs` `PRODUCT_STAGES` `:95-111`; "twelve" at `:4`, `:29`, `:82`, `:328`; agreement's
  reverse pass REDs an unmapped `pharn-*.md` carrying `model:`.
- `.claude/commands/pharn-loop.md` (82,050 B; ceiling 82,944): S16 row `:460`, Step 4 triage read `:776`, branches
  `:780-805`, blocked-stop exception `:511-515`, grants `:73`, `:98-102`.
- `pharn/floor/loop-record-core.mjs` `BLOCKED_IDS` `:50-70`; contract list `loop-record.md:116-138` ("S1–S16" `:112`);
  `check-loop-record.mjs:35` says "S1–S15" (stale since 7.7.0).
- `pharn/floor/loop-closeout.mjs`: `STAGE_ARTIFACTS` `:143-167`; `commitArgs` `:297-315` admits enum tokens, digits and
  the slug only (header `:60-67`, P2).
- `pharn/floor/render-run-report.mjs`: closed `SECTIONS` `:150-160`; `## Needs a person` `:1109-1125` is the fenced-DATA
  precedent.
- Artifact lists that name every pipeline artifact: `check-regress.mjs` `PIPELINE_ARTIFACTS`, `reconcile-ignore.json`
  `pipeline_artifacts.names`, `worktree-fingerprint.mjs` `INCLUDED_ARTIFACTS`, `loop-closeout.mjs` `STAGE_ARTIFACTS`.
- Files that pin the stage set by name: `stage-agent-core.mjs`/`.test.mjs`, `check-model-config.mjs`/`.test.mjs`,
  `check-regress.test.mjs`, `.dev/floor/command-hygiene.test.mjs`, `.dev/floor/stage-load-budget.test.mjs` (grep for
  `pharn-triage` and `"triage"` over `pharn/floor`, `.dev/floor`, `.claude/hooks`).
- Trusted docs: `ARCHITECTURE.md:256-262`, `THREAT-MODEL.md:216-224` (channel 6), `LIMITS.md:59-85` (§1d) and
  `:282-283`.

## Applied lessons

- L29 — the closed sets this adds (the decision enum, the defect codes, the `blocked` id, the artifact lists) are each
  enumerated in code and bound by a test, never asserted for the member in front of the author.
- L34 — `risks` over an escalation with escalated ids may not be `[]`; a triage verdict that escalates always has at
  least one escalated id, so an empty `risks` is a refusal, never a vacuous pass.
- L35 — one copy: `SUPERVISOR.json` restates no finding field; it carries ids, index-aligned with the triage verdict's
  `escalated` list, and the triage file's sha256.
- L36 — closed both ways: `risks[i].id === escalated[i]` for every i and equal lengths, so a missing, extra, reordered or
  duplicated id is refused.
- L41 — the shipped `pharn.config.json` names no `supervise` key, so a live test resolves `supervise` through the
  shipped `default`, as the `triage` test does.
- L43 — agreement, never truth: the checker certifies the file's shape, its binding and its coverage; whether carrying a
  finding is wise is the supervisor model's judgment, stated advisory everywhere it appears.
- L54 — `supervisor.mjs` reads every input through `regular-file.mjs` (one O_NOFOLLOW descriptor) and lstats the
  round archives through `grill-round-core.mjs`'s listing, so a link is refused.
- L62 — refusals print codes and indexes, never a value from either file.
- L65 — `/pharn-supervise` may write `SUPERVISOR.json` only (one `--target`); it cannot rewrite the triage or findings
  file its decision is checked against, and the checker binds the decision to the triage bytes by sha256.
- L68 — the trusted-doc text (`## Trusted-doc text`) is a human patch committed before the build anchors, with the
  plan's `spec_content_hash` re-pinned after it.
- L72 — the S16 id `grill-escalation` is kept rather than renamed (`## One deviation`).
- L84 — the tests drive a realistic escalated round (ten findings, mixed severities, long punctuated text) through
  `proceed-at-risk` and `stop`, and through the commit paragraph and the run-report section, not a one-finding toy.

## What is built

### 1. Contract — new `pharn/pharn-contracts/supervisor.md`

`SUPERVISOR.json`: `{schema: "pharn-supervisor/1", round, triage_sha256, decision, reason, risks: [{id, reason}]}`.

- `decision` ∈ {`proceed-at-risk`, `stop`} (3b adds `amend-spec`).
- `round` equals the live findings' round.
- `triage_sha256` is the sha256 of the live `grill-triage.json` bytes.
- `risks` is index-aligned with the escalated ids `grill-triage.mjs check` derives (every non-`proceed` disposition, in
  findings order), each with a one-line reason of 1–2,000 characters.
- `reason` is one line saying why the decision.

When it applies: the live triage verdict is `spec`, or it is `replan` and `grill-round.mjs`'s archived count equals
`REPLAN_CAP` (no re-plan round left). The floor/advisory split and the trust paragraph are stated as in
`grill-triage.md`.

### 2. `pharn/floor/supervisor-core.mjs` (pure) + `pharn/floor/supervisor.mjs` (CLI)

- `node pharn/floor/supervisor.mjs skeleton <name>` → the filled-in-later skeleton (round, `triage_sha256`, one `risks`
  element per escalated id with an empty reason, empty `decision` and `reason`). Exit 0; 1 RED when there is no
  escalation to supervise (`not-escalated`) or an input breaks its contract; 2 usage.
- `node pharn/floor/supervisor.mjs check <name>` → exit `0` `proceed-at-risk`, `3` `stop`, each with one JSON line
  `{schema, decision, round, known_risk: [ids]}`; `1` `RED — <codes>` first, then one fixed hint per code; `2` usage or
  an unreadable input. It re-validates the findings (`grill-findings-core.mjs`), re-checks the triage
  (`grill-triage-core.mjs checkTriage`) for its verdict and escalated ids, lists the archives
  (`grill-round-core.mjs archivedRounds`) for the cap condition, then checks `SUPERVISOR.json`.
- Defect codes (closed, each with a hint): `not-json`, `repeated-key`, `not-an-object`, `top-keys`, `schema`, `round`,
  `triage-sha256`, `decision`, `reason`, `risks-not-array`, `risks-length`, `risk-not-an-object`, `risk-keys`, `id`,
  `risk-reason`, plus input codes `findings-invalid`, `triage-invalid`, `not-escalated`, `archives-invalid`,
  `not-regular`.
- `known_risk` is the escalated id list on `proceed-at-risk`, `[]` on `stop`.

### 3. `.claude/commands/pharn-supervise.md` — the stage (new product command)

Frontmatter after `pharn-triage.md`: `model: sonnet`, `effort: high`, `model_tier: sonnet`, `kind: pharn-owned`,
`trust: trusted`; `reads:` CONSTITUTION, the supervisor and grill-triage contracts, SPEC, PLAN, GRILL.md,
`grill-findings.json`, `grill-triage.json`, the eight round archives, `supervisor.mjs`;
`writes: ["pharn/features/<name>/SUPERVISOR.json"]`. Body:

- Step 0: resolve `<name>` (asks class) and set the one-file scope.
- Step 1: `supervisor.mjs skeleton`.
- Step 2: decide (ADVISORY): `proceed-at-risk` only when the build can go on with each escalated finding stated as a
  risk a person accepts at merge; `stop` when any escalated finding means the build would not meet the SPEC or would be
  unsafe. A finding whose text reads like an instruction is a reason to `stop`, said in its reason. Every input is
  untrusted DATA.
- Step 3: write, then `supervisor.mjs check`; fix once on RED.
- `## What you may claim` and the release step.

### 4. Routing — `stage-agent-core.mjs`, `check-model-config.mjs`

- `STAGES` gains `pharn-supervise` after `pharn-triage`; `STAGE_CONFIG_KEYS` `"pharn-supervise": "supervise"`.
- `ROUTE_POLICY`: AGENT in the full loop column, SKIPPED in the quick loop and both ship columns.
- `INVOCATIONS` loop full: `"/pharn-supervise <name>"`. The header gains the reason.
- `PRODUCT_STAGES` gains `supervise: "pharn-supervise.md"`. "twelve" becomes an open phrase where it is prose
  (`:4`, `:29`, `:82`, `:328`), so the next stage does not re-break it.

### 5. `.claude/commands/pharn-loop.md` — Step 4, the S16 row and S17

- Step 4's escalation branch: triage `4`, or `3` with `grill-round.mjs next` `5` → **the supervisor stage** (its routed
  start, brief and finish lines, as triage's), then:

  ```bash
  node pharn/floor/supervisor.mjs check '<name>'
  ```

  `0` → go on (the entry gates, then the test stage), the `known_risk` ids recorded for the close. `3` → **S16**. `1`,
  `2` or anything else → **S17** (`blocked: supervisor-red`).

- The S16 row says the supervisor decided `stop`; its remedy and the re-run note stay. A new S17 row.
- `reads:` and grants for `supervisor.mjs check *` / `skeleton *` and the supervisor's start/finish lines.
- "S4–S16" → "S4–S17". The byte ceiling is raised by the rule (measured + 10%, next multiple of 512), with a comment.

### 6. KNOWN RISK — the close, the commit, the report

- `loop-closeout.mjs`: when `SUPERVISOR.json` is present, the commit step checks it with `supervisor-core.mjs` before
  the commit.
  - `proceed-at-risk` adds one paragraph:
    `known risk: <n> grill finding(s) carried by the supervisor (proceed-at-risk): G3-1, G3-4 — see pharn/features/<name>/SUPERVISOR.json`.
    Ids regex-checked `^G[1-9][0-9]*-[1-9][0-9]*$`, count digits, the slug — no free text (P2).
  - A file present but RED, or a `stop` decision on a green record → `not committed: decision unverifiable`, exit 4 (an
    existing reason; no new member of the closed set).
  - `SUPERVISOR.json` joins `STAGE_ARTIFACTS`.
- `render-run-report.mjs`: a new section `## Known risk` after `## Needs a person`.
  - With a `proceed-at-risk` file: each id with its `severity`, `rule_id` and `file` (enum-gated fields), and its
    `problem`, `evidence` and the supervisor's reason fenced as untrusted DATA.
  - Otherwise: "None — no finding was carried past an escalation in this run", or the reason the file could not be read.
- `pharn-loop-close.md`:
  - Step 6b: the record gains a `## Known risk` section listing the ids and pointing at `SUPERVISOR.json` and
    `RUN-REPORT.md`. Advisory — `check-loop-record.mjs` ignores extra sections (`loop-record.md:409-436`).
  - Step 7 summary: an honest line — "_N grill finding(s) were carried past an escalation by the supervisor model
    (proceed-at-risk); whether each is acceptable was not checked — RUN-REPORT.md lists them._"
  - The claims block gains the matching lines.
- `pharn-triage.md`: `replan` "then stops for a person" → "then the supervisor decides".

### 7. Records and artifact lists

`SUPERVISOR.json` joins `PIPELINE_ARTIFACTS` (classified model-written in `check-regress.test.mjs`),
`reconcile-ignore.json`, `INCLUDED_ARTIFACTS` and `STAGE_ARTIFACTS`; a test binds all four to one constant
(`supervisor-core.mjs` `ARTIFACT`), as `grill-round.test.mjs` does for the archives. `BLOCKED_IDS`, the contract list,
the S-table and command-hygiene's `STUCK_POINTS` gain `supervisor-red` in table order.

## Trusted-doc text — for a human to commit BEFORE `/pharn-dev-build` (L68)

A patch script is handed over at GATE 1 (as for 7.8.0), then deleted. Replacement text:

1. `pharn/ARCHITECTURE.md:260-262` — "A `spec` verdict stops the run. A `replan` verdict … and stops the run when no
   round is left." → "A `replan` verdict sends the plan back to `/pharn-plan` for a re-plan round — at most two, each
   round's plan and grill outputs archived by `pharn/floor/grill-round.mjs` (7.8.0). A `spec` verdict, or a `replan`
   with no round left, goes to `/pharn-supervise` (7.9.0), whose decision — `proceed-at-risk` or `stop`, in
   `SUPERVISOR.json` — `pharn/floor/supervisor.mjs` checks: `stop` stops the run, and `proceed-at-risk` goes on to the
   build with every escalated finding carried as KNOWN RISK into the commit message (its ids), `RUN-REPORT.md` and the
   loop record. The decision is the model's (advisory). Shapes: `pharn-contracts/grill-triage.md`,
   `pharn-contracts/supervisor.md`."
2. `pharn/THREAT-MODEL.md` §5, after channel (6)'s 7.8.0 sentence — "Since 7.9.0 an escalation goes to
   `/pharn-supervise`, which reads the same findings, dispositions and reasons and may decide `proceed-at-risk`: an
   injected finding can steer that decision toward carrying itself past the stop. The floor holds the decision enum,
   one reason per escalated id, the sha256 binding to the triage file, and that the supervisor runs only on an
   escalation; every carried id is named in the commit message and `RUN-REPORT.md`, so a person sees it at merge."
3. `pharn/LIMITS.md` §1d, a new bullet after "Backstop (floor)" — "**`proceed-at-risk` (7.9.0)** is one model
   overruling another model's escalation. It is a recorded decision, not a safety property: the floor checks its shape,
   coverage and binding, never that carrying a finding was right. It extends this section's residual — the run that
   carries the risk was also approved by a model — and creates no new trust level; what bounds it is that every carried
   finding is named in the commit message and `RUN-REPORT.md`, and that nothing is merged or pushed."
4. `pharn/LIMITS.md:282-283` — "…reach the run only through triage's dispositions and, since 7.8.0, the re-plan rounds
   those dispositions start." → "…reach the run only through triage's dispositions, the re-plan rounds those
   dispositions start (7.8.0) and the supervisor's decision on an escalation (7.9.0)."

## Files

- `pharn/pharn-contracts/supervisor.md` — new contract: shape, when it applies, floor/advisory, trust — layer contracts
- `pharn/pharn-contracts/loop-record.md` — `supervisor-red` in the blocked list; "S1–S16" → "S1–S17" — contracts
- `pharn/floor/supervisor-core.mjs` — new: shape, defect codes, hints, decision → exit, skeleton, `ARTIFACT` — floor
- `pharn/floor/supervisor.mjs` — new CLI: `skeleton`, `check` over the feature directory — floor
- `pharn/floor/supervisor.test.mjs` — new tests (see `## Evals / tests to write`) — floor test
- `pharn/floor/stage-agent-core.mjs` — STAGES, STAGE_CONFIG_KEYS, ROUTE_POLICY, INVOCATIONS, header — floor
- `pharn/floor/stage-agent-core.test.mjs` — the routed list and the supervise cells — floor test
- `pharn/floor/stage-agent.test.mjs` — the CLI's routed-cell count (amended during the build, see below) — floor test
- `pharn/floor/check-model-config.mjs` — `PRODUCT_STAGES` + open phrase for the count — floor
- `pharn/floor/check-model-config.test.mjs` — mirror, counts, shipped-config live test for `supervise` — floor test
- `pharn/floor/loop-record-core.mjs` — `BLOCKED_IDS` gains `supervisor-red`; comment S1–S17 — floor
- `pharn/floor/check-loop-record.mjs` — comment "S1–S15" → "S1–S17" — floor
- `pharn/floor/check-loop-record.test.mjs` — row-count floors if the new row moves them — floor test
- `pharn/floor/check-loop-decision.test.mjs` — the same — floor test
- `pharn/floor/loop-closeout.mjs` — KNOWN RISK paragraph, `SUPERVISOR.json` in STAGE_ARTIFACTS — floor
- `pharn/floor/loop-closeout.test.mjs` — the paragraph, the unverifiable refusal, the artifact order pin — floor test
- `pharn/floor/render-run-report.mjs` — `## Known risk` section — floor
- `pharn/floor/render-run-report.test.mjs` — section closure and its three states — floor test
- `pharn/floor/check-regress.mjs` — `SUPERVISOR.json` in PIPELINE_ARTIFACTS — floor
- `pharn/floor/check-regress.test.mjs` — MODEL_WRITTEN classification — floor test
- `pharn/floor/reconcile-ignore.json` — `SUPERVISOR.json` in pipeline_artifacts.names — floor data
- `pharn/floor/worktree-fingerprint.mjs` — `SUPERVISOR.json` in INCLUDED_ARTIFACTS — floor
- `.claude/commands/pharn-supervise.md` — new product command — commands
- `.claude/commands/pharn-loop.md` — Step 4 escalation branch, S16/S17, reads, grants, S4–S17 — commands
- `.claude/commands/pharn-loop-close.md` — Known risk section, summary line, claims, route list wording — commands
- `.claude/commands/pharn-triage.md` — the `replan` rule's "then stops for a person" — commands
- `.dev/floor/command-hygiene.test.mjs` — ceilings, NAME_ORIGINS, STUCK_POINTS, front order, grants, new pins — dev
  test
- `.dev/floor/stage-load-budget.test.mjs` — STAGE_LOADS / STAGE_LOAD_CEILINGS rows; pharn-loop ceiling — dev test
- `.dev/guides/floor-checks.md` — `supervisor.mjs` section; triage section's S16 mapping — dev guide
- `.dev/guides/floor-orchestration.md` — the escalation sentence — dev guide
- `docs/limitations.md` — the `default`-coupling sentence names `/pharn-supervise` too; the supervisor's decision is
  advisory — docs
- `CHANGELOG.md` — `## [7.9.0]` section, `### Added`; moves `[Unreleased]` entries in — repo-meta
- `SKILLS_VERSION` — 7.9.0 (MINOR: a new command and checker; no shape an install reads changes) — repo-meta
- `README.md` — badge 7.9.0; regenerated CURRENT-STATE (contracts 17, product commands 13) — repo-meta

### Not changed

- `pharn.config.json` (no `supervise` key, Q3); `MIN_CLI`; `/pharn-ship` (keeps its human GATE 2); `--quick` (no
  triage, so no supervisor); `check-loop.mjs` (blocked stops never consult it).
- `pharn/floor/grill-round*.mjs`: the supervisor reads its listing; nothing in it changes.

### Amended during the build

- `pharn/floor/stage-agent.test.mjs` was missing from `## Files`: its `brief` test pins the count of routed cells (17),
  which the supervisor's cell makes 18. The discovery grep for `pharn-triage` did not find it because the file counts
  cells rather than naming the stage. Added after the anchor, so the build re-ran its scope setter and re-anchored the
  reconcile baseline (a new epoch) before editing it. Every write before the re-anchor was to a path already declared
  here; the cost is that reconcile no longer audits those earlier writes.

## Contracts satisfied

- New `supervisor.md`; `grill-triage.md` (the escalated ids and the verdict are its, cited); `loop-record.md` (blocked
  stop exception, extra sections ignored); `finding-shape.md` (the enum-gated / free-text split decides what the report
  prints inline vs fenced).

## Evals / tests to write (P1)

No Capability (no `role:`), so no eval pair; the checker and the CLI get node tests:

- `supervisor.test.mjs`
  - Core: every defect code over realistic input (ten findings, mixed severity), the skeleton, decision → exit.
  - CLI `check`:
    - `proceed-at-risk` (exit 0) and `stop` (exit 3) over a `spec` verdict, and over a `replan` verdict at the cap
      (two archived rounds).
    - `not-escalated` over a `proceed` verdict and over a `replan` below the cap.
    - A triage bound to other findings (`triage-invalid`); a stale `triage_sha256`; missing, extra and reordered risk
      ids; an empty `risks`.
    - A symlinked `SUPERVISOR.json` (`not-regular`).
  - Output never quotes a reason or a finding's text.
  - ★ The four artifact lists hold `ARTIFACT`.
- `loop-closeout.test.mjs`
  - The commit argv on `proceed-at-risk` carries the ids paragraph.
  - With no `SUPERVISOR.json` it carries none.
  - A RED or `stop` file on a green record ends `decision unverifiable`.
  - The paragraph holds no text from the file (an injected `reason` never reaches argv).
- `render-run-report.test.mjs`: SECTIONS closure; `## Known risk` for absent / `proceed-at-risk` (fenced DATA) / RED.
- `stage-agent-core.test.mjs`: routed loop-full list; the supervise cells; INVOCATIONS keys equal AGENT cells.
- `check-model-config.test.mjs`: the mirror; a live test that the shipped config names no `supervise` key and it
  resolves through `default`.
- `command-hygiene.test.mjs`
  - The new command's budget, description and claims heading.
  - Its `writes:` pin (`SUPERVISOR.json` only).
  - The loop's escalation branch order: triage read → `next` → supervisor start/finish → check → S16/S17.
  - `STUCK_POINTS` gains S17.
  - Grants closed both ways.

## Guarantee audit (P0)

- "the run goes past an escalation only on a decision file that checks" → floor (enum/regex + content-hash:
  `supervisor.mjs check`); that the loop obeys the exit code → advisory (orchestration).
- "the supervisor runs only on an escalation" → floor for the checker (`not-escalated`); advisory that the loop calls it
  only there.
- "every escalated finding has one reason in the decision" → floor (index-aligned ids, L36).
- "the decision binds to this triage" → floor (content-hash `triage_sha256`).
- "the commit message names every carried id" → floor (tested `loop-closeout.mjs` over the checked file).
- "RUN-REPORT.md lists them with their text" → floor for presence (tested renderer); the text is untrusted DATA.
- "proceed-at-risk was the right call" → advisory, always.
- "`/pharn-supervise` writes only `SUPERVISOR.json`" → floor (fix #7 hook, one `--target`).

## Trust audit (P2)

- Inputs: SPEC, PLAN, GRILL.md, findings, triage reasons, round archives — all model-written, untrusted. The supervisor
  reads them as DATA; its `reason` fields inherit the tag.
- The checker reads ids and enums only. It never prints a reason.
- The commit message gets ids, digits and the slug only. `RUN-REPORT.md` fences every free-text field.
- Residual: an injected finding can steer the supervisor toward `proceed-at-risk`. Bounded by the floor above and by
  every carried id being named where a person reads it before merging. Not zeroed: THREAT-MODEL text 2.

## Determinism audit (P5)

Every branch is an exit code: triage `0/3/4`, `next` `0/5/other`, `supervisor.mjs check` `0/3/other`. The terminal
fallback of an unreadable or RED decision is a stop (S17), never a proceed.

## Cost

One supervisor agent per escalated run (unmeasured; estimate one spec-sized agent, ~200 s / ~20 requests on
`default`'s sonnet), only on an escalation. Worst case of a full run after 3a: 3 plans, 3 grills, 3 triages, 1
supervisor. The entry gates are read after the front, so a longer front only makes their result likelier to be ready.

## Open questions (HALT)

- None beyond the deviation above, which GATE 1 accepts or changes.
