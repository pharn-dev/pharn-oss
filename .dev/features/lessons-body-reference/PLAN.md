# PLAN — lessons-body-reference (the citation must cost a line, and the surface must stop lying)

- spec_content_hash: 54af0643c9c92257a8ca210db8d7548e4538a85a5f6298a5a9f48fcc1e423492 # fix #4 (sha256 of pharn/ARCHITECTURE.md, live worktree state this run — P6)
- applied_lessons: [L1, L3, L4, L6, L20, L33, L34] # see "Applied lessons" below
- increment: Make the `applied_lessons` surface **truthful** and **check what it already requires** — (1) correct two EXPIRED forward-looking claims in the product `/pharn-plan` command that 2.8.0 falsified, and (2) add a fourth deterministic sub-check to `pharn/floor/check-plan-lessons.mjs`: every cited `L<n>` must also appear in the PLAN body.
- layer(s): product floor (`pharn/floor/`) + the product `/pharn-plan` command (`.claude/`, advisory orchestration) # ARCHITECTURE.md §2 primitive #3, §6
- constitution_refs: [P0, P4, P5, P6, P7]

## Single axis of change (P3)

One reason to change: **a cited lesson must cost something, and the surface that demands the citation
must not misdescribe itself.** Both halves are the same axis — the honesty of the `applied_lessons`
declaration. Part 1 repairs a claim that says the field is unverified when it is; Part 2 makes the
citation non-free. Lesson _selection_, routing, the dev-surface twin's prose, and any change to
`/pharn-grill`'s re-verification are explicitly **out of scope**.

## Trigger (P7) — stated honestly, because the two halves do NOT share one

**Part 1 is failure-triggered, observed this run.** `.claude/commands/pharn-plan.md` asserts in two
places that "**no downstream stage re-verifies it**" and that the field is "**self-attested by the stage
that wrote it**", naming `grill-lessons-reverify` as a pending follow-up. That follow-up **shipped in
2.8.0** (`0f3a02d`, PR #171). Both sentences are **false on `main` today**, on the **product surface**, and
nothing caught them: the hedges were never registered in `.dev/floor/specified-primitives.json`'s
`forward_claims`, so `check-specified-markers.mjs` had no site to fire on. The adjacent bullet in the same
guarantee-audit block correctly says the spec-hash re-verifier "**is built**" — one bullet current, its
neighbour stale. That is `L33` recurring verbatim.

**Part 2 is NOT failure-triggered, and this plan does not pretend otherwise.** Measured across all 150
committed `PLAN.md` files: **52 declare at least one cited id, and 0 of them omit a cited id from the
body.** The convention has held on discipline alone in 52 consecutive opportunities, so `L20`'s
"second occurrence is the trigger" bar is **not met** — the occurrence count is **zero**. Part 2 is built
because the **human directed it explicitly**, twice, after the gap was reported. That is a legitimate
authority under P5 (the terminal fallback of any chain is _ask the human_, and the human answered); it is
**not** a dogfood or eval failure, and the CHANGELOG will say so in those words rather than manufacturing
a trigger.

## Applied lessons

- **L1** — _"`/plan` must scope the meta-docs an increment invalidates."_ **How applied, and it changed
  `## Files` mid-flight:** the sweep was run as a grep for every site that ENUMERATES the checker's
  sub-checks, not as a recollection of which files "probably" mention it. It found **four** commands
  beyond the two plan stages — `/pharn-grill`, `/pharn-dev-grill`, `/pharn-ship`, `/pharn-dev-ship` — each
  of which states "present, well-formed, and every cited id resolves" and would have silently
  **understated** the checker after (D) landed. All four are added to `## Files` above. Without the
  sweep this increment would have shipped six correct files and four freshly-stale ones, which is L33's
  defect committed while fixing L33's defect.
- **L3** — _"Making a declarative field load-bearing requires re-auditing every existing declaration of
  it."_ **How applied:** before writing a line of the new sub-check, all **150** committed `PLAN.md`
  files were run through the live checker (54 GREEN / 96 RED, every RED the pre-field "declares no
  `applied_lessons`"), and then all **52** citing plans were measured against the _proposed_ body rule.
  The re-audit is what produced the 0/52 number above, which is what makes the P7 paragraph honest
  rather than assumed.
- **L4** — _"An authored fixture passes by construction; a live capability must be measured."_ **How
  applied:** the 0/52 figure comes from running the proposed rule over the **live committed corpus**, not
  from reasoning about it; and each new test below pins the rule's **discrimination** (a mutant that
  should fail _does_ fail), never merely that a hand-written fixture passes.
- **L6** — _"Membership/structural facts are read from the structured location, never grepped from free
  text."_ **How applied, and this one required care because the new check appears to violate it:** the
  body scan **is** a scan of prose — but it is not a _membership read_. The id set is still parsed
  **only** from the structured header and still enum-gated by `LIST_RE` **before** anything touches the
  body; the body scan is a downstream **presence** test over an already-validated token. No fact is
  _derived_ from prose. The distinction is stated in the checker's header so a later reader does not
  "fix" it back into a grep.
- **L20** — _"A promoted lesson whose only remedy is discipline WILL recur — the second occurrence is the
  trigger to give it a floor check."_ **How applied — as the reason NOT to claim a trigger:** L20 is the
  lesson that would ordinarily justify Part 2, and it is precisely the one that **fails** here, because
  its trigger is a _count_ and the count is 0. Citing L20 as justification would be the misuse it warns
  about. It is cited to record that the bar was checked and **not** met.
- **L33** — _"A 'not yet built' claim expires the moment the work lands — nothing reads shipped prose,
  and the repair pass misses sites."_ **How applied:** this is Part 1's whole defect. Both stale sites are
  corrected, and the CHANGELOG records the **mechanism** of the miss (the hedge was never registered in
  `forward_claims`) so the next author registers a hedge when writing it, rather than relying on the
  repair pass that already failed once.
- **L34** — _"'For each X, assert P' says nothing when there are no X."_ **How applied:** the new tests do
  not merely assert "a body-referencing plan is GREEN". Each adds an explicit **negative control** — a
  plan citing an id absent from its body must RED, and the RED must **name that id** — so the assertion
  set cannot pass vacuously if the check were silently disabled.

## Files

- `pharn/floor/check-plan-lessons.mjs` — add sub-check (D): every cited `L<n>` must appear in the PLAN body; RED names the offending ids — layer: product floor (bump-triggering)
- `pharn/floor/check-plan-lessons.test.mjs` — new cases: cited-and-referenced GREEN; cited-but-absent RED naming the id; partial (one referenced, one not); the body region for BOTH plan shapes; a header-only mention does not satisfy; discrimination controls — layer: test (never ships)
- `.claude/commands/pharn-plan.md` — correct the TWO expired `grill-lessons-reverify` claims; document sub-check (D) and its bound — layer: product command surface (bump-triggering)
- `.claude/commands/pharn-dev-plan.md` — document sub-check (D) — layer: dev command (does NOT bump)
- `.claude/commands/pharn-grill.md` — its re-verify sites enumerate the sub-checks; add (D) — layer: product command surface (bump-triggering)
- `.claude/commands/pharn-dev-grill.md` — same enumeration, dev twin — layer: dev command (does NOT bump)
- `.claude/commands/pharn-ship.md` — its proceed/stop line enumerates the sub-checks; add (D) — layer: product command surface (bump-triggering)
- `.claude/commands/pharn-dev-ship.md` — same enumeration, dev twin — layer: dev command (does NOT bump)
- `CLAUDE.md` — update the `check-plan-lessons.mjs` Commands block for the fourth sub-check — layer: repo-meta (does NOT bump)
- `CHANGELOG.md` — the entry, carrying the honest split and the 0/52 measurement — layer: repo-meta
- `SKILLS_VERSION` — `2.8.0` → `3.0.0` — layer: repo-meta
- `README.md` — the shields badge value, pinned to `SKILLS_VERSION` by `check:badge` — layer: repo-meta (prose outside the CURRENT-STATE markers)

## Version (SKILLS_VERSION) — MAJOR, and the reasoning is the 2.0.0 precedent

`2.8.0` → **`3.0.0`**. CLAUDE.md's stated major criterion is "a breaking shape change … that invalidates
existing installs". Sub-check (D) adds a **new RED condition to an already-shipped checker**: a user's
`PLAN.md` that was GREEN yesterday (cites `[L1]`, never mentions L1 in the body) is RED today. That is
exactly the reasoning that made the field's own introduction `2.0.0`, and parity is the honest call even
though the **measured blast radius on this repo is zero** (0 of 52 citing plans regress). The one-body-
line-per-cited-id rule has been documented in the shipped commands since 2.0.0, so a **conforming**
install is unaffected — but "documented" is not "enforced", and the bump reflects enforcement.

**Migration:** for each cited `L<n>` with no body mention, add the line the docs already asked for —
one line saying **how** that lesson was applied. Or reduce the declaration to the ids actually applied.
`applied_lessons: none` remains a legal, justification-free escape.

## Guarantee audit (P0)

- **"Every cited lesson was READ"** → **struck.** Not guaranteed, not approximated. Sub-check (D) proves
  the id's **characters appear** in the body. `applied_lessons: [L3]` + a body line reading `L3:
considered.` passes. This is stated in the checker header, the command prose, and the CHANGELOG in
  those words — the check raises the floor's **cost**, it does not measure comprehension.
- **"Every cited lesson was APPLIED"** → **struck**, unchanged from 2.0.0. Advisory; grill/review
  territory.
- **"A cited id now costs a body line"** → **FLOOR** (primitive #3): a substring presence test over an
  already-enum-gated token, in a deterministically-delimited region.
- **"The `/pharn-plan` prose is true"** → **ADVISORY.** Part 1 corrects two sentences by hand; no checker
  reads them. The class was unregistered in `forward_claims` and remains so **after** the fix — correctly,
  because the artifact has shipped and the hedge is gone, leaving nothing to guard. The durable remedy is
  the CHANGELOG note telling the next author to register a hedge **when writing it**.

## Open questions

None. The one judgment call — building Part 2 at 0 observed failures — was put to the human and answered
explicitly; it is recorded above rather than smuggled.
