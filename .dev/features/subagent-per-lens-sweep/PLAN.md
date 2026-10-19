# PLAN — subagent-per-lens-sweep

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L1, L13, L19, L25, L29, L33, L36, L47, L49, L50, L64, L68, L71, L75]
- increment: Correct the shipped prose that still says `/pharn-review` spawns one subagent per lens (or that the lens
  runner has not landed) to what 6.64.0 made true, one `pharn-review-lens` subagent per lens family, in 19 lens bodies,
  three floor-module headers, the review command's claims block and the README; a human-applied patch makes the same
  correction in `LIMITS.md` and `THREAT-MODEL.md` and gives `pharn/ARCHITECTURE.md §4` a row for `.claude/agents/`.
- layer(s): pharn-review (19 lens bodies), product floor (`pharn/floor/` module headers), product command
  (`.claude/commands/pharn-review.md`), trusted docs (human-applied), repo meta
- constitution_refs: [P0, P2, P4, P6, P7]

**The pin is the POST-patch hash, on purpose.** At `c47707e` `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`
prints `75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6`. This plan is built against
`pharn/ARCHITECTURE.md` with patch H1 and H2 below applied, and the pinned value is the hash of exactly those bytes
(H1 and H2 applied in memory to the `c47707e` file, then hashed by `hash-doc.mjs`). So `/pharn-dev-build` Step 1's
spec-hash check passes only if the human's patch produced the planned bytes. Q4 records the alternative.

## Trigger (P7)

`.dev/features/review-lens-grouping/REVIEW.md` A1 (P0, important): after #356 (6.64.0) changed `/pharn-review` Step 4
to one `pharn-review-lens` subagent per lens family (`pharn/floor/lens-family-map.json`, `pharn/floor/lens-groups.mjs`),
19 lens bodies, `pharn/floor/merge-findings.mjs:4`, `pharn/floor/count-lenses.mjs:5` and `README.md:877` still said one
subagent per lens. The 6.64.0 CHANGELOG entry names this follow-up (`subagent-per-lens-sweep`) and left the lens bodies
alone only because the grouped eval measured their bytes. That eval is complete (6.64.0 entry, "Measured"). The same
entry names `architecture-agents-dir` (REVIEW A8, GRILL concern under "Architecture and coupling"): `pharn/ARCHITECTURE.md
§4` has no place for the shipped `.claude/agents/pharn-review-lens.md`. The maintainer put trusted-doc hits in scope for
a human-applied patch (2026-10-19), so that follow-up lands here too.

Re-derived live at `c47707e` (SKILLS_VERSION 6.64.1): every A1 site still holds the old text (sweep below), and the
sweep found sites A1 did not list: 16 lens-body `(pre-runner)` labels, `pharn/floor/catalogue-installed-skills.mjs:9`,
`.claude/commands/pharn-review.md:368`, `LIMITS.md:124`, `LIMITS.md:142` and `THREAT-MODEL.md:58`.

## Sweep declaration (L75; L33, L49, L50)

**Surface.** Every tracked file at `c47707e` except `CHANGELOG.md` (released sections are frozen) and `.dev/features/**`
(historical records). The four trusted docs are included and their hits get the disposition `human-applied patch`.
Generated regions: no hit falls in `docs/capabilities/**`, `docs/lessons-index.md` or README's `## Current state`
(lines 721–730; `README.md:877` is outside it).

**Pinned commands.** One `git grep` per phrase, run from the repo root at `c47707e`. Re-running them there reproduces
the hit set below exactly:

```text
git grep -n -I -i -E '<pattern>' -- . ':!CHANGELOG.md' ':!.dev/features/'
```

| id  | pattern (ERE, case-insensitive)                                            | axis     | line hits |
| --- | -------------------------------------------------------------------------- | -------- | --------- |
| P1  | `subagents?[- ]per[- ]lens`                                                | phrase   | 24        |
| P2  | `one[- ]subagent`                                                          | phrase   | 34        |
| P3  | `own (parallel )?subagent`                                                 | phrase   | 1         |
| P4  | `fresh sub-?agent`                                                         | phrase   | 2         |
| P5  | `fan-out\|fans? (out\|every)`                                              | phrase   | 41        |
| P6  | `each lens runs`                                                           | phrase   | 1         |
| P7  | `subagent each`                                                            | phrase   | 1         |
| P8  | `lens subagent`                                                            | phrase   | 7         |
| P9  | `lens runner\|live runner\|pre-runner\|per-GRILLER runner`                 | referent | 45        |
| P10 | `sub-agent`                                                                | phrase   | 4         |
| R1  | `Step 4 spawns\|Step 4 fans`                                               | referent | 24        |
| R2  | `lenses (run )?in parallel\|in parallel as subagents\|parallel subagents?` | referent | 8         |
| R3  | `each[^.]{0,30}lens[^.]{0,12}(runs?\|lists?\|reads?\|loads?)( \|$\|,)`     | referent | 4         |
| R4  | `pharn-review[^ ]* Step 4`                                                 | referent | 26        |
| R5  | `Step 4`, over `.claude/commands/pharn-review.md` only                     | referent | 9         |

(`\|` is the table's escape for `|`.) **Wrap-tolerant pass:** each file joined with line prefixes (`>`, `//`, `*`, `#`,
`-`) stripped and each pattern's spaces matched as `\s+`; it reported 7 matches that span a line break. Its scratch
runner lived under `.pharn/` and was deleted. Those spans are tagged `W:` on their first line below.

**Result: 153 distinct `path:line` hits — 59 edit, 3 human-applied patch, 91 still-true, 0 follow-up.** Line numbers are
at `c47707e`. The human patch and the build move them (H3 adds one line to `LIMITS.md` from 125 on), so a re-run after
either must be compared at `c47707e`, or through the post-build checks below.

**Coverage boundary (L49).** No checker reads any sentence this increment edits. What re-derives the table is a re-run
of the pinned greps (the `/pharn-dev-grill` re-run L75 prescribes is unbuilt, so this is discipline) and the
post-build greps below. The checker-backed sites are only the version records (`check:badge`, `check:changelog`,
`check:changelog-entry`). A spelling that none of the 15 patterns matches is outside this table (L33's residual).

### Every hit, with its disposition

- `.claude/agents/pharn-review-lens.md:3` R4 — still-true: 6.64.0 text (SHA-pinned; not touched)
- `.claude/commands/pharn-dev-eval.md:105` P10 — still-true: /pharn-dev-eval's own `claude -p` sub-agent
- `.claude/commands/pharn-dev-grill.md:213` P9 — still-true: the per-griller runner, still deferred
- `.claude/commands/pharn-dev-review.md:110` R2 — still-true: the lenses do run as parallel subagents, grouped; names no
  count
- `.claude/commands/pharn-review.md:2` R2 — still-true: lens groups run in parallel; names no per-lens subagent (Q2)
- `.claude/commands/pharn-review.md:20` R2 — still-true: as :2 (Q2)
- `.claude/commands/pharn-review.md:23` W:P3,R2 — still-true: 6.64.0 text: each group in its own parallel subagent
- `.claude/commands/pharn-review.md:61` P5,R1,R2,R5 — still-true: N parallel subagent writers: N is the group count
- `.claude/commands/pharn-review.md:117` R5 — still-true: a lens of Step 4, no count
- `.claude/commands/pharn-review.md:130` P8 — still-true: a `pharn-review-lens` subagent is a lens subagent; singular, no
  count
- `.claude/commands/pharn-review.md:151` P2 — still-true: 6.64.0 text
- `.claude/commands/pharn-review.md:158` R3 — still-true: 6.64.0 text
- `.claude/commands/pharn-review.md:161` P2,R1,R5 — still-true: 6.64.0 text
- `.claude/commands/pharn-review.md:173` R5 — still-true: 6.64.0 text: each lens group lists the skills
- `.claude/commands/pharn-review.md:184` R5 — still-true: a cite of Step 4's skill instruction, unchanged
- `.claude/commands/pharn-review.md:199` R5 — still-true: a cite of Step 4's advisory spawn, no count
- `.claude/commands/pharn-review.md:202` R5 — still-true: 6.64.0 heading
- `.claude/commands/pharn-review.md:204` P2 — still-true: 6.64.0 text
- `.claude/commands/pharn-review.md:305` R5 — still-true: Step 4 still returns one `skills:` line per lens
- `.claude/commands/pharn-review.md:310` R5 — still-true: 6.64.0 text
- `.claude/commands/pharn-review.md:368` P6,R3 — edit: E5
- `.claude/commands/pharn-review.md:374` P8 — still-true: any lens subagent's shell; singular, no count
- `.claude/hooks/enforce-writes-scope.cjs:158` P8 — still-true: a lens subagent, singular (hook-guarded file; not
  touched)
- `.dev/floor/check-config.mjs:58` P10 — still-true: Claude Code's sub-agent model surface
- `.dev/floor/command-hygiene.test.mjs:1481` P5,R1 — still-true: Step 4 still fans out to N parallel writers
- `.dev/floor/command-hygiene.test.mjs:1597` R4 — still-true: the lens `findings.json` path, unchanged
- `.dev/floor/command-hygiene.test.mjs:4888` R2 — still-true: a literal of the pre-6.28.2 description, a control fixture
- `.dev/floor/installed-skills-consumers.test.mjs:18` R4 — still-true: Step 4 is still the lens consumer of the catalogue
- `.dev/floor/installed-skills-consumers.test.mjs:83` R4 — still-true: as :18
- `.dev/floor/review-lens-agent.test.mjs:46` R4 — still-true: 6.64.0 pin
- `.dev/floor/review-lens-agent.test.mjs:202` P2,R1 — still-true: 6.64.0 pin
- `.dev/floor/review-lens-agent.test.mjs:269` R1 — still-true: 6.64.0 mutant
- `.dev/floor/stage-load-budget.test.mjs:118` P2 — still-true: 6.64.0 text
- `.dev/guides/deferred-decisions.md:23` P9 — still-true: the verifier runner, unrelated
- `.dev/guides/product-commands.md:67` R4,W:R1 — still-true: 6.64.0 text
- `.dev/guides/product-commands.md:93` P1,P2 — still-true: compares against the old one-per-lens spawn
- `.dev/measurements/token-cost-2026-08-18.md:37` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:158` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:160` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:183` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:186` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:207` P4,P10 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:220` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:221` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:247` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:276` P5 — still-true: a dated measurement record of a past run
- `.dev/measurements/token-cost-2026-08-18.md:302` P5 — still-true: a dated measurement record of a past run
- `.dev/memory-bank/lessons-learned.md:116` P9 — still-true: canon provenance naming the 3c `/pharn-eval` live runner, a
  past increment
- `.dev/memory-bank/lessons-learned.md:2387` P1,P2,P5 — still-true: L75 quoting the stale phrase as its evidence
- `LIMITS.md:122` P5 — still-true: cost still scales with fan-out breadth (heading)
- `LIMITS.md:124` P5 — human-applied patch: H3
- `LIMITS.md:125` P5 — still-true: the unchanged rest of H3's sentence
- `LIMITS.md:142` P5 — human-applied patch: H4
- `LIMITS.md:159` P4,P10 — still-true: the lens named, secrets-in-code, still runs alone in a fresh subagent
- `LIMITS.md:173` P5 — still-true: per-call overhead x fan-out, generic
- `README.md:316` R2 — still-true: lens groups run in parallel; names no per-lens subagent (Q2)
- `README.md:494` R2 — still-true: as :316 (Q2)
- `README.md:877` P3,P5,R2 — edit: E9
- `THREAT-MODEL.md:58` P8,R3 — human-applied patch: H5
- `pharn/floor/catalogue-installed-skills.mjs:9` R3 — edit: E8
- `pharn/floor/count-lenses.mjs:5` P2,P7 — edit: E7
- `pharn/floor/griller-extract.mjs:49` P2 — still-true: a rejected per-griller candidate, unrelated
- `pharn/floor/lens-family-map.json:2` P2 — still-true: 6.64.0 text
- `pharn/floor/lens-groups.mjs:2` P2 — still-true: 6.64.0 text
- `pharn/floor/lens-groups.mjs:6` P2 — still-true: 6.64.0 text
- `pharn/floor/lens-groups.mjs:21` P1,P2 — still-true: names the 6.62.0 spawn an unmapped lens falls back to
- `pharn/floor/merge-findings.mjs:4` P1,P2 — edit: E6
- `pharn/floor/merge-findings.mjs:44` P8 — still-true: a lens subagent, singular
- `pharn/floor/merge-findings.mjs:213` R4 — still-true: the per-lens `findings.json` path, unchanged
- `pharn/floor/render-cost-record.test.mjs:240` P5 — still-true: nested subagent transcripts, generic
- `pharn/floor/run-gates.test.mjs:2375` P9 — still-true: a gate runner, unrelated
- `pharn/floor/run-marker.mjs:36` P8 — still-true: lens subagents share the orchestrator's marker, still true
- `pharn/floor/transcript-core.mjs:54` P5 — still-true: nested subagent transcripts, generic
- `pharn/pharn-contracts/finding-shape.md:91` P8 — still-true: a lens subagent, singular
- `pharn/pharn-contracts/ship-record.md:90` P5 — still-true: nested subagent transcripts, generic
- `pharn/pharn-pipeline/grillers/i18n/i18n.md:207` P9 — still-true: a griller: /pharn-grill still applies grillers
  inline, so `(pre-runner)` holds
- `pharn/pharn-pipeline/grillers/performance/evals/cases/plan-perf-risk.md:3` P5 — still-true: an N+1 query fan-out, not
  a subagent
- `pharn/pharn-pipeline/grillers/performance/evals/expected/plan-perf-risk.json:14` P5 — still-true: an N+1 query
  fan-out, not a subagent
- `pharn/pharn-pipeline/grillers/performance/evals/expected/plan-perf-risk.md:3` P5 — still-true: an N+1 query fan-out,
  not a subagent
- `pharn/pharn-pipeline/grillers/performance/evals/expected/plan-perf-risk.md:17` P5 — still-true: an N+1 query
  fan-out, not a subagent
- `pharn/pharn-pipeline/grillers/performance/evals/expected/plan-perf-risk.md:18` P5 — still-true: an N+1 query
  fan-out, not a subagent
- `pharn/pharn-pipeline/grillers/performance/evals/expected/plan-perf-risk.md:24` P5 — still-true: an N+1 query
  fan-out, not a subagent
- `pharn/pharn-pipeline/grillers/performance/performance.md:46` P5 — still-true: an N+1 query fan-out, not a subagent
- `pharn/pharn-pipeline/grillers/performance/performance.md:77` P5 — still-true: an N+1 query fan-out, not a subagent
- `pharn/pharn-pipeline/grillers/performance/performance.md:100` P5 — still-true: an N+1 query fan-out, not a subagent
- `pharn/pharn-pipeline/grillers/privacy/privacy.md:172` P9 — still-true: a griller: /pharn-grill still applies
  grillers inline, so `(pre-runner)` holds
- `pharn/pharn-pipeline/grillers/security/security.md:169` P9 — still-true: a griller: /pharn-grill still applies
  grillers inline, so `(pre-runner)` holds
- `pharn/pharn-review/copy-paste-drift/copy-paste-drift.md:81` P9 — edit: E1
- `pharn/pharn-review/copy-paste-drift/copy-paste-drift.md:82` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/copy-paste-drift/copy-paste-drift.md:163` P9 — edit: E2
- `pharn/pharn-review/duplicated-logic/duplicated-logic.md:82` P9 — edit: E1
- `pharn/pharn-review/duplicated-logic/duplicated-logic.md:83` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/duplicated-logic/duplicated-logic.md:162` P9 — edit: E2
- `pharn/pharn-review/injection/injection.md:75` P9 — edit: E1
- `pharn/pharn-review/injection/injection.md:76` P1,P2,R1,R4,W:P9 — edit: E1 (the wrapped per-GRILLER clause is kept)
- `pharn/pharn-review/injection/injection.md:156` P9 — edit: E2
- `pharn/pharn-review/insecure-crypto/insecure-crypto.md:75` P9 — edit: E1
- `pharn/pharn-review/insecure-crypto/insecure-crypto.md:76` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/insecure-crypto/insecure-crypto.md:77` P9 — still-true: the kept clause `(the per-GRILLER runner
is still deferred, P7)`: /pharn-grill applies each griller inline
- `pharn/pharn-review/insecure-crypto/insecure-crypto.md:158` P9 — edit: E2
- `pharn/pharn-review/magic-values/magic-values.md:87` P9 — edit: E1
- `pharn/pharn-review/magic-values/magic-values.md:88` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/magic-values/magic-values.md:183` P9 — edit: E2
- `pharn/pharn-review/missing-await/missing-await.md:86` P9 — edit: E1
- `pharn/pharn-review/missing-await/missing-await.md:87` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/missing-await/missing-await.md:176` P9 — edit: E2
- `pharn/pharn-review/missing-error-handling/missing-error-handling.md:100` P9 — edit: E1
- `pharn/pharn-review/missing-error-handling/missing-error-handling.md:101` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/missing-error-handling/missing-error-handling.md:190` P9 — edit: E2
- `pharn/pharn-review/missing-timeout/missing-timeout.md:101` P9 — edit: E1
- `pharn/pharn-review/missing-timeout/missing-timeout.md:102` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/missing-timeout/missing-timeout.md:193` P9 — edit: E2
- `pharn/pharn-review/n-plus-one/evals/cases/case-braceless-map-query.md:9` P5 — still-true: an N+1 query fan-out, not
  a subagent
- `pharn/pharn-review/n-plus-one/evals/cases/case-query-in-loop-injection.md:3` P5 — still-true: an N+1 query fan-out,
  not a subagent
- `pharn/pharn-review/n-plus-one/evals/cases/case-query-in-loop-injection.md:24` P5 — still-true: an N+1 query
  fan-out, not a subagent
- `pharn/pharn-review/n-plus-one/evals/expected/expected-batched-query.md:22` P5 — still-true: an N+1 query fan-out,
  not a subagent
- `pharn/pharn-review/n-plus-one/evals/expected/expected-query-in-loop-injection.md:18` P5 — still-true: an N+1 query
  fan-out, not a subagent
- `pharn/pharn-review/n-plus-one/n-plus-one.md:80` P5 — still-true: an N+1 query fan-out, not a subagent
- `pharn/pharn-review/n-plus-one/n-plus-one.md:84` P9 — edit: E1
- `pharn/pharn-review/n-plus-one/n-plus-one.md:85` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/n-plus-one/n-plus-one.md:92` P5 — still-true: an N+1 query fan-out, not a subagent
- `pharn/pharn-review/n-plus-one/n-plus-one.md:104` P5 — still-true: an N+1 query fan-out, not a subagent
- `pharn/pharn-review/n-plus-one/n-plus-one.md:125` P5 — still-true: an N+1 query fan-out, not a subagent
- `pharn/pharn-review/n-plus-one/n-plus-one.md:135` P5 — still-true: an N+1 query fan-out, not a subagent
- `pharn/pharn-review/null-deref/null-deref.md:91` P9 — edit: E1
- `pharn/pharn-review/null-deref/null-deref.md:92` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/null-deref/null-deref.md:172` P9 — edit: E2
- `pharn/pharn-review/off-by-one/off-by-one.md:79` P9 — edit: E1
- `pharn/pharn-review/off-by-one/off-by-one.md:80` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/off-by-one/off-by-one.md:168` P9 — edit: E2
- `pharn/pharn-review/path-traversal/path-traversal.md:91` P9 — edit: E1
- `pharn/pharn-review/path-traversal/path-traversal.md:92` P1,P2,R1,R4,W:P9 — edit: E1 (the wrapped per-GRILLER clause
  is kept)
- `pharn/pharn-review/path-traversal/path-traversal.md:173` P9 — edit: E2
- `pharn/pharn-review/placeholder-as-done/placeholder-as-done.md:79` P9 — edit: E1
- `pharn/pharn-review/placeholder-as-done/placeholder-as-done.md:80` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/placeholder-as-done/placeholder-as-done.md:159` P9 — edit: E2
- `pharn/pharn-review/race-condition/race-condition.md:159` P1,P2,P9,R1,R4 — edit: E3
- `pharn/pharn-review/race-condition/race-condition.md:167` P1,P2,P9 — edit: E4
- `pharn/pharn-review/resource-leak/resource-leak.md:93` P9 — edit: E1
- `pharn/pharn-review/resource-leak/resource-leak.md:94` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/resource-leak/resource-leak.md:173` P9 — edit: E2
- `pharn/pharn-review/secrets-in-code/secrets-in-code.md:70` P9 — edit: E1
- `pharn/pharn-review/secrets-in-code/secrets-in-code.md:71` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/secrets-in-code/secrets-in-code.md:72` P9 — still-true: the kept clause `(the per-GRILLER runner
is still deferred, P7)`: /pharn-grill applies each griller inline
- `pharn/pharn-review/secrets-in-code/secrets-in-code.md:148` P9 — edit: E2
- `pharn/pharn-review/ssrf/ssrf.md:95` P9 — edit: E1
- `pharn/pharn-review/ssrf/ssrf.md:96` P1,P2,R1,R4,W:P9 — edit: E1 (the wrapped per-GRILLER clause is kept)
- `pharn/pharn-review/ssrf/ssrf.md:181` P9 — edit: E2
- `pharn/pharn-review/swallowed-exception/swallowed-exception.md:88` P9 — edit: E1
- `pharn/pharn-review/swallowed-exception/swallowed-exception.md:89` P1,P2,R1,R4 — edit: E1
- `pharn/pharn-review/swallowed-exception/swallowed-exception.md:165` P9 — edit: E2
- `pharn/pharn-review/unsafe-deserialization/unsafe-deserialization.md:94` P9 — edit: E1
- `pharn/pharn-review/unsafe-deserialization/unsafe-deserialization.md:95` P1,P2,R1,R4,W:P9 — edit: E1 (the wrapped
  per-GRILLER clause is kept)

**Dereferenced (L50), for every cite a rewritten sentence keeps or adds:** `pharn/floor/lens-family-map.json` and
`pharn/floor/lens-groups.mjs` exist and ship under `pharn/floor/` (the helper's header says an install's map is a
superset of its lenses). `/pharn-grill` applies each griller inline (`.claude/commands/pharn-grill.md`, "Run each
griller … apply its procedure inline"), so the kept clause "the per-GRILLER runner is still deferred" holds.
`pharn/pharn-contracts/finding-shape.md` §Emission (its enforcement audit) records the 3c runners as landed, so
race-condition's kept clause holds. Each lens's Layer 1 still tells the lens to run its scanner, so "the model's inline
invocation of it" holds once `(pre-runner)` goes. `pharn/floor/render-review-assignments.mjs` writes one `assignments[]`
entry per registered lens, so E7's "the lenses the review assigns" holds.

## Edits the build makes (E1–E9)

Matching is over whitespace-folded text: a line break plus its prefix (`>`, `//`, indentation) counts as one space.
Each OLD text occurs **exactly once** in its file at `c47707e`; a scratch dry-run applied all 41 edit operations in
memory and found 41 single matches (runner deleted). The build re-checks each match and, if any OLD text matches 0 or
more than one time, HALTs and asks (P5). Each NEW text keeps the line's prefix (`>` in a blockquote, `//` in a
header) and wraps at 120 columns or less. Nothing else in any file changes: no Layer 1 or Layer 2 procedure, scanner
line, finding-output section, eval, frontmatter or `version:`.

- **E1** — the "Two clocks" blockquote of 18 lenses: `copy-paste-drift`, `duplicated-logic`, `injection`,
  `insecure-crypto`, `magic-values`, `missing-await`, `missing-error-handling`, `missing-timeout`, `n-plus-one`,
  `null-deref`, `off-by-one`, `path-traversal`, `placeholder-as-done`, `resource-leak`, `secrets-in-code`, `ssrf`,
  `swallowed-exception`, `unsafe-deserialization`.
  - OLD: ``The isolated lens runner has LANDED — `/pharn-review` Step 4 spawns **one subagent per lens**, each writing its own `findings.json` ``
  - NEW: ``The lens runner has LANDED — `/pharn-review` Step 4 spawns **one subagent per lens family** (`pharn/floor/lens-family-map.json`), each lens writing its own `findings.json` ``
  - What follows is kept: `— but the lens's **act** of invoking the scanner …` (12 lenses) or
    `(the per-GRILLER runner is still deferred, P7) — but …` (the six security lenses).
  - "isolated" goes because a grouped lens shares its context with its family; "one subagent per lens family" is also
    true for the six security lenses, which the committed map keeps alone.
- **E2** — the guarantee-audit "Two clocks" bullet of 16 lenses (E1's list minus `n-plus-one` and
  `unsafe-deserialization`, which have no such label).
  - OLD: `inline invocation of it (pre-runner) is advisory` — NEW: `inline invocation of it is advisory`
  - `(pre-runner)` has been false since the lens runner landed; #168 (2.7.15) corrected these files' Two-clocks
    blockquotes and missed this label. The three griller hits keep it (still-true above).
- **E3** — `pharn/pharn-review/race-condition/race-condition.md:159`.
  - OLD: ``The isolated lens runner has since LANDED — `/pharn-review` Step 4 spawns one subagent per lens, each writing its own `findings.json`, and``
  - NEW: ``The lens runner has since LANDED — `/pharn-review` Step 4 spawns one subagent per lens family (`pharn/floor/lens-family-map.json`), each lens writing its own `findings.json`, and``
- **E4** — `pharn/pharn-review/race-condition/race-condition.md:167`.
  - OLD: ``The live runner has landed (`/pharn-review` spawns one subagent per lens), but``
  - NEW: ``The live runner has landed (`/pharn-review` spawns one subagent per lens family), but``
- **E5** — `.claude/commands/pharn-review.md:368` (the claims block).
  - OLD: `the installed-skill catalogue each lens runs` — NEW: `the installed-skill catalogue each lens group runs`
  - Step 4 gives the catalogue instruction to each subagent once. The next line's "a lens's `skills:` line is
    self-report" stays true, because Step 4 still returns one `skills:` line per lens.
- **E6** — `pharn/floor/merge-findings.mjs:4`.
  - OLD: `A parallel /pharn-review spawns one subagent per lens; each emits its own findings.json`
  - NEW: `A parallel /pharn-review spawns one subagent per lens family (pharn/floor/lens-groups.mjs); each lens emits its own findings.json`
  - The rest of the header (N arrays assembled, the per-lens findings advisory) still holds.
- **E7** — `pharn/floor/count-lenses.mjs:5`.
  - OLD: `That set is exactly the lenses the review spawns (one subagent each) and whose findings.json the`
  - NEW: `That set is exactly the lenses the review assigns (run in family groups, one subagent per group) and whose findings.json the`
- **E8** — `pharn/floor/catalogue-installed-skills.mjs:9`.
  - OLD: ``and each `/pharn-review` lens run one pinned line`` — NEW: ``and each `/pharn-review` lens group run one pinned line``
- **E9** — `README.md:877` (outside the generated region).
  - OLD: `` `/pharn-review` fans every applicable lens out as its own parallel subagent; ``
  - NEW: `` `/pharn-review` fans the applicable lenses out to parallel subagents, one per lens family; ``

No test pins any OLD text: `git grep` over every `*.test.*` and floor `.mjs` for each OLD phrase returns nothing. The
only SHA-256 pin near this change is `.dev/floor/review-lens-agent.test.mjs`'s on `.claude/agents/pharn-review-lens.md`,
which no edit touches.

## Why changing the lens bytes is acceptable now

The grouped eval rendered three byte sets into its prompts (REVIEW.md, reach notes): the trusted-prefix blockquote, the
Step 4 text from the installed-skills instruction through the rules paragraph, and the lens bodies each subagent read.
**E1–E4 change the third set** (19 lens files). E5 (line 368 of the claims block), E6–E9 and the trusted-doc patch
change none of the three. The constitution prefix is unchanged.

It is acceptable now because the measurement is finished and recorded against the `23937ba` bytes, in
`.dev/features/review-lens-grouping/MEASUREMENTS.md` and the frozen 6.64.0 entry; the 6.64.0 entry deferred these
edits for that reason only. No floor test pins a lens body's bytes. The edits are claims prose inside a "Two clocks"
blockquote and a guarantee-audit bullet, never the procedure a lens applies. **Bound (advisory):** the 6.64.0 grouped
eval and probe results describe the pre-edit lens bytes and are not re-run. That the edits leave a lens's findings
unchanged is expected and not measured. The committed structural evals still run at `/pharn-dev-verify`.

## Human-applied trusted-doc patch

Applied by the human, by a script the orchestrator generates from this section, **after GATE 1 and before
`/pharn-dev-grill`** (so grill's spec-hash check meets the pin) and in any case **before `/pharn-dev-build` Step 0**
(L68). The orchestrator commits it to `feat/subagent-per-lens-sweep`; the build anchors afterwards. None of these four
files is in `## Files`: `protect-trusted-paths.cjs` denies them to the write tools regardless of scope.

**Format.** Each Before block is the exact full line(s) at `c47707e`, without the final newline, and occurs exactly once
in its file. The script replaces it with the After block. Lines keep their leading spaces; `…` is U+2026. Apply H1–H5
in order. Then `node .dev/floor/hash-doc.mjs <file>` must print:

| file                    | before (`c47707e`)                                                 | after                                                              |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `pharn/ARCHITECTURE.md` | `75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6` | `2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e` |
| `LIMITS.md`             | `e51b52ff6c43a87ed83ac4e65ff4af71843883c407da984a197dc880ed91801a` | `94805c21eaff406df8a30fba6976da2a5cdefd9ea992d039bd61ee19a946759b` |
| `THREAT-MODEL.md`       | `9eff6c4f55f43fe051c2b897907eccc4d36e0d591b48a21d41bcf98c39217317` | `ec0c9c789d367d7a5aa848249791d758dc1a4619d32141e05b30dc64caeec52c` |

`pharn/CONSTITUTION.md` has no hit and is not patched. Byte deltas: ARCHITECTURE +340, LIMITS +79, THREAT-MODEL +6.

### H1 — `pharn/ARCHITECTURE.md` §4 tree: a row for `.claude/agents/` (line 143; `architecture-agents-dir`)

Before (line 143):

```text
.claude/commands/                              the stages: pharn-spec … pharn-ship (+ loop, review, memory-promote)
```

After (two lines; the new row's text starts at the same column, 48):

```text
.claude/commands/                              the stages: pharn-spec … pharn-ship (+ loop, review, memory-promote)
.claude/agents/                                PHARN's subagent types: pharn-review-lens (/pharn-review's lens groups)
```

### H2 — `pharn/ARCHITECTURE.md` §4, the "Stages live in commands" bullet (line 161; `architecture-agents-dir`)

Before (line 161):

```text
  twins are contributor apparatus (`.dev/`) and are not product surface.
```

After (three lines):

```text
  twins are contributor apparatus (`.dev/`) and are not product surface. PHARN's own subagent types are
  `.claude/agents/pharn-*.md` definitions, such as `pharn-review-lens` (`/pharn-review`'s lens groups): a
  definition states a role and its fences, and the stage's prompt carries the task.
```

The sentence uses an open form ("such as"), not a count (L47), and says nothing about installs: pharn-cli copying
`.claude/agents/` is follow-up `cli-install-agents`, and a "not yet" here would expire (L33). Its claim matches
`.dev/guides/product-commands.md` ("One copy of the task"): the definition's body holds its role, a scope guard, the P2
fence and its write rule, and the command's prompt carries the task.

### H3 — `LIMITS.md` §3a (line 124)

Before (line 124):

```text
A 3-line typo fix still fans out to every lens, each loading its rules + the diff. Tiered loading
```

After (two lines):

```text
A 3-line typo fix still fans out to every lens with a non-empty review set, one subagent per lens family,
each loading its lenses' rules + the diff. Tiered loading
```

"Every lens" has been false since `/pharn-review` first shipped its scanner prefilter (#64): a scanner-bound lens with an
empty review set may be skipped. The family grouping is 6.64.0's. The scanner-less lenses always get the whole target,
so a small change still fans out; the rest of §3a stands.

### H4 — `LIMITS.md` §3a, the `/pharn-ship --quick` note (line 142)

Before (line 142):

```text
> proportionality, and `/pharn-review`'s lens fan-out is unchanged.
```

After:

```text
> proportionality, and `--quick` does not change `/pharn-review`'s lens fan-out.
```

"Unchanged" now reads as "nothing has reduced it", which 6.64.0's grouping did; the sentence's point is that `--quick`
leaves the review alone (`/pharn-review` is not a `/pharn-ship` stage).

### H5 — `THREAT-MODEL.md` §2, surface 8 (line 58)

Before (line 58):

```text
   their own repo. `/pharn-build`, full `/pharn-grill` and each `/pharn-review` lens subagent list these through a
```

After:

```text
   their own repo. `/pharn-build`, full `/pharn-grill` and each `/pharn-review` lens-group subagent list these through a
```

Step 4 gives the catalogue instruction to each subagent once, so the subject is the group's subagent; the same wording
`.claude/commands/pharn-review.md` uses ("Each lens-group subagent inherits this fence"). Q3 records the alternative.

## Ordering (L68)

1. This PLAN is committed (`wip(subagent-per-lens-sweep): plan`); GATE 1 approves it (approved in advance).
2. The human runs the generated patch script (H1–H5) and checks the three post-patch digests above.
3. The orchestrator commits the three trusted docs to `feat/subagent-per-lens-sweep`. `npm run check:reconcile` REDs an
   uncommitted trusted-doc edit, so the commit comes first.
4. `/pharn-dev-grill`: its spec-hash recompute now equals the pin.
5. `/pharn-dev-build` Step 0 sets the scope from `## Files` and anchors the reconcile baseline; Step 1's spec-hash check
   passes only if the patch produced the planned bytes. The trusted docs are then outside the anchor→verify window,
   so reconcile reports nothing for them, and `/pharn-dev-regress`'s scope check lists them in `escape_exempt`
   (`pharn/floor/check-regress.mjs`, `TRUSTED_DOCS`).

If `main` moves and the rebase changes `pharn/ARCHITECTURE.md`, the pin no longer matches: HALT and re-plan the pin with
the human; never re-pin silently.

## Budget impact

Measured live at `c47707e` with a scratch replica of `.dev/floor/stage-load-budget.test.mjs`'s sum (the test itself
passes today):

- **`pharn-review` load set:** 347,792 B of 375,808. E1–E4 add +559 B before rewrap (+27 per E1 file, +40 for
  `n-plus-one` and `unsafe-deserialization`, which have no E2, +47 for `race-condition`), and E5 adds +6, giving about
  348,360 B plus a few bytes per rewrapped line. Headroom stays above 27 KB.
- **`pharn-review.md` command bytes:** 28,573 of 30,720 (`COMMAND_BYTE_CEILINGS`); E5 makes it 28,579.
- **ARCHITECTURE (+340 B)** is in six rows: `pharn-build` 70,699 → 71,039 of 77,824; `pharn-grill` 266,172 → 266,512 of
  285,184; `pharn-memory-promote` 56,925 → 57,265 of 62,976; `pharn-plan` 55,793 → 56,133 of 61,440; `pharn-spec`
  63,344 → 63,684 of 70,144; `pharn-ship` 147,798 → 148,138 of 162,816.
- `LIMITS.md` and `THREAT-MODEL.md` are in no load row. No ceiling is raised.

## Applied lessons

- L1 — the meta-docs this changes are in `## Files`: `README.md` (line 877 and the badge), `CHANGELOG.md`,
  `SKILLS_VERSION`. `CLAUDE.md`, `CONTRIBUTING.md` and `.dev/guides/*` were swept with the same patterns and hold no stale
  site (`.dev/guides/product-commands.md:93` compares against the old spawn and stays).
- L13 — this PLAN is formatted by prettier and markdownlint scoped to this one file; the build formats only its
  `## Files` paths.
- L19 — no repo-wide formatter, and no in-repo write through Bash: the sweep runners lived under `.pharn/` (gitignored)
  and were deleted before lint, and the trusted-doc patch is the human's script, outside the agent.
- L25 — the `merge-findings.mjs` and `count-lenses.mjs` headers are re-derived from what `lens-groups.mjs` does now, and
  the rest of each header was re-read against the code and kept only where it still holds.
- L29 — the enumeration is the deliverable: the table above lists all 153 hits, E1 and E2 name their 18 and 16 files,
  and the dry-run matched each of the 41 edit operations exactly once.
- L33 — the patterns are the shortest invariant substrings (`one[- ]subagent`, `pre-runner`, `lens runner`), and A1's
  22-site list was treated as a lower bound; the sweep beat it by 16 `(pre-runner)` labels, `catalogue-installed-skills.mjs:9`,
  `pharn-review.md:368` and three trusted-doc lines.
- L36 — the variant spellings were found only by widening the patterns: hyphenated `one-subagent-per-lens`
  (`lens-groups.mjs:21`) and `sub-agent` (`LIMITS.md:159`).
- L47 — every replacement uses an open form ("one subagent per lens family", "such as `pharn-review-lens`"); none
  introduces a count such as "11 families" or "one definition today".
- L49 — the sweep states its coverage boundary: no checker reads an edited sentence, only the version records are
  checker-backed, and the table is re-derived by re-running the pinned greps and the post-build checks.
- L50 — the sweep runs on two axes (phrases P1–P10, referents R1–R5 plus `lens runner`), adds a wrap-tolerant pass, and
  dereferences every cite a rewritten sentence keeps or adds (the "Dereferenced" paragraph).
- L64 — the 6.64.2 entry restates these edits, so before handoff the build greps its own CHANGELOG lines for each count
  and quantifier ("19 lens bodies", "16", "every", "each") and checks each against this table.
- L68 — the human-only edits land and are committed before `/pharn-dev-build` Step 0, and GATE 1 states it (Ordering).
- L71 — `## Files` holds 26 concrete paths and no glob; the build compares the setter's printed count with 26.
- L75 — the sweep declaration lists each phrase with its pinned grep, and every hit as `path:line` with exactly one
  disposition (edit, human-applied patch, or still-true with its reason); none is left without one.

## Files

- `pharn/pharn-review/copy-paste-drift/copy-paste-drift.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/duplicated-logic/duplicated-logic.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/injection/injection.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/insecure-crypto/insecure-crypto.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/magic-values/magic-values.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/missing-await/missing-await.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/missing-error-handling/missing-error-handling.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/missing-timeout/missing-timeout.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/n-plus-one/n-plus-one.md` — E1. — layer: pharn-review
- `pharn/pharn-review/null-deref/null-deref.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/off-by-one/off-by-one.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/path-traversal/path-traversal.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/placeholder-as-done/placeholder-as-done.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/race-condition/race-condition.md` — E3, E4. — layer: pharn-review
- `pharn/pharn-review/resource-leak/resource-leak.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/secrets-in-code/secrets-in-code.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/ssrf/ssrf.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/swallowed-exception/swallowed-exception.md` — E1, E2. — layer: pharn-review
- `pharn/pharn-review/unsafe-deserialization/unsafe-deserialization.md` — E1. — layer: pharn-review
- `.claude/commands/pharn-review.md` — E5, one claims-block line. — layer: product command
- `pharn/floor/merge-findings.mjs` — E6, header comment line 4. — layer: product floor
- `pharn/floor/count-lenses.mjs` — E7, header comment line 5. — layer: product floor
- `pharn/floor/catalogue-installed-skills.mjs` — E8, header comment line 9. — layer: product floor
- `README.md` — E9 (line 877) and the version badge (line 27). — layer: repo meta
- `SKILLS_VERSION` — 6.64.1 to 6.64.2. — layer: repo meta
- `CHANGELOG.md` — one new `## [6.64.2] - 2026-10-19` section (below). — layer: repo meta

### Not in Files

- The four trusted docs: the human patch above, landed before build Step 0.
- `MIN_CLI`, every lens `version:` and frontmatter (the #168 sweep precedent changed lens prose without a version bump),
  `docs/capabilities/**`, `docs/lessons-index.md` and README's `## Current state` (no rendered input changes; `docs:check`
  proves it), every eval file, `.claude/agents/pharn-review-lens.md`, `pharn/floor/lens-family-map.json`,
  `pharn/floor/lens-groups.mjs` and every test.

## Version and CHANGELOG

- **Patch, 6.64.1 → 6.64.2**: a correction to shipped prose (lens bodies, floor headers, a product-command line, three
  trusted docs). `[Unreleased]` holds no entries at `c47707e`, so nothing moves into the new section.
- **The entry, under `### Fixed`**, in CONTRIBUTING's "CHANGELOG entries" shape: a bold sentence saying shipped prose no
  longer says `/pharn-review` spawns one subagent per lens, and `pharn/ARCHITECTURE.md §4` now places
  `.claude/agents/`.
  - What changed: E1–E9 in plain words (19 lens bodies, the 16 `(pre-runner)` labels, three floor headers, one claims
    line, the README), and the **trusted-doc edits, applied by the maintainer before the build**: the §4 tree row and
    sentence for `.claude/agents/` (closes `architecture-agents-dir`), `LIMITS.md` §3a's two sentences, and
    `THREAT-MODEL.md` §2 surface 8's subject.
  - Why: `.dev/features/review-lens-grouping/REVIEW.md` A1 and the 6.64.0 follow-ups `subagent-per-lens-sweep` and
    `architecture-agents-dir`; the lens bodies waited only for the grouped eval, which is recorded; `(pre-runner)` was
    false since the lens runner landed, and §3a's "every lens" since the scanner prefilter (#64).
  - Not changed: any lens procedure, scanner, finding output, eval or `version:`; the agent definition; `MIN_CLI`.
  - Checked by: the PLAN's sweep table (153 hits at `c47707e`, each with one disposition) and the post-build greps; no
    checker reads these sentences, so their truth is advisory. `docs:check` and the stage-load budget stay green.
  - Bounds: the 6.64.0 grouped-eval and probe results describe the pre-edit lens bytes and are not re-run.
- Gates: `check:changelog` and `check:badge` inside `npm run check`, and `npm run check:changelog-entry` against the
  merge-base after fetching `origin/main`.
- **Renumber by diff if `main` moves:** rebase on `origin/main`, then set `SKILLS_VERSION`, the badge and the section
  heading to the next patch above `main`'s, with the section directly above `main`'s newest. Re-run the pinned greps on
  any newly merged lens or floor file.

## Post-build checks (advisory; the build runs and records each)

- `git grep -n -i -E 'subagents? per lens($|[^ ]| [^f])' -- pharn .claude/commands .claude/agents README.md LIMITS.md THREAT-MODEL.md`
  → no hit. At `c47707e` it hits 21 lines: the 20 lens-body lines and `merge-findings.mjs:4`.
- `git grep -n -i 'isolated lens runner' -- pharn .claude` → no hit.
- `git grep -n -F '(pre-runner)' -- pharn` → exactly the three griller lines (`i18n`, `privacy`, `security`).
- `git grep -n -F 'each lens runs' -- .claude/commands/pharn-review.md` and
  ``git grep -n -F 'pharn-review` lens run ' -- pharn/floor`` → no hit.
- `node .dev/floor/hash-doc.mjs` on the three patched trusted docs → the post-patch digests above.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — untouched; the edited sentences cite §Emission's existing record and
  change no emission rule.
- `pharn/ARCHITECTURE.md §4` — gains the location of the shipped `.claude/agents/` definition (H1, H2), so the trusted
  architecture again describes every product location (P3).

## Evals to write (P1)

- None. No Capability is added and no `rule_id` changes; every lens keeps its committed eval pairs, whose case and
  expected files are untouched. `node pharn/floor/validate.mjs .` must stay GREEN (37 today, read live), and
  `/pharn-dev-verify`'s structural gate runs the committed lens evals unchanged.

## Guarantee audit (P0)

- "The pinned `pharn/ARCHITECTURE.md` bytes are exactly H1 + H2 over `c47707e`" → floor: content-hash (the build's
  Step 1 recompute against the post-patch pin).
- "LIMITS.md and THREAT-MODEL.md carry exactly H3–H5" → advisory: the human compares the listed digests; no gate reads
  them. Once committed, reconcile anchors them to their blob ids, which detects a later change, not a wrong patch.
- "The table lists every hit of the 15 pinned patterns at `c47707e`" → advisory: a reproducible grep, re-run by hand;
  the `/pharn-dev-grill` re-run L75 prescribes is unbuilt.
- "Each edited sentence is now true" → advisory (dereferenced above; review territory).
- "No lens procedure, detection or output text changed" → advisory (the diff and review); the committed structural
  evals passing is floor over their outputs, not over lens prose.
- "Under every ceiling" → floor: enum-regex over byte totals (`stage-load-budget.test.mjs`, the `COMMAND_BYTE_CEILINGS`
  table) in `npm test`.
- "The version is recorded" → floor: `check:badge`, `check:changelog`, `check:changelog-entry`.
- "Struck: the sweep is complete" → never claimed; it is complete over the 15 patterns, and L33's residual (an
  unmatched spelling) remains.

## Trust audit (P2)

- No new input is ingested. The lens bodies are `trust: trusted`, `kind: pharn-owned` procedure text that a lens-group
  subagent reads beside untrusted slices; the edits add no instruction and cite only repo files. The trusted-doc patch
  text originates in this model-written PLAN, so its truth is advisory until the human reads and applies it; the human
  gate is the control.

## Determinism audit (P5)

- No branch is added to any command or checker. The build's edit application branches on a single-match test per OLD
  text; 0 or more matches → HALT and ask. The patch script's per-block exactly-once match is the same test.

## Open questions (HALT)

The maintainer approved this plan in advance; each question carries the default the build applies unless GATE 1 says
otherwise.

1. **E2's reach.** Drop `(pre-runner)` in the 16 lens bodies, a referent-axis hit beyond A1's list? **Default: yes** —
   it is the same expired claim (the lens runner has landed), in files E1 edits anyway, and it saves 13 B each.
2. **The four "lenses run in parallel" summaries** (`pharn-review.md:2` description, `:20` title, `README.md:316`,
   `:494`): leave as still-true, or reword to "lens groups"? **Default: leave** — the groups do run in parallel and none
   says a lens has its own subagent; the description line is the skill-listing text and the body says how lenses group.
3. **H5** (`THREAT-MODEL.md:58`, "lens subagent" → "lens-group subagent"): patch, or leave as literally true?
   **Default: patch** — six bytes, "each … lens subagent" reads as one per lens, and E8 fixes the same sentence's twin
   in `catalogue-installed-skills.mjs`.
4. **The spec pin.** Pin the post-patch `pharn/ARCHITECTURE.md` hash (so build Step 1 checks the human's bytes), or pin
   the live hash and re-pin after the patch? **Default: post-patch pin, with the patch committed before grill.**

## GATE 1 — decided by the human (2026-10-19; appended below the approved text, not part of it)

Everything above this heading is the plan as committed in `50497b60` (`wip(subagent-per-lens-sweep): plan`): sha256
`f98eb74365c08d6651206e6e0277205ec22c925abe72101ce973c49d7fb6d67b`, 47,275 bytes, recomputed over the file before this
section was appended. Nothing above was edited.

**The approval was given in advance.** On 2026-10-19 the maintainer wrote, in the orchestrator's conversation, "1. I
approve the plan." The plan agent had not yet written this PLAN.md when they wrote it, so this records an approval of the
plan's intent given before its text existed, not an approval of text the maintainer had read.

In the same message the maintainer asked that every file the agent cannot write (the trusted docs) be changed by a
Python patch script that they run themselves. The orchestrator then told them it would take the four `## Open questions
(HALT)` defaults (Q1 yes, Q2 leave, Q3 patch H5, Q4 post-patch pin). They raised no objection, and they ran the patch,
H5 included.

**The human-applied trusted-doc patch (landed before the build anchor, L68).** The orchestrator generated a script from
`## Human-applied trusted-doc patch` (H1–H5). The maintainer ran it on a scratch checkout of
`feat/subagent-per-lens-sweep`; its output reported all five blocks applied, with digests ARCHITECTURE `2c84959c…`,
LIMITS `94805c21…` and THREAT-MODEL `ec0c9c78…`. The orchestrator checked those digests with `.dev/floor/hash-doc.mjs`,
committed the three docs as `125ff0fe` (`docs(trusted): human-applied patch H1–H5 for subagent-per-lens-sweep`), and
deleted the script. Re-checked in the stage worktree at `125ff0fe`: `node .dev/floor/hash-doc.mjs` prints
`2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e` for `pharn/ARCHITECTURE.md` (equal to this plan's
`spec_content_hash`), `94805c21eaff406df8a30fba6976da2a5cdefd9ea992d039bd61ee19a946759b` for `LIMITS.md` and
`ec0c9c789d367d7a5aa848249791d758dc1a4619d32141e05b30dc64caeec52c` for `THREAT-MODEL.md`, the three post-patch digests in
the table above. `git diff c47707e 125ff0fe` over the three files shows exactly the H1–H5 After blocks.

**The `## Open questions (HALT)` list above is resolved. No question is open.** Each takes its default:

1. Q1 (E2's reach) → **yes**: E2 drops `(pre-runner)` in the 16 lens bodies.
2. Q2 (the four "lenses run in parallel" summaries) → **leave**: `pharn-review.md:2`, `:20`, `README.md:316` and `:494`
   stay as still-true.
3. Q3 (H5) → **patch**: applied by the maintainer in `125ff0fe`.
4. Q4 (the spec pin) → **post-patch pin**, with the patch committed before grill: `spec_content_hash` stays
   `2c84959c…`, and build Step 1 checks the human's bytes against it.

State at this record: `origin/main` is `c47707e` (fetched 2026-10-19), so the plan's 6.64.1 → 6.64.2 bump and its pin
stand. `## Files` is unchanged by this record.
