---
name: supervisor
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for pharn/features/<name>/SUPERVISOR.json: the decision (proceed-at-risk | stop | amend-spec, the last once per run, 7.10.0) on an escalated full /pharn-loop run, one reason per escalated grill finding, bound to grill-triage.json by its sha256, and when a decision may be made at all. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4). Code half: pharn/floor/supervisor-core.mjs."
---

# Contract — supervisor

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). Enforcers **cite** it and
> **conform** to it; they do not restate its semantics (P4). The principles (P0, P2, P5) live in
> `pharn/CONSTITUTION.md`; the floor primitives in `pharn/ARCHITECTURE.md §2`.

## Why it exists (P7 — a recorded failure, not a hypothetical)

Every full loop measured at 7.7.0 escalated (`.dev/features/loop-grill-triage/TRIAGE-CHECK-MEASUREMENT.md`). Since
7.8.0 a `replan` escalation gets up to two re-plan rounds, but a `spec` verdict, or a `replan` still standing after the
last round, stopped the run for a person (S16), so an unattended run could not end an escalation in a decision. The
supervisor gives it one: a fresh agent, not the orchestrating session, decides whether the run goes on with every
escalated finding named as a risk, or stops. Since 7.9.0 a full `/pharn-loop` runs `/pharn-supervise` on an escalation
and nowhere else.

## When a decision applies

Only on an **escalation**: the live `grill-triage.json`'s verdict (`grill-triage.md`, "The verdict") is `spec`, or it
is `replan` and the complete round archives number `REPLAN_CAP` (`grill-triage.md`, "Rounds (7.8.0)"), so no re-plan
round is left. On any other verdict there is nothing to decide, and `supervisor.mjs` refuses (`not-escalated`).

## The file

`pharn/features/<name>/SUPERVISOR.json`, written by `/pharn-supervise` only (its `writes:` holds this path and no
other — never the findings, the triage, a plan, the SPEC or a round archive):

```json
{
  "schema": "pharn-supervisor/1",
  "round": 3,
  "triage_sha256": "<64 lowercase hex: the sha256 of grill-triage.json's bytes>",
  "decision": "proceed-at-risk",
  "reason": "<one line: why this decision>",
  "risks": [{ "id": "G3-2", "reason": "<one line: why this finding can stay open, or why it stops the run>" }]
}
```

- **Closed keys**, top level and per risk; no key repeated at any depth.
- `round` equals the live `grill-findings.json`'s `round`.
- `triage_sha256` is the sha256 of the live `grill-triage.json`'s bytes, so a decision over an edited or another triage
  is refused.
- `decision` is one of `proceed-at-risk`, `stop` or `amend-spec` (7.10.0); `amend-spec` is refused (`amend-used`) once
  the run's `SPEC.a1.md` exists.
- `risks` holds **one element per escalated finding id**, in the order `grill-triage.mjs check` prints them (every
  disposition that is not `proceed`, in findings order): `risks[i].id` equals the i-th escalated id. An escalation always
  has at least one, so `[]` is refused.
- Every `reason` is one non-blank line of 1–2,000 characters with no control character.

## The decision

- `proceed-at-risk` — the run goes on to the test stage with every escalated finding left open. The finding ids are the
  run's **KNOWN RISK**: `supervisor.mjs check` prints them as `known_risk`, `pharn/floor/loop-closeout.mjs` names them
  in the green commit's message (ids, a count and the slug only), and `pharn/floor/render-run-report.mjs` lists them
  with their text in `RUN-REPORT.md`'s `## Known risk`.
- `stop` — the run stops for a person (`/pharn-loop` S16, `blocked: grill-escalation`); `known_risk` is `[]`.
- `amend-spec` (7.10.0) — the SPEC gains acceptance criteria and the front runs again ("Amend-spec", below);
  `known_risk` is `[]`.

## The checker — `pharn/floor/supervisor.mjs`

```bash
node pharn/floor/supervisor.mjs skeleton <name>
node pharn/floor/supervisor.mjs check <name>
```

Both re-derive, every call, what the decision is checked against: the findings (`grill-findings-core.mjs`), the
triage against those exact bytes (`grill-triage-core.mjs`), the archive count (`grill-round-core.mjs`) and the
escalation precondition, and whether `SPEC.a1.md` exists. `check` exits `0` (`proceed-at-risk`), `3` (`stop`) or `4`
(`amend-spec`) with one verdict line
`{schema: "pharn-supervisor-verdict/1", decision, round, known_risk}`; `1` with `RED — <codes>` first, then one fixed
hint per code; `2` on usage or a file that cannot be read, `SUPERVISOR.json` absent included. Output names codes,
indexes and ids — never a reason or any finding text.

## Amend-spec (7.10.0)

At most once per run, and only in a full `/pharn-loop`. `pharn/floor/spec-amend.mjs` (pure half
`pharn/floor/spec-amend-core.mjs`):

- **`begin <name>`** requires a `SUPERVISOR.json` that checks as `amend-spec` and no amend name present. It copies
  `SPEC.md` to `SPEC.a1.md` and renames each present round file — `PLAN.md`, `GRILL.md`, `grill-findings.json`,
  `grill-triage.json` and the eight round archives (`grill-triage.md`, "Rounds (7.8.0)") — and `SUPERVISOR.json` to its
  `.a1` name (`X.ext` → `X.a1.ext`). The fourteen names are `AMEND_NAMES`. Moving the archives aside restarts the round
  count at 0; moving `SUPERVISOR.json` aside means the closeout never reads the pre-amend decision. A failed rename is
  undone, the copy removed (`rename-failed`), or reported when an undo fails too (`rename-partial`).
- **`status <name>`** prints `none` (no `SPEC.a1.md`), `pending` (`SPEC.md`'s acceptance criteria still equal
  `SPEC.a1.md`'s: nothing appended yet) or
  `applied`. `SPEC.a1.md` and `SUPERVISOR.a1.json` exist together or not at all (`partial-archive`).
- A routed `/pharn-spec --model-approve` reads `pending` and appends criteria (`/pharn-spec` Step 1a); its `writes:` is
  `SPEC.md` alone, so it cannot write the archive it is checked against.
- **`check <name>`** holds the amend append-only: `## Intent` and `## Scope` identical, line for line, to
  `SPEC.a1.md`'s; the archived `## Acceptance Criteria` lines a prefix of the new section's; every archived criterion at
  its position with its id, lines and verify level; at least one criterion added; `SPEC.md` Approved and pinned
  (`check-spec-approved.mjs`). Exit `0` prints `{schema: "pharn-spec-amend-check/1", added: [AC ids], kept}`.
- Then the front runs again from `/pharn-plan`. The green commit names the added ids
  (`spec amended once on the supervisor's decision: added AC-7 — see pharn/features/<name>/SPEC.a1.md`), and
  `RUN-REPORT.md`'s `## SPEC amendment` lists their lines, fenced. Any non-zero exit in the branch is `/pharn-loop` S18
  (`blocked: spec-amend-red`), except the re-run spec stage's `stage-agent.mjs finish` exit `6`, which is S9b
  (`blocked: stage-outlived-wait`) as at every routed stage (7.10.1).
- Refusals print codes and AC ids, never criterion or finding text.

## What holds, and what does not

- **Floor (enum/regex, with the content-hash's kind for the digest):** the closed keys, the decision enum, the
  index-aligned coverage of every escalated id, the reason bounds, the binding to the triage bytes, and that a decision
  is checked only on an escalation; one `amend-spec` per run (over `SPEC.a1.md` on disk); the amend's append-only rule.
- **Bounded:** "once per run" holds at write time only. A Bash `rm` of `SPEC.a1.md` is neither prevented nor detected
  (the `.a1` names are pipeline artifacts reconcile exempts).
- **Agreement, never truth (L43):** the escalation precondition reads the triage verdict and the archive count, both
  written by the run; the check says they agree, never that the re-plan rounds really ran or that triage was right.
- **Advisory:** the decision and every reason — one model upholding or overruling another model's escalation
  (`pharn/LIMITS.md §1d`) — and whether the criteria an amend adds answer the findings. That `/pharn-loop` acts on the exit code is its orchestration.

## Trust (P2)

`/pharn-supervise` reads the SPEC, the plan, the grill's findings, triage's reasons and every round archive — all
untrusted. Its `decision` is enum-gated, but a model chose it after reading that text, so an injected finding can steer
it toward `proceed-at-risk` (`pharn/THREAT-MODEL.md §5`, channel 6). What bounds it: the floor above, and that every
carried id is named in the commit message and `RUN-REPORT.md`, where a person reads it before merging. The same holds
for an amend: the added criteria are written from the same untrusted findings, so they can be steered; the append-only
rule bounds what they can change, and every added id is named in the commit message and `RUN-REPORT.md`. Every `reason`
inherits the untrusted tag: a reader quotes it as DATA and never passes it to a stage as an instruction. The checker
never prints one, and the commit message never carries one.
