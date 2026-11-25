# BUILD — core-371-floor-only

Built on `d7e27203` (origin/main `5d8dcddd` + the plan/grill commit). Spec hash re-checked at Step 1:
`8566b443…a9167`, unchanged. Scope: the plan's 7 `## Files` paths; reconcile anchored after the setter (4149 paths).

## What landed

- `.claude/commands/pharn-grill.md`: the `--floor-only` section's closing sentence "Run inside an orchestrator, Step
  4's "end your turn" does not apply: return to it." is removed. The section already opens "No orchestrator invokes this
  form since 7.7.0 … It remains for a direct call.", so Step 4's "end your turn" applies to that call as written.
- `.dev/floor/command-hygiene.test.mjs`, FLOOR-ONLY GRILL section:
  - `floorOnlySources()` collects, by class, the family text (file + parts) of every `ROUTE_POLICY` command
    (`pharn-ship`, `pharn-loop`), the `renderBrief` text of every `(command, mode)` whose `pharn-grill` cell is `agent`
    (both `full` columns), and every non-test `pharn/floor/*.mjs`. `floorOnlyInvokers()` lists each line holding
    `--floor-only`.
  - The new test asserts each class is non-empty (L34), the orchestrators are exactly ROUTE_POLICY's commands, and
    `sentencePresent === (invokers.length === 0)`, with a message per direction (restore the sentence, or update it and
    name the invoker lines).
  - A control test (L60) plants a `--floor-only` invocation in the real `/pharn-loop` family text and in a real
    rendered brief and requires each to be flagged.
  - The existing test keeps its mode-line, skip-literal and scan pins; only the bare sentence regex moved out of it.
    The section comment now says the fact is derived, and that a mention counts (grill finding P5).
- Patch bump 7.25.4 → 7.25.5: `SKILLS_VERSION`, README badge, a new CHANGELOG `[7.25.5]` section (`[Unreleased]` held
  no entries), and `npm run docs:generate` (only `pharn-install.json` changed: `skillsVersion` and `pharn-grill.md`'s
  sha256).

## Mutation measurement (L60; grill finding P0)

Run by `/private/tmp/claude-501/…/scratchpad/mutate.mjs` in a scratch copy of the tracked tree plus the working changes
(never in this worktree), one mutation at a time, restored between, running
`node --test --test-name-pattern="FLOOR-ONLY GRILL" .dev/floor/command-hygiene.test.mjs`:

| mutation                                                                                       | exit | failing tests                     | message (head)                                                                             |
| ---------------------------------------------------------------------------------------------- | ---- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| none (baseline)                                                                                | 0    | —                                 | —                                                                                          |
| A: ``Then invoke `/pharn-grill <name> --floor-only` yourself.`` added to `pharn-loop-quick.md` | 1    | the derivation test + the control | `--floor-only now appears in what could invoke it (pharn-loop.md (family):728)`            |
| B: `INVOCATIONS["pharn-loop"].full["pharn-grill"]` → `"/pharn-grill <name> --floor-only"`      | 1    | the derivation test + the control | `… (brief pharn-loop/full/pharn-grill:7, pharn/floor/stage-agent-core.mjs:382)`            |
| C: the sentence "No orchestrator invokes this form since 7.7.0: " removed, no invoker          | 1    | the derivation test               | `… must open with "No orchestrator invokes this form since 7.7.0" — restore that sentence` |
| after restore                                                                                  | 0    | —                                 | —                                                                                          |

Mutation A lands in a PART file, so it also measures the family splice (the grill's P0 concern). A family-spliced hit is
reported at its line in the spliced family text (`pharn-loop.md (family):728`), not at the part file's own line.

## Floor

`node pharn/floor/validate.mjs .` — see the verdict recorded by `/pharn-dev-ship` (step 3).
