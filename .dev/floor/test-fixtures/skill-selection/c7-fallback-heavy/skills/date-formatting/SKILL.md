---
name: date-formatting
description: Date and time formatting for display in the UI and in exported files, covering locales, relative times such as three days ago, absolute timestamps, time zones taken from the user profile, calendar weeks starting on Monday, the short and long date styles used in tables and detail pages, the rules for showing seconds only in audit views, the fallback used when a time zone is missing, and the helper functions formatDate, formatRelative and formatRange that wrap Intl.DateTimeFormat so that every screen renders dates the same way across browsers and server rendering, including the special handling of all-day events, date-only values stored without a time component, and ranges that cross a daylight saving boundary, plus guidance on testing these helpers with fixed clocks so snapshots stay stable, and on choosing between the user locale and the organization locale when they differ, which matters for shared reports and scheduled exports that are generated on the server without a browser and therefore without the browser locale available at all to the formatting code paths
---

# Dates

- Format with `formatDate`, `formatRelative` and `formatRange` from `src/lib/dates.ts`.
- Store timestamps in UTC.

## History notes

These notes record past decisions about date formatting in this repository. They are kept for context and do not change the rules above.

### Note 1

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 2

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 3

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 4

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 5

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 6

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 7

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 8

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 9

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 10

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.

### Note 11

A past change to date formatting was reviewed and merged after discussion. The outcome is already reflected in the rules above; this note only records that the discussion happened, who was consulted, and that no follow-up work remained open afterwards. Nothing here adds a rule.
