# SHIP — claude-dir-scan-exclusion

**Branch:** `feat/claude-dir-scan-exclusion`, in a worktree at `../pharn-oss-wt-claude-dir-scan`.
**Ended at:** GATE 2 (the full chain ran; no stage RED-stopped it).

## Stages, in order

`/pharn-dev-plan` → **[human GATE 1]** → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → **[human GATE 2]** → `/pharn-dev-memory-promote`.

The plan was written **twice**. The first draft anchored its P7 trigger on a live nested worktree; that
worktree was removed by its own session between planning and grilling, and every number the plan quoted
inverted (`validate` 72→36, `docs:check` RED→0, `npm test` 3055/2-fail→1886/0-fail). `/pharn-dev-grill`
raised 3 blocking-severity findings on it, the human chose **re-plan with corrected evidence**, and draft 2
re-anchored on a reproducible fixture measured at the real path. A second grill pass on draft 2 raised one
more blocking-severity finding (an axis-B guarantee labeled FLOOR while conceding no checker reads it),
which was corrected in place before build.

**The run also moved checkouts mid-chain.** A concurrent `/pharn-dev-*` chain (feature `readme-audit-repairs`)
held the main checkout's single mutable `.pharn/writes-scope.json` and was writing `README.md`, which this
increment also writes. The grill's artifact write was **denied by the floor** as a result. Rather than
overwrite that session's scope, the work moved to this worktree at the human's direction — where `.pharn/`
is a separate file and the two chains cannot collide. The main checkout was never disturbed.

## Structural verdicts read (verbatim — the proceed/stop inputs)

| stage                | verdict source                      | value                                       |
| -------------------- | ----------------------------------- | ------------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit       | **0** (GREEN)                               |
| `/pharn-dev-build`   | `validate.mjs` exit                 | **0** (GREEN — 36 capabilities)             |
| `/pharn-dev-regress` | `regression-report.json` `.verdict` | **`no-regressions`**                        |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`     | **`PASS`** (6/6 gates, `failing_gates: []`) |

Each was read as a proceed input; none was re-decided. `/pharn-dev-review` has no structural verdict and
none was invented for it.

**Post-GATE-2 state, re-measured after the R1 fix and the L39 promotion:** `npm run check` exit **0** (all
eight gates), `npm test` **1893 passing / 0 failing**, `validate` GREEN at 36.

## Artifacts

- Interrogation: [`GRILL.md`](./GRILL.md) — draft 2, 4 concerns (1 blocking-severity, 2 important, 1 minor); all advisory.
- Regression: [`REGRESSION.md`](./REGRESSION.md) + [`regression-report.json`](./regression-report.json).
- Verification: [`VERIFY.md`](./VERIFY.md) + [`verify-report.json`](./verify-report.json).
- Review: [`REVIEW.md`](./REVIEW.md) — 0 floor-gate findings, 4 advisory. Cited, not restated (P4).
- Human-apply patch: [`proposed/APPLY.md`](./proposed/APPLY.md) — **NOT APPLIED**.

## Human decisions taken during this run

- **GATE 1:** widen to all four defects · fold in the `npm test` glob · leave the worktree in place
  (overtaken by events — it removed itself) · approve.
- **GATE 2:** **fix the two important review findings first**, then promote the lesson.
  - **R1 — fixed.** The comment justifying the widening claimed "widening loses nothing" in
    `pharn/floor/validate.mjs` (product-surface bytes that ship to users) and in `CHANGELOG.md`. Measured
    on a fixture user-repo, it is false there: a capability authored under `.claude/my-caps/` was counted
    before (2) and is not after (1), with `validate` exiting **0** both times. Both sites now state the cost
    and bound the claim to PHARN's own tree, and the cost is **pinned by a new test** so a future change
    that intends to start counting them fails rather than drifts. `npm test` 1892 → **1893**.
  - **R2 — not fixed here, deliberately.** The remedy belongs to `check-regress.mjs` (an exemption for paths
    a plan declares as generated), not to the increment that tripped it. Promoted to canon as **L39** so it
    is not carried only in this feature's REVIEW.

lesson: promoted L39

`L39 — One declaration section read by two consumers asking different questions is right for one and
silently wrong for the other` (`type: scoping`). Floor gates before the write: title shape GREEN;
`check-provenance.mjs` GREEN (valid provenance, unique id in the declared target, enum-member `type`, 5
well-shaped concepts); content-hash unchanged since discovery; `check-provenance.mjs` re-run GREEN
immediately before the append. Written under a promote-origin writes-scope, then `docs/lessons-index.md`
regenerated with the narrow generator (L22) — `docs:check` exit 0.

**Promoted as `L38`, renumbered to `L39` when `main` was merged before the PR.** PR #206 landed its own
`L38` first, so the id collided. `check-provenance.mjs`'s duplicate-id check was correct and is not at
fault: it ranges over the canon file it is given, and at promotion time this branch's canon genuinely had
no `L38`. The collision is a **cross-branch** one, which no single-file uniqueness check can see — worth
recording because the reflex is to blame the gate. Resolved by taking `main`'s canon wholesale and
re-appending this entry as `L39` under a promote-origin scope, then regenerating the index from canon
rather than hand-resolving the derived file's conflict. Index now **39 lessons**.

**The collision is an instance of `main`'s own new `L38`** — _"Concurrent agent sessions contend for the
single writes-scope record, and the scope check then reports a false cause"_ — promoted by the other
session from **the other side of the same contention** that denied this run's grill write. Both sessions
independently promoted a lesson about the same event, each seeing a different face of it.

deferred:

- `check-regress.mjs` exemption for plan-declared generated paths (the R2 / L39 remedy) — reopens on the
  second occurrence per L20.
- `expired-claim-check` — a floor checker over the "not yet / no X yet" claim class on the shipped surface.
  Axis C is the first occurrence to reach a generated artifact.
- `test-glob-check` — a checker pinning the `test` script's globs against a nested-checkout fixture.
- `provenance-block-count-check` — "exactly one `**Provenance.**` block per canon entry"; nothing asserts it,
  which is how the `L10`/`L11` displacement survived.
- Nested checkouts **outside** `.claude/` — a clone at `tmp/` still doubles every count. No observed failure.
- ~~The concurrent-session hazard~~ — **no longer deferred: it is canon.** `.pharn/writes-scope.json` is one
  mutable file per checkout with no session isolation, so two chains in one checkout race. This run worked
  around it with a worktree and listed it as a design question for a human; the other session promoted it as
  **L38** while this branch was in flight. The remedy remains unbuilt, but the shape is now recorded.
- The audit's four non-defect observations (catalog renders 7 of ~14 frontmatter fields; no page shows the
  floor/advisory split though the taglines encode it; zero-count roles dropped from the index; the `—`
  absent-marker has no legend) — enhancements with no observed failure (P7).

## What is NOT done

**Axis E is unapplied, and every gate above is green with it outstanding.** `proposed/APPLY.md` ships a
canon repair the floor refused to let the build perform: canon `L10` carries no `**Provenance.**` block and
`L11` carries two, the second being L10's own (feature `product-pipeline-probe`, promoted `2026-06-30`,
placed there by `0888102`). Probed rather than assumed — a build-origin writes-scope makes an `Edit` to canon
exit **2** at both hooks, while a promote-origin scope exits 0. Until a human applies that patch, `L10` still
has no provenance and `docs/lessons-index.md` still renders `-` in its `promoted` column.

**Nothing is merged, committed, pushed, or sealed.** **60 paths** are modified or new on this branch and
remain uncommitted — 50 modified (the 5 walkers, 2 tests, 2 index cores, `package.json`, `SKILLS_VERSION`,
`README.md`, `CHANGELOG.md`, canon, and 38 regenerated files under `docs/`) plus 10 new (this feature's 9
pipeline artifacts and `.dev/floor/walker-exclusion.test.mjs`). Counted rather than estimated:
`git status --porcelain` prints 52 lines because it collapses the untracked feature directory.

---

The chain ran; the named floor verdicts are as shown — this is **NOT** a judgment that the increment is good
or wise; that is the human's call at the post-review gate.
