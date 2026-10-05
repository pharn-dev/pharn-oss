# PLAN — front-grill-concurrent: the loop's grill runs floor-only, and ship reads the grill's floor stops first

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4 # fix #4 — sha256(pharn/ARCHITECTURE.md), pinned 2026-10-05
- applied_lessons: [L19, L29, L38]
- increment: `/pharn-loop`'s FULL-mode grill becomes `floor-only` (its two checkers, inline, through a new `/pharn-grill <name> --floor-only`; no grill agent, no interrogation), and `/pharn-ship` reads the grill's two floor stops BEFORE spawning its grill agent; grill ‖ test concurrency is recorded as infeasible (follow-up `front-grill-concurrent-agents`).
- layer(s): product `.claude/` surface (`pharn-loop.md`, `pharn-loop-quick.md`, `pharn-ship.md`, `pharn-ship-quick.md`, `pharn-grill.md`) + product floor (`pharn/floor/stage-agent-core.mjs`) + `.dev/floor` tests (apparatus) # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P3, P4, P5, P6, P7]

## Decisions (GATE 1, 2026-10-05)

Recorded as decisions of the **orchestrating model, to whom the user delegated this batch's decisions** — not a human
approval:

1. Checkers first: build it, and apply the same reorder to `/pharn-ship` Step 2 (kept local).
2. Grill ‖ test concurrency: accepted as infeasible in this batch; follow-up `front-grill-concurrent-agents` carries
   the blockers below.
3. **Adopt option 3:** `/pharn-loop` FULL mode routes the grill `floor-only`, exactly as its quick mode already does.
   Rationale (recorded in the CHANGELOG and the policy's owner, `stage-agent-core.mjs`): unattended, the grill's
   findings gate nothing and nobody reads them before the build; the 92-minute run paid 361.0 s and a ~302k-token
   cache write for them. `/pharn-ship` keeps its full grill — a human reads `GRILL.md` at GATE 2.
   With (3), the loop's checkers-first read and its floor-only grill are ONE read: the inline `/pharn-grill
--floor-only`'s own two floor stops, with no second run of either checker.
4. Version: minor, **6.45.0** (pre-assigned); the PR targets `main` directly.

## Applied lessons

- L38 — the single `.pharn/writes-scope.json` per tree is the first named reason grill ‖ test is NOT built: two
  concurrent stage agents in one tree contend for it (grill's Step 0 setter and its `--clear` would replace or release
  the test stage's scope mid-run), so that design is recorded as infeasible rather than patched by discipline.
- L19 — the only way to promote a grill draft from `.pharn/` to `GRILL.md` after the test stage would be a Bash write
  outside fix #7; nothing here builds one. The new `--floor-only` grill still writes `GRILL.md` through the Write tool
  under its own Step 0 scope, so its "writes only GRILL.md — the fix #7 hook" claim stays true.
- L29 — every set this change moves is changed at its ONE enumeration: `ROUTE_POLICY` / `INVOCATIONS` (the totality
  test pins them together), `STAGE_AGENT_WIRING.routed` / `.modeLines` for the loop (derived parity, so the loop's
  grill route line, brief and read must disappear together), and ship's checkers-first ORDER pin iterates the two
  checker lines rather than asserting one.

## The P7 trigger (cited evidence)

`.dev/measurements/loop-wall-clock-2026-10-05.md` §2 "By stage", the 92-minute `billing-plan-catalog` run: grill
**361.0 s** (`agent:opus`, 41 requests, a ~302k-token first-request cache write, ~425k cache-read), then test
**538.3 s**, strictly in sequence. In the loop nothing reads `GRILL.md`'s findings before the build (they gate nothing,
Step 4), so the agent bought no decision. Both orchestrators read the grill's two floor stops only AFTER the grill
agent returns, so a RED plan still pays a grill agent before stopping.

## Design

### A. `/pharn-grill <name> --floor-only` (new mode, `pharn-grill.md`)

`--quick` cannot serve the full loop: its Step 1b refuses any SPEC kind but `quick` (the backstop for the quick
pipelines). So a sibling mode: **`--floor-only` is `--quick` without Step 1b** — any SPEC kind; Steps 2 and 2b run as
written (both floor stops; a RED writes the RED grill-log); Steps 3/3b are skipped; on GREEN the `GRILL.md` takes the
quick shape with the mode line `mode: floor-only (/pharn-grill --floor-only)` and the pinned line
`interrogation NOT performed — skipped by mode (floor-only)`. Recognized only as the second argument (ADVISORY, as for
`--quick`). Step 0's scope setter and the Final step's `--clear` are unchanged, so the hook claim holds. `/pharn-loop`
(full mode) is its one invoker. The description line gains the mode.

### B. Policy (`stage-agent-core.mjs`)

`ROUTE_POLICY["pharn-loop"].full["pharn-grill"]`: `AGENT` → `"floor-only"`; `INVOCATIONS["pharn-loop"].full` loses
`pharn-grill`. The header's routed-set sentences change, and the header carries the rationale (P4 owner). Since the
loop's grill is now inline in BOTH columns, policy parity (`command-hygiene.test.mjs` rule 3) requires the loop to have
**no** grill route line at all — exactly the shape of the inline-by-policy regress/verify stages.

### C. `/pharn-loop` Step 4 (`pharn-loop.md`) and its quick part

- The grill item loses its route, brief and read lines; it keeps a stage-start marker **without** `--route` and the
  orchestrator return, as `/pharn-verify` does. Between them: invoke `/pharn-grill <name> --floor-only` INLINE.
- Its two floor stops ARE the verdict read (the old "same reads as `/pharn-ship`" sentence goes): both exit `0` →
  `/pharn-test`; either non-zero → **S9** (already the row for a RED chain / RED lessons declaration). No second run of
  either checker — the collapse decision 3 asks for.
- `## Running a stage` and the routed-stage lists: the grill moves to the inline-by-policy set in both columns;
  "`done` from spec, plan or grill" → "spec or plan".
- One sentence in Step 4 states the trade and cites the owner: no plan interrogation in an unattended run; `GRILL.md`
  says so; `/pharn-grill <name>` run by a person interrogates.
- `pharn-loop-quick.md` item 3: no `--mode quick` route line any more (nothing to route); the delta is only "invoke
  `/pharn-grill <name> --quick` in place of Step 4's `--floor-only`", whose eligibility refusal is S9. Its intro list
  stops naming the interrogation as a quick-only skip.

### D. `/pharn-ship` Step 2 (`pharn-ship.md`) and its quick part

- The pinned two-checker block (unchanged argv) moves from after the grill's return marker to **before** its route
  line: both `0` → route the grill; either non-zero → **STOP** (no grill agent, no `GRILL.md`), same remedies as
  today. Net reads on the green path: unchanged.
- Dropping the post-grill read is safe within its stated bound: the grill's Write-tool scope is `GRILL.md` alone
  (fix #7 hook, floor), so it cannot edit `PLAN.md`/`SPEC.md` through the write tools; a Bash write could (L19, the
  residual it always was), and `/pharn-build`'s own Step 0 chain re-check still runs.
- `pharn-ship-quick.md` item 4: a quick run skips the pre-grill block; `/pharn-grill --quick`'s own two floor stops are
  that read, either RED a STOP.

### E. Not built — grill ‖ test concurrency (follow-up `front-grill-concurrent-agents`)

Blockers, recorded in the CHANGELOG and SHIP.md: (1) one writes-scope per tree (L38) — a scope-less grill mode would be
judged under the test stage's scope, voiding "writes only GRILL.md"; (2) one `stage-result.json` per (command, name) in
`stage-agent.mjs` — concurrent agents overwrite each other's result, `read` then refuses (S9); (3) promoting a draft is
a Bash write (L19) and `GRILL.md` is reconcile-exempt; (4) `executions` leaves the grill row unmeasured and the
marker-window stage view bills grill requests to `pharn-test`; (5) an inline route serializes anyway; (6) the
fingerprint is NOT a blocker (`.pharn/` is excluded). With (3) adopted the loop has no grill agent left to overlap, so
the follow-up matters only to `/pharn-ship`.

### Saving (92-minute run, [R·e])

- Loop, full mode, every run: the grill agent's **361.0 s** is replaced by an inline floor-only grill — the Skill load,
  the setter, two checkers, one `GRILL.md` Write and the clear, ≈ 6 orchestrator requests × ~10.7 s (the run's measured
  85.7 s / 8 orchestrator gaps) ≈ 64 s. **Saving ≈ 297 s ≈ 5.0 min**, plus the agent's ~302k cache-write and ~425k
  cache-read tokens (opus).
- Ship, RED plan only: the grill agent is skipped (one fresh agent ≈ 1–1.5 min). Green path: 0.

## Files

- `pharn/floor/stage-agent-core.mjs` — loop full grill → `floor-only`; `INVOCATIONS` entry removed; header sentences +
  rationale — layer product floor
- `pharn/floor/stage-agent-core.test.mjs` — the loop full grill cell's expectation, if any test pins it — apparatus
- `pharn/floor/stage-agent.test.mjs` — likewise, if a route test pins the loop's full grill as agent — apparatus
- `.claude/commands/pharn-grill.md` — the `--floor-only` mode + description — layer product `.claude/`
- `.claude/commands/pharn-loop.md` — Step 4 grill item, `## Running a stage` lists, pointer line — layer product
  `.claude/`
- `.claude/commands/pharn-loop-quick.md` — item 3 and the intro list — layer product `.claude/`
- `.claude/commands/pharn-loop-close.md` — only if a claim there says the full loop interrogates (none found at
  planning; listed so a needed edit is in scope) — layer product `.claude/`
- `.claude/commands/pharn-ship.md` — the pre-grill verdict block moved before the grill route line — layer product
  `.claude/`
- `.claude/commands/pharn-ship-quick.md` — item 4's verdict-read sentence — layer product `.claude/`
- `.dev/floor/command-hygiene.test.mjs` — loop `STAGE_AGENT_WIRING` (routed/modeLines), the loop-quick pointer and
  mutation fixtures that used the loop's quick grill route line, a ✧ ship ORDER test (both checker lines before the
  grill route line, with a mutation control), ✧ pins for `--floor-only` in `pharn-grill.md` and in `pharn-loop.md`,
  and any byte ceiling the diff needs (visible) — apparatus
- `.dev/floor/command-family.test.mjs` — only if a family pin names a moved line — apparatus
- `CLAUDE.md` — the STAGE-MODEL ROUTING paragraph's routed sets — repo meta
- `README.md` — badge; the `GRILL.md` bullet, the `/pharn-loop` paragraph and the cost paragraph that call the
  interrogation quick-only — repo meta
- `docs/capabilities/**` — regenerated by `npm run docs:generate` if a command change moves it — generated
- `SKILLS_VERSION` — 6.45.0 — repo meta
- `CHANGELOG.md` — `## [6.45.0]`, moving any `[Unreleased]` entry into it — repo meta
- `.dev/features/front-grill-concurrent/PROTECTED-FOLLOWUPS.md` — `LIMITS.md §3a` (and `ARCHITECTURE.md §6`'s grill
  row) wording the change leaves incomplete — layer `.dev/features`
- `.dev/features/front-grill-concurrent/PLAN.md` — this plan — layer `.dev/features`
- `.dev/features/front-grill-concurrent/GRILL.md` — grill log — layer `.dev/features`
- `.dev/features/front-grill-concurrent/BUILD.md` — build log — layer `.dev/features`
- `.dev/features/front-grill-concurrent/REGRESSION.md` — regress artifact — layer `.dev/features`
- `.dev/features/front-grill-concurrent/regression-report.json` — regress artifact — layer `.dev/features`
- `.dev/features/front-grill-concurrent/VERIFY.md` — verify artifact — layer `.dev/features`
- `.dev/features/front-grill-concurrent/verify-report.json` — verify artifact — layer `.dev/features`
- `.dev/features/front-grill-concurrent/REVIEW.md` — review — layer `.dev/features`
- `.dev/features/front-grill-concurrent/SHIP.md` — ship record — layer `.dev/features`
- `pharn/floor/grill-scan.mjs` — (review R2) runs the five `scan-plan-*` scanners over a PLAN and prints the
  `--floor-only` GRILL.md scan section — layer product floor
- `pharn/floor/grill-scan.test.mjs` — its tests — apparatus

## Review amendments (independent review of `cfb7158`; owner decisions, all fixed)

- R2: `--floor-only` also runs the five deterministic `scan-plan-*` scanners through the new tested
  `pharn/floor/grill-scan.mjs` and puts their output in `GRILL.md` as advisory, finding-shape DATA; only the
  model-driven grillers and the interrogation are dropped. Quick mode is unchanged. The rationale is corrected (no
  stage reads the findings before the build since routing split the contexts), and `PROTECTED-FOLLOWUPS.md` gains
  `LIMITS.md §5` and `THREAT-MODEL.md §1`.
- R1: the loop's Step 7 `inline (policy)` list names `/pharn-grill`, pinned against `ROUTE_POLICY`'s policy-inline
  cells.
- R3: the saving quotes the ledger figures (43 requests, cache_write 391,438, cache_read 16,097,324; ≈352 s).
- R4: a ship grill `read` exit 3 is a STOP; the CHANGELOG notes `stop:pharn-plan` and SHIP.md's "not written"
  pointer on a pre-grill STOP.
- R5: wording in `pharn-loop.md` and `--floor-only` threaded through `pharn-grill.md`.

## Grill amendments (all five `GRILL.md` findings taken)

- P0 (important): the CHANGELOG entry and `pharn-ship.md`'s verdict block name the dropped post-grill lessons re-read
  as a stated bound (a Bash write by the grill agent to `PLAN.md` is not re-checked for lessons before the build).
- P0 (minor): ship's pre-grill STOP presents the checker's RED line verbatim as DATA, since no RED `GRILL.md` is
  written on that path.
- P5 (important): the build runs the whole hygiene suite over the edited loop body (PHASE_MARKER_WIRING and every
  STAGE_AGENT_WIRING rule), not the parity rule alone.
- P5 (minor): ✧ pins both ways — `pharn-loop.md` names `/pharn-grill <name> --floor-only`; `pharn-grill.md` names
  `/pharn-loop` as its invoker.
- P7 (minor): the saving names the inline grill's context cost (pharn-grill.md, ~21 KB, read from cache by later
  orchestrator requests) as a token offset.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — unchanged; its S9 stop carries a RED grill stop (cited, P4).
- `pharn/floor/stage-agent-core.mjs`'s header is the routing protocol's spec (no separate contract); the policy edit is
  made there.

## Evals to write (P1)

- No `role:` capability is added or changed, so no eval fixture. Command and policy changes are pinned by the tests in
  `## Files` (policy parity, order, presence, mutation controls).

## Guarantee audit (P0)

- "The loop's grill is not routed to an agent" → floor (`ROUTE_POLICY` enum cell + the parity test over the command's
  lines); that a run obeys `route`'s output and invokes `--floor-only` inline is advisory.
- "`/pharn-grill --floor-only` writes only `GRILL.md`" → floor (fix #7 hook; Step 0 unchanged).
- "Both floor stops still gate the loop and ship" → the verdicts are floor (enum/regex + content-hash checkers); acting
  on them is advisory orchestration, as before.
- "Ship reads both stops before its grill agent" → floor for presence/order of the pinned lines (enum/regex over the
  command text); advisory that a run executes them.
- STRUCK, never written: "the loop's plan was interrogated"; "the floor-only grill checks the plan's quality".

## Trust audit (P2)

- No new input. The checkers' RED lines quote `PLAN.md` content into a STOP/S9 report as DATA, as today. The loop no
  longer ingests a grill agent's free text at all (one fewer `THREAT-MODEL.md §5` residual site per run).

## Determinism audit (P5)

- Branches stay exit-code membership tests (`0` vs non-zero → a fixed row / STOP). The policy cell is a closed enum.

## Trusted-doc / hook / MIN_CLI impact

- No hook, settings or `MIN_CLI` change. A pre-0.7.0/older CLI is irrelevant: the policy is read at run time from the
  installed `stage-agent-core.mjs`, and the command and module ship together.
- `LIMITS.md §3a` lists "the plan interrogation" among what the QUICK loop leaves out — still true, but now the full
  loop leaves it out too, so the contrast is incomplete (stale, not an overclaim). `pharn/ARCHITECTURE.md §6`'s grill
  row ("findings vs plan") reads as if every grill-log carries findings; the quick runs already did not. Both go to
  `PROTECTED-FOLLOWUPS.md` with exact current text and proposed replacement.

## Stay-in-lane note

`orchestrator-direct-stage-calls` and `loop-entry-preflight` edit `pharn-loop.md` / `pharn-ship.md`. This diff removes
the loop's grill route/brief/read lines (theirs may rewrite those same lines — a textual conflict the orchestrator
resolves by dropping them) and moves ship's verdict block within Step 2; nothing else.

## Open questions (HALT)

- None.
