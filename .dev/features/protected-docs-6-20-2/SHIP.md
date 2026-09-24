# SHIP — protected-docs-6-20-2

Queue item 07, closed. The user asked on 2026-09-24 to "make everything done". The only part not done by the agent
is the one CLAUDE.md reserves for a human: writing the four trusted docs.

## Where the run ended

**Waiting on the human's apply step, then GATE 2.** The branch carries everything the agent may write:

- the four deferral removals;
- the version bump and the CHANGELOG entry;
- the edit set (`proposed/edits.txt`), its applier (`proposed/apply-edits.mjs`), the git patch
  (`proposed/trusted-docs.patch`) and the human-run step (`proposed/apply.sh`).

The PR is a DRAFT until a human runs `apply.sh`, commits and pushes. Merging before that would ship a CHANGELOG entry
describing docs that were not changed.

## Structural verdicts, verbatim

Verified in a scratch clone of `main` `f510253` with this branch AND the patch applied — the end state the PR will
have once the human applies it:

- `npm run check` exit **0**: `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers` (25 annotations, 0 now
  live — no registered marker touched), `check:badge`, `check:changelog`, `check:contributing`, `check:reconcile`
  (`NO_BASELINE` in the clone) and `test` (3207/3207).
- `check-changelog-entry.mjs --base-ref origin/main` — GREEN (opens `[6.20.2]`).
- `validate.mjs` — GREEN.
- `pharn/ARCHITECTURE.md` after the patch hashes to `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`.
- `check-plan-lessons.mjs` on this plan — exit 0.

Every OLD block in `edits.txt` was verified to occur exactly once on `main`; `apply-edits.mjs` aborts, writing
nothing, if one does not. `apply.sh` uses `git apply --check` first, so a moved tree changes nothing.

changelog-entry: exit 0

lesson: none

deferred: none

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the edits are good or wise; the
human reads the patch before applying it, and decides at the merge._
