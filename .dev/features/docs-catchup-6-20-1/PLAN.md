# PLAN — docs-catchup-6-20-1

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L47]
- increment: Correct the non-protected docs that items 01–06 of the AC-delivery queue left stale — they still say `/pharn-verify` never reads the per-test record, describe lock schema `/2` with the pin "reserved", stop the lock story at 6.18.0, and omit the loop's AC-evidence stop. Prose only; no behaviour changes.
- layer(s): the product floor (one module header), pharn-contracts (`test-results-record.md`), `pharn/features/README.md`, repo meta (README, CLAUDE.md, CHANGELOG, SKILLS_VERSION).
- constitution_refs: [P0, P4, P6]

## Correcting the record (P6)

Measured on `main` = `7e33893` (`SKILLS_VERSION` 6.20.0), by the post-queue docs audit:

1. `README.md:463` says verify does not yet read the per-test record. **False since 6.20.0**: the AC gate reads it
   (`check-verify.mjs --ac-gate`).
2. `README.md:417-419` lists the reds `/pharn-loop` never retries as an inconclusive result or a reconcile red. **Incomplete
   since 6.20.0**: an AC-evidence red is terminal too, recorded as S13 `blocked: ac-evidence-invalid`.
3. `CLAUDE.md:343` describes lock schema `ac-tests-lock/2` with `test_infra` "reserved for a later stage". **False since
   6.20.0**: `--write` writes `/3`, and `test_infra` is the test-infrastructure pin.
4. `CLAUDE.md:331-334`, `pharn/pharn-contracts/test-results-record.md:21-25` and `pharn/floor/test-results-core.mjs:12-15`
   say only `/pharn-test`'s red run reads the record and that the verify verdict is unchanged. **False since 6.20.0**
   for a verify run with `--ac-gate`, which `/pharn-verify` Step 5 always passes.
5. `pharn/features/README.md` describes the lock up to 6.18.0 only. **Incomplete**: it omits the 6.19.0 build
   precondition, the 6.20.0 pin and the verify report's per-AC table.

Out of scope, deliberately: the four trusted docs (human-only — queue item 07's text covers them) and the four
sentences in `pharn-build.md`, `pharn-ship.md` and `CLAUDE.md` that point at that pending protected edit; they stay
true until a human applies it, and are removed in the same PR as that edit.

## Decisions

a. **Bump:** PATCH, 6.20.0 → 6.20.1 — corrections to bytes that already shipped (a contract, a floor module header,
`pharn/features/README.md`); no behaviour, contract shape or frontmatter change. `MIN_CLI` stays 0.5.0.

b. **No counts.** Each correction names the stage that reads the record and the version, never "two stages", so the
next reader does not make it false again (L47).

## Files

- `pharn/floor/test-results-core.mjs` — header: who reads the record.
- `pharn/pharn-contracts/test-results-record.md` — the honest-trigger paragraph.
- `pharn/features/README.md` — the AC-tests bullet.
- `README.md` — the per-test paragraph, the loop's stop list, the badge.
- `CLAUDE.md` — the per-test and lock-schema lines.
- `CHANGELOG.md` — `[6.20.1]`.
- `SKILLS_VERSION` — 6.20.1.
- `.dev/features/docs-catchup-6-20-1/PLAN.md` — this plan.
- `.dev/features/docs-catchup-6-20-1/SHIP.md` — the ship record.

## Evals to write (P1)

None: no capability and no checker behaviour changes. The existing suite and `docs:check` must stay green.

## Guarantee audit (P0)

Nothing becomes more or less guaranteed. Each edit makes a sentence match what the 6.20.0 code already does.

## Applied lessons

- L47: every correction names the stage and version that reads the record, never a new count of readers.

## Open questions (HALT)

None.
