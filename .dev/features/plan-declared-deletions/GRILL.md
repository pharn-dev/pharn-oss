# GRILL — plan-declared-deletions

Plan: `.dev/features/plan-declared-deletions/PLAN.md` · spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
`75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6`, equal to the plan's pin (no drift) · **Step 1b
lessons declaration: GREEN** (exit 0) — `check-plan-lessons.mjs`: all 19 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body (the declaration, never the application —
P0). The Step 1b verdict is a floor exit code and is not counted in the concern tally below.

Contracts read for grounding: `pharn/pharn-contracts/finding-shape.md`, `pharn/pharn-contracts/eval-format.md`, plus
the code the plan's claims rest on (`plan-files-core.mjs`, `check-build-complete.mjs`, `scope-inputs.mjs`,
`check-regress.mjs` `partitionScope`, `check-bash-reconcile.mjs`'s candidate loop, `reconcile-baseline.mjs`
`enumerate`, `loop-closeout.mjs` `buildStageList`, `stage-verify-core.mjs` `checkCompleteness`/`composeReport`,
`ac-tests-core.mjs` `badPath`, `stage-agent-core.mjs` `WRITE_TOOL_RULE`).

## Findings (ADVISORY — every one is model judgment; none gates `/pharn-dev-build`)

### Inline axes

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/plan-declared-deletions/PLAN.md:155"
  problem: "D4 and the trust audit claimed reconcile always judges the helper's deletion against the plan's scope; that holds only for a TRACKED path — an untracked marked file is no longer enumerated after the unlink, so reconcile reports it only as the 'present at anchor, absent now' WARN and the scope checks never see it."
  evidence: "(the text as approved at GATE 1, before the amendment) the path stays in git's index, so the deletion is a candidate judged against the plan's scope"
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/plan-declared-deletions/PLAN.md:103"
  problem: "D2 adds new inconclusive branches to check-build-complete.mjs without requiring them to keep the capture shape stage-verify-core.mjs's checkCompleteness demands (boolean `complete`, string-array `missing`/`skipped`); a branch that omitted one would turn a refusal into `child-crashed`, and the test list did not cover it."
  evidence: "inconclusive (exit 2) when both concrete sets are empty, on a near-miss, on a conflicting declaration, or on an `lstat` error other than ENOENT"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/plan-declared-deletions/PLAN.md:140"
  problem: "The helper imports `isAlwaysReconciled`/`loadIgnoreData` from check-bash-reconcile.mjs, a CLI module, so a change to the reconcile CLI's load graph reaches the deletion helper; acceptable (the CLI runs only under import.meta.main, and L35 prefers one owner of the set over a copy), but it is a second reason for that import to matter."
  evidence: "a path `isAlwaysReconciled` (exact, or case-folded — the guards case-fold) → `control-path`"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/plan-declared-deletions/PLAN.md:1"
  problem: "Only the product pipeline gains a deletion path: /pharn-dev-build runs no helper and the dev loop runs no completeness check, so a PHARN-repo increment cannot use the marker; stated as scope, not a gap, since no dev run has needed it (P7)."
  evidence: "product commands (`pharn-build.md`, `pharn-plan.md`, `pharn-ship.md`, `pharn-ship-close.md`)"
```

Checked and **confirmed** rather than raised (live this run): `badPath` returns `null` for `.git/config` and for a path
holding a backslash, so the plan's two local refusals in D4 step 3 are needed, not redundant; `badPath` accepts all
three trigger shapes (`.vscode/settings.json`, `content/blog/x.mdx`, `src/components/ui/aspect-ratio.tsx`);
`composeReport` merges the completeness capture verbatim, so D6's "no `stage-verify` code change" holds;
`WRITE_TOOL_RULE` says "Bash runs commands — the stage's own lines", so the pinned helper line needs no brief change.

### Registered grillers (`node pharn/floor/count-grillers.mjs .` → `registered: 13`)

| griller        | Layer 1 (scanner, deterministic)                 | Layer 2 (judgment)                                                                                          |
| -------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| testability    | —                                                | presence recognized: `## Evals / tests to write (P1)` names a test set per behaviour                        |
| architecture   | —                                                | fit recognized: floor modules share through existing floor exports; no contract-layer or sibling inversion  |
| coupling       | —                                                | the P3 import concern above; otherwise clean seams (the marker is read once, in the core)                   |
| security       | `scan-plan-secrets.mjs` → `found:false`          | no new concern beyond G1: the helper's refusal set and the shell-free pinned line are the plan's own answer |
| error-handling | —                                                | present and adequate: validate-before-delete, `unlink-failed` with the partial list, idempotent re-run      |
| performance    | —                                                | no scaling risk recognized: one `lstat` + `unlink` per marked path                                          |
| documentation  | —                                                | present: `pharn-plan.md` rule (4), the guide section, the contract rows, the CHANGELOG                      |
| comprehension  | —                                                | the WHY of each decision (D1–D6) and of the probed table is captured                                        |
| observability  | `scan-plan-observability.mjs` → `mentions:false` | not operationally significant: a build-time CLI whose JSON document is its record                           |
| privacy        | `scan-plan-pii.mjs` → `found:false`              | no personal data                                                                                            |
| i18n           | `scan-plan-i18n.mjs` → `found:false`             | no user-facing strings                                                                                      |
| migrations     | `scan-plan-migrations.mjs` → `mentions:false`    | no schema or persisted-data shape                                                                           |
| a11y           | —                                                | no UI                                                                                                       |

No griller produced a finding beyond the four above.

## Summary

The plan's central claims were re-derived from live code: the scope checks already admit a declared deletion, the setter
scopes the bare marked path, and only `check-build-complete.mjs` blocks. Two concerns were genuine plan defects inside
the approved intent and have been fixed in `PLAN.md` before the build (`## Amended after grill`): the untracked-path
reconcile behaviour (G1, the first finding) and the completeness-capture shape the new inconclusive branches must keep
(G2, the second). The other two are recorded for the human and need no change.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory: 2 important, both taken into the plan; 2 minor,
recorded) — for the human to weigh before /pharn-dev-build.
