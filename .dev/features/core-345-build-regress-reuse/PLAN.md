# PLAN — core-345-build-regress-reuse

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L43]
- increment: Decide CORE-345 (offer the build's full-gate `test` run to regress HEAD?) — the decision is NO under
  CORE-89's identity and fingerprint rules; record the reason where CORE-89's bound is stated (doc-only, patch bump).
- layer(s): pharn-contracts (gate-run-record.md), product floor (gate-reuse-core.mjs header comment), dev guide
- constitution_refs: [P0, P6, P7]

## Applied lessons

- L43 — the decision is grounded on the referent, not on the agreement of copies: the two stamps' recorded
  fingerprints disagree, and the run2 transcript shows WHICH write made them disagree (BUILD.md, 17 s after the last full-gate
  call, 9 s before regress). The recorded text also keeps CORE-89's own bound: a reuse HIT would prove agreement of
  bound inputs, never that the executions are the same.

## The question (Linear CORE-345)

CORE-310 run2 (pharn-app at 7.22.0) ran the whole `test` suite twice back to back: the build's full gates (327.7 s,
`pharn/.run/pharn-build/profile-todo-cleanup/full/stamp.json`) and regress HEAD (383.3 s,
`pharn/.run/pharn-regress/head/stamp.json`); verify then reused regress HEAD (CORE-89). Can the build's run be offered
to regress HEAD "under the same identity and fingerprint rules as the regress → verify reuse"?

## Discovery (read this run)

Committed evidence `.dev/features/core-310-real-loop-record/evidence/run2.json` (`members["run-state/…"]`), compared:

| field               | build full `test`               | regress HEAD `test`                          |
| ------------------- | ------------------------------- | -------------------------------------------- |
| argv / files        | `npm run test` / `[]`           | `npm run test` / `[]` + 1240 `compare_files` |
| head                | `8c896454…`                     | `8c896454…`                                  |
| timeout             | 540000 (both stage lines)       | 540000                                       |
| fingerprint algo    | `worktree-fingerprint/3+sha256` | same                                         |
| `fp_before`         | `a234ec98…`                     | **`bc340bab…`**                              |
| `identity_sha256`   | `d0489fcf…`                     | **`863c49f3…`**                              |
| results file digest | `afa7b409…`                     | `1d21e041…`                                  |

The ticket's premise "nothing was written between the build's full gate run and regress HEAD" does not hold. The raw
transcript (`~/Projects/pharn-measure/core-310/run2/transcripts/`) orders the tool calls: the last
`build-gate.mjs --mode full` call at 12:51:10, the build's Step 5 `Write` of
`pharn/features/profile-todo-cleanup/BUILD.md` at 12:51:27, regress's `stage-direct.mjs --stage pharn-regress` at
12:51:36. `BUILD.md` is in `worktree-fingerprint.mjs` `INCLUDED_ARTIFACTS` (a pre-gate artifact the fingerprint
hashes on purpose — the reconcile/fingerprint divergence L39 describes). So the build's run judged a different tree, its
execution identity differs, and CORE-89's existing rule (`gate-reuse-core.mjs` `findReusable`, `identity-mismatch`)
would MISS it even if it were offered. That is not run-specific: `.claude/commands/pharn-build.md` writes `BUILD.md`
in Step 5, after Step 4's full gate, by construction (it records that gate's result), on every build.

## Decision (model decision under the orchestrator's delegation)

**Not offered. No new reuse path ships.** Reasons, in the order they decide:

1. **The trees differ, every time** (above). Under the same identity and fingerprint rules the offer can never hit in a
   normal pipeline, so shipping it would be a mechanism with no possible hit — a speculative addition (P7).
2. **Making it hit needs a WEAKER rule than CORE-89's, rejected:**
   - moving `BUILD.md` to `EXCLUDED_ARTIFACTS` bumps `ALGO` for every stamp, and stops `check-loop-fresh.mjs` G (regress
     HEAD `final` == verify `init`) from seeing a `BUILD.md` edit between regress and verify; whole-tree style gates and
     any test that walks `pharn/features/**` read it;
   - a build-only "fingerprint minus BUILD.md" equivalence is a new identity rule, not CORE-89's, with a new unbound
     input (a suite reading BUILD.md);
   - writing `BUILD.md` before the gate is impossible: it records the gate's result.
3. **Secondary, each sufficient to need new mechanism even if the trees matched:** the build stamp is not offered
   through any git-dir record (`head-reuse-offer.mjs` exists because a `pharn/.run/` stamp alone must never be
   trusted, grill B2), a build-full run carries no `compare_files` (regress's per-test comparison set), and
   `REUSE_PAIRS` would need a third row (`regress/head ← build`) with its own derived-stamp shape.

Reopen condition, written down with the reason: a build whose Step 5 record leaves the fingerprinted tree unchanged
(for example, the build record moved out of the fingerprinted set by a decision that also answers check-loop-fresh G).

## Files

- `pharn/floor/gate-reuse-core.mjs` — header comment only: a "NOT A SOURCE — the build's full gate run (CORE-345)"
  paragraph beside THE ONE EXCEPTION; no code change — product floor
- `pharn/pharn-contracts/gate-run-record.md` — one bullet in "One execution of `test` for regress and verify" (CORE-89's
  bounds) stating why the build's full run is not a regress HEAD source, with the run2 evidence and the reopen
  condition — pharn-contracts
- `.dev/guides/floor-gates.md` — one line in the "Head→verify gate reuse" block pointing at the decision — dev guide
- `SKILLS_VERSION` — 7.23.0 → 7.23.1 (patch: prose correction/clarification of shipped bytes)
- `CHANGELOG.md` — `## [7.23.1]` section with this entry
- `README.md` — the version badge (`check:badge`); the generated region only if `docs:generate` moves it
- `pharn-install.json` — regenerated by `npm run docs:generate` (installed-file hashes + version)

## Contracts satisfied

- gate-run-record.md "Reused entries" / the closed reuse matrix — unchanged; `REUSE_PAIRS` keeps exactly two rows.

## Evals to write (P1)

- None: no capability, rule or code changes. The existing tests stay the regression suite; the comment and contract
  bullet change no behaviour (`npm test` and `validate` must stay green).

## Guarantee audit (P0)

- "the build's full run would miss under CORE-89's rule" → advisory reading of the floor rule over measured stamps
  (the identity includes `fp_before`; enum/hex equality is the floor op, but no new check is added and none is claimed).
- "BUILD.md is written after the full gate on every build" → advisory (command order in `pharn-build.md` Step 4 → 5;
  nothing enforces the order).
- No new guarantee is claimed. The surface-bump check (`check:surface-bump`) is the floor that the patch bump exists.

## Trust audit (P2)

- The run2 transcript and stamps are deterministic-tool and model output from another project, read as DATA; only
  timestamps, digests and paths are quoted.

## Open questions (HALT)

- none — the decision is delegated to this agent by the orchestrator (GATE 1 is the orchestrator's).
