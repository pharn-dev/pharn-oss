---
decision: STOP_GREEN
iterations: 1
cap: 3
commit: a2d73ebe104bd4fd0a46531fb46784a671145434
date: 2026-09-21
---

# LOOP — loop-decision-integrity

Ran the full product pipeline unattended, in an isolated git worktree, to fix a gap `/pharn-loop` itself
had just exposed in a prior dogfood run: a `LOOP.md`'s recorded `decision` was never re-derived from the
reports it cites, so a run that skipped `/pharn-grill` / `/pharn-regress` / `/pharn-verify` could still
produce a record that read as a genuine floor-grade stop.

## Outcome

- commit: committed pharn-loop-loop-decision-integrity
- spec: approved by the model
- blocked: none

> **Read the two lines above with the stage note below.** The command's own Step 6c **failed**
> (`not committed: branch failed`) and Step 6d ran in full: the SPEC was reverted to `Draft`. A human then
> directed a commit anyway, so the work was committed **by hand, outside the command's flow**, to a
> **collision-free branch name** (`pharn-loop-loop-decision-integrity`, no `/`) that sidesteps the blocked
> `pharn-loop/` namespace without touching the pre-existing `pharn-loop` branch; the SPEC approval was then
> restored, because Step 6d's stated reason for reverting it — "no commit happened, so there is no review
> point to hold the model's approval" — stopped being true once a PR existed. The branch name is therefore
> **not** one this command's Step 6c could have produced, and the commit was **not** made by Step 6c.

## Stages

- `/pharn-spec --model-approve`: Draft → Approved, `spec_content_hash` pinned. `check-spec.mjs` GREEN.
- `/pharn-plan`: chain GREEN, `applied_lessons: none` (no product-surface `memory-bank/` in this repo).
  Two in-flight `## Files` corrections during build (a dev-canon literal citation; the README badge +
  generated `## Current state` block) — each closed via the designed re-scope-to-PLAN.md procedure, never
  an unscoped write. See `PLAN.md` and `BUILD.md`.
- `/pharn-grill`: chain GREEN, lessons GREEN. Interrogation raised 2 minor advisory findings (a missed
  `description:` frontmatter update, a missing dedicated Trust-paragraph itemization) — both folded into
  the build; neither gated. See `GRILL.md`.
- `/pharn-build` (iteration 1): chain GREEN, fix #7 scope held throughout (12 paths, after the two
  corrections above). `node pharn/floor/validate.mjs .` → GREEN (36 capabilities). `npm test` → 2089/2089.
  `npm run check` → exit 0 (format, lint, lint:md, docs:check, check:markers, check:badge,
  check:changelog, check:contributing, check:reconcile, test all green). See `BUILD.md`.
- `/pharn-regress --base a2d73ebe104bd4fd0a46531fb46784a671145434`: chain GREEN. 15 files inside, 0
  escaped. `lint`/`format:check`/`lint:md` config-touch-skipped (no shared style config touched). `test`
  over 74 outside files: base 0/head 0, both 1854/1854 passing. Verdict: `no-regressions`. See
  `REGRESSION.md`, `regression-report.json`.
- `/pharn-verify`: chain GREEN (4th enforcing consumer). Gates at HEAD: `test` 0, `lint` 0,
  `format:check` 0, `lint:md` 0, `reconcile` 0 (`CLEAN` — the exact gate the motivating incident left
  unrun). Completeness: `complete: true`, 12/12 declared paths exist. Verifiers: 0 registered. Verdict:
  `PASS`. See `VERIFY.md`, `verify-report.json`.
- `check-loop.mjs --iter 1 --cap 3`: `verify PASS` ∧ `regress no-regressions` → `STOP_GREEN`.
- **Step 6c commit FAILED** (`not committed: branch failed`): `git switch -c pharn-loop/loop-decision-integrity`
  refused with `fatal: 'refs/heads/pharn-loop' exists; cannot create 'refs/heads/pharn-loop/loop-decision-integrity'`
  — a flat branch literally named `pharn-loop` already exists in this repository (unrelated commit:
  `1140ae8 build-format-step: add /pharn-dev-build Step 2b + promote L12`), which blocks the entire
  `pharn-loop/` ref namespace this command's branch-naming scheme needs. Nothing was staged before the
  failure. Per Step 6d: the model's SPEC approval was reverted to Draft (see `SPEC.md`); this working
  tree still holds every file this run wrote/edited, uncommitted.

## Standing reds

None — the loop stopped at iteration 1 with no measurable red at any stage.

## Handoff

### investigated

Ruled out folding the re-derivation logic into `check-loop-record.mjs` itself (would have changed that
checker's input signature from "one LOOP.md" to "a LOOP.md plus its sibling reports," blurring the
established shape-only vs cross-file-agreement split this repo already uses for
`render-ship-briefing.mjs` / `check-ship-briefing.mjs`); a separate `check-loop-decision.mjs` was chosen
instead, following that exact precedent. Also ruled out making `cap` mandatory in the envelope — that
would have RED every pre-existing `LOOP.md` in any install's history for a field that did not exist when
they were written; it stays optional, additive.

### learned

The single biggest cost in this run was NOT writing the new checker — it was the chain of small,
genuine gaps `/pharn-build`'s own floor gates (`validate.mjs`, `npm run check`) surfaced that the plan
had not anticipated: a literal dev-canon path citation inside the PLAN's own prose (caught by this
repo's own hygiene suite), a missing trust-split sentence in a `GRILL.md` finding template (caught by
`validate.mjs` CHECK 5), and a stale README badge + generated capability-catalog block once
`SKILLS_VERSION` moved (caught by `check:badge` / `docs:check`). Each required stepping back to the
originating stage's own writes-scope (never widening the build's scope to cover it) — the designed
remedy, and it composed cleanly every time.

### next_steps

The floor-grade result is `STOP_GREEN` (verify PASS ∧ regress no-regressions); the commit failed on a
branch-name collision unrelated to this feature's content and was then made by hand to
`pharn-loop-loop-decision-integrity` (see `## Outcome`). **The stray `pharn-loop` branch is still there**
and will block Step 6c on every future `/pharn-loop` run in this repo until someone deletes or renames it
— that is the one thing still outstanding, and it is repo hygiene, not this feature's work. Worth
considering separately: this command's branch-naming scheme has no fallback for a flat branch occupying
its namespace, which is a real gap in Step 6c's enumeration. Separately, a human should review the two
minor `GRILL.md` findings (folded into the build rather than separately tracked) and the honestly-named
residual this fix does NOT close: a self-consistent forged `LOOP.md` + report pair still passes
`check-loop-decision.mjs`. Closing that would need authenticating report provenance, out of this
increment's scope.
