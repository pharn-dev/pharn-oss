---
spec_id: <name>
state: Draft
spec_content_hash: ""
spec_template: <the line check-spec.mjs --resolve-template-ref prints>
---

<!-- pharn:guidance
A PHARN SPEC template: the one PHARN ships, or a project's own copy of it at pharn.spec-template.md in the
project root. Its shape is defined by pharn/pharn-contracts/spec-template.md, and pharn/floor/check-spec.mjs
enforces it on any SPEC whose frontmatter carries `spec_template`.

How /pharn-spec uses this file:
- copy it to pharn/features/<name>/SPEC.md and fill every <placeholder>;
- set `spec_template` to the exact line `node pharn/floor/check-spec.mjs --resolve-template-ref` prints,
  and never compute or type that value by hand;
- delete an optional section you do not use, because an empty optional section is RED;
- remove EVERY pharn:guidance comment, this one included, because a remaining one is RED.

A SPEC records INTENT: what is wanted and why. It never records HOW. Implementation, architecture, file
layout, libraries and data schemas belong in PLAN.md, which is written from this SPEC later.
-->

## Intent

<!-- pharn:guidance
The problem, who has it, and why it matters now. Say what outcome the user wants, in their terms.
Does NOT belong here: how it will be built, a component or file list, or a list of requirements (the
criteria go in Acceptance Criteria).
-->

<the problem, for whom, and why now>

## Scope

<!-- pharn:guidance
What this feature includes, and what it deliberately does not. The non-goals are required: at least one
entry under the Out-of-scope label, so a reader knows where the feature stops. Keep both labels exactly as
written.
-->

**In scope:**

- <what this feature includes>

**Out of scope (non-goals):**

- <something this feature deliberately does not do>

## Scenarios

<!-- pharn:guidance
OPTIONAL. User journeys in plain language: who does what, in what order, and what they see. Use it when the
criteria alone do not show how the pieces fit together. Delete the section if you do not use it.
-->

- <a user journey, in plain language>

## Acceptance Criteria

<!-- pharn:guidance
At least one criterion. Each one is exactly this shape: one list item, then one indented verify line.

  - **AC-1** Given <a starting state> When <an action> Then <an observable outcome>
    - verify: <unit | integration | e2e>

- The id is `AC-` and a positive number with no leading zero. Every id is unique. Bold `**AC-<n>**` is
  reserved for the start of an item, so refer to another criterion as plain AC-<n>.
- Given, When and Then appear in that order, capitalized. A clause may continue on lines indented by
  two spaces.
- The Then must be OBSERVABLE on the public surface: visible text, an accessible role and name, a URL,
  an HTTP status, or a returned value. Tests for these criteria are to be written BEFORE the build, from
  the SPEC and the PLAN only, so a Then that needs the implementation to be known cannot be tested.
- verify names the level at which a test can observe the Then: unit, integration, or e2e. Any other line
  in the criterion that starts with "verify" and a colon counts as a second verify line, even inside a
  code block, so reword such a line.
- Does NOT belong here: implementation or architecture (PLAN.md), requirement statements that repeat a
  criterion, vague adjectives ("fast", "intuitive", "robust") without a measurable Then, and edge cases
  kept outside the criteria. An edge case that matters IS a criterion.
- Nothing else goes in this section: no prose between items, and no other kind of list.
-->

- **AC-1** Given <a starting state> When <an action> Then <an observable outcome>
  - verify: <unit | integration | e2e>

## Constraints

<!-- pharn:guidance
Non-functional limits the result must respect (performance budgets, supported platforms, accessibility
level, data retention) and external contracts the user requires (an API, a file format, a regulation).
Does NOT belong here: design choices the PLAN is free to make.
-->

- <a limit or external contract the result must respect>

## Data

<!-- pharn:guidance
OPTIONAL. The entities the feature deals with and how they relate, in domain terms. Does NOT belong here:
a schema, table or column names, or any implementation. Delete the section if you do not use it.
-->

- <an entity and how it relates to the others>

## Assumptions

<!-- pharn:guidance
The informed guesses made instead of asking, one per line, so a reader can challenge them. Write `none`
if there are none. A genuine ambiguity that cannot be guessed without inventing intent goes in Open
Questions instead.
-->

- <an informed guess made instead of asking, or none>

## Open Questions

<!-- pharn:guidance
OPTIONAL. The questions only the user can answer, each written as the clarification marker that
pharn/pharn-contracts/spec-template.md defines. At most three. A SPEC cannot be approved while any remain.
Delete the section when there are none.
-->

- <a question only the user can answer, written as the contract's clarification marker>

## Success Metrics

<!-- pharn:guidance
OPTIONAL. How success will be judged after launch (adoption, error rate, time saved). These are NOT
verified by PHARN's pipeline; the acceptance criteria are what a build is checked against. Delete the
section if you do not use it.
-->

- <a post-launch measure of success>
