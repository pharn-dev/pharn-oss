# PLAN — ship-quick-mode: `/pharn-ship --quick`, a shorter run for a small change

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f # fix #4
- applied_lessons: [L1, L2, L3, L6, L7, L10, L13, L17, L18, L19, L22, L25, L26, L27, L29, L31, L33, L34, L35, L36, L37, L38, L41, L42, L43, L44, L45, L47, L49, L50, L52, L57, L60, L62]
- increment: `/pharn-ship --quick` runs a `spec_kind: quick` mini-SPEC (1–3 criteria, each `unit` or `integration`) through both human gates, the grill's two floor stops without the interrogation, test-first AC evidence, the build and `/pharn-verify`, and skips `/pharn-regress`, `BRIEFING.md` and `RUN-REPORT.md`; its ledger outcome is `gate2-quick`, never `gate2`.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (L-1, schemas only), product commands (`.claude/commands/pharn-*.md`), shipped doc (`pharn/floor/README.md`), trusted docs (`LIMITS.md`, `pharn/ARCHITECTURE.md` — human-applied patch), repo-meta (`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SKILLS_VERSION`). No `role:` capability.
- constitution_refs: [P0, P1, P2, P3, P5, P6, P7]
- stage model: plan — model routed via Agent subagent; effort not routed · grill — model routed via Agent subagent; effort not routed
- base: `main` at `767bf61` (SKILLS_VERSION 6.22.0, MIN_CLI 0.5.0). Bumps to **6.24.0** (minor). Both sibling phases also bump; whichever merges later renumbers by diff. _(Renumbered from 6.23.0 by diff after `stage-regress-script` merged as 6.23.0 (`1524c6f`); main merged in at GATE 2 — see "Amended at GATE 2 (merge of main)". PROVISIONAL: `writes-scope-run-only` is set to merge first as 6.24.0, after which this phase renumbers once more.)_
- gate1: APPROVED 2026-09-26 — a model decision by the orchestrator under the maintainer's 2026-09-25 delegation, not a human approval. Q1 → (a); the decisions for GATE 1 accepted as written.
- grill: amended after `/pharn-dev-grill` (`GRILL.md`, findings G1–G12); `## Amended after grill` lists what changed.

## Applied lessons

- **L1** — every meta-doc that states a fact this changes is in `## Files`: `CLAUDE.md` (the spine paragraph, the mark-phase usage, the ship-outcome comment), `README.md` (the badge, the paper-trail list, the usage example, the commands row, the token-cost bullet), `pharn/floor/README.md`, `CHANGELOG.md`, `SKILLS_VERSION`, and `LIMITS.md` / `pharn/ARCHITECTURE.md` through the patch.
- **L2** — the quick-mode bounds are written into the durable artifacts (the command's quick section, both contracts, the LIMITS patch), not only here, and every "floor" claim below cites an op read this run (`check-spec.mjs`, `spec-template-core.mjs`, `ship-outcome-core.mjs`, `mark-phase.mjs`).
- **L3** — adding `quick` to `SPEC_KINDS` makes a new member load-bearing, so every consumer that branches on the kind was re-audited (Discovery, "Kind consumers"). The audit found `check-ac-tests.mjs:129`, `if (spec.kind !== "feature")`, which would RED every quick mapping as "the SPEC is `spec_kind: test-infra`".
- **L6** — the run's mode is read from the run-start marker's structured `mode` field and the SPEC's kind from `check-spec.mjs --spec-kind`, never grepped from `SHIP.md` or `GRILL.md` prose.
- **L7** — `/pharn-ship` and `/pharn-grill` keep their `writes:` unchanged: quick mode writes a subset of the same artifacts, so no declaration grows.
- **L10** — the quick `GRILL.md` lands on `validate.mjs`'s scanned surface (`pharn/features/**`); it carries no finding object (`rule_id:` / `problem:`), so CHECK 5 is not engaged, and the command says to write none.
- **L13** — the build formats every file it writes (below); the quick `GRILL.md` gets no new format step, as the grill command has none today.
- **L17** — the human-only patch can be applied at any point after `/pharn-dev-build`; if it is applied before `/pharn-dev-verify`, the chain resumes there, never at `/pharn-dev-regress`.
- **L18** — the paths the agent must not touch sit under their own `###` heading in `## Files`.
- **L19** — every Bash write is declared: the patch generator's outputs (`proposed/human-only.patch`, `proposed/human-only.sha256`) and its scratch under `.pharn/pharn-dev-build/`, and the scoped formatter runs.
- **L22** — every new command line is pinned literally: the quick run-start line, the `--spec-kind` line (in `/pharn-ship` and `/pharn-grill`), the invocations `/pharn-spec --quick <description>` and `/pharn-grill <name> --quick`, and the `GRILL.md` skip line.
- **L25** — rationale comments that state the old story are re-derived, not carried: `ship-outcome-core.mjs`'s header ("`gate2` needs BOTH"), `spec-template-core.mjs`'s "THE EIGHT RULES", `check-ac-tests.mjs`'s kind comment, `render-run-report.mjs`'s outcome preamble, and CLAUDE.md's ship-outcome paragraph.
- **L26** — the patch is checked against this repo's real paths (`git apply --check`), and `apply.sh` re-runs the checks on the applied bytes; the generator never writes a trusted-doc path, not even a scratch copy under that name.
- **L27** — each refusal names a remedy reachable from its own branch: `/pharn-ship`'s post-approval refusal and `/pharn-grill --quick`'s refusal both say "run it without `--quick`"; neither offers a scope or setter remedy it cannot use.
- **L29** — each quantified remedy gets its set, materialized once and iterated: the kind consumers, `SHIP_DECISION_FORMS`, the quick skip set, and the ledger/report obligations each run.
- **L31** — `/pharn-ship` and `/pharn-dev-ship` are a deliberate dev/product pair, so the dev twin's obligation is answered in writing rather than left to a per-file reading: Decision 10 records that `/pharn-dev-ship` gets no `--quick` (grill G12 declared this).
- **L33** — `LIMITS.md §3a`'s "`quick-mode` exists as a manual flag" becomes true the moment this lands, and is rewritten through the patch. `/pharn-ship`'s "runs the seven stages" claims are re-worded where quick mode makes them false.
- **L34** — every new enumeration asserts its size: five decision forms, three kinds partitioned into test-first and bootstrap, the skip set's members, and exactly one quick run-start line.
- **L35** — one owner per fact: `MARKER_MODES` lives in `mark-phase.mjs` (the writer), `TEST_FIRST_KINDS` and the quick bounds live in `spec-template-core.mjs`, and the ledger's `outcome` stores no `mode` copy, because `markers[]` already records it.
- **L36** — closures, not presence: `SHIP_DECISION_RE` gains the one new member, the `--mode` vocabulary is closed over the whole command corpus, and `SPEC_KINDS` must equal `TEST_FIRST_KINDS` ∪ {`test-infra`}.
- **L37** — each quantified sentence is probed with a member expected to fail. A quick run with a `regressions` report on disk must still derive `gate2-quick`, and a full run with no regress stage-start must never derive `gate2`. `check-ac-tests` over a quick mapping must be GREEN and over a `test-infra` mapping still RED. Exit codes are recorded in `BUILD.md`.
- **L38** — the single `.pharn/writes-scope.json` belongs to whichever stage set it last, so `APPLY.md`'s out-of-order case re-runs the plan setter before `reconcile-baseline.mjs --anchor`, and `apply.sh` judges no `.pharn/` state of the checkout it runs in (grill G2; declared at grill, G12).
- **L41** — the `--mode` default (absent) is exercised: a run-start without the flag writes no `mode` key, byte-identical to 6.22.0.
- **L42** — the mode is recorded at the moment the run starts (the run-start marker), never re-derived afterwards from the SPEC's kind, which is a different fact: a quick SPEC may run the full flow.
- **L43** — `gate2-quick` certifies agreement with the recorded markers and one verdict enum, never provenance; the contract and the module header say so.
- **L44** — no pinned block carries shell state: `--spec-kind` prints a token and the same step compares it.
- **L45** — ★ WIRING tests execute the committed quick lines (the run-start line through normalization into a derived outcome; the `--spec-kind` line in both commands), each with a negative control.
- **L47** — "the eight template rules" is retracted by an open form ("the template rules"), never by "nine".
- **L49** — the sweep (Discovery) states which sites are checker-backed and which are only read.
- **L50** — the sweep runs by referent, over every cite of "`/pharn-ship` runs `/pharn-regress`", "`gate2` implies a regress verdict", and "the kind set is {feature, test-infra}", each classified, not only by claim wording.
- **L52** — the tests are written per member: one per kind consumer, one per skipped obligation, one per decision form.
- **L57** — the scoped formatter runs pass explicit paths, `prettier --ignore-unknown` and `markdownlint-cli2 --no-globs`.
- **L60** — every new ★ test names the edit that must turn it red and runs it, and asserts every slicing anchor is found first.
- **L62** — nothing untrusted is quoted through `String()`: `--spec-kind` prints only a closed-set token or an empty line, and `mark-phase`'s `--mode` refusal names the vocabulary, not the argv value.

## Trigger (P7)

A user running PHARN in another project reports two things. First, even a tiny change must go through the whole
pipeline, which is slow and expensive. Second, their `cost.json` ledgers show PHARN's own stages at about 81% of
relative cost on three small fixes, with `/pharn-regress` about 63% of that (weights: input 1, cache write
1.25/2, cache read 0.1, output 5; an older installed version, lower-bound coverage). The maintainer chose three
levels on 2026-09-25: plain work without PHARN (Phase 0.2), `--quick` for small changes (this phase), and the full
pipeline for large features. The decisions D1–D12 of the brief are fixed. `LIMITS.md §3a` already claims
"`quick-mode` exists as a manual flag"; that is false today, and this phase makes it true.
`.dev/measurements/token-cost-2026-08-18.md` ("Fan-out proportionality") reached the same shape independently:
a manual `quick-mode` flag, not automatic scaling, because `churn` explains too little of the cost to scale on.

## Discovery (P6) — live state read this run

- `HEAD` = `767bf61` (6.22.0). `SKILLS_VERSION` 6.22.0, `MIN_CLI` 0.5.0. Lessons index GREEN
  (`check-lessons-index.mjs` exit 0). The ARCHITECTURE pin above is `.dev/floor/hash-doc.mjs`'s output.
- **The kinds.** `spec-template-core.mjs:79` `SPEC_KINDS = ["feature", "test-infra"]`; rule 8 checks membership;
  `specKindOf()` is the one reading; `check-spec.mjs`'s `pinHash` hashes any `spec_kind:` line in front of the body,
  so a kind flipped after approval is drift for any member. `specVerdict()`: `null` → UNUSABLE 2, `test-infra` →
  BOOTSTRAP 4, anything else → TEMPLATED 0.
- **Kind consumers**, every one read, classified (L3/L29; checker-backed = a test pins it today):
  - `spec-template-core.mjs` `specVerdict` — quick falls to TEMPLATED as written; made explicit via
    `TEST_FIRST_KINDS`; its invalid-kind line hard-codes `{feature, test-infra}` → **changes**.
  - `check-ac-tests.mjs:129` full mode — `spec.kind !== "feature"` REDs `spec-kind` with the test-infra message →
    **changes** (the one blocking defect; without it `check-test-stage` reads `mapping-red` for every quick SPEC).
    Its `:138` message hard-codes the set → **changes**.
  - `check-test-stage.mjs` — branches on `check-ac-tests --spec` exit codes → **unchanged** in logic; its `:249`
    message says "a feature SPEC" → reworded to "a test-first SPEC".
  - `ac-gate-core.mjs` — branches on `specVerdict().token` → **unchanged** in logic (quick → `testFirst`); its
    `:199` message says "the SPEC is spec_kind: feature" → reworded.
  - `ac-tests-lock.mjs` — reads the kind only on the bootstrap paths (`:247`, `:407`) → **unchanged**.
  - `red-run-core.mjs`, `check-red-run.mjs`, `loop-fresh-core.mjs` — no kind branch → **unchanged**.
  - `/pharn-plan`, `/pharn-test` — branch on `check-ac-tests --spec` → **unchanged**. `/pharn-loop` passes
    `--require-test-first`, which a quick SPEC satisfies (READY test-first) → **unchanged**.
- **`/pharn-ship` today** (1120 lines): Step 1 pending-start → `/pharn-spec` (GATE 1) → the named run-start
  with `--adopt-pending`; Step 2 plan → grill (two exits read) → test (`check-test-stage`) → build → regress
  (`.verdict`) → verify (`.verdict`, INCOMPLETE → Step 2b once); 2c `BRIEFING.md`; 2d PR display; 3 `SHIP.md`;
  3a run-stop, base SHA, `cost.json` + check, `RUN-REPORT.md`; 3b attestation; Final `--clear`.
- **The outcome.** `ship-outcome-core.mjs` `deriveShipOutcome`: `gate2` iff `verdictApplicability` is `current`
  (the current run started BOTH `VERDICT_STAGES` at its latest iteration) ∧ verify `PASS` ∧ regress
  `no-regressions`; else `stop:<last stage-start>`; `undetermined` on an unknown window. `SHIP_DECISION_RE`
  `^(gate2|undetermined|stop:…)$`; `SHIP_DECISION_FORMS` has 4 members, tested for closure, reachability and the
  floor subset `{gate2}`. `render-run-report.mjs` imports `verdictApplicability` to label `## Verdicts`; the
  cost-ledger contract promises "a report the outcome excluded never appears as an unqualified current verdict"
  and "the label travels with the value" (the `## Outcome` preamble lists every form).
- **Markers.** `mark-phase.mjs` writes `{seq, kind, stage, iteration, ts, session_id}` plus `origin: "pending"` on
  an adopted run-start. `render-cost-ledger.mjs` `normalizeMarkers` keeps only those keys (`origin` only as the
  literal). `check-cost-ledger.mjs` checks `markers[].kind`/`seq` but no per-marker key set, and rule 7 checks
  `outcome.decision` as a bounded token, not a closed vocabulary. So an old checker reads a ledger carrying a
  `mode` key and a `gate2-quick` decision GREEN: **no schema bump** (`pharn-cost-ledger/2` stays).
- **Hygiene pins quick mode touches**, each read:
  - `command-hygiene.test.mjs` PHASE_MARKER_WIRING — "exactly one `--kind run-start`" per command, and "ADOPTION:
    exactly one named run-start" (a second, quick run-start line breaks both → carve-out).
  - PENDING_START_WIRING — `indexOf("--kind run-start")` must follow `--pending-start` (the quick section must sit
    AFTER Step 1).
  - OBLIGATIONS — every emitter carries the ledger, the check AND the report line (the full lines stay; quick's
    skip gets its own pin).
  - `render-run-report.test.mjs` RENDERER_INVOKERS — the FIRST render line must follow the FIRST ledger check and
    precede `## Step 3b` (the quick section must not repeat either line).
  - `check-test-stage.test.mjs` ★ — `pharn-ship.md` pins `check-test-stage.mjs <name>` exactly once (the quick
    section must not repeat it).
  - `check-spec.test.mjs` — RULE_CASES "covers all eight kinds", and a ★ test that `/pharn-spec`'s Draft step names
    the kinds `check-spec` emits.
- **The referent sweep (L50)**, classified:
  - **becomes false, edited:** `pharn-ship.md`'s description and `:50` / `:925` / `:1095` ("orchestrator over
    stages 1–7", "runs the seven stages", "over every stage before it"); `ship-outcome-core.mjs`'s header and
    `SHIP_DECISION_FORMS`; `cost-ledger.md` "Within the derived form" and "The verdicts count only…"; the
    `render-run-report.mjs` preamble; CLAUDE.md's ship-outcome paragraph ("`gate2` also needs BOTH…"); the kind
    set in `spec-template.md`, `spec-template-core.mjs`, `check-ac-tests.mjs`, `pharn-spec.md`'s description and
    Step 3; "the eight (template) rules" in `pharn-spec.md` (`:54`, `:294`), `spec-template-core.mjs` (`:23`, `:29`,
    `:487`) and `check-spec.test.mjs` (`:504`, `:769`); README's paper-trail list `:62-76` ("`GRILL.md` — pre-build
    interrogation", `REGRESSION.md`, and "`/pharn-ship` … writes `cost.json`, `RUN-REPORT.md`"; the first two were
    missed by the plan's first sweep and added at grill, G6) and `:742`; `LIMITS.md §3a` (patch).
  - **stays true, unchanged, with the reason:** `LIMITS.md §6`'s older backstop ("it fires only if `/pharn-regress`
    runs" — already bounded); `LIMITS.md §9` (a quick SPEC gets test-first evidence, exactly as stated for a
    templated SPEC); `THREAT-MODEL.md` (no new ingestion path, no trust-boundary move); `pharn/ARCHITECTURE.md §5`
    ("`RUN-REPORT.md` … are the other durable files" names kinds, not that every run writes one); the `/pharn-dev-*`
    commands (no dev quick mode).
  - **Coverage (L49):** checker-backed after this build are the kind set (rule 8/9 tests, the partition), the
    decision vocabulary (closure), the quick lines (★ WIRING) and the skip set (hygiene). The prose sites (README,
    CLAUDE.md, contracts, LIMITS/ARCHITECTURE) are read-only verified; no checker reads them.
- **Siblings in flight** (both plans read with `git show`):
  - `writes-scope-run-only` adds `run-marker.mjs --open pharn-ship '<name>'` after Step 1's run-start and
    `--close` in the Final step, and rewords every product command's Final step. Quick mode keeps that lifecycle:
    its delta replaces only the run-start line, so `--open` runs right after the quick one. Its RUN_MARKER_WIRING
    anchor must match only the full run-start line (the later merge reconciles). It also patches `LIMITS.md` §7/§8,
    which does not overlap §3a, but the whole-file sums of whichever patch is applied second must be regenerated.
  - `stage-regress-script` makes `/pharn-regress` a thin script caller and adds `pharn/pharn-contracts/stage-exit.md`
    (its Q1 deferred ARCHITECTURE §4; the brief folds that line into this patch). Quick mode skips regress, so the
    interaction is the §4 line and one reworded `pharn-ship.md` sentence; its full-mode regress wiring is untouched.

## Design

### 1. The mini-SPEC — `spec_kind: quick` (D1)

- `spec-template-core.mjs`:
  - `SPEC_KINDS = ["feature", "test-infra", "quick"]`.
  - `TEST_FIRST_KINDS = ["feature", "quick"]` — the kinds `/pharn-test` treats test-first. A test pins that
    `SPEC_KINDS` is exactly `TEST_FIRST_KINDS` ∪ {`test-infra`}, disjoint (L36), so a fourth kind fails until it
    is classified.
  - `QUICK_KIND = "quick"`, `QUICK_MAX_ACS = 3`, `QUICK_LEVELS = ["unit", "integration"]`, exported once (L35).
  - `specVerdict`: TEMPLATED for a `TEST_FIRST_KINDS` member (explicit, no fall-through); the invalid-kind line
    enumerates `SPEC_KINDS`.
- **Rule 9 (`quick`)** in `checkTemplate`, on a templated SPEC whose kind is `quick`:
  - more than `QUICK_MAX_ACS` items → RED `quick` ("N criteria — a quick SPEC carries at most 3");
  - an item verified at a level outside `QUICK_LEVELS` → RED `quick` naming the line and AC id ("… a quick SPEC's
    criteria are `unit` or `integration`").
  - It is skipped when the AC section is absent, hidden or duplicated (rule 1 reports it), and per item when the
    level is malformed (rule 2 reports it), so each defect is reported once. Zero items is rule 2's RED already.
  - Applies in every state, so `/pharn-spec`'s Draft validation catches it before approval, and every downstream
    `check-spec-approved` call re-checks it (`/pharn-plan` directly; grill, test, build, regress and verify through
    `check-plan-spec-agree`).
  - **Why these two bounds, written where the next maintainer reads them** (grill G7): the contract's rule-9 row
    and the constants' comment record the reason, so neither reads as a magic number. Both are the maintainer's
    2026-09-25 decision. Quick mode keeps test-first evidence and drops the regression check, so what it may carry
    is a change whose evidence is a few fast tests: three criteria bound the change the human approves, and an
    `e2e` criterion needs the end-to-end suite, the slowest gate and one that needs its own runner, which is what
    quick mode exists to avoid. A larger or end-to-end change takes the full flow.
- **Sections (D1, decided):** a quick SPEC omits **no required section**, and writes **no optional section**.
  - **Kept:** Intent (what GATE 1 approves). Scope with its out-of-scope list: quick mode runs no regression check,
    so the non-goals are the only written statement of what the change must not touch. Acceptance Criteria (the one
    evidence quick mode keeps). Constraints (one line may do; dropping it would special-case §6's base four).
    Assumptions: the interrogation is lighter, so the recorded guesses matter more.
  - **Left out:** Scenarios, Data, Success Metrics, Open Questions — by `/pharn-spec`'s quick guidance
    (advisory). No rule forbids them: no failure motivates one (P7), and they cost a few lines.
- **The pin already covers the line** (`pinHash`), so flipping a SPEC to or from `quick` after approval is drift
  — RED at every chain check. No code change there; a test pins it for the new member.
- **A template may carry the key** (grill G8): the contract's existing bound, written for `test-infra`, is extended
  to `quick`. A project template carrying `spec_kind: quick` starts every Draft as quick. What stands between that
  and a skipped regression check is the human's approval at GATE 1 (now told the trade, §2) and the `--quick`
  token the human types: a quick SPEC run without it takes the full flow. Both are advisory.
- **`check-spec.mjs --spec-kind <SPEC.md>`** — a print mode beside `--state` and `--spec-id` (the §6 frontmatter
  facts). It prints `specAcceptanceCriteria(text).kind`: `feature`, `test-infra` or `quick` for a templated SPEC; an
  EMPTY line (exit 0) when the kind is unusable (two lines, a non-member, or a body that opens with `spec_kind:`); and
  `feature` for a legacy SPEC, whose `spec_kind` is never validated, so no legacy SPEC is ever quick. Unreadable or
  no frontmatter → exit 1 with a stderr reason, like the other print modes. The flag spells the frontmatter key
  (`--spec-id` ↔ `spec_id`), not "kind", which in this checker already names a RED kind.
- **The kind-consumer fixes** (Discovery): `check-ac-tests.mjs` full mode REDs `spec-kind` only for `null` or
  `test-infra` (via `TEST_FIRST_KINDS`); the three messages are reworded.

### 2. `/pharn-spec --quick`

- `--quick` is recognized only as the first token of the arguments, as for `/pharn-ship` (grill G3).
- Step 0/1 unchanged. An existing SPEC is resumed as today. An Approved SPEC that is not quick is never converted
  silently: the human chooses Revise (re-opens it to Draft) or keeps it, and `/pharn-ship --quick` then refuses. A
  legacy SPEC cannot be quick (no AC ids); migrating it is the human's choice.
- Step 2 runs the same checks over the smaller intent, plus three **fit checks**: at most three criteria; none
  observable only end-to-end; a `test` runner PHARN can find. A miss is said plainly, with the choice: narrow the
  intent, or write a full SPEC (no `spec_kind` line), after which `/pharn-ship --quick` stops at its kind check and
  the human re-runs without `--quick`.
- Step 3 writes `spec_kind: quick` in the frontmatter (never as the body's first line), 1–3 criteria at `unit` or
  `integration`, no optional section. The Draft validation lists the `quick` RED kind with the others.
- **Step 4 names the trade at the gate that approves it** (grill G5). For a quick SPEC, the approval question is
  preceded by one fixed sentence: approving this quick SPEC means a `/pharn-ship --quick` run looks for no
  regression outside the feature and does not interrogate the plan (`/pharn-ship`'s `## Quick mode`, which this
  build writes; `LIMITS.md §3a` only once the human patch lands). Before this, the human first met that list in
  `SHIP.md`, at GATE 2, after the checks it names had already been skipped.
- **`--quick` with `--model-approve`** → report back blocked, write nothing quick. No shipped command passes both;
  Phase 3.2 decides the loop (P5: an unhandled combination stops, it is not guessed).
- The description's kind enumeration and "the eight template rules" (×2) are corrected (L47: an open form).

### 3. `/pharn-grill --quick` — and what `GRILL.md` records (D3)

The grill stage keeps owning its artifact (P3); `/pharn-ship --quick` invokes `/pharn-grill <name> --quick`.

- Step 0 as written (setter). Step 1: existence of PLAN/SPEC as written, then the eligibility check with the pinned
  `--spec-kind` line; anything but `quick` → HALT, write nothing, and say "run `/pharn-grill <name>` without
  `--quick`". PLAN/SPEC/finding-shape are not read (nothing is interrogated; the checkers hash them).
- Steps 2 and 2b exactly as written (both floor stops, both exits read, a RED still writes the RED grill-log, with
  a `mode: quick` line added).
- Steps 3 and 3b are **skipped**: no interrogation, no installed-skills scan, no griller.
- Step 4, GREEN at both stops — `GRILL.md` holds exactly:
  - the header line both modes share: the two floor results, `chain: GREEN` and `lessons: GREEN`, worded as Step 4
    already words them;
  - `mode: quick (/pharn-grill --quick, spec_kind: quick)`;
  - the pinned line `interrogation NOT performed — skipped by mode (quick)`, followed by: the plan was not
    interrogated, no griller ran, and no finding was sought, so none is reported — this is not a "no findings"
    result;
  - a closing sentence: the two floor results are the run's only grill claims; `/pharn-grill <name>` without
    `--quick` interrogates the plan.
  - **No `ADVISORY VERDICT` line** (none was formed) and **no finding object** (L10).
- `check-loop-fresh.mjs` check I needs only that `GRILL.md` exists, so a quick grill-log satisfies it
  (membership only); Phase 3.2 makes `/pharn-loop` quick-aware.

### 4. `/pharn-ship --quick` — the quick section (D2, D4–D8)

A new section headed ``## Quick mode — `/pharn-ship --quick` (6.24.0)`` is placed **after Step 1 and before
Step 2** (PENDING_START needs Step 1's lines first). Step 1 gains a one-line pointer to it. **`--quick` is recognized
only as the FIRST token of the arguments** (grill G3): anywhere else it is part of the description, which is
untrusted prose (P2), so a pasted description that contains `--quick` can never switch a run into quick mode. The
membership test is on that one position (P5), and the flag is removed before the description is passed on. The
deltas, in step order — every other line of Steps 1–3b and the Final step runs exactly as written:

1. **Step 1:** invoke `/pharn-spec --quick <description>`. Replace the named run-start line with the pinned quick
   line below. Every other Step-1 line (the pending start first, and, once the sibling lands, the run-marker
   `--open`) runs unchanged, in order.

   ```bash
   node pharn/floor/mark-phase.mjs --name '<name>' --kind run-start --adopt-pending --mode quick
   ```

2. **Step 2, the GATE-1 backstop:** after `check-spec-approved.mjs` exits 0, read the kind:

   ```bash
   node pharn/floor/check-spec.mjs --spec-kind pharn/features/<name>/SPEC.md
   ```

   Proceed only on exit 0 and the exact token `quick`. Anything else (`feature`, `test-infra`, an empty line, a
   non-zero exit) is a STOP: `--quick refused: the approved SPEC is not spec_kind: quick`. The remedy is to re-run
   `/pharn-ship <description>` without `--quick`: the SPEC resumes and the full flow runs. A STOP here still runs
   Steps 3 and 3a (with the quick deltas).

3. **The grill step:** invoke `/pharn-grill <name> --quick`. Its markers and the two-exit verdict read run
   unchanged.
4. **The test and build steps:** unchanged (D4).
5. **The regress step: skipped.** No `/pharn-regress`, no markers for it, no `regression-report.json` read (D5). A
   one-line pointer is added at that step. _(Amended at GATE 2 — review F3: its scope check is KEPT, as a new
   command item 7 between this one and verify; the command's items 7–11 became 8–12.)_
6. **The verify step:** unchanged. `PASS` → GATE 2; `INCOMPLETE` → Step 2b; `FAIL`/`INCONCLUSIVE` → STOP.
7. **Step 2b:** re-build (iteration 2), then re-verify (iteration 2). The regress re-run and its two markers are
   skipped. Proceed only on re-verify `PASS`; anything else STOPs; still no second retry.
8. **Steps 2c and 2d: skipped** (D6). No `BRIEFING.md`, so no PR handoff either: its only input is `BRIEFING.md`,
   and `SHIP.md` was never designed as a PR body. A pointer is added at each.
9. **Step 3:** `SHIP.md` records `mode: quick` and a `## Not checked in quick mode` list, plainly (D8):
   - **regressions outside the feature** — no base comparison ran (`/pharn-regress` was skipped), so a break the
     feature's own tests and the head gates do not exercise is not looked for;
   - **the plan interrogation** — `/pharn-grill --quick` ran its two floor stops only, and no griller ran;
   - **the briefing and the run report** — no `BRIEFING.md` and no `RUN-REPORT.md` (`cost.json` is emitted and
     checked as always).

   A full run records `mode: full`. `ship-record.json`'s advisory roll-up carries the same `mode`.

10. **Step 3a:** items 1–3 (run-stop, base SHA, `cost.json` + check) unchanged, so `cost.json` is kept (D6);
    item 4 (the run report) skipped with a pointer; item 5 presents the emitter's table and the checker's verdict,
    and no report tables.
11. **Step 3b and the Final step:** unchanged.

The section also carries "What quick mode claims, and what it does not" (§ Guarantee audit below, in its words),
and the GATE-2 presentation names the "Not checked" list. `/pharn-ship`'s description gains one sentence, and its
`reads:` gains `pharn/floor/check-spec.mjs`. Sweep edits: the "seven stages" / "stages 1–7" / "every stage before
it" sentences gain the quick qualifier; "What `/pharn-ship` does NOT do" gains "quick mode is not `--yolo`: both
gates stay, and what it skips is listed".

### 5. The ledger outcome `gate2-quick` (D9)

- **The mode is recorded at the start of the run (L42).** `mark-phase.mjs` gains `--mode <m>`: `m` must be in
  `MARKER_MODES = {"quick"}` and the kind must be `run-start`, else exit 2 and nothing is written. The marker then
  carries `mode: "quick"`, and with no flag it carries no key at all (L41). `QUICK_MODE` is exported beside
  `MARKER_KINDS`. The printed line appends `(mode quick)`.
- `render-cost-ledger.mjs` `normalizeMarkers` keeps `mode` only as a `MARKER_MODES` member, the `origin` precedent,
  so `cost.json`'s `markers[]` records it, and a garbage value is dropped (read as full).
- `ship-outcome-core.mjs`:
  - `runMode(markers)` → `"quick"` iff the CURRENT run's run-start (`currentRunMarkers(...)[0]`) carries
    `mode === QUICK_MODE`, else `"full"`. The comparison is exact equality at read time. An earlier run's quick
    run-start never makes the current run quick.
  - `verdictStages(mode)` → `VERDICT_STAGES` (full) or `QUICK_VERDICT_STAGES = ["pharn-verify"]`.
  - `verdictApplicability` uses the run's stages and additionally returns `{mode, stages}`.
  - `deriveShipOutcome`: quick ∧ `current` ∧ verify `PASS` → **`gate2-quick`**. The regression verdict is never
    consulted in quick mode, so a report left on disk by an earlier run is ignored. Full mode is byte-for-byte as
    today. _(Superseded at GATE 2: conditions (a) and (b) apply in both modes, and change the full-mode table only
    on marker trails a compliant run never writes.)_ Stops keep `stop:<stage>` in both modes; the mode is read from `markers[]`, and no `outcome.mode` key
    is added, because the key set is closed in `check-cost-ledger` rule 7 and an old checker would RED it.
  - `GATE2_QUICK = "gate2-quick"`; `SHIP_DECISION_RE = ^(gate2|gate2-quick|undetermined|stop:…)$`;
    `SHIP_DECISION_FORMS` gains the member `gate2-quick` (`parameterized: false`, `floor: true`), whose `means`
    reads: a `--quick` run, verify `PASS` on this run's own verify stage, and no regression verdict read, because
    quick mode runs no `/pharn-regress`.
  - **Why the token** (decided, per the brief): it names where the run ended first (`gate2`), as `stop:<stage>`
    does, and the mode second. Every consumer compares `decision` by equality (grep: `render-run-report.mjs:613`,
    the tests), so no reader takes it for `gate2`; the contract and the preamble say "`gate2-quick` is not `gate2`".
- **Either misreading under-claims, never over-claims.** A quick run whose `--mode quick` marker was skipped reads
  as full: it has no regress stage-start, so its outcome is `stop:pharn-verify`, never `gate2`. A full run whose
  run-start wrongly says quick yields `gate2-quick`, which claims no regress verdict at all. _(Superseded at
  GATE 2 — review F1: true only for a WRITTEN run-start; a SKIPPED one joined an unclosed earlier run's window
  and derived `gate2`. Re-derived with applicability conditions (a) and (b); see "Amended at GATE 2".)_
- `render-run-report.mjs` (the renderer is not run in quick mode, but a manual render of a quick ledger is legal
  input, and the contract's two promises must hold for it):
  - the `## Outcome` preamble gains a `gate2-quick` bullet, and its "only verdicts of this run" sentence names the
    quick stage set;
  - for a quick ship ledger, `## Verdicts` renders the regress line as "not part of this run: a quick
    `/pharn-ship` run starts no `/pharn-regress`", never a report's verdict from disk.
- `cost-ledger.md`: a `markers[].mode` row (ADVISORY, a marker field), the decision vocabulary, the quick
  applicability, and the render note.

### 6. Hygiene carve-outs (D10) — full-mode pins keep their strength

`.dev/floor/command-hygiene.test.mjs`:

- **PHASE_MARKER_WIRING** "exactly one run-start" and ADOPTION "exactly one named run-start" count the run-start
  lines **without `--mode`** — still exactly one per command, which is the full-mode pin unchanged.
- **QUICK_MODE_WIRING** (new, one materialized object, L29). The quick run-start line appears exactly once in the
  corpus, in `pharn-ship.md`, carrying `--adopt-pending`. Every `mark-phase.mjs` line carrying `--mode` carries
  exactly `--mode quick` (closure over the corpus, L36). The `## Quick mode` section, both anchors asserted found
  (L60), holds the `--spec-kind` line and names each member of the skip set: `/pharn-regress`, the Step-2b regress
  re-run, Step 2c, Step 2d, Step 3a item 4. It states `cost.json` is kept. Each skip site carries its one-line
  pointer. `pharn-grill.md` pins its `--spec-kind` line and the skip literal. `pharn-spec.md` pins the literal
  `spec_kind: quick` and its Step-4 trade sentence (grill G10). The `SHIP.md` quick bullet names its three items —
  no base comparison, the plan interrogation, `BRIEFING.md` and `RUN-REPORT.md` (grill G10). Both `/pharn-ship` and
  `/pharn-spec` state that `--quick` is read only as the first token (grill G3).
- **OBLIGATIONS** (ledger + check + report) keeps all three lines required for every emitter; its comment gains
  the carve-out sentence, and QUICK_MODE_WIRING pins that quick keeps the first two.
- Mutation controls, one per asserted property (L60): drop `--mode quick`, spell it `--mode fast`, move the kind
  line out of the section, drop one skip pointer, add a second quick run-start — each must fail its rule.

### 7. The human-only docs (D11) — `proposed/`, generated, tolerant

- **Edits** (the build may tighten the wording; the facts are fixed here for the grill):
  - `LIMITS.md §3a`: keep the paragraph's first sentences (the fan-out problem), drop the false clause, and add:

    > **The manual flag is `/pharn-ship --quick` (6.24.0), and it trades checks for cost.** A human chooses it for
    > a `spec_kind: quick` SPEC: one to three acceptance criteria, each verified at `unit` or `integration`. It
    > keeps both human gates, the grill's two floor stops, the test-first evidence for those criteria and
    > `/pharn-verify` with its AC gate, and it does not check three things: **no regression outside the feature is
    > looked for** (`/pharn-regress` does not run, so nothing compares base and head); **nobody interrogates the
    > plan** (`/pharn-grill --quick` runs its floor stops and no griller); and **no `BRIEFING.md` or
    > `RUN-REPORT.md`** is written (`cost.json` is). Its ledger outcome is `gate2-quick`, never `gate2`. Nothing
    > measures whether a change is small: the kind and the flag are what a person chose, and a quick SPEC run
    > without the flag takes the full pipeline. There is still no AUTOMATIC proportionality, and `/pharn-review`'s
    > lens fan-out is unchanged.

  - `pharn/ARCHITECTURE.md §6`, a paragraph after the `test` paragraph:

    > **Quick mode** (`/pharn-ship --quick`, 6.24.0) runs a shorter spine for a small change: a `spec_kind: quick`
    > SPEC (one to three criteria, each `unit` or `integration`), `plan`, the grill's floor stops without its
    > interrogation, `test`, `build` and `verify` as above, and **no `regress`**, so nothing looks for a
    > regression outside the feature. Both human gates stay, and the ledger outcome is `gate2-quick`, never
    > `gate2`. Bounds: `LIMITS.md §3a`; shape: `pharn-contracts/spec-template.md`, `pharn-contracts/cost-ledger.md`.

  - `pharn/ARCHITECTURE.md §4` **(conditional)**: `ac-tests, spec-template` → `ac-tests, stage-exit, spec-template`
    (before `spec-template`, so "the default SPEC template it defines" still binds to it). Included
    **iff** `pharn/pharn-contracts/stage-exit.md` exists when the patch is generated. After the edit, the list must
    name every `pharn/pharn-contracts/*.md` stem, else the generator exits 1 naming the missing ones. So the patch
    never carries a §4 line that disagrees with what merged: a contract that merged under another name, or any
    other contract §4 lacks, fails the generator loudly, naming the stem, and the fix is one edit to the
    generator's list (grill G9 — the generator does not adapt on its own). _(Included since the merge of main:
    `stage-regress-script` put `stage-exit.md` on `main` as 6.23.0, and the regeneration printed
    `stage-exit: present` — "Amended at GATE 2 (merge of main)".)_

  - `LIMITS.md §6` **(added at the GATE-2 re-review, N3)**: the scope check's first bound, "it fires only if
    `/pharn-regress` runs", gains "— or, since 6.24.0, `/pharn-ship --quick`'s item 7, which runs the same partition
    without the rest of that stage". Quick mode runs that partition itself, so the bound understated the check.

- **Generator** `.dev/features/ship-quick-mode/handoff/make-patch.mjs`, committed so the orchestrator can regenerate
  after a sibling merge (a deviation from the precedent, which deleted its staging sources; the reason is the
  brief's tolerance ask). Node stdlib, `spawnSync` with argv arrays only (no shell strings, no `$VAR`, no heredoc —
  the forms an isolated worktree refuses). It never writes a trusted-doc path:
  1. read `LIMITS.md` and `pharn/ARCHITECTURE.md`; apply its embedded edits **in memory**; each `find` must match
     exactly once, else exit 1 having written nothing;
  2. decide the §4 edit from the presence of `stage-exit.md`, and run the completeness assertion; then the
     **marker-preservation invariant** (grill G1): for every site and citation `.dev/floor/specified-primitives.json`
     registers in `LIMITS.md` or `pharn/ARCHITECTURE.md`, the edited text contains the string exactly when the
     original does, else exit 1 — the in-memory form of `check:markers`, without writing a trusted-doc copy
     anywhere; `validate.mjs`'s CHECK 5 predicate (a text holding both `rule_id:` and `problem:` must keep the split
     vocabulary) holds on each edited text; and the edited `pharn/ARCHITECTURE.md` holds no CR, which is what
     `hash-doc.test.mjs`'s LF-identity test reads (Chain sequencing, item 1, lists these readers);
  3. write the before/after texts to `.pharn/pharn-dev-build/ship-quick-mode-patch/{a,b}/<file>.txt` (scratch
     names never equal to a trusted path); `git diff --no-index` (exit 1 = "differs" is success); rewrite the
     headers to `a/LIMITS.md` / `b/LIMITS.md` and `a/pharn/ARCHITECTURE.md` / `b/…`; write
     `proposed/human-only.patch`;
  4. `git apply --check proposed/human-only.patch` against the working tree (writes nothing);
  5. write `proposed/human-only.sha256` (`<hex>  <path>`, `shasum -c` format) from the in-memory results;
  6. print `stage-exit: present|absent` and the new ARCHITECTURE pin (the `hash-doc.mjs` fold) for `APPLY.md`;
     remove the scratch directory.
- **`apply.sh`**, pinned verbatim here because the human runs it with their own privileges (grill G4). The build
  writes it byte-for-byte, substituting only `EXPECT_STAGE_EXIT` from the generator's printed line. It is the
  precedent's shape **minus the reconcile checkpoint and the re-anchor** (grill G2): Q1 puts the apply at GATE 2,
  after the last `/pharn-dev-verify`, so there is no later epoch for a re-anchor to serve. The checkpoint would
  judge the applying checkout's own `.pharn/` baseline — in the orchestrator's main checkout that is a stale epoch
  from some other run, which exits 1 and aborts a correct apply.

  ```sh
  #!/bin/sh
  # apply.sh — the HUMAN-run apply step for .dev/features/ship-quick-mode: LIMITS.md §3a and §6, and
  # pharn/ARCHITECTURE.md §6 (and §4 when stage-exit.md is present). Read proposed/human-only.patch first. Run
  # from the repo root, on the phase branch, at GATE 2 after the last /pharn-dev-verify:
  #   sh .dev/features/ship-quick-mode/proposed/apply.sh
  set -eu
  F=.dev/features/ship-quick-mode/proposed
  EXPECT_STAGE_EXIT=absent # written by the build from make-patch.mjs's "stage-exit:" line
  [ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit a trusted-doc change on main" >&2; exit 1; }
  if [ -f pharn/pharn-contracts/stage-exit.md ]; then HAVE=present; else HAVE=absent; fi
  [ "$HAVE" = "$EXPECT_STAGE_EXIT" ] || { echo "apply.sh: stage-exit.md is $HAVE, the patch expects $EXPECT_STAGE_EXIT - regenerate: node .dev/features/ship-quick-mode/handoff/make-patch.mjs" >&2; exit 1; }
  git apply --check "$F/human-only.patch"
  git apply "$F/human-only.patch"
  if ! { shasum -a 256 -c "$F/human-only.sha256" && node pharn/floor/validate.mjs . && node .dev/floor/check-specified-markers.mjs . && node --test .dev/floor/hash-doc.test.mjs; }; then
    git checkout -- LIMITS.md pharn/ARCHITECTURE.md
    echo "apply.sh: FAILED - both files were restored from the index (git checkout --), which is HEAD unless you staged edits to them; nothing was committed" >&2
    exit 1
  fi
  git commit -q -m "docs(trusted): quick mode in LIMITS.md and ARCHITECTURE.md (human-applied)" -- LIMITS.md pharn/ARCHITECTURE.md
  echo "apply.sh: applied, checked and committed. The ARCHITECTURE pin moved; a plan built after this pins the new hash."
  ```

- **`APPLY.md`**: what to read (`git apply --stat`), what the script does, and when to apply: at GATE 2, after the
  last `/pharn-dev-verify`, before the merge (Q1). It covers the ARCHITECTURE pin moving and the sibling re-pin, the
  regeneration command, and, when `stage-exit` was absent, that the §4 line is owed by whichever phase merges
  second. It also gives the out-of-order case: applied before a verify, run the plan setter and
  `reconcile-baseline.mjs --anchor` after the commit, in that order (L38), and resume at `/pharn-dev-verify` (L17).

### 8. Version (D12)

**Minor, 6.23.0 → 6.24.0.** A newly shipped capability: a mode, a SPEC kind, a CLI print mode and a marker flag.
Nothing invalidates an install. A SPEC without `quick` validates as before; every existing marker and ledger reads
as before (the `mode` key and `gate2-quick` are additive, and old checkers accept both). **`MIN_CLI` stays 0.5.0**:
no installed path moves, and a CLI that copies `pharn/floor/` and `.claude/commands/` per file lands every change.

**The one direction that does not read back, stated (grill G11).** An install rolled back below 6.24.0 reads a
`spec_kind: quick` SPEC as a rule-8 RED (`quick` was not a member), so that SPEC stops passing
`check-spec-approved` there. A pre-6.24 renderer shows a `gate2-quick` ledger's decision without its preamble
bullet. No pre-6.24 checker REDs such a ledger. Forward compatibility is complete; backward, the SPEC kind is the one
casualty, and the CHANGELOG says so.

## Showing the saving

**Structural, in this build (re-derivable by reading the committed command).** `BUILD.md` records the prescribed
tool calls per path, counting one fenced block or one Read/Write/Edit/AskQuestion as one call, on the happy path
(no retry, no attestation, no advisory briefing paragraph). The figures below are this plan's count at `767bf61`;
the build re-counts them on its own HEAD:

| where                   | full                     | quick | removed per quick run                                                     |
| ----------------------- | ------------------------ | ----- | ------------------------------------------------------------------------- |
| `/pharn-ship` itself    | 42                       | 33    | 9 net: regress 3, Step 2c 5, Step 3a report 2, minus the kind check 1     |
| `/pharn-regress` stage  | 22 + 2·G (28 at G = 3) ¹ | 0     | the whole stage, its ~36 KB prompt, the base worktree and its install     |
| `/pharn-grill` stage    | ≥ 11 + n ²               | 6     | ≥ 5 + n, and the findings output (usually the stage's largest output)     |
| per quick run, in total |                          |       | ≈ 42 + n calls fewer at G = 3 (≈ 16 + k + n once `stage-regress-script`³) |

¹ `stage-regress-script`'s own structural count at `767bf61`. ² n = installed `SKILL.md` files read; ≥ 1 griller
file. ³ that phase makes a regress run 2 + k calls. Each call is one model turn over a growing context, so turns
removed ≈ calls removed.

**Recorded, outside this build** (roadmap M-point, in the user's project after `pharn update`): run a small fix with
`/pharn-ship --quick` and compare its `cost.json` with the M0 full-run baseline of a comparable fix. Three things
are structural in every quick ledger: `by_stage_iteration_model` has **no `pharn-regress` rows**, `markers[0]`
carries `mode: "quick"`, and the outcome is `gate2-quick`. Two are measured: the `pharn-grill` rows' output and the
orchestrator rows after the verify stage both shrink. The headline is PHARN's share of relative cost on the small
fix (same weights) against M0's ~81%. The success threshold is the one the maintainer fixed at roadmap 0.3, not one
set here.

## Decisions for GATE 1 (beyond or interpreting the brief — each overridable)

1. **`/pharn-grill --quick`** writes the quick `GRILL.md` (the stage owns its artifact, P3), not `/pharn-ship`.
2. **The mode lives on the run-start marker**, not on the SPEC's kind: D7 lets a quick SPEC run the full flow, so the
   kind cannot tell a quick run from a full one.
3. **Stops are not quick-specific** (`stop:<stage>` in both modes); only the GATE-2 outcome differs, and the mode is
   in `markers[]`.
4. **Step 2d is skipped** in quick mode (its only input is `BRIEFING.md`).
5. **`/pharn-spec --quick --model-approve` reports blocked** until Phase 3.2 decides.
6. **`render-run-report.mjs` learns the quick ledger** although quick runs do not render a report, to keep the
   cost-ledger contract's two promises true for a manual render.
7. **No required section is dropped**; optional ones are left out by guidance, not by a rule.
8. **The patch generator is committed** under `handoff/`, and the §4 line is decided by the presence of
   `stage-exit.md` at generation time.
9. **`SHIP.md` records `mode:` in both modes.**
10. **No dev twin**: `/pharn-dev-ship` gets no `--quick` (apparatus; a stated non-obligation, L31's question
    asked and answered).

All ten were accepted as written at GATE 1 (2026-09-26, the orchestrator's model decision under the maintainer's
delegation).

## Amended after grill

`/pharn-dev-grill` raised twelve findings (`GRILL.md`); every one is folded in place above, and this index says
where. The GRILL ids are cited at each site.

- **G1** — Chain sequencing, item 1: the verify-without-patch claim is now the probed one — the readers of these
  files are enumerated (`validate` CHECK 5, `check:markers`, `hash-doc.test`, the dev spec-hash compare) and none
  depends on the patch. §7 generator step 2 asserts the first three in memory. `apply.sh` re-runs them on the
  applied bytes. The Evals entry for the generator is new.
- **G2** — §7 `apply.sh`: no reconcile checkpoint and no re-anchor at a GATE-2 apply. `APPLY.md` carries the
  out-of-order case.
- **G3** — §2 and §4: `--quick` counts only as the first argument token. Trust and Determinism audits updated.
- **G4** — §7: `apply.sh` is pinned verbatim.
- **G5** — §2: `/pharn-spec`'s Step 4 names the quick trade before the approval question.
- **G6** — Discovery's sweep and `## Files`: README's paper-trail list.
- **G7** — §1: the rationale for three criteria and no `e2e` is recorded in the contract and the constants' comment.
- **G8** — §1: the contract's "a template may carry the key" bound is extended to `quick`.
- **G9** — §7: the §4 line fails loudly rather than adapting; the overclaiming sentence is corrected.
- **G10** — §6 and the Evals list: pins for the Step-4 trade sentence, the three `SHIP.md` items and the first-token
  rule.
- **G11** — §8: the rollback bound.
- **G12** — the header and `## Applied lessons`: L31 and L38, which the body already applied, are declared.

## Amended at GATE 2 (review fixes) — 2026-09-26

`/pharn-dev-review` (`REVIEW.md`) returned three floor findings (F1–F3) and seven advisory ones. GATE 2 was
decided **FIX** by the orchestrator under the maintainer's delegation. Each fix below names the plan text it
supersedes; the superseded sentences are marked in place ("superseded at GATE 2"), never silently rewritten.

- **F1 — the "either misreading under-claims" argument was false.** Probed with the marker's VALUE altered,
  never with it ABSENT: a quick run whose run-start was skipped after an unclosed earlier run derived `gate2`
  from that run's `pharn-regress@1`. Fixed on the floor, in `ship-outcome-core.mjs` `verdictApplicability`, in
  BOTH modes: **(a)** a verdict stage-start counts only after the same iteration's latest `pharn-build`
  stage-start; **(b)** a stage other than a verdict stage started twice at one iteration in the current run
  is a boundary that cannot be established → `unknown` → `undetermined` (verdict stages exempt: `/pharn-loop`'s
  freshness re-run repeats them, and a loop ledger with no `LOOP.md` reaches this derivation). This
  supersedes §5's "Full mode is byte-for-byte as today": the full-mode table changes only on marker trails a
  compliant run never writes (a verdict stage with no build before it; a repeated non-verdict stage). The
  sentence is re-derived everywhere it appears (`ship-outcome-core.mjs`, `cost-ledger.md`, `pharn-ship.md`,
  `CLAUDE.md`, `render-cost-ledger.mjs`, CHANGELOG, the patch), with two bounds named: it holds for the
  markers the command prescribes, and an earlier run that left only its run-start is byte-identical to
  resuming it (its mode is read — `stop:pharn-verify` or `gate2-quick`, never `gate2`). The patch text says
  `gate2-quick` "is not `gate2`" instead of "never `gate2`".
- **F2 — the first-token rule was stated as an impossibility.** It is labelled ADVISORY at every site
  (`pharn-ship.md`, `pharn-spec.md`, `pharn-grill.md`, README, CHANGELOG), with the floor backstop (the
  approved, pinned `spec_kind: quick`, read by `check-spec-approved` + `--spec-kind`) and its bound (the floor
  sees the SPEC, never the invocation). A guarantee-audit bullet is added. This supersedes the Determinism
  audit's "`--quick` is the first argument token" as a membership test.
- **F3 — quick mode dropped a fix #7 control unnamed.** Kept instead: `## Quick mode` gains item 7 — run
  `check-regress.mjs scope` (inputs by `/pharn-regress`'s Step 3 rules _(superseded at the merge of main: that
  Step 3 is now `stage-regress.mjs`'s `base` and `partition` phases, which item 7 cites)_, `--feature <name>`; no base worktree,
  no install, no gate) before `/pharn-verify` and STOP on `escaped`; Step 2b re-runs it between the re-build
  and the re-verify. Items 7–11 become 8–12. It is named KEPT in the trade text (`/pharn-spec` Step 4, the
  section intro, README, CHANGELOG, the LIMITS patch) and in `SHIP.md`. This supersedes the Guarantee
  audit's "`check-regress scope`'s smoke alarm does not run either". A ★ test plants a stray before the
  anchor and shows reconcile CLEAN while the committed quick scope line exits 1. It costs one call on a
  quick run's happy path (one more in Step 2b), so "Showing the saving"'s `/pharn-ship` row nets 8, not 9.
- **Stale full-run artifacts** (advisory): quick mode never points at or links an earlier run's
  `REGRESSION.md`, `regression-report.json`, `BRIEFING.md` or `RUN-REPORT.md` — Step 3's full-mode pointers
  are omitted and a fixed line says any such file predates the run; `render-run-report.mjs`'s `## Briefing`
  says "not part of this run" for a quick ledger. **Labelled, not removed:** removal would delete files
  another stage owns (possibly committed history) through an undeclared Bash write.
- **Promised tests built:** the ★ WIRING test executing the committed quick run-start line (with the full
  line as its control), the quick Step-2b cases, and the G11 rollback sentence in the CHANGELOG. `SHIP.md`
  and `ship-record.json` record `mode` in full-mode Step 3/3b too (Decision 9). `BUILD.md`'s "no other
  deviation" line is corrected.
- **The `spec_template`-outside-the-pin residual** is named in `spec-template.md` and `pharn-ship.md`; the pin
  is unchanged.
- **Wording:** "pre-existing checker" (`--spec-kind` is new and gates in quick mode); the `e2e` rationale
  (the bound keeps an e2e red run out of `/pharn-test`, not the project's e2e gates out of `/pharn-verify`);
  the counts "fourth form", "BOTH", "NINE", "eight rules" → open forms; the dangling "Quick mode"
  cross-refs; `pharn-verify.md`'s "you sit after `/pharn-regress`" (a quick run has none);
  `make-patch.mjs` now runs `git apply --check` on stdin BEFORE writing the patch, so its header's "nothing
  written" holds; `apply.sh`'s failure message says the files are restored from the index, which is what
  `git checkout --` does (the pinned block in §7 below is updated to match, byte for byte).
- **Files added to `## Files`:** `.claude/commands/pharn-verify.md` (one sentence) — moved out of "Explicitly
  not touched". The setter is re-run and the scope amended onto the open reconcile epoch
  (`reconcile-baseline.mjs --amend-scope`).

## Amended at GATE 2 (merge of main) — 2026-09-26

The re-review of the fix pass (`REVIEW.md`, at `bbea1bb`) was GREEN with no floor finding and three new minor
ones, N1–N3. The orchestrator decided, under the maintainer's delegation, to fix all three and merge `main` now.
Stage model: opus — set by the maintainer's instruction, overriding pharn.config.json's sonnet for
build/regress/verify; routed via Agent subagent; effort not routed. No `## Files` entry changes.

- **N1 — "a skipped quick run-start reads `undetermined` either way" was too strong.** The re-review's probe: after
  an unclosed `/pharn-loop` trail `[run-start, stage-start pharn-spec]`, a quick run whose run-start was skipped
  repeats no stage, because `/pharn-ship` never marks `pharn-spec`. Condition (b) is silent, and the joined run
  is full, by the loop's run-start, so it derives `stop:pharn-verify`. "Never `gate2`" still holds. Re-worded at
  every site (`ship-outcome-core.mjs`'s header and its `undetermined` form, `cost-ledger.md`, `pharn-ship.md`,
  `render-run-report.mjs`'s preamble, `CLAUDE.md`, CHANGELOG): `undetermined` when this run's stage markers follow
  the earlier run's run-stop or repeat one of its stage-starts, and `stop:<stage>` otherwise. Pinned in
  `ship-outcome-core.test.mjs`: the skipped-run-start enumeration gains the loop family (36 shapes) and asserts
  that both `undetermined` and `stop:pharn-verify` are reached; a ★ N1 test runs the probe's exact trail, with a
  control (the loop one stage further → `undetermined`).
- **N2 — a stored `gate2` the new conditions exclude was labelled as predating 6.9.1.** `render-run-report.mjs` now
  says it "predates the applicability rules in force today" (6.9.1's current-run rule; 6.24.0's build-order and
  no-repeat conditions — the quoted reason names the rule that excludes it). `render-run-report.test.mjs` adds a
  test over both conditions, with the old wording as a negative control.
- **N3 — `LIMITS.md §6`'s "it fires only if `/pharn-regress` runs" went stale** when quick mode began running the
  same partition (item 7). `make-patch.mjs` gains a §6 edit (step 2b, through `applyOnce` and the same in-memory
  checks), so the human-only patch carries LIMITS §3a and §6 (§7 above).
- **`origin/main` merged in (a merge, not a rebase).** `main` had merged `stage-regress-script` as 6.23.0
  (`1524c6f`, #277). Two conflicts, both resolved by hand:
  - `CHANGELOG.md`: main's `[6.23.0]` kept byte-for-byte, checked against `origin/main` (that section and
    everything below it, the header and `[Unreleased]` are identical). This phase's entry sits in a new
    `## [6.24.0] - 2026-09-26` above it.
  - `pharn/floor/render-run-report.mjs`, the import block: main moved `quoteData` / `dataText` into
    `quote-core.mjs`. Kept main's import and this phase's added `runMode`.
- **Renumbered 6.23.0 → 6.24.0 by diff** against `origin/main`, over added lines only, never main's own: 121 lines,
  plus one escaped regex (`6\.23\.0` in `command-hygiene.test.mjs`) that the literal scan missed. `SKILLS_VERSION`
  and the README badge are bumped. Not renumbered: `GRILL.md` (1 line) and `REVIEW.md` (7), other stages' records
  outside this build's scope, and `human-only.patch` (2), regenerated instead. **PROVISIONAL:**
  `writes-scope-run-only` is set to merge first as 6.24.0, and this phase then renumbers once more, to 6.25.0.
- **#277 made `/pharn-regress` a thin caller,** so `## Quick mode` item 7's "its Step 3 items 1–3" pointed at
  nothing. Item 7 now cites the script's `base` and `partition` phases (`stage-regress.mjs`; `BASE_RULE` in
  `stage-regress-core.mjs`) and gives `inside` as that phase computes it:
  `git diff --name-only --no-renames <base>` plus untracked, minus `.pharn/`. Its pinned `check-regress.mjs scope`
  line is unchanged. The quick
  guarantee-audit bullet's "as `/pharn-regress`'s Step 3 states" now cites the Step 1 `scope-escaped` remedy, which
  carries that bound today.
- **The §4 line is now included.** `stage-exit.md` is on `main`, so the regeneration printed `stage-exit: present`.
  `apply.sh` carries `EXPECT_STAGE_EXIT=present`, and its header names LIMITS §6. The new sums are `LIMITS.md`
  `4284b68e…` and `pharn/ARCHITECTURE.md` `044ee4fa…`, which is the new ARCHITECTURE pin (old `4950796f…`). The
  patch was applied to a scratch copy of the tree, never to the trusted docs. It applies, `shasum -c` passes, and
  `validate`, `check:markers` and `hash-doc.test` pass on the applied bytes.
- **The reconcile epoch.** Before the merge, the fix pass's epoch (`ship-quick-mode-opus-fixes`) read `CLEAN`: 24
  paths reconciled, no escape. After the merge the setter was re-run from this PLAN, and the epoch was re-opened
  with `reconcile-baseline.mjs --anchor --by ship-quick-mode-post-merge` (2338 paths). Until the merge was
  committed, `check-bash-reconcile` reported 15 `pharn/floor/` files as escapes: main's floor changes since the
  fork point, minus the three this plan also declares. That directory is always reconciled against `HEAD`'s
  blobs, and `HEAD` did not yet hold the merge. So the merge was committed before the after-merge regress and
  verify ran. No baseline was edited or deleted.

## Files

- `.dev/features/ship-quick-mode/PLAN.md` — this plan — layer dev artifact
- `.dev/features/ship-quick-mode/BUILD.md` — NEW. The build record: the structural call counts, the L37 probes with exit codes, the generator's `stage-exit` line — layer dev artifact
- `pharn/floor/spec-template-core.mjs` — EDIT. `quick` kind, `TEST_FIRST_KINDS`, quick bounds, rule 9, `specVerdict` explicit, the header re-derived — layer product floor
- `pharn/floor/check-spec.mjs` — EDIT. The `--spec-kind` print mode, usage, header — layer product floor
- `pharn/floor/check-ac-tests.mjs` — EDIT. Full-mode kind gate over `TEST_FIRST_KINDS`, the two kind messages, the header comment — layer product floor
- `pharn/floor/check-test-stage.mjs` — EDIT. One message: "a test-first SPEC" — layer product floor
- `pharn/floor/ac-gate-core.mjs` — EDIT. One message at the bootstrap-lock mismatch — layer product floor
- `pharn/floor/mark-phase.mjs` — EDIT. `--mode quick` on run-start, `MARKER_MODES`, `QUICK_MODE`, header — layer product floor
- `pharn/floor/render-cost-ledger.mjs` — EDIT. `normalizeMarkers` keeps a `MARKER_MODES` member — layer product floor
- `pharn/floor/ship-outcome-core.mjs` — EDIT. `runMode`, `verdictStages`, `gate2-quick`, the vocabulary, applicability per mode, header — layer product floor
- `pharn/floor/render-run-report.mjs` — EDIT. The `gate2-quick` preamble bullet and the quick regress line — layer product floor
- `pharn/floor/README.md` — EDIT. The `--spec-kind` mode, one sentence — layer shipped doc
- `pharn/pharn-contracts/spec-template.md` — EDIT. `spec_kind: quick`, rule 9, the sections decision, `--spec-kind` — layer pharn-contracts
- `pharn/pharn-contracts/cost-ledger.md` — EDIT. `markers[].mode`, `gate2-quick`, quick applicability, the render note — layer pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — EDIT. One sentence: a quick SPEC is templated (0) and treated as `feature` throughout — layer pharn-contracts
- `.claude/commands/pharn-ship.md` — EDIT. The `## Quick mode` section, the pointers, the `SHIP.md` mode lines, the sweep edits, description, `reads:`, version — layer product command
- `.claude/commands/pharn-grill.md` — EDIT. The `--quick` mode (eligibility, skips, the quick `GRILL.md`), description, version — layer product command
- `.claude/commands/pharn-spec.md` — EDIT. `--quick` (fit checks, `spec_kind: quick`, the `--model-approve` stop), the kind enumeration, the `quick` RED kind, the "eight rules" sweep, description, version — layer product command
- `.claude/commands/pharn-verify.md` — EDIT (added at GATE 2). One sentence: `/pharn-verify` follows `/pharn-regress` only in a full run; version patch — layer product command
- `pharn/floor/check-spec.test.mjs` — EDIT. Rule 9 in RULE_CASES and its controls, the kind members, the pin over `quick`, `--spec-kind` cases, ★ WIRING for the two pinned `--spec-kind` lines, the Draft step naming `quick` — layer product floor tests
- `pharn/floor/check-ac-tests.test.mjs` — EDIT. A quick SPEC is TEMPLATED (0) and its mapping GREEN; `test-infra` + mapping still RED; the enumerated message — layer product floor tests
- `pharn/floor/check-test-stage.test.mjs` — EDIT. A quick world reads READY test-first, with and without `--require-test-first` — layer product floor tests
- `pharn/floor/ac-gate-core.test.mjs` — EDIT. A quick SPEC takes the test-first gate — layer product floor tests
- `pharn/floor/mark-phase.test.mjs` — EDIT. `--mode` accepted, refused, absent (L41), with adoption — layer product floor tests
- `pharn/floor/render-cost-ledger.test.mjs` — EDIT. `mode` survives normalization, garbage dropped; a quick ship ledger derives `gate2-quick` — layer product floor tests
- `pharn/floor/check-cost-ledger.test.mjs` — EDIT. A quick ledger is GREEN — layer product floor tests
- `pharn/floor/ship-outcome-core.test.mjs` — EDIT. The quick decision table, the five-form closure, the probes, ★ WIRING from the committed lines — layer product floor tests
- `pharn/floor/render-run-report.test.mjs` — EDIT. A quick ledger's outcome and regress line; the preamble names every decision form — layer product floor tests
- `.dev/floor/command-hygiene.test.mjs` — EDIT. The PHASE_MARKER_WIRING carve-out, QUICK_MODE_WIRING, mutation controls — layer dev tests
- `CLAUDE.md` — EDIT. The spine paragraph, the mark-phase usage line, the ship-outcome and AC-tests comments — layer repo-meta
- `README.md` — EDIT. Badge 6.24.0, the paper-trail list (grill G6: a quick run's `GRILL.md` holds no interrogation, and it writes no `REGRESSION.md` and no `RUN-REPORT.md`, while `cost.json` is kept), the `--quick` usage, the commands row, the token-cost bullet — layer repo-meta
- `CHANGELOG.md` — EDIT. `## [6.24.0]` (date of the build), moving any `[Unreleased]` entry — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.23.0` → `6.24.0` — layer repo-meta
- `.dev/features/ship-quick-mode/handoff/make-patch.mjs` — NEW. The committed patch generator (§7) — layer dev artifact
- `.dev/features/ship-quick-mode/proposed/human-only.patch` — NEW. Generated by `make-patch.mjs` (a Bash write) — layer dev artifact
- `.dev/features/ship-quick-mode/proposed/human-only.sha256` — NEW. Generated by `make-patch.mjs` (a Bash write) — layer dev artifact
- `.dev/features/ship-quick-mode/proposed/apply.sh` — NEW. The human-run apply script (§7) — layer dev artifact
- `.dev/features/ship-quick-mode/proposed/APPLY.md` — NEW. What to read, when to apply, what it does — layer dev artifact

### Explicitly not touched by the agent

- `LIMITS.md`, `pharn/ARCHITECTURE.md` — human-only (fix #2); they travel in `proposed/human-only.patch`, applied by `apply.sh`.
- `pharn/CONSTITUTION.md`, `THREAT-MODEL.md`, `CODEOWNERS`, `.claude/settings.json`, `.claude/settings.local.json`, the four hook scripts, `pharn.spec-template.md` — human-only and byte-identical.
- `MIN_CLI` — stays `0.5.0`.
- `pharn/pharn-contracts/templates/spec-template.md` — it names no kind; `/pharn-spec` writes the line.
- `.claude/commands/pharn-loop.md`, `pharn-regress.md`, `pharn-test.md`, `pharn-plan.md`, `pharn-build.md` — no quick behaviour there (the loop is Phase 3.2). (`pharn-verify.md` moved to `## Files` at GATE 2 for one sentence.)
- `.claude/commands/pharn-dev-*.md` — no dev quick mode.
- `pharn/floor/reconcile-ignore.json`, `worktree-fingerprint.mjs`, `check-regress.mjs` — no new pipeline artifact.

## Build procedure (pinned — L19, L22, L26, L44, L57)

1. `/pharn-dev-build` Step 0 as written: the setter from this PLAN, then `--anchor`.
2. Write the agent files above with the Write/Edit tools, including `handoff/make-patch.mjs`.
3. Format only this build's own files: `npx prettier --ignore-unknown --write <the written paths>` and
   `npx markdownlint-cli2 --no-globs --fix <the written .md paths>` — never over the tree (L57).
4. `node .dev/features/ship-quick-mode/handoff/make-patch.mjs` — ONE invocation (§7); it writes the patch and the
   sums (declared Bash writes) and prints `stage-exit: …` and the new ARCHITECTURE pin.
5. Write `proposed/apply.sh` (with the printed `EXPECT_STAGE_EXIT`) and `proposed/APPLY.md` with the Write tool;
   format `APPLY.md` as in step 3.
6. `node pharn/floor/validate.mjs .` and `npm test`; the build's floor halts on RED.
7. `BUILD.md` records: the structural call counts re-derived on the build's HEAD; each L37 probe with its exit code
   (a quick mapping GREEN / a test-infra mapping RED; `check-test-stage` on a quick world; `readShipOutcome` quick
   with `regressions` on disk; a full run without a regress stage-start; `--spec-kind` on each kind and on a legacy
   SPEC; `mark-phase --mode fast`); the generator's `stage-exit` line; and its refusal probes (Evals, "The
   generator").

## Chain sequencing

1. `/pharn-dev-grill` → `/pharn-dev-build` (above) → the floor → `/pharn-dev-regress` → `/pharn-dev-verify` →
   `/pharn-dev-review` → GATE 2. **No designed STOP, and verify is green WITHOUT the patch** — probed at grill,
   not read off (grill G1, L37). The readers of these two files' bytes, enumerated at grill by searching the floor,
   the hooks and the tests (an open list, not a count — L47):
   - `pharn/floor/validate.mjs` CHECK 5 reads every product `.md`. It fires on `pharn/ARCHITECTURE.md`, which holds
     both `rule_id:` and `problem:`, and requires the split vocabulary, which that file has. `LIMITS.md` holds
     neither token. The edits add neither token and remove no split word. `validate` was GREEN at grill.
   - `check:markers` (`.dev/floor/check-specified-markers.mjs`) reads their registered marker and citation strings.
     It was GREEN on the unpatched tree at grill (25 annotations, exit 0), and the edits leave every registered
     string byte-identical.
   - `hash-doc.test.mjs` reads `pharn/ARCHITECTURE.md` for its LF identity, which holds before and after the patch.
   - The dev stages' spec-hash compare (`hash-doc.mjs`): `/pharn-dev-build` refuses on drift and `/pharn-dev-grill`
     warns. Neither runs after a GATE-2 apply.

   The generator asserts the first three on the edited text in memory (§7), and `apply.sh` re-runs them on the
   applied bytes. Nothing in the chain reads the prose the patch changes.

2. The human applies the patch (`sh .dev/features/ship-quick-mode/proposed/apply.sh`) at GATE 2, after the last
   `/pharn-dev-verify` and before the merge (Q1 → (a)). `APPLY.md` carries the out-of-order case (L17).
3. After a sibling merges into `main` and this branch is rebased: re-run `make-patch.mjs` if `LIMITS.md` or
   `ARCHITECTURE.md` moved or `stage-exit.md` appeared, and renumber the version and the CHANGELOG section by diff.

## Contracts satisfied

- `pharn/pharn-contracts/spec-template.md` — amended: the `quick` kind, rule 9, the sections decision, `--spec-kind`.
- `pharn/pharn-contracts/cost-ledger.md` — amended: `markers[].mode`, `gate2-quick`, the quick applicability; the
  schema stays `pharn-cost-ledger/2` (additive, Discovery).
- `pharn/pharn-contracts/ac-tests.md` — amended by one sentence; the test-stage gate, the red run and the AC gate are
  unchanged for quick (D4).
- `pharn/pharn-contracts/ship-record.md` — unchanged: `mode` joins the advisory roll-up it already leaves open.
- `pharn/pharn-contracts/finding-shape.md` — unchanged: the quick `GRILL.md` carries no finding.

## Evals and tests to write (P1)

No `role:` capability is added, so no eval pair is owed. The tests, each with a named negative control (L60):

- **Kinds.** `quick` is a member (GREEN on a valid quick SPEC); RULE_CASES gains `quick` with two mutants (four
  criteria; an `e2e` criterion), each RED `quick` only; controls: a malformed level REDs `ac` only (rule 9 skips it),
  and a missing AC section REDs `section` only; the RULE_CASES coverage test names every RED kind in its list and
  carries no count in its title (L47); the partition `SPEC_KINDS = TEST_FIRST_KINDS ∪ {test-infra}`; the pin: feature ↔ quick after approval is
  `pin` RED.
- **`--spec-kind`.** `feature` (no line), `test-infra`, `quick`; a legacy SPEC carrying `spec_kind: quick` → `feature`;
  an invalid value and a body-first kind line → an empty line at exit 0; unreadable and no frontmatter → exit 1 with
  stderr. ★ WIRING: the fenced line in `pharn-ship.md` and in `pharn-grill.md`, each exactly once, executed on a
  quick and a feature SPEC; control: a mutant line with `--spec-id` prints something else.
- **Consumers.** `check-ac-tests --spec` on a quick SPEC → 0 TEMPLATED; full mode over a valid quick mapping → GREEN;
  `test-infra` + mapping → RED `spec-kind` (control); `check-test-stage` over a quick world → `READY test-first`,
  also under `--require-test-first`; the AC gate over a quick SPEC → mode `test-first`.
- **`mark-phase --mode`.** Accepted on run-start (`mode: "quick"` on disk and printed); refused on stage-start and for
  `fast` (exit 2, `lstat` proves nothing written); absent → no key (L41); with `--adopt-pending` → both `origin` and
  `mode`.
- **Normalization.** `mode: "quick"` survives into `cost.json`'s `markers[]`; `"QUICK"`, `1` and `"fast"` are dropped.
- **Outcome.** Quick + current + `PASS` → `gate2-quick` with `regressions`, `inconclusive` or no regression report on
  disk (the report is never read — probe); a quick run never yields `gate2`; quick + `FAIL` → `stop:pharn-verify`;
  quick Step-2b (verify at iteration 2) → `gate2-quick`, and iteration 1 only with a build at 2 → not `gate2-quick`;
  an earlier run's quick run-start does not make the current run quick, and vice versa; a raw garbage `mode` reads
  full (`stop:pharn-verify` with no regress stage-start); full mode's existing table unchanged. Closure: five forms,
  reachable, `floor` = {`gate2`, `gate2-quick`}; negative controls `gate2-Quick`, `quick-gate2`, `gate2_quick` and
  `gate2-quick` with a trailing space, all rejected. ★ WIRING (L45): the committed quick run-start and verify stage-start lines from
  `pharn-ship.md`, run in a scratch cwd, read back through `readMarkers`, derive `gate2-quick`; control: the committed
  full run-start line → `stop:pharn-verify`.
- **Ledger.** A quick ledger (quick run-start, `gate2-quick`) is GREEN under `check-cost-ledger`.
- **Report.** A quick ship ledger renders the `gate2-quick` bullet and "not part of this run" for regress even with a
  `no-regressions` report on disk; the `## Outcome` preamble names every `SHIP_DECISION_FORMS` form (closure; control:
  the bullet removed fails).
- **Hygiene.** §6 above, with its mutation controls, including the grill additions (G10): `/pharn-spec`'s Step-4
  trade sentence, the three items of `SHIP.md`'s quick list, and the first-token rule in both commands, each with a
  control that drops it.
- **The generator** (`handoff/make-patch.mjs`, dev apparatus with no suite of its own; its checks run inside it):
  each `find` matches exactly once, the §4 completeness assertion, the marker-preservation invariant, the CHECK 5
  predicate and the no-CR check (G1). They are pure exported functions behind an `import.meta.main` guard, so the
  build can call them directly. `BUILD.md` records one call of each with an input it must refuse — a `find` that
  matches twice, a replacement that drops a registered marker string, a §4 list missing a stem, a finding-template
  text stripped of its split words, a CR in the edited text — and each must return its refusal (L60: a check never
  seen failing proves nothing).

## Guarantee audit (P0)

- "A quick SPEC carries 1–3 criteria, each `unit` or `integration`" → **floor: enum/count** (rule 9,
  `check-spec.mjs`), re-checked at every `check-spec-approved` call. Opt-in by the key, like every template rule.
- "Flipping a SPEC to or from `quick` after approval is detected" → **floor: content-hash** (`pinHash` covers the
  line). A self-consistent re-pin passes, as always (`LIMITS.md §1d`).
- "`--quick` runs only on a quick SPEC" → the kind read is **floor: membership** (`--spec-kind`, over the pinned
  frontmatter); `/pharn-ship` and `/pharn-grill` obeying it is **advisory** orchestration (two clocks).
- "A quick SPEC gets the same AC evidence as a feature SPEC" → **floor**, the existing gates unchanged: the mapping
  check, the lock, the red run, the test-stage gate and the AC gate, now reached by `quick` through `TEST_FIRST_KINDS`.
- "Quick mode skips `/pharn-regress`, the interrogation, `BRIEFING.md` and `RUN-REPORT.md`" → **advisory** (command
  prose). The hygiene pins prove the prose says so, never that a run did it.
- "A quick ledger never claims a regress check" → **floor relative to the recorded markers**: `gate2-quick` rests on
  one verdict enum; `gate2` still needs a regress stage-start and `no-regressions`. The mode is a marker, **advisory**
  (Bash-written, L19), and either misreading under-claims (§5). Agreement, never provenance (L43). _(Superseded at
  GATE 2 — review F1: re-derived as "a skipped or wrong mode marker never yields `gate2`", with two bounds.)_
- "What quick mode does not check" → **stated, not guarded**: regressions outside the feature (no base comparison;
  `check-regress scope`'s smoke alarm does not run either, though the verify-time `reconcile` gate does), the plan
  interrogation, and the two artifacts. `SHIP.md`'s list is advisory prose; the ledger's markers and outcome are the
  machine record. _(Superseded at GATE 2 — review F3: the scope check is KEPT; its exit is floor, running it is
  advisory.)_
- "The change is small" → **not a claim**. Nothing measures it; a human chose the flag and the kind.
- "The human-only patch keeps green every gate that reads `LIMITS.md` and `pharn/ARCHITECTURE.md`" → **floor, at
  apply time**. `apply.sh` runs `validate`, `check:markers` and `hash-doc.test` on the applied bytes, and restores
  both files on any failure. The generator's in-memory checks are an earlier copy of the same predicates. The patch
  and its sums agreeing is consistency between two agent-written files, never authentication; what binds the
  applied bytes is those runs and the human's reading of the diff (the precedent's words).

## Trust audit (P2)

- **New inputs.** The SPEC frontmatter reaches `--spec-kind`, which prints only a closed-set token or an empty line
  (never raw text, L62). The `--mode` argv is checked against a closed set. The marker's `mode` value is compared by
  exact equality and dropped at normalization unless it is a member.
- **The mode flag is not read from the description** (grill G3). The `<increment description>` is untrusted prose
  (`/pharn-ship`'s Trust section). If `--quick` were recognized anywhere in the arguments, a pasted third-party text
  containing it could switch a run into the mode that skips the regression check. The flag counts only as the first
  token; everywhere else it is description text, passed on as DATA. _(GATE 2, review F2: that rule is ADVISORY —
  the orchestrating model applies it; the floor backstop is the SPEC's pinned kind, which cannot tell a typed
  `--quick` from a misread one.)_
- **`apply.sh` runs with the human's privileges**, so it is pinned verbatim in this reviewed plan (§7, grill G4) and
  the human reads `human-only.patch` before running it (`APPLY.md`).
- **Outputs.** The quick `GRILL.md` is fixed text plus two floor results and holds no untrusted free text. `SHIP.md`'s
  "Not checked" list is fixed text. Control flow still reads only exit codes, enum verdicts and the kind token.
- **Residual.** Unchanged from `LIMITS.md §2`: the free text quick mode still presents (`VERIFY.md`, `BUILD.md`) is
  quoted as DATA, and less of it is presented.

## Determinism audit (P5)

- Every new branch is a membership test: `--quick` is the first argument token (one position, never a scan of the
  description — grill G3); `--spec-kind` prints exactly `quick`; the current run-start's `mode` equals `quick`; the
  kind is in `TEST_FIRST_KINDS`. _(GATE 2, review F2: the first-token test is one the MODEL applies — advisory,
  not a floor membership test; the other three are floor.)_
- Every terminal fallback stops and names a remedy: a non-quick SPEC under `--quick`, `/pharn-grill --quick` on a
  non-quick SPEC, and `--quick` with `--model-approve`. None guesses.

## Deferred — named, not dropped

- `loop-quick` — roadmap Phase 3.2: `/pharn-loop --quick`, `check-loop` verify-only mode, freshness and record.
- `quick-size-signal` — any measurement of change size. P7: no failure; the brief makes the choice human.
- `briefing-run-binding` — `render-ship-briefing.mjs` copies whatever reports sit on disk, run-bound or not. It is
  pre-existing, it applies to full mode too, and quick mode never renders it.
- `quick-stop-tokens` — quick-specific `stop:` forms, if a reader ever needs the mode without `markers[]`.

## Open questions (HALT)

- **Q1 — The ARCHITECTURE pin moves, and two sibling plans pin the old one.** Applying the §6 (and §4) edit changes
  `sha256(pharn/ARCHITECTURE.md)`. `writes-scope-run-only` and `stage-regress-script` both pin `4950796f…`, so a
  sibling whose `/pharn-dev-build` runs after rebasing onto a `main` that holds this patch refuses on drift.
  - (a) Apply the patch at this phase's GATE 2, right before the merge; the orchestrator re-pins any sibling PLAN
    whose build has not run yet during its post-merge rebase (one header line, via `/pharn-dev-plan` or by hand).
  - (b) Ship `LIMITS.md §3a` here and move both ARCHITECTURE edits to a trusted-docs catch-up after the three phases
    merge (the 6.20.2 precedent).
  - **Recommendation: (a).** The re-pin is one line and the rebase is already a reconcile point; (b) leaves §6
    silent about a shipped mode for a while.
  - **Resolved 2026-09-26 at GATE 1: (a)** — a model decision by the orchestrator under the maintainer's 2026-09-25
    delegation, not a human approval. The human applies the patch at this phase's GATE 2, just before the merge,
    and the chain before that does not depend on the patched bytes (Chain sequencing, item 1). Both in-flight
    siblings are already building against the old pin; any sibling plan whose build has not run by then is
    re-pinned when it rebases.
