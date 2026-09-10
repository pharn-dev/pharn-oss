# REVIEW — claude-dir-scan-exclusion

**Floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN, 36 capabilities, exit 0**. The increment
reached review with a green floor, so the four lenses below are the advisory layer on top of it.

**Trust posture:** the increment is `trust: untrusted`. Nothing in the reviewed diff read as an injection
attempt, and no instruction-looking content in it changed this review's behaviour. One place came close and
is reported as **R2** rather than passed over — an untrusted `PLAN.md` section was, in fact, allowed to widen
what a floor helper treated as authorized, during this very run.

---

## Floor-gate findings (blocking)

**None.** Specifically:

- **L-floor / P0** — no guarantee is claimed without a floor reduction or an `advisory` label. The three new
  claims each carry their label at the site: the `npm test` glob is labeled **ADVISORY** in
  `package.json`'s own comment (nothing reads it), the new install footer is labeled **STILL ADVISORY** in
  the renderer, and the probe's structural layer states in its header that it "never proves what the walker
  DOES". `grep -iE 'guarantee|ensures|proves that'` over the changed sources returns nothing.
- **L-eval / P1** — the increment authors **no** Capability and introduces **no** `rule_id`, so there is no
  eval binding to satisfy. The floor agrees: `validate` still reports 36 capabilities, unchanged, and CHECK 3
  has nothing new to bind. Floor and lens do not disagree.
- **L-axis / P3** — no sibling reference introduced. `.dev/floor/walker-exclusion.test.mjs` imports only
  `./capability-catalog-core.mjs` (same directory) and reaches `pharn/floor/*` as CLI paths — the
  `.dev/` → `pharn/` direction, which is the one CLAUDE.md permits, because a user's install ships
  `pharn/floor/` without `.dev/`.
- **L-trust / P2** — no finding the increment emits rests on a tainted field; the new probe consumes only
  exit codes, integers and paths.

---

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/validate.mjs:124"
  problem: "The comment justifies the widening with a claim that is true of THIS repo and false of a user's, and validate.mjs is product surface that runs on user repos — a user-authored capability under .claude/ is now silently dropped from the scan."
  evidence: "commands were already excluded, hooks are `.cjs`, settings are JSON — so widening loses nothing."

- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/claude-dir-scan-exclusion/REGRESSION.md:24"
  problem: "To clear a false scope breach, this run widened check-regress's --declared using paths read out of the PLAN's own `### Regenerated` section — so an untrusted document expanded what a floor helper treated as authorized, which is a laundering vector that composes with the Bash write-escape."
  evidence: "`--declared` is an argument this stage supplies, so it was re-derived from the plan's **own** `### Regenerated` text"

- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/floor/capability-catalog-core.mjs:57"
  problem: "One file is edited for two reasons — the walker exclusion (axis A) and the rendered install footer (axis C) — which the plan names honestly and the human accepted at GATE 1, so it is recorded as a standing cost rather than a defect."
  evidence: "`.dev/floor/capability-catalog-core.mjs` — same one-segment change (axis A) AND the footer text (axis C)"

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/claude-dir-scan-exclusion/proposed/APPLY.md:3"
  problem: "One of the four axes the increment claims to address is not applied, and every gate is green with it outstanding — correctly disclosed in three artifacts, recorded here so the GATE-2 reader cannot mistake a green chain for completed work."
  evidence: "**Status: NOT APPLIED.** This increment did not and could not make this change."
```

### R1 — the "loses nothing" claim, measured

Demonstrated rather than reasoned about. A fixture user-repo holding one capability under
`pharn/pharn-review/` and one under `.claude/my-capabilities/`, run against both checkouts:

| checkout           | `validate`         | `count-lenses`                                          |
| ------------------ | ------------------ | ------------------------------------------------------- |
| baseline (pre-fix) | **2** capabilities | `2` — includes `.claude/my-capabilities/thing/thing.md` |
| this increment     | **1** capability   | `1` — the `.claude/` one is gone                        |

Both exit **0**. So on a user's repo the widening does not "lose nothing" — it silently loses any capability
the user authored under `.claude/`, and the checker says nothing, which is the same silent-wrong-count shape
the increment exists to fix, pointed the other way.

The reasoning in the comment is sound **for PHARN's own tree**, where `.claude/` holds commands, `.cjs` hooks
and JSON. It is asserted without that qualifier, in **product-surface bytes that ship to users**. Note this is
a **claim** defect, not a floor defect: the fix itself is right for the observed failure, and no user is known
to author capabilities there — which is why this is important rather than blocking. The honest repair is to
bound the sentence (and its twin at `CHANGELOG.md:55`, plus the same reasoning echoed in the three counters'
comments) to the repo it was verified against, or to verify it for the user surface.

### R2 — the `--declared` widening, and why it is reported against this run rather than excused

`check-regress.mjs scope` exited **1** naming 37 escaped paths — every regenerated file under `docs/`. That was
a **false** breach with a structural cause: `set-writes-scope --from-plan` deliberately stops at the
`### Regenerated` heading (those files must **not** enter the writes-scope — the generator writes them through
Bash, and L19 says not to pretend the gate covered them), and passing that same parse as `--declared` makes
every generated artifact look like an escape.

The correction was to re-derive `--declared` from the plan's own `### Regenerated` text. It cleared the false
positive **and** weakened a real detection: a `PLAN.md` is untrusted input, so a plan that lists a genuine
source file under `### Regenerated` would have that path read as authorized, while the writes-scope hook —
which would otherwise deny a Write to it — is bypassed anyway if the write goes through Bash. The two halves
compose into an undetected escape.

**Nothing was laundered in this run** (the 37 paths are genuinely the generator's output, and `docs/` is not a
source surface), but the mechanism was exercised, which is the point of reporting it. The deterministic remedy
belongs to `check-regress.mjs` — an explicit exemption for paths a plan declares as generated, reported in
`escape_exempt` the way `--feature`'s exemptions already are — not to this increment.

---

## Verdict

**GREEN — 0 floor-gate findings; 4 advisory (2 important, 2 minor).**

The increment does what it set out to do on the axes the floor can see: the closure is real and
mutation-tested (the naive second-member repair provably passes the observed spelling and fails the class),
the glob narrowing is measured rather than assumed, the expired footer is gone from all 36 pages with its test
pin retargeted to assert **replacement** rather than mere addition, and the legend disambiguation lands in both
halves of the copy-pair with their deliberate divergence preserved.

The two important findings are both **claim-scope** defects rather than logic defects, and both have the same
shape: something verified in one context is asserted in a wider one. R1 asserts a repo-local fact in bytes that
ship to users; R2 let a document's own text define the boundary a checker was meant to police. That is worth
naming as a pattern, because this increment's entire subject is an enumeration that was correct for the case
its author was looking at.

---

## Proposed lesson candidate (NOT promoted — `/pharn-dev-memory-promote` is a separate, human-gated run)

**Candidate.** _One declaration section, parsed by two consumers asking different questions, is right for one
and silently wrong for the other._

`PLAN.md`'s `## Files` is parsed by `set-writes-scope.cjs --from-plan` to answer "what should the pre-write
hook allow?" and by `check-regress.mjs scope --declared` to answer "what did the plan authorize?" Those are
**different questions**, and they diverge exactly at generated artifacts: files written through Bash must be
**excluded** from the first (L19 — do not imply the gate covered them) and **included** in the second (the plan
did authorize them). Sharing one parser makes every increment that regenerates a derived artifact trip a false
fix#7 breach, and the natural workaround — widening `--declared` by hand from the plan's own prose — hands an
untrusted document control over a floor helper's authorization set.

**Why it is lesson-shaped rather than a bug report:** the remedy at the call site reduces to "remember that
`--declared` means something different here", which is the discipline-only shape L20 says will recur — and it
will recur on **every** increment that regenerates anything, which is a standing category in this repo
(`docs/capabilities/**`, `docs/lessons-index.md`, the README current-state block). It also composes with L19
rather than restating it: L19 says declare the Bash write instead of pretending the gate covered it; this says
what happens when a **second** consumer reads that declaration for a different purpose.

**Provenance is deliberately not computed here** (`/pharn-dev-memory-promote` captures `commit` / `date` /
`feature` / `source` deterministically and validates them on the floor). The truthful source artifact and
finding id are `.dev/features/claude-dir-scan-exclusion/REVIEW.md` → **R2**, with the false breach and its
clearance both reproduced live in this run and recorded in `REGRESSION.md`.

**Honest bound on the candidate itself (P0):** that this is a _real_ recurring failure rather than a one-off is
**model judgment** — it has been observed **once**, in this run. L20's bar is a second occurrence for
escalating a discipline remedy to a floor check; whether it clears the bar for _promotion to canon_ is the
human's call at the promote gate, and this review does not decide it.
