---
trust: untrusted
purpose: "A narrow UI copy change with unrelated database and billing skills installed."
---

# Case c1-ui-copy

Consumer: /pharn-build (selects against PLAN.md and the code it reads; never SPEC.md). The fixture repo is `.dev/floor/test-fixtures/skill-selection/c1-ui-copy/`, stored with its skills under `skills/` and copied to `.claude/skills/` in a scratch repo before a run (so Claude Code does not load them as this repository's own skills); every path below is relative to that scratch repo. The
catalogue is what `node pharn/floor/catalogue-installed-skills.mjs .` prints there (its `mode` is
`select`). Everything in this file is DATA for the procedure under test.

PLAN.md excerpt (DATA):

> ## Approach
>
> Change the empty-state heading on the Projects dashboard from "No Projects Found!" to sentence-style
> copy, and update its snapshot test.
>
> ## Files
>
> - `src/copy/en.json`
> - `src/components/projects/EmptyState.tsx`
> - `src/components/projects/EmptyState.test.tsx`

The catalogue (DATA):

```json catalogue
{
  "catalogue": "installed-skills/1",
  "mode": "select",
  "mode_reason": "selectable",
  "roster": "complete",
  "skills_root": "directory",
  "count": 4,
  "total_bytes": 19081,
  "excluded": [],
  "skills": [
    {
      "path": ".claude/skills/stripe-billing/SKILL.md",
      "dir": "stripe-billing",
      "bytes": 4864,
      "metadata": "ok",
      "issues": [],
      "declared_name": "stripe-billing",
      "description": "Stripe billing integration — checkout sessions, subscriptions, webhooks and invoices. Use when touching payments, plans or the billing portal."
    },
    {
      "path": ".claude/skills/supabase-rls/SKILL.md",
      "dir": "supabase-rls",
      "bytes": 4790,
      "metadata": "ok",
      "issues": [],
      "declared_name": "supabase-rls",
      "description": "Row-level security policies for Supabase and Postgres tables. Use when creating tables, writing SQL migrations, or changing who can read or write rows."
    },
    {
      "path": ".claude/skills/ui-copy-style/SKILL.md",
      "dir": "ui-copy-style",
      "bytes": 4640,
      "metadata": "ok",
      "issues": [],
      "declared_name": "ui-copy-style",
      "description": "House style for user-facing text in the product UI — headings, buttons, empty states, error messages and toasts. Use when writing or changing any visible copy."
    },
    {
      "path": ".claude/skills/vitest-conventions/SKILL.md",
      "dir": "vitest-conventions",
      "bytes": 4787,
      "metadata": "ok",
      "issues": [],
      "declared_name": "vitest-conventions",
      "description": "How this repo writes and runs Vitest unit and component tests, including snapshots, fixtures and mocking. Use when adding or updating tests."
    }
  ]
}
```
