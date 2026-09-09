# VERIFY — writes-scope-default-disclosure

## FLOOR layer — the deterministic gates (these OWN the verdict)

| gate                                           | exit | note                                                                    |
| ---------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| `test`                                         | 0    | `npm test` — 1683 tests, **1683 pass / 0 fail / 0 skipped**             |
| `validate`                                     | 0    | `pharn/floor/validate.mjs .` — FLOOR: GREEN, 36 capabilities            |
| `lint`                                         | 0    | `npm run lint` (eslint)                                                 |
| `format:check`                                 | 0    | `npm run format:check` (prettier, whole-repo — L9)                      |
| `lint:md`                                      | 0    | `npm run lint:md` (markdownlint, whole-repo — L9)                       |
| `structural:…/expected-injection-comment.json` | 0    | the one committed eval pair ↔ `.dev/features/trust-fence/findings.json` |

The `test` + `validate` + `lint` + `format:check` + `lint:md` set is exactly the repo's `npm run check`
aggregate, so this verdict tracks the full `npm run check` — L9's style-gate hole closed **at verify**
rather than only at CI (cited, not restated — P4).

### A self-skipping test the threshold could not see — found at GATE 2, and it is the sharpest bound here

This stage was run **twice**. The first run reported `test` exit 0 with **1682 pass / 1 skipped**; the
re-run over the final bytes reports **1683 pass / 0 skipped**. The difference is not the increment — it
is that `node_modules` was absent on the first run.

`.dev/floor/capability-catalog-core.test.mjs:475-479` gates one test on
`{ skip: missingBins.length > 0 }`, where `missingBins` is `["prettier", "markdownlint-cli2"]` filtered
by `existsSync(REPO_ROOT/node_modules/.bin/<name>)`. That test is
**`style: a spliced README passes the repo's prettier and markdownlint unchanged`** — the single most
relevant test in the suite for a README-only change, and the one that silently did not run.

**Why this matters beyond bookkeeping (P0):** `check-verify.mjs` computes `PASS iff every gate exit 0`,
and a suite that skips a test still exits **0**. So a self-skipping test is **structurally invisible to
the verdict** — the threshold cannot distinguish "ran and passed" from "declined to run". The skip is
correct behaviour in its own context (the `floor` workflow deliberately runs this suite on Node stdlib
alone, to prove the floor carries zero dependencies), and the test fails loudly if a binary is present
but the spawn breaks. The bound is on the VERDICT, not on the test: **exit 0 is not evidence of
coverage.**

Verified live rather than reasoned about: with the toolchain restored the test runs and passes
(`✔ style: a spliced README passes the repo's prettier and markdownlint unchanged`), and the skip count
falls to 0. Recorded here rather than filed as a finding against this increment, because the increment
did not cause it — it merely happened to be the change for which the invisible test mattered most.

**Gate-set caveat, stated because it is the honest one (two clocks, L9/P0):** `check-verify.mjs` is
generic over gate keys — it computes `PASS iff every gate exit 0` over **whatever** map this stage
assembles. That the two style gates are IN the map is this stage's **advisory** composition; no floor or
test locks them there. Do not read "verify runs the style gates" as floor-locked.

## ADVISORY layer — the verifier plug-in slot

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

**No verifiers registered — floor gates only.** Step 2 is a no-op and the verdict is the floor gates
alone. Membership was read deterministically from `role:` frontmatter, never grepped from prose (P5).
Zero verifiers is the P7-correct state, not a gap: none has been triggered by a real failure.

## Verdict (FLOOR — `check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS** — `failing_gates: []`.

**The honest residual (P0/P7):** verified = **the named gates passed**. This is **not** a guarantee of
correctness beyond what those gates check. Concretely for this increment, that bound is unusually wide
and worth naming rather than leaving implied: **no gate here reads README prose.** `validate.mjs`
ignores root docs; `check-capability-catalog` guards only the `CURRENT-STATE` markers, which this
increment does not touch; `check-version-badge` reads only the shields badge. So the six green gates
prove the repo is still structurally sound and style-clean **with the new bullet in it** — they prove
nothing about whether the bullet is TRUE.

What does support the bullet's truth is not this stage: it is the nine measured hook exit codes and the
three-state remedy probe recorded in `PLAN.md` under `## Discovery`, plus the two corrections
`GRILL.md` forced (G1, G2). That evidence is measurement, not a floor gate, and is labelled as such.

Verifier concerns would be advisory help, not assurance — and there are none, because there are no
verifiers.
