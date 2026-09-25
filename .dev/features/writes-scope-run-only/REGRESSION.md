# REGRESSION — writes-scope-run-only

- base: `767bf61f493f73c859a9820a01bddcb8f4f40a8d` (`git merge-base HEAD origin/main` — the phase branch's
  fork point from `main`, per the ship run's own base for this phase; not `HEAD`, so the comparison covers
  the whole phase — `PLAN.md` + `GRILL.md` + this build's own writes — not just the uncommitted tail)
- inside (35 paths, this phase's own changes): 11 product `.claude/commands/*.md`, 3 hook test files
  (`.claude/hooks/*.test.cjs`), `.dev/floor/command-hygiene.test.mjs`, this feature's own pipeline artifacts
  (`PLAN.md`, `GRILL.md`, `BUILD.md`, `proposed/*` — the last two exempted from the escape check by
  `--feature`, the first two by the same exemption), `CHANGELOG.md` / `CLAUDE.md` / `README.md` /
  `SKILLS_VERSION`, `pharn/floor/README.md`, the two edited `pharn/floor/*.mjs` checkers + their tests, and
  the two edited `pharn/pharn-contracts/*.md`. **`escaped: []`** — nothing changed outside the plan's
  declared `## Files` (`BUILD.md`/`GRILL.md` are the only two the `--feature` exemption had to cover, and
  it did).
- outside gates run (style gates SKIPPED — `inside` touches no shared style config: no
  `eslint.config.mjs` / `.prettierrc.json` / `.prettierignore` / `.markdownlint-cli2.jsonc`):

  | gate                                                                                               | base | head |
  | -------------------------------------------------------------------------------------------------- | ---- | ---- |
  | `tests` (98 outside `*.test.mjs`/`*.test.cjs` files, run as one argv array — never a shell string) | 0    | 0    |
  | `validate` (`pharn/floor/validate.mjs .`, whole-repo)                                              | 0    | 0    |
  | `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`         | 0    | 0    |

- `regressions`: **none**
- `pre_existing`: **none**

## REGRESSIONS: none — no deterministically-detectable breakage outside the feature

Every outside gate this run's deterministic suite covers was GREEN at the phase's base commit and is
still GREEN at HEAD (working tree, uncommitted). `check-regress.mjs verdict` exited **0**
(`"verdict": "no-regressions"`).

**The honest residual, stated per this stage's own contract, not silenced by the green result:**
`/pharn-dev-regress` catches exactly what its suite catches — a deterministically-detectable flip
pass→fail, nothing more. It does not certify "nothing broke"; it certifies that the outside gates it ran
did not flip. The 22 test failures this phase DOES introduce are all **inside** the declared scope (the
new/changed hook and product-floor test files this build wrote or edited, asserting the patched write
guard's behaviour against the still-unpatched, human-only hooks) — they are `/pharn-dev-verify`'s designed
STOP, not a regression: none of the 98 files this stage classified as **outside** the feature's scope are
among them, and this report's own `tests` gate (0 → 0) is the deterministic confirmation of that
boundary, not an assertion resting on this stage's own judgment.
