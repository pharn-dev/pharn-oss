# REGRESSION — slim-commands

- stage: `/pharn-dev-regress`, after `/pharn-dev-build` (BUILD.md).
- stage model: regress — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- base: `b6274095d4c9c6bf58926b375eb710a1809d5f82` (`git merge-base HEAD origin/main`, the invoker's `--base`; the
  working tree was dirty, so the auto rule would have picked `HEAD` — the invoker's base wins).
- machine report: `regression-report.json` (the `check-regress.mjs verdict` stdout, byte-identical — `cmp` exit 0).

## Scope partition (`check-regress.mjs scope --feature slim-commands` → exit 0)

- **inside** (19): `git diff --name-only <base>` (18) plus one untracked file (`BUILD.md`) — the eleven product
  commands, `command-hygiene.test.mjs`, `CHANGELOG.md`, `CLAUDE.md`, `README.md`, `SKILLS_VERSION`, and this feature's
  `PLAN.md`, `GRILL.md`, `BUILD.md`.
- **declared** (18): PLAN.md `## Files`.
- **escaped:** none. **escape_exempt:** `.dev/features/slim-commands/GRILL.md` (this feature's own stage artifact).
- **outside gates:** 119 test files (every committed `*.test.mjs` / `*.test.cjs` but the one inside), `validate`, and
  the one committed eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`, both
  confirmed readable before its exit was recorded).
- **style gates skipped:** `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`, so a style flip over the outside files is impossible; the gates are absent from both maps.

## Per-gate exit codes

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (119 outside files, `node --test` with the paths on argv)                          | 0 → 0       |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

The base side ran in a detached `git worktree` of the base commit (removed afterwards, exit 0), the head side in the
working tree; both from the same runner under `.pharn/pharn-dev-regress/`, which passes the outside-test paths to
`node --test` as an argv array — the isolated worktree refuses the pinned `xargs` shell form, and neither recorded
wrong form (`$LIST`, `xargs -a`) was used.

- `regressions`: none. `pre_existing`: none.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`,
exit 0, `no-regressions`).

This certifies the comparison only: `/pharn-dev-regress` catches exactly what its suite catches, nothing more. A
regression no deterministic check covers is invisible here.
