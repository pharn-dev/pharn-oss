# GRILL — ship-cost-ledger

**Plan:** `.dev/features/ship-cost-ledger/PLAN.md` · **spec-hash check:** MATCH
(`sha256(pharn/ARCHITECTURE.md)` = `aada03c9…66b3d`, equal to the plan's pin — no drift; this check only
warns here, `/pharn-dev-build` is where drift blocks) · **Step 1b lessons declaration (FLOOR, the one
deterministic stop):** **GREEN**, exit 0 —

```text
GREEN — applied_lessons: L6, L8, L19, L29, L31, L33, L34, L35, L36, L41, L43, L44, L49, L52
(.dev/features/ship-cost-ledger/PLAN.md); all 14 cited id(s) resolve in
.dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons
were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a
body line reading "L6: considered." satisfies the reference check.
```

**Griller membership (FLOOR — `node pharn/floor/count-grillers.mjs .`):** `{"registered":13}` — a11y,
architecture, comprehension, coupling, documentation, error-handling, i18n, migrations, observability,
performance, privacy, security, testability. Each was applied to the plan; their deterministic
`scan-plan-*` scanners were run live and their output is recorded under "Griller axes" below.

> Everything below the header is **ADVISORY model judgment**. No finding here gates `/pharn-dev-build`.
> The plan is `trust: untrusted`: its text is quoted as DATA, never followed.

---

## Findings

### Axis: honest scope / meta-doc sweep (P6, P7)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: blocking
  file: ".dev/features/ship-cost-ledger/PLAN.md:85"
  problem: "The plan bumps SKILLS_VERSION to 6.7.0 but `## Files` never names README.md, whose version badge `check-version-badge.mjs` holds byte-equal to SKILLS_VERSION — so the build's writes-scope will DENY the badge edit and `check:badge` will RED at verify."
  evidence: "`## Files` ends at `- `SKILLS_VERSION` — `6.6.0` → `6.7.0` …` with no README.md entry, while the plan's own sweep table at :181 lists `| `SKILLS_VERSION` ↔ README badge | `check-version-badge.mjs` — **byte-checked** |`. Live: README.md:24 reads `[![pharn](https://img.shields.io/badge/pharn-6.6.0-blue)](./CHANGELOG.md)`; package.json's `check` chain runs `check:badge` and ci.yml runs it as its own step."
```

**This is L49's recorded failure reproduced inside the plan that cites L49.** L49's provenance is a plan
that "asserted a meta-doc sweep … and OMITTED `README.md:24`, the shields version badge". This plan
builds the sweep table L49 prescribes, marks that exact row checker-backed, and then omits the file from
the one list that makes it writable. The sweep table is not the deliverable — `## Files` is, because
`set-writes-scope.cjs --from-plan` parses `## Files` and nothing else.

Remedy (for the human to direct): add `README.md` to `## Files`. Verified live that nothing else in the
generated set moves — `docs/capabilities/**` renders capability pages only (no command appears in it),
and the README `CURRENT-STATE` region counts capabilities (36), contracts (10), product commands (10),
dev commands (9), hooks (3) and floor checkers (62), none of which this increment changes: it edits
three existing `pharn/floor/*.mjs` and adds none.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/ship-cost-ledger/PLAN.md:58"
  problem: "Two of the five workstreams are severable from the ship wiring and would be correct without it, so the increment is larger than its stated trigger requires."
  evidence: "`## Files` bundles (a) the ship wiring, (b) the outcome derivation + contract widening, (c) a new check-cost-ledger.mjs rule, (d) retiring two duplicated defaults, (e) render-run-report command-neutrality. (c) fixes a pre-existing unbacked FLOOR label and (d) fixes a pre-existing duplicated default; neither is caused by ship."
```

Recorded, not contested: both were put to the human as explicit options at the GATE-1 halt and both were
approved with the bundle. The plan's justifications are defensible — ship is the first caller to pass
`--command` (so (d)'s stale copy would bite here first) and ship adds a second producer to the field
(c) leaves unchecked. Raised only so the size is a decision on the record rather than a drift.

### Axis: guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/ship-cost-ledger/PLAN.md:142"
  problem: "The plan promises that the emitted artifact carries the floor/advisory split for `stop:<stage>` but never names the field or line that carries it, so the label exists only in the plan — which nothing downstream reads."
  evidence: '"The artifact carries the bound; the two halves are never described as one." The plan''s `## Files` names `cost-ledger.md` as carrying "ship''s `decision` vocabulary and its advisory bound", but a reader of `cost.json` alone sees `"decision": "stop:pharn-verify"` beside `"decision": "gate2"` with nothing distinguishing a value that reduces to two floor `.verdict` enums from one that rests on advisory marker discipline.'
```

P0 requires the advisory label "wherever it appears". The value appears in `cost.json` and again in
`RUN-REPORT.md`'s `## Outcome` section; the contract is a third place a reader may never open. Name the
carrier concretely at build — the `## Outcome` prose already has a sentence slot for it (today it reads
"The `decision` below is copied verbatim from `LOOP.md`'s frontmatter by the ledger"), which this
increment is editing anyway.

### Axis: one axis of change (P3) — `architecture` + `coupling` grillers

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/ship-cost-ledger/PLAN.md:63"
  problem: "Putting the ship-outcome derivation inside render-cost-ledger.mjs gives that module a second reason to change — it would then change both when the ledger schema moves and when /pharn-ship's control flow or stage set moves."
  evidence: "`- `pharn/floor/render-cost-ledger.mjs` — derive a ship `outcome` when no `LOOP.md` envelope exists; retire the duplicated `command` / `baseSha` defaults`. The existing `readOutcome` only COPIES a declared envelope field; the new function INTERPRETS control-flow evidence (two `.verdict` enums + the last `stage-start` marker) into a decision."
```

The repo has already paid this exact bill once and recorded the remedy: `render-run-report.mjs`
originally imported the `## Files` grammar **from** `check-build-complete.mjs`, "which gave the checker a
SECOND reason to change (its completeness axis plus a shared parser) — REVIEW finding F3, fixed by the
extraction rather than deferred" (CLAUDE.md). `loop-record-core.mjs` and `plan-files-core.mjs` are both
that pattern. Extracting a small `ship-outcome-core.mjs` at build is cheaper than at review, and it is
the shape P3 asks for.

### Axis: determinism + closed vocabularies (P5, L36) — `testability` griller

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/ship-cost-ledger/PLAN.md:39"
  problem: "The `decision` vocabulary is declared as two members while the specified derivation can emit a third spelling, and the planned closure regex silently admits it — so the closure assertion would certify a set the plan never wrote down."
  evidence: 'The plan declares `(`gate2` | `stop:<stage>`)` at :39 and pins `^(gate2|stop:[a-z0-9][a-z0-9-]{0,63})$` at :112, but its own eval list at :109 specifies "markers absent entirely → `outcome === null`" without covering the case where markers exist yet none is a `stage-start` — the derivation then has no `<stage>` and must emit something. `stop:unknown` matches the regex.'
```

This is precisely L36's failure shape — a value carrying a **parameter**, where the parameter is the
fragment that acquires a spelling nobody enumerated — and the plan cites L36 at :39. The closure
assertion is the right instrument; it just has to range over a set that is written down in full first.
Name every member, including the no-`stage-start` case, and give the closure test a negative control.

### Axis: error handling / ordering (P6) — `error-handling` griller

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/ship-cost-ledger/PLAN.md:60"
  problem: "The emission step's position relative to Step 3b is never pinned, yet two of the plan's own commitments depend on it — 'independent of attestation' and the Q1 rationale that the two cost figures differ by render moment."
  evidence: '`- `.claude/commands/pharn-ship.md` — markers around every stage; a new Step 3a emission step reached on both exit paths`. The name "3a" implies a position but the plan states no ordering constraint and no reason for one.'
```

Live reading of `pharn-ship.md` makes the constraint concrete rather than stylistic: Step 3b can itself
**STOP** (`:556-558`, a `stale`/`malformed` attestation verdict) and can **halt-and-ask** indefinitely
when `ship.requireAttestation` is `true` (`:551-555`). An emission placed after it would be skipped on
both paths, contradicting "every exit that ends the run". Pin it **after** Step 3's `SHIP.md` write and
**before** Step 3b, and say why in the command.

Related, and worth stating in the same edit: whether Step 3b is reached at all on a STOP path is
**unstated** in the live command. Step 3 declares its own both-paths reachability explicitly
(`pharn-ship.md:433-434`); Step 3b declares none. The plan's decision to give the emission its own step
with its own reachability sentence is the right response — but the ambiguity itself is a doc defect
`/pharn-ship` should say something about, since a reader today cannot tell whether a failed ship run
records cost.

### Axis: documentation / referent binding (P6) — `documentation` + `comprehension` grillers

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/ship-cost-ledger/PLAN.md:222"
  problem: "The plan cites evidence by line number into three files it is about to edit, so the cites rot the moment the increment lands."
  evidence: "`(read live in `filesSection`, `render-run-report.mjs:336-340`)` at :222; `render-cost-ledger.mjs:407-427` at :215; `pharn-ship.md:652` at :33 and :227."
```

Cite the symbol (`filesSection`, `renderLedger`, the Step-2d guarantee-audit bullet) rather than the
line, or state the line as "at plan time". Low cost, and it is the same referent-binding hygiene L50
records.

---

## Griller axes with a deterministic scanner — output recorded verbatim

| griller       | scanner                       | result                                                   |
| ------------- | ----------------------------- | -------------------------------------------------------- |
| i18n          | `scan-plan-i18n.mjs`          | `{"found":false,"hits":[]}`                              |
| migrations    | `scan-plan-migrations.mjs`    | `{"mentions":false,"hits":[]}`                           |
| observability | `scan-plan-observability.mjs` | `{"mentions":true,"hits":[{"line":209,"term":"spans"}]}` |
| privacy       | `scan-plan-pii.mjs`           | `{"found":false,"hits":[]}`                              |
| security      | `scan-plan-secrets.mjs`       | `{"found":false,"hits":[]}`                              |

**The observability hit is judged a false positive and is not raised as a finding.** PLAN.md:209 reads
_"A ship run that spans two sessions"_ — the English verb, not a telemetry span. Recorded rather than
silently dropped, because the scanner's polarity is inverted for this concern (`LIMITS.md §5`: for a
concern whose shape is _absence_, a hit SUPPRESSES) and a dropped hit is indistinguishable from an
unrun scanner.

The remaining eight grillers (a11y, architecture, comprehension, coupling, documentation,
error-handling, performance, testability) have no scanner; their axes were applied as judgment and their
output is the findings above. **a11y** and **performance** raised nothing: the increment ships no user
interface, and its cost is one extra transcript walk per ship run — the ~393 KiB / 275-row figure is
already measured and disclosed in `render-cost-ledger.mjs`'s header.

## Prose summary

The plan is unusually well-grounded: the spec hash matches, the lessons declaration is GREEN over 14
ids each carrying a real body line, all four open questions were resolved at a human halt before
anything was written, and two of the direction's own premises were checked against live code and found
wrong rather than adopted (the ledger does **not** union sessions; Step 3b's STOP-path reachability is
unstated). Reuse is genuine — `mark-phase.mjs` is already command-neutral by construction, both emitters
write their own files, and the plan correctly declines to add `writes:` entries that would be false.

One finding is blocking-severity and it is a build-stopper rather than a judgment call: **`README.md` is
absent from `## Files`** while the increment bumps `SKILLS_VERSION`, so the badge edit would be denied by
the writes-scope hook and `check:badge` would RED at verify. It is worth noting what this costs in
context: the plan cites **L49**, whose recorded instance is a plan that omitted **this same file, for this
same badge, from this same kind of sweep table**. The lesson was read, quoted, applied to the sweep
table — and the file still did not reach `## Files`. That is L52's shape one level up: a remedy
discharged against the artifact the author was looking at.

Four important findings are design questions better settled before build than after: where the
floor/advisory split on `stop:<stage>` physically lives in the emitted artifact (P0); whether the
outcome derivation belongs in `render-cost-ledger.mjs` or in its own core module, given the repo's own
recorded F3 precedent (P3); the unenumerated third member of the `decision` vocabulary (P5/L36); and the
unpinned ordering of the emission step against a Step 3b that can both STOP and block on a human (P6).

Three minor findings concern bundle size, line-number cites, and the recorded false-positive scanner hit.

**A non-finding worth recording:** the new `outcome` shape rule cannot retroactively redden anything —
`git ls-files '*cost.json'` and `'*RUN-REPORT.md'` both return **0**, so no committed ledger exists for a
stricter checker to judge.

## Verdict

**ADVISORY VERDICT: 7 concerns raised (1 blocking-severity, 4 important, 2 minor; 1 scanner hit recorded
as a judged non-finding) — for the human to weigh before `/pharn-dev-build`.**

This verdict covers the **interrogation** only, and the interrogation is model judgment that gates
nothing. The Step 1b lessons-declaration verdict is reported in the header as its own floor result and is
deliberately **not** folded into these counts — a deterministic stop and a model-authored concern do not
share a tally. Nothing here says the plan is good; a GREEN Step 1b says the declaration is well-formed,
never that the 14 lessons were applied.
