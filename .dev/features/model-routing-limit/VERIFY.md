# VERIFY — model-routing-limit

## FLOOR layer — the deterministic gates (these OWN the verdict)

| gate                                    | exit |
| --------------------------------------- | ---- |
| `test`                                  | 0    |
| `validate`                              | 0    |
| `lint`                                  | 0    |
| `format:check`                          | 0    |
| `lint:md`                               | 0    |
| `structural:expected-injection-comment` | 0    |
| `reconcile`                             | 0    |

`test` + `lint` + `format:check` + `lint:md` is exactly the repo's `npm run check` style/suite set, so
this verdict tracks the full aggregate (L9). The `structural:*` gate covers the one committed eval pair
(`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json`).

## VERIFIED: floor gates PASS

`check-verify.mjs` **exit 0**, `verdict: "PASS"`, `failing_gates: []`. Every gate in the map returned 0,
by an absolute threshold. The verdict is the helper's — this stage does not re-decide it, and no
judgment of mine enters it.

## The `reconcile` gate (fix #7's blind spot)

**`CLEAN`** — epoch `2026-09-21T10:03:59.028Z`, anchored by `pharn-dev-build`, **8 reconciled, 0
escapes, 4 exempted, 0 warnings.** No path changed since the build's anchor that the live write guards
would have denied.

This matters for **this** increment specifically, because much of its output was written through
**Bash** heredocs (the four `.patch` files) — precisely the surface `PreToolUse` never sees. Those paths
were inside the plan's declared `## Files`, so the guards would have allowed them, and the reconciler
confirms that by **executing the live guards** rather than re-deriving their logic.

**Bounds are the contract's, not this stage's** (`pharn/pharn-contracts/reconciliation-record.md`): the
reconciled set excludes git-ignored paths, the window is anchor→reconcile, the model is one worktree per
session, and there is **no attribution**. A `CLEAN` means **no escape was detected**, never that none
occurred — the baseline is unauthenticated state under `.pharn/`, which Bash can reach. It is an
accounting tool against tooling that escapes its scope, not a control against an attacker.

**One honest note on the epoch:** the anchor was taken at the FIRST build pass, with a 7-path scope.
The plan was later amended to 8 paths and the scope re-set, so `--amend-scope` was run twice
(amendments 1 and 2) to record the ship and amended-build scopes onto the open epoch rather than
judging later writes against the original. The anchor itself was **not** re-taken, which is correct:
re-anchoring resets the baseline and would erase any escape detected earlier in the run.

## ADVISORY layer — verifiers

**No verifiers registered — floor gates only.** `node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`. Membership is a deterministic frontmatter read, never a prose grep.
Step 2 is a no-op and the verdict is the floor gates alone. No verifier is authored speculatively (P7).

`verifiers: { registered: 0, findings: [] }` in the machine report.

## Honest residual (P0/P7)

**Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check** — verifier concerns would be advisory help, not assurance, and today there are none.

The bound is unusually visible on this increment and is worth stating rather than leaving implicit:
**the gates that passed here do not read the text this increment exists to ship.** `LIMITS.md` is
excluded from both `.prettierignore` and the markdownlint `ignores`, no checker reads its prose, and
`validate.mjs` ignores root docs. So `PASS` certifies that the repo is green **with the staged patches
present as patch files** — it says nothing about whether `LIMITS.md § 8`'s wording is accurate, whether
the Layer-1 / Layer-2 attribution holds, or whether the drained README bullet still reads coherently.
Those are the human's call at GATE 2, and the grill's advisory findings are the input to it.

What the gates **do** cover here, and it is not nothing: the four patches apply cleanly, the repo's 80
test files still pass with the version bookkeeping changed, the badge↔`SKILLS_VERSION` equality that
STOPped run 1 is now green, and no Bash write escaped the declared scope.
