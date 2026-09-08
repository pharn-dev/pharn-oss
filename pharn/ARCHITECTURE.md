---
file: "ARCHITECTURE.md"
trust: trusted
editable_by: "human only"
purpose: "The canonical architecture PHARN is built to. The build agent treats this as the spec; the plan agent pins its content-hash; the review agent checks output against it. Elaborates CONSTITUTION.md — never contradicts it."
---

# PHARN — Architecture

> Read `CONSTITUTION.md` first. This document elaborates it. Principle references (P0–P7) point
> there and are not restated here (P4).

---

## 1. Thesis and the central problem

PHARN is **context engineering as a versioned, auditable artifact** — compiler discipline
(principles → capabilities → enforcement → traceability) expressed in prompts (markdown + a few
deterministic `.cjs`/`.mjs` helpers consumed by Claude Code), not in application code. The product
is the methodology; **transparency is the moat** — the client is fully readable, the paid layer is
gated by an API key, never by obfuscation.

Every architectural decision serves one pressure: **cover N frameworks × K concerns without
combinatorial explosion, while staying 100% readable.** The central move is to identify **axes of
change** and never let two of them share a file (P3). The consequence, made deliberately: PHARN
ships **no framework rule banks and no vendor bridges**. Framework-agnostic capabilities (lenses,
grillers, verifiers) carry the concern axis; the one framework-coupled fact — _where this project
wires a capability into its request lifecycle_ — is resolved per project and pinned (§5, seam),
never shipped as content.

There are two threat models (`THREAT-MODEL.md`): **A** — does the app PHARN _builds_ defend itself
(OWASP LLM Top 10); **B** — is PHARN _itself_ injectable as an agent reading hostile context.
A is methodology delivered to the user. **B is architecture, and this document bakes it into the
foundation.**

---

## 2. The floor (the only thing that is actually guaranteed)

Per P0, every guarantee reduces to one of exactly three deterministic primitives. The floor is
small, explicit, and non-LLM. Nothing else is a guarantee.

1. **Hooks** — non-LLM programs run by Claude Code at tool boundaries.
   - `pre-write` — blocks a write to a protected path (e.g. trusted files; out-of-`writes`-scope paths).
   - `pre-egress` _(specified; ships with the guarded surface)_ — blocks a network call to a domain not on a hardcoded allowlist.
2. **Content-hash** — identity of _content_, not identity of _id_. Detects silent mutation of a
   pinned artifact (spec, seam resolution, fetched doc, ship record).
3. **Enum / regex check** — set membership or pattern match, in `validate` and at gates
   (`coupling ∈ {...}`, `applies ∈ archetypes`, `rule_id ∈ roster`, regex for a hardcoded secret).

**Rule of reduction:** any sentence in this architecture that says "guaranteed" must trace to one
of these three. If it cannot, it is `advisory` and is labeled so (P0). The honest consequence:
the LLM layer is never injection-proof; only the floor is (`LIMITS.md`).

---

## 3. Primitives

### 3.1 Capability — the unified LLM-invoked family

A skill, lens, validator, verifier, griller, and auditor are **not six kinds** — they are one kind
with a `role` discriminator. Each is a scoped LLM instruction + evals + typed findings. Unifying
them gives one eval runner, one template, one mental model, one community contribution format.
The `role` enum is the one `pharn/floor/validate.mjs` enforces; today the shipped tree carries
`skill`, `lens`, `griller` and `verifier` — `validator` and `auditor` are reserved members with no
shipped capability behind them (P7: a role is added when a real capability needs it, not before).

Frontmatter contract (every Capability):

```yaml
---
name: "<id>"
role: skill | lens | validator | verifier | griller | auditor
kind: pharn-owned | vendor-official | community   # also a privilege level — see §5
trust: trusted                                     # the Capability itself is trusted; its INPUT may not be
coupling: agnostic | framework-seam | framework-specific   # §3.2; only on framework-touching capabilities
applies: ["universal"] | ["<archetype>", …]        # REQUIRED — archetype scoping over the §5 enum + `universal`
model_tier: haiku | sonnet | opus
est_tokens: <int>                                  # ADVISORY estimate — see LIMITS.md (cannot be static over variable input)
reads: ["<path-or-artifact>"]                      # declared inputs — ENFORCED only at the write side by the floor
writes: ["<path>"]                                 # declared outputs — ENFORCED by the pre-write hook (§5, fix #7)
constitution_refs: ["P0".."P7"]
enforces: ["<rule_id>"]                            # principle IDs (P0–P7) this enforces — each MUST have an eval (P1)
related: ["<other capability names>"]
version: "<semver>"
seal: "PHARN ✓ reviewed"                           # ONLY on kind: pharn-owned
---
```

### 3.2 Coupling — classify by axis-of-change, not by domain noun

`coupling` is the seam classification. It is **metadata** (advisory; not floor-validated for
correctness — only its enum membership is). Decide it with this top-down procedure, **first match
wins**. The question is never "what _is_ auth" — it is "what forces this content to change":

- **Q1** — Does the content stay byte-identical when you swap the framework (Next → Remix →
  SvelteKit) **and** across SSR/Backend/SPA archetypes? → `agnostic`.
- **Q2** — (else) Does it describe how a **cross-framework capability** (auth, jobs, fetching, the
  Server/Client boundary) _wires into_ this framework's request lifecycle — the capability exists
  everywhere, only the wiring differs? → `framework-seam`.
- **Q3** — (else) Is it a **primitive that exists only in this framework** (nothing to wire
  elsewhere — Server Actions, App Router, RSC)? → `framework-specific`.

The reframe is the point: "auth" is nothing by itself — its secrets-handling part is `agnostic`
(the `secrets-in-code` lens, the `security` griller), its session-wiring part is `framework-seam`
(a seam the resolver pins per project, §5). A half-and-half capability takes the **dominant axis**
and stays whole. Worked examples the procedure must reproduce: a query-shape lens (`n-plus-one`)
→ Q1 → agnostic; "where the auth session is set for this project" → Q2 → framework-seam; a
Server-Actions-only check → Q3 → framework-specific. Every capability PHARN ships today is
`agnostic`; `framework-seam` is answered by the seam-record, not by shipped content.

### 3.3 Hook — a separate, privileged, deterministic class

Hooks are **not** Capabilities. No `model_tier`, not LLM-invoked. They are the floor (§2). They
must stay a separate class precisely because they are the one layer prompt injection cannot reach
— collapsing them into Capability would erase the most important line in the system.

---

## 4. Layers (the tree)

Dependency-ordered, single root, **no sibling imports** (P3). Sharing flows only through the
bottom (`pharn-contracts`).

```text
pharn/CONSTITUTION.md, pharn/ARCHITECTURE.md   trusted docs — the spec the tree is built to
pharn/floor/                                   the floor (§2): checkers, scanners, validate.mjs
pharn/pharn-contracts   L-1  schemas only, ZERO behavior: finding-shape (incl. severity enum),
                             eval-format, seam-config, loop-record, ship-briefing, ship-record.
                             Everything depends on this.
  └─ pharn-core          L0   seam-resolver — the seam MECHANISM, framework-agnostic.
       ├─ pharn-pipeline      grillers (plan-time interrogation, one axis each)
       └─ pharn-review        lenses (post-build review, one hunt each)
.claude/commands/                              the stages: pharn-spec … pharn-ship (+ loop, memory-promote)
```

- `pharn-contracts` is a separate **bottom**, not a leaf. This fixes the v1 inversion where the
  most foundational contract was owned by a leaf module. The finding shape, the severity enum,
  the eval format and the seam config **live here**. Enums that the floor enforces directly —
  the capability frontmatter, the `role`/`coupling`/archetype sets — live **in
  `pharn/floor/validate.mjs`** as the single source of truth and are cited here, not restated (P4).
- **Tree, with one escape hatch:** the tree is the default, not an absolute. A genuinely shared
  abstraction may create a cross-edge — but that edge goes **through `pharn-contracts`** (the
  bottom), never leaf→leaf. This keeps P3 intact and avoids multiplying adapters.
- **Seam split:** the _mechanism_ (resolver) is in core and knows nothing about any framework;
  the _answers_ (how Drizzle wires under edge runtime in Next, for **this** project) live in the
  project's pinned seam-record (§5) and know nothing about the process. There is no shipped
  per-framework answer pack — answers age with every framework release, and shipping them would
  make PHARN's most expensive-to-maintain artifact its default content.
- **Stages live in commands, not in a module.** `spec → … → ship` are `.claude/commands/pharn-*`
  files; the modules under `pharn/` hold only the capabilities those stages invoke. The `pharn-dev-*`
  twins are contributor apparatus (`.dev/`) and are not product surface.

> Caveat the build agent must respect: in markdown there is no `import` statement to lint, so "no
> sibling imports" is partly a **convention** — a sibling reference is a path in `reads:` or a
> mention in prose. `pharn/floor/validate.mjs` greps for forbidden cross-references; beyond that,
> the review agent enforces it (P3). This is a labeled limit, not a silent guarantee.

---

## 5. Inter-layer contracts

Layers meet on named contracts, never ad hoc.

**Constitution injection.** The constitution text is an immutable prefix on every LLM prompt
(`[CONSTITUTION] / [TASK]`). It is the `trusted` channel by definition.

**Principle-as-SoT + finding shape.** The constitution's principles are the single source of truth
(P4); there is no separate rule bank. A finding chains `finding → rule_id (P0–P7) → constitution`,
giving audit-grade traceability — but only if the `rule_id` is real **and eval-bound** (P1;
enforced by `validate`, fix #6). See §8 for the finding object, which is central to the trust model.

**Trust-fence + taint propagation (fix #1, the most important structural fix).** Trust is a tag on
the source artifact (P2). Crucially, **taint propagates through transformation**: when a Capability
processes untrusted input, the _free-text_ fields of its output (`problem`, `evidence`) **inherit
the untrusted tag**. Those fields are never injected as instructions into a downstream stage and
render as quoted/escaped data in PRs and reports. The floor-verifiable fields (`rule_id`,
`severity`, `file:line`) are trusted because enum-check / path-resolution produced them. **No
guaranteed decision ever rests on a tainted field** — it rests on the enum-gated fields (§8). This
is what stops an injected code comment from flipping a guaranteed block.

**Seam + seam-record + content-hash.** A seam = `{name, framework, runtime, packages[],
resolution, resolved_via, pinned_at, content_hash}`. The agnostic resolver resolves each needed
seam once through a confidence-gated chain (official skill → pinned ai_docs → model → fetch+pin →
ask; terminal fallback is **ask**, P5) and pins it to `seam-record.json` by commit hash **and
content hash**. Re-resolve only on a MAJOR bump of a pinned package. A re-fetch that changes
content **requires re-review (a diff a human sees)** — it never silently replaces. The seam-record
is the **only** place wiring facts live; a phase says "set the auth session at the seam," the
record says _where, for this project_. Its configuration surface (`seam.haltOnUnknown` and the
project `seam` block) is defined once in `pharn-contracts/seam-config.md`. **Seam answers are the
single most expensive thing to maintain** (they age with every framework release) — `LIMITS.md` and
the pipeline treat seam staleness as a first-class, loud signal, not a quiet check.

**Archetype + map-consistency (fix #5).** `archetype ∈ {ssr, backend, spa, lib}` (extensible),
detected deterministically (membership over `package.json`). Every capability declares which
archetypes it applies to (`applies`, §3.1 — enum-checked, `universal` = all). The archetype also
drives which phases run, which grillers run, and which plan sections exist; nothing ties those
maps together by default — and in v1 this drifted (a 12-phase plan vs a 10-phase build).
`validate` therefore checks that the maps agree on the archetype set **when an archetype-maps
manifest exists** (conditional; specified, ships with the guarded surface).

**Eval.** `{case, expected}`, one runner, deterministic-vs-judge per Capability. Evals are
regression suite and spec (P1). `validate` enforces presence and the `rule_id` binding.

**State.** Memory-bank = two canonical markdown files at the user's repo root
(`memory-bank/lessons-learned.md`, `memory-bank/pattern-library.md`), git-committed. `/pharn-plan`
is the read side (mandatory `applied_lessons`); `/pharn-memory-promote` is the write side.
Promotion of a lesson/pattern to canon is a **gated** action with provenance per entry (which run /
feature / diff) — memory poisoning is silent and cumulative, so the floor
(`pharn/floor/check-provenance.mjs` + the fix #7 writes-scope) gates the shape and the target, and
a human gates the accept (P2). `seam-record.json` and the per-feature artifacts (`findings.json`,
`ship-record.json`) are the other durable files. All state is human-readable canonical markdown or
JSON.

---

## 6. The pipeline spine

`spec → plan → grill → build → regress → verify → ship`. Each stage emits a **typed artifact**
linking back to the spec:

| stage   | artifact             | key field                                    |
| ------- | -------------------- | -------------------------------------------- |
| spec    | `SPEC.md`            | intent (Draft → Approved)                    |
| plan | `PLAN.md` | `spec_id` **+ `spec_content_hash`** (fix #4) + `applied_lessons` (floor-shaped: `none` \| `[L<n>…]`; content advisory) |
| grill   | grill-log            | findings vs plan                             |
| build   | `build-summary.json` | per-phase results                            |
| regress | regression-report    | regressions outside the feature              |
| verify  | verify-report        | compliance per verifier                      |
| ship    | ship-report          | decision + `PHARN ✓ reviewed` seal           |

**Keystone:** `SPEC.md` is the root artifact and every downstream artifact carries `spec_id`.
But **`spec_id` binds identity, not content** — so the plan also pins `spec_content_hash` (fix #4,
reusing the seam-record content-hash mechanism). If the spec is edited after the plan, the hash
diverges and it is **detectable, not silent**. This is what makes the intent → diff → finding →
decision chain actually audit-grade — and it is the foundation under the 2.0 moat ("the spec is
the one thing only you have"). An audit whose spec content floats under a stable id is **not**
audit-grade.

**The ship stage's optional attestation clause (content-bound).** Beside `SHIP.md`, `/pharn-ship`
emits the machine-readable roll-up `features/<name>/ship-record.json`, which may carry an **optional**
`attestation` block — a **named human's** attestation to having **read** the record, bound to its
content by a hash so a later edit is **detectable, not silent** (the same content-hash mechanism as
`spec_content_hash` above) and gated by the config key `ship.requireAttestation` (default `false`).
The floor checker `pharn/floor/check-attestation.mjs` verifies the block's **shape** (enum/regex) and
**recomputes `record_hash`** (content-hash), yielding `attested` / `unattested` / `stale` /
`malformed`; everything beyond that — that a _real_ human, not the agent, supplied the handle, and
that attestation **≠ comprehension** — is advisory. Field shape, the hashing algorithm, and the full
IS / IS-NOT boundary are defined once in `pharn-contracts/ship-record.md` (cited, not restated — P4).

---

## 7. Enforcement — three moments, two gate kinds

Three moments, all reading **typed fields** (never model prose):

- **pre-write** — hooks; block before a bad edit lands. Hosts the **pre-egress allowlist** (a
  network call to a non-allowlisted domain does not execute, regardless of whether the model was
  fooled — specified; ships with the guarded surface) and the **constitution/trusted-file write-guard** (fix #2) and the **`writes`-scope
  guard** (fix #7).
- **in-build** — validators; per-phase, gate a wave (role reserved, §3.1 — no validator ships today;
  the build stage's completeness gate is the floor checker `check-build-complete.mjs`).
- **post-build** — lenses (at review), verifiers (at verify). A lens cannot "decide approve" — it
  emits a typed finding list or nothing.

**Two gate kinds (fix #3) — do not conflate them:**

- **floor-gate** — computes a verdict from actual content (regex for a hardcoded secret,
  content-hash mismatch, an enum-roster `rule_id`). This is the **only** gate allowed to block a
  _guaranteed_ invariant.
- **advisory-gate** — reads LLM-assigned `severity`. It may escalate or warn; it is **never** the
  sole basis for a guaranteed/constitutional block.

The v1 "deterministic threshold gate over LLM severity" was advisory dressed as deterministic — it
is now labeled correctly (`LIMITS.md`).

`pharn/floor/validate.mjs` (the `validate` step) enforces, deterministically: capability frontmatter
present; evals present (P1); **every `enforces` rule_id produced by ≥1 eval** (P1, fix #6);
`coupling` enum membership; `applies` present and archetype-enum membership; the four archetype maps agree (fix #5 — conditional; specified, ships with the guarded surface); finding templates separate
enum-gated from free-text fields (fix #1); no forbidden sibling reference (P3, best-effort grep);
no capability cites a floor checker at a stale path.

---

## 8. The finding object (central to the trust model)

Every finding from any Capability has this exact shape. The split between **floor-verifiable** and
**tainted free-text** fields is the structural expression of fix #1:

```yaml
finding:
  # --- floor-verifiable (trusted: produced by enum-check / path-resolution) ---
  type: "<enum>" # FINDING | CONSTITUTION_VIOLATION | ...
  rule_id: "<P0..P7 | checker ID>" # MUST exist in the roster AND have an eval (P1, P4)
  severity: blocking | important | minor # enum; advisory when LLM-assigned (see fix #3)
  file: "<path:line>" # resolves to a real location
  # --- tainted free-text (inherits trust of the INPUT; rendered as DATA, never executed) ---
  problem: "<one sentence>" # P2: fenced; never injected downstream as instruction
  evidence: "<quote/snippet>" # P2: quoted/escaped in PR + report
```

A guaranteed decision (a constitutional block) is computed from the **floor-verifiable** fields
only. The free-text fields are for humans and are treated as untrusted data per P2. An injected
comment in reviewed code can at most influence an **advisory** judgment via the free-text fields —
it can never flip a floor-gated block.

**Residual (named, not hidden — `LIMITS.md`):** when a _downstream LLM stage_ consumes the
free-text of a finding, "do not execute this as an instruction" becomes a heuristic again. Fix #1
bounds the blast radius (free text never alone gates a guaranteed decision) but does not zero it.
This is the one place the trust model is not provable on paper — and is why **attempt 0**
targets it (`README.md`).