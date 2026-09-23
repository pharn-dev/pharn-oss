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

A SPEC **without** the key is **legacy**. `check-spec.mjs` validates it exactly as it did before this
contract existed: the four sections Intent, Scope, Acceptance Criteria and Constraints, the state enum,
`spec_id`, and the content-hash pin when Approved. No rule here can RED it.

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

`spec_template` is **provenance only**. It records which template a SPEC was filled from and that
template's digest at the time. No check compares the digest with the template file, by design, so editing
the template never REDs a SPEC that was already approved. The frontmatter sits outside the body hash, so
writing this key moves no pin.

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

## The rules (enforced by `pharn/floor/check-spec.mjs` through `pharn/floor/spec-template-core.mjs`)

| #   | rule                                                                                            | RED kind           | primitive                 |
| --- | ----------------------------------------------------------------------------------------------- | ------------------ | ------------------------- |
| 1   | `## Assumptions` present (with the base four); each template section at most once and visible   | `section`          | enum (heading membership) |
| 2   | the acceptance-criteria grammar above                                                           | `ac`               | regex + count             |
| 3   | at most three clarification markers; none when `state: Approved`                                | `clarification`    | regex count               |
| 4   | under `## Scope`, a column-0 `**Out of scope…**` label with at least one entry                  | `out-of-scope`     | regex presence            |
| 5   | an optional section that is present has a non-blank line                                        | `optional-section` | presence                  |
| 6   | no guidance comment remains                                                                     | `guidance`         | regex                     |
| 7   | `spec_template` is control-character-free, matches `<id>@sha256:<64-hex>`, and names a known id | `template`         | regex + membership        |

Rules 2 and 4 are skipped when their section is missing, hidden or duplicated, because rule 1 (or the
legacy section check) already reports it. A RED names a file line number, an AC id or a value's length,
never the text itself, because the SPEC body is untrusted data (P2).

## What the rules ARE and are NOT (P0)

- **ARE:** deterministic presence, regex, count and membership tests over the SPEC's **structure**. The
  verdict never depends on what the intent means, and an instruction-looking sentence in the body cannot
  change it.
- **ARE NOT a test of the criteria.** A valid grammar means each criterion is **phrased** testably. It
  never means a test exists, runs, or passes. PHARN writes and runs no acceptance tests today.
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
