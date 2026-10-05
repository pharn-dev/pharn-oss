# PROTECTED FOLLOW-UPS — gate-exclusion-config (6.36.0, provisional)

Trusted docs are human-only. This increment does not edit them. It makes one trusted sentence **incomplete**. That
sentence is not an overclaim: the exclusion only removes gates the project itself chose to exclude, and the sentence is
about telemetry. It was already flagged as partly stale by 6.34.0's gate reuse (CLAUDE.md, "HEAD→VERIFY GATE REUSE"),
with no proposed text. The proposal below covers both changes at once.

## 1. `LIMITS.md §5` — "Observability is interrogated at plan time only"

**Current text (`LIMITS.md`, §5, second paragraph):**

> the code. `/pharn-verify` re-runs the project's own gates; if the project has no telemetry test,
> neither does PHARN.

**Proposed replacement:**

> the code. `/pharn-verify` runs the project's own discovered gates, less any the project excludes in
> `pharn.config.json` `gates.exclude` (6.36.0); a gate result can also be reused from the same delivery run's
> `/pharn-regress` (6.34.0). If the project has no telemetry test, or excludes the gate that runs it, neither does
> PHARN.

**Why.** Since 6.36.0 a project can remove a discovered gate, `test` included, from what `/pharn-verify` runs. The
sentence still holds in spirit, because PHARN checks only what the project's own gates check. As written, though, it
reads as "every gate the project has". The replacement keeps the claim's direction and names both ways a gate's result
can differ from a fresh run: it was excluded, or it was reused.

## Considered and not proposed

- **`LIMITS.md §9`** (AC evidence is agreement, not provenance) already lists `pharn.config.json` as agent-editable,
  and says the pin narrows a forgery and never closes it. Both stay true: the `/5` pin adds the exclusion list to what
  is compared, and gives it no new authority. No change proposed.
- **`pharn/ARCHITECTURE.md §6`**, the verify row ("`verdict` from the floor gates' exit codes + the AC gate"), stays
  true. The verdict is still computed from the gates that ran, and the report names the excluded ones.
- **`THREAT-MODEL.md`** has no sentence about gate coverage or `pharn.config.json`'s gate discovery.
