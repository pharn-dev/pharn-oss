# PLAN — verify-test-reuse: LOOP-8 (reuse the regress-HEAD `test` run in verify) — close as won't-fix, correct the rationale

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L24, L25, L40, L43]
- increment: record, with evidence, that the regress-HEAD `test` execution can never stand in for verify's `test` run
  (it runs a different file set that excludes the feature's own AC tests), and correct the incomplete rationale at the
  two product sites a reader consults, so the next audit does not re-propose the same fix.
- layer(s): pharn-floor (one comment), pharn-contracts (one sentence), `.dev/guides/` (apparatus)
- constitution_refs: [P0, P4, P6, P7]

## The finding (audit 2026-10-12, LOOP-8, LOW, cost)

"gate-run-core.mjs:92-96,310-319; gate-reuse-core.mjs — `test` is non-reusable: 2 full suite runs per iteration, up to
8 at M=3, each ≤ 540 s. Fix: reuse regress-HEAD `test` in verify when its per-test results file is copied into
verify's out dir."

## Discovery (read this run, `origin/main` at `18037dd4`, SKILLS_VERSION 6.72.0)

The proposed fix assumes the regress-HEAD `test` run and verify's `test` run are the same execution, kept apart only
by the AC gate's need for a results file in verify's `<out>`. They are not the same execution:

1. **Regress HEAD runs a subset.** `pharn/floor/run-gates.mjs:818-820` (regress/head): `if (e.id === "test") e.files =
s.tests;` where `s.tests` is `scope.json` `outside_tests`. `check-regress.mjs partitionScope` (line 413):
   `outsideTests = tests.filter((t) => !insideSet.has(t))`, with `inside` = every path changed since the base
   (`scope-inputs.mjs changedPaths`). So the HEAD `test` gate runs `npm run test -- <outside test files>`.
2. **The AC tests are always inside.** In `/pharn-loop` and `/pharn-ship` the base is the SHA recorded when the run
   started (`pharn-loop.md` S3, line 282; `pharn-ship-stages.md:372`, `--base '<base sha>'`), before `/pharn-test` writes the AC test files. Those files are
   new or changed since that base, so they sit in `inside` and are NEVER executed by the regress-HEAD `test` run. Its
   per-test results file therefore holds no `AC-<n>:` test of this feature. Copying it into verify's `<out>` would make
   the AC gate read `ac-untested` for every AC (or, worse, read another run's tests), not deliver anything.
3. **Verify runs the whole suite as the pinned command.** Verify's `test` entry has `files: []` (`npm run test`), and the
   AC gate requires exactly that (`ac-gate-core.mjs:142-151` — `argv` `["npm","run","test"]`, `source: discover`).
4. **The execution identity already refuses it, independently of `NON_REUSABLE_IDS` (L40 — the attributed condition
   negated).** The identity hashes the ordered `files` (`gate-reuse-core.mjs` header, lines 15-19);
   `gate-reuse-core.test.mjs:200` pins "files differ (a test subset)" → `identity-mismatch`. When `outside_tests` is
   empty the HEAD entry is `ran: false, reason: "no-files"` → `not-completed`. So with `test` REMOVED from
   `NON_REUSABLE_IDS` and the AC gate switched off (a legacy SPEC, `NOT-APPLICABLE`), no real regress-HEAD `test` run
   could ever HIT: the removal would be dead code. The AC gate is a sufficient reason, not the only one — the existing
   rationale names only it, and that partial rationale is what made the audit's fix look one copy away (L25).
5. **The original design already saw this.** `.dev/features/verify-head-gate-reuse/PLAN.md`, discovery matrix row
   `test`: "files differ, and the AC gate needs verify's own results file → never reusable". That analysis lives in an
   apparatus file the product reader never sees.
6. **Product regress has no per-test mode.** 6.72.0's `check-regress.mjs verdict --per-test` is accepted on the
   positional path only; the stamp path refuses it, naming the follow-up `regress-per-test-product`
   (`check-regress.mjs:72-73`). `/pharn-regress` judges `test` by its gate exit alone.

### What a sound version would need (not this increment)

The only route to one `test` run per iteration that keeps the AC gate's guarantee: regress HEAD runs the WHOLE suite as
the pinned `npm run test` (identity equal to verify's), and regress judges the outside tests PER TEST from that run's
results record (inside tests ignored by file membership) — i.e. the follow-up `regress-per-test-product`, plus: the
BASE side changes the same way (and the 6.49.0 entry `base:test` slot and 6.33.0 retained BASE evidence with it);
regress then needs a per-test record (a `testResults` opt-in), so a project without one keeps today's subset run; and
verify's reuse must copy the results file and bind it to the source's `results_sha256` (today a reused entry must
record `results_sha256: null`, `gate-run-core.mjs:951`). That is a redesign of regress's verdict for `test` with a
minor-or-major bump and its own GATE 1 — not a LOW cost fix, and its P7 trigger would be a measured loop cost, which
the audit estimated (≈72 min at 9-min suites) but did not measure (L24).

## Decision proposed at GATE 1

**Close LOOP-8 as won't-fix in this batch**, and correct the rationale where readers look (L25), as a patch.

## GATE 1 decision (2026-10-23)

Decided by the batch orchestrator (a model) under the maintainer's delegation — a model decision, not a human
approval: Q1 = (a), close LOOP-8 as won't-fix with the rationale corrected; Q2 = yes, add `instruction-growth`. The
orchestrator spot-checked the evidence (run-gates.mjs regress/head `test` files = the outside subset;
`gate-reuse-core.test.mjs` "files differ (a test subset)" → `identity-mismatch`). Version: **6.72.2**, because a
parallel batch PR claims 6.72.1. Because the increment shrank to comment + contract prose + a guide line, the
orchestrator directed it to finish in LIGHT mode: grill, build, regress, verify and review stages are not run
(`SHIP.md` records this); the gates run are `npm run check`, `validate.mjs`, `check:surface-bump` and
`check:changelog-entry`.

## Files

- `pharn/floor/gate-run-core.mjs` — COMMENT ONLY on `NON_REUSABLE_IDS`: the LEVEL_GATES bullet gains the
  file-set reason (regress HEAD runs `test` over `outside_tests`, which never holds the feature's AC tests; the
  execution identity's `files` already differ) and names `regress-per-test-product` as the prerequisite of any reuse
- `pharn/pharn-contracts/gate-run-record.md` — the `NON_REUSABLE_IDS` parenthetical: add the missing
  `instruction-growth` member (6.38.0 drift) and one sentence on why `test` is never reusable from regress HEAD
- `.dev/guides/floor-gates.md` — the "Head→verify gate reuse" block: one line, LOOP-8 closed won't-fix, the reason, and
  the prerequisite
- `.dev/features/verify-test-reuse/PLAN.md` — this plan (the decision record)
- `.dev/features/verify-test-reuse/SHIP.md` — the roll-up: GATE 1 delegated, stages skipped (prose-only), gates run
- `SKILLS_VERSION` — 6.72.2 (patch: a correction to shipped prose; no behaviour change; 6.72.1 is claimed by a
  parallel PR)
- `CHANGELOG.md` — `[6.72.2]`
- `README.md` — the version badge
- `docs/capabilities/**` — regenerated by `npm run docs:generate` only if the catalog moves (expected: no change)

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — unchanged in shape; one parenthetical corrected (P4: the list is cited
  from `gate-run-core.mjs NON_REUSABLE_IDS`, the owner).

## Evals to write (P1)

No capability (`role:`) changes. No behaviour changes, so no new test: the reason being documented is already pinned by
`gate-reuse-core.test.mjs:200` ("files differ (a test subset)" → `identity-mismatch`) and line 247 (`test` →
`not-reusable-id`). The build re-runs both suites.

## Guarantee audit (P0)

- "`test` is never reused at verify" → **floor: enum-regex** (`NON_REUSABLE_IDS` membership in `findReusable` and
  `validateStamp`) — unchanged.
- "a regress-HEAD `test` run could not be reused even without that membership" → **floor: content-hash** (the
  execution identity covers `files`), pinned by the existing test; the new comment states it, it does not create it.
- "LOOP-8's cost is ≈72 min per loop" → **advisory**, the audit's estimate, not measured here; stated as such.

## Determinism audit (P5)

No branch added or changed.

## Applied lessons

- L24 — the audit's ≈72 min is an estimate; this plan does not inherit it as a measured cost, and names measurement as
  the trigger a redesign would need.
- L25 — the `NON_REUSABLE_IDS` rationale was partial (AC gate only) and was trusted for the defect it did not name;
  the fix re-derives and completes it at the site the auditor read, not in an apparatus file.
- L40 — the attributed cause (the AC gate) was tested under its negation: with the AC gate not applicable and `test`
  out of the set, the identity's `files` still refuse every real source, so the AC gate is not the whole cause.
- L43 — copying a results file and checking its hash would certify the copy AGREES with the source record, never that
  the record holds the AC tests; the binding the audit proposed is to the wrong referent.

## Open questions (HALT)

- Q1 — Close LOOP-8 as won't-fix with the rationale corrected (this plan, patch 6.72.1)? Alternatives: (b) close with
  the record in `.dev/` only (no product bytes, no bump, `[Unreleased]` entry); (c) open the `regress-per-test-product`
  redesign as its own increment (minor/major, own GATE 1), measured first. **Recommended: (a) this plan.**
- Q2 — Include the `instruction-growth` drift fix in the contract parenthetical (one word, same sentence)?
  **Recommended: yes.**
