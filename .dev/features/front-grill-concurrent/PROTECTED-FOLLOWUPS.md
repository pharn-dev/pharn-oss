# PROTECTED-FOLLOWUPS — front-grill-concurrent (6.45.0)

These trusted docs are human-only, so this change does not edit them. No item below is an overclaim: no sentence in
the four trusted docs says that the full `/pharn-loop` interrogates the plan. Each is **incomplete** after 6.45.0. Items
1–2 describe the interrogation as something only the quick runs skip. Items 3–4 (added at the independent review,
R2) name a griller whose judgment half no longer runs in an unattended loop, where only its deterministic scanner
runs (`pharn/floor/grill-scan.mjs`).

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

## 3. `LIMITS.md §5` — "Observability is interrogated at plan time only" (incomplete for the loop)

**Current text:**

> The consequence, stated plainly: **a plan may declare telemetry, pass the grill, and the diff that
> results may wire none — with every floor green.**

**Why.** Since 6.45.0, an unattended `/pharn-loop` grill runs the observability scanner only (`grill-scan.mjs`). The
observability griller's judgment of whether telemetry is needed or adequate does not run. In that loop a plan "passes
the grill" without any judgment of its telemetry at all, which the section's limit does not say.

**Proposed replacement:**

> The consequence, stated plainly: **a plan may declare telemetry, pass the grill, and the diff that
> results may wire none — with every floor green.** Under an unattended `/pharn-loop` (since 6.45.0) the grill runs
> only the observability scanner, not the griller's judgment, so there the plan's telemetry is not judged at all.

## 4. `THREAT-MODEL.md §1` — threat model A names the security griller (incomplete for the loop)

**Current text:**

> - **Threat model A — does the app PHARN _builds_ defend itself.** OWASP LLM Top 10 in the _user's
>   product_: prompt injection, output handling, unbounded consumption. This is **methodology
>   delivered to the user** — the security griller and the (deferred) AI/LLM-security lens.

**Why.** The security griller is still delivered, and `/pharn-ship` and a direct `/pharn-grill` run it. Since 6.45.0,
an unattended `/pharn-loop` runs only its deterministic secret scanner (`scan-plan-secrets.mjs`, through
`grill-scan.mjs`). Its judgment half (authorization on sensitive operations, injection surfaces, untrusted input)
does not run there.

**Proposed replacement:**

> - **Threat model A — does the app PHARN _builds_ defend itself.** OWASP LLM Top 10 in the _user's
>   product_: prompt injection, output handling, unbounded consumption. This is **methodology
>   delivered to the user** — the security griller (in an unattended `/pharn-loop`, since 6.45.0, only its
>   deterministic secret scan) and the (deferred) AI/LLM-security lens.
