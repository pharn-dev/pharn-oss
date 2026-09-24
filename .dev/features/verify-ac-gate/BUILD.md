# BUILD — verify-ac-gate

- plan: `.dev/features/verify-ac-gate/PLAN.md` (as amended after grill)
- chain: `spec_content_hash` edc3d07d…ce091a5d2c — GREEN (`pharn/ARCHITECTURE.md` unchanged)
- scope: `set-writes-scope.cjs --from-plan`, re-run after each plan amendment, and `reconcile-baseline.mjs --anchor`
  once, then `--amend-scope` twice — each immediately after the setter.
- floor: `node pharn/floor/validate.mjs .` GREEN; `npm test` GREEN (count read live in `VERIFY.md`).

## What was built, by part

1. **The test-infrastructure pin** — `pharn/floor/test-infra-core.mjs` (new). It computes `{levels, gates, configs}`
   (the level gates' script values with their `pre`/`post` scripts and `testResults` formats, plus the root runner
   configs in a closed name set), shape-checks a recorded pin, and diffs one against the live tree by gate id or path.
   `sha256RegularFile` moved here from the lock script, which re-exports it (the lock imports this module, so the
   other direction would be a cycle).
2. **The lock, schema `/3`** — `ac-tests-lock.mjs`:
   - `--write` takes the pin (`buildLock(name, base, root)`);
   - `--write-bootstrap` writes `/3` with `test_infra: null`;
   - `--record-red-run` refuses anything but a `/3` test-first lock;
   - `lockShapeError` requires the pin on `/3` test-first only;
   - the mode comes from `modeOf`, never from the schema (grill G3);
   - the check is split into pure parts (`testFirstReds`, `redRunReds`, `pinReds`, `bootstrapReds`) with an explicit
     `root`;
   - `checkLock` is their union plus the bootstrap approval spawn.
3. **One matcher, one SPEC reading** — `red-run-core.mjs` exports `observeAc` (the red run's verdict now calls it), and
   `specVerdict` moved into `spec-template-core.mjs`; `check-ac-tests.mjs --spec` prints it.
4. **The AC gate** — `pharn/floor/ac-gate-core.mjs` (new), `evaluateAcGate({feature, stamp, outDir, root})`:
   - test-first, bootstrap and legacy readings;
   - a closed three-way reason partition;
   - the per-AC block the report carries.
5. **The verdict** — `check-verify.mjs --ac-gate`: the block, `ac-delivery` / `ac-evidence` in `failing_gates`, and an
   INCONCLUSIVE for an unmeasurable gate over green gates. The flag-less and `--stamp` outputs are unchanged.
   `gate-run-core.mjs` reserves both ids and adds `ac-evidence-invalid` to `REASON_CODES`.
6. **The loop** — changes in two checkers:
   - `check-loop.mjs`: `ac-evidence` is terminal, and every emission carries `terminal_cause`;
   - `check-loop-fresh.mjs` check E re-derives with `--ac-gate`, compares `ac_gate`, and defers to F when the tree
     moved (`STAMP_ONLY_FIELDS`);
   - check J re-hashes the per-test results files;
   - check I's test-stage failure is `ac-evidence-invalid`.
7. **The report** — `render-run-report.mjs` renders the per-AC table as a fenced DATA block inside `## Verdicts`.
8. **Prose** — four commands, four contracts, README, CLAUDE.md, CHANGELOG `[6.20.0]`, `SKILLS_VERSION`:
   - `pharn-verify.md` 0.4.0: the pinned `--ac-gate`, the rewritten trust claims, and the fenced `VERIFY.md` block;
   - `pharn-loop.md` 0.10.0: S13, the Step 5 mappings, and the AC rows handed to the rebuild;
   - `pharn-ship.md` 0.8.0 and `pharn-test.md` 0.4.0;
   - contracts: `verify-report.md`, `ac-tests.md`, `loop-record.md`, `gate-run-record.md`.

## Notes from the build

- **A fixture path bug, found and fixed.** The freshness fixtures' vitest reports named the test file under
  `mkdtemp`'s `/var/…`, while the checker's root is the realpath `/private/var/…`, so no entry matched and AC-1 read
  `ac-untested`. A real reporter prints the path its own process saw, so the fixtures now use the realpath.
- **The freshness fixture's hand list of floor modules went stale a second time.** The new lock import crashed a
  shelled child, which the caller read as an ordinary `lock-red`. That list is now COMPUTED: the closure, from
  `check-loop-fresh.mjs`, of every sibling module named in a string literal.
- **A scripted edit wrote `root` twice into one `checkLock` call and missed another.** The lock tests caught it on the
  next run.
