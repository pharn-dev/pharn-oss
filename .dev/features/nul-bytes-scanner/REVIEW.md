# REVIEW — nul-bytes-scanner

**Step 1, floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities`,
exit 0, both before and after the repair recorded below. The floor is the only guaranteed part of this
review; every lens finding below is model judgment.

**Trust posture (P2):** the increment under review is `trust: untrusted`. Nothing instruction-looking
was found in the reviewed files, and nothing in them changed my behavior. The one thing that came close
is worth naming rather than omitting: the reviewed scanner carries a long rationale comment that
_asserts what a guard guarantees_, and the correct handling was to **test that assertion against the
guard** rather than believe it — which is what produced F1.

---

## Floor-gate findings (blocking — these mean the increment is not done)

### F1 — the increment committed the exact disease it exists to fix

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/floor/scan-code-missing-error-handling.mjs:320"
  problem: "The shipped scanner's new rationale comment claimed the guard test ENFORCES a printable-ASCII source, a guarantee the guard explicitly does not provide and explicitly disclaims in its own header — an unreduced guarantee asserted in shipped bytes."
  evidence: "The separator is defensive; the printable-ASCII SOURCE is the property .dev/floor/source-nul-guard.test.mjs enforces."
```

**Why this is blocking and not a wording nit.** The guard's own honest-scope block says, in the same
increment: _"ONE BYTE VALUE. It tests 0x00 and nothing else. … 'The source is printable ASCII' is NOT
what green means — that claim would be the 'written in the contract' → 'therefore guaranteed' disease P0
names."_ The scanner comment asserted precisely the sentence the guard refuses. Two artifacts written in
one sitting, by one author, disagreeing about what the guarantee is — and the **shipped** half carried
the overclaim while the **unshipped** half carried the disclaimer.

This is L25 recurring **inside the increment built to repair an instance of L25**: a rationale comment
that reads as a completed analysis and is wrong in a load-bearing way. It is also the shape L37 names —
a doc stating a guard's bounds must be **probed against the guard**, not read off it. The finding was
produced by doing exactly that probe.

**Disposition: REPAIRED in this increment**, within the plan's declared `## Files` (no scope change, no
re-plan). The sentence now reads: _"What the convention covers is exactly this ONE BYTE staying out of
the source — it is NOT a claim that the source is printable ASCII, and no check here establishes that
broader property."_

### F2 — shipped bytes cited an apparatus path that does not exist in an install

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: "pharn/floor/scan-code-missing-error-handling.mjs:320"
  problem: "A product-surface file pointed at `.dev/floor/source-nul-guard.test.mjs`, which the installer never ships — a prose dependency running product -> dev, the forbidden direction, leaving a dangling reference in every user's install."
  evidence: "the printable-ASCII SOURCE is the property .dev/floor/source-nul-guard.test.mjs enforces."
```

**Why it matters, and why no gate caught it.** CLAUDE.md states the rule for the deliberate copy-pairs:
_"a user's install ships `pharn/floor/` **without** `.dev/`, so the dependency may only point `.dev/` →
`pharn/` and never the reverse."_ This pointed the reverse. `validate.mjs` CHECK 8 does **not** cover it
— that check REDs a `.dev/floor/<B>` cite where `pharn/floor/<B>` **exists** (a relocated checker), and
here no `pharn/floor/` twin exists, so the existence gate never fires. It is scoped to the capability
canon besides, not to `pharn/floor`. So this class of dangling product→dev reference is currently caught
by **nothing deterministic**; it was caught by reading.

**Disposition: REPAIRED** by the same edit — the replacement sentence names the property directly and
cites no `.dev/` path, so the shipped file no longer references anything absent from an install.

**Residual, stated not hidden:** the underlying gap is unclosed. A future product-surface file may again
cite a `.dev/` path in prose and no checker will notice. Not fixed here, because P7's bar is a real
recurrence and this is occurrence one — recorded as the named residual `product-cites-dev-path-check`.

---

## Advisory findings (judgment — these inform, they never block)

### F3 — the guard's non-recursive walk is correct today and silently degrades tomorrow

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/floor/source-nul-guard.test.mjs:38"
  problem: "The sweep reads only files directly under each floor directory, so a `.mjs` added under either `test-fixtures/` subtree would be silently uncovered rather than reported as out-of-scope."
  evidence: "(Measured at authoring time: neither fixture directory holds a `.mjs`, so the non-recursive walk loses nothing TODAY. It would silently lose coverage the day one is added.)"
```

Not repaired, deliberately. The bound is **stated in the file's own honest-scope block**, in both
directions, which is the standard `entry-point-guard.test.mjs` sets. Widening to a recursive walk with no
observed failure would be the speculative addition P7 forbids.

### F4 — the version number is asserted, not derived

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "SKILLS_VERSION:1"
  problem: "`3.0.4` was assigned externally to dodge a collision with parallel branches, so the repo's only check over it (`check:badge`) proves agreement with the README badge and nothing about whether the number is right."
  evidence: '"`3.0.4` is the CORRECT version number" → **advisory.** It was assigned externally to avoid collision with sibling PRs.'
```

Correctly labeled advisory in the plan's guarantee audit and again in `VERIFY.md`. Recorded here only so
the gap is visible in the review record rather than only in the plan.

---

## Lens results

| lens             | result                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **L-floor → P0** | **2 findings** (F1 blocking, F4 minor). F1 was the real one and is repaired.                                                                                                                                                   |
| **L-eval → P1**  | **No finding.** The increment adds no Capability and no `rule_id`, so no eval binding is owed; `validate.mjs` GREEN agrees. The floor and this lens do not disagree.                                                           |
| **L-trust → P2** | **No finding.** No untrusted free-text reaches any guaranteed decision. The changed bytes sit in a dedup key built from an integer and one of two internal literals — no scanned-file content flows through them.              |
| **L-axis → P3**  | **1 finding** (F2, repaired). The new test file carries one axis of change; no sibling module reference exists in code. F2 was a _prose_ cross-boundary reference, which is why an import-shaped grep would not have found it. |

---

## Verdict

**GREEN — 0 outstanding floor-gate findings** (2 raised, both repaired inside the increment and
re-verified: `validate` GREEN, 28 scanner tests + 5 guard tests pass, eslint/prettier clean, and the
scanner's output remains byte-identical to the pre-change baseline over the dedup-exercising fixture).

**What this verdict does NOT mean (P0).** It means the four lenses were applied and their blocking
findings are closed. It is not a judgment that the increment is wise, that the guard's coverage is
sufficient, or that `3.0.4` is the right number. Two of those are explicitly open above.

---

## Proposed lesson candidate (NOT canon — for `/pharn-dev-memory-promote` to gate)

**Candidate A — "An increment that repairs an instance of a lesson is the increment most likely to
recommit it, because the author is writing fresh rationale prose about the very property in question."**

- **What happened.** This increment existed to fix an L25 defect (a rationale comment that did not reach
  its sibling). While fixing it, the author wrote a _new_ rationale comment into the shipped file that
  overclaimed the guard's guarantee (F1) and cited an unshipped `.dev/` path (F2) — in the same sitting
  as writing the guard's own header, which correctly disclaims exactly that overclaim.
- **Why it would recur.** The remedy for L25 is "make the rationale enforceable", and executing that
  remedy _requires writing new rationale_ — so the fix step structurally reintroduces the defect's
  surface. L36 recorded the same range-zero shape (a vocabulary and its enumeration drifting in one
  diff, one author, one sitting); this is that shape for **prose about guarantees** rather than for a
  parameterized value.
- **Provenance pointer (for the promote command to capture deterministically, not asserted here):**
  feature `nul-bytes-scanner`; source `.dev/features/nul-bytes-scanner/REVIEW.md` F1 + F2.
- **Honest counter-argument, recorded so the gate is not rubber-stamped:** this may be L25/L37 already
  covering the case rather than a distinct lesson, and one occurrence does not meet L20's "second
  occurrence" bar. A human should weigh whether it earns canon or is better recorded as evidence under
  the existing entries. **This command wrote no canon** — `/pharn-dev-review`'s scope is `REVIEW.md`
  alone.
