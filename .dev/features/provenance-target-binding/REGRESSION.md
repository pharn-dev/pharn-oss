# REGRESSION — provenance-target-binding

**Base:** `8bc6c0a` (`docs: polish README positioning (#189)`). Working-tree dogfood, so `base = HEAD`
by the deterministic state test; `--base 8bc6c0a` was passed explicitly and resolves to the same commit.

## Scope partition (computed by `check-regress.mjs scope`, not by hand — L17/L20)

- **inside:** 12 paths — the 10 the `PLAN.md` `## Files` declared, plus this feature's own `PLAN.md` and
  `GRILL.md`.
- **escaped:** `[]` — **the build wrote nothing outside its declared `## Files`.**
- **escape_exempt:** `.dev/features/provenance-target-binding/{PLAN,GRILL}.md` — each written by its own
  stage under that stage's own Step-0 writes-scope, exempted by `--feature`.
- **outside_tests:** 68 (the 70 committed suites minus the two provenance suites, which are inside).
- **outside_eval_pairs:** 1 —
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`. **Both paths were confirmed readable before their exit code
  was recorded** (`test -r`), so a setup error could not be laundered into a `pre_existing` gate result
  (L5 / L16 / L21).

**Style gates skipped, deterministically.** `inside` touches no shared style config
(`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`), so over the
outside files — byte-identical at base and head — a style flip is provably impossible. The gates are
absent from **both** maps, so the gate sets still match.

## Per-gate exit codes

| gate                                                | base | head | result |
| --------------------------------------------------- | ---- | ---- | ------ |
| `tests` (68 outside suites)                         | 0    | 0    | stable |
| `validate` (whole-repo — a named granularity limit) | 0    | 0    | stable |
| `structural:…/expected-injection-comment.json`      | 0    | 0    | stable |

- `regressions[]`: **none**
- `pre_existing[]`: **none**

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
(`check-regress.mjs verdict` → `"no-regressions"`, exit 0. The verdict is the helper's; it was not
re-decided here — P0.)

**The honest residual (P7):** `/pharn-dev-regress` catches **exactly what its suite catches, nothing
more.** A regression no deterministic check covers is invisible to it. This says "deterministically
detectable breakage outside the feature is caught" — it does **not** say "nothing broke."

## Harness note (a deviation, recorded rather than hidden)

The command pins the literal `cat outside-tests.txt | xargs node --test` form, because leaving the
invocation open is how the `xargs -a` / unquoted-`$LIST` false reds kept recurring (L5 / L16 / L22). This
environment's worktree sandbox **refuses** that pipeline. The substitute passes the identical file list
to `node --test` as a **literal argv array** via a two-line driver — no shell word-splitting and no
xargs dialect at all, which is the exact property the pinned line exists to secure — and the **same
driver, same list** was used on both sides, so the gate sets remain identical. The baseline was
independently confirmed green (all 8 `npm run check` gates exit 0 at `8bc6c0a`) before the build began,
so a silently-red harness would have been visible as a red baseline rather than recorded as a number.
