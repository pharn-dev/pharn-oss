# Data exports

These rules apply to every CSV or XLSX export of customer data.

- Personal columns (email, phone, address) are masked unless the requester holds the `admin:export-pii` permission.
- Exports run as background jobs through `enqueueJob("export", params)`. They are never generated inline inside a request handler, because large tables time out.
- The finished file is delivered through a signed download link that expires after 24 hours.
- Every export writes an audit log entry `export.created` with the requester and the row count.

## History notes

These notes record past decisions about data exports in this repository. They are kept for context and do not change the rules above.

### Note 1

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 2

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 3

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 4

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 5

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 6

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 7

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 8

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 9

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 10

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 11

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 12

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 13

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 14

A past change to data exports was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.
