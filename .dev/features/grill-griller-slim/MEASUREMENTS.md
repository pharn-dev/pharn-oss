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
| a11y           |    16,106 |                12,520 |    16,153 |              10,376 |       9,688 |
| architecture   |    10,026 |                 7,717 |    10,026 |               6,148 |       5,568 |
| comprehension  |    16,565 |                13,432 |    16,565 |              11,787 |      10,998 |
| coupling       |    13,617 |                10,759 |    13,617 |               9,157 |       8,583 |
| documentation  |    15,121 |                11,614 |    15,168 |               9,692 |       9,006 |
| error-handling |    12,971 |                 9,691 |    13,018 |               7,789 |       7,129 |
| i18n           |    17,384 |                13,588 |    17,402 |               9,320 |       8,361 |
| migrations     |    20,324 |                13,799 |    20,324 |               9,913 |       9,095 |
| observability  |    18,881 |                12,470 |    18,881 |               8,546 |       7,890 |
| performance    |    12,307 |                 9,229 |    12,307 |               7,642 |       7,084 |
| privacy        |    13,434 |                10,084 |    13,442 |               6,751 |       6,017 |
| security       |    13,338 |                 9,724 |    13,338 |               6,387 |       5,554 |
| testability    |     8,904 |                 6,705 |     8,951 |               4,644 |       4,418 |
| **total**      |   188,978 |               141,332 |   189,192 |             108,152 |  **99,391** |

The CLI's own summary line agrees: `189192 B of griller files, 99391 B printed`; its whole stdout is 102,417 B.

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
  committed grillers only; nothing a griller author reads states it.
