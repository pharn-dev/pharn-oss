# BUILD — stage-git-maxbuffer

- plan: `.dev/features/stage-git-maxbuffer/PLAN.md` (GATE 1 decided by the orchestrating model under the maintainer's
  delegation; GRILL G4 folded). Spec hash re-checked at build Step 1: `d831d30d…f4f4`, unchanged. No open questions.
- scope (Step 0): `set-writes-scope.cjs --from-plan` → **15 paths**, equal to the plan's 15 `## Files` bullets; the
  reconcile epoch was anchored after it (`2452 path(s), scope 15`).
- floor (Step 3): `node pharn/floor/validate.mjs .` → **GREEN, exit 0** (36 capabilities).
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).

## What landed

- `pharn/floor/stage-runtime.mjs` — `gitSync` passes `maxBuffer: GIT_MAX_BUFFER` (`1 << 28`, module-private per GRILL
  G4) on every call, and its failure result carries `detail`, built by the new export `gitFailureDetail(e)`: git's
  stderr trimmed, then node's `code` (ENOBUFS explained), else `git exited <n>`, else `git was killed by <signal>`;
  total, with a fixed fallback. The "git helpers" comment says why the ceiling exists and what happens past it; the
  module header names the one piece of detail text the runtime now supplies.
- `pharn/floor/stage-regress.mjs` — the eight `git-failed` details quote `.detail` (the `rev-parse HEAD` one only when
  git itself failed, not when it printed a non-SHA). The comment above `assertRepresentable` extends
  `regress-inside-echo-list` with the argv-size limit (GATE 1 Q3). Two header sentences that said the stage's detail
  strings were unchanged "byte for byte" were made historical (6.26.0's extraction, 6.28.0's move), because this
  increment changes the `git-failed` ones — L64's restatement drift, caught while building.
- `pharn/floor/stage-verify.mjs` — `phasePairs`' `git-failed` detail quotes `dataText(ls.detail)`.
- `pharn/floor/scope-inputs.mjs` — `changedPaths` fails with `{ok, which, detail}`; the header says so, and its
  "keeps every detail string" sentence is made historical for the same reason as regress's.
- `pharn/floor/quick-scope-core.mjs` — the `git-failed` reason quotes `changed.detail`.
- `pharn/floor/render-review-assignments.mjs` — `gitDiffTarget`'s diff gains `maxBuffer: 1 << 28`, with a comment
  above the call (so the closure's call-text reader never meets it) saying why and what still reads as an empty diff.
- Tests: `stage-runtime.test.mjs` (the crossing test, `gitFailureDetail` live and total, ★ GIT CEILING and ★ GIT-FAILED
  DETAIL with their controls, `gitFailureDetail` in ★ ONE OWNER), `stage-verify.test.mjs`, `stage-regress.test.mjs`
  (with `repo()`'s new `committed` option), `check-quick-scope.test.mjs` (with `runCommitted`'s optional spawn
  options), `render-review-assignments.test.mjs`.
- `CHANGELOG.md` `[6.28.3]`, `SKILLS_VERSION` 6.28.3, the README badge.

## Negative controls, run once each (L60)

Each edit was applied to a COPY of `pharn/floor/` (with `.claude/hooks` and `.claude/commands`) under the OS temp
dir — never this repository — and the named test run over it (`.pharn/pharn-dev-build/mutants.mjs`, deleted after):

| mutant                                                    | test run                                                 | result |
| --------------------------------------------------------- | -------------------------------------------------------- | ------ |
| M1 — `gitSync` without `, maxBuffer: GIT_MAX_BUFFER`      | `stage-runtime.test.mjs` "★ gitSync — a `-z` listing"    | red    |
| M1                                                        | `stage-runtime.test.mjs` "★ GIT CEILING — every …"       | red    |
| M1                                                        | `stage-verify.test.mjs` "★ LISTING"                      | red    |
| M1                                                        | `stage-regress.test.mjs` "★ LISTING"                     | red    |
| M1                                                        | `check-quick-scope.test.mjs` "★ LISTING"                 | red    |
| M2 — `gitFailureDetail` with its `catch` removed          | `stage-runtime.test.mjs` "… is TOTAL (L62)"              | red    |
| M3 — `detail` is raw stderr again                         | `stage-runtime.test.mjs` "gitFailureDetail — a spawn …"  | red    |
| M4 — the review emitter's diff without its ceiling        | `render-review-assignments.test.mjs` "★ LISTING"         | red    |
| M4                                                        | `stage-runtime.test.mjs` "★ GIT CEILING — every …"       | red    |
| M5 — regress's `git status` detail quotes `.stderr` again | `stage-runtime.test.mjs` "★ GIT-FAILED DETAIL — every …" | red    |

Inside the suite, besides: each stage-level ★ LISTING test runs its own mutant (only the ceiling removed) and asserts
the old stop, now naming ENOBUFS; both closures carry a "discriminates" test (the two real ceilings removed, synthetic
sources for the subcommand rule, a `)` string and a comment inside a call, the comment-line skip; a `.detail` swapped
back to `.stderr`). Under M1, the verify and regress ★ LISTING tests went red at their in-suite mutant's anchor
(the ceiling it removes was already gone); the property "the real run reaches done" is falsified by that same mutant,
which runs the pre-fix code over the same fixture and must exit 2.

## Measurements (L24, L37 — measured this run, not inherited)

- The fixture: 1,709 empty files at `big/<250×a>/<250×b>/<250×c>/NNNNN.txt`, 766-byte paths, a 1,310,803-byte `-z`
  listing; create + list ~0.25 s, `git add` + commit ~0.2 s, a worktree checkout ~0.3 s (plan time).
- The new tests, run alone: `gitSync` crossing 0.44–0.50 s; verify ★ LISTING 3.2 s; regress ★ LISTING 3.5 s; quick
  scope ★ LISTING 1.3 s; review ★ LISTING 0.64 s.
- The ceiling did not raise a process's resident size: 20 `git --version` calls at `maxBuffer: 1 << 28` left RSS at
  43 MiB against 45 MiB before them (plan time). That is the measurement; "allocates nothing up front" was an earlier
  wording that went past it, corrected after regress (below).
- The full suite: see "Suite time" below.

## Probes of the built floor

- `stage-regress.mjs` over a repo with the 1,310,803-byte tree **committed** and only `src/index.js` changed →
  exit 0 `done`, `no-regressions`.
- The same tree **untracked** (a changed set past the argv limit) → exit 2 `unusable child-crashed`, detail
  `check-regress.mjs verdict crashed (status null):` — the `regress-inside-echo-list` extension, as the plan recorded
  from its scratch-copy probe. Not fixed here (GATE 1 Q3).
- The plan-time reproduction re-run against the built floor: `check-quick-scope.mjs` exit 0 clean;
  `resolveTarget` 1,710 of 1,710 changed paths; `stage-verify.mjs` and `stage-regress.mjs` both pass the listing that
  stopped them (they stop later on the scratch fixture's own gaps — no floor copy for verify's completeness check, no
  test file for regress's test universe — which the suite's fixtures supply).

## Deviations (advisory orchestration)

- Step 2b's pinned block pipes through `xargs`, which this isolated worktree refuses; the same three tools ran over
  the same path sets through a node runner with argv arrays (`.pharn/pharn-dev-build/format.mjs`, deleted after):
  prettier rewrote three test files, markdownlint fixed one trailing space inside a code span in the CHANGELOG, eslint
  exit 0. `BUILD.md` was formatted after it was written.
- Not filed under `regress-inside-echo-list`, noted for the maintainer: the regress `test` gate hands its outside test
  files to the runner as argv, so a repo with enough test files would meet an argv limit at the head gate too —
  unmeasured, a different spawn with a different remedy.
- **Three wording edits landed after `/pharn-dev-regress` and before `/pharn-dev-verify`** (L64 — each restatement
  re-probed against its measurement or test): the CHANGELOG's "the ceiling allocates nothing up front" became what was
  measured (twenty calls did not raise the resident size); its "★ GIT-FAILED DETAIL requires every `git-failed`
  emission" gained the scan's bound (the ten emissions a lexical scan of three modules finds); and `stage-runtime.mjs`'s
  "every stage then stopped" became "each stage script". Comment and CHANGELOG text only — no code path moved, so the
  regress comparison stands; `/pharn-dev-verify` ran on the final tree.

## Suite time

- After the build: `npm test` → **4,072 tests, 4,072 pass, 0 fail, 0 skipped**, `duration_ms` 186,854 (wall 3:07).
- Before (plan time): 4,061 tests, all pass, 0 skipped, `duration_ms` 446,889 (wall 7:27) — measured while the plan's
  probes ran beside it, so the two wall times are not comparable and no speed-up or slow-down is claimed from them.
- The 11 new tests' own durations, run alone, total about 9 s; they sit in five files `node --test` runs in parallel,
  so their share of the suite's wall time is smaller than that sum (estimated, not measured separately).
