# PLAN — wire /pharn-ship into the cost ledger and the run report

- spec_content_hash: aada03c9f7165f944aef66db8ee9eb9df809c0fad2d5d67c268ac2d620566b3d # fix #4
- applied_lessons: [L6, L8, L19, L29, L31, L33, L34, L35, L36, L41, L43, L44, L49, L52]
- increment: give `/pharn-ship` the same phase markers, `cost.json` and `RUN-REPORT.md` that
  `/pharn-loop` already emits — reusing A/B1/B2's helper and emitters, adding no second copy of any of
  them — and emit both on **every exit that ends the run**, independent of attestation.
- layer(s): `.claude/commands/` (the ship stage) + `pharn/floor/` (the two emitters) +
  `pharn/pharn-contracts/` (cost-ledger, ship-record) # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P2, P5, P6, P7]

## Applied lessons

- L6 — ship's ledger `outcome` is derived from **structured locations only** (the two verdict JSONs'
  `.verdict` enums and `markers.jsonl`'s own records), never grepped from `SHIP.md` prose; a
  `decision:`-looking line in a roll-up is DATA about a run, not a declaration of one.
- L8 — the setter resolves one `--target` per call, so this increment adds **no** new `writes:` entry:
  both new artifacts are written by the emitters' own `writeFileSync` through Bash, exactly as
  `/pharn-loop` does (its `writes:` names only `SPEC.md` + `LOOP.md`). Declaring them would be a false
  claim _and_ would oblige two more setter calls under `command-hygiene`'s Rule B.
- L19 — every line added to the command is a Bash call outside the `PreToolUse` gate; the emitters'
  writes are declared as such and are already exempt by name under `reconcile-ignore.json`'s
  `pipeline_artifacts` (verified live — `cost.json` and `RUN-REPORT.md` are both already members).
- L29 — `render-run-report.test.mjs`'s `★ WIRING` pin is written for **one** invoking command. Ship is
  the second, so the deliverable is the **enumeration of invoking commands**, materialized once and
  iterated, not a second bespoke test authored for whichever command was in front of me.
- L31 — two invokers of one emitter is the copy-pair shape at the _obligation_ level: what each caller
  owes (a `run-start` marker, per-stage markers, a `run-stop`, the emit, the check) is written down
  once in that enumeration so a third caller inherits it.
- L33 — this increment **expires three forward-looking claims** and they are corrected in the same
  diff, not left to a later sweep: `mark-phase.mjs`'s "`/pharn-ship` reuses this file unchanged **when
  its wiring lands**", `cost-ledger.md`'s `/pharn-loop`-only framing, and (under Q3-B)
  `pharn-ship.md:652`'s "`/pharn-ship` contains no `git`/`gh` invocation".
- L34 — every new per-item assertion set gets an explicit non-vacuity guard: the invoking-command
  enumeration is pinned `>= 2` with both members named, and the ship-outcome tests assert the derived
  object is non-null before asserting its fields.
- L35 — discovery 3's governing question, asked before choosing a remedy: **must the second copy
  exist?** Answered in `## Open questions` Q1 with evidence, not decided silently.
- L36 — ship's `decision` vocabulary carries a **parameter**, so it gets a **closure** assertion over
  the stem, not one presence test per member — `<stage>` is precisely the fragment that acquires a
  variant spelling. The set is written down **in full before** the assertion is authored (GRILL G4
  found it declared as two members while the derivation could emit a third): exactly
  **`gate2`**, **`stop:<stage>`** where `<stage>` is the last `stage-start` marker's own `stage` token,
  and **`stop:unknown`** for the case where markers exist but none is a `stage-start`. `outcome` is
  `null` — not a `decision` value — when there are no markers at all.
- L41 — `render-cost-ledger.mjs` carries **two** copies each of the `command` and `baseSha` defaults
  (`renderLedger`'s destructuring defaults and `main()`'s `opts` literal). Ship is the first caller to
  pass `--command`, which is exactly when a stale copy bites; both are retired to a single exported
  constant.
- L43 — the reason this increment adds **no** consistency check between `ship-record.json`'s `cost`
  block and `cost.json`: agreement is preserved by updating neither, so such a check would certify the
  two stores agree and never that either is right. The remedy is to bind each to its referent — which
  they already are (each records the window it was rendered in) — and to _state_ why they differ.
- L44 — the base-SHA capture is pinned as **one** fenced block that computes _and prints_ the value;
  later blocks take it by literal `<base sha>` substitution, never through a shell variable.
- L49 — the meta-doc sweep below states its **floor-coverage boundary**: which swept sites are held by
  a checker and which are unverified declarations.
- L52 — L41's remedy is quantified over a set, so the set is named in the sentence: **one test per
  default retired in this change** — two defaults, two no-argument tests, plus a closure assertion per
  literal. This is the lesson whose recorded instance is this exact module.

## Files

- `.claude/commands/pharn-ship.md` — markers around every stage; a new **Step 3a** emission step placed
  AFTER Step 3's `SHIP.md` write and **BEFORE Step 3b**, carrying its own both-paths reachability
  sentence; the GATE-2/STOP presentations print the per-stage table; `reads:` gains the four modules;
  the guarantee audit and Step 2d's "no git" bullet are corrected — layer `.claude/commands`

**The Step-3a ORDERING is load-bearing and its reason is recorded here, not left to the reader (GRILL
G5).** Step 3b can itself **STOP** on a `stale` / `malformed` attestation verdict, and it can
**halt-and-ask indefinitely** when `ship.requireAttestation` is `true`. An emission placed after it
would be skipped on exactly the paths the requirement names, so "independent of attestation and of
`ship.requireAttestation`" is satisfied **structurally**, by position, rather than by a promise. It also
fixes the order of the two cost figures: `cost.json` is rendered first, so the attested `cost` block's
window is strictly the later one — which is the concrete form of Q1's "different render moment", and
the reason they may legitimately disagree. Step 3b's own write-before-hash ordering is untouched.

**Step 3a also states what the live command leaves unstated (P6).** `pharn-ship.md` Step 3 declares its
both-paths reachability explicitly; **Step 3b declares none**, so a reader today cannot tell whether a
failed ship run records cost at all. Step 3a says so for itself in one sentence rather than inheriting
the ambiguity.

- `pharn/floor/ship-outcome-core.mjs` — NEW. The ship-outcome derivation, extracted so the emitter does
  not acquire a second axis of change (GRILL G3 / P3, the `plan-files-core.mjs` precedent): it owns the
  closed `decision` vocabulary and the `verdicts+markers` derivation, nothing else — layer `pharn/floor`
- `pharn/floor/ship-outcome-core.test.mjs` — NEW. The derivation's three decision members, the closure
  assertion with a negative control, and the no-marker `null` case — layer `pharn/floor`
- `pharn/floor/render-cost-ledger.mjs` — CALL the extracted core when no `LOOP.md` envelope exists (the
  envelope still wins); retire the duplicated `command` / `baseSha` defaults — layer `pharn/floor`
- `pharn/floor/render-cost-ledger.test.mjs` — the precedence (envelope beats derivation), and the two
  no-argument default tests — layer `pharn/floor`
- `pharn/floor/render-run-report.mjs` — command-neutral section prose driven by `cost.json`'s own
  `command` field; a `## Briefing` link section; an honest non-loop Handoff line — layer `pharn/floor`
- `pharn/floor/render-run-report.test.mjs` — the new section in the closed `SECTIONS` set, the
  command-neutral branches, and the `★ WIRING` pin converted to an enumeration over invoking commands
  — layer `pharn/floor`
- `pharn/floor/check-cost-ledger.mjs` — (Q4-A only) an `outcome` shape rule, making the contract's
  existing `FLOOR (shape)` row true — layer `pharn/floor`
- `pharn/floor/check-cost-ledger.test.mjs` — (Q4-A only) that rule, with a negative control — layer
  `pharn/floor`
- `pharn/pharn-contracts/cost-ledger.md` — `outcome.source` widened to a two-member enum; ship's
  `decision` vocabulary and its advisory bound; the `/pharn-loop`-only framing corrected — layer
  `pharn-contracts`
- `pharn/pharn-contracts/ship-record.md` — one paragraph naming `cost.json` authoritative for analysis
  and saying **why** the two figures legitimately differ (Q1-A) — layer `pharn-contracts`
- `.dev/floor/command-hygiene.test.mjs` — ship's marker/emit wiring joins the existing enumeration
  style used for `PLAN_LESSONS_WIRING` — layer `.dev/floor`
- `CLAUDE.md` — the emitters' entries gain ship as a second invoker — layer repo-meta
- `CHANGELOG.md` — the entry, carrying the `SKILLS_VERSION` bump — layer repo-meta
- `SKILLS_VERSION` — `6.6.0` → `6.7.0` (minor: a newly shipped capability on the product surface) —
  layer repo-meta
- `README.md` — TWO regions, both checker-backed, both moved by this increment. (1) the shields version
  badge at `:24`, which `.dev/floor/check-version-badge.mjs` holds BYTE-EQUAL to `SKILLS_VERSION`; (2)
  the generated `CURRENT-STATE` block, whose `Floor checkers — <n> .mjs files under pharn/floor/` bullet
  moves **62 → 63** because this increment adds `ship-outcome-core.mjs`. Region (2) is written by
  `npm run docs:generate` (a Bash write, L19) and held to byte-equality by `docs:check`; region (1) is a
  hand edit. **Added after the GATE-1 approval, at the human's direction, because `/pharn-dev-grill`
  found it missing (G1).** — layer repo-meta

`docs/capabilities/**` is deliberately NOT declared: it is rendered from `role:`-bearing capability
frontmatter only (`capability-catalog-core.mjs`), and this increment adds no capability — so the
generator rewrites those pages byte-identically and git sees no change. Declaring it would be the
over-declaration L7 names. If `docs:check` disagrees at verify, that is the finding, not a reason to
have pre-declared it.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` — the emitted `cost.json` keeps the closed top-level key set
  and the `pharn-cost-ledger/1` schema; only `outcome.source`'s value set widens (additive) — cite, do
  not restate (P4).
- `pharn/pharn-contracts/ship-record.md` — untouched in shape. The `cost` block, `record_hash` and the
  write-before-hash ordering are unchanged; one paragraph is added about the relationship to
  `cost.json`.
- `pharn/pharn-contracts/reconciliation-record.md` — the emitters' Bash writes land on paths already
  exempt under `pipeline_artifacts.names` (verified live; nothing is re-added).

## Evals to write (P1)

No `role:`-bearing Capability is added — these are floor modules and command prose, which
`validate.mjs` does not scan for evals. The executable specification is the test suite:

- `render-cost-ledger` → a feature dir with no `LOOP.md` but with both verdict reports at their proceed
  values + markers → `outcome.decision === "gate2"`, `source === "verdicts+markers"`.
- `render-cost-ledger` → the same dir with `verify-report.json` `.verdict: "FAIL"` and a last
  `stage-start` marker of `pharn-verify` → `outcome.decision === "stop:pharn-verify"`.
- `render-cost-ledger` → a dir carrying a `LOOP.md` envelope **and** verdict reports → the envelope
  still wins, `source === "LOOP.md"` (the loop's bytes do not move).
- `render-cost-ledger` → markers absent entirely → `outcome === null` (unchanged member).
- `render-cost-ledger` → CLOSURE (L36): every `decision` the module can emit matches
  `^(gate2|stop:[a-z0-9][a-z0-9-]{0,63})$`, asserted over the emitted stem, not per member.
- `render-cost-ledger` → NO-ARGUMENT CONTROL ×2 (L41/L52): `main()` with no `--command` and no
  `--base-sha` lands the single exported defaults; plus a closure assertion counting each literal's
  occurrences in the module source.
- `render-run-report` → a `cost.json` with `command: "/pharn-ship"` renders the non-loop Outcome and
  Verdicts prose and an `n/a` Handoff naming _by design_, not _missing record_.
- `render-run-report` → the same with a `BRIEFING.md` present → the `## Briefing` section links it;
  absent → an `n/a` line, never an omitted section (L34).
- `render-run-report` → `headings(md)` still `deepEqual [...SECTIONS]` with the new member, in both
  directions.
- `render-run-report` → ENUMERATION: every invoking command names the renderer's pinned invocation
  line, iterated over a `>= 2` set naming `pharn-loop.md` and `pharn-ship.md`, with a negative control.

## Guarantee audit (P0)

- "`/pharn-ship` emits `cost.json` and `RUN-REPORT.md` at every exit that ends the run" → **ADVISORY**.
  Bash calls in command prose, outside the `PreToolUse` gate (L19). Nothing on the floor forces them; a
  skipped call simply leaves no artifact. A test pins that the command **declares** the step and orders
  it — presence and ordering, never proof a run executed it.
- "the markers describe which stage a request belonged to" → **ADVISORY**, inherited verbatim from
  `mark-phase.mjs`'s own header and not re-claimed here. A written marker does not mean the stage ran,
  and a stage that ran does not mean a marker was written; `check-cost-ledger.mjs` answers a missing
  one with a counted WARN, never a RED.
- "`cost.json`'s stored views equal a recompute from `requests[]`" → **FLOOR: enum-regex + arithmetic**
  (`check-cost-ledger.mjs`), pre-existing and reused byte-for-byte. This increment adds **no** new
  gating primitive.
- "ship's `outcome.decision` is `gate2`" → **FLOOR (enum)** where it reduces to the two sub-stages'
  `.verdict` values, which are themselves floor.
- "ship's `outcome.decision` is `stop:<stage>`" → **ADVISORY**, and the split is stated rather than
  averaged: the `stop:` half rests on the **last `stage-start` marker**, i.e. on marker discipline,
  which is advisory. **The carrier is NAMED, not promised (GRILL G2):** `render-run-report.mjs`'s
  `## Outcome` preamble — the same sentence slot this increment is already rewriting for
  command-neutrality — emits, for a `stop:` decision, that the value rests on marker discipline and is
  advisory, while `gate2` reduces to the two sub-stages' `.verdict` enums. `cost-ledger.md`'s field
  table carries the same split. A reader of either artifact meets the label without opening the other;
  the two halves are never described as one.
- "`outcome` matches its declared shape" → **FLOOR (enum-regex)** _only under Q4-A_. Discovery found
  that `cost-ledger.md` already advertises `outcome` as `FLOOR (shape)` while
  `check-cost-ledger.mjs` validates **nothing** inside it beyond the closed top-level key set and the
  absolute-path walk. Under Q4-B this row is relabeled `ADVISORY` instead. **Shipping a widened value
  set into a field whose FLOOR label is unbacked is the P0 disease**, so one of the two must happen in
  this increment.
- "`RUN-REPORT.md` is a deterministic view" → **FLOOR-adjacent but gating nothing**, unchanged from
  B2: every line is derived by code, and no proceed/stop reads it.
- "the two cost figures agree" → **NOT A CLAIM, struck (L43)**. They are rendered at different moments
  by different attribution methods; the increment states why they differ and adds **no** cross-check.

## Trust audit (P2)

- `markers.jsonl` — written by this repo's own tooling; `stage` is grammar-bounded by `mark-phase`'s
  `STAGE_RE` at write time, so the `stop:<stage>` token cannot carry a control character or a path.
- `verify-report.json` / `regression-report.json` `.verdict` — enum-gated, the trusted class; this is
  the only class any derived `decision` reads.
- `BRIEFING.md`'s path is this command's own constant; only its **existence** is tested. Its contents
  are never read into the report.
- Everything `RUN-REPORT.md` quotes stays untrusted DATA inside a computed fence, unchanged from B2 —
  the new `## Briefing` section emits a link, never quoted briefing text.
- No new ingestion path and no new egress is added.

## Determinism audit (P5)

- Emit-or-not is a membership test: _does the feature directory exist?_ — the same rule `/pharn-loop`
  uses, so a GATE-1 exit (no approved SPEC yet) records nothing and says so.
- `gate2` vs `stop:` is a membership test over two `.verdict` enums; `<stage>` is read from the last
  `stage-start` record, a structured location (L6).
- The terminal fallback everywhere is an explicit honest sentinel — `unknown`, `null`, or an `n/a`
  line — never a guess and never a silently omitted section.

## Meta-doc sweep, with its floor-coverage boundary stated (L49)

Sites this increment invalidates, and **which are checker-backed**:

| site                                         | checker                                      |
| -------------------------------------------- | -------------------------------------------- |
| `SKILLS_VERSION` ↔ README badge              | `check-version-badge.mjs` — **byte-checked** |
| `SKILLS_VERSION` ↔ CHANGELOG entry           | `check:changelog` — **checked**              |
| `docs/capabilities/**`, README CURRENT-STATE | `docs:check` — **byte-checked**              |
| `CLAUDE.md` emitter entries                  | **none** — unverified declaration            |
| `cost-ledger.md` / `ship-record.md` prose    | **none** — unverified declaration            |
| `mark-phase.mjs`'s "when its wiring lands"   | **none** — unverified declaration (L33)      |
| `pharn-ship.md:652` "no `git`/`gh`"          | **none** — unverified declaration (L33)      |

The four unchecked rows are exactly where an omission would reach GATE 2 green; they are listed so the
grill and the review read them as claims, not as facts.

## Open questions — RESOLVED at the Step-4 halt (human decision, 2026-09-22)

All four were put to the human as an interactive form and answered; the answers are recorded here
verbatim in effect, and the `## Files` / `## Guarantee audit` sections above are written to them. None
remains open, so `/pharn-dev-grill` and `/pharn-dev-build` inherit decisions, not questions.

1. **Two cost figures in one feature dir (discovery 3).** `ship-record.json` carries a `cost` block
   (`pharn-cost-record/1`, aggregates keyed by the platform's `attributionSkill`) **inside attested
   content**; `cost.json` (`pharn-cost-ledger/1`) is per-request with marker-based stage attribution.
   Evidence weighed: they are **not the same fact** — different granularity, different attribution
   method, different render moment — so L35's "retire the second copy" does not cleanly apply;
   retiring it would change attested content (**breaking → major**), and deriving one from the other
   would silently change `by_stage`'s _meaning_ inside the attested block.
   **DECIDED (A): keep both.** `ship-record.md` gains one paragraph naming `cost.json` authoritative
   for analysis and saying **why** the two legitimately differ. **No cross-check is added** — per L43 it
   would certify the two stores agree and never that either is right. `SKILLS_VERSION` stays **minor**.

2. **A ship run that spans two sessions (discovery 2).** The direction's premise is half-true: markers
   **do** carry `session_id` per marker (`mark-phase.mjs:126`), but `renderLedger` resolves **one**
   `sessionId` and filters to that session's transcript files (`render-cost-ledger.mjs:407-427`) — it
   does **not** union sessions. `session_id` is read by `attribute()` to avoid cross-session
   mis-attribution, not to widen coverage. GATE 1 ends the turn, so an approval arriving in a new
   session leaves the entire pre-GATE-1 spend outside the ledger.
   **DECIDED (A): state the bound, do not union.** `coverage` has no `complete` member, so this is
   honest under-reporting; what was missing is that nobody said so. The bound is written into
   `cost-ledger.md` and into the command's own emission step, and it **reopens on the first measured
   multi-session ship run** (P7 — no observed failure yet, and unioning would change `sessions[]`
   semantics for `/pharn-loop` too).

3. **`base_sha` for a command that never commits.** With `unknown`, `RUN-REPORT.md`'s `## Files`
   section renders `n/a` on **every** ship run (read live in `filesSection`, `render-run-report.mjs:336-340`).
   **DECIDED (A): capture `git rev-parse HEAD 2>/dev/null || echo unknown` at Step 1**, the line
   `/pharn-loop` already pins at its `:360` (L22 — pin the invocation, do not describe the technique),
   as **one** block that computes and prints the value for literal `<base sha>` substitution later
   (L44). Ship commits nothing, so HEAD-at-start equals HEAD-at-stop and this is exactly the right
   base. **The consequence is paid in the same diff, not deferred:** `pharn-ship.md:652`
   ("`/pharn-ship` contains no `git`/`gh` invocation") becomes false and is corrected to say the
   command performs no git **write** and that its one git call is a read. `:704`'s enumeration of
   writes (no branch/add/commit/push/PR) is unaffected and stays verbatim. This is L33 with the
   correction made at the moment the claim expires.

4. **The unbacked `FLOOR (shape)` on `outcome`.** `cost-ledger.md`'s field table advertises `outcome`
   as `FLOOR (shape)`, but `check-cost-ledger.mjs` validates **nothing** inside it beyond the closed
   top-level key set and the absolute-path walk (read live — the only `outcome` references are the
   marker-completeness WARN at `:283-290`).
   **DECIDED (A): build the shape rule.** `null`, or an object with `decision` a non-empty bounded
   string, `iterations` an integer or `null`, `source` in the closed enum, and an optional `blocked`
   string. This is a **correction, not a speculative addition** (P7): the trigger is the unbacked
   claim itself, which this increment would otherwise deepen by adding a second producer with a wider
   value set. It ships with a negative control, so the rule is capable of failing.
