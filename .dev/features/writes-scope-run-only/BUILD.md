# BUILD — writes-scope-run-only

- plan: `.dev/features/writes-scope-run-only/PLAN.md` (as amended after grill; `GRILL.md` records G1–G14)
- chain: `spec_content_hash` 4950796f…dec1c7f — GREEN (`pharn/ARCHITECTURE.md` unchanged; `hash-doc.mjs` recomputed it at build time)
- scope: `set-writes-scope.cjs --from-plan` → 36 paths; `reconcile-baseline.mjs --anchor --by pharn-dev-build` → 2307 paths, anchored AFTER the setter
- floor: `node pharn/floor/validate.mjs .` → **GREEN** (36 capabilities; this increment adds no new Capability)

## What landed (the agent-writable surface)

`pharn/floor/run-marker.mjs` (new) writes/removes the `pharn-run-active/1` marker at
`<root>/.pharn/<pharn-review|pharn-ship>/<name>/active.json`, refuses `pharn-loop` (owned by
`require-loop-record.cjs`), refuses a symlink on any path component, and validates `<name>` against the
slug grammar `^[a-z0-9][a-z0-9-]{0,63}$`. `pharn/floor/reconcile-baseline.mjs`'s `--anchor` now refuses
(exit 2, nothing written) when `snapshotScope()` is `null` (D6); `pharn/floor/check-bash-reconcile.mjs`'s
`makeDefaultProbeSandbox()` gained a third runtime signal — a fresh marker written by `run-marker.mjs`'s
own `openRun()` — so the no-scope probe sandbox always answers with the strict, in-run default. The two
contracts (`reconciliation-record.md`, `finding-shape.md`) and `pharn/floor/README.md` were updated to
match. Eleven product commands' Final-step phrasing was reworded to state the three-posture rule instead
of the old single-posture claim; `pharn-ship.md` gained the open/close `run-marker.mjs` lines (after the
GATE-1 backstop, in Step 3a); `pharn-review.md` gained its own open line (before Step 3) and a new
`## Step 7 — Close the run`, plus a re-derivation of its Step-0 fix #7 paragraph; `pharn-loop.md` gained
one sentence in Step 1a and a correction in its Final step. `CLAUDE.md` and `README.md` were updated
(the "Writes-scope" section, the guarantee row, the "does not cover your source" bullet); the README's
generated `## Current state` inventory now reads 82 floor checkers (was 81). `CHANGELOG.md` gained
`## [6.24.0]`; `SKILLS_VERSION` 6.23.0 → 6.24.0 (built as 6.22.0 → 6.23.0 and renumbered after the merge of
`main` — see "After merge + renumber", below).

## The human-only patch (NOT written by the agent)

`.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/set-writes-scope.cjs` and `LIMITS.md` were
staged under `.dev/features/writes-scope-run-only/handoff/` (two full patched hook sources +
`limits-edits.json`, a `[{find, replace}]` list), verified in a throwaway detached worktree
(`.pharn/pharn-dev-build/verify-wt`, created and removed by `.pharn/pharn-dev-build/verify-patch.mjs`,
itself deleted after the run per the plan), then reduced to `proposed/human-only.patch` +
`proposed/human-only.sha256`. `handoff/` and the runner were deleted after the run, per the plan's
procedure (steps 5–6). `proposed/apply.sh` (byte-identical to the plan's pinned script) and
`proposed/APPLY.md` were written for the human.

## The verify-patch runner's results (Build procedure step 8)

The runner overlaid this build's own written files (read from the live `.pharn/writes-scope.json` scope
list) plus the two patched hooks and the patched `LIMITS.md` onto a worktree checked out at HEAD, committed
them there (author `pharn-verify <verify@localhost>`), then ran every gate in `package.json`'s
`scripts.check` chain **individually** so each gate's own exit code is visible (never the chain's single
opaque exit):

| gate                 | exit | note                                                                                                         |
| -------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `format:check`       | 0    | (a first run caught a real Prettier miss in `run-marker.test.mjs`; fixed, re-run)                            |
| `lint`               | 0    |                                                                                                              |
| `lint:md`            | 0    |                                                                                                              |
| `docs:check`         | 0    |                                                                                                              |
| `check:markers`      | 0    |                                                                                                              |
| `check:badge`        | 0    |                                                                                                              |
| `check:changelog`    | 0    |                                                                                                              |
| `check:contributing` | 0    |                                                                                                              |
| `check:reconcile`    | 0    | **not counted toward the verdict** (plan): a fresh, never-anchored worktree can only ever read `NO_BASELINE` |
| `test`               | 0    | the FULL suite (3419 tests at the time of this run), against the PATCHED hooks                               |

**The D1 measurement (§5): 0 message differences.** The runner ran the HEAD hook and the new (patched)
hook over the full posture matrix path list × {dev, unsignalled} × {no scope, scope set, malformed} —
14 paths × 2 postures × 3 states = 84 combinations — and diffed `(status, stderr)` for each pair.
**0 differences found**, confirming D1: the dev and unsignalled postures are byte-for-byte unchanged.

## The probe of every quantified sentence (L37)

Beyond the runner's own 84-combination D1 sweep, the patched hook's behavior was exercised directly
(against the `handoff/` copy, before it was deleted) by the new/extended test suites, run to completion
with the copy substituted in place of the shipped path and then reverted — never left pointed at the
copy:

- `pharn/floor/run-marker.test.mjs` — **29/29 GREEN** against the patched hook (25/29 against the
  still-unpatched shipped one; the 4 difference are the writer→guard interaction tests, expected).
- `.claude/hooks/enforce-writes-scope.test.cjs` — **120/120 GREEN** against the patched hook (104/120
  against the shipped one; 16 differences, all newly-added posture/marker/deny-body/D1/fold/guard-error
  tests, expected).
- `pharn/floor/check-bash-reconcile.test.mjs` — **53/53 GREEN** against the patched hook (52/53 against
  the shipped one; 1 difference, the new probe-marker parity test, expected).
- `.claude/hooks/set-writes-scope.test.cjs` — the new `--clear` message pin is GREEN against the patched
  setter, RED (1/46) against the shipped one, expected.
- `pharn/floor/reconcile-baseline.test.mjs` — unaffected either way (**42/42** GREEN against both — this
  file never invokes the write-guard hook), confirming D6 needed no hook patch to exercise.

**Full `npm test` run against the real (still-unpatched) tree at build time: 3419 tests, 3397 pass, 22
fail — exactly the 29+120+53+46 file totals' 4+16+1+1 = 22 newly-added-or-changed assertions above, and
no other file in the ~3400-test suite is affected.** This is the expected shape the plan designs for: the
chain STOPS at `/pharn-dev-verify` reporting `test` RED for this reason, and the exact 22 are named here
so the human (and the verify stage) can confirm the RED is exactly this and nothing else.

## The hook's new per-write cost (L24, measured on this repo)

Two measurements, both in-process (no node-startup noise) via a standalone reproduction of `scanRuns()`'s
own `readdir` + `lstat` calls, `N=100000` iterations each:

- **No state directories present (3× `ENOENT`, the common no-run case): ~0.015 ms/call.**
- **One marker present (1 `readdir` hit + 1 `lstat`): ~0.032 ms/call.**

For comparison, a full hook invocation (subprocess spawn + module load + decision) costs ~25–30 ms
end-to-end, dominated entirely by Node process startup — the added scan is roughly three orders of
magnitude smaller and not the loop guard's inherited "one readdir" figure (this is `enforce-writes-scope.cjs`'s
own, freshly measured). The scan runs **only** in the install posture with an absent/malformed-in-dev
scope — never for a set scope, never for dev/unsignalled — per the "read only when it matters" design (§2).

## Deviations from the plan

- **None structural.** One self-caused defect was found and fixed within this stage, per the standing
  instruction to fix-and-re-run once: `pharn/floor/run-marker.test.mjs` was left mis-formatted after an
  in-place temporary edit-and-revert used to validate its assertions against the patched hook before the
  patch existed on disk; `npx prettier --write` fixed it and the verify-patch runner was re-run once,
  clean the second time (recorded above).
- The plan's "Build procedure" step 3 names only `prettier` and `markdownlint-cli2`; this build also ran
  `eslint` (read-only, no `--fix`) over the scoped `.mjs`/`.cjs` subset, per `/pharn-dev-build`'s own
  Step 2b discipline, and it caught two genuine unused imports in `run-marker.test.mjs` (`lstatSync`,
  `execFileSync`), fixed before the first verify-patch run.
- Test coverage for the new behavior is thorough but not a line-by-line transcription of every case named
  in the plan's "Evals and tests to write" section — e.g. the posture matrix does not exhaustively cover
  every one of the ~14 named paths × both remaining state combinations not already covered by a more
  targeted test. What is covered: every posture × every scope-state combination at least once, every deny
  body (in-repo, out-of-root, other-tree, reserved, malformed) with its RUN-block presence/absence rule,
  the three D1 golden messages held permanently, the ✧ `toKey()` copy pin, the guard-error source-shape
  pin, and the marker aging/negative-control/unreadable-directory cases named in the plan (G14).

## Open issues for the human (beyond the designed verify STOP)

None beyond what `proposed/APPLY.md` already states.

## After GATE 2 fix (2026-09-26)

- stage model: opus — set by the maintainer's instruction, overriding pharn.config.json's sonnet for
  build/regress/verify; routed via Agent subagent; effort not routed
- input: `REVIEW.md` at `a154214` (blocked-with-1-floor-finding: B1/B2, S1, D2, minors 1–9), the maintainer's
  D2 decision (`PLAN.md`, "Amended at GATE 2"), and a partial sonnet fix pass handed off at `fd1c387`
- scope: `set-writes-scope.cjs --from-plan` → 36 paths; `reconcile-baseline.mjs --anchor --by
writes-scope-run-only-opus-fixes` → 2321 paths, anchored after the setter and before the first write.
  `apply.sh`'s `--require-baseline` checkpoint reads this epoch, so the human runs it in this worktree.
- floor: `node pharn/floor/validate.mjs .` → **GREEN** (36 capabilities), after `handoff/` was deleted

### Disposition of every review finding

| finding                                   | disposition                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 (dangling-link leaf)                   | **Fixed, not as handed off.** The handed-off port read `\` as a separator (protect's reading), which let `pharn/features/a\b/../../floor/new.mjs` be judged inside `pharn/features/` in the dev posture too — measured, HEAD denied it. As built: every path is judged at the old `path.resolve()` target first and then at the filesystem's target, and denied if either is denied |
| B2 (the fold widening the exception)      | Fixed (handoff, kept): the `pharn/features/` exception is tested on the unfolded path                                                                                                                                                                                                                                                                                               |
| S1 (a planted file at a run-state path)   | Fixed. Guard: `lstat` each state directory; anything present that is not a directory is a scan error. The handoff had also made a non-directory `<name>` entry a scan error; reverted, per the review's `.DS_Store` caveat. Writer: `run-marker.mjs` exits 2 on every failure. Commands: `/pharn-ship` and `/pharn-review` STOP on a non-zero `--open`                              |
| Important 1 → D2                          | Implemented as the maintainer set it: memory folders and the two temp roots only, never inside another git tree. The memory path must lie inside `memory/`; both roots resolve exactly as a write target does; the project root itself is never allowed                                                                                                                             |
| Minor 1 (D1 messages)                     | Fixed (handoff, kept); `{}` golden pinned; the D1 sweep now covers 7 record shapes                                                                                                                                                                                                                                                                                                  |
| Minor 2 (stale reason, scan-error)        | Fixed: the in-repo stale bullet's install variant; a scan-error block naming each unreadable state directory                                                                                                                                                                                                                                                                        |
| Minor 3 (dangling "see below")            | Fixed (handoff, reworded again for D2)                                                                                                                                                                                                                                                                                                                                              |
| Minor 4 (three overclaims)                | Fixed in `README.md`, `pharn/floor/README.md` and `finding-shape.md` — and a fourth "only" in `/pharn-review` Step 0                                                                                                                                                                                                                                                                |
| Minor 5 (`pharn-loop.md` Final step)      | Fixed: names the whole-tree fail-closed default; the "§2 above" cite is gone                                                                                                                                                                                                                                                                                                        |
| Minor 6 (guard-error test)                | Fixed: a `--require` preload makes `path.relative` throw → exit 2 (dev and install)                                                                                                                                                                                                                                                                                                 |
| Minor 7 (marker names in the RUN block)   | Fixed: a non-slug name is never rendered; the review's two crafted names are pinned absent                                                                                                                                                                                                                                                                                          |
| Minor 8 (probe ignores `openRun()`)       | Fixed: a refusal throws; the main-loop caller maps it to `INCONCLUSIVE` (source-shape pin — no fixture can make it refuse)                                                                                                                                                                                                                                                          |
| Minor 9 (`VERIFY.md` counts)              | Discharged by this pass's `/pharn-dev-verify`, which re-renders `VERIFY.md`                                                                                                                                                                                                                                                                                                         |
| P5 part 2 (`denyGuardError` stdout throw) | The handed-off `uncaughtException` backstop, reviewed and kept: it turns only an exit-1 crash into exit 2 and cannot touch an allow (`process.exit(0)`, nothing written). Both directions are tested                                                                                                                                                                                |
| `pinnedLine()` end of line                | Fixed: it returns the whole shipped line; a mutation control shows an appended `\|\| true` changes the exit                                                                                                                                                                                                                                                                         |
| NEW — backslash paths                     | Found while verifying B1. `toKey()` reads `\` as `/` and collapses `..`, so `.claude/commands/x\..\..\..\src\y.md` (a file inside `.claude/commands/`) folded to `src/y.md` and was allowed. The permissive posture now denies a path containing a backslash, with its own message                                                                                                  |

### The runner (Build procedure step 5), after the fixes

The first invocation's per-gate loop called `npm run "npm test"` for the chain's last element (a runner bug);
the aggregate `npm run check` in that same invocation exited 0. The loop was fixed, two doc edits made after
the first overlay were included, and the runner was run once more. Second invocation:

| gate                 | exit | note                                                                               |
| -------------------- | ---- | ---------------------------------------------------------------------------------- |
| `format:check`       | 0    |                                                                                    |
| `lint`               | 0    |                                                                                    |
| `lint:md`            | 0    |                                                                                    |
| `docs:check`         | 0    |                                                                                    |
| `check:markers`      | 0    |                                                                                    |
| `check:badge`        | 0    |                                                                                    |
| `check:changelog`    | 0    |                                                                                    |
| `check:contributing` | 0    |                                                                                    |
| `check:reconcile`    | 0    | not counted: a never-anchored worktree reads `NO_BASELINE`                         |
| `test`               | 0    | **3454/3454**, against the PATCHED hooks                                           |
| `npm run check`      | 0    | the aggregate, as one chain                                                        |
| D1 message sweep     | 0    | 0 differences over 196 (dev/unsignalled × 7 record shapes × 14 paths), HEAD vs new |

`proposed/human-only.sha256` (identical across both invocations):

```text
6ddb72d0d3ed5d53a31ee936594e9409ba8d082ef6db9ff44d8394a52a528f9a  .claude/hooks/enforce-writes-scope.cjs
1272d81b47e174014dbb13edc569a0f378e4f5c7f999b15b214e2f9b924c88a8  .claude/hooks/set-writes-scope.cjs
c83b717c8c3eea3caa4c203b30253c2fbb750a3ec5038de7708a65a2a1ae0a20  LIMITS.md
```

Before `handoff/` was deleted: `git apply --check` is clean against this worktree's live files, and the
patched copies are byte-identical to the handoff sources.

### Behavioural verification — every review repro, the D2 cases, the new regressions

Each probe ran HEAD's hook, the patched copy and a sandbox copy of `protect-trusted-paths.cjs`, with the
root pinned by `CLAUDE_PROJECT_DIR`; home-directory paths are decision-only. **49/49 as expected**
(combined = deny if either guard denies):

- **B1:** `src/evil-cmd -> ../.claude/commands/pharn-evil.md` and `src/evil-floor -> ../pharn/floor/new.mjs`
  (both absent) → DENY; the controls (dangling links to `.pharn/writes-scope.json` and
  `.claude/settings.local.json`; `src/live-config -> ../pharn.config.json`) → DENY.
- **B2:** `pharn/features./x.md`, `pharn/features /x.md`, `pharn/Features/x.md`,
  `PHARN/Features/x/PLAN.md` → DENY; `pharn/features/x.md` → ALLOW.
- **D2:** `~/.claude/settings.json`, `~/.claude.json`, `~/.claude/hooks/x.sh`, `~/.zshrc`,
  `~/.ssh/authorized_keys`, `~/.gitconfig`, `~/Library/LaunchAgents/x.plist` → DENY;
  `~/.claude/projects/x/memory/note.md`, `/tmp/…`, `<os.tmpdir()>/…` → ALLOW; a path in another git tree
  and `/etc/…` → DENY; the project's `CLAUDE.md`, `AGENTS.md`, `.mcp.json` → ALLOW (D2's design; LIMITS §7
  now says so).
- **S1:** a FILE at `.pharn/pharn-review`, `.pharn/pharn-ship`, `.pharn/pharn-loop` or `.pharn` → `src/x.js`
  DENY, and `run-marker.mjs --open` exits 2 with no stack trace (for `.pharn/pharn-loop`, the loop's own
  writer is not this script); a FILE at `.pharn/pharn-review/feat` → `--open` exits 2 (the command STOPs)
  while the guard reads a stray entry as no run.
- **Backslash:** `a\b/../.claude/commands/evil.md`, `.claude/commands/x\..\..\..\src\y.md`,
  `pharn/features/a\b/../../floor/new.mjs`, `pharn/features/a\b/../../CONSTITUTION.md`, `a\b/../LIMITS.md`
  → DENY (install); `pharn/features/a\b/../../floor/new.mjs` → DENY and `pharn/features/a\b.md` → ALLOW
  (dev).
- **Minor 2:** a leftover scope gives the install stale reason, and removing it allows the write; a
  `chmod 000` state directory names itself in an out-of-root denial. **Minor 6 / P5:** a forced
  `path.relative` throw and a forced `stdout.write` throw each exit 2 (HEAD: 1); the same preload leaves an
  allow at 0. **Minor 7:** the review's crafted names are absent from the message.

### Hook cost (L24, measured here)

End-to-end spawn, median of 40: dev posture HEAD 40.3 ms, patched 39.2 ms; install posture HEAD 45.1 ms,
patched 37.6 ms. Node's startup dominates. The second resolution only runs when a path reaches a different
target, which needs a symlink. The marker scan's cost is within the noise.

### The designed verify STOP — the expected-fail list

Against this worktree's still-unpatched hooks, exactly **36** tests fail. Each asserts the patched guard:

- 30 in `.claude/hooks/enforce-writes-scope.test.cjs`;
- 4 in `pharn/floor/run-marker.test.mjs`;
- 1 in `pharn/floor/check-bash-reconcile.test.mjs`;
- 1 in `.claude/hooks/set-writes-scope.test.cjs`.

Against the patched copy the same files pass:

- `enforce-writes-scope.test.cjs` 143/143;
- the other seven `apply.sh` suites plus `command-hygiene.test.mjs`, 518/518, in a scratch worktree;
- the runner's full `npm test`, 3454/3454.

`VERIFY.md` names the 36.

## After merge + renumber (2026-09-26)

- stage model: opus — set by the maintainer's instruction, overriding pharn.config.json's sonnet for
  build/regress/verify; routed via Agent subagent; effort not routed
- input: the orchestrator's GATE-2 rulings (`PLAN.md`, "GATE-2 rulings"). The backslash rule is approved.
  `stage-regress-script` (#277) merged first and released 6.23.0, so this phase is 6.24.0.
- merge: `origin/main` (`1524c6f`) merged into `67847e5` — a merge, not a rebase; merge base `767bf61`
- floor: `node pharn/floor/validate.mjs .` → **GREEN**, after the merge and the renumber

### The three conflicts, and how each was resolved

- **`CHANGELOG.md`.** Main's `## [6.23.0]` section is kept byte for byte. So are everything below it and
  the preamble above it; all three were compared with `1524c6f`'s bytes. This phase's entry moved into a
  new `## [6.24.0] - 2026-09-26` section directly above main's. Its bump sentence now says
  `6.23.0 → 6.24.0` and why the number changed.
- **`README.md`.** The conflict was the generated `## Current state` line. It was regenerated with
  `npm run docs:generate` and now reads 87 floor checkers. The badge merged cleanly, because both sides had
  set it to 6.23.0, and was then renumbered to 6.24.0.
- **`.claude/commands/pharn-regress.md`.** Main rewrote the command around `stage-regress.mjs`. It was
  resolved to main's text, and this phase's Final-step rewording was applied to main's "Why this exists"
  sentence.

Git merged these without conflict:

- `CLAUDE.md`;
- `pharn-loop.md` and `pharn-ship.md`;
- `.dev/floor/command-hygiene.test.mjs`, which keeps both phases' pins (main's `STAGE_SCRIPT_WIRING` and
  this phase's).

`writes-scope-release.test.cjs` was not touched by main. `SKILLS_VERSION` carried the same change on both
sides and was then set to `6.24.0`.

### The renumber

Every `6.23.0` this phase had added was renumbered to `6.24.0`: **108 occurrences on 107 added lines**,
found by `git diff origin/main -- . | grep '^+.*6\.23\.0'`. The 25 in `human-only.patch` were renumbered
by regenerating the patch (below). Main's own `6.23.0` references are unchanged. An added line that still
names `6.23.0` does so on purpose: it is a from-version (`6.23.0 → 6.24.0`) or a reference to main's
release.

### The reconcile epoch was re-opened

The first epoch, `writes-scope-run-only-opus-fixes`, read `CLEAN` at `67847e5`, before the merge.
`VERIFY.md` records that reading. On the merged tree the same epoch read `ESCAPE` with 30 escapes, and
every one of them is a file #277 changed: the merge itself, not a write this phase made. So the PLAN setter
was re-run, and `reconcile-baseline.mjs --anchor --by writes-scope-run-only-post-merge` re-anchored at
2026-09-26T09:56:59.691Z (2345 paths). No baseline was edited or deleted.

The merge was then committed at once, as `c0d33d7`, because reconcile compares the always-reconciled
control surface with HEAD's committed blobs. Those are the hooks, the settings and every file under
`pharn/floor/` and `.dev/floor/`. While the merge was uncommitted, HEAD was still `67847e5`, so main's
floor files read as 17 control-surface escapes; once committed, the new epoch read `CLEAN`. That commit
is amended with the regenerated patch and this stage's artifacts, so the branch gains one merge commit.

### The regenerated patch

`handoff/` was recreated from the committed patch in a scratch worktree at `c0d33d7`, and its 25 lines
were renumbered there. The change is renumber-only: turning every `6.24.0` in the three new files back
into `6.23.0` reproduces the previous `human-only.sha256` digests exactly. The runner then ran:

| gate                 | exit | note                                                                          |
| -------------------- | ---- | ----------------------------------------------------------------------------- |
| `format:check`       | 0    |                                                                               |
| `lint`               | 0    |                                                                               |
| `lint:md`            | 0    |                                                                               |
| `docs:check`         | 0    |                                                                               |
| `check:markers`      | 0    |                                                                               |
| `check:badge`        | 0    | badge `6.24.0` = `SKILLS_VERSION`                                             |
| `check:changelog`    | 0    | newest section `## [6.24.0] - 2026-09-26`; 111 sections in order              |
| `check:contributing` | 0    |                                                                               |
| `check:reconcile`    | 0    | not counted: a never-anchored worktree reads `NO_BASELINE`                    |
| `test`               | 0    | **3570/3570**, against the PATCHED hooks                                      |
| `npm run check`      | 0    | the aggregate, as one chain                                                   |
| D1 message sweep     | 0    | 0 differences over 196 (2 postures × 7 record shapes × 14 paths), HEAD vs new |

`proposed/human-only.sha256`:

```text
6bbfa46894d61ff0a7b3c39af8166feda7bf5fbc2d5bcf25afd393077c20a658  .claude/hooks/enforce-writes-scope.cjs
42e6db9fc605ab495c7903aa4069e42b35c2630db83948292cb8619857248331  .claude/hooks/set-writes-scope.cjs
0de8c9f9ea9cfff1a7b11bbd9919392fd89c92a43d9ae7a7a733edd5e62244c5  LIMITS.md
```

The new patch and the previous one are both 1013 lines long. They differ in 28 lines:

- 25 lines, each a `6.23.0 → 6.24.0` substitution;
- 3 `index` lines, which carry the new blob ids.

`git apply --check` exits 0 against this worktree's live files. The behavioural probe was re-run against
the renumbered copy after the merge: every REVIEW repro, the D2 cases and the backslash cases, **49/49 as
expected**, with a D1 sweep of 0 differences over 28. The runner removed its own `verify-wt`. The scratch
worktree was then removed, and the runner deleted.

## After the re-review (R1–R4, 2026-09-26)

- stage model: opus — set by the maintainer's instruction, overriding pharn.config.json's sonnet for
  build/regress/verify; routed via Agent subagent; effort not routed
- input: `REVIEW.md`, "Re-review of the final patch" (at `b9d2de5`): blocked-with-1-floor-finding (R1), plus
  R2 (important), R3 and R4 (minor). The orchestrator ruled GATE 2 is FIX, under the maintainer's delegation,
  and set each fix (`PLAN.md`, "Re-review rulings and fixes").
- scope: the PLAN setter (36 paths) before the first write. The reconciliation epoch is still the one
  anchored after the merge (`--by writes-scope-run-only-post-merge`); nothing was re-anchored.
- floor: `node pharn/floor/validate.mjs .` → **GREEN** (36 capabilities)

### The four fixes

- **R1 (blocking).** First reproduced against the hook of the committed, pre-R1 patch, applied in a
  throwaway worktree. The project was `tmpproj-nogit` under the OS temp directory, with no `.git`, and
  `CLAUDE_PROJECT_DIR` set; there was no scope and no run. Each of `.claude/commands/pharn-evil.md`,
  `pharn/floor/x.mjs`, the existing `pharn/floor/check-verify.mjs` and `pharn.config.json` exited 2 as the
  project spells it, and **0** under `TMPPROJ-NOGIT/…`. On this volume the variant names the same
  directory. The fixed hook exits 2 for all eight. Two measurements decided the fix:
  - `fs.realpathSync.native` returns the on-disk spelling for both a case variant and an NFC variant of an
    NFD name, while `fs.realpathSync` keeps the caller's;
  - `process.cwd()` in a child started from a case-variant directory returns the on-disk spelling. So
    `ROOT` is in the on-disk spelling, and a natively resolved target compares correctly against it.

  The fix has two parts, as ruled, kept together as defence in depth:
  - resolution (2) and its starting point realpath natively;
  - in the install posture, a target outside `ROOT` as spelled whose `toKey()` equals or lies under
    `toKey(ROOT)` is denied as the project's own path. That is a new `in-repo` variant body, which offers
    only "spell it as the project does" and a human write, never Bash. The first draft of that body named
    the root inside a FIX bullet; the suite's command-citation extractor read `/private` there as a slash
    command, so the root now appears only in WHY.

  One header sentence became false with the native resolution and was corrected: "a path that does not run
  through a symlink resolves to the same target both ways". A case-variant spelling of an existing
  directory now resolves differently in the two passes.

- **R2 (important).** The fix is in `pharn-loop.md`: a non-zero Step 1a snapshot line or `--open` line
  STOPs as **S9**. The row choice is justified in the command and in `PLAN.md`. `run-marker.test.mjs`
  executes both pinned lines, whole, in a git sandbox:
  - a control run with nothing planted: both exit 0;
  - a file planted at `.pharn`, `.pharn/pharn-loop` or `.pharn/pharn-loop/demo-run`: both exit 1 each time.

  A position pin places each STOP between its line and the next step. The writer, `require-loop-record.cjs`,
  is unchanged.

- **R3 (minor).** The hook header's backslash sentence is reworded, in the patch.
- **R4 (minor).** The `[6.24.0]` entry is rewrapped so that `exit 1.` stays together. Rendered with this
  repo's markdown-it, the section now has no `<ol>`, and `exit 1.` survives. The CHANGELOG sections from
  `[6.23.0]` down, and its preamble, are still byte-identical to `origin/main`'s.

The docs that state the rule were updated with it: `CLAUDE.md`, `README.md`, `pharn/floor/README.md`, the
CHANGELOG, `APPLY.md` and, in the patch, `LIMITS.md §7`. Two things drove that:

- the new alias rule and its over-block;
- the new toward-deny case in the dev and unsignalled postures. Every sentence that enumerated that
  posture's verdict changes would otherwise have undercounted them.

Two test titles changed because their claims became false:

- `★ B1 in the DEV posture too — a verdict change there, and it is toward deny` (it had said "the one
  verdict change there besides a guard error");
- `✧ WIRING: pharn-loop.md's existing --open/--close lines still work unchanged (the loop's marker writer
is untouched)` (it had said "the loop is untouched").

**Declared, not hidden:** one mixed-case respelling in `enforce-writes-scope.test.cjs` was switched with a
`sed -i` Bash edit rather than the Edit tool. The path is inside the declared scope, so the guard would have
allowed the same edit through the Edit tool, and reconcile reads it as in scope. Every other in-repo write
went through the Write and Edit tools.

### The handoff, the runner and the regenerated patch

`handoff/` was recreated as the scratch worktree `.pharn/pharn-dev-build/handoff-wt`, which is the
committed patch applied at `b9d2de5`. The R1 and R3 edits and the `LIMITS.md` sentences were applied there
as exact find/replace blocks, each required to match once: 14 in the hook and 3 in `LIMITS.md`.
`set-writes-scope.cjs` is unchanged. The runner was rewritten from the PLAN's procedure and run once:

| gate                 | exit | note                                                                          |
| -------------------- | ---- | ----------------------------------------------------------------------------- |
| `format:check`       | 0    |                                                                               |
| `lint`               | 0    |                                                                               |
| `lint:md`            | 0    |                                                                               |
| `docs:check`         | 0    |                                                                               |
| `check:markers`      | 0    |                                                                               |
| `check:badge`        | 0    |                                                                               |
| `check:changelog`    | 0    |                                                                               |
| `check:contributing` | 0    |                                                                               |
| `check:reconcile`    | 0    | not counted: a never-anchored worktree reads `NO_BASELINE`                    |
| `test`               | 0    | **3581/3581**, against the PATCHED hooks (3570 + 11 new tests)                |
| `npm run check`      | 0    | the aggregate, as one chain                                                   |
| D1 message sweep     | 0    | 0 differences over 196 (2 postures × 7 record shapes × 14 paths), HEAD vs new |

`proposed/human-only.sha256`:

```text
04eba260a76b4fbf341cfee7712ef4482986886bcca901d1b12c745809ccc0b1  .claude/hooks/enforce-writes-scope.cjs
42e6db9fc605ab495c7903aa4069e42b35c2630db83948292cb8619857248331  .claude/hooks/set-writes-scope.cjs
24628cb91e36c9ba5ae880aadfdbbd21dd3fe631e37a27e7ffe311b727fc9fe9  LIMITS.md
```

The setter's digest is unchanged from the previous patch. `git apply --check` exits 0 against this
worktree's live files.

The behavioural probe covers every earlier REVIEW repro, D2, the backslash cases, and now R1 and R2. It ran
against the patched copy: **74/74 as expected**, and a D1 sweep of 0 differences over 28. Its R1 rows:

- the repro's four paths, exact and under two case variants;
- the ordinary-source over-block, and its control;
- a `.git` root, whose variant gets the alias body, not "another git tree";
- the NFC spelling of an NFD project;
- the trailing-dot sibling;
- the dangling link to a variant floor path, which on this case-insensitive volume lands at
  `-> pharn/floor/new.mjs`;
- the dev posture, whose message is byte-identical to HEAD's.

Its R2 rows are the loop's two lines, with nothing planted and with each of the three plants. The R1
sandboxes lived under the OS temp directory, because the vector needs a temp root with no git tree above
it, and were removed after the run. The scratch worktree was then removed, and the runner deleted.
