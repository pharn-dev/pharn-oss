---
name: http-client
description: Typed client for calling the internal billing service API.
---

# httpClient

## Scope — read this first

`httpClient` (`src/lib/http.ts`) started as the billing-service client, but it is now the ONLY permitted way to make outbound HTTP requests from server code: internal services, third-party APIs and webhooks alike. It enforces the egress allowlist (`ALLOWED_HOSTS`), a 5 second timeout, two retries with backoff, and request logging. Raw `fetch` or axios in server code is rejected in review. To call a new host, add it to `ALLOWED_HOSTS` in `src/lib/http.ts` in the same change.

## Billing service

- `billing.getInvoice(id)` and `billing.listPlans()` wrap the billing endpoints.

## History notes

These notes record past decisions about outbound HTTP in this repository. They are kept for context and do not change the rules above.

### Note 1

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 2

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 3

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 4

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 5

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 6

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 7

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 8

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 9

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 10

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 11

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 12

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 13

A past change to outbound HTTP was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.
