# VERIFY — nul-bytes-scanner

## FLOOR layer — the deterministic gates (these OWN the verdict)

| gate                                         | exit | note                                               |
| -------------------------------------------- | ---- | -------------------------------------------------- |
| `test`                                       | 0    | `npm test` — whole-repo suite, incl. the new guard |
| `validate`                                   | 0    | `pharn/floor/validate.mjs .` — structural floor    |
| `lint`                                       | 0    | eslint, whole-repo                                 |
| `format:check`                               | 0    | prettier, whole-repo (L9)                          |
| `lint:md`                                    | 0    | markdownlint, whole-repo (L9)                      |
| `structural:expected-injection-comment.json` | 0    | the one committed eval pair                        |

The gate set is exactly the repo's `npm run check` aggregate plus the structural eval gate, so this
verdict tracks the full `check` chain. Both eval-pair paths were confirmed readable before their exit
code was recorded (L5 / L16 / L21).

## Verdict

**VERIFIED: floor gates PASS.**

`pharn/floor/check-verify.mjs` → `"verdict": "PASS"`, `failing_gates: []`, exit **0**. The verdict is an
exit-code threshold (`PASS` iff every gate is 0) computed by the helper; no judgment of mine entered it.

## ADVISORY layer — verifiers

**No verifiers registered — floor gates only.** `pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}` (a deterministic frontmatter read, never a prose grep). Step 2 is a
no-op, so no advisory finding exists to annotate this report and none could have flipped the verdict
anyway — `check-verify.mjs`'s only input is the gate→exit-code map, which cannot carry a finding.

## What this increment's own gates actually cover

Recorded because "the suite passed" is weaker than it sounds, and this increment's value is a detector:

- The repaired scanner's own 28 tests pass unchanged, and — beyond the suite — its stdout and exit code
  were compared **byte-for-byte before and after** the change over a fixture exercising the dedup-key
  path (three lines each carrying two risky ops, so the key is actually collided against). Identical.
- The new guard's 5 tests include a **positive-detection** assertion in both directions, so a predicate
  that could never fire would RED rather than certify by silence. The predicate was additionally
  mutation-checked against the **real pre-fix bytes**: it reports lines `[314, 320]` on the pre-fix file
  and `[]` on the repaired one.

## The honest residual (P0/P7)

**Verified = the named gates passed.** This is NOT a guarantee of correctness beyond what those gates
check — a defect no test, eval, rule or lint covers is invisible to this verdict, and the verifier layer
that might have noticed it is advisory and, today, empty. Specifically **not** established here: that
the guard's coverage is sufficient (it tests one byte value across two non-recursive directories), or
that `3.0.4` is the right version number (`check:badge` proves only that `SKILLS_VERSION` and the README
badge agree, which is a consistency claim, not a correctness one).
