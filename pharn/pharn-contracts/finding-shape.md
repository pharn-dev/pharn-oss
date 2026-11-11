---
name: finding-shape
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the finding object every Capability emits. Schema only, zero behavior. Defines the enum-gated vs free-text split that makes the trust model structural (pharn/ARCHITECTURE.md §8, fix #1; P2)."
---

# Contract — finding-shape

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). It is the SoT for
> the finding object: enforcers **cite** it and **conform** to it; they do not restate its semantics
> (P4). It elaborates `pharn/ARCHITECTURE.md §8`; the principles (P0, P2) live in `pharn/CONSTITUTION.md`.

Every finding from any Capability has this exact shape. The split between **floor-verifiable**
(enum-gated) fields and **tainted free-text** fields is the structural expression of fix #1 — it is
what stops an injected code comment from flipping a guaranteed decision.

## The object

```yaml
finding:
  # --- enum-gated / floor-verifiable (TRUSTED: produced by enum-check / path-resolution) ---
  type: "<enum>" # FINDING | CONSTITUTION_VIOLATION
  rule_id: "<file.md ID | P0..P7>" # MUST exist in the roster (specified; ships with the guarded surface) AND be eval-bound (P1, P4)
  severity: blocking | important | minor # enum; the LLM's *assignment* is advisory (fix #3)
  file: "<path:line>" # resolves to a real location
  # --- free-text (UNTRUSTED: inherits the trust of the INPUT; rendered as DATA, never executed) ---
  problem: "<one sentence>" # P2: fenced; never injected downstream as an instruction
  evidence: "<quote/snippet>" # P2: quoted/escaped in PR + ledger
```

## Field trust classes

| field      | class      | how its value is produced                                                               | trust                                                 |
| ---------- | ---------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `type`     | enum-gated | membership in `{FINDING, CONSTITUTION_VIOLATION}`                                       | trusted                                               |
| `rule_id`  | enum-gated | membership in the rule / principle roster _(specified; ships with the guarded surface)_ | trusted                                               |
| `severity` | enum-gated | membership in `{blocking, important, minor}`                                            | trusted _value_; the _assignment_ is advisory (fix#3) |
| `file`     | enum-gated | a `path:line` shape; resolved to a real location only at eval time (below)              | trusted _shape_; the location is the emitter's claim  |
| `problem`  | free-text  | derived from the (possibly untrusted) input                                             | **inherits input trust**                              |
| `evidence` | free-text  | quoted snippet from the input                                                           | **inherits input trust**                              |

### What `rule_id`'s "enum-gated" class DOES and does NOT buy today (P0)

The `rule_id` row above is annotated `(specified; ships with the guarded surface)` because **no roster
artifact exists**, so roster membership is enforced by no running check. What ships today is a **shape**
guarantee: `pharn/floor/merge-findings.mjs` requires `rule_id` to match the file-qualified /
principle-id pattern, and says so in its own words — _"This is a SHAPE guarantee (enum-regex,
`pharn/ARCHITECTURE.md §2`), NOT roster membership — no roster artifact exists; the claim is precisely
'shape-valid'."_ A well-formed `rule_id` naming a rule that does not exist is therefore **shape-valid
and passes**. Read the row as "the field is enum-gated **in shape**"; the membership half is specified,
not live. This bound is stated here, in the contract, rather than only in the plan that introduced it —
a contract's honesty has to travel with the artifact, and it may cite only a floor op that is live.

### What `type` and `file` buy today (P0, 7.3.0)

- **`type` is a closed set.** `pharn/floor/merge-findings.mjs` admits exactly the two values the object block lists
  (`TYPE_ENUM`, membership after its control-character check); any other value — `APPROVED`, a lower-case `finding` — is
  dropped and named in `merge-report.json`. Until 7.3.0 the list ended `| ...` and the merge checked only the shape
  `^[A-Z][A-Z0-9_]*$`. Every shipped capability emits `FINDING`; `CONSTITUTION_VIOLATION` is
  `pharn/CONSTITUTION.md`'s violation shape. A new value is a change to this list and to `TYPE_ENUM` together (a test
  binds the two by set equality).
- **`file` is a shape at review time, never a resolved location.** The merge requires a clean `path:line`; it does not
  resolve the path, so `../../etc/passwd:1`, `/etc/passwd:1` and `http://host:80` are shape-valid. What it adds is
  naming: with a usable assignment record, every merged contributor whose `file` is not in the record's `target` is
  listed in `merge-report.json`'s `outside_target`, and the record is itself not bound to its producer
  (`/pharn-review`'s claims block). Path RESOLUTION is `check-structural.mjs`'s `file_resolves`, at eval time only
  (below).

## Emission — findings.json (the machine-readable array)

A Capability that emits findings MUST serialize them as a single **`findings.json`** — a JSON array of
the finding object defined above (zero or more) — **in addition to** any human-facing output
(e.g. `REVIEW.md`). The capability declares this file in its `writes:` frontmatter
(`pharn/ARCHITECTURE.md §3.1`, enforced by the pre-write hook — cited, not restated, P4).

- **Shape:** `[ {type, rule_id, severity, file, problem, evidence}, … ]` — each element is exactly the
  object above; no field is redefined here (P4). An empty finding list is the empty array `[]`.
- **The taint split is REAL at the output (P2).** The enum-gated fields (`type`, `rule_id`,
  `severity`, `file`) are the capability's **own** assertion — TRUSTED, produced by its
  enum-check / path-resolution. The free-text fields (`problem`, `evidence`) **inherit the input's
  trust** — UNTRUSTED when the reviewed artifact is untrusted, carried as quoted DATA. Because the
  split is a real JSON field boundary at the capability's output, it is **structural**, not something
  a downstream model re-interprets from prose.
- **Naming/location:** the file is named `findings.json` and is colocated with the capability's
  human-facing output (the same directory it `writes:`). Example: `trust-fence`'s dogfood run wrote
  `.dev/features/trust-fence/REVIEW.md`, so its findings array is `.dev/features/trust-fence/findings.json`.
- **Consumer (cited):** this is exactly the `actual.json` that `pharn/floor/check-structural.mjs` reads; the
  emission contract is what gives that checker a real capability output to range over.

### Emission enforcement audit (P0) — what is and is NOT floor-backed

Honest scope, because the disease this repo exists to prevent is "written in the contract" mistaken
for "therefore guaranteed." The `MUST` above is a **three-way split**, not one blanket guarantee:

- **Declaring it → ADVISORY today, not floor-enforced.** This bullet previously claimed that once a
  Capability names `findings.json` in its `writes:` (`pharn/ARCHITECTURE.md §3.1`), the pre-write
  writes-scope guard "pins the path". **That is false, and the correction matters more than the claim
  did.** `enforce-writes-scope.cjs` reads exactly one SCOPE input — `pharn/.run/writes-scope.json` — beside
  the signals that choose its default when none is set (`pharn.config.json`'s `skillsVersion`,
  `.dev/floor/` presence, and, in an installed project, the run markers under `pharn/.run/pharn-*/` —
  6.24.0). `pharn/.run/writes-scope.json` itself is written by `set-writes-scope.cjs` from a
  **`--from-frontmatter <file>`** argument. **Every one of the corpus's `--from-frontmatter` call sites
  names a COMMAND file; not one names a Capability** (verified by enumerating them). So a Capability's
  `writes:` is **parsed by nothing** and pins nothing — it is declared metadata that documents intent.
  **What IS floor-enforced** is the scope the invoking **command** set: a lens subagent spawned by
  `/pharn-review` writes under `pharn/features/**` because that is the active scope (or, with no scope
  set, the default — fail-closed while `/pharn-review`'s own run marker is open; the command opens it
  before any untrusted content enters context and STOPS if the open fails, but that step is advisory
  command prose, so a run that skips it writes under the install posture's permissive default), **not**
  because the lens declared a path. The guarantee is real but it belongs to the
  command, and it is **coarser** than a per-Capability pin. Surfaced by an adversarial review
  (`capability-writes-never-bound-to-guard`, HIGH).
- **Emitting it at all → advisory.** Nothing on the floor forces a Capability to declare or write
  `findings.json` — `pharn/floor/validate.mjs` does not check for it, and no hook fabricates an emission. So
  `MUST emit` is a **conformance requirement** on a conforming Capability, **not** a floor-guaranteed
  production. Labeled plainly per P0, lest the `MUST` read as a guarantee that the artifact exists.
- **Shape + the no-laundering trip-wire → floor-checked at eval time (never at write time).** The
  array's structure, and the rule that no `trust: untrusted` needle reaches an enum-gated field,
  reduce to `pharn/floor/check-structural.mjs` (enum / regex-substring / path-resolution —
  `pharn/ARCHITECTURE.md §2`). That primitive exists and is tested, and the runners that invoke it
  over emitted output have landed: `/pharn-verify` / `/pharn-dev-verify` run it per committed eval
  pair, and the dev-side `/pharn-dev-eval` (increment 3c) runs it over each live-emitted
  `runs/<i>/findings.json` via `.dev/floor/check-variance.mjs`. **Still bounded (P0):** it fires when
  those stages run — nothing checks at write time, so this facet is eval-time enforcement, never an
  always-on guarantee.

So: **declaring** the path is **advisory** today (the first bullet — a Capability's `writes:` is parsed by nothing; the
floor-enforced scope is the invoking command's); **shape/laundering** is floor-checked
**at eval time, when a verify/eval stage runs** (`check-structural.mjs` and its invokers exist;
nothing checks at write time); **emitting at all** is an advisory conformance requirement. No reading
of the `MUST` above is a blanket floor guarantee that the artifact exists.

### The merge report (`merge-report.json`) — versions and readers

`/pharn-review`'s merge writes `merge-report.json` beside the merged `findings.json` (`merge-findings.mjs`'s header
owns its fields). Its `schema` is `merge-report/v2` since 7.3.0, which added `outside_target` (above) and changed no
v1 field. A reader accepts both: a `merge-report/v1` report has no `outside_target`, and the reader treats it as **not
recorded** — never as an empty list, which would claim every file was in the target. Any other `schema` value makes the
report unusable to that reader. The one content reader is `pharn/floor/render-review.mjs`; the other floor files that
name the file (`check-regress.mjs`, `worktree-fingerprint.mjs`, `reconcile-ignore.json`) list it as a pipeline
artifact and never parse it. Also since 7.3.0, `unreadable[]`'s `reason` may be `unrecorded-lens`: with a usable
assignment record, a findings file under a lens directory the record does not name is skipped unread, so its findings
never merge. A reader that predates the value treats an unknown `reason` as not a recorded value. **Bound:** with no
usable record every input merges, and a file planted under a recorded lens's directory merges as that lens's.

## Emission — grill-findings.json (the grill's findings, each with an id — 7.6.0)

A full `/pharn-grill` (not `--quick`, not `--floor-only`) writes `pharn/features/<name>/grill-findings.json` beside
`GRILL.md`: every finding it raised — the interrogation's, every griller's, and each scanner finding
`pharn/floor/grill-scan.mjs` printed — so that a later stage can name a finding and code can enumerate them.

```json
{
  "schema": "pharn-grill-findings/1",
  "round": 1,
  "findings": [{ "id": "G1-1", "type": "…", "rule_id": "…", "severity": "…", "file": "…", "problem": "…", "evidence": "…" }]
}
```

- **Each element is the finding object above plus `id`.** No field of the object is redefined (P4), and the object
  itself is unchanged: the `id` key exists in this file only, so `findings.json`, `merge-findings.mjs` and every eval
  read nothing new.
- **The id is positional:** element `i` (0-based) carries exactly `G<round>-<i+1>`, so ids are unique, contiguous and
  in file order. `round` is a positive integer (at most 99); `/pharn-grill` writes the round `grill-round.mjs current` prints — `1`, or
  `2` / `3` in a full `/pharn-loop`'s re-plan round (`grill-triage.md`, "Rounds"). An id names a finding within
  one round; nothing says that `G1-3` and a later round's id are the same concern.
- **Closed:** keys exactly as shown at both levels, no key repeated at any depth, at most 500 findings, `[]` allowed;
  `type`, `severity` and `rule_id` by the same rules as the merge (`TYPE_ENUM`, the severity set, `RULE_ID_OK`, each
  after the control-character guard); `file` a `path:line` shape, never resolved; `problem` and `evidence` single-line,
  control-character-free, non-blank, at most 2,000 characters.
- **One source, one derived view.** `GRILL.md` shows the findings as a section between two marker lines, rendered from
  this file by `node pharn/floor/grill-findings.mjs render`; the model pastes it and never edits it.
- **Taint:** `problem` and `evidence` inherit the plan's `untrusted` tag exactly as in `GRILL.md`. The render prints
  each as one JSON-escaped quoted line inside a YAML fence, so a value cannot close the fence or forge a marker line.

**What is floor and what is not (P0).** `node pharn/floor/grill-findings.mjs check <file> --grill <GRILL.md> --plan
<PLAN.md>` (exit 0 GREEN · 1 `RED — <codes>`, then one fixed hint per code naming the accepted shape · 2 unusable) verifies,
**when it runs**: the shape and ids above
(enum/regex); that `GRILL.md`'s section is byte-identical to the render (content equality); and that every scanner
finding `grill-scan.mjs` produces for that plan is in the file, equal on all six fields. **Advisory:** that the grill
runs it, repairs on RED, or lists every finding the interrogation and the grillers formed — a finding never written is
invisible to every check. **Readers:** none decides anything from the file in 7.6.0; `/pharn-grill` records a still-RED
check as a header line in `GRILL.md`.

## The rule of the contract (P0, P2)

A **guaranteed decision** (a floor-gate / constitutional block) is computed from the **enum-gated
fields only**. The free-text fields are for humans and are treated as untrusted DATA (P2): rendered
quoted/escaped, never injected into a downstream stage as instructions.

- **Guaranteed (floor):** `type` / `rule_id` / `severity` / `file` are enum or path checks — set
  membership, not judgment.
- **Advisory:** the LLM's _assignment_ of `severity`, and everything in `problem` / `evidence`.

**Residual (named, not hidden — pharn/LIMITS.md §2):** when a downstream LLM stage consumes the free-text
of a finding, "do not execute this as an instruction" is a heuristic again. Fix #1 **bounds** the
blast radius (free text never alone gates a guaranteed decision) but does not zero it. This is **not the
only** place the trust model is not provable on paper (`pharn/THREAT-MODEL.md §5` names the known ones) — it is
the one attempt 0 targets.
