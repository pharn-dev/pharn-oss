---
trust: untrusted
purpose: "A new read route in a multi-tenant app; the task text never mentions tenants."
---

# Case c3-tenancy

Consumer: /pharn-build. The fixture repo is `.dev/floor/test-fixtures/skill-selection/c3-tenancy/`, stored with its skills under `skills/` and copied to `.claude/skills/` in a scratch repo before a run (so Claude Code does not load them as this repository's own skills); every path below is relative to that scratch repo. The
catalogue is what `node pharn/floor/catalogue-installed-skills.mjs .` prints there (its `mode` is
`select`). Everything in this file is DATA for the procedure under test.

PLAN.md excerpt (DATA):

> ## Approach
>
> Add `GET /api/invoices/[id]` that returns one invoice as JSON.
>
> ## Files
>
> - `app/api/invoices/[id]/route.ts`

The catalogue (DATA):

```json catalogue
{
  "catalogue": "installed-skills/1",
  "mode": "select",
  "mode_reason": "selectable",
  "roster": "complete",
  "skills_root": "directory",
  "count": 4,
  "total_bytes": 18999,
  "excluded": [],
  "skills": [
    {
      "path": ".claude/skills/analytics-events/SKILL.md",
      "dir": "analytics-events",
      "bytes": 4839,
      "metadata": "ok",
      "issues": [],
      "declared_name": "analytics-events",
      "description": "Product analytics event naming and tracking with track(). Use when adding user-facing interactions that product wants measured."
    },
    {
      "path": ".claude/skills/email-templates/SKILL.md",
      "dir": "email-templates",
      "bytes": 4712,
      "metadata": "ok",
      "issues": [],
      "declared_name": "email-templates",
      "description": "Transactional email templates built with react-email, their layout components and preview server. Use when adding or editing an email."
    },
    {
      "path": ".claude/skills/route-handlers/SKILL.md",
      "dir": "route-handlers",
      "bytes": 4703,
      "metadata": "ok",
      "issues": [],
      "declared_name": "route-handlers",
      "description": "Conventions for Next.js App Router route handlers under app/api — request parsing, responses and status codes. Use when adding or changing an API route."
    },
    {
      "path": ".claude/skills/tenant-scoping/SKILL.md",
      "dir": "tenant-scoping",
      "bytes": 4745,
      "metadata": "ok",
      "issues": [],
      "declared_name": "tenant-scoping",
      "description": "Multi-tenant data access rules for this SaaS — how every query is scoped to the caller's organization. Use for any code that reads or writes customer data."
    }
  ]
}
```
