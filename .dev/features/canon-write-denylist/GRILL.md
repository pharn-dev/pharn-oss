# GRILL — canon-write-denylist

**Plan:** `.dev/features/canon-write-denylist/PLAN.md` ·
**Spec-hash check:** `sha256(pharn/ARCHITECTURE.md)` recomputed = `bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299` — **matches** the plan's
`spec_content_hash`; no drift (surfaced here, blocking only at `/pharn-dev-build`). ·
**Step 1b (FLOOR — the one deterministic stop):** `node pharn/floor/check-plan-lessons.mjs …` → **exit 0,
GREEN** — all 12 cited ids resolve in `.dev/memory-bank/lessons-learned.md` and each is referenced in the
plan body. Reported as its own floor verdict; deliberately **not** folded into the concern counts below.

**Deterministic plan scanners (Layer-1 floor of five grillers), all run over the plan this run:**

```text
scan-plan-secrets        {"found":false,"hits":[]}
scan-plan-pii            {"found":false,"hits":[]}
scan-plan-i18n           {"found":false,"hits":[]}
scan-plan-migrations     {"mentions":false,"hits":[]}
scan-plan-observability  {"mentions":false,"hits":[]}
```

**Griller membership (FLOOR — `count-grillers.mjs`, frontmatter only):** `{"registered":13}` — a11y,
architecture, comprehension, coupling, documentation, error-handling, i18n, migrations, observability,
performance, privacy, security, testability. Each axis was applied inline (the live isolated runner is
deferred, P7). Axes producing no finding: a11y, coupling, i18n, migrations, performance, privacy,
observability, comprehension — the increment is a Node stdlib pre-write hook with no user-facing surface,
no data model, no locale/PII/telemetry dimension.

---

## Findings

```yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".dev/features/canon-write-denylist/PLAN.md:114"
  problem: "The plan's own header comment in the file it edits will become FALSE, and the plan does not list that line as a site to repair — protect-trusted-paths.cjs:88 asserts the two guards are independent, which this increment ends."
  evidence: "PLAN.md:114 'the finding's exact vector is closed **structurally**, not by discipline.' vs the live line `.claude/hooks/protect-trusted-paths.cjs:88`: 'Composes with set-writes-scope.cjs … The two are independent: this denylist holds no matter what scope was set, so neutering the setter's refusal still does not make a control file writable.' After this increment the denylist CONSULTS the scope record for canon paths, so 'holds no matter what scope was set' is false for the canon branch and 'the two are independent' is no longer unqualified."

- type: FINDING
  rule_id: P6
  severity: blocking
  file: ".dev/features/canon-write-denylist/PLAN.md:46"
  problem: "The plan's ## Files doc-site enumeration is a lower bound that a second, independent substring immediately beat — two expiring sites are missing, which is precisely the failure L33 prescribes against."
  evidence: "The plan derived its site list from `grep -rn canon-write-denylist` (three code sites). A second sweep on the shortest invariant substring `ungated` this run additionally returned `.claude/commands/pharn-dev-ship.md:22-24` ('silently granting /pharn-dev-ship the direct, ungated canon write … The canon path is reachable ONLY by invoking /pharn-dev-memory-promote, which declares it itself') and `.dev/floor/command-hygiene.test.mjs:451` ('ungated canon write that check-provenance + the human accept exist to withhold. That is L7's own …'). Neither appears in ## Files, so the fix #7 scope would DENY repairing them."

- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/canon-write-denylist/PLAN.md:100"
  problem: "The escape gives protect-trusted-paths.cjs a second reason to change — it now depends on the RECORD SHAPE that set-writes-scope.cjs emits — and the plan neither names that new coupling nor pins it."
  evidence: "PLAN.md:100-104 requires `.pharn/writes-scope.json` to parse to an object with `set_by` and a one-entry `scope`. That shape is produced at `set-writes-scope.cjs:353` (`const record = { scope, set_by: file, set_at: … }`). Nothing today asserts the two agree, so a future rename of `set_by` would silently return the canon guard to fail-closed-always — breaking both promote commands with no failing test."

- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/canon-write-denylist/PLAN.md:103"
  problem: "Escape condition (3) hard-codes 'a scope of exactly one entry', which is a property of the two promote commands' CURRENT frontmatter rather than of the escape — a second `writes:` entry added later would silently make canon unwritable."
  evidence: 'PLAN.md:103 ''its `scope` is an array of exactly **one** string''. Both promote commands declare a single placeholder (`writes: ["memory-bank/<canon-file>"]`, `writes: [".dev/memory-bank/<canon-file>"]`) which `--target` resolves to 1 path — but `enforce-writes-scope.test.cjs:220-224` shows a 2-entry `writes:` resolving to a 2-path scope, so the invariant lives in the commands, not in the checker. L3''s remedy (audit every declaration when a field becomes load-bearing) and L7''s (''pin the resolved scope with a test'') both apply and neither is in the plan.'

- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/canon-write-denylist/PLAN.md:49"
  problem: "CANON_INODES answers no observed failure — creating a hard link requires Bash, and an actor with Bash can append to canon directly — so its trigger must be stated honestly rather than left to read as failure-driven."
  evidence: "PLAN.md:49 lists 'CANON_INODES (hard-link aliases of the four named canon files)'. The plan's own P7 section cites two observed occurrences for the DENYLIST (L7, L20); neither is a hard-link alias. The honest trigger is parity with the existing PROTECTED_INODES coverage on the trusted docs plus L31 (a copy-pair's second half is where the obligation is dropped) — the repo already has a precedent for recording a non-failure trigger plainly (check-plan-lessons sub-check D, 'the maintainer's explicit direction, NOT an observed failure')."

- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/canon-write-denylist/PLAN.md:216"
  problem: "The plan says the canon deny message quotes no untrusted content, but does not forbid a future edit from adding the record's set_by to it — and this hook, unlike enforce-writes-scope.cjs, has no asData() control-character fold."
  evidence: "PLAN.md trust audit: 'The canon deny message quotes no untrusted content: it prints the blocked path … and two fixed remedies.' `enforce-writes-scope.cjs:231-247` implements `asData()` precisely because a record field can forge a line in a deny message; `protect-trusted-paths.cjs` has no equivalent, so the no-record-text property is load-bearing and currently unasserted."

- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/canon-write-denylist/PLAN.md:114"
  problem: "'Closed structurally' is stated without its qualifier in the design section, where a reader stops — the qualifier arrives only in the following paragraph."
  evidence: "PLAN.md:114 'the finding's exact vector is closed **structurally**, not by discipline.' The true claim is narrower and should carry its scope in the same sentence: closed for a `## Files` declaration consumed by `--from-plan`, on the Write/Edit/MultiEdit/NotebookEdit surface only."
```

---

## Prose summary

The plan's diagnosis is grounded (the `EXIT=0` probe is real and reproduced above) and its P7 trigger is
genuinely met by two prior canon-write grants already in canon (L7, L20) rather than manufactured. Its
guarantee audit is unusually candid — it strikes "canon cannot be written", and it explicitly refuses to
claim a non-self-grantable escape it did not find. That refusal is the right call and should survive to
the CHANGELOG and PR body intact.

Two concerns are blocking-severity and share one root: **the plan under-enumerated what this change makes
false.** It repairs three expiring sentences and misses at least three more — including one **inside the
file it edits** (`protect-trusted-paths.cjs:88`, "the two are independent … no matter what scope was
set"), which is the sharpest possible instance of L33 and of L25's "a rationale comment is trusted for the
defects it does NOT name". The plan cites both lessons. That the second sweep beat the first
enumeration within one command is itself the evidence L33 asks for.

The two `important` findings are about the escape's **contract with its neighbour**: it now reads a record
shape another hook writes, and it encodes a one-path assumption that lives in two command files rather
than in the checker. Neither is wrong today; both are unpinned, which is the shape L3 and L7 each name
from opposite directions.

Nothing here challenges the increment's core design. The denylist belongs in this hook (it is the one that
already case-folds, strips Windows trailing dot/space and resolves symlinks segment-wise), the escape's
argv-origin property is real, and its bound is stated rather than sold.

**ADVISORY VERDICT: 7 concerns raised (2 blocking-severity, 5 advisory) — for the human to weigh before
`/pharn-dev-build`.** The severities are this griller's own assignment (fix #3) and gate nothing; the only
deterministic stop in this stage is the Step 1b result reported in the header, which was GREEN. "A grill
was produced" never means "the plan is good" (P0).
