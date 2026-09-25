# VERIFY — markdownlint-ignore-agents

Machine report: [`verify-report.json`](./verify-report.json). Its `feature` / `gates` / `verdict` /
`failing_gates` fields are the `check-verify.mjs` stdout verbatim, and the `verifiers` block is appended after.

## Environment (orchestration, advisory)

The gates ran in this worktree while it held the gitignored copy of `.agents/` (19 `SKILL.md` files), which is the
condition the increment addresses. `.pharn/pharn-dev-ship/pr-body.md`, the merged PR #273's body left by the previous
run here, had been moved to the session scratchpad before the run. It is gitignored scratch that `lint:md` also read
(one MD038), and it is not this increment's subject.

## FLOOR layer — gates (exit codes)

```text
test                                           0   (npm test: 3309 tests, 3309 pass, 0 fail, 0 skipped)
validate                                       0   (FLOOR: GREEN — 36 capabilities)
lint                                           0
format:check                                   0
lint:md                                        0   (Linting: 1470 files · Summary: 0 issues in 0 files)
structural:…/expected-injection-comment.json   0
reconcile                                      0   (CLEAN · epoch anchored by pharn-dev-build · 3 reconciled · 0 escapes)
```

`reconcile` exempted this feature's `REGRESSION.md` and `regression-report.json` as pipeline artifacts. The second
was copied in by Bash, from the helper's stdout, so that it stays verbatim.

## Verdict (FLOOR — `check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS.**

The increment's own check is the new premise test in `.dev/floor/command-hygiene.test.mjs`, collected by `npm test`.
The `lint:md` exit 0 above is the prompt's requested confirmation, measured with `.agents/` present.

## ADVISORY layer — verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check. Verifier
concerns would have been advisory help, not assurance.
