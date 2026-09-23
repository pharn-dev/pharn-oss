# VERIFY — changelog-per-pr

This is iteration 5, run after R7 (a pre-existing, time-bombed hook test fixed and declared) and the Step-2b
promotion of L55. Iterations 1–4 were also PASS, over the earlier tree. All five ran at HEAD, on the working tree with the increment
in it (branch `feat/changelog-per-pr`, base `392817f`).

## FLOOR layer — the verdict

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 2774 tests, 2774 pass)                                                 | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `changelog-entry` (`node .dev/floor/check-changelog-entry.mjs --base-ref origin/main`)     | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0    |

**VERIFIED: floor gates PASS** — `check-verify.mjs` exit 0, `failing_gates: []`. `verify-report.json` carries
the helper's fields verbatim, with the advisory `verifiers` block appended.

Notes on the gate set, which this command composes (the set is advisory orchestration; the verdict over it
is floor):

- **`changelog-entry`** is an addition for this increment. It is the brief's own acceptance command, run
  literally against the tip of `origin/main` (still `392817f`, so the tip and the merge-base agree). It
  reported two new entries (the feature's and R7's), and no merged entry or released heading changed.
- **`reconcile`** reported `CLEAN`:
  - epoch anchored by `/pharn-dev-build`, with its scope amended once per fix round, then for the promote step's canon target, then for R7's 17-path plan;
  - 18 paths reconciled, `.dev/memory-bank/lessons-learned.md` among them — accounted for by the promote
    command's own scope amendment;
  - `escapes: []`;
  - exempted: this feature's pipeline artifacts, plus `docs/lessons-index.md` (the promote command's
    declared Step-6b Bash write).
- **One slip, disclosed here and detected clean.** During the fix round, a Prettier run was aimed at the
  `.dev/floor/*.mjs` glob — wider than this plan's scope, the Bash-write shape L19 names. `git status`
  showed no undeclared file changed, because the other checkers were already Prettier-clean. This gate
  confirms it independently: `.dev/floor/*` is always reconciled, and no escape was reported.
- **`test`** includes the increment's three suites, 198 tests in all (44, 84 and 70):
  - `changelog-core`: the grammar, including the probe shapes from all three reviews as fixtures;
  - `check-skills-version-recorded`;
  - `check-changelog-entry`, which also executes the committed CI `run:` block, in a repo prepared the way
    actions/checkout prepares one, with a negative control.

Coverage over those three suites, via `node --test --experimental-test-coverage`:

| module                              | line % | branch % |
| ----------------------------------- | ------ | -------- |
| `changelog-core.mjs`                | 100.00 | 100.00   |
| `check-skills-version-recorded.mjs` | 100.00 | 98.15    |
| `check-changelog-entry.mjs`         | 100.00 | 99.17    |

## ADVISORY layer — verifiers

No verifiers are registered (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`), so the floor gates
decided alone.

## Residual

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check.
In particular, three things are not verified here:

- that the per-PR step behaves on GitHub's runner as it does in the local executed test; only this PR's CI
  run settles that;
- that the new CHANGELOG rules are the right rules;
- that any CHANGELOG entry describes its change.

Verifier concerns would be advisory help, not assurance.
