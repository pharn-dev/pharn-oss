# PLAN — skills-threat-surface

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487
- applied_lessons: [L1, L2, L20, L25, L26, L29, L33, L36, L37, L40]
- increment: `THREAT-MODEL.md` gains the one attack surface it never modeled — user-installed
  `.claude/skills/*/SKILL.md` files that three product stages already feed to models as untrusted
  context — staged as a human-applied patch, adding no protection and claiming none.
- layer(s): none (root trusted docs + `.dev/` build apparatus — no capability layer is touched)
- constitution_refs: [P0, P2, P4, P6, P7]

## Trigger (P7) — demonstrated by reading, not asserted

P7 admits an addition only on a real failure. The failure here is a **documented control gap**, and
both halves were established live this run.

**(a) `THREAT-MODEL.md` never mentions skills — full-file, not windowed.** The file is **134 lines**
and all 134 were read this run. A **case-insensitive, whole-file** search returns **zero matches**:

```console
$ wc -l THREAT-MODEL.md
     134 THREAT-MODEL.md
$ grep -in "skill" THREAT-MODEL.md ; echo "exit: $?"
exit: 1
$ grep -in "\.claude" THREAT-MODEL.md ; echo "exit: $?"
exit: 1
```

`§2` enumerates the surface as **seven** numbered items (`:40-55`); `§3` maps each to a structural
answer and a floor primitive (`:63-71`); `§5` names the one residual (`:123`). No row, item or
sentence concerns an installed skill. The sweep was widened past the brief (L1): **none** of
`pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `LIMITS.md` or `README.md` contains
`claude/skills` either — `README.md:131`'s "installed skills version" is `SKILLS_VERSION` drift, a
different referent.

**(b) The channel is live and consumed.** `pharn/floor/scan-installed-skills.mjs:4` names the three
product stages; the calls are live at `pharn-build.md:164`, `pharn-grill.md:224`,
`pharn-review.md:148`. `pharn-review.md:187-190` hands the `SKILL.md` files to **each lens subagent**
as untrusted context and `:264` tags them untrusted. `pharn-review.md:156-179` already states the
sharpest risk — the **suppression asymmetry** — and its carve-out that for the four scanner-less
lenses there is **no structural backstop at all**.

**Therefore: plan.** A live untrusted-input channel, whose worst case is already written down inside
a command file, is absent from the document whose entire job is to enumerate exactly that. This is
**L25 at range**: a rationale reaches only the file it sits in. The analysis exists; it sits in
`pharn-review.md`, not in the threat model, so a reader auditing PHARN's attack surface from the
document that owns that question is told the surface has seven items and never learns of the eighth.

## Applied lessons

- **L1** — the meta-doc sweep ran and widened (a): the four trusted docs + `README.md` were all
  searched for `claude/skills`, not just the one file the brief named; and the increment's own
  meta-doc consequences (`SKILLS_VERSION` 6.1.0 → 6.1.1, a `CHANGELOG.md` entry) are scoped in
  `## Meta-doc consequences` below rather than left for `/pharn-dev-review` to find.
- **L2** — a contract's honesty must travel with the artifact and may cite only **live** floor ops.
  The `§3` row's "Floor primitive" column is the whole risk here, so its content is an **open
  question** (Q2) rather than a pre-picked phrase, and whatever lands must be verified against the
  implementation read **this run**, never against a neighbouring row's wording.
- **L20** — a discipline-only remedy recurs and the **second** occurrence earns a floor check. Applied
  in the refusing direction: the deferred per-`SKILL.md` digest has **no first occurrence**, so
  proposing a checker for it now would manufacture the trigger L20 exists to require. Recorded as a
  named future trigger in `## Explicitly deferred` instead of built.
- **L25** — a rationale reaches only the file it sits in, and is trusted for the defects it does
  **not** name. This is the increment's whole trigger argument (above), and it also bounds the fix:
  moving the suppression analysis would repeat the error in reverse, so the new text **points at**
  `pharn-review.md:156-179` and re-argues nothing.
- **L26** — a patch verified against a copy **outside** the repo is verified under different rules.
  Checked rather than hoped: `THREAT-MODEL.md` is listed in `.prettierignore:42` **and** in
  `.markdownlint-cli2.jsonc:16`, so **no style gate resolves over it in either location** — the
  vector is absent here, exactly as the `bash-write-claim-wording` precedent recorded. Verification
  is still `git apply --check` against the **live worktree**, never a scratchpad copy.
- **L29** — when a remedy is quantified over a set, the **enumeration** is the deliverable. `§2` and
  `§3` are a paired set keyed 1:1; adding a `§2` item without its `§3` row (or the reverse) leaves
  the correspondence half-discharged, so the patch must touch **both** or neither, and Q1's answer
  determines which cells move.
- **L33** — a "not yet built" claim expires the moment the work lands, and nothing reads shipped
  prose. Applied twice: the trigger search used the **shortest invariant substring** (`skill`,
  case-insensitively, whole file) rather than a phrase; and because the new row's honest content is
  largely a set of **absences**, the plan surfaces registering them as expiring claims (Q5).
- **L36** — a per-member presence set is not a closed set, and a parameterized value acquires variant
  spellings. The four scanner-less lens names are a live instance: restating them in
  `THREAT-MODEL.md` would create a **second spelling** that can drift from
  `pharn/floor/lens-scanner-map.json`. The new text therefore cites the map as the membership
  location and never re-lists the four names — P4 and L36 pointing the same way.
- **L37** — a doc stating a guard's bounds must be **probed**, not read off. Every structural claim
  this plan makes was executed, not inferred: the enumerator (`count:0` here, exit 0), the write
  guard on `THREAT-MODEL.md` (**exit 2, denied**), the style-gate exclusions, and the lens map. The
  probe table is in `## Live probes` below.
- **L40** — probing a claim's members confirms membership, never the stated **cause**. Applied to the
  "it gates nothing" claim, which is causal: it was checked by the **negation** — searching for any
  proceed/stop that reads the enumerator's output and finding none — not merely by observing that a
  run with `count:0` proceeds, which would be true whether or not the output gated anything.

## Live probes (P6/L37 — executed this run, exit codes recorded)

| probe                                           | command                                         | result                             |
| ----------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| `THREAT-MODEL.md` mentions skills?              | `grep -in skill THREAT-MODEL.md`                | **exit 1** — zero matches          |
| agent may `Edit` `THREAT-MODEL.md`?             | `protect-trusted-paths.cjs` ← `Edit` payload    | **exit 2 — DENIED**                |
| agent may `Write` the plan path?                | `protect-trusted-paths.cjs` ← `Write` payload   | exit 0 — allowed                   |
| enumerator on this repo                         | `node pharn/floor/scan-installed-skills.mjs .`  | `{"count":0,"skills":[]}`, exit 0  |
| scanner-less lens set (structured location, L6) | `lens-scanner-map.json` → `.scanners`           | **22 lenses, exactly 4 `null`**    |
| style gates over `THREAT-MODEL.md`              | `.prettierignore` / `.markdownlint-cli2.jsonc`  | excluded in **both** (`:42`/`:16`) |
| markers checker baseline                        | `node .dev/floor/check-specified-markers.mjs .` | GREEN, exit 0                      |

> **One correction, recorded rather than smoothed over (P6).** My first read of
> `lens-scanner-map.json` iterated the file's **top level** and reported "2 lenses, 0 scanner-less",
> contradicting `pharn-review.md`'s carve-out. The map is nested under `"scanners"`; re-read at the
> correct key it is 22 lenses with exactly 4 `null`, and the command file is **right**. There is no
> doc-vs-repo mismatch. Noted because a mis-keyed read that _looks_ like a finding is precisely how a
> false drift report enters a plan.

## Shape of the increment — staged patch, and the choice is not free

The `bash-write-claim-wording` precedent (`PLAN.md` + `proposed/*.patch` + `proposed/APPLY.md`) is
followed, **because the probe leaves no alternative**: `THREAT-MODEL.md` is one of the four trusted
docs and `.claude/hooks/protect-trusted-paths.cjs` denies an `Edit` to it at **exit 2**. Editing
directly is not a rejected option, it is an unavailable one. The route `CLAUDE.md` forbids — routing
the in-repo write through `Bash` to dodge the guard — is **not taken**, and no write to
`THREAT-MODEL.md` is attempted by any stage of this increment.

## Files

- `.dev/features/skills-threat-surface/proposed/THREAT-MODEL.md.patch` — the staged unified diff:
  **three hunks** — a new `§2` item 8, its paired `§3` row, and the `§5` rewording (D1/D2/D4 below).
  Generated by exact-match substitution, each hunk asserted to match exactly once, verified with
  `git apply --check` against the live worktree — layer: `.dev/` apparatus
- `.dev/features/skills-threat-surface/proposed/LIMITS.md.patch` — the staged quantifier retraction
  at `LIMITS.md:95` and `:141` (D3 as amended by grill F1). Adds no claim, restates nothing —
  layer: `.dev/` apparatus
- `.dev/features/skills-threat-surface/proposed/specified-primitives.json.patch` — the staged
  `named_artifacts` registration of the `scan-installed-skills.mjs` citation (D5 as **narrowed** by
  grill F2 — the `forward_claims` half is deferred, not registered) — **staged, not applied live,
  and the reason is measured below** — layer: `.dev/` apparatus
- `.dev/features/skills-threat-surface/proposed/APPLY.md` — the human applier's note: what to run,
  **that the two patches apply together as one atomic edit**, the probe table showing why the agent
  could not apply them, the L26 bound, and the `SKILLS_VERSION` + `CHANGELOG` consequence — layer:
  `.dev/` apparatus

**Not written by this increment, stated so the omission cannot be read as an oversight:**
`THREAT-MODEL.md` itself (hook-denied, human applies the patch); **`.dev/floor/specified-primitives.json`
itself** (staged as a patch, not written — see D5); `SKILLS_VERSION`; `CHANGELOG.md`;
`pharn/floor/scan-installed-skills.mjs`; any command file; any checker.

## Contracts satisfied

- None. No `pharn-contracts` schema is added, changed, or instantiated — the increment writes prose
  and a diff. Cited, not restated (P4): the finding-shape / eval-format contracts are untouched.

## Evals to write (P1) — `none`, and explicitly why

**`none`.** P1 binds **Capabilities** — a `.md` file whose frontmatter carries `role:`
(`pharn/ARCHITECTURE.md §3.1`). This increment adds **no** `role:`-bearing file: it writes a `.patch`
and an `APPLY.md` under `.dev/`, and `pharn/floor/validate.mjs` excludes `.dev/**` wholesale. No
`enforces` field is introduced, so no `rule_id`→eval binding (fix #6) arises. Stating this rather
than omitting the section, because an absent `## Evals` and a reasoned `none` must not look the same.

## Guarantee audit (P0)

- **"The agent did not write `THREAT-MODEL.md`"** → **FLOOR: hook (fix #2)** —
  `protect-trusted-paths.cjs`, probed at **exit 2** this run. **Narrowed, and stated:** floor for the
  `Write`/`Edit`/`MultiEdit`/`NotebookEdit` surface only; a `Bash` write reaches the file (`LIMITS.md
§6`). The plan's answer to that is discipline plus the 4.0.0 reconciler, not a claim of prevention.
- **"This stage writes only `PLAN.md`"** → **FLOOR: hook (fix #7)** — setter reported `1 path(s)`.
- **"The patch applies cleanly to the live worktree"** → **FLOOR-grade at build time: `git apply
--check` exit code.** It is a deterministic verification of the artifact, **not** a shipped
  guarantee, and it says nothing about whether the text is true.
- **"`THREAT-MODEL.md` now models the installed-skills surface"** → **ADVISORY**, and only _after a
  human applies the patch_. Nothing reads trusted-doc prose: `validate.mjs` ignores root docs, and
  `check-specified-markers.mjs` holds only the annotations **registered** in its manifest (its own
  header says an unlisted overclaim is invisible to it). This is the honest ceiling of the increment.
- **"This increment adds protection against a hostile `SKILL.md`"** → **NOT A CLAIM — struck (P0).**
  It adds **none**. It makes an unmodeled surface modeled. That is the whole deliverable, and any
  sentence in the patch implying otherwise is a defect the grill and review must catch.
- **"The enumeration is FLOOR-grade"** → **true but nearly empty, and must be written that way.**
  `scan-installed-skills.mjs` is deterministic and `.test.mjs`-covered, and it **gates nothing** —
  `scan-installed-skills.mjs:11`, and the guarantee-audit bullets already live at
  `pharn-build.md:304-308`/`:351-353`, `pharn-grill.md:353-357`, `pharn-review.md:247-251`. A `§3`
  cell naming "enum/regex" **without** "gates nothing" would read as answered. That is the inflation
  failure mode, and D2 resolves it by keeping the hedge in the cell itself.
- **"The new `§3` row may carry `_(specified; ships with the guarded surface)_`"** → **FORBIDDEN —
  added after grill F4.** Four of the seven existing Floor cells end in that marker, so an author
  matching local table style would carry it into row 8 by reflex. It asserts a protection that
  **will ship**, and nothing is coming here — it would be a registered-primitive-shaped claim with
  no primitive behind it, in a row nobody registered. The row must say instead, in the cell itself,
  that **no primitive is specified or planned**.
- **"Registering the new claims guards them against drift"** → **FLOOR: enum-regex** — but **only
  once the human applies both patches together**, and it guards the **listed** sites only; the
  checker's own header states it cannot discover an unregistered overclaim. Staged rather than
  written, because registering early is a measured RED (D5), not a style preference.
- **"Applying one patch without the other is safe"** → **FALSE, and deterministically so.** Marker
  without registration = direction 1 silently unguarded; registration without marker = direction 2
  RED (exit 1, reproduced above). `APPLY.md` must carry this, since nothing enforces atomicity.

## Trust audit (P2)

- **This increment ingests no untrusted artifact.** Probed: `.claude/skills/` does not exist in this
  repo (`count:0`). Its inputs are `THREAT-MODEL.md` (trusted), three `.claude/commands/*.md`
  (`trust: trusted`), and `lens-scanner-map.json`. It **describes** an untrusted channel without
  opening one; no taint enters the patch.
- **The channel being documented, for the record the patch will cite:** a `.claude/skills/*/SKILL.md`
  is user-dropped markdown, `trust: untrusted` (`scan-installed-skills.mjs:20-21`, which already
  cites `LIMITS.md §1a`). The enumerator ranges over **names/paths only**, never bodies, so its
  output carries no taint; the bodies enter each lens subagent as advisory DATA
  (`pharn-review.md:187-192`). Taint therefore reaches **model judgment** and the human-facing
  `REVIEW.md`, and reaches **no gate** — because no gate reads it.
- **The asymmetry the patch must not soften:** an _added_ bogus concern surfaces as quoted DATA a
  human reads; a _suppressed_ genuine finding is invisible. Cited to `pharn-review.md:156-179`, never
  re-argued (P4, L25).

## Determinism audit (P5)

- Every branch this plan took was an **exit code or a set-membership read**: the trigger (`grep` exit
  1), the guard (hook exit 2), the lessons freshness gate (`check-lessons-index.mjs` exit 0 → GREEN →
  two-step sweep), the scanner-less set (read from `lens-scanner-map.json`'s structured location, L6 —
  never grepped from prose).
- The build stage's only branch is `git apply --check`'s exit code.
- **Terminal fallback is ask the human, twice over and by construction:** the five open questions
  below are a halt, and the patch itself is applied by a human because the floor denies the agent.

## Meta-doc consequences (L1)

- **`SKILLS_VERSION` 6.1.0 → 6.1.1 (patch), owed by the APPLIER, not by this increment.**
  `THREAT-MODEL.md` is one of the four trusted docs and is in the bump-triggering set per `CLAUDE.md`
  even though the installer never copies it; the bump is **patch** — a clarification to bytes that
  already shipped, no new capability, no shape change. The `.dev/` artifacts this increment writes
  bump **nothing** on their own. `MIN_CLI` stays `0.5.0` (no installed path moves).
- **`.dev/floor/specified-primitives.json` bumps nothing** — it is `.dev/` apparatus, outside the
  bump-triggering set, so the atomic edit's bump is owed by the `THREAT-MODEL.md` half alone.
- A `CHANGELOG.md` entry is owed in the same human edit.

## Explicitly deferred (P7 — not built, not scaffolded, no config key)

A per-`SKILL.md` content digest in the enumerator's output; a lock file, drift detection, or any RED
on skill change; any classification of what a skill **does**. **Named future trigger, recorded so it
is not lost:** if the `coverage-record` increment lands (untracked at `.dev/features/coverage-record/`
as of this run), the review record will need to state **which version** of a skill informed a run and
will be unable to. That is a real failure **at that point**. It is not one now, and a digest nothing
consumes is a speculative addition — L20's bar is a second occurrence and there is not yet a first.

## Decisions taken at the GATE-1 halt (all five resolved by the human)

Recorded with the reasoning that was on the table, so a later reader sees what was weighed, not only
what was chosen.

- **D1 — `§2` gains a NEW item 8; item 6 is not extended.** Chosen on the distinct-class argument: a
  community Capability is **gated** (`validate.mjs` enum-checks `kind`, restricts `seal` to
  `kind: pharn-owned`) whereas a `.claude/skills/` drop is gated by **nothing** — `validate.mjs`
  never scans `.claude/`. They differ in provenance (PHARN's capability tree vs. the user's own
  Claude Code install) and in consumption (a skill reaches **every** lens subagent). Folding them
  together would have put two different floor answers in one row and let item 6's `seal`-gating be
  read as covering skills — the inflation failure mode this increment exists to avoid.
- **D2 — the `§3` row reads "enumeration only; GATES NOTHING", not an empty cell.** The Structural
  answer names the one real bound (a mapped scanner's **MATCH** is a regex verdict a skill cannot
  erase) together with both narrowings: it covers only that the scanner matched, never that the lens
  **reports** it (`pharn-review.md:176-179`), and it does not exist at all for the scanner-less
  lenses. **Every word of the hedge is load-bearing (L2/P0):** "enum/regex" without "gates nothing"
  would read as answered, and the row would then imply a control PHARN does not have.
- **D3 — `LIMITS.md` gains NO restatement of `§1a` … but it DOES gain a quantifier retraction.**
  **Amended after the grill (F1), by the human at the post-grill gate.** The original decision was
  "`LIMITS.md` is NOT touched": `§1a` already owns "markdown is executable" and
  `scan-installed-skills.mjs:21` already cites it for exactly this file class, so a second general
  statement would be the restatement P4 forbids. **That reasoning stands and is unchanged** —
  `THREAT-MODEL.md` cites `§1a` and re-argues nothing.
  **What it did not cover is a RETRACTION.** `/pharn-dev-grill` measured that the "one residual"
  claim is **mirrored in `LIMITS.md` twice** — `:95` ("the **one place** the trust model is not
  provable on paper") and `:141` ("The **one residual** (§2) …") — neither of which restates `§1a`;
  both assert a **count** that D4 makes false. `LIMITS.md:11` states its own precedence ("If a claim
  elsewhere contradicts a limit named here, **the limit wins**"), so leaving them would ship a repo
  whose **winning** document contradicts the patched one. The four spellings across the two files
  ("single place" vs "one place" vs "one residual") are **L33**'s variant-spelling mechanism and
  **L43**'s mirrored-state shape firing together.
  **Therefore:** `proposed/LIMITS.md.patch` corrects the **quantifier at `:95` and `:141` only**. It
  adds no claim, restates nothing, and is P4-safe by construction — a retraction is not a restatement.
- **D4 — `§5` IS reworded to admit a second residual.** Suppression-via-`SKILL.md` is a residual of
  the same kind, `pharn-review.md:266-275` already calls it "the sharper residual for skills", and
  the scanner-less set **includes `trust-fence`, the attempt-0 probe itself**. **The cost is accepted
  deliberately and must be executed carefully (L37):** "the one residual" is a universal-quantifier
  claim, so the rewording has to move the **quantifier**, not merely append a sentence beneath it —
  a paragraph added under an unchanged "the one residual" heading would leave the false quantifier
  standing, which is precisely the drift L37 was promoted from.
- **D5 — BOTH shapes are registered in `.dev/floor/specified-primitives.json`, but as a STAGED
  PATCH, never a live write. This was measured, not assumed:**

  ```console
  $ node .dev/floor/check-specified-markers.mjs . --manifest <probe with the new site registered>
  SPECIFIED-MARKERS: RED — 1 drifted annotation(s)
    - THREAT-MODEL.md: no longer cites `scan-installed-skills` as "scan-installed-skills.mjs"
  EXIT: 1
  ```

  Registering a site while its marker is still absent from the live doc is an **instant direction-2
  RED** — it would break `npm run check`, CI, and this increment's own `/pharn-dev-verify`, on a doc
  nobody broke. The manifest's own `$comment` already prescribes the remedy for exactly this case
  (`pharn/ARCHITECTURE.md:304`: the file is hook-protected, "the marker must be added by a human;
  **add the site here in the same edit**"). So the registration ships as
  `proposed/specified-primitives.json.patch`, and `APPLY.md` states that **all three patches are one
  atomic edit** — applying any alone REDs the repo, in one direction or the other.

  **D5 is NARROWED to `named_artifacts` ONLY — amended after the grill (F2).** The grill measured
  that `check-specified-markers.mjs:255` runs `validatePrimitive()` over forward claims too, and
  `isLive()` at `:145` **throws** on a missing `probe` → **exit 2, fail-closed**; a probe must name a
  real filesystem location (`type: "path"` or `"dir-contains"`). "A gate that reads the skills
  roster" has **no such path**, and the manifest has **already ruled on this exact shape**, twice:

  > "the `live griller runner` class … and `/pharn-verify`'s verifier runner. Both are real expiring
  > claims, but **neither subject has a NAMED path in this repo, so a probe would have to invent
  > one. Deferred rather than guessed (P6)**."

  Inventing a path would pin a fiction that **reads as guarded while guarding a name nobody will
  use** — worse than the gap, and a direct contradiction of the repo's own recorded decision. So the
  `named_artifacts` entry ships (`scan-installed-skills.mjs` is a real path — the `secrets-in-code`
  precedent) and the forward-claim is **recorded as deferred, citing that precedent**. Narrowed on
  the terminal fallback P5 prescribes, not on preference.

## Q1 framing, retained for the patch author

**Amended after the grill (F3):** this heading previously read `## Open questions — none remain`.
`pharn-dev-build.md:55` HALTs on an unresolved `## Open questions (HALT)`, so a section whose stem
still read "Open questions" — carrying question-shaped numbered text — made a deterministic gate
depend on reading prose. **No `## Open questions` HEADING survives in this plan — verified live,
`grep "^## Open"` exits 1 — and there are no open questions.** The phrase remains in this paragraph
and in this paragraph only, describing the heading that was removed; stating it that precisely
rather than claiming the string is absent, because the imprecise version would be false on its own
line.

All five were resolved at the GATE-1 halt and two were amended at the post-grill gate. Retained below
is the original framing of Q1, which the `§2` patch text must argue from:

1. **`§2`: a new numbered surface (item 8), or an extension of item 6 ("community Capability",
   `:52`)?** _Same class:_ both are dropped markdown whose body is executable instructions, and
   `LIMITS.md §1a` already owns that claim for both. _Distinct class, and this is the stronger
   argument:_ a community Capability is **gated** — `validate.mjs` enum-checks `kind` and restricts
   `seal` to `kind: pharn-owned` — whereas a `.claude/skills/` drop is gated by **nothing**
   (`validate.mjs` never scans `.claude/`). They also differ in provenance (PHARN's capability tree
   vs. the user's own Claude Code install) and in consumption (a skill is fed to _every_ lens
   subagent). Because `§2` and `§3` are keyed 1:1 (L29), folding skills into item 6 would put two
   different floor answers in one row and let item 6's `seal`-gating be read as covering skills —
   the inflation failure mode.
2. **What do the `§3` row's two columns honestly contain — and is "Floor primitive" legitimately
   empty?** The candidates are (a) **empty / `none`**; (b) **"enumeration only — deterministic,
   gates nothing"**, with the partial scanner bound named and its carve-out cited. Everything true
   is weak: the enumeration is deterministic but no proceed/stop reads it; the only structural bound
   is that a **scanner hit is a regex verdict a skill cannot erase**, and even that covers only
   "the scanner MATCHED", never that the lens **reports** it (`pharn-review.md:176-179`) — and it
   **evaporates** for the four scanner-less lenses. If the honest row is weaker than all seven
   existing rows, the weak row is what gets written.
3. **Does `LIMITS.md` also need a line, or would that violate P4?** `§1a` already owns "markdown is
   executable" and `scan-installed-skills.mjs:21` already cites it for this file class, so a second
   general statement would be a restatement. **But** the **suppression asymmetry** is not `§1a`'s
   claim (that is about injection and blast radius) and not `§2`'s (that is about a **finding's**
   free-text consumed downstream) — so it may be a genuinely distinct, unstated limit, in the file
   whose own rule is that when claims conflict, the limit wins. The `bash-write-claim-wording`
   precedent added a whole new `§6` on exactly that reasoning.
4. **Is `§5` the more honest home for part of this?** `§5` is titled **"The one residual"** and is
   what attempt 0 targets. Suppression-via-`SKILL.md` is arguably a **second** residual of the same
   kind — `pharn-review.md:266-275` already calls it "the sharper residual for skills" — and the
   scanner-less set **includes `trust-fence`, the attempt-0 probe itself**. Putting it in `§5` would
   require rewording "the one residual", a universal-quantifier claim (L37) that goes stale the
   moment a second is admitted; leaving `§5` untouched keeps a known second residual out of the
   section that claims to hold the only one.
5. **(surfaced by discovery, not in the brief) Should the new text's absence-claims and its
   `scan-installed-skills.mjs` citation be registered in `.dev/floor/specified-primitives.json`?**
   That manifest is **hand-maintained** — nothing discovers annotations — and it already guards both
   shapes: `named_artifacts` (a doc citing a shipped artifact by a name it does not have) and
   `forward_claims` (a sentence true when written that expires when the thing lands). The new row is
   mostly absence-claims plus one artifact citation, i.e. squarely both shapes (L33). Registering is
   a `.dev/` **data** edit — apparatus, **no** `SKILLS_VERSION` bump, **no** new checker — but it is
   a second file this increment would write, which the stated axis ("documentation only") arguably
   excludes. Options: register both shapes; register the `named_artifact` only; register neither and
   record it as a follow-up.
