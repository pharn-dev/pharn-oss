# REVIEW — loop-run-report

**Floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities. The increment adds
no `role:`-bearing capability, so the count is unchanged — confirmed by the checker, not by reading the
diff. (Note for the record: `grep -c 'role:'` hits **1** in each new module, and both hits are _prose_
saying "no `role:`". That a prose `role:` is not a declaration is **L6** exactly, and it is why
membership is read from `validate.mjs` / `count-verifiers.mjs` and never from a grep.)

Everything below the floor line is **advisory**. The increment under review is `trust: untrusted`;
nothing in it changed this reviewer's behaviour, and no instruction-looking content was found in it.

---

## Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/floor/render-run-report.mjs:40"
  problem: "The module header states a UNIVERSAL — that every region carrying untrusted text is a fenced
    block — and it is false. File paths and the two verdict values are rendered as INLINE CODE SPANS, and
    a file path is the most frequent untrusted value in the whole report. Probed live rather than read
    off the claim: a repository containing a back-tick-bearing path renders `- `we`ird.ts` — …`, whose
    span is broken. The safety argument for the whole design rests on this sentence, so an exception in
    its most common member is not a detail."
  evidence: "So every region carrying untrusted text is a FENCED BLOCK whose delimiter is computed by
    `fenceFor()` to be longer than any back-tick run inside it."
```

**Why this is the floor-gate class and not an advisory nit.** The L-floor lens blocks a guarantee-shaped
claim that does not reduce to what it asserts. This one was _derived from a probe and then widened_: the
pipe-in-`model` case was measured (and is genuinely fenced), and the sentence generalised from that one
member to every untrusted region. **L37**'s recipe is to probe an **excluded** member, and **L40**'s is
that probing members under the stated condition confirms membership and never the claim — neither was
applied to the universal, in an increment that cites L37 in this very paragraph.

**The bound on the bound, stated so the finding is not over-read:** this is a _rendering_ break, not an
injection. `git diff --name-only` C-quotes a path containing a newline, so no heading can be smuggled
through a file row, and the suite's section-closure assertion still holds. Nothing in the report gates
anything. The defect is the **false universal**, which is the P0 disease in its documented form.

**Two remedies, either sufficient:** narrow the sentence to name the exception (inline spans carry paths
and verdict tokens; fences carry everything else, and here is why paths are safe anyway), or route the
path through `fenceFor`-style escaping as well. The first is honest and cheap; the second makes the
sentence true as written.

---

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/render-run-report.mjs:109"
  problem: "readJson admits ANY non-null object, arrays included, so a cost.json that parses as `[1,2,3]`
    is treated as a usable ledger. The Outcome section then renders a table of `unknown` values instead of
    the designed `n/a — <reason>` line — a different claim (a ledger exists and records unknowns) from the
    true one (there is no usable ledger). Probed live: readJson returns the array, and the rendered
    Outcome block shows seven `unknown` rows."
  evidence: 'return parsed !== null && typeof parsed === "object" ? parsed : null;'
```

**This finding's sharpest part is about the TEST, not the code, and it is L52 reproduced at range zero.**
The suite contains a case literally named `"cost.json that is a JSON array, not an object"` which
**passes** — and passes for the wrong reason. It asserts `/no cost\.json/`, and that string is matched by
the **Files** section (which degrades because `base_sha` is absent), never by the object guard the case
was written to exercise. A true assertion about the wrong subject, in a suite whose own header claims to
cover the full input domain. L52 is the record of exactly this shape; here it recurred in the increment
that cited it.

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: "pharn/floor/check-build-complete.mjs:73"
  problem: "check-build-complete.mjs now carries two reasons to change: its completeness-checking logic,
    and its role as the shared `## Files` parser a renderer imports. The entry guard added in this
    increment is the visible symptom — it was required only because the export made unconditional
    `main()` execution a bug, which is a change forced by the second consumer, not by the checker's own
    job."
  evidence: "export function pathsFromPlanFiles(text) {"
```

The grill flagged this grouping as **unargued** (`P3`, minor) before the build; the build then realised
it. It is not a blocker — the parity test against `set-writes-scope.cjs` still ranges over the behaviour,
and no third copy of the parser was created, which was the point. The clean resolution is a
`plan-files-core.mjs` extraction mirroring `loop-record-core.mjs`, deferred here rather than bundled into
an increment that has already grown.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-run-report.mjs:238"
  problem: "The cost-ledger contract explicitly permits `outcome: null`, and that case renders `decision
    unknown` rather than an n/a line — the same conflation as the array finding, one size smaller. It is
    honest (nothing is invented) but it spends the report's one idiom for unusable input on a state that
    is not unusable, and vice versa."
  evidence: '["decision", o && typeof o.decision === "string" ? o.decision : "unknown"],'
```

---

## What the four lenses found clean

- **L-eval (P1):** no Capability is added, so no eval obligation attaches. Floor and lens agree — 36
  capabilities before and after, and `validate` is the arbiter.
- **L-trust (P2):** no guaranteed decision rests on any tainted field, because the artifact gates
  nothing and no proceed/stop reads it. The Handoff, the PLAN `## Files` lines, `failing_gates[]` and
  `regressions[]` all reach the page inside computed fences and nowhere else. The suite carries a
  negative control proving the `validate` CHECK-5 preamble is what keeps a hostile Handoff GREEN, rather
  than assuming it.
- **L-axis (P3):** one real hit, above. `render-run-report.mjs` itself has a single reason to change.
  The `pharn/floor/` → `pharn/floor/` imports are not sibling-module references in the layer-tree sense
  (the floor sits outside the `pharn-contracts`-rooted tree and `validate` excludes it), and they follow
  the existing `render-cost-ledger` → `render-cost-record` precedent.

## Verdict

**BLOCKED — 1 floor-gate finding.** The increment is otherwise in good shape: floor GREEN, verify PASS
on all seven gates, regress `no-regressions`, 2286/2286 tests, 100% line and function coverage on both
new modules. The blocking finding is a **one-sentence prose overclaim in a module header**, not a
structural defect — but the L-floor lens does not grade P0 claims on how expensive they are to fix, and
softening it here would be the exact move this repo exists to refuse.

## Proposed lesson candidate (NOT promoted here — P2)

One candidate, offered for `/pharn-dev-memory-promote`'s own human gate. It may be better landed as a
**sharpening of L37** than as a new entry, and that judgement belongs to the human at that gate.

- **Shape:** _A probe that motivates a design rule licenses only the value it probed — the universal
  needs a probe of the value you did not think of, and the cheapest way to find that value is to
  enumerate what the code actually emits rather than what the design discussion named._
- **Why it may be lesson-worthy:** the author probed the pipe-in-`model` case, wrote the correct rule for
  it, and then stated a universal over "every region carrying untrusted text" — while the most common
  untrusted value in the artifact (a file path) sat outside it. This happened **in the same file, in the
  same sitting, citing L37 in the adjacent sentence**, which is [[L36]]'s range-zero pattern applied to a
  quantifier rather than to an enumeration.
- **Why it may NOT be:** [[L37]] already prescribes "probe an excluded member" and [[L40]] already
  separates quantifier defects from attribution defects. Per [[L46]] this may be a _pending-remedy_
  recurrence of L37 rather than a new lesson, and manufacturing a new id would obscure that.
- **Provenance:** feature `loop-run-report`; source `.dev/features/loop-run-report/REVIEW.md` finding F1
  (`pharn/floor/render-run-report.mjs:40`), with the back-tick path rendered live before this was
  written.

---

## Disposition (added after the GATE-2 decision)

The human chose **fix F1 + F2, then re-verify**. Recorded here rather than by editing the findings
above, so what was found stays on the record next to what was done about it.

| finding                                                           | disposition            | how it was checked                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1** `P0` blocking — false universal                            | **FIXED (prose)**      | The claim is now scoped to MULTI-LINE regions and the inline-span exception is named, with its cosmetic bound argued. A test fails if the unqualified sentence returns.                                                               |
| **F2** `P5` important — `readJson` admits arrays                  | **FIXED (behaviour)**  | `!Array.isArray(parsed)` added. Re-probed live: the input that returned `[1,2,3]` now returns `null`, and the Outcome section renders the designed `n/a` line instead of seven `unknown` rows.                                        |
| **F2b** the test that passed for the wrong reason                 | **FIXED**              | A dedicated test now asserts the **Outcome** section's own reason (only the object guard can produce it), plus a negative control reproducing the pre-fix predicate and requiring it to disagree.                                     |
| **F3** `P3` important — second axis in `check-build-complete.mjs` | **DEFERRED, recorded** | Not fixed. The clean resolution is a `plan-files-core.mjs` extraction mirroring `loop-record-core.mjs`; bundling it here would grow an increment that is already large, and the existing parity test still ranges over the behaviour. |
| **F4** `P0` minor — `outcome: null` renders `unknown`             | **DEFERRED, recorded** | Not fixed. Same class as F2, one size smaller; no input state is misreported, only the idiom is spent imprecisely.                                                                                                                    |

**F1 changed no behaviour, and that is the correct outcome rather than a weak one.** A back-tick-bearing
path still renders with a broken inline span. The defect was never the rendering — it was a sentence
claiming a universal the code does not satisfy, and the fix is to make the sentence true. Escaping paths
too was the available alternative and was declined on cost: it would put a five-line fenced block under
every file row to repair a garbled row that cannot carry an injection, because `git diff --name-only`
C-quotes any path containing a newline.

**Honest limit on this section (P0).** These fixes were written and verified by the same agent that
wrote the increment. `/pharn-dev-regress` and `/pharn-dev-verify` were genuinely **re-run** and recompute
their verdicts from scratch, so those two results are floor-grade over the corrected tree. **No fresh,
independent `/pharn-dev-review` pass was run over the fixes** — this table is a disposition record, not a
second review, and a defect introduced by the fixes themselves would be caught only by the deterministic
gates. Reaching GATE 2 green is permission to present, never a judgment that the increment is good.

---

## Follow-up: F3 fixed (added after the disposition above)

The disposition recorded **F3** as `DEFERRED, recorded`, on the ground that bundling the extraction
would grow an increment that had already grown. The maintainer subsequently chose to **fix it before
committing**, so the deferral no longer holds and is superseded here rather than edited above — the same
discipline the disposition section itself states.

| finding                                            | disposition | how it was checked                                                                                                                                                                           |
| -------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F3** `P3` important — second axis in the checker | **FIXED**   | `pharn/floor/plan-files-core.mjs` now owns the `## Files` grammar. `check-build-complete.mjs` imports it and **exports nothing**; `render-run-report.mjs` imports the core, not the checker. |

**What the fix does, and what it does not.** The second axis is gone in the sense the finding named:
`check-build-complete.mjs` no longer has a reason to change that belongs to a different consumer. The
`import.meta.main` guard — the finding's "visible symptom" — is **kept**, because 15 of the product
floor's scripts carry one and `entry-point-guard.test.mjs` pins the guarded count against erosion; what
changed is its comment, which asserted a reason (the export) that no longer holds. Keeping a guard while
correcting its stated reason is the honest move; deleting it to make the symptom disappear would have
been cosmetic.

**The canonical parser is still `set-writes-scope.cjs`.** The extraction moved a _copy_, it did not
promote one. The core carries the parity obligation, and the ★ PARITY case that already ranged over the
behaviour is what covers the move — it spawns both CLIs, so it never noticed the indirection.

### The extraction surfaced a gap it did not create

Giving the parser its own file made its coverage legible for the first time, and the **Boundary-2
exclusion-cue `break` was reached by no product-floor test** — 98.40% line, the two uncovered lines being
exactly that branch. It had been covered only inside `.claude/hooks/set-writes-scope.test.cjs`, the
setter's own suite. That is **L31** precisely: the second copy is where the obligation drops. It matters
more than an ordinary coverage hole because this is the rule that has been **wrong twice** already
(`setter-cue-fix`, `plan-cue-continuation`), which is the same reason `loop-record-core.mjs` exists and
is at 100%.

Closed by a **parity** case rather than a local assertion, so both implementations are held to one
answer instead of each to itself. It pins the cue's two exemptions — a blockquote, and an authorized
item's own description — as non-vacuity controls (**L34**), because a fixture proving only "the cue
truncates" would stay green if the exemptions silently stopped working, and those exemptions _are_ the
two prior bugs. A **mutation control** was run: with the `break` disabled the test fails; the file was
restored byte-exact and re-verified. `plan-files-core.mjs` is now **100% line, branch and function**.

**Honest limit, unchanged (P0).** This is still the same agent fixing findings against its own
increment, and **no fresh `/pharn-dev-review` pass ran over this fix either**. What is floor-grade is
what the deterministic gates recompute: `npm run check` exit 0, the full suite green, `validate` GREEN,
and `check-bash-reconcile` CLEAN over an epoch re-anchored before the work began.
