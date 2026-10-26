# SHIP — loop-isolation-stop

A roll-up of one `/pharn-dev-ship` run on 2026-10-25, in the worktree `suspicious-swirles-f50d57`, branch
`feat/loop-isolation-stop` (base `7e71753c`, `SKILLS_VERSION` 6.75.0 → 6.76.0). Advisory: nothing reads this file.

## Where the run ended

At **GATE 2**, answered by the maintainer: **fix, then PR**. The fixes were made and both verdicts re-ran green. The
PR is not opened yet: it waits on the maintainer's human-only `LIMITS.md` / `THREAT-MODEL.md` edits
(`HUMAN-PATCH.md`), which GATE 1 sequenced after verify.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1:** four open questions and the plan approved by the maintainer through the
   interactive form (recommended answer each time). Post-grill amendments A1–A12 and a build-time A13 are the
   orchestrator's decisions, recorded as such. The A13 re-anchor was the maintainer's choice.
2. `/pharn-dev-grill` (an independent subagent) → `GRILL.md`. Step 1b `check-plan-lessons.mjs`: exit 0. Advisory: 19
   concerns, 0 blocking.
3. `/pharn-dev-build` → `validate.mjs .` exit 0 (37 capabilities). `npm run check` exit 0 before regress.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (round 1 and round 2).
5. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`** (round 1 and round 2; all seven gates exit 0,
   reconcile `CLEAN`).
6. `/pharn-dev-review` (an independent subagent) → `REVIEW.md`: blocked with 3 floor-gate findings (one overclaim in
   three places) and 6 advisory. GATE 2: fix. Findings 1–8 were fixed. Finding 9 (three copies of the witness read) is
   deferred below.

## Structural verdicts, verbatim

- build: `node pharn/floor/validate.mjs .` → exit `0`
- regress: `regression-report.json` `.verdict` → `no-regressions`
- verify: `verify-report.json` `.verdict` → `PASS`

Findings: `REVIEW.md` (cited, not restated). Interrogation: `GRILL.md`. Measurements: `PROBE.md`.

changelog-entry: exit 0

lesson: promoted L79 (promoted as L78; renumbered to L79 when main's 7.0.0, which took L78, was merged in)

deferred:

- `isolation-witness-reader` — review finding 9: the witness's location and capped O_NOFOLLOW read are implemented in
  three files (`check-loop-record.mjs`, `loop-closeout.mjs`, `render-run-report.mjs`). They agree after this run's fix
  6, but nothing ranges over the three (L31/L35). One reader in the core's sibling fs module would retire two copies.
- `loop-closeout-gpgsign` — `PROBE.md` §1: a container inheriting `commit.gpgsign=true` without a key ends a green
  run `not committed: commit failed`. Reported, not changed, as the brief asked.
- `pharn-footprint-move-merge` — the other session's PR (7.0.0, `.pharn/` → `pharn/.run/`) will conflict with this
  one on `SKILLS_VERSION`, `CHANGELOG.md` and the `/pharn-loop` commands, and must carry the new witness path.

## Orchestration notes

- **Shared worktree.** Another session ("Pharn OSS files migration") used this worktree until about 15:20. It
  cleared `.pharn/writes-scope.json` at least twice, and it deleted its own untracked
  `.dev/features/pharn-footprint-move/{PLAN,GRILL}.md` after the build had anchored them, which read as a reconcile
  ESCAPE. Asked (the maintainer approved the message), it confirmed both and supplied the bytes. They were restored by
  a byte copy whose SHA-256 matched the anchored entries, and reconcile read `CLEAN` again (`REGRESSION.md`,
  `VERIFY.md`).
- **Bash writes in scope.** Three edits to declared paths went through Bash (a Python replace on the CLI, a `sed` on
  the closeout test's body pins, and `npm run docs:generate` for the README block). All were inside the anchored
  scope, and reconcile judged them `CLEAN`.
- **Models.** Every stage ran on opus: grill and review as fresh subagents, the rest in this session.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
