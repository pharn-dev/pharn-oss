# PLAN — grill-griller-slim

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L1, L6, L22, L25, L29, L31, L33, L34, L36, L39, L41, L43, L50, L55, L56, L60, L64, L69, L71, L72]
- increment: A full grill still runs every griller, but each `kind: pharn-owned` griller now loads without its
  `## The two layers` intro, its `### Layer 1` and its `## Finding output` (any other griller loses only the two
  sections omitted since 6.60.0). The scanner results those sections told the model to produce now come from
  `grill-scan.mjs`, run once in full mode as `--floor-only` already does. The six griller-specific runtime passages the
  omission would drop are moved into kept sections first. `/pharn-dev-grill` loads its grillers the same way. Griller
  text drops 141,332 → 99,436 B (−29.6%); the dev grill drops from 188,978 B of whole files to the same figure.
- layer(s): product floor (`pharn/floor/`), griller capabilities (`pharn/pharn-pipeline/grillers/`), product command
  (`.claude/commands/pharn-grill.md`), build apparatus (`.claude/commands/pharn-dev-grill.md`, `.dev/floor/`,
  `.dev/features/grill-griller-slim/`), repo meta
- constitution_refs: [P0, P1, P2, P3, P4, P5, P6, P7]

## GATE 1 record

Decided by the human at GATE 1 (relayed by the orchestrator, 2026-10-18), on the superseded plan
`grill-griller-selection` (R0 recommended: no runtime selection; R1 alternative: a11y path selection):

- **Design: R2, re-plan.** A deeper extract trim where the bytes are; every griller still runs in a full grill.
- **`migrations`' `applies` widening is a SEPARATE increment.** Named as follow-up `migrations-applies-universal`
  below; nothing about it is in `## Files`.
- **Fold in the `/pharn-dev-grill` trim.** The dev grill loads grillers through `griller-extract.mjs` as `/pharn-grill`
  does. Dev apparatus: that part bumps nothing.
- **Slug renamed** from `grill-griller-selection` to `grill-griller-slim` (branch `feat/grill-griller-slim`) before
  anything was built; the old plan file is removed from the branch. The R0 wording correction (the griller-extract
  header and Step 3b name every selection candidate measured and rejected) and the selection measurements are kept.

The orchestrator's R2 sketch was (1) full mode runs `grill-scan.mjs` once in Step 3b and (2) the extract also omits
`### Layer 1` and `## Finding output`, est. ~36 KB / ~25%. Verified below: the omission is 36,304 B (25.7%) as
sketched, but it is NOT lossless as sketched. Six grillers hold runtime content only in `### Layer 1`, so the design
moves that content first and lands at −33,135 B (−23.4%), −41,896 B (−29.6%) with the intro.

**APPROVED at GATE 1 (second round), by the human, relayed by the orchestrator 2026-10-18. Every open question is
resolved:**

- **Q1 — yes:** also omit the `## The two layers` intro. Target 99,436 B (−29.6%).
- **Q2 — the six griller edits:** four headings, the testability paragraph reorder, the i18n and privacy sentence moves.
- **Q3 — reword** `grill-scan.mjs`'s section so it is true in both modes; no flag.
- **Q4 — read the grillers in full** when `grill-scan.mjs` fails in full mode.
- **NEW, the human's choice — the `kind: pharn-owned` gate.** The deeper omission (intro, `### Layer 1`,
  `## Finding output`) applies ONLY to a griller whose frontmatter says `kind: pharn-owned`, a deterministic
  frontmatter membership test. Any other kind, and a missing or malformed one, keeps those three sections and loses
  only `## Guarantee audit` and `## Machine-readable emission`. Designed in "The `kind: pharn-owned` gate" below.

## GATE 2 record — FIX FIRST (the human's decision, relayed by the orchestrator, 2026-10-18)

The pipeline ran on this plan: grill `65b2475`, build `3697075`, regress `6892f61`, verify `89640b5` (PASS), review
`b6a82fd` (GREEN, 0 floor-gate findings, 7 advisory). At GATE 2 the human chose **FIX FIRST**, authoring rule
included:

- **Fix now:** review findings 1 (the authoring rule, important, P3), 2 (the whole-word heading match, minor, P0) and
  3 (two CHANGELOG phrasings, minor, P0). These are F1–F3 in "Fix round" below.
- **Defer, named follow-ups:** findings 4–7 and `migrations-applies-universal`, plus a new one from the builder's
  observation: `count-grillers.mjs` and `validate.mjs` count scratch copies of grillers left under `.pharn/`.
- **Version unchanged: 6.63.0.** This is the same unreleased PR, so the 6.63.0 CHANGELOG entry is still editable
  (CONTRIBUTING: only a merged entry is frozen).

## Fix round (GATE 2) — design

Live state read this run, after fast-forwarding to `b6a82fd`:

- `pharn/floor/griller-extract.mjs:166-173` (`omittedId`) matches `text.startsWith(s.prefix)` with no boundary.
- All 65 committed omitted heading lines (13 grillers × 5) continue with a space after the prefix (checked).
- The 13 grillers total 189,192 B; the extract prints 99,391 B.
- The stage load set for `/pharn-grill` sums about 261,349 B against its 285,184 B ceiling.

### F1 — the authoring rule lives in the grillers (review finding 1, P3)

- **The sentence.** It is added as one paragraph at the end of each `kind: pharn-owned` griller's `## The two layers`
  intro, just above `### Layer 1`, in all 13 grillers. The text is exact; the build pins it byte-for-byte after
  whitespace folding:

  > **Not loaded by a full grill.** For a `kind: pharn-owned` griller, `pharn/floor/griller-extract.mjs` leaves out
  > `## The two layers` (this section), `### Layer 1`, `## Finding output`, `## Guarantee audit` and
  > `## Machine-readable emission`. Guidance a grill needs belongs under `## Procedure`, `### Layer 2` or a
  > `### Presence` section, never under those five headings.

- **The two sections omitted since 6.60.0 are in it.** `## Guarantee audit` and `## Machine-readable emission` are
  left out of every griller, so grill-time guidance does not belong under them either. A sentence naming only three of
  the five would teach a partial rule. A test binds the sentence to `OMITTED_SECTIONS`: every member's heading appears
  in it, so adding a member forces the sentence to change in every griller.
- **Its cost to a grill is 0 bytes — verified, not argued.** A scratch probe (`.pharn/pharn-dev-plan/probe-fix-round.mjs`)
  inserted the paragraph into all 13 grillers in memory and ran the SHIPPED `trimGriller`:
  - the extract is byte-identical for 13 of 13 grillers, and the sentence appears in none;
  - the griller files grow by 4,823 B (371 B each), to about 194,015 B.

  That growth reaches only readers of the whole file: the whole-file fallback, `/pharn-dev-eval`, a person, and
  `stage-load-budget.test.mjs`. That test's grill row stays about 19 KB under its ceiling, so the test is unchanged.
  The paragraph starts with `**`, so no line of it is a heading, a setext underline or an HTML opener for the extract.

- **Tests (`pharn/floor/griller-extract.test.mjs`):**
  - ★ every committed griller that `frontmatterKind` reads as `pharn-owned` carries the sentence inside its
    `## The two layers` section. This is a closure over the live registered set, so a new in-repo `pharn-owned` griller
    without it goes RED;
  - ★ the sentence never reaches the extract output of any committed griller (the 0-byte claim, pinned);
  - ★ every `OMITTED_SECTIONS` member's heading text occurs in the pinned sentence.
- **Negative controls (L60), inside the tests:**
  - a synthetic `pharn-owned` griller without the sentence is RED;
  - one with the sentence moved under `## Procedure` is RED, both for "not in the intro" and for "reaches the extract";
  - a `kind: community` fixture without the sentence is not required to carry it.
- **The extract header.** Its "THE CONVENTION THIS RELIES ON … nothing reaches a griller an author adds or edits" is
  re-derived (L25). It now says where the rule is stated (each `pharn-owned` griller's intro) and what pins it (the
  closure over this repo's registered grillers). It also states the residual: an installed project's own griller, or
  a user-edited copy, is checked by nothing.
- **Bound (P0):** the pin is presence and placement of a sentence over the grillers in this repo. It is not proof that
  an author reads it, and nothing checks a griller outside this repo.

### F2 — the section start matches the prefix as a whole word (review finding 2, P0)

- **Rule.** In `omittedId`, a member matches only when the heading text starts with its prefix AND the next character
  is the end of the text, a space or a tab. Every committed heading (65 of 65) continues with a space, so no committed
  griller's output changes.
  - Space or tab, not "any whitespace": another Unicode space after the prefix keeps the section, which is the safe
    direction.
  - It is stricter than the review's "not a letter, a digit or `.`", which would still drop `## Guarantee audit:`.
- **Reproduced on the shipped code** (`probe-fix-round.mjs`): `### Layer 10 — x`, `### Layer 1.5 — x`,
  `## Finding outputs (x)`, `## The two layersets`, `## Guarantee auditing` and `## Machine-readable emissions` are
  all DROPPED today. The last two are 6.60.0 members, so the defect predates this PR, and this fix covers it too.
- **Tests:** a ★ case holding the six near-misses next to the six real heading forms. The near-misses are kept; the
  real ones (`### Layer 1`, `### Layer 1 — x`, `## Finding output (x)`, `## The two layers (P0)`,
  `## Guarantee audit (P0)`, `## Machine-readable emission (…)`) are dropped. Also a trailing-space and an
  end-of-line case.
- **Mutation controls** (run once at build, scratch, recorded):
  - the boundary removed, killed by the near-miss case;
  - the boundary accepting any non-letter (`### Layer 1.5` dropped), killed by the same case.
- **The markdown-it re-probe must NOT reuse the extract's own prefix predicate.** The 6.60.0 and 6.63.0 probes both
  matched heading text with `startsWith(prefix)`, so neither could see this class (review lesson candidate A, not yet
  promoted).
  - For the 13 committed grillers, the reference drops a markdown-it heading token only when its inline text is
    byte-EQUAL to an entry of a literal list of the 65 committed omitted heading texts. The list is copied once into
    the probe and printed in `MEASUREMENTS.md` for review; 65 = 13 × 5 is asserted.
  - For the adversarial set (the 20 earlier cases plus the near-misses), each case carries a hand-written expected
    outcome. The shipped rule and markdown-it's section ranges are both compared against that oracle; neither is
    computed by the rule under test.

### F3 — two CHANGELOG phrasings (review finding 3, P0; L64)

In the unmerged `## [6.63.0]` entry:

- **"No other text changes."** It becomes: apart from naming the subject of each moved sentence ("The hardcoded-string
  scanner …", "The PII scanner …"), no wording changes. A new item then states F1's sentence in all 13 grillers.
- **"The floor-only `GRILL.md` still says so through its own line."** It becomes: in `--floor-only` mode, `GRILL.md`'s
  pinned line says the interrogation did not run; that no griller ran is in the model-written sentence after it.
- **Restatements swept (L64):**
  - the "Checked by" bullets gain the F1 and F2 tests and the new mutant count;
  - "Not covered" drops "no contract tells a new griller's author the convention" and states F1's bound instead;
  - "Measured" re-states the griller-file bytes. The printed bytes stay 99,391.
  - The extract header's numbers are re-derived the same way.

## The triggering failure (P7)

Review finding CTX-1 (2026-10-12, High, cost). A full grill loads every griller into one context, and every later
request re-sends it: the measured grill agent made 41 requests, its context growing 302,208 → 425,373 tokens
(`.dev/measurements/loop-wall-clock-2026-10-05.md` §3). 6.60.0 (`grill-griller-trim`) cut 188,978 → 141,332 B. The
selection half was measured this run (record below) and rejected at GATE 1. `/pharn-dev-grill` still reads all 13
griller files whole (`count-grillers.mjs` listing, Step 2b), 188,978 B per dev grill: the trim's named follow-up.

## Where the bytes are (re-measured this run)

Share of the 141,332 B the extract prints today, summed over the 13 grillers: `## Procedure` 20.4% · the preamble
before the first `##` 20.3% · `### Layer 2` 16.4% · `### Layer 1` 15.9% (22,444 B) · `## Finding output` 9.8%
(13,873 B) · `## The two layers` intro 6.2% (8,761 B) · `## What it enforces` 4.7% · frontmatter 3.4%.

## Per-griller content audit — what each omitted section holds (read in full, every griller)

Each paragraph classified: **M** membership mechanics (the grill command and `count-grillers.mjs` own it), **S**
scanner invocation and output schema (replaced by `grill-scan.mjs`), **F** floor/eval/sizing rationale for
maintainers (`finding_count`, `check-structural`, "two clocks", injection-immunity argument), **D** restated in a
kept section of the same griller, **U** griller-specific, needed at grill time, and found nowhere kept.

### `### Layer 1`

| griller        | bytes | holds                                                                                                          | U content (needed at grill time, nowhere else)                                                                                                                                                                                                | design                                                                          |
| -------------- | ----: | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| architecture   |   497 | M                                                                                                              | none                                                                                                                                                                                                                                          | omit                                                                            |
| comprehension  |   513 | M                                                                                                              | none                                                                                                                                                                                                                                          | omit                                                                            |
| coupling       |   705 | M                                                                                                              | none                                                                                                                                                                                                                                          | omit                                                                            |
| performance    |   507 | M                                                                                                              | none                                                                                                                                                                                                                                          | omit                                                                            |
| security       | 2,257 | M, S, F; "for each hit, one finding, line from scanner" D (Procedure 2); "does not decide live vs placeholder" | none: the precision bound is carried by `grill-scan.mjs`'s fixed `problem` ("a secret-**shaped** literal")                                                                                                                                    | omit                                                                            |
| migrations     | 2,799 | M, S, F; "evidence, never an auto-pass" D (Procedure 1, 6)                                                     | none                                                                                                                                                                                                                                          | omit                                                                            |
| observability  | 2,842 | M, S, F; "evidence, never an auto-pass" D (Procedure 1, 6)                                                     | none                                                                                                                                                                                                                                          | omit                                                                            |
| privacy        | 2,503 | M, S, F; per-hit rule D; "real PII vs placeholder" carried by "PII-**shaped**"                                 | "biased to well-known shapes + snake_case/SQL fields; misses camelCase variants and phone/date literals (covered only as field NAMES)": a RECALL bound that steers Layer 2                                                                    | move that sentence into `### Layer 2`, subject named ("The PII scanner …")      |
| i18n           | 3,568 | M, S, F; "misses bare assignment / concatenation / template literal" D (Layer 2)                               | "also fires on markup the plan merely QUOTES illustratively … weigh build vs document": a precision caveat `grill-scan.mjs`'s `problem` ("a hardcoded user-facing string") does NOT carry                                                     | move that sentence into `### Layer 2`, subject named                            |
| a11y           | 1,719 | M, F; then the presence block                                                                                  | what counts as a declaration (`## Accessibility` / `## a11y`, or keyboard/ARIA/contrast/semantic-HTML/screen-reader consideration) and "an empty one" counts as absent; Procedure's example omits semantic-HTML, `## a11y` and the empty case | insert a `### Presence — …` heading before the presence block (no text moves)   |
| documentation  | 1,472 | M, F; then the presence block                                                                                  | "update README/docs/JSDoc/comments"; an empty declaration is absent                                                                                                                                                                           | same heading insert                                                             |
| error-handling | 1,408 | M, F; then the presence block                                                                                  | "a section, or an explicit failure/edge/timeout consideration"; an empty declaration is absent                                                                                                                                                | same heading insert                                                             |
| testability    | 1,654 | presence block first, then F ("Why this is the floor-demonstrable layer …")                                    | "a declared verification / eval / test / acceptance section carrying real content"; an empty one is absent                                                                                                                                    | move the F paragraph up under the Layer 1 heading, then the same heading insert |

The "Absent → one finding `rule_id`; Present → none, say so in prose" bullets in the four presence grillers are D
(Procedure steps 2–4) and stay inside the kept `### Presence` section anyway.

### `## Finding output` (13,873 B) — lossless for 13 of 13

- **`rule_id` and `severity`:** the YAML template's values are restated in the same griller's `## Procedure` for 13/13
  (measured by a scratch script: P1 testability; P3 architecture, coupling; P6 observability; P2 security, privacy; P7
  the other seven; `important` everywhere). The build turns this into a pinned test (below).
- **`file` / `problem` / `evidence` rules** (title line for a whole-document absence, the scanner's line for a hit,
  never a comment or fence line, "secret may be redacted", comprehension's "the WHY the next maintainer cannot
  infer"): each is restated in that griller's Procedure (read for all 13).
- **The closing paragraph** ("the injected comment is confined to the free-text fields … grillers never gate"): the
  same for every griller, and both grill commands carry it in their own `## Finding output` section and their
  "Grillers gate nothing" bullet.

### `## The two layers` intro (8,761 B) — lossless for 13 of 13 (Q1, approved)

All 13 intros size the griller's floor against its siblings ("sits with testability, NOT security", "do not inflate
the floor"). That is F. The two lines that look like guidance are D: comprehension's "present but useless / absent but
unnecessary" (Procedure 3–4) and migrations/observability's "the concern is absence" (Procedure 3).

**Achievable, stated:** R2 as sketched drops six U passages. With the six edits (Q2, approved) it is lossless by this
audit, which is a reading (advisory) backed by two pinned tests (rule_id/severity restatement; the moved passages
present in the extract). The rejected alternative, keeping `### Layer 1` whole for those six grillers, saved −17.0%.

## Design (R2)

1. **Full mode runs the deterministic scans once (`pharn-grill.md` Step 3b, first bullet).** Pin the line
   `--floor-only` already pins: `node pharn/floor/grill-scan.mjs pharn/features/<name>/PLAN.md`. Exit 0: copy its stdout
   **verbatim** into `GRILL.md`. Its `FINDING` objects ARE the security, privacy and i18n scanner-hit findings (rule_id
   and severity from `GRILL_SCANS`, which match each griller's Procedure; `file` = the scanner's line). Its mention
   lines ARE the migrations and observability scanner evidence. A griller step that says to run its `scan-plan-*`
   scanner, or to emit one finding per hit, is satisfied by this section: never emit a second finding for a hit it
   already reports (a separate Layer-2 concern about the same line is a separate finding). Any other exit: write
   `scans: NOT run (grill-scan.mjs exit <n>)` and take the whole-file path for the grillers (bullet 2's fallback),
   because the extract no longer carries the scanner instructions.
2. **Load the grillers as today:** `node pharn/floor/griller-extract.mjs .`, unchanged line, unchanged fallback (any
   other exit → read every file `count-grillers.mjs` lists in full, record
   `grillers: extract NOT run (griller-extract.mjs exit <n>)`). The Step 3b sentence says what is left out now, and
   for which `kind` (the wording below). It gives the measured bytes, and says that choosing grillers per plan was
   measured and rejected from scanner hits, from the project's archetype and from the plan's `## Files` paths. It
   cites the CLI header for both (the R0 correction).
3. **`griller-extract.mjs`.** `OMITTED_SECTIONS` members gain a `level` and a closed `scope` (`all` | `pharn-owned`):
   `guarantee-audit` (2, all), `machine-readable-emission` (2, all), `two-layers` (2, pharn-owned), `layer-1`
   (3, pharn-owned), `finding-output` (2, pharn-owned). START: a column-0 line of exactly `level` `#` characters and a
   space, outside any fence, whose text starts with the prefix (so `## Layer 1`, `#### Layer 1`, an indented heading
   and `### Finding output` are kept), for a member whose `scope` the griller's kind admits (the gate below). END, the
   fences, the setext rule and the three keep-whole constructs are unchanged. The header is re-derived, not carried
   (L25): the new members and their scope, the kind gate and its residual, the numbers, the Presence convention, and
   the R0 wording (four selection candidates measured and rejected, cited to this feature's `MEASUREMENTS.md`).
4. **Six griller edits, nothing reworded but two subjects:** heading inserts in a11y, documentation, error-handling,
   testability (+ the testability paragraph moved up); one sentence moved from Layer 1 to Layer 2 in i18n and privacy,
   "It" → "The hardcoded-string scanner" / "The PII scanner". The other seven grillers are not edited.
5. **`grill-scan.mjs` wording becomes true in both modes (L39).** Two readers consume its section now: `--floor-only`,
   where no judgment ran, and full mode, where it runs after. The heading drops "`--floor-only`, "; "the grillers'
   judgment and the plan interrogation did not run" becomes "a scanner finding is not the griller's judgment"; each
   mention line drops ", which did not run". The floor-only `GRILL.md` keeps saying no judgment ran, through its own
   pinned `interrogation NOT performed — skipped by mode (floor-only)` line. No shape, token or exit code changes.
6. **`GRILL.md`, full mode (Step 4):** gains the scan section (or the `scans: NOT run` line) after the `skills:` and
   `grillers:` lines. Its findings count in the `ADVISORY VERDICT` tally like any other finding; the floor results stay
   in the header.
7. **`/pharn-dev-grill` (folded in).** Step 2b pins `node pharn/floor/grill-scan.mjs .dev/features/<name>/PLAN.md`
   then `node pharn/floor/griller-extract.mjs .`, with the same exit mapping and whole-file fallback, keeping its
   `count-grillers.mjs` explanation for the fallback. Step 3's `GRILL.md` gains the scan section and the `grillers:`
   line. `reads:` gains both CLIs; `version:` bumps. This copy-pair's obligations are pinned for both commands (L31).
8. **The deeper omission is gated on `kind: pharn-owned`** (the human's GATE 1 choice), next section.

## The `kind: pharn-owned` gate

- **How the kind is read.** `trimGriller` already slices the frontmatter: `---` at byte 0, closed at the next
  `\n---`, the same delimiting `count-grillers.mjs` uses. A new pure helper `frontmatterKind(text)` reads only that
  slice. It collects every column-0 line matching `^kind:[ \t]*(.*?)[ \t\r]*$`, strips one matching pair of `"` or `'`,
  and returns a closed result: `pharn-owned` exactly (case-sensitive) when there is exactly one `kind:` line with that
  value; else a closed reason, `kind-missing` (no frontmatter, unclosed frontmatter, or no `kind:` line),
  `kind-ambiguous` (two or more `kind:` lines) or `kind-other` (any other value, `community` and `vendor-official`
  included, as well as `Pharn-Owned` and `pharn-owned # note`). L6: a structured field read from its structured
  location, never a body grep. `trimGriller` calls it itself, so no caller can pass the wrong flag. Its result joins
  the return value (`deep: true | <reason>`).
- **Fail direction.** Only the one exact, unambiguous `pharn-owned` admits the `pharn-owned`-scoped members. Every
  other outcome keeps the intro, `### Layer 1` and `## Finding output` and drops only the two `all`-scoped sections. A
  file the extract cannot read is still refused (exit 2 → the command's whole-file fallback), unchanged.
- **The record.** The summary line on stdout line 1 (the `grillers:` line GRILL.md copies) gains
  `deep omission: <n> pharn-owned, <m> other`, and names each other griller by path with its closed reason token,
  never the kind value itself. That keeps frontmatter text out of the line (P2), and the tokens form a closed set the
  tests check for closure (L36). Each BEGIN frame keeps listing the section ids actually left out.
- **Bytes.** All 13 committed grillers declare `kind: pharn-owned` (checked: 13 of 13 exact lines), so every figure
  in this plan stands as measured.
- **Wording.** In Step 3b, `/pharn-dev-grill` Step 2b and the CHANGELOG: "Every registered griller still runs. A
  griller whose frontmatter says `kind: pharn-owned` loads without `## The two layers`, `### Layer 1`,
  `## Finding output`, `## Guarantee audit` and `## Machine-readable emission`. Any other griller, or one whose `kind`
  is missing or unreadable, loses only the last two, as since 6.60.0."
- **Residual, restated (P0).** `kind` is a self-declared frontmatter field, so the gate is a membership test over a
  declaration, not over who wrote the file.
  - A user-EDITED `pharn-owned` griller is still trimmed. `pharn update` keeps an edited file, and runtime text the user
    put under one of those three headings is dropped.
  - A community griller that declares `kind: pharn-owned` is trimmed too. `validate.mjs` checks `kind` membership and
    gates `seal`; nothing checks who authored a file that declares `pharn-owned`.
  - The audit and the lossless pins range over the 13 committed grillers only.

## The scanner-to-finding path in full mode, end to end

1. `grill-scan.mjs` spawns the five `scan-plan-*` scanners over the PLAN, refuses any output outside each closed shape
   (exit 2, nothing printed), and prints one section: a fixed advisory sentence; a fenced YAML list with one
   `type: FINDING` per secrets/pii/i18n hit (`rule_id` P2/P2/P7, `severity: important`, `file:
"pharn/features/<name>/PLAN.md:<line>"`, a fixed `problem` naming the scanner, `evidence` naming the closed `kind`
   and line; no plan text copied); or `Findings: none (…)`; then one plain line each for migrations and observability
   (`mentions true|false — lines <n> (<term>)`).
2. Step 3b copies that section verbatim into `GRILL.md`.
3. Each griller then runs from the extract. security/privacy/i18n: step 2 ("per hit, one finding") is already done by
   the section; their Layer 2 judgment adds its own findings. migrations/observability: step 1's `{mentions, hits}`
   are the mention lines; steps 2–6 judge them, never as an auto-pass.
4. The verdict line counts every finding, scan section included.

Measured over the corpora: the section adds 678 B on average to a full grill's context (median 627, max 1,881 over
290 pharn-oss plans; mean 819 over 128 pharn-starter plans).

## The extract's markdown model for `###` (L55/L56)

A scratch prototype of the new rule (`.pharn/pharn-dev-plan/probe-r2.mjs`) was compared with markdown-it 15.0.1
(a transitive devDependency, so not pinned as a test, as in 6.60.0). The reference is: heading tokens whose level and
text match a member, from that heading to the next heading token of any level.

- **The 13 committed grillers:** 0 over-dropped, 0 under-dropped non-blank lines, under both member sets.
- **19 adversarial inputs:**
  - a member heading inside a backtick, tilde or 4-backtick fence;
  - a fence inside Layer 1 holding a `### Layer 2` line;
  - a `####` heading inside Layer 1;
  - closing hashes, and `###Layer 1` with no space;
  - an indented `###`, and one in a list item or a blockquote;
  - `## Layer 1`, `#### Layer 1` and `### Finding output` (wrong levels);
  - a heading that interrupts a paragraph, a setext heading after Layer 1, and a thematic break after a blank line;
  - the `## The two layers` → `### Layer 1` chain, and the `## Finding output` → `## Machine-readable emission` →
    `## Guarantee audit` chain;
  - CRLF.

  Result: 0 over-drops. Under-drops occur only in the safe direction (more kept): an indented, list-item or blockquote
  `###`, and the text after a `---` thematic break inside Layer 1.

The build re-runs this probe against the SHIPPED `trimGriller`, not the prototype, and records the result in
`MEASUREMENTS.md` (L56: a fix needs the probe again).

## Bytes (measured this run; the build re-measures from the shipped CLI)

| griller        |       files | extract today | R2 without the intro | PLANNED: R2 + intro |
| -------------- | ----------: | ------------: | -------------------: | ------------------: |
| a11y           |      16,106 |        12,520 |               10,397 |               9,709 |
| architecture   |      10,026 |         7,717 |                6,148 |               5,568 |
| comprehension  |      16,565 |        13,432 |               11,787 |              10,998 |
| coupling       |      13,617 |        10,759 |                9,157 |               8,583 |
| documentation  |      15,121 |        11,614 |                9,713 |               9,027 |
| error-handling |      12,971 |         9,691 |                7,810 |               7,150 |
| i18n           |      17,384 |        13,588 |                9,294 |               8,335 |
| migrations     |      20,324 |        13,799 |                9,913 |               9,095 |
| observability  |      18,881 |        12,470 |                8,546 |               7,890 |
| performance    |      12,307 |         9,229 |                7,642 |               7,084 |
| privacy        |      13,434 |        10,084 |                6,738 |               6,004 |
| security       |      13,338 |         9,724 |                6,387 |               5,554 |
| testability    |       8,904 |         6,705 |                4,665 |               4,439 |
| **total**      | **188,978** |   **141,332** |          **108,197** |          **99,436** |

The R2 columns include the six edits (files become 189,236 B: +258 B of inserted headings). All 13 are
`kind: pharn-owned`, so the kind gate moves none of these numbers. A griller of another kind would print its 6.60.0
extract.

| context                          | today                 | PLANNED         |
| -------------------------------- | --------------------- | --------------- |
| full `/pharn-grill` griller text | 141,332               | 99,436 (−29.6%) |
| plus the scan section (mean)     | 0                     | +678 / +819     |
| `/pharn-dev-grill`               | 188,978 (whole files) | 99,436 (−47.4%) |

For the record: as sketched, without the edits, the total would be 105,028 B without the intro, losing the six U
passages. The rejected Q2 alternative was about 117,350 B (−17.0%).

Token effect, estimated (bytes/4, `LIMITS.md §1c`), not measured: −41.9 KB ≈ 10.5k tokens on each request after the
load. Over a 41-request grill (≈14.9M context tokens, estimated from its measured first and largest contexts), and
assuming ~35 requests after the load, that is ≈365k tokens, about 2.5%. No run is measured here.

## Tests that pin the omitted set, and how each changes

- **`pharn/floor/griller-extract.test.mjs`:**
  - The closed-set test: five frozen members with distinct ids, a `level` ∈ {2, 3} and a `scope` ∈ {`all`,
    `pharn-owned`}; exactly `guarantee-audit` and `machine-readable-emission` are `all`.
  - New ★ kind-gate cases (hermetic fixtures inline in the test, as the 6.60.0 cases are). A griller with
    `kind: community` keeps `## The two layers`, `### Layer 1` and `## Finding output` and still loses
    `## Guarantee audit` and `## Machine-readable emission`. So does each of these: no `kind:` line
    (`kind-missing`), two `kind:` lines (`kind-ambiguous`), `kind: Pharn-Owned` (`kind-other`), and no or unclosed
    frontmatter. `kind: "pharn-owned"` (quoted) loses all five. The summary line's reason tokens form a closed set
    (L36), and the kind value is never printed.
  - New ★ CLI case: a scratch repo holding one `pharn-owned` and one `community` griller prints
    `deep omission: 1 pharn-owned, 1 other`, with the community griller's three sections present in its frame.
  - The ★ GATE-1 pin becomes closure (L36): every member matches a heading of its level in every committed griller,
    and the dropped lines are exactly the members' sections. `### Layer 2`, `### Presence`, `## Procedure` and the rest
    are never touched.
  - Its discrimination test: a renamed `### Layer 1` fails, and a rule that also drops `### Layer 2` fails.
  - New ★ level-exactness cases, fence and chain cases for `###`.
  - New ★ lossless pins over the committed grillers:
    - the Finding output's `rule_id:` / `severity:` values occur in the same griller's Procedure (L43: this certifies
      that the two agree, not that either value is right);
    - the four presence grillers keep a `### Presence` section;
    - the two moved sentences appear in the extract output.
  - The CLI test's summary-line counts.
  - The no-argument default test stays (L41).
- **`pharn/floor/grill-scan.test.mjs`:** add a case that the section says neither "did not run" nor "--floor-only"
  (mode-neutral, L39); its existing `^## Deterministic plan scans` and "Not a finding" pins still hold.
- **`.dev/floor/command-hygiene.test.mjs`:**
  - The `grillerExtractReasons` sentence pin moves to the new Step 3b sentence, `kind: pharn-owned` clause included.
    The extract line and its fallback literal are unchanged.
  - New pin: Step 3b pins the grill-scan line BEFORE the extract line, with the `scans: NOT run` literal and "never
    emit a second finding".
  - New dev-twin pin: `pharn-dev-grill.md` pins its grill-scan and extract lines and both fallbacks (L31).
  - Each pin gets a removal control (L60).
  - `COMMAND_BYTE_CEILINGS["pharn-grill.md"]` (26,624) is raised by the stated rule only if the measured bytes exceed
    it (23,796 today + ~1.2 KB expected).
- **`.dev/floor/stage-load-budget.test.mjs`:** unchanged. It sums each griller file whole (+258 B) and the command;
  the grill row stays under 285,184. Its `258,995 — 13 grillers (188,978)` comment is the measurement at the ceiling's
  time, not a live figure.
- **The `/pharn-loop` grant derivation:** unchanged. Step 3b's grill-scan line is byte-identical to the one already
  pinned, and the extract line does not change, so the derived grant set does not move; the build confirms with the
  `loop-no-prompts` test.
- **`validate.mjs`:** the six edited grillers keep their frontmatter, `enforces` and evals, and must stay GREEN.

Mutation controls (L60), run once at build in scratch and recorded; each must be killed by a named test:

- level check off;
- an indented `###` accepted;
- the `layer-1` prefix widened to `Layer`;
- END ignoring `###`;
- `### Presence` dropped;
- a Finding-output `rule_id` changed;
- fence tracking off for `###`;
- the kind check forced true (killed by the `kind: community` fixture);
- the kind check forced false (killed by the committed-grillers closure pin);
- the last of two `kind:` lines taken (killed by the `kind-ambiguous` fixture);
- the kind compared case-insensitively (killed by the `Pharn-Owned` fixture).

## Selection record (kept from the superseded plan; goes to `MEASUREMENTS.md`)

Runtime selection was measured and rejected.

- **Corpora:**
  - 226 pharn-oss dev grills;
  - 110 full grills in pharn-starter (`/Users/pgalarowicz/Projects/pharn-starter`, HEAD `33a4f7d`, archetypes
    `ssr, backend`, 13 grillers installed).
- **A, archetype at runtime:** 0 B in every one of 5 installs, because the installer already selects and records
  archetypes. In this `lib`-shaped repo it would save −28.2% but lose 15 migrations findings on 11 plans.
- **B, `## Files` path classes:**
  - i18n loses 1 finding in starter, and migrations 14 on 10 pharn-oss plans.
  - Only a11y lost nothing (0 over 30 + 209 skips). Its corpus mean is −2.4% with a strict UI class, −1.4% wide and
    −0.24% when any JS/TS file counts as UI.
- **C, A and B combined:** in an install it reduces to B.
- **D, one subagent per griller:** at least 13 × 68k ≈ 0.9M prefix tokens, against ≈35k tokens of griller text.

The `migrations` evidence feeds the follow-up below.

## Applied lessons

- L1 — `CHANGELOG.md` (a new `## [6.63.0]` section), `SKILLS_VERSION` and the `README.md` badge are in `## Files`; the
  generated regions are checked (`npm run docs:check`), not edited, because the catalog renders frontmatter and the H1
  tagline only and no floor file is added.
- L6 — griller membership stays `count-grillers.mjs`'s (frontmatter). The kind gate reads `kind:` from the same
  frontmatter slice, never from the body. The omission and the new pins read headings outside fences and the
  Finding-output YAML's enum fields, never prose.
- L22 — every new invocation is a pinned line (grill-scan in Step 3b of both grill commands); no step describes a
  shell technique in prose.
- L25 — the griller-extract header and the Step 3b sentence are re-derived from this run's measurement, not carried:
  the 6.60.0 numbers and "only two sections" are replaced, not appended to.
- L29 — `OMITTED_SECTIONS` stays one exported closed set that every test iterates; the per-griller audit above is the
  enumeration the lossless claim ranges over.
- L31 — `/pharn-grill` and `/pharn-dev-grill` are a deliberate copy-pair; the obligation (scan first, extract, the two
  fallbacks, the two `GRILL.md` lines) is pinned for both commands, the dev twin no longer left behind.
- L33 — the sweep found the live sites of the old omitted-set claims: `pharn-grill.md:234-235`,
  `command-hygiene.test.mjs:2495`, `griller-extract.mjs:5-50,68`, `griller-extract.test.mjs`, and
  `grill-scan.mjs:106-109,137` ("did not run").
- L34 — the zero-griller asserted silence keeps its test; the new lossless pins assert their domain is the 13
  committed grillers and fail on an empty one.
- L36 — the GATE-1 pin becomes a closure over dropped lines, so a member that also drops a neighbour fails, not only a
  missing member. The kind gate's reason tokens are also checked for closure.
- L39 — `grill-scan.mjs`'s section gets a second reader (full mode); its text is reworded to be true for both, rather
  than adding a flag.
- L41 — the extract's no-argument default keeps its own test.
- L43 — the Finding-output pin is a consistency check between two places; it is labeled as certifying agreement,
  which is exactly the lossless claim, never the correctness of the values.
- L50 — the sweep ran by referent (the omitted-section set and `grill-scan`'s mode wording) as well as by phrase; the
  frozen records (CHANGELOG `[6.60.0]`, `.dev/features/grill-griller-trim/`, committed `GRILL.md` files) are not edited.
- L55 — the `###` rule was probed against markdown-it over the 13 committed grillers and 19 adversarial inputs before
  planning it.
- L56 — the build probes the shipped implementation again, including the stated safe-direction exceptions. In the fix
  round the reference no longer shares the rule's prefix predicate: it uses a literal list of the 65 committed heading
  texts and hand-written per-case oracles (F2).
- L60 — one negative control per asserted property (the mutants listed above), each killed by a named test.
- L64 — fix round: F3 corrects two CHANGELOG restatements that said more than the diff. The same pass re-checks every
  other restatement of the fix-round claims ("Checked by", "Not covered", the file bytes, the extract header) against
  the shipped code before hand-off.
- L69 — `measure.mjs` reproduces the selection record through `plan-files-core.mjs`'s `pathsFromPlanFiles`, never a
  hand-written `## Files` split.
- L71 — in that measurement a non-concrete `## Files` entry counts as "cannot decide, skip nothing".
- L72 — `griller-extract.mjs`'s summary line and `grill-scan.mjs`'s section text are consumed formats; `git grep` for
  "Deterministic plan scans", "did not run" and the summary's ids found only the tests named above and committed
  `GRILL.md` records (which stay as written).

## Files

Every path the whole PR writes, first round and fix round, so the fix round's re-anchored scope and the regress scope
check both see one complete list. The fix round writes the 13 grillers, the two extract files, `CHANGELOG.md`, and
the two measurement files. The other entries were written in the first round and are listed because the PR changed
them.

- `pharn/floor/griller-extract.mjs` — `OMITTED_SECTIONS` with `level`, `scope` and the three new members; the
  level-exact START; `frontmatterKind` and the `kind: pharn-owned` gate; the summary line's `deep omission:` record;
  the re-derived header (bytes, the Presence convention, the gate and its residual, the R0 selection correction).
  Fix round: the whole-word boundary in `omittedId` (F2); the header's convention paragraph and file bytes re-derived
  (F1, L25). — layer: product floor
- `pharn/floor/griller-extract.test.mjs` — the changes listed above, including the kind-gate fixtures (inline, no new
  fixture file). Fix round: the F1 authoring-rule closure, extract-absence and member-coverage tests with their
  negative controls; the F2 near-miss case. — layer: product floor (tests never ship)
- `pharn/floor/grill-scan.mjs` — the mode-neutral section wording. — layer: product floor
- `pharn/floor/grill-scan.test.mjs` — the mode-neutral wording case. — layer: product floor (tests never ship)
- `pharn/pharn-pipeline/grillers/a11y/a11y.md` — insert the `### Presence` heading; fix round: the F1 sentence.
  — layer: pharn-pipeline
- `pharn/pharn-pipeline/grillers/documentation/documentation.md` — insert the `### Presence` heading; fix round: the F1
  sentence. — layer: pharn-pipeline
- `pharn/pharn-pipeline/grillers/error-handling/error-handling.md` — insert the `### Presence` heading; fix round: the
  F1 sentence. — layer: pharn-pipeline
- `pharn/pharn-pipeline/grillers/testability/testability.md` — move the floor paragraph up; insert the `### Presence`
  heading; fix round: the F1 sentence. — layer: pharn-pipeline
- `pharn/pharn-pipeline/grillers/i18n/i18n.md` — move the illustrative-markup sentence into `### Layer 2`; fix round:
  the F1 sentence. — layer: pharn-pipeline
- `pharn/pharn-pipeline/grillers/privacy/privacy.md` — move the scanner-recall sentence into `### Layer 2`; fix round:
  the F1 sentence. — layer: pharn-pipeline
- `pharn/pharn-pipeline/grillers/architecture/architecture.md` — fix round: the F1 sentence only. — layer:
  pharn-pipeline
- `pharn/pharn-pipeline/grillers/comprehension/comprehension.md` — fix round: the F1 sentence only. — layer:
  pharn-pipeline
- `pharn/pharn-pipeline/grillers/coupling/coupling.md` — fix round: the F1 sentence only. — layer: pharn-pipeline
- `pharn/pharn-pipeline/grillers/migrations/migrations.md` — fix round: the F1 sentence only (its `applies` stays,
  follow-up `migrations-applies-universal`). — layer: pharn-pipeline
- `pharn/pharn-pipeline/grillers/observability/observability.md` — fix round: the F1 sentence only. — layer:
  pharn-pipeline
- `pharn/pharn-pipeline/grillers/performance/performance.md` — fix round: the F1 sentence only. — layer:
  pharn-pipeline
- `pharn/pharn-pipeline/grillers/security/security.md` — fix round: the F1 sentence only. — layer: pharn-pipeline
- `.claude/commands/pharn-grill.md` — Step 3b (grill-scan first, the rule against a second per-hit finding, the
  whole-file fallback when grill-scan fails, the re-derived omission sentence with its `kind: pharn-owned` clause, the
  selection cite), Step 4 (the scan section), the claims block, `version:` 0.4.0 → 0.5.0. — layer: product command
- `.claude/commands/pharn-dev-grill.md` — Step 2b (grill-scan + extract, the same wording and fallbacks), Step 3
  (`GRILL.md` lines), `reads:`, `version:`. — layer: build apparatus
- `.dev/floor/command-hygiene.test.mjs` — the pins listed above. — layer: build apparatus
- `.dev/features/grill-griller-slim/measure.mjs` — NEW. Reproduces every number here: section shares, the per-griller
  audit's byte and restatement columns, extract bytes per griller, scan-section bytes, and the selection record
  (A–D) over the corpus roots given. Read-only. Fix round, if the build reproduces F1's 0-byte check here: one more
  read-only check. — layer: build apparatus
- `.dev/features/grill-griller-slim/MEASUREMENTS.md` — NEW. The tables above re-run from the shipped CLI, the
  markdown-it probe results against the shipped code, the mutation-control results, the selection record with
  pharn-starter's path and commit, and the named follow-ups. Fix round adds a section with:
  - the new griller-file bytes;
  - the F1 0-byte check;
  - the F2 near-miss result before and after;
  - the independent-reference re-probe, including the literal list of the 65 heading texts;
  - the new mutants. — layer: build apparatus
- `SKILLS_VERSION` — 6.62.0 → 6.63.0 (minor: a changed stage behaviour: the full grill runs the deterministic scans and
  loads a smaller extract; renumber by diff if `main` moves). First round; the fix round keeps 6.63.0. — layer: repo
  meta
- `README.md` — the version badge only. First round. — layer: repo meta
- `CHANGELOG.md` — one new `## [6.63.0]` section. It states the per-kind omission in the wording above, the measured
  bytes, the full-mode scan section, the dev-grill fold-in, the selection measured and rejected, the residual (a
  user-edited or self-declared `pharn-owned` griller is trimmed), and the follow-ups. Fix round, editing that unmerged
  entry:
  - F3's two phrasings;
  - an item for F1's sentence and an item for F2's boundary, which also fixes the two 6.60.0 members;
  - the restatements swept (L64): "Checked by", "Not covered", the file bytes. — layer: repo meta

### Not changed (stated, so their absence is a decision)

- `pharn/pharn-pipeline/grillers/migrations/migrations.md` `applies` — follow-up `migrations-applies-universal`.
- `count-grillers.mjs`; the `scan-plan-*` scanners. The fix round also does not change `grill-scan.mjs`, either grill
  command, `command-hygiene.test.mjs`, `SKILLS_VERSION` or `README.md`.
- `.claude/commands/pharn-loop.md`, `pharn-ship.md`, `pharn-ship-quick.md`, `pharn-loop-quick.md`.
- `.dev/floor/stage-load-budget.test.mjs`; `.dev/guides/*.md`. No floor guide section exists for `griller-extract`
  or `grill-scan` (none was added at 6.60.0 either); none is added here (P7).
- `docs/capabilities/**` and the README `## Current state` region (no rendered input changes; `docs:check` proves it).
- The four trusted docs.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — unchanged; `grill-scan.mjs` already emits it. No contract shape changes;
  no `MIN_CLI` change (`.dev/guides/versioning.md`: nothing an older CLI would install broken).

## Evals to write (P1)

- None new: no capability is added and no `enforces` changes. The six edited grillers keep their committed eval
  cases; `validate.mjs` GREEN and the existing eval pairs (`check-structural.mjs` at verify) cover them.

## Guarantee audit (P0)

- "Every registered griller runs in a full grill" → membership floor (`count-grillers.mjs`); printing floor
  (`griller-extract.mjs`); applying each is advisory.
- "The extract omits exactly these sections" → floor: enum/regex (closed set, level-exact heading test), pinned by
  the closure test over the committed grillers.
- "Only a `kind: pharn-owned` griller loses the three deeper sections" → floor: enum equality over one frontmatter
  line (primitive #3), failing toward keeping. NOT a claim about who wrote the griller: `kind` is self-declared (the
  residual above).
- "Nothing griller-specific is lost" → advisory: a reading of 13 grillers. It is backstopped by enum/regex pins on two
  points: (a) Finding-output `rule_id`/`severity` are restated in the Procedure; (b) the moved passages are in the
  extract. A griller of another kind keeps those sections. Nothing pins the claim for a user-edited or self-declared
  `pharn-owned` griller.
- "A member heading matches only as a whole word" (fix round, F2) → floor: regex (prefix, then end of text, a space
  or a tab), pinned by the near-miss case and its mutants.
- "Each committed `pharn-owned` griller states the authoring rule in its intro, at 0 grill bytes" (fix round, F1) →
  floor at test time: a substring closure over this repo's registered grillers, and an absence check over the extract.
  Advisory: that an author reads it. Nothing checks a griller outside this repo.
- "The scanner-hit findings come from the floor" → floor: the scanners' verdicts and `grill-scan.mjs`'s shape checks
  (regex). Copying the section verbatim, and not emitting a second finding, is advisory orchestration.
- Byte figures → measured; token figures → estimates (bytes/4).

## Trust audit (P2)

- `grill-scan.mjs` copies no plan text: closed tokens, line numbers and fixed sentences, so its section is safe to
  paste verbatim. The plan stays `trust: untrusted`. The griller extract is trusted capability text, framed as
  before. The moved sentences carry no plan-derived content.

## Determinism audit (P5)

- Omission is a regex membership test over heading lines, and its depth is an enum test over the frontmatter `kind`;
  every undecidable kind keeps the sections. Every fallback is the whole-file read; no branch guesses.

## Follow-ups (named, not built)

- `migrations-applies-universal` (GATE 1: separate increment): evidence is 15 migrations-axis findings on 11 of 226
  `lib`-shaped plans; the two `lib` installs lack the griller.
- `griller-body-slim`: the preamble (20.3%) and the Layer-2 "REJECTED floor candidate" blockquotes are maintainer
  rationale too. Deciding what a grill does not need there is a per-griller reading, like this one.
- `pharn/ARCHITECTURE.md` §5's archetype wording no longer matches the live tree (detection is the installer's, over
  `package.json` and the file tree). Human-only, pre-existing.
- Deferred at GATE 2 (review findings, `REVIEW.md`):
  - **finding 4**, `scan-section-findings-heading`: a pinned heading in Step 4 between the copied scan section and the
    model's judgment findings;
  - **finding 5**, `dev-grill-floor-list`: `/pharn-dev-grill`'s list of floor-grade things in a run omits the
    grill-scan verdicts (dev apparatus);
  - **finding 6**, with `griller-body-slim`: the kept Procedure text that still says "(Layer 1)" and "as Layer 1
    states", and testability's "the Layer-1 presence finding";
  - **finding 7**, `extract-form-eval`: an eval of the extract form, built only if a real miss triggers it (P7).
- `walkers-skip-pharn-scratch` (the builder's observation at GATE 2): `count-grillers.mjs` and `validate.mjs` count
  scratch copies of grillers left under `.pharn/` (for example a mutation runner's throwaway copies), so a run there
  reports inflated counts.

## Open questions (HALT)

- GATE 2 fix round: none open. The scope (F1–F3), the deferrals and the version were set by the human at GATE 2 (see
  "GATE 2 record").
- GATE 1: none open. All four were resolved by the human at GATE 1 (second round), and the `kind: pharn-owned` gate was added
  there (see "GATE 1 record"):
  - Q1: omit the intro too, yes.
  - Q2: the six griller edits.
  - Q3: reword `grill-scan.mjs`.
  - Q4: a `grill-scan.mjs` failure reads the grillers in full.
