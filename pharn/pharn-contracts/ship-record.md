---
name: ship-record
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the ship-record and its OPTIONAL named-human attestation block. Schema only, zero behavior. Defines the floor-verifiable (shape enum/regex + record_hash content-hash) vs advisory (that a real human supplied `by`) split for /pharn-ship (pharn/ARCHITECTURE.md §6; P0, P2)."
---

# Contract — ship-record

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). It is the SoT for the
> ship-record `/pharn-ship` emits and for the OPTIONAL attestation block on it. Enforcers **cite** it and
> **conform** to it; they do not restate its semantics (P4). It elaborates `pharn/ARCHITECTURE.md §6` (the
> `ship` stage); the principles (P0, P2, P5) live in `pharn/CONSTITUTION.md`.

The ship-record is the machine-readable roll-up `/pharn-ship` writes at the terminal stage
(`pharn/features/<name>/ship-record.json`), beside the human-facing `SHIP.md`. Its only **floor-relevant** part is
the OPTIONAL `attestation` block: a **named human's** attestation to having **READ** the record, **bound to
the record's content** by a hash. Everything else in the record is the advisory ship roll-up (stages that
ran, floor verdicts read, a pointer to `SHIP.md`) and carries the same trust as its sub-stage sources.

## What attestation IS and is NOT (P0 — the honesty bar)

- **IS:** a floor-verifiable claim that _some_ human handle attested to having **read** record content whose
  hash is pinned. A later edit to the record body → hash divergence → **detectable, not silent** (the same
  mechanism as `spec_content_hash`, `pharn/ARCHITECTURE.md §6`, fix #4).
- **IS NOT:** a claim that the human **understood** the change, that the change is **correct** or **wise**, or
  that the identity is **genuine**. Attestation **≠ comprehension** — claiming to ensure comprehension is the
  disease at the heart of the product (P0; see `pharn/pharn-pipeline/grillers/comprehension`). The base
  `PHARN ✓ reviewed` seal and the merge/fix/abandon **decision** remain the human's GATE-2 call; this contract
  adds only an honest **attestation clause**, never a self-issued seal.

## The object

```yaml
ship-record: # pharn/features/<name>/ship-record.json — a JSON object
  # ... advisory ship roll-up fields (stages[], verdicts{}, decision, pointers) — NOT floor-checked ...
  attestation: # OPTIONAL. Absent by default → the record renders `· unattested` (a valid, honest state).
    by: "<handle>" # a NAMED HUMAN's handle
    at: "<ISO-8601>" # when the attestation was recorded
    record_hash: "<sha256 hex>" # binds this attestation to the record content EXCLUDING `attestation`
```

## Field shape + trust classes (the attestation block)

| field         | shape (FLOOR — enum/regex/hash)                                               | trust                                                       |
| ------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `by`          | single-line bounded handle: `^[A-Za-z0-9._@-]{1,64}$`                         | **value** shape-gated; that it is a **real human** advisory |
| `at`          | ISO-8601: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z\|[+-]\d{2}:\d{2})$` | trusted (regex)                                             |
| `record_hash` | `^[0-9a-f]{64}$` **and** equals the recomputed hash (below)                   | trusted (content-hash)                                      |

The `attestation` object MUST contain **exactly** these three keys (no more) or it is `malformed` — this
prevents smuggling extra fields past the shape gate. `by`'s single-line bounded regex is deliberate (fix
F2): it keeps an untrusted handle from becoming a multi-line / markup injection vector in the rendered seal
clause or the record (P2; bounds — does not zero — the `LIMITS.md §2` residual).

## The `cost` block (ADVISORY — measured tokens, never a guarantee)

`cost` is the measured token cost of the run that produced the record, rendered by
`pharn/floor/render-cost-record.mjs` (cited, not restated — P4). It is the floor reduction of
`LIMITS.md §1c`'s true statement — the real number is the **measured** runtime cost, not a declared
`est_tokens`.

```yaml
cost: # OPTIONAL. Absent → the run predates the block or the record was hand-assembled.
  schema: "pharn-cost-record/1"
  coverage: partial | unavailable # NO `complete` member — see below
  coverage_note: "<free text>"
  session_id: "<id>" | null
  window_start: "<ISO-8601>" | null # from the records' OWN timestamps, never a clock read
  window_end: "<ISO-8601>" | null
  dedup_key: "requestId"
  transcript_files: <int>
  requests: <int> # DEDUPLICATED API requests, not transcript lines
  tokens: # every class kept SEPARATE — cached and uncached are never blended
    input_uncached: <int>
    cache_write_1h: <int>
    cache_write_5m: <int>
    cache_read: <int>
    output: <int>
    thinking: <int>
  by_stage: { "<attributionSkill>": { requests, tokens } } # "(untagged)" is an honest bucket
  by_model: { "<model-id>": { requests, tokens } }
```

**What it IS:** a deterministic sum over the run's own session transcript. The dedup on `requestId` is
**load-bearing, not a nicety** — the platform writes one API response as several transcript lines that each
repeat the same usage object, so a naive sum over-counts (measured at **2.34×** over this repo's own build
history). Nested subagent transcripts are stored **disjointly** from the parent and are included, or fan-out
cost would be invisible. Given the same transcript bytes the render is byte-identical.

**What it IS NOT — and these are the whole point (P0):**

- **Never `complete`.** The `coverage` enum has **no `complete` member by design**: the ship stage's own
  turns are still being written when the block is rendered, so a run can never fully account for itself. The
  figure is a **floor on spend**, never the total.
- **Tokens, never dollars.** No price table is embedded, deliberately — published prices change, a baked-in
  table would rot silently, and nothing in the floor could check it. Currency conversion is the reader's job.
- **Not a verdict input.** It **annotates**; it gates nothing (fix #3). It can never flip a stage verdict or
  block GATE 2, and "the record shows N tokens" **never** means "the spend was worthwhile" — that stays the
  human's GATE-2 call.
- **Machine-local coverage.** The transcript lives outside the repo and is never committed, so a fresh clone
  reproduces nothing — the `product-lessons-index` precedent's weakness, not the dev floor's byte-equality.
- **`by_stage` keys are the platform's `attributionSkill`,** not PHARN's own accounting. A stage missing
  from `by_stage` means the platform did not tag those records, **not** that the stage did not run.

**Ordering (load-bearing).** `record_hash` is computed over the record with `attestation` removed, so
`cost` is **inside** the attested content. An emitter MUST write `cost` **before** computing the
attestation hash; adding or editing it afterwards makes a previously-valid attestation read `stale`.

## record_hash — the content-hash binding (ONE implementation, no desync)

`record_hash` = sha256(canonicalJSON(record with the `attestation` key removed)), where
**canonicalJSON** is: recursively **key-sorted** objects (ascending by code unit), arrays in order,
**compact** separators (`,` `:`), standard JSON scalar encoding.

**Critical (fix F1):** the canonicalization has **exactly one implementation** —
`pharn/floor/check-attestation.mjs`. An emitter (the `/pharn-ship` command) MUST obtain `record_hash` from
that script's **`--compute`** mode; it MUST NOT re-derive the hash by any other means. Verifier and emitter
therefore hash **identical bytes** by construction, so a genuine attestation can never spuriously read
`stale`. This contract **describes** the algorithm for the human; the **executable SoT** is the one script
(cited, not duplicated — P4).

## The rule of the contract (P0)

- **FLOOR (deterministic, `pharn/floor/check-attestation.mjs`):**
  1. **shape** — the attestation block matches the enum/regex table above (else `malformed`); and
  2. **content-hash** — `record_hash` equals the recomputed hash (else `stale`).
     Absent block → `unattested`. Present + shape-valid + hash-valid → `attested`.
- **ADVISORY (never floor):** that a **real named human — not the agent** — supplied `by`. The pipeline
  cannot prove identity; the `/pharn-ship` command therefore **forbids the agent from self-filling `by`** and
  **elicits it interactively** (P2, P5). Git commit authorship is **corroborating context only, never floor**.
- **State is ALWAYS shown.** The seal renders `· attested by <by>` (present ∧ hash-valid) or `· unattested`
  (absent) — a silent omission would let "written" masquerade as "verified", recreating the disease (P0).

## Residual (named, not hidden — `LIMITS.md §2`)

When a human or downstream LLM reads the rendered `· attested by <by>` clause, "this `by` is a real,
comprehending human" is a heuristic again — bounded (nothing floor-gates on identity or comprehension; `by`
is shape-constrained and quoted as DATA) but not zeroed. Stated, not hidden.
