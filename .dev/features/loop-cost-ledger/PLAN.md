# PLAN — loop-cost-ledger

- spec_content_hash: b91d773cab8b0190f6bda5d5060156a62a2f813d375277895222576f454a045d # fix #4
- applied_lessons: [L1, L2, L6, L7, L10, L13, L19, L22, L23, L29, L34, L35, L36, L37, L41, L42, L43, L44, L49, L51]
- increment: Give every `/pharn-loop` run that reaches a stop — green or not — a machine-readable, deterministically-emitted cost ledger at `pharn/features/<name>/cost.json`, so a company can compute what a feature cost against its own price list.
- layer(s): pharn-contracts (L-1, the new contract) + pharn/floor/ (the floor, `pharn/ARCHITECTURE.md §2` — not a module layer) + `.claude/commands/` (the stage wiring)
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Applied lessons

- **L1** — the meta-doc sweep is scoped as files, not intentions: `CLAUDE.md` `## Commands`, `CHANGELOG.md`,
  `SKILLS_VERSION`, and the three generated regions land in `## Files` below, because `/pharn-dev-build`
  writes only what the plan names.
- **L2** — the new `cost-ledger.md` contract carries its own guarantee audit **in the artifact**, and every
  "enforced by" phrase in it may cite only a floor op I verified live this run (the three checkers below);
  the PLAN's audit is ephemeral, the contract is durable.
- **L6** — the checker reads `decision` / `iterations` from the `LOOP.md` **frontmatter** and the config
  fields from parsed JSON, never grepped from prose; `outcome` is copied from a structured location.
- **L7** — `cost.json` is deliberately **NOT** added to `/pharn-loop`'s `writes:`. The emitter writes it
  through Bash, so the Write tool never touches it; declaring it would be an over-declaration that hands the
  stage a scope it does not use.
- **L10** — `cost.json` lands under `pharn/features/`, which `validate.mjs` **does** scan (unlike `.dev/`).
  The build must confirm a `.json` artifact there trips no validate CHECK, rather than assume the `.dev/`
  asymmetry protects it.
- **L13** — this stage formats its own artifact (`prettier` + `markdownlint-cli2` scoped to this PLAN.md),
  never a repo-wide sweep.
- **L19** — both new writes (`mark-phase.mjs` → `.pharn/cost/<name>/markers.jsonl`, the emitter →
  `cost.json`) are **Bash** writes outside the `PreToolUse` gate. They are declared as such here and in
  `reconcile-ignore.json` rather than described as gate-covered.
- **L22** — every marker and emitter invocation added to `pharn-loop.md` is a **pinned literal command
  line**, never prose describing what to run; the wrong forms are named beside it.
- **L23** — `cost.json` is emitter-verbatim JSON while `/pharn-verify` owns a whole-repo `format:check`;
  it gets a `.prettierignore` entry in the same increment, the `verify-report.json` precedent, so the
  conflict cannot sit latent until the first non-empty field expands across lines.
- **L29** — `cost.json` joins **two** enumerations (`PIPELINE_ARTIFACTS`, `pipeline_artifacts.names`) that
  an existing ✧ test pins set-equal; the deliverable is both members plus the pin still ranging over them.
- **L34** — `check-cost-ledger.mjs`'s per-request and per-view assertions must not pass vacuously over an
  empty `requests[]`; a non-vacuity control accompanies every per-item rule, and an empty ledger is a
  distinct explicit state, not a silent GREEN.
- **L35** — transcript location and dedup are **imported** from `render-cost-record.mjs`, not copied; the
  question "must the second copy exist?" is answered _no_ before any sync check is considered.
- **L36** — the top-level key set is asserted **closed** (every key a member), not merely present
  per-member, so a variant spelling of any field fails rather than only the one I was looking at.
- **L37** — the `.pharn/`-not-gitignored claim is **probed by execution** in a fixture repo, including a
  member I expect to be excluded; the universal quantifier ("neither the markers nor cost.json trip …") is
  where the drift would land, so reading the guard is not the verification.
- **L41** — the emitter's `--base` default exists in exactly **one** place, and one test exercises the
  no-argument path; this is the `render-ship-briefing.mjs` defect and the same relocation-shaped trap.
- **L42** — marker timestamps and `attributionSkill` are captured **at the moment of the act** and stored
  raw; the checker deliberately does not re-derive attribution from live state, which would answer "where
  would this request land NOW".
- **L43** — `check-cost-ledger.mjs`'s bound is stated in its own header: it certifies the file's **internal
  consistency**, never that `requests[]` matches the transcript — the views and the rows can be wrong
  together. The `--verify-transcript` mode is the referent-binding half, usable only while the transcript exists.
- **L44** — the fenced blocks added to `pharn-loop.md` carry no shell state between them; any value a later
  block needs is printed by the block that computes it and substituted literally.
- **L49** — the meta-doc sweep below states its **coverage boundary**: which swept sites are checker-backed
  and which are unverified assertions.
- **L51** — increment A's lesson, from this exact file family: when reusing `render-cost-record.mjs`'s
  lookup, no guard it justifies may be dropped as "now unreachable", and the emitter's own zero-request
  path is boundary-tested rather than reasoned about.

## Discovery (live, this run — P6)

Read from disk this run; nothing below is asserted from memory.

- HEAD `a3ecc48`, tree clean. `SKILLS_VERSION` `6.4.3`, `MIN_CLI` `0.5.0`.
- **Baseline is GREEN**: `npm run check` exit 0, **2180/2180 pass, 0 skipped**. The zero-skipped reading is
  recorded deliberately (L37's corroborating instance: a self-skipping test still exits 0).
- `node .dev/floor/check-lessons-index.mjs .` → **exit 0 GREEN**, so the two-step sweep ran; canon was then
  read **in full** (51 lessons), not sampled.
- **Increment A is merged and is the mechanism to reuse.** `pharn/floor/render-cost-record.mjs` exports
  `findTranscriptDirs`, `transcriptFiles`, `aggregate`, `render`, `SCHEMA`, `COVERAGE`; the transcript is
  located **by session id** (a filename test over `<projectsDir>/*/<sessionId>.jsonl`), and the directory
  name is opaque. Nothing here re-derives it.
- **The fixture transcript still exists**: session `51a7441d-0e03-4066-8d1c-be5a2d419121`, 3.9 MB, one
  `.jsonl`, no nested subagent directory. `render-cost-record.mjs` over it → `coverage: partial`, **275
  deduped requests** from **552 raw** assistant+usage records (a ~2.0× dedup factor — the dedup is
  load-bearing here too), window `2026-09-21T08:35:42.425Z` → `09:40:52.438Z`.
- **`attributionSkill` collapses the whole run into one bucket.** 213/275 deduped requests are tagged
  `pharn-loop`; 62 are untagged. **No sub-stage is named** — not `pharn-build`, not `pharn-verify`. This is
  the measured justification for phase markers: the platform field cannot answer "which stage", so
  attribution must be a recorded VIEW over recorded boundaries.
- **The model routing did not bind, in the opposite direction from the 2026-08-18 measurement.** This run
  was `model: sonnet` in frontmatter and ran `claude-sonnet-5` 213 / `claude-opus-5` 62. The measurement's
  §2 records `build` configured `sonnet` running **opus-5 456 (79%)**. Two runs, two different skews —
  which is exactly why `model` is stored as the **full id verbatim** and never as a config alias
  (`LIMITS.md §8` owns this limit).
- **Every `usage` leaf is a number or a short token.** Enumerated over all 552 records: 16 numeric leaf
  paths, 3 string leaves (`service_tier`, `speed`, `inference_geo`), longest string **13 chars**
  (`not_available`), no `null`, no boolean. **`usage.iterations` is an ARRAY** (always length 1; its
  members duplicate the top-level numbers exactly). No absolute path appears anywhere inside `usage`.
- **Records carry the fields the schema needs**, on all 552: `requestId`, `timestamp`, `sessionId`,
  `isSidechain`, `version` (`2.1.278`), `message.model`, `message.usage`; `attributionSkill` on 437/552
  raw. **`cwd` holds two distinct values in this one session** (main repo _and_ worktree) — corroborating
  increment A's reason for retiring the cwd derivation — and `cwd`/`gitBranch` are absolute paths, so
  neither is copied into the ledger.
- **The fixture has ZERO sidechain records** (`isSidechain: false` on all 552) and no nested subagent
  directory — so it **cannot** exercise subagent attribution. A machine-wide scan of the 14 `*pharn*`
  project directories found **13,406** sidechain records across 58 nested dirs (in `pharn-cli`
  transcripts), stored at `<sessionId>/subagents/agent-<id>.jsonl`, carrying **two** agent-ish keys:
  `agentId` **and** `attributionAgent`. This is Open question **Q2**.
- `ALWAYS = [".pharn/**"]` at `.claude/hooks/enforce-writes-scope.cjs:203`, composed unconditionally into
  the allow-list — so a marker write is permitted with or without a scope set (**L40**: that permission's
  stated cause matters, and it is `ALWAYS`, not the default-safe-set).
- **This repo gitignores `.pharn/`** (`.gitignore:3`), and `reconcile-ignore.json`'s `derived_ignore`
  therefore excludes markers here **by derivation**. A user install need not, which is why Q-free
  correctness must be proven in a fixture repo without that line (L37).
- `PIPELINE_ARTIFACTS` (`pharn/floor/check-regress.mjs:86`) and `pipeline_artifacts.names`
  (`reconcile-ignore.json`) each currently hold **15** names ending at `LOOP.md`; a ✧ test at
  `check-bash-reconcile.test.mjs:422` pins them set-equal, and a neighbouring test proves a **stray** file
  in a feature dir is still reported as an escape. So `cost.json` is invisible-as-an-escape only if added
  to **both**.
- `/pharn-loop`'s `writes:` is `["pharn/features/<name>/SPEC.md", "pharn/features/<name>/LOOP.md"]`; its
  Step 6c staging list is the inline array at `pharn-loop.md:362`; `commit` is captured at `:271` **before**
  any commit, so it is the base — confirmed against the fixture (`LOOP.md:5` = `a2d73eb` = the base).
- **`pharn/pharn-contracts/` holds 9 contracts; `pharn/ARCHITECTURE.md:131-132` names 6.** Omitted:
  `reconciliation-record`, `regression-report`, `verify-report`. Reported below, not fixed by me.

## Files

- `pharn/pharn-contracts/cost-ledger.md` — NEW. The `pharn-cost-ledger/1` contract: closed key set, field
  shapes, trust classes, the attribution method's name+version, the pricing note, and its own guarantee
  audit — layer **L-1**.
- `pharn/floor/mark-phase.mjs` — NEW. Appends one `{seq, kind, stage, iteration, ts, session_id}` record to
  `.pharn/cost/<name>/markers.jsonl`. Command-neutral so `/pharn-ship` reuses it unchanged; `ts` from Node
  `toISOString()` (BSD `date` has no `%N`) — the floor.
- `pharn/floor/mark-phase.test.mjs` — NEW. Hermetic tests incl. the no-argument/default path (L41) and
  append-ordering under repeated invocation.
- `pharn/floor/render-cost-ledger.mjs` — NEW. Reads the transcript **through `render-cost-record.mjs`'s
  exported lookup** (L35), dedups on `requestId`, emits one row per request, computes the views, and
  **writes `cost.json` itself**; also prints a compact per-stage table to stdout — the floor.
- `pharn/floor/render-cost-ledger.test.mjs` — NEW. Hermetic fixtures + the recovery path (rebuild from
  markers alone after an aborted run) + the ✧ parity test against `render-cost-record.mjs` totals.
- `pharn/floor/fixtures/cost-ledger/single-session.jsonl` — NEW (**D2**). A small hermetic transcript
  derived from `loop-decision-integrity`'s real run: `usage` + ids only, no message content.
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe.jsonl` — NEW
  (**D2**, as amended). The parent turns of the **hand-authored** subagent fixture.
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-aaa1111111111111.jsonl`
  — NEW (**D2**). A sidechain file carrying the `agentId` spelling.
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-bbb2222222222222.jsonl`
  — NEW (**D2**). A sidechain file carrying the `attributionAgent` spelling, so **both** observed key
  spellings are pinned (L36) and the subagent path is not the L41/L34 blind spot.

  > **Third in-flight `## Files` correction — and this one was caught by the FLOOR, not by reading.**
  > These three entries replace a single bare-directory entry (`…/with-subagents/`). The files are written
  > by a generator through **Bash**, so no `PreToolUse` guard saw them — but
  > `check-bash-reconcile.mjs` did: verify's `reconcile` gate returned **ESCAPE** naming all three, with
  > `denied_by: "writes-scope (snapshot)"`, because a trailing-slash directory entry authorizes nothing
  > inside it. `single-session.jsonl` — a **concrete** entry written the same way — did **not** escape,
  > which is the controlled comparison that identifies the cause (**L40**: vary the attributed condition).
  > The remedy is the prescribed one: **declare the paths and re-run the setter** (CLAUDE.md, "When an
  > increment legitimately writes a tracked path through Bash"). The baseline was **not** hand-edited —
  > that silences the detector rather than answering it, and is forbidden by discipline precisely because
  > nothing would catch it.

- `pharn/floor/check-cost-ledger.mjs` — NEW. Shape, closed key set, enums, the three FLOOR rules, unique
  request ids, monotonic markers, every view **recomputed** from `requests[]`, marker completeness (WARN),
  plus a `--verify-transcript` mode — the floor.
- `pharn/floor/check-cost-ledger.test.mjs` — NEW. Includes the non-vacuity controls (L34) and a
  mutation control per FLOOR rule.
- `.claude/commands/pharn-loop.md` — EDIT. Marker calls (Step 1a after S2; before each sub-stage in Steps
  3/4/5 with the iteration; on orchestrator return; run-stop at the end of Step 6b), the emit step after
  Step 6b's checks and before Step 6c, `cost.json` in the Step 6c staging array (`:362`), and the Step 7
  table print.
- `pharn/floor/check-regress.mjs` — EDIT. `PIPELINE_ARTIFACTS += "cost.json"`.
- `pharn/floor/reconcile-ignore.json` — EDIT. `pipeline_artifacts.names += "cost.json"`.
- `.prettierignore` — EDIT. Exempt `pharn/features/*/cost.json` (L23).
- `SKILLS_VERSION` — EDIT. Minor bump (a newly shipped capability: contract + three floor scripts).
- `CHANGELOG.md` — EDIT. The entry recording the bump and this change.
- `CLAUDE.md` — EDIT. A `## Commands` block per new floor script, with its honest bound.
- `docs/capabilities/**`, `docs/lessons-index.md`, `README.md` `## Current state` — REGENERATED by
  `npm run docs:generate`, not hand-edited. Declared here because the plan authorizes them (L39: this
  section is read by two consumers asking different questions); the write is a Bash-run generator (L19).
- `README.md` — EDIT. The shields **version badge**, held byte-equal to `SKILLS_VERSION` by
  `check:badge`.

  > **Second in-flight `## Files` correction, recorded rather than silent.** The line above declared
  > README's **generated** `## Current state` block, which `npm run docs:generate` writes through Bash.
  > The **badge is a different site**: it sits OUTSIDE the `CURRENT-STATE` markers, in hand-written prose,
  > so no generator touches it and it needs a real Write. `check:badge` REDded on exactly that — which is
  > this plan's own **L49** point demonstrated on itself: the sweep NAMED the badge as checker-backed and
  > the `## Files` list still did not make it writable. The checker caught it because that one site
  > happens to have a checker; the sites listed as NOT checker-backed would have shipped stale in silence.

- `.dev/features/loop-cost-ledger/*` — this increment's own pipeline artifacts.
- `.dev/features/loop-cost-ledger/architecture-patch/architecture.patch` — NEW. The staged patch for the
  two `pharn/ARCHITECTURE.md` edits, for a **human** to apply. Generated by editing a throwaway
  `git worktree` of this repo and diffing, never hand-written and never verified against an out-of-repo
  copy (**L26**).
- `.dev/features/loop-cost-ledger/architecture-patch/APPLY.md` — NEW. The apply instructions, the
  pre-existing 3-of-9 contract-list drift, and the choice that belongs to the human.

  > **In-flight `## Files` correction, recorded rather than silent.** These two entries replace a single
  > bare-directory entry (`…/architecture-patch/`). The fix #7 guard **denied** the `APPLY.md` write
  > against that scope, correctly: `set-writes-scope.cjs` resolves **concrete paths**, so a trailing-slash
  > directory grants nothing inside it. The remedy taken was the prescribed one — name the paths here and
  > re-run the setter — never a Bash write around the hook. The scope narrows from a directory to its two
  > files; it does not widen.

### Deliberately NOT in scope

- `pharn/ARCHITECTURE.md` — hook-denied, human-only. Patch staged, never applied by me.
- `THREAT-MODEL.md`, `LIMITS.md`, `pharn/CONSTITUTION.md` — untouched.
- `.claude/commands/pharn-ship.md` — `/pharn-ship` wiring is a named follow-up, not this increment.
- `pharn/floor/render-cost-record.mjs` — **imported, never modified.** Increment A shipped it; changing it
  here would put this increment's parity test on both sides of its own comparison.
- `RUN-REPORT.md`, per-lens attribution (`agent_id` → lens), `/pharn-dev-ship` cost, standalone stages —
  named follow-ups, out of scope.
- No price table, in any file, ever.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` — NEW; this increment authors it (cited, not restated — P4).
- `pharn/pharn-contracts/loop-record.md` — `outcome` is copied **verbatim** from the `LOOP.md` envelope
  this contract defines; the ledger adds no second source of truth for the decision.
- `pharn/pharn-contracts/reconciliation-record.md` — the `pipeline_artifacts` exemption shape this
  increment adds a member to.

## Evals to write (P1)

No `role:`-bearing capability is added, so `validate.mjs`'s eval binding does not apply. The equivalent
obligation is discharged as hermetic tests with non-vacuity controls (L34) at ≥90% line coverage
(`node --test --experimental-test-coverage`):

- `mark-phase` → append N markers → exactly N JSONL lines, `seq` strictly increasing, each line parses.
- `mark-phase` → invoked with no `--base` → writes to the single default path (L41 no-argument control).
- `render-cost-ledger` → the committed hermetic transcript fixture → byte-identical `cost.json` on a second
  run (determinism: no clock read).
- `render-cost-ledger` → markers present, transcript absent → recovery: record rebuilt from markers alone,
  `coverage: unavailable` + note, **never** a silent zero-row `partial` (L51's exact failure direction).
- `render-cost-ledger` → zero matching requests → explicit empty state, boundary-tested.
- `render-cost-ledger` → the **with-subagents** fixture → sidechain rows are included, each carries its
  `agent_id`, and both real key spellings resolve (**D2**, L36).
- `render-cost-ledger` → `usage.iterations[]` is **walked**, its scalars validated by the same leaf rule,
  and `dropped[]` is `[]` on real data; a synthetic object-valued leaf is what makes `dropped[]` fire
  (**D1**).
- ✧ parity → single-session fixture: ledger `totals` == `render-cost-record.mjs` totals over the same
  bytes, with the class-name mapping asserted explicitly (see Q4).
- `check-cost-ledger` → one mutation control per FLOOR rule: an out-of-set top-level key; a `usage` leaf
  that is an object; a string matching the absolute-path regex; a duplicate `request_id`; a non-monotonic
  `seq`; a view that disagrees with a recompute from `requests[]`.
- `check-cost-ledger` → **non-vacuity**: a ledger with `requests: []` does not pass the per-request rules
  silently; and each per-item rule's RED disappears when that rule alone is disabled.

## Guarantee audit (P0)

- "`cost.json`'s top-level key set is closed" → **floor: enum** (`check-cost-ledger.mjs`, membership both
  directions — no extra key, no missing required key).
- "every `usage` leaf is a number, bool, null, or a short token" → **floor: enum-regex**; anything else is
  **dropped and its key path listed** in `dropped[]`.
- "no string anywhere in the file matches the absolute-path regex" → **floor: regex**.
- "**no message content and no home paths are in the file**" → this is a **CONSEQUENCE** of the three rules
  above, **not a detector**. The claim "no usernames" is **struck** and will not appear in any artifact: no
  regex proves it. What is guaranteed is exactly what the three rules test.
- "every view equals a recompute from `requests[]`" → **floor: arithmetic recompute + equality**
  (the `check-ship-briefing.mjs` cross-field-equality precedent).
- "`request_id`s are unique" / "`markers[].seq` is strictly increasing" → **floor: set membership +
  integer compare**.
- "the same transcript bytes produce the same `cost.json`" → **floor: content-hash**-checkable; the emitter
  reads no clock and no randomness (window bounds come from the records' own timestamps).
- "`cost.json` is exempt from the reconciler as a pipeline artifact" → **floor: enum**, pinned set-equal
  across two files by an existing ✧ test.
- "`requests[]` matches the transcript" → **ADVISORY** by default (**L43** — the checker certifies internal
  consistency; the rows and the views can be wrong together). **Floor ONLY under `--verify-transcript`,
  and only while the transcript exists** — a machine-local, perishable guarantee, stated as such.
- "a request belongs to the stage of the latest marker at-or-before its `ts` in the same session" →
  **ADVISORY, a named and versioned VIEW.** The raw facts are floor-recorded; the attribution method is a
  documented function over them and may be recomputed differently later.
- "the markers describe what actually ran" → **ADVISORY.** They are written by the orchestrator through
  Bash, outside the `PreToolUse` gate (**L19**); nothing forces a marker call, and a skipped one yields a
  WARN with a count, never a silent merge into a neighbour.
- "the ledger is complete" → **struck.** `coverage ∈ {partial, unavailable}` has no `complete` member, for
  the same reason `render-cost-record.mjs` has none: the stop's own turns are still being written.
- "the ledger says what the feature cost in money" → **struck.** It records **tokens**. Cost is
  `Σ tokens[class] × price(model, class, date, tier)` against **the reader's own price list**, and is
  **list-price equivalent** — a subscription is not billed per token.
- "`/pharn-loop` emitted a ledger" → NEVER "the spend was justified". It annotates; it gates nothing and
  cannot flip any verdict (fix #3).

## Trust audit (P2)

The transcript is **untrusted input**: it contains this repo's own prose, tool output, and any content the
run read — including hostile content a reviewed file may have carried.

- **Nothing from message bodies enters the ledger.** Only `usage` (numbers + 3 short enum-ish tokens),
  `requestId`, `timestamp`, `sessionId`, `model`, `isSidechain`, the agent id, and `attributionSkill` are
  copied. Message `content` is never read.
- **`attributionSkill` and `model` are attacker-influencable in principle** and are carried as **verbatim
  DATA**, rendered as JSON string values. They key a **view**, never a gate: no proceed/stop in
  `/pharn-loop` reads `cost.json`, and `check-loop.mjs`'s inputs are unchanged.
- **The absolute-path regex is a floor backstop, not a sanitizer.** It fails the file closed if a path-shaped
  string reaches any field; it does not certify the absence of other sensitive content.
- **The ledger is committed on a green stop**, so a tainted token would become durable. That is bounded by
  the leaf-shape rule (a ≤N-char token, no control chars) — the `merge-findings.mjs` `RULE_ID_OK`
  composition discipline (**L14**: the shape regex layers _after_ the control-char guard, never replaces it).

## Determinism audit (P5)

- Every branch is a membership or integer test: `coverage ∈ {partial, unavailable}`; leaf `typeof ∈ {number,
boolean}` ∪ `null` ∪ token-regex; `kind ∈ {run-start, stage-start, orchestrator, run-stop}`; `seq`
  comparison; view equality.
- Attribution is "the latest marker with `ts ≤` the request's, same session" — a total order over recorded
  values, with a defined terminal case (`unattributed`), never a judgment.
- The emitter's terminal fallback on an unusable transcript is an honest `unavailable` record; the
  checker's terminal fallback on an unusable ledger is RED. Neither guesses.

## Meta-doc sweep — with its coverage boundary (L49)

**Checker-backed** (an omission REDs a gate): `SKILLS_VERSION` ↔ README badge (`check:badge`);
`CHANGELOG` version key (`check:changelog`); the three generated regions (`docs:check` byte-equality);
`PIPELINE_ARTIFACTS` ↔ `pipeline_artifacts.names` (the ✧ set-equality test).

**NOT checker-backed** — unverified assertions, and I am saying so rather than implying the sweep is
uniform: the `CLAUDE.md` `## Commands` additions, the contract's prose, every honest-bound header, and the
`pharn/ARCHITECTURE.md` patch. Nothing reads shipped prose (**L33**, **L37**), so these rest on review.

## Reported, not fixed — a doc drift for the human

`pharn/pharn-contracts/` holds **9** contracts; `pharn/ARCHITECTURE.md:131-132` names **6**. Omitted:
`reconciliation-record`, `regression-report`, `verify-report`. Adding `cost-ledger` makes it 10 named 6.
The staged patch adds `cost-ledger` **and** offers the three omissions as a separate hunk, so the human
decides whether to close the pre-existing drift in the same edit. `ARCHITECTURE.md:217-218` ("the
per-feature artifacts (`findings.json`, `ship-record.json`) are the other durable files") is the second
patch site.

## Open questions (HALT) — all five RESOLVED at the plan gate

Raised after discovery, answered by the human before any build. Recorded here, not dropped.

- **D1 — `usage.iterations[]` → RECURSE.** Array elements are walked like object values; every scalar
  inside is validated by the same leaf rule, so the contract's word **verbatim** stays true. Consequence
  accepted and stated: `dropped[]` is `[]` on the real fixture, so its non-vacuity rests on a **synthetic**
  object-valued leaf (L34) rather than on real data.
- **D2 — subagent coverage → ADD A SECOND FIXTURE.** A small hermetic fixture derived from a real
  sidechain-bearing transcript (usage + ids only, no message content). The `sidechain` / `agent_id` path
  therefore ships with **real-data** coverage rather than the L41/L34 blind spot, and **both** observed
  agent key spellings — `agentId` and `attributionAgent` — are pinned (**L36**).
- **D3 — write path → THE EMITTER WRITES `cost.json` ITSELF.** The `render-review-assignments.mjs` (#220)
  precedent: a model never retypes hundreds of numbers. This is a **Bash** write outside the fix #7
  `PreToolUse` gate (**L19**), declared as such in `## Files` and covered by the `pipeline_artifacts`
  exemption — never described as gate-covered.
- **D4 — token class names → KEEP `input` / `output_thinking`, ASSERT THE MAPPING.** The ledger's class
  names are its contract with a price list, so they stay 1:1 with the price dimensions. The ✧ parity test
  asserts the explicit mapping to `render-cost-record.mjs`'s `input_uncached` / `thinking` — binding the
  values to their referent (**L43**) instead of letting two spellings drift silently.
  `render-cost-record.mjs` stays **unmodified**.
- **D5 — marker set → THE FULL SET, INCLUDING ORCHESTRATOR RETURNS.** run-start (Step 1a, after S2);
  stage-start before each sub-stage in Steps 3/4/5 carrying the iteration; an **orchestrator** marker when
  control returns from a sub-stage; run-stop at the end of Step 6b. Without the return markers the
  orchestrator's own turns between stages are billed to the stage that just finished. **Stated bound:** a
  stop **before S2** has no feature directory and records nothing.

## Amendments accepted at the post-grill gate (human-directed)

`/pharn-dev-grill` measured two things the plan had not, and the human ruled on both before any build.
Recorded here because a decision revised at a gate must not look like the decision originally taken.

- **D1 STANDS, with its price now on the record.** `usage.iterations[]` is still **recursed**, so
  `verbatim` stays true. **Measured cost, stated rather than discovered later: ~393 KiB of committed JSON
  per green stop** (275 deduped rows → 402,567 bytes pretty-printed; 258.3 KiB minified), of which the
  verbatim `usage` copy is ~263 KiB and `iterations[]` is pure duplication of the fields beside it. The
  contract **and** the `CLAUDE.md` entry must state this figure. `dropped[]` is consequently `[]` on real
  data and its non-vacuity rests on a synthetic object-valued leaf (**L34**).
- **D2 AMENDED → hand-author the subagent rows, AND guard every committed fixture.** The
  `with-subagents/` fixture is **hand-authored from the observed record shape** (both key spellings,
  `agentId` and `attributionAgent` — **L36**), so **no real third-party transcript data is committed**.
  `single-session.jsonl` stays derived from this repo's own `loop-decision-integrity` run, stripped to
  `usage` + ids. **Both are covered by a standing guard:** `check-cost-ledger.mjs`'s absolute-path regex
  is asserted over the bytes of **every** committed fixture, with a non-vacuity control (**L34**), so the
  guard ranges over fixtures added later too (**L29** — the enumeration is the deliverable).
  This closes the grill's one blocking-severity finding: the plan's "no message content" was a
  description of intent, and in this repo an intent is not a check.
- **Accepted as stated, not silently:** the remaining grill concerns are folded into the build — the
  determinism claim is re-scoped to "same transcript **and markers** bytes"; the `cost-record` /
  `cost-ledger` schema overlap is recorded in the contract with the `/pharn-ship` wiring follow-up that
  would resolve it (**L35**); the artifact-exemption firing window is stated; torn-line handling in
  `markers.jsonl` mirrors the sibling renderer's tolerant read; and `--verify-transcript` is retained with
  its trigger recorded honestly as **L43**-motivated, not failure-triggered (**P7**, the `check-plan-lessons`
  sub-check D precedent).

## Known residual, named not hidden

`cost.json` is emitted **after** `check-loop-decision.mjs` and **before** Step 6c, so on a green stop it
lands inside the loop's own commit. The ledger therefore describes a run whose final turns — including the
emission itself — are still being written. That is why `coverage` has no `complete` member, and it is a
bound, not a defect to fix.
