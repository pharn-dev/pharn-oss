# REVIEW — gate-run-stamp

**Floor first (P0).** `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities. `count-verifiers` →
0, `count-lenses` → 22, both unchanged: this increment adds floor infrastructure and a contract, no
`role:`-bearing capability. The floor and **L-eval** agree, and that agreement is itself the check.

The increment under review is `trust: untrusted`. Nothing in it attempted to instruct this reviewer; the
only instruction-shaped content is its own command prose, which is the artifact under review, not a
directive to follow.

---

## Floor-gate findings (blocking)

**None.** No guarantee in the increment lacks a floor reduction or an `advisory` label; no `enforces`
binding is missing (none is introduced); no sibling reference crosses module roots — the new modules live
in `pharn/floor/`, which is the floor layer, and their one cross-import (`worktree-fingerprint.mjs` →
`gate-run-core.mjs` for the slug grammar) is the same intra-floor pattern `check-bash-reconcile.mjs` →
`reconcile-baseline.mjs` already uses.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "CLAUDE.md:1"
  problem: "The claim that the runner needs no reconcile exemption is TRUE but its stated reason is wrong in exactly the install the increment cares about, so a reader who trusts the reason will draw the wrong conclusion elsewhere."
  evidence: "Because the runner writes only there, it needs **no** `reconcile-ignore.json` exemption"
```

**Probed, not reasoned (L37).** The stated reduction is "the runner writes only inside the state root, so
its writes are outside the reconciled set." That holds **only because `.pharn/` is git-ignored** —
`enumerate()` derives the reconciled set from `git ls-files --exclude-standard`. The increment's own
fingerprint exclusion exists precisely for the install that does **not** git-ignore `.pharn/`, and in that
install the runner's logs **are** in the reconciled set.

The conclusion survives, by a different mechanism:

```text
echo '{"tool_name":"Write","tool_input":{"file_path":".pharn/pharn-verify/gates/0-test.out"}}' \
  | node .claude/hooks/enforce-writes-scope.cjs     → exit 0 (PERMITTED by the fail-closed default)
```

So the writes are **permitted-by-scope**, not **outside-the-set** — and reconcile's verdict is "would the
guards have denied this?", so a permitted path is never an escape. **Remedy:** state the reduction as the
probe establishes it. This is the same defect class the increment exists to fix, one layer up: the
mechanism was right and the sentence describing it was not.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/gate-run-core.mjs:1"
  problem: "The safety of the additive gate_run block rests on a point-in-time reading of seven consumers, and no test pins that a future consumer will not validate a closed top-level key set."
  evidence: "none of which validates a closed key set"
```

Every consumer was genuinely read rather than assumed, and all seven read named fields. But that is a
**snapshot**, and the increment records it as a property. A consumer added later that rejects unknown keys
would break silently on a report carrying `gate_run`. **Remedy (deferred, P7 — no failure yet):** a
closure test over the report consumers, or an explicit statement that additivity is a convention.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-verify.md:199"
  problem: "The structural-extra KEYS remain model-composed, so the increment's headline claim holds for the source set and the injected entries but not for the one feature-specific gate."
  evidence: "Collect the **expected** paths only and hand them to the runner as `--extra` in 3c"
```

GRILL **R5** closed the `<actual>` operand — it is derived, and a mismatch is refused. What remains
model-chosen is **which** expected files reach `--extra`. Coverage is enforced over `required`, which
holds the **source** set only, so an omitted structural extra is **not** caught. This is disclosed in the
command's own audit and in the contract, so it is not a hidden overclaim — it is recorded here because it
is the increment's principal residual and the place a reader is most likely to over-read
"produced by tested code."

### L-axis → P3

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: "pharn/floor/gate-run-core.mjs:58"
  problem: "The core module carries at least two independent reasons to change, which is the split its own cited precedent was created to make."
  evidence: "the spec grammar and validation; the `--gates` grammar; the coverage rules; the closed reason_code set; stamp validation"
```

**Carried forward from GRILL R3 and now judged rather than deferred again.** The module changes when the
**CLI surface** changes (`parseGatesSpec`, `parseExtras`) and, separately, when the **stamp contract**
changes (`validateStamp`, `SCHEMA`, the derived views). `ship-outcome-core.mjs` exists because that exact
argument was made one increment earlier about `render-cost-ledger.mjs`.

**Why it was not split here, stated as a judgment rather than a fact:** the two halves share
`REASON_CODES`, `FEATURE_SLUG_RE` and the `err()` helper, so splitting now creates a third file whose only
job is to hold them — and the plan was approved with the module whole. **Recommendation for the human at
GATE 2:** treat this as a real P3 debt with a concrete shape (`gate-run-grammar.mjs` ← CLI surface;
`gate-run-record.mjs` ← stamp shape; shared constants stay in one of them), not as a resolved question.

### L-trust → P2

No blocking finding. The verdict's operands are ints, paths and hex digests. Gate stdout/stderr are
untrusted free text, are written **by fd**, are reduced to a sha256 in the stamp, and are read by **no**
verdict — the taint boundary is a real field boundary, not a prose promise. `--gates` tokens are never
compiled into a `RegExp` and never interpolated into a command string; the shell form passes files as
positional arguments, which a test proves by asserting `a b.js` survives as one argument and
`$(touch pwned).js` does not execute.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/run-gates.mjs:1"
  problem: "A duplicate structural id arriving from both --extra and --scope-json is caught late, at stamp validation, and reported as a generic malformed stamp rather than at init with its actual cause."
  evidence: "spec.entries = [...spec.entries, ...pairEntries].map((e, i) => ({ ...e, seq: i }))"
```

Fail-closed, so nothing passes silently — but the reason_code a reader sees is `stamp-malformed`, which
sends them to the wrong place. Only reachable by a caller passing both flags, which neither shipped
command does. **Remedy:** a duplicate-id check at the merge, with its own reason.

---

## Verdict

**GREEN — 0 floor-gate findings, 5 advisory.** The increment is not blocked. Two advisory findings are
worth a human's attention before merge: the **P3 module-axis debt** (recommendation above) and the **P0
reduction that is right for the wrong reason** (a one-sentence fix).

**This verdict is advisory orchestration over a floor-green increment.** "Review found nothing blocking"
means exactly that the four lenses surfaced no floor-reducible violation — it is **not** a statement that
the increment is correct or wise. The deterministic verdicts stand separately: `validate` GREEN, regress
`no-regressions`, verify `PASS`.

---

## Proposed lesson candidate (for a separate, human-gated `/pharn-dev-memory-promote` run)

**Not written to canon here.** `/pharn-dev-review` holds no scope to `.dev/memory-bank/**`, by design.

- **Shape:** _A lesson whose remedy is an unbuilt floor check keeps recurring, and the recurrence is now
  being caught by unrelated tooling rather than by anything that understands it._
- **The occurrence, in this run:** this increment's own `PLAN.md` opened its exclusion block with
  `**Explicitly NOT in this increment**` — bold prose, not a heading. That is **L18** exactly, the defect
  **L20** demanded a floor check for and **L46** recorded as still unbuilt. It was caught by
  **markdownlint MD036** (a style rule that knows nothing about writes-scope), and only then verified by
  hand: `set-writes-scope.cjs --from-plan` parsed **24 paths against 24 declared bullets** after the fix.
  With the bold form the block would have failed **open**, leaking `MIN_CLI` and
  `worktree-fingerprint.mjs` — the two files the plan exists to **not** touch — into the build scope.
- **Why it is lesson-worthy (P7, a real recurrence):** L20's prescribed remedy — _"at `/pharn-dev-plan`
  Step 4 … re-run `set-writes-scope.cjs --from-plan` and deterministically compare the parsed scope set
  against the plan's own `## Files` bullets, RED on disagreement"_ — is **still not built**, and this is
  at least its third occurrence (`product-capability-catalog` 6-vs-2, `coverage-record` 10-vs-9, and
  this one). The new part is the **detection path**: it was a style linter, by coincidence of formatting,
  not a check that understands scope. A remedy that depends on a coincidence is not a remedy.
- **A second, smaller candidate, recorded rather than dropped:** a fail-closed refusal must **name the
  input it actually read**. The dogfood found `check-verify.mjs` reporting `--complete undefined` for a
  value taken from `stamp.aux.completeness`. Fixed in this increment with a test; one occurrence, so by
  L20's bar it is **not** yet a floor-check trigger, and it is recorded as an observation.
- **Provenance for the promote run:** feature `gate-run-stamp`; source `.dev/features/gate-run-stamp/REVIEW.md`
  (this section) plus `.dev/features/gate-run-stamp/PLAN.md` and `.dev/features/gate-run-stamp/REGRESSION.md`
  (the L6 orchestration defect recorded there is a sibling instance).
