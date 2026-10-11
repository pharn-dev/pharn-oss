# GRILL — deletion-follow-ups

Plan: `.dev/features/deletion-follow-ups/PLAN.md` · spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
`75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6`, equal to the plan's pin (no drift) · **Step 1b
lessons declaration: GREEN** (exit 0) — `check-plan-lessons.mjs`: all 15 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body (the declaration, never the application —
P0). The Step 1b verdict is a floor exit code and is not counted in the concern tally below.

Contracts read for grounding: `pharn/pharn-contracts/finding-shape.md`, `pharn/pharn-contracts/eval-format.md`,
`pharn/pharn-contracts/reconciliation-record.md` §2–§5, plus the code the plan's claims rest on
(`check-bash-reconcile.mjs` — the candidate loop, `controlSurfaceChanges`, `classifyMerged`, `blobAt`;
`reconcile-baseline.mjs` — `enumerate`, `hashFile`, `buildRecord`; `apply-plan-deletions.mjs`'s imports and header;
`/pharn-dev-regress` Step 1's trusted-doc exemption), and commit `83c5829`.

## Findings (ADVISORY — every one is model judgment; none gates `/pharn-dev-build`)

### Inline axes

```yaml
- type: FINDING
  rule_id: P4
  severity: important
  file: ".dev/features/deletion-follow-ups/PLAN.md:6"
  problem: "The header says the increment makes no trusted-doc change, but the branch now carries the human-applied LIMITS.md §6 sentence (83c5829), which is product surface and ships in 6.57.0; the plan's CHANGELOG bullet in ## Files does not say the entry must name it, and LIMITS.md is not listed as touched-by-a-human anywhere a builder reads before writing the CHANGELOG."
  evidence: "No hook, settings file, trusted doc or capability changes."
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/deletion-follow-ups/PLAN.md:209"
  problem: "The 'parent made unreadable' row may be unreachable as written: a directory without search permission can make `git ls-files --others` itself fail, which turns the run INCONCLUSIVE at enumeration before the new lstat branch is reached; the test must assert which branch it hit, or be replaced by a direct case that reaches the lstat error, rather than pass on the wrong branch."
  evidence: "a parent made unreadable → candidate (skipped as root)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/deletion-follow-ups/PLAN.md:119"
  problem: "D3's condition (f) for a deletion reads 'absent at H and absent at M', but blobAt returns { absent: true } only for an EMPTY ls-tree answer and null for a non-blob or unusual mode; the plan should state that a null at either commit keeps the escape (fail closed), so a path replaced upstream by a directory or a gitlink is never classified merged."
  evidence: "(f) it is absent at H **and** absent at M"
```

Checked and **confirmed** rather than raised (live this run):

- `/pharn-dev-regress` Step 1 exempts the hook-protected trusted docs from `check-regress.mjs scope`, so `83c5829`'s
  `LIMITS.md` change does not read as an escape there; and it was committed BEFORE the build anchor, so the baseline
  records its committed bytes and reconcile sees no change (L68 satisfied).
- The deletion branch in D2 sits where the current `present at anchor, absent now` loop runs, AFTER
  `controlSurfaceChanges`, so a `git rm` of a control path (already listed by `git diff HEAD`) is deduplicated, not
  judged twice.
- A deleted path that only a plan-origin amendment covers gets the existing `plan-widened-after-anchor` reason through
  the unchanged `widenedBy` path — no new reason member is needed (D2's "output shape unchanged" holds).
- `apply-plan-deletions.test.mjs` exercises the helper's control-path refusals through `loadIgnoreData` /
  `isAlwaysReconciled`, so A's move is behaviour-covered by an unedited suite, as D1 claims.

### Registered grillers (`node pharn/floor/count-grillers.mjs .` → `registered: 13`)

| griller        | Layer 1 (scanner, deterministic) | Layer 2 (judgment)                                                                                                       |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| testability    | —                                | presence recognized: `DELETION_KINDS` iterated, declared/undeclared pairs, D3 controls; the unreadable-row concern above |
| architecture   | —                                | fit recognized: a core under `pharn/floor/` both modules import; the CLI keeps re-exports; no layer inversion            |
| coupling       | —                                | A removes the helper → CLI import (the 6.56.0 P3 finding); no new cross-module reference                                 |
| security       | —                                | no new input channel: baseline paths stay `lstat`/git argv operands under literal pathspecs                              |
| error-handling | —                                | present: every unusable `lstat`/git answer keeps a candidate or an escape (fail closed); the null-blob note above        |
| performance    | —                                | one `lstat` per absent baseline path; D3's git calls run only for would-be escapes, as today                             |
| documentation  | —                                | present: contract §2a/§3/§5, checker and helper headers, both guides, the CHANGELOG; the LIMITS.md accounting above      |
| comprehension  | —                                | the WHY of D1–D5 and the probe table are captured                                                                        |
| observability  | —                                | not operationally significant: the checker's JSON document is its record                                                 |
| privacy        | —                                | no personal data                                                                                                         |
| i18n           | —                                | no user-facing strings                                                                                                   |
| migrations     | —                                | the baseline record shape is unchanged (no new field)                                                                    |
| a11y           | —                                | no UI                                                                                                                    |

The Layer-1 scanners were not run: each is a PLAN-text scan for its own vocabulary, and the plan carries none of it
(no secrets, PII, i18n, migrations or operational-telemetry claims) — recorded here rather than implied. No griller
produced a finding beyond the three above.

## Summary

The plan's two behaviour claims were re-derived from live code: the deletion branch is the existing
`present at anchor, absent now` loop, and the merged extension adds a case to `classifyMerged` that today `continue`s.
All three concerns are inside the approved intent. The first (the `LIMITS.md` accounting) and the third (null blobs
fail closed) are taken into `PLAN.md` before the build (`## Amended after grill`); the second becomes a test-design
note there too.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor; all three taken into the
plan) — for the human to weigh before /pharn-dev-build.
