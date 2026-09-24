# PROTECTED-FOLLOWUPS — wire-pharn-test

Edits this increment needs in files the agent may not write (fix #2, `.claude/hooks/protect-trusted-paths.cjs`). A
human applies them outside the agent loop. **Editing `pharn/ARCHITECTURE.md` changes its content hash, so every open
dev `PLAN.md` pinned to `edc3d07d…ce091a5d2c` HALTs at `/pharn-dev-build` and needs a re-plan. Apply between queue
items.**

## `pharn/ARCHITECTURE.md` §6 — the spine is now wired, not only proposed

Item 03's `.dev/features/pharn-test-stage/PROTECTED-FOLLOWUPS.md` proposed adding `test` to the §6 spine and table,
and item 04's refined the table row. Since 6.19.0 the stage is IN both orchestrated chains, and `/pharn-build` refuses
without its evidence, so the §6 spine string `spec → plan → grill → build → regress → verify → ship` is now **stale**,
not merely incomplete: every product command, README and CLAUDE.md say `spec → plan → grill → test → build → regress
→ verify → ship`, and the commands number the stages that way (build fifth, regress sixth, verify seventh, ship the
eighth, terminal stage). Apply item 03's spine edit with item 04's row:

```text
| test    | `AC-TESTS.lock.json` | the AC tests' digests and the red-run evidence (each AC's test failed before the build), or a bootstrap record for a `spec_kind: test-infra` SPEC (6.18.0); `/pharn-build` refuses without it (6.19.0) |
```

`LIMITS.md` §8 ("ten" → "eleven" product stages) is still pending from item 03 and is unaffected here.
