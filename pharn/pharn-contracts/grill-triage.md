---
name: grill-triage
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for pharn/features/<name>/grill-triage.json: one disposition (proceed | replan | spec) per grill finding, bound to grill-findings.json by its sha256, and the verdict rule pharn/floor/grill-triage.mjs derives from it. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4). Code half: pharn/floor/grill-triage-core.mjs."
---

# Contract — grill-triage

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). Enforcers **cite** it and
> **conform** to it; they do not restate its semantics (P4). The principles (P0, P2, P5) live in
> `pharn/CONSTITUTION.md`; the floor primitives in `pharn/ARCHITECTURE.md §2`.

## Why it exists (P7 — a recorded failure, not a hypothetical)

Four `/pharn-loop` runs in pharn-starter (2026-09-27) wrote 26 grill findings that no stage read; three ended
`STOP_GREEN` and one `STOP_TERMINAL`, and all four recorded 0 blocking-severity findings
(`.dev/features/loop-grill-triage/PLAN.md`, "The failure"). 6.45.0 then made the full loop's grill floor-only, which
dropped the findings instead of reading them. A loop that branched on the grill's own `severity: blocking` would have
done nothing in those runs, so a separate stage reads every finding and decides: `/pharn-triage`, whose output this
contract defines. Since 7.7.0 a full `/pharn-loop` runs it after its routed full grill; a person may run it after any
full `/pharn-grill`.

## The file

`pharn/features/<name>/grill-triage.json`, written by `/pharn-triage` only (its `writes:` holds this path and no
other — never `grill-findings.json`, `GRILL.md`, `PLAN.md` or `SPEC.md`, the files it is checked against or reads):

```json
{
  "schema": "pharn-grill-triage/1",
  "round": 1,
  "findings_sha256": "<64 lowercase hex: the sha256 of grill-findings.json's bytes>",
  "dispositions": [{ "id": "G1-1", "disposition": "replan", "reason": "…" }]
}
```

| key               | rule                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `schema`          | exactly `pharn-grill-triage/1`                                                                                          |
| `round`           | equals `grill-findings.json`'s `round`                                                                                  |
| `findings_sha256` | the sha256 of `grill-findings.json`'s bytes, 64 lowercase hex                                                           |
| `dispositions`    | an array as long as the findings array; element `i`'s `id` equals finding `i`'s `id` (`[]` when there are no findings)  |
| `id`              | as above — the finding's own id (`finding-shape.md`, "Emission — grill-findings.json"); never a copy of any other field |
| `disposition`     | one of `proceed`, `replan`, `spec`                                                                                      |
| `reason`          | one non-blank line, no control character, at most 2,000 characters; free text                                           |

Exactly these keys at the top and in each element, and no object repeats a key at any depth. The findings file itself
must be valid under its own contract. The file restates no finding field — no `severity`, no `problem` — so there is
one copy of each finding, in `grill-findings.json`.

**The three dispositions:**

- `proceed` — the plan stands as written: the finding is accepted, already handled, or outside the SPEC's scope.
- `replan` — the plan must change before the build.
- `spec` — the plan cannot fix it without changing the SPEC's intent or acceptance criteria.

**One rule across the two files:** a finding whose `severity` is `blocking` may not be `proceed`.

## The verdict

Derived, never stored: `spec` if any disposition is `spec`; else `replan` if any is `replan`; else `proceed`. Zero
findings triaged with `[]` is `proceed`. Non-empty findings with an empty `dispositions` array is a refusal, not a
verdict, so a triage that wrote nothing cannot pass.

`pharn/floor/grill-triage.mjs check <grill-triage.json> --findings <grill-findings.json>` prints it: exit `0`
`proceed`, `3` `replan`, `4` `spec`, `1` a refusal (`RED — <codes>` first, then one fixed hint per code), `2` usage or
an unreadable input. On `0`, `3` and `4` stdout is one JSON line:

```json
{
  "schema": "pharn-grill-triage-verdict/1",
  "verdict": "replan",
  "counts": { "proceed": 4, "replan": 1, "spec": 0 },
  "escalated": ["G1-2"]
}
```

`escalated` lists the ids whose disposition is `replan` or `spec`, in file order. No `reason` is ever printed.

## What the floor holds, and what it does not (P0)

- **Floor (enum/regex, `grill-triage.mjs`):** the shape above; every finding has exactly one disposition, aligned by
  id; each disposition is a member of the three; a `blocking` finding is never `proceed`; the verdict is the function
  above.
- **Floor (content-hash):** `findings_sha256` equals the sha256 the checker computes over the findings file it is
  given, so a triage of another or an older findings file is refused.
- **Agreement, never truth (L43):** both files are written by the run. The checker certifies that they agree with each
  other; it cannot tell whether either is right.
- **Advisory:** every disposition and every reason is a model's judgment over untrusted text. A finding's `severity`,
  which the `blocking` rule reads, is the grill model's assignment. That a stage acts on the verdict is orchestration
  (`/pharn-loop` Step 4), not something this file can force.

## Rounds (7.8.0)

In a full `/pharn-loop`, a `replan` verdict starts a **re-plan round** while one is left: at most **two**, so the plan,
the grill and the triage run at most three times. `pharn/floor/grill-round.mjs` (code half
`pharn/floor/grill-round-core.mjs`) keeps the count:

- `next <name>` — after a `replan` verdict, renames the round's four live files to that round's archives:
  `PLAN.md` → `PLAN.r1.md`, `GRILL.md` → `GRILL.r1.md`, `grill-findings.json` → `grill-findings.r1.json`,
  `grill-triage.json` → `grill-triage.r1.json` for round 1, and the same with `r2` for round 2. Exit `0` names the next
  round; exit `5` means round 3 was the last, so nothing is renamed and the run stops (S16). The eight archive names
  are the whole set: round 3 is never archived.
- `current <name>` — the round the next grill writes (`1 +` the complete archived rounds), and which round a re-plan
  reads: `live` when a live `grill-triage.json` binds to live findings of that round (the state an S16 stop leaves),
  else the newest archive, else none (a first plan).

**What the floor holds (enum/regex):** the cap; the closed archive set, refusing a gap or a partial round; that `next`
runs only on a `replan` verdict over a triage that binds to its findings, whose `round` equals `1 +` the archived
rounds; that no archive is ever overwritten; and links or non-regular files are refused. A failed rename is moved back.
**At write time only:** the archive names are pipeline artifacts, which reconcile exempts, so a later change to an
archive is neither prevented nor detected. **Agreement, never truth (L43):** the counts and bindings agree; nothing
checks that a re-plan fixed what triage escalated — the next grill and triage judge that, and the cap bounds the cost.
A grill that writes a wrong `round` passes its own check; `next` refuses it, but a `proceed` or `spec` verdict over it
never reaches `next`.

## Trust (P2)

`/pharn-triage` reads the grill's `problem` and `evidence`, the plan and the SPEC — all untrusted. Its `disposition`
is enum-gated, but a model chose it after reading that text, so an injected finding can steer it toward `proceed`
(`pharn/THREAT-MODEL.md §5`, the triage channel). The `blocking` rule makes a steer toward stopping the safe direction.
`reason` inherits the untrusted tag: a reader quotes it as DATA and never passes it to a stage as an instruction. The
checker never reads a `reason` for meaning and never prints one. In a re-plan round (7.8.0) `/pharn-plan` reads the
findings and the reasons as DATA and revises the plan from them, so an injected finding can steer a revision as well as
a disposition (`pharn/THREAT-MODEL.md §5`, channel 6); the revised plan meets the same SPEC gate, spec-hash and lessons
checks, a fresh grill and a fresh triage, and the round count is capped.
