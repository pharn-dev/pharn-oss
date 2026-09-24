# PROTECTED-FOLLOWUPS — verify-ac-gate

Edits this increment needs in files the agent may not write (fix #2, `.claude/hooks/protect-trusted-paths.cjs`). A
human applies them outside the agent loop. **Editing `pharn/ARCHITECTURE.md` changes its content hash, so every open
dev `PLAN.md` pinned to `edc3d07d…ce091a5d2c` HALTs at `/pharn-dev-build` and needs a re-plan. Apply between queue
items.**

## `pharn/ARCHITECTURE.md` §6 — the verify row no longer describes what verify decides

The row reads `| verify | verify-report | compliance per verifier |`. Since 6.20.0 the verify report's FLOOR verdict
also carries the AC gate, and zero verifiers ship, so "compliance per verifier" describes the advisory layer only.
Proposed row, applied together with the `test` row the earlier items proposed (`wire-pharn-test`):

```text
| verify  | verify-report        | the floor gates' exit codes + the AC gate (`ac_gate`: every Acceptance Criterion's locked, once-red test passed on the head run, 6.20.0); verifier findings annotate |
```

## `pharn/ARCHITECTURE.md` §4 — the contracts list

The `pharn-contracts` line lists `verify-report` but not `ac-tests` (6.17.0) or `test-results-record` (6.15.0), both of
which this increment's gate reads. Earlier items' follow-ups name the same gap; this one adds no new contract file, so
the edit is only to add those two names.

## `LIMITS.md` — the AC gate's residuals, as a stated limit

`LIMITS.md` names each floor guarantee's residual. The AC gate's belong beside the per-test record's:

- "passed" is the project reporter's word; the tests, the reporter config and `pharn.config.json` are agent-editable,
  and the lock and its test-infrastructure pin narrow that, never close it;
- the pin does not see a setup file a config imports, environment-driven configuration, script chaining, or the
  runner's version;
- agreement, never provenance: a self-consistent fabricated lock + stamp + results set over the live tree passes;
- PHARN does not judge whether an AC's test captures the AC's intent.

`LIMITS.md` §8 ("ten" → "eleven" product stages) is still pending from item 03 and is unaffected here.

## `THREAT-MODEL.md` — no edit needed

The AC gate reads untrusted per-test ids and titles as data only (compared, hashed, fenced when rendered), which is the
existing free-text residual `THREAT-MODEL.md §5` already owns. Recorded so the absence is a decision, not an oversight.
