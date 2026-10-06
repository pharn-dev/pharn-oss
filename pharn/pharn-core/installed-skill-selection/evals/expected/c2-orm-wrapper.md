---
trust: trusted
purpose: "Indirect dependency: the task names no ORM, but the code reaches Drizzle through the src/lib/db.ts wrapper."
skill_kind: llm
---

# Expected — c2-orm-wrapper (consumer: /pharn-build)

Pre-registered on 2026-10-06, before any candidate or baseline run, and not edited after one.

```yaml
pre_registered:
  expected_read: [".claude/skills/drizzle-orm/SKILL.md"]
  neutral: [".claude/skills/feature-flags/SKILL.md"]
  not_needed: [".claude/skills/react-forms/SKILL.md", ".claude/skills/pino-logging/SKILL.md"]
  must_have:
    - "the schema change ships a migration generated with `npx drizzle-kit generate`, never hand-written"
    - "the plan's `archived` boolean is replaced by (or flagged against) a nullable `archivedAt` timestamp"
    - "the archival filter is applied inside listProjects() with isNull(projects.archivedAt)"
  regression: "an expected_read path unread in any candidate sample, or a must_have item the baseline produced and a candidate sample did not"
```

```yaml
assertions:
  structural: []
  semantic:
    - judge: "The selection reads drizzle-orm because src/server/projects.ts uses the db handle from src/lib/db.ts, which wraps Drizzle — even though no changed path or task word names Drizzle."
    - judge: "The plan of work states each must_have convention above."
```
