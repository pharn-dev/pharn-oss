# REGRESSION — markdownlint-no-globs

**Base:** `d96ef0350c2c43807c8fd8f2dd90a30350c01cfa` (HEAD; this is a working-tree dogfood build, so
`git status --porcelain` is non-empty and base = HEAD by the Step 1 rule).

## Partition

- **Inside (18 paths):** 10 `.claude/commands/*.md`, `.dev/floor/command-hygiene.test.mjs`,
  `.dev/floor/capability-catalog-core.test.mjs`, `.markdownlint-cli2.jsonc`, `CHANGELOG.md`,
  `README.md`, `SKILLS_VERSION`, and this feature's `PLAN.md` / `GRILL.md`.
- **Escaped:** none (`check-regress.mjs scope` exit 0). `escape_exempt`: this feature's `PLAN.md` and
  `GRILL.md`, each written by its own stage under its own scope.
- **Outside gates:** 93 outside test files (`tests`), `validate`, one structural pair
  (`trust-fence`), and, because `inside` touches `.markdownlint-cli2.jsonc`, the three style gates.

## Gates (exit codes, base → head)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (93 outside files, `cat outside-tests.txt \| xargs node --test`)                   | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |
| `lint`                                                                                     | 0    | 0    |
| `format:check`                                                                             | 0    | 0    |
| `lint:md`                                                                                  | 0    | 0    |

`regressions[]`: none · `pre_existing[]`: none.

**Harness note, stated and not hidden.** The baseline worktree did not run `npm ci`. Instead it got a
symlink to this worktree's `node_modules`. `package.json` and `package-lock.json` are both OUTSIDE the
changed set, so they are byte-identical at base and head, and the dev toolchain is therefore the same
set the lockfile pins. The substitution avoided a network install and did not change which binaries
ran. The baseline `lint:md` printed `Linting: 1340 files`; HEAD printed `Linting: 1342 files` (this
feature's two new markdown artifacts).

## Verdict (deterministic — `pharn/floor/check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

The residual, named: this stage catches exactly what its suite catches, nothing more. A regression that
no test, rule, eval or style gate covers is invisible to it. The claim is limited to the exit-code
comparison above, never "nothing broke".
