# PLAN — spec-pin-kind-ambiguity

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L1, L35, L37, L47, L52]
- increment: close the `spec_kind` pin ambiguity — a SPEC body whose first line starts `spec_kind:` pins exactly like that line in the frontmatter, so a feature SPEC can flip to bootstrap (and back) without its pin moving; make that layout RED in `check-spec.mjs` for every SPEC and UNUSABLE in every AC-mode reading, moving no existing pin
- layer(s): product floor (`pharn/floor/`), pharn-contracts (`spec-template.md`, `ac-tests.md`), product command (`pharn-spec`), repo-meta (CHANGELOG, README badge, SKILLS_VERSION)
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Why (the finding, CONFIRMED by a repro run this session)

`pharn/floor/check-spec.mjs` `pinHash` (6.18.0, `927cd6b`; unchanged at base `22f002a`) hashes each frontmatter line
starting `spec_kind:` plus `"\n"`, then the body, with no separator. The body starts right after the closing `---`
line (`frontmatter-core.mjs` `FM_RE`). So these two SPECs hash identically:

- **A** — an Approved **feature** SPEC (no `spec_kind:` frontmatter line) whose body's first line is
  `spec_kind: test-infra`;
- **B** — the same SPEC with that line moved into the frontmatter, i.e. a **test-infra** SPEC.

Measured on the base with `SP/angleB/repro/pin-collision.mjs`: A is `check-spec` exit 0 and `check-ac-tests --spec`
exit 0 (TEMPLATED); B is `check-spec` exit 0, `check-spec-approved` exit 0, same pin: `true`, and `--spec` exit
**4** (BOOTSTRAP). `SP/review/a2/pin/{A.approved,B.flipped}.md` reproduce the same with `specVerdict`
(TEMPLATED → BOOTSTRAP). The reverse move (B → A: the frontmatter line moved to body line 1) collides too. That is
the flip-without-re-approval the 6.18.0 pin change (its grill G2) was added to catch, and it falsifies two shipped
sentences: `spec-template.md` ("Adding, changing or removing the line after approval is **drift** — RED at every stage
that checks the chain") and `ac-tests.md` ("an Approved feature SPEC cannot become a bootstrap one without the pin
moving"). Realistic path: a model writing the key just below the closing `---`. `/pharn-loop` refuses a bootstrap
SPEC, so the exposure is `/pharn-ship` and the standalone stages. Severity: low.

## Design decisions

### D1 — forbid the ambiguous layout; do not change the hash

A SPEC whose body's **first line** starts `spec_kind:` is RED in `check-spec.mjs` validation, for **every** SPEC
(Draft and Approved, templated and legacy). `pinHash`, `bodyHash`, `--hash`, `--state` and `--spec-id` are
**byte-unchanged**, so **no pin moves**.

**Why this closes the collision (the argument the tests execute).** The hashed string is `K + B`, where `K` is the
frontmatter's `spec_kind:` lines, each ending in `"\n"` and containing no other `"\n"` (`specKindLines` splits on
`"\n"`), and `B` is the LF-folded body. Read the string from the start: while it starts `spec_kind:`, the next line
(up to and including its `"\n"`) must be a kind line. Once `B` may not start `spec_kind:`, that reading stops
exactly at the boundary, so `(K, B)` is recovered uniquely from the string. Two SPECs that both pass validation and
share a pin therefore have the same kind lines **and** the same folded body: the kind cannot change unless the pin
does (short of a SHA-256 collision). Only the **first** body line is at issue. A `spec_kind:` line lower in the body
(after a blank line, say) cannot be taken for a kind line, because the reading has already stopped at the body's first
character. The tests show both halves: a lower line stays GREEN, and its pin differs from the frontmatter key's.

**Why every SPEC, not only a templated one.** The pin is computed the same way for every SPEC (the kind lines are
hashed whether or not `spec_template` is present), so the rule that makes it unambiguous must hold wherever the pin
does. A legacy SPEC's kind is never read (below), but `spec_template` sits **outside** the pin, so a legacy SPEC in
layout A becomes a templated one by adding a key the pin cannot see.

**The RED's kind is `pin`.** It enforces §6's pin contract (check-spec's own axis), not a template rule, so it is not
rule 8's `spec-kind`, which is template-only. The detail never echoes the line's value (P2). It names the remedy, and
it says plainly that the pin cannot tell the two layouts apart: move the line into the frontmatter (a `test-infra`
SPEC), or change the body's first line (a `feature` SPEC). An Approved SPEC must then be re-approved.

**D1a — alternative REJECTED: domain-separate the hash when kind lines exist** (a separator or length prefix
between `K` and `B`). It closes the collision without a new RED, but it **moves the pin of every SPEC that carries a
kind line**: every 6.18+ `test-infra` SPEC and every explicit `spec_kind: feature`. After `pharn update`, each such
Approved SPEC REDs as drifted, and each `AC-TESTS.lock.json` that recorded that pin goes `lock-red`. Existing
installs' artifacts stop validating, which is a **major** bump by CLAUDE.md's rules, all to fix a low-severity
finding. It would also leave a misplaced key silently a `feature` SPEC, where the RED surfaces the mistake at
`/pharn-spec` time. Rejected. Nothing in the chosen fix precludes a domain-separated pin in some later major.

### D2 — one predicate, one place (L35)

`spec-template-core.mjs` exports `kindLineOpensBody(body)`. It tests `SPEC_KIND_LINE_RE` against the body **after the
line-ending fold the pin applies** (`\r\n` → `\n`, as in `check-spec.mjs` `pinHash`; GATE-1 note 2). That is the
**same** regex `specKindLines` filters the frontmatter with (grill G9, "one reading"). It has no `m` flag, so it tests
only the body's first line. `check-spec.mjs` validation and `specAcceptanceCriteria` both call it with the raw body,
and the fold lives inside the predicate, so both callers test exactly the string the pin hashes after the kind lines.
`specAcceptanceCriteria` cannot import from a `check-*.mjs` CLI, which is why the fold sits in the predicate rather
than in a helper shared with `pinHash`; `pinHash` stays byte-unchanged. The fold cannot change this predicate's
answer (`spec_kind:` contains neither CR nor LF, so a leading match survives the fold both ways). It is applied anyway
so that the predicate reads the pinned string by construction, and a CRLF test pins that behaviour. Neither caller
holds a second copy of the pattern.

### D3 — every AC-mode reading of the kind agrees (fail-closed, through the one function)

`specAcceptanceCriteria` gains a boolean field `kindInBody` on **every** return: `kindLineOpensBody(body)` whenever a
frontmatter block exists, else `false`. For a **templated** SPEC where it is `true`, `kind` is `null`, the value
every consumer already treats as unusable. So the readings agree without per-consumer logic:

- `specVerdict` → `UNUSABLE` exit **2**, in the existing "invalid `spec_kind`" precedence slot, with its own line:
  `UNUSABLE — the SPEC's body opens with a \`spec_kind:\` line, which the approval pin cannot tell from the
  frontmatter key — run check-spec.mjs`. So`check-ac-tests.mjs --spec`prints it, and the AC gate (`ac-gate-core.mjs`,
which imports`specVerdict`) reads it as`INCONCLUSIVE`(existing branch, no edit).`check-test-stage.mjs`maps`--spec`exit 2 to`RED spec-unusable` (existing, no edit).
- `check-ac-tests.mjs` `checkMapping` → the existing `spec-kind` RED. Its detail branches on `kindInBody`, so it names
  the real cause rather than "not one of {feature, test-infra}".
- `ac-tests-lock.mjs` → `kind: null` already refuses `--write-bootstrap` and REDs a bootstrap `--check` (fail-closed;
  **not edited**, see "Not touched").

**Legacy stays first.** For a legacy SPEC, `specVerdict` still returns `LEGACY` 3, because the AC stages never read a
legacy SPEC's kind (it has no AC ids either way), so no mode can flip. `check-spec.mjs` still REDs that layout, and
`check-spec-approved.mjs` shells that validation, so `/pharn-plan`'s input gate (`check-spec-approved.mjs`) and the
chain check at grill/test/build/regress/verify (`check-plan-spec-agree.mjs`, which shells it) refuse it (GRILL
finding 3).

**Outcome for the two moves.** A → B was TEMPLATED 0 → BOOTSTRAP 4, both GREEN. It is now: A is RED at `check-spec`,
RED at `check-spec-approved`, and `--spec` UNUSABLE 2; B is unchanged (GREEN, 4). B → A was 4 → 0. It is now 4 → RED
and 2. Neither move goes from one usable reading to another.

### D4 — the three shipped docs that describe the kind/pin (L1 sweep)

- `pharn/pharn-contracts/spec-template.md` "`spec_kind`": one paragraph states the new rule, the reason (the pin
  cannot tell the two layouts apart), the RED kind, the `--spec` reading, and the bound (D5).
- `pharn/pharn-contracts/ac-tests.md`: the `spec-kind` table row and the `--spec` precedence sentence name the new
  cause. The "cannot become a bootstrap one without the pin moving" sentence gains the layout condition: it holds for a
  SPEC that passes `check-spec.mjs`, which since this release no SPEC in layout A does.
- `.claude/commands/pharn-spec.md`: Step 3's `spec_kind` bullet says the line goes **in the frontmatter**, never as
  the body's first line, and why. The floor list's item (4) names the RED. This is advisory prose where the key is
  written; the floor backstop is D1. Post-grill (GRILL finding 1, keeping the GATE-1 kind `pin`): the Draft step's
  list of RED kinds gains `pin` and `spec-kind`, and the re-validate step's `pin` branch splits on the checker's fixed
  detail. A hash mismatch means recompute the hash. The layout RED means the body is not approvable: back to Draft,
  return to Step 4.
- **The five "legacy is validated exactly as before" sentences** (GRILL finding 2), each amended to an open form (the
  template rules do not apply to a legacy SPEC; the pin, with its layout rule, does):
  `pharn/pharn-contracts/spec-template.md` (the legacy paragraph's "No rule here can RED it"), `pharn/floor/check-spec.mjs`'s
  header ("no new RED"), `.claude/commands/pharn-spec.md`'s floor list and frontmatter description, and
  `pharn/floor/README.md`.

Swept and **not** changed: `pharn/ARCHITECTURE.md` §6 ("optional `spec_kind` (hashed into the approval pin,
6.18.0)" stays true), `LIMITS.md`, `THREAT-MODEL.md`, `docs/` (no `spec_kind` claim), and
`CLAUDE.md` ("the PIN covers a spec_kind line … so flipping it after approval is drift" becomes true with this fix,
so no change is needed). No trusted-doc change is needed, so there are no PROTECTED-FOLLOWUPS.

### D5 — the bound, stated (L37, L47)

What the floor now covers: **a SPEC that passes `check-spec.mjs` cannot change its kind while keeping its pin**
(D1's argument, executed in both directions by the tests). What it does not cover:

1. A SPEC approved in layout A **before** this release REDs from now on. Its remedy (move the line, or reword it)
   keeps the pin in the move case, because that is the collision itself. So the re-approval the RED asks for is
   **advisory**: the floor makes the ambiguous layout unusable, and it cannot make the human re-approve.
2. Unchanged from 6.18.0 (`LIMITS.md` §1d): a self-consistent rewrite of the SPEC and its pin passes. The pin detects
   drift; it does not authenticate an approver.

The contract prose states the rule as a rule, with no count and no "every"/"only" quantifier over stages (L47). The
one quantified claim is "cannot change kind while keeping the pin", and it is exercised by execution, not by reading
the code (L37).

## Applied lessons

- **L1** — the meta-doc sweep in D4: it names the two contract sentences this finding falsifies and the command
  step where the key is written, all in `## Files`. The swept-and-unchanged docs are listed with the reason each
  stays true.
- **L35** — D2: one exported predicate over the one existing regex, called by both `check-spec.mjs` and
  `specAcceptanceCriteria`. The three AC-mode consumers agree through `kind: null`, not through three copies of a new
  check.
- **L37** — the shipped claim "RED at every stage that checks the chain" was correct on reading and false on
  execution, which is how this finding was found. The new claim (D5) is verified by executing the checkers over
  both moves and over the controls. The tests assert exit codes, not only the source.
- **L47** — the repaired contract sentences state the rule in an open form ("a SPEC whose body opens with …"). They do
  not use a new closed count of stages, or a new "every stage" quantifier that would expire the next time a stage is
  added.
- **L52** — the test set is named, not implied. It is **{A → B, B → A} × {`check-spec` validate,
  `check-spec-approved` via the shelled chain, `specVerdict` / `--spec`, `checkMapping`}**, plus the controls listed
  under "Evals to write". Covering one direction or one reader would satisfy "a test exists" and leave the finding
  open.

## Files

- `pharn/floor/spec-template-core.mjs` — D2 `kindLineOpensBody` (exported, beside `specKindLines`); D3 `kindInBody` on every `specAcceptanceCriteria` return and `kind: null` for a templated SPEC in layout A; `specVerdict`'s own UNUSABLE line for it; the JSDoc of both — layer product floor
- `pharn/floor/check-spec.mjs` — D1 the `pin` RED in `validate` (every SPEC, every state), the import of `kindLineOpensBody`, one added paragraph in the `pinHash` comment stating why the split is unique, and the header's legacy sentence (GRILL finding 2); `pinHash` body byte-unchanged — layer product floor
- `pharn/floor/check-ac-tests.mjs` — D3 `checkMapping`'s `spec-kind` detail names the layout-A cause (branch on `kindInBody`) — layer product floor
- `pharn/floor/README.md` — the "A SPEC without the key is validated exactly as before" sentence, in open form (GRILL finding 2) — layer product floor docs
- `pharn/floor/check-spec.test.mjs` — the D1 cases: both moves RED `pin` only, and `check-spec-approved.mjs` spawned directly over both layouts (GRILL finding 5); Draft and legacy in layout A RED; controls unchanged; the lower-line and leading-space controls; CRLF; no echo; `--hash` unchanged — layer product floor tests
- `pharn/floor/check-ac-tests.test.mjs` — the D3 cases: `specAcceptanceCriteria` `kind`/`kindInBody`; `--spec` 2 for layout A and 4 for B; `checkMapping` `spec-kind` with the new detail; `check-spec-approved` via the chain (`pin`); layout A added to the L35 parity test; the two `deepEqual` shapes gain `kindInBody: false` — layer product floor tests
- `pharn/pharn-contracts/spec-template.md` — D4 the `spec_kind` section's new paragraph, and the legacy paragraph's "No rule here can RED it" (GRILL finding 2) — layer pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — D4 the `spec-kind` row, the `--spec` precedence sentence, the pin sentence in "Bootstrap" — layer pharn-contracts
- `.claude/commands/pharn-spec.md` — D4 Step 3's `spec_kind` bullet, the floor list's item (4) and its legacy sentence, the frontmatter description's legacy clause, the Draft step's RED-kind list and the re-validate step's `pin` branch (GRILL findings 1 and 2) — layer product command
- `SKILLS_VERSION` — 6.20.6 → 6.20.7 (renumbered twice: #268 took 6.20.5, #269 took 6.20.6; GATE-1 note 3) — repo-meta
- `CHANGELOG.md` — new `## [6.20.7] - 2026-09-25` section directly above `[6.20.6]` (`[Unreleased]` is empty at base) — repo-meta
- `README.md` — the shields badge → 6.20.7 (`check:badge`) — repo-meta

### Not touched (deliberately)

- `pinHash` / `bodyHash` bodies, `--hash`, `--state`, `--spec-id`: no pin moves (D1). A diff with zero lines inside
  `pinHash`'s function body is the check the review can read.
- `pharn/floor/ac-tests-lock.mjs`: `kind: null` already refuses a bootstrap write and REDs a bootstrap check. Both of
  its paths also shell `check-spec-approved.mjs`, which now REDs with the precise reason, so its own message
  ("an invalid spec_kind") stays as an advisory detail. Its **test-first** paths (`buildLock`, `testFirstReds`)
  never read SPEC.md's kind at all; they read AC-TESTS.md. So for a layout-A SPEC, the agreement is enforced by
  `check-test-stage.mjs` (`--spec` exit 2 → `RED spec-unusable`, before any lock is read) and by `checkMapping`, not
  by the lock (GRILL finding 4).
- `pharn/floor/ac-gate-core.mjs`, `pharn/floor/check-test-stage.mjs`: they reach the new reading through `specVerdict`
  / `--spec` exit 2, handled by existing branches (INCONCLUSIVE / `spec-unusable`).
- `readValue` and the rest of `check-spec.mjs`'s frontmatter parsing: group A is moving `readValue` into
  `frontmatter-core.mjs` in parallel. This edit stays inside `validate`, the `pinHash` comment and one import line,
  so a rebase is trivial.
- The four trusted docs: no sentence there is falsified (D4), so no PROTECTED-FOLLOWUPS.
- `MIN_CLI`: no installed path moves and no contract shape changes for the installer.

## Contracts satisfied

- `pharn/pharn-contracts/spec-template.md` "`spec_kind`" — the pin covers the kind, and after this increment it holds
  for the moved-line case too (D1, D4).
- `pharn/pharn-contracts/ac-tests.md` — the `--spec` exit set is unchanged ({0, 2, 3, 4}), and the new cause lands in
  the existing unusable slot (D3).

## Evals to write (P1)

No `role:`-bearing capability changes, so there is no eval pair. The floor checkers' `node --test` suites are the
P1 analogue. The set (L52):

- `check-spec.test.mjs`: A → B and B → A, each built from Approved controls with real pins, so `check-spec` REDs
  exactly `["pin"]` on layout A, and the other layout is GREEN with the **same** `--hash` (the collision is still in
  the hash, and the RED is what closes it). The Draft in layout A REDs (caught before approval). The legacy SPEC in
  layout A REDs `pin`. Controls: no kind line and a frontmatter `feature` / `test-infra` line stay GREEN, with pins
  equal to the existing formulas (`bodyHash(body)` / `bodyHash("spec_kind: <v>\n" + body)`). A `spec_kind:` line
  after a blank first body line, and a body whose first line is `spec_kind: …` (a leading space), are GREEN and pin
  differently from the frontmatter key (GATE-1 note 1). A CRLF first line
  (`spec_kind: x\r\n`) REDs. The detail does not echo a payload after `spec_kind:` (P2).
- `check-ac-tests.test.mjs`: `specAcceptanceCriteria` gives `kind: null, kindInBody: true` for templated layout A and
  `kind: "feature", kindInBody: true` for legacy layout A. `--spec`: layout A exits 2 with the new line, layout B exits
  4, legacy layout A exits 3. The L35 parity test gains layout A, so the CLI and `specVerdict` agree on it.
  `checkMapping` REDs `spec-kind` with the layout detail, together with `pin` from the shelled chain
  (`check-spec-approved.mjs`).

## Guarantee audit (P0)

- "A SPEC that passes `check-spec.mjs` cannot change kind while keeping its pin" → **floor**: content-hash (the
  unchanged pin) + regex (the first-line RED), by D1's argument, **executed** over both moves. Bound: D5.1, and a
  SHA-256 collision is out of scope.
- "`--spec`, the AC gate, `checkMapping` and the lock agree on layout A" → **floor** (regex + enum): one predicate,
  one `kind: null`, and the existing fail-closed branches. Tested for `--spec`/`specVerdict` and `checkMapping`. The AC
  gate's and the lock's branches for `UNUSABLE` / `null` are existing, tested behaviour that this increment does not
  edit.
- "No existing pin moves" → **floor-checkable** by diff (the `pinHash` body is untouched) and by the existing pin
  tests, which stay green unchanged.
- "`/pharn-spec` writes the key in the frontmatter" → **advisory** (command prose). The backstop is the D1 RED.
- "A SPEC approved in layout A is re-approved after its remedy" → **advisory** (D5.1). It is stated in the contract
  and the CHANGELOG, not implied.

## Trust audit (P2)

The SPEC body is untrusted free text. The new RED and the new UNUSABLE line are fixed strings that never quote the
line's value. A test asserts that a payload after `spec_kind:` is not echoed. The branch reads only a regex match.

## Determinism audit (P5)

Every new branch is a regex membership test (`/^spec_kind:/` on the body's start) or the existing enum test on
`kind`. There is no classification, and a fallback is a RED or UNUSABLE, never a guess.

## Version

**PATCH, 6.20.6 → 6.20.7 (renumbered from the planned 6.20.4 → 6.20.5 after #268 and then #269 merged first).** This corrects shipped behaviour so that it meets the 6.18.0 contract ("flipping the kind
after approval is drift"). No contract shape, finding shape or frontmatter key changes, and no existing pin moves. The
one newly-RED layout is the ambiguous one the contract already treated as a flip. That a SPEC approved in that layout
now REDs is stated in the CHANGELOG entry.

## GATE 1 — approved under delegation, with three build notes

Recorded as a **model decision under delegation**, not a human approval. The user's instruction (2026-09-24) delegates
both gates to the orchestrator session: _"fix all findings … each fix needs to be fixed by using pharn-dev-ship
command and needs to ends by merged pull request. you merge pull requests when the CI are green."_ The orchestrator
replied "GATE 1 approved for group F (spec-pin-kind-ambiguity), as planned", accepting all three decisions surfaced
here: legacy SPECs get the RED too (D1 "why every SPEC"); the RED's kind is `pin` (D1); and re-approval is not
enforced, which the plan (D5.1) and the CHANGELOG state. Its build notes:

1. Write the "why the split is unique" argument **once**, in the `pinHash` comment and in the `spec-template.md`
   contract: kind lines always start at column 0 with `spec_kind:`, so a body that does not open with such a line
   gives exactly one decomposition of kind + body, and a leading-space or blank-first-line body is not ambiguous.
   Other sites (the predicate's JSDoc, `specVerdict`, `ac-tests.md`, `/pharn-spec`) cite the rule and do not restate
   the argument. The leading-space and blank-first-line cases become GREEN controls in the tests.
2. Apply `kindLineOpensBody` to the body after the same CRLF normalization `pinHash` uses, and keep the CRLF test
   (D2 above).
3. The version is provisional: 6.20.5 now. Groups A and D may merge first, so rebase and renumber when the orchestrator
   asks.

## Post-grill amendments (made after GATE 1, inside the approved design)

`/pharn-dev-grill` raised five advisory findings (`GRILL.md`). All five were absorbed here **before** the build set its
scope, without changing any GATE-1 decision:

- Finding 1: the kind stays `pin`, as approved. `/pharn-spec`'s two kind-branches are corrected in a file already
  declared.
- Finding 2: the doc sweep gains the five legacy sentences, which adds `pharn/floor/README.md` to `## Files`.
- Findings 3 and 4: precision edits to D3 and "Not touched".
- Finding 5: one direct `check-spec-approved.mjs` assertion in a declared test file.

The alternative raised in finding 1, a distinct RED kind for which `/pharn-spec`'s existing "any other kind" branch
would need no split, is **not** taken here, because GATE 1 decided `pin`. It is presented at GATE 2 for the
orchestrator to weigh.

## Open questions (HALT)

- None. The three GATE-1 attention items were resolved at GATE 1 (above).
