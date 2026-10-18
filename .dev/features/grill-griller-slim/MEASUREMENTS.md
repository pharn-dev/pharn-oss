# MEASUREMENTS — grill-griller-slim (review finding CTX-1)

Every number below was re-run at build time from the shipped code, with:

```bash
node .dev/features/grill-griller-slim/measure.mjs --corpus . --corpus /Users/pgalarowicz/Projects/pharn-starter \
  --install /Users/pgalarowicz/Projects/phargus-web --install /Users/pgalarowicz/Projects/phargus \
  --install /Users/pgalarowicz/Projects/pharn-ci --install /Users/pgalarowicz/Projects/pharn-starter \
  --install /Users/pgalarowicz/Projects/pharn-web
```

- Base ("today", what 6.62.0 printed): `44b12e8` (origin/main when planned). The base griller files are read with
  `git show 44b12e8:<path>`.
- This repo: branch `build/grill-griller-slim` (plan `aa28be9`, grill `65b2475`, then this build).
- `pharn-starter`: HEAD `33a4f7d`, archetypes `ssr, backend`, 13 grillers installed.
- The 6.60.0 extract of a text is the shipped trim with its `kind: pharn-owned` line respelled to a same-length
  non-`pharn-owned` value. The kind gate then leaves out only the two `all` sections, the 6.60.0 rule, and no byte
  count moves (`measure.mjs`, header).

## 1. Bytes per griller

| griller        | base file | base extract (6.60.0) | HEAD file | shipped, intro kept | **shipped** |
| -------------- | --------: | --------------------: | --------: | ------------------: | ----------: |
| a11y           |    16,106 |                12,520 |    16,524 |              10,747 |       9,688 |
| architecture   |    10,026 |                 7,717 |    10,397 |               6,519 |       5,568 |
| comprehension  |    16,565 |                13,432 |    16,936 |              12,158 |      10,998 |
| coupling       |    13,617 |                10,759 |    13,988 |               9,528 |       8,583 |
| documentation  |    15,121 |                11,614 |    15,539 |              10,063 |       9,006 |
| error-handling |    12,971 |                 9,691 |    13,389 |               8,160 |       7,129 |
| i18n           |    17,384 |                13,588 |    17,773 |               9,691 |       8,361 |
| migrations     |    20,324 |                13,799 |    20,695 |              10,284 |       9,095 |
| observability  |    18,881 |                12,470 |    19,252 |               8,917 |       7,890 |
| performance    |    12,307 |                 9,229 |    12,678 |               8,013 |       7,084 |
| privacy        |    13,434 |                10,084 |    13,813 |               7,122 |       6,017 |
| security       |    13,338 |                 9,724 |    13,709 |               6,758 |       5,554 |
| testability    |     8,904 |                 6,705 |     9,322 |               5,015 |       4,418 |
| **total**      |   188,978 |               141,332 |   194,015 |             112,975 |  **99,391** |

HEAD is after the GATE 2 fix round, whose authoring-rule paragraph adds 371 B to each file, inside the intro (section
9). In the first round the HEAD file column totalled 189,192 B and the intro-kept column 108,152 B; the shipped column
did not move. The CLI's own summary line agrees: `194015 B of griller files, 99391 B printed`; its whole stdout is
102,417 B.

| context                          | 6.62.0                | 6.63.0              |
| -------------------------------- | --------------------- | ------------------- |
| full `/pharn-grill` griller text | 141,332               | 99,391 (−29.7%)     |
| plus the scan section (mean)     | 0                     | +611 here, +751 (1) |
| `/pharn-dev-grill`               | 188,978 (whole files) | 99,391 (−47.4%)     |

(1) Section 4, `pharn-starter`.

**Against the plan.** The plan's simulation gave 99,436 B. The shipped edits differ from it in two places. The
inserted heading text is 21 B shorter in each presence griller (−84 B). The moved sentences' final wording adds 26 B in
i18n and 13 B in privacy. Net −45 B. The six edits add 214 B to the files (planned 258 B).

## 2. Where the 6.60.0 extract's bytes were (base, 141,332 B)

| section                                  |  bytes | share |
| ---------------------------------------- | -----: | ----: |
| `## Procedure`                           | 28,891 | 20.4% |
| preamble (the `#` title and its prose)   | 28,750 | 20.3% |
| `### Layer 2`                            | 23,116 | 16.4% |
| `### Layer 1`                            | 22,444 | 15.9% |
| `## Finding output`                      | 13,860 |  9.8% |
| `## The two layers` (intro)              |  8,761 |  6.2% |
| `## What it enforces`                    |  6,713 |  4.7% |
| frontmatter                              |  4,753 |  3.4% |
| `## Distinct from the documentation ...` |  2,109 |  1.5% |

The plan read `## Finding output` as 13,873 B; this sectioner, which tracks fences by opener and closer, reads 13,860 B.

## 3. Per-griller audit (base sections; HEAD restatement)

| griller        | intro | `### Layer 1` | `## Finding output` | `rule_id` / `severity` in Procedure | `### Presence` kept |
| -------------- | ----: | ------------: | ------------------: | ----------------------------------- | ------------------- |
| a11y           |   688 |         1,719 |               1,074 | P7 / important — both               | yes                 |
| architecture   |   580 |           497 |               1,072 | P3 / important — both               | —                   |
| comprehension  |   789 |           513 |               1,132 | P7 / important — both               | —                   |
| coupling       |   574 |           705 |                 897 | P3 / important — both               | —                   |
| documentation  |   686 |         1,472 |               1,073 | P7 / important — both               | yes                 |
| error-handling |   660 |         1,408 |               1,072 | P7 / important — both               | yes                 |
| i18n           |   959 |         3,568 |               1,071 | P7 / important — both               | —                   |
| migrations     |   818 |         2,799 |               1,087 | P7 / important — both               | —                   |
| observability  |   656 |         2,842 |               1,082 | P6 / important — both               | —                   |
| performance    |   558 |           507 |               1,080 | P7 / important — both               | —                   |
| privacy        |   734 |         2,503 |               1,082 | P2 / important — both               | —                   |
| security       |   833 |         2,257 |               1,080 | P2 / important — both               | —                   |
| testability    |   226 |         1,654 |               1,058 | P1 / important — both               | yes                 |
| **total**      | 8,761 |        22,444 |              13,860 | 13 of 13                            | 4 of 4              |

What each section holds, paragraph by paragraph, is the plan's audit (`PLAN.md`, "Per-griller content audit"). The
restatement columns are pinned by `griller-extract.test.mjs` (★ LOSSLESS), which certifies agreement, not correctness
(L43).

## 4. The scan section a full grill now adds

`renderScanSection` over every committed `PLAN.md`, with the 6.63.0 wording (shorter than 6.62.0's, which the plan
measured at mean 678 / median 627 / max 1,881 here and mean 819 in `pharn-starter`):

| corpus          | plans | refused | mean | median |   max |
| --------------- | ----: | ------: | ---: | -----: | ----: |
| this repo       |   290 |       0 |  611 |    559 | 1,813 |
| `pharn-starter` |   128 |       0 |  751 |    696 | 1,462 |

## 5. The heading rule against markdown-it, on the SHIPPED code (L55/L56)

Scratch probe `.pharn/pharn-dev-build/probe-shipped.mjs` (not committed, as at 6.60.0), markdown-it 15.0.1 (a
transitive devDependency). The reference keeps a markdown-it heading token whose level and text match a member the
griller's kind admits, from that heading to the next heading token of any level. The two outputs are diffed line by
line; blank lines are ignored.

- **The 13 committed grillers:** every one `deep: true`; 0 over-dropped, 0 under-dropped non-blank lines.
- **20 adversarial inputs** (the plan's 19, plus the same chain under `kind: community`):
  - 0 over-drops (a line markdown-it keeps and the shipped rule drops).
  - Under-drops (kept, the safe direction) only where the plan said: an indented `###`, a list-item `###`, a
    blockquote `###`, and the text after a `---` thematic break inside `### Layer 1`.
  - The `community` case left out only `## Guarantee audit` and matched the reference exactly.

## 6. Mutation controls (L60)

Scratch runner `.pharn/pharn-dev-build/mutants.mjs`. Each mutant ran in a throwaway copy of `pharn/floor/` and the
grillers under `.pharn/pharn-dev-build/mut/`, deleted after its run. Both unmutated baselines passed.

| mutant                                              | killed by (named test, first listed)                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| level check off                                     | ★ START is level-exact                                                                                 |
| an indented `###` accepted                          | ★ START is level-exact                                                                                 |
| the `layer-1` prefix widened to `Layer`             | the closed-set test; ★ GATE-1 CLOSURE; ★ LOSSLESS moved sentences; 5 more                              |
| END ignoring `###`                                  | the section ends at any ATX heading; ★ GATE-1 CLOSURE; ★ LOSSLESS presence; 3 more                     |
| `### Presence` dropped (a11y)                       | ★ LOSSLESS: the four presence grillers keep their `### Presence` section                               |
| a Finding-output `rule_id` changed (security)       | ★ LOSSLESS: each griller's Finding-output `rule_id` and `severity` are restated in its Procedure       |
| fence tracking off for `###`                        | ★ an omitted heading inside a backtick or tilde fence is content                                       |
| the kind check forced true                          | ★ kind gate — community (and every other reason fixture); ★ CLI over a pharn-owned and a community one |
| the kind check forced false                         | ★ GATE-1 CLOSURE (and 34 more)                                                                         |
| the last of two `kind:` lines taken                 | ★ kind gate — two kind lines (both fixtures); the closed reason-set tests                              |
| the kind compared case-insensitively                | ★ kind gate — case differs                                                                             |
| `GRILL_SCANS` pii `rule_id` drifted (grill finding) | ★ each scanner finding carries the `rule_id` and `severity` its griller's Procedure assigns            |

The command pins in `.dev/floor/command-hygiene.test.mjs` carry their own removal controls inside each test.

## 7. Selection record (measured and rejected at GATE 1)

Findings are counted by a heading heuristic over committed full-mode `GRILL.md` files: a `FINDING` under a `##`–`####`
heading naming the axis. It is a lower bound, and a heading naming two axes credits both. `## Files` paths come from
`pathsFromPlanFiles` (L69); a plan whose entries are not all concrete paths skips nothing (L71). Corpora: 227 full
grills here (226 when planned, plus this feature's own `GRILL.md`) and 110 in `pharn-starter`.

- **A, archetype at run time.**
  - In all five installs (phargus-web `ssr`, phargus `lib`, pharn-ci `lib`, pharn-starter `ssr, backend`, pharn-web
    `ssr`) it skips no installed griller: 0 B. The installer already selected by archetype.
  - In this repo, which records no archetypes, as `lib`: −28.2%. It would lose 15 migrations findings on 11 plans, and
    2 i18n findings on 1 plan (`ac-tests-agreement`, under a `Security / i18n` heading).
- **B, `## Files` path classes** (UI class strict = UI file extensions; wide = also UI directories; script = any JS/TS):

  | corpus          | class  | mean saving | lost findings                          | a11y skips, lost | a11y mean saving |
  | --------------- | ------ | ----------: | -------------------------------------- | ---------------- | ---------------: |
  | this repo       | strict |       25.9% | migrations 14 on 10 plans; i18n 2 on 1 | 210, 0           |            8.20% |
  | this repo       | wide   |       25.6% | migrations 14 on 10 plans; i18n 2 on 1 | 207, 0           |            8.08% |
  | this repo       | script |       12.6% | migrations 14 on 10 plans              | 45, 0            |            1.76% |
  | `pharn-starter` | strict |        7.2% | i18n 1 on 1                            | 30, 0            |            2.42% |
  | `pharn-starter` | wide   |        5.4% | i18n 1 on 1                            | 18, 0            |            1.45% |
  | `pharn-starter` | script |        3.0% | none                                   | 3, 0             |            0.24% |

  This repo's a11y row is not a real case: a `lib` install has no a11y griller.

- **C, A then B.** In every install A skips nothing, so C is B (`measure.mjs` computes this: `reducesToB: true`).
- **D, one subagent per griller.** A fresh `general-purpose` subagent's first request cache-wrote 68,223–129,646 tokens
  over 29 agents in this repo (`.dev/measurements/pipeline-performance-audit-2026-09-29.md`). 13 × 68,223 ≥ 886,899
  prefix tokens, against about 35,333 tokens of griller text (141,332 B / 4). Estimate.

**Correction to the plan's record.** The plan named the i18n loss under B in `pharn-starter` only. This repo loses 2
i18n findings on 1 plan under the strict and wide classes too. The rejection stands, and gains a case.

## 8. Token effect (estimated, not measured)

−41,941 B of griller text ≈ 10.5k tokens fewer on each request after the load (bytes / 4, `LIMITS.md §1c`). No grill
run is measured here.

## Named follow-ups

- `migrations-applies-universal` (GATE 1: a separate increment). The evidence is section 7, A: 15 migrations-axis
  findings on 11 of this repo's plans, where a `lib` install has no migrations griller.
- `griller-body-slim`: the preamble (20.3%) and the Layer-2 "REJECTED floor candidate" blockquotes are maintainer
  rationale too. Deciding what a grill does not need there is a per-griller reading, like this one.
- `pharn/ARCHITECTURE.md` §5's archetype wording no longer matches the live tree (detection is the installer's).
  Human-only, pre-existing.
- From this feature's `GRILL.md` (for GATE 2): the convention this omission relies on — grill-time guidance never sits
  under the three headings in a `pharn-owned` griller — is declared in the extract's header and pinned over the 13
  committed grillers only; nothing a griller author reads states it. **Built in the GATE 2 fix round (F1, section 9).**
- Deferred at GATE 2 (`REVIEW.md` findings 4–7, named in `PLAN.md`): `scan-section-findings-heading`,
  `dev-grill-floor-list`, the "(Layer 1)" wording with `griller-body-slim`, `extract-form-eval`, and
  `walkers-skip-pharn-scratch` (`count-grillers.mjs` and `validate.mjs` count griller copies left under `.pharn/`).

## 9. GATE 2 fix round (F1–F3)

Re-measured after the fix round's build with the same `measure.mjs` command (it now also prints the F1 check).

### F1 — the authoring rule in all 13 grillers, at 0 grill bytes

- **The paragraph** ("**Not loaded by a full grill.** …", the plan's exact text) is the last paragraph of each
  griller's `## The two layers` intro, just above `### Layer 1`.
- **Files:** 371 B each, 4,823 B in all. The 13 grillers go from 189,192 B to **194,015 B**, the plan's figure.
- **The extract does not move:** `measure.mjs` reports `extractSameWithoutRule` = 1 for 13 of 13 grillers. The
  extract's frame lines are byte-identical to the first round's (`cmp` of everything after the summary line), and it
  prints 99,391 B as before. Only the summary line's file total changes (189192 → 194015).
- **Pins** (`griller-extract.test.mjs`, ★ AUTHORING RULE): every committed `pharn-owned` griller carries the
  paragraph in its intro and never in the extract; the paragraph names every `OMITTED_SECTIONS` member's heading;
  controls for a missing paragraph, one moved under `## Procedure` (RED twice) and a `community` griller (exempt).

### F2 — the whole-word heading match

`omittedId` now requires the character after a member's prefix to be the end of the text, a space or a tab. The 65
committed omitted headings all continue with a space, so no committed griller's extract changes.

| heading                         | first round (prefix match) | fix round (whole word) |
| ------------------------------- | -------------------------- | ---------------------- |
| `### Layer 10 — x`              | dropped                    | kept                   |
| `### Layer 1.5 — x`             | dropped                    | kept                   |
| `## Finding outputs (x)`        | dropped                    | kept                   |
| `## The two layersets`          | dropped                    | kept                   |
| `## Guarantee auditing`         | dropped (6.60.0 member)    | kept                   |
| `## Machine-readable emissions` | dropped (6.60.0 member)    | kept                   |
| `## Guarantee audit: x`         | dropped                    | kept                   |

Every real form is dropped in both rounds: `### Layer 1`, `### Layer 1 — x`, `### Layer 1` followed by a tab, `### Layer 1`
followed by a trailing space, `## Finding output (x)`, `## The two layers (P0)`, `## Guarantee audit (P0)`,
`## Machine-readable emission (…)`, and `### Layer 1` as the file's last line. The "first round" column comes from the
re-probe below run on the `89640b5` rule.

### The markdown-it re-probe, with a reference that does not share the rule's predicate

Scratch `.pharn/pharn-dev-build/probe-fix.mjs` (not committed), markdown-it 15.0.1.

- **Committed grillers.** The reference drops a markdown-it heading token only when `#`×level, a space and its
  inline text are byte-EQUAL to an entry of the literal list below (13 × 5 = 65, asserted in the probe). Each section
  runs to the next heading token. Result: each griller matched exactly 5 entries, and the shipped extract's non-blank
  lines equal the reference's for 13 of 13.
- **29 adversarial inputs, each with a hand-written oracle** (the heading lines that start a dropped section, and the
  non-blank lines that must remain): the 19 earlier cases, the same chain under `kind: community`, the seven
  near-misses, and two real forms (a tab after the prefix; the text ending at the prefix). For each case the shipped
  rule's kept lines are compared with the oracle; markdown-it is asked whether each oracle heading is a heading token
  and where its section ends.
  - Shipped rule vs oracle: **29 of 29 match.**
  - Every oracle heading is a markdown-it heading token, and markdown-it's section ends agree with the oracle in 29 of
    29, counting the one documented extra: after a `---` thematic break inside `### Layer 1`, the rule keeps `---`
    and the text after it, where a renderer's section runs on (the safe direction). The indented, list-item and
    blockquote `###` cases are kept by the oracle by design (a renderer would show them as headings).
  - **The reference discriminates:** run on the first-round rule (`89640b5`), the same probe flags all seven
    near-misses and nothing else.

The literal list (each griller's five omitted headings, as committed):

| griller        | `## The two layers …`                                                               | `### Layer 1 …`                                                                                       |
| -------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| a11y           | (P0) — honestly sized: PRESENCE-check floor + a substantial advisory bulk           | — FLOOR: griller MEMBERSHIP + the fixture-pinned present/absent OUTPUT                                |
| architecture   | (P0) — honestly sized: this griller is LARGELY ADVISORY                             | — FLOOR: griller MEMBERSHIP only (the whole runtime guarantee)                                        |
| comprehension  | (P0) — honestly sized: this griller is LARGELY ADVISORY (architecture-shaped)       | — FLOOR: griller MEMBERSHIP only (the whole runtime guarantee)                                        |
| coupling       | (P0) — honestly sized: this griller is LARGELY ADVISORY (architecture-shaped)       | — FLOOR: griller MEMBERSHIP only (the whole runtime guarantee)                                        |
| documentation  | (P0) — honestly sized: PRESENCE-check floor + a substantial advisory bulk           | — FLOOR: griller MEMBERSHIP + the fixture-pinned present/absent OUTPUT                                |
| error-handling | (P0) — honestly sized: PRESENCE-check floor + a substantial advisory bulk           | — FLOOR: griller MEMBERSHIP + the fixture-pinned present/absent OUTPUT                                |
| i18n           | (P0) — honestly sized: a REAL PARTIAL FLOOR + a substantial advisory bulk           | — FLOOR: griller MEMBERSHIP + deterministic HARDCODED-STRING detection                                |
| migrations     | (P0) — honestly sized: a PARTIAL floor, mirroring OBSERVABILITY (inverted polarity) | — FLOOR: griller MEMBERSHIP + a deterministic vocabulary-PRESENCE scanner (used as ADVISORY evidence) |
| observability  | (P0) — honestly sized: a PARTIAL floor, sized BETWEEN architecture and security     | — FLOOR: griller MEMBERSHIP + a deterministic vocabulary-PRESENCE scanner (used as ADVISORY evidence) |
| performance    | (P0) — honestly sized: this griller is LARGELY ADVISORY                             | — FLOOR: griller MEMBERSHIP only (the whole runtime guarantee)                                        |
| privacy        | (P0) — honestly sized: a REAL PARTIAL FLOOR + a substantial advisory bulk           | — FLOOR: griller MEMBERSHIP + deterministic PII-PATTERN detection                                     |
| security       | (P0) — honestly sized: a REAL PARTIAL FLOOR + a substantial advisory bulk           | — FLOOR: griller MEMBERSHIP + deterministic SECRET-LITERAL detection                                  |
| testability    | (P0 — the split every griller inherits)                                             | — FLOOR-demonstrable: is a verification approach PRESENT? (over the plan's structure)                 |

Every griller's other three entries: `## Finding output (dogfoods fix #1 — the enum-gated / free-text split)`,
``## Machine-readable emission (`findings.json`)`` and `## Guarantee audit (P0) — the honest split` followed by:

| griller        | `## Guarantee audit (P0) — the honest split` …          |
| -------------- | ------------------------------------------------------- |
| a11y           | (a PRESENCE-check floor, documentation-shaped)          |
| architecture   | (architecture is LARGELY ADVISORY)                      |
| comprehension  | (LARGELY ADVISORY; the disease is worst to commit HERE) |
| coupling       | (coupling is LARGELY ADVISORY)                          |
| documentation  | (a PRESENCE-check floor, error-handling-shaped)         |
| error-handling | (a PRESENCE-check floor, testability-shaped)            |
| i18n           | (a REAL PARTIAL FLOOR, security-shaped)                 |
| migrations     | (a PARTIAL floor; ALL findings advisory)                |
| observability  | (a PARTIAL floor; ALL findings advisory)                |
| performance    | (performance is LARGELY ADVISORY)                       |
| privacy        | (a REAL PARTIAL FLOOR)                                  |
| security       | (a REAL PARTIAL FLOOR)                                  |
| testability    | (nothing after "split")                                 |

### Fix-round mutation controls (L60)

Scratch `.pharn/pharn-dev-build/mutants-fix.mjs`, each in a throwaway copy, deleted after its run; the unmutated
baseline passed.

| mutant                                                 | killed by                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| the boundary removed (prefix match again)              | ★ START matches the prefix as a whole word (F2)                                   |
| the boundary accepting any non-letter                  | ★ START matches the prefix as a whole word (F2)                                   |
| the authoring rule dropped from one griller (security) | ★ AUTHORING RULE: every committed pharn-owned griller states it in its intro (F1) |

With the first round's 12, fifteen mutants in all, each killed by a named test.

### F3

The two CHANGELOG phrasings are corrected in the unmerged `[6.63.0]` entry, and its "Measured", "Checked by" and "Not
covered" restatements are re-derived (L64). Nothing to measure.
