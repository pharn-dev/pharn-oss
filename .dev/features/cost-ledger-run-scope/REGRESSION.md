# REGRESSION — cost-ledger-run-scope

- stage: `/pharn-dev-regress`, run after `/pharn-dev-build` over the uncommitted working tree.
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- base: `70cb51c8f3f7c1a3405b651106bc35f244948da9` — the command's own auto rule: `git status --porcelain` was
  non-empty (a working-tree build), so `base = HEAD`.
- machine report: `regression-report.json` (the `check-regress.mjs verdict` stdout, byte-identical — `cmp` exit 0).

## Scope partition (`check-regress.mjs scope --feature cost-ledger-run-scope` → exit 0)

- **inside** (28): `git diff --name-only <base>` plus the untracked files — the six product-floor modules, the seven
  test files, the six fixture files, the contract, the measurement record, `CHANGELOG.md`, `CLAUDE.md`, `README.md`,
  `SKILLS_VERSION`, and this feature's `PLAN.md`, `GRILL.md` and `BUILD.md`.
- **declared** (26): PLAN.md `## Files`, read through `pharn/floor/plan-files-core.mjs`'s `pathsFromPlanFiles`.
- **escaped:** none. **escape_exempt:** this feature's own `GRILL.md` and `PLAN.md` (`BUILD.md` is declared).
- **outside gates:** 115 test files (every committed `*.test.mjs` / `*.test.cjs` — 122 — but the seven inside),
  `validate`, and the one committed eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`,
  both confirmed readable before its exit was recorded).
- **style gates skipped:** `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`, so a style flip over the outside files is impossible; the gates are absent from both maps.

## Per-gate exit codes

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (115 outside files, `node --test` with the paths on argv)                          | 0 → 0       |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

The base side ran in a detached `git worktree` of the base commit under the OS temp dir (removed afterwards, exit 0; not
left in `git worktree list`, and its temp root removed), the head side in the working tree, both from one runner under
`.pharn/pharn-dev-regress/` that passes the outside-test paths to `node --test` as an argv array — the isolated worktree
refuses the pinned `xargs` shell form, and neither recorded wrong form (`$LIST`, `xargs -a`) was used. The base side
ran 3,753 tests, 3,748 passing and 5 self-skipped because the base worktree has no `node_modules` (the dev-toolchain
style probes); the head side ran the same 3,753, all passing, none skipped.

A first attempt stopped before any gate ran: the runner read `pathsFromPlanFiles`' result as an array, while it returns
`{ok, value, entries}`. No worktree had been created; the runner was fixed and re-run.

- `regressions`: none. `pre_existing`: none.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`,
exit 0, `no-regressions`).

This certifies the comparison only: `/pharn-dev-regress` catches exactly what its suite catches, nothing more. A
regression no deterministic check covers is invisible here.
