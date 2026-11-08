# Investigate memory growth

Start with raw NDJSON when possible: heapUsed, heapTotal, rss, external, arrayBuffers,
heapSpaces and GC kinds. A sawtooth heap can be normal garbage collection. Growth during
warmup, caches reaching a bound, or increased concurrent requests can explain a trend.
Examine repeated comparable workload cycles and the baseline following observed GC.
An RSS rise with stable heap can involve buffers, native allocations or allocator behavior.

Analyze existing snapshots first. The bundled heap command uses the application's
@pharn-dev/phargus/analyzer worker pool, which streams parsing and enforces its limits. The default
snapshot cap is 256 MiB. Summaries group object names by count and selfSize; diffs show
countDelta/selfSizeDelta. They do not expose dominators, retained sizes or retaining paths.
A positive diff is a lead to investigate, not proof of a leak or its retaining code.

If another capture is needed, run takeHeapSnapshot({ dir }) in the monitored application
with an existing, writable directory. Calling it in the helper captures the helper's
heap. There is no dashboard snapshot endpoint or arbitrary-PID attachment API. Taking
a snapshot blocks the target event loop and can require roughly another heap's memory;
choose a local reproduction or an explicitly intended production capture accordingly.

sampleAllocations({ durationMs, samplingInterval, limit }) also runs in the application's
main isolate. It returns sites with sampled bytes still alive when sampling stops, not
all allocated bytes or an allocation-rate total. Defaults: 1000 ms, 32768-byte sampling,
20 sites. line is 1-based, 0 if unknown. Use a temporary application-side capture recipe
for the user's requested profiling operation and remove it when the investigation ends.

Report separate observed heap/RSS/external trajectories, workload and GC context, growing
object-name groups or sampled sites, limitations and a controlled follow-up experiment.
Confirm a suspected fix using repeated comparable workload cycles, not a single low RSS.
