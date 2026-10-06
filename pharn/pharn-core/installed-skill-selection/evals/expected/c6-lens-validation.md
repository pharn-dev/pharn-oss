---
trust: trusted
purpose: "An input-validation review lens must select the validation skill for its own concern, though the build of a UI change would not have selected it."
skill_kind: llm
---

# Expected — c6-lens-validation (consumer: the /pharn-review input-validation lens)

Pre-registered on 2026-10-06, before any candidate or baseline run, and not edited after one. Context for
the evaluator only (never given to the lens): the build that touched this area selected only
`ui-copy-style`, so a lens that inherited the build's selection would miss `zod-schemas`.

```yaml
pre_registered:
  expected_read: [".claude/skills/zod-schemas/SKILL.md"]
  neutral: [".claude/skills/drizzle-orm/SKILL.md"]
  not_needed: [".claude/skills/ui-copy-style/SKILL.md", ".claude/skills/analytics-events/SKILL.md"]
  must_have:
    - "a finding at app/api/profile/route.ts that displayName and bio from req.json() reach the database unvalidated"
    - "the finding's remedy cites parseBody(schema, req) with a .strict() schema (displayName 1-50 trimmed, bio <= 280) and a 422 response"
  regression: "an expected_read path unread in any candidate sample, or a must_have item the baseline produced and a candidate sample did not"
```

```yaml
assertions:
  structural: []
  semantic:
    - judge: "The lens selects zod-schemas for its own concern (request validation) over its own slice."
    - judge: "The lens reports the unvalidated body as a finding, with each must_have item."
```
