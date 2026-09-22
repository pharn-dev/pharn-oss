# PLAN — run-gates-base-cwd

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L1, L18, L22, L34, L37, L41, L44, L45, L50, L52]
- increment: make `/pharn-regress`'s pinned base-side runner lines work, by resolving every `run-gates.mjs` path operand against the directory the runner is invoked from, so `--cwd` changes only where gates execute and which tree is fingerprinted.
- layer(s): pharn/floor (product floor), pharn-contracts (one clarification)
- constitution_refs: [P0, P3, P5, P6, P7]

## Why (P7 — a real failure, reproduced live this run)

`/pharn-regress` Step 4b pins the base side as
`node pharn/floor/run-gates.mjs init --stage regress --side base --feature <name> --out .pharn/pharn-regress/base-gates --spec-from .pharn/pharn-regress/head --cwd .pharn/pharn-regress/base`
(`.claude/commands/pharn-regress.md:260`). Executed verbatim in a scratch git repo, after the pinned
worktree line (`:248`) and the pinned head `init` (`:256`), it exits **2 `spec-mismatch`**:

```text
"--spec-from has no readable record at …/rgcwd/.pharn/pharn-regress/base/.pharn/pharn-regress/head/state.json"
```

The cause is in `pharn/floor/run-gates.mjs`, and it is a mismatch between the two subcommands, not a
typo in the command:

- `init` resolves `--out` against `--cwd` (`assertContained(out, cwd)` → `resolve(cwd, outDir)`, `:128-130`,
  called at `:311`) and `--spec-from` against `--cwd` (`resolve(cwd, specFrom)`, `:323-324`). With
  `--cwd .pharn/pharn-regress/base` both land INSIDE the base worktree.
- `run --next` takes no `--cwd`; it resolves `--out` against the process directory
  (`join(resolve(out), "state.json")`, `:601`) and then re-checks containment against the RECORDED cwd
  (`assertContained(out, cwd)`, `:610`), so even a successful base `init` would be drained from a
  different directory than it wrote to.
- Even past both, the finalized base stamp would sit inside the base worktree, which Step 6 deletes with
  `git worktree remove --force .pharn/pharn-regress/base` (`pharn-regress.md:375`) — and Step 5 reads it
  from `.pharn/pharn-regress/base-gates/stamp.json` at the repo root (`:327`).

So the base side of the gate runner has been unreachable from the command that invokes it since #230.
That is L45's shape exactly. Its suite could not see it: every `run-gates.test.mjs` case runs with the
default `--cwd .` (L41), and the one base-side test (`:196-250`) passes neither `--cwd` nor a worktree.

**Correcting the record (the loop-freshness prompt).** Its "Stamp paths the commands pin" list names
`.pharn/pharn-regress/base-gates/stamp.json` as a pinned stamp path. The PATH is pinned, but no pinned
line can produce a file there today. The freshness increment reads that stamp, so this fix goes first.

## Applied lessons

- L45 — the defect sits in the runner while the file that invokes it (`pharn-regress.md`) is unchanged,
  so the test EXTRACTS the committed pinned lines from `pharn-regress.md` and executes them. It does not
  retype them. The negative control asserts that nothing lands at the OLD location
  (`<worktree>/.pharn/pharn-regress/base-gates/`).
- L41 — `--cwd` defaults to `.` and every existing test relies on that default, so the non-default value
  is covered by nothing. The new tests pass a real, non-`.` `--cwd`.
- L52 — the rule "every path operand resolves against the invoking directory" is quantified over a set.
  That set is `--out`, `--spec-from`, `--discover` and `--scope-json`, materialized once in the test and
  iterated, so a member is not covered by accident.
- L22 — `pharn-regress.md`'s pinned lines stay byte-identical. The fix makes them correct and does not
  describe a workaround in prose.
- L44 — each extracted pinned block runs as its own `sh -c`, never concatenated, which is how a real run
  executes them.
- L34 — the extraction asserts it found each pinned line it needs before running anything, so a renamed
  line cannot make the test pass vacuously.
- L37 — the defect was PROBED (the exact pinned lines in a scratch repo, exit 2 quoted above), not read
  off the code. The claim the fix makes gets the same treatment: the test executes it.
- L50 — the sweep is by REFERENT, meaning every cite of the runner's `--cwd` / `--out` resolution
  (`grep -rn -- "--cwd"` over `pharn/`, `.claude/commands/`, `CLAUDE.md`). It is not limited to one
  sentence's spelling. Results are recorded under "Sweep".
- L1 — the meta-docs this changes are scoped here: the `CLAUDE.md` gate-runner usage block, the contract,
  `CHANGELOG.md`, `SKILLS_VERSION` and the README badge.
- L18 — the exclusion block below is a real `###` heading.

## Files

- `pharn/floor/run-gates.mjs` — resolve `--out`, `--spec-from`, `--discover` and `--scope-json` against
  the invoking directory, in both `init` and `run --next`; containment is checked against the invoking
  directory's `.pharn/`; `--cwd` stays the gates' execution directory and the fingerprint/HEAD root; the
  header states the rule — layer pharn/floor
- `pharn/floor/run-gates.test.mjs` — (1) the regress pair end to end with a real `git worktree` and a
  non-`.` `--cwd`; (2) the committed `pharn-regress.md` pinned lines, extracted and executed one block
  per shell, through `check-regress.mjs verdict`; (3) the path-operand set iterated — layer pharn/floor
- `pharn/pharn-contracts/gate-run-record.md` — one bullet stating which directory each path operand
  resolves against — layer pharn-contracts
- `CLAUDE.md` — the gate-runner block's usage line gains the one-sentence resolution rule — repo meta
- `CHANGELOG.md` — `[Unreleased]` → `### Fixed` entry, `SKILLS_VERSION` 6.9.2 → 6.9.3 — repo meta
- `SKILLS_VERSION` — `6.9.3` (patch: a correction to shipped floor bytes) — repo meta
- `README.md` — the shields badge only, held equal to `SKILLS_VERSION` by `check:badge` — repo meta

### Deliberately NOT in scope

- `.claude/commands/pharn-regress.md` — its pinned lines are correct once the runner is; editing them
  would change the invocation the new test exists to pin.
- `pharn/floor/gate-run-core.mjs`, `pharn/floor/check-regress.mjs`, `pharn/floor/check-verify.mjs` — the
  grammar and both verdict cores are unaffected by where the runner's files are written.
- `MIN_CLI` — no installed path moves, so an older CLI still installs a working tree.
- The four trusted docs — nothing in them states the runner's path resolution.

## Contracts satisfied

- `gate-run-record` — `<out>` still resolves strictly inside the state root and never IS it; the edit
  names WHICH state root (the invoking directory's). The schema is unchanged.
- `regression-report` — unchanged; the base stamp it is computed from becomes reachable.

## Evals to write (P1)

No Capability is added or changed, so no eval is owed. The floor tests are listed under `## Files`.

## Guarantee audit (P0)

- "the runner's records land in the invoking directory's `.pharn/`, whatever `--cwd` says" → floor:
  tested code (the containment check is a path comparison over resolved paths, primitive #3, and the new
  tests exercise a non-`.` `--cwd`).
- "the committed `/pharn-regress` base-side lines produce a finalized stamp at
  `.pharn/pharn-regress/base-gates/stamp.json`, which survives `git worktree remove --force`" → floor
  for the LINES (the test executes them verbatim); that a run EXECUTES them is advisory orchestration,
  as before.
- "the regress verdict over the two stamps is computed" → floor (`check-regress.mjs verdict`, unchanged).
  The test runs it, and a base stamp whose `head` differs from `--base` still refuses
  `base-head-mismatch`.
- Not claimed: that the base environment installs (Step 4c stays a named cost), or anything about
  forgery (the stamp bound in the contract is unchanged).

## Trust audit (P2)

No new input is ingested. The operands are the same paths and slugs as before, shape-gated where they
were before; only the directory they are resolved against changes.

## Determinism audit (P5)

No new branch. Containment stays a resolved-path prefix comparison plus an `lstat` walk.

## Sweep (L50 — by referent)

`grep -rn -- "--cwd"` over `pharn/`, `.claude/commands/` and `CLAUDE.md`, re-run at build. At plan time
it found: the runner's own usage header, the `init` implementation, `pharn-regress.md:260` (the one
caller), and the `CLAUDE.md` usage line. No other command passes `--cwd`. No cite describes the old
cwd-relative resolution as intended.

## Open questions (HALT)

- None. The user delegated GATE 1 for this batch, and the only design choice (one resolution rule for all
  four path operands, or only the two that broke) is decided here. The rule is one rule, because
  `--discover` and `--scope-json` are behaviour-identical for every current caller (none passes `--cwd`),
  and two rules would re-create the trap for the next caller.
