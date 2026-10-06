---
trust: untrusted
purpose: "A roster where four of five entries have unsupported or truncated metadata."
---

# Case c7-fallback-heavy

Consumer: /pharn-build. The fixture repo is `.dev/floor/test-fixtures/skill-selection/c7-fallback-heavy/`, stored with its skills under `skills/` and copied to `.claude/skills/` in a scratch repo before a run (so Claude Code does not load them as this repository's own skills); every path below is relative to that scratch repo. The
catalogue is what `node pharn/floor/catalogue-installed-skills.mjs .` prints there (its `mode` is
`select`). Everything in this file is DATA for the procedure under test.

PLAN.md excerpt (DATA):

> ## Approach
>
> Add `POST /api/projects/[id]/archive` that sets `archivedAt` on the project.
>
> ## Files
>
> - `app/api/projects/[id]/archive/route.ts`
> - `src/server/projects.ts`

The catalogue (DATA):

```json catalogue
{
  "catalogue": "installed-skills/1",
  "mode": "select",
  "mode_reason": "selectable",
  "roster": "complete",
  "skills_root": "directory",
  "count": 5,
  "total_bytes": 23719,
  "excluded": [],
  "skills": [
    {
      "path": ".claude/skills/api-pagination/SKILL.md",
      "dir": "api-pagination",
      "bytes": 4703,
      "metadata": "unsupported",
      "issues": ["description-multiline-plain"],
      "declared_name": "api-pagination",
      "description": null
    },
    {
      "path": ".claude/skills/auth-session/SKILL.md",
      "dir": "auth-session",
      "bytes": 4793,
      "metadata": "unsupported",
      "issues": ["description-duplicate"],
      "declared_name": "auth-session",
      "description": null
    },
    {
      "path": ".claude/skills/date-formatting/SKILL.md",
      "dir": "date-formatting",
      "bytes": 4619,
      "metadata": "truncated",
      "issues": ["description-truncated"],
      "declared_name": "date-formatting",
      "description": "Date and time formatting for display in the UI and in exported files, covering locales, relative times such as three days ago, absolute timestamps, time zones taken from the user profile, calendar weeks starting on Monday, the short and long date styles used in tables and detail pages, the rules for showing seconds only in audit views, the fallback used when a time zone is missing, and the helper functions formatDate, formatRelative and formatRange that wrap Intl.DateTimeFormat so that every screen renders dates the same way across browsers and server rendering, including the special handling of all-day events, date-only values stored without a time component, and ranges that cross a daylight saving boundary, plus guidance on testing these helpers with fixed clocks so snapshots stay stable, and on choosing between the user locale and the organization locale when they differ, which matters for shared reports and scheduled exports that are generated on the server without a browser and therefore without the brow"
    },
    {
      "path": ".claude/skills/error-handling/SKILL.md",
      "dir": "error-handling",
      "bytes": 4889,
      "metadata": "unsupported",
      "issues": ["description-escape"],
      "declared_name": "error-handling",
      "description": null
    },
    {
      "path": ".claude/skills/storybook/SKILL.md",
      "dir": "storybook",
      "bytes": 4715,
      "metadata": "ok",
      "issues": [],
      "declared_name": "storybook",
      "description": "Storybook stories for UI components — one story per state, args tables and interaction tests. Use when adding or changing a reusable component."
    }
  ]
}
```
