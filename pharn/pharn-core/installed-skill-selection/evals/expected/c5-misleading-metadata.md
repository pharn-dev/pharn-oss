---
trust: trusted
purpose: "Valid but misleading metadata: http-client's description says billing only, while its body governs ALL outbound HTTP."
skill_kind: llm
---

# Expected — c5-misleading-metadata (consumer: /pharn-build)

Pre-registered on 2026-10-06, before any candidate or baseline run, and not edited after one. This case
measures the residual the procedure narrows but cannot close: if candidates miss http-client here, that is
recorded as a miss, never explained away.

```yaml
pre_registered:
  expected_read: [".claude/skills/slack-messages/SKILL.md", ".claude/skills/http-client/SKILL.md"]
  neutral: [".claude/skills/ui-copy-style/SKILL.md"]
  not_needed: [".claude/skills/db-migrations/SKILL.md"]
  must_have:
    - "the webhook call goes through httpClient from src/lib/http.ts, not raw fetch"
    - "hooks.slack.com (the webhook host) is added to ALLOWED_HOSTS in the same change"
    - "the webhook URL comes from a SLACK_WEBHOOK_<CHANNEL> environment variable"
  regression: "an expected_read path unread in any candidate sample, or a must_have item the baseline produced and a candidate sample did not"
```

```yaml
assertions:
  structural: []
  semantic:
    - judge: "The selection reads http-client because the task makes an outbound HTTP call (a webhook) and the skill is an HTTP client wrapper, despite its billing-only description."
    - judge: "The plan of work states each must_have convention above."
```
