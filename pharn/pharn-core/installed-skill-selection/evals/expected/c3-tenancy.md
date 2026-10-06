---
trust: trusted
purpose: "Cross-cutting tenancy convention: a new read route must be scoped to the caller's organization."
skill_kind: llm
---

# Expected — c3-tenancy (consumer: /pharn-build)

Pre-registered on 2026-10-06, before any candidate or baseline run, and not edited after one.

```yaml
pre_registered:
  expected_read: [".claude/skills/tenant-scoping/SKILL.md", ".claude/skills/route-handlers/SKILL.md"]
  neutral: []
  not_needed: [".claude/skills/email-templates/SKILL.md", ".claude/skills/analytics-events/SKILL.md"]
  must_have:
    - "the invoice query goes through withTenant(session) (scoped by session.orgId)"
    - "an invoice of another organization is answered with 404, not 403"
    - "no orgId is taken from the request"
  regression: "an expected_read path unread in any candidate sample, or a must_have item the baseline produced and a candidate sample did not"
```

```yaml
assertions:
  structural: []
  semantic:
    - judge: "The selection reads tenant-scoping as a cross-cutting data-access concern, although the task text never mentions tenants or organizations."
    - judge: "The plan of work states each must_have convention above."
```
