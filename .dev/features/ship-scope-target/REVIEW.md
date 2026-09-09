# REVIEW — ship-scope-target

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`,
exit **0**, re-run after the in-review corrections below. The floor is the only guaranteed part of this
review; everything else here is **advisory**.

**Increment under review:** `trust: untrusted` (the standing discipline — it does not matter that a
trusted stage produced it). 5 files, +292/−17.

## Floor-gate findings (blocking)

**None.** No guarantee in the increment lacks a floor reduction or an `advisory` label; no eval binding
is missing; no sibling reference; no guaranteed decision rests on a tainted field. The one P0 claim the
increment touches — `"/pharn-ship` may write only …" → FLOOR: hook (fix #7)" — was **false on `main`**
and is the thing this increment repairs; it now carries both an explicit two-clocks split and the L19
surface bound.

## Findings

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".claude/commands/pharn-ship.md:461"
  problem: "A cross-reference read 'Step 4's re-write of this same file' while pharn-ship.md has NO top-level Step 4 — the steps are 1, 2, 2b, 2c, 2d, 3, 3b, Final — so a reader scanning for it finds nothing."
  evidence: "and **without** an `attestation` key yet. Step 4's re-write of this same file needs no further call"

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-ship.md:600"
  problem: "The new L19 bound said 'the scoped prettier/markdownlint passes' (plural) while the command contains exactly ONE such pass — an enumeration that overstates its own domain, in a bullet whose entire job is accuracy about scope."
  evidence: "the `> /tmp/briefing-draft.md` render in Step 2c, and the scoped prettier/markdownlint passes all run through **Bash**"

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/floor/command-hygiene.test.mjs:572"
  problem: "The honest-scope header claimed both rules prove a path is named 'as some call's --target', but targetValues() scans the WHOLE body — so Rule B is satisfied by a path named after a --target token in ordinary prose, not only on an invocation line."
  evidence: "They prove the flag is PRESENT on an invocation line, and that each multi-artifact command NAMES each declared path as some call's `--target`."

- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/ship-scope-target/PLAN.md:70"
  problem: "The increment carries two arguable axes — a command's procedure and a test file's rules — plus repo-meta bookkeeping, bundled in one plan."
  evidence: "`.claude/commands/pharn-ship.md` … `.dev/floor/command-hygiene.test.mjs` — two new corpus rules"
```

### All three of R1–R3 were CORRECTED inside this review, and the floor re-run afterwards

They are recorded rather than silently fixed because two of them are the increment's **own disease
reproduced in its own repair** — an inaccurate scope statement inside the bullet that exists to state
scope accurately (R2), and an overstated guarantee in the header that exists to bound the guarantee
(R3). That is the pattern `.dev/memory-bank/lessons-learned.md` **L36** documents at range zero: the
author who has just written a lesson into the plan reproducing the lesson's own defect in the same
sitting. Corrections:

- **R1** → the reference now reads "**Step 3b's own step 4** below", with an explicit parenthetical that
  there is no top-level `## Step 4`.
- **R2** → singular, and named: "Step 2c.3's single scoped `prettier` + `markdownlint-cli2` pass over
  `BRIEFING.md`".
- **R3** → the header now **separates** the two rules' strengths instead of averaging them: Rule A proves
  the flag is on an anchored invocation LINE; Rule B is "deliberately WEAKER … `targetValues()` scans the
  whole body, NOT only invocation lines — so a path named after `--target` in ordinary prose would
  satisfy it." Tightening Rule B to invocation lines would pass over today's corpus, but **no observed
  failure motivates it (P7)**, so it is recorded as the named residual `ruleb-invocation-line-scan`
  rather than built.

**R4 (the two-axes question) is NOT corrected** — it is surfaced for the human. Fix-plus-enumeration in
one increment is what **L20** and **L29** jointly prescribe, and the repo has done it twice before
(`deny-message-phantom-commands`, `build-step2b-lint`). Raised for the eye, not as an objection.

After the corrections: `npm run check` exit **0**, `validate` GREEN, `command-hygiene.test.mjs` 59/59,
`structural:` re-run exit **0**.

## Lens-by-lens

### L-floor → P0 (the governing lens)

The increment's central act is **converting a false floor citation into a true one**, so this lens is
where it lives or dies. Three claims examined:

1. **"`/pharn-ship` may write only these three paths" → FLOOR: hook.** Now backed by four resolving
   setter calls. The bullet no longer stops at the citation: it names that the sentence **was false**,
   why (a `--target`-less call resolves zero paths and writes no scope file), and what the run actually
   fell back to. Naming the prior falsehood in the shipped bytes rather than quietly correcting is the
   posture **L2** prescribes.
2. **The two-clocks split is the load-bearing addition, and it came from the grill.** The plan's audit
   had claimed "at any instant the active scope is one path" as FLOOR. It is not: the **deny** is floor
   (a non-LLM program, given whatever scope is active), while **the intended scope being active** depends
   on the command's prose ordering, which nothing enforces. The shipped bullet now says exactly that, and
   tells the reader which half to read as floor. Without this the increment would have replaced one
   overstatement with a subtler one.
3. **The two new rules are labeled FLOOR: enum-regex and then narrowed three ways** — they prove a flag
   is present, not that the `--target` value is right, not that a call precedes its write, not that any
   run executed it. The narrowing survives into the test file's own header, which is where a future
   reader will actually meet it (**L25**: a rationale reaches only the file it sits in).

No unlabeled guarantee remains. **No blocking finding.**

### L-eval → P1

Nothing here is a Capability: `pharn-ship.md` declares no `role:` (confirmed by reading its frontmatter
fence this run, not from memory), and `validate.mjs` deliberately excludes `.claude/commands/`. So P1's
"≥1 eval case + expected" does not bind, and claiming an eval would be the speculative addition **P7**
forbids. The floor **agrees** — `validate` is GREEN with no capability-count change (36 before and
after) — and that agreement is itself the check this lens asks for.

The increment's verification surface is instead `node --test`, +8 tests. The genuinely important
question this lens raises is not "are there evals" but **"do the new assertions pass for the right
reason"**, since an authored assertion passes by construction (**L4**). Answered live: both rules were
run against `git show HEAD:.claude/commands/pharn-ship.md` and **both RED**, Rule A naming
`pharn-ship.md:270` and Rule B naming all three unscoped paths. They catch the defect they were built
from. Each also ships an in-suite discrimination test mutated from the **real** body, and a non-vacuity
assertion over its discovered domain (**L34**).

### L-trust → P2

- **Free-text handling.** The increment emits no findings at runtime and adds no new free-text path. The
  new rules branch on regex membership over **repo-owned** files and on a frontmatter fence read from its
  structured location (**L6**) — never on prose classification. No guaranteed decision rests on a tainted
  field.
- **Did instruction-looking content change my behavior?** The triggering input — an external adversarial
  review — is `trust: untrusted`, and it did shape what was built. That is the correct relationship only
  because every load-bearing claim in it was **re-derived live** before it was acted on: the setter was
  run three ways, `DEFAULT_SAFE_SET` was read from source, and the 20-site corpus scan was executed. The
  re-derivation also **contradicted the report's completeness twice** — a fourth write site and four
  prose sites rather than two — which is the practical demonstration that the report was treated as data
  to verify, not instructions to follow (**L33**: a prior enumeration is a lower bound to beat).
- **One trust note, deliberately not made a finding.** `command-hygiene.test.mjs` now parses the
  frontmatter of every file in `.claude/commands/`. Those are repo-owned today; if a community-contributed
  command were ever dropped there the test would parse untrusted input — but it only performs regex
  membership and assertions, never execution, so the exposure is a false RED at worst. Hypothetical, so
  **P7** says do not build for it.

### L-axis → P3

- **Sibling references:** none. The test lives under `.dev/floor/` and reads `.claude/commands/`, which is
  the direction the repo already permits (`.dev/` → product, never the reverse — a user's install ships
  `pharn/floor/` without `.dev/`). No `pharn-*` module was touched.
- **One axis per file:** each edited file has one reason to change. `pharn-ship.md` — the scoping
  procedure and the claim about it, which are the same fact stated twice and must move together (fixing
  the mechanism alone would leave a sentence that is only accidentally true — **L2**).
  `command-hygiene.test.mjs` — the corpus invariant. The three repo-meta files are the mandated
  bookkeeping for a product-surface change, not a second axis.
- **The increment-level question is R4 above** and is left to the human.

## What this review could NOT check, and it is the widest gap in the increment

Nothing here executed `/pharn-ship`. Commands are not `role:`-bearing capabilities, so no behavioral case
can be run over one, and `validate.mjs` ignores `.claude/commands/` by design — so **no gate in this
entire chain read a single corrected sentence for truth**. The four `--target` values were checked for
presence and for equality against the declared `writes:`, never for being the paths the surrounding prose
actually needs at that point in the run. That the four calls are in the right **places** rests on reading
the command's write order carefully, which is model work, and on the human at GATE 2.

The two new rules narrow exactly one slice of this (a missing flag, a declared path never targeted) and
the increment does not claim more. The residual is the same one **L33** names — shipped prose nobody
reads — and it is not closed here; the `forward-looking-claims-manifest` follow-up already recorded in
the CHANGELOG is where that would be addressed.

## Verdict

**ADVISORY: 4 findings (0 blocking, 1 important, 3 minor).** Three were corrected inside this review and
the floor re-run afterwards; one (the two-axes question) is surfaced for the human. The floor gates —
`validate` GREEN, `npm run check` exit 0, `check-regress` `no-regressions`, `check-verify` `PASS` — are
the only guarantees in this run. **"`/pharn-dev-review` approved it" is not a thing this file can say**
(P0): a lens cannot decide approve, and the merge decision is the human's at GATE 2.
