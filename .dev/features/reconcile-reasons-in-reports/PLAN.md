# PLAN — reconcile-reasons-in-reports

- feature: reconcile-reasons-in-reports
- applied_lessons: [L34, L35]

When verify's `reconcile` gate fails, `VERIFY.md` and `RUN-REPORT.md` name only the gate id, so a human must re-run
`check-bash-reconcile.mjs --require-baseline` by hand to see which paths escaped and why (contract
`reconciliation-record.md` names rendering the reason as a follow-up). This increment makes `stage-verify.mjs` read the
reconcile gate's recorded stdout (the `<seq>-reconcile.out` log under the verify gate dir, bound to the stamp's
`stdout_sha256`), parse the checker's JSON document by a pure core (`reconcile-detail-core.mjs`), and merge a
`reconcile_detail` block into `verify-report.json`. `render-verify.mjs` renders it (capped escape rows, closed `reason`
only after a membership test, paths JSON-quoted inside a fence, merged count), and `render-run-report.mjs` renders the
same block from `verify-report.json` when the final verify failed on `reconcile` — the exact predicate `check-loop.mjs`
uses for `terminal_cause: reconcile`. A missing, unreadable, digest-mismatched or non-checker log renders one line
saying so and how to re-run the checker. The dev twin `/pharn-dev-verify` writes `VERIFY.md` by prose and shares no
renderer, so it is left unchanged and the report says so. Advisory presentation only: no verdict reads the block.

## Applied lessons

- **L34:** a malformed escape entry and an absent detail block must not look the same — the parser classifies the log
  into a closed state (`parsed` / `log-missing` / `log-unreadable` / `log-digest-mismatch` / `not-checker-json`) and the
  renderer prints a line for every non-parsed state rather than an empty list; tests cover the garbage-log case.
- **L35:** the closed escape `reason` enum moves from `check-bash-reconcile.mjs` into the new pure core, and the checker
  imports it back from there (re-exported under the same names), so there is one copy, not a second synced list.

## Files

- `.dev/features/reconcile-reasons-in-reports/PLAN.md` — **NEW.** this plan.
- `pharn/floor/reconcile-detail-core.mjs` — **NEW.** pure parse of the reconcile log into the report block, and the shared line renderer.
- `pharn/floor/reconcile-detail-core.test.mjs` — **NEW.** parser + renderer tests (escapes with reason, hostile name, merged only, garbage log).
- `pharn/floor/check-bash-reconcile.mjs` — **EDIT.** import the escape-reason enum from the core (one copy).
- `pharn/floor/stage-verify.mjs` — **EDIT.** read the reconcile gate log bound to the stamp digest and pass the block to composeReport.
- `pharn/floor/stage-verify-core.mjs` — **EDIT.** composeReport merges `reconcile_detail`.
- `pharn/floor/stage-verify-core.test.mjs` — **EDIT.** pin the new merged key.
- `pharn/floor/stage-verify.test.mjs` — **EDIT.** end-to-end: a reconcile escape reaches VERIFY.md.
- `.dev/floor/command-hygiene.test.mjs` — **EDIT.** its pin on composeReport's report literal gains `reconcile_detail`.
- `pharn/floor/render-verify.mjs` — **EDIT.** render the reconcile detail section.
- `pharn/floor/render-verify.test.mjs` — **EDIT.** VERIFY.md fixtures.
- `pharn/floor/render-run-report.mjs` — **EDIT.** render reconcile reasons when verify failed on reconcile.
- `pharn/floor/render-run-report.test.mjs` — **EDIT.** RUN-REPORT fixture for the reconcile stop.
- `pharn/pharn-contracts/verify-report.md` — **EDIT.** document the `reconcile_detail` block.
- `pharn/pharn-contracts/reconciliation-record.md` — **EDIT.** the reason is now rendered; retire the named follow-up.
- `.dev/guides/floor-checks.md` — **EDIT.** reconcile section: reasons now rendered.
- `.dev/guides/floor-gates.md` — **EDIT.** stage-verify section + the new core.
- `.dev/guides/floor-orchestration.md` — **EDIT.** render-run-report section.
- `SKILLS_VERSION` — **EDIT.** 6.55.0.
- `CHANGELOG.md` — **EDIT.** 6.55.0 entry.
- `README.md` — **EDIT.** version badge and the generated current-state region.
