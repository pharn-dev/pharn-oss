# REVIEW — cost-record-session-lookup

**Floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities, exit 0. The
increment was entitled to reach review. Everything below the floor line is **advisory** except where
marked floor-gate.

**Under review (untrusted):** `pharn/floor/render-cost-record.mjs` (+100/−52),
`render-cost-record.test.mjs` (rewritten), `SKILLS_VERSION`, `README.md` badge, the `CHANGELOG` entry,
`.dev/measurements/cost-record-lookup-2026-09-21.md`.

---

## floor-gate (BLOCKING)

### F1 — a dropped guard turns "found nothing" into a confident zero

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/floor/render-cost-record.mjs:238"
  problem: 'The pre-change `a.files === 0 -> unavailable` guard was removed with no replacement, so a located-but-empty aggregate now renders `coverage: "partial"` with zero requests — an honest absence reported as a successful measurement.'
  evidence: "const a = aggregate(hits[0], sessionId);   // no files===0 check follows"
```

**Measured, not argued.** Probed live against the built module, with one project directory present and
`sessionId = "../escaped"`:

```text
single-dir traversal -> coverage: partial | requests: 0 | output: 0
note: "measured from this run's session transcript; never complete — …"
```

`findTranscriptDirs` stats `<projectsDir>/<child>/../escaped.jsonl`, which resolves **above** the child
directory, so the hit is recorded; `aggregate` then walks only `<child>/` and its filter matches nothing
→ `files: 0`. The old code returned `unavailable` here (`HEAD:pharn/floor/render-cost-record.mjs:178`);
the new code returns a `partial` block of zeros.

**Why this is blocking rather than cosmetic.** `/pharn-ship` Step 3b embeds this block verbatim into
`ship-record.json`, inside the attested content. A `partial` block reading zero tokens is indistinguishable
from a genuinely cheap run — it asserts a measurement that did not happen. That is the P0 disease in
miniature: a confident, well-typed output with nothing behind it, where the module's own contract says
`unavailable` is a first-class member and "an honest absence is a member, never a reason to omit the key
or to fabricate a figure."

**It is a REGRESSION, not a pre-existing bound.** The guarantee "either a real measurement or an honest
`unavailable`" held before this increment and does not now. The two other reachable routes to `files: 0`
are a TOCTOU (the transcript unlinked between `statSync` and `readFileSync`) and any future divergence
between `findTranscriptDirs`'s match and `aggregate`'s filter — the second being exactly the kind of
drift that appears when two matchers for one concept live apart.

**Remedy (smallest correct, no new capability — P7).** Restore the guard after the aggregate:
`if (a.files === 0) return unavailable(…, sessionId);`. This is not a new feature — it is the
reinstatement of behaviour the increment removed unintentionally, so it carries no P7 obligation. A
sessionId path-separator rejection would be defence-in-depth on top; it is **not** required to close this
finding and is left as a judgment call rather than smuggled in.

---

## advisory-gate (informational — never the sole basis for blocking)

### F2 — a shipped file cites a path that does not ship

```yaml
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "pharn/floor/render-cost-record.mjs:20"
  problem: "A product-surface module cites `.dev/measurements/…`, a directory a user's install never receives, so the citation is unresolvable for the reader it ships to."
  evidence: "// and the second reason is why the derivation is retired rather than corrected (measured 2026-09-21; see\n// `.dev/measurements/cost-record-lookup-2026-09-21.md`):"
```

`pharn/floor/` ships; `.dev/` does not (CLAUDE.md, the dev/product boundary). **Pre-existing precedent,
stated so this is not read as newly introduced:** the same header already cited
`.dev/measurements/token-cost-2026-08-18.md` at `:40` before this increment, and that cite is untouched.
This change adds a second instance rather than starting the pattern. Nothing detects it — `validate`'s
CHECK 8 is scoped positively to `pharn/pharn-*` capability modules and never to `pharn/floor/` — so it is
raised here or nowhere. **Deliberately not "fixed" by deleting the cite:** the measurement is the P7
evidence for the design, and a reader inside the repo needs it. The honest options are to leave it (with
this finding as the record) or to restate the conclusion inline; that is the maintainer's call, not a
defect to auto-correct.

### F3 — the multi-hit refusal is load-bearing for a case its comment calls unreachable

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-cost-record.mjs:230"
  problem: "The `hits.length > 1` branch is annotated as unreachable for a UUID id, but the probe shows it is the only thing standing between a malformed session id and a wrong directory."
  evidence: "// Unreachable for a UUID id on a sane tree; refusing beats guessing, and a guess here would\n// silently report a different run's spend as this one's."
```

In the two-directory traversal probe the refusal fired and produced the correct `unavailable`. The
comment's "unreachable" is true of the case it describes (a UUID colliding across directories) and false
as a general statement about the branch — which is precisely the [[L25]] shape: a rationale that is
accurate about what it names and quietly narrows what the next reader thinks to check. Suggest softening
to name _which_ case is unreachable, so nobody later deletes the branch as dead code. Advisory: this is a
comment-accuracy concern, and the branch itself is correct.

---

## Lens results

- **L-floor → P0.** One blocking finding (F1) and two minor (F2, F3). The header's guarantee audit is
  otherwise sound and notably honest: the reported-run claim is explicitly labelled **ADVISORY** and
  explicitly called _weaker_ than the cwd refusal it replaced, rather than presenting the swap as a pure
  improvement. The multi-hit refusal correctly cites the `check-ship.mjs` integer-compare precedent under
  primitive #3, closing the grill's F5. The `cost-record-unsplit-cache-write` residual is named, bounded,
  and its P7 non-trigger is stated with the measurement behind it.
- **L-eval → P1.** No Capability added — this is a floor checker, whose specification is its `*.test.mjs`.
  `validate` GREEN agrees with the plan's claim, and the two independently reach the same conclusion, so
  there is no floor-vs-review disagreement to report. The suite is 36/36 with 98.59% line coverage.
  **F1 is a coverage gap as well as a code defect:** no test exercises `files === 0`, which is why the
  suite stayed green across the regression.
- **L-trust → P2.** Clean, and the increment **narrows** the ingested surface: `cwd` — the one
  path-shaped field the module consumed — is no longer read. Only numeric, enum/identifier and ISO
  timestamp fields reach the output. `by_stage` keys are platform strings, but they are accumulated in a
  `Map` and emitted through `Object.fromEntries`, so the [[L15]] inherited-member leak does not apply and
  a `__proto__` key becomes an own property rather than a prototype write. **Did instruction-looking
  content change my behaviour?** No. The PLAN and GRILL contain imperatives, but each is scoped to its own
  `## Files`; nothing in the transcripts, the module or the measurement record attempted to steer this
  review, and no guaranteed decision here rests on a free-text field.
- **L-axis → P3.** One axis: _how the transcript is located_. The `--cwd` removal and the refusal removal
  are consequences of that axis, not separate reasons to change. Imports are `node:` builtins only — no
  sibling reference, nothing routed around `pharn-contracts`.

---

## Proposed lesson candidate (NOT promoted here — `/pharn-dev-review` holds no canon scope)

**Candidate A — a guard deleted as "now unreachable" is unreachable only under the reasoning that
deleted it.**

The `files === 0` check was dropped during the rewrite because, under the new lookup, a successful
`statSync` appeared to guarantee `aggregate` would find at least one file. That reasoning is sound for
well-formed input and silently assumes the two matchers — `findTranscriptDirs`'s filename stat and
`aggregate`'s `rel === …` filter — agree on every input. They do not: a `sessionId` containing `..`
satisfies the first and not the second. The transferable rule: when replacing a lookup, a downstream
guard that the _old_ lookup made necessary must be re-justified against the _new_ one's full input
domain, not against its happy path — and the cheapest re-justification is a test at the boundary, which
would have caught this.

**Provenance (for a later `/pharn-dev-memory-promote` run to capture deterministically):**

- feature: `cost-record-session-lookup`
- source: `.dev/features/cost-record-session-lookup/REVIEW.md` F1
- Relationship to canon: adjacent to [[L41]] (a default no test reaches) and [[L34]] (a per-item
  assertion set over an empty domain) — both about a code path the suite never visits — but distinct in
  mechanism: here the path was _deliberately removed_ after being judged unreachable, rather than left
  unexercised. **Honest trigger (P7):** one observed instance, found by probing during this review, not a
  recurrence. By [[L20]]'s bar that is a first occurrence, and this candidate says so rather than
  inventing a second.

Not written to canon here: `/pharn-dev-review`'s `writes:` names `REVIEW.md` only, and a canon write
belongs behind `/pharn-dev-memory-promote`'s `check-provenance` + human accept/deny gate (P2).

---

## Iteration 2 — dispositions

The review above is **iteration 1**, kept verbatim rather than rewritten, so the finding and its repair
are both on the record.

| finding | disposition                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------- |
| **F1**  | **FIXED** — guard restored at `render-cost-record.mjs:238-245`, with the boundary test that was missing |
| **F2**  | **ACCEPTED as-is** — maintainer's call; the cite is the P7 evidence and a repo reader needs it          |
| **F3**  | **FIXED** — the comment now names _which_ case is unreachable and says not to delete the branch         |

**F1 — verified closed by re-running the finding's own probe**, not by inspecting the patch:

```text
before: single-dir traversal -> coverage: partial      | requests: 0   <- the defect
after : single-dir traversal -> coverage: unavailable  | requests: 0
        note: "no transcript found for session ../escaped under …"
```

**The new test is non-vacuous, and that was measured (L34).** The module was copied with _only_ the
restored guard stripped — every other byte identical — and the suite re-run against it: `37 tests, 36
pass, 1 fail`, the failure being exactly the new case with
`AssertionError: a located-but-empty aggregate must not report 'partial'`. A test that passed both with
and without the fix would have certified nothing.

Suite after the fix: **37/37**, line coverage **98.63%** on the changed module. The floor, the outside
regression gate and all seven verify gates are green — the re-run is recorded in `REGRESSION.md` and
`VERIFY.md` rather than asserted here.

**F1's lesson candidate stands unchanged** and is if anything better evidenced now: the guard was deleted
under reasoning that held only for well-formed input, and the repair's own non-vacuity check is what
proved the deleted path was live.

## Verdict

```text
GREEN — 0 floor-gate findings open (F1 fixed), 2 advisory (F3 fixed, F2 accepted)
```

The increment is **done** as far as this review can establish. The design survives review: the evidence
for retiring the cwd derivation is strong and reproducible, the guarantee audit is honest about its own
downgrade, and the P7 decision not to add an unsplit-cache-write bucket is backed by measurement rather
than assertion.

**What GREEN here does and does not mean (P0).** It means no floor-gate finding is open and the four
lenses found nothing further — it is **not** a certificate that the increment is correct. The floor's
guarantee is `validate` GREEN plus the gates `/pharn-dev-verify` ran; everything in this document beyond
that is model judgment, including the severity I assigned to F1 and the decision to accept F2. The human
decides at the post-review gate; this review has no authority to approve, merge, or seal.
