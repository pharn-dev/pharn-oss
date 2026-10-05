# REVIEW — front-grill-concurrent (6.45.0)

**Reviewed commit:** `cfb7158`, PR #317.

**Reviewer.** An independent opus agent, run by the orchestrating model under the maintainer's delegation for this
batch, not by the builder. Its findings reached this branch through the orchestrator. They are quoted below as
**DATA**, attributed to that reviewer. The owner decision on each is the orchestrator's, made under the same
delegation.

## Floor gates (blocking)

**FLOOR: 0 findings.** At `cfb7158`: `validate` GREEN; `/pharn-dev-regress` `no-regressions`; `/pharn-dev-verify`
PASS; CI `check` and `floor` pass.

## Advisory findings (reviewer's text quoted as DATA; resolution is the builder's)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-grill.md:105"
  problem: "R2 — the --floor-only grill drops the five deterministic scan-plan-* scanners along with the model-driven grillers; the trade is not named precisely and the rationale overstates (GRILL.md had a reader)."
  evidence: "reviewer (DATA): the --floor-only grill used by /pharn-loop FULL mode must still run the five deterministic scan-plan-* scanners ... only the model-driven grillers (the security griller included) and the interrogation are dropped."
- type: FINDING
  rule_id: "P4"
  severity: important
  file: ".claude/commands/pharn-loop-close.md:288"
  problem: "R1 — the Step 7 summary's `inline (policy)` list omits /pharn-grill, and nothing pins that list to ROUTE_POLICY."
  evidence: "reviewer (DATA): add /pharn-grill to the Step 7 summary's inline (policy) list ... and pin that list against ROUTE_POLICY's policy-inline cells for the loop."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:45"
  problem: "R3 — the saving quotes prefix figures, not the ledger's."
  evidence: "reviewer (DATA): grill stage: 43 requests, cache_write 391,438, cache_read 16,097,324; quick inline grill 8.5 s → ≈352 s saved."
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".claude/commands/pharn-ship.md:160"
  problem: "R4 — in ship, a grill `read` exit 3 (refused) still says 'go on to the stage's own verdict read', but that read now happens before the grill; the pre-grill STOP's ledger and SHIP.md consequences are unstated."
  evidence: "reviewer (DATA): a grill read exit 3 (refused) is a STOP; note ... a pre-grill STOP records stop:pharn-plan and ... SHIP.md's GRILL.md pointer must say 'not written'."
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".claude/commands/pharn-loop.md:448"
  problem: "R5 — wording: 'like the two above' after the grill lost its route lines; --floor-only not threaded through pharn-grill.md's quick closing sentence, Step 3/3b notes, RED-log mode line, and Step 4's 'end your turn' inside an orchestrator."
  evidence: "reviewer (DATA): wording — pharn-loop.md:448 and :265-267; thread --floor-only through pharn-grill.md."
```

The reviewer also confirmed these as fine:

- one policy cell changed;
- `route` prints `inline:floor-only`;
- `check-loop-fresh` check I still re-checks lessons;
- ship's checks-first block is pinned once, with order controls;
- `PLAN_LESSONS_WIRING` stays at 6 by design;
- attribution is recorded as the orchestrator's, under delegation.

## Resolutions — all five fixed (none declined)

- **R2.** `--floor-only` now runs the five scanners through a new, tested `pharn/floor/grill-scan.mjs`
  (`grill-scan.test.mjs`).
  - **How it runs them.** It spawns each scanner as its griller does, checks each output's closed shape, and prints
    one section that the grill copies into `GRILL.md` verbatim. Any failure is exit 2, with nothing on stdout, and
    the grill then writes `scans: NOT run`.
  - **What it prints.** A secrets, PII or i18n hit becomes an advisory finding-shape object, carrying the griller's
    own `rule_id` and the scanner's line. A migrations or observability mention is a plain line, never a finding,
    because a finding there needs the griller's judgment. No plan text is copied into the section.
  - **Quick mode** is unchanged and runs no scans.
  - **The trade** is named in CHANGELOG [6.45.0] and in the `stage-agent-core.mjs` header. The rationale is
    corrected: no stage reads the findings before the build since routing split the contexts, and `GRILL.md` is
    still read afterwards.
  - **`PROTECTED-FOLLOWUPS.md`** gains `LIMITS.md §5` and `THREAT-MODEL.md §1`, each with exact current and proposed
    text.
- **R1.** `/pharn-grill` is now in the Step 7 `inline (policy)` list. A ✧ test derives the expected list from
  `ROUTE_POLICY`'s policy-inline loop cells, with a mutation control.
- **R3.** CHANGELOG and the header quote the ledger figures, confirmed read-only in pharn-starter's `cost.json`:
  - `billing-plan-catalog` grill: 361,044 ms, 43 requests, cache_write 389,148 + 2,290 = 391,438, cache_read
    16,097,324;
  - `locales-en-pl-only` inline grill: 8,517 ms;
  - saving ≈ 352 s, minus one grill-scan request.
- **R4.** In `pharn-ship.md`, a grill `read` exit 3 is now a STOP. The pre-grill STOP says `SHIP.md`'s pointer to
  `GRILL.md` reads "not written". The CHANGELOG records `stop:pharn-plan` for that path.
- **R5.** The wording at `pharn-loop.md` Running-a-stage and Step 4 ("like `/pharn-plan` above") is fixed. In
  `pharn-grill.md`, `--floor-only` is threaded through:
  - the description;
  - `reads:`;
  - the Step 3 and Step 3b notes;
  - the RED-log mode line;
  - the quick closing sentence;
  - the "no finding object" sentence;
  - the claims;
  - an "inside an orchestrator, do not end your turn" line.

## Lesson candidate

**None that clears L20.** R2 is a design-scope correction made once, not a recurring failure.
