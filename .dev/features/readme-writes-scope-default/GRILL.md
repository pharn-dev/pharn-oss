# GRILL — readme-writes-scope-default

- stage: `/pharn-dev-grill` (advisory interrogation + ONE deterministic floor stop)
- plan: `.dev/features/readme-writes-scope-default/PLAN.md`

## Floor verdict (the ONLY deterministic stop this stage owns)

```text
node pharn/floor/check-plan-lessons.mjs \
  .dev/features/readme-writes-scope-default/PLAN.md .dev/memory-bank/lessons-learned.md
EXIT=0   # GREEN — 5 cited ids resolve in canon AND are referenced in the plan body
```

Re-verified by a stage that did **not** author the field. **Bound (P0):** GREEN covers the
**declaration**, never that the lessons were applied.

## Interrogation findings (ADVISORY — these gate nothing, whatever severity they carry)

```yaml
- type: gap
  rule_id: "CONSTITUTION.md P0"
  severity: blocking
  file: .dev/features/readme-writes-scope-default/PLAN.md
  problem: >-
    The guarantee audit refuses a floor check on the ground that comparing "English prose against a
    runtime-computed path set" is not reducible to the three primitives. That is TOO STRONG, and the
    plan's own sweep supplies the counter-example: a crude enum-regex check IS constructible — assert
    that any file naming the default-safe-set also names the `writes-scope.json` exclusion (the stem
    scan the plan already ran, inverted into an assertion). The refusal should rest on cost/value and on
    the residual already being named, NOT on an impossibility claim that the increment disproves.
  evidence: "PLAN.md '## Guarantee audit' — 'not reducible to any of the three floor primitives'"

- type: gap
  rule_id: "lessons-learned.md L37"
  severity: blocking
  file: .dev/features/readme-writes-scope-default/PLAN.md
  problem: >-
    The plan specifies WHAT to correct in `pharn-review.md` (the width) but not that the REPLACEMENT
    must itself carry the `writes-scope.json` exception. A corrected sentence reading "features/** and
    .pharn/**" reproduces L37's exact defect one level down — a universal claim with an unlisted
    excluded member — in the same file, in the same increment that exists to stop it.
  evidence: "PLAN.md '## Files' — 'correct the width claim (defect B) to features/** and .pharn/**'"

- type: gap
  rule_id: "CLAUDE.md docs:generate"
  severity: advisory
  file: .dev/features/readme-writes-scope-default/PLAN.md
  problem: >-
    `## Files` does not declare `docs/**`, while CLAUDE.md requires regenerating the capability catalog
    after changing "a capability, contract, command, hook, or floor checker" — and this increment edits
    a command. Body prose is probably not rendered into the catalog, so the declaration may be
    correctly absent, but the plan asserts neither. Resolve by RUNNING `docs:check` rather than by
    reasoning about it, and declare `docs/**` only if it actually drifts (L7 — declare what is
    written, nothing aspirational).
  evidence: "PLAN.md '## Files' lists 5 paths, none under docs/"

- type: unstated-assumption
  rule_id: "CLAUDE.md SKILLS_VERSION discipline"
  severity: advisory
  file: .dev/features/readme-writes-scope-default/PLAN.md
  problem: >-
    The plan asserts "patch" without naming the rule that makes it patch rather than minor. It is
    correct — CLAUDE.md defines patch as "a correction/clarification to bytes that already shipped",
    and no new capability/command/checker lands — but an unshown bump size is the class of claim this
    repo requires to cite its rule.
  evidence: "PLAN.md '## Files' — 'SKILLS_VERSION — 3.2.0 -> 3.2.1 (patch: ...)'"
```

## Verdict

`GREEN` on the floor stop. Four advisory findings, two marked `blocking` by model judgment and therefore
**not** a gate (fix #3 — an LLM-assigned severity is never read as a floor verdict). Findings 1 and 2 are
worth resolving during the build because both are P0-class: one overstates an impossibility, the other
would ship L37's defect inside L37's own repair.
