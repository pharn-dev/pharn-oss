# VERIFY — loop-run-report

**Machine report:** [`verify-report.json`](./verify-report.json) — the helper's verdict JSON verbatim,
with the advisory `verifiers` block merged in after the verdict was computed. Deliberately unformatted,
and `.prettierignore`d so that requirement cannot collide with the `format:check` gate this same command
owns (L23).

## FLOOR layer — the gates that own the verdict

| gate                                    | exit | what it covers                                                                                               |
| --------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `test`                                  | 0    | the whole suite — **2286/2286 pass** (read live, not from a doc)                                             |
| `validate`                              | 0    | the structural floor — GREEN, 36 capabilities                                                                |
| `lint`                                  | 0    | eslint, whole-repo                                                                                           |
| `format:check`                          | 0    | prettier, whole-repo                                                                                         |
| `lint:md`                               | 0    | markdownlint, whole-repo                                                                                     |
| `structural:expected-injection-comment` | 0    | the one committed eval pair (both paths confirmed readable before their exit code was recorded — L5/L16/L21) |
| `reconcile`                             | 0    | the fix #7 Bash-write blind spot                                                                             |

**VERIFIED: floor gates PASS.** `check-verify.mjs` exit **0**, `verdict: "PASS"`, `failing_gates: []`.

### The `reconcile` gate, in detail

```text
verdict: CLEAN · epoch 2026-09-21T20:02:16.558Z · anchored_by: pharn-dev-build
reconciled: 14 · escapes: 0 · exempted: 2 · warnings: 0
```

Run with `--require-baseline`, so an absent baseline would have been a refusal rather than a fresh-clone
`NO_BASELINE`. The epoch was opened by `/pharn-dev-build`'s Step-0 anchor, **after** its scope-setter
(order load-bearing — **L38**). 14 + 2 = the 16 changed paths; the 2 exempted are this run's own
`pipeline_artifacts`.

**This increment writes a new artifact through Bash, so the gate is load-bearing here rather than
incidental.** `render-run-report.mjs` writes `RUN-REPORT.md` itself — outside the `PreToolUse` surface
(**L19**) — which is exactly why `RUN-REPORT.md` was added to `pipeline_artifacts.names` in the same
change. A `CLEAN` here means **no escape was detected**, never that none occurred: the baseline is
unauthenticated state under `.pharn/` that Bash can reach, so this is an accounting tool against tooling
that escapes its scope, not a control against an adversary
(`pharn/pharn-contracts/reconciliation-record.md`).

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

**No verifiers registered — floor gates only.** Step 2 is a no-op and the verdict is the floor gates
alone. None is authored speculatively (P7); the slot's contract is defined and its live runner is
deferred until a first verifier is triggered.

## What this run actually exercised, and what it did not

Worth separating, because three of the seven gates carry most of the signal for **this** increment:

- **`test`** ran the two existing suites that are the entire regression net for the two extractions this
  change made — `check-loop-record.test.mjs` (74 cases, over the Handoff grammar moved into
  `loop-record-core.mjs`) and `check-build-complete.test.mjs` (11 cases, over the `## Files` parser that
  gained an export, an additive `entries`, and an `import.meta.main` guard). Both green.
- **`test`** also ran the increment's own 42 new cases at **100% line and function coverage** over both
  new modules.
- **`validate`** proves the CHECK-5 hazard this increment deliberately walks into is handled: a rendered
  report quoting a Handoff that contains `rule_id:`/`problem:` stays GREEN, and the suite carries a
  negative control proving the same content REDs without the preamble.

**Not covered by any gate here:** whether the report is _useful_ to a person, whether its prose reads
well, and — the one that matters most — whether the numbers it shows are **true**. Every figure is
copied from `cost.json`, so a self-consistent fabricated ledger renders a self-consistent fabricated
report. That bound is `check-cost-ledger.mjs`'s and is stated in both the module header and the suite
header; this stage inherits it and re-claims nothing.

## Residual (P0)

**Verified = the named gates passed.** This is **NOT** a guarantee of correctness beyond what those gates
check — a defect no test, eval, rule or lint covers is invisible to this verdict, and verifier concerns
would be advisory help, not assurance. The **verdict** is floor-grade (an exit-code threshold
`check-verify.mjs` computes); running the gates, choosing the gate set, and assembling this report are
**advisory orchestration**. The gate set itself is this command's composition — there is no floor lock
that the style gates stay in it.

---

## Re-run after the GATE-2 fixes

`/pharn-dev-review` returned **BLOCKED** on one P0 finding (F1, a false universal in the module header),
the human chose to fix F1 + F2, and both stages were re-run over the corrected tree. **The verdict is
recomputed, never carried forward** — this section records the second run, and the table above is that
run's result.

| gate                                    | exit |
| --------------------------------------- | ---- |
| `test`                                  | 0    |
| `validate`                              | 0    |
| `lint`                                  | 0    |
| `format:check`                          | 0    |
| `lint:md`                               | 0    |
| `structural:expected-injection-comment` | 0    |
| `reconcile`                             | 0    |

**VERIFIED: floor gates PASS** — `check-verify.mjs` exit 0, `failing_gates: []`.

- `test`: **2290/2290** (up from 2286 — the four added cases are F1's claim pin, F1's still-rendered
  control, F2's regression test and F2's pre-fix negative control).
- Coverage over both new modules stayed at **100% line and 100% function**.
- `reconcile`: `CLEAN` — 14 reconciled, **0 escapes**, 5 exempted. The exempted count rose from 2 to 5
  because three more of this run's own `pipeline_artifacts` now exist (`REGRESSION.md`, `VERIFY.md`,
  `verify-report.json`); the reconciled set and the escape count are unchanged.

**What the fixes changed, stated precisely.** F2 was a real behaviour fix: `readJson` now rejects an
array, so an array-shaped `cost.json` degrades to the designed `n/a` line instead of rendering seven
`unknown` rows — re-probed live, the same input that returned `[1,2,3]` now returns `null`. **F1 changed
no behaviour at all**: a back-tick-bearing path still renders with a broken inline span, by design. What
changed is that the header no longer claims a universal it does not satisfy — it names the exception, and
a test now fails if the unqualified sentence returns. A prose fix is the right instrument there, because
the defect was prose.
