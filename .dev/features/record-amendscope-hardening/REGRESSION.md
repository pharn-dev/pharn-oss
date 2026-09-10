# REGRESSION — record-amendscope-hardening

Human render of `regression-report.json`. **The verdict below is the helper's, not this document's** —
`pharn/floor/check-regress.mjs verdict` compares exit codes; zero LLM judgment enters the core.

## Verdict

**`no-regressions`** — exit **0** → proceed to `/pharn-dev-verify`.

## Base

`c338b9d`. Resolved by the command's own rule: `git status --porcelain` was non-empty (a working-tree
dogfood build), so `base = HEAD`. The baseline was materialized as a detached worktree at that immutable
SHA and removed afterwards — non-destructive, and reproducible from the SHA alone.

## Scope partition

`check-regress.mjs scope` exited **0** with **`escaped: []`**.

| bucket          | contents                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| `declared`      | `SKILLS_VERSION`, `CHANGELOG.md`, `README.md` — the plan's `## Files`, verbatim |
| `inside`        | those three, plus this feature's own `PLAN.md` and `GRILL.md`                   |
| `escaped`       | **empty**                                                                       |
| `escape_exempt` | `.dev/features/record-amendscope-hardening/{PLAN,GRILL}.md`                     |
| `outside_tests` | 76 suites                                                                       |
| eval pairs      | none outside                                                                    |

The two exempted artifacts are read, not waved through: each was written by its own stage under that
stage's own Step-0 writes-scope, which is exactly the `--feature` exemption L17/L20 put on the floor
rather than leaving to by-hand `--changed` filtering.

## Gates run (identical set at base and head)

| gate       | base | head | flip |
| ---------- | ---- | ---- | ---- |
| `tests`    | 0    | 0    | none |
| `validate` | 0    | 0    | none |

**Style gates were skipped at BOTH sides, deterministically and not as a shortcut.** The rule is a
membership test: run `lint` / `format:check` / `lint:md` only if `inside` touches a shared style config
(`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`). `inside` touches
none, so over the outside files — byte-identical on both sides — a style flip is provably impossible. The
gate is absent from **both** maps, which is what keeps `check-regress.mjs` from calling the difference a
gate-set mismatch.

The 76-suite list was expanded through the command's **pinned** form
(`cat outside-tests.txt | xargs node --test`), not an improvised equivalent — the two wrong forms L5/L16
record (`node --test $LIST` under zsh; GNU-only `xargs -a`) each fabricate a red that is equal at base and
head and therefore launders into `pre_existing`, masking a real regression rather than raising a false
one.

## Honest bounds (P0)

- `validate` is whole-repo, not scoped to the outside set — a named granularity limit, unchanged here.
- A `no-regressions` verdict says **no outside gate flipped pass→fail**. It says nothing about whether
  this increment is correct, and nothing about gates that were already red at base (`pre_existing` is
  empty this run, so the question does not arise).
- The one detection the `--feature` exemption gives up is on record in `check-regress.mjs`'s own
  honest-scope block: a build that rewrites its `PLAN.md` `## Files` to retroactively authorize a path it
  wrote is not caught here. **This run's `PLAN.md` IS in the diff, so the obligation applies and was
  discharged by reading the diff** — its `## Files` gained back-ticks around three already-listed paths
  (the setter refuses bare paths) and named no new path. The parsed scope was re-derived after that edit
  and returned exactly 3 entries, matching the three bullets.
