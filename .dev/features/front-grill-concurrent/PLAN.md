# PLAN — front-grill-concurrent: the grill's two floor checks run before the grill agent

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4 # fix #4 — sha256(pharn/ARCHITECTURE.md), pinned 2026-10-05
- applied_lessons: [L19, L29, L38]
- increment: In `/pharn-loop` Step 4, run `/pharn-grill`'s two floor checkers (`check-plan-spec-agree`, `check-plan-lessons`) as pinned lines BEFORE the grill stage is routed, so a RED plan stops at S9 without paying a grill agent; record grill ‖ test concurrency as infeasible in this batch, with its blockers.
- layer(s): product `.claude/` surface (`pharn-loop.md`, a `pharn-*` command) + `.dev/floor` (command-hygiene test — apparatus) # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P3, P5, P6, P7]

## Applied lessons

- L38 — the single `.pharn/writes-scope.json` per tree is the first named reason grill ‖ test is NOT built: two concurrent stage agents in one tree contend for it (grill's Step 0 setter and its `--clear` would replace or release the test stage's scope mid-run), so the design that would need it is recorded as infeasible rather than patched by discipline.
- L19 — the only way to promote a grill draft from `.pharn/` to `pharn/features/<name>/GRILL.md` after the test stage would be a Bash write outside fix #7; this plan builds no such write, and says so in the infeasibility record.
- L29 — the loop becomes a seventh read site of `check-plan-lessons.mjs`, so it is added to the ONE enumeration that ranges over those sites (`PLAN_LESSONS_WIRING`), not given a one-off assertion; the set's length pin moves 6 → 7 in the same edit.

## The P7 trigger (cited evidence)

`.dev/measurements/loop-wall-clock-2026-10-05.md` §2 "By stage": in the 92-minute `billing-plan-catalog` run the grill
stage took **361.0 s** (`agent:opus`, 41 requests, a ~302k-token first-request cache write) and the test stage
**538.3 s**, strictly one after the other. Today `pharn-loop.md` Step 4 reads grill's two floor verdicts only AFTER the
grill agent returns (it cites `/pharn-ship` Step 2's reads), so a plan whose chain or lessons declaration is RED still
spawns a full grill agent first — the agent's own Step 2/2b then refuses and writes a RED `GRILL.md`, and only then
does the loop stop at S9.

## Design

### Built: checkers first (item direction 1)

In `pharn-loop.md` Step 4, between `/pharn-plan`'s return marker and `/pharn-grill`'s route line, one pinned fenced
block with the two checkers (the same argv `/pharn-ship` pins and `/pharn-grill` Steps 2/2b run):

```bash
node pharn/floor/check-plan-spec-agree.mjs pharn/features/<name>/PLAN.md pharn/features/<name>/SPEC.md
node pharn/floor/check-plan-lessons.mjs pharn/features/<name>/PLAN.md memory-bank/lessons-learned.md
```

- Branch only on the two exit codes (P5): both `0` → route the grill. Either non-zero → **S9** (`blocked:
stage-refused`, already the row for "a RED spec→plan chain, a RED lessons declaration"), quoting the RED line; no
  grill agent is spawned and no `GRILL.md` is written (the record's `### next_steps` names the remedy: re-plan).
- The post-grill read of the same two exits is replaced by this earlier read: the grill's writes-scope is
  `GRILL.md` alone (fix #7 hook), so a Write-tool edit by the grill cannot change PLAN.md or SPEC.md, and
  `check-loop-fresh.mjs` check I (`--front`) re-runs both checkers after every build and at the commit gate. A
  Bash write by the grill agent to PLAN.md is the L19 residual it always was; check I is what catches it, as today.
  Net request count on the green path: unchanged (the same two reads, earlier).
- A `--quick` run skips the block: its grill IS these two checks, inline (`## Quick mode` item 3). One
  parenthetical, the existing `_(a --quick run: …)_` pattern; the quick part file is not touched.

### Not built: grill ‖ test concurrency (item direction 2) — infeasible in this batch, with reasons

The proposed shape (a grill agent that writes only a draft under `.pharn/`, promoted to `GRILL.md` by a pinned line
after the test stage returns, markers naming their stage) meets six blockers, three of them beyond the three the item
named:

1. **One writes-scope per tree (L38).** `/pharn-grill` Step 0 sets the scope and its Final step `--clear`s it. Run
   beside `/pharn-test`, either call replaces or releases the test stage's scope while it writes its tests (a release
   drops the loop to the fail-closed default, so the test files are denied — loud, but the run is lost). Avoiding it
   needs a new `/pharn-grill` mode that sets no scope — and then the grill's writes are judged under the TEST stage's
   scope, which permits the test files: the shipped claim "Floor: it writes only `pharn/features/<name>/GRILL.md` —
   the fix #7 hook" (`pharn-grill.md` `## What you may claim`) would no longer hold for that mode.
2. **One stage-result file per run (newly found).** `stage-agent.mjs report` writes `.pharn/<command>/<name>/
stage-result.json` (`RESULT_FILE`, one per command+name); two concurrent agents overwrite each other's result, and
   `read --stage pharn-grill` would refuse the test's result (S9). Fixing it is a floor change to `stage-agent.mjs`,
   which `orchestrator-direct-stage-calls` is rewriting in this batch.
3. **Promotion is a Bash write (L19).** Copying the draft to `GRILL.md` after the test stage is a write outside
   fix #7; `GRILL.md` is reconcile-exempt (`pipeline_artifacts`), so nothing would detect a wrong promotion either. It
   would need a tested promotion script, not a `cp`.
4. **Markers and the ledger.** `stage-executions-core.mjs` ends a stage-start row only at the NEXT marker when that is
   the orchestrator return; a grill start followed by a test start leaves grill's row unmeasured, and the marker-window
   stage view bills every grill request after the test marker to `pharn-test`. Correct attribution needs per-context
   stage membership (the 6.29.0 context machinery could carry it) — a ledger-semantics change.
5. **Inline fallback serializes anyway.** On route exit `3` either stage runs inline in the orchestrator, so the
   concurrent path exists only when both route to agents; the command would carry two orderings.
6. **Fingerprint (the item's blocker b) is NOT a blocker** for a `.pharn/` draft — `.pharn/` is fingerprint-excluded,
   and `ac-tests-lock.mjs` binds no fingerprint — but any tracked write the grill agent made during the red run would
   refuse the run (fail-closed, a whole front lost).

Saving if built: `min(361.0, 538.3) = 361.0 s` of overlap, minus one orchestrator request for the promotion (~8 s,
the measured mean gap) ≈ **5.9 min** of the 92 [R·e]. Recorded as follow-up `front-grill-concurrent-agents` in the
CHANGELOG entry and SHIP.md, with the four changes it needs (per-stage result files, a scope-less grill draft mode with
its weaker claim stated, a tested promotion script, per-context stage attribution).

### Not built, offered as a policy option (item direction 3)

Routing the loop's full-mode grill `floor-only` (as `--quick` and `/pharn-ship --quick` already do) would drop the
interrogation agent: 361.0 s − ~3 inline orchestrator requests × ~8 s ≈ **5.6 min** [R·e], and ~302k cache-write +
~425k cache-read tokens. It is the maintainer's decision (the interrogation is advisory and gates nothing in the loop,
but it is the loop's only plan critique); nothing here changes it.

### Saving of what is built

- **Green plan (the 92-minute run): 0 s.** The two reads move; none is added or removed.
- **RED plan:** the whole grill agent is skipped. Its refusal path is a fresh agent (one ~302k-token cache write) plus
  its Step 0–2b requests; at the run's measured 5.2 s median / 8.7 s mean gap (grill agent, §3) and ~6–10 requests,
  ≈ **1–1.5 min** and ~0.3M cache-write tokens per RED front [R·e]. No RED-plan run is in the evidence, so this is an
  estimate of a path, not a measured saving.

## Files

- `.claude/commands/pharn-loop.md` — Step 4: the pinned two-checker block before the grill's route line, its S9
  branch, the `--quick` skip, and the post-grill read sentence replaced — layer product `.claude/` (`pharn-*` command)
- `.dev/floor/command-hygiene.test.mjs` — `pharn-loop.md` joins `PLAN_LESSONS_WIRING` (length 6 → 7); a ✧ ORDER test:
  in `pharn-loop.md` both checker lines sit after `/pharn-plan`'s return marker and before `/pharn-grill`'s route
  line, with a discrimination control — layer `.dev/floor` (apparatus)
- `CLAUDE.md` — the "All six call sites … `PLAN_LESSONS_WIRING`" sentence becomes seven, naming the loop — layer repo
  meta (not a trusted doc)
- `SKILLS_VERSION` — provisional 6.45.0 (orchestrator assigns the final number at stacking) — layer repo meta
- `README.md` — the shields badge only — layer repo meta
- `CHANGELOG.md` — a new `## [6.45.0]` section, moving any `[Unreleased]` entry into it — layer repo meta
- `.dev/features/front-grill-concurrent/PLAN.md` — this plan — layer `.dev/features`
- `.dev/features/front-grill-concurrent/GRILL.md` — grill log — layer `.dev/features`
- `.dev/features/front-grill-concurrent/BUILD.md` — build log — layer `.dev/features`
- `.dev/features/front-grill-concurrent/REGRESSION.md` — `.dev/features/front-grill-concurrent/regression-report.json`
  — regress artifacts — layer `.dev/features`
- `.dev/features/front-grill-concurrent/VERIFY.md` — `.dev/features/front-grill-concurrent/verify-report.json` — verify
  artifacts — layer `.dev/features`
- `.dev/features/front-grill-concurrent/REVIEW.md` — review — layer `.dev/features`
- `.dev/features/front-grill-concurrent/SHIP.md` — ship record — layer `.dev/features`

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — unchanged; the S9 stop it already defines carries the RED (cited, P4).
- `/pharn-grill`'s two floor stops and their argv — reused verbatim, not re-implemented (P3/P4).

## Evals to write (P1)

- No capability is added or changed (no `role:` file), so no eval fixture. The command change is pinned by the
  command-hygiene tests above (presence, canon path, cross-surface, order, discrimination).

## Guarantee audit (P0)

- "A RED chain or lessons declaration stops the loop before a grill agent is spawned" → **advisory** (command prose;
  the orchestrating model runs the lines). The two VERDICTS are floor (enum/regex + content-hash checkers, unchanged).
- "`pharn-loop.md` invokes both checkers against the product canon, before the grill route line" → floor
  (enum/regex over the command text, `command-hygiene.test.mjs`) — presence and order only, never that a run executed
  them.
- "Dropping the post-grill re-read loses nothing" → **advisory** reasoning, bounded: the grill's Write-tool writes are
  hook-scoped to `GRILL.md` (floor), its Bash writes are not (L19), and `check-loop-fresh.mjs` check I re-reads both
  checkers after every build (floor verdict; its execution is a pinned line).
- No new "guarantee" word is introduced in shipped text.

## Trust audit (P2)

- The checkers' RED lines quote PLAN.md content (untrusted, model-authored) into the record's `### next_steps`
  exactly as an S9 quote does today — as DATA, never as an instruction. No new input is ingested.

## Determinism audit (P5)

- The new branch is two exit codes, `0` vs non-zero → a fixed row (S9). No classification.

## Trusted-doc / hook / MIN_CLI impact

- None. The spine order in `pharn/ARCHITECTURE.md §6` (`spec → plan → grill → test → build …`) is unchanged — the
  grill still runs before the test stage. No hook, settings or `MIN_CLI` change.

## Stay-in-lane note

`orchestrator-direct-stage-calls` and `loop-entry-preflight` edit `pharn-loop.md` now. This diff adds one fenced block
and rewrites two sentences inside Step 4, between the plan's return marker and the grill's route line, and touches no
route/marker/read line, so a merge with theirs is a local text merge.

## Open questions (HALT)

- None blocking. For the orchestrator: (a) the version (minor 6.45.0 as provisioned, though "move an existing read
  earlier" is arguably a patch); (b) whether to mirror the same reorder in `/pharn-ship` Step 2 (out of this item's
  lane; same saving per RED plan).
