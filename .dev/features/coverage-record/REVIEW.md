# REVIEW — coverage-record

**Floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities, exit 0. The
increment was entitled to reach review.

**Trust posture (P2):** the increment is `trust: untrusted`. Nothing instruction-looking in the built
files changed reviewer behavior; no finding below rests on a claim the reviewed text makes about itself.
Every finding was **probed by execution**, not read off the source (L37) — the probe outputs are quoted
as evidence.

## Floor-gate findings (blocking)

**None.** `validate` is GREEN, no `enforces` binding is missing (the increment adds no Capability, so P1
does not attach — confirmed by the GREEN floor rather than asserted), and there is no sibling reference:
`check-review-assignments.mjs` imports `render-review-assignments.mjs`, but both are `pharn/floor/`
helpers in one layer, which is the established `lessons-index-core.mjs` shape, not a leaf→leaf crossing.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/coverage-record/PLAN.md:129"
  problem: "The PLAN declares I5 as 'a scanner-bound entry names a scanner present in lens-scanner-map.json', but the shipped checker only tests that the field is a non-empty string — so the implementation under-delivers the invariant the approved plan promised."
  evidence: 'PLAN.md:129 ''`scanner-bound` entry names a scanner present in `lens-scanner-map.json`. Primitive #3.'' vs check-review-assignments.mjs:183 ''if (a.basis === "scanner-bound" && (typeof a.scanner !== "string" || a.scanner === ""))''. Probed: a record naming `nonexistent-scanner.mjs` returns {"ok":true}.'

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-review.md:247"
  problem: "The Guarantee audit reads 'FLOOR at emission' for the assignment claim, but nothing binds a record to the emitter that supposedly produced it — the `generated_by` field is self-declared and never validated, so a hand-authored record inherits the same audit line."
  evidence: 'Probed with a forged record {schema:''totally-made-up'', generated_by:''typed by hand''} whose slice/unassigned pair was fabricated consistently → checkRecord returns {"ok":true}. The checker''s own header states this bound; the command''s audit line does not (L2 — the honesty must travel with the artifact a reader consults).'

- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/render-review-assignments.mjs:175"
  problem: "scannerHits() swallows every scanner error as a non-hit, so a scanner that crashes on all inputs silently inflates unassigned_scanner_bound instead of surfacing a broken prefilter — and 'the slice is the scanner's verdict' becomes 'the verdict OR silence'."
  evidence: "catch { return false; } — the emitter reports the same empty slice for 'the scanner ran and matched nothing' and 'the scanner failed to run'. The direction is conservative (more files look unreached), but a wholly broken scanner is indistinguishable from a clean target."

- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".claude/commands/pharn-review.md:261"
  problem: "Step 6 renders the record's target paths into the human-facing REVIEW.md BEFORE Step 6b validates the record, so the one check that control-char-fences those untrusted paths runs after the render it would protect."
  evidence: "Step 6 is at :261 and Step 6b at :279. The paths originate in an untrusted target; I6's control-character test is the fence, and it fires after the bytes have already been written into REVIEW.md."

- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/render-review-assignments.mjs:268"
  problem: "An absolute --base is silently relativized by path.join against --repo, so the record lands somewhere the caller did not name instead of failing loudly."
  evidence: "Observed live during this increment's own smoke test: `--base /tmp/pharn-smoke` created `./tmp/pharn-smoke/smoke/assignments.json` INSIDE the worktree (a stray dir, since removed). Production uses the default, so this is a CLI-ergonomics footgun rather than a live defect."
```

## Verdict

**GREEN — 0 floor-gate findings, 5 advisory.** The increment is not blocked.

The three `important` findings share one shape worth naming: **each is a place where a claim is wider
than the mechanism under it.** I5 promises map-membership and delivers a string test; "FLOOR at
emission" promises provenance the record does not carry; `scannerHits` promises "the scanner's verdict"
and delivers "the verdict or silence". None of them is the P0 disease outright — the checker's own
header is honest about the second, and the third errs conservatively — but an increment whose entire
purpose is to stop a record from claiming more than it can support should hold its own claims to that
bar. My recommendation is to narrow the three sentences rather than build the three mechanisms: the
plan's I5 line should be corrected to what shipped (or the map check added — it is three lines), the
audit line should read "FLOOR at emission **by the emitter**; a record's provenance is not verified",
and `scannerHits` should distinguish a scanner error from a clean miss.

What the increment got right is worth recording too, because it is the part that usually goes wrong: the
trigger was demonstrated before the plan existed rather than retrofitted, the `unassigned[]` →
`unassigned_scanner_bound[]` correction was caught during derivation rather than after review, and the
two mandated failure cases were mutation-tested against deliberately broken checkers instead of being
assumed non-vacuous.

## Proposed lesson candidate (NOT promoted — `/pharn-dev-memory-promote` owns that gate)

**Candidate:** _A promoted lesson that PRESCRIBES a floor check and does not get one keeps recurring, and
the recurrence is invisible because the lesson reads as handled._

**Why it clears L20's bar — observed live in this increment, not hypothesised.** The build's first
`set-writes-scope.cjs --from-plan` reported **`10 path(s)` against the 9 the human approved**, leaking
`/pharn-dev-review` into the write scope from the plan's exclusion block. The cause is exactly **L18**: the
block opened with a bold prose intro (`**Explicitly NOT in this increment**`) whose wording falls outside
the setter's narrow cue vocabulary, so the exclusion failed **OPEN**. **L20** was promoted on that same
defect in `product-capability-catalog` (6 paths against 2) and its own remedy names the fix precisely —
_"at `/pharn-dev-plan` Step 4 … re-run `set-writes-scope.cjs --from-plan` and deterministically compare
the parsed scope set against the plan's own `## Files` bullets, RED on disagreement"_ — and **that check
was never built**. So a lesson whose stated remedy is a floor check, left as prose, recurred in a plan
that **cited L20 in its own `applied_lessons`**. It was caught only because the setter prints its count
and the count was read, which is the same fragile mechanism L20 already identified as insufficient.

**Distinct from L20 itself:** L20 says a discipline-only remedy earns a floor check on the second
occurrence. This says something narrower and more uncomfortable — that **naming the check inside the
lesson does not schedule it**, and canon carries no signal distinguishing a lesson whose remedy shipped
from one whose remedy is still a sentence. Both render identically in the index.

**Provenance (for the promote gate to capture deterministically, not restated here):** feature
`coverage-record`; source `.dev/features/coverage-record/REVIEW.md` (this section) plus the build-stage
transcript where the setter reported 10 vs 9; the corrective diff is the `### Deliberately NOT in scope`
heading now in `PLAN.md`.

**Not promoted here.** `/pharn-dev-review` holds scope to `REVIEW.md` only and declares no
`.dev/memory-bank/**` path; canon is written solely by a separate `/pharn-dev-memory-promote` run behind
`check-provenance.mjs` and its human accept/deny gate.
