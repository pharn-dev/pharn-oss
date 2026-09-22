# REGRESSION — gate-run-stamp

**Base:** `51b8f476f1599cb1a6eb3287e6dacc81dc3c1215` (working-tree dogfood → `base = HEAD`, resolved by the
deterministic state test in Step 1, not chosen).

## Partition

- **inside** — 25 paths: the 24 the plan's `## Files` declares, plus this feature's own `GRILL.md` and
  `PLAN.md`, which are written by their own stages.
- **escaped** — **none**. `escape_exempt` lists exactly `GRILL.md` and `PLAN.md`; every one of the 24
  declared paths matched a declared pattern, so nothing was waved through.
- **outside_tests** — 82 test files (the full universe minus the 6 this increment changed).
- **outside_eval_pairs** — 1: `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
  ↔ `.dev/features/trust-fence/findings.json`. Both were confirmed readable **before** their exit code was
  recorded, per the L5 / L16 / L21 input-capture guard — an unreadable path would otherwise red equally at
  both sides and be classified `pre_existing`, masking a real structural-gate regression.

**An orchestration defect caught on the way, recorded because the whole stage is the L5 boundary.** The
first `scope` call reported **three escapes** — `README.md`, `SKILLS_VERSION` and
`architecture-patch/APPLY.md` — all three genuinely declared. The cause was in the **advisory
orchestration**, not the floor: `--declared` had been assembled by an ad-hoc back-tick grep, which picks
up every back-ticked span on a bullet line (a flag name, a heading name) rather than only the leading
path, and was then truncated by a `head -40`. Re-deriving the list through the **canonical** parser —
`pathsFromPlanFiles` in `pharn/floor/plan-files-core.mjs`, the same one the fix #7 setter uses — yielded
24 paths and `scope` exited **0**.

This is **L6** exactly (a structural fact is read from its structured location, never grepped), and it
would have produced a false **blocking** fix#7 finding on a correct build — the **L17** failure mode that
trains an operator to wave through the one finding that must never be waved through. It is also a live
instance of this increment's own thesis one layer up: the floor helper was right throughout; the prose
that fed it was not.

## Gate set

Style gates (`lint`, `format:check`, `lint:md`) were **skipped** by the deterministic config-touch rule:
`inside` touches no shared style config, so a style flip over byte-identical outside files is provably
impossible. They are absent from **both** maps, never from one.

| gate                                           | base | head | classification |
| ---------------------------------------------- | ---- | ---- | -------------- |
| `tests` (82 outside files)                     | 0    | 0    | OK             |
| `validate` (whole-repo)                        | 0    | 0    | OK             |
| `structural:…/expected-injection-comment.json` | 0    | 0    | OK             |

The gate set was decided **once** and applied to both sides; `check-regress.mjs verdict` fails
inconclusive on a key-set mismatch rather than passing silently.

- `regressions[]`: **none**
- `pre_existing[]`: **none** (the baseline was green on all three gates)

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
`pharn/floor/check-regress.mjs verdict` exit **0**, verdict `no-regressions`.

**The honest residual (P0/P7):** `/pharn-dev-regress` catches **exactly what its suite catches — nothing
more.** A regression that no deterministic check covers is invisible here. This certifies the
**comparison**, never that the increment is good; and the comparison's inputs were captured by advisory
orchestration, which is the clock the defect above sat on.
