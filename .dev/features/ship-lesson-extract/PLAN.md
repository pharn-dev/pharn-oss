# PLAN — ship-lesson-extract

- spec_content_hash: 69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e # fix #4
- applied_lessons: [L4, L6, L7, L8, L19, L20, L29, L30, L31, L33, L34]
- increment: Add a **Step 2b — lesson-extract** to `/pharn-dev-ship` only: at GATE 2, after the chain's
  last floor verdict and before the `SHIP.md` write, propose at most ONE lesson candidate from the run's
  own artifacts, always halt for an explicit human answer, route an accepted candidate through the
  existing `/pharn-dev-memory-promote` command (never a direct canon write), and record the outcome as a
  `lesson:` line in `SHIP.md` from a closed set so a candidate can never be silently dropped.
- layer(s): build apparatus — `.claude/commands/` (a `pharn-dev-*` command) + `.dev/floor/` (its
  wiring test). **Not** the product surface: no `pharn/` capability tree, no product floor, no trusted
  doc. Per `CLAUDE.md` "SKILLS_VERSION discipline", `pharn-dev-*` commands and `*.test.*` files are
  apparatus, so this increment does **not** bump `SKILLS_VERSION`.
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Applied lessons

- **L7** — a stage that only _proposes_ a lesson must not hold write-scope to canon; route the gated
  write through the dedicated command. This is the load-bearing constraint of the whole increment:
  `/pharn-dev-ship`'s `writes:` frontmatter stays **exactly** `[".dev/features/<name>/SHIP.md"]` and gains
  **nothing**. `.dev/memory-bank/lessons-learned.md` is added to `reads:` only. L7's own instance was
  `/review` declaring canon in `writes:` and thereby being handed the ungated write that
  `check-provenance` + the human accept exist to withhold — the identical mistake was available here and
  is refused by construction.
- **L8** — the setter narrows one `--target` per call, so a command emitting a second placeholder
  artifact loses scope on it. Applied by folding the lesson outcome **into the existing `SHIP.md`**
  rather than adding a `features/<name>/lesson-candidate.json`; the candidate itself is scratch under
  `.pharn/pharn-dev-memory-promote/` (always-writable, not hook-gated), which is where
  `/pharn-dev-memory-promote` already puts it. `/pharn-dev-ship` keeps exactly one scopeable output.
- **L19** — a stage's Bash-run tooling escapes the `writes:` gate entirely. Applied by stating, in the
  Step 2b guarantee audit, that "`/pharn-dev-ship` cannot write canon" is floor **for the
  Write/Edit/MultiEdit/NotebookEdit surface only** — a Bash-run `sed`/`cat >>` would bypass `PreToolUse`
  and no checker would catch a future edit that added one. Declared as a bound, not papered over.
- **L20** — a discipline-only remedy will recur, and the **second occurrence** is the trigger to give it
  a floor check. Applied twice, both times as a restraint: (a) the "`lesson:` line is always present"
  property is discipline-only and is labeled **advisory**, with **no** floor check added, because L20's
  trigger has not fired — recorded as the named residual `ship-lesson-line-check`; (b) L20 is also the
  bar Step 2b applies when judging a candidate — a finding is lesson-worthy only if its remedy would
  otherwise be "remember next time" — and that judgment is labeled advisory model work.
- **L29** — when a remedy is quantified over a set, the **enumeration** is the deliverable. Applied to
  the outcome vocabulary: the five `lesson:` values are materialized once as `LESSON_OUTCOMES` in
  `.dev/floor/command-hygiene.test.mjs` and the membership rules **iterate** it, so a sixth value added
  later inherits every rule rather than being asserted for whichever value the author had in front of
  them.
- **L30** — a step that RUNS some of the gates it names and ASKS for the rest fails on the asked-for
  ones. Applied to Step 2b's procedure: every action it names is an **invocation** it performs
  (`/pharn-dev-memory-promote`, `AskQuestion`), never a prose bullet asking the agent to "ensure
  provenance is valid" or "confirm the human agreed". Step 2b names no gate it does not itself reach.
- **L31** — a deliberate copy-pair's obligation set is where the second copy drops the obligation.
  Applied head-on: scoping to `/pharn-dev-ship` alone **creates** a 3-site obligation set
  (`pharn-dev-ship.md`, `pharn-ship.md`, `pharn-loop.md`) of which this increment wires **one**. The set
  is therefore materialized **now** — in the test's `LESSON_EXTRACT_WIRING` comment and in a named
  follow-up — rather than left to be rediscovered when someone audits the product half in isolation.
- **L33** — a forward-looking claim expires the moment the work lands, and the repair pass misses variant
  spellings. Applied by re-auditing `/pharn-dev-ship`'s own expiring prose in this increment: its
  "What `/pharn-dev-ship` does NOT do" section and its "Guarantee audit" both make claims Step 2b
  changes, and both are edited in the same diff. The deferral note for `/pharn-ship` / `/pharn-loop` is
  written with an explicit reopen trigger so it does not itself become a stale "not yet built".
- **L34** — "for each X, assert P" is vacuously true over an empty domain. Directly load-bearing here
  because `LESSON_EXTRACT_WIRING` has exactly **one** member: without a non-vacuity guard the whole rule
  set would certify nothing the day someone renames the command. Applied as an explicit
  `length === 1` assertion plus the existing "every named command exists on disk" check, mirroring the
  guards `PLAN_LESSONS_WIRING` and `LESSONS_SWEEP_WIRING` already carry.
- **L4** — an authored assertion passes by construction; the discrimination must be pinned separately.
  Applied by giving each wiring rule a `DISCRIMINATES` mutation test that strips the invocation from the
  real command body and requires the matcher to stop matching, so a future loosening of the regex fails
  here instead of silently certifying a command that lost its wiring.
- **L6** — a structural fact is read from its structured location, never grepped from free text. Applied
  to how Step 2b learns its own outcome: `promoted` comes from the human's explicit `AskQuestion`
  selection plus `/pharn-dev-memory-promote`'s own gate, never from pattern-matching that command's
  printed prose for a success-looking sentence.

## Files

- `.claude/commands/pharn-dev-ship.md` — add **Step 2b — lesson-extract** between Step 2 and Step 3; add
  the `lesson:` / `deferred:` lines to the Step-3 `SHIP.md` roll-up spec; extend the Guarantee audit and
  the "does NOT do" section; add `.dev/memory-bank/lessons-learned.md` + the two memory-promote paths to
  `reads:` (**`writes:` unchanged**); `version: 0.2.0` → `0.3.0` — layer: build apparatus
- `.dev/floor/command-hygiene.test.mjs` — add the `LESSON_EXTRACT_WIRING` obligation set (1 member today,
  3 named), the `LESSON_OUTCOMES` enumeration, their presence / DISCRIMINATES / non-vacuity rules, and a
  rule pinning that `/pharn-dev-ship` does **not** declare canon in `writes:` (the L7 guard) — layer:
  build apparatus (dev floor)
- `CHANGELOG.md` — one `[Unreleased]` entry describing the change, its honest P7 trigger, and
  **"Apparatus: no `SKILLS_VERSION` bump"** — layer: repo meta

### Explicitly not touched

Each of the following would be a second axis of change (P3/P7). This is a **heading**, not a bold prose
intro, so `set-writes-scope.cjs` ends the authorized list here **structurally** (Boundary 1) rather than
by matching an exclusion cue — the L18 remedy, applied after the prose form was measured live in this
increment's own build at 5 parsed paths against the 3 approved — L20's recurrence, recorded in
`.dev/features/ship-lesson-extract/SHIP.md` (this increment declares no `BUILD.md`).

- `.claude/commands/pharn-ship.md` and `.claude/commands/pharn-loop.md` — the other two sites of the
  L31 obligation set. Deferred by explicit human decision at the `/pharn-dev-ship` discovery halt.
- `SKILLS_VERSION` — apparatus-only change; the product surface is untouched.
- Any TTY / headless detection primitive — none exists in this repo (verified live: zero hits for
  `isTTY` / `headless` / `non-interactive` across `.claude/**`, `pharn/**`, `.dev/floor/**`), and a
  prose "if headless, do not ask" would be advisory, enforcing nothing. Dropped by human decision.
- Any new floor checker over `SHIP.md`'s content — L20's trigger has not fired (see residual below).

## Contracts satisfied

- `pharn/ARCHITECTURE.md §5` (State / memory-bank) — cited, not restated (P4). §5 names `/pharn-plan` as
  the **read** side and `/pharn-memory-promote` as the **write** side. Step 2b adds **neither**: it is a
  **proposer** that routes into the existing write side, so §5's two-sided shape is unchanged and this
  increment makes no claim §5 does not already carry.
- `pharn/ARCHITECTURE.md §8` / `pharn/pharn-contracts/finding-shape.md` — the enum-gated vs free-text
  split. The candidate `body` is drafted from `REVIEW.md` / `GRILL.md` free text and therefore **inherits
  the untrusted tag**; it is quoted as DATA into the candidate and never followed as an instruction.
- `/pharn-dev-memory-promote`'s Step-2 candidate schema and Step-5 accept/deny gate — cited by reference;
  Step 2b **reuses** that command whole and restates neither its schema nor its checks (P4).

## Evals to write (P1)

**None — and the reason is structural, not an exemption.** P1 binds a **Capability**: a `.md` file whose
frontmatter carries a `role:` (`pharn/ARCHITECTURE.md §3.1`). Verified live this run: **no** file in
`.claude/commands/` declares `role:`, so no command is a Capability, none ships an `evals/` directory, and
`pharn/floor/validate.mjs` deliberately ignores `.claude/commands/` entirely. There is consequently no
runner that could execute an eval case over a command — `/pharn-dev-eval` runs `role:`-bearing
capabilities via `claude -p`, and a command is not one.

The testable surface here is **structural**, and it is covered by `node --test` in
`.dev/floor/command-hygiene.test.mjs` — the established pattern for exactly this
(`STEP_2B_GATES`, `LESSONS_SWEEP_WIRING`, `PLAN_LESSONS_WIRING` are three prior instances):

- `pharn-dev-ship.md` invokes `/pharn-dev-memory-promote` in Step 2b → the invocation is **present**, not
  merely described.
- that rule **DISCRIMINATES** — stripping the invocation from the real body makes the matcher fail (L4).
- `pharn-dev-ship.md` names the lesson-extract step **before** the `SHIP.md` write step (position, by
  byte offset of the two headings — the "before the final commit" requirement, re-anchored).
- each of the five `LESSON_OUTCOMES` appears in the command's `SHIP.md` roll-up spec (L29's enumeration,
  iterated).
- `pharn-dev-ship.md`'s `writes:` does **not** name `.dev/memory-bank/` (the L7 guard), and that rule
  discriminates against an injected canon path.
- the wiring set is **non-vacuous** — every named command exists on disk and the set's length is pinned
  (L34).

**Honest bound on all of the above (P0), stated here so the build cannot overstate it:** these pin that
the command **prose** contains the invocation, in the right order, with the right vocabulary. They
**cannot** prove a run executed Step 2b, that the human was actually asked, or that a candidate was not
dropped. **"The wiring is pinned" NEVER means "the lesson was extracted."**

## Guarantee audit (P0)

- "`/pharn-dev-ship` cannot write `.dev/memory-bank/lessons-learned.md`" → **floor: hook** (fix #7).
  `writes:` names only `SHIP.md`; `enforce-writes-scope.cjs` denies a Write/Edit/MultiEdit/NotebookEdit
  to canon. **NARROWED, and stated (L19):** that is floor for the `PreToolUse` tool surface **only** — a
  Bash-run append would bypass the hook entirely, and no checker would catch a future edit that added
  one. The `writes:`-shape test above is a second, independent pin on the declaration itself.
- "a promoted entry carries well-shaped provenance, a unique id, and a target in the canon enum" →
  **floor: enum-regex**, owned by `.dev/floor/check-provenance.mjs` **in the sub-stage**. Step 2b
  **adds no new floor primitive** — every guarantee it touches already belongs to
  `/pharn-dev-memory-promote`, exactly as the gated `/pharn-dev-ship` chain borrows its verdicts from its
  sub-stages.
- "a human explicitly approved before canon changed" → **advisory.** The floor cannot verify that a human
  answered an `AskQuestion` form; this is the same honest bound `/pharn-dev-memory-promote` already
  states for its own Step-5 halt, inherited rather than re-claimed.
- "the `lesson:` line is always present, so a candidate is never silently dropped" → **advisory.**
  Nothing reads `SHIP.md`'s content: no checker parses it, `validate.mjs` ignores `.claude/` and
  `.dev/`, and the test pins the command's **spec** of the line, not any written artifact. Writing
  "`/pharn-dev-ship` guarantees no lesson is dropped" would be the P0 disease — **struck**.
- "Step 2b never blocks the chain" → **advisory, and the phrasing matters.** `/pharn-dev-ship` is a
  command, not a program: it has no exit code, so "ship exits 0" is not a claim that can be made here.
  The accurate form is that Step 2b's outcome is **structurally excluded** from every proceed/stop
  decision — those read only `check-plan-lessons` / `validate` / `.verdict` (Step 2) and, in `--loop`,
  `check-ship.mjs`, whose input signature has no lesson parameter. A lesson-extract failure therefore
  **cannot** flip a verdict; it is recorded as `lesson: error <reason>` and GATE 2 is still reached.
- "the wiring is pinned by tests" → **floor-shaped (enum-regex over command prose)** for what it asserts,
  and it asserts **presence and order in a file**, never execution. See the bound stated under Evals.

## Trust audit (P2)

**This increment opens a new path from untrusted free text toward canon, and that is its principal
risk.** It must be named plainly (`THREAT-MODEL.md §2` surface 3 — memory-bank poisoning,
"write-once-influence-forever", the worst persistence vector).

- **Inputs.** Step 2b reads `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `VERIFY.md`, `REVIEW.md` and the two
  verdict JSONs. The `.verdict` / exit-code fields are the **enum-gated, floor-verifiable** class. All
  free text (`problem`, `evidence`, grill findings, review prose) **inherits the untrusted tag** of the
  increment under review (`pharn/ARCHITECTURE.md §8`, fix #1).
- **Propagation.** That untrusted free text is the origin of the candidate's `title` / `body`. It is
  carried as **quoted DATA** into `.pharn/pharn-dev-memory-promote/candidate.json` and rendered for the
  human; instruction-looking content inside it is a finding to report, never an instruction to follow.
- **What bounds it.** Three things, and none of them is the model noticing an attack: (1) `/pharn-dev-ship`
  holds **no write-scope to canon** (L7 — the fix #7 hook denies it); (2) the only route to canon is
  `/pharn-dev-memory-promote`, which sets its **own** scope, runs `check-provenance.mjs`, and halts for
  an explicit human accept; (3) `type` / `concepts` / `target` / `id` / `commit` are **shape-gated**, so a
  needle cannot survive as an enum-gated value.
- **Named residual, not zeroed.** Everything above bounds the **shape** and the **route**. It does not
  make a well-formed but poisoned lesson detectable — that is the human's judgment at the promote gate,
  exactly as `/pharn-dev-memory-promote` already states. What this increment genuinely changes is
  **frequency**: promotion becomes a routine end-of-run prompt rather than a deliberate, separately
  invoked act, which raises the rate at which a human is asked to ratify untrusted-derived prose. The
  mitigation is Step 2b's **at most ONE candidate** rule and the L20 worth-promoting bar — both
  **advisory** — plus the unchanged floor gate. Stated, not hidden (`LIMITS.md §2`).

## Named residuals and follow-ups (P7 — recorded, not built)

- **`ship-lesson-line-check`** — no checker verifies that a written `SHIP.md` actually carries a
  `lesson:` line from the closed set. Deliberately not built: L20's bar is a **second occurrence**, and
  there is not yet a first. **Reopens when** a real run is observed to reach GATE 2 with no `lesson:`
  line, or with a value outside the enumerated set.
- **`lesson-extract-product-sites`** — the L31 obligation set has three members and this increment wires
  one. `/pharn-ship` and `/pharn-loop` remain unwired **by explicit human decision**, not by oversight.
  `/pharn-loop` additionally needs a different shape: it already carries a lesson-adjacent
  `## Handoff` → `### learned`, whose subsection list `pharn/floor/check-loop-record.mjs` holds to
  **exact equality**, so a lesson there is a **modification** of an existing step (a new top-level
  section or an envelope key), never an added `###`. **Reopens when** either product orchestrator is next
  substantively edited.

## Open questions (HALT)

- **None blocking.** The three questions this increment turned on — scope (dev-ship only), the headless
  branch (dropped; always ask), and the missing `module.json`/Oracle apparatus (use `SKILLS_VERSION` +
  `CHANGELOG` and `node --test`) — were put to the human as an interactive form at the `/pharn-dev-ship`
  discovery halt and answered before this plan was written. The lessons-index freshness gate returned
  **GREEN** (`docs/lessons-index.md` matches the recompute from canon), so the two-step sweep ran as
  specified and no fallback-to-canon-in-full disclosure is owed.
- **One thing the human should confirm at this gate, because it is a judgment and not a fact:** the P7
  trigger. **No observed failure motivates this increment** — no lesson in canon, no dogfood run and no
  eval failure records a lesson being lost at ship time. The trigger is the **maintainer's explicit
  direction**, which P5 makes a legitimate terminal input, and this plan says so rather than
  manufacturing a failure to justify the work. The precedent is `applied_lessons` sub-check D (3.0.0),
  whose `CLAUDE.md` comment records the same honest trigger.
