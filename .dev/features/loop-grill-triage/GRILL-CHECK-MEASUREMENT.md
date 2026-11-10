# Grill-check measurement — loop-grill-triage (plan Q3)

**Result: 0 of 5 RED. Every run passed `grill-findings.mjs check` on its first call, with no repair round. Threshold
(2 or more of 5 still RED after the repair round → HALT) not reached: the build may proceed.**

Measured 2026-11-10, before `/pharn-dev-build`, as the approved plan's Q3 requires. Advisory: five runs on one
project, one model, one Claude Code version. It is evidence for the go/halt decision, not a rate.

## Method

- Five scratch worktrees of pharn-starter `main` (`75316707`, PHARN 7.5.0 installed), each overlaid with the 7.6.0
  product surface from pharn-oss `main` (`089a4c7f`): `pharn/floor/` (tests excluded), the contracts, grillers,
  `pharn-core`, the four trusted docs, the product commands and the hooks. All 13 grillers registered in both repos.
- One real feature per worktree: its approved `SPEC.md` and `PLAN.md`, copied from an agent worktree where the SPEC
  is still Approved. Both floor stops were GREEN on each before the run.
- Each grill ran headless:
  `claude -p "/pharn-grill <name>" --model opus --permission-mode acceptEdits`, with `--allowedTools` for
  `node pharn/floor/*`, the scope setter, and scoped prettier and markdownlint. Claude Code 2.1.322.
- Afterwards, outside the run: `node pharn/floor/grill-findings.mjs check <json> --grill <GRILL.md> --plan <PLAN.md>`,
  plus a trace of every `render` / `check` call the grill made and its first output line.

## Results

| run | feature                | source                    | findings | severities (b / i / m) | grill's calls           | final check | time  | cost  |
| --- | ---------------------- | ------------------------- | -------- | ---------------------- | ----------------------- | ----------- | ----- | ----- |
| g1  | `reauth-binding`       | evidence run (2026-09-27) | 10       | 1 / 4 / 5              | render ok → check GREEN | exit 0      | 229 s | $2.51 |
| g2  | `reauth-per-session`   | evidence run (2026-09-27) | 8        | 0 / 2 / 6              | render ok → check GREEN | exit 0      | 269 s | $3.04 |
| g3  | `erasure-closes-teams` | evidence run (2026-09-27) | 7        | 1 / 3 / 3              | render ok → check GREEN | exit 0      | 245 s | $2.64 |
| g4  | `actions-oidc-policy`  | recent plan (2026-11-08)  | 8        | 0 / 3 / 5              | render ok → check GREEN | exit 0      | 270 s | $2.97 |
| g5  | `billing-plan-roles`   | large plan (544 lines)    | 8        | 1 / 4 / 3              | render ok → check GREEN | exit 0      | 284 s | $3.11 |

- `rule_id` values were constitution principles only (P0–P7) in every file; no bare griller names and no line ranges,
  the two shapes part 1 measured as the most common refusals in older `GRILL.md` files.
- Every run had a few refused tool calls (2–5): compound shell commands (`node … ; echo "exit $?"`) that headless
  mode would not approve. Each grill retried the command alone and went on; none affected the output.
- g3's first attempt failed at start-up with `authentication_failed` ("Not logged in") while two other sessions were
  starting; it ran nothing. Re-run alone, it is the row above. The failed attempt is not counted.
- `retention-gdpr-fixes` (the fourth evidence run) was not usable: its SPEC was reverted to Draft at that run's stop,
  so its chain check is RED and the grill would stop before writing findings. `billing-plan-roles` replaced it.

## Notes for the build

- Three of five re-grills raised one `blocking` finding each (g1, g3, g5). The 2026-09-27 grills of `reauth-binding`
  and `erasure-closes-teams` recorded 0 blocking, so the Q4 rule (a `blocking` finding is never `proceed`) will fire
  on real plans, not only in theory: with it, three of these five full loops would stop for a person.
- Time per full grill: 229–284 s (mean 259 s), below the 361 s in the 6.45.0 ledger the plan's cost line uses.

## Bounds

- Five runs; a first-pass RED rate below 1 in 5 is not established, only that none of these five was RED.
- The old `GRILL.md` corpus (17% refusals) was written before the 7.6.0 wording; this measures the 7.6.0 command, not
  that corpus.
- Model, effort and project are fixed; another project's plans may produce other shapes.
