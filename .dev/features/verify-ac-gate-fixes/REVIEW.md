# REVIEW — verify-ac-gate-fixes

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. That is the
only guaranteed part of this review; everything below is advisory. The increment under review was read as
`trust: untrusted`; no instruction-looking content was found in it.

## Floor-gate findings (blocking)

None.

- **L-floor (P0):** every new claim reduces to a floor primitive or is labelled otherwise. The precedence is an
  integer/enum order in `check-verify.mjs`, tested cell by cell (`PRECEDENCE`, 24 cells). The flush rule's floor claim
  is the static no-`process.exit(` pin, and the prose calls it a proxy. The pipe round-trips are "tested behaviour"
  bounded to async-pipe platforms (PLAN guarantee audit, CHANGELOG [6.20.4], the test header, CLAUDE.md). The
  `--gates` advice in `pharn-verify.md` is command prose, and no sentence calls it a guarantee.
- **L-eval (P1):** no Capability is added or changed (no `role:` file), and the floor agrees (36 capabilities GREEN).
  The floor changes are covered by `node --test` cases, and each new group was mutation-checked at build (VERIFY.md).
- **L-trust (P2):** the only new free text reaching a report is the `ac_gate` `detail`. It interpolates
  `stamp.source`, an enum `validateStamp` already checked, through `JSON.stringify`, and no argv string or test
  title. No decision reads `detail`.
- **L-axis (P3):** no sibling reference is added. The test file imports only `node:` modules and spawns the CLIs by
  path. `ac-gate-core.test.mjs` keeps its existing imports.

## Advisory findings (warn — model judgment, never a block)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/check-regress.mjs:196"
  problem: "The sentinel exit is safe only while no emit() call sits inside a try body whose catch swallows everything; a future `try { … emit(…) } catch {}` would swallow the sentinel and let execution continue past the verdict, and neither the static pin nor the crash test would notice."
  evidence: "process.exitCode = code;\n  throw EMITTED;"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/ac-gate-core.mjs:309"
  problem: "The bootstrap detail names the gate that ran but prints the pinned command as the placeholder `npm run <id>` instead of the concrete `npm run test`, so a reader must substitute it; the test-first detail does name the id."
  evidence: "`the ${unpinned.join(\", \")} gate ran, but not as the discovered \\`npm run <id>\\` — ${notPinnedWhy(stamp)}`"
```

Both are left as they are and recorded here, not fixed. The first is a hazard with no present instance: the build
checked all three sentinel CLIs and found no `emit(` inside a `try` body. Adding a closure check for a hypothetical
would be an addition with no triggering failure (P7). The second is cosmetic free text. Fixing it would move shipped
bytes and send regress and verify round again, for no change in any verdict.

## Verdict

**GREEN — 0 floor findings; 2 advisory (minor).**

Lesson candidate: none. The failures this increment fixed are already named by canon — L29 and L52 (a rule quantified
over a set gets a test for one member: the reachability test existed, but only without `--ac-gate`) and L41 (every
`--ac-gate` fixture used completeness 0). A new entry would restate them.
