# PLAN — closeout-timeout-feature-dir

- applied_lessons: [L41, L60]
- increment: two audit LOWs in one LIGHT PR — LOOP-9 (bound loop-closeout's git steps with a timeout) and ARCH-12 (move
  the committed dogfood run out of `pharn/features/`, so its README's "empty until a user runs /pharn-spec" is true)
- base: origin/main `18037dd4` (SKILLS_VERSION 6.72.0); version claimed 6.72.3 (renumbered by diff before push)
- mode: LIGHT (audit-fix batch 2026-10-23, agent D); no stage commands

## LOOP-9 — a stuck commit hook is a stuck unattended close

`pharn/floor/loop-closeout.mjs` `gitRun` spawned every git call (`switch -c`, `add`, `commit` with the project's hooks,
the undo) with no timeout, so a hook that never returns held the close until the Bash tool's 600 s kill — a crash, with
no outcome. Header line 89 stated it as a bound.

Approach: `gitRun` gains `timeout: GIT_TIMEOUT_MS` (a named export) with `killSignal: "SIGTERM"`, plus an optional
`timeoutMs` (the only seam, beside the existing `literal`). A timed-out call already returns `status: null` with the
spawn error's message, which every caller maps onto the EXISTING vocabulary: switch → `branch failed`, add →
`stage failed`, commit → `commit failed` + the undo, all exit 4. No new outcome, no new exit.

- **Why SIGTERM, not the SIGKILL stage-direct.mjs uses for its node setter — measured this run:** a `git commit` killed
  with SIGKILL during a sleeping pre-commit hook leaves `.git/index.lock` behind, and the undo's `reset` and
  `checkout -` then both fail (`Unable to create … index.lock: File exists`); killed with SIGTERM git removes its lock
  (its signal handler) and the undo exits 0 for both. The hook process itself is not killed by either signal — it is
  orphaned and runs on (stated bound).
- **The number:** `GIT_TIMEOUT_MS = 240_000`. stage-direct's `SETTER_TIMEOUT_MS` (60 s) bounds a ~0.1 s node setter;
  a commit runs the project's hooks (lint, tests), which can legitimately take minutes, so 60 s would turn a slow but
  working hook into `commit failed`. 240 s is derived from the 600 s Bash timeout the close part pins: two stuck git
  steps in a row (the commit, then the undo's `checkout -` and its post-checkout hook) end by 480 s, leaving 120 s for
  every other step. A hook slower than 240 s now reads `commit failed` (stated bound).

## ARCH-12 — a dogfood run inside the product tree

`pharn/features/loop-decision-integrity/` is this repo's own /pharn-loop run, committed under the product artifact root
whose README says the directory is empty until a user runs /pharn-spec. Live readers (grep this run, outside
`.dev/features/**` history and the CHANGELOG): `pharn/floor/check-spec.test.mjs` (spawns check-spec on its SPEC.md —
the one live dependency); `.dev/floor/check-surface-bump.test.mjs` (the path as a string, one of the "decided OUT"
examples of `pharn/features/**` — a classification of a path, needs no file: left unchanged); two dated
`.dev/measurements/*` reports (historical records: left unchanged); prose naming the run without the path (left).

Approach: copy the SPEC.md byte-for-byte to `pharn/floor/test-fixtures/check-spec/legacy-approved-SPEC.md` (the
fixture root installs exclude: surface-bump decides `pharn/floor/test-fixtures/**` OUT; lint/format ignore it) and point
the test at it; `git mv` the run to `.dev/features/loop-decision-integrity-product/` (name checked free).

## Tests

- `loop-closeout.test.mjs`: a real repo whose pre-commit hook writes a marker then sleeps 30 s; `closeLoop` with
  `git: (a, o) => gitRun(a, { ...o, timeoutMs: 1500 })` (the REAL gitRun — L41) → `not committed: commit failed`,
  exit 4, back on the original branch, the loop branch deleted, no `index.lock`, the hook's marker present and the
  call returned well under the hook's sleep (non-vacuity per asserted property — L60: the hook really ran and really
  was cut short). A unit pin that `gitRun` on a hanging fake git (a PATH-first `git` script) returns `status: null`
  within the bound, and that `GIT_TIMEOUT_MS` is the 240 000 above.
- `check-spec.test.mjs`: the legacy-SPEC case reads the fixture; GREEN line unchanged.

## Files

- `pharn/floor/loop-closeout.mjs` — gitRun timeout + SIGTERM, GIT_TIMEOUT_MS, header bound rewritten (line 89)
- `pharn/floor/loop-closeout.test.mjs` — the stuck-hook and hanging-git tests
- `pharn/floor/check-spec.test.mjs` — the legacy-SPEC test points at the fixture
- `pharn/floor/test-fixtures/check-spec/legacy-approved-SPEC.md` — byte copy of the run's SPEC.md
- `pharn/features/loop-decision-integrity/BUILD.md` — moved (git mv)
- `pharn/features/loop-decision-integrity/GRILL.md` — moved
- `pharn/features/loop-decision-integrity/LOOP.md` — moved
- `pharn/features/loop-decision-integrity/PLAN.md` — moved
- `pharn/features/loop-decision-integrity/REGRESSION.md` — moved
- `pharn/features/loop-decision-integrity/SPEC.md` — moved
- `pharn/features/loop-decision-integrity/VERIFY.md` — moved
- `pharn/features/loop-decision-integrity/regression-report.json` — moved
- `pharn/features/loop-decision-integrity/verify-report.json` — moved
- `.dev/features/loop-decision-integrity-product/BUILD.md` — moved here
- `.dev/features/loop-decision-integrity-product/GRILL.md` — moved here
- `.dev/features/loop-decision-integrity-product/LOOP.md` — moved here
- `.dev/features/loop-decision-integrity-product/PLAN.md` — moved here
- `.dev/features/loop-decision-integrity-product/REGRESSION.md` — moved here
- `.dev/features/loop-decision-integrity-product/SPEC.md` — moved here
- `.dev/features/loop-decision-integrity-product/VERIFY.md` — moved here
- `.dev/features/loop-decision-integrity-product/regression-report.json` — moved here
- `.dev/features/loop-decision-integrity-product/verify-report.json` — moved here
- `.dev/guides/floor-orchestration.md` — the closeouts section names the git bound
- `SKILLS_VERSION` — 6.72.3 (patch: a correction to shipped loop-closeout.mjs)
- `CHANGELOG.md` — the 6.72.3 section
- `README.md` — version badge (check:badge), if it carries the version
- `.dev/features/closeout-timeout-feature-dir/PLAN.md` — this plan

## Applied lessons

- L41: the timeout test drives the REAL `gitRun` against a real repository and real hook, overriding only the bound's
  length; the default `GIT_TIMEOUT_MS` path is the one every other real-git test in the file already runs through.
- L60: non-vacuity per asserted property — the hook writes a marker before sleeping (it ran) and the call's elapsed time
  is far below the hook's sleep (it was cut short), so "commit failed" cannot be satisfied by a hook that never ran.

## Bounds (P0)

- The bound is per git call, not per close: several slow calls can still sum past the Bash timeout (a crash, as before).
- The killed hook process is orphaned and keeps running; git is what is stopped.
- A git that ignores SIGTERM (none known) would still hang; SIGKILL was rejected for the lock reason above.
- Node children (closeout-core.mjs `runNode`) remain unbounded — unchanged, its own header's stated bound.
