# REGRESSION — setter-dropped-bullets

- Base: `dde008dc6db1a41fa878fdc8b3f3333027aa79a3` = `origin/main` before this increment (7.20.0), passed explicitly. The
  auto-detected base would be `HEAD` (a dirty working-tree build), but the maintainer's setter patch was committed
  before the build anchored (L68), so a `HEAD` base already holds the setter change and would compare it against itself:
  a setter-induced red in an outside test would read `pre_existing` at both sides. `dde008dc` predates every change of
  this increment.
- HEAD: the working tree on `przemek/setter-names-dropped-bullets` (HEAD `c7b366f9` plus the build's uncommitted files).
- Verdict source: `pharn/floor/check-regress.mjs verdict ... --per-test tests` (deterministic; exit `0`)
- Machine report: `regression-report.json` (the helper's stdout, verbatim — `cmp` equal)

## Inside / outside partition (deterministic; `check-regress.mjs scope`)

- **Inside** (18 paths): `git diff --name-only dde008dc` plus untracked files, listed in `regression-report.json`
  `.inside`.
- **Scope, run twice, both recorded.** With `--declared` = the PLAN's `## Files` alone (read by `pathsFromPlanFiles`),
  `scope` exits 1 with `escaped: [".claude/hooks/set-writes-scope.cjs"]`. That file is the maintainer's patch: the PLAN
  keeps it out of `## Files` on purpose (a plan scope naming it is refused without `--allow-claude-dir`) and declares it
  under "Not in `## Files` — the maintainer's patch", and it was committed before the anchor (`d1793d20`, `60a2af53`).
  With `--declared` = `## Files` plus that one path, `scope` exits 0 with `escaped: []`; `escape_exempt` = this
  feature's own `GRILL.md` and `PLAN.md`. No other changed path is outside the declared writes.
- **Outside gates run** (the same commands at base and head): `tests` (194 outside test files, through the per-test
  reporter), `validate`, and `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
  (↔ `.dev/features/trust-fence/findings.json`, both paths checked readable on each side first). The style gates were
  skipped: `inside` touches no shared style config.
- **How the tests ran.** Each side ran `node --test --test-reporter=<working tree>/.dev/floor/node-test-results-reporter.mjs
--test-reporter-destination=<working tree>/pharn/.run/pharn-dev-regress/<side>-tests.json <files…>` from a node
  runner that passes the 194 paths as argv (no shell, no word splitting). The pinned `cat | xargs` line is refused in
  this isolated worktree session; the argv is the same. The base checkout was a detached `git worktree` of `dde008dc`
  with `node_modules` linked, as the working tree has it, so the style-dependent tests run on both sides.

## Per-gate exit codes (base → head)

| Gate                            | base | head | result |
| ------------------------------- | ---- | ---- | ------ |
| tests (194 outside files)       | 0    | 0    | OK     |
| validate                        | 0    | 0    | OK     |
| structural:trust-fence (1 pair) | 0    | 0    | OK     |

Per-test records: 6648 tests on each side, 6647 passed and 1 skipped on each; `per_test.new_failures: []`. Base side
723 s, head side 752 s.

## Verdict

**no-regressions** — no outside gate flipped and no outside test failed at head that passed at base. This covers the
outside suite, `validate` and the one eval pair, nothing more; the feature's own tests are inside and are verify's.

## Bound

The renumber to 7.22.0 (main took 7.21.0 while this ran) and the merge of `origin/main` happen after this stage, before
verify; verify's whole-suite run is the gate over that tree.
