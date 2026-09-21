# SHIP — coverage-record

**Run:** `/pharn-dev-ship` (gated mode, no `--loop`) · **Ended at:** GATE 2 — the post-review human
decision. Every stage ran in order; none STOPped on a RED verdict.

**Worktree:** `.claude/worktrees/coverage-record` on branch `worktree-coverage-record`, entered at the
user's request before the build stage wrote any file. The approved `PLAN.md` was carried across and
verified byte-identical (same sha256) before work continued.

## Stages, in order, with the structural verdict read at each

| stage                | verdict read (FLOOR)                        | result                          |
| -------------------- | ------------------------------------------- | ------------------------------- |
| `/pharn-dev-plan`    | `check-plan-lessons.mjs` exit               | **0** → GATE 1, human approved  |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit (re-verified) | **0** → proceed                 |
| `/pharn-dev-build`   | `pharn/floor/validate.mjs` exit             | **0** (GREEN, 36 capabilities)  |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`         | **`no-regressions`** → proceed  |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`             | **`PASS`** (7/7 gates exit 0)   |
| `/pharn-dev-review`  | _none — no structural verdict by design_    | GREEN, 0 floor-gate, 5 advisory |

GATE 1 was `/pharn-dev-plan`'s own approval halt (approved as written, with `assignments.json` confirmed
over `coverage.json`). GATE 2 is now.

**Artifacts (cited, not restated — P4):** `.dev/features/coverage-record/REVIEW.md` (the five advisory
findings and the promoted lesson candidate) and `.dev/features/coverage-record/GRILL.md` (six advisory
interrogation findings, all of which the build answered).

## lesson: promoted L46

Step 2b proposed one candidate; the human accepted at 2b.3 and again at
`/pharn-dev-memory-promote`'s own accept/deny gate. `L46` read from the `## L<n>` headings in
`.dev/memory-bank/lessons-learned.md` after the promote returned — never pattern-matched out of printed
prose (**L6**). `docs/lessons-index.md` regenerated in the same step: `46 lessons · 46 tagged ·
0 malformed · 0 untagged`.

**deferred: none.** Step 2b surfaced no further candidate it did not carry.

## Three things this run caught in itself, recorded because they are the evidence

1. **The plan's exclusion block failed OPEN.** The first `set-writes-scope.cjs --from-plan` reported
   `10 path(s)` against the 9 declared — **L18** recurring inside a plan that cited **L20**. Fixed by
   making it a `### Deliberately NOT in scope` heading and re-scoping; it is the measured trigger behind
   the promoted L46.
2. **The `SKILLS_VERSION` bump had an undeclared dependent.** `check-version-badge` RED-failed because
   the README shields badge still read 6.1.0. `README.md` was **declared in `## Files` and the setter
   re-run** — never written past the guard.
3. **The reconcile gate reported an ESCAPE, and it was right to.** The epoch was anchored on the 9-path
   scope before `README.md` existed in it — **L42** exactly. Resolved with the prescribed
   `--amend-scope`, and only after confirming the path was genuinely in the live declared scope; the
   baseline was never hand-edited.

## Post-GATE-2: the three review findings were FIXED, not filed

At the gate the human chose to iterate rather than accept as-was, so all three `important` findings were
closed and every gate re-run against the final tree:

1. **I5 now checks scanner MEMBERSHIP** in `lens-scanner-map.json`, not merely "non-empty string" — the
   invariant the approved plan had declared. The map is a **required** argument, so the check cannot
   silently no-op into a weaker GREEN.
2. **The emitter records `scanner_errors[]`** instead of folding a failed scanner into a clean miss, with
   the new **I7** pinning those entries inside the target and **disjoint from the slice**.
3. **The "FLOOR at emission" audit line is narrowed** and paired with an explicit non-guarantee: nothing
   binds a record to its producer, `generated_by` is unread, and a consistently fabricated record passes.

Re-run afterwards: `validate` GREEN · `npm run check` **exit 0** (ten gates) · `check-verify` **PASS** ·
`check-bash-reconcile` **CLEAN** · suite **2110 → 2119** tests, 0 fail.

## Standing state

- `SKILLS_VERSION` **6.1.0 → 6.2.0** (minor), CHANGELOG entry written, `MIN_CLI` unchanged at `0.5.0`.
- `npm run check` **exit 0** across all ten gates; `npm test` 2118 pass / 0 fail / 1 skipped (the skip is
  environmental — this worktree has no `node_modules`, so the README-splice test self-skips; the README
  was verified directly with prettier and markdownlint instead).
- **Committed to the local branch `worktree-coverage-record` at the human's instruction** ("iterate until
  done"), which is a decision made AT the gate, not by this command. **Nothing is pushed, merged, or
  sealed** — no `PHARN ✓ reviewed` seal is applied, and pushing remains a separate outward-facing act the
  human has not asked for.

---

The chain ran; the named floor verdicts are as shown — **this is NOT a judgment that the increment is
good or wise; that is the human's call at the post-review gate.**
