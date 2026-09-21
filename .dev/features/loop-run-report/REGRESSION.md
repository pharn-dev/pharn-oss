# REGRESSION — loop-run-report

**Base:** `6d2ed4617a5a0a4d2a2624353d71a23c5ffc12be` (working-tree dogfood, so `base = HEAD`) ·
**Machine report:** [`regression-report.json`](./regression-report.json) — the helper's `verdict` JSON
verbatim, deliberately unformatted.

## Partition

**Inside (16 changed paths)** — the feature's own surface, not re-tested here:

`.claude/commands/pharn-loop.md`, `.dev/features/loop-run-report/GRILL.md`,
`.dev/features/loop-run-report/PLAN.md`, `.markdownlint-cli2.jsonc`, `.prettierignore`, `CHANGELOG.md`,
`CLAUDE.md`, `README.md`, `SKILLS_VERSION`, `pharn/floor/check-build-complete.mjs`,
`pharn/floor/check-loop-record.mjs`, `pharn/floor/check-regress.mjs`,
`pharn/floor/loop-record-core.mjs`, `pharn/floor/reconcile-ignore.json`,
`pharn/floor/render-run-report.mjs`, `pharn/floor/render-run-report.test.mjs`.

**Scope check:** `check-regress.mjs scope` exited **0** with `escaped: []` — the build wrote nothing
outside the plan's `## Files`. Two paths were exempted under `--feature loop-run-report`, and both are
this run's own stage artifacts rather than build output:

```text
escape_exempt: [".dev/features/loop-run-report/GRILL.md",
                ".dev/features/loop-run-report/PLAN.md"]
```

**Outside:** 83 test files + 1 committed eval pair
(`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json`; both confirmed readable before their exit code was recorded,
per **L5/L16/L21** — a guessed path yields an ENOENT red that is equal at base and head and would be
filed as `pre_existing`, masking a real one).

**Three paths were declared in `## Files` and not written:** `pharn/floor/check-bash-reconcile.test.mjs`,
`.dev/floor/command-hygiene.test.mjs`, and — from the plan's own list — nothing else. The ✧ parity test
already ranges over `pipeline_artifacts.names` derived from `PIPELINE_ARTIFACTS`, so adding the member to
both sides kept it green with no edit; the wiring pin (L45) went into the new suite instead. Declaring a
path and not needing it is permitted by the setter and is recorded here rather than left implicit.

## Style gates RAN — they were not skipped

The deterministic skip rule applies only when `inside` touches no shared style config. This increment
changes **`.prettierignore` and `.markdownlint-cli2.jsonc`**, so a style flip over outside files is
genuinely possible and all three style gates were run at both ends. The baseline worktree therefore took
`npm ci` (exit 0) — the named cost, incurred exactly in the case it exists for.

## Per-gate exit codes

| gate                                    | base | head | flipped? |
| --------------------------------------- | ---- | ---- | -------- |
| `tests` (83 outside test files)         | 0    | 0    | no       |
| `validate`                              | 0    | 0    | no       |
| `structural:expected-injection-comment` | 0    | 0    | no       |
| `lint`                                  | 0    | 0    | no       |
| `format:check`                          | 0    | 0    | no       |
| `lint:md`                               | 0    | 0    | no       |

`regressions[]`: **empty.** `pre_existing[]`: **empty** — the baseline was green on all six gates, so no
red is being carried forward and none is being masked.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
`check-regress.mjs verdict` exit **0**, `verdict: "no-regressions"`.

**The honest residual (P0).** This stage catches **exactly what its suite catches, nothing more.** A
regression outside the feature that no test, rule or eval covers is invisible here, and the claim is
_"deterministically-detectable breakage outside the feature is caught"_ — never _"nothing broke"_. The
**verdict** is floor-grade (an exit-code comparison the helper computes); everything around it — choosing
the base, partitioning, running the suite — is **advisory orchestration**.

Worth stating for this increment specifically: three of the six gates above are the ones most likely to
have caught a mistake here, because this change edits two shipped floor checkers
(`check-loop-record.mjs`, `check-build-complete.mjs`) whose existing suites are the entire regression net
for the extraction. They ran inside the 83 and stayed green — which is evidence the extraction was
behaviour-preserving, **not** proof that it was, since a behaviour no existing test covers would not
show up either way.

---

## Re-run after the GATE-2 fixes

The human chose to fix review findings F1 + F2, so the stage was re-run. **Verdict recomputed:
`no-regressions`, exit 0** — `regressions[]` and `pre_existing[]` both empty, all six outside gates 0 → 0.

**`base-results.json` was REUSED rather than recomputed, and that is sound rather than a shortcut.** The
baseline is a property of an immutable commit (`6d2ed46`) under a fixed gate set; re-running it in a
fresh worktree would re-derive the same six zeros at the cost of another `npm ci`. The HEAD side **was**
recomputed in full, which is the side the fixes could have moved.

`inside` grew from 16 to 21 paths. The five additions are this run's own pipeline artifacts —
`REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json` — each written
by its own stage under that stage's own Step-0 scope. **No source path was added**, which is the thing
worth checking: the GATE-2 fixes touched only `render-run-report.mjs` and its test, both already inside.
This is L17's distinction in practice — a changed-since-base set that grew for a reason that is not "the
build wrote outside its scope".
