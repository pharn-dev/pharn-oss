# BUILD — front-grill-concurrent (6.45.0)

**What landed.**

- **Policy.** `ROUTE_POLICY["pharn-loop"].full["pharn-grill"]` changed from `agent` to `floor-only`, and its
  `INVOCATIONS` entry was removed. The header of `pharn/floor/stage-agent-core.mjs` records the reason, as the policy's
  owner.
- **`/pharn-grill <name> --floor-only`.** A new mode: `--quick` without the kind eligibility check.
- **`/pharn-loop` Step 4.** The grill now runs inline. It keeps a stage-start marker without `--route` and an
  orchestrator return, with no route, brief or read line. Its two floor stops are the loop's only grill read: either
  RED is S9, and neither checker runs a second time.
- **Loop quick part.** Item 3 no longer has a route line.
- **Loop close part.** The honest line and the struck claims now say the plan was not interrogated.
- **`/pharn-ship` Step 2.** The grill's two-stop verdict block now runs before the grill route line. A STOP quotes the
  checker's RED line. The dropped post-grill lessons re-read is stated as a bound. Quick mode skips the block.
- **Prose.** `README.md` and the routing paragraph in `CLAUDE.md` are updated. `PROTECTED-FOLLOWUPS.md` covers
  `LIMITS.md §3a` and `ARCHITECTURE.md §6`.
- **Tests.**
  - `STAGE_AGENT_WIRING` for the loop: routed and modeLines updated, route/brief counts 14→12 and 12→11, and test (10)
    5→4.
  - The test (9) mutation now uses ship's quick grill, plus a control that pastes a loop grill route line.
  - Three new ✧ FLOOR-ONLY GRILL pins (grill mode, loop invocation with no second read, ship read-before-route), each
    with a mutation control.
  - Stage-agent routed-cell counts 16→15.

**Floor.** `node pharn/floor/validate.mjs .` is GREEN (36 capabilities). `docs:check` is GREEN, so the catalog did not
need regenerating.

**Decisions.**

- No byte ceiling was raised.
- The grill amendments were all taken (see the PLAN's "Grill amendments").
- Grill ‖ test concurrency was not built; follow-up `front-grill-concurrent-agents`.
