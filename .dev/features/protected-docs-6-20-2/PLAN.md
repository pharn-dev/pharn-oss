# PLAN — protected-docs-6-20-2

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L47]
- increment: Close queue item 07 — bring the four trusted docs up to 6.14.0–6.20.1. The agent may not write them (fix #2), so this increment ships everything else and a human-run patch — `proposed/trusted-docs.patch`, applied by `proposed/apply.sh` — then the PR merges only after a human has applied it.
- layer(s): the four trusted docs (human-applied), the product `.claude/` surface (`pharn-build.md`, `pharn-ship.md`), repo meta (CLAUDE.md, README badge, CHANGELOG, SKILLS_VERSION).
- constitution_refs: [P0, P2, P4, P6]

## Correcting the record (P6)

Measured on `main` = `f510253` (`SKILLS_VERSION` 6.20.1). The edits are item 07's text (sent to the maintainer
2026-09-24), each OLD block verified to occur exactly once on `main`, and applied cleanly to a fresh clone by
`proposed/apply-edits.mjs` (15 edits, 4 files). What is FALSE today, not merely incomplete:

- `pharn/ARCHITECTURE.md` §6: the spine omits `test` (since 6.19.0); "four downstream stages re-verify" (five since
  `/pharn-test`); the literal-`spec_id` sentence misses `AC-TESTS.md` and the lock (since 6.17.0).
- `LIMITS.md` §8: "ten" product stages (eleven since 6.17.0 — replaced by an open form, L47).
- `THREAT-MODEL.md` §4 item 2: a Bash write to a trusted path is "neither denied nor detected" (detected inside the
  anchor→verify window since 4.0.0).
- `pharn/ARCHITECTURE.md` §5: a line dropped by #186 (`3d45a1b`) leaves the seam record's code span unclosed.
- `pharn/CONSTITUTION.md`: "the agent cannot write to" the four docs, unqualified — the claim `LIMITS.md §6` strikes.

## Decisions

a. **Human-applied, by path.** The four trusted docs are hook-protected against the agent's write tools, and
CLAUDE.md forbids working around the hook, so they are NOT in `## Files`: the patch is, and a human runs
`sh .dev/features/protected-docs-6-20-2/proposed/apply.sh`. The PR stays a draft until then.

b. **One PR.** The four sentences in `pharn-build.md`, `pharn-ship.md` and CLAUDE.md that defer to "the pending
protected edit" are removed here, on the same branch — they become false the moment the patch lands, and true
never again.

c. **Bump:** PATCH, 6.20.1 → 6.20.2 — corrections and clarifications to shipped bytes; `LIMITS.md §9` states limits
of behaviour that already shipped. `MIN_CLI` stays 0.5.0. `pharn/ARCHITECTURE.md`'s hash moves from `edc3d07d…` to
`4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`; no dev plan is open.

d. **Verified in a clone, not here.** The full `npm run check` and `check:changelog-entry` run in a scratch clone
with the patch applied — the only place the end state exists before the human applies it. The project's own
reconcile would read the human's write as an escape (it has no attribution), so it is not the verify gate here.

## Files

- `.claude/commands/pharn-build.md` — drop the deferral to the pending edit.
- `.claude/commands/pharn-ship.md` — drop the two deferrals.
- `CLAUDE.md` — drop the deferral in "The pipeline spine".
- `README.md` — the badge.
- `CHANGELOG.md` — `[6.20.2]`.
- `SKILLS_VERSION` — 6.20.2.
- `.dev/features/protected-docs-6-20-2/PLAN.md` — this plan.
- `.dev/features/protected-docs-6-20-2/SHIP.md` — the ship record.
- `.dev/features/protected-docs-6-20-2/proposed/edits.txt` — the OLD→NEW blocks (the reviewable source).
- `.dev/features/protected-docs-6-20-2/proposed/apply-edits.mjs` — applies them, each OLD exactly once.
- `.dev/features/protected-docs-6-20-2/proposed/trusted-docs.patch` — the same edits as a git patch.
- `.dev/features/protected-docs-6-20-2/proposed/apply.sh` — the human-run step.

### Human-applied — NOT written by the agent

`pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md`.

## Evals to write (P1)

None: no capability or checker behaviour changes. `check:markers` must stay GREEN with the patch applied (no
registered marker is touched), and the full suite must stay green.

## Applied lessons

- L47: `LIMITS.md §8` and the §6 Keystone take open forms ("each product stage", "every downstream stage from `grill`
  to `verify`") instead of new counts that the next stage would make false.

## Open questions (HALT)

None.
