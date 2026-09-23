---
name: spec-template
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the SPEC template — the shape /pharn-spec fills to write pharn/features/<name>/SPEC.md, and the opt-in rules pharn/floor/check-spec.mjs enforces on a SPEC that declares `spec_template`. Schema only, zero behavior. Defines what the floor checks (presence / regex / count / id membership) and what stays advisory (whether the intent is sound, whether a criterion is really observable, whether any test exists) (P0, P2, P5)."
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

| id              | file                                               |
| --------------- | -------------------------------------------------- |
| `pharn-default` | `pharn/pharn-contracts/templates/spec-template.md` |

The enforcing copy of this registry is the `TEMPLATES` map in `pharn/floor/spec-template-core.mjs`; this table is
its documentation, and the two agreeing is discipline, not a check. The template lives under
`pharn-contracts/` because the installer copies that directory whole; a file elsewhere under `pharn/` may
not reach an install.

## Frontmatter

| key                 | value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `spec_id`           | the feature slug (unchanged from the legacy SPEC)                                           |
| `state`             | `Draft` or `Approved` (unchanged)                                                           |
| `spec_content_hash` | `""` in a Draft; the body's digest once Approved (unchanged — the pin, fix #4)              |
| `spec_template`     | `<id>@sha256:<64 lowercase hex>`, copied verbatim from `check-spec.mjs --template-ref <id>` |

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
- **DO NOT authenticate the template.** In an install the template sits where the fail-closed write guard's
  default lets an agent write, like every shipped contract; its guidance comments steer `/pharn-spec`, and
  a changed template leaves no trace beyond a digest nothing compares.
- **Agreement:** the checker's constants and the shipped template are held together by a test in this
  repository that fills the template and requires GREEN. That test does not ship. This contract's prose
  agreeing with either is discipline, not a check.
