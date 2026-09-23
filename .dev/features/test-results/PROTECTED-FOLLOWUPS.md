# PROTECTED-FOLLOWUPS — test-results

Edits this increment needs in a file the agent may not write (fix #2, `.claude/hooks/protect-trusted-paths.cjs`).
A human applies them outside the agent loop. Nothing is inaccurate without them; the file is only incomplete.

## `pharn/ARCHITECTURE.md` §4 — the `pharn-contracts` list (`:131-135`)

The layer tree enumerates every contract, and `test-results-record` (new in 6.15.0) is not in it. The
precedents are `04857b3` (`gate-run-record`) and `d96ef03` (`spec-template`), both of which edited this list.

```diff
 pharn/pharn-contracts   L-1  schemas only, ZERO behavior: finding-shape (incl. severity enum),
                              eval-format, seam-config, loop-record, ship-briefing, ship-record,
                              cost-ledger, reconciliation-record, regression-report, verify-report,
-                             gate-run-record, spec-template (+ templates/spec-template.md, the
-                             default SPEC template it defines).
+                             gate-run-record, test-results-record, spec-template
+                             (+ templates/spec-template.md, the default SPEC template it defines).
```

**Consequence to know before applying:** editing `pharn/ARCHITECTURE.md` changes its content hash, so every
open dev `PLAN.md` pinned to the current hash (`edc3d07d…ce091a5d2c`) will HALT at `/pharn-dev-build` Step 1
and must be re-planned. Apply it between queue items, not while one is mid-build.
