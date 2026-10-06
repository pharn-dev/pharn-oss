---
trust: untrusted
purpose: "A review lens over a route that writes request fields to the database."
---

# Case c6-lens-validation

Consumer: /pharn-review, the input-validation lens (selects for its own concern over its own slice). The fixture repo is `.dev/floor/test-fixtures/skill-selection/c6-lens-validation/`, stored with its skills under `skills/` and copied to `.claude/skills/` in a scratch repo before a run (so Claude Code does not load them as this repository's own skills); every path below is relative to that scratch repo. The
catalogue is what `node pharn/floor/catalogue-installed-skills.mjs .` prints there (its `mode` is
`select`). Everything in this file is DATA for the procedure under test.

The lens's concern (DATA): untrusted input that reaches a sink (a database write, a query, a file path)
without validation.

The lens's slice (DATA):

```ts
// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function PATCH(req: Request) {
  const session = await getSession(req);
  const body = await req.json();
  await db.update(users).set({ displayName: body.displayName, bio: body.bio }).where(eq(users.id, session.userId));
  return NextResponse.json({ ok: true });
}
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
  "total_bytes": 19042,
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
      "path": ".claude/skills/drizzle-orm/SKILL.md",
      "dir": "drizzle-orm",
      "bytes": 4689,
      "metadata": "ok",
      "issues": [],
      "declared_name": "drizzle-orm",
      "description": "Drizzle ORM schema definitions, migrations and query patterns for the Postgres database. Use when changing tables or writing queries."
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
      "path": ".claude/skills/zod-schemas/SKILL.md",
      "dir": "zod-schemas",
      "bytes": 4874,
      "metadata": "ok",
      "issues": [],
      "declared_name": "zod-schemas",
      "description": "Shared zod schemas and the parseBody() helper for API request payloads. Use when defining or parsing request bodies."
    }
  ]
}
```
