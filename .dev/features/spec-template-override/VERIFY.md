# VERIFY — spec-template-override

**VERIFIED: floor gates PASS** — `check-verify.mjs` exit 0 over the gate map in `verify-report.json`, captured from a
byte-copy of the working tree without other sessions' worktrees. The **raw** capture in the working tree itself
FAILS on `format:check`, `lint:md` and `test`. Every one of those failures is in `.claude/worktrees/`, which holds
three other Claude sessions' checkouts, and none is in this repository's files. Both are recorded below, and the
choice between them is stated as the orchestration decision it is.

## The verdict's input (clean copy of the working tree)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 2914 pass, 0 fail, 0 skipped)                                          | 0    |
| `validate` (`pharn/floor/validate.mjs .`, 36 capabilities)                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`, in the working tree)  | 0    |

**How it was captured.** The tree was `rsync`ed to a scratch directory, excluding `node_modules` (symlinked back),
`.git`, `.pharn` and `.claude/worktrees`. It was committed to a fresh repo, and the six non-reconcile gates ran
there with the same commands this stage prescribes. `reconcile` ran in the real working tree, because it needs the
build's baseline under `.pharn/`. Its verdict is `CLEAN`: 4 paths reconciled, `escapes: []`. The epoch is the one
`apply.sh` re-anchored after the human-applied hook commit, so it covers apply→verify. The build epoch was judged
once, `CLEAN`, by `apply.sh`'s opening checkpoint.

## The raw capture (working tree, as prescribed)

| gate           | exit | cause                                                                                                                                                                  |
| -------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test`         | 1    | one test, `style: a spliced README passes the repo's prettier and markdownlint unchanged`, whose markdownlint run from the repo root also lints `.claude/worktrees/**` |
| `format:check` | 1    | every `[warn]` path is under `.claude/worktrees/` (0 outside)                                                                                                          |
| `lint:md`      | 1    | every error is under `.claude/worktrees/` (0 outside)                                                                                                                  |
| all others     | 0    | —                                                                                                                                                                      |

`check-verify.mjs` over the raw map: `FAIL`, `failing_gates: ["format:check", "lint:md", "test"]` (exit 1).
`.claude/worktrees/` is excluded from git locally (`.git/info/exclude`), so CI never sees it. The follow-up task
"Scope markdownlint --fix to named files only" covers the lint-config side of this.

## Verifiers (advisory)

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

## Coverage (reported, not a gate)

`node --test --experimental-test-coverage pharn/floor/check-spec.test.mjs`:

- `spec-template-core.mjs`: 100% lines, 100% branches, 100% functions;
- `check-spec.mjs`: 90.56% lines. This is a LOWER bound. Spawned children do inherit `NODE_V8_COVERAGE`, but the
  project-template tests run COPIES of the checker in scratch installs, and a copy's coverage is credited to its
  temp path, not to this file. The two `O_NOFOLLOW` / `fstat` branches are reachable only by a race and are
  untested by design.

## What this verdict is

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates check.
Verifier concerns are advisory help, not assurance. The environment choice above is orchestration and
ADVISORY: the floor verdict is `check-verify.mjs` over the map it was given.

## Iteration 2 — after the GATE 2 fix round

**VERIFIED: floor gates PASS** again, from a clean capture made the same way. All seven gates are 0; `npm test`
passes 2918/2918 with 0 skipped. `reconcile` ran in the working tree and is `CLEAN`: 9 paths reconciled, no
escapes; the epoch is the one `apply.sh` anchored. `check-verify.mjs` exit 0, and `verify-report.json`'s floor
fields are unchanged. The raw working-tree capture was not repeated: the sibling worktrees behind iteration 1's
raw FAIL are still present, and the raw result would repeat for that reason.

Coverage after the fix round (`node --test --experimental-test-coverage pharn/floor/check-spec.test.mjs`) is in
SHIP.md.
