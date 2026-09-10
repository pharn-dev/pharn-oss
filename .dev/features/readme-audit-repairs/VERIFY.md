# VERIFY — readme-audit-repairs

**Feature:** `readme-audit-repairs` · **Commit:** `4375b299379ae58332ff6a53aa4931237b6c41b3`
(branch `docs/readme-audit-repairs`)

## FLOOR layer — the gates that own the verdict

| gate                                    | exit | note                                            |
| --------------------------------------- | ---- | ----------------------------------------------- |
| `test`                                  | 0    | 1886 tests · 1886 pass · 0 fail · **0 skipped** |
| `validate`                              | 0    | `FLOOR: GREEN — 36 capabilities`                |
| `lint`                                  | 0    | eslint, whole-repo                              |
| `format:check`                          | 0    | prettier, whole-repo                            |
| `lint:md`                               | 0    | markdownlint, whole-repo                        |
| `structural:expected-injection-comment` | 0    | the one committed eval pair (trust-fence)       |

`failing_gates[]`: **empty**.

### The self-skip check L37 demands — performed, not assumed

`.dev/floor/capability-catalog-core.test.mjs:477` — _"style: a spliced README passes the repo's prettier
and markdownlint unchanged"_ — is the **single most relevant test for a README-only change**, and L37
records it silently self-skipping (at exit **0**) when the dev toolchain is absent. `check-verify.mjs`
cannot see the difference: a suite that skips still exits 0.

**It RAN.** The suite reports `✔ style: a spliced README passes the repo's prettier and markdownlint
unchanged (7371.7545ms)` — a real execution, not the instant no-op a skip produces — and the run-wide
counter is **`skipped 0`**, so **nothing** in the suite withdrew. Recorded explicitly because "the gate
was green" and "the gate ran" are different claims, and L37 exists because only the first was ever
checked.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

**No verifiers registered — floor gates only.** Step 2 is a no-op by membership, not by omission, and no
verifier is authored speculatively (P7). No verifier free-text exists in this run, so nothing untrusted
entered the report.

## Verdict

**VERIFIED: floor gates PASS.** (`pharn/floor/check-verify.mjs`, exit **0** — `PASS iff every gate exit 0`.)

## The honest residual

**Verified = the named gates passed.** This is **not** a guarantee of correctness beyond what those gates
check; verifier concerns would be advisory help, not assurance, and there are none because none are
registered.

**And for this increment the residual is unusually wide, which is worth stating rather than leaving for a
reader to infer.** The change is five English sentences in `README.md`. **No gate above reads a README
sentence for truth** — `validate` ignores root docs, `check-capability-catalog` guards only the
`CURRENT-STATE` markers, `check-version-badge` reads only the shields badge, and the style gates check
formatting, not claims. The `test` gate's relevance here is confined to the one spliced-README **style**
test named above.

So the gates prove: the repo is green with this change in it, the generated block is untouched, and the
file is well-formed. They prove **nothing about whether the five repaired sentences are true.** That
evidence lives elsewhere and is deliberately not laundered into this verdict: each sentence was verified
at plan time by a live read or an executed probe, and `/pharn-dev-grill` independently re-derived them and
**rejected one** (F2) whose premise did not hold. That is human-and-model work, advisory by nature.

This is the same gap the increment's own **F5** finding is about — no checker reads README prose — and it
is the reason the plan's P7 deferral (a behavioural probe type for `check-specified-markers.mjs`) is
recorded with a named reopen trigger rather than quietly dropped.
