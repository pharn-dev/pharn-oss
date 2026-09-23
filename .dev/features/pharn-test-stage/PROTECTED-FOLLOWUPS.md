# PROTECTED-FOLLOWUPS — pharn-test-stage

Edits this increment needs in files the agent may not write (fix #2, `.claude/hooks/protect-trusted-paths.cjs`). A
human applies them outside the agent loop. Nothing is false without them except the `LIMITS.md` count; the rest is
incomplete. **Editing `pharn/ARCHITECTURE.md` changes its content hash, so every open dev `PLAN.md` pinned to
`edc3d07d…ce091a5d2c` will HALT at `/pharn-dev-build` and need a re-plan. Apply these between queue items.**

## `pharn/ARCHITECTURE.md` §6 — the pipeline spine (`:226-241`)

```diff
-`spec → plan → grill → build → regress → verify → ship`. Each stage emits a **typed artifact**
+`spec → plan → grill → test → build → regress → verify → ship`. Each stage emits a **typed artifact**
 linking back to the spec:
@@
 | grill   | grill-log            | findings vs plan                             |
+| test    | `AC-TESTS.lock.json` | the AC tests' digests, bound to `AC-TESTS.md` and the spec pin (6.17.0) |
 | build   | `BUILD.md`           | per-phase results                            |
```

Suggested sentence under the table: "`test` writes each Acceptance Criterion's test before `build`, into files the
build's writes-scope excludes; its mapping, `AC-TESTS.md`, is written by `plan` (`pharn-contracts/ac-tests.md`)."
In 6.17.0 the stage is standalone, so an alternative is to wait for the item that wires it into `/pharn-ship` and
`/pharn-loop` and apply both at once.

## `pharn/ARCHITECTURE.md` §4 — the `pharn-contracts` list (`:131-135`)

Add `ac-tests` after `gate-run-record` (and `test-results-record`, if the item-01 follow-up has been applied).

## `LIMITS.md` §8 (`:313-314`) — the product-stage count

```diff
-`pharn.config.json`'s `models.stages` block declares a `model` and an `effort` for each of the ten
-product stages, and `pharn/floor/check-model-config.mjs` holds that block in EQUALITY with the ten
+`pharn.config.json`'s `models.stages` block declares a `model` and an `effort` for each of the eleven
+product stages, and `pharn/floor/check-model-config.mjs` holds that block in EQUALITY with the eleven
```

This one is now **false** ("ten"), not just incomplete.
