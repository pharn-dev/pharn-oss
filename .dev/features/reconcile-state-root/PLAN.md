# PLAN — reconcile-state-root

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L17, L34, L35, L37, L41]
- increment: `check-bash-reconcile.mjs` and `reconcile-baseline.mjs --anchor` leave PHARN's own state root `pharn/.run/` out of the reconciled set whether or not the project git-ignores it, so a correct build in a project that does not ignore it stops failing `/pharn-verify` on PHARN's own run state (issue #408).
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (prose), repo docs, dev guide
- constitution_refs: [P0, P5, P6, P7]

## The failure (P7 — real, and re-measured this run)

Issue [#408](https://github.com/pharn-dev/pharn-oss/issues/408) (its body is untrusted data, read as a bug report):
in an installed project whose `.gitignore` had no `pharn/.run/` line, with 12 `pharn/.run/` files committed,
`/pharn-verify`'s `reconcile` gate reported 55 escapes, 54 of them PHARN's own stage logs, gate outputs and cost
markers under `pharn/.run/`, each `denied_by="writes-scope (snapshot)"`. A correct build failed verify.

**Reproduced in a throwaway fixture this run** (install posture, `.gitignore` = `node_modules/` only, one tracked
`pharn/.run/cost/tracked.jsonl`, scope `["pharn/features/keep.md"]` set and anchored, then the build's in-scope write,
a tracked-file append, a new untracked stage log, and the verify stage's setter re-writing the scope record).
`check-bash-reconcile.mjs --require-baseline` exited **1 / ESCAPE** with four escapes:

| path                                  | `denied_by`               | live `enforce-writes-scope.cjs` | live `protect-trusted-paths.cjs` |
| ------------------------------------- | ------------------------- | ------------------------------- | -------------------------------- |
| `pharn/.run/pharn-build/t/0-test.out` | writes-scope (snapshot)   | exit 0 (allowed)                | exit 0                           |
| `pharn/.run/reconcile/baseline.json`  | writes-scope (snapshot)   | exit 0 (allowed)                | exit 0                           |
| `pharn/.run/cost/tracked.jsonl`       | writes-scope (snapshot)   | exit 0 (allowed)                | exit 0                           |
| `pharn/.run/writes-scope.json`        | protect-trusted-paths.cjs | exit 2                          | exit 2                           |

The live hooks were **executed** over each path in that fixture (L37). Two defects, both in this repo:

1. **The snapshot match is not the hook's match.** `enforce-writes-scope.cjs` allows `[...ALWAYS, ...scope]` with
   `ALWAYS = ["pharn/.run/**"]` (`:424`, `:1329`); reconcile's `authorizingScope` tests `s.scope` alone
   (`check-bash-reconcile.mjs:809`). So every state-root write a stage makes under a set scope is reported as an
   escape the hook never denied. Even the reconciler's **own** baseline is reported.
2. **The setter's own output is a Write-tool-denied path.** Every stage's Step 0 re-writes
   `pharn/.run/writes-scope.json` through `set-writes-scope.cjs` (`fs.writeFileSync`, by design); both hooks deny a
   Write-tool write to it. Once it is visible to reconcile it is an escape on every run. Fixing (1) alone would still
   fail every verify.

Neither shows in this repo because `.gitignore` ignores `pharn/.run/`, and every reconcile test fixture's
`makeRepo()` default `.gitignore` does too (L41). The two sibling consumers already exclude the state root
explicitly, regardless of `.gitignore`: `worktree-fingerprint.mjs` `isExcluded()` (its header: "a correctness
requirement of the runner … NOT a second copy of `.gitignore`") and `scope-inputs.mjs` `changedPaths()` ("the state
root is never an escape"). Reconcile is the one consumer that still depends on the project's ignore file.

## The change

Make reconcile ask the same question about the state root as the other two consumers: `pharn/.run/` (and a
`pharn/.run` entry itself) is outside the reconciled set, ignored or not, tracked or not.

- `reconcile-baseline.mjs` becomes the **one owner** of the state-root fact: it exports `STATE_ROOT_SEGMENT`
  (`"pharn/.run/"`) and `isStateRootPath(rel)` (`rel === "pharn/.run" || rel.startsWith("pharn/.run/")`, literal,
  case-sensitive — a variant spelling like `PHARN/.run/x` or a look-alike `pharn/.runner/x` stays reconciled, the
  fail-closed direction). `buildRecord()` (the `--anchor` enumeration) skips those paths, so a baseline never hashes
  them.
- `check-bash-reconcile.mjs` drops them from its enumeration **and** skips baseline `entries` keys under the state
  root in the 6.57.0 absent-path loop, so a baseline anchored before this change (one that hashed state-root files in
  such a project) does not turn them into "present at anchor, absent now" candidates. The control-surface listing
  needs no filter: no always-reconciled entry lies under `pharn/.run/` (the data's `human_only` already excludes
  `pharn/.run/writes-scope.json` by name), and a test pins that disjointness.
- `worktree-fingerprint.mjs` imports `STATE_ROOT_SEGMENT` / `isStateRootPath` from `reconcile-baseline.mjs` (which it
  already imports `enumerate` from) and re-exports `STATE_ROOT_SEGMENT` under the same name, retiring its own copy
  (L35). Its excluded set is byte-for-byte the same predicate, so its digest does not move and `ALGO` stays.
  `reconcile-baseline.mjs` cannot import from `worktree-fingerprint.mjs` (that would be a cycle), which is why the
  owner moves to the lower module.

The stated bound changes from "git-ignored paths are outside the reconciled set" to "git-ignored paths **and PHARN's
own state root `pharn/.run/`** are outside it". In this repo, and in any project that ignores `pharn/.run/` as the
docs already assume, the reconciled set is unchanged. Where `pharn/.run/` is not ignored, it now matches the set in
those projects. Nothing that was ever meant to be reconciled leaves the set: the hook allows every state-root path
but `writes-scope.json`, and that one is the setter's designed Bash write. Reconcile judges against the scope
snapshot in the baseline, never against the live scope file.

**Rejected alternative (named for GATE 1):** add `ALWAYS` to the snapshot match (defect 1) and exempt
`pharn/.run/writes-scope.json` by name (defect 2). It keeps state-root paths visible but can never report one: the
hook allows all of them but the exempted one, so visibility buys no detection. It also adds a second copy of
`ALWAYS` and a named exemption, where the chosen change reuses the predicate two consumers already apply.

## Files

- `pharn/floor/reconcile-baseline.mjs` — export `STATE_ROOT_SEGMENT` + `isStateRootPath`; `buildRecord()` skips the state root; header note — product floor
- `pharn/floor/check-bash-reconcile.mjs` — filter the enumeration and the absent-path loop's baseline keys; header bound 1 rewritten — product floor
- `pharn/floor/worktree-fingerprint.mjs` — import + re-export the constant and use the shared predicate; header (1) points at the owner — product floor
- `pharn/floor/check-bash-reconcile.test.mjs` — the ★ cases below — test (never ships)
- `pharn/floor/reconcile-baseline.test.mjs` — the anchor case below — test (never ships)
- `pharn/floor/reconcile-ignore.json` — `derived_ignore.why` / `bound` prose: the state root is outside the set by the checker's own rule, not only by `.gitignore` — product floor data
- `pharn/pharn-contracts/reconciliation-record.md` — the reconciled-set bound (§1, §4 `derived_ignore` row, §5 struck claim, the struck-claims table) — pharn-contracts
- `docs/limitations.md` — the one sentence naming the reconciled-set bound — repo docs
- `docs/guarantees.md` — the reconcile row's "git-ignored paths are outside the reconciled set" clause — repo docs
- `.dev/guides/floor-checks.md` — one `# STATE ROOT (7.2.0)` line in the reconcile section — dev guide
- `CHANGELOG.md` — one new bullet at the END of `## [7.2.0]`'s `### Fixed` group (no date prefix; no `SKILLS_VERSION` or badge change — the branch already bumps to 7.2.0) — repo meta
- `.dev/features/reconcile-state-root/HUMAN-PATCH.md` — proposed `pharn/LIMITS.md §6` text (human-only doc, never agent-edited) — dev feature dir

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — §1's reconciled-set bound and §5's audit are amended to name the state root. The record's shape, `version` and the verdict enum are unchanged (cited, not restated, P4).
- `pharn/pharn-contracts/verify-report.md` — unchanged; `reconcile` stays one exit-code gate.

## Evals to write (P1)

Floor checkers carry tests rather than capability evals. New tests, fixtures from `git init` (L26), every one with a
`.gitignore` that does **not** ignore `pharn/.run/` unless it says otherwise (L41):

- ★ `check-bash-reconcile.test.mjs` — **install posture, `pharn/.run/` not ignored, one state-root file tracked**: an
  in-scope build write + a tracked state-root append + a new untracked stage log + the scope record re-written by a
  later stage's setter + the baseline itself → exit 0, `CLEAN`, `escapes: []`. The same fixture shape as the
  reproduction above, which today exits 1 with four escapes.
- ★ same file, **non-vacuity control (L34)**: the identical fixture plus one out-of-scope `SNEAKY.txt` → exit 1,
  `escapes` is exactly `["SNEAKY.txt"]`. The checker still judges ordinary paths in that tree.
- ★ same file, **boundary (fail-closed spellings)**: an out-of-scope write to `pharn/.runner/x` → still an `ESCAPE`.
  A look-alike prefix is not the state root.
- ★ same file, **legacy baseline**: a baseline that holds a state-root entry (built through `buildRecord` by a caller
  that writes one in by hand, the legacy shape), the file then removed → `CLEAN`, and no "absent now" warning names it.
- ✧ same file, **disjointness pin**: no member of `always_reconciled` (`exact`, `prefixes`, `human_only`,
  `human_only_prefixes`) satisfies `isStateRootPath`. If one ever did, the exclusion would silently remove a
  control path.
- ★ `reconcile-baseline.test.mjs` — `--anchor` in a tree that does not ignore `pharn/.run/`, with tracked and
  untracked state-root files present: the written `entries` hold no key under `pharn/.run/` and still hold the
  ordinary paths.
- The existing `worktree-fingerprint.test.mjs` cases (its `isExcluded` state-root case imports `STATE_ROOT_SEGMENT`)
  run unchanged against the re-exported constant. Its digest pins prove `ALGO` did not need to move.

## Guarantee audit (P0)

- "A state-root path is never a reconcile candidate, ignored or not" → **floor: enum-regex** (a literal prefix test
  over git's own enumeration), pinned by the ★ tests.
- "Ordinary paths in such a tree are still judged" → **floor**, unchanged machinery; pinned by the non-vacuity control.
- "Excluding the state root loses no detection the checker had" → **advisory, argued and partly probed**: the live
  hook allows every `pharn/.run/**` path except `writes-scope.json` (executed this run). `writes-scope.json` is the
  setter's designed Bash write, and reconcile judges against the baseline's own snapshot. A Bash write to the scope
  file is still invisible to reconcile, as it already is in this repo and in every project that ignores
  `pharn/.run/`. Stated as a bound, never as a guarantee.
- "A legacy baseline does not red on state-root entries" → **floor** (key-prefix test), pinned by a test.
- "`worktree-fingerprint`'s digest is unchanged" → **floor**: the existing digest pins run unchanged.
- **Struck:** "this makes PHARN's run state git-ignored" — it does not. The project's `.gitignore` is still not PHARN's
  to write. Run state can still be committed and still shows in `git status`. That is a `pharn-cli` change, named
  below as a follow-up.

## Determinism audit (P5)

Every branch is a literal string-prefix / equality test over a path git printed. No new fallback chain.

## Trust audit (P2)

No new input is ingested. The issue body was read as a bug report only; no instruction in it was followed.

## Applied lessons

- **L17** — the false RED here is L17's exact shape: a changed-since-anchor fact (PHARN's own run state changed)
  reported as a would-have-been-denied claim on the correct, designed workflow. The remedy takes the stage's own
  output out of the question, the way `pipeline_artifacts` did for feature artifacts.
- **L34** — every ★ CLEAN case has a paired control in the same fixture shape that must still report the one
  ordinary-path escape, so a checker that reported everything clean cannot pass.
- **L35** — the state-root literal now has one owner (`reconcile-baseline.mjs`). `worktree-fingerprint.mjs`'s copy is
  retired to an import + re-export instead of being kept in sync by a parity test.
- **L37** — the claim "the live hook would have allowed these paths" was **executed** against both hooks in the
  fixture (table above), not read off `ALWAYS`. That is how the `writes-scope.json` exception (defect 2) was found.
- **L41** — every reconcile test fixture overrode `.gitignore` with one that ignores `pharn/.run/`, so the path every
  such install takes was exercised by nothing. The new cases use a `.gitignore` without that line.

## Not covered (follow-ups, named)

- **`pharn-cli`: make `pharn/.run/` and `pharn/.backup/` ignored on `init` / `update`.** The installer deliberately
  never writes the project's `.gitignore` (`src/lib/root-migration.ts`), and it copies a fixed directory set
  (`src/lib/constants.ts`), so a `pharn/.gitignore` added in this repo would not reach installs without a CLI change.
  Out of this PR.
- **`install-drift` / `pharn doctor` reporting** `pharn/.run/` that is not ignored or has tracked files, naming
  `git rm -r --cached pharn/.run pharn/.backup`. No failure needs it once reconcile no longer reds. It is a hygiene
  report about committed noise. P7: deferred until a failure asks for it.
- **`pharn/LIMITS.md §6`** states the reconcile bounds as "ignored paths are outside the reconciled set". That stays
  true, but it no longer names the whole excluded set. Proposed text in `HUMAN-PATCH.md` for a human to land.
  Per L68, land it **outside** a build's anchor→verify window, or commit it first.
- The issue's "reconcile refuses when `pharn/.run/` is not ignored" option is **not** taken. A refusal would still
  fail a correct build's verify (exit 2 is a non-zero gate), only with a clearer message.

## Open questions (HALT)

- none. One design decision for GATE 1: the state-root exclusion (chosen) vs. `ALWAYS` parity plus a named
  `writes-scope.json` exemption (rejected above).

## GATE 1 decision

- 2026-11-02: **APPROVED as written** by the human maintainer, relayed by the orchestrator session (this stage ran as
  an isolated subagent and could not ask directly). The maintainer chose the state-root exclusion over the `ALWAYS`
  parity alternative.
