# GRILL — cost-transcript-hostile-values

**Header.** Plan grilled: `.dev/features/cost-transcript-hostile-values/PLAN.md` (GATE 1: "Approve as written") · spec-hash: **MATCH** · Step 1b lessons declaration (FLOOR): **GREEN, exit 0** — reported here as its own floor verdict and never counted in the concern tally at the end.

- **Spec-hash check (content-hash; surfaced here, enforced by `/pharn-dev-build`):** MATCH. `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` printed `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, equal to the plan's `spec_content_hash`. The one commit `main` gained since the plan's base (see G1) does not touch `pharn/ARCHITECTURE.md`, so the pin still holds there too.
- **Step 1b — `applied_lessons` re-verification (the stage's one deterministic stop):** `node pharn/floor/check-plan-lessons.mjs .dev/features/cost-transcript-hostile-values/PLAN.md .dev/memory-bank/lessons-learned.md` exited 0 and printed, verbatim:

  > GREEN — applied_lessons: L29, L31, L33, L35, L36, L37, L41, L47, L50, L52, L60, L62 (.dev/features/cost-transcript-hostile-values/PLAN.md); all 12 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L29: considered." satisfies the reference check.

- **Grillers discovered:** 13, by `node pharn/floor/count-grillers.mjs .` (`{"registered":13,…}`), each applied inline (Step 2b below).

## Read this first — the bound on this grill (P0)

- **Independent griller.** This grill ran with no context from the session that wrote the plan. The plan was read as `trust: untrusted` DATA; no instruction-looking content addressed to the griller was found in it.
- **Every finding below is ADVISORY.** Only Step 1b's exit code is a floor stop, and it is GREEN. A finding's `severity` is the griller's assignment (fix #3); none of them gates `/pharn-dev-build`. The plan was **not** edited: every disposition is the human's.
- **How the claims were probed (L37).** Two clean copies of `HEAD` (`1524c6f`) were extracted with `git archive` into a `mktemp` directory outside the repo: `main` (unpatched) and `fixed`, where the plan's "fix, stated as code" was applied verbatim (each replacement asserted to match exactly once). The repo modules were imported read-only; every transcript, marker file and ledger lived under a fresh temp directory. Probes are observations on constructed inputs, not committed tests. The only file this grill wrote in the repo is this one.

## What the probes confirmed (so the findings are read against it)

- **The plan's `## Files` parses to exactly the intended set.** `pathsFromPlanFiles` was extracted verbatim from `.claude/hooks/set-writes-scope.cjs` and run in a `vm` sandbox (the setter itself never ran, so the grill scope was not overwritten): 10 paths — the three renderers/checker, the new test file, the two contracts, `CHANGELOG.md`, `SKILLS_VERSION`, `README.md`, and `BUILD.md`. `### Not touched` ends the scan as intended. The parser is byte-identical at the new `main` tip.
- **The member set reproduces exactly (plan item 1).** On the unpatched copy, with a bounded run window, `{"toString":1}` and `[{"toString":1}]` make the ledger throw at `requestId` and `message.id`, both renderers throw at `message.model` and at each of the six counts, and the record throws at `attributionSkill` (the ledger already routes it through `sanitizeIdentity`). Every other read site is `typeof`- or `===`-guarded in the code read this run.
- **The consumer set is complete on this branch.** Only `render-cost-record.mjs`, `render-cost-ledger.mjs`, and `check-cost-ledger.mjs` (through `deriveLedger`) read a transcript. `render-run-report.mjs` reads `cost.json` and markers, `loop-fresh-core.mjs` reads `freshness.jsonl`, and `mark-phase.mjs` writes `markers.jsonl`.
- **The code sketch is correct as written.** It keeps the `<synthetic>` test before the id guard, as today, so a synthetic line never enters `seen`. `normalizeTokens` has exactly one caller (`render-cost-ledger.mjs:640`) and no test imports it. No committed fixture carries a wrong-type member value, and no existing test pins the old coercions: with the sketch applied, the four cost/report suites (`render-cost-record`, `render-cost-ledger`, `check-cost-ledger`, `render-run-report`) pass 219/219, the same as unpatched. Every row of the plan's "What each wrong-type value becomes" table reproduces, and the record and the ledger agree on each member × value.
- **The CLI claims reproduce (plan item 4, tests 5–6).** Unpatched: after a crafted line is appended inside the window, `check-cost-ledger.mjs --verify-transcript` exits 1 with no `GREEN —`/`RED —` line (a `TypeError` on stderr), and the emitter over that transcript exits 1 and writes no `cost.json`. Patched: the checker prints `RED — --verify-transcript: requests[] does not match the transcript (1 recorded, 2 re-derived)`, and the emitter exits 0 with a ledger its checker reads GREEN.
- **The L50 sweep holds.** `main` carries no cite of the retired residual; the in-flight tree carries the one at `transcript-core.mjs:67-68`. The in-flight contract edits touch different paragraphs of `cost-ledger.md` and `ship-record.md` than this plan does.

## Findings — inline axes (Step 2)

### Live state (P6)

#### G1 — `main` has moved; the planned version and CHANGELOG placement are stale

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:40"
  problem: "The plan's base is no longer live: PR #278 merged at 2026-09-26T13:45:51Z and main is now ec06f7b at SKILLS_VERSION 6.24.0, so the planned 6.23.0 → 6.23.1 bump, the [6.23.1] section 'directly above [6.23.0]', the 6.23.1 badge and the checker header's 'as of 6.23.1' would all land below the released version."
  evidence: "1. **Base** → build on `main` now (6.23.0 → **6.23.1**, a PATCH: a correction to shipped bytes)."
```

**Probe.** `gh pr view 278` → `MERGED`, `2026-09-26T13:45:51Z`. `git ls-remote origin refs/heads/main` → `ec06f7b`. The compare API lists one commit and 44 files; of the plan's 10 paths, `CHANGELOG.md`, `README.md` and `SKILLS_VERSION` overlap. `SKILLS_VERSION` at `ec06f7b` reads `6.24.0`. The plan anticipated this ("If `main` moves before this lands, the version renumbers by diff"); it is now a fact, not a contingency.
**Recommendation.** Merge `origin/main` before the build and renumber to **6.24.1** (a patch over 6.24.0): the `## [6.24.1]` section goes above `[6.24.0]`, the badge becomes 6.24.1, and the header sentence names 6.24.1.

### Guarantee-audit completeness (P0)

#### G2 — the planned checker-header sentence claims more than the fix delivers

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:147"
  problem: "The planned header sentence for check-cost-ledger.mjs says without a bound that --verify-transcript over a crafted transcript no longer crashes, but with the plan's fix applied a crafted line whose usage.iterations array is nested 20,000 deep (every type correct) still crashes both the emitter and --verify-transcript with a RangeError, exit 1 and no verdict line."
  evidence: "It also states that `--verify-transcript` over a crafted TRANSCRIPT no longer crashes, as of 6.23.1."
```

**Probe (patched copy).** `JSON.parse` accepts the line. `render-cost-ledger.mjs` exits 1 and writes no `cost.json` (`RangeError: Maximum call stack size exceeded`, from `sanitizeUsage`'s recursion). `check-cost-ledger.mjs --verify-transcript`, run over a ledger emitted from clean bytes after the transcript gains that line, exits 1 with no verdict line. That is L62's crash-read-as-a-verdict shape, reached through depth instead of type. At depth 3,000 both complete. The record CLI completes, because it never walks `usage`.
**Why blocking-severity (advisory assignment).** The plan's own guarantee audit carries the right bound (l. 295–297: "not a claim that the renderers are total over every JSON input"), but the sentence the plan will ship in a product-floor file drops it. As written, a shipped guarantee would outrun its floor reduction. That is P0's STOP condition, surfaced for the human rather than issued as a stop.
**Recommendation.** Bound the sentence to "a wrong-TYPE value at an enumerated member or walked node". Then either name the depth crash as a residual with a follow-up id, or ask the maintainer whether depth joins this increment (`render-run-report.test.mjs` already guards the same `JSON.parse`-accepts-what-the-walk-cannot depth case, its GRILL G2).

#### G3 — "`<int>` holds for any transcript" is false for right-typed hostile counts

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:288"
  problem: "The plan claims the ship-record cost block's <int> token shape holds for any transcript, but Number.isFinite admits non-integers and negatives, and two finite counts can sum past Number.MAX_VALUE, so the claim is false for right-typed values even after the fix."
  evidence: "- `pharn/pharn-contracts/ship-record.md`: the `cost` block's documented `<int>` token shape holds for any transcript."
```

**Probe (patched copy).** `input_tokens: 1.5` gives a record `input_uncached` of 2.5, and `-3` gives -2. Two lines at `1e308` overflow the record total to `Infinity`, written as `null`. The CLI-written `cost.json` for the same bytes is RED under its own checker (`totals disagrees with a recompute from requests[]`, stored `null` against a recomputed `Infinity`). So the plan's companion sentence, that the emitter's rows "now satisfy the checker's existing `Number.isFinite(tokens.<class>)` rule by construction" (l. 286–287), is true per row and false for `totals`.
**Recommendation.** Narrow both sentences to wrong-TYPE values: an object, an array, a string, a boolean or a non-finite number. State as a named bound that a right-typed non-integer, negative or overflowing count passes through. Alternatively, ask the maintainer whether the guard should be `Number.isSafeInteger(v) && v >= 0`. That would be a scope change and is the human's call (P7).

#### G4 — "REQUIRED" parameters are enforced only on the hostile path

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:110"
  problem: "normalizeTokens(u, n, dropped) is described as having REQUIRED parameters, but nothing enforces that: the exported function called without dropped returns normally on clean usage and throws only when a wrong-type count arrives, which is exactly the crash class this increment removes."
  evidence: "- L41 — `normalizeTokens` gains two REQUIRED parameters (`n`, `dropped`) and no default, so there is no default for a test to leave unexercised."
```

**Probe (patched copy).** `normalizeTokens({input_tokens: 1, output_tokens: 2})` returns a normal object. `normalizeTokens({input_tokens: {"toString": 1}})` throws `TypeError: Cannot read properties of undefined (reading 'push')`.
**Recommendation.** Validate `n` and `dropped` on entry, so that an omission fails on every call and any test catches it. Alternatively, stop exporting the function: nothing imports it.

### Eval / test coverage (P1) — also the testability griller's Layer 2

#### G5 — the ledger half of tests 4, 6 and 7 is vacuous unless the window is bounded, and no committed control says so

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:252"
  problem: "The ledger assertions in tests 4, 6 and 7 can fail only when the markers bound a run window that contains the mutated line, and the plan neither states that precondition nor commits a control asserting it, so a markers setup that yields an unknown window leaves every ledger assertion green against the unfixed code."
  evidence: "- the emitted ledger is GREEN under `checkLedger` and under `checkLedger(…, {verifyTranscript: true})`."
```

**Probe (unpatched copy).** This grill's member × value matrix has 59 transcripts, a superset of the plan's alphabet. With **no markers**, all 59 ledger cases complete (`rows=0`, `status=unknown`), `checkLedger` is GREEN, and `--verify-transcript` is GREEN too (it only WARNs on an unknown window). Under an unknown window `isMember` returns false, so every line is excluded before the row build, which is the only place `String(id)`, `String(model)` and the count reads run. With a **bounded** window, 18 of the same 59 throw.
**Recommendation.** In every ledger scenario, assert `membership.status === "bounded"` and the expected row count (2, or 1 for an id-bad line) before the property assertions. The L60 mutant run at build would notice once, but the committed suite would not keep the guard, and the precedent the plan cites keeps it inside the suite ("the control reaches every block the mutants target (L34)", `render-run-report.test.mjs`).

#### G6 — two asserted properties have no input in the planned alphabet that can violate them

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:238"
  problem: "The planned alphabet cannot violate two properties the plan asserts: no value in it is an empty string, so the non-empty half of the id rule is unpinned, and no value in it is a non-finite number, so Number.isFinite is indistinguishable from typeof v === 'number', although the plan defines a wrong-type count to include a non-finite number."
  evidence: '- string kinds (id, model, stage): `THROWING ∪ {7, true}`; / - counts: `THROWING ∪ {"12", true}`.'
```

**Probe.**

- **(a) The empty id.** Take the plan's `requestIdOf` and drop its `id !== ""` clause. The mutant keeps all 219 existing record/ledger/checker/run-report tests green. With it, a `requestId: ""` line is counted by the record (2 requests instead of 1) and emitted as a ledger row that the ledger's own checker REDs (`requests[1].request_id must be a non-empty string`). The plan's guarantee audit calls this rule FLOOR, "pinned by tests 4 … and 7" (l. 293–294), but no planned value is `""`.
- **(b) The non-finite count.** A mutant replacing `Number.isFinite` with `typeof v === "number"` (in the record's `count` and the ledger's `read`) gives byte-identical outcomes to the plan's fix over `{"toString":1}`, `[{"toString":1}]`, `"12"` and `true`. Only a raw `1e999` separates the two. Under the mutant, the record total becomes `null` and the ledger REDs `tokens.input must be a number`. Unpatched, raw `1e999` corrupts both outputs the same way.

**Recommendation.** Add `""` to the id members' values and a raw `1e999` to the counts' values. Add both mutants to the L60 table. Two notes for the build:

- Splice `1e999` into the line as TEXT. `JSON.stringify` writes `Infinity` as `null`, which silently turns the case into an absent count; this grill's first probe fell into exactly that.
- With raw `1e999`, `dropped[]` gains two paths (`usage.<leaf>` and `requests[n].tokens.<class>`), so assert membership, not equality.

#### G7 — the ★ DOMAIN CLOSURE's alphabet and shapes leave two walked nodes unreachable

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:260"
  problem: "Walking every node with THROWING only cannot violate the closure's GREEN-under-its-own-checker property at message.usage (an object or array there is walked, not refused), yet a non-token string or a raw 1e999 there still makes the emitter write a row its own checker REDs; and attributionAgent is read only when agentId is not a string, so a walk over shapes that both carry a string agentId never reaches it."
  evidence: "7. **★ DOMAIN CLOSURE (L36).** Both base shapes × EVERY node (root excluded) × `THROWING`:"
```

**Probe (patched copy).** Set `message.usage` to a 100-character string, a newline-bearing string, or a raw `1e999`. In each case `sanitizeUsage` refuses the root, the row is emitted with **no** `usage` key and `dropped: ["usage"]`, and `checkLedger` REDs the file (`usage leaf out of domain`). A short token (`"abc"`) stays GREEN. This is pre-existing (identical unpatched), not introduced here. The `attributionAgent` half is read from the code: `render-cost-ledger.mjs:625` tests `agentId` first. The precedent the plan cites used three values, one of them a newline-bearing string.
**Recommendation.** Add a string value to the closure's alphabet, and a base shape without `agentId`. For the usage-root RED, ask the maintainer whether it joins this increment or is named as a follow-up (P7). Either way, the closure's stated bound should say which values it walks.

### Trust propagation (P2) — also the security and privacy grillers' Layer 2

#### G8 — "Identity fields keep rule 3's bound" is true for the ledger only

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:330"
  problem: "The trust audit covers all three consumers but says identity fields keep rule 3's bound, and rule 3 is the ledger's: the record keys by_model and by_stage with the raw transcript string, unbounded, so an absolute path or a newline-bearing value still lands in ship-record.json after this fix."
  evidence: "- **Free-text taint is unchanged.** Identity fields keep rule 3's bound, and `usage` keeps rule 2's."
```

**Probe (patched copy).** The transcript carries `model: "/Users/someone/secret-model"`, a 300-character `attributionSkill`, and one carrying a newline. The record's `by_model` key is the path verbatim, and `by_stage` carries the 300-character and newline-bearing keys. The ledger maps all three to `unknown`/`null` and lists them in `dropped[]`. The gap is pre-existing and outside the wrong-TYPE scope.
**Recommendation.** Scope the sentence to the ledger. Name the record's unbounded identity keys as a pre-existing residual, a follow-up candidate that is not built here (P7). Make sure the bullet the plan adds to `ship-record.md` does not read as a bound on the record.

### One axis / no sibling imports (P3) — also the architecture and coupling grillers

#### G9 — the recorded merge obligation undercounts: the id rule's home moves too

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:123"
  problem: "The recorded merge obligation names only the transcript-core.mjs:67-68 residual, but in the in-flight tree transcript-core.mjs is the one transcript owner and resolves the id inside sessionRequests(), so a merge that keeps requestIdOf in render-cost-record.mjs leaves two id rules and restores a ledger-to-record import the in-flight increment removed."
  evidence: '- L33 — that NAMED RESIDUAL is a "not yet built" claim, and it expires when this lands. So the merge obligation above is recorded here, in `BUILD.md`, and in the CHANGELOG entry'
```

**Probe (read-only, the `festive-payne-3d217e` worktree).**

- The in-flight `render-cost-ledger.mjs` imports `findTranscriptDirs, sessionRequests` from `./transcript-core.mjs` and nothing from `render-cost-record.mjs`, which re-exports no transcript helper.
- `sessionRequests()` groups on `const id = r.requestId ?? r.message.id; if (!id) continue;`, keyed into a `Map`.
- The in-flight header states "ONE OWNER ([[L35]]): nothing else in the product floor reads a transcript's usage" and "each has exactly one import address".

On `main` today, putting `requestIdOf` beside the walk the ledger already imports fits the current structure (architecture: fit recognized for `main`).
**Recommendation.** Add to the recorded merge obligation (`BUILD.md` and the CHANGELOG entry):

1. Move `requestIdOf` into `transcript-core.mjs`.
2. Apply it inside `sessionRequests()` in place of `if (!id)`.
3. Drop the ledger's import of it from the record.

The plan's tests exercise the renderers, so they catch a guard dropped in the merge. They do not catch a duplicated rule.

### Determinism (P5)

No finding. Every new branch is a membership test (`typeof … === "string"`, `id !== ""`, `Number.isFinite`) with a fixed-literal fallback. On the patched copy, the record and the ledger reach the same fallback for every member × value in the plan's alphabet. Now that every key is a string, the key sorts (`a < b`) are total. The existing ✦ DETERMINISM tests pass unchanged within the 219/219 run.

### Honest scope (P7)

No finding on the trigger. The plan labels its inputs as constructed and records the scope widening as the maintainer's decision at the plan gate. G2, G3 and G7 each surface a further constructed-input failure (depth, overflow and a wrong-type `usage` root), each probed. This grill recommends **labelling** them (bound the claims, name follow-ups) and **asking** the maintainer before any scope is widened, never widening it silently (P5, P7).

## Findings — registered grillers (Step 2b)

Applied inline in the order `count-grillers.mjs` printed them. Where a griller's concern is already a finding above, it is folded there rather than duplicated.

| griller          | floor sub-check run this grill                                 | result                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y`           | membership only                                                | No finding: the change touches no UI.                                                                                                                                                                                            |
| `architecture`   | membership only                                                | Fit recognized for `main` (reuses `sanitizeIdentity`, `dropped[]` and the existing ledger-to-record import; no new mechanism). One concern → **G9**.                                                                             |
| `comprehension`  | membership only                                                | One uncaptured WHY → **G10** (below).                                                                                                                                                                                            |
| `coupling`       | membership only                                                | Clean seams on `main`: `requestIdOf` is a pure function passed by import, with no shared mutable state. The post-merge double ownership is an entanglement concern → folded into **G9**.                                         |
| `documentation`  | membership only                                                | Declaration present: headers and both contracts are updated for the exported `requestIdOf` and the new `normalizeTokens` signature. Adequate; the REQUIRED-parameter concern is **G4**.                                          |
| `error-handling` | membership only                                                | Declaration present: the per-member fallback table and the named `cost.json` checker residual. Inadequate on two unlabeled failure modes, depth and overflow → folded into **G2** and **G3** (P0 framing, not duplicated as P7). |
| `i18n`           | `scan-plan-i18n.mjs` → `{"found":false,"hits":[]}`             | Scanner clean; no user-facing text. No finding.                                                                                                                                                                                  |
| `migrations`     | `scan-plan-migrations.mjs` → `{"mentions":false,"hits":[]}`    | No persisted shape changes: both schema ids are unchanged, and `dropped[]` gains a path form that no consumer parses (checked with `git grep`). No finding.                                                                      |
| `observability`  | `scan-plan-observability.mjs` → `{"mentions":false,"hits":[]}` | The change is an offline CLI renderer and checker with no prod runtime. Its visibility is the ledger's `dropped[]`, and the record's silence is labeled. No finding.                                                             |
| `performance`    | membership only                                                | No finding. The new code is per-line `typeof` tests, and the closure's cost is bounded (2 shapes × about 26 nodes × the alphabet). Asserting the exact render count, as the precedent does, would also serve G5 and G7.          |
| `privacy`        | `scan-plan-pii.mjs` → `{"found":false,"hits":[]}`              | Scanner clean. No message body is read, and the new strings are fixed-vocabulary paths. A crafted home path can still land in a record key → folded into **G8**.                                                                 |
| `security`       | `scan-plan-secrets.mjs` → `{"found":false,"hits":[]}`          | Scanner clean. Layer 2: the plan hardens untrusted-input handling. The residual concerns are **G2** (depth still crashes on untrusted input) and **G8**.                                                                         |
| `testability`    | membership only (Layer 1 is presence, read from structure)     | Presence recognized: `## Tests to write` declares seven tests plus a negative-control table. Adequacy concerns → **G5**, **G6** and **G7**.                                                                                      |

### G10 — comprehension: a wrong-type `requestId` does not fall back to `message.id`, and the plan never says so or why

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:225"
  problem: "The plan never states WHY, or even THAT, a present but wrong-type requestId does not fall back to message.id (the ?? resolves first and only the result is type-tested), so a line with requestId 7 and a valid message.id is dropped, and the planned contract wording ('a transcript line whose id is not a non-empty string') does not tell a reader which id is meant."
  evidence: "| `requestId` / `message.id` (the resolved id)  | the line is not a request         | the line is not a request (no row, not in `excluded`)     |"
```

**Probe (patched copy).** A `requestId` of `7`, `true` or an object, with a valid `message.id` present, leaves the record at 1 request and the ledger at 1 row (the clean line only), as the table says.
**Recommendation.** Put the rule and its reason in the `cost-ledger.md` row: the id is `requestId` when it is present (not null or undefined), else `message.id`; the resolved value must be a non-empty string; a wrong-type `requestId` does not fall back. Also say that base shape A pins the rule because it carries both fields.

## Summary

The plan is unusually well-evidenced, and most of what it claims reproduces under probe:

- the member set and the consumer set;
- the pre-fix crashes and the post-fix fallbacks, record and ledger alike;
- the CLI behaviour;
- the `## Files` scope;
- that no existing test or fixture pins the old coercions.

The code sketch is correct as written and breaks none of the 219 existing cost and report tests.

The concerns cluster in three places.

1. **The base has moved (G1).** 6.24.0 is on `main`, so the version, the CHANGELOG section and the header's "as of" all renumber to 6.24.1 before the build.
2. **Two sentences outrun the fix (G2, G3).** Both are the P0 disease in its mildest form. The plan's own guarantee audit carries the right bound, but the checker-header sentence it will ship ("no longer crashes") and the "`<int>` holds for any transcript" claim drop it. A depth-nested `usage` still crashes the emitter and `--verify-transcript` with no verdict line. Non-integer, negative and overflowing counts pass `Number.isFinite`. The cheap fix is wording plus named residuals. Widening the scope is the maintainer's call.
3. **L60's per-property question is left partly open (G5–G7).** The plan cites L60 and L34, and these three findings are exactly that question unanswered:
   - the ledger half of the new tests is vacuous without a bounded window, and no committed control asserts one;
   - the alphabet cannot falsify the non-empty-id half or the `Number.isFinite` choice;
   - the domain closure cannot reach a wrong-type `usage` root, which still produces a ledger its own checker REDs, or `attributionAgent`.

Each was demonstrated by a mutant or an input, not reasoned. Smaller points:

- G9: the recorded merge obligation should also move `requestIdOf` into `transcript-core.mjs`.
- G8: the P2 sentence should be scoped to the ledger.
- G4: the "REQUIRED" parameters are enforced only on the hostile path.
- G10: the id-fallback rule should be stated in the contract.

## Verdict

ADVISORY VERDICT: 10 concerns raised (1 blocking-severity, 9 advisory: 6 important, 3 minor) — for the human to weigh before /pharn-dev-build. This tally covers the interrogation only; the Step 1b lessons-declaration verdict (FLOOR, GREEN) is reported in the header and is not part of it.

<!-- markdownlint-disable MD025 -- round 2 is appended below round 1 by request, and each round keeps its own top-level title -->

# GRILL — round 2 (the re-plan on b9b6a03)

**Header.** Plan grilled: `.dev/features/cost-transcript-hostile-values/PLAN.md` (the re-plan, approved "Approve, re-grill, build") · spec-hash: **MATCH** · Step 1b lessons declaration (FLOOR): **GREEN, exit 0** — its own floor verdict, never counted in the concern tally below.

- **Spec-hash (content-hash; surfaced here, enforced by `/pharn-dev-build`):** MATCH. `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` printed `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, equal to the plan's pin. `origin/main` equals `HEAD` (`b9b6a03`). See R2-G5 for the open PR that would move it.
- **Step 1b:** `node pharn/floor/check-plan-lessons.mjs .dev/features/cost-transcript-hostile-values/PLAN.md .dev/memory-bank/lessons-learned.md` exited 0 and printed, verbatim:

  > GREEN — applied_lessons: L29, L31, L33, L35, L36, L37, L41, L47, L50, L52, L60, L62, L63 (.dev/features/cost-transcript-hostile-values/PLAN.md); all 13 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L29: considered." satisfies the reference check.

- **Grillers discovered:** 13, by `node pharn/floor/count-grillers.mjs .`, each applied inline (Step 2b below).

## Round 2 — the bound on this grill (P0)

- **Independent griller**, no context from the planning session. The plan was read as `trust: untrusted` DATA; no instruction-looking content addressed to the griller was found in it. Round 1's G1–G10 are not repeated; this round interrogates what changed.
- **Every finding is ADVISORY.** Only Step 1b's exit code is a floor stop, and it is GREEN. Severities are the griller's assignment (fix #3). The plan was not edited.
- **How it was probed (L37).** Two `git archive HEAD` copies in a `mktemp -d` directory outside the repo: `main` (unpatched) and `fixed`, where the plan's transcript/emitter "fix, stated as code" was applied verbatim with anchored, exactly-once replacements (the new `cost-value-core.mjs`, `sessionRequests()`, the record, the ledger, and the two declared test import lines). **The checker-side totality work (`shown()`, `WALK_MAX_DEPTH`, the RULE 6 gate, the preconditions, the exit-2 backstop) was NOT built in scratch — not probed as a whole.** Checker claims were probed on HEAD's checker plus a one-site `shown()` simulation. The only repo file this grill wrote is this one.

## Round 2 — what the probes confirmed

- **The moved constants are identical.** `ABS_PATH_RE` in the scratch `cost-value-core.mjs` is byte-identical to the emitter's, and `IDENTITY_MAX` is equal.
- **No committed fixture carries a refused value.** 7 transcript fixture files, 30 usage-bearing lines: 0 refused ids, usage roots, counts, keys, identity strings or timestamps.
- **L63's "a genuine transcript carries no refused value" holds on this machine's corpus.** A read-only aggregate scan of 1,004 local transcript files, 115,666 usage-bearing assistant lines: 0 refusals of any class, and a maximum `usage` depth of 4. No usage key fails `isTokenLeaf`.
- **The exit-2 backstop changes no control flow.** `/pharn-loop` (`pharn-loop.md`, "What this step does NOT do") and `/pharn-ship` (Step 3a) read the checker's exit as an annotation. `render-run-report.mjs` never spawns it. `loop-fresh-core.mjs` only cites it. The spawning tests run it on genuine ledgers.
- **The `name` gate breaks no existing test.** Every `--verify-transcript` test uses the name `feat` or `f`, and both match `FEATURE_SLUG_RE`.
- **The crash list.** The plan's alphabet on HEAD reaches 25 distinct crash frames (line:col granularity, so the plan's own count of 20 is consistent). A wider alphabet (`true`, `false`, `0`, `-1`, `1.5`, `2^53`, `1e6`, `""`, a 200,000-character string, a path, `{}`, `[]`, a U+2028 string) adds exactly one crash class: `RangeError: Invalid array length` in the marker-completeness loop (R2-G3).
- **L50.** The retired residual's one shipped cite is `transcript-core.mjs:67-68`, as the plan says.

## Round 2 — findings (inline axes, Step 2)

### R2-G1 — `## Files` omits two test files, and the planned changes break five tests in them

```yaml
- type: FINDING
  rule_id: "P6"
  severity: blocking
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:13"
  problem: "The plan declares its test edits as two import lines, but the planned changes break five existing tests in two undeclared files (check-cost-ledger.test.mjs and transcript-core.test.mjs), and /pharn-dev-build sets fix #7's scope from ## Files, so the build cannot edit them through the Write or Edit tools."
  evidence: "floor tests (two new files, two import-line edits) / render-cost-ledger.test.mjs — floor test, import lines only"
```

**Probe.** Full suite on scratch copies: `main` 3600 pass / 0 fail; `fixed` (emitter side only) 3596 pass / **4 fail**, plus one more under a simulated `shown()`:

- `check-cost-ledger.test.mjs:993` (REVIEW S4). Its fixture's `requestId` carries a newline, so the new id rule makes the line not a request, and `inFlightLedger()` throws reading `led.requests[0].tokens`.
- `check-cost-ledger.test.mjs:1008`. Line 1018 calls `normalizeTokens(first.message.usage)` with one argument, which now throws the planned `TypeError`. #279 added this caller; round 1's "no test imports it" was measured on the old base.
- `check-cost-ledger.test.mjs:606` (COMPATIBILITY, legacy `/1`). It matches `/unexpected key\(s\): membership/`. With a JSON-quoting `shown()` at that site the message reads `unexpected key(s): "membership"` and the test fails (simulated at one site).
- `transcript-core.test.mjs:226` and `:233` (★ MUTANT CONTROLs). `mutantCore()` (`:217`) writes `transcript-core.mjs` alone into a fresh tmpdir, so the new `./cost-value-core.mjs` import cannot resolve (`ERR_MODULE_NOT_FOUND`).

**Recommendation.** Add both files to `## Files` with their edits named:

- Re-aim S4 at a `cost.json`-borne id, or at `shown()`.
- Pass `(u, 0, [])` at `:1018`.
- Make the `:626` match quote-aware.
- Make `mutantCore()` copy the module's import closure, as the renderer tests' FOLLOWS controls already do.

### R2-G2 — the contract gains FLOOR-looking bounds the checker does not check

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:247"
  problem: "The plan adds the usage depth and key bounds to contract rule 2, and adds session_id and claude_code_versions bounds, in a section the contract says check-cost-ledger.mjs owns, but the checker enforces none of them (its planned depth bound is 64, not USAGE_MAX_DEPTH 32, and it has no key, session_id or version rule)."
  evidence: "- the `usage` depth and key bounds (rule 2); … - the `session_id` and `claude_code_versions` bounds;"
```

**Probe (the checker these edits leave unchanged).** Each of these is **GREEN** under `checkLedger`:

- a `usage` key the emitter now refuses;
- `usage` nested 40 deep;
- a 300-character `session_id`, and one holding a C0 control;
- a 300-character `claude_code_versions` element;
- a `sessions[]` element holding a control character.

The contract's own history records this defect twice: rule 3 was added after review found the contract asserting it without code, and rule 5 was advertised as `FLOOR (shape)` while nothing checked it.

**Recommendation.** Either the checker imports `USAGE_MAX_DEPTH`, `isTokenLeaf` and `isIdentityToken` and enforces them (the `isTokenLeaf` import precedent, L31), or the contract labels them as properties of the EMITTER's output, pinned by its tests, and never as rules the checker owns.

### R2-G3 — "answers every parsed JSON document with a verdict" fails on right-typed inputs outside the closure

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:10"
  problem: "The increment line claims every parsed cost.json gets a verdict and the audit says the backstop turns any crash into exit 2, but a single message over 64 KiB loses the verdict line through a piped stdout because the checker still ends with process.exit (the 6.20.4 flush class), and a huge outcome.iterations exhausts memory, which no try/catch can turn into exit 2."
  evidence: "which now answers every parsed JSON document with a verdict / The backstop turns any such crash into exit 2, unusable, never GREEN."
```

**Probe (HEAD checker CLI, darwin, `spawnSync` pipe):**

- `outcome.iterations = 100000`, which rule 7 admits. The marker-completeness WARN is one 689,620-byte line, and stdout arrives cut at 65,534 bytes: **exit 0, no verdict line**. With `process.exitCode` instead of `process.exit`, the full output and the verdict arrive.
- 5,000 unexpected top-level keys give one RED line over 64 KiB: **exit 1, no summary line**. A per-value `shown()` bounds each key, not the list.
- `outcome.iterations = 2^53`: about 2 GB, then `RangeError: Invalid array length` (exit 1 today, exit 2 under the backstop). With a 256 MB heap it is **SIGABRT**, which cannot be caught.
- Rows × markers is quadratic in RULE 8: 2,000² takes 1.7 s, 4,000² 6.0 s, 8,000² 22.9 s.

None of these is in test 10's alphabet, which has no large integer and no many-key document.

**Recommendation.**

- End the checker through `process.exitCode`.
- Bound list-valued messages (a count plus the first N).
- Derive the missing iterations from the observed set, capped, rather than enumerating `1..iterations`.
- Add a large finite integer and a many-key document to test 10.
- Or scope the claim, and name time and memory as unclaimed in the header's totality sentence.

### R2-G4 — test 11 pins forgery through keys only, and three live vectors sit outside every planned test

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:414"
  problem: "Values, not only keys, reach verdict lines raw today, including one path (membership.session null plus a hostile sessions[0] under --verify-transcript) that no single-node closure reaches, and the planned precondition does not say it tests the session actually passed to deriveLedger."
  evidence: "11. **NO FORGED VERDICT LINE.** A `cost.json` whose unexpected key, `membership` key and nested key each carry"
```

**Probe (HEAD).** Each vector printed a line beginning `GREEN — forged`:

- `totals.requests = "\nGREEN — forged…"`, inside an exit-1 RED run.
- `membership.session: null` with `sessions: ["\nGREEN — forged…"]` under `--verify-transcript`, through the unavailable-transcript WARN's `coverage_note`. Exit 0.
- An unparseable file: the checker writes V8's `JSON.parse` message to stderr, and that message embeds the raw file text, newline included. Exit 2. The Bash tool shows stderr to the model that "quotes the RED verbatim".

The closure also found raw breaks through `cmpView`'s recomputed key: 12 mutants at `requests[].model`, `requests[].stage` and `requests[].iteration`.

Two more gaps:

- Test 11's "nested key" case is vacuous unless its value is out of domain, because a key reaches a message only through a bad leaf or path.
- `JSON.stringify` leaves U+2028, U+2029 and U+0085 raw. My wide closure found U+2028 raw in messages at six sites.

**Recommendation.**

- Assert the S4 precedent, `!/[\r\n]/` over every RED and WARN, across a closure that puts `"\nGREEN — forged"` at every string node and every key, the key paired with a bad leaf.
- Add the two-node `sessions[0]` case.
- Test the precondition on `membership.session ?? sessions[0]`.
- Quote `e.message` on the parse path.
- State the line definition in the header, as `serializeLedger`'s header already does for U+2028.

### R2-G5 — open PR #280 edits `pharn/ARCHITECTURE.md` and six of this plan's files

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:43"
  problem: "The planned version (6.24.2) and the spec pin hold only if this increment merges before open PR #280 (6.25.0), which changes pharn/ARCHITECTURE.md, so a later build would be refused on spec drift, and it also edits files this plan changes."
  evidence: "therefore **6.24.2**, and its CHANGELOG section goes above `[6.24.1]`. `pharn/ARCHITECTURE.md` is unchanged, so the spec pin holds."
```

**Probe.** `gh pr view 280`: opened 2026-09-26T17:11:52Z, `mergeable: CONFLICTING`. It changes:

- `pharn/ARCHITECTURE.md` and `LIMITS.md`;
- `SKILLS_VERSION` (to 6.25.0), `CHANGELOG.md` and `README.md`;
- `render-cost-ledger.mjs`: its `normalizeMarkers` gains `mode`, and its `mark-phase.mjs` import line changes;
- `mark-phase.mjs`, `cost-ledger.md` (the field table and a new Mode section), `check-cost-ledger.test.mjs` (a quick-mode ledger test) and `render-cost-ledger.test.mjs`.

**Recommendation.** Settle the merge order with the maintainer. If #280 lands first:

- re-pin (re-plan) and renumber to 6.25.1;
- run the new checker rules against its quick-mode ledger (a `mode` marker key, `gate2-quick`).

## Round 2 — findings (registered grillers, Step 2b)

| griller          | floor sub-check run this grill                                 | result                                                                                                                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y`           | membership only                                                | No finding: no UI.                                                                                                                                                                                                                                                                       |
| `architecture`   | membership only                                                | One misfit → **R2-G6**. Note: `transcript-core.mjs` now pulls `mark-phase.mjs` and `run-window-core.mjs` into the record renderer's load graph through `cost-value-core.mjs`; and `isTokenLeaf` stays in the emitter though the new module is called "the one home of the value domain". |
| `comprehension`  | membership only                                                | One uncaptured consequence → **R2-G7**.                                                                                                                                                                                                                                                  |
| `coupling`       | membership only                                                | The overlap with PR #280 → **R2-G5**.                                                                                                                                                                                                                                                    |
| `documentation`  | membership only                                                | Declaration present. Contract rule 2 → **R2-G2**; the header comment trap → **R2-G11**.                                                                                                                                                                                                  |
| `error-handling` | membership only                                                | Declaration present (the fallback table, the backstop). Inadequate on resource exhaustion → **R2-G3**.                                                                                                                                                                                   |
| `i18n`           | `scan-plan-i18n.mjs` → `{"found":false,"hits":[]}`             | Clean. No finding.                                                                                                                                                                                                                                                                       |
| `migrations`     | `scan-plan-migrations.mjs` → `{"mentions":false,"hits":[]}`    | No schema id changes. New internal checker rules can RED an old crafted ledger → **R2-G8**.                                                                                                                                                                                              |
| `observability`  | `scan-plan-observability.mjs` → `{"mentions":false,"hits":[]}` | Clean. No finding.                                                                                                                                                                                                                                                                       |
| `performance`    | membership only                                                | Quadratic RULE 8 and the iterations loop → folded into **R2-G3**.                                                                                                                                                                                                                        |
| `privacy`        | `scan-plan-pii.mjs` → `{"found":false,"hits":[]}`              | Clean. Pre-existing and outside this input class (not a finding): the record's `unavailable` note embeds the absolute projects directory.                                                                                                                                                |
| `security`       | `scan-plan-secrets.mjs` → `{"found":false,"hits":[]}`          | Clean. Layer 2 → **R2-G4**, **R2-G9**.                                                                                                                                                                                                                                                   |
| `testability`    | membership only                                                | Presence recognized (12 tests, a mutant table). Adequacy → **R2-G1**, **R2-G4**. The table names no mutant for `checkUsageLeaves`'s depth bound; test 10's deep value would still catch it.                                                                                              |

### R2-G6 — a second `shown()` beside the exported, total one L62 produced

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:225"
  problem: "The plan writes a new shown() inside check-cost-ledger.mjs with different semantics, while pharn/floor/test-results-formats.mjs already exports a total, JSON-escaped, length-bounded shown() — the very helper L62's remedy repaired — so the floor would carry two implementations of one quoting rule."
  evidence: "A new `shown(v)` quotes every file-derived value in a verdict line, keys and walk paths included: JSON-escaped, so"
```

**Probe.** `test-results-formats.mjs:107` exports `shown(v)`: `String(v)` in a try, falling back to `Object.prototype.toString.call(v)`, cut to `SHOWN_CHARS` (64), then `JSON.stringify`. `test-results-core.mjs` imports it. The plan never mentions it; its only quoter reference is 6.21.1's `dataText`.

**Recommendation.** Reuse one quoter. Move `shown` to a shared core, as the `quote-core.mjs` precedent did for `dataText` to keep load graphs apart, or import it. If a second copy is kept on purpose, say why, and pin the pair.

### R2-G7 — a refused `sessionId` string now widens run membership

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:211"
  problem: "The sketch reuses the bounded sid for isMember, so under session-bound markers a line whose sessionId is a refused string moves from excluded to member, and neither the fallback table, the trust audit nor the L63 enumeration says so."
  evidence: "The row field `session_id` is the `sessionId` when `isIdentityToken` admits it, else `null`: the same null a wrong-type"
```

**Probe.** Markers bound to session S. A line with a 200-character or path `sessionId`:

- HEAD excludes it (`excluded=1`);
- `fixed` admits it as a row, with `dropped: ["requests[1].session_id"]`.

A null `sid` is a wildcard in `runWindow`'s `openingFor`. Test fixtures mostly use null-bound markers, which cannot see the difference.

**Recommendation.** Keep membership on the raw string and bound only the emitted field. Or state that a refused session is a membership wildcard, and pin it with session-bound markers.

### R2-G8 — "The emitter always writes those" is false over a crafted markers file

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:230"
  problem: "normalizeMarkers keeps any numeric iteration, so a markers.jsonl stage-start with iteration 1.5 makes today's emitter write a row iteration of 1.5, GREEN today and RED under the new integer-or-null rule, and the compatibility note covers only --verify-transcript re-derivation, not new internal rules that RED an old ledger."
  evidence: "New per-row shape rules: `stage` is a string or `null`, and `iteration` an integer or `null`. The emitter always"
```

**Probe (HEAD).** A marker `iteration` of `1.5` gives a row `iteration` of `1.5` and 0 REDs today. The same holds for `WALK_MAX_DEPTH` over an old ledger whose `usage` is deeper than it.

**Recommendation.** Keep a marker `iteration` only when `Number.isInteger` (emitter side). Or name the residual, and extend the compatibility note to internal rules, including the `/1` "never retroactively REDed" promise.

### R2-G9 — a `__proto__` usage key vanishes without a `dropped[]` entry

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:218"
  problem: "isTokenLeaf admits the key __proto__, and assigning it on a plain output object sets the prototype, so the key silently disappears from the emitted usage with nothing listed, against rule 2's never-silently wording and the plan's new key bound."
  evidence: "`sanitizeUsage(value, path, dropped, depth = 0)` refuses any node deeper than that, and any object key `isTokenLeaf` refuses."
```

**Probe (HEAD and fixed alike).** A `usage` whose own keys are `output_tokens`, `__proto__` and `server_tool_use` serializes as `{"output_tokens":5,"server_tool_use":{}}`, with `dropped=[]`.

**Recommendation.** Build `out` with `Object.create(null)`, or refuse `__proto__` as a key. Add it to the key alphabet.

### R2-G10 — after the fix, the record and the ledger order timestamps differently

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:203"
  problem: "The record's window moves to numeric tsMs comparison while the ledger's window_start, window_end and row sort stay lexical, so on mixed-precision timestamps the two renderers disagree and the ledger's window inverts."
  evidence: "The window takes a `timestamp` only when `tsMs` (imported from `run-window-core.mjs`) parses it, and compares by"
```

**Probe (fixed copy).** Timestamps `…09:30:00Z` and `…09:30:00.500Z`:

- the record's window runs `…:00Z` to `…:00.500Z`;
- the ledger has `window_start` `…:00.500Z` after `window_end` `…:00Z`, and sorts its rows late-first.

**Recommendation.** Compare by `tsMs` in the ledger too, the `run-window-core.mjs` rule. Or name it.

### R2-G11 — ✧ ONE OWNER counts comments, and the plan's own phrasing trips it

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/cost-transcript-hostile-values/PLAN.md:221"
  problem: "Three planned header edits describe the request rules, and the plan's table and sketch spell message.usage and requestId ?? message.id, which transcript-core.test.mjs's ONE OWNER test rejects in any other module's comments."
  evidence: "The header's RELATIONSHIP and honest-scope paragraphs name the imported rules and the refusals."
```

**Probe.** Appending one comment containing `` `message.usage` (the root) `` to a copy of `render-cost-ledger.mjs` fails ✧ ONE OWNER.

**Recommendation.** In the record, ledger and `cost-value-core.mjs` headers, cite `sessionRequests()` instead, as the test's message says.

## Round 2 — summary

The emitter side reproduces as planned. The sketch keeps every existing record, ledger, run-report and regression test green, apart from the tests in two files the plan does not declare. L63's genuine-transcript premise holds on 115,666 local lines.

The concerns cluster in three places:

1. **The plan cannot be built as scoped (R2-G1, R2-G5).** Five existing tests break in two undeclared files. Open PR #280 would move the spec pin and the version.
2. **Claims outrun their floor ops (R2-G2, R2-G3, R2-G4).** The contract gains bounds its checker does not check. "Every parsed document gets a verdict" fails on right-typed inputs: pipe truncation, memory, time. The forgery test covers keys only, and at least three live value paths sit outside it.
3. **Smaller semantics gaps (R2-G6 to R2-G11):**
   - a second quoter;
   - membership widened by a refused session;
   - "always" over crafted markers;
   - a silent `__proto__` drop;
   - diverging window order;
   - a comment trap in the ONE OWNER test.

Not probed: the checker-side changes as a whole, and the default-heap behaviour of the backstop at `2^53` (reasoned: `RangeError` is catchable).

ADVISORY VERDICT: 11 concerns raised (2 blocking-severity, 9 advisory: 4 important, 5 minor) — for the human to weigh before /pharn-dev-build. This tally covers the interrogation only; the Step 1b lessons-declaration verdict (FLOOR, GREEN) is reported in the header and is not part of it.
