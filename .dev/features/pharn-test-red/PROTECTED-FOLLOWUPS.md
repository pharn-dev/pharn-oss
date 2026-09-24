# PROTECTED-FOLLOWUPS — pharn-test-red

Edits this increment would need in files the agent may not write (fix #2, `.claude/hooks/protect-trusted-paths.cjs`).
A human applies them outside the agent loop. **Nothing in the trusted docs is made false by 6.18.0.** None of them
says the pin covers the body only, and none says the AC tests are never run. The one item below refines a follow-up
item 03 already recorded.

## `pharn/ARCHITECTURE.md` §6 — the `test` row item 03 proposed

Item 03's `.dev/features/pharn-test-stage/PROTECTED-FOLLOWUPS.md` suggests this row for the spine table:

```text
| test    | `AC-TESTS.lock.json` | the AC tests' digests, bound to `AC-TESTS.md` and the spec pin (6.17.0) |
```

Since 6.18.0 the lock also carries the red-run evidence, and a bootstrap mode. When applying item 03's row, use
instead:

```text
| test    | `AC-TESTS.lock.json` | the AC tests' digests and the red-run evidence (each AC's test failed before the build), or a bootstrap record for a `spec_kind: test-infra` SPEC (6.18.0) |
```

As item 03 notes, an `ARCHITECTURE.md` edit changes its content hash, so every open dev `PLAN.md` pinned to
`edc3d07d…ce091a5d2c` HALTs at `/pharn-dev-build` and needs a re-plan. Apply it between queue items.
