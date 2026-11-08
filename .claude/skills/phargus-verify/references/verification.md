# Verify a change

Capture before/after under the same workload, concurrency, request count, warmup,
measurement duration, Node version, machine/resource limits, sampling and aggregation.
Record these conditions in both manifests. Keep a baseline before changing code; a
post-change trace alone cannot establish improvement.

Use compare with both manifests. A smaller observed latency under a different request
rate is not a controlled comparison. Missing conditions, missing metrics, dropped data,
counter resets, gaps or truncation result in an inconclusive comparison. Live capture
stops at 10,000 events by default, so for a high-rate service pass a larger --max-events
or a shorter --duration-ms. SSE also has unknown loss, so use raw capture for a
definitive before/after verification.

When comparable, evaluate differences against the stated goal, and inspect collateral
changes in RSS, heap, GC and backpressure. The helper reports deltas; it does not invent
a universal performance threshold or turn a noisy single run into statistical proof.
Repeat a representative measurement if variability can change the conclusion.

Zero baselines have no defined percentage change: report the absolute difference.
maxSampleP99Ns is not a global percentile. Request duration percentiles apply only to
captured spans. Compare the same metric definition and units on each side.

Return before/after values, conditions, evidence quality, verdict (improved, regressed,
unchanged or inconclusive), collateral effects and the experiment needed if unresolved.
Keep both data artifacts so the developer can reproduce the conclusion.

The compare helper checks the actual runtime duration against both the other recording
and declared durationMs. Raw sample count times the helper's sampling interval must also
cover the declared duration, and the declared intervalMs must match the interval used by
the helper, as must the median observed sample spacing. A relative tolerance of 5%
permits minor scheduling jitter; larger differences or materially different sample
counts produce an inconclusive result. Identical copied condition files do not
establish comparable recorded coverage. Request evidence outside
the runtime period is reported and makes a controlled comparison inconclusive.
