# PLAN — spec-template

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L1, L2, L6, L10, L14, L15, L19, L22, L29, L33, L34, L35, L36, L41, L45, L47, L50, L52, L55]
- increment: Replace `/pharn-spec`'s inline SPEC skeleton with a shipped default template (`pharn-default`), add a `spec-template` contract, and extend `pharn/floor/check-spec.mjs` with seven opt-in template rules (keyed on the `spec_template` frontmatter key) plus a `--template-ref <id>` print mode; add one `/pharn-loop` stop row (S6b).
- layer(s): pharn-contracts (contract + template), the product floor (`check-spec.mjs`), the product `.claude/` surface (`pharn-spec`, `pharn-loop`), build apparatus (one hygiene test), repo meta (README, CHANGELOG, SKILLS_VERSION).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

Everything below was measured this run on branch `spec-template` off `main` = `2bea57c`.

1. **The recommended template path is not installed by any CLI.** `pharn/pharn-pipeline/templates/` never
   reaches a user: pharn-cli copies from `pharn-pipeline/` only the SELECTED griller directories
   (`pharn-cli/src/lib/install-capabilities.ts`, `installCapabilityDirs`: `${subtree}/${cap.name}`,
   `subtree = paths.grillers | paths.lenses`), while `pharn-contracts/`, `pharn-core/` and `pharn/floor/`
   are copied whole (same file, `contractsFrom` / `coreFrom` / `floorFrom`). Checked at pharn-cli `main`
   `f853390` and at tag `v0.5.0` (= this repo's `MIN_CLI`), where the contracts copy is already
   `recursive: true` (`:268-275`), and `pharn update`'s manifest walks it too (`install-manifest.ts`,
   `addDir(paths.contracts)`). A template under `pharn-pipeline/templates/` would make
   `--template-ref pharn-default` exit 1 on every install, so `/pharn-spec` would fail everywhere except
   in this repo. **Recommended instead:** `pharn/pharn-contracts/templates/spec-template.md` — decision
   (a) below. `MIN_CLI` stays `0.5.0`.
2. **"Blocked reasons are free strings (no enum to extend)" is half true.** True of the contract
   (`pharn/pharn-contracts/loop-record.md:101`: "Extra keys are ignored by the checker") and of every
   checker. **False of `.dev/floor/command-hygiene.test.mjs`**, which holds a CLOSED set: `STUCK_POINTS`
   (`:1364-1376`), `STUCK_POINTS.length === 11` (`:1475`), and a closure test REDs any `` `blocked: …` ``
   spelling outside the set (`:1440-1443`, `:1503-1506`). A new `blocked: needs-clarification` fails that
   test unless S6b joins the set. The file is added to `## Files` (apparatus, no bump).
3. **`check-loop-decision.mjs:46` is the header comment, not the exemption.** The code is `:145`:
   `decision === "INCONCLUSIVE" && fields.has("blocked")`. It never reads the value, so it covers
   `needs-clarification` with no change. Confirmed.
4. **Spawned children DO register for coverage.** Running the existing suite under
   `--experimental-test-coverage` on Node v24.13.1 reports **97.83 %** line coverage of `check-spec.mjs`
   from today's spawn-only suite, because the children inherit `NODE_V8_COVERAGE`. So the brief's fallback
   (export pure functions and test them in-process) is not needed. `check-spec.mjs` stays a plain
   top-level CLI: no exports, no entry-guard change, no new import.
5. **`gate-run-core.mjs:69` is correct** (`export const ALLOWLIST = …`, no e2e member), but shipped prose
   will cite the symbol `ALLOWLIST`, not the line, because every edit above it moves the line.
6. **"The ACs will block at the AC-test stage" describes a stage that does not exist.** No PHARN stage
   writes or runs AC tests today. The `/pharn-spec` warning is therefore phrased as a planned later
   increment and labeled unshipped. It does not say anything "will block" (L33).
7. **"One row only" in `/pharn-loop` leaves three sentences untrue**, so each gets a one-clause update
   and nothing else changes:
   - the table intro (`:201-203`) and the Determinism section (`:829-830`) each list the
     judgment-triggered rows ("S6, S7 and S8");
   - Step 3 (`:238-239`) says how `/pharn-spec` reports back ("on thin intent … which is S6").

   Decision (c) names a fourth: the record's `spec:` line has no truthful value for a SPEC that was never
   approved.

8. **`reads:`**: the brief adds the template and `package.json`. The contract is added too, because the
   command cites it (P4).
9. `SKILLS_VERSION` is `6.12.1` ✓. `[Unreleased]` holds **three** entries (`### Added`, `### Changed`,
   `### Fixed`, all dated 2026-09-23). All three move into `[6.13.0]` under their group headings.
   `check-spec.test.mjs:15` is the `spawnSync` import ✓. `loop-decision-integrity/SPEC.md` is GREEN today
   ("4 required sections present; intent pinned") ✓.

## Design

### The template — `pharn/pharn-contracts/templates/spec-template.md` (id `pharn-default`)

Section names and order are exactly the brief's table: Intent, Scope, Scenarios, Acceptance Criteria,
Constraints, Data, Assumptions, Open Questions, Success Metrics. Headings are bare (`## Intent`).

- **Frontmatter:** `spec_id: <name>`, `state: Draft`, `spec_content_hash: ""`,
  `spec_template: <output of check-spec.mjs --template-ref pharn-default>`. The placeholder carries no `:`,
  because YAML reads a colon followed by a space in a plain scalar as a nested mapping, which would break
  prettier's frontmatter parse.
- **Guidance:** one `<!-- pharn:guidance … -->` comment per section, plus one file-level comment. It holds:
  - what belongs in the section;
  - what does NOT belong: implementation and architecture (they go in PLAN), FR-style requirements that
    duplicate ACs, vague adjectives, and edge cases outside the ACs (an edge case that matters IS an AC);
  - for Acceptance Criteria: the Then must be OBSERVABLE on the public surface (visible text, accessible
    role + name, URL, HTTP status, returned value), because AC tests are written BEFORE the build, from
    SPEC and PLAN only;
  - that an unused optional section is deleted, not left empty.

  No guidance text contains `-->`.

- **Placeholders** are `<…>` in the body. The AC skeleton is:

  ```markdown
  - **AC-1** Given <state> When <action> Then <observable outcome>
    - verify: <unit | integration | e2e>
  ```

  An unfilled verify placeholder fails the level enum, and an unfilled `spec_template` fails its regex, so
  the raw template is RED by construction.

- **The literal `[NEEDS CLARIFICATION` never appears** in the template, in any case. The Open Questions
  guidance points at the contract, which spells the marker.

### The contract — `pharn/pharn-contracts/spec-template.md`

It follows the `loop-record` / `ship-briefing` shape: frontmatter `name`, `trust`, `layer`, `purpose`, then
"schema only, zero behavior". It defines:

- the opt-in key and its legacy semantics;
- the id → path registry (the enforcing copy lives in `check-spec.mjs`, decision (b));
- the four frontmatter keys and the `spec_template` value shape;
- the section table (required / optional, and what belongs);
- the AC item grammar;
- the clarification marker `[NEEDS CLARIFICATION: <question>]` (≤3, and 0 to approve);
- the guidance sentinel;
- a rules table (rule → RED kind → floor primitive);
- an IS / IS-NOT block (L2 — the honesty travels with the artifact).

The contract carries no `rule_id:` + `problem:` pair, so validate CHECK 5 has nothing to scan (L10).

### `check-spec.mjs` — seven rules, applied ONLY when the frontmatter HAS the `spec_template` key

The key's **presence** is the switch (`"spec_template" in fm`). An empty value is still templated, and
rule 7 REDs it. A spec without the key takes the existing code path, byte-for-byte: no existing line
changes behavior, and the legacy GREEN line (`N required sections present` with N = 4) is unchanged.

Section bodies come from one new `sectionsOf(body)` that uses `headingsOf`'s exact heading regex. A
section is the lines after a `##` heading up to the next one. `headingsOf` itself is untouched.

| #   | rule                                                                                                                                                                                                                                                                                                                                                                                                                     | RED kind           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| 1   | `## Assumptions` present (the existing loop already REDs the base four); every template section (required ∪ optional) appears **at most once**                                                                                                                                                                                                                                                                           | `section`          |
| 2   | inside `## Acceptance Criteria`: ≥1 item; ids unique; per item `Given`, `When`, `Then` in that order (case-sensitive, word-bounded); exactly one verify-like continuation line, and it is `- verify: <level>` with level ∈ {unit, integration, e2e}; **closure (L36):** every column-0 list line is an AC item start `- **AC-<n>**` (`n` = `[1-9][0-9]*`), and the section holds no non-blank text before the first item | `ac`               |
| 3   | `[NEEDS CLARIFICATION` markers in the body (case-insensitive, whitespace-tolerant, so a variant spelling is counted, which fails closed): ≤3; 0 when `state: Approved`                                                                                                                                                                                                                                                   | `clarification`    |
| 4   | inside `## Scope`: a column-0 line starting `**Out of scope` (any label suffix, case-insensitive) with ≥1 entry, which is either non-empty text after the label on the same line or a following list line with content, before the next column-0 `**` label or the section's end                                                                                                                                         | `out-of-scope`     |
| 5   | each optional section present has ≥1 non-blank line; unknown extra `##` headings are allowed                                                                                                                                                                                                                                                                                                                             | `optional-section` |
| 6   | no `<!--\s*pharn:guidance` anywhere in the body                                                                                                                                                                                                                                                                                                                                                                          | `guidance`         |
| 7   | `spec_template` is control-char-free (L14) and matches `^([a-z0-9]+(?:-[a-z0-9]+)*)@sha256:([0-9a-f]{64})$`, and the id is a member of the `TEMPLATES` Map (L15). **Provenance only**: the value is never compared with the current template file                                                                                                                                                                        | `template`         |

- Rule 1's kind is the existing `section`: rule 1 IS the section rule, extended. Every other rule gets a
  new kind.
- Rules 2 and 4 are **skipped** when their section is absent or duplicated, because rule 1 (or the legacy
  loop) already REDs that, and the same defect should produce one RED with one reason.
- **RED messages cite file line numbers and AC ids, never body text** (P2). The one value echoed,
  `spec_template`, is `JSON.stringify`'d.
- **A verify-like line** is a continuation line matching `^[ \t]+[-*+][ \t]*verify[ \t]*:` (any case).
  - Its count is the closure: 0 or ≥2 of them is RED, so `Verify: unit` or `* verify: unit` are caught
    rather than skipped.
  - A nested bullet such as `- verify the user sees X` has no colon, so it is plain text.
- **The grammar is line-based, not CommonMark (L55's bound).** A fenced block inside the AC section is not
  special-cased:
  - a column-0 `-` line inside a fence is RED as a non-AC item, which fails closed;
  - an AC item written inside a fence is counted as an AC. That is the one fail-open shape, and it is
    stated in the contract and the header.

  The differential probe against the "renderer" is the shipped template itself (T8 below).

- **The templated GREEN line keeps the legacy prefix:**
  `GREEN — spec valid; state "<s>"; 5 required sections present; template "pharn-default"; <k> acceptance criteria[; intent pinned]`.
  The count is computed from the constant, never typed (L47).

**`--template-ref <id>`** prints `<id>@sha256:<bodyHash(stripBom(file))>` and exits 0.

- It exits 1, with a stderr line, on an unknown id (Map membership, so `__proto__` / `constructor` /
  `toString` are unknown), on a missing argument, or on an unreadable file.
- The path is resolved from the file's own location: `join(dirname(fileURLToPath(import.meta.url)),
"../pharn-contracts/templates/spec-template.md")`, never from the cwd.
- It is the ONLY source of the value. The `TEMPLATES` Map is the one place the id and path live, and the
  CLI has no default id (L41).
- The header's usage and exit blocks gain the mode. `validate` never reads the template, which keeps
  `check-loop-fresh.test.mjs`'s sandbox (it copies `check-spec.mjs` and `frontmatter-core.mjs` only,
  `:751-763`) working unchanged.

### `/pharn-spec`

- **`reads:`** gains `pharn/pharn-contracts/spec-template.md`,
  `pharn/pharn-contracts/templates/spec-template.md` and `package.json`. `version` 0.1.0 → 0.2.0. The
  description and "The two layers" gain the template floor ops, stated as opt-in.
- **Step 2 additions, all ADVISORY:**
  - every AC writable as Given/When/Then with an observable Then;
  - `package.json` absent, or its `scripts` object without an own `test` key → warn that the project has
    no test runner, that PHARN does not yet write or run AC tests (a later increment, not shipped), and
    that setting up the project's tests is its own increment to run first;
  - any `verify: e2e` → ask whether the project has an e2e runner, and say that PHARN's gate allowlist
    (`ALLOWLIST` in `pharn/floor/gate-run-core.mjs`) runs no e2e gate today;
  - a genuine ambiguity → a clarification marker (max 3), and everything else → an informed guess in
    `## Assumptions`.

  Under `--model-approve` nobody answers: each of these becomes an `## Assumptions` line. A marker is
  written only where guessing would invent intent, and that blocks at Step 4a.

- **Step 3:** the inline skeleton is DELETED (P4). The command:
  - copies the template, fills every `<placeholder>`, deletes each unused optional section and removes
    every guidance comment;
  - writes `spec_template` as the verbatim stdout line of the pinned command (L22), never computing or
    typing a hash:

    ```bash
    node pharn/floor/check-spec.mjs --template-ref pharn-default
    ```

  - lists the new RED kinds alongside the existing ones.
- **Step 4:** while a marker remains, approval is not offered; the options are _Revise_ and _Keep as
  Draft_. The command says the floor would RED an Approved spec with a marker anyway.
- **Step 4a:** a marker present → do not approve; report back blocked on clarification.
- **Step 5:** a RED after the pin → if its kind is `pin`, recompute; any other kind → revert to
  `state: Draft` with `spec_content_hash: ""` and return to Step 4 (or, under `--model-approve`, report
  blocked).
- The guarantee and trust audits gain the new lines. Lessons are cited as "PHARN's own build-loop lesson
  L<n>", never by a `.dev/` path (`command-hygiene.test.mjs:1268+`).

### `/pharn-loop`

- **One new table row, directly after S6.** Id `S6b`. Trigger: `/pharn-spec` reports the Draft still
  carries a clarification marker (it will not approve it). Rule: stop `blocked: needs-clarification`; a
  person answers the marked questions, and the run never guesses them.
- **The three one-clause updates** from record item 7.
- **Decision (c), resolved at GATE 1:** the record's `spec:` closed set gains `not approved` (a SPEC this
  run never approved), at Step 6b's value list (`:453-454`) and Step 7's summary list (`:680-681`).
- A Draft exists, so the stop writes a record (Step 6). Step 6a's revert does not fire (the SPEC is not
  `Approved`). `check-loop-decision.mjs:145` SKIPs the record as a blocked stop.

## Files

- `pharn/pharn-contracts/spec-template.md` — new contract: opt-in key, id registry, sections, AC grammar,
  marker, sentinel, rules table, IS / IS-NOT — layer pharn-contracts (L-1)
- `pharn/pharn-contracts/templates/spec-template.md` — new default template `pharn-default` — layer
  pharn-contracts (L-1; a schema instance, zero behavior)
- `pharn/floor/check-spec.mjs` — the seven opt-in rules, `sectionsOf`, `--template-ref`, and header
  updates — product floor
- `pharn/floor/check-spec.test.mjs` — new tests only; no existing case edited — floor test (apparatus)
- `pharn/floor/README.md` — the `check-spec.mjs` table row (primitive + the template shape) — product
  floor doc (ships)
- `.claude/commands/pharn-spec.md` — reads, version, layers, Steps 2 / 3 / 4 / 4a / 5, audits; the inline
  skeleton deleted — product command
- `.claude/commands/pharn-loop.md` — the S6b row, the three clauses, and decision (c) — product command
- `.dev/floor/command-hygiene.test.mjs` — the stuck-point set gains S6b with its blocked id, and the
  length assertion becomes 12 — apparatus test
- `pharn/floor/gate-run-core.mjs` — comment only: the stale line cite at `:15` becomes the
  version-anchored cite (grill disposition G10) — product floor
- `CLAUDE.md` — the sentence recording that cite as deferred becomes past tense (G10) — repo meta
- `pharn/floor/spec-template-core.mjs` — NEW in the GATE-2 fix round (R10): the pure template rules
  extracted from `check-spec.mjs` — product floor
- `pharn/floor/check-loop-fresh.test.mjs` — its sandbox module list gains `spec-template-core.mjs`, which
  `check-spec.mjs` now imports (R10) — floor test (apparatus)
- `README.md` — the badge 6.12.1 → 6.13.0, one Guarantees-table row, and the generated `CURRENT-STATE`
  block (Contracts 11 → 12). The block is BASH-written by `npm run docs:generate` and declared here
  because that write escapes the Write-tool guard (L19) — repo meta
- `SKILLS_VERSION` — 6.12.1 → 6.13.0 — repo meta
- `CHANGELOG.md` — `## [6.13.0] - 2026-09-23` above `[6.12.1]`, with every `[Unreleased]` entry moved in
  under its group and this increment's entry at the top of `### Added` — repo meta

## Contracts satisfied

- `pharn/pharn-contracts/spec-template.md` (new) — `check-spec.mjs` enforces it; `/pharn-spec` fills the
  template it names; both cite it (P4).
- `pharn/pharn-contracts/loop-record.md` — S6b writes a blocked stop exactly per "The one exception: a
  blocked stop" (unchanged).
- `pharn/ARCHITECTURE.md §6` — the spec row `SPEC.md | intent (Draft → Approved)` is tightened, not
  changed (the check-spec header's own "domknięcie" framing).

## Evals to write (P1) — tests, since check-spec is a floor checker, not a `role:` capability

All in `pharn/floor/check-spec.test.mjs` unless noted. The per-rule set is ONE materialized
`RULE_CASES` table, iterated (L29, L52: one violating fixture per rule kind, not "a test for the rules").

- **T1 legacy unchanged:** every existing case passes with zero edits.
- **T2 opt-in proof:** a legacy spec (no `spec_template`) with 5 markers, a guidance comment, no
  Assumptions, and prose ACs is GREEN with the legacy GREEN line.
- **T3 the real legacy SPEC:** `pharn/features/loop-decision-integrity/SPEC.md` → GREEN, "4 required
  sections present; intent pinned".
- **T4 control:** the base templated fixture is GREEN as a Draft and as an Approved spec with the `--hash`
  pin (so no per-rule RED is vacuous — L34).
- **T5 `RULE_CASES`:** for each kind, every mutant exits 1 and **every** RED line carries that kind:
  - `section`: no Assumptions; `## Data` ×2; `## Acceptance Criteria` ×2;
  - `ac`:
    - item structure: no items; duplicate id; `AC-01`; `- AC-2 Given…` (no bold); `* **AC-1**`; text
      before the first item;
    - Given/When/Then: no Then; Then before When; lowercase `given`;
    - verify line: no verify line; two verify lines; `Verify: unit`; `verify: E2E`; verify only on the
      item line;
  - `clarification`: 4 markers in a Draft; Approved + 1 marker with a correct pin; a lowercase variant
    counted toward 4;
  - `out-of-scope`: no label; a label with no entry before the next label;
  - `optional-section`: an empty `## Data`; a blank-only `## Success Metrics`;
  - `guidance`: `<!-- pharn:guidance x -->`; `<!--pharn:guidance`;
  - `template`: empty; 63 hex; uppercase hex; unknown id `acme@sha256:…`; trailing text.
- **T6 GREEN boundaries:**
  - exactly 3 markers in a Draft;
  - the legacy label `**Out of scope:** x` inline;
  - a multi-line AC with Given / When / Then on separate continuation lines plus a nested non-verify
    bullet (the brief's "multi-line AC item parses");
  - `verify: integration` and `verify: e2e`;
  - an unknown extra `## Notes`;
  - an optional section holding only a `###` subheading and a line.
- **T7 `--template-ref`:**
  - `pharn-default` → `^pharn-default@sha256:[0-9a-f]{64}\n$`, exit 0, and the digest equals
    `sha256(readFileSync(template))`;
  - a CRLF copy prints the same digest (checker and template copied into a temp tree);
  - unknown id → exit 1 + stderr; `__proto__`, `constructor`, `toString` → exit 1 (L15);
  - no id → usage, exit 1;
  - template missing (a checker copy without it) → exit 1, stderr names the path.
- **T8 the shipped template (L55's differential probe):**
  - strip guidance, substitute the `--template-ref` output and fill every `<…>` → GREEN as a Draft;
    pinned, → GREEN as Approved;
  - the RAW template → RED (the negative control);
  - no case-insensitive `[needs clarification` in the file;
  - its `##` headings equal the contract's nine, in order;
  - **partition:** deleting each of the nine sections from the filled template REDs `section` iff the
    section is required, else stays GREEN.
- **T9 ★ WIRING (L45):**
  - the fenced line `node pharn/floor/check-spec.mjs --template-ref pharn-default` appears exactly once
    in `.claude/commands/pharn-spec.md`, and `sh -c` of it from the repo root exits 0 with the
    `pharn-default@sha256:<64-hex>` shape;
  - negative control: the same line with a misspelled id exits 1.
- **T10 ★ P0/P2:** an instruction-looking needle inside an AC's Then clause leaves the verdict GREEN.
- **T11** the bare usage line names `--template-ref <id>`.
- **T12 (hygiene, `.dev/floor/command-hygiene.test.mjs`):** the existing per-member and closure tests
  iterate `STUCK_POINTS` with S6b in it, and they fail on the current `pharn-loop.md` until the row lands.
- **Coverage (reported in the build note and SHIP.md, not a test):** the suite under
  `--experimental-test-coverage`, line % for `check-spec.mjs`, target ≥ 90 %, measured through the
  spawned CLI (record item 4).
- **Grep proof (reported in the build note and SHIP.md):**
  `grep -nE '^## (Intent|Scope|Acceptance Criteria|Constraints)$|^\*\*Out of scope:\*\* <' .claude/commands/pharn-spec.md`
  → no output.

## Guarantee audit (P0)

- "A templated SPEC has the required sections incl. Assumptions, each template section at most once" →
  floor: enum-regex (heading membership).
- "Each AC item has a unique id, Given → When → Then in order, and exactly one verify level ∈ {unit,
  integration, e2e}; nothing else sits in the AC section" → floor: enum-regex. **Bound:** it proves the
  AC is PHRASED testably, never that a test exists, runs or passes; "the Then is observable on the public
  surface" is advisory.
- "≤3 clarification markers; 0 once Approved" → floor: enum-regex (a literal count). "No marker was
  needed" and "the Assumptions are honest guesses" are advisory.
- "An out-of-scope entry exists / an optional section is non-empty / no guidance remains" → floor:
  enum-regex. Whether the text is a real non-goal (not a leftover `<placeholder>`) is advisory; unfilled
  placeholders are not detected.
- "`spec_template` names a known template by a well-formed digest" → floor: enum-regex. **Provenance
  only:** no check compares it with the current template, by design, so a template edit never REDs an
  Approved spec.
- "`--template-ref` prints the template's digest" → **not a floor guarantee** (G2): nothing compares
  the value, so no mutation is detected. What holds is that the value is computed by code rather than
  typed by the model, and a test pins it against an independent sha256.
- "Every SPEC `/pharn-spec` writes carries `spec_template`" → **advisory.** The key is the opt-in: a SPEC
  without it (deleted, or written by hand) bypasses all seven rules.
- "`/pharn-spec` never offers approval while a marker remains" → advisory, backstopped by the floor (an
  Approved templated spec with a marker REDs `clarification`, at Step 5 and at every downstream
  `check-spec-approved` call).
- "The shipped template and the checker agree" → floor-by-test in THIS repo (T8). It does not travel with
  an install (tests never ship). The contract's prose agreeing with the checker constants is advisory
  (decision (b)).
- "Legacy specs validate exactly as before" → floor-by-test (T1–T3), plus a build-time differential (G5):
  `main`'s `check-spec.mjs` and the new one, run over every committed SPEC and every legacy fixture shape,
  must produce byte-identical stdout and exit codes. The differential is evidence recorded in SHIP.md, not
  a committed test.
- "S6b maps a clarification stop to a recorded blocked stop" → advisory (command prose). The record's
  exemption from re-derivation → floor (`check-loop-decision.mjs:145`). The row's presence → pinned by the
  hygiene test (presence, never behaviour).

## Trust audit (P2)

- The SPEC body is untrusted DATA. The new rules range over heading membership, list-line shapes, literal
  tokens and one frontmatter regex, never over meaning. RED messages carry line numbers and AC ids, never
  body text (T10 pins that a needle cannot move the verdict).
- The template is pharn-owned `trusted` content whose guidance comments steer `/pharn-spec`. In an
  install it sits under `pharn/pharn-contracts/**`, which the fail-closed default safe-set leaves writable
  (`pharn/pharn-*/**`), the same non-protection as every shipped contract and capability. Stated, not
  fixed.
- `spec_template` records WHICH bytes a SPEC was filled from. Nothing re-verifies them later, so a
  modified template leaves no floor trace beyond a digest nobody compares.

## Determinism audit (P5)

- Every rule is set membership, an anchored regex, or an integer count. The template id is a `Map`
  lookup. There is no LLM classification anywhere in `check-spec.mjs`.
- `/pharn-spec`'s "genuine ambiguity" call is model judgment. Its terminal fallback is a clarification
  marker, which is a question to the human, never a guess. Under `--model-approve` it is S6b, a stop.
- S6b is judgment-triggered, like S6 / S7 / S8, and ends in a stop.

## Applied lessons

- **L1** — the meta-docs this changes are all in `## Files`: the README badge, the Guarantees row, the
  generated block, the floor README row, and CHANGELOG + SKILLS_VERSION.
- **L2** — the contract carries its own IS / IS-NOT and cites only live ops (`check-spec.mjs`, which this
  increment makes live in the same PR).
- **L6** — `spec_template` is read through `parseSpec` (frontmatter), and sections through the heading
  regex, never grepped from prose. Rule 4 is scoped to `## Scope`, not the whole body.
- **L10** — the contract and template sit on validate's scanned surface; neither carries a `rule_id:` +
  `problem:` pair, and a filled SPEC under `pharn/features/` carries none either.
- **L14** — rule 7 runs the control-char guard first, then the anchored regex.
- **L15** — the template registry is a `Map`; T7 probes `__proto__` / `constructor` / `toString`.
- **L19** — `npm run docs:generate` and the prettier / markdownlint runs are Bash writes; every path they
  touch is in `## Files`.
- **L22** — `/pharn-spec` pins the literal `--template-ref` command line and copies its stdout; it
  describes no hashing technique.
- **L29** — `RULE_CASES` is the one enumeration of the rule set; every case iterates it.
- **L33** — the AC-test stage is labeled as not shipped, never "will block" (record item 6).
- **L34** — T4's GREEN control makes each T5 RED attributable, and rule 2 REDs an AC section with zero
  items.
- **L35** — section names live in the template and in the checker constants (decision (b)). T8's
  differential test binds the two, and the contract states that its own prose agreeing with them is
  advisory.
- **L36** — closure, not presence (tightened by G1): after the first AC item, every non-blank line must
  be an AC item start or an indented continuation, and the number of `**AC-<n>**` tokens must equal the
  item count. Every verify-like line counts toward "exactly one", and the listed marker variants are
  counted.
- **L41** — `--template-ref` has no default id; the path lives only in the `TEMPLATES` Map.
- **L45** — T9 executes the committed `/pharn-spec` line from the repo root, with a negative control.
- **L47** — no new closed counts in prose: the GREEN line computes its section count, and the loop's
  "S1–S11" range text is left alone (S6b sits inside it).
- **L50** — referent sweep for the deleted skeleton and the "required sections" set:
  - the skeleton is cited nowhere outside `pharn-spec.md`;
  - "required sections" appears at `pharn-spec.md:38,48,74,133,156,205` (all edited here),
    `pharn-loop.md:212` (still true) and `pharn-plan.md:94,173` (still true, out of scope — follow-up
    below).
- **L52** — "one violating fixture per rule KIND" names the set in the same sentence as the test.
- **L55** — the checker re-derives a list grammar. Its remedy, a reference-parser differential, is NOT
  built here (G3: markdown-it is only a transitive devDependency, and pinning a floor test to it is a
  dependency decision). T8 is therefore labeled a fixture probe of the SHIPPED template, which certifies
  that template and nothing wider. The line-based bounds are stated in the contract and the header, and
  the missing differential is named as the residual `spec-ac-grammar-differential`.

## Grill dispositions (folded in before build)

`GRILL.md` raised 14 advisory concerns. Each is answered here and the build follows this section wherever
it and the design above differ.

- **G1 (blocking-severity) — AC closure, ADOPTED.** Inside `## Acceptance Criteria` every line is one of:
  - blank;
  - a column-0 AC item start `- **AC-<n>**` followed by whitespace;
  - after the first item, a continuation that starts with two or more spaces or a tab.

  Anything else is an `ac` RED, and that covers a column-0 paragraph, `1.` / `*` / `+` items, `###`, an
  item indented 1 space, and pre-item text. Separately, the count of `**AC-<digits>**` tokens in the
  section must equal the item count, which catches an AC id buried in continuation text or in an indented
  item. `AC-<n>` takes no leading zero because `AC-01` and `AC-1` would be two spellings of one id.
  **Bound (fails closed):** a lazy continuation (an unindented wrapped line, legal in CommonMark) REDs; a
  prettier-formatted item is always indented.

- **G2 — `--template-ref` relabeled** (see the guarantee audit).
- **G3 — T8 relabeled; the residual is named** (see L55).
- **G4 — markers.** The count regex is `\[\s*NEEDS?[\s_-]*CLARIFICATION` (case-insensitive), so it covers
  NEED/NEEDS and space, `_` or `-` separators. The claim is narrowed to exactly that set, and a
  differently spelled marker is not counted.
- **G5 — legacy differential**, recorded in SHIP.md (see the guarantee audit).
- **G6 — near-miss key, NOT adopted.** A RED on `spec-template:` would be a new RED for a SPEC without
  `spec_template`, which the brief forbids. It is named as a residual.
- **G7 — CRLF, ADOPTED.** `sectionsOf` splits on `/\r?\n/` exactly like `headingsOf`, and every new
  line regex tolerates trailing spaces and tabs. New tests (in T6 / T5):
  - a CRLF copy of the T4 control is GREEN as a Draft and as an Approved spec pinned from the LF form;
  - a verify line with trailing spaces is GREEN;
  - a CRLF out-of-scope label with no entry REDs `out-of-scope`.
- **G8 — revising a legacy SPEC.** `/pharn-spec` Step 1 gains one rule. A SPEC without `spec_template` is
  revised in place under the legacy four-section rule. Migrating it to the template is a full re-fill from
  the template, done only when the human chooses it.
- **G9 — the fifth loop sentence, ADOPTED.** Step 7's honest line becomes conditional on the SPEC state.
- **G10 — the stale cite, ADOPTED.** `pharn/floor/gate-run-core.mjs:15` becomes `CHANGELOG [6.3.0]`, the
  fix the `[Unreleased]` "Deferred." bullet names, and `CLAUDE.md`'s sentence becomes past tense. Both are
  now in `## Files`. This goes beyond the brief's "in scope ONLY", and GATE 2 says so: `CLAUDE.md`
  schedules exactly this fix for the next increment that bumps.
- **G11 — the test comment.** The comment at `check-spec.test.mjs:413-416` is corrected to state that
  `--template-ref` is excluded: it takes an id, not a SPEC path. It is a comment, not an assertion, so no
  existing test case changes.
- **G12 — Step 2 test-runner warning.** It also fires when `scripts.test` contains npm init's placeholder
  `no test specified`. The e2e sentence becomes: the gate allowlist has no e2e member, so an e2e suite
  runs only if the project's `test` script (or an explicit `--gates` entry) runs it.
- **G13 — CHANGELOG.** The emptied `[Unreleased]` keeps its heading and guidance comment and drops its
  three empty group headings. `[6.13.0]` carries the actual bump date.
- **G14 — BUILD.md.** The coverage and grep evidence go to the build note and SHIP.md (see Evals).

## Review dispositions — GATE 2 fix round (the human chose "fix all 10")

`REVIEW.md` iteration 1 raised 3 floor-gate findings (R1–R3) and 7 advisory ones (R4–R10). At GATE 2 the
human chose to fix all ten and re-verify, and to promote the proposed lesson. The promotion runs after
this round's review, because a canon write inside the round would read as a scope escape at regress.

- **R1 — a section can be hidden from a renderer.** `sectionsOf` becomes span-aware: a `##` line inside
  one of these spans is content, not a heading:
  - a fenced block, opened by a line whose text starts with three or more backticks or tildes, and closed
    by a matching fence line indented at most three columns deeper than its opener, or by EOF;
  - an HTML comment opened at the start of a line, closed at the first `-->`;
  - a `<pre>` / `<script>` / `<style>` / `<textarea>` block, closed by its end tag.

  Rule 1 REDs `section` for any template section whose `##` line sits inside such a span, naming the
  heading's line and the span's opening line. Required sections, duplicates and the section bodies are
  all read from the span-aware view, so the checker and a renderer agree on which sections exist. The
  contract and header drop the false "one fail-open" sentence. They state the real bounds instead:
  - the span scanner is a conservative model of CommonMark, so a fence left open inside a list item hides
    later headings, which fails closed;
  - HTML blocks that end at a blank line (types 6 and 7) and setext headings are not modeled. An
    unmodeled setext heading fails closed, because the section reads as missing;
  - there is no reference-parser differential (`spec-ac-grammar-differential`).

- **R2 — "exactly one verify line".** A verify-like line becomes any continuation whose text starts with
  `verify` and a colon, after an optional list marker (`-`, `*`, `+` or `1.`) and optional emphasis or
  code marks (`*`, `_`, `` ` ``). So `**verify:**`, `1. verify:` and a bare `verify:` all count toward the
  one. The contract states exactly that set.
- **R3 — the opt-in switch.** The switch becomes a RAW line test over the frontmatter block
  (`/^spec_template[ \t]*:/m`). A key line the field parser drops (a lone CR, U+2028 or U+2029 in it)
  therefore still selects the rules, and rule 7 REDs it because the value is unreadable. `parseSpec`
  gains a `raw` field for this, and nothing else about it changes.
- **R4 — the echo.** The rule-7 RED no longer echoes the value; it gives the value's length. An unknown
  id is still named, because it has already matched `[a-z0-9-]`.
- **R5–R9 — wording.**
  - R5: "the ONLY source" becomes "the intended source", labeled advisory.
  - R6: the stale counts are corrected: "the four floor ops" and "the three read-only modes".
  - R7: the CHANGELOG entry now says `pharn-pipeline/` holds grillers only.
  - R8: README :421 and the `pharn-loop.md` description now allow for a SPEC that was never approved.
  - R9: the Step 2 warning says PHARN's gate discovery finds no npm `test` script, and names `--gates`
    for projects that use another runner.
- **R10 — P3.** The template rules move to `pharn/floor/spec-template-core.mjs`, pure functions that
  return `{kind, detail}` findings, and `check-spec.mjs` imports them. Two consequences:
  - `check-loop-fresh.test.mjs`'s sandbox list and this feature's install-tree test must copy the new
    module;
  - the generated README floor-checker count moves from 68 to 69 (`docs:generate`).

  `check-spec.mjs` keeps the CLI, the pin and the state logic, and `--template-ref` resolves the
  template path through the core's registry.

- **Tests added this round** (in `RULE_CASES` and `GREEN_CASES`):
  - `section` REDs for the reviewer's cross-section fence and for an HTML comment spanning a heading;
  - GREEN for a fence opened and closed inside Constraints that contains a `## Example` line, and for a
    fence inside an AC item;
  - `ac` REDs for each R2 spelling;
  - `template` REDs for a CR in the key line (R3);
  - a check that the rule-7 RED carries no value text (R4).

## Review dispositions — iteration 2 (folded in after the fix round's re-review)

The re-review confirmed R1–R7, R9 and R10 fixed and R8 only partly fixed. It also found four defects the
fix round introduced. All were fixed within the human's "fix all" and "iterate until done" direction, and
each code fix was mutation-tested.

- **N1:** a hidden template heading REDs only when that section has no visible occurrence, so a fenced
  example that quotes `## Scope` is GREEN.
- **N2:** a column-0 `<!-->` or `<!--->` closes on its own line.
- **N3:** a `verify:` line inside a code block in a criterion still counts (fail-closed). This is now
  documented as a trap in the core header, the contract and the template guidance.
- **N4:** the raw switch is exactly `^spec_template:`, so `spec_template :` is a legacy near-miss.
- **R8:** the two remaining unconditional revert sentences in `pharn-loop.md` now allow a never-approved
  SPEC.
- **R9:** the CHANGELOG entry now says the warning comes from gate discovery.

Review iteration 3 found no remaining defect.

## Human-applied follow-ups (trusted docs — hook-protected, never agent-written)

- **`LIMITS.md`** (near §1d): _"A valid AC grammar means the AC is PHRASED testably — not that any test
  exists, runs, or passes."_ Also recommended: _"The template rules are opt-in by the `spec_template`
  frontmatter key; a SPEC without it validates under the legacy four-section rule."_
- **`pharn/ARCHITECTURE.md §4`**: add `spec-template` to the `pharn-contracts` list (and note the
  `templates/` subdirectory).
- **`pharn/ARCHITECTURE.md §6`**: the spec row's key field could name `spec_template` (provenance).

## Named residuals and follow-ups (not built here)

- `/pharn-plan` Step 2 (`pharn-plan.md:94`) names four SPEC sections; a templated SPEC's Assumptions /
  Scenarios / Data are not named there (out of scope per the brief).
- Required-section emptiness: `## Intent` / `## Constraints` / `## Assumptions` may be empty. The
  approved rules cover only the optional sections, plus AC (≥1 item) and Scope (≥1 non-goal). No
  triggering failure (P7).
- Unfilled `<placeholder>` text passes every rule that checks presence (for example `Given <state>`).
- An AC written inside a fenced block counts as an AC (the line grammar's one fail-open shape).
- `spec-ac-grammar-differential`: no reference-parser (markdown-it) differential pins the AC grammar to
  CommonMark (G3 / L55).
- A near-miss opt-in key (`spec-template:`, `Spec_Template:`) selects the legacy path silently (G6).
- A marker spelled outside the G4 set is not counted.
- User template override is the next increment.

## Open questions (HALT)

**All three resolved at GATE 1 by the human (2026-09-23), each on the recommended option, and the plan was
approved as written:** (a) `pharn/pharn-contracts/templates/spec-template.md`; (b) checker constants
citing the contract; (c) add `not approved` to the loop record's `spec:` set. The options as presented:

- **(a) Template path.** Recommended: `pharn/pharn-contracts/templates/spec-template.md`. It is installed
  (contracts are copied whole and recursively since pharn-cli 0.5.0), it is not counted as a contract by
  the catalog (files only), and it is harmless to validate. Alternatives:
  - `pharn/floor/templates/spec-template.md`: installed, but the floor holds checkers;
  - the brief's `pharn/pharn-pipeline/templates/`: never installed, so it would need a pharn-cli change,
    a `MIN_CLI` bump and a publish before merge.
- **(b) Rule source.** Recommended: checker constants citing the contract, as the brief proposes.
  Deriving the rules from the template is the override increment's job (P7).
- **(c) The loop record's `spec:` line for S6b.** Its closed set (`approved by the model` /
  `reverted to Draft` / `revert failed`, `pharn-loop.md:453-454` and `:680-681`) has no truthful value for
  a SPEC that was never approved. S6b hits that on EVERY stop; S6 already hits it when it stops after a
  Draft. Recommended: add a fourth value, `not approved`, at those two places. Alternative: leave it as a
  named follow-up and keep the loop change to the row alone.
