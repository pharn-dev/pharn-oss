# Deferred decisions — what the product surface deliberately does not have yet

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before proposing a generated capability catalog for users or a product `/pharn-eval`. `.dev/floor/specified-primitives.json` registers both forward claims below as `check:markers` sites.

## No product capability catalog

- **The capability catalog is DEV-SURFACE ONLY, and that is a recorded decision — not an oversight
  (follow-up `product-capability-catalog`, DEFERRED 2026-08-07).** A PHARN **user** gets no generated
  capability catalog: `capability-catalog-core.mjs` and its generator + drift checker stay in
  `.dev/floor/`, and nothing under `pharn/floor/` renders one. **Why deferred (P7 — an addition is
  triggered by a real failure, never a hypothetical):** no user reported it, no dogfood run failed on
  it, and no trusted doc promises it. **A FOURTH leg has EXPIRED, recorded rather than quietly
  dropped:** it read "the packaging that would create such a user does not exist yet," quoting a
  README sentence (_"no installer, no versioned release you can drop into your own repo"_) that no
  longer exists — the installer is published and working, so such users CAN now exist. The deferral
  stands on the three surviving reasons, and the reopen trigger below is now genuinely REACHABLE
  rather than hypothetical. The
  product surface already takes this posture for the adjacent case — `/pharn-verify` ships the
  verifier plug-in slot with **zero verifiers authored** and defers its live runner until the first
  one lands — so cataloguing capabilities nobody has yet authored would be the speculative half of
  that same pair. Two design questions would also have to be answered first, and neither has a good
  answer today: the `product-lessons-index` precedent puts derived product output in the **gitignored
  `.pharn/` cache**, which leaves a human-readable catalog with **no reader** (the index is different
  — `/pharn-plan` machine-reads it); and a user repo has no `npm run docs:check`, so a ported drift
  guard would have **no invoker** and its byte-equality guarantee would be unreachable. **Reopens
  when** the first `role:`-bearing capability is authored **outside** PHARN's own shipped surface —
  the same trigger `/pharn-verify` names for its verifier runner. Full reasoning and evidence:
  `.dev/features/product-capability-catalog/PLAN.md`.

## No product `/pharn-eval`

- **There is no product `/pharn-eval` twin either, and that is the same recorded decision (DEFERRED
  2026-08-23).** `/pharn-dev-eval` runs a capability's eval live via `claude -p` N times and measures
  structural variance with `.dev/floor/check-variance.mjs`; no `pharn-eval` command exists. **Why
  deferred (P7):** the thing it would measure does not exist on the product surface — variance is
  measured across live runs of a `role:`-bearing capability, and zero have been authored **outside**
  PHARN's own shipped surface, so the runner would have nothing of the user's to run. It also
  inherits the `claude -p` dependency that `/pharn-verify` names as the reason **its** verifier
  runner is deferred. **Not a total absence:** `pharn/floor/check-structural.mjs` already lets a user
  execute an eval's `structural[]` assertions ONCE, so the structural contract is enforceable today —
  only the repeated-run VARIANCE measurement is missing. **Reopens on** the same trigger as the two
  above. This is recorded because the other two are: the absence was consistent with the posture but
  stated nowhere, so a reader could not tell a deliberate deferral from an oversight. Full reasoning:
  `.dev/features/product-eval/PLAN.md` — the `product-*` slug its two peers use. Note it is NOT
  `.dev/features/pharn-eval/`, which is the historical build record for increment 3c (the plan that
  built `/pharn-dev-eval` itself, when the command was still to be named `/pharn-eval`).
