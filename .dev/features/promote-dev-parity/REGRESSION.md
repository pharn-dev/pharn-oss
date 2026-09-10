# REGRESSION — promote-dev-parity

**Base:** `ab9aabdf5ea5177713bda2fee82c7220ec559a7c` (working-tree dogfood — `git status --porcelain` was
non-empty, so the base resolves to `HEAD` by the Step-1 membership test, not by choice).

## Inside / outside partition (deterministic — `check-regress.mjs scope`, exit 0)

**Inside (the changed scope), 4 paths:**

- `.claude/commands/pharn-dev-memory-promote.md`
- `.dev/floor/command-hygiene.test.mjs`
- `.dev/features/promote-dev-parity/GRILL.md`
- `.dev/features/promote-dev-parity/PLAN.md`

**`escaped`: `[]`** — the build wrote nothing outside the plan's `## Files`.

**`escape_exempt`** (read, not assumed): `.dev/features/promote-dev-parity/GRILL.md` and
`.dev/features/promote-dev-parity/PLAN.md`. Both are this feature's own stage artifacts, each written by
its own stage under that stage's own Step-0 writes-scope — the exemption `--feature` exists for. The two
**declared** paths are the only real build outputs.

**Outside:** 69 test files (70 total minus `command-hygiene.test.mjs`, which is inside) + 1 committed eval
pair.

**Style gates deliberately SKIPPED** (deterministic optimization, P5): `inside` touches none of
`eslint.config.mjs` / `.prettierrc.json` / `.prettierignore` / `.markdownlint-cli2.jsonc`, so over
byte-identical outside files a style flip is provably impossible. They are absent from **both** maps, so
the gate sets match. This also means no `npm ci` was needed in the baseline worktree.

## Per-gate exit codes

| gate                                                                                          | base | head | result |
| --------------------------------------------------------------------------------------------- | ---- | ---- | ------ |
| `tests` (69 outside test files)                                                               | 0    | 0    | stable |
| `validate` (`pharn/floor/validate.mjs .`, whole-repo — a named granularity limit)             | 0    | 0    | stable |
| `structural:…/expected-injection-comment.json` (vs `.dev/features/trust-fence/findings.json`) | 0    | 0    | stable |

`regressions[]`: **empty** · `pre_existing[]`: **empty**

## One harness error, investigated rather than recorded (L5 / L16 / L21)

The first baseline `tests` run exited **1**. That was **not** a gate result: `outside-tests.txt` had not
been copied into the baseline worktree, so the runner died with `ENOENT: … open 'outside-tests.txt'`. A
red baseline on a repo believed green is a signal to investigate the harness, never a number to record —
had it been recorded, it would have been **equal at base and head** and classified `pre_existing`, masking
a real tests-gate regression rather than reporting one. The list was copied and the gate re-run; the `0`
above is the real value.

A second harness note, recorded for the same reason: this environment's worktree-isolation guard refuses
every `xargs … node` form, including the two the command prescribes literally. The outside-test list was
therefore driven by a fixed-program runner (`node run-tests.mjs`) that reads the same
`outside-tests.txt` and spawns `node --test` with the list. **It preserves both properties the prescribed
line exists for** — the paths arrive as separate argv entries (no shell word-splitting, no `xargs -a`
portability trap), and an empty list is an explicit `exit 2` refusal rather than a whole-repo run (L16).
It is a substitution of mechanism, not of semantics, and it is named here rather than left in a
transcript.

## Verdict (FLOOR — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

The verdict rests entirely on the exit-code comparison; no model judgment enters it. Everything around it
— resolving the base, partitioning inside/outside, running the suite — is **advisory orchestration**.

**Honest residual (P0):** `/pharn-dev-regress` catches **exactly what its suite catches, nothing more**. A
regression no deterministic check covers is invisible here. This is not a statement that nothing broke;
it is a statement that nothing the suite can see broke.
