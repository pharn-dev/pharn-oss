# SHIP — neutral-test-results

`/pharn-dev-ship` (gated mode). The request: "add Jest or a stable neutral results format — without it a large
share of React/Next.js projects drops out on the first run; lean towards a framework-agnostic format".

## Where the run ended

**GATE 2.** Every stage ran, in order:

1. `/pharn-dev-plan`
2. GATE 1
3. `/pharn-dev-grill`
4. `/pharn-dev-build`
5. `/pharn-dev-regress`
6. `/pharn-dev-verify`
7. `/pharn-dev-review`
8. GATE 2

At GATE 2 the human chose **"Fix, then commit + PR"**. What followed, recorded below:

- a fix round;
- a re-run of every verify gate;
- a commit;
- the lesson promotion;
- a merge of `origin/main`, which had moved during the run.

## The two human gates

- **GATE 1 (plan acceptance):** answered by the human in an interactive form. They chose the format option
  **A — `jest-json` + `pharn-json`** and **"Approve as written"**. Not delegated.
- **GATE 2 (post-review decision):** answered by the human in an interactive form, **"Fix, then commit + PR"**.
  Not delegated. `/pharn-dev-ship` itself merges nothing and applies no seal.

## Structural verdicts, verbatim

| stage                | verdict read                           | value                                                                     |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit          | `0` (GREEN)                                                               |
| `/pharn-dev-build`   | `node pharn/floor/validate.mjs .` exit | `0` (`FLOOR: GREEN — 36 capabilities`)                                    |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`    | `"no-regressions"`                                                        |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`        | `"PASS"`. It was PASS before the fix round too; the file holds the re-run |

After the merge of `origin/main`, every `npm run check` gate was re-run over the merged tree:

- exit 0: `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`,
  `check:contributing`, `validate` and `test` (3337 tests, 0 fail, 3 skipped for the missing local toolchain);
- exit 0: `check:changelog-entry`, against the new merge-base `5699716`;
- **`check:reconcile` is RED locally, and expected.** All 10 of its escapes are files PR #275 changed on `main`,
  which `git merge` wrote and the build's epoch cannot attribute. By set difference, none is this increment's.
  CI has no baseline and reads `NO_BASELINE`. The baseline was not edited.

## Pointers

- `REVIEW.md` — 0 floor-gate findings, 10 advisory. Both important findings and every minor one was fixed at GATE 2,
  except the sweep miss in `gate-run-core.mjs`, which was bounded rather than removed.
- `GRILL.md` — 9 advisory concerns; 7 adopted at build.
- `REGRESSION.md` and `VERIFY.md` — how the gates ran under the worktree guard. Disposable Node runners
  recorded exit codes from `spawnSync`, and base and head ran in symmetric clean copies. That is advisory
  orchestration, stated there as a deviation.

## Recorded lines

changelog-entry: exit 0

It was re-run after the fix round's CHANGELOG edits and again after the merge, and was `0` each time.

lesson: promoted L62

The human chose Promote at 2b.3 and Accept & write at the promote gate. `check-provenance.mjs` was GREEN as L61.
The entry was then renumbered L62 when merging `origin/main`, whose PR #275 had promoted a different L61 first. It
was re-checked GREEN as L62 against `main`'s canon. The id is read from the `## L62` heading in
`.dev/memory-bank/lessons-learned.md`.

deferred:

- A stricter adapter added beside a lenient one that already accepts the same input protects no existing user
  (REVIEW.md, the second important finding). This is not carried to promotion: it is one instance, and its remedy is
  the named follow-up `vitest-json-refuses-jest-shape`.

## Named follow-ups (not built)

- `vitest-json-refuses-jest-shape`
- `vitest-retry-pass-detect`
- `test-infra-pin-package-jest-key`
- `pharn-json-reference-producers`

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate.
