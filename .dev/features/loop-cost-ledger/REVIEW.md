# REVIEW — loop-cost-ledger

**Increment:** the `/pharn-loop` cost ledger — `pharn/pharn-contracts/cost-ledger.md` + `mark-phase.mjs` +
`render-cost-ledger.mjs` + `check-cost-ledger.mjs` + 60 tests + 4 fixtures + the `/pharn-loop` wiring and
the enumeration/meta-doc edits. Committed as `8dacaa9`.

**Floor first (Step 1): `node pharn/floor/validate.mjs .` → GREEN, exit 0, 36 capabilities.**
Standing verdicts: regress `no-regressions`, verify `PASS` (6/6 gates, `reconcile` CLEAN).

> **Trust (P2).** The increment is `trust: untrusted`. Every `problem` / `evidence` below quotes it as
> **DATA**. **Did instruction-looking content change my behavior? No.** The reviewed tree contains a great
> deal of instruction-shaped prose — it is a repo made of commands — and none of it attempted to steer this
> review. One thing worth naming rather than glossing: the increment was authored earlier in this same
> session, so the strongest bias here is **self-confirmation, not injection**. Every finding below was
> therefore established by **probing the built artifact**, with a working control, rather than by reading
> the code I wrote and agreeing with it.

---

## Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/pharn-contracts/cost-ledger.md:238"
  problem: "The contract asserts that the leaf-shape rule bounds attribution_skill, model and agent_id — it does not; those three fields are copied verbatim from an untrusted transcript with no length bound, no control-char guard and no shape check, so a durable contract states a bound the implementation does not provide."
  evidence: '"They key a **view**, never a gate, and the leaf-shape rule bounds what can land in them". PROBED with a control: a 200,000-char `attribution_skill`, a `attribution_skill` containing `\u0007` and `\u0000`, one containing a newline plus a forged `RED — …` line, a 200,000-char `model`, and a control-char `agent_id` are each accepted **GREEN** by check-cost-ledger.mjs, while the control — a `usage` leaf containing spaces, the field the rule really covers — REDs. The same false claim appears in the PLAN''s Trust audit: "bounded by the leaf-shape rule (a ≤N-char token, no control chars)".'
```

**Why this is the blocking one.** It is the P0 disease in its exact canonical form — _written in the
contract_ mistaken for _therefore guaranteed_ — and it is [[L2]] recurring: a contract may cite only a
floor op that is **live for the thing it claims to cover**. `sanitizeUsage`'s token rule is live, but it
is applied to `usage` **only**; the sentence extends it to three fields it never touches.

**Bounded, and the bound matters for triage.** `cost.json` gates nothing (fix #3), so no guaranteed
decision rests on these fields, and `ABS_PATH_RE` (rule 3) still sweeps the whole document, so a path
cannot hide there. The exposure is a committed artifact carrying unbounded attacker-influencable strings,
plus a false sentence in a durable contract. **Two honest remedies**, and they are not equivalent:
apply `cleanScalar` + a length bound to the three identity fields in the emitter **and** check them in
`check-cost-ledger.mjs` (closes the gap, makes the sentence true); **or** correct the contract and the
PLAN to say what is actually true (only rule 3 applies). The first is better; the second is not optional
if the first is declined.

---

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/render-cost-ledger.mjs:607"
  problem: "The `pharn/features` default exists in TWO places while the plan's own L41 body line claims it exists in exactly one, and the no---base write path that reaches the second copy is exercised by no test — L41's defect reproduced inside the increment that cited L41."
  evidence: '`:365` `featureBase = "pharn/features"` (renderLedger) and `:607` `const dir = join(opts.repo, opts.base ?? "pharn/features", opts.name)` (the CLI write path). The PLAN states: "the emitter''s `--base` default exists in exactly **one** place, and one test exercises the no-argument path". The test that exists exercises **mark-phase**''s default; every render-cost-ledger CLI test passes `--base` explicitly or uses `--stdout`, which does not write — so `:607` is dead to the suite, exactly as `render-ship-briefing.mjs:438` was.'
```

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: "pharn/floor/check-cost-ledger.mjs:104"
  problem: "The usage leaf-domain rule is encoded twice — once in the emitter, once in the checker — and the two ALREADY DIVERGE, with nothing ranging over the pair; `cleanScalar` additionally exists in three separate copies."
  evidence: "Emitter `render-cost-ledger.mjs:180`: `cleanScalar(value, 64) && TOKEN_RE.test(value) && !ABS_PATH_RE.test(value)`. Checker `check-cost-ledger.mjs:104`: `!cleanScalar(value, 64) || !TOKEN_RE.test(value)` — the `ABS_PATH_RE` term is absent, so the checker's leaf rule is strictly weaker than the emitter's. `function cleanScalar` appears at `mark-phase.mjs:68`, `render-cost-ledger.mjs:154` and `check-cost-ledger.mjs:72`."
```

**On F3's severity.** The divergence is **masked today** by rule 3, which sweeps absolute paths from the
whole document regardless — so no input currently behaves differently. That is why it is important and
not blocking. But it is [[L31]] precisely: a copy-pair creates an obligation set nothing enumerates, and
the second copy is where the obligation is dropped. The increment took `render-cost-record.mjs`'s
transcript lookup by **import** (correctly, and the PLAN says so under L35) and then hand-wrote the leaf
rule twice — so the discipline was applied to one shared thing and not the other.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/render-cost-ledger.mjs:307"
  problem: "A marker written while CLAUDE_CODE_SESSION_ID is unset records session_id: null, and a null-session marker then attributes requests from EVERY session — silently weakening the constraint the attribution method's own name asserts."
  evidence: 'The guard is `if (m.session_id !== null && sessionId !== null && m.session_id !== sessionId) continue;` — vacuous when either side is null. PROBED: a single `session_id: null` marker returns `{stage: "pharn-build", iteration: 1}` for a request in session "A" AND for one in session "B". The method is named `latest-marker-at-or-before-ts-same-session/1`. `mark-phase.mjs` sets `sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? null`; the variable IS set under Claude Code (verified live), so the normal path is sound — but the PLAN names a hand-run recovery path ("running the emitter by hand must rebuild the record from the markers file alone"), and a human running `mark-phase.mjs` from an ordinary shell produces null-session markers.'
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs:286"
  problem: "--verify-transcript re-derives using only sessions[0], so a ledger spanning more than one session would compare a partial re-derivation against the full row set and produce a false RED in the very mode that is supposed to be the strong check."
  evidence: "`sessionId: led.sessions?.[0] ?? null`, while the contract types `sessions` as an array. MEASURED as NOT REACHABLE TODAY and recorded as such rather than inflated: the emitter filters transcript files by one session id, and real subagent records carry the SAME sessionId as their parent (checked across four pharn-cli subagent files: `2db85acb…`/`495add8e…` parents, every record matching). So `sessions[]` has exactly one member for every input the emitter can currently produce. This is a latent narrowing, not a live defect."
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-cost-ledger.mjs:191"
  problem: "When an array element is dropped, surviving elements are compacted while dropped[] cites the pre-compaction index, so the recorded key path does not resolve against the emitted document."
  evidence: 'PROBED: `sanitizeUsage({arr:[1,"bad string with spaces",3]})` emits `arr: [1,3]` and records `dropped: ["usage.arr[1]"]` — in the output, index [1] holds the surviving `3`. Never fires on real data (`dropped` is `[]` across the whole fixture), so this is fidelity of the diagnostic, not of the measurement.'
```

---

## Lens results

- **L-floor → P0.** One blocking finding (above). Otherwise the guarantee discipline holds unusually well
  and was spot-checked rather than assumed: `coverage` genuinely has no `complete` member; no price table
  or `$` appears anywhere in the emitted file (asserted by a test); the checker prints its own L43 bound
  on **every** GREEN, so the bound travels with the verdict rather than living only in a header; and the
  determinism claim was **corrected during the build** to "same transcript **and markers** bytes" after the
  grill caught the false quantifier. "No usernames" is struck and appears nowhere — verified by search.
- **L-eval → P1.** No `role:`-bearing capability is added, so the `enforces` ↔ eval binding does not apply
  and `validate` agrees (GREEN). The substitute obligation was met: 60 hermetic tests, one **mutation
  control per floor rule** materialised in a single table the loop ranges over (so a rule added later is
  covered without editing an assertion), plus a specificity control asserting each mutation's RED does
  **not** fire on a clean ledger. Non-vacuity is handled where L34 demands it: an empty `requests[]` is a
  legitimate state that must still agree with `coverage` and every view.
- **L-trust → P2.** The blocking finding is this lens's. Otherwise: message bodies are never read, `cwd`
  and `gitBranch` are never copied, and a test walks the committed fixtures asserting no absolute path,
  no `cwd`, no `gitBranch`, no message content — the guard the grill's blocking finding forced, and it
  discovers fixtures by walking the directory so a later one inherits it. No guaranteed decision rests on
  any tainted field, because `cost.json` gates nothing.
- **L-axis → P3.** F3 is this lens's (a duplicated rule, not a sibling import). No sibling reference:
  the three imports (`render-cost-record`, `mark-phase`, `frontmatter-core`) are all within `pharn/floor/`,
  which is the floor, not a module layer — and `validate` CHECK 6 agrees. `render-cost-ledger.mjs` does
  carry several responsibilities (read, normalize, view, render a table, write), which is a mild axis
  smell, but it matches the shape of `render-ship-briefing.mjs` and `render-review-assignments.mjs`; not
  raised as a finding against standing precedent.

---

## Verdict

**BLOCKED — 1 floor-gate finding.** The increment is **not done**: a durable contract asserts a bound the
implementation does not provide.

That verdict needs one piece of context stated plainly rather than buried: **this increment is already
committed and pushed to `main`** (`8dacaa9`), because a commit landed mid-build. So "blocked" cannot mean
"do not merge" — it already merged. It means the follow-up is owed, and the honest reading of the three
green verdicts above is that **they were never capable of catching F1**: `validate` checks structure, not
prose honesty; regress compares exit codes; verify runs gate exit codes. Nothing in the floor reads a
contract sentence for truth. This is the lens finding what the gates structurally cannot — which is the
argument for the review stage existing, delivered on the one run where it was skipped.

---

## Proposed lesson candidate (NOT promoted — `/pharn-dev-memory-promote` is a separate, human-gated run)

**Candidate: L41's defect has now recurred, which meets its own stated trigger.**

L41's text ends: _"No checker is added here — P7's bar is a real second failure, and this is the first."_
F2 above **is** that second failure, and it is sharper than a repeat: the duplicated default was
introduced **in an increment whose `applied_lessons` cites L41**, whose PLAN asserts in its own body
_"the emitter's `--base` default exists in exactly one place, and one test exercises the no-argument
path"_, and which **did** write that no-argument test — **for the other module**. The lesson was read,
declared, and satisfied on `mark-phase.mjs` while the file it was actually about grew a second copy.

That is [[L20]]'s escalation bar met on L41, and [[L46]]'s shape exactly — canon cannot distinguish a
lesson whose remedy shipped from one whose remedy is still a sentence, so L41 kept reading as handled. It
is also [[L29]]: the remedy is quantified over _defaults in this file_, and the test was written for
whichever member was in front of the author.

- **target:** `.dev/memory-bank/lessons-learned.md`
- **source:** this `REVIEW.md` finding F2 (`pharn/floor/render-cost-ledger.mjs:607`)
- **feature:** `loop-cost-ledger`
- **provenance:** captured deterministically by `/pharn-dev-memory-promote`, not here.

**A second candidate is recorded rather than dropped** (one-per-run is a rate bound, not a capacity
limit): F1 — _a contract sentence that extends a live floor op to fields it does not cover is the P0
disease in its most deniable form, because every cited mechanism genuinely exists._ That is arguably
[[L2]] recurring rather than a new lesson, which is why it is listed second and not carried.
