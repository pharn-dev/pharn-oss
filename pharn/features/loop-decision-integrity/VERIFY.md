# VERIFY — loop-decision-integrity

chain: GREEN (`pharn/floor/check-plan-spec-agree.mjs`, re-verified — 4th enforcing consumer)

## Gate set (discovery: allowlist ∩ present `package.json` scripts, same rule as `/pharn-regress`)

`{ test, lint, format:check, lint:md, typecheck, type-check, build }` ∩ present scripts →
`{ test, lint, format:check, lint:md }`. No `typecheck`/`type-check`/`build` script exists in this repo.
Plus the always-present `reconcile` gate (`check-bash-reconcile.mjs --require-baseline` — `/pharn-build`
anchored an epoch, so an absent baseline here would be a real refusal, not a fresh-clone `NO_BASELINE`).
No `structural:<expected>` gates: the plan's `## Files` declares no capability directory with a committed
`evals/expected/*.json` — every touched file here is a floor checker or a document, not a `role:`-bearing
capability.

## Gate → exit code (HEAD, single run)

| gate           | exit |
| -------------- | ---- |
| `test`         | 0    |
| `lint`         | 0    |
| `format:check` | 0    |
| `lint:md`      | 0    |
| `reconcile`    | 0    |

`reconcile` verdict: `CLEAN` — no path changed since the build's anchor that the live write-guards would
have denied. `.pharn/pharn-verify/reconcile.json`'s `escapes: []`; `exempted` names the three pipeline
artifacts (`BUILD.md`, `REGRESSION.md`, `regression-report.json`) written under their own stages' scoped
re-derivations, as expected. **This is the exact gate the incident that motivated this feature left
unrun** — closing the loop on the thing it was built to catch.

## Completeness

`node pharn/floor/check-build-complete.mjs` → `complete: true`. Every concrete `## Files` path (12
declared, all concrete — no placeholders) exists.

## Verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}` — no verifiers registered,
floor gates only.

## Verdict

```text
VERIFIED: floor gates PASS
```

`pharn/floor/check-verify.mjs` → `"verdict": "PASS"`, `failing_gates: []`, exit 0.

**The honest residual (P0):** verified = the named gates passed AND every declared path exists; this is
NOT a guarantee of correctness beyond what those gates check — completeness is "files exist", not
"semantically done", and there were no verifier concerns to weigh because no verifier is registered.
