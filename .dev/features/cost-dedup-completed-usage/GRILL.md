# GRILL — cost-dedup-completed-usage

Plan: `.dev/features/cost-dedup-completed-usage/PLAN.md`. GATE 1: approved as written by the maintainer through the
approval form on 2026-09-26, with identity and timestamp taken from a request's FIRST line.
Spec-hash check: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` printed
`4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, which **equals** the plan's `spec_content_hash`.
**Step 1b lessons-declaration verdict (FLOOR): GREEN**, exit 0. Verbatim:

```text
GREEN — applied_lessons: L1, L33, L35, L39, L43, L47, L50, L52, L55, L58, L60 (.dev/features/cost-dedup-completed-usage/PLAN.md); all 11 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L1: considered." satisfies the reference check.
```

That verdict covers the declaration only. Everything below is advisory (fix #3).

**Method, and its weakness stated first.** This grill ran in the same session that wrote the plan, so it is not an
independent reader. To offset that, the plan was treated as `trust: untrusted` and its claims were probed, not
re-read (L37). Probes are read-only scripts in the session scratchpad. They read numeric usage fields, ids,
timestamps and `stop_reason` from the local transcripts, and never message content. They also read the live
modules and tests and ran the five `scan-plan-*` scanners. No repo file other than this one was written.

## Findings

### Guarantee audit and honest wording (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:285"
  problem: "The advisory claim's supporting count is wrong: in the renderer's own walk order THREE requests' output counts fall, not two. The early-line fork copy falls from 16,886 to 9 once the parent's lines are walked and the subagent files follow them. The '2' came from an earlier measurement run that read files in readdir order, not sorted. Measured in sorted walk order: req_011CfLcrrwyg 2565×3 then 0×6; req_011CfLwrYq2N 522 then 0; req_011CepD5FppC 16886×17 then 9×4. The rule handles all three, so the conclusion stands; the sentence does not. If this count is copied into the renderer's header or the contract, it becomes a stale count exactly where L47 says not to put one."
  evidence: "Observed on all 44,253 requests; the only two whose counts ever fell are the zeroed re-appends, which the rule handles."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:92"
  problem: "'counts once, under the parent's identity' is a universal that holds only when the parent's file is walked first. It is true for a top-level parent, because `<sid>.jsonl` sorts before `<sid>/…`, and for all 17 observed copies. A fork of a SUBAGENT whose own file sorts before the original's (agent-X copying agent-Y with X < Y) would take the copy's identity. Qualify it: under the identity of whichever copy is walked first, which was the parent's for every observed copy."
  evidence: "which the grouping counts once, under the parent's identity"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:101"
  problem: "'The other four classes are exact' states a measurement as a universal. What was measured is that input, cache read and both cache-write classes summed equal under the first-line and max rules over the 2026-09-26 corpus. Lines of one request CAN disagree in those classes too: a zeroed re-append has input and cache-read 0, and its cache-write split (764) disagrees with its own zeroed total. The first line was never such a line in the corpus. Say 'were equal on every measured request', dated, in the contract and the CHANGELOG."
  evidence: "The other four classes are exact."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:102"
  problem: "The RED statement is unqualified. `--verify-transcript` declines a legacy `/1` ledger with a WARN (check-cost-ledger.mjs, the `legacy` branch), and a `/2` ledger whose run window holds no request with disagreeing lines re-derives exactly and stays GREEN. The RED fires only for a `/2` ledger whose window contains at least one such request. The contract and CHANGELOG should say so, or a reader will expect every old ledger to go red."
  evidence: "While the transcript exists, it REDs such a ledger on totals, and that RED is true"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:105"
  problem: "`skills_version` is a hint, not proof of which rule ran. `readSkillsVersion` copies `pharn.config.json`'s `skillsVersion`, else this repo's `SKILLS_VERSION`. Both record the configured version, not the bytes of the emitter that executed: a hand-copied or partially updated install can disagree with its own config. Label it advisory: the field indicates which rule most likely wrote the ledger."
  evidence: "The ledger's `skills_version` says which rule wrote it."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:217"
  problem: "The fixture's provenance sentence is exact for A, B and C, but D and E are ordinary lines with chosen round numbers, not copies of measured records. State it the way `with-subagents/` does: hand-authored from the observed record shape, with A–C's numbers taken from measured records and D–E's chosen."
  evidence: "numbers are copied from them, and envelopes are reduced to the fields the readers use"
```

### Sweep completeness (P6, L33)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:324"
  problem: "The claim sweep missed one variant spelling. `pharn/floor/render-cost-ledger.test.mjs:129`, in the existing 'one row per DEDUPED requestId' test, reads 'The same response written three times, as the platform really does it.' under a fixture of identical lines. That sentence asserts the expired behaviour: the platform does NOT always write the same usage three times. The file is already in `## Files`, so the fix costs one comment edit. Reword it to say what the test pins (identical lines collapse to one row) without claiming that is the platform's only shape."
  evidence: "Apparatus hits: `render-cost-record.test.mjs:6` and `:239`; `token-cost-2026-08-18.md:33-36` and `:347`."
```

### Test design (P1, L55, L60)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:265"
  problem: "The one-owner closure test counts TEXT occurrences, so its two patterns also match comments. The plan rewrites `render-cost-ledger.mjs`'s header to cite the owner, and a natural sentence there ('the ledger no longer reads message.usage itself') would turn the test red on prose. Either keep both spellings out of every other module's comments and say so in the test's failure message, or strip `//` comment lines before matching. In both cases, run the negative control through the SAME predicate the positive check uses, over a source string holding the pre-fix line."
  evidence: "exactly one module reads `message?.usage` / `message.usage`, and exactly one spells the id fallback `requestId ??`"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:273"
  problem: "Hand-editing A's row to 'its first line's usage and tokens' certifies the author's model of what the old emitter wrote (L55). To reproduce what a pre-6.22.1 emitter actually emitted, build the row's `usage` and `tokens` by running the emitter's own exported `sanitizeUsage` and `normalizeTokens` over the fixture's raw first line of A. Then recompute the views with `buildViews`. The numbers are then derived by the code that wrote old ledgers, not typed."
  evidence: "A's row is rewritten to its first line's usage and tokens, and the views are recomputed so the file agrees with itself"
```

### Architecture fit (P3)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:85"
  problem: "The P3 answer is right about the reader and silent about the file. The reader changes for the same reason as the lookup and the walk (how the platform writes transcripts). But `render-cost-record.mjs` already carries a SECOND reason: the `pharn-cost-record/1` block (`render()`, `SCHEMA`, `COVERAGE`, the CLI). This increment makes the ledger depend on it more heavily. Say that the file stays two-axis, and put the extraction trigger ('a third consumer moves the reader into a core module') into the header itself, where the next author will read it (L25)."
  evidence: "The reader changes for the same reason they do: how the platform writes transcripts. A third consumer would be the time to extract a core; none exists."
```

### Privacy (P2)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:22"
  problem: "The new measurement record is committed, and the measurements it reports come from paths under the maintainer's home directory: project directory names carry the username. Follow the precedent in `cost-record-lookup-2026-09-21.md` (`-Users-…-`, `…/` prefixes). Quote no absolute home path and no username-bearing directory name. Session and request ids are opaque and may stay, abbreviated as the plan already does."
  evidence: "`…/9a44eb3f…/subagents/agent-ac9a6c6d0cb423fc9.jsonl`, whole file as of 11:22 today"
```

### Scope and size (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:96"
  problem: "One visible effect is not named. For a request whose lines disagree, the ledger row's verbatim `usage` becomes the completed line's object, which carries keys the early line lacks: `output_tokens_details`, `server_tool_use`, `iterations[]` and `speed`. New ledgers therefore grow by those keys per such row. The contract's 'Size' section is dated and stays true as dated, but the CHANGELOG entry should say the row's `usage` is now the completed line's, so a reader diffing an old ledger against a new one is not surprised."
  evidence: "No schema, `dedup_key` or contract shape changes, so this is a PATCH (6.22.1)"
```

## Claims tested and found true (so the findings above are not read as the whole picture)

- **The max rule's core assumption.** A probe over every local transcript (44,734 requests at probe time) asked
  whether the largest-output line carries the completed message's `stop_reason`. It does on every one of the 35,007
  requests that carry a `stop_reason` on any line. No line with a `stop_reason`, other than a zeroed re-append, reads
  below its request's maximum. The other 9,727 requests carry no `stop_reason` on any line, so for them the maximum
  is the only signal available. This is the strongest evidence for D1's advisory assumption. The measurement record
  should carry it, and the header can cite it without a count.
- **Trigger numbers.** Re-derived from the rule-comparison run:
  - last-line loses 38,996,675 − 38,976,711 = 19,964 output and 14,352,722,236 − 14,352,454,415 = 267,821 cache
    read;
  - first-line reports 25,703,622 / 38,996,675 = 65.9% of output and 9,469,497 / 16,190,248 = 58.5% of thinking;
  - 23,773 requests tie at their maximum, and no tied pair differs in any class;
  - the selected line's timestamp differs from the first line's on 9,129 requests, by at most 301.75 s.
- **The two copies.** `render-cost-record.mjs:157-160 / :183-190` and `render-cost-ledger.mjs:568-571 / :602-609` are
  the same session filter, line filter and first-line dedup. Only these two non-test modules contain `message?.usage`
  or `requestId ??`. `check-cost-ledger.mjs` reaches a transcript only through `deriveLedger`.
- **Identity from the first line leaves everything else unchanged.** Rows are pushed in first-occurrence order
  before and after, so `dropped[]` indices do not move. `ts`, `sessionId`, model, agent, sidechain, skill and version
  come from the same record as today. Membership (`isMember`, inclusive `opening <= ts <= end`) and
  `isAfterWindow` read the same timestamp. The membership-boundary test as designed (a `run-stop` between A's
  …:00.901 and …:01.691) discriminates a selected-line reader.
- **Existing tests.** No existing test builds a request whose lines disagree: the four other transcript builders in
  `render-run-report.test.mjs` and `check-cost-ledger.test.mjs` use one line per id. The three committed fixtures
  have none either (measured). So existing expectations stand.
- **Tie direction.** Earliest-on-tie is the stable choice (L58): a later equal line cannot change the selected
  object after emission. The corpus shows no tie whose lines differ, so no number depends on it.
- **The README counts `.mjs` files** ("Floor checkers — 81 `.mjs` files under `pharn/floor/`"), and the new fixture
  files are `.jsonl`, so the generated `CURRENT-STATE` region does not move. `docs/capabilities/**` renders
  capabilities only.
- **Error handling is moved, not changed.** An unreadable file and a torn line are still skipped. The existing tests
  "a torn/malformed final line is skipped" and "transcriptFiles … skips an unreadable subtree" run through
  `aggregate()`, so they exercise the shared reader after the change.

## Grillers (13 registered — `count-grillers.mjs`)

- **testability:** a verification approach is present (the fixture, the ★ tests, three mutant controls, the
  boundary test, the closure test), so there is no absence finding. On adequacy, see the two test-design findings.
- **error-handling:** the change needs none beyond what exists (an unreadable file or a torn line is skipped, as
  today), and the plan moves that handling into the reader. No finding.
- **security:** `scan-plan-secrets.mjs` → `{"found":false}`. Layer 2: the trust audit already names the one new
  reach, a crafted larger line for an existing id, as the same class as a crafted new id. No finding.
- **privacy:** `scan-plan-pii.mjs` → `{"found":false}`. Layer 2 raised the measurement-record path finding.
- **i18n:** `scan-plan-i18n.mjs` → `{"found":false}`. There is no localized surface. No finding.
- **migrations:** `scan-plan-migrations.mjs` → `{"mentions":false}`. No stored shape changes: `cost.json` and the
  `cost` block keep their schemas, and old files are not rewritten. The compatibility note is D4. No finding.
- **observability:** `scan-plan-observability.mjs` → `{"mentions":false}`. No production runtime. No finding.
- **performance:** the reader holds one projected record and one usage object per request until the walk ends. That
  is O(requests), declared in D2, and bodies are dropped. The ledger test copies 73 small modules to a temp dir.
  There is no unlabeled scaling risk. Row-size growth is the P7 finding above.
- **architecture / coupling:** the ledger imports a pure function; no shared mutable state, and the ordering
  dependency (first in walk order) lives in the same module as the walk. The one note is the P3 finding above.
- **comprehension / documentation:** each decision records its rationale and the alternatives measured against it.
  The wording findings above are the documentation concerns.
- **a11y:** no UI. No finding.

## Summary

The design holds up under probing. The central assumption, that the largest line is the completed one, now has
direct evidence: on every request carrying a `stop_reason`, the largest line carries it. Identity from the first line
leaves membership, attribution and every existing expectation where they were. The one-owner refactor matches what
the two copies do today. The concerns are about wording and test fidelity, not the rule. The guarantee audit's
supporting count is wrong in walk order (three falling requests, not two). Four sentences state measurements or
hints as universals. One variant of the expired claim survived the sweep. Two planned tests should derive their
inputs from code rather than from the author's model: the closure test's comment sensitivity, and the hand-built
first-line ledger. The file-level P3 posture, the measurement record's paths and the row-size effect should be said
out loud.

ADVISORY VERDICT: 12 concerns raised (0 blocking-severity, 1 important, 11 minor), for the human to weigh before
/pharn-dev-build.
