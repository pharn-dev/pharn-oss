# PLAN — cli-stdout-sentinel

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L29, L36, L47, L57, L60]
- increment: Audit finding TST-5 (2026-10-12, Medium). Seven floor CLIs whose stdout a floor caller JSON-parses still
  end with an immediate `process.exit(...)` after printing — the pattern 6.20.4 removed from check-verify, check-regress,
  check-loop and check-red-run because on darwin a piped document past 64 KiB was cut at exit. Convert them to the
  repo's existing exit forms, add them to `cli-stdout-flush.test.mjs`'s FLUSH_CLIS (static pin, crash test, >64 KiB
  pipe round-trip), and correct that test's header, which claims every other floor CLI's spawner reads only an exit
  status or a first line. Exit codes and output bytes stay identical. Patch bump to 6.65.2 (planned
  as 6.65.1; #363 took that number first, so it was renumbered at the merge of `origin/main`).
- layer(s): product floor (`pharn/floor/`), build apparatus (`.dev/guides/`), repo meta
- constitution_refs: [P0, P5, P6, P7]
- mode: LIGHT (batch 2026-10-19, group H) — no stage commands; plan, edit with tests, `npm run check`, validate.

## The triggering failure (P7)

The 2026-10-12 audit's TST-5, re-read live at `69a3c5ad` (6.65.0):

| CLI                                                         | ending today                                            | floor callers that `JSON.parse` its stdout                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `run-gates.mjs`                                             | `emit`: `console.log(...)`, `process.exit(code)` (:199) | build-gate.mjs:181, stage-verify.mjs:356, stage-regress.mjs:743/:779/:962, stage-runtime.mjs:274, entry-gates.mjs:472/:594 |
| `count-verifiers.mjs`                                       | `process.stdout.write(...)`, `process.exit(0)` (:117)   | stage-verify.mjs:293                                                                                                       |
| `scan-plan-{i18n,migrations,observability,pii,secrets}.mjs` | `process.stdout.write(...)`, `process.exit(0)`          | grill-scan.mjs:167                                                                                                         |

All callers fail closed on an unparseable document, so a cut document is a false refusal, never a false pass.
`run-gates.mjs`'s `emit` also releases the lock before exiting, and its header comment says a `finally` could not be
used because `process.exit()` skips it.

## Fix

- **`run-gates.mjs`** — the async sentinel form `stage-regress.mjs` already uses: `emit` releases the held lock (as
  today, before the print), prints, sets `process.exitCode = code` and throws a module-private `EMITTED`; the
  top-level `main(...).catch` returns on `EMITTED` and otherwise prints the same `run-gates: <stack>` line and sets
  exit code 2 (today's crash code, unchanged). The interrupted-gate branch's `process.exit(signalExit(...))` becomes
  `process.exitCode = ...; throw EMITTED;` (nothing is printed there; the lock is already released by
  `onInterrupted`). **No `finally` release is added for a crash**, on purpose: a crash leaves the lock (and any
  `lock.child` sidecar) for the next call's stale-lock recovery, which reaps an orphan gate group before re-running —
  releasing the lock in a `finally` would let the next call claim it fresh and skip the reap. Audited: no `fail`/`emit`
  call sits inside a `try` body whose `catch` would swallow the sentinel, and no emission happens in an event callback
  outside the `main` promise chain; `spawnGate` clears its timers and listeners before resolving, so nothing keeps the
  process alive after an emission.
- **`count-verifiers.mjs`, `scan-plan-*.mjs`** (top-level scripts) — the guard, read and print move into a `main()`
  returning the exit code, `fail()` writes its stderr line and returns 1, and the file ends
  `process.exitCode = main();`. For count-verifiers the edit stays clear of the frontmatter reader group B is changing
  (`frontmatterRole` and the imports are untouched).
- **`cli-stdout-flush.test.mjs`** — FLUSH_CLIS gains the seven rows with per-row `print` (console vs stdout.write),
  crash status (run-gates crashes with 2, its documented runner-error code) and arguments that reach a print; the
  static pin gains a form for each new ending; one >64 KiB round-trip per new CLI (run-gates `init` with many gates,
  count-verifiers over many verifier files, each scan-plan scanner over a plan with many hit lines). The header names
  the set with its callers and the parsed-stdout CLIs still outside it, in an open form (L47).
- **`run-gates.test.mjs`** — a test that the lock is gone after a refusal emitted while it is held (exit 2), next to
  the existing normal-call test, with the old-pattern negative control run once by hand (L60).
- **`.dev/guides/floor-gates.md`** — the FLUSH RULE paragraph names the widened set.

## Not in the set, named (the header says so)

Found by the same caller sweep and left out of this increment's scope: `count-grillers.mjs` (griller-extract.mjs),
`count-lenses.mjs` (render-/check-review-assignments.mjs) and `check-model-config.mjs` (stage-agent.mjs) are also
JSON-parsed by floor callers and still end with `process.exit`. Their documents are a griller list, a lens list and a
two-field object. Reported to the orchestrator as a follow-up; not converted here (assignment boundary).

## Files

- `.dev/features/cli-stdout-sentinel/PLAN.md`
- `pharn/floor/run-gates.mjs`
- `pharn/floor/run-gates.test.mjs`
- `pharn/floor/count-verifiers.mjs`
- `pharn/floor/scan-plan-i18n.mjs`
- `pharn/floor/scan-plan-migrations.mjs`
- `pharn/floor/scan-plan-observability.mjs`
- `pharn/floor/scan-plan-pii.mjs`
- `pharn/floor/scan-plan-secrets.mjs`
- `pharn/floor/cli-stdout-flush.test.mjs`
- `.dev/guides/floor-gates.md`
- `SKILLS_VERSION`
- `README.md` — the version badge only (`check:badge`)
- `CHANGELOG.md`

## Lessons applied

- L29: the set is materialized once (FLUSH_CLIS) and every rule — static pin, crash test, round-trip — iterates it; the
  seven new CLIs are rows, not one-off tests.
- L36: the header keeps saying the set is a PRESENCE set; a future caller that starts parsing another CLI is not
  detected here.
- L47: the header's false "every other floor CLI" is retracted to an open form that names the known parsed CLIs
  outside the set, never a new closed count.
- L57: formatters run on explicit paths only (`prettier --check`/`--write <paths>`), never over the repo.
- L60: each new assertion gets its own negative control run once — a CLI put back to `process.exit` reds the static
  pin; the lock test reds with the release removed from `emit`.

## Verification

`node --test pharn/floor/cli-stdout-flush.test.mjs pharn/floor/run-gates.test.mjs` plus each touched CLI's own test
file, then `npm run check` and `node pharn/floor/validate.mjs .`.
