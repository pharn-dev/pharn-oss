# PLAN — p3-sibling-check-widen

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299 # fix #4
- applied_lessons: [L1, L3, L6, L20, L24, L27, L34, L36]
- increment: Widen `pharn/floor/validate.mjs` CHECK 6 — the only floor expression of P3 — so it can fire
  on the sibling modules that actually exist, moving its base-layer exemption from the READER's module to
  the TARGET's, and pin the newly-reachable branch with a RED fixture plus a mutation control.
- layer(s): pharn/floor (the deterministic floor, `pharn/ARCHITECTURE.md §2`) — not a capability module
- constitution_refs: [P0, P3, P5, P6, P7]

## The triggering failure (P7 — a real one, named)

An adversarial review of this repo produced finding `check6-vacuous` (MED, dimension A3): CHECK 6's
target matcher is

```js
const m = String(r).match(/(pharn-(?:stack|skills)-[A-Za-z0-9-]+)/);
```

which matches only `pharn-stack-*` / `pharn-skills-*` — modules the README states are **unbuilt**. Both
sibling modules that DO exist (`pharn-pipeline`, `pharn-review`) are unmatchable, so the branch cannot
fire on the live tree. Reproduced this run (see `## Discovery evidence`): **0** REDs are reachable from
the 36 committed capabilities under any `reads:` value they could legally hold today, and
`grep -c 'pharn-stack\|pharn-skills' pharn/floor/validate.test.mjs` → **0**: no test reaches the RED
branch either. This is an observed defect in a shipped checker, not a hypothetical (P7).

## Discovery evidence (P6 — read live this run, never asserted from memory)

Enumerated every `role:`-bearing capability under the validate-scanned surface and every `reads:` value
each declares (`.pharn/pharn-dev-ship/discover.mjs`, run against this worktree):

- **36 capabilities**, in exactly three modules: `pharn-core` (1), `pharn-pipeline` (13), `pharn-review` (22).
- **5 distinct `reads:` values across all of them:**
  - `"pharn/pharn-contracts/finding-shape.md"` — declared by `pharn-pipeline` AND `pharn-review` (35 sites)
  - `"pharn/pharn-contracts/seam-config.md"` — declared by `pharn-core` (1 site)
  - `"pharn/ARCHITECTURE.md"` — no `pharn-` module token at all
  - `"<the PLAN.md under interrogation>"`, `"<artifact-under-review>"` — placeholders, no module token
- **Simulation of the naive widening** (`/(pharn-[A-Za-z0-9-]+)/`, exemption left on the reader only):
  **35 REDs** — every griller and every lens, all of them CORRECT declarations of a dependency on the
  tree's root. That is the L3 defect exactly, caught before it shipped.
- **Simulation with the exemption moved to the TARGET module** (`{pharn-contracts, pharn-core}`):
  **0 REDs**. The live tree stays GREEN and is not violating P3.

Also read live: `pharn/floor/test-fixtures/{green,red}/skill.md` declare no `reads:` (no fixture impact);
`.dev/floor/capability-catalog-core.mjs` consumes `pharn/floor` only as a **count of `*.mjs` files**
(line 383), and this increment adds no file there, so the generated regions do not move.

## Applied lessons

- L1 — Meta-doc sweep run before scoping: `SKILLS_VERSION`, the README shields badge and `CHANGELOG.md`
  all state a fact this increment changes, so all three are named in `## Files` rather than left to drift.
  The sweep also checked what does NOT move and says so: `CLAUDE.md`'s only CHECK-6 sentence ("enforced
  best-effort by a grep in the floor plus the review agent") stays true before and after, and
  `docs/capabilities/**` + the README `CURRENT-STATE` region are counts this diff does not change — so
  neither is edited, and neither is silently forgotten.
- L3 — This is the increment's governing lesson: it makes the `reads:` field load-bearing against the
  modules that actually exist for the first time, so the SAME increment audits **every existing
  declaration** of that field (all 36 capabilities, 5 distinct values — `## Discovery evidence`). That
  audit is what proved the prescribed naive widening would fail-closed on 35 CORRECT declarations, and it
  is what moved the exemption to the target side instead.
- L6 — Module identity is read as a delimiter-bounded token, not as a bare substring of prose: the left
  edge is pinned with a lookbehind so `notpharn-review` is not a module reference, and the comparison is
  exact set membership against `BASE_MODULES`, never a `startsWith`/`includes` over free text. The honest
  bound L6 forces me to state: a `reads:` value has **no** more-structured location than the string itself
  (ARCHITECTURE §4's labeled caveat — markdown has no `import`), so this is the most structural read
  available here, not a full membership test.
- L20 — CHECK 6 is the floor-escalation case in reverse: a floor check existed but could not fire, so the
  remedy is a real branch plus a test that PROVES it fires, never a comment asking the next author to
  remember. The mutation control below exists because "we added a test" is the discipline-only remedy L20
  says will recur.
- L24 — The exemption's rationale comment ("allowed to be depended on") was INHERITED from the narrow
  matcher and is void the moment the matcher is swapped: it describes a TARGET-side property while the
  code applied it to the READER. Rather than carry the sentence across, the exemption is re-derived from
  `pharn/ARCHITECTURE.md §4`'s tree and moved to the side its own words describe.
- L27 — CHECK 6 emits ONE message for every branch it can now reach (leaf→leaf, base-module-reads-upward,
  and the pre-existing `pharn-stack-*` shape), so the message's remedy is checked for reachability **per
  branch** before it is written: "move the shared thing down into `pharn-contracts`" is a true and
  actionable instruction on all three, and each branch is tested separately rather than assumed.
- L34 — The finding IS a vacuous branch, so a passing test is not evidence by itself. The suite therefore
  carries a **mutation control**: the RED fixture is re-run against a mutant `validate.mjs` with CHECK 6's
  emission removed, asserting it goes GREEN — plus an assertion that the mutation actually changed the
  bytes, so the control cannot itself pass vacuously.
- L36 — `BASE_MODULES` is a parameterized membership set, so it is pinned by a **closure** assertion, not
  one presence test per member: the test asserts both members are exempt AND that a third, non-base module
  is not, in the same fixture — a set that silently grew a member would fail.

## Files

- `pharn/floor/validate.mjs` — CHECK 6: widen the target matcher to every `pharn-<name>` module token,
  scan ALL tokens in a value (not just the first), move the base-layer exemption from the reader's module
  to the target's, and restate the bound in the block comment — layer pharn/floor (PRODUCT SURFACE)
- `pharn/floor/validate.test.mjs` — add the CHECK 6 RED fixture, the mutation control, the base-module
  GREEN regression pin, the backward-compat pin, and the closure assertion — layer pharn/floor (test; ships to nobody)
- `SKILLS_VERSION` — `3.0.2` → `3.0.5` (assigned; see `## Version discipline`) — layer repo-meta
- `README.md` — shields version badge → `3.0.5`, so `check-version-badge.mjs` agrees — layer repo-meta
- `CHANGELOG.md` — `[Unreleased]` entry recording the change and the bump size — layer repo-meta

### Explicitly OUT of scope for this increment

- `pharn/ARCHITECTURE.md`, `pharn/CONSTITUTION.md`, `THREAT-MODEL.md`, `LIMITS.md` — human-only,
  hook-denied (fix #2). Nothing in them becomes false: §4's caveat ("`validate.mjs` greps for forbidden
  cross-references; beyond that, the review agent enforces it") and §7's list entry ("no forbidden sibling
  reference (P3, best-effort grep)") both describe the widened check as accurately as the narrow one.
- `CLAUDE.md` — its one CHECK-6 sentence stays true (see the L1 line above).
- `docs/capabilities/**`, README `CURRENT-STATE` — generated counts this diff does not move.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — the emitted finding keeps the enum-gated (`type`, `rule_id`,
  `severity`, `file`) / free-text (`problem`) split; only `problem` carries the echoed declaration, and it
  is rendered as quoted data. Cited, not restated (P4).

## Evals to write (P1)

CHECK 6 is a floor checker, not a `role:`-bearing Capability, so P1's `evals/cases` + `evals/expected`
obligation does not attach to it (validate's own capability walk excludes `pharn/floor/`). Its
specification is its test suite, and these are the cases:

- CHECK 6 RED (leaf→leaf) → a `pharn-pipeline` capability whose `reads:` names `pharn/pharn-review/...` →
  exit 1, the finding names `pharn-review`. **This is the branch that could not fire before.**
- CHECK 6 non-vacuity → the same fixture against a mutant `validate.mjs` with CHECK 6's `finding()` call
  removed → exit 0, plus an assertion that the mutation changed the source bytes (L34).
- CHECK 6 GREEN (the live shape) → `pharn-review` reading `pharn/pharn-contracts/...` and `pharn-pipeline`
  reading `pharn/pharn-core/...` → exit 0. The L3 regression pin: this is the 35-site shape the naive
  widening would have blocked.
- CHECK 6 closure over `BASE_MODULES` (L36) → in one fixture: both base modules exempt as targets, and a
  third module (`pharn-pipeline` read from `pharn-review`) NOT exempt → exactly one finding.
- CHECK 6 backward-compat → `pharn-pipeline` reading `pharn-stack-next/tokens.md` still REDs, so the
  widening never narrows the coverage it replaces (this is the architecture griller's canonical fixture shape).
- CHECK 6 reader-side exemption removed → a `pharn-core` capability reading `pharn/pharn-review/...` REDs.
- CHECK 6 laundering → a value naming `pharn-contracts` FIRST and a sibling second still REDs (all tokens
  scanned, not just the first match).
- CHECK 6 left-delimiter → a value containing `notpharn-review` produces no finding.

## Guarantee audit (P0)

- "a `reads:` value naming a non-base, non-own `pharn-<name>` module token is a RED" → **floor:
  enum-regex** (`pharn/ARCHITECTURE.md §2` primitive #3) — a delimiter-bounded pattern match plus exact
  set membership against a literal `BASE_MODULES` array. No model, no judgment.
- "CHECK 6 is no longer vacuous over the modules that exist" → **floor: enum-regex**, and the claim is
  pinned by the RED test + the mutation control rather than asserted in prose (L34).
- "the live tree does not violate P3" → **floor: enum-regex**, but it is a claim about **today's**
  declarations only, re-established every run by `node pharn/floor/validate.mjs .`.
- "a capability does not READ a sibling module" → **ADVISORY, and this is the bound that must not be
  overstated.** The check reads a hand-written `reads:` DECLARATION. Markdown has no `import`, so a
  capability body may reference any module it likes with an empty or lying `reads:` and CHECK 6 stays
  GREEN. It remains the "best-effort grep" `pharn/ARCHITECTURE.md §4` labels it — widening changes what
  the grep can SEE, never what a declaration PROVES.
- "the exemption set is exactly `{pharn-contracts, pharn-core}`" → **floor: enum** (a literal array),
  pinned by a closure assertion (L36).
- "no correct existing declaration newly REDs" → **floor: enum-regex** for the 36 declarations that exist
  (validate GREEN on this repo + the base-module GREEN test); **ADVISORY** as a general claim about
  declarations not yet written.
- "`SKILLS_VERSION` and the README badge agree" → **floor: enum-regex**, owned by the already-wired
  `.dev/floor/check-version-badge.mjs`. This increment adds no primitive there; it satisfies an existing one.
- "the bump size is correct" → **ADVISORY.** `check-version-badge.mjs` proves the two strings AGREE, never
  that the version is right (its own comment says so). The justification is in the CHANGELOG, for a human.

## Trust audit (P2)

- **Input:** the `reads:` frontmatter values of every `.md` validate walks — hand-written, and on a user's
  repo not necessarily authored by the person running the floor. Treated as **untrusted free text**.
- **Propagation:** the value is echoed into the finding's `problem` field ONLY — the free-text, untrusted
  half of the split (`pharn/ARCHITECTURE.md §8`, fix #1). It is rendered through the file's existing
  `showPath()` (`JSON.stringify`), so a value containing a newline cannot forge an extra
  `- [blocking] …` line in the report — the same defence that helper already exists for. The `target`
  module name IS interpolated raw, and that is safe by construction, not by trust: it is a substring that
  matched `pharn-[A-Za-z0-9-]+`, so it cannot contain a control character or a separator.
- **No guaranteed decision rests on the tainted text.** The RED/GREEN branch is the pattern match plus the
  membership test; the echoed string is display only.

## Determinism audit (P5)

The only branch is `target === ownModule || BASE_MODULES.includes(target)` — exact string equality and
array membership over a literal set. There is no classification step and therefore no fallback chain that
could end in a guess.

## Open questions (HALT)

- **Should the base-layer exemption be REMOVED from the reader's side when it is added to the target's, or
  kept on both?** The finding's prescribed remedy names only the target side ("`pharn-contracts` /
  `pharn-core` … ARE allowed to be depended on"). Keeping the reader-side skip as well would leave the two
  base modules exempt from ALL P3 checking — which is the same unfalsifiability class this finding is
  about — while removing it makes a base-module capability's own `reads:` checkable. Live impact of the
  removal is **zero REDs** either way (`pharn-core`'s one capability reads only `pharn-contracts`;
  `pharn-contracts` holds no `role:`-bearing files), so this is a design call, not a forced one.

  **RESOLVED at GATE 1 — remove it.** The exemption's own words are a TARGET-side property misapplied to
  the reader (L24), and the code's rationale comment has said so all along. Removing it is a strict
  coverage gain with zero live cost, and keeping it would preserve exactly the "a branch that cannot fire"
  shape this increment exists to close. **The residual is stated rather than papered over:** the exemption
  becomes a flat membership SET, not a layer RANK, so a capability inside `pharn-contracts` reading
  `pharn-core` is still admitted even though §4's tree puts core ABOVE contracts. Modelling rank would
  mean inventing an ordering for modules nobody has built (`pharn-audits`, `pharn-stack-<fw>`,
  `pharn-skills-*`), which is the speculation P7 forbids — and there are zero `role:`-bearing files in
  `pharn-contracts` to make it a real case. This bound is written into the code comment, not just here.

## GATE 1 — plan acceptance (record of a DELEGATED approval)

**Decision: APPROVED as written**, with the open question resolved above.

**Who approved, honestly (P0/P6).** The approver was **not** the repo's human maintainer. This run was
started by a parent agent session which explicitly delegated the GATE-1 and GATE-2 approver roles to the
agent executing this increment, stating that no interactive human was available on its side. That
delegation is recorded here because an approval whose author is unstated is indistinguishable from a
self-approval, and `/pharn-dev-plan` exists precisely to stop a model approving its own intent.

**What that does and does not mean.** `LIMITS.md §1d` already names this class: the floor cannot verify
that a human answered, and "approved" is forgeable at the write surface. So this line is **ADVISORY**, and
it is weaker than the ordinary case — a delegated approval is a human's standing instruction, not a human
reading this plan. **The real gate is unchanged and still ahead:** the maintainer reviews the pull request
before merge, and nothing here merges, pushes, or seals. Every floor verdict this increment claims is
recomputed by `npm run check` and `pharn/floor/validate.mjs` on that PR, independent of who said yes here.
