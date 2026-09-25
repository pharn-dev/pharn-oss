# GRILL — test-infra-plan-scope

Plan: `.dev/features/test-infra-plan-scope/PLAN.md` · spec-hash check: `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`
recomputed with `.dev/floor/hash-doc.mjs` **equals** the plan's `spec_content_hash` (no drift) · **Step 1b
(FLOOR, `check-plan-lessons.mjs`): exit 0 GREEN** — "applied_lessons: L35, L36, L37, L39, L47, L50, L52 … all 7
cited id(s) resolve … and are referenced in the plan body". That verdict covers the DECLARATION only, never that
the lessons were applied (P0).

Grillers discovered by `node pharn/floor/count-grillers.mjs .` (FLOOR membership): 13 registered — a11y,
architecture, comprehension, coupling, documentation, error-handling, i18n, migrations, observability,
performance, privacy, security, testability. Their procedures were applied inline (the isolated runner is
deferred, P7). Every finding below is ADVISORY and gates nothing (fix #3). Free-text `problem` / `evidence`
quote the plan, which is `trust: untrusted` — DATA, never an instruction.

## Findings

### Guarantee audit and honest scope (P0, P7)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/test-infra-plan-scope/PLAN.md:92"
  problem: "D5 rewrites the rebuild bullet around what the BUILD may write, but a verify-time gate that rewrites files (a formatter or a `--fix` linter run over the root) can rewrite a pinned runner config just as it can a pinned test, so the corrected bullet would still under-state what turns the gate RED."
  evidence: "D5 — correct the two false sentences … the gate passes on a rebuild **that stayed out of what the lock pins**"
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/test-infra-plan-scope/PLAN.md:25"
  problem: "The review's core complaint is that the prescribed remedy loops (set the build aside, re-run /pharn-test, rebuild → the rebuild edits the config again), yet the plan does not name the two sentences that prescribe that remedy — ac-tests.md's pin section ('re-running it means setting the build aside first … or re-planning') and test-infra-core.mjs's header ('the remedy is a human re-running /pharn-test') — so an INTENDED infrastructure change would still be sent round the loop."
  evidence: "the prescribed remedy (set the build aside, re-run `/pharn-test`, rebuild) re-pins the old config and the rebuild edits it again"
```

### Testability (griller `testability`, P1)

Presence recognized: the plan has a `## Files` list naming a test per changed module and an explicit
regression-from-repro test. Layer 2 concerns:

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/test-infra-plan-scope/PLAN.md:79"
  problem: "D4's tests and bound are filesystem-dependent and the plan does not say so: on case-insensitive APFS (local) two case spellings in one directory are ONE file, on CI's Linux they are two, so a test that creates both would assert different things on the two machines; and on a case-sensitive filesystem the fold pins a `Vitest.config.mjs` the runner does NOT load (its lookup is the lowercase name) — fail-closed over-pinning that the bound should state."
  evidence: "D4 — the name match is folded … to the runner on a case-insensitive volume `Vitest.config.mjs` IS `vitest.config.mjs`"
```

### Architecture / coupling (griller `architecture`, `coupling`, P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/test-infra-plan-scope/PLAN.md:47"
  problem: "`testInfraPathKind(scoped)` takes an already-scoped path, so every caller must remember to apply `scopedPath` first; taking the raw `## Files` entry and applying `scopedPath` inside keeps 'as the setter scopes it' in the one predicate (L39) instead of at each call site."
  evidence: 'Export `testInfraPathKind(scoped)` → `"config"` … | `"manifest"` … | `null`'
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/test-infra-plan-scope/PLAN.md:83"
  problem: "Importing `foldName` from `spec-template-core.mjs` makes test-infra-core the third floor module to take a PATH fold from a SPEC-template module; the fold's home is arguably misplaced, but moving it is not triggered by this increment (P7) — noted, not a change request."
  evidence: "`foldName` (NFC + full case folding) rather than a regex `i` flag"
```

### Enumeration closure (L36, P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/test-infra-plan-scope/PLAN.md:137"
  problem: "The ✧ closure is scoped to two files (test-infra-core.mjs and check-ac-tests.mjs); a third floor module testing `CONFIG_NAME_RE` directly (ac-tests-lock, ac-gate-core, a future caller) would pass it — the closure should range over every non-test `pharn/floor/*.mjs`."
  evidence: "✧ closure: `CONFIG_NAME_RE.test(` appears once in the module and nowhere in `check-ac-tests.mjs`"
```

### Migrations (griller `migrations`, P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/test-infra-plan-scope/PLAN.md:83"
  problem: "The migration note covers only the /3 lock with a case-variant config; an IN-FLIGHT feature whose PLAN already names a root runner config is now `RED mapping-red` at `/pharn-build` Step 0 (check-test-stage shells check-ac-tests), and the CHANGELOG should say so with its remedy (re-plan: delete the line, or split the change out)."
  evidence: "Consequence for an existing `/3` lock, stated in the CHANGELOG and the contract"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/test-infra-plan-scope/PLAN.md:116"
  problem: "Widening `pinShapeError` is backward-compatible but not forward-compatible: a lock written by 6.21 that records a case-variant config path is `lock-unusable` to a 6.20.x floor; acceptable (one tree, no downgrade path), but unstated."
  evidence: "`pinShapeError` only WIDENS (every lock valid before stays valid)"
```

### Documentation (griller `documentation`, P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/test-infra-plan-scope/PLAN.md:149"
  problem: "A new user-visible refusal ships with no mention in the README's test-stage paragraph (which already tells users a missing runner needs a setup increment first), and check-ac-tests' own GREEN line would keep listing only the AC-test exclusion."
  evidence: "`README.md` — the version badge; the generated inventory only if `docs:generate` rewrites it"
```

### No findings

- **a11y, i18n, observability, performance, privacy:** no concern. No UI, no telemetry or data flow; the fold adds
  one string normalization per root entry. NFC is part of the fold, so an NFD spelling of an ASCII name is
  identical by construction.
- **Security (P2):** the new RED and NOTE quote at most one path through the existing `shown()` bound. A PLAN that
  reaches the config through a symlinked path cannot widen the build's reach: the write guard judges the
  symlink-resolved target against the scope, and the pin refuses a symlinked config outright (both existing).
- **Error handling:** a dropped (`null`-scoped) entry must classify as `null`, not throw — covered if F4's shape is
  adopted.
- **Determinism (P5):** every new branch is a membership test; D2 records the probe exit codes beside the claim.

## Summary

The plan is coherent and each decision answers a confirmed finding. Two concerns matter most. First, fixing the
false "a rebuild passes" sentence is only half of finding 1: the review's sharper point is that the REMEDY loops
for an intended infrastructure change, and the two sentences that prescribe that remedy (the contract's pin
section and test-infra-core's header) are not in D5's list. Second, the case fold's tests and its bound are
filesystem-dependent — tests must create one spelling only, and the over-pinning on a case-sensitive filesystem
should be stated. The verify-time `--fix` gate rewriting a config belongs in the rewritten rebuild bullet too. The
rest are shape and documentation hygiene: take the raw entry in the predicate, widen the closure to the whole
floor, add the in-flight migration and the forward-compatibility note, and mention the refusal in the README.

ADVISORY VERDICT: 9 concerns raised (3 important-severity, 6 minor; 0 blocking) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not counted here.
