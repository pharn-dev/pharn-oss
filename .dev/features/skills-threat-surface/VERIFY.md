# VERIFY — skills-threat-surface

## FLOOR layer — the gates that OWN the verdict

| gate                                           | exit | meaning                                                |
| ---------------------------------------------- | ---- | ------------------------------------------------------ |
| `test`                                         | 0    | whole-repo suite: **2066 pass / 0 fail**               |
| `validate`                                     | 0    | structural floor GREEN — 36 capabilities checked       |
| `lint`                                         | 0    | eslint clean, whole-repo                               |
| `format:check`                                 | 0    | prettier clean, whole-repo                             |
| `lint:md`                                      | 0    | markdownlint clean, whole-repo                         |
| `structural:…/expected-injection-comment.json` | 0    | the one committed eval pair                            |
| `reconcile`                                    | 0    | **CLEAN** — no Bash write the guards would have denied |

Seven gates, all exit 0.

### The `reconcile` gate earned its place this run

This increment did an unusually large amount of **Bash** work — patch generation, a baseline worktree,
`npm ci`, suite runs — none of which the `PreToolUse` guards see. The reconciler compared the worktree
against the epoch `/pharn-dev-build` anchored and reported:

- `verdict`: **CLEAN**, `epoch` `2026-09-21T08:28:25.727Z`, `anchored_by` `pharn-dev-build`
- `reconciled`: **4** paths · `escapes`: **[]** · `warnings`: **[]**
- `exempted`: `REGRESSION.md`, `regression-report.json` (pipeline artifacts, written by their own stage
  under its own scope)

Every artifact this increment produced went through the **Write tool under an active scope**; the
scratchpad, `.pharn/**` and `node_modules` are outside the reconciled set by construction.

**What CLEAN does and does not mean (`pharn/pharn-contracts/reconciliation-record.md`):** it means **no
escape was detected**, never that none occurred. The reconciled set excludes git-ignored paths, the
window is anchor→reconcile, and there is **no attribution** — it reports _what_ changed, never _who_.
It is an accounting tool against tooling that escapes its scope, **not** a control against an attacker:
the baseline is unauthenticated state under `.pharn/`, which Bash can reach.

## ADVISORY layer — verifiers

**No verifiers registered — floor gates only.** `node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`. Step 2 is a no-op and the verdict is the floor gates alone. No
verifier is authored speculatively (P7); the slot's live runner is deferred until the first one lands.
No verifier free-text exists, so no untrusted content entered this report.

## Verdict

**VERIFIED: floor gates PASS.** (`check-verify.mjs` → `"verdict": "PASS"`, `failing_gates: []`,
**exit 0**.)

**The honest residual (P0/P7):** verified = **the named gates passed**. This is **NOT** a guarantee of
correctness beyond what those gates check — verifier concerns would be advisory help, not assurance,
and there are none. The bound bites harder than usual on this increment, and it should be said plainly:
**the gates cannot see the thing this increment is actually about.** Nothing in the suite reads
trusted-doc prose, so no gate here evaluates whether the new `§2` item 8, the `§3` row, or the `§5`
rewording are **true, honest, or non-inflating**. What the gates prove is that the repo is green with
the staged patches present — and the patches are not applied, so even that is a statement about four
files under `.dev/`, not about `THREAT-MODEL.md`.

The parts of this increment that were genuinely verified deterministically are recorded where they
happened, not here: `git apply --check` exit 0 over all three patches together (build), the patched
manifest's prettier + JSON validity (build), and the pre-apply `check:markers` **RED** that establishes
why the three patches are atomic (plan D5). The post-apply GREEN remains **unexecuted** by design — the
guard denies the agent the write — and `proposed/APPLY.md` says so rather than implying otherwise.
