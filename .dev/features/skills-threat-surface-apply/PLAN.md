# PLAN — skills-threat-surface-apply

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487
- applied_lessons: [L1, L19]
- increment: record the version consequence of applying `skills-threat-surface`'s staged patches —
  `SKILLS_VERSION` 6.3.0 → 6.3.1 and the matching `CHANGELOG.md` entry — as the separate, declared act
  the parent plan deliberately deferred to the applier.
- layer(s): none (root meta-docs; no capability, no floor checker, no command)
- constitution_refs: [P0, P6, P7]

## Why this is a SEPARATE increment and not an edit to the parent plan

`.dev/features/skills-threat-surface/PLAN.md` states the bump is **"owed by the APPLIER, not by this
increment"** and excludes `SKILLS_VERSION` / `CHANGELOG.md` from its `## Files` on purpose. Adding them
to that plan now, after the fact, would rewrite a plan's `## Files` to retroactively authorize a write —
the exact shape `pharn/floor/check-regress.mjs` names as the detection it gives up, and a
self-authorization this repo's whole scope model exists to prevent. Declaring them **here**, before the
write, is the honest route: a reader can see which plan authorized which path.

The human applied the three patches at the post-review gate; that act is what makes this increment's
work owed and real (P7 — a triggered addition, not a speculative one).

## Applied lessons

- **L1** — a plan must scope the meta-docs an increment invalidates. This increment **is** that sweep,
  discharged for the parent: applying the patches changed product-surface bytes (`THREAT-MODEL.md`,
  `LIMITS.md` — two of the four trusted docs), which `CLAUDE.md` puts squarely in the bump-triggering
  set, so `SKILLS_VERSION` and `CHANGELOG.md` are named in `## Files` rather than left to be remembered.
- **L19** — a stage's Bash-run tooling escapes the `writes:` scope. Observed live in this very sequence:
  the human's `git apply` wrote `.dev/floor/specified-primitives.json` through Bash, and
  `check-bash-reconcile.mjs` reported it as a blocking escape (`denied_by: writes-scope (fail-closed
default)`) because `.dev/floor/` is `always_reconciled` against its committed blob. That is the
  checker working, not a false alarm — it is resolved by **committing** the change, never by editing the
  baseline. This increment's own two writes go through the guarded tool surface under the scope declared
  below, so they add no second escape.

## Files

- `SKILLS_VERSION` — `6.3.0` → `6.3.1` — layer: root meta-doc
- `README.md` — the shields badge at `:24`, `pharn-6.3.0-blue` → `pharn-6.3.1-blue` — layer: root meta-doc
- `CHANGELOG.md` — one `[Unreleased]` entry recording the applied surface + the bump — layer: root meta-doc

**`README.md` is in this list because the floor said so, not because it was remembered.** Probed live
before scoping (L37): `README.md:24` carries `[![pharn](https://img.shields.io/badge/pharn-6.3.0-blue)]`,
and `check-version-badge.mjs` holds it to string equality with `SKILLS_VERSION`. Bumping the version file
alone turns that gate RED. This is exactly the defect class the badge checker was built for — a value
stored twice whose only remedy would otherwise be "remember to update it".

**Not written by this increment:** `THREAT-MODEL.md`, `LIMITS.md`,
`.dev/floor/specified-primitives.json` (all three already applied by the human from the parent
increment's staged patches); `MIN_CLI` (no installed path moves); any command, checker or capability.

## Contracts satisfied

- None. No `pharn-contracts` schema is added, changed or instantiated.

## Evals to write (P1) — `none`, and explicitly why

**`none`.** P1 binds **Capabilities** — a `.md` file whose frontmatter carries `role:`
(`pharn/ARCHITECTURE.md §3.1`). This increment writes a bare version string and a changelog paragraph;
neither is a capability, neither declares `enforces`, so no `rule_id`→eval binding (fix #6) arises.
Stated rather than omitted, so an absent section and a reasoned `none` do not look alike.

## Guarantee audit (P0)

- **"The bump size is correct"** → **ADVISORY.** `patch` is a judgement that the applied change is a
  correction/clarification to bytes that already shipped rather than a new capability or a shape change.
  No checker reads bump _size_; `check-version-badge.mjs` only holds the README badge and
  `SKILLS_VERSION` to string equality, and `check-skills-version-recorded.mjs` only that the version is
  recorded in `CHANGELOG.md`. Both are satisfied by any self-consistent pair, including a wrong one.
- **"The badge and `SKILLS_VERSION` agree after the bump"** → **FLOOR: enum-regex**
  (`check-version-badge.mjs`, exit code). **This is the load-bearing one for this increment**: the badge
  lives in `README.md`, so bumping `SKILLS_VERSION` alone turns that gate RED — the bump is therefore
  an atomic edit across both, or neither. Verified by running the gate, not by reading it (L37).
- **"This increment writes only the three declared files"** → **FLOOR: hook (fix #7)**, scope set from
  this plan's `## Files`.
- **"The CHANGELOG entry is accurate"** → **ADVISORY.** Nothing reads its prose.

## Trust audit (P2)

No untrusted artifact is ingested. Inputs are this repo's own trusted docs and its version files; the
increment writes a version string, a badge string and human-readable prose. No taint enters either file.

## Determinism audit (P5)

Both branches are exit codes: `check-version-badge.mjs` (badge == `SKILLS_VERSION`) and
`check-skills-version-recorded.mjs` (the version appears in `CHANGELOG.md`). The terminal fallback, if
the bump size is genuinely ambiguous, is **ask the human** — which is how `patch` was settled here.
