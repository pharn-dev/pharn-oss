# PLAN — loop-grill-triage

- spec_content_hash: afa7dd5295db60c1a6ee28313854360fb8d560fcdfa69a03309fa01d43c3bf7f
- applied_lessons: [L2, L6, L8, L29, L31, L34, L35, L36, L41, L43, L54, L62, L65, L67, L68, L72, L83, L84]
- increment: part 2a of restore-loop-grill — a full `/pharn-loop` runs the full `/pharn-grill` again as a routed stage agent, then a new routed stage `/pharn-triage` gives every grill finding one disposition (`proceed` | `replan` | `spec`) in `pharn/features/<name>/grill-triage.json`, and a new floor CLI `grill-triage.mjs` re-derives the verdict from it; `proceed` goes on to the test stage, `replan` or `spec` stops the run `blocked: grill-escalation` (new row S16). No re-plan round yet (part 2b); no supervisor (part 3). `--quick` is unchanged (floor-only grill, no triage).
- layer(s): pharn-contracts (new `grill-triage.md`; `loop-record.md` id list), product floor (`pharn/floor/`), product commands (new `.claude/commands/pharn-triage.md`; `pharn-loop.md`)
- constitution_refs: [P0, P1, P2, P3, P4, P5, P6, P7]

## Open questions — RESOLVED at the halt (human-selected, P6, 2026-11-10)

None open. The human picked the recommended option for all four:

- Q1 → **split**: 2a = this plan (7.7.0), 2b = re-plan rounds (7.8.0), 3 = supervisor (7.9.0).
- Q2 → **(A) resolve through `default`** (sonnet/high); no `triage` key, no `MIN_CLI` change; the pharn-cli port
  follow-up is named.
- Q3 → **I run the measurement** after approval and before `/pharn-dev-build`: 5 real full grills; 2 or more of 5
  still RED after the repair round → HALT for a 7.6.x wording patch.
- Q4 → **no**: `grill-triage.mjs` REDs a `blocking` finding triaged `proceed`.

The questions as asked, kept for the record:

1. **Split part 2 again?** Part 2 as briefed (routed grill + triage + checker + re-plan rounds + round counter +
   archive + escalation) is larger than part 1 (25 files) before its re-plan half is counted. **Recommended: yes —
   2a = this plan (7.7.0): routed full grill + `/pharn-triage` + `grill-triage.mjs`, anything but `proceed` stops
   S16; 2b (7.8.0) = re-plan rounds: round counter CLI, `GRILL.r<n>.md` / `grill-findings.r<n>.json` /
   `grill-triage.r<n>.json` archive, cap 2, S16 only on cap-with-`replan` or `spec`; 3 (7.9.0, was 7.8.0) =
   supervisor + amend-spec + KNOWN RISK.** 2a alone closes the observed failure (findings no stage reads, runs ending
   green), because a person now gets the decision; 2b only adds the automatic recovery.
2. **Which model does `/pharn-triage` run on?**
   - **(A) Recommended — resolve through `models.stages.default` (no `triage` key in the shipped `pharn.config.json`);
     `pharn-triage.md` frontmatter `model: sonnet`, `effort: high` to agree with this repo's `default`.** No
     `MIN_CLI` change: pharn-cli copies `pharn.config.json`'s block unchanged, and its TypeScript port of the stage set
     (`pharn-cli/src/lib/model-config.ts:40`, `PRODUCT_STAGES`) is only consulted for keys a block names. Follow-up
     in pharn-cli (not blocking): add `triage` to that port and refresh the vendored checker, so a user who adds a
     `triage` key is not refused by `pharn status` (L31).
   - (B) A `triage: {model: opus, effort: high}` key in the shipped config. An older CLI refuses the whole block
     ("a block using the new member is rejected here and NOT applied", `model-config.ts:28-29`), so a fresh install
     on CLI ≤ 0.18.0 loses its routing until the user upgrades. Needs a pharn-cli release first, then a `MIN_CLI`
     bump merged after it is on npm (memory: MIN_CLI publish-before-merge).
3. **The first-pass RED measurement (owed (b)) — who runs it, and what threshold stops the build?** The loop will
   gate on `grill-findings.mjs check` (a RED is S9). Part 1 measured that 27 of 161 real `GRILL.md` files (17%) hold
   values the check refuses; the 7.6.0 wording and repair hints target them, unmeasured. **Recommended: I run it
   after approval and before `/pharn-dev-build`: the full 7.6.0 `/pharn-grill` headless (`claude -p`, a scratch
   copy of pharn-starter with the 7.6.0 commands and floor overlaid) over 5 real plans — the four evidence runs'
   `PLAN.md` plus one recent plan — recording, per run, the final `grill-findings.mjs check` exit and whether the
   grill took its repair round. Threshold: 2 or more of 5 still RED after the repair round → HALT, and a 7.6.x
   wording patch comes before this build.** Cost: about 5 × 361 s and 5 × 43 opus requests (the 6.45.0 ledger's
   grill row). Result written to `.dev/features/loop-grill-triage/GRILL-CHECK-MEASUREMENT.md`.
4. **May a `blocking`-severity finding be triaged `proceed`?** **Recommended: no — `grill-triage.mjs` REDs it.** The
   rule is the safe direction (a model-assigned severity can only force a stop, never a proceed) and is a pure enum
   comparison. In the evidence runs it would have fired 0 times (all four record 0 blocking-severity), so it is a
   backstop, not the mechanism; the mechanism is triage reading every finding.

## The failure (P7)

The maintainer's decision (2026-11-10, selectable form): the evidence is the failure mode itself. Four `/pharn-loop`
runs in pharn-starter (`~/Projects/pharn-starter/.claude/worktrees/agent-adfc1d89170f5e839/pharn/features/`,
2026-09-27) wrote 26 grill findings that no stage read: `reauth-binding` 6 (`GRILL.md:101`), `reauth-per-session` 8
(`:128`), `erasure-closes-teams` 5 (`:128`), `retention-gdpr-fixes` 7 (`:106`). All four record 0 blocking-severity;
three ended `STOP_GREEN`, one `STOP_TERMINAL`. Lead example: `erasure-closes-teams/GRILL.md:42` — nothing planned
shows the cancel is limited to that team's PENDING invitations. No single finding is claimed proven real.

Since then 6.45.0 made the full loop's grill `floor-only` (`stage-agent-core.mjs:33-43`): the findings were dropped
rather than read. The zero-blocking fact decides the design: a loop branching on the grill's own `severity: blocking`
would have done nothing in these runs, so a separate stage must read every finding and decide.

## The split (proposed — only 2a is planned here)

| part | what                                                                                                                           | bump  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | ----- |
| 1    | `grill-findings.json` + ids + `grill-findings.mjs` (merged, #424)                                                              | 7.6.0 |
| 2a   | full loop: routed full grill → `grill-findings.mjs check` → routed `/pharn-triage` → `grill-triage.mjs check`; S16 (this plan) | 7.7.0 |
| 2b   | re-plan rounds: round counter CLI, round archives, cap 2; S16 only on cap-with-`replan` or `spec`                              | 7.8.0 |
| 3    | `/pharn-supervise` + `check-supervisor.mjs` + amend-spec counter + KNOWN RISK in record, summary and commit/PR body            | 7.9.0 |

2a keeps every non-negotiable: a `replan` or `spec` verdict never proceeds without a decision, and before part 3 that
decision is a person's.

**Owed (d) — cost.** 2a adds, per full run, one routed full grill (361.0 s, 43 opus requests: the 6.45.0 ledger row,
`stage-agent-core.mjs:39-41`) and one triage agent (unmeasured; estimate a spec-sized agent, ~200 s / ~20 requests, on
`default`'s sonnet under Q2-A), against today's 8.5 s inline floor-only grill: about +9 min. Worst case after 2b and 3
(cap 2, one amend-spec — part 1's Q4): 4 plans, 4 grills, 4 triages, 2 supervisor calls, 1 extra spec ≈ 4×658 + 4×361 +
6×200 + 211 ≈ 5,300 s (~88 min) and ≈ 530 requests, unchanged from part 1's line. The entry gates run in the
background from Step 1a and are read after the front, so a longer front makes their result likelier to be ready, not
later.

**Owed (c) — `MIN_CLI`.** Not needed under Q2-A, measured in pharn-cli this run: the executable unit selects commands
by the path prefix `.claude/commands/pharn-*.md` (`src/lib/executable-unit.ts:29,48-50`), so an old CLI installs
`pharn-triage.md`; new floor files install with the floor directory; and no CLI code rewrites command frontmatter.
Under Q2-B it is needed (above).

## Discovery (read live this run)

- `pharn/floor/stage-agent-core.mjs`: header `:19-43` (the 6.45.0 policy and why), `STAGES` `:222-231`,
  `STAGE_CONFIG_KEYS` `:241-249`, `POLICY_CELLS` `:254-255`, `ROUTE_POLICY` `:261-304` (loop full grill
  `floor-only` `:287`), `INVOCATIONS` `:311-338` (no loop grill entry).
- `pharn/floor/check-model-config.mjs`: `PRODUCT_STAGES` `:95-110` (closed; forward pass `:329-354` resolves every
  member through `default` when it has no own key; reverse pass `:356-` REDs a `pharn-*.md` that carries `model:` and
  is not mapped — so `pharn-triage.md` must be mapped).
- `pharn.config.json` `models.stages`: `default` sonnet/high; all eleven stages have their own key.
- `.claude/commands/pharn-loop.md`: `writes:`/`reads:` `:1-30`; grants `:65-129` (part 1's three
  grill-findings lines `:122-124`); Step 2 table `:415-450` (S1–S15); `## Running a stage` `:499-596` (the 6.45.0
  sentence `:506-507`); Step 4 `:669-790` (inline floor-only grill `:694-721`; the floor-stop read is the inline
  grill's own, `:709-711`).
- `.claude/commands/pharn-ship-stages.md:225-285` — the routed-grill pattern this follows: the orchestrator reads both
  floor stops BEFORE spawning the grill agent, then reads every later verdict from a checker.
- `pharn/floor/loop-record-core.mjs:44-69` `BLOCKED_IDS` (S1–S15, frozen; rendered between the contract's
  `LOOP-BLOCKED-IDS` markers, `loop-record.md:116-137`; three-way equality test).
- `pharn/floor/loop-closeout.mjs:143` `STAGE_ARTIFACTS` — the green commit's artifact list (no grill-findings yet).
- `.dev/floor/command-hygiene.test.mjs:2648-2850` — the FLOOR-ONLY GRILL pins, including "pharn-loop.md invokes
  --floor-only inline and runs neither grill checker itself" (`:2837`), which this increment reverses; `:3189` pins
  the Step 4 grill sentence.
- `.dev/floor/stage-load-budget.test.mjs:87-142` `STAGE_LOADS` / `STAGE_LOAD_CEILINGS`.
- Trusted docs, the sentences that go stale: `ARCHITECTURE.md:243` (grill row), `LIMITS.md:161` (quick loop "like
  every `/pharn-loop` run since 6.45.0"), `LIMITS.md:279` (§5, observability under an unattended loop),
  `THREAT-MODEL.md:20` (security griller under an unattended loop); `THREAT-MODEL.md §5` names the free-text
  residual channels (1)–(5), and triage is a new one.
- pharn-cli (read only): `src/lib/model-config.ts:1-52` (a port, not a call; a new member in an upstream block is
  refused, never fatal), `src/lib/executable-unit.ts:15-50`, `src/steps/install-archetype.ts:458-475`.
- Probe (this run, a scratch worktree, reverted): the routing change alone — `pharn-triage` in `STAGES`, its key, its
  policy cells, the loop grill `agent`, a stub `pharn-triage.md` mapped in `PRODUCT_STAGES` — run under the full
  suite: 22 of 6,510 tests failed, in `command-hygiene` (FLOOR-ONLY GRILL R1, STAGE_AGENT_WIRING (3) and (9), BUDGET
  R1, loop-no-prompts, loop-grant-seam-skill), `stage-load-budget` (LOAD L1, L4), `check-model-config` (the eleven-stage
  agreement cases and the live-repo case), `stage-agent-core` (policy totality, cell-by-cell policy, `renderBrief`)
  and `stage-agent` (`brief`, `start --no-foreground-agent`). The FLOOR-ONLY R1 failure reads Step 7's route list in
  `pharn-loop-close.md`. The blocked-id tests iterate `BLOCKED_IDS` (no edit); `loop-closeout.test.mjs:913` and
  `check-regress.test.mjs:234` hard-list the artifact sets this plan grows.
- Lessons index: `check-lessons-index.mjs` GREEN (exit 0); selected from the index, the 18 cited read in full from
  canon.

## Applied lessons

- L2 — the new contract `grill-triage.md` carries its own floor/advisory split (what `grill-triage.mjs` checks vs
  what triage judges), and cites only the live CLI this increment builds.
- L6 — the loop reads the verdict from `grill-triage.mjs`'s exit code over the JSON's enum fields, never from
  `GRILL.md` prose or the triage agent's report.
- L8 — `/pharn-triage` writes exactly one file, `grill-triage.json`; the loop's inline-fallback grant scopes it with
  one `--target`.
- L29 — every rule over stages iterates `STAGES` / `ROUTE_POLICY`; the new cell is added to all four columns
  (`skipped` where triage does not run), never only to the loop's full column.
- L31 — pharn-cli's `PRODUCT_STAGES` port is a copy-pair; this plan names its follow-up instead of leaving it
  implicit (Q2).
- L34 — zero findings are triaged by an explicit empty `dispositions` array and verdict `proceed`; non-empty findings
  with an empty array are RED, so a suppressed triage cannot pass vacuously.
- L35 — the triage file restates no finding field: it holds ids aligned by index plus the findings file's sha256,
  never a second copy of `severity` or `problem`.
- L36 — coverage is closed both ways: `dispositions[i].id` must equal `findings[i].id` for every index, and the
  lengths must match.
- L41 — triage resolves through `default` under Q2-A; a `check-model-config` test exercises that no-own-key path
  over a config that names no `triage` key.
- L43 — the checker certifies agreement between two run-written files (the sha256 binding and the id alignment),
  never that a disposition is right; the contract says so.
- L54 — `grill-triage.mjs` reads both inputs through one `O_NOFOLLOW` descriptor, as `grill-findings.mjs` does since
  #424's CodeQL fix.
- L62 — RED reasons are fixed codes plus value-free hints; no value from either file is quoted through a function
  that can throw.
- L65 — `/pharn-triage`'s `writes:` holds `grill-triage.json` only: never `grill-findings.json` (the record it is
  checked against), `GRILL.md`, `PLAN.md` or `SPEC.md`; a hygiene test pins that.
- L67 — triage output comes from a model, and the check's accepted shapes are measured against real producer output
  before the loop gates on them: Q3's measurement for the grill side, and the build's realistic CLI test for the
  triage side.
- L68 — the trusted-doc text below is committed by a human BEFORE `/pharn-dev-build` anchors, never inside the
  window.
- L72 — the loop grill's cell changes from `floor-only` to `agent`; every caller that tests that literal or the
  seven-stage list is found by the probe run, not by memory, and listed in `## Files`.
- L83 — a `grill-findings.mjs check` RED is surfaced right after the grill (S9), not at the triage read, which could
  not name it.
- L84 — the escalation branch (exit 3/4 → S16) gets a CLI test on a realistic findings file with a `replan`
  disposition, so a checker that always prints `proceed` fails the suite.

## What is built

### 1. `grill-triage.json` — one disposition per finding (contract: new `pharn/pharn-contracts/grill-triage.md`)

```json
{
  "schema": "pharn-grill-triage/1",
  "round": 1,
  "findings_sha256": "<64 lowercase hex: sha256 of grill-findings.json's bytes>",
  "dispositions": [{ "id": "G1-1", "disposition": "replan", "reason": "…" }]
}
```

- Exactly these keys at the top and in each element; repeated keys refused at any depth (reuse
  `grill-findings-core.mjs` `repeatedKeyCount`).
- `round` equals the findings file's `round`; `findings_sha256` equals the sha256 of the findings file's bytes
  (content-hash); `dispositions.length` equals `findings.length` and `dispositions[i].id === findings[i].id` (closed
  both ways, L36).
- `disposition` ∈ `{proceed, replan, spec}`: `proceed` — the plan stands as written; `replan` — the plan must change
  before the build; `spec` — the plan cannot fix it without changing the SPEC's intent or criteria.
- `reason` — non-empty single-line, control-character-free, ≤ 2,000 characters; free text, untrusted (P2).
- Q4 rule: a finding whose `severity` is `blocking` may not be `proceed`.
- Verdict, derived, never stored: `spec` if any `spec`; else `replan` if any `replan`; else `proceed` (including zero
  findings with `[]`).

### 2. `pharn/floor/grill-triage-core.mjs` (pure) + `pharn/floor/grill-triage.mjs` (CLI)

- `skeleton <grill-findings.json>` — validates the findings file with `grill-findings-core.mjs` `validate` (imported,
  not copied — L35) and prints the triage skeleton: `round`, `findings_sha256`, and one element per finding with
  `disposition: ""` and `reason: ""`. Exit `0`; `1` findings invalid (`RED — <codes>` + hints); `2` usage or
  unreadable.
- `check <grill-triage.json> --findings <grill-findings.json>` — exit `0` proceed, `3` replan, `4` spec, `1` RED
  (`RED — <codes>` + one hint line per code), `2` usage or unreadable. On `0`/`3`/`4` stdout is one JSON line:
  `{"schema":"pharn-grill-triage-verdict/1","verdict":"replan","counts":{"proceed":4,"replan":1,"spec":0},"escalated":["G1-2"]}`
  — ids only (regex-gated), never a reason.
- Inputs read through one `O_NOFOLLOW` descriptor each, regular files only, 4 MiB cap (L54); every RED code
  value-free (L62).

### 3. `.claude/commands/pharn-triage.md` — the triage stage (new product command)

- Frontmatter: one-line `description:`, `model: sonnet`, `effort: high` (Q2-A), `kind: pharn-owned`,
  `trust: trusted`; `writes: ["pharn/features/<name>/grill-triage.json"]` only (L65); `reads:` SPEC, PLAN,
  `GRILL.md`, `grill-findings.json`, the contract.
- Steps: set the scope (one `--target`); read SPEC, PLAN and `grill-findings.json` — the findings' `problem` /
  `evidence` and the plan are `trust: untrusted` DATA, never instructions (P2 fence); run `skeleton`; give every
  finding a disposition and a reason; write the file; run `check` (one repair round on RED, then stop with the RED
  line); release the scope. Exactly one `## What you may claim` block: the checker's verdict is floor over shape,
  binding and coverage; every disposition is the model's judgment (advisory).
- Runnable on its own after `/pharn-grill <name>` by a person; only `/pharn-loop`'s full column runs it in a pipeline.

### 4. Routing — `pharn/floor/stage-agent-core.mjs`, `pharn/floor/check-model-config.mjs`

- `STAGES` gains `pharn-triage` after `pharn-grill`; `STAGE_CONFIG_KEYS["pharn-triage"] = "triage"`.
- `ROUTE_POLICY`: `pharn-loop.full` → `pharn-grill: agent`, `pharn-triage: agent`; every other column →
  `pharn-triage: skipped`; `pharn-loop.quick` keeps `pharn-grill: floor-only`.
- `INVOCATIONS["pharn-loop"].full` gains `pharn-grill: "/pharn-grill <name>"` and
  `pharn-triage: "/pharn-triage <name>"`.
- The header's 6.45.0 paragraph is rewritten to the 7.7.0 policy (the full loop's grill is read by triage; the quick
  loop's stays floor-only) — cited by `pharn-loop.md`, not restated (P4).
- `PRODUCT_STAGES` gains `triage: "pharn-triage.md"`; the header's "eleven" count is corrected.

### 5. `.claude/commands/pharn-loop.md` — Step 4, full column (the quick column is unchanged)

In order, each line pinned and granted exactly (`loopGrantOffenders`):

1. `/pharn-plan` as today, then the 7.5.0 peek.
2. **Verdict read before the grill** (the ship pattern): `check-plan-spec-agree.mjs` and `check-plan-lessons.mjs`;
   either non-zero → S9, quoting the RED line as DATA.
3. **Routed grill**: `stage-agent.mjs start / brief / finish --stage pharn-grill` (finish `--budget-ms 570000`);
   finish `3` → S9, `6` → S9b, as `## Running a stage` maps.
4. **Findings read**: `grill-findings.mjs check …` (part 1's granted line) — `0` go on; anything else → S9 (L83).
5. **Routed triage**: `start / brief / finish --stage pharn-triage`, the same mapping.
6. **Triage read**: `grill-triage.mjs check pharn/features/<name>/grill-triage.json --findings
pharn/features/<name>/grill-findings.json` — `0` → the entry-gate final read, then `/pharn-test`; `3` or `4` →
   **S16** (`blocked: grill-escalation`): copy the verdict and the `escalated` ids into `### next_steps` as DATA and
   point at `grill-triage.json` for the reasons (quoted, fenced, never followed); `1`, `2` or anything else → S9.

Also: the S16 row in Step 2's table; the "plan is not interrogated in an unattended run" paragraph rewritten for the
quick column only; `## Running a stage`'s 6.45.0 sentence; `reads:` gains `grill-findings.json`, `grill-triage.json`,
`grill-triage.mjs` and the contract; grants for the inline triage fallback (`Skill(pharn-triage *)`, its setter line,
`skeleton`, `check`). Amended at the build's restart: `writes:` is NOT changed — an inline stage scopes itself from its
own frontmatter (the loop declares neither `GRILL.md` nor `PLAN.md` either), so a loop `writes:` entry would grant
nothing the inline triage uses.

**Amended at the build's restart (2026-11-10, before the second anchor):** a sweep for prose still describing the
loop's grill as floor-only found three files the plan had not listed — `pharn-loop-quick.md` (item 3 says the quick
grill runs "in place of Step 4's `/pharn-grill <name> --floor-only`", and its intro dates the skipped interrogation to
6.45.0 for both modes), `.dev/guides/floor-orchestration.md` (the stage-agent section's routed list) and
`docs/limitations.md:177` (hand-written: "every `/pharn-loop` run skips the plan interrogation since 6.45.0"). They are
added to `## Files`. The first build attempt anchored in the main checkout at 20:47:32; at 20:50:32 that checkout was
switched to `main` from outside this session, so the build moved to its own worktree
(`~/Projects/pharn-oss-worktrees/loop-grill-triage`, branch `feat/loop-grill-triage`) and re-anchors there. The first
epoch is abandoned; every file it wrote was a declared path, copied into the worktree after the new anchor so the new
epoch judges them.

### 6. Records and artifact lists

- `loop-record-core.mjs` `BLOCKED_IDS` gains `grill-escalation` (after `not-isolated`, table order); the contract
  renders it between its markers.
- `grill-triage.json` joins `check-regress.mjs` `PIPELINE_ARTIFACTS`, `reconcile-ignore.json`
  `pipeline_artifacts.names` and `worktree-fingerprint.mjs` `INCLUDED_ARTIFACTS`; `loop-closeout.mjs`
  `STAGE_ARTIFACTS` gains `grill-findings.json` and `grill-triage.json` (the green commit now carries both).

### 7. Trusted-doc text — owed (a), for a human to commit BEFORE `/pharn-dev-build` (L68)

- `pharn/ARCHITECTURE.md:243`, the grill row's key field → "the two floor stops' results + findings vs plan (findings
  only when the plan is interrogated — not under `--quick` / `--floor-only`), each with an id in `grill-findings.json`
  (7.6.0)". After the table's `test` paragraph, a new paragraph: "**Triage** (7.7.0, a full `/pharn-loop` only):
  after the grill, `/pharn-triage` gives each grill finding one disposition — `proceed`, `replan` or `spec` — in
  `grill-triage.json`, bound to the findings file by its sha256. `pharn/floor/grill-triage.mjs` derives the verdict
  from the dispositions; the floor checks their shape, their coverage of every finding id and the binding, and each
  disposition is the model's judgment (advisory). Any verdict but `proceed` stops the run. Shape:
  `pharn-contracts/grill-triage.md`."
- `pharn/LIMITS.md:161` → "Like a full `/pharn-loop` run before 7.7.0, it does not interrogate the plan: its grill
  runs its two floor stops only, and no triage runs."
- `pharn/LIMITS.md:279` (§5) → "Under `/pharn-loop --quick` the grill runs only the observability scanner, not the
  griller's judgment, so there the plan's telemetry is not judged at all. A full `/pharn-loop` (7.7.0) runs the
  griller again, and its findings reach the run only through triage's dispositions."
- `pharn/THREAT-MODEL.md:20` → "(in `/pharn-loop --quick`, only its deterministic secret scan)".
- `pharn/THREAT-MODEL.md §5`, a sixth named channel after (5): "(6) The **triage** channel (7.7.0): a full
  `/pharn-loop` hands the grill's free-text findings to `/pharn-triage`, whose disposition decides whether the run
  proceeds. An injected finding can steer that disposition toward `proceed`. The floor holds the shape, the coverage
  of every finding id, the sha256 binding, and that a `blocking` finding is never `proceed`; a steer toward stopping
  is the safe direction, and a steer toward proceeding is the residual."

## Files

- `pharn/pharn-contracts/grill-triage.md` — new contract: the file, the dispositions, the verdict rule, the split — layer pharn-contracts
- `pharn/pharn-contracts/loop-record.md` — `grill-escalation` in the blocked-id list — layer pharn-contracts
- `pharn/floor/grill-triage-core.mjs` — new, pure: validate, skeleton, verdict — layer product floor
- `pharn/floor/grill-triage.mjs` — new CLI: `skeleton`, `check` — layer product floor
- `pharn/floor/grill-triage.test.mjs` — new tests — layer product floor (test)
- `pharn/floor/stage-agent-core.mjs` — `STAGES`, key, policy cells, invocations, header — layer product floor
- `pharn/floor/check-model-config.mjs` — `PRODUCT_STAGES` gains `triage` — layer product floor
- `pharn/floor/loop-record-core.mjs` — `BLOCKED_IDS` gains `grill-escalation` — layer product floor
- `pharn/floor/loop-closeout.mjs` — `STAGE_ARTIFACTS` gains the two JSON files — layer product floor
- `pharn/floor/check-regress.mjs` — `PIPELINE_ARTIFACTS` gains `grill-triage.json` — layer product floor
- `pharn/floor/reconcile-ignore.json` — `pipeline_artifacts.names` gains `grill-triage.json` — layer product floor
- `pharn/floor/worktree-fingerprint.mjs` — `INCLUDED_ARTIFACTS` gains `grill-triage.json` — layer product floor
- `.claude/commands/pharn-triage.md` — new product command — layer command
- `.claude/commands/pharn-loop.md` — Step 4 full column, S16, grants, `reads:` — layer command
- `.claude/commands/pharn-loop-close.md` — Step 7's `inline (policy)` route list and its interrogation sentences: the
  full column's grill is routed now — layer command
- `.claude/commands/pharn-loop-quick.md` — item 3's "in place of" sentence and the intro's interrogation line — layer
  command
- `.dev/guides/floor-orchestration.md` — the stage-agent section's routed list and the loop grill sentence — layer dev
  guide
- `docs/limitations.md` — the loop interrogation parenthetical at `:177` — layer repo docs
- `pharn/floor/stage-agent-core.test.mjs` — policy totality, the cell-by-cell policy, `renderBrief` over the new
  routed cells — layer product floor (test)
- `pharn/floor/stage-agent.test.mjs` — `brief` / `start` over every routed cell — layer product floor (test)
- `pharn/floor/check-model-config.test.mjs` — twelve product stages; `triage` through `default` (L41) — layer product
  floor (test)
- `pharn/floor/check-regress.test.mjs` — `MODEL_WRITTEN` gains `grill-triage.json` — layer product floor (test)
- `pharn/floor/loop-closeout.test.mjs` — the `STAGE_ARTIFACTS` order pin — layer product floor (test)
- `.dev/floor/stage-load-budget.test.mjs` — a `pharn-triage` row in `STAGE_LOADS` / `STAGE_LOAD_CEILINGS` — layer
  dev floor (test)
- `.dev/floor/command-hygiene.test.mjs` — loop Step 4 order and grant pins, S16, the reversed floor-only pin, the
  `pharn-triage.md` budget row and `writes:` pin — layer dev floor (test)
- `.dev/guides/floor-checks.md` — a `grill-triage.mjs` section — layer dev guide
- `CHANGELOG.md` — the 7.7.0 entry — layer repo meta
- `SKILLS_VERSION` — 7.7.0 — layer repo meta
- `README.md` — badge + regenerated CURRENT-STATE — layer repo meta
- `.dev/features/loop-grill-triage/GRILL-CHECK-MEASUREMENT.md` — Q3's measurement record, written BEFORE the build
  (the build does not write it); listed so `check-regress.mjs scope` accounts for it — layer dev record
- `pharn/floor/regular-file.mjs` — added at review (A4): the one-descriptor O_NOFOLLOW reader both grill CLIs share,
  instead of a copy in each — layer product floor
- `pharn/floor/grill-findings.mjs` — added at review (A4): reads its inputs through `regular-file.mjs` — layer product
  floor
- `pharn/floor/entry-gates.test.mjs` — added at regress: two wiring pins anchored on the removed inline-grill marker
  line; the entry-gate wait now follows the triage read and the plan's peek precedes the grill-stop reads (the probe
  changed routing only, so it could not see a pin on the loop's text — L72) — layer product floor (test)

### Not touched

- The four trusted docs (a human commits §7's text before the build), `pharn.config.json` (Q2-A),
  `.claude/commands/pharn-grill.md` (part 1's full mode already writes and checks `grill-findings.json`),
  `.claude/commands/pharn-ship*.md` (`/pharn-ship` keeps its routed grill read by a person; its triage cells are
  `skipped`), `MIN_CLI`.

## Contracts satisfied

- `pharn/pharn-contracts/grill-triage.md` (new) — the triage file, its dispositions and verdict rule, and the
  floor/advisory split (L2).
- `pharn/pharn-contracts/finding-shape.md`, "Emission — grill-findings.json" — consumed by id; not changed.
- `pharn/pharn-contracts/loop-record.md` — a blocked stop's record shape, cited; one id added.
- `pharn/pharn-contracts/stage-exit.md` — not touched; triage is a routed stage, read through its checker.

## Evals / tests to write (P1)

No capability (`role:`) is added, so no eval pair; the checker and the command are pinned by tests:

- `grill-triage.test.mjs`: shape closure (keys, repeated keys); round mismatch; sha256 mismatch (a triage of an older
  findings file); id misalignment (missing, extra, reordered, duplicated); disposition enum; reason guards
  (control characters, newline, length); Q4 (`blocking` + `proceed` → RED); verdict precedence (spec > replan >
  proceed); zero findings with `[]` → exit 0, non-empty findings with `[]` → RED (L34); L62 hostile values
  (`{"toString":1}`) in every field; symlink and directory inputs refused; `skeleton` → filled all-`proceed` → `check`
  exit 0 (round trip); a realistic CLI run over a part-1-shaped findings file with one `replan` → exit 3 and its id in
  `escalated` (L84).
- `stage-agent-core` / `stage-agent` tests: `STAGES` order; the triage key resolves through the real checker;
  `INVOCATIONS` equals the `agent` cells; `pharn-triage` routes in the loop's full column only.
- `check-model-config.test.mjs`: `triage` mapped; a config with no `triage` key resolves it through `default` (L41).
- `command-hygiene.test.mjs`: Step 4's full-column order (plan → stop reads → grill start/brief/finish → findings
  check → triage start/brief/finish → triage check → entry wait → test); every new fenced line granted, both ways;
  the S16 row present and the table's ids equal `BLOCKED_IDS`; `pharn-triage.md` `writes:` is exactly
  `grill-triage.json` (L65); `pharn-triage.md`'s budget row.
- Loop-record and closeout tests: `grill-escalation` round-trips through the record checker; the closeout stages both
  JSON files.

## Guarantee audit (P0)

- Every finding has exactly one disposition, aligned by id → floor: enum-regex (`grill-triage.mjs` index alignment).
- The triage was made over these exact findings → floor: content-hash (`findings_sha256`), recomputed by the checker.
- The verdict is the deterministic function of the dispositions → floor: enum-regex.
- A `blocking` finding is never `proceed` → floor: enum-regex (Q4). The severity itself is the grill model's
  assignment (advisory).
- A `replan` / `spec` verdict stops the run → advisory orchestration: the loop's Step 4 branches on the exit code;
  nothing forces the prose to run the line (L19). A hygiene test pins the line and its branch, never a run.
- `/pharn-triage` writes only `grill-triage.json` → floor: hook (fix #7 scope from its `writes:`), for the write
  tools; a Bash write is detected by reconcile, not prevented.
- That a disposition is right → advisory: model judgment over untrusted text (THREAT-MODEL §5 channel (6), owed text).
- That the full grill runs in a full loop → advisory orchestration (Step 4 prose + `ROUTE_POLICY` cell); the cell
  itself is a frozen table a parity test pins.

## Trust audit (P2)

- The grill's `problem` / `evidence`, `PLAN.md` and `SPEC.md` are untrusted inputs to the triage agent; its
  `disposition` is enum-gated but chosen by a model that read them, so an injected finding can steer it (residual,
  §7). Its `reason` inherits the untrusted tag: the loop quotes it in `### next_steps` as fenced DATA and never
  passes it to a stage as an instruction. The checker never reads a `reason` for meaning and never prints one.
- The verdict reaches control flow only as `grill-triage.mjs`'s exit code and its id list (regex-gated).

## Determinism audit (P5)

- Every loop branch is an exit-code membership test: findings check `{0} / other`, triage check
  `{0} / {3, 4} / other`. The terminal fallback is S9 (stop), never a guess; S16's remedy is a person.
