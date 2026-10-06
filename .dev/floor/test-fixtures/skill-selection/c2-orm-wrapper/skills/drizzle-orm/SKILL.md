---
name: drizzle-orm
description: Drizzle ORM schema definitions, migrations and query patterns for the Postgres database. Use when changing tables or writing queries.
---

# Drizzle ORM

- The schema lives in `src/db/schema.ts`.
- Every schema change ships a migration generated with `npx drizzle-kit generate`. Never hand-write or edit files under `drizzle/`.
- Queries use the shared `db` exported by `src/lib/db.ts`.
- State flags are nullable timestamps, not booleans: use `archivedAt timestamp` rather than `archived boolean`, so the time of the change is recorded.
- Archival filters (`isNull(projects.archivedAt)`) are applied inside the repository function, never left to callers.

## History notes

These notes record past decisions about the database layer in this repository. They are kept for context and do not change the rules above.

### Note 1

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 2

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 3

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 4

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 5

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 6

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 7

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 8

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 9

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 10

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 11

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 12

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 13

A past change to the database layer was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.
