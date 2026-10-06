---
trust: trusted
purpose: "A relevant legacy skill with no frontmatter (metadata missing) must be read before exclusion; the grill must surface its conflicts with the plan."
skill_kind: llm
---

# Expected — c4-legacy-no-frontmatter (consumer: full /pharn-grill)

Pre-registered on 2026-10-06, before any candidate or baseline run, and not edited after one.

```yaml
pre_registered:
  expected_read: [".claude/skills/data-export/SKILL.md", ".claude/skills/feature-flags/SKILL.md"]
  neutral: [".claude/skills/tailwind-theme/SKILL.md", ".claude/skills/i18n-strings/SKILL.md"]
  not_needed: []
  must_have:
    - "a finding that the plan generates the CSV inline in a request handler, against the background-job rule (enqueueJob)"
    - "a finding that personal columns (email, phone) are exported unmasked without the admin:export-pii permission check"
    - "a finding that the new user-facing export is not behind a feature flag"
  regression: "an expected_read path unread in any candidate sample, or a must_have item the baseline produced and a candidate sample did not"
```

```yaml
assertions:
  structural: []
  semantic:
    - judge: "data-export is read in full because its metadata is `missing` (the procedure's must-read rule), not because its name happened to match."
    - judge: "The grill raises each must_have item as an advisory finding."
```
