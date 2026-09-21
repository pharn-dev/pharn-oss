# REGRESSION — loop-cost-ledger

**Base:** `a3ecc48` (`fix(floor): locate the cost-record transcript by session id …`, 6.4.3)
**Head:** `8dacaa9` (`add skills`)
**Verdict (FLOOR, `pharn/floor/check-regress.mjs verdict`, exit 0): `no-regressions`**

## The unusual condition this run handled, stated rather than worked around

The increment was **committed to `main` by the human mid-build** (`8dacaa9`, 24 files, already on
`origin/main`), so the working tree is **clean** and the whole increment sits between the base and HEAD.
That makes `--base a3ecc48` the correct and only meaningful comparison here: an auto-detected base would
have taken the `git status --porcelain` branch, resolved `base = HEAD`, and produced an **empty diff** —
a vacuously green run that measured nothing (**L34**'s shape: a per-item comparison over an empty domain
is true for free). The base was therefore passed explicitly and the diff confirmed non-empty (24 paths)
before any gate ran.

## Partition (deterministic — `check-regress.mjs scope`, exit 0)

| set                  |  n  | note                                                                          |
| -------------------- | :-: | ----------------------------------------------------------------------------- |
| `inside`             | 24  | every path the increment changed; all 24 matched the PLAN's `## Files`        |
| `outside_tests`      | 80  | the test universe (83) minus this feature's own three suites                  |
| `outside_eval_pairs` |  1  | `expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json` |
| `escaped`            |  0  | **no path changed outside the declared writes**                               |
| `escape_exempt`      |  0  | nothing needed exempting                                                      |

`escaped: 0` is the load-bearing line: it says the 24 committed paths are exactly the set the approved
plan authorized — including the three in-flight `## Files` corrections the build recorded, each of which
was declared **before** the write rather than rationalized after.

## Gates — identical set at both sides, exit codes only

**The style gates RAN; they were not skipped.** The skip rule is deterministic: run them only if
`inside` touches a shared style config. `.prettierignore` **is** in `inside` (the increment adds the
`cost.json` and fixture exemptions), so a style flip over outside files is no longer provably impossible
and the gates are mandatory. That cost an `npm ci` in the baseline worktree — the named cost, incurred
exactly when the rule says it must be.

| gate                                    | base (`a3ecc48`) | head (`8dacaa9`) | flip |
| --------------------------------------- | :--------------: | :--------------: | :--: |
| `tests` (80 outside suites)             |        0         |        0         |  —   |
| `validate`                              |        0         |        0         |  —   |
| `structural:expected-injection-comment` |        0         |        0         |  —   |
| `lint`                                  |        0         |        0         |  —   |
| `format:check`                          |        0         |        0         |  —   |
| `lint:md`                               |        0         |        0         |  —   |

`regressions[]`: **empty**. `pre_existing[]`: **empty**.

## Input-capture discipline (L5 / L16 / L21 / L22)

- The 80-path test list was expanded through the **pinned** `cat outside-tests.txt | xargs node --test`
  form. Neither wrong form was used: `node --test $LIST` (zsh does not word-split, so the list arrives
  as one bogus argument) and `xargs -a` (GNU-only; BSD `xargs` rejects it outright) each exit 1 at
  **both** sides, which `check-regress.mjs` would classify `pre_existing` — evading a false alarm while
  **masking a real one**.
- **All 80 outside test paths were confirmed to exist at the base** before the gate ran (`missing: 0`),
  so a `Could not find …` could not be recorded as a test result.
- **The eval-pair paths were confirmed readable at both sides** before their exit code was recorded. A
  guessed filename here produces an `ENOENT` red that is equal at base and head — the exact
  masking failure L21 records, from the exact file whose committed name is
  `expected-injection-comment.json`, not `injection-comment.json`.
- **The baseline came back all-green**, which is the expected state for a merged commit and therefore
  needed no investigation. A red baseline on a believed-green repo is a signal to investigate the
  harness, never a number to record.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

**The honest residual (P0/P7), and it is not a formality here.** `/pharn-dev-regress` catches **exactly
what its suite catches — nothing more.** Six gates over 80 outside suites is what was measured; a
regression no deterministic check covers is invisible to it. This says **nothing** about whether the
increment is good, whether the cost ledger is correct, or whether the numbers it emits are meaningful —
only that nothing outside the feature that a gate can see flipped pass→fail.

**Two things this stage does NOT certify, worth naming because the commit already landed on `main`:**
the feature's own three suites are **inside** and therefore not part of this comparison (they are
`/pharn-dev-verify`'s gate map, next), and no review lens has read the diff yet. A green regress on an
already-pushed commit is reassurance, not the post-review gate.
