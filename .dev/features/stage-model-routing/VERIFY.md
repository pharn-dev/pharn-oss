# VERIFY — stage-model-routing

## After the human apply at GATE 2 (2026-09-27)

- **Run:** on the committed tree at `0344ff1` — the maintainer's human apply of `proposed/human-only.patch`
  (`LIMITS.md` only) over the GATE-2 fixes `5bf6b18` — after `/pharn-dev-regress` (`no-regressions`, base `008b24b`),
  with the plan's scope re-set and the baseline re-anchored (`--by stage-model-routing-after-apply`) right after the
  apply commit, per `proposed/APPLY.md`. Stage model: opus — set by the maintainer's instruction, overriding
  pharn.config.json; routed via Agent subagent; effort not routed.

**VERIFIED: floor gates PASS.** Verdict `PASS` (`check-verify.mjs`, exit 0; the `feature` / `gates` / `verdict` /
`failing_gates` fields of `verify-report.json` are its stdout verbatim — this run's fields equal the committed
report's, so the file is unchanged).

### Gates (exit codes)

| gate                                                                 | exit |
| -------------------------------------------------------------------- | ---- |
| `test` (`npm test` — 3864 tests, 3864 pass, 0 fail)                  | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                       | 0    |
| `lint` (`npm run lint`)                                              | 0    |
| `format:check` (`npm run format:check`, whole repo)                  | 0    |
| `lint:md` (`npm run lint:md`, whole repo)                            | 0    |
| `structural:…/expected-injection-comment.json` (`check-structural`)  | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) | 0    |

`failing_gates: []`.

**`reconcile`:** `CLEAN` over the epoch anchored after the apply commit (`stage-model-routing-after-apply`). 0 paths
needed reconciling; exempted by name as pipeline artifacts: this run's `REGRESSION.md` and `regression-report.json`.
The apply is a git commit made by the maintainer, so it sits in the baseline, not in the window.

**How the gates were run (orchestration — advisory):** as in the run below — one Bash call per gate, exit codes only,
the regress scratch removed first so no scratch `.mjs` sat under `.pharn/` when `eslint .` ran.

### Verifiers (advisory)

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.

## GATE-2 FIX round (2026-09-27)

- **Run:** on the working tree the round left — HEAD `1b4158e` (`REVIEW.md`) plus the uncommitted A1–A8 and A10
  fixes — after `/pharn-dev-regress` (`no-regressions`, base `008b24b`), with the plan's scope re-set and the
  baseline re-anchored (`--by stage-model-routing-gate2`) before any fix was written. Stage model: opus — set by the
  maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed.

**VERIFIED: floor gates PASS.** Verdict `PASS` (`check-verify.mjs`, exit 0; the `feature` / `gates` / `verdict` /
`failing_gates` fields of `verify-report.json` are its stdout verbatim — this run's fields equal the committed
report's, so the file is unchanged).

### Gates (exit codes)

| gate                                                                 | exit |
| -------------------------------------------------------------------- | ---- |
| `test` (`npm test` — 3864 tests, 3864 pass, 0 fail)                  | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                       | 0    |
| `lint` (`npm run lint`)                                              | 0    |
| `format:check` (`npm run format:check`, whole repo)                  | 0    |
| `lint:md` (`npm run lint:md`, whole repo)                            | 0    |
| `structural:…/expected-injection-comment.json` (`check-structural`)  | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) | 0    |

`failing_gates: []`.

**`reconcile`:** `CLEAN` over this round's epoch (anchored by `stage-model-routing-gate2`, before the fixes, so every
edit of the round is inside the window). 20 paths reconciled, 0 escapes; exempted by name as pipeline artifacts:
this run's `REGRESSION.md` and `regression-report.json`.

**How the gates were run (orchestration — advisory):** one Bash call per gate, exit codes only (`npm test`'s output
to a scratch log under `.pharn/pharn-dev-verify/`), the regress scratch removed first so no scratch `.mjs` sat under
`.pharn/` when `eslint .` ran; the map assembled into `.pharn/pharn-dev-verify/results.json`.

### Verifiers (advisory)

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.

## After merging main (6.26.0, #281) (2026-09-27)

- **Run:** on the committed merge `28bbc1a` (`origin/main` `008b24b` merged in), after `/pharn-dev-regress`
  (`no-regressions`, base `008b24b`), with the plan's scope re-set and the baseline re-anchored
  (`--by stage-model-routing-merge-main`) right after the merge commit. Stage model: opus — set by the maintainer's
  instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed.

**VERIFIED: floor gates PASS.** Verdict `PASS` (`check-verify.mjs`, exit 0; the `feature` / `gates` / `verdict` /
`failing_gates` fields of `verify-report.json` are its stdout verbatim — this run's bytes equal the committed
report's, so the file is unchanged).

### Gates (exit codes)

| gate                                                                 | exit | time    |
| -------------------------------------------------------------------- | ---- | ------- |
| `test` (`npm test` — hooks, product floor and dev floor suites)      | 0    | 226.5 s |
| `validate` (`node pharn/floor/validate.mjs .`)                       | 0    | 0.4 s   |
| `lint` (`npm run lint`)                                              | 0    | 6.0 s   |
| `format:check` (`npm run format:check`, whole repo)                  | 0    | 295.3 s |
| `lint:md` (`npm run lint:md`, whole repo)                            | 0    | 23.9 s  |
| `structural:…/expected-injection-comment.json` (`check-structural`)  | 0    | < 0.1 s |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) | 0    | —       |

`failing_gates: []`.

**`reconcile`:** `CLEAN` over the post-merge epoch (anchored by `stage-model-routing-merge-main`, after the merge was
committed, as the coordinator required — `pharn/floor/` is reconciled against `HEAD`'s blobs). 0 paths needed
reconciling; exempted by name as pipeline artifacts: this run's `REGRESSION.md` and `regression-report.json`.

**How the gates were run (orchestration — advisory):** as in the run below — a scratch Node runner under
`.pharn/pharn-dev-verify/`, argv arrays only, exit codes only, deleted after the stage.

### Verifiers (advisory)

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

## Before the merge — the build's run (kept for the audit trail)

- **Run:** the build's run, on the uncommitted working tree the build left (HEAD `25a2599` plus the build's changes),
  after `/pharn-dev-regress` (`no-regressions`). Stage model: opus — set by the maintainer's instruction, overriding
  pharn.config.json; routed via Agent subagent; effort not routed.

**VERIFIED: floor gates PASS.** Verdict `PASS` (`check-verify.mjs`, exit 0).

| gate                                                                 | exit | time    |
| -------------------------------------------------------------------- | ---- | ------- |
| `test` (`npm test` — hooks, product floor and dev floor suites)      | 0    | 178.7 s |
| `validate` (`node pharn/floor/validate.mjs .`)                       | 0    | 0.3 s   |
| `lint` (`npm run lint`)                                              | 0    | 3.8 s   |
| `format:check` (`npm run format:check`, whole repo)                  | 0    | 124.3 s |
| `lint:md` (`npm run lint:md`, whole repo)                            | 0    | 17.4 s  |
| `structural:…/expected-injection-comment.json` (`check-structural`)  | 0    | < 0.1 s |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) | 0    | —       |

**`reconcile`:** `CLEAN` over the build's epoch (anchored by `pharn-dev-build`), 31 paths reconciled, no escape.
Exempted by name as pipeline artifacts: this feature's `BUILD.md`, `REGRESSION.md` and `regression-report.json`.
The Bash writes this increment declares — `npm run docs:generate` rewriting README's generated region (and
`docs/capabilities/`, byte-identically), and `make-patch.mjs` writing `proposed/human-only.patch` and
`human-only.sha256` — land on paths the build's scope names, so none is an escape. A `CLEAN` means no escape was
detected, never that none occurred: `.pharn/` is outside the reconciled set, and the window is anchor → reconcile.

## The honest residual (P0)

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. In particular the gates cannot see whether a live `/pharn-ship` or
`/pharn-loop` run routes a stage to its configured model: that is the plan's M2 measurement, which needs a real run
and is pending. `LIMITS.md §8` still reads as before this increment until a person applies
`proposed/human-only.patch` at GATE 2.
