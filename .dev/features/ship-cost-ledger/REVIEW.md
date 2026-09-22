# REVIEW — ship-cost-ledger

**Floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities. Re-confirmed at
`/pharn-dev-verify` as a verdict-owning gate. The floor is the only guaranteed part of this review;
everything below is **advisory** model judgment.

**The increment under review is `trust: untrusted`.** Its free text — including the PLAN and GRILL this
same run produced — is quoted below as DATA. Nothing instruction-looking in it changed my behavior, and
`## L-trust` below records the one place I checked that claim rather than asserting it.

---

## Floor-gate findings (blocking)

**None.** Every guarantee the increment claims reduces to a floor primitive or carries an `advisory`
label, no `enforces` rule_id was introduced, no sibling reference crosses a module root, and no
guaranteed decision rests on a tainted field.

---

## Advisory findings

### F1 — the new `## Briefing` section states something FALSE about `/pharn-loop`

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/render-run-report.mjs:briefingSection"
  problem: "The absent-briefing sentinel attributes a GATE 2 to whichever command emitted the ledger, so a /pharn-loop run's report now reads that /pharn-loop renders a briefing at GATE 2 — a command that has no GATE 2 and never renders one."
  evidence: "Probed live rather than read off the code (L37). With a loop cost.json the rendered section is: `_n/a — no BRIEFING.md beside this report — `/pharn-loop` renders one only at GATE 2, and some commands never do_`. /pharn-loop's own description states it 'keeps NEITHER of this command's human gates'."
```

**Introduced by this increment**, in a **deterministic renderer** whose whole claim is that every line is
derived rather than authored — which makes a false derived line worse than a false hand-written one. The
trailing clause "_and some commands never do_" was written to cover exactly this case and instead reads
as an afterthought qualifying a sentence that has already named the wrong command.

It **gates nothing** (no proceed/stop reads the report), so this is not blocking. But it is the P0 shape
in miniature: a sentence that is true for the caller the author had in front of them, emitted for a
caller it is false for. The narrowest correction is to drop the GATE-2 attribution from the sentinel and
state the artifact's absence without explaining another command's lifecycle.

### F2 — `ship-outcome-core.mjs` is named for one caller and written for any

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/ship-outcome-core.mjs:1"
  problem: "The module hardcodes no command and no stage name — it derives from markers plus the two verdict reports, which any pipeline command produces — so its `ship-` prefix over-narrows what it is and will read as wrong the day a third caller imports it."
  evidence: '`deriveShipOutcome({markers, verifyVerdict, regressVerdict})` branches only on two verdict enums and the last `stage-start` marker; `render-cost-ledger.mjs` reaches it through a `??` fallback keyed on the ABSENCE of a LOOP.md envelope, not on `command === "/pharn-ship"`.'
```

**Raised with its own counter-argument, because P7 cuts the other way.** Renaming now to serve a third
caller that does not exist is the speculation P7 forbids, and the extraction itself was the right call
(GRILL G3). The honest record is that the name will expire the moment a third command lands — the [[L33]]
shape — and that the fallback is keyed on a structural condition rather than on the command string, which
is what makes the module genuinely reusable despite its name.

### F3 — PRE-EXISTING, surfaced not introduced: a canon defect that is pinned in one test and repeated, uncorrected, in seven other places — two of which now contradict each other

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/memory-bank/lessons-learned.md:423"
  problem: "Lesson L14's stated MECHANISM is factually wrong about JavaScript, the repo already knows this and pinned it in one test, and the correction reached neither canon nor six other files that repeat the claim — including one half of a deliberate copy-pair, whose two copies now assert opposite facts about the same regex."
  evidence: "L14: 'JavaScript `$` (without the `m` flag) matches at end-of-string OR just before a single trailing newline, so `/^P[0-7]$/.test(\"P2\\n\") === true`.' Measured on Node v24.13.1: `/^P[0-7]$/.test(\"P2\\n\")` is **false**; `/^\\d+$/.test(\"2\\n\")` is **false**. That is Perl/Python/PCRE behaviour, not JavaScript's — in JS `$` without `m` matches only at end of input."
```

**This is NOT a discovery of mine, and saying so is the point.**
`.dev/floor/check-version-badge.test.mjs:245` already carries a test named
`✧ CANON DEFECT: JS \`$\` does NOT match before a trailing newline — lessons-learned L14 says it does`,
which asserts the correct behaviour and explains that "Canon itself is edited only through a gated
promotion, so this test reports rather than fixes." The defect was found, understood, and pinned.

**What was never done is the enumeration.** Sweeping the invariant substring rather than the sentence
([[L33]]'s recipe), the claim still stands in:

| site                                      | surface     | status                                            |
| ----------------------------------------- | ----------- | ------------------------------------------------- |
| `.dev/memory-bank/lessons-learned.md:423` | canon       | the original; human-gated, cannot be agent-edited |
| `pharn/floor/mark-phase.mjs:67`           | **product** | repeats the false example verbatim                |
| `pharn/floor/lessons-index-core.mjs:128`  | **product** | repeats it                                        |
| `pharn/floor/check-loop-record.mjs:112`   | **product** | repeats it                                        |
| `.dev/floor/check-provenance.mjs:178`     | apparatus   | repeats it                                        |
| `.dev/floor/lessons-index-core.mjs:102`   | apparatus   | repeats it                                        |
| `.dev/floor/check-provenance.test.mjs:16` | apparatus   | repeats it **as a test's stated purpose**         |

**The sharpest instance, and the reason this is `important` rather than `minor`:** the deliberate
`check-provenance.test.mjs` copy-pair now states **opposite facts**.

- `pharn/floor/check-provenance.test.mjs:17` — _"JS `$` without the `m` flag matches only at
  end-of-input, so there is no trailing-newline hole here"_ — **correct**.
- `.dev/floor/check-provenance.test.mjs:16` — _"`CONCEPT_RE.test(\"enum-gate\n\")` is TRUE on its own —
  JS `$` without the `m` flag matches before a single trailing newline — so a shape-regex-only check
  would admit it"_ — **refuted by a live probe**: with `CONCEPT_RE = /^[a-z0-9-]+$/`,
  `CONCEPT_RE.test("enum-gate\n")` is **false**.

So the dev half's `✦` test does not witness what its comment says it witnesses: the shape regex alone
already rejects that input, and removing the guard would not admit it. That is [[L31]] exactly — a
deliberate pair whose obligations nothing ranges over, with the correction landing in one copy — and it
is worse here than L31's original instance, because the two copies do not merely differ in coverage,
they **disagree about a fact**.

**What is NOT wrong, stated so this finding is not over-read:** L14's **remedy** — compose the
control-char guard before the anchored shape regex, never as a replacement — is sound, and every module
above follows it. No checker is wrong and no gate is weakened; `cleanScalar` earns its place on a
**length bound** and on control characters other than a trailing newline, which
`.dev/floor/check-version-badge.test.mjs:260` already records. **Only the reason given is false.** This
is scope-external to `ship-cost-ledger` and is reported, not fixed: `/pharn-dev-review` writes
`REVIEW.md` only, and canon moves through `/pharn-dev-memory-promote`'s human gate.

### F4 — a vacuously-true sentence in the ship run's `## Verdicts`

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-run-report.mjs:verdictsSection"
  problem: "For a ship run with no Step-2b retry the section reads 'iteration 1 (final) only … earlier iterations' verdicts are not on disk at the stop', which warns a reader about the loss of iterations that never existed."
  evidence: "`iterations` is 1 for every ship run that did not retry, and the label is unconditional: `**${label} only.** ${commandLabel(cost)} OVERWRITES …`."
```

Not false — the overwrite claim holds for both commands whenever they re-run a stage — but the caution is
noise at `iterations: 1`. Left as-is deliberately would also be defensible; recorded so the choice is on
the record rather than unnoticed.

---

## The four lenses

### L-floor → P0

The increment's guarantee claims were checked one by one against what runs.

- **`gate2` → FLOOR.** It reduces to membership over two sub-stage `.verdict` enums, both produced by
  tested non-LLM checkers. The module tests those strings and nothing else; it never recomputes a
  verdict. ✔
- **`stop:<stage>` → ADVISORY, and the split is carried in the ARTIFACT, not only in a contract.**
  `RUN-REPORT.md`'s `## Outcome` preamble prints which half is which, which is what GRILL G2 asked for
  and what P0's "labeled advisory **wherever it appears**" requires. ✔
- **Rule 7 → FLOOR (enum-regex).** It closes a label this contract had carried unbacked since it
  shipped. Probed in both directions during build: a bad `source` and an extra key each RED; the six
  real shapes each pass. ✔
- **Step 3a's own audit** claims nothing for itself — the emission is advisory Bash, the checker's exit
  gates nothing, and the position (before Step 3b) is stated as a property of the prose rather than as a
  floor op. ✔
- **The single-session and pre-`<name>` bounds are stated in three places** (command, contract,
  CHANGELOG) rather than discovered by a later reader. ✔

No guarantee was found without either a floor reduction or an `advisory` label.

### L-eval → P1

No Capability is added, so no `enforces` binding is introduced and `validate`'s eval checks have nothing
new to range over — the floor's GREEN and this lens agree, which is the agreement this lens exists to
confirm. The executable specification is the suite: **2325/2325**, with **11** new tests for the
extracted core and coverage of **100% line / 100% branch / 100% function** on it; 98–100% line and 100%
function across the other three modules touched.

**One honest note on what coverage means here:** it measures which lines ran, never whether the
assertions about them were the right ones — which is exactly how [[L52]]'s recorded instance passed with
2240/2240 green.

### L-trust → P2

- **Free-text handling.** The report's new section emits a LINK and this file's own prose; no byte of
  `BRIEFING.md` is read in, so an untrusted artifact's reach is not widened. Every multi-line untrusted
  region stays inside a computed fence.
- **A genuinely new taint boundary was added and tested.** `cost.json`'s `command` is a CLI argument the
  ledger bounds only to ≤128 control-char-free characters, and two sections now name it in **prose**,
  outside any fence. It is membership-tested (`^/[a-z0-9][a-z0-9-]{0,63}$`) with a generic phrase as the
  terminal fallback — never a silent rewrite, which would misname the command. Seven hostile rows plus a
  mutation control pin it.
- **The stage token is re-tested at READ time**, not trusted from `mark-phase.mjs`'s write-time
  validation, because `markers.jsonl` is ordinary `.pharn/` state a Bash write reaches. Seven refused
  tokens plus a mutation control.
- **Did instruction-looking content change my behavior?** I checked rather than asserted: the artifacts
  this increment reads are `cost.json`, two verdict JSONs and `markers.jsonl`, and every value the
  verdict path consumes is an enum, an integer or a grammar-bounded token. I did not catch myself about
  to comply with anything. The PLAN and GRILL I read at earlier stages are my own output; treating them
  as untrusted is why G1's finding was acted on as a claim to verify rather than believed.
- **No guaranteed decision rests on a tainted field.** `check-cost-ledger.mjs` cannot receive a finding,
  and the report gates nothing.

### L-axis → P3

- The extraction is the lens's own verdict applied at grill: `render-cost-ledger.mjs` changes with the
  ledger schema, `ship-outcome-core.mjs` with `/pharn-ship`'s control flow. Two reasons, two files.
- **No sibling reference.** All three modules sit in `pharn/floor/`, which is not a module root in the
  §4 tree; the import graph is acyclic (`ship-outcome-core` imports nothing from its consumers).
- `check-cost-ledger.mjs` imports `OUTCOME_SOURCES` rather than re-spelling the members, so the enum has
  one definition — the alternative would have been the copy-pair F3 is about.

---

## Proposed lesson candidate (ONE; proposed, never written — P2)

**A defect that is PINNED by a test feels handled, and the pin is not the deliverable — the enumeration
of the claim's cites is.**

`.dev/floor/check-version-badge.test.mjs` proved L14's mechanism false, asserted the truth, explained why
it could not fix canon, and stopped. That is more rigour than most corrections get, and it is **why the
propagation was never done**: a green pinned test reads as closure, so nobody swept for the other cites.
Seven sites still carry the false claim, three of them on the **product surface**, and one half of a
deliberate copy-pair now asserts the opposite of its twin about the same regex — a state in which a
reader who checks one copy gets a confident, wrong answer.

**Distinct from its neighbours, and the distinction is the usable part.** [[L50]] says a sweep must
enumerate the cites of the **referent** that broke, not only the claim's spellings — it assumes a sweep
is happening. [[L31]] says a copy-pair's obligations need a materialized set — it is about coverage, not
about two copies stating contradictory facts. [[L46]] says canon cannot tell a shipped remedy from a
sentence — here the remedy shipped as a TEST and still did not travel. The new part: **a test that
documents a defect it deliberately does not fix creates an obligation with no owner**, and its own
thoroughness is what conceals that.

**Provenance (for `/pharn-dev-memory-promote` to capture deterministically — not computed here):**
surfaced in `.dev/features/ship-cost-ledger/REVIEW.md` finding **F3**, during the `ship-cost-ledger`
increment; evidence is the live probe above plus the seven-site enumeration table.

**This candidate is scope-external** to `ship-cost-ledger` and rests on a **pre-existing** defect. Per
P7 that is a real failure rather than a hypothetical, but the human should weigh whether one more lesson
in the L29/L31/L46/L50 family earns its place, or whether the right outcome is simply to sweep the seven
sites and correct canon.

---

## Verdict

**GREEN — blocked by 0 floor-gate findings.** The floor is GREEN, the deterministic gates PASS, and no
blocking finding was raised.

**Four advisory findings stand, and one of them is a defect this increment introduced** (F1 — a false
sentence about `/pharn-loop` in a rendered artifact). Advisory means it does not block; it does not mean
it should ship unexamined. F3 is pre-existing and scope-external, surfaced here and reported rather than
fixed.

**What GREEN does NOT mean (P0).** It means the floor held and these four lenses raised nothing blocking.
It is **not** a judgment that the increment is good or wise — that is the human's call at the post-review
gate, which is where this run now stops.

---

## Post-review disposition (appended after the human decided at the gate)

Recorded here rather than only in `SHIP.md`, so a reader of this file alone is not left believing a
finding still stands when it does not. The findings above are the record of what the review **found**;
this section is what happened next.

| finding | disposition                                                                                                                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1**  | **FIXED before the gate closed**, at the human's direction. The sentinel now states the artifact's absence and explains no command's lifecycle, and a `★ F1 REGRESSION` test probes the rendered line **per caller** (L37) with a mutation control. |
| **F2**  | Open, accepted. Renaming for a third caller that does not exist is the speculation P7 forbids; the name's expiry is on the record.                                                                                                                  |
| **F3**  | Open, scope-external. The human chose the sweep over a lesson — see `SHIP.md`'s `lesson:` line and the follow-up named there.                                                                                                                       |
| **F4**  | Open, accepted as-is.                                                                                                                                                                                                                               |

**The F1 fix cost a second full verification, and that is worth recording.** Removing the command name
from the sentinel left `briefingSection`'s `cost` parameter unused, which turned the `lint` gate **RED**
— `check-verify.mjs` returned `FAIL ["lint"]` on the re-derivation. The parameter was dropped rather
than the linter silenced, and both verdicts were then recomputed from scratch: verify `PASS` (all seven
gates 0, `reconcile` `CLEAN`), regress `no-regressions`.

**The point is not that a small fix broke a gate — it is that inheriting the earlier PASS would have
shipped a red one.** The verdicts standing at GATE 2 are re-derived against the tree as it now is, not
carried over from before the fix.
