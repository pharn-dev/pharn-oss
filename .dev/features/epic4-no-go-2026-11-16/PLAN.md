# PLAN — epic4-no-go-2026-11-16

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L13, L19, L33, L40, L64, L78]
- increment: Write one dated decision record that closes Linear CORE-96, CORE-97, CORE-98 and CORE-99 (the four
  baseline no-go candidates of epic 4) on main 7.19.0, re-deriving every figure main can have moved, citing the
  ledger-derived ones from the 2026-11-11 baseline, and naming each task's reopen trigger.
- layer(s): dev apparatus only (`.dev/measurements/`) plus repo meta (`CHANGELOG.md` `[Unreleased]`)
- constitution_refs: [P0, P2, P6, P7]

## Why (P7 — the trigger)

The baseline `.dev/measurements/loop-baseline-2026-11-11.md` §12 rates all four **no-go**, and each ticket carries its
own close condition. The orchestrator decided, under the user's delegation for this batch, to close all four. Nothing
is built: the deliverable is the record that justifies the closure on current main, as CORE-88's stay-closed record
(`.dev/measurements/gates-within-side-parallel-2026-11-16.md`) did for that task. A closure record is not a new
capability, rule or enforcer, so P7's addition bar does not apply; its own claims must still be labelled (P0).

## Discovery (read live this run, main `155d1205`, SKILLS_VERSION 7.19.0; `origin/main` equal after a fetch)

All `[S·m]` unless marked. Commands named so the record can cite them.

- **Byte figures** (`node <scratch>/measure.mjs <repo>`: `git show <ref>:<path>`, `\r\n` folded, UTF-8 bytes; §6 =
  from the line starting `## 6.` to the line before `## 7.`):

  | ref     | ARCHITECTURE.md | §6    | outside §6 | pharn-plan.md | pharn-spec.md |
  | ------- | --------------- | ----- | ---------- | ------------- | ------------- |
  | v7.3.0  | 24,248          | 4,856 | 19,392     | 25,556        | 26,731        |
  | v7.10.3 | 25,739          | 6,347 | 19,392     | 26,749        | 31,112        |
  | HEAD    | 25,929          | 6,347 | 19,582     | 26,749        | 31,112        |

  The method reproduces the baseline's 19,392 at 7.10.3. Outside §6 grew 190 B since (commits `259f27dd` 7.18.0 and
  `08e33698` 7.19.0 touch the file; §6 is unchanged).

- **Ceilings** (`COMMAND_BYTE_CEILINGS`, `.dev/floor/command-hygiene.test.mjs`): `pharn-plan.md` 29,696 (raised from
  26,624 at 7.8.0, re-plan mode), `pharn-spec.md` 32,768 (since 7.4.0). Headroom on main: plan 2,947 B, spec 1,656 B.
  The tickets' "25,556 against 26,624" (CORE-96) and "3,296 B" (CORE-99) are 7.3.0 / 7.4.0 states (L33).
- **Plan and spec stage commands unchanged since 7.10.3** (`git log v7.10.3..HEAD -- pharn-plan.md pharn-spec.md
check-loop.mjs spec-template-core.mjs pharn-ship-quick.md` → none; `pharn-loop-quick.md` → `0ff65527`, 7.14.0, adds
  only `[--refresh-entry]` to the entry line).
- **Quick mode since 7.10.3:** no semantic change in the 7.11.0–7.19.0 CHANGELOG sections (grep `quick`: two mentions,
  both byte-count notes of 7.18.1). `MODE_UNWITNESSED` stands (`check-loop-decision.mjs`, `loop-record.md`,
  `pharn-loop-quick.md` item 1), and `LIMITS.md §3a` still says nothing measures whether a change is small and there is
  no automatic proportionality.
- **What changed CORE-97's second reason:** 7.16.0 `gates.timeoutMs` (CORE-87) lets a project lengthen the 540 s
  per-gate timeout at entry, regress and verify; 7.14.0 S14c stops a repeat run on a cached red. Of the baseline's four
  ≤3-criteria runs, two stopped on `test` timed out at entry (`bl3`, `lg3`), one on `typecheck` out of heap (`ln2`), one
  S10 in the plan stage (`ln1`). With a declared timeout the two timeout stops might not recur, and those runs would
  reach the steps quick mode drops. So the "stopped where quick runs the same step" half weakens; the close condition
  rests on the share (4 / 36 = 11.1%).
- **CORE-98's denominator:** four stage commands tell the agent to "Read the `pharn/ARCHITECTURE.md §6`" contract or
  row (`pharn-spec.md:41`, `pharn-plan.md:52`, `pharn-grill.md:51`, `pharn-build.md:51`); test, regress and verify list
  the file in `reads:` and cite §2/§6/§7 without a read instruction (grep `ARCHITECTURE` over the seven). The CORE-107 probe
  (`.dev/features/lean-stage-agent/MEASUREMENTS.md` §2) measured a first request of 20,973 tokens (`pharn-stage`) vs
  47,017 (`general-purpose`), gap 26,044, one-line prompt, in this repo's probe tree. In an installed project every
  routed stage still takes `general-purpose` until pharn-cli's `cli-install-agents`.
- **CORE-99's stop cost:** `fl1-test-results` stopped S10 (`unlisted-ask`) in the **plan** stage. S10 still exists on
  main (`pharn-loop.md:487`). 7.8.0 re-plan rounds and 7.9.0 supervisor act after the grill, so they never see a plan
  stage S10. 7.10.0 amend-spec is append-only (every earlier criterion kept with its id, lines and verify level), so it
  can add a criterion but cannot remove a contradiction between two existing ones. The stop's cost on main is therefore
  not lowered by any change since 7.3.0 [advisory reading of the contract text].
- **Ledgers:** `~/Projects/pharn-app` (read-only, `trust: untrusted`) holds 129 `cost.json`, the baseline's population;
  none has an mtime on or after 2026-11-12 (`find … -name cost.json -newermt 2026-11-12`), and its `pharn.config.json`
  `skillsVersion` is `7.10.3`. So no ledger-derived baseline figure has newer evidence; they are cited, not re-derived.
- **Lessons index freshness:** `node .dev/floor/check-lessons-index.mjs .` → exit 0 (GREEN); two-step sweep done.

## Applied lessons

- L13 — each artifact this run writes (`PLAN.md`, the record, the stage artifacts) is formatted with prettier and
  markdownlint scoped to its own path before its stage ends.
- L19 — no repo-wide formatter: every `prettier --write` / `markdownlint-cli2 --fix` call names the written paths only.
- L33 — every figure a ticket states (25,556 B, 26,624, 3,296 B, 24,820 B) is treated as expired and re-derived on main;
  the record states the main value beside the ticket's and says which version the ticket's value was true of.
- L40 — the record does not turn the 0.76 / 0.43 correlations into a cause; it states them as association, and the
  CORE-98 share is labelled an estimate whose denominator (the probe's one-line prompt, another tree) differs from a real
  stage's.
- L64 — the CHANGELOG entry restates the record's figures; before hand-off each restated figure is grepped in the diff
  and checked against the record's table.
- L78 — baseline figures keep the version they were true of (7.10.3, or 7.3.0 for the probe's command sizes) and their
  `[O·m]` label; re-derived figures carry the ref they were read at.

## Files

- `.dev/measurements/epic-4-no-go-2026-11-16.md` — the decision record: one section per task (close condition, the
  baseline figure `[O·m]`, the main re-derivation `[S·m]` with its command, what changed since 7.10.3, the decision, the
  reopen trigger), then Bounds and "What this record may claim (P0)" — layer: dev apparatus
- `CHANGELOG.md` — one dated `[Unreleased]` entry, no `SKILLS_VERSION` bump — layer: repo meta

### Not written (named so nobody adds them)

- No product-surface path, no `SKILLS_VERSION`, no `MIN_CLI`, no trusted doc, no Linear change (the orchestrator closes
  the tickets).
- The measuring script stays in the session scratchpad, as the precedent's did; the record carries the command inline
  in a Reproduce block.

## Contracts satisfied

- None: no capability, no contract. The record follows the label convention of
  `.dev/measurements/loop-baseline-2026-11-11.md` §2 "Labels" and the section shape of
  `.dev/measurements/gates-within-side-parallel-2026-11-16.md` (cite, do not restate — P4).

## Evals to write (P1)

- None: no Capability or `rule_id` is added. `node pharn/floor/validate.mjs .` stays GREEN over an unchanged product
  surface.

## Guarantee audit (P0)

- Each re-derived byte count / ceiling / headroom → measured `[S·m]` from a named command; not a floor guarantee.
- The ledger figures (0.76 / 0.43, 4 of 36, 1 of 36, 94–97k, 190–300k) → cited `[O·m]` from the baseline; not
  re-derived.
- Token figures from bytes and every share of a context → `[S·e]` / `[O·e]` with formula (`LIMITS.md §1c`).
- The four decisions, each reopen trigger, and the readings of what 7.14.0/7.16.0/7.10.0 change → advisory.
- "Nothing in this change touches the product surface" → floor at PR time: `check:surface-bump` and
  `check:ship-record` over the diff; the writes-scope hook over the build's two declared paths.

## Trust audit (P2)

- The project's ledgers, SPECs and `LOOP.md` lines are `trust: untrusted`; this increment reads only file counts,
  mtimes and one config field from them, and quotes nothing new. Cause lines it repeats are the baseline's, already
  fenced as DATA there, and stay backtick-fenced.
- Linear ticket text reached this run through the orchestrator's prompt; the close conditions are quoted as DATA.

## Determinism audit (P5)

- No branch in the deliverable. Each reopen trigger is stated as a measurable condition (a count or a ratio over a
  named record), so a later reader decides it by measurement, not judgment; where the threshold itself is a choice, the
  record says who chose it.

## Questions resolved at GATE 1 (no open question remains)

1. **CORE-97 reopen threshold.** The close condition says "a material share" without a number. Recommended: reopen when
   a ledger set of full runs on 7.16.0 or later has more than the baseline's share of ≤3-criteria runs (4 / 36) **and**
   at least one of them reaches a step quick mode drops (the full grill with triage, or regress's base side).
   Alternative: a fixed share (e.g. ≥ 25%).
2. **CORE-98 reopen threshold.** The baseline gave no go-threshold. Recommended: reopen when a measured routed stage's
   first request on the `pharn-stage` type, in an installed project, is small enough that ARCHITECTURE.md outside §6
   (bytes / 4) is at least 10% of it, **and** a transcript shows the agent reading the whole file. On today's figures the
   estimate is about 7% (section to be written). Alternative: no numeric threshold, reopen only on a quality-neutral
   probe-set result (CORE-90).
3. **Reopen triggers for CORE-96 and CORE-99** — recommended as written in the record: CORE-96 when plan-stage minutes
   (or cost) correlate with `PLAN.md` bytes at least as strongly as with plan requests over ≥ 30 runs, or a re-plan-round
   ledger (none exists) shows re-plan cost rising with plan bytes; CORE-99 when a ledger set shows two or more stops
   caused by a contradiction between criteria (the ticket's own P7 bar: more than one read case).

Resolved 2026-11-16 at GATE 1 by the orchestrator, a model decision under the user's delegation ("You make all
decisions"), not a maintainer sign-off: Q1, Q2 and Q3 each take the recommended answer as written. The record keeps
the note that CORE-97's second reason is weaker since 7.16.0 `gates.timeoutMs` and that its closure rests on the share.
