# PROTECTED-FOLLOWUPS — front-grill-concurrent (6.45.0)

These trusted docs are human-only, so this change does not edit them. Neither item below is an overclaim: no sentence
in the four trusted docs says that the full `/pharn-loop` interrogates the plan. Both are **incomplete** after 6.45.0,
because each describes the interrogation as something only the quick runs skip.

## 1. `LIMITS.md §3a` — the unattended quick paragraph (stale by contrast)

**Current text** (in the `/pharn-loop --quick` paragraph):

> It leaves out the regression check, the plan interrogation and `RUN-REPORT.md` (`cost.json` is still
> written).

**Why.** Since 6.45.0 the full `/pharn-loop` also leaves out the plan interrogation. Its grill runs
`/pharn-grill <name> --floor-only` inline: two floor stops, no interrogation, no grillers. The policy cell is in
`pharn/floor/stage-agent-core.mjs` `ROUTE_POLICY`. A reader comparing the two loop modes would still infer that the
full loop interrogates.

**Proposed replacement:**

> It leaves out the regression check and `RUN-REPORT.md` (`cost.json` is still written). Like every `/pharn-loop` run
> since 6.45.0, it does not interrogate the plan: the grill runs its two floor stops only.

## 2. `pharn/ARCHITECTURE.md §6` — the stage table's grill row (optional)

**Current row:**

> | grill | grill-log | findings vs plan |

**Why.** A floor-only grill-log (from `--quick` since 6.25.0, and from `--floor-only` in every `/pharn-loop` run since
6.45.0) holds the two floor results and no findings. The row describes the full `/pharn-grill`, which is still what a
person or `/pharn-ship` runs, so this is a nuance rather than a falsehood.

**Proposed replacement:**

> | grill | grill-log | the two floor stops' results + findings vs plan (findings only when the plan is interrogated — not under `--quick` / `--floor-only`) |
