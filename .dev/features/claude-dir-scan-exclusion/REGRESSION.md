# REGRESSION — claude-dir-scan-exclusion

**Base:** `4bd1b0c` (working-tree dogfood — `git status --porcelain` was non-empty, so the base auto-resolved
to `HEAD` by the deterministic state test, not by choice). **Branch:** `feat/claude-dir-scan-exclusion`.

## Partition

`check-regress.mjs scope` — not a judgment call — returned **53 inside**, **71 outside tests**,
**1 outside eval pair**, **0 escaped**.

Two paths were exempted and both are reported rather than dropped:
`.dev/features/claude-dir-scan-exclusion/PLAN.md` and `GRILL.md` — this feature's own pipeline artifacts,
written by their own stages under their own Step-0 scopes, exempted by `--feature` exactly as designed.

### The `--declared` input needed correcting, and that is a TOOLING GAP worth reading

The first `scope` run **exited 1** with a blocking fix#7 finding naming **37 escaped paths** — every
regenerated file under `docs/`. It was a **false breach**, and the mechanism is structural rather than a
slip in this build:

- The plan **does** declare those files, in its `### Regenerated (Bash, OUTSIDE fix #7 — L19)` section.
- `set-writes-scope.cjs --from-plan` **deliberately stops at that heading**, because those files must NOT
  enter the writes-scope: the generator writes them through Bash, and putting them in the hook's allowlist
  would imply the gate covered them — precisely what **L19** says not to pretend.
- Passing that same parse as `--declared` therefore makes **every generated artifact look like an escape**.
  The two subcommands ask different questions ("what should the hook allow" vs "what did the plan
  authorize") and share one parser.

`--declared` is an argument this stage supplies, so it was re-derived from the plan's **own** `### Regenerated`
text (`docs/capabilities/*.md`, `docs/lessons-index.md`) rather than hand-picked, and `scope` then exited **0**
with `escaped: []`. **Recorded, not buried:** this is a deviation from the literal step, its justification is
the two-questions-one-parser conflict above, and the deterministic remedy belongs to `check-regress.mjs`
(an exemption for paths a plan declares as generated), not to this increment. Surfaced for GATE 2.

## Gate set (identical at base and head, decided once)

Style gates were **skipped** by the deterministic config-touch rule: `inside` touches none of
`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`. Over files that are
byte-identical on both sides, a style flip is provably impossible, so the gates are absent from **both** maps.
(`package.json` changed, but it is not a style config — and the `tests` gate invokes `node --test` directly,
never `npm test`, so the narrowed glob cannot influence this comparison.)

| gate                                    | base | head | result |
| --------------------------------------- | ---- | ---- | ------ |
| `tests` (71 outside test files)         | 0    | 0    | —      |
| `validate` (whole-repo)                 | 0    | 0    | —      |
| `structural:expected-injection-comment` | 0    | 0    | —      |

**regressions[]:** none · **pre_existing[]:** none

### One deviation in HOW the tests gate was invoked

The step pins `cat outside-tests.txt | xargs node --test`, and this worktree-isolated session **refuses to
run that form** (the harness cannot verify what `xargs` appends). It was replaced by a fixed runner script
that reads the list and spawns `node --test` with an **explicit argv array**. The purpose is identical and the
guarantee is **stricter**: no shell word-splitting occurs at all, so both failure modes **L5**/**L16** name —
an unquoted `$LIST` under zsh, and GNU-only `xargs -a` — are structurally absent rather than merely avoided.
The runner also **exits 2 on an empty list** rather than recording a vacuous `0` (**L34**).

The eval-pair paths were confirmed readable **before** their exit codes were recorded, per the step's own
warning: a mistyped path makes `check-structural.mjs` exit 1 **equally at base and head**, which classifies
as `pre_existing` and masks a real structural-gate red.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
`check-regress.mjs verdict` exit **0**, `"verdict": "no-regressions"`.

**The honest residual (P0):** this catches exactly what its suite catches — nothing more. A regression no
deterministic check covers is invisible here. The claim is "deterministically-detectable breakage outside the
feature is caught", **never** "nothing broke". And the verdict certifies **the comparison**, never the feature:
`/pharn-dev-regress` did not evaluate whether this increment is correct, only that what was green outside it is
still green.
