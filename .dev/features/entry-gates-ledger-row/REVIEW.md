# REVIEW — entry-gates-ledger-row

Floor first: `node pharn/floor/validate.mjs .` → **GREEN** (37 capabilities).

The four lenses and a correctness pass were run by an **independent reviewer**, a fresh Opus agent with no shared
context. It ran read-only, and its probes wrote only to a temporary directory. The orchestrator wrote this file from
its report. Everything below is **advisory** (a model's judgment of severity). Free-text fields are quoted DATA.

The reviewer checked the seven claimed requirements against the code:

- control behaviour is unchanged (finding 7 is the one theoretical escape);
- the pre-6.48.0 ledger keys are unchanged;
- binding is sound, except a hand-edited conflicting start (finding 4);
- the quantities are kept distinct, with the exceptions in findings 2, 3 and 5;
- the checker recomputes the view from the file's own facts, and historical ledgers stay GREEN;
- writes are safe, but the read side follows an intermediate symlinked directory (finding 6);
- the P0 wording is mostly honest, with the exceptions in findings 1 and 2.

It found no instruction-like content in the reviewed files (L-trust). It judged the pure view sharing a module with
thin I/O acceptable, because the I/O is delegated to `stage-work.mjs` (L-axis).

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/entry-gates-ledger-row-2026-10-06.md:84"
  problem: "The overhead estimate omits the module load each entry-gates process now pays for entry-observations.mjs (≈1.4–2.1 ms per process, ≈6–8 ms across a typical run), so 'well under 1 ms of CPU' understates it."
  evidence: "probe: import(entry-observations.mjs) after the HEAD module graph: 2.14, 1.42, 2.07, 1.52, 1.55 ms"
  reproduced: yes
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-cost-ledger.mjs (withEntry admission) / pharn/floor/entry-observations.mjs (lifetime)"
  problem: "Admission tests `ts`, which for start/wait events is the call's BEGIN; a start/wait line written after run-stop is admitted, and a non-started start whose end_ts is past the cutoff yields a measured lifetime ending after the cutoff — contrary to the CHANGELOG/contract wording."
  evidence: "run-stop 10:10, start{outcome:no-gates, end_ts:10:30} -> lifetime measured, end_ts 10:30; wait ts 10:09 end_ts 10:40 admitted"
  reproduced: yes
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/entry-observations.mjs (waits_union_ms, segments_overlap_marked_stages_ms)"
  problem: "waits_union_ms is 0 when no wait was recorded, and the overlap is 0 when no executions row is measured — 0 where nothing was observed, against 'unknown is null, never 0'."
  evidence: "a started invocation with no wait events and executions=null -> waits_union_ms: 0, segments_overlap_marked_stages_ms: 0"
  reproduced: yes
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/entry-observations.mjs (bound nonces)"
  problem: "A nonce with two different start records naming different runs is bound to every run either names, and its segments and unions are still reported (coverage all) instead of being left unattached."
  evidence: "start{run seq 1} + start{run seq 9} for one nonce -> invocations: 1, lifetime conflicting-records, segments_union_ms 298000"
  reproduced: yes
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/entry-observations.mjs (segment kind mismatch)"
  problem: "A begin/end pair disagreeing on `kind` is marked conflicting but is not counted in conflicting_events and does not make the lifetime unmeasured, so an observed conflict reads as missing data."
  evidence: "begin kind runner, end kind takeover -> segment conflicting, conflicting_events 0, lifetime incomplete"
  reproduced: yes
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/stage-work.mjs (readJsonLines) / pharn/floor/entry-observations.mjs (currentRunStart)"
  problem: "Reads apply O_NOFOLLOW to the last component only, so a symlinked .pharn/cost or feature directory is followed; currentRunStart's doc says 'never-following' and the PLAN's trust audit says 'an lstat walk'. Read-only impact; readWork has the same precedent."
  evidence: ".pharn/cost -> symlink; readEntryEvents(...) -> 1 record"
  reproduced: yes
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/entry-gates.mjs (observe call sites)"
  problem: "Observation arguments (freshId/nowIso/monoMs) are evaluated outside observe's try, so a throw there would escape observedWait after its document, or land before the runner's try (no result.json), or turn --abort's exit 0 into a refusal."
  evidence: "`call: freshId()` / `const segment = freshId()` evaluated by the caller; needs randomBytes or toISOString to throw"
  reproduced: no
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/entry-gates.test.mjs (telemetry write that fails)"
  problem: "The byte-for-byte test compares the new CLI with appends failing against the new CLI with appends succeeding, not against pre-6.48.0 output, and checks --abort's exit but not its stdout; the CHANGELOG wording can be read as a comparison with the old release."
  evidence: "assert.equal(failing.a.status, ok.a.status) — no a.stdout comparison"
  reproduced: no
```

## Verdict

**GREEN at the floor; 0 blocking, 0 important, 8 minor advisory findings.** All 8 are small and local: findings 2–7
are code tweaks, and findings 1, 2, 6 and 8 involve wording. None touches a control path or an existing ledger key.

No lesson is proposed for canon. No finding shows a recurring mechanism beyond lessons already in canon. Finding 2 is
an application slip of L58 (it asked "which part may still change" of segment ends but not of start/wait end
timestamps). Finding 7 sits next to L62. Neither is a second occurrence of a new mechanism.
