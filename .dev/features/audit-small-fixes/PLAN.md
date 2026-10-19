# PLAN — audit-small-fixes

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L35, L36, L40, L41, L52, L68]
- increment: Five small fixes from the 2026-10-12 audit (batch 2026-10-19 group A, LIGHT mode): the README's
  installer Node line (ARCH-4), two non-hermetic live-repo tests (TST-6), three private copies of the feature-slug
  grammar (ENF-5), a test that no settings file sets `disableAllHooks` (SEC-7, test part), and stale cites in three
  floor headers (ARCH-5, cites only).
- layer(s): product floor (`pharn/floor/` modules and tests), hook tests, dev-floor tests, repo meta
- constitution_refs: [P0, P4, P6, P7]

## Trigger (P7)

The 2026-10-12 audit findings ARCH-4, TST-6, ENF-5, SEC-7 and ARCH-5, each re-confirmed open at `d5453a17`
(SKILLS_VERSION 6.64.2) by the batch triage and re-read live this run.

## Applied lessons

- L35 — ENF-5 retires three stored copies of the slug grammar (`run-marker.mjs` NAME_RE, `ac-tests-lock.mjs` and
  `check-test-stage.mjs` SLUG_RE) by importing `gate-run-core.mjs`'s `FEATURE_SLUG_RE`, rather than adding a sync
  check for each. The copies that cannot import it (two human-only hooks, a command's prose) get a parity check.
- L36 — the parity test compares whole literals for equality against the exported constant, not a presence match.
- L40 — the `disableAllHooks` check gets a negative control: a planted object carrying the key must fail the same
  helper the live assertion uses, so the test can tell the defect from the fix.
- L41 — TST-6 deletes the two tests that exercised the CLI's defaults only against the live repo; their defaults
  (`now` = the real clock, `targetDir` = `.`) are re-tested against a hermetic fixture, so the defaults stay
  exercised by something.
- L52 — the "EVERY copy" parity test is extended over every remaining literal copy that `grep -F` finds for a
  feature slug (the hooks' `RUN_NAME_RE`, `pharn-ship-close.md`), and asserts the three retired modules now import
  rather than declare.
- L68 — `npm run check` includes `check:reconcile`, which compares the control surface (`pharn/floor/*`,
  `.dev/floor/*`, `.claude/hooks/*`) against committed blob ids, so the edits are committed before the gates run.

## Changes

1. ARCH-4 — `README.md` Quick start: "requires Node 20 or newer" → "requires Node 24.2 or newer (the installer
   refuses older)". The next sentence (the floor's 24.2 requirement) stays.
2. TST-6 — `.dev/floor/check-skills-version-recorded.test.mjs`: delete "DEFAULT `now`" and "DEFAULT `targetDir`"
   (they ran the CLI against the live repo under the real clock; `npm run check:changelog` already does that), and
   delete the third, "NON-VACUITY against the real repo", which only proved the deleted live GREEN non-vacuous and
   restates `check:changelog`'s first rule against live state. Add two hermetic tests: the CLI with no injected clock
   is GREEN on an entry dated today and FUTURE_DATE on one dated a year ahead (so the default is the real clock);
   the CLI with no argument, run with `cwd` = a fixture, reads that fixture.
3. ENF-5 — `run-marker.mjs`, `ac-tests-lock.mjs`, `check-test-stage.mjs` import `FEATURE_SLUG_RE` from
   `./gate-run-core.mjs` (which imports nothing) and drop the private constant. Messages print the same regex.
   `gate-run-core.mjs`'s doc comment on `FEATURE_SLUG_RE` is brought up to date. `gate-run-core.test.mjs`'s
   "EVERY copy" parity test also reads `.claude/hooks/set-writes-scope.cjs` and `.claude/hooks/enforce-writes-scope.cjs`
   (`RUN_NAME_RE`, read only) and `.claude/commands/pharn-ship-close.md` (the `^…$` literal, read only), and asserts
   the three modules import the constant and declare no copy.
4. SEC-7 (test part) — `.claude/hooks/hook-wiring.test.cjs`: `.claude/settings.json` carries no top-level
   `disableAllHooks` key, nor does `.claude/settings.local.json` when it exists; with a negative control. The LIMITS
   §6 prose goes to `HUMAN-PATCH.md`.
5. ARCH-5 (cites only) — header comments: `check-ship.mjs` (`/ship --loop` → `/pharn-dev-ship --loop`,
   `floor/check-variance.mjs` → `.dev/floor/check-variance.mjs`, `.claude/commands/ship.md` →
   `.claude/commands/pharn-dev-ship.md`), `check-verify.mjs` and `check-regress.mjs` (`floor/check-variance.mjs` →
   `.dev/floor/check-variance.mjs`; `check-regress.mjs:5` carries the same stale cite and is fixed with it). No move.
6. Version: product-floor bytes change, so SKILLS_VERSION 6.64.2 → 6.64.3 (patch), README badge, CHANGELOG section.

## Bounds

- The hook test reads the two project settings files only; a user-level `~/.claude/settings.json` is outside the
  repo and outside any hermetic test — HUMAN-PATCH.md names it for LIMITS §6 instead.
- The parity test pins literals that a human-only file holds; it cannot keep them equal, only RED when they drift.
- `mark-phase.mjs` and `render-run-report.mjs` keep their private copies (not in this assignment); the parity test
  still covers them.

## Files

- `.dev/features/audit-small-fixes/PLAN.md` — this plan. — layer: dev trail
- `.dev/features/audit-small-fixes/HUMAN-PATCH.md` — proposed LIMITS §6 sentence. — layer: dev trail
- `README.md` — ARCH-4 Node line and the version badge. — layer: repo meta
- `.dev/floor/check-skills-version-recorded.test.mjs` — TST-6. — layer: dev floor tests
- `pharn/floor/run-marker.mjs` — ENF-5 import. — layer: product floor
- `pharn/floor/ac-tests-lock.mjs` — ENF-5 import. — layer: product floor
- `pharn/floor/check-test-stage.mjs` — ENF-5 import. — layer: product floor
- `pharn/floor/gate-run-core.mjs` — ENF-5, the `FEATURE_SLUG_RE` doc comment only. — layer: product floor
- `pharn/floor/gate-run-core.test.mjs` — ENF-5 parity test. — layer: product floor tests
- `.claude/hooks/hook-wiring.test.cjs` — SEC-7 test. — layer: hook tests
- `pharn/floor/check-ship.mjs` — ARCH-5 header cites. — layer: product floor
- `pharn/floor/check-verify.mjs` — ARCH-5 header cite. — layer: product floor
- `pharn/floor/check-regress.mjs` — ARCH-5 header cite. — layer: product floor
- `SKILLS_VERSION` — 6.64.2 → 6.64.3. — layer: repo meta
- `CHANGELOG.md` — new `## [6.64.3]` section. — layer: repo meta
