# PLAN — pr416-coverage

- spec_content_hash: ab4dbd928b96b51bdb54ee12b91e87a95d1ba144013a26b8f20ffa9b4122c7fd
- applied_lessons: [L62]
- increment: tests only, so the pharn-ci diff coverage gate on PR #416 (`batch/audit-2026-11-03` @ 8343100d, 99.39% of
  a 100% threshold, 18 lines uncovered) covers every listed line a test can reach. No product code, no gate config.
- layer(s): build apparatus only (`*.test.*` files never ship; no `SKILLS_VERSION` bump).
- constitution_refs: [P0, P1, P6, P7]
- mode: LIGHT: no `/pharn-dev-ship` chain; gates are `npm run test:coverage` (lcov hit counts per listed line) and
  `npm run check`, recorded in `NOTES.md`.

## Why (P7)

The real failure is the pharn-ci check on PR #416: 18 changed lines with no hit in CI's lcov.

## Lessons

- L62: `repeatedTopLevelKeys` in `pharn/floor/check-loop.mjs` carries a `catch` (lines 266-267) whose only purpose is
  L62's "a function that cannot throw": its decode runs on a key token of a text `JSON.parse` already accepted, which
  cannot throw. That line is reported as unreachable through the public interface, never reached by exporting the
  helper or feeding it invalid input through a hook.

## Files

- `.dev/features/pr416-coverage/PLAN.md` — this plan
- `.dev/features/pr416-coverage/NOTES.md` — line → test, lcov proof, gate output
- `.dev/floor/check-variance.test.mjs` — line 71 (the usage refusal)
- `.dev/floor/gen-lessons-index.test.mjs` — line 44 (the CLI's success path)
- `.dev/floor/check-ship-record.test.mjs` — lines 151, 331-332, 338-339
- `.claude/hooks/protect-trusted-paths.test.cjs` — line 940 (the run-state rule found only by PASS 2)
- `pharn/floor/reconcile-baseline.test.mjs` — lines 174-176 (an unlistable state directory under an unreadable record)
- `pharn/floor/render-review.test.mjs` — lines 414-415, 461-463
- `pharn/floor/check-loop.test.mjs` — lines 266-267, only if a public-interface route exists (none is expected; L62)
