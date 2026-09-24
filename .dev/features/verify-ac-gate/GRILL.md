# GRILL — verify-ac-gate

- plan: `.dev/features/verify-ac-gate/PLAN.md`
- chain: `spec_content_hash` edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c = sha256(`pharn/ARCHITECTURE.md`) — GREEN
- lessons: `node pharn/floor/check-plan-lessons.mjs .dev/features/verify-ac-gate/PLAN.md .dev/memory-bank/lessons-learned.md` — GREEN (11 ids, each referenced in the body)
- grillers: one adversarial reader over the plan, the brief and the live code it changes (checkers, contracts, the verify / loop / test commands), read-only.
- verdict: **RED → amended.** One blocking finding and eight should-fix/notes. Every one is folded into the plan's
  `## Amended after grill` section, which supersedes the original decisions where they differ. The build started on
  the parts no finding touched (the pin module, the lock's schema) while the grill ran; the amendments were applied to
  them afterwards.

## Findings and dispositions

1. **BLOCKING — S13 was unreachable for the brief's main case.** In the real loop, the pinned freshness line
   (`check-loop-fresh.mjs` with `--iter <N>` and `--front`) runs before `check-loop.mjs` (`pharn-loop.md` Step 5.3).
   Its check I runs `check-test-stage.mjs` with `--require-test-first`, which runs the lock's `--check` with
   `--require-red-run`, which REDs an edited pinned test. That was `front-stage-red` → S11. So a Bash-edited pinned
   test ended `blocked: stale-evidence`, never `blocked: ac-evidence-invalid`, and a verify→`check-loop.mjs`-only e2e
   test would have passed over the wrong behaviour (L45). **Fixed (G1):**
   - check I's test-stage failure carries its own closed code, `ac-evidence-invalid`, and Step 5.3 maps it to S13;
   - `check-loop.mjs`'s `terminal_cause: ac-evidence` maps to S13 too;
   - S13 is recorded as one ordinary blocked stop on both routes;
   - the e2e test runs the pinned freshness line first.
2. **"Re-run /pharn-test" cannot work after the build.** The red run then reads `ac-test-passes-before-build`, and a
   6.19 feature on a `/2` lock would fail every verify. **Fixed (G2):** the remedy sets the build aside first, and the
   migration cost is stated.
3. **`/2` bootstrap locks would crash the test-first path** (`schema === SCHEMA` keyed the branch). **Fixed (G3):**
   branch on `modeOf`, plus fixtures.
4. **An explicit `--gates` verify stamp, or `pre`/`post` scripts, bypass the pin.** **Fixed (G4):** the gate requires
   the pinned command for every level gate it reads, and the pin records `pre<id>` / `post<id>`. Script chaining is
   named as not caught.
5. **A removed `spec_template` key silently skips the gate; an unmapped AC loops to the cap.** **Fixed (G5):**
   - a legacy SPEC beside AC evidence is `ac-tests-modified`;
   - an unmapped AC is `ac-never-red`;
   - a SPEC pin that is not the lock's is `ac-tests-modified`.
6. **Check E now depends on the live tree, so staleness would read as fabrication (L58).** **Fixed (G6):** E defers to
   F when the tree moved, and J re-hashes the per-test results files.
7. **Wiring the plan did not name.** **Fixed (G7):**
   - `ac_gate` joins verify's verbatim fields and its pin;
   - the rebuild receives `ac_gate.acs[]` as DATA;
   - the `failing_gates` definition is amended;
   - `VERIFY.md` fences the rows;
   - the S13 prose is updated everywhere it is counted.
8. **Two trust claims become false under `--ac-gate`.** **Fixed (G8):** both are rewritten.
9. **Note: one flaky or duplicate test anywhere makes verify INCONCLUSIVE.** **Stated (G9)** in the contract and the
   README.
10. **Notes.** **Fixed (G10):**
    - `SHIP.md` cites the code-rendered table rather than retyping it, recorded as a deviation;
    - `specVerdict` moves to `spec-template-core.mjs`;
    - `RESERVED_IDS`'s comment is updated;
    - the reason partition is closure-tested.

## Delegated decision

The options halt (decisions a–h) and this grill's dispositions were approved under the maintainer's overnight
delegation for this queue ("you have to approve everything"), recorded in `SHIP.md`.
