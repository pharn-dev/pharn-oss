---
name: phargus-diagnose
description: Investigate slow requests, event-loop stalls, GC pressure, and stream backpressure using Phargus data. Use for a runtime incident or alert that needs evidence-backed hypotheses and a next experiment.
license: Apache-2.0
compatibility: Node.js >=22.18.0; Phargus NDJSON or a reachable Phargus SSE dashboard.
---

# Phargus Diagnose

Explain the observed incident and choose a measurement that can distinguish its causes.
Read [data semantics](references/data.md) and [diagnosis](references/diagnosis.md).
Use [tools](references/tools.md) to capture or summarize the available source.

1. Establish the affected process, symptom, interval and workload. Resolve the absolute
   directory containing this SKILL.md before invoking its scripts/phargus.mjs.
2. Capture bounded SSE or read the supplied NDJSON. Run summarize and check invalid
   records, gaps, loss, resets and truncation before drawing conclusions. Live capture
   stops at 10,000 events by default (raise --max-events or shorten --duration-ms for a
   high-rate service); summarize reads files without an event-count cap.
3. Compare affected and normal periods. Correlate request duration with event loop,
   GC, memory and backpressure. Retrieve raw data if SSE lacks necessary details.
4. Separate measured observations from hypotheses. Inspect plausible application code
   only when evidence points there; preserve alternatives and uncertainty.
5. Propose the smallest next experiment. When a fix is part of the user's request,
   check its prediction against a comparable before/after measurement.

Return values with units and timestamps, source/quality limits, ranked hypotheses and
the next reproducible measurement. No data means insufficient evidence and a capture
recipe. Read [compatibility](references/compatibility.md) before assuming an Phargus capability.

Example request: "Requests became slow this morning; investigate this Phargus recording."
