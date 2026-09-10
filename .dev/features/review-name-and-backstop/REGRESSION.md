# REGRESSION — review-name-and-backstop

**Base:** `8bc6c0a` (`docs: polish README positioning (#189)`). Resolved by the deterministic state test,
not chosen: `git status --porcelain` was non-empty (a working-tree dogfood build), so `base = HEAD`.

## Partition (from `check-regress.mjs scope`, exit 0 — no scope breach)

- **inside** (7 paths): the 5 the PLAN's `## Files` declared, plus this feature's own `PLAN.md` and
  `GRILL.md`.
- **`escape_exempt`** (read, not assumed): `.dev/features/review-name-and-backstop/GRILL.md`,
  `.dev/features/review-name-and-backstop/PLAN.md` — each written by its own stage under that stage's own
  Step-0 scope.
- **`escaped`: `[]`** — the build wrote nothing outside its declared `## Files`.
- **outside_tests:** 69 (every `*.test.mjs` / `*.test.cjs` except `.dev/floor/command-hygiene.test.mjs`,
  which is inside). **outside_eval_pairs:** 1.

## Gates — `base → head` exit codes

| gate                                      | base | head | result  |
| ----------------------------------------- | ---- | ---- | ------- |
| `tests` (69 outside test files)           | 0    | 0    | no flip |
| `validate` (`pharn/floor/validate.mjs .`) | 0    | 0    | no flip |
| `structural:expected-injection-comment`   | 0    | 0    | no flip |

**Style gates (`lint` / `format:check` / `lint:md`) were SKIPPED** by the deterministic config-touch rule:
`inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
`.markdownlint-cli2.jsonc`, so a style flip over byte-identical outside files is provably impossible. They
are absent from **both** maps, so the gate sets match and the verdict is not inconclusive.

- `regressions[]`: **none**
- `pre_existing[]`: **none**

## Verdict (FLOOR — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

The verdict is a deterministic exit-code comparison; no model judgment entered it. What entered model
judgment is the **orchestration** — choosing the base, partitioning, running the suite — and that is
advisory.

## Honest residual, and one asymmetry worth naming (P0)

`/pharn-dev-regress` catches **exactly what its suite catches — nothing more.** A regression no
deterministic check covers is invisible here. This increment's subject matter makes that bound unusually
relevant: the change is largely **command prose**, and no gate in this repo reads a `/pharn-*` command's
prose for truth — `validate.mjs` excludes `.claude/commands/` entirely. The one exception is the new
corpus rule in `command-hygiene.test.mjs`, which is **inside** the feature and therefore not an outside
gate here; it was exercised separately at build (54/54 pass, plus three mutations proven to fail).

**Asymmetry, stated rather than smoothed over.** The baseline worktree had no `node_modules` (the core
gates are stdlib-only and need none), so
`.dev/floor/capability-catalog-core.test.mjs`'s `style: a spliced README passes the repo's prettier and
markdownlint unchanged` **self-skipped at base** while it **ran at head** (`npm ci` had been run in the
working tree). The gate-**id** set is identical on both sides, so the comparison is valid and not
inconclusive — but the `tests` gate covered strictly **more** at head than at base. That is the safe
direction (a head-only red would have surfaced as a regression, never hidden), and it is the direction
that matters here, since that test is the single most relevant one for this increment's `README.md` badge
edit. It passed at head. Recorded because a self-skipping test is invisible to `PASS iff exit 0` — the
corroborating instance L37 names.
