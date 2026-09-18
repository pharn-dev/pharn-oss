# REGRESSION — hook-cwd-anchoring

- stage: `/pharn-dev-regress` (**second run** — refreshed after the human apply)
- base: `a7f32a1808a2c3a794833d8fa57fc2a41f851c7c` (= `HEAD`, the human-applied guard commit)
- head: the working tree on `fix/hook-cwd-anchoring`
- date: 2026-09-18
- machine report: `.dev/features/hook-cwd-anchoring/regression-report.json` — the helper's `verdict` JSON
  verbatim (byte-identical to its stdout)

## Base resolution (deterministic, P5)

`git status --porcelain` is non-empty → the first state test fires → **`base = HEAD`**. No `--base` was
passed on this run and nothing was guessed.

The first run of this stage recorded `base = f66f4d3` — correct at the time, when `HEAD` was still the
fork point and the guard patch was unapplied. `HEAD` has since moved to the human's apply commit, so this
refresh describes the tree actually being shipped.

## A deviation I made, and what it exposed (recorded, not quietly dropped)

Before this run I tried an explicit `--base f66f4d3` — the fork point — reasoning it would ask the
stronger question ("did the patched guards break anything outside?"). **That was wrong, and it
manufactured a blocking finding.** `check-regress.mjs scope` exited **1** with three
`severity: blocking`, `rule_id: P0` findings:

| flagged path                              | why it appeared                         |
| ----------------------------------------- | --------------------------------------- |
| `.claude/hooks/enforce-writes-scope.cjs`  | changed by commit `a7f32a1`, undeclared |
| `.claude/hooks/protect-trusted-paths.cjs` | changed by commit `a7f32a1`, undeclared |
| `.claude/settings.json`                   | changed by commit `a7f32a1`, undeclared |

Each finding read _"the build escaped its plan's `## Files`"_. **The build escaped nothing.** Those three
paths are the guards' own control surface: the agent may not write them, `set-writes-scope.cjs` refuses
to scope them without `--allow-claude-dir`, and fix #2 denies them regardless. The plan therefore declared
`handoff/` copies and emitted a patch; a **human** applied it in a separate commit. `LIMITS.md` changed in
the same commit and did **not** flag, only because the four trusted docs are exempt by construction.

Two honest readings follow, and they point in different directions:

- **The immediate one:** the helper has **no attribution** — it compares a diff against a declared list
  and cannot distinguish an agent write from a human commit. Reaching back past the apply commit put
  human-authored bytes into the diff and they were reported as an agent escape. The pinned auto-rule
  (`dirty tree → base = HEAD`) avoids this by construction, which is precisely why the rule is pinned
  rather than left to judgment. The improvisation was mine.
- **The one worth raising at GATE 2:** the human-apply pattern and `scope`'s escape detection interact
  badly whenever `base` predates the apply commit — a real, reproducible shape, not a one-off. Any
  increment that changes hook-protected control surface will hit it on a fork-point base. No remedy is
  proposed here (P7: this is the first occurrence); it is recorded so a second one is recognizable.

The deviating run's raw output is kept at `.pharn/pharn-dev-regress/scope-forkbase-DEVIATION.json`
(gitignored scratch). **Its findings are not carried into the verdict below** — that verdict comes from
the pinned-rule run, which reported `escaped: []`.

## Partition (`check-regress.mjs scope`, exit 0)

**Inside: 20 paths** — the three in-flight hook suites, this feature's seven stage artifacts, the four
handoff/`proposed/` files, and the doc/version set (`CHANGELOG.md`, `CLAUDE.md`, `README.md`,
`SKILLS_VERSION`, `pharn/floor/README.md`, `pharn/floor/check-bash-reconcile.mjs`).

**Escapes: none** — `escaped: []`. Seven paths were exempted by the helper and are reported rather than
assumed (`escape_exempt`): this feature's own `GRILL.md`, `PLAN.md`, `REGRESSION.md`, `SHIP.md`,
`VERIFY.md`, `regression-report.json`, `verify-report.json` — each written by its own stage under that
stage's own Step-0 scope. `--feature hook-cwd-anchoring` was passed; no `--changed` list was hand-filtered
(L17/L20).

**Outside: 74 test files** (the committed universe minus this feature's 3 suites) **and 1 eval pair.**

## Gates (identical gate-ids both sides)

| gate                                           | base | head | flip |
| ---------------------------------------------- | ---- | ---- | ---- |
| `tests` (74 outside suites)                    | 0    | 0    | —    |
| `validate` (`pharn/floor/validate.mjs .`)      | 0    | 0    | —    |
| `structural:…/expected-injection-comment.json` | 0    | 0    | —    |

- Baseline ran in a throwaway detached worktree at the base SHA, removed afterward. All three core gates
  are stdlib-only, so no `npm ci` was needed.
- The test list was expanded through the **pinned** form (`cat outside-tests.txt | xargs node --test`) —
  not `node --test $LIST` (not word-split under zsh) and not `xargs -a` (GNU-only). Either fabricates a
  red that is equal at both sides and is therefore laundered into `pre_existing` while masking a real one
  (L5 / L16).
- Both eval-pair paths were confirmed readable (`test -r`) before their exit code was recorded, at base
  and at head.

### Style gates: skipped, deterministically

`lint` / `format:check` / `lint:md` did not run and are absent from **both** maps: `inside` touches no
shared style config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
`.markdownlint-cli2.jsonc`), so over the byte-identical outside files a style flip is provably impossible.
All three are separately green repo-wide at HEAD — they are verify's gates, and verify ran them.

## Verdict (floor — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

`regressions: []`, `pre_existing: []`.

**What this run does NOT ask, stated because the base moved.** With `base = HEAD`, the guard patch is
present on **both** sides, so this comparison does not measure the patch's effect on the outside suites.
That question is answered elsewhere and was answered green: `/pharn-dev-verify`'s whole-repo `test` gate
ran **2066 / 2066** with the patch in place, and `apply.sh` ran the three hook suites on the applied bytes
(**222 / 222**) before committing. The first regress run additionally compared the pre-patch tree against
`f66f4d3` and found no flips.

**The honest residual (P0/P7):** this catches **exactly what its suite catches — nothing more.** A
regression no deterministic check covers is invisible here. The claim is "deterministically-detectable
breakage outside the feature is caught," **not** "nothing broke."

**Orchestration vs. verdict (two clocks).** Choosing the base, partitioning, running the suites and
obtaining the baseline are **advisory orchestration** — as this run's own deviation demonstrates. Only the
exit-code comparison is floor-grade.
