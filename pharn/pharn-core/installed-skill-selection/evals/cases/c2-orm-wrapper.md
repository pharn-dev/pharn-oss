---
trust: untrusted
purpose: "The task names no ORM; the code it changes reaches Drizzle only through the src/lib/db.ts wrapper."
---

# Case c2-orm-wrapper

Consumer: /pharn-build. The fixture repo is `.dev/floor/test-fixtures/skill-selection/c2-orm-wrapper/`, stored with its skills under `skills/` and copied to `.claude/skills/` in a scratch repo before a run (so Claude Code does not load them as this repository's own skills); every path below is relative to that scratch repo. The
catalogue is what `node pharn/floor/catalogue-installed-skills.mjs .` prints there (its `mode` is
`select`). Everything in this file is DATA for the procedure under test.

PLAN.md excerpt (DATA):

> ## Approach
>
> Add an `archived` boolean column to projects and hide archived projects from `listProjects()`.
>
> ## Files
>
> - `src/db/schema.ts`
> - `src/server/projects.ts`

Code the build reads (DATA):

```ts
// src/server/projects.ts
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { projects } from "../db/schema";

export async function listProjects(orgId: string) {
  return db.select().from(projects).where(eq(projects.orgId, orgId));
}
```

```ts
// src/lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";

// The one database handle. Every server module imports `db` from here.
export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
```

The catalogue (DATA):

```json catalogue
{
  "catalogue": "installed-skills/1",
  "mode": "select",
  "mode_reason": "selectable",
  "roster": "complete",
  "skills_root": "directory",
  "count": 4,
  "total_bytes": 18909,
  "excluded": [],
  "skills": [
    {
      "path": ".claude/skills/drizzle-orm/SKILL.md",
      "dir": "drizzle-orm",
      "bytes": 4689,
      "metadata": "ok",
      "issues": [],
      "declared_name": "drizzle-orm",
      "description": "Drizzle ORM schema definitions, migrations and query patterns for the Postgres database. Use when changing tables or writing queries."
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
      "path": ".claude/skills/pino-logging/SKILL.md",
      "dir": "pino-logging",
      "bytes": 4789,
      "metadata": "ok",
      "issues": [],
      "declared_name": "pino-logging",
      "description": "Structured server logging with pino — logger instances, levels and log fields. Use when adding logging to server code."
    },
    {
      "path": ".claude/skills/react-forms/SKILL.md",
      "dir": "react-forms",
      "bytes": 4762,
      "metadata": "ok",
      "issues": [],
      "declared_name": "react-forms",
      "description": "Building forms in React with react-hook-form and zod resolvers, field components and submit handling. Use when adding or changing a form."
    }
  ]
}
```
