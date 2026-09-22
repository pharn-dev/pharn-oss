# SHIP — build-regress-spec-unread

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`. `check-plan-lessons` was GREEN. The prompt's version (6.9.1 → 6.9.2)
   was out of date, so the plan corrected it to 6.11.0 → 6.11.1. It also found one line the prompt had
   not listed (`pharn-build.md`, "quotes anything from the plan / SPEC"). **GATE 1** was approved by the
   model under the user's written delegation for this batch. It is recorded as such, not as a human
   approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exit `0`. The setter parsed 5 paths against 5
   declared bullets. There were 2 advisory concerns, 0 of them blocking-severity:
   - The required intent-fidelity sentence overclaimed a gate. It was qualified in place during the build.
   - Build's historical "(the SPEC's …)" citation was kept, and named in the (b) list.
3. `/pharn-dev-build`: `validate` exit `0`.
4. `/pharn-dev-regress`: `"no-regressions"`.
5. `/pharn-dev-verify`: `"PASS"` (`reconcile` CLEAN, 2591/2591 tests). The (a) list is empty, and every
   (b) line is present (`VERIFY.md`).
6. `/pharn-dev-review`: 0 floor-gate findings and 2 advisory ones, both minor and both left as recorded.
7. **GATE 2:** the decision was **merge**, taken under the same delegation, once CI is green.

## Build note

Both product commands now read `PLAN.md` only. `SPEC.md` leaves both `reads:` lists, and each prefix,
Step 1.2 and trust audit now says the SPEC is hashed by `check-plan-spec-agree.mjs` and never read by the
model. Each trust audit gains a P0 line that labels this ADVISORY. The checker's argv, and so the chain,
are byte-identical. `SKILLS_VERSION` moves 6.11.0 → 6.11.1, and the badge and CHANGELOG move with it.

## Pointers

- `REVIEW.md` — not restated here.
- `GRILL.md` — advisory.
- `VERIFY.md` — the post-build (a)/(b) sweep.

lesson: none — no candidate cleared the L20 bar. The out-of-date version in the prompt was caught by
live discovery (P6), which is the existing remedy working.

deferred:

- REVIEW.md, advisory finding 1: reword regress's "never reads their free-text" prefix clause (a
  pre-existing tension).

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
