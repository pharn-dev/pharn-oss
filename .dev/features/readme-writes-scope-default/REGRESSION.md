# REGRESSION — readme-writes-scope-default

- verdict: **`no-regressions`** (see `regression-report.json`)
- base: `914f57e` (`origin/main`), measured in this worktree with the tree stashed
- head: the working tree of `fix/readme-writes-scope-default`

## Base -> head, every gate in `scripts.check`

| gate                 | base | head | flip |
| -------------------- | ---- | ---- | ---- |
| `format:check`       | 0    | 0    | no   |
| `lint`               | 0    | 0    | no   |
| `lint:md`            | 0    | 0    | no   |
| `docs:check`         | 0    | 0    | no   |
| `check:markers`      | 0    | 0    | no   |
| `check:badge`        | 0    | 0    | no   |
| `check:changelog`    | 0    | 0    | no   |
| `check:contributing` | 0    | 0    | no   |
| `test`               | 0    | 0    | no   |

`npm test`: 1931/1931 pass at base, 1931/1931 at head — 0 failed, 0 skipped in both.

## Two measurement notes, recorded because each would otherwise look like a discrepancy

**1. The first baseline attempt was self-polluted.** Taken with this run's own `PLAN.md` already on disk, it
reported `format:check=1`. The offender was that file alone (`prettier --check` named it) — a RED this run
introduced, not a property of the base. It was repaired by the prescribed **scoped** formatter
(`npx prettier --write <this stage's artifacts>`, never the repo-wide `npm run format` — **L19**) and the
baseline was re-measured by stashing the tree. The table above is the re-measured one.

**2. The run was REBASED twice mid-flight, and every number above is post-rebase.** `main` moved
`4bd1b0c` -> `d851a08` (PR 206, PR 207) and then `d851a08` -> `914f57e` (PR 210) while this increment was in
the chain. That forced three corrections rather than a mechanical replay: PR 206 had already taken
`SKILLS_VERSION` to `3.1.2` and PR 210 to `3.2.0`, so this increment ships as **`3.2.1`**; and PR 206
promoted an `L38` **and** an `L39`, so the lesson this run proposed was renumbered **L38 -> L39 -> L40**,
with the final id derived programmatically from the highest `## L<n>` heading in canon rather than assumed,
after the first assumption tripped a fail-closed assertion. The first move was handled by rebuilding the
branch on main's current bytes rather than resolving conflicts, so PR 206's README repairs are preserved
intact; the second was a real rebase whose only conflicts were the badge and `SKILLS_VERSION`. **The defects
this increment fixes survived both moves untouched** — main's bullet was verified byte-identical to the
original before each rebase.

**A related observation, corrected rather than left standing.** Earlier in the run the primary checkout at
`/Users/pgalarowicz/Projects/pharn-oss` was found at `d851a08` with `format:check`, `lint:md` and `test`
RED, and was not used as a baseline. That commit measures **fully GREEN** here, so those REDs were local
state in that checkout, **not** a property of `main`. Recorded because the earlier draft of this file
implied the latter.

**Bound (P0):** `no-regressions` means _"no gate green at base is red at head"_ — nothing wider.
