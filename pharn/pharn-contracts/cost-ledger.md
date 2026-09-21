---
file: "cost-ledger.md"
layer: "pharn-contracts"
trust: trusted
purpose: "The shape of pharn/features/<name>/cost.json — the per-run cost ledger a pipeline stage emits at its stop. Schemas only, zero behavior (ARCHITECTURE.md §4)."
schema: "pharn-cost-ledger/1"
emitted_by: "pharn/floor/render-cost-ledger.mjs"
checked_by: "pharn/floor/check-cost-ledger.mjs"
---

# Contract — cost-ledger

> Read `pharn/CONSTITUTION.md` first. Principle references (P0–P7) point there and are not restated
> here (P4).

A **cost ledger** is the machine-readable record of what one pipeline run consumed, written at the run's
stop — green or not. It exists so a reader can compute what a feature cost **in money**, deterministically,
**against their own price list**, from a file in the repository.

It is written by `pharn/floor/render-cost-ledger.mjs` and validated by `pharn/floor/check-cost-ledger.mjs`.
`/pharn-loop` emits one at every stop that has a feature directory.

---

## The governing principle: record facts, derive views

Exactly two things are **irrecoverable after the run**: per-request usage, and phase boundaries. Claude
Code prunes session transcripts on its own schedule (`cleanupPeriodDays`), and a phase boundary is a fact
about a **moment** that nothing writes down unless something writes it down then. The 2026-08-18
token-cost measurement lost three features to exactly this (§9).

So the ledger records **both as facts** — `requests[]` and `markers[]` — and every aggregate in the file
is a **pure function** of `requests[]`. That is what lets the checker recompute all of them and compare.

**Phase attribution is a VIEW with a named, versioned method**, not a stored truth. This matters because
the platform's own `attributionSkill` field does not answer "which stage": measured on this repo's
`loop-decision-integrity` run, 213 of 275 deduped requests were tagged and **every one of them was
tagged `pharn-loop`**, with no sub-stage named anywhere. The field is therefore recorded **raw**, in
`requests[].attribution_skill`, and nothing depends on it.

---

## The object

```jsonc
{
  "schema": "pharn-cost-ledger/1",
  "name": "<feature slug>",
  "command": "/pharn-loop",
  "base_sha": "<sha | unknown>",
  "outcome": { "decision": "STOP_GREEN", "iterations": 1, "source": "LOOP.md" },
  "skills_version": "6.5.0",
  "skills_version_source": "SKILLS_VERSION",
  "claude_code_versions": ["2.1.278"],
  "sessions": ["<session uuid>"],
  "window_start": "2026-09-21T08:35:42.425Z",
  "window_end": "2026-09-21T09:40:52.438Z",
  "coverage": "partial",
  "coverage_note": "<why it is never complete>",
  "dedup_key": "requestId",
  "attribution": { "method": "latest-marker-at-or-before-ts-same-session/1", "markers": 12 },
  "pricing_note": "TOKENS ONLY — …",
  "markers": [{ "seq": 1, "kind": "run-start", "stage": null, "iteration": null, "ts": "…", "session_id": "…" }],
  "requests": [
    {
      "request_id": "req_…",
      "ts": "2026-09-21T08:35:42.425Z",
      "session_id": "<session uuid>",
      "model": "claude-opus-5",
      "sidechain": false,
      "agent_id": null,
      "attribution_skill": "pharn-loop",
      "usage": { "…": "copied from the record, leaf-filtered" },
      "tokens": { "input": 2, "cache_write_5m": 0, "cache_write_1h": 44498, "cache_read": 28913, "output": 1046, "output_thinking": 726 },
      "stage": "pharn-build",
      "iteration": 1,
    },
  ],
  "totals": { "requests": 275, "tokens": { "…": 0 } },
  "by_model": [{ "model": "…", "requests": 0, "tokens": {} }],
  "by_stage_iteration_model": [{ "stage": "…", "iteration": 1, "model": "…", "requests": 0, "tokens": {} }],
  "unattributed": { "requests": 62, "tokens": {} },
  "dropped": [],
}
```

---

## Field shape + trust classes

`pharn/floor/check-cost-ledger.mjs` owns every rule below. The **top-level key set is CLOSED**: exactly
the keys above, no more and no fewer, asserted in **both** directions. A per-member presence set would be
satisfied by a variant spelling of any member; closure is what makes a variant fail.

| field                                                               | shape                                                            | class                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- |
| `schema`                                                            | the literal `pharn-cost-ledger/1`                                | FLOOR (enum)                 |
| `name`                                                              | the feature slug                                                 | FLOOR (present)              |
| `command`                                                           | the emitting command, e.g. `/pharn-loop`                         | FLOOR (present)              |
| `base_sha`                                                          | the run's base SHA, or the literal `unknown`                     | FLOOR (present)              |
| `outcome`                                                           | `{decision, iterations, blocked?, source:"LOOP.md"}`, or `null`  | FLOOR (shape)                |
| `skills_version`                                                    | the version string, or `null`                                    | FLOOR (shape)                |
| `skills_version_source`                                             | `pharn.config.json` \| `SKILLS_VERSION` \| `unknown`             | FLOOR (enum)                 |
| `claude_code_versions`                                              | sorted distinct `version` values seen on the records             | FLOOR (array)                |
| `sessions`                                                          | sorted distinct session ids                                      | FLOOR (array)                |
| `window_start` / `_end`                                             | ISO timestamps from the **records' own** values, or `null`       | FLOOR (from data)            |
| `coverage`                                                          | `partial` \| `unavailable` — **there is no `complete`**          | FLOOR (enum)                 |
| `dedup_key`                                                         | the literal `requestId`                                          | FLOOR (enum)                 |
| `attribution.method`                                                | the versioned method name                                        | FLOOR (enum)                 |
| `pricing_note`                                                      | must state the file carries tokens, never prices                 | FLOOR (regex)                |
| `markers[].seq`                                                     | integers, **strictly increasing**                                | FLOOR (integer compare)      |
| `markers[].kind`                                                    | `run-start` \| `stage-start` \| `orchestrator` \| `run-stop`     | FLOOR (enum)                 |
| `requests[].request_id`                                             | non-empty, **unique across the array**                           | FLOOR (set membership)       |
| `requests[].usage`                                                  | every leaf: number \| bool \| null \| a short token              | FLOOR (enum-regex)           |
| `requests[].model`                                                  | a bounded identity token (<=128 chars, no control char, no path) | FLOOR (enum-regex)           |
| `requests[].attribution_skill` / `agent_id`                         | the same bound, or `null`                                        | FLOOR (enum-regex)           |
| `requests[].tokens.*`                                               | the six classes, each a number                                   | FLOOR (shape)                |
| `requests[].sidechain`                                              | a boolean                                                        | FLOOR (shape)                |
| `requests[].stage/iteration`                                        | the derived VIEW                                                 | **ADVISORY** (see below)     |
| `totals` / `by_model` / `by_stage_iteration_model` / `unattributed` | equal to a recompute from `requests[]`                           | FLOOR (recompute + equality) |
| `dropped[]`                                                         | key paths of leaves the leaf rule refused                        | FLOOR (array)                |

**`outcome` is copied VERBATIM from the `LOOP.md` envelope** (`pharn/pharn-contracts/loop-record.md` —
cited, not restated, P4), read from the `---`-fenced frontmatter only and never grepped from the body. The
ledger introduces **no second source of truth** for the decision. Its shape is deliberately general enough
that `/pharn-ship` fits later without a schema change.

**There is no `commit` field, and its absence is deliberate.** `LOOP.md`'s `commit` is HEAD _before_ the
loop commits, so it is the base — which is what `base_sha` already carries. A green run's `cost.json`
lands _inside_ the loop's own commit, so a field naming that commit could not be written before it exists.

---

## The four FLOOR rules on content, stated precisely (P0)

1. **The top-level key set is closed.** Both directions.
2. **Every `usage` leaf is `number | bool | null | a short token`.** Anything else is **dropped and its
   key path listed** in `dropped[]` — never coerced, never stringified, never silently kept. **Arrays are
   WALKED, not exempted**: `usage.iterations[]` survives with its scalars, so `usage` is genuinely
   verbatim.
3. **Every IDENTITY field is a bounded token.** `model`, `attribution_skill` and `agent_id` are copied
   from an untrusted transcript into a **committed** artifact, so each must be ≤128 characters, free of
   control characters, and free of an absolute path. A refusal is **dropped and its key path listed** —
   `model` falls back to the literal `unknown`, the other two to `null`. **Never truncated**, which would
   invent a value that was never in the transcript.
4. **No string anywhere in the file matches the absolute-path regex.** Every value, at every depth.

**"No message content and no home paths are in the file" is a CONSEQUENCE of those four rules, not a
detector.** Message bodies are never read, so none can appear; `cwd` and `gitBranch` are never copied, so
no home path can. **The claim "no usernames" is STRUCK** and appears nowhere in this contract or in the
implementation: **no regex proves it.** What is guaranteed is exactly what the four rules test.

> **Rule 3 was added after `/pharn-dev-review` found this contract asserting it without the code providing
> it.** The sentence under "Residual" below used to say the leaf-shape rule bounded these three fields; it
> did not — that rule reaches `usage` only, and a probe accepted a 200,000-character `attribution_skill`,
> embedded NUL/BEL bytes, and a newline carrying a forged `RED — …` line. The gap was closed rather than
> the sentence weakened, which is the direction [[L2]] requires: a contract may cite only a floor op that
> is live **for the thing it claims to cover**.

---

## Pricing — fixed, and permanent

**This file contains no prices and never will.**

```text
cost = Σ over classes of  tokens[class] × price(model, class, date, tier)
```

computed by the reader against **their own current price list**. Three bounds travel with that formula:

- **`output_thinking` is a SUBSET of `output`, not an additional class.** Summing all six double-counts
  thinking tokens. The name says so; the contract says so; the checker does not "fix" it.
- **Any figure so derived is LIST-PRICE EQUIVALENT.** A subscription is not billed per token, so the
  result is what this usage _would have cost at list_, not what was charged.
- **No price table is embedded, deliberately.** Published prices change, a baked-in table would rot
  silently, and nothing here could floor-check one.

---

## Attribution — a VIEW, named and versioned

`attribution.method` is `latest-marker-at-or-before-ts-same-session/1`:

> a request belongs to the **latest marker whose `ts` is at-or-before the request's own, in the same
> session**. Before the first such marker, a request is **`unattributed`** — an honest bucket, never
> folded into a neighbour.

The version suffix is load-bearing: a later, different method announces itself by bumping it rather than
silently reinterpreting files already written.

**Two bounds, both inherent and neither corrected:**

- **The request that ISSUES a marker call necessarily precedes the marker it writes**, so at most one
  request per boundary lands on the earlier side. Correcting it would be a guess.
- **`markers[]` is ADVISORY.** Markers are written by the orchestrator through `Bash`, outside the fix #7
  `PreToolUse` gate, so nothing on the floor forces a marker call. A missing marker is reported by the
  checker as a **WARN with a count** — never a RED, because an orchestration lapse is not a malformed
  artifact, and never a silent merge into a neighbouring stage.

---

## The rule of the contract (P0)

**What the ledger IS:** a floor-checked record of per-request token usage and phase boundaries, whose
every aggregate is recomputable from its own rows.

**What the ledger IS NOT:**

- **It is NOT complete.** `coverage` has no `complete` member. The stop's own turns — including the
  emission itself — are still being written. The number is a **floor on spend**, never the total.
- **It is NOT dollars.** It records tokens (above).
- **It is NOT proof that `requests[]` matches the transcript.** `check-cost-ledger.mjs` certifies the
  file's **internal consistency**; a self-consistent fabricated ledger passes. `--verify-transcript`
  re-derives the rows from the live transcript and compares — a genuine floor primitive, **usable only
  while the transcript exists**, therefore machine-local and perishable, and therefore not a gate.
- **It is NOT a judgment.** "The run cost N tokens" never means the spend was worthwhile. The ledger
  **annotates**; it gates nothing, and no proceed/stop in any command reads it (fix #3).
- **It is NOT reproducible from a fresh clone.** The transcript lives outside the repository and is never
  committed. Determinism is bounded accordingly: **given the same transcript bytes AND the same markers
  bytes**, the output is byte-identical — the emitter reads no clock and no randomness. The markers half
  of that conjunction is load-bearing, because `markers[]` is copied from a file a different process
  wrote at wall-clock time.

## Size, disclosed rather than discovered

A single 65-minute, one-iteration `STOP_GREEN` run emits **~393 KiB** of pretty-printed JSON (275 rows;
402,567 bytes measured). The verbatim `usage` copy is ~263 KiB of that, and `usage.iterations[]` — walked
so that "verbatim" stays true — duplicates the numbers beside it. That cost was weighed and accepted for
fidelity. It is stated here so a reader meets it at the contract rather than in a diff.

## Relationship to `pharn-cost-record/1`

`pharn/floor/render-cost-record.mjs` emits an **aggregate** cost block embedded in `ship-record.json`;
this contract describes a **standalone per-request** artifact. The two overlap, and they share one
implementation of transcript location and the file walk — imported, never copied.

**The overlap is recorded rather than resolved.** A ✧ parity test asserts the two agree on totals over the
same bytes, with the class-name mapping made explicit, so they cannot drift silently while both exist.
Unifying them belongs to the named `/pharn-ship` wiring follow-up; until then, "must the second copy
exist?" is answered **yes for now**, not **yes permanently**.

## Residual (named, not hidden — `LIMITS.md §2`, `THREAT-MODEL.md §5`)

The transcript is **untrusted input**. `attribution_skill`, `model` and `agent_id` are copied from it into
a committed artifact and are attacker-influencable in principle. They key a **view**, never a gate, and
**rule 3 above** — not the `usage` leaf rule — is what bounds them: ≤128 characters, no control character,
no path.

**That bound is on SHAPE, not on MEANING, and the distinction is the residual.** A 40-character
lower-case token is admitted whatever it says. An attacker who controls `attributionSkill` can therefore
place a benign-looking string into a file that a green `/pharn-loop` stop commits — it cannot forge a line
(no newline survives), cannot smuggle a path, and cannot flip any verdict (`cost.json` gates nothing,
fix #3), but it is a channel into a durable artifact and it is not closed. Stated, not zeroed.
