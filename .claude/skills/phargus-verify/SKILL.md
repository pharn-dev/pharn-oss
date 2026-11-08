---
name: phargus-verify
description: Verify a Node.js performance or memory fix by comparing Phargus measurements before and after the change. Use when deciding whether a runtime change helped, regressed, or remains inconclusive.
license: Apache-2.0
compatibility: Node.js >=22.18.0; before/after Phargus data and measurement conditions.
---

# Phargus Verify

Determine whether the requested change achieved its runtime goal.
Read [verification](references/verification.md) and [data semantics](references/data.md).
Use [tools](references/tools.md) for capture, summarize and compare.

1. Establish the goal and baseline before editing code or running the after measurement.
   Resolve this skill's absolute directory; invoke its scripts/phargus.mjs there.
2. Record workload, concurrency, requests, warmupMs, durationMs, nodeVersion, machine,
   intervalMs and windowMs in capture conditions. Record application/config revisions.
3. Reproduce matching conditions after the change. Keep both data files and manifests.
4. Run compare with both manifests. Different conditions, missing data, truncation or
   unknown loss yield an inconclusive result; obtain a controlled raw capture to resolve
   it. Live capture stops at 10,000 events by default: for a high-rate service pass
   --max-events or a shorter --duration-ms. compare reads files without an event-count cap.
5. For comparable measurements, assess deltas against the goal and inspect collateral
   heap/RSS, GC and backpressure changes. Repeat if normal variation can change the verdict.

Return before/after values, conditions, quality and a justified verdict with remaining
uncertainty. A smaller number under lower load does not establish improvement. Read
[compatibility](references/compatibility.md) before requesting unsupported profiling.

Example request: "Verify that replacing this synchronous handler improved runtime latency."
