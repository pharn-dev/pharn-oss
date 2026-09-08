# REGRESSION — ship-lesson-extract

**Base:** `HEAD` — resolved by the deterministic state test, not chosen: `git status --porcelain` was
non-empty (4 entries), which is the working-tree dogfood case, so the baseline is the last commit
(`313b20b`) checked out into a detached `git worktree` and removed afterward.

## Inside / outside partition (computed by `check-regress.mjs scope`, not by hand)

**Inside (5):**

- `.claude/commands/pharn-dev-ship.md`
- `.dev/floor/command-hygiene.test.mjs`
- `CHANGELOG.md`
- `.dev/features/ship-lesson-extract/PLAN.md` — `escape_exempt`
- `.dev/features/ship-lesson-extract/GRILL.md` — `escape_exempt`

**Declared (3):** the plan's `## Files` — `pharn-dev-ship.md`, `command-hygiene.test.mjs`, `CHANGELOG.md`.

**`escaped`: `[]` — no scope breach.** The two feature artifacts appear in the diff because
`base = HEAD` puts every uncommitted file there, and each was written by its own stage under that
stage's own Step-0 scope; `--feature ship-lesson-extract` exempts exactly that closed filename set. The
exemption is **read from `escape_exempt`**, not assumed (L17/L20 — the by-hand `--changed` filtering this
replaces).

**Worth recording, because it did not stay hypothetical:** at `/pharn-dev-build` Step 0 the setter parsed
**5 paths against the 3 the human approved** — it had swept `.claude/commands/pharn-ship.md` and
`SKILLS_VERSION` out of the plan's exclusion list, because that list opened with a **bold prose intro
rather than a heading** (L18's defect, recurring exactly as **L20** predicts a discipline-only remedy
will). The over-grant was in the dangerous direction: both swept paths are files the plan explicitly
excludes, and one of them is `SKILLS_VERSION`, which this increment must not bump. It was caught only
because **the setter prints its path count and the count was read** — the same detection L20's own
provenance describes. Remedy applied: the exclusion subsection is now a `### Explicitly not touched`
**heading**, so the setter ends the authorized list **structurally** (Boundary 1) rather than by matching
a prose cue; the re-run parsed **3**.

## Outside gates — `base → head` exit codes

| gate                                                     | base | head | result |
| -------------------------------------------------------- | ---- | ---- | ------ |
| `tests` (69 outside test files, via `xargs node --test`) | 0    | 0    | stable |
| `validate` (`pharn/floor/validate.mjs .`, whole-repo)    | 0    | 0    | stable |
| `structural:…/expected-injection-comment.json`           | 0    | 0    | stable |

`regressions[]`: **empty.** `pre_existing[]`: **empty.**

**RECOMPUTED after the post-review remediation.** `/pharn-dev-review` found a blocking defect
(`not-reached` shipping in two spellings) and it was fixed, plus a closure assertion added — so the files
this comparison covers changed after the first run and its verdict became stale. The partition was
re-derived and the baseline re-captured in a fresh worktree; `escaped[]` is still empty and the five
newly-written feature artifacts (`REVIEW.md`, `VERIFY.md`, `REGRESSION.md` and the two reports) joined
`escape_exempt` exactly as the first two did. Carrying the earlier `no-regressions` forward without
re-running would have been a verdict about a tree that no longer existed.

**Style gates (`lint` / `format:check` / `lint:md`) were SKIPPED, deterministically and not for
convenience.** The skip rule fires only when `inside` touches a shared style config
(`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`); none of the five
inside paths does. Over the outside files — byte-identical at base and head — a style result can flip
**only** if shared config changed, so the flip is provably impossible here rather than merely unlikely.
The gates are absent from **both** results maps, which is what keeps the gate sets identical and the
verdict conclusive. The saved `npm ci` in the baseline worktree is the named benefit (`LIMITS.md §3c`).

Both eval-pair paths were confirmed readable **before** their exit code was recorded, at the baseline and
at HEAD (L5 / L16 / L21): an ENOENT there exits 1 equally on both sides, which `check-regress.mjs` would
classify `pre_existing` — evading a false regression while masking a real structural-gate one. The
`tests` list was expanded through the pinned `cat … | xargs node --test` form, never `node --test $LIST`
(zsh does not word-split) and never `xargs -a` (GNU-only).

## Verdict (FLOOR — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

The verdict is a comparison of exit codes computed by the checker; no judgment of mine entered it, and a
flipped gate would have been a regression whether or not it looked like one.

**The honest residual (P0/P7):** `/pharn-dev-regress` catches **exactly what its suite catches — nothing
more**. A regression no deterministic check covers is invisible to it. This is especially pointed for
**this** increment: its built surface is command **prose**, and the only thing testing that prose is the
wiring set added in the same diff — which is an _inside_ file, so it contributes nothing to this
comparison. "No regressions" here means the **3** outside gates that ran (one of which spans 69 test
files) are unchanged; it does **not** mean
`/pharn-dev-ship` still behaves as it did, because nothing outside the feature was ever able to observe
that.
