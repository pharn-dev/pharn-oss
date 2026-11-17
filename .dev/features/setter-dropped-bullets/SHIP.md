# SHIP — setter-dropped-bullets (the L71 remedy)

Stages run, in order: `/pharn-dev-plan` → GATE 1 (the maintainer, in chat, via the interactive form: "Approve: refuse",
"Script route", "Scratchpad, I run it") → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-review` (an independent read-only subagent, run while regress was measuring) → build round 2 →
`/pharn-dev-verify` → GATE 2.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the increment is the remedy L20 and L71 named. The run's two frictions are process facts already
covered: a desktop worktree session's hooks judging from the main checkout (in memory), and a human patch reported as run
that had not landed (caught by comparing the file's bytes, which is what the patch handoff already does).

deferred:

- Reword the unchanged sentences that still say the write hook "drops" such an entry or call `isConcrete` the setter's
  "filter": `pharn/floor/stage-regress.mjs:663-670`, `pharn/floor/quick-scope-core.mjs:148-153`,
  `pharn/pharn-contracts/regression-report.md:593-594`, `pharn/floor/check-build-complete.mjs:41-43,155-156,185-186`,
  `pharn/floor/ac-test-infra-core.mjs:212-214`, `.dev/guides/floor-gates.md:310,593`, and test titles in
  `ac-tests-lock.test.mjs`, `check-ac-tests.test.mjs`, `ac-test-infra-core.test.mjs`, `check-quick-scope.test.mjs`,
  `check-regress.test.mjs`. Still true in effect (the hook allows none of such an entry); worded before the refusal.
- Escape C1 controls, DEL and bidirectional overrides in the setter's refusal message (a human-only patch); no consumer
  parses the message today.

- Grill (advisory): `GRILL.md` — 3 concerns: the plan-time count re-measured with the real setter (same 18 plans; L71's
  `2 of 37`), the unbounded message accepted, the CHANGELOG says what replaces `docs/capabilities/**`.
- Review (advisory): `REVIEW.md` — GREEN, 0 floor-gate findings; both important findings fixed before verify.
- Regress: `REGRESSION.md` / `regression-report.json` (base `dde008dc`, the pre-patch `origin/main`; the setter patch
  recorded as the maintainer's declared write). Verify: `VERIFY.md` / `verify-report.json`.

## Writes and the maintainer's patches

- Every in-repo write went through a scratchpad helper that ran both real write hooks with the build worktree as root
  and wrote only on exit 0 (GATE 1 "Script route"): this desktop worktree session's own hooks judge from the main
  checkout. The hook calls are discipline; reconcile is the floor over every write, and both epochs read `CLEAN`.
- The setter (control surface) changed only through three maintainer patch scripts, each verified on a copy first (one
  application, a second run refuses), each committed before a build anchor (L68), each deleted after it ran: the
  refusal (`d1793d20`), 7.20.0 → 7.21.0 (`60a2af53`), 7.21.0 → 7.22.0 (`843212ab`). The first was reported run twice
  before it landed; the file's bytes were checked each time, and it was finally run in the maintainer's Terminal tab with
  their explicit OK for that run (likewise both renumbers).

## Renumbering

`origin/main` moved twice during the run: #453 released 7.20.0 after GATE 1, and #452 released 7.21.0 during regress.
This increment ships as **7.22.0**. Each move was merged before the next build anchor; `CHANGELOG.md` keeps every merged
section byte-for-byte, with `## [7.22.0] - 2026-11-17` above `## [7.21.0]`. #452's `pharn-install.json` made a second
build round necessary (`PLAN.md`, "Build round 2"): the in-flight verify was stopped before any gate finished, round 1's
epoch was reconciled `CLEAN` first, then the scope was re-set and re-anchored. Regress ran on the pre-merge tree and was
not re-run; verify's whole-suite run on the merged tree, and CI's, are the gates over it.

## GATE 2

Regress and verify are green, so the run ends here: commit, push, and the pull request
(<https://github.com/pharn-dev/pharn-oss/pull/458>). The merge is the maintainer's decision; nobody merges it in this run.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
