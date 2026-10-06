---
name: error-handling
description: "Route handler error conventions — wrap handlers in \"withErrors\" and throw HttpError."
---

# Error handling

- Every route handler is exported wrapped: `export const POST = withErrors(async (req) => { ... })`, from `src/lib/errors.ts`.
- Expected failures throw `HttpError(status, code)`; never return a raw 500 string.

## History notes

These notes record past decisions about error handling in this repository. They are kept for context and do not change the rules above.

### Note 1

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 2

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 3

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 4

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 5

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 6

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 7

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 8

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 9

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 10

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 11

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 12

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 13

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 14

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 15

A past change to error handling was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.
