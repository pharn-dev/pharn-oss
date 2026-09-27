# REGRESSION — write-guard-narrowing

- stage: `/pharn-dev-regress` — opus (`claude-opus-5-5`), by the maintainer's instruction for this batch, not a
  `pharn.config.json` route; effort not routed
- run: before the human applies `proposed/human-only.patch`, which is the order `PLAN.md`'s chain sequencing sets
  (regress before the apply). The working tree carries the build uncommitted.
- base: `70cb51c8f3f7c1a3405b651106bc35f244948da9` — `HEAD`, because `git status --porcelain` was non-empty (a
  working-tree dogfood build; Step 1's first rule).
- inside: 15 paths, this increment's own changes:
  - the two hook test files, `pharn/floor/run-marker.mjs`, `pharn/floor/README.md`, `CHANGELOG.md`, `CLAUDE.md`,
    `README.md` and `SKILLS_VERSION`;
  - the feature's `PLAN.md`, `GRILL.md` and `BUILD.md`, and the four `proposed/` files.

  `check-regress.mjs scope` (`--feature write-guard-narrowing`) partitioned them:
  - **`escaped: []`**: nothing changed outside the plan's declared `## Files`.
  - `escape_exempt` lists exactly `GRILL.md`, the one feature artifact `## Files` does not name.
  - `handoff/` is not in the diff: it was added and deleted inside the build.

- outside gates run. The style gates were SKIPPED: `inside` touches no shared style config (`eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`), which the runner asserts.

  | gate                                                                                           | base | head |
  | ---------------------------------------------------------------------------------------------- | ---- | ---- |
  | `tests` (120 outside `*.test.mjs` / `*.test.cjs` files, one argv array — never a shell string) | 0    | 0    |
  | `validate` (`pharn/floor/validate.mjs .`, whole-repo)                                          | 0    | 0    |
  | `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`     | 0    | 0    |

- `regressions`: **none**
- `pre_existing`: **none**
- how it ran: the command's Steps 1–3 as one node runner (`.pharn/pharn-dev-regress/run-regress.mjs`, scratch),
  with argv arrays. This isolated worktree refuses the pinned `xargs` and `$(… | paste -sd, -)` forms, so the runner
  passes the same lists as argv arrays and hands the helper the same comma-joined values. The eval-pair paths were
  checked readable on both sides before their exit codes were recorded. The base checkout was a detached worktree
  under the OS temp directory, removed — with its temp directory — before the verdict ran. The verdict is
  `check-regress.mjs verdict`'s own, and `regression-report.json` is its stdout byte for byte (`cmp`).

## REGRESSIONS: none — no deterministically-detectable breakage outside the feature

`check-regress.mjs verdict` exited **0** (`"verdict": "no-regressions"`). Every outside gate was GREEN at the base
and is still GREEN at HEAD.

**The honest residual:** `/pharn-dev-regress` catches exactly what its suite catches: a deterministically detectable
pass→fail flip outside the feature, nothing more. It does not certify that nothing broke. This increment expects 30
tests to fail before the human apply. They assert the patched guards against the still-unpatched hooks, and all 30
sit in the two hook test files, which are **inside** the declared scope — so they are `/pharn-dev-verify`'s designed
STOP, not regressions. None of the 120 outside files is among them, and this report's own `tests` gate (0 → 0)
confirms that deterministically.
