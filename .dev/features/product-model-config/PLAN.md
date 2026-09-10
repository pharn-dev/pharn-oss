# PLAN — product-model-config

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299
- applied_lessons: [L6, L15, L19, L20, L29, L31, L33, L34, L35, L36]
- increment: Make `pharn.config.json`'s `models.stages` block the deterministic, floor-checked source of
  truth for the **product** commands' platform `model:` / `effort:` frontmatter, and state the exact
  mechanism — and its two real bounds — honestly.
- layer(s): product floor (`pharn/floor/`) + product `.claude/` surface + repo meta + dev apparatus
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Discovered mechanism (P6 — read live this run, never asserted from memory)

Read live at <https://code.claude.com/docs/en/slash-commands> (the canonical frontmatter field table)
and cross-checked against this repo's own files:

- **Only static command frontmatter is supported.** `model:` and `effort:` are real, platform-honored
  frontmatter fields on a command/skill. `model:` accepts the `/model` values (`sonnet`, `opus`,
  `haiku`, `fable`, a full `claude-*` id, or `inherit`); `effort:` accepts
  `low | medium | high | xhigh | max`.
- **There is no runtime routing mechanism.** Nothing lets a command read a JSON file and switch the
  model for itself, and nothing in this repo reads `pharn.config.json` at run time. So option 2 of the
  brief ("if runtime routing is possible") does **not** apply, and faking it is refused (P0).
- **Two platform bounds that must never be papered over** (both stated at the field's own
  documentation, both reproduced in the checker header, README, and CHANGELOG):
  1. **Turn scope.** The override "applies for the rest of the current turn". So it takes effect when a
     human invokes the stage command **directly** (`/pharn-plan`). A stage invoked as a _step inside_
     `/pharn-ship` or `/pharn-loop` runs in the **orchestrator's** turn, so those stages do **not** get
     per-stage routing.
  2. **Platform veto.** A value excluded by an organization's `availableModels` allowlist is not used,
     and in auto mode a model auto mode does not support is not used; in both cases the session keeps
     its current model — silently.

Therefore this increment implements the brief's option 3: **config is the source of truth; a
deterministic checker REDs on drift; the product frontmatter is written to match.**

## Applied lessons

- **L6** — every membership fact here is read from a **structured location**, never grepped: the stage
  set from `models.stages` via `JSON.parse`, and `model:` / `effort:` from the `---` frontmatter fence
  via the same line parser `.dev/floor/check-config.mjs` already uses (so `model_tier:` — a different,
  PHARN-internal key the platform ignores — can never be mistaken for `model:`).
- **L15** — stage resolution is the own-property pick
  `Object.hasOwn(stages, s) ? stages[s] : stages.default`, never `||` / `??`. Resolving `toString` or
  `__proto__` must fall back to `default`, never leak an inherited prototype member as
  `{model: undefined}` at exit 0. Pinned by a test over five prototype keys.
- **L19** — `npm run docs:generate` and the formatters write through **Bash**, outside the fix #7
  `PreToolUse` gate. Declared here as a named, accepted side effect rather than pretended to be gated;
  `README.md` and `docs/**` are in `## Files` anyway for their hand-edited parts.
- **L20** — the trigger bar. The defect this checker prevents ("someone edits the config and forgets the
  ten command files, or edits a command file and forgets the config") has exactly the shape L20 names:
  a remedy that reduces to _remember to update it_. The `check-version-badge` and
  `check-contributing-gates` precedents fired on the same lesson, so a checker is the sanctioned remedy
  here — **but only after L35's prior question is answered** (below).
- **L29 / L34 / L36** — the **enumeration is the deliverable**. `PRODUCT_STAGES` is a materialized,
  closed stage→command map that every pass iterates; a scan that discovers **zero** product commands is
  a loud RED, never a vacuous GREEN; and the reverse pass closes the set (an unmapped product command
  that carries `model:` / `effort:` is RED) rather than merely asserting presence over the members its
  author happened to list.
- **L31** — this checker is **deliberately NOT a copy-pair twin** of `.dev/floor/check-config.mjs`. It
  is a different checker: a different stage→command map, a different filename prefix
  (`pharn-<stage>.md`, never `pharn-dev-<stage>.md`), and a different fresh-install posture. It
  therefore carries a **distinct basename** (`check-model-config.mjs`) so no reader mistakes it for the
  `check-provenance` / `lessons-index-core` style copy-pair, and no ✧ shared-constant obligation set is
  implied where none exists.
- **L33** — the README's `## Current limitations` bullet _"Per-stage model routing is not wired yet …
  Treat the block as reserved, not as a control"_ **expires the moment this lands**. It is rewritten in
  this increment as a **dated, mechanism-naming** statement of what is now true and what is still not,
  rather than deleted or left to the next reader.
- **L35** — asked _"must the second copy exist?"_ **before** reaching for a sync check, because L20 read
  alone sends you to build a checker every time. Answer, and it is the load-bearing decision of this
  plan: **yes, both copies must exist.** The frontmatter copy is mandatory — it is the only copy the
  platform reads. The config copy is mandatory too — it is the one place a user tunes all ten stages,
  and the installer already validates and prints it. Neither can be drained the way `package.json`'s
  `version` was. That puts this in **L31**'s regime (copies that must both exist → build the thing that
  ranges over them), not L35's (drain the redundant copy). The rejected alternative is recorded below.

## Files

- `pharn/floor/check-model-config.mjs` — NEW product floor checker: `validate` | `resolve <stage>` | `agreement` — layer product floor
- `pharn/floor/check-model-config.test.mjs` — NEW black-box tests, incl. a live agreement run over the real repo — layer product floor (test; never ships)
- `pharn.config.json` — `models.stages` extended to the ten product stage keys + `default` — layer repo meta
- `.claude/commands/pharn-spec.md` — add `model:` / `effort:` matching config stage `spec` — layer product commands
- `.claude/commands/pharn-plan.md` — add `model:` / `effort:` matching config stage `plan` — layer product commands
- `.claude/commands/pharn-grill.md` — add `model:` / `effort:` matching config stage `grill` — layer product commands
- `.claude/commands/pharn-build.md` — add `model:` / `effort:` matching config stage `build` — layer product commands
- `.claude/commands/pharn-regress.md` — add `model:` / `effort:` matching config stage `regress` — layer product commands
- `.claude/commands/pharn-verify.md` — add `model:` / `effort:` matching config stage `verify` — layer product commands
- `.claude/commands/pharn-ship.md` — add `model:` / `effort:` matching config stage `ship` — layer product commands
- `.claude/commands/pharn-loop.md` — add `model:` / `effort:` matching config stage `loop` — layer product commands
- `.claude/commands/pharn-review.md` — add `model:` / `effort:` matching config stage `review` — layer product commands
- `.claude/commands/pharn-memory-promote.md` — add `model:` / `effort:` matching config stage `memory-promote` — layer product commands
- `.dev/floor/check-config.mjs` — scope the DEV agreement to a closed `DEV_WIRED` set — layer dev apparatus
- `.dev/floor/check-config.test.mjs` — pin the narrowing in both directions — layer dev apparatus
- `README.md` — rewrite the expired routing limitation; shields badge; the `CURRENT-STATE` region is regenerated, never hand-edited — layer repo meta
- `SKILLS_VERSION` — `3.1.1` → `3.2.0` (minor: a newly shipped product floor checker + changed product command bytes) — layer repo meta
- `CHANGELOG.md` — one `[Unreleased]` entry naming the bump, the mechanism, and both platform bounds — layer repo meta
- `CLAUDE.md` — document the new checker in `## Commands` — layer dev apparatus

### Deliberately NOT in this increment

- **No generator.** A `gen-command-models.mjs` that rewrites the ten frontmatters from config would be
  the strongest L35-compatible answer (a _generated_ copy is a rendering, not a maintained identity).
  It is rejected here on scope, not on principle: it would have to write into `.claude/commands/**` —
  the zone the writes-scope guard treats as sensitive — and the brief asks for a checker. Recorded so
  the absence is a decision, not an oversight.
- **No new floor primitive.** This is primitive #3 (enum / regex / equality between two repo files),
  reused.
- **No new npm script, no new CI step, no `CONTRIBUTING.md` gate name.** The repo already gates the
  **dev** twin `.dev/floor/check-config.mjs` exactly one way — a live `agreement` run inside its own
  `*.test.mjs`, which `npm test` runs, which `npm run check` and CI both run. The product checker is
  wired the same way, in `pharn/floor/check-model-config.test.mjs`. Adding a parallel
  `check:models` script would create a fourth wiring identity (script + chain + CI step +
  `check-contributing-gates` token) for a fact the existing invoker already computes — the cost **L35**
  charges and **L20** does not. Asymmetric wiring between the two twins would also be its own drift.
- **No runtime routing, and no simulation of it.** See `## Discovered mechanism`.
- **No `model:` / `effort:` added to any `pharn-dev-*` command.** `pharn-dev-plan` / `-build` /
  `-review` keep exactly the three they already carry.
- **No edit to any of the four trusted docs.**

## Guarantee audit (P0)

- **"`pharn.config.json` and the ten product commands agree on `model:` / `effort:`"** → **FLOOR**
  (primitive #3): a deterministic equality between two repo files, computed by
  `pharn/floor/check-model-config.mjs agreement`, invoked live from its own test file — so `npm test`,
  `npm run check` and CI all fail on drift.
- **"a stage RESOLVES deterministically, including the `default` fallback"** → **FLOOR** (own-property
  membership pick, L15).
- **"the stage actually RUNS under the resolved model/effort"** → **ADVISORY**, and this is the whole
  P0 line of the increment. The platform applies `model:` / `effort:`; no hook, hash or enum can observe
  that it did. It is additionally bounded twice — the override lasts one **turn** (so a stage invoked
  from inside `/pharn-ship` or `/pharn-loop` does not get it), and an organization allowlist or auto
  mode can silently decline the value. **"check-model-config GREEN" must never read as "the stage ran
  on opus."**
- **"a user's install is governed"** → **NARROWED, and stated.** The checker is GREEN by design when the
  target has no `pharn.config.json` or no `models.stages` — the honest normal state of an install that
  does not use the block (the `check-lessons-index` `NO_CANON` / `COLD` precedent). Consequently a user
  who deletes the block loses the check rather than failing it.

## Open questions (HALT)

None. The brief fixes the stage-key mapping, the product boundary, and the versioning rule; the
mechanism was read live rather than assumed.
