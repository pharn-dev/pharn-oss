# PLAN — low-findings-batch-1

- spec_content_hash: (read live at build)
- applied_lessons: [L31]
- increment: LOW security/correctness batch — hook stdin fail-closed (L7), `.pharn` symlink scope blind spot (L5), run-marker project root + marker refresh (L6), scoped path case-fold matching (L9).
- layer(s): floor (`.claude/hooks/`, `pharn/floor/run-marker.mjs`)
- constitution_refs: [P0, P2, P7]

## Files

- `.claude/hooks/protect-trusted-paths.cjs` — EDIT
- `.claude/hooks/enforce-writes-scope.cjs` — EDIT
- `.claude/hooks/protect-trusted-paths.test.cjs` — EDIT
- `.claude/hooks/enforce-writes-scope.test.cjs` — EDIT
- `pharn/floor/run-marker.mjs` — EDIT
