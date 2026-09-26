# Token cost of one delivered feature — measured, 2026-07-22 → 2026-08-18

**Status:** measurement record. Apparatus-only (`.dev/`), no product surface touched, no `SKILLS_VERSION` bump.
**Raw data:** `.dev/measurements/token-cost-2026-08-18.json` (every number below recomputes from it).
**Register:** this file follows `LIMITS.md` — what is measured is stated, what is not is named and bounded.

`LIMITS.md §1c` says the real number is the measured runtime cost. `LIMITS.md §3` names four cost drivers
without quantifying any. This puts numbers on the two that observational data can separate, and says plainly
that the other two cannot be separated from it.

---

## 0. What was measured, and what "cost" means here

|            |                                                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | Claude Code session transcripts (JSONL), `~/.claude/projects/-Users-pgalarowicz-Projects-pharn-oss` — **this repo's session directory only** |
| Window     | 2026-07-22T14:10:12Z → 2026-08-18T08:18:24Z (**26.8 days**)                                                                                  |
| Volume     | 325 transcript files (65 top-level sessions + 260 nested subagent/workflow), **6,882 deduped API requests**                                  |
| Extraction | numeric usage fields, ISO timestamps, and enum/identifier fields only — **no message content read into the extract or either output file**   |

**"Cost" throughout means API list-price equivalent, not money anybody was billed.** These runs went through
Claude Code; if that was a subscription, no such invoice exists. The figure answers the question §4 actually
asks — _what would this pipeline cost a user running it on their own key_ — and is labelled that way everywhere.

Prices (`claude-api` skill, cached 2026-06-24): Opus 5 and Opus 4.8 $5/$25 per MTok, Sonnet 5 **$2/$10**
(intro rate, valid through 2026-08-31, which covers the entire window; standard is $3/$15), Fable 5 $10/$50.
Cache multipliers: read **0.1×**, 5-minute write **1.25×**, **1-hour write 2.0×**.

### Three extraction traps, each of which would have silently corrupted every number

1. **Record duplication — 2.34×.** 16,092 assistant records carry only **6,882 distinct `requestId`s**; one API
   response is written to the transcript as several lines, each repeating the _same_ usage object. Verified: every
   requestId maps to exactly one distinct usage object. In a single session, raw vs deduped output tokens were
   **545,389 vs 235,763**. All figures here dedup on `requestId`.
2. **Subagent transcripts are stored disjointly.** Nested-file requestIds ∩ parent-file requestIds = **0**. In one
   session the parent held 162 requests and its children **582**. Excluding nested files would make fan-out
   invisible; they are included.
3. **`iterations[]` does not double-count.** Length distribution is `{0, 1}` only — top-level usage is authoritative.

> **2026-09-26 — traps 1 and 2 no longer describe current transcripts. The measurement above is unchanged, and it
> was true of its corpus.** The lines of one request can now carry DIFFERENT usage. An early line can record fewer
> output tokens than the last one (8, 8, 163), and a request can be re-appended with its counts zeroed. A forked
> subagent's transcript can also open with a copy of a parent line, so nested-file and parent-file request ids
> intersect. Deduplication is still load-bearing; which line counts changed in 6.22.1. See
> [`cost-dedup-usage-2026-09-26.md`](./cost-dedup-usage-2026-09-26.md).

---

## 1. Cost per delivered feature

**Total across the window: $936.79** over 6,882 requests. Token totals, cached and uncached kept separate —
never blended:

| Token class                      |            Tokens | Share of input | Rate        |
| -------------------------------- | ----------------: | -------------: | ----------- |
| `input_tokens` (fresh, uncached) |        **13,689** |         0.001% | 1.0×        |
| `cache_creation` 1-hour          |        21,905,542 |           1.9% | 2.0×        |
| `cache_creation` 5-minute        |        19,184,949 |           1.7% | 1.25×       |
| `cache_read`                     | **1,111,463,431** |      **96.4%** | 0.1×        |
| `output_tokens`                  |         4,720,778 |              — | output rate |
| _of which thinking_              |         _356,677_ |                |             |

Fresh uncached input is **one thousandth of one percent** of input volume. Any total that summed cache reads at
full input price would have been wrong by **5.74×** (§4 quantifies this).

### The 23-feature sample

26 transcript branches join by exact name to a merged PR. **3 are excluded** from the headline regression by a
pre-declared coverage rule: fewer than 10 attributed requests. The rule is not tuned — the observed distribution
runs 5, 6, 7 then jumps to 25, so **any threshold in (7, 25] selects the same three**. Excluded and named:
**#125** `fix/f4-guard-fail-closed` (7 requests, 749 lines, $1.59), **#126** `fix/line-ending-drift-and-regress-scope`
(5 requests, 1,573 lines, $1.43), **#117** `feat/product-memory-promote` (6 requests, 2,613 lines, $0.60). A
2,613-line feature was not delivered in six API requests; these are partial transcripts, not cheap features.
Counting them would have manufactured a "large change, near-zero cost" point that the data does not support.

**Included: 23 features, $571.95, mean $24.87, median $17.59.**

| PR                                        |     $ | requests | churn (lines) | files |     $/line |
| ----------------------------------------- | ----: | -------: | ------------: | ----: | ---------: |
| #116 `loop-handoff`                       | 90.99 |      777 |         2,333 |    16 |     0.0390 |
| #115 `feat/lessons-index`                 | 65.14 |      215 |         3,772 |    47 |     0.0173 |
| #127 `fix/f6-spec-id-agreement`           | 47.86 |      413 |           558 |     6 |     0.0858 |
| #128 `fix/trusted-doc-accuracy`           | 45.13 |      350 |         1,529 |    20 |     0.0295 |
| #120 `fix/f3-guard-self-protection`       | 34.74 |      174 |         1,366 |    18 |     0.0254 |
| #124 `fix/f4-trusted-doc-exact-match`     | 32.34 |      304 |           686 |     6 |     0.0471 |
| #141 `feat/retro-tag-legacy-lessons`      | 27.95 |      150 |         1,277 |    17 |     0.0219 |
| #140 `feat/observability-code-side-limit` | 24.68 |      125 |           902 |    15 |     0.0274 |
| #121 `fix/f1-floor-ref-relocation`        | 24.52 |      155 |         1,890 |   147 |     0.0130 |
| #123 `fix/f2-relocate-scan-plan`          | 23.33 |      105 |           864 |    49 |     0.0270 |
| #109 `readme-current-state`               | 19.10 |      126 |         1,770 |    17 |     0.0108 |
| #119 `feat/product-capability-catalog`    | 17.59 |      104 |           820 |    12 |     0.0214 |
| #110 `chore/floor-selfpath-correction`    | 16.33 |      110 |         1,128 |    69 |     0.0145 |
| #114 `typed-lessons`                      | 15.96 |      104 |         1,442 |    14 |     0.0111 |
| #113 `feat/applied-lessons`               | 15.90 |      102 |         1,365 |    18 |     0.0116 |
| #111 `chore/floor-selfheader-prefix`      | 14.62 |       95 |           844 |    22 |     0.0173 |
| #101 `docs/capability-catalog`            | 12.96 |       71 |         2,183 |    55 |     0.0059 |
| #99 `feat/ship-attestation`               | 12.09 |       61 |           828 |    15 |     0.0146 |
| #100 `docs/attestation-cannot-stall-loop` |  9.95 |       48 |            55 |     6 |     0.1808 |
| #129 `fix/f10-features-readme`            |  8.59 |       68 |           604 |    10 |     0.0142 |
| #138 `fix/f14-review-sources`             |  4.85 |       76 |           444 |    12 |     0.0109 |
| #135 `fix/f8-package-private`             |  3.75 |       76 |           353 |     9 |     0.0106 |
| #98 `docs/readme-tagline-record`          |  3.58 |       25 |         **2** |     1 | **1.7906** |

Per-feature cached/uncached splits are in the JSON (`features[].tok`), one row per feature.

### How a feature was attributed, and the error bar

`gitBranch` is recorded on every record. Feature = _records on that branch_ + _`main` records from sessions whose
sole feature branch is that branch_ (the plan stage runs on `main` before the branch is cut). 23 of 26 mixed
sessions touch exactly one feature branch, so the rule is unambiguous for them.

**Unattributed: $138.93 (15% of the window).** That is `main`-branch cost in sessions that never touched a feature
branch — $132.60 of it ran `/pharn-dev-*` stages, $6.33 was ad-hoc. Three sessions touch more than one feature
branch; their `main` portion is left unattributed rather than split on a guess. Seven transcript branches have no
matching PR head ref (renamed or rebased before merge, e.g. `fix/f9-version-story`) and are outside the sample.

---

## 2. Per-stage breakdown

`attributionSkill` names the stage on the record — **recorded, not inferred by me**. It covers 2,822 of 6,882
deduped requests; the rest is work not run inside a `/pharn-dev-*` skill (this is not a CLI-version artifact —
tagged and untagged records appear on every date in the window).

| Stage                      |      $ | requests | cache-read | cache-write | output | read:write | model mix (requests)                                  |
| -------------------------- | -----: | -------: | ---------: | ----------: | -----: | ---------: | ----------------------------------------------------- |
| _(untagged)_               | 497.92 |    4,060 |    539.7 M |     26.44 M | 1.85 M |     20.4:1 | opus-5 3844 · opus-4-8 110 · sonnet-5 92 · fable-5 14 |
| `pharn-dev-ship`           | 102.40 |      615 |     93.3 M |      3.94 M |  782 K |     23.7:1 | opus-5 604 · sonnet-5 9 · opus-4-8 2                  |
| `pharn-dev-build`          |  95.47 |      580 |    131.4 M |      2.15 M |  610 K |     61.1:1 | opus-5 456 · sonnet-5 72 · opus-4-8 52                |
| `pharn-dev-review`         |  59.74 |      282 |    101.8 M |      2.08 M |  305 K |     48.9:1 | opus-5 153 · sonnet-5 104 · opus-4-8 25               |
| `pharn-dev-plan`           |  54.46 |      388 |     51.5 M |      2.99 M |  452 K |     17.2:1 | opus-5 251 · sonnet-5 117 · opus-4-8 20               |
| `pharn-dev-regress`        |  46.97 |      347 |     91.0 M |      0.54 M |  263 K |    168.8:1 | opus-5 203 · sonnet-5 114 · opus-4-8 30               |
| `pharn-dev-grill`          |  43.14 |      397 |     43.5 M |      2.22 M |  308 K |     19.6:1 | opus-5 361 · sonnet-5 27 · opus-4-8 9                 |
| `pharn-dev-verify`         |  24.53 |      154 |     41.4 M |      0.58 M |   79 K |     71.4:1 | opus-5 101 · sonnet-5 40 · opus-4-8 13                |
| `pharn-dev-memory-promote` |   9.91 |       47 |     15.9 M |      0.08 M |   45 K |    192.1:1 | opus-5 47                                             |

There is no `spec` row: `/pharn-dev-*` has no spec stage (that is the product pipeline). `ship` leads the tagged
stages because it orchestrates the others and its own turns are attributed to it.

### The model routing in `pharn.config.json` did not bind

CLAUDE.md already labels the config↔runtime binding advisory — `check-config.mjs` checks config↔frontmatter
agreement, _not_ that a stage ran under that model. This measures the gap:

| Stage    | config says | actually ran                                   |
| -------- | ----------- | ---------------------------------------------- |
| `build`  | `sonnet`    | **opus-5 456 (79%)**, sonnet-5 72, opus-4-8 52 |
| `plan`   | `opus`      | opus-5 251 (65%), sonnet-5 117, opus-4-8 20    |
| `review` | `opus`      | opus-5 153 (54%), sonnet-5 104, opus-4-8 25    |

`build` is configured for Sonnet and ran Opus 79% of the time, at 2.5× the input rate and 2.5× the output rate.
This is a **measured confirmation of a limit the repo already declares**, not a new defect — but it means
per-stage model config currently has no effect on the bill.

---

## 3. §3a — fan-out cost vs change size: **partly refuted, partly confirmed**

`LIMITS.md §3a` claims cost scales with fan-out breadth **not** change size, and that small changes are
disproportionately expensive. The two halves do not fare the same.

**Refuted half — the two are not decoupled.** Across the 23-feature sample, cost and lines-changed are
**correlated**: Pearson **r = 0.639 (r² = 0.409)**, Spearman **ρ = 0.597**. Change size explains ~41% of cost
variance. Fitting `usd = a + b·churn` gives **$6.21 + $0.0159/line**, and the size-proportional term accounts for
**75% of total feature spend** ($429.20 of $571.95) against 25% fixed. Change size is the _larger_ term, not the
ignorable one.

_The coverage filter moved this number against the repo's claim, not toward it:_ unfiltered, r = 0.486 / ρ = 0.331.
Both are reported (`regression.unfiltered` in the JSON). Excluding the three partial transcripts **strengthened**
the correlation, which is what should happen if those rows were missing data rather than cheap features.

**Confirmed half — small changes are disproportionately expensive per unit of change.** Comparing quartiles of the
included sample:

|                         |  mean churn | mean cost | mean $/line |
| ----------------------- | ----------: | --------: | ----------: |
| smallest quartile (n=6) |   336 lines |    $13.10 | **$0.3488** |
| largest quartile (n=6)  | 2,246 lines |    $42.97 | **$0.0192** |

**6.7× the change for 3.28× the cost — the smallest features cost 18.1× more per line.** The floor is not a fitted
artifact; it is directly observed: **PR #98 changed one line of README prose and cost $3.58 across 25 API
requests.** PR #100 (55 lines) cost $9.95. That is the fan-out floor, measured.

**The honest bound on this section.** Correlation is not the causal claim §3a makes. r² = 0.41 leaves 59% of
variance unexplained, and I cannot attribute that residual to fan-out breadth specifically — larger features may
cost more because they took more iterations, not because breadth scaled with them. Lines-changed is also a proxy
for "change size" that a markdown-heavy repo strains: `files changed` correlates with cost essentially **not at
all (r = 0.055)**. What the data supports is the _shape_: **a real per-feature floor of a few dollars, plus a
size-proportional term that dominates in aggregate.**

---

## 4. §3b — rule overlap × stages: the repetition is real and **prompt caching already absorbed it**

§3b's mechanism is confirmed at scale: **1.111 billion cache-read tokens against 41.1 million cache-write tokens
— a 27:1 ratio.** The same content is re-sent across stages constantly, exactly as claimed.

**But it is billed at 0.1×, and that changes the conclusion entirely:**

|                                 |                                                             |
| ------------------------------- | ----------------------------------------------------------: |
| Actual (cache-priced)           |                                                 **$936.79** |
| Same tokens at full input price |                                               **$5,375.48** |
| **Absorbed by prompt caching**  | **$4,438.68 — 82.6% of the un-cached bill (5.74× avoided)** |

On the sub-claim _"each fresh sub-agent re-pays"_ — directionally true, quantitatively small:

|                          | requests | cache-read | cache-write | read:write |      $ |
| ------------------------ | -------: | ---------: | ----------: | ---------: | -----: |
| nested (subagents)       |    2,861 |    180.1 M |     17.81 M | **10.1:1** | 203.22 |
| top-level (main session) |    4,021 |    931.3 M |     23.28 M | **40.0:1** | 733.58 |

Subagents re-pay ~4× more write per read than the main session — the re-payment §3b predicts is visible — but even
subagents read 10× more than they write. **The tax exists; the cache eats most of it.**

**Bound, stated:** I did **not** measure how many times a _named rule file_ (`security.md`) was re-sent. That needs
content inspection, which the scope rules forbid and which would be unreliable anyway. What is measured is
re-paid-fresh versus absorbed volume — the claim's substance, not its literal per-file count. Also: the nested
transcripts in this window are `Workflow`-tool subagents, **not** the `/pharn-dev-review` lens fan-out, which runs
inline in the main session. The subagent row above does not describe PHARN's own lens fan-out.

---

## 5. §3c and §3d — not measurable from this data

**§3c cold-start cliff — not measurable, and the API-cache reading of it is near-zero.** **0 of 50 sessions had a
truly cold first request** (median first-request `cache_read` = 20,729 tokens); the 1-hour cache spans sessions.
The first request of every session totals $20.24 — **2.8%** of top-level cost. But §3c means the _methodology_
cold start — cold seam-record, cold memory, cold baseline, full seam-fallback chain — which requires a first-ever
run on a fresh repo. **No such run is in this data. §3c is unquantified and stays unquantified.**

**§3d trust + traceability tax — not separable.** Constitution re-injection, fencing scaffolding and finding-schema
restatement sit inside the _same cached prefix_ as everything else. Nothing in the usage record distinguishes
those tokens from the rest of the prompt. Isolating them needs a controlled A/B (same task, fence on/off), not
observational records. **Not measured. No number is offered.**

---

## 6. The dominant driver

Of the four, **§3b is the largest raw force and §3a is the largest one you still pay for.**

| Driver               | Size                                                                                        | Status                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **§3b rule overlap** | **$4,438.68** of would-be spend                                                             | **Largest by far — already neutralised by prompt caching (82.6% absorbed)** |
| **§3a fan-out**      | **$571.95** feature spend; **$6.21/feature floor**, 18.1× per-line penalty on small changes | **The dominant driver of the bill you actually pay**                        |
| §3c cold start       | 2.8% of top-level cost (API-cache sense only)                                               | Not the driver; methodology sense unmeasured                                |
| §3d trust tax        | —                                                                                           | Not separable                                                               |

**The single most useful number: a delivered feature on this repo costs $24.87 on average ($17.59 median), and a
one-line change costs $3.58.**

---

## 7. Limits

Named and bounded, per `LIMITS.md` register.

1. **These are list-price equivalents, not amounts billed.** If the runs went through a subscription, nobody paid
   this. Every dollar figure is "what this would cost on your own key."
2. **Attribution is approximate, by ~15%.** $138.93 of $936.79 could not be assigned to any feature. Three
   multi-feature sessions were left unattributed rather than split.
3. **The sample is 23 of 126 feature directories.** `.dev/features/` holds 126 records; transcripts on disk cover
   26.8 days. Features built before 2026-07-22 have no recorded runs. **This is not a random sample** — it is the
   most recent month, and the repo's character changed over that month.
4. **Coverage within the sample is uneven.** Three features were excluded for having 5–7 recorded requests against
   749–2,613 changed lines. Others may be _partially_ under-recorded without crossing that threshold; the filter
   catches the obvious cases, not all cases.
5. **`churn` counts PR additions + deletions.** In a markdown methodology repo that is a weak proxy for
   intellectual change size. `files changed` correlates with cost essentially not at all (r = 0.055) — a warning
   that both size proxies are crude.
6. **The $6.21 fixed floor is a fitted intercept — inferred, not measured.** With churn spanning 2→3,772 lines
   over 23 points it is an extrapolation toward zero. The *measured* floor evidence is PR #98 ($3.58 for 2 lines)
   and PR #100 ($9.95 for 55 lines).
7. **r² = 0.409 leaves 59% of cost variance unexplained**, and the residual is **not** attributed to fan-out here.
   Iteration count, task difficulty, and human back-and-forth are uncontrolled.
8. **Sonnet 5 intro pricing applies to the whole window.** At standard $3/$15 the total would be $962.64
   (**+2.8%**). Small because only **8.4%** of requests ran on Sonnet 5 at all (91.4% ran on Opus, whose price is unchanged).
9. **The measurement session is in the data.** This session's own requests fall in the untagged/`main` bucket. The
   extract was frozen at 2026-08-18T08:18:24Z; it grew 6,873→6,882 rows during discovery.
10. **`attributionSkill` covers 41% of requests.** Per-stage figures describe the tagged subset only. The untagged
    bucket mixes non-pipeline work with pipeline work run outside a skill invocation, and 2,771 untagged records
    sit on feature branches — which is exactly why feature attribution keys on `gitBranch`, not on the stage tag.
11. **Not measured:** per-rule-file re-send counts (§3b literal form), methodology cold-start (§3c), trust/
    traceability overhead (§3d), and whether any stage's _quality_ justified its cost.

---

## 8. What this decides — findings, not proposals

### Caching / shared finding-cache — **the bar is not met; the evidence argues against building it**

The gate was "evidence that repeated preamble or overlapping re-review is real volume." The volume is real and
enormous — 1.111 B re-sent tokens, a would-be $5,375 bill. **But prompt caching already absorbs 82.6% of it at
the platform layer, without PHARN building anything.** A bespoke shared finding-cache would be engineering
against a cost that is already discounted ~10×, and would add a cache-coherence surface to a repo whose entire
thesis is that guarantees must reduce to three floor primitives. The residual it could attack — the ~$203 of
subagent traffic and the 3.6% cache-write line — is not worth a new mechanism. **Finding: do not build it.
Revisit only if a workload appears where reads stop dominating** (the nested 10.1:1 ratio is the number to watch).

### Fan-out proportionality — **§3a's severity does not justify automatic breadth-scaling; `quick-mode` is adequate**

The per-line penalty is real (18.1×) and the floor is real ($3.58 for one line). But the *absolute* stake is small:
the entire fixed component across 23 features is **$142.75**, and the median feature is $17.59. Automatic
breadth-scaling by change size would key on `churn`, and `churn` explains only 41% of cost variance while
`files changed` explains ~0 — **the signal an automatic scaler would need is not reliable enough to scale on**,
and mis-scaling means silently skipping a lens, which is a correctness risk, not a cost one. **Finding: a manual
`quick-mode` flag remains the right shape.** The honest improvement is not automation but the observation that a
one-line docs change should not enter the pipeline at all.

### Viable pricing floor — **$25 per feature; $107–$547/month depending on cadence**

| Cadence                                                     | Monthly, own API key (list price) |
| ----------------------------------------------------------- | --------------------------------: |
| 1 delivered feature / week                                  |                         **~$107** |
| 1 delivered feature / workday (22/mo)                       |                         **~$547** |
| This repo's observed all-in pace ($35.01/day, incl. ad-hoc) |                       **~$1,050** |

The middle row is the defensible headline: **a developer shipping a PHARN-built feature every workday pays roughly
$550/month at list price.** The third row is higher because 53% of spend in this window was not inside a measured
pipeline stage at all — a fact worth its own attention, since it means _most of the cost of working in this repo is
not the pipeline_.

---

## 9. Instrumentation — the gap, on both surfaces (not the §4b fallback)

The data was **not** too thin: 23 usable features, so §4b's fallback does not apply and no proposal replaces the
report. One real gap surfaced anyway: three features were unusable because their transcripts were partial, and
`attributionSkill` covers only 41% of requests. Recorded here as two scoped follow-ups. **9a is a proposal to accept or reject; 9b was BUILT in this same
session at the maintainer’s direction** — see the P7 note there, which records that the deferral was
overridden rather than met.

### 9a. Dev surface — `/pharn-dev-ship`

`/pharn-dev-ship` already writes `.dev/features/<name>/SHIP.md` at the one moment a run's boundaries are known:
every stage has completed and the feature name is in hand. A cost block there (per stage: model, requests,
`input_tokens`, `cache_creation` split by TTL, `cache_read`, `output_tokens`) would make cost-per-feature a
_read_ rather than a reconstruction, and would remove limits 2, 4 and 10 above. **The triggering failure is on
record:** three features in this sample could not be measured.

### 9b. Product surface — `/pharn-ship` — BUILT in this same session (`SKILLS_VERSION` 2.7.0)

The dev-side gap is the smaller one, and scoping only to it got the priority backwards. **PHARN's maintainer
already holds the transcripts and can reconstruct cost — this report is the proof. A user running the pipeline
on their own API key is the one actually paying, and had no way to see it at all.** `LIMITS.md` is product
surface, so §3's unquantified cost claims already ship to users; the missing instrument sat on the side of the
person holding the bill.

**This was written up as a deferred proposal and the maintainer rejected the deferral. It is now shipped:**

- **`pharn/floor/render-cost-record.mjs`** — Node stdlib, no network, no model call. Reads the run's own
  session transcript, deduplicates on `requestId`, includes the disjointly-stored subagent transcripts, and
  groups by the platform's `attributionSkill`. It **prints**; the calling command writes (fix #7 gates the
  write, not the render) — the same renderer/caller split `render-ship-briefing.mjs` uses.
- **`/pharn-ship` Step 3b** renders the block and embeds it in `features/<name>/ship-record.json` **before**
  any attestation hash is computed, because `record_hash` covers the record with `attestation` removed — so
  `cost` sits inside the attested content and a later edit would invalidate the attestation.
- **`pharn/pharn-contracts/ship-record.md` § `The cost block`** is its contract, carrying the floor/advisory
  split below.
- **26 hermetic tests** (`pharn/floor/render-cost-record.test.mjs`), suite 1381 → 1407.

**What is FLOOR:** the dedup and the sum. Deduplication is load-bearing, not a nicety — the 2.34× over-count
documented in §0 of this report is exactly what it prevents. Every token class is summed separately, so a
cached and an uncached token are never blended. Given the same transcript bytes the render is byte-identical.

**What is ADVISORY, and stated in the contract (P0):** `coverage` has **no `complete` member by design** — the
ship stage's own turns are still being written when the block renders, so a run can never fully account for
itself; the figure is a **floor on spend**, never the total. It reports **tokens, never dollars**: no price
table is embedded, because published prices change and nothing in the floor could check one — the same reason
this report keeps its own dollar figures labelled as list-price equivalents. It **annotates and gates nothing**
(fix #3). Coverage is machine-local, the `product-lessons-index` precedent's weakness rather than the dev
floor's byte-equality.

**Two things this does NOT resolve, recorded so the entry is not read as more than it is:**

1. **The P7 trigger was a maintainer decision, not a dogfood or eval failure.** The deferral argued here — no
   users yet, no installer, no versioned release, the same reasoning on record for `product-capability-catalog`
   — was **overridden deliberately**, not met. That is a legitimate way for an addition to enter (the human
   owns the call), but it is **not** the P7 trigger the constitution describes, and this line is the honest
   record of which one applied.
2. **The figures in this report still do not transfer.** $24.87/feature was measured over `pharn-dev-*` stages
   against a markdown methodology repo. What a _user's_ record will show is their own pipeline over their own
   code. The new block measures **their** cost; it does not make this report's numbers theirs.

Limits 2, 4 and 10 above remain true **of this report**, which reconstructed cost from transcripts. They are
what the shipped block removes for runs **from 2.7.0 onward** — not retroactively.

---

_Every figure in this report was computed this session from recorded runs. Figures labelled inferred are the
fitted intercept (§7.6) and nothing else. Where a number could not be measured — §3c, §3d, per-rule-file
re-sends — this file says so rather than estimating._
