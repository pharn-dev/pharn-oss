# REGRESSION — spec-template-override

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict comes from
`check-regress.mjs verdict` (exit 0, `"no-regressions"`) over maps captured in equivalent environments at base
and head. A FIRST capture recorded a `tests` flip, 0 → 1. It was investigated rather than recorded, it traces to
the harness, and its own verdict is kept below.

## Base and scope

- **Base:** `ba46b7b` (`HEAD`). The working tree is dirty, so the command's rule selects `base = HEAD`.
  `ba46b7b` is the human-applied hook commit (`apply.sh`). The hook change is therefore on BOTH sides, and this
  comparison does not cover it: `apply.sh` ran every hook suite plus the reconcile and check-spec suites on the
  applied bytes (547/547), and `/pharn-dev-verify` re-runs every gate at HEAD.
- **Inside:** 16 paths, the plan's 14 `## Files` paths that changed plus this feature's `PLAN.md` / `GRILL.md`.
  `escaped: []`; `escape_exempt`: `GRILL.md`, `PLAN.md` (each written by its own stage).
- **Outside gates:** `tests` (94 outside test files), `validate`, and
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` (both eval-pair paths
  confirmed readable at base and head). The style gates are skipped on both sides: no shared style config is
  inside.

## Per-gate exit codes (the verdict's input)

| gate                | base | head |
| ------------------- | ---- | ---- |
| `tests`             | 0    | 0    |
| `validate`          | 0    | 0    |
| `structural:…` pair | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

## The first capture, and why it was not the verdict's input

The first capture (kept as `.pharn/pharn-dev-regress/{base,head}-results.raw.json`) read `tests` 0 → 1, and
`check-regress.mjs verdict` over it returns `regressions: ["tests"]` (exit 1). One outside test failed at head:
`style: a spliced README passes the repo's prettier and markdownlint unchanged`
(`.dev/floor/capability-catalog-core.test.mjs:489`). Both sides were harness artifacts:

- **Head:** the test runs `markdownlint-cli2` from the repo root. The repo config's `globs` pull in three other
  sessions' worktrees under `.claude/worktrees/`, which carry 8,468 issues in vendored docs, so it exits 1.
  Nothing in this increment touches that test, the README region it splices, or the lint config.
- **Base:** the detached base worktree has no `node_modules`, so that test SKIPS itself and a skip exits 0.
  This is the self-skipping blind spot L37 records.

The re-capture removed both artifacts. The base worktree got `node_modules` (a symlink), so the test ran at
base. Head ran in a byte-copy of the working tree without the sibling worktrees and without `.git`/`.pharn`. With
the same 94 files, the same three gates and the same pinned `xargs` form, both sides are 0 everywhere. That
choice of environment is orchestration, and it is ADVISORY; the comparison over the maps is the floor verdict.

## The residual (P0)

This stage catches exactly what its suite catches, nothing more. A regression outside the feature that no
deterministic check covers is invisible here. "No regressions" means no DETECTABLE breakage in these three
gates, never "nothing broke".

## Iteration 2 — after the GATE 2 fix round

Re-run after the `symlinked-root` refusal, the new fixtures and the prose fixes, using the same method as
iteration 1: base `ba46b7b` in a detached worktree with `node_modules` linked, and head in a byte-copy of the working
tree without `.claude/worktrees/`. `scope`: `escaped: []`, 94 outside test files. All three gates are 0 → 0.
`check-regress.mjs verdict` exit 0, `"no-regressions"`. `regression-report.json` is that run's output verbatim. Its
`inside` list now also names this feature's stage artifacts. The raw working-tree capture was not repeated; the
sibling worktrees that caused iteration 1's raw `tests` flip are still present.
