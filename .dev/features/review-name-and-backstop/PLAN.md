# PLAN — review-name-and-backstop

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299 # fix #4
- applied_lessons: [L3, L6, L7, L8, L20, L29, L33, L34, L36, L37]
- increment: Correct the four unbounded suppression-backstop claims in `/pharn-review` with a carve-out for the scanner-less lenses, add the missing `<name>` resolution step, and pin the carve-out with a corpus test.
- layer(s): product `.claude/` surface (the `pharn-*` command) + `.dev/floor/` (apparatus test) # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Applied lessons

- L3 — `writes:` is a declarative field; before treating `/pharn-review`'s as load-bearing I re-audited it
  against where the command actually writes. The audit (PROBE 2–4 below) is what killed the setter option:
  the declaration is a glob over a dynamic, multi-writer output, so enforcing it converts a harmless
  declaration into a guaranteed block — L3's exact failure direction.
- L6 — the four scanner-less lens names are read from the STRUCTURED location
  (`JSON.parse(pharn/floor/lens-scanner-map.json).scanners`, values `=== null`), never grepped from the
  command's prose or from this plan. The new test derives them the same way, so the carve-out cannot drift
  from the map.
- L7 — `writes:` must equal exactly what the stage writes. I audited tightening `["features/**"]` to three
  placeholder paths and **rejected** it: nothing reads the field (no setter is invoked), so the change would
  be documentation-only, and it would newly declare ≥2 placeholder paths — the shape the incoming corpus
  Rule B binds to a `--target` this command has no way to supply. The glob stays; the reason is now written
  in the command.
- L8 — the decisive lesson. `set-writes-scope.cjs` resolves ONE `--target` per call and each call
  OVERWRITES `.pharn/writes-scope.json`. `/pharn-review`'s Step-4 fan-out is N PARALLEL subagent writers
  under a placeholder path whose N is only known at run time (`count-lenses.mjs`), so L8's own escape hatch
  — "re-scope per-artifact, as `/pharn-dev-regress` and `/pharn-dev-verify` do" — is unavailable: that
  remedy presumes a single sequential writer. Hence no setter, stated rather than omitted.
- L20 — a defect whose only remedy is "remember to update it" has earned a floor check. If a lens gains or
  loses a scanner in the map, the carve-out's four names go stale and nothing today would notice — the same
  trigger `check-version-badge` and `check-contributing-gates` fired on. So this increment ships the check,
  not a louder comment.
- L29 — the remedy is quantified over a set ("every scanner-less lens"), so the ENUMERATION is the
  deliverable. The test materializes it in one place by deriving both sets from the map at run time and
  iterating them, so a lens added later is covered for free rather than by an assertion authored for
  whichever name was in front of me.
- L33 — treat any prior enumeration as a LOWER BOUND to beat. The review finding named ONE site
  (lines 102–110). A scan anchored on the shortest invariant stems (`regardless`, `scanner-detected`,
  `cannot erase`) found **four**: L106–110, L120, L166, L181–182. Repairing only the named site is the
  precise failure L33 records (an increment that fixed one instance and left a second in the file it named).
- L34 — "for each X, assert P" is vacuous when there are no X. The new test therefore asserts both derived
  sets are non-empty before iterating either, so a map that stopped parsing cannot certify the carve-out by
  examining zero lenses.
- L36 — presence is not closure. Pinning only "each null name appears" would go GREEN on a carve-out that
  ALSO names a scanner-BOUND lens (the stale-list direction). The test adds the closure half: no
  scanner-bound lens name may appear in the carve-out region.
- L37 — a doc stating a guard's bounds must be PROBED against the guard, not read off it; the universal
  quantifier is where the drift lands. Every quantifier in this increment was executed, not reasoned about:
  the map was parsed, `count-lenses.mjs` was run, and the writes-scope question was settled by four live
  probes whose exit codes are recorded below.

## Discovery — what was read and PROBED live this run (P6)

Membership, from the structured locations:

- `node pharn/floor/count-lenses.mjs .` → `registered: 22`.
- `JSON.parse(pharn/floor/lens-scanner-map.json).scanners` → 22 entries; **4 null**
  (`hallucinated-api`, `input-validation`, `race-condition`, `trust-fence`); **18 scanner-bound**.

The four unbounded claim sites in `.claude/commands/pharn-review.md` (L33 lower-bound scan):

| line    | text                                                                                                                                           | status                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 106–110 | "a lens's Layer-1 verdict comes from the scanner's … regex … **not** from any claim a skill makes … **cannot erase a scanner-detected shape**" | **FALSE** for the 4 null lenses — they have no scanner         |
| 120     | "a skill … **never** licenses suppressing a scanner-detected finding"                                                                          | vacuous for the 4 — no scanner, so no scanner-detected finding |
| 166     | "a scanner hit is reported regardless of any skill (the suppression backstop, Step 3b)"                                                        | true-but-partial; presents an 18/22 bound as universal         |
| 181–182 | "bounded by the Step-3b backstop (a scanner hit is a deterministic regex verdict …)"                                                           | true-but-partial; same                                         |

The command's own **Step 3 (lines 79–81) already names the four `null` lenses correctly**, so the file
contradicts itself twelve lines apart. Nothing detects this: `validate.mjs` excludes `.claude/commands/`.

`<name>` resolution — `grep -niE 'argument-hint|\$ARGUMENTS|feature name|derive.*name'` over the command →
**no output**. The command writes `features/<name>/…` at four places (L123, L132, L143, L145) with `<name>`
never bound. `argument-hint` appears **zero** times across the whole command corpus; the corpus frontmatter
key set is `constitution_refs, description, effort, enforces, kind, model, model_tier, reads, role, trust,
version, writes`. `--feature <name>` IS an established corpus spelling (10 sites).

Writes-scope — four probes, exit codes recorded (L37):

| #   | probe                                                                 | result                                                 |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | `set-writes-scope --from-frontmatter pharn-review.md` (no `--target`) | **exit 1**, nothing written — glob-only `writes:`      |
| 2   | same `--target features/x/findings.json`                              | exit 0, scope = that ONE path                          |
| 3   | under that scope, `Write features/x/lenses/injection/findings.json`   | **DENIED, exit 2**                                     |
| 4   | under that scope, `Write features/x/REVIEW.md`                        | **DENIED, exit 2**                                     |
| 5   | after `--clear`, both of the above                                    | **exit 0** (fail-closed default permits `features/**`) |

## Decision — `/pharn-review` gets NO writes-scope setter, and the command now SAYS SO

Probes 2–4 show the prescribed remedy would **break** the command: a set scope replaces the safe-set, so
scoping to any one artifact denies the other N+1, including every parallel lens write. Probe 5 shows the
fail-closed default already permits exactly `features/**` — which in a user's install (`INSTALL_SAFE_SET`)
is byte-identical to what this command's `writes:` declares. So the setter would subtract capability and
add zero narrowing.

L8's escape hatch (per-artifact re-scoping) does not reach here: it presumes ONE sequential writer, and
Step 4 is N parallel subagents whose N comes from `count-lenses.mjs` at run time.

The real defect is therefore **not** "no setter" — it is that the absence is **stated nowhere**, so a
reviewer cannot tell a deliberate architectural consequence from an oversight (the finding under repair is
itself the evidence: it read the absence as a bug). The remedy is the shipped `/pharn-dev-eval` precedent —
a Step-0 "writes-scope (fix #7) — with an honest caveat (P0)" paragraph that names the mechanism and the
bound. This also keeps `writes:` a single glob entry, so the incoming corpus Rules A and B (which bind
`--from-frontmatter` to `--target`, and ≥2 placeholder paths to per-path `--target`s) stay satisfied
vacuously rather than violated.

## Files

- `.claude/commands/pharn-review.md` — add Step 0 (`<name>` resolution + the no-setter caveat); bound the four backstop claim sites — layer: product `.claude/` surface
- `.dev/floor/command-hygiene.test.mjs` — add the carve-out corpus rule (derive-from-map, closure, non-vacuity, discrimination) — layer: apparatus
- `SKILLS_VERSION` — 3.0.2 → 3.0.8 (assigned) — layer: repo-meta
- `README.md` — shields badge 3.0.2 → 3.0.8 — layer: repo-meta
- `CHANGELOG.md` — an `[Unreleased]` entry recording the bump and the change — layer: repo-meta

### Explicitly not touched

- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` — human-only (fix #2); the claim under repair does not appear in any of them (scanned; no hits)
- `pharn/floor/lens-scanner-map.json` — the map is CORRECT; its own doc string already labels `null` as SCANNER-LESS. The command drifted from the map, not the reverse.
- `pharn/floor/merge-findings.mjs` — owned by a sibling agent this cycle
- `docs/capabilities/**`, `docs/lessons-index.md`, README `CURRENT-STATE` — GENERATED; refreshed by `npm run docs:generate` (a Bash write, outside fix #7 — L19), never hand-edited

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — unchanged; the enum-gated / free-text split the command already cites is untouched (P4 — cited, not restated)
- No contract shape changes, so no install is invalidated → the bump is **patch-class** by CLAUDE.md's SemVer rule (a correction to bytes that already shipped)

## Evals to write (P1)

No `role:`-bearing capability is added or changed, so P1's eval obligation is not triggered. The
verification burden lands on the corpus test instead:

- carve-out ↔ map agreement → every `null` lens in `lens-scanner-map.json` is NAMED in the carve-out region
- closure (L36) → NO scanner-bound lens name appears in the carve-out region
- non-vacuity (L34) → both derived sets asserted non-empty before either is iterated
- discrimination → the rule is re-run against a MUTATED copy of the real command body (one null name deleted; one mapped name spliced in) and must FAIL both times

## Guarantee audit (P0)

- "the carve-out names exactly the scanner-less lenses, and stays true as the map changes" → **floor: enum-regex** (`.dev/floor/command-hygiene.test.mjs`, set membership derived from the map at run time)
- "the four `null` lenses have NO structural backstop against skill-driven suppression" → **factual disclosure**, not a guarantee — it removes a claim rather than adding one
- "the backstop covers the 18 scanner-bound lenses" → **floor: enum-regex**, but ONLY in the narrow sense that those lenses' Layer-1 verdict has a deterministic scanner behind it. It is **NOT** a guarantee that a lens reports what its scanner hit — spawning, slicing and each lens's judgment remain **advisory** (the command already says so).
- "a skill cannot suppress a finding" → **struck.** It was never true and this increment stops the document from asserting it.
- "`<name>` is resolved deterministically" → **advisory.** It is a CLI/membership chain ending in "ask the human" (P5), and nothing on the floor forces the command to run it — the same honest bound every sibling's Step 0 carries.
- "`/pharn-review` may write only its declared outputs" → **floor: hook (fix #7), via the fail-closed DEFAULT_SAFE_SET, not via a declared scope.** Probed (5 above). NARROWED and stated: the default permits all of `features/**`, so the guarantee is "inside `features/**`", never "exactly the three artifact paths".
- "this increment adds a new floor primitive" → **no.** The corpus test is set membership (`pharn/ARCHITECTURE.md §2` primitive #3), reusing the existing `command-hygiene` harness.

## Trust audit (P2)

The increment ingests no new untrusted input and changes no taint path. It does, however, make the
command's existing taint statement TRUER: `## Trust (P2)` currently bounds the suppression residual by a
backstop that does not exist for 4 of 22 lenses, so the residual it names is UNDERSTATED. After this
change the residual reads at its real width — for the scanner-less lenses, including **`trust-fence`, the
attempt-0 injection probe itself**, a hostile `SKILL.md`'s suppression is bounded by nothing structural.
That is a disclosure of an existing limit (P7), not a new limit and not a new guarantee.

## Determinism audit (P5)

- `<name>` resolution → a two-tier chain: explicit `--feature <name>` (a CLI membership test), else **ask the human**. No LLM classification, no guessed default. This deliberately mirrors the command's OWN Step-1 target-resolution idiom rather than importing a foreign one (L8/L22 — copy the established shape).
- The carve-out's membership → derived from the map's structured values, never from prose (L6).
- No new branch is introduced anywhere in the command's control flow.

## Known residuals (named, not hidden)

- The carve-out test proves the four names are **present and closed** in the region; it does **not** prove the surrounding prose reads correctly, and a carve-out that named all four while explaining them wrongly stays GREEN. Same bound `check-contributing-gates` states about itself.
- Nothing checks the other three claim sites (L120, L166, L181–182) for re-drift — the test pins the Step-3b carve-out region only. Widening it to every site is deferred: there is one occurrence, and L20's bar is a second.
- `<name>` resolution is command prose. Nothing forces a run to execute it, exactly as for every sibling Step 0.

## Open questions (HALT)

- None. Both findings and the writes-scope question were resolved from live state and live probes this run; no doc-vs-repo ambiguity remains.

## GATE 1 — plan acceptance (DELEGATED APPROVAL, recorded per P0)

**Approved as written**, 2026-09-09, by the agent running this loop under an **explicit delegation of the
approver role from the parent session**. There was no interactive human on this side of the gate.

**This is a WEAKER gate than the normal one, and the difference must not be blurred (P0).** GATE 1's
whole purpose is that _the model never self-approves a plan_ — the versioned-intent thesis rests on a
human owning the intent. A delegated approval is the model approving its own plan with the human's prior
permission; the permission is real, but it does not restore the independence the gate was designed for.
Recorded here rather than left implicit so a later reader sees a delegated approval as exactly that, and
so `check-plan-lessons`' GREEN is never mistaken for a human having read this plan.

The delegation covers **GATE 1 and GATE 2 of this run only**. It is not a standing grant, and it did not
extend to anything the hard constraints reserve to a human — the four trusted docs and `CODEOWNERS` were
neither edited nor scoped, and the merge decision remains the human's.
