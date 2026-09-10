# PLAN — provenance-target-binding

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299 # fix #4
- applied_lessons: [L2, L3, L4, L14, L20, L25, L29, L31, L34, L36, L37]
- increment: Bind `check-provenance.mjs`'s canon-file ARGUMENT to the candidate's declared `target` in both copies, back-port the dev copy's two missing hardening patches, and materialize a BEHAVIOURAL cross-copy obligation set the constant-only guard could never range over.
- layer(s): floor (pharn/floor + .dev/floor) — not a capability tree layer
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Applied lessons

- L2 — The guarantee-audit honesty is written INTO the durable artifacts (both `check-provenance.mjs` header comments and both promote commands' `## Guarantee audit`), not only into this plan; every "FLOOR" phrase added cites an op verified live this run (the probes in `## Discovery`).
- L3 — Binding `argv[3]` makes a previously-inert ARGUMENT load-bearing, so this same increment re-audits every existing declaration of it: both promote commands' Step 3 invocation lines and every canon-path argument in both test suites (the `does-not-exist.md` / `canon.md` / round-trip call sites) are re-aligned to the declared target.
- L4 — Every new assertion is authored to pass, so each RED fixture ships a paired non-vacuity control (the same candidate at the DECLARED path is GREEN), and the three back-ported behaviours were measured against the live dev copy BEFORE the patch (probes 2 and 3 returned exit 0).
- L14 — The whitespace-free id check is COMPOSED before the duplicate lookup, never substituted for it: `/\s/.test(raw)` runs first and short-circuits, so a whitespace-bearing id is refused by the guard rather than silently `.trim()`ed into a colliding token.
- L20 — Finding 2 is a discipline-only remedy's second occurrence ("keep the two copies in sync"), so the remedy here is a floor-grade test rather than a note: the behavioural cross-copy set is enforced by `node --test`, not by a comment asking the next author to remember.
- L25 — A rationale comment reaches only the file it sits in, so the "these two copies must agree" rationale is made ENFORCEABLE (the behavioural guard) rather than restated in a second header comment; the comment that stays is bounded to what it can actually claim.
- L29 — The remedy is quantified over a set ("per drifted behaviour"), so the deliverable is the ENUMERATION materialized in one place — `CROSS_COPY_BEHAVIOURS` — with the test iterating it, never an assertion authored for whichever behaviour was in front of me.
- L31 — This is the copy-pair lesson's own instance: the pair's CODE was pinned by the ✧ constant guard while the pair's BEHAVIOUR had no enumeration anywhere, which is exactly how the two body-level patches drifted; the new set is that missing enumeration.
- L34 — The iterating test cannot pass vacuously: the suite asserts `CROSS_COPY_BEHAVIOURS.length >= 3` before the loop, so an emptied array is a RED rather than a silent GREEN over zero behaviours.
- L36 — Presence is not closure, and the bound is stated rather than overclaimed: the set pins the behaviours a review NAMED and structurally cannot discover an unnamed one, so "the cross-copy guard is green" never means "the two copies behave identically".
- L37 — The two findings were PROBED against the live checkers, not read off them: probe 1 rendered a real duplicate passing GREEN through a decoy canon file, and probes 2 and 3 rendered `2026-02-31` and `L99 extra` GREEN on the dev copy; exit codes recorded in `## Discovery`.

## Discovery (P6 — live state read this run)

- `SKILLS_VERSION` = `3.0.2`; README badge = `pharn-3.0.2`; baseline commit `8bc6c0a`.
- Baseline gates (all 8, individually): `format:check` `lint` `lint:md` `docs:check` `check:markers` `check:badge` `check:contributing` `test` → **all exit 0**.
- Lessons-index freshness gate `node .dev/floor/check-lessons-index.mjs .` → **exit 0 (GREEN)**; the two-step sweep ran (SELECT from `docs/lessons-index.md`, then READ all eleven cited `## L<n>` entries in full from canon).
- **Probe 1 (finding `provenance-canon-arg-unbound`, PRODUCT copy).** Candidate declares `target: memory-bank/lessons-learned.md` with `id: L5`; `L5` IS already a heading in that file. Pointed at the declared file → `RED — id failed … duplicate`, exit 1. Pointed at a decoy `decoy.md` → **`GREEN`, exit 0**. A real duplicate passes the gate when the caller names any other file.
- **Probe 2 (finding `provenance-dev-copy-behind`, DEV copy).** `provenance.date: "2026-02-31"` → **`GREEN`, exit 0**. The product copy REDs the same input via `isGregorianDate()`.
- **Probe 3 (same finding, DEV copy).** `id: "L99 extra"` → **`GREEN`, exit 0**. The product copy REDs it with `whitespace-free single token`.
- The ✧ cross-copy guard in `.dev/floor/check-provenance.test.mjs` compares only `const` DECLARATIONS (`constSource()`), and its own header states the bound: _"NOT guaranteed: that the two files BEHAVE identically."_ Both drifted patches live in the validation BODY, which is why the guard was green throughout.

## Files

- `pharn/floor/check-provenance.mjs` — add the canon-arg binding sub-check + its honest-scope comment — PRODUCT (bumps)
- `.dev/floor/check-provenance.mjs` — same binding; back-port `isGregorianDate()` and the whitespace-free id check — apparatus
- `pharn/floor/check-provenance.test.mjs` — re-align canon paths to the declared target; add the binding RED + non-vacuity control
- `.dev/floor/check-provenance.test.mjs` — same, plus the three back-port REDs and the `CROSS_COPY_BEHAVIOURS` guard
- `.claude/commands/pharn-memory-promote.md` — correct the guarantee-audit bullet and Step 3 — PRODUCT (bumps)
- `.claude/commands/pharn-dev-memory-promote.md` — the same two corrections on the apparatus twin
- `SKILLS_VERSION` — `3.0.2` -> `3.0.6` (assigned; parallel PRs hold 3.0.3–3.0.5)
- `README.md` — shields badge to `pharn-3.0.6` so `check:badge` agrees
- `CHANGELOG.md` — one `[Unreleased]` entry recording the bump and both findings
- `CLAUDE.md` — extend both `check-provenance` command blocks with the new sub-check and its bound

### Deliberately NOT written

- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` — human-only, hook-denied (fix #2). Nothing here needs them: the binding is a tightening WITHIN §5's existing provenance contract, not a new spec claim.
- `docs/capabilities/**`, `docs/lessons-index.md`, the README `CURRENT-STATE` region — GENERATED. Regenerated by `npm run docs:generate` (a Bash write, outside fix #7 — L19), never hand-edited.
- `.dev/memory-bank/lessons-learned.md` — canon is reachable only through `/pharn-dev-memory-promote`'s own gate (L7).

## Contracts satisfied

- `pharn/ARCHITECTURE.md §5` (promotion is a gated action with provenance PER ENTRY) — the binding tightens WHICH canon file the entry's uniqueness is established against; cited, not restated (P4).
- `pharn/ARCHITECTURE.md §2` primitive #3 (enum / regex / set membership) — the binding is a segment-wise string comparison; no new primitive is introduced.

## Evals to write (P1)

No `role:`-bearing capability is added, so P1's eval requirement does not attach. The equivalent obligation for a floor checker is its test suite:

- binding RED, both copies → `argv[3]` names a file whose path does not match `cand.target` → exit 1, message `does not name the candidate's declared target`
- binding non-vacuity, both copies → the same candidate at the DECLARED path → exit 0
- Gregorian RED, dev copy → `date: 2026-02-31` → exit 1, `not a valid Gregorian calendar date`
- whitespace-id RED, dev copy → `id: "L5 extra"` → exit 1, `whitespace-free single token`, and NOT `duplicate`
- `CROSS_COPY_BEHAVIOURS` → each member run against BOTH executables, same verdict and same message; `length >= 3` asserted first (L34)
- shared-function pin → `isGregorianDate` / `cleanScalar` / `nonEmptyString` / `existingIds` / the two new path helpers byte-equal across the copies

## Guarantee audit (P0)

- "The canon file the duplicate-id check ranges over is the file the candidate DECLARED" → **floor: enum-regex** (segment-wise path comparison against the already-enum-gated `target`). This is the claim the guarantee-audit bullet already implied and the code did not make.
- "A relative canon argument must EQUAL the declared target; an absolute one must end with it at a segment boundary" → **floor: enum-regex**. NARROWED, and stated: the absolute form is a SUFFIX test, so an absolute path with the right trailing segments under a different root still matches. It is cwd-independent by construction, which is why the suffix is the strongest test available there.
- "The binding proves the write LANDS in the declared target" → **struck**. That is fix #7's writes-scope hook, a different primitive; the binding ranges over the checker's own READ.
- "The binding proves the declared target is HONEST" → **struck, advisory.** A candidate may declare either enum member; the binding only forces the caller and the declaration to agree. Which member is right stays the human's read at the accept/deny gate.
- "The dev copy now refuses an impossible calendar date and a whitespace-bearing id" → **floor: enum-regex** (a `Date` round-trip and a `/\s/` test).
- "The two copies behave identically" → **struck.** `CROSS_COPY_BEHAVIOURS` is a PRESENCE set over behaviours a review NAMED; it cannot discover an unnamed divergence (L36). What it buys: those three cannot drift again silently.
- "The cross-copy guards travel with a user's install" → **struck.** Both live in `.dev/`, which is stripped at packaging; they guard the pair IN THIS REPO only.

## Trust audit (P2)

`candidate.json` is model-drafted from untrusted REVIEW free-text. The binding reads only `cand.target`, which is already enum-gated (`TARGET_ENUM` membership is tested BEFORE the binding runs, and the binding is skipped on a non-member so a single true reason is reported). `argv[3]` is operator-supplied argv, not candidate content. No free-text field (`title` / `body`) enters the new branch, so the verdict still ranges only over the enum-gated class.

## Determinism audit (P5)

Every new branch is a membership / equality test over path segments — no classification, no heuristic. The terminal fallback on any non-match is a loud RED naming both paths and the remedy, never a guess and never a silent repair of either side.

## Open questions (HALT)

- None. Both findings were reproduced live (probes 1–3), the version is assigned (`3.0.6`), and the two-copy divergence constraints (`TARGET_ENUM`, `COMMIT_RE`) are pinned by existing ✧ tests this increment does not relax.
