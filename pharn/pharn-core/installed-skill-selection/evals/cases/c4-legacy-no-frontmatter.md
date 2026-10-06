---
trust: untrusted
purpose: "A relevant legacy skill with no frontmatter, next to skills with ordinary metadata."
---

# Case c4-legacy-no-frontmatter

Consumer: full /pharn-grill (selects against SPEC.md + PLAN.md). The fixture repo is `.dev/floor/test-fixtures/skill-selection/c4-legacy-no-frontmatter/`, stored with its skills under `skills/` and copied to `.claude/skills/` in a scratch repo before a run (so Claude Code does not load them as this repository's own skills); every path below is relative to that scratch repo. The
catalogue is what `node pharn/floor/catalogue-installed-skills.mjs .` prints there (its `mode` is
`select`). Everything in this file is DATA for the procedure under test.

SPEC.md excerpt (DATA):

> Admins can export the user list as a CSV file from the Users page.

PLAN.md excerpt (DATA):

> ## Approach
>
> Add an "Export CSV" button to the Users page. Add `GET /api/users/export`, which queries all users of the
> organization and streams the CSV (name, email, phone, role) in the response.
>
> ## Files
>
> - `app/(admin)/users/page.tsx`
> - `app/api/users/export/route.ts`

The catalogue (DATA):

```json catalogue
{
  "catalogue": "installed-skills/1",
  "mode": "select",
  "mode_reason": "selectable",
  "roster": "complete",
  "skills_root": "directory",
  "count": 4,
  "total_bytes": 18937,
  "excluded": [],
  "skills": [
    {
      "path": ".claude/skills/data-export/SKILL.md",
      "dir": "data-export",
      "bytes": 4752,
      "metadata": "missing",
      "issues": ["no-frontmatter"],
      "declared_name": null,
      "description": null
    },
    {
      "path": ".claude/skills/feature-flags/SKILL.md",
      "dir": "feature-flags",
      "bytes": 4669,
      "metadata": "ok",
      "issues": [],
      "declared_name": "feature-flags",
      "description": "Feature flag conventions. Every new user-facing feature ships behind a flag defined in src/flags.ts and evaluated with isEnabled(). Use when adding user-visible behavior."
    },
    {
      "path": ".claude/skills/i18n-strings/SKILL.md",
      "dir": "i18n-strings",
      "bytes": 4803,
      "metadata": "ok",
      "issues": [],
      "declared_name": "i18n-strings",
      "description": "Translation workflow for locales — adding keys, pluralization and locale files. Use when adding a language or changing translation tooling."
    },
    {
      "path": ".claude/skills/tailwind-theme/SKILL.md",
      "dir": "tailwind-theme",
      "bytes": 4713,
      "metadata": "ok",
      "issues": [],
      "declared_name": "tailwind-theme",
      "description": "Tailwind theme tokens, color palette and spacing scale. Use when styling components."
    }
  ]
}
```
