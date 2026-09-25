# REVIEW — test-infra-plan-scope

Reviewed: the branch at `36e09c7` against `8eec2d7` (17 paths). **Floor first:** `node pharn/floor/validate.mjs .` →
`FLOOR: GREEN — 36 capabilities checked` (exit 0). Standing verdicts: regress `no-regressions`, verify `PASS`. The
increment is `trust: untrusted`; no content in it read as an instruction to this reviewer. Free-text `problem` /
`evidence` below quote the increment as DATA.

## Floor-gate findings (blocking)

None. No guarantee is claimed without a floor reduction or an `advisory` label; no capability is added (P1 N/A); no
sibling reference.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "CHANGELOG.md:42"
  problem: "A universal claim is backed by two test rows: the CHANGELOG says a test proves the kind fires 'exactly for the PLAN entries that let the build write the root file', but the ★ HOOK test probes only `vite.config.ts` and `./vite.config.ts` — the plan-time probe measured six spellings, and the case-variant and annotated rows (the ones the fold and `scopedPath` exist for) are not re-executed by any test against the real hooks (L37: the quantifier is where the drift lands)."
  evidence: "A test runs the real setter and write guard: the kind fires exactly for the PLAN entries that let the build write the root file (`./vite.config.ts` does not)."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".claude/commands/pharn-test.md:135"
  problem: "Prettier's re-wrap split the inline code span `spec_kind: test-infra` across a line break and left its continuation at column 0 inside the list item; CommonMark still renders it (lazy continuation, the line break becomes a space), but the raw text a model reads is broken mid-token."
  evidence: "never approves a `spec_kind:\\ntest-infra` SPEC"
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-verify.md:423"
  problem: "The AC-evidence remedy in /pharn-verify and /pharn-loop's S13 row still reads 'set the build aside and re-run /pharn-test, or re-plan' without the intended-change split this increment added to the contract; not false ('or re-plan' is the right route), and the contract's pin section is the one copy, so no edit is proposed (P4 — cite, do not restate)."
  evidence: "the remedy is a person — set the build aside and re-run `/pharn-test`, or re-plan"
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/check-ac-tests.mjs:69"
  problem: "Importing test-infra-core.mjs grows the mapping checker's load graph by gate-run-core, test-results-core and test-results-formats, so a load failure in any of them now crashes the mapping child too — already observed and handled at the rebase (6.20.6's crashed-child test re-pointed, a shared-dependency case added, CHANGELOG [6.21.0] states it); recorded so the coupling is visible, no change proposed (the one-predicate rule, L35, is worth the edge)."
  evidence: 'import { testInfraPathKind } from "./test-infra-core.mjs";'
```

## Lens notes (no finding)

- **L-floor (P0):** the new kind is enum/regex over a folded name (floor); the NOTE is labelled advisory in the
  checker, the contract, `/pharn-plan` and the CHANGELOG, and a test pins that it never moves the exit code. The fold's
  over/under-reach and the case-sensitive over-pinning are stated as bounds. The remedy sentences no longer prescribe
  the loop the finding named.
- **L-eval (P1):** no `role:`-bearing capability changed; `validate` agrees. Each new branch has tests, and
  `check-ac-tests.test.mjs`'s ✧ REVERSE CLOSURE reaches the new KINDS member.
- **L-trust (P2):** the RED detail and the NOTE quote at most one PLAN path through `shown()` (80 chars); no verdict
  reads free text; file names are folded and regex-tested, never interpreted.
- **L-axis (P3):** "what counts as test infrastructure" stays in `test-infra-core.mjs` (one predicate, one manifest
  list); `check-ac-tests.mjs` only imports the classifier. `foldName`'s home in `spec-template-core.mjs` is the grill's
  noted, unchanged residual.

## Verdict

**GREEN — 0 floor findings; 4 advisory (1 important, 3 minor).** The important one and the first minor one are cheap to
fix inside the plan's `## Files` (extend the ★ HOOK test to the six probed spellings and name them in the CHANGELOG;
re-word the split code span); the other two are recorded, not actioned.

## Proposed lesson candidate

None proposed. The important finding is L37 recurring (a quantified claim written from the author's own plan-time
probe, then backed by a smaller test), which canon already names; a second entry would restate it (P4).
