# PLAN — docs-catchup-6-20-3

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L47]
- increment: Correct the hand-written doc prose that 6.17.0–6.20.2 left stale and that no generated-region check
  can see — README's stage list, command count, spec-pin row, install-copy sentence, artifact lists and verify's
  inputs; SECURITY.md's security surface; pharn/floor/README.md's bound; three dev commands' spine citation. Prose
  only; no behaviour changes.
- layer(s): the product floor's README (`pharn/floor/README.md`), repo meta (README, SECURITY, CHANGELOG,
  SKILLS_VERSION), dev apparatus (three `pharn-dev-*` commands).
- constitution_refs: [P0, P4, P6]

## Correcting the record (P6)

Measured on `main` = `b31e540` (`SKILLS_VERSION` 6.20.2) by a docs audit of the last ~30 commits, requested in chat
on 2026-09-24. `docs:check`, `check:badge`, `check:contributing` and `check:markers` are all GREEN; every item below
sits in unguarded prose.

1. `README.md:717-719` says only the first two trusted docs are copied into an install. **False since
   `@pharn-dev/pharn` 0.4.0**, which copies all four; README's own "What gets installed" says so.
2. `README.md:250` says "Six of the other eight". **False since 6.17.0**: `/pharn-test` made it seven of nine.
3. `README.md:228-237` ("How the workflow works") lists seven stages without Test (in the spine since 6.17.0, run by
   both orchestrators since 6.19.0), and its Verify line omits the 6.20.0 AC gate.
4. `README.md:348` lists the pin's re-verifiers without `test`; `README.md:404` in the same file lists it.
5. `SECURITY.md:7` names two `PreToolUse` hooks as the hook surface, omitting the scope setter and the `Stop` hook
   (wired since 6.12.0); `SECURITY.md:51` scopes a write-guard bypass to the trusted docs only, while the guard also
   protects the control surface, the project SPEC template (6.14.0), git metadata (6.1.0) and canon (3.1.1).
6. `README.md:65-75` and `README.md:188-190` list the committed feature artifacts without `AC-TESTS.md` and
   `AC-TESTS.lock.json` (6.17.0).
7. `README.md:408-410` says `/pharn-verify` reads the plan and its own gates. **Incomplete since 6.20.0**: the AC gate
   reads the SPEC's criteria, `AC-TESTS.md` and the lock.
8. The README "Guaranteed" table has no row for the test-stage gate (6.19.0) or the AC gate (6.20.0).
9. `pharn/floor/README.md` bounds the two `PreToolUse` hooks to "the `Write|Edit|MultiEdit` surface", dropping
   `NotebookEdit`, and says Bash writes "bypass them entirely" without the 4.0.0 detection at verify.
10. `pharn-dev-grill.md`, `pharn-dev-regress.md` and `pharn-dev-verify.md` quote a spine without `test` and cite
    `pharn/ARCHITECTURE.md §6` for it — §6 has named `test` since 6.20.2. The dev loop has no test stage, so the fix
    names the dev chain instead of citing §6 for it.

Out of scope: `CLAUDE.md` (current through 6.20.2); the open `stop-guard-live-probe` follow-up (accurately described
as open); the four trusted docs (updated in 6.20.2).

## Decisions

a. **Bump:** PATCH, 6.20.2 → 6.20.3 — `pharn/floor/README.md` ships, and a correction to shipped bytes is a patch.
`MIN_CLI` stays 0.5.0. Items in README / SECURITY / the dev commands would not bump on their own; they ride along.

b. **No counts where a count can go stale** (L47). The stage list is the list itself; the re-verifier row names the
stages; SECURITY names the hook files rather than "N hooks".

c. **New Guaranteed rows state their bound in the row**, as every row there does: the red run proves the record said
failed, never why; the AC gate proves a locked, once-red test passed, never that it captures the AC's intent.

## Files

- `README.md` — items 1–4, 6–8 and the badge.
- `SECURITY.md` — item 5.
- `pharn/floor/README.md` — item 9.
- `.claude/commands/pharn-dev-grill.md` — item 10.
- `.claude/commands/pharn-dev-regress.md` — item 10.
- `.claude/commands/pharn-dev-verify.md` — item 10.
- `CHANGELOG.md` — `[6.20.3]`.
- `SKILLS_VERSION` — 6.20.3.
- `.dev/features/docs-catchup-6-20-3/PLAN.md` — this plan.
- `.dev/features/docs-catchup-6-20-3/SHIP.md` — the ship record.

## Evals to write (P1)

None: no capability and no checker behaviour changes. The existing suite and `docs:check` must stay green.

## Guarantee audit (P0)

Nothing becomes more or less guaranteed. The two new Guaranteed rows describe checks that already ship (6.19.0,
6.20.0), each with the bound its contract states (`pharn/pharn-contracts/ac-tests.md`).

## Applied lessons

- L47: no replacement count is introduced — the stage list, the re-verifier list and the hook list are written out,
  so the next stage or hook makes a missing name visible instead of a wrong number.

## Open questions (HALT)

None.
