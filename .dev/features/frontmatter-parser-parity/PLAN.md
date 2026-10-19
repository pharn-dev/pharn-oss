# PLAN — frontmatter-parser-parity

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L4, L6, L13, L25, L29, L31, L35, L36, L60]
- increment: Every floor reader of a leading `---` header agrees with `pharn/floor/frontmatter-core.mjs` on the two
  things the 2026-10-12 audit found them disagreeing on: a leading UTF-8 BOM is stripped before the opening fence is
  tested (ENF-3), and which copy of a repeated key counts (ENF-4). `check-plan-lessons.mjs` REDs a repeated
  `applied_lessons` instead of choosing a copy; the other `key: value` readers parse their lines through one helper in
  the core, and two closure tests stop a private copy from coming back.
- layer(s): product floor (`pharn/floor/`), build apparatus (`.dev/floor/`, `.dev/guides/`), repo meta
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## The triggering failures (P7), reproduced live this run at `d5453a17` (SKILLS_VERSION 6.64.2)

Scratch runner `.pharn/frontmatter-parser-parity/repro.mjs` (gitignored), one capability file written twice, once with
a leading `EF BB BF`:

```text
clean validate:     exit 1: FLOOR: RED — 4 finding(s), 1 capabilities checked
clean count-lenses: exit 0: {"registered":1,...}
BOM   validate:     exit 0: FLOOR: GREEN — 0 capabilities checked
BOM   count-lenses: exit 0: {"registered":0,"lenses":[]}
```

ENF-3 is fail-open: a BOM turns a capability with four blocking findings into "not a capability". And for ENF-4, a
PLAN carrying `applied_lessons: none` and then `applied_lessons: [L9999]` (frontmatter, and again as dev bullets):

```text
dup fm:     exit 0: GREEN — applied_lessons: none
dup bullet: exit 0: GREEN — applied_lessons: none
```

`check-plan-lessons.mjs` keeps the FIRST copy; YAML, a JS object assignment and `frontmatter-core.mjs` `readField` keep
the LAST, so the gate certified the copy every other reader discards.

Measured over the tree (`.pharn/frontmatter-parser-parity/scan.mjs`): 296 committed `PLAN.md` / `SPEC.md` / `LOOP.md`
/ `BRIEFING.md` files, **zero** with a repeated key in their frontmatter or leading bullet block and zero declaring
`applied_lessons` in both; zero committed `.md` files start with a BOM. The new refusal therefore REDs no committed
artifact, and the BOM fix changes no committed verdict.

## The sites (re-read live; audit line numbers re-derived)

**ENF-3 — the loose-fence family** (`text.startsWith("---")` then `indexOf("\n---", 3)`, the validate.mjs model the
count-* checkers mirror on purpose):

| site                                                       | reads                        | BOM today        |
| ---------------------------------------------------------- | ---------------------------- | ---------------- |
| `pharn/floor/validate.mjs` `parseFrontmatter` (:170)       | every capability field       | fail-open        |
| `pharn/floor/count-lenses.mjs` `frontmatterRole` (:88)     | `role`                       | fail-open        |
| `pharn/floor/count-grillers.mjs` `frontmatterRole` (:89)   | `role`                       | fail-open        |
| `pharn/floor/count-verifiers.mjs` `frontmatterRole` (:87)  | `role`                       | fail-open        |
| `pharn/floor/check-model-config.mjs` (:243)                | a command's `model`/`effort` | fail-open        |
| `pharn/floor/griller-extract.mjs` `frontmatterKind` (:129) | `kind`                       | closed (no trim) |
| `pharn/floor/griller-extract.mjs` `trimGriller` (:204)     | the body start               | closed (no trim) |
| `.dev/floor/capability-catalog-core.mjs` (:79)             | the catalog's fields         | fail-open (dev)  |
| `.dev/floor/check-config.mjs` (:156)                       | a dev command's model/effort | fail-open (dev)  |

**The fix keeps every other byte of the loose model** (`----` openings, the `indexOf` close, the `[A-Za-z0-9_]+` key
grammar): count-lenses.test.mjs and its two siblings pin that the count-* readers match validate.mjs on every input,
including a `----` opening, and swapping the family to `FM_RE` would break that parity for a defect nobody reported.
Each site calls `stripBom` from the core first, and nothing else changes. `trimGriller` keeps the BOM in its `head`, so
its output still rejoins to the exact input bytes.

**ENF-4 — the `key: value` line readers** (the `([A-Za-z_][\w-]*):` grammar, copied privately):

| site                                                            | reads                   | which copy today     | after                       |
| --------------------------------------------------------------- | ----------------------- | -------------------- | --------------------------- |
| `check-plan-lessons.mjs` `fromFrontmatter` / `fromBulletHeader` | `applied_lessons`       | FIRST                | a repeat is **RED**         |
| `render-ship-briefing.mjs` `readHeaderField` (both branches)    | SPEC `spec_id`/`state`  | FIRST                | LAST, as `check-spec` reads |
| `check-ship-briefing.mjs` `readHeaderField` (its copy)          | the same                | FIRST                | LAST                        |
| `check-ship-briefing.mjs` `readEnvelope`                        | BRIEFING envelope       | LAST                 | LAST (reader swap)          |
| `check-loop-record.mjs` `envelope`                              | LOOP.md envelope        | LAST                 | LAST (reader swap)          |
| `check-loop-decision.mjs` `envelope`                            | LOOP.md envelope        | LAST                 | LAST (reader swap only)     |
| `loop-closeout.mjs` `readEnvelope`                              | LOOP.md envelope        | LAST                 | LAST (reader swap only)     |
| `render-cost-ledger.mjs` `readOutcome` (not in the audit list)  | LOOP.md envelope        | LAST, no `-` in keys | LAST (reader swap)          |
| `.dev/floor/command-family.mjs` `frontmatterFields`             | a command part's fields | LAST                 | LAST (reader swap)          |

`render-cost-ledger.mjs` was found by this run's sweep, not by the audit: it is a fourth reader of the LOOP.md envelope
with a narrower key grammar (`[A-Za-z0-9_]*`, no hyphen). It is in scope because the closure test below would
otherwise have to allowlist it.

`instruction-files-core.mjs` (`TOP_KEY_RE` / `NESTED_KEY_RE`) is the one site that keeps its own: it walks a nested
YAML block mapping (`paths:` with indented items) for Claude Code rule files, which the flat helper does not model. It
is the closure test's single allowlisted entry, with that reason.

## Approach

### 1. The core (`pharn/floor/frontmatter-core.mjs`)

Two exports, beside `FIELD_LINE_RE` and `readField`:

- `BULLET_FIELD_LINE_RE = /^-[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/` — the dev PLAN's leading `- key: value` line, the
  grammar `check-plan-lessons.mjs` and both ship-briefing files use today, byte for byte.
- `fieldEntries(lines, re = FIELD_LINE_RE)` — every matching line as `{ key, raw }` in file order, `raw` exactly as
  captured (untrimmed). Pure, no value cleaning: each consumer keeps its own value rule, which differs on purpose
  (`check-loop-record.mjs` refuses to strip a `#` comment; `readValue` strips it). `readField` is re-expressed over it,
  with its reading unchanged (LAST wins, `readValue`).

The header comment's "WHAT IT DOES NOT DO" paragraph is re-derived (L25): the core still refuses nothing, and the one
refusal now lives in `check-plan-lessons.mjs`.

### 2. `check-plan-lessons.mjs` — a repeat is RED

Both header regions are read in full: the frontmatter's `applied_lessons` lines, and the leading bullet block's (the
bullet block is read whether or not the frontmatter exists, exactly the region `fromBulletHeader` reads today). One
declaration across both → today's path, unchanged. Two or more → **RED**, naming the count and each region, before the
shape check, so neither copy is ever chosen. Zero → today's absence RED. The fence handling, the body boundaries and
sub-checks (B)–(D) do not change.

### 3. `readHeaderField` in both ship-briefing files — LAST wins

The SPEC's `state` and `spec_id` are decided by `check-spec.mjs`, which reads them with `readField` (last wins). The
briefing pair read the first copy, so on a SPEC with `state: Draft` then `state: Approved` the gate and the briefing
disagree. Both branches switch to the last copy. The value rule (`clean()`) stays: the ⟲ test at
check-ship-briefing.test.mjs:512 pins it, and the value rule is not what the audit found. The dev-bullet branch's
fence toggle is replaced by `fenceStates` from `plan-files-core.mjs`, the rule `render-ship-briefing.mjs` already uses
for its section reader, so a backtick fence line inside a tilde fence no longer closes it; the two files stay identical
(the ✧ parity test).

### 4. The reader swaps

`check-loop-record.mjs`, `check-loop-decision.mjs`, `loop-closeout.mjs`, `check-ship-briefing.mjs` `readEnvelope`,
`render-cost-ledger.mjs` and `.dev/floor/command-family.mjs` parse their lines with `fieldEntries`; each keeps its own
value cleanup and its last-wins Map. In `check-loop-decision.mjs` and `loop-closeout.mjs` (group D is editing both in
`fix/loop-honest-stop`) the edit is the import line plus the loop body of the one reader, nothing else.
`command-family.mjs` also takes `matchFrontmatter` for both of its anchors (`frontmatterFields` and
`withoutFrontmatter`), so a BOM'd part is read and stripped consistently.

### 5. The closure tests (L29, L36)

In `pharn/floor/frontmatter-core.test.mjs`:

- **The anchor set is closed.** Every non-test `pharn/floor/*.mjs` whose source references the frontmatter anchor
  (`FM_RE`, `matchFrontmatter(` or `startsWith("---")`) is in `CONSUMERS`, and every `CONSUMERS` entry calls
  `stripBom(` or `matchFrontmatter(`. `CONSUMERS` grows from 9 to 19 (the six ENF-3 product sites plus
  `render-cost-ledger`, `instruction-files-core`, `ac-tests-lock`, `spec-template-core`, which already strip). A new
  reader that tests the fence on raw text fails here until it is listed, and it cannot be listed without stripping.
- **The line grammar has one home.** No non-test `pharn/floor/*.mjs` other than `frontmatter-core.mjs` contains a
  regex literal opening `^([A-Za-z_]` or `^-[ \t]+([A-Za-z_]`, except the allowlist `{instruction-files-core.mjs}`.
  The allowlist must name only files that exist and that still contain the pattern (a stale entry fails).

In `.dev/floor/command-family.test.mjs`, the same two rules over non-test `.dev/floor/*.mjs` (an empty allowlist),
because a `pharn/floor/` test must not reach into `.dev/`.

Each rule gets its negative control (L60): the test feeds the predicate a synthetic source string carrying the old
idiom and asserts it is flagged, so a predicate that matches nothing cannot pass vacuously.

## Files

- `pharn/floor/frontmatter-core.mjs` — `BULLET_FIELD_LINE_RE`, `fieldEntries`; `readField` over it; header re-derived.
  — layer: product floor
- `pharn/floor/frontmatter-core.test.mjs` — `fieldEntries` cases; `CONSUMERS` 9 → 19; the two closure rules with
  negative controls. — layer: product floor (test, never ships)
- `pharn/floor/validate.mjs` — `stripBom` before the fence. — layer: product floor
- `pharn/floor/validate.test.mjs` — a BOM'd capability yields the same findings as its clean twin; a BOM'd
  frontmatter-less file is still not a capability. — layer: product floor (test)
- `pharn/floor/count-lenses.mjs` — `stripBom`; the mirror comment updated. — layer: product floor
- `pharn/floor/count-lenses.test.mjs` — a BOM'd lens is counted, and agrees with validate. — layer: test
- `pharn/floor/count-grillers.mjs` — as count-lenses. — layer: product floor
- `pharn/floor/count-grillers.test.mjs` — as count-lenses. — layer: test
- `pharn/floor/count-verifiers.mjs` — as count-lenses. — layer: product floor
- `pharn/floor/count-verifiers.test.mjs` — as count-lenses. — layer: test
- `pharn/floor/check-model-config.mjs` — `stripBom` in `frontmatterModelEffort`; comment updated. — layer: product
  floor
- `pharn/floor/check-model-config.test.mjs` — a BOM'd command's `model`/`effort` is read. — layer: test
- `pharn/floor/griller-extract.mjs` — `frontmatterKind` and `trimGriller` skip one leading BOM; the BOM stays in the
  output. — layer: product floor
- `pharn/floor/griller-extract.test.mjs` — a BOM'd pharn-owned griller reads `pharn-owned` and trims as its clean twin
  does, with the BOM kept as its first byte. — layer: test
- `pharn/floor/check-plan-lessons.mjs` — the repeat RED; line grammar from the core. — layer: product floor
- `pharn/floor/check-plan-lessons.test.mjs` — the two repros above RED (frontmatter, bullets), plus one declaration in
  each region RED, plus a single declaration with a body mention of the key still GREEN. — layer: test
- `pharn/floor/render-ship-briefing.mjs` — `readHeaderField` last-wins, `fenceStates`. — layer: product floor
- `pharn/floor/check-ship-briefing.mjs` — its `readHeaderField` copy likewise; `readEnvelope` reader swap. — layer:
  product floor
- `pharn/floor/check-ship-briefing.test.mjs` — the parity fixtures gain a repeated `state` (frontmatter and bullets) and
  a tilde fence holding a backtick fence line; a test that the frontmatter branch agrees with `readField`. — layer: test
- `pharn/floor/check-loop-record.mjs` — reader swap. — layer: product floor
- `pharn/floor/check-loop-decision.mjs` — reader swap only. — layer: product floor
- `pharn/floor/loop-closeout.mjs` — reader swap only. — layer: product floor
- `pharn/floor/render-cost-ledger.mjs` — reader swap. — layer: product floor
- `pharn/floor/render-review-assignments.test.mjs` — (amendment 1, below) its fake repo copies `frontmatter-core.mjs`
  beside `count-lenses.mjs`. — layer: test
- `pharn/floor/lens-groups.test.mjs` — (amendment 1, below) likewise. — layer: test
- `.dev/floor/capability-catalog-core.mjs` — `stripBom` before the fence (imported from the product core). — layer:
  build apparatus
- `.dev/floor/capability-catalog-core.test.mjs` — a BOM'd capability parses as its clean twin. — layer: build apparatus
- `.dev/floor/check-config.mjs` — `stripBom` in `frontmatterModelEffort`. — layer: build apparatus
- `.dev/floor/check-config.test.mjs` — a BOM'd dev command's model/effort is read. — layer: build apparatus
- `.dev/floor/command-family.mjs` — `matchFrontmatter` + `fieldEntries`. — layer: build apparatus
- `.dev/floor/command-family.test.mjs` — a BOM'd part; the two `.dev/floor` closure rules. — layer: build apparatus
- `.dev/floor/frontmatter-readers.test.mjs` — (amendment 2, below) NEW: the two `.dev/floor` closure rules and the BOM'd
  part test, moved out of `command-family.test.mjs`. — layer: build apparatus
- `.dev/guides/floor-checks.md` — the `check-plan-lessons.mjs` block names the repeat RED. — layer: build apparatus
- `SKILLS_VERSION` — 6.64.2 → 6.64.3. — layer: repo meta
- `README.md` — the version badge only. — layer: repo meta
- `CHANGELOG.md` — one new `## [6.64.3] - 2026-10-19` section, `### Fixed`. — layer: repo meta

### Not changed

- `pharn/pharn-contracts/**`: no contract states which copy of a repeated key a checker keeps, except `ac-tests.md`
  (SPEC readers, last wins, "nothing refuses the duplicate"), which stays true. No envelope gains a refusal, so
  `loop-record.md` and `ship-briefing.md` are unchanged.
- The `/pharn-*` and `/pharn-dev-*` commands: the new RED names itself in its message, the way the other refusals do.
- `instruction-files-core.mjs`, `installed-skills-core.mjs`, `check-spec.mjs`, `check-plan-spec-agree.mjs`,
  `ac-tests-lock.mjs`, `spec-template-core.mjs`: they already strip the BOM and import the core's grammar.
- `check-plan-lessons.mjs`'s fence model (`FENCE_RE`, any indent) and `plan-files-core.mjs`'s (0–3 spaces): a third
  fence model reconciliation is a separate axis.
- The four trusted docs, `MIN_CLI`, `docs/capabilities/**` (`docs:check` proves no rendered input changed).

## Applied lessons

- L4 — every new test is a mutant pair: the BOM twin against its clean twin, and each repeat fixture against its
  single-declaration twin, so a test passes only because the fix is there.
- L6 — the repeat refusal reads only the structured header regions `check-plan-lessons.mjs` already defines; a
  `applied_lessons:` line in the body, or inside a fence, is still data and never counts as a second declaration.
- L13 — this PLAN and every stage artifact are formatted with scoped prettier and `markdownlint-cli2 --no-globs`.
- L25 — the "MIRRORS validate.mjs EXACTLY" comments in the count-* files, check-model-config, check-config and the
  catalog name the fence they describe, so each is re-derived to say the BOM is stripped first; the core's "does not
  refuse a duplicated key" paragraph is re-derived the same way.
- L29 — the set is materialized: `CONSUMERS` for the anchor, one allowlist for the line grammar, each iterated by its
  rule.
- L31 — the `.dev/floor` copies (catalog, check-config, command-family) are the second copy of each obligation, so
  they get their own closure rules in `.dev/floor/command-family.test.mjs` instead of being left to the product test.
- L35 — the private line readers are retired into `fieldEntries`, not bound to it by a sync test; the one survivor
  (`instruction-files-core.mjs`) is allowlisted with the reason it must exist.
- L36 — both rules are closures: they collect every file carrying the idiom and require each to be a listed member,
  so a variant spelling at a new site fails, not only the spellings in front of the author today.
- L60 — each closure predicate has a negative control (a synthetic source carrying the old idiom is flagged), and each
  repeat fixture asserts the RED names the repeat, not some other refusal.

## Contracts satisfied

- `pharn/pharn-contracts/ac-tests.md` — its "the last copy of a duplicated key wins" for SPEC readers now also holds for
  the briefing pair, which reads the same SPEC.
- `pharn/pharn-contracts/loop-record.md`, `pharn/pharn-contracts/ship-briefing.md` — envelope readings unchanged (last
  wins, same value rules).

## Evals to write (P1)

- No capability and no `rule_id` changes; `node pharn/floor/validate.mjs .` must stay GREEN. The checkers' own suites
  are the evals (listed under `## Files`).

## Guarantee audit (P0)

- "A BOM'd capability is checked as its clean twin is" → floor: enum-regex (validate.mjs's parse), pinned by
  validate.test.mjs and the count-* differential tests.
- "Every product floor module that tests the frontmatter anchor strips the BOM first" → floor: enum-regex over source
  text (the closure rule). Bound: lexical — a module that calls `stripBom` on one variable and tests the fence on
  another passes it; the per-site behavioural tests are what catch that, for the sites that exist today.
- "A repeated `applied_lessons` is RED" → floor: enum-regex + count.
- "Every LOOP.md / BRIEFING.md / command-part reader keeps the same copy of a key" → floor by construction (one line
  reader), and each keeps its last-wins Map. Bound: value cleanup still differs per reader, on purpose.
- "No repeated key ever reaches a gate" → struck. Only `check-plan-lessons.mjs` refuses; the envelopes still choose the
  last copy.

## Trust audit (P2)

- The PLAN, SPEC, LOOP.md, BRIEFING.md and capability files are untrusted DATA. The changes read the same structured
  regions as before; the new RED's message quotes only the count and the region names, never a value.

## Determinism audit (P5)

- Every branch is a byte test (`U+FEFF` at offset 0), a regex match, or an integer count. No fallback guesses.

## Open questions (HALT)

1. **Refuse a repeated key in the LOOP.md and BRIEFING.md envelopes too?** Recommended: **no, not in this increment.**
   Those readers already agree (last wins), the refusal would change `loop-record.md` / `ship-briefing.md`, and group D
   is editing the loop files concurrently. Left as a named follow-up.
2. **May a non-test `.dev/floor/` module import `pharn/floor/frontmatter-core.mjs`?** No non-test dev module does so
   today (three dev tests do). The direction is the allowed one (`.dev` → `pharn`, as in `.dev/guides/lessons.md`).
   Recommended: **yes**, rather than a fourth private U+FEFF strip.
3. **Bump size.** Recommended: **patch** (6.64.3) — the shipped checkers get stricter on a malformed input only; no
   shape a current install writes changes.

## GATE 1 — decided under the maintainer's delegation (2026-10-19; appended, not part of the approved text)

This is a **model decision** made by the batch orchestrator under the maintainer's delegation (COMMON.md, batch
2026-10-19), relayed to this agent. It is **not** a human approval. Decision: approved as written.

- Q1 → no. The LOOP.md / BRIEFING.md duplicate-key refusal stays a named follow-up, recorded in the CHANGELOG entry and
  in SHIP.md.
- Q2 → yes. Non-test `.dev/floor/` modules may import `pharn/floor/frontmatter-core.mjs`.
- Q3 → patch.

One byte change to the approved text, made before this section was appended: Q2's line held an invisible literal
U+FEFF where the escape had been meant. It is now the words "U+FEFF". The approved text was sha256 `842c594b…4364`
(20,188 bytes); after that one edit, before this section, it is `d838e025…a1bb`. **No question is open.**

## Amendment 1 — two test files added to `## Files` after regress (2026-10-19; a model decision, recorded here)

The first `/pharn-dev-regress` run returned `no-regressions`, but its head test log showed 11 new failures:
`render-review-assignments.test.mjs` and `lens-groups.test.mjs` each copy `count-lenses.mjs` into a scratch repo
without `frontmatter-core.mjs`, which `count-lenses.mjs` now imports. The `tests` gate was already 1 at base, from a
timing test under machine load (`budget clock — … a 2 s window`), which passed at head. So `check-regress.mjs` classed the
gate `pre_existing`, and the base failure hid the head failures (the L5 masking). That is a real regression the
increment caused, so it is fixed rather than passed on.

- The two test files are added to `## Files` above. The fix copies `frontmatter-core.mjs` too. No product file
  changes.
- The first build window was reconciled before this edit: `check-bash-reconcile.mjs --require-baseline` → `CLEAN`,
  33 reconciled, no escapes. The fix round then reruns build Step 0 (the setter and a new anchor), so this PLAN edit
  falls outside the new window, followed by regress and verify.
- The same round corrects one count in `frontmatter-core.mjs`'s new header comment. It said "Nine floor readers"; the
  copies were in eight files (seven product, one dev), twelve sites in all.

## Amendment 2 — the GATE 2 fix round (2026-10-19; a model decision under the maintainer's delegation, recorded here)

`REVIEW.md` raised three minor advisory findings that are cheap and clearly right. This round fixes them:

- P3: the `.dev/floor` closure rules move to a new `.dev/floor/frontmatter-readers.test.mjs` (added to `## Files`
  above), so `command-family.test.mjs` is again only the command-parts rules.
- P0: `render-ship-briefing.mjs` no longer says its fence reading is "as CommonMark reads it".
- P0: `frontmatter-core.mjs`'s header names the closure's lexical bound.

The window opened by Amendment 1's anchor was reconciled before this edit: `CLEAN`, 32 reconciled, no escapes. The round
reruns build Step 0, then merges `origin/main` (6.64.3 landed there as #359, so this increment renumbers to 6.64.4),
then reruns regress and verify. The fourth finding, regress masking, belongs to the apparatus and is the deferred lesson
candidate.
