# VERIFY — promote-dev-parity

> **Re-run after the GATE-2 fixes.** The human's GATE-2 decision was "fix the four advisory findings
> first", so all four were fixed in the two already-declared files and **every gate below was re-run over
> the final bytes**. The verdict is not carried forward from the pre-fix run. `npm test` reports
> **1720 pass / 0 fail / 0 skipped** — the zero-skip count is checked explicitly, because with a missing
> `node_modules` the local-binary probes self-skip and a PASS would read stronger than it is.

## FLOOR layer — the deterministic gates (these own the verdict)

| gate                                                                                          | exit |
| --------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test` — 1720 tests, includes this increment's own 37 new ones)                   | 0    |
| `validate` (`node pharn/floor/validate.mjs .` — 36 capabilities)                              | 0    |
| `lint` (eslint)                                                                               | 0    |
| `format:check` (prettier, whole-repo)                                                         | 0    |
| `lint:md` (markdownlint, whole-repo)                                                          | 0    |
| `structural:…/expected-injection-comment.json` (vs `.dev/features/trust-fence/findings.json`) | 0    |

The `test` + `lint` + `format:check` + `lint:md` set is exactly the repo's `npm run check` aggregate, so
this verdict tracks the full style surface (L9).

## VERDICT (FLOOR — `check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS** — every gate in the map exited 0.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

**No verifiers registered — floor gates only.** Step 2 is a no-op; membership is a deterministic
frontmatter read, never a prose grep. Nothing annotated the report, and nothing could have flipped the
verdict if it had (fix #3).

## What this increment's own new gates actually establish

The 37 tests added to `.dev/floor/command-hygiene.test.mjs` are inside the feature, so they are collected
by `npm test` above rather than by a `structural:*` gate (this increment ships no eval pair — it adds no
`role:`-bearing capability). Their content, stated at its real strength:

- **8 obligations × 2 surfaces × 2 rules** (presence + strip-and-retest discrimination) = 32, plus 4
  cross-surface closure/non-vacuity rules and 1 enumeration pin = **37**.
- **Mutation-tested before authoring, not after** (L4): each of the 8 anchors was counted against the
  committed pre-port `pharn-dev-memory-promote.md` and the post-port file — **8/8 matched only after the
  port**, so no rule passes by construction. Measured, recorded in `GRILL.md`.

**Honest bound, and it is the whole point (P0):** these gates pin that each command's **prose contains**
the pinned line or mandated verb. They cannot prove a run executed the step, that a HALT is obeyed, or
that the two ported inline `node -e` one-liners (the canon hash compare and the title shape check) are
implemented correctly — neither has a test of its own, unlike `check-provenance.mjs`. **"The parity is
pinned" never means "the gate ran."**

## Honest residual (P0)

Verified = **the named gates passed**. This is NOT a guarantee of correctness beyond what those gates
check — a defect no test, eval, rule or lint covers is invisible to this verdict, and the verifier layer
that might have noticed it is advisory and, today, empty. Verifier concerns are advisory help, not
assurance.
