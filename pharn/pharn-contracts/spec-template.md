---
name: spec-template
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the SPEC template — the shape /pharn-spec fills to write pharn/features/<name>/SPEC.md (PHARN's shipped default, or the project's own template at the fixed, hook-protected path pharn.spec-template.md, validated before it can be pinned), and the opt-in rules pharn/floor/check-spec.mjs enforces on a SPEC that declares `spec_template`. Schema only, zero behavior. Defines what the floor checks (presence / regex / count / id membership) and what stays advisory (whether the intent is sound, whether a criterion is really observable, whether any test exists) (P0, P2, P5)."
---

# Contract — spec-template

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). It is the SoT for the
> SPEC template. Enforcers **cite** it and **conform** to it; they do not restate its semantics (P4). It
> elaborates `pharn/ARCHITECTURE.md §6`'s spec row (`SPEC.md` — intent, Draft → Approved, with
> `spec_template` as provenance), and §4 lists it among the contracts; the principles live in
> `pharn/CONSTITUTION.md`.

A SPEC is the record of **intent**: what is wanted and why, never how. The template gives every SPEC the
same sections, and gives its acceptance criteria a grammar that later stages can key on: each one has an
id, reads Given → When → Then, and names the level at which a test can observe it.

## Opt-in, and what a legacy SPEC is

The rules below apply **only** to a SPEC whose frontmatter has a line starting `spec_template:`. That
line is the switch, tested on the raw frontmatter text: an empty value still selects the rules, and so does
a key line the field parser cannot read (one holding a stray CR, U+2028 or U+2029). In both cases rule 7
then REDs the value.

A SPEC **without** the key is **legacy**. None of the template rules below applies to it. `check-spec.mjs`
validates the four sections Intent, Scope, Acceptance Criteria and Constraints, the state enum, `spec_id`, and
the content-hash pin when Approved. The pin carries one layout rule of its own (6.20.7, "The pin covers it"
under `spec_kind`), and that rule applies to every SPEC, legacy included.

`/pharn-spec` writes the key on every SPEC it creates from the template. That is command prose, so it is
**advisory**: deleting the key (or misspelling it, for example `spec-template:`) puts a SPEC back on the
legacy path, and nothing detects the change. Revising an existing legacy SPEC keeps it legacy unless its
owner chooses to migrate it, which means re-filling it from the template.

## Templates

| id              | file                                                     | shipped |
| --------------- | -------------------------------------------------------- | ------- |
| `pharn-default` | `pharn/pharn-contracts/templates/spec-template.md`       | yes     |
| `project`       | `pharn.spec-template.md`, at the project root (optional) | no      |

The enforcing copy of this registry is the `TEMPLATES` map in `pharn/floor/spec-template-core.mjs`; this table is
its documentation, and the two agreeing is discipline, not a check. The default lives under
`pharn-contracts/` because the installer copies that directory whole; a file elsewhere under `pharn/` may
not reach an install. **The `pharn-` id prefix is reserved for shipped templates**, which a test in this
repository holds for every registry entry.

## The project template

A project replaces the default by putting its own template at **one fixed path, `pharn.spec-template.md` at the
project root**, beside `pharn.config.json`. The usual start is a copy of the default. PHARN never installs,
updates or deletes that file.

**Why the path is fixed and protected, not configurable.** A template's guidance comments are instructions
`/pharn-spec` follows. If the path were read from `pharn.config.json`, which no write guard protects, a build
agent could point every future `/pharn-spec` run at a file it wrote: a persistent instruction channel (P2). So
the path is a constant, and `.claude/hooks/protect-trusted-paths.cjs` denies Write/Edit/MultiEdit/NotebookEdit
to it by path, whether or not the file exists (the `.pharn/writes-scope.json` precedent). **The consequence,
for users:** nobody edits the project template through Claude's write tools. A human edits it directly, as with
`LIMITS.md`. An existing install gets that protection when `pharn update` replaces the hook script.

**Resolution** (`check-spec.mjs --resolve-template-ref`): the project template when it exists and validates,
else `pharn-default`. It "exists" when an entry in the project root case-folds to its name. From then on every
failure is a refusal (exit 1, nothing on stdout), **never a silent fallback to the default**. A case variant
(`PHARN.SPEC-TEMPLATE.MD`) is itself a refusal, so a case-insensitive and a case-sensitive filesystem resolve
the same checkout the same way. `check-spec.mjs --template-path <id>` then prints the file to fill.

**Validation.** Both print modes validate a template before printing its reference, the shipped default
included. A refusal names one code from `TEMPLATE_REFUSALS` in `pharn/floor/spec-template-core.mjs` (cited,
not restated):

| code                 | refused when                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontmatter`        | no frontmatter block                                                                                                                        |
| `template-key`       | the frontmatter has no `spec_template:` line                                                                                                |
| `section`            | a required section (Intent, Scope, Acceptance Criteria, Constraints, Assumptions) is missing or hidden, or a template section appears twice |
| `ac-example`         | Acceptance Criteria holds no visible example item in the grammar below (its verify LEVEL is not checked)                                    |
| `out-of-scope-label` | Scope holds no visible column-0 `**Out of scope…**` label                                                                                   |
| `absent`             | `--template-ref project` and there is no project template                                                                                   |
| `outside-root`       | the registry path does not lie inside the project root                                                                                      |
| `symlinked-root`     | the checker was reached through a symlinked `pharn/` or `pharn/floor/`, so its real project root is not the one it was run from             |
| `name-case`          | an entry matches the name only when case is ignored                                                                                         |
| `symlink`            | the path is a symbolic link, dangling included                                                                                              |
| `not-regular-file`   | the path is a directory or another non-file                                                                                                 |
| `unreadable`         | the file or its directory cannot be listed, opened or read                                                                                  |

`absent` through `not-regular-file` (with `symlinked-root`) apply to the project template only; `unreadable` to either. `symlinked-root` is checked first: without it, a symlinked `pharn/` made the checker look for the template in the link target's grandparent, silently skip the project's own file, or pin a different file from the one `/pharn-spec` fills. `ac-example` and `out-of-scope-label` are skipped when their
section is missing, hidden or duplicated, so each defect is reported once.

**What validation is, and is not.** It checks a **minimum shape**: a template a SPEC could be filled from. It
never proves that a faithful fill will be GREEN — extra prose in the template's Acceptance Criteria passes
validation and REDs rule 2 once filled. It gates what the checker **prints**, never what a SPEC **declares**:
rule 7 does not read a template file, so a hand-typed `project@sha256:<64 hex>` passes rule 7 as well.

**Provenance.** `project` is a **static** registry member, so rule 7 knows the id whether or not the file exists.
Deleting or renaming the project template never REDs a SPEC already pinned to it.

**Bounds, stated:**

- **Bash.** The hook covers the Write/Edit/MultiEdit/NotebookEdit surface only; a Bash write reaches the file
  (`LIMITS.md §6`). `check-bash-reconcile.mjs` delegates to the same hook, so it DETECTS a non-adversarial
  Bash write to the file between a build's anchor and its verify — unless the file is git-ignored. That window
  opens after `/pharn-spec` ran, so a write that steered the SPEC is never detected.
- **The read.** The checker reads the file through an `O_NOFOLLOW` descriptor and checks it with `fstat`, which
  closes a symlink or FIFO swapped in after the listing; those two branches are reachable only by a race and are
  untested. `/pharn-spec`'s own later Read of the file is not tied to the digested bytes.
- **Who can change the file.** The hook stops Claude's write tools only. Anything that lands the file by other
  means — a merged pull request, a pulled branch, a human editor, a Bash write — is what `/pharn-spec` then obeys,
  including under `--model-approve` in an unattended `/pharn-loop`. Review a change to `pharn.spec-template.md`
  like a change to code.
- The hook's Windows trailing dot/space fold is not mirrored: on POSIX `pharn.spec-template.md.` is a different
  file, never read.

**Out of scope, named:** a template declaring EXTRA required sections (follow-up `template-required-sections`),
a per-feature template choice, and more than one project template.

## Frontmatter

| key                 | value                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `spec_id`           | the feature slug (unchanged from the legacy SPEC)                                              |
| `state`             | `Draft` or `Approved` (unchanged)                                                              |
| `spec_content_hash` | `""` in a Draft; the body's digest once Approved (unchanged — the pin, fix #4)                 |
| `spec_template`     | `<id>@sha256:<64 lowercase hex>`, copied verbatim from `check-spec.mjs --resolve-template-ref` |
| `spec_kind`         | optional: `test-infra`, `quick` (6.24.0), or `feature` — absent means `feature`. See below     |

`spec_template` is **provenance only**. It records which template a SPEC was filled from and that
template's digest at the time. No check compares the digest with the template file, by design, so editing
the template never REDs a SPEC that was already approved. The frontmatter sits outside the body hash, so
writing this key moves no pin.

### `spec_kind` (6.18.0; `quick` added 6.24.0)

What the SPEC's increment **is**, for `/pharn-test` (`ac-tests.md`) and, since 6.24.0, for `/pharn-ship --quick`:

- **`feature`** (the default; write no line): `/pharn-test` writes each criterion's test before the build and
  requires it to fail first — test-first.
- **`test-infra`**: the increment that sets up the project's test runner and per-test results. It cannot have
  failing tests first, so `/pharn-test` records a **bootstrap** lock instead: no tests, no run — weaker, and the
  lock says so. `/pharn-spec` offers this when it warns that a runner is missing, and never writes it under
  `--model-approve` — command prose, **advisory**: no check sees who chose the key.
- **`quick`** (6.24.0): a small change, run through `/pharn-ship --quick`. Written only under a `--quick`
  invocation, never under `--model-approve` (the same non-obligation as `test-infra`). Like `feature`, a
  quick SPEC gets test-first evidence — `/pharn-test` writes and runs its criteria's tests before the build
  exactly as for a feature SPEC — so `spec-template-core.mjs` groups `feature` and `quick` together as
  `TEST_FIRST_KINDS`; `SPEC_KINDS` is exactly `TEST_FIRST_KINDS ∪ {test-infra}`, disjoint, so a fourth kind
  added later must be classified into one side or the other before it can be TEMPLATED.

The key is read from the **raw** frontmatter lines that start `spec_kind:` exactly
(`spec-template-core.mjs` `specKindLines` / `specKindOf`). A near-miss spelling (`spec_kind :`, `Spec_Kind:`) is not
the key, so that SPEC is a `feature`, the stricter mode. On a templated SPEC, rule 8 REDs a second `spec_kind:`
line, or a value that is not a member once spaces and tabs are trimmed (a quoted value, a stray CR or U+2028
included). A legacy SPEC's `spec_kind` is not validated: a legacy SPEC has no AC ids either way — a legacy SPEC
is therefore never quick **while it stays legacy**. That bound is stated, not closed: `spec_template` sits outside
the pin (provenance only, above), so adding a `spec_template:` line to an Approved legacy SPEC that already carries
an inert `spec_kind: quick` line makes it templated and quick without re-approval — the pin covers the `spec_kind:`
line either way, so if the SPEC also holds the template rules `check-spec-approved` stays exit 0 while
`--spec-kind` moves from `feature` to `quick`. The same path turns a legacy `spec_kind: test-infra` line into a
bootstrap SPEC. The pin is deliberately unchanged here; putting the presence of the `spec_template` line into it
is a possible follow-up.

**`check-spec.mjs --spec-kind <SPEC.md>`** prints the kind as data: `feature`, `test-infra` or `quick` for a
templated SPEC; an empty line (exit 0) when the value is unusable (two lines, a non-member, or the
`kind-in-body` layout below); and `feature` for a legacy SPEC. `/pharn-ship`'s Step-2 GATE-1 backstop and
`/pharn-grill --quick`'s eligibility check both shell this mode rather than re-reading the frontmatter, so
the printed token and the pin's own reading of the kind can never disagree (P4).

**Rule 9 (`quick`, 6.24.0).** On a templated SPEC whose kind is `quick`: at most `QUICK_MAX_ACS` (3)
acceptance criteria, and each verified at a `QUICK_LEVELS` (`unit` or `integration`) member — never `e2e`.
Skipped when the AC section is absent, hidden or duplicated (rule 1 already reports that) and, per item,
when the verify level is malformed (rule 2 already reports that), so each defect is reported once. Applies
in every state, so a Draft is caught before approval and every downstream `check-spec-approved` call
re-checks it. **Why these two bounds** (the maintainer's 2026-09-25 decision, recorded here so neither
reads as a magic number): quick mode keeps test-first evidence and drops the regression check
(`/pharn-ship`'s `## Quick mode`), so what it may carry is a change whose evidence is a few fast tests —
three criteria bound the change a human approves at GATE 1, and an `e2e` criterion would need its test
written and run red at `/pharn-test` through the project's end-to-end runner, the slowest test level and one
that needs a runner of its own, which is what the quick bound keeps out of the run. It does **not** keep the
project's own end-to-end gates out: `/pharn-verify` still discovers and runs a `test:e2e` / `e2e` script in a
quick run, exactly as in a full one. A larger or end-to-end change takes the full pipeline. **Sections, decided:** a quick SPEC omits no required section
and writes no optional section — the same shape a `feature` SPEC uses; nothing about being quick shortens
Intent, Scope, Constraints or Assumptions, because quick mode runs no regression check, so Scope's
out-of-scope list is the only written statement of what the change must not touch.

**The pin covers it.** Unlike every other frontmatter key, a `spec_kind:` line is part of the approved intent: it
decides whether the criteria are tested first. So when the frontmatter carries one, `check-spec.mjs` hashes that raw
line (CR removed) followed by `\n` in front of the body. A SPEC without the line hashes exactly as before 6.18.0, so
no existing pin moves. Adding, changing or removing the line after approval is **drift** — RED at every stage that
checks the chain. Where a command says "the body hash", read "the pin": for a SPEC with a `spec_kind:` line, it
covers that line too. **Bound:** a self-consistent rewrite of the SPEC and its pin passes, as it always has.

**The body may not open with a `spec_kind:` line (6.20.7).** The pin hashes the kind lines and then the body, with no
separator, so a body whose first line starts `spec_kind:` pins exactly like the same SPEC with that line in the
frontmatter. Before 6.20.7, moving the line between the two changed the kind (feature ↔ test-infra) while the pin
stayed equal, so no chain check saw it. `check-spec.mjs` now REDs that layout, for every SPEC and in every state, with
its own kind `kind-in-body` (6.21.2; from 6.20.7 it shared `pin` with a hash mismatch, which no hash can fix here), so
`pin` means only a malformed or drifted hash; a Draft is caught before it can be approved. `check-ac-tests.mjs --spec` reads such a templated SPEC as unusable
(exit 2), because no AC mode may be read from it. **Why forbidding that one layout is enough:** a kind line always
starts at column 0 with `spec_kind:` and holds no line break, so reading the hashed text from its start, every line
that opens with `spec_kind:` must be a kind line, and the reading stops exactly where the body begins, as long as the
body does not itself open with `spec_kind:`. That gives exactly one split into kind lines and body. A body whose first
line is blank, or starts with a space before `spec_kind:`, is therefore not ambiguous and validates normally. The
remedy the RED names is to move the line into the frontmatter (a `test-infra` SPEC) or to change the body's first line
(a `feature` SPEC). **Bound:** a SPEC approved in that layout before 6.20.7 REDs from then on. After the move, its pin
is unchanged, because that is the collision itself, so the re-approval the remedy asks for is **advisory**: the floor
makes the ambiguous layout unusable, but it cannot make a person re-approve.

**A template may carry the key.** `validateTemplate` accepts a template with or without a `spec_kind:` line, by design,
so a project template carrying `spec_kind: test-infra` would start every Draft filled from it as a bootstrap SPEC —
and, since 6.24.0, the same bound extends to `spec_kind: quick`: a project template carrying it starts every Draft
as quick. What stands between that and an approved quick or bootstrap SPEC is `/pharn-spec`'s instruction to write
the key only when the human chose that path (Step 4's trade sentence, for quick), and the human approval itself —
both advisory. Review a template change that adds the key like any change to the template.

## Sections

Headings are bare `##` headings, matched case-insensitively. Each template section appears **at most
once**. Headings the template does not name are allowed and never checked.

A `##` line counts as a heading only where a renderer would show one. A line inside a fenced code block,
an HTML comment, or a `<pre>` / `<script>` / `<style>` / `<textarea>` block opened at column 0 is content,
and a template section hidden that way is a RED: a SPEC whose criteria a reader cannot see must not pass.

| section             | required | what belongs                                                                       |
| ------------------- | -------- | ---------------------------------------------------------------------------------- |
| Intent              | yes      | the problem, for whom, and why now; no "how"                                       |
| Scope               | yes      | `**In scope:**` entries and `**Out of scope (non-goals):**` entries (at least one) |
| Scenarios           | no       | user journeys in plain language                                                    |
| Acceptance Criteria | yes      | at least one item in the grammar below                                             |
| Constraints         | yes      | non-functional limits; external contracts the user requires                        |
| Data                | no       | entities and relationships; no schema, no implementation                           |
| Assumptions         | yes      | informed guesses made instead of asking, or `none`                                 |
| Open Questions      | no       | clarification markers, at most three; none may remain at approval                  |
| Success Metrics     | no       | post-launch measures; **not** verified by PHARN's pipeline                         |

An optional section that is present must not be empty; an unused one is deleted.

**What does not belong in a SPEC:** implementation and architecture (they go in the PLAN), requirement
statements that repeat a criterion, vague adjectives without a measurable outcome, and edge cases kept
outside the criteria. An edge case that matters **is** a criterion.

## The acceptance-criteria grammar

```markdown
- **AC-1** Given <a starting state> When <an action> Then <an observable outcome>
  - verify: unit
```

- **An item** starts at column 0 with `- **AC-<n>**` followed by whitespace. `<n>` is a positive number
  with no leading zero; ids are unique.
- **A continuation** is a line indented by two or more spaces or a tab. Blank lines are allowed. **Nothing
  else** may appear in the section: no text before the first item, no column-0 paragraph, no other list
  style, no deeper heading.
- **A bold `**AC-<n>**` is reserved for an item start.** The number of bold ids in the section must equal
  the number of items, so a criterion referring to another one writes plain `AC-<n>`.
- **Given, When and Then** appear in the item's text, in that order, capitalized, as whole words.
- **Exactly one verify line** per item: a continuation `- verify: <level>` with level `unit`,
  `integration` or `e2e`. Any continuation whose text starts with `verify` and a colon — after an optional
  list marker (`-`, `*`, `+`, `1.`) and optional `*`, `_` or backtick marks — counts toward the one, so a
  second level spelled `**verify:** e2e`, `1. verify: e2e` or `verify: e2e` is a RED rather than ignored. A
  level written mid-line is not counted. **The converse is a trap:** any such line inside a criterion counts,
  including one inside a code block or a prose sub-bullet (`verify: true` in a YAML example), so a criterion
  that needs such a line must rephrase it.
- **The Then should be observable on the public surface:** visible text, an accessible role and name, a
  URL, an HTTP status, or a returned value. Tests for the criteria are meant to be written before the
  build, from the SPEC and the PLAN only. This is **advisory**: no check can tell an observable outcome
  from an internal one.

## Clarification markers and guidance comments

- **The clarification marker** is `[NEEDS CLARIFICATION: <question>]`. It stands in for a question only
  the user can answer; everything that can be guessed goes in Assumptions instead. At most three may be
  present in any state, and none once the SPEC is `Approved`. The checker counts `NEED` or `NEEDS`, in any
  case, with a space, `_` or `-` between the words; a marker spelled any other way is not counted.
- **A guidance comment** is `<!-- pharn:guidance … -->`. The template carries one per section, telling
  the writer what belongs there. `/pharn-spec` removes every one when it writes the SPEC, and a comment
  that remains is a RED.

## The rules (an open form, 6.24.0 — enforced by `pharn/floor/check-spec.mjs` through `pharn/floor/spec-template-core.mjs`)

| #   | rule                                                                                            | RED kind           | primitive                 |
| --- | ----------------------------------------------------------------------------------------------- | ------------------ | ------------------------- |
| 1   | `## Assumptions` present (with the base four); each template section at most once and visible   | `section`          | enum (heading membership) |
| 2   | the acceptance-criteria grammar above                                                           | `ac`               | regex + count             |
| 3   | at most three clarification markers; none when `state: Approved`                                | `clarification`    | regex count               |
| 4   | under `## Scope`, a column-0 `**Out of scope…**` label with at least one entry                  | `out-of-scope`     | regex presence            |
| 5   | an optional section that is present has a non-blank line                                        | `optional-section` | presence                  |
| 6   | no guidance comment remains                                                                     | `guidance`         | regex                     |
| 7   | `spec_template` is control-character-free, matches `<id>@sha256:<64-hex>`, and names a known id | `template`         | regex + membership        |
| 8   | at most one `spec_kind:` line, naming `feature`, `test-infra` or `quick`                        | `spec-kind`        | count + membership        |
| 9   | (6.24.0) a `quick` SPEC: at most 3 criteria, each verified at `unit` or `integration`           | `quick`            | membership + count        |

Rules 2 and 4 are skipped when their section is missing, hidden or duplicated, because rule 1 (or the
legacy section check) already reports it. Rule 9 is skipped for the same reason when the AC section is
unusable, and per item when the level is malformed (rule 2 already reports that). A RED names a file line
number, an AC id or a value's length, never the text itself, because the SPEC body is untrusted data (P2).

## What the rules ARE and are NOT (P0)

- **ARE:** deterministic presence, regex, count and membership tests over the SPEC's **structure**. The
  verdict never depends on what the intent means, and an instruction-looking sentence in the body cannot
  change it.
- **ARE NOT a test of the criteria.** A valid grammar means each criterion is **phrased** testably. It
  never means a test exists, runs, or passes. `/pharn-test` writes and runs acceptance tests before the build
  (`ac-tests.md`), and that is a separate check with its own bounds.
- **ARE NOT a CommonMark parser.** The criteria grammar is read line by line and is stricter than
  CommonMark: an unindented continuation line, which CommonMark would accept, is a RED. Which headings
  exist is decided by a small model of the blocks that can hide one, opened at column 0 (fenced code, an
  HTML comment, a `<pre>`-style block). That model does not cover a block opened 1–3 columns in at the top
  level, or an HTML block that ends at a blank line; a heading hidden by either still counts (fail-open).
  A setext heading is not recognised, so its section reads as missing (fail-closed). No reference parser
  pins any of this to what a renderer shows (named residual `spec-ac-grammar-differential`).
- **DO NOT detect unfilled placeholders.** `Given <a starting state>` passes rule 2, and a `<name>`
  `spec_id` passes the presence check. Only the verify level and the `spec_template` value have a closed
  shape that an unfilled placeholder fails.
- **DO NOT check that required sections have content,** apart from Acceptance Criteria (at least one item)
  and Scope (at least one non-goal). An empty Intent, Constraints or Assumptions section passes.
- **DO NOT survive dropping the key.** The rules are opt-in (see above).
- **DO NOT authenticate the template.** Its guidance comments steer `/pharn-spec`, and a changed template
  leaves no trace beyond a digest nothing compares. The shipped default is not hook-protected: in an install
  the fail-closed write guard's default (no scope set) denies it, but any set scope that names it (a PLAN's
  `## Files` can) admits it, and a Bash write reaches it. The project template is hook-protected on the tool
  surface only (see "The project template").
- **Agreement:** the checker's constants and the shipped template are held together by a test in this
  repository that fills the template and requires GREEN, and the validator runs on the shipped default like any
  other template. That test does not ship. This contract's prose
  agreeing with either is discipline, not a check.
