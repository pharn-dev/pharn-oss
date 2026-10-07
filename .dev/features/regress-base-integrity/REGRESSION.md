# REGRESSION — regress-base-integrity

base: `052709d35cb3ce1f0e58ad18a0a5513a39d9e0bd` (HEAD; a working-tree dogfood — the build is uncommitted, so the
dirty-tree rule is sound here: every change of this increment is in `inside`).

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, second run). This certifies the comparison only: `/pharn-dev-regress` catches exactly what its suite catches,
nothing more.

## The first run was RED, and that is recorded, not smoothed over

The first comparison (same base, before one fix) read **`regressions: ["tests"]`** (exit 1): the outside test suite
was green at base and red at head. Cause, read from the failing tests (not guessed): `stage-regress-core.mjs`
`resolveBaseSource` now names its dirty-tree branch `dirty-head` (a `BASE_SOURCES` member), and a second caller this
plan had not enumerated — `pharn/floor/instruction-files.mjs` (`check-instruction-files --growth --base-rule`) —
still tested `kind === "head"`. Its dirty branch fell through to merge-base, so 3 `check-instruction-files` tests and
15 `stage-verify` tests (verify injects the `instruction-growth` gate) went red. The fix — one line in
`instruction-files.mjs`, added to the PLAN's `## Files` with a setter re-run and a reconcile `--amend-scope` — is the
second run's only difference. Under `/pharn-dev-ship` gated mode a non-GREEN regress verdict is a STOP; this run
fixed in-scope and re-ran instead, which is recorded in `SHIP.md` for the GATE 2 decision.

## Scope (from `check-regress.mjs scope --feature regress-base-integrity`, exit 0)

- inside: 32 changed paths (the PLAN's `## Files` minus the stage artifacts not yet written); declared: 38; escaped:
  none; escape-exempt: none (this feature's PLAN.md and GRILL.md are declared in `## Files`).
- outside gates: `tests` over the 140 committed `*.test.mjs` / `*.test.cjs` files outside `inside`, `validate`, and
  the one outside eval pair (`trust-fence` expected ↔ `.dev/features/trust-fence/findings.json`).
- style gates skipped: no shared style config is in `inside`.

## Gates (base → head, exit codes)

| gate                                                                                       | run 1 (base → head) | run 2 (base → head) |
| ------------------------------------------------------------------------------------------ | ------------------- | ------------------- |
| `tests` (140 outside test files)                                                           | 0 → **1**           | 0 → 0               |
| `validate`                                                                                 | 0 → 0               | 0 → 0               |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0               | 0 → 0               |

regressions: none · pre_existing: none (run 2).

## The audit's fixtures, before and after (the behaviour this increment changes)

Run against this worktree's floor (`PHARN_ROOT`), from private copies of the audit's `regress-chain/` fixtures (the
copies only make the floor root configurable and tolerate a refusal that writes no report).

| fixture                                                     | before (`052709d`)                                                                        | after                                                                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| f1 — build committed, feature dir untracked (dirty ⇒ HEAD)  | `done`, `test {base:1, head:1}` → `pre_existing` → **`no-regressions`**                   | **`refused no-change-under-test`** (exit 3, no report); REGRESSION.md names `dirty-head` and `--base`       |
| f1 control — build uncommitted                              | `regressions: ["test"]`                                                                   | `regressions: ["test"]` (unchanged)                                                                         |
| f1c — f1 with `--base <pre-build commit>` (/pharn-ship now) | (not run before)                                                                          | `done`, `test {base:0, head:1}`, **`regressions`**, `base_source: explicit`                                 |
| f1b — all committed + pushed (merge-base == HEAD)           | `base == HEAD`, `inside: []` → **`no-regressions`**                                       | **`refused no-change-under-test`**                                                                          |
| f2 — base `test` times out, head fails fast                 | base `{exit:1, timed_out:true}` → `pre_existing` → **`no-regressions`**; md silent        | **`inconclusive`** (`base-timed-out`), `base_timed_out: ["test"]`; md: "1 base gate run(s) TIMED OUT"       |
| f3 — `**` in `## Files`                                     | regress **clean**, quick-scope exit **0**, setter drops it                                | regress **`refused plan-files-total-glob`**, quick-scope exit **2** (`total-glob-declared`)                 |
| f3 — `**/*`, `*`                                            | partial (root files / nested files counted declared)                                      | both refused as above                                                                                       |
| f3 — `.`                                                    | matched nothing in either reader                                                          | refused as above (its intent is "everything")                                                               |
| f6 — `--no-install`, HEAD has `node_modules`/`.bin`         | base resolved `<project>/node_modules/mydep` and ran `<project>/node_modules/.bin/mytool` | base runs in the temp root: `test {base:1, head:0}`, `typecheck {base:127, head:0}` — HEAD deps unreachable |

f6's fixture declares no dependency in `package.json`, so its skipped install is not "unreliable"
(`baseInstallNeeded` false) and no masking is possible (head green). The case where it would mask — a declared
dependency, `--no-install`, a gate red on both sides — is refused `base-install-unreliable`, covered by
`stage-regress.test.mjs` ("P2-D's second half"), together with a failed `--install` and two controls.

**Fail-before evidence for the checker tests:** the new `check-regress.test.mjs` cases run against the `052709d` floor
(a detached worktree with only the test file copied): 7 of 8 fail, and the one that passes is the documenting control
(positional maps keep the plain table).

_/pharn-dev-regress catches exactly what its suite catches, nothing more — this is not a claim that nothing broke._
