# VERIFY — ship-cost-ledger

## FLOOR layer — the deterministic gates (these OWN the verdict)

| gate                                    | exit |
| --------------------------------------- | ---- |
| `test` (whole-repo, 2325 tests)         | 0    |
| `validate` (36 capabilities)            | 0    |
| `lint`                                  | 0    |
| `format:check`                          | 0    |
| `lint:md`                               | 0    |
| `structural:expected-injection-comment` | 0    |
| `reconcile`                             | 0    |

The gate set is exactly the repo's `npm run check` aggregate plus the one committed eval pair and the
Bash-write reconciliation, so the verdict tracks the full chain — **L9**'s style-gate hole is closed at
this stage rather than only at CI.

**`reconcile` is the fix #7 blind-spot gate and it came back `CLEAN` with `escapes: []`.** The epoch was
anchored at `/pharn-dev-build` Step 0 **after** the scope-setter, so the baseline holds this build's own
16-path scope (**L38**). The checker re-hashed the tree and asked the **live guards**, by executing them,
whether each changed path would have been denied; none would. This matters for this increment
specifically, because a great deal of it was written through **Bash** — the emitters, the generator, the
formatters — and every one of those paths was declared in the plan's `## Files`.

**What `CLEAN` does and does not mean (`pharn/pharn-contracts/reconciliation-record.md`).** It means **no
escape was detected**, never that none occurred. Four bounds travel with it: git-ignored paths are
outside the reconciled set; the window is anchor→reconcile; the model is one worktree per session; and
there is **no attribution** — it reports _what_, never _who_. Detection is also **non-adversarial**: the
baseline is unauthenticated state under `.pharn/` that Bash reaches, so a writer who edited a denied file
**and** rewrote its baseline entry would obtain a silent `CLEAN`. It is an accounting tool against
tooling that escapes its scope, not a control against an attacker.

## ADVISORY layer — verifiers

**No verifiers registered — floor gates only.** `node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`. Membership is a deterministic frontmatter read, never a prose grep:
this file and the command that produced it both contain the string `role: verifier` as DATA about
verifiers, and neither registers one. Step 2 is a no-op, and no verifier finding exists to annotate the
report — so nothing advisory reached the verdict, which is the structural form of fix #3 rather than a
promise about it.

## Verdict

**VERIFIED: floor gates PASS.** `check-verify.mjs` exited **0** with `"verdict": "PASS"` and
`failing_gates: []` — every gate in the map exited 0, by an absolute threshold.

**The honest residual (P0/P7).** _Verified = the named gates passed; this is NOT a guarantee of
correctness beyond what those gates check._ A defect no test, eval, rule or lint covers is invisible
here, and the verifier layer that might have noticed it is advisory and currently empty. Measured for
this increment rather than asserted: line coverage over the four modules it touches is **98–100%** with
**100% function** coverage, and `ship-outcome-core.mjs` is 100/100/100 — but coverage measures which
lines RAN, never whether the assertions about them were the right ones.

**Two clocks.** The verdict is FLOOR — a non-LLM helper comparing integers, which cannot even receive a
finding. Choosing the gate set, running them, and assembling this report are **advisory orchestration**;
in particular there is no floor lock keeping `format:check` and `lint:md` in the map, which is why L9's
remedy lives in this command's prose and is named as such rather than read as floor.

---

## Re-derived after the post-review F1 fix

This verdict was **recomputed from scratch** after the human directed the F1 fix at the gate, not carried
over from the run before it. That mattered: removing the command name from the absent-briefing sentinel
left a parameter unused, the `lint` gate went **RED**, and `check-verify.mjs` returned
`FAIL ["lint"]`. The parameter was dropped rather than the linter silenced, and all seven gates were
re-run — every one exits 0 and `reconcile` is `CLEAN` against the same build-anchored epoch.

**An inherited PASS would have been a false one.** The verdict above describes the tree as it stands at
GATE 2.
