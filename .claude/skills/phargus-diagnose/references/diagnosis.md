# Diagnose a runtime incident

First establish the affected process, symptom, time interval, source and expected
workload. Read the available data with summarize. Carry the quality fields into the
diagnosis. If there are no observations, return an explicit insufficient-evidence result
and a concrete capture command; do not invent a root cause or make speculative edits.

Compare affected and normal periods under similar traffic. Correlate event-loop max,
max sample p99, observed request duration, GC activity, memory trajectory and backpressure.
These indicate where to investigate; they do not prove which function consumed CPU or
which database call was slow. Phargus has no CPU profiler or outgoing dependency spans.

- Lag and request-duration increases with GC pauses: investigate allocation pressure,
  compare raw GC kinds and memory after GC, then sample allocations if justified.
- Lag increases without a matching GC signal: inspect synchronous work in plausible
  handlers and test a bounded workload; Phargus metrics alone do not locate a CPU stack.
- Request duration rises without lag: examine application-level waiting and dependencies;
  request-level spans cannot divide the wait into database/network components.
- Backpressure increases: retrieve raw hotspot sites, identify the stream writer and
  inspect write/drain handling. A site indicates a write stall, not a proven bottleneck.
- RSS rises: separate heap from external/arrayBuffers using raw data before calling it
  a JavaScript leak. Collector windows do not contain these fields.

Keep observations and hypotheses separate. Link each observation to a record time or
window, give plausible alternatives, and choose the smallest measurement that can
distinguish the leading hypotheses. Locate source code only when supported by a captured
site or an explicitly inspected handler; never fabricate a stack from a latency span.

The result should let a developer act: symptom/interval, concrete values with units,
quality limits, evidence-backed hypotheses and a reproducible next experiment. If the
user asks for a fix, test its causal prediction and verify the resulting measurements.
