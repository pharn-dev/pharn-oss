# REGRESSION — ac-gate-plan-scope

`/pharn-dev-regress` over this increment: the outside-scope gates at the pre-build base and at HEAD, their exit codes
compared by `pharn/floor/check-regress.mjs verdict` (the FLOOR verdict — no judgment of a flip). The machine report is
`regression-report.json`, the helper's `verdict` JSON verbatim.

- **Base:** `70cb51c8f3f7c1a3405b651106bc35f244948da9` (the working tree is dirty — an uncommitted build — so
  `base = HEAD`, per Step 1).
- **Inside (the changed scope):** 35 paths — the plan's 34 `## Files` plus `GRILL.md`, which `scope` exempts as this
  feature's own artifact (`escape_exempt`). `scope` exited 0: no path escaped the declared writes.
- **Outside:** 113 test files (of 122 tracked `*.test.mjs` / `*.test.cjs`; the other 9 are this increment's own), the
  whole-repo `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
- **Style gates:** skipped at both sides — no shared style config (`eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore`, `.markdownlint-cli2.jsonc`) is inside, so a style flip over the byte-identical outside files is
  impossible (the command's deterministic skip rule).

## Gates, base → head (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (the 113 outside files)                                                            | 1    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: `tests`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

## The red base, investigated rather than trusted

The base `tests` exit 1 is one failing test out of 3706 (3701 pass, 1 fail; the four others are the style probes that
skip in a worktree with no `node_modules`). It is a load artifact, not the base's state: the SAME base commit ran the
same 113 files at 20:26–20:48 with **0 failures** (3702 pass) in this stage's first attempt, whose runner then crashed on
the eval-pair record's shape before writing its map, so that result is quoted here and was not recorded. Both attempts
ran while other sessions' suites held the machine's load average between 55 and 97, and this build's own
`npm run check` hit a timing-sensitive test the same way (`BUILD.md`, "The aggregate gate"). The runner kept exit codes
only, so which test failed at base is not known. **What it cannot hide:** HEAD ran the 113 outside files with **0
failures** (3706 / 3706), so no outside test is red at HEAD for the base's red to mask.

## How this stage ran (advisory orchestration)

The pinned Step 1–3 shell forms are refused in this isolated worktree (xargs pipelines, `$?` capture), so a scratch node
runner under `.pharn/pharn-dev-regress/` ran the same steps as argv arrays: `check-regress.mjs scope` with the inside,
declared, test and eval-pair lists; the gate set in a throwaway `git worktree add --detach` at the base (removed after)
and then at HEAD; `check-regress.mjs verdict` over the two maps. The maps and the verdict were written by the runner,
never typed. The runner is deleted with the stage's scratch.

This stage catches exactly what its deterministic suite catches, nothing more — a broken behaviour no test, rule or eval
covers is invisible to it. "No regressions" is a claim about the comparison, never a certification of the feature.
