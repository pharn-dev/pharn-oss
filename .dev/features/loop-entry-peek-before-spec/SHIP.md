# SHIP — loop-entry-peek-before-spec (Linear CORE-398)

Stages run, in order (the re-planned run): `/pharn-dev-plan` (re-plan; GATE 1 approved as written by the human) →
`/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2,
where the human chose **fix** (the review's stop-wording finding) → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` (re-review of the delta). The run ended at **GATE 2**. The verdicts below
are the fix round's.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Regress (base `d2da72dc`, the L87 commit): no outside gate flipped; per-test 7,168 → 7,176 passed, 0 failed
  (`REGRESSION.md`, `regression-report.json`).
- Verify: all seven gates exit 0 — test, validate, lint, format:check, lint:md, instruction-growth, reconcile
  (`VERIFY.md`, `verify-report.json`). No verifiers registered.
- Review (advisory): `REVIEW.md` — the re-review resolves the important P5 finding (the early stop now routes through
  `## At the stop`, which aborts the still-running runner) and the P3 nit; the P7 minor (timing unmeasured, follow-up
  `entry-peek-settle`) stands. No new finding.
- Grill (advisory): `GRILL.md` — G1, G2 from the first grill; G3 from the re-plan grill.
- History: the first run of this plan stopped at regress (`verdict: regressions`; the build reworded a pointer sentence
  `.dev/floor/command-family.test.mjs` pins, outside `## Files`) and was re-planned with the test. In the fix round the
  first regress attempt stopped at its scope step: the L87 canon and index writes, made after verify and uncommitted,
  read as build escapes. The human approved committing the promotion alone (`d2da72dc`), and regress re-ran on that
  base. `PLAN.md` § Re-plan and `REGRESSION.md` § History record both.
- Build note: the third peek block at the top of Step 3 (its stop routed through `## At the stop`), the S14/S14b rows
  and the other mentions reworded, the close pointer reworded, a close-part Step 7 bullet, the `entry-gates.mjs` header
  comment, the ★ PEEK_WIRING test (three loop sites; L60 negative control: moving the new peek after the spec start
  line turned it red), the command-family pin, the guide line, 7.26.0, the badge, the regenerated
  `pharn-install.json`, the CHANGELOG section. In the first run the regress report's verbatim copy was first made with
  a Bash `cp` (in-scope path), then re-written through the Write tool and `cmp`-checked identical.

changelog-entry: exit 0
lesson: promoted L87
deferred: a promotion made at GATE 2 and left uncommitted reads as a build escape at a later fix round's regress — commit it alone before the round (`REGRESSION.md` § History — the GATE 2 "fix" round)

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
