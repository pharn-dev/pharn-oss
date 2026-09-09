# REGRESSION — writes-scope-default-disclosure

**Base:** `ab9aabdf5ea5177713bda2fee82c7220ec559a7c` (`main`) — resolved by the deterministic state test,
not chosen: `git status --porcelain` was non-empty (a working-tree dogfood build), so `base = HEAD`.

## Inside / outside partition (computed by `check-regress.mjs scope`, not by hand)

**Inside (the changed scope) — 9 paths:**

- `README.md` — the one path the plan's `## Files` declared
- the eight `.dev/features/writes-scope-default-disclosure/*` pipeline artifacts (`PLAN.md`,
  `GRILL.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `SHIP.md`, `regression-report.json`,
  `verify-report.json`)

**`escaped`: `[]` — no scope breach.** The two `.dev/features/<name>/` artifacts appear in
`escape_exempt`, which is the correct classification and not a waiver: each was written by its own
stage under that stage's own Step-0 writes-scope, and `--feature writes-scope-default-disclosure`
exempts exactly that closed filename set. `README.md` is in `declared`, so the build wrote nothing
outside its `## Files`.

**Outside gate set — 3 gates, identical at base and head:** `tests` (70 test files — the whole
committed `*.test.mjs` / `*.test.cjs` universe, since no test file is inside this change),
`validate`, and one committed eval pair
`structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`.

Both eval-pair paths were confirmed readable **before** their exit code was recorded
(`.dev/memory-bank/lessons-learned.md` L5 / L16 / L21 — an unreadable path exits 1 equally at base and
head, which would be classified `pre_existing` and would mask a real structural red rather than
reporting a setup error).

**Style gates (`lint` / `format:check` / `lint:md`) were SKIPPED, deterministically.** `inside` touches
no shared style config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
`.markdownlint-cli2.jsonc`), so over the outside files — byte-identical at base and head — a style
result cannot flip. They are absent from **both** maps, so the gate sets still match. (They were run
anyway at build Step 2b as whole-repo confirmations and were clean; that is orchestration, not this
stage's verdict.)

## Per-gate exit codes

| gate                                           | base | head | result  |
| ---------------------------------------------- | ---- | ---- | ------- |
| `tests` (1683 tests, 0 fail)                   | 0    | 0    | no flip |
| `validate` (`pharn/floor/validate.mjs .`)      | 0    | 0    | no flip |
| `structural:…/expected-injection-comment.json` | 0    | 0    | no flip |

`regressions[]`: **empty** · `pre_existing[]`: **empty**

**Run twice — the second run is the one that stands.** After the GATE-2 decision the bullet was
repaired (REVIEW F1) and this stage was re-run over the final bytes: the partition was recomputed (the
inside set grew from 3 to 9 as the later pipeline artifacts landed; `escaped` stayed `[]`) and the HEAD
gates were re-measured. The BASE map was **not** re-measured and did not need to be: `base` is the
immutable SHA `ab9aabd`, whose gate results cannot change between runs. Stated rather than implied,
because reusing a capture is exactly the kind of shortcut that should be visible.

The `tests` skip count differs between the two runs (1 skipped → 0) for a reason unrelated to the
increment: `node_modules` was absent on the first run, which silently self-skipped
`style: a spliced README passes the repo's prettier and markdownlint unchanged`. The full analysis is
in `VERIFY.md`; the regress verdict is unaffected either way, because the gate exited 0 on both sides
of both runs.

## Verdict (FLOOR — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

The verdict is a comparison of two exit-code maps by `pharn/floor/check-regress.mjs`; no model judged
whether anything "looks broken", and a flipped gate would have been a regression regardless of what any
stage thought of it.

**The honest residual (P0/P7):** `/pharn-dev-regress` catches **exactly what its suite catches — nothing
more.** Breakage outside the feature that no deterministic check covers is invisible here. This
certifies the **comparison**, never that "nothing broke", and never that the increment is whole.

## Orchestration notes (ADVISORY — recorded because they are deviations, not because they change a verdict)

Two mechanical deviations from the command's prescribed orchestration. Neither touches the verdict,
which rests only on the six exit codes above.

1. **The `tests` gate was run as `npm test`, not as `cat outside-tests.txt | xargs node --test`.** The
   prescribed pipeline — and the NUL-separated `xargs -0` variant — were both **refused by this
   session's sandbox**, which will not run `node` with an argument list assembled at runtime. `npm test`
   is the repo's own canonical `tests` gate (the one `npm run check` and `check-verify.mjs`'s gate map
   invoke); it is `node --test` over literal quoted globs that node expands internally, needs no
   `node_modules`, and its universe is **equal** to the 70-path outside list here because no test file
   is inside this change. It is neither of the two forms L5 / L16 forbid (`node --test $LIST` unquoted;
   `xargs -a`, GNU-only), and the same command was used on both sides. Recorded rather than silently
   substituted: L22's point is that a prose-prescribed shell technique accumulates wrong
   implementations, so a deviation from a pinned command line is stated, with its reason.
2. **An untracked `node_modules` SYMLINK was removed before the first run's partition — and that was
   unnecessary, which is worth recording because the precaution had a real cost.** The reasoning was
   that `.gitignore:1` is `node_modules/` (trailing slash), which does not match a symlink, so
   `git ls-files --others --exclude-standard` would list it as a false scope breach. The premise was
   half right and the conclusion wrong: `node_modules` **is** excluded, via the repo's
   `.git/info/exclude:9` (verified live — `git check-ignore -v node_modules` resolves there), so it was
   never going to appear in the partition at all. Removing it cost the `style: a spliced README …` test,
   which self-skips without the toolchain — see `VERIFY.md`. The symlink is restored and the stage was
   re-run with it in place.
