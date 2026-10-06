---
trust: trusted
purpose: "Fallback-heavy roster: four of five entries have unsupported or truncated metadata, so selection must read them all."
skill_kind: llm
---

# Expected — c7-fallback-heavy (consumer: /pharn-build)

Pre-registered on 2026-10-06, before any candidate or baseline run, and not edited after one. The four
non-`ok` entries are must-read by the procedure whatever their relevance; this case measures that the rule
holds and what it costs.

```yaml
pre_registered:
  expected_read:
    [
      ".claude/skills/error-handling/SKILL.md",
      ".claude/skills/api-pagination/SKILL.md",
      ".claude/skills/auth-session/SKILL.md",
      ".claude/skills/date-formatting/SKILL.md",
    ]
  neutral: []
  not_needed: [".claude/skills/storybook/SKILL.md"]
  must_have:
    - "the route handler is exported wrapped in withErrors() and throws HttpError for expected failures"
    - "the handler calls requireSession(req) and answers 404 when project.orgId differs from session.orgId"
  regression: "an expected_read path unread in any candidate sample, or a must_have item the baseline produced and a candidate sample did not"
```

```yaml
assertions:
  structural: []
  semantic:
    - judge: "Every entry whose metadata is not ok is read in full before any exclusion."
    - judge: "The plan of work states each must_have convention above."
```
