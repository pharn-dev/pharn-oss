---
name: zod-schemas
description: Shared zod schemas and the parseBody() helper for API request payloads. Use when defining or parsing request bodies.
---

# Request validation

- Every handler that reads a body parses it with `parseBody(schema, req)` from `src/lib/validate.ts`. Never use `await req.json()` fields directly.
- Schemas live in `src/schemas/*.ts` and use `.strict()` so unknown keys are rejected.
- Profile fields: `displayName` is trimmed and 1 to 50 characters; `bio` is at most 280 characters.
- A validation failure is answered with 422 and the field errors.

## History notes

These notes record past decisions about request validation in this repository. They are kept for context and do not change the rules above.

### Note 1

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 2

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 3

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 4

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 5

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 6

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 7

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 8

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 9

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 10

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 11

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 12

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 13

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 14

A past change to request validation was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.
