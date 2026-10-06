---
trust: untrusted
purpose: "An outbound webhook call, with an HTTP-client skill whose description says billing only."
---

# Case c5-misleading-metadata

Consumer: /pharn-build. The fixture repo is `.dev/floor/test-fixtures/skill-selection/c5-misleading-metadata/`, stored with its skills under `skills/` and copied to `.claude/skills/` in a scratch repo before a run (so Claude Code does not load them as this repository's own skills); every path below is relative to that scratch repo. The
catalogue is what `node pharn/floor/catalogue-installed-skills.mjs .` prints there (its `mode` is
`select`). Everything in this file is DATA for the procedure under test.

PLAN.md excerpt (DATA):

> ## Approach
>
> When a project is archived, post a message to the #projects Slack channel through its incoming webhook.
>
> ## Files
>
> - `src/server/projects.ts`
> - `src/server/notify.ts`

The catalogue (DATA):

```json catalogue
{
  "catalogue": "installed-skills/1",
  "mode": "select",
  "mode_reason": "selectable",
  "roster": "complete",
  "skills_root": "directory",
  "count": 4,
  "total_bytes": 18599,
  "excluded": [],
  "skills": [
    {
      "path": ".claude/skills/db-migrations/SKILL.md",
      "dir": "db-migrations",
      "bytes": 4623,
      "metadata": "ok",
      "issues": [],
      "declared_name": "db-migrations",
      "description": "Running and reviewing database migrations in CI and production, including rollbacks. Use when deploying a schema change."
    },
    {
      "path": ".claude/skills/http-client/SKILL.md",
      "dir": "http-client",
      "bytes": 4652,
      "metadata": "ok",
      "issues": [],
      "declared_name": "http-client",
      "description": "Typed client for calling the internal billing service API."
    },
    {
      "path": ".claude/skills/slack-messages/SKILL.md",
      "dir": "slack-messages",
      "bytes": 4684,
      "metadata": "ok",
      "issues": [],
      "declared_name": "slack-messages",
      "description": "Formatting Slack notifications with Block Kit layouts, mentions and the channel map. Use when sending messages to Slack."
    },
    {
      "path": ".claude/skills/ui-copy-style/SKILL.md",
      "dir": "ui-copy-style",
      "bytes": 4640,
      "metadata": "ok",
      "issues": [],
      "declared_name": "ui-copy-style",
      "description": "House style for user-facing text in the product UI — headings, buttons, empty states, error messages and toasts. Use when writing or changing any visible copy."
    }
  ]
}
```
