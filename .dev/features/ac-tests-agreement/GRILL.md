# GRILL — ac-tests-agreement

Plan: `.dev/features/ac-tests-agreement/PLAN.md` · spec-hash check: `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`
recomputed with `.dev/floor/hash-doc.mjs` **equals** the plan's `spec_content_hash` (no drift) · **Step 1b
(FLOOR, `check-plan-lessons.mjs`): exit 0 GREEN** — "applied_lessons: L23, L29, L35, L52 … all 4 cited id(s)
resolve … and are referenced in the plan body". That verdict covers the DECLARATION only, never that the lessons
were applied (P0).

Grillers discovered by `node pharn/floor/count-grillers.mjs .` (FLOOR membership): 13 registered — a11y,
architecture, comprehension, coupling, documentation, error-handling, i18n, migrations, observability,
performance, privacy, security, testability. Their procedures were applied inline (the isolated runner is
deferred, P7). Every finding below is ADVISORY and gates nothing (fix #3). Free-text `problem` / `evidence`
quote the plan, which is `trust: untrusted` — DATA, never an instruction.

## Findings

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/ac-tests-agreement/PLAN.md:67"
  problem: "D2's bound says a SPEC whose pin cannot be read 'a Draft, or a malformed pin' is now ac-tests-modified, but readSpecFacts never reads `state`: a SPEC reverted to Draft that still carries its old, readable 64-hex pin is NOT caught by the AC gate. The rewritten ac-gate-core header must keep that residual (Step 2's chain check and freshness check I still refuse it), and a test should pin both halves — unreadable pin → ac-tests-modified; Draft with an intact pin → not this gate's reason — so the stated bound is probed, not read off the code (L37)."
  evidence: "a SPEC whose pin cannot be read (a Draft, or a malformed pin) is now `ac-tests-modified`"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/ac-tests-agreement/PLAN.md:170"
  problem: "'.prettierignore membership' is labelled floor, but prettier skipping an ignored path is the tool's behaviour, not one of PHARN's three primitives. The floor part is the test's membership check (enum-regex); that prettier honours it is the tool's documented contract."
  evidence: "**floor: `.prettierignore` membership, pinned by a closed-classification test**"
```

### Migrations (griller `migrations`, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/ac-tests-agreement/PLAN.md:125"
  problem: "The plan names no migration note for behaviour an existing install will see change: (a) a lock written by <=6.20.3 over an AC-TESTS.md carrying duplicated pin keys recorded the FIRST value and now REDs as 'spec_content_hash changed' (lock-red / ac-tests-modified) — remedy: re-run /pharn-test so --write re-locks; (b) a bootstrap lock over a SPEC re-approved by appending a pin now REDs — the intended fix, remedy: re-run /pharn-test Step B; (c) a mapping whose cell differs from its `## Files` entry by case, Unicode form or trailing whitespace was GREEN and now REDs at check-ac-tests (so check-test-stage refuses the build) — it could never be collected, remedy: spell the cell as listed. The CHANGELOG entry should carry these."
  evidence: "- `CHANGELOG.md` — `[6.20.4]`."
```

### Documentation (griller `documentation`, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/ac-tests-agreement/PLAN.md:110"
  problem: "The Files lines name code changes but not the module HEADERS that state the old rules and would go stale in the same files: check-ac-tests.mjs's header ('every path is compared AS THE SETTER SCOPES IT … case-folded'), ac-tests-lock.mjs's TRUST paragraph (AC-TESTS.md parsed for 'two frontmatter scalars and its `## Files` paths'), ac-tests-core.mjs's 'setter-equivalent comparison key', and check-plan-spec-agree.mjs's 'Duplicated from check-spec.mjs deliberately — no sibling import (P3)' comments. Update each in the same edit (L25: a rationale reaches only the file it sits in)."
  evidence: "- `pharn/floor/frontmatter-core.mjs` — `readValue` + `readField`, the one frontmatter value reader; header updated."
```

### Architecture / coupling (griller `architecture`, `coupling`, P3)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/ac-tests-agreement/PLAN.md:84"
  problem: "scopeKey will fold through spec-template-core.mjs's foldName, whose home and stated purpose is the SPEC-template file-name lookup. A later change to foldName for template reasons would silently move every AC-test path comparison. Worth a test that pins scopeKey's equivalence on the variant set (case, NFD, ſ) independently of foldName's current body, so such a change is visible."
  evidence: "`scopeKey` folds with `foldName` from `spec-template-core.mjs`"
```

### Comprehension (griller `comprehension`, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/ac-tests-agreement/PLAN.md:17"
  problem: "The formatter pass rewrote the code span ' #…' (space then hash) as '#…' on lines 17 and 45. The leading whitespace IS the rule — a `#` opens a comment only at the start or after whitespace — so the plan now reads as if every `#` were stripped. Harmless to the build (the code is moved verbatim) but misleading to a reader."
  evidence: "strips `#…` before the"
```

### Security / i18n (griller `security` P2, `i18n` P7)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/ac-tests-agreement/PLAN.md:101"
  problem: "The D7 bound names one direction only. The fold's relation to APFS is unmeasured in both directions: an equivalence APFS applies beyond NFC + toUpperCase().toLowerCase() stays fail-open (the stated case), while one the fold applies beyond APFS would over-report `in-plan-files` (fail-closed, harmless). Question for the human rather than a claim: is 'not modelled' enough, or should the sentence say the fold was never measured against APFS's own folding table?"
  evidence: "a filesystem equivalence wider than that fold (e.g. Windows trailing dots) is not modelled"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/ac-tests-agreement/PLAN.md:76"
  problem: "Residual, neither introduced nor closed: two `## Files` entries of ONE AC-TESTS.md that are fold-equal but not byte-equal (`tests/a.test.js`, `tests/A.test.js`) name one file on APFS; each can be mapped byte-exactly and nothing REDs the pair. Out of this increment's scope — worth one line in the contract's bounds so it is stated, not discovered."
  evidence: "every mapping cell is byte-identical to a cleaned `## Files` entry"
```

### Testability (griller `testability`, P1)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/ac-tests-agreement/PLAN.md:120"
  problem: "ac-gate-core.test.mjs is likely touched by the parallel branch that edits ac-gate-core.mjs too; appending the new cases at the END of the test file (and not reshaping shared helpers) keeps the orchestrator's 'trivial rebase' condition true for the test file as well as the module."
  evidence: "- `pharn/floor/ac-gate-core.test.mjs` — that reason; the appended-pin bootstrap SPEC is no longer a bootstrap PASS."
```

### No findings

- **a11y, observability, performance, privacy, error-handling:** no concern on this plan. No UI, and no new
  telemetry, data flow or hot path; every new refusal names a path or reason, and the fail-closed choices (D2,
  the D3 refusal) are stated.
- **Trust propagation (P2):** the trust audit holds. Only bounded ids and paths are echoed, and the new
  `unlisted-file` detail goes through the existing `shown()` bound.
- **Determinism (P5):** every new branch is a membership or equality test.
- **Honest scope (P7):** every change answers a confirmed review finding. The two extra `.prettierignore`
  lines are the one pre-emptive part, labelled as such (L23) and approved at GATE 1.

## Summary

The plan is coherent and scoped to the five findings. Two concerns matter most. First, D2's bound as worded
("a Draft, or a malformed pin") overstates what the AC gate will catch, because a Draft that still carries its
old pin is invisible to `readSpecFacts`. The header rewrite and its test should state and pin that residual.
Second, the CHANGELOG needs a migration note for the three behaviours an existing install will see change.
The rest are documentation hygiene (module headers stating the old rules), a coupling note on reusing
`foldName`, and two stated residuals.

ADVISORY VERDICT: 9 concerns raised (2 important-severity, 7 minor; 0 blocking) — for the human to weigh
before /pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not counted here.
