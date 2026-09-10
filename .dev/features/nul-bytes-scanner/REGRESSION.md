# REGRESSION — nul-bytes-scanner

**Base:** `8bc6c0a8f1b9e7df2e01ff0f98a73602dfa47422` (`docs: polish README positioning (#189)`).
Resolved deterministically: `git status --porcelain` was non-empty (a working-tree dogfood build), so
`base = HEAD` per the command's first state test — not chosen.

## Inside / outside partition

Computed by `pharn/floor/check-regress.mjs scope`, not by hand.

**Inside (7 paths — the changed scope):**

| path                                               | note                                            |
| -------------------------------------------------- | ----------------------------------------------- |
| `pharn/floor/scan-code-missing-error-handling.mjs` | declared in `## Files` — the repair             |
| `.dev/floor/source-nul-guard.test.mjs`             | declared in `## Files` — the new guard          |
| `SKILLS_VERSION`                                   | declared in `## Files`                          |
| `README.md`                                        | declared in `## Files`                          |
| `CHANGELOG.md`                                     | declared in `## Files`                          |
| `.dev/features/nul-bytes-scanner/PLAN.md`          | `escape_exempt` — written by `/pharn-dev-plan`  |
| `.dev/features/nul-bytes-scanner/GRILL.md`         | `escape_exempt` — written by `/pharn-dev-grill` |

**`escaped: []`** — no path changed outside the plan's declared `## Files`. The two exempted entries are
this feature's own stage artifacts, each written under its own stage's Step-0 writes-scope; they were
exempted by `--feature nul-bytes-scanner` (the deterministic exemption), **not** by hand-filtering
`--changed` — which is the practice `.dev/memory-bank/lessons-learned.md` L17 documents and L20 demanded
be given a floor check.

**Outside:** 70 test files (the 71-file universe minus the one new test, which is inside) + 1 committed
eval pair. Both eval-pair paths were confirmed readable **before** their exit code was recorded, per the
L5 / L16 / L21 input-capture boundary — a guessed path would have produced an ENOENT red equal at base
and head, which classifies as `pre_existing` and would have masked a real structural-gate regression.

## Per-gate comparison (exit codes, base → head)

| gate                                              | base | head | result |
| ------------------------------------------------- | ---- | ---- | ------ |
| `tests` (70 outside test files)                   | 0    | 0    | stable |
| `validate` (whole-repo — named granularity limit) | 0    | 0    | stable |
| `structural:expected-injection-comment.json`      | 0    | 0    | stable |

- `regressions[]`: **none**
- `pre_existing[]`: **none**

**Style gates (`lint` / `format:check` / `lint:md`) were SKIPPED, deterministically and not for
convenience.** The skip rule fires only when `inside` touches a shared style config
(`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`); none of the
seven inside paths is one. Over the outside files — byte-identical at base and head — a style result can
flip _only_ if shared config changed, so the flip is provably impossible here. The gate is absent from
**both** results maps, so the gate sets match and the comparison stays valid. (They were additionally run
read-only repo-wide at build Step 2b and were clean; that is a convenience observation, not this stage's
verdict.)

### One deviation from the command's prescribed capture, recorded rather than glossed

The command pins `cat outside-tests.txt | xargs node --test`. This worktree-isolated session's sandbox
**refused that pipeline**, so the list was passed to `node --test` as an explicit **argv array** via
`.pharn/pharn-dev-regress/run-tests.mjs` (gitignored per-command scratch). This is recorded because L22
says a command that describes a technique in prose accumulates wrong implementations: the substitute was
chosen precisely to avoid the two forms L5 / L16 name as fabricating a false red — `node --test $LIST`
(not word-split under zsh) and `xargs -a` (GNU-only). Passing an argv array removes shell word-splitting
from the path entirely, so it cannot fabricate a red in either dialect. The runner prints only the
child's exit code and the file count (`0 70` at both base and head), never parsed prose.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

`pharn/floor/check-regress.mjs verdict` → `"verdict": "no-regressions"`, exit **0**. The verdict is a
comparison of exit codes computed by the helper; no judgment of mine entered it, and a flipped gate would
have been a regression regardless of how it looked.

**The honest residual (P0/P7):** this catches **exactly what the suite catches — nothing more.** A
regression that no deterministic check covers is invisible here. "No regressions" means the named gates
did not flip; it does **not** mean nothing broke, and it certifies nothing about the feature itself —
that is `/pharn-dev-verify`'s and the human's job.
