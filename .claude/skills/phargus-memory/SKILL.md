---
name: phargus-memory
description: Investigate Node.js memory growth with Phargus raw samples, allocation sites, and heap snapshot summaries or diffs. Use for suspected leaks, rising RSS, or determining what memory grew.
license: Apache-2.0
compatibility: Node.js >=22.18.0; raw Phargus data or heap snapshots; a compatible application Phargus installation for heap analysis.
---

# Phargus Memory

Identify the observed memory growth and test whether it persists under comparable work.
Read [memory](references/memory.md) and [data semantics](references/data.md).
Use [tools](references/tools.md) for summary and heap analysis.

1. Resolve this skill's absolute directory. Summarize the recording and establish workload,
   warmup, GC context and data quality. Request raw NDJSON when external/arrayBuffers are missing.
2. Separate heap, RSS and external/buffer growth. Inspect comparable workload cycles and
   observed post-GC baselines before claiming a leak.
3. Analyze supplied snapshots with the heap command and --project pointing to the app.
   Compare object-name counts and self sizes; these are not retaining paths or dominators.
4. If needed, prepare an application-side capture for the user's requested operation.
   Snapshot/allocation APIs run in the monitored process, and snapshot capture pauses it.
   Read [compatibility](references/compatibility.md) before choosing those APIs.
5. Investigate supported sites/object groups and test the suspected correction over
   repeated equivalent workload cycles.

Return measured trajectories, capture/analysis limits, hypotheses and the next controlled
experiment. Existing evidence may identify external pressure without proving a JS leak.

Example request: "RSS doubles after each batch; use these samples and snapshots to investigate."
