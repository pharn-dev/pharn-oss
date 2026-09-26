# VERIFY — ship-quick-mode

## After the human apply at GATE 2 (2026-09-26)

### VERIFIED: floor gates PASS

This ran on the applied tree, `fb8bf5b`: "docs(trusted): quick mode in LIMITS.md and ARCHITECTURE.md
(human-applied)", which the maintainer committed by running `proposed/apply.sh` in this worktree. That commit
touches `LIMITS.md` and `pharn/ARCHITECTURE.md` only. `shasum -a 256 -c proposed/human-only.sha256` passes on both,
and `pharn/ARCHITECTURE.md` now hashes to the new pin,
`d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`. Stage model: opus — set by the maintainer's
instruction, overriding pharn.config.json's sonnet for build/regress/verify; routed via Agent subagent; effort not
routed.

| gate                                                                                        | exit |
| ------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test`, hermetic suite incl. the feature's own `*.test.*` — 3663/3663 passing)  | 0    |
| `validate` (`node pharn/floor/validate.mjs .`, structural floor over the product surface)   | 0    |
| `lint` (eslint, whole-repo)                                                                 | 0    |
| `format:check` (prettier, whole-repo)                                                       | 0    |
| `lint:md` (markdownlint, whole-repo)                                                        | 0    |
| `structural:…/expected-injection-comment.json` (the committed trust-fence eval pair)        | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, the fix #7 Bash-write detector) | 0    |

**`check-verify.mjs` → `PASS`, exit 0, `failing_gates: []`.** A scratch Node runner under
`.pharn/pharn-dev-verify/` captured the gate map with argv arrays, and code recorded the exit codes. It was
deleted afterwards. `verify-report.json` needed no rewrite: this run's `check-verify.mjs` stdout equals its
`feature` / `gates` / `verdict` / `failing_gates`, and the verifiers block is unchanged (`registered: 0`).

### Bash-reconciliation detail — the apply, then a new epoch

- **Against the final-merge epoch** (`ship-quick-mode-final-merge`, `2026-09-26T13:48:08.200Z`), the applied tree
  read `ESCAPE`. It had exactly two escapes, `LIMITS.md` and `pharn/ARCHITECTURE.md`, both denied by
  `protect-trusted-paths.cjs`. Those are the two files of the maintainer's `fb8bf5b`, a human git commit made
  outside the agent's tool surface, and their bytes match the reviewed patch's sums. That output is kept beside
  this record, in `.pharn/pharn-dev-verify/reconcile-before-apply-anchor.json`.
- **The procedure** is the one `proposed/APPLY.md` gives for an apply that comes before a verify: re-run the setter
  from `PLAN.md`, then `reconcile-baseline.mjs --anchor`, after the apply commit and in that order (L38). The label
  was `--by ship-quick-mode-after-apply`, over 2354 paths. No baseline was edited or deleted.
- **Under the new epoch**, `reconcile` came back **`CLEAN`**: epoch `2026-09-26T17:05:14.940Z`, 0 paths
  reconciled, **no escape**.

### Verifiers

**No verifiers registered — floor gates only.** (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`.)

### The honest residual (P0/P7)

Verified = the named gates passed; this is **not** a guarantee of correctness beyond what those gates check —
verifier concerns are advisory help, not assurance. The apply's own checks (sums, `validate`, `check:markers` and
`hash-doc.test`, 11/11) ran inside `apply.sh` and were reported by the maintainer. This run re-checked the sums and
the whole gate set on the applied bytes.

## After the final merge of main (2026-09-26)

### VERIFIED: floor gates PASS

This ran on the committed final merge: `origin/main` (`ec06f7b`, `writes-scope-run-only`, 6.24.0) merged in, and
this phase renumbered to 6.25.0. The only uncommitted changes at run time were this chain's `REGRESSION.md` and
`regression-report.json`. The merge commit is then amended to add only this chain's records, so the code this run
measured is the code on the branch. The human-only patch was not applied: `LIMITS.md` and `pharn/ARCHITECTURE.md`
are byte-identical to `HEAD`, and the ARCHITECTURE pin is still `4950796f…`. Stage model: opus — set by the
maintainer's instruction, overriding pharn.config.json's sonnet for build/regress/verify; routed via Agent
subagent; effort not routed.

| gate                                                                                        | exit |
| ------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test`, hermetic suite incl. the feature's own `*.test.*` — 3663/3663 passing)  | 0    |
| `validate` (`node pharn/floor/validate.mjs .`, structural floor over the product surface)   | 0    |
| `lint` (eslint, whole-repo)                                                                 | 0    |
| `format:check` (prettier, whole-repo)                                                       | 0    |
| `lint:md` (markdownlint, whole-repo)                                                        | 0    |
| `structural:…/expected-injection-comment.json` (the committed trust-fence eval pair)        | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, the fix #7 Bash-write detector) | 0    |

**`check-verify.mjs` → `PASS`, exit 0, `failing_gates: []`.** A scratch Node runner under
`.pharn/pharn-dev-verify/` captured the gate map with argv arrays, and code recorded the exit codes. It was
deleted afterwards. `verify-report.json` needed no rewrite: this run's `check-verify.mjs` stdout equals its
`feature` / `gates` / `verdict` / `failing_gates`, and the verifiers block is unchanged (`registered: 0`).

### Bash-reconciliation detail

- **Before this merge**, the `ship-quick-mode-post-merge` epoch read `CLEAN`: 33 paths reconciled, no escape. This
  was recorded before `git merge`, then kept.
- **After this merge**, the setter was re-run from `PLAN.md` and the epoch re-opened with
  `reconcile-baseline.mjs --anchor --by ship-quick-mode-final-merge` (2355 paths). `reconcile` came back
  **`CLEAN`**: epoch `2026-09-26T13:48:08.200Z`, 32 paths reconciled, **no escape**. Four pipeline artifacts were
  exempted by name: `BUILD.md`, `PLAN.md`, `REGRESSION.md` and `regression-report.json`. The merge was committed
  before this run, for the control-surface reason the section below gives.

### Verifiers

**No verifiers registered — floor gates only.** (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`.)

### The honest residual (P0/P7)

Verified = the named gates passed; this is **not** a guarantee of correctness beyond what those gates check —
verifier concerns are advisory help, not assurance. The regenerated trusted-doc patch is not part of this
verdict. It was applied to a scratch copy of the tree only (`BUILD.md`, "GATE 2 — the final merge of main"). The
gates that read those two files run on the applied bytes only inside `apply.sh`, at the maintainer's GATE-2 apply.

## After the merge of main (2026-09-26)

### VERIFIED: floor gates PASS

This ran on the committed merge: `origin/main` (`1524c6f`, `stage-regress-script`, 6.23.0) merged in, and the
re-review's N1–N3 fixed. The only uncommitted changes at run time were this chain's `REGRESSION.md` and
`regression-report.json`. That merge commit was then amended to add only those two and this file, so the code this
run measured is the code on the branch. The human-only patch was not applied: `LIMITS.md` and `pharn/ARCHITECTURE.md` are
byte-identical to `HEAD`, and the ARCHITECTURE pin is still `4950796f…`. Stage model: opus — set by the
maintainer's instruction, overriding pharn.config.json's sonnet for build/regress/verify; routed via Agent
subagent; effort not routed.

| gate                                                                                        | exit |
| ------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test`, hermetic suite incl. the feature's own `*.test.*` — 3535/3535 passing)  | 0    |
| `validate` (`node pharn/floor/validate.mjs .`, structural floor over the product surface)   | 0    |
| `lint` (eslint, whole-repo)                                                                 | 0    |
| `format:check` (prettier, whole-repo)                                                       | 0    |
| `lint:md` (markdownlint, whole-repo)                                                        | 0    |
| `structural:…/expected-injection-comment.json` (the committed trust-fence eval pair)        | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, the fix #7 Bash-write detector) | 0    |

**`check-verify.mjs` → `PASS`, exit 0, `failing_gates: []`.** A scratch Node runner under
`.pharn/pharn-dev-verify/` captured the gate map with argv arrays, and code recorded the exit codes. It was
deleted afterwards. `verify-report.json` needed no rewrite. This run's `check-verify.mjs` stdout equals its
`feature` / `gates` / `verdict` / `failing_gates`, and the verifiers block is unchanged (`registered: 0`).

### Bash-reconciliation detail

- **Before the merge**, the fix pass's epoch read `CLEAN`: epoch `2026-09-26T08:34:24.850Z`, anchored
  `--by ship-quick-mode-opus-fixes`, 24 paths reconciled, no escape. This was recorded before `git merge`, then kept.
- **After the merge**, the setter was re-run from `PLAN.md` and the epoch re-opened with
  `reconcile-baseline.mjs --anchor --by ship-quick-mode-post-merge` (2338 paths). `reconcile` came back
  **`CLEAN`**: epoch `2026-09-26T09:56:31.411Z`, 33 paths reconciled, **no escape**. Four pipeline artifacts were
  exempted by name: `BUILD.md`, `PLAN.md`, `REGRESSION.md` and `regression-report.json`.
- **The merge had to be committed first.** With the merge staged but uncommitted, the same check reported 15
  escapes, one for each of main's `pharn/floor/` files that this plan does not declare. `pharn/floor/` and
  `.dev/floor/` are reconciled against `HEAD`'s committed blobs, never against the baseline, and `HEAD` did not
  yet hold the merge. Those 15 are exactly main's floor changes since the fork point, minus the three this plan
  also declares (`PLAN.md`, "Amended at GATE 2 (merge of main)"). No baseline was edited or deleted.

### Verifiers

**No verifiers registered — floor gates only.** (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`.)

### The honest residual (P0/P7)

Verified = the named gates passed; this is **not** a guarantee of correctness beyond what those gates check —
verifier concerns are advisory help, not assurance. The regenerated trusted-doc patch is not part of this
verdict. It was applied to a scratch copy of the tree only (`BUILD.md`, "GATE 2 — the merge of main"). The
gates that read those two files run on the applied bytes only inside `apply.sh`, at the human's GATE-2 apply.

## After GATE 2 fix (2026-09-26)

### VERIFIED: floor gates PASS

Run on the working tree over `2071a97` with the GATE-2 review fixes applied (uncommitted at run time), without
the human-only patch — `LIMITS.md` and `pharn/ARCHITECTURE.md` are byte-identical to `HEAD` (ARCHITECTURE pin
still `4950796f…`). Stage model: opus — set by the maintainer's instruction, overriding pharn.config.json's
sonnet for build/regress/verify; routed via Agent subagent; effort not routed.

| gate                                                                                        | exit |
| ------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test`, hermetic suite incl. the feature's own `*.test.*` — 3417/3417 passing)  | 0    |
| `validate` (`node pharn/floor/validate.mjs .`, structural floor over the product surface)   | 0    |
| `lint` (eslint, whole-repo)                                                                 | 0    |
| `format:check` (prettier, whole-repo)                                                       | 0    |
| `lint:md` (markdownlint, whole-repo)                                                        | 0    |
| `structural:…/expected-injection-comment.json` (the committed trust-fence eval pair)        | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, the fix #7 Bash-write detector) | 0    |

**`check-verify.mjs` → `PASS`, exit 0, `failing_gates: []`.** The gate map was captured by a scratch Node runner
under `.pharn/pharn-dev-verify/` (argv arrays, exit codes recorded by code; the isolated worktree refuses the
command's `$?`/`printf` form), deleted afterwards. **Run twice:** once after the fixes, and again after one last
`README.md` wording correction (the `--quick` backstop sentence, which had said a misread flag "cannot get past"
the SPEC although the STOP it meets is advisory orchestration). Both runs gave the table above; the second is the
standing verdict, and `verify-report.json` is its output.

### Bash-reconciliation detail

- **This pass's epoch:** `reconcile` came back **`CLEAN`** — epoch `2026-09-26T08:34:24.850Z`, anchored
  `--by ship-quick-mode-opus-fixes` in this worktree after the setter, with one scope amendment (`--amend-scope`,
  38 entries) when `.claude/commands/pharn-verify.md` joined `## Files`; 24 paths reconciled, **zero escapes**.
  Exempted by name as pipeline artifacts: `BUILD.md`, `PLAN.md`, `REGRESSION.md`, `VERIFY.md`,
  `regression-report.json`. The
  two declared Bash writes (`proposed/human-only.patch`, `proposed/human-only.sha256`, regenerated by
  `handoff/make-patch.mjs`) are in the plan's scope and reconciled clean.
- **The build's full window, recorded by the orchestrator** in the original build worktree, covering
  build + regress + verify up to `2071a97`:
  `{"verdict":"CLEAN","epoch":"2026-09-25T22:54:57.864Z","anchored_by":"pharn-dev-build","reconciled":35,"escapes":[]}`,
  exit 0.
- Together the two epochs cover the build window and this fix pass; neither is a claim about the gap between
  them beyond what the committed history shows (a `CLEAN` means no escape was detected, never that none occurred —
  `pharn/pharn-contracts/reconciliation-record.md`).

### Verifiers

**No verifiers registered — floor gates only.** (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`.)

### The honest residual (P0/P7)

Verified = the named gates passed; this is **not** a guarantee of correctness beyond what those gates check —
verifier concerns are advisory help, not assurance. The proposed trusted-doc patch is not part of this verdict:
it was regenerated, applied to scratch copies only, and its applied bytes matched `human-only.sha256`; the gates
that read those two files (`validate` CHECK 5, `check:markers`, `hash-doc.test.mjs`) run on the applied bytes
only inside `apply.sh`, at the human's GATE-2 apply.

## Before GATE 2 — the build's run (kept for the audit trail)

**VERIFIED: floor gates PASS** at the build (`4a3de25`): `test` (3402/3402), `validate`, `lint`, `format:check`,
`lint:md`, `structural:…/expected-injection-comment.json` and `reconcile` all exit 0; `failing_gates: []`.
`reconcile` was `CLEAN`: 35 paths reconciled against the `pharn-dev-build` anchor, zero escapes, with
`BUILD.md`, `REGRESSION.md` and `regression-report.json` exempted by name. One self-inflicted false alarm was
caught and corrected before that table was recorded: the first `lint` run flagged an abandoned scratch script
under `.pharn/pharn-dev-regress/` (ESLint has no `.pharn/` exclusion); the three abandoned scripts were
deleted and `lint` re-ran clean. No verifiers were registered.
