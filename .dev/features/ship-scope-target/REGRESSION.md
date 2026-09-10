# REGRESSION — ship-scope-target

**Base:** `ab9aabdf5ea5177713bda2fee82c7220ec559a7c` (`chore(deps-dev): bump globals from 17.11.0 to
17.12.0`), auto-resolved by the deterministic state test: `git status --porcelain` was non-empty (a
working-tree dogfood build), so `base = HEAD`.

**Verdict (FLOOR):** `no-regressions` — `pharn/floor/check-regress.mjs verdict` exit **0**.

## Inside / outside partition (computed by the floor helper, not by judgment)

`check-regress.mjs scope` exit **0**, `escaped: []` — the build did **not** escape its declared
`## Files`. Seven changed paths, all inside:

| path                                       | how it is authorized                            |
| ------------------------------------------ | ----------------------------------------------- |
| `.claude/commands/pharn-ship.md`           | plan `## Files`                                 |
| `.dev/floor/command-hygiene.test.mjs`      | plan `## Files`                                 |
| `SKILLS_VERSION`                           | plan `## Files`                                 |
| `README.md`                                | plan `## Files`                                 |
| `CHANGELOG.md`                             | plan `## Files`                                 |
| `.dev/features/ship-scope-target/PLAN.md`  | `escape_exempt` — written by `/pharn-dev-plan`  |
| `.dev/features/ship-scope-target/GRILL.md` | `escape_exempt` — written by `/pharn-dev-grill` |

The two exempt entries are this feature's own stage artifacts, each written under **its own** stage's
Step-0 writes-scope — the `--feature ship-scope-target` exemption `.dev/memory-bank/lessons-learned.md`
**L17** documents and **L20** demanded be given a floor check (cited, not restated — P4). They were read
from the returned `escape_exempt`, not assumed.

**Outside surface measured:** 69 test files (the full universe of 70 minus
`.dev/floor/command-hygiene.test.mjs`, which is inside) + `validate` + 1 committed eval pair.

## Gate table — `base → head`

| gate                                                                                       | base | head | flip |
| ------------------------------------------------------------------------------------------ | ---- | ---- | ---- |
| `tests` (69 outside test files)                                                            | 0    | 0    | none |
| `validate` (`pharn/floor/validate.mjs .`)                                                  | 0    | 0    | none |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    | none |

`regressions[]`: **empty**. `pre_existing[]`: **empty**.

**Style gates (`lint` / `format:check` / `lint:md`) were SKIPPED at both base and head**, by the
deterministic skip rule: `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`,
`.prettierignore`, `.markdownlint-cli2.jsonc`, so an outside style result could not flip. They are
absent from **both** maps, so the gate sets match and the comparison is not inconclusive. (They were
nevertheless run repo-wide at build Step 2b and were clean — that is a build confirmation, not an input
to this verdict.)

## Two orchestration notes worth recording

**1. The pinned `xargs` form could not be run, and the substitute is stated rather than hidden.** This
command pins `cat outside-tests.txt | xargs node --test` and warns against improvising an equivalent —
correctly, because the two known wrong forms (an unquoted `$LIST` under zsh; GNU-only `xargs -a`)
**fabricate a red** that is equal at base and head and therefore gets classified `pre_existing`,
masking a real failure (**L5** / **L16** / **L22**). This sandbox refused the pinned form outright. The
substitute is a Node runner that passes the test list to `spawnSync` as an **explicit argv array**,
which removes shell word-splitting from the path entirely — strictly safer on the exact axis those
lessons name, and structurally incapable of the fabricated red they describe. The same runner was used
at base and at head, so both sides ran identical code.

**2. A setup error failed loudly as a setup error, exactly as the command requires.** The first baseline
run aborted with `ENOENT: … outside-tests.txt` because the list file had not been copied into the
baseline worktree. It exited **1 from the runner**, not as a gate exit code, so no fabricated `tests: 1`
ever reached a results map. The eval-pair readability probe (`existsSync` on both halves before
recording `structural:`) is the same discipline pre-applied, and it passed at base — the guard **L5** /
**L21** prescribe against the `expected-injection-comment.json` path trap.

## Honest residual (P0)

`/pharn-dev-regress` catches **exactly what its suite catches — nothing more.** `no-regressions` means
_no deterministically-detectable breakage outside the feature_; it does **not** mean nothing broke. This
increment's own change is almost entirely **command prose**, and nothing in this repo reads command
prose for truth — `validate.mjs` deliberately ignores `.claude/commands/`. So the gates above could not
have detected a wrong `--target` value, a setter call placed after its write, or a prose correction that
is false. Those are advisory concerns for `/pharn-dev-review` and the human, and the two new hygiene
rules narrow only the first of them (a missing flag), never the other two.

**Two clocks:** the **verdict** is floor-grade (an exit-code comparison, zero LLM judgment). Choosing the
base, partitioning inside/outside, and running the suite are **advisory orchestration** — including the
runner substitution above.
