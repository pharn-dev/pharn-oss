# PLAN — ship-scope-target

- spec_content_hash: 69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e # fix #4
- applied_lessons: [L2, L3, L4, L8, L19, L20, L22, L25, L29, L31, L33, L34, L35, L36]
- increment: Make `/pharn-ship`'s writes-scope setter actually resolve — re-scope per artifact with `--target` (the `/pharn-regress` / `/pharn-verify` pattern), correct the four prose sites that assert the false one-call story including the `FLOOR: hook (fix #7)` claim, and convert L8's discipline-only remedy into two corpus rules in `.dev/floor/command-hygiene.test.mjs`.
- layer(s): n/a — `.claude/` command surface + `.dev/` apparatus test + repo-meta (no `pharn-*` module touched)
- constitution_refs: [P0, P2, P5, P6, P7]

## Applied lessons

- L2 — this increment's core defect is L2's exact disease one layer out: `pharn-ship.md:550-553` says
  "**FLOOR: hook (fix #7).** `set-writes-scope.cjs` + `enforce-writes-scope.cjs` pin exactly these three
  paths" while the cited op never runs. So the fix corrects the **claim** in the same increment as the
  mechanism — not the mechanism alone, which would leave a sentence that was accidentally true.
- L3 — `--target` becomes load-bearing across the command corpus here, so every existing
  `--from-frontmatter` declaration was re-audited **before** the rule was written: 20 invocation sites
  read live this run, 19 already carry `--target`, 1 (`pharn-ship.md:270`) does not. The rule is
  therefore a pin over a corpus already true-but-for-the-defect, never a retrofit that converts
  harmless existing values into blocks.
- L4 — both new rules get a DISCRIMINATION test whose mutant is derived from the **real** command body
  (strip `--target` off a genuine invocation line; splice a fourth placeholder into the real `writes:`
  line), never from a hand-authored fixture string that would exercise none of the rule's own extraction.
- L8 — this IS L8's mechanic, hit for the first time. L8 records "the constraint was learned at design
  time and the sidecar friction was AVOIDED, not hit"; `/pharn-ship` hit it. The remedy is L8's own
  prescription copied, not invented: "re-scope per-artifact — call the setter once immediately before
  each write, as `/pharn-dev-regress` and `/pharn-dev-verify` do."
- L19 — the corrected guarantee sentence stays narrowed to the `PreToolUse` surface. `/pharn-ship`'s
  Step 2c renders through a Bash redirect (`> /tmp/briefing-draft.md`) and every stage invocation is
  Bash, so "the hook pins these paths" is true of Write/Edit/MultiEdit/NotebookEdit only; the rewrite
  keeps that bound explicit rather than letting a now-true claim read wider than it is.
- L20 — L8 shipped with a **discipline-only** remedy ("Never assume one setter call authorizes a
  multi-file placeholder output"). `/pharn-ship` is the second occurrence, so L20's trigger has fired
  and the remedy escalates from a canon note to a deterministic corpus rule. This is the P7 trigger for
  adding the tests, and it is a **real, observed** failure — not a manufactured one.
- L22 — the defect's proximate cause is prose that **describes** a rationale instead of pinning a
  command line: "covered by **one** call, since no `--target` narrows it" is a confidently-wrong
  explanation of the setter's behavior. The fix replaces it with four pinned invocation lines, removing
  the choice rather than warning about it.
- L25 — those rationale sentences are "trusted for the defects they do NOT name": Step 3's "already
  scoped by Step 2c's call above (no need to re-run the setter here)" reads as a completed analysis and
  would stop the next reader from checking. Both are **re-derived**, not supplemented — and the same
  re-derivation is what surfaced the fourth write site (Step 3b's clause render) the review did not name.
- L29 — the remedy is quantified over a set ("every `--from-frontmatter` call site"), so the deliverable
  is the enumeration materialized once with the rules iterating it. Here the set is **discovered from
  the corpus at test time** rather than hand-listed, so a command added later inherits both rules for
  free — the strongest available form of L29's prescription.
- L31 — `/pharn-dev-ship` (correct, `--target` present) and `/pharn-ship` (dropped it) are exactly the
  deliberate copy-pair L31 names, and the defect landed in the second copy. The same pair-shape holds
  for `/pharn-regress`↔`/pharn-dev-regress` and `/pharn-verify`↔`/pharn-dev-verify`, where **both**
  halves are correct — which is why the rule ranges over the whole corpus, not over `pharn-ship.md`.
- L33 — the review named two sites (`:31`/`:270` and `:550-553`); L33 says treat any prior enumeration
  as a **lower bound to beat**. Re-scanning live found **four** prose sites carrying the one-call story
  (`:266-267`, `:272-274`, `:390-391`, `:551`) and a **fourth** write the review did not name (Step 3b
  renders the attestation clause back into `SHIP.md` after the `ship-record.json` write).
- L34 — a per-item rule says nothing over an empty domain, so both new rules carry an explicit
  non-vacuity assertion over the discovered site set; without it, a reworded invocation line would make
  the whole rule pass silently over zero sites.
- L35 — `pharn-ship.md`'s own `version: "0.4.0"` frontmatter is deliberately **not** bumped. It is a
  second version identity nothing reads (no checker, no generated doc — `pharn-ship.md` declares no
  `role:` so it gets no catalog page), and L35's question — must the second copy exist? — is asked
  before choosing a remedy: binding it would create a third thing to keep in sync. `SKILLS_VERSION` is
  the identity that ships.
- L36 — presence is not closure, and here that distinction is load-bearing rather than decorative: a
  one-call fix passing `--target features/<name>/SHIP.md` would satisfy the "every call carries
  `--target`" rule while leaving `ship-record.json` and `BRIEFING.md` unscoped. Rule B (every
  placeholder-bearing `writes:` path appears as a `--target`) is what closes the set.

## Files

- `.claude/commands/pharn-ship.md` — the fix: four per-artifact `--target` setter calls + four corrected prose sites — layer n/a (product command surface)
- `.dev/floor/command-hygiene.test.mjs` — two new corpus rules (A: every `--from-frontmatter` call narrows to `--target`; B: every placeholder `writes:` path appears as a `--target`) with their non-vacuity + discrimination + control-case assertions — layer n/a (dev apparatus)
- `SKILLS_VERSION` — `3.0.1` → `3.0.2` (patch: a correction to already-shipped product-surface bytes) — layer n/a (repo-meta)
- `README.md` — the shields badge line only (`pharn-3.0.1-blue` → `pharn-3.0.2-blue`); the `CURRENT-STATE` region is GENERATED and is not hand-edited — layer n/a (repo-meta)
- `CHANGELOG.md` — one entry at the top of the existing `### Fixed` group under `[Unreleased]` — layer n/a (repo-meta)

### Explicitly NOT written

- `.claude/hooks/set-writes-scope.cjs` — the setter's `resolveEntry` behavior is **correct**; the defect
  is at the call site. Changing the setter to fall back to a placeholder-wide scope would convert a
  fail-closed refusal into a silent over-grant (the L7 direction).
- `.claude/commands/pharn-dev-ship.md` and every other command — all 19 other `--from-frontmatter`
  sites already carry `--target`; concurrent work touches those files.
- `pharn/ARCHITECTURE.md`, `pharn/CONSTITUTION.md`, `THREAT-MODEL.md`, `LIMITS.md` — hook-denied,
  human-only; nothing here requires a change to them.

## The defect, re-verified live this run (P6)

1. `pharn-ship.md:31` declares `writes: ["features/<name>/SHIP.md", "features/<name>/ship-record.json",
"features/<name>/BRIEFING.md"]` — all three carry the `<name>` placeholder.
2. `pharn-ship.md:270` invokes `set-writes-scope.cjs --from-frontmatter …` with **no `--target`**. Run
   live, it printed "no concrete writes: paths in .claude/commands/pharn-ship.md (only
   placeholders/empties — pass --target for placeholder/glob entries)" and **exited 1**; `.pharn/` was
   not even created — no scope file is written.
3. Run live with each `--target` in turn: exit 0, and the emitted scope is **exactly one** path — the
   target — confirming one call cannot cover three artifacts.
4. `enforce-writes-scope.cjs:113` `DEFAULT_SAFE_SET = ["features/**", ".dev/features/**",
"pharn/pharn-*/**"]`, read live — so with no scope file every path under `features/**` is writable.
   **Blast radius is bounded** (writes stay inside `features/**`; `protect-trusted-paths.cjs` still
   denies the trusted docs regardless). This is a **P0-honesty** defect, not an arbitrary-write one.
5. Corpus scan, live: **20** `--from-frontmatter` invocations across `.claude/commands/*.md`;
   `pharn-ship.md` is the **only** one without `--target`.

## What changes in `.claude/commands/pharn-ship.md`

Four setter calls, each immediately before the write it authorizes — the `/pharn-regress` Step 0 + Step 6
and `/pharn-verify` Step 0 + Step 6 shape, copied, not invented:

| #   | site             | `--target`                         | the write it authorizes                                                                |
| --- | ---------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Step 2c preamble | `features/<name>/BRIEFING.md`      | 2c.3 writes `BRIEFING.md`                                                              |
| 2   | Step 3           | `features/<name>/SHIP.md`          | Step 3 writes `SHIP.md`                                                                |
| 3   | Step 3b.2        | `features/<name>/ship-record.json` | 3b.2 writes it; 3b.4 re-writes it with the attestation block (same target, same scope) |
| 4   | Step 3b.5        | `features/<name>/SHIP.md`          | 3b.5 renders `· attested by <by>` / `· unattested` **back into** `SHIP.md`             |

Site 4 is the one the review did not name (L33). Without it the clause render is denied, because the
active scope at that point is `ship-record.json`.

Site 2 also repairs a **second** live consequence: Step 2c is "reached only after a `PASS` verify", so on
a RED-verdict STOP it never runs — and Step 3 today relies entirely on Step 2c's call. A stopped run
therefore reaches the `SHIP.md` write with **no** setter call at all. Putting the call in Step 3 itself
fixes the stop path as a consequence of adopting the standard shape, not as a separate change.

Four prose corrections, each re-derived rather than deleted (L25):

- `:266-267` — "covered by **one** call, since no `--target` narrows it" → the `/pharn-regress` Step-0
  sentence: the setter resolves **one `--target` per call** and overwrites `.pharn/writes-scope.json`, so
  `/pharn-ship` scopes each artifact to itself immediately before writing it.
- `:272-274` — "This is the **same** setter call Step 3 below used to run on its own … Step 3 no longer
  repeats it" → deleted and replaced; Step 3 **does** repeat it, per-artifact.
- `:390-391` — "all three are its declared `writes:`, already scoped by Step 2c's call above (no need to
  re-run the setter here)" → replaced with the actual setter call plus the regress/verify caveat.
- `:551` — the guarantee-audit bullet keeps `FLOOR: hook (fix #7)` — which becomes **true** once the
  calls land — and gains the L19 bound: the hook gates `Write|Edit|MultiEdit|NotebookEdit` only, so the
  Bash stage-invocations and the `/tmp` briefing render are outside it.

## What changes in `.dev/floor/command-hygiene.test.mjs`

Two rules, both ranging over a set **discovered from the corpus** (L29 in its strongest form — a command
added later inherits both without an edit):

- **Rule A — every `--from-frontmatter` invocation narrows to a `--target`.** Line-anchored matcher
  (`^[ \t]*node \.claude/hooks/set-writes-scope\.cjs --from-frontmatter\b`, the
  `writes-scope-release.test.cjs` anchor style, so a prose mention of the script name never counts),
  each matching line additionally required to carry `--target <path>`. Offenders reported `file:line`.
- **Rule B — every placeholder-bearing `writes:` path appears as a `--target` in the same command.**
  Rule A alone is satisfiable by a single call with one `--target`, which would leave two of
  `/pharn-ship`'s three artifacts unscoped — presence is not closure (L36). Membership is a
  deterministic path test: an entry qualifies when it contains `<`, contains `/`, and contains **no
  whitespace**, which excludes `pharn-build.md`'s prose entry
  `<user-code files named in the plan's ## Files (Phase-1, via --from-plan — not from this list)>`
  by construction rather than by a hand-written exemption (L3 — the rule must not convert an existing
  correct declaration into a block).

Both rules carry:

- a **non-vacuity** assertion over the discovered site set (L34), so a reworded anchor fails loudly
  instead of certifying an empty domain;
- a **discrimination** assertion whose mutant is derived from the real command body (L4);
- for Rule A, a **control case**: `--from-plan` invocations are exempt by construction (they read the
  PLAN's `## Files`, already concrete), and the corpus must actually contain one — otherwise the
  conditional shape is unexercised.

## Contracts satisfied

- None. This increment touches no `pharn/pharn-contracts/` schema, adds no finding shape, and changes no
  capability frontmatter. It corrects a command's procedure and pins an existing floor mechanism's call
  convention.

## Evals to write (P1)

- None required. P1 binds **Capabilities** (`role:`-bearing files); `pharn-ship.md` declares no `role:`
  and `pharn/floor/validate.mjs` deliberately ignores `.claude/commands/`. The verification surface here
  is `node --test` over `.dev/floor/command-hygiene.test.mjs`, which is what `npm test` already runs.
  Claiming an eval here would be the speculative addition P7 forbids.

## Guarantee audit (P0)

- "`/pharn-ship` may write only `SHIP.md`, `ship-record.json`, and `BRIEFING.md`" → **floor: hook**
  (fix #7, `set-writes-scope.cjs` + `enforce-writes-scope.cjs`). **True only after this increment**;
  today it is false. **NARROWED (L19):** the `PreToolUse` surface only — Bash-run stage invocations and
  the `> /tmp/briefing-draft.md` render bypass it entirely, and no checker would catch a future edit
  that added a Bash write.
- "each of the four writes is scoped to exactly that one path at the moment it happens" → **floor: hook**,
  same primitive. It is **stricter** than the bullet above: at any instant the active scope is one path,
  so a mis-targeted write is denied even though it is a declared `writes:` member.
- "every `--from-frontmatter` invocation in the command corpus carries `--target`" → **floor: enum-regex**
  (`pharn/ARCHITECTURE.md §2` primitive #3), executed by `node --test` under `npm test` / `npm run check`.
  **NARROWED, and it is the point:** it proves the **flag is present on the line**. It does **not** prove
  the `--target` value is _correct_, that the path matches a `writes:` entry, or that any run executed the
  line. Commands are not `role:`-bearing capabilities, so nothing can run a behavioral case over one —
  "the wiring is pinned" NEVER means "the scope was set".
- "every placeholder `writes:` path is scopeable, and named as a `--target`" → **floor: enum-regex**,
  same test file. **NARROWED:** it proves each declared path appears as some call's `--target`; it does
  **not** prove the call sits immediately before that path's write, nor that the ordering is right.
  Ordering stays **advisory** command prose.
- "`SKILLS_VERSION` agrees with the README badge" → **floor: enum-regex**
  (`.dev/floor/check-version-badge.mjs`, wired as `check:badge` in `npm run check` and as its own
  `ci.yml` step). **NARROWED:** it proves the two strings agree, never that `3.0.2` is the _right_ bump.
- "the bump size is correct (patch)" → **advisory.** No checker reads `CLAUDE.md`'s bump-size rule; the
  human ratifies it at GATE 1 / GATE 2.
- "the four corrected prose sites are now true" → **advisory.** Nothing reads command prose for truth —
  `validate.mjs` ignores `.claude/commands/`, and the new rules read invocation lines, not claims. This
  is exactly the residual L33 names; no checker is added for it here (that would be the separate
  `forward-looking-claims-manifest` follow-up already recorded in the CHANGELOG).
- "`/pharn-ship` now behaves correctly at run time" → **advisory, and struck as a guarantee.** This
  increment changes bytes a model reads. Running the stages in order was and remains advisory
  orchestration (the command's own "two clocks" note).

## Trust audit (P2)

- `.claude/commands/pharn-ship.md` and `.dev/floor/command-hygiene.test.mjs` are `trust: trusted`
  repo-owned source, edited by this increment — not ingested untrusted input.
- The **finding this increment fixes** arrived from an external adversarial review — `trust: untrusted`
  free text. It is treated as DATA: every load-bearing claim in it was **re-derived live this run**
  (the setter run three ways, the corpus scan, `DEFAULT_SAFE_SET` read from source), and the plan cites
  the re-derivation, not the report. Two of its statements were **extended** by that re-derivation
  (a fourth write site; four prose sites rather than two) — an untrusted report is a lower bound to
  beat (L33), never a set to confirm.
- No taint reaches a guaranteed decision: the new rules branch on regex membership over repo-owned
  files, and the writes-scope hook branches on a deterministically parsed path list.

## Determinism audit (P5)

- Rule A branches on a line-anchored regex match — membership, no judgment.
- Rule B's "is this `writes:` entry a scopeable placeholder path?" is a three-part deterministic test
  (`contains <`, `contains /`, `contains no whitespace`) over the parsed frontmatter line — never an
  LLM classification of "does this look like a path".
- The setter itself is unchanged and remains deterministic: `resolveEntry` is exact-literal or
  placeholder-regex, and it **fails closed** (exit 1, no write) rather than guessing when nothing
  resolves. That fail-closed behavior is what made this defect loud instead of silent, and this
  increment deliberately does not soften it.
- No fallback chain is introduced. Where the human must decide (bump size, whether Rule B is in scope),
  the plan **halts and asks** at GATE 1 rather than choosing.

## Open questions (HALT) — RESOLVED (human-approved 2026-09-09, GATE 1: "full scope, all four as recommended")

All four were answered at the GATE-1 halt. **None remains open**; each recorded here with its decision
rather than edited away, so the fork and the choice both survive in the audit trail.

1. **Is Rule B in scope, or is Rule A alone the increment? → BOTH RULES (human-approved 2026-09-09).**
   The L36 argument carried it: Rule A alone is satisfiable by a one-call fix passing
   `--target features/<name>/SHIP.md`, which would leave `ship-record.json` and `BRIEFING.md` unscoped —
   so Rule B is what makes the check range over the actual failure, not a second nice-to-have. The
   corpus-discovered site set (L29's strongest form), both non-vacuity (L34) and discrimination (L4)
   assertions, and the `--from-plan` control case are all explicitly retained.
2. **Four setter calls, or three? → ALL FOUR (human-approved 2026-09-09).** Site 4 (re-scoping back to
   `SHIP.md` before Step 3b.5's attestation-clause render) is approved. The **second live bug** it
   surfaced is approved for explicit call-out in the artifact: Step 2c is reached only after a `PASS`
   verify, so a RED-verdict STOP reaches the `SHIP.md` write with **no setter call at all**.
3. **Bump size → PATCH, `SKILLS_VERSION` 3.0.1 → 3.0.2 (human-approved 2026-09-09),** with the README
   shields badge in the same commit so `check:badge` stays GREEN. Rationale accepted: the `writes:`
   declaration and the floor claim already shipped, so this corrects those bytes rather than shipping a
   new capability, and the two new rules live in a `*.test.mjs` that never ships.
4. **Leave `pharn-ship.md`'s own `version: "0.4.0"` unbumped → CONFIRMED (human-approved 2026-09-09).**
   L35's reasoning was corroborated by practice at the gate: no checker reads the field, and the file's
   history shows it bumped in only 4 of 12 commits touching it, on capability changes rather than
   corrections.

**Two constraints restated at the gate and carried into the build:** all four prose corrections are
**re-derived, not deleted** (L25), and the corrected `FLOOR: hook (fix #7)` bullet keeps its **L19
bound** — the hook gates `Write|Edit|MultiEdit|NotebookEdit` only, so the Bash stage invocations and the
`> /tmp/briefing-draft.md` render stay outside it. `.claude/hooks/set-writes-scope.cjs` is **not**
touched: its fail-closed refusal is what made this defect loud and must not be softened.

> **Build-ready — no open questions remain.** Spec hash `69c83953…` re-verified live this run against
> `pharn/ARCHITECTURE.md` (no drift, fix #4). Next in the chain: `/pharn-dev-grill` → `/pharn-dev-build`.
