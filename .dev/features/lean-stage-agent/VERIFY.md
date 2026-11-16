# VERIFY — lean-stage-agent (CORE-107)

Gates run through `pharn/floor/run-gates.mjs` (stage `verify`), one `run --next` per gate, in the background. Verdict
by `pharn/floor/check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json` (exit 0).

| gate                 | exit |
| -------------------- | ---: |
| `test` (818 s)       |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    0 |

- Completeness (`stamp.aux.completeness`): 0. Every concrete `## Files` path is present.
- `reconcile`: `CLEAN`. Epoch `2026-11-16T17:44:37.092Z`: the second anchor, after the recorded plan widening
  (`PLAN.md`, "Build deviation"). 6 paths were reconciled, with no escapes. Exempted: this feature's
  `REGRESSION.md` and `regression-report.json`.
- Verifiers: `{"registered":0,"verifiers":[]}`. No verifiers are registered, so the floor gates alone set the verdict.
- Gate-run stamp: `a3b44436…82e7`, fingerprint `5c74cd22…2f10`.

**VERDICT: PASS — the named deterministic gates passed.** That is the whole claim. It does not mean the feature is
correct in any sense the suite does not encode. The type's live behaviour (its tool list, the fallback, the first
request's size) is pending on the CORE-107 probe kit.
