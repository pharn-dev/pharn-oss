# PLAN — node-runtime-floor

- feature: node-runtime-floor
- applied_lessons: [L22]

Fixes audit finding P1-A (2026-10-07). Every floor CLI gated on `if (import.meta.main)` exits 0 having checked nothing on a
Node without `import.meta.main` (reproduced on 20.13.1 and 22.16.0: a real regression read as a silent exit 0). The
installer admits Node 20, and nothing refuses an old runtime. This increment adds `pharn/floor/runtime-floor.mjs`, a
side-effect module that refuses to run (a stderr message, exit 2) when `import.meta.main` is not a boolean or Node is
older than 24.2.0, and makes it the first import of every gated CLI under both floors. Three CLIs deliberately take no
static import, so that a module which cannot load maps to their own exit 2; they get the feature check inline above their
gate and load the module dynamically inside their existing `try`.

Run by the orchestrator on the light path under the maintainer's 2026-10-07 delegation (no grill, regress stage or
review). That choice is a model decision, not a human approval.

## Approach

L22: the guard is pinned as a literal import line and a literal refusal sentence that a test compares byte for byte, never
described in prose, because the entry guard itself reached ten files copied wrong when it was prescribed by example.

## Files

- `pharn/floor/runtime-floor.mjs` — **NEW.** `runtimeFloorRefusal(hasMain, nodeVersion)` and the refusing side effect.
- `pharn/floor/runtime-floor.test.mjs` — **NEW.** Pure-function tests over versions and the feature flag.
- `.dev/floor/entry-point-guard.test.mjs` — **EDIT.** Every gated CLI under both floors carries the guard first; every
  one refuses (exit 2, empty stdout, the pinned sentence on stderr) under a faked Node 22.16.0; an opt-in probe on a real
  old Node.
- `pharn/floor/ac-tests-lock.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/build-gate.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/catalogue-installed-skills.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-ac-tests.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-bash-reconcile.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-build-complete.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-cost-ledger.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-instruction-files.mjs` — **EDIT.** Inline feature check above its gate, and `await import("./runtime-floor.mjs")` inside its `try` (it takes no static import by design).
- `pharn/floor/check-lessons-index.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-loop-fresh.mjs` — **EDIT.** Inline feature check above its gate, and `await import("./runtime-floor.mjs")` inside its `try` (it takes no static import by design).
- `pharn/floor/check-quick-scope.mjs` — **EDIT.** Inline feature check above its gate, and `await import("./runtime-floor.mjs")` inside its `try` (it takes no static import by design).
- `pharn/floor/check-red-run.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-regress.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-review-assignments.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-ship-briefing.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/check-test-stage.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/entry-gates.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/feature-name.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/gen-lessons-index.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/grill-scan.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/loop-closeout.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/loop-fresh-core.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/mark-phase.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/merge-findings.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/pre-run-snapshot.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/reconcile-baseline.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/render-cost-ledger.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/render-cost-record.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/render-review-assignments.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/render-run-report.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/render-ship-briefing.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/run-gates.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/run-marker.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/ship-closeout.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/stage-agent.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/stage-direct.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/stage-regress.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/stage-verify.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/worktree-fingerprint.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/check-capability-catalog.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/check-changelog-entry.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/check-contributing-gates.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/check-lessons-index.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/check-skills-version-recorded.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/check-version-badge.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/gen-capability-catalog.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/gen-lessons-index.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `.dev/floor/hash-doc.mjs` — **EDIT.** Its first import becomes the runtime floor.
- `pharn/floor/stage-agent.test.mjs` — **EDIT.** The CLI import closure copied beside a stub gains `runtime-floor.mjs`.
- `pharn/floor/check-loop-fresh.test.mjs` — **EDIT.** The load-failure sweep: an empty older copy of `runtime-floor.mjs` loads and gives the ordinary verdict.
- `.dev/floor/check-changelog-entry.test.mjs` — **EDIT.** The CI-block fixture copies `pharn/floor/runtime-floor.mjs` beside the checker.
- `package.json` — **EDIT.** `engines.node` `>=24.2.0`.
- `README.md` — **EDIT.** Quick start: the floor now refuses an old Node; the version badge.
- `.dev/guides/floor-checks.md` — **EDIT.** A section for `runtime-floor.mjs`.
- `CHANGELOG.md` — **EDIT.** Opens `## [6.50.0]`.
- `SKILLS_VERSION` — **EDIT.** `6.49.2` → `6.50.0` (minor: a newly shipped floor module).
- `docs/capabilities/README.md` — **EDIT, by `npm run docs:generate`, only if it changes.**
- `.dev/features/node-runtime-floor/PLAN.md` — **NEW.** This file.
