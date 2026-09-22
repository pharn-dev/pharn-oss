# PLAN — build-regress-spec-unread

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L1, L18, L33, L49, L50]
- increment: `/pharn-build` and `/pharn-regress` stop reading `SPEC.md`'s body — their declared inputs match what they actually consume, and the spec→plan hash chain is untouched.
- layer(s): `.claude/commands/` (two product commands)
- constitution_refs: [P0, P2, P4, P6, P7]

## Why (the rationale, stated exactly — no more)

Both commands say "Read both." (`pharn-build.md:130`, `pharn-regress.md:122`), yet neither consumes
anything from the SPEC body. Build builds from `PLAN.md`. Regress takes `## Files` and the carried
`spec_content_hash` from `PLAN.md`, as its own Step 1.2 says. `SPEC.md` is needed there only (a) to EXIST
and (b) as an argument to `check-plan-spec-agree.mjs`, which reads and hashes it itself. The model consumes
only the exit code.

- **P2:** one fewer untrusted free-text body in the build/regress model context.
- **Declared inputs match actual inputs.**
- **Token saving: EXPECTED, UNMEASURED.** Standalone runs skip one SPEC read per stage. Inside
  `/pharn-loop`, which invokes `/pharn-build` inline (`pharn-loop.md` Step 5) and reads the SPEC itself,
  the saving is the per-iteration re-read only. No number is claimed.

## Correcting the record (the prompt, re-verified at `031c563`)

- **The version.** The prompt expected `SKILLS_VERSION` 6.9.1 → 6.9.2. Main is at **6.11.0** (#241–#243
  landed since), so the patch bump is **6.11.0 → 6.11.1**. The command versions move `0.1.0 → 0.1.1`
  (build) and `0.2.0 → 0.2.1` (regress).
- **The candidate lines**, all verified: `reads:` line 13 in both; Step 1.2 at `pharn-build.md:130-131`
  and `pharn-regress.md:122-123`; the prefix blockquote at `pharn-build.md:60` and `pharn-regress.md:80`;
  the trust audit at `pharn-build.md:318` and `pharn-regress.md:408`.
- **One (a)-class line the prompt did not list:** `pharn-build.md:325`, "if it quotes anything from the
  plan / SPEC", which presumes the model has the SPEC body in hand.

## Discovery (live, full-file greps — no head / windowed grep)

**1. `grep -n -i spec` of both commands: 36 hits in `pharn-build.md`, 34 in `pharn-regress.md`.** Each is
classified below.

- **(a) model-reads-SPEC-body → CHANGE**
  - `pharn-build.md`: `:13` (`reads:`), `:60` (the prefix: "the PLAN or SPEC you read"), `:130-131`
    (Step 1.2: "Read both … the material you build from and, for the chain check, hash"), `:318` (trust
    audit: "`PLAN.md` + `SPEC.md` bodies = untrusted DATA"), `:325` ("quotes anything from the plan /
    SPEC").
  - `pharn-regress.md`: `:13` (`reads:`), `:80` (the prefix: "the `PLAN.md` / `SPEC.md` you read"),
    `:122-123` (Step 1.2: "Read both"), `:408` (trust audit: "`PLAN.md` / `SPEC.md` bodies").
- **(b) KEEP**
  - **Existence checks and HALT routing:** build `:86`, `:126-127`, `:361`; regress `:100`, `:119-120`.
  - **The checker argument and the hash-chain explanation:** build `:14`, `:32-36`, `:69`, `:133`,
    `:139`, `:142`, `:146-150`, `:154`, `:278`, `:291-292`, `:320`, `:347-348`; regress `:15`, `:64-68`,
    `:125`, `:131`, `:134-135`, `:141-144`, `:199`, `:364`, `:390-391`, `:399-400`, `:431`.
  - **The pipeline name:** build `:2`, `:26`; regress `:2`, `:25`.
  - **Not about the SPEC at all:**
    - "spec" inside another word: build `:178` / `:306` ("respects"), `:188` ("specific"); regress
      `:231` ("inspection");
    - the gate-runner's own "spec" (the gate set): regress `:251-252`, `:260`, `:336`;
    - the artifact-exemption list: regress `:188`.
  - **A historical citation, not an instruction to read:** build `:173`, "(the SPEC's 'no skills →
    unchanged' path)", which cites the specification the installed-skills step was built to.
  - **A negative sourcing claim that stays true:** regress `:416-417`, "never sourced from the untrusted
    PLAN / SPEC free-text".

**2. Claims elsewhere that build or regress take `SPEC.md` as model input.** I grepped `pharn/ARCHITECTURE.md`
§6, `THREAT-MODEL.md`, `LIMITS.md`, `CLAUDE.md`, `README.md` and `docs/**` for `SPEC.md` near `build` /
`regress`.

- **The one hit is `README.md:375`.** It is about `spec_id` identity and `check-spec.mjs --spec-id`. Its
  neighbour, `:378`, already says "`/pharn-regress` reads the plan", which stays true.
- **§6's build and regress rows** (`ARCHITECTURE.md:235-236`) name artifacts, not inputs.

No claim needs changing, and no trusted doc is touched.

**3. Tests that read either command:** `writes-scope-release.test.cjs` (the `--clear` step),
`check-bash-reconcile.test.mjs:387` (build's anchor line), `run-gates.test.mjs` (regress's pinned runner
lines), `gate-run-core.test.mjs` (the ALLOWLIST prose parity), `capability-catalog-core.test.mjs:295`
(a fixture name list), and `command-hygiene.test.mjs` (`:790`/`:947` on `writes:` entries, `:1911` gate-run
wiring). **None of them reads `SPEC.md` out of either command's `reads:` or Step 1**, so the change breaks
none. `npm test` confirms this at verify.

**4. Version surfaces:**

- `SKILLS_VERSION` 6.11.0 → 6.11.1 (patch, per `CLAUDE.md`: a clarification to shipped bytes).
- Both commands' `version:` get a patch bump.
- `check:badge` reads the README's shields URL (`README.md:24`, pattern `img.shields.io/badge/pharn-<x>-`).
- The CHANGELOG entry goes at the top of the existing `[Unreleased]` → `### Changed` group
  (`CHANGELOG.md:2596`).

## Applied lessons

- L1 — the meta-docs this changes are scoped: `CHANGELOG.md`, `SKILLS_VERSION` and the README badge. The
  CLAUDE.md / README / docs grep found no claim to change and says so.
- L18 — the exclusion block is a `###` heading.
- L33 — the sweep derives its enumeration from the invariant substring (`-i spec`, whole files), not from
  the prompt's list. That is how the unlisted `:325` was found.
- L49 — the sweep's coverage boundary is stated. No checker reads these commands' prose for SPEC reads,
  so the (a)/(b) classification is model judgment re-checked by grep after the build. It is not a floor
  guarantee.
- L50 — by referent: every cite that presumes the SPEC BODY is in the model's hands (read, quote, "you
  read"), not only the "Read both" spelling.

## Files

- `.claude/commands/pharn-build.md` — drop `SPEC.md` from `reads:`; Step 1.2 reads the PLAN only, with the
  required sentence; the prefix and trust audit say the SPEC is hashed by the checker, never read by the
  model; `:325` quotes from the plan only; the P0 line; `version: 0.1.1` — product command
- `.claude/commands/pharn-regress.md` — the same four edits, the P0 line, `version: 0.2.1` — product
  command
- `CHANGELOG.md` — `[Unreleased]` → `### Changed`, carrying `6.11.1` and the rationale above, including
  "unmeasured" — repo meta
- `SKILLS_VERSION` — `6.11.1` — repo meta
- `README.md` — the shields badge only — repo meta

### Deliberately NOT in scope

- `/pharn-plan`, `/pharn-grill`, `/pharn-verify`, `/pharn-loop`, `/pharn-ship`, every `pharn-dev-*`
  command, every floor checker and every test file.
- No new test: nothing triggers one (P7), and a guard on `reads:` would pin the half that is not
  load-bearing, since `reads:` is not enforced on the read side.

## Contracts satisfied

- None changes. `check-plan-spec-agree.mjs`'s argv, and so the spec→plan chain, are byte-identical.

## Evals to write (P1)

No Capability is touched, so none.

## Guarantee audit (P0)

- "The model in these two stages does not read `SPEC.md`'s body" → **ADVISORY**, and each trust audit says
  so. `reads:` is not enforced on the read side (`pharn/ARCHITECTURE.md` §3.1, the `reads:` field:
  "ENFORCED only at the write side by the floor"), and nothing on the floor stops the model opening it.
- "The hash chain still binds the plan to the Approved, un-drifted SPEC" → **FLOOR**, unchanged
  (`check-plan-spec-agree.mjs`, content-hash + enum). The checker reads the SPEC itself.

## Trust audit (P2)

This removes one untrusted free-text body from two stages' model context. No new input.

## Determinism audit (P5)

No branch changes. Step 1.1's existence tests and Step 2's exit-code routing are byte-identical.

## Acceptance

- `npm run check` GREEN, including `check:badge` and `check:changelog`.
- After the build, re-run discovery grep 1 on both files. The (a) list must be empty, and every (b) line
  must still be present. Both lists are reported in `VERIFY.md`.

## Open questions (HALT)

- None. GATE 1 is delegated for this batch.
