# PLAN — ship-quick-mode: `/pharn-ship --quick`, a shorter run for a small change

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f # fix #4
- applied_lessons: [L1, L2, L3, L6, L7, L10, L13, L17, L18, L19, L22, L25, L26, L27, L29, L33, L34, L35, L36, L37, L41, L42, L43, L44, L45, L47, L49, L50, L52, L57, L60, L62]
- increment: `/pharn-ship --quick` runs a `spec_kind: quick` mini-SPEC (1–3 criteria, each `unit` or `integration`) through both human gates, the grill's two floor stops without the interrogation, test-first AC evidence, the build and `/pharn-verify`, and skips `/pharn-regress`, `BRIEFING.md` and `RUN-REPORT.md`; its ledger outcome is `gate2-quick`, never `gate2`.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (L-1, schemas only), product commands (`.claude/commands/pharn-*.md`), shipped doc (`pharn/floor/README.md`), trusted docs (`LIMITS.md`, `pharn/ARCHITECTURE.md` — human-applied patch), repo-meta (`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SKILLS_VERSION`). No `role:` capability.
- constitution_refs: [P0, P1, P2, P3, P5, P6, P7]
- stage model: plan — model routed via Agent subagent; effort not routed
- base: `main` at `767bf61` (SKILLS_VERSION 6.22.0, MIN_CLI 0.5.0). Bumps to **6.23.0** (minor). Both sibling phases also bump; whichever merges later renumbers by diff.

## Applied lessons

- **L1** — every meta-doc that states a fact this changes is in `## Files`: `CLAUDE.md` (the spine paragraph, the mark-phase usage, the ship-outcome comment), `README.md` (the badge, the ledger bullet, the usage example, the commands row, the token-cost bullet), `pharn/floor/README.md`, `CHANGELOG.md`, `SKILLS_VERSION`, and `LIMITS.md` / `pharn/ARCHITECTURE.md` through the patch.
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
- **L33** — `LIMITS.md §3a`'s "`quick-mode` exists as a manual flag" becomes true the moment this lands, and is rewritten through the patch. `/pharn-ship`'s "runs the seven stages" claims are re-worded where quick mode makes them false.
- **L34** — every new enumeration asserts its size: five decision forms, three kinds partitioned into test-first and bootstrap, the skip set's members, and exactly one quick run-start line.
- **L35** — one owner per fact: `MARKER_MODES` lives in `mark-phase.mjs` (the writer), `TEST_FIRST_KINDS` and the quick bounds live in `spec-template-core.mjs`, and the ledger's `outcome` stores no `mode` copy, because `markers[]` already records it.
- **L36** — closures, not presence: `SHIP_DECISION_RE` gains the one new member, the `--mode` vocabulary is closed over the whole command corpus, and `SPEC_KINDS` must equal `TEST_FIRST_KINDS` ∪ {`test-infra`}.
- **L37** — each quantified sentence is probed with a member expected to fail. A quick run with a `regressions` report on disk must still derive `gate2-quick`, and a full run with no regress stage-start must never derive `gate2`. `check-ac-tests` over a quick mapping must be GREEN and over a `test-infra` mapping still RED. Exit codes are recorded in `BUILD.md`.
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
    `:487`) and `check-spec.test.mjs` (`:504`, `:769`); README `:73-74`
    and `:742` ("`/pharn-ship` writes `cost.json` and `RUN-REPORT.md`"); `LIMITS.md §3a` (patch).
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
- **Sections (D1, decided):** a quick SPEC omits **no required section**, and writes **no optional section**.
  - **Kept:** Intent (what GATE 1 approves). Scope with its out-of-scope list: quick mode runs no regression check,
    so the non-goals are the only written statement of what the change must not touch. Acceptance Criteria (the one
    evidence quick mode keeps). Constraints (one line may do; dropping it would special-case §6's base four).
    Assumptions: the interrogation is lighter, so the recorded guesses matter more.
  - **Left out:** Scenarios, Data, Success Metrics, Open Questions — by `/pharn-spec`'s quick guidance
    (advisory). No rule forbids them: no failure motivates one (P7), and they cost a few lines.
- **The pin already covers the line** (`pinHash`), so flipping a SPEC to or from `quick` after approval is drift
  — RED at every chain check. No code change there; a test pins it for the new member.
- **`check-spec.mjs --spec-kind <SPEC.md>`** — a print mode beside `--state` and `--spec-id` (the §6 frontmatter
  facts). It prints `specAcceptanceCriteria(text).kind`: `feature`, `test-infra` or `quick` for a templated SPEC; an
  EMPTY line (exit 0) when the kind is unusable (two lines, a non-member, or a body that opens with `spec_kind:`); and
  `feature` for a legacy SPEC, whose `spec_kind` is never validated, so no legacy SPEC is ever quick. Unreadable or
  no frontmatter → exit 1 with a stderr reason, like the other print modes. The flag spells the frontmatter key
  (`--spec-id` ↔ `spec_id`), not "kind", which in this checker already names a RED kind.
- **The kind-consumer fixes** (Discovery): `check-ac-tests.mjs` full mode REDs `spec-kind` only for `null` or
  `test-infra` (via `TEST_FIRST_KINDS`); the three messages are reworded.

### 2. `/pharn-spec --quick`

- Step 0/1 unchanged. An existing SPEC is resumed as today. An Approved SPEC that is not quick is never converted
  silently: the human chooses Revise (re-opens it to Draft) or keeps it, and `/pharn-ship --quick` then refuses. A
  legacy SPEC cannot be quick (no AC ids); migrating it is the human's choice.
- Step 2 runs the same checks over the smaller intent, plus three **fit checks**: at most three criteria; none
  observable only end-to-end; a `test` runner PHARN can find. A miss is said plainly, with the choice: narrow the
  intent, or write a full SPEC (no `spec_kind` line), after which `/pharn-ship --quick` stops at its kind check and
  the human re-runs without `--quick`.
- Step 3 writes `spec_kind: quick` in the frontmatter (never as the body's first line), 1–3 criteria at `unit` or
  `integration`, no optional section. The Draft validation lists the `quick` RED kind with the others.
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

A new section headed ``## Quick mode — `/pharn-ship --quick` (6.23.0)`` is placed **after Step 1 and before
Step 2** (PENDING_START needs Step 1's lines first). Step 1 gains a one-line pointer to it. `--quick` is a token in
the invocation (P5: membership), removed before the description is passed on. The deltas, in step order — every
other line of Steps 1–3b and the Final step runs exactly as written:

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
   one-line pointer is added at that step.
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
    today. Stops keep `stop:<stage>` in both modes; the mode is read from `markers[]`, and no `outcome.mode` key
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
  run-start wrongly says quick yields `gate2-quick`, which claims no regress verdict at all.
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
  `spec_kind: quick`.
- **OBLIGATIONS** (ledger + check + report) keeps all three lines required for every emitter; its comment gains
  the carve-out sentence, and QUICK_MODE_WIRING pins that quick keeps the first two.
- Mutation controls, one per asserted property (L60): drop `--mode quick`, spell it `--mode fast`, move the kind
  line out of the section, drop one skip pointer, add a second quick run-start — each must fail its rule.

### 7. The human-only docs (D11) — `proposed/`, generated, tolerant

- **Edits** (the build may tighten the wording; the facts are fixed here for the grill):
  - `LIMITS.md §3a`: keep the paragraph's first sentences (the fan-out problem), drop the false clause, and add:

    > **The manual flag is `/pharn-ship --quick` (6.23.0), and it trades checks for cost.** A human chooses it for
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

    > **Quick mode** (`/pharn-ship --quick`, 6.23.0) runs a shorter spine for a small change: a `spec_kind: quick`
    > SPEC (one to three criteria, each `unit` or `integration`), `plan`, the grill's floor stops without its
    > interrogation, `test`, `build` and `verify` as above, and **no `regress`**, so nothing looks for a
    > regression outside the feature. Both human gates stay, and the ledger outcome is `gate2-quick`, never
    > `gate2`. Bounds: `LIMITS.md §3a`; shape: `pharn-contracts/spec-template.md`, `pharn-contracts/cost-ledger.md`.

  - `pharn/ARCHITECTURE.md §4` **(conditional)**: `ac-tests, spec-template` → `ac-tests, stage-exit, spec-template`
    (before `spec-template`, so "the default SPEC template it defines" still binds to it). Included
    **iff** `pharn/pharn-contracts/stage-exit.md` exists when the patch is generated. After the edit, the list must
    name every `pharn/pharn-contracts/*.md` stem, else the generator exits 1 naming the missing ones. So the line
    matches whatever merged, under whatever name.

- **Generator** `.dev/features/ship-quick-mode/handoff/make-patch.mjs`, committed so the orchestrator can regenerate
  after a sibling merge (a deviation from the precedent, which deleted its staging sources; the reason is the
  brief's tolerance ask). Node stdlib, `spawnSync` with argv arrays only (no shell strings, no `$VAR`, no heredoc —
  the forms an isolated worktree refuses). It never writes a trusted-doc path:
  1. read `LIMITS.md` and `pharn/ARCHITECTURE.md`; apply its embedded edits **in memory**; each `find` must match
     exactly once, else exit 1 having written nothing;
  2. decide the §4 edit from the presence of `stage-exit.md`, and run the completeness assertion;
  3. write the before/after texts to `.pharn/pharn-dev-build/ship-quick-mode-patch/{a,b}/<file>.txt` (scratch
     names never equal to a trusted path); `git diff --no-index` (exit 1 = "differs" is success); rewrite the
     headers to `a/LIMITS.md` / `b/LIMITS.md` and `a/pharn/ARCHITECTURE.md` / `b/…`; write
     `proposed/human-only.patch`;
  4. `git apply --check proposed/human-only.patch` against the working tree (writes nothing);
  5. write `proposed/human-only.sha256` (`<hex>  <path>`, `shasum -c` format) from the in-memory results;
  6. print `stage-exit: present|absent` and the new ARCHITECTURE pin (the `hash-doc.mjs` fold) for `APPLY.md`;
     remove the scratch directory.
- **`apply.sh`**, the precedent's shape:
  - It refuses `main`.
  - `EXPECT_STAGE_EXIT=<present|absent>` is written in at build time; on a mismatch with the tree it refuses,
    saying "regenerate: `node .dev/features/ship-quick-mode/handoff/make-patch.mjs`".
  - Then `check-bash-reconcile.mjs --base .`, without `--require-baseline`, for the sibling's reason: stage agents
    run in separate worktrees, so the human's checkout may hold no baseline.
  - `git apply --check`, then `git apply`.
  - `shasum -a 256 -c` and `node .dev/floor/check-specified-markers.mjs .` on the applied bytes; on failure it
    restores both files from `HEAD` and exits 1, nothing committed.
  - A path-scoped commit of the two files.
  - The setter from this PLAN, then `reconcile-baseline.mjs --anchor`, in that order (L38).
- **`APPLY.md`**: what to read (`git apply --stat`), what the script does, and when to apply: after
  `/pharn-dev-build`, before the merge. It covers the ARCHITECTURE pin moving and the Q1 sibling interaction; the
  regeneration command; and, when `stage-exit` was absent, that the §4 line is owed by whichever phase merges second.

### 8. Version (D12)

**Minor, 6.22.0 → 6.23.0.** A newly shipped capability: a mode, a SPEC kind, a CLI print mode and a marker flag.
Nothing invalidates an install. A SPEC without `quick` validates as before; every existing marker and ledger reads
as before (the `mode` key and `gate2-quick` are additive, and old checkers accept both). **`MIN_CLI` stays 0.5.0**:
no installed path moves, and a CLI that copies `pharn/floor/` and `.claude/commands/` per file lands every change.

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
- `README.md` — EDIT. Badge 6.23.0, the ledger bullet, the `--quick` usage, the commands row, the token-cost bullet — layer repo-meta
- `CHANGELOG.md` — EDIT. `## [6.23.0]` (date of the build), moving any `[Unreleased]` entry — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.22.0` → `6.23.0` — layer repo-meta
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
- `.claude/commands/pharn-loop.md`, `pharn-regress.md`, `pharn-verify.md`, `pharn-test.md`, `pharn-plan.md`, `pharn-build.md` — no quick behaviour there (the loop is Phase 3.2).
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
   SPEC; `mark-phase --mode fast`); and the generator's `stage-exit` line.

## Chain sequencing

1. `/pharn-dev-grill` → `/pharn-dev-build` (above) → the floor → `/pharn-dev-regress` → `/pharn-dev-verify` →
   `/pharn-dev-review` → GATE 2. **No designed STOP:** no test reads `LIMITS.md` or `ARCHITECTURE.md` prose, so the
   chain runs green with the patch pending.
2. The human applies the patch (`sh .dev/features/ship-quick-mode/proposed/apply.sh`) after `/pharn-dev-build`,
   preferably at GATE 2 before the merge (Q1). If applied before `/pharn-dev-verify`, resume there (L17).
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
- **Hygiene.** §6 above, with its mutation controls.

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
  (Bash-written, L19), and either misreading under-claims (§5). Agreement, never provenance (L43).
- "What quick mode does not check" → **stated, not guarded**: regressions outside the feature (no base comparison;
  `check-regress scope`'s smoke alarm does not run either, though the verify-time `reconcile` gate does), the plan
  interrogation, and the two artifacts. `SHIP.md`'s list is advisory prose; the ledger's markers and outcome are the
  machine record.
- "The change is small" → **not a claim**. Nothing measures it; a human chose the flag and the kind.

## Trust audit (P2)

- **New inputs.** The SPEC frontmatter reaches `--spec-kind`, which prints only a closed-set token or an empty line
  (never raw text, L62). The `--mode` argv is checked against a closed set. The marker's `mode` value is compared by
  exact equality and dropped at normalization unless it is a member.
- **Outputs.** The quick `GRILL.md` is fixed text plus two floor results and holds no untrusted free text. `SHIP.md`'s
  "Not checked" list is fixed text. Control flow still reads only exit codes, enum verdicts and the kind token.
- **Residual.** Unchanged from `LIMITS.md §2`: the free text quick mode still presents (`VERIFY.md`, `BUILD.md`) is
  quoted as DATA, and less of it is presented.

## Determinism audit (P5)

- Every new branch is a membership test: `--quick` present as a token; `--spec-kind` prints exactly `quick`; the
  current run-start's `mode` equals `quick`; the kind is in `TEST_FIRST_KINDS`.
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
  - Resolved: _pending GATE 1_.
